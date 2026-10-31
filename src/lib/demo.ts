import { ApiError } from '@/lib/api/response';
import { prisma } from '@/lib/db';

/**
 * 演示模式（demo mode）
 *
 * 演示形态：**一个 demo 账号 + 六个学段入口**（朋大大 2026-10-31 拍板）。
 *
 * 识别方式：靠环境变量里的手机号比对，不动数据库结构。
 *   DEMO_USER_PHONE=19900000000   （只配在 lzti-dev 的 .env）
 *
 * 为什么不用数据库字段：
 *   - 生产库零 DDL，不需要迁移，不需要授权动生产
 *   - 生产环境不设这个变量 → 生产永远进不了演示模式
 *   - 演示账号本来就固定，换号时改一行 env 即可
 */

export const DEMO_USER_PHONE_DEFAULT = '19900000000';

/**
 * 取当前环境配置的演示账号手机号。
 *
 * ⚠️ 没配就是空字符串 → 演示模式整体关闭。
 * 这是故意的：生产环境不配 DEMO_USER_PHONE，就永远不会误进演示模式。
 * 默认值只写在 seed 和文档里，不做运行时兜底。
 */
export function demoPhone(): string {
  return (process.env.DEMO_USER_PHONE ?? '').trim();
}

/** 手机号是否是演示账号 */
export function isDemoPhone(phone: string | null | undefined): boolean {
  const target = demoPhone();
  if (!target || !phone) return false;
  return phone === target;
}

/** 设备绑定的账号是不是演示账号 */
export async function isDemoDevice(userId: string): Promise<boolean> {
  const target = demoPhone();
  if (!target) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true },
  });
  if (!user) return false;
  return isDemoPhone(user.phone);
}

/**
 * 设备不在演示模式 → 403。
 * 演示专用接口一律走这个，保证真实用户流量碰不到演示数据。
 */
export async function requireDemoDevice(userId: string): Promise<void> {
  if (!(await isDemoDevice(userId))) {
    throw new ApiError('该接口仅演示账号可用', 403);
  }
}

/** 演示模式的性别输入：设备端只给两个选项 */
export const DEMO_GENDERS = ['MALE', 'FEMALE'] as const;
export type DemoGender = (typeof DEMO_GENDERS)[number];

const GENDER_LABEL: Record<string, string> = {
  MALE: '男',
  FEMALE: '女',
  OTHER: '其他',
};

/** 归一化性别输入（大小写、中英文都吃），认不出来返回 null */
export function normalizeDemoGender(input: unknown): DemoGender | null {
  if (typeof input !== 'string') return null;
  const v = input.trim().toUpperCase();
  if (v === 'MALE' || v === '男' || v === 'BOY') return 'MALE';
  if (v === 'FEMALE' || v === '女' || v === 'GIRL') return 'FEMALE';
  return null;
}

/** 性别中文标签 */
export function genderLabel(gender: string | null | undefined): string {
  if (!gender) return '未填';
  return GENDER_LABEL[gender.toUpperCase()] ?? gender;
}
