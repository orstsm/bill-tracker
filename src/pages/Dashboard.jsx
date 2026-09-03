import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/auth';
import { supabase } from '../lib/supabase';
import { getCurrentMonthStr, getNextMonthStr, parseDueDateLogic, withTimeout, getMondaysUntilNextFifth } from '../lib/utils';
import useSwipeNav from '../hooks/useSwipeNav';
import IosDashboard from '../components/IosDashboard';

const TAB_ORDER = ['active', 'due', 'cashLog', 'settings'];

export default function Dashboard() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('active');
  const [homeTab, setHomeTab] = useState('current');
  const [detailSheet, setDetailSheet] = useState(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isAddBillerOpen, setIsAddBillerOpen] = useState(false);
  const [isRemoveBillerOpen, setIsRemoveBillerOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isAddSubOpen, setIsAddSubOpen] = useState(false);

  // Expandable states (shared/mutually exclusive)
  const [currentMonthExpanded, setCurrentMonthExpanded] = useState(false);
  const [earlyRolloverExpanded, setEarlyRolloverExpanded] = useState(false);
  const [expandedPreviousMonth, setExpandedPreviousMonth] = useState(null);
  const [showCloseMonthModal, setShowCloseMonthModal] = useState(false);
  const [pendingAutoRollover, setPendingAutoRollover] = useState(null);

  // Inline editing for settings
  const [editingField, setEditingField] = useState(null); // 'income', 'savings', or 'weeklyBudget'
  const [editingValue, setEditingValue] = useState('');

  // Data states
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ income: 0, savings: 0, weeklyBudget: 5000 });
  const [actionItemsDue, setActionItemsDue] = useState(0);
  const [urgencyMap, setUrgencyMap] = useState({}); // { billId: 'warn3' | 'warn7' }
  const [firstDueBillId, setFirstDueBillId] = useState(null);
  const [scrollToBillId, setScrollToBillId] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    appActiveMonth: '',
    earlyRolloverMonth: null,
    earlyRolloverBills: [],
    upcomingMonth: null,
    currentBills: [],
    upcomingBills: [],
    subscriptions: [],
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

  const switchTab = useCallback((tab) => {
    setActiveTab(tab);
    setIsAddMenuOpen(false);
    setIsAddBillerOpen(false);
    setIsRemoveBillerOpen(false);
    setIsWithdrawOpen(false);
    setIsAddSubOpen(false);
    setShowCloseMonthModal(false);
  }, []);

  const anyModalOpen = isAddMenuOpen || isAddBillerOpen || isRemoveBillerOpen || isWithdrawOpen || isAddSubOpen || showCloseMonthModal || Boolean(detailSheet);
  const activeIndex = TAB_ORDER.indexOf(activeTab);
  const handleSwipeIndexChange = useCallback((index) => switchTab(TAB_ORDER[index]), [switchTab]);

  const { viewportRef, trackRef, scrollToIndex } = useSwipeNav({
    activeIndex,
    count: TAB_ORDER.length,
    onIndexChange: handleSwipeIndexChange,
    disabled: anyModalOpen,
  });

  const navigateToTab = useCallback((tab) => {
    const nextIndex = TAB_ORDER.indexOf(tab);
    if (nextIndex >= 0) scrollToIndex(nextIndex, true);
    switchTab(tab);
  }, [scrollToIndex, switchTab]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let sData, bData, wData, subData, rbData = [];

      let fetchSuccess = false;

      if (navigator.onLine) {
        try {
          const [sRes, bRes, wRes, subRes, rbRes] = await withTimeout(Promise.all([
            supabase.from('settings').select('*').eq('user_id', user.id).single(),
            supabase.from('bills').select('*').eq('user_id', user.id).order('id', { ascending: false }),
            supabase.from('withdrawals').select('*').eq('user_id', user.id),
            supabase.from('subscriptions').select('*').eq('user_id', user.id).order('renewal_date', { ascending: true }),
            supabase.from('recurring_bills').select('*').eq('user_id', user.id)
          ]), 5000);

          if (sRes.error && sRes.error.code !== 'PGRST116') throw sRes.error;
          if (bRes.error) throw bRes.error;
          if (wRes.error) throw wRes.error;
          if (subRes.error) throw subRes.error;

          sData = sRes.data;
          bData = bRes.data;
          wData = wRes.data;
          subData = subRes.data;
          rbData = rbRes.data;

          fetchSuccess = true;
          localStorage.setItem('offline_dashboard_data', JSON.stringify({ sData, bData, wData, subData: subRes.data, rbData: rbRes.data }));
        } catch (e) {
          console.warn("Live fetch failed or timed out, falling back to cache", e);
        }
      }

      if (!fetchSuccess) {
        const cache = JSON.parse(localStorage.getItem('offline_dashboard_data') || '{}');
        sData = cache.sData || null;
        bData = cache.bData || [];
        wData = cache.wData || [];
        subData = cache.subData || [];
        rbData = cache.rbData || [];
      }

      const weeklyBudgetStorageKey = `weekly_budget:${user.id}`;
      const cachedWeeklyBudget = Number(localStorage.getItem(weeklyBudgetStorageKey));
      const hasDatabaseWeeklyBudget = sData?.weekly_budget !== null && sData?.weekly_budget !== undefined;
      const databaseWeeklyBudget = hasDatabaseWeeklyBudget ? Number(sData.weekly_budget) : NaN;
      const weeklyBudget = Number.isFinite(databaseWeeklyBudget)
        ? databaseWeeklyBudget
        : (Number.isFinite(cachedWeeklyBudget) && cachedWeeklyBudget >= 0 ? cachedWeeklyBudget : 5000);

      if (Number.isFinite(databaseWeeklyBudget)) {
        localStorage.setItem(weeklyBudgetStorageKey, String(databaseWeeklyBudget));
      }

      const stgs = {
        income: sData?.monthly_income || 0,
        savings: sData?.savings_account_balance || 0,
        weeklyBudget,
      };
      setSettings(stgs);

      const currentCalMonth = getCurrentMonthStr();
      const nextCalMonth = getNextMonthStr();
      const d = new Date();
      d.setDate(1); // Prevent 31st overflow bug
      d.setMonth(d.getMonth() - 1);
      const prevCalMonth = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      const todayDay = new Date().getDate();

      // CLEANUP: Delete prematurely generated October bills caused by JS Date overflow bug
      if (currentCalMonth === 'August 2026') {
        const hasOctBills = (bData || []).some(b => b.month === 'October 2026' && Number(b.amount) === 0);
        if (hasOctBills) {
          if (navigator.onLine) {
            await supabase.from('bills').delete().eq('month', 'October 2026').eq('user_id', user.id).eq('amount', 0);
          }
          bData = bData.filter(b => !(b.month === 'October 2026' && Number(b.amount) === 0));
        }
      }

      // Detect Rollovers
      const hasRolledOverCurrent = (wData || []).some(w => Number(w.amount) === 0 && w.reason === `ROLLOVER_${currentCalMonth}`);
      const hasRolledOverPrev = (wData || []).some(w => Number(w.amount) === 0 && w.reason === `ROLLOVER_${prevCalMonth}`);
      const prevMonthHasBills = (bData || []).some(b => b.month === prevCalMonth);

      // Auto-Rollover Guard
      if (prevMonthHasBills && !hasRolledOverPrev) {
        setPendingAutoRollover(prevCalMonth);
      } else {
        setPendingAutoRollover(null);
      }

      let appActiveMonth = currentCalMonth;
      let earlyRolloverMonth = null;
      if (hasRolledOverCurrent) {
        appActiveMonth = nextCalMonth;
        earlyRolloverMonth = currentCalMonth;
      }

      // Auto-generate upcoming bills on the 15th
      let upcomingBillsExist = (bData || []).some(b => b.month === nextCalMonth);
      if (todayDay >= 15 && !upcomingBillsExist && (rbData || []).length > 0 && navigator.onLine) {
        const newBills = (rbData || []).map(rb => ({
          biller: rb.biller,
          month: nextCalMonth,
          statement_date: rb.statement_date,
          due_date: rb.due_date,
          amount: 0,
          status: 'Unpaid',
          channel: rb.channel,
          user_id: user.id
        }));
        const { data: insertedBills } = await supabase.from('bills').insert(newBills).select();
        if (insertedBills) {
          bData = [...(bData || []), ...insertedBills];
        }
      }

      // TEMP SYNC: If user manually updated recurring_bills, sync those missing fields to the generated bills
      if (navigator.onLine && (rbData || []).length > 0 && (bData || []).length > 0) {
        const billsToUpdate = bData.filter(b => (b.month === appActiveMonth || b.month === nextCalMonth) && !b.due_date);
        if (billsToUpdate.length > 0) {
          for (let b of billsToUpdate) {
            const rb = rbData.find(r => r.biller === b.biller);
            if (rb && (rb.due_date || rb.statement_date || rb.channel)) {
              await supabase.from('bills').update({
                due_date: rb.due_date,
                statement_date: rb.statement_date,
                channel: rb.channel
              }).eq('id', b.id);
              b.due_date = rb.due_date;
              b.statement_date = rb.statement_date;
              b.channel = rb.channel;
            }
          }
        }
      }

      let billsThisMonthSum = 0;
      let paidThisMonthSum = 0;
      let countPaid = 0;
      let countTotal = 0;
      let totalWithdrawn = 0;

      const currentBills = [];
      const earlyRolloverBills = [];
      const upcomingBills = [];
      const rawHistory = {};
      const rawWithdrawals = {};

      (wData || []).forEach(w => {
        const amt = Number(w.amount);
        if (amt === 0) return; 

        if (!rawWithdrawals[w.month]) rawWithdrawals[w.month] = { total: 0, logs: [] };
        rawWithdrawals[w.month].logs.push(w);
        rawWithdrawals[w.month].total += amt;

        if (w.month === appActiveMonth) {
          totalWithdrawn += amt;
        }
      });

      (bData || []).forEach(b => {
        const amt = Number(b.amount) || 0;
        const isPassThrough = (b.channel || '').toUpperCase().includes('CC');
        const isPaid = b.status === 'Paid';

        if (b.month === appActiveMonth) {
          currentBills.push(b);
          countTotal++;
          if (isPaid) countPaid++;
          if (!isPassThrough) {
            billsThisMonthSum += amt;
            if (isPaid) paidThisMonthSum += amt;
          }
        } else if (earlyRolloverMonth && b.month === earlyRolloverMonth) {
          earlyRolloverBills.push(b);
        } else if (b.month === nextCalMonth && appActiveMonth !== nextCalMonth && todayDay >= 15) {
          upcomingBills.push(b);
        } else {
          if (!rawHistory[b.month]) rawHistory[b.month] = [];
          rawHistory[b.month].push(b);
        }
      });

      const sortByDueDate = (a, b) => {
        const dA = parseDueDateLogic(a.due_date, a.month);
        const dB = parseDueDateLogic(b.due_date, b.month);
        if (!dA && !dB) return (b.id || 0) - (a.id || 0); // Maintain id DESC (newest at top) for empty due dates
        if (!dA) return 1;
        if (!dB) return -1;
        return dA.getTime() - dB.getTime();
      };

      currentBills.sort(sortByDueDate);
      earlyRolloverBills.sort(sortByDueDate);
      upcomingBills.sort(sortByDueDate);
      Object.keys(rawHistory).forEach(m => rawHistory[m].sort(sortByDueDate));

      setDashboardData({
        appActiveMonth,
        earlyRolloverMonth,
        earlyRolloverBills,
        upcomingMonth: todayDay >= 15 ? nextCalMonth : null,
        currentBills,
        upcomingBills,
        subscriptions: subData,
        historyMonths: rawHistory,
        recentWithdrawals: rawWithdrawals,
        summary: { billsThisMonth: billsThisMonthSum, paidThisMonth: paidThisMonthSum, totalWithdrawn, countPaid, countTotal }
      });

      // Action items due: build urgency map and count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let dueCount = 0;
      const newUrgencyMap = {};
      let firstDue = null;

      const checkBillDue = (b, monthStr) => {
        if (b.status !== 'Paid') {
          const dueDate = parseDueDateLogic(b.due_date, monthStr);
          if (dueDate) {
            const target = new Date(dueDate);
            target.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
      };

      currentBills.forEach(b => checkBillDue(b, appActiveMonth));
      if (earlyRolloverMonth) {
        earlyRolloverBills.forEach(b => checkBillDue(b, earlyRolloverMonth));
      }

      (subData || []).forEach(sub => {
        if (sub.status === 'Active' && sub.renewal_date) {
          const renewal = new Date(sub.renewal_date);
          renewal.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 5) {
            dueCount++;
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
  }, [user]);

  useEffect(() => {
    const handleOnline = async () => {
      try {
        const queue = JSON.parse(localStorage.getItem('offline_withdrawals') || '[]');
        if (queue.length > 0) {
          console.log('Syncing offline withdrawals...', queue);
          for (const item of queue) {
            const payload = { amount: item.amount, reason: item.reason, month: item.month, user_id: item.user_id };
            await supabase.from('withdrawals').insert(payload);
          }
          localStorage.removeItem('offline_withdrawals');
        }

        const updatesQueue = JSON.parse(localStorage.getItem('offline_bill_updates') || '[]');
        if (updatesQueue.length > 0) {
          console.log('Syncing offline bill updates...', updatesQueue);
          for (const update of updatesQueue) {
            await supabase.from('bills').update(update.payload).eq('id', update.billId);
          }
          localStorage.removeItem('offline_bill_updates');
        }

        if (queue.length > 0 || updatesQueue.length > 0) fetchDashboardData(true);
      } catch (error) {
        console.warn('Background sync failed; preserving the offline queue.', error);
      }
    };

    window.addEventListener('online', handleOnline);
    if (navigator.onLine && user) handleOnline();
    if (user) fetchDashboardData();
    return () => window.removeEventListener('online', handleOnline);
  }, [user, fetchDashboardData]);

  const updateLocalCache = (billId, payload) => {
    const cache = JSON.parse(localStorage.getItem('offline_dashboard_data') || '{}');
    if (cache.bData) {
      cache.bData = cache.bData.map(b => b.id === billId ? { ...b, ...payload } : b);
      localStorage.setItem('offline_dashboard_data', JSON.stringify(cache));
      // Trigger a silent re-fetch so UI updates instantly based on modified cache
      fetchDashboardData(true);
    }
  };

  const handleAmountUpdate = async (billId, newAmount, isFinal = false) => {
    try {
      const payload = { amount: newAmount };
      if (isFinal) {
        payload.is_final = true;
        payload.final_date = new Date().toISOString();
      }

      let success = false;
      if (navigator.onLine) {
        try {
          const { error } = await withTimeout(supabase.from('bills').update(payload).eq('id', billId), 4000);
          if (error) throw error;
          success = true;
          fetchDashboardData(true); // Silent fetch to prevent flicker
        } catch {
          console.warn("Live update failed or timed out, falling back to offline queue");
        }
      }

      if (!success) {
        const queue = JSON.parse(localStorage.getItem('offline_bill_updates') || '[]');
        queue.push({ billId, payload });
        localStorage.setItem('offline_bill_updates', JSON.stringify(queue));
        updateLocalCache(billId, payload);
        alert("Network unreachable. Amount saved locally and will sync later.");
      }
    } catch (e) {
      console.error("Failed to update amount", e);
    }
  };

  const handleMarkAsPaid = async (billId) => {
    try {
      const payload = { status: 'Paid', paid_date: new Date().toISOString() };

      let success = false;
      if (navigator.onLine) {
        try {
          const { error } = await withTimeout(supabase.from('bills').update(payload).eq('id', billId), 4000);
          if (error) throw error;
          success = true;
          
          // Check if this was the last unpaid bill
          const unpaidRemaining = dashboardData.currentBills.filter(b => b.status !== 'Paid' && b.id !== billId);
          if (unpaidRemaining.length === 0) {
            const bill = dashboardData.currentBills.find(b => b.id === billId);
            const newNet = netPosition - (bill && !(bill.channel || '').toUpperCase().includes('CC') ? Number(bill.amount) : 0);
            
            fetch('/api/telegram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: `🎉 All <b>${dashboardData.appActiveMonth}</b> bills have been paid!\n\nYour total available cash is <b>₱${newNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>.\n\nCheck the app to review!`
              })
            }).catch(console.error);
          }

          fetchDashboardData(true);
        } catch {
          console.warn("Live mark paid failed or timed out, falling back to offline queue");
        }
      }

      if (!success) {
        const queue = JSON.parse(localStorage.getItem('offline_bill_updates') || '[]');
        queue.push({ billId, payload });
        localStorage.setItem('offline_bill_updates', JSON.stringify(queue));
        updateLocalCache(billId, payload);
        alert("Network unreachable. Bill marked as paid locally and will sync later.");
      }
    } catch (e) {
      console.error("Failed to mark as paid", e);
    }
  };

  const handleIgnoreRenew = async (sub) => {
    try {
      if (!navigator.onLine) {
        alert("You must be online to update subscriptions.");
        return;
      }
      const current = new Date(sub.renewal_date);
      let nextDate = new Date(current);
      if (sub.cycle === 'Monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }

      const { error } = await supabase.from('subscriptions').update({ renewal_date: nextDate.toISOString() }).eq('id', sub.id);
      if (error) throw error;
      fetchDashboardData(true);
    } catch (e) {
      console.error("Failed to renew subscription", e);
      alert("Failed to update subscription");
    }
  };

  const handleCancelSub = async (sub) => {
    try {
      if (!navigator.onLine) {
        alert("You must be online to cancel subscriptions.");
        return;
      }
      const { error } = await supabase.from('subscriptions').delete().eq('id', sub.id);
      if (error) throw error;
      fetchDashboardData(true);
    } catch (e) {
      console.error("Failed to cancel subscription", e);
      alert("Failed to cancel subscription");
    }
  };

  // Inline settings editing
  const startEditingField = (field) => {
    setEditingField(field);
    setEditingValue(String({
      income: settings.income,
      savings: settings.savings,
      weeklyBudget: settings.weeklyBudget,
    }[field] ?? ''));
  };

  const saveSettingsField = async () => {
    if (!editingField) return;
    const numVal = parseFloat(editingValue.replace(/,/g, ''));
    if (isNaN(numVal)) { setEditingField(null); return; }

    if (numVal < 0) { setEditingField(null); return; }

    const fieldConfig = {
      income: { column: 'monthly_income', stateKey: 'income' },
      savings: { column: 'savings_account_balance', stateKey: 'savings' },
      weeklyBudget: { column: 'weekly_budget', stateKey: 'weeklyBudget' },
    }[editingField];
    if (!fieldConfig) { setEditingField(null); return; }

    const fieldBeingSaved = editingField;
    const { column, stateKey } = fieldConfig;

    if (fieldBeingSaved === 'weeklyBudget') {
      localStorage.setItem(`weekly_budget:${user.id}`, String(numVal));
    }

    try {
      // Check if settings row exists
      const { data: existing } = await supabase.from('settings').select('id').eq('user_id', user.id).single();
      let saveResult;
      if (existing) {
        saveResult = await supabase.from('settings').update({ [column]: numVal }).eq('user_id', user.id);
      } else {
        saveResult = await supabase.from('settings').insert({ user_id: user.id, [column]: numVal });
      }

      if (saveResult.error) {
        if (fieldBeingSaved === 'weeklyBudget') {
          console.warn('Weekly budget saved on this device. Apply the weekly_budget database migration to sync it across devices.', saveResult.error);
        } else {
          throw saveResult.error;
        }
      }

      setSettings(prev => ({ ...prev, [stateKey]: numVal }));
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

  const executeCloseMonth = async (targetMonth = dashboardData.appActiveMonth) => {
    setShowCloseMonthModal(false);
    setPendingAutoRollover(null);
    try {
      // 1. Mark all unpaid current bills for the target month as Paid
      const billsToClose = dashboardData.currentBills.concat(dashboardData.earlyRolloverBills || []).concat(dashboardData.historyMonths[targetMonth] || []);
      const unpaidBills = billsToClose.filter(b => b.month === targetMonth && b.status !== 'Paid');
      
      for (const bill of unpaidBills) {
        await supabase.from('bills').update({ status: 'Paid', paid_date: new Date().toISOString() }).eq('id', bill.id);
      }

      // 2. Update savings to netPosition, reset income to 0 for the new month
      const currentNetPosition = netPosition;
      const { data: existing } = await supabase.from('settings').select('id').eq('user_id', user.id).single();
      if (existing) {
        await supabase.from('settings').update({ savings_account_balance: currentNetPosition, monthly_income: 0 }).eq('user_id', user.id);
      } else {
        await supabase.from('settings').insert({ user_id: user.id, savings_account_balance: currentNetPosition, monthly_income: 0 });
      }

      // 3. Insert ROLLOVER placeholder to mark the month as closed
      await supabase.from('withdrawals').insert({
        month: targetMonth,
        amount: 0,
        reason: `ROLLOVER_${targetMonth}`,
        date: new Date().toISOString(),
        user_id: user.id
      });

      fetchDashboardData();
    } catch (e) {
      console.error('Failed to close month', e);
      alert('Something went wrong during rollover.');
    }
  };

  const getDisplayName = () => {
    const email = user?.email || '';
    const local = email.split('@')[0] || '';
    // Use the last segment after dots (e.g. iim.orestes -> Orestes)
    const parts = local.split('.');
    const name = parts[parts.length - 1];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const startingFunds = settings.income + settings.savings;
  const totalOutflows = dashboardData.summary.billsThisMonth + dashboardData.summary.totalWithdrawn;
  const netPosition = startingFunds - totalOutflows;

  const remainingThisMonth = dashboardData.summary.billsThisMonth - dashboardData.summary.paidThisMonth;
  const progressPercent = dashboardData.summary.countTotal > 0
    ? (dashboardData.summary.countPaid / dashboardData.summary.countTotal) * 100
    : 0;

  const unpaidActiveCount = dashboardData.summary.countTotal - dashboardData.summary.countPaid;

  const remainingMondays = getMondaysUntilNextFifth();

  return (
    <IosDashboard
      activeTab={activeTab}
      switchTab={switchTab}
      navigateToTab={navigateToTab}
      homeTab={homeTab}
      setHomeTab={setHomeTab}
      detailSheet={detailSheet}
      setDetailSheet={setDetailSheet}
      viewportRef={viewportRef}
      trackRef={trackRef}
      dashboardData={dashboardData}
      settings={settings}
      actionItemsDue={actionItemsDue}
      firstDueBillId={firstDueBillId}
      urgencyMap={urgencyMap}
      scrollToBillId={scrollToBillId}
      setScrollToBillId={setScrollToBillId}
      currentMonthExpanded={currentMonthExpanded}
      setCurrentMonthExpanded={setCurrentMonthExpanded}
      earlyRolloverExpanded={earlyRolloverExpanded}
      setEarlyRolloverExpanded={setEarlyRolloverExpanded}
      expandedPreviousMonth={expandedPreviousMonth}
      setExpandedPreviousMonth={setExpandedPreviousMonth}
      editingField={editingField}
      editingValue={editingValue}
      setEditingValue={setEditingValue}
      startEditingField={startEditingField}
      saveSettingsField={saveSettingsField}
      setIsAddMenuOpen={setIsAddMenuOpen}
      isAddMenuOpen={isAddMenuOpen}
      setIsAddBillerOpen={setIsAddBillerOpen}
      setIsRemoveBillerOpen={setIsRemoveBillerOpen}
      setIsWithdrawOpen={setIsWithdrawOpen}
      setIsAddSubOpen={setIsAddSubOpen}
      isAddBillerOpen={isAddBillerOpen}
      isRemoveBillerOpen={isRemoveBillerOpen}
      isWithdrawOpen={isWithdrawOpen}
      isAddSubOpen={isAddSubOpen}
      showCloseMonthModal={showCloseMonthModal}
      setShowCloseMonthModal={setShowCloseMonthModal}
      pendingAutoRollover={pendingAutoRollover}
      executeCloseMonth={executeCloseMonth}
      isLastWeekOfMonth={isLastWeekOfMonth}
      getDaysUntilLastWeek={getDaysUntilLastWeek}
      handleAmountUpdate={handleAmountUpdate}
      handleMarkAsPaid={handleMarkAsPaid}
      handleIgnoreRenew={handleIgnoreRenew}
      handleCancelSub={handleCancelSub}
      handleLogout={handleLogout}
      fetchDashboardData={fetchDashboardData}
      getDisplayName={getDisplayName}
      loading={loading}
      netPosition={netPosition}
      totalOutflows={totalOutflows}
      remainingThisMonth={remainingThisMonth}
      progressPercent={progressPercent}
      unpaidActiveCount={unpaidActiveCount}
      remainingMondays={remainingMondays}
    />
  );
}
