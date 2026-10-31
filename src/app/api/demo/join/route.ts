import { NextRequest } from 'next/server';
import { apiSuccess, ApiError } from '@/lib/api/response';
import { withPublicHandler } from '@/lib/api/public-handler';
import { checkRateLimit, rateLimits } from '@/lib/api/ratelimit';
import { getDemoJoinInfo } from '@/lib/services/demo-join.service';

/**
 * GET /api/demo/join?c=<加入码>
 *
 * 落地页专用：**免登录**，凭证就是加入码。
 *
 * 返回这一场还缺哪些角色（已完成的不给选）、
 * 孩子/学段信息、链接有效期，三份都做完时一并返回报告码。
 */
export const GET = withPublicHandler(async (request: NextRequest) => {
  const limiter = checkRateLimit(rateLimits.public);
  const limit = await limiter(request);
  if (!limit.success) {
    throw new ApiError('操作太频繁，请稍后再试', 429);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('c') ?? searchParams.get('code') ?? '';

  const info = await getDemoJoinInfo(code);
  return apiSuccess(info);
});
