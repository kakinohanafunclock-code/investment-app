import type {
  Account, Transaction, Dividend, WatchItem, Article, Report,
  DashboardData, SelfCheck, DataAnalysis, HealthInfo, ChatMessage, PublicUser,
} from './types';

// 別ドメイン配信時は VITE_API_BASE_URL を設定（例: https://api.example.com）。
// 同一オリジン配信時は空文字で /api を相対参照。
const API_ROOT = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const BASE = `${API_ROOT}/api`;

const TOKEN_KEY = 'auth_token';
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(BASE + path, {
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    if (res.status === 401) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  health: () => req<HealthInfo>('/health'),

  // ---- auth ----
  register: (b: { email: string; password: string; name?: string; signupCode?: string }) =>
    req<{ token: string; user: PublicUser }>('/auth/register', { method: 'POST', body: JSON.stringify(b) }),
  login: (b: { email: string; password: string }) =>
    req<{ token: string; user: PublicUser }>('/auth/login', { method: 'POST', body: JSON.stringify(b) }),
  me: () => req<{ user: PublicUser }>('/auth/me'),

  dashboard: (month?: string) => req<DashboardData>(`/dashboard${month ? `?month=${month}` : ''}`),
  selfCheck: () => req<SelfCheck>('/insights/self-check'),
  dataAnalysis: () => req<DataAnalysis>('/insights/data-analysis'),

  accounts: () => req<Account[]>('/accounts'),
  createAccount: (b: Partial<Account>) => req<Account>('/accounts', { method: 'POST', body: JSON.stringify(b) }),
  updateAccount: (id: number, b: Partial<Account>) => req<Account>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteAccount: (id: number) => req<void>(`/accounts/${id}`, { method: 'DELETE' }),

  transactions: () => req<Transaction[]>('/transactions'),
  createTransaction: (b: Partial<Transaction>) => req<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(b) }),
  updateTransaction: (id: number, b: Partial<Transaction>) => req<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteTransaction: (id: number) => req<void>(`/transactions/${id}`, { method: 'DELETE' }),

  dividends: () => req<Dividend[]>('/dividends'),
  createDividend: (b: Partial<Dividend>) => req<Dividend>('/dividends', { method: 'POST', body: JSON.stringify(b) }),
  updateDividend: (id: number, b: Partial<Dividend>) => req<Dividend>(`/dividends/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteDividend: (id: number) => req<void>(`/dividends/${id}`, { method: 'DELETE' }),

  importCsv: (b: { csv: string; type: 'transaction' | 'dividend'; mapping: Record<string, string>; defaults?: { accountId?: number; country?: 'JP' | 'US' } }) =>
    req<{ inserted: number }>('/import', { method: 'POST', body: JSON.stringify(b) }),

  watchlist: () => req<WatchItem[]>('/watchlist'),
  createWatch: (b: Partial<WatchItem>) => req<WatchItem>('/watchlist', { method: 'POST', body: JSON.stringify(b) }),
  deleteWatch: (id: number) => req<void>(`/watchlist/${id}`, { method: 'DELETE' }),

  articles: (limit = 200) => req<Article[]>(`/articles?limit=${limit}`),
  reports: () => req<Report[]>('/reports'),
  report: (id: number) => req<Report>(`/reports/${id}`),

  collect: () => req<{ fetched: number; fresh: number; inserted: number }>('/agent/collect', { method: 'POST' }),
  generateReport: () => req<Report>('/agent/report', { method: 'POST' }),
  runNow: () => req<{ collected: number; report: Report }>('/agent/run-now', { method: 'POST' }),
  chat: (messages: ChatMessage[]) => req<{ answer: string }>('/agent/chat', { method: 'POST', body: JSON.stringify({ messages }) }),

  settings: () => req<Record<string, any>>('/settings'),
  updateCron: (cron: string) => req<{ cron: string }>('/settings/cron', { method: 'PUT', body: JSON.stringify({ cron }) }),

  export: () => req<any>('/export'),
  reset: (seed: boolean) => req<{ ok: boolean; seeded: boolean }>('/reset', { method: 'POST', body: JSON.stringify({ seed }) }),
  seed: () => req<{ ok: boolean }>('/seed', { method: 'POST' }),
};
