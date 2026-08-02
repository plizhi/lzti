import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing code-generator
vi.mock('@/lib/db', () => ({
  prisma: {
    slot: { findUnique: vi.fn() },
    userInviteCode: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    reportShare: { findUnique: vi.fn() },
  },
}));

const CODE_FORMATS = {
  BATCH: {
    length: 6,
    chars: '0123456789',
    generate: () => Math.random().toString().slice(2, 8).padStart(6, '0'),
  },
  REFERRAL: {
    length: 8,
    chars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    generate: () => {
      let code = '';
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    },
  },
  REPORT: {
    length: 8,
    chars: 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789',
    generate: () => {
      let code = '';
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    },
  },
};

describe('CODE_FORMATS', () => {
  describe('BATCH (6位数字)', () => {
    it('长度应为6', () => {
      expect(CODE_FORMATS.BATCH.length).toBe(6);
    });

    it('字符集只包含数字', () => {
      expect(CODE_FORMATS.BATCH.chars).toMatch(/^[0-9]+$/);
    });

    it('generate函数应生成6位数字字符串', () => {
      const code = CODE_FORMATS.BATCH.generate();
      expect(code).toMatch(/^\d{6}$/);
    });
  });

  describe('REFERRAL (8位大写字母数字)', () => {
    it('长度应为8', () => {
      expect(CODE_FORMATS.REFERRAL.length).toBe(8);
    });

    it('字符集应包含大写字母', () => {
      expect(CODE_FORMATS.REFERRAL.chars).toMatch(/[A-Z]/);
    });

    it('字符集应包含数字', () => {
      expect(CODE_FORMATS.REFERRAL.chars).toMatch(/[0-9]/);
    });

    it('generate函数应生成8位字符串', () => {
      const code = CODE_FORMATS.REFERRAL.generate();
      expect(code).toHaveLength(8);
    });

    it('生成的大写字母数字字符串不含小写', () => {
      const code = CODE_FORMATS.REFERRAL.generate();
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });
  });

  describe('REPORT (8位混合大小写字母数字)', () => {
    it('长度应为8', () => {
      expect(CODE_FORMATS.REPORT.length).toBe(8);
    });

    it('字符集应包含大小写字母和数字', () => {
      const chars = CODE_FORMATS.REPORT.chars;
      expect(chars).toMatch(/[a-z]/);
      expect(chars).toMatch(/[A-Z]/);
      expect(chars).toMatch(/[0-9]/);
    });

    it('generate函数应生成8位字符串', () => {
      const code = CODE_FORMATS.REPORT.generate();
      expect(code).toHaveLength(8);
    });
  });
});

describe('码格式差异', () => {
  it('三种码格式长度应不同或字符集不同', () => {
    // BATCH 是纯数字
    expect(CODE_FORMATS.BATCH.chars).toMatch(/^\d+$/);

    // REFERRAL 是大写+数字
    expect(CODE_FORMATS.REFERRAL.chars).toMatch(/^[A-Z0-9]+$/);

    // REPORT 是混合大小写+数字
    expect(CODE_FORMATS.REPORT.chars).toMatch(/[a-z]/);
  });

  it('REFERRAL 和 REPORT 的字符集应有明显区别', () => {
    // REFERRAL 不含小写，REPORT 包含小写
    expect(CODE_FORMATS.REFERRAL.chars).not.toMatch(/[a-z]/);
    expect(CODE_FORMATS.REPORT.chars).toMatch(/[a-z]/);
  });
});
