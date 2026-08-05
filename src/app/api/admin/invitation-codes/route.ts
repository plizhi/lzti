import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { prisma } from '@/lib/db';
import { createShareBatch } from '@/lib/services/share.service';
import { ApiError, apiError } from '@/lib/api/response';

// GET /api/admin/invitation-codes?type=batches|slots|user-codes&page=1&limit=20
export const GET = withAuth(async (request: NextRequest, context) => {
  if (context.user.role !== 'ADMIN') {
    return apiError('需要管理员权限', 403);
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'batches';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const offset = (page - 1) * limit;

  if (type === 'batches') {
    const [batches, total] = await Promise.all([
      prisma.shareBatch.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          slots: {
            select: {
              id: true,
              code: true,
              type: true,
              usedBy: true,
              usedAt: true,
              expiresAt: true,
              childId: true,
            },
          },
        },
      }),
      prisma.shareBatch.count(),
    ]);

    const batchesWithStats = batches.map((batch) => ({
      id: batch.id,
      stageId: batch.stageId,
      questionnaireType: batch.questionnaireType,
      createdAt: batch.createdAt,
      expiresAt: batch.expiresAt,
      totalSlots: batch.slots.length,
      usedSlots: batch.slots.filter((s) => s.usedBy).length,
      availableSlots: batch.slots.filter((s) => !s.usedBy && s.expiresAt > new Date()).length,
    }));

    return apiSuccess({
      batches: batchesWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  if (type === 'slots') {
    const [slots, total] = await Promise.all([
      prisma.slot.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          batch: {
            select: {
              id: true,
              stageId: true,
              questionnaireType: true,
              userId: true,
            },
          },
        },
      }),
      prisma.slot.count(),
    ]);

    return apiSuccess({
      slots: slots.map((slot) => ({
        id: slot.id,
        code: slot.code,
        type: slot.type,
        usedBy: slot.usedBy,
        usedAt: slot.usedAt,
        expiresAt: slot.expiresAt,
        childId: slot.childId,
        batchId: slot.batchId,
        stageId: slot.batch.stageId,
        batchType: slot.batch.questionnaireType,
        batchUserId: slot.batch.userId,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  if (type === 'user-codes') {
    const [codes, total] = await Promise.all([
      prisma.userInviteCode.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.userInviteCode.count(),
    ]);

    // 收集所有 userId
    const userIds = [...new Set(codes.map((c) => c.userId).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, phone: true, status: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return apiSuccess({
      codes: codes.map((code) => ({
        id: code.id,
        code: code.code,
        usedBy: code.usedBy,
        usedAt: code.usedAt,
        createdAt: code.createdAt,
        userId: code.userId,
        userPhone: userMap.get(code.userId)?.phone || null,
        userStatus: userMap.get(code.userId)?.status || null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  return apiError('无效的 type 参数', 400);
});

// POST /api/admin/invitation-codes - 创建分享批次
export const POST = withAuth(async (request: NextRequest, context) => {
  if (context.user.role !== 'ADMIN') {
    return apiError('需要管理员权限', 403);
  }

  try {
    const body = await request.json();
    const { userId, stageId, questionnaireType, slotCount, expiresInDays } = body;

    if (!userId) {
      return apiError('请提供用户 ID', 400);
    }

    if (!stageId || !questionnaireType) {
      return apiError('请提供学段和问卷类型', 400);
    }

    if (!['register', 'student', 'teacher'].includes(questionnaireType)) {
      return apiError('无效的问卷类型', 400);
    }

    const batch = await createShareBatch(
      userId,
      stageId,
      questionnaireType,
      slotCount || 10,
      expiresInDays || 2
    );

    return apiSuccess({
      batchId: batch.batch.id,
      stageId: batch.batch.stageId,
      questionnaireType: batch.batch.questionnaireType,
      slotCount: batch.slots.length,
      expiresAt: batch.batch.expiresAt,
      slots: batch.slots.map((s) => ({
        id: s.id,
        code: s.code,
      })),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status);
    }
    console.error('Create share batch error:', error);
    return apiError('创建分享失败', 500);
  }
});
