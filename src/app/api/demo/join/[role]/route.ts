import { NextRequest } from 'next/server';
import { apiSuccess, ApiError, parseJsonBody } from '@/lib/api/response';
import { withPublicHandler } from '@/lib/api/public-handler';
import { checkRateLimit, rateLimits } from '@/lib/api/ratelimit';
import { claimDemoJoinRole } from '@/lib/services/demo-join.service';

/**
 * POST /api/demo/join/[role]
 *
 * 落地页：**免登录**领取某个角色的作答权。
 *
 * body:
 * - code  必填，加入码（二维码里的那一个）
 * - name  选填，作答人姓名（老师/学生填个名字，方便家长对账）
 *
 * 返回：
 * - token      角色凭证（提交时必须带上，角色写死在凭证里，客户端改不了）
 * - dimensions 这份卷的题目（按维度分组）
 *
 * ⚠️ 领取本身不落库、不占名额 —— 名额在**提交那一刻**才原子占用（先到先得）。
 *    这样「老师点错了角色、还没提交」时还能回退重选。
 */
export const POST = withPublicHandler<unknown, { role: string }>(
  async (request: NextRequest, context) => {
    const limiter = checkRateLimit(rateLimits.public);
    const limit = await limiter(request);
    if (!limit.success) {
      throw new ApiError('操作太频繁，请稍后再试', 429);
    }

    const { role } = await context.params;
    const body = await parseJsonBody<{ code?: unknown; name?: unknown }>(request);

    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!code) {
      throw new ApiError('缺少加入码', 400);
    }

    const claim = await claimDemoJoinRole({
      code,
      role,
      name: typeof body.name === 'string' ? body.name : undefined,
    });

    return apiSuccess(claim);
  }
);
