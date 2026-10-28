import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { getSharedReport, revokeReportShare } from '@/lib/services/report-share.service';
import { ApiError, apiError } from '@/lib/api/response';

// 获取分享报告（公开接口，无需认证）
//
// shareCode 从路由参数取。
// 原来用 pathParts.indexOf('report') + 2 手算下标，但路径是
// /api/share/report/[shareCode] —— 'report' 出现两次，indexOf 找到的是
// /api/share/report 那个，算出来的 shareCode 恒为 undefined，
// 查库必然抛异常（接口一直是坏的）。改用路由参数。
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareCode: string }> }
) {
  try {
    const { shareCode } = await params;

    const result = await getSharedReport(shareCode);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status);
    }
    console.error('Get shared report error:', error);
    return apiError('获取分享报告失败', 500);
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
