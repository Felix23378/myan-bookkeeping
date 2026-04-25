
import { useApp } from './context/AppContext';
import { useOfflineSync } from './hooks/useOfflineSync';
import AuthScreen from './components/Auth/AuthScreen';
import ApiKeySetup from './components/Onboarding/ApiKeySetup';
import ChatView from './components/Chat/ChatView';
import Dashboard from './components/Dashboard/Dashboard';
import Inventory from './components/Inventory/Inventory';
import Settings from './components/Settings/Settings';
import BottomNav from './components/Navigation/BottomNav';
import { BookOpen, Wifi, WifiOff } from 'lucide-react';

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
    }}>
      <div style={{
        width: 64, height: 64,
        borderRadius: 20,
        background: 'linear-gradient(135deg, #F59E0B, #D97706)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#0D1117',
        boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
        animation: 'pulse 1.5s infinite',
      }}>
        <BookOpen size={28} strokeWidth={1.5} />
      </div>
      <p className="text-my" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        တင်နေသည်...
      </p>
    </div>
  );
}

function OfflineBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div style={{
      background: '#1C1A00',
      borderBottom: '1px solid rgba(245,158,11,0.3)',
      padding: '6px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: '0.8125rem',
      color: '#FCD34D',
    }}>
      <WifiOff size={13} />
      <span className="text-my">Offline မုဒ် — Message များ queue လုပ်ထားသည်</span>
    </div>
  );
}

function AppHeader() {
  const { state } = useApp();
  const tabTitles = {
    chat: 'မြန်မာ Bookkeeping',
    dashboard: 'စာရင်းရှင်းတမ်း',
    inventory: 'ကုန်ပစ္စည်းစာရင်း',
    settings: 'ဆက်တင်',
  };

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        <div style={{
          width: 32, height: 32,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #F59E0B, #D97706)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#0D1117', flexShrink: 0,
        }}>
          <BookOpen size={16} strokeWidth={1.5} />
        </div>
        <h1
          className="text-my"
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {tabTitles[state.activeTab]}
        </h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {state.isOnline
          ? <Wifi size={14} color="var(--income)" />
          : <WifiOff size={14} color="var(--expense)" />
        }
      </div>
    </header>
  );
}

function MainApp() {
  const { state } = useApp();
  useOfflineSync();

  return (
    <div className="app-shell">
      <OfflineBanner show={!state.isOnline} />
      <AppHeader />

      <main className="app-content" id="main-content">
        {state.activeTab === 'chat' && <ChatView />}
        {state.activeTab === 'dashboard' && <Dashboard />}
        {state.activeTab === 'inventory' && <Inventory />}
        {state.activeTab === 'settings' && <Settings />}
      </main>

      <BottomNav />
    </div>
  );
}

export default function App() {
  const { state } = useApp();

  if (state.authLoading) return <LoadingScreen />;
  if (!state.user) return <AuthScreen />;
  if (!state.apiKey) return <ApiKeySetup />;

  return <MainApp />;
}
