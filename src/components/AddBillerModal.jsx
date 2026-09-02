import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/auth';

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
    <div className="sheet-backdrop">
      <section className="ios-sheet" role="dialog" aria-modal="true" aria-labelledby="add-biller-title" data-no-swipe>
        <div className="sheet-grabber" />
        <div className="sheet-header">
          <h2 id="add-biller-title">Add Biller</h2>
          <button 
            onClick={onClose}
            className="sheet-cancel"
          >
            Cancel
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="sheet-body">
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
            className="primary-button"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Adding...' : 'Add Biller'}
          </button>
        </form>
      </section>
    </div>
  );
}
