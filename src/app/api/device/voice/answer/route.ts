import { NextRequest } from 'next/server';
import { apiSuccess, ApiError } from '@/lib/api/response';
import { withDeviceAuth } from '@/lib/device-auth';
import {
  buildRetryAudio,
  buildVoiceQuestion,
  loadVoiceContext,
} from '@/lib/device-voice';
import { requireOwnedSession, saveProgress } from '@/lib/device-session';
import { normalizeAnswer } from '@/lib/answer-normalizer';
import { transcribe } from '@/lib/device-asr';
import { validateQuestionnaireType } from '@/lib/validators';
import type { DeviceQuestionnaireType } from '@/lib/device-questions';

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

/**
 * POST /api/device/voice/answer
 * 语音答题：上传录音 → 识别 → 归一化成 1-5 → 落进度 → 返回下一题音频。
 *
 * body:
 * - multipart/form-data：字段 audio（录音文件）、sessionId、questionnaireType
 * - 或 application/octet-stream：请求体是裸音频字节，sessionId/questionnaireType 走 query
 *
 * 为什么要支持 octet-stream：
 * 固件（复用虾哥 xiaozhi-esp32）把 VAD 切出来的 Opus 帧拼成一个 buffer 直接 POST 上来，
 * 不走 multipart 的封装开销更小。实测 MiniMax ASR 直接接受 Opus 字节。
 *
 * 响应 data:
 * {
 *   recognizedText  识别到的原文
 *   normalizedValue 归一化后的分值（null 表示没听懂）
 *   accepted        是否采纳了这个答案
 *   retry           是否需要重念本题
 *   finished        是否已答完
 *   next            下一题（含 audioBase64）
 * }
 */
export const POST = withDeviceAuth(async (request: NextRequest, device) => {
  // 两种入参形态：
  // ① multipart/form-data —— 通用，浏览器/模拟器用
  // ② application/octet-stream —— 裸音频字节，固件用（省掉 multipart 封装）
  const contentType = request.headers.get('content-type') || '';
  const isRawAudio = contentType.includes('application/octet-stream');

  let audioBytes: Buffer;
  let filename: string;
  let sessionId: string;
  let rawQuestionnaireType: unknown;

  if (isRawAudio) {
    audioBytes = Buffer.from(await request.arrayBuffer());
    filename = 'voice.opus';
    const url = new URL(request.url);
    sessionId = url.searchParams.get('sessionId') || '';
    rawQuestionnaireType = url.searchParams.get('questionnaireType');
  } else {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError('请求必须是 multipart/form-data 或 application/octet-stream', 400);
    }

    const audio = form.get('audio');
    if (!audio || typeof audio === 'string') {
      throw new ApiError('缺少音频文件（字段名 audio）', 400);
    }
    const file = audio as File;
    audioBytes = Buffer.from(await file.arrayBuffer());
    filename = file.name || 'voice.mp3';
    sessionId = typeof form.get('sessionId') === 'string'
      ? (form.get('sessionId') as string)
      : '';
    rawQuestionnaireType = form.get('questionnaireType');
  }

  if (audioBytes.length <= 0) {
    throw new ApiError('音频文件为空', 400);
  }
  if (audioBytes.length > MAX_AUDIO_BYTES) {
    throw new ApiError('音频文件超过 5MB 上限', 400);
  }

  if (!sessionId) {
    throw new ApiError('请提供 session ID', 400);
  }

  const questionnaireType = validateQuestionnaireType(
    rawQuestionnaireType
  ) as DeviceQuestionnaireType;

  const { answers, stageId } = await loadVoiceContext(
    sessionId,
    device.userId,
    questionnaireType
  );

  // 当前该问哪道题
  const current = await buildVoiceQuestion(stageId, questionnaireType, answers);

  if (current.finished) {
    return apiSuccess({
      recognizedText: '',
      normalizedValue: null,
      accepted: false,
      retry: false,
      finished: true,
      next: current,
    });
  }

  // ① 语音识别
  const recognizedText = await transcribe(audioBytes, filename);

  // ② 归一化成 1-5
  const normalized = await normalizeAnswer(recognizedText, {
    min: current.scale.min,
    max: current.scale.max,
    useLLM: true,
    questionText: current.questionText,
  });

  // ③ 没听懂 → 重念本题，不跳题
  if (normalized.value === null) {
    const retry = await buildRetryAudio();
    return apiSuccess({
      recognizedText,
      normalizedValue: null,
      accepted: false,
      retry: true,
      finished: false,
      reason: normalized.reason,
      next: {
        questionId: current.questionId,
        questionText: current.questionText,
        questionNumber: current.questionNumber,
        totalQuestions: current.totalQuestions,
        answeredCount: current.answeredCount,
        finished: false,
        prompt: retry.prompt,
        audioBase64: retry.audioBase64,
        scale: current.scale,
      },
    });
  }

  // ④ 落答案
  const merged = { ...answers, [current.questionId]: normalized.value };

  const session = await requireOwnedSession(sessionId, device.userId);
  await saveProgress(session, questionnaireType, merged, 0);

  // ⑤ 下一题
  const next = await buildVoiceQuestion(stageId, questionnaireType, merged);

  return apiSuccess({
    recognizedText,
    normalizedValue: normalized.value,
    accepted: true,
    retry: false,
    finished: next.finished,
    reason: normalized.reason,
    next,
  });
});
