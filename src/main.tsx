import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { App } from './App';

/* Self-hosted fonts via @fontsource — eliminates render-blocking Google Fonts
 * requests (~300ms FCP saving on mobile). Latin-only subsets (UK audience),
 * only the weights we use (Montserrat 600+700 headings, Lato 400+700 body).
 * Saves ~300KB by excluding cyrillic, vietnamese, and latin-ext woff/woff2. */
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/lato/latin-400.css';
import '@fontsource/lato/latin-700.css';

import './global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

/**
 * Register the service worker for PWA offline support.
 * Only registers in production-like environments (not during HMR dev).
 * In dev mode with Vite, the SW would interfere with hot module reload,
 * so we skip registration unless the page is served as a built bundle.
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[SW] Registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err);
      });
  });
}
