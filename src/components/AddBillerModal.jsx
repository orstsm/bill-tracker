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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div className="animate-fade-up" style={{ width: '100%', maxWidth: '500px', background: 'var(--card-bg)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', padding: '24px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Add New Biller</h2>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '16px', fontWeight: '500' }}
          >
            Cancel
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="native-label">Biller Name</label>
            <input 
              required
              className="native-input"
              placeholder="e.g., Meralco, BPI"
              value={biller}
              onChange={e => setBiller(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="native-label">Statement Date</label>
              <input 
                className="native-input"
                placeholder="e.g. 15th"
                value={statementDate}
                onChange={e => setStatementDate(e.target.value)}
              />
            </div>
            <div>
              <label className="native-label">Due Date</label>
              <input 
                className="native-input"
                placeholder="e.g. 5th of Next Mo"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="native-label">Channel</label>
            <input 
              className="native-input"
              placeholder="e.g., GCash, Maya"
              value={channel}
              onChange={e => setChannel(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ marginTop: '8px', background: 'var(--accent)', color: '#fff', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: '600', width: '100%', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Adding...' : 'Add Biller'}
          </button>
        </form>
      </div>
    </div>
  );
}
