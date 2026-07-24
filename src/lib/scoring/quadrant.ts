// 四象限判定
// 参考规格书：
// - 以3分（五选一量表的理论中值）为中线
// - 纵轴均分 > 3：落入"偏向二"
// - 纵轴均分 ≤ 3：落入"偏向一"
// - 两个轴的落位交叉，自动判定四象限归属

import type { DimensionScores, DimensionQuadrants } from '@/types/assessment';
import { determineQuadrantType } from './calculator';

export type QuadrantType = 'optimal' | 'strategy' | 'passive' | 'overwhelmed';

export function determineAllQuadrants(scores: DimensionScores): DimensionQuadrants {
  const results: DimensionQuadrants = {};

  for (const [dimensionId, score] of Object.entries(scores)) {
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
