import { NextRequest, NextResponse } from 'next/server';

export function apiSuccess(data: unknown, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 安全解析 JSON 请求体
 * @throws ApiError 当 JSON 格式错误时
 */
export async function parseJsonBody<T>(request: NextRequest): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    throw new ApiError('请求格式错误，请发送有效的 JSON', 400);
  }
}
