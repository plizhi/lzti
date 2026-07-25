// 初三大（初三）计分配置
// 轴-题目映射与反向题列表

import type { ScoringConfig } from '@/types/questionnaire';

// ============================================================
// 学生卷计分配置
// ============================================================

export const junior3StudentScoring: ScoringConfig = {
  stageId: 'junior-3',
  questionnaireType: 'student',
  axes: [
    // 策略整合
    { axisId: 'self-rhythm', questionIds: ['j3-si-1'] },
    { axisId: 'tradeoff-judgment', questionIds: ['j3-si-2', 'j3-si-3'] },
    // 目标锚定
    { axisId: 'meaning-perception', questionIds: ['j3-ga-1', 'j3-ga-3'] },
    { axisId: 'self-confirmation', questionIds: ['j3-ga-2'] },
    // 反馈利用
    { axisId: 'review-action', questionIds: ['j3-fu-1', 'j3-fu-3'] },
    { axisId: 'information-transformation', questionIds: ['j3-fu-2'] },
    // 心态稳定
    { axisId: 'emotion-recovery', questionIds: ['j3-ms-1', 'j3-ms-2', 'j3-ms-3'] },
    { axisId: 'support-connection', questionIds: ['j3-ms-4'] },
  ],
  reverseQuestions: [],
};

// ============================================================
// 家长卷计分配置
// ============================================================

export const junior3ParentScoring: ScoringConfig = {
  stageId: 'junior-3',
  questionnaireType: 'parent',
  axes: [
    // 策略整合
    { axisId: 'self-rhythm', questionIds: ['j3-p-si-1'] },
    { axisId: 'tradeoff-judgment', questionIds: ['j3-p-si-2', 'j3-p-si-3'] },
    // 目标锚定
    { axisId: 'meaning-perception', questionIds: ['j3-p-ga-1', 'j3-p-ga-3'] },
    { axisId: 'self-confirmation', questionIds: ['j3-p-ga-2'] },
    // 反馈利用
    { axisId: 'review-action', questionIds: ['j3-p-fu-1'] },
    { axisId: 'information-transformation', questionIds: ['j3-p-fu-2'] },
    // 心态稳定
    { axisId: 'emotion-recovery', questionIds: ['j3-p-ms-1', 'j3-p-ms-2'] },
    { axisId: 'support-connection', questionIds: ['j3-p-ms-3', 'j3-p-ms-4', 'j3-p-ms-5'] },
  ],
  reverseQuestions: [],
};

// ============================================================
// 教师卷计分配置
// ============================================================

export const junior3TeacherScoring: ScoringConfig = {
  stageId: 'junior-3',
  questionnaireType: 'teacher',
  axes: [
    // 策略整合
    { axisId: 'self-rhythm', questionIds: ['j3-t-si-1'] },
    { axisId: 'tradeoff-judgment', questionIds: ['j3-t-si-2', 'j3-t-si-3'] },
    // 目标锚定
    { axisId: 'meaning-perception', questionIds: ['j3-t-ga-1', 'j3-t-ga-3'] },
    { axisId: 'self-confirmation', questionIds: ['j3-t-ga-2'] },
    // 反馈利用
    { axisId: 'review-action', questionIds: ['j3-t-fu-1'] },
    { axisId: 'information-transformation', questionIds: ['j3-t-fu-2'] },
    // 心态稳定
    { axisId: 'emotion-recovery', questionIds: ['j3-t-ms-1', 'j3-t-ms-2'] },
    { axisId: 'support-connection', questionIds: ['j3-t-ms-3'] },
  ],
  reverseQuestions: [],
};
