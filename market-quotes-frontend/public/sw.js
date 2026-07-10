/**
 * Service Worker — Market Monitor PWA.
 * VERSION viene sostituito a build-time (commit Netlify) — vedi vite.config.js.
 */
const VERSION = '__PWA_CACHE_VERSION__';
const SHELL_CACHE = `mm-shell-${VERSION}`;
const ASSET_CACHE = `mm-assets-${VERSION}`;
const API_CACHE = `mm-api-${VERSION}`;

const SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/app-icon.svg'];
const NETWORK_OPTS = { cache: 'no-store' };

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const keep = new Set([SHELL_CACHE, ASSET_CACHE, API_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request, NETWORK_OPTS)
    .then((res) => {
      if (res?.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await network) || new Response('', { status: 504 });
}

async function cacheFirstHashedAssets(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request, NETWORK_OPTS);
  if (res?.ok) cache.put(request, res.clone());
  return res;
}

/** HTML/navigazione: sempre rete prima; aggiorna shell cache; offline → ultima shell. */
async function networkFirstShell(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(request, NETWORK_OPTS);
    if (res?.ok) {
      cache.put(request, res.clone());
      return res;
    }
  } catch {
    /* offline */
  }
  return (
    (await cache.match(request)) ||
    (await cache.match('/index.html')) ||
    new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstShell(request));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  if (sameOrigin && url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirstHashedAssets(request, ASSET_CACHE));
  }
});

/* ── Push notifications ─────────────────────────────────────────────── */
let vapidPublicKey = null;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'VAPID_PUBLIC_KEY') {
    vapidPublicKey = event.data.key || null;
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Market Monitor', body: event.data ? event.data.text() : '' };
  }

  const options = {
    body: data.body || 'Nuovo aggiornamento da Market Monitor',
    icon: data.icon || '/app-icon-light-192.png',
    badge: data.badge || '/app-icon.svg',
    image: data.image || undefined,
    tag: data.tag || 'market-monitor',
    requireInteraction: data.requireInteraction ?? true,
    renotify: data.renotify ?? false,
    silent: data.silent ?? false,
    vibrate: data.vibrate || [200, 100, 200],
    actions: data.actions || [
      { action: 'open', title: 'Apri App' },
      { action: 'dismiss', title: 'Ignora' },
    ],
    data: data.data || { url: data.url || '/?view=portfolio', action: 'open' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Market Monitor', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action || event.notification.data?.action || 'open';
  if (action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/?view=portfolio';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NAVIGATE', url: targetUrl });
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
      return undefined;
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  if (!vapidPublicKey) return;
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
      .then((subscription) =>
        fetch('/api/notifications/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(subscription),
        })
      )
      .catch(() => {})
  );
});
