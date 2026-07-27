import { describe, it, expect } from 'vitest';
import { generateSingleReport } from '@/lib/report/generator';
import { primaryLowQuestionnaire } from '@/data/questionnaires/primary-low';
import { primaryLowParentScoring } from '@/data/questionnaires/primary-low';

// 家长问卷题目 ID
// learning-interest: p-li-1 ~ p-li-6
// basic-habits: p-bh-1 ~ p-bh-6
// emotional-adaptation: p-ea-1 ~ p-ea-6

// 模拟答案：全部 high (5分)
// 注意：ea-1, ea-2, ea-3 是反向题，给 1 分才能得到实际高分（6-1=5）
const allHighAnswers: Record<string, number> = {
  'p-li-1': 5, 'p-li-2': 5, 'p-li-3': 5, 'p-li-4': 5, 'p-li-5': 5, 'p-li-6': 5,
  'p-bh-1': 5, 'p-bh-2': 5, 'p-bh-3': 5, 'p-bh-4': 5, 'p-bh-5': 5, 'p-bh-6': 5,
  'p-ea-1': 1, 'p-ea-2': 1, 'p-ea-3': 1, // 反向题给低分，实际高分
  'p-ea-4': 5, 'p-ea-5': 5, 'p-ea-6': 5,
};

// 模拟答案：全部 low (1分)
// 反向题给 5 分才能得到实际低分（6-5=1）
const allLowAnswers: Record<string, number> = {
  'p-li-1': 1, 'p-li-2': 1, 'p-li-3': 1, 'p-li-4': 1, 'p-li-5': 1, 'p-li-6': 1,
  'p-bh-1': 1, 'p-bh-2': 1, 'p-bh-3': 1, 'p-bh-4': 1, 'p-bh-5': 1, 'p-bh-6': 1,
  'p-ea-1': 5, 'p-ea-2': 5, 'p-ea-3': 5, // 反向题给高分，实际低分
  'p-ea-4': 1, 'p-ea-5': 1, 'p-ea-6': 1,
};

// 模拟答案：混合（有些维度高有些低）
const mixedAnswers: Record<string, number> = {
  // 学习兴趣高
  'p-li-1': 5, 'p-li-2': 5, 'p-li-3': 4, 'p-li-4': 5, 'p-li-5': 5, 'p-li-6': 4,
  // 习惯较好
  'p-bh-1': 4, 'p-bh-2': 4, 'p-bh-3': 4, 'p-bh-4': 4, 'p-bh-5': 4, 'p-bh-6': 4,
  // 情绪占据度高（被reverse，所以高分表示情绪占据度低）
  'p-ea-1': 4, 'p-ea-2': 4, 'p-ea-3': 4,
  // 情绪表达好
  'p-ea-4': 5, 'p-ea-5': 4, 'p-ea-6': 4,
};

describe('generateSingleReport', () => {
  it('should generate report with suggestions when quadrant is overwhelmed or passive', () => {
    const report = generateSingleReport(
      primaryLowQuestionnaire,
      primaryLowParentScoring,
      mixedAnswers,
      'test-attempt-id',
      'parent'
    );

    // mixedAnswers 有几个维度是 low 的，应该生成 suggestions
    expect(report.suggestions).toBeDefined();
    expect(Array.isArray(report.suggestions)).toBe(true);
  });

  it('should not generate suggestions for all optimal quadrants', () => {
    const report = generateSingleReport(
      primaryLowQuestionnaire,
      primaryLowParentScoring,
      allHighAnswers,
      'test-attempt-id',
      'parent'
    );

    // 全部 high 分应该是 optimal，不需要建议
    expect(report.suggestions.length).toBe(0);
  });

  it('should generate suggestions for overwhelmed quadrant', () => {
    const report = generateSingleReport(
      primaryLowQuestionnaire,
      primaryLowParentScoring,
      allLowAnswers,
      'test-attempt-id',
      'parent'
    );

    // 全部 low 分应该是 overwhelmed 或 passive，需要建议
    expect(report.suggestions.length).toBeGreaterThan(0);
    // overwhelmed 应该标记为 high priority
    const overwhelmedSuggestions = report.suggestions.filter(
      s => s.quadrantType === 'overwhelmed'
    );
    if (overwhelmedSuggestions.length > 0) {
      expect(overwhelmedSuggestions.every(s => s.priority === 'high')).toBe(true);
    }
  });

  it('should generate valid trajectory with risk assessment', () => {
    const report = generateSingleReport(
      primaryLowQuestionnaire,
      primaryLowParentScoring,
      allHighAnswers,
      'test-attempt-id',
      'parent'
    );

    expect(report.trajectory).toBeDefined();
    expect(report.trajectory.riskLevel).toBeDefined();
    expect(['low', 'medium', 'high', 'critical']).toContain(report.trajectory.riskLevel);
    expect(report.trajectory.predictedPath).toBeTruthy();
    expect(typeof report.trajectory.predictedPath).toBe('string');
  });

  it('should assign low risk for all optimal quadrants', () => {
    const report = generateSingleReport(
      primaryLowQuestionnaire,
      primaryLowParentScoring,
      allHighAnswers,
      'test-attempt-id',
      'parent'
    );

    expect(report.trajectory.riskLevel).toBe('low');
  });

  it('should assign higher risk for overwhelmed quadrants', () => {
    const report = generateSingleReport(
      primaryLowQuestionnaire,
      primaryLowParentScoring,
      allLowAnswers,
      'test-attempt-id',
      'parent'
    );

    // 全部 low 应该是 overwhelmed 或更高风险
    expect(['high', 'critical']).toContain(report.trajectory.riskLevel);
  });

  it('should include protective factors in trajectory', () => {
    const report = generateSingleReport(
      primaryLowQuestionnaire,
      primaryLowParentScoring,
      mixedAnswers,
      'test-attempt-id',
      'parent'
    );

    expect(report.trajectory.protectiveFactors).toBeDefined();
    expect(Array.isArray(report.trajectory.protectiveFactors)).toBe(true);
  });

  it('should include currentStatus for all dimensions', () => {
    const report = generateSingleReport(
      primaryLowQuestionnaire,
      primaryLowParentScoring,
      allHighAnswers,
      'test-attempt-id',
      'parent'
    );

    expect(report.currentStatus).toBeDefined();
    expect(report.currentStatus.length).toBe(primaryLowQuestionnaire.dimensions.length);
  });

  it('should have valid quadrant names in currentStatus', () => {
    const report = generateSingleReport(
      primaryLowQuestionnaire,
      primaryLowParentScoring,
      allHighAnswers,
      'test-attempt-id',
      'parent'
    );

    for (const status of report.currentStatus) {
      expect(status.quadrantType).toBeTruthy();
      expect(['optimal', 'strategy', 'passive', 'overwhelmed']).toContain(status.quadrantType);
      expect(status.quadrantName).toBeTruthy();
      expect(status.scores).toBeDefined();
      expect(status.scores.axis1).toBeGreaterThanOrEqual(1);
      expect(status.scores.axis1).toBeLessThanOrEqual(5);
      expect(status.scores.axis2).toBeGreaterThanOrEqual(1);
      expect(status.scores.axis2).toBeLessThanOrEqual(5);
    }
  });
});
