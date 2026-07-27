'use client';

interface DimensionTrendChartProps {
  dimensionName: string;
  axis1Scores: number[];
  axis2Scores: number[];
  timePoints: string[];
  axis1Label?: string;
  axis2Label?: string;
}

export function DimensionTrendChart({
  dimensionName,
  axis1Scores,
  axis2Scores,
  timePoints,
  axis1Label = '维度1',
  axis2Label = '维度2',
}: DimensionTrendChartProps) {
  // 计算 SVG 坐标
  const width = 300;
  const height = 100;
  const padding = { left: 10, right: 10, top: 10, bottom: 20 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // 分数范围 1-5，映射到 0-100
  const scaleY = (value: number) => {
    return chartHeight - ((value - 1) / 4) * chartHeight;
  };

  const getX = (index: number, total: number) => {
    return padding.left + (index / (total - 1 || 1)) * chartWidth;
  };

  // 生成折线点
  const getPolylinePoints = (scores: number[]) => {
    return scores
      .map((score, i) => {
        const x = getX(i, scores.length);
        const y = scaleY(score);
        return `${x},${y}`;
      })
      .join(' ');
  };

  return (
    <div className="bg-white p-4 rounded-xl">
      <h4 className="text-sm font-medium text-stone-700 mb-3">{dimensionName}</h4>
      <div className="relative h-32">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* 背景网格 */}
          {[1, 2, 3, 4, 5].map((level) => (
            <line
              key={`grid-${level}`}
              x1={padding.left}
              y1={scaleY(level)}
              x2={width - padding.right}
              y2={scaleY(level)}
              stroke="rgb(226, 232, 240)"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
          ))}

          {/* Axis 1 折线 */}
          {axis1Scores.length > 1 && (
            <polyline
              points={getPolylinePoints(axis1Scores)}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Axis 2 折线 */}
          {axis2Scores.length > 1 && (
            <polyline
              points={getPolylinePoints(axis2Scores)}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="4,2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 数据点 */}
          {axis1Scores.map((score, i) => (
            <circle
              key={`axis1-${i}`}
              cx={getX(i, axis1Scores.length)}
              cy={scaleY(score)}
              r="3"
              fill="#f59e0b"
              stroke="white"
              strokeWidth="1"
            />
          ))}
          {axis2Scores.map((score, i) => (
            <circle
              key={`axis2-${i}`}
              cx={getX(i, axis2Scores.length)}
              cy={scaleY(score)}
              r="3"
              fill="#3b82f6"
              stroke="white"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-stone-400 mt-1 px-2">
        {timePoints.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
      <div className="flex justify-center gap-4 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-amber-500" />
          <span className="text-stone-500">{axis1Label}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-blue-500" style={{ borderStyle: 'dashed' }} />
          <span className="text-stone-500">{axis2Label}</span>
        </div>
      </div>
    </div>
  );
}
