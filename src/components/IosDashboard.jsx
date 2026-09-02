import { lazy, Suspense } from 'react';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  History,
  Home,
  LogOut,
  MinusCircle,
  Plus,
  Settings,
  Wallet,
} from 'lucide-react';
import BillList from './BillList';
import SubscriptionList from './SubscriptionList';
import AddBillerModal from './AddBillerModal';
import RemoveBillerModal from './RemoveBillerModal';
import WithdrawModal from './WithdrawModal';
import AddSubModal from './AddSubModal';
import { sortMonthsDescending, parseDueDateLogic } from '../lib/utils';

const CashLog = lazy(() => import('./CashLog'));

const NAV_ITEMS = [
  { id: 'active', label: 'Home', icon: Home },
  { id: 'due', label: 'Bills', icon: AlertCircle },
  { id: 'cashLog', label: 'Activity', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const money = (value) => `₱${Number(value || 0).toLocaleString('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

function PageHeader({ title, eyebrow, action, actionLabel = 'Add' }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
      </div>
      {action && (
        <button className="icon-button" type="button" onClick={action} aria-label={actionLabel} data-no-swipe>
          <Plus aria-hidden="true" />
        </button>
      )}
    </header>
  );
}

function MetricCard({ label, value, tone, foot, progress, onClick }) {
  return (
    <button className="metric-card" type="button" onClick={onClick} data-no-swipe>
      <span className="metric-label">{label}</span>
      <span className={`metric-value ${tone || ''}`}>{value}</span>
      {typeof progress === 'number' && (
        <span className="progress-line" aria-label={`${Math.round(progress)}% paid`}>
          <span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </span>
      )}
      <span className="metric-foot">{foot} ›</span>
    </button>
  );
}

function SegmentedControl({ value, onChange }) {
  const items = [
    { id: 'current', label: 'This Month' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'subscriptions', label: 'Subscriptions', compactLabel: 'Subs' },
  ];
  return (
    <div className="segmented-control" role="tablist" aria-label="Home content" data-no-swipe>
      {items.map((item) => (
        <button
          className="segment-button"
          type="button"
          role="tab"
          key={item.id}
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
        >
          <span className="full-segment-label">{item.label}</span>
          <span className="compact-segment-label">{item.compactLabel || item.label}</span>
        </button>
      ))}
    </div>
  );
}

function MonthSection({ title, meta, expanded, onToggle, children }) {
  return (
    <section className="surface">
      <button className="accordion-header" type="button" onClick={onToggle} aria-expanded={expanded} data-no-swipe>
        <span className="accordion-title">{title}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {meta && <span className="accordion-meta">{meta}</span>}
          {expanded ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
        </span>
      </button>
      {expanded && <div className="accordion-content">{children}</div>}
    </section>
  );
}

function EmptyState({ title, detail }) {
  return (
    <div className="surface empty-state">
      <CheckCircle2 size={30} aria-hidden="true" />
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function DetailSheet({ type, onClose, data, onViewBills }) {
  if (!type) return null;
  const projected = data.netPosition - (data.remainingMondays * 5000);
  const content = {
    available: {
      title: 'Available Cash',
      rows: [
        ['Savings balance', money(data.settings.savings)],
        ['Monthly income', money(data.settings.income)],
        ['Bills this month', `−${money(data.summary.billsThisMonth)}`],
        ['Cash withdrawn', `−${money(data.summary.totalWithdrawn)}`],
        ['Available now', money(data.netPosition)],
      ],
    },
    outflows: {
      title: 'Month Outflows',
      rows: [
        ['Bills this month', money(data.summary.billsThisMonth)],
        ['Cash withdrawals', money(data.summary.totalWithdrawn)],
        ['Total outflows', money(data.totalOutflows)],
      ],
    },
    projected: {
      title: 'Projected Cash',
      rows: [
        ['Available now', money(data.netPosition)],
        ['Mondays remaining', String(data.remainingMondays)],
        ['Planned per Monday', money(5000)],
        ['Projected month-end', money(projected)],
      ],
    },
    unpaid: {
      title: 'Unpaid Bills',
      rows: [
        ['Bills remaining', String(data.unpaidCount)],
        ['Amount remaining', money(data.remainingThisMonth)],
        ['Bills requiring attention', String(data.actionItemsDue)],
      ],
    },
  }[type];

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="ios-sheet" role="dialog" aria-modal="true" aria-labelledby="detail-sheet-title" data-no-swipe>
        <div className="sheet-grabber" />
        <header className="sheet-header">
          <h2 id="detail-sheet-title">{content.title}</h2>
          <button className="sheet-cancel" type="button" onClick={onClose}>Done</button>
        </header>
        <div className="detail-list">
          {content.rows.map(([label, value], index) => (
            <div className="detail-row" key={label}>
              <span>{label}</span>
              <strong className={index === content.rows.length - 1 ? 'positive' : ''}>{value}</strong>
            </div>
          ))}
        </div>
        {type === 'unpaid' && (
          <button className="primary-button" type="button" style={{ marginTop: 16 }} onClick={onViewBills}>View Bills</button>
        )}
      </section>
    </div>
  );
}

function HistorySections({ historyMonths, expandedMonth, setExpandedMonth, onAmountUpdate, onMarkPaid }) {
  const months = sortMonthsDescending(Object.keys(historyMonths || {}));
  if (!months.length) return <EmptyState title="No previous bills" detail="Closed months will appear here." />;
  return (
    <div className="content-stack">
      {months.map((month) => {
        const expanded = expandedMonth === month;
        const total = historyMonths[month].reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
        return (
          <MonthSection
            key={month}
            title={month}
            meta={`Paid ${money(total)}`}
            expanded={expanded}
            onToggle={() => setExpandedMonth(expanded ? null : month)}
          >
            <BillList bills={historyMonths[month]} onAmountUpdate={onAmountUpdate} onMarkPaid={onMarkPaid} isHistory />
          </MonthSection>
        );
      })}
    </div>
  );
}

export default function IosDashboard(props) {
  const {
    activeTab,
    switchTab,
    homeTab,
    setHomeTab,
    detailSheet,
    setDetailSheet,
    viewportRef,
    trackRef,
    dashboardData,
    settings,
    actionItemsDue,
    firstDueBillId,
    urgencyMap,
    scrollToBillId,
    setScrollToBillId,
    currentMonthExpanded,
    setCurrentMonthExpanded,
    earlyRolloverExpanded,
    setEarlyRolloverExpanded,
    expandedPreviousMonth,
    setExpandedPreviousMonth,
    editingField,
    editingValue,
    setEditingValue,
    startEditingField,
    saveSettingsField,
    setIsAddMenuOpen,
    isAddMenuOpen,
    setIsAddBillerOpen,
    setIsRemoveBillerOpen,
    setIsWithdrawOpen,
    setIsAddSubOpen,
    isAddBillerOpen,
    isRemoveBillerOpen,
    isWithdrawOpen,
    isAddSubOpen,
    showCloseMonthModal,
    setShowCloseMonthModal,
    pendingAutoRollover,
    executeCloseMonth,
    isLastWeekOfMonth,
    getDaysUntilLastWeek,
    handleAmountUpdate,
    handleMarkAsPaid,
    handleIgnoreRenew,
    handleCancelSub,
    handleLogout,
    fetchDashboardData,
    getDisplayName,
    loading,
    netPosition,
    totalOutflows,
    remainingThisMonth,
    progressPercent,
    unpaidActiveCount,
    remainingMondays,
  } = props;

  const projectedCash = netPosition - (remainingMondays * 5000);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueBills = dashboardData.currentBills.filter((bill) => {
    if (bill.status === 'Paid') return false;
    const dueDate = parseDueDateLogic(bill.due_date, dashboardData.appActiveMonth);
    if (!dueDate) return false;
    const target = new Date(dueDate);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  const dueRolloverBills = (dashboardData.earlyRolloverBills || []).filter((bill) => {
    if (bill.status === 'Paid') return false;
    const dueDate = parseDueDateLogic(bill.due_date, dashboardData.earlyRolloverMonth);
    if (!dueDate) return false;
    const target = new Date(dueDate);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  const urgentBills = [...dueRolloverBills, ...dueBills];

  const dueSubscriptions = (dashboardData.subscriptions || []).filter((sub) => {
    if (sub.status !== 'Active' || !sub.renewal_date) return false;
    const renewal = new Date(sub.renewal_date);
    renewal.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 5;
  });

  const billListProps = {
    onAmountUpdate: handleAmountUpdate,
    onMarkPaid: handleMarkAsPaid,
    urgencyMap,
    scrollToBillId,
    onScrollComplete: () => setScrollToBillId(null),
  };

  const viewBills = () => {
    setDetailSheet(null);
    setCurrentMonthExpanded(true);
    switchTab('due');
    if (firstDueBillId) window.setTimeout(() => setScrollToBillId(firstDueBillId), 340);
  };

  return (
    <div className="app-shell">
      <div className="swipe-viewport" ref={viewportRef}>
        <div className="swipe-track" ref={trackRef}>
          <section className="app-page" aria-hidden={activeTab !== 'active'} inert={activeTab !== 'active' ? '' : undefined}>
            <div className="page-inner">
              <PageHeader
                title="Bill Tracker"
                eyebrow={`${dashboardData.appActiveMonth || 'Your finances'} · Hi, ${getDisplayName()}`}
                action={() => setIsAddMenuOpen(true)}
                actionLabel="Quick actions"
              />

              {actionItemsDue > 0 && (
                <button className="notice-button" type="button" onClick={viewBills} data-no-swipe>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <AlertCircle size={18} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                    <span>{actionItemsDue} item{actionItemsDue === 1 ? '' : 's'} need attention</span>
                  </div>
                  <span>Review ›</span>
                </button>
              )}

              <div className="metric-grid">
                <MetricCard label="Available cash" value={money(netPosition)} tone="positive" foot="Current balance" onClick={() => setDetailSheet('available')} />
                <MetricCard label="Month outflows" value={money(totalOutflows)} tone="negative" foot="Bills + withdrawals" onClick={() => setDetailSheet('outflows')} />
                <MetricCard label="Projected cash" value={money(projectedCash)} tone="warning" foot="Month-end estimate" onClick={() => setDetailSheet('projected')} />
                <MetricCard label="Unpaid bills" value={String(unpaidActiveCount)} foot={`${money(remainingThisMonth)} remaining`} progress={progressPercent} onClick={() => setDetailSheet('unpaid')} />
              </div>

              <SegmentedControl value={homeTab} onChange={setHomeTab} />

              {loading ? (
                <div className="empty-state"><div className="loading-spinner" aria-label="Loading" /></div>
              ) : homeTab === 'current' ? (
                <div className="content-stack">
                  {dashboardData.earlyRolloverMonth && (
                    <MonthSection
                      title={dashboardData.earlyRolloverMonth}
                      meta={`${dashboardData.earlyRolloverBills.filter((bill) => bill.status !== 'Paid').length} unpaid`}
                      expanded={earlyRolloverExpanded}
                      onToggle={() => setEarlyRolloverExpanded(!earlyRolloverExpanded)}
                    >
                      <BillList bills={dashboardData.earlyRolloverBills} {...billListProps} />
                    </MonthSection>
                  )}
                  <MonthSection
                    title={dashboardData.appActiveMonth}
                    meta={`${unpaidActiveCount} unpaid`}
                    expanded={currentMonthExpanded}
                    onToggle={() => setCurrentMonthExpanded(!currentMonthExpanded)}
                  >
                    <BillList bills={dashboardData.currentBills} {...billListProps} />
                  </MonthSection>
                </div>
              ) : homeTab === 'upcoming' ? (
                dashboardData.upcomingMonth ? (
                  <MonthSection title={dashboardData.upcomingMonth} meta="Upcoming" expanded onToggle={() => {}}>
                    <BillList bills={dashboardData.upcomingBills} onAmountUpdate={handleAmountUpdate} onMarkPaid={handleMarkAsPaid} />
                  </MonthSection>
                ) : (
                  <EmptyState title="Nothing scheduled yet" detail="Next month's bills are generated automatically on the 15th." />
                )
              ) : (
                <div className="content-stack">
                  <div className="section-heading">
                    <h2>Subscriptions</h2>
                    <button className="section-action" type="button" onClick={() => setIsAddSubOpen(true)} data-no-swipe>+ Add</button>
                  </div>
                  {dashboardData.subscriptions.length ? (
                    <SubscriptionList subscriptions={dashboardData.subscriptions} onIgnoreRenew={handleIgnoreRenew} onCancelSub={handleCancelSub} />
                  ) : (
                    <EmptyState title="No subscriptions" detail="Add recurring services to track their next renewal." />
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="app-page" aria-hidden={activeTab !== 'due'} inert={activeTab !== 'due' ? '' : undefined}>
            <div className="page-inner">
              <PageHeader title="Bills" action={() => setIsAddMenuOpen(true)} actionLabel="Quick actions" />
              <div className="action-row" data-no-swipe>
                <button className="action-button secondary" type="button" onClick={() => setIsRemoveBillerOpen(true)}><FileText size={17} /> Manage Billers</button>
                <button className="action-button" type="button" onClick={() => setIsWithdrawOpen(true)}><MinusCircle size={17} /> Withdraw Cash</button>
              </div>

              <div className="bills-highlight-card" data-no-swipe>
                <div className="bills-highlight-pill">
                  <span className="bills-highlight-count">{unpaidActiveCount} unpaid</span>
                  <span className="bills-highlight-dot">·</span>
                  <span className="bills-highlight-amount">{money(remainingThisMonth)} remaining</span>
                </div>
              </div>

              {urgentBills.length > 0 && (
                <section className="section-gap">
                  <div className="section-heading">
                    <h2>Bills due soon</h2>
                    <span className="accordion-meta">Within 7 days</span>
                  </div>
                  <div className="surface">
                    <BillList bills={urgentBills} {...billListProps} />
                  </div>
                </section>
              )}

              {dueSubscriptions.length > 0 && (
                <section className="section-gap">
                  <div className="section-heading">
                    <h2>Subscriptions renewing soon</h2>
                    <span className="accordion-meta">Within 5 days</span>
                  </div>
                  <div className="surface">
                    <SubscriptionList
                      subscriptions={dueSubscriptions}
                      onIgnoreRenew={handleIgnoreRenew}
                      onCancelSub={handleCancelSub}
                    />
                  </div>
                </section>
              )}

              {urgentBills.length === 0 && dueSubscriptions.length === 0 && (
                <section className="section-gap">
                  <EmptyState
                    title="All caught up"
                    detail="No bills due in the next 7 days and no subscriptions renewing in the next 5 days."
                  />
                </section>
              )}
            </div>
          </section>

          <section className="app-page" aria-hidden={activeTab !== 'cashLog'} inert={activeTab !== 'cashLog' ? '' : undefined}>
            <div className="page-inner">
              <PageHeader title="Activity" eyebrow="Cash flow and completed months" action={() => setIsWithdrawOpen(true)} actionLabel="Log a cash withdrawal" />
              <Suspense fallback={<div className="surface empty-state"><div className="loading-spinner" aria-label="Loading activity" /></div>}>
                <CashLog withdrawals={dashboardData.recentWithdrawals} />
              </Suspense>
              <section className="section-gap">
                <div className="section-heading"><h2>Previous bills</h2></div>
                <HistorySections
                  historyMonths={dashboardData.historyMonths}
                  expandedMonth={expandedPreviousMonth}
                  setExpandedMonth={setExpandedPreviousMonth}
                  onAmountUpdate={handleAmountUpdate}
                  onMarkPaid={handleMarkAsPaid}
                />
              </section>
            </div>
          </section>

          <section className="app-page" aria-hidden={activeTab !== 'settings'} inert={activeTab !== 'settings' ? '' : undefined}>
            <div className="page-inner">
              <PageHeader title="Settings" eyebrow="Account and monthly plan" />
              <section className="settings-group">
                <p className="settings-caption">Starting funds</p>
                <div className="surface">
                  <div className="settings-row">
                    <span className="settings-label"><Wallet size={19} /> Savings balance</span>
                    {editingField === 'savings' ? (
                      <input className="native-input" style={{ width: 130, textAlign: 'right' }} inputMode="decimal" value={editingValue} onChange={(event) => setEditingValue(event.target.value)} onBlur={saveSettingsField} onKeyDown={(event) => event.key === 'Enter' && saveSettingsField()} autoFocus />
                    ) : (
                      <button className="settings-value" type="button" onClick={() => startEditingField('savings')}>{money(settings.savings)} ›</button>
                    )}
                  </div>
                  <div className="settings-row">
                    <span className="settings-label"><Banknote size={19} /> Monthly income</span>
                    {editingField === 'income' ? (
                      <input className="native-input" style={{ width: 130, textAlign: 'right' }} inputMode="decimal" value={editingValue} onChange={(event) => setEditingValue(event.target.value)} onBlur={saveSettingsField} onKeyDown={(event) => event.key === 'Enter' && saveSettingsField()} autoFocus />
                    ) : (
                      <button className="settings-value" type="button" onClick={() => startEditingField('income')}>{money(settings.income)} ›</button>
                    )}
                  </div>
                </div>
              </section>
              <section className="settings-group">
                <p className="settings-caption">Month end</p>
                <div className="surface">
                  <div className="settings-row">
                    <span><strong>Close and rollover</strong><br /><span className="accordion-meta">Carry available cash into next month</span></span>
                    <button className="settings-value" type="button" onClick={() => setShowCloseMonthModal(true)}>Review ›</button>
                  </div>
                </div>
              </section>
              <section className="settings-group">
                <p className="settings-caption">Account</p>
                <div className="surface">
                  <button className="accordion-header" type="button" onClick={handleLogout} data-no-swipe>
                    <span className="settings-label"><LogOut size={19} /> Sign Out</span>
                    <span style={{ color: 'var(--danger)' }}>›</span>
                  </button>
                </div>
              </section>
              <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', fontSize: 12, marginTop: 28 }}>Bill Tracker · Your data remains in your existing Supabase account.</p>
            </div>
          </section>
        </div>
      </div>

      <div className="tab-bar-wrap">
        <nav className="mobile-bottom-nav" aria-label="Main navigation" data-no-swipe>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button className="tab-button" type="button" key={id} aria-current={activeTab === id ? 'page' : undefined} onClick={() => switchTab(id)}>
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon aria-hidden="true" />
                {id === 'due' && actionItemsDue > 0 && (
                  <span className="tab-badge">{actionItemsDue}</span>
                )}
              </div>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <DetailSheet
        type={detailSheet}
        onClose={() => setDetailSheet(null)}
        onViewBills={viewBills}
        data={{
          settings,
          summary: dashboardData.summary,
          netPosition,
          totalOutflows,
          remainingThisMonth,
          unpaidCount: unpaidActiveCount,
          actionItemsDue,
          remainingMondays,
        }}
      />

      {isAddMenuOpen && (
        <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsAddMenuOpen(false)}>
          <section className="ios-sheet" role="dialog" aria-modal="true" aria-labelledby="add-action-title" data-no-swipe>
            <div className="sheet-grabber" />
            <header className="sheet-header">
              <h2 id="add-action-title">Quick Actions</h2>
              <button className="sheet-cancel" type="button" onClick={() => setIsAddMenuOpen(false)}>Cancel</button>
            </header>
            <div className="sheet-body" style={{ gap: 10 }}>
              <button
                className="action-button"
                type="button"
                onClick={() => {
                  setIsAddMenuOpen(false);
                  setIsWithdrawOpen(true);
                }}
                style={{
                  minHeight: 52,
                  fontSize: 16,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  padding: '14px 18px',
                  borderRadius: 14,
                  gap: 12,
                }}
              >
                <MinusCircle size={20} style={{ color: 'var(--danger)' }} />
                <span>Add Withdrawal</span>
              </button>

              <button
                className="action-button secondary"
                type="button"
                onClick={() => {
                  setIsAddMenuOpen(false);
                  setIsAddBillerOpen(true);
                }}
                style={{
                  minHeight: 52,
                  fontSize: 16,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  padding: '14px 18px',
                  borderRadius: 14,
                  gap: 12,
                }}
              >
                <Plus size={20} style={{ color: 'var(--accent-strong)' }} />
                <span>Add Biller</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {isAddBillerOpen && <AddBillerModal onClose={() => setIsAddBillerOpen(false)} onBillerAdded={() => fetchDashboardData(true)} />}
      {isRemoveBillerOpen && <RemoveBillerModal onClose={() => setIsRemoveBillerOpen(false)} onBillerRemoved={() => fetchDashboardData(true)} />}
      {isWithdrawOpen && <WithdrawModal onClose={() => setIsWithdrawOpen(false)} onWithdraw={() => fetchDashboardData(true)} isEarlyRollover={Boolean(dashboardData.earlyRolloverMonth)} />}
      {isAddSubOpen && <AddSubModal onClose={() => setIsAddSubOpen(false)} onSubAdded={() => fetchDashboardData(true)} />}

      {pendingAutoRollover && (
        <div className="sheet-backdrop">
          <section className="ios-sheet" role="dialog" aria-modal="true" aria-labelledby="rollover-title" data-no-swipe>
            <div className="sheet-grabber" />
            <header className="sheet-header"><h2 id="rollover-title">Finish {pendingAutoRollover}</h2></header>
            <div className="sheet-body">
              <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.5 }}>To keep your totals accurate, carry your remaining {money(netPosition)} into the new month.</p>
              <button className="primary-button" type="button" onClick={() => executeCloseMonth(pendingAutoRollover)}>Rollover now</button>
            </div>
          </section>
        </div>
      )}

      {showCloseMonthModal && (
        <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowCloseMonthModal(false)}>
          <section className="ios-sheet" role="dialog" aria-modal="true" aria-labelledby="close-month-title" data-no-swipe>
            <div className="sheet-grabber" />
            <header className="sheet-header">
              <h2 id="close-month-title">{isLastWeekOfMonth() ? 'Close the month?' : 'Not available yet'}</h2>
              <button className="sheet-cancel" type="button" onClick={() => setShowCloseMonthModal(false)}>Cancel</button>
            </header>
            <div className="sheet-body">
              {isLastWeekOfMonth() ? (
                <>
                  <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.5 }}>This marks remaining bills paid and carries {money(netPosition)} into your savings balance for next month.</p>
                  <button className="primary-button" type="button" onClick={() => executeCloseMonth()}>Close &amp; Rollover</button>
                </>
              ) : (
                <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.5 }}>Month-end rollover opens in {getDaysUntilLastWeek()} day{getDaysUntilLastWeek() === 1 ? '' : 's'}.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
