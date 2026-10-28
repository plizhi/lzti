/**
 * Ogg 容器 ⇄ 裸 Opus 包。
 *
 * ffmpeg 的 libopus 编码器只能封装成 Ogg Opus（`-f opus`），
 * 但虾哥固件的解码器（esp_opus_dec_decode）只吃裸 Opus 包，
 * 所以这里把 Ogg 拆包 / 重新封包。
 *
 * Ogg 页面结构（RFC 3533）：
 *   'OggS'(4) version(1) header_type(1) granule(8) serial(4) seq(4) crc(4)
 *   segment_count(1) segment_table(segment_count) data
 * 分包规则：lacing 值 255 表示包未结束，小于 255 表示包在此结束。
 */

/** Ogg 的 CRC32：多项式 0x04c11db7，非反射，初值 0，不做最终异或 */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let r = (i << 24) >>> 0;
    for (let j = 0; j < 8; j += 1) {
      r = r & 0x80000000 ? ((r << 1) ^ 0x04c11db7) >>> 0 : (r << 1) >>> 0;
    }
    table[i] = r >>> 0;
  }
  return table;
})();

function oggCrc(buf) {
  let crc = 0;
  for (let i = 0; i < buf.length; i += 1) {
    crc = (((crc << 8) >>> 0) ^ CRC_TABLE[((crc >>> 24) & 0xff) ^ buf[i]]) >>> 0;
  }
  return crc >>> 0;
}

const OGG_MAGIC = 0x4f676753; // 'OggS'

/**
 * 把 Ogg 数据拆成 packet 列表。
 *
 * @param {Buffer} ogg
 * @returns {Buffer[]} 每个 packet 一个 Buffer
 */
export function extractPackets(ogg) {
  const packets = [];
  let pending = [];
  let offset = 0;

  while (offset + 27 <= ogg.length) {
    if (ogg.readUInt32BE(offset) !== OGG_MAGIC) {
      throw new Error(`Ogg 捕获码不匹配，偏移 ${offset}`);
    }
    const segmentCount = ogg.readUInt8(offset + 26);
    const tableStart = offset + 27;
    const dataStart = tableStart + segmentCount;
    if (dataStart > ogg.length) {
      throw new Error('Ogg 段表越界');
    }

    let dataOffset = dataStart;
    for (let i = 0; i < segmentCount; i += 1) {
      const lacing = ogg.readUInt8(tableStart + i);
      const end = dataOffset + lacing;
      if (end > ogg.length) {
        throw new Error('Ogg 数据段越界');
      }
      pending.push(ogg.subarray(dataOffset, end));
      dataOffset = end;
      if (lacing < 255) {
        packets.push(Buffer.concat(pending));
        pending = [];
      }
    }
    offset = dataOffset;
  }

  if (pending.length > 0) {
    // 最后一个包没有结束 lacing（正常 Ogg 不会这样），按结束处理
    packets.push(Buffer.concat(pending));
  }

  return packets;
}

/**
 * 从 Ogg Opus 里取出音频包（跳过 OpusHead / OpusTags 两个头包）。
 *
 * @param {Buffer} ogg
 * @returns {Buffer[]}
 */
export function extractOpusFrames(ogg) {
  const packets = extractPackets(ogg);
  if (packets.length < 2) {
    throw new Error(`Ogg Opus 包数异常：${packets.length}`);
  }
  const head = packets[0];
  if (head.subarray(0, 8).toString('latin1') !== 'OpusHead') {
    throw new Error('Ogg 缺少 OpusHead');
  }
  if (packets[1].subarray(0, 8).toString('latin1') !== 'OpusTags') {
    throw new Error('Ogg 缺少 OpusTags');
  }
  return packets.slice(2);
}

/** 组包用的 lacing 表：长度 <255 一段，否则 255 若干段 + 剩余 */
function lacingFor(length) {
  const table = [];
  let remaining = length;
  while (remaining >= 255) {
    table.push(255);
    remaining -= 255;
  }
  table.push(remaining);
  return table;
}

/** 构造一个 Ogg 页面（可含多个 packet） */
function buildPage({ headerType, granulePosition, serial, sequence, packets }) {
  const lacing = [];
  for (const packet of packets) {
    lacing.push(...lacingFor(packet.length));
  }
  if (lacing.length > 255) {
    throw new Error('单个 Ogg 页面最多 255 个段');
  }

  const dataLength = packets.reduce((sum, p) => sum + p.length, 0);
  const page = Buffer.alloc(27 + lacing.length + dataLength);

  page.write('OggS', 0, 'latin1');
  page.writeUInt8(0, 4); // version
  page.writeUInt8(headerType, 5);
  page.writeBigUInt64LE(BigInt(granulePosition), 6);
  page.writeUInt32LE(serial, 14);
  page.writeUInt32LE(sequence, 18);
  page.writeUInt32LE(0, 22); // crc 占位
  page.writeUInt8(lacing.length, 26);
  for (let i = 0; i < lacing.length; i += 1) {
    page.writeUInt8(lacing[i], 27 + i);
  }

  let cursor = 27 + lacing.length;
  for (const packet of packets) {
    packet.copy(page, cursor);
    cursor += packet.length;
  }

  page.writeUInt32LE(oggCrc(page), 22);
  return page;
}

/**
 * 把裸 Opus 包重新封成 Ogg Opus。
 *
 * 用途：上行时如果 ASR 只认容器格式（而不是裸包流），
 * 可以用这个把设备发来的裸 Opus 包重新封装后再上传。
 *
 * @param {Buffer[]} frames 裸 Opus 包
 * @param {{sampleRate?: number, preSkip?: number}} options
 * @returns {Buffer} Ogg Opus 文件内容
 */
export function buildOggOpus(frames, { sampleRate = 48000, preSkip = 312, serial = 0x4c5a5449 } = {}) {
  const head = Buffer.alloc(19);
  head.write('OpusHead', 0, 'latin1');
  head.writeUInt8(1, 8); // version
  head.writeUInt8(1, 9); // channels
  head.writeUInt16LE(preSkip, 10);
  head.writeUInt32LE(sampleRate, 12);
  head.writeUInt16LE(0, 16); // output gain
  head.writeUInt8(0, 18); // mapping family

  const vendor = Buffer.from('lzti-ws-server', 'utf8');
  const tags = Buffer.alloc(8 + 4 + vendor.length + 4);
  tags.write('OpusTags', 0, 'latin1');
  tags.writeUInt32LE(vendor.length, 8);
  vendor.copy(tags, 12);
  tags.writeUInt32LE(0, 12 + vendor.length); // 用户注释条数

  const pages = [];
  pages.push(buildPage({
    headerType: 0x02, // BOS
    granulePosition: 0,
    serial,
    sequence: 0,
    packets: [head, tags],
  }));

  let sequence = 1;
  let samples = 0;
  const samplesPerFrame = 2880; // 60ms @ 48kHz

  frames.forEach((frame, index) => {
    samples += samplesPerFrame;
    const isLast = index === frames.length - 1;
    pages.push(buildPage({
      headerType: isLast ? 0x04 : 0x00, // EOS
      granulePosition: isLast ? Math.max(0, samples - preSkip) : samples,
      serial,
      sequence,
      packets: [frame],
    }));
    sequence += 1;
  });

  return Buffer.concat(pages);
}
