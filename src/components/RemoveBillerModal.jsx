import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function RemoveBillerModal({ onClose, onBillerRemoved }) {
  const { user } = useAuth();
  const [billers, setBillers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    fetchBillers();
  }, []);

  const fetchBillers = async () => {
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
  };

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div className="animate-fade-up" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--card-bg)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', padding: '24px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Remove Biller</h2>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '16px', fontWeight: '500' }}
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
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(118, 118, 128, 0.24)', borderRadius: '12px' }}>
                <span style={{ fontWeight: '600', fontSize: '15px' }}>{b.biller}</span>
                <button 
                  onClick={() => handleRemove(b.id)}
                  disabled={removing}
                  style={{ background: 'var(--danger)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: removing ? 0.7 : 1 }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
