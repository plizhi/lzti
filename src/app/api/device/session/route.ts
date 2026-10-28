import { NextRequest } from 'next/server';
import { apiSuccess, ApiError } from '@/lib/api/response';
import { withDeviceAuth } from '@/lib/device-auth';
import { findProgressAttempt, readProgressAnswers, requireOwnedSession } from '@/lib/device-session';
import { validateQuestionnaireType } from '@/lib/validators';

/**
 * GET /api/device/session
 * 读取该测评会话当前已保存的进度（设备断线重连后用来续答）。
 *
 * query:
 * - sessionId 必填
 * - type      问卷视角，默认 parent
 */
export const GET = withDeviceAuth(async (request: NextRequest, device) => {
  const { searchParams } = new URL(request.url);

  const sessionId = searchParams.get('sessionId');
  if (!sessionId) {
    throw new ApiError('请提供 session ID', 400);
  }

  const questionnaireType = validateQuestionnaireType(
    searchParams.get('type') ?? 'parent'
  );

  const session = await requireOwnedSession(sessionId, device.userId);

  const attempt = await findProgressAttempt(session.id, questionnaireType);

  return apiSuccess({
    sessionId: session.id,
    stageId: session.stageId,
    childId: session.childId,
    childName: session.child.name,
    questionnaireType,
    hasProgress: Boolean(attempt),
    attemptId: attempt?.id ?? null,
    answers: readProgressAnswers(attempt),
    currentDimensionIndex: attempt?.currentDimensionIndex ?? 0,
  });
});
