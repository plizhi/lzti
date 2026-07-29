'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const typeLabels: Record<string, string> = {
  student: '学生自评',
  parent: '家长观察',
  teacher: '教师评价',
};

const quadrantLabels: Record<string, string> = {
  optimal: 'bg-green-100 text-green-700',
  strategy: 'bg-amber-100 text-amber-700',
  passive: 'bg-stone-100 text-stone-600',
  overwhelmed: 'bg-red-100 text-red-700',
};

const trendLabels: Record<string, { icon: string; label: string }> = {
  'up': { icon: '↑', label: '提升' },
  'stable': { icon: '→', label: '稳定' },
  'down': { icon: '↓', label: '下降' },
  'significant-up': { icon: '⬆⬆', label: '显著提升' },
  'significant-down': { icon: '⬇⬇', label: '显著下降' },
};

interface CurrentStatusItem {
  dimensionId: string;
  quadrantType: string;
  quadrantName?: string;
  scores: { axis1: number; axis2: number };
  description?: string;
  dimensionName?: string;
}

interface TrendDimension {
  dimensionId: string;
  dimensionName: string;
  change: number;
  trend: string;
  description: string;
}

interface ReportData {
  attemptId: string;
  sessionId: string;
  child: { id: string; name: string };
  stageId: string;
  stageName: string;
  questionnaireType: string;
  scores: Record<string, { axis1: number; axis2: number }>;
  quadrants: Record<string, string>;
  report: {
    id: string;
    currentStatus: CurrentStatusItem[];
    trendAnalysis: {
      comparedAttemptId: string;
      comparedAt: string;
      overallTrend: string;
      dimensionTrends: TrendDimension[];
    } | null;
    suggestions: Array<{
      dimensionId: string;
      dimensionName: string;
      priority: string;
      quadrantType: string;
      quadrantName: string;
      guidance: string;
    }>;
    trajectory: unknown;
    createdAt: string;
  } | null;
  createdAt: string;
}

interface SharedReportData {
  report: ReportData;
  sharedAt: string;
  expiresAt: string;
}

interface SharedReportClientProps {
  shareCode: string;
}

export function SharedReportClient({ shareCode }: SharedReportClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SharedReportData | null>(null);

  const fetchSharedReport = useCallback(async () => {
    if (!shareCode) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/share/report/${shareCode}`);
      const json = await response.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || '获取报告失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取报告失败');
    } finally {
      setLoading(false);
    }
  }, [shareCode]);

  useEffect(() => {
    fetchSharedReport();
  }, [fetchSharedReport]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-white">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-stone-600">正在加载报告...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-white">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-600">{error || '报告不存在'}</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-xl bg-amber-500 px-6 py-3 font-medium text-white hover:bg-amber-600"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const { report, sharedAt, expiresAt } = data;
  const { child, stageName, questionnaireType, report: reportContent } = report;

  const isExpired = new Date(expiresAt) < new Date();

  if (isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-white">
        <div className="text-center">
          <div className="text-4xl mb-4">⏰</div>
          <p className="text-stone-600">此分享链接已过期</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-xl bg-amber-500 px-6 py-3 font-medium text-white hover:bg-amber-600"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-12">
      {/* 分享提示 Header */}
      <header className="bg-amber-50/80 backdrop-blur border-b border-amber-200">
        <div className="mx-auto max-w-2xl px-6 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-amber-700">
              分享报告 · {new Date(sharedAt).toLocaleDateString('zh-CN')}
            </span>
            <Link href="/" className="text-amber-600 hover:text-amber-800 text-sm">
              返回首页
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-800">测评报告</h1>
          <p className="mt-2 text-stone-500">
            {child.name} · {stageName} · {typeLabels[questionnaireType] ?? questionnaireType}
          </p>
        </div>

        {/* 当下位置 */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">📍 当下位置</h2>
          <div className="space-y-4">
            {reportContent?.currentStatus.map((status) => (
              <div key={status.dimensionId} className="border-b border-stone-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-stone-700">
                    {status.dimensionName ?? status.dimensionId}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${quadrantLabels[status.quadrantType] ?? ''}`}>
                    {status.quadrantName ?? status.quadrantType}
                  </span>
                </div>
                {status.description && (
                  <p className="text-sm text-stone-600">{status.description}</p>
                )}
                <div className="mt-2 flex gap-4 text-xs text-stone-400">
                  <span>维度1: {(status.scores?.axis1 ?? 0).toFixed(1)}分</span>
                  <span>维度2: {(status.scores?.axis2 ?? 0).toFixed(1)}分</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 变化趋势 */}
        {reportContent?.trendAnalysis && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-800 mb-4">
              📈 变化趋势
              <span className="text-sm font-normal text-stone-500 ml-2">
                (对比 {new Date(reportContent.trendAnalysis.comparedAt).toLocaleDateString('zh-CN')})
              </span>
            </h2>

            <div className="mb-6 p-4 bg-amber-50 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {trendLabels[reportContent.trendAnalysis.overallTrend]?.icon ?? '→'}
                </span>
                <div>
                  <p className="font-medium text-stone-800">
                    {trendLabels[reportContent.trendAnalysis.overallTrend]?.label ?? '稳定'}
                  </p>
                  <p className="text-sm text-stone-500">整体趋势</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {reportContent.trendAnalysis.dimensionTrends.map((dt) => (
                <div
                  key={dt.dimensionId}
                  className="flex items-center justify-between p-3 bg-stone-50 rounded-lg"
                >
                  <div>
                    <span className="font-medium text-stone-700">{dt.dimensionName}</span>
                    <p className="text-xs text-stone-400">{dt.description}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-lg font-semibold ${
                        dt.change > 0
                          ? 'text-green-600'
                          : dt.change < 0
                            ? 'text-red-600'
                            : 'text-stone-500'
                      }`}
                    >
                      {dt.change >= 0 ? '+' : ''}
                      {dt.change.toFixed(2)}
                    </span>
                    <p className="text-xs text-stone-400">
                      {trendLabels[dt.trend]?.label ?? dt.trend}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 关注建议 */}
        {reportContent?.suggestions && reportContent.suggestions.length > 0 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-800 mb-4">🎯 关注建议</h2>
            <div className="space-y-4">
              {reportContent.suggestions.map((s) => (
                <div key={s.dimensionId} className="border-l-4 border-amber-400 pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-stone-700">{s.dimensionName}</h3>
                    {s.priority === 'high' && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs">
                        优先关注
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-600 mb-2">
                    {s.dimensionName}：{s.quadrantName}
                  </p>
                  <p className="text-sm text-amber-600 italic">{s.guidance}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-stone-100 p-6">
          <h2 className="text-lg font-semibold text-stone-800 mb-2">💡 使用建议</h2>
          <ul className="text-sm text-stone-600 space-y-1">
            <li>• 本报告仅供参考，不作为诊断依据</li>
            <li>• 建议在平静状态下与孩子沟通</li>
            <li>• 关注建议可根据实际情况灵活调整</li>
            <li>• 定期复测可追踪变化趋势</li>
          </ul>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="inline-block rounded-xl bg-amber-500 px-8 py-4 font-medium text-white shadow-md hover:bg-amber-600"
          >
            开始自己的测评
          </Link>
        </div>
      </main>
    </div>
  );
}
