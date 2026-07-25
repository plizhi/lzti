// 高一高二计分配置
// 轴-题目映射与反向题列表

import type { ScoringConfig } from '@/types/questionnaire';

// ============================================================
// 学生卷计分配置
// ============================================================

export const senior1StudentScoring: ScoringConfig = {
  stageId: 'senior-1',
  questionnaireType: 'student',
  axes: [
    // 自我认知
    { axisId: 'self-awareness', questionIds: ['s1-stu-sc-1', 's1-stu-sc-4'] },
    { axisId: 'self-acceptance', questionIds: ['s1-stu-sc-2', 's1-stu-sc-3'] },
    // 方向探索
    { axisId: 'direction-awareness', questionIds: ['s1-stu-de-1'] },
    { axisId: 'exploration-action', questionIds: ['s1-stu-de-2', 's1-stu-de-3'] },
    // 学业策略
    { axisId: 'method-awareness', questionIds: ['s1-stu-as-1'] },
    { axisId: 'flexibility', questionIds: ['s1-stu-as-2', 's1-stu-as-3'] },
    // 支持连接
    { axisId: 'support-awareness', questionIds: ['s1-stu-sp-1'] },
    { axisId: 'active-connection', questionIds: ['s1-stu-sp-2', 's1-stu-sp-3'] },
  ],
  reverseQuestions: [],
};

// ============================================================
// 家长卷计分配置
// ============================================================

export const senior1ParentScoring: ScoringConfig = {
  stageId: 'senior-1',
  questionnaireType: 'parent',
  axes: [
    // 自我认知
    { axisId: 'self-awareness', questionIds: ['s1-par-sc-1'] },
    { axisId: 'self-acceptance', questionIds: ['s1-par-sc-2', 's1-par-sc-3'] },
    // 方向探索
    { axisId: 'direction-awareness', questionIds: ['s1-par-de-1'] },
    { axisId: 'exploration-action', questionIds: ['s1-par-de-2', 's1-par-de-3'] },
    // 学业策略
    { axisId: 'method-awareness', questionIds: ['s1-par-as-1'] },
    { axisId: 'flexibility', questionIds: ['s1-par-as-2', 's1-par-as-3'] },
    // 支持连接
    { axisId: 'active-connection', questionIds: ['s1-par-sp-1', 's1-par-sp-2'] },
    { axisId: 'support-awareness', questionIds: ['s1-par-sp-3'] },
  ],
  reverseQuestions: ['s1-par-sp-3'],
};

// ============================================================
// 教师卷计分配置
// ============================================================

export const senior1TeacherScoring: ScoringConfig = {
  stageId: 'senior-1',
  questionnaireType: 'teacher',
  axes: [
    // 自我认知
    { axisId: 'self-awareness', questionIds: ['s1-tea-sc-1'] },
    { axisId: 'self-acceptance', questionIds: ['s1-tea-sc-2', 's1-tea-sc-3'] },
    // 方向探索
    { axisId: 'direction-awareness', questionIds: ['s1-tea-de-1'] },
    { axisId: 'exploration-action', questionIds: ['s1-tea-de-2', 's1-tea-de-3'] },
    // 学业策略
    { axisId: 'method-awareness', questionIds: ['s1-tea-as-1'] },
    { axisId: 'flexibility', questionIds: ['s1-tea-as-2', 's1-tea-as-3'] },
    // 支持连接
    { axisId: 'active-connection', questionIds: ['s1-tea-sp-1', 's1-tea-sp-3'] },
    { axisId: 'support-awareness', questionIds: ['s1-tea-sp-2'] },
  ],
  reverseQuestions: [],
};
