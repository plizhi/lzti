'use client';

import type { QuadrantType } from '@/lib/scoring/quadrant';

interface QuadrantChartProps {
  axis1Label: string; // 纵轴标签
  axis2Label: string; // 横轴标签
  axis1HighLabel: string; // 纵轴正向标签
  axis1LowLabel: string; // 纵轴负向标签
  axis2HighLabel: string; // 横轴正向标签
  axis2LowLabel: string; // 横轴负向标签
  quadrantPositions: {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
  };
  currentQuadrant: QuadrantType | null;
  axis1Score: number; // 原始均分 1-5
  axis2Score: number; // 原始均分 1-5
}

const quadrantColors: Record<QuadrantType, string> = {
  optimal: 'bg-green-100 border-green-300 text-green-800',
  strategy: 'bg-amber-100 border-amber-300 text-amber-800',
  passive: 'bg-stone-100 border-stone-300 text-stone-600',
  overwhelmed: 'bg-red-100 border-red-300 text-red-800',
};

export function QuadrantChart({
  axis1Label,
  axis2Label,
  axis1HighLabel,
  axis1LowLabel,
  axis2HighLabel,
  axis2LowLabel,
  quadrantPositions,
  currentQuadrant,
  axis1Score,
  axis2Score,
}: QuadrantChartProps) {
  // 确定当前象限位置
  const isAxis1High = axis1Score > 3;
  const isAxis2High = axis2Score > 3;

  let currentPosition: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  if (isAxis1High && isAxis2High) currentPosition = 'topRight';
  else if (!isAxis1High && isAxis2High) currentPosition = 'topLeft';
  else if (!isAxis1High && !isAxis2High) currentPosition = 'bottomLeft';
  else currentPosition = 'bottomRight';

  const quadrantBgColors = {
    topRight: currentPosition === 'topRight' ? 'bg-green-100' : 'bg-stone-50',
    topLeft: currentPosition === 'topLeft' ? 'bg-red-100' : 'bg-stone-50',
    bottomLeft: currentPosition === 'bottomLeft' ? 'bg-stone-200' : 'bg-stone-50',
    bottomRight: currentPosition === 'bottomRight' ? 'bg-amber-100' : 'bg-stone-50',
  };

  return (
    <div className="relative">
      {/* Y轴标签 */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full mr-2 text-right">
        <div className="text-xs text-stone-500">{axis1Label}</div>
        <div className="text-xs text-stone-400">{axis1HighLabel} ↑</div>
      </div>

      {/* 图表区域 */}
      <div className="relative border-2 border-stone-300 rounded-lg bg-white"
        style={{ aspectRatio: '1 / 1' }}>
        {/* 十字线 */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-stone-200 -translate-x-1/2" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-stone-200 -translate-y-1/2" />

        {/* 四个象限 */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {/* 右上 - Optimal */}
          <div className={`relative p-2 flex items-center justify-center border-r border-b border-stone-200 ${currentPosition === 'topRight' ? 'bg-green-100 ring-2 ring-green-400' : 'bg-stone-50'}`}>
            <div className="text-center">
              <div className={`text-xs font-medium ${currentPosition === 'topRight' ? 'text-green-700' : 'text-stone-500'}`}>
                {quadrantPositions.topRight}
              </div>
              {currentPosition === 'topRight' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* 左上 - Overwhelmed */}
          <div className={`relative p-2 flex items-center justify-center border-l border-b border-stone-200 ${currentPosition === 'topLeft' ? 'bg-red-100 ring-2 ring-red-400' : 'bg-stone-50'}`}>
            <div className="text-center">
              <div className={`text-xs font-medium ${currentPosition === 'topLeft' ? 'text-red-700' : 'text-stone-500'}`}>
                {quadrantPositions.topLeft}
              </div>
              {currentPosition === 'topLeft' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* 左下 - Passive */}
          <div className={`relative p-2 flex items-center justify-center border-t border-r border-stone-200 ${currentPosition === 'bottomLeft' ? 'bg-stone-300 ring-2 ring-stone-500' : 'bg-stone-50'}`}>
            <div className="text-center">
              <div className={`text-xs font-medium ${currentPosition === 'bottomLeft' ? 'text-stone-700' : 'text-stone-500'}`}>
                {quadrantPositions.bottomLeft}
              </div>
              {currentPosition === 'bottomLeft' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-stone-500 rounded-full animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* 右下 - Strategy */}
          <div className={`relative p-2 flex items-center justify-center border-t border-l border-stone-200 ${currentPosition === 'bottomRight' ? 'bg-amber-100 ring-2 ring-amber-400' : 'bg-stone-50'}`}>
            <div className="text-center">
              <div className={`text-xs font-medium ${currentPosition === 'bottomRight' ? 'text-amber-700' : 'text-stone-500'}`}>
                {quadrantPositions.bottomRight}
              </div>
              {currentPosition === 'bottomRight' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 得分标注 */}
        <div className="absolute top-2 right-2 text-xs text-stone-400">
          <div>纵轴: {axis1Score.toFixed(1)}</div>
          <div>横轴: {axis2Score.toFixed(1)}</div>
        </div>
      </div>

      {/* X轴标签 */}
      <div className="mt-2 flex justify-center">
        <div className="text-xs text-stone-400 mr-4">← {axis2LowLabel}</div>
        <div className="text-xs text-stone-500">{axis2Label}</div>
        <div className="text-xs text-stone-400 ml-4">{axis2HighLabel} →</div>
      </div>
    </div>
  );
}

interface QuadrantBadgeProps {
  quadrantType: QuadrantType;
  quadrantName: string;
}

export function QuadrantBadge({ quadrantType, quadrantName }: QuadrantBadgeProps) {
  const colorClasses = quadrantColors[quadrantType];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses}`}>
      {quadrantName}
    </span>
  );
}
