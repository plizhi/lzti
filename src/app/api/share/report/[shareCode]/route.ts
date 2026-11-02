import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { getSharedReport, revokeReportShare } from '@/lib/services/report-share.service';
import { ApiError, apiError } from '@/lib/api/response';

/**
 * 分享报告访问的限流与审计（2026-11-02）。
 *
 * 为什么两档限流：
 *   分享码只有 8 位，猜中概率低，但**没有任何闸门**意味着可以批量试探/爬取。
 *   而如果一刀切按 IP 限死，演示现场会出事 ——
 *   一屋子家长在同一 WiFi 下 = 同一个出口 IP，几十人同时打开报告会互相挤掉。
 *   所以：
 *     - 命中（200）→ 宽松（60 次/分钟/IP），保证一家人/一个班能一起看；
 *     - 未命中（404/410）→ 严格（20 次/分钟/IP），枚举会被卡住。
 *
 * 为什么审计日志里记码的哈希而不是码本身：
 *   码就是访问凭证，写进日志等于把凭证抄了一份到日志文件里。
 *   记 sha256 前 8 位就够与库里记录对账（对账时对库里的码做同样的哈希），
 *   又不泄露凭证本身。
 */
const OK_LIMIT = { windowMs: 60_000, maxRequests: 60 };
const MISS_LIMIT = { windowMs: 60_000, maxRequests: 20 };

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return request.headers.get('x-forwarded-host') ? 'unknown-ip' : 'local';
}

/** 固定窗口计数（进程内）。dev/演示环境单实例够用；多实例部署需换成共享存储。 */
function hit(bucket: string, limit: { windowMs: number; maxRequests: number }): boolean {
  const now = Date.now();
  const cur = buckets.get(bucket);
  if (!cur || now > cur.resetAt) {
    buckets.set(bucket, { count: 1, resetAt: now + limit.windowMs });
    return true;
  }
  if (cur.count >= limit.maxRequests) return false;
  cur.count++;
  return true;
}

function audit(shareCode: string, request: NextRequest, outcome: string, status: number) {
  const codeHash = createHash('sha256').update(shareCode).digest('hex').slice(0, 8);
  const ua = (request.headers.get('user-agent') || '').slice(0, 120);
  console.info(
    `[share-audit] code=${codeHash} ip=${clientIp(request)} ua=${ua} outcome=${outcome} status=${status} ts=${new Date().toISOString()}`
  );
}

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
  const { shareCode } = await params;

  try {
    const result = await getSharedReport(shareCode);

    if (!hit(`ok:${clientIp(request)}`, OK_LIMIT)) {
      audit(shareCode, request, 'rate-limited-ok', 429);
      return apiError('访问过于频繁，请稍后再试', 429);
    }

    audit(shareCode, request, 'ok', 200);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof ApiError) {
      // 未命中（404 不存在 / 410 已过期）→ 走严格限流，挡住枚举
      if (!hit(`miss:${clientIp(request)}`, MISS_LIMIT)) {
        audit(shareCode, request, 'rate-limited-miss', 429);
        return apiError('尝试过于频繁，请稍后再试', 429);
      }
      audit(shareCode, request, error.status === 410 ? 'expired' : 'not-found', error.status);
      return apiError(error.message, error.status);
    }
    console.error('Get shared report error:', error);
    audit(shareCode, request, 'error', 500);
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
