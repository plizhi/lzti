import { prisma } from '@/lib/db';

interface InvitationCodeData {
  id: string;
  code: string;
  createdBy: string;
  expiresAt: Date;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  invitation?: InvitationCodeData;
}

export async function validateInvitationCode(code: string): Promise<ValidationResult> {
  const invitation = await prisma.invitationCode.findUnique({
    where: { code },
  });

  if (!invitation) {
    return { valid: false, error: '邀请码不存在' };
  }

  if (!invitation.isActive) {
    return { valid: false, error: '邀请码已禁用' };
  }

  if (new Date() > invitation.expiresAt) {
    return { valid: false, error: '邀请码已过期' };
  }

  if (invitation.usedCount >= invitation.maxUses) {
    return { valid: false, error: '邀请码已用完' };
  }

  return { valid: true, invitation };
}

export async function generateInvitationCode(
  createdBy: string,
  options: {
    maxUses?: number;
    expiresInDays?: number;
  } = {}
): Promise<string> {
  // 生成6位数字随机码
  const code = Math.random().toString().slice(2, 8).padStart(6, '0');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (options.expiresInDays ?? 30));

  await prisma.invitationCode.create({
    data: {
      code,
      createdBy,
      maxUses: options.maxUses ?? 1,
      expiresAt,
    },
  });

  return code;
}
