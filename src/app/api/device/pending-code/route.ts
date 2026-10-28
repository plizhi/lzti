import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/api/response';

/**
 * GET /api/device/pending-code?deviceKey=<MAC>
 *
 * 固件用它「自己去取」配对码，这样设备端不需要键盘输入 6 位码：
 *   1. 用户在手机网页上生成配对码（POST /api/device/pairing-code）
 *   2. 设备用 MAC 作为 deviceKey 轮询本接口，拿到配对码
 *   3. 设备调 POST /api/device/pair 换成 deviceToken
 *
 * 返回的 code 是明文 6 位数字——这正是配对码的用途（一次性、10 分钟过期）。
 * 本接口不需要鉴权：deviceKey 由客户端自称，只有知道正确配对码才能完成配对，
 * 而配对码本身需要用户在手机上主动生成。
 *
 * 安全边界：
 * - 只能取到「未使用且未过期」的码，取过就不能再取（配对码一次性）
 * - 找不到就返回 404，固件继续轮询
 */
export const GET = async (req: NextRequest) => {
  const deviceKey = new URL(req.url).searchParams.get('deviceKey')?.trim();
  if (!deviceKey) {
    throw new ApiError('请提供 deviceKey', 400);
  }
  if (deviceKey.length > 64) {
    throw new ApiError('deviceKey 长度不能超过 64', 400);
  }

  const now = new Date();

  // 找最近一个还没被使用、也没过期的配对码。
  // 只认「还没被任何设备认领」的，或者「本来就是这台设备认领的」——
  // 否则设备 A 取走码之后，设备 B 还能取到同一个码并抢走绑定。
  const pending = await prisma.devicePairingCode.findFirst({
    where: {
      usedAt: null,
      expiresAt: { gt: now },
      OR: [{ deviceKey: null }, { deviceKey }],
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, code: true, expiresAt: true, deviceKey: true },
  });

  if (!pending) {
    return NextResponse.json(
      { success: false, error: '没有待配对的码' },
      { status: 404 }
    );
  }

  // 回填 deviceKey：这样配对码就跟这台设备绑定了，
  // 别的 deviceKey 来取同一个码时会被拒绝（见 claimDevice）
  await prisma.devicePairingCode.update({
    where: { id: pending.id },
    data: { deviceKey },
  });

  return NextResponse.json({
    success: true,
    data: {
      code: pending.code,
      expiresAt: pending.expiresAt,
    },
  });
};
