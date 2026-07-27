import { NextRequest, NextResponse } from 'next/server';
import { activateSlotAndCreatePendingUser, completeRegistration } from '@/lib/services/auth.service';
import { checkRateLimit, addRateLimitHeaders, rateLimits } from '@/lib/api/handler';
import { ApiError } from '@/lib/api/response';

const doRateLimit = checkRateLimit(rateLimits.sensitive);

// 第一步：激活 Slot 并创建预账户
export async function PUT(request: NextRequest) {
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
    const { slotCode, childName } = body;

    if (!slotCode) {
      const response = NextResponse.json(
        { success: false, error: '请提供邀请码' },
        { status: 400 }
      );
      return addRateLimitHeaders(response, rateResult.remaining, rateResult.resetAt);
    }

    const result = await activateSlotAndCreatePendingUser(slotCode, childName);

    const response = NextResponse.json({
      success: true,
      data: {
        userId: result.user?.id,
        hasAccount: !!result.user,
        slot: {
          code: result.slot.code,
          type: result.slot.type,
          expiresAt: result.slot.expiresAt,
        },
      },
    });
    return addRateLimitHeaders(response, rateResult.remaining, rateResult.resetAt);
  } catch (error) {
    let status = 500;
    let message = '激活失败';

    if (error instanceof ApiError) {
      status = error.status;
      message = error.message;
    }

    const response = NextResponse.json({ success: false, error: message }, { status });
    return addRateLimitHeaders(response, rateResult.remaining, rateResult.resetAt);
  }
}

// 第二步：完成注册
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
    const { userId, phone, password, child } = body;

    if (!userId || !phone || !password) {
      const response = NextResponse.json(
        { success: false, error: '请填写完整信息' },
        { status: 400 }
      );
      return addRateLimitHeaders(response, rateResult.remaining, rateResult.resetAt);
    }

    const result = await completeRegistration(userId, phone, password, child);

    const response = NextResponse.json({ success: true, data: result });
    return addRateLimitHeaders(response, rateResult.remaining, rateResult.resetAt);
  } catch (error) {
    let status = 500;
    let message = '注册失败';

    if (error instanceof ApiError) {
      status = error.status;
      message = error.message;
    }

    const response = NextResponse.json({ success: false, error: message }, { status });
    return addRateLimitHeaders(response, rateResult.remaining, rateResult.resetAt);
  }
}
