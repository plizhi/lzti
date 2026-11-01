/**
 * 演示链路 L3：免登录作答凭证（role token）
 *
 * 背景（2026-11-01 朋大大拍板）：
 *   老师/学生扫码后**不注册账号**，用「加入码」直接作答。
 *   加入码是「一桌人共享」的凭证（二维码里只有一个码），
 *   光有加入码不能提交 —— 必须先在落地页领一个**角色**，
 *   领到的角色凭证（role token）里写死了角色（student / teacher），
 *   提交时服务端只认 token 里的角色，客户端改参数也串不了卷。
 *
 * 性质：
 *   - 无状态（JWT），服务端不落库，改不了也伪造不了
 *   - 24 小时过期（跟加入码同口径）
 *   - 只解决「你是谁、你要填哪份卷」，**不代表名额**：
 *     名额由角色槽位（Slot.usedAt）在提交那一刻原子占用，先到先得
 */

import jwt from 'jsonwebtoken';
import { ApiError } from '@/lib/api/response';

const DEFAULT_SECRET = 'lzti-dev-secret-change-in-production';

/** 取签名密钥（每次调用都读 env，方便测试里改） */
function secret(): string {
  return process.env.JWT_SECRET ?? DEFAULT_SECRET;
}

/** 生产环境不允许用默认密钥（与 auth/jwt.ts 同一把尺子） */
function assertProductionSecret() {
  if (process.env.NODE_ENV !== 'production') return;
  const fromEnv = process.env.JWT_SECRET;
  if (!fromEnv || fromEnv === DEFAULT_SECRET) {
    throw new Error('FATAL: JWT_SECRET must be set to a non-default value in production!');
  }
}

export type DemoJoinRole = 'parent' | 'student' | 'teacher';

export interface DemoRoleTokenPayload {
  /** 加入码（二维码里的那一个） */
  code: string;
  /** 角色槽位 id（提交时原子占用名额的就是它） */
  slotId: string;
  /** 测评会话 id —— attempt 必须挂到这一场下面 */
  sessionId: string;
  /** 孩子 id */
  childId: string;
  /** 学段 id */
  stageId: string;
  /** 角色（写死在 token 里，客户端改不了） */
  role: DemoJoinRole;
  /** 作答人姓名（可选） */
  name?: string;
}

/** 签发角色凭证 */
export function signDemoRoleToken(
  payload: DemoRoleTokenPayload,
  expiresInHours: number
): string {
  assertProductionSecret();
  return jwt.sign({ ...payload }, secret(), { expiresIn: `${expiresInHours}h` });
}

/**
 * 校验角色凭证。
 * 过期 / 伪造 / 签名不对，一律当「凭证无效」，让扫码的人重新扫。
 */
export function verifyDemoRoleToken(token: string): DemoRoleTokenPayload {
  assertProductionSecret();
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, secret());
  } catch {
    throw new ApiError('作答凭证无效或已过期，请重新扫码', 401);
  }

  if (!decoded || typeof decoded !== 'object') {
    throw new ApiError('作答凭证无效，请重新扫码', 401);
  }

  const p = decoded as Partial<DemoRoleTokenPayload>;
  if (
    typeof p.code !== 'string' ||
    typeof p.slotId !== 'string' ||
    typeof p.sessionId !== 'string' ||
    typeof p.childId !== 'string' ||
    typeof p.stageId !== 'string' ||
    (p.role !== 'parent' && p.role !== 'student' && p.role !== 'teacher')
  ) {
    throw new ApiError('作答凭证无效，请重新扫码', 401);
  }

  return {
    code: p.code,
    slotId: p.slotId,
    sessionId: p.sessionId,
    childId: p.childId,
    stageId: p.stageId,
    role: p.role,
    name: typeof p.name === 'string' ? p.name : undefined,
  };
}
