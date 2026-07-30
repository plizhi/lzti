'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { assessment } from '@/lib/api/client';
import { ShareReportModal } from '@/components/report/ShareReportModal';
import { ReportUpgradePrompt } from '@/components/report/ReportUpgradePrompt';
import { TrendChart } from '@/components/report/TrendChart';
import type { TrendType } from '@/types/report';
import './print.css';

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
  trend: TrendType;
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
      overallTrend: TrendType;
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

export default function ReportPage() {
  const params = useParams();
  const attemptId = params.attemptId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReportData | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!attemptId) return;

    try {
      setLoading(true);
      setError(null);
      const result = await assessment.getAttemptReport(attemptId) as ReportData;
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取报告失败');
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

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

  const { child, stageName, questionnaireType, quadrants, report } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-12">
      <header className="bg-white/80 backdrop-blur border-b border-stone-200 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/history" className="text-stone-500 hover:text-stone-700">
              ← 测评历史
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowShareModal(true)}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
              >
                分享报告
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
              >
                打印报告
              </button>
            </div>
          </div>
        </div>
      </header>

      {showShareModal && data && (
        <ShareReportModal
          attemptId={data.attemptId}
          onClose={() => setShowShareModal(false)}
        />
      )}

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
            {report?.currentStatus.map((status) => (
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
        {report?.trendAnalysis && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-800 mb-4">
              📈 变化趋势
            </h2>
            <TrendChart trendAnalysis={report.trendAnalysis} />
          </div>
        )}

        {/* 关注建议 */}
        {report?.suggestions && report.suggestions.length > 0 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-800 mb-4">🎯 关注建议</h2>
            <div className="space-y-4">
              {report.suggestions.map((s) => (
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

        <ReportUpgradePrompt />

        <div className="flex gap-4">
          <Link
            href="/history"
            className="flex-1 text-center rounded-xl border border-stone-300 py-4 font-medium text-stone-600 transition-colors hover:bg-stone-50"
          >
            查看历史
          </Link>
          <Link
            href="/"
            className="flex-1 text-center rounded-xl bg-amber-500 py-4 font-medium text-white transition-colors hover:bg-amber-600 shadow-md"
          >
            返回首页
          </Link>
        </div>
      </main>
    </div>
  );
}
