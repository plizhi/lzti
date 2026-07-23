// 高三问卷数据（定稿版）

import type { Questionnaire, Question } from '@/types/questionnaire';

export const decisionClarityDimension = {
  id: 'decision-clarity',
  name: '决策清晰度',
  description: '在高考这个明确的节点上，能不能做出自己的选择，这个选择是不是经过认真思考的',
  axes: ['choice-clarity', 'independent-decision'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '自主决策型', description: '方向清楚，选择来自自己。', guidance: '尊重孩子的选择，在需要时提供信息支持。' },
    { id: 'strategy', name: '清晰从众型', description: '有方向，但这个方向可能更多是跟着大家走或听父母的。', guidance: '温和地帮助孩子区分"是父母的愿望"还是"我真正想要的"。' },
    { id: 'passive', name: '独立探索型', description: '虽然还没完全想清楚，但在自己找答案。', guidance: '肯定探索的态度，同时帮助收集信息支持决策。' },
    { id: 'overwhelmed', name: '决策待成型', description: '既不太清楚方向，也还没有开始独立选择。', guidance: '不催促决策，先帮助处理焦虑，再逐步探索方向。' },
  ],
};

export const goalActionDimension = {
  id: 'goal-action',
  name: '目标行动力',
  description: '有没有明确的目标，正在为目标做具体的事情',
  axes: ['goal-specificity', 'action-consistency'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '知行合一型', description: '有明确目标，也在持续行动。', guidance: '帮助保持动力，在关键时刻给予鼓励。' },
    { id: 'strategy', name: '目标空悬型', description: '有明确目标，但行动上还没有跟上。', guidance: '帮助拆解目标为最小行动步骤，从第一步开始。' },
    { id: 'passive', name: '务实行动型', description: '虽然目标还没完全清晰，但在努力往前走。', guidance: '肯定行动的态度，在行动中逐步澄清目标。' },
    { id: 'overwhelmed', name: '动力待启型', description: '目标不够清晰，也还没有找到持续行动的节奏。', guidance: '从最小行动开始，在行动中逐步建立目标和动力。' },
  ],
};

export const pressureResilienceDimension = {
  id: 'pressure-resilience',
  name: '压力韧性',
  description: '在高考的持续高压下，能不能调节自己的情绪，能不能保持基本的复习节奏',
  axes: ['emotion-regulation', 'action-maintenance'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '韧性稳定型', description: '能调节情绪，也能保持行动。', guidance: '保持现状，避免过度施压。' },
    { id: 'strategy', name: '调节未行型', description: '能调节情绪，但行动节奏容易被压力打乱。', guidance: '帮助建立"行动优先"的习惯，用行动带动情绪。' },
    { id: 'passive', name: '硬撑维持型', description: '不太会调节情绪，但凭意志力撑着维持行动。', guidance: '肯定坚持的同时，引入简单的情绪调节技巧。' },
    { id: 'overwhelmed', name: '压力超载型', description: '既不太会调节情绪，行动也容易被压力打乱。', guidance: '必要时寻求专业心理支持，家长先学习如何陪伴。' },
  ],
};

export const relationshipAutonomyDimension = {
  id: 'relationship-autonomy',
  name: '关系自主',
  description: '在志愿选择、未来规划等重要问题上，能不能和父母顺畅沟通，同时保持独立判断',
  axes: ['communication-quality', 'independent-boundary'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '协商自主型', description: '能和父母顺畅沟通，同时保持独立判断。', guidance: '保持现状，尊重孩子的成长。' },
    { id: 'strategy', name: '和谐依赖型', description: '沟通顺畅，但容易过度依赖父母意见。', guidance: '温和地鼓励独立思考，肯定其想法的价值。' },
    { id: 'passive', name: '独立疏离型', description: '有自己的想法和边界，但不太能和父母沟通。', guidance: '创造平等的沟通机会，不强迫但持续关心。' },
    { id: 'overwhelmed', name: '冲突依赖型', description: '既容易产生冲突，又容易在冲突中失去自己的判断。', guidance: '帮助建立健康的沟通边界和决策流程。' },
  ],
};

export const senior3Dimensions = [
  decisionClarityDimension,
  goalActionDimension,
  pressureResilienceDimension,
  relationshipAutonomyDimension,
];

// ========== 学生卷（12题）==========

export const senior3StudentQuestions: Question[] = [
  // 决策清晰度 1-3
  { id: 's3-stu-dc-1', dimensionId: 'decision-clarity', axisId: 'choice-clarity', text: '对于以后想走的方向，我心里大概有数了。', reverse: false },
  { id: 's3-stu-dc-2', dimensionId: 'decision-clarity', axisId: 'independent-decision', text: '我的选择，是我自己认真想过的，不只是听别人说的。', reverse: false },
  { id: 's3-stu-dc-3', dimensionId: 'decision-clarity', axisId: 'choice-clarity', text: '有些事我还在想，还没完全想清楚，这也很正常。', reverse: false },

  // 目标行动力 4-6
  { id: 's3-stu-ga-1', dimensionId: 'goal-action', axisId: 'goal-specificity', text: '我心里有个大致的目标，知道自己想达到什么水平。', reverse: false },
  { id: 's3-stu-ga-2', dimensionId: 'goal-action', axisId: 'action-consistency', text: '我每天在做的事情，和我心里想达到的目标，方向是一致的。', reverse: false },
  { id: 's3-stu-ga-3', dimensionId: 'goal-action', axisId: 'action-consistency', text: '有些想法我还没开始做，但我在慢慢往前推。', reverse: false },

  // 压力韧性 7-9
  { id: 's3-stu-pr-1', dimensionId: 'pressure-resilience', axisId: 'emotion-regulation', text: '压力大的时候，我知道怎么让自己好受一点。', reverse: false },
  { id: 's3-stu-pr-2', dimensionId: 'pressure-resilience', axisId: 'action-maintenance', text: '即使最近很累、压力很大，我还是能按部就班地复习。', reverse: false },
  { id: 's3-stu-pr-3', dimensionId: 'pressure-resilience', axisId: 'emotion-regulation', text: '我有自己的方式放松一下，比如运动、听歌、找人聊聊。', reverse: false },

  // 关系自主 10-12
  { id: 's3-stu-ra-1', dimensionId: 'relationship-autonomy', axisId: 'communication-quality', text: '关于以后的事，我和父母能好好聊，不是一聊就吵。', reverse: false },
  { id: 's3-stu-ra-2', dimensionId: 'relationship-autonomy', axisId: 'independent-boundary', text: '我的选择，父母会听听我的想法，不是直接替我做决定。', reverse: false },
  { id: 's3-stu-ra-3', dimensionId: 'relationship-autonomy', axisId: 'independent-boundary', text: '不管以后怎么选，我知道这是我自己的路，我会为它负责。', reverse: false },
];

// ========== 家长卷（12题）==========

export const senior3ParentQuestions: Question[] = [
  // 决策清晰度 1-3
  { id: 's3-par-dc-1', dimensionId: 'decision-clarity', axisId: 'choice-clarity', text: '孩子和我聊过，他以后大概想往哪个方向走。', reverse: false },
  { id: 's3-par-dc-2', dimensionId: 'decision-clarity', axisId: 'independent-decision', text: '孩子在做重要决定时，能说出自己是怎么想的。', reverse: false },
  { id: 's3-par-dc-3', dimensionId: 'decision-clarity', axisId: 'choice-clarity', text: '有些事情孩子还在考虑中，我能接受他暂时还没想清楚。', reverse: false },

  // 目标行动力 4-6
  { id: 's3-par-ga-1', dimensionId: 'goal-action', axisId: 'goal-specificity', text: '孩子能说出自己大概想达到什么目标。', reverse: false },
  { id: 's3-par-ga-2', dimensionId: 'goal-action', axisId: 'action-consistency', text: '孩子在学习上的行动，和他自己说的目标方向一致。', reverse: false },
  { id: 's3-par-ga-3', dimensionId: 'goal-action', axisId: 'action-consistency', text: '孩子有想法的时候，会试着做起来，不只是停留在想。', reverse: false },

  // 压力韧性 7-9
  { id: 's3-par-pr-1', dimensionId: 'pressure-resilience', axisId: 'action-maintenance', text: '即使最近压力很大，孩子每天还是能按部就班地复习。', reverse: false },
  { id: 's3-par-pr-2', dimensionId: 'pressure-resilience', axisId: 'emotion-regulation', text: '孩子心情不好的时候，过不了多久就能缓过来。', reverse: false },
  { id: 's3-par-pr-3', dimensionId: 'pressure-resilience', axisId: 'emotion-regulation', text: '孩子有自己放松的方式，比如运动、听歌或者找人聊聊。', reverse: false },

  // 关系自主 10-12
  { id: 's3-par-ra-1', dimensionId: 'relationship-autonomy', axisId: 'communication-quality', text: '关于孩子以后的事，我们能好好聊，不是一聊就吵。', reverse: false },
  { id: 's3-par-ra-2', dimensionId: 'relationship-autonomy', axisId: 'independent-boundary', text: '孩子在做重要决定时，会参考我的意见，但最终是他自己拿主意。', reverse: false },
  { id: 's3-par-ra-3', dimensionId: 'relationship-autonomy', axisId: 'independent-boundary', text: '即使孩子的选择和我想的不一样，我也愿意尊重他。', reverse: false },
];

// ========== 教师卷（12题）==========

export const senior3TeacherQuestions: Question[] = [
  // 决策清晰度 1-3
  { id: 's3-tea-dc-1', dimensionId: 'decision-clarity', axisId: 'choice-clarity', text: '该生对自己的未来方向有比较清晰的想法。', reverse: false },
  { id: 's3-tea-dc-2', dimensionId: 'decision-clarity', axisId: 'independent-decision', text: '该生在做选择时，能说出自己的理由，不是完全随大流。', reverse: false },
  { id: 's3-tea-dc-3', dimensionId: 'decision-clarity', axisId: 'choice-clarity', text: '该生面对不确定性时，不会因此焦虑或放弃思考。', reverse: false },

  // 目标行动力 4-6
  { id: 's3-tea-ga-1', dimensionId: 'goal-action', axisId: 'goal-specificity', text: '该生有比较明确的学习目标，不只是"想考好"。', reverse: false },
  { id: 's3-tea-ga-2', dimensionId: 'goal-action', axisId: 'action-consistency', text: '该生的学习投入和他自己的目标方向一致。', reverse: false },
  { id: 's3-tea-ga-3', dimensionId: 'goal-action', axisId: 'action-consistency', text: '该生有想法时，能开始行动，不是一直停留在设想阶段。', reverse: false },

  // 压力韧性 7-9
  { id: 's3-tea-pr-1', dimensionId: 'pressure-resilience', axisId: 'action-maintenance', text: '即使在高压阶段，该生仍能保持基本的学习投入。', reverse: false },
  { id: 's3-tea-pr-2', dimensionId: 'pressure-resilience', axisId: 'emotion-regulation', text: '该生遇到挫折后，能较快调整回学习状态。', reverse: false },
  { id: 's3-tea-pr-3', dimensionId: 'pressure-resilience', axisId: 'emotion-regulation', text: '该生有健康的方式调节情绪，不影响正常学习节奏。', reverse: false },

  // 关系自主 10-12
  { id: 's3-tea-ra-1', dimensionId: 'relationship-autonomy', axisId: 'communication-quality', text: '该生在涉及未来选择的问题上，有自己的想法，也能和家长沟通。', reverse: false },
  { id: 's3-tea-ra-2', dimensionId: 'relationship-autonomy', axisId: 'independent-boundary', text: '该生在做重要决定时，能综合考虑自己和家人的意见。', reverse: false },
  { id: 's3-tea-ra-3', dimensionId: 'relationship-autonomy', axisId: 'independent-boundary', text: '该生对重要选择有自己的主见，不是完全听从他人安排。', reverse: false },
];

export const senior3Questionnaire: Questionnaire = {
  id: 'senior-3',
  stageId: 'senior-3',
  name: '高三',
  dimensions: senior3Dimensions,
  studentQuestions: senior3StudentQuestions,
  parentQuestions: senior3ParentQuestions,
  teacherQuestions: senior3TeacherQuestions,
};
