import { prisma } from '@/lib/db';

interface QuarterlySummaryResult {
  childId: string;
  childName: string;
  period: {
    start: string;
    end: string;
  };
  totalAssessments: number;
  overallTrend: 'up' | 'stable' | 'down';
  highlights: string[];
  concerns: string[];
  recommendations: string[];
}

/**
 * 生成季度成长摘要
 */
export async function generateQuarterlySummary(
  userId: string,
  childId: string
): Promise<QuarterlySummaryResult | null> {
  // 计算3个月前的日期
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);

  // 获取孩子在过去3个月的测评记录
  const sessions = await prisma.assessmentSession.findMany({
    where: {
      childId,
      child: { userId },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      attempts: {
        include: {
          report: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      child: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (sessions.length === 0) {
    return null;
  }

  // 收集所有报告
  const reports = sessions
    .flatMap((s) => s.attempts)
    .filter((a) => a.report)
    .map((a) => ({
      attemptId: a.id,
      questionnaireType: a.questionnaireType,
      createdAt: a.createdAt,
      report: a.report!,
      scores: a.scores as Record<string, { axis1: number; axis2: number }>,
    }));

  if (reports.length === 0) {
    return null;
  }

  // 按时间排序
  reports.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // 计算整体趋势
  const firstReport = reports[0];
  const lastReport = reports[reports.length - 1];

  let overallTrend: 'up' | 'stable' | 'down' = 'stable';
  let totalPositiveChanges = 0;
  let totalNegativeChanges = 0;

  // 对比首尾报告的分数变化
  const firstScores = firstReport.scores;
  const lastScores = lastReport.scores;

  for (const dimensionId of Object.keys(firstScores)) {
    const firstScore = (firstScores[dimensionId]?.axis1 ?? 3) + (firstScores[dimensionId]?.axis2 ?? 3);
    const lastScore = (lastScores[dimensionId]?.axis1 ?? 3) + (lastScores[dimensionId]?.axis2 ?? 3);
    const change = lastScore - firstScore;

    if (change > 0.5) totalPositiveChanges++;
    else if (change < -0.5) totalNegativeChanges++;
  }

  if (totalPositiveChanges > totalNegativeChanges * 2) {
    overallTrend = 'up';
  } else if (totalNegativeChanges > totalPositiveChanges * 2) {
    overallTrend = 'down';
  }

  // 生成亮点
  const highlights: string[] = [];
  if (overallTrend === 'up') {
    highlights.push('整体呈现积极向好趋势');
  }

  // 查找表现最好的维度
  if (lastReport.report.currentStatus) {
    const currentStatus = lastReport.report.currentStatus as Array<{ quadrantType: string }>;
    const optimalDimensions = currentStatus.filter((s) => s.quadrantType === 'optimal');
    if (optimalDimensions.length > 0) {
      highlights.push(`在${optimalDimensions.length}个维度上处于理想状态`);
    }
  }

  // 生成关注点
  const concerns: string[] = [];

  // 查找需要关注的维度
  if (lastReport.report.currentStatus) {
    const currentStatus = lastReport.report.currentStatus as Array<{ quadrantType: string }>;
    const overwhelmedDimensions = currentStatus.filter((s) => s.quadrantType === 'overwhelmed');
    if (overwhelmedDimensions.length > 0) {
      concerns.push(`${overwhelmedDimensions.length}个维度需要重点关注`);
    }
  }

  // 生成建议
  const recommendations: string[] = [];

  if (overallTrend === 'down') {
    recommendations.push('建议与孩子多沟通，了解近期是否有影响学习状态的因素');
  }

  if (concerns.length > 0) {
    recommendations.push('建议持续关注孩子的情绪状态，保持开放沟通');
  }

  if (reports.length >= 2) {
    recommendations.push('继续保持每月一次的测评习惯，追踪变化');
  } else {
    recommendations.push('建议增加测评频率，以便更好地追踪成长变化');
  }

  return {
    childId,
    childName: sessions[0]?.child?.name ?? '未知',
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    totalAssessments: reports.length,
    overallTrend,
    highlights,
    concerns,
    recommendations,
  };
}
