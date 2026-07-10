/**
 * Notifiche email via API HTTP (nessuna dipendenza SMTP).
 * Supporta Resend o Brevo (Sendinblue), mirror del pattern multi-provider di WhatsApp.
 *
 * Resend env:  RESEND_API_KEY, EMAIL_FROM (es. "Market Monitor <alert@tuodominio.it>")
 * Brevo  env:  BREVO_API_KEY,  EMAIL_FROM
 */

/** Estrae { email, name } da "Nome <email>" oppure "email". */
function parseSender(from) {
  const match = String(from).match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (match) return { name: match[1] || undefined, email: match[2] };
  return { email: String(from).trim() };
}

/** True se almeno un provider email è configurato lato server. */
export function isEmailConfigured() {
  const from = process.env.EMAIL_FROM?.trim();
  return Boolean(from && (process.env.RESEND_API_KEY?.trim() || process.env.BREVO_API_KEY?.trim()));
}

/**
 * Invia un'email.
 * @param {string} to
 * @param {{ subject: string, html?: string, text?: string }} message
 * @returns {{ ok:boolean, provider?:string, skipped?:boolean, reason?:string }}
 */
export async function sendEmail(to, { subject, html, text } = {}) {
  const recipient = String(to || '').trim();
  if (!recipient) return { ok: false, skipped: true, reason: 'no_recipient' };

  const from = process.env.EMAIL_FROM?.trim();
  const subj = subject || 'Market Monitor — Alert Portfolio';

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey && from) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: recipient, subject: subj, html, text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `Resend HTTP ${res.status}`);
    return { ok: true, provider: 'resend' };
  }

  const brevoKey = process.env.BREVO_API_KEY?.trim();
  if (brevoKey && from) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: parseSender(from),
        to: [{ email: recipient }],
        subject: subj,
        htmlContent: html || text,
        textContent: text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Brevo HTTP ${res.status}: ${body.slice(0, 120)}`);
    }
    return { ok: true, provider: 'brevo' };
  }

  return { ok: false, skipped: true, reason: 'email_not_configured' };
}

/** Avvolge il messaggio alert in un template HTML minimale per l'email. */
export function buildAlertEmailHtml(innerHtml) {
  // I messaggi usano \n per andare a capo: in HTML vanno convertiti in <br>.
  const body = String(innerHtml).replace(/\n/g, '<br>');
  return (
    '<div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;' +
    'max-width:520px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px;">' +
    `<div style="font-size:15px;line-height:1.6;color:#0f172a;">${body}</div>` +
    '<hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0;">' +
    '<p style="font-size:12px;color:#64748b;margin:0;">Contenuto educativo, non consulenza ' +
    'finanziaria. Ricevi questa email perché hai attivato gli alert su Market Monitor.</p>' +
    '</div>'
  );
}
