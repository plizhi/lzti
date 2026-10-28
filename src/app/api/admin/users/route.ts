import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';
import { deleteUserCascade } from '@/lib/services/deletion.service';
import { ApiError } from '@/lib/api/response';

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
    users: users.map((u: { id: string; phone: string | null; status: string; role: string; createdAt: Date; children: { length: number } }) => ({
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

  // 级联删除相关数据。
  // 库里的外键是 RESTRICT，原来的 deleteMany 顺序（先删批次、后删 slot）会撞 FK，
  // 整个事务回滚 —— 也就是「有分享记录的用户根本删不掉」。改为按依赖顺序显式删除。
  try {
    await deleteUserCascade(userId);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status);
    }
    console.error('Delete user error:', error);
    return apiError('删除用户失败', 500);
  }

  return apiSuccess({ deleted: true });
});
