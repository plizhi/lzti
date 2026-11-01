// 中性带（2026-11-01 朋大大拍板）：两轴都在中线附近 → 该维度不产出象限
//
// 背景：阈值是「> 3 为高」，「全选 3 分」= 两轴都低 → 双差 → 报告判成「最差」。
//   实证：库里 3 条 attempt 的 answers 是 3,4,5,3,4,5…，全被判成 passive。
// 处理：两轴都落在 [2.5, 3.5] → 不产出象限，前端按「无象限」优雅渲染。
//
// 覆盖两个调用点：generator.ts（报告生成）与 assessment.service.ts（写入 DB 的 quadrants）。
import { describe, it, expect } from 'vitest';
import {
  determineAllQuadrants,
  isInNeutralBand,
  NEUTRAL_BAND_MIN,
  NEUTRAL_BAND_MAX,
} from '@/lib/scoring/quadrant';
import type { DimensionScores } from '@/types/assessment';

function scores(axis1: number, axis2: number): DimensionScores {
  return { dim: { axis1, axis2 } } as unknown as DimensionScores;
}

describe('中性带', () => {
  it('带内判定：2.5~3.5 算中性，边界含端点', () => {
    expect(isInNeutralBand(NEUTRAL_BAND_MIN)).toBe(true);
    expect(isInNeutralBand(3)).toBe(true);
    expect(isInNeutralBand(NEUTRAL_BAND_MAX)).toBe(true);
    expect(isInNeutralBand(2.49)).toBe(false);
    expect(isInNeutralBand(3.51)).toBe(false);
  });

  it('两轴都在中性带 → 该维度不产出象限', () => {
    const q = determineAllQuadrants(scores(3, 3));
    expect(q.dim).toBeUndefined();
  });

  it('两轴都在中性带（边界值 2.5 / 3.5）→ 同样不产出象限', () => {
    expect(determineAllQuadrants(scores(2.5, 3.5)).dim).toBeUndefined();
    expect(determineAllQuadrants(scores(3.5, 2.5)).dim).toBeUndefined();
  });

  it('只有一轴在带内 → 照常产出象限', () => {
    // 纵轴 3（中线），横轴 4（明显高于中线）→ 纵低横高 = 差好 = passive
    expect(determineAllQuadrants(scores(3, 4)).dim).toBe('passive');
    // 纵轴 2（明显低于中线），横轴 3（中线）→ 纵低横低 = 双差 = overwhelmed
    expect(determineAllQuadrants(scores(2, 3)).dim).toBe('overwhelmed');
  });

  it('两轴都在带外 → 照常产出象限，且双差落在 overwhelmed', () => {
    expect(determineAllQuadrants(scores(5, 5)).dim).toBe('optimal');
    expect(determineAllQuadrants(scores(5, 1)).dim).toBe('strategy');
    expect(determineAllQuadrants(scores(1, 5)).dim).toBe('passive');
    expect(determineAllQuadrants(scores(1, 1)).dim).toBe('overwhelmed');
  });

  it('库里的典型误判样本（3,4,5,3,4,5 这类中线作答）不再落双差', () => {
    // 之前 3,3 会落双差 → 被判「最差」；现在不产出象限
    expect(determineAllQuadrants(scores(3, 3)).dim).toBeUndefined();
    // 3,4 → 差好（灰、medium），不是红色 critical
    expect(determineAllQuadrants(scores(3, 4)).dim).toBe('passive');
  });
});
