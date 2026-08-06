import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Plus, Wallet, FileText, CheckCircle2, History, Banknote, ChevronDown, ChevronUp, Home, AlertCircle, MinusCircle } from 'lucide-react';
import BillList from '../components/BillList';
import AddBillerModal from '../components/AddBillerModal';
import RemoveBillerModal from '../components/RemoveBillerModal';
import WithdrawModal from '../components/WithdrawModal';
import OCRScanner from '../components/OCRScanner';
import { getCurrentMonthStr, getNextMonthStr, sortMonthsDescending, parseDueDateLogic } from '../lib/utils';
// We'll import the CashLog component shortly
import CashLog from '../components/CashLog'; 

export default function Dashboard() {
  const { user } = useAuth();
  const [theme, setTheme] = useState(
    document.documentElement.getAttribute('data-theme') || 'dark'
  );
  const [activeTab, setActiveTab] = useState('active'); // active, incoming, previous, cashLog
  const [isAddBillerOpen, setIsAddBillerOpen] = useState(false);
  const [isRemoveBillerOpen, setIsRemoveBillerOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Expandable states (shared/mutually exclusive)
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [expandedPreviousMonth, setExpandedPreviousMonth] = useState(null);
  const [showCloseMonthModal, setShowCloseMonthModal] = useState(false);

  // Inline editing for settings
  const [editingField, setEditingField] = useState(null); // 'income' or 'savings'
  const [editingValue, setEditingValue] = useState('');

  // Data states
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ income: 0, savings: 0 });
  const [actionItemsDue, setActionItemsDue] = useState(0);
  const [urgencyMap, setUrgencyMap] = useState({}); // { billId: 'warn3' | 'warn7' }
  const [firstDueBillId, setFirstDueBillId] = useState(null);
  const [scrollToBillId, setScrollToBillId] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    currentMonth: '',
    upcomingMonth: null,
    currentBills: [],
    upcomingBills: [],
    historyMonths: {},
    recentWithdrawals: {},
    summary: {
      billsThisMonth: 0,
      paidThisMonth: 0,
      totalWithdrawn: 0,
      countPaid: 0,
      countTotal: 0
    }
  });

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 1. Fetch Settings
      const { data: sData } = await supabase.from('settings').select('*').eq('user_id', user.id).single();
      const stgs = { income: sData?.monthly_income || 0, savings: sData?.savings_account_balance || 0 };
      setSettings(stgs);

      // 2. Fetch Bills & Withdrawals
      const { data: bData } = await supabase.from('bills').select('*').eq('user_id', user.id).order('id', { ascending: false });
      const { data: wData } = await supabase.from('withdrawals').select('*').eq('user_id', user.id);

      const currentMonth = getCurrentMonthStr();
      const nextMonth = getNextMonthStr();
      const todayDay = new Date().getDate();
      
      let billsThisMonthSum = 0;
      let paidThisMonthSum = 0;
      let countPaid = 0;
      let countTotal = 0;
      let totalWithdrawn = 0;
      
      const currentBills = [];
      const upcomingBills = [];
      const rawHistory = {};
      const rawWithdrawals = {};

      // Process Withdrawals (filter out 0 amounts which are placeholders)
      (wData || []).forEach(w => {
        const amt = Number(w.amount);
        if (amt === 0) return; // Skip placeholders from Cash Log
        
        if (!rawWithdrawals[w.month]) rawWithdrawals[w.month] = { total: 0, logs: [] };
        rawWithdrawals[w.month].logs.push(w);
        rawWithdrawals[w.month].total += amt;

        if (w.month === currentMonth) {
          totalWithdrawn += amt;
        }
      });

      // Process Bills
      (bData || []).forEach(b => {
        const amt = Number(b.amount) || 0;
        const isPassThrough = (b.channel || '').toUpperCase().includes('CC');
        const isPaid = b.status === 'Paid';

        if (b.month === currentMonth) {
          currentBills.push(b);
          countTotal++;
          if (isPaid) countPaid++;

          if (!isPassThrough) {
            billsThisMonthSum += amt;
            if (isPaid) paidThisMonthSum += amt;
          }
        } else if (b.month === nextMonth && todayDay >= 15) {
          upcomingBills.push(b);
        } else {
          if (!rawHistory[b.month]) rawHistory[b.month] = [];
          rawHistory[b.month].push(b);
        }
      });

      const sortByDueDate = (a, b) => {
        const dA = parseDueDateLogic(a.due_date, a.month);
        const dB = parseDueDateLogic(b.due_date, b.month);
        if (!dA && !dB) return 0;
        if (!dA) return 1;
        if (!dB) return -1;
        return dA.getTime() - dB.getTime();
      };

      currentBills.sort(sortByDueDate);
      upcomingBills.sort(sortByDueDate);
      Object.keys(rawHistory).forEach(m => rawHistory[m].sort(sortByDueDate));

      setDashboardData({
        currentMonth,
        upcomingMonth: todayDay >= 15 ? nextMonth : null,
        currentBills,
        upcomingBills,
        historyMonths: rawHistory,
        recentWithdrawals: rawWithdrawals,
        summary: { billsThisMonth: billsThisMonthSum, paidThisMonth: paidThisMonthSum, totalWithdrawn, countPaid, countTotal }
      });

      // Action items due: build urgency map and count
      const today = new Date();
      let dueCount = 0;
      const newUrgencyMap = {};
      let firstDue = null;
      currentBills.forEach(b => {
        if (b.status !== 'Paid') {
          const dueDate = parseDueDateLogic(b.due_date, currentMonth);
          if (dueDate) {
            const diffMs = dueDate.getTime() - today.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            if (diffDays <= 3) {
              newUrgencyMap[b.id] = 'warn3';
              dueCount++;
              if (!firstDue) firstDue = b.id;
            } else if (diffDays <= 7) {
              newUrgencyMap[b.id] = 'warn7';
              dueCount++;
              if (!firstDue) firstDue = b.id;
            }
          }
        }
      });
      setUrgencyMap(newUrgencyMap);
      setActionItemsDue(dueCount);
      setFirstDueBillId(firstDue);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleAmountUpdate = async (billId, newAmount, isFinal = false) => {
    try {
      const payload = { amount: newAmount };
      if (isFinal) {
        payload.is_final = true;
        payload.final_date = new Date().toISOString();
      }
      
      const { error } = await supabase.from('bills').update(payload).eq('id', billId);
      if (error) throw error;
      fetchDashboardData(true); // Silent fetch to prevent flicker
    } catch (e) {
      console.error("Failed to update amount", e);
    }
  };

  // Inline settings editing
  const startEditingField = (field) => {
    setEditingField(field);
    setEditingValue(field === 'income' ? String(settings.income) : String(settings.savings));
  };

  const saveSettingsField = async () => {
    if (!editingField) return;
    const numVal = parseFloat(editingValue.replace(/,/g, ''));
    if (isNaN(numVal)) { setEditingField(null); return; }

    const col = editingField === 'income' ? 'monthly_income' : 'savings_account_balance';
    try {
      // Check if settings row exists
      const { data: existing } = await supabase.from('settings').select('id').eq('user_id', user.id).single();
      if (existing) {
        await supabase.from('settings').update({ [col]: numVal }).eq('user_id', user.id);
      } else {
        await supabase.from('settings').insert({ user_id: user.id, [col]: numVal });
      }
      setSettings(prev => ({ ...prev, [editingField === 'income' ? 'income' : 'savings']: numVal }));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
    setEditingField(null);
  };

  // Close Month & Rollover: per original v1 logic
  // 1. Set all unpaid current bills to "Paid" with today's date
  // 2. Save current Total Available Cash as new Savings Account Balance
  // 3. Generate next month's bills from recurring_bills
  const isLastWeekOfMonth = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return now.getDate() >= (lastDay - 6); // last 7 days of the month
  };

  const getDaysUntilLastWeek = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const lastWeekStart = lastDay - 6;
    return lastWeekStart - now.getDate();
  };

  const executeCloseMonth = async () => {
    setShowCloseMonthModal(false);
    try {
      // 1. Mark all unpaid current bills as Paid
      const unpaidBills = dashboardData.currentBills.filter(b => b.status !== 'Paid');
      for (const bill of unpaidBills) {
        await supabase.from('bills').update({ status: 'Paid', paid_date: new Date().toISOString() }).eq('id', bill.id);
      }

      // 2. Update savings to netPosition, reset income to 0 for the new month
      const { data: existing } = await supabase.from('settings').select('id').eq('user_id', user.id).single();
      if (existing) {
        await supabase.from('settings').update({ savings_account_balance: netPosition, monthly_income: 0 }).eq('user_id', user.id);
      } else {
        await supabase.from('settings').insert({ user_id: user.id, savings_account_balance: netPosition, monthly_income: 0 });
      }

      // 3. Generate next month's bills from recurring billers
      const nextMonth = getNextMonthStr();
      const { data: billers } = await supabase.from('recurring_bills').select('*').eq('user_id', user.id);
      if (billers && billers.length > 0) {
        const newBills = billers.map(rb => ({
          biller: rb.biller,
          month: nextMonth,
          statement_date: rb.statement_date,
          due_date: rb.due_date,
          amount: 0,
          status: 'Unpaid',
          channel: rb.channel,
          user_id: user.id
        }));
        await supabase.from('bills').insert(newBills);
      }

      fetchDashboardData();
    } catch (e) {
      console.error('Failed to close month', e);
      alert('Something went wrong during rollover.');
    }
  };

  // Greeting logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getDisplayName = () => {
    const email = user?.email || '';
    const local = email.split('@')[0] || '';
    // Use the last segment after dots (e.g. iim.orestes -> Orestes)
    const parts = local.split('.');
    const name = parts[parts.length - 1];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const handleActionItemsClick = () => {
    setActiveTab('active');
    if (firstDueBillId) {
      // Small delay to let tab switch render first
      setTimeout(() => setScrollToBillId(firstDueBillId), 100);
    }
  };

  const startingFunds = settings.income + settings.savings;
  const totalOutflows = dashboardData.summary.billsThisMonth + dashboardData.summary.totalWithdrawn;
  const netPosition = startingFunds - totalOutflows;
  
  const remainingThisMonth = dashboardData.summary.billsThisMonth - dashboardData.summary.paidThisMonth;
  const progressPercent = dashboardData.summary.countTotal > 0 
    ? (dashboardData.summary.countPaid / dashboardData.summary.countTotal) * 100 
    : 0;

  const unpaidActiveCount = dashboardData.summary.countTotal - dashboardData.summary.countPaid;

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png" alt="Bill Tracker Logo" style={{ height: '40px', width: '40px', objectFit: 'contain', borderRadius: '10px' }} />
          <h1 style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 'bold', margin: 0, lineHeight: 1 }}>Monthly Bill Tracker</h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
           <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
             <button onClick={toggleTheme} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: 0 }}>
               {theme === 'dark' ? '🌙' : '☀️'}
             </button>
             <button onClick={handleLogout} title="Log Out" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)', color: 'var(--danger)', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <LogOut size={18} />
             </button>
           </div>
           <div 
             className={actionItemsDue > 0 ? 'action-items-pulse' : ''}
             style={{ fontSize: '12px', color: actionItemsDue > 0 ? 'var(--warning)' : 'var(--success)', cursor: 'pointer', fontWeight: 'bold' }} 
             onClick={handleActionItemsClick}
           >
             {actionItemsDue > 0 ? `You have ${actionItemsDue} action item(s) due!` : 'No action items due! ✓'}
           </div>
        </div>
      </header>

      {/* SUMMARY WIDGETS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Total Available Cash */}
        <div className="glass-card animate-fade-up" style={{ padding: '20px' }}>
          <div 
            onClick={() => setSummaryExpanded(!summaryExpanded)} 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}
          >
            <span>Financial Overview</span>
            {summaryExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          
          {summaryExpanded ? (
            <div>
               <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Starting Funds</div>
               <div style={{ paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '12px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span>Savings Account Balance</span>
                   {editingField === 'savings' ? (
                     <input
                       type="number"
                       value={editingValue}
                       onChange={e => setEditingValue(e.target.value)}
                       onBlur={saveSettingsField}
                       onKeyDown={e => { if (e.key === 'Enter') saveSettingsField(); }}
                       autoFocus
                       style={{ width: '120px', textAlign: 'right', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--accent)', padding: '4px 8px', borderRadius: '4px', color: '#fff', fontWeight: 'bold', outline: 'none' }}
                     />
                   ) : (
                     <span onClick={() => startEditingField('savings')} style={{ fontWeight: 'bold', cursor: 'pointer', borderBottom: '1px dashed var(--text-muted)' }} title="Click to edit">
                       {settings.savings.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                     </span>
                   )}
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span>Monthly Income</span>
                   {editingField === 'income' ? (
                     <input
                       type="number"
                       value={editingValue}
                       onChange={e => setEditingValue(e.target.value)}
                       onBlur={saveSettingsField}
                       onKeyDown={e => { if (e.key === 'Enter') saveSettingsField(); }}
                       autoFocus
                       style={{ width: '120px', textAlign: 'right', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--accent)', padding: '4px 8px', borderRadius: '4px', color: '#fff', fontWeight: 'bold', outline: 'none' }}
                     />
                   ) : (
                     <span onClick={() => startEditingField('income')} style={{ fontWeight: 'bold', cursor: 'pointer', borderBottom: '1px dashed var(--text-muted)' }} title="Click to edit">
                       {settings.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                     </span>
                   )}
                 </div>
               </div>

               <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Minus Outflows</div>
               <div style={{ paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                   <span>Bills This Month</span>
                   <span style={{ fontWeight: 'bold' }}>-{dashboardData.summary.billsThisMonth.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                 </div>
                 <div 
                   onClick={() => setActiveTab('cashLog')}
                   style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)', cursor: 'pointer', textDecoration: 'underline' }}
                   title="Click to view Cash Log"
                 >
                   <span>Cash Withdrawn</span>
                   <span style={{ fontWeight: 'bold' }}>-{dashboardData.summary.totalWithdrawn.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                 </div>
               </div>

               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '2px dashed var(--glass-border)' }}>
                 <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Total Available Cash</span>
                 <span style={{ fontSize: '24px', fontWeight: '900', color: 'var(--success)', textShadow: '0 0 12px rgba(16,185,129,0.4)' }}>
                   {netPosition.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                 </span>
               </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Total Available Cash</span>
              <span style={{ fontSize: '24px', fontWeight: '900', color: 'var(--success)', textShadow: '0 0 12px rgba(16,185,129,0.4)' }}>
                {netPosition.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* Total Outflows / Month End */}
        <div className="glass-card animate-fade-up" style={{ animationDelay: '0.1s', padding: '20px' }}>
          <div 
            onClick={() => setSummaryExpanded(!summaryExpanded)} 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}
          >
            <span>Month-End Summary</span>
            {summaryExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          
          {summaryExpanded ? (
            <div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                 <span>Bills This Month</span>
                 <span style={{ fontWeight: 'bold' }}>{dashboardData.summary.billsThisMonth.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                 <span>Paid</span>
                 <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>{dashboardData.summary.paidThisMonth.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                 <span>Remaining</span>
                 <span style={{ fontWeight: 'bold', color: 'var(--warning)' }}>{remainingThisMonth.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
               </div>
               
               <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--success)', transition: 'width 0.5s ease' }}></div>
               </div>
               <div style={{ textAlign: 'right', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                 {dashboardData.summary.countPaid} / {dashboardData.summary.countTotal} Bills Paid
               </div>

               <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '2px dashed var(--glass-border)' }}>
                 <button 
                   onClick={() => setShowCloseMonthModal(true)}
                   style={{ width: '100%', background: 'transparent', border: '1px solid var(--success)', color: 'var(--success)', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                   onMouseOver={e => { e.target.style.background = 'var(--success)'; e.target.style.color = '#0f172a'; }}
                   onMouseOut={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--success)'; }}
                 >
                   Close Month & Rollover
                 </button>
               </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Total Outflows</span>
              <span style={{ fontSize: '24px', fontWeight: '900', color: 'var(--danger)' }}>
                -{totalOutflows.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* CONTROLS & TABS */}
      {/* CONTROLS & TABS */}
      <div className="desktop-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', background: 'var(--glass-bg)', padding: '6px', borderRadius: '14px', border: '1px solid var(--glass-border)', overflowX: 'auto' }}>
          <TabButton active={activeTab === 'active'} onClick={() => setActiveTab('active')} badge={unpaidActiveCount}>
            📅 Active
          </TabButton>
          <TabButton active={activeTab === 'incoming'} onClick={() => setActiveTab('incoming')}>
            📥 Incoming
          </TabButton>
          <TabButton active={activeTab === 'previous'} onClick={() => setActiveTab('previous')}>
            ⏳ Previous
          </TabButton>
          <TabButton active={activeTab === 'cashLog'} onClick={() => setActiveTab('cashLog')}>
            📊 Cash Log
          </TabButton>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="mobile-hidden" onClick={() => setIsWithdrawOpen(true)} style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '8px 16px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            − Withdraw
          </button>
          <button onClick={() => setIsAddBillerOpen(true)} style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '8px 16px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            + Add Biller
          </button>
          <button onClick={() => setIsRemoveBillerOpen(true)} style={{ background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            ✎ Remove Biller
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading dashboard...</div>
      ) : (
        <div className="animate-fade-up">
          {activeTab === 'active' && (
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ▼ {dashboardData.currentMonth} (Current)
              </div>
              <BillList 
                bills={dashboardData.currentBills} 
                onScanRequest={() => setIsScanning(true)} 
                onAmountUpdate={handleAmountUpdate} 
                urgencyMap={urgencyMap}
                scrollToBillId={scrollToBillId}
                onScrollComplete={() => setScrollToBillId(null)}
              />
            </div>
          )}

          {activeTab === 'incoming' && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {dashboardData.upcomingMonth ? (
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden', fontStyle: 'normal', textAlign: 'left' }}>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', fontWeight: 'bold' }}>
                    ▼ {dashboardData.upcomingMonth} (Upcoming)
                  </div>
                  <BillList bills={dashboardData.upcomingBills} onAmountUpdate={handleAmountUpdate} />
                </div>
              ) : (
                <p>No incoming bills generated for next month yet.<br/>They will appear here automatically on the 15th.</p>
              )}
            </div>
          )}

          {activeTab === 'previous' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sortMonthsDescending(Object.keys(dashboardData.historyMonths)).map(month => {
                const isExpanded = expandedPreviousMonth === month;
                return (
                  <div key={month} className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div 
                      onClick={() => setExpandedPreviousMonth(isExpanded ? null : month)}
                      style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      {isExpanded ? '▼' : '▶'} {month}
                    </div>
                    {isExpanded && <BillList bills={dashboardData.historyMonths[month]} onAmountUpdate={handleAmountUpdate} isHistory={true} />}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'cashLog' && (
            <CashLog withdrawals={dashboardData.recentWithdrawals} />
          )}
        </div>
      )}

      {isAddBillerOpen && <AddBillerModal onClose={() => setIsAddBillerOpen(false)} onBillerAdded={fetchDashboardData} />}
      {isRemoveBillerOpen && <RemoveBillerModal onClose={() => setIsRemoveBillerOpen(false)} onBillerRemoved={fetchDashboardData} />}
      {isWithdrawOpen && <WithdrawModal onClose={() => setIsWithdrawOpen(false)} onWithdrawalAdded={fetchDashboardData} />}
      
      {isScanning && (
        <OCRScanner 
          onClose={() => setIsScanning(false)} 
          onScanResult={(amount) => {
            setIsScanning(false);
            if (amount > 0) alert(`Scanned Amount: ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
          }} 
        />
      )}

      {/* Close Month Modal */}
      {showCloseMonthModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-card animate-fade-up" style={{ width: '100%', maxWidth: '420px', padding: '32px', textAlign: 'center' }}>
            {isLastWeekOfMonth() ? (
              <>
                <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '22px' }}>Close the Month?</h2>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 0 24px' }}>
                  This will lock in your Total Available Cash (<span style={{ color: 'var(--success)', fontWeight: 'bold' }}>₱{netPosition.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>) and roll it over into your Savings Account Balance for next month.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => setShowCloseMonthModal(false)}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeCloseMonth}
                    style={{ flex: 1, background: 'var(--success)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                  >
                    Confirm
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '22px' }}>Not Yet!</h2>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 0 8px' }}>
                  <span style={{ color: 'var(--warning)', fontWeight: 'bold', fontSize: '18px' }}>{getDaysUntilLastWeek()} day(s)</span> before you can close the Month End.
                </p>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 0 24px', fontSize: '13px' }}>
                  This will lock in your Total Available Cash (<span style={{ color: 'var(--success)', fontWeight: 'bold' }}>₱{netPosition.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>) and roll it over into your Savings Account Balance for next month.
                </p>
                <button
                  onClick={() => setShowCloseMonthModal(false)}
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                >
                  Got it
                </button>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav">
        <button onClick={() => setActiveTab('active')} style={{ background: 'none', border: 'none', color: activeTab === 'active' ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <Home size={24} />
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>Home</span>
        </button>
        <button onClick={handleActionItemsClick} style={{ background: 'none', border: 'none', color: actionItemsDue > 0 ? 'var(--warning)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', position: 'relative' }}>
          <AlertCircle size={24} />
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>Due Bills</span>
          {actionItemsDue > 0 && <span style={{ position: 'absolute', top: '-4px', right: '4px', background: 'var(--danger)', color: '#fff', fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{actionItemsDue}</span>}
        </button>
        <button onClick={() => setActiveTab('cashLog')} style={{ background: 'none', border: 'none', color: activeTab === 'cashLog' ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <FileText size={24} />
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>Cash Log</span>
        </button>
        <button onClick={() => setIsWithdrawOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--danger)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <MinusCircle size={24} />
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>Withdraw</span>
        </button>
      </div>
    </div>
  );
}

function TabButton({ children, active, onClick, badge }) {
  return (
    <button 
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? '#0f172a' : 'var(--text-muted)',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '10px',
        fontWeight: 'bold',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {children}
      {badge > 0 && (
        <span style={{ 
          background: active ? '#0f172a' : 'var(--danger)', 
          color: active ? 'var(--danger)' : '#fff', 
          padding: '2px 6px', 
          borderRadius: '12px', 
          fontSize: '11px', 
          fontWeight: '900' 
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}
