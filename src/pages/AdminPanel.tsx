import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import type { Role } from '../hooks/useAuth';

/** Admin-only CSS — only loaded when this component mounts (Vite code-splits it). */
import '../admin.css';

/**
 * AdminPanel — admin-only page for platform management.
 *
 * Features:
 * - View member list with roles, promote/demote (super_admin only)
 * - View invite codes: filter used/available, tap-to-copy, usage tracking
 * - Generate 10 new codes at a time (super_admin only)
 *
 * Route: /admin
 * Access: admin and super_admin only.
 */

interface InviteCode {
  id: string;
  code: string;
  created_by: string | null;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  /**
   * Supabase PostgREST returns joined relations as arrays even for single-row joins.
   * used_by_profile: who redeemed the code (via used_by FK)
   */
  used_by_profile?: Array<{ username: string; email: string }> | null;
}

interface MemberRow {
  id: string;
  username: string;
  email: string;
  role: Role;
  region_id: string | null;
  is_verified: boolean;
  created_at: string;
}

export function AdminPanel() {
  const navigate = useNavigate();
  const { profile, isAtLeast } = useAuth();

  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members');
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite code filter: show used codes or not
  const [showUsed, setShowUsed] = useState(false);

  // Clipboard feedback: which code ID was just copied
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Generate button state
  const [generating, setGenerating] = useState(false);

  // Delete member state: tracks which member ID is currently being deleted
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  // Guard: only admin+ can access this page
  const hasAccess = isAtLeast('admin');

  useEffect(() => {
    if (!hasAccess) return;

    async function load() {
      try {
        // Fetch members list
        const { data: memberData, error: memberError } = await supabase
          .from('profiles')
          .select('id, username, email, role, region_id, is_verified, created_at')
          .order('created_at', { ascending: true });

        if (memberError) throw memberError;
        setMembers((memberData ?? []) as MemberRow[]);

        // Fetch invite codes with joined used_by profile (username + email)
        const { data: codeData, error: codeError } = await supabase
          .from('invite_codes')
          .select('id, code, created_by, used_by, used_at, created_at, used_by_profile:profiles!invite_codes_used_by_fkey(username, email)')
          .order('created_at', { ascending: false });

        if (codeError) throw codeError;
        // Supabase PostgREST returns joined relations as arrays even for single-row joins.
        // Cast through unknown to handle the mismatch between returned array format and InviteCode type.
        setInviteCodes((codeData ?? []) as unknown as InviteCode[]);
      } catch (err: any) {
        console.error('[AdminPanel] Load failed:', err);
        setError(err.message || 'Failed to load admin data.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [hasAccess]);

  // Handle role change — only super_admin can do this
  async function handleRoleChange(userId: string, newRole: Role) {
    if (!isAtLeast('super_admin')) {
      alert('Only super admins can change user roles.');
      return;
    }

    // Don't allow changing own role
    if (userId === profile?.id) {
      alert('You cannot change your own role.');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Verify the update actually persisted (RLS can silently block updates)
      const { data: verify, error: verifyError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (verifyError) throw verifyError;

      if (verify.role !== newRole) {
        throw new Error(
          'Role update was blocked by the database. Check that your account has super_admin privileges.'
        );
      }

      // Update local state only after confirmed persistence
      setMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, role: newRole } : m))
      );
    } catch (err: any) {
      console.error('[AdminPanel] Role change failed:', err);
      alert(`Failed to change role: ${err.message}`);
      // Revert optimistic UI by re-fetching
      const { data: current } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (current) {
        setMembers((prev) =>
          prev.map((m) => (m.id === userId ? { ...m, role: current.role as Role } : m))
        );
      }
    }
  }

  /**
   * Copy a direct register link to clipboard. The link includes the invite
   * code as a query parameter so the registration form auto-fills it.
   */
  async function handleCopyCode(code: string, codeId: string) {
    const baseUrl = window.location.origin;
    const registerUrl = `${baseUrl}/register?code=${encodeURIComponent(code)}`;

    try {
      await navigator.clipboard.writeText(registerUrl);
      setCopiedCodeId(codeId);
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch {
      // Fallback for older browsers / non-HTTPS
      const textarea = document.createElement('textarea');
      textarea.value = registerUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedCodeId(codeId);
      setTimeout(() => setCopiedCodeId(null), 2000);
    }
  }

  // Generate 10 new codes via RPC
  async function handleGenerateCodes() {
    if (!isAtLeast('super_admin')) {
      alert('Only super admins can generate codes.');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.rpc('generate_invite_codes', {
        count: 10,
      });

      if (error) throw error;

      // Add the new codes to local state (they come back from the RPC)
      const newCodes: InviteCode[] = (data ?? []).map((row: any) => ({
        id: row.id,
        code: row.code,
        created_by: profile?.id || null,
        used_by: null,
        used_at: null,
        created_at: row.created_at,
        used_by_profile: null,
      }));

      // Prepend new codes (they're the newest)
      setInviteCodes((prev) => [...newCodes, ...prev]);
    } catch (err: any) {
      console.error('[AdminPanel] Code generation failed:', err);
      alert(`Failed to generate codes: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }

  // Delete a member — super_admin only, via Edge Function
  async function handleDeleteMember(userId: string, username: string) {
    if (!isAtLeast('super_admin')) {
      alert('Only super admins can delete members.');
      return;
    }

    if (userId === profile?.id) {
      alert('You cannot delete your own account.');
      return;
    }

    // Confirmation prompt — two-step to prevent accidents
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete @${username}?\n\nThis will:\n• Remove their account and profile\n• Free up their invite code for reuse\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingMemberId(userId);
    try {
      const { data, error } = await supabase.functions.invoke('delete-member', {
        body: { user_id: userId },
      });

      // supabase.functions.invoke wraps non-2xx responses in a generic error
      // that hides the actual message. Extract the real error from the response.
      if (error) {
        let realMessage = error.message;
        try {
          // FunctionsHttpError stores the Response in .context
          const body = await (error as any).context?.json?.();
          if (body?.error) realMessage = body.error;
        } catch { /* ignore parse failures */ }
        throw new Error(realMessage);
      }

      // Check for application-level errors in the response body
      if (data?.error) {
        throw new Error(data.error);
      }

      // Remove from local state
      setMembers((prev) => prev.filter((m) => m.id !== userId));

      // Also refresh invite codes since one may have been freed up
      const { data: codeData } = await supabase
        .from('invite_codes')
        .select('id, code, created_by, used_by, used_at, created_at, used_by_profile:profiles!invite_codes_used_by_fkey(username, email)')
        .order('created_at', { ascending: false });

      if (codeData) {
        setInviteCodes(codeData as unknown as InviteCode[]);
      }
    } catch (err: any) {
      console.error('[AdminPanel] Delete member failed:', err);
      alert(`Failed to delete member: ${err.message}`);
    } finally {
      setDeletingMemberId(null);
    }
  }

  // Redirect non-admins
  if (!hasAccess) {
    return (
      <div className="admin-panel">
        <p className="admin-no-access">You don't have permission to view this page.</p>
        <button className="admin-back-btn" onClick={() => navigate('/')}>
          ← Back to map
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="admin-loading">Loading admin data…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-panel">
        <p className="admin-error">{error}</p>
      </div>
    );
  }

  const isSuperAdmin = isAtLeast('super_admin');

  // Filter codes based on toggle
  const filteredCodes = showUsed
    ? inviteCodes
    : inviteCodes.filter((c) => c.used_by === null);

  const availableCount = inviteCodes.filter((c) => c.used_by === null).length;
  const usedCount = inviteCodes.filter((c) => c.used_by !== null).length;

  return (
    <div className="admin-panel">
      <h1 className="admin-title">Admin Panel</h1>

      {/* Tab switcher */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'members' ? 'admin-tab-active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members ({members.length})
        </button>
        <button
          className={`admin-tab ${activeTab === 'invites' ? 'admin-tab-active' : ''}`}
          onClick={() => setActiveTab('invites')}
        >
          Invite Codes ({inviteCodes.length})
        </button>
      </div>

      {/* Members tab */}
      {activeTab === 'members' && (
        <div className="admin-section">
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Verified</th>
                  <th>Joined</th>
                  {isSuperAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="admin-cell-username">
                      @{member.username}
                    </td>
                    <td>
                      <span className={`admin-role-tag admin-role-${member.role}`}>
                        {member.role}
                      </span>
                    </td>
                    <td>{member.is_verified ? '✓' : '—'}</td>
                    <td className="admin-cell-date">
                      {new Date(member.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    {isSuperAdmin && (
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {member.role !== 'super_admin' && member.id !== profile?.id && (
                            <>
                              <select
                                className="admin-role-select"
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.id, e.target.value as Role)}
                              >
                                <option value="member">member</option>
                                <option value="commander">commander</option>
                                <option value="admin">admin</option>
                              </select>
                              <button
                                className="admin-delete-btn"
                                onClick={() => handleDeleteMember(member.id, member.username)}
                                disabled={deletingMemberId === member.id}
                                title={`Delete @${member.username}`}
                              >
                                {deletingMemberId === member.id ? '…' : '×'}
                              </button>
                            </>
                          )}
                          {member.role === 'super_admin' && (
                            <span className="admin-permanent-label">permanent</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite codes tab */}
      {activeTab === 'invites' && (
        <div className="admin-section">
          {/* Stats bar */}
          <div className="admin-codes-stats">
            <span className="admin-codes-stat">
              <span className="admin-codes-stat-number">{availableCount}</span> available
            </span>
            <span className="admin-codes-stat">
              <span className="admin-codes-stat-number">{usedCount}</span> used
            </span>
            <span className="admin-codes-stat">
              <span className="admin-codes-stat-number">{inviteCodes.length}</span> total
            </span>
          </div>

          {/* Filter toggle */}
          <div className="admin-codes-filter">
            <label className="admin-codes-toggle">
              <input
                type="checkbox"
                checked={showUsed}
                onChange={(e) => setShowUsed(e.target.checked)}
              />
              <span className="admin-codes-toggle-label">Show used codes</span>
            </label>
          </div>

          {/* Code table — data-dense view with all relevant columns */}
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Used By</th>
                  <th>Used At</th>
                  <th>Age</th>
                </tr>
              </thead>
              <tbody>
                {filteredCodes.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--colour-text-muted)' }}>
                      {showUsed
                        ? 'No codes found.'
                        : 'No available codes. Generate some below.'}
                    </td>
                  </tr>
                )}
                {filteredCodes.map((code) => {
                  const isUsed = code.used_by !== null;
                  const isCopied = copiedCodeId === code.id;
                  const usedByUsername = code.used_by_profile?.[0]?.username;
                  const usedByEmail = code.used_by_profile?.[0]?.email;

                  /* Human-readable relative time since creation */
                  const ageMs = Date.now() - new Date(code.created_at).getTime();
                  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
                  const ageLabel =
                    ageDays === 0 ? 'Today' :
                    ageDays === 1 ? '1 day' :
                    ageDays < 30 ? `${ageDays} days` :
                    ageDays < 365 ? `${Math.floor(ageDays / 30)}mo` :
                    `${Math.floor(ageDays / 365)}y`;

                  return (
                    <tr
                      key={code.id}
                      style={{
                        opacity: isUsed ? 0.65 : 1,
                        cursor: isUsed ? 'default' : 'pointer',
                      }}
                      onClick={() => !isUsed && handleCopyCode(code.code, code.id)}
                    >
                      {/* Code — monospace, tap-to-copy for available */}
                      <td className="admin-cell-code" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        {code.code}
                      </td>

                      {/* Status badge */}
                      <td>
                        {isUsed ? (
                          <span className="admin-code-badge admin-code-badge-used">Used</span>
                        ) : isCopied ? (
                          <span className="admin-code-badge admin-code-badge-copied">Link copied!</span>
                        ) : (
                          <span className="admin-code-badge admin-code-badge-available" style={{ color: 'var(--colour-success)', fontWeight: 600 }}>
                            Available
                          </span>
                        )}
                      </td>

                      {/* Created date */}
                      <td className="admin-cell-date">
                        {new Date(code.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>

                      {/* Used by: username + email */}
                      <td>
                        {isUsed ? (
                          <div style={{ lineHeight: 1.3 }}>
                            <div style={{ fontWeight: 600, color: 'var(--colour-primary)', fontSize: '0.8125rem' }}>
                              @{usedByUsername || 'unknown'}
                            </div>
                            {usedByEmail && (
                              <div style={{ fontSize: '0.6875rem', color: 'var(--colour-text-muted)' }}>
                                {usedByEmail}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--colour-text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Used at timestamp */}
                      <td className="admin-cell-date">
                        {code.used_at
                          ? new Date(code.used_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>

                      {/* Age — how long since the code was created */}
                      <td className="admin-cell-date">
                        {ageLabel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Generate button — super_admin only */}
          {isSuperAdmin && (
            <div className="admin-codes-generate">
              <button
                className="admin-codes-generate-btn"
                onClick={handleGenerateCodes}
                disabled={generating}
              >
                {generating ? 'Generating…' : 'Generate 10 codes'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
