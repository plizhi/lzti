// 报告生成器

import type {
  AssessmentAttempt,
  DimensionScores,
  DimensionQuadrants,
  QuadrantResult,
} from '@/types/assessment';
import type {
  Report,
  CurrentStatus,
  TrendAnalysis,
  DimensionTrend,
  TrajectoryPrediction,
  FocusSuggestion,
  TrendType,
  RiskLevel,
} from '@/types/report';
import type { Dimension, Questionnaire } from '@/types/questionnaire';

interface ReportGeneratorOptions {
  currentAttempt: AssessmentAttempt;
  previousAttempt: AssessmentAttempt | null;
  questionnaire: Questionnaire;
}

function getDimensionName(dimensionId: string, dimensions: Dimension[]): string {
  return dimensions.find((d) => d.id === dimensionId)?.name ?? dimensionId;
}

function calculateTrendType(change: number): TrendType {
  const absChange = Math.abs(change);
  if (absChange < 5) return 'stable';
  if (change > 0) return absChange > 15 ? 'significant-up' : 'up';
  return absChange > 15 ? 'significant-down' : 'down';
}

function determineRiskLevel(
  quadrants: DimensionQuadrants,
  quadrantDetails: Record<string, QuadrantResult>
): RiskLevel {
  const counts = {
    optimal: 0,
    strategy: 0,
    passive: 0,
    overwhelmed: 0,
  };

  for (const [_, type] of Object.entries(quadrants)) {
    counts[type] = (counts[type] ?? 0) + 1;
  }

  if (counts.overwhelmed >= 2 || counts.passive >= 2) return 'high';
  if (counts.overwhelmed >= 1 || counts.passive >= 1) return 'medium';
  return 'low';
}

function generateFocusSuggestions(
  quadrants: DimensionQuadrants,
  quadrantDetails: Record<string, QuadrantResult>,
  dimensions: Dimension[]
): FocusSuggestion[] {
  const suggestions: FocusSuggestion[] = [];

  for (const [dimensionId, type] of Object.entries(quadrants)) {
    const quadrant = quadrantDetails[dimensionId];
    if (!quadrant) continue;

    const dimensionName = getDimensionName(dimensionId, dimensions);
    const priority = type === 'overwhelmed' || type === 'passive' ? 'high' : 'medium';

    suggestions.push({
      dimensionId,
      dimensionName,
      priority,
      suggestion: `${dimensionName}: ${quadrant.name}`,
      guidance: quadrant.guidance,
    });
  }

  return suggestions.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

export function generateReport(options: ReportGeneratorOptions): Report {
  const { currentAttempt, previousAttempt, questionnaire } = options;

  const quadrantDetails: Record<string, QuadrantResult> = {};
  for (const [dimensionId, type] of Object.entries(currentAttempt.quadrants)) {
    const dimension = questionnaire.dimensions.find((d) => d.id === dimensionId);
    const quadrant = dimension?.quadrants.find((q) => q.id === type);
    if (quadrant) {
      quadrantDetails[dimensionId] = {
        type: type as QuadrantResult['type'],
        name: quadrant.name,
        description: quadrant.description,
        guidance: quadrant.guidance,
      };
    }
  }

  const currentStatus: CurrentStatus[] = Object.entries(currentAttempt.scores).map(
    ([dimensionId, scores]) => {
      const quadrant = quadrantDetails[dimensionId];
      return {
        dimensionId,
        dimensionName: getDimensionName(dimensionId, questionnaire.dimensions),
        quadrantType: currentAttempt.quadrants[dimensionId],
        quadrantName: quadrant?.name ?? '',
        description: quadrant?.description ?? '',
        scores,
      };
    }
  );

  let trendAnalysis: TrendAnalysis | null = null;
  if (previousAttempt) {
    const dimensionTrends: DimensionTrend[] = [];

    for (const [dimensionId, currentScore] of Object.entries(currentAttempt.scores)) {
      const previousScore = previousAttempt.scores[dimensionId];
      if (!previousScore) continue;

      const axis1Change = currentScore.axis1 - previousScore.axis1;
      const axis2Change = currentScore.axis2 - previousScore.axis2;
      const avgChange = (axis1Change + axis2Change) / 2;

      dimensionTrends.push({
        dimensionId,
        dimensionName: getDimensionName(dimensionId, questionnaire.dimensions),
        change: avgChange,
        trend: calculateTrendType(avgChange),
        description:
          avgChange > 0
            ? `相比上次提升了 ${avgChange.toFixed(1)} 分`
            : avgChange < 0
              ? `相比上次下降了 ${Math.abs(avgChange).toFixed(1)} 分`
              : '保持稳定',
      });
    }

    const overallTrend = dimensionTrends.reduce((max, dt) => {
      if (dt.trend === 'significant-up' || max === 'significant-up') return 'significant-up';
      if (dt.trend === 'significant-down' || max === 'significant-down') return 'significant-down';
      if (dt.trend === 'up' || max === 'up') return 'up';
      if (dt.trend === 'down' || max === 'down') return 'down';
      return max;
    }, 'stable' as TrendType);

    trendAnalysis = {
      comparedAttemptId: previousAttempt.id,
      comparedAt: previousAttempt.createdAt.toISOString(),
      overallTrend,
      dimensionTrends,
    };
  }

  const trajectory: TrajectoryPrediction = {
    riskLevel: determineRiskLevel(currentAttempt.quadrants, quadrantDetails),
    riskCombinations: [],
    predictedPath: '保持当前趋势发展',
    protectiveFactors: [],
  };

  const suggestions = generateFocusSuggestions(
    currentAttempt.quadrants,
    quadrantDetails,
    questionnaire.dimensions
  );

  return {
    id: crypto.randomUUID(),
    attemptId: currentAttempt.id,
    currentStatus,
    trendAnalysis,
    trajectory,
    suggestions,
    createdAt: new Date(),
  };
}
