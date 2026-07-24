// 报告生成器
// 支持单视角报告、亲子对比报告、家校三方报告

import type { Dimension, Questionnaire, ScoringConfig, Question } from '@/types/questionnaire';
import type { DimensionScores, DimensionQuadrants } from '@/types/assessment';
import type {
  SingleReport,
  ParentChildComparisonReport,
  HomeSchoolComparisonReport,
  CurrentStatus,
  FocusSuggestion,
  ComparisonStatus,
  ComparisonSuggestion,
  QuadrantType,
  AxisScores,
  TrendType,
} from '@/types/report';
import { determineAllQuadrants } from '@/lib/scoring/quadrant';
import { calculateAllDimensionScores, determineQuadrantType } from '@/lib/scoring/calculator';

/**
 * 获取维度完整信息
 */
function getDimensionWithQuadrant(dimension: Dimension, quadrantType: QuadrantType) {
  const quadrant = dimension.quadrants.find((q) => q.id === quadrantType);
  return {
    dimensionId: dimension.id,
    dimensionName: dimension.name,
    quadrantType,
    quadrantName: quadrant?.name ?? '',
    description: quadrant?.description ?? '',
    profile: quadrant?.profile,
    coreNeed: quadrant?.coreNeed,
    guidance: quadrant?.guidance,
    parentAction: quadrant?.parentAction,
  };
}

/**
 * 计算单个尝试的得分和象限
 */
export function calculateAttemptScores(
  questionnaire: Questionnaire,
  scoringConfig: ScoringConfig,
  answers: Record<string, number>
): { scores: DimensionScores; quadrants: DimensionQuadrants } {
  const questions = questionnaire.studentQuestions ?? questionnaire.questions ?? [];
  const { scores } = calculateAllDimensionScores(scoringConfig, questions, answers);
  const quadrants = determineAllQuadrants(scores);
  return { scores, quadrants };
}

/**
 * 生成单视角报告
 */
export function generateSingleReport(
  questionnaire: Questionnaire,
  scoringConfig: ScoringConfig,
  answers: Record<string, number>,
  attemptId: string,
  questionnaireType: 'student' | 'parent' | 'teacher'
): SingleReport {
  const { scores, quadrants } = calculateAttemptScores(questionnaire, scoringConfig, answers);

  const currentStatus: CurrentStatus[] = questionnaire.dimensions.map((dimension) => {
    const quadrantType = quadrants[dimension.id] as QuadrantType;
    const dimensionScores = scores[dimension.id];
    const quadrant = dimension.quadrants.find((q) => q.id === quadrantType);

    return {
      dimensionId: dimension.id,
      dimensionName: dimension.name,
      quadrantType,
      quadrantName: quadrant?.name ?? '',
      description: quadrant?.description ?? '',
      profile: quadrant?.profile,
      coreNeed: quadrant?.coreNeed,
      guidance: quadrant?.guidance,
      parentAction: quadrant?.parentAction,
      scores: {
        axis1: dimensionScores?.axis1 ?? 3,
        axis2: dimensionScores?.axis2 ?? 3,
      },
    };
  });

  // 生成关注建议
  const suggestions: FocusSuggestion[] = currentStatus
    .filter((s) => s.quadrantType === 'overwhelmed' || s.quadrantType === 'passive')
    .map((s) => ({
      dimensionId: s.dimensionId,
      dimensionName: s.dimensionName,
      priority: s.quadrantType === 'overwhelmed' ? 'high' : 'medium',
      quadrantType: s.quadrantType,
      quadrantName: s.quadrantName,
      guidance: s.guidance ?? '',
      profile: s.profile,
      coreNeed: s.coreNeed,
      parentAction: s.parentAction,
    }));

  return {
    id: crypto.randomUUID(),
    attemptId,
    questionnaireType,
    currentStatus,
    trendAnalysis: null,
    trajectory: {
      riskLevel: 'medium',
      riskCombinations: [],
      predictedPath: '保持当前趋势发展',
      protectiveFactors: [],
    },
    suggestions,
    createdAt: new Date(),
  };
}

/**
 * 生成亲子对比报告
 */
export function generateParentChildReport(
  questionnaire: Questionnaire,
  parentScoringConfig: ScoringConfig,
  studentScoringConfig: ScoringConfig,
  parentAnswers: Record<string, number>,
  studentAnswers: Record<string, number>,
  parentAttemptId: string,
  studentAttemptId: string
): ParentChildComparisonReport {
  const { scores: parentScores, quadrants: parentQuadrants } = calculateAttemptScores(
    questionnaire,
    parentScoringConfig,
    parentAnswers
  );
  const { scores: studentScores, quadrants: studentQuadrants } = calculateAttemptScores(
    questionnaire,
    studentScoringConfig,
    studentAnswers
  );

  // 构建对比状态
  const comparisonStatuses: ComparisonStatus[] = questionnaire.dimensions.map((dimension) => {
    const parentQuadrant = parentQuadrants[dimension.id] as QuadrantType;
    const studentQuadrant = studentQuadrants[dimension.id] as QuadrantType;
    const parentScore = parentScores[dimension.id];
    const studentScore = studentScores[dimension.id];

    const isConsistent = parentQuadrant === studentQuadrant;

    return {
      dimensionId: dimension.id,
      dimensionName: dimension.name,
      parent: {
        quadrantType: parentQuadrant,
        quadrantName: dimension.quadrants.find((q) => q.id === parentQuadrant)?.name ?? '',
        scores: {
          axis1: parentScore?.axis1 ?? 3,
          axis2: parentScore?.axis2 ?? 3,
        },
      },
      student: {
        quadrantType: studentQuadrant,
        quadrantName: dimension.quadrants.find((q) => q.id === studentQuadrant)?.name ?? '',
        scores: {
          axis1: studentScore?.axis1 ?? 3,
          axis2: studentScore?.axis2 ?? 3,
        },
      },
      isConsistent,
    };
  });

  // 生成对比建议
  const comparisonSuggestions: ComparisonSuggestion[] = comparisonStatuses
    .filter((s) => !s.isConsistent)
    .map((s) => ({
      dimensionId: s.dimensionId,
      dimensionName: s.dimensionName ?? '',
      differenceDescription: `家长认为是"${s.parent?.quadrantName}"，孩子自评为"${s.student?.quadrantName}"`,
      possibleReasons: [
        '孩子在家里和学校的行为表现可能不同',
        '家长和孩子的判断标准可能不一致',
        '孩子可能对某些行为已经习以为常，没有意识到',
      ],
      suggestions: [
        '可以和孩子一起回顾一个具体场景，共同讨论',
        '避免直接否定孩子的感受，先倾听再引导',
      ],
      priority: 'medium' as const,
    }));

  // 生成雷达图数据
  const radarLabels = questionnaire.dimensions.flatMap((d) =>
    d.axes.map((a) => (typeof a === 'string' ? a : a.name))
  );

  const radarDatasets = [
    {
      label: '家长',
      color: '#f59e0b', // amber-500
      data: questionnaire.dimensions.flatMap((d) => {
        const s = parentScores[d.id];
        return [s?.axis1 ?? 3, s?.axis2 ?? 3];
      }),
    },
    {
      label: '孩子',
      color: '#3b82f6', // blue-500
      data: questionnaire.dimensions.flatMap((d) => {
        const s = studentScores[d.id];
        return [s?.axis1 ?? 3, s?.axis2 ?? 3];
      }),
    },
  ];

  // 亮点和待引导
  const consistentOptimal = comparisonStatuses.filter(
    (s) => s.isConsistent && s.parent?.quadrantType === 'optimal'
  );
  const highlights = consistentOptimal.map((s) => ({
    dimensionId: s.dimensionId,
    description: `在"${s.dimensionName}"上，家长和孩子看法一致，都认为是"${s.parent?.quadrantName}"`,
  }));

  const developmentAreas = comparisonStatuses
    .filter((s) => !s.isConsistent)
    .map((s) => ({
      dimensionId: s.dimensionId,
      description: `在"${s.dimensionName}"上存在认知差异：${s.parent?.quadrantName} vs ${s.student?.quadrantName}`,
    }));

  return {
    id: crypto.randomUUID(),
    parentAttemptId,
    studentAttemptId,
    questionnaireType: 'parent',
    comparisonStatuses,
    comparisonSuggestions,
    highlights,
    developmentAreas,
    radarLabels,
    radarDatasets,
    createdAt: new Date(),
  };
}

/**
 * 生成家校三方对比报告
 */
export function generateHomeSchoolReport(
  questionnaire: Questionnaire,
  parentScoringConfig: ScoringConfig,
  studentScoringConfig: ScoringConfig,
  teacherScoringConfig: ScoringConfig,
  parentAnswers: Record<string, number>,
  studentAnswers: Record<string, number>,
  teacherAnswers: Record<string, number>,
  parentAttemptId: string,
  studentAttemptId: string,
  teacherAttemptId: string
): HomeSchoolComparisonReport {
  const { scores: parentScores, quadrants: parentQuadrants } = calculateAttemptScores(
    questionnaire,
    parentScoringConfig,
    parentAnswers
  );
  const { scores: studentScores, quadrants: studentQuadrants } = calculateAttemptScores(
    questionnaire,
    studentScoringConfig,
    studentAnswers
  );
  const { scores: teacherScores, quadrants: teacherQuadrants } = calculateAttemptScores(
    questionnaire,
    teacherScoringConfig,
    teacherAnswers
  );

  // 构建对比状态
  const comparisonStatuses: ComparisonStatus[] = questionnaire.dimensions.map((dimension) => {
    const parentQuadrant = parentQuadrants[dimension.id] as QuadrantType;
    const studentQuadrant = studentQuadrants[dimension.id] as QuadrantType;
    const teacherQuadrant = teacherQuadrants[dimension.id] as QuadrantType;

    return {
      dimensionId: dimension.id,
      dimensionName: dimension.name,
      parent: {
        quadrantType: parentQuadrant,
        quadrantName: dimension.quadrants.find((q) => q.id === parentQuadrant)?.name ?? '',
        scores: {
          axis1: parentScores[dimension.id]?.axis1 ?? 3,
          axis2: parentScores[dimension.id]?.axis2 ?? 3,
        },
      },
      student: {
        quadrantType: studentQuadrant,
        quadrantName: dimension.quadrants.find((q) => q.id === studentQuadrant)?.name ?? '',
        scores: {
          axis1: studentScores[dimension.id]?.axis1 ?? 3,
          axis2: studentScores[dimension.id]?.axis2 ?? 3,
        },
      },
      teacher: {
        quadrantType: teacherQuadrant,
        quadrantName: dimension.quadrants.find((q) => q.id === teacherQuadrant)?.name ?? '',
        scores: {
          axis1: teacherScores[dimension.id]?.axis1 ?? 3,
          axis2: teacherScores[dimension.id]?.axis2 ?? 3,
        },
      },
      isConsistent:
        parentQuadrant === studentQuadrant &&
        studentQuadrant === teacherQuadrant,
    };
  });

  // 生成对比建议
  const comparisonSuggestions: ComparisonSuggestion[] = comparisonStatuses
    .filter((s) => !s.isConsistent)
    .map((s) => ({
      dimensionId: s.dimensionId,
      dimensionName: s.dimensionName ?? '',
      differenceDescription: `三方认知不一致：家长(${s.parent?.quadrantName}) / 孩子(${s.student?.quadrantName}) / 老师(${s.teacher?.quadrantName})`,
      possibleReasons: [
        '孩子在不同环境（家里/学校）表现不同是正常的',
        '家长和老师观察到的维度可能不同',
        '孩子的自我认知可能与实际表现有差异',
      ],
      suggestions: [
        '建议与老师沟通，了解孩子在校的具体表现',
        '与孩子交流时，关注具体行为而非笼统评价',
      ],
      priority: 'medium' as const,
    }));

  // 三方共识
  const consensusDimensions = comparisonStatuses
    .filter((s) => s.isConsistent)
    .map((s) => s.dimensionId);

  // 亮点和待引导
  const highlights = comparisonStatuses
    .filter((s) => s.isConsistent && s.parent?.quadrantType === 'optimal')
    .map((s) => ({
      dimensionId: s.dimensionId,
      description: `在"${s.dimensionName}"上三方一致认为是"${s.parent?.quadrantName}"`,
    }));

  const developmentAreas = comparisonStatuses
    .filter((s) => !s.isConsistent)
    .map((s) => ({
      dimensionId: s.dimensionId,
      description: `在"${s.dimensionName}"上需要关注三方差异`,
    }));

  // 生成雷达图数据
  const radarLabels = questionnaire.dimensions.flatMap((d) =>
    d.axes.map((a) => (typeof a === 'string' ? a : a.name))
  );

  const radarDatasets = [
    {
      label: '家长',
      color: '#f59e0b',
      data: questionnaire.dimensions.flatMap((d) => [
        parentScores[d.id]?.axis1 ?? 3,
        parentScores[d.id]?.axis2 ?? 3,
      ]),
    },
    {
      label: '孩子',
      color: '#3b82f6',
      data: questionnaire.dimensions.flatMap((d) => [
        studentScores[d.id]?.axis1 ?? 3,
        studentScores[d.id]?.axis2 ?? 3,
      ]),
    },
    {
      label: '老师',
      color: '#10b981',
      data: questionnaire.dimensions.flatMap((d) => [
        teacherScores[d.id]?.axis1 ?? 3,
        teacherScores[d.id]?.axis2 ?? 3,
      ]),
    },
  ];

  return {
    id: crypto.randomUUID(),
    parentAttemptId,
    studentAttemptId,
    teacherAttemptId,
    comparisonStatuses,
    comparisonSuggestions,
    consensusDimensions,
    homeSchoolDifferences: [],
    highlights,
    developmentAreas,
    radarLabels,
    radarDatasets,
    createdAt: new Date(),
  };
}
