import { NextRequest } from 'next/server';
import { createSession } from '@/lib/services/assessment.service';
import { withAuth, apiSuccess } from '@/lib/api/handler';

export const POST = withAuth(async (request, context) => {
  const body = await request.json();
  const session = await createSession(context.user.id, body);
  return apiSuccess(session, 201);
});
