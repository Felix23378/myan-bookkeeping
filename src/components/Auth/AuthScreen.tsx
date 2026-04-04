import { useState } from 'react';
import { supabase } from '../../services/supabase';
import { BookOpen, Mail, Lock, Eye, EyeOff, ChevronRight } from 'lucide-react';

type Mode = 'login' | 'signup';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(mapError(err.message));
    } else {
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) {
        setError(mapError(err.message));
      } else {
        setSuccessMsg('အကောင့်ဖွင့်ပြီးပါပြီ! Email ကို confirm လုပ်ပြီး ဝင်ပါ။');
      }
    }
    setLoading(false);
  };

  const mapError = (msg: string): string => {
    if (msg.includes('Invalid login credentials')) return 'Email သို့မဟုတ် Password မှားသည်';
    if (msg.includes('Email not confirmed')) return 'Email ကို ဦးစွာ verify လုပ်ပါ';
    if (msg.includes('User already registered')) return 'ဤ Email ကို အသုံးပြုနေပြီဖြစ်သည်';
    if (msg.includes('Password should be')) return 'Password အနည်းဆုံး ၆ လုံး ရှိရမည်';
    if (msg.includes('Unable to validate')) return 'Supabase URL မကောင်းပါ — .env စစ်ဆေးပါ';
    return msg;
  };

  return (
    <div className="auth-screen">
      <div className="auth-glow" />

      <div className="auth-container animate-slide-up">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <BookOpen size={28} strokeWidth={1.5} />
          </div>
          <h1 className="text-my">မြန်မာ Bookkeeping</h1>
          <p className="text-muted text-center text-my" style={{ fontSize: '0.9rem' }}>
            {mode === 'login' ? 'အကောင့်ဝင်ပါ' : 'အကောင့်အသစ် ဖွင့်ပါ'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="label" htmlFor="auth-email">Email</label>
            <div className="input-icon-wrap">
              <Mail size={16} className="input-icon" />
              <input
                id="auth-email"
                type="email"
                className="input input-with-icon"
                placeholder="example@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label text-my" htmlFor="auth-password">Password</label>
            <div className="input-icon-wrap">
              <Lock size={16} className="input-icon" />
              <input
                id="auth-password"
                type={showPass ? 'text' : 'password'}
                className="input input-with-icon input-with-end-icon"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className="input-end-icon"
                onClick={() => setShowPass(v => !v)}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-error text-my" role="alert">
              ❌ {error}
            </div>
          )}
          {successMsg && (
            <div className="alert alert-success text-my" role="status">
              ✅ {successMsg}
            </div>
          )}

          <button
            id="btn-email-submit"
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            {loading
              ? <div className="spinner" />
              : (
                <>
                  {mode === 'login' ? 'ဝင်မည်' : 'အကောင့်ဖွင့်မည်'}
                  <ChevronRight size={18} />
                </>
              )
            }
          </button>
        </form>

        <button
          id="btn-toggle-mode"
          className="auth-toggle text-my"
          onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); setSuccessMsg(''); }}
        >
          {mode === 'login'
            ? <><span className="text-muted">အကောင့် မရှိသေးဘူးလား? </span><span className="text-accent">စာရင်းသွင်းမည်</span></>
            : <><span className="text-muted">အကောင့် ရှိပြီးသားလား? </span><span className="text-accent">ဝင်မည်</span></>
          }
        </button>
      </div>

      <style>{`
        .auth-screen {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
          position: relative;
          overflow: hidden;
        }
        .auth-glow {
          position: absolute;
          top: -20%;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .auth-container {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          position: relative;
          z-index: 1;
        }
        .auth-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: var(--space-2);
        }
        .auth-logo-icon {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-xl);
          background: linear-gradient(135deg, var(--accent), #D97706);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0D1117;
          box-shadow: var(--shadow-accent);
        }
        .auth-logo h1 {
          font-size: 1.5rem;
          background: linear-gradient(135deg, var(--text-primary), var(--accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .auth-form { display: flex; flex-direction: column; gap: var(--space-4); }
        .form-group { display: flex; flex-direction: column; gap: var(--space-2); }
        .input-icon-wrap { position: relative; }
        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .input-with-icon { padding-left: 42px; }
        .input-with-end-icon { padding-right: 42px; }
        .input-end-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
        }
        .auth-toggle {
          background: none;
          border: none;
          cursor: pointer;
          text-align: center;
          font-size: 0.875rem;
          padding: var(--space-2);
        }
        .text-accent { color: var(--accent); font-weight: 500; }
      `}</style>
    </div>
  );
}
