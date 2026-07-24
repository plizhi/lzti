import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth.service';
import { withAuth, apiSuccess } from '@/lib/api/handler';

export const GET = withAuth(async (request, context) => {
  const user = await getCurrentUser(context.user.id);
  return apiSuccess(user);
});
