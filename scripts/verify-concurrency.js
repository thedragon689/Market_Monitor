/**
 * Verifica limiter concorrenza (anti-regressione saturazione).
 * Uso: node scripts/verify-concurrency.js
 */
import { createLimiter, mapPool, withTimeout } from '../lib/concurrency.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const limiter = createLimiter({ name: 'test', max: 2, maxQueue: 2, queueTimeoutMs: 200 });
let active = 0;
let maxActive = 0;

await limiter.run(async () => {
  active += 1;
  maxActive = Math.max(maxActive, active);
  await new Promise((r) => setTimeout(r, 50));
  active -= 1;
});
await limiter.run(async () => {
  active += 1;
  maxActive = Math.max(maxActive, active);
  await new Promise((r) => setTimeout(r, 50));
  active -= 1;
});

assert(maxActive <= 2, `max concurrent should be <=2, got ${maxActive}`);

let rejected = false;
try {
  await Promise.all([
    limiter.run(() => new Promise((r) => setTimeout(r, 300))),
    limiter.run(() => new Promise((r) => setTimeout(r, 300))),
    limiter.run(() => new Promise((r) => setTimeout(r, 300))),
  ]);
} catch {
  rejected = true;
}
assert(rejected, 'queue full should reject');

const pool = await mapPool([1, 2, 3, 4], async (n) => n * 2, 2);
assert(pool.join(',') === '2,4,6,8', 'mapPool order');

await withTimeout(Promise.resolve('ok'), 100, 'fast');
let timedOut = false;
try {
  await withTimeout(new Promise(() => {}), 30, 'slow');
} catch (e) {
  timedOut = e.message === 'slow';
}
assert(timedOut, 'withTimeout should reject');

console.log('verify-concurrency: OK');
