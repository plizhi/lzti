// 小学高年级（3-6年级）问卷数据

import type { Questionnaire, Question } from '@/types/questionnaire';

export const selfEfficacyDimension = {
  id: 'self-efficacy',
  name: '自我效能',
  description: '对学习能力的信念和努力的态度',
  axes: ['ability-belief', 'effort-belief'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '成长掌控型', description: '相信能力可成长，也相信努力有用。面对挑战主动投入。', guidance: '持续强化"努力+策略"的归因模式，在成功时引导其看到具体是哪个方法起了作用。' },
    { id: 'strategy', name: '勤能补拙型', description: '认为能力相对固定，但相信努力可以弥补。愿意下功夫。', guidance: '肯定勤奋品质，同时引导其发现努力之外策略的价值，逐步松动"只能靠拼命"的信念。' },
    { id: 'passive', name: '习得性无助型', description: '既认为能力固定，也不相信努力有用。最容易放弃努力。', guidance: '制造"被清晰归因为个人努力和策略"的小成功体验，任务要小到绝对能完成。' },
    { id: 'overwhelmed', name: '潜在自信型', description: '相信能力可成长，但对自身努力的效果存疑。', guidance: '帮助其发现自身已有的成功经验，建立"我也有进步过"的证据。' },
  ],
};

export const strategyCopingDimension = {
  id: 'strategy-coping',
  name: '策略应对',
  description: '遇到困难时的应对方式和策略灵活性',
  axes: ['coping-proactivity', 'method-flexibility'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '灵活应对型', description: '遇到困难主动想办法，且方法多样，会根据情况调整策略。', guidance: '帮助其总结和命名自己的策略，形成可迁移的"策略库"。' },
    { id: 'strategy', name: '苦撑型', description: '遇到困难不退缩，但方法单一。反复读、反复抄、死记硬背。', guidance: '在肯定坚持品质的同时，引入"策略菜单"，让其通过对比体验不同方法的效果。' },
    { id: 'passive', name: '退缩等待型', description: '遇到困难既不主动想办法，也缺乏有效方法。倾向于等待或放弃。', guidance: '从"愿意尝试"开始培养，先肯定其任何微小的主动行为，逐步引入简单的策略示范。' },
    { id: 'overwhelmed', name: '策略意识型', description: '知道遇到困难应该想办法，但实践中主动应对的行动力不足。', guidance: '在真实任务中搭建"从知道到做到"的桥梁，帮其将策略认知转化为行动。' },
  ],
};

export const selfNurturingDimension = {
  id: 'self-nurturing',
  name: '自我滋养',
  description: '从学习中获得情感满足的方式',
  axes: ['satisfaction-experience', 'attribution-confirmation'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '自我滋养型', description: '完成挑战后能获得充实的满足感，且主要来自内心确认。', guidance: '保护其内在动机的纯度，避免过度外部奖励侵蚀其内在满足感。' },
    { id: 'strategy', name: '外源满足型', description: '完成后的满足感较强，但主要依赖外部认可。', guidance: '在给予肯定的同时，逐步引导其关注自身感受，建立内在评价标准。' },
    { id: 'passive', name: '情感淡漠型', description: '完成任务后情感体验平淡，学习变成纯粹的任务完成。', guidance: '帮其重新连接学习与情感体验，从其有兴趣的领域切入，创造完整的学习体验。' },
    { id: 'overwhelmed', name: '内源确认型', description: '内心知道自己做到了，但情感层面的满足感不强烈。', guidance: '帮其将认知层面的确认与情感层面的满足连接起来，关注和放大微小的积极情感体验。' },
  ],
};

export const primaryHighDimensions = [
  selfEfficacyDimension,
  strategyCopingDimension,
  selfNurturingDimension,
];

export const primaryHighQuestions: Question[] = [
  // 自我效能 - 能力观轴
  { id: 'ph-se-1', dimensionId: 'self-efficacy', axisId: 'ability-belief', text: '我相信学习能力是可以不断提高的，不是一成不变的。', reverse: false },
  { id: 'ph-se-2', dimensionId: 'self-efficacy', axisId: 'ability-belief', text: '有些人天生就聪明，我怎么努力也赶不上他们。', reverse: true },
  { id: 'ph-se-3', dimensionId: 'self-efficacy', axisId: 'ability-belief', text: '遇到难题时，我觉得只要找到对的方法就能学会。', reverse: false },
  // 自我效能 - 努力信念轴
  { id: 'ph-se-4', dimensionId: 'self-efficacy', axisId: 'effort-belief', text: '只要我足够努力，大部分学习问题都能解决。', reverse: false },
  { id: 'ph-se-5', dimensionId: 'self-efficacy', axisId: 'effort-belief', text: '我努力了但成绩还是不好，说明努力没用。', reverse: true },
  { id: 'ph-se-6', dimensionId: 'self-efficacy', axisId: 'effort-belief', text: '我觉得学习方法比死记硬背更重要。', reverse: false },

  // 策略应对 - 应对主动性轴
  { id: 'ph-sc-1', dimensionId: 'strategy-coping', axisId: 'coping-proactivity', text: '遇到不会的题，我会先自己想一想，而不是直接问答案。', reverse: false },
  { id: 'ph-sc-2', dimensionId: 'strategy-coping', axisId: 'coping-proactivity', text: '作业遇到困难时，我通常等老师讲或者看答案。', reverse: true },
  { id: 'ph-sc-3', dimensionId: 'strategy-coping', axisId: 'coping-proactivity', text: '我会主动想办法解决学习中出现的问题。', reverse: false },
  // 策略应对 - 方法灵活性轴
  { id: 'ph-sc-4', dimensionId: 'strategy-coping', axisId: 'method-flexibility', text: '一道题解不出来时，我会尝试不同的方法。', reverse: false },
  { id: 'ph-sc-5', dimensionId: 'strategy-coping', axisId: 'method-flexibility', text: '我学习主要靠反复读和背，不太会其他方法。', reverse: true },
  { id: 'ph-sc-6', dimensionId: 'strategy-coping', axisId: 'method-flexibility', text: '我会根据不同的学科和内容调整学习方法。', reverse: false },

  // 自我滋养 - 满足体验轴
  { id: 'ph-sn-1', dimensionId: 'self-nurturing', axisId: 'satisfaction-experience', text: '靠自己解决了一个难题，我会觉得很开心。', reverse: false },
  { id: 'ph-sn-2', dimensionId: 'self-nurturing', axisId: 'satisfaction-experience', text: '作业做完了就做完了，没有什么特别的感觉。', reverse: true },
  { id: 'ph-sn-3', dimensionId: 'self-nurturing', axisId: 'satisfaction-experience', text: '考试取得好成绩时，我会为自己感到骄傲。', reverse: false },
  // 自我滋养 - 归属确认轴
  { id: 'ph-sn-4', dimensionId: 'self-nurturing', axisId: 'attribution-confirmation', text: '我做好一道题，主要是因为我自己想办法做到的。', reverse: false },
  { id: 'ph-sn-5', dimensionId: 'self-nurturing', axisId: 'attribution-confirmation', text: '我需要别人的表扬才能感到学习有成就感。', reverse: true },
  { id: 'ph-sn-6', dimensionId: 'self-nurturing', axisId: 'attribution-confirmation', text: '我觉得学习好是因为我自己努力和方法对，不只是运气好。', reverse: false },
];

// 家长卷（18题）
export const primaryHighParentQuestions: Question[] = [
  // 自我效能 - 能力观轴
  { id: 'ph-p-se-1', dimensionId: 'self-efficacy', axisId: 'ability-belief', text: '孩子相信学习能力是可以不断提高的。', reverse: false },
  { id: 'ph-p-se-2', dimensionId: 'self-efficacy', axisId: 'ability-belief', text: '孩子觉得有些人天生就聪明，自己怎么努力也赶不上。', reverse: true },
  { id: 'ph-p-se-3', dimensionId: 'self-efficacy', axisId: 'ability-belief', text: '孩子觉得遇到难题时，只要找到对的方法就能学会。', reverse: false },
  // 自我效能 - 努力信念轴
  { id: 'ph-p-se-4', dimensionId: 'self-efficacy', axisId: 'effort-belief', text: '孩子觉得只要足够努力，大部分学习问题都能解决。', reverse: false },
  { id: 'ph-p-se-5', dimensionId: 'self-efficacy', axisId: 'effort-belief', text: '孩子觉得努力了但成绩还是不好，说明努力没用。', reverse: true },
  { id: 'ph-p-se-6', dimensionId: 'self-efficacy', axisId: 'effort-belief', text: '孩子觉得学习方法比死记硬背更重要。', reverse: false },

  // 策略应对 - 应对主动性轴
  { id: 'ph-p-sc-1', dimensionId: 'strategy-coping', axisId: 'coping-proactivity', text: '孩子遇到不会的题，会先自己想一想，而不是直接问答案。', reverse: false },
  { id: 'ph-p-sc-2', dimensionId: 'strategy-coping', axisId: 'coping-proactivity', text: '作业遇到困难时，孩子通常等老师讲或者看答案。', reverse: true },
  { id: 'ph-p-sc-3', dimensionId: 'strategy-coping', axisId: 'coping-proactivity', text: '孩子会主动想办法解决学习中的问题。', reverse: false },
  // 策略应对 - 方法灵活性轴
  { id: 'ph-p-sc-4', dimensionId: 'strategy-coping', axisId: 'method-flexibility', text: '一道题解不出来时，孩子会尝试不同的方法。', reverse: false },
  { id: 'ph-p-sc-5', dimensionId: 'strategy-coping', axisId: 'method-flexibility', text: '孩子学习主要靠反复读和背，不太会其他方法。', reverse: true },
  { id: 'ph-p-sc-6', dimensionId: 'strategy-coping', axisId: 'method-flexibility', text: '孩子会根据不同的学科和内容调整学习方法。', reverse: false },

  // 自我滋养 - 满足体验轴
  { id: 'ph-p-sn-1', dimensionId: 'self-nurturing', axisId: 'satisfaction-experience', text: '孩子靠自己解决了一个难题，会觉得很开心。', reverse: false },
  { id: 'ph-p-sn-2', dimensionId: 'self-nurturing', axisId: 'satisfaction-experience', text: '孩子觉得作业做完了就做完了，没有什么特别的感觉。', reverse: true },
  { id: 'ph-p-sn-3', dimensionId: 'self-nurturing', axisId: 'satisfaction-experience', text: '孩子考试取得好成绩时，会为自己感到骄傲。', reverse: false },
  // 自我滋养 - 归属确认轴
  { id: 'ph-p-sn-4', dimensionId: 'self-nurturing', axisId: 'attribution-confirmation', text: '孩子觉得自己做好一道题主要是因为自己想办法做到的。', reverse: false },
  { id: 'ph-p-sn-5', dimensionId: 'self-nurturing', axisId: 'attribution-confirmation', text: '孩子需要别人的表扬才能感到学习有成就感。', reverse: true },
  { id: 'ph-p-sn-6', dimensionId: 'self-nurturing', axisId: 'attribution-confirmation', text: '孩子觉得学习好是因为自己努力和方法对，不只是运气好。', reverse: false },
];

// 教师卷（18题）
export const primaryHighTeacherQuestions: Question[] = [
  // 自我效能 - 能力观轴
  { id: 'ph-t-se-1', dimensionId: 'self-efficacy', axisId: 'ability-belief', text: '该生相信学习能力是可以不断提高的。', reverse: false },
  { id: 'ph-t-se-2', dimensionId: 'self-efficacy', axisId: 'ability-belief', text: '该生觉得有些人天生就聪明，自己怎么努力也赶不上。', reverse: true },
  { id: 'ph-t-se-3', dimensionId: 'self-efficacy', axisId: 'ability-belief', text: '该生觉得遇到难题时，只要找到对的方法就能学会。', reverse: false },
  // 自我效能 - 努力信念轴
  { id: 'ph-t-se-4', dimensionId: 'self-efficacy', axisId: 'effort-belief', text: '该生觉得只要足够努力，大部分学习问题都能解决。', reverse: false },
  { id: 'ph-t-se-5', dimensionId: 'self-efficacy', axisId: 'effort-belief', text: '该生觉得努力了但成绩还是不好，说明努力没用。', reverse: true },
  { id: 'ph-t-se-6', dimensionId: 'self-efficacy', axisId: 'effort-belief', text: '该生觉得学习方法比死记硬背更重要。', reverse: false },

  // 策略应对 - 应对主动性轴
  { id: 'ph-t-sc-1', dimensionId: 'strategy-coping', axisId: 'coping-proactivity', text: '该生遇到不会的题，会先自己想一想再问。', reverse: false },
  { id: 'ph-t-sc-2', dimensionId: 'strategy-coping', axisId: 'coping-proactivity', text: '该生作业遇到困难时，通常等老师讲或者看答案。', reverse: true },
  { id: 'ph-t-sc-3', dimensionId: 'strategy-coping', axisId: 'coping-proactivity', text: '该生会主动想办法解决学习中的问题。', reverse: false },
  // 策略应对 - 方法灵活性轴
  { id: 'ph-t-sc-4', dimensionId: 'strategy-coping', axisId: 'method-flexibility', text: '一道题解不出来时，该生会尝试不同的方法。', reverse: false },
  { id: 'ph-t-sc-5', dimensionId: 'strategy-coping', axisId: 'method-flexibility', text: '该生学习主要靠反复读和背，不太会其他方法。', reverse: true },
  { id: 'ph-t-sc-6', dimensionId: 'strategy-coping', axisId: 'method-flexibility', text: '该生会根据不同的学科和内容调整学习方法。', reverse: false },

  // 自我滋养 - 满足体验轴
  { id: 'ph-t-sn-1', dimensionId: 'self-nurturing', axisId: 'satisfaction-experience', text: '该生靠自己解决了一个难题，会觉得很开心。', reverse: false },
  { id: 'ph-t-sn-2', dimensionId: 'self-nurturing', axisId: 'satisfaction-experience', text: '该生觉得作业做完了就做完了，没有什么特别的感觉。', reverse: true },
  { id: 'ph-t-sn-3', dimensionId: 'self-nurturing', axisId: 'satisfaction-experience', text: '该生考试取得好成绩时，会为自己感到骄傲。', reverse: false },
  // 自我滋养 - 归属确认轴
  { id: 'ph-t-sn-4', dimensionId: 'self-nurturing', axisId: 'attribution-confirmation', text: '该生觉得自己做好一道题主要是因为自己想办法做到的。', reverse: false },
  { id: 'ph-t-sn-5', dimensionId: 'self-nurturing', axisId: 'attribution-confirmation', text: '该生需要别人的表扬才能感到学习有成就感。', reverse: true },
  { id: 'ph-t-sn-6', dimensionId: 'self-nurturing', axisId: 'attribution-confirmation', text: '该生觉得学习好是因为自己努力和方法对，不只是运气好。', reverse: false },
];

export const primaryHighQuestionnaire: Questionnaire = {
  id: 'primary-high',
  stageId: 'primary-high',
  name: '小学高年级（3-6年级）',
  dimensions: primaryHighDimensions,
  studentQuestions: primaryHighQuestions,
  parentQuestions: primaryHighParentQuestions,
  teacherQuestions: primaryHighTeacherQuestions,
};
