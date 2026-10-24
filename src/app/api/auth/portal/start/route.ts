import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { AUTH_BASE, CLIENT_ID, REDIRECT_URI } from '@/lib/auth-portal';

export const runtime = 'nodejs';

// GET /api/auth/portal/start
// 发起体系账号 SSO：生成 state 存 cookie，跳到认证服务授权页
export async function GET(req: NextRequest) {
  if (!AUTH_BASE || !REDIRECT_URI) {
    return NextResponse.json(
      { success: false, error: 'SSO 未配置（AUTH_BASE_URL / LZTI_REDIRECT_URI）' },
      { status: 500 }
    );
  }

  const state = randomBytes(16).toString('hex');
  const authorizeUrl = new URL(`${AUTH_BASE}/oauth/authorize`);
  authorizeUrl.searchParams.set('client_id', CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authorizeUrl.searchParams.set('state', state);

  const res = NextResponse.redirect(authorizeUrl.toString());
  res.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return res;
}
