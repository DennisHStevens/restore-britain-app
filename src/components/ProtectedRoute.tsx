import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Wraps any page that requires an authenticated, verified user.
 * - No session → redirect to /login
 * - Session but not verified → redirect to /login (defence in depth)
 * - Session + verified but no region → redirect to /onboarding
 *   (unless already on the onboarding page — avoids redirect loop)
 * - Loading → show nothing (avoids flash of login page)
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

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

  // Verified but no region assigned — redirect to onboarding.
  // Skip if we're already on the onboarding page to avoid a redirect loop.
  if (profile && !profile.region_id && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
