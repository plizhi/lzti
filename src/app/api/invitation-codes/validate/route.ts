import { NextRequest } from 'next/server';
import { validateInvitationCode } from '@/lib/services/invitation.service';
import { apiSuccess, withAuth } from '@/lib/api/handler';

export const POST = withAuth(async (request) => {
  const body = await request.json();
  const { code } = body;

  if (!code || typeof code !== 'string') {
    return apiSuccess({ error: '请提供邀请码' } as any, 400);
  }

  const result = await validateInvitationCode(code);

  if (!result.valid) {
    return apiSuccess({ valid: false, error: result.error });
  }

  return apiSuccess({
    valid: true,
    invitation: {
      id: result.invitation!.id,
      code: result.invitation!.code,
      expiresAt: result.invitation!.expiresAt,
      maxUses: result.invitation!.maxUses,
      usedCount: result.invitation!.usedCount,
    },
  });
});
