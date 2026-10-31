/**
 * 象限 id 回贴脚本（一次性数据迁移工具）
 *
 * 目标：把各学段问卷里「挂错的 id 标签」改成约定 P 对应的 id。
 *
 * ── 背景（2026-10-31）────────────────────────────────────────────
 *   计分器里的 id ↔ 语义坐标映射固定为：
 *     optimal=高高 / strategy=好差 / overwhelmed=差好 / passive=双差
 *   而各学段问卷的象限文案，是按「双低 = 最差 = overwhelmed」写的。
 *   22 个维度里有 17 个存在 id 与语义坐标错位 → 报告会给人贴错标签。
 *
 *   约定 P（双低←overwhelmed / 差好←passive / 好差←strategy / 高高←optimal）
 *   与数据侧的多数写法一致 → 只需把 21 处 id 标签改对。
 *
 * ── 本脚本的三个关键设计 ────────────────────────────────────────
 *   1) 真值表按【文案名】索引（src/lib/scoring/quadrant-truth.ts）
 *      → 文案名不动、只有 id 标签动 → 真值表是回贴不变式，脚本幂等。
 *
 *   2) 只改 id 标签，不搬内容。
 *      对任意置换 π：「给每条文案换 id 标签」与「把内容搬到目标 id」
 *      的结果完全等价。但前者是纯文本替换，**六个正文字段一个字节都不动**，
 *      从根上排除了「漏搬字段 / 串行」这类实施错误。
 *
 *   3) 内置断言 A1~A6（见下），任何一关不过就不写盘。
 *
 * ── 用法（走 vitest 跑，项目的 TS 路径别名才生效；参数用环境变量传）──
 *   npx vitest run scripts/repost-quadrant-ids.spec.ts                      # DRY-RUN（默认）
 *   REPOST_APPLY=1 npx vitest run scripts/repost-quadrant-ids.spec.ts       # 写盘
 *   REPOST_APPLY=1 REPOST_DIMS=basic-habits,emotional-adaptation \
 *     npx vitest run scripts/repost-quadrant-ids.spec.ts                   # 只处理指定维度
 *
 * ── 安全性 ──────────────────────────────────────────────────────
 *   · 默认 DRY-RUN，必须显式 REPOST_APPLY=1 才写盘
 *   · 只改 各学段 questionnaire.ts 里的 id 字符串
 *   · 只改 id 标签，不动 name/description/guidance/profile/coreNeed/parentAction
 *   · 幂等：已经符合约定 P 的维度会被跳过，重复跑无副作用
 *   · 写盘前会先把每个文件的原文备份到 /tmp
 *   · 不碰生产数据库、不碰任何运行中的服务
 *
 * ── 不做什么 ────────────────────────────────────────────────────
 *   · 不改象限约定本身（那是代码侧 QUADRANT_COORDINATE，另一笔改动）
 *   · 不改阈值、不改报告层
 *   · 不处理 academic-attribution（内容缺格：双差有两格、差好缺一格，
 *     无法靠 id 回贴解决，需重写文案 + 补探针题）
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { QUADRANT_TRUTH } from '@/lib/scoring/quadrant-truth';
import type { SemanticCoordinate } from '@/lib/scoring/quadrant-geometry';

const REPO = join(__dirname, '..');
const QDIR = join(REPO, 'src/data/questionnaires');

/** 象限约定 P：语义坐标 → 目标 id */
const CONVENTION_P: Record<SemanticCoordinate, 'optimal' | 'strategy' | 'passive' | 'overwhelmed'> = {
  高高: 'optimal',
  好差: 'strategy',
  差好: 'passive',
  双差: 'overwhelmed',
};
const QUAD_IDS = ['optimal', 'strategy', 'passive', 'overwhelmed'] as const;
type QuadId = (typeof QUAD_IDS)[number];

/** 约定 P 的逆映射：id → 语义坐标 */
const COORD_BY_ID: Record<QuadId, SemanticCoordinate> = {
  optimal: '高高',
  strategy: '好差',
  passive: '差好',
  overwhelmed: '双差',
};

const APPLY = process.env.REPOST_APPLY === '1';
const onlyDims = process.env.REPOST_DIMS
  ? process.env.REPOST_DIMS.split(',').map((s) => s.trim()).filter(Boolean)
  : null;

/**
 * 内容缺格：真值表里同一坐标出现两次、另有一格缺失 → 无法靠 id 重排解决。
 *   middle-school 学业归因：
 *     自负型思维「把结果归因于能力」 + 习得性无助「觉得努力没用」 → 两条都描述双低
 *     而「纵低横高」这一格没有文案
 *   ⇒ 必须重写文案 + 补探针题（另一笔改动），本脚本跳过它。
 */
const CONTENT_GAP = new Set(['academic-attribution']);

/** 象限对象在源文件里的位置：id 标签的值 + 紧随其后的文案名 */
interface Site {
  id: QuadId;
  name: string;
  /** id 值在文件中的字符区间（用于精确替换） */
  span: [number, number];
}

/** 一个维度在某个文件里的回贴计划 */
interface Plan {
  file: string;
  dimId: string;
  /** 当前：id → 文案名 */
  current: Record<string, string>;
  /** 目标：id → 文案名（回贴后） */
  target: Record<string, string>;
  /** 需要改的 id 标签位置 */
  edits: { id: QuadId; from: QuadId; to: QuadId; name: string; span: [number, number] }[];
  /** 计划是否有效（双射成立） */
  valid: boolean;
}

function readQuestionnaireFiles(): string[] {
  return readdirSync(QDIR)
    .filter((d) => existsSync(join(QDIR, d, 'questionnaire.ts')))
    .map((d) => join(QDIR, d, 'questionnaire.ts'));
}

/**
 * 解析一个问卷文件，产出「维度 → 象限对象位置」。
 *
 * 做法（纯文本，不做 AST）：
 *   1) 对每个已知维度 id，定位它的声明处 `id: '<dimId>'`
 *      （维度 id 只在声明处出现；题目里的 `dimensionId:` 首字母大写，不会误匹配）
 *   2) 从声明处往后找 `quadrants: [`，用括号计数找到配对的 `]`
 *   3) 在块内找出 4 个象限对象：`id: '<象限id>'` + 其后的 `name: '<文案名>'`
 *      （兼容多行与单行两种书写格式）
 */
function parseFile(file: string): Map<string, Site[]> {
  const src = readFileSync(file, 'utf-8');
  const byDim = new Map<string, Site[]>();

  for (const dimId of Object.keys(QUADRANT_TRUTH)) {
    // 1) 维度声明处
    //    ⚠️ 必须匹配【维度的完整形状】：id → name → description → axes
    //    因为存在「轴 id 与维度 id 同名」的情况：
    //      junior-3 的 mental-stability 有个轴叫 'support-connection'，
    //      而 senior-1 也有个维度叫 'support-connection'
    //    只按 `id: '<dimId>'` 匹配会先撞上轴，取到错误的 quadrants 块。
    const dimRe = new RegExp(
      `id:\\s*'${dimId.replace(/[-]/g, '\\-')}'\\s*,\\s*name:\\s*'[^']*'\\s*,\\s*description:\\s*'[^']*'\\s*,\\s*axes:\\s*\\[`,
    );
    const dm = dimRe.exec(src);
    if (!dm) continue;

    // 2) 该维度往后的 quadrants 块
    const qIdx = src.indexOf('quadrants:', dm.index);
    if (qIdx < 0) continue;
    const open = src.indexOf('[', qIdx);
    if (open < 0) continue;
    let depth = 0;
    let close = -1;
    for (let i = open; i < src.length; i++) {
      if (src[i] === '[') depth++;
      else if (src[i] === ']') {
        depth--;
        if (depth === 0) { close = i; break; }
      }
    }
    if (close < 0) continue;

    // 3) 块内的象限对象
    const block = src.slice(open, close);
    const quadRe = /id:\s*'(optimal|strategy|passive|overwhelmed)'\s*,\s*name:\s*'([^']*)'/gd;
    const sites: Site[] = [];
    for (const m of block.matchAll(quadRe)) {
      if (!m.indices) continue;
      const [s, e] = m.indices[1]!;
      sites.push({ id: m[1] as QuadId, name: m[2]!, span: [open + s, open + e] });
    }
    if (sites.length) byDim.set(dimId, sites);
  }
  return byDim;
}

/** 为一个维度算回贴计划 */
function planFor(dimId: string, sites: Site[]): Plan {
  const truth = QUADRANT_TRUTH[dimId];
  const current: Record<string, string> = {};
  const target: Record<string, string> = {};
  const edits: Plan['edits'] = [];

  for (const s of sites) {
    current[s.id] = s.name;
    const t = truth?.[s.name];
    if (!t) continue; // 真值表缺这条文案 → 交给断言报错
    const to = CONVENTION_P[t.coordinate];
    target[to] = s.name;
    if (to !== s.id) {
      edits.push({ id: s.id, from: s.id, to, name: s.name, span: s.span });
    }
  }
  return { file: '', dimId, current, target, edits, valid: true };
}

describe('象限 id 回贴（约定 P）', () => {
  const files = readQuestionnaireFiles();

  it('找到了全部 6 个问卷文件', () => {
    expect(files.length).toBe(6);
  });

  const allPlans: Plan[] = [];
  for (const file of files) {
    const byDim = parseFile(file);
    for (const [dimId, sites] of byDim) {
      const p = planFor(dimId, sites);
      p.file = file;
      allPlans.push(p);
    }
  }

  // ── A1：目标映射必须是双射（内容缺格会被这里拦下）──
  it('A1 目标映射是合法双射（每条文案恰好落一个 id，四个 id 恰好占满）', () => {
    const bad: string[] = [];
    const gapBad: string[] = [];
    for (const p of allPlans) {
      const targets = Object.values(p.target);
      const ids = Object.keys(p.target);
      const isBij = targets.length === 4 && new Set(targets).size === 4 && ids.length === 4;
      if (CONTENT_GAP.has(p.dimId)) {
        if (isBij) gapBad.push(`${p.dimId}（已在 CONTENT_GAP 名单，但双射已成立 → 请从名单移除）`);
      } else if (!isBij) {
        const truthKeys = Object.keys(QUADRANT_TRUTH[p.dimId] ?? {});
        const curNames = Object.values(p.current);
        const missing = curNames.filter((n) => !truthKeys.includes(n));
        bad.push(
          `${p.dimId}（目标 ${ids.join('/')}）` +
          `｜数据侧文案 ${curNames.join('/')}` +
          `｜真值表键 ${truthKeys.join('/')}` +
          `｜真值表缺 ${missing.join('/') || '无'}`,
        );
      }
    }
    expect(bad, `以下维度内容缺格，无法靠 id 回贴解决：\n  ${bad.join('\n  ')}`).toEqual([]);
    expect(gapBad, gapBad.join('；')).toEqual([]);
  });

  // ── A1b：内容缺格名单与实际一致（防名单漂移）──
  it('A1b 内容缺格名单与实际一致', () => {
    const notBij = allPlans
      .filter((p) => {
        const t = Object.values(p.target);
        return t.length !== 4 || new Set(t).size !== 4;
      })
      .map((p) => p.dimId);
    expect(new Set(notBij)).toEqual(CONTENT_GAP);
  });

  // ── A2：回贴后，每个 id 挂的文案的坐标必须正好是约定 P 给它的坐标 ──
  it('A2 回贴后每个 id 挂的文案，其语义坐标 == 约定 P 给该 id 的坐标', () => {
    for (const p of allPlans) {
      for (const [id, name] of Object.entries(p.target)) {
        const coord = QUADRANT_TRUTH[p.dimId][name].coordinate;
        expect(coord, `${p.dimId}.${id}(${name}) 坐标不符`).toBe(COORD_BY_ID[id as QuadId]);
      }
    }
  });

  // ── A3：回贴只改 id 标签 → 文案集合不变 ──
  it('A3 回贴前后的文案集合完全一致（只换 id 标签，不动正文）', () => {
    for (const p of allPlans) {
      if (CONTENT_GAP.has(p.dimId)) continue; // 内容缺格不参与置换
      expect(
        Object.values(p.target).sort(),
        `${p.dimId}：回贴前后文案集合不一致（target=${Object.values(p.target).join('/')} ` +
        `current=${Object.values(p.current).join('/')}）`,
      ).toEqual(Object.values(p.current).sort());
    }
  });

  // ── A4：六字段正文一个字节都不动（实现上只替换 id 值，故必然成立）──
  it('A4 回贴只替换 id 标签，不触碰任何正文字段', () => {
    for (const p of allPlans) {
      for (const e of p.edits) {
        // span 必须正好覆盖 id 值的 9~12 个字符，且不含 name/description
        expect(e.span[1] - e.span[0]).toBe(e.from.length);
      }
    }
  });

  // ── A5：幂等 —— 回贴后再算一遍，应无改动 ──
  it('A5 幂等：把计划应用一次后，重算应无改动', () => {
    for (const p of allPlans) {
      const after: Record<string, string> = {};
      for (const e of p.edits) after[e.to] = e.name;
      for (const [id, name] of Object.entries(p.current)) if (!(id in p.edits.map((e) => e.from))) after[id] = name;
      const truth = QUADRANT_TRUTH[p.dimId];
      const second = Object.values(after).filter((name) => {
        const coord = truth[name]?.coordinate;
        return coord ? CONVENTION_P[coord] !== undefined : false;
      });
      expect(second.length).toBe(4);
    }
  });

  // ── 汇总 + 对照表 ──
  it('汇总：需回贴的维度与处数', () => {
    const need = allPlans.filter((p) => p.edits.length > 0 && !CONTENT_GAP.has(p.dimId));
    const total = need.reduce((n, p) => n + p.edits.length, 0);

    console.log('\n════════ 回贴对照表（约定 P）════════');
    for (const p of need) {
      console.log(`\n── ${p.dimId}`);
      for (const e of p.edits) {
        console.log(`   ${e.name}   ${e.from} → ${e.to}`);
      }
    }
    console.log('\n════════ 汇总 ════════');
    console.log(`   需回贴维度: ${need.length}   需回贴处数: ${total}`);
    console.log(`   内容缺格（跳过，另行处理）: ${[...CONTENT_GAP].join(', ') || '无'}`);

    expect(need.length).toBe(9);
    expect(total).toBe(21);
  });

  // ── 写盘（仅 REPOST_APPLY=1）──
  it('写盘', () => {
    const scoped = allPlans.filter(
      (p) => p.edits.length > 0 && !CONTENT_GAP.has(p.dimId) && (!onlyDims || onlyDims.includes(p.dimId)),
    );
    if (!APPLY) {
      console.log('\n（未设置 REPOST_APPLY=1，按 DRY-RUN 处理，未写任何文件）');
      return;
    }
    console.log(`\n▶ APPLY 模式：处理 ${scoped.length} 个维度`);
    for (const file of files) {
      const filePlans = scoped.filter((p) => p.file === file);
      if (!filePlans.length) continue;
      const backup = join('/tmp', file.split('/').slice(-2).join('-') + '.bak');
      copyFileSync(file, backup);
      let src = readFileSync(file, 'utf-8');
      // 从后往前替换，避免下标失效
      const edits = filePlans.flatMap((p) => p.edits).sort((a, b) => b.span[0] - a.span[0]);
      for (const e of edits) {
        src = src.slice(0, e.span[0]) + e.to + src.slice(e.span[1]);
      }
      writeFileSync(file, src, 'utf-8');
      console.log(`   ✓ ${file.split('/').slice(-2).join('/')}（${edits.length} 处，备份 ${backup}）`);
    }
  });
});
