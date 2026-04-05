import { useState } from 'react';
import {
  Key, Tag, Plus, X, Download, Trash2,
  LogOut, ChevronRight, Eye, EyeOff, CheckCircle, Shield
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { saveApiKey, clearAllTransactions, saveUserPrefs, exportToCSV } from '../../services/storage';
import { validateApiKey } from '../../services/gemini';
import { useApp } from '../../context/AppContext';

export default function Settings() {
  const { state, dispatch } = useApp();
  const [newApiKey, setNewApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [newCategory, setNewCategory] = useState('');
  const [categories, setCategories] = useState<string[]>(state.prefs.customCategories);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_API_KEY', payload: null });
  };

  return (
    <div className="settings-view">
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

      {/* API Key */}
      <div className="settings-section">
        <div className="section-title">
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

      {/* Custom Categories */}
      <div className="settings-section">
        <div className="section-title">
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
      <div className="settings-section">
        <div className="section-title">
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

      {/* Sign out */}
      <button id="btn-sign-out" className="btn btn-danger w-full" style={{ borderRadius: 'var(--radius-md)' }} onClick={handleSignOut}>
        <LogOut size={16} />
        <span className="text-my">ထွက်မည်</span>
      </button>

      <p className="text-center text-muted" style={{ fontSize: '0.75rem', paddingBottom: 'var(--space-4)' }}>
        Myan Bookkeeping v1.0 · Gemini API Powered
      </p>

      <style>{`
        .settings-view {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          padding: var(--space-4);
          overflow-y: auto;
          flex: 1;
          min-height: 0;
        }
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
        .settings-section { display: flex; flex-direction: column; gap: var(--space-2); }
        .section-title {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          color: var(--text-muted);
          font-size: 0.8125rem;
          font-weight: 500;
          padding: 0 4px;
        }
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
      `}</style>
    </div>
  );
}
