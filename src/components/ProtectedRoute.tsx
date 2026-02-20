import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Wraps any page that requires an authenticated, verified user.
 * - No session → redirect to /login
 * - Session but not verified → redirect to /login (shouldn't happen
 *   with the atomic registration flow, but defence in depth)
 * - Loading → show nothing (avoids flash of login page)
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: 'var(--colour-text-muted)',
      }}>
        Loading...
      </div>
    );
  }

  // No session at all — not logged in
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Has session but profile not verified — shouldn't happen, but safe guard
  if (profile && !profile.is_verified) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
