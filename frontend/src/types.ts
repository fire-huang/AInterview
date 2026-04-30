export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string;
  stats: {
    mocksCount: number;
    avgScore: number;
  };
}

export interface DashboardState {
  user: User;
  isAuthenticated: boolean;
  rhythm: {
    readiness: number;
  };
  latestSession: ReviewSession | null;
  pendingTasks: Task[];
}

export interface ReviewSession {
  id: string;
  date: string;
  summary: string;
  analysis: {
    strengths: string;
    weaknesses: string;
    suggestions: string;
  };
  peerPercentile: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  weakTag: string;
}

export type Language = 'en' | 'zh';