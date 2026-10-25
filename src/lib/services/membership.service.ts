import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

/** 事务客户端与普通 PrismaClient 的公共子集 */
export type DbClient = Prisma.TransactionClient;

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
  freeRemaining: number;       // 免费体验剩余次数
  totalAttempts: number;      // 年度总次数（订阅）
  attemptsUsed: number;       // 已使用次数（订阅）
  attemptsRemaining: number;  // 剩余次数（订阅）
  // nzyy 用户状态
  isPending: boolean;        // 是否为 pending 用户
  pendingExpireAt: Date | null; // pending 用户过期时间
}

// 权益检查结果
export interface QuotaCheckResult {
  allowed: boolean;
  reason?: 'ok' | 'no_subscription' | 'no_bonus' | 'quota_exceeded' | 'not_implemented' | 'pending';
  remaining?: number;
  message?: string;
}

/**
 * 获取用户会员状态
 * client 可传入事务客户端，让配额校验与扣减落在同一个事务里
 */
export async function getMembershipStatus(
  userId: string,
  client: DbClient = prisma
): Promise<MembershipStatus> {
  const [subscription, user] = await Promise.all([
    client.subscription.findUnique({
      where: { userId },
    }),
    client.user.findUnique({
      where: { id: userId },
      select: {
        bonusAttempts: true,
        bonusUsed: true,
        freeAttempts: true,
        freeAttemptsUsed: true,
        nzyyStatus: true,
        nzyyExpireAt: true,
      },
    }),
  ]);

  const isSubscriptionActive = subscription?.status === 'active' &&
    subscription?.expiresAt &&
    subscription.expiresAt > new Date();

  // pending 用户：nzyyStatus='pending' 且未过期
  const isPending = user?.nzyyStatus === 'pending' &&
    (!user?.nzyyExpireAt || user.nzyyExpireAt > new Date());

  return {
    hasSubscription: isSubscriptionActive,
    subscriptionStatus: (subscription?.status ?? null) as MembershipStatus['subscriptionStatus'],
    subscriptionExpiresAt: subscription?.expiresAt ?? null,
    bonusAttempts: user?.bonusAttempts ?? 0,
    bonusUsed: user?.bonusUsed ?? 0,
    bonusRemaining: (user?.bonusAttempts ?? 0) - (user?.bonusUsed ?? 0),
    freeRemaining: (user?.freeAttempts ?? 1) - (user?.freeAttemptsUsed ?? 0),
    totalAttempts: subscription?.attemptsTotal ?? 0,
    attemptsUsed: subscription?.attemptsUsed ?? 0,
    attemptsRemaining: isSubscriptionActive
      ? (subscription?.attemptsTotal ?? 0) - (subscription?.attemptsUsed ?? 0)
      : 0,
    isPending,
    pendingExpireAt: user?.nzyyExpireAt ?? null,
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
 * 3. 有免费体验次数 -> 可以
 * 4. pending 用户 -> 拒绝
 */
export async function checkQuota(
  userId: string,
  client: DbClient = prisma
): Promise<QuotaCheckResult> {
  const status = await getMembershipStatus(userId, client);

  // pending 用户：提示激活
  if (status.isPending) {
    return {
      allowed: false,
      reason: 'pending',
      remaining: 0,
      message: '请先激活账户',
    };
  }

  // 计算所有可用次数
  const totalRemaining = status.attemptsRemaining + status.bonusRemaining + status.freeRemaining;

  // 有订阅且有剩余次数
  if (status.hasSubscription && status.attemptsRemaining > 0) {
    return {
      allowed: true,
      reason: 'ok',
      remaining: totalRemaining,
    };
  }

  // 有分享奖励次数
  if (status.bonusRemaining > 0) {
    return {
      allowed: true,
      reason: 'ok',
      remaining: totalRemaining,
    };
  }

  // 有免费体验次数
  if (status.freeRemaining > 0) {
    return {
      allowed: true,
      reason: 'ok',
      remaining: totalRemaining,
    };
  }

  // 无可用次数
  return {
    allowed: false,
    reason: 'quota_exceeded',
    remaining: 0,
    message: '测评次数已用完，请购买会员解锁更多',
  };
}

/**
 * 在给定事务里扣减一次测评次数。
 * 抽出来是为了让调用方能把「扣次数」和「写入测评记录」放进同一个事务：
 * 记录没写成、次数却已经扣掉的话，用户会被永久卡在「次数已用完」。
 * 优先使用订阅次数，再使用分享奖励次数，最后使用免费体验次数。
 *
 * 每次扣减都用「条件更新 + 影响行数」完成：判定条件写在 UPDATE 的 WHERE 里，
 * 由数据库在同一条语句内求值，两个并发事务不会同时通过判定而超扣。
 * 写成「先读后判再写」的话，并发下两个事务都会读到旧值，超扣一次。
 */
export async function deductQuota(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<boolean> {
  // 优先使用订阅次数
  const subscription = await tx.subscription.findFirst({
    where: {
      userId,
      status: 'active',
      expiresAt: { gt: new Date() },
    },
  });

  if (subscription) {
    const { count } = await tx.subscription.updateMany({
      where: { id: subscription.id, attemptsUsed: { lt: subscription.attemptsTotal } },
      data: { attemptsUsed: { increment: 1 } },
    });
    if (count === 1) return true;
  }

  // 其次使用分享奖励次数
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      bonusAttempts: true,
      freeAttempts: true,
    },
  });

  if (user) {
    const { count: bonusCount } = await tx.user.updateMany({
      where: { id: userId, bonusUsed: { lt: user.bonusAttempts } },
      data: { bonusUsed: { increment: 1 } },
    });
    if (bonusCount === 1) return true;

    // 最后使用免费体验次数
    const { count: freeCount } = await tx.user.updateMany({
      where: { id: userId, freeAttemptsUsed: { lt: user.freeAttempts } },
      data: { freeAttemptsUsed: { increment: 1 } },
    });
    if (freeCount === 1) return true;
  }

  return false;
}

/**
 * 获取用户剩余测评次数
 */
export async function getRemainingAttempts(userId: string): Promise<number> {
  const status = await getMembershipStatus(userId);
  return status.attemptsRemaining + status.bonusRemaining + status.freeRemaining;
}

/**
 * 检查 Feature Flag
 */
export function isFeatureEnabled(feature: string): boolean {
  return process.env[`ENABLE_${feature.toUpperCase()}`] === 'true';
}
