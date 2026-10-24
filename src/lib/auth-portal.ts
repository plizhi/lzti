import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/api/response';
import { createSystemSlot } from '@/lib/services/share.service';

const AUTH_BASE     = process.env.AUTH_BASE_URL;
const CLIENT_ID     = process.env.CLIENT_ID! || 'lzti-dev';
const CLIENT_SECRET = process.env.CLIENT_LZTI_SECRET!;
const REDIRECT_URI  = process.env.LZTI_REDIRECT_URI!;
const JWT_ISSUER    = process.env.JWT_ISSUER!;

export { AUTH_BASE, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, JWT_ISSUER };

// 惰性创建：模块加载时若 AUTH_BASE_URL 缺失就 new URL 会直接抛错，
// 导致任何 import 本模块的地方（测试、CI）都崩
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function requireAuthBase(): string {
  if (!AUTH_BASE) throw new Error('AUTH_BASE_URL 未配置');
  return AUTH_BASE;
}
function getJwks() {
  if (!jwks) {
    // JWKS 远程公钥集，jose 自动缓存 + 按 kid 轮换
    jwks = createRemoteJWKSet(new URL(`${requireAuthBase()}/.well-known/jwks.json`));
  }
  return jwks;
}

export interface PortalPayload extends JWTPayload {
  sub: string;
  portal_user_id: string;
  client_id: string;
}

// ---------- 手机号归一化 ----------
// auth-dev 统一存 +86，本地库存 11 位。匹配前必须归一化，
// 否则同一个自然人会被当成两个账户。
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('86')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  return digits || null;
}

// ---------- token 验签（纵深防御） ----------
// audience 必须锁定本 client：认证服务对所有 client 用同一个 issuer，
// 不校验 audience 的话，别的应用（望杏成林）的 token 也能在这里通过验签。
export async function verifyPortalToken(accessToken: string): Promise<PortalPayload> {
  const { payload } = await jwtVerify(accessToken, getJwks(), {
    issuer: JWT_ISSUER,
    audience: CLIENT_ID,
  });
  return payload as PortalPayload;
}

// ---------- code 换 token ----------
export async function exchangeCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(`${requireAuthBase()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  return res.json();
}

// ---------- 获取 userinfo ----------
export async function fetchUserInfo(accessToken: string): Promise<{
  portal_user_id: string;
  phone: string | null;
  nickname: string | null;
}> {
  const res = await fetch(`${requireAuthBase()}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`userinfo failed: ${res.status}`);
  return res.json();
}

export interface BindResult {
  user: { id: string; phone: string | null; status: string };
  needsSetup: boolean;
}

// Prisma 唯一约束冲突（并发写入同一手机号/主体 ID）
function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: string }).code === 'P2002'
  );
}

// ---------- 绑定/创建本地用户 ----------
// 原则：账号打通只证明「是谁」，身份与时长一律以本地规则为准。
// 本地没有对应账户时，落到「预账户」状态，
// 走本地自己的注册流程（设密码 + 孩子信息）转正，不直接给正式身份。
export async function bindOrCreateUser(portal: {
  portal_user_id: string;
  phone: string | null;
  nickname: string | null;
}): Promise<BindResult> {
  const phone = normalizePhone(portal.phone);

  // 优先按 portalUserId 命中（已绑定过的老用户）
  if (portal.portal_user_id) {
    const byPortal = await prisma.user.findUnique({
      where: { portalUserId: portal.portal_user_id },
    });
    if (byPortal) {
      return { user: byPortal, needsSetup: byPortal.status !== 'ACTIVE' };
    }
  }

  // 按归一化手机号匹配存量用户 → 只补绑定，不动其身份
  if (phone) {
    const byPhone = await prisma.user.findUnique({
      where: { phone },
    });
    if (byPhone) {
      // 已绑到别的体系账号时不能静默改绑，否则两个账号会互相顶掉
      if (byPhone.portalUserId && byPhone.portalUserId !== portal.portal_user_id) {
        throw new ApiError('该手机号已绑定其他体系账号', 409);
      }
      const updated = await prisma.user.update({
        where: { id: byPhone.id },
        data: { portalUserId: portal.portal_user_id },
      });
      return { user: updated, needsSetup: updated.status !== 'ACTIVE' };
    }
  }

  // 全新用户 → 系统发放 slot，创建预账户（与邀请码路径同构）
  const { batch, slot } = await createSystemSlot();

  let user;
  try {
    user = await prisma.user.create({
      data: {
        status: 'PENDING',
        phone,
        name: portal.nickname || null,
        portalUserId: portal.portal_user_id,
        shareBatchId: batch.id,
      },
    });
  } catch (err) {
    // 并发首登（同一个人重复提交授权码）会撞 phone / portalUserId 唯一约束。
    // 这时账号其实已经建好了，回查一次即可，不该把用户挡在门外。
    if (isUniqueConstraintError(err)) {
      // 查找顺序与主路径一致：先按主体 ID，再按手机号
      const existing =
        (await prisma.user.findUnique({
          where: { portalUserId: portal.portal_user_id },
        })) ??
        (phone
          ? await prisma.user.findUnique({ where: { phone } })
          : null);
      if (existing) {
        await prisma.slot.update({
          where: { id: slot.id },
          data: { usedBy: existing.id, usedAt: new Date() },
        });
        return { user: existing, needsSetup: existing.status !== 'ACTIVE' };
      }
    }
    throw err;
  }

  await prisma.slot.update({
    where: { id: slot.id },
    data: { usedBy: user.id, usedAt: new Date() },
  });

  return { user, needsSetup: true };
}
