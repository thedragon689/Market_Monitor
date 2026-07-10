/**
 * Logger strutturato + hook Sentry/Datadog opzionali (Prompt 14).
 */
const levelRank = { debug: 10, info: 20, warn: 30, error: 40 };

let sentry = null;

export function initObservability() {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (dsn) {
    import('@sentry/node')
      .then((mod) => {
        mod.init({
          dsn,
          environment: process.env.NODE_ENV || 'development',
          tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
        });
        sentry = mod;
      })
      .catch(() => {
        console.warn('[observability] @sentry/node non installato — ignoro SENTRY_DSN');
      });
  }
}

function shouldLog(level) {
  const min = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
  return levelRank[level] >= (levelRank[min] ?? 20);
}

function forwardToSentry(level, msg, meta) {
  if (!sentry || level !== 'error') return;
  try {
    if (meta?.error instanceof Error) sentry.captureException(meta.error);
    else sentry.captureMessage(msg, 'error');
  } catch {
    /* ignore */
  }
}

function write(level, msg, meta) {
  if (!shouldLog(level)) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    service: 'market-monitor-api',
    ...(meta && typeof meta === 'object' ? meta : meta != null ? { detail: meta } : {}),
  };
  const out = JSON.stringify(line);
  if (level === 'error') console.error(out);
  else if (level === 'warn') console.warn(out);
  else console.log(out);
  forwardToSentry(level, msg, meta);

  const datadogKey = process.env.DATADOG_API_KEY?.trim();
  if (datadogKey && levelRank[level] >= levelRank.warn) {
    fetch('https://http-intake.logs.datadoghq.com/api/v2/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': datadogKey,
      },
      body: JSON.stringify([{ ...line, ddsource: 'market-monitor', ddtags: `env:${process.env.NODE_ENV || 'dev'}` }]),
    }).catch(() => {});
  }
}

export const logger = {
  debug: (msg, meta) => write('debug', msg, meta),
  info: (msg, meta) => write('info', msg, meta),
  warn: (msg, meta) => write('warn', msg, meta),
  error: (msg, meta) => write('error', msg, meta),
};
