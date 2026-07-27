import { NextRequest } from 'next/server';
import { activateSlotAndCreatePendingUser, completeRegistration } from '@/lib/services/auth.service';
import { apiSuccess } from '@/lib/api/handler';
import { ApiError } from '@/lib/api/response';

// 第一步：激活 Slot 并创建预账户（通过分享链接打开注册页时调用）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { slotCode, childName } = body;

    if (!slotCode) {
      return apiSuccess({ error: '请提供邀请码' }, 400);
    }

    const result = await activateSlotAndCreatePendingUser(slotCode, childName);

    return apiSuccess({
      userId: result.user?.id,
      hasAccount: !!result.user,
      slot: {
        code: result.slot.code,
        type: result.slot.type,
        expiresAt: result.slot.expiresAt,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiSuccess({ error: error.message }, error.status as any);
    }
    console.error('Activate slot error:', error);
    return apiSuccess({ error: '激活失败' }, 500);
  }
}

// 第二步：完成注册（提交手机号+密码时调用）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, phone, password, child } = body;

    if (!userId || !phone || !password) {
      return apiSuccess({ error: '请填写完整信息' }, 400);
    }

    const result = await completeRegistration(userId, phone, password, child);

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiSuccess({ error: error.message }, error.status as any);
    }
    console.error('Register error:', error);
    return apiSuccess({ error: '注册失败' }, 500);
  }
}
