import { NextRequest } from 'next/server';
import { apiSuccess, apiError, ApiError, parseJsonBody } from '@/lib/api/response';
import { claimDevice } from '@/lib/device-auth';

interface PairBody {
  code?: unknown;
  deviceKey?: unknown;
  name?: unknown;
}

/**
 * POST /api/device/pair
 * 用配对码换设备令牌。此接口不需要用户 JWT —— 配对码本身就是凭证。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody<PairBody>(request);

    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const deviceKey = typeof body.deviceKey === 'string' ? body.deviceKey.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;

    if (!code) {
      throw new ApiError('配对码必填', 400);
    }
    if (!deviceKey) {
      throw new ApiError('deviceKey 必填', 400);
    }
    if (deviceKey.length > 64) {
      throw new ApiError('deviceKey 长度不能超过 64', 400);
    }

    const result = await claimDevice({ code, deviceKey, name });

    return apiSuccess(result, 201);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status);
    }
    console.error('Device pair error:', error);
    return apiError('配对失败', 500);
  }
}
