/**
 * Avvia Vite e, se necessario, l'API locale su :4000.
 * Evita i 502 quando si lancia solo `npm run dev` dalla cartella frontend.
 */
import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(frontendDir, '..');

function isApiUp() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:4000/api/health', (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForApi(maxMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await isApiUp()) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

let apiProc = null;
let startedApi = false;

async function ensureApi() {
  if (await isApiUp()) {
    console.log('\n  API: http://localhost:4000 (già attiva)\n');
    return;
  }

  console.log('\n  API: avvio server su http://localhost:4000 …\n');
  apiProc = spawn('node', ['server.mjs'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  });
  startedApi = true;

  const ok = await waitForApi();
  if (!ok) {
    console.warn(
      '\n  ⚠ API non risponde su :4000 (health timeout).\n' +
        '     Dalla root del progetto: npm run dev:stop && npm run dev\n' +
        '     Se persiste: lsof -ti :4000 | xargs kill -9\n'
    );
  }
}

function cleanup(code = 0) {
  if (startedApi && apiProc && !apiProc.killed) {
    apiProc.kill('SIGTERM');
  }
  process.exit(code);
}

process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));

await ensureApi();

await import('./clean-vite-cache.mjs');

const vite = spawn('node', ['node_modules/vite/bin/vite.js'], {
  cwd: frontendDir,
  stdio: 'inherit',
  env: process.env,
});

vite.on('exit', (code) => cleanup(code ?? 0));
