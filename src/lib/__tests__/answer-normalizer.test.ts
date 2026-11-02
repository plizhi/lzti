/**
 * 答案归一化单测。
 *
 * 用例全部来自 2026-10-28 对 MiniMax ASR 的真实实测：
 * 先用 TTS 生成「选A」「我选3」等语音，再喂给 ASR，把返回文本喂给归一化。
 * 所以这些是真实识别出来的字符串，不是臆想的。
 */

import { describe, it, expect } from 'vitest';
import { normalizeByRule, normalizeAnswer } from '@/lib/answer-normalizer';

const MIN = 1;
const MAX = 5;

describe('normalizeByRule — ASR 真实输出', () => {
  // 这批是实测「TTS 生成 → ASR 回读」得到的真实文本。
  // ⚠️ 2026-11-02 更新：提示词已改成「请选择，1到5」（中文数字），
  // 所以 ASR 不再输出字母选项（旧的「选A。/选B。/选C。」是上一代提示词的产物）。
  // 现在只偶尔出现字母 **E** —— 那是「一」(yī) 的同音误写。
  const realCases: Array<[string, number]> = [
    ['三。', 3],
    ['第三。', 3],
    ['第三个。', 3],
    ['选第三个。', 3],
    ['我选三。', 3],
    ['二。', 2],
    ['五。', 5],
    ['我觉得是四吧', 4],
    ['一', 1],
    ['四。', 4],
    ['E.', 1],          // 「一」被写成字母 E（同音）
    ['E。', 1],
    ['选一', 1],
  ];

  for (const [text, expected] of realCases) {
    it(`"${text}" → ${expected}`, () => {
      expect(normalizeByRule(text, MIN, MAX)).toBe(expected);
    });
  }

  it('字母 A/B/C/D 不认（选项是中文数字，没有字母选项）→ null', () => {
    expect(normalizeByRule('选A。', MIN, MAX)).toBeNull();
    expect(normalizeByRule('选B。', MIN, MAX)).toBeNull();
    expect(normalizeByRule('选C。', MIN, MAX)).toBeNull();
    expect(normalizeByRule('A', MIN, MAX)).toBeNull();
  });
});

describe('normalizeByRule — 口语变体', () => {
  const cases: Array<[string, number]> = [
    ['选诶', 1],        // 谐音
    ['选伊', 1],         // 「选一」被 ASR 写成「选伊」
    ['选是', 4],         // 「选四」被写成「选是」
    ['选爱', 2],         // 「选二」被写成「选爱」
    ['玄武', 5],         // 「五」被写成「玄武」
    ['1', 1],
    ['5', 5],
    ['我选2', 2],
    ['我选二', 2],
    ['答案是3', 3],
    ['第3个', 3],
    ['第三题', 3],
    ['3号', 3],
    ['我选三吧', 3],
    ['应该是四', 4],
    ['嗯我选4', 4],
    ['选 3', 3],
  ];

  for (const [text, expected] of cases) {
    it(`"${text}" → ${expected}`, () => {
      expect(normalizeByRule(text, MIN, MAX)).toBe(expected);
    });
  }
});

describe('normalizeByRule — 拒绝/无效必须返回 null', () => {
  // 关键：这些不能被猜成某个数字，否则会记下错误答案
  const invalid = [
    '不知道。',
    '不知道',
    '不清楚',
    '不确定',
    '没听清',
    '我不要',
    '跳过',
    '随便',
    '无所谓',
    '更。',       // 实测 ASR 对「嗯」的输出
  ];

  for (const text of invalid) {
    it(`"${text}" → null`, () => {
      expect(normalizeByRule(text, MIN, MAX)).toBeNull();
    });
  }
});

describe('normalizeByRule — 范围外的数字不采纳', () => {
  it('「6」不在 1-5 范围内 → null', () => {
    expect(normalizeByRule('6', MIN, MAX)).toBeNull();
  });

  it('「0」→ null', () => {
    expect(normalizeByRule('0', MIN, MAX)).toBeNull();
  });
});

describe('normalizeAnswer — 不启用 LLM 时', () => {
  it('规则命中直接返回，不走 LLM', async () => {
    const r = await normalizeAnswer('选一', { min: MIN, max: MAX, useLLM: false });
    expect(r.value).toBe(1);
    expect(r.viaLLM).toBe(false);
  });

  it('「E」（一 的同音误写）规则直接命中 1', async () => {
    const r = await normalizeAnswer('E.', { min: MIN, max: MAX, useLLM: false });
    expect(r.value).toBe(1);
    expect(r.viaLLM).toBe(false);
  });

  it('规则不中且禁用 LLM → null', async () => {
    const r = await normalizeAnswer('这个嘛有点难说', { min: MIN, max: MAX, useLLM: false });
    expect(r.value).toBeNull();
  });
});

// 同音字坑（现场实测 2026-11-02）：家长说「1」→ ASR 写成「E.」→ 被当成第 5 个
describe('同音字：ASR 把「一」写成字母 E', () => {
  it('裸 E 判 1（说 1 不能记成 5）', () => {
    expect(normalizeByRule('E.', 1, 5)).toBe(1);
    expect(normalizeByRule('e', 1, 5)).toBe(1);
    expect(normalizeByRule('E', 1, 5)).toBe(1);
  });

  it('带「选」前缀的 E 也是 1（本题没有字母选项，E 就是「一」的同音）', () => {
    expect(normalizeByRule('选E', 1, 5)).toBe(1);
  });

  it('中文同音字（实测过的）：「选伊」=1、「选是」=4、「选爱」=2、「玄武」=5', () => {
    expect(normalizeByRule('选伊', 1, 5)).toBe(1);
    expect(normalizeByRule('选是', 1, 5)).toBe(4);
    expect(normalizeByRule('选爱', 1, 5)).toBe(2);
    expect(normalizeByRule('玄武', 1, 5)).toBe(5);
  });

  it('未实测的同音写法一律不收（「选必」「选西」「选迪」都是字母推出来的）', () => {
    expect(normalizeByRule('选必', 1, 5)).toBeNull();
    expect(normalizeByRule('选西', 1, 5)).toBeNull();
    expect(normalizeByRule('选迪', 1, 5)).toBeNull();
    expect(normalizeByRule('选比', 1, 5)).toBeNull();
  });

  it('其余字母不认 → null（宁可重念也不给错答案）', () => {
    expect(normalizeByRule('选A', 1, 5)).toBeNull();
    expect(normalizeByRule('选B', 1, 5)).toBeNull();
    expect(normalizeByRule('选D', 1, 5)).toBeNull();
    expect(normalizeByRule('a', 1, 5)).toBeNull();
  });

  it('中文「一」仍然是 1', () => {
    expect(normalizeByRule('一', 1, 5)).toBe(1);
    expect(normalizeByRule('选一', 1, 5)).toBe(1);
  });
});

