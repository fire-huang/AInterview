import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DashboardState, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { auth, user, training, interview, getToken, setToken, clearToken } from '../services/api';

interface AppContextType {
  state: DashboardState;
  language: Language;
  loading: boolean;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, any>) => any;
  updateState: (newState: Partial<DashboardState>) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, position: string) => Promise<void>;
  logout: () => void;
}

const DEFAULT_STATE: DashboardState = {
  user: {
    id: '',
    email: '',
    name: '',
    role: '',
    avatar: '',
    stats: { mocksCount: 0, avgScore: 0 },
  },
  isAuthenticated: false,
  rhythm: { readiness: 0 },
  latestSession: null,
  pendingTasks: [],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

async function fetchDashboardData(): Promise<Partial<DashboardState>> {
  const result: Partial<DashboardState> = {};

  try {
    const userRes = await user.getMe();
    const u = userRes.data;
    result.user = {
      id: u.id,
      email: u.email,
      name: u.name || 'User',
      role: u.role || '',
      avatar: u.avatar || '',
      stats: u.stats || { mocksCount: 0, avgScore: 0 },
    };
    result.rhythm = {
      readiness: Math.round(u.stats?.avgScore || 0),
    };
  } catch {}

  try {
    const res = await training.list({ status: 'todo', limit: 5 });
    const tasks = res.data?.tasks || [];
    result.pendingTasks = tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      icon: t.weakTag === 'technical' ? 'Cpu' : t.weakTag === 'communication' ? 'FileText' : 'Edit3',
      completed: false,
      weakTag: t.weakTag || '',
    }));
  } catch {}

  try {
    const res = await interview.history({ limit: '1' });
    const recs = res.data?.records || [];
    if (recs.length > 0) {
      const r = recs[0];
      result.latestSession = {
        id: r.sessionId,
        date: r.finishedAt ? new Date(r.finishedAt).toLocaleDateString() : '',
        summary: r.role || 'Latest Interview',
        analysis: {
          strengths: r.weakTags?.length ? `Focus areas: ${r.weakTags.join(', ')}` : '',
          weaknesses: '',
          suggestions: '',
        },
        peerPercentile: r.totalScore || 0,
      };
    }
  } catch {}

  return result;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('ainterview_lang');
    return (saved as Language) || 'zh';
  });

  const [state, setState] = useState<DashboardState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      fetchDashboardData()
        .then(data => {
          setState(prev => ({
            ...prev,
            ...data,
            isAuthenticated: true,
          }));
        })
        .catch(() => {
          clearToken();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ainterview_lang', language);
  }, [language]);

  const updateState = (newState: Partial<DashboardState>) => {
    setState(prev => ({ ...prev, ...newState }));
  };

  const loginHandler = useCallback(async (email: string, password: string) => {
    const res = await auth.login({ email, password });
    const { token } = res.data;
    setToken(token);
    const data = await fetchDashboardData();
    setState(prev => ({
      ...prev,
      ...data,
      isAuthenticated: true,
    }));
  }, []);

  const registerHandler = useCallback(async (
    email: string, password: string, name: string, position: string
  ) => {
    const res = await auth.register({ email, password, name, position });
    const { token } = res.data;
    setToken(token);
    const data = await fetchDashboardData();
    setState(prev => ({
      ...prev,
      ...data,
      isAuthenticated: true,
      user: {
        ...data.user!,
        name: data.user?.name || name,
        role: data.user?.role || position,
      },
    }));
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setState(DEFAULT_STATE);
  }, []);

  const t = (key: string, params?: Record<string, any>) => {
    const keys = key.split('.');
    let value = TRANSLATIONS[language];
    for (const k of keys) {
      value = value?.[k];
    }

    if (typeof value !== 'string') {
      return value !== undefined ? value : key;
    }

    let result = value;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        result = (result as string).replace(`{{${k}}}`, String(v));
      });
    }

    return result;
  };

  return (
    <AppContext.Provider value={{
      state, language, loading, setLanguage, t, updateState,
      login: loginHandler,
      register: registerHandler,
      logout,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};