import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

/**
 * RegionBottomSheet — slides up from the bottom when a region is tapped.
 *
 * Fetches region data (name, description, member_count, telegram_group_url)
 * from Supabase and displays it in a draggable panel. The user can dismiss
 * it by swiping down or tapping the map behind it.
 *
 * The sheet has three states:
 * - closed (off-screen)
 * - peeking (shows region name + key info, ~40% of viewport)
 * - expanded (full detail, ~70% of viewport) — future use, not MVP
 *
 * For MVP we only use closed and peeking.
 */

interface RegionData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  telegram_group_url: string | null;
  member_count: number;
  is_active: boolean;
}

interface RegionBottomSheetProps {
  /** The GeoJSON feature ID of the selected region (e.g. "S92000003") */
  regionFeatureId: string | null;
  /** Called when the sheet is dismissed — parent should clear selection */
  onDismiss: () => void;
}

/**
 * Maps GeoJSON feature IDs to the region names as stored in Supabase.
 * The GeoJSON uses ONS codes (E12000001, S92000003, etc.) but our
 * Supabase regions table uses human-readable names. We match on name.
 */
const FEATURE_ID_TO_REGION_NAME: Record<string, string> = {
  E12000001: 'North East',
  E12000002: 'North West',
  E12000003: 'Yorkshire & the Humber',
  E12000004: 'East Midlands',
  E12000005: 'West Midlands',
  E12000006: 'East of England',
  E12000007: 'London',
  E12000008: 'South East',
  E12000009: 'South West',
  N92000002: 'Northern Ireland',
  S92000003: 'Scotland',
  W92000004: 'Wales',
};

export function RegionBottomSheet({ regionFeatureId, onDismiss }: RegionBottomSheetProps) {
  const [region, setRegion] = useState<RegionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Touch tracking for swipe-to-dismiss */
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number>(0);

  const isOpen = regionFeatureId !== null;

  /**
   * Fetch region data from Supabase when the selected region changes.
   * We look up by name since our regions table uses names, not ONS codes.
   */
  useEffect(() => {
    if (!regionFeatureId) {
      setRegion(null);
      return;
    }

    const regionName = FEATURE_ID_TO_REGION_NAME[regionFeatureId];
    if (!regionName) {
      setError('Unknown region');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    supabase
      .from('regions')
      .select('id, name, slug, description, telegram_group_url, member_count, is_active')
      .eq('name', regionName)
      .single()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          console.error('[BottomSheet] Failed to fetch region:', fetchError);
          setError('Could not load region details.');
          setRegion(null);
        } else {
          setRegion(data as RegionData);
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [regionFeatureId]);

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

  /* ── Board navigation ────────────────────────────────────────── */

  const navigate = useNavigate();

  /**
   * Navigate to the gb/national board. Regional boards will be
   * added in a future phase — for now all regions link to national.
   */
  function viewBoard() {
    onDismiss();
    navigate('/boards/national');
  }

  return (
    <div
      className={`bottom-sheet-overlay ${isOpen ? 'open' : ''}`}
      /* Tapping the overlay (map area above sheet) dismisses */
      onClick={onDismiss}
    >
      <div
        ref={sheetRef}
        className={`bottom-sheet ${isOpen ? 'open' : ''}`}
        /* Stop clicks inside the sheet from bubbling to the overlay */
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
        <div className="bottom-sheet-content">
          {loading && (
            <p className="bottom-sheet-loading">Loading…</p>
          )}

          {error && (
            <p className="bottom-sheet-error">{error}</p>
          )}

          {region && !loading && (
            <>
              <h2 className="bottom-sheet-title">{region.name}</h2>

              {region.description && (
                <p className="bottom-sheet-description">{region.description}</p>
              )}

              <div className="bottom-sheet-stats">
                <div className="bottom-sheet-stat">
                  <span className="bottom-sheet-stat-value">
                    {region.member_count}
                  </span>
                  <span className="bottom-sheet-stat-label">
                    {region.member_count === 1 ? 'Member' : 'Members'}
                  </span>
                </div>

                <div className="bottom-sheet-stat">
                  <span className="bottom-sheet-stat-value">—</span>
                  <span className="bottom-sheet-stat-label">Leader</span>
                </div>
              </div>

              {/* View Board button — links to gb/national for now.
                  Regional boards (gb/west-midlands etc.) will be added
                  when membership grows, mapped 1:1 to regions. */}
              <button
                className="bottom-sheet-board-btn"
                onClick={viewBoard}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                View gb/national Board
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
