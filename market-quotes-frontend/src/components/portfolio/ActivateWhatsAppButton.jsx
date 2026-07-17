import { useEffect, useState } from 'react';
import {
  createWhatsAppLink,
  getNotificationsConfig,
  registerPortfolioWhatsApp,
} from '../../utils/portfolioApi';

/**
 * Collega WhatsApp: salva il numero nel DB o apre wa.me con /start <userId>.
 */
export default function ActivateWhatsAppButton({
  label = 'Attiva notifiche WhatsApp',
  className = 'btn btn--cta btn--block',
  disabled = false,
  defaultPhone = '',
  onSaved,
}) {
  const [phone, setPhone] = useState(defaultPhone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hint, setHint] = useState(null);
  const [whatsappEnabled, setWhatsappEnabled] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getNotificationsConfig()
      .then((cfg) => {
        if (!cancelled) setWhatsappEnabled(cfg?.whatsapp === true);
      })
      .catch(() => {
        if (!cancelled) setWhatsappEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (defaultPhone) setPhone(defaultPhone);
  }, [defaultPhone]);

  const savePhone = async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const result = await registerPortfolioWhatsApp(phone);
      setHint(`Numero salvato: ${result?.whatsapp || result?.whatsapp_number || phone}`);
      onSaved?.(result);
    } catch (err) {
      setError(err.message || 'Salvataggio WhatsApp non riuscito');
    } finally {
      setLoading(false);
    }
  };

  const openAutoLink = async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const link = await createWhatsAppLink();
      if (link?.deepLink) {
        window.open(link.deepLink, '_blank', 'noopener,noreferrer');
        setHint('Invia il messaggio precompilato su WhatsApp per attivare le notifiche.');
      } else if (phone.trim()) {
        await savePhone();
      } else {
        setError('Inserisci il numero oppure configura WHATSAPP_BUSINESS_NUMBER sul server.');
      }
    } catch (err) {
      setError(err.message || 'Collegamento WhatsApp non riuscito');
    } finally {
      setLoading(false);
    }
  };

  if (whatsappEnabled === false) {
    return (
      <p className="portfolio-notify__hint">
        WhatsApp non configurato sul server (Twilio o Meta Cloud API).
      </p>
    );
  }

  return (
    <div className="portfolio-whatsapp-activate">
      <label className="portfolio-field">
        <span>Numero WhatsApp</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="es. +393471234567"
          disabled={loading || disabled}
        />
      </label>
      <div className="portfolio-whatsapp-activate__actions">
        <button
          type="button"
          className={className}
          onClick={openAutoLink}
          disabled={loading || disabled || whatsappEnabled === null}
        >
          {loading ? 'Attendere…' : label}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--block"
          onClick={savePhone}
          disabled={loading || disabled || !phone.trim()}
        >
          Salva numero
        </button>
      </div>
      {hint && <p className="portfolio-notify__ok">{hint}</p>}
      {error && (
        <p className="portfolio-auth__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
