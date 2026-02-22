import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Login page — accepts email OR username plus password.
 *
 * Since Supabase Auth requires an email for signInWithPassword,
 * we detect whether the input looks like an email (contains @)
 * or a username. For usernames, we call the resolve_username_to_email
 * RPC function (SECURITY DEFINER, bypasses RLS) to get the email,
 * then sign in with that.
 */
export function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const trimmed = identifier.trim();
    if (!trimmed || !password) {
      setError('Email/username and password are required.');
      return;
    }

    setSubmitting(true);

    let email: string;

    if (trimmed.includes('@')) {
      // Input looks like an email — use directly
      email = trimmed.toLowerCase();
    } else {
      // Input is a username — resolve to email via RPC
      const { data, error: rpcError } = await supabase.rpc(
        'resolve_username_to_email',
        { lookup_username: trimmed }
      );

      if (rpcError || !data) {
        // Generic error — don't reveal whether the username exists
        setError('Invalid username or password.');
        setSubmitting(false);
        return;
      }

      email = data as string;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Generic error — don't reveal whether the email/username exists
      setError('Invalid credentials.');
      setSubmitting(false);
      return;
    }

    navigate('/', { replace: true });
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Restore Britain</h1>
        <p style={styles.subtitle}>
          Sign in to your account.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <label style={styles.label}>
            Email or Username
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or your_username"
              style={styles.input}
              autoComplete="username"
              disabled={submitting}
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              style={styles.input}
              autoComplete="current-password"
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
            {submitting ? 'Signing in...' : 'Log In'}
          </button>
        </form>

        <p style={styles.footer}>
          Have an invite code? <Link to="/register">Register</Link>
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
    /* Must be >= 16px (1rem) to prevent iOS Safari auto-zoom on focus */
    fontSize: '1rem',
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
