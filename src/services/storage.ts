// Local Storage Service — all data lives in the browser
export interface Product {
  id: string;
  userId: string;
  name: string;
  unitLabel: string;
  currentQty: number;
  sellingPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  userId: string;
  productId: string;
  type: 'stock_in' | 'stock_out' | 'sale';
  qty: number;
  unitPriceSnapshot?: number;
  note: string;
  date: string;
  createdAt: string;
  source: 'chat' | 'voice' | 'manual';
  relatedTxId?: string;
}

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
  wallet?: string; // wallet id; undefined treated as user's default wallet
}

export interface Wallet {
  id: string;
  userId: string; // empty string for built-ins
  name: string;
  nameMy: string;
  color: string;
  isBuiltIn: boolean;
  createdAt: string;
  openingBalance: number;
}

const BUILT_IN_WALLET_DEFAULTS: Omit<Wallet, 'openingBalance'>[] = [
  { id: 'wallet_kpay',    userId: '', name: 'KBZ Pay',  nameMy: 'KBZ Pay',  color: '#E60039', isBuiltIn: true, createdAt: '' },
  { id: 'wallet_wavepay', userId: '', name: 'Wave Pay', nameMy: 'Wave Pay', color: '#0072CE', isBuiltIn: true, createdAt: '' },
  { id: 'wallet_ayapay',  userId: '', name: 'AYA Pay',  nameMy: 'AYA Pay',  color: '#FF6B00', isBuiltIn: true, createdAt: '' },
  { id: 'wallet_uabpay',  userId: '', name: 'UAB Pay',  nameMy: 'UAB Pay',  color: '#006B5B', isBuiltIn: true, createdAt: '' },
  { id: 'wallet_cbpay',   userId: '', name: 'CB Pay',   nameMy: 'CB Pay',   color: '#7C3AED', isBuiltIn: true, createdAt: '' },
  { id: 'wallet_cash',    userId: '', name: 'Cash',     nameMy: 'ငွေသား',    color: '#16A34A', isBuiltIn: true, createdAt: '' },
];

export const BUILT_IN_WALLETS: Wallet[] = BUILT_IN_WALLET_DEFAULTS.map(w => ({ ...w, openingBalance: 0 }));

export const DEFAULT_WALLET_ID = 'wallet_kpay';

export interface Transfer {
  id: string;
  userId: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  date: string;
  note: string;
  createdAt: string;
}

export interface WalletCheck {
  id: string;
  userId: string;
  walletId: string;
  date: string; // YYYY-MM-DD — the activity day being reconciled
  checkedAt: string;
}

export interface OfflineQueueItem {
  id: string;
  message: string;
  timestamp: string;
}

export type CurrencyCode = 'MMK' | 'THB' | 'USD' | 'SGD' | 'MYR' | 'CNY' | 'JPY' | 'KRW' | 'EUR' | 'GBP' | 'INR';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;      // English
  nameMy: string;    // Burmese
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  MMK: { code: 'MMK', symbol: 'K',  name: 'Myanmar Kyat',      nameMy: 'ကျပ်' },
  THB: { code: 'THB', symbol: '฿',  name: 'Thai Baht',         nameMy: 'ဘတ်' },
  USD: { code: 'USD', symbol: '$',  name: 'US Dollar',         nameMy: 'ဒေါ်လာ' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar',  nameMy: 'စင်ဒေါ်လာ' },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', nameMy: 'ရင်းဂစ်' },
  CNY: { code: 'CNY', symbol: '¥',  name: 'Chinese Yuan',      nameMy: 'ယွမ်' },
  JPY: { code: 'JPY', symbol: '¥',  name: 'Japanese Yen',      nameMy: 'ယန်း' },
  KRW: { code: 'KRW', symbol: '₩',  name: 'South Korean Won',  nameMy: 'ဝမ်' },
  EUR: { code: 'EUR', symbol: '€',  name: 'Euro',              nameMy: 'ယူရို' },
  GBP: { code: 'GBP', symbol: '£',  name: 'British Pound',     nameMy: 'ပေါင်' },
  INR: { code: 'INR', symbol: '₹',  name: 'Indian Rupee',      nameMy: 'ရူပီး' },
};

export interface UserPrefs {
  language: 'my' | 'en';
  onboardingComplete: boolean;
  customCategories: string[];
  currency: CurrencyCode;
  theme: 'dark' | 'light';
  defaultWalletId: string;
}

const KEYS = {
  API_KEY: 'mba_api_key',
  USER_PREFS: 'mba_user_prefs',
  TRANSACTIONS: 'mba_transactions',
  OFFLINE_QUEUE: 'mba_offline_queue',
  PRODUCTS: 'mba_products',
  STOCK_MOVEMENTS: 'mba_stock_movements',
  WALLETS: 'mba_wallets',
  WALLET_OVERRIDES: 'mba_wallet_overrides',
  TRANSFERS: 'mba_transfers',
  WALLET_CHECKS: 'mba_wallet_checks',
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
  currency: 'MMK',
  theme: 'dark',
  defaultWalletId: DEFAULT_WALLET_ID,
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

// ---- Products ----
export const getProducts = (userId: string): Product[] => {
  try {
    const raw = localStorage.getItem(`${KEYS.PRODUCTS}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const saveProduct = (userId: string, product: Product): void => {
  const existing = getProducts(userId);
  const idx = existing.findIndex(p => p.id === product.id);
  if (idx >= 0) existing[idx] = product;
  else existing.push(product);
  localStorage.setItem(`${KEYS.PRODUCTS}_${userId}`, JSON.stringify(existing));
};

export const deleteProduct = (userId: string, productId: string): void => {
  const existing = getProducts(userId).filter(p => p.id !== productId);
  localStorage.setItem(`${KEYS.PRODUCTS}_${userId}`, JSON.stringify(existing));
};

// ---- Stock Movements ----
export const getStockMovements = (userId: string): StockMovement[] => {
  try {
    const raw = localStorage.getItem(`${KEYS.STOCK_MOVEMENTS}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const saveStockMovement = (userId: string, movement: StockMovement): void => {
  const existing = getStockMovements(userId);
  existing.unshift(movement);
  localStorage.setItem(`${KEYS.STOCK_MOVEMENTS}_${userId}`, JSON.stringify(existing));
};

export const deleteStockMovement = (userId: string, movementId: string): void => {
  const existing = getStockMovements(userId).filter(m => m.id !== movementId);
  localStorage.setItem(`${KEYS.STOCK_MOVEMENTS}_${userId}`, JSON.stringify(existing));
};

// ---- Wallets ----
type BuiltInOverrides = Record<string, { openingBalance?: number }>;

const getBuiltInOverrides = (userId: string): BuiltInOverrides => {
  try {
    const raw = localStorage.getItem(`${KEYS.WALLET_OVERRIDES}_${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

const setBuiltInOverride = (userId: string, walletId: string, patch: { openingBalance?: number }) => {
  const overrides = getBuiltInOverrides(userId);
  overrides[walletId] = { ...overrides[walletId], ...patch };
  localStorage.setItem(`${KEYS.WALLET_OVERRIDES}_${userId}`, JSON.stringify(overrides));
};

export const getCustomWallets = (userId: string): Wallet[] => {
  try {
    const raw = localStorage.getItem(`${KEYS.WALLETS}_${userId}`);
    const list: Wallet[] = raw ? JSON.parse(raw) : [];
    return list.map(w => ({ ...w, openingBalance: w.openingBalance ?? 0 }));
  } catch { return []; }
};

export const getWallets = (userId: string): Wallet[] => {
  const overrides = getBuiltInOverrides(userId);
  const builtIns = BUILT_IN_WALLETS.map(w => ({
    ...w,
    openingBalance: overrides[w.id]?.openingBalance ?? w.openingBalance,
  }));
  return [...builtIns, ...getCustomWallets(userId)];
};

export const saveWallet = (userId: string, wallet: Wallet): void => {
  if (wallet.isBuiltIn) {
    setBuiltInOverride(userId, wallet.id, { openingBalance: wallet.openingBalance });
    return;
  }
  const existing = getCustomWallets(userId);
  const idx = existing.findIndex(w => w.id === wallet.id);
  if (idx >= 0) existing[idx] = wallet;
  else existing.push(wallet);
  localStorage.setItem(`${KEYS.WALLETS}_${userId}`, JSON.stringify(existing));
};

export const deleteWallet = (userId: string, walletId: string): void => {
  const existing = getCustomWallets(userId).filter(w => w.id !== walletId);
  localStorage.setItem(`${KEYS.WALLETS}_${userId}`, JSON.stringify(existing));
};

export const findWallet = (wallets: Wallet[], walletId: string | undefined, fallbackId: string): Wallet => {
  return wallets.find(w => w.id === walletId)
    ?? wallets.find(w => w.id === fallbackId)
    ?? BUILT_IN_WALLETS[0];
};

// ---- Transfers ----
export const getTransfers = (userId: string): Transfer[] => {
  try {
    const raw = localStorage.getItem(`${KEYS.TRANSFERS}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const saveTransfer = (userId: string, transfer: Transfer): void => {
  const existing = getTransfers(userId);
  const idx = existing.findIndex(t => t.id === transfer.id);
  if (idx >= 0) existing[idx] = transfer;
  else existing.push(transfer);
  localStorage.setItem(`${KEYS.TRANSFERS}_${userId}`, JSON.stringify(existing));
};

export const deleteTransfer = (userId: string, transferId: string): void => {
  const existing = getTransfers(userId).filter(t => t.id !== transferId);
  localStorage.setItem(`${KEYS.TRANSFERS}_${userId}`, JSON.stringify(existing));
};

// ---- Wallet Reconciliation Checks ----
export const getWalletChecks = (userId: string): WalletCheck[] => {
  try {
    const raw = localStorage.getItem(`${KEYS.WALLET_CHECKS}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const saveWalletCheck = (userId: string, check: WalletCheck): void => {
  const existing = getWalletChecks(userId).filter(c => !(c.walletId === check.walletId && c.date === check.date));
  existing.push(check);
  localStorage.setItem(`${KEYS.WALLET_CHECKS}_${userId}`, JSON.stringify(existing));
};

export const removeWalletCheck = (userId: string, walletId: string, date: string): void => {
  const existing = getWalletChecks(userId).filter(c => !(c.walletId === walletId && c.date === date));
  localStorage.setItem(`${KEYS.WALLET_CHECKS}_${userId}`, JSON.stringify(existing));
};

export const computeWalletBalance = (
  wallet: Wallet,
  transactions: Transaction[],
  transfers: Transfer[],
  defaultWalletId: string,
): { income: number; expense: number; transferIn: number; transferOut: number; balance: number } => {
  let income = 0, expense = 0, transferIn = 0, transferOut = 0;
  for (const tx of transactions) {
    const id = tx.wallet || defaultWalletId;
    if (id !== wallet.id) continue;
    if (tx.type === 'income') income += tx.amount;
    else expense += tx.amount;
  }
  for (const tr of transfers) {
    if (tr.fromWalletId === wallet.id) transferOut += tr.amount;
    if (tr.toWalletId === wallet.id) transferIn += tr.amount;
  }
  const balance = wallet.openingBalance + income - expense + transferIn - transferOut;
  return { income, expense, transferIn, transferOut, balance };
};

// ---- Export ----
export const exportToCSV = (userId: string): void => {
  const transactions = getTransactions(userId);
  const wallets = getWallets(userId);
  const transfers = getTransfers(userId);
  const prefs = getUserPrefs();
  const header = 'Date,Type,Amount,Description,Category,Wallet,FromWallet,ToWallet,Source\n';
  const txRows = transactions.map(t => {
    const w = findWallet(wallets, t.wallet, prefs.defaultWalletId);
    return `${t.date},${t.type},${t.amount},"${t.description}","${t.category}","${w.name}",,,${t.source}`;
  });
  const trRows = transfers.map(tr => {
    const from = findWallet(wallets, tr.fromWalletId, prefs.defaultWalletId);
    const to = findWallet(wallets, tr.toWalletId, prefs.defaultWalletId);
    return `${tr.date},transfer,${tr.amount},"${tr.note}","",,"${from.name}","${to.name}",manual`;
  });
  const rows = [...txRows, ...trRows].join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `myan-bookkeeping-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
