import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    sessionAttempt: { count: vi.fn() },
  },
}));

import { normalizePhone } from '@/lib/auth-portal';
import { isFirstAttemptInSession } from '@/lib/services/assessment.service';
import { prisma } from '@/lib/db';

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

describe('isFirstAttemptInSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be true when the session has no attempt yet', async () => {
    vi.mocked(prisma.sessionAttempt.count).mockResolvedValue(0);
    await expect(isFirstAttemptInSession('session-1')).resolves.toBe(true);
    expect(prisma.sessionAttempt.count).toHaveBeenCalledWith({
      where: { sessionId: 'session-1' },
    });
  });

  it('should be false once another perspective of the session has been submitted', async () => {
    vi.mocked(prisma.sessionAttempt.count).mockResolvedValue(1);
    await expect(isFirstAttemptInSession('session-1')).resolves.toBe(false);
  });

  it('should be false after all three perspectives are submitted', async () => {
    vi.mocked(prisma.sessionAttempt.count).mockResolvedValue(3);
    await expect(isFirstAttemptInSession('session-1')).resolves.toBe(false);
  });
});
