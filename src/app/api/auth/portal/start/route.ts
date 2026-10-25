import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSsoConfig } from '@/lib/auth-portal';

export const runtime = 'nodejs';

// GET /api/auth/portal/start
// 发起体系账号 SSO：生成 state 存 cookie，跳到认证服务授权页
export async function GET(req: NextRequest) {
  const config = getSsoConfig();
  if (!config) {
    return NextResponse.json(
      { success: false, error: 'SSO 未配置（AUTH_BASE_URL / CLIENT_ID / CLIENT_LZTI_SECRET / LZTI_REDIRECT_URI / JWT_ISSUER）' },
      { status: 500 }
    );
  }

  const state = randomBytes(16).toString('hex');
  const authorizeUrl = new URL(`${config.authBase}/oauth/authorize`);
  authorizeUrl.searchParams.set('client_id', config.clientId);
  authorizeUrl.searchParams.set('redirect_uri', config.redirectUri);
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
