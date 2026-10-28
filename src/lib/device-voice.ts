/**
 * 语音答题的公共逻辑：出题、定位当前题、生成播报音频。
 *
 * 语音交互与按键交互的核心差异：
 * - 按键：设备自己知道现在第几题，点一下提交一个 questionId
 * - 语音：设备只会「上传一段录音」，服务端必须自己知道现在该问哪道题
 *
 * 所以这里维护一个「当前位置」的概念：
 *   已答的题目集合 → 第一个未答的题目 = 当前题
 * 这样设备完全不用记题号，天然支持断点续答。
 */

import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/api/response';
import { getDeviceQuestions, type DeviceQuestionnaireType } from '@/lib/device-questions';
import { findProgressAttempt, readProgressAnswers } from '@/lib/device-session';
import { speakToBase64 } from '@/lib/minimax-tts';
import {
  buildQuestionPrompt,
  buildRetryPrompt,
  VOICE_SPEED,
} from '@/lib/voice-prompt';

export interface VoiceQuestionState {
  /** 当前题（第一个未答的题） */
  questionId: string;
  questionText: string;
  /** 所属维度名，如「学习兴趣」——设备端测评 UI 要显示 */
  dimensionName: string;
  /** 全局题序，从 1 开始 */
  questionNumber: number;
  totalQuestions: number;
  /** 已答的题数 */
  answeredCount: number;
  /** 全部答完了 */
  finished: boolean;
  /** 播报文案 */
  prompt: string;
  /** 播报音频（base64 mp3） */
  audioBase64: string;
  scale: { min: number; max: number; minLabel: string; maxLabel: string };
}

/** TTS 音色与语速在 voice-prompt 里定义，但 speakToBase64 目前用默认参数。
 *  这里包一层，让语音答题用更适合听懂的语速。 */
async function speakForVoice(text: string): Promise<string> {
  return speakToBase64(text, { speed: VOICE_SPEED });
}

/**
 * 计算当前应该问哪道题，并生成播报音频。
 *
 * @param stageId 学段
 * @param questionnaireType 视角
 * @param answers 已答的题目集合
 */
export async function buildVoiceQuestion(
  stageId: string,
  questionnaireType: DeviceQuestionnaireType,
  answers: Record<string, number>
): Promise<VoiceQuestionState> {
  const questions = getDeviceQuestions(stageId, questionnaireType);
  const scale = questions.scale;

  // 展平所有维度的题目，保持与 globalIndex 一致的顺序
  const flat: Array<{ id: string; text: string; globalIndex: number; dimensionName: string }> = [];
  for (const dim of questions.dimensions) {
    for (const q of dim.questions) {
      flat.push({
        id: q.id,
        text: q.text,
        globalIndex: q.globalIndex,
        dimensionName: dim.name,
      });
    }
  }
  flat.sort((a, b) => a.globalIndex - b.globalIndex);

  // 第一个未答的题
  const next = flat.find((q) => answers[q.id] === undefined);

  if (!next) {
    return {
      questionId: '',
      questionText: '',
      dimensionName: '',
      questionNumber: flat.length,
      totalQuestions: flat.length,
      answeredCount: flat.length,
      finished: true,
      prompt: '已经全部答完啦，感谢你的认真作答。',
      audioBase64: await speakForVoice('已经全部答完啦，感谢你的认真作答。'),
      scale,
    };
  }

  const prompt = buildQuestionPrompt({
    questionNumber: next.globalIndex + 1,
    totalQuestions: flat.length,
    questionText: next.text,
    min: scale.min,
    max: scale.max,
  });

  return {
    questionId: next.id,
    questionText: next.text,
    dimensionName: next.dimensionName,
    questionNumber: next.globalIndex + 1,
    totalQuestions: flat.length,
    answeredCount: Object.keys(answers).length,
    finished: false,
    prompt,
    audioBase64: await speakForVoice(prompt),
    scale,
  };
}

/**
 * 读取某个 session + 视角的已答答案。
 */
export async function readSessionAnswers(
  sessionId: string,
  questionnaireType: string
): Promise<Record<string, number>> {
  const attempt = await findProgressAttempt(sessionId, questionnaireType);
  return readProgressAnswers(attempt);
}

/**
 * 生成「没听清，重说一遍」的音频。
 */
export async function buildRetryAudio(): Promise<{ prompt: string; audioBase64: string }> {
  const prompt = buildRetryPrompt();
  return { prompt, audioBase64: await speakForVoice(prompt) };
}

/**
 * 校验 session + 视角的组合，并返回当前已答答案。
 */
export async function loadVoiceContext(
  sessionId: string,
  userId: string,
  questionnaireType: DeviceQuestionnaireType
): Promise<{ answers: Record<string, number>; stageId: string }> {
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: { child: true },
  });

  if (!session) {
    throw new ApiError('测评会话不存在', 404);
  }
  if (session.child.userId !== userId) {
    throw new ApiError('无权访问该测评会话', 403);
  }

  const answers = await readSessionAnswers(sessionId, questionnaireType);
  return { answers, stageId: session.stageId };
}
