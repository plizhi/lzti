import { NextRequest } from 'next/server';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { prisma } from '@/lib/db';

export const GET = withAuth(async (request, context) => {
  if (context.user.role !== 'ADMIN') {
    return apiSuccess({ error: '需要管理员权限' } as any, 403);
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const status = searchParams.get('status') ?? undefined;

  const where = status ? { status } : {};

  const [feedbacks, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.feedback.count({ where }),
  ]);

  return apiSuccess({
    feedbacks: feedbacks.map((f) => ({
      id: f.id,
      content: f.content,
      category: f.category,
      status: f.status,
      contact: f.contact,
      autoReply: f.autoReply,
      reply: f.reply,
      repliedAt: f.repliedAt,
      createdAt: f.createdAt,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export const PATCH = withAuth(async (request: NextRequest, context) => {
  if (context.user.role !== 'ADMIN') {
    return apiSuccess({ error: '需要管理员权限' } as any, 403);
  }

  const body = await request.json();
  const { id, status, reply } = body;

  if (!id) {
    return apiSuccess({ error: '请提供反馈 ID' }, 400);
  }

  const feedback = await prisma.feedback.update({
    where: { id },
    data: {
      status,
      reply,
      repliedAt: reply ? new Date() : undefined,
    },
  });

  return apiSuccess({ feedback });
});
