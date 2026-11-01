import { NextRequest } from 'next/server';
import { apiSuccess, ApiError } from '@/lib/api/response';
import { withDeviceAuth } from '@/lib/device-auth';
import { requireOwnedSession } from '@/lib/device-session';
import {
  resolveNextType,
  QUESTIONNAIRE_TYPE_LABEL,
  type QuestionnaireType,
} from '@/lib/questionnaire-flow';

/**
 * GET /api/device/session/next?sessionId=xxx
 *
 * 告诉设备「这场测评接下来该做哪一份卷」。
 *
 * 演示场景（2026-10-31 朋大大拍板）：
 *   家长卷做完 → 提示「接着做孩子卷」→ 孩子卷做完 → 出老师卷二维码
 *   （老师卷走二维码，不占设备流程，所以默认不含 teacher）
 *
 * 数据来源：AssessmentSession.completed（提交 attempt 时由
 * assessment.service.ts 维护 completed[type]=true）
 */
export const GET = withDeviceAuth(async (request: NextRequest, device) => {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) {
    throw new ApiError('请提供 session ID', 400);
  }

  const session = await requireOwnedSession(sessionId, device.userId);
  const completed = JSON.parse(session.completed) as Record<string, boolean>;

  // 设备流程只覆盖家长卷 + 学生卷；老师卷通过二维码单独发起
  const nextType = resolveNextType(completed, { includeTeacher: false });

  return apiSuccess({
    sessionId: session.id,
    stageId: session.stageId,
    childId: session.childId,
    childName: session.child.name,
    completed,
    nextType,
    nextLabel: nextType ? QUESTIONNAIRE_TYPE_LABEL[nextType as QuestionnaireType] : null,
    // 家长卷和学生卷都做完了 → 该出老师码了
    needTeacherCode: nextType === null && !completed.teacher,
  });
});
