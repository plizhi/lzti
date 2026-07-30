import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/api/response';
import { getQuestionnaire } from '@/data/questionnaires';

// 生成8位字母数字分享码
async function generateShareCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // 确保唯一
  const existing = await prisma.reportShare.findUnique({ where: { shareCode: code } });
  if (existing) {
    return generateShareCode(); // 递归重试
  }
  return code;
}

// 创建报告分享
export async function createReportShare(
  userId: string,
  attemptId: string,
  expiresInDays: number = 7
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

  if (existing) {
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

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const shareCode = await generateShareCode();

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
