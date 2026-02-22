import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Onboarding } from './pages/Onboarding';
import { MapView } from './pages/MapView';
import { Profile } from './pages/Profile';
import { BoardList } from './pages/BoardList';
import { BoardView } from './pages/BoardView';
import { NewPost } from './pages/NewPost';
import { PostDetail } from './pages/PostDetail';
import { AdminPanel } from './pages/AdminPanel';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';

/**
 * Root app component — defines all routes.
 *
 * Route structure:
 * - /login              → public, login form
 * - /register           → public, registration form (requires invite code)
 * - /onboarding         → protected, no AppShell
 * - /                   → protected, map view (inside AppShell)
 * - /boards             → protected, board list (inside AppShell)
 * - /boards/:slug       → protected, board view with posts (inside AppShell)
 * - /boards/:slug/new   → protected, new post composer (inside AppShell)
 * - /boards/:slug/:id   → protected, post detail + comments (inside AppShell)
 * - /profile            → protected, user profile (inside AppShell)
 * - /admin              → protected, admin panel (inside AppShell, admin+ only)
 * - *                   → redirect to /
 */
export function App() {
  return (
    <Routes>
      {/* Public routes — no shell, standalone pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Onboarding — protected but no AppShell (standalone page) */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />

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

      {/* gb/ Boards routes */}
      <Route
        path="/boards"
        element={
          <ProtectedRoute>
            <AppShell>
              <BoardList />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/boards/:slug"
        element={
          <ProtectedRoute>
            <AppShell>
              <BoardView />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/boards/:slug/new"
        element={
          <ProtectedRoute>
            <AppShell>
              <NewPost />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/boards/:slug/:id"
        element={
          <ProtectedRoute>
            <AppShell>
              <PostDetail />
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

      {/* Admin panel — admin+ only, access control in component */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AppShell>
              <AdminPanel />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Catch-all: redirect unknown routes to map */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
