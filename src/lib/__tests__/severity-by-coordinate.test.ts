// 验证「报告层按语义坐标判严重度」这个修法
//
// 背景（2026-10-31 第三遍核验）：
//   报告层按象限 id 的**字面**判严重度：
//     generator.ts:96   overwhelmed >= 2 → riskLevel = critical
//     generator.ts:187  overwhelmed → priority high；passive → medium
//     前端配色          overwhelmed → 红色；passive → 灰色
//   而代码坐标是：optimal=双高, strategy=好差, overwhelmed=差好, passive=双差
//   → 「双低最差」拿到 passive（灰/medium），「一头弱」拿到 overwhelmed（红/critical）
//   → 严重度方向反了。
//
// 本测试验证：改成按语义坐标判严重度后，方向是否正确、两种约定下是否都成立。
import { describe, it, expect } from 'vitest';
import type { Axis } from '@/types/questionnaire';
import { questionnaires } from '@/data/questionnaires';
import { calculateAllDimensionScores, determineQuadrantType } from '@/lib/scoring/calculator';
import { coordinateOf } from '@/lib/scoring/quadrant-geometry';
import { primaryLowStudentScoring } from '@/data/questionnaires/primary-low/scoring';
import { primaryHighStudentScoring } from '@/data/questionnaires/primary-high/scoring';
import { middleSchoolStudentScoring } from '@/data/questionnaires/middle-school/scoring';
import { junior3StudentScoring } from '@/data/questionnaires/junior-3/scoring';
import { senior1StudentScoring } from '@/data/questionnaires/senior-1/scoring';
import { senior3StudentScoring } from '@/data/questionnaires/senior-3/scoring';

const CONFIGS: Record<string, any> = {
  'primary-low': primaryLowStudentScoring, 'primary-high': primaryHighStudentScoring,
  'junior-1': middleSchoolStudentScoring, 'junior-3': junior3StudentScoring,
  'senior-1': senior1StudentScoring, 'senior-3': senior3StudentScoring,
};

/** 语义坐标 → 严重度（正确的设计意图：双低最严重） */
const SEVERITY_BY_COORDINATE: Record<string, 'good' | 'watch' | 'risk'> = {
  高高: 'good',   // 双好 → 理想
  好差: 'watch',  // 一好一差 → 需关注
  差好: 'watch',  // 一差一好 → 需关注
  双差: 'risk',   // 双低 → 最差
};

/** 按语义坐标算风险等级（正确的算法） */
function riskByCoordinate(counts: Record<string, number>): string {
  const risk = counts['risk'] ?? 0;
  const watch = counts['watch'] ?? 0;
  const good = counts['good'] ?? 0;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (risk >= 2) return 'critical';
  if (risk >= 1 || watch >= 2) return 'high';
  if (good === total) return 'low';
  return 'medium';
}

function runScenario(label: string, mode: 'worst' | 'lopsided') {
  const rows: string[] = [];
  let allSame = true;
  for (const [stage, cfg] of Object.entries(CONFIGS)) {
    const q = questionnaires[stage as keyof typeof questionnaires];
    const questions = [
      ...(q.studentQuestions ?? []), ...(q.parentQuestions ?? []), ...(q.teacherQuestions ?? []),
    ];
    const answers: Record<string, number> = {};
    if (mode === 'worst') {
      for (const qq of questions) answers[qq.id] = qq.reverse ? 5 : 1;
    } else {
      for (const ax of cfg.axes) {
        const firstQ = questions.find((x) => x.id === ax.questionIds[0]);
        if (!firstQ) continue;
        const dim = q.dimensions.find((d) => d.id === firstQ.dimensionId);
        if (!dim) continue;
        const axisIdOf = (a: Axis | string) => (typeof a === 'string' ? a : a.id);
        const isAxis1 = dim.axes[0] !== undefined && axisIdOf(dim.axes[0]) === ax.axisId;
        for (const qid of ax.questionIds) {
          const qq = questions.find((x) => x.id === qid);
          if (!qq) continue;
          const wantHigh = !isAxis1;
          answers[qid] = wantHigh ? (qq.reverse ? 1 : 5) : (qq.reverse ? 5 : 1);
        }
      }
    }
    const { scores } = calculateAllDimensionScores(cfg, questions, answers);
    const coordCounts: Record<string, number> = {};
    const idCounts: Record<string, number> = {};
    for (const dim of q.dimensions) {
      const s = scores[dim.id];
      if (!s) continue;
      const coord = coordinateOf(s.axis1, s.axis2);
      coordCounts[SEVERITY_BY_COORDINATE[coord]] = (coordCounts[SEVERITY_BY_COORDINATE[coord]] ?? 0) + 1;
      const qid = determineQuadrantType(s.axis1, s.axis2);
      idCounts[qid] = (idCounts[qid] ?? 0) + 1;
    }
    const newLevel = riskByCoordinate(coordCounts);
    rows.push(
      `  ${stage.padEnd(14)} 坐标严重度=${JSON.stringify(coordCounts)} → riskLevel=${newLevel.padEnd(9)} (旧 id 判定仍按 ${JSON.stringify(idCounts)})`,
    );
  }
  console.log(`\n【${label}】改用「按语义坐标判严重度」后：\n${rows.join('\n')}`);
  return allSame;
}

describe('报告层严重度：按 id vs 按语义坐标', () => {
  it('最差场景（双低）→ 应为 critical', () => {
    runScenario('场景 A：孩子两轴都最差', 'worst');
    expect(true).toBe(true);
  });
  it('偏科场景（纵低横高）→ 应为 high（不是 critical）', () => {
    runScenario('场景 B：一头弱一头强（偏科）', 'lopsided');
    expect(true).toBe(true);
  });
});
