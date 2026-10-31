// 复核：端到端实证结论是否受 scoring.ts 是死配置的影响？
//
// 背景：2026-10-31 核实到 src/data/questionnaires/*/scoring.ts 在生产链路零引用，
//   运行时走 assessment.service.ts 的 buildScoringConfig()（按 questionnaire.ts 现场推导）。
//   而 e2e-report-output.test.ts 用的是 scoring.ts。
//
// 问题：两者轴序若不同，实证结论（14/22 错位）是否会变？
//
// 做法：同一场景分别用两种配置跑，比对象限判定结果是否一致。
import { describe, it, expect } from 'vitest';
import { questionnaires } from '@/data/questionnaires';
import { calculateAllDimensionScores, determineQuadrantType } from '@/lib/scoring/calculator';
import { primaryLowStudentScoring } from '@/data/questionnaires/primary-low/scoring';
import { primaryHighStudentScoring } from '@/data/questionnaires/primary-high/scoring';
import { middleSchoolStudentScoring } from '@/data/questionnaires/middle-school/scoring';
import { junior3StudentScoring } from '@/data/questionnaires/junior-3/scoring';
import { senior1StudentScoring } from '@/data/questionnaires/senior-1/scoring';
import { senior3StudentScoring } from '@/data/questionnaires/senior-3/scoring';
import type { StageId } from '@/types/stage';
import type { Questionnaire, Question, ScoringConfig } from '@/types/questionnaire';

const CONFIGS: Record<string, ScoringConfig> = {
  'primary-low': primaryLowStudentScoring, 'primary-high': primaryHighStudentScoring,
  'junior-1': middleSchoolStudentScoring, 'junior-3': junior3StudentScoring,
  'senior-1': senior1StudentScoring, 'senior-3': senior3StudentScoring,
};
const STAGES: StageId[] = ['primary-low','primary-high','junior-1','junior-3','senior-1','senior-3'];

/** 复刻 assessment.service.ts buildScoringConfig()（生产真正用的那条路径） */
function runtimeScoringConfig(questionnaire: Questionnaire, questions: Question[]): ScoringConfig {
  const axes: { axisId: string; questionIds: string[] }[] = [];
  const reverseQuestions: string[] = [];
  for (const dimension of questionnaire.dimensions) {
    const a1 = typeof dimension.axes[0] === 'string' ? dimension.axes[0] : dimension.axes[0].id;
    const a2 = typeof dimension.axes[1] === 'string' ? dimension.axes[1] : dimension.axes[1].id;
    const q1 = questions.filter((q) => q.dimensionId === dimension.id && q.axisId === a1);
    const q2 = questions.filter((q) => q.dimensionId === dimension.id && q.axisId === a2);
    if (q1.length) { axes.push({ axisId: a1, questionIds: q1.map(q=>q.id) }); q1.filter(q=>q.reverse).forEach(q=>reverseQuestions.push(q.id)); }
    if (q2.length) { axes.push({ axisId: a2, questionIds: q2.map(q=>q.id) }); q2.filter(q=>q.reverse).forEach(q=>reverseQuestions.push(q.id)); }
  }
  return { stageId: questionnaire.stageId, questionnaireType: 'parent', axes, reverseQuestions };
}

describe('scoring.ts（参考配置） vs 运行时配置（buildScoringConfig）', () => {
  it('两种配置算出的象限判定完全一致 → e2e 实证结论不受影响', () => {
    const diffs: string[] = [];
    for (const stage of STAGES) {
      const q = questionnaires[stage];
      const questions = q.studentQuestions ?? [];
      const ref = CONFIGS[stage];
      const runtime = runtimeScoringConfig(q, questions);

      for (const answerValue of [1, 3, 4, 5]) {
        const answers: Record<string, number> = {};
        for (const qq of questions) answers[qq.id] = qq.reverse ? (answerValue === 5 ? 1 : 5) : answerValue;

        const refScores = calculateAllDimensionScores(ref, questions, answers).scores;
        const rtScores = calculateAllDimensionScores(runtime, questions, answers).scores;

        for (const dim of q.dimensions) {
          const a = refScores[dim.id];
          const b = rtScores[dim.id];
          if (!a || !b) continue;
          const qa = determineQuadrantType(a.axis1, a.axis2);
          const qb = determineQuadrantType(b.axis1, b.axis2);
          if (qa !== qb || a.axis1 !== b.axis1 || a.axis2 !== b.axis2) {
            diffs.push(
              `${stage}/${dim.id} 全选${answerValue}: 参考配置(${a.axis1.toFixed(2)},${a.axis2.toFixed(2)}→${qa}) ` +
              `vs 运行时(${b.axis1.toFixed(2)},${b.axis2.toFixed(2)}→${qb})`,
            );
          }
        }
      }
    }
    console.log(diffs.length === 0
      ? '\n  ✓ 两种配置在 6 学段 × 4 场景下象限判定完全一致 → e2e 实证结论成立'
      : '\n  差异:\n' + diffs.join('\n'));
    expect(diffs).toEqual([]);
  });
});
