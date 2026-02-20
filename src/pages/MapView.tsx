/**
 * MapView — placeholder for the interactive map (Phase 1.4).
 *
 * For now this is a simple screen confirming the user is on the Map tab.
 * The real MapLibre GL JS integration comes in Phase 1.4.
 */
export function MapView() {
  return (
    <div style={styles.container}>
      <div style={styles.placeholder}>
        {/* Map outline icon */}
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--colour-text-muted)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.5 }}
        >
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
        <h2 style={styles.title}>Interactive Map</h2>
        <p style={styles.subtitle}>
          The map of UK regions is coming in Phase 1.4.
          You'll be able to tap regions, find your area, and join
          your local Telegram group.
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
    minHeight: '100%',
    padding: '2rem 1rem',
  },
  placeholder: {
    textAlign: 'center',
    maxWidth: 320,
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    marginTop: '1rem',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: 'var(--colour-text-muted)',
    fontSize: '0.875rem',
    lineHeight: 1.6,
  },
};
