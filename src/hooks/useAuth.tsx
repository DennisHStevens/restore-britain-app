import { useState, useEffect, useContext, createContext } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/**
 * The 4-tier role hierarchy (DEC-034).
 * member (default) → commander (regional moderation) → admin (global moderation) → super_admin (permanent)
 */
export type Role = 'member' | 'commander' | 'admin' | 'super_admin';

/** Numeric mapping of roles for comparison. Higher number = more privilege. */
const ROLE_LEVEL: Record<Role, number> = {
  member: 1,
  commander: 2,
  admin: 3,
  super_admin: 4,
};

/**
 * Profile data from our profiles table.
 * Null when loading or when no profile exists yet.
 */
export interface Profile {
  id: string;
  username: string;
  email: string;
  x_handle: string | null;
  region_id: string | null;
  postcode_area: string | null;
  /** Whether to show the postcode badge publicly on posts/comments */
  display_postcode: boolean;
  is_verified: boolean;
  invite_code_used: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** Re-fetch the profile from the database (e.g. after editing). Await to ensure fresh data. */
  refreshProfile: () => Promise<void>;
  /** Returns true if the current user's role is at or above the given minimum. */
  isAtLeast: (minRole: Role) => boolean;
  /**
   * Returns true if the current user can moderate content on a board with the given scope_id.
   * Commanders can moderate boards in their own region.
   * Admins+ can moderate any board.
   * Returns false for members and logged-out users.
   */
  canModerateBoard: (boardScopeId: string | null) => boolean;
}

/**
 * Auth context — shared across the entire component tree.
 *
 * Previously useAuth() was a standalone hook that created independent state
 * in every component that called it. This caused duplicate Supabase queries
 * and, critically, state inconsistencies between ProtectedRoute and page
 * components (e.g. Onboarding). The result was a navigation loop: Onboarding
 * saw an updated profile and navigated to '/', but ProtectedRoute at '/' had
 * its own stale profile and bounced back to '/onboarding'.
 *
 * Now all components share the same auth/profile state through this context.
 * One source of truth, no inconsistencies.
 */
const AuthContext = createContext<AuthState | null>(null);

/**
 * Provider component — wrap the app root in this so all children share
 * the same auth state. Handles session monitoring and profile loading.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        loadProfile(s.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes (login, logout, token refresh).
    // We skip the INITIAL_SESSION event because getSession() above
    // already handles it — avoids a duplicate profile load on mount.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        if (event === 'INITIAL_SESSION') return;
        setSession(s);
        if (s?.user) {
          loadProfile(s.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Failed to load profile:', error.message);
      setProfile(null);
    } else {
      setProfile(data as Profile);
    }
    setLoading(false);
  }

  /** Allow external callers (e.g. Onboarding, Profile page) to re-fetch profile data. */
  async function refreshProfile() {
    if (session?.user) {
      await loadProfile(session.user.id);
    }
  }

  /**
   * Check if the current user's role is at or above a given minimum.
   * Returns false if not logged in or profile hasn't loaded yet.
   */
  function isAtLeast(minRole: Role): boolean {
    if (!profile) return false;
    return ROLE_LEVEL[profile.role] >= ROLE_LEVEL[minRole];
  }

  /**
   * Check if the current user can moderate content on a board.
   * - Admins/super_admins can moderate any board.
   * - Commanders can moderate boards whose scope_id matches their region_id.
   * - The national board (scope_id === null) requires admin+.
   * - Members cannot moderate.
   */
  function canModerateBoard(boardScopeId: string | null): boolean {
    if (!profile) return false;

    // Admins and super_admins can moderate everything
    if (ROLE_LEVEL[profile.role] >= ROLE_LEVEL['admin']) return true;

    // Commanders can moderate their own region's board (not national)
    if (profile.role === 'commander' && boardScopeId !== null && profile.region_id === boardScopeId) {
      return true;
    }

    return false;
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      loading,
      refreshProfile,
      isAtLeast,
      canModerateBoard,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook that reads shared auth state from the nearest AuthProvider.
 * Must be used inside an AuthProvider — throws if not.
 */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be used inside an <AuthProvider>.');
  }
  return ctx;
}
