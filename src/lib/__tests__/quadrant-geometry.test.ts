// 象限几何与可视化逻辑测试
//
// 覆盖：
//   1. 语义坐标判定（分数 → 坐标）
//   2. 坐标 ↔ id 双向映射自洽
//   3. 文案按语义坐标归位（象限图四个格子显示什么）
//   4. 归一化
//
// 为什么重要：报告页的象限图 / 雷达图是这个产品最核心的可视化，
// 它依赖「id ↔ 语义坐标」映射。映射一旦错位，图形就会把文案贴错格子
// —— 而且这种错误肉眼很难发现（图形仍然"看起来对"）。
import { describe, it, expect } from 'vitest';
import { questionnaires } from '@/data/questionnaires';
import {
  QUADRANT_COORDINATE,
  COORDINATE_QUADRANT,
  QUADRANT_GRID_POSITION,
  coordinateOf,
  quadrantNamesByCoordinate,
  normalizeScore,
} from '@/lib/scoring/quadrant-geometry';
import { determineQuadrantType } from '@/lib/scoring/calculator';
import type { StageId } from '@/types/stage';

const STAGES: StageId[] = [
  'primary-low', 'primary-high', 'junior-1', 'junior-3', 'senior-1', 'senior-3',
];

describe('语义坐标判定', () => {
  it('分数组合 → 坐标', () => {
    expect(coordinateOf(5, 5)).toBe('高高');
    expect(coordinateOf(5, 1)).toBe('好差');
    expect(coordinateOf(1, 5)).toBe('差好');
    expect(coordinateOf(1, 1)).toBe('双差');
  });

  it('阈值：3 分本身算低，>3 才算高', () => {
    expect(coordinateOf(3, 3)).toBe('双差');
    expect(coordinateOf(3.01, 3.01)).toBe('高高');
    expect(coordinateOf(3, 5)).toBe('差好');
  });
});

describe('坐标 ↔ id 映射自洽', () => {
  it('QUADRANT_COORDINATE 与 COORDINATE_QUADRANT 互为逆映射', () => {
    for (const [id, coord] of Object.entries(QUADRANT_COORDINATE)) {
      expect(COORDINATE_QUADRANT[coord]).toBe(id);
    }
  });

  it('四个坐标恰好覆盖四个象限 id，无重复无遗漏', () => {
    const ids = Object.values(QUADRANT_COORDINATE).map((c) => COORDINATE_QUADRANT[c]);
    expect(new Set(ids).size).toBe(4);
  });

  it('计分器判定结果与坐标映射一致', () => {
    const cases: Array<[number, number]> = [
      [5, 5], [5, 1], [1, 5], [1, 1], [3, 3], [4, 2], [2, 4], [3.5, 3.5],
    ];
    for (const [a1, a2] of cases) {
      const id = determineQuadrantType(a1, a2);
      expect(COORDINATE_QUADRANT[coordinateOf(a1, a2)], `${a1},${a2}`).toBe(id);
    }
  });
});

describe('象限图格子定位', () => {
  it('四个语义坐标映射到四个互不相同的格子', () => {
    const positions = Object.values(QUADRANT_GRID_POSITION);
    expect(new Set(positions).size).toBe(4);
  });

  it('格子语义与象限图视觉约定一致：上=纵轴高，右=横轴高', () => {
    // 纵轴高 → 上排；横轴高 → 右列
    expect(QUADRANT_GRID_POSITION['高高']).toBe('topRight');
    expect(QUADRANT_GRID_POSITION['差好']).toBe('topLeft');
    expect(QUADRANT_GRID_POSITION['双差']).toBe('bottomLeft');
    expect(QUADRANT_GRID_POSITION['好差']).toBe('bottomRight');
  });
});

describe('文案按语义坐标归位', () => {
  it('learning-interest：四条文案落到正确的语义格子', () => {
    const dim = questionnaires['primary-low'].dimensions.find((d) => d.id === 'learning-interest')!;
    const names = quadrantNamesByCoordinate(dim.quadrants);

    // 学习兴趣：探索坚持型=双好 / 浅尝辄止型=好差 / 被动游离型=双差 / 尽责完成型=差好
    expect(names['高高']).toBe('探索坚持型');
    expect(names['好差']).toBe('浅尝辄止型');
    expect(names['双差']).toBe('被动游离型');
    expect(names['差好']).toBe('尽责完成型');
  });

  it('每个维度的四个语义格子都有文案（无空缺）', () => {
    for (const stage of STAGES) {
      for (const dim of questionnaires[stage].dimensions) {
        const names = quadrantNamesByCoordinate(dim.quadrants);
        for (const [coord, name] of Object.entries(names)) {
          expect(name, `${stage}/${dim.id} 的 ${coord} 格没有文案`).toBeTruthy();
        }
      }
    }
  });

  it('四个格子互不重复（同一维度不会出现两条文案占同一格）', () => {
    for (const stage of STAGES) {
      for (const dim of questionnaires[stage].dimensions) {
        const names = Object.values(quadrantNamesByCoordinate(dim.quadrants));
        expect(new Set(names).size, `${stage}/${dim.id} 有两条文案占同一格`).toBe(4);
      }
    }
  });
});

describe('归一化', () => {
  it('1→0, 3→50, 5→100', () => {
    expect(normalizeScore(1)).toBe(0);
    expect(normalizeScore(3)).toBe(50);
    expect(normalizeScore(5)).toBe(100);
  });
});
