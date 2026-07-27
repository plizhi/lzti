import { NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

// 简单内存限流器（适用于单实例部署）
// 生产环境可替换为 @upstash/ratelimit + Redis
class MemoryRateLimit {
  private cache = new Map<string, { count: number; resetAt: number }>();

  check(identifier: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const key = identifier;
    const record = this.cache.get(key);

    if (!record || now > record.resetAt) {
      const resetAt = now + config.windowMs;
      this.cache.set(key, { count: 1, resetAt });
      return { success: true, remaining: config.maxRequests - 1, resetAt };
    }

    if (record.count >= config.maxRequests) {
      return { success: false, remaining: 0, resetAt: record.resetAt };
    }

    record.count++;
    return { success: true, remaining: config.maxRequests - record.count, resetAt: record.resetAt };
  }
}

// 全局限流器实例
const globalLimiter = new MemoryRateLimit();

// 获取请求标识符（IP 或用户 ID）
function getIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'anonymous';
}

// 检查限流，返回结果供调用者处理
export function checkRateLimit(
  config: RateLimitConfig = { windowMs: 10000, maxRequests: 30 }
) {
  return async (request: Request): Promise<RateLimitResult> => {
    const identifier = getIdentifier(request);
    return globalLimiter.check(identifier, config);
  };
}

// 为响应添加限流头
export function addRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  resetAt: number
): NextResponse {
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
  return response;
}

// 预定义的限流配置
export const rateLimits = {
  public: { windowMs: 10000, maxRequests: 10 },
  authenticated: { windowMs: 10000, maxRequests: 30 },
  sensitive: { windowMs: 60000, maxRequests: 5 },
  upload: { windowMs: 60000, maxRequests: 5 },
};
