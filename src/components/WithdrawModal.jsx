import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/auth';
import { getCurrentMonthStr, withTimeout } from '../lib/utils';

export default function WithdrawModal({ onClose, onWithdraw, isEarlyRollover }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const currentMonth = getCurrentMonthStr();
      const numAmount = parseFloat(amount.replace(/,/g, ''));
      if (isNaN(numAmount) || numAmount <= 0) {
        alert("Please enter a valid amount.");
        setLoading(false);
        return;
      }

      const payload = {
        month: currentMonth,
        amount: numAmount,
        reason: reason || 'Cash',
        date: new Date().toISOString(),
        user_id: user.id
      };

      let success = false;
      if (navigator.onLine) {
        try {
          const { error } = await withTimeout(supabase.from('withdrawals').insert(payload), 4000);
          if (error) throw error;
          
          if (isEarlyRollover) {
            // Because we already snapshotted the funds for the new month, 
            // a withdrawal tagged for the old calendar month must be manually deducted from the snapshot.
            const { data: sData } = await supabase.from('settings').select('savings_account_balance').eq('user_id', user.id).single();
            if (sData) {
              await supabase.from('settings').update({ savings_account_balance: sData.savings_account_balance - numAmount }).eq('user_id', user.id);
            }
          }
          
          success = true;
        } catch {
          console.warn("Live withdrawal log failed or timed out, falling back to offline queue");
        }
      }
      
      if (!success) {
        const queue = JSON.parse(localStorage.getItem('offline_withdrawals') || '[]');
        queue.push(payload);
        localStorage.setItem('offline_withdrawals', JSON.stringify(queue));
        
        const cache = JSON.parse(localStorage.getItem('offline_dashboard_data') || '{}');
        if (cache.wData) {
          cache.wData.push(payload);
          localStorage.setItem('offline_dashboard_data', JSON.stringify(cache));
        }
        alert("Network unreachable. Withdrawal saved locally and will sync later.");
      }

      if (onWithdraw) onWithdraw();
      onClose();
    } catch (error) {
      console.error("Error adding withdrawal:", error);
      alert("Failed to log withdrawal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sheet-backdrop">
      <section className="ios-sheet" role="dialog" aria-modal="true" aria-labelledby="withdraw-title" data-no-swipe>
        <div className="sheet-grabber" />
        <div className="sheet-header">
          <h2 id="withdraw-title">Cash Withdrawal</h2>
          <button 
            onClick={onClose}
            className="sheet-cancel"
          >
            Cancel
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="sheet-body">
          <div>
            <label className="native-label">Amount</label>
            <input 
              type="number" 
              inputMode="decimal"
              required 
              className="native-input"
              value={amount} 
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 5000"
            />
          </div>
          <div>
            <label className="native-label">Purpose</label>
            <input 
              type="text" 
              required 
              className="native-input"
              value={reason} 
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Allowance, Budget"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="primary-button"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Logging...' : 'Log Withdrawal'}
          </button>
        </form>
      </section>
    </div>
  );
}
