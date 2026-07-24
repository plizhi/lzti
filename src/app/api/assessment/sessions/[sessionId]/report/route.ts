import { NextRequest } from 'next/server';
import { getReport } from '@/lib/services/assessment.service';
import { withAuth, apiSuccess } from '@/lib/api/handler';

export const GET = withAuth(async (request, context) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const sessionIdIndex = pathParts.indexOf('sessions') + 1;
  const sessionId = pathParts[sessionIdIndex];

  const { searchParams } = new URL(request.url);
  const report = await getReport(sessionId, context.user.id, {
    type: searchParams.get('type') || undefined,
    view: searchParams.get('view') || undefined,
  });
  return apiSuccess(report);
});
