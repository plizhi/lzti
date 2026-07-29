import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { prisma } from '@/lib/db';

export const GET = withAuth(async (request: NextRequest, context) => {
  if (context.user.role !== 'ADMIN') {
    return apiSuccess({ error: '需要管理员权限' } as any, 403);
  }

  const attempts = await prisma.sessionAttempt.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1000,
    include: {
      session: {
        include: {
          child: true,
        },
      },
    },
  });

  const data = attempts.map((a: typeof attempts[number]) => ({
    id: a.id,
    childName: a.session.child.name,
    stageId: a.stageId,
    questionnaireType: a.questionnaireType,
    scores: a.scores,
    quadrants: a.quadrants,
    createdAt: a.createdAt.toISOString(),
  }));

  return apiSuccess({ attempts: data });
});
