import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { getSharedReport, revokeReportShare } from '@/lib/services/report-share.service';
import { ApiError } from '@/lib/api/response';

// 获取分享报告（公开接口，无需认证）
export async function GET(request: NextRequest) {
  try {
    // 从 URL 提取 shareCode
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const shareCodeIndex = pathParts.indexOf('report') + 2; // report 后面是 shareCode
    const shareCode = pathParts[shareCodeIndex];

    const result = await getSharedReport(shareCode);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiSuccess({ error: error.message }, error.status as any);
    }
    console.error('Get shared report error:', error);
    return apiSuccess({ error: '获取分享报告失败' }, 500);
  }
}

// 撤销分享（需要认证）
export const DELETE = withAuth(async (request, context) => {
  const { searchParams } = new URL(request.url);
  const shareCode = searchParams.get('code');

  if (!shareCode) {
    throw new Error('请提供分享码');
  }

  await revokeReportShare(shareCode, context.user.id);
  return apiSuccess({ revoked: true });
});
