/**
 * Sintesi vocale via Web Speech API — ottimizzata per Firefox/Linux (eSpeak).
 * Preprocessing del testo, chunk brevi, pause tra frasi, tuning morbido.
 */

const ROBOTIC_VOICE_RE = /espeak|speech ?dispatcher|festival|mbrola|pico|flite|dfki|robo/i;
const ESPEAK_RE = /espeak|speech ?dispatcher|festival|flite|dfki/i;
const BETTER_LOCAL_RE = /mbrola|piper|silero|speech.?dispatcher/i;
const NATURAL_VOICE_RE =
  /google|microsoft|natural|neural|enhanced|premium|siri|samantha|alex|daniel|luca|elsa|wavenet|online/i;

/** Espansioni per pronuncia più chiara (soprattutto eSpeak italiano). */
const SPEECH_EXPAND_IT = [
  [/\bP\/L\b/gi, 'profitto e perdita'],
  [/\bRSI\b/g, 'R S I'],
  [/\bMACD\b/g, 'M A C D'],
  [/\bATR\b/g, 'A T R'],
  [/\bSMA\b/g, 'media mobile semplice'],
  [/\bEMA\b/g, 'media mobile esponenziale'],
  [/\bBTC\b/g, 'Bitcoin'],
  [/\bETH\b/g, 'Ethereum'],
  [/\bEUR\/USD\b/gi, 'euro dollaro'],
  [/\bMarket Monitor\b/g, 'Market Monitor'],
  [/%/g, ' per cento'],
  [/€/g, ' euro'],
  [/\$/g, ' dollari'],
  [/&/g, ' e'],
  [/→/g, ', '],
  [/⚠️|💡|📈|📉|🔊|🔈|🔇/g, ''],
];

export function isFirefox() {
  return typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
}

function normalizeLocale(locale) {
  return String(locale || 'it-IT').toLowerCase();
}

/** Ripulisce markdown ed emoji; espande abbreviazioni per la lingua. */
export function prepareTextForBrowserTts(text, locale = 'it-IT') {
  let s = String(text || '')
    .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, ''))
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_#>]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/[…]/g, '.')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalizeLocale(locale).startsWith('it')) {
    for (const [re, rep] of SPEECH_EXPAND_IT) s = s.replace(re, rep);
    // Numeri decimali: 12.34 → "12 virgola 34" (eSpeak legge meglio)
    s = s.replace(/(\d+)\.(\d+)/g, '$1 virgola $2');
  }

  return s;
}

/**
 * Spezza in chunk brevi: su Firefox anche alle virgole (eSpeak si affatica su frasi lunghe).
 */
export function splitForBrowserSpeech(text, locale = 'it-IT', options = {}) {
  const firefox = options.firefox ?? isFirefox();
  const maxLen = options.maxLen ?? (firefox ? 88 : 160);
  const clean = prepareTextForBrowserTts(text, locale);
  if (!clean) return [];

  const sentenceParts = clean.match(/[^.!?\n]+[.!?]*/g) || [clean];
  const pieces = [];
  for (const sent of sentenceParts) {
    const t = sent.trim();
    if (!t) continue;
    if (firefox && t.length > 42) {
      // Spezza anche alle virgole e ai due punti.
      const subs = t.split(/(?<=[,;:])\s+/).filter(Boolean);
      if (subs.length > 1) pieces.push(...subs);
      else pieces.push(t);
    } else {
      pieces.push(t);
    }
  }

  const chunks = [];
  let cur = '';
  for (const piece of pieces) {
    if (cur && `${cur} ${piece}`.length > maxLen) {
      chunks.push(cur);
      cur = piece;
    } else {
      cur = cur ? `${cur} ${piece}` : piece;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

export function pickBestVoice(voices, locale) {
  if (!Array.isArray(voices) || !voices.length) return null;
  const prefix = locale.slice(0, 2).toLowerCase();
  const full = locale.toLowerCase();
  const score = (v) => {
    const name = (v.name || '').toLowerCase();
    const vlang = (v.lang || '').toLowerCase().replace('_', '-');
    let s = 0;
    if (vlang === full) s += 40;
    else if (vlang.startsWith(prefix)) s += 25;
    else return -1;
    if (/italian|italiano|ita\b/i.test(name)) s += 8;
    if (NATURAL_VOICE_RE.test(name)) s += 30;
    if (v.localService === false) s += 20;
    if (BETTER_LOCAL_RE.test(name)) s += 25;
    if (ESPEAK_RE.test(name)) s -= 45;
    else if (ROBOTIC_VOICE_RE.test(name)) s -= 30;
    if (v.default) s += 2;
    return s;
  };
  let best = null;
  let bestScore = -1;
  for (const v of voices) {
    const s = score(v);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  return best;
}

export function isRoboticVoice(voice) {
  if (!voice?.name) return false;
  return ESPEAK_RE.test(voice.name) || (ROBOTIC_VOICE_RE.test(voice.name) && !BETTER_LOCAL_RE.test(voice.name));
}

/** Voce neurale locale Piper (es. Paola): tono più naturale, tuning dedicato. */
export function isPiperVoice(voice) {
  if (!voice?.name) return false;
  if (/piper|paola|riccardo|silero/i.test(voice.name)) return true;
  const lang = (voice.lang || '').toLowerCase();
  const name = voice.name.toLowerCase();
  // Speech Dispatcher espone spesso voci come MALE1/FEMALE1 con lang it-IT.
  return lang.startsWith('it') && /male|female|piper|italian|italiano/.test(name);
}

/** Parametri rate/pitch/volume per Web Speech API (ulteriore rifinitura lato browser). */
export function voiceTuning(voice, firefox = isFirefox()) {
  // Piper: già naturale — leggermente più lento e stabile (pacato, esplicativo).
  if (voice && isPiperVoice(voice)) {
    return { rate: 0.88, pitch: 0.97, volume: 0.98 };
  }
  if (voice && isRoboticVoice(voice)) {
    return firefox
      ? { rate: 0.78, pitch: 0.88, volume: 0.92 }
      : { rate: 0.84, pitch: 0.92, volume: 0.95 };
  }
  return { rate: 0.96, pitch: 1.0, volume: 1.0 };
}

export function waitForVoices(timeoutMs = 2800) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }
    const synth = window.speechSynthesis;
    const ready = () => {
      const list = synth.getVoices();
      if (list.length) {
        resolve(list);
        return true;
      }
      return false;
    };
    if (ready()) return;
    const onChange = () => {
      if (ready()) synth.removeEventListener('voiceschanged', onChange);
    };
    synth.addEventListener('voiceschanged', onChange);
    setTimeout(() => {
      synth.removeEventListener('voiceschanged', onChange);
      resolve(synth.getVoices());
    }, timeoutMs);
  });
}

const pauseMs = (firefox, voice) => {
  if (voice && isPiperVoice(voice)) return firefox ? 200 : 120;
  return firefox ? 140 : 60;
};

function sleep(ms, token) {
  return new Promise((resolve) => {
    if (token?.cancelled) {
      resolve();
      return;
    }
    setTimeout(resolve, ms);
  });
}

/**
 * Pronuncia un singolo chunk con la voce del browser.
 */
function speakOneChunk(clean, locale, voices, token, useVoice) {
  return new Promise((resolve) => {
    if (token?.cancelled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve(false);
      return;
    }
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = locale;
    let picked = null;
    if (useVoice) {
      picked = pickBestVoice(voices, locale);
      if (picked) utter.voice = picked;
    }
    const tune = voiceTuning(picked);
    utter.rate = tune.rate;
    utter.pitch = tune.pitch;
    utter.volume = tune.volume;

    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      if (keepAlive) clearInterval(keepAlive);
      resolve(ok);
    };

    utter.onend = () => done(true);
    utter.onerror = () => done(false);

    // Firefox: speechSynthesis si "addormenta" spesso — tienilo sveglio.
    let keepAlive = null;
    if (isFirefox()) {
      keepAlive = setInterval(() => {
        try {
          synth.resume();
        } catch {
          /* ignore */
        }
      }, 120);
    }

    try {
      synth.resume();
    } catch {
      /* ignore */
    }

    const start = () => {
      if (token?.cancelled) {
        done(false);
        return;
      }
      synth.speak(utter);
    };

    if (isFirefox()) setTimeout(start, 40);
    else start();
  });
}

/**
 * Pronuncia un blocco; riprova senza voice esplicita se fallisce.
 */
export async function speakBrowserChunk(clean, locale, token) {
  const voices = await waitForVoices();
  if (token?.cancelled) return;
  let ok = await speakOneChunk(clean, locale, voices, token, true);
  if (!ok && !token?.cancelled) {
    ok = await speakOneChunk(clean, locale, voices, token, false);
  }
}

/**
 * Pronuncia testo completo a chunk con pause (ideale per risposte lunghe su Firefox).
 */
export async function speakBrowserText(text, locale, token) {
  const firefox = isFirefox();
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch {
      /* ignore */
    }
  }
  const voices = await waitForVoices();
  const picked = pickBestVoice(voices, locale);
  const chunks = splitForBrowserSpeech(text, locale, {
    firefox,
    maxLen: picked && isPiperVoice(picked) ? 72 : undefined,
  });
  for (let i = 0; i < chunks.length; i++) {
    if (token?.cancelled) return;
    await speakBrowserChunk(chunks[i], locale, token);
    if (token?.cancelled) return;
    if (i + 1 < chunks.length) await sleep(pauseMs(firefox, picked), token);
  }
}
