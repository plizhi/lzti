// 不变式测试：scoring.ts 的 axes 顺序必须与 questionnaire.ts 声明的 axes 顺序一致
//
// 背景（2026-10-31）：
//   计分器把 scoringConfig.axes 数组的**第一项当纵轴、第二项当横轴**
//   （calculator.ts calculateAllDimensionScores）。
//   而象限文案的语义是按 questionnaire.ts 声明的 axes 顺序写的。
//   两者不一致 → 该维度在这个卷上纵横轴整体颠倒，报告会贴错象限。
//
//   实测曾有 4 处不一致：
//     senior-1 支持连接（家长卷、教师卷）
//     senior-3 压力韧性（家长卷、教师卷）
//   2026-10-31 已修正。本测试锁死这个不变式，防止以后再被改坏。
//
//   只校验**顺序**，不校验题目归属（题目归属是另一件事，另行检查）。
import { describe, it, expect } from 'vitest';
import { questionnaires } from '@/data/questionnaires';
import {
  senior1StudentScoring, senior1ParentScoring, senior1TeacherScoring,
} from '@/data/questionnaires/senior-1/scoring';
import {
  senior3StudentScoring, senior3ParentScoring, senior3TeacherScoring,
} from '@/data/questionnaires/senior-3/scoring';
import {
  junior3StudentScoring, junior3ParentScoring, junior3TeacherScoring,
} from '@/data/questionnaires/junior-3/scoring';
import {
  middleSchoolStudentScoring, middleSchoolParentScoring, middleSchoolTeacherScoring,
} from '@/data/questionnaires/middle-school/scoring';
import {
  primaryHighStudentScoring, primaryHighParentScoring, primaryHighTeacherScoring,
} from '@/data/questionnaires/primary-high/scoring';
import {
  primaryLowStudentScoring, primaryLowParentScoring, primaryLowTeacherScoring,
} from '@/data/questionnaires/primary-low/scoring';
import type { StageId } from '@/types/stage';
import type { ScoringConfig } from '@/types/questionnaire';

const CONFIGS: Record<StageId, Record<string, ScoringConfig>> = {
  'primary-low': {
    student: primaryLowStudentScoring, parent: primaryLowParentScoring, teacher: primaryLowTeacherScoring,
  },
  'primary-high': {
    student: primaryHighStudentScoring, parent: primaryHighParentScoring, teacher: primaryHighTeacherScoring,
  },
  'junior-1': {
    student: middleSchoolStudentScoring, parent: middleSchoolParentScoring, teacher: middleSchoolTeacherScoring,
  },
  'junior-3': {
    student: junior3StudentScoring, parent: junior3ParentScoring, teacher: junior3TeacherScoring,
  },
  'senior-1': {
    student: senior1StudentScoring, parent: senior1ParentScoring, teacher: senior1TeacherScoring,
  },
  'senior-3': {
    student: senior3StudentScoring, parent: senior3ParentScoring, teacher: senior3TeacherScoring,
  },
};

const STAGES: StageId[] = [
  'primary-low', 'primary-high', 'junior-1', 'junior-3', 'senior-1', 'senior-3',
];

describe('scoring 轴序与问卷声明一致', () => {
  for (const stage of STAGES) {
    const q = questionnaires[stage];
    const configs = CONFIGS[stage];

    // questionId → dimensionId（从问卷自带的题目数组建）
    const qDim = new Map<string, string>();
    for (const list of [q.studentQuestions, q.parentQuestions, q.teacherQuestions]) {
      for (const qq of list ?? []) qDim.set(qq.id, qq.dimensionId);
    }

    for (const [type, config] of Object.entries(configs)) {
      it(`${q.name}（${stage}）${type}卷：每个维度的轴序与问卷声明一致`, () => {
        // 按 dimensionId 把 config.axes 分组（保持数组内原有顺序）
        const byDim = new Map<string, string[]>();
        for (const ax of config.axes) {
          const first = ax.questionIds[0];
          expect(first, `${stage}/${type} 轴 ${ax.axisId} 没有题目`).toBeTruthy();
          const dimId = qDim.get(first);
          expect(dimId, `${stage}/${type} 题目 ${first} 在问卷里找不到所属维度`).toBeTruthy();
          if (!byDim.has(dimId!)) byDim.set(dimId!, []);
          byDim.get(dimId!)!.push(ax.axisId);
        }

        for (const dim of q.dimensions) {
          const declared = dim.axes.map((a) => (typeof a === 'string' ? a : a.id));
          const actual = byDim.get(dim.id);
          expect(actual, `${stage}/${type} 卷的计分配置缺少维度 ${dim.id}`).toBeTruthy();
          expect(
            actual,
            `${stage}/${type} 卷 ${dim.id} 的轴序与问卷声明不一致：\n` +
            `  问卷声明: ${declared.join(', ')}\n` +
            `  计分配置: ${actual!.join(', ')}\n` +
            `  → 纵横轴会整体颠倒，报告会贴错象限`,
          ).toEqual(declared);
        }
      });
    }
  }
});
