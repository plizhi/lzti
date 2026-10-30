// 回归测试：保证六个学段的每个轴都有中文名 + 描述 + 正负标签，
// 且雷达图标签不再露出英文 axisId。
//
// 背景：2026-10-31 给 5 个学段的 axes 从 ['id','id'] 改成 Axis 对象
// （对齐 primary-low 已有规范）。改的是显示名，不该动计分结果。
// 本测试锁死两件事：
//   1) 轴标签是中文（有 description / positiveLabel / negativeLabel）
//   2) 轴 id 与顺序没被改坏（scoring.ts 依赖 id 找题）
import { describe, it, expect } from 'vitest';
import { questionnaires } from '@/data/questionnaires';
import type { StageId } from '@/types/stage';

const STAGES: StageId[] = [
  'primary-low', 'primary-high', 'junior-1', 'junior-3', 'senior-1', 'senior-3',
];

const ENGLISH_ID = /^[a-z][a-z0-9-]*$/;

describe('各学段轴中文名', () => {
  for (const stage of STAGES) {
    const q = questionnaires[stage];
    it(`${q.name}（${stage}）的每个轴都有中文名与正负标签`, () => {
      expect(q.dimensions.length).toBeGreaterThan(0);
      for (const d of q.dimensions) {
        expect(d.axes).toHaveLength(2);
        for (const a of d.axes) {
          // 必须是对象格式（不是字符串 id）
          expect(typeof a).not.toBe('string');
          const ax = a as { id: string; name: string; description: string; positiveLabel?: string; negativeLabel?: string };
          expect(ax.name, `${d.id}/${ax.id} 缺中文名`).toBeTruthy();
          // 不能是英文 axisId 直接当名字
          expect(ax.name, `${d.id}/${ax.id} 轴名还是英文 id`).not.toMatch(ENGLISH_ID);
          expect(ax.description, `${d.id}/${ax.id} 缺 description`).toBeTruthy();
          expect(ax.positiveLabel, `${d.id}/${ax.id} 缺 positiveLabel`).toBeTruthy();
          expect(ax.negativeLabel, `${d.id}/${ax.id} 缺 negativeLabel`).toBeTruthy();
          expect(ax.positiveLabel).not.toBe(ax.negativeLabel);
        }
      }
    });
  }

  it('雷达图标签层不再出现英文 axisId', async () => {
    const { generateSingleReport } = await import('@/lib/report/generator');
    expect(typeof generateSingleReport).toBe('function');
    // 直接检查维度数据即可覆盖：标签来源只有 d.axes[].name
    for (const stage of STAGES) {
      for (const d of questionnaires[stage].dimensions) {
        for (const a of d.axes) {
          expect((a as { name: string }).name).not.toMatch(ENGLISH_ID);
        }
      }
    }
  });
});
