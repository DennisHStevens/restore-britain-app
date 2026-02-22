import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * UserProfileModal — slides up from the bottom when a @username is clicked.
 *
 * Fetches the user's public profile (username, X handle, region, verified
 * status, join date) and displays it in a draggable bottom sheet. Follows
 * the exact same pattern as RegionBottomSheet:
 *   - Overlay dims/blurs the background
 *   - iOS-style spring animation (cubic-bezier(0.32, 0.72, 0, 1))
 *   - Swipe down to dismiss
 *   - Tap overlay to dismiss
 *
 * The userId prop controls visibility: null = closed, string = open.
 */

interface UserProfileData {
  id: string;
  username: string;
  x_handle: string | null;
  region_id: string | null;
  is_verified: boolean;
  created_at: string;
  region_name?: string | null;
}

interface UserProfileModalProps {
  /** The user ID to show. null = hidden. */
  userId: string | null;
  /** Called when the modal should be dismissed. */
  onDismiss: () => void;
}

export function UserProfileModal({ userId, onDismiss }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Touch tracking for swipe-to-dismiss */
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number>(0);

  const isOpen = userId !== null;

  /**
   * Fetch profile data when the userId changes.
   * We join to regions to get the region name in one query.
   */
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function loadProfile() {
      try {
        /* Fetch profile with region name in a single query via join */
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select(`
            id, username, x_handle, region_id, is_verified, created_at,
            region:regions!profiles_region_id_fkey(name)
          `)
          .eq('id', userId)
          .single();

        if (cancelled) return;

        if (fetchError) {
          console.error('[UserProfileModal] Fetch error:', fetchError);
          setError('Could not load profile.');
          setProfile(null);
        } else {
          setProfile({
            id: data.id,
            username: data.username,
            x_handle: data.x_handle,
            region_id: data.region_id,
            is_verified: data.is_verified,
            created_at: data.created_at,
            region_name: (data.region as any)?.name ?? null,
          });
        }
      } catch {
        if (!cancelled) {
          setError('Could not load profile.');
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();
    return () => { cancelled = true; };
  }, [userId]);

  /* ── Touch handlers for swipe-to-dismiss ─────────────────────── */

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = 0;
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const deltaY = e.touches[0].clientY - dragStartY.current;
    /* Only allow dragging downward (positive delta) */
    if (deltaY > 0) {
      dragCurrentY.current = deltaY;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${deltaY}px)`;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 0.3s ease';
    }
    /* If dragged more than 80px down, dismiss; otherwise snap back */
    if (dragCurrentY.current > 80) {
      onDismiss();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = 'translateY(0)';
    }
    dragStartY.current = null;
    dragCurrentY.current = 0;
  }, [onDismiss]);

  /* Format the join date */
  function formatJoinDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div
      className={`user-profile-overlay ${isOpen ? 'open' : ''}`}
      onClick={onDismiss}
    >
      <div
        ref={sheetRef}
        className={`user-profile-sheet ${isOpen ? 'open' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="bottom-sheet-handle">
          <div className="bottom-sheet-handle-bar" />
        </div>

        {/* Content */}
        <div className="user-profile-content">
          {loading && (
            <p className="user-profile-loading">Loading…</p>
          )}

          {error && (
            <p className="user-profile-error">{error}</p>
          )}

          {profile && !loading && (
            <>
              {/* Username — large, primary colour */}
              <h2 className="user-profile-username">@{profile.username}</h2>

              {/* Verified badge */}
              {profile.is_verified && (
                <span className="user-profile-verified">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Verified Member
                </span>
              )}

              {/* Profile fields */}
              <div className="user-profile-fields">
                {/* Region */}
                <div className="user-profile-field">
                  <span className="user-profile-field-label">Region</span>
                  <span className="user-profile-field-value">
                    {profile.region_name || 'Not assigned'}
                  </span>
                </div>

                {/* X Handle */}
                {profile.x_handle && (
                  <div className="user-profile-field">
                    <span className="user-profile-field-label">X</span>
                    <a
                      href={`https://x.com/${profile.x_handle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="user-profile-field-link"
                    >
                      {profile.x_handle}
                    </a>
                  </div>
                )}

                {/* Joined date */}
                <div className="user-profile-field">
                  <span className="user-profile-field-label">Joined</span>
                  <span className="user-profile-field-value">
                    {formatJoinDate(profile.created_at)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
