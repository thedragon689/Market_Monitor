import { spawn } from 'child_process';
import { existsSync } from 'fs';
import os from 'os';
import path from 'path';

const HOME = os.homedir();

const PIPER_BIN_CANDIDATES = [
  process.env.PIPER_BIN,
  path.join(HOME, '.var/app/com.mikeasoft.pied/data/pied/piper/piper'),
  path.join(HOME, '.local/share/piper/piper/piper'),
].filter(Boolean);

const MODEL_CANDIDATES = [
  process.env.PIPER_MODEL,
  path.join(HOME, '.var/app/com.mikeasoft.pied/data/pied/models/it_IT-paola-medium.onnx'),
  path.join(HOME, '.local/share/piper/voices/it_IT-paola-medium.onnx'),
].filter(Boolean);

let cachedPaths = null;

function resolveLocalPiper() {
  if (cachedPaths) return cachedPaths;
  const bin = PIPER_BIN_CANDIDATES.find((p) => existsSync(p));
  const model = MODEL_CANDIDATES.find((p) => existsSync(p));
  if (!bin || !model) {
    cachedPaths = null;
    return null;
  }
  cachedPaths = { bin, model };
  return cachedPaths;
}

export function isLocalPiperAvailable() {
  return Boolean(resolveLocalPiper());
}

/**
 * Sintesi locale via Piper (Pied o installazione manuale).
 * Ritorna data URL WAV base64 o null.
 */
export function synthesizeLocalPiper(text, options = {}) {
  const paths = resolveLocalPiper();
  if (!paths) return Promise.resolve(null);

  const clean = String(text || '').trim().slice(0, 800);
  if (!clean) return Promise.resolve(null);

  const lengthScale = options.lengthScale ?? 1.2;
  const noiseScale = options.noiseScale ?? 0.55;
  const noiseW = options.noiseW ?? 0.65;

  return new Promise((resolve) => {
    const args = [
      '--model',
      paths.model,
      '--output_file',
      '-',
      '--length_scale',
      String(lengthScale),
      '--noise_scale',
      String(noiseScale),
      '--noise_w',
      String(noiseW),
    ];

    const proc = spawn(paths.bin, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks = [];
    let err = '';

    proc.stdout.on('data', (d) => chunks.push(d));
    proc.stderr.on('data', (d) => {
      err += d.toString();
    });
    proc.on('error', () => resolve(null));
    proc.on('close', (code) => {
      if (code !== 0 || !chunks.length) {
        resolve(null);
        return;
      }
      const buf = Buffer.concat(chunks);
      if (buf.length < 200) {
        resolve(null);
        return;
      }
      resolve(`data:audio/wav;base64,${buf.toString('base64')}`);
    });

    proc.stdin.write(clean);
    proc.stdin.end();
  });
}
