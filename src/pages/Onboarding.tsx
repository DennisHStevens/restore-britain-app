import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { getRegionFromPostcode } from '../lib/postcodeRegions';
import { RegionMap } from '../components/map/RegionMap';

/**
 * Onboarding — shown after registration when region_id is still null.
 *
 * Two paths to set a region:
 * 1. **Postcode entry** (default) — type a full UK postcode, we detect the
 *    region automatically. Stores the full postcode on the profile.
 * 2. **Map picker** (skip path) — tap a region on the interactive map,
 *    confirm with a button. No postcode stored in this case.
 *
 * Both paths write region_id to the profile. The useEffect watches for
 * region_id to become non-null and navigates to the main app.
 */

/** Region names keyed by GeoJSON feature ID — mirrors RegionBottomSheet mapping */
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

export function Onboarding() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  /* ── Postcode entry state ──────────────────────────────────── */
  const [postcode, setPostcode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [detectedRegion, setDetectedRegion] = useState<string | null>(null);

  /* ── Map picker state ──────────────────────────────────────── */
  const [mode, setMode] = useState<'postcode' | 'map'>('postcode');
  const [_selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [selectedRegionName, setSelectedRegionName] = useState<string | null>(null);

  /**
   * Watch for profile.region_id to become non-null.
   * Shared context means the update is visible immediately after
   * refreshProfile() resolves and React re-renders.
   */
  useEffect(() => {
    if (profile?.region_id) {
      navigate('/', { replace: true });
    }
  }, [profile?.region_id, navigate]);

  /* ── Postcode handlers ─────────────────────────────────────── */

  function handlePostcodeChange(value: string) {
    setPostcode(value);
    setError('');
    const region = getRegionFromPostcode(value);
    setDetectedRegion(region);
  }

  async function handlePostcodeConfirm() {
    if (!detectedRegion) {
      setError('Please enter a valid UK postcode.');
      return;
    }

    setSaving(true);
    setError('');

    const { data: regionData, error: regionError } = await supabase
      .from('regions')
      .select('id')
      .eq('name', detectedRegion)
      .single();

    if (regionError || !regionData) {
      setError('Could not find your region. Please try again.');
      setSaving(false);
      console.error('[Onboarding] Region lookup failed:', regionError);
      return;
    }

    /* Store the full postcode (uppercased, trimmed) */
    const fullPostcode = postcode.trim().toUpperCase();
    /* Also extract the postcode area (1-2 letters) for quick lookups */
    const postcodeArea = fullPostcode.match(/^[A-Z]{1,2}/)?.[0] || '';

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        region_id: regionData.id,
        postcode_area: postcodeArea,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile?.id);

    if (updateError) {
      setError('Failed to save your region. Please try again.');
      setSaving(false);
      console.error('[Onboarding] Profile update failed:', updateError);
      return;
    }

    await refreshProfile();
  }

  /* ── Map picker handlers ───────────────────────────────────── */

  const handleMapRegionSelect = useCallback((featureId: string, _name: string) => {
    const regionName = FEATURE_ID_TO_REGION_NAME[featureId];
    if (!regionName) return;
    setSelectedFeatureId(featureId);
    setSelectedRegionName(regionName);
    setError('');
  }, []);

  async function handleMapConfirm() {
    if (!selectedRegionName) return;

    setSaving(true);
    setError('');

    const { data: regionData, error: regionError } = await supabase
      .from('regions')
      .select('id')
      .eq('name', selectedRegionName)
      .single();

    if (regionError || !regionData) {
      setError('Could not find that region. Please try again.');
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        region_id: regionData.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile?.id);

    if (updateError) {
      setError('Failed to save your region. Please try again.');
      setSaving(false);
      return;
    }

    await refreshProfile();
  }

  /* ── Render: Map picker mode ───────────────────────────────── */

  if (mode === 'map') {
    return (
      <div style={styles.mapContainer}>
        <RegionMap onRegionSelect={handleMapRegionSelect} />

        {/* Floating confirm panel — appears when a region is tapped */}
        {selectedRegionName && (
          <div style={styles.mapConfirmPanel}>
            <span style={styles.mapConfirmLabel}>
              {selectedRegionName}
            </span>
            <button
              onClick={handleMapConfirm}
              disabled={saving}
              style={{
                ...styles.mapConfirmButton,
                opacity: saving ? 0.5 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Confirm Region'}
            </button>
          </div>
        )}

        {error && (
          <div style={styles.mapError}>{error}</div>
        )}

        {/* Back link to return to postcode entry */}
        <button
          onClick={() => { setMode('postcode'); setSelectedFeatureId(null); setSelectedRegionName(null); }}
          style={styles.mapBackButton}
        >
          ← Enter postcode instead
        </button>
      </div>
    );
  }

  /* ── Render: Postcode entry mode (default) ─────────────────── */

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome to Restore Britain</h1>
        <p style={styles.subtitle}>
          Enter your postcode so we can assign you to your local region.
        </p>

        <div style={styles.inputGroup}>
          <label style={styles.label} htmlFor="postcode">
            Your postcode
          </label>
          <input
            id="postcode"
            type="text"
            value={postcode}
            onChange={(e) => handlePostcodeChange(e.target.value)}
            placeholder="e.g. BS1 4DJ"
            style={styles.input}
            autoComplete="postal-code"
            autoFocus
          />
        </div>

        {/* Privacy reassurance */}
        <p style={styles.privacyNote}>
          Your postcode is only used to determine your region. It will never
          be displayed publicly or shared with other members without your
          explicit permission.
        </p>

        {/* Live region detection feedback */}
        {detectedRegion && (
          <div style={styles.regionPreview}>
            Your region: <strong>{detectedRegion}</strong>
          </div>
        )}

        {error && <p style={styles.error}>{error}</p>}

        <button
          onClick={handlePostcodeConfirm}
          disabled={saving || !detectedRegion}
          style={{
            ...styles.confirmButton,
            opacity: saving || !detectedRegion ? 0.5 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Confirm Region'}
        </button>

        {/* Skip link — switch to map-based region picker */}
        <button
          onClick={() => setMode('map')}
          style={styles.skipButton}
        >
          I'd rather choose my region on the map
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  /* ── Postcode entry ──────────────────────────────────────────── */
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '1.5rem 1rem',
    backgroundColor: 'var(--colour-bg)',
  },
  card: {
    width: '100%',
    maxWidth: 'var(--max-width)',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--colour-text)',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.9375rem',
    color: 'var(--colour-text-muted)',
    lineHeight: 1.5,
    marginBottom: '2rem',
  },
  inputGroup: {
    textAlign: 'left' as const,
    marginBottom: '0.5rem',
  },
  label: {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--colour-text)',
    marginBottom: '0.375rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid var(--colour-border)',
    borderRadius: 'var(--radius)',
    backgroundColor: 'var(--colour-input-bg)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  privacyNote: {
    fontSize: '0.75rem',
    color: 'var(--colour-text-muted)',
    lineHeight: 1.4,
    marginBottom: '1rem',
    textAlign: 'left' as const,
  },
  regionPreview: {
    padding: '0.75rem 1rem',
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    borderRadius: 'var(--radius)',
    fontSize: '0.9375rem',
    marginBottom: '1.5rem',
  },
  error: {
    color: 'var(--colour-error)',
    fontSize: '0.8125rem',
    marginBottom: '1rem',
  },
  confirmButton: {
    width: '100%',
    padding: '0.875rem',
    backgroundColor: 'var(--colour-primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  skipButton: {
    marginTop: '1rem',
    background: 'none',
    border: 'none',
    color: 'var(--colour-text-muted)',
    fontSize: '0.8125rem',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '0.5rem',
  },

  /* ── Map picker ──────────────────────────────────────────────── */
  mapContainer: {
    position: 'relative' as const,
    width: '100%',
    height: '100vh',
  },
  mapConfirmPanel: {
    position: 'absolute' as const,
    bottom: '5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.5rem',
    zIndex: 30,
  },
  mapConfirmLabel: {
    backgroundColor: 'var(--colour-surface)',
    color: 'var(--colour-text)',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    fontWeight: 600,
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
  },
  mapConfirmButton: {
    padding: '0.75rem 2rem',
    backgroundColor: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
  },
  mapError: {
    position: 'absolute' as const,
    top: '1rem',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'var(--colour-error-bg)',
    color: 'var(--colour-error)',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius)',
    fontSize: '0.8125rem',
    zIndex: 30,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  mapBackButton: {
    position: 'absolute' as const,
    top: '1rem',
    left: '1rem',
    background: 'var(--colour-surface)',
    border: 'none',
    color: 'var(--colour-text)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    zIndex: 30,
  },
};
