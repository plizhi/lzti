import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { createPairingCode } from '@/lib/device-auth';

/**
 * POST /api/device/pairing-code
 * 家长在手机上点「添加设备」→ 生成 6 位配对码 → 设备自己去取码完成配对。
 *
 * 设备端不需要键盘输入配对码（见 GET /api/device/pending-code），
 * 所以这个接口只负责把码显示给家长看。
 */
export const POST = withAuth(async (request: NextRequest, context) => {
  const { code, expiresAt } = await createPairingCode(context.user.id);
  return apiSuccess({ code, expiresAt });
});
