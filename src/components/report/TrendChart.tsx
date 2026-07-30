'use client';

import type { TrendAnalysis, DimensionTrend, TrendType } from '@/types/report';

const trendConfig: Record<TrendType, { icon: string; label: string; color: string; bgColor: string }> = {
  'significant-up': { icon: '⬆⬆', label: '显著提升', color: 'text-green-600', bgColor: 'bg-green-50' },
  'up': { icon: '↑', label: '提升', color: 'text-green-500', bgColor: 'bg-green-50' },
  'stable': { icon: '→', label: '稳定', color: 'text-stone-500', bgColor: 'bg-stone-50' },
  'down': { icon: '↓', label: '下降', color: 'text-red-500', bgColor: 'bg-red-50' },
  'significant-down': { icon: '⬇⬇', label: '显著下降', color: 'text-red-600', bgColor: 'bg-red-50' },
};

interface TrendChartProps {
  trendAnalysis: TrendAnalysis;
  compact?: boolean;
}

export function TrendChart({ trendAnalysis, compact = false }: TrendChartProps) {
  const overallConfig = trendConfig[trendAnalysis.overallTrend] ?? trendConfig['stable'];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-2xl">{overallConfig.icon}</span>
        <div>
          <p className={`font-semibold ${overallConfig.color}`}>{overallConfig.label}</p>
          <p className="text-xs text-stone-500">整体趋势</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 整体趋势 */}
      <div className={`p-4 rounded-xl ${overallConfig.bgColor}`}>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{overallConfig.icon}</span>
          <div>
            <p className={`text-lg font-bold ${overallConfig.color}`}>{overallConfig.label}</p>
            <p className="text-sm text-stone-500">整体趋势（对比 {new Date(trendAnalysis.comparedAt).toLocaleDateString('zh-CN')}）</p>
          </div>
        </div>
      </div>

      {/* 维度趋势列表 */}
      <div className="space-y-3">
        {trendAnalysis.dimensionTrends.map((dt) => {
          const config = trendConfig[dt.trend] ?? trendConfig['stable'];
          const changePercent = (dt.change / 5) * 100; // 假设满分5分

          return (
            <div key={dt.dimensionId} className="p-3 bg-white rounded-xl border border-stone-200">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-stone-700">{dt.dimensionName}</p>
                  <p className="text-xs text-stone-400">{dt.description}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${dt.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {dt.change >= 0 ? '+' : ''}{dt.change.toFixed(2)}
                  </p>
                  <p className={`text-xs ${config.color}`}>{config.label}</p>
                </div>
              </div>

              {/* 变化条形图 */}
              <div className="relative h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 h-full rounded-full ${
                    dt.change >= 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min(Math.abs(changePercent), 100)}%`,
                    left: dt.change >= 0 ? '50%' : `${50 - Math.abs(changePercent)}%`,
                  }}
                />
                {/* 中点线 */}
                <div className="absolute top-0 left-1/2 w-px h-full bg-stone-300" />
              </div>
              <div className="flex justify-between text-xs text-stone-400 mt-1">
                <span>-2.5</span>
                <span>0</span>
                <span>+2.5</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DimensionTrendBadgeProps {
  trend: DimensionTrend;
}

export function DimensionTrendBadge({ trend }: DimensionTrendBadgeProps) {
  const config = trendConfig[trend.trend] ?? trendConfig['stable'];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.bgColor} ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}
