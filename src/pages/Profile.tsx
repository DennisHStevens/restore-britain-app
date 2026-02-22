import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { getRegionFromPostcode } from '../lib/postcodeRegions';

/**
 * Profile page — shows the user's profile info with edit capability.
 *
 * Displays: username (editable), email (read-only), X handle, postcode
 * (editable — changing it recalculates the region), verified status,
 * join date. User can edit username, x_handle, and postcode inline.
 *
 * Also contains the logout button.
 */
export function Profile() {
  const { profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [xHandle, setXHandle] = useState('');
  const [editPostcode, setEditPostcode] = useState('');
  const [displayPostcode, setDisplayPostcode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [regionName, setRegionName] = useState<string | null>(null);

  /** Username validation: 3-20 chars, alphanumeric + underscores */
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

  /* Fetch the region name when profile loads or changes */
  useEffect(() => {
    if (!profile?.region_id) {
      setRegionName(null);
      return;
    }

    supabase
      .from('regions')
      .select('name')
      .eq('id', profile.region_id)
      .single()
      .then(({ data }) => {
        setRegionName(data?.name ?? null);
      });
  }, [profile?.region_id]);

  function startEditing() {
    setUsername(profile?.username || '');
    setXHandle(profile?.x_handle || '');
    setEditPostcode(profile?.postcode_area || '');
    setDisplayPostcode(profile?.display_postcode ?? false);
    setSaveError('');
    setSaveSuccess(false);
    setEditing(true);
  }

  /**
   * Quick-toggle display_postcode without entering full edit mode.
   * Updates the profile directly and refreshes.
   */
  async function handleToggleDisplayPostcode(checked: boolean) {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_postcode: checked, updated_at: new Date().toISOString() })
      .eq('id', profile?.id);

    setSaving(false);
    if (error) {
      console.error('[Profile] Toggle display_postcode failed:', error);
    } else {
      refreshProfile();
    }
  }

  async function handleSave() {
    if (!username.trim()) {
      setSaveError('Username cannot be empty.');
      return;
    }
    if (!usernameRegex.test(username.trim())) {
      setSaveError('Username must be 3-20 characters, letters, numbers, and underscores only.');
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    /* Build the update payload */
    const updatePayload: Record<string, unknown> = {
      username: username.trim(),
      x_handle: xHandle.trim() || null,
      display_postcode: displayPostcode,
      updated_at: new Date().toISOString(),
    };

    /*
     * If the user changed their postcode, recalculate the region.
     */
    const trimmedPostcode = editPostcode.trim().toUpperCase();
    const currentPostcode = (profile?.postcode_area || '').toUpperCase();
    const postcodeChanged = trimmedPostcode !== currentPostcode;

    if (postcodeChanged && trimmedPostcode) {
      const newRegionName = getRegionFromPostcode(trimmedPostcode);
      if (!newRegionName) {
        setSaveError('Could not determine a region from that postcode.');
        setSaving(false);
        return;
      }

      const { data: regionData, error: regionError } = await supabase
        .from('regions')
        .select('id')
        .eq('name', newRegionName)
        .single();

      if (regionError || !regionData) {
        setSaveError('Could not find that region. Please try again.');
        setSaving(false);
        return;
      }

      /* Extract full outward code (e.g. BS14, SW1A, N1) not just the letter prefix */
      const outwardCode = trimmedPostcode.replace(/\s+/g, ' ').split(' ')[0] || '';
      updatePayload.postcode_area = outwardCode;
      updatePayload.region_id = regionData.id;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', profile?.id);

    setSaving(false);

    if (error) {
      // Check if it's a unique constraint violation on username
      if (error.code === '23505' && error.message?.includes('username')) {
        setSaveError('That username is already taken.');
      } else {
        setSaveError('Failed to save. Please try again.');
      }
      console.error('[Profile] Save error:', error);
    } else {
      setSaveSuccess(true);
      setEditing(false);
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
          {/* Username — editable */}
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Username</span>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={styles.input}
                  autoFocus
                />
                {username.trim() && (
                  <span style={{
                    fontSize: '0.7rem',
                    color: usernameRegex.test(username.trim())
                      ? 'var(--colour-text-muted)'
                      : 'var(--colour-error)',
                  }}>
                    @{username.trim()}
                  </span>
                )}
              </div>
            ) : (
              <span style={{ color: 'var(--colour-primary)', fontWeight: 600 }}>
                @{profile?.username}
              </span>
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

          {/* Postcode — editable */}
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Postcode</span>
            {editing ? (
              <input
                type="text"
                value={editPostcode}
                onChange={(e) => setEditPostcode(e.target.value)}
                placeholder="e.g. BS1 4DJ"
                style={{ ...styles.input, textTransform: 'uppercase' as never }}
              />
            ) : (
              <span style={{ fontSize: '0.875rem' }}>
                {profile?.postcode_area || <span style={{ color: 'var(--colour-text-muted)', fontStyle: 'italic' }}>Not set</span>}
              </span>
            )}
          </div>

          {/* Display Postcode toggle — controls whether postcode badge shows on posts/comments */}
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Display Postcode</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={editing ? displayPostcode : (profile?.display_postcode ?? false)}
                onChange={(e) => {
                  if (editing) {
                    setDisplayPostcode(e.target.checked);
                  } else {
                    handleToggleDisplayPostcode(e.target.checked);
                  }
                }}
                disabled={saving}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Region — derived from postcode, read-only */}
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Region</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--colour-text-muted)' }}>
              {regionName ?? 'Not assigned'}
            </span>
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
    backgroundColor: 'var(--colour-bg-alt)',
    color: 'var(--colour-accent)',
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
    color: 'var(--colour-text-inverse)',
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
    color: 'var(--colour-text-inverse)',
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
