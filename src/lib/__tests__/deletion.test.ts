import { describe, it, expect, vi, beforeEach } from 'vitest';

// 记录每次调用，用于断言「删除顺序」——顺序错了整笔事务会撞 FK。
const calls: string[] = [];

function makeTx() {
  const record = (name: string) =>
    vi.fn(async () => {
      calls.push(name);
      return { count: 0 };
    });

  return {
    sessionAttempt: {
      findMany: vi.fn(async () => {
        calls.push('sessionAttempt.findMany');
        return [{ id: 'attempt-1' }, { id: 'attempt-2' }];
      }),
      deleteMany: record('sessionAttempt.deleteMany'),
    },
    attemptReport: { deleteMany: record('attemptReport.deleteMany') },
    assessmentSession: { deleteMany: record('assessmentSession.deleteMany') },
    reportShare: { deleteMany: record('reportShare.deleteMany') },
    reTestReminder: { deleteMany: record('reTestReminder.deleteMany') },
    slot: {
      updateMany: record('slot.updateMany'),
      deleteMany: record('slot.deleteMany'),
    },
    child: {
      findMany: vi.fn(async () => {
        calls.push('child.findMany');
        return [{ id: 'child-1' }];
      }),
      delete: record('child.delete'),
    },
    shareBatch: {
      findMany: vi.fn(async () => {
        calls.push('shareBatch.findMany');
        return [{ id: 'batch-1' }];
      }),
      deleteMany: record('shareBatch.deleteMany'),
    },
    userInviteCode: { deleteMany: record('userInviteCode.deleteMany') },
    shareLog: { deleteMany: record('shareLog.deleteMany') },
    feedback: { deleteMany: record('feedback.deleteMany') },
    coupon: { deleteMany: record('coupon.deleteMany') },
    referral: { updateMany: record('referral.updateMany') },
    user: { delete: record('user.delete') },
  };
}

const tx = makeTx();

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async () => ({ id: 'user-1' })),
    },
    $transaction: vi.fn(async (fn: (t: unknown) => Promise<unknown>) => fn(tx)),
  },
}));

import { prisma } from '@/lib/db';
import { deleteChildTree, deleteUserCascade } from '@/lib/services/deletion.service';

const mockUserFind = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  calls.length = 0;
  vi.clearAllMocks();
  mockUserFind.mockResolvedValue({ id: 'user-1' });
  (prisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    async (fn: (t: unknown) => Promise<unknown>) => fn(tx)
  );
});

describe('deleteChildTree 删除顺序', () => {
  it('必须先删报告与尝试，最后才删孩子档案', async () => {
    await deleteChildTree(tx as never, 'child-1');

    const reportIdx = calls.indexOf('attemptReport.deleteMany');
    const attemptIdx = calls.indexOf('sessionAttempt.deleteMany');
    const sessionIdx = calls.indexOf('assessmentSession.deleteMany');
    const childIdx = calls.indexOf('child.delete');

    // 报告 → 尝试 → 会话 → 孩子，缺一不可，顺序不能反
    expect(reportIdx).toBeGreaterThanOrEqual(0);
    expect(reportIdx).toBeLessThan(attemptIdx);
    expect(attemptIdx).toBeLessThan(sessionIdx);
    expect(sessionIdx).toBeLessThan(childIdx);
  });

  it('清掉挂在 attempt 上的分享链接，避免悬空引用', async () => {
    await deleteChildTree(tx as never, 'child-1');

    expect(calls).toContain('reportShare.deleteMany');
    expect(tx.reportShare.deleteMany).toHaveBeenCalledWith({
      where: { attemptId: { in: ['attempt-1', 'attempt-2'] } },
    });
  });

  it('把 slot 上绑定的 childId 置空（slot 可能属于别的用户）', async () => {
    await deleteChildTree(tx as never, 'child-1');

    expect(tx.slot.updateMany).toHaveBeenCalledWith({
      where: { childId: 'child-1' },
      data: { childId: null },
    });
  });
});

describe('deleteUserCascade 删除顺序', () => {
  it('slot 必须先于 shareBatch 删（Slot.batchId 是 RESTRICT）', async () => {
    await deleteUserCascade('user-1');

    const slotIdx = calls.indexOf('slot.deleteMany');
    const batchIdx = calls.indexOf('shareBatch.deleteMany');

    expect(slotIdx).toBeGreaterThanOrEqual(0);
    expect(slotIdx).toBeLessThan(batchIdx);
  });

  it('孩子的测评树要在删用户之前清完', async () => {
    await deleteUserCascade('user-1');

    const childIdx = calls.indexOf('child.delete');
    const userIdx = calls.indexOf('user.delete');

    expect(childIdx).toBeGreaterThanOrEqual(0);
    expect(childIdx).toBeLessThan(userIdx);
  });

  it('券必须显式删除，否则会变成无主券被所有人看见', async () => {
    await deleteUserCascade('user-1');

    expect(calls).toContain('coupon.deleteMany');
    const couponIdx = calls.indexOf('coupon.deleteMany');
    const userIdx = calls.indexOf('user.delete');
    expect(couponIdx).toBeLessThan(userIdx);
  });

  it('推荐关系置空而不是删行，保留推荐人历史', async () => {
    await deleteUserCascade('user-1');

    expect(tx.referral.updateMany).toHaveBeenCalledWith({
      where: { refereeId: 'user-1' },
      data: { refereeId: null },
    });
  });

  it('用户不存在时报 404', async () => {
    mockUserFind.mockResolvedValue(null);

    await expect(deleteUserCascade('ghost')).rejects.toThrow('用户不存在');
  });
});
