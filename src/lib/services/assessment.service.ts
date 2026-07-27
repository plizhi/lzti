import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/api/response';
import { validateStageId, validateQuestionnaireType } from '@/lib/validators';
import { calculateAllDimensionScores } from '@/lib/scoring/calculator';
import { determineAllQuadrants } from '@/lib/scoring';
import { getQuestionnaire } from '@/data/questionnaires';
import { generateSingleReport } from '@/lib/report/generator';
import type { Questionnaire, Question, Dimension, ScoringConfig, ScoringAxisConfig } from '@/types/questionnaire';
import type { DimensionScores, DimensionQuadrants } from '@/types/assessment';
import type { QuadrantType, TrendType, TrendAnalysis, DimensionTrend } from '@/types/report';

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

// 获取用户所有孩子的测评历史
export async function getHistorySessions(userId: string, params?: { childId?: string; stageId?: string; limit?: number }) {
  const where = {
    child: { userId },
    ...(params?.childId && { childId: params.childId }),
    ...(params?.stageId && { stageId: params.stageId }),
  };

  const sessions = await prisma.assessmentSession.findMany({
    where,
    include: {
      child: {
        select: { id: true, name: true, gender: true, birthDate: true, grade: true },
      },
      attempts: {
        select: {
          id: true,
          questionnaireType: true,
          createdAt: true,
          scores: true,
          quadrants: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: params?.limit ?? 50,
  });

  // 获取学段名称
  const sessionsWithStageName = sessions.map((session) => {
    const questionnaire = getQuestionnaire(session.stageId);
    return {
      id: session.id,
      stageId: session.stageId,
      stageName: questionnaire?.name ?? session.stageId,
      completed: JSON.parse(session.completed),
      attempts: session.attempts.map((a) => ({
        id: a.id,
        questionnaireType: a.questionnaireType,
        createdAt: a.createdAt,
        scores: a.scores,
        quadrants: a.quadrants,
      })),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      child: session.child,
    };
  });

  // 按孩子分组
  const childMap = new Map<string, { child: typeof sessionsWithStageName[0]['child']; sessions: typeof sessionsWithStageName }>();
  for (const session of sessionsWithStageName) {
    const childId = session.child.id;
    if (!childMap.has(childId)) {
      childMap.set(childId, { child: session.child, sessions: [] });
    }
    childMap.get(childId)!.sessions.push(session);
  }

  return {
    children: Array.from(childMap.values()),
  };
}

// 通过 slot 创建 session（用于分享测评流程）
export async function createSessionBySlot(
  slotCode: string,
  childId: string
) {
  // 验证 slot
  const slot = await prisma.slot.findUnique({
    where: { code: slotCode },
    include: { batch: true },
  });

  if (!slot) {
    throw new ApiError('邀请码不存在', 404);
  }

  if (slot.usedBy) {
    throw new ApiError('此链接已被使用', 400);
  }

  if (slot.expiresAt < new Date()) {
    throw new ApiError('此链接已过期', 400);
  }

  if (slot.type !== 'student' && slot.type !== 'teacher') {
    throw new ApiError('此链接不是测评邀请', 400);
  }

  const stageId = slot.batch.stageId;

  // 验证孩子存在且属于分享者
  const child = await prisma.child.findFirst({
    where: { id: childId, userId: slot.batch.userId },
  });

  if (!child) {
    throw new ApiError('孩子档案不存在', 404);
  }

  // 更新 slot
  await prisma.slot.update({
    where: { id: slot.id },
    data: {
      usedBy: slot.batch.userId,
      usedAt: new Date(),
      childId,
    },
  });

  // 创建 session
  const session = await prisma.assessmentSession.create({
    data: {
      childId,
      stageId,
      slotId: slot.id,
      completed: JSON.stringify({ parent: false, student: false, teacher: false }),
    },
  });

  return {
    id: session.id,
    childId: session.childId,
    stageId: session.stageId,
    completed: JSON.parse(session.completed),
    createdAt: session.createdAt,
    questionnaireType: slot.type,
  };
}

export async function createSession(userId: string, data: { childId: string; stageId: string; slotId?: string }) {
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
      slotId: data.slotId,
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
  userId: string | null,
  data: {
    questionnaireType: string;
    answers: Record<string, number>;
  }
) {
  const questionnaireType = validateQuestionnaireType(data.questionnaireType);

  // 如果有 userId，验证 session 属于该用户
  // 如果没有 userId（slot 流程），只验证 session 存在
  const session = userId
    ? await prisma.assessmentSession.findFirst({
        where: { id: sessionId, child: { userId } },
        include: { child: true },
      })
    : await prisma.assessmentSession.findUnique({
        where: { id: sessionId },
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

  // 查询上一条同类型 attempt 用于趋势分析
  const previousAttempt = await prisma.sessionAttempt.findFirst({
    where: {
      childId: session.childId,
      questionnaireType,
      stageId: session.stageId,
      id: { not: attemptId },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 计算趋势分析
  let trendAnalysis: TrendAnalysis | null = null;
  if (previousAttempt && questionnaire) {
    trendAnalysis = calculateTrendAnalysis(
      scores,
      previousAttempt.scores as DimensionScores,
      questionnaire.dimensions
    );
  }

  // 生成单视角报告
  const report = generateSingleReport(
    questionnaire,
    scoringConfig,
    data.answers,
    attemptId,
    questionnaireType as 'student' | 'parent' | 'teacher'
  );

  // 保存报告
  await prisma.attemptReport.create({
    data: {
      attemptId,
      currentStatus: JSON.parse(JSON.stringify(report.currentStatus)),
      trajectory: JSON.parse(JSON.stringify(report.trajectory)),
      suggestions: JSON.parse(JSON.stringify(report.suggestions)),
      trendAnalysis: trendAnalysis ? JSON.parse(JSON.stringify(trendAnalysis)) : undefined,
    },
  });

  // 更新 session 完成状态
  const completed = JSON.parse(session.completed);
  completed[questionnaireType as keyof typeof completed] = true;

  await prisma.assessmentSession.update({
    where: { id: sessionId },
    data: { completed: JSON.stringify(completed) },
  });

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

// 计算趋势分析
function calculateTrendAnalysis(
  currentScores: DimensionScores,
  previousScores: DimensionScores,
  dimensions: Dimension[]
): TrendAnalysis {
  const dimensionTrends: DimensionTrend[] = dimensions.map((dimension) => {
    const curr = currentScores[dimension.id];
    const prev = previousScores[dimension.id];

    if (!curr || !prev) {
      return {
        dimensionId: dimension.id,
        dimensionName: dimension.name,
        change: 0,
        trend: 'stable',
        description: '数据不足，无法分析趋势',
      };
    }

    const axis1Change = curr.axis1 - prev.axis1;
    const axis2Change = curr.axis2 - prev.axis2;
    const totalChange = (axis1Change + axis2Change) / 2;

    let trend: TrendType;
    if (totalChange >= 0.6) trend = 'significant-up';
    else if (totalChange >= 0.3) trend = 'up';
    else if (totalChange <= -0.6) trend = 'significant-down';
    else if (totalChange <= -0.3) trend = 'down';
    else trend = 'stable';

    let description: string;
    switch (trend) {
      case 'significant-up':
        description = `${dimension.name}有明显进步`;
        break;
      case 'up':
        description = `${dimension.name}有所改善`;
        break;
      case 'significant-down':
        description = `${dimension.name}明显下降，需关注`;
        break;
      case 'down':
        description = `${dimension.name}有所下降`;
        break;
      default:
        description = `${dimension.name}保持稳定`;
    }

    return {
      dimensionId: dimension.id,
      dimensionName: dimension.name,
      change: Math.round(totalChange * 100) / 100,
      trend,
      description,
    };
  });

  // 计算整体趋势
  const trendWeights: Record<TrendType, number> = {
    'significant-up': 2,
    up: 1,
    stable: 0,
    down: -1,
    'significant-down': -2,
  };
  const avgTrend =
    dimensionTrends.reduce((sum, dt) => sum + trendWeights[dt.trend], 0) /
    dimensionTrends.length;

  let overallTrend: TrendType;
  if (avgTrend >= 1.5) overallTrend = 'significant-up';
  else if (avgTrend >= 0.5) overallTrend = 'up';
  else if (avgTrend <= -1.5) overallTrend = 'significant-down';
  else if (avgTrend <= -0.5) overallTrend = 'down';
  else overallTrend = 'stable';

  return {
    comparedAttemptId: '',
    comparedAt: new Date().toISOString(),
    overallTrend,
    dimensionTrends,
  };
}
