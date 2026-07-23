// 初中非毕业年级（初一、初二）问卷数据

import type { Questionnaire, Question } from '@/types/questionnaire';

export const multiTaskManagementDimension = {
  id: 'multi-task-management',
  name: '多任务管理',
  description: '任务条理性和执行能力',
  axes: ['organization', 'execution'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '统筹兼顾型', description: '有清晰的任务清单和优先级，并能高效执行。', guidance: '提高任务的挑战性，引入长期项目制管理，培养其带领他人的能力。' },
    { id: 'strategy', name: '纸上谈兵型', description: '能做出完美的计划表，但严重缺乏执行。', guidance: '做减法，从日计划缩到只规划接下来1小时，设置极小的启动目标。' },
    { id: 'passive', name: '随波逐流型', description: '既无计划，也难执行。被任务洪流裹挟。', guidance: '家长暂时充当"外部大脑"，从带着一起规划"就两件事"开始。' },
    { id: 'overwhelmed', name: '野蛮生长型', description: '非常有执行力，但毫无规划。靠"堆时间"硬扛。', guidance: '重点引导进行"复盘"，让他亲眼对比自己花了多少无用功。' },
  ],
};

export const goalPlanningDimension = {
  id: 'goal-planning',
  name: '目标规划',
  description: '目标清晰度和路径分解能力',
  axes: ['goal-clarity', 'path-decomposition'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '志存高远型', description: '有清晰远大的目标，并能一步步拆解为当下的行动计划。', guidance: '协助评估路径的合理性，关注过程中的心理调适。' },
    { id: 'strategy', name: '空想家型', description: '有美好向往的目标，但完全不知如何实现。', guidance: '帮助"画地图"，引入"以终为始"的倒推法，锁定第一个最小的突破口。' },
    { id: 'passive', name: '无舵之舟型', description: '既没有方向，也找不到路。自我同一性未建立。', guidance: '暂停催促，引入生涯探索，通过职业体验、人物访谈等方式找到意义感。' },
    { id: 'overwhelmed', name: '实干家型', description: '没有远大目标，但能把眼前任务执行得很好。', guidance: '引导将"把事做好"的习惯与对未来思考连接，找到成就感来源。' },
  ],
};

export const academicAttributionDimension = {
  id: 'academic-attribution',
  name: '学业归因',
  description: '对成败的解释方式',
  axes: ['controllability', 'flexibility'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '成长型思维', description: '把成功归因为努力和方法，失败归因为需要调整环节。', guidance: '持续强化过程，而非赞美"聪明"。' },
    { id: 'strategy', name: '自负型思维', description: '把成功归因于"聪明"，把失败归因于外部。', guidance: '赞美要具体指向"努力"而非"聪明"，用略有挑战的任务体验失败。' },
    { id: 'passive', name: '习得性无助', description: '将失败归于永久的不可控内部因素，将成功归于外界和运气。', guidance: '制造"可被明确归因为个人努力"的绝对能完成的小成功体验。' },
    { id: 'overwhelmed', name: '焦灼型思维', description: '把失败全部归因为"还不够努力"，陷入自责而忽略方法反思。', guidance: '建立"努力+策略"的双因素模型，帮其精细归因。' },
  ],
};

export const emotionalResilienceDimension = {
  id: 'emotional-resilience',
  name: '情绪韧性',
  description: '情绪敏感度和调节能力',
  axes: ['sensitivity', 'regulation'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '大心脏型', description: '心理承受能力强，不容易被小事扰动，能快速消化。', guidance: '教会共情，避免因过于钝感而无意中伤害敏感的同学。' },
    { id: 'strategy', name: '玻璃心型', description: '极其敏感，一次失利或一句评价就能让他们崩溃，且长时间难以平复。', guidance: '先进行情绪辅导，教他识别情绪、为情绪命名，通过安全方式外化。' },
    { id: 'passive', name: '雷打不动型', description: '对什么都满不在乎，用"隔离"防御了所有情绪。', guidance: '找到在学习之外真正在乎的事情，唤醒感受力。' },
    { id: 'overwhelmed', name: '敏感而坚韧', description: '有敏锐的感受力，能感知压力，但拥有强大的调节能力。', guidance: '鼓励分享调节经验，成为同伴的支持者。' },
  ],
};

export const middleSchoolDimensions = [
  multiTaskManagementDimension,
  goalPlanningDimension,
  academicAttributionDimension,
  emotionalResilienceDimension,
];

export const middleSchoolQuestions: Question[] = [
  // 多任务管理 - 条理性轴
  { id: 'ms-mt-1', dimensionId: 'multi-task-management', axisId: 'organization', text: '我清楚每天有哪些作业和任务要完成。', reverse: false },
  { id: 'ms-mt-2', dimensionId: 'multi-task-management', axisId: 'organization', text: '我会把今天的任务按重要程度排个先后顺序。', reverse: false },
  { id: 'ms-mt-3', dimensionId: 'multi-task-management', axisId: 'organization', text: '我的书包和书桌收拾得整整齐齐，找东西不费劲。', reverse: false },
  // 多任务管理 - 执行度轴
  { id: 'ms-mt-4', dimensionId: 'multi-task-management', axisId: 'execution', text: '我制定了学习计划后，通常能按计划执行到底。', reverse: false },
  { id: 'ms-mt-5', dimensionId: 'multi-task-management', axisId: 'execution', text: '开始学习时，我能很快进入状态，不用拖很久。', reverse: false },
  { id: 'ms-mt-6', dimensionId: 'multi-task-management', axisId: 'execution', text: '几门课的作业堆在一起时，我知道先做哪个后做哪个。', reverse: false },

  // 目标规划 - 目标清晰度轴
  { id: 'ms-gp-1', dimensionId: 'goal-planning', axisId: 'goal-clarity', text: '我心里有想考上的高中（或想达到的分数目标）。', reverse: false },
  { id: 'ms-gp-2', dimensionId: 'goal-planning', axisId: 'goal-clarity', text: '说起未来想做什么，我能说出一个大致的方向。', reverse: false },
  { id: 'ms-gp-3', dimensionId: 'goal-planning', axisId: 'goal-clarity', text: '我觉得现在努力学习，和未来的生活是有关系的。', reverse: false },
  // 目标规划 - 路径分解力轴
  { id: 'ms-gp-4', dimensionId: 'goal-planning', axisId: 'path-decomposition', text: '为了达到我的目标，我清楚自己现阶段最该补什么。', reverse: false },
  { id: 'ms-gp-5', dimensionId: 'goal-planning', axisId: 'path-decomposition', text: '我会把一个学期的目标，拆成每个月的小目标。', reverse: false },
  { id: 'ms-gp-6', dimensionId: 'goal-planning', axisId: 'path-decomposition', text: '我给自己定的小目标，大部分都能实现。', reverse: false },

  // 学业归因 - 可控性轴
  { id: 'ms-aa-1', dimensionId: 'academic-attribution', axisId: 'controllability', text: '考得好时，我觉得主要是因为自己这段时间够努力。', reverse: false },
  { id: 'ms-aa-2', dimensionId: 'academic-attribution', axisId: 'controllability', text: '考得不好时，我会想想是不是自己复习的方法有问题。', reverse: false },
  { id: 'ms-aa-3', dimensionId: 'academic-attribution', axisId: 'controllability', text: '某科成绩差，我认为只要找到对的方法，就能慢慢提上来。', reverse: false },
  // 学业归因 - 弹性轴
  { id: 'ms-aa-4', dimensionId: 'academic-attribution', axisId: 'flexibility', text: '一道题做错了，我会去想错在哪个步骤，而不是觉得自己笨。', reverse: false },
  { id: 'ms-aa-5', dimensionId: 'academic-attribution', axisId: 'flexibility', text: '一次没考好，不会影响我对自己的整体看法。', reverse: false },
  { id: 'ms-aa-6', dimensionId: 'academic-attribution', axisId: 'flexibility', text: '我相信学习能力是可以不断提高的，不是天生就定好的。', reverse: false },

  // 情绪韧性 - 敏感度轴（反向计分）
  { id: 'ms-er-1', dimensionId: 'emotional-resilience', axisId: 'sensitivity', text: '考试成绩不理想时，我会难过很久。', reverse: true },
  { id: 'ms-er-2', dimensionId: 'emotional-resilience', axisId: 'sensitivity', text: '别人一句关于我学习的评价，我会在心里反复想。', reverse: true },
  { id: 'ms-er-3', dimensionId: 'emotional-resilience', axisId: 'sensitivity', text: '和同学闹矛盾后，这件事会影响我上课听讲。', reverse: true },
  // 情绪韧性 - 调节力轴
  { id: 'ms-er-4', dimensionId: 'emotional-resilience', axisId: 'regulation', text: '感到压力大或烦躁时，我有办法让自己慢慢平静下来。', reverse: false },
  { id: 'ms-er-5', dimensionId: 'emotional-resilience', axisId: 'regulation', text: '情绪不好的时候，我照样能完成该做的学习任务。', reverse: false },
  { id: 'ms-er-6', dimensionId: 'emotional-resilience', axisId: 'regulation', text: '遇到挫折后，我通常一两天内就能调整回平常的状态。', reverse: false },
];

// 家长卷（24题）
export const middleSchoolParentQuestions: Question[] = [
  // 多任务管理 - 条理性轴
  { id: 'ms-p-mt-1', dimensionId: 'multi-task-management', axisId: 'organization', text: '孩子清楚每天回家后有哪些作业和任务，不用我反复告知。', reverse: false },
  { id: 'ms-p-mt-2', dimensionId: 'multi-task-management', axisId: 'organization', text: '孩子会自己把当天的学习任务排个先后顺序，而不是抓到什么做什么。', reverse: false },
  { id: 'ms-p-mt-3', dimensionId: 'multi-task-management', axisId: 'organization', text: '孩子的书桌、书包、学习资料整理得有条理，找东西不费劲。', reverse: false },
  // 多任务管理 - 执行度轴
  { id: 'ms-p-mt-4', dimensionId: 'multi-task-management', axisId: 'execution', text: '孩子制定了学习计划后，多数时候能按计划执行，不需要我反复催促。', reverse: false },
  { id: 'ms-p-mt-5', dimensionId: 'multi-task-management', axisId: 'execution', text: '到了该学习的时间，孩子能较快坐下来开始，不会拖拖拉拉很久。', reverse: false },
  { id: 'ms-p-mt-6', dimensionId: 'multi-task-management', axisId: 'execution', text: '几门功课的作业堆在一起时，孩子自己能理清先做什么后做什么。', reverse: false },

  // 目标规划 - 目标清晰度轴
  { id: 'ms-p-gp-1', dimensionId: 'goal-planning', axisId: 'goal-clarity', text: '孩子和我说起过自己心仪的高中，或大致想达到的成绩水平。', reverse: false },
  { id: 'ms-p-gp-2', dimensionId: 'goal-planning', axisId: 'goal-clarity', text: '孩子聊到未来时，能说出一个他感兴趣或想尝试的方向。', reverse: false },
  { id: 'ms-p-gp-3', dimensionId: 'goal-planning', axisId: 'goal-clarity', text: '孩子觉得现在的学习和他以后想过的生活是有关系的，不只是为父母学。', reverse: false },
  // 目标规划 - 路径分解力轴
  { id: 'ms-p-gp-4', dimensionId: 'goal-planning', axisId: 'path-decomposition', text: '为了达到目标，孩子知道自己现阶段最需要在哪方面下功夫。', reverse: false },
  { id: 'ms-p-gp-5', dimensionId: 'goal-planning', axisId: 'path-decomposition', text: '孩子会把一个大目标（如期末进步）拆成几个阶段来努力，不只是喊口号。', reverse: false },
  { id: 'ms-p-gp-6', dimensionId: 'goal-planning', axisId: 'path-decomposition', text: '孩子给自己定的小目标（比如这周搞定某个薄弱点），大多能按时完成。', reverse: false },

  // 学业归因 - 可控性轴
  { id: 'ms-p-aa-1', dimensionId: 'academic-attribution', axisId: 'controllability', text: '孩子考得好时，会把原因归结为自己这段时间够努力、方法用对了。', reverse: false },
  { id: 'ms-p-aa-2', dimensionId: 'academic-attribution', axisId: 'controllability', text: '孩子考得不好时，会反思是不是自己复习的方向或方法要调整。', reverse: false },
  { id: 'ms-p-aa-3', dimensionId: 'academic-attribution', axisId: 'controllability', text: '面对薄弱学科，孩子相信通过自己的努力和方法改进，能慢慢提高。', reverse: false },
  // 学业归因 - 弹性轴
  { id: 'ms-p-aa-4', dimensionId: 'academic-attribution', axisId: 'flexibility', text: '孩子做错题后，会主动去想错在哪一步，而不是简单归结为自己粗心或笨。', reverse: false },
  { id: 'ms-p-aa-5', dimensionId: 'academic-attribution', axisId: 'flexibility', text: '一次考试不理想，不会让孩子全盘否定自己这段时间的努力。', reverse: false },
  { id: 'ms-p-aa-6', dimensionId: 'academic-attribution', axisId: 'flexibility', text: '孩子认为学习能力是可以慢慢提高的，不是天生就定好的。', reverse: false },

  // 情绪韧性 - 敏感度轴（反向计分）
  { id: 'ms-p-er-1', dimensionId: 'emotional-resilience', axisId: 'sensitivity', text: '孩子因为考试或作业完成得不好，会明显情绪低落很久。', reverse: true },
  { id: 'ms-p-er-2', dimensionId: 'emotional-resilience', axisId: 'sensitivity', text: '孩子对家里人一句关于学习的评价或提醒，会特别在意，反复想。', reverse: true },
  { id: 'ms-p-er-3', dimensionId: 'emotional-resilience', axisId: 'sensitivity', text: '和同学或朋友发生不愉快后，这件事明显影响孩子在家学习的状态。', reverse: true },
  // 情绪韧性 - 调节力轴
  { id: 'ms-p-er-4', dimensionId: 'emotional-resilience', axisId: 'regulation', text: '孩子感到烦躁或压力大时，自己会想办法排解（听歌、运动、找我聊聊等）。', reverse: false },
  { id: 'ms-p-er-5', dimensionId: 'emotional-resilience', axisId: 'regulation', text: '情绪不太好的时候，孩子仍然能基本完成既定的学习任务。', reverse: false },
  { id: 'ms-p-er-6', dimensionId: 'emotional-resilience', axisId: 'regulation', text: '遇到学习上的挫折后，孩子通常一两天就能调整过来，恢复平时的状态。', reverse: false },
];

// 教师卷（24题）
export const middleSchoolTeacherQuestions: Question[] = [
  // 多任务管理 - 条理性轴
  { id: 'ms-t-mt-1', dimensionId: 'multi-task-management', axisId: 'organization', text: '该生清楚自己每天有哪些学习任务要完成。', reverse: false },
  { id: 'ms-t-mt-2', dimensionId: 'multi-task-management', axisId: 'organization', text: '该生会主动把学习任务按重要程度排序。', reverse: false },
  { id: 'ms-t-mt-3', dimensionId: 'multi-task-management', axisId: 'organization', text: '该生的课桌和学习资料整理得有条理。', reverse: false },
  // 多任务管理 - 执行度轴
  { id: 'ms-t-mt-4', dimensionId: 'multi-task-management', axisId: 'execution', text: '该生制定了学习计划后，多数时候能按计划执行。', reverse: false },
  { id: 'ms-t-mt-5', dimensionId: 'multi-task-management', axisId: 'execution', text: '该生进入学习状态较快，不需要反复催促。', reverse: false },
  { id: 'ms-t-mt-6', dimensionId: 'multi-task-management', axisId: 'execution', text: '面对多门功课的任务，该生能理清先后顺序。', reverse: false },

  // 目标规划 - 目标清晰度轴
  { id: 'ms-t-gp-1', dimensionId: 'goal-planning', axisId: 'goal-clarity', text: '该生有自己的学习目标或想达到的分数。', reverse: false },
  { id: 'ms-t-gp-2', dimensionId: 'goal-planning', axisId: 'goal-clarity', text: '该生对未来的方向有大致的想法。', reverse: false },
  { id: 'ms-t-gp-3', dimensionId: 'goal-planning', axisId: 'goal-clarity', text: '该生认为学习与未来生活是有关系的。', reverse: false },
  // 目标规划 - 路径分解力轴
  { id: 'ms-t-gp-4', dimensionId: 'goal-planning', axisId: 'path-decomposition', text: '该生知道自己现阶段最需要加强什么。', reverse: false },
  { id: 'ms-t-gp-5', dimensionId: 'goal-planning', axisId: 'path-decomposition', text: '该生能把大目标分解为阶段性小目标。', reverse: false },
  { id: 'ms-t-gp-6', dimensionId: 'goal-planning', axisId: 'path-decomposition', text: '该生给自己定的小目标大多能实现。', reverse: false },

  // 学业归因 - 可控性轴
  { id: 'ms-t-aa-1', dimensionId: 'academic-attribution', axisId: 'controllability', text: '该生考好后归因于自己的努力和方法。', reverse: false },
  { id: 'ms-t-aa-2', dimensionId: 'academic-attribution', axisId: 'controllability', text: '该生考不好时会反思方法是否需要调整。', reverse: false },
  { id: 'ms-t-aa-3', dimensionId: 'academic-attribution', axisId: 'controllability', text: '该生相信薄弱学科通过努力可以提高。', reverse: false },
  // 学业归因 - 弹性轴
  { id: 'ms-t-aa-4', dimensionId: 'academic-attribution', axisId: 'flexibility', text: '该生错题后会分析错在哪个步骤。', reverse: false },
  { id: 'ms-t-aa-5', dimensionId: 'academic-attribution', axisId: 'flexibility', text: '一次考试不理想不会全盘否定该生的努力。', reverse: false },
  { id: 'ms-t-aa-6', dimensionId: 'academic-attribution', axisId: 'flexibility', text: '该生认为学习能力是可以提高的。', reverse: false },

  // 情绪韧性 - 敏感度轴（反向计分）
  { id: 'ms-t-er-1', dimensionId: 'emotional-resilience', axisId: 'sensitivity', text: '该生因考试或作业没考好会情绪低落很久。', reverse: true },
  { id: 'ms-t-er-2', dimensionId: 'emotional-resilience', axisId: 'sensitivity', text: '该生对老师或同学的评价特别在意，反复想。', reverse: true },
  { id: 'ms-t-er-3', dimensionId: 'emotional-resilience', axisId: 'sensitivity', text: '该生与同学发生不愉快后明显影响学习状态。', reverse: true },
  // 情绪韧性 - 调节力轴
  { id: 'ms-t-er-4', dimensionId: 'emotional-resilience', axisId: 'regulation', text: '该生有办法缓解压力或烦躁。', reverse: false },
  { id: 'ms-t-er-5', dimensionId: 'emotional-resilience', axisId: 'regulation', text: '情绪不好时该生仍能完成学习任务。', reverse: false },
  { id: 'ms-t-er-6', dimensionId: 'emotional-resilience', axisId: 'regulation', text: '该生遇到挫折后一两天内能恢复。', reverse: false },
];

export const middleSchoolQuestionnaire: Questionnaire = {
  id: 'middle-school',
  stageId: 'junior-1',
  name: '初中非毕业班（初一、初二）',
  dimensions: middleSchoolDimensions,
  studentQuestions: middleSchoolQuestions,
  parentQuestions: middleSchoolParentQuestions,
  teacherQuestions: middleSchoolTeacherQuestions,
};
