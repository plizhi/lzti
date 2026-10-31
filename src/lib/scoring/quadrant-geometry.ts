// 象限几何：id ↔ 语义坐标的唯一真源
//
// 背景（2026-10-31）：
//   计分器、象限图组件、雷达图都依赖「象限 id ↔ 语义坐标」的对应关系。
//   以前这个对应关系散落在三处（calculator.ts 的 if 链、QuadrantChart.tsx 的硬编码布局、
//   以及各学段 questionnaire.ts 里按 id 组织的文案），改任何一处都可能漏另外两处。
//
//   抽到这里后：
//     - calculator.ts 用它判定象限
//     - 象限图组件用它决定四个格子的语义位置
//     - 改约定时只改这一个文件
//
// 语义坐标记法：
//   '高高' = 纵轴高 + 横轴高（双好）
//   '好差' = 纵轴高 + 横轴低
//   '差好' = 纵轴低 + 横轴高
//   '双差' = 纵轴低 + 横轴低（双差，最差）
//
// ⚠️ 当前约定（约定Q）：双差 = passive。
//    数据侧 16/22 个维度是按「双差 = 最差 = overwhelmed」写的，与本约定冲突 → 见
//    docs/象限语义真值表.md。待朋大大拍板后，只需改本文件的 QUADRANT_COORDINATE。
import type { QuadrantType } from '@/lib/scoring/quadrant';

/** 语义坐标 */
export type SemanticCoordinate = '高高' | '好差' | '差好' | '双差';

/**
 * 象限 id → 语义坐标（当前约定）
 * 这是全项目唯一的真源，计分器与前端可视化都读它。
 */
export const QUADRANT_COORDINATE: Record<QuadrantType, SemanticCoordinate> = {
  optimal: '高高',
  strategy: '好差',
  overwhelmed: '差好',
  passive: '双差',
};

/** 语义坐标 → 象限 id（上面的逆映射） */
export const COORDINATE_QUADRANT: Record<SemanticCoordinate, QuadrantType> = {
  高高: 'optimal',
  好差: 'strategy',
  差好: 'overwhelmed',
  双差: 'passive',
};

/**
 * 象限图组件的四个格子，按**语义坐标**命名（而不是按 id）。
 * 这样无论 id 怎么重映射，格子代表的语义位置永远正确。
 *
 * 布局（CSS grid: 2×2，视觉上「上=纵轴高，右=横轴高」）：
 *   topRight  = 高高  → 最优
 *   topLeft   = 差好  → 一低一高
 *   bottomLeft= 双差  → 最差
 *   bottomRight= 好差  → 一好一低
 */
export const QUADRANT_GRID_POSITION: Record<SemanticCoordinate,
  'topRight' | 'topLeft' | 'bottomLeft' | 'bottomRight'> = {
  高高: 'topRight',
  差好: 'topLeft',
  双差: 'bottomLeft',
  好差: 'bottomRight',
};

/** 该语义坐标对应 id 的配色（与报告页徽章、象限图保持一致） */
export const QUADRANT_COLOR: Record<QuadrantType, string> = {
  optimal: 'bg-green-100 border-green-300 text-green-800',
  strategy: 'bg-amber-100 border-amber-300 text-amber-800',
  passive: 'bg-stone-100 border-stone-300 text-stone-600',
  overwhelmed: 'bg-red-100 border-red-300 text-red-800',
};

/** 语义坐标 → 该位置应显示哪个 id 的文案 */
export function quadrantIdAt(coordinate: SemanticCoordinate): QuadrantType {
  return COORDINATE_QUADRANT[coordinate];
}

/**
 * 给定轴分数，判定语义坐标。
 * 阈值：> 3 为高（3 分本身算低）。
 * ⚠️ 阈值语义集中在这里，改阈值只改这一处。
 */
export function coordinateOf(axis1Score: number, axis2Score: number, threshold = 3): SemanticCoordinate {
  const h1 = axis1Score > threshold;
  const h2 = axis2Score > threshold;
  if (h1 && h2) return '高高';
  if (h1 && !h2) return '好差';
  if (!h1 && h2) return '差好';
  return '双差';
}

/**
 * 由维度的象限列表（id + name）算出「语义坐标 → 象限名」映射。
 *
 * 报告页的象限图需要知道：四个语义位置各显示哪条文案。
 * 关键：这里用 QUADRANT_COORDINATE（id → 语义）反查，
 * 因此象限约定一旦调整，文案会自动落到正确的语义格子里，前端不用改。
 */
export function quadrantNamesByCoordinate(
  quadrants: Array<{ id: string; name: string }>,
): Record<SemanticCoordinate, string> {
  const map: Record<SemanticCoordinate, string> = {
    高高: '', 好差: '', 差好: '', 双差: '',
  };
  for (const q of quadrants) {
    const coord = QUADRANT_COORDINATE[q.id as QuadrantType];
    if (coord) map[coord] = q.name;
  }
  return map;
}

/** 1-5 原始分 → 0-100 归一化（与 calculator.normalizeScore 一致） */
export function normalizeScore(raw: number): number {
  return ((raw - 1) / 4) * 100;
}
