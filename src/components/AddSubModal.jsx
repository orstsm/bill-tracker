import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { withTimeout } from '../lib/utils';

export default function AddSubModal({ onClose, onSubAdded }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [renewalDate, setRenewalDate] = useState('');
  const [cycle, setCycle] = useState('Monthly');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const numAmount = parseFloat(amount.replace(/,/g, '')) || 0;
      
      const payload = {
        name,
        amount: numAmount,
        renewal_date: new Date(renewalDate).toISOString(),
        cycle,
        status: 'Active',
        user_id: user.id
      };

      if (navigator.onLine) {
        const { error } = await withTimeout(supabase.from('subscriptions').insert(payload), 4000);
        if (error) throw error;
      } else {
        alert("You must be online to add a subscription.");
        setLoading(false);
        return;
      }

      if (onSubAdded) onSubAdded();
      onClose();
    } catch (error) {
      console.error("Error adding subscription:", error);
      alert("Failed to add subscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
      <div className="glass-card animate-fade-up" style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
        
        <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '20px' }}>Add Subscription</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>Subscription Name</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Gemini, Netflix" className="form-input" />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>Amount</label>
            <input required type="text" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1000.00" className="form-input" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>Next Renewal Date</label>
            <input required type="date" value={renewalDate} onChange={e => setRenewalDate(e.target.value)} className="form-input" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>Billing Cycle</label>
            <select value={cycle} onChange={e => setCycle(e.target.value)} className="form-input">
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
          
          <button type="submit" disabled={loading} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px' }}>
            {loading ? 'Adding...' : 'Add Subscription'}
          </button>
        </form>
      </div>
    </div>
  );
}
