import { NextRequest } from 'next/server';
import { validateSlotCode } from '@/lib/services/invitation.service';
import { apiSuccess } from '@/lib/api/handler';

// 验证邀请码（支持新旧两种格式）
// 新格式：Slot code
// 旧格式：UserInviteCode（兼容）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return apiSuccess({ error: '请提供邀请码' }, 400);
    }

    // 先尝试新格式（Slot）
    const slotResult = await validateSlotCode(code);
    if (slotResult.valid) {
      return apiSuccess({
        valid: true,
        type: 'slot',
        invitation: {
          id: slotResult.invitation!.id,
          code: slotResult.invitation!.code,
          batchId: slotResult.invitation!.batchId,
          type: slotResult.invitation!.type,
          expiresAt: slotResult.invitation!.expiresAt,
        },
      });
    }

    return apiSuccess({ valid: false, error: slotResult.error });
  } catch (error) {
    console.error('Validate invitation code error:', error);
    return apiSuccess({ error: '验证失败' }, 500);
  }
}
