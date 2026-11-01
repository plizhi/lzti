// 兜底修复的回归测试（2026-10-31）
//
// 背景：
//   calculator.ts 曾把「某个轴一道题都没答上」静默兜底成 3 分（= 中性）。
//   而象限判定是 `score > 3` 为高 —— 3.0 不大于 3 → 落「双差」→ 报告判成「最需要主动关注」。
//
//   生产库那 3 条 attempt 的 answers 键是**旧题号** q1..q15，与当前题号对不上，
//   于是每个轴都是兜底值 3.0 → 三个维度全部「双差」→ 风险等级 critical。
//   报告会对一堆**算废了的**数据说「最需要主动关注」。
//
// 本测试锁死三件事：
//   ① 「没有数据」≠「数据是中性」：信息不足的维度不产生分数、不落象限
//   ② 信息不足的维度不进报告的 currentStatus、不进风险等级、不进对比
//   ③ 正常数据（题号全部对得上）行为完全不变 —— 这是回归保护
import { describe, it, expect } from 'vitest';
import { questionnaires } from '@/data/questionnaires';
import {
  calculateAllDimensionScores,
  determineQuadrantType,
} from '@/lib/scoring/calculator';
import { determineAllQuadrants } from '@/lib/scoring/quadrant';
import { generateSingleReport, generateParentChildReport } from '@/lib/report/generator';
import type { Questionnaire, Question, ScoringConfig } from '@/types/questionnaire';

const STAGE = 'primary-low' as const;

/**
 * 复刻 assessment.service.ts 的 buildScoringConfig()（生产真正用的那条路径）。
 * 逐行对照 src/lib/services/assessment.service.ts 的 buildScoringConfig。
 */
function buildScoringConfigLikeRuntime(
  questionnaire: Questionnaire,
  questions: Question[],
): ScoringConfig {
  const axes: { axisId: string; questionIds: string[] }[] = [];
  const reverseQuestions: string[] = [];

  for (const dimension of questionnaire.dimensions) {
    const axis1Id = typeof dimension.axes[0] === 'string' ? dimension.axes[0] : dimension.axes[0].id;
    const axis2Id = typeof dimension.axes[1] === 'string' ? dimension.axes[1] : dimension.axes[1].id;

    const axis1Questions = questions.filter((q) => q.dimensionId === dimension.id && q.axisId === axis1Id);
    const axis2Questions = questions.filter((q) => q.dimensionId === dimension.id && q.axisId === axis2Id);

    if (axis1Questions.length > 0) {
      axes.push({ axisId: axis1Id, questionIds: axis1Questions.map((q) => q.id) });
      axis1Questions.filter((q) => q.reverse).forEach((q) => reverseQuestions.push(q.id));
    }
    if (axis2Questions.length > 0) {
      axes.push({ axisId: axis2Id, questionIds: axis2Questions.map((q) => q.id) });
      axis2Questions.filter((q) => q.reverse).forEach((q) => reverseQuestions.push(q.id));
    }
  }

  return { stageId: questionnaire.stageId, questionnaireType: 'parent', axes, reverseQuestions };
}

const questionnaire = questionnaires[STAGE];
const parentQuestions = questionnaire.parentQuestions ?? [];
const parentConfig = buildScoringConfigLikeRuntime(questionnaire, parentQuestions);

/** 全部题都答「最低分」的答案集（题号与当前问卷完全对得上） */
function fullAnswers(value = 1): Record<string, number> {
  const answers: Record<string, number> = {};
  for (const q of parentQuestions) answers[q.id] = value;
  return answers;
}

describe('兜底修复：没有数据 ≠ 中性', () => {
  it('① 题号全对不上（旧题号事故）→ 一个维度都不产生分数，也不落象限', () => {
    // 模拟生产库那 3 条废记录：键是旧题号 q1..q15
    const legacyAnswers: Record<string, number> = {};
    for (let i = 1; i <= 15; i++) legacyAnswers[`q${i}`] = 3;

    const { scores } = calculateAllDimensionScores(parentConfig, parentQuestions, legacyAnswers);

    // 关键：以前这里是 {axis1: 3, axis2: 3}，现在应该是空
    expect(Object.keys(scores)).toHaveLength(0);

    const quadrants = determineAllQuadrants(scores);
    expect(Object.keys(quadrants)).toHaveLength(0);
  });

  it('① 部分维度有数据 → 只有有数据的维度产生分数', () => {
    const firstDimension = questionnaire.dimensions[0];
    const answers: Record<string, number> = {};
    for (const q of parentQuestions) {
      if (q.dimensionId === firstDimension.id) answers[q.id] = 4;
    }

    const { scores } = calculateAllDimensionScores(parentConfig, parentQuestions, answers);

    expect(Object.keys(scores)).toEqual([firstDimension.id]);
    expect(scores[firstDimension.id].axis1).toBeGreaterThan(0);
  });

  it('② 信息不足的维度不进报告 currentStatus，也不进风险等级', () => {
    const firstDimension = questionnaire.dimensions[0];
    const answers: Record<string, number> = {};
    for (const q of parentQuestions) {
      if (q.dimensionId === firstDimension.id) answers[q.id] = 1;
    }

    const report = generateSingleReport(
      questionnaire,
      parentConfig,
      answers,
      'test-attempt-1',
      'parent'
    );

    // 只有那一个有数据的维度进报告
    expect(report.currentStatus.map((s) => s.dimensionId)).toEqual([firstDimension.id]);
    // 其余维度既不在 currentStatus，也不在 suggestions
    for (const dim of questionnaire.dimensions.slice(1)) {
      expect(report.currentStatus.find((s) => s.dimensionId === dim.id)).toBeUndefined();
      expect(report.suggestions.find((s) => s.dimensionId === dim.id)).toBeUndefined();
    }
    // 报告里不能出现「假中性 3 分」
    for (const s of report.currentStatus) {
      expect(s.scores.axis1).not.toBe(3);
      expect(s.scores.axis2).not.toBe(3);
    }
  });

  it('② 全是废数据时，报告不产生任何维度，也不判成 critical', () => {
    const legacyAnswers: Record<string, number> = {};
    for (let i = 1; i <= 15; i++) legacyAnswers[`q${i}`] = 3;

    const report = generateSingleReport(
      questionnaire,
      parentConfig,
      legacyAnswers,
      'test-attempt-2',
      'parent'
    );

    expect(report.currentStatus).toHaveLength(0);
    expect(report.suggestions).toHaveLength(0);
    // 以前这里是 critical（三个维度全被兜底成双差）
    expect(report.trajectory.riskLevel).not.toBe('critical');
    // ⚠️ 也不能是 low：一个维度都没有时 `optimal.length === total`（0===0）会成立
    //    → 判成 low → 报告显示「整体状态良好」。「什么都没测到」≠「状态良好」。
    expect(report.trajectory.riskLevel).not.toBe('low');
    expect(report.trajectory.predictedPath).toContain('没有有效数据');
  });

  it('② 对比报告跳过数据不完整的维度，不产生「家长认为是""」这种垃圾文案', () => {
    const firstDimension = questionnaire.dimensions[0];
    const studentQuestions = questionnaire.studentQuestions ?? [];

    // 家长卷与学生卷的题号不同，必须分别按各自的题号填答案
    const parentAnswers: Record<string, number> = {};
    for (const q of parentQuestions) {
      if (q.dimensionId === firstDimension.id) parentAnswers[q.id] = 4;
    }
    const studentAnswers: Record<string, number> = {};
    for (const q of studentQuestions) {
      if (q.dimensionId === firstDimension.id) studentAnswers[q.id] = 4;
    }

    const studentConfig = buildScoringConfigLikeRuntime(questionnaire, studentQuestions);

    const report = generateParentChildReport(
      questionnaire,
      parentConfig,
      studentConfig,
      parentAnswers,
      studentAnswers,
      'parent-attempt',
      'student-attempt'
    );

    expect(report.comparisonStatuses.map((s) => s.dimensionId)).toEqual([firstDimension.id]);
    for (const s of report.comparisonSuggestions) {
      expect(s.differenceDescription).not.toContain('家长认为是""');
    }
  });

  it('③ 正常数据行为不变：全部维度照常落象限、分数正确', () => {
    const answers = fullAnswers(4);
    const { scores } = calculateAllDimensionScores(parentConfig, parentQuestions, answers);

    // 每个维度都有分数，且都是真实均分（不是兜底的 3）
    expect(Object.keys(scores).sort()).toEqual(
      questionnaire.dimensions.map((d) => d.id).sort()
    );
    for (const dim of questionnaire.dimensions) {
      const s = scores[dim.id];
      expect(s).toBeDefined();
      expect(s.axis1).toBeGreaterThan(0);
      expect(s.axis2).toBeGreaterThan(0);
    }

    // 象限判定仍然可用
    const s = scores[questionnaire.dimensions[0].id];
    expect(['optimal', 'strategy', 'passive', 'overwhelmed']).toContain(
      determineQuadrantType(s.axis1, s.axis2)
    );
  });

  it('③ 正常数据：报告里每个维度都在，riskLevel 按真实象限算', () => {
    const answers = fullAnswers(1); // 全最低分 → 真实的最差情况
    const report = generateSingleReport(
      questionnaire,
      parentConfig,
      answers,
      'test-attempt-3',
      'parent'
    );

    expect(report.currentStatus).toHaveLength(questionnaire.dimensions.length);
    // 真实的最差情况仍应判为高风险 —— 兜底修复不能把「真的差」也放过
    expect(['critical', 'high']).toContain(report.trajectory.riskLevel);
  });
});
