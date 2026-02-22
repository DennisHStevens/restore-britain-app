import { useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';

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
 * │      Bottom Nav Bar      │  Fixed bottom — Map | Quests | Boards
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
  const { isAtLeast } = useAuth();

  // Determine which tab is active based on the current path
  const activeTab = location.pathname.startsWith('/boards')
    ? 'boards'
    : location.pathname === '/profile'
      ? 'profile'
      : location.pathname === '/quests'
        ? 'quests'
        : 'map';

  function handleTabClick(tab: 'map' | 'quests' | 'boards' | 'profile') {
    if (tab === 'map') navigate('/');
    if (tab === 'quests') navigate('/quests');
    if (tab === 'boards') navigate('/boards');
    if (tab === 'profile') navigate('/profile');
  }

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="app-header-content">
          <img src="/icons/rb-logo-40.png" alt="RB" className="app-header-logo" />
          <div className="app-header-title-group">
            <span className="app-header-title">Restore Britain</span>
            <span className="app-header-version">Pre-Alpha v0.1</span>
          </div>
          {/* Admin icon — visible to admin+ roles only */}
          {isAtLeast('admin') && (
            <button
              onClick={() => navigate('/admin')}
              className={`app-header-profile${location.pathname === '/admin' ? ' active' : ''}`}
              aria-label="Admin Panel"
              title="Admin Panel"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </button>
          )}
          {/* Profile icon in top-right corner of header */}
          <button
            onClick={() => navigate('/profile')}
            className={`app-header-profile${activeTab === 'profile' ? ' active' : ''}`}
            aria-label="Profile"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>
      </header>

      {/* Scrollable content area */}
      <main className="app-content">
        {children}
      </main>

      {/* Bottom navigation — 3 tabs: Map | Quests | Boards */}
      <nav className="app-nav">
        <button
          onClick={() => handleTabClick('map')}
          className={`app-nav-button${activeTab === 'map' ? ' active' : ''}`}
        >
          {/* Map icon — folded map */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
          <span>Map</span>
        </button>

        <button
          onClick={() => handleTabClick('quests')}
          className={`app-nav-button${activeTab === 'quests' ? ' active' : ''}`}
        >
          {/* Quests icon — target/crosshair */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          <span>Quests</span>
        </button>

        <button
          onClick={() => handleTabClick('boards')}
          className={`app-nav-button${activeTab === 'boards' ? ' active' : ''}`}
        >
          {/* Boards icon — message square (speech bubble) */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Boards</span>
        </button>
      </nav>
    </div>
  );
}
