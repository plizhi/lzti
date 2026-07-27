import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { ApiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { getQuestionnaire } from '@/data/questionnaires';

export async function GET(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  return withAuth(async (req, context) => {
    const { attemptId } = params;

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

    return apiSuccess({
      attemptId: attempt.id,
      sessionId: attempt.sessionId,
      child: { id: attempt.session.child.id, name: attempt.session.child.name },
      stageId: attempt.stageId,
      stageName: questionnaire?.name,
      questionnaireType: attempt.questionnaireType,
      scores: attempt.scores,
      quadrants: attempt.quadrants,
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
}
