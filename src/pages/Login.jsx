import { useState } from 'react';
import { KeyRound, Mail, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState(null);

  const handleSignIn = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;
    } catch (authError) {
      setError(authError.message || 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (event) => {
    event.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      setResetSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100dvh', padding: 'max(28px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom))', display: 'grid', placeItems: 'center', background: 'var(--system-bg)' }}>
      <section style={{ width: 'min(100%, 400px)' }}>
        <div style={{ width: 64, height: 64, display: 'grid', placeItems: 'center', margin: '0 auto 22px', borderRadius: 20, background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>
          {isResetMode ? <KeyRound size={32} aria-hidden="true" /> : <Wallet size={32} aria-hidden="true" />}
        </div>

        <header style={{ textAlign: 'center', marginBottom: 26 }}>
          <h1 style={{ margin: 0, fontSize: 30, letterSpacing: '-0.8px' }}>
            {isResetMode ? 'Reset Password' : 'Bill Tracker'}
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', lineHeight: 1.45, fontSize: 14 }}>
            {isResetMode
              ? 'Enter your email to receive a secure recovery link.'
              : 'Your bills, balances, and cash flow in one place.'}
          </p>
        </header>

        {isResetMode ? (
          <form className="surface" onSubmit={handlePasswordReset} style={{ padding: 18 }}>
            {error && (
              <div style={{ marginBottom: 16, padding: 12, borderRadius: 11, background: 'color-mix(in srgb, var(--danger) 11%, transparent)', color: 'var(--danger)', fontSize: 13 }}>
                {error}
              </div>
            )}

            {resetSent ? (
              <div style={{ padding: '16px 8px', textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, margin: '0 auto 12px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>
                  <Mail size={22} />
                </div>
                <strong style={{ display: 'block', fontSize: 16, marginBottom: 6 }}>Recovery link sent!</strong>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.45 }}>
                  Check your inbox at <b>{email}</b> for instructions to reset your password.
                </p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 18 }}>
                  <label className="native-label" htmlFor="reset-email">Your Account Email</label>
                  <input
                    id="reset-email"
                    className="native-input"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="you@example.com"
                    autoFocus
                  />
                </div>
                <button className="primary-button" type="submit" disabled={loading} style={{ opacity: loading ? 0.65 : 1 }}>
                  {loading ? 'Sending link…' : 'Send Recovery Link'}
                </button>
              </>
            )}
          </form>
        ) : (
          <form className="surface" onSubmit={handleSignIn} style={{ padding: 18 }}>
            {error && (
              <div style={{ marginBottom: 16, padding: 12, borderRadius: 11, background: 'color-mix(in srgb, var(--danger) 11%, transparent)', color: 'var(--danger)', fontSize: 13 }}>
                {error}
              </div>
            )}
            <div style={{ marginBottom: 15 }}>
              <label className="native-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                className="native-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label className="native-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                className="native-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <button className="primary-button" type="submit" disabled={loading} style={{ opacity: loading ? 0.65 : 1 }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => {
            setIsResetMode(!isResetMode);
            setError(null);
            setResetSent(false);
          }}
          style={{ width: '100%', minHeight: 48, marginTop: 12, border: 0, background: 'transparent', color: 'var(--accent-strong)', fontSize: 14, fontWeight: 620 }}
        >
          {isResetMode ? '‹ Back to Sign In' : 'Forgot your password?'}
        </button>
      </section>
    </main>
  );
}

