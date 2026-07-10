#!/usr/bin/env node
/**
 * Esegue tutta la suite di test/verifica offline del progetto.
 * Usato da `npm test` e dalla CI GitHub Actions.
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const frontend = path.join(root, 'market-quotes-frontend');

const STEPS = [
  { name: 'verify:math', cmd: 'node', args: ['scripts/verify-math.js'], cwd: root },
  { name: 'verify:portfolio', cmd: 'node', args: ['scripts/verify-portfolio-math.js'], cwd: root },
  { name: 'verify:ratelimit', cmd: 'node', args: ['scripts/verify-ratelimit.js'], cwd: root },
  { name: 'verify:circuit', cmd: 'node', args: ['scripts/verify-circuit.js'], cwd: root },
  { name: 'verify:notify', cmd: 'node', args: ['scripts/verify-notify.js'], cwd: root },
  { name: 'verify:intent', cmd: 'node', args: ['scripts/verify-intent.js'], cwd: root },
  { name: 'verify:totp', cmd: 'node', args: ['scripts/verify-totp.js'], cwd: root },
  { name: 'verify:backtest', cmd: 'node', args: ['scripts/verify-backtest.js'], cwd: root },
  { name: 'verify:local-piper', cmd: 'node', args: ['scripts/verify-local-piper.js'], cwd: root },
  { name: 'test:nav', cmd: 'node', args: ['src/utils/navIntent.test.mjs'], cwd: frontend },
  { name: 'test:search', cmd: 'node', args: ['src/utils/assetSearch.test.mjs'], cwd: frontend },
];

function runStep(step) {
  return new Promise((resolve, reject) => {
    const proc = spawn(step.cmd, step.args, {
      cwd: step.cwd,
      stdio: 'inherit',
      env: process.env,
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${step.name} failed (exit ${code})`));
    });
  });
}

async function main() {
  console.log('▶ Market Monitor — test suite\n');
  const started = Date.now();
  for (const step of STEPS) {
    console.log(`\n── ${step.name} ──`);
    await runStep(step);
  }
  const sec = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n✓ Tutti i test passati (${sec}s)`);
}

main().catch((err) => {
  console.error('\n✗', err.message || err);
  process.exit(1);
});
