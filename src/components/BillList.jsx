import { useState, useEffect, useRef } from 'react';
import { ScanLine } from 'lucide-react';

export default function BillList({ bills, onScanRequest, onAmountUpdate, isHistory = false, urgencyMap = {}, scrollToBillId = null, onScrollComplete }) {
  const [confirmModal, setConfirmModal] = useState({ show: false, billId: null, amount: 0 });
  const [savingId, setSavingId] = useState(null);
  const rowRefs = useRef({});

  useEffect(() => {
    if (scrollToBillId && rowRefs.current[scrollToBillId]) {
      const el = rowRefs.current[scrollToBillId];
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bill-row-flash');
      setTimeout(() => {
        el.classList.remove('bill-row-flash');
        if (onScrollComplete) onScrollComplete();
      }, 1200);
    }
  }, [scrollToBillId]);

  if (!bills || bills.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
        <p>No bills found for this view.</p>
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

  return (
    <div style={{ overflowX: 'auto', position: 'relative' }}>
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
            const amountColor = isPaid ? 'var(--success)' : 'var(--text-main)';
            const readOnly = isPaid || isFinal || isHistory;
            const displayAmount = Number(bill.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
            const isSaving = savingId === bill.id;
            
            // Urgency class
            const urgency = urgencyMap[bill.id]; // 'warn3' | 'warn7' | undefined
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
                onMouseOver={(e) => { if (!rowClass) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }} 
                onMouseOut={(e) => { if (!rowClass) e.currentTarget.style.background = 'transparent' }}
              >
                <td style={{ padding: '16px', fontWeight: 'bold' }}>{bill.biller}</td>
                <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{bill.statement_date || '—'}</td>
                <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{bill.due_date || '—'}</td>
                <td style={{ padding: '16px', fontStyle: 'italic', color: 'var(--accent)', fontSize: '13px' }}>{bill.channel || ''}</td>
                <td style={{ padding: '16px' }}>
                  <div className="tooltip-container" style={{ position: 'relative', width: 'max-content', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isFinal && bill.final_date && (
                      <div className="custom-tooltip">
                        Final amount entered on {new Date(bill.final_date).toLocaleDateString()}
                        <div className="custom-tooltip-arrow" />
                      </div>
                    )}
                    <input 
                      type="text"
                      defaultValue={displayAmount}
                      readOnly={readOnly}
                      onBlur={(e) => handleAmountBlur(bill.id, e.target.value, bill.amount)}
                      style={{ 
                        background: 'rgba(0,0,0,0.2)', 
                        border: '1px solid var(--glass-border)', 
                        padding: '8px 12px', 
                        borderRadius: '6px',
                        color: amountColor,
                        fontWeight: 'bold',
                        width: '120px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        cursor: readOnly ? 'default' : 'text',
                        opacity: readOnly && !isPaid ? 0.7 : 1
                      }}
                      onFocus={(e) => { if(!readOnly) e.target.style.borderColor = 'var(--accent)' }}
                      onMouseOut={(e) => { if(!readOnly && document.activeElement !== e.target) e.target.style.borderColor = 'var(--glass-border)' }}
                    />
                    {isSaving && <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 'bold' }}>Saving...</span>}
                  </div>
                </td>
                <td style={{ padding: '16px', fontWeight: 'bold', color: isPaid ? 'var(--success)' : 'var(--warning)' }}>
                  {bill.status}
                </td>
                <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                  {isPaid && bill.paid_date ? new Date(bill.paid_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </td>
                <td style={{ padding: '16px' }}>
                  {!isPaid ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={{ background: 'var(--success)', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Paid
                      </button>
                      <button 
                        onClick={() => onScanRequest && onScanRequest(bill)}
                        title="Scan Receipt OCR"
                        style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <ScanLine size={14} />
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', paddingLeft: '8px' }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-card animate-fade-up" style={{ width: '100%', maxWidth: '300px', padding: '24px', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Is this the final amount?</h3>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => handleConfirmFinal(false)}
                style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                No
              </button>
              <button 
                onClick={() => handleConfirmFinal(true)}
                style={{ flex: 1, background: 'var(--success)', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
