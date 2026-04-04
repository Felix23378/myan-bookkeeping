import { useState } from 'react';
import { Key, ExternalLink, CheckCircle, Eye, EyeOff, ChevronRight, ChevronLeft } from 'lucide-react';
import { saveApiKey, saveUserPrefs } from '../../services/storage';
import { validateApiKey } from '../../services/gemini';
import { useApp } from '../../context/AppContext';

const STEPS = [
  {
    title: 'Gemini API Key ဆိုတာ ဘာလဲ?',
    titleEn: 'What is an API Key?',
    content: (
      <div className="step-content text-my">
        <p>API Key ဆိုတာ <strong>Google AI</strong> ကို သုံးဖို့ လိုအပ်တဲ့ <strong>secret password</strong> တစ်ခုပါ။</p>
        <br />
        <p>ဒီ app က သင့် API Key ကို သုံးပြီး သင်ရောင်းတာ/ဝယ်တာကို AI ကတဆင့် မှတ်ပေးမှာပါ။</p>
        <br />
        <div className="info-box">
          <span className="info-icon">✅</span>
          <span>Google AI Studio မှာ <strong>အခမဲ့</strong> ရနိုင်ပါတယ်</span>
        </div>
        <div className="info-box">
          <span className="info-icon">🔒</span>
          <span>Key ကို သင့် phone/computer ထဲမှာပဲ သိမ်းမယ် — ဘယ်နေရာမှ မပို့ဘူး</span>
        </div>
      </div>
    ),
  },
  {
    title: 'API Key ရဖို့ အဆင့်များ',
    titleEn: 'How to get your free API Key',
    content: (
      <div className="step-content text-my">
        <ol className="steps-list">
          <li>
            <span className="step-num">1</span>
            <span>အောက်ကပုံတွင် ဖော်ပြထားသော link ကို နှိပ်၍ <strong>Google AI Studio</strong> website သို့ သွားပါ</span>
          </li>
          <li>
            <span className="step-num">2</span>
            <span>Google account ဖြင့် <strong>Sign in</strong> လုပ်ပါ</span>
          </li>
          <li>
            <span className="step-num">3</span>
            <span><strong>"Create API Key"</strong> ခလုတ်ကို နှိပ်ပါ</span>
          </li>
          <li>
            <span className="step-num">4</span>
            <span>Project ရွေးပြီး <strong>Key ကို copy</strong> လုပ်ပါ</span>
          </li>
        </ol>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary w-full"
          id="btn-open-aistudio"
          style={{ marginTop: 'var(--space-4)', textDecoration: 'none', borderRadius: 'var(--radius-md)' }}
        >
          <ExternalLink size={16} />
          Google AI Studio ကို ဖွင့်မည်
        </a>
      </div>
    ),
  },
  {
    title: 'API Key ထည့်ပါ',
    titleEn: 'Enter your API Key',
    content: null, // rendered separately
  },
];

export default function ApiKeySetup() {
  const { dispatch } = useApp();
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');

  const handleValidate = async () => {
    // Strip ALL whitespace — spaces/newlines are common when copy-pasting on mobile
    const cleanKey = apiKey.replace(/\s/g, '');
    if (!cleanKey) { setError('API Key ထည့်ပါ'); return; }
    if (!cleanKey.startsWith('AIza')) {
      setError('API Key မှားနေပါ — "AIza" ဖြင့် စသင့်သည် (အလျားစစ်: ' + cleanKey.length + ' chars)');
      return;
    }
    setValidating(true);
    setError('');
    const valid = await validateApiKey(cleanKey);
    if (valid) {
      saveApiKey(cleanKey);
      saveUserPrefs({ onboardingComplete: true });
      dispatch({ type: 'SET_API_KEY', payload: cleanKey });
      dispatch({ type: 'SET_PREFS', payload: { onboardingComplete: true } });
    } else {
      setError('API Key မှားနေပါတယ်။ Google AI Studio မှ ပြန်ကူးယူပြီး ထည့်ပါ။ (Key: AIza... ဖြင့် စသည်)');
    }
    setValidating(false);
  };

  const totalSteps = STEPS.length;

  return (
    <div className="onboarding-screen">
      <div className="onboarding-glow" />

      <div className="onboarding-container animate-slide-up">
        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-logo">
            <Key size={24} />
          </div>
          <div>
            <h2 className="text-my" style={{ fontSize: '1.1rem' }}>{STEPS[step].title}</h2>
            <p className="text-muted" style={{ fontSize: '0.78rem' }}>{STEPS[step].titleEn}</p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="progress-dots">
          {STEPS.map((_, i) => (
            <div key={i} className={`progress-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
          ))}
        </div>

        {/* Content */}
        <div className="onboarding-body">
          {step < 2 ? (
            STEPS[step].content
          ) : (
            <div className="step-content text-my">
              <p style={{ marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>
                Copy လုပ်ထားတဲ့ API Key ကို အောက်မှာ paste လုပ်ပါ
              </p>
              <div className="form-group" style={{ gap: 'var(--space-2)' }}>
                <div className="input-icon-wrap">
                  <Key size={16} className="input-icon" />
                  <input
                    id="input-api-key"
                    type={showKey ? 'text' : 'password'}
                    className="input input-with-icon input-with-end-icon"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={e => { setApiKey(e.target.value); setError(''); }}
                    style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                    autoComplete="off"
                    autoCorrect="off"
                  />
                  <button type="button" className="input-end-icon" onClick={() => setShowKey(v => !v)} style={{ right: 12, position: 'absolute', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {error && <div className="alert alert-error text-my" style={{ fontSize: '0.85rem' }}>{error}</div>}
              </div>
              <div className="info-box" style={{ marginTop: 'var(--space-3)' }}>
                <span className="info-icon">🔒</span>
                <span style={{ fontSize: '0.8rem' }}>Key သည် သင့် device ပေါ်မှာသာ သိမ်းသည်</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="onboarding-footer">
          {step > 0 && (
            <button
              id="btn-onboard-back"
              className="btn btn-secondary"
              onClick={() => setStep(s => s - 1)}
              style={{ flex: 1 }}
            >
              <ChevronLeft size={16} />
              နောက်သို့
            </button>
          )}
          {step < totalSteps - 1 ? (
            <button
              id="btn-onboard-next"
              className="btn btn-primary"
              onClick={() => setStep(s => s + 1)}
              style={{ flex: 1 }}
            >
              ရှေ့သို့
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              id="btn-validate-api-key"
              className="btn btn-primary"
              onClick={handleValidate}
              disabled={validating || !apiKey.trim()}
              style={{ flex: 1 }}
            >
              {validating ? <div className="spinner" /> : (
                <><CheckCircle size={16} /> အတည်ပြုမည်</>
              )}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .onboarding-screen {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
          position: relative;
          overflow: hidden;
        }
        .onboarding-glow {
          position: absolute;
          bottom: -10%;
          right: -20%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .onboarding-container {
          width: 100%;
          max-width: 420px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-2xl);
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
          box-shadow: var(--shadow-lg);
        }
        .onboarding-header {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }
        .onboarding-logo {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          background: var(--accent-dim);
          border: 1px solid rgba(245,158,11,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          flex-shrink: 0;
        }
        .progress-dots {
          display: flex;
          gap: var(--space-2);
          justify-content: center;
        }
        .progress-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--bg-active);
          transition: all var(--transition);
        }
        .progress-dot.active {
          background: var(--accent);
          width: 24px;
          border-radius: 4px;
        }
        .progress-dot.done { background: rgba(245,158,11,0.4); }
        .onboarding-body { flex: 1; }
        .step-content { display: flex; flex-direction: column; }
        .info-box {
          display: flex;
          align-items: flex-start;
          gap: var(--space-2);
          padding: var(--space-3);
          background: var(--bg-card);
          border-radius: var(--radius-md);
          margin-top: var(--space-2);
          border: 1px solid var(--border);
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }
        .info-icon { font-size: 1rem; flex-shrink: 0; margin-top: 2px; }
        .steps-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .steps-list li {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }
        .step-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--accent-dim);
          border: 1px solid rgba(245,158,11,0.3);
          color: var(--accent);
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .onboarding-footer {
          display: flex;
          gap: var(--space-3);
        }
        .form-group { display: flex; flex-direction: column; position: relative; }
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
      `}</style>
    </div>
  );
}
