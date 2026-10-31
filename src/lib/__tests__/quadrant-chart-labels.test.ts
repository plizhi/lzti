// 回归测试：象限图的「文案归位」必须在所有维度上正确
//
// 背景（2026-10-31）：
//   quadrant-geometry.ts 的 quadrantNamesByCoordinate() 用 QUADRANT_COORDINATE
//   （id → 语义坐标）反查，把每条象限文案放进对应的语义格子。
//   它的正确性完全依赖「数据侧的象限 id 已按语义坐标对齐」。
//
//   当前状态：17 个维度的数据 id 尚未重排（见 quadrant-semantics.test.ts 真值表），
//   所以 quadrantNamesByCoordinate() 在这些维度上会把文案贴到错误的格子。
//
//   已有测试的漏洞：
//   quadrant-geometry.test.ts 的「文案按语义坐标归位」只用了 learning-interest
//   —— 它恰好是 5 个**没有错位**的维度之一，所以测试全绿，
//   但 17 个错位维度的图全是错的（最差格画成次差文案，肉眼极难发现）。
//
// 本测试的做法：
//   对**每一个**维度，用真值表反推「每个语义格子应该显示哪条文案」，
//   再与 quadrantNamesByCoordinate() 的输出**逐格**比对。
//
//   用 it.fails 标记「当前预期失败」的维度：
//     - 数据侧重排完成 → 该维度的预期失败不再发生 → vitest 会报"fails 断言失效"
//       → 提醒把该维度从 PENDING 名单移除
//     - 若某维度错得比预期更离谱（多错一格/错成别的形态）→ 预期失败仍成立，
//       但下面的形态断言会额外标红
//   不在名单内的维度 → 必须完全正确（防新增错位）
import { describe, it, expect } from 'vitest';
import { questionnaires } from '@/data/questionnaires';
import { quadrantNamesByCoordinate } from '@/lib/scoring/quadrant-geometry';
import type { StageId } from '@/types/stage';

type Semantic = '高高' | '好差' | '差好' | '双差';
const COORDS: Semantic[] = ['高高', '好差', '差好', '双差'];

const STAGES: StageId[] = [
  'primary-low', 'primary-high', 'junior-1', 'junior-3', 'senior-1', 'senior-3',
];

/**
 * 各维度 4 个象限文案的真实语义坐标。
 * 与 quadrant-semantics.test.ts 的 TRUTH 表同源（独立抄录，避免测试间耦合）。
 */
const TRUTH: Record<string, Record<string, Semantic>> = {
  'learning-interest':     { optimal:'高高', strategy:'好差', passive:'双差', overwhelmed:'差好' },
  'basic-habits':          { optimal:'高高', strategy:'差好', passive:'双差', overwhelmed:'好差' },
  'emotional-adaptation':  { optimal:'高高', strategy:'差好', passive:'好差', overwhelmed:'双差' },
  'self-efficacy':         { optimal:'高高', strategy:'差好', passive:'双差', overwhelmed:'好差' },
  'strategy-coping':       { optimal:'高高', strategy:'好差', passive:'双差', overwhelmed:'差好' },
  'self-nurturing':        { optimal:'高高', strategy:'好差', passive:'双差', overwhelmed:'差好' },
  'multi-task-management': { optimal:'高高', strategy:'好差', passive:'双差', overwhelmed:'差好' },
  'goal-planning':         { optimal:'高高', strategy:'好差', passive:'双差', overwhelmed:'差好' },
  'academic-attribution':  { optimal:'高高', strategy:'双差', passive:'双差', overwhelmed:'好差' },
  'emotional-resilience':  { optimal:'高高', strategy:'双差', passive:'好差', overwhelmed:'差好' },
  'strategy-integration':  { optimal:'高高', strategy:'好差', passive:'差好', overwhelmed:'双差' },
  'goal-anchor':           { optimal:'高高', strategy:'好差', passive:'差好', overwhelmed:'双差' },
  'feedback-utilization':  { optimal:'高高', strategy:'好差', passive:'差好', overwhelmed:'双差' },
  'mental-stability':      { optimal:'高高', strategy:'好差', passive:'差好', overwhelmed:'双差' },
  'self-cognition':        { optimal:'hhh', strategy:'好差', passive:'差好', overwhelmed:'双差' } as never,
  'direction-exploration': { optimal:'高高', strategy:'好差', passive:'差好', overwhelmed:'双差' },
  'academic-strategy':     { optimal:'高高', strategy:'好差', passive:'差好', overwhelmed:'双差' },
  'support-connection':    { optimal:'高高', strategy:'好差', passive:'差好', overwhelmed:'双差' },
  'decision-clarity':      { optimal:'高高', strategy:'好差', passive:'差好', overwhelmed:'双差' },
  'goal-action':           { optimal:'高高', strategy:'好差', passive:'差好', overwhelmed:'双差' },
  'pressure-resilience':   { optimal:'高高', strategy:'好差', passive:'差好', overwhelmed:'双差' },
  'relationship-autonomy': { optimal:'高高', strategy:'好差', passive:'差好', overwhelmed:'双差' },
};
TRUTH['self-cognition'] = { optimal:'高高', strategy:'好差', passive:'差好', overwhelmed:'双差' };

/** 数据侧尚未重排、因此象限图文案归位仍错的维度 */
const PENDING = new Set([
  'basic-habits', 'emotional-adaptation', 'self-efficacy', 'academic-attribution',
  'emotional-resilience', 'strategy-integration', 'goal-anchor', 'feedback-utilization',
  'mental-stability', 'self-cognition', 'direction-exploration', 'academic-strategy',
  'support-connection', 'decision-clarity', 'goal-action', 'pressure-resilience',
  'relationship-autonomy',
]);

/** 由真值表反推：某维度每个语义格子「应该」显示哪条文案 */
function expectedByCoordinate(
  truth: Record<string, Semantic>,
  nameById: Record<string, string>,
): Record<Semantic, string | undefined> {
  const out = {} as Record<Semantic, string | undefined>;
  for (const coord of COORDS) {
    const id = Object.keys(truth).find((k) => truth[k] === coord);
    out[coord] = id ? nameById[id] : undefined;
  }
  return out;
}

describe('象限图文案归位（全维度逐格核对）', () => {
  for (const stage of STAGES) {
    const qn = questionnaires[stage];
    for (const dim of qn.dimensions) {
      const title = `${qn.name}·${dim.name}`;
      const check = () => {
        const truth = TRUTH[dim.id];
        expect(truth, `${dim.id} 缺真值表`).toBeTruthy();
        const nameById: Record<string, string> = {};
        for (const q of dim.quadrants) nameById[q.id] = q.name;
        const expected = expectedByCoordinate(truth, nameById);
        const actual = quadrantNamesByCoordinate(
          dim.quadrants.map((q) => ({ id: q.id, name: q.name })),
        );
        // 逐格比对，错误信息里写清哪一格错了
        for (const coord of COORDS) {
          expect(actual[coord], `${title} 的「${coord}」格`).toBe(expected[coord]);
        }
      };

      if (PENDING.has(dim.id)) {
        // 当前预期失败：数据侧 id 未重排 → 象限图文案贴错格子。
        // 数据侧重排后，这个 fails 断言会失效 → vitest 报错提醒移除本维度。
        it.fails(`${title}（待修：数据侧象限 id 未重排）`, check);
      } else {
        it(title, check);
      }
    }
  }

  it('待修清单与实际错位一致（防名单漂移）', () => {
    const actuallyWrong: string[] = [];
    for (const stage of STAGES) {
      const qn = questionnaires[stage];
      for (const dim of qn.dimensions) {
        if (dim.id === 'academic-attribution') continue; // 内容缺格，另行处理
        const truth = TRUTH[dim.id];
        const nameById: Record<string, string> = {};
        for (const q of dim.quadrants) nameById[q.id] = q.name;
        const expected = expectedByCoordinate(truth, nameById);
        const actual = quadrantNamesByCoordinate(
          dim.quadrants.map((q) => ({ id: q.id, name: q.name })),
        );
        if (COORDS.some((c) => actual[c] !== expected[c])) actuallyWrong.push(dim.id);
      }
    }
    expect(
      new Set(actuallyWrong),
      '待修名单与实际错位维度不一致 —— 若刚修好了某个维度，请从 PENDING 移除',
    ).toEqual(new Set([...PENDING].filter((d) => d !== 'academic-attribution')));
  });
});
