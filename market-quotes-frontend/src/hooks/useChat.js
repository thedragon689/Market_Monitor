import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '../config/api';
import { apiFetch } from '../utils/apiFetch';
import { buildLocalAnswer } from '../utils/assistant';

const STORAGE_KEY = 'mm:chat';
const MAX_STORED = 50;

// Nome (in inglese) atteso dal traduttore RapidAPI per ogni codice lingua.
export const LANG_NAMES = {
  it: 'Italian',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
};

function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* ignore */
  }
  return [];
}

let idSeq = 0;
const newId = () => `m${Date.now()}_${idSeq++}`;

/**
 * Chat assistente: motore locale (offline) + fallback LLM opzionale lato server.
 * onAction(action) esegue le azioni di navigazione richieste dalle risposte.
 */
export function useChat({ getContext, onAction, lang = 'it' } = {}) {
  const [messages, setMessages] = useState(loadMessages);
  const [sending, setSending] = useState(false);
  const [config, setConfig] = useState({
    hasLLM: false,
    provider: 'local',
    hasTTS: false,
    hasTranslate: false,
  });
  const llmAvailable = config.hasLLM;
  const translateAvailable = config.hasTranslate;
  const ctxRef = useRef(getContext);
  const actRef = useRef(onAction);
  const langRef = useRef(lang);

  useEffect(() => {
    ctxRef.current = getContext;
    actRef.current = onAction;
    langRef.current = lang;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
    } catch {
      /* ignore */
    }
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`${API_BASE}/api/chat/config`, { optional: true })
      .then(({ data }) => {
        if (!cancelled && data) {
          setConfig({
            hasLLM: Boolean(data.hasLLM),
            provider: data.provider || 'local',
            hasTTS: Boolean(data.hasTTS),
            hasTranslate: Boolean(data.hasTranslate),
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const appendMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, { id: newId(), ts: Date.now(), ...msg }]);
  }, []);

  // Traduzione via RapidAPI. Ritorna il testo tradotto o null (fallback all'originale).
  const translate = useCallback(async (text, from, to) => {
    const clean = String(text || '').trim();
    if (!clean || from === to) return clean || null;
    try {
      const { data } = await apiFetch(`${API_BASE}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, source: from, target: to }),
      });
      return typeof data?.text === 'string' && data.text.trim() ? data.text.trim() : null;
    } catch {
      return null;
    }
  }, []);

  const send = useCallback(
    async (rawText) => {
      const text = String(rawText || '').trim();
      if (!text || sending) return;

      const uiLang = langRef.current || 'it';
      const isForeign = uiLang !== 'it' && translateAvailable;
      const targetName = LANG_NAMES[uiLang] || 'English';

      appendMessage({ role: 'user', text, lang: uiLang });
      setSending(true);

      const context = ctxRef.current?.() || {};

      // Il motore locale ragiona in italiano: traduco l'input se serve (solo per intent/azioni).
      const itText = isForeign ? (await translate(text, targetName, 'Italian')) || text : text;
      const local = buildLocalAnswer(itText, context);

      let reply = local.reply;
      let source = 'local';
      let answeredByLLM = false;
      let notice = null;

      // Risposte locali deterministiche (navigazione, guida app, concetti): non passare all'LLM.
      const keepLocal =
        local.action ||
        local.guideTopic ||
        local.conceptId ||
        (local.confidence ?? 0) >= 0.88;

      if (!keepLocal && llmAvailable) {
        try {
          const history = messages
            .slice(-8)
            .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
          const { data } = await apiFetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [...history, { role: 'user', content: text }],
              context,
              lang: uiLang,
            }),
          });
          // Uso la risposta solo se arriva davvero dall'LLM.
          if (data?.reply && data.provider && data.provider !== 'local') {
            reply = data.reply;
            source = 'llm';
            answeredByLLM = true;
          } else if (data?.fallback) {
            // Provider configurato ma non disponibile: tengo la risposta locale + nota.
            notice =
              data.reason === 'quota'
                ? 'AI non disponibile (quota esaurita): risposta base.'
                : 'AI non disponibile al momento: risposta base.';
          }
        } catch {
          /* mantiene la risposta locale */
        }
      }

      // Traduco solo le risposte del motore locale (italiano): l'LLM risponde già nella lingua scelta.
      if (isForeign && !answeredByLLM) {
        const translated = await translate(reply, 'Italian', targetName);
        if (translated) reply = translated;
      }

      appendMessage({ role: 'assistant', text: reply, source, notice, lang: uiLang });
      if (local.action) actRef.current?.(local.action);
      setSending(false);
    },
    [appendMessage, llmAvailable, translateAvailable, translate, messages, sending]
  );

  const clear = useCallback(() => setMessages([]), []);

  return { messages, sending, llmAvailable, translateAvailable, config, send, clear };
}
