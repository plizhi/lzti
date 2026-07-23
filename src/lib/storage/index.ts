// 本地存储工具 - 用于历史记录和趋势对比

import type { DimensionAnswers, DimensionScores, DimensionQuadrants } from '@/types/assessment';

export interface StoredAttempt {
  id: string;
  stageId: string;
  questionnaireType: 'student' | 'parent' | 'teacher';
  answers: DimensionAnswers;
  scores: DimensionScores;
  quadrants: DimensionQuadrants;
  createdAt: string;
}

const STORAGE_KEY = 'lzti-attempt-history';

export function getAttemptHistory(): StoredAttempt[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveAttempt(attempt: StoredAttempt): void {
  if (typeof window === 'undefined') return;
  const history = getAttemptHistory();
  // 检查是否已存在，存在则更新
  const existingIndex = history.findIndex(a => a.id === attempt.id);
  if (existingIndex >= 0) {
    history[existingIndex] = attempt;
  } else {
    history.unshift(attempt); // 新记录插入到前面
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function getAttemptsByStage(stageId: string): StoredAttempt[] {
  return getAttemptHistory().filter(a => a.stageId === stageId);
}

export function getLatestAttempt(stageId: string): StoredAttempt | null {
  const attempts = getAttemptsByStage(stageId);
  if (attempts.length === 0) return null;
  return attempts[0]; // 已按时间排序，最新的在前面
}

export function getPreviousAttempt(stageId: string, currentId: string): StoredAttempt | null {
  const attempts = getAttemptsByStage(stageId);
  const currentIndex = attempts.findIndex(a => a.id === currentId);
  if (currentIndex < 0 || currentIndex >= attempts.length - 1) return null;
  return attempts[currentIndex + 1]; // 下一个就是更早的记录
}

export function clearAttemptHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
