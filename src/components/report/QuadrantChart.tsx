'use client';

import type { QuadrantType } from '@/lib/scoring/quadrant';
import { QUADRANT_COLOR } from '@/lib/scoring/quadrant-geometry';
import type { SemanticCoordinate } from '@/lib/scoring/quadrant-geometry';

interface QuadrantChartProps {
  axis1Label: string; // 纵轴标签
  axis2Label: string; // 横轴标签
  axis1HighLabel: string; // 纵轴正向标签
  axis1LowLabel: string; // 纵轴负向标签
  axis2HighLabel: string; // 横轴正向标签
  axis2LowLabel: string; // 横轴负向标签
  /**
   * 四个语义坐标各自对应的象限名。
   * key 是语义坐标（高高/好差/差好/双差），不是象限 id ——
   * 这样象限约定怎么调整，格子代表的语义位置永远正确。
   */
  quadrantNames: Record<SemanticCoordinate, string>;
  /** 当前所在语义坐标（由分数算出） */
  currentCoordinate: SemanticCoordinate | null;
  axis1Score: number; // 原始均分 1-5
  axis2Score: number; // 原始均分 1-5
}

const GRID_POSITIONS = {
  topRight: { cls: 'border-r border-b', dot: 'bg-green-500', text: 'text-green-700', ring: 'ring-green-400', bg: 'bg-green-100' },
  topLeft: { cls: 'border-l border-b', dot: 'bg-red-500', text: 'text-red-700', ring: 'ring-red-400', bg: 'bg-red-100' },
  bottomLeft: { cls: 'border-t border-r', dot: 'bg-stone-500', text: 'text-stone-700', ring: 'ring-stone-500', bg: 'bg-stone-300' },
  bottomRight: { cls: 'border-t border-l', dot: 'bg-amber-500', text: 'text-amber-700', ring: 'ring-amber-400', bg: 'bg-amber-100' },
} as const;

type GridPosition = keyof typeof GRID_POSITIONS;

export function QuadrantChart({
  axis1Label,
  axis2Label,
  axis1HighLabel,
  axis1LowLabel,
  axis2HighLabel,
  axis2LowLabel,
  quadrantNames,
  currentCoordinate,
  axis1Score,
  axis2Score,
}: QuadrantChartProps) {
  // 分数 → 语义坐标（阈值 >3 为高，与计分器一致）
  const isAxis1High = axis1Score > 3;
  const isAxis2High = axis2Score > 3;

  let currentPosition: GridPosition | null = null;
  if (currentCoordinate) {
    if (currentCoordinate === '高高') currentPosition = 'topRight';
    else if (currentCoordinate === '差好') currentPosition = 'topLeft';
    else if (currentCoordinate === '双差') currentPosition = 'bottomLeft';
    else currentPosition = 'bottomRight';
  }

  // 每个格子显示哪个语义坐标的文案
  const positionCoordinate: Record<GridPosition, SemanticCoordinate> = {
    topRight: '高高',
    topLeft: '差好',
    bottomLeft: '双差',
    bottomRight: '好差',
  };

  const renderCell = (pos: GridPosition) => {
    const s = GRID_POSITIONS[pos];
    const isCurrent = currentPosition === pos;
    const coord = positionCoordinate[pos];
    return (
      <div
        key={pos}
        className={`relative p-2 flex items-center justify-center ${s.cls} border-stone-200 ${
          isCurrent ? `${s.bg} ring-2 ${s.ring}` : 'bg-stone-50'
        }`}
      >
        <div className="text-center">
          <div className={`text-xs font-medium ${isCurrent ? s.text : 'text-stone-500'}`}>
            {quadrantNames[coord]}
          </div>
          {isCurrent && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-3 h-3 ${s.dot} rounded-full animate-pulse`} />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Y轴标签 */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full mr-2 text-right">
        <div className="text-xs text-stone-500">{axis1Label}</div>
        <div className="text-xs text-stone-400">{axis1HighLabel} ↑</div>
        <div className="text-xs text-stone-400">↓ {axis1LowLabel}</div>
      </div>

      {/* 图表区域 */}
      <div className="relative border-2 border-stone-300 rounded-lg bg-white"
        style={{ aspectRatio: '1 / 1' }}>
        {/* 十字线 */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-stone-200 -translate-x-1/2" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-stone-200 -translate-y-1/2" />

        {/* 四个象限 */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {renderCell('topRight')}
          {renderCell('topLeft')}
          {renderCell('bottomLeft')}
          {renderCell('bottomRight')}
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
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        QUADRANT_COLOR[quadrantType]
      }`}
    >
      {quadrantName}
    </span>
  );
}
