import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

/**
 * Dashboard — placeholder landing page for authenticated users.
 * Will be replaced with the real map/profile UI in Phase 1.4+.
 * For now it shows the user's profile info and a logout button
 * to verify the auth flow works end-to-end.
 */
export function Dashboard() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={{ color: 'var(--colour-text-muted)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Restore Britain</h1>
        <p style={styles.subtitle}>Welcome back, @{profile?.username || 'member'}.</p>

        <div style={styles.profileSection}>
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Username</span>
            <span style={{ color: 'var(--colour-primary)', fontWeight: 600 }}>@{profile?.username}</span>
          </div>
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Email</span>
            <span>{profile?.email}</span>
          </div>
          {profile?.x_handle && (
            <div style={styles.field}>
              <span style={styles.fieldLabel}>X Handle</span>
              <span>{profile.x_handle}</span>
            </div>
          )}
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Verified</span>
            <span>{profile?.is_verified ? 'Yes' : 'No'}</span>
          </div>
        </div>

        <button onClick={handleLogout} style={styles.logoutButton}>
          Log Out
        </button>

        <p style={styles.hint}>
          This is a placeholder dashboard. The map and real UI come in later phases.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '1rem',
  },
  card: {
    width: '100%',
    maxWidth: 'var(--max-width)',
    backgroundColor: 'var(--colour-surface)',
    borderRadius: 'var(--radius)',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '0.25rem',
  },
  subtitle: {
    color: 'var(--colour-text-muted)',
    fontSize: '0.875rem',
    marginBottom: '1.5rem',
  },
  profileSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: 'var(--colour-bg)',
    borderRadius: 'var(--radius)',
  },
  field: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.875rem',
  },
  fieldLabel: {
    color: 'var(--colour-text-muted)',
    fontWeight: 500,
  },
  logoutButton: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: 'transparent',
    color: 'var(--colour-error)',
    border: '1px solid var(--colour-error)',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  hint: {
    textAlign: 'center' as const,
    marginTop: '1.5rem',
    fontSize: '0.75rem',
    color: 'var(--colour-text-muted)',
    fontStyle: 'italic',
  },
};
