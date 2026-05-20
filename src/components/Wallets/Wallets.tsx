import { useMemo, useState } from 'react';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownRight, ChevronLeft, Star } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CURRENCIES, type Transaction, type Wallet } from '../../services/storage';

function formatAmount(n: number): string {
  return n.toLocaleString();
}

interface WalletBalance {
  wallet: Wallet;
  income: number;
  expense: number;
  count: number;
}

function computeBalances(wallets: Wallet[], transactions: Transaction[], defaultWalletId: string): WalletBalance[] {
  const byId: Record<string, WalletBalance> = {};
  for (const w of wallets) {
    byId[w.id] = { wallet: w, income: 0, expense: 0, count: 0 };
  }
  for (const tx of transactions) {
    const id = tx.wallet && byId[tx.wallet] ? tx.wallet : defaultWalletId;
    if (!byId[id]) continue;
    byId[id].count++;
    if (tx.type === 'income') byId[id].income += tx.amount;
    else byId[id].expense += tx.amount;
  }
  return wallets.map(w => byId[w.id]);
}

export default function Wallets() {
  const { state } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const currencyLabel = CURRENCIES[state.prefs.currency]?.nameMy || 'ကျပ်';
  const defaultId = state.prefs.defaultWalletId;

  const balances = useMemo(
    () => computeBalances(state.wallets, state.transactions, defaultId),
    [state.wallets, state.transactions, defaultId]
  );

  const totals = useMemo(() => {
    const income = balances.reduce((s, b) => s + b.income, 0);
    const expense = balances.reduce((s, b) => s + b.expense, 0);
    return { income, expense, net: income - expense };
  }, [balances]);

  if (selectedId) {
    const wallet = state.wallets.find(w => w.id === selectedId);
    if (!wallet) {
      setSelectedId(null);
      return null;
    }
    const walletTxs = state.transactions
      .filter(tx => (tx.wallet && tx.wallet === selectedId) || (!tx.wallet && selectedId === defaultId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const income = walletTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = walletTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const net = income - expense;

    return (
      <div className="view-layout">
        <div className="view-content">
          <button className="wallet-back" onClick={() => setSelectedId(null)}>
            <ChevronLeft size={18} />
            <span className="text-my">ပြန်သွား</span>
          </button>

          <div className="wallet-detail-header card" style={{ borderColor: wallet.color + '55' }}>
            <div className="wallet-icon-large" style={{ background: wallet.color + '22', color: wallet.color }}>
              <WalletIcon size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <p className="text-my" style={{ fontWeight: 700, fontSize: '1.05rem' }}>{wallet.nameMy}</p>
              <p className="text-muted" style={{ fontSize: '0.8125rem' }}>{walletTxs.length} ခု မှတ်တမ်း</p>
            </div>
          </div>

          <div className="wallet-summary-grid">
            <div className="wallet-summary-tile" style={{ borderColor: 'rgba(34,197,94,0.3)' }}>
              <p className="text-my wallet-summary-label">ဝင်ငွေ</p>
              <p className="wallet-summary-amount" style={{ color: 'var(--income)' }}>
                +{formatAmount(income)} {currencyLabel}
              </p>
            </div>
            <div className="wallet-summary-tile" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
              <p className="text-my wallet-summary-label">ထွက်ငွေ</p>
              <p className="wallet-summary-amount" style={{ color: 'var(--expense)' }}>
                -{formatAmount(expense)} {currencyLabel}
              </p>
            </div>
            <div className="wallet-summary-tile wallet-net" style={{ borderColor: net >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)' }}>
              <p className="text-my wallet-summary-label">အသားတင်</p>
              <p className="wallet-summary-amount" style={{ color: net >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                {net >= 0 ? '+' : '-'}{formatAmount(Math.abs(net))} {currencyLabel}
              </p>
            </div>
          </div>

          <div className="view-section">
            <div className="view-section-title">
              <span className="text-my">မှတ်တမ်းများ</span>
            </div>
            {walletTxs.length === 0 ? (
              <div className="empty-state">
                <WalletIcon size={40} color="var(--text-disabled)" />
                <p className="text-my" style={{ color: 'var(--text-muted)', marginTop: 12 }}>
                  မှတ်တမ်း မရှိသေးပါ
                </p>
              </div>
            ) : (
              <div className="tx-list">
                {walletTxs.map(tx => (
                  <div key={tx.id} className="tx-item">
                    <div className="tx-type-dot" style={{ background: tx.type === 'income' ? 'var(--income-dim)' : 'var(--expense-dim)' }}>
                      {tx.type === 'income'
                        ? <ArrowUpRight size={14} color="var(--income)" />
                        : <ArrowDownRight size={14} color="var(--expense)" />}
                    </div>
                    <div className="tx-info">
                      <p className="tx-desc text-my">{tx.description}</p>
                      <p className="tx-meta text-my">{tx.category} · {tx.date}</p>
                    </div>
                    <p className="tx-amount" style={{ color: tx.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>
                      {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {walletStyles}
        </div>
      </div>
    );
  }

  return (
    <div className="view-layout">
      <div className="view-content">
        {/* Overall summary */}
        <div className="card wallet-overall">
          <p className="text-my text-muted" style={{ fontSize: '0.8125rem' }}>စုစုပေါင်း အသားတင်</p>
          <p className="wallet-overall-net" style={{ color: totals.net >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            {totals.net >= 0 ? '+' : '-'}{formatAmount(Math.abs(totals.net))} {currencyLabel}
          </p>
          <div className="wallet-overall-row">
            <span style={{ color: 'var(--income)' }}>↑ {formatAmount(totals.income)}</span>
            <span style={{ color: 'var(--expense)' }}>↓ {formatAmount(totals.expense)}</span>
          </div>
        </div>

        <div className="view-section">
          <div className="view-section-title">
            <WalletIcon size={15} />
            <span className="text-my">ပိုက်ဆံအိတ်များ</span>
          </div>
          <div className="wallet-grid">
            {balances.map(b => {
              const net = b.income - b.expense;
              const isDefault = b.wallet.id === defaultId;
              return (
                <button
                  key={b.wallet.id}
                  className="wallet-tile"
                  style={{ borderColor: b.wallet.color + '55' }}
                  onClick={() => setSelectedId(b.wallet.id)}
                >
                  <div className="wallet-tile-head">
                    <div className="wallet-icon" style={{ background: b.wallet.color + '22', color: b.wallet.color }}>
                      <WalletIcon size={16} />
                    </div>
                    <div className="wallet-tile-title">
                      <span className="text-my" style={{ fontWeight: 600 }}>{b.wallet.nameMy}</span>
                      {isDefault && <Star size={12} fill="var(--accent)" color="var(--accent)" />}
                    </div>
                  </div>
                  <p className="wallet-tile-net" style={{ color: net >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                    {net >= 0 ? '+' : '-'}{formatAmount(Math.abs(net))}
                  </p>
                  <p className="wallet-tile-count text-my text-muted">
                    {b.count} ခု · ↑{formatAmount(b.income)} ↓{formatAmount(b.expense)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {walletStyles}
      </div>
    </div>
  );
}

const walletStyles = (
  <style>{`
    .wallet-overall {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: var(--space-5);
    }
    .wallet-overall-net {
      font-size: 1.5rem;
      font-weight: 700;
      font-family: var(--font-burmese);
    }
    .wallet-overall-row {
      display: flex;
      gap: var(--space-4);
      font-size: 0.875rem;
      font-weight: 500;
      margin-top: 4px;
    }
    .wallet-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-3);
    }
    .wallet-tile {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-3);
      text-align: left;
      cursor: pointer;
      transition: transform var(--transition), border-color var(--transition);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .wallet-tile:hover { transform: translateY(-1px); }
    .wallet-tile-head {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .wallet-tile-title {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
      flex: 1;
      font-size: 0.875rem;
    }
    .wallet-icon {
      width: 28px; height: 28px;
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .wallet-icon-large {
      width: 48px; height: 48px;
      border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .wallet-tile-net {
      font-size: 1rem;
      font-weight: 700;
      font-family: var(--font-burmese);
      margin: 4px 0 0;
    }
    .wallet-tile-count {
      font-size: 0.7rem;
      margin: 0;
    }
    .wallet-back {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px 0;
      font-size: 0.875rem;
      align-self: flex-start;
    }
    .wallet-back:hover { color: var(--text-primary); }
    .wallet-detail-header {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    .wallet-summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-3);
    }
    .wallet-summary-tile {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: var(--space-3);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .wallet-summary-tile.wallet-net { grid-column: 1 / -1; }
    .wallet-summary-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin: 0;
    }
    .wallet-summary-amount {
      font-size: 1rem;
      font-weight: 700;
      font-family: var(--font-burmese);
      margin: 0;
    }
    .tx-list {
      display: flex;
      flex-direction: column;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .tx-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      border-bottom: 1px solid var(--border);
      padding: var(--space-4);
    }
    .tx-item:last-child { border-bottom: none; }
    .tx-type-dot {
      width: 32px; height: 32px;
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .tx-info { flex: 1; min-width: 0; }
    .tx-desc { font-size: 0.9rem; font-weight: 500; margin: 0; }
    .tx-meta { font-size: 0.75rem; color: var(--text-muted); margin: 2px 0 0; }
    .tx-amount { font-size: 0.9rem; font-weight: 600; font-family: var(--font-burmese); white-space: nowrap; }
    .empty-state {
      display: flex; flex-direction: column;
      align-items: center;
      padding: var(--space-10) var(--space-4);
    }
  `}</style>
);
