import { prisma } from '@/lib/db';

// 积分类型
export type PointType =
  | 'earn_register'    // 注册成功 +5
  | 'earn_assessment'  // 测评完成 +3
  | 'redeem_lixin'     // 兑换荔心卷 -10
  | 'redeem_shengxue'  // 兑换升学指数 -15
  | 'bonus_earned';    // 奖励积分（已付费用户满10奖2）

// 积分余额
export interface PointBalance {
  realPoints: number;      // 实际积分
  bonusPoints: number;     // 奖励积分
  bonusPointsUsed: number;  // 已使用奖励积分
  totalUsable: number;     // 总可用 = realPoints - bonusPointsUsed + bonusPoints
}

// 积分流水记录
export interface PointTransactionRecord {
  id: string;
  type: string;
  amount: number;
  balance: number;
  description: string | null;
  relatedId: string | null;
  createdAt: Date;
}

/**
 * 获取用户积分余额
 */
export async function getPointBalance(userId: string): Promise<PointBalance> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      realPoints: true,
      bonusPoints: true,
      bonusPointsUsed: true,
    },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  return {
    realPoints: user.realPoints,
    bonusPoints: user.bonusPoints,
    bonusPointsUsed: user.bonusPointsUsed,
    totalUsable: user.realPoints - user.bonusPointsUsed + user.bonusPoints,
  };
}

/**
 * 获取用户积分流水
 */
export async function getPointTransactions(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<PointTransactionRecord[]> {
  const transactions = await prisma.pointTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return transactions.map((t) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    balance: t.balance,
    description: t.description,
    relatedId: t.relatedId,
    createdAt: t.createdAt,
  }));
}

/**
 * 记录积分变动
 */
async function recordPointTransaction(
  userId: string,
  type: PointType,
  amount: number,
  description?: string,
  relatedId?: string
): Promise<void> {
  const balance = await getPointBalance(userId);

  await prisma.pointTransaction.create({
    data: {
      userId,
      type,
      amount,
      balance: balance.totalUsable + amount,
      description: description || null,
      relatedId: relatedId || null,
    },
  });
}

/**
 * 发放积分（推荐奖励）
 * @param userId 推荐人ID
 * @param type register(5分) 或 assessment(3分)
 * @param referralId 关联的 Referral ID
 */
export async function earnPoints(
  userId: string,
  type: 'register' | 'assessment',
  referralId?: string
): Promise<{ points: number; bonusAwarded: number }> {
  const pointAmount = type === 'register' ? 5 : 3;
  const pointType = type === 'register' ? 'earn_register' : 'earn_assessment';

  // 增加用户积分
  await prisma.user.update({
    where: { id: userId },
    data: { realPoints: { increment: pointAmount } },
  });

  // 记录流水
  await recordPointTransaction(
    userId,
    pointType as PointType,
    pointAmount,
    type === 'register' ? '推荐注册奖励' : '推荐测评奖励',
    referralId
  );

  // 检查并发放奖励积分（仅已付费用户）
  const bonusAwarded = await calculateAndAwardBonusPoints(userId);

  return { points: pointAmount, bonusAwarded };
}

/**
 * 计算并发放奖励积分
 * 已付费用户：每满10实际积分，奖励2bonusPoints
 */
export async function calculateAndAwardBonusPoints(userId: string): Promise<number> {
  // 检查是否已付费用户
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: 'active',
      expiresAt: { gt: new Date() },
    },
  });

  if (!subscription) {
    return 0; // 非付费用户不享受奖励积分
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { realPoints: true, bonusPoints: true },
  });

  if (!user) return 0;

  // 每满10实际积分，奖励2bonusPoints
  const newBonusEligible = Math.floor(user.realPoints / 10) * 2;
  const bonusToAward = newBonusEligible - user.bonusPoints;

  if (bonusToAward > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { bonusPoints: { increment: bonusToAward } },
    });

    await recordPointTransaction(
      userId,
      'bonus_earned',
      bonusToAward,
      `每满10实际积分奖励（当前${user.realPoints}积分）`
    );
  }

  return bonusToAward;
}

/**
 * 验证券码
 */
export async function validateCouponCode(
  code: string
): Promise<{
  valid: boolean;
  type: 'lixin' | 'shengxue' | 'trial' | null;
  coupon?: any;
  error?: string;
}> {
  const coupon = await prisma.coupon.findUnique({
    where: { code },
  });

  if (!coupon) {
    return { valid: false, type: null, error: '券码不存在' };
  }

  if (coupon.status === 'used') {
    return { valid: false, type: null, error: '券码已使用' };
  }

  if (coupon.status === 'expired' || coupon.expiresAt < new Date()) {
    return { valid: false, type: null, error: '券码已过期' };
  }

  return {
    valid: true,
    type: coupon.type as 'lixin' | 'shengxue' | 'trial',
    coupon,
  };
}

/**
 * 使用券码
 */
export async function useCoupon(
  code: string,
  usedBy: string
): Promise<{ sessionId: string }> {
  const validation = await validateCouponCode(code);

  if (!validation.valid || !validation.coupon) {
    throw new Error(validation.error || '券码无效');
  }

  // 更新券状态
  await prisma.coupon.update({
    where: { code },
    data: {
      status: 'used',
      usedBy,
      usedAt: new Date(),
    },
  });

  return { sessionId: validation.coupon.id };
}

/**
 * 积分兑换券（荔心卷/升学指数）
 */
export async function redeemPointsForCoupon(
  userId: string,
  couponType: 'lixin' | 'shengxue'
): Promise<{ couponCode: string; transactionId: string }> {
  const cost = couponType === 'lixin' ? 10 : 15;
  const balance = await getPointBalance(userId);

  if (balance.totalUsable < cost) {
    throw new Error(`积分不足，需要${cost}积分，当前可用${balance.totalUsable}积分`);
  }

  // 计算实际积分和奖励积分的使用比例
  // 规则：使用奖励积分时，至少需搭配10个实际积分
  let realToUse = 0;
  let bonusToUse = 0;

  if (balance.bonusPoints > 0 && balance.realPoints >= 10) {
    // 有奖励积分且实际积分够10
    bonusToUse = Math.min(balance.bonusPoints, cost - 10);
    realToUse = cost - bonusToUse;
  } else {
    // 只使用实际积分
    realToUse = Math.min(cost, balance.realPoints);
    bonusToUse = cost - realToUse;
  }

  // 扣减积分（确保不会变负数）
  const actualRealToUse = Math.min(realToUse, balance.realPoints);
  const actualBonusToUse = Math.min(bonusToUse, balance.bonusPoints);

  await prisma.user.update({
    where: { id: userId },
    data: {
      realPoints: { decrement: actualRealToUse },
      bonusPoints: { decrement: actualBonusToUse },
      bonusPointsUsed: { increment: actualBonusToUse },
    },
  });

  // 生成券码
  const code = generateCouponCode(couponType);
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 3); // 3个月有效期

  const coupon = await prisma.coupon.create({
    data: {
      code,
      type: couponType,
      userId,
      expiresAt,
    },
  });

  // 记录流水
  const transaction = await prisma.pointTransaction.create({
    data: {
      userId,
      type: couponType === 'lixin' ? 'redeem_lixin' : 'redeem_shengxue',
      amount: -cost,
      balance: await getPointBalance(userId).then((b) => b.totalUsable),
      description: `兑换${couponType === 'lixin' ? '荔心卷' : '升学指数'}`,
      relatedId: coupon.id,
    },
  });

  return { couponCode: code, transactionId: transaction.id };
}

/**
 * 生成券码
 */
function generateCouponCode(type: 'lixin' | 'shengxue' | 'trial'): string {
  const prefix = type === 'lixin' ? 'LX' : type === 'shengxue' ? 'SX' : 'TR';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

/**
 * 创建 trial 券（推荐订阅奖励）
 */
export async function createTrialCoupon(
  userId: string,
  referralId: string
): Promise<{ code: string; expiresAt: Date }> {
  const code = generateCouponCode('trial');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 15); // 15天有效期

  await prisma.coupon.create({
    data: {
      code,
      type: 'trial',
      userId,
      expiresAt,
    },
  });

  return { code, expiresAt };
}

/**
 * 获取用户的券列表
 */
export async function getUserCoupons(userId: string): Promise<any[]> {
  const coupons = await prisma.coupon.findMany({
    where: {
      OR: [
        { userId },
        { userId: null }, // 未分配券
      ],
      status: 'active',
    },
    orderBy: { createdAt: 'desc' },
  });

  return coupons.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    status: c.status,
    userId: c.userId,
    expiresAt: c.expiresAt,
    isOwnedByCurrentUser: c.userId === userId,
  }));
}

/**
 * 转让券（解除用户绑定）
 */
export async function transferCoupon(
  code: string,
  newOwnerId?: string
): Promise<void> {
  await prisma.coupon.update({
    where: { code },
    data: {
      userId: newOwnerId || null,
    },
  });
}
