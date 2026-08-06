import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function AddBillerModal({ onClose, onBillerAdded }) {
  const { user } = useAuth();
  const [biller, setBiller] = useState('');
  const [statementDate, setStatementDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [channel, setChannel] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Add to recurring_bills
      const { error: rbError } = await supabase.from('recurring_bills').insert({
        biller,
        statement_date: statementDate,
        due_date: dueDate,
        channel,
        user_id: user.id
      });
      if (rbError) throw rbError;

      // Add instance to bills for current month
      const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      const { error: bError } = await supabase.from('bills').insert({
        biller,
        month: currentMonth,
        statement_date: statementDate,
        due_date: dueDate,
        channel,
        amount: 0,
        status: 'Unpaid',
        user_id: user.id
      });
      if (bError) throw bError;

      if (onBillerAdded) onBillerAdded();
      onClose();
    } catch (error) {
      console.error("Error adding biller:", error);
      alert("Failed to add biller");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div className="glass-card animate-fade-up" style={{ width: '100%', maxWidth: '500px', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
        >
          <X size={24} />
        </button>
        
        <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: 'bold' }}>Add New Biller</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Biller Name (e.g., Meralco, BPI)</label>
            <input 
              required
              value={biller}
              onChange={e => setBiller(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Statement Date</label>
              <input 
                placeholder="e.g. 15th"
                value={statementDate}
                onChange={e => setStatementDate(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Due Date</label>
              <input 
                placeholder="e.g. 5th of Next Mo"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Channel (e.g., GCash, Maya, SecBank CC)</label>
            <input 
              value={channel}
              onChange={e => setChannel(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button type="submit" disabled={loading} style={{ flex: 1, background: 'var(--accent)', color: '#0f172a', fontWeight: 'bold', padding: '12px', borderRadius: '10px', border: 'none', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Saving...' : 'Save Biller'}
            </button>
            <button type="button" onClick={onClose} disabled={loading} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)', fontWeight: 'bold', padding: '12px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
