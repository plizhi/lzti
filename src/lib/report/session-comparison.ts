// 跨视角对比（session 级）
//
// 2026-11-01 新增。朋大大拍板：「每份报告都带对比」，并且第一份（只有单一视角时）
// 报告里就要有关注引导和建设性建议，不能是空白。
//
// 现状（改造前）：提交测评只生成**单视角**报告（generateSingleReport），
// 亲子对比 / 家校三方对比两个生成器早就写好了，但生产链路零引用（死代码）。
// 本模块把三者接起来：按本场已完成的视角，动态决定对比形态。
//
// 形态：
//   - 3 个视角齐 → home-school（家校三方）
//   - 家长 + 孩子   → parent-child（亲子）
//   - 任意两方     → two-roles（通用两视角，如家长 + 老师）
//   - 只有 1 个    → none（附单视角的关注引导摘要，报告不留白）
//
// 零 DDL：全部数据现算，不新增任何 Prisma 模型、不写迁移。

import { prisma } from '@/lib/db';
import { getQuestionnaire } from '@/data/questionnaires';
import { getQuestionsForType } from '@/lib/questionnaire-flow';
import { buildScoringConfig } from '@/lib/scoring/build-scoring-config';
import {
  calculateAttemptScores,
  generateParentChildReport,
  generateHomeSchoolReport,
  generateTwoRoleComparison,
} from '@/lib/report/generator';
import type { Questionnaire, ScoringConfig } from '@/types/questionnaire';
import type {
  ComparisonRole,
  FocusSuggestion,
  HomeSchoolComparisonReport,
  ParentChildComparisonReport,
  QuadrantType,
  TwoRoleComparisonReport,
} from '@/types/report';

/** 本场全部视角（固定顺序：家长 → 孩子 → 老师） */
export const ALL_COMPARISON_ROLES: ComparisonRole[] = ['parent', 'student', 'teacher'];

export const ROLE_LABEL: Record<ComparisonRole, string> = {
  parent: '家长观察',
  student: '学生自评',
  teacher: '教师评价',
};

/** 单视角的关注层级 */
export type FocusLevel = 'priority' | 'watch' | 'improve' | 'maintain' | 'neutral';

export const FOCUS_LEVEL_LABEL: Record<FocusLevel, string> = {
  priority: '优先关注',
  watch: '值得关注',
  improve: '可提升',
  maintain: '保持现状',
  neutral: '数据接近中性',
};

/** 单视角下每个维度的关注引导 */
export interface SingleViewDimensionFocus {
  dimensionId: string;
  dimensionName: string;
  level: FocusLevel;
  levelLabel: string;
  // 象限（中性带维度没有象限）
  quadrantType?: QuadrantType;
  quadrantName?: string;
  // 建设性建议（来自问卷象限配置）
  focus: string;
  profile?: string;
  coreNeed?: string;
  parentAction?: string;
}

/** 单视角摘要（只有 1 个视角时用，保证报告不留白） */
export interface SingleViewSummary {
  role: ComparisonRole;
  roleLabel: string;
  attemptId: string;
  dimensions: SingleViewDimensionFocus[];
  // 单视角报告里的高优先级关注建议
  suggestions: FocusSuggestion[];
}

/** 跨视角对比结果 */
export type SessionComparison =
  | {
      kind: 'none';
      completedRoles: ComparisonRole[];
      missingRoles: ComparisonRole[];
      note: string;
      /** 只有单一视角时的关注引导摘要 */
      singleView?: SingleViewSummary;
    }
  | {
      kind: 'two-roles';
      completedRoles: ComparisonRole[];
      missingRoles: ComparisonRole[];
      note: string;
      roles: ComparisonRole[];
      report: TwoRoleComparisonReport;
    }
  | {
      kind: 'parent-child';
      completedRoles: ComparisonRole[];
      missingRoles: ComparisonRole[];
      note: string;
      roles: ComparisonRole[];
      report: ParentChildComparisonReport;
    }
  | {
      kind: 'home-school';
      completedRoles: ComparisonRole[];
      missingRoles: ComparisonRole[];
      note: string;
      roles: ComparisonRole[];
      report: HomeSchoolComparisonReport;
    };

interface RoleAttempt {
  attemptId: string;
  answers: Record<string, number>;
  suggestions: FocusSuggestion[];
}

/**
 * 按角色取该视角的计分配置。
 *
 * buildScoringConfig 里 questionnaireType 固定写 'parent'（提取前的老行为）。
 * 该字段只是元数据，计分器只读 axes，不参与计算 —— 这里按真实角色纠正一下，
 * 让下游（报告 JSON、雷达图标签）拿到的角色信息是对的。
 */
function scoringConfigFor(
  questionnaire: Questionnaire,
  role: ComparisonRole
): { config: ScoringConfig; questions: ReturnType<typeof getQuestionsForType> } {
  const questions = getQuestionsForType(questionnaire, role);
  const config = buildScoringConfig(questionnaire, questions);
  return { config: { ...config, questionnaireType: role }, questions };
}

/** 单视角 → 每个维度的关注引导（建设性，不只挑问题维度） */
function buildSingleViewSummary(
  questionnaire: Questionnaire,
  role: ComparisonRole,
  attempt: RoleAttempt
): SingleViewSummary {
  const { config } = scoringConfigFor(questionnaire, role);
  const { quadrants } = calculateAttemptScores(questionnaire, config, attempt.answers, role);

  const dimensions: SingleViewDimensionFocus[] = questionnaire.dimensions.flatMap((dimension) => {
    const quadrantType = quadrants[dimension.id] as QuadrantType | undefined;
    const quadrant = quadrantType
      ? dimension.quadrants.find((q) => q.id === quadrantType)
      : undefined;

    // 中性带：没有明显倾向 → 不编文案，如实说明「数据接近中性」
    if (!quadrantType || !quadrant) {
      return [{
        dimensionId: dimension.id,
        dimensionName: dimension.name,
        level: 'neutral' as FocusLevel,
        levelLabel: FOCUS_LEVEL_LABEL.neutral,
        focus: '该维度数据接近中性，暂无明显倾向，不需要额外关注。',
      }];
    }

    const level: FocusLevel =
      quadrantType === 'overwhelmed'
        ? 'priority'
        : quadrantType === 'passive'
          ? 'watch'
          : quadrantType === 'strategy'
            ? 'improve'
            : 'maintain';

    const focus =
      level === 'maintain'
        ? `状态良好，保持现在的支持方式即可。${quadrant.guidance ?? ''}`.trim()
        : quadrant.guidance ?? `可以围绕「${dimension.name}」多留意具体场景。`;

    return [{
      dimensionId: dimension.id,
      dimensionName: dimension.name,
      level,
      levelLabel: FOCUS_LEVEL_LABEL[level],
      quadrantType,
      quadrantName: quadrant.name,
      focus,
      profile: quadrant.profile,
      coreNeed: quadrant.coreNeed,
      parentAction: quadrant.parentAction,
    }];
  });

  return {
    role,
    roleLabel: ROLE_LABEL[role],
    attemptId: attempt.attemptId,
    dimensions,
    suggestions: attempt.suggestions ?? [],
  };
}

/**
 * 构建一个 session 的跨视角对比。
 *
 * @param sessionId 测评会话 id
 * @param stageId   学段 id（用来取问卷）
 */
/**
 * 对比维度为 0 时把原因说清楚。
 *
 * 典型场景：老师整卷都填 3 分 → 落在中性带 → 不产出象限 → 没有可对照的维度。
 * 这时如果只写「未纳入对比 N 个维度」，看报告的人会以为报告坏了。
 */
function withEmptyNote(
  note: string,
  report: { comparisonStatuses?: unknown[]; skippedDimensions?: unknown[] }
): string {
  if ((report.comparisonStatuses?.length ?? 0) > 0) return note;
  const skipped = report.skippedDimensions?.length ?? 0;
  if (skipped === 0) return `${note} 不过这次没有可对照的维度。`;
  return (
    `${note} 不过这次各视角的数据都接近中性、没有明显倾向（或数据缺失），` +
    '暂时没有可对照的维度 —— 下面列出了具体是哪些维度、什么原因。'
  );
}

export async function buildSessionComparison(
  sessionId: string,
  stageId: string
): Promise<SessionComparison> {
  const questionnaire = getQuestionnaire(stageId);
  if (!questionnaire) {
    return {
      kind: 'none',
      completedRoles: [],
      missingRoles: [...ALL_COMPARISON_ROLES],
      note: '未找到该学段的问卷，暂时无法生成跨视角对比。',
    };
  }

  // 只取「已提交」（已生成报告）的 attempt —— 进行中的答题记录不算完成视角
  const attempts = await prisma.sessionAttempt.findMany({
    where: { sessionId, report: { isNot: null } },
    select: {
      id: true,
      questionnaireType: true,
      answers: true,
      report: { select: { suggestions: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const byRole = new Map<ComparisonRole, RoleAttempt>();
  for (const attempt of attempts) {
    const role = attempt.questionnaireType as ComparisonRole;
    if (!ALL_COMPARISON_ROLES.includes(role)) continue;
    if (byRole.has(role)) continue; // 同一 session 同一视角只会有一条，这里保守取第一条
    byRole.set(role, {
      attemptId: attempt.id,
      answers: (attempt.answers ?? {}) as Record<string, number>,
      suggestions: (attempt.report?.suggestions ?? []) as unknown as FocusSuggestion[],
    });
  }

  const completedRoles = ALL_COMPARISON_ROLES.filter((r) => byRole.has(r));
  const missingRoles = ALL_COMPARISON_ROLES.filter((r) => !byRole.has(r));

  // ---- 0 个视角 ----
  if (completedRoles.length === 0) {
    return {
      kind: 'none',
      completedRoles,
      missingRoles,
      note: '本场还没有已提交的视角，完成任一视角后这里会出现内容。',
    };
  }

  const answersOf = (role: ComparisonRole) => byRole.get(role)!.answers;
  const attemptIdOf = (role: ComparisonRole) => byRole.get(role)!.attemptId;

  const roleText = completedRoles.map((r) => ROLE_LABEL[r]).join('、');
  const missingText = missingRoles.map((r) => ROLE_LABEL[r]).join('、');

  // ---- 3 个视角：家校三方 ----
  if (completedRoles.length === 3) {
    const parent = scoringConfigFor(questionnaire, 'parent');
    const student = scoringConfigFor(questionnaire, 'student');
    const teacher = scoringConfigFor(questionnaire, 'teacher');

    const report = generateHomeSchoolReport(
      questionnaire,
      parent.config,
      student.config,
      teacher.config,
      answersOf('parent'),
      answersOf('student'),
      answersOf('teacher'),
      attemptIdOf('parent'),
      attemptIdOf('student'),
      attemptIdOf('teacher')
    );

    return {
      kind: 'home-school',
      completedRoles,
      missingRoles,
      note: withEmptyNote(
        `本场已完成 3/3 个视角（${roleText}）。三个视角都在，下面是跨视角对照。`,
        report
      ),
      roles: completedRoles,
      report,
    };
  }

  // ---- 2 个视角 ----
  if (completedRoles.length === 2) {
    const [roleA, roleB] = completedRoles;
    const a = scoringConfigFor(questionnaire, roleA);
    const b = scoringConfigFor(questionnaire, roleB);

    const note = `本场已完成 2/3 个视角（${roleText}）。还差 ${missingText}，完成后可以看三方共识。`;

    // 家长 + 孩子 → 走亲子对比（有专门的文案与雷达图）
    if (roleA === 'parent' && roleB === 'student') {
      const report = generateParentChildReport(
        questionnaire,
        a.config,
        b.config,
        answersOf('parent'),
        answersOf('student'),
        attemptIdOf('parent'),
        attemptIdOf('student')
      );
      return {
        kind: 'parent-child',
        completedRoles,
        missingRoles,
        note: withEmptyNote(note, report),
        roles: completedRoles,
        report,
      };
    }

    // 其余两方组合（家长+老师 / 孩子+老师）→ 通用两视角对比
    const report = generateTwoRoleComparison(
      questionnaire,
      roleA,
      roleB,
      a.config,
      b.config,
      answersOf(roleA),
      answersOf(roleB),
      attemptIdOf(roleA),
      attemptIdOf(roleB)
    );
    return {
      kind: 'two-roles',
      completedRoles,
      missingRoles,
      note: withEmptyNote(note, report),
      roles: completedRoles,
      report,
    };
  }

  // ---- 1 个视角：不出对比，但给关注引导摘要（报告不留白） ----
  const onlyRole = completedRoles[0];
  const onlyAttempt = byRole.get(onlyRole)!;
  const singleView = buildSingleViewSummary(questionnaire, onlyRole, onlyAttempt);

  return {
    kind: 'none',
    completedRoles,
    missingRoles,
    note:
      `本场已完成 ${completedRoles.length}/3 个视角（${ROLE_LABEL[onlyRole]}）。` +
      `其余视角（${missingText}）完成后，这里会自动出现对比。`,
    singleView,
  };
}
