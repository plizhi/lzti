// 维度得分计算器

import type { Question, Questionnaire } from '@/types/questionnaire';
import type { DimensionAnswers, DimensionScores } from '@/types/assessment';

/**
 * 计算单条轴的得分
 */
function calculateAxisScore(questions: Question[], answers: Record<string, number>): number {
  if (questions.length === 0) return 50;

  let total = 0;
  for (const q of questions) {
    const answer = answers[q.id] ?? 3;
    total += q.reverse ? 6 - answer : answer;
  }

  return total / questions.length;
}

/**
 * 将原始得分 (1-5) 标准化到 (0-100)
 */
function normalizeScore(rawScore: number): number {
  return ((rawScore - 1) / 4) * 100;
}

/**
 * 计算单个维度的双轴得分
 */
export function calculateDimensionScore(
  questions: Question[],
  answers: Record<string, number>,
  axis1Id: string,
  axis2Id: string
): { axis1: number; axis2: number } {
  const axis1Questions = questions.filter((q) => q.axisId === axis1Id);
  const axis2Questions = questions.filter((q) => q.axisId === axis2Id);

  const axis1Raw = calculateAxisScore(axis1Questions, answers);
  const axis2Raw = calculateAxisScore(axis2Questions, answers);

  return {
    axis1: normalizeScore(axis1Raw),
    axis2: normalizeScore(axis2Raw),
  };
}

/**
 * 计算所有维度的得分
 */
export function calculateAllDimensionScores(
  questionnaire: Questionnaire,
  answers: DimensionAnswers
): DimensionScores {
  const scores: DimensionScores = {};

  for (const dimension of questionnaire.dimensions) {
    const dimensionQuestions = (questionnaire.studentQuestions ?? questionnaire.questions ?? []).filter(
      (q) => q.dimensionId === dimension.id
    );

    if (dimensionQuestions.length === 0) continue;

    const dimensionAnswers = answers[dimension.id] ?? {};
    const [axis1Id, axis2Id] = dimension.axes;

    scores[dimension.id] = calculateDimensionScore(
      dimensionQuestions,
      dimensionAnswers,
      axis1Id,
      axis2Id
    );
  }

  return scores;
}
