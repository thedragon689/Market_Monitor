#!/usr/bin/env node
/**
 * Libera le porte usate in sviluppo (API + Vite) prima di `npm run dev`.
 * SIGTERM → attesa → SIGKILL sui processi sopravvissuti (evita API zombie su :4000).
 */
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORTS = [4000, 5173, 5174];

function pidsOnPort(port) {
  try {
    const out = execSync(`lsof -ti :${port}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (!out) return [];
    return out
      .split(/\s+/)
      .map((pid) => Number(pid))
      .filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}

function signalPids(pids, signal) {
  for (const pid of pids) {
    try {
      process.kill(pid, signal);
      console.log(`Porta: inviato ${signal} al processo ${pid}`);
    } catch {
      /* già terminato */
    }
  }
}

async function freePort(port) {
  let pids = pidsOnPort(port);
  if (!pids.length) return;

  signalPids(pids, 'SIGTERM');
  for (const pid of pids) {
    console.log(`Porta ${port}: terminato processo ${pid}`);
  }

  await sleep(600);
  pids = pidsOnPort(port);
  if (pids.length) {
    signalPids(pids, 'SIGKILL');
    await sleep(200);
  }

  const remaining = pidsOnPort(port);
  if (remaining.length) {
    console.warn(`Porta ${port}: ancora occupata dai PID ${remaining.join(', ')}`);
  }
}

for (const port of PORTS) {
  await freePort(port);
}
