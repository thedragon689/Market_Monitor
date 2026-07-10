/**
 * Invio notifiche Telegram via Bot API.
 * Env: TELEGRAM_BOT_TOKEN (da @BotFather)
 */
export async function sendTelegram(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token || !chatId) return { ok: false, skipped: true, reason: 'telegram_not_configured' };

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: String(chatId),
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.description || `Telegram HTTP ${res.status}`);
  }
  return { ok: true };
}
