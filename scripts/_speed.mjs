import fs from 'node:fs';

const env = Object.fromEntries(
  fs
    .readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      let v = l.slice(i + 1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      return [l.slice(0, i).trim(), v.trim()];
    })
);

const key = env.RAPIDAPI_KEY;
const host = 'chatgpt-42.p.rapidapi.com';
const sys = 'Sei un assistente finanziario. Rispondi in italiano, breve: massimo 3 frasi.';
const q = "Cos'\u00e8 l'RSI?";

for (const path of ['/gpt4', '/conversationgpt4-2']) {
  const t = Date.now();
  try {
    const r = await fetch(`https://${host}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-rapidapi-key': key, 'x-rapidapi-host': host },
      body: JSON.stringify({ messages: [{ role: 'user', content: q }], system_prompt: sys, web_access: false }),
    });
    const d = await r.json();
    console.log(`[${path}] ${Date.now() - t}ms HTTP ${r.status} :: ${String(d.result || '').slice(0, 120)}`);
  } catch (e) {
    console.log(`[${path}] ${Date.now() - t}ms ERR ${e.message}`);
  }
}
