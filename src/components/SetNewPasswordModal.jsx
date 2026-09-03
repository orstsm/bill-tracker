import { useState } from 'react';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SetNewPasswordModal({ onClose }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
    onClose();
  };

  return (
    <div className="sheet-backdrop" style={{ zIndex: 10001 }}>
      <section
        className="ios-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-password-title"
        data-no-swipe
        style={{ width: 'min(100%, 420px)', margin: 'auto' }}
      >
        <div className="sheet-grabber" />
        <div className="sheet-header">
          <h2 id="new-password-title" style={{ fontSize: 20 }}>Set New Password</h2>
          <button className="sheet-cancel" type="button" onClick={handleDismiss}>
            Close
          </button>
        </div>

        {success ? (
          <div style={{ padding: '24px 16px 16px', textAlign: 'center' }}>
            <div style={{ width: 50, height: 50, margin: '0 auto 14px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'color-mix(in srgb, var(--positive) 14%, transparent)', color: 'var(--positive)' }}>
              <CheckCircle2 size={30} />
            </div>
            <strong style={{ display: 'block', fontSize: 17, marginBottom: 6 }}>Password Updated!</strong>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
              Your new password has been saved securely.
            </p>
          </div>
        ) : (
          <form className="sheet-body" onSubmit={handleSubmit}>
            <p style={{ margin: '0 0 4px', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.45 }}>
              Choose a strong password for your private Bill Tracker account.
            </p>

            {error && (
              <div style={{ padding: 12, borderRadius: 11, background: 'color-mix(in srgb, var(--danger) 11%, transparent)', color: 'var(--danger)', fontSize: 13 }}>
                {error}
              </div>
            )}

            <div>
              <label className="native-label" htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                className="native-input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="At least 6 characters"
                autoFocus
              />
            </div>

            <div>
              <label className="native-label" htmlFor="confirm-new-password">Confirm New Password</label>
              <input
                id="confirm-new-password"
                className="native-input"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-type new password"
              />
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={loading}
              style={{ marginTop: 8, opacity: loading ? 0.65 : 1 }}
            >
              <KeyRound size={17} style={{ marginRight: 6 }} />
              {loading ? 'Saving new password…' : 'Update Password'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
