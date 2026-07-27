import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { prisma } from '@/lib/db';

export const GET = withAuth(async (request, context) => {
  // 检查管理员权限
  if (context.user.role !== 'ADMIN') {
    return apiSuccess({ error: '需要管理员权限' } as any, 403);
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const offset = (page - 1) * limit;

  const users = await prisma.user.findMany({
    skip: offset,
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      phone: true,
      status: true,
      role: true,
      createdAt: true,
      children: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const total = await prisma.user.count();

  return apiSuccess({
    users: users.map((u) => ({
      id: u.id,
      phone: u.phone,
      status: u.status,
      role: u.role,
      createdAt: u.createdAt,
      childrenCount: u.children.length,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export const DELETE = withAuth(async (request: NextRequest, context) => {
  if (context.user.role !== 'ADMIN') {
    return apiSuccess({ error: '需要管理员权限' } as any, 403);
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id');

  if (!userId) {
    return apiSuccess({ error: '请提供用户 ID' }, 400);
  }

  // 不允许删除自己
  if (userId === context.user.id) {
    return apiSuccess({ error: '不能删除自己' }, 400);
  }

  // 级联删除相关数据
  await prisma.$transaction([
    // 删除用户的邀请码
    prisma.userInviteCode.deleteMany({ where: { userId } }),
    // 删除用户的分享批次
    prisma.shareBatch.deleteMany({ where: { userId } }),
    // 删除用户的报告分享
    prisma.reportShare.deleteMany({ where: { ownerId: userId } }),
    // 删除用户的孩子
    prisma.child.deleteMany({ where: { userId } }),
    // 删除用户
    prisma.user.delete({ where: { id: userId } }),
  ]);

  return apiSuccess({ deleted: true });
});
