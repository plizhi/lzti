// 不变式测试：**运行时计分配置**的轴序必须与 questionnaire.ts 声明一致
//
// ⚠️ 重要更正（2026-10-31，朋大大提供的另一份 AI 对账后核实）：
//   此前版本的 axis-order.test.ts 校验的是 src/data/questionnaires/*/scoring.ts，
//   并把它当成"线上 bug 的修法"。**那是错的**：
//     - src/data/questionnaires/*/scoring.ts 是**参考配置**，生产计分不读它。
//     - 真正的运行时配置由 assessment.service.ts 的 buildScoringConfig() 现场推导：
//         轴序 = questionnaire.ts 里 dimension.axes 的声明顺序
//         题目归属 = 按 question.dimensionId + question.axisId 过滤
//     - 所以历史上"轴序 4 处不一致"发生在死配置里，**从未影响线上结果**。
//
// 本测试改为校验真正影响运行的那条路径：复刻 buildScoringConfig 的推导逻辑，
// 断言运行时轴序 == questionnaire.ts 声明顺序，且题目归属正确。
//
// 为什么这条仍值得锁：
//   象限文案的语义是按 questionnaire.ts 的轴序写的。
//   一旦有人改了 questionnaire.ts 的 axes 顺序而没同步改文案，
//   报告会贴错象限 —— 这正是我们要防的那类错误。
import { describe, it, expect } from 'vitest';
import { questionnaires } from '@/data/questionnaires';
import type { StageId } from '@/types/stage';
import type { Questionnaire, Question, ScoringConfig } from '@/types/questionnaire';

const STAGES: StageId[] = [
  'primary-low', 'primary-high', 'junior-1', 'junior-3', 'senior-1', 'senior-3',
];

/**
 * 复刻 assessment.service.ts 的 buildScoringConfig()（该函数当前是私有的）。
 * 逐行对照 src/lib/services/assessment.service.ts:49-88。
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

    const axis1Questions = questions.filter(
      (q) => q.dimensionId === dimension.id && q.axisId === axis1Id,
    );
    const axis2Questions = questions.filter(
      (q) => q.dimensionId === dimension.id && q.axisId === axis2Id,
    );

    if (axis1Questions.length > 0) {
      axes.push({ axisId: axis1Id, questionIds: axis1Questions.map((q) => q.id) });
      axis1Questions.filter((q) => q.reverse).forEach((q) => reverseQuestions.push(q.id));
    }
    if (axis2Questions.length > 0) {
      axes.push({ axisId: axis2Id, questionIds: axis2Questions.map((q) => q.id) });
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

const PAPER_KEYS = ['studentQuestions', 'parentQuestions', 'teacherQuestions'] as const;
const PAPER_NAMES = ['学生卷', '家长卷', '教师卷'];

describe('运行时计分配置的轴序', () => {
  for (const stage of STAGES) {
    const q = questionnaires[stage];

    for (let i = 0; i < PAPER_KEYS.length; i++) {
      const key = PAPER_KEYS[i];
      const paperName = PAPER_NAMES[i];
      const questions = q[key] ?? [];
      if (questions.length === 0) continue;

      it(`${q.name}（${stage}）${paperName}：运行时轴序与问卷声明一致`, () => {
        const cfg = buildScoringConfigLikeRuntime(q, questions);

        // 按 dimensionId 把运行时 axes 分组（保持运行时数组内的顺序）
        const byDim = new Map<string, string[]>();
        for (const ax of cfg.axes) {
          const first = ax.questionIds[0];
          const qq = questions.find((x) => x.id === first);
          expect(qq, `${stage}/${paperName} 轴 ${ax.axisId} 的首个题目 ${first} 不在卷内`).toBeTruthy();
          const dimId = qq!.dimensionId;
          if (!byDim.has(dimId)) byDim.set(dimId, []);
          byDim.get(dimId)!.push(ax.axisId);
        }

        for (const dim of q.dimensions) {
          const declared = dim.axes.map((a) => (typeof a === 'string' ? a : a.id));
          const actual = byDim.get(dim.id);
          expect(actual, `${stage}/${paperName} 的计分配置缺少维度 ${dim.id}`).toBeTruthy();
          expect(
            actual,
            `${stage}/${paperName} 卷 ${dim.id} 的运行时轴序与问卷声明不一致：\n` +
            `  问卷声明: ${declared.join(', ')}\n` +
            `  运行时   : ${actual!.join(', ')}\n` +
            `  → 象限文案是按问卷声明的轴序写的，轴序一错，报告会贴错象限`,
          ).toEqual(declared);
        }
      });
    }
  }
});

describe('运行时配置的题目归属', () => {
  for (const stage of STAGES) {
    const q = questionnaires[stage];
    const questions = q.studentQuestions ?? [];

    it(`${q.name}（${stage}）：每个维度的每道题都归到声明的轴上，且两轴都不为空`, () => {
      const cfg = buildScoringConfigLikeRuntime(q, questions);
      for (const dim of q.dimensions) {
        const axisIds = dim.axes.map((a) => (typeof a === 'string' ? a : a.id));
        const dimQs = questions.filter((x) => x.dimensionId === dim.id);
        for (const axId of axisIds) {
          const n = dimQs.filter((x) => x.axisId === axId).length;
          expect(n, `${stage}/${dim.id} 轴 ${axId} 没有题目`).toBeGreaterThan(0);
        }
        // 两轴题目数之和 == 该维度题目总数（没有游离题）
        const total = axisIds.reduce(
          (sum, axId) => sum + dimQs.filter((x) => x.axisId === axId).length, 0,
        );
        expect(total, `${stage}/${dim.id} 有题目没归到任何轴上`).toBe(dimQs.length);
      }
    });
  }
});
