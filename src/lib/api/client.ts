const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lzti_token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await res.json();

  if (!json.success) {
    throw new Error(json.error || '请求失败');
  }

  return json.data as T;
}

// Auth
export const auth = {
  login: (data: { phone: string; password: string }) =>
    request<{
      user: { id: string; phone: string; name: string | null; role: string };
      token: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () =>
    request<{
      id: string;
      phone: string;
      name: string | null;
      role: string;
      children: Array<{
        id: string;
        name: string;
        gender: string | null;
        birthDate: string | null;
        grade: string | null;
        sessions: Array<{
          id: string;
          stageId: string;
          completed: string;
          createdAt: string;
        }>;
      }>;
    }>('/auth/me'),
};

// Children
export const children = {
  list: () =>
    request<{
      children: Array<{
        id: string;
        name: string;
        gender: string | null;
        birthDate: string | null;
        grade: string | null;
        sessions: Array<{
          id: string;
          stageId: string;
          completed: string;
          createdAt: string;
        }>;
      }>;
    }>('/children'),

  create: (data: { name: string; grade: string; gender?: string; birthDate?: string }) =>
    request<{
      id: string;
      name: string;
    }>('/children', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: { name?: string; grade?: string; gender?: string; birthDate?: string }
  ) =>
    request<{ id: string; name: string }>(`/children/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/children/${id}`, {
      method: 'DELETE',
    }),
};

// Assessment Sessions
export const assessment = {
  createSession: (data: { childId: string; stageId: string }) =>
    request<{
      id: string;
      childId: string;
      stageId: string;
      completed: { parent: boolean; student: boolean; teacher: boolean };
    }>('/assessment/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSession: (sessionId: string) =>
    request<{
      id: string;
      child: { id: string; name: string };
      stageId: string;
      completed: { parent: boolean; student: boolean; teacher: boolean };
      attempts: Array<{
        id: string;
        questionnaireType: string;
        createdAt: string;
      }>;
    }>(`/assessment/sessions/${sessionId}`),

  saveProgress: (
    sessionId: string,
    data: { questionnaireType: string; answers: Record<string, number>; currentDimensionIndex: number }
  ) =>
    request<{
      attemptId: string;
      saved: boolean;
      currentDimensionIndex: number;
    }>(`/assessment/sessions/${sessionId}/progress?sessionId=${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getProgress: (sessionId: string, questionnaireType: string) =>
    request<{
      hasProgress: boolean;
      attemptId?: string;
      answers?: Record<string, number>;
      currentDimensionIndex?: number;
    }>(`/assessment/sessions/${sessionId}/progress?sessionId=${sessionId}&questionnaireType=${questionnaireType}`),

  getHistorySessions: (params?: { childId?: string; stageId?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.childId) query.set('childId', params.childId);
    if (params?.stageId) query.set('stageId', params.stageId);
    if (params?.limit) query.set('limit', String(params.limit));
    const queryStr = query.toString();
    return request<{
      children: Array<{
        child: { id: string; name: string; gender: string | null; birthDate: string | null; grade: string | null };
        sessions: Array<{
          id: string;
          stageId: string;
          stageName: string;
          completed: { parent: boolean; student: boolean; teacher: boolean };
          attempts: Array<{
            id: string;
            questionnaireType: string;
            createdAt: string;
            scores: Record<string, { axis1: number; axis2: number }>;
            quadrants: Record<string, string>;
          }>;
          createdAt: string;
          updatedAt: string;
        }>;
      }>;
    }>(`/assessment/sessions${queryStr ? `?${queryStr}` : ''}`);
  },

  getAttemptReport: (attemptId: string) =>
    request<{
      attemptId: string;
      sessionId: string;
      child: { id: string; name: string };
      stageId: string;
      stageName: string;
      questionnaireType: string;
      scores: Record<string, { axis1: number; axis2: number }>;
      quadrants: Record<string, string>;
      report: {
        id: string;
        currentStatus: Array<{
          dimensionId: string;
          quadrantType: string;
          scores: { axis1: number; axis2: number };
        }>;
        trendAnalysis: {
          comparedAttemptId: string;
          comparedAt: string;
          overallTrend: string;
          dimensionTrends: Array<{
            dimensionId: string;
            dimensionName: string;
            change: number;
            trend: string;
            description: string;
          }>;
        } | null;
        suggestions: Array<unknown>;
        trajectory: unknown;
        createdAt: string;
      } | null;
      createdAt: string;
    }>(`/assessment/attempts/${attemptId}/report`),

  submitAttempt: (
    sessionId: string,
    data: { questionnaireType: string; answers: Record<string, number> }
  ) =>
    request<{
      attemptId: string;
      sessionId: string;
      questionnaireType: string;
      scores: Record<string, { axis1: number; axis2: number }>;
      quadrants: Record<string, string>;
    }>(`/assessment/sessions/${sessionId}/attempts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getReport: (
    sessionId: string,
    params?: { type?: 'single' | 'parent-child' | 'home-school'; view?: string }
  ) => {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.view) query.set('view', params.view);
    const queryStr = query.toString();
    return request(
      `/assessment/sessions/${sessionId}/report${queryStr ? `?${queryStr}` : ''}`
    );
  },
};

// Invitation Codes
// 设备（语音测评硬件）
export interface DeviceInfo {
  id: string;
  name: string;
  deviceKey: string;
  status: string;
  lastSeenAt: string | null;
  createdAt: string;
  tokenCount: number;
}

export const devices = {
  list: () => request<DeviceInfo[]>('/devices'),
  createPairingCode: () =>
    request<{ code: string; expiresAt: string }>('/device/pairing-code', {
      method: 'POST',
    }),
  revoke: (id: string) =>
    request<{ id: string; status: string }>(`/devices/${id}`, {
      method: 'DELETE',
    }),
};

// 语音测评（设备驱动：设备念题、孩子说话作答）
export interface VoiceQuestion {
  questionId: string;
  questionText: string;
  dimensionName: string;
  questionNumber: number;
  totalQuestions: number;
  answeredCount: number;
  finished: boolean;
  prompt: string;
  audioBase64: string | null;
  scale: { min: number; max: number; minLabel: string; maxLabel: string };
}

export const voice = {
  next: (sessionId: string, questionnaireType: string) =>
    request<VoiceQuestion>('/device/voice/next', {
      method: 'POST',
      body: JSON.stringify({ sessionId, questionnaireType }),
    }),
  answer: (sessionId: string, questionnaireType: string, audioBase64: string) =>
    request<{
      recognizedText: string;
      normalizedValue: number | null;
      accepted: boolean;
      retry: boolean;
      finished: boolean;
      next: VoiceQuestion;
    }>('/device/voice/answer', {
      method: 'POST',
      body: JSON.stringify({ sessionId, questionnaireType, audioBase64 }),
    }),
};

export const invitationCodes = {
  validate: (code: string) =>
    request<{
      valid: boolean;
      error?: string;
      invitation?: {
        id: string;
        code: string;
        expiresAt: string;
        maxUses: number;
        usedCount: number;
      };
    }>('/invitation-codes/validate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
};

// Report Share
export const reportShare = {
  create: (attemptId: string, expiresInDays?: number) =>
    request<{
      shareId: string;
      shareCode: string;
      shareUrl: string;
      expiresAt: string;
      isExisting: boolean;
    }>('/share/report', {
      method: 'POST',
      body: JSON.stringify({ attemptId, expiresInDays }),
    }),

  revoke: (shareCode: string) =>
    request<{ revoked: boolean }>(`/share/report/${shareCode}`, {
      method: 'DELETE',
    }),

  list: () =>
    request<{
      shares: Array<{
        shareId: string;
        shareCode: string;
        attemptId: string;
        childName: string;
        stageName: string;
        questionnaireType: string;
        createdAt: string;
        expiresAt: string;
        isExpired: boolean;
      }>;
    }>('/share/reports'),
};

// Token management
export function setToken(token: string) {
  localStorage.setItem('lzti_token', token);
}

export function removeToken() {
  localStorage.removeItem('lzti_token');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
