import { NextRequest } from 'next/server';
import { submitAttempt } from '@/lib/services/assessment.service';
import { setPendingAccountExpiration } from '@/lib/services/cleanup.service';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { ApiError } from '@/lib/api/response';

// 提交测评答案
// 支持认证和未认证两种方式：
// 1. 认证用户：验证 session 属于该用户
// 2. 未认证（slot 流程）：只验证 session 存在
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const sessionIdIndex = pathParts.indexOf('sessions') + 1;
    const sessionId = pathParts[sessionIdIndex];

    const body = await request.json();
    const authHeader = request.headers.get('Authorization');

    let userId: string | null = null;

    // 如果有认证信息，验证用户
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { verifyToken } = await import('@/lib/auth/jwt');
      const payload = verifyToken(token);
      userId = payload.userId;
    }

    const result = await submitAttempt(sessionId, userId, {
      questionnaireType: body.questionnaireType,
      answers: body.answers,
    });

    // 如果是 PENDING 用户，测评完成后设置 2 小时过期
    if (userId) {
      const { prisma } = await import('@/lib/db');
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (user?.status === 'PENDING') {
        await setPendingAccountExpiration(userId);
      }
    }

    return apiSuccess(result, 201);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiSuccess({ error: error.message }, error.status as any);
    }
    console.error('Submit attempt error:', error);
    return apiSuccess({ error: '提交失败' }, 500);
  }
}
