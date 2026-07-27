import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { createReportShare } from '@/lib/services/report-share.service';

// 创建报告分享
export const POST = withAuth(async (request, context) => {
  const body = await request.json();
  const { attemptId, expiresInDays } = body;

  if (!attemptId) {
    throw new Error('请提供报告 ID');
  }

  const result = await createReportShare(
    context.user.id,
    attemptId,
    expiresInDays ?? 7
  );

  return apiSuccess(result, 201);
});
