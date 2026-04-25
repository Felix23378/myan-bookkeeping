import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownCircle, Package2, Plus, ShoppingCart, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { createManualStockMovement, createProductRecord, persistNewProduct } from '../../services/records';
import type { Product } from '../../services/storage';

type ActionType = 'stock_in' | 'stock_out' | 'sale';

interface PendingAction {
  productId: string;
  type: ActionType;
}

function fmt(n: number) {
  return n.toLocaleString();
}

const ACTION_CONFIG = {
  stock_in:  { label: 'ထပ်ဖြည့်',  color: 'var(--income)',   dimColor: 'rgba(34,197,94,0.2)',   icon: Plus },
  sale:      { label: 'ရောင်းမည်', color: 'var(--accent)',   dimColor: 'rgba(245,158,11,0.2)',   icon: ShoppingCart },
  stock_out: { label: 'လျှော့မည်', color: 'var(--expense)',  dimColor: 'rgba(239,68,68,0.18)',   icon: ArrowDownCircle },
} as const;

// ─── Action Panel ─────────────────────────────────────────────────────────────
function ActionPanel({
  product,
  type,
  onConfirm,
  onCancel,
}: {
  product: Product;
  type: ActionType;
  onConfirm: (qty: number, cost?: number, note?: string) => void;
  onCancel: () => void;
}) {
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const cfg = ACTION_CONFIG[type];

  const handleConfirm = () => {
    const n = Number(qty);
    if (!n || n <= 0) return;
    onConfirm(n, cost ? Number(cost) : undefined, undefined);
  };

  return (
    <div className="action-panel">
      <div className="action-panel-header">
        <span className="action-panel-label text-my" style={{ color: cfg.color }}>{cfg.label}</span>
        <button className="action-panel-close" onClick={onCancel}><X size={16} /></button>
      </div>

      <div className="action-panel-fields">
        <div className="action-panel-field">
          <label className="action-panel-field-label text-my">အရေအတွက်</label>
          <div className="action-panel-field-row">
            <input
              className="action-input"
              type="number"
              min="1"
              placeholder="0"
              value={qty}
              onChange={e => setQty(e.target.value)}
              autoFocus
            />
            <span className="action-unit text-my">{product.unitLabel}</span>
          </div>
        </div>

        {type === 'stock_in' && (
          <div className="action-panel-field">
            <label className="action-panel-field-label text-my">ဝယ်ဈေး (optional)</label>
            <div className="action-panel-field-row">
              <input
                className="action-input"
                type="number"
                min="0"
                placeholder="0"
                value={cost}
                onChange={e => setCost(e.target.value)}
              />
              <span className="action-unit text-my">ကျပ်</span>
            </div>
          </div>
        )}
      </div>

      <button
        className="action-confirm-btn text-my"
        style={{ background: cfg.color }}
        onClick={handleConfirm}
        disabled={!qty || Number(qty) <= 0}
      >
        {cfg.label}
      </button>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
  product,
  pendingAction,
  feedback,
  onAction,
  onConfirm,
  onCancel,
}: {
  product: Product;
  pendingAction: PendingAction | null;
  feedback: string | null;
  onAction: (product: Product, type: ActionType) => void;
  onConfirm: (qty: number, cost?: number) => void;
  onCancel: () => void;
}) {
  const isActive = pendingAction?.productId === product.id;
  const lowStock = product.currentQty <= 3;

  return (
    <div className={`inv-card ${isActive ? 'inv-card--active' : ''} ${lowStock ? 'inv-card--low' : ''}`}>
      {/* Top row */}
      <div className="inv-card-top">
        <div className="inv-card-info">
          <p className="inv-card-name">{product.name}</p>
          <p className="inv-card-price text-my">ရောင်းဈေး {fmt(product.sellingPrice)} ကျပ်</p>
        </div>
        <div className={`inv-qty-badge ${lowStock ? 'inv-qty-badge--low' : ''}`}>
          {lowStock && <AlertTriangle size={12} />}
          <span className="text-my">{product.currentQty} {product.unitLabel}</span>
        </div>
      </div>

      {/* Action buttons */}
      {!isActive && (
        <div className="inv-action-row">
          {(['stock_in', 'sale', 'stock_out'] as ActionType[]).map(type => {
            const cfg = ACTION_CONFIG[type];
            const Icon = cfg.icon;
            return (
              <button
                key={type}
                className="inv-action-btn text-my"
                style={{ color: cfg.color, background: cfg.dimColor }}
                onClick={() => onAction(product, type)}
              >
                <Icon size={14} />
                {cfg.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Inline action panel */}
      {isActive && pendingAction && (
        <ActionPanel
          product={product}
          type={pendingAction.type}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}

      {/* Feedback */}
      {isActive && feedback && (
        <p className="inv-feedback text-my">{feedback}</p>
      )}
    </div>
  );
}

// ─── Add Product Form ─────────────────────────────────────────────────────────
function AddProductForm({ onDone }: { onDone: () => void }) {
  const { state, dispatch } = useApp();
  const [name, setName] = useState('');
  const [unitLabel, setUnitLabel] = useState('ခု');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!state.user) return;
    const q = Number(qty);
    const p = Number(price);
    if (!name.trim() || !unitLabel.trim() || q < 0 || p <= 0) {
      setError('အချက်အလက်အားလုံး ဖြည့်ပါ။');
      return;
    }
    const product = createProductRecord(state.user.id, { name, unitLabel, currentQty: q, sellingPrice: p });
    persistNewProduct(state.user.id, product, dispatch);
    onDone();
  };

  return (
    <div className="add-form">
      <div className="add-form-row">
        <input className="input text-my" placeholder="ကုန်ပစ္စည်းအမည်" value={name} onChange={e => setName(e.target.value)} />
        <input className="input text-my" placeholder="ယူနစ် (ခု/ဘူး)" value={unitLabel} onChange={e => setUnitLabel(e.target.value)} style={{ maxWidth: 100 }} />
      </div>
      <div className="add-form-row">
        <input className="input" type="number" min="0" placeholder="စတင် stock" value={qty} onChange={e => setQty(e.target.value)} />
        <input className="input" type="number" min="0" placeholder="ရောင်းဈေး" value={price} onChange={e => setPrice(e.target.value)} />
      </div>
      {error && <p className="inv-error text-my">{error}</p>}
      <button className="btn btn-primary" onClick={handleSubmit}>
        <Plus size={16} />
        <span className="text-my">ထည့်မည်</span>
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Inventory() {
  const { state, dispatch } = useApp();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [feedback, setFeedback] = useState<{ productId: string; message: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const products = state.products;

  const lowStockCount = useMemo(
    () => products.filter(p => p.currentQty <= 3).length,
    [products]
  );

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );

  const handleAction = (product: Product, type: ActionType) => {
    setFeedback(null);
    setPendingAction({ productId: product.id, type });
  };

  const handleConfirm = (product: Product, qty: number, cost?: number) => {
    if (!state.user) return;
    const result = createManualStockMovement({
      userId: state.user.id,
      product,
      qty,
      type: pendingAction!.type,
      date: new Date().toISOString().split('T')[0],
      note: pendingAction!.type === 'sale' ? 'Manual sale' : 'Manual stock update',
      totalCost: cost,
      dispatch,
    });

    if (!result.ok) {
      setFeedback({ productId: product.id, message: result.message });
      return;
    }

    const type = pendingAction!.type;
    let msg = '';
    if (type === 'sale') msg = `${product.name} ${qty} ${product.unitLabel} ရောင်းပြီး income မှတ်ပြီ ✓`;
    else if (type === 'stock_in') msg = `${product.name} ${qty} ${product.unitLabel} ဖြည့်ပြီ${cost ? ` · expense မှတ်ပြီ` : ''} ✓`;
    else msg = `${product.name} ${qty} ${product.unitLabel} လျှော့ပြီ ✓`;

    setFeedback({ productId: product.id, message: msg });
    setPendingAction(null);
  };

  const handleCancel = () => {
    setPendingAction(null);
    setFeedback(null);
  };

  return (
    <div className="view-layout">
      <div className="view-content">

        {/* Summary bar */}
        <div className="inv-summary">
          <Package2 size={13} />
          <span className="text-my">{products.length} ကုန်ပစ္စည်း</span>
          {lowStockCount > 0 && (
            <>
              <span className="inv-summary-sep">·</span>
              <AlertTriangle size={13} style={{ color: 'var(--expense)', flexShrink: 0 }} />
              <span className="text-my inv-summary-warn">{lowStockCount}ခု stock နည်း</span>
            </>
          )}
        </div>

        {/* Product list */}
        {sortedProducts.length === 0 ? (
          <div className="inv-empty">
            <Package2 size={32} strokeWidth={1.5} />
            <p className="text-my">ကုန်ပစ္စည်းမရှိသေးပါ</p>
            <p className="text-my inv-empty-sub">အောက်က ခလုတ်နှိပ်ပြီး ကုန်ပစ္စည်းထည့်ပါ</p>
          </div>
        ) : (
          <div className="inv-list">
            {sortedProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                pendingAction={pendingAction?.productId === product.id ? pendingAction : null}
                feedback={feedback?.productId === product.id ? feedback.message : null}
                onAction={handleAction}
                onConfirm={(qty, cost) => handleConfirm(product, qty, cost)}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}

        {/* Add product section */}
        <div className="inv-add-section">
          {!showAddForm ? (
            <button className="inv-add-trigger text-my" onClick={() => setShowAddForm(true)}>
              <Plus size={18} />
              ကုန်ပစ္စည်းအသစ်ထည့်မည်
            </button>
          ) : (
            <div className="inv-add-sheet">
              <div className="inv-add-sheet-header">
                <span className="text-my" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>ကုန်ပစ္စည်းအသစ်</span>
                <button className="action-panel-close" onClick={() => setShowAddForm(false)}><X size={16} /></button>
              </div>
              <AddProductForm onDone={() => setShowAddForm(false)} />
            </div>
          )}
        </div>

      </div>

      <style>{`
        .inv-summary {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: var(--space-1) 0 var(--space-2);
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--text-muted);
        }
        .inv-summary-sep { color: var(--border-strong); }
        .inv-summary-warn { color: var(--expense); }

        /* List */
        .inv-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        /* Card */
        .inv-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          transition: border-color var(--transition);
        }
        .inv-card--active {
          border-color: rgba(245,158,11,0.4);
        }
        .inv-card--low {
          border-color: rgba(239,68,68,0.25);
        }
        .inv-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-3);
        }
        .inv-card-name {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .inv-card-price {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 2px;
          white-space: nowrap;
        }
        .inv-qty-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: var(--radius-full);
          font-size: 0.85rem;
          font-weight: 600;
          background: var(--income-dim);
          color: var(--income);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .inv-qty-badge--low {
          background: var(--expense-dim);
          color: var(--expense);
        }

        /* Action row */
        .inv-action-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-2);
        }
        .inv-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 10px 6px;
          border-radius: var(--radius-md);
          border: none;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          transition: opacity var(--transition), transform var(--transition);
          min-height: 40px;
          white-space: nowrap;
          overflow: hidden;
        }
        .inv-action-btn:active { transform: scale(0.97); opacity: 0.85; }

        /* Feedback */
        .inv-feedback {
          font-size: 0.8125rem;
          color: var(--income);
          padding: var(--space-2) var(--space-3);
          background: var(--income-dim);
          border-radius: var(--radius-md);
        }

        /* Action panel */
        .action-panel {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          padding: var(--space-3);
          background: var(--bg-input);
          border-radius: var(--radius-lg);
        }
        .action-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .action-panel-label {
          font-size: 0.9rem;
          font-weight: 700;
        }
        .action-panel-close {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
        }
        .action-panel-close:hover { color: var(--text-primary); }
        .action-panel-fields {
          display: flex;
          gap: var(--space-3);
        }
        .action-panel-field {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .action-panel-field-label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .action-panel-field-row {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .action-input {
          flex: 1;
          min-width: 0;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 10px 12px;
          color: var(--text-primary);
          font-size: 1rem;
          font-weight: 600;
          text-align: center;
        }
        .action-input:focus {
          outline: none;
          border-color: var(--accent);
        }
        .action-unit {
          font-size: 0.8rem;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .action-confirm-btn {
          width: 100%;
          padding: 12px;
          border-radius: var(--radius-md);
          border: none;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 700;
          color: #0D1117;
          transition: opacity var(--transition);
        }
        .action-confirm-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Add product */
        .inv-add-section {
          margin-top: var(--space-2);
        }
        .inv-add-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          padding: 14px;
          border-radius: var(--radius-xl);
          border: 1.5px dashed var(--border-strong);
          background: none;
          color: var(--text-muted);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: color var(--transition), border-color var(--transition);
        }
        .inv-add-trigger:hover {
          color: var(--accent);
          border-color: rgba(245,158,11,0.4);
        }
        .inv-add-sheet {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .inv-add-sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .add-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .add-form-row {
          display: flex;
          gap: var(--space-3);
        }
        .add-form-row .input { flex: 1; }

        /* Empty state */
        .inv-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-12) var(--space-4);
          color: var(--text-muted);
          text-align: center;
        }
        .inv-empty-sub {
          font-size: 0.85rem;
          color: var(--text-disabled);
        }
        .inv-error {
          font-size: 0.8125rem;
          color: var(--expense);
        }
      `}</style>
    </div>
  );
}
