import { NextRequest } from 'next/server';
import { login } from '@/lib/services/auth.service';
import { apiSuccess } from '@/lib/api/handler';
import { ApiError } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await login(body);
    return apiSuccess(result, 200);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiSuccess({ error: error.message } as any, error.status as any);
    }
    console.error('Login error:', error);
    return apiSuccess({ error: '登录失败' } as any, 500);
  }
}
