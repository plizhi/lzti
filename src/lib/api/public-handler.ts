import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiError } from './response';

/**
 * 包装**不需要登录**的 API handler。
 *
 * 与 withAuth（要用户 JWT）、withDeviceAuth（要设备令牌）平行：
 * 演示链路的落地页是「免登录」的，凭证是加入码本身。
 *
 * 用法与 withAuth 一样，路由 context（params）会透传进去。
 */
export function withPublicHandler<T = unknown, P = Record<string, string | string[]>>(
  handler: (
    request: NextRequest,
    context: { params: Promise<P> }
  ) => Promise<NextResponse<T>>
) {
  return async (
    request: NextRequest,
    routeContext?: { params?: Promise<P> }
  ) => {
    try {
      const params = (routeContext?.params ?? Promise.resolve({} as P)) as Promise<P>;
      return await handler(request, { params });
    } catch (error) {
      if (error instanceof ApiError) {
        return apiError(error.message, error.status) as NextResponse<T>;
      }
      console.error('Unhandled public API error:', error);
      return apiError('服务器错误', 500) as NextResponse<T>;
    }
  };
}
