import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { ApiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';

// 保存进度
export const PATCH = withAuth(async (request: NextRequest, context) => {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    throw new ApiError('请提供 session ID', 400);
  }

  const body = await request.json();
  const { questionnaireType, answers, currentDimensionIndex } = body;

  if (!questionnaireType) {
    throw new ApiError('请提供问卷类型', 400);
  }

  // 查找或创建 progress 记录
  // 使用 sessionId + questionnaireType 查找已有的 partial attempt
  let attempt = await prisma.sessionAttempt.findFirst({
    where: {
      sessionId,
      questionnaireType,
      // 只有没有 report 的才是进行中的
      report: null,
    },
  });

  if (attempt) {
    // 更新现有进度
    attempt = await prisma.sessionAttempt.update({
      where: { id: attempt.id },
      data: {
        answers: answers ?? attempt.answers,
        currentDimensionIndex: currentDimensionIndex ?? attempt.currentDimensionIndex,
      },
    });
  } else {
    // 创建新的 partial attempt（只有 progress，没有 scores/quadrants）
    attempt = await prisma.sessionAttempt.create({
      data: {
        sessionId,
        childId: '', // 暂时留空，后面会更新
        questionnaireType,
        stageId: '',
        answers: answers ?? {},
        scores: {},
        quadrants: {},
        progress: answers,
        currentDimensionIndex: currentDimensionIndex ?? 0,
      },
    });
  }

  return apiSuccess({
    attemptId: attempt.id,
    saved: true,
    currentDimensionIndex: attempt.currentDimensionIndex,
  });
});

// 获取进度
export const GET = withAuth(async (request: NextRequest, context) => {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const questionnaireType = searchParams.get('questionnaireType');

  if (!sessionId || !questionnaireType) {
    throw new ApiError('请提供 session ID 和问卷类型', 400);
  }

  const attempt = await prisma.sessionAttempt.findFirst({
    where: {
      sessionId,
      questionnaireType,
      // 只获取进行中的（没有 report 的）
      report: null,
    },
  });

  if (!attempt) {
    return apiSuccess({ hasProgress: false });
  }

  return apiSuccess({
    hasProgress: true,
    attemptId: attempt.id,
    answers: attempt.progress ?? attempt.answers,
    currentDimensionIndex: attempt.currentDimensionIndex,
  });
});
