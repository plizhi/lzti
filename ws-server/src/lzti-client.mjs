/**
 * lzti 主应用 HTTP 客户端。
 *
 * ws-server 不重复实现测评逻辑，一律复用主应用已有的 device API：
 * - GET  /api/device/ping          校验设备令牌，拿 userId
 * - POST /api/device/voice/answer  语音答题主流程（识别 → 归一化 → 落进度 → 出下一题）
 * - POST /api/device/voice/next    只取下一题
 *
 * 这样做的好处：主应用的出题/计分/进度逻辑只有一份，
 * HTTP 路由和 WebSocket 端点行为完全一致。
 */

import { config } from './config.mjs';

export class LztiApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'LztiApiError';
    this.status = status;
  }
}

/** 主应用统一响应体：{ success: true, data } 或 { success: false, error } */
async function request(path, { method = 'GET', token, body, contentType, query } = {}) {
  const url = new URL(config.lztiBaseUrl + path);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const headers = { Authorization: `Bearer ${token}` };
  if (contentType) headers['Content-Type'] = contentType;

  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (err) {
    throw new LztiApiError(`调用主应用失败：${err.message}`, 0);
  }

  let payload;
  try {
    payload = await res.json();
  } catch {
    throw new LztiApiError(`主应用返回了非 JSON 响应（HTTP ${res.status}）`, res.status);
  }

  if (!res.ok || payload?.success === false) {
    const message = payload?.error || `主应用返回 HTTP ${res.status}`;
    throw new LztiApiError(message, res.status);
  }

  return payload.data;
}

export class LztiClient {
  constructor(baseUrl = config.lztiBaseUrl) {
    this.baseUrl = baseUrl;
  }

  /**
   * 校验设备令牌。
   *
   * @param {string} token 明文设备令牌
   * @returns {Promise<{deviceId: string, userId: string, deviceName: string}>}
   */
  async ping(token) {
    return request('/api/device/ping', { token });
  }

  /**
   * 语音答题。
   *
   * body 用 application/octet-stream 裸字节（主应用的这条分支专门为固件准备），
   * sessionId / questionnaireType 走 query。
   *
   * @param {string} token
   * @param {{sessionId: string, questionnaireType: string, audioBytes: Buffer}} input
   */
  async voiceAnswer(token, { sessionId, questionnaireType, audioBytes }) {
    return request('/api/device/voice/answer', {
      method: 'POST',
      token,
      contentType: 'application/octet-stream',
      body: audioBytes,
      query: { sessionId, questionnaireType },
    });
  }

  /**
   * 只取下一题（用于连接建立时先问第一题）。
   */
  async voiceNext(token, { sessionId, questionnaireType }) {
    return request('/api/device/voice/next', {
      method: 'POST',
      token,
      contentType: 'application/json',
      body: JSON.stringify({ sessionId, questionnaireType }),
    });
  }
}
