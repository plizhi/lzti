/**
 * 裸 Opus 帧流 → Ogg/Opus 容器。
 *
 * 为什么需要：
 *   MiniMax 的 speech_to_text 只接受【带 Ogg 容器的 Opus】（里面 OpusHead 说明了
 *   原始采样率与声道映射）。设备端发过来的是裸 Opus 帧流（没有 OggS 头），
 *   直接转上去会被拒：400 "invalid params, Invalid data found when processing input (2013)"。
 *   实测：同一段音频，包成 Ogg 后 MiniMax 立刻 200。
 *
 * 格式参考 RFC 7845（Ogg Encapsulation of Opus）：
 *   - OpusHead（19 字节）：标识头
 *   - OpusTags：注释头
 *   - 之后每个 Opus 包一页 Ogg
 */

const CRC_TABLE = (() => {
  // Ogg 用的 CRC32：多项式 0x04c11db7，不反转、不异或
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let j = 0; j < 8; j++) {
      r = r & 0x80000000 ? ((r << 1) ^ 0x04c11db7) >>> 0 : (r << 1) >>> 0;
    }
    table[i] = r >>> 0;
  }
  return table;
})();

function oggCrc32(data: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    crc = ((crc << 8) ^ CRC_TABLE[((crc >>> 24) & 0xff) ^ data[i]]) >>> 0;
  }
  return crc >>> 0;
}

/** Opus TOC → 单帧时长（毫秒），RFC 6716 §3.2.1 */
const CONFIG_DURATION_MS: Record<number, number[]> = {
  0: [10, 20, 40, 60], 1: [10, 20, 40, 60], 2: [10, 20, 40, 60], 3: [10, 20, 40, 60],
  4: [10, 20, 40, 60], 5: [10, 20, 40, 60], 6: [10, 20, 40, 60], 7: [10, 20, 40, 60],
  8: [10, 20, 40, 60], 9: [10, 20, 40, 60], 10: [10, 20, 40, 60], 11: [10, 20, 40, 60],
  12: [10, 20], 13: [10, 20], 14: [10, 20], 15: [10, 20],
  16: [2.5, 5, 10, 20], 17: [2.5, 5, 10, 20], 18: [2.5, 5, 10, 20], 19: [2.5, 5, 10, 20],
  20: [2.5, 5, 10, 20], 21: [2.5, 5, 10, 20], 22: [2.5, 5, 10, 20], 23: [2.5, 5, 10, 20],
  24: [2.5, 5, 10, 20], 25: [2.5, 5, 10, 20], 26: [2.5, 5, 10, 20], 27: [2.5, 5, 10, 20],
  28: [2.5, 5], 29: [2.5, 5], 30: [2.5, 5], 31: [2.5, 5],
};

interface OpusPacket {
  data: Buffer;
  durationMs: number;
}

/** 把裸 Opus 帧流切成一个个包（RFC 6716 的 TOC/code 规则） */
export function parseOpusPackets(raw: Buffer): OpusPacket[] {
  const packets: OpusPacket[] = [];
  let off = 0;
  while (off < raw.length) {
    const toc = raw[off];
    const config = (toc >> 3) & 0x1f;
    const code = toc & 0x03;
    let headerLen = 2;
    let lens: number[] = [];
    if (code === 0) {
      lens = [raw[off + 1] + 1];
    } else if (code === 1) {
      const len = raw[off + 1] + 1;
      lens = [len, len];
    } else {
      lens = [raw[off + 1] + 1, raw[off + 2] + 1];
      headerLen = 3;
    }
    const total = headerLen + lens.reduce((a, b) => a + b, 0);
    if (off + total > raw.length) {
      // 尾部是不完整的包（录音被截断），丢掉
      break;
    }
    const durations = CONFIG_DURATION_MS[config] ?? [20];
    let durationMs = 0;
    for (let i = 0; i < lens.length; i++) {
      durationMs += durations[Math.min(i, durations.length - 1)];
    }
    packets.push({ data: raw.subarray(off, off + total), durationMs });
    off += total;
  }
  return packets;
}

function makePage(serial: number, seq: number, granule: number, body: Buffer, flags: number): Buffer {
  const segments: number[] = [];
  let len = body.length;
  while (len >= 255) {
    segments.push(255);
    len -= 255;
  }
  segments.push(len);

  const header = Buffer.alloc(27 + segments.length);
  header.write('OggS', 0, 'ascii');
  header.writeUInt8(0, 4); // version
  header.writeUInt8(flags, 5); // header type
  header.writeBigInt64LE(BigInt(granule), 6); // granule position
  header.writeUInt32LE(serial, 14);
  header.writeUInt32LE(seq, 18);
  header.writeUInt32LE(0, 22); // CRC 占位
  header.writeUInt8(segments.length, 26);
  for (let i = 0; i < segments.length; i++) {
    header.writeUInt8(segments[i], 27 + i);
  }

  const page = Buffer.concat([header, body]);
  page.writeUInt32LE(oggCrc32(page), 22);
  return page;
}

/**
 * 把【已经分好帧的】Opus 包打成 Ogg/Opus 容器。
 *
 * 为什么不自己解析裸 Opus 流：
 *   Opus 的分帧规则（TOC 的 code 位）很容易理解错，自己解析会得到错位的包，
 *   MiniMax 就会解出垃圾音频（实测：识别结果为空）。
 *   设备端本来就知道每个包的边界（一次 SendAudio = 一个 Opus 包），
 *   让它把包分开传过来，这里直接组装，最可靠。
 */
export function packetsToOgg(packets: Buffer[], sampleRate = 16000, channels = 1): Buffer {
  const serial = 0x4c5a5449;
  const pages: Buffer[] = [];

  // OpusHead（19 字节）
  const head = Buffer.alloc(19);
  head.write('OpusHead', 0, 'ascii');
  head.writeUInt8(1, 8); // version
  head.writeUInt8(channels, 9);
  head.writeUInt16LE(312, 10); // pre-skip（48kHz 采样数）
  head.writeUInt32LE(sampleRate, 12); // 原始采样率
  head.writeUInt16LE(0, 16); // output gain
  head.writeUInt8(0, 18); // channel mapping family
  pages.push(makePage(serial, 0, 0, head, 0x02)); // BOS

  // OpusTags
  const vendor = Buffer.from('lzti', 'utf-8');
  const tags = Buffer.alloc(8 + 4 + vendor.length + 4);
  tags.write('OpusTags', 0, 'ascii');
  tags.writeUInt32LE(vendor.length, 8);
  vendor.copy(tags, 12);
  tags.writeUInt32LE(0, 12 + vendor.length); // 用户注释数 = 0
  pages.push(makePage(serial, 1, 0, tags, 0x00));

  // 每个 Opus 包一页
  let seq = 2;
  let granule = 0;
  for (const p of packets) {
    // granule 以 48kHz 计；帧长从 TOC 读，读不准也只影响时长显示，不影响解码
    granule += Math.round((packetDurationMs(p) * 48000) / 1000);
    pages.push(makePage(serial, seq++, granule, p, 0x00));
  }
  pages.push(makePage(serial, seq, granule, Buffer.alloc(0), 0x04)); // EOS

  return Buffer.concat(pages);
}

/** 从 TOC 估算一个包的时长（毫秒）；只用于 granule，错了也不影响解码 */
function packetDurationMs(packet: Buffer): number {
  if (packet.length < 1) return 0;
  const toc = packet[0];
  const config = (toc >> 3) & 0x1f;
  const code = toc & 0x03;
  const frames = code === 0 ? 1 : 2;
  const dur = CONFIG_DURATION_MS[config]?.[0] ?? 20;
  return dur * frames;
}

/**
 * 裸 Opus → Ogg/Opus。
 *
 * @param raw 设备上传的裸 Opus 帧流
 * @param sampleRate 原始采样率（设备端是 16000）
 * @param channels 声道数（设备端是 1）
 */
export function opusToOgg(raw: Buffer, sampleRate = 16000, channels = 1): Buffer {
  const packets = parseOpusPackets(raw);
  return packetsToOgg(packets.map((p) => p.data), sampleRate, channels);
}
