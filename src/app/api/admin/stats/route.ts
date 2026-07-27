import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { prisma } from '@/lib/db';

export const GET = withAuth(async (request, context) => {
  // 检查管理员权限
  if (context.user.role !== 'ADMIN') {
    return apiSuccess({ error: '需要管理员权限' } as any, 403);
  }

  // 统计用户数
  const totalUsers = await prisma.user.count({
    where: { status: 'ACTIVE' },
  });

  const pendingUsers = await prisma.user.count({
    where: { status: 'PENDING' },
  });

  // 统计孩子数
  const totalChildren = await prisma.child.count();

  // 统计测评会话数
  const totalSessions = await prisma.assessmentSession.count();

  // 统计测评尝试数
  const totalAttempts = await prisma.sessionAttempt.count();

  // 统计今日新增
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayUsers = await prisma.user.count({
    where: {
      status: 'ACTIVE',
      createdAt: { gte: today },
    },
  });

  const todayAttempts = await prisma.sessionAttempt.count({
    where: {
      createdAt: { gte: today },
    },
  });

  // 各学段分布
  const sessionsByStage = await prisma.$queryRaw<
    Array<{ stageid: string; count: bigint }>
  >`
    SELECT "stageId" as stageId, COUNT(*) as count
    FROM "AssessmentSession"
    GROUP BY "stageId"
  `;

  return apiSuccess({
    totalUsers,
    pendingUsers,
    totalChildren,
    totalSessions,
    totalAttempts,
    todayUsers,
    todayAttempts,
    sessionsByStage: sessionsByStage.map((s) => ({
      stageId: s.stageid,
      count: Number(s.count),
    })),
  });
});
