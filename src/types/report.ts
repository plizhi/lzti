// 报告类型定义

export type TrendType = 'up' | 'stable' | 'down' | 'significant-up' | 'significant-down';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface CurrentStatus {
  dimensionId: string;
  dimensionName: string;
  quadrantType: string;
  quadrantName: string;
  description: string;
  scores: {
    axis1: number;
    axis2: number;
  };
}

export interface DimensionTrend {
  dimensionId: string;
  dimensionName: string;
  change: number;
  trend: TrendType;
  description: string;
}

export interface TrendAnalysis {
  comparedAttemptId: string;
  comparedAt: string;
  overallTrend: TrendType;
  dimensionTrends: DimensionTrend[];
}

export interface RiskCombination {
  dimensionIds: string[];
  riskType: string;
  description: string;
}

export interface TrajectoryPrediction {
  riskLevel: RiskLevel;
  riskCombinations: RiskCombination[];
  predictedPath: string;
  protectiveFactors: string[];
}

export interface FocusSuggestion {
  dimensionId: string;
  dimensionName: string;
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  guidance: string;
}

export interface Report {
  id: string;
  attemptId: string;
  currentStatus: CurrentStatus[];
  trendAnalysis: TrendAnalysis | null;
  trajectory: TrajectoryPrediction;
  suggestions: FocusSuggestion[];
  createdAt: Date;
}
