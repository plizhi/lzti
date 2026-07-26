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
