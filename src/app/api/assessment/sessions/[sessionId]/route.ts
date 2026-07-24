import { NextRequest } from 'next/server';
import { getSession } from '@/lib/services/assessment.service';
import { withAuth, apiSuccess } from '@/lib/api/handler';

export const GET = withAuth(async (request, context) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const sessionIdIndex = pathParts.indexOf('sessions') + 1;
  const sessionId = pathParts[sessionIdIndex];

  const session = await getSession(sessionId, context.user.id);
  return apiSuccess(session);
});
