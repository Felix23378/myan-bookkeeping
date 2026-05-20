import { useMemo, useState } from 'react';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownRight, ArrowRightLeft, ChevronLeft, Star, Check, X, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CURRENCIES, computeWalletBalance, saveTransfer, deleteTransfer as removeTransfer, saveWalletCheck, removeWalletCheck as removeCheck, type Transaction, type Transfer, type Wallet, type WalletCheck } from '../../services/storage';

function formatAmount(n: number): string {
  return n.toLocaleString();
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

interface DailyActivity {
  wallet: Wallet;
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
  net: number;
  isReconciled: boolean;
}

function computeDailyActivity(
  wallets: Wallet[],
  transactions: Transaction[],
  transfers: Transfer[],
  walletChecks: WalletCheck[],
  date: string,
  defaultWalletId: string,
): DailyActivity[] {
  const checkSet = new Set(walletChecks.filter(c => c.date === date).map(c => c.walletId));
  return wallets.map(w => {
    let income = 0, expense = 0, transferIn = 0, transferOut = 0;
    for (const tx of transactions) {
      if (tx.date !== date) continue;
      const id = tx.wallet || defaultWalletId;
      if (id !== w.id) continue;
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    for (const tr of transfers) {
      if (tr.date !== date) continue;
      if (tr.fromWalletId === w.id) transferOut += tr.amount;
      if (tr.toWalletId === w.id) transferIn += tr.amount;
    }
    const net = income - expense + transferIn - transferOut;
    return { wallet: w, income, expense, transferIn, transferOut, net, isReconciled: checkSet.has(w.id) };
  }).filter(a => a.income || a.expense || a.transferIn || a.transferOut);
}

function TransferModal({ wallets, defaultFrom, onClose, onSave }: {
  wallets: Wallet[];
  defaultFrom: string;
  onClose: () => void;
  onSave: (from: string, to: string, amount: number, date: string, note: string) => void;
}) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(wallets.find(w => w.id !== defaultFrom)?.id ?? wallets[1]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (from === to) { setError('From နဲ့ To အိတ်က မတူရပါ'); return; }
    const n = Number(amount);
    if (!n || n <= 0) { setError('ပမာဏ ထည့်ပါ'); return; }
    onSave(from, to, n, date, note.trim());
    onClose();
  };

  return (
    <div className="edit-modal-backdrop" onClick={onClose}>
      <div className="edit-modal card animate-slide-up" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontWeight: 700, fontSize: '1rem' }} className="text-my">ပိုက်ဆံ လွှဲမည်</p>
          <button className="btn-icon tx-cancel" onClick={onClose} style={{ width: 28, height: 28 }}><X size={15} /></button>
        </div>

        <label className="transfer-label text-my">မှ (From)</label>
        <select className="edit-input w-full text-my" value={from} onChange={e => setFrom(e.target.value)}>
          {wallets.map(w => <option key={w.id} value={w.id}>{w.nameMy}</option>)}
        </select>

        <label className="transfer-label text-my mt-2">သို့ (To)</label>
        <select className="edit-input w-full text-my" value={to} onChange={e => setTo(e.target.value)}>
          {wallets.filter(w => w.id !== from).map(w => <option key={w.id} value={w.id}>{w.nameMy}</option>)}
        </select>

        <input
          className="edit-input w-full mt-2"
          type="number"
          placeholder="ပမာဏ"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />

        <div className="edit-row mt-2">
          <input
            className="edit-input w-full"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <input
            className="edit-input w-full text-my"
            type="text"
            placeholder="မှတ်စု (optional)"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        {error && <p style={{ color: 'var(--expense)', fontSize: '0.8rem', marginTop: 8 }} className="text-my">{error}</p>}

        <button className="btn btn-primary mt-3 text-my" style={{ width: '100%' }} onClick={handleSave}>
          <Check size={16} /> လွှဲမည်
        </button>

        <style>{`
          .transfer-label {
            display: block;
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-bottom: 4px;
          }
        `}</style>
      </div>
    </div>
  );
}

export default function Wallets() {
  const { state, dispatch } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);

  const currencyLabel = CURRENCIES[state.prefs.currency]?.nameMy || 'ကျပ်';
  const defaultId = state.prefs.defaultWalletId;
  const today = todayISO();

  const balances = useMemo(
    () => state.wallets.map(w => ({
      wallet: w,
      ...computeWalletBalance(w, state.transactions, state.transfers, defaultId),
    })),
    [state.wallets, state.transactions, state.transfers, defaultId]
  );

  const dailyActivity = useMemo(
    () => computeDailyActivity(state.wallets, state.transactions, state.transfers, state.walletChecks, today, defaultId),
    [state.wallets, state.transactions, state.transfers, state.walletChecks, today, defaultId]
  );

  const totalBalance = balances.reduce((s, b) => s + b.balance, 0);

  const handleSaveTransfer = (from: string, to: string, amount: number, date: string, note: string) => {
    if (!state.user) return;
    const transfer: Transfer = {
      id: generateId('tr'),
      userId: state.user.id,
      fromWalletId: from,
      toWalletId: to,
      amount,
      date,
      note,
      createdAt: new Date().toISOString(),
    };
    saveTransfer(state.user.id, transfer);
    dispatch({ type: 'ADD_TRANSFER', payload: transfer });
  };

  const handleDeleteTransfer = (transfer: Transfer) => {
    if (!state.user) return;
    if (!window.confirm('လွှဲမှု ဖျက်မှာ သေချာပါသလား?')) return;
    removeTransfer(state.user.id, transfer.id);
    dispatch({ type: 'DELETE_TRANSFER', payload: transfer.id });
  };

  const handleToggleReconcile = (walletId: string, isReconciled: boolean) => {
    if (!state.user) return;
    if (isReconciled) {
      removeCheck(state.user.id, walletId, today);
      dispatch({ type: 'REMOVE_WALLET_CHECK', payload: { walletId, date: today } });
    } else {
      const check: WalletCheck = {
        id: generateId('chk'),
        userId: state.user.id,
        walletId,
        date: today,
        checkedAt: new Date().toISOString(),
      };
      saveWalletCheck(state.user.id, check);
      dispatch({ type: 'ADD_WALLET_CHECK', payload: check });
    }
  };

  // Drill-in view
  if (selectedId) {
    const wallet = state.wallets.find(w => w.id === selectedId);
    if (!wallet) {
      setSelectedId(null);
      return null;
    }

    const summary = computeWalletBalance(wallet, state.transactions, state.transfers, defaultId);

    const walletTxs = state.transactions
      .filter(tx => (tx.wallet && tx.wallet === selectedId) || (!tx.wallet && selectedId === defaultId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const walletTransfers = state.transfers
      .filter(t => t.fromWalletId === selectedId || t.toWalletId === selectedId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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
              <p className="wallet-detail-balance" style={{ color: summary.balance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                {summary.balance >= 0 ? '' : '-'}{formatAmount(Math.abs(summary.balance))} {currencyLabel}
              </p>
              <p className="text-muted text-my" style={{ fontSize: '0.75rem' }}>
                လက်ကျန် (opening) {formatAmount(wallet.openingBalance)} · {walletTxs.length} txn · {walletTransfers.length} လွှဲ
              </p>
            </div>
          </div>

          <div className="wallet-summary-grid">
            <div className="wallet-summary-tile">
              <p className="text-my wallet-summary-label">ဝင်ငွေ</p>
              <p className="wallet-summary-amount" style={{ color: 'var(--income)' }}>+{formatAmount(summary.income)}</p>
            </div>
            <div className="wallet-summary-tile">
              <p className="text-my wallet-summary-label">ထွက်ငွေ</p>
              <p className="wallet-summary-amount" style={{ color: 'var(--expense)' }}>-{formatAmount(summary.expense)}</p>
            </div>
            <div className="wallet-summary-tile">
              <p className="text-my wallet-summary-label">လွှဲဝင်</p>
              <p className="wallet-summary-amount" style={{ color: 'var(--income)' }}>+{formatAmount(summary.transferIn)}</p>
            </div>
            <div className="wallet-summary-tile">
              <p className="text-my wallet-summary-label">လွှဲထွက်</p>
              <p className="wallet-summary-amount" style={{ color: 'var(--expense)' }}>-{formatAmount(summary.transferOut)}</p>
            </div>
          </div>

          {walletTransfers.length > 0 && (
            <div className="view-section">
              <div className="view-section-title"><span className="text-my">လွှဲမှုများ</span></div>
              <div className="tx-list">
                {walletTransfers.map(tr => {
                  const isOut = tr.fromWalletId === selectedId;
                  const otherId = isOut ? tr.toWalletId : tr.fromWalletId;
                  const other = state.wallets.find(w => w.id === otherId);
                  return (
                    <div key={tr.id} className="tx-item">
                      <div className="tx-type-dot" style={{ background: 'var(--accent-dim)' }}>
                        <ArrowRightLeft size={14} color="var(--accent)" />
                      </div>
                      <div className="tx-info">
                        <p className="tx-desc text-my">
                          {isOut ? `→ ${other?.nameMy ?? '?'}` : `← ${other?.nameMy ?? '?'}`}
                        </p>
                        <p className="tx-meta text-my">{tr.date}{tr.note ? ` · ${tr.note}` : ''}</p>
                      </div>
                      <p className="tx-amount" style={{ color: isOut ? 'var(--expense)' : 'var(--income)' }}>
                        {isOut ? '-' : '+'}{tr.amount.toLocaleString()}
                      </p>
                      <button className="tx-tr-delete" onClick={() => handleDeleteTransfer(tr)} aria-label="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="view-section">
            <div className="view-section-title"><span className="text-my">မှတ်တမ်းများ</span></div>
            {walletTxs.length === 0 ? (
              <div className="empty-state">
                <WalletIcon size={40} color="var(--text-disabled)" />
                <p className="text-my" style={{ color: 'var(--text-muted)', marginTop: 12 }}>မှတ်တမ်း မရှိသေးပါ</p>
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
        {/* Overall balance */}
        <div className="card wallet-overall">
          <p className="text-my text-muted" style={{ fontSize: '0.8125rem' }}>စုစုပေါင်း လက်ကျန်</p>
          <p className="wallet-overall-net" style={{ color: totalBalance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            {totalBalance >= 0 ? '' : '-'}{formatAmount(Math.abs(totalBalance))} {currencyLabel}
          </p>
          <button className="btn btn-primary wallet-transfer-btn text-my" onClick={() => setShowTransfer(true)}>
            <ArrowRightLeft size={15} /> လွှဲမည်
          </button>
        </div>

        {/* Today's reconciliation card */}
        {dailyActivity.length > 0 && (
          <div className="view-section">
            <div className="view-section-title">
              <span className="text-my">ဒီနေ့ စစ်ဆေးရန်</span>
              <span className="reconcile-hint text-my">အသုံးပြုပြီး Apps တွေနဲ့ တိုက်ဆိုင်စစ်ဆေးပါ</span>
            </div>
            <div className="reconcile-list card">
              {dailyActivity.map(a => (
                <div key={a.wallet.id} className={`reconcile-row ${a.isReconciled ? 'reconciled' : ''}`}>
                  <div className="reconcile-dot" style={{ background: a.wallet.color }} />
                  <div className="reconcile-info">
                    <span className="text-my" style={{ fontWeight: 500 }}>{a.wallet.nameMy}</span>
                    <span className="reconcile-detail text-my">
                      {a.income > 0 && <span style={{ color: 'var(--income)' }}>+{formatAmount(a.income)}</span>}
                      {a.expense > 0 && <span style={{ color: 'var(--expense)' }}> -{formatAmount(a.expense)}</span>}
                      {a.transferIn > 0 && <span style={{ color: 'var(--income)' }}> ↔+{formatAmount(a.transferIn)}</span>}
                      {a.transferOut > 0 && <span style={{ color: 'var(--expense)' }}> ↔-{formatAmount(a.transferOut)}</span>}
                    </span>
                  </div>
                  <span className="reconcile-net" style={{ color: a.net >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                    {a.net >= 0 ? '+' : '-'}{formatAmount(Math.abs(a.net))}
                  </span>
                  <button
                    className={`reconcile-check ${a.isReconciled ? 'active' : ''}`}
                    onClick={() => handleToggleReconcile(a.wallet.id, a.isReconciled)}
                    aria-label={a.isReconciled ? 'Mark unchecked' : 'Mark as checked'}
                    title={a.isReconciled ? 'စစ်ဆေးပြီး' : 'စစ်ဆေးပြီးအဖြစ် မှတ်ရန်'}
                  >
                    <Check size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All wallets */}
        <div className="view-section">
          <div className="view-section-title">
            <WalletIcon size={15} />
            <span className="text-my">ပိုက်ဆံအိတ်များ</span>
          </div>
          <div className="wallet-grid">
            {balances.map(b => {
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
                  <p className="wallet-tile-net" style={{ color: b.balance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                    {b.balance >= 0 ? '' : '-'}{formatAmount(Math.abs(b.balance))}
                  </p>
                  <p className="wallet-tile-count text-my text-muted">
                    ↑{formatAmount(b.income)} ↓{formatAmount(b.expense)}
                    {(b.transferIn > 0 || b.transferOut > 0) && ` · ↔${formatAmount(b.transferIn - b.transferOut)}`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {showTransfer && state.wallets.length >= 2 && (
          <TransferModal
            wallets={state.wallets}
            defaultFrom={defaultId}
            onClose={() => setShowTransfer(false)}
            onSave={handleSaveTransfer}
          />
        )}

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
    .wallet-transfer-btn {
      margin-top: 10px;
      padding: 8px 18px;
      border-radius: var(--radius-full);
      font-size: 0.875rem;
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
    .wallet-tile-head { display: flex; align-items: center; gap: 8px; }
    .wallet-tile-title {
      display: flex; align-items: center; gap: 4px;
      min-width: 0; flex: 1; font-size: 0.875rem;
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
    .wallet-tile-count { font-size: 0.7rem; margin: 0; }
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
    .wallet-detail-header { display: flex; align-items: center; gap: var(--space-3); }
    .wallet-detail-balance {
      font-size: 1.4rem;
      font-weight: 700;
      font-family: var(--font-burmese);
      margin: 2px 0;
    }
    .wallet-summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-2);
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
    .wallet-summary-label { font-size: 0.75rem; color: var(--text-muted); margin: 0; }
    .wallet-summary-amount {
      font-size: 0.95rem;
      font-weight: 700;
      font-family: var(--font-burmese);
      margin: 0;
    }
    .reconcile-hint {
      font-size: 0.7rem;
      color: var(--text-muted);
      font-weight: 400;
      margin-left: auto;
    }
    .reconcile-list { display: flex; flex-direction: column; padding: 0; overflow: hidden; }
    .reconcile-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
    }
    .reconcile-row:last-child { border-bottom: none; }
    .reconcile-row.reconciled { opacity: 0.55; }
    .reconcile-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .reconcile-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .reconcile-detail {
      font-size: 0.7rem;
      color: var(--text-muted);
      display: flex;
      gap: 2px;
      flex-wrap: wrap;
    }
    .reconcile-net {
      font-weight: 700;
      font-size: 0.9rem;
      font-family: var(--font-burmese);
    }
    .reconcile-check {
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 50%;
      width: 26px;
      height: 26px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-disabled);
      transition: all var(--transition);
    }
    .reconcile-check.active {
      background: var(--income-dim);
      border-color: var(--income);
      color: var(--income);
    }
    .reconcile-check:hover { color: var(--income); border-color: var(--income); }
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
    .tx-tr-delete {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-disabled);
      padding: 4px;
      border-radius: 6px;
      display: flex;
    }
    .tx-tr-delete:hover { color: var(--expense); background: var(--expense-dim); }
    .empty-state {
      display: flex; flex-direction: column;
      align-items: center;
      padding: var(--space-10) var(--space-4);
    }
  `}</style>
);
