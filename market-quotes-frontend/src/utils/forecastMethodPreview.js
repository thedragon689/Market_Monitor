/** Anteprima dati per tile wireframe previsioni. */

export function formatTilePreviewLabel(method) {
  if (!method) return null;
  if (method.error) return { kind: 'error', message: method.error };
  if (method.nextDay != null && Number.isFinite(Number(method.nextDay))) {
    return { kind: 'next', value: method.nextDay };
  }
  const first = method.forecasts?.[0]?.price;
  if (first != null && Number.isFinite(Number(first))) {
    return { kind: 'next', value: first };
  }
  if (method.level != null && Number.isFinite(Number(method.level))) {
    return { kind: 'level', value: method.level };
  }
  return null;
}

/** Dati metodo per tile — sempre dalla risposta completa, indipendente dal metodo UI attivo. */
export function getTileMethodData(tileId, forecast) {
  const methods = forecast?.methods;
  if (!methods) return null;

  switch (tileId) {
    case 'linear':
      return methods.linearRegression ?? null;
    case 'sma':
      return methods.sma ?? null;
    case 'log':
      return methods.logReturn ?? null;
    case 'ml':
      return methods.arima ?? methods.lstm ?? null;
    default:
      return null;
  }
}

export function getTileMlPreviews(forecast) {
  const methods = forecast?.methods;
  if (!methods) return [];

  const entries = [];
  const push = (key, label) => {
    const m = methods[key];
    if (!m) return;
    entries.push({ key, label, method: m });
  };

  push('arima', 'ARIMA');
  push('lstm', 'LSTM');
  return entries;
}
