import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/auth';
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
    <div className="sheet-backdrop">
      <section className="ios-sheet" role="dialog" aria-modal="true" aria-labelledby="add-sub-title" data-no-swipe>
        <div className="sheet-grabber" />
        <div className="sheet-header">
          <h2 id="add-sub-title">Add Subscription</h2>
          <button 
            onClick={onClose}
            className="sheet-cancel"
          >
            Cancel
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="sheet-body">
          <div>
            <label className="native-label">Subscription Name</label>
            <input required type="text" className="native-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Gemini, Netflix" />
          </div>
          
          <div>
            <label className="native-label">Amount</label>
            <input required type="text" inputMode="decimal" className="native-input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1000.00" />
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
          
          <button type="submit" className="primary-button" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Adding...' : 'Add Subscription'}
          </button>
        </form>
      </section>
    </div>
  );
}
