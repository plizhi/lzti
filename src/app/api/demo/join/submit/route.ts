import { NextRequest } from 'next/server';
import { apiSuccess, ApiError, parseJsonBody } from '@/lib/api/response';
import { withPublicHandler } from '@/lib/api/public-handler';
import { checkRateLimit, rateLimits } from '@/lib/api/ratelimit';
import { submitDemoJoinAnswers } from '@/lib/services/demo-join.service';

/**
 * POST /api/demo/join/submit
 *
 * 落地页：**免登录**提交作答。
 *
 * body:
 * - token   必填，领取角色时拿到的角色凭证（内含角色，客户端改不了）
 * - answers 必填，{ 题号: 1-5 }
 *
 * 提交成功后：
 *   - attempt 挂到同一个 demo Child / 同一个 AssessmentSession 下
 *   - 该角色的名额作废（一次性，用掉即废）
 *   - 三份都齐了 → 一并返回三个报告码（只读、24h、可多人查看）
 */
export const POST = withPublicHandler(async (request: NextRequest) => {
  const limiter = checkRateLimit(rateLimits.public);
  const limit = await limiter(request);
  if (!limit.success) {
    throw new ApiError('操作太频繁，请稍后再试', 429);
  }

  const body = await parseJsonBody<{ token?: unknown; answers?: unknown }>(request);

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) {
    throw new ApiError('缺少作答凭证，请重新扫码', 400);
  }

  const result = await submitDemoJoinAnswers({ token, answers: body.answers });
  return apiSuccess(result);
});
