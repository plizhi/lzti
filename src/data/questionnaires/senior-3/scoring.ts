// 高三计分配置
// 轴-题目映射与反向题列表

import type { ScoringConfig } from '@/types/questionnaire';

// ============================================================
// 学生卷计分配置
// ============================================================

export const senior3StudentScoring: ScoringConfig = {
  stageId: 'senior-3',
  questionnaireType: 'student',
  axes: [
    // 决策清晰度
    { axisId: 'choice-clarity', questionIds: ['s3-stu-dc-1', 's3-stu-dc-3'] },
    { axisId: 'independent-decision', questionIds: ['s3-stu-dc-2'] },
    // 目标行动力
    { axisId: 'goal-specificity', questionIds: ['s3-stu-ga-1'] },
    { axisId: 'action-consistency', questionIds: ['s3-stu-ga-2', 's3-stu-ga-3'] },
    // 压力韧性
    { axisId: 'emotion-regulation', questionIds: ['s3-stu-pr-1', 's3-stu-pr-3'] },
    { axisId: 'action-maintenance', questionIds: ['s3-stu-pr-2'] },
    // 关系自主
    { axisId: 'communication-quality', questionIds: ['s3-stu-ra-1'] },
    { axisId: 'independent-boundary', questionIds: ['s3-stu-ra-2', 's3-stu-ra-3'] },
  ],
  reverseQuestions: [],
};

// ============================================================
// 家长卷计分配置
// ============================================================

export const senior3ParentScoring: ScoringConfig = {
  stageId: 'senior-3',
  questionnaireType: 'parent',
  axes: [
    // 决策清晰度
    { axisId: 'choice-clarity', questionIds: ['s3-par-dc-1', 's3-par-dc-3'] },
    { axisId: 'independent-decision', questionIds: ['s3-par-dc-2'] },
    // 目标行动力
    { axisId: 'goal-specificity', questionIds: ['s3-par-ga-1'] },
    { axisId: 'action-consistency', questionIds: ['s3-par-ga-2', 's3-par-ga-3'] },
    // 压力韧性
    { axisId: 'action-maintenance', questionIds: ['s3-par-pr-1'] },
    { axisId: 'emotion-regulation', questionIds: ['s3-par-pr-2', 's3-par-pr-3'] },
    // 关系自主
    { axisId: 'communication-quality', questionIds: ['s3-par-ra-1'] },
    { axisId: 'independent-boundary', questionIds: ['s3-par-ra-2', 's3-par-ra-3'] },
  ],
  reverseQuestions: [],
};

// ============================================================
// 教师卷计分配置
// ============================================================

export const senior3TeacherScoring: ScoringConfig = {
  stageId: 'senior-3',
  questionnaireType: 'teacher',
  axes: [
    // 决策清晰度
    { axisId: 'choice-clarity', questionIds: ['s3-tea-dc-1', 's3-tea-dc-3'] },
    { axisId: 'independent-decision', questionIds: ['s3-tea-dc-2'] },
    // 目标行动力
    { axisId: 'goal-specificity', questionIds: ['s3-tea-ga-1'] },
    { axisId: 'action-consistency', questionIds: ['s3-tea-ga-2', 's3-tea-ga-3'] },
    // 压力韧性
    { axisId: 'action-maintenance', questionIds: ['s3-tea-pr-1'] },
    { axisId: 'emotion-regulation', questionIds: ['s3-tea-pr-2', 's3-tea-pr-3'] },
    // 关系自主
    { axisId: 'communication-quality', questionIds: ['s3-tea-ra-1'] },
    { axisId: 'independent-boundary', questionIds: ['s3-tea-ra-2', 's3-tea-ra-3'] },
  ],
  reverseQuestions: [],
};
