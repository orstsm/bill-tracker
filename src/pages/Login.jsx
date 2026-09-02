import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
    } catch (authError) {
      setError(authError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100dvh', padding: 'max(28px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom))', display: 'grid', placeItems: 'center', background: 'var(--system-bg)' }}>
      <section style={{ width: 'min(100%, 400px)' }}>
        <div style={{ width: 64, height: 64, display: 'grid', placeItems: 'center', margin: '0 auto 22px', borderRadius: 20, background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>
          <Wallet size={32} aria-hidden="true" />
        </div>
        <header style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{ margin: 0, fontSize: 32, letterSpacing: '-1px' }}>Bill Tracker</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            {isSignUp ? 'Create your private finance workspace.' : 'Your bills, balances, and cash flow in one place.'}
          </p>
        </header>

        <form className="surface" onSubmit={handleAuth} style={{ padding: 18 }}>
          {error && <div style={{ marginBottom: 16, padding: 12, borderRadius: 11, background: 'color-mix(in srgb, var(--danger) 11%, transparent)', color: 'var(--danger)', fontSize: 14 }}>{error}</div>}
          <div style={{ marginBottom: 15 }}>
            <label className="native-label" htmlFor="login-email">Email</label>
            <input id="login-email" className="native-input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label className="native-label" htmlFor="login-password">Password</label>
            <input id="login-password" className="native-input" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="••••••••" />
          </div>
          <button className="primary-button" type="submit" disabled={loading} style={{ opacity: loading ? 0.65 : 1 }}>
            {loading ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <button type="button" onClick={() => setIsSignUp(!isSignUp)} style={{ width: '100%', minHeight: 48, marginTop: 12, border: 0, background: 'transparent', color: 'var(--accent-strong)', fontSize: 14, fontWeight: 620 }}>
          {isSignUp ? 'Already have an account? Sign In' : 'New here? Create an account'}
        </button>
      </section>
    </main>
  );
}
