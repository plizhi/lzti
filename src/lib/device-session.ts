/**
 * 设备端的测评会话读写
 *
 * 设备走的是和网页端一样的存储语义：
 * - `SessionAttempt.answers` 存答案
 * - `SessionAttempt.progress` 也存答案（与网页端 progress 接口保持一致）
 * - `SessionAttempt.currentDimensionIndex` 存维度游标
 * - 只有 report 为 null 的记录才是「进行中」的
 */

import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/api/response';
import type { AssessmentSession, Child, Prisma } from '@prisma/client';

export type DeviceSession = AssessmentSession & { child: Child };

/**
 * 校验测评会话属于该用户（设备令牌背后的用户）。
 */
export async function requireOwnedSession(
  sessionId: string,
  userId: string
): Promise<DeviceSession> {
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: { child: true },
  });

  if (!session) {
    throw new ApiError('测评会话不存在', 404);
  }
  if (session.child.userId !== userId) {
    throw new ApiError('无权访问该测评会话', 403);
  }

  return session;
}

/** 读取进行中的（未生成报告的）答题记录 */
export async function findProgressAttempt(
  sessionId: string,
  questionnaireType: string
) {
  return prisma.sessionAttempt.findFirst({
    where: {
      sessionId,
      questionnaireType,
      report: null,
    },
  });
}

/** 读取进度里的答案 */
export function readProgressAnswers(attempt: {
  progress: unknown;
  answers: unknown;
} | null): Record<string, number> {
  if (!attempt) return {};
  const raw = (attempt.progress ?? attempt.answers) as unknown;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, number>;
}

/**
 * 保存进度：存在则更新，不存在则新建一条 partial attempt。
 */
export async function saveProgress(
  session: DeviceSession,
  questionnaireType: string,
  answers: Record<string, number>,
  currentDimensionIndex: number
) {
  const existing = await findProgressAttempt(session.id, questionnaireType);

  if (existing) {
    return prisma.sessionAttempt.update({
      where: { id: existing.id },
      data: {
        answers: answers as Prisma.InputJsonValue,
        progress: answers as Prisma.InputJsonValue,
        currentDimensionIndex,
      },
    });
  }

  return prisma.sessionAttempt.create({
    data: {
      sessionId: session.id,
      childId: session.childId,
      questionnaireType,
      stageId: session.stageId,
      answers: answers as never,
      scores: {},
      quadrants: {},
      progress: answers as never,
      currentDimensionIndex,
    },
  });
}
