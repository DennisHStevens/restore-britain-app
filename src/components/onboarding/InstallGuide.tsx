import { useState, useEffect } from 'react';

/**
 * InstallGuide — PWA "Add to Home Screen" tutorial shown during onboarding.
 *
 * Detects the user's platform and shows device-specific instructions:
 * - iOS Safari: visual step-by-step (Share → Add to Home Screen → Add)
 * - Android Chrome: native install prompt via beforeinstallprompt API,
 *   with manual step fallback if the event doesn't fire
 * - Desktop: brief message, since this is primarily a mobile app
 *
 * This component only appears once per user because Onboarding.tsx only
 * renders when profile.region_id is null. Once a region is set, the user
 * navigates away and never returns here.
 */

/* ── Types ──────────────────────────────────────────────────────── */

type Platform = 'ios' | 'android' | 'desktop';

/**
 * Chrome's non-standard event for capturing the install prompt.
 * Not in the default TypeScript DOM types, so we declare it here.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Props {
  onContinue: () => void;
}

/* ── Platform detection ─────────────────────────────────────────── */

/**
 * Why user-agent sniffing? The beforeinstallprompt API is Chrome-only,
 * and iOS Safari has no install API at all — the only way to detect
 * iOS is the user agent. We keep the detection simple: if it looks
 * like an iPhone/iPad, it's iOS. If it has "android", it's Android.
 * Everything else is desktop (where install instructions are less relevant).
 */
function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

/* ── Component ──────────────────────────────────────────────────── */

export function InstallGuide({ onContinue }: Props) {
  const [platform] = useState<Platform>(() => detectPlatform());
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  /**
   * Listen for the beforeinstallprompt event (Android Chrome only).
   * We call preventDefault() to stop the browser's default mini-infobar
   * so we can show our own UI instead. The event is stored in state so
   * the user can trigger it by tapping our "Install" button.
   */
  useEffect(() => {
    function handlePrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  /** Trigger the native Chrome install prompt, then advance to region selection. */
  async function handleAndroidInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    /* Whether they accepted or dismissed, move on to region selection. */
    if (outcome === 'accepted' || outcome === 'dismissed') {
      onContinue();
    }
  }

  /* ── iOS instructions ──────────────────────────────────────────── */

  if (platform === 'ios') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Install Restore Britain</h1>
          <p style={styles.subtitle}>
            Add this app to your home screen for quick, one-tap access —
            just like a native app.
          </p>

          <div style={styles.steps}>
            <div style={styles.step}>
              <div style={styles.stepNumber}>1</div>
              <div style={styles.stepContent}>
                <p style={styles.stepLabel}>
                  Tap the <strong>Share</strong> button
                </p>
                <p style={styles.stepDetail}>
                  The square icon with an upward arrow, at the bottom of Safari
                </p>
              </div>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>2</div>
              <div style={styles.stepContent}>
                <p style={styles.stepLabel}>
                  Tap <strong>"Add to Home Screen"</strong>
                </p>
                <p style={styles.stepDetail}>
                  Scroll down in the share menu until you see it
                </p>
              </div>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>3</div>
              <div style={styles.stepContent}>
                <p style={styles.stepLabel}>
                  Tap <strong>"Add"</strong>
                </p>
                <p style={styles.stepDetail}>
                  The app icon will appear on your home screen
                </p>
              </div>
            </div>
          </div>

          <button onClick={onContinue} style={styles.continueButton}>
            Continue
          </button>

          <button onClick={onContinue} style={styles.skipButton}>
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  /* ── Android instructions ──────────────────────────────────────── */

  if (platform === 'android') {
    /**
     * If the beforeinstallprompt event fired, we can offer a one-tap
     * install. If it didn't (e.g. browser doesn't support it, or the
     * app is already installed), show manual steps as a fallback.
     */
    if (deferredPrompt) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <h1 style={styles.title}>Install Restore Britain</h1>
            <p style={styles.subtitle}>
              Add this app to your home screen for quick, one-tap access.
            </p>

            <button onClick={handleAndroidInstall} style={styles.installButton}>
              Install App
            </button>

            <button onClick={onContinue} style={styles.skipButton}>
              Skip for now
            </button>
          </div>
        </div>
      );
    }

    /* Fallback: manual steps for Android browsers without beforeinstallprompt */
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Install Restore Britain</h1>
          <p style={styles.subtitle}>
            Add this app to your home screen for quick, one-tap access.
          </p>

          <div style={styles.steps}>
            <div style={styles.step}>
              <div style={styles.stepNumber}>1</div>
              <div style={styles.stepContent}>
                <p style={styles.stepLabel}>
                  Tap the <strong>menu</strong> button
                </p>
                <p style={styles.stepDetail}>
                  The three dots in the top-right of Chrome
                </p>
              </div>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>2</div>
              <div style={styles.stepContent}>
                <p style={styles.stepLabel}>
                  Tap <strong>"Install app"</strong>
                </p>
                <p style={styles.stepDetail}>
                  Or "Add to Home Screen" depending on your browser
                </p>
              </div>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>3</div>
              <div style={styles.stepContent}>
                <p style={styles.stepLabel}>
                  Tap <strong>"Install"</strong>
                </p>
                <p style={styles.stepDetail}>
                  The app icon will appear on your home screen
                </p>
              </div>
            </div>
          </div>

          <button onClick={onContinue} style={styles.continueButton}>
            Continue
          </button>

          <button onClick={onContinue} style={styles.skipButton}>
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  /* ── Desktop fallback ──────────────────────────────────────────── */

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Restore Britain</h1>
        <p style={styles.subtitle}>
          This app works best on mobile. You can install it as a desktop
          app from your browser's menu, or continue in the browser.
        </p>

        <button onClick={onContinue} style={styles.continueButton}>
          Continue
        </button>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────── */

/**
 * Matches the existing Onboarding.tsx inline styles pattern:
 * centred card, consistent typography, same button styles.
 */
const styles: Record<string, React.CSSProperties> = {
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

  /* ── Step list ─────────────────────────────────────────── */
  steps: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.25rem',
    marginBottom: '2rem',
    textAlign: 'left' as const,
  },
  step: {
    display: 'flex',
    gap: '0.875rem',
    alignItems: 'flex-start',
  },
  stepNumber: {
    flexShrink: 0,
    width: '2rem',
    height: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--colour-primary)',
    color: '#ffffff',
    borderRadius: '50%',
    fontSize: '0.875rem',
    fontWeight: 700,
  },
  stepContent: {
    flex: 1,
    paddingTop: '0.125rem',
  },
  stepLabel: {
    fontSize: '0.9375rem',
    color: 'var(--colour-text)',
    lineHeight: 1.4,
    margin: 0,
  },
  stepDetail: {
    fontSize: '0.8125rem',
    color: 'var(--colour-text-muted)',
    lineHeight: 1.4,
    marginTop: '0.25rem',
    margin: 0,
  },

  /* ── Buttons ───────────────────────────────────────────── */
  continueButton: {
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
  installButton: {
    width: '100%',
    padding: '0.875rem',
    backgroundColor: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '0.5rem',
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
};
