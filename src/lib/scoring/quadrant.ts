// 四象限判定
// 参考规格书：
// - 以3分（五选一量表的理论中值）为中线
// - 纵轴均分 > 3：落入"偏向二"
// - 纵轴均分 ≤ 3：落入"偏向一"
// - 两个轴的落位交叉，自动判定四象限归属

import type { DimensionScores, DimensionQuadrants } from '@/types/assessment';
import { determineQuadrantType } from './calculator';

export type QuadrantType = 'optimal' | 'strategy' | 'passive' | 'overwhelmed';

/**
 * 中性带（2026-11-01，朋大大拍板）
 *
 * 背景：阈值是「> 3 为高」，所以五选一量表里「全选 3 分」会被判成两轴都低
 *   → 落双差 → 报告说「最需要主动关注」。
 *   实证：库里 3 条 attempt 的 answers 是 3,4,5,3,4,5…，全被判成 passive。
 *
 * 处理：两轴分数都落在中性带内 → 该维度**不产出象限**，
 *   报告里显示「该维度数据接近中性，暂无明显倾向」。
 *   复用已有的「无数据 → 不产出象限」语义（前端已能优雅处理缺失，
 *   维度选择器不显示象限标签、象限图不标当前格、解释区整块不渲染）。
 *
 * 为什么不改阈值：阈值语义（>3 为高）本身是稳定且有文档的，
 *   改它会动到 22 个维度 100% 的报告；中性带只在「两轴都在中线附近」时收手，
 *   是更小、更可解释的改动。
 */
export const NEUTRAL_BAND_MIN = 2.5;
export const NEUTRAL_BAND_MAX = 3.5;

/** 分数是否落在中性带内（接近理论中值 3 → 无明显倾向） */
export function isInNeutralBand(score: number): boolean {
  return score >= NEUTRAL_BAND_MIN && score <= NEUTRAL_BAND_MAX;
}

export function determineAllQuadrants(scores: DimensionScores): DimensionQuadrants {
  const results: DimensionQuadrants = {};

  for (const [dimensionId, score] of Object.entries(scores)) {
    // 中性带：两轴都在中线附近 → 不产出象限（不是「最差」，是「没倾向」）
    if (isInNeutralBand(score.axis1) && isInNeutralBand(score.axis2)) continue;

    results[dimensionId] = determineQuadrantType(score.axis1, score.axis2);
  }

  return results;
}

/**
 * 根据象限类型和维度配置获取完整象限信息
 */
export function getQuadrantResult(
  dimensionId: string,
  quadrantType: QuadrantType,
  quadrantConfigs: Array<{
    id: string;
    name: string;
    description: string;
    guidance: string;
    profile?: string;
    coreNeed?: string;
    parentAction?: string;
  }>
) {
  const config = quadrantConfigs.find((q) => q.id === quadrantType);
  if (!config) return null;

  return {
    type: quadrantType as QuadrantType,
    name: config.name,
    description: config.description,
    guidance: config.guidance,
    profile: config.profile,
    coreNeed: config.coreNeed,
    parentAction: config.parentAction,
  };
}
