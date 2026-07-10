import { useCallback, useEffect, useState } from 'react';
import { API_BASE } from '../config/api';
import { getPortfolioToken, resolveAccessToken } from '../utils/portfolioApi';

/** Converte una VAPID key base64url in Uint8Array per PushManager. */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function postVapidToSw(registration, key) {
  if (!key) return;
  registration.active?.postMessage?.({ type: 'VAPID_PUBLIC_KEY', key });
  navigator.serviceWorker.controller?.postMessage?.({ type: 'VAPID_PUBLIC_KEY', key });
}

/**
 * Gestione permessi e subscription push PWA (anche con app chiusa).
 */
export function usePushNotifications({ enabled = true } = {}) {
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const [permission, setPermission] = useState(
    supported ? Notification.permission : 'default'
  );
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscription(sub))
      .catch(() => {});
  }, [supported]);

  const fetchPublicKey = useCallback(async () => {
    if (import.meta.env.VITE_VAPID_PUBLIC_KEY) {
      return import.meta.env.VITE_VAPID_PUBLIC_KEY;
    }
    try {
      const res = await fetch(`${API_BASE}/api/notifications/push/publicKey`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.publicKey ?? null;
    } catch {
      return null;
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported || !enabled) return null;
    const vapid = await fetchPublicKey();
    if (!vapid) {
      console.warn('[push] VAPID public key non disponibile: subscription saltata.');
      return null;
    }

    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== 'granted') return null;

    const reg = await navigator.serviceWorker.ready;
    postVapidToSw(reg, vapid);

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
    }
    setSubscription(sub);

    try {
      const token = (await resolveAccessToken()) || getPortfolioToken();
      await fetch(`${API_BASE}/api/notifications/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(sub),
      });
    } catch {
      /* server non raggiungibile */
    }
    return sub;
  }, [supported, enabled, fetchPublicKey]);

  const unsubscribe = useCallback(async () => {
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe().catch(() => {});
      setSubscription(null);
      try {
        const token = (await resolveAccessToken()) || getPortfolioToken();
        await fetch(`${API_BASE}/api/notifications/push/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({ endpoint }),
        });
      } catch {
        /* server non raggiungibile */
      }
    }
  }, [subscription]);

  return {
    supported,
    permission,
    subscribed: Boolean(subscription),
    subscribe,
    unsubscribe,
  };
}
