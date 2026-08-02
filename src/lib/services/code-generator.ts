import { prisma } from '@/lib/db';

// 码格式定义
export const CODE_FORMATS = {
  // 6位数字 - 批次邀请码
  BATCH: {
    length: 6,
    chars: '0123456789',
    generate: () => Math.random().toString().slice(2, 8).padStart(6, '0'),
  },
  // 8位大写字母数字 - 用户推荐码
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
  // 8位混合大小写字母数字 - 报告分享码
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
} as const;

type CodeType = keyof typeof CODE_FORMATS;

type ExistsChecker = (code: string) => Promise<boolean>;

function generateRandomCode(format: (typeof CODE_FORMATS)[CodeType]): string {
  return format.generate();
}

function generateFallbackCode(format: (typeof CODE_FORMATS)[CodeType]): string {
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.random().toString().slice(2, 6);
  return `${timestamp}${random}`.slice(0, format.length);
}

/**
 * 统一码生成器
 * @param type - 码类型
 * @param checkExists - 唯一性检查函数
 */
async function generateCode(
  type: CodeType,
  checkExists: ExistsChecker
): Promise<string> {
  const format = CODE_FORMATS[type];
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateRandomCode(format);
    if (!(await checkExists(code))) {
      return code;
    }
  }

  // 兜底：时间戳+随机
  return generateFallbackCode(format);
}

// ==================== 公开函数 ====================

/**
 * 生成批次邀请码（6位数字）
 */
export async function generateBatchCode(): Promise<string> {
  return generateCode('BATCH', async (code) => {
    const exists =
      (await prisma.slot.findUnique({ where: { code } })) ||
      (await prisma.userInviteCode.findUnique({ where: { code } }));
    return !!exists;
  });
}

/**
 * 生成用户推荐码（8位大写字母数字）
 */
export async function generateReferralCode(): Promise<string> {
  return generateCode('REFERRAL', async (code) => {
    const exists = await prisma.user.findUnique({ where: { shareCode: code } });
    return !!exists;
  });
}

/**
 * 生成报告分享码（8位混合大小写字母数字）
 */
export async function generateReportShareCode(): Promise<string> {
  return generateCode('REPORT', async (code) => {
    const exists = await prisma.reportShare.findUnique({
      where: { shareCode: code },
    });
    return !!exists;
  });
}
