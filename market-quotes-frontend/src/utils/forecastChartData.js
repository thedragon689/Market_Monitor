import { formatShortDate } from './format';
import { toDisplayPrice } from './chartAxis';

const TRIM_DAYS = 45;

function forecastPoints(method) {
  if (!method || method.error) return [];
  return method.forecasts ?? [];
}

/**
 * Overlay SMA (orizzontale) e regressione lineare con indici globali coerenti
 * con il backend (finestra sugli ultimi N prezzi della serie completa).
 */
export function applyClassicOverlays(rows, forecast, cv, historyLength) {
  if (!rows?.length || !forecast?.methods || historyLength < 1) return;

  const reg = forecast.methods.linearRegression;
  const smaMethod = forecast.methods.sma;
  const window =
    reg?.window ?? smaMethod?.window ?? forecast.windowSize ?? 5;
  const fitStart = Math.max(1, historyLength - window + 1);

  const slope = reg?.coefficients?.slope;
  const intercept = reg?.coefficients?.intercept;
  const hasLinear = slope != null && intercept != null && !reg?.error;
  const smaLevel = smaMethod?.level;
  const hasSma = smaLevel != null && !smaMethod?.error;

  for (const row of rows) {
    if (row.index == null) continue;
    const t = row.index;

    if (hasLinear && t >= fitStart) {
      const localT = t - fitStart + 1;
      row.linear = cv(slope * localT + intercept);
    }

    if (hasSma && t >= fitStart) {
      row.sma = cv(smaLevel);
    }
  }
}

export function buildForecastChartData(history, forecast, fx, meta, currency) {
  if (!history?.length) return { data: [], historyLength: 0 };

  const cv = (p) => toDisplayPrice(p, fx, meta, currency);
  const historyLength = history.length;

  const historical = history.map((p, i) => ({
    key: `h-${p.date}`,
    date: p.date,
    label: formatShortDate(p.date),
    actual: cv(p.price),
    sma: null,
    linear: null,
    logReturn: null,
    prophet: null,
    arima: null,
    lstm: null,
    kind: 'history',
    index: i + 1,
  }));

  const last = historical[historical.length - 1];
  const smaPoints = forecastPoints(forecast?.methods?.sma);
  const linearPoints = forecastPoints(forecast?.methods?.linearRegression);
  const logPoints = forecastPoints(forecast?.methods?.logReturn);
  const prophetPoints = forecastPoints(forecast?.methods?.prophet);
  const arimaPoints = forecastPoints(forecast?.methods?.arima);
  const lstmPoints = forecastPoints(forecast?.methods?.lstm);
  const maxLen = Math.max(
    smaPoints.length,
    linearPoints.length,
    logPoints.length,
    prophetPoints.length,
    arimaPoints.length,
    lstmPoints.length
  );

  const future = [];
  for (let k = 0; k < maxLen; k++) {
    const offset = k + 1;
    future.push({
      key: `f-${offset}`,
      date: null,
      label: `+${offset} gg`,
      actual: k === 0 ? last.actual : null,
      sma: cv(smaPoints[k]?.price ?? null),
      linear: cv(linearPoints[k]?.price ?? null),
      logReturn: cv(logPoints[k]?.price ?? null),
      prophet: cv(prophetPoints[k]?.price ?? null),
      arima: cv(arimaPoints[k]?.price ?? null),
      lstm: cv(lstmPoints[k]?.price ?? null),
      kind: 'forecast',
      index: historyLength + offset,
    });
  }

  const trimmed = historical.slice(-TRIM_DAYS);
  applyClassicOverlays(trimmed, forecast, cv, historyLength);

  if (future.length && trimmed.length) {
    const bridge = trimmed[trimmed.length - 1];
    const head = future[0];
    if (bridge.sma != null && head.sma == null) head.sma = bridge.sma;
    if (bridge.linear != null && head.linear == null) head.linear = bridge.linear;
    if (head.actual == null) head.actual = bridge.actual;
  }

  return { data: [...trimmed, ...future], historyLength };
}

export function buildForecastRawByKey(history, forecast, trimmedLen = TRIM_DAYS) {
  const rawByKey = {};
  const trimmedHist = history?.slice(-trimmedLen) ?? [];
  trimmedHist.forEach((p) => {
    rawByKey[`h-${p.date}`] = { actual: p.price };
  });

  const reg = forecast?.methods?.linearRegression;
  const smaMethod = forecast?.methods?.sma;
  const historyLength = history?.length ?? 0;
  const window =
    reg?.window ?? smaMethod?.window ?? forecast?.windowSize ?? 5;
  const fitStart = Math.max(1, historyLength - window + 1);

  if (trimmedHist.length && reg?.coefficients && !reg?.error) {
    const { slope, intercept } = reg.coefficients;
    trimmedHist.forEach((p, i) => {
      const t = historyLength - trimmedHist.length + i + 1;
      if (t < fitStart) return;
      const localT = t - fitStart + 1;
      const key = `h-${p.date}`;
      rawByKey[key] = {
        ...rawByKey[key],
        linear: slope * localT + intercept,
      };
    });
  }

  if (smaMethod?.level != null && !smaMethod?.error && trimmedHist.length) {
    trimmedHist.forEach((p, i) => {
      const t = historyLength - trimmedHist.length + i + 1;
      if (t < fitStart) return;
      const key = `h-${p.date}`;
      rawByKey[key] = { ...rawByKey[key], sma: smaMethod.level };
    });
  }

  const smaPts = forecastPoints(forecast?.methods?.sma);
  const linPts = forecastPoints(forecast?.methods?.linearRegression);
  const logPts = forecastPoints(forecast?.methods?.logReturn);
  const prophetPts = forecastPoints(forecast?.methods?.prophet);
  const arimaPts = forecastPoints(forecast?.methods?.arima);
  const lstmPts = forecastPoints(forecast?.methods?.lstm);
  const maxLen = Math.max(
    smaPts.length,
    linPts.length,
    logPts.length,
    prophetPts.length,
    arimaPts.length,
    lstmPts.length
  );
  const lastHist = history?.[history.length - 1];

  for (let k = 0; k < maxLen; k++) {
    rawByKey[`f-${k + 1}`] = {
      actual: k === 0 ? lastHist?.price : null,
      sma: smaPts[k]?.price ?? null,
      linear: linPts[k]?.price ?? null,
      logReturn: logPts[k]?.price ?? null,
      prophet: prophetPts[k]?.price ?? null,
      arima: arimaPts[k]?.price ?? null,
      lstm: lstmPts[k]?.price ?? null,
    };
  }

  return rawByKey;
}

/** Serie visibili e spessore linea adattivo al numero di overlay. */
export function forecastSeriesMeta(forecast) {
  const m = forecast?.methods ?? {};
  const hasSma = Boolean(m.sma && !m.sma.error && m.sma.level != null);
  const hasLinear = Boolean(
    m.linearRegression &&
      !m.linearRegression.error &&
      (m.linearRegression.coefficients || m.linearRegression.forecasts?.length)
  );
  const hasLogReturn = Boolean(m.logReturn && !m.logReturn.error && m.logReturn.forecasts?.length);
  const hasProphet = Boolean(m.prophet && !m.prophet.error && m.prophet.forecasts?.length);
  const hasArima = Boolean(m.arima && !m.arima.error && m.arima.forecasts?.length);
  const hasLstm = Boolean(m.lstm && !m.lstm.error && m.lstm.forecasts?.length);

  const overlays = [
    hasSma && 'sma',
    hasLinear && 'linear',
    hasLogReturn && 'logReturn',
    hasProphet && 'prophet',
    hasArima && 'arima',
    hasLstm && 'lstm',
  ].filter(Boolean);

  const count = overlays.length;
  const overlayWidth = count <= 2 ? 2.75 : count <= 4 ? 2.35 : 2.1;
  const classicWidth = count <= 3 ? 3 : 2.5;

  return {
    overlays,
    hasSma,
    hasLinear,
    hasLogReturn,
    hasProphet,
    hasArima,
    hasLstm,
    classicWidth,
    overlayWidth,
    mlWidth: count >= 5 ? 2.1 : 2.35,
  };
}
