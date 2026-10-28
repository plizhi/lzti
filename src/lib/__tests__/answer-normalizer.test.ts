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
  // 这批是实测「TTS 生成 → ASR 回读」得到的真实文本
  const realCases: Array<[string, number]> = [
    ['选A。', 1],
    ['选B。', 2],
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
    ['选C。', 3],
  ];

  for (const [text, expected] of realCases) {
    it(`"${text}" → ${expected}`, () => {
      expect(normalizeByRule(text, MIN, MAX)).toBe(expected);
    });
  }
});

describe('normalizeByRule — 口语变体', () => {
  const cases: Array<[string, number]> = [
    ['选a', 1],
    ['选A', 1],
    ['A', 1],
    ['a', 1],
    ['选诶', 1],        // 谐音，实测 ASR 会输出「选A」
    ['选b', 2],
    ['选e', 5],
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
    const r = await normalizeAnswer('选A', { min: MIN, max: MAX, useLLM: false });
    expect(r.value).toBe(1);
    expect(r.viaLLM).toBe(false);
  });

  it('规则不中且禁用 LLM → null', async () => {
    const r = await normalizeAnswer('这个嘛有点难说', { min: MIN, max: MAX, useLLM: false });
    expect(r.value).toBeNull();
  });
});
