import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/api/response';

type Tx = Prisma.TransactionClient;

/**
 * 删除一个孩子及其全部测评数据。
 *
 * 库里的外键都是 RESTRICT（不是 CASCADE）：
 *   AssessmentSession.childId -> Child
 *   SessionAttempt.sessionId  -> AssessmentSession
 *   AttemptReport.attemptId   -> SessionAttempt
 * 所以必须从最深的叶子往上删，顺序错了整笔事务直接失败。
 * 这里显式写死顺序，不依赖数据库的级联行为。
 *
 * 另有几张表没有外键指向（软引用），也必须显式清理，否则会留下悬空 id：
 *   ReportShare.attemptId / ReTestReminder.childId / Slot.childId
 */
export async function deleteChildTree(tx: Tx, childId: string): Promise<void> {
  const attempts = await tx.sessionAttempt.findMany({
    where: { session: { childId } },
    select: { id: true },
  });
  const attemptIds = attempts.map((a) => a.id);

  // 1. 报告（挂在 attempt 上）
  await tx.attemptReport.deleteMany({ where: { attemptId: { in: attemptIds } } });
  // 2. 测评尝试
  await tx.sessionAttempt.deleteMany({ where: { session: { childId } } });
  // 3. 测评会话
  await tx.assessmentSession.deleteMany({ where: { childId } });
  // 4. 软引用：分享链接、复测提醒
  await tx.reportShare.deleteMany({ where: { attemptId: { in: attemptIds } } });
  await tx.reTestReminder.deleteMany({ where: { childId } });
  // 5. slot 上绑定的 childId 置空（slot 本身属于分享批次，可能属于别的用户）
  await tx.slot.updateMany({ where: { childId }, data: { childId: null } });
  // 6. 孩子档案
  await tx.child.delete({ where: { id: childId } });
}

/**
 * 删除一个用户及其全部数据。
 *
 * 同样不能用级联：Slot -> ShareBatch 是 RESTRICT，
 * 而「先删批次再删 slot」正是原实现里让整笔事务失败的顺序。
 *
 * 外键是 CASCADE 的（Payment / PointTransaction / Subscription / ShareReward /
 * Referral.referrerId）交给数据库；SET NULL 的（Coupon）必须自己先删，
 * 否则券会变成「无主券」，出现在所有人的券列表里。
 */
export async function deleteUserCascade(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new ApiError('用户不存在', 404);
  }

  await prisma.$transaction(
    async (tx) => {
      // 1. 孩子及其测评树
      const children = await tx.child.findMany({
        where: { userId },
        select: { id: true },
      });
      for (const child of children) {
        await deleteChildTree(tx, child.id);
      }

      // 2. slot 必须先于 batch 删（Slot.batchId 是 RESTRICT）
      const batches = await tx.shareBatch.findMany({
        where: { userId },
        select: { id: true },
      });
      const batchIds = batches.map((b) => b.id);
      await tx.slot.deleteMany({ where: { batchId: { in: batchIds } } });
      await tx.shareBatch.deleteMany({ where: { userId } });

      // 3. 没有外键指向 User 的表，显式清理
      await tx.userInviteCode.deleteMany({ where: { userId } });
      await tx.reportShare.deleteMany({ where: { ownerId: userId } });
      await tx.shareLog.deleteMany({ where: { userId } });
      await tx.reTestReminder.deleteMany({ where: { userId } });
      await tx.feedback.deleteMany({ where: { userId } });

      // 4. 券的外键是 SET NULL：不删的话会变成无主券，被所有人看见
      await tx.coupon.deleteMany({ where: { userId } });

      // 5. refereeId 没有外键，必须自己处理。
      //
      // 这里必须删行，不能置空：
      // Referral 里 refereeId=null 的行会被 onReferralRegistered 当成
      // 「未关联的 referral」捡起来绑到新注册用户身上
      // （见 referral.service.ts 的 findFirst({shareCode, refereeId: null}））。
      // 置空等于把一个「已发过奖励」的老记录转手给下一个用同码注册的人，
      // 新人拿不到本该发的注册积分，老人的奖励记录也被改写。
      //
      // 删行的代价是推荐人少一条「我推荐过谁」的记录；
      // 但被推荐人已经不存在了，这条记录本来就没有意义。
      await tx.referral.deleteMany({ where: { refereeId: userId } });

      // 6. 剩下的由 CASCADE 处理
      await tx.user.delete({ where: { id: userId } });
    },
    { timeout: 20000, maxWait: 5000 }
  );
}
