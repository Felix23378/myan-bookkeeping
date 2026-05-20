import { useState } from 'react';
import {
  Key, Tag, Plus, X, Download, Trash2,
  LogOut, ChevronRight, Eye, EyeOff, CheckCircle, Shield, Coins, Sun, Moon, Send, Wallet as WalletIcon, Star
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { saveApiKey, clearAllTransactions, saveUserPrefs, exportToCSV, CURRENCIES, saveWallet, deleteWallet } from '../../services/storage';
import type { CurrencyCode, Wallet } from '../../services/storage';
import { validateApiKey } from '../../services/gemini';
import { useApp } from '../../context/AppContext';

const CUSTOM_WALLET_COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#EF4444', '#84CC16'];

function generateWalletId() {
  return `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function Settings() {
  const { state, dispatch } = useApp();
  const [newApiKey, setNewApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [newCategory, setNewCategory] = useState('');
  const [categories, setCategories] = useState<string[]>(state.prefs.customCategories);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletColor, setNewWalletColor] = useState(CUSTOM_WALLET_COLORS[0]);
  const [newWalletOpening, setNewWalletOpening] = useState('');
  const [editingBalanceId, setEditingBalanceId] = useState<string | null>(null);
  const [balanceDraft, setBalanceDraft] = useState('');

  const handleUpdateApiKey = async () => {
    if (!newApiKey.trim()) return;
    setValidating(true);
    setKeyStatus('idle');
    const valid = await validateApiKey(newApiKey.trim());
    if (valid) {
      saveApiKey(newApiKey.trim());
      dispatch({ type: 'SET_API_KEY', payload: newApiKey.trim() });
      setKeyStatus('success');
      setNewApiKey('');
    } else {
      setKeyStatus('error');
    }
    setValidating(false);
  };

  const handleAddCategory = () => {
    const cat = newCategory.trim();
    if (!cat || categories.includes(cat)) return;
    const updated = [...categories, cat];
    setCategories(updated);
    saveUserPrefs({ customCategories: updated });
    dispatch({ type: 'SET_PREFS', payload: { customCategories: updated } });
    setNewCategory('');
  };

  const handleRemoveCategory = (cat: string) => {
    const updated = categories.filter(c => c !== cat);
    setCategories(updated);
    saveUserPrefs({ customCategories: updated });
    dispatch({ type: 'SET_PREFS', payload: { customCategories: updated } });
  };

  const handleClearData = () => {
    if (!state.user) return;
    if (!window.confirm('မှတ်တမ်း အားလုံး ဖျက်မှာ သေချာပါသလား? ပြန်မရနိုင်ပါ။')) return;
    clearAllTransactions(state.user.id);
    dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
  };

  const handleExport = () => {
    if (state.user) exportToCSV(state.user.id);
  };

  const handleSetDefaultWallet = (walletId: string) => {
    saveUserPrefs({ defaultWalletId: walletId });
    dispatch({ type: 'SET_PREFS', payload: { defaultWalletId: walletId } });
  };

  const handleAddWallet = () => {
    if (!state.user) return;
    const name = newWalletName.trim();
    if (!name) return;
    const wallet: Wallet = {
      id: generateWalletId(),
      userId: state.user.id,
      name,
      nameMy: name,
      color: newWalletColor,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      openingBalance: Number(newWalletOpening) || 0,
    };
    saveWallet(state.user.id, wallet);
    dispatch({ type: 'ADD_WALLET', payload: wallet });
    setNewWalletName('');
    setNewWalletOpening('');
  };

  const handleStartEditBalance = (wallet: Wallet) => {
    setEditingBalanceId(wallet.id);
    setBalanceDraft(String(wallet.openingBalance));
  };

  const handleSaveBalance = (wallet: Wallet) => {
    if (!state.user) return;
    const value = Number(balanceDraft);
    if (Number.isNaN(value) || value < 0) {
      window.alert('ဂဏန်း မှန်ကန်စွာ ထည့်ပါ');
      return;
    }
    const updated: Wallet = { ...wallet, openingBalance: value };
    saveWallet(state.user.id, updated);
    dispatch({ type: 'UPDATE_WALLET', payload: updated });
    setEditingBalanceId(null);
  };

  const handleDeleteWallet = (wallet: Wallet) => {
    if (!state.user || wallet.isBuiltIn) return;
    if (wallet.id === state.prefs.defaultWalletId) {
      window.alert('မူရင်း ပိုက်ဆံအိတ်ကို မဖျက်နိုင်ပါ။ အရင် တခြားအိတ်တစ်ခုကို မူရင်းအဖြစ် ရွေးပါ။');
      return;
    }
    if (!window.confirm(`"${wallet.nameMy}" ဖျက်မှာ သေချာပါသလား?`)) return;
    deleteWallet(state.user.id, wallet.id);
    dispatch({ type: 'DELETE_WALLET', payload: wallet.id });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_API_KEY', payload: null });
  };

  return (
    <div className="view-layout">
      <div className="view-content">
        {/* User info */}
        <div className="settings-user card">
          <div className="user-avatar">
            <span>{state.user?.email?.[0]?.toUpperCase() ?? 'U'}</span>
          </div>
          <div>
            <p className="font-semibold" style={{ fontSize: '0.9375rem' }}>{state.user?.email?.split('@')[0] || 'User'}</p>
            <p className="text-muted" style={{ fontSize: '0.8125rem' }}>{state.user?.email}</p>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="view-section">
          <div className="view-section-title">
            {state.prefs.theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
            <span className="text-my">အပြင်အဆင်</span>
          </div>
          <div className="card">
            <div className="theme-toggle-row">
              <button
                id="btn-theme-dark"
                className={`theme-toggle-btn ${state.prefs.theme === 'dark' ? 'active' : ''}`}
                onClick={() => {
                  saveUserPrefs({ theme: 'dark' });
                  dispatch({ type: 'SET_PREFS', payload: { theme: 'dark' } });
                }}
              >
                <Moon size={16} />
                <span className="text-my">Dark</span>
              </button>
              <button
                id="btn-theme-light"
                className={`theme-toggle-btn ${state.prefs.theme === 'light' ? 'active' : ''}`}
                onClick={() => {
                  saveUserPrefs({ theme: 'light' });
                  dispatch({ type: 'SET_PREFS', payload: { theme: 'light' } });
                }}
              >
                <Sun size={16} />
                <span className="text-my">Light</span>
              </button>
            </div>
          </div>
        </div>

        {/* API Key */}
        <div className="view-section">
          <div className="view-section-title">
            <Key size={15} />
            <span className="text-my">Gemini API Key</span>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="alert alert-info" style={{ fontSize: '0.8125rem' }}>
              <Shield size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span className="text-my">Key ကို သင့် device ထဲမှာပဲ သိမ်းသည်</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="settings-api-key-input"
                type={showKey ? 'text' : 'password'}
                className="input"
                placeholder="API Key အသစ် ထည့်ပါ..."
                value={newApiKey}
                onChange={e => { setNewApiKey(e.target.value); setKeyStatus('idle'); }}
                style={{ fontFamily: 'monospace', fontSize: '1rem', paddingRight: '42px' }}
              />
              <button onClick={() => setShowKey(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {keyStatus === 'success' && <div className="alert alert-success text-my" style={{ fontSize: '0.8125rem' }}><CheckCircle size={14} />API Key ပြောင်းလဲပြီး</div>}
            {keyStatus === 'error' && <div className="alert alert-error text-my" style={{ fontSize: '0.8125rem' }}>❌ API Key မှားနေပါတယ်</div>}
            <button
              id="btn-update-api-key"
              className="btn btn-primary"
              style={{ borderRadius: 'var(--radius-md)' }}
              onClick={handleUpdateApiKey}
              disabled={!newApiKey.trim() || validating}
            >
              {validating ? <div className="spinner" /> : <><CheckCircle size={15} />အတည်ပြုမည်</>}
            </button>
          </div>
        </div>

        {/* Currency */}
        <div className="view-section">
          <div className="view-section-title">
            <Coins size={15} />
            <span className="text-my">ငွေကြေးအမျိုးအစား</span>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="currency-select-wrapper">
              <select
                id="settings-currency-select"
                className="currency-select text-my"
                value={state.prefs.currency}
                onChange={e => {
                  const code = e.target.value as CurrencyCode;
                  saveUserPrefs({ currency: code });
                  dispatch({ type: 'SET_PREFS', payload: { currency: code } });
                }}
              >
                {Object.values(CURRENCIES).map(c => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.nameMy} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-muted text-my" style={{ fontSize: '0.8125rem' }}>
              ရွေးချယ်ထားသော ငွေကြေးဖြင့် မှတ်တမ်းတင်ပါမည်
            </p>
          </div>
        </div>

        {/* Wallets */}
        <div className="view-section">
          <div className="view-section-title">
            <WalletIcon size={15} />
            <span className="text-my">ပိုက်ဆံအိတ်များ</span>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p className="text-my text-muted" style={{ fontSize: '0.8125rem' }}>
              မူရင်းအိတ်ကို ⭐ နှိပ်ပြီး ပြောင်းနိုင်ပါသည်
            </p>
            <div className="wallet-list">
              {state.wallets.map(w => {
                const isDefault = w.id === state.prefs.defaultWalletId;
                const isEditing = editingBalanceId === w.id;
                return (
                  <div key={w.id} className="wallet-row">
                    <div className="wallet-dot" style={{ background: w.color }} />
                    <div className="wallet-row-info">
                      <div className="wallet-row-name">
                        <span className="text-my" style={{ fontWeight: 500 }}>{w.nameMy}</span>
                        {w.isBuiltIn && <span className="wallet-builtin-tag">built-in</span>}
                      </div>
                      {isEditing ? (
                        <div className="wallet-balance-edit">
                          <input
                            type="number"
                            className="input"
                            value={balanceDraft}
                            onChange={e => setBalanceDraft(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveBalance(w)}
                            placeholder="0"
                            autoFocus
                            style={{ padding: '4px 8px', fontSize: '0.875rem', width: '100%' }}
                          />
                          <button className="wallet-balance-save" onClick={() => handleSaveBalance(w)} aria-label="Save">
                            <CheckCircle size={14} />
                          </button>
                          <button className="wallet-balance-cancel" onClick={() => setEditingBalanceId(null)} aria-label="Cancel">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button className="wallet-balance-display" onClick={() => handleStartEditBalance(w)}>
                          <span className="text-my text-muted" style={{ fontSize: '0.75rem' }}>လက်ကျန် (opening):</span>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                            {w.openingBalance.toLocaleString()}
                          </span>
                        </button>
                      )}
                    </div>
                    {!isEditing && (
                      <>
                        <button
                          className={`wallet-star ${isDefault ? 'active' : ''}`}
                          onClick={() => handleSetDefaultWallet(w.id)}
                          aria-label="Set as default"
                          title={isDefault ? 'မူရင်း' : 'မူရင်းအဖြစ်သတ်မှတ်ရန်'}
                        >
                          <Star size={15} fill={isDefault ? 'var(--accent)' : 'none'} />
                        </button>
                        {!w.isBuiltIn && (
                          <button
                            className="wallet-delete"
                            onClick={() => handleDeleteWallet(w)}
                            aria-label="Delete wallet"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="add-wallet-row">
              <input
                type="text"
                className="input"
                placeholder="ဥပမာ: KBZ Bank..."
                value={newWalletName}
                onChange={e => setNewWalletName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddWallet()}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                className="input"
                placeholder="လက်ကျန် 0"
                value={newWalletOpening}
                onChange={e => setNewWalletOpening(e.target.value)}
                style={{ width: 110 }}
              />
              <button className="btn btn-secondary" onClick={handleAddWallet} style={{ flexShrink: 0 }}>
                <Plus size={16} />
              </button>
            </div>
            <div className="wallet-color-row">
              {CUSTOM_WALLET_COLORS.map(c => (
                <button
                  key={c}
                  className={`wallet-color-swatch ${newWalletColor === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setNewWalletColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Custom Categories */}
        <div className="view-section">
          <div className="view-section-title">
            <Tag size={15} />
            <span className="text-my">ကိုယ်ပိုင် အမျိုးအစားများ</span>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="category-chips">
              {categories.map(cat => (
                <div key={cat} className="category-chip">
                  <span className="text-my">{cat}</span>
                  <button onClick={() => handleRemoveCategory(cat)} className="chip-remove" aria-label="Remove">
                    <X size={12} />
                  </button>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-muted text-my" style={{ fontSize: '0.8125rem' }}>မရှိသေး — အောက်မှ ထည့်ပါ</p>
              )}
            </div>
            <div className="add-category-row">
              <input
                id="input-new-category"
                type="text"
                className="input"
                placeholder="အမျိုးအစား အသစ်..."
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                style={{ flex: 1, font: 'inherit' }}
              />
              <button id="btn-add-category" className="btn btn-secondary" onClick={handleAddCategory} style={{ flexShrink: 0 }}>
                <Plus size={16} /> ထည့်မည်
              </button>
            </div>
          </div>
        </div>

        {/* Data */}
        <div className="view-section">
          <div className="view-section-title">
            <Download size={15} />
            <span className="text-my">ဒေတာ သိမ်းဆည်းခြင်း</span>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <button id="btn-export-csv" className="settings-action-btn" onClick={handleExport}>
              <Download size={15} />
              <span className="text-my">CSV ဖိုင် download</span>
              <ChevronRight size={15} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
            </button>
            <div className="divider" style={{ margin: '4px 0' }} />
            <button id="btn-clear-data" className="settings-action-btn danger" onClick={handleClearData}>
              <Trash2 size={15} />
              <span className="text-my">မှတ်တမ်း အားလုံး ဖျက်မည်</span>
              <ChevronRight size={15} style={{ marginLeft: 'auto' }} />
            </button>
          </div>
        </div>

        {/* Community */}
        <div className="view-section">
          <div className="view-section-title">
            <Send size={15} />
            <span className="text-my">Community</span>
          </div>
          <a
            href="https://t.me/myancontentai"
            target="_blank"
            rel="noopener noreferrer"
            className="card telegram-card"
          >
            <div className="telegram-icon">
              <Send size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <p className="text-my" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Telegram Channel သို့ ပူးပေါင်းပါ
              </p>
              <p className="text-my" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
                @myancontentai · update အသစ်နဲ့ tip များ
              </p>
            </div>
            <ChevronRight size={16} color="var(--text-muted)" />
          </a>
        </div>

        {/* Sign out */}
        <button id="btn-sign-out" className="btn btn-danger w-full" style={{ borderRadius: 'var(--radius-md)' }} onClick={handleSignOut}>
          <LogOut size={16} />
          <span className="text-my">ထွက်မည်</span>
        </button>

        <p className="text-center text-muted" style={{ fontSize: '0.75rem', paddingBottom: 'var(--space-4)' }}>
          Myan Bookkeeping v1.0 · Gemini API Powered
        </p>

        <style>{`
          .settings-user {
            display: flex;
            align-items: center;
            gap: var(--space-3);
          }
          .user-avatar {
            width: 48px; height: 48px;
            border-radius: 50%;
            background: var(--accent-dim);
            border: 2px solid rgba(245,158,11,0.3);
            display: flex; align-items: center; justify-content: center;
            color: var(--accent);
            font-weight: 700;
            font-size: 1.1rem;
            overflow: hidden;
            flex-shrink: 0;
          }
          .avatar-img { width: 100%; height: 100%; object-fit: cover; }
          .settings-action-btn {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            width: 100%;
            padding: var(--space-3);
            background: none;
            border: none;
            cursor: pointer;
            color: var(--text-secondary);
            font-size: 0.9rem;
            font-family: var(--font-burmese);
            border-radius: var(--radius-sm);
            transition: all var(--transition);
            text-align: left;
          }
          .settings-action-btn:hover { background: var(--bg-hover); }
          .settings-action-btn.danger { color: var(--expense); }
          .settings-action-btn.danger:hover { background: var(--expense-dim); }
          .category-chips { display: flex; flex-wrap: wrap; gap: 6px; }
          .category-chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-full);
            padding: 4px 10px 4px 12px;
            font-size: 0.8125rem;
            color: var(--text-secondary);
          }
          .chip-remove {
            background: none; border: none; cursor: pointer;
            color: var(--text-muted);
            display: flex; align-items: center;
            padding: 2px;
            border-radius: 50%;
          }
          .chip-remove:hover { color: var(--expense); background: var(--expense-dim); }
          .add-category-row { display: flex; gap: var(--space-2); }
          .currency-select-wrapper { position: relative; }
          .currency-select {
            width: 100%;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            padding: var(--space-3) var(--space-4);
            color: var(--text-primary);
            font-size: 1rem;
            line-height: 1.5;
            cursor: pointer;
            appearance: none;
            -webkit-appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%238B949E' viewBox='0 0 16 16'%3E%3Cpath d='M4.5 6l3.5 3.5L11.5 6'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            padding-right: 36px;
            transition: border-color var(--transition), box-shadow var(--transition);
          }
          .currency-select:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px var(--accent-dim);
            outline: none;
          }
          .currency-select option {
            background: var(--bg-secondary);
            color: var(--text-primary);
            padding: 8px;
          }
          .theme-toggle-row {
            display: flex;
            gap: 6px;
            background: var(--bg-input);
            padding: 4px;
            border-radius: var(--radius-md);
          }
          .theme-toggle-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-2);
            padding: 10px 12px;
            border-radius: var(--radius-sm);
            font-size: 0.875rem;
            font-weight: 500;
            background: transparent;
            color: var(--text-muted);
            border: none;
            cursor: pointer;
            transition: all var(--transition);
          }
          .theme-toggle-btn.active {
            background: var(--bg-card);
            color: var(--text-primary);
            box-shadow: var(--shadow-sm);
          }
          .theme-toggle-btn:hover:not(.active) {
            color: var(--text-secondary);
          }
          .telegram-card {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            text-decoration: none;
            transition: border-color var(--transition), background var(--transition);
            cursor: pointer;
          }
          .telegram-card:hover {
            border-color: rgba(34, 158, 217, 0.4);
            background: rgba(34, 158, 217, 0.06);
          }
          .telegram-icon {
            width: 40px;
            height: 40px;
            border-radius: var(--radius-md);
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(34, 158, 217, 0.15);
            color: #229ED9;
            flex-shrink: 0;
          }
          .wallet-list { display: flex; flex-direction: column; gap: 4px; }
          .wallet-row {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 10px;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
          }
          .wallet-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .wallet-row-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
            font-size: 0.875rem;
          }
          .wallet-row-name {
            display: flex;
            align-items: center;
            gap: 6px;
            min-width: 0;
          }
          .wallet-balance-display {
            display: flex;
            align-items: center;
            gap: 6px;
            background: none;
            border: none;
            padding: 0;
            cursor: pointer;
            text-align: left;
            color: var(--text-secondary);
          }
          .wallet-balance-display:hover { color: var(--accent); }
          .wallet-balance-edit {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-top: 2px;
          }
          .wallet-balance-save, .wallet-balance-cancel {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            color: var(--text-muted);
          }
          .wallet-balance-save:hover { color: var(--income); background: var(--income-dim); }
          .wallet-balance-cancel:hover { color: var(--expense); background: var(--expense-dim); }
          .wallet-builtin-tag {
            font-size: 0.625rem;
            color: var(--text-muted);
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            padding: 1px 6px;
            border-radius: var(--radius-full);
          }
          .wallet-star, .wallet-delete {
            background: none;
            border: none;
            cursor: pointer;
            color: var(--text-muted);
            padding: 4px;
            border-radius: 50%;
            display: flex;
            align-items: center;
          }
          .wallet-star.active { color: var(--accent); }
          .wallet-star:hover { color: var(--accent); }
          .wallet-delete:hover { color: var(--expense); background: var(--expense-dim); }
          .add-wallet-row { display: flex; gap: var(--space-2); }
          .wallet-color-row { display: flex; gap: 6px; flex-wrap: wrap; }
          .wallet-color-swatch {
            width: 26px;
            height: 26px;
            border-radius: 50%;
            border: 2px solid transparent;
            cursor: pointer;
            padding: 0;
          }
          .wallet-color-swatch.selected {
            border-color: var(--text-primary);
            transform: scale(1.05);
          }
        `}</style>
      </div>
    </div>
  );
}
