import { NextRequest } from 'next/server';
import { createShareBatch } from '@/lib/services/share.service';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { ApiError, apiError } from '@/lib/api/response';
import { resolveExpiryHours } from '@/lib/services/expiry';

export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const { childId, stageId, questionnaireType, slotCount, expiresInHours, expiresInDays } = body;

    if (!stageId || !questionnaireType) {
      return apiError('请提供学段和问卷类型', 400);
    }

    if (!['register', 'student', 'teacher'].includes(questionnaireType)) {
      return apiError('无效的问卷类型', 400);
    }

    // student/teacher 类型必须提供 childId
    if ((questionnaireType === 'student' || questionnaireType === 'teacher') && !childId) {
      return apiError('邀请孩子/老师测评时必须提供孩子档案', 400);
    }

    // 有效期统一按【小时】算（src/lib/services/expiry.ts）。
    // 默认 48 小时 = 原来的 2 天，保持网页端既有行为不变；
    // 演示链路的 24 小时由演示接口显式传 expiresInHours=24，不在这里全局改。
    const batch = await createShareBatch(
      context.user.id,
      stageId,
      questionnaireType,
      slotCount || 1,
      resolveExpiryHours(expiresInHours, expiresInDays, 48),
      childId
    );

    const slot = batch.slots[0];
    let shareUrl: string;

    if (questionnaireType === 'register') {
      shareUrl = `/register?share=${batch.batch.id}&slot=${slot?.code || ''}`;
    } else {
      // student or teacher - slot 已绑定 childId，URL 不再需要传递 childId
      shareUrl = `/assessment/${stageId}/${questionnaireType}?share=${batch.batch.id}&slot=${slot?.code || ''}`;
    }

    return apiSuccess({
      batchId: batch.batch.id,
      stageId: batch.batch.stageId,
      questionnaireType: batch.batch.questionnaireType,
      shareUrl,
      slotCount: batch.slots.length,
      expiresAt: batch.batch.expiresAt,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status);
    }
    console.error('Create share batch error:', error);
    return apiError('创建分享失败', 500);
  }
});
