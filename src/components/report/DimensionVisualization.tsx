'use client';

import { useMemo, useState } from 'react';
import { QuadrantChart } from './QuadrantChart';
import { RadarChart } from './RadarChart';
import {
  QUADRANT_COORDINATE,
  coordinateOf,
  quadrantNamesByCoordinate,
  normalizeScore,
} from '@/lib/scoring/quadrant-geometry';
import type { SemanticCoordinate } from '@/lib/scoring/quadrant-geometry';

export interface DimensionMeta {
  dimensionId: string;
  dimensionName: string;
  axes: Array<{
    id: string;
    name: string;
    description: string;
    positiveLabel: string;
    negativeLabel: string;
  }>;
  quadrants: Array<{ id: string; name: string; description: string }>;
}

interface Props {
  dimensionMeta: DimensionMeta[];
  scores: Record<string, { axis1: number; axis2: number }>;
  quadrants: Record<string, string>;
}

/** 1-5 原始分 → 0-100 归一化（与 calculator.normalizeScore 一致） */
const normalize = normalizeScore;

/**
 * 维度可视化：雷达图（全局）+ 象限图（选中维度）。
 *
 * 说明：象限 id ↔ 语义坐标的映射取自 quadrant-geometry.ts（唯一真源），
 * 因此象限约定一旦调整，这里自动跟随，无需改 UI。
 */
export function DimensionVisualization({ dimensionMeta, scores, quadrants }: Props) {
  const [selectedId, setSelectedId] = useState(dimensionMeta[0]?.dimensionId ?? '');

  const selected = useMemo(
    () => dimensionMeta.find((d) => d.dimensionId === selectedId) ?? dimensionMeta[0],
    [dimensionMeta, selectedId],
  );

  // 雷达图数据：每个轴一条，共 2N 条
  const radar = useMemo(() => {
    const labels: string[] = [];
    const data: number[] = [];
    for (const dim of dimensionMeta) {
      const s = scores?.[dim.dimensionId];
      if (!s) continue;
      labels.push(`${dim.dimensionName}·${dim.axes[0]?.name ?? '轴1'}`);
      data.push(normalize(s.axis1 ?? 3));
      labels.push(`${dim.dimensionName}·${dim.axes[1]?.name ?? '轴2'}`);
      data.push(normalize(s.axis2 ?? 3));
    }
    return { labels, data };
  }, [dimensionMeta, scores]);

  if (!selected) return null;

  const selectedScores = scores?.[selected.dimensionId] ?? { axis1: 3, axis2: 3 };
  const currentQuadrantId = quadrants?.[selected.dimensionId];

  // 该维度四个语义坐标各自该显示哪条文案
  const quadrantNames = useMemo(
    () => quadrantNamesByCoordinate(selected.quadrants),
    [selected],
  );

  const currentCoordinate = coordinateOf(selectedScores.axis1 ?? 3, selectedScores.axis2 ?? 3);

  return (
    <div className="space-y-6">
      {/* 雷达图：全局能力画像 */}
      {radar.labels.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800 mb-1">🕸️ 能力画像</h2>
          <p className="text-xs text-stone-400 mb-4">
            全部 {radar.labels.length / 2} 个维度的双轴得分（越靠外越强）
          </p>
          <RadarChart
            labels={radar.labels}
            datasets={[{ label: selected.dimensionName, color: '#f59e0b', data: radar.data }]}
          />
        </div>
      )}

      {/* 象限图：选中维度 */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-800 mb-1">🎯 象限定位</h2>
        <p className="text-xs text-stone-400 mb-4">
          每个维度的双轴得分落在哪个象限 —— 选一个维度查看
        </p>

        {/* 维度选择器 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {dimensionMeta.map((d) => {
            const qid = quadrants?.[d.dimensionId];
            const isActive = d.dimensionId === selected.dimensionId;
            return (
              <button
                key={d.dimensionId}
                onClick={() => setSelectedId(d.dimensionId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  isActive
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
                }`}
              >
                {d.dimensionName}
                {qid && <span className="ml-1 opacity-60">{qid}</span>}
              </button>
            );
          })}
        </div>

        <div className="px-2">
          <QuadrantChart
            axis1Label={selected.axes[0]?.name ?? '纵轴'}
            axis2Label={selected.axes[1]?.name ?? '横轴'}
            axis1HighLabel={selected.axes[0]?.positiveLabel || '高'}
            axis1LowLabel={selected.axes[0]?.negativeLabel || '低'}
            axis2HighLabel={selected.axes[1]?.positiveLabel || '高'}
            axis2LowLabel={selected.axes[1]?.negativeLabel || '低'}
            quadrantNames={quadrantNames}
            currentCoordinate={currentCoordinate}
            axis1Score={selectedScores.axis1 ?? 3}
            axis2Score={selectedScores.axis2 ?? 3}
          />
        </div>

        {/* 当前象限的解释 */}
        {currentQuadrantId && (
          <div className="mt-4 p-3 rounded-lg bg-stone-50 border border-stone-200">
            <div className="text-xs text-stone-500">
              当前象限：<span className="font-medium text-stone-700">{quadrantNames[currentCoordinate]}</span>
              <span className="ml-2 text-stone-400">
                （代码判定 {currentQuadrantId}）
              </span>
            </div>
            <p className="text-sm text-stone-600 mt-1">
              {selected.quadrants.find((q) => q.id === currentQuadrantId)?.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
