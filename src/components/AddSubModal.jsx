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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div className="animate-fade-up" style={{ width: '100%', maxWidth: '500px', background: 'var(--card-bg)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', padding: '24px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Add Subscription</h2>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '16px', fontWeight: '500' }}
          >
            Cancel
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="native-label">Subscription Name</label>
            <input required type="text" className="native-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Gemini, Netflix" />
          </div>
          
          <div>
            <label className="native-label">Amount</label>
            <input required type="text" className="native-input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1000.00" />
          </div>

          <div>
            <label className="native-label">Next Renewal Date</label>
            <input required type="date" className="native-input" value={renewalDate} onChange={e => setRenewalDate(e.target.value)} />
          </div>

          <div>
            <label className="native-label">Billing Cycle</label>
            <select className="native-input" value={cycle} onChange={e => setCycle(e.target.value)}>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
          
          <button type="submit" disabled={loading} style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: '600', width: '100%', opacity: loading ? 0.7 : 1, marginTop: '8px' }}>
            {loading ? 'Adding...' : 'Add Subscription'}
          </button>
        </form>
      </div>
    </div>
  );
}
