import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { ApiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { getQuestionnaire } from '@/data/questionnaires';

export const GET = withAuth(async (request, context) => {
  // 从 URL 提取 attemptId
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const attemptIdIndex = pathParts.indexOf('attempts') + 1;
  const attemptId = pathParts[attemptIdIndex];

  const attempt = await prisma.sessionAttempt.findFirst({
    where: {
      id: attemptId,
      session: { child: { userId: context.user.id } },
    },
    include: {
      session: { include: { child: true } },
      report: true,
    },
  });

  if (!attempt) {
    throw new ApiError('报告不存在', 404);
  }

  const questionnaire = getQuestionnaire(attempt.stageId);

  // 维度元信息：轴名/正负标签 + 四个象限的文案。
  // 前端报告页用它绘制象限图与雷达图（此前这些信息没透出，导致
  // 写好的 QuadrantChart / RadarChart 组件无法接入）。
  const dimensionMeta = (questionnaire?.dimensions ?? []).map((dim) => {
    const axes = dim.axes.map((a) =>
      typeof a === 'string'
        ? { id: a, name: a, description: '', positiveLabel: '', negativeLabel: '' }
        : {
            id: a.id,
            name: a.name,
            description: a.description ?? '',
            positiveLabel: a.positiveLabel ?? '',
            negativeLabel: a.negativeLabel ?? '',
          },
    );
    return {
      dimensionId: dim.id,
      dimensionName: dim.name,
      axes,
      quadrants: dim.quadrants.map((q) => ({
        id: q.id,
        name: q.name,
        description: q.description ?? '',
      })),
    };
  });

  return apiSuccess({
    attemptId: attempt.id,
    sessionId: attempt.sessionId,
    child: { id: attempt.session.child.id, name: attempt.session.child.name },
    stageId: attempt.stageId,
    stageName: questionnaire?.name,
    questionnaireType: attempt.questionnaireType,
    scores: attempt.scores,
    quadrants: attempt.quadrants,
    dimensionMeta,
    report: attempt.report
      ? {
          id: attempt.report.id,
          currentStatus: attempt.report.currentStatus,
          trendAnalysis: attempt.report.trendAnalysis,
          suggestions: attempt.report.suggestions,
          trajectory: attempt.report.trajectory,
          createdAt: attempt.report.createdAt,
        }
      : null,
    createdAt: attempt.createdAt,
  });
});
