import { NextRequest } from 'next/server';
import { submitAttempt } from '@/lib/services/assessment.service';
import { withAuth, apiSuccess } from '@/lib/api/handler';

export const POST = withAuth(async (request, context) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const sessionIdIndex = pathParts.indexOf('sessions') + 1;
  const sessionId = pathParts[sessionIdIndex];

  const body = await request.json();
  const result = await submitAttempt(sessionId, context.user.id, {
    questionnaireType: body.questionnaireType,
    answers: body.answers,
  });
  return apiSuccess(result, 201);
});
