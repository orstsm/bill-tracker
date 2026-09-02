import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SubscriptionLogo from './SubscriptionLogo';

const money = (value) => `₱${Number(value || 0).toLocaleString('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

export default function SubscriptionList({ subscriptions, onIgnoreRenew, onCancelSub }) {
  const [expandedId, setExpandedId] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  if (!subscriptions?.length) {
    return (
      <div className="empty-state">
        <strong>No subscriptions</strong>
        <span>Add a service to track its next renewal.</span>
      </div>
    );
  }

  const handleAction = async (action, subscription) => {
    setProcessingId(subscription.id);
    await action(subscription);
    setProcessingId(null);
  };

  return (
    <div>
      <div className="desktop-only" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680, textAlign: 'left' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              <th style={{ padding: 16 }}>Name</th>
              <th style={{ padding: 16 }}>Amount</th>
              <th style={{ padding: 16 }}>Renewal</th>
              <th style={{ padding: 16 }}>Cycle</th>
              <th style={{ padding: 16 }}>Status</th>
              <th style={{ padding: 16 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((subscription) => {
              const soon = new Date(subscription.renewal_date).getTime() - Date.now() <= 5 * 24 * 60 * 60 * 1000;
              const processing = processingId === subscription.id;
              return (
                <tr key={subscription.id} style={{ borderTop: '1px solid var(--separator)' }}>
                  <td style={{ padding: 16, fontWeight: 650 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <SubscriptionLogo subscription={subscription.name} size={34} />
                      {subscription.name}
                    </span>
                  </td>
                  <td style={{ padding: 16 }}>{money(subscription.amount)}</td>
                  <td style={{ padding: 16, color: soon ? 'var(--warning)' : 'var(--text-muted)' }}>{new Date(subscription.renewal_date).toLocaleDateString()}</td>
                  <td style={{ padding: 16, color: 'var(--text-muted)' }}>{subscription.cycle}</td>
                  <td style={{ padding: 16, color: subscription.status === 'Active' ? 'var(--success)' : 'var(--text-muted)' }}>{subscription.status}</td>
                  <td style={{ padding: 16 }}>
                    {subscription.status === 'Active' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="action-button secondary" type="button" disabled={processing} onClick={() => handleAction(onIgnoreRenew, subscription)}>Renew</button>
                        <button className="action-button danger" type="button" disabled={processing} onClick={() => handleAction(onCancelSub, subscription)}>Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mobile-only">
        {subscriptions.map((subscription) => {
          const soon = new Date(subscription.renewal_date).getTime() - Date.now() <= 5 * 24 * 60 * 60 * 1000;
          const expanded = expandedId === subscription.id;
          const processing = processingId === subscription.id;
          const formattedDate = new Date(subscription.renewal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return (
            <div key={subscription.id} style={{ padding: '0 16px', borderBottom: '1px solid var(--separator)', background: soon ? 'color-mix(in srgb, var(--warning) 7%, transparent)' : 'transparent' }}>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpandedId(expanded ? null : subscription.id)}
                data-no-swipe
                style={{ width: '100%', minHeight: 68, padding: '11px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, border: 0, background: 'transparent', color: 'var(--text-main)', textAlign: 'left' }}
              >
                <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <SubscriptionLogo subscription={subscription.name} size={38} />
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', overflow: 'hidden', fontSize: 16, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subscription.name}</strong>
                    <span style={{ color: soon ? 'var(--warning)' : 'var(--text-muted)', fontSize: 12 }}>Renews {formattedDate} · {subscription.cycle}</span>
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <strong style={{ fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{money(subscription.amount)}</strong>
                  {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                </span>
              </button>
              {expanded && (
                <div style={{ padding: '12px 0 16px', borderTop: '1px solid var(--separator)' }}>
                  <div className="detail-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
                    <span>Status</span>
                    <strong style={{ color: subscription.status === 'Active' ? 'var(--success)' : 'var(--text-muted)' }}>{subscription.status}</strong>
                  </div>
                  {subscription.status === 'Active' && (
                    <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
                      <button className="action-button secondary" style={{ flex: 1 }} type="button" disabled={processing} onClick={() => handleAction(onIgnoreRenew, subscription)}>Renew next cycle</button>
                      <button className="action-button danger" style={{ flex: 1 }} type="button" disabled={processing} onClick={() => handleAction(onCancelSub, subscription)}>Cancel</button>
                    </div>
                  )}
                  {processing && <p style={{ margin: '10px 0 0', color: 'var(--text-muted)', textAlign: 'center', fontSize: 12 }}>Updating…</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
