import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth/middleware';
import { ApiError, apiSuccess } from '@/lib/api/response';
import { addRateLimitHeaders, rateLimits } from './ratelimit';

type ApiHandler<T = unknown, P = Record<string, string | string[]>> = (
  request: NextRequest,
  context: {
    user: { id: string; phone: string | null; role: string; name: string | null };
    params: Promise<P>;
  }
) => Promise<NextResponse<T>>;

/**
 * 包装需要登录的 API handler。
 *
 * 会把 Next 传入的路由 context（params）透传给 handler，
 * 动态路由才能拿到路径参数（如 /api/children/[id] 的 id）。
 */
export function withAuth<T = unknown, P = Record<string, string | string[]>>(
  handler: ApiHandler<T, P>
) {
  return async (
    request: NextRequest,
    routeContext?: { params?: Promise<P> }
  ) => {
    try {
      const context = await authMiddleware(request);
      if (!context) {
        return NextResponse.json(
          { success: false, error: '未登录或登录已过期' },
          { status: 401 }
        );
      }
      const params = (routeContext?.params ?? Promise.resolve({} as P)) as Promise<P>;
      return await handler(request, { ...context, params });
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: error.status }
        );
      }
      console.error('Unhandled error:', error);
      return NextResponse.json(
        { success: false, error: '服务器错误' },
        { status: 500 }
      );
    }
  };
}

// 重新导出限流相关的工具
export { addRateLimitHeaders, rateLimits, checkRateLimit } from './ratelimit';

// 重新导出 apiSuccess
export { apiSuccess };
