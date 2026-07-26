import { prisma } from '@/lib/db';

// 生成6位数字邀请码（确保唯一）
export async function generateInviteCode(): Promise<string> {
  let code: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    code = Math.random().toString().slice(2, 8).padStart(6, '0');
    const exists = await prisma.slot.findUnique({ where: { code } }) ||
                   await prisma.userInviteCode.findUnique({ where: { code } });
    if (!exists) {
      return code;
    }
    attempts++;
  } while (attempts < maxAttempts);

  // 如果重复太多，使用时间戳+随机数
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.random().toString().slice(2, 6);
  return `${timestamp}${random}`.slice(0, 6);
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

