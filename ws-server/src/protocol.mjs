/**
 * 虾哥 xiaozhi-esp32 WebSocket 协议实现。
 *
 * 源码依据（~/projects/xiaozhi-esp32）：
 * - main/protocols/protocol.h            BinaryProtocol2 / BinaryProtocol3 结构体
 * - main/protocols/websocket_protocol.cc:24  SendAudio（上行封装）
 * - main/protocols/websocket_protocol.cc:108 OnData（下行解析）
 * - main/protocols/websocket_protocol.cc:236 ParseServerHello（服务端 hello 格式要求）
 * - main/protocols/protocol.cc:82/96     SendStartListening / SendStopListening（listen 消息）
 */

/** 二进制帧里的消息类型 */
export const FRAME_TYPE = {
  OPUS: 0,
  JSON: 1,
};

/** 虾哥 websocket_protocol.h 里 version_ 的默认值是 1 */
export const PROTOCOL_V1 = 1;
export const PROTOCOL_V2 = 2;
export const PROTOCOL_V3 = 3;

/**
 * 解析上行二进制帧。
 *
 * v2 头部 16 字节：version(2) type(2) reserved(4) timestamp(4) payload_size(4)
 * v3 头部  4 字节：type(1) reserved(1) payload_size(2)
 * v1 没有头部，整帧就是 Opus 包（websocket_protocol.cc:52 与 :138 的 else 分支）
 *
 * @returns {{type: number, payload: Buffer, timestamp: number} | null}
 */
export function parseBinaryFrame(buf, version) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) return null;

  if (version === PROTOCOL_V2) {
    if (buf.length < 16) return null;
    const type = buf.readUInt16BE(2);
    const timestamp = buf.readUInt32BE(8);
    const payloadSize = buf.readUInt32BE(12);
    const end = Math.min(16 + payloadSize, buf.length);
    return { type, payload: buf.subarray(16, end), timestamp };
  }

  if (version === PROTOCOL_V3) {
    if (buf.length < 4) return null;
    const type = buf.readUInt8(0);
    const payloadSize = buf.readUInt16BE(2);
    const end = Math.min(4 + payloadSize, buf.length);
    return { type, payload: buf.subarray(4, end), timestamp: 0 };
  }

  // v1：裸 Opus 包
  return { type: FRAME_TYPE.OPUS, payload: buf, timestamp: 0 };
}

/**
 * 封装下行二进制帧（服务端 → 固件）。
 *
 * 字段序与网络字节序严格对齐 main/protocols/protocol.h 的两个结构体：
 * v2 的 version/type/timestamp/payload_size 全部走网络序（大端）。
 */
export function encodeBinaryFrame({ type = FRAME_TYPE.OPUS, payload, timestamp = 0 }, version) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload ?? []);

  if (version === PROTOCOL_V2) {
    const frame = Buffer.alloc(16 + body.length);
    frame.writeUInt16BE(PROTOCOL_V2, 0); // version
    frame.writeUInt16BE(type, 2); // type
    frame.writeUInt32BE(0, 4); // reserved
    frame.writeUInt32BE(timestamp >>> 0, 8); // timestamp
    frame.writeUInt32BE(body.length, 12); // payload_size
    body.copy(frame, 16);
    return frame;
  }

  if (version === PROTOCOL_V3) {
    const frame = Buffer.alloc(4 + body.length);
    frame.writeUInt8(type, 0);
    frame.writeUInt8(0, 1);
    frame.writeUInt16BE(body.length, 2);
    body.copy(frame, 4);
    return frame;
  }

  // v1：裸 Opus 包
  return body;
}

/**
 * 服务端 hello。
 *
 * 固件 websocket_protocol.cc:236 ParseServerHello 的硬性要求：
 * - transport 必须是字符串且等于 "websocket"，否则直接 return，
 *   WEBSOCKET_PROTOCOL_SERVER_HELLO_EVENT 永不置位，固件 10 秒后超时失败。
 * - audio_params.sample_rate / frame_duration 决定固件 Opus 解码器的参数。
 */
export function buildServerHello({ sessionId, sampleRate, frameDurationMs }) {
  return {
    type: 'hello',
    transport: 'websocket',
    session_id: sessionId,
    audio_params: {
      format: 'opus',
      sample_rate: sampleRate,
      channels: 1,
      frame_duration: frameDurationMs,
    },
  };
}

/** stt：把识别到的原文回给固件，固件会显示到屏幕上（application.cc 的 stt 分支） */
export function buildStt(text) {
  return { type: 'stt', text };
}

/** tts start / stop：固件靠这两个切 Speaking / Listening 状态 */
export function buildTtsState(state) {
  return { type: 'tts', state };
}

/**
 * tts sentence_start：把要念的文本给固件。
 * 固件 application.cc 的 sentence_start 分支会把 text 显示到屏幕。
 */
export function buildTtsSentenceStart(text) {
  return { type: 'tts', state: 'sentence_start', text };
}

/**
 * 从握手请求头里取出设备令牌。
 *
 * 虾哥 websocket_protocol.cc:97-103：如果 token 里没有空格就自动补 "Bearer " 前缀，
 * 所以正常一定带前缀；这里对没有前缀的情况也兼容。
 */
export function extractDeviceToken(authorizationHeader) {
  if (!authorizationHeader) return '';
  const value = String(authorizationHeader).trim();
  if (!value) return '';
  if (/^bearer\s+/i.test(value)) return value.replace(/^bearer\s+/i, '').trim();
  return value;
}
