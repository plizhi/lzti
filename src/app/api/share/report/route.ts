import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { createReportShare } from '@/lib/services/report-share.service';
import { resolveExpiryHours } from '@/lib/services/expiry';

// 创建报告分享
export const POST = withAuth(async (request, context) => {
  const body = await request.json();
  const { attemptId, expiresInHours, expiresInDays } = body;

  if (!attemptId) {
    throw new Error('请提供报告 ID');
  }

  // 有效期统一按【小时】算（src/lib/services/expiry.ts）。
  // 默认 168 小时 = 原来的 7 天，保持网页端既有行为不变；
  // 演示链路的 24 小时由演示接口显式传 expiresInHours=24，不在这里全局改。
  // 兼容旧客户端：仍传 expiresInDays 就按天折算（×24）。
  const hours = resolveExpiryHours(expiresInHours, expiresInDays, 168);

  const result = await createReportShare(
    context.user.id,
    attemptId,
    hours
  );

  return apiSuccess(result, 201);
});
