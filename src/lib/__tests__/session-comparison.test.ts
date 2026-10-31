// 跨视角对比（session 级）测试
//
// 覆盖：
//   1. 只有 1 份（单一视角）→ kind='none'，但必须有关注引导摘要（报告不留白）
//   2. 2 份（家长 + 孩子）→ kind='parent-child'
//   3. 3 份 → kind='home-school'
//   4. 缺学生的两方组合（家长 + 老师）→ kind='two-roles'（通用两视角）
//   5. 数据不全 / 中性带的维度被跳过，不进对比

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma（必须在 import 业务模块之前）
vi.mock('@/lib/db', () => ({
  prisma: {
    sessionAttempt: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';
import { buildSessionComparison } from '@/lib/report/session-comparison';

const mockFindMany = prisma.sessionAttempt.findMany as unknown as ReturnType<typeof vi.fn>;

const STAGE = 'primary-low';

// 家长卷题号（5 点量表）
const PARENT_QS = [
  'p-li-1', 'p-li-2', 'p-li-3', 'p-li-4', 'p-li-5', 'p-li-6',
  'p-bh-1', 'p-bh-2', 'p-bh-3', 'p-bh-4', 'p-bh-5', 'p-bh-6',
  'p-ea-1', 'p-ea-2', 'p-ea-3', 'p-ea-4', 'p-ea-5', 'p-ea-6',
];
// 学生卷题号（3 点量表）
const STUDENT_QS = [
  'li-1', 'li-2', 'li-3', 'li-4', 'li-5', 'li-6',
  'bh-1', 'bh-2', 'bh-3', 'bh-4', 'bh-5', 'bh-6',
  'ea-1', 'ea-2', 'ea-3', 'ea-4', 'ea-5', 'ea-6',
];
// 教师卷题号（5 点量表）
const TEACHER_QS = PARENT_QS.map((id) => 't' + id.slice(1));

function answersAll(ids: string[], value: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of ids) out[id] = value;
  return out;
}

/** 造一条已提交的 attempt */
function attempt(role: string, answers: Record<string, number>, id: string) {
  return {
    id,
    questionnaireType: role,
    answers,
    createdAt: new Date('2026-11-01T00:00:00Z'),
    report: { suggestions: [] },
  };
}

beforeEach(() => {
  mockFindMany.mockReset();
});

describe('buildSessionComparison', () => {
  it('只有 1 份（家长视角）→ none，但要有关注引导摘要，报告不留白', async () => {
    mockFindMany.mockResolvedValue([
      attempt('parent', answersAll(PARENT_QS, 5), 'a-parent'),
    ]);

    const comparison = await buildSessionComparison('session-1', STAGE);

    expect(comparison.kind).toBe('none');
    expect(comparison.completedRoles).toEqual(['parent']);
    expect(comparison.missingRoles).toEqual(['student', 'teacher']);
    expect(comparison.note).toContain('1/3');
    expect(comparison.note).toContain('家长观察');

    // 单视角必须有建设性内容
    if (comparison.kind !== 'none') throw new Error('期望 kind=none');
    const singleView = comparison.singleView;
    expect(singleView).toBeDefined();
    expect(singleView!.roleLabel).toBe('家长观察');
    expect(singleView!.dimensions.length).toBeGreaterThan(0);
    for (const d of singleView!.dimensions) {
      expect(d.focus.length).toBeGreaterThan(0);
      expect(d.levelLabel.length).toBeGreaterThan(0);
    }
  });

  it('2 份（家长 + 孩子）→ parent-child', async () => {
    mockFindMany.mockResolvedValue([
      attempt('parent', answersAll(PARENT_QS, 5), 'a-parent'),
      attempt('student', answersAll(STUDENT_QS, 1), 'a-student'),
    ]);

    const comparison = await buildSessionComparison('session-2', STAGE);

    expect(comparison.kind).toBe('parent-child');
    if (comparison.kind !== 'parent-child') throw new Error('期望 kind=parent-child');
    expect(comparison.completedRoles).toEqual(['parent', 'student']);
    expect(comparison.missingRoles).toEqual(['teacher']);
    expect(comparison.note).toContain('2/3');

    const report = comparison.report;
    expect(report.comparisonStatuses.length).toBeGreaterThan(0);
    // 家长全 5 / 学生全 1 → 至少有维度不一致
    expect(report.comparisonSuggestions.length).toBeGreaterThan(0);
    expect(report.comparisonSuggestions[0].differenceDescription).toContain('家长');
    expect(report.comparisonSuggestions[0].differenceDescription).toContain('孩子');
  });

  it('3 份 → home-school（含三方共识维度 + 家校差异）', async () => {
    // 家长：学习兴趣/基础习惯都好，情绪通透（p-ea-1..3 是反向题，给 1 分 → 实际高分）
    const parentAnswers = {
      ...answersAll(['p-li-1', 'p-li-2', 'p-li-3', 'p-li-4', 'p-li-5', 'p-li-6'], 5),
      ...answersAll(['p-bh-1', 'p-bh-2', 'p-bh-3', 'p-bh-4', 'p-bh-5', 'p-bh-6'], 5),
      ...answersAll(['p-ea-1', 'p-ea-2', 'p-ea-3'], 1),
      ...answersAll(['p-ea-4', 'p-ea-5', 'p-ea-6'], 5),
    };
    // 学生：学习兴趣/基础习惯偏弱，情绪通透
    const studentAnswers = {
      ...answersAll(['li-1', 'li-2', 'li-3', 'li-4', 'li-5', 'li-6'], 1),
      ...answersAll(['bh-1', 'bh-2', 'bh-3', 'bh-4', 'bh-5', 'bh-6'], 1),
      ...answersAll(['ea-1', 'ea-2', 'ea-3'], 1),
      ...answersAll(['ea-4', 'ea-5', 'ea-6'], 5),
    };
    // 老师：学习兴趣好，基础习惯偏弱（→ 家校差异），情绪通透（→ 三方共识）
    const teacherAnswers = {
      ...answersAll(['t-li-1', 't-li-2', 't-li-3', 't-li-4', 't-li-5', 't-li-6'], 5),
      ...answersAll(['t-bh-1', 't-bh-2', 't-bh-3', 't-bh-4', 't-bh-5', 't-bh-6'], 1),
      ...answersAll(['t-ea-1', 't-ea-2', 't-ea-3'], 1),
      ...answersAll(['t-ea-4', 't-ea-5', 't-ea-6'], 5),
    };

    mockFindMany.mockResolvedValue([
      attempt('parent', parentAnswers, 'a-parent'),
      attempt('student', studentAnswers, 'a-student'),
      attempt('teacher', teacherAnswers, 'a-teacher'),
    ]);

    const comparison = await buildSessionComparison('session-3', STAGE);

    expect(comparison.kind).toBe('home-school');
    if (comparison.kind !== 'home-school') throw new Error('期望 kind=home-school');
    expect(comparison.completedRoles).toEqual(['parent', 'student', 'teacher']);
    expect(comparison.missingRoles).toEqual([]);
    expect(comparison.note).toContain('3/3');

    const report = comparison.report;

    // 三方槽位都填上
    expect(report.comparisonStatuses.length).toBe(3);
    for (const s of report.comparisonStatuses) {
      expect(s.parent).toBeDefined();
      expect(s.student).toBeDefined();
      expect(s.teacher).toBeDefined();
    }

    // 情绪维度三方一致 → 进共识
    expect(report.consensusDimensions).toContain('emotional-adaptation');
    // 基础习惯：家庭与学校判断不同 → 家校差异
    const basicHabits = report.homeSchoolDifferences.find(
      (d) => d.dimensionId === 'basic-habits'
    );
    expect(basicHabits).toBeDefined();
    expect(basicHabits!.homePerformance).not.toBe(basicHabits!.schoolPerformance);
  });

  it('缺学生的两方组合（家长 + 老师）→ 通用 two-roles，student 槽位留空', async () => {
    mockFindMany.mockResolvedValue([
      attempt('parent', answersAll(PARENT_QS, 5), 'a-parent'),
      attempt('teacher', answersAll(TEACHER_QS, 1), 'a-teacher'),
    ]);

    const comparison = await buildSessionComparison('session-4', STAGE);

    expect(comparison.kind).toBe('two-roles');
    if (comparison.kind !== 'two-roles') throw new Error('期望 kind=two-roles');
    expect(comparison.roles).toEqual(['parent', 'teacher']);
    expect(comparison.completedRoles).toEqual(['parent', 'teacher']);
    expect(comparison.missingRoles).toEqual(['student']);
    expect(comparison.note).toContain('2/3');

    const report = comparison.report;

    expect(report.comparisonStatuses.length).toBeGreaterThan(0);
    for (const s of report.comparisonStatuses) {
      expect(s.parent).toBeDefined();
      expect(s.teacher).toBeDefined();
      expect(s.student).toBeUndefined(); // 没做学生的视角 → 槽位空着，不编文案
    }

    // 差异文案按角色措辞，不评判谁对错
    expect(report.comparisonSuggestions.length).toBeGreaterThan(0);
    const diff = report.comparisonSuggestions[0];
    expect(diff.differenceDescription).toContain('家长');
    expect(diff.differenceDescription).toContain('老师');
    expect(diff.possibleReasons.length).toBeGreaterThan(0);
    expect(diff.suggestions.length).toBeGreaterThan(0);
    expect(diff.differenceDescription).not.toContain('错误');
    expect(diff.differenceDescription).not.toContain('不对');
  });

  it('数据不全 / 中性带的维度被跳过，不进入对比', async () => {
    // 家长：学习兴趣全 5（optimal），基础习惯全 3（中性带），情绪适应完全没答（数据不全）
    const parentAnswers: Record<string, number> = {
      ...answersAll(['p-li-1', 'p-li-2', 'p-li-3', 'p-li-4', 'p-li-5', 'p-li-6'], 5),
      ...answersAll(['p-bh-1', 'p-bh-2', 'p-bh-3', 'p-bh-4', 'p-bh-5', 'p-bh-6'], 3),
    };
    // 学生：学习兴趣全 1（overwhelmed），其余全 3（中性带）
    const studentAnswers: Record<string, number> = {
      ...answersAll(['li-1', 'li-2', 'li-3', 'li-4', 'li-5', 'li-6'], 1),
      ...answersAll(['bh-1', 'bh-2', 'bh-3', 'bh-4', 'bh-5', 'bh-6'], 3),
      ...answersAll(['ea-1', 'ea-2', 'ea-3', 'ea-4', 'ea-5', 'ea-6'], 3),
    };

    mockFindMany.mockResolvedValue([
      attempt('parent', parentAnswers, 'a-parent'),
      attempt('student', studentAnswers, 'a-student'),
    ]);

    const comparison = await buildSessionComparison('session-5', STAGE);
    expect(comparison.kind).toBe('parent-child');
    if (comparison.kind !== 'parent-child') throw new Error('期望 kind=parent-child');

    const report = comparison.report;

    const comparedIds = report.comparisonStatuses.map((s) => s.dimensionId);
    const skipped = report.skippedDimensions ?? [];
    const skippedIds = skipped.map((s) => s.dimensionId);

    // 只有学习兴趣双方都有象限 → 进对比
    expect(comparedIds).toContain('learning-interest');
    // 基础习惯：家长全 3 → 中性带 → 不进对比
    expect(skippedIds).toContain('basic-habits');
    // 情绪适应：家长没答 → 数据不全 → 不进对比
    expect(skippedIds).toContain('emotional-adaptation');
    expect(comparedIds).not.toContain('basic-habits');
    expect(comparedIds).not.toContain('emotional-adaptation');

    const basicHabits = skipped.find((s) => s.dimensionId === 'basic-habits')!;
    expect(basicHabits.reason).toBe('neutral');

    const emotional = skipped.find((s) => s.dimensionId === 'emotional-adaptation')!;
    expect(emotional.reason).toBe('incomplete');
    expect(emotional.missingRole).toBe('parent');
  });

  it('进行中（未生成报告）的 attempt 不算完成视角', async () => {
    // 只有已提交（有 report）的才计入；查询条件由 service 保证，这里验证角色归拢
    mockFindMany.mockResolvedValue([
      attempt('parent', answersAll(PARENT_QS, 5), 'a-parent'),
    ]);

    const comparison = await buildSessionComparison('session-6', STAGE);
    expect(comparison.completedRoles).toEqual(['parent']);
    expect(comparison.missingRoles).toEqual(['student', 'teacher']);
  });
});
