import { describe, it, expect, vi } from 'vitest';

// auth-portal 引入了 db 模块，测试不需要真实连接
vi.mock('@/lib/db', () => ({
  prisma: {},
}));

import { normalizePhone } from '@/lib/auth-portal';

describe('normalizePhone', () => {
  it('should strip the +86 country code', () => {
    expect(normalizePhone('+8613800000001')).toBe('13800000001');
    expect(normalizePhone('8613800000001')).toBe('13800000001');
    expect(normalizePhone('+86 138 0000 0001')).toBe('13800000001');
  });

  it('should keep a plain 11-digit number unchanged', () => {
    expect(normalizePhone('13800000001')).toBe('13800000001');
    expect(normalizePhone('19912345678')).toBe('19912345678');
  });

  it('should return null for empty input', () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });

  it('should not strip a non-86 country code', () => {
    // 别的国家码不能当 86 剥掉，否则会凭空造出一个国内号码
    expect(normalizePhone('+14155552671')).toBe('14155552671');
  });
});

