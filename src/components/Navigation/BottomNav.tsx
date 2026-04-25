
import { MessageCircle, BarChart2, Settings, Package2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const TABS = [
  { id: 'chat' as const, icon: MessageCircle, labelMy: 'Chat' },
  { id: 'dashboard' as const, icon: BarChart2, labelMy: 'စာရင်း' },
  { id: 'inventory' as const, icon: Package2, labelMy: 'ကုန်' },
  { id: 'settings' as const, icon: Settings, labelMy: 'ဆက်တင်' },
];

export default function BottomNav() {
  const { state, dispatch } = useApp();

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {TABS.map(({ id, icon: Icon, labelMy }) => {
        const isActive = state.activeTab === id;
        return (
          <button
            key={id}
            id={`nav-${id}`}
            className={`nav-tab ${isActive ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_TAB', payload: id })}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="nav-icon-wrap">
              <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
              {isActive && <span className="nav-active-dot" />}
            </div>
            <span className="nav-label text-my">{labelMy}</span>
          </button>
        );
      })}

      <style>{`
        .bottom-nav {
          display: flex;
          align-items: stretch;
          /* height and padding maintained in index.css */
        }
        .nav-tab {
          flex: 1;
          min-height: var(--nav-height);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-disabled);
          transition: all var(--transition);
          -webkit-tap-highlight-color: transparent;
          position: relative;
          padding: 0 4px;
        }
        .nav-tab.active { color: var(--accent); }
        .nav-tab:not(.active):hover { color: var(--text-muted); }
        .nav-icon-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .nav-active-dot {
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--accent);
        }
        .nav-label {
          font-size: 0.6875rem;
          font-weight: 500;
          line-height: 1;
          display: block;
        }
      `}</style>
    </nav>
  );
}
