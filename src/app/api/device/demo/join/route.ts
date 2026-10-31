import { NextRequest } from 'next/server';
import { apiSuccess, ApiError, parseJsonBody } from '@/lib/api/response';
import { withDeviceAuth } from '@/lib/device-auth';
import { requireDemoDevice } from '@/lib/demo';
import { createDemoJoinCode } from '@/lib/services/demo-join.service';

/**
 * POST /api/device/demo/join
 *
 * 演示专用：机器做完一份卷后，向服务端要「这一场还缺哪些角色 + **一个**加入码」。
 *
 * body:
 * - sessionId  必填，这场演示的测评会话
 *
 * 返回：
 * - code       加入码（12 位）
 * - url        可直接生成二维码的完整链接（家长转发这个）
 * - path       相对路径（服务端拼绝对地址用）
 * - missingRoles 这一场还缺的角色（含文案与题量，设备可以直接显示）
 *
 * 同一个 session 反复调用会复用同一个码（除非已过 24 小时），
 * 免得设备刷新一次二维码就变一次。
 */
export const POST = withDeviceAuth(async (request: NextRequest, device) => {
  await requireDemoDevice(device.userId);

  const body = await parseJsonBody<{ sessionId?: unknown }>(request);
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!sessionId) {
    throw new ApiError('请提供 session ID', 400);
  }

  const result = await createDemoJoinCode(device.userId, sessionId);

  // 绝对地址：优先用 DEMO_JOIN_BASE_URL（反代后 request.url 的 origin 可能是内网地址），
  // 没配就用请求自身的 origin。
  const base = (
    process.env.DEMO_JOIN_BASE_URL?.trim() ||
    new URL(request.url).origin
  ).replace(/\/+$/, '');

  return apiSuccess(
    {
      ...result,
      url: `${base}${result.path}`,
    },
    201
  );
});
