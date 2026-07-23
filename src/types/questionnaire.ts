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

export interface Dimension {
  id: string;
  name: string;
  description: string;
  axes: [string, string];
  quadrants: Array<{
    id: string;
    name: string;
    description: string;
    guidance: string;
  }>;
}

export interface Questionnaire {
  id: string;
  stageId: string;
  name: string;
  dimensions: Dimension[];
  // 三视角问卷
  questions?: Question[];  // 兼容旧代码
  studentQuestions?: Question[];  // 学生自评卷
  parentQuestions?: Question[];   // 家长居家观察卷
  teacherQuestions?: Question[];   // 教师评价卷
}
