import { lazy } from 'react';

const RELOAD_KEY = 'mm:vite-chunk-reload';

function isChunkLoadError(err) {
  const msg = String(err?.message || err || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Caricamento non riuscito per il modulo/i.test(
    msg
  );
}

/** Ritenta lazy import; su chunk stale dopo HMR ricarica la pagina una volta. */
export function lazyWithRetry(factory, retries = 2) {
  return lazy(async () => {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await factory();
      } catch (err) {
        lastErr = err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }
        if (isChunkLoadError(err)) {
          try {
            if (!sessionStorage.getItem(RELOAD_KEY)) {
              sessionStorage.setItem(RELOAD_KEY, '1');
              window.location.reload();
              await new Promise(() => {});
            }
            sessionStorage.removeItem(RELOAD_KEY);
          } catch {
            /* ignore */
          }
        }
      }
    }
    throw lastErr;
  });
}
