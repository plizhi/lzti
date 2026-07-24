// 计分引擎
// 参考规格书：
// - 5点量表：1=完全不符合，2=不太符合，3=有时符合，4=比较符合，5=完全符合
// - 反向题自动转换：1→5, 2→4, 4→2, 5→1（3保持不变）
// - 轴得分 = 该轴所有题目得分的算数平均数
// - 象限判定：以3分为中线，>3为偏向二，≤3为偏向一
// - 雷达图展示时标准化到0-100

import type { Question, ScoringConfig } from '@/types/questionnaire';
import type { DimensionAnswers, DimensionScores } from '@/types/assessment';

/**
 * 将反向题得分转换为正向得分
 * 1→5, 2→4, 4→2, 5→1（3保持不变）
 */
function reverseScore(score: number): number {
  if (score === 3) return 3;
  return 6 - score;
}

/**
 * 计算单个题目的有效得分（处理反向题）
 */
function getEffectiveScore(question: Question, answer: number): number {
  return question.reverse ? reverseScore(answer) : answer;
}

/**
 * 计算单个轴的原始均分（1-5范围）
 * @param questionIds 轴对应的题目ID列表
 * @param questions 完整题目列表
 * @param answers 用户答案
 */
function calculateAxisRawScore(
  questionIds: string[],
  questions: Question[],
  answers: Record<string, number>
): number {
  if (questionIds.length === 0) return 3;

  let total = 0;
  let count = 0;

  for (const qId of questionIds) {
    const question = questions.find((q) => q.id === qId);
    if (!question) continue;

    const answer = answers[qId];
    if (answer === undefined) continue;

    total += getEffectiveScore(question, answer);
    count++;
  }

  if (count === 0) return 3;
  return total / count;
}

/**
 * 将原始得分(1-5)标准化到(0-100)
 */
function normalizeScore(rawScore: number): number {
  return ((rawScore - 1) / 4) * 100;
}

/**
 * 计算单个维度的双轴得分
 * @param axisQuestionIds [纵轴题目ID列表, 横轴题目ID列表]
 * @param questions 完整题目列表
 * @param answers 用户答案
 * @returns 原始均分（用于象限判定）和标准化分数（用于雷达图）
 */
export function calculateDimensionScores(
  axisQuestionIds: [string[], string[]],
  questions: Question[],
  answers: Record<string, number>
): { raw: { axis1: number; axis2: number }; normalized: { axis1: number; axis2: number } } {
  const [axis1QuestionIds, axis2QuestionIds] = axisQuestionIds;

  const axis1Raw = calculateAxisRawScore(axis1QuestionIds, questions, answers);
  const axis2Raw = calculateAxisRawScore(axis2QuestionIds, questions, answers);

  return {
    raw: { axis1: axis1Raw, axis2: axis2Raw },
    normalized: {
      axis1: normalizeScore(axis1Raw),
      axis2: normalizeScore(axis2Raw),
    },
  };
}

/**
 * 根据计分配置计算所有维度得分
 */
export function calculateAllDimensionScores(
  scoringConfig: ScoringConfig,
  questions: Question[],
  answers: Record<string, number>
): {
  scores: DimensionScores;
  // 同时返回标准化分数用于雷达图
  normalizedScores: DimensionScores;
} {
  const scores: DimensionScores = {};
  const normalizedScores: DimensionScores = {};

  for (const axisConfig of scoringConfig.axes) {
    const question = questions.find((q) => q.id === axisConfig.questionIds[0]);
    if (!question) continue;

    const dimensionId = question.dimensionId;

    // 查找该维度的两个轴
    const dimensionAxes = scoringConfig.axes.filter(
      (ac) => questions.find((q) => q.id === ac.questionIds[0])?.dimensionId === dimensionId
    );

    if (dimensionAxes.length < 2) continue;

    // 确定纵轴和横轴（第一个为纵轴，第二个为横轴）
    const [axis1Config, axis2Config] = dimensionAxes;

    const result = calculateDimensionScores(
      [axis1Config.questionIds, axis2Config.questionIds],
      questions,
      answers
    );

    // 原始分数用于象限判定
    scores[dimensionId] = {
      axis1: result.raw.axis1,
      axis2: result.raw.axis2,
    };

    // 标准化分数用于雷达图
    normalizedScores[dimensionId] = {
      axis1: result.normalized.axis1,
      axis2: result.normalized.axis2,
    };
  }

  return { scores, normalizedScores };
}

/**
 * 判定象限类型
 * @param axis1Score 纵轴原始均分（1-5）
 * @param axis2Score 横轴原始均分（1-5）
 * @param threshold 判定阈值，默认3
 */
export function determineQuadrantType(
  axis1Score: number,
  axis2Score: number,
  threshold: number = 3
): 'optimal' | 'strategy' | 'passive' | 'overwhelmed' {
  const axis1High = axis1Score > threshold;
  const axis2High = axis2Score > threshold;

  // 四象限排列：
  // 纵轴(好奇探索/自动化/情绪占据度)为Y轴，正向在上
  // 横轴(坚持完成/执行有序/情绪表达)为X轴，正向在右
  //
  //           | axis2高（横轴正向）| axis2低（横轴负向）
  // axis1高   |   optimal(右上)    |   strategy(左上)
  // axis1低   |   overwhelmed(右下)|   passive(左下)

  if (axis1High && axis2High) return 'optimal';
  if (!axis1High && axis2High) return 'overwhelmed';
  if (!axis1High && !axis2High) return 'passive';
  return 'strategy';
}
