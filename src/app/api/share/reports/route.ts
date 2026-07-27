import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { listUserReportShares } from '@/lib/services/report-share.service';

// 列出用户的报告分享
export const GET = withAuth(async (request, context) => {
  const result = await listUserReportShares(context.user.id);
  return apiSuccess(result);
});
