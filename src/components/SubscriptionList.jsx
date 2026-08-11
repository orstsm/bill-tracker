import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function SubscriptionList({ subscriptions, onIgnoreRenew, onCancelSub }) {
  const [expandedId, setExpandedId] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
        <p>No active subscriptions found.</p>
      </div>
    );
  }

  const handleAction = async (actionFn, sub) => {
    setProcessingId(sub.id);
    await actionFn(sub);
    setProcessingId(null);
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <>
      {/* Desktop View */}
      <div className="desktop-only" style={{ overflowX: 'auto', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border)', padding: '10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 'bold' }}>Name</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 'bold' }}>Amount</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 'bold' }}>Next Renewal Date</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 'bold' }}>Cycle</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 'bold' }}>Status</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 'bold' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map(sub => {
              const isRenewingSoon = new Date(sub.renewal_date).getTime() - new Date().getTime() <= 5 * 24 * 60 * 60 * 1000;
              const formattedDate = new Date(sub.renewal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const isProcessing = processingId === sub.id;

              return (
                <tr key={sub.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isRenewingSoon ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                  <td style={{ padding: '16px', fontWeight: 'bold', color: '#fff' }}>{sub.name}</td>
                  <td style={{ padding: '16px', color: 'var(--danger)' }}>{parseFloat(sub.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: '16px', color: isRenewingSoon ? 'var(--danger)' : 'var(--text-muted)' }}>{formattedDate}</td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{sub.cycle}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ color: sub.status === 'Active' ? 'var(--success)' : 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', background: sub.status === 'Active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '12px' }}>
                      {sub.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {sub.status === 'Active' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button disabled={isProcessing} onClick={() => handleAction(onIgnoreRenew, sub)} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', opacity: isProcessing ? 0.5 : 1 }}>Ignore / Renew</button>
                        <button disabled={isProcessing} onClick={() => handleAction(onCancelSub, sub)} style={{ background: 'var(--danger)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', opacity: isProcessing ? 0.5 : 1 }}>Cancel Sub</button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {subscriptions.map(sub => {
          const isRenewingSoon = new Date(sub.renewal_date).getTime() - new Date().getTime() <= 5 * 24 * 60 * 60 * 1000;
          const formattedDate = new Date(sub.renewal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const isExpanded = expandedId === sub.id;
          const isProcessing = processingId === sub.id;

          return (
            <div key={sub.id} className="glass-card" style={{ padding: '16px', paddingBottom: isExpanded ? '16px' : '16px', background: isRenewingSoon ? 'rgba(239, 68, 68, 0.05)' : 'var(--card-bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }} onClick={() => toggleExpand(sub.id)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>{sub.name}</span>
                  <span style={{ fontSize: '13px', color: isRenewingSoon ? 'var(--danger)' : 'var(--text-muted)' }}>
                    Renews: {formattedDate} ({sub.cycle})
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--danger)' }}>
                    {parseFloat(sub.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {isExpanded ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Status</span>
                    <span style={{ color: sub.status === 'Active' ? 'var(--success)' : 'var(--text-muted)', fontWeight: 'bold' }}>{sub.status}</span>
                  </div>
                  
                  {sub.status === 'Active' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                      <button disabled={isProcessing} onClick={() => handleAction(onIgnoreRenew, sub)} style={{ flex: 1, background: 'var(--primary)', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', opacity: isProcessing ? 0.5 : 1 }}>
                        Ignore / Renew
                      </button>
                      <button disabled={isProcessing} onClick={() => handleAction(onCancelSub, sub)} style={{ flex: 1, background: 'var(--danger)', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', opacity: isProcessing ? 0.5 : 1 }}>
                        Cancel Sub
                      </button>
                    </div>
                  )}
                  {isProcessing && <span style={{ display: 'block', marginTop: '8px', fontSize: '12px', color: '#3b82f6', fontWeight: 'bold', textAlign: 'center' }}>Processing...</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
