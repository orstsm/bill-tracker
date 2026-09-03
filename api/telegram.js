import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Authenticate caller session via Supabase JWT
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or malformed Authorization header.' });
  }

  const token = authHeader.slice(7).trim();
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const ownerUserId = process.env.OWNER_USER_ID;
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;

  if (!supabaseUrl || !supabaseKey || !telegramBotToken || !telegramChatId) {
    return res.status(500).json({ error: 'Server environment misconfiguration.' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token.' });
  }

  // 2. Enforce single-user owner authorization
  if (ownerUserId && user.id !== ownerUserId) {
    return res.status(403).json({ error: 'Forbidden: Caller is not the authorized owner.' });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message exceeds maximum allowed length (2,000 characters).' });
    }

    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    const response = await fetch(url, {
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

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Telegram API responded with ${response.status}: ${err}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending telegram message:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}

