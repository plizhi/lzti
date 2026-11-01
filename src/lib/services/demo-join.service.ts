/**
 * 演示链路 L3：一份二维码 + 免登录手机作答
 *
 * 目标流程（2026-11-01 朋大大拍板）：
 *   1. 家长/学生在 ESP32 机器上做完一份卷
 *   2. 机器向服务端要「这一场还缺哪些角色 + **一个**加入码」
 *   3. 家长把加入码（URL）用微信转发给学生和老师
 *   4. 老师/学生手机扫码 → 落地页看到还缺的角色 → 选角色 → 填姓名（可选）
 *      → 手机网页作答 → 提交 → attempt 挂到**同一个 demo Child / 同一个 AssessmentSession** 下
 *   5. 三份都做完 → 服务端为每个 attempt 生成报告码（只读、24h、可多人查看）
 *
 * 免登录：不建 User、不要手机号、不发验证码，加入码 + 角色凭证就是全部凭证。
 *
 * ── 数据落在哪（重要：不新增表，零 DDL）────────────────────────────
 * 复用现有的 ShareBatch / Slot 两张表：
 *
 *   ShareBatch(questionnaireType='demo-join', userId=演示账号, stageId)
 *     ├── Slot(type='demo-join',        code=<二维码里的加入码>)   ← 入口凭证
 *     ├── Slot(type='demo-role-parent', code=<内部码>)
 *     ├── Slot(type='demo-role-student',code=<内部码>)
 *     └── Slot(type='demo-role-teacher',code=<内部码>)
 *
 *   - 批次 userId 永远是演示账号 → 数据天然隔离在演示账号名下
 *   - type 用 demo-* 前缀 → 生产流程（createSessionBySlot 只认 student/teacher、
 *     activateSlot 只认 register）碰不到这些槽位，不会串进生产
 *   - AssessmentSession.slotId 指向「入口槽位」→ 加入码 ⇄ 测评会话 双向可查
 *   - 角色槽位的 usedAt = 该角色已提交（一次性：用掉即废）
 *
 *   ⚠️ 这样做的代价：Slot.usedBy 本来存 userId，演示场景没有用户，
 *      只能塞 `demo-guest[:姓名]` 这样的标记（仅用于事后对账，不参与任何鉴权）。
 */

import { randomInt } from 'crypto';
import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/api/response';
import { isDemoPhone } from '@/lib/demo';
import { DEMO_EXPIRY_HOURS, expiresAtIn } from '@/lib/services/expiry';
import { getQuestionnaire } from '@/data/questionnaires';
import {
  QUESTIONNAIRE_TYPE_LABEL,
  getQuestionsForType,
} from '@/lib/questionnaire-flow';
import { getDeviceQuestions } from '@/lib/device-questions';
import { submitAttempt } from '@/lib/services/assessment.service';
import { createReportShare } from '@/lib/services/report-share.service';
import { validateAnswers } from '@/lib/validators';
import {
  signDemoRoleToken,
  verifyDemoRoleToken,
  type DemoJoinRole,
} from '@/lib/demo-join-token';

/** 批次类型标记：ShareBatch.questionnaireType === 'demo-join' */
export const DEMO_JOIN_BATCH_TYPE = 'demo-join';
/** 入口槽位类型：Slot.type === 'demo-join'（二维码里的码） */
export const DEMO_JOIN_SLOT_TYPE = 'demo-join';
/** 角色槽位类型前缀：Slot.type === 'demo-role-student' 等 */
export const DEMO_JOIN_ROLE_SLOT_PREFIX = 'demo-role-';

/** 加入码字符集：去掉 l/o/0/1 等扫码容易看错的字符 */
export const DEMO_JOIN_CODE_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
/** 加入码长度 */
export const DEMO_JOIN_CODE_LENGTH = 12;

/** 三个角色 */
export const DEMO_JOIN_ROLES: DemoJoinRole[] = ['parent', 'student', 'teacher'];

/** 免登录作答人在 Slot.usedBy 里的标记前缀 */
const DEMO_GUEST_PREFIX = 'demo-guest';

/** 角色说明：落地页角色卡上写清楚「谁填」，防止老师误选成学生卷 */
const ROLE_WHO: Record<DemoJoinRole, string> = {
  parent: '由家长（监护人）填写',
  student: '由学生本人在自己手机上填写',
  teacher: '由班主任或任课老师填写',
};

const ROLE_DESC: Record<DemoJoinRole, string> = {
  parent: '题目从家长视角描述孩子的日常表现',
  student: '题目是「你……」的第一人称，同学自己作答',
  teacher: '题目是「该生……」的第三人称，老师凭在校观察作答',
};

/** 角色卡上的提示条颜色（落地页用） */
export const ROLE_ACCENT: Record<DemoJoinRole, 'amber' | 'blue' | 'green'> = {
  parent: 'amber',
  student: 'blue',
  teacher: 'green',
};

// ───────────────────────────── 类型 ─────────────────────────────

export interface DemoJoinRoleView {
  role: DemoJoinRole;
  label: string;
  who: string;
  desc: string;
  /** 示例题（让扫码的人一眼看出这份卷该谁填） */
  sample: string;
  totalQuestions: number;
  status: 'pending' | 'completed';
}

export interface DemoJoinReportLink {
  role: string;
  label: string;
  url: string;
  code: string;
  expiresAt: string;
}

export interface DemoJoinInfo {
  code: string;
  stageId: string;
  stageName: string;
  childName: string;
  expiresAt: string;
  completed: Record<string, boolean>;
  roles: DemoJoinRoleView[];
  allCompleted: boolean;
  reports: DemoJoinReportLink[];
}

export interface DemoJoinCodeResult {
  code: string;
  path: string;
  expiresAt: string;
  sessionId: string;
  childId: string;
  childName: string;
  stageId: string;
  stageName: string;
  completed: Record<string, boolean>;
  missingRoles: DemoJoinRoleView[];
  /** true = 新建的码；false = 复用了还没过期的旧码 */
  isNew: boolean;
}

export interface DemoJoinClaim {
  role: DemoJoinRole;
  label: string;
  who: string;
  desc: string;
  sample: string;
  name: string;
  token: string;
  stageId: string;
  stageName: string;
  childName: string;
  totalQuestions: number;
  dimensions: ReturnType<typeof getDeviceQuestions>['dimensions'];
  scale: ReturnType<typeof getDeviceQuestions>['scale'];
}

export interface DemoJoinSubmitResult {
  attemptId: string;
  role: DemoJoinRole;
  label: string;
  name: string;
  submittedAt: string;
  completed: Record<string, boolean>;
  allCompleted: boolean;
  reports: DemoJoinReportLink[];
}

// ───────────────────────────── 纯函数 ─────────────────────────────

/** 生成加入码（12 位，去掉易混字符） */
export function generateDemoJoinCode(): string {
  let code = '';
  for (let i = 0; i < DEMO_JOIN_CODE_LENGTH; i++) {
    code += DEMO_JOIN_CODE_ALPHABET[randomInt(0, DEMO_JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

/** 这一场还缺哪些角色（已完成的排掉） */
export function resolveMissingRoles(
  completed: Record<string, boolean> | null | undefined
): DemoJoinRole[] {
  const done = completed ?? {};
  return DEMO_JOIN_ROLES.filter((role) => !done[role]);
}

/** 解析 session.completed（老数据可能是脏 JSON，兜底成全 false） */
export function parseCompleted(raw: string | null | undefined): Record<string, boolean> {
  try {
    const parsed = JSON.parse(raw ?? '{}') as Record<string, unknown>;
    const out: Record<string, boolean> = {};
    for (const role of DEMO_JOIN_ROLES) {
      out[role] = parsed[role] === true;
    }
    return out;
  } catch {
    return { parent: false, student: false, teacher: false };
  }
}

/** 校验角色字符串 */
export function normalizeRole(input: unknown): DemoJoinRole {
  if (input === 'parent' || input === 'student' || input === 'teacher') {
    return input;
  }
  throw new ApiError('角色不合法', 400);
}

/** 作答人姓名：可选，去空白、限长、去掉控制字符 */
export function normalizeGuestName(input: unknown): string {
  if (typeof input !== 'string') return '';
  const cleaned = input.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return cleaned.slice(0, 20);
}

/** 免登录作答人标记（写进 Slot.usedBy，仅用于对账） */
export function guestMarker(name: string): string {
  return name ? `${DEMO_GUEST_PREFIX}:${name}` : DEMO_GUEST_PREFIX;
}

/** 从标记里取回姓名 */
export function parseGuestMarker(marker: string | null | undefined): string {
  if (!marker || !marker.startsWith(DEMO_GUEST_PREFIX)) return '';
  const rest = marker.slice(DEMO_GUEST_PREFIX.length);
  return rest.startsWith(':') ? rest.slice(1) : '';
}

/** 角色槽位的 type 字符串 */
export function roleSlotType(role: DemoJoinRole): string {
  return `${DEMO_JOIN_ROLE_SLOT_PREFIX}${role}`;
}

/** 角色卡文案（这个学段有没有这份卷 + 状态） */
export function buildRoleViews(
  stageId: string,
  completed: Record<string, boolean>
): DemoJoinRoleView[] {
  const questionnaire = getQuestionnaire(stageId);
  const views: DemoJoinRoleView[] = [];

  for (const role of DEMO_JOIN_ROLES) {
    const questions = questionnaire ? getQuestionsForType(questionnaire, role) : [];
    // 这个学段没有这份卷 → 根本不显示（免得点了没题可答）
    if (questions.length === 0) continue;

    views.push({
      role,
      label: QUESTIONNAIRE_TYPE_LABEL[role],
      who: ROLE_WHO[role],
      desc: ROLE_DESC[role],
      sample: questions[0].text,
      totalQuestions: questions.length,
      status: completed[role] ? 'completed' : 'pending',
    });
  }

  return views;
}

// ───────────────────────────── 数据访问 ─────────────────────────────

interface SlotRow {
  id: string;
  batchId: string;
  type: string;
  code: string;
  usedAt: Date | null;
  usedBy: string | null;
  childId: string | null;
  expiresAt: Date;
}

interface JoinSlot extends SlotRow {
  batch: {
    id: string;
    userId: string;
    stageId: string;
    questionnaireType: string;
    expiresAt: Date;
  };
}

interface JoinSession {
  id: string;
  childId: string;
  stageId: string;
  slotId: string | null;
  completed: string;
  child: { id: string; name: string; userId: string };
}

/**
 * 数据隔离：这个账号是不是演示账号。
 *
 * 演示链路的一切数据（批次/槽位/会话/attempt）都必须落在演示账号名下。
 * 生产环境不配 DEMO_USER_PHONE → 这里直接拒绝，演示数据碰不到生产。
 */
async function assertDemoOwner(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true },
  });
  if (!user || !isDemoPhone(user.phone)) {
    throw new ApiError('演示专用接口不可用', 403);
  }
}

/** 生成一个全局唯一的槽位码 */
async function uniqueSlotCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateDemoJoinCode();
    const exists = await prisma.slot.findUnique({ where: { code } });
    if (!exists) return code;
  }
  throw new ApiError('加入码生成失败，请重试', 500);
}

/** 入口槽位 → 测评会话 */
async function resolveJoinSession(slot: JoinSlot): Promise<JoinSession | null> {
  const bySlot = await prisma.assessmentSession.findFirst({
    where: { slotId: slot.id },
    include: { child: true },
  });
  if (bySlot) return bySlot;

  // 兜底：按孩子 + 学段找最近一场（demo 流程里一场 = 一个临时孩子）
  if (!slot.childId) return null;
  return prisma.assessmentSession.findFirst({
    where: { childId: slot.childId, stageId: slot.batch.stageId },
    include: { child: true },
    orderBy: { createdAt: 'desc' },
  });
}

/** 载入加入码对应的上下文（落地页/领角色/提交都走这里） */
async function loadJoinContext(code: string): Promise<{
  joinSlot: JoinSlot;
  session: JoinSession;
  completed: Record<string, boolean>;
}> {
  const normalized = typeof code === 'string' ? code.trim().toLowerCase() : '';
  if (!normalized) {
    throw new ApiError('缺少加入码', 400);
  }

  const slot = (await prisma.slot.findUnique({
    where: { code: normalized },
    include: { batch: true },
  })) as JoinSlot | null;

  if (
    !slot ||
    slot.type !== DEMO_JOIN_SLOT_TYPE ||
    slot.batch.questionnaireType !== DEMO_JOIN_BATCH_TYPE
  ) {
    throw new ApiError('链接无效，请重新扫码', 404);
  }

  if (slot.expiresAt.getTime() <= Date.now()) {
    throw new ApiError('链接已过期（有效期 24 小时），请让家长重新生成二维码', 410);
  }

  // 数据隔离：批次必须挂在演示账号名下
  await assertDemoOwner(slot.batch.userId);

  const session = await resolveJoinSession(slot);
  if (!session) {
    throw new ApiError('这场演示已结束或不存在', 404);
  }

  return { joinSlot: slot, session, completed: parseCompleted(session.completed) };
}

/** 三份都做完了吗 */
export function isAllCompleted(completed: Record<string, boolean>): boolean {
  return DEMO_JOIN_ROLES.every((role) => completed[role] === true);
}

/** 给每个 attempt 生成报告码（只读、24h、可多人查看） */
async function buildReportLinks(
  session: JoinSession
): Promise<DemoJoinReportLink[]> {
  // 不再等三份齐：每完成一份卷，就发该视角的报告码
  // （2026-11-01 朋大大：「完成一份测试就可以出一份对应的报告」）。
  // createReportShare 对同一 attempt 是幂等的（已有则直接复用），
  // 所以落地页反复刷新不会重复发码。
  const attempts = await prisma.sessionAttempt.findMany({
    where: { sessionId: session.id, report: { isNot: null } },
    orderBy: { createdAt: 'asc' },
  });

  const links: DemoJoinReportLink[] = [];
  for (const attempt of attempts) {
    try {
      const share = await createReportShare(
        session.child.userId,
        attempt.id,
        DEMO_EXPIRY_HOURS
      );
      links.push({
        role: attempt.questionnaireType,
        label:
          QUESTIONNAIRE_TYPE_LABEL[attempt.questionnaireType as DemoJoinRole] ??
          attempt.questionnaireType,
        url: share.shareUrl,
        code: share.shareCode,
        expiresAt: share.expiresAt.toISOString(),
      });
    } catch (err) {
      // 报告码生成失败不影响主流程（提交已经成功）
      console.error('[demo-join] 生成报告码失败:', err);
    }
  }
  return links;
}

// ───────────────────────────── 对外服务 ─────────────────────────────

/**
 * 设备端要加入码：这一场还缺哪些角色 + 一个加入码。
 *
 * 同一个 session 反复调用会复用同一个码（除非过期），
 * 免得设备反复刷新页面导致二维码一直变。
 */
export async function createDemoJoinCode(
  userId: string,
  sessionId: string
): Promise<DemoJoinCodeResult> {
  const session = (await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: { child: true },
  })) as JoinSession | null;

  if (!session) {
    throw new ApiError('测评会话不存在', 404);
  }
  if (session.child.userId !== userId) {
    throw new ApiError('无权访问该测评会话', 403);
  }

  // 数据隔离：这场演示必须属于演示账号
  await assertDemoOwner(session.child.userId);

  const completed = parseCompleted(session.completed);
  const missingRoles = buildRoleViews(session.stageId, completed).filter(
    (view) => view.status === 'pending'
  );

  // 复用还没过期的加入码（同一场反复调用别让二维码一直变）
  const existing = await findDemoJoinSlot(session);
  if (existing && existing.expiresAt.getTime() > Date.now()) {
    return buildCodeResult(existing, session, completed, missingRoles, false);
  }

  const expiresAt = expiresAtIn(DEMO_EXPIRY_HOURS);

  const batch = await prisma.shareBatch.create({
    data: {
      userId,
      stageId: session.stageId,
      questionnaireType: DEMO_JOIN_BATCH_TYPE,
      expiresAt,
    },
  });

  const joinCode = await uniqueSlotCode();
  const joinSlot = (await prisma.slot.create({
    data: {
      batchId: batch.id,
      type: DEMO_JOIN_SLOT_TYPE,
      code: joinCode,
      childId: session.childId,
      expiresAt,
    },
  })) as SlotRow;

  // 角色槽位：每个还缺的角色一个，提交那一刻才占用（先到先得）
  for (const view of missingRoles) {
    await prisma.slot.create({
      data: {
        batchId: batch.id,
        type: roleSlotType(view.role),
        code: await uniqueSlotCode(),
        childId: session.childId,
        expiresAt,
      },
    });
  }

  // 关联：会话 ⇄ 入口槽位（slotId 存的就是「通过哪个 Slot 来的」）
  // 只在 slotId 为空、或本来就指向 demo-join 槽位时改写，避免踩掉别的流程写的值
  const slotPointsToDemoJoin = !!existing;
  if (!session.slotId || slotPointsToDemoJoin) {
    await prisma.assessmentSession.update({
      where: { id: session.id },
      data: { slotId: joinSlot.id },
    });
  }

  return buildCodeResult(joinSlot, session, completed, missingRoles, true);
}

/** 找这个会话已关联的 demo-join 入口槽位（不判过期，过期判断在外面做） */
async function findDemoJoinSlot(session: JoinSession): Promise<JoinSlot | null> {
  if (!session.slotId) return null;
  const slot = (await prisma.slot.findUnique({
    where: { id: session.slotId },
    include: { batch: true },
  })) as JoinSlot | null;
  if (!slot) return null;
  if (slot.type !== DEMO_JOIN_SLOT_TYPE) return null;
  if (slot.batch.questionnaireType !== DEMO_JOIN_BATCH_TYPE) return null;
  return slot;
}

function buildCodeResult(
  joinSlot: SlotRow,
  session: JoinSession,
  completed: Record<string, boolean>,
  missingRoles: DemoJoinRoleView[],
  isNew: boolean
): DemoJoinCodeResult {
  const stageName = getQuestionnaire(session.stageId)?.name ?? session.stageId;
  return {
    code: joinSlot.code,
    path: `/demo/join?c=${joinSlot.code}`,
    expiresAt: joinSlot.expiresAt.toISOString(),
    sessionId: session.id,
    childId: session.childId,
    childName: session.child.name,
    stageId: session.stageId,
    stageName,
    completed,
    missingRoles,
    isNew,
  };
}

/** 落地页：查这场还缺哪些角色 */
export async function getDemoJoinInfo(code: string): Promise<DemoJoinInfo> {
  const { joinSlot, session, completed } = await loadJoinContext(code);
  const questionnaire = getQuestionnaire(session.stageId);

  return {
    code: joinSlot.code,
    stageId: session.stageId,
    stageName: questionnaire?.name ?? session.stageId,
    childName: session.child.name,
    expiresAt: joinSlot.expiresAt.toISOString(),
    completed,
    roles: buildRoleViews(session.stageId, completed),
    allCompleted: isAllCompleted(completed),
    reports: await buildReportLinks(session),
  };
}

/** 落地页：领取某个角色的作答权（不落库，提交时才占用名额） */
export async function claimDemoJoinRole(params: {
  code: string;
  role: string;
  name?: string;
}): Promise<DemoJoinClaim> {
  const role = normalizeRole(params.role);
  const { joinSlot, session, completed } = await loadJoinContext(params.code);

  const views = buildRoleViews(session.stageId, completed);
  const view = views.find((v) => v.role === role);
  if (!view) {
    throw new ApiError('这份卷在当前学段不可作答', 400);
  }
  if (view.status === 'completed') {
    throw new ApiError('这份卷已经有人填完了', 409);
  }

  const roleSlot = (await prisma.slot.findFirst({
    where: { batchId: joinSlot.batchId, type: roleSlotType(role) },
  })) as JoinSlot | null;

  if (!roleSlot) {
    throw new ApiError('这个角色的作答入口不存在，请重新扫码', 404);
  }
  if (roleSlot.usedAt) {
    throw new ApiError('这个角色的卷已经提交过了', 409);
  }

  const name = normalizeGuestName(params.name);
  const token = signDemoRoleToken(
    {
      code: joinSlot.code,
      slotId: roleSlot.id,
      sessionId: session.id,
      childId: session.childId,
      stageId: session.stageId,
      role,
      name: name || undefined,
    },
    DEMO_EXPIRY_HOURS
  );

  const questions = getDeviceQuestions(session.stageId, role);

  return {
    role,
    label: view.label,
    who: view.who,
    desc: view.desc,
    sample: view.sample,
    name,
    token,
    stageId: session.stageId,
    stageName: getQuestionnaire(session.stageId)?.name ?? session.stageId,
    childName: session.child.name,
    totalQuestions: questions.totalQuestions,
    dimensions: questions.dimensions,
    scale: questions.scale,
  };
}

/**
 * 撤销刚刚提交的那一份（演示现场的「我选错了」救命通道）。
 *
 * 背景：老师扫了码却选了「学生自评」，填完才发现 —— 这一份卷就废了，
 * 学生没法再填。这条接口让提交者本人把刚提交的那一份撤销掉，
 * 重新选角色再填一遍。
 *
 * 约束：
 *   - 只能撤销「自己 token 里的那个角色」的那一条 attempt
 *   - 提交者标记（Slot.usedBy）必须与 token 对得上
 *   - 加入码仍有效（24h 内）
 *
 * 代价：attempt 及其报告会被删除（demo 专用，可接受）。
 */
export async function voidDemoJoinAttempt(params: {
  token: string;
}): Promise<{ role: DemoJoinRole; label: string; name: string }> {
  const payload = verifyDemoRoleToken(params.token);
  const { session, completed } = await loadJoinContext(payload.code);

  if (!completed[payload.role]) {
    throw new ApiError('这份卷还没有提交过，无需撤销', 400);
  }

  const roleSlot = (await prisma.slot.findFirst({
    where: { id: payload.slotId },
  })) as SlotRow | null;

  // 提交者标记必须与 token 对得上（同一个「人」才能撤自己的）
  if (roleSlot?.usedBy && roleSlot.usedBy !== guestMarker(payload.name ?? '')) {
    throw new ApiError('这是别人提交的那一份，不能撤销', 403);
  }

  const attempt = await prisma.sessionAttempt.findFirst({
    where: { sessionId: session.id, questionnaireType: payload.role },
  });
  if (!attempt) {
    throw new ApiError('没有找到要撤销的提交记录', 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.reportShare.deleteMany({ where: { attemptId: attempt.id } });
    await tx.attemptReport.deleteMany({ where: { attemptId: attempt.id } });
    await tx.sessionAttempt.delete({ where: { id: attempt.id } });

    // 把完成标记退回去
    const fresh = await tx.assessmentSession.findUnique({
      where: { id: session.id },
      select: { completed: true },
    });
    const next = parseCompleted(fresh?.completed ?? session.completed);
    next[payload.role] = false;
    await tx.assessmentSession.update({
      where: { id: session.id },
      data: { completed: JSON.stringify(next) },
    });

    // 角色槽位还回去
    await tx.slot.updateMany({
      where: { id: payload.slotId },
      data: { usedAt: null, usedBy: null },
    });
  });

  return {
    role: payload.role,
    label: QUESTIONNAIRE_TYPE_LABEL[payload.role],
    name: payload.name ?? '',
  };
}

/** 落地页：免登录提交作答 */
export async function submitDemoJoinAnswers(params: {
  token: string;
  answers: unknown;
}): Promise<DemoJoinSubmitResult> {
  const payload = verifyDemoRoleToken(params.token);

  // 加入码本身也要再验一次（过期 / 被换掉）
  const { session, completed } = await loadJoinContext(payload.code);

  if (completed[payload.role]) {
    throw new ApiError('这份卷已经提交过了', 409);
  }

  const answers = validateAnswers(params.answers);

  // 题号必须属于「这个角色的这份卷」——防止串卷
  const questionnaire = getQuestionnaire(session.stageId);
  const questions = questionnaire
    ? getQuestionsForType(questionnaire, payload.role)
    : [];
  const expected = new Set(questions.map((q) => q.id));
  const unknownIds = Object.keys(answers).filter((id) => !expected.has(id));
  if (unknownIds.length > 0) {
    throw new ApiError('答案与这份卷对不上，请重新打开链接', 400);
  }
  const answered = Object.keys(answers).length;
  if (answered < questions.length) {
    throw new ApiError(`还有 ${questions.length - answered} 道题未作答`, 400);
  }

  // 一次性：原子占用角色槽位（谁先提交谁拿到，后来的直接被拒）
  const now = new Date();
  const claimed = await prisma.slot.updateMany({
    where: { id: payload.slotId, usedAt: null },
    data: { usedAt: now, usedBy: guestMarker(payload.name ?? '') },
  });
  if (claimed.count !== 1) {
    throw new ApiError('这个角色的卷刚刚被别人提交了', 409);
  }

  try {
    // 免登录提交：不传 userId → 不扣演示账号的测评次数、不触发积分/复测提醒
    const result = await submitAttempt(session.id, null, {
      questionnaireType: payload.role,
      answers,
    });

    const fresh = await prisma.assessmentSession.findUnique({
      where: { id: session.id },
      include: { child: true },
    });
    const freshCompleted = parseCompleted(fresh?.completed ?? session.completed);
    const allCompleted = isAllCompleted(freshCompleted);

    return {
      attemptId: result.attemptId,
      role: payload.role,
      label: QUESTIONNAIRE_TYPE_LABEL[payload.role],
      name: payload.name ?? '',
      submittedAt: now.toISOString(),
      completed: freshCompleted,
      allCompleted,
      // 每完成一份就带该份的报告码，不用等三份齐
      reports: await buildReportLinks((fresh as JoinSession | null) ?? session),
    };
  } catch (err) {
    // 提交失败 → 把角色槽位还回去，否则这一份卷就白白作废了
    await prisma.slot.updateMany({
      where: { id: payload.slotId, usedAt: { not: null } },
      data: { usedAt: null, usedBy: null },
    });
    throw err;
  }
}
