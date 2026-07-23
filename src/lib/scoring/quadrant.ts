// 四象限判定

import type { DimensionScores, DimensionQuadrants, QuadrantResult } from '@/types/assessment';

const THRESHOLD = 50;

export function determineQuadrant(
  axis1Score: number,
  axis2Score: number,
  quadrants: Array<{ id: string; name: string; description: string; guidance: string }>
): QuadrantResult {
  const isHighAxis1 = axis1Score >= THRESHOLD;
  const isHighAxis2 = axis2Score >= THRESHOLD;

  let type: string;

  if (isHighAxis1 && isHighAxis2) {
    type = quadrants[0]?.id ?? 'optimal';
  } else if (!isHighAxis1 && isHighAxis2) {
    type = quadrants[1]?.id ?? 'strategy';
  } else if (!isHighAxis1 && !isHighAxis2) {
    type = quadrants[2]?.id ?? 'passive';
  } else {
    type = quadrants[3]?.id ?? 'overwhelmed';
  }

  const quadrant = quadrants.find((q) => q.id === type) ?? quadrants[0];

  return {
    type: type as QuadrantResult['type'],
    name: quadrant.name,
    description: quadrant.description,
    guidance: quadrant.guidance,
  };
}

export function determineAllQuadrants(
  scores: DimensionScores,
  dimensionConfigs: Record<string, { axes: [string, string]; quadrants: Array<{ id: string; name: string; description: string; guidance: string }> }>
): DimensionQuadrants {
  const results: DimensionQuadrants = {};

  for (const [dimensionId, score] of Object.entries(scores)) {
    const config = dimensionConfigs[dimensionId];
    if (!config) continue;

    const [axis1Id, axis2Id] = config.axes;
    const quadrantResult = determineQuadrant(score.axis1, score.axis2, config.quadrants);
    results[dimensionId] = quadrantResult.type;
  }

  return results;
}
