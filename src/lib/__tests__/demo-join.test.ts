import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma（必须在 import 业务模块之前）
vi.mock('@/lib/db', () => ({
  prisma: {
    slot: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    shareBatch: { create: vi.fn() },
    assessmentSession: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    sessionAttempt: { findMany: vi.fn(), findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

// Mock 提交与报告分享（真实实现要连库 / 生成报告）
vi.mock('@/lib/services/assessment.service', () => ({
  submitAttempt: vi.fn(),
}));

vi.mock('@/lib/services/report-share.service', () => ({
  createReportShare: vi.fn(),
}));

import { prisma } from '@/lib/db';
import { submitAttempt } from '@/lib/services/assessment.service';
import { createReportShare } from '@/lib/services/report-share.service';
import { getQuestionnaire } from '@/data/questionnaires';
import {
  generateDemoJoinCode,
  resolveMissingRoles,
  parseCompleted,
  normalizeRole,
  normalizeGuestName,
  guestMarker,
  parseGuestMarker,
  roleSlotType,
  buildRoleViews,
  isAllCompleted,
  DEMO_JOIN_CODE_ALPHABET,
  DEMO_JOIN_CODE_LENGTH,
  DEMO_JOIN_ROLES,
  DEMO_JOIN_BATCH_TYPE,
  DEMO_JOIN_SLOT_TYPE,
  getDemoJoinInfo,
  claimDemoJoinRole,
  submitDemoJoinAnswers,
  createDemoJoinCode,
  voidDemoJoinAttempt,
} from '@/lib/services/demo-join.service';
import { signDemoRoleToken, verifyDemoRoleToken } from '@/lib/demo-join-token';

const mockSlotFindUnique = prisma.slot.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockSlotFindFirst = prisma.slot.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockSlotCreate = prisma.slot.create as unknown as ReturnType<typeof vi.fn>;
const mockSlotUpdateMany = prisma.slot.updateMany as unknown as ReturnType<typeof vi.fn>;
const mockBatchCreate = prisma.shareBatch.create as unknown as ReturnType<typeof vi.fn>;
const mockSessionFindUnique = prisma.assessmentSession.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockSessionFindFirst = prisma.assessmentSession.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockSessionUpdate = prisma.assessmentSession.update as unknown as ReturnType<typeof vi.fn>;
const mockAttemptFindMany = prisma.sessionAttempt.findMany as unknown as ReturnType<typeof vi.fn>;
const mockSessionAttemptFindFirst = prisma.sessionAttempt.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;

// 事务里用的 tx
const mockTxReportShareDeleteMany = vi.fn();
const mockTxAttemptReportDeleteMany = vi.fn();
const mockTxAttemptDelete = vi.fn();
const mockTxSessionFindUnique = vi.fn();
const mockTxSessionUpdate = vi.fn();
const mockTxSlotUpdateMany = vi.fn();
const tx = {
  reportShare: { deleteMany: mockTxReportShareDeleteMany },
  attemptReport: { deleteMany: mockTxAttemptReportDeleteMany },
  sessionAttempt: { delete: mockTxAttemptDelete },
  assessmentSession: {
    findUnique: mockTxSessionFindUnique,
    update: mockTxSessionUpdate,
  },
  slot: { updateMany: mockTxSlotUpdateMany },
};
const mockSubmitAttempt = submitAttempt as unknown as ReturnType<typeof vi.fn>;
const mockCreateReportShare = createReportShare as unknown as ReturnType<typeof vi.fn>;

const CODE = 'abcdefgh2345';

function makeJoinSlot(overrides: Record<string, unknown> = {}) {
  return {
    id: 'slot-join',
    batchId: 'batch-1',
    type: DEMO_JOIN_SLOT_TYPE,
    code: CODE,
    usedAt: null,
    usedBy: null,
    childId: 'child-1',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    batch: {
      id: 'batch-1',
      userId: 'demo-user',
      stageId: 'primary-low',
      questionnaireType: DEMO_JOIN_BATCH_TYPE,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
    ...overrides,
  };
}

function makeSession(
  completed: Record<string, boolean> = {},
  overrides: Record<string, unknown> = {}
) {
  return {
    id: 'session-1',
    childId: 'child-1',
    stageId: 'primary-low',
    slotId: 'slot-join',
    completed: JSON.stringify({
      parent: false,
      student: false,
      teacher: false,
      ...completed,
    }),
    child: { id: 'child-1', name: '演示-男', userId: 'demo-user' },
    ...overrides,
  };
}

/** 教师卷的全部题号 */
function teacherQuestionIds(): string[] {
  const q = getQuestionnaire('primary-low');
  return (q?.teacherQuestions ?? []).map((item) => item.id);
}

/** 一份「全部答完」的教师卷答案 */
function fullTeacherAnswers(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const id of teacherQuestionIds()) map[id] = 3;
  return map;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DEMO_USER_PHONE = '19900000000';

  // 数据隔离检查：批次/会话的归属账号必须是演示账号
  mockUserFindUnique.mockResolvedValue({ phone: '19900000000' });

  // 按查询条件区分：加入码/入口槽位查得到，别的（查重等）查不到
  mockSlotFindUnique.mockImplementation(
    async (args: { where?: { code?: string; id?: string } }) => {
      const where = args?.where ?? {};
      if (where.code === CODE) return makeJoinSlot();
      if (where.id === 'slot-join') return makeJoinSlot();
      return null;
    }
  );

  mockSessionFindFirst.mockResolvedValue(makeSession());
  mockSessionFindUnique.mockResolvedValue(makeSession());
  mockAttemptFindMany.mockResolvedValue([]);
  mockTxSessionFindUnique.mockResolvedValue({
    completed: JSON.stringify({ parent: false, student: false, teacher: true }),
  });
});

// ───────────────────────── 纯函数 ─────────────────────────

describe('加入码生成', () => {
  it('12 位、字符集内、不含易混字符', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateDemoJoinCode();
      expect(code).toHaveLength(DEMO_JOIN_CODE_LENGTH);
      for (const ch of code) {
        expect(DEMO_JOIN_CODE_ALPHABET).toContain(ch);
      }
      expect(code).not.toMatch(/[lo01]/);
    }
  });

  it('两次生成不一样', () => {
    expect(generateDemoJoinCode()).not.toBe(generateDemoJoinCode());
  });
});

describe('还缺哪些角色', () => {
  it('全没做 → 三个角色都缺', () => {
    expect(resolveMissingRoles({})).toEqual(['parent', 'student', 'teacher']);
  });

  it('做掉的不再出现', () => {
    expect(resolveMissingRoles({ parent: true })).toEqual(['student', 'teacher']);
    expect(resolveMissingRoles({ parent: true, student: true })).toEqual(['teacher']);
    expect(resolveMissingRoles({ parent: true, student: true, teacher: true })).toEqual([]);
  });

  it('completed 是脏 JSON 也不会炸', () => {
    expect(parseCompleted('not-json')).toEqual({
      parent: false,
      student: false,
      teacher: false,
    });
    expect(parseCompleted(null).parent).toBe(false);
    expect(parseCompleted(JSON.stringify({ teacher: true })).teacher).toBe(true);
  });
});

describe('角色与姓名的清洗', () => {
  it('只认三种角色', () => {
    expect(normalizeRole('student')).toBe('student');
    expect(normalizeRole('teacher')).toBe('teacher');
    expect(() => normalizeRole('admin')).toThrow('角色不合法');
    expect(() => normalizeRole(undefined)).toThrow('角色不合法');
  });

  it('姓名去空白、限 20 字、去控制字符', () => {
    expect(normalizeGuestName('  张老师  ')).toBe('张老师');
    expect(normalizeGuestName('a'.repeat(50))).toHaveLength(20);
    expect(normalizeGuestName('张\u0000老师')).toBe('张老师');
    expect(normalizeGuestName(undefined)).toBe('');
  });

  it('免登录标记能取回姓名', () => {
    expect(guestMarker('张老师')).toBe('demo-guest:张老师');
    expect(parseGuestMarker(guestMarker('张老师'))).toBe('张老师');
    expect(parseGuestMarker(guestMarker(''))).toBe('');
    expect(parseGuestMarker(null)).toBe('');
  });

  it('角色槽位类型带前缀，不跟生产撞', () => {
    expect(roleSlotType('teacher')).toBe('demo-role-teacher');
    expect(roleSlotType('student')).toBe('demo-role-student');
  });
});

describe('角色卡文案', () => {
  it('列出三个角色，已完成的标 completed', () => {
    const views = buildRoleViews('primary-low', { parent: true });
    expect(views.map((v) => v.role)).toEqual(['parent', 'student', 'teacher']);
    expect(views[0].status).toBe('completed');
    expect(views[1].status).toBe('pending');
    // 每个角色都有「谁填」和示例题（防串卷）
    for (const v of views) {
      expect(v.who.length).toBeGreaterThan(0);
      expect(v.sample.length).toBeGreaterThan(0);
      expect(v.totalQuestions).toBeGreaterThan(0);
    }
  });

  it('教师卷示例题是第三人称，学生卷是第一人称', () => {
    const views = buildRoleViews('primary-low', {});
    const student = views.find((v) => v.role === 'student')!;
    const teacher = views.find((v) => v.role === 'teacher')!;
    expect(student.sample.includes('你')).toBe(true);
    expect(teacher.sample.includes('该生')).toBe(true);
  });
});

// ───────────────────────── 角色凭证 ─────────────────────────

describe('角色凭证', () => {
  const payload = {
    code: CODE,
    slotId: 'slot-role',
    sessionId: 'session-1',
    childId: 'child-1',
    stageId: 'primary-low',
    role: 'teacher' as const,
    name: '张老师',
  };

  it('签发后能验回来，角色写死在凭证里', () => {
    const token = signDemoRoleToken(payload, 24);
    const decoded = verifyDemoRoleToken(token);
    expect(decoded.role).toBe('teacher');
    expect(decoded.sessionId).toBe('session-1');
    expect(decoded.name).toBe('张老师');
  });

  it('改了内容就废（签名对不上）', () => {
    const token = signDemoRoleToken(payload, 24);
    const [header, body, sig] = token.split('.');
    const tampered = `${header}.${body.slice(0, -2)}XY.${sig}`;
    expect(() => verifyDemoRoleToken(tampered)).toThrow(/作答凭证无效/);
  });

  it('过期凭证直接废', () => {
    const token = signDemoRoleToken(payload, -1);
    expect(() => verifyDemoRoleToken(token)).toThrow(/作答凭证无效/);
  });

  it('不是凭证的字符串直接废', () => {
    expect(() => verifyDemoRoleToken('hello')).toThrow(/作答凭证无效/);
  });
});

// ───────────────────────── 落地页查询 ─────────────────────────

describe('getDemoJoinInfo', () => {
  it('码不存在 → 404', async () => {
    mockSlotFindUnique.mockImplementation(async () => null);
    await expect(getDemoJoinInfo('nope')).rejects.toThrow('链接无效');
  });

  it('不是演示批次 → 404', async () => {
    mockSlotFindUnique.mockImplementation(async () =>
      makeJoinSlot({
        batch: { ...makeJoinSlot().batch, questionnaireType: 'register' },
      })
    );
    await expect(getDemoJoinInfo(CODE)).rejects.toThrow('链接无效');
  });

  it('批次不属于演示账号 → 403（数据隔离）', async () => {
    mockUserFindUnique.mockResolvedValue({ phone: '13800138000' });
    await expect(getDemoJoinInfo(CODE)).rejects.toThrow('演示专用接口不可用');
  });

  it('过期 → 410', async () => {
    mockSlotFindUnique.mockImplementation(async () =>
      makeJoinSlot({ expiresAt: new Date(Date.now() - 1000) })
    );
    await expect(getDemoJoinInfo(CODE)).rejects.toThrow('链接已过期');
  });

  it('正常 → 返回这一场还缺的角色', async () => {
    mockSessionFindFirst.mockResolvedValue(makeSession({ parent: true }));
    const info = await getDemoJoinInfo(CODE);
    expect(info.childName).toBe('演示-男');
    expect(info.stageName).toContain('小学低年级');
    expect(info.roles.find((r) => r.role === 'parent')!.status).toBe('completed');
    expect(info.roles.find((r) => r.role === 'teacher')!.status).toBe('pending');
    expect(info.allCompleted).toBe(false);
    expect(info.reports).toEqual([]);
  });

  it('三份都齐 → 返回三个报告码', async () => {
    mockSessionFindFirst.mockResolvedValue(
      makeSession({ parent: true, student: true, teacher: true })
    );
    mockAttemptFindMany.mockResolvedValue([
      { id: 'a1', questionnaireType: 'parent' },
      { id: 'a2', questionnaireType: 'student' },
      { id: 'a3', questionnaireType: 'teacher' },
    ]);
    mockCreateReportShare.mockImplementation(async (_userId: string, attemptId: string) => ({
      shareCode: `code-${attemptId}`,
      shareUrl: `/shared/report/code-${attemptId}`,
      expiresAt: new Date(Date.now() + 3600_000),
    }));

    const info = await getDemoJoinInfo(CODE);
    expect(info.allCompleted).toBe(true);
    expect(info.reports).toHaveLength(3);
    expect(info.reports[2].label).toBe('教师评价');
    expect(info.reports[0].url).toBe('/shared/report/code-a1');
  });
});

// ───────────────────────── 领取角色 ─────────────────────────

describe('claimDemoJoinRole', () => {
  it('这份卷已完成 → 409', async () => {
    mockSessionFindFirst.mockResolvedValue(makeSession({ teacher: true }));
    await expect(claimDemoJoinRole({ code: CODE, role: 'teacher' })).rejects.toThrow(
      '已经有人填完'
    );
  });

  it('角色槽位已被占用 → 409', async () => {
    mockSlotFindFirst.mockResolvedValue(
      makeJoinSlot({ id: 'slot-role', type: 'demo-role-teacher', usedAt: new Date() })
    );
    await expect(claimDemoJoinRole({ code: CODE, role: 'teacher' })).rejects.toThrow(
      '已经提交过'
    );
  });

  it('正常领取 → 拿到角色凭证和题目', async () => {
    mockSlotFindFirst.mockResolvedValue(
      makeJoinSlot({ id: 'slot-role', type: 'demo-role-teacher' })
    );
    const claim = await claimDemoJoinRole({
      code: CODE,
      role: 'teacher',
      name: '张老师',
    });

    expect(claim.role).toBe('teacher');
    expect(claim.label).toBe('教师评价');
    expect(claim.name).toBe('张老师');
    expect(claim.totalQuestions).toBeGreaterThan(0);
    expect(claim.dimensions.length).toBeGreaterThan(0);

    const decoded = verifyDemoRoleToken(claim.token);
    expect(decoded.role).toBe('teacher');
    expect(decoded.sessionId).toBe('session-1');
  });

  it('角色不合法 → 400', async () => {
    await expect(claimDemoJoinRole({ code: CODE, role: 'admin' })).rejects.toThrow(
      '角色不合法'
    );
  });
});

// ───────────────────────── 免登录提交 ─────────────────────────

describe('submitDemoJoinAnswers', () => {
  it('角色已完成 → 409', async () => {
    mockSessionFindFirst.mockResolvedValue(makeSession({ teacher: true }));
    await expect(
      submitDemoJoinAnswers({ token: makeToken(), answers: fullTeacherAnswers() })
    ).rejects.toThrow('已经提交过');
  });

  it('名额被别人抢走 → 409', async () => {
    mockSlotUpdateMany.mockResolvedValue({ count: 0 });
    await expect(
      submitDemoJoinAnswers({ token: makeToken(), answers: fullTeacherAnswers() })
    ).rejects.toThrow('刚刚被别人提交');
  });

  it('成功 → 提交到同一个 session，角色取自凭证', async () => {
    mockSlotUpdateMany.mockResolvedValue({ count: 1 });
    mockSubmitAttempt.mockResolvedValue({ attemptId: 'attempt-1' });
    mockSessionFindUnique.mockResolvedValue(
      makeSession({ parent: true, student: true, teacher: true })
    );
    mockAttemptFindMany.mockResolvedValue([
      { id: 'attempt-1', questionnaireType: 'teacher' },
    ]);
    mockCreateReportShare.mockResolvedValue({
      shareCode: 'share-1',
      shareUrl: '/shared/report/share-1',
      expiresAt: new Date(Date.now() + 3600_000),
    });

    const result = await submitDemoJoinAnswers({
      token: makeToken(),
      answers: fullTeacherAnswers(),
    });

    expect(result.attemptId).toBe('attempt-1');
    expect(result.role).toBe('teacher');
    expect(result.allCompleted).toBe(true);
    expect(result.reports).toHaveLength(1);

    // 关键：attempt 必须挂在同一个 session 下，且角色来自凭证（客户端改不了）
    expect(mockSubmitAttempt).toHaveBeenCalledWith(
      'session-1',
      null,
      expect.objectContaining({ questionnaireType: 'teacher' })
    );
  });

  it('提交失败 → 角色槽位还回去（不能白白作废）', async () => {
    mockSlotUpdateMany.mockResolvedValue({ count: 1 });
    mockSubmitAttempt.mockRejectedValue(new Error('答案不合法'));

    await expect(
      submitDemoJoinAnswers({ token: makeToken(), answers: fullTeacherAnswers() })
    ).rejects.toThrow('答案不合法');

    // 第二次 updateMany 是「还回去」
    expect(mockSlotUpdateMany).toHaveBeenCalledTimes(2);
    expect(mockSlotUpdateMany.mock.calls[1][0]).toMatchObject({
      data: { usedAt: null, usedBy: null },
    });
  });

  it('题号不属于这份卷 → 400（防串卷）', async () => {
    mockSlotUpdateMany.mockResolvedValue({ count: 1 });
    await expect(
      submitDemoJoinAnswers({
        token: makeToken(),
        answers: { 'not-a-real-question': 3 },
      })
    ).rejects.toThrow('答案与这份卷对不上');
  });

  it('没答完 → 400', async () => {
    mockSlotUpdateMany.mockResolvedValue({ count: 1 });
    await expect(
      submitDemoJoinAnswers({ token: makeToken(), answers: {} })
    ).rejects.toThrow('道题未作答');
  });
});

function makeToken(): string {
  return signDemoRoleToken(
    {
      code: CODE,
      slotId: 'slot-role',
      sessionId: 'session-1',
      childId: 'child-1',
      stageId: 'primary-low',
      role: 'teacher',
      name: '张老师',
    },
    24
  );
}

// ───────────────────────── 撤销（选错了） ─────────────────────────

describe('voidDemoJoinAttempt', () => {
  it('没提交过 → 400', async () => {
    await expect(voidDemoJoinAttempt({ token: makeToken() })).rejects.toThrow(
      '还没有提交过'
    );
  });

  it('别人提交的那一份 → 403', async () => {
    mockSessionFindFirst.mockResolvedValue(makeSession({ teacher: true }));
    mockSlotFindFirst.mockResolvedValue(
      makeJoinSlot({ id: 'slot-role', type: 'demo-role-teacher', usedBy: 'demo-guest:李老师' })
    );
    await expect(voidDemoJoinAttempt({ token: makeToken() })).rejects.toThrow(
      '不能撤销'
    );
  });

  it('撤销成功 → attempt/报告被删，完成标记退回去，名额释放', async () => {
    mockSessionFindFirst.mockResolvedValue(makeSession({ teacher: true }));
    mockSlotFindFirst.mockResolvedValue(
      makeJoinSlot({
        id: 'slot-role',
        type: 'demo-role-teacher',
        usedBy: 'demo-guest:张老师',
      })
    );
    mockSessionAttemptFindFirst.mockResolvedValue({ id: 'attempt-1' });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(tx);
    });

    const result = await voidDemoJoinAttempt({ token: makeToken() });
    expect(result.role).toBe('teacher');

    // 事务里删了报告、attempt，完成了标记退回 false，槽位释放
    expect(mockTxReportShareDeleteMany).toHaveBeenCalledWith({
      where: { attemptId: 'attempt-1' },
    });
    expect(mockTxAttemptReportDeleteMany).toHaveBeenCalledWith({
      where: { attemptId: 'attempt-1' },
    });
    expect(mockTxAttemptDelete).toHaveBeenCalledWith({ where: { id: 'attempt-1' } });
    expect(mockTxSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { completed: JSON.stringify({ parent: false, student: false, teacher: false }) },
      })
    );
    expect(mockTxSlotUpdateMany).toHaveBeenCalledWith({
      where: { id: 'slot-role' },
      data: { usedAt: null, usedBy: null },
    });
  });
});

// ───────────────────────── 设备端要码 ─────────────────────────

describe('createDemoJoinCode', () => {
  it('新建批次 + 入口码 + 角色槽位，并关联会话', async () => {
    mockSessionFindUnique.mockResolvedValue(
      makeSession({ parent: true }, { slotId: null })
    );
    mockBatchCreate.mockResolvedValue({ id: 'batch-new' });
    mockSlotCreate
      .mockResolvedValueOnce({
        id: 'slot-new',
        batchId: 'batch-new',
        type: DEMO_JOIN_SLOT_TYPE,
        code: 'newcode123456',
        usedAt: null,
        usedBy: null,
        childId: 'child-1',
        expiresAt: new Date(Date.now() + 3600_000),
      })
      .mockResolvedValue({ id: 'slot-role-x' });

    const result = await createDemoJoinCode('demo-user', 'session-1');

    expect(result.code).toBe('newcode123456');
    expect(result.path).toBe('/demo/join?c=newcode123456');
    expect(result.isNew).toBe(true);
    // parent 已完成 → 只给剩下两个角色开槽位
    expect(result.missingRoles.map((r) => r.role)).toEqual(['student', 'teacher']);
    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-1' },
        data: { slotId: 'slot-new' },
      })
    );
  });

  it('已有没过期的码 → 复用同一个', async () => {
    mockSessionFindUnique.mockResolvedValue(makeSession({ parent: true }));
    const result = await createDemoJoinCode('demo-user', 'session-1');
    expect(result.isNew).toBe(false);
    expect(result.code).toBe(CODE);
    expect(mockBatchCreate).not.toHaveBeenCalled();
  });

  it('会话不属于该账号 → 403', async () => {
    mockSessionFindUnique.mockResolvedValue(
      makeSession({}, {
        child: { id: 'child-1', name: '演示-男', userId: 'other-user' },
      })
    );
    await expect(createDemoJoinCode('demo-user', 'session-1')).rejects.toThrow(
      '无权访问该测评会话'
    );
  });

  it('会话不存在 → 404', async () => {
    mockSessionFindUnique.mockResolvedValue(null);
    await expect(createDemoJoinCode('demo-user', 'session-1')).rejects.toThrow(
      '测评会话不存在'
    );
  });
});

describe('角色集合', () => {
  it('三个角色：家长/学生/老师', () => {
    expect(DEMO_JOIN_ROLES).toEqual(['parent', 'student', 'teacher']);
    expect(isAllCompleted({ parent: true, student: true, teacher: true })).toBe(true);
    expect(isAllCompleted({ parent: true, student: true, teacher: false })).toBe(false);
  });
});
