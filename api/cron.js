import { createClient } from '@supabase/supabase-js';
import { buildTelegramReminder } from '../src/lib/telegramReminders.js';

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

  // Every scheduled run reads Supabase directly, never the app's offline cache.
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });

  try {
    // 4. Fetch unpaid bills and active subscriptions strictly for OWNER_USER_ID
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', ownerUserId)
      .neq('status', 'Paid')
      .gt('amount', 0);

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

    const { message, dueBills, dueSubs } = buildTelegramReminder({ bills, subscriptions });
    if (!message) {
      return res.status(200).json({ message: 'No bills or subscriptions due soon.' });
    }

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
