import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { createPairingCode } from '@/lib/device-auth';

/**
 * POST /api/device/pairing-code
 * 生成一次性配对码（6 位数字，10 分钟过期）。
 * 用户在手机/网页端看到这串码，手输到设备上完成配对。
 */
export const POST = withAuth(async (request: NextRequest, context) => {
  const { code, expiresAt } = await createPairingCode(context.user.id);
  return apiSuccess({ code, expiresAt });
});
