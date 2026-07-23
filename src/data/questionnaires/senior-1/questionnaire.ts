// 高一高二问卷数据（定稿版）

import type { Questionnaire, Question } from '@/types/questionnaire';

export const selfCognitionDimension = {
  id: 'self-cognition',
  name: '自我认知',
  description: '孩子是否开始了解自己是什么样的人，能不能接纳自己的不完美',
  axes: ['self-awareness', 'self-acceptance'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '自知自洽型', description: '既了解自己，也能接纳自己。', guidance: '保护自我认知的稳定性，鼓励分享自我认知的经验。' },
    { id: 'strategy', name: '苛责清晰型', description: '了解自己，但对自己要求很严，容易否定自己。', guidance: '帮助建立更友善的自我对话方式，区分"做不好"和"人不好"。' },
    { id: 'passive', name: '自在成长型', description: '不太剖析自己，但和自己相处得挺舒服。', guidance: '肯定这种自在的状态，同时鼓励适度的自我探索。' },
    { id: 'overwhelmed', name: '迷茫苛责型', description: '既不太清楚自己是谁，又经常对自己不满意。', guidance: '先降低苛责，从"今天哪件事做得还不错"开始，帮其积累正向的自我认知。' },
  ],
};

export const directionExplorationDimension = {
  id: 'direction-exploration',
  name: '方向探索',
  description: '孩子对未来的方向有没有一些想法，有没有在尝试和探索中寻找自己真正喜欢的事',
  axes: ['direction-awareness', 'exploration-action'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '探索行动型', description: '有方向感，也在积极尝试。', guidance: '保护探索动力，协助评估方向的可行性和风险。' },
    { id: 'strategy', name: '想法待动型', description: '有想法但还没怎么行动。', guidance: '帮助将想法转化为最小行动步骤，从第一步开始。' },
    { id: 'passive', name: '跟随尝试型', description: '不太确定方向，但在尝试各种事情。', guidance: '肯定探索行为，在尝试中逐步澄清方向。' },
    { id: 'overwhelmed', name: '方向待寻型', description: '还没有明确的方向，也还没有开始太多探索。', guidance: '不催促"找到方向"，先从体验各种可能性开始。' },
  ],
};

export const academicStrategyDimension = {
  id: 'academic-strategy',
  name: '学业策略',
  description: '孩子有没有形成自己的学习方法，遇到难题时会不会变通',
  axes: ['method-awareness', 'flexibility'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '策略灵活型', description: '有自己的方法，也会灵活调整。', guidance: '鼓励策略总结和迁移，培养元认知能力。' },
    { id: 'strategy', name: '策略单一型', description: '有自己的方法，但遇到新情况不太会变通。', guidance: '引入策略菜单，通过对比体验让其在实践中发现新方法的价值。' },
    { id: 'passive', name: '被动灵活型', description: '虽然不太有自己的方法，但遇到问题会想办法。', guidance: '帮助建立"自己的方法"的意识，将零散策略系统化。' },
    { id: 'overwhelmed', name: '方法薄弱型', description: '既缺乏自己的方法，也不太会变通。', guidance: '从最基础的学习策略开始，建立小的成功体验，逐步积累方法。' },
  ],
};

export const supportConnectionDimension = {
  id: 'support-connection',
  name: '支持连接',
  description: '孩子是否感知到身边有人在支持自己，遇到困难时会不会主动求助',
  axes: ['support-awareness', 'active-connection'] as [string, string],
  quadrants: [
    { id: 'optimal', name: '主动连接型', description: '知道身边有人支持，也会主动求助。', guidance: '保持支持网络，同时鼓励成为他人的支持来源。' },
    { id: 'strategy', name: '感知未用型', description: '知道有人支持，但不太会主动连接。', guidance: '创造非正式的连接机会，让"求助"变成日常小事。' },
    { id: 'passive', name: '关系待建型', description: '虽然不太感知到支持，但愿意和人连接。', guidance: '帮助识别已有的支持资源，建立对支持网络的感知。' },
    { id: 'overwhelmed', name: '独自支撑型', description: '既不觉得有人支持，也不习惯找人帮忙。', guidance: '从"倾诉"而非"求助"开始，建立安全的表达渠道。' },
  ],
};

export const senior1Dimensions = [
  selfCognitionDimension,
  directionExplorationDimension,
  academicStrategyDimension,
  supportConnectionDimension,
];

// ========== 学生卷（13题）==========

export const senior1StudentQuestions: Question[] = [
  // 自我认知 1-4
  { id: 's1-stu-sc-1', dimensionId: 'self-cognition', axisId: 'self-awareness', text: '我大概知道自己擅长什么、不擅长什么。', reverse: false },
  { id: 's1-stu-sc-2', dimensionId: 'self-cognition', axisId: 'self-acceptance', text: '有些事情上我做得不错，有些事情上我还需要加油，这很正常。', reverse: false },
  { id: 's1-stu-sc-3', dimensionId: 'self-cognition', axisId: 'self-acceptance', text: '即使有些事情我做得不好，也不会影响我对自己整体的看法。', reverse: false },
  { id: 's1-stu-sc-4', dimensionId: 'self-cognition', axisId: 'self-awareness', text: '和以前相比，我现在更清楚自己是什么样的人了。', reverse: false },

  // 方向探索 5-7
  { id: 's1-stu-de-1', dimensionId: 'direction-exploration', axisId: 'direction-awareness', text: '对于以后想做什么，我大概有一些想法了，虽然还不确定。', reverse: false },
  { id: 's1-stu-de-2', dimensionId: 'direction-exploration', axisId: 'exploration-action', text: '我在试着接触不同的东西，想找到自己真正喜欢的。', reverse: false },
  { id: 's1-stu-de-3', dimensionId: 'direction-exploration', axisId: 'exploration-action', text: '有些事我试了之后发现不太适合自己，这也是一种收获。', reverse: false },

  // 学业策略 8-10
  { id: 's1-stu-as-1', dimensionId: 'academic-strategy', axisId: 'method-awareness', text: '我有自己的一套学习方法，不只是跟着老师走。', reverse: false },
  { id: 's1-stu-as-2', dimensionId: 'academic-strategy', axisId: 'flexibility', text: '一种方法不行，我会换一种试试。', reverse: false },
  { id: 's1-stu-as-3', dimensionId: 'academic-strategy', axisId: 'flexibility', text: '我知道不同的科目需要用不同的方式来学。', reverse: false },

  // 支持连接 11-13
  { id: 's1-stu-sp-1', dimensionId: 'support-connection', axisId: 'support-awareness', text: '我知道身边有人在关心我、支持我。', reverse: false },
  { id: 's1-stu-sp-2', dimensionId: 'support-connection', axisId: 'active-connection', text: '遇到困难的时候，我会找人聊聊或请人帮忙。', reverse: false },
  { id: 's1-stu-sp-3', dimensionId: 'support-connection', axisId: 'active-connection', text: '在家里，我愿意和家人说说学校的事、自己的事。', reverse: false },
];

// ========== 家长卷（12题）==========

export const senior1ParentQuestions: Question[] = [
  // 自我认知 1-3
  { id: 's1-par-sc-1', dimensionId: 'self-cognition', axisId: 'self-awareness', text: '孩子和我聊过，他觉得自己擅长什么、不擅长什么。', reverse: false },
  { id: 's1-par-sc-2', dimensionId: 'self-cognition', axisId: 'self-acceptance', text: '孩子做不好的时候，不会一直贬低自己。', reverse: false },
  { id: 's1-par-sc-3', dimensionId: 'self-cognition', axisId: 'self-acceptance', text: '孩子能接受自己有些事情暂时做不好，不会因此全盘否定自己。', reverse: false },

  // 方向探索 4-6
  { id: 's1-par-de-1', dimensionId: 'direction-exploration', axisId: 'direction-awareness', text: '孩子和我聊过，他以后大概想往哪个方向发展。', reverse: false },
  { id: 's1-par-de-2', dimensionId: 'direction-exploration', axisId: 'exploration-action', text: '孩子会主动去了解和尝试自己感兴趣的领域。', reverse: false },
  { id: 's1-par-de-3', dimensionId: 'direction-exploration', axisId: 'exploration-action', text: '即使孩子还不确定以后做什么，他也在试着找方向。', reverse: false },

  // 学业策略 7-9
  { id: 's1-par-as-1', dimensionId: 'academic-strategy', axisId: 'method-awareness', text: '孩子和我说起过，他用什么方法来学不同的科目。', reverse: false },
  { id: 's1-par-as-2', dimensionId: 'academic-strategy', axisId: 'flexibility', text: '孩子遇到学不会的，会换一种方式来试试。', reverse: false },
  { id: 's1-par-as-3', dimensionId: 'academic-strategy', axisId: 'flexibility', text: '孩子不只是反复读、反复背，会用不同的方式来学。', reverse: false },

  // 支持连接 10-12
  { id: 's1-par-sp-1', dimensionId: 'support-connection', axisId: 'active-connection', text: '孩子遇到困难时，会主动找家里人说或找其他人帮忙。', reverse: false },
  { id: 's1-par-sp-2', dimensionId: 'support-connection', axisId: 'active-connection', text: '孩子愿意和我说说学校里的事、自己的事。', reverse: false },
  { id: 's1-par-sp-3', dimensionId: 'support-connection', axisId: 'support-awareness', text: '我不太清楚孩子在外面遇到困难时会不会找人帮忙。', reverse: true },
];

// ========== 教师卷（12题）==========

export const senior1TeacherQuestions: Question[] = [
  // 自我认知 1-3
  { id: 's1-tea-sc-1', dimensionId: 'self-cognition', axisId: 'self-awareness', text: '该生对自己有比较清晰的认识，知道自己擅长什么、哪里还需要加强。', reverse: false },
  { id: 's1-tea-sc-2', dimensionId: 'self-cognition', axisId: 'self-acceptance', text: '该生面对自己的不足时，能保持积极态度，不会过度自责或否定自己。', reverse: false },
  { id: 's1-tea-sc-3', dimensionId: 'self-cognition', axisId: 'self-acceptance', text: '该生能接受建设性的批评，不会因为被指出问题就情绪低落或抵触。', reverse: false },

  // 方向探索 4-6
  { id: 's1-tea-de-1', dimensionId: 'direction-exploration', axisId: 'direction-awareness', text: '该生对未来有一些初步的想法或方向。', reverse: false },
  { id: 's1-tea-de-2', dimensionId: 'direction-exploration', axisId: 'exploration-action', text: '该生会主动去了解和尝试自己感兴趣的领域。', reverse: false },
  { id: 's1-tea-de-3', dimensionId: 'direction-exploration', axisId: 'exploration-action', text: '该生在做选择时（如选科、社团），有自己的考量，不是完全随大流。', reverse: false },

  // 学业策略 7-9
  { id: 's1-tea-as-1', dimensionId: 'academic-strategy', axisId: 'method-awareness', text: '该生在学习上有自己的方法，不只是跟着课堂走。', reverse: false },
  { id: 's1-tea-as-2', dimensionId: 'academic-strategy', axisId: 'flexibility', text: '该生遇到难题时，会尝试不同的解题思路。', reverse: false },
  { id: 's1-tea-as-3', dimensionId: 'academic-strategy', axisId: 'flexibility', text: '该生能根据不同的学科特点，调整自己的学习方式。', reverse: false },

  // 支持连接 10-12
  { id: 's1-tea-sp-1', dimensionId: 'support-connection', axisId: 'active-connection', text: '该生遇到困难时，会主动找老师或同学沟通。', reverse: false },
  { id: 's1-tea-sp-2', dimensionId: 'support-connection', axisId: 'support-awareness', text: '该生和同学关系良好，在班级中有自己的朋友。', reverse: false },
  { id: 's1-tea-sp-3', dimensionId: 'support-connection', axisId: 'active-connection', text: '该生在学习或生活上遇到问题时，不会一直闷着，会找人聊聊。', reverse: false },
];

export const senior1Questionnaire: Questionnaire = {
  id: 'senior-1',
  stageId: 'senior-1',
  name: '高一高二',
  dimensions: senior1Dimensions,
  studentQuestions: senior1StudentQuestions,
  parentQuestions: senior1ParentQuestions,
  teacherQuestions: senior1TeacherQuestions,
};
