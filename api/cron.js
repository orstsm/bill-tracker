import { createClient } from '@supabase/supabase-js';

// Logic: due dates like "12 - Current", "5 - Next"
function parseDueDateLogic(str, billMonthStr) {
  if (!str || String(str).toLowerCase().includes("any")) return null;
  
  let match = String(str).match(/\d+/);
  if (!match) return null;
  
  let day = parseInt(match[0]);
  
  let baseDate = new Date(billMonthStr);
  if (isNaN(baseDate.getTime())) baseDate = new Date();
  
  let month = baseDate.getMonth();
  let year = baseDate.getFullYear();

  const lowerStr = String(str).toLowerCase();
  if (lowerStr.includes("next") || lowerStr.includes("following")) {
    month++;
    if (month > 11) { month = 0; year++; }
  }

  const maxDaysInMonth = new Date(year, month + 1, 0).getDate();
  if (day > maxDaysInMonth) day = maxDaysInMonth;

  return new Date(year, month, day);
}

function getCurrentMonthStr() {
  const d = new Date();
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export default async function handler(req, res) {
  // Only allow GET or POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;

  if (!supabaseUrl || !supabaseAnonKey || !telegramBotToken || !telegramChatId) {
    return res.status(500).json({ error: 'Missing environment variables.' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // 1. Fetch all unpaid bills
    const { data: bills, error } = await supabase
      .from('bills')
      .select('*')
      .neq('status', 'Paid');

    if (error) throw error;

    if (!bills || bills.length === 0) {
      return res.status(200).json({ message: 'No unpaid bills found.' });
    }

    const currentMonth = getCurrentMonthStr();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize to midnight

    // 2. Filter for bills due within 7 days
    const dueBills = [];
    for (const b of bills) {
      // Use the bill's assigned month to parse due date
      const dueDate = parseDueDateLogic(b.due_date, b.month || currentMonth);
      if (dueDate) {
        dueDate.setHours(0, 0, 0, 0); // normalize to midnight
        
        const diffMs = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        // Due within next 7 days, OR past due!
        if (diffDays <= 7) {
          dueBills.push({ ...b, diffDays });
        }
      }
    }

    if (dueBills.length === 0) {
      return res.status(200).json({ message: 'No bills due within 7 days.' });
    }

    // Sort by most urgent
    dueBills.sort((a, b) => a.diffDays - b.diffDays);

    // 3. Format Telegram Message
    let message = `⚠️ *Action Required: ${dueBills.length} Bill${dueBills.length > 1 ? 's' : ''} Due Soon!*\n\n`;
    
    dueBills.forEach(b => {
      const amt = Number(b.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
      let status = '';
      if (b.diffDays < 0) {
        status = `🚨 *OVERDUE by ${Math.abs(b.diffDays)} days*`;
      } else if (b.diffDays === 0) {
        status = `⏰ *DUE TODAY*`;
      } else {
        status = `Due in ${b.diffDays} days`;
      }
      message += `• *${b.biller}*: ₱${amt}\n  ↳ ${status}\n\n`;
    });

    message += `_Please mark them as Paid in the app once settled._`;

    // 4. Send to Telegram API
    const tgUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!tgRes.ok) {
      const tgErr = await tgRes.text();
      console.error("Telegram API Error:", tgErr);
      throw new Error(`Telegram API Error: ${tgErr}`);
    }

    return res.status(200).json({ message: `Successfully sent Telegram alert for ${dueBills.length} bills.` });

  } catch (error) {
    console.error("Cron Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
