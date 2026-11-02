import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/api/response';
import { getQuestionnaire } from '@/data/questionnaires';
import { buildSessionComparison } from '@/lib/report/session-comparison';
import type { SessionComparison } from '@/lib/report/session-comparison';
import { generateReportShareCode } from './code-generator';

// 创建报告分享
export async function createReportShare(
  userId: string,
  attemptId: string,
  expiresInHours: number = 24
) {
  // 验证 attempt 存在且属于该用户
  const attempt = await prisma.sessionAttempt.findFirst({
    where: {
      id: attemptId,
      session: { child: { userId } },
    },
    include: {
      session: { include: { child: true } },
      report: true,
    },
  });

  if (!attempt) {
    throw new ApiError('报告不存在', 404);
  }

  // 获取问卷信息
  const questionnaire = getQuestionnaire(attempt.stageId);

  // 获取象限标签
  const quadrants = attempt.quadrants as Record<string, string>;
  const quadrantLabels = attempt.report?.currentStatus
    ? (attempt.report.currentStatus as Array<{ dimensionId: string; quadrantType: string; quadrantName?: string }>)
        .map((s) => s.quadrantName ?? s.quadrantType)
        .slice(0, 3) // 最多显示3个
    : [];

  // 检查是否已有分享
  const existing = await prisma.reportShare.findUnique({
    where: { attemptId },
  });

  // 已存在的分享：
  //   - 未过期 → 直接复用（同一份报告、同一份有效期，不追溯改）
  //   - 已过期 → **换一个新码 + 延到 now+24h**。
  //     修 bug（2026-11-02）：原来这里不管过没过期都直接返回旧码，
  //     于是「第二次分享」拿到的还是那个已过期的链接（410 打不开）。
  //     ReportShare.attemptId 是唯一索引 → 同一个 attempt 只能有一行，
  //     所以用 update 换码而不是新建。
  if (existing) {
    if (existing.expiresAt >= new Date()) {
      // 返回已有的分享
      return {
        shareId: existing.id,
        shareCode: existing.shareCode,
        shareUrl: `/shared/report/${existing.shareCode}`,
        expiresAt: existing.expiresAt,
        isExisting: true,
        // 附加信息
        childName: attempt.session.child.name,
        stageName: questionnaire?.name,
        quadrantLabels,
        assessedAt: attempt.createdAt,
      };
    }

    const renewedExpiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    const renewedCode = await generateReportShareCode();
    const renewed = await prisma.reportShare.update({
      where: { id: existing.id },
      data: { shareCode: renewedCode, expiresAt: renewedExpiresAt },
    });

    return {
      shareId: renewed.id,
      shareCode: renewed.shareCode,
      shareUrl: `/shared/report/${renewed.shareCode}`,
      expiresAt: renewed.expiresAt,
      isExisting: false,
      renewed: true,
      // 附加信息
      childName: attempt.session.child.name,
      stageName: questionnaire?.name,
      quadrantLabels,
      assessedAt: attempt.createdAt,
    };
  }

  // 演示链路（2026-10-31 朋大大拍板）：所有分享链接一律 24 小时有效。
  // 之前是「按天」为单位（默认 7 天），演示时报告要能即时失效，
  // 所以改成按小时计。注意：已存在的分享沿用原来的 expiresAt，不追溯改。
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const shareCode = await generateReportShareCode();

  const share = await prisma.reportShare.create({
    data: {
      attemptId,
      ownerId: userId,
      shareCode,
      expiresAt,
    },
  });

  return {
    shareId: share.id,
    shareCode: share.shareCode,
    shareUrl: `/shared/report/${share.shareCode}`,
    expiresAt: share.expiresAt,
    isExisting: false,
    // 附加信息
    childName: attempt.session.child.name,
    stageName: questionnaire?.name,
    quadrantLabels,
    assessedAt: attempt.createdAt,
  };
}

// 获取分享报告（公开接口）
export async function getSharedReport(shareCode: string) {
  const share = await prisma.reportShare.findUnique({
    where: { shareCode },
  });

  if (!share) {
    throw new ApiError('分享不存在或已失效', 404);
  }

  if (share.expiresAt < new Date()) {
    throw new ApiError('分享链接已过期', 410);
  }

  // 获取完整报告数据
  const attempt = await prisma.sessionAttempt.findUnique({
    where: { id: share.attemptId },
    include: {
      session: { include: { child: true } },
      report: true,
    },
  });

  if (!attempt) {
    throw new ApiError('报告不存在', 404);
  }

  const questionnaire = getQuestionnaire(attempt.stageId);

  // 跨视角对比（2026-11-01）
  //
  // 零 DDL：现算，不落库、不写迁移。
  // 对比失败不能拖垮整个分享页 —— 降级成「暂无对比」，报告照常能看。
  let comparison: SessionComparison;
  try {
    comparison = await buildSessionComparison(attempt.sessionId, attempt.stageId);
  } catch (error) {
    console.error('[分享报告] 生成跨视角对比失败:', error);
    comparison = {
      kind: 'none',
      completedRoles: [],
      missingRoles: ['parent', 'student', 'teacher'],
      note: '跨视角对比暂时无法生成，其余内容不受影响。',
    };
  }

  return {
    report: {
      attemptId: attempt.id,
      sessionId: attempt.sessionId,
      child: { id: attempt.session.child.id, name: attempt.session.child.name },
      stageId: attempt.stageId,
      stageName: questionnaire?.name,
      questionnaireType: attempt.questionnaireType,
      scores: attempt.scores,
      quadrants: attempt.quadrants,
      comparison,
      report: attempt.report
        ? {
            id: attempt.report.id,
            currentStatus: attempt.report.currentStatus,
            trendAnalysis: attempt.report.trendAnalysis,
            suggestions: attempt.report.suggestions,
            trajectory: attempt.report.trajectory,
            createdAt: attempt.report.createdAt,
          }
        : null,
      createdAt: attempt.createdAt,
    },
    sharedAt: share.createdAt,
    expiresAt: share.expiresAt,
  };
}

// 撤销报告分享
export async function revokeReportShare(shareCode: string, userId: string) {
  const share = await prisma.reportShare.findUnique({
    where: { shareCode },
  });

  if (!share) {
    throw new ApiError('分享不存在', 404);
  }

  if (share.ownerId !== userId) {
    throw new ApiError('无权撤销此分享', 403);
  }

  await prisma.reportShare.delete({
    where: { id: share.id },
  });

  return { revoked: true };
}

// 列出用户的报告分享
export async function listUserReportShares(userId: string) {
  const shares = await prisma.reportShare.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
  });

  // 补充报告信息
  const sharesWithInfo = await Promise.all(
    shares.map(async (share) => {
      const attempt = await prisma.sessionAttempt.findUnique({
        where: { id: share.attemptId },
        include: {
          session: { include: { child: true } },
        },
      });

      const questionnaire = attempt ? getQuestionnaire(attempt.stageId) : null;

      return {
        shareId: share.id,
        shareCode: share.shareCode,
        attemptId: share.attemptId,
        childName: attempt?.session.child.name ?? '未知',
        stageName: questionnaire?.name ?? attempt?.stageId ?? '未知',
        questionnaireType: attempt?.questionnaireType ?? 'unknown',
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        isExpired: share.expiresAt < new Date(),
      };
    })
  );

  return { shares: sharesWithInfo };
}
