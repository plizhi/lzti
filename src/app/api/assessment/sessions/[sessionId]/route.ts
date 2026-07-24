import { NextRequest } from 'next/server';
import { getSession } from '@/lib/services/assessment.service';
import { withAuth, apiSuccess } from '@/lib/api/handler';

export const GET = withAuth(async (request, context) => {
  const sessionId = request.url.split('/').pop()!;
  const session = await getSession(sessionId, context.user.id);
  return apiSuccess(session);
});
