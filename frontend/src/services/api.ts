const API_BASE = '/api';

const getToken = (): string | null => localStorage.getItem('ainterview_token');

const setToken = (token: string): void => localStorage.setItem('ainterview_token', token);

const clearToken = (): void => localStorage.removeItem('ainterview_token');

interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

async function request<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  if (!text) {
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return { code: 0, message: 'ok', data: null as any };
  }
  const json = JSON.parse(text);

  if (!res.ok && json.code !== 0) {
    throw new Error(json.message || `Request failed: ${res.status}`);
  }

  return json;
}

// ─── Auth ────────────────────────────────────────

export const auth = {
  register: (body: {
    email: string;
    password: string;
    name?: string;
    position?: string;
  }) => request<{ token: string; user: any }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ─── User ────────────────────────────────────────

export const user = {
  getMe: () => request('/users/me'),

  updateMe: (body: { name?: string; avatar?: string; role?: string }) =>
    request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  getResumes: () => request('/users/me/resumes'),
};

// ─── Resume ──────────────────────────────────────

export const resume = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ resume: any }>('/resumes', {
      method: 'POST',
      body: form,
    });
  },

  delete: (id: string) =>
    request(`/resumes/${id}`, { method: 'DELETE' }),

  getFileUrl: (id: string) => {
    const token = getToken();
    return `/api/resumes/${id}/file?token=${token}`;
  },
};

// ─── Interview ───────────────────────────────────

export const interview = {
  create: (body: {
    position?: string;
    company?: string;
    interviewType?: string;
    difficulty?: number;
    focusAreas?: string[];
    resumeId?: string;
    additionalInfo?: string;
  }) =>
    request<{ session: any }>('/interviews', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  get: (id: string) => request<{ session: any; messages: any[] }>(`/interviews/${id}`),

  recover: (id: string) =>
    request<{ session: any; messages: any[] }>(`/interviews/${id}/recover`, {
      method: 'POST',
    }),

  finish: (id: string) =>
    request<{ session: any }>(`/interviews/${id}/finish`, {
      method: 'POST',
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/interviews/${id}`, {
      method: 'DELETE',
    }),

  history: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request('/interviews/history' + qs);
  },
};

// ─── Question ────────────────────────────────────

export const question = {
  getCurrent: (sessionId: string) =>
    request<{ question: any; stage: string }>(`/interviews/${sessionId}/questions/current`),

  answer: (sessionId: string, content: string) =>
    request<{ message: any; evaluation?: any; followup?: any }>(`/interviews/${sessionId}/answers`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  followup: (sessionId: string) =>
    request<{ question: any }>(`/interviews/${sessionId}/followups`, {
      method: 'POST',
    }),

  nextStage: (sessionId: string) =>
    request<{ stage: string; question?: any }>(`/interviews/${sessionId}/next-stage`, {
      method: 'POST',
    }),
};

// ─── Report ──────────────────────────────────────

export const report = {
  get: (sessionId: string) =>
    request<{ report: any }>(`/reports/${sessionId}/report`),

  regenerate: (sessionId: string) =>
    request<{ report: any }>(`/reports/${sessionId}/report/regenerate`, {
      method: 'POST',
    }),
};

// ─── Training ────────────────────────────────────

export const training = {
  list: (params?: { status?: string; limit?: number; offset?: number }) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [k, v]) => {
        if (v !== undefined) acc[k] = String(v);
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    return request('/training-tasks' + qs);
  },

  complete: (id: string) =>
    request(`/training-tasks/${id}/complete`, { method: 'POST' }),
};

// ─── Settings ────────────────────────────────────

export const settings = {
  get: () => request('/users/me/settings'),

  update: (body: Partial<{
    aiPersonality: string;
    aiSpeed: string;
    feedbackLevel: string;
    language: string;
    darkMode: boolean;
    notifications: boolean;
    autoSave: boolean;
    defaultRole: string;
  }>) =>
    request('/users/me/settings', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

// ─── Event ───────────────────────────────────────

export const event = {
  track: (body: { eventName: string; sessionId?: string; eventData?: any }) =>
    request('/events/track', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ─── Azure Speech ────────────────────────────────

export const azure = {
  getSpeechToken: () =>
    request<{ token: string; region: string; endpoint: string; expiresIn: number }>('/azure/speech-token'),

  getSpeechConfig: () =>
    request<{ region: string; endpoint: string; language: string }>('/azure/speech-config'),
};

// ─── DashScope (Alibaba Cloud) ───────────────────

export const dashscope = {
  getToken: () =>
    request<{ token: string; expiresIn: number }>('/dashscope/token'),

  getConfig: () =>
    request<{ wsUrl: string; sttModel: string; language: string }>('/dashscope/config'),
};

// ─── Health ──────────────────────────────────────

export const health = {
  check: () => request<{ status: string; timestamp: string }>('/health'),
};

// ─── Auth helpers ────────────────────────────────

export { getToken, setToken, clearToken };
