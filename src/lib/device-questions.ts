/**
 * 设备端题目数据
 *
 * ESP32 只有小屏和蜂鸣器，读不了长题干，所以：
 * - 题目按维度分页（一次只给一个维度），内存和流量都小
 * - 题干文本完整返回，设备端可以交给服务端 TTS 朗读
 * - 只保留设备真正用得上的字段：id、序号、题干
 */

import { getQuestionnaire, getStage } from '@/data/questionnaires';
import { ApiError } from '@/lib/api/response';
import type { StageId } from '@/types/stage';
import type { Dimension, Question, Questionnaire } from '@/types/questionnaire';

export type DeviceQuestionnaireType = 'parent' | 'student' | 'teacher';

export interface DeviceQuestionItem {
  /** 题目 ID（提交答案时回传这个） */
  id: string;
  /** 该题在当前维度内的序号（从 0 开始） */
  indexInDimension: number;
  /** 该题在整份问卷里的序号（从 0 开始） */
  globalIndex: number;
  /** 题干全文 */
  text: string;
}

export interface DeviceDimensionItem {
  /** 维度序号（从 0 开始） */
  index: number;
  /** 维度 ID */
  id: string;
  /** 维度名称，如「学习兴趣」 */
  name: string;
  /** 维度说明 */
  description: string;
  /** 两个轴的名字，如「好奇探索 / 坚持完成」 */
  axis: string;
  /** 该维度的题目 */
  questions: DeviceQuestionItem[];
}

export interface DeviceQuestionsResult {
  stageId: string;
  stageName: string;
  questionnaireType: DeviceQuestionnaireType;
  /** 当前维度序号 */
  dimensionIndex: number;
  /** 维度总数 */
  totalDimensions: number;
  /** 该问卷视角的题目总数 */
  totalQuestions: number;
  /** 当前维度（分页后一次只有这一个） */
  dimensions: DeviceDimensionItem[];
  scale: {
    min: number;
    max: number;
    minLabel: string;
    maxLabel: string;
  };
}

/** 按问卷类型取题目（与前端答题页 getQuestionsForType 保持一致） */
export function getQuestionsForType(
  questionnaire: Questionnaire,
  type: DeviceQuestionnaireType
): Question[] {
  switch (type) {
    case 'student':
      return questionnaire.studentQuestions ?? questionnaire.questions ?? [];
    case 'teacher':
      return questionnaire.teacherQuestions ?? questionnaire.questions ?? [];
    case 'parent':
    default:
      return questionnaire.parentQuestions ?? questionnaire.questions ?? [];
  }
}

/** 取轴的名字（维度有两个轴，用「 / 」拼起来） */
function getAxisLabel(dimension: Dimension): string {
  const labels = dimension.axes.map((axis) =>
    typeof axis === 'string' ? axis : axis.name
  );
  return labels.join(' / ');
}

/**
 * 取设备端题目。
 *
 * @param stageId 学段 ID
 * @param questionnaireType 问卷视角
 * @param dimensionIndex 只返回这一个维度；不传则返回全部维度
 */
export function getDeviceQuestions(
  stageId: string,
  questionnaireType: DeviceQuestionnaireType,
  dimensionIndex?: number
): DeviceQuestionsResult {
  const questionnaire = getQuestionnaire(stageId);
  if (!questionnaire) {
    throw new ApiError('问卷不存在', 404);
  }

  const stage = getStage(stageId as StageId);
  const questions = getQuestionsForType(questionnaire, questionnaireType);
  const globalIndexOf = new Map(questions.map((q, i) => [q.id, i]));

  const allDimensions: DeviceDimensionItem[] = questionnaire.dimensions.map((dimension, dimIndex) => {
    const dimensionQuestions = questions.filter((q) => q.dimensionId === dimension.id);

    return {
      index: dimIndex,
      id: dimension.id,
      name: dimension.name,
      description: dimension.description,
      axis: getAxisLabel(dimension),
      questions: dimensionQuestions.map((question, indexInDimension) => ({
        id: question.id,
        indexInDimension,
        globalIndex: globalIndexOf.get(question.id) ?? 0,
        text: question.text,
      })),
    };
  });

  let selected = allDimensions;
  if (dimensionIndex !== undefined) {
    if (!Number.isInteger(dimensionIndex) || dimensionIndex < 0 || dimensionIndex >= allDimensions.length) {
      throw new ApiError('题目索引越界', 400);
    }
    selected = [allDimensions[dimensionIndex]];
  }

  const currentIndex = dimensionIndex ?? 0;

  return {
    stageId,
    stageName: stage?.name ?? stageId,
    questionnaireType,
    dimensionIndex: currentIndex,
    totalDimensions: allDimensions.length,
    totalQuestions: questions.length,
    dimensions: selected,
    scale: {
      min: 1,
      max: 5,
      minLabel: '非常不符合',
      maxLabel: '非常符合',
    },
  };
}
