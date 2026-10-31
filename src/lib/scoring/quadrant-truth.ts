// 象限语义真值表（88 象限 · 全项目唯一真源）
//
// 背景（2026-10-31）：
//   各学段问卷的象限文案，是按「双低 = 最差 = overwhelmed」的直觉语义写的，
//   而计分器里的 id ↔ 语义坐标映射固定为另一套约定
//   （optimal=高高 / strategy=好差 / overwhelmed=差好 / passive=双差）。
//   两套约定冲突 → 22 个维度里有 17 个存在 id 与语义坐标错位，报告会给人贴错标签。
//
// 本文件是「每个维度的每条象限文案，到底描述哪个语义坐标」的唯一真源。
// 它由两份独立抄录 + 逐条读原文判读三方互校得出（见 docs/象限语义真值表.md）。
//
// 为什么放在生产代码而不是测试文件里：
//   1) 它要被回贴脚本（一次性数据迁移工具）消费 —— 测试文件不是数据源；
//   2) 原先两份「独立抄录」分散在两个测试文件里，字面量已经出现脏值
//      （'hhh'），只靠运行时补丁掩盖，静态解析必踩；
//   3) 改象限约定时要改两处 → 又一个漂移源。
//
// 每格的 rationale 记录判读依据：「文案描述的是轴1处于什么状态 + 轴2处于什么状态」。
//   规则：轴在高分时取 positiveLabel、低分时取 negativeLabel
//   （全部 44 个轴的 positiveLabel 都是「高分时的状态」，已逐一核过）
//   例（primary-low 情绪适应，轴1=情绪占据度 轴2=情绪表达度）：
//     通透调节型 → 情绪占据度低 + 情绪表达度高 = 高高
//     外显积压型 → 情绪占据度高 + 情绪表达度高 = 差好
//     内敛稳定型 → 情绪占据度低 + 情绪表达度低 = 好差
//     沉默积压型 → 情绪占据度高 + 情绪表达度低 = 双差
//
// 维护约定：
//   - 改任何一格，必须同时改 rationale，并写清改动原因（git 历史是唯一变更记录）；
//   - 每维度的四格必须恰好覆盖 四个语义坐标 各一次
//     （由 quadrant-semantics.test.ts 的结构断言守住，内容缺格会被当场拦下）。
import type { SemanticCoordinate } from './quadrant-geometry';

/** 象限 id（与 QuadrantType 一致，但本文件不依赖它，避免循环引用） */
export type TruthQuadrantId = 'optimal' | 'strategy' | 'passive' | 'overwhelmed';

/** 单个象限的语义真值 */
export interface QuadrantTruth {
  /** 该文案真正描述的语义坐标 */
  coordinate: SemanticCoordinate;
  /** 判读依据：文案描述的是 轴1什么状态 + 轴2什么状态 */
  rationale: string;
}

/** 维度 id → 四个象限 id → 语义真值 */
export const QUADRANT_TRUTH: Record<string, Record<TruthQuadrantId, QuadrantTruth>> = {
  // ---- 学业归因（轴1 努力可控感 / 轴2 归因灵活度）----
  'academic-attribution': {
    optimal: { coordinate: '高高', rationale: '努力可控 + 归因灵活' },
    strategy: { coordinate: '双差', rationale: '努力不可控 + 归因固化' },
    passive: { coordinate: '双差', rationale: '努力不可控 + 归因固化' },
    overwhelmed: { coordinate: '好差', rationale: '努力可控 + 归因固化' },
  },
  // ---- 学业策略（轴1 方法自觉 / 轴2 方法灵活度）----
  'academic-strategy': {
    optimal: { coordinate: '高高', rationale: '方法自成 + 能变通' },
    strategy: { coordinate: '好差', rationale: '方法自成 + 方法单一' },
    passive: { coordinate: '差好', rationale: '依赖跟随 + 能变通' },
    overwhelmed: { coordinate: '双差', rationale: '依赖跟随 + 方法单一' },
  },
  // ---- 基础习惯（轴1 自动化程度 / 轴2 执行有序度）----
  'basic-habits': {
    optimal: { coordinate: '高高', rationale: '自动化高 + 执行有序高' },
    strategy: { coordinate: '差好', rationale: '自动化低 + 执行有序高' },
    passive: { coordinate: '双差', rationale: '自动化低 + 执行有序低' },
    overwhelmed: { coordinate: '好差', rationale: '自动化高 + 执行有序低' },
  },
  // ---- 决策清晰度（轴1 方向清晰度 / 轴2 自主决策力）----
  'decision-clarity': {
    optimal: { coordinate: '高高', rationale: '方向清楚 + 自主判断' },
    strategy: { coordinate: '好差', rationale: '方向清楚 + 跟随他人' },
    passive: { coordinate: '差好', rationale: '方向未定 + 自主判断' },
    overwhelmed: { coordinate: '双差', rationale: '方向未定 + 跟随他人' },
  },
  // ---- 方向探索（轴1 方向觉察 / 轴2 探索行动）----
  'direction-exploration': {
    optimal: { coordinate: '高高', rationale: '方向初明 + 边试边找' },
    strategy: { coordinate: '好差', rationale: '方向初明 + 等待确定' },
    passive: { coordinate: '差好', rationale: '方向模糊 + 边试边找' },
    overwhelmed: { coordinate: '双差', rationale: '方向模糊 + 等待确定' },
  },
  // ---- 情绪适应（轴1 情绪占据度 / 轴2 情绪表达度）----
  'emotional-adaptation': {
    optimal: { coordinate: '高高', rationale: '情绪占据度低 + 情绪表达高' },
    strategy: { coordinate: '差好', rationale: '情绪占据度高 + 情绪表达高' },
    passive: { coordinate: '好差', rationale: '情绪占据度低 + 情绪表达低' },
    overwhelmed: { coordinate: '双差', rationale: '情绪占据度高 + 情绪表达低' },
  },
  // ---- 情绪韧性（轴1 情绪抗扰性 / 轴2 情绪调节力）----
  'emotional-resilience': {
    optimal: { coordinate: '高高', rationale: '不易受影响 + 调节有方' },
    strategy: { coordinate: '双差', rationale: '容易被影响 + 调节不足' },
    passive: { coordinate: '好差', rationale: '不易受影响 + 调节不足' },
    overwhelmed: { coordinate: '差好', rationale: '容易被影响 + 调节有方' },
  },
  // ---- 反馈利用（轴1 复盘行动 / 轴2 信息转化）----
  'feedback-utilization': {
    optimal: { coordinate: '高高', rationale: '主动复盘 + 转化为行动' },
    strategy: { coordinate: '好差', rationale: '主动复盘 + 信息流失' },
    passive: { coordinate: '差好', rationale: '考完就过 + 转化为行动' },
    overwhelmed: { coordinate: '双差', rationale: '考完就过 + 信息流失' },
  },
  // ---- 目标行动力（轴1 目标明确度 / 轴2 行动一致度）----
  'goal-action': {
    optimal: { coordinate: '高高', rationale: '目标具体 + 言行一致' },
    strategy: { coordinate: '好差', rationale: '目标具体 + 想法未落地' },
    passive: { coordinate: '差好', rationale: '目标笼统 + 言行一致' },
    overwhelmed: { coordinate: '双差', rationale: '目标笼统 + 想法未落地' },
  },
  // ---- 目标锚定（轴1 意义感知 / 轴2 自我确认）----
  'goal-anchor': {
    optimal: { coordinate: '高高', rationale: '目标感清晰 + 自我稳定' },
    strategy: { coordinate: '好差', rationale: '目标感清晰 + 容易否定自己' },
    passive: { coordinate: '差好', rationale: '目标感薄弱 + 自我稳定' },
    overwhelmed: { coordinate: '双差', rationale: '目标感薄弱 + 容易否定自己' },
  },
  // ---- 目标规划（轴1 目标清晰度 / 轴2 路径拆解力）----
  'goal-planning': {
    optimal: { coordinate: '高高', rationale: '目标明确 + 会拆解' },
    strategy: { coordinate: '好差', rationale: '目标明确 + 停在口号' },
    passive: { coordinate: '双差', rationale: '目标模糊 + 停在口号' },
    overwhelmed: { coordinate: '差好', rationale: '目标模糊 + 会拆解' },
  },
  // ---- 学习兴趣（轴1 好奇探索 / 轴2 坚持完成）----
  'learning-interest': {
    optimal: { coordinate: '高高', rationale: '好奇心强 + 坚持完成高' },
    strategy: { coordinate: '好差', rationale: '好奇心强 + 坚持完成低' },
    passive: { coordinate: '双差', rationale: '好奇心弱 + 坚持完成低' },
    overwhelmed: { coordinate: '差好', rationale: '好奇心弱 + 坚持完成高' },
  },
  // ---- 心态稳定（轴1 情绪恢复 / 轴2 支持连接）----
  'mental-stability': {
    optimal: { coordinate: '高高', rationale: '恢复得快 + 愿意连接' },
    strategy: { coordinate: '好差', rationale: '恢复得快 + 独自承担' },
    passive: { coordinate: '差好', rationale: '恢复得慢 + 愿意连接' },
    overwhelmed: { coordinate: '双差', rationale: '恢复得慢 + 独自承担' },
  },
  // ---- 多任务管理（轴1 任务条理 / 轴2 执行落实）----
  'multi-task-management': {
    optimal: { coordinate: '高高', rationale: '有条有理 + 执行到位' },
    strategy: { coordinate: '好差', rationale: '有条有理 + 计划落空' },
    passive: { coordinate: '双差', rationale: '杂乱无序 + 计划落空' },
    overwhelmed: { coordinate: '差好', rationale: '杂乱无序 + 执行到位' },
  },
  // ---- 压力韧性（轴1 情绪调节力 / 轴2 行动维持力）----
  'pressure-resilience': {
    optimal: { coordinate: '高高', rationale: '调节有方 + 高压下坚持' },
    strategy: { coordinate: '好差', rationale: '调节有方 + 压力下停滞' },
    passive: { coordinate: '差好', rationale: '调节不足 + 高压下坚持' },
    overwhelmed: { coordinate: '双差', rationale: '调节不足 + 压力下停滞' },
  },
  // ---- 关系自主（轴1 沟通质量 / 轴2 自主边界）----
  'relationship-autonomy': {
    optimal: { coordinate: '高高', rationale: '沟通顺畅 + 自主有主见' },
    strategy: { coordinate: '好差', rationale: '沟通顺畅 + 依赖家人' },
    passive: { coordinate: '差好', rationale: '沟通冲突 + 自主有主见' },
    overwhelmed: { coordinate: '双差', rationale: '沟通冲突 + 依赖家人' },
  },
  // ---- 自我认知（轴1 自我觉察 / 轴2 自我接纳）----
  'self-cognition': {
    optimal: { coordinate: '高高', rationale: '认知清晰 + 接纳自己' },
    strategy: { coordinate: '好差', rationale: '认知清晰 + 苛责自己' },
    passive: { coordinate: '差好', rationale: '认知模糊 + 接纳自己' },
    overwhelmed: { coordinate: '双差', rationale: '认知模糊 + 苛责自己' },
  },
  // ---- 自我效能（轴1 能力观 / 轴2 努力观）----
  'self-efficacy': {
    optimal: { coordinate: '高高', rationale: '能力可成长 + 努力有用' },
    strategy: { coordinate: '差好', rationale: '能力固定 + 努力有用' },
    passive: { coordinate: '双差', rationale: '能力固定 + 努力无用' },
    overwhelmed: { coordinate: '好差', rationale: '能力可成长 + 努力无用' },
  },
  // ---- 自我滋养（轴1 满足体验 / 轴2 成就归因）----
  'self-nurturing': {
    optimal: { coordinate: '高高', rationale: '有成就感 + 内源确认' },
    strategy: { coordinate: '好差', rationale: '有成就感 + 依赖外部' },
    passive: { coordinate: '双差', rationale: '情感平淡 + 依赖外部' },
    overwhelmed: { coordinate: '差好', rationale: '情感平淡 + 内源确认' },
  },
  // ---- 策略应对（轴1 应对主动性 / 轴2 方法灵活度）----
  'strategy-coping': {
    optimal: { coordinate: '高高', rationale: '主动应对 + 方法多样' },
    strategy: { coordinate: '好差', rationale: '主动应对 + 方法单一' },
    passive: { coordinate: '双差', rationale: '被动等待 + 方法单一' },
    overwhelmed: { coordinate: '差好', rationale: '被动等待 + 方法多样' },
  },
  // ---- 策略整合（轴1 自我节奏感 / 轴2 取舍判断力）----
  'strategy-integration': {
    optimal: { coordinate: '高高', rationale: '节奏自主 + 善于取舍' },
    strategy: { coordinate: '好差', rationale: '节奏自主 + 轻重不分' },
    passive: { coordinate: '差好', rationale: '依赖安排 + 善于取舍' },
    overwhelmed: { coordinate: '双差', rationale: '依赖安排 + 轻重不分' },
  },
  // ---- 支持连接（轴1 支持感知 / 轴2 主动连接）----
  'support-connection': {
    optimal: { coordinate: '高高', rationale: '感到被支持 + 主动求助' },
    strategy: { coordinate: '好差', rationale: '感到被支持 + 独自硬扛' },
    passive: { coordinate: '差好', rationale: '感觉孤立 + 主动求助' },
    overwhelmed: { coordinate: '双差', rationale: '感觉孤立 + 独自硬扛' },
  },
};

/** 全部四个语义坐标（结构断言用） */
export const ALL_COORDINATES: SemanticCoordinate[] = ['高高', '好差', '差好', '双差'];
