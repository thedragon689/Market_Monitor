#!/usr/bin/env node
/**
 * Libera le porte usate in sviluppo (API + Vite) prima di `npm run dev`.
 */
import { execSync } from 'node:child_process';

const PORTS = [4000, 5173, 5174];

for (const port of PORTS) {
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (!out) continue;
    for (const pid of out.split(/\s+/)) {
      const n = Number(pid);
      if (!Number.isFinite(n)) continue;
      try {
        process.kill(n, 'SIGTERM');
        console.log(`Porta ${port}: terminato processo ${n}`);
      } catch {
        /* già terminato */
      }
    }
  } catch {
    /* nessun processo su questa porta */
  }
}
