/**
 * Registra il service worker per offline + push.
 * In dev: solo se VITE_ENABLE_SW_DEV=1 (evita conflitti HMR).
 */
import { PWA_CACHE_VERSION } from '../config/version';

function activateWaitingWorker(reg) {
  if (reg?.waiting) {
    reg.waiting.postMessage('SKIP_WAITING');
  }
}

export function registerSW({ onUpdate } = {}) {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  const enableDev = import.meta.env.VITE_ENABLE_SW_DEV === '1';
  if (!import.meta.env.PROD && !enableDev) return;

  const swUrl = `/sw.js?v=${encodeURIComponent(PWA_CACHE_VERSION)}`;

  const wireRegistration = (reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) {
      onUpdate?.(reg);
    }

    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          activateWaitingWorker(reg);
          onUpdate?.(reg);
        }
      });
    });
  };

  const register = () => {
    navigator.serviceWorker
      .register(swUrl, { updateViaCache: 'none' })
      .then((reg) => {
        wireRegistration(reg);
        return reg.update().then(() => reg);
      })
      .then((reg) => {
        if (reg?.waiting) activateWaitingWorker(reg);
      })
      .catch(() => {
        /* registrazione fallita: l'app resta funzionante senza offline */
      });
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    navigator.serviceWorker
      .getRegistration('/')
      .then((reg) => {
        if (!reg) return undefined;
        return reg.update().then(() => reg);
      })
      .then((reg) => {
        if (reg?.waiting) {
          activateWaitingWorker(reg);
          onUpdate?.(reg);
        }
      })
      .catch(() => {});
  });
}
