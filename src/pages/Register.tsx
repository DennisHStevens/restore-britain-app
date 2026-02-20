import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Registration page — collects invite code, email, password, display name,
 * and optional X handle. Sends everything to the atomic `register` Edge
 * Function in a single request (see DEC-014).
 */
export function Register() {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [xHandle, setXHandle] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    if (!displayName.trim()) {
      setError('Display name is required.');
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
            display_name: displayName.trim(),
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
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter your invite code"
              style={styles.input}
              autoComplete="off"
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
            Display Name *
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How you'll appear to other members"
              style={styles.input}
              autoComplete="name"
              disabled={submitting}
            />
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
  },
  title: {
    fontSize: '1.5rem',
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
    fontSize: '0.875rem',
    backgroundColor: 'var(--colour-input-bg)',
    outline: 'none',
  },
  button: {
    padding: '0.75rem',
    backgroundColor: 'var(--colour-primary)',
    color: '#fff',
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
