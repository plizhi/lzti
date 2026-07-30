import { prisma } from '@/lib/db';

// 生成8位字母数字分享码
export async function generateShareCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 避免易混淆字符
  let code: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const exists = await prisma.user.findUnique({ where: { shareCode: code } });
    if (!exists) {
      return code;
    }
    attempts++;
  } while (attempts < maxAttempts);

  // 兜底：使用时间戳+随机
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  return `${timestamp}${random}`.slice(0, 8).toUpperCase();
}

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
  const shareCode = await generateShareCode();
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
  const [shareCode, shareLogs, referrals, user] = await Promise.all([
    getOrCreateShareCode(userId),
    prisma.shareLog.count({ where: { userId } }),
    prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { bonusAttempts: true, bonusUsed: true },
    }),
  ]);

  // 统计有效邀请（注册）
  const validReferrals = referrals.filter(r => r.rewardRegistered);

  // 计算奖励
  let totalBonusEarned = 0;
  let totalBonusUsed = 0;

  for (const referral of referrals) {
    if (referral.rewardSubscribed) {
      totalBonusEarned += 3;
    } else if (referral.rewardAssessed) {
      totalBonusEarned += 2; // 注册 + 测评
    } else if (referral.rewardRegistered) {
      totalBonusEarned += 1;
    }
  }

  const bonusRemaining = (user?.bonusAttempts ?? 0) - (user?.bonusUsed ?? 0);

  return {
    shareCode,
    shareUrl: `https://lzti.nzyy.cc/register?share=${shareCode}`,
    stats: {
      totalShared: shareLogs,
      validReferrals: validReferrals.length,
      totalReferrals: referrals.length,
      bonusEarned: user?.bonusAttempts ?? 0,
      bonusUsed: user?.bonusUsed ?? 0,
      bonusRemaining,
    },
    recentReferrals: referrals.slice(0, 10).map(r => ({
      id: r.id,
      referredAt: r.referredAt,
      registered: r.rewardRegistered,
      assessed: r.rewardAssessed,
      subscribed: r.rewardSubscribed,
      rewardsEarned: (r.rewardSubscribed ? 3 : 0) + (r.rewardAssessed && !r.rewardSubscribed ? 2 : 0) + (r.rewardRegistered && !r.rewardAssessed ? 1 : 0),
    })),
  };
}

// 新用户注册时调用：创建/更新 Referral
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

  if (existing) {
    // 更新已有记录
    return prisma.referral.update({
      where: { id: existing.id },
      data: { refereeId },
    });
  }

  // 创建新记录
  return prisma.referral.create({
    data: {
      referrerId: referrer.id,
      refereeId,
      shareCode,
    },
  });
}

// 被分享者完成测评时调用：发放测评奖励
export async function onReferralAssessed(refereeId: string) {
  // 查找该用户关联的未发放测评奖励的 Referral
  const referral = await prisma.referral.findFirst({
    where: { refereeId, rewardRegistered: true, rewardAssessed: false },
    orderBy: { createdAt: 'asc' },
  });

  if (!referral) {
    return null;
  }

  // 检查是否达到年度上限（每人每年最多12次分享奖励）
  const referrer = await prisma.user.findUnique({
    where: { id: referral.referrerId },
    select: { bonusAttempts: true },
  });

  if (!referrer) {
    return null;
  }

  // 检查今年获得的分享奖励
  const yearStart = new Date();
  yearStart.setMonth(0, 1);
  yearStart.setHours(0, 0, 0, 0);

  const thisYearRewards = await prisma.shareReward.count({
    where: {
      userId: referral.referrerId,
      createdAt: { gte: yearStart },
      type: { not: 'subscribed' }, // 订阅奖励不计入上限
    },
  });

  if (thisYearRewards >= 12) {
    // 达到上限，不再发放
    return { reachedLimit: true };
  }

  // 发放 +1 奖励
  const [, , shareReward] = await prisma.$transaction([
    prisma.referral.update({
      where: { id: referral.id },
      data: { rewardAssessed: true },
    }),
    prisma.user.update({
      where: { id: referral.referrerId },
      data: { bonusAttempts: { increment: 1 } },
    }),
    prisma.shareReward.create({
      data: {
        userId: referral.referrerId,
        referralId: referral.id,
        type: 'assessed',
        bonusCount: 1,
      },
    }),
  ]);

  return shareReward;
}

// 被分享者完成付费订阅时调用：发放订阅奖励
export async function onReferralSubscribed(refereeId: string) {
  const referral = await prisma.referral.findFirst({
    where: { refereeId, rewardSubscribed: false },
    orderBy: { createdAt: 'asc' },
  });

  if (!referral) {
    return null;
  }

  // 检查是否达到年度上限（订阅奖励也有限制，防止刷）
  const yearStart = new Date();
  yearStart.setMonth(0, 1);
  yearStart.setHours(0, 0, 0, 0);

  const thisYearRewards = await prisma.shareReward.count({
    where: {
      userId: referral.referrerId,
      createdAt: { gte: yearStart },
    },
  });

  // 订阅奖励上限：每年最多通过推荐获得 24 次（订阅奖励 + 注册/测评奖励）
  if (thisYearRewards >= 24) {
    return { reachedLimit: true };
  }

  // 发放 +3 奖励
  const [, , shareReward] = await prisma.$transaction([
    prisma.referral.update({
      where: { id: referral.id },
      data: { rewardSubscribed: true },
    }),
    prisma.user.update({
      where: { id: referral.referrerId },
      data: { bonusAttempts: { increment: 3 } },
    }),
    prisma.shareReward.create({
      data: {
        userId: referral.referrerId,
        referralId: referral.id,
        type: 'subscribed',
        bonusCount: 3,
      },
    }),
  ]);

  return shareReward;
}

// 获取分享奖励详情
export async function getShareRewards(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { bonusAttempts: true, bonusUsed: true },
  });

  const rewards = await prisma.shareReward.findMany({
    where: { userId },
    include: {
      // referral: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return {
    bonusAttempts: user?.bonusAttempts ?? 0,
    bonusUsed: user?.bonusUsed ?? 0,
    bonusRemaining: (user?.bonusAttempts ?? 0) - (user?.bonusUsed ?? 0),
    rewards: rewards.map(r => ({
      id: r.id,
      type: r.type,
      bonusCount: r.bonusCount,
      createdAt: r.createdAt,
    })),
  };
}
