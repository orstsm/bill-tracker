// Logic: due dates like "12 - Current", "5 - Next"
function parseDueDateLogic(str, billMonthStr) {
  if (!str || String(str).toLowerCase().includes('any')) return null;

  const match = String(str).match(/\d+/);
  if (!match) return null;

  const day = parseInt(match[0], 10);
  let baseDate = new Date(billMonthStr);
  if (isNaN(baseDate.getTime())) baseDate = new Date();

  let month = baseDate.getMonth();
  let year = baseDate.getFullYear();

  const lowerStr = String(str).toLowerCase();
  if (lowerStr.includes('next') || lowerStr.includes('following')) {
    month++;
    if (month > 11) { month = 0; year++; }
  }

  const maxDaysInMonth = new Date(year, month + 1, 0).getDate();
  const clampedDay = day > maxDaysInMonth ? maxDaysInMonth : day;

  return new Date(year, month, clampedDay);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Pure formatting/eligibility step; callers must supply freshly saved records.
export function buildTelegramReminder({ bills = [], subscriptions = [], now = new Date() }) {
    const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // 5. Filter for bills due within 7 days
    const dueBills = [];
    const seenBills = new Set();
    for (const b of (bills || [])) {
      // amount is the only saved bill balance in the current schema. Paid
      // bills retain their original amount, so status must also be checked.
      const amount = Number(b.amount);
      const status = String(b.status ?? '').trim().toLowerCase();
      if (!b.id || !['unpaid', 'partially paid', 'partial'].includes(status)
        || !Number.isFinite(amount) || Math.round(amount * 100) <= 0) continue;
      const key = JSON.stringify([b.user_id, b.id]);
      if (seenBills.has(key)) continue;
      seenBills.add(key);
      const dueDate = parseDueDateLogic(b.due_date, b.month || currentMonth);
      if (dueDate) {
        dueDate.setHours(0, 0, 0, 0);

        const diffMs = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays <= 7) {
          dueBills.push({ ...b, diffDays });
        }
      }
    }

    // 6. Filter for subscriptions renewing within 5 days
    const dueSubs = [];
    const seenSubscriptions = new Set();
    for (const sub of (subscriptions || [])) {
      if (!sub.id || String(sub.status ?? '').trim().toLowerCase() !== 'active'
        || !sub.renewal_date) continue;
      const key = JSON.stringify([sub.user_id, sub.id]);
      if (seenSubscriptions.has(key)) continue;
      seenSubscriptions.add(key);
      const renewalDate = new Date(sub.renewal_date);
      renewalDate.setHours(0, 0, 0, 0);

      const diffMs = renewalDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= 5) {
        dueSubs.push({ ...sub, diffDays });
      }
    }

    if (dueBills.length === 0 && dueSubs.length === 0) {
      return { message: null, dueBills, dueSubs };
    }

    dueBills.sort((a, b) => a.diffDays - b.diffDays);
    dueSubs.sort((a, b) => a.diffDays - b.diffDays);

    // 7. Format Telegram message with HTML escaping to prevent parse errors
    let message = '';

    if (dueBills.length > 0) {
      message += `⚠️ <b>Action Required: ${dueBills.length} Bill${dueBills.length > 1 ? 's' : ''} Due Soon!</b>\n\n`;
      dueBills.forEach((b) => {
        const amt = Number(b.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        let status = '';
        if (b.diffDays < 0) {
          status = `🚨 <b>OVERDUE by ${Math.abs(b.diffDays)} days</b>`;
        } else if (b.diffDays === 0) {
          status = `⏰ <b>DUE TODAY</b>`;
        } else {
          status = `Due in ${b.diffDays} days`;
        }
        message += `• <b>${escapeHtml(b.biller)}</b>: ₱${amt}\n  ↳ ${status}\n\n`;
      });
    }

    if (dueSubs.length > 0) {
      if (message !== '') message += `---\n\n`;
      message += `🔄 <b>Heads up: ${dueSubs.length} Subscription${dueSubs.length > 1 ? 's' : ''} Renewing Soon!</b>\n\n`;
      dueSubs.forEach((sub) => {
        const amt = Number(sub.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        message += `• <b>${escapeHtml(sub.name)}</b>: ₱${amt}\n  ↳ Renews in ${sub.diffDays} days (${escapeHtml(sub.cycle)})\n  ↳ <i>Ignore this if keeping it, or cancel now to avoid charges.</i>\n\n`;
      });
    }

    message += `<i>Please manage these inside the Bill Tracker app.</i>`;


    return { message, dueBills, dueSubs };
}
