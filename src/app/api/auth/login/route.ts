import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/services/auth.service';
import { apiSuccess, checkRateLimit, addRateLimitHeaders, rateLimits } from '@/lib/api/handler';
import { ApiError } from '@/lib/api/response';

const doRateLimit = checkRateLimit(rateLimits.sensitive);

export async function POST(request: NextRequest) {
  const rateResult = await doRateLimit(request);

  if (!rateResult.success) {
    const response = NextResponse.json(
      { success: false, error: '请求过于频繁，请稍后再试' },
      { status: 429 }
    );
    return addRateLimitHeaders(response, rateResult.remaining, rateResult.resetAt);
  }

  try {
    const body = await request.json();
    const result = await login(body);
    const response = NextResponse.json({ success: true, data: result }, { status: 200 });
    return addRateLimitHeaders(response, rateResult.remaining, rateResult.resetAt);
  } catch (error) {
    let status = 500;
    let message = '登录失败';

    if (error instanceof ApiError) {
      status = error.status;
      message = error.message;
    }

    const response = NextResponse.json({ success: false, error: message }, { status });
    return addRateLimitHeaders(response, rateResult.remaining, rateResult.resetAt);
  }
}
