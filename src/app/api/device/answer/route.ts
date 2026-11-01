import { NextRequest } from 'next/server';
import { apiSuccess, ApiError, parseJsonBody } from '@/lib/api/response';
import { withDeviceAuth } from '@/lib/device-auth';
import {
  findProgressAttempt,
  readProgressAnswers,
  requireOwnedSession,
  saveProgress,
} from '@/lib/device-session';
import { validateQuestionnaireType } from '@/lib/validators';
import type { DeviceQuestionnaireType } from '@/lib/device-questions';
import { buildVoiceQuestion, loadVoiceContext } from '@/lib/device-voice';

interface AnswerBody {
  sessionId?: unknown;
  questionnaireType?: unknown;
  questionId?: unknown;
  value?: unknown;
  currentDimensionIndex?: unknown;
}

/**
 * POST /api/device/answer
 * 提交一道题的答案（增量合并到已有进度里）。
 *
 * body:
 * - sessionId          必填
 * - questionnaireType  必填，parent/student/teacher
 * - questionId         必填
 * - value              必填，1~5 的整数
 * - currentDimensionIndex 可选，维度游标
 */
export const POST = withDeviceAuth(async (request: NextRequest, device) => {
  const body = await parseJsonBody<AnswerBody>(request);

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!sessionId) {
    throw new ApiError('请提供 session ID', 400);
  }

  const questionnaireType = validateQuestionnaireType(body.questionnaireType) as DeviceQuestionnaireType;

  const questionId = typeof body.questionId === 'string' ? body.questionId : '';
  if (!questionId) {
    throw new ApiError('请提供题目 ID', 400);
  }

  const value = body.value;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 5
  ) {
    throw new ApiError('答案值必须在1-5之间', 400);
  }

  let currentDimensionIndex: number | undefined;
  if (body.currentDimensionIndex !== undefined && body.currentDimensionIndex !== null) {
    const parsed = Number(body.currentDimensionIndex);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new ApiError('维度索引错误', 400);
    }
    currentDimensionIndex = parsed;
  }

  const session = await requireOwnedSession(sessionId, device.userId);

  // 增量合并：读出已有答案，合并这一题，再整体存回
  const attempt = await findProgressAttempt(session.id, questionnaireType);
  const answers = readProgressAnswers(attempt);
  answers[questionId] = value;

  const saved = await saveProgress(
    session,
    questionnaireType,
    answers,
    currentDimensionIndex ?? attempt?.currentDimensionIndex ?? 0
  );

  // 顺带把【下一题】也返回了：设备端按键作答时就不用再发一次请求。
  // （设备每次新建 HTTPS 连接要 4 秒多，两个来回 = 8~10 秒才出下一题；
  //   一个来回就快一倍。）
  let next: unknown = null;
  let finished = false;
  try {
    const { stageId } = await loadVoiceContext(sessionId, device.userId, questionnaireType);
    const nextState = await buildVoiceQuestion(stageId, questionnaireType, answers);
    next = nextState;
    finished = nextState.finished;
  } catch (err) {
    console.error('[answer] failed to build next question:', err);
  }

  return apiSuccess({
    saved: true,
    attemptId: saved.id,
    currentDimensionIndex: saved.currentDimensionIndex ?? 0,
    answeredCount: Object.keys(answers).length,
    finished,
    next,
  });
});
