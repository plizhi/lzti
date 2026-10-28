import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { prisma } from '@/lib/db';

/**
 * GET /api/devices
 * 当前用户的所有设备（不返回任何令牌信息）。
 */
export const GET = withAuth(async (request: NextRequest, context) => {
  const devices = await prisma.device.findMany({
    where: { userId: context.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      deviceKey: true,
      status: true,
      lastSeenAt: true,
      createdAt: true,
      _count: { select: { tokens: true } },
    },
  });

  return apiSuccess(
    devices.map((device) => ({
      id: device.id,
      name: device.name,
      deviceKey: device.deviceKey,
      status: device.status,
      lastSeenAt: device.lastSeenAt,
      createdAt: device.createdAt,
      tokenCount: device._count.tokens,
    }))
  );
});
