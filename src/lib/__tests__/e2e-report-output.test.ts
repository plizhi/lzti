// 端到端实证：跑真实计分器 + 真实问卷数据，看报告实际显示什么
// 用 vitest 跑（避免 vite-node 的模板字符串问题）
import { describe, it } from 'vitest';
import { questionnaires } from '@/data/questionnaires';
import { calculateAllDimensionScores, determineQuadrantType } from '@/lib/scoring/calculator';
import { QUADRANT_COORDINATE } from '@/lib/scoring/quadrant-geometry';
import { QUADRANT_TRUTH } from '@/lib/scoring/quadrant-truth';
import { primaryLowStudentScoring } from '@/data/questionnaires/primary-low/scoring';
import { primaryHighStudentScoring } from '@/data/questionnaires/primary-high/scoring';
import { middleSchoolStudentScoring } from '@/data/questionnaires/middle-school/scoring';
import { junior3StudentScoring } from '@/data/questionnaires/junior-3/scoring';
import { senior1StudentScoring } from '@/data/questionnaires/senior-1/scoring';
import { senior3StudentScoring } from '@/data/questionnaires/senior-3/scoring';

// 真值表唯一真源：src/lib/scoring/quadrant-truth.ts（按【文案名】索引）
//
// 本测试要回答的问题是「报告里显示的这条【文案】，真实语义坐标是什么」，
// 所以按文案名查，而不是按 id 查 —— id 会随约定变化，文案语义不会。
//
// 2026-11-01：原先这里有一份自带的 id 索引副本，约定 Q 落地后成了过期真相，
//           导致诊断输出误报「2 个维度错位」。已改为直接引用生产真值表。
function truthCoordinate(dimId: string, name: string): string {
  return QUADRANT_TRUTH[dimId]?.[name]?.coordinate ?? '?';
}

const CONFIGS: Record<string, any> = {
  'primary-low': primaryLowStudentScoring,
  'primary-high': primaryHighStudentScoring,
  'junior-1': middleSchoolStudentScoring,
  'junior-3': junior3StudentScoring,
  'senior-1': senior1StudentScoring,
  'senior-3': senior3StudentScoring,
};

const CN: Record<string, string> = {
  高高: '纵高横高', 好差: '纵高横低', 差好: '纵低横高', 双差: '纵低横低',
};

function run(label: string, answerValue: number) {
  const lines: string[] = [];
  lines.push('='.repeat(112));
  lines.push(`【实证】${label}`);
  lines.push('='.repeat(112));
  lines.push(
    '学段'.padEnd(14) + '维度'.padEnd(24) + '轴1'.padEnd(8) + '轴2'.padEnd(8) +
    '代码判定'.padEnd(14) + '报告显示文案'.padEnd(16) + '文案真实语义'.padEnd(13) + '对?',
  );
  lines.push('-'.repeat(112));

  let bad = 0;
  let total = 0;
  const details: string[] = [];

  for (const [stage, cfg] of Object.entries(CONFIGS)) {
    const q = questionnaires[stage as keyof typeof questionnaires];
    const questions = [
      ...(q.studentQuestions ?? []),
      ...(q.parentQuestions ?? []),
      ...(q.teacherQuestions ?? []),
    ];
    const answers: Record<string, number> = {};
    for (const qq of questions) answers[qq.id] = answerValue;

    const { scores } = calculateAllDimensionScores(cfg, questions, answers);

    for (const dim of q.dimensions) {
      const s = scores[dim.id];
      if (!s) continue;
      const qid = determineQuadrantType(s.axis1, s.axis2) as string;
      const entry = dim.quadrants.find((x) => x.id === qid);
      const name = entry?.name ?? '?';
      const truth = entry ? truthCoordinate(dim.id, entry.name) : '?';
      const codeCoord = QUADRANT_COORDINATE[qid as keyof typeof QUADRANT_COORDINATE];
      const correct = codeCoord === truth;
      if (!correct) bad++;
      total++;
      lines.push(
        stage.padEnd(14) +
        (dim.id + ' ').slice(0, 22).padEnd(24) +
        s.axis1.toFixed(2).padEnd(8) +
        s.axis2.toFixed(2).padEnd(8) +
        qid.padEnd(14) +
        name.padEnd(16) +
        (CN[truth] ?? truth).padEnd(13) +
        (correct ? '✅' : '❌'),
      );
      if (!correct) {
        details.push(
          `  ${stage} / ${dim.id}: 显示「${name}」(真实语义 ${CN[truth] ?? truth})，但代码给 ${qid} 的坐标是 ${CN[codeCoord]}`,
        );
      }
    }
  }
  lines.push('');
  lines.push(`  → ${total} 个维度中，${bad} 个显示的文案与代码坐标不匹配`);
  if (details.length) {
    lines.push('');
    lines.push('  错位明细：');
    lines.push(...details);
  }
  console.log('\n' + lines.join('\n'));
}

describe('端到端实证', () => {
  it('家长全选 1（两轴都最差）', () => {
    run('家长全选 1（两轴都最差）—— 孩子表现最差时的报告输出', 1);
  });
  it('家长全选 3（完全中等）', () => {
    run('家长全选 3（完全中等）—— 阈值问题的实证', 3);
  });
  it('家长全选 4（偏正面）', () => {
    run('家长全选 4（偏正面）', 4);
  });
});
