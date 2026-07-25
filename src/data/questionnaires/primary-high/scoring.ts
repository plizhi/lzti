// 小学高年级计分配置
// 轴-题目映射与反向题列表

import type { ScoringConfig } from '@/types/questionnaire';

// ============================================================
// 学生卷计分配置
// ============================================================

export const primaryHighStudentScoring: ScoringConfig = {
  stageId: 'primary-high',
  questionnaireType: 'student',
  axes: [
    // 自我效能
    { axisId: 'ability-belief', questionIds: ['ph-se-1', 'ph-se-2', 'ph-se-3'] },
    { axisId: 'effort-belief', questionIds: ['ph-se-4', 'ph-se-5', 'ph-se-6'] },
    // 策略应对
    { axisId: 'coping-proactivity', questionIds: ['ph-sc-1', 'ph-sc-2', 'ph-sc-3'] },
    { axisId: 'method-flexibility', questionIds: ['ph-sc-4', 'ph-sc-5', 'ph-sc-6'] },
    // 自我滋养
    { axisId: 'satisfaction-experience', questionIds: ['ph-sn-1', 'ph-sn-2', 'ph-sn-3'] },
    { axisId: 'attribution-confirmation', questionIds: ['ph-sn-4', 'ph-sn-5', 'ph-sn-6'] },
  ],
  reverseQuestions: ['ph-se-2', 'ph-se-5', 'ph-sc-2', 'ph-sc-5', 'ph-sn-2', 'ph-sn-5'],
};

// ============================================================
// 家长卷计分配置
// ============================================================

export const primaryHighParentScoring: ScoringConfig = {
  stageId: 'primary-high',
  questionnaireType: 'parent',
  axes: [
    // 自我效能
    { axisId: 'ability-belief', questionIds: ['ph-p-se-1', 'ph-p-se-2', 'ph-p-se-3'] },
    { axisId: 'effort-belief', questionIds: ['ph-p-se-4', 'ph-p-se-5', 'ph-p-se-6'] },
    // 策略应对
    { axisId: 'coping-proactivity', questionIds: ['ph-p-sc-1', 'ph-p-sc-2', 'ph-p-sc-3'] },
    { axisId: 'method-flexibility', questionIds: ['ph-p-sc-4', 'ph-p-sc-5', 'ph-p-sc-6'] },
    // 自我滋养
    { axisId: 'satisfaction-experience', questionIds: ['ph-p-sn-1', 'ph-p-sn-2', 'ph-p-sn-3'] },
    { axisId: 'attribution-confirmation', questionIds: ['ph-p-sn-4', 'ph-p-sn-5', 'ph-p-sn-6'] },
  ],
  reverseQuestions: ['ph-p-se-2', 'ph-p-se-5', 'ph-p-sc-2', 'ph-p-sc-5', 'ph-p-sn-2', 'ph-p-sn-5'],
};

// ============================================================
// 教师卷计分配置
// ============================================================

export const primaryHighTeacherScoring: ScoringConfig = {
  stageId: 'primary-high',
  questionnaireType: 'teacher',
  axes: [
    // 自我效能
    { axisId: 'ability-belief', questionIds: ['ph-t-se-1', 'ph-t-se-2', 'ph-t-se-3'] },
    { axisId: 'effort-belief', questionIds: ['ph-t-se-4', 'ph-t-se-5', 'ph-t-se-6'] },
    // 策略应对
    { axisId: 'coping-proactivity', questionIds: ['ph-t-sc-1', 'ph-t-sc-2', 'ph-t-sc-3'] },
    { axisId: 'method-flexibility', questionIds: ['ph-t-sc-4', 'ph-t-sc-5', 'ph-t-sc-6'] },
    // 自我滋养
    { axisId: 'satisfaction-experience', questionIds: ['ph-t-sn-1', 'ph-t-sn-2', 'ph-t-sn-3'] },
    { axisId: 'attribution-confirmation', questionIds: ['ph-t-sn-4', 'ph-t-sn-5', 'ph-t-sn-6'] },
  ],
  reverseQuestions: ['ph-t-se-2', 'ph-t-se-5', 'ph-t-sc-2', 'ph-t-sc-5', 'ph-t-sn-2', 'ph-t-sn-5'],
};
