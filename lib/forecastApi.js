import { linearForecast, logReturnForecast, smaForecast } from './forecastModels.js';

/**
 * Costruisce risposta previsioni per API/UI.
 * @param {number[]} prices
 * @param {{ windowSize?: number, horizonDays?: number, methods?: string }} opts
 */
export function buildForecastResponse(prices, { windowSize = 5, horizonDays = 5, methods = 'both' } = {}) {
  const data = (prices || []).map(Number).filter((p) => Number.isFinite(p));
  const methodsOut = {};

  const wantSma = methods === 'sma' || methods === 'both' || methods === 'all';
  const wantLinear = methods === 'linear' || methods === 'both' || methods === 'all';
  const wantLog = methods === 'log' || methods === 'all';

  if (wantSma) {
    const smaResult = smaForecast(data, windowSize, horizonDays);
    if (smaResult) {
      methodsOut.sma = {
        label: 'Media mobile semplice',
        formula: `SMA(N=${windowSize})`,
        description: `Stima costante al livello della media degli ultimi ${windowSize} giorni.`,
        window: smaResult.window,
        level: smaResult.level,
        nextDay: smaResult.forecasts[0]?.price ?? null,
        forecasts: smaResult.forecasts,
      };
    } else {
      methodsOut.sma = {
        error: `Servono almeno ${windowSize} punti per la media mobile.`,
      };
    }
  }

  if (wantLinear) {
    const lin = linearForecast(data, horizonDays);
    if (lin) {
      methodsOut.linearRegression = {
        label: 'Regressione lineare',
        formula: 'y = a·t + b',
        description: 'Estrapolazione del trend lineare sui prezzi storici.',
        coefficients: { slope: lin.slope, intercept: lin.intercept },
        nextDay: lin.forecasts[0]?.price ?? null,
        forecasts: lin.forecasts,
      };
    } else {
      methodsOut.linearRegression = { error: 'Dati insufficienti per la regressione lineare.' };
    }
  }

  if (wantLog) {
    const log = logReturnForecast(data, horizonDays);
    if (log) {
      methodsOut.logReturn = {
        label: 'Log-return',
        formula: 'Pₜ₊₁ = Pₜ · e^r̄',
        description: 'Media dei rendimenti logaritmici giornalieri.',
        avgLogReturn: log.avgLogReturn,
        nextDay: log.nextPrice,
        forecasts: log.forecasts,
      };
    } else {
      methodsOut.logReturn = { error: 'Dati insufficienti per il modello log-return.' };
    }
  }

  return {
    horizonDays,
    windowSize,
    lastPrice: data.length ? data[data.length - 1] : null,
    methods: methodsOut,
  };
}
