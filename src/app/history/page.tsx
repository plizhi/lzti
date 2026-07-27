'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { assessment } from '@/lib/api/client';
import { isLoggedIn } from '@/lib/api/client';

const typeLabels: Record<string, string> = {
  student: '学生自评',
  parent: '家长观察',
  teacher: '教师评价',
};

const quadrantColors: Record<string, string> = {
  optimal: 'bg-green-500',
  strategy: 'bg-amber-500',
  passive: 'bg-stone-400',
  overwhelmed: 'bg-red-500',
};

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [children, setChildren] = useState<
    Array<{
      child: { id: string; name: string; gender: string | null; birthDate: string | null; grade: string | null };
      sessions: Array<{
        id: string;
        stageId: string;
        stageName: string;
        completed: { parent: boolean; student: boolean; teacher: boolean };
        attempts: Array<{
          id: string;
          questionnaireType: string;
          createdAt: string;
          scores: Record<string, { axis1: number; axis2: number }>;
          quadrants: Record<string, string>;
        }>;
        createdAt: string;
        updatedAt: string;
      }>;
    }>
  >([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'trend'>('timeline');

  const fetchHistory = useCallback(async () => {
    if (!isLoggedIn()) {
      setError('请先登录');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await assessment.getHistorySessions({
        childId: selectedChildId ?? undefined,
        limit: 50,
      });
      setChildren(data.children);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取历史记录失败');
    } finally {
      setLoading(false);
    }
  }, [selectedChildId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const allChildren = children.map((c) => c.child);
  const currentChild = selectedChildId
    ? allChildren.find((c) => c.id === selectedChildId)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <header className="bg-white/80 backdrop-blur border-b border-stone-200 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-stone-500 hover:text-stone-700">
              ← 返回首页
            </Link>
            <h1 className="text-lg font-semibold text-stone-800">测评历史</h1>
            <div className="w-16" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-red-600">{error}</p>
            {error === '请先登录' && (
              <Link
                href="/login"
                className="mt-4 inline-block rounded-xl bg-amber-500 px-6 py-3 font-medium text-white hover:bg-amber-600"
              >
                去登录
              </Link>
            )}
          </div>
        ) : children.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-stone-600">暂无测评记录</p>
            <p className="text-sm text-stone-500 mt-2">完成测评后会显示在这里</p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-xl bg-amber-500 px-6 py-3 font-medium text-white hover:bg-amber-600"
            >
              开始测评
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 孩子选择器 */}
            {allChildren.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedChildId(null)}
                  className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    !selectedChildId
                      ? 'bg-amber-500 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  全部孩子
                </button>
                {allChildren.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChildId(child.id)}
                    className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      selectedChildId === child.id
                        ? 'bg-amber-500 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            )}

            {/* 当前选中孩子信息 */}
            {currentChild && (
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="font-medium text-stone-800">{currentChild.name}</p>
                {currentChild.grade && (
                  <p className="text-sm text-stone-600">{currentChild.grade}</p>
                )}
              </div>
            )}

            {/* 视图切换 */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
                  viewMode === 'timeline'
                    ? 'bg-amber-500 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                时间线
              </button>
              <button
                onClick={() => setViewMode('trend')}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
                  viewMode === 'trend'
                    ? 'bg-amber-500 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                趋势对比
              </button>
            </div>

            {/* 时间线视图 */}
            {viewMode === 'timeline' && children.flatMap((c) =>
              c.sessions.map((session) => (
                <div key={session.id} className="relative">
                  {/* 时间线连接线 */}
                  <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-stone-200" />

                  <div className="relative pl-10">
                    {/* 时间线节点 */}
                    <div className="absolute left-2.5 top-8 w-3 h-3 rounded-full bg-amber-500 border-2 border-white shadow" />

                    <div className="rounded-2xl bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-stone-800">
                            {session.stageName}
                          </h3>
                          <p className="text-sm text-stone-500">
                            {formatDate(session.createdAt)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {session.completed.parent && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                              家长
                            </span>
                          )}
                          {session.completed.student && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              学生
                            </span>
                          )}
                          {session.completed.teacher && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              老师
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Attempts 列表 */}
                      {session.attempts.length > 0 && (
                        <div className="space-y-2">
                          {session.attempts.map((attempt) => (
                            <Link
                              key={attempt.id}
                              href={`/report/${attempt.id}`}
                              className="flex items-center justify-between rounded-xl border border-stone-200 p-4 transition-all hover:border-amber-300 hover:bg-amber-50"
                            >
                              <div>
                                <p className="font-medium text-stone-700">
                                  {typeLabels[attempt.questionnaireType] ?? '未知'}
                                </p>
                                <p className="text-sm text-stone-500">
                                  {formatDateTime(attempt.createdAt)}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex gap-1">
                                  {Object.entries(attempt.quadrants).map(
                                    ([dimId, quadrant]) => (
                                      <span
                                        key={dimId}
                                        className={`inline-block w-2 h-2 rounded-full ${
                                          quadrantColors[quadrant] ?? 'bg-stone-400'
                                        }`}
                                        title={dimId}
                                      />
                                    )
                                  )}
                                </div>
                                <span className="text-stone-400">→</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {session.attempts.length === 0 && (
                        <p className="text-sm text-stone-400 text-center py-4">
                          暂无测评详情
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* 趋势视图 */}
            {viewMode === 'trend' && currentChild && (
              <TrendView children={children} selectedChildId={selectedChildId} />
            )}
          </div>
        )}

        {/* 提示信息 */}
        {children.length > 0 && (
          <div className="mt-8 rounded-xl bg-stone-100 p-4">
            <h3 className="font-medium text-stone-700">关于历史记录</h3>
            <p className="mt-2 text-sm text-stone-600">
              测评记录从服务器同步，跨设备也能查看完整历史。
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// 趋势视图组件
interface TrendViewProps {
  children: Array<{
    child: { id: string; name: string; gender: string | null; birthDate: string | null; grade: string | null };
    sessions: Array<{
      id: string;
      stageId: string;
      stageName: string;
      completed: { parent: boolean; student: boolean; teacher: boolean };
      attempts: Array<{
        id: string;
        questionnaireType: string;
        createdAt: string;
        scores: Record<string, { axis1: number; axis2: number }>;
        quadrants: Record<string, string>;
      }>;
      createdAt: string;
      updatedAt: string;
    }>;
  }>;
  selectedChildId: string | null;
}

const trendIcons: Record<string, string> = {
  'up': '↑',
  'stable': '→',
  'down': '↓',
  'significant-up': '⬆⬆',
  'significant-down': '⬇⬇',
};

function TrendView({ children, selectedChildId }: TrendViewProps) {
  // 收集所有测评数据点
  const dataPoints: Array<{
    date: string;
    dateLabel: string;
    stageName: string;
    attemptType: string;
    scores: Record<string, { axis1: number; axis2: number }>;
    quadrants: Record<string, string>;
  }> = [];

  const targetChildren = selectedChildId
    ? children.filter((c) => c.child.id === selectedChildId)
    : children;

  for (const childData of targetChildren) {
    for (const session of childData.sessions) {
      for (const attempt of session.attempts) {
        dataPoints.push({
          date: attempt.createdAt,
          dateLabel: new Date(attempt.createdAt).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
          }),
          stageName: session.stageName,
          attemptType: typeLabels[attempt.questionnaireType] ?? attempt.questionnaireType,
          scores: attempt.scores,
          quadrants: attempt.quadrants,
        });
      }
    }
  }

  // 按时间排序
  dataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (dataPoints.length < 2) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm text-center">
        <p className="text-stone-500">至少需要2次测评才能展示趋势</p>
        <p className="text-sm text-stone-400 mt-2">完成更多测评后可查看趋势变化</p>
      </div>
    );
  }

  // 获取所有维度
  const allDimensions = new Set<string>();
  for (const dp of dataPoints) {
    for (const dimId of Object.keys(dp.scores)) {
      allDimensions.add(dimId);
    }
  }

  // 计算每个维度的趋势
  const dimensionTrends = Array.from(allDimensions).map((dimId) => {
    const values = dataPoints.map((dp) => ({
      date: dp.date,
      dateLabel: dp.dateLabel,
      axis1: dp.scores[dimId]?.axis1 ?? 0,
      axis2: dp.scores[dimId]?.axis2 ?? 0,
    }));

    const first = values[0];
    const last = values[values.length - 1];
    const axis1Change = last.axis1 - first.axis1;
    const axis2Change = last.axis2 - first.axis2;
    const avgChange = (axis1Change + axis2Change) / 2;

    let trend: string;
    if (avgChange >= 0.6) trend = 'significant-up';
    else if (avgChange >= 0.3) trend = 'up';
    else if (avgChange <= -0.6) trend = 'significant-down';
    else if (avgChange <= -0.3) trend = 'down';
    else trend = 'stable';

    return {
      dimensionId: dimId,
      values,
      axis1Change,
      axis2Change,
      avgChange,
      trend,
    };
  });

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
        <h3 className="font-semibold text-lg mb-1">趋势概览</h3>
        <p className="text-amber-100 text-sm">
          共 {dataPoints.length} 次测评记录
        </p>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">
              {dimensionTrends.filter((d) => d.trend === 'up' || d.trend === 'significant-up').length}
            </p>
            <p className="text-xs text-amber-100">进步维度</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {dimensionTrends.filter((d) => d.trend === 'stable').length}
            </p>
            <p className="text-xs text-amber-100">稳定维度</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {dimensionTrends.filter((d) => d.trend === 'down' || d.trend === 'significant-down').length}
            </p>
            <p className="text-xs text-amber-100">退步维度</p>
          </div>
        </div>
      </div>

      {/* 趋势详情 */}
      {dimensionTrends.map((dt) => (
        <div key={dt.dimensionId} className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-stone-800">
              {dt.dimensionId}
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{trendIcons[dt.trend]}</span>
              <span className={`text-sm font-medium ${
                dt.trend === 'up' || dt.trend === 'significant-up'
                  ? 'text-green-600'
                  : dt.trend === 'down' || dt.trend === 'significant-down'
                    ? 'text-red-600'
                    : 'text-stone-500'
              }`}>
                {dt.avgChange >= 0 ? '+' : ''}{dt.avgChange.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 简化趋势条 */}
          <div className="flex items-end gap-1 h-16">
            {dt.values.map((v, i) => {
              const height1 = (v.axis1 / 5) * 100;
              const height2 = (v.axis2 / 5) * 100;
              const isFirst = i === 0;
              const isLast = i === dt.values.length - 1;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full flex flex-col items-center gap-0.5">
                    <div
                      className={`w-full rounded-t ${isLast ? 'bg-amber-500' : 'bg-amber-200'}`}
                      style={{ height: `${height1}%`, minHeight: '4px' }}
                    />
                    <div
                      className={`w-full rounded-t ${isLast ? 'bg-blue-500' : 'bg-blue-200'}`}
                      style={{ height: `${height2}%`, minHeight: '4px' }}
                    />
                  </div>
                  <span className="text-xs text-stone-400">{v.dateLabel}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex justify-between text-xs text-stone-500">
            <span>维度1: {dt.axis1Change >= 0 ? '+' : ''}{dt.axis1Change.toFixed(2)}</span>
            <span>维度2: {dt.axis2Change >= 0 ? '+' : ''}{dt.axis2Change.toFixed(2)}</span>
          </div>
        </div>
      ))}

      {/* 图例 */}
      <div className="flex gap-4 text-xs text-stone-500 justify-center">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-500" />
          <span>维度1 (最新)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-200" />
          <span>维度1 (历史)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-500" />
          <span>维度2 (最新)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-200" />
          <span>维度2 (历史)</span>
        </div>
      </div>
    </div>
  );
}
