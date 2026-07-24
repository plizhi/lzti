// 测评会话存储 - 链接家长/学生/教师三次测评

import type { DimensionAnswers, DimensionScores, DimensionQuadrants } from '@/types/assessment';

export interface AssessmentSession {
  id: string; // 会话ID，链接三次测评
  stageId: string;
  createdAt: string;
  // 三次测评的完成状态
  completed: {
    parent: boolean;
    student: boolean;
    teacher: boolean;
  };
  // 三次测评的attempt IDs
  attemptIds: {
    parent?: string;
    student?: string;
    teacher?: string;
  };
}

export interface SessionAttempt {
  sessionId: string;
  stageId: string;
  questionnaireType: 'parent' | 'student' | 'teacher';
  answers: DimensionAnswers;
  scores?: DimensionScores;
  quadrants?: DimensionQuadrants;
  createdAt: string;
}

const SESSION_STORAGE_KEY = 'lzti-assessment-sessions';
const ATTEMPT_STORAGE_KEY = 'lzti-session-attempts';

export function createAssessmentSession(stageId: string): AssessmentSession {
  const session: AssessmentSession = {
    id: crypto.randomUUID(),
    stageId,
    createdAt: new Date().toISOString(),
    completed: {
      parent: false,
      student: false,
      teacher: false,
    },
    attemptIds: {},
  };

  if (typeof window !== 'undefined') {
    const sessions = getSessions();
    sessions.unshift(session);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
  }

  return session;
}

export function getSessions(): AssessmentSession[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function getSession(sessionId: string): AssessmentSession | null {
  const sessions = getSessions();
  return sessions.find((s) => s.id === sessionId) ?? null;
}

export function updateSession(session: AssessmentSession): void {
  if (typeof window === 'undefined') return;
  const sessions = getSessions();
  const index = sessions.findIndex((s) => s.id === session.id);
  if (index >= 0) {
    sessions[index] = session;
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
  }
}

export function saveSessionAttempt(attempt: SessionAttempt): void {
  if (typeof window === 'undefined') return;

  // 保存 attempt
  const attempts = getSessionAttempts();
  attempts.unshift(attempt);
  localStorage.setItem(ATTEMPT_STORAGE_KEY, JSON.stringify(attempts));

  // 更新 session 的完成状态
  const session = getSession(attempt.sessionId);
  if (session) {
    session.attemptIds[attempt.questionnaireType] = attempt.sessionId + '-' + attempt.questionnaireType;
    session.completed[attempt.questionnaireType] = true;
    updateSession(session);
  }
}

export function getSessionAttempts(): SessionAttempt[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(ATTEMPT_STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function getAttemptsBySession(sessionId: string): SessionAttempt[] {
  return getSessionAttempts().filter((a) => a.sessionId === sessionId);
}

export function getLatestSession(stageId: string): AssessmentSession | null {
  const sessions = getSessions().filter((s) => s.stageId === stageId);
  if (sessions.length === 0) return null;
  return sessions[0];
}
