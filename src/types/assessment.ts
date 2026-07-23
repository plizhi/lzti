// 测评记录类型定义

export type DimensionAnswers = {
  [dimensionId: string]: QuestionAnswers;
};

export type QuestionAnswers = {
  [questionId: string]: number;
};

export type DimensionScores = {
  [dimensionId: string]: AxisScores;
};

export type AxisScores = {
  axis1: number;
  axis2: number;
};

export type QuadrantType =
  | 'optimal'      // 第一象限 - 理想状态
  | 'strategy'     // 第二象限 - 需策略调整
  | 'passive'      // 第三象限 - 需被动干预
  | 'overwhelmed'; // 第四象限 - 需主动关注

export type DimensionQuadrants = {
  [dimensionId: string]: QuadrantType;
};

export interface QuadrantResult {
  type: QuadrantType;
  name: string;
  description: string;
  guidance: string;
}

export interface AssessmentAttempt {
  id: string;
  userId: string;
  stageId: string;
  answers: DimensionAnswers;
  scores: DimensionScores;
  quadrants: DimensionQuadrants;
  createdAt: Date;
}
