import { NextRequest } from 'next/server';
import { apiSuccess, ApiError, parseJsonBody } from '@/lib/api/response';
import { withDeviceAuth } from '@/lib/device-auth';
import { speakToBase64 } from '@/lib/minimax-tts';

interface SpeakBody {
  text?: unknown;
}

/**
 * POST /api/device/speak
 * 把任意文本转成 mp3（base64）返回，设备只负责播放。
 * 用于提示音、维度名称、反馈语音等。
 */
export const POST = withDeviceAuth(async (request: NextRequest) => {
  const body = await parseJsonBody<SpeakBody>(request);

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    throw new ApiError('请提供要播报的文本', 400);
  }
  if (text.length > 500) {
    throw new ApiError('播报文本过长', 400);
  }

  const audioBase64 = await speakToBase64(text);

  return apiSuccess({ audioBase64 });
});
