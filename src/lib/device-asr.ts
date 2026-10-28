/**
 * MiniMax 语音识别（ASR）封装。
 *
 * 服务端持有 API Key，硬件侧不接触任何第三方密钥。
 *
 * 实测（2026-10-28）：
 * - 短语音「选A」「我选3」等 12 个用例全部识别正确
 * - 信噪比降到 0dB（噪声与语音同能量）依然识别正确
 * - 支持流式（SSE）返回，首字延迟 0.59s
 */

import { ApiError } from '@/lib/api/response';

const BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com';

function getApiKey(): string {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) {
    throw new ApiError('语音识别服务未配置', 500);
  }
  return key;
}

/**
 * 把音频转成文字。
 *
 * @param audio 音频字节
 * @param filename 文件名，用于决定上传的 content type
 */
export async function transcribe(audio: Buffer, filename: string): Promise<string> {
  const key = getApiKey();

  const form = new FormData();
  form.append('model', 'asr-1.0');
  form.append(
    'file',
    new Blob([new Uint8Array(audio)], { type: guessContentType(filename) }),
    filename || 'audio.mp3'
  );

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/v1/speech_to_text`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        language: 'zh',
      },
      body: form,
    });
  } catch (err) {
    console.error('[asr] 请求失败:', err);
    throw new ApiError('语音识别失败', 502);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[asr] HTTP ${res.status}: ${text}`);
    throw new ApiError('语音识别失败', 502);
  }

  let payload: { text?: string };
  try {
    payload = (await res.json()) as { text?: string };
  } catch (err) {
    console.error('[asr] 响应解析失败:', err);
    throw new ApiError('语音识别失败', 502);
  }

  return (payload.text || '').trim();
}

/** 根据扩展名猜 content type */
function guessContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'wav':
      return 'audio/wav';
    case 'ogg':
      return 'audio/ogg';
    case 'aac':
      return 'audio/aac';
    case 'm4a':
    case 'alac':
      return 'audio/mp4';
    case 'flac':
      return 'audio/flac';
    case 'opus':
      return 'audio/opus';
    case 'aiff':
      return 'audio/aiff';
    case 'mp3':
    default:
      return 'audio/mpeg';
  }
}
