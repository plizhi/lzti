// 分享报告页「跨视角对比」区的渲染测试
//
// 2026-11-01 新增。锁住朋大大拍板的两条硬要求：
//   1. 这个区**每份报告都要显示** —— 哪怕只有 1 个视角也不能整块消失
//   2. 第一份（单一视角）报告里要有关注引导和建设性建议，不能是空白
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComparisonSection } from '@/app/shared/report/[shareCode]/ComparisonSection';

const single = {
  kind: 'none' as const,
  completedRoles: ['parent' as const],
  missingRoles: ['student' as const, 'teacher' as const],
  note: '本场已完成 1/3 个视角（家长观察）。',
  singleView: {
    role: 'parent' as const,
    roleLabel: '家长观察',
    attemptId: 'a-p',
    dimensions: [
      {
        dimensionId: 'learning-interest',
        dimensionName: '学习兴趣',
        level: 'maintain',
        levelLabel: '保持现状',
        quadrantType: 'optimal',
        quadrantName: '探索坚持型',
        focus: '状态良好，保持现在的支持方式即可。',
      },
    ],
    suggestions: [],
  },
};

describe('ComparisonSection', () => {
  it('单视角状态：渲染进度 + 初步判断声明 + 关注引导', () => {
    render(<ComparisonSection comparison={single} />);
    expect(screen.getByText(/跨视角对比/)).toBeTruthy();
    expect(screen.getByText(/本场已完成 1\/3 个视角/)).toBeTruthy();
    expect(screen.getByText(/初步判断/)).toBeTruthy();
    expect(screen.getByText('学习兴趣')).toBeTruthy();
    expect(screen.getByText(/保持现在的支持方式即可/)).toBeTruthy();
  });

  it('两方状态：渲染一致/差异标记与差异原因', () => {
    const two = {
      kind: 'two-roles' as const,
      completedRoles: ['parent' as const, 'teacher' as const],
      missingRoles: ['student' as const],
      roles: ['parent' as const, 'teacher' as const],
      note: '',
      report: {
        comparisonStatuses: [
          {
            dimensionId: 'learning-interest',
            dimensionName: '学习兴趣',
            isConsistent: false,
            parent: { quadrantType: 'optimal', quadrantName: '探索坚持型', scores: { axis1: 5, axis2: 5 } },
            teacher: { quadrantType: 'overwhelmed', quadrantName: '督促依赖型', scores: { axis1: 1, axis2: 1 } },
          },
        ],
        comparisonSuggestions: [
          {
            dimensionId: 'learning-interest',
            dimensionName: '学习兴趣',
            differenceDescription: '家长认为是"探索坚持型"，老师评价为"督促依赖型"',
            possibleReasons: ['观察场景不同'],
            suggestions: ['找一个具体场景一起回顾'],
            priority: 'high',
          },
        ],
        highlights: [],
        developmentAreas: [],
        skippedDimensions: [],
      },
    };
    render(<ComparisonSection comparison={two} />);
    expect(screen.getByText('差异')).toBeTruthy();
    expect(screen.getByText(/家长观察「探索坚持型」/)).toBeTruthy();
    expect(screen.getByText(/教师评价「督促依赖型」/)).toBeTruthy();
    expect(screen.getByText(/观察场景不同/)).toBeTruthy();
  });

  it('三方状态：渲染共识维度 + 家校差异', () => {
    const three = {
      kind: 'home-school' as const,
      completedRoles: ['parent' as const, 'student' as const, 'teacher' as const],
      missingRoles: [],
      roles: ['parent' as const, 'student' as const, 'teacher' as const],
      note: '',
      report: {
        comparisonStatuses: [
          {
            dimensionId: 'emotional-adaptation',
            dimensionName: '情绪适应',
            isConsistent: true,
            parent: { quadrantType: 'optimal', quadrantName: '通透调节型', scores: { axis1: 5, axis2: 5 } },
            student: { quadrantType: 'optimal', quadrantName: '通透调节型', scores: { axis1: 5, axis2: 5 } },
            teacher: { quadrantType: 'optimal', quadrantName: '通透调节型', scores: { axis1: 5, axis2: 5 } },
          },
        ],
        comparisonSuggestions: [],
        highlights: [{ dimensionId: 'emotional-adaptation', description: '在"情绪适应"上三方一致' }],
        developmentAreas: [],
        consensusDimensions: ['emotional-adaptation'],
        homeSchoolDifferences: [
          { dimensionId: 'basic-habits', homePerformance: '习惯养成型', schoolPerformance: '督促依赖型' },
        ],
      },
    };
    render(<ComparisonSection comparison={three} />);
    expect(screen.getByText(/三方共识维度/)).toBeTruthy();
    expect(screen.getByText(/家校差异/)).toBeTruthy();
    expect(screen.getByText(/家庭「习惯养成型」/)).toBeTruthy();
    expect(screen.getByText('一致')).toBeTruthy();
  });

  it('跳过维度要列出明细和原因（老师整卷中性 → 对比为空时看报告的人不会以为坏了）', () => {
    const withSkipped = {
      kind: 'home-school' as const,
      completedRoles: ['parent' as const, 'student' as const, 'teacher' as const],
      missingRoles: [],
      roles: ['parent' as const, 'student' as const, 'teacher' as const],
      note: '本场已完成 3/3 个视角。',
      report: {
        comparisonStatuses: [],
        comparisonSuggestions: [],
        highlights: [],
        developmentAreas: [],
        consensusDimensions: [],
        homeSchoolDifferences: [],
        skippedDimensions: [
          { dimensionId: 'basic-habits', dimensionName: '基础习惯', reason: 'neutral' as const, missingRole: 'teacher' as const },
          { dimensionId: 'goal-action', dimensionName: '目标行动力', reason: 'incomplete' as const, missingRole: 'student' as const },
        ],
      },
    };
    render(<ComparisonSection comparison={withSkipped} />);
    expect(screen.getByText(/未纳入对比/)).toBeTruthy();
    expect(screen.getByText(/基础习惯/)).toBeTruthy();
    expect(screen.getByText(/数据接近中性，没有明显倾向/)).toBeTruthy();
    expect(screen.getByText(/目标行动力/)).toBeTruthy();
    expect(screen.getByText(/缺少数据/)).toBeTruthy();
  });
});
