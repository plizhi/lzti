import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma（必须在 import 业务模块之前）
vi.mock('@/lib/db', () => ({
  prisma: {
    sessionAttempt: { findFirst: vi.fn(), findUnique: vi.fn() },
    reportShare: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock 码生成器：固定码，便于断言
vi.mock('@/lib/services/code-generator', () => ({
  generateReportShareCode: vi.fn(async () => 'NEWCODE1'),
}));

import { prisma } from '@/lib/db';
import { createReportShare } from '@/lib/services/report-share.service';

const ATTEMPT = {
  id: 'attempt-1',
  createdAt: new Date('2026-11-01T00:00:00Z'),
  stageId: 'junior-3',
  quadrants: {},
  session: { child: { id: 'child-1', name: '小明', userId: 'user-1' } },
  report: null,
};

describe('报告分享：过期后重新分享', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.sessionAttempt.findFirst as any).mockResolvedValue(ATTEMPT);
  });

  it('没有分享记录 → 新建（24 小时）', async () => {
    (prisma.reportShare.findUnique as any).mockResolvedValue(null);
    (prisma.reportShare.create as any).mockImplementation(async ({ data }: any) => ({
      id: 'share-1',
      ...data,
    }));

    const before = Date.now();
    const res = await createReportShare('user-1', 'attempt-1');

    expect(res.shareCode).toBe('NEWCODE1');
    expect(res.isExisting).toBe(false);
    const ttl = res.expiresAt.getTime() - before;
    expect(ttl).toBeGreaterThan(23.5 * 3600 * 1000);
    expect(ttl).toBeLessThanOrEqual(24 * 3600 * 1000);
    expect(prisma.reportShare.update).not.toHaveBeenCalled();
  });

  it('已有分享且未过期 → 复用旧码，不动库', async () => {
    const expiresAt = new Date(Date.now() + 3600 * 1000);
    (prisma.reportShare.findUnique as any).mockResolvedValue({
      id: 'share-1',
      shareCode: 'OLDCODE1',
      expiresAt,
    });

    const res = await createReportShare('user-1', 'attempt-1');

    expect(res.shareCode).toBe('OLDCODE1');
    expect(res.isExisting).toBe(true);
    expect(res.expiresAt).toEqual(expiresAt);
    expect(prisma.reportShare.update).not.toHaveBeenCalled();
    expect(prisma.reportShare.create).not.toHaveBeenCalled();
  });

  it('已有分享但已过期 → 换新码 + 延到 24 小时（修 bug：原来返回的还是过期链接）', async () => {
    const expired = new Date(Date.now() - 60 * 1000);
    (prisma.reportShare.findUnique as any).mockResolvedValue({
      id: 'share-1',
      shareCode: 'OLDCODE1',
      expiresAt: expired,
    });
    (prisma.reportShare.update as any).mockImplementation(async ({ where, data }: any) => ({
      id: where.id,
      ...data,
    }));

    const before = Date.now();
    const res = await createReportShare('user-1', 'attempt-1');

    expect(prisma.reportShare.update).toHaveBeenCalledTimes(1);
    expect(prisma.reportShare.create).not.toHaveBeenCalled();
    // 换了新码
    expect(res.shareCode).toBe('NEWCODE1');
    expect(res.shareCode).not.toBe('OLDCODE1');
    // 有效期重新起算 24 小时
    const ttl = res.expiresAt.getTime() - before;
    expect(ttl).toBeGreaterThan(23.5 * 3600 * 1000);
    expect(ttl).toBeLessThanOrEqual(24 * 3600 * 1000);
  });
});
