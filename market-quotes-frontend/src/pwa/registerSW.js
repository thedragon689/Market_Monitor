/**
 * Registra il service worker per offline + push.
 * In dev: solo se VITE_ENABLE_SW_DEV=1 (evita conflitti HMR).
 */
import { PWA_CACHE_VERSION } from '../config/version';

export function registerSW({ onUpdate } = {}) {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  const enableDev = import.meta.env.VITE_ENABLE_SW_DEV === '1';
  if (!import.meta.env.PROD && !enableDev) return;

  const swUrl = `/sw.js?v=${encodeURIComponent(PWA_CACHE_VERSION)}`;

  const register = () => {
    navigator.serviceWorker
      .register(swUrl)
      .then((reg) => {
        reg.update().catch(() => {});

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
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration('/').then((reg) => reg?.update()).catch(() => {});
    }
  });
}
