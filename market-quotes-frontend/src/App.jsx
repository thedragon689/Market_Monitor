import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import './responsive.css';
import AppShell from './components/AppShell';
import StepIntro from './components/StepIntro';
import HelpLegend from './components/HelpLegend';
import PanelChoices from './components/PanelChoices';
import ViewFooter from './components/ViewFooter';
import {
  ANALYSIS_PANEL_OPTIONS,
  CATALOG_SCOPE_OPTIONS,
  EXPLORE_PANEL_OPTIONS,
  FORECAST_PANEL_OPTIONS,
  defaultPanelSet,
} from './data/viewChoices';
import ForecastCards from './components/ForecastCards';
import ForecastChart from './components/ForecastChart';
import ForecastControls from './components/ForecastControls';
import HistoryChart from './components/HistoryChart';
import QuotePanel from './components/QuotePanel';
import CompetitorBoard from './components/CompetitorBoard';
import MarketCatalog from './components/MarketCatalog';
import SymbolPicker from './components/SymbolPicker';
import { catalogToQuoteMap } from './utils/catalogPrice';
import { getCategoryMeta } from './data/categories';
import TechnicalIndicators from './components/TechnicalIndicators';
import GeopoliticalNews from './components/GeopoliticalNews';
import GeopoliticalImpactChart from './components/GeopoliticalImpactChart';
import GeopoliticalSummary from './components/GeopoliticalSummary';
import AdvancedDashboard from './components/AdvancedDashboard';
import MarketCorrelations from './components/MarketCorrelations';
import { useBtcLiveQuote } from './hooks/useBtcLiveQuote';
import { API_BASE } from './config/api';
import {
  getSymbolMeta,
  getSymbolsForType,
  symbolIdsForType,
} from './data/symbols';

export default function App() {
  const [view, setView] = useState('explore');
  const [type, setType] = useState('stock');
  const [symbol, setSymbol] = useState('AAPL');
  const [windowN, setWindowN] = useState(5);
  const [horizonDays, setHorizonDays] = useState(5);
  const [forecastMethod, setForecastMethod] = useState('both');

  const [quote, setQuote] = useState(null);
  const [history, setHistory] = useState([]);
  const [forecast, setForecast] = useState(null);

  const [loadingMarket, setLoadingMarket] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [fx, setFx] = useState(null);
  const [competitorQuotes, setCompetitorQuotes] = useState({});
  const [loadingCompetitors, setLoadingCompetitors] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [geopolitical, setGeopolitical] = useState(null);
  const [geoNews, setGeoNews] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [intelligence, setIntelligence] = useState(null);
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);
  const [catalog, setCatalog] = useState(null);
  const [catalogSummary, setCatalogSummary] = useState(null);
  const [catalogUpdatedAt, setCatalogUpdatedAt] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [explorePanels, setExplorePanels] = useState(
    defaultPanelSet(EXPLORE_PANEL_OPTIONS, ['quick', 'catalog', 'compare'])
  );
  const [catalogScope, setCatalogScope] = useState(['category']);
  const [analysisPanels, setAnalysisPanels] = useState(
    defaultPanelSet(ANALYSIS_PANEL_OPTIONS, ['indicators', 'correlations', 'geo'])
  );
  const [forecastPanels, setForecastPanels] = useState(
    defaultPanelSet(FORECAST_PANEL_OPTIONS, ['params', 'geo'])
  );

  const fetchGen = useRef(0);
  const pendingForecast = useRef(false);

  const loadCatalog = useCallback(async () => {
    try {
      setLoadingCatalog(true);
      const res = await fetch(`${API_BASE}/api/catalog`);
      const data = await res.json();
      if (!res.ok) return;
      setCatalog(data.catalog ?? null);
      setCatalogSummary(data.summary ?? null);
      setCatalogUpdatedAt(data.updatedAt ?? null);
      if (data.fx?.eurUsd) setFx(data.fx);
      const map = catalogToQuoteMap(data.catalog);
      if (Object.keys(map).length) {
        setCompetitorQuotes((prev) => ({ ...map, ...prev }));
      }
    } catch {
      /* catalog opzionale */
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  const handleSelectAsset = useCallback(
    (id, assetType) => {
      if (assetType && assetType !== type) setType(assetType);
      setSymbol(id);
      setView('analysis');
    },
    [type]
  );

  const handleSymbolChange = useCallback((id) => {
    setSymbol(id);
    setView('analysis');
  }, []);

  const catalogQuotes = useMemo(() => catalogToQuoteMap(catalog), [catalog]);
  const quotesBySymbol = useMemo(
    () => ({ ...catalogQuotes, ...competitorQuotes }),
    [catalogQuotes, competitorQuotes]
  );

  const handleTypeChange = useCallback(
    (nextType) => {
      setType(nextType);
      setCatalogScope(['category']);
      const list = getSymbolsForType(nextType);
      const stillValid = list.some((s) => s.id === symbol);
      if (!stillValid) setSymbol(list[0].id);
      setForecast(null);
      setAnalysis(null);
      setGeopolitical(null);
      setIntelligence(null);
      pendingForecast.current = false;
      if (view === 'explore') {
        setCompetitorQuotes({});
      }
    },
    [symbol, view]
  );

  const loadIntelligence = useCallback(
    async (sym, marketType) => {
      try {
        setLoadingIntelligence(true);
        const params = new URLSearchParams({
          symbol: sym,
          type: marketType,
          days: String(horizonDays),
          window: String(windowN),
          method: forecastMethod === 'both' ? 'all' : forecastMethod,
          correlations: 'true',
        });
        const res = await fetch(`${API_BASE}/api/intelligence?${params}`);
        const data = await res.json();
        if (!res.ok) return;
        setIntelligence(data);
        if (data.geopolitical || data.news) {
          setGeopolitical((g) => ({
            ...(g || {}),
            news: data.news ?? g?.news,
            geopoliticalIndex: data.geopolitical?.index ?? g?.geopoliticalIndex,
            impactScore: data.geopolitical?.impactScore ?? g?.impactScore,
            sentiment: data.geopolitical?.sentiment ?? g?.sentiment,
            impactSeries: data.geopolitical?.impactSeries ?? g?.impactSeries,
            sentimentTimeline: data.geopolitical?.sentimentTimeline ?? g?.sentimentTimeline,
            combinedForecast: data.hybrid?.combined ?? g?.combinedForecast,
            combined: data.hybrid ?? g?.combined,
          }));
        }
      } catch {
        setIntelligence(null);
      } finally {
        setLoadingIntelligence(false);
      }
    },
    [horizonDays, windowN, forecastMethod]
  );

  const loadGeoNews = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/geopolitical/news?limit=30`);
      const data = await res.json();
      if (res.ok) setGeoNews(data);
    } catch {
      /* opzionale */
    }
  }, []);

  const loadGeopoliticalAnalysis = useCallback(
    async (sym, marketType) => {
      try {
        setLoadingGeo(true);
        const params = new URLSearchParams({
          symbol: sym,
          type: marketType,
          days: String(horizonDays),
          window: String(windowN),
          method: forecastMethod === 'both' ? 'all' : forecastMethod,
        });
        const res = await fetch(`${API_BASE}/api/geopolitical/forecast?${params}`);
        const data = await res.json();
        if (!res.ok) return;
        setGeopolitical((prev) => ({
          ...(prev || {}),
          ...data,
          news: data.news ?? prev?.news,
        }));
      } catch {
        /* analisi geo opzionale */
      } finally {
        setLoadingGeo(false);
      }
    },
    [horizonDays, windowN, forecastMethod]
  );

  const loadCompetitorQuotes = useCallback(async (marketType, rate) => {
    const ids = symbolIdsForType(marketType);
    try {
      setLoadingCompetitors(true);
      const res = await fetch(
        `${API_BASE}/api/quotes?symbols=${encodeURIComponent(ids.join(','))}&type=${marketType}`
      );
      const data = await res.json();
      if (!res.ok) return;

      const map = {};
      for (const q of data.results || []) {
        if (!q?.symbol) continue;
        map[q.symbol.toUpperCase()] = q;
      }
      if (data.fx?.eurUsd) setFx(data.fx);
      else if (rate?.eurUsd) setFx(rate);
      setCompetitorQuotes(map);
    } catch {
      /* confronto opzionale */
    } finally {
      setLoadingCompetitors(false);
    }
  }, []);

  const loadAnalysis = useCallback(
    async (sym, marketType, rate) => {
      try {
        setLoadingAnalysis(true);
        const res = await fetch(
          `${API_BASE}/api/analyze?symbol=${encodeURIComponent(sym)}&type=${marketType}&days=${horizonDays}`
        );
        const data = await res.json();
        if (!res.ok) return;
        setAnalysis(data);
        if (data.fx?.eurUsd) setFx(data.fx);
        else if (rate?.eurUsd) setFx(rate);
      } catch {
        setAnalysis(null);
      } finally {
        setLoadingAnalysis(false);
      }
    },
    [horizonDays]
  );

  const loadMarketData = useCallback(async () => {
    const gen = ++fetchGen.current;
    try {
      setLoadingMarket(true);
      setError(null);
      setWarning(null);

      const res = await fetch(
        `${API_BASE}/api/market?symbol=${encodeURIComponent(symbol)}&type=${type}&limit=90`
      );
      const data = await res.json();
      if (gen !== fetchGen.current) return;

      if (!res.ok) throw new Error(data.error || 'Errore nel caricamento dati');

      const meta = getSymbolMeta(symbol, type);
      const raw = data.quote;
      if (data.fx?.eurUsd) setFx(data.fx);
      const nextFx = data.fx?.eurUsd ? data.fx : null;

      if (!raw?.price) {
        setQuote({ error: 'Prezzo non disponibile al momento.' });
        setHistory([]);
      } else {
        setQuote({
          ...raw,
          unit: meta.unit,
          proxy: data.proxy || raw.proxy,
        });
        setHistory(data.history ?? []);
      }

      if (data.warning) setWarning(data.warning);
      else if (data.info) setWarning(data.info);

      loadCompetitorQuotes(type, nextFx);
      loadAnalysis(symbol, type, nextFx);
      loadIntelligence(symbol, type);
      loadGeopoliticalAnalysis(symbol, type);
    } catch (e) {
      if (gen !== fetchGen.current) return;
      setError(e.message);
      setQuote(null);
      setHistory([]);
    } finally {
      if (gen === fetchGen.current) setLoadingMarket(false);
    }
  }, [symbol, type, loadCompetitorQuotes, loadAnalysis, loadIntelligence, loadGeopoliticalAnalysis]);

  const loadForecast = useCallback(async () => {
    try {
      setLoadingForecast(true);
      setLoadingGeo(true);
      setError(null);
      const params = new URLSearchParams({
        symbol,
        type,
        days: String(horizonDays),
        window: String(windowN),
        method: forecastMethod,
        geo: 'true',
      });
      const res = await fetch(`${API_BASE}/api/forecast?${params}`);
      const data = await res.json();
      if (!res.ok) {
        const hint = data.hint ? ` ${data.hint}` : '';
        throw new Error((data.error || 'Errore nel calcolo previsione') + hint);
      }
      setView('forecast');
      setForecast(data);
      setGeopolitical((prev) => ({
        ...(prev || {}),
        ...data.geopolitical,
        news: data.geopolitical?.news ?? prev?.news,
      }));
      loadIntelligence(symbol, type);
      if (data.fx?.eurUsd) setFx(data.fx);
      if (data.warning) setWarning(data.warning);
      if (data.history?.length) setHistory(data.history);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingForecast(false);
      setLoadingGeo(false);
    }
  }, [symbol, type, horizonDays, windowN, forecastMethod, loadIntelligence]);

  const requestForecast = useCallback(
    (id, assetType) => {
      const typeChanges = assetType && assetType !== type;
      const symbolChanges = id !== symbol;
      const readyNow =
        !typeChanges &&
        !symbolChanges &&
        quote?.price &&
        !quote?.error &&
        !loadingMarket;

      if (typeChanges) setType(assetType);
      setSymbol(id);
      setView('forecast');

      if (readyNow) {
        pendingForecast.current = false;
        loadForecast();
      } else {
        pendingForecast.current = true;
      }
    },
    [type, symbol, quote, loadingMarket, loadForecast]
  );

  const handleAssetForecast = useCallback(
    (id, assetType) => requestForecast(id, assetType),
    [requestForecast]
  );

  const handleCompetitorForecast = useCallback(
    (id) => requestForecast(id, type),
    [requestForecast, type]
  );

  const handleViewChange = useCallback((nextView) => {
    setView(nextView);
    if (
      nextView === 'forecast' &&
      !forecast &&
      !loadingForecast &&
      quote?.price &&
      !quote?.error
    ) {
      loadForecast();
    }
  }, [forecast, loadingForecast, quote, loadForecast]);

  const goForecast = useCallback(() => {
    setView('forecast');
    loadForecast();
  }, [loadForecast]);

  useEffect(() => {
    loadCatalog();
    loadMarketData();
    loadGeoNews();
  }, [loadCatalog, loadMarketData, loadGeoNews]);

  useEffect(() => {
    if (!pendingForecast.current) return;
    if (loadingMarket) return;
    if (quote?.price && !quote?.error) {
      pendingForecast.current = false;
      loadForecast();
      return;
    }
    if (!loadingMarket && quote?.error) {
      pendingForecast.current = false;
      setError(
        (prev) =>
          prev ||
          'Impossibile calcolare la previsione: quotazione non disponibile per questo asset.'
      );
    }
  }, [quote, loadingMarket, loadForecast]);

  const refreshAll = () => {
    loadCatalog();
    loadMarketData();
  };

  const meta = getSymbolMeta(symbol, type);
  const categoryMeta = getCategoryMeta(type);
  const isBtc = type === 'crypto' && symbol.toUpperCase() === 'BTC-USD';
  const btcLive = useBtcLiveQuote(isBtc);

  const displayQuote = useMemo(() => {
    if (!quote) return quote;
    const livePrice = btcLive.binance?.price ?? btcLive.kraken?.price;
    const merged = livePrice
      ? {
          ...quote,
          price: livePrice,
          priceUsd: livePrice,
          changePercent: btcLive.binance?.changePercent ?? quote.changePercent,
          source: btcLive.binance ? 'binance-ws' : quote.source,
        }
      : quote;

    if (!btcLive.binance && !btcLive.kraken) return merged;

    return {
      ...merged,
      liveExchanges: {
        binance: btcLive.binance,
        kraken: btcLive.kraken,
        status: btcLive.status,
      },
    };
  }, [quote, btcLive]);

  const isLoading = loadingMarket || loadingForecast || loadingIntelligence;

  const geoForNews = useMemo(() => {
    const base = geopolitical ?? geoNews;
    if (!base) return null;
    const articles = base.news ?? base.articles ?? base.newsMeta?.articles ?? [];
    return articles.length ? { ...base, news: articles } : base;
  }, [geopolitical, geoNews]);

  const geoLoading = loadingGeo || loadingIntelligence;

  const alerts = (warning || error) && (
    <div className="app-alerts" role="status">
      {warning && !error && <div className="app__warning">{warning}</div>}
      {error && (
        <div className="app__error" role="alert">
          <strong>Attenzione:</strong> {error}
        </div>
      )}
    </div>
  );

  const showAllCatalog = catalogScope[0] === 'all';
  const showExploreLegend = explorePanels.includes('legend');
  const showAnalysisLegend = analysisPanels.includes('legend');
  const showForecastLegend = forecastPanels.includes('legend');

  return (
    <div className="app">
      <AppShell
        view={view}
        onViewChange={handleViewChange}
        type={type}
        onTypeChange={handleTypeChange}
        symbol={symbol}
        assetName={meta.name}
        categorySummary={catalogSummary}
        onGoForecast={goForecast}
        onRefresh={refreshAll}
        loadingForecast={loadingForecast}
        loadingMarket={loadingMarket}
        isLoading={isLoading}
      >
        <StepIntro view={view} />
        {alerts}

        {view === 'explore' && (
          <>
            <PanelChoices
              label="Cosa mostrare in questo passo"
              hint="Attiva o disattiva le sezioni sotto"
              options={EXPLORE_PANEL_OPTIONS}
              selected={explorePanels}
              onChange={setExplorePanels}
            />
            {explorePanels.includes('catalog') && (
              <PanelChoices
                label="Ambito catalogo"
                options={CATALOG_SCOPE_OPTIONS}
                selected={catalogScope}
                onChange={setCatalogScope}
                multiple={false}
                className="panel-choices--sub"
              />
            )}
            {showExploreLegend && (
              <HelpLegend view={view} compact forceOpen />
            )}
          </>
        )}

        {view === 'analysis' && (
          <>
            <PanelChoices
              label="Sezioni di analisi"
              hint="Scegli quali blocchi visualizzare"
              options={ANALYSIS_PANEL_OPTIONS}
              selected={analysisPanels}
              onChange={setAnalysisPanels}
            />
            {showAnalysisLegend && (
              <HelpLegend view={view} compact forceOpen />
            )}
          </>
        )}

        {view === 'forecast' && (
          <>
            <PanelChoices
              label="Contenuti previsione"
              options={FORECAST_PANEL_OPTIONS}
              selected={forecastPanels}
              onChange={setForecastPanels}
            />
            {showForecastLegend && (
              <HelpLegend view={view} compact forceOpen />
            )}
          </>
        )}

        {view === 'explore' && (
          <div className="view-panel view-panel--explore">
            {explorePanels.includes('quick') && (
              <section className="app-card app-card--picker">
                <h3 className="view-panel__subtitle">Selezione rapida</h3>
                <SymbolPicker
                  type={type}
                  symbol={symbol}
                  onTypeChange={handleTypeChange}
                  onSymbolChange={handleSymbolChange}
                  quotesBySymbol={quotesBySymbol}
                  fx={fx}
                />
              </section>
            )}

            {explorePanels.includes('catalog') && (
              <section className="app-card app-card--catalog">
                <h3 className="view-panel__subtitle">Catalogo · {categoryMeta.label}</h3>
                <MarketCatalog
                  catalog={catalog}
                  summary={catalogSummary}
                  updatedAt={catalogUpdatedAt}
                  loading={loadingCatalog}
                  selectedType={type}
                  selectedSymbol={symbol}
                  onSelectAsset={handleSelectAsset}
                  onForecast={handleAssetForecast}
                  fx={fx}
                  forecastLoading={loadingForecast || loadingMarket}
                  showAllCategories={showAllCatalog}
                />
              </section>
            )}

            {explorePanels.includes('compare') && (
              <section className="app-card app-card--flush">
                <CompetitorBoard
                  type={type}
                  selectedSymbol={symbol}
                  quotesBySymbol={quotesBySymbol}
                  loading={loadingCompetitors || loadingMarket || loadingCatalog}
                  fx={fx}
                  onSelect={handleSymbolChange}
                  onForecast={handleCompetitorForecast}
                  forecastLoading={loadingForecast || loadingMarket}
                />
              </section>
            )}
          </div>
        )}

        {view === 'analysis' && (
          <div className="view-panel view-panel--analysis">
            <div className="app__grid app__grid--top">
              <section className="app-card">
                <h3 className="view-panel__subtitle">Quotazione live</h3>
                <QuotePanel
                  quote={displayQuote}
                  type={type}
                  symbol={symbol}
                  loading={loadingMarket}
                  fx={fx}
                />
              </section>
              <section className="app-card app-card--chart">
                <HistoryChart
                  history={history}
                  title={`Andamento · ${meta.name}`}
                  loading={loadingMarket}
                  fx={fx}
                />
              </section>
            </div>

            <div className="view-panel__actions">
              <button
                type="button"
                className="btn btn--cta"
                onClick={goForecast}
                disabled={loadingForecast || loadingMarket || !quote?.price || quote?.error}
              >
                {loadingForecast ? 'Calcolo…' : 'Calcola previsione →'}
              </button>
            </div>

            {analysisPanels.includes('indicators') && (
              <section className="app-card">
                <h3 className="view-panel__subtitle">Indicatori tecnici</h3>
                <TechnicalIndicators
                  analysis={analysis}
                  loading={loadingAnalysis || loadingMarket}
                  fx={fx}
                  type={type}
                  symbol={symbol}
                />
              </section>
            )}

            {analysisPanels.includes('correlations') && (
              <section className="app-card app-card--correlations">
                <h3 className="view-panel__subtitle">Correlazioni · {meta.name}</h3>
                <MarketCorrelations
                  intelligence={intelligence}
                  loading={loadingIntelligence || loadingMarket}
                />
              </section>
            )}

            {analysisPanels.includes('compare') && (
              <section className="app-card app-card--flush">
                <CompetitorBoard
                  type={type}
                  selectedSymbol={symbol}
                  quotesBySymbol={quotesBySymbol}
                  loading={loadingCompetitors || loadingMarket || loadingCatalog}
                  fx={fx}
                  onSelect={handleSymbolChange}
                  onForecast={handleCompetitorForecast}
                  forecastLoading={loadingForecast || loadingMarket}
                />
              </section>
            )}

            {analysisPanels.includes('geo') && (
              <section className="app-card app-card--geo">
                <h3 className="view-panel__subtitle">Contesto globale</h3>
                <AdvancedDashboard
                  intelligence={intelligence}
                  loading={loadingIntelligence || loadingForecast}
                />
                <GeopoliticalSummary
                  geo={geopolitical}
                  fx={fx}
                  meta={meta}
                  loading={geoLoading}
                />
                <GeopoliticalImpactChart
                  geo={geopolitical}
                  history={history}
                  fx={fx}
                  meta={meta}
                  loading={geoLoading || loadingMarket}
                />
                <h3 className="app__subsection-title">Notizie dal mondo</h3>
                <GeopoliticalNews geo={geoForNews} loading={geoLoading && !geoForNews?.news?.length} />
              </section>
            )}
          </div>
        )}

        {view === 'forecast' && (
          <div className="view-panel view-panel--forecast">
            {forecastPanels.includes('params') && (
              <ForecastControls
                variant="panel"
                windowN={windowN}
                setWindowN={setWindowN}
                horizonDays={horizonDays}
                setHorizonDays={setHorizonDays}
                forecastMethod={forecastMethod}
                setForecastMethod={setForecastMethod}
                onRefresh={refreshAll}
                onForecast={goForecast}
                loadingMarket={loadingMarket}
                loadingCatalog={loadingCatalog}
                loadingForecast={loadingForecast}
                busy={isLoading}
                symbol={symbol}
                assetName={meta.name}
              />
            )}

            <section className="app-card">
              <ForecastChart
                history={history}
                forecast={forecast}
                loading={loadingForecast}
                fx={fx}
                type={type}
                symbol={symbol}
                onForecast={goForecast}
                forecastLoading={loadingForecast || loadingMarket}
              />
              <ForecastCards
                forecast={forecast}
                loading={loadingForecast}
                fx={fx}
                type={type}
                symbol={symbol}
              />
            </section>

            {forecastPanels.includes('geo') && (
              <section className="app-card app-card--geo">
                <h3 className="view-panel__subtitle">Impatto geopolitico sulla previsione</h3>
                <GeopoliticalSummary
                  geo={geopolitical}
                  fx={fx}
                  meta={meta}
                  loading={loadingForecast}
                />
                <GeopoliticalImpactChart
                  geo={geopolitical}
                  history={history}
                  fx={fx}
                  meta={meta}
                  loading={loadingForecast || loadingMarket}
                />
              </section>
            )}
          </div>
        )}

        <ViewFooter
          view={view}
          onViewChange={handleViewChange}
          onForecast={goForecast}
          loadingForecast={loadingForecast}
          loadingMarket={loadingMarket}
          assetName={meta.name}
          hasForecast={Boolean(forecast)}
        />
      </AppShell>
    </div>
  );
}
