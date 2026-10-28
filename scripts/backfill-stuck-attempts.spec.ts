/**
 * 补齐「有答案但没有报告」的卡死测评记录。
 *
 * 背景（BUG 引入于 2026-07-27 commit 8c56562「中途保存」功能）：
 *   网页端答题每 1 秒防抖自动保存一次进度，会建一条「进行中」的 SessionAttempt
 *   （childId / stageId 为空串，只有 answers）。
 *   提交时 submitAttempt 只按 (sessionId, questionnaireType) 查一次，
 *   查到就报「该类型测评已提交」——于是家长只要答过题（必然触发过自动保存），
 *   点提交就必然 400，AttemptReport 永远生成不出来。
 *
 *   表现：SessionAttempt 里有完整答案，但没有 AttemptReport。
 *
 * 本脚本把这类记录补齐成「正常提交」后的样子：
 *   ① 从 session 回填 childId / stageId
 *   ② 用与 submitAttempt 相同的计分逻辑算出 scores / quadrants
 *   ③ 生成 AttemptReport
 *   ④ 回写 session.completed
 *
 * 用法（走 vitest 跑，项目的 TS 路径别名才生效；参数用环境变量传）：
 *   npx vitest run scripts/backfill-stuck-attempts.spec.ts                                  # dry-run
 *   BACKFILL_APPLY=1 npx vitest run scripts/backfill-stuck-attempts.spec.ts                # 写库
 *   BACKFILL_APPLY=1 BACKFILL_ATTEMPT_ID=<id> npx vitest run scripts/backfill-stuck-attempts.spec.ts
 *
 * 安全性：
 *   - 默认 DRY-RUN，必须显式 --apply 才写库
 *   - 只处理「缺 report + 有 answers + 能从 session 定位到孩子」的三者交集
 *   - 不删除任何记录，只补齐缺失部分
 *   - 每条一个事务，任一条失败整条回滚
 */

import { describe, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { getQuestionnaire } from '@/data/questionnaires';
import { calculateAllDimensionScores } from '@/lib/scoring/calculator';
import { determineAllQuadrants } from '@/lib/scoring';
import { generateSingleReport } from '@/lib/report/generator';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// vitest 会吞掉命令行参数，这里统一用环境变量传：
//   BACKFILL_APPLY=1                → 真正写库（默认是 dry-run）
//   BACKFILL_ATTEMPT_ID=<id>        → 只处理某一条
const APPLY = process.env.BACKFILL_APPLY === '1';
const onlyId = process.env.BACKFILL_ATTEMPT_ID || null;

if (!APPLY) {
  console.log('（未设置 BACKFILL_APPLY=1，按 DRY-RUN 处理）');
}

/** 与 submitAttempt / assessment.service.ts 保持一致的取题规则 */
function getQuestionsForType(questionnaire: any, type: string): any[] {
  switch (type) {
    case 'student':
      return questionnaire.studentQuestions ?? questionnaire.questions ?? [];
    case 'parent':
      return questionnaire.parentQuestions ?? questionnaire.questions ?? [];
    case 'teacher':
      return questionnaire.teacherQuestions ?? questionnaire.questions ?? [];
    default:
      return questionnaire.questions ?? [];
  }
}

/**
 * 与 assessment.service.ts 的 buildScoringConfig 逐字对齐。
 * 注意：ScoringConfig 是 { stageId, questionnaireType, axes, reverseQuestions }，
 * axes 是「每根轴 → 该轴的题目 id 列表」，不是按 dimension 分组。
 */
function buildScoringConfig(questionnaire: any, questions: any[], questionnaireType: string) {
  const axes: any[] = [];
  const reverseQuestions: string[] = [];

  for (const dimension of questionnaire.dimensions) {
    const axis1Id = typeof dimension.axes[0] === 'string' ? dimension.axes[0] : dimension.axes[0].id;
    const axis2Id = typeof dimension.axes[1] === 'string' ? dimension.axes[1] : dimension.axes[1].id;

    const axis1Questions = questions.filter(
      (q: any) => q.dimensionId === dimension.id && q.axisId === axis1Id
    );
    const axis2Questions = questions.filter(
      (q: any) => q.dimensionId === dimension.id && q.axisId === axis2Id
    );

    if (axis1Questions.length > 0) {
      axes.push({ axisId: axis1Id, questionIds: axis1Questions.map((q: any) => q.id) });
      axis1Questions.filter((q: any) => q.reverse).forEach((q: any) => reverseQuestions.push(q.id));
    }
    if (axis2Questions.length > 0) {
      axes.push({ axisId: axis2Id, questionIds: axis2Questions.map((q: any) => q.id) });
      axis2Questions.filter((q: any) => q.reverse).forEach((q: any) => reverseQuestions.push(q.id));
    }
  }

  return {
    stageId: questionnaire.stageId,
    questionnaireType,
    axes,
    reverseQuestions,
  };
}

async function main() {
  console.log(APPLY ? '🔴 模式：APPLY（会写数据库）' : '🔵 模式：DRY-RUN（不写库）');
  console.log('');

  const candidates = await prisma.sessionAttempt.findMany({
    where: {
      report: null,
      childId: '',   // progress 占位记录的特征
      stageId: '',
    },
    include: { session: { include: { child: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const targets = onlyId ? candidates.filter((c) => c.id === onlyId) : candidates;

  if (targets.length === 0) {
    console.log('✅ 没有需要补齐的记录');
    return;
  }

  console.log(`找到 ${targets.length} 条待补齐记录：\n`);

  for (const attempt of targets) {
    const session = attempt.session;
    const answers: Record<string, number> = (attempt.answers ?? {}) as any;

    if (!session) {
      console.log(`  ❌ ${attempt.id}：找不到对应的 session，跳过`);
      continue;
    }
    if (!session.childId) {
      console.log(`  ❌ ${attempt.id}：session 也没有 childId，无法定位孩子，跳过`);
      continue;
    }
    if (Object.keys(answers).length === 0) {
      console.log(`  ❌ ${attempt.id}：没有答案，跳过`);
      continue;
    }

    const questionnaire: any = getQuestionnaire(session.stageId);
    if (!questionnaire) {
      console.log(`  ❌ ${attempt.id}：学段 ${session.stageId} 没有问卷，跳过`);
      continue;
    }

    const questions = getQuestionsForType(questionnaire, attempt.questionnaireType);
    const expected = questions.length;
    const actual = Object.keys(answers).length;

    if (actual < expected) {
      console.log(`  ⏭️  ${attempt.id}：只答了 ${actual}/${expected} 题，答案不完整，跳过`);
      continue;
    }

    const scoringConfig = buildScoringConfig(questionnaire, questions, attempt.questionnaireType);
    const { scores } = calculateAllDimensionScores(scoringConfig as any, questions, answers);
    const quadrants = determineAllQuadrants(scores as any);

    const report = generateSingleReport(
      questionnaire,
      scoringConfig as any,
      answers,
      attempt.id,
      attempt.questionnaireType as any
    );

    console.log(`  ✅ ${attempt.id}`);
    console.log(`     孩子=${session.child?.name} 学段=${session.stageId} 视角=${attempt.questionnaireType}`);
    console.log(`     答案 ${actual}/${expected} 题`);
    console.log(`     象限=${JSON.stringify(quadrants)}`);

    if (!APPLY) {
      console.log('     （DRY-RUN，未写入）\n');
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.sessionAttempt.update({
        where: { id: attempt.id },
        data: {
          childId: session.childId,
          stageId: session.stageId,
          answers,
          scores,
          quadrants,
          progress: answers,
        },
      });

      await tx.attemptReport.create({
        data: {
          attemptId: attempt.id,
          currentStatus: report.currentStatus as any,
          trajectory: report.trajectory as any,
          suggestions: report.suggestions as any,
        },
      });

      const completed = JSON.parse(session.completed || '{}');
      completed[attempt.questionnaireType] = true;
      await tx.assessmentSession.update({
        where: { id: session.id },
        data: { completed: JSON.stringify(completed) },
      });
    });

    console.log('     → 已写入报告\n');
  }
}

// 包成 vitest 用例：借 vitest 的 TS 编译与路径别名
describe('backfill-stuck-attempts', () => {
  it('补齐卡死的测评记录', async () => {
    await main();
  }, 120000);
});
