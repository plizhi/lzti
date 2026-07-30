import { prisma } from '@/lib/db';

/**
 * 获取用户所有待发送的提醒
 */
export async function getPendingReminders(userId: string) {
  const now = new Date();

  const reminders = await prisma.reTestReminder.findMany({
    where: {
      userId,
      status: 'pending',
      remindAt: { lte: now },
    },
    orderBy: { remindAt: 'asc' },
  });

  return reminders;
}

/**
 * 获取即将到来的提醒（未来30天内）
 */
export async function getUpcomingReminders(userId: string) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + 30);

  const reminders = await prisma.reTestReminder.findMany({
    where: {
      userId,
      status: 'pending',
      remindAt: {
        gt: now,
        lte: future,
      },
    },
    orderBy: { remindAt: 'asc' },
  });

  return reminders;
}

/**
 * 标记提醒为已发送
 */
export async function markReminderAsSent(reminderId: string) {
  return prisma.reTestReminder.update({
    where: { id: reminderId },
    data: {
      status: 'sent',
      sentAt: new Date(),
    },
  });
}

/**
 * 取消提醒
 */
export async function cancelReminder(reminderId: string) {
  return prisma.reTestReminder.update({
    where: { id: reminderId },
    data: {
      status: 'cancelled',
    },
  });
}

/**
 * 创建复测提醒（供外部调用）
 */
export async function createReminder(
  userId: string,
  childId: string,
  attemptId: string,
  remindAt: Date,
  channel: 'in_app' | 'wechat' | 'sms' | 'email' = 'in_app'
) {
  return prisma.reTestReminder.create({
    data: {
      userId,
      childId,
      attemptId,
      remindAt,
      channel,
      status: 'pending',
    },
  });
}
