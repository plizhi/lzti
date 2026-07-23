// 初三（初三大）问卷数据

import type { Questionnaire, Question } from '@/types/questionnaire';

export const strategyIntegrationDimension = {
  id: 'strategy-integration',
  name: '策略整合',
  description: '在时间不够用的情况下，做出有效的取舍和安排',
  axes: ['self-rhythm', 'tradeoff-judgment'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '策略整合型', description: '既有自己的复习节奏，又会根据情况做取舍。复习效率最高的状态。', guidance: '提供挑战性任务，鼓励其分享复习策略，帮助其看到自己的优势。' },
    { id: 'strategy', name: '按部就班型', description: '有自己的节奏，但不善于区分轻重缓急。认真但效率有提升空间。', guidance: '肯定其稳定性，帮助其发现"哪些事可以少花时间"的空间。' },
    { id: 'passive', name: '重点突击型', description: '虽然平时跟着学校节奏走，但清楚自己该重点补什么。在薄弱环节有针对性。', guidance: '协助其制定更清晰的复习节奏，将"知道该补什么"转化为稳定的习惯。' },
    { id: 'overwhelmed', name: '被动应付型', description: '既缺乏自己的节奏，也不太会取舍。容易被作业和考试推着走。', guidance: '从"每天只规划一件事"开始，建立小的成功体验，逐步找回节奏感。' },
  ],
};

export const goalAnchorDimension = {
  id: 'goal-anchor',
  name: '目标锚定',
  description: '在长期高压的备考中，心里有没有一个方向在拉着往前走',
  axes: ['meaning-perception', 'self-confirmation'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '意义驱动型', description: '能从学习本身获得乐趣，也不会因为考试波动否定自己。目标感最稳定的状态。', guidance: '保护其内在动机，肯定其过程中的收获，不把成绩当作唯一衡量标准。' },
    { id: 'strategy', name: '兴趣脆弱型', description: '对学习本身有兴趣，但自我价值感不稳定。考砸后兴趣也可能跟着动摇。', guidance: '帮助建立"分数不等于价值"的认知，在考砸后刻意寻找其做得好的地方。' },
    { id: 'passive', name: '务实扛压型', description: '不太从学习中找乐趣，但也不会因为考砸就否定自己。靠责任感和稳定心态撑着。', guidance: '肯定其责任感和稳定性，同时帮助其发现学习中的意义感，让动力来源更丰富。' },
    { id: 'overwhelmed', name: '动力匮乏型', description: '既不觉得学习有意思，考砸了也容易否定自己。目标感和自我价值感都需要支持。', guidance: '先降低期待，从"完成一件事"而非"做好"开始，帮其积累"我能做到"的体验。' },
  ],
};

export const feedbackUtilizationDimension = {
  id: 'feedback-utilization',
  name: '反馈利用',
  description: '考完试之后，能不能从考试结果中提取有用的信息，指导下一步',
  axes: ['review-action', 'information-transformation'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '有效利用型', description: '既会认真复盘，也能从考试中拿到有用的信息指导下一步。反馈利用最成熟的状态。', guidance: '肯定其复盘习惯，鼓励其总结复盘方法，形成可迁移的策略。' },
    { id: 'strategy', name: '复盘未转化型', description: '会认真看卷子，但不太清楚接下来该重点补什么。缺的是从"知道错了"到"知道该做什么"。', guidance: '在复盘后追问"那你打算怎么补"，帮助其完成从"看到错"到"知道做"的转化。' },
    { id: 'passive', name: '直觉利用型', description: '虽然不太翻卷子，但大概知道自己的薄弱环节在哪。复盘习惯有提升空间。', guidance: '从"每次考试后只看一道错题"开始，逐步建立翻卷子的习惯。' },
    { id: 'overwhelmed', name: '反馈流失型', description: '考完就过去了，既不复盘，也不太清楚接下来该补什么。考试的信息价值流失较多。', guidance: '帮助建立"考后复盘"的仪式感，从最简单的问题开始："这次考试你印象最深的是什么？"' },
  ],
};

export const mentalStabilityDimension = {
  id: 'mental-stability',
  name: '心态稳定',
  description: '在排名波动、社会比较、家长期待的多重压力下，能不能保持心态的基本稳定',
  axes: ['emotion-recovery', 'support-connection'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '韧性充沛型', description: '既能自己较快恢复，也愿意在需要时找人聊聊。心态稳定的理想状态。', guidance: '保持现状，避免过度干预。可以鼓励其成为同伴的支持者。' },
    { id: 'strategy', name: '独立调节型', description: '自己能较快调整情绪，但不习惯找人倾诉。内在调节能力较强，外部支持连接可以加强。', guidance: '肯定其自我调节能力，同时创造"说说也没关系"的氛围，让其知道支持资源一直在。' },
    { id: 'passive', name: '连接支撑型', description: '虽然心情容易受影响，但愿意找人聊聊，通过外部支持帮助自己恢复。支持系统是重要资源。', guidance: '肯定其求助行为，保护其倾诉渠道的畅通，同时帮助其发展一些自我调节的方法。' },
    { id: 'overwhelmed', name: '高压积压型', description: '既不容易从负面情绪中恢复，又不太找人倾诉。压力容易在内部累积。是最需要关注的一类。', guidance: '不追问"你怎么了"，而是创造"我在"的陪伴感。帮其命名情绪，提供非语言的表达渠道（写、画、运动）。必要时寻求专业支持。' },
  ],
};

export const junior3Dimensions = [
  strategyIntegrationDimension,
  goalAnchorDimension,
  feedbackUtilizationDimension,
  mentalStabilityDimension,
];

export const junior3Questions: Question[] = [
  // ===== 策略整合（学生卷 C4-C6）=====
  // 纵轴：自我节奏感
  { id: 'j3-si-1', dimensionId: 'strategy-integration', axisId: 'self-rhythm', text: '我自己知道每天该先做什么、后做什么。', reverse: false },
  // 横轴：取舍判断力
  { id: 'j3-si-2', dimensionId: 'strategy-integration', axisId: 'tradeoff-judgment', text: '时间不够用的时候，我知道该先保什么、可以放什么。', reverse: false },
  { id: 'j3-si-3', dimensionId: 'strategy-integration', axisId: 'tradeoff-judgment', text: '我知道哪些科目该多花时间、哪些可以少花时间。', reverse: false },

  // ===== 目标锚定（学生卷 新1-新3）=====
  // 纵轴：意义感知
  { id: 'j3-ga-1', dimensionId: 'goal-anchor', axisId: 'meaning-perception', text: '除了考试，学习本身也有让我觉得有意思的地方。', reverse: false },
  // 横轴：自我确认
  { id: 'j3-ga-2', dimensionId: 'goal-anchor', axisId: 'self-confirmation', text: '考砸一次，不会让我觉得自己不行。', reverse: false },
  { id: 'j3-ga-3', dimensionId: 'goal-anchor', axisId: 'meaning-perception', text: '我心里有个大致的方向，知道自己在往哪里走。', reverse: false },

  // ===== 反馈利用（学生卷 C7-C9）=====
  // 纵轴：复盘行动
  { id: 'j3-fu-1', dimensionId: 'feedback-utilization', axisId: 'review-action', text: '考完试，我会翻卷子，看看自己哪里做得好、哪里扣了分。', reverse: false },
  // 横轴：信息转化
  { id: 'j3-fu-2', dimensionId: 'feedback-utilization', axisId: 'information-transformation', text: '考完试之后，我知道自己接下来该重点补什么。', reverse: false },
  { id: 'j3-fu-3', dimensionId: 'feedback-utilization', axisId: 'review-action', text: '我会把考试里错的地方，弄明白为什么会错。', reverse: false },

  // ===== 心态稳定（学生卷 C1-C3、C12）=====
  // 纵轴：情绪恢复
  { id: 'j3-ms-1', dimensionId: 'mental-stability', axisId: 'emotion-recovery', text: '最近压力挺大的，但我知道怎么让自己好受一点。', reverse: false },
  { id: 'j3-ms-2', dimensionId: 'mental-stability', axisId: 'emotion-recovery', text: '心情不好的时候，我有办法让自己慢慢缓过来。', reverse: false },
  { id: 'j3-ms-3', dimensionId: 'mental-stability', axisId: 'emotion-recovery', text: '即使最近很累，我还是能按部就班地复习。', reverse: false },
  // 横轴：支持连接
  { id: 'j3-ms-4', dimensionId: 'mental-stability', axisId: 'support-connection', text: '我有可以说心里话的人。', reverse: false },
];

// 家长卷（13题）
export const junior3ParentQuestions: Question[] = [
  // 策略整合 J4-J6
  { id: 'j3-p-si-1', dimensionId: 'strategy-integration', axisId: 'self-rhythm', text: '孩子知道自己每天该先做什么、后做什么，不用我帮他安排。', reverse: false },
  { id: 'j3-p-si-2', dimensionId: 'strategy-integration', axisId: 'tradeoff-judgment', text: '孩子知道哪些科目该多花时间、哪些可以少花时间。', reverse: false },
  { id: 'j3-p-si-3', dimensionId: 'strategy-integration', axisId: 'tradeoff-judgment', text: '孩子计划好的复习任务，大多数时候能按时完成。', reverse: false },

  // 目标锚定 新1-新3
  { id: 'j3-p-ga-1', dimensionId: 'goal-anchor', axisId: 'meaning-perception', text: '孩子能说出，除了考试以外，学习本身有哪些让他觉得有意思的地方。', reverse: false },
  { id: 'j3-p-ga-2', dimensionId: 'goal-anchor', axisId: 'self-confirmation', text: '孩子不会因为一次考砸就觉得自己不行。', reverse: false },
  { id: 'j3-p-ga-3', dimensionId: 'goal-anchor', axisId: 'meaning-perception', text: '孩子心里有个大致的方向，知道自己为什么在努力。', reverse: false },

  // 反馈利用 J7、J9
  { id: 'j3-p-fu-1', dimensionId: 'feedback-utilization', axisId: 'review-action', text: '孩子考完试，会自己翻卷子，看看哪里做得好、哪里扣了分。', reverse: false },
  { id: 'j3-p-fu-2', dimensionId: 'feedback-utilization', axisId: 'information-transformation', text: '考完试之后，孩子能说出自己接下来该重点补什么。', reverse: false },

  // 心态稳定 J1-J3、新4-新5
  { id: 'j3-p-ms-1', dimensionId: 'mental-stability', axisId: 'emotion-recovery', text: '即使最近压力很大，孩子每天还是能按部就班地复习。', reverse: false },
  { id: 'j3-p-ms-2', dimensionId: 'mental-stability', axisId: 'emotion-recovery', text: '孩子心情不好的时候，过不了多久就能缓过来。', reverse: false },
  { id: 'j3-p-ms-3', dimensionId: 'mental-stability', axisId: 'support-connection', text: '孩子心情不好的时候，会找我或找别人说说，不会全闷在心里。', reverse: false },
  { id: 'j3-p-ms-4', dimensionId: 'mental-stability', axisId: 'support-connection', text: '在家里，孩子愿意和我说说心里话。', reverse: false },
  { id: 'j3-p-ms-5', dimensionId: 'mental-stability', axisId: 'support-connection', text: '即使我着急他的成绩，我也不会让他觉得考不好就不被爱了。', reverse: false },
];

// 教师卷（11题）
export const junior3TeacherQuestions: Question[] = [
  // 策略整合 T4-T6
  { id: 'j3-t-si-1', dimensionId: 'strategy-integration', axisId: 'self-rhythm', text: '该生对自己的复习安排心中有数，不是完全跟着老师走。', reverse: false },
  { id: 'j3-t-si-2', dimensionId: 'strategy-integration', axisId: 'tradeoff-judgment', text: '该生在复习中，知道区分轻重缓急。', reverse: false },
  { id: 'j3-t-si-3', dimensionId: 'strategy-integration', axisId: 'tradeoff-judgment', text: '该生知道哪些学科该多花时间、哪些可以适当减少。', reverse: false },

  // 目标锚定 新1-新3
  { id: 'j3-t-ga-1', dimensionId: 'goal-anchor', axisId: 'meaning-perception', text: '该生对学习本身有一定的兴趣，不只是为了考试。', reverse: false },
  { id: 'j3-t-ga-2', dimensionId: 'goal-anchor', axisId: 'self-confirmation', text: '该生不会因为一次失败就全盘否定自己。', reverse: false },
  { id: 'j3-t-ga-3', dimensionId: 'goal-anchor', axisId: 'meaning-perception', text: '该生对自己的升学或未来方向有大致的概念。', reverse: false },

  // 反馈利用 T7、T9
  { id: 'j3-t-fu-1', dimensionId: 'feedback-utilization', axisId: 'review-action', text: '考试后，该生会主动翻看试卷，找出自己的失分点。', reverse: false },
  { id: 'j3-t-fu-2', dimensionId: 'feedback-utilization', axisId: 'information-transformation', text: '该生在考试后，能说出自己接下来需要加强的地方。', reverse: false },

  // 心态稳定 T1-T3
  { id: 'j3-t-ms-1', dimensionId: 'mental-stability', axisId: 'emotion-recovery', text: '即使最近学习压力很大，该生仍能保持基本的复习节奏。', reverse: false },
  { id: 'j3-t-ms-2', dimensionId: 'mental-stability', axisId: 'emotion-recovery', text: '该生遇到挫折后，能较快调整回学习状态。', reverse: false },
  { id: 'j3-t-ms-3', dimensionId: 'mental-stability', axisId: 'support-connection', text: '该生有心事时，会和老师或同学聊聊。', reverse: false },
];

export const junior3Questionnaire: Questionnaire = {
  id: 'junior-3',
  stageId: 'junior-3',
  name: '初三大（初三）',
  dimensions: junior3Dimensions,
  studentQuestions: junior3Questions,
  parentQuestions: junior3ParentQuestions,
  teacherQuestions: junior3TeacherQuestions,
};
