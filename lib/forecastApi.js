import { linearForecast, logReturnForecast, smaForecast } from './forecastModels.js';
import { arimaForecast } from './forecast/arimaModel.js';
import { lstmForecast } from './forecast/lstmModel.js';
import { prophetForecast } from './forecast/prophetModel.js';
import { computeVolatility } from './geopolitical/volatility.js';

// Pesi base per l'ensemble (riflettono l'affidabilità tipica dei modelli),
// normalizzati sui soli modelli effettivamente disponibili.
const ENSEMBLE_WEIGHTS = {
  arima: 0.25,
  lstm: 0.2,
  linearRegression: 0.2,
  logReturn: 0.15,
  prophet: 0.12,
  sma: 0.08,
};

// z-score per gli intervalli di confidenza.
const Z_80 = 1.2816;
const Z_95 = 1.96;

/**
 * Ensemble pesato dei modelli base + intervalli di confidenza (80%/95%)
 * derivati dalla volatilità storica (random walk: σ·√h).
 * Riusa le previsioni già calcolate in methodsOut e completa i membri mancanti.
 */
function buildEnsemble(data, methodsOut, { windowSize, horizonDays }) {
  const onDemand = {
    sma: () => smaForecast(data, windowSize, horizonDays)?.forecasts,
    linearRegression: () => linearForecast(data, horizonDays, windowSize)?.forecasts,
    logReturn: () => logReturnForecast(data, horizonDays, windowSize)?.forecasts,
    arima: () => arimaForecast(data, horizonDays, windowSize)?.forecasts,
    prophet: () => prophetForecast(data, horizonDays)?.forecasts,
    lstm: () => lstmForecast(data, horizonDays, windowSize)?.forecasts,
  };

  const members = [];
  for (const [key, weight] of Object.entries(ENSEMBLE_WEIGHTS)) {
    const existing = methodsOut[key];
    let forecasts =
      existing && !existing.error && existing.forecasts?.length ? existing.forecasts : null;
    if (!forecasts) {
      try {
        forecasts = onDemand[key]?.() || null;
      } catch {
        forecasts = null;
      }
    }
    if (forecasts?.length) members.push({ method: key, weight, forecasts });
  }

  if (members.length < 2) {
    return { error: 'Servono almeno 2 modelli disponibili per l’ensemble.' };
  }

  const totalWeight = members.reduce((a, m) => a + m.weight, 0);
  const normalized = members.map((m) => ({ ...m, weight: m.weight / totalWeight }));

  const vol = computeVolatility(data).daily;
  const base = data.length ? data[data.length - 1] : null;
  const clampLow = (v) => Number(Math.max(0, v).toFixed(6));

  const forecasts = [];
  for (let k = 0; k < horizonDays; k++) {
    let priceSum = 0;
    let weightSum = 0;
    for (const m of normalized) {
      const p = m.forecasts[k]?.price;
      if (Number.isFinite(p)) {
        priceSum += m.weight * p;
        weightSum += m.weight;
      }
    }
    if (!weightSum) continue;
    const price = priceSum / weightSum;
    const dayOffset = k + 1;
    const sigma = base != null ? Math.abs(base) * vol * Math.sqrt(dayOffset) : 0;
    forecasts.push({
      dayOffset,
      price: Number(price.toFixed(6)),
      lower80: clampLow(price - Z_80 * sigma),
      upper80: Number((price + Z_80 * sigma).toFixed(6)),
      lower95: clampLow(price - Z_95 * sigma),
      upper95: Number((price + Z_95 * sigma).toFixed(6)),
    });
  }

  return {
    label: 'Ensemble pesato',
    formula: 'Σ wᵢ·modelᵢ · IC(σ·√h)',
    description:
      'Media pesata dei modelli disponibili con intervalli di confidenza 80% e 95% ' +
      'stimati dalla volatilità storica.',
    members: normalized.map((m) => ({ method: m.method, weight: Number(m.weight.toFixed(4)) })),
    volatilityDaily: vol,
    confidence: { level80: 0.8, z80: Z_80, level95: 0.95, z95: Z_95 },
    nextDay: forecasts[0]?.price ?? null,
    forecasts,
  };
}

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
  const wantArima =
    methods === 'arima' || methods === 'all' || methods === 'ml';
  const wantLstm =
    methods === 'lstm' || methods === 'all' || methods === 'ml';
  const wantProphet =
    methods === 'prophet' || methods === 'all' || methods === 'commodity';
  const wantEnsemble = methods === 'ensemble' || methods === 'all';

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
    const lin = linearForecast(data, horizonDays, windowSize);
    if (lin) {
      methodsOut.linearRegression = {
        label: 'Regressione lineare',
        formula: `y = a·t + b (ultimi ${lin.window} gg)`,
        description: `Trend lineare stimato sugli ultimi ${lin.window} giorni, poi estrapolato in avanti.`,
        window: lin.window,
        coefficients: { slope: lin.slope, intercept: lin.intercept },
        fittedAtEnd: lin.fittedAtEnd,
        nextDay: lin.forecasts[0]?.price ?? null,
        forecasts: lin.forecasts,
      };
    } else {
      methodsOut.linearRegression = { error: 'Dati insufficienti per la regressione lineare.' };
    }
  }

  if (wantLog) {
    const log = logReturnForecast(data, horizonDays, windowSize);
    if (log) {
      methodsOut.logReturn = {
        label: 'Log-return',
        formula: `Pₜ₊₁ = Pₜ · e^r̄ (ultimi ${log.window} gg)`,
        description: `Media dei rendimenti logaritmici sugli ultimi ${log.window} giorni.`,
        window: log.window,
        avgLogReturn: log.avgLogReturn,
        nextDay: log.nextPrice,
        forecasts: log.forecasts,
      };
    } else {
      methodsOut.logReturn = { error: 'Dati insufficienti per il modello log-return.' };
    }
  }

  if (wantArima) {
    const arima = arimaForecast(data, horizonDays, windowSize);
    if (arima) {
      methodsOut.arima = {
        label: 'ARIMA',
        formula: arima.formula,
        description:
          'Modello ARIMA con selezione automatica dell’ordine (p,d,q), AR stimato via OLS e MA via CSS.',
        order: arima.order,
        window: arima.window,
        phi: arima.phi,
        theta: arima.theta,
        nextDay: arima.nextPrice,
        forecasts: arima.forecasts,
      };
    } else {
      methodsOut.arima = {
        error: 'Servono almeno 18 punti storici per ARIMA.',
      };
    }
  }

  if (wantProphet) {
    const prophet = prophetForecast(data, horizonDays);
    if (prophet) {
      methodsOut.prophet = {
        label: 'Prophet (stagionale)',
        formula: prophet.formula,
        description: 'Trend lineare + stagionalità settimanale — utile per commodities agricole ed energetiche.',
        components: prophet.components,
        nextDay: prophet.nextPrice,
        forecasts: prophet.forecasts,
      };
    } else {
      methodsOut.prophet = {
        error: 'Servono almeno 30 punti storici per Prophet.',
      };
    }
  }

  if (wantLstm) {
    const lstm = lstmForecast(data, horizonDays, windowSize);
    if (lstm) {
      methodsOut.lstm = {
        label: 'LSTM',
        formula: lstm.formula,
        description:
          'Rete LSTM leggera addestrata online sui rendimenti log normalizzati della serie.',
        lookback: lstm.lookback,
        hiddenSize: lstm.hiddenSize,
        epochs: lstm.epochs,
        trainLoss: lstm.trainLoss,
        window: lstm.window,
        nextDay: lstm.nextPrice,
        forecasts: lstm.forecasts,
      };
    } else {
      methodsOut.lstm = {
        error: 'Servono almeno 28 punti storici per LSTM.',
      };
    }
  }

  if (wantEnsemble) {
    methodsOut.ensemble = buildEnsemble(data, methodsOut, { windowSize, horizonDays });
  }

  return {
    horizonDays,
    windowSize,
    lastPrice: data.length ? data[data.length - 1] : null,
    methods: methodsOut,
  };
}
