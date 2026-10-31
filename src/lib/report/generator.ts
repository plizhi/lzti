// 报告生成器
// 支持单视角报告、亲子对比报告、家校三方报告

import type { Dimension, Questionnaire, ScoringConfig, Question } from '@/types/questionnaire';
import type { DimensionScores, DimensionQuadrants } from '@/types/assessment';
import type {
  SingleReport,
  ParentChildComparisonReport,
  HomeSchoolComparisonReport,
  TwoRoleComparisonReport,
  CurrentStatus,
  FocusSuggestion,
  ComparisonStatus,
  ComparisonSuggestion,
  ComparisonRole,
  SkippedDimension,
  QuadrantType,
  AxisScores,
  TrendType,
} from '@/types/report';
import { determineAllQuadrants } from '@/lib/scoring/quadrant';
import { calculateAllDimensionScores, determineQuadrantType } from '@/lib/scoring/calculator';

// ============================================================
// 跨视角对比的公共语义
// ============================================================

/** 视角短标签（用于「家长 vs 孩子」这类并列表述） */
const ROLE_LABEL: Record<ComparisonRole, string> = {
  parent: '家长',
  student: '孩子',
  teacher: '老师',
};

/** 视角全称（用于「家长观察是…"」这类句式） */
const ROLE_FULL_LABEL: Record<ComparisonRole, string> = {
  parent: '家长观察',
  student: '孩子自评',
  teacher: '教师评价',
};

/** 视角在「差异描述」里的谓语 */
const ROLE_VERB: Record<ComparisonRole, string> = {
  parent: '认为是',
  student: '自评为',
  teacher: '评价为',
};

/** 雷达图配色（与既有报告一致） */
const ROLE_COLOR: Record<ComparisonRole, string> = {
  parent: '#f59e0b',
  student: '#3b82f6',
  teacher: '#10b981',
};

interface ComparisonParty {
  role: ComparisonRole;
  scores: DimensionScores;
  quadrants: DimensionQuadrants;
}

/** 从 ComparisonStatus 里取出某个视角的槽位 */
function slotOf(status: ComparisonStatus, role: ComparisonRole) {
  if (role === 'parent') return status.parent;
  if (role === 'student') return status.student;
  return status.teacher;
}

/**
 * 构建逐维度对比结果（亲子 / 三方 / 通用两方 共用）。
 *
 * ⚠️ 两种维度**不进入对比**：
 *   1. 数据不全：任一方该维度没有有效分数（某轴一道题都没答上、题号对不上）
 *   2. 中性带：任一方该维度两轴都落在 2.5~3.5 → 不产出象限（没有明显倾向）
 *      （中性带见 src/lib/scoring/quadrant.ts 的 isInNeutralBand）
 *      这类维度如果硬进对比，就会生成「家长认为是""，孩子自评为""」这种垃圾文案。
 *
 * 一致 = 各方象限完全相同；否则为差异。差异本身是信息，不评判谁对错。
 */
function buildComparisonStatuses(
  questionnaire: Questionnaire,
  parties: ComparisonParty[]
): { comparisonStatuses: ComparisonStatus[]; skippedDimensions: SkippedDimension[] } {
  const comparisonStatuses: ComparisonStatus[] = [];
  const skippedDimensions: SkippedDimension[] = [];

  for (const dimension of questionnaire.dimensions) {
    // 1) 数据不全
    const incomplete = parties.find((p) => !p.scores[dimension.id]);
    if (incomplete) {
      skippedDimensions.push({
        dimensionId: dimension.id,
        dimensionName: dimension.name,
        reason: 'incomplete',
        missingRole: incomplete.role,
      });
      continue;
    }

    // 2) 中性带（无象限）
    const neutral = parties.find((p) => !p.quadrants[dimension.id]);
    if (neutral) {
      skippedDimensions.push({
        dimensionId: dimension.id,
        dimensionName: dimension.name,
        reason: 'neutral',
        missingRole: neutral.role,
      });
      continue;
    }

    const firstQuadrant = parties[0].quadrants[dimension.id];
    const isConsistent = parties.every((p) => p.quadrants[dimension.id] === firstQuadrant);

    const status: ComparisonStatus = {
      dimensionId: dimension.id,
      dimensionName: dimension.name,
      isConsistent,
    };

    for (const p of parties) {
      const quadrantType = p.quadrants[dimension.id] as QuadrantType;
      const score = p.scores[dimension.id]!;
      const slot = {
        quadrantType,
        quadrantName: dimension.quadrants.find((q) => q.id === quadrantType)?.name ?? '',
        scores: {
          axis1: score.axis1,
          axis2: score.axis2,
        },
      };
      if (p.role === 'parent') status.parent = slot;
      else if (p.role === 'student') status.student = slot;
      else status.teacher = slot;
    }

    comparisonStatuses.push(status);
  }

  return { comparisonStatuses, skippedDimensions };
}

/** 差异描述：「家长认为是"X"，孩子自评为"Y"」 */
function describeDifference(parties: ComparisonParty[], status: ComparisonStatus): string {
  return parties
    .map((p) => {
      const slot = slotOf(status, p.role);
      return `${ROLE_LABEL[p.role]}${ROLE_VERB[p.role]}"${slot?.quadrantName ?? ''}"`;
    })
    .join('，');
}

/** 差异可能原因（按角色组合给，不评判谁对错） */
function possibleReasonsFor(roles: ComparisonRole[]): string[] {
  const key = [...roles].sort().join('+');
  switch (key) {
    case 'parent+student':
      return [
        '孩子在家里和学校的行为表现可能不同',
        '家长和孩子的判断标准可能不一致',
        '孩子可能对某些行为已经习以为常，没有意识到',
      ];
    case 'parent+teacher':
      return [
        '孩子在家庭和学校环境中的表现可能不同',
        '家长与老师观察的时机、场景不同',
        '双方使用的评价标准可能不完全一致',
      ];
    case 'student+teacher':
      return [
        '孩子对自己的评价与老师观察到的表现可能有差距',
        '孩子在课堂上和在私下里的状态可能不同',
        '孩子可能没有意识到自己在家里的表现',
      ];
    default:
      return [
        '不同视角观察到的场景与时机不同',
        '不同视角使用的评价标准可能不完全一致',
        '同一件事在不同环境下本来就可能有差别',
      ];
  }
}

/** 差异之后的行动建议 */
function suggestionsFor(roles: ComparisonRole[]): string[] {
  const key = [...roles].sort().join('+');
  switch (key) {
    case 'parent+student':
      return [
        '可以和孩子一起回顾一个具体场景，共同讨论',
        '避免直接否定孩子的感受，先倾听再引导',
      ];
    case 'parent+teacher':
      return [
        '与老师沟通时描述具体场景，而不是笼统评价',
        '在学校和家里各记录一次同一件事的表现，再放在一起看',
      ];
    case 'student+teacher':
      return [
        '先听孩子说说自己在学校的感受，再一起对照老师的观察',
        '用具体事件讨论差异，而不是评价性语言',
      ];
    default:
      return [
        '找一个具体的场景一起回顾，把两边的观察放在一起看',
        '先听完对方的理由，再讨论下一步怎么做',
      ];
  }
}

/**
 * 优先级：一方落在「最需要主动关注」象限、另一方不落在 → 值得优先一起讨论。
 * 只决定「先聊哪个维度」，不表示谁对谁错。
 */
function priorityFor(parties: ComparisonParty[], status: ComparisonStatus): 'high' | 'medium' {
  const types = parties.map((p) => slotOf(status, p.role)?.quadrantType);
  const hasOverwhelmed = types.includes('overwhelmed');
  const allOverwhelmed = types.every((t) => t === 'overwhelmed');
  return hasOverwhelmed && !allOverwhelmed ? 'high' : 'medium';
}

/** 差异条目 → 对比建议 */
function buildComparisonSuggestions(
  parties: ComparisonParty[],
  comparisonStatuses: ComparisonStatus[]
): ComparisonSuggestion[] {
  const roles = parties.map((p) => p.role);
  return comparisonStatuses
    .filter((s) => !s.isConsistent)
    .map((s) => ({
      dimensionId: s.dimensionId,
      dimensionName: s.dimensionName ?? '',
      differenceDescription: describeDifference(parties, s),
      possibleReasons: possibleReasonsFor(roles),
      suggestions: suggestionsFor(roles),
      priority: priorityFor(parties, s),
    }));
}

/** 一致且处于理想状态 → 亮点 */
function buildHighlights(
  parties: ComparisonParty[],
  comparisonStatuses: ComparisonStatus[]
): Array<{ dimensionId: string; description: string }> {
  const first = parties[0].role;
  return comparisonStatuses
    .filter((s) => s.isConsistent && slotOf(s, first)?.quadrantType === 'optimal')
    .map((s) => {
      const quadrantName = slotOf(s, first)?.quadrantName ?? '';
      const names = parties.map((p) => ROLE_LABEL[p.role]).join('和');
      return {
        dimensionId: s.dimensionId,
        description: `在"${s.dimensionName}"上，${names}看法一致，都认为是"${quadrantName}"`,
      };
    });
}

/** 存在差异 → 待引导 */
function buildDevelopmentAreas(
  parties: ComparisonParty[],
  comparisonStatuses: ComparisonStatus[]
): Array<{ dimensionId: string; description: string }> {
  return comparisonStatuses
    .filter((s) => !s.isConsistent)
    .map((s) => {
      const names = parties.map((p) => ROLE_LABEL[p.role]);
      const values = parties.map((p) => slotOf(s, p.role)?.quadrantName ?? '');
      return {
        dimensionId: s.dimensionId,
        description: `在"${s.dimensionName}"上存在认知差异：${names[0]}「${values[0]}」 vs ${names[1]}「${values[1]}」`,
      };
    });
}

/** 雷达图数据：只画各方都有数据的维度，保证 labels 与 data 一一对应 */
function buildRadarData(
  questionnaire: Questionnaire,
  parties: ComparisonParty[]
): { radarLabels: string[]; radarDatasets: Array<{ label: string; color: string; data: number[] }> } {
  const radarDimensions = questionnaire.dimensions.filter((d) =>
    parties.every((p) => p.scores[d.id])
  );
  const radarLabels = radarDimensions.flatMap((d) =>
    d.axes.map((a) => (typeof a === 'string' ? a : a.name))
  );
  const radarDatasets = parties.map((p) => ({
    label: ROLE_FULL_LABEL[p.role],
    color: ROLE_COLOR[p.role],
    data: radarDimensions.flatMap((d) => {
      const s = p.scores[d.id]!;
      return [s.axis1, s.axis2];
    }),
  }));
  return { radarLabels, radarDatasets };
}


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
  answers: Record<string, number>,
  questionnaireType: 'student' | 'parent' | 'teacher' = 'student'
): { scores: DimensionScores; quadrants: DimensionQuadrants } {
  let questions;
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
  }
  const { scores } = calculateAllDimensionScores(scoringConfig, questions, answers);
  const quadrants = determineAllQuadrants(scores);
  return { scores, quadrants };
}

/**
 * 计算轨迹预测
 */
function calculateTrajectory(
  quadrants: DimensionQuadrants,
  currentStatus: CurrentStatus[]
): { riskLevel: 'low' | 'medium' | 'high' | 'critical'; riskCombinations: Array<{ dimensionIds: string[]; riskType: string; description: string }>; predictedPath: string; protectiveFactors: string[] } {
  const quadrantCount: Record<string, number> = {};
  const overwhelmedDimensions: string[] = [];
  const passiveDimensions: string[] = [];
  const optimalDimensions: string[] = [];
  const strategyDimensions: string[] = [];

  for (const [dimensionId, quadrant] of Object.entries(quadrants)) {
    quadrantCount[quadrant] = (quadrantCount[quadrant] || 0) + 1;

    if (quadrant === 'overwhelmed') overwhelmedDimensions.push(dimensionId);
    else if (quadrant === 'passive') passiveDimensions.push(dimensionId);
    else if (quadrant === 'optimal') optimalDimensions.push(dimensionId);
    else if (quadrant === 'strategy') strategyDimensions.push(dimensionId);
  }

  const total = Object.values(quadrantCount).reduce((a, b) => a + b, 0);

  // 计算风险等级
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  if (overwhelmedDimensions.length >= 2) riskLevel = 'critical';
  else if (overwhelmedDimensions.length === 1 && total >= 3) riskLevel = 'high';
  else if (overwhelmedDimensions.length === 1 || passiveDimensions.length >= 2) riskLevel = 'high';
  // ⚠️ total > 0 的判断不能省：一个维度都没有时 `optimal.length === total` 会成立（0===0）
  //    → 判成 low → 报告显示「整体状态良好」。
  //    「什么都没测到」绝不能推出「状态良好」。
  else if (total > 0 && optimalDimensions.length === total) riskLevel = 'low';
  else if (strategyDimensions.length === total && optimalDimensions.length > 0) riskLevel = 'low';

  // 风险组合
  const riskCombinations: Array<{ dimensionIds: string[]; riskType: string; description: string }> = [];

  if (overwhelmedDimensions.length > 0) {
    riskCombinations.push({
      dimensionIds: overwhelmedDimensions,
      riskType: 'overwhelmed_risk',
      description: '多个维度处于被淹没状态，需要优先干预',
    });
  }

  if (passiveDimensions.length >= 2) {
    riskCombinations.push({
      dimensionIds: passiveDimensions,
      riskType: 'passive_risk',
      description: '被动状态维度较多，可能存在动力不足',
    });
  }

  // 预测路径
  let predictedPath = '保持当前趋势发展';
  if (total === 0) {
    // 没有任何有效维度 —— 不给结论，也不说「良好」
    predictedPath = '本次测评没有有效数据，无法判断孩子的状态';
  } else if (riskLevel === 'critical') {
    predictedPath = '如不干预，多维度风险可能相互叠加，形成负向循环';
  } else if (riskLevel === 'high') {
    if (overwhelmedDimensions.length > 0) {
      predictedPath = '存在被淹没维度，需针对性干预避免恶化';
    } else {
      predictedPath = '被动状态可能持续，需激发内在动力';
    }
  } else if (riskLevel === 'medium') {
    predictedPath = '整体处于需引导状态，可通过支持性干预改善';
  } else if (riskLevel === 'low') {
    predictedPath = '整体状态良好，维持现有方式并关注可持续性';
  }

  // 保护因素
  const protectiveFactors: string[] = [];
  if (optimalDimensions.length > 0) {
    protectiveFactors.push('存在理想状态维度，可作为恢复的支点');
  }
  if (strategyDimensions.length > 0) {
    protectiveFactors.push('部分维度处于策略引导状态，具有提升空间');
  }
  if (protectiveFactors.length === 0 && riskLevel !== 'critical') {
    protectiveFactors.push('建议发掘孩子的优势维度作为突破口');
  }

  return { riskLevel, riskCombinations, predictedPath, protectiveFactors };
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
  const { scores, quadrants } = calculateAttemptScores(questionnaire, scoringConfig, answers, questionnaireType);

  // 生成当前状态
  //
  // ⚠️ 信息不足的维度（该维度没有数据 → 计分器不产生分数）**不产出条目**。
  //    以前这里用 `dimensionScores?.axis1 ?? 3` 兜底成中性 3 分，
  //    等于把「没数据」说成「中性」，再被象限判定读成「双差」→ 报告判成最差。
  const currentStatus: CurrentStatus[] = questionnaire.dimensions.flatMap((dimension) => {
    const dimensionScores = scores[dimension.id];
    if (!dimensionScores) return [];

    const quadrantType = quadrants[dimension.id] as QuadrantType;
    const quadrant = dimension.quadrants.find((q) => q.id === quadrantType);

    return [{
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
        axis1: dimensionScores.axis1,
        axis2: dimensionScores.axis2,
      },
    }];
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

  // 计算轨迹预测
  const trajectory = calculateTrajectory(quadrants, currentStatus);

  return {
    id: crypto.randomUUID(),
    attemptId,
    questionnaireType,
    currentStatus,
    trendAnalysis: null,
    trajectory,
    suggestions,
    createdAt: new Date(),
  };
}

/**
 * 生成亲子对比报告
 *
 * 语义：逐维度「双方象限相同 = 一致，否则差异」。
 * ⚠️ 数据不全 / 中性带的维度不进入对比（见 buildComparisonStatuses 的说明）。
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
    parentAnswers,
    'parent'
  );
  const { scores: studentScores, quadrants: studentQuadrants } = calculateAttemptScores(
    questionnaire,
    studentScoringConfig,
    studentAnswers,
    'student'
  );

  const parties: ComparisonParty[] = [
    { role: 'parent', scores: parentScores, quadrants: parentQuadrants },
    { role: 'student', scores: studentScores, quadrants: studentQuadrants },
  ];

  const { comparisonStatuses, skippedDimensions } = buildComparisonStatuses(questionnaire, parties);
  const comparisonSuggestions = buildComparisonSuggestions(parties, comparisonStatuses);
  const highlights = buildHighlights(parties, comparisonStatuses);
  const developmentAreas = buildDevelopmentAreas(parties, comparisonStatuses);
  const { radarLabels, radarDatasets } = buildRadarData(questionnaire, parties);

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
    skippedDimensions,
    createdAt: new Date(),
  };
}

/**
 * 生成通用两视角对比报告（任意两个视角，例如家长 + 老师）
 *
 * 与亲子对比同语义：逐维度「象限相同 = 一致，否则差异」；
 * 数据不全 / 中性带的维度不进入对比。
 * 输出用 ComparisonStatus 里已有的 parent/student/teacher 三个槽位按实际角色填。
 */
export function generateTwoRoleComparison(
  questionnaire: Questionnaire,
  roleA: ComparisonRole,
  roleB: ComparisonRole,
  scoringConfigA: ScoringConfig,
  scoringConfigB: ScoringConfig,
  answersA: Record<string, number>,
  answersB: Record<string, number>,
  attemptIdA: string,
  attemptIdB: string
): TwoRoleComparisonReport {
  const a = calculateAttemptScores(questionnaire, scoringConfigA, answersA, roleA);
  const b = calculateAttemptScores(questionnaire, scoringConfigB, answersB, roleB);

  const parties: ComparisonParty[] = [
    { role: roleA, scores: a.scores, quadrants: a.quadrants },
    { role: roleB, scores: b.scores, quadrants: b.quadrants },
  ];

  const { comparisonStatuses, skippedDimensions } = buildComparisonStatuses(questionnaire, parties);
  const comparisonSuggestions = buildComparisonSuggestions(parties, comparisonStatuses);
  const highlights = buildHighlights(parties, comparisonStatuses);
  const developmentAreas = buildDevelopmentAreas(parties, comparisonStatuses);
  const { radarLabels, radarDatasets } = buildRadarData(questionnaire, parties);

  return {
    id: crypto.randomUUID(),
    roles: [roleA, roleB],
    attemptIds: { [roleA]: attemptIdA, [roleB]: attemptIdB },
    comparisonStatuses,
    comparisonSuggestions,
    highlights,
    developmentAreas,
    radarLabels,
    radarDatasets,
    skippedDimensions,
    createdAt: new Date(),
  };
}

/**
 * 生成家校三方对比报告
 *
 * 语义：逐维度「三方象限全同 = 一致，否则差异」。
 * ⚠️ 数据不全 / 中性带的维度不进入对比（见 buildComparisonStatuses 的说明）。
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
    parentAnswers,
    'parent'
  );
  const { scores: studentScores, quadrants: studentQuadrants } = calculateAttemptScores(
    questionnaire,
    studentScoringConfig,
    studentAnswers,
    'student'
  );
  const { scores: teacherScores, quadrants: teacherQuadrants } = calculateAttemptScores(
    questionnaire,
    teacherScoringConfig,
    teacherAnswers,
    'teacher'
  );

  const parties: ComparisonParty[] = [
    { role: 'parent', scores: parentScores, quadrants: parentQuadrants },
    { role: 'student', scores: studentScores, quadrants: studentQuadrants },
    { role: 'teacher', scores: teacherScores, quadrants: teacherQuadrants },
  ];

  const { comparisonStatuses, skippedDimensions } = buildComparisonStatuses(questionnaire, parties);

  // 三方差异的描述沿用「三方认知不一致：家长(X) / 孩子(Y) / 老师(Z)」句式
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
      priority: priorityFor(parties, s),
    }));

  // 三方共识
  const consensusDimensions = comparisonStatuses
    .filter((s) => s.isConsistent)
    .map((s) => s.dimensionId);

  // 家校差异：家庭（家长视角）与学校（老师视角）判断不同的维度
  const homeSchoolDifferences = comparisonStatuses
    .filter((s) => s.parent?.quadrantType !== s.teacher?.quadrantType)
    .map((s) => ({
      dimensionId: s.dimensionId,
      homePerformance: s.parent?.quadrantName ?? '',
      schoolPerformance: s.teacher?.quadrantName ?? '',
    }));

  // 亮点和待引导
  const highlights = buildHighlights(parties, comparisonStatuses);
  const developmentAreas = comparisonStatuses
    .filter((s) => !s.isConsistent)
    .map((s) => ({
      dimensionId: s.dimensionId,
      description: `在"${s.dimensionName}"上需要关注三方差异`,
    }));

  // 雷达图数据
  const { radarLabels, radarDatasets } = buildRadarData(questionnaire, parties);

  return {
    id: crypto.randomUUID(),
    parentAttemptId,
    studentAttemptId,
    teacherAttemptId,
    comparisonStatuses,
    comparisonSuggestions,
    consensusDimensions,
    homeSchoolDifferences,
    highlights,
    developmentAreas,
    radarLabels,
    radarDatasets,
    skippedDimensions,
    createdAt: new Date(),
  };
}
