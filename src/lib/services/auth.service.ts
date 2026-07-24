import { prisma } from '@/lib/db';
import { hashPassword, comparePassword, generateToken } from '@/lib/auth';
import { validatePhone, validatePassword, validateInvitationCode, validateChildData } from '@/lib/validators';
import { ApiError } from '@/lib/api/response';
import { validateInvitationCode as validateInvitation } from './invitation.service';

export interface RegisterData {
  phone: string;
  password: string;
  invitationCode: string;
  child: {
    name: string;
    gender?: string;
    birthDate?: string;
    grade?: string;
  };
}

export interface LoginData {
  phone: string;
  password: string;
}

export async function register(data: RegisterData) {
  const phone = validatePhone(data.phone);
  const password = validatePassword(data.password);
  const invitationCode = validateInvitationCode(data.invitationCode);
  const childData = validateChildData(data.child);

  // 检查手机号是否已注册
  const existingUser = await prisma.user.findUnique({
    where: { phone },
  });

  if (existingUser) {
    throw new ApiError('该手机号已注册', 409);
  }

  // 验证邀请码
  const validation = await validateInvitation(invitationCode);
  if (!validation.valid) {
    throw new ApiError(validation.error || '邀请码无效', 410);
  }

  const invitation = validation.invitation!;

  // 密码哈希
  const passwordHash = await hashPassword(password);

  // 创建用户和孩子
  const user = await prisma.user.create({
    data: {
      phone,
      passwordHash,
      role: 'PARENT',
      children: {
        create: {
          name: childData.name,
          gender: childData.gender,
          birthDate: childData.birthDate,
          grade: childData.grade,
          invitationCodeId: invitation.id,
        },
      },
    },
    include: {
      children: true,
    },
  });

  // 更新邀请码使用次数
  await prisma.invitationCode.update({
    where: { id: invitation.id },
    data: { usedCount: invitation.usedCount + 1 },
  });

  // 生成 Token
  const token = generateToken(user.id);

  return {
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
    },
    child: user.children[0],
    token,
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

  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    children: user.children,
  };
}
