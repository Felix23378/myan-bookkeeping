// Local Storage Service — all data lives in the browser
export interface Transaction {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string; // ISO date string YYYY-MM-DD
  createdAt: string;
  source: 'chat' | 'voice' | 'manual';
}

export interface OfflineQueueItem {
  id: string;
  message: string;
  timestamp: string;
}

export interface UserPrefs {
  language: 'my' | 'en';
  onboardingComplete: boolean;
  customCategories: string[];
}

const KEYS = {
  API_KEY: 'mba_api_key',
  USER_PREFS: 'mba_user_prefs',
  TRANSACTIONS: 'mba_transactions',
  OFFLINE_QUEUE: 'mba_offline_queue',
};

// ---- Gemini API Key ----
export const saveApiKey = (key: string): void => {
  localStorage.setItem(KEYS.API_KEY, btoa(key)); // light obfuscation
};

export const getApiKey = (): string | null => {
  const val = localStorage.getItem(KEYS.API_KEY);
  if (!val) return null;
  try { return atob(val); } catch { return null; }
};

export const clearApiKey = (): void => {
  localStorage.removeItem(KEYS.API_KEY);
};

// ---- User Preferences ----
const defaultPrefs: UserPrefs = {
  language: 'my',
  onboardingComplete: false,
  customCategories: [],
};

export const getUserPrefs = (): UserPrefs => {
  try {
    const raw = localStorage.getItem(KEYS.USER_PREFS);
    return raw ? { ...defaultPrefs, ...JSON.parse(raw) } : defaultPrefs;
  } catch { return defaultPrefs; }
};

export const saveUserPrefs = (prefs: Partial<UserPrefs>): void => {
  const current = getUserPrefs();
  localStorage.setItem(KEYS.USER_PREFS, JSON.stringify({ ...current, ...prefs }));
};

// ---- Transactions ----
export const getTransactions = (userId: string): Transaction[] => {
  try {
    const raw = localStorage.getItem(`${KEYS.TRANSACTIONS}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const saveTransaction = (userId: string, tx: Transaction): void => {
  const existing = getTransactions(userId);
  const idx = existing.findIndex(t => t.id === tx.id);
  if (idx >= 0) existing[idx] = tx;
  else existing.push(tx);
  localStorage.setItem(`${KEYS.TRANSACTIONS}_${userId}`, JSON.stringify(existing));
};

export const deleteTransaction = (userId: string, txId: string): void => {
  const existing = getTransactions(userId).filter(t => t.id !== txId);
  localStorage.setItem(`${KEYS.TRANSACTIONS}_${userId}`, JSON.stringify(existing));
};

export const clearAllTransactions = (userId: string): void => {
  localStorage.removeItem(`${KEYS.TRANSACTIONS}_${userId}`);
};

// ---- Offline Queue ----
export const getOfflineQueue = (): OfflineQueueItem[] => {
  try {
    const raw = localStorage.getItem(KEYS.OFFLINE_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const enqueueOffline = (item: OfflineQueueItem): void => {
  const queue = getOfflineQueue();
  queue.push(item);
  localStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
};

export const dequeueOfflineItem = (id: string): void => {
  const queue = getOfflineQueue().filter(q => q.id !== id);
  localStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
};

export const clearOfflineQueue = (): void => {
  localStorage.removeItem(KEYS.OFFLINE_QUEUE);
};

// ---- Export ----
export const exportToCSV = (userId: string): void => {
  const transactions = getTransactions(userId);
  const header = 'Date,Type,Amount,Description,Category,Source\n';
  const rows = transactions.map(t =>
    `${t.date},${t.type},${t.amount},"${t.description}","${t.category}",${t.source}`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `myan-bookkeeping-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
