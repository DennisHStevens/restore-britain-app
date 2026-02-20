import { useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * AppShell — the persistent frame for all authenticated pages.
 *
 * Structure:
 * ┌─────────────────────────┐
 * │        Header            │  Fixed top — logo + app name
 * ├─────────────────────────┤
 * │                          │
 * │     Scrollable Content   │  Children rendered here
 * │                          │
 * ├─────────────────────────┤
 * │      Bottom Nav Bar      │  Fixed bottom — Map | Profile tabs
 * └─────────────────────────┘
 *
 * All layout and safe-area styles live in global.css (class-based),
 * because iOS Safari doesn't reliably support env() in inline styles.
 */

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname === '/profile' ? 'profile' : 'map';

  function handleTabClick(tab: 'map' | 'profile') {
    if (tab === 'map') navigate('/');
    if (tab === 'profile') navigate('/profile');
  }

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="app-header-content">
          <div className="app-header-logo">RB</div>
          <span className="app-header-title">Restore Britain</span>
        </div>
      </header>

      {/* Scrollable content area */}
      <main className="app-content">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="app-nav">
        <button
          onClick={() => handleTabClick('map')}
          className={`app-nav-button${activeTab === 'map' ? ' active' : ''}`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
          <span>Map</span>
        </button>

        <button
          onClick={() => handleTabClick('profile')}
          className={`app-nav-button${activeTab === 'profile' ? ' active' : ''}`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
