import { createClient } from '@supabase/supabase-js';

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

function getCurrentMonthStr() {
  const d = new Date();
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // 1. Enforce GET method (Vercel crons send GET requests)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Enforce CRON_SECRET verification
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is missing.');
    return res.status(500).json({ error: 'CRON_SECRET is not configured on the server.' });
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing cron secret.' });
  }

  // 3. Verify server environment configuration
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ownerUserId = process.env.OWNER_USER_ID;
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;

  if (!supabaseUrl || !supabaseKey || !ownerUserId || !telegramBotToken || !telegramChatId) {
    console.error('Missing required environment variables for cron notification delivery.');
    return res.status(500).json({
      error: 'Missing required environment variables (SUPABASE_SERVICE_ROLE_KEY, OWNER_USER_ID, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID).'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 4. Fetch unpaid bills and active subscriptions strictly for OWNER_USER_ID
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', ownerUserId)
      .neq('status', 'Paid');

    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', ownerUserId)
      .eq('status', 'Active');

    if (billsError) throw billsError;
    if (subsError) throw subsError;

    if ((!bills || bills.length === 0) && (!subscriptions || subscriptions.length === 0)) {
      return res.status(200).json({ message: 'No action items found.' });
    }

    const currentMonth = getCurrentMonthStr();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 5. Filter for bills due within 7 days
    const dueBills = [];
    for (const b of (bills || [])) {
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
    for (const sub of (subscriptions || [])) {
      if (!sub.renewal_date) continue;
      const renewalDate = new Date(sub.renewal_date);
      renewalDate.setHours(0, 0, 0, 0);

      const diffMs = renewalDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= 5) {
        dueSubs.push({ ...sub, diffDays });
      }
    }

    if (dueBills.length === 0 && dueSubs.length === 0) {
      return res.status(200).json({ message: 'No bills or subscriptions due soon.' });
    }

    dueBills.sort((a, b) => a.diffDays - b.diffDays);
    dueSubs.sort((a, b) => a.diffDays - b.diffDays);

    // 7. Format Telegram message with HTML escaping to prevent parse errors
    let message = '';

    if (dueBills.length > 0) {
      message += `⚠️ <b>Action Required: ${dueBills.length} Bill${dueBills.length > 1 ? 's' : ''} Due Soon!</b>\n\n`;
      dueBills.forEach((b) => {
        const amt = Number(b.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
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
        const amt = Number(sub.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
        message += `• <b>${escapeHtml(sub.name)}</b>: ₱${amt}\n  ↳ Renews in ${sub.diffDays} days (${escapeHtml(sub.cycle)})\n  ↳ <i>Ignore this if keeping it, or cancel now to avoid charges.</i>\n\n`;
      });
    }

    message += `<i>Please manage these inside the Bill Tracker app.</i>`;

    // 8. Dispatch to Telegram
    const tgUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!tgRes.ok) {
      const tgErr = await tgRes.text();
      console.error('Telegram API Error:', tgErr);
      throw new Error(`Telegram API Error: ${tgErr}`);
    }

    return res.status(200).json({
      message: `Successfully sent Telegram alert for ${dueBills.length} bills and ${dueSubs.length} subscriptions.`
    });
  } catch (error) {
    console.error('Cron Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
