import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProvider } from './context/AppContext.tsx'

// iOS Safari PWA mis-reports 100dvh on first paint, causing a bottom gap.
// window.innerHeight is correct immediately and is NOT affected by the keyboard
// (unlike visualViewport.height which shrinks when the keyboard opens).
// Only re-sync on orientation change, never on keyboard events.
function syncViewportHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
}
syncViewportHeight();
window.addEventListener('orientationchange', () => setTimeout(syncViewportHeight, 100));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)
