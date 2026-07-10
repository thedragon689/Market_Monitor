import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './chat.css';
import { useChat } from '../../hooks/useChat';
import { API_BASE } from '../../config/api';
import { apiFetch } from '../../utils/apiFetch';
import {
  isFirefox,
  splitForBrowserSpeech,
  speakBrowserText,
  waitForVoices,
} from '../../utils/browserSpeech';
import { parseVoiceCommand } from '../../hooks/useDensityPreset';

const SUGGESTIONS = [
  'Come funziona Market Monitor?',
  "Cos'è l'RSI?",
  'Prezzo di Apple',
  'Previsione BTC',
];

const VOICE_KEY = 'mm:chat-voice';
const LANG_KEY = 'mm:chat-lang';

// Lingue selezionabili: codice UI, etichetta, e locale BCP-47 per la voce.
const LANGUAGES = [
  { code: 'it', label: '🇮🇹 IT', locale: 'it-IT' },
  { code: 'en', label: '🇬🇧 EN', locale: 'en-US' },
  { code: 'es', label: '🇪🇸 ES', locale: 'es-ES' },
  { code: 'fr', label: '🇫🇷 FR', locale: 'fr-FR' },
  { code: 'de', label: '🇩🇪 DE', locale: 'de-DE' },
  { code: 'pt', label: '🇵🇹 PT', locale: 'pt-PT' },
];

const localeFor = (code) => LANGUAGES.find((l) => l.code === code)?.locale || 'it-IT';

function loadLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch {
    /* ignore */
  }
  return 'it';
}

function loadAutoSpeak() {
  try {
    return localStorage.getItem(VOICE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Rendering markdown-lite → JSX (grassetto, code, liste, paragrafi). Nessun HTML raw. */
function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return <span key={key}>{part}</span>;
  });
}

function renderMarkdown(text) {
  const lines = String(text).split('\n');
  const blocks = [];
  let list = null;
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (/^[-•]\s+/.test(trimmed)) {
      if (!list) list = [];
      list.push(
        <li key={`li-${idx}`}>{renderInline(trimmed.replace(/^[-•]\s+/, ''), `li-${idx}`)}</li>
      );
      return;
    }
    if (list) {
      blocks.push(<ul key={`ul-${idx}`}>{list}</ul>);
      list = null;
    }
    if (trimmed) blocks.push(<p key={`p-${idx}`}>{renderInline(trimmed, `p-${idx}`)}</p>);
  });
  if (list) blocks.push(<ul key="ul-end">{list}</ul>);
  return blocks;
}

export default function ChatWidget({ getContext, onAction }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(loadAutoSpeak);
  const [speaking, setSpeaking] = useState(false);
  const [neuralDown, setNeuralDown] = useState(false);
  const [useSystemVoice, setUseSystemVoice] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const [lang, setLang] = useState(loadLang);
  const { messages, sending, config, translateAvailable, llmAvailable, send, clear } = useChat({
    getContext,
    onAction,
    lang,
  });
  const multilingual = translateAvailable || llmAvailable;
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const lastSpokenRef = useRef(null);
  const speakTokenRef = useRef(null);
  const ttsFetchAbortRef = useRef(null);
  // Quando il TTS neurale fallisce (es. quota giornaliera esaurita) evitiamo di
  // ritentare per un po': si usa subito la voce del browser, restando nel gesto
  // del click (l'autoplay resta permesso) e senza attese inutili.
  const neuralBlockedUntilRef = useRef(0);

  const stopNeuralAudio = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      } catch {
        /* ignore */
      }
      audioRef.current = null;
    }
  }, []);

  const abortTtsFetches = useCallback(() => {
    if (ttsFetchAbortRef.current) {
      try {
        ttsFetchAbortRef.current.abort();
      } catch {
        /* ignore */
      }
      ttsFetchAbortRef.current = null;
    }
  }, []);

  // Riproduce un audio (data URL/URL); risolve a fine riproduzione o 'error'.
  const playAudioChunk = useCallback(
    (src, token) =>
      new Promise((resolve) => {
        if (token?.cancelled) {
          resolve();
          return;
        }
        const audio = new Audio(src);
        audioRef.current = audio;
        const finish = (result) => {
          if (audioRef.current === audio) audioRef.current = null;
          resolve(result);
        };
        audio.onended = () => finish();
        audio.onerror = () => {
          try {
            audio.pause();
          } catch {
            /* ignore */
          }
          finish('error');
        };
        audio.play().catch(() => {
          try {
            audio.pause();
          } catch {
            /* ignore */
          }
          finish('error');
        });
      }),
    []
  );

  // Sintetizza un blocco via Edge TTS (RapidAPI); null se fallisce o annullato.
  const fetchTtsChunk = useCallback(async (text, locale, signal) => {
    try {
      const { ok, data, res } = await apiFetch(`${API_BASE}/api/chat/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: locale, lang: locale }),
        signal,
        optional: true,
      });
      if (!ok) {
        if (res?.status === 429) return { audio: null, rateLimited: true };
        return { audio: null, rateLimited: false };
      }
      return {
        audio: data?.audio || data?.audioUrl || null,
        rateLimited: false,
      };
    } catch {
      return { audio: null, rateLimited: false };
    }
  }, []);

  const stopSpeak = useCallback(() => {
    if (speakTokenRef.current) speakTokenRef.current.cancelled = true;
    abortTtsFetches();
    stopNeuralAudio();
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    setSpeaking(false);
  }, [abortTtsFetches, stopNeuralAudio]);

  /** Edge TTS: un chunk alla volta, nessun prefetch finché il precedente non va a buon fine. */
  const tryEdgeTts = useCallback(
    async (chunks, locale, token) => {
      const controller = new AbortController();
      ttsFetchAbortRef.current = controller;
      const timeout = setTimeout(() => controller.abort(), 20000);

      try {
        for (let i = 0; i < chunks.length; i++) {
          if (token.cancelled) return 'cancelled';

          const { audio, rateLimited } = await fetchTtsChunk(
            chunks[i],
            locale,
            controller.signal
          );
          if (token.cancelled) return 'cancelled';

          if (rateLimited) return 'rate_limited';
          if (!audio) return 'failed';

          const result = await playAudioChunk(audio, token);
          if (token.cancelled) return 'cancelled';
          if (result === 'error') return 'failed';
        }
        return 'ok';
      } finally {
        clearTimeout(timeout);
        if (ttsFetchAbortRef.current === controller) ttsFetchAbortRef.current = null;
      }
    },
    [fetchTtsChunk, playAudioChunk]
  );

  const speak = useCallback(
    async (text, code) => {
      const locale = localeFor(code || lang);
      const neuralReady = Boolean(config?.hasTTS) && Date.now() >= neuralBlockedUntilRef.current;
      const firefox = isFirefox();
      const chunks = splitForBrowserSpeech(text, locale, {
        firefox,
        maxLen: neuralReady ? 320 : undefined,
      });
      if (!chunks.length) return;

      stopSpeak();
      const token = { cancelled: false };
      speakTokenRef.current = token;
      setSpeaking(true);

      // Solo voce browser (Edge non configurato o bloccato per quota).
      if (!neuralReady) {
        setUseSystemVoice(true);
        setNeuralDown(Date.now() < neuralBlockedUntilRef.current);
        await speakBrowserText(text, locale, token);
        if (!token.cancelled) setSpeaking(false);
        return;
      }

      setUseSystemVoice(false);
      setNeuralDown(false);

      // Fase 1: Edge TTS sequenziale — niente fallback in parallelo.
      const edgeResult = await tryEdgeTts(chunks, locale, token);
      if (token.cancelled) return;

      if (edgeResult === 'ok') {
        neuralBlockedUntilRef.current = 0;
        setNeuralDown(false);
        setUseSystemVoice(false);
        setSpeaking(false);
        return;
      }

      // Fase 2: Edge fallito → ferma tutto il neurale, poi solo browser.
      abortTtsFetches();
      stopNeuralAudio();
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* ignore */
      }

      if (edgeResult === 'rate_limited') {
        neuralBlockedUntilRef.current = Date.now() + 30 * 60 * 1000;
      } else {
        neuralBlockedUntilRef.current = Date.now() + 10 * 60 * 1000;
      }
      setNeuralDown(true);
      setUseSystemVoice(true);

      await speakBrowserText(text, locale, token);
      if (!token.cancelled) setSpeaking(false);
    },
    [
      config?.hasTTS,
      stopSpeak,
      abortTtsFetches,
      stopNeuralAudio,
      tryEdgeTts,
      lang,
    ]
  );

  const changeLang = (code) => {
    stopSpeak();
    setLang(code);
    try {
      localStorage.setItem(LANG_KEY, code);
    } catch {
      /* ignore */
    }
  };

  const toggleAutoSpeak = () => {
    setAutoSpeak((v) => {
      const next = !v;
      try {
        localStorage.setItem(VOICE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      if (!next) stopSpeak();
      return next;
    });
  };

  const voiceSupported = useMemo(
    () =>
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition),
    []
  );

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, sending]);

  // Legge ad alta voce le nuove risposte dell'assistente (se auto-voce attiva).
  useEffect(() => {
    if (!autoSpeak || !open || sending) return;
    const last = messages[messages.length - 1];
    if (last && last.role === 'assistant' && last.id !== lastSpokenRef.current) {
      lastSpokenRef.current = last.id;
      speak(last.text, last.lang);
    }
  }, [messages, autoSpeak, open, sending, speak]);

  // Ferma la voce su smontaggio.
  useEffect(() => () => stopSpeak(), [stopSpeak]);

  // Precarica le voci del browser: getVoices() è spesso vuoto al primo accesso
  // finché non scatta l'evento voiceschanged, e senza voci la sintesi resta muta.
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
    const warm = () => setVoicesReady(window.speechSynthesis.getVoices().length > 0);
    warm();
    window.speechSynthesis.addEventListener?.('voiceschanged', warm);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', warm);
  }, []);

  const submit = (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    send(text);
  };

  const toggleVoice = () => {
    if (!voiceSupported) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = localeFor(lang);
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const said = ev.results?.[0]?.[0]?.transcript;
      if (!said) return;
      const cmd = parseVoiceCommand(said);
      if (cmd?.action === 'navigate' && cmd.view) {
        onAction?.({ type: 'navigate', view: cmd.view });
        setListening(false);
        return;
      }
      if (cmd?.action === 'symbol' && cmd.symbol) {
        onAction?.({ type: 'navigate', symbol: cmd.symbol, symbolType: 'stock' });
        setListening(false);
        return;
      }
      setInput((prev) => (prev ? `${prev} ${said}` : said));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <>
      <button
        type="button"
        className={`chat-fab ${open ? 'is-open' : ''}`}
        aria-label={open ? 'Chiudi assistente' : 'Apri assistente AI'}
        aria-expanded={open}
        onClick={() =>
          setOpen((v) => {
            if (v) stopSpeak();
            return !v;
          })
        }
      >
        {open ? (
          '×'
        ) : (
          <img
            src="/chatbot-icon.png"
            alt=""
            className="chat-fab__icon"
            width={256}
            height={256}
            decoding="async"
          />
        )}
      </button>

      {open && (
        <section className="chat-panel" role="dialog" aria-label="Assistente Market Monitor">
          <header className="chat-panel__head">
            <div className="chat-panel__title">
              <img
                src="/chatbot-icon-sm.png"
                alt=""
                className="chat-panel__avatar"
                width={64}
                height={64}
                decoding="async"
              />
              Assistente
            </div>
            <div className="chat-panel__head-actions">
              {multilingual && (
                <select
                  className="chat-panel__lang"
                  value={lang}
                  onChange={(e) => changeLang(e.target.value)}
                  aria-label="Lingua dell'assistente"
                  title="Lingua"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                className={`chat-panel__link ${autoSpeak ? 'is-on' : ''}`}
                onClick={toggleAutoSpeak}
                aria-pressed={autoSpeak}
                title={
                  autoSpeak
                    ? useSystemVoice
                      ? 'Voce attiva (sistema — sintetica; neurale quando disponibile)'
                      : neuralDown
                        ? 'Voce attiva (neurale non disponibile)'
                        : 'Voce attiva (neurale)'
                    : 'Voce disattivata'
                }
              >
                {autoSpeak ? '🔊' : '🔈'}
              </button>
              {speaking && (
                <button
                  type="button"
                  className="chat-panel__link"
                  onClick={stopSpeak}
                  title="Ferma la voce"
                  aria-label="Ferma la voce"
                >
                  ⏹
                </button>
              )}
              {messages.length > 0 && (
                <button
                  type="button"
                  className="chat-panel__link"
                  onClick={() => {
                    stopSpeak();
                    clear();
                  }}
                >
                  Pulisci
                </button>
              )}
              <button
                type="button"
                className="chat-panel__link"
                onClick={() => {
                  stopSpeak();
                  setOpen(false);
                }}
                aria-label="Chiudi"
              >
                ×
              </button>
            </div>
          </header>

          {!voicesReady && (
            <p className="chat-panel__voice-warn" role="status">
              🔇 Nessuna voce disponibile nel browser. Su Linux installa una voce di sistema
              (es. <code>sudo apt install speech-dispatcher espeak-ng</code>, poi riavvia il browser)
              oppure usa Chrome.
            </p>
          )}
          {voicesReady && useSystemVoice && !config?.hasLocalTTS && (
            <p className="chat-panel__voice-warn chat-panel__voice-warn--system" role="status">
              🔈 Voce di sistema (tono sintetico). La voce Paola locale si usa quando l&apos;API
              risponde; altrimenti questa voce del browser.
            </p>
          )}

          <div className="chat-panel__body" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="chat-welcome">
                <p className="chat-welcome__lead">
                  Ciao! Sono l’assistente di <strong>Market Monitor</strong>. Chiedimi come funziona
                  l’app, un indicatore, il prezzo di un asset o la tua watchlist.
                </p>
                <p className="chat-welcome__note">Contenuti educativi, non consulenza finanziaria.</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`chat-msg chat-msg--${m.role}`}>
                  <div className="chat-msg__bubble">{renderMarkdown(m.text)}</div>
                  {m.role === 'assistant' && m.notice && (
                    <p className="chat-msg__notice" role="status">
                      {m.notice}
                    </p>
                  )}
                  {m.role === 'assistant' && (
                  <button
                    type="button"
                    className="chat-msg__speak"
                    onClick={() => speak(m.text, m.lang)}
                    title="Ascolta"
                    aria-label="Ascolta la risposta"
                  >
                      🔊
                    </button>
                  )}
                </div>
              ))
            )}
            {sending && (
              <div className="chat-msg chat-msg--assistant">
                <div className="chat-msg__bubble chat-msg__bubble--typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <div className="chat-suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="chat-chip" onClick={() => send(s)} disabled={sending}>
                {s}
              </button>
            ))}
          </div>

          <form className="chat-input" onSubmit={submit}>
            {voiceSupported && (
              <button
                type="button"
                className={`chat-input__mic ${listening ? 'is-on' : ''}`}
                onClick={toggleVoice}
                aria-label={listening ? 'Ferma dettatura' : 'Dettatura vocale'}
                title="Dettatura vocale"
              >
                🎤
              </button>
            )}
            <input
              type="text"
              className="chat-input__field"
              placeholder="Scrivi un messaggio…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Messaggio"
            />
            <button
              type="submit"
              className="chat-input__send"
              disabled={!input.trim() || sending}
              aria-label="Invia"
            >
              ➤
            </button>
          </form>
        </section>
      )}
    </>
  );
}
