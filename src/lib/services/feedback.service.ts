import { prisma } from '@/lib/db';
import { sendFeedbackNotification } from './email.service';

type FeedbackCategory = 'suggestion' | 'bug' | 'complaint' | 'inquiry';

interface CreateFeedbackInput {
  content: string;
  contact?: string;
}

// 关键词分类映射
const categoryKeywords: Record<FeedbackCategory, string[]> = {
  complaint: ['退款', '投诉', '不满', '太差', '垃圾', '骗子', '严重'],
  bug: ['不能用', '坏了', '错误', 'bug', '闪退', '卡', '慢', '打不开', '加载失败'],
  suggestion: ['建议', '希望', '能不能', '要不要', '应该', '可以加', '希望可以', '能不能加'],
  inquiry: [],
};

function classifyFeedback(content: string): FeedbackCategory {
  const lowerContent = content.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(k => lowerContent.includes(k.toLowerCase()))) {
      return category as FeedbackCategory;
    }
  }
  return 'inquiry';
}

// 模板回复
const autoReplies: Record<FeedbackCategory, string> = {
  suggestion: '感谢您的建议！我们非常重视用户的反馈，您的建议已被认真记录，将作为产品迭代的重要参考。',
  bug: '抱歉给您带来困扰！我们已记录您遇到的问题，技术团队将尽快排查处理。如需紧急帮助，请联系 support@nzyy.cc',
  complaint: '非常抱歉给您带来不便。我们非常重视此类反馈，运营团队将尽快与您联系了解情况。您也可以直接联系我们：support@nzyy.cc',
  inquiry: '感谢您的反馈！我们已收到您的问题，如有需要会尽快回复。如有紧急问题，请联系 support@nzyy.cc',
};

interface FeedbackResult {
  id: string;
  category: FeedbackCategory;
  autoReply: string;
  message: string;
}

export async function createFeedback(
  userId: string | null,
  input: CreateFeedbackInput
): Promise<FeedbackResult> {
  const { content, contact } = input;

  if (!content || content.trim().length < 5) {
    throw new Error('反馈内容至少5个字');
  }

  const category = classifyFeedback(content);
  const autoReply = autoReplies[category];

  const feedback = await prisma.feedback.create({
    data: {
      userId,
      content: content.trim(),
      category,
      status: 'pending',
      contact: contact?.trim() || null,
      autoReply,
    },
  });

  // 高优先级反馈发送邮件通知
  if (category === 'complaint' || category === 'bug') {
    await sendFeedbackNotification(category, content, contact);
  }

  return {
    id: feedback.id,
    category,
    autoReply,
    message: '感谢您的反馈！我们已收到，并将尽快处理。',
  };
}

interface ListFeedbackOptions {
  page: number;
  limit: number;
  status?: string;
}

export async function listFeedbacks(
  userId: string | null,
  options: ListFeedbackOptions
): Promise<{
  feedbacks: Array<{
    id: string;
    content: string;
    category: string;
    status: string;
    contact: string | null;
    autoReply: string | null;
    reply: string | null;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  totalPages: number;
}> {
  const { page, limit, status } = options;

  const where = userId ? { userId } : {};
  if (status) {
    (where as Record<string, string>).status = status;
  }

  const [feedbacks, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.feedback.count({ where }),
  ]);

  return {
    feedbacks: feedbacks.map(f => ({
      id: f.id,
      content: f.content,
      category: f.category,
      status: f.status,
      contact: f.contact,
      autoReply: f.autoReply,
      reply: f.reply,
      createdAt: f.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getFeedbackById(id: string) {
  return prisma.feedback.findUnique({
    where: { id },
  });
}

export async function updateFeedbackStatus(
  id: string,
  status: string,
  reply?: string
) {
  return prisma.feedback.update({
    where: { id },
    data: {
      status,
      reply,
      repliedAt: reply ? new Date() : null,
    },
  });
}
