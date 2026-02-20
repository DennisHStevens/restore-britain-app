import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { MapView } from './pages/MapView';
import { Profile } from './pages/Profile';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';

/**
 * Root app component — defines all routes.
 *
 * Route structure:
 * - /login       → public, login form
 * - /register    → public, registration form (requires invite code)
 * - /            → protected, map view (inside AppShell)
 * - /profile     → protected, user profile (inside AppShell)
 * - *            → redirect to /
 *
 * The AppShell (header + bottom nav) wraps all authenticated routes,
 * providing the persistent frame and tab navigation.
 */
export function App() {
  return (
    <Routes>
      {/* Public routes — no shell, standalone pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes — wrapped in AppShell for header + bottom nav */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell>
              <MapView />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppShell>
              <Profile />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Catch-all: redirect unknown routes to map */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
