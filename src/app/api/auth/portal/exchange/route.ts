import { NextRequest, NextResponse } from 'next/server';
import { issueRegistrationTicket } from '@/lib/auth';

export const runtime = 'nodejs';

// POST /api/auth/portal/exchange
// 一次性兑换 SSO 回调写入的 token，取走即作废
export async function POST(request: NextRequest) {
  const token = request.cookies.get('lzti_sso_token')?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, error: '没有待兑换的登录凭证' },
      { status: 401 }
    );
  }

  let setup: { userId?: string; phone?: string | null } | null = null;
  const raw = request.cookies.get('lzti_sso_setup')?.value;
  if (raw) {
    try {
      setup = JSON.parse(raw);
    } catch {
      setup = null;
    }
  }

  const res = NextResponse.json({
    success: true,
    data: {
      token,
      needsSetup: !!setup?.userId,
      // 补全注册用的票据：userId 与手机号都由服务端决定，前端说了不算
      registrationTicket: setup?.userId
        ? issueRegistrationTicket(setup.userId, { phone: setup.phone ?? null, source: 'sso' })
        : undefined,
      phone: setup?.phone,
    },
  });

  // 用空值 + 同样的 path 覆盖，浏览器才会真正丢掉这份 cookie
  res.cookies.set('lzti_sso_token', '', {
    path: '/api/auth/portal/exchange',
    maxAge: 0,
  });
  res.cookies.set('lzti_sso_setup', '', {
    path: '/api/auth/portal/exchange',
    maxAge: 0,
  });

  return res;
}
