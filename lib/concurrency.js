/**
 * Limitazione concorrenza, pool e deduplica richieste (anti-saturazione server).
 */

export function withTimeout(promise, ms, label = 'timeout') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Esegue al massimo una promise in volo per chiave. */
export function createSingleFlight() {
  const inflight = new Map();
  return function singleFlight(key, fn) {
    if (inflight.has(key)) return inflight.get(key);
    const promise = Promise.resolve()
      .then(fn)
      .finally(() => inflight.delete(key));
    inflight.set(key, promise);
    return promise;
  };
}

/**
 * Limita job concorrenti con coda e timeout in attesa.
 * @param {{ name?: string, max?: number, maxQueue?: number, queueTimeoutMs?: number }} opts
 */
export function createLimiter({
  name = 'limiter',
  max = 3,
  maxQueue = 32,
  queueTimeoutMs = 15_000,
} = {}) {
  let active = 0;
  const waiters = [];
  let rejected = 0;
  let completed = 0;

  function stats() {
    return {
      name,
      active,
      queued: waiters.length,
      max,
      maxQueue,
      completed,
      rejected,
      overloaded: waiters.length >= Math.max(1, Math.floor(maxQueue * 0.85)),
    };
  }

  function drain() {
    while (active < max && waiters.length) {
      const next = waiters.shift();
      active += 1;
      clearTimeout(next.timer);
      next.resolve();
    }
  }

  function acquire() {
    if (active < max) {
      active += 1;
      return Promise.resolve();
    }
    if (waiters.length >= maxQueue) {
      rejected += 1;
      return Promise.reject(new Error(`Coda ${name} piena — riprova tra poco`));
    }
    return new Promise((resolve, reject) => {
      const entry = { resolve, reject, timer: null };
      entry.timer = setTimeout(() => {
        const idx = waiters.indexOf(entry);
        if (idx !== -1) waiters.splice(idx, 1);
        rejected += 1;
        reject(new Error(`Attesa ${name} scaduta`));
      }, queueTimeoutMs);
      waiters.push(entry);
    });
  }

  function release() {
    active = Math.max(0, active - 1);
    drain();
  }

  async function run(fn) {
    await acquire();
    try {
      const result = await fn();
      completed += 1;
      return result;
    } finally {
      release();
    }
  }

  return {
    run,
    stats,
    isOverloaded: () => stats().overloaded,
  };
}

/** map async con concorrenza limitata. */
export async function mapPool(items, mapper, concurrency = 3) {
  if (!items.length) return [];
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await mapper(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
