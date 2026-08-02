import { prisma } from '@/lib/db';
import { generateInviteCode } from './invitation.service';

// 创建分享批次
// childId: 对于 student/teacher 类型必须提供，用于绑定 slot
// 注意：此函数仍被 API 层使用，未来可能合并到 invitation.service.ts
export async function createShareBatch(
  userId: string,
  stageId: string,
  questionnaireType: 'register' | 'student' | 'teacher',
  slotCount: number = 10,
  expiresInDays: number = 2,
  childId?: string
) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // student/teacher 类型必须绑定 childId
  if ((questionnaireType === 'student' || questionnaireType === 'teacher') && !childId) {
    throw new Error('邀请孩子/老师测评时必须提供 childId');
  }

  // 验证 childId 属于当前用户
  if (childId) {
    const child = await prisma.child.findFirst({
      where: { id: childId, userId },
    });
    if (!child) {
      throw new Error('孩子档案不存在');
    }
  }

  // 创建批次
  const batch = await prisma.shareBatch.create({
    data: {
      userId,
      stageId,
      questionnaireType,
      expiresAt,
    },
  });

  // 创建对应数量的 Slot
  const slots = await Promise.all(
    Array.from({ length: slotCount }, async () => {
      const code = await generateInviteCode();
      return prisma.slot.create({
        data: {
          batchId: batch.id,
          type: questionnaireType,
          code,
          expiresAt,
          // student/teacher 类型时直接绑定 childId，防止 URL 篡改
          childId: childId || null,
        },
      });
    })
  );

  return { batch, slots };
}

// 激活 Slot（注册或测评时调用）
export async function activateSlot(
  code: string,
  userId?: string,
  childId?: string
) {
  const slot = await prisma.slot.findUnique({
    where: { code },
    include: { batch: true },
  });

  if (!slot) {
    return { error: '邀请码不存在', code: 'NOT_FOUND' };
  }

  if (slot.expiresAt < new Date()) {
    return { error: '邀请码已过期', code: 'EXPIRED' };
  }

  if (slot.usedBy) {
    return { error: '邀请码已被使用', code: 'ALREADY_USED' };
  }

  // 更新 Slot
  const updatedSlot = await prisma.slot.update({
    where: { id: slot.id },
    data: {
      usedBy: userId || null,
      usedAt: new Date(),
      childId: childId || null,
    },
  });

  return { slot: updatedSlot, batch: slot.batch };
}

// 获取 Slot 信息
export async function getSlotInfo(code: string) {
  const slot = await prisma.slot.findUnique({
    where: { code },
    include: { batch: true },
  });

  if (!slot) {
    return null;
  }

  return {
    ...slot,
    isAvailable: !slot.usedBy && slot.expiresAt > new Date(),
  };
}

// 检查批次是否还有可用 Slot
export async function getAvailableSlotCount(batchId: string) {
  const count = await prisma.slot.count({
    where: {
      batchId,
      usedBy: null,
      expiresAt: { gt: new Date() },
    },
  });
  return count;
}

// 为用户分配可用 Slot
export async function assignSlot(batchId: string, userId: string, childId?: string) {
  // 查找一个可用的 Slot
  const slot = await prisma.slot.findFirst({
    where: {
      batchId,
      usedBy: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!slot) {
    return { error: '该分享已无可用名额', code: 'NO_SLOTS_AVAILABLE' };
  }

  // 激活这个 Slot
  const activated = await activateSlot(slot.code, userId, childId);
  return activated;
}

// 创建用户邀请码池（用户注册成功后调用）
export async function createUserInviteCodes(userId: string, count: number = 10) {
  const codes = await Promise.all(
    Array.from({ length: count }, async () => {
      const code = await generateInviteCode();
      return prisma.userInviteCode.create({
        data: {
          userId,
          code,
        },
      });
    })
  );

  return codes;
}

// 获取用户的可用邀请码数量
export async function getUserAvailableInviteCodeCount(userId: string) {
  const available = await prisma.userInviteCode.count({
    where: {
      userId,
      usedBy: null,
    },
  });

  const used = await prisma.userInviteCode.count({
    where: {
      userId,
      usedBy: { not: null },
    },
  });

  return { available, used, total: available + used };
}

// 使用邀请码（通过 UserInviteCode）
export async function useUserInviteCode(code: string, userId: string) {
  const inviteCode = await prisma.userInviteCode.findUnique({
    where: { code },
  });

  if (!inviteCode) {
    return { error: '邀请码不存在', code: 'NOT_FOUND' };
  }

  if (inviteCode.usedBy) {
    return { error: '邀请码已被使用', code: 'ALREADY_USED' };
  }

  if (inviteCode.userId === userId) {
    return { error: '不能使用自己的邀请码', code: 'SELF_CODE' };
  }

  const updated = await prisma.userInviteCode.update({
    where: { id: inviteCode.id },
    data: {
      usedBy: userId,
      usedAt: new Date(),
    },
  });

  return { inviteCode: updated };
}
