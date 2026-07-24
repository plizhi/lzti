// 小学低年级（1-2年级）问卷数据
// 参考规格书：六学段评估体系完整设计

import type { Questionnaire, Dimension, Question } from '@/types/questionnaire';

// ============================================================
// 维度定义（含完整干预建议）
// ============================================================

const learningInterestDimension: Dimension = {
  id: 'learning-interest',
  name: '学习兴趣',
  description: '对新知识的好奇心和投入度',
  axes: [
    {
      id: 'curiosity',
      name: '好奇探索',
      description: '对新事物的好奇心和对学习内容的探究欲',
      positiveLabel: '好奇心强',
      negativeLabel: '好奇心弱',
    },
    {
      id: 'persistence',
      name: '坚持完成',
      description: '遇到困难时能否持续投入直到完成',
      positiveLabel: '坚持完成高',
      negativeLabel: '坚持完成低',
    },
  ],
  quadrants: [
    {
      id: 'optimal',
      name: '探索坚持型',
      description: '对学习有内在兴趣，遇到困难能持续投入',
      guidance: '保护内在动机，不被外部奖励削弱。提供更多同类但略有挑战的材料，让他持续体验"我做到了"的满足感。',
      profile: '对学习有内在兴趣，遇到困难能持续投入',
      coreNeed: '保护内在动机，不被外部奖励削弱',
      parentAction: '不要在他已经感兴趣的事情上额外给奖励（"考好了给你买玩具"），这会把他原本的内在动机变成外部驱动。可以提供更多同类但略有挑战的材料，让他持续体验"我做到了"的满足感。',
    },
    {
      id: 'strategy',
      name: '浅尝辄止型',
      description: '兴趣来得快去得也快，一遇困难就想换',
      guidance: '帮他完成"从开始到结束"的闭环。把任务拆小，"今天只做这一页，做完就是胜利"。不要在他兴趣转移时批评"又三分钟热度"，而是在他坚持完成时重点肯定"你刚才一直做到了最后"。',
      profile: '兴趣来得快去得也快，一遇困难就想换',
      coreNeed: '体验"做完一件事"的完整感',
      parentAction: '不是打压他的好奇心，而是帮他完成"从开始到结束"的闭环。把任务拆小，"今天只做这一页，做完就是胜利"。不要在他兴趣转移时批评"又三分钟热度"，而是在他坚持完成时重点肯定"你刚才一直做到了最后"。浅尝辄止型和被动游离型的关键区别：前者有兴趣但缺乏坚持力，干预重点是降低任务难度、强化完成体验。',
    },
    {
      id: 'passive',
      name: '被动游离型',
      description: '学习像完成任务，缺乏内在动力',
      guidance: '不急着培养兴趣，先从"能做到"开始。找一个他已经能做好的事情，让他感受"我也可以做得不错"，再把这个信心慢慢迁移到学习中。同时从他已有的兴趣（哪怕是游戏、手工）中找到和学习内容的连接点。',
      profile: '学习像完成任务，缺乏内在动力',
      coreNeed: '先体验"我也可以"，再培养兴趣',
      parentAction: '不急着培养兴趣，先从"能做到"开始。找一个他已经能做好的事情（不限于学习），让他感受"我也可以做得不错"，再把这个信心慢慢迁移到学习中。同时从他已有的兴趣（哪怕是游戏、手工）中找到和学习内容的连接点。',
    },
    {
      id: 'overwhelmed',
      name: '尽责完成型',
      description: '不觉得有趣但能认真完成，可靠的执行者',
      guidance: '肯定他"认真完成"的品质，不因为他"不兴奋"就觉得他不够好。可以轻轻推一步："你完成了，有没有想过还有没有别的做法？"不要求他一定有兴趣，但可以让他偶尔体验到"换个思路也很有意思"。',
      profile: '不觉得有趣但能认真完成，可靠的执行者',
      coreNeed: '在完成的基础上打开一点好奇心',
      parentAction: '肯定他"认真完成"的品质，不因为他"不兴奋"就觉得他不够好。可以轻轻推一步："你完成了，有没有想过还有没有别的做法？"不要求他一定有兴趣，但可以让他偶尔体验到"换个思路也很有意思"。',
    },
  ],
};

const basicHabitsDimension: Dimension = {
  id: 'basic-habits',
  name: '基础习惯',
  description: '学习行为的自动化程度和执行有序度',
  axes: [
    {
      id: 'automation',
      name: '自动化程度',
      description: '学习行为是否无需提醒就能启动',
      positiveLabel: '自动化高',
      negativeLabel: '自动化低',
    },
    {
      id: 'orderliness',
      name: '执行有序度',
      description: '执行过程中的专注度和质量',
      positiveLabel: '执行有序高',
      negativeLabel: '执行有序低',
    },
  ],
  quadrants: [
    {
      id: 'optimal',
      name: '习惯养成型',
      description: '学习行为已内化为稳定习惯，不需提醒且执行质量高',
      guidance: '增加任务复杂度和自主决策空间，从"执行习惯"向"管理任务"过渡。',
      profile: '学习行为已内化为稳定习惯，不需提醒且执行质量高',
      coreNeed: '增加挑战和自主空间',
      parentAction: '增加任务复杂度和自主决策空间，从"执行习惯"向"管理任务"过渡。',
    },
    {
      id: 'strategy',
      name: '需提醒但有序型',
      description: '需要外部提醒启动，但一旦开始便能高质量完成',
      guidance: '用提前约定代替临时提醒，逐步将启动责任交还给孩子。',
      profile: '需要外部提醒启动，但一旦开始便能高质量完成',
      coreNeed: '将启动责任交还给孩子',
      parentAction: '用提前约定代替临时提醒，逐步将启动责任交还给孩子。',
    },
    {
      id: 'passive',
      name: '督促依赖型',
      description: '学习行为依赖外部持续推动，执行质量较低',
      guidance: '降低期待，一次聚焦一个行为目标，区分"不愿意"和"能力不足"。',
      profile: '学习行为依赖外部持续推动，执行质量较低',
      coreNeed: '降低期待，一次聚焦一个目标',
      parentAction: '降低期待，一次聚焦一个行为目标，区分"不愿意"和"能力不足"。',
    },
    {
      id: 'overwhelmed',
      name: '假性自动化型',
      description: '能主动启动，但执行过程草率、马虎',
      guidance: '建立"完成标准"，引入自查环节，培养对质量的自我监控。',
      profile: '能主动启动，但执行过程草率、马虎',
      coreNeed: '建立完成标准，培养质量意识',
      parentAction: '建立"完成标准"，引入自查环节，培养对质量的自我监控。',
    },
  ],
};

const emotionalAdaptationDimension: Dimension = {
  id: 'emotional-adaptation',
  name: '情绪适应',
  description: '情绪反应模式和调节能力',
  axes: [
    {
      id: 'emotion-occupancy',
      name: '情绪占据度',
      description: '情绪问题占用心理资源的程度',
      positiveLabel: '情绪占据度低',
      negativeLabel: '情绪占据度高',
    },
    {
      id: 'emotion-expression',
      name: '情绪表达度',
      description: '情绪是否被表达和释放',
      positiveLabel: '情绪表达高',
      negativeLabel: '情绪表达低',
    },
  ],
  quadrants: [
    {
      id: 'optimal',
      name: '通透调节型',
      description: '情绪反应直接但短暂，能表达也能翻篇。最健康的情绪模式。',
      guidance: '保护直接表达的意愿，逐步引导表达方式的合宜性。',
      profile: '情绪反应直接但短暂，能表达也能翻篇。最健康的情绪模式。',
      coreNeed: '保护直接表达的意愿',
      parentAction: '保护直接表达的意愿，逐步引导表达方式的合宜性。',
    },
    {
      id: 'strategy',
      name: '外显积压型',
      description: '情绪困扰持久，但不隐藏，反复诉说或寻求安慰',
      guidance: '建立"翻篇"能力，通过情绪外化仪式帮其释放积压。',
      profile: '情绪困扰持久，但不隐藏，反复诉说或寻求安慰',
      coreNeed: '建立"翻篇"能力',
      parentAction: '建立"翻篇"能力，通过情绪外化仪式帮其释放积压。',
    },
    {
      id: 'passive',
      name: '内敛稳定型',
      description: '情绪反应不明显，不主动表达内心感受，但学习不受影响',
      guidance: '区分"天性平稳"还是"有感受但缺乏表达渠道"，定期创设轻松沟通时间。',
      profile: '情绪反应不明显，不主动表达内心感受，但学习不受影响',
      coreNeed: '区分天性平稳还是缺乏表达渠道',
      parentAction: '区分"天性平稳"还是"有感受但缺乏表达渠道"，定期创设轻松沟通时间。',
    },
    {
      id: 'overwhelmed',
      name: '沉默积压型',
      description: '情绪困扰持久但缺乏表达，情绪在内部累积。最需要主动关注。',
      guidance: '不追问"你怎么了"，帮其命名情绪，提供非语言表达渠道。',
      profile: '情绪困扰持久但缺乏表达，情绪在内部累积。最需要主动关注。',
      coreNeed: '先建立安全的情绪表达渠道',
      parentAction: '不追问"你怎么了"，帮其命名情绪，提供非语言表达渠道。沉默积压型是最需要主动关注的一类。',
    },
  ],
};

const primaryLowDimensions: Dimension[] = [
  learningInterestDimension,
  basicHabitsDimension,
  emotionalAdaptationDimension,
];

// ============================================================
// 题目定义（学生卷 - 3点表情量表）
// 小学低年级学生卷使用3点表情量表：☹️=1分 😐=2分 😊=3分
// ============================================================

const primaryLowStudentQuestions: Question[] = [
  // 学习兴趣 - 好奇探索轴（纵轴）
  { id: 'li-1', dimensionId: 'learning-interest', axisId: 'curiosity', text: '学到新东西的时候，你喜欢问"为什么"吗？', reverse: false },
  { id: 'li-2', dimensionId: 'learning-interest', axisId: 'curiosity', text: '老师讲新知识的时候，你觉得有意思吗？', reverse: false },
  { id: 'li-3', dimensionId: 'learning-interest', axisId: 'curiosity', text: '遇到不会的题目，你还想再试试吗？', reverse: false },
  // 学习兴趣 - 坚持完成轴（横轴）
  { id: 'li-4', dimensionId: 'learning-interest', axisId: 'persistence', text: '做一件事的时候，你能从头做到尾吗？', reverse: false },
  { id: 'li-5', dimensionId: 'learning-interest', axisId: 'persistence', text: '遇到有点难的题，你会想自己先想一想，还是马上找大人帮忙？', reverse: false },
  { id: 'li-6', dimensionId: 'learning-interest', axisId: 'persistence', text: '一件事没做好，你还愿意再做一次吗？', reverse: false },

  // 基础习惯 - 自动化程度轴（纵轴）
  { id: 'bh-1', dimensionId: 'basic-habits', axisId: 'automation', text: '每天早上，你能自己想到要准备什么，不用妈妈提醒吗？', reverse: false },
  { id: 'bh-2', dimensionId: 'basic-habits', axisId: 'automation', text: '写作业之前，你会自己把铅笔、橡皮、本子都准备好吗？', reverse: false },
  { id: 'bh-3', dimensionId: 'basic-habits', axisId: 'automation', text: '到写作业的时间了，你能不用大人叫就自己开始吗？', reverse: false },
  // 基础习惯 - 执行有序度轴（横轴）
  { id: 'bh-4', dimensionId: 'basic-habits', axisId: 'orderliness', text: '写作业的时候，你能管住自己不走神、不玩东西吗？', reverse: false },
  { id: 'bh-5', dimensionId: 'basic-habits', axisId: 'orderliness', text: '写完作业，你会自己检查一遍吗？', reverse: false },
  { id: 'bh-6', dimensionId: 'basic-habits', axisId: 'orderliness', text: '你的书包和书桌，是自己收拾整齐的吗？', reverse: false },

  // 情绪适应 - 情绪占据度轴（纵轴，反向计分）
  { id: 'ea-1', dimensionId: 'emotional-adaptation', axisId: 'emotion-occupancy', text: '在学校被老师批评了，你会难过很久吗？', reverse: true },
  { id: 'ea-2', dimensionId: 'emotional-adaptation', axisId: 'emotion-occupancy', text: '和同学闹别扭了，这件事会影响你上课听讲吗？', reverse: true },
  { id: 'ea-3', dimensionId: 'emotional-adaptation', axisId: 'emotion-occupancy', text: '早上和爸爸妈妈分开的时候，你会一直想着这件事吗？', reverse: true },
  // 情绪适应 - 情绪表达度轴（横轴）
  { id: 'ea-4', dimensionId: 'emotional-adaptation', axisId: 'emotion-expression', text: '不开心的时候，你会跟爸爸妈妈或老师说吗？', reverse: false },
  { id: 'ea-5', dimensionId: 'emotional-adaptation', axisId: 'emotion-expression', text: '你心里有事的时候，会说出来还是憋在心里？', reverse: false },
  { id: 'ea-6', dimensionId: 'emotional-adaptation', axisId: 'emotion-expression', text: '难过了，你会用哭、说、或者画画来让自己好受一点吗？', reverse: false },
];

// ============================================================
// 题目定义（家长卷 - 5点量表）
// ============================================================

const primaryLowParentQuestions: Question[] = [
  // 学习兴趣 - 好奇探索轴
  { id: 'p-li-1', dimensionId: 'learning-interest', axisId: 'curiosity', text: '孩子回家后会主动说起学校里学到的或发生的新鲜事。', reverse: false },
  { id: 'p-li-2', dimensionId: 'learning-interest', axisId: 'curiosity', text: '孩子对周围的新事物、新知识表现出好奇心，喜欢问"为什么"。', reverse: false },
  { id: 'p-li-3', dimensionId: 'learning-interest', axisId: 'curiosity', text: '孩子在日常生活中会主动尝试或探索新东西。', reverse: false },
  // 学习兴趣 - 坚持完成轴
  { id: 'p-li-4', dimensionId: 'learning-interest', axisId: 'persistence', text: '遇到有点难的学习任务时，孩子能坚持尝试，不轻易放弃。', reverse: false },
  { id: 'p-li-5', dimensionId: 'learning-interest', axisId: 'persistence', text: '孩子能从头到尾完成一件学习任务，不半途而废。', reverse: false },
  { id: 'p-li-6', dimensionId: 'learning-interest', axisId: 'persistence', text: '一件事没做好时，孩子愿意再试一次。', reverse: false },

  // 基础习惯 - 自动化程度轴
  { id: 'p-bh-1', dimensionId: 'basic-habits', axisId: 'automation', text: '到了该学习的时间，孩子能主动开始，不需要我反复催促。', reverse: false },
  { id: 'p-bh-2', dimensionId: 'basic-habits', axisId: 'automation', text: '孩子能在提醒下或主动准备好学习用品。', reverse: false },
  { id: 'p-bh-3', dimensionId: 'basic-habits', axisId: 'automation', text: '每天的作业和书包整理，孩子大多能自己完成，不用我代劳。', reverse: false },
  // 基础习惯 - 执行有序度轴
  { id: 'p-bh-4', dimensionId: 'basic-habits', axisId: 'orderliness', text: '学习时，孩子能保持专注，不东张西望或玩东西。', reverse: false },
  { id: 'p-bh-5', dimensionId: 'basic-habits', axisId: 'orderliness', text: '孩子的课堂作业书写工整、卷面整洁，完成质量较好。', reverse: false },
  { id: 'p-bh-6', dimensionId: 'basic-habits', axisId: 'orderliness', text: '孩子完成学习任务后，会自己简单检查或整理好物品。', reverse: false },

  // 情绪适应 - 情绪占据度轴（反向计分）
  { id: 'p-ea-1', dimensionId: 'emotional-adaptation', axisId: 'emotion-occupancy', text: '孩子在学校遇到不开心的事后，回家情绪会明显低落很久。', reverse: true },
  { id: 'p-ea-2', dimensionId: 'emotional-adaptation', axisId: 'emotion-occupancy', text: '孩子因为一件小事，会反复想、反复念叨。', reverse: true },
  { id: 'p-ea-3', dimensionId: 'emotional-adaptation', axisId: 'emotion-occupancy', text: '早上的不开心或焦虑，会影响孩子一整天的状态。', reverse: true },
  // 情绪适应 - 情绪表达度轴
  { id: 'p-ea-4', dimensionId: 'emotional-adaptation', axisId: 'emotion-expression', text: '孩子不开心时，会主动用语言告诉我原因或感受。', reverse: false },
  { id: 'p-ea-5', dimensionId: 'emotional-adaptation', axisId: 'emotion-expression', text: '孩子心里有事时，愿意找家人说或寻求安慰。', reverse: false },
  { id: 'p-ea-6', dimensionId: 'emotional-adaptation', axisId: 'emotion-expression', text: '孩子会用哭、说、画画或其他方式把情绪表达出来，而不是闷着。', reverse: false },
];

// ============================================================
// 题目定义（教师卷 - 5点量表）
// ============================================================

const primaryLowTeacherQuestions: Question[] = [
  // 学习兴趣 - 好奇探索轴
  { id: 't-li-1', dimensionId: 'learning-interest', axisId: 'curiosity', text: '课堂上，该生对新内容表现出好奇心，积极参与课堂活动。', reverse: false },
  { id: 't-li-2', dimensionId: 'learning-interest', axisId: 'curiosity', text: '该生会主动举手提问或对所学内容表现出探索意愿。', reverse: false },
  { id: 't-li-3', dimensionId: 'learning-interest', axisId: 'curiosity', text: '该生对课堂学习内容表现出明显的兴趣和投入。', reverse: false },
  // 学习兴趣 - 坚持完成轴
  { id: 't-li-4', dimensionId: 'learning-interest', axisId: 'persistence', text: '遇到稍有难度的练习时，该生能坚持尝试，不轻易放弃。', reverse: false },
  { id: 't-li-5', dimensionId: 'learning-interest', axisId: 'persistence', text: '课堂任务或练习，该生能从头到尾完成，不半途而废。', reverse: false },
  { id: 't-li-6', dimensionId: 'learning-interest', axisId: 'persistence', text: '任务没完成或做错了，该生愿意再试一次。', reverse: false },

  // 基础习惯 - 自动化程度轴
  { id: 't-bh-1', dimensionId: 'basic-habits', axisId: 'automation', text: '该生能自觉遵守课堂规则，不需要老师反复提醒。', reverse: false },
  { id: 't-bh-2', dimensionId: 'basic-habits', axisId: 'automation', text: '该生能自己准备好学习用品，上课物品齐全、不遗漏。', reverse: false },
  { id: 't-bh-3', dimensionId: 'basic-habits', axisId: 'automation', text: '课堂学习环节转换时，该生能主动跟上，不需单独催促。', reverse: false },
  // 基础习惯 - 执行有序度轴
  { id: 't-bh-4', dimensionId: 'basic-habits', axisId: 'orderliness', text: '课堂听讲时，该生能保持专注，不走神、不做小动作。', reverse: false },
  { id: 't-bh-5', dimensionId: 'basic-habits', axisId: 'orderliness', text: '该生的课堂作业书写工整、卷面整洁，完成质量较好。', reverse: false },
  { id: 't-bh-6', dimensionId: 'basic-habits', axisId: 'orderliness', text: '该生的课桌、书本和学习用品整理得有条理。', reverse: false },

  // 情绪适应 - 情绪占据度轴（反向计分）
  { id: 't-ea-1', dimensionId: 'emotional-adaptation', axisId: 'emotion-occupancy', text: '被批评或遇到挫折后，该生会持续较长时间显得消沉或低落。', reverse: true },
  { id: 't-ea-2', dimensionId: 'emotional-adaptation', axisId: 'emotion-occupancy', text: '和同学发生小摩擦后，该生上课时仍明显受影响，注意力涣散。', reverse: true },
  { id: 't-ea-3', dimensionId: 'emotional-adaptation', axisId: 'emotion-occupancy', text: '早上的不开心或焦虑，会明显影响该生一整天的在校状态。', reverse: true },
  // 情绪适应 - 情绪表达度轴
  { id: 't-ea-4', dimensionId: 'emotional-adaptation', axisId: 'emotion-expression', text: '该生不开心或遇到困难时，会主动用语言告诉老师。', reverse: false },
  { id: 't-ea-5', dimensionId: 'emotional-adaptation', axisId: 'emotion-expression', text: '该生有情绪时，能通过适当的方式表达，而不是闷着或爆发。', reverse: false },
  { id: 't-ea-6', dimensionId: 'emotional-adaptation', axisId: 'emotion-expression', text: '该生在情绪不好时，能接受老师的关心或引导。', reverse: false },
];

// ============================================================
// 问卷导出
// ============================================================

export const primaryLowQuestionnaire: Questionnaire = {
  id: 'primary-low',
  stageId: 'primary-low',
  name: '小学低年级（1-2年级）',
  dimensions: primaryLowDimensions,
  studentQuestions: primaryLowStudentQuestions,
  parentQuestions: primaryLowParentQuestions,
  teacherQuestions: primaryLowTeacherQuestions,
};
