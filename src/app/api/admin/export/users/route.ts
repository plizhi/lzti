import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { prisma } from '@/lib/db';

export const GET = withAuth(async (request: NextRequest, context) => {
  if (context.user.role !== 'ADMIN') {
    return apiSuccess({ error: '需要管理员权限' } as any, 403);
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      children: {
        select: {
          id: true,
          name: true,
          grade: true,
        },
      },
    },
  });

  const data = users.map((u) => ({
    id: u.id,
    phone: u.phone ?? '',
    status: u.status,
    role: u.role,
    childrenCount: u.children.length,
    createdAt: u.createdAt.toISOString(),
  }));

  return apiSuccess({ users: data });
});
