import { NextRequest } from 'next/server';
import { apiSuccess, ApiError } from '@/lib/api/response';
import { withDeviceAuth } from '@/lib/device-auth';
import { requireDemoDevice, normalizeDemoGender, genderLabel } from '@/lib/demo';
import { prisma } from '@/lib/db';
import { validateStageId } from '@/lib/validators';
import { createSession } from '@/lib/services/assessment.service';
import { getQuestionnaire, stages } from '@/data/questionnaires';
import { resolveNextType } from '@/lib/questionnaire-flow';

/**
 * POST /api/device/demo/session
 *
 * 演示专用：开始一场演示测评。
 *
 * body:
 * - stageId  六个学段之一
 * - gender   孩子性别（MALE / FEMALE，大小写、中英文都吃）
 *
 * 行为：
 *   1. 建一个**临时孩子**（Child），归属演示账号
 *      → 每场演示一个临时孩子，多人来测互不干扰
 *   2. 建测评会话（AssessmentSession），三视角（家长/学生/老师）都没做
 *
 * 孩子档案里不存生日等真实信息 —— 演示只需要性别。
 */
export const POST = withDeviceAuth(async (request: NextRequest, device) => {
  await requireDemoDevice(device.userId);

  let body: { stageId?: unknown; gender?: unknown };
  try {
    body = (await request.json()) as { stageId?: unknown; gender?: unknown };
  } catch {
    throw new ApiError('请求格式错误', 400);
  }

  const stageId = validateStageId(body.stageId);
  const gender = normalizeDemoGender(body.gender);
  if (!gender) {
    throw new ApiError('请选择孩子性别', 400);
  }

  const questionnaire = getQuestionnaire(stageId);
  if (!questionnaire) {
    throw new ApiError('该学段问卷不存在', 404);
  }

  const stageName = stages[stageId as keyof typeof stages]?.name ?? stageId;

  const child = await prisma.child.create({
    data: {
      userId: device.userId,
      name: `演示-${genderLabel(gender)}`,
      gender,
      grade: stageName,
    },
  });

  const session = await createSession(device.userId, {
    childId: child.id,
    stageId,
  });

  return apiSuccess(
    {
      sessionId: session.id,
      childId: child.id,
      childName: child.name,
      stageId,
      stageName,
      gender,
      // 第一个该做的视角：家长卷
      nextType: resolveNextType({ parent: false, student: false, teacher: false }),
    },
    201
  );
});
