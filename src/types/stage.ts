// 学段类型定义

export type StageId =
  | 'primary-low'      // 小学低 1-2年级
  | 'primary-high'      // 小学高 3-6年级
  | 'junior-1'          // 初中非毕业 初一初二
  | 'junior-3'          // 初三
  | 'senior-1'          // 高一高二
  | 'senior-3';         // 高三

export interface Stage {
  id: StageId;
  name: string;
  gradeRange: string;
  coreAbility: string;
  dimensionCount: number;
  description: string;
}
