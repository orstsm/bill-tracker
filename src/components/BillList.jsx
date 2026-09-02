import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import BillerLogo from './BillerLogo';

const AmountInput = ({ bill, readOnly, amountColor, onAmountUpdate, isMobile }) => {
  const [localValue, setLocalValue] = useState(Number(bill.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }));

  useEffect(() => {
    setLocalValue(Number(bill.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }));
  }, [bill.amount]);

  const handleFocus = (e) => {
    if (!readOnly) {
      if (!isMobile) e.target.style.borderColor = 'var(--accent)';
      if (localValue === '0.00' || localValue === '0') {
        setLocalValue('');
      }
    }
  };

  const handleBlur = (e) => {
    if (!readOnly) {
      if (!isMobile) e.target.style.borderColor = 'var(--glass-border)';
      if (localValue === '') {
        setLocalValue('0.00');
        onAmountUpdate(bill.id, '0.00', bill.amount);
      } else {
        onAmountUpdate(bill.id, localValue, bill.amount);
      }
    }
  };

  const handleChange = (e) => {
    setLocalValue(e.target.value);
  };

  const desktopStyle = {
    background: 'var(--input-bg)', border: '1px solid var(--glass-border)',
    padding: '8px 12px', borderRadius: '9px', color: amountColor,
    fontWeight: '650', width: '120px', outline: 'none',
    cursor: readOnly ? 'default' : 'text', opacity: readOnly && bill.status !== 'Paid' ? 0.7 : 1
  };

  const mobileStyle = {
    background: 'var(--input-bg)', border: 'none',
    padding: '7px 10px', borderRadius: '9px', color: amountColor,
    fontWeight: '600', width: '100px', outline: 'none', textAlign: 'right',
    cursor: readOnly ? 'default' : 'text', opacity: readOnly && bill.status !== 'Paid' ? 0.7 : 1, fontSize: '14px'
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={`Amount for ${bill.biller}`}
      value={localValue}
      onChange={handleChange}
      readOnly={readOnly}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onClick={(e) => { if (isMobile) e.stopPropagation(); }}
      style={isMobile ? mobileStyle : desktopStyle}
    />
  );
};

export default function BillList({ bills, onAmountUpdate, onMarkPaid, isHistory = false, urgencyMap = {}, scrollToBillId = null, onScrollComplete }) {
  const [confirmModal, setConfirmModal] = useState({ show: false, billId: null, amount: 0 });
  const [savingId, setSavingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const rowRefs = useRef({});

  useEffect(() => {
    if (scrollToBillId && rowRefs.current[scrollToBillId]) {
      const el = rowRefs.current[scrollToBillId];
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bill-row-flash');
      setExpandedId(scrollToBillId);
      setTimeout(() => {
        el.classList.remove('bill-row-flash');
        if (onScrollComplete) onScrollComplete();
      }, 1200);
    }
  }, [scrollToBillId, onScrollComplete]);

  if (!bills || bills.length === 0) {
    return (
      <div className="empty-state">
        <CheckCircle2 size={28} aria-hidden="true" />
        <strong>No bills here</strong>
        <span>This section is currently clear.</span>
      </div>
    );
  }

  const handleAmountBlur = (billId, newValue, originalValue) => {
    let cleanVal = String(newValue).replace(/,/g, '');
    let numVal = parseFloat(cleanVal);
    let origVal = parseFloat(originalValue);
    if (!isNaN(numVal) && numVal !== origVal) {
      setConfirmModal({ show: true, billId, amount: numVal });
    }
  };

  const handleConfirmFinal = async (isFinal) => {
    if (onAmountUpdate && confirmModal.billId) {
      setSavingId(confirmModal.billId);
      await onAmountUpdate(confirmModal.billId, confirmModal.amount, isFinal);
      setSavingId(null);
    }
    setConfirmModal({ show: false, billId: null, amount: 0 });
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getAmountColor = (isPaid, isFinal) => {
    if (isPaid) return 'var(--success)';
    if (isFinal) return 'var(--text-muted)';
    return 'var(--text-main)';
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* ==================== DESKTOP TABLE ==================== */}
      <div className="desktop-only" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold' }}>
              <th style={{ padding: '16px' }}>Biller</th>
              <th style={{ padding: '16px' }}>Statement Date</th>
              <th style={{ padding: '16px' }}>Due Date</th>
              <th style={{ padding: '16px' }}>Channel</th>
              <th style={{ padding: '16px' }}>Amount</th>
              <th style={{ padding: '16px' }}>Status</th>
              <th style={{ padding: '16px' }}>Paid Date</th>
              <th style={{ padding: '16px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => {
              const isPaid = bill.status === 'Paid';
              const isFinal = bill.is_final;
              const amountColor = getAmountColor(isPaid, isFinal);
              const readOnly = isPaid || isFinal || isHistory;
              const isSaving = savingId === bill.id;
              const urgency = urgencyMap[bill.id];
              let rowClass = '';
              if (urgency === 'warn3') rowClass = 'bill-row-warn-3';
              else if (urgency === 'warn7') rowClass = 'bill-row-warn-7';

              return (
                <tr
                  key={bill.id}
                  ref={el => rowRefs.current[bill.id] = el}
                  id={`bill-row-${bill.id}`}
                  className={rowClass}
                  style={{ borderTop: '1px solid var(--glass-border)', transition: 'background 0.2s', fontSize: '14px' }}
                >
                  <td style={{ padding: '16px', fontWeight: 'bold' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <BillerLogo biller={bill.biller} size={28} />
                      <span>{bill.biller}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{bill.statement_date || '—'}</td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{bill.due_date || '—'}</td>
                  <td style={{ padding: '16px', fontStyle: 'italic', color: 'var(--accent)', fontSize: '13px' }}>{bill.channel || '—'}</td>
                  <td style={{ padding: '16px' }}>
                    <div className="tooltip-container" style={{ position: 'relative', width: 'max-content', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isFinal && bill.final_date && (
                        <div className="custom-tooltip">
                          Final amount entered on {new Date(bill.final_date).toLocaleDateString()}
                          <div className="custom-tooltip-arrow" />
                        </div>
                      )}
                      <AmountInput
                        bill={bill}
                        readOnly={readOnly}
                        amountColor={amountColor}
                        onAmountUpdate={handleAmountBlur}
                        isMobile={false}
                      />
                      {isSaving && <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 'bold' }}>Saving…</span>}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontWeight: 'bold', color: isPaid ? 'var(--success)' : 'var(--warning)' }}>{bill.status}</td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                    {isPaid && bill.paid_date ? new Date(bill.paid_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {!isPaid ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={(e) => { e.stopPropagation(); if (onMarkPaid) onMarkPaid(bill.id); }} style={{ background: 'var(--success)', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Paid</button>
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

      {/* ==================== MOBILE CARDS ==================== */}
      <div className="mobile-only" style={{ padding: 0 }}>
        {bills.map((bill) => {
          const isPaid = bill.status === 'Paid';
          const isFinal = bill.is_final;
          const amountColor = getAmountColor(isPaid, isFinal);
          const readOnly = isPaid || isFinal || isHistory;
          const displayAmount = Number(bill.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
          const isSaving = savingId === bill.id;
          const isExpanded = expandedId === bill.id;
          const urgency = urgencyMap[bill.id];
          let cardClass = 'mobile-bill-card';
          if (urgency === 'warn3') cardClass += ' bill-row-warn-3';
          else if (urgency === 'warn7') cardClass += ' bill-row-warn-7';

          return (
            <div
              key={bill.id}
              ref={el => rowRefs.current[bill.id] = el}
              id={`bill-row-${bill.id}`}
              className={cardClass}
              style={{
                background: 'transparent',
                borderBottom: '0.5px solid var(--border-color)',
                padding: '0 16px',
                transition: 'background 0.2s',
              }}
            >
              {/* Card Header — always visible */}
              <button
                type="button"
                onClick={() => toggleExpand(bill.id)}
                aria-expanded={isExpanded}
                data-no-swipe
                style={{
                  width: '100%',
                  minHeight: '68px',
                  padding: '12px 0',
                  border: 0,
                  background: 'transparent',
                  color: 'var(--text-main)',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <BillerLogo biller={bill.biller} size={38} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontWeight: '600', fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {bill.biller}
                    </span>
                    <span style={{ fontWeight: '500', color: amountColor, fontSize: '16px', flexShrink: 0 }}>
                      ₱{displayAmount}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Due {bill.due_date || '—'} · {bill.status === 'Paid' ? <span style={{ color: 'var(--success)' }}>Paid</span> : bill.status}
                    </span>
                    {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                  </div>
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '0.5px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '12px' }}>Statement Date</span>
                    <span style={{ fontSize: '14px' }}>{bill.statement_date || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '12px' }}>Channel</span>
                    <span style={{ fontSize: '14px', fontStyle: 'italic', color: 'var(--accent)' }}>{bill.channel || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '12px' }}>Amount</span>
                    <AmountInput
                      bill={bill}
                      readOnly={readOnly}
                      amountColor={amountColor}
                      onAmountUpdate={handleAmountBlur}
                      isMobile={true}
                    />
                  </div>
                  {isFinal && bill.final_date && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '-6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}></span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>
                        Final amount entered on {new Date(bill.final_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '12px' }}>Paid Date</span>
                    <span style={{ fontSize: '14px' }}>
                      {isPaid && bill.paid_date ? new Date(bill.paid_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                  {!isPaid && !isHistory && (
                    <button className="primary-button" type="button" onClick={(e) => { e.stopPropagation(); if (onMarkPaid) onMarkPaid(bill.id); }} data-no-swipe>
                      Mark as Paid
                    </button>
                  )}
                  {isSaving && <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 'bold', textAlign: 'center' }}>Saving…</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal via Portal to escape backdrop-filter containing block */}
      {confirmModal.show && createPortal(
        <div className="sheet-backdrop">
          <div className="ios-sheet" role="dialog" aria-modal="true" aria-labelledby="confirm-amount-title">
            <div className="sheet-grabber" />
            <h3 id="confirm-amount-title" style={{ marginTop: 0, marginBottom: '16px', fontSize: '20px', fontWeight: '650' }}>Save this amount?</h3>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="action-button secondary" style={{ flex: 1 }} type="button" onClick={() => handleConfirmFinal(false)}>Save Draft</button>
              <button className="primary-button" style={{ flex: 1 }} type="button" onClick={() => handleConfirmFinal(true)}>Mark Final</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
