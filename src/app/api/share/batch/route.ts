import { NextRequest } from 'next/server';
import { createShareBatch } from '@/lib/services/share.service';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { ApiError, apiError } from '@/lib/api/response';

export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const { stageId, questionnaireType, slotCount, expiresInDays } = body;

    if (!stageId || !questionnaireType) {
      return apiError('请提供学段和问卷类型', 400);
    }

    if (!['register', 'student', 'teacher'].includes(questionnaireType)) {
      return apiError('无效的问卷类型', 400);
    }

    const batch = await createShareBatch(
      context.user.id,
      stageId,
      questionnaireType,
      slotCount || 10,
      expiresInDays || 2
    );

    return apiSuccess({
      batch: {
        id: batch.batch.id,
        stageId: batch.batch.stageId,
        questionnaireType: batch.batch.questionnaireType,
        expiresAt: batch.batch.expiresAt,
      },
      slots: batch.slots.map(slot => ({
        code: slot.code,
        type: slot.type,
        expiresAt: slot.expiresAt,
      })),
      shareUrl: `/register?share=${batch.batch.id}&slot=${batch.slots[0]?.code || ''}`,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status);
    }
    console.error('Create share batch error:', error);
    return apiError('创建分享失败', 500);
  }
});
