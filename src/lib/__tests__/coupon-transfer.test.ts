import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing point.service
vi.mock('@/lib/db', () => ({
  prisma: {
    coupon: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';
import { transferCoupon } from '@/lib/services/point.service';

const mockCouponFind = prisma.coupon.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockCouponUpdate = prisma.coupon.update as unknown as ReturnType<typeof vi.fn>;
const mockUserFind = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;

const FUTURE = new Date(Date.now() + 30 * 24 * 3600 * 1000);

function mockCoupon(overrides: Record<string, unknown> = {}) {
  mockCouponFind.mockResolvedValue({
    id: 'coupon-1',
    userId: 'owner-1',
    status: 'active',
    expiresAt: FUTURE,
    ...overrides,
  });
}

const PARENT = { userId: 'parent-1', role: 'PARENT' };
const ADMIN = { userId: 'admin-1', role: 'ADMIN' };

describe('transferCoupon 归属校验', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCoupon();
    mockCouponUpdate.mockResolvedValue({});
    mockUserFind.mockResolvedValue({ id: 'other-1' });
  });

  it('普通用户不能操作他人的券（越权拦截）', async () => {
    // 券属于 owner-1，actor 是 parent-1
    await expect(
      transferCoupon('LX-ABCDEFGHIJ', null, PARENT)
    ).rejects.toThrow('无权操作他人的券码');

    // 关键：一条都不能改
    expect(mockCouponUpdate).not.toHaveBeenCalled();
  });

  it('普通用户不能把券指给别的用户', async () => {
    mockCoupon({ userId: 'parent-1' });

    await expect(
      transferCoupon('LX-ABCDEFGHIJ', 'other-1', PARENT)
    ).rejects.toThrow('无权将券转让给其他用户');

    expect(mockCouponUpdate).not.toHaveBeenCalled();
  });

  it('普通用户可以解绑自己的券（转成通用券）', async () => {
    mockCoupon({ userId: 'parent-1' });

    await transferCoupon('LX-ABCDEFGHIJ', null, PARENT);

    expect(mockCouponUpdate).toHaveBeenCalledWith({
      where: { code: 'LX-ABCDEFGHIJ' },
      data: { userId: null },
    });
  });

  it('管理员可以把券转给指定用户', async () => {
    await transferCoupon('LX-ABCDEFGHIJ', 'other-1', ADMIN);

    expect(mockUserFind).toHaveBeenCalledWith({
      where: { id: 'other-1' },
      select: { id: true },
    });
    expect(mockCouponUpdate).toHaveBeenCalledWith({
      where: { code: 'LX-ABCDEFGHIJ' },
      data: { userId: 'other-1' },
    });
  });

  it('管理员转给不存在的用户应报错且不写库', async () => {
    mockUserFind.mockResolvedValue(null);

    await expect(
      transferCoupon('LX-ABCDEFGHIJ', 'ghost', ADMIN)
    ).rejects.toThrow('目标用户不存在');

    expect(mockCouponUpdate).not.toHaveBeenCalled();
  });

  it('券不存在时报错', async () => {
    mockCouponFind.mockResolvedValue(null);

    await expect(
      transferCoupon('LX-NOTEXIST', null, ADMIN)
    ).rejects.toThrow('券码不存在');

    expect(mockCouponUpdate).not.toHaveBeenCalled();
  });

  it('已使用的券不能转让', async () => {
    mockCoupon({ status: 'used', userId: 'parent-1' });

    await expect(
      transferCoupon('LX-ABCDEFGHIJ', null, PARENT)
    ).rejects.toThrow('券码已使用，不能转让');

    expect(mockCouponUpdate).not.toHaveBeenCalled();
  });

  it('已过期的券不能转让', async () => {
    mockCoupon({
      userId: 'parent-1',
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(
      transferCoupon('LX-ABCDEFGHIJ', null, PARENT)
    ).rejects.toThrow('券码已过期，不能转让');

    expect(mockCouponUpdate).not.toHaveBeenCalled();
  });
});
