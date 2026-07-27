import { NextRequest } from 'next/server';
import { createSession, createSessionBySlot, getHistorySessions } from '@/lib/services/assessment.service';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { ApiError, apiError, parseJsonBody } from '@/lib/api/response';

interface CreateSessionBody {
  slotCode?: string;
  childId?: string;
  stageId?: string;
}

// 创建测评 session
// 支持两种方式：
// 1. 登录用户：通过 childId 创建
// 2. 分享链接：通过 slotCode 创建
export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody<CreateSessionBody>(request);
    const { slotCode, childId, stageId } = body;

    // 如果有 slotCode，通过 slot 创建（分享流程）
    if (slotCode) {
      if (!childId) {
        return apiError('请提供孩子 ID', 400);
      }
      const session = await createSessionBySlot(slotCode, childId);
      return apiSuccess(session, 201);
    }

    // 如果是登录用户，通过 childId 创建
    // 注意：这个路径需要认证
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('请先登录', 401);
    }

    // 解析 token 获取用户
    const token = authHeader.slice(7);
    const { verifyToken } = await import('@/lib/auth/jwt');
    const { prisma } = await import('@/lib/db');
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return apiError('用户不存在', 401);
    }

    if (!childId || !stageId) {
      return apiError('请提供孩子 ID 和学段', 400);
    }

    const session = await createSession(user.id, { childId, stageId });
    return apiSuccess(session, 201);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.status);
    }
    console.error('Create session error:', error);
    return apiError('创建会话失败', 500);
  }
}

// 获取用户所有孩子的测评历史
export const GET = withAuth(async (request, context) => {
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId') ?? undefined;
  const stageId = searchParams.get('stageId') ?? undefined;
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  const history = await getHistorySessions(context.user.id, { childId, stageId, limit });
  return apiSuccess(history);
});
