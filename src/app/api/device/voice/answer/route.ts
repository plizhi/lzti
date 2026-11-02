import { NextRequest } from 'next/server';
import { apiSuccess, ApiError } from '@/lib/api/response';
import { withDeviceAuth } from '@/lib/device-auth';
import {
  buildRetryAudio,
  buildVoiceQuestion,
  loadVoiceContext,
} from '@/lib/device-voice';
import { packetsToOgg } from '@/lib/opus-ogg';
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
 * 固件（复用虾哥 xiaozhi-esp32）把 VAD 切出来的音频帧拼成一个 buffer 直接 POST 上来，
 * 不走 multipart 的封装开销更小。
 *
 * ⚠️ 音频格式的重要约束（2026-10-28 实测）：
 * MiniMax ASR **接受 Ogg Opus 容器**，但**拒绝裸 Opus 包流**
 * （裸包流报 2013 "Invalid data found when processing input"）。
 * 而乐鑫的 esp_opus_enc_process 输出的是**裸 Opus 包**（不做 Ogg 封装），
 * 所以固件侧若直接发裸包，这里必须先封成 Ogg 再调 ASR，否则会 502。
 * 封 Ogg 的实现见 lzti-dev/ws-server/src/ogg-opus.mjs（OpusHead 必须单独占 BOS 页）。
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
  // 三种入参形态：
  // ① multipart/form-data —— 通用，Python 模拟器用
  // ② application/octet-stream —— 裸音频字节，固件用（省掉 multipart 封装）
  // ③ application/json —— { audioBase64, sessionId, questionnaireType }，网页端用
  const contentType = request.headers.get('content-type') || '';
  const isRawAudio = contentType.includes('application/octet-stream');
  const isJson = contentType.includes('application/json');

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
  } else if (isJson) {
    // 网页端：浏览器录音后转 base64 传上来
    let body: { audioBase64?: unknown; sessionId?: unknown; questionnaireType?: unknown };
    try {
      body = await request.json();
    } catch {
      throw new ApiError('请求体不是合法 JSON', 400);
    }
    if (typeof body.audioBase64 !== 'string' || !body.audioBase64) {
      throw new ApiError('缺少音频（字段名 audioBase64）', 400);
    }
    try {
      audioBytes = Buffer.from(body.audioBase64, 'base64');
    } catch {
      throw new ApiError('音频 base64 解码失败', 400);
    }
    filename = 'voice.webm';
    sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
    rawQuestionnaireType = body.questionnaireType;
  } else {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError(
        '请求必须是 multipart/form-data、application/octet-stream 或 application/json',
        400
      );
    }

    const audio = form.get('audio');
    sessionId = typeof form.get('sessionId') === 'string'
      ? (form.get('sessionId') as string)
      : '';
    rawQuestionnaireType = form.get('questionnaireType');

    // 【设备端分帧上传】多个名为 packet 的字段，每个是一个完整的 Opus 包。
    // 这样后端不用自己解析 Opus 裸流（分帧规则容易搞错，错了 MiniMax 就解出垃圾）。
    const packetParts = form.getAll('packet').filter((p): p is File => typeof p !== 'string');
    if (packetParts.length > 0) {
      const packets: Buffer[] = [];
      for (const part of packetParts) {
        const buf = Buffer.from(await part.arrayBuffer());
        if (buf.length > 0) {
          packets.push(buf);
        }
      }
      if (packets.length === 0) {
        throw new ApiError('音频包为空', 400);
      }
      const sampleRate = Number(form.get('sampleRate') || 16000);
      audioBytes = packetsToOgg(packets, sampleRate, 1);
      filename = 'voice.ogg';
    } else {
      if (!audio || typeof audio === 'string') {
        throw new ApiError('缺少音频文件（字段名 audio）', 400);
      }
      const file = audio as File;
      audioBytes = Buffer.from(await file.arrayBuffer());
      filename = file.name || 'voice.mp3';
    }
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

  // 分项耗时计时（2026-11-02 现场延时分析）：
  // 现场实测答题端到端 ~6.9 秒，必须知道时间花在哪一段。
  const tStart = Date.now();

  // 当前该问哪道题
  // ⚠️ skipAudio：这里只需要知道「当前是哪道题」（题干、题号、量表），
  // 音频设备早就有了。合成一次 TTS 要 1.5~2.5 秒，白等 —— 直接跳过。
  const current = await buildVoiceQuestion(stageId, questionnaireType, answers, {
    skipAudio: true,
  });
  const tCurrent = Date.now();

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
  const tAsr = Date.now();

  // ② 归一化成 1-5
  const normalized = await normalizeAnswer(recognizedText, {
    min: current.scale.min,
    max: current.scale.max,
    useLLM: true,
    questionText: current.questionText,
  });
  const tNormalize = Date.now();

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
  const tSaved = Date.now();

  // ⑤ 下一题（这里要音频：设备要播报下一题）
  const next = await buildVoiceQuestion(stageId, questionnaireType, merged);
  const tNext = Date.now();

  console.log(
    `[voice/answer] total=${tNext - tStart}ms | current=${tCurrent - tStart}ms | asr=${tAsr - tCurrent}ms | ` +
      `normalize=${tNormalize - tAsr}ms | save=${tSaved - tNormalize}ms | next(tts)=${tNext - tSaved}ms | ` +
      `text="${recognizedText}" value=${normalized.value} viaLLM=${normalized.viaLLM}`
  );

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
