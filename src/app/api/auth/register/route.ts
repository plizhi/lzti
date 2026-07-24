import { NextRequest } from 'next/server';
import { register } from '@/lib/services/auth.service';
import { apiSuccess } from '@/lib/api/handler';
import { ApiError } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await register(body);
    return apiSuccess(result, 201);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiSuccess({ error: error.message } as any, error.status as any);
    }
    console.error('Register error:', error);
    return apiSuccess({ error: '注册失败' } as any, 500);
  }
}
