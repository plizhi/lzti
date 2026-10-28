import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { ApiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';

/**
 * DELETE /api/devices/[id]
 * 吊销设备：设备置为 revoked，它的全部令牌同时吊销。
 * 只能删自己的设备。
 */
export const DELETE = withAuth(async (request: NextRequest, context) => {
  const params = await context.params;
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const device = await prisma.device.findUnique({ where: { id } });
  if (!device) {
    throw new ApiError('设备不存在', 404);
  }
  if (device.userId !== context.user.id) {
    throw new ApiError('无权操作该设备', 403);
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.device.update({
      where: { id: device.id },
      data: { status: 'revoked' },
    }),
    prisma.deviceToken.updateMany({
      where: { deviceId: device.id, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);

  return apiSuccess({ revoked: true, deviceId: device.id });
});
