import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import type { Role } from '../hooks/useAuth';

/**
 * AdminPanel — admin-only page for platform management.
 *
 * Features:
 * - View and manage invite codes (admin+)
 * - View member list with roles (admin+)
 * - Promote/demote users (super_admin only)
 *
 * Route: /admin
 * Access: admin and super_admin only. Members and commanders
 * are redirected back to the home page.
 */

interface InviteCode {
  id: string;
  code: string;
  created_by: string | null;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
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

  // Guard: only admin+ can access this page
  const hasAccess = isAtLeast('admin');

  useEffect(() => {
    if (!hasAccess) return;

    async function load() {
      try {
        // Fetch members list — profiles table is readable by authenticated users
        const { data: memberData, error: memberError } = await supabase
          .from('profiles')
          .select('id, username, email, role, region_id, is_verified, created_at')
          .order('created_at', { ascending: true });

        if (memberError) throw memberError;
        setMembers((memberData ?? []) as MemberRow[]);

        // Fetch invite codes — RLS policy allows admin+ to read
        const { data: codeData, error: codeError } = await supabase
          .from('invite_codes')
          .select('*')
          .order('created_at', { ascending: false });

        if (codeError) throw codeError;
        setInviteCodes((codeData ?? []) as InviteCode[]);
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

      // Update local state
      setMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, role: newRole } : m))
      );
    } catch (err: any) {
      console.error('[AdminPanel] Role change failed:', err);
      alert(`Failed to change role: ${err.message}`);
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
                        {member.role !== 'super_admin' && member.id !== profile?.id && (
                          <select
                            className="admin-role-select"
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value as Role)}
                          >
                            <option value="member">member</option>
                            <option value="commander">commander</option>
                            <option value="admin">admin</option>
                          </select>
                        )}
                        {member.role === 'super_admin' && (
                          <span className="admin-permanent-label">permanent</span>
                        )}
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
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Status</th>
                  <th>Used At</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {inviteCodes.map((code) => (
                  <tr key={code.id}>
                    <td className="admin-cell-code">{code.code}</td>
                    <td>
                      {code.used_by ? (
                        <span className="admin-code-used">Used</span>
                      ) : (
                        <span className="admin-code-available">Available</span>
                      )}
                    </td>
                    <td className="admin-cell-date">
                      {code.used_at
                        ? new Date(code.used_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="admin-cell-date">
                      {new Date(code.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
