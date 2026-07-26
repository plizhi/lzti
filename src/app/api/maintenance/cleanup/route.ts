import { NextRequest } from 'next/server';
import { cleanupExpiredPendingAccounts } from '@/lib/services/cleanup.service';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { ApiError, apiError } from '@/lib/api/response';

// 清理过期的 PENDING 账户
// 应该是管理员操作或定时任务调用
export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    // 只有管理员可以调用此接口
    if (context.user.role !== 'ADMIN') {
      return apiError('需要管理员权限', 403);
    }

    const result = await cleanupExpiredPendingAccounts();

    return apiSuccess({
      message: `已清理 ${result.cleaned} 个过期账户`,
      cleaned: result.cleaned,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status);
    }
    console.error('Cleanup error:', error);
    return apiError('清理失败', 500);
  }
});
