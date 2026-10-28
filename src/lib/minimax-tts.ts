/**
 * MiniMax 语音合成（TTS）封装
 *
 * 服务端持有 API Key，硬件侧不接触任何第三方密钥。
 * ESP32 只拿到 mp3 字节流（或 base64），负责解码播放。
 */

import { ApiError } from '@/lib/api/response';

const BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com';

function getApiKey(): string {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) {
    throw new ApiError('语音服务未配置', 500);
  }
  return key;
}

function isErrorPayload(payload: unknown): boolean {
  const p = payload as { base_resp?: { status_code?: number; status_msg?: string } };
  if (p?.base_resp && typeof p.base_resp.status_code === 'number' && p.base_resp.status_code !== 0) {
    return true;
  }
  return false;
}

/**
 * 语音合成：把文字转成 mp3
 */
export async function speak(text: string): Promise<Buffer> {
  const key = getApiKey();
  const content = text.trim();
  if (!content) {
    throw new ApiError('待播报文本为空', 400);
  }

  const body = {
    model: 'speech-2.8-hd',
    text: content,
    stream: false,
    // voice_setting / audio_setting 都不能缺，缺字段 MiniMax 会报 2013
    voice_setting: {
      voice_id: 'female-shaonv',
      speed: 1,
      vol: 1,
      pitch: 0,
      emotion: 'happy',
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: 'mp3',
      channel: 1,
    },
    subtitle_enable: false,
  };

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/v1/t2a_v2`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[minimax-tts] 请求失败:', err);
    throw new ApiError('语音合成失败', 502);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[minimax-tts] HTTP ${res.status}: ${text}`);
    throw new ApiError('语音合成失败', 502);
  }

  let payload: {
    data?: { audio?: string; status?: number };
    base_resp?: { status_code?: number; status_msg?: string };
  };
  try {
    payload = (await res.json()) as typeof payload;
  } catch (err) {
    console.error('[minimax-tts] 响应解析失败:', err);
    throw new ApiError('语音合成失败', 502);
  }

  if (isErrorPayload(payload)) {
    console.error('[minimax-tts] 业务错误:', payload.base_resp);
    throw new ApiError('语音合成失败', 502);
  }

  const hex = payload.data?.audio;
  if (!hex) {
    console.error('[minimax-tts] 未返回音频');
    throw new ApiError('语音合成失败', 502);
  }

  return Buffer.from(hex, 'hex');
}

/**
 * 语音合成并转成 base64（随响应体返回给设备）
 */
export async function speakToBase64(text: string): Promise<string> {
  const buffer = await speak(text);
  return buffer.toString('base64');
}
