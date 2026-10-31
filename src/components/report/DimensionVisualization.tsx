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

/** 没有任何有效维度时的占位（四个语义坐标都空） */
const EMPTY_COORDINATE_NAMES: Record<SemanticCoordinate, string> = {
  高高: '', 好差: '', 差好: '', 双差: '',
};

/**
 * 维度可视化：雷达图（全局）+ 象限图（选中维度）。
 *
 * 说明：象限 id ↔ 语义坐标的映射取自 quadrant-geometry.ts（唯一真源），
 * 因此象限约定一旦调整，这里自动跟随，无需改 UI。
 */
export function DimensionVisualization({ dimensionMeta, scores, quadrants }: Props) {
  const [selectedId, setSelectedId] = useState(dimensionMeta[0]?.dimensionId ?? '');

  // ⚠️ 只列**有数据**的维度（2026-10-31 修）：
  //    计分器对「某轴一道题都没答上」的维度不再产生分数（不落象限），
  //    这种维度展示出来只会让人误以为它有结论 —— 宁可少列，不可造假。
  const scoredDimensions = useMemo(
    () => dimensionMeta.filter((d) => scores?.[d.dimensionId]),
    [dimensionMeta, scores],
  );

  const selected = useMemo(
    () => scoredDimensions.find((d) => d.dimensionId === selectedId) ?? scoredDimensions[0],
    [scoredDimensions, selectedId],
  );

  // 雷达图数据：每个轴一条，共 2N 条
  const radar = useMemo(() => {
    const labels: string[] = [];
    const data: number[] = [];
    for (const dim of scoredDimensions) {
      const s = scores?.[dim.dimensionId];
      if (!s) continue;
      labels.push(`${dim.dimensionName}·${dim.axes[0]?.name ?? '轴1'}`);
      data.push(normalize(s.axis1));
      labels.push(`${dim.dimensionName}·${dim.axes[1]?.name ?? '轴2'}`);
      data.push(normalize(s.axis2));
    }
    return { labels, data };
  }, [scoredDimensions, scores]);

  const selectedScores = selected ? scores?.[selected.dimensionId] : undefined;
  const currentQuadrantId = selected ? quadrants?.[selected.dimensionId] : undefined;

  // 该维度四个语义坐标各自该显示哪条文案
  const quadrantNames = useMemo(
    () => (selected ? quadrantNamesByCoordinate(selected.quadrants) : EMPTY_COORDINATE_NAMES),
    [selected],
  );

  const currentCoordinate = selectedScores
    ? coordinateOf(selectedScores.axis1, selectedScores.axis2)
    : null;

  // ⚠️ 提前 return 必须在所有 hook 之后
  //    （原来 quadrantNames 的 useMemo 排在 `if (!selected) return null` 之后 ——
  //      条件返回时会违反 hook 顺序规则，是个潜伏 bug）
  if (!selected || !selectedScores || !currentCoordinate) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm text-center">
        <p className="text-sm text-stone-500">
          这份测评的数据不完整，暂时无法生成可视化。
        </p>
      </div>
    );
  }

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
          {scoredDimensions.map((d) => {
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
            axis1Score={selectedScores.axis1}
            axis2Score={selectedScores.axis2}
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
