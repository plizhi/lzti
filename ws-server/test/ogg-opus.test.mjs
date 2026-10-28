import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { buildOggOpus, extractOpusFrames, extractPackets } from '../src/ogg-opus.mjs';

/** 解析出每个 Ogg 页面包含的 packet 数，用来验证 OpusHead 单独占 BOS 页 */
function pagePackets(buf) {
  const pages = [];
  let offset = 0;
  while (offset + 27 <= buf.length) {
    assert.equal(buf.readUInt32BE(offset), 0x4f676753, 'Ogg 捕获码');
    const segmentCount = buf.readUInt8(offset + 26);
    const tableStart = offset + 27;
    let dataOffset = tableStart + segmentCount;
    let packets = 0;
    for (let i = 0; i < segmentCount; i += 1) {
      const lacing = buf.readUInt8(tableStart + i);
      dataOffset += lacing;
      if (lacing < 255) packets += 1;
    }
    pages.push({
      headerType: buf.readUInt8(offset + 5),
      packets,
      granule: buf.readBigUInt64LE(offset + 6),
    });
    offset = dataOffset;
  }
  return pages;
}

test('裸 Opus 包重新封成 Ogg 后还能拆回同样的包', () => {
  const frames = [
    Buffer.from([1, 2, 3, 4, 5]),
    Buffer.from([6, 7, 8]),
    Buffer.alloc(300, 0xab), // 超过 255 字节，会拆成多段
  ];
  const ogg = buildOggOpus(frames, { sampleRate: 16000, preSkip: 312 });
  const roundTrip = extractOpusFrames(ogg);

  assert.equal(roundTrip.length, frames.length);
  for (let i = 0; i < frames.length; i += 1) {
    assert.deepEqual(roundTrip[i], frames[i], `第 ${i} 帧不一致`);
  }
});

test('OpusHead 必须单独占据 BOS 页', () => {
  // 回归测试：OpusHead 和 OpusTags 同页时 ffmpeg 会报 "Header processing failed"，
  // MiniMax ASR 也会拒收。
  const ogg = buildOggOpus([Buffer.from([1, 2, 3])], { sampleRate: 16000 });
  const pages = pagePackets(ogg);

  assert.ok(pages.length >= 3, '至少要有 BOS 页 + Tags 页 + 音频页');
  assert.equal(pages[0].headerType & 0x02, 0x02, '第一页是 BOS');
  assert.equal(pages[0].packets, 1, 'BOS 页只放 OpusHead');
  assert.equal(pages[1].packets, 1, '第二页单独放 OpusTags');
});

test('拆包时按 lacing 值判断包边界（255 表示续包）', () => {
  // 手工拼一个页面：一个 300 字节的包 = 255 + 45 两段
  const payload = Buffer.alloc(300, 0x01);
  const page = Buffer.alloc(27 + 2 + 300);
  page.write('OggS', 0, 'latin1');
  page.writeUInt8(0, 4);
  page.writeUInt8(0, 5);
  page.writeBigUInt64LE(0n, 6);
  page.writeUInt32LE(1, 14);
  page.writeUInt32LE(0, 18);
  page.writeUInt32LE(0, 22);
  page.writeUInt8(2, 26);
  page.writeUInt8(255, 27);
  page.writeUInt8(45, 28);
  payload.copy(page, 29);

  const packets = extractPackets(page);
  assert.equal(packets.length, 1);
  assert.equal(packets[0].length, 300);
});

test('ffmpeg 能解我们生成的 Ogg（集成测试，依赖 ffmpeg）', () => {
  const frames = [Buffer.alloc(200, 0x01), Buffer.alloc(200, 0x02)];
  const ogg = buildOggOpus(frames, { sampleRate: 16000 });

  let decoded;
  try {
    decoded = execFileSync(
      '/usr/bin/ffmpeg',
      ['-hide_banner', '-loglevel', 'error', '-f', 'ogg', '-i', 'pipe:0', '-f', 's16le', '-ar', '16000', '-ac', '1', 'pipe:1'],
      { input: ogg, maxBuffer: 32 * 1024 * 1024 }
    );
  } catch (err) {
    throw new Error(`ffmpeg 解码失败：${err.stderr?.toString() || err.message}`);
  }
  assert.ok(decoded.length > 0, '解码出 PCM');
});
