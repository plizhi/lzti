// 小学低年级（1-2年级）问卷数据

import type { Questionnaire, Question } from '@/types/questionnaire';

export const learningInterestDimension = {
  id: 'learning-interest',
  name: '学习兴趣',
  description: '对学习的好奇心和投入度',
  axes: ['curiosity', 'persistence'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '探索坚持型', description: '对学习有内在兴趣，遇到困难能持续投入。', guidance: '保护内在动机，提供适度挑战，避免外部奖励削弱自发兴趣。' },
    { id: 'strategy', name: '浅尝辄止型', description: '对新事物兴趣浓厚，但投入持续性不足。', guidance: '建立"完成体验"，将任务拆解为最小单元，反复体验"做完"的成就感。' },
    { id: 'passive', name: '被动游离型', description: '学习多依赖外部驱动，尚未建立学习动力。', guidance: '从已有兴趣领域切入，搭建与学习内容的连接，用小目标积累成功体验。' },
    { id: 'overwhelmed', name: '尽责完成型', description: '好奇心不突出，但能认真完成要求。', guidance: '肯定尽责品质，适当引导深度思考。' },
  ],
};

export const basicHabitsDimension = {
  id: 'basic-habits',
  name: '基础习惯',
  description: '学习行为的自动化程度和执行有序度',
  axes: ['automation', 'orderliness'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '习惯养成型', description: '学习行为已内化为稳定习惯，不需提醒且执行质量高。', guidance: '增加任务复杂度和自主决策空间，从"执行习惯"向"管理任务"过渡。' },
    { id: 'strategy', name: '需提醒但有序型', description: '需要外部提醒启动，但一旦开始便能高质量完成。', guidance: '用提前约定代替临时提醒，逐步将启动责任交还给孩子。' },
    { id: 'passive', name: '督促依赖型', description: '学习行为依赖外部持续推动，执行质量较低。', guidance: '降低期待，一次聚焦一个行为目标，区分"不愿意"和"能力不足"。' },
    { id: 'overwhelmed', name: '假性自动化型', description: '能主动启动，但执行过程草率、马虎。', guidance: '建立"完成标准"，引入自查环节，培养对质量的自我监控。' },
  ],
};

export const emotionalAdaptationDimension = {
  id: 'emotional-adaptation',
  name: '情绪适应',
  description: '情绪反应模式和调节能力',
  axes: ['emotion-occupancy', 'emotion-expression'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '通透调节型', description: '情绪反应直接但短暂，能表达也能翻篇。最健康的情绪模式。', guidance: '保护直接表达的意愿，逐步引导表达方式的合宜性。' },
    { id: 'strategy', name: '外显积压型', description: '情绪困扰持久，但不隐藏，反复诉说或寻求安慰。', guidance: '建立"翻篇"能力，通过情绪外化仪式帮其释放积压。' },
    { id: 'passive', name: '内敛稳定型', description: '情绪反应不明显，不主动表达内心感受，但学习不受影响。', guidance: '区分"天性平稳"还是"有感受但缺乏表达渠道"，定期创设轻松沟通时间。' },
    { id: 'overwhelmed', name: '沉默积压型', description: '情绪困扰持久但缺乏表达，情绪在内部累积。最需要主动关注。', guidance: '不追问"你怎么了"，帮其命名情绪，提供非语言表达渠道。' },
  ],
};

export const primaryLowDimensions = [
  learningInterestDimension,
  basicHabitsDimension,
  emotionalAdaptationDimension,
];

export const primaryLowQuestions: Question[] = [
  // 学习兴趣 - 好奇探索轴
  { id: 'li-1', dimensionId: 'learning-interest', axisId: 'curiosity', text: '遇到新知识时，我会主动想知道更多。', reverse: false },
  { id: 'li-2', dimensionId: 'learning-interest', axisId: 'curiosity', text: '我对课堂上没讲过的东西不感兴趣。', reverse: true },
  { id: 'li-3', dimensionId: 'learning-interest', axisId: 'curiosity', text: '我喜欢问"为什么"，想了解事物的原因。', reverse: false },
  // 学习兴趣 - 坚持完成轴
  { id: 'li-4', dimensionId: 'learning-interest', axisId: 'persistence', text: '做作业时，就算很难我也会坚持做完。', reverse: false },
  { id: 'li-5', dimensionId: 'learning-interest', axisId: 'persistence', text: '遇到困难的题目，我容易放弃。', reverse: true },
  { id: 'li-6', dimensionId: 'learning-interest', axisId: 'persistence', text: '我希望能快点做完作业去玩。', reverse: true },

  // 基础习惯 - 自动化轴
  { id: 'bh-1', dimensionId: 'basic-habits', axisId: 'automation', text: '放学后，我不需要提醒就知道该先写作业。', reverse: false },
  { id: 'bh-2', dimensionId: 'basic-habits', axisId: 'automation', text: '我需要爸爸妈妈催好几次才会去学习。', reverse: true },
  { id: 'bh-3', dimensionId: 'basic-habits', axisId: 'automation', text: '我经常忘记自己有什么作业要完成。', reverse: true },
  // 基础习惯 - 执行有序轴
  { id: 'bh-4', dimensionId: 'basic-habits', axisId: 'orderliness', text: '我做作业时很专心，不会走神。', reverse: false },
  { id: 'bh-5', dimensionId: 'basic-habits', axisId: 'orderliness', text: '我做作业时容易发呆或玩东西。', reverse: true },
  { id: 'bh-6', dimensionId: 'basic-habits', axisId: 'orderliness', text: '我写作业时会反复检查，确保没有错。', reverse: false },

  // 情绪适应 - 情绪占据度轴
  { id: 'ea-1', dimensionId: 'emotional-adaptation', axisId: 'emotion-occupancy', text: '如果被老师批评，我会难过很久。', reverse: true },
  { id: 'ea-2', dimensionId: 'emotional-adaptation', axisId: 'emotion-occupancy', text: '考试没考好，我会不开心但很快就好起来。', reverse: false },
  { id: 'ea-3', dimensionId: 'emotional-adaptation', axisId: 'emotion-occupancy', text: '我很容易因为小事心情不好。', reverse: true },
  // 情绪适应 - 情绪表达轴
  { id: 'ea-4', dimensionId: 'emotional-adaptation', axisId: 'emotion-expression', text: '我不喜欢说出自己的感受。', reverse: true },
  { id: 'ea-5', dimensionId: 'emotional-adaptation', axisId: 'emotion-expression', text: '我生气时会大声说出来。', reverse: false },
  { id: 'ea-6', dimensionId: 'emotional-adaptation', axisId: 'emotion-expression', text: '难过的时候，我会想办法让自己开心起来。', reverse: false },
];

// 家长卷（18题）
export const primaryLowParentQuestions: Question[] = [
  // 学习兴趣 - 好奇探索轴
  { id: 'pl-p-li-1', dimensionId: 'learning-interest', axisId: 'curiosity', text: '孩子遇到新事物时，会主动想了解更多。', reverse: false },
  { id: 'pl-p-li-2', dimensionId: 'learning-interest', axisId: 'curiosity', text: '孩子对课堂上没讲过的东西也感兴趣。', reverse: false },
  { id: 'pl-p-li-3', dimensionId: 'learning-interest', axisId: 'curiosity', text: '孩子喜欢问"为什么"，想了解事物的原因。', reverse: false },
  // 学习兴趣 - 坚持完成轴
  { id: 'pl-p-li-4', dimensionId: 'learning-interest', axisId: 'persistence', text: '孩子做作业时，就算很难也会坚持做完。', reverse: false },
  { id: 'pl-p-li-5', dimensionId: 'learning-interest', axisId: 'persistence', text: '孩子遇到困难的题目，容易放弃。', reverse: true },
  { id: 'pl-p-li-6', dimensionId: 'learning-interest', axisId: 'persistence', text: '孩子总想快点做完作业去玩。', reverse: true },

  // 基础习惯 - 自动化轴
  { id: 'pl-p-bh-1', dimensionId: 'basic-habits', axisId: 'automation', text: '放学后，孩子不需要提醒就知道该先写作业。', reverse: false },
  { id: 'pl-p-bh-2', dimensionId: 'basic-habits', axisId: 'automation', text: '孩子需要家长反复催促才会去学习。', reverse: true },
  { id: 'pl-p-bh-3', dimensionId: 'basic-habits', axisId: 'automation', text: '孩子经常忘记自己有什么作业要完成。', reverse: true },
  // 基础习惯 - 执行有序轴
  { id: 'pl-p-bh-4', dimensionId: 'basic-habits', axisId: 'orderliness', text: '孩子做作业时很专心，不会走神。', reverse: false },
  { id: 'pl-p-bh-5', dimensionId: 'basic-habits', axisId: 'orderliness', text: '孩子做作业时容易发呆或玩东西。', reverse: true },
  { id: 'pl-p-bh-6', dimensionId: 'basic-habits', axisId: 'orderliness', text: '孩子写作业时会反复检查，确保没有错。', reverse: false },

  // 情绪适应 - 情绪占据度轴
  { id: 'pl-p-ea-1', dimensionId: 'emotional-adaptation', axisId: 'emotion-occupancy', text: '孩子被老师批评后，会难过很久。', reverse: true },
  { id: 'pl-p-ea-2', dimensionId: 'emotional-adaptation', axisId: 'emotion-occupancy', text: '孩子考试没考好，不开心但很快就好起来。', reverse: false },
  { id: 'pl-p-ea-3', dimensionId: 'emotional-adaptation', axisId: 'emotion-occupancy', text: '孩子很容易因为小事心情不好。', reverse: true },
  // 情绪适应 - 情绪表达轴
  { id: 'pl-p-ea-4', dimensionId: 'emotional-adaptation', axisId: 'emotion-expression', text: '孩子不喜欢说出自己的感受。', reverse: true },
  { id: 'pl-p-ea-5', dimensionId: 'emotional-adaptation', axisId: 'emotion-expression', text: '孩子生气时会大声说出来。', reverse: false },
  { id: 'pl-p-ea-6', dimensionId: 'emotional-adaptation', axisId: 'emotion-expression', text: '孩子难过的时候，会想办法让自己开心起来。', reverse: false },
];

// 教师卷（18题）
export const primaryLowTeacherQuestions: Question[] = [
  // 学习兴趣 - 好奇探索轴
  { id: 'pl-t-li-1', dimensionId: 'learning-interest', axisId: 'curiosity', text: '该生遇到新事物时，会主动想了解更多。', reverse: false },
  { id: 'pl-t-li-2', dimensionId: 'learning-interest', axisId: 'curiosity', text: '该生对课堂上没讲过的东西也感兴趣。', reverse: false },
  { id: 'pl-t-li-3', dimensionId: 'learning-interest', axisId: 'curiosity', text: '该生喜欢问"为什么"。', reverse: false },
  // 学习兴趣 - 坚持完成轴
  { id: 'pl-t-li-4', dimensionId: 'learning-interest', axisId: 'persistence', text: '该生做作业时，就算很难也会坚持做完。', reverse: false },
  { id: 'pl-t-li-5', dimensionId: 'learning-interest', axisId: 'persistence', text: '该生遇到困难的题目，容易放弃。', reverse: true },
  { id: 'pl-t-li-6', dimensionId: 'learning-interest', axisId: 'persistence', text: '该生总想快点做完作业去玩。', reverse: true },

  // 基础习惯 - 自动化轴
  { id: 'pl-t-bh-1', dimensionId: 'basic-habits', axisId: 'automation', text: '该生不需要提醒就知道该先完成学习任务。', reverse: false },
  { id: 'pl-t-bh-2', dimensionId: 'basic-habits', axisId: 'automation', text: '该生需要反复催促才会开始学习。', reverse: true },
  { id: 'pl-t-bh-3', dimensionId: 'basic-habits', axisId: 'automation', text: '该生经常忘记学习任务。', reverse: true },
  // 基础习惯 - 执行有序轴
  { id: 'pl-t-bh-4', dimensionId: 'basic-habits', axisId: 'orderliness', text: '该生学习时很专心，不容易走神。', reverse: false },
  { id: 'pl-t-bh-5', dimensionId: 'basic-habits', axisId: 'orderliness', text: '该生学习时容易发呆或分心。', reverse: true },
  { id: 'pl-t-bh-6', dimensionId: 'basic-habits', axisId: 'orderliness', text: '该生会检查自己的作业是否有错。', reverse: false },

  // 情绪适应 - 情绪占据度轴
  { id: 'pl-t-ea-1', dimensionId: 'emotional-adaptation', axisId: 'emotion-occupancy', text: '该生被批评后，会难过很久。', reverse: true },
  { id: 'pl-t-ea-2', dimensionId: 'emotional-adaptation', axisId: 'emotion-occupancy', text: '该生考试没考好，不开心但很快就好起来。', reverse: false },
  { id: 'pl-t-ea-3', dimensionId: 'emotional-adaptation', axisId: 'emotion-occupancy', text: '该生很容易因为小事心情不好。', reverse: true },
  // 情绪适应 - 情绪表达轴
  { id: 'pl-t-ea-4', dimensionId: 'emotional-adaptation', axisId: 'emotion-expression', text: '该生不喜欢表达自己的感受。', reverse: true },
  { id: 'pl-t-ea-5', dimensionId: 'emotional-adaptation', axisId: 'emotion-expression', text: '该生生气时会表达出来。', reverse: false },
  { id: 'pl-t-ea-6', dimensionId: 'emotional-adaptation', axisId: 'emotion-expression', text: '该生难过的时候会自我调节。', reverse: false },
];

export const primaryLowQuestionnaire: Questionnaire = {
  id: 'primary-low',
  stageId: 'primary-low',
  name: '小学低年级（1-2年级）',
  dimensions: primaryLowDimensions,
  studentQuestions: primaryLowQuestions,
  parentQuestions: primaryLowParentQuestions,
  teacherQuestions: primaryLowTeacherQuestions,
};
