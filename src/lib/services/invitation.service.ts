import { prisma } from '@/lib/db';
import { generateBatchCode } from './code-generator';

// 生成6位数字邀请码（确保唯一）
// @deprecated 请使用 generateBatchCode from code-generator.ts
export async function generateInviteCode(): Promise<string> {
  return generateBatchCode();
}

// 验证 Slot 邀请码（兼容旧接口）
export async function validateSlotCode(code: string) {
  const slot = await prisma.slot.findUnique({
    where: { code },
    include: { batch: true },
  });

  if (!slot) {
    return { valid: false, error: '邀请码不存在' };
  }

  if (slot.expiresAt < new Date()) {
    return { valid: false, error: '邀请码已过期' };
  }

  if (slot.usedBy) {
    return { valid: false, error: '邀请码已被使用' };
  }

  return {
    valid: true,
    invitation: {
      id: slot.id,
      code: slot.code,
      batchId: slot.batchId,
      type: slot.type,
      expiresAt: slot.expiresAt,
    },
  };
}

