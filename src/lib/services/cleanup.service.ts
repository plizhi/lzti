import { prisma } from '@/lib/db';

// 清理过期的 PENDING 账户
// 应该在测评完成后调用，设置 expiresAt = now() + 2小时
export async function setPendingAccountExpiration(userId: string) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 2);

  await prisma.user.update({
    where: { id: userId },
    data: { expiresAt },
  });

  return { expiresAt };
}

// 清理所有过期的 PENDING 账户及其关联数据
export async function cleanupExpiredPendingAccounts() {
  const now = new Date();

  // 查找所有过期的 PENDING 账户
  const expiredUsers = await prisma.user.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: now },
    },
    include: {
      children: {
        include: {
          sessions: true,
        },
      },
    },
  });

  if (expiredUsers.length === 0) {
    return { cleaned: 0 };
  }

  // 删除过期账户及其关联数据
  // 由于外键约束，需要按顺序删除
  const userIds = expiredUsers.map(u => u.id);

  // 先删除所有相关的 SessionAttempt 和 AttemptReport
  for (const user of expiredUsers) {
    for (const child of user.children) {
      for (const session of child.sessions) {
        // 删除 AttemptReport
        await prisma.attemptReport.deleteMany({
          where: {
            attempt: {
              sessionId: session.id,
            },
          },
        });
      }
    }
  }

  // 删除 SessionAttempt
  for (const user of expiredUsers) {
    for (const child of user.children) {
      await prisma.sessionAttempt.deleteMany({
        where: {
          childId: child.id,
        },
      });
    }
  }

  // 删除 AssessmentSession
  for (const user of expiredUsers) {
    for (const child of user.children) {
      await prisma.assessmentSession.deleteMany({
        where: {
          childId: child.id,
        },
      });
    }
  }

  // 删除 Child
  for (const user of expiredUsers) {
    await prisma.child.deleteMany({
      where: {
        userId: user.id,
      },
    });
  }

  // 删除 Slot 相关记录（只标记为已过期，不删除，因为可能需要审计）
  // Slot 的 usedBy 和 childId 信息保留

  // 最后删除 User
  await prisma.user.deleteMany({
    where: {
      id: { in: userIds },
    },
  });

  return { cleaned: expiredUsers.length };
}
