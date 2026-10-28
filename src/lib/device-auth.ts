/**
 * 设备接入鉴权（ESP32 答题手柄）
 *
 * 设计要点：
 * 1. 设备令牌（deviceToken）明文只在签发时返回一次，服务端只存 sha256 摘要。
 * 2. 配对码由用户在手机/网页端生成，10 分钟过期，一次性使用。
 * 3. 同一 deviceKey 只能绑定一个用户，换绑必须走「原用户删除设备」，不偷偷改绑。
 * 4. 用户 JWT 与设备令牌是两条独立的鉴权线：
 *    - 用户 JWT：管「我的设备列表」「删除设备」这类管理动作
 *    - 设备令牌：管「取题目」「答题」「提交」这类答题动作
 */

import { createHash, randomBytes, randomInt } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ApiError, apiError } from '@/lib/api/response';

/** 配对码有效期：10 分钟 */
export const PAIRING_CODE_TTL_MS = 10 * 60 * 1000;

/** 设备令牌有效期：365 天 */
export const DEVICE_TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;

/** 生成 6 位数字配对码 */
export function generatePairingCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** sha256 hex 摘要 */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * 为用户创建配对码。
 * - 10 分钟后过期
 * - 该用户此前所有未使用的配对码立即作废（同一时刻只有一个有效码）
 */
export async function createPairingCode(
  userId: string
): Promise<{ code: string; expiresAt: Date }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PAIRING_CODE_TTL_MS);

  // 作废旧的未使用配对码
  await prisma.devicePairingCode.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: now },
  });

  // code 上有唯一约束，撞了就重试（概率极低，但必须处理）
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generatePairingCode();
    try {
      await prisma.devicePairingCode.create({
        data: { userId, code, expiresAt },
      });
      return { code, expiresAt };
    } catch (err) {
      const e = err as { code?: string };
      if (e.code === 'P2002') continue;
      throw err;
    }
  }

  throw new ApiError('配对码生成失败，请重试', 500);
}

export interface ClaimDeviceInput {
  code: string;
  deviceKey: string;
  name?: string;
}

export interface ClaimDeviceResult {
  deviceId: string;
  deviceToken: string;
}

/**
 * 用配对码把设备认领到用户名下，并签发设备令牌。
 * 明文令牌只在本次返回值里出现，服务端只保存 sha256 摘要。
 */
export async function claimDevice(input: ClaimDeviceInput): Promise<ClaimDeviceResult> {
  const { code, deviceKey, name } = input;

  if (!code || !/^\d{6}$/.test(code)) {
    throw new ApiError('配对码格式错误', 400);
  }
  if (!deviceKey || deviceKey.length > 64) {
    throw new ApiError('deviceKey 必填且长度不超过 64', 400);
  }

  const pairing = await prisma.devicePairingCode.findUnique({
    where: { code },
  });

  if (!pairing) {
    throw new ApiError('配对码无效', 400);
  }
  if (pairing.usedAt) {
    // deviceKey 有值 = 已经被某台设备用掉了；没值 = 被更新的配对码顶掉了
    throw new ApiError(
      pairing.deviceKey ? '配对码已被使用' : '配对码已失效，请重新获取',
      400
    );
  }
  if (pairing.expiresAt.getTime() <= Date.now()) {
    throw new ApiError('配对码已过期', 400);
  }

  // 配对码一次性使用
  await prisma.devicePairingCode.update({
    where: { id: pairing.id },
    data: { usedAt: new Date(), deviceKey },
  });

  const existing = await prisma.device.findUnique({
    where: { deviceKey },
  });

  let deviceId: string;

  if (existing) {
    if (existing.userId !== pairing.userId) {
      // 已绑定别的用户：不偷偷改绑，让用户先在原账号里删除设备
      throw new ApiError('该设备已绑定其他账号，请先在原账号中解绑', 409);
    }
    // 同一用户重复配对：复用设备，重新激活
    const updated = await prisma.device.update({
      where: { id: existing.id },
      data: {
        name: name && name.trim() ? name.trim().slice(0, 60) : existing.name,
        status: 'active',
      },
    });
    deviceId = updated.id;
  } else {
    const created = await prisma.device.create({
      data: {
        userId: pairing.userId,
        name: name && name.trim() ? name.trim().slice(0, 60) : '测评手柄',
        deviceKey,
        status: 'active',
      },
    });
    deviceId = created.id;
  }

  // 签发新令牌（旧令牌保留，用户可在设备管理里一键吊销）
  const deviceToken = randomBytes(32).toString('hex');
  await prisma.deviceToken.create({
    data: {
      deviceId,
      tokenHash: sha256Hex(deviceToken),
      expiresAt: new Date(Date.now() + DEVICE_TOKEN_TTL_MS),
    },
  });

  return { deviceId, deviceToken };
}

export interface DeviceIdentity {
  deviceId: string;
  userId: string;
  deviceName: string;
}

/**
 * 校验设备令牌。查不到 / 已吊销 / 设备被禁用都返回 null。
 */
export async function verifyDeviceToken(req: NextRequest): Promise<DeviceIdentity | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const rawToken = authHeader.slice(7).trim();
  if (!rawToken) return null;

  const tokenHash = sha256Hex(rawToken);
  const now = new Date();

  const record = await prisma.deviceToken.findUnique({
    where: { tokenHash },
    include: { device: true },
  });

  if (!record) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt && record.expiresAt.getTime() <= now.getTime()) return null;
  if (record.device.status !== 'active') return null;

  // 顺手更新最后活跃时间（失败不影响主流程）
  try {
    await prisma.device.update({
      where: { id: record.deviceId },
      data: { lastSeenAt: now },
    });
  } catch (err) {
    console.error('[device-auth] 更新 lastSeenAt 失败:', err);
  }

  return {
    deviceId: record.deviceId,
    userId: record.device.userId,
    deviceName: record.device.name,
  };
}

/**
 * 校验设备令牌，失败抛 401。
 */
export async function requireDevice(req: NextRequest): Promise<DeviceIdentity> {
  const identity = await verifyDeviceToken(req);
  if (!identity) {
    throw new ApiError('设备未授权', 401);
  }
  return identity;
}

/**
 * 包装需要设备令牌的 API handler。
 *
 * 与用户侧的 `withAuth` 平行：鉴权源是设备令牌而不是用户 JWT。
 */
export function withDeviceAuth(
  handler: (request: NextRequest, device: DeviceIdentity) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const device = await requireDevice(request);
      return await handler(request, device);
    } catch (error) {
      if (error instanceof ApiError) {
        return apiError(error.message, error.status);
      }
      console.error('Unhandled device API error:', error);
      return apiError('服务器错误', 500);
    }
  };
}
