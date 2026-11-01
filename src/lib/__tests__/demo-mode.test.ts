import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma before importing demo module
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    child: { create: vi.fn() },
  },
}));

import {
  demoPhone,
  isDemoPhone,
  isDemoDevice,
  requireDemoDevice,
  normalizeDemoGender,
  genderLabel,
} from '@/lib/demo';
import { resolveNextType, getNextQuestionnaireType, getQuestionsForType } from '@/lib/questionnaire-flow';
import { prisma } from '@/lib/db';

const OLD_ENV = process.env.DEMO_USER_PHONE;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DEMO_USER_PHONE = '19900000000';
});

afterEach(() => {
  if (OLD_ENV === undefined) delete process.env.DEMO_USER_PHONE;
  else process.env.DEMO_USER_PHONE = OLD_ENV;
});

describe('demo 账号识别', () => {
  it('没配 DEMO_USER_PHONE 时演示模式整体关闭', () => {
    delete process.env.DEMO_USER_PHONE;
    expect(demoPhone()).toBe('');
    expect(isDemoPhone('19900000000')).toBe(false);
  });

  it('配了就只认那一个手机号', () => {
    expect(isDemoPhone('19900000000')).toBe(true);
    expect(isDemoPhone('13800138000')).toBe(false);
    expect(isDemoPhone(null)).toBe(false);
    expect(isDemoPhone(undefined)).toBe(false);
  });

  it('isDemoDevice 按账号绑定的手机号判断', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ phone: '19900000000' } as never);
    await expect(isDemoDevice('user-1')).resolves.toBe(true);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({ phone: '13800138000' } as never);
    await expect(isDemoDevice('user-1')).resolves.toBe(false);
  });

  it('非演示设备访问演示接口 → 403', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ phone: '13800138000' } as never);
    await expect(requireDemoDevice('user-1')).rejects.toThrow('仅演示账号可用');
  });

  it('演示设备访问 → 放行', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ phone: '19900000000' } as never);
    await expect(requireDemoDevice('user-1')).resolves.toBeUndefined();
  });
});

describe('性别归一化', () => {
  it('中英文大小写都吃', () => {
    expect(normalizeDemoGender('male')).toBe('MALE');
    expect(normalizeDemoGender('MALE')).toBe('MALE');
    expect(normalizeDemoGender('男')).toBe('MALE');
    expect(normalizeDemoGender(' female ')).toBe('FEMALE');
    expect(normalizeDemoGender('女')).toBe('FEMALE');
  });

  it('认不出来返回 null', () => {
    expect(normalizeDemoGender('other')).toBeNull();
    expect(normalizeDemoGender('')).toBeNull();
    expect(normalizeDemoGender(undefined)).toBeNull();
    expect(normalizeDemoGender(123)).toBeNull();
  });

  it('标签可读', () => {
    expect(genderLabel('MALE')).toBe('男');
    expect(genderLabel('female')).toBe('女');
    expect(genderLabel(null)).toBe('未填');
  });
});

describe('三视角顺序', () => {
  it('家长→学生→教师', () => {
    expect(getNextQuestionnaireType('parent')).toBe('student');
    expect(getNextQuestionnaireType('student')).toBe('teacher');
    expect(getNextQuestionnaireType('teacher')).toBeNull();
  });

  it('resolveNextType：已完成的视角跳过', () => {
    expect(resolveNextType({ parent: false, student: false, teacher: false })).toBe('parent');
    expect(resolveNextType({ parent: true, student: false, teacher: false })).toBe('student');
    expect(resolveNextType({ parent: true, student: true, teacher: false })).toBeNull();
    expect(resolveNextType({ parent: true, student: true, teacher: true })).toBeNull();
  });

  it('resolveNextType：老师卷默认不算在设备流程里', () => {
    expect(
      resolveNextType({ parent: true, student: false, teacher: false }, { includeTeacher: true })
    ).toBe('student');
  });

  it('取题：老问卷只有 questions 时兜底', () => {
    const q = { id: 'q1', text: '题目', dimensionId: 'd1', axisId: 'a1', reverse: false };
    const old = { id: 'x', stageId: 'primary-low', name: 'x', dimensions: [], questions: [q] };
    expect(getQuestionsForType(old, 'parent')).toEqual([q]);
    expect(getQuestionsForType(old, 'student')).toEqual([q]);
  });
});
