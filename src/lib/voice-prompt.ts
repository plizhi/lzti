/**
 * 语音答题的播报文案生成。
 *
 * 目标：让 AI 念出来的题目，孩子/家长一听就懂「现在该选几」。
 *
 * 几个关键取舍：
 * - 语音场景里「非常不符合/非常符合」这种量表词没用，要直接说「一到五」
 * - 语速放慢一点（speed 0.9），给孩子反应时间
 * - 带题号，让用户知道进度（57~93 题很长，没进度会让人焦虑）
 */

export interface VoicePromptOptions {
  /** 全局题序（从 1 开始） */
  questionNumber: number;
  /** 本次总共多少题 */
  totalQuestions: number;
  /** 题干 */
  questionText: string;
  /** 量表下限 */
  min: number;
  /** 量表上限 */
  max: number;
  /** 是否是最后一题 */
  isLast?: boolean;
}

/** 生成播报文案 */
export function buildQuestionPrompt(opts: VoicePromptOptions): string {
  const { questionNumber, totalQuestions, questionText, min, max, isLast } = opts;

  const parts: string[] = [];

  // 题号 + 进度
  parts.push(`第${questionNumber}题，共${totalQuestions}题。`);

  // 题干
  parts.push(questionText.trim());

  // 选项说明——这是最重要的一句
  parts.push(`请选择，${min}到${max}。`);

  // 收尾
  if (isLast) {
    parts.push('这是最后一题。');
  }

  return parts.join('');
}

/** 答对/答完的确认语（简短，不要长篇大论） */
export function buildConfirmPrompt(isLast: boolean): string {
  return isLast ? '答完啦，感谢你的认真作答。' : '好，下一题。';
}

/** 没听清时的重问语 */
export function buildRetryPrompt(): string {
  return '不好意思，没听清。麻烦再说一次。';
}

/** 连续失败时的降级提示 */
export function buildGiveUpPrompt(): string {
  return '这道题先跳过吧，我们继续下一题。';
}

/**
 * TTS 语速。语音测评比日常听感要慢，留出孩子反应时间。
 * 0.9 = 比正常慢 10%。
 */
export const VOICE_SPEED = 0.9;

/** TTS 音色 */
export const VOICE_ID = 'female-shaonv';
