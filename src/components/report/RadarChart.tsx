'use client';

interface RadarChartDataset {
  label: string;
  color: string;
  data: number[]; // 标准化到 0-100 的得分
}

interface RadarChartProps {
  labels: string[]; // 每个轴的标签
  datasets: RadarChartDataset[];
  maxValue?: number;
}

export function RadarChart({ labels, datasets, maxValue = 100 }: RadarChartProps) {
  const numAxes = labels.length;
  const angleStep = (2 * Math.PI) / numAxes;
  const centerX = 100;
  const centerY = 100;
  const radius = 80;

  // 计算每个顶点的位置
  const points = labels.map((_, i) => {
    const angle = angleStep * i - Math.PI / 2; // 从顶部开始
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  // 计算数据点位置
  const getDataPoint = (value: number, index: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / maxValue) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
    };
  };

  // 生成网格线（同心多边形）
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="relative w-full max-w-md mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* 网格线 */}
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={points
              .map((p, i) => {
                const angle = angleStep * i - Math.PI / 2;
                const r = radius * level;
                return `${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`;
              })
              .join(' ')}
            fill="none"
            stroke="rgb(226, 232, 240)"
            strokeWidth="0.5"
          />
        ))}

        {/* 轴线 */}
        {points.map((p, i) => (
          <line
            key={`axis-${i}`}
            x1={centerX}
            y1={centerY}
            x2={p.x}
            y2={p.y}
            stroke="rgb(226, 232, 240)"
            strokeWidth="0.5"
          />
        ))}

        {/* 数据多边形 */}
        {datasets.map((dataset, datasetIndex) => (
          <polygon
            key={dataset.label}
            points={dataset.data
              .map((value, i) => {
                const p = getDataPoint(value, i);
                return `${p.x},${p.y}`;
              })
              .join(' ')}
            fill={dataset.color}
            fillOpacity={0.2}
            stroke={dataset.color}
            strokeWidth={datasetIndex === 0 ? '2' : '1.5'}
            strokeDasharray={datasetIndex === 1 ? '4,2' : datasetIndex === 2 ? '2,2' : undefined}
          />
        ))}

        {/* 数据点 */}
        {datasets.map((dataset, datasetIndex) =>
          dataset.data.map((value, i) => {
            const p = getDataPoint(value, i);
            return (
              <circle
                key={`${dataset.label}-${i}`}
                cx={p.x}
                cy={p.y}
                r="2.5"
                fill={dataset.color}
                stroke="white"
                strokeWidth="1"
              />
            );
          })
        )}

        {/* 标签 */}
        {labels.map((label, i) => {
          const angle = angleStep * i - Math.PI / 2;
          const labelRadius = radius + 15;
          const x = centerX + labelRadius * Math.cos(angle);
          const y = centerY + labelRadius * Math.sin(angle);

          let textAnchor: 'start' | 'middle' | 'end' = 'middle';
          if (Math.cos(angle) > 0.1) textAnchor = 'start';
          else if (Math.cos(angle) < -0.1) textAnchor = 'end';

          return (
            <text
              key={`label-${i}`}
              x={x}
              y={y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              className="fill-stone-500 text-[8px]"
            >
              {label}
            </text>
          );
        })}
      </svg>

      {/* 图例 */}
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {datasets.map((dataset) => (
          <div key={dataset.label} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: dataset.color }}
            />
            <span className="text-xs text-stone-600">{dataset.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
