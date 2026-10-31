// 运行时计分配置构建
//
// 2026-11-01：从 src/lib/services/assessment.service.ts 原样提取。
// 提取原因：跨视角对比（src/lib/report/session-comparison.ts）需要在运行时
// 按角色现场推导计分配置，而 assessment.service.ts 里的这个函数是私有的。
//
// ⚠️ 本文件是**生产计分路径**：提交测评时算分走的就是这里。
//    签名与行为必须与提取前逐字一致，任何改动都会影响全部线上报告。
//
// 说明：返回的 questionnaireType 固定写死为 'parent'（提取前的老行为）。
//   该字段只是元数据，计分器（calculateAllDimensionScores）只读 axes，
//   不参与计算，因此对 student / teacher 卷沿用它没有任何副作用。
//   需要标注真实角色时，由调用方在返回后覆盖该字段（见 session-comparison.ts）。

import type { Questionnaire, Question, ScoringConfig, ScoringAxisConfig } from '@/types/questionnaire';

/**
 * 按问卷声明的维度与轴顺序，推导运行时计分配置。
 *
 * 轴顺序很重要：axes 数组里同一维度的第一个 axis 记为纵轴（axis1），
 * 第二个记为横轴（axis2）——象限判定依赖这个顺序。
 */
export function buildScoringConfig(
  questionnaire: Questionnaire,
  questions: Question[]
): ScoringConfig {
  const axes: ScoringAxisConfig[] = [];
  const reverseQuestions: string[] = [];

  for (const dimension of questionnaire.dimensions) {
    const axis1Id = typeof dimension.axes[0] === 'string' ? dimension.axes[0] : dimension.axes[0].id;
    const axis2Id = typeof dimension.axes[1] === 'string' ? dimension.axes[1] : dimension.axes[1].id;

    const axis1Questions = questions.filter(
      (q) => q.dimensionId === dimension.id && q.axisId === axis1Id
    );
    const axis2Questions = questions.filter(
      (q) => q.dimensionId === dimension.id && q.axisId === axis2Id
    );

    if (axis1Questions.length > 0) {
      axes.push({
        axisId: axis1Id,
        questionIds: axis1Questions.map((q) => q.id),
      });
      axis1Questions.filter((q) => q.reverse).forEach((q) => reverseQuestions.push(q.id));
    }

    if (axis2Questions.length > 0) {
      axes.push({
        axisId: axis2Id,
        questionIds: axis2Questions.map((q) => q.id),
      });
      axis2Questions.filter((q) => q.reverse).forEach((q) => reverseQuestions.push(q.id));
    }
  }

  return {
    stageId: questionnaire.stageId,
    questionnaireType: 'parent',
    axes,
    reverseQuestions,
  };
}
