import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/device/time
 *
 * 给固件做时间同步用。
 *
 * 为什么必须有这个接口：
 * ESP32 冷启动时系统时间是 1970-01-01，而 HTTPS 证书的 notBefore 是 2026 年之后，
 * mbedTLS 校验证书有效期会直接失败 → 连不上我们的服务端 → 设备完全用不了。
 * 虾哥固件也是先拿服务器时间再校时（它的 OTA 响应里有 timestamp/server_time 字段）。
 *
 * 这个接口是明文 HTTP，所以只返回时间，不返回任何业务数据。
 * 固件拿到后设置系统时间，之后的 HTTPS 请求才能通过证书校验。
 *
 * 响应：
 * { "success": true, "data": { "timestamp": 1793073000, "serverTime": "2026-10-28T12:40:00.000Z" } }
 *   timestamp  单位秒（UTC），可直接用于 time()
 *   serverTime  ISO 字符串，兼容虾哥 OTA 的字段名
 */
export const GET = async (req: NextRequest) => {
  const now = new Date();

  return NextResponse.json({
    success: true,
    data: {
      timestamp: Math.floor(now.getTime() / 1000),
      serverTime: now.toISOString(),
      timezoneOffset: -new Date().getTimezoneOffset() * 60 * 1000,
    },
  });
};
