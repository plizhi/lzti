/**
 * 有效期口径统一（演示链路，2026-10-31 朋大大拍板）
 *
 * 背景：
 *   演示时所有分享链接（报告分享码、参与批次码）一律 24 小时有效。
 *   之前的服务端与客户端都是「按天」传参（报告 7 天、参与码 2 天），
 *   演示时报告不会及时失效，不符合「一次性临时链接」的预期。
 *
 * 这里统一按【小时】计算，同时保留对旧参数 expiresInDays 的兼容：
 *   - 新客户端传 expiresInHours → 直接用
 *   - 旧客户端传 expiresInDays  → 折算成小时（×24）
 *   - 都没传                      → 用调用方给的默认值
 *
 * ⚠️ 口径边界（2026-11-01 05:40 修正）：
 *   **网页端既有接口的默认值保持原样**（参与码 48h=2 天、报告码 168h=7 天），
 *   不做「全局改成 24 小时」的静默行为变更 —— 那会影响已有真实用户的分享链接。
 *   演示链路的 24 小时，由演示专用接口显式传 expiresInHours=24 实现。
 */

/**
 * 解析最终的有效期（小时）。
 *
 * @param expiresInHours 新参数：小时数
 * @param expiresInDays  旧参数：天数（兼容旧客户端）
 * @param defaultHours   调用方默认值（单位：小时）
 */
export function resolveExpiryHours(
  expiresInHours: unknown,
  expiresInDays: unknown,
  defaultHours: number
): number {
  const hours = toPositiveNumber(expiresInHours);
  if (hours !== null) return hours;

  const days = toPositiveNumber(expiresInDays);
  if (days !== null) return days * 24;

  return defaultHours;
}

function toPositiveNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value <= 0) return null;
  return value;
}

/** 演示链路的标准有效期：24 小时 */
export const DEMO_EXPIRY_HOURS = 24;

/** 按小时算到期时刻 */
export function expiresAtIn(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
