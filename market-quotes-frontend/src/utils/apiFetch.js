/**
 * Fetch API con messaggi d'errore leggibili (JSON, HTML crash Netlify, rete).
 */
export async function apiFetch(url, options = {}) {
  const { optional = false, ...init } = options;
  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    if (optional) {
      const aborted =
        err?.name === 'AbortError' ||
        err?.name === 'TimeoutError' ||
        init.signal?.aborted;
      return {
        ok: false,
        data: null,
        res: null,
        aborted,
        networkError: !aborted,
      };
    }
    throw new Error(
      err.message === 'Failed to fetch'
        ? 'Connessione al server non disponibile. Riprova tra poco.'
        : err.message,
      { cause: err }
    );
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!optional) {
        const isHtml = text.trimStart().startsWith('<!');
        if (isHtml || res.status === 404) {
          throw new Error(
            `Endpoint non trovato (${res.status}): ${url.replace(/\?.*$/, '')}. ` +
              'Avvia l\'API (npm run dev) o fai redeploy Netlify con le ultime Functions.'
          );
        }
        const snippet = text.slice(0, 80).replace(/\s+/g, ' ');
        throw new Error(
          res.status >= 500
            ? `Errore server (${res.status}). L'API potrebbe essere in avvio o in timeout.`
            : `Risposta non valida (${res.status}): ${snippet}`
        );
      }
    }
  }

  if (!res.ok && !optional) {
    const err = new Error(
      data?.error ||
        data?.errorMessage ||
        `Errore API (${res.status})`
    );
    err.status = res.status;
    throw err;
  }

  if (!res.ok && optional) {
    const gatewayDown = res.status === 502 || res.status === 503 || res.status === 504;
    return {
      ok: false,
      data,
      res,
      aborted: false,
      networkError: gatewayDown,
      serverBusy: res.status >= 500 && !gatewayDown,
    };
  }

  return { ok: res.ok, data, res };
}
