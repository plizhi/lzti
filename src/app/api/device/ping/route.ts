import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api/response';
import { withDeviceAuth } from '@/lib/device-auth';

/**
 * GET /api/device/ping
 * 心跳：设备确认自己还活着，服务端顺带刷新 lastSeenAt。
 */
export const GET = withDeviceAuth(async (request: NextRequest, device) => {
  return apiSuccess({
    ok: true,
    deviceId: device.deviceId,
    deviceName: device.deviceName,
    userId: device.userId,
    serverTime: new Date().toISOString(),
  });
});
