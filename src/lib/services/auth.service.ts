import { prisma } from '@/lib/db';
import { hashPassword, comparePassword, generateToken } from '@/lib/auth';
import { validatePhone, validatePassword, validateChildData } from '@/lib/validators';
import { ApiError } from '@/lib/api/response';
import { activateSlot, createUserInviteCodes } from './share.service';
import { onReferralRegistered } from './referral.service';

export interface LoginData {
  phone: string;
  password: string;
}

// 激活 Slot 并创建预账户
export async function activateSlotAndCreatePendingUser(slotCode: string, childName?: string) {
  // 验证并激活 Slot
  const result = await activateSlot(slotCode);

  if (result.error) {
    throw new ApiError(result.error, 400);
  }

  const slot = result.slot!;
  const batch = result.batch!;

  // 检查批次是否还有可用名额
  if (slot.type === 'register' && batch.questionnaireType === 'register') {
    // 这是注册类型的批次
    // 创建预账户（关联到批次）
    const user = await prisma.user.create({
      data: {
        status: 'PENDING',
        shareBatchId: batch.id,
      },
    });

    return {
      user,
      slot,
      batch,
    };
  }

  return {
    slot,
    batch,
  };
}

// 完成注册（升级预账户）
export async function completeRegistration(
  userId: string,
  phone: string,
  password: string,
  childData?: {
    name: string;
    gender?: string;
    birthDate?: string;
    grade?: string;
  },
  referralCode?: string | null
) {
  // 验证手机号格式
  const validatedPhone = validatePhone(phone);

  // 检查手机号是否已被使用
  const existingUser = await prisma.user.findUnique({
    where: { phone: validatedPhone },
  });

  if (existingUser && existingUser.id !== userId) {
    throw new ApiError('该手机号已注册', 409);
  }

  // 获取用户
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError('用户不存在', 404);
  }

  if (user.status === 'ACTIVE') {
    throw new ApiError('账户已是正式账户', 400);
  }

  // 密码哈希
  const passwordHash = await hashPassword(password);

  // 升级账户
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      phone: validatedPhone,
      passwordHash,
      status: 'ACTIVE',
    },
  });

  // 如果有孩子信息，创建孩子
  let child = null;
  if (childData) {
    const validatedChild = validateChildData(childData);
    child = await prisma.child.create({
      data: {
        userId: updatedUser.id,
        name: validatedChild.name,
        gender: validatedChild.gender,
        birthDate: validatedChild.birthDate,
        grade: validatedChild.grade,
      },
    });
  }

  // 生成 Token
  const token = generateToken(updatedUser.id);

  // 赠送邀请码
  const inviteCodes = await createUserInviteCodes(updatedUser.id, 10);

  // 处理推荐奖励
  if (referralCode) {
    await onReferralRegistered(updatedUser.id, referralCode);
  }

  return {
    user: {
      id: updatedUser.id,
      phone: updatedUser.phone,
      name: updatedUser.name,
      role: updatedUser.role,
      status: updatedUser.status,
    },
    child,
    token,
    inviteCodes: inviteCodes.map(c => c.code),
  };
}

export async function login(data: LoginData) {
  const phone = validatePhone(data.phone);
  const password = validatePassword(data.password);

  const user = await prisma.user.findUnique({
    where: { phone },
  });

  if (!user) {
    throw new ApiError('手机号或密码错误', 401);
  }

  if (!user.passwordHash) {
    throw new ApiError('请使用验证码登录', 401);
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    throw new ApiError('手机号或密码错误', 401);
  }

  const token = generateToken(user.id);

  return {
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      status: user.status,
    },
    token,
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      children: {
        include: {
          sessions: {
            select: {
              id: true,
              stageId: true,
              completed: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  if (!user) {
    throw new ApiError('用户不存在', 404);
  }

  // 获取订阅状态
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const isActive = subscription?.status === 'active' &&
    subscription?.expiresAt &&
    subscription.expiresAt > new Date();

  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    status: user.status,
    children: user.children,
    // 会员信息
    bonusAttempts: user.bonusAttempts,
    bonusUsed: user.bonusUsed,
    subscription: isActive ? {
      status: subscription!.status,
      expiresAt: subscription!.expiresAt,
      attemptsTotal: subscription!.attemptsTotal,
      attemptsUsed: subscription!.attemptsUsed,
    } : null,
  };
}
