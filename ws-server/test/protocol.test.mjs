import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildServerHello,
  buildStt,
  buildTtsState,
  encodeBinaryFrame,
  extractDeviceToken,
  FRAME_TYPE,
  parseBinaryFrame,
} from '../src/protocol.mjs';

test('v2 二进制帧往返：头部字段按网络字节序', () => {
  const payload = Buffer.from([1, 2, 3, 4, 5]);
  const frame = encodeBinaryFrame({ type: FRAME_TYPE.OPUS, payload, timestamp: 0x01020304 }, 2);

  assert.equal(frame.length, 16 + payload.length);
  assert.equal(frame.readUInt16BE(0), 2, 'version');
  assert.equal(frame.readUInt16BE(2), FRAME_TYPE.OPUS, 'type');
  assert.equal(frame.readUInt32BE(4), 0, 'reserved');
  assert.equal(frame.readUInt32BE(8), 0x01020304, 'timestamp');
  assert.equal(frame.readUInt32BE(12), payload.length, 'payload_size');

  const parsed = parseBinaryFrame(frame, 2);
  assert.equal(parsed.type, FRAME_TYPE.OPUS);
  assert.equal(parsed.timestamp, 0x01020304);
  assert.deepEqual(parsed.payload, payload);
});

test('v3 二进制帧往返', () => {
  const payload = Buffer.from([9, 8, 7]);
  const frame = encodeBinaryFrame({ type: FRAME_TYPE.OPUS, payload }, 3);

  assert.equal(frame.length, 4 + payload.length);
  assert.equal(frame.readUInt8(0), FRAME_TYPE.OPUS);
  assert.equal(frame.readUInt8(1), 0);
  assert.equal(frame.readUInt16BE(2), payload.length);

  const parsed = parseBinaryFrame(frame, 3);
  assert.equal(parsed.type, FRAME_TYPE.OPUS);
  assert.deepEqual(parsed.payload, payload);
});

test('v1 是裸 Opus 包，没有头部', () => {
  const payload = Buffer.from([0xaa, 0xbb]);
  const frame = encodeBinaryFrame({ type: FRAME_TYPE.OPUS, payload }, 1);
  assert.deepEqual(frame, payload);

  const parsed = parseBinaryFrame(frame, 1);
  assert.equal(parsed.type, FRAME_TYPE.OPUS);
  assert.deepEqual(parsed.payload, payload);
});

test('截断的二进制帧返回 null 而不是抛错', () => {
  assert.equal(parseBinaryFrame(Buffer.alloc(10), 2), null);
  assert.equal(parseBinaryFrame(Buffer.alloc(2), 3), null);
  assert.equal(parseBinaryFrame(Buffer.alloc(0), 1), null);
});

test('服务端 hello 带 transport=websocket 和 audio_params', () => {
  const hello = buildServerHello({
    sessionId: 'abc',
    sampleRate: 24000,
    frameDurationMs: 60,
  });
  assert.equal(hello.type, 'hello');
  assert.equal(hello.transport, 'websocket');
  assert.equal(hello.audio_params.sample_rate, 24000);
  assert.equal(hello.audio_params.frame_duration, 60);
  assert.equal(hello.audio_params.format, 'opus');
});

test('tts / stt 消息结构', () => {
  assert.deepEqual(buildTtsState('start'), { type: 'tts', state: 'start' });
  assert.deepEqual(buildStt('选A'), { type: 'stt', text: '选A' });
});

test('设备令牌提取：兼容带/不带 Bearer 前缀', () => {
  assert.equal(extractDeviceToken('Bearer abc123'), 'abc123');
  assert.equal(extractDeviceToken('bearer abc123'), 'abc123');
  assert.equal(extractDeviceToken('abc123'), 'abc123');
  assert.equal(extractDeviceToken(''), '');
  assert.equal(extractDeviceToken(undefined), '');
});
