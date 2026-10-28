import { NextRequest } from 'next/server';
import { apiSuccess, ApiError, parseJsonBody } from '@/lib/api/response';
import { withDeviceAuth } from '@/lib/device-auth';
import { buildVoiceQuestion, loadVoiceContext } from '@/lib/device-voice';
import { validateQuestionnaireType } from '@/lib/validators';
import type { DeviceQuestionnaireType } from '@/lib/device-questions';

interface NextBody {
  sessionId?: unknown;
  questionnaireType?: unknown;
}

/**
 * POST /api/device/voice/next
 * 语音答题：取下一道题并返回播报音频。
 *
 * 设备不用记题号——服务端根据「已答集合」算出下一个未答的题。
 * 所以设备只需要：收到音频 → 播 → 录音 → 调 voice/answer。
 *
 * body:
 * - sessionId          必填
 * - questionnaireType  必填，parent/student/teacher
 *
 * 响应 data:
 * {
 *   questionId, questionText, questionNumber, totalQuestions,
 *   answeredCount, finished, prompt, audioBase64, scale
 * }
 */
export const POST = withDeviceAuth(async (request: NextRequest, device) => {
  const body = await parseJsonBody<NextBody>(request);

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!sessionId) {
    throw new ApiError('请提供 session ID', 400);
  }

  const questionnaireType = validateQuestionnaireType(
    body.questionnaireType
  ) as DeviceQuestionnaireType;

  const { answers, stageId } = await loadVoiceContext(
    sessionId,
    device.userId,
    questionnaireType
  );

  const state = await buildVoiceQuestion(stageId, questionnaireType, answers);

  return apiSuccess(state);
});
