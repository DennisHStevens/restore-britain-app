import { useState, type FormEvent } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Registration page — collects invite code, email, password, username,
 * and optional X handle. Sends everything to the atomic `register` Edge
 * Function in a single request (see DEC-014).
 *
 * The invite code can be pre-filled via a `?code=XXXX` query parameter.
 * This is used when admins share direct registration links from the
 * admin panel.
 *
 * Username rules: 3-20 characters, alphanumeric + underscores only.
 * Uniqueness is case-insensitive (enforced by DB index).
 */
export function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-fill invite code from URL ?code= parameter (admin-shared links)
  const [inviteCode, setInviteCode] = useState(
    () => searchParams.get('code')?.toUpperCase() || ''
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [xHandle, setXHandle] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** Username validation: 3-20 chars, alphanumeric + underscores */
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!inviteCode.trim()) {
      setError('Invite code is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    if (!usernameRegex.test(username.trim())) {
      setError('Username must be 3-20 characters, letters, numbers, and underscores only.');
      return;
    }

    setSubmitting(true);

    try {
      // Call the atomic register Edge Function
      const { data, error: fnError } = await supabase.functions.invoke(
        'register',
        {
          body: {
            invite_code: inviteCode.trim(),
            email: email.trim().toLowerCase(),
            password,
            username: username.trim(),
            x_handle: xHandle.trim() || null,
          },
        }
      );

      if (fnError) {
        // Network-level or CORS error
        setError('Registration failed. Please try again.');
        setSubmitting(false);
        return;
      }

      if (data?.error) {
        // Application-level error from the Edge Function
        // Generic message — no info leakage about which field failed
        setError(data.error);
        setSubmitting(false);
        return;
      }

      // Registration succeeded — sign in with the new credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError('Account created but sign-in failed. Try logging in.');
        setSubmitting(false);
        return;
      }

      // Signed in — navigate to the main app
      navigate('/', { replace: true });
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src="/icons/rb-logo-40.png" alt="" style={styles.logo} />
        <h1 style={styles.title}>Join Restore Britain</h1>
        <p style={styles.subtitle}>
          Enter your invite code to create an account.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <label style={styles.label}>
            Invite Code *
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="8-character code (e.g. K7X2M4NP)"
              style={{ ...styles.input, fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}
              autoComplete="off"
              maxLength={8}
              disabled={submitting}
            />
          </label>

          <label style={styles.label}>
            Email *
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={styles.input}
              autoComplete="email"
              disabled={submitting}
            />
          </label>

          <label style={styles.label}>
            Password *
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 12 characters"
              style={styles.input}
              autoComplete="new-password"
              disabled={submitting}
            />
          </label>

          <label style={styles.label}>
            Username *
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3-20 chars, letters, numbers, underscores"
              style={styles.input}
              autoComplete="username"
              disabled={submitting}
            />
            {username.trim() && (
              <span style={{
                fontSize: '0.75rem',
                color: usernameRegex.test(username.trim())
                  ? 'var(--colour-text-muted)'
                  : 'var(--colour-error)',
              }}>
                @{username.trim()}
              </span>
            )}
          </label>

          <label style={styles.label}>
            X Handle (optional)
            <input
              type="text"
              value={xHandle}
              onChange={(e) => setXHandle(e.target.value)}
              placeholder="@yourhandle"
              style={styles.input}
              autoComplete="off"
              disabled={submitting}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...styles.button,
              opacity: submitting ? 0.6 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}

// Inline styles — will be replaced with proper CSS/brand in Phase 1.8.
// Using objects here to keep the component self-contained for MVP.
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '1rem',
  },
  card: {
    width: '100%',
    maxWidth: 'var(--max-width)',
    backgroundColor: 'var(--colour-surface)',
    borderRadius: 'var(--radius)',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'center' as const,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginBottom: '1rem',
    objectFit: 'contain' as const,
  },
  title: {
    fontSize: '1.5rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: 700,
    marginBottom: '0.25rem',
  },
  subtitle: {
    color: 'var(--colour-text-muted)',
    fontSize: '0.875rem',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  label: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  input: {
    padding: '0.625rem 0.75rem',
    border: '1px solid var(--colour-border)',
    borderRadius: 'var(--radius)',
    /* Must be >= 16px (1rem) to prevent iOS Safari auto-zoom on focus */
    fontSize: '1rem',
    backgroundColor: 'var(--colour-input-bg)',
    outline: 'none',
  },
  button: {
    padding: '0.75rem',
    backgroundColor: 'var(--colour-primary)',
    color: 'var(--colour-text-inverse)',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 600,
    marginTop: '0.5rem',
  },
  error: {
    backgroundColor: 'var(--colour-error-bg)',
    color: 'var(--colour-error)',
    padding: '0.75rem',
    borderRadius: 'var(--radius)',
    fontSize: '0.8125rem',
  },
  footer: {
    textAlign: 'center' as const,
    marginTop: '1.5rem',
    fontSize: '0.8125rem',
    color: 'var(--colour-text-muted)',
  },
};
