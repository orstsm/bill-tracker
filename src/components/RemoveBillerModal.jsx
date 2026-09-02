import { useCallback, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/auth';
import BillerLogo from './BillerLogo';

export default function RemoveBillerModal({ onClose, onBillerRemoved }) {
  const { user } = useAuth();
  const [billers, setBillers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);

  const fetchBillers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('recurring_bills')
        .select('*')
        .eq('user_id', user.id)
        .order('biller', { ascending: true });
      setBillers(data || []);
    } catch (error) {
      console.error("Error fetching billers:", error);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchBillers();
  }, [fetchBillers]);

  const handleRemove = async (id) => {
    if (!confirm("Are you sure you want to remove this biller?")) return;
    setRemoving(true);
    try {
      const { error } = await supabase.from('recurring_bills').delete().eq('id', id);
      if (error) throw error;
      setBillers(billers.filter(b => b.id !== id));
      if (onBillerRemoved) onBillerRemoved();
    } catch (error) {
      console.error("Error removing:", error);
      alert("Failed to remove biller");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="sheet-backdrop">
      <section className="ios-sheet" role="dialog" aria-modal="true" aria-labelledby="remove-biller-title" data-no-swipe>
        <div className="sheet-grabber" />
        <div className="sheet-header">
          <h2 id="remove-biller-title">Manage Billers</h2>
          <button 
            onClick={onClose}
            className="sheet-cancel"
          >
            Cancel
          </button>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading...</div>
        ) : billers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No recurring billers found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            {billers.map(b => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--input-bg)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <BillerLogo biller={b.biller} size={28} />
                  <span style={{ fontWeight: '600', fontSize: '15px' }}>{b.biller}</span>
                </div>
                <button 
                  onClick={() => handleRemove(b.id)}
                  disabled={removing}
                  className="action-button danger"
                  style={{ opacity: removing ? 0.7 : 1 }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
