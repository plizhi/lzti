import { NextRequest } from 'next/server';
import { apiSuccess, ApiError, parseJsonBody } from '@/lib/api/response';
import { withPublicHandler } from '@/lib/api/public-handler';
import { checkRateLimit, rateLimits } from '@/lib/api/ratelimit';
import { voidDemoJoinAttempt } from '@/lib/services/demo-join.service';

/**
 * POST /api/demo/join/void
 *
 * 演示现场的「我选错了」救命通道：**免登录**撤销自己刚提交的那一份。
 *
 * body:
 * - token  必填，提交时用的角色凭证（证明是提交者本人）
 *
 * 撤销后：该角色的名额释放，可以重新选角色再填一遍。
 */
export const POST = withPublicHandler(async (request: NextRequest) => {
  const limiter = checkRateLimit(rateLimits.public);
  const limit = await limiter(request);
  if (!limit.success) {
    throw new ApiError('操作太频繁，请稍后再试', 429);
  }

  const body = await parseJsonBody<{ token?: unknown }>(request);
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) {
    throw new ApiError('缺少作答凭证，请重新扫码', 400);
  }

  const result = await voidDemoJoinAttempt({ token });
  return apiSuccess(result);
});
