// 验证报告层的严重度方向是否与语义坐标一致
//
// 约定 Q（2026-11-01 朋大大拍板，见 src/lib/scoring/quadrant-geometry.ts）：
//   双差（纵低横低，最差）→ overwhelmed → riskLevel = critical（需主动关注）
//   差好（纵低横高，偏科）→ passive      → riskLevel = high（需引导）
//
// 做法：直接复刻 generator.ts 的 calculateTrajectory 逻辑（逐行对照源码），
//       用真实计分器算出象限，再跑风险算法。
// ⚠️ 本文件不要再硬编码「象限编号 ↔ 语义坐标」的对照表 —— 那份副本就是
//    「过期真相」：约定一变它会绿着骗人。统一读生产真值表 QUADRANT_COORDINATE。
import { describe, it, expect } from 'vitest';
import type { Axis } from '@/types/questionnaire';
import { questionnaires } from '@/data/questionnaires';
import { calculateAllDimensionScores, determineQuadrantType } from '@/lib/scoring/calculator';
import { coordinateOf, QUADRANT_COORDINATE } from '@/lib/scoring/quadrant-geometry';
import { primaryLowStudentScoring } from '@/data/questionnaires/primary-low/scoring';
import { primaryHighStudentScoring } from '@/data/questionnaires/primary-high/scoring';
import { middleSchoolStudentScoring } from '@/data/questionnaires/middle-school/scoring';
import { junior3StudentScoring } from '@/data/questionnaires/junior-3/scoring';
import { senior1StudentScoring } from '@/data/questionnaires/senior-1/scoring';
import { senior3StudentScoring } from '@/data/questionnaires/senior-3/scoring';

const CONFIGS: Record<string, any> = {
  'primary-low': primaryLowStudentScoring,
  'primary-high': primaryHighStudentScoring,
  'junior-1': middleSchoolStudentScoring,
  'junior-3': junior3StudentScoring,
  'senior-1': senior1StudentScoring,
  'senior-3': senior3StudentScoring,
};

/** 复刻 generator.ts calculateTrajectory 的风险算法（逐行对照 src/lib/report/generator.ts:89-100） */
function riskLevelOf(quadrantCounts: Record<string, number>): {
  riskLevel: string;
  overwhelmedCount: number;
  passiveCount: number;
} {
  const overwhelmedDimensions = quadrantCounts['overwhelmed'] ?? 0;
  const passiveDimensions = quadrantCounts['passive'] ?? 0;
  const optimalDimensions = quadrantCounts['optimal'] ?? 0;
  const strategyDimensions = quadrantCounts['strategy'] ?? 0;
  const total = Object.values(quadrantCounts).reduce((a, b) => a + b, 0);

  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  if (overwhelmedDimensions >= 2) riskLevel = 'critical';
  else if (overwhelmedDimensions === 1 && total >= 3) riskLevel = 'high';
  else if (overwhelmedDimensions === 1 || passiveDimensions >= 2) riskLevel = 'high';
  else if (optimalDimensions === total) riskLevel = 'low';
  else if (strategyDimensions === total && optimalDimensions > 0) riskLevel = 'low';

  return { riskLevel, overwhelmedCount: overwhelmedDimensions, passiveCount: passiveDimensions };
}

/** 构造答案：让每个维度的轴1 得 low 分、轴2 得 high 分（纵低横高 = 偏科） */
function buildAnswersFor(stage: string, axis1Raw: number, axis2Raw: number) {
  const q = questionnaires[stage as keyof typeof questionnaires];
  const cfg = CONFIGS[stage];
  const questions = [
    ...(q.studentQuestions ?? []),
    ...(q.parentQuestions ?? []),
    ...(q.teacherQuestions ?? []),
  ];
  const answers: Record<string, number> = {};
  for (const qq of questions) answers[qq.id] = 1; // 先全 1
  // 按 scoring 的轴归属，覆盖 axis2 的题
  for (const ax of cfg.axes) {
    if (ax.axisId === undefined) continue;
    for (const qid of ax.questionIds) {
      const qq = questions.find((x) => x.id === qid);
      if (!qq) continue;
      // 找到该题属于哪个维度、哪个轴序
      answers[qid] = qq.axisId === ax.axisId ? 1 : 1;
    }
  }
  return { questions, answers, cfg };
}

describe('报告层严重度方向', () => {
  it('场景 A：双低（两轴都最差）→ 落 overwhelmed → riskLevel', () => {
    const out: string[] = [];
    let worstLevel = '';
    for (const [stage, cfg] of Object.entries(CONFIGS)) {
      const q = questionnaires[stage as keyof typeof questionnaires];
      const questions = [
        ...(q.studentQuestions ?? []),
        ...(q.parentQuestions ?? []),
        ...(q.teacherQuestions ?? []),
      ];
      // 全部答 1 → 有反向题的维度会得 5 分，所以要构造"两轴都低"的答案
      const answers: Record<string, number> = {};
      for (const qq of questions) answers[qq.id] = qq.reverse ? 5 : 1;
      const { scores } = calculateAllDimensionScores(cfg, questions, answers);
      const counts: Record<string, number> = {};
      for (const dim of q.dimensions) {
        const s = scores[dim.id];
        if (!s) continue;
        const qid = determineQuadrantType(s.axis1, s.axis2);
        counts[qid] = (counts[qid] ?? 0) + 1;
      }
      const r = riskLevelOf(counts);
      out.push(
        `  ${stage.padEnd(14)} 象限分布=${JSON.stringify(counts)} → riskLevel=${r.riskLevel}`,
      );
      if (r.riskLevel === 'critical') worstLevel = 'critical';
    }
    console.log('\n【场景 A：孩子两轴都最差】\n' + out.join('\n'));
    console.log(`\n  → 最差场景出现 critical？${worstLevel === 'critical' ? '是' : '否'}`);
  });

  it('场景 B：纵低横高（偏科）→ 落 passive → riskLevel', () => {
    const out: string[] = [];
    let gotCritical = false;
    for (const [stage, cfg] of Object.entries(CONFIGS)) {
      const q = questionnaires[stage as keyof typeof questionnaires];
      const questions = [
        ...(q.studentQuestions ?? []),
        ...(q.parentQuestions ?? []),
        ...(q.teacherQuestions ?? []),
      ];
      // 逐维度构造：轴1 的题答"低"，轴2 的题答"高"
      const answers: Record<string, number> = {};
      for (const ax of cfg.axes) {
        // 找该轴属于哪个维度：取该轴第一题的 dimensionId
        const firstQ = questions.find((x) => x.id === ax.questionIds[0]);
        if (!firstQ) continue;
        const dim = q.dimensions.find((d) => d.id === firstQ.dimensionId);
        if (!dim) continue;
        const axisIdOf = (a: Axis | string) => (typeof a === 'string' ? a : a.id);
        const isAxis1 = dim.axes[0] !== undefined && axisIdOf(dim.axes[0]) === ax.axisId;
        for (const qid of ax.questionIds) {
          const qq = questions.find((x) => x.id === qid);
          if (!qq) continue;
          // 低 = 原始 1（若反向题则原始 5）；高 = 原始 5（若反向题则原始 1）
          const wantHigh = !isAxis1;
          answers[qid] = wantHigh ? (qq.reverse ? 1 : 5) : (qq.reverse ? 5 : 1);
        }
      }
      const { scores } = calculateAllDimensionScores(cfg, questions, answers);
      const counts: Record<string, number> = {};
      let coordCheck: Record<string, number> = {};
      for (const dim of q.dimensions) {
        const s = scores[dim.id];
        if (!s) continue;
        const qid = determineQuadrantType(s.axis1, s.axis2);
        counts[qid] = (counts[qid] ?? 0) + 1;
        const c = coordinateOf(s.axis1, s.axis2);
        coordCheck[c] = (coordCheck[c] ?? 0) + 1;
      }
      const r = riskLevelOf(counts);
      out.push(
        `  ${stage.padEnd(14)} 象限=${JSON.stringify(counts)} 坐标=${JSON.stringify(coordCheck)} → riskLevel=${r.riskLevel}`,
      );
      if (r.riskLevel === 'critical') gotCritical = true;
    }
    console.log('\n【场景 B：一头弱一头强（偏科）】\n' + out.join('\n'));
    console.log(`\n  → 偏科场景出现 critical？${gotCritical ? '是' : '否'}`);
  });

  it('对照：象限 id 与语义坐标的映射 == 生产真值表', () => {
    // 约定 Q：双差 = overwhelmed（最差，红 / critical）；差好 = passive（需引导）
    // 唯一真源 = src/lib/scoring/quadrant-geometry.ts 的 QUADRANT_COORDINATE
    console.log('\n【象限 id vs 生产真值表坐标】');
    for (const id of ['optimal', 'strategy', 'passive', 'overwhelmed'] as const) {
      console.log(`  ${id.padEnd(12)} 代码坐标=${QUADRANT_COORDINATE[id]}`);
    }
    expect(QUADRANT_COORDINATE.optimal).toBe('高高');
    expect(QUADRANT_COORDINATE.strategy).toBe('好差');
    expect(QUADRANT_COORDINATE.overwhelmed).toBe('双差');
    expect(QUADRANT_COORDINATE.passive).toBe('差好');
  });
});
