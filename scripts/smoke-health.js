#!/usr/bin/env node
/** Smoke test API — uso: node scripts/smoke-health.js [baseUrl] */
const base = process.argv[2] || 'http://localhost:4000';
const url = `${base.replace(/\/$/, '')}/api/health`;

const res = await fetch(url);
const data = await res.json().catch(() => ({}));
if (!res.ok || !data.ok) {
  console.error('FAIL', res.status, data);
  process.exit(1);
}
console.log('OK', data);
