import { prisma } from '@/lib/db';

// 会员权益类型
export type MembershipFeature =
  | 'trend_comparison'      // 趋势对比
  | 'quarterly_summary'     // 季度成长摘要
  | 'share_poster'          // 高级分享海报
  | 'multi_child_reports';  // 多孩子综合报告

// 会员状态
export interface MembershipStatus {
  hasSubscription: boolean;
  subscriptionStatus: 'active' | 'expired' | 'cancelled' | null;
  subscriptionExpiresAt: Date | null;
  bonusAttempts: number;      // 分享获得的奖励次数
  bonusUsed: number;          // 已使用的奖励次数
  bonusRemaining: number;      // 剩余奖励次数
  totalAttempts: number;      // 年度总次数（订阅）
  attemptsUsed: number;       // 已使用次数（订阅）
  attemptsRemaining: number;  // 剩余次数（订阅）
}

// 权益检查结果
export interface QuotaCheckResult {
  allowed: boolean;
  reason?: 'ok' | 'no_subscription' | 'no_bonus' | 'quota_exceeded' | 'not_implemented';
  remaining?: number;
  message?: string;
}

/**
 * 获取用户会员状态
 */
export async function getMembershipStatus(userId: string): Promise<MembershipStatus> {
  const [subscription, user] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { bonusAttempts: true, bonusUsed: true },
    }),
  ]);

  const isSubscriptionActive = subscription?.status === 'active' &&
    subscription?.expiresAt &&
    subscription.expiresAt > new Date();

  return {
    hasSubscription: isSubscriptionActive,
    subscriptionStatus: (subscription?.status ?? null) as MembershipStatus['subscriptionStatus'],
    subscriptionExpiresAt: subscription?.expiresAt ?? null,
    bonusAttempts: user?.bonusAttempts ?? 0,
    bonusUsed: user?.bonusUsed ?? 0,
    bonusRemaining: (user?.bonusAttempts ?? 0) - (user?.bonusUsed ?? 0),
    totalAttempts: subscription?.attemptsTotal ?? 0,
    attemptsUsed: subscription?.attemptsUsed ?? 0,
    attemptsRemaining: isSubscriptionActive
      ? (subscription?.attemptsTotal ?? 0) - (subscription?.attemptsUsed ?? 0)
      : 0,
  };
}

/**
 * 检查用户是否有指定功能的权限
 * 目前：所有付费相关功能暂时对所有用户开放，等支付接入后再限制
 */
export async function checkFeature(
  userId: string,
  feature: MembershipFeature
): Promise<boolean> {
  // TODO: 支付接入后，根据用户订阅状态判断
  // 目前暂时全部开放
  return true;
}

/**
 * 检查用户是否可以进行测评（次数检查）
 * 规则：
 * 1. 有有效订阅且有剩余次数 -> 可以
 * 2. 有分享奖励次数 -> 可以
 * 3. 免费用户（无订阅无奖励）-> 可以（暂时开放）
 */
export async function checkQuota(userId: string): Promise<QuotaCheckResult> {
  const status = await getMembershipStatus(userId);

  // 有订阅且有剩余次数
  if (status.hasSubscription && status.attemptsRemaining > 0) {
    return {
      allowed: true,
      reason: 'ok',
      remaining: status.attemptsRemaining + status.bonusRemaining,
    };
  }

  // 有分享奖励次数
  if (status.bonusRemaining > 0) {
    return {
      allowed: true,
      reason: 'ok',
      remaining: status.attemptsRemaining + status.bonusRemaining,
    };
  }

  // 暂时对所有用户开放（等支付接入后修改此处）
  return {
    allowed: true,
    reason: 'ok',
    remaining: 999, // 临时无限次
  };

  /* 支付接入后的逻辑：
  return {
    allowed: false,
    reason: status.hasSubscription ? 'quota_exceeded' : 'no_subscription',
    remaining: 0,
    message: '请先购买会员',
  };
  */
}

/**
 * 使用一次测评次数
 * 优先使用订阅次数，再使用分享奖励次数
 * 使用事务保证原子性，避免并发超发
 * 返回是否成功
 */
export async function useQuota(userId: string): Promise<boolean> {
  try {
    // 使用事务保证原子性
    const result = await prisma.$transaction(async (tx) => {
      // 优先使用订阅次数
      const subscription = await tx.subscription.findFirst({
        where: {
          userId,
          status: 'active',
          expiresAt: { gt: new Date() },
        },
      });

      if (subscription && subscription.attemptsUsed < subscription.attemptsTotal) {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: { attemptsUsed: { increment: 1 } },
        });
        return { success: true, source: 'subscription' };
      }

      // 其次使用分享奖励次数
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (user && user.bonusUsed < user.bonusAttempts) {
        await tx.user.update({
          where: { id: userId },
          data: { bonusUsed: { increment: 1 } },
        });
        return { success: true, source: 'bonus' };
      }

      return { success: false, source: null };
    });

    return result.success;
  } catch (error) {
    console.error('useQuota error:', error);
    // 暂时对所有用户开放
    return true;
  }
}

/**
 * 获取用户剩余测评次数
 */
export async function getRemainingAttempts(userId: string): Promise<number> {
  const status = await getMembershipStatus(userId);
  return status.attemptsRemaining + status.bonusRemaining;
}

/**
 * 检查 Feature Flag
 */
export function isFeatureEnabled(feature: string): boolean {
  return process.env[`ENABLE_${feature.toUpperCase()}`] === 'true';
}
