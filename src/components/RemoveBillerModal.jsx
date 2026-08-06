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
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-card animate-fade-up" style={{ width: '100%', maxWidth: '400px', padding: '24px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
        
        <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>Remove Biller</h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading...</div>
        ) : billers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No recurring billers found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            {billers.map(b => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>{b.biller}</span>
                <button 
                  onClick={() => handleRemove(b.id)}
                  disabled={removing}
                  style={{ background: 'var(--danger)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', opacity: removing ? 0.7 : 1 }}
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
