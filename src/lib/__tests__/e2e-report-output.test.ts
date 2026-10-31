// 端到端实证：跑真实计分器 + 真实问卷数据，看报告实际显示什么
// 用 vitest 跑（避免 vite-node 的模板字符串问题）
import { describe, it } from 'vitest';
import { questionnaires } from '@/data/questionnaires';
import { calculateAllDimensionScores, determineQuadrantType } from '@/lib/scoring/calculator';
import { QUADRANT_COORDINATE } from '@/lib/scoring/quadrant-geometry';
import { primaryLowStudentScoring } from '@/data/questionnaires/primary-low/scoring';
import { primaryHighStudentScoring } from '@/data/questionnaires/primary-high/scoring';
import { middleSchoolStudentScoring } from '@/data/questionnaires/middle-school/scoring';
import { junior3StudentScoring } from '@/data/questionnaires/junior-3/scoring';
import { senior1StudentScoring } from '@/data/questionnaires/senior-1/scoring';
import { senior3StudentScoring } from '@/data/questionnaires/senior-3/scoring';

// 真值表（灵机独立判读，见 docs/象限语义真值表.md）
const TRUTH: Record<string, Record<string, string>> = {
  'learning-interest': { optimal: '高高', strategy: '好差', passive: '双差', overwhelmed: '差好' },
  'basic-habits': { optimal: '高高', strategy: '差好', passive: '双差', overwhelmed: '好差' },
  'emotional-adaptation': { optimal: '高高', strategy: '差好', passive: '好差', overwhelmed: '双差' },
  'self-efficacy': { optimal: '高高', strategy: '差好', passive: '双差', overwhelmed: '好差' },
  'strategy-coping': { optimal: '高高', strategy: '好差', passive: '双差', overwhelmed: '差好' },
  'self-nurturing': { optimal: '高高', strategy: '好差', passive: '双差', overwhelmed: '差好' },
  'multi-task-management': { optimal: '高高', strategy: '好差', passive: '双差', overwhelmed: '差好' },
  'goal-planning': { optimal: '高高', strategy: '好差', passive: '双差', overwhelmed: '差好' },
  'academic-attribution': { optimal: '高高', strategy: '双差', passive: '双差', overwhelmed: '好差' },
  'emotional-resilience': { optimal: '高高', strategy: '双差', passive: '好差', overwhelmed: '差好' },
  'strategy-integration': { optimal: '高高', strategy: '好差', passive: '差好', overwhelmed: '双差' },
  'goal-anchor': { optimal: '高高', strategy: '好差', passive: '差好', overwhelmed: '双差' },
  'feedback-utilization': { optimal: '高高', strategy: '好差', passive: '差好', overwhelmed: '双差' },
  'mental-stability': { optimal: '高高', strategy: '好差', passive: '差好', overwhelmed: '双差' },
  'self-cognition': { optimal: '高高', strategy: '好差', passive: '差好', overwhelmed: '双差' },
  'direction-exploration': { optimal: '高高', strategy: '好差', passive: '差好', overwhelmed: '双差' },
  'academic-strategy': { optimal: '高高', strategy: '好差', passive: '差好', overwhelmed: '双差' },
  'support-connection': { optimal: '高高', strategy: '好差', passive: '差好', overwhelmed: '双差' },
  'decision-clarity': { optimal: '高高', strategy: '好差', passive: '差好', overwhelmed: '双差' },
  'goal-action': { optimal: '高高', strategy: '好差', passive: '差好', overwhelmed: '双差' },
  'pressure-resilience': { optimal: '高高', strategy: '好差', passive: '差好', overwhelmed: '双差' },
  'relationship-autonomy': { optimal: '高高', strategy: '好差', passive: '差好', overwhelmed: '双差' },
};

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
      const name = dim.quadrants.find((x) => x.id === qid)?.name ?? '?';
      const truth = TRUTH[dim.id]?.[qid] ?? '?';
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
