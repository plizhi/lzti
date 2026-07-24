// 小学低年级计分配置
// 轴-题目映射与反向题列表，与问卷题目内容分离
// 参考规格书：轴得分=该轴所有题目得分的算数平均数，3分为中线

import type { ScoringConfig } from '@/types/questionnaire';

// ============================================================
// 学生卷计分配置
// ============================================================

export const primaryLowStudentScoring: ScoringConfig = {
  stageId: 'primary-low',
  questionnaireType: 'student',
  axes: [
    // 学习兴趣
    { axisId: 'curiosity', questionIds: ['li-1', 'li-2', 'li-3'] },
    { axisId: 'persistence', questionIds: ['li-4', 'li-5', 'li-6'] },
    // 基础习惯
    { axisId: 'automation', questionIds: ['bh-1', 'bh-2', 'bh-3'] },
    { axisId: 'orderliness', questionIds: ['bh-4', 'bh-5', 'bh-6'] },
    // 情绪适应
    { axisId: 'emotion-occupancy', questionIds: ['ea-1', 'ea-2', 'ea-3'] },
    { axisId: 'emotion-expression', questionIds: ['ea-4', 'ea-5', 'ea-6'] },
  ],
  // 反向题（1→5, 2→4, 4→2, 5→1，3保持不变）
  reverseQuestions: ['ea-1', 'ea-2', 'ea-3'],
};

// ============================================================
// 家长卷计分配置
// ============================================================

export const primaryLowParentScoring: ScoringConfig = {
  stageId: 'primary-low',
  questionnaireType: 'parent',
  axes: [
    // 学习兴趣
    { axisId: 'curiosity', questionIds: ['p-li-1', 'p-li-2', 'p-li-3'] },
    { axisId: 'persistence', questionIds: ['p-li-4', 'p-li-5', 'p-li-6'] },
    // 基础习惯
    { axisId: 'automation', questionIds: ['p-bh-1', 'p-bh-2', 'p-bh-3'] },
    { axisId: 'orderliness', questionIds: ['p-bh-4', 'p-bh-5', 'p-bh-6'] },
    // 情绪适应
    { axisId: 'emotion-occupancy', questionIds: ['p-ea-1', 'p-ea-2', 'p-ea-3'] },
    { axisId: 'emotion-expression', questionIds: ['p-ea-4', 'p-ea-5', 'p-ea-6'] },
  ],
  reverseQuestions: ['p-ea-1', 'p-ea-2', 'p-ea-3'],
};

// ============================================================
// 教师卷计分配置
// ============================================================

export const primaryLowTeacherScoring: ScoringConfig = {
  stageId: 'primary-low',
  questionnaireType: 'teacher',
  axes: [
    // 学习兴趣
    { axisId: 'curiosity', questionIds: ['t-li-1', 't-li-2', 't-li-3'] },
    { axisId: 'persistence', questionIds: ['t-li-4', 't-li-5', 't-li-6'] },
    // 基础习惯
    { axisId: 'automation', questionIds: ['t-bh-1', 't-bh-2', 't-bh-3'] },
    { axisId: 'orderliness', questionIds: ['t-bh-4', 't-bh-5', 't-bh-6'] },
    // 情绪适应
    { axisId: 'emotion-occupancy', questionIds: ['t-ea-1', 't-ea-2', 't-ea-3'] },
    { axisId: 'emotion-expression', questionIds: ['t-ea-4', 't-ea-5', 't-ea-6'] },
  ],
  reverseQuestions: ['t-ea-1', 't-ea-2', 't-ea-3'],
};
