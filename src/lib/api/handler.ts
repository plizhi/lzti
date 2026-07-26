import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth/middleware';
import { ApiError } from '@/lib/api/response';

type ApiHandler<T = unknown> = (
  request: NextRequest,
  context: { user: { id: string; phone: string | null; role: string; name: string | null } }
) => Promise<NextResponse<T>>;

export function withAuth<T>(handler: ApiHandler<T>) {
  return async (request: NextRequest) => {
    try {
      const context = await authMiddleware(request);
      if (!context) {
        return NextResponse.json(
          { success: false, error: '未登录或登录已过期' },
          { status: 401 }
        );
      }
      return await handler(request, context);
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

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
