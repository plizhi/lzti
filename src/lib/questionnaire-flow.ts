import type { Question, Questionnaire } from '@/types/questionnaire';

/**
 * 三视角测评流程（家长 → 学生 → 教师）。
 *
 * 抽成 lib 是为了设备端 API 和网页端共用同一套顺序规则，
 * 避免两处各写一份、日后漂移。
 */

export type QuestionnaireType = 'parent' | 'student' | 'teacher';

export const ASSESSMENT_FLOW: QuestionnaireType[] = ['parent', 'student', 'teacher'];

export const QUESTIONNAIRE_TYPE_LABEL: Record<QuestionnaireType, string> = {
  parent: '家长观察',
  student: '学生自评',
  teacher: '教师评价',
};

/** 做完 current 之后，下一个该做的视角；已经做到最后一个返回 null */
export function getNextQuestionnaireType(current: QuestionnaireType): QuestionnaireType | null {
  const currentIndex = ASSESSMENT_FLOW.indexOf(current);
  if (currentIndex < 0 || currentIndex >= ASSESSMENT_FLOW.length - 1) return null;
  return ASSESSMENT_FLOW[currentIndex + 1];
}

/** 取某个视角的题目（老问卷只有 questions 字段，做兼容兜底） */
export function getQuestionsForType(questionnaire: Questionnaire, type: QuestionnaireType): Question[] {
  switch (type) {
    case 'student':
      return questionnaire.studentQuestions ?? questionnaire.questions ?? [];
    case 'parent':
      return questionnaire.parentQuestions ?? questionnaire.questions ?? [];
    case 'teacher':
      return questionnaire.teacherQuestions ?? questionnaire.questions ?? [];
    default:
      return questionnaire.questions ?? [];
  }
}

/**
 * 三视角完成状态 → 下一步该做什么。
 *
 * completed 形如 {parent:true, student:false, teacher:false}
 * 规则：
 *   - 家长卷优先（演示现场通常家长先做）
 *   - 家长做完后可以接着做孩子卷，两个都做完后轮老师卷（老师走二维码，不占设备流程）
 *   - 已经做过的不再提示
 */
export function resolveNextType(
  completed: Record<string, boolean> | null | undefined,
  options: { includeTeacher?: boolean } = {}
): QuestionnaireType | null {
  const includeTeacher = options.includeTeacher ?? false;
  const flow = includeTeacher ? ASSESSMENT_FLOW : ASSESSMENT_FLOW.slice(0, 2);
  const done = completed ?? {};
  for (const type of flow) {
    if (!done[type]) return type;
  }
  return null;
}
