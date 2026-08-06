import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getCurrentMonthStr } from '../lib/utils';

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

      if (navigator.onLine) {
        const { error } = await supabase.from('withdrawals').insert(payload);
        if (error) throw error;
      } else {
        const queue = JSON.parse(localStorage.getItem('offline_withdrawals') || '[]');
        queue.push(payload);
        localStorage.setItem('offline_withdrawals', JSON.stringify(queue));
        
        const cache = JSON.parse(localStorage.getItem('offline_dashboard_data') || '{}');
        if (cache.wData) {
          cache.wData.push(payload);
          localStorage.setItem('offline_dashboard_data', JSON.stringify(cache));
        }
        alert("You are offline. Withdrawal saved locally and will sync when you reconnect.");
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
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-card animate-fade-up" style={{ width: '100%', maxWidth: '400px', padding: '24px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
        
        <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>Log Cash Withdrawal</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Amount</label>
            <input 
              type="number" 
              required 
              value={amount} 
              onChange={e => setAmount(e.target.value)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '8px', color: '#fff', fontSize: '16px' }}
              placeholder="e.g. 5000"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Reason (Channel)</label>
            <input 
              type="text" 
              required 
              value={reason} 
              onChange={e => setReason(e.target.value)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '8px', color: '#fff', fontSize: '16px' }}
              placeholder="e.g. Allowance, Budget"
            />
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button type="submit" disabled={loading} style={{ flex: 1, background: 'var(--accent)', color: '#0f172a', fontWeight: 'bold', padding: '12px', borderRadius: '10px', border: 'none', opacity: loading ? 0.7 : 1, cursor: 'pointer' }}>
              {loading ? 'Saving...' : 'Log Withdrawal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
