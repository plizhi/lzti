import { NextRequest, NextResponse } from 'next/server';
import { activateSlotAndCreatePendingUser, completeRegistration } from '@/lib/services/auth.service';
import { checkRateLimit, addRateLimitHeaders, rateLimits } from '@/lib/api/handler';
import { ApiError, parseJsonBody } from '@/lib/api/response';
import { issueRegistrationTicket, verifyRegistrationTicket } from '@/lib/auth';

const doRateLimit = checkRateLimit(rateLimits.sensitive);

interface SlotBody {
  slotCode?: string;
  childName?: string;
}

interface RegisterBody {
  registrationTicket?: string;
  phone?: string;
  password?: string;
  child?: {
    name: string;
    gender?: string;
    birthDate?: string;
    grade?: string;
  };
  referralCode?: string;
}

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
    const body = await parseJsonBody<SlotBody>(request);
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
        // 注册票据：userId 只从这里面解，前端不参与决定要注册哪个账户
        registrationTicket: result.user
          ? issueRegistrationTicket(result.user.id, { source: 'slot' })
          : undefined,
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
    const body = await parseJsonBody<RegisterBody>(request);
    const { registrationTicket, phone, password, child, referralCode } = body;

    if (!registrationTicket || !password) {
      const response = NextResponse.json(
        { success: false, error: '请填写完整信息' },
        { status: 400 }
      );
      return addRateLimitHeaders(response, rateResult.remaining, rateResult.resetAt);
    }

    let ticket;
    try {
      ticket = verifyRegistrationTicket(registrationTicket);
    } catch {
      const response = NextResponse.json(
        { success: false, error: '注册凭证无效或已过期，请重新开始' },
        { status: 400 }
      );
      return addRateLimitHeaders(response, rateResult.remaining, rateResult.resetAt);
    }

    // SSO 来源：手机号由认证服务验证过，只认票据里的值
    // 邀请码来源：手机号由用户自己填，仍要校验唯一性
    const finalPhone = ticket.source === 'sso' ? ticket.phone : phone;
    if (!finalPhone) {
      const response = NextResponse.json(
        { success: false, error: '请填写完整信息' },
        { status: 400 }
      );
      return addRateLimitHeaders(response, rateResult.remaining, rateResult.resetAt);
    }

    const result = await completeRegistration(ticket.userId, finalPhone, password, child, referralCode);

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
