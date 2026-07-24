// 报告类型定义

export type TrendType = 'up' | 'stable' | 'down' | 'significant-up' | 'significant-down';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type QuadrantType = 'optimal' | 'strategy' | 'passive' | 'overwhelmed';

export interface AxisScores {
  axis1: number; // 原始均分 1-5
  axis2: number; // 原始均分 1-5
}

export interface NormalizedScores {
  axis1: number; // 标准化到 0-100
  axis2: number; // 标准化到 0-100
}

export interface CurrentStatus {
  dimensionId: string;
  dimensionName: string;
  quadrantType: QuadrantType;
  quadrantName: string;
  description: string;
  // 干预建议（来自spec）
  profile?: string; // 画像
  coreNeed?: string; // 核心需求
  guidance?: string; // 引导建议
  parentAction?: string; // 家长怎么做
  // 得分
  scores: AxisScores;
  normalizedScores?: NormalizedScores; // 用于雷达图
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
  quadrantType: QuadrantType;
  quadrantName: string;
  guidance: string;
  profile?: string;
  coreNeed?: string;
  parentAction?: string;
}

// 单视角报告
export interface SingleReport {
  id: string;
  attemptId: string;
  questionnaireType: 'student' | 'parent' | 'teacher';
  currentStatus: CurrentStatus[];
  trendAnalysis: TrendAnalysis | null;
  trajectory: TrajectoryPrediction;
  suggestions: FocusSuggestion[];
  createdAt: Date;
}

// ============================================================
// 亲子对比报告
// ============================================================

export interface ComparisonStatus {
  dimensionId: string;
  dimensionName: string;
  // 两方/三方的象限和得分
  parent?: {
    quadrantType: QuadrantType;
    quadrantName: string;
    scores: AxisScores;
  };
  student?: {
    quadrantType: QuadrantType;
    quadrantName: string;
    scores: AxisScores;
  };
  teacher?: {
    quadrantType: QuadrantType;
    quadrantName: string;
    scores: AxisScores;
  };
  // 是否一致
  isConsistent: boolean;
  // 差异分析
  differenceAnalysis?: string;
}

export interface ComparisonSuggestion {
  dimensionId: string;
  dimensionName: string;
  differenceDescription: string;
  possibleReasons: string[];
  suggestions: string[];
  priority: 'high' | 'medium' | 'low';
}

// 亲子对比报告
export interface ParentChildComparisonReport {
  id: string;
  parentAttemptId: string;
  studentAttemptId: string;
  questionnaireType: 'student' | 'parent';
  comparisonStatuses: ComparisonStatus[];
  comparisonSuggestions: ComparisonSuggestion[];
  // 亮点和待引导
  highlights: Array<{ dimensionId: string; description: string }>;
  developmentAreas: Array<{ dimensionId: string; description: string }>;
  // 雷达图数据
  radarLabels: string[];
  radarDatasets: Array<{
    label: string;
    color: string;
    data: number[];
  }>;
  createdAt: Date;
}

// 家校三方报告
export interface HomeSchoolComparisonReport {
  id: string;
  parentAttemptId: string;
  studentAttemptId: string;
  teacherAttemptId: string;
  comparisonStatuses: ComparisonStatus[];
  comparisonSuggestions: ComparisonSuggestion[];
  // 三方共识
  consensusDimensions: string[];
  // 家校差异
  homeSchoolDifferences: Array<{
    dimensionId: string;
    homePerformance: string;
    schoolPerformance: string;
  }>;
  // 亮点和待引导
  highlights: Array<{ dimensionId: string; description: string }>;
  developmentAreas: Array<{ dimensionId: string; description: string }>;
  // 雷达图数据
  radarLabels: string[];
  radarDatasets: Array<{
    label: string;
    color: string;
    data: number[];
  }>;
  createdAt: Date;
}
