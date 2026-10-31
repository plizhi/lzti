// 语义回归测试：锁死「象限文案语义坐标 == 该 id 在计分器里的坐标」
//
// 背景（2026-10-31）：
//   计分器 calculator.ts 的象限坐标是固定的：
//     optimal=纵高横高  strategy=纵高横低  overwhelmed=纵低横高  passive=纵低横低
//   而各学段问卷的象限文案，是按「双低 = 最差 = overwhelmed」写的直觉语义。
//   两套约定冲突 → 17 个维度存在 id 与语义坐标错位，报告会给人贴错标签。
//
// 本测试的作用不是「现在就全绿」，而是把真值表固化下来：
//   - KNOWN_MISMATCH 里列出的维度 → 断言它们当前处于错位状态（防止悄悄变化）
//   - 不在名单里的维度           → 断言它们当前语义正确（防止新增错位）
//   - 修好一个维度后，从 KNOWN_MISMATCH 移除它 → 测试会要求它必须正确
//
// 这样任何维度改文案、改 id、改坐标，都会被这个测试立刻抓住。
import { describe, it, expect } from 'vitest';
import { questionnaires } from '@/data/questionnaires';
import { determineQuadrantType } from '@/lib/scoring/calculator';
import { QUADRANT_TRUTH } from '@/lib/scoring/quadrant-truth';
import type { StageId } from '@/types/stage';

/** 语义坐标：纵轴高/低 + 横轴高/低 */
type Semantic = '高高' | '好差' | '差好' | '双差';

/** 计分器给出的坐标（calculator.ts:167-170） */
const CODE_COORDINATE: Record<string, Semantic> = {
  optimal: '高高',
  strategy: '好差',
  overwhelmed: '差好',
  passive: '双差',
};

/**
 * 各维度 4 个象限文案的真实语义坐标。
 * 判读方法：读该维度的题目原文 + 象限 description，判断文案描述的是
 * 「纵轴高还是低、横轴高还是低」。不依赖任何自动关键词匹配。
 *
 * 例（junior-3 心态稳定）：
 *   韧性充沛型「既能自己较快恢复，也愿意在需要时找人聊聊」→ 纵高(恢复快) 横高(愿求助) = 高高
 *   独立调节型「自己能较快调整情绪，但不习惯找人倾诉」→ 纵高 横低 = 好差
 *   连接支撑型「虽然心情容易受影响，但愿意找人聊聊」  → 纵低 横高 = 差好
 *   高压积压型「既不容易从负面情绪中恢复，又不太找人倾诉」→ 纵低 横低 = 双差
 */
const TRUTH: Record<string, Record<string, Semantic>> = Object.fromEntries(
  Object.entries(QUADRANT_TRUTH).map(([dim, q]) => [
    dim,
    Object.fromEntries(Object.entries(q).map(([id, t]) => [id, t.coordinate])),
  ]),
) as Record<string, Record<string, Semantic>>;

/**
 * 当前已知错位的维度。
 * 修好一个 → 从这里移除，测试会转为要求它必须正确。
 * 判定规则：任一象限的「文案语义坐标」≠「该 id 在计分器里的坐标」即为错位。
 */
const KNOWN_MISMATCH = new Set([
  'basic-habits',
  'emotional-adaptation',
  'self-efficacy',
  'academic-attribution',
  'emotional-resilience',
  'strategy-integration',
  'goal-anchor',
  'feedback-utilization',
  'mental-stability',
  'self-cognition',
  'direction-exploration',
  'academic-strategy',
  'support-connection',
  'decision-clarity',
  'goal-action',
  'pressure-resilience',
  'relationship-autonomy',
]);

/** 应当已经正确的维度 */
const EXPECTED_CORRECT = new Set([
  'learning-interest',
  'strategy-coping',
  'self-nurturing',
  'multi-task-management',
  'goal-planning',
]);

const STAGES: StageId[] = [
  'primary-low', 'primary-high', 'junior-1', 'junior-3', 'senior-1', 'senior-3',
];

/**
 * 内容缺格：真值表里同一坐标出现两次、另有一格缺失 → 无法靠 id 重排解决，
 * 必须重写文案 + 补探针题（middle-school 学业归因）。
 */
const CONTENT_GAP = new Set(['academic-attribution']);

describe('真值表结构不变量', () => {
  it('每个维度的四格恰好覆盖四个语义坐标各一次（内容缺格会被当场拦下）', () => {
    for (const [dim, q] of Object.entries(QUADRANT_TRUTH)) {
      const coords = Object.values(q).map((t) => t.coordinate);
      const isBij = coords.length === 4 && new Set(coords).size === 4;
      if (CONTENT_GAP.has(dim)) {
        expect(isBij, `${dim} 已在 CONTENT_GAP 名单里，但双射已成立 → 请从名单移除`).toBe(false);
      } else {
        expect(isBij, `${dim} 的四格未恰好覆盖四个语义坐标（内容缺格？）`).toBe(true);
      }
    }
  });

  it('内容缺格名单与实际一致（防名单漂移）', () => {
    const notBij = Object.entries(QUADRANT_TRUTH)
      .filter(([, q]) => {
        const coords = Object.values(q).map((t) => t.coordinate);
        return coords.length !== 4 || new Set(coords).size !== 4;
      })
      .map(([dim]) => dim);
    expect(new Set(notBij)).toEqual(CONTENT_GAP);
  });

  it('每格都有判读依据（非空）', () => {
    for (const [dim, q] of Object.entries(QUADRANT_TRUTH)) {
      for (const [id, t] of Object.entries(q)) {
        expect(t.rationale, `${dim}.${id} 缺判读依据`).toBeTruthy();
      }
    }
  });
});

describe('真值表与数据侧的文案名一致性', () => {
  for (const stage of STAGES) {
    const qn = questionnaires[stage];
    for (const dim of qn.dimensions) {
      it(`${qn.name}·${dim.name}`, () => {
        const truth = QUADRANT_TRUTH[dim.id];
        expect(truth, `${dim.id} 缺真值表`).toBeTruthy();
        const dataNames = dim.quadrants.map((q) => q.name).sort();
        const truthNames = Object.keys(truth).sort();
        expect(truthNames, `${dim.id} 的真值表文案名与数据侧不一致`).toEqual(dataNames);
      });
    }
  }
});

describe('象限语义坐标一致性', () => {
  // 真值表必须覆盖全部维度，且不能有遗漏
  it('真值表覆盖全部 22 个维度', () => {
    const allDims = STAGES.flatMap((s) => questionnaires[s].dimensions.map((d) => d.id));
    expect(allDims.length).toBe(22);
    for (const id of allDims) {
      expect(TRUTH[id], `维度 ${id} 缺真值坐标`).toBeTruthy();
    }
    expect(Object.keys(TRUTH).length).toBe(allDims.length);
  });

  // 已知错位名单 + 正确名单 必须正好覆盖全部维度
  it('已知错位名单与正确名单恰好覆盖全部维度', () => {
    const allDims = new Set(STAGES.flatMap((s) => questionnaires[s].dimensions.map((d) => d.id)));
    const covered = new Set([...KNOWN_MISMATCH, ...EXPECTED_CORRECT]);
    expect(covered.size).toBe(allDims.size);
    for (const id of allDims) {
      expect(covered.has(id), `维度 ${id} 既不在错位名单也不在正确名单`).toBe(true);
    }
    for (const id of KNOWN_MISMATCH) {
      expect(EXPECTED_CORRECT.has(id), `${id} 同时出现在两个名单`).toBe(false);
    }
  });

  for (const stage of STAGES) {
    const q = questionnaires[stage];

    for (const dim of q.dimensions) {
      const truth = TRUTH[dim.id];
      const mismatched: string[] = [];

      for (const quad of dim.quadrants) {
        const codeCoord = CODE_COORDINATE[quad.id];
        expect(codeCoord, `未知象限 id ${quad.id}`).toBeTruthy();
        if (truth[quad.name] !== codeCoord) {
          mismatched.push(
            `${quad.id}(${quad.name}) 文案语义=${truth[quad.name]} 代码坐标=${codeCoord}`,
          );
        }
      }

      if (KNOWN_MISMATCH.has(dim.id)) {
        it(`${q.name} / ${dim.name}：当前处于已知错位状态（修好后请从名单移除）`, () => {
          expect(mismatched.length, `${dim.id} 已在错位名单，但实际已无错位 → 请从 KNOWN_MISMATCH 移除`).toBeGreaterThan(0);
        });
      } else {
        it(`${q.name} / ${dim.name}：象限语义坐标与计分器一致`, () => {
          expect(
            mismatched,
            `${dim.id} 出现语义错位：\n  ${mismatched.join('\n  ')}`,
          ).toEqual([]);
        });
      }
    }
  }
});

describe('计分器坐标约定本身', () => {
  it('坐标表与 calculator.ts 的实现一致（防止有人改了计分器但没更新这里）', () => {
    expect(determineQuadrantType(5, 5)).toBe('optimal');   // 高高
    expect(determineQuadrantType(5, 1)).toBe('strategy');   // 好差
    expect(determineQuadrantType(1, 5)).toBe('overwhelmed'); // 差好
    expect(determineQuadrantType(1, 1)).toBe('passive');      // 双差
  });

  it('阈值语义：3 分算低（>3 才算高）', () => {
    expect(determineQuadrantType(3, 3)).toBe('passive');
    expect(determineQuadrantType(3.01, 3.01)).toBe('optimal');
  });
});
