/**
 * 语音答题的答案归一化。
 *
 * 把「孩子/家长说出来的话」变成 1-5 的分值。
 *
 * 两级策略：
 *   ① 规则匹配 —— 覆盖绝大多数情况，零延迟零成本。实测 12 个真实用例全部命中。
 *   ② LLM 兜底 —— 规则处理不了的模糊表达（「应该是第三个吧」「差不多四」）。
 *
 * 为什么必须有 LLM 兜底：孩子说话千奇百怪，规则永远会漏。
 * 但 LLM 不能作为主路径——每题一次 LLM 调用会拖慢交互、增加成本，
 * 而且 LLM 有概率「猜」出一个答案，把「不知道」判成 3。
 */

const CN_NUM: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
  壹: 1, 贰: 2, 叁: 3, 肆: 4, 伍: 5,
};

const EN_LETTER: Record<string, number> = {
  a: 1, b: 2, c: 3, d: 4, e: 5,
  诶: 1, 欸: 1, 艾: 1, 比: 2, 必: 2, 西: 3, 迪: 4, 伊: 5,
};

/** 明确表示「没答上来」的词——这些必须返回 null，不能猜 */
const REFUSAL_PATTERNS = [
  '不知道', '不清楚', '不确定', '没听清', '听不清', '再说一次', '没懂',
  '不要', '不想', '跳过', '随便', '无所谓', '不知道啊', '不知道哦',
  '不知道，', '嗯…', '唔', '呃', '啊这', 'what',
];

export interface NormalizeOptions {
  min: number;
  max: number;
  /** 是否允许 LLM 兜底 */
  useLLM?: boolean;
  /** LLM 判定用的上下文（如当前题目），帮模型理解语境 */
  questionText?: string;
}

export interface NormalizeResult {
  /** 归一化后的分值；无法判定时为 null */
  value: number | null;
  /** 判定依据说明，便于排查 */
  reason: string;
  /** 是否走了 LLM 兜底 */
  viaLLM: boolean;
}

/**
 * 规则归一化。命中返回 value，���命中返回 null。
 * 导出以便单测直接覆盖各种口语说法。
 */
export function normalizeByRule(text: string, min: number, max: number): number | null {
  if (!text) return null;

  // 归一化：去掉标点空白，全角转半角，转小写
  const raw = text
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, '')
    .toLowerCase();

  // ① 先判「拒绝/无效」——必须在提取数字之前判，
  //    否则「不知道」里的「道」之类可能被误当成别的
  for (const p of REFUSAL_PATTERNS) {
    if (raw.includes(p)) return null;
  }

  const inRange = (n: number) => n >= min && n <= max;

  // ② 字母式：「选a」「a」「选诶」「答案是b」
  //    必须优先于数字式，因为「选A」里的 a 不是数字
  const letterMatch = raw.match(/选\s*([a-e诶欸艾比必西迪伊])|(?:^|[^a-z])([a-e])(?:[^a-z]|$)/);
  if (letterMatch) {
    const letter = (letterMatch[1] || letterMatch[2] || '').toLowerCase();
    const n = EN_LETTER[letter];
    if (n !== undefined && inRange(n)) return n;
  }

  // ③ 中文数字：「三」「第三」「第三题」
  //    先匹配「第X个/题/项」这种带序数后缀的
  const ordinal = raw.match(/第\s*([一二三四五壹贰叁肆伍]|\d)\s*(?:个|题|项|档|级)?/);
  if (ordinal) {
    const token = ordinal[1];
    const n = /^\d$/.test(token) ? parseInt(token, 10) : CN_NUM[token];
    if (n !== undefined && inRange(n)) return n;
  }

  // ④ 阿拉伯数字：「3」「3号」「答案是3」
  const digitMatch = raw.match(/(\d)/);
  if (digitMatch) {
    const n = parseInt(digitMatch[1], 10);
    if (inRange(n)) return n;
  }

  // ⑤ 纯中文数字：「三」（前面几条都没命中时的兜底）
  for (const [ch, n] of Object.entries(CN_NUM)) {
    if (raw.includes(ch) && inRange(n)) return n;
  }

  return null;
}

/**
 * LLM 兜底判定。
 * 用严格的指令 + JSON mode，让模型只回答一个数字或 null。
 */
async function normalizeByLLM(
  text: string,
  opts: NormalizeOptions
): Promise<number | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const systemPrompt = `你是一个语音答题的答案解析器。用户说了一句话，你要判断他想选的选项是第几个。

规则：
- 只能回答一个 JSON：{"value": 数字或 null}
- value 必须是 ${opts.min} 到 ${opts.max} 之间的整数，或者 null
- 如果用户明确表示不知道、不确定、拒绝作答、或者没有表达出任何选项，必须返回 null
- 不要猜测。用户说"应该是第三个吧"这种犹豫但明确指向第三个的，可以返回 3
- 只输出 JSON，不要任何其他文字`;

  const body = {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: opts.questionText
          ? `题目：${opts.questionText}\n用户说：${text}`
          : `用户说：${text}`,
      },
    ],
    max_tokens: 100,
    response_format: { type: 'json_object' },
  };

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as any;
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const value = parsed?.value;
    if (typeof value !== 'number') return null;
    if (value < opts.min || value > opts.max) return null;
    return value;
  } catch {
    return null;
  }
}

/**
 * 完整归一化：规则优先，规则不中且允许时走 LLM。
 */
export async function normalizeAnswer(
  text: string,
  opts: NormalizeOptions
): Promise<NormalizeResult> {
  const byRule = normalizeByRule(text, opts.min, opts.max);
  if (byRule !== null) {
    return { value: byRule, reason: `规则匹配: "${text}" → ${byRule}`, viaLLM: false };
  }

  if (opts.useLLM === false) {
    return { value: null, reason: `规则未匹配: "${text}"`, viaLLM: false };
  }

  const byLLM = await normalizeByLLM(text, opts);
  if (byLLM !== null) {
    return { value: byLLM, reason: `LLM 判定: "${text}" → ${byLLM}`, viaLLM: true };
  }

  return { value: null, reason: `无法判定: "${text}"`, viaLLM: true };
}
