import { NextRequest } from 'next/server';
import { submitAttempt } from '@/lib/services/assessment.service';
import { withAuth, apiSuccess } from '@/lib/api/handler';

export const POST = withAuth(async (request, context) => {
  const sessionId = request.url.split('/').pop()!;
  const body = await request.json();
  const result = await submitAttempt(sessionId, context.user.id, {
    questionnaireType: body.questionnaireType,
    answers: body.answers,
  });
  return apiSuccess(result, 201);
});
