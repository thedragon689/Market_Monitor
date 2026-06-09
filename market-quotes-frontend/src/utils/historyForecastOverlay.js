import { toDisplayPrice } from './chartAxis';

function forecastPoints(method) {
  if (!method || method.error) return [];
  return method.forecasts ?? [];
}

function hybridRaw(arima, lstm) {
  if (arima != null && lstm != null) return (Number(arima) + Number(lstm)) / 2;
  return arima ?? lstm ?? null;
}

/**
 * Aggiunge punti futuri e serie ARIMA / LSTM / Ibrido al dataset del grafico storico.
 */
export function appendForecastOverlays(rows, forecast, overlays, fx, meta, currency) {
  if (!rows?.length || !forecast?.methods) return rows;

  const cv = (p) =>
    p != null && Number.isFinite(Number(p)) ? toDisplayPrice(p, fx, meta, currency) : null;

  const wantArima = overlays?.forecastArima;
  const wantLstm = overlays?.forecastLstm;
  const wantHybrid = overlays?.forecastHybrid;
  if (!wantArima && !wantLstm && !wantHybrid) return rows;

  const arimaPts = forecastPoints(forecast.methods.arima);
  const lstmPts = forecastPoints(forecast.methods.lstm);
  const maxLen = Math.max(
    wantArima ? arimaPts.length : 0,
    wantLstm ? lstmPts.length : 0,
    wantHybrid ? Math.max(arimaPts.length, lstmPts.length) : 0
  );
  if (!maxLen) return rows;

  const out = rows.map((r) => ({ ...r }));
  const last = out[out.length - 1];
  const bridge = last.display;

  if (wantArima && arimaPts.length) last.fcArima = bridge;
  if (wantLstm && lstmPts.length) last.fcLstm = bridge;
  if (wantHybrid && (arimaPts.length || lstmPts.length)) last.fcHybrid = bridge;

  for (let k = 0; k < maxLen; k++) {
    const arimaRaw = arimaPts[k]?.price ?? null;
    const lstmRaw = lstmPts[k]?.price ?? null;
    out.push({
      key: `fc-${k + 1}`,
      date: null,
      label: `+${k + 1}g`,
      price: null,
      display: null,
      kind: 'forecast',
      fcArima: wantArima ? cv(arimaRaw) : null,
      fcLstm: wantLstm ? cv(lstmRaw) : null,
      fcHybrid: wantHybrid ? cv(hybridRaw(arimaRaw, lstmRaw)) : null,
    });
  }

  return out;
}

export function hasForecastOverlays(forecast) {
  const m = forecast?.methods ?? {};
  const arima = Boolean(m.arima && !m.arima.error && m.arima.forecasts?.length);
  const lstm = Boolean(m.lstm && !m.lstm.error && m.lstm.forecasts?.length);
  return { arima, lstm, hybrid: arima || lstm };
}
