import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { transferCoupon } from '@/lib/services/point.service';
import { checkRateLimit, addRateLimitHeaders, rateLimits } from '@/lib/api/handler';

const doRateLimit = checkRateLimit(rateLimits.sensitive);

export const POST = requireAuth(async (request: NextRequest, context) => {
  try {
    const rateLimit = await doRateLimit(request);
    if (!rateLimit.success) {
      const response = NextResponse.json(
        { success: false, error: '操作过于频繁，请稍后再试' },
        { status: 429 }
      );
      return addRateLimitHeaders(response, 0, rateLimit.resetAt);
    }

    const body = await request.json().catch(() => ({}));
    const { code, newOwnerId } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: '缺少券码' },
        { status: 400 }
      );
    }

    // 归属校验在 service 里做：普通用户只能解绑自己的券，
    // 改归属到别人名下是管理员权限。
    await transferCoupon(code, newOwnerId ?? null, {
      userId: context.user.id,
      role: context.user.role,
    });

    const response = NextResponse.json({
      success: true,
      message: '券已转让',
    });
    return addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetAt);
  } catch (error) {
    console.error('转让券失败:', error);
    // 业务错误（无权 / 不存在 / 已使用）返回 4xx，不要一律 500
    const message = error instanceof Error ? error.message : '转让券失败';
    const status = /无权|不存在|已使用|已过期/.test(message) ? 403 : 500;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
});
