import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { createFeedback, listFeedbacks } from '@/lib/services/feedback.service';
import { ApiError } from '@/lib/api/response';

export const POST = withAuth(async (request: NextRequest, context) => {
  const body = await request.json();
  const { content, contact } = body;

  if (!content || content.trim().length < 5) {
    throw new ApiError('反馈内容至少5个字', 400);
  }

  const result = await createFeedback(context.user.id, {
    content: content.trim(),
    contact: contact?.trim(),
  });

  return apiSuccess(result, 201);
});

export const GET = withAuth(async (request: NextRequest, context) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const status = searchParams.get('status') || undefined;

  if (page < 1 || limit < 1 || limit > 100) {
    throw new ApiError('参数无效', 400);
  }

  const result = await listFeedbacks(context.user.id, {
    page,
    limit,
    status,
  });

  return apiSuccess(result);
});
