import { prisma } from '@/lib/db';
import {
  earnPoints,
  getPointBalance,
  createTrialCoupon,
  type PointBalance,
} from './point.service';
import { generateReferralCode } from './code-generator';

// 获取或创建用户的分享码
export async function getOrCreateShareCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { shareCode: true },
  });

  if (user?.shareCode) {
    return user.shareCode;
  }

  // 创建新的分享码
  const shareCode = await generateReferralCode();
  await prisma.user.update({
    where: { id: userId },
    data: { shareCode },
  });

  return shareCode;
}

// 记录分享行为
export async function logShare(
  userId: string,
  shareCode: string,
  type: 'link' | 'poster' | 'qrcode' = 'link',
  childId?: string
) {
  return prisma.shareLog.create({
    data: {
      userId,
      shareCode,
      type,
      childId,
    },
  });
}

// 获取用户的分享统计
export async function getShareStats(userId: string) {
  const [shareCode, shareLogs, referrals] = await Promise.all([
    getOrCreateShareCode(userId),
    prisma.shareLog.count({ where: { userId } }),
    prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // 获取积分余额
  let pointBalance: PointBalance;
  try {
    pointBalance = await getPointBalance(userId);
  } catch {
    pointBalance = {
      realPoints: 0,
      bonusPoints: 0,
      bonusPointsUsed: 0,
      totalUsable: 0,
    };
  }

  // 统计有效邀请（已注册）
  const validReferrals = referrals.filter((r) => r.pointsRegistered);

  // 计算已获得的积分
  let totalPointsEarned = 0;
  for (const referral of referrals) {
    if (referral.pointsRegistered) totalPointsEarned += 5;
    if (referral.pointsAssessed) totalPointsEarned += 3;
  }

  return {
    shareCode,
    shareUrl: `https://lzti.nzyy.cc/register?share=${shareCode}`,
    stats: {
      totalShared: shareLogs,
      validReferrals: validReferrals.length,
      totalReferrals: referrals.length,
      realPoints: pointBalance.realPoints,
      bonusPoints: pointBalance.bonusPoints,
      bonusRemaining: pointBalance.totalUsable,
    },
    recentReferrals: referrals.slice(0, 10).map((r) => ({
      id: r.id,
      referredAt: r.referredAt,
      registered: r.pointsRegistered,
      assessed: r.pointsAssessed,
      rewardsEarned: (r.pointsRegistered ? 5 : 0) + (r.pointsAssessed ? 3 : 0),
    })),
  };
}

/**
 * 新用户注册时调用：创建/更新 Referral，发放注册积分奖励
 * 被推荐人注册+首次家长测评 = 推荐人得5积分
 */
export async function onReferralRegistered(refereeId: string, shareCode: string) {
  // 防止自己推荐自己
  const referrer = await prisma.user.findUnique({
    where: { shareCode },
    select: { id: true },
  });

  if (!referrer) {
    return null; // 无效的分享码
  }

  if (referrer.id === refereeId) {
    return null; // 不能自己推荐自己
  }

  // 查找是否存在未关联的 Referral
  const existing = await prisma.referral.findFirst({
    where: { shareCode, refereeId: null },
    orderBy: { createdAt: 'desc' },
  });

  let referral;
  if (existing) {
    // 更新已有记录
    referral = await prisma.referral.update({
      where: { id: existing.id },
      data: { refereeId },
    });
  } else {
    // 创建新记录
    referral = await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        refereeId,
        shareCode,
      },
    });
  }

  // 检查是否已发放过注册积分奖励（避免重复发放）
  // 注意：这里只发5积分的注册奖励，测评奖励在onReferralAssessed中发
  if (!referral.pointsRegistered) {
    // 发放 +5 实际积分给推荐人
    await earnPoints(referrer.id, 'register', referral.id);

    // 更新奖励状态
    await prisma.referral.update({
      where: { id: referral.id },
      data: { pointsRegistered: true },
    });
  }

  return referral;
}

/**
 * 被推荐人完成家长测评时调用：发放测评积分奖励
 * 后续家长测评 = 推荐人得3积分/次
 */
export async function onReferralAssessed(refereeId: string) {
  // 查找该用户关联的、已注册但未发放测评积分的 Referral
  const referral = await prisma.referral.findFirst({
    where: { refereeId, pointsRegistered: true, pointsAssessed: false },
    orderBy: { createdAt: 'asc' },
  });

  if (!referral) {
    return null;
  }

  // 发放 +3 实际积分给推荐人
  await earnPoints(referral.referrerId, 'assessment', referral.id);

  // 更新奖励状态
  await prisma.referral.update({
    where: { id: referral.id },
    data: { pointsAssessed: true },
  });

  return { success: true };
}

/**
 * 被推荐人完成付费订阅时调用：发放订阅奖励
 * - 推荐人已订阅：+1个月订阅期 + 1次测评
 * - 推荐人未订阅：+1次测评机会（15天有效期，TR-券）
 */
export async function onReferralSubscribed(refereeId: string) {
  // 查找该用户关联的、未发放订阅奖励的 Referral
  const referral = await prisma.referral.findFirst({
    where: { refereeId, rewardSubscribed: false },
    orderBy: { createdAt: 'asc' },
  });

  if (!referral) {
    return null;
  }

  // 检查推荐人是否在订阅期内
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: referral.referrerId,
      status: 'active',
      expiresAt: { gt: new Date() },
    },
  });

  if (subscription) {
    // 推荐人已在订阅期内：给+1个月订阅期 + 1次测评
    const newExpiresAt = new Date(subscription.expiresAt);
    newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);

    await prisma.$transaction([
      // 延长订阅期1个月
      prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          expiresAt: newExpiresAt,
          attemptsTotal: { increment: 1 },
        },
      }),
      // 更新奖励状态
      prisma.referral.update({
        where: { id: referral.id },
        data: { rewardSubscribed: true },
      }),
    ]);

    return {
      success: true,
      rewardType: 'subscription_extension',
      bonusMonths: 1,
      bonusAttempts: 1,
    };
  } else {
    // 推荐人未在订阅期内：给15天有效期的trial券
    const { code, expiresAt } = await createTrialCoupon(
      referral.referrerId,
      referral.id
    );

    // 更新奖励状态
    await prisma.referral.update({
      where: { id: referral.id },
      data: { rewardSubscribed: true },
    });

    return {
      success: true,
      rewardType: 'trial_voucher',
      code,
      expiresAt,
      description: '有效期15天的一次完整测评（家长+孩子+老师三视角）',
    };
  }
}

// 获取分享奖励详情（积分形式）
export async function getShareRewards(userId: string) {
  let pointBalance: PointBalance;
  try {
    pointBalance = await getPointBalance(userId);
  } catch {
    pointBalance = {
      realPoints: 0,
      bonusPoints: 0,
      bonusPointsUsed: 0,
      totalUsable: 0,
    };
  }

  const transactions = await prisma.pointTransaction.findMany({
    where: {
      userId,
      type: { in: ['earn_register', 'earn_assessment', 'bonus_earned'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return {
    realPoints: pointBalance.realPoints,
    bonusPoints: pointBalance.bonusPoints,
    bonusRemaining: pointBalance.totalUsable,
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      createdAt: t.createdAt,
    })),
  };
}
