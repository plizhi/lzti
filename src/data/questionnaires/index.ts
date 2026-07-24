import type { Stage, StageId } from '@/types/stage';
import type { Questionnaire } from '@/types/questionnaire';
import { primaryLowQuestionnaire } from './primary-low';
import { primaryHighQuestionnaire } from './primary-high';
import { middleSchoolQuestionnaire } from './middle-school';
import { junior3Questionnaire } from './junior-3';
import { senior1Questionnaire } from './senior-1';
import { senior3Questionnaire } from './senior-3';

export const questionnaires: Record<StageId, Questionnaire> = {
  'primary-low': primaryLowQuestionnaire,
  'primary-high': primaryHighQuestionnaire,
  'junior-1': middleSchoolQuestionnaire,
  'junior-3': junior3Questionnaire,
  'senior-1': senior1Questionnaire,
  'senior-3': senior3Questionnaire,
};

export function getQuestionnaire(stageId: string): Questionnaire | null {
  return questionnaires[stageId as StageId] ?? null;
}

export const stages: Record<StageId, Stage> = {
  'primary-low': {
    id: 'primary-low',
    name: '小学低年级',
    gradeRange: '1-2年级',
    coreAbility: '勤勉感',
    dimensionCount: 3,
    description: '培养学习兴趣、基础习惯和情绪适应能力',
  },
  'primary-high': {
    id: 'primary-high',
    name: '小学高年级',
    gradeRange: '3-6年级',
    coreAbility: '胜任感',
    dimensionCount: 3,
    description: '建立自我效能、策略应对和自我滋养能力',
  },
  'junior-1': {
    id: 'junior-1',
    name: '初中非毕业',
    gradeRange: '初一、初二',
    coreAbility: '韧性萌芽与规划能力',
    dimensionCount: 4,
    description: '发展多任务管理、目标规划、学业归因和情绪韧性',
  },
  'junior-3': {
    id: 'junior-3',
    name: '初三大',
    gradeRange: '初三',
    coreAbility: '基于规划能力的心理韧性',
    dimensionCount: 7,
    description: '提升压力应对、时间规划、归因风格等核心能力',
  },
  'senior-1': {
    id: 'senior-1',
    name: '高一高二',
    gradeRange: '高一、高二',
    coreAbility: '意义与价值感的建立',
    dimensionCount: 7,
    description: '探索自我认知、方向建构、意义感知等关键发展任务',
  },
  'senior-3': {
    id: 'senior-3',
    name: '高三',
    gradeRange: '高三',
    coreAbility: '选择与承担',
    dimensionCount: 4,
    description: '聚焦决策清晰度、目标行动力、压力韧性和关系自主',
  },
};

export function getStage(stageId: StageId): Stage | undefined {
  return stages[stageId];
}

export function getAllStages(): Stage[] {
  return Object.values(stages);
}
