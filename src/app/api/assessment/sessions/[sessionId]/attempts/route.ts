import { NextRequest } from 'next/server';
import { submitAttempt } from '@/lib/services/assessment.service';
import { setPendingAccountExpiration } from '@/lib/services/cleanup.service';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { ApiError, apiError, parseJsonBody } from '@/lib/api/response';
import { validateAnswers, validateQuestionnaireType } from '@/lib/validators';

interface AttemptBody {
  questionnaireType: unknown;
  answers: unknown;
}

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

    const body = await parseJsonBody<AttemptBody>(request);
    const authHeader = request.headers.get('Authorization');

    // 验证答案格式
    const answers = validateAnswers(body.answers);
    const questionnaireType = validateQuestionnaireType(body.questionnaireType);

    let userId: string | null = null;

    // 如果有认证信息，验证用户
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { verifyToken } = await import('@/lib/auth/jwt');
      const payload = verifyToken(token);
      userId = payload.userId;
    }

    const result = await submitAttempt(sessionId, userId, {
      questionnaireType,
      answers,
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
      return apiError(error.message, error.status);
    }
    console.error('Submit attempt error:', error);
    return apiError('提交失败', 500);
  }
}
