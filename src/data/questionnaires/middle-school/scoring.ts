// 初中非毕业（初一、初二）计分配置
// 轴-题目映射与反向题列表

import type { ScoringConfig } from '@/types/questionnaire';

// ============================================================
// 学生卷计分配置
// ============================================================

export const middleSchoolStudentScoring: ScoringConfig = {
  stageId: 'junior-1',
  questionnaireType: 'student',
  axes: [
    // 多任务管理
    { axisId: 'organization', questionIds: ['ms-mt-1', 'ms-mt-2', 'ms-mt-3'] },
    { axisId: 'execution', questionIds: ['ms-mt-4', 'ms-mt-5', 'ms-mt-6'] },
    // 目标规划
    { axisId: 'goal-clarity', questionIds: ['ms-gp-1', 'ms-gp-2', 'ms-gp-3'] },
    { axisId: 'path-decomposition', questionIds: ['ms-gp-4', 'ms-gp-5', 'ms-gp-6'] },
    // 学业归因
    { axisId: 'controllability', questionIds: ['ms-aa-1', 'ms-aa-2', 'ms-aa-3'] },
    { axisId: 'flexibility', questionIds: ['ms-aa-4', 'ms-aa-5', 'ms-aa-6'] },
    // 情绪韧性
    { axisId: 'sensitivity', questionIds: ['ms-er-1', 'ms-er-2', 'ms-er-3'] },
    { axisId: 'regulation', questionIds: ['ms-er-4', 'ms-er-5', 'ms-er-6'] },
  ],
  reverseQuestions: ['ms-er-1', 'ms-er-2', 'ms-er-3'],
};

// ============================================================
// 家长卷计分配置
// ============================================================

export const middleSchoolParentScoring: ScoringConfig = {
  stageId: 'junior-1',
  questionnaireType: 'parent',
  axes: [
    // 多任务管理
    { axisId: 'organization', questionIds: ['ms-p-mt-1', 'ms-p-mt-2', 'ms-p-mt-3'] },
    { axisId: 'execution', questionIds: ['ms-p-mt-4', 'ms-p-mt-5', 'ms-p-mt-6'] },
    // 目标规划
    { axisId: 'goal-clarity', questionIds: ['ms-p-gp-1', 'ms-p-gp-2', 'ms-p-gp-3'] },
    { axisId: 'path-decomposition', questionIds: ['ms-p-gp-4', 'ms-p-gp-5', 'ms-p-gp-6'] },
    // 学业归因
    { axisId: 'controllability', questionIds: ['ms-p-aa-1', 'ms-p-aa-2', 'ms-p-aa-3'] },
    { axisId: 'flexibility', questionIds: ['ms-p-aa-4', 'ms-p-aa-5', 'ms-p-aa-6'] },
    // 情绪韧性
    { axisId: 'sensitivity', questionIds: ['ms-p-er-1', 'ms-p-er-2', 'ms-p-er-3'] },
    { axisId: 'regulation', questionIds: ['ms-p-er-4', 'ms-p-er-5', 'ms-p-er-6'] },
  ],
  reverseQuestions: ['ms-p-er-1', 'ms-p-er-2', 'ms-p-er-3'],
};

// ============================================================
// 教师卷计分配置
// ============================================================

export const middleSchoolTeacherScoring: ScoringConfig = {
  stageId: 'junior-1',
  questionnaireType: 'teacher',
  axes: [
    // 多任务管理
    { axisId: 'organization', questionIds: ['ms-t-mt-1', 'ms-t-mt-2', 'ms-t-mt-3'] },
    { axisId: 'execution', questionIds: ['ms-t-mt-4', 'ms-t-mt-5', 'ms-t-mt-6'] },
    // 目标规划
    { axisId: 'goal-clarity', questionIds: ['ms-t-gp-1', 'ms-t-gp-2', 'ms-t-gp-3'] },
    { axisId: 'path-decomposition', questionIds: ['ms-t-gp-4', 'ms-t-gp-5', 'ms-t-gp-6'] },
    // 学业归因
    { axisId: 'controllability', questionIds: ['ms-t-aa-1', 'ms-t-aa-2', 'ms-t-aa-3'] },
    { axisId: 'flexibility', questionIds: ['ms-t-aa-4', 'ms-t-aa-5', 'ms-t-aa-6'] },
    // 情绪韧性
    { axisId: 'sensitivity', questionIds: ['ms-t-er-1', 'ms-t-er-2', 'ms-t-er-3'] },
    { axisId: 'regulation', questionIds: ['ms-t-er-4', 'ms-t-er-5', 'ms-t-er-6'] },
  ],
  reverseQuestions: ['ms-t-er-1', 'ms-t-er-2', 'ms-t-er-3'],
};
