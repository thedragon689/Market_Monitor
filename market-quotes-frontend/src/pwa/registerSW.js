/**
 * Registra il service worker per offline + push.
 * In dev: solo se VITE_ENABLE_SW_DEV=1 (evita conflitti HMR).
 */
export function registerSW({ onUpdate } = {}) {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  const enableDev = import.meta.env.VITE_ENABLE_SW_DEV === '1';
  if (!import.meta.env.PROD && !enableDev) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              onUpdate?.(reg);
            }
          });
        });
      })
      .catch(() => {
        /* registrazione fallita: l'app resta funzionante senza offline */
      });
  });
}
