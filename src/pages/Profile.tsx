import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

/**
 * Profile page — shows the user's profile info with edit capability.
 *
 * Displays: display name, email (read-only), X handle, verified status,
 * join date. User can edit display_name and x_handle inline.
 *
 * Also contains the logout button — this is the natural place for it
 * now that we have a proper nav structure.
 */
export function Profile() {
  const { profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [xHandle, setXHandle] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  function startEditing() {
    setDisplayName(profile?.display_name || '');
    setXHandle(profile?.x_handle || '');
    setSaveError('');
    setSaveSuccess(false);
    setEditing(true);
  }

  async function handleSave() {
    if (!displayName.trim()) {
      setSaveError('Display name cannot be empty.');
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        x_handle: xHandle.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile?.id);

    setSaving(false);

    if (error) {
      setSaveError('Failed to save. Please try again.');
      console.error('[Profile] Save error:', error);
    } else {
      setSaveSuccess(true);
      setEditing(false);
      // Refresh the profile data in the auth hook so the UI updates
      refreshProfile();
    }
  }

  function cancelEditing() {
    setEditing(false);
    setSaveError('');
  }

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
        <h2 style={styles.title}>Your Profile</h2>

        {saveSuccess && (
          <div style={styles.successBanner}>Profile updated.</div>
        )}

        <div style={styles.profileSection}>
          {/* Display Name — editable */}
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Display Name</span>
            {editing ? (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={styles.input}
                autoFocus
              />
            ) : (
              <span>{profile?.display_name}</span>
            )}
          </div>

          {/* Email — always read-only */}
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Email</span>
            <span style={{ fontSize: '0.8125rem' }}>{profile?.email}</span>
          </div>

          {/* X Handle — editable */}
          <div style={styles.field}>
            <span style={styles.fieldLabel}>X Handle</span>
            {editing ? (
              <input
                type="text"
                value={xHandle}
                onChange={(e) => setXHandle(e.target.value)}
                placeholder="@handle"
                style={styles.input}
              />
            ) : profile?.x_handle ? (
              <a
                href={`https://x.com/${profile.x_handle.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--colour-primary)', fontSize: '0.875rem' }}
              >
                {profile.x_handle}
              </a>
            ) : (
              <span style={{ color: 'var(--colour-text-muted)', fontStyle: 'italic', fontSize: '0.875rem' }}>Not set</span>
            )}
          </div>

          {/* Verified — read-only */}
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Verified</span>
            <span>{profile?.is_verified ? 'Yes' : 'No'}</span>
          </div>

          {/* Join Date — read-only */}
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Joined</span>
            <span style={{ fontSize: '0.8125rem' }}>
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </span>
          </div>
        </div>

        {/* Edit / Save / Cancel buttons */}
        {saveError && <p style={styles.error}>{saveError}</p>}

        {editing ? (
          <div style={styles.buttonRow}>
            <button onClick={cancelEditing} style={styles.cancelButton}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={styles.saveButton}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <button onClick={startEditing} style={styles.editButton}>
            Edit Profile
          </button>
        )}

        {/* Logout — at the bottom, visually separated */}
        <div style={styles.logoutSection}>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    padding: '1.5rem 1rem',
  },
  card: {
    width: '100%',
    maxWidth: 'var(--max-width)',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    marginBottom: '1rem',
  },
  profileSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    marginBottom: '1rem',
    padding: '1rem',
    backgroundColor: 'var(--colour-surface)',
    borderRadius: 'var(--radius)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  field: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.875rem',
    minHeight: '2rem',
  },
  fieldLabel: {
    color: 'var(--colour-text-muted)',
    fontWeight: 500,
    flexShrink: 0,
    marginRight: '1rem',
  },
  input: {
    textAlign: 'right' as const,
    padding: '0.35rem 0.5rem',
    fontSize: '0.875rem',
    border: '1px solid var(--colour-border)',
    borderRadius: 'var(--radius)',
    backgroundColor: 'var(--colour-input-bg)',
    outline: 'none',
    maxWidth: 180,
  },
  successBanner: {
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 500,
    marginBottom: '1rem',
  },
  error: {
    color: 'var(--colour-error)',
    fontSize: '0.8125rem',
    marginBottom: '0.5rem',
  },
  buttonRow: {
    display: 'flex',
    gap: '0.75rem',
  },
  editButton: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: 'var(--colour-primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  saveButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: 'var(--colour-primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  cancelButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: 'transparent',
    color: 'var(--colour-text-muted)',
    border: '1px solid var(--colour-border)',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  logoutSection: {
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid var(--colour-border)',
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
};
