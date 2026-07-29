import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiSuccess, ApiError } from '@/lib/api/response';

// 公开统计接口，无权限验证
// 返回聚合数据，不涉及个人隐私
export const GET = async (request: NextRequest) => {
  try {
    // 只统计正式用户数（排除 PENDING 预账户）
    const totalUsers = await prisma.user.count({
      where: { status: 'ACTIVE' },
    });

    // 统计测评尝试次数
    const totalAttempts = await prisma.sessionAttempt.count();

    return apiSuccess({
      totalUsers,
      totalAttempts,
    });
  } catch (error) {
    console.error('[Stats API]', error);
    throw new ApiError('获取统计数据失败', 500);
  }
};
