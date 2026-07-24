// 问卷题目类型定义

export interface QuestionOption {
  value: number;
  text: string;
}

export interface Question {
  id: string;
  dimensionId: string;
  axisId: string;
  text: string;
  reverse: boolean;
  options?: QuestionOption[];
}

export interface Axis {
  id: string;
  name: string;
  description: string;
  positiveLabel?: string; // 偏向正向的标签，如"好奇探索高"
  negativeLabel?: string; // 偏向负向的标签，如"好奇探索低"
}

export type QuadrantType = 'optimal' | 'strategy' | 'passive' | 'overwhelmed';

export interface Quadrant {
  id: QuadrantType | string; // 兼容旧格式（字符串名称）和新格式（标准类型）
  name: string;
  description: string;
  guidance: string;
  // 干预建议完整字段（来自spec）
  profile?: string; // 画像
  coreNeed?: string; // 核心需求
  parentAction?: string; // 家长怎么做
}

export interface Dimension {
  id: string;
  name: string;
  description: string;
  axes: [Axis | string, Axis | string]; // 支持旧格式[string,string]和新格式[Axis,Axis]
  quadrants: Quadrant[];
}

export interface Questionnaire {
  id: string;
  stageId: string;
  name: string;
  dimensions: Dimension[];
  // 三视角问卷
  questions?: Question[];  // 兼容旧代码
  studentQuestions?: Question[];
  parentQuestions?: Question[];
  teacherQuestions?: Question[];
}

// 计分配置：轴-题目映射（与题目内容分离）
export interface ScoringAxisConfig {
  axisId: string;
  questionIds: string[];
}

export interface ScoringConfig {
  stageId: string;
  questionnaireType: 'student' | 'parent' | 'teacher';
  // Axis-to-question mapping
  axes: ScoringAxisConfig[];
  // Reverse scored questions (1→5, 2→4, 4→2, 5→1)
  reverseQuestions: string[];
}
