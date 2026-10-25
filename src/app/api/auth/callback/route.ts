export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import { ApiError } from '@/lib/api/response';
import {
  exchangeCode,
  fetchUserInfo,
  bindOrCreateUser,
  verifyPortalToken,
  getSsoConfig,
} from '@/lib/auth-portal';

// GET /api/auth/callback
// 体系账号 SSO 回调：校验 state → 换 token → 取 userinfo → 绑定/创建本地用户
// 本地会话用 Authorization header 传递（前端存 localStorage），
// 因此这里把 token 放进一次性 httpOnly cookie，由前端页换取后立即作废
export async function GET(request: NextRequest) {
  const url   = new URL(request.url);
  const code  = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const cookieState = request.cookies.get('oauth_state')?.value;

  const config = getSsoConfig();
  if (!config) {
    return NextResponse.json({ success: false, error: 'SSO 未配置' }, { status: 500 });
  }

  if (!code || !state || state !== cookieState) {
    return NextResponse.json({ success: false, error: 'invalid oauth state' }, { status: 400 });
  }

  try {
    // ① code 换 token
    const tokens = await exchangeCode(code);

    // ② 验签（纵深防御）
    const payload = await verifyPortalToken(tokens.access_token);

    // ③ 获取用户信息（phone 用于存量匹配）
    const userinfo = await fetchUserInfo(tokens.access_token);

    // token 与 userinfo 必须指向同一个主体，否则说明中间被换过
    if (payload.portal_user_id !== userinfo.portal_user_id) {
      return NextResponse.json({ success: false, error: 'token 与用户信息不匹配' }, { status: 401 });
    }

    // ④ 绑定或创建本地用户（身份以本地状态为准）
    const { user, needsSetup } = await bindOrCreateUser({
      portal_user_id: userinfo.portal_user_id,
      phone:   userinfo.phone,
      nickname: userinfo.nickname,
    });

    // ⑤ 签发本地会话
    const localToken = generateToken(user.id);

    // 反代后 request.url 的 origin 是内网地址（localhost:3010），
    // 跳转目标必须用对外域名
    // 需要补全注册的走 /sso/setup：那边也要用一次性 cookie 里的 userId，
    // 两个页面共用同一份一次性凭证，所以必须在这里二选一分流，
    // 否则后到的页面拿不到已被消费掉的凭证。
    const response = NextResponse.redirect(
      new URL(needsSetup ? '/sso/setup' : '/sso/complete', config.redirectUri)
    );

    response.cookies.set('lzti_sso_token', localToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      maxAge:   120,
      path:     '/api/auth/portal/exchange',
      sameSite: 'lax',
    });

    // 需要补全注册（设密码 + 孩子信息）时带上前置信息
    if (needsSetup) {
      response.cookies.set('lzti_sso_setup', JSON.stringify({
        userId: user.id,
        phone: user.phone,
      }), {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        maxAge:   120,
        path:     '/api/auth/portal/exchange',
        sameSite: 'lax',
      });
    }

    // 清除 state cookie
    response.cookies.delete('oauth_state');

    return response;
  } catch (err) {
    console.error('oauth callback error:', err);
    // 账号冲突（手机号已绑到别的体系账号）要说清楚，别一律报「认证失败」
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: 'authentication failed' }, { status: 401 });
  }
}
