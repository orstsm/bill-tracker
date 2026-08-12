import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getCurrentMonthStr, withTimeout } from '../lib/utils';

export default function WithdrawModal({ onClose, onWithdrawalAdded }) {
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
          success = true;
        } catch (e) {
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

      if (onWithdrawalAdded) onWithdrawalAdded();
      onClose();
    } catch (error) {
      console.error("Error adding withdrawal:", error);
      alert("Failed to log withdrawal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div className="animate-fade-up" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--card-bg)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', padding: '24px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Log Cash Withdrawal</h2>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '16px', fontWeight: '500' }}
          >
            Cancel
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="native-label">Amount</label>
            <input 
              type="number" 
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
            style={{ marginTop: '8px', background: 'var(--accent)', color: '#fff', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: '600', width: '100%', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Logging...' : 'Log Withdrawal'}
          </button>
        </form>
      </div>
    </div>
  );
}
