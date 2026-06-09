import { linearForecast, logReturnForecast, smaForecast } from './forecastModels.js';
import { arimaForecast } from './forecast/arimaModel.js';
import { lstmForecast } from './forecast/lstmModel.js';
import { prophetForecast } from './forecast/prophetModel.js';

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

  if (wantArima) {
    const arima = arimaForecast(data, horizonDays, windowSize);
    if (arima) {
      methodsOut.arima = {
        label: 'ARIMA',
        formula: arima.formula,
        description:
          'Modello ARIMA con selezione automatica dell’ordine (p,d,q) e stima CSS sui residui.',
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

  return {
    horizonDays,
    windowSize,
    lastPrice: data.length ? data[data.length - 1] : null,
    methods: methodsOut,
  };
}
