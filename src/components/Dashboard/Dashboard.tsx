import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, Trash2, Calendar, Pencil, X, Check, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { deleteTransaction, saveTransaction, CURRENCIES } from '../../services/storage';
import type { Transaction } from '../../services/storage';

const CATEGORIES = [
  'ရောင်းရငွေ', 'ဝန်ဆောင်မှုခ', 'လစာ', 'အတိုးရငွေ', 'အခြားဝင်ငွေ',
  'ကုန်ပစ္စည်းဝယ်ခ', 'အငှားခ', 'ပို့ဆောင်ရေး', 'ရုံးစရိတ်',
  'အစားအသောက်', 'ဈေးဝယ်', 'ခရီးစရိတ်', 'ကျန်းမာရေး', 'ပညာရေး',
  'ဖုန်း/အင်တာနက်', 'မီး/ရေ', 'အဝတ်အထည်', 'ဖျော်ဖြေရေး', 'အခြားကုန်ကျ',
];

function generateId() {
  return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function AddTransactionModal({ onClose, onSave }: { onClose: () => void; onSave: (tx: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'source'>) => void }) {
  const today = new Date().toISOString().split('T')[0];
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('ရောင်းရငွေ');
  const [date, setDate] = useState(today);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!amount || Number(amount) <= 0) { setError('ပမာဏ ထည့်ပါ။'); return; }
    if (!description.trim()) { setError('အကြောင်းအရာ ထည့်ပါ။'); return; }
    onSave({ type, amount: Number(amount), description: description.trim(), category, date });
    onClose();
  };

  return (
    <div className="edit-modal-backdrop" onClick={onClose}>
      <div className="edit-modal card animate-slide-up" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }} className="text-my">
            မှတ်တမ်းအသစ်
          </p>
          <button className="btn-icon tx-cancel" onClick={onClose} style={{ width: 28, height: 28 }}><X size={15} /></button>
        </div>

        {/* Type toggle */}
        <div className="add-type-toggle">
          <button
            className={`add-type-btn text-my ${type === 'income' ? 'active-income' : ''}`}
            onClick={() => { setType('income'); setCategory('ရောင်းရငွေ'); }}
          >
            <ArrowUpRight size={15} /> ဝင်ငွေ
          </button>
          <button
            className={`add-type-btn text-my ${type === 'expense' ? 'active-expense' : ''}`}
            onClick={() => { setType('expense'); setCategory('ကုန်ပစ္စည်းဝယ်ခ'); }}
          >
            <ArrowDownRight size={15} /> ထွက်ငွေ
          </button>
        </div>

        {/* Amount */}
        <input
          className="edit-input w-full mt-2"
          type="number"
          min="1"
          placeholder="ပမာဏ"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          autoFocus
        />

        {/* Description */}
        <input
          className="edit-input w-full mt-2 text-my"
          type="text"
          placeholder="အကြောင်းအရာ"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />

        {/* Category + Date row */}
        <div className="edit-row mt-2">
          <select
            className="edit-input w-full text-my"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            className="edit-input w-full"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        {error && <p style={{ color: 'var(--expense)', fontSize: '0.8rem', marginTop: 8 }} className="text-my">{error}</p>}

        {/* Save */}
        <button
          className="btn btn-primary mt-3 text-my"
          style={{ width: '100%' }}
          onClick={handleSave}
        >
          <Check size={16} /> သိမ်းမည်
        </button>
      </div>
    </div>
  );
}

type Period = 'today' | 'week' | 'month' | 'all';

function getDateRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setFullYear(2000);
  }

  return { start, end };
}

function formatAmount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toLocaleString();
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'ဒီနေ့',
  week: 'ဒီအပတ်',
  month: 'ဒီလ',
  all: 'အားလုံး',
};

interface SummaryCardProps {
  label: string;
  amount: number;
  type: 'income' | 'expense' | 'profit';
  icon: React.ReactNode;
  currencyLabel: string;
}

function SummaryCard({ label, amount, type, icon, currencyLabel }: SummaryCardProps) {
  const colorMap = {
    income: 'var(--income)',
    expense: 'var(--expense)',
    profit: amount >= 0 ? 'var(--income)' : 'var(--expense)',
  };
  const bgMap = {
    income: 'var(--income-dim)',
    expense: 'var(--expense-dim)',
    profit: amount >= 0 ? 'var(--income-dim)' : 'var(--expense-dim)',
  };
  const color = colorMap[type];
  const bg = bgMap[type];

  return (
    <div className="summary-card animate-fade-in">
      <div className="summary-icon" style={{ background: bg, color }}>
        {icon}
      </div>
      <div>
        <p className="summary-label text-my">{label}</p>
        <p className="summary-amount" style={{ color }}>
          {type === 'profit' && amount >= 0 ? '+' : type === 'profit' ? '-' : ''}
          {formatAmount(Math.abs(amount))} {currencyLabel}
        </p>
      </div>
    </div>
  );
}

function TransactionItem({ tx, onDelete, onEdit }: { tx: Transaction; onDelete: () => void; onEdit: (tx: Transaction) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTx, setEditedTx] = useState(tx);

  const isIncome = tx.type === 'income';

  return (
    <>
      <div className="tx-item animate-fade-in">
        <div className="tx-type-dot" style={{ background: isIncome ? 'var(--income-dim)' : 'var(--expense-dim)', border: `1px solid ${isIncome ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
          {isIncome ? <ArrowUpRight size={14} color="var(--income)" /> : <ArrowDownRight size={14} color="var(--expense)" />}
        </div>
        <div className="tx-info">
          <p className="tx-desc text-my">{tx.description}</p>
          <p className="tx-meta text-my">{tx.category} · {tx.date}</p>
        </div>
        <div className="tx-right">
          <p className="tx-amount" style={{ color: isIncome ? 'var(--income)' : 'var(--expense)' }}>
            {isIncome ? '+' : '-'}{tx.amount.toLocaleString()}
          </p>
          <div className="tx-actions">
            <button className="btn-icon tx-edit" onClick={() => setIsEditing(true)} aria-label="Edit" style={{ width: 28, height: 28 }}>
              <Pencil size={13} />
            </button>
            <button className="btn-icon tx-delete" onClick={onDelete} aria-label="Delete" style={{ width: 28, height: 28 }}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
      {isEditing && (
        <div className="edit-modal-backdrop" onClick={() => setIsEditing(false)}>
          <div className="edit-modal card animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="edit-row">
              <select
                value={editedTx.type}
                onChange={e => setEditedTx({ ...editedTx, type: e.target.value as 'income' | 'expense' })}
                className="edit-input w-full"
              >
                <option value="income">ဝင်ငွေ</option>
                <option value="expense">ထွက်ငွေ</option>
              </select>
              <input
                type="date"
                value={editedTx.date}
                onChange={e => setEditedTx({ ...editedTx, date: e.target.value })}
                className="edit-input w-full text-my"
              />
            </div>
            <input
              type="text"
              value={editedTx.description}
              onChange={e => setEditedTx({ ...editedTx, description: e.target.value })}
              placeholder="အကြောင်းအရာ"
              className="edit-input w-full mt-2 text-my"
            />
            <div className="edit-row mt-2">
              <input
                type="number"
                value={editedTx.amount || ''}
                onChange={e => setEditedTx({ ...editedTx, amount: Number(e.target.value) })}
                placeholder="ပမာဏ"
                className="edit-input w-full"
              />
              <input
                type="text"
                value={editedTx.category}
                onChange={e => setEditedTx({ ...editedTx, category: e.target.value })}
                placeholder="အမျိုးအစား"
                className="edit-input w-full text-my"
              />
            </div>
            <div className="edit-actions mt-3">
              <button className="btn-icon tx-cancel" onClick={() => setIsEditing(false)}>
                <X size={16} />
              </button>
              <button className="btn-icon tx-save" onClick={() => { onEdit(editedTx); setIsEditing(false); }}>
                <Check size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Minimal bar chart
function IncomeExpenseChart({ transactions }: { transactions: Transaction[] }) {
  const grouped = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    for (const tx of transactions) {
      if (!map[tx.date]) map[tx.date] = { income: 0, expense: 0 };
      if (tx.type === 'income') map[tx.date].income += tx.amount;
      else map[tx.date].expense += tx.amount;
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-7);
  }, [transactions]);

  if (grouped.length === 0) return null;

  const maxVal = Math.max(...grouped.flatMap(([, v]) => [v.income, v.expense]), 1);

  return (
    <div className="chart-container">
      <p className="chart-title text-my">ဝင်ငွေ / ထွက်ငွေ (နောက်ဆုံး {grouped.length} ရက်)</p>
      <div className="chart-bars">
        {grouped.map(([date, v]) => (
          <div key={date} className="chart-col">
            <div className="chart-bar-group">
              <div className="chart-bar income-bar" style={{ height: `${(v.income / maxVal) * 80}px` }} title={`ဝင်ငွေ: ${v.income.toLocaleString()}`} />
              <div className="chart-bar expense-bar" style={{ height: `${(v.expense / maxVal) * 80}px` }} title={`ထွက်ငွေ: ${v.expense.toLocaleString()}`} />
            </div>
            <span className="chart-label">{date.slice(5)}</span>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span><span className="legend-dot" style={{ background: 'var(--income)' }} />ဝင်ငွေ</span>
        <span><span className="legend-dot" style={{ background: 'var(--expense)' }} />ထွက်ငွေ</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { state, dispatch } = useApp();
  const [period, setPeriod] = useState<Period>('today');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddTransaction = (partial: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'source'>) => {
    if (!state.user) return;
    const tx: Transaction = {
      ...partial,
      id: generateId(),
      userId: state.user.id,
      createdAt: new Date().toISOString(),
      source: 'manual',
    };
    saveTransaction(state.user.id, tx);
    dispatch({ type: 'ADD_TRANSACTION', payload: tx });
  };

  const filtered = useMemo(() => {
    const { start, end } = getDateRange(period);
    return state.transactions.filter(tx => {
      const d = new Date(tx.date);
      return d >= start && d <= end;
    });
  }, [state.transactions, period]);

  const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const profit = income - expense;
  const currencyLabel = CURRENCIES[state.prefs.currency]?.nameMy || 'ကျပ်';

  const handleDelete = (tx: Transaction) => {
    if (!state.user) return;
    if (!window.confirm('ဖျက်မှာ သေချာပါသလား?')) return;
    deleteTransaction(state.user.id, tx.id);
    dispatch({ type: 'DELETE_TRANSACTION', payload: tx.id });
  };

  const handleEdit = (tx: Transaction) => {
    if (!state.user) return;
    saveTransaction(state.user.id, tx);
    dispatch({ type: 'UPDATE_TRANSACTION', payload: tx });
  };

  return (
    <div className="view-layout">
      <div className="view-content">
        {/* Period selector */}
        <div className="period-tabs">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button
              key={p}
              id={`tab-period-${p}`}
              className={`period-tab text-my ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="summary-cards">
          <SummaryCard label="ဝင်ငွေ" amount={income} type="income" icon={<TrendingUp size={18} />} currencyLabel={currencyLabel} />
          <SummaryCard label="ထွက်ငွေ" amount={expense} type="expense" icon={<TrendingDown size={18} />} currencyLabel={currencyLabel} />
          <SummaryCard label={profit >= 0 ? 'အမြတ်' : 'အရှုံး'} amount={profit} type="profit" icon={<Minus size={18} />} currencyLabel={currencyLabel} />
        </div>

        {/* Chart */}
        {filtered.length > 0 && <IncomeExpenseChart transactions={filtered} />}

        {/* Transaction list */}
        <div className="view-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="view-section-title">
              <Calendar size={15} />
              <span className="text-my">မှတ်တမ်းများ</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-neutral">{filtered.length}</span>
              <button
                className="add-tx-btn text-my"
                onClick={() => setShowAddForm(true)}
                title="မှတ်တမ်းအသစ်ထည့်ရန်"
              >
                <Plus size={15} />
                ထည့်မည်
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <Calendar size={40} color="var(--text-disabled)" />
              <p className="text-my" style={{ color: 'var(--text-muted)', marginTop: 12 }}>
                {period === 'today' ? 'ဒီနေ့ မှတ်တမ်း မရှိသေးပါ' : 'ဤကာလတွင် မှတ်တမ်း မရှိပါ'}
              </p>
              <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>Chat မှာ ရောင်းတာ/ဝယ်တာ ပြောပါ</p>
            </div>
          ) : (
            <div className="tx-list">
              {[...filtered].reverse().map(tx => (
                <TransactionItem key={tx.id} tx={tx} onDelete={() => handleDelete(tx)} onEdit={handleEdit} />
              ))}
            </div>
          )}
        </div>

        {showAddForm && (
          <AddTransactionModal
            onClose={() => setShowAddForm(false)}
            onSave={handleAddTransaction}
          />
        )}

        <style>{`
          .period-tabs {
            display: flex;
            gap: 6px;
            background: var(--bg-secondary);
            padding: 4px;
            border-radius: var(--radius-md);
            border: 1px solid var(--border);
          }
          .period-tab {
            flex: 1;
            padding: 7px 4px;
            border-radius: var(--radius-sm);
            font-size: 0.8125rem;
            font-weight: 500;
            background: transparent;
            color: var(--text-muted);
            border: none;
            cursor: pointer;
            transition: all var(--transition);
          }
          .period-tab.active { background: var(--bg-card); color: var(--text-primary); box-shadow: var(--shadow-sm); }
          .summary-cards { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
          .summary-cards > :last-child { grid-column: 1 / -1; }
          .summary-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            padding: var(--space-4);
            display: flex;
            align-items: center;
            gap: var(--space-3);
          }
          .summary-icon {
            width: 40px; height: 40px;
            border-radius: var(--radius-md);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
          }
          .summary-label { font-size: 0.8125rem; color: var(--text-muted); margin: 0; }
          .summary-amount { font-size: 1.125rem; font-weight: 700; margin: 2px 0 0; font-family: var(--font-burmese); }
          .chart-container {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            padding: var(--space-4);
          }
          .chart-title { font-size: 0.8125rem; color: var(--text-muted); margin-bottom: var(--space-3); }
          .chart-bars {
            display: flex;
            align-items: flex-end;
            gap: 8px;
            height: 96px;
            padding-bottom: 4px;
          }
          .chart-col {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            height: 100%;
            justify-content: flex-end;
          }
          .chart-bar-group {
            display: flex;
            gap: 2px;
            align-items: flex-end;
            width: 100%;
            justify-content: center;
          }
          .chart-bar {
            width: 8px;
            border-radius: 3px 3px 0 0;
            min-height: 2px;
            transition: height 0.5s ease;
          }
          .income-bar { background: var(--income); }
          .expense-bar { background: var(--expense); }
          .chart-label { font-size: 0.6rem; color: var(--text-disabled); text-align: center; white-space: nowrap; }
          .chart-legend { display: flex; gap: var(--space-4); margin-top: var(--space-3); font-size: 0.75rem; color: var(--text-muted); }
          .legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 4px; }
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
            background: transparent;
            border-bottom: 1px solid var(--border);
            padding: var(--space-4) var(--space-4);
          }
          .tx-item:last-child { border-bottom: none; }
          .tx-type-dot { width: 32px; height: 32px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .tx-info { flex: 1; min-width: 0; }
          .tx-desc { font-size: 0.9rem; font-weight: 500; margin: 0; color: var(--text-primary); }
          .tx-meta { font-size: 0.75rem; color: var(--text-muted); margin: 2px 0 0; }
          .tx-right { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
          .tx-amount { font-size: 0.9rem; font-weight: 600; font-family: var(--font-burmese); white-space: nowrap; }
          .tx-actions { display: flex; gap: 4px; }
          .tx-edit { color: var(--text-disabled); border-radius: 6px; }
          .tx-edit:hover { color: var(--income); background: var(--income-dim); }
          .tx-delete { color: var(--text-disabled); border-radius: 6px; }
          .tx-delete:hover { color: var(--expense); background: var(--expense-dim); }
          .edit-modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.55);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--space-4);
            padding-bottom: calc(var(--nav-height) + var(--safe-bottom) + var(--space-4));
            z-index: 60;
          }
          .edit-modal {
            width: min(100%, 440px);
            max-height: 80vh;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 0;
            padding: var(--space-5);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-lg);
          }
          .edit-row { display: flex; gap: 8px; }
          .edit-input { 
            background: var(--bg-primary); 
            border: 1px solid var(--border); 
            color: var(--text-primary); 
            padding: 6px 10px; 
            border-radius: var(--radius-sm); 
            font-size: 1rem; /* Prevent iOS zoom */
          }
          .edit-input:focus { outline: 1px solid var(--primary); border-color: transparent; }
          .edit-actions { display: flex; justify-content: flex-end; gap: 8px; }
          .tx-save { color: var(--income); background: var(--income-dim); border-radius: 6px; width: 32px; height: 32px; }
          .tx-cancel { color: var(--text-muted); background: var(--bg-primary); border-radius: 6px; width: 32px; height: 32px; border: 1px solid var(--border); }
          .w-full { width: 100%; box-sizing: border-box; }
          .mt-2 { margin-top: 8px; }
          .mt-3 { margin-top: 12px; }
          .empty-state { display: flex; flex-direction: column; align-items: center; padding: var(--space-10) var(--space-4); }
          .add-tx-btn {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 6px 12px;
            border-radius: var(--radius-full);
            border: 1px solid rgba(245,158,11,0.35);
            background: var(--accent-dim);
            color: var(--accent);
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: background var(--transition), border-color var(--transition);
          }
          .add-tx-btn:hover { background: rgba(245,158,11,0.25); border-color: rgba(245,158,11,0.55); }
          .add-type-toggle {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            background: var(--bg-primary);
            padding: 4px;
            border-radius: var(--radius-md);
            border: 1px solid var(--border);
          }
          .add-type-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 9px;
            border-radius: var(--radius-sm);
            border: none;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 600;
            background: transparent;
            color: var(--text-muted);
            transition: all var(--transition);
          }
          .add-type-btn.active-income { background: var(--income-dim); color: var(--income); }
          .add-type-btn.active-expense { background: var(--expense-dim); color: var(--expense); }
        `}</style>
      </div>
    </div>
  );
}
