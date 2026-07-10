/** Utility condivise per query string e messaggi auth portfolio. */

export function readPortfolioAuthQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    authError: params.get('authError'),
    mfaRequired: params.get('mfa') === 'required',
  };
}

export function clearPortfolioAuthQuery() {
  const params = new URLSearchParams(window.location.search);
  let changed = false;
  for (const key of ['authError', 'mfa']) {
    if (params.has(key)) {
      params.delete(key);
      changed = true;
    }
  }
  if (!changed) return;
  const qs = params.toString();
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState({}, '', next);
}

export function formatPortfolioAuthError(message) {
  const msg = String(message || '').trim();
  if (!msg) return 'Accesso non riuscito. Riprova.';
  if (/mfa|2fa|multi-factor/i.test(msg)) {
    return 'Autenticazione a 2 fattori richiesta. Completa la verifica e riprova.';
  }
  if (/invalid|scaduto|expired|unauthorized/i.test(msg)) {
    return 'Sessione scaduta o non valida. Accedi di nuovo.';
  }
  return msg;
}

export function needsPortfolioOnboarding(user) {
  if (!user) return false;
  return !user.phoneNumber;
}
