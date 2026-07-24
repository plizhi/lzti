import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/api/response';
import { validateStageId, validateQuestionnaireType } from '@/lib/validators';
import { calculateAllDimensionScores } from '@/lib/scoring/calculator';
import { determineAllQuadrants } from '@/lib/scoring';
import { getQuestionnaire } from '@/data/questionnaires';
import type { Questionnaire, Question, Dimension, ScoringConfig, ScoringAxisConfig } from '@/types/questionnaire';
import type { DimensionScores, DimensionQuadrants } from '@/types/assessment';
import type { QuadrantType } from '@/types/report';

function buildScoringConfig(
  questionnaire: Questionnaire,
  questions: Question[]
): ScoringConfig {
  const axes: ScoringAxisConfig[] = [];
  const reverseQuestions: string[] = [];

  for (const dimension of questionnaire.dimensions) {
    const axis1Id = typeof dimension.axes[0] === 'string' ? dimension.axes[0] : dimension.axes[0].id;
    const axis2Id = typeof dimension.axes[1] === 'string' ? dimension.axes[1] : dimension.axes[1].id;

    const axis1Questions = questions.filter(
      (q) => q.dimensionId === dimension.id && q.axisId === axis1Id
    );
    const axis2Questions = questions.filter(
      (q) => q.dimensionId === dimension.id && q.axisId === axis2Id
    );

    if (axis1Questions.length > 0) {
      axes.push({
        axisId: axis1Id,
        questionIds: axis1Questions.map((q) => q.id),
      });
      axis1Questions.filter((q) => q.reverse).forEach((q) => reverseQuestions.push(q.id));
    }

    if (axis2Questions.length > 0) {
      axes.push({
        axisId: axis2Id,
        questionIds: axis2Questions.map((q) => q.id),
      });
      axis2Questions.filter((q) => q.reverse).forEach((q) => reverseQuestions.push(q.id));
    }
  }

  return {
    stageId: questionnaire.stageId,
    questionnaireType: 'parent',
    axes,
    reverseQuestions,
  };
}

export async function createSession(userId: string, data: { childId: string; stageId: string }) {
  const child = await prisma.child.findFirst({
    where: { id: data.childId, userId },
  });

  if (!child) {
    throw new ApiError('孩子档案不存在', 404);
  }

  const stageId = validateStageId(data.stageId);

  const session = await prisma.assessmentSession.create({
    data: {
      childId: data.childId,
      stageId,
      completed: JSON.stringify({ parent: false, student: false, teacher: false }),
    },
  });

  return {
    id: session.id,
    childId: session.childId,
    stageId: session.stageId,
    completed: JSON.parse(session.completed),
    createdAt: session.createdAt,
  };
}

export async function getSession(sessionId: string, userId: string) {
  const session = await prisma.assessmentSession.findFirst({
    where: { id: sessionId, child: { userId } },
    include: {
      child: {
        select: { id: true, name: true },
      },
      attempts: {
        select: {
          id: true,
          questionnaireType: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!session) {
    throw new ApiError('测评会话不存在', 404);
  }

  return {
    id: session.id,
    child: session.child,
    stageId: session.stageId,
    completed: JSON.parse(session.completed),
    attempts: session.attempts,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export async function submitAttempt(
  sessionId: string,
  userId: string,
  data: {
    questionnaireType: string;
    answers: Record<string, number>;
  }
) {
  const questionnaireType = validateQuestionnaireType(data.questionnaireType);

  const session = await prisma.assessmentSession.findFirst({
    where: { id: sessionId, child: { userId } },
    include: { child: true },
  });

  if (!session) {
    throw new ApiError('测评会话不存在', 404);
  }

  const existingAttempt = await prisma.sessionAttempt.findFirst({
    where: { sessionId, questionnaireType },
  });

  if (existingAttempt) {
    throw new ApiError('该类型测评已提交', 400);
  }

  const questionnaire = getQuestionnaire(session.stageId);
  if (!questionnaire) {
    throw new ApiError('问卷不存在', 404);
  }

  let questions: Question[];
  switch (questionnaireType) {
    case 'student':
      questions = questionnaire.studentQuestions ?? questionnaire.questions ?? [];
      break;
    case 'parent':
      questions = questionnaire.parentQuestions ?? questionnaire.questions ?? [];
      break;
    case 'teacher':
      questions = questionnaire.teacherQuestions ?? questionnaire.questions ?? [];
      break;
    default:
      throw new ApiError('问卷类型错误', 400);
  }

  const scoringConfig = buildScoringConfig(questionnaire, questions);
  const { scores } = calculateAllDimensionScores(scoringConfig, questions, data.answers);
  const quadrants = determineAllQuadrants(scores);

  const attempt = await prisma.sessionAttempt.create({
    data: {
      sessionId,
      childId: session.childId,
      questionnaireType,
      stageId: session.stageId,
      answers: data.answers,
      scores,
      quadrants,
    },
  });

  const attemptId = attempt.id;

  return {
    attemptId,
    sessionId,
    questionnaireType,
    scores,
    quadrants,
    createdAt: attempt.createdAt,
  };
}

export async function getReport(
  sessionId: string,
  userId: string,
  query: {
    type?: string;
    view?: string;
  }
) {
  const session = await prisma.assessmentSession.findFirst({
    where: { id: sessionId, child: { userId } },
    include: {
      child: true,
      attempts: {
        include: { report: true },
      },
    },
  });

  if (!session) {
    throw new ApiError('测评会话不存在', 404);
  }

  const questionnaire = getQuestionnaire(session.stageId);
  if (!questionnaire) {
    throw new ApiError('问卷不存在', 404);
  }

  const reportType = query.type || 'single';

  if (reportType === 'single') {
    const viewType = query.view || 'parent';
    const attempt = session.attempts.find((a) => a.questionnaireType === viewType);

    if (!attempt) {
      throw new ApiError('该视角测评尚未完成', 404);
    }

    if (!attempt.report) {
      throw new ApiError('报告不存在', 404);
    }

    return {
      type: 'single',
      sessionId,
      child: { id: session.child.id, name: session.child.name },
      report: {
        id: attempt.report.id,
        questionnaireType: attempt.questionnaireType,
        currentStatus: attempt.report.currentStatus,
        trendAnalysis: attempt.report.trendAnalysis,
        suggestions: attempt.report.suggestions,
        createdAt: attempt.report.createdAt,
      },
    };
  }

  if (reportType === 'parent-child') {
    const parentAttempt = session.attempts.find((a) => a.questionnaireType === 'parent');
    const studentAttempt = session.attempts.find((a) => a.questionnaireType === 'student');

    if (!parentAttempt || !studentAttempt) {
      throw new ApiError('家长和学生测评尚未完成', 400);
    }

    if (!parentAttempt.report || !studentAttempt.report) {
      throw new ApiError('报告数据不完整', 500);
    }

    const parentScores = parentAttempt.scores as DimensionScores;
    const studentScores = studentAttempt.scores as DimensionScores;
    const parentQuadrants = parentAttempt.quadrants as DimensionQuadrants;
    const studentQuadrants = studentAttempt.quadrants as DimensionQuadrants;

    const comparisonStatuses = questionnaire.dimensions.map((dimension: Dimension) => {
      const parentQuadrant = parentQuadrants[dimension.id] as QuadrantType;
      const studentQuadrant = studentQuadrants[dimension.id] as QuadrantType;
      const parentScore = parentScores[dimension.id];
      const studentScore = studentScores[dimension.id];

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
        isConsistent: parentQuadrant === studentQuadrant,
      };
    });

    const comparisonSuggestions = comparisonStatuses
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

    const radarLabels = questionnaire.dimensions.flatMap((d: Dimension) =>
      d.axes.map((a) => (typeof a === 'string' ? a : a.name))
    );

    const radarDatasets = [
      {
        label: '家长',
        color: '#f59e0b',
        data: questionnaire.dimensions.flatMap((d: Dimension) => {
          const s = parentScores[d.id];
          return [s?.axis1 ?? 3, s?.axis2 ?? 3];
        }),
      },
      {
        label: '孩子',
        color: '#3b82f6',
        data: questionnaire.dimensions.flatMap((d: Dimension) => {
          const s = studentScores[d.id];
          return [s?.axis1 ?? 3, s?.axis2 ?? 3];
        }),
      },
    ];

    return {
      type: 'parent-child',
      sessionId,
      child: { id: session.child.id, name: session.child.name },
      comparisonStatuses,
      comparisonSuggestions,
      highlights,
      developmentAreas,
      radarLabels,
      radarDatasets,
      createdAt: new Date(),
    };
  }

  if (reportType === 'home-school') {
    const parentAttempt = session.attempts.find((a) => a.questionnaireType === 'parent');
    const studentAttempt = session.attempts.find((a) => a.questionnaireType === 'student');
    const teacherAttempt = session.attempts.find((a) => a.questionnaireType === 'teacher');

    if (!parentAttempt || !studentAttempt || !teacherAttempt) {
      throw new ApiError('家长、学生和教师测评尚未全部完成', 400);
    }

    if (!parentAttempt.report || !studentAttempt.report || !teacherAttempt.report) {
      throw new ApiError('报告数据不完整', 500);
    }

    const parentScores = parentAttempt.scores as DimensionScores;
    const studentScores = studentAttempt.scores as DimensionScores;
    const teacherScores = teacherAttempt.scores as DimensionScores;
    const parentQuadrants = parentAttempt.quadrants as DimensionQuadrants;
    const studentQuadrants = studentAttempt.quadrants as DimensionQuadrants;
    const teacherQuadrants = teacherAttempt.quadrants as DimensionQuadrants;

    const comparisonStatuses = questionnaire.dimensions.map((dimension: Dimension) => {
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
          parentQuadrant === studentQuadrant && studentQuadrant === teacherQuadrant,
      };
    });

    const consensusDimensions = comparisonStatuses
      .filter((s) => s.isConsistent)
      .map((s) => s.dimensionId);

    const comparisonSuggestions = comparisonStatuses
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

    const radarLabels = questionnaire.dimensions.flatMap((d: Dimension) =>
      d.axes.map((a) => (typeof a === 'string' ? a : a.name))
    );

    const radarDatasets = [
      {
        label: '家长',
        color: '#f59e0b',
        data: questionnaire.dimensions.flatMap((d: Dimension) => [
          parentScores[d.id]?.axis1 ?? 3,
          parentScores[d.id]?.axis2 ?? 3,
        ]),
      },
      {
        label: '孩子',
        color: '#3b82f6',
        data: questionnaire.dimensions.flatMap((d: Dimension) => [
          studentScores[d.id]?.axis1 ?? 3,
          studentScores[d.id]?.axis2 ?? 3,
        ]),
      },
      {
        label: '老师',
        color: '#10b981',
        data: questionnaire.dimensions.flatMap((d: Dimension) => [
          teacherScores[d.id]?.axis1 ?? 3,
          teacherScores[d.id]?.axis2 ?? 3,
        ]),
      },
    ];

    return {
      type: 'home-school',
      sessionId,
      child: { id: session.child.id, name: session.child.name },
      comparisonStatuses,
      consensusDimensions,
      comparisonSuggestions,
      highlights,
      developmentAreas,
      radarLabels,
      radarDatasets,
      createdAt: new Date(),
    };
  }

  throw new ApiError('无效的报告类型', 400);
}
