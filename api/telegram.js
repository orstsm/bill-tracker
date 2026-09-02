export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;

  if (!telegramBotToken || !telegramChatId) {
    return res.status(500).json({ error: 'Missing environment variables.' });
  }

  try {
    const { message } = req.body || {};
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
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
        parse_mode: 'HTML'
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
