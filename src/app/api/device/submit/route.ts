import { NextRequest } from 'next/server';
import { apiSuccess, ApiError, parseJsonBody } from '@/lib/api/response';
import { withDeviceAuth } from '@/lib/device-auth';
import { findProgressAttempt, readProgressAnswers, requireOwnedSession } from '@/lib/device-session';
import { getDeviceQuestions, type DeviceQuestionnaireType } from '@/lib/device-questions';
import { submitAttempt } from '@/lib/services/assessment.service';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { validateAnswers, validateQuestionnaireType } from '@/lib/validators';

interface SubmitBody {
  sessionId?: unknown;
  questionnaireType?: unknown;
}

/**
 * POST /api/device/submit
 * 用设备上攒下的答案提交测评。
 *
 * body:
 * - sessionId         必填
 * - questionnaireType 必填，parent/student/teacher
 *
 * 说明：
 * `SessionAttempt` 上有 (sessionId, questionnaireType) 唯一约束，
 * 而答题过程中保存进度的记录已经占了这个坑。所以提交前要先删掉这条
 * 「进行中」的记录，提交失败时再把它原样写回去（答案不丢）。
 */
export const POST = withDeviceAuth(async (request: NextRequest, device) => {
  const body = await parseJsonBody<SubmitBody>(request);

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!sessionId) {
    throw new ApiError('请提供 session ID', 400);
  }

  const questionnaireType = validateQuestionnaireType(
    body.questionnaireType
  ) as DeviceQuestionnaireType;

  const session = await requireOwnedSession(sessionId, device.userId);

  const attempt = await findProgressAttempt(session.id, questionnaireType);
  if (!attempt) {
    throw new ApiError('还没有答题记录，无法提交', 400);
  }

  const answers = validateAnswers(readProgressAnswers(attempt));

  // 应答题数 = 该视角所有维度的题目总数
  const expected = getDeviceQuestions(session.stageId, questionnaireType).dimensions.reduce(
    (sum, dim) => sum + dim.questions.length,
    0
  );
  const answered = Object.keys(answers).length;
  if (answered < expected) {
    throw new ApiError(`还有 ${expected - answered} 道题未作答`, 400);
  }

  // 让出唯一约束坑位
  await prisma.sessionAttempt.delete({ where: { id: attempt.id } });

  try {
    const result = await submitAttempt(session.id, device.userId, {
      questionnaireType,
      answers,
    });
    return apiSuccess(result, 201);
  } catch (err) {
    // 提交失败要把进度写回去，否则答案就没了
    try {
      await prisma.sessionAttempt.create({
        data: {
          sessionId: session.id,
          childId: session.childId,
          questionnaireType,
          stageId: session.stageId,
          answers: answers as Prisma.InputJsonValue,
          scores: {},
          quadrants: {},
          progress: answers as Prisma.InputJsonValue,
          currentDimensionIndex: attempt.currentDimensionIndex ?? 0,
        },
      });
    } catch (restoreErr) {
      console.error('[device/submit] 恢复进度失败:', restoreErr);
    }
    throw err;
  }
});
