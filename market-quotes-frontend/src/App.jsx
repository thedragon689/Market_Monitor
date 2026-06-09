import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import './App.css';
import './responsive.css';
import './ui-polish.css';
import './mobile-etoro.css';
import AppShell from './components/AppShell';
import StepIntro from './components/StepIntro';
import AppToolbar from './components/AppToolbar';
import TradeAdvice from './components/TradeAdvice';
import DataSources from './components/DataSources';
import HelpLegend from './components/HelpLegend';
import PanelChoices from './components/PanelChoices';
import ViewFooter from './components/ViewFooter';
import Watchlist from './components/Watchlist';
import ThemeToggle from './components/ThemeToggle';
import IntelligentAlerts from './components/IntelligentAlerts';
import {
  ANALYSIS_PANEL_OPTIONS,
  CATALOG_SCOPE_OPTIONS,
  EXPLORE_PANEL_OPTIONS,
  FORECAST_PANEL_OPTIONS,
} from './data/viewChoices';
import ForecastCards from './components/ForecastCards';
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
import GeopoliticalSummary from './components/GeopoliticalSummary';
import MarketCorrelations from './components/MarketCorrelations';
import { useCryptoLiveQuote } from './hooks/useCryptoLiveQuote';
import { API_BASE } from './config/api';
import { apiFetch } from './utils/apiFetch';
import { savePersistedState } from './utils/persist';
import { syncUrlState } from './utils/urlState';
import { resolveInitialAppState } from './utils/initAppState';
import {
  getSymbolMeta,
  getSymbolsForType,
  symbolIdsForType,
} from './data/symbols';

const AdvancedDashboard = lazy(() => import('./components/AdvancedDashboard'));
const ForecastChart = lazy(() => import('./components/ForecastChart'));
const GeopoliticalImpactChart = lazy(
  () => import('./components/GeopoliticalImpactChart')
);

const INIT = resolveInitialAppState();

function PanelFallback() {
  return <p className="app__panel-loading">Caricamento sezione…</p>;
}

export default function App() {
  const [view, setView] = useState(INIT.view);
  const [type, setType] = useState(INIT.type);
  const [symbol, setSymbol] = useState(INIT.symbol);
  const [windowN, setWindowN] = useState(INIT.windowN);
  const [horizonDays, setHorizonDays] = useState(INIT.horizonDays);
  const [forecastMethod, setForecastMethod] = useState(INIT.forecastMethod);
  const [theme, setTheme] = useState(INIT.theme);

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
  const [explorePanels, setExplorePanels] = useState(INIT.explorePanels);
  const [catalogScope, setCatalogScope] = useState(INIT.catalogScope);
  const [analysisPanels, setAnalysisPanels] = useState(INIT.analysisPanels);
  const [forecastPanels, setForecastPanels] = useState(INIT.forecastPanels);
  const [marketMeta, setMarketMeta] = useState(null);
  const [categorySources, setCategorySources] = useState(null);
  const [tradeAdvice, setTradeAdvice] = useState(null);
  const [loadingTradeAdvice, setLoadingTradeAdvice] = useState(false);
  const [adviceHasForecast, setAdviceHasForecast] = useState(false);

  const fetchGen = useRef(0);
  const pendingForecast = useRef(false);

  const loadCategorySources = useCallback(async () => {
    try {
      const { data } = await apiFetch(`${API_BASE}/api/sources`, { optional: true });
      if (data?.categories) setCategorySources(data.categories);
    } catch {
      /* opzionale */
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      setLoadingCatalog(true);
      const { data } = await apiFetch(`${API_BASE}/api/catalog`, { optional: true });
      if (!data) return;
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

  const applyIntelligence = useCallback((data) => {
    if (!data) return;
    setIntelligence(data);
    if (data.geopolitical || data.news || data.alerts) {
      setGeopolitical((g) => ({
        ...(g || {}),
        news: data.news ?? g?.news,
        alerts: data.alerts ?? g?.alerts,
        geopoliticalIndex: data.geopolitical?.index ?? g?.geopoliticalIndex,
        impactScore: data.geopolitical?.impactScore ?? g?.impactScore,
        sentiment: data.geopolitical?.sentiment ?? g?.sentiment,
        impactSeries: data.geopolitical?.impactSeries ?? g?.impactSeries,
        sentimentTimeline:
          data.geopolitical?.sentimentTimeline ?? g?.sentimentTimeline,
        combinedForecast: data.hybrid?.combined ?? g?.combinedForecast,
        combined: data.hybrid ?? g?.combined,
      }));
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
        const { data } = await apiFetch(
          `${API_BASE}/api/intelligence?${params}`,
          { optional: true }
        );
        applyIntelligence(data);
      } catch {
        setIntelligence(null);
      } finally {
        setLoadingIntelligence(false);
      }
    },
    [horizonDays, windowN, forecastMethod, applyIntelligence]
  );

  const loadGeoNews = useCallback(async () => {
    try {
      const { data } = await apiFetch(
        `${API_BASE}/api/geopolitical/news?limit=30`,
        { optional: true }
      );
      if (data) setGeoNews(data);
    } catch {
      /* opzionale */
    }
  }, []);

  const loadAnalysisBundle = useCallback(
    async (sym, marketType, rate) => {
      try {
        setLoadingAnalysis(true);
        setLoadingIntelligence(true);
        setLoadingGeo(true);
        const params = new URLSearchParams({
          symbol: sym,
          type: marketType,
          days: String(horizonDays),
          window: String(windowN),
          method: forecastMethod === 'both' ? 'all' : forecastMethod,
        });
        const { data } = await apiFetch(
          `${API_BASE}/api/analysis-bundle?${params}`,
          { optional: true }
        );
        if (!data) return;
        if (data.analysis) {
          setAnalysis(data.analysis);
          if (data.analysis.fx?.eurUsd) setFx(data.analysis.fx);
          else if (rate?.eurUsd) setFx(rate);
        }
        applyIntelligence(data.intelligence);
      } catch {
        setAnalysis(null);
        setIntelligence(null);
      } finally {
        setLoadingAnalysis(false);
        setLoadingIntelligence(false);
        setLoadingGeo(false);
      }
    },
    [horizonDays, windowN, forecastMethod, applyIntelligence]
  );

  const loadCompetitorQuotes = useCallback(async (marketType, rate) => {
    const ids = symbolIdsForType(marketType);
    try {
      setLoadingCompetitors(true);
      const { data } = await apiFetch(
        `${API_BASE}/api/quotes?symbols=${encodeURIComponent(ids.join(','))}&type=${marketType}`,
        { optional: true }
      );
      if (!data) return;

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

  const loadMarketData = useCallback(async () => {
    const gen = ++fetchGen.current;
    try {
      setLoadingMarket(true);
      setError(null);
      setWarning(null);

      const { data } = await apiFetch(
        `${API_BASE}/api/market?symbol=${encodeURIComponent(symbol)}&type=${type}&limit=90`
      );
      if (gen !== fetchGen.current) return;

      const meta = getSymbolMeta(symbol, type);
      const raw = data.quote;
      if (data.fx?.eurUsd) setFx(data.fx);
      const nextFx = data.fx?.eurUsd ? data.fx : null;

      setMarketMeta({
        provider: data.provider,
        sources: data.sources,
        alternates: data.alternates,
        proxy: data.proxy,
      });

      if (!raw?.price) {
        setQuote({ error: 'Prezzo non disponibile al momento.' });
        setHistory([]);
      } else {
        setQuote({
          ...raw,
          unit: meta.unit,
          proxy: data.proxy || raw.proxy,
          provider: data.provider,
        });
        setHistory(data.history ?? []);
      }

      if (data.warning) setWarning(data.warning);
      else if (data.info) setWarning(data.info);

      loadAnalysisBundle(symbol, type, nextFx);
      window.setTimeout(() => loadCompetitorQuotes(type, nextFx), 50);
    } catch (e) {
      if (gen !== fetchGen.current) return;
      setError(e.message);
      setQuote(null);
      setHistory([]);
    } finally {
      if (gen === fetchGen.current) setLoadingMarket(false);
    }
  }, [symbol, type, loadCompetitorQuotes, loadAnalysisBundle]);

  const loadTradeAdvice = useCallback(
    async (withForecast = false) => {
      try {
        setLoadingTradeAdvice(true);
        setError(null);
        const params = new URLSearchParams({
          symbol,
          type,
          days: String(horizonDays),
          window: String(windowN),
          method: forecastMethod === 'both' ? 'all' : forecastMethod,
        });
        if (withForecast) params.set('includeForecast', 'true');

        const { data } = await apiFetch(`${API_BASE}/api/trade-advice?${params}`);
        setTradeAdvice(data.advice ?? null);
        setAdviceHasForecast(Boolean(data.hasForecast));
        if (data.fx?.eurUsd) setFx(data.fx);
      } catch (e) {
        setTradeAdvice(null);
        setError(e.message);
      } finally {
        setLoadingTradeAdvice(false);
      }
    },
    [symbol, type, horizonDays, windowN, forecastMethod]
  );

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
      const { data } = await apiFetch(`${API_BASE}/api/forecast?${params}`);
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

  const handleViewChange = useCallback(
    (nextView) => {
      setView(nextView);
      if (nextView === 'advice' && quote?.price && !quote?.error) {
        loadTradeAdvice(Boolean(forecast));
      }
      if (
        nextView === 'forecast' &&
        !forecast &&
        !loadingForecast &&
        quote?.price &&
        !quote?.error
      ) {
        loadForecast();
      }
    },
    [
      forecast,
      loadingForecast,
      quote,
      loadForecast,
      loadTradeAdvice,
    ]
  );

  const goAdvice = useCallback(() => {
    setView('advice');
    if (quote?.price && !quote?.error) {
      loadTradeAdvice(Boolean(forecast));
    }
  }, [quote, forecast, loadTradeAdvice]);

  const goForecast = useCallback(() => {
    setView('forecast');
    loadForecast();
  }, [loadForecast]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    savePersistedState({
      view,
      type,
      symbol,
      windowN,
      horizonDays,
      forecastMethod,
      theme,
      explorePanels,
      catalogScope,
      analysisPanels,
      forecastPanels,
    });
    syncUrlState({
      view,
      type,
      symbol,
      windowN,
      horizonDays,
      forecastMethod,
    });
  }, [
    view,
    type,
    symbol,
    windowN,
    horizonDays,
    forecastMethod,
    theme,
    explorePanels,
    catalogScope,
    analysisPanels,
    forecastPanels,
  ]);

  useEffect(() => {
    loadCategorySources();
    loadCatalog();
    loadMarketData();
    loadGeoNews();
  }, [loadCategorySources, loadCatalog, loadMarketData, loadGeoNews]);

  useEffect(() => {
    if (view !== 'advice') return;
    if (!quote?.price || quote?.error) return;
    loadTradeAdvice(Boolean(forecast));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ricarica consiglio su asset/parametri
  }, [view, symbol, type, horizonDays, windowN, forecastMethod, forecast]);

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
  const liveCryptoId =
    type === 'crypto' && ['BTC-USD', 'ETH-USD'].includes(symbol.toUpperCase())
      ? symbol.toUpperCase()
      : null;
  const cryptoLive = useCryptoLiveQuote(liveCryptoId, Boolean(liveCryptoId));

  const displayQuote = useMemo(() => {
    if (!quote) return quote;
    const livePrice = cryptoLive.binance?.price ?? cryptoLive.kraken?.price;
    const merged = livePrice
      ? {
          ...quote,
          price: livePrice,
          priceUsd: livePrice,
          changePercent:
            cryptoLive.binance?.changePercent ?? quote.changePercent,
          source: cryptoLive.binance ? 'binance-ws' : quote.source,
        }
      : quote;

    if (!cryptoLive.binance && !cryptoLive.kraken) return merged;

    return {
      ...merged,
      liveExchanges: {
        binance: cryptoLive.binance,
        kraken: cryptoLive.kraken,
        status: cryptoLive.status,
      },
    };
  }, [quote, cryptoLive]);

  const isLoading = loadingMarket || loadingForecast || loadingIntelligence;

  const shareState = useMemo(
    () => ({
      view,
      type,
      symbol,
      windowN,
      horizonDays,
      forecastMethod,
    }),
    [view, type, symbol, windowN, horizonDays, forecastMethod]
  );

  const quoteReady = Boolean(quote?.price && !quote?.error);

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
        themeToggle={<ThemeToggle theme={theme} onChange={setTheme} />}
      >
        <StepIntro view={view} />
        <AppToolbar
          shareState={shareState}
          loadingMarket={loadingMarket}
          quoteReady={quoteReady}
        />
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

        {view === 'advice' && (
          <div className="view-panel view-panel--advice">
            <TradeAdvice
              advice={tradeAdvice}
              quote={quote}
              loading={loadingTradeAdvice || loadingMarket}
              hasForecast={adviceHasForecast}
              onEnableForecast={() => loadTradeAdvice(true)}
              loadingForecast={loadingTradeAdvice}
            />
          </div>
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
            <Watchlist
              symbol={symbol}
              type={type}
              onSelect={handleSelectAsset}
              quotesBySymbol={quotesBySymbol}
              fx={fx}
            />

            <div className="app__grid app__grid--explore">
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
                    showCategoryTabs
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
            </div>

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
            <DataSources
              type={type}
              provider={marketMeta?.provider}
              sources={marketMeta?.sources}
              alternates={marketMeta?.alternates}
              categoryConfig={categorySources?.[type]}
            />

            <div className="app__grid app__grid--top">
              <section className="app-card">
                <h3 className="view-panel__subtitle">Quotazione live</h3>
                <QuotePanel
                  quote={displayQuote}
                  type={type}
                  symbol={symbol}
                  loading={loadingMarket}
                  fx={fx}
                  onGoExplore={() => handleViewChange('explore')}
                />
              </section>
              <section className="app-card app-card--chart">
                <HistoryChart
                  history={history}
                  title={`Andamento · ${meta.name}`}
                  loading={loadingMarket}
                  fx={fx}
                  meta={meta}
                />
              </section>
            </div>

            <div className="view-panel__actions view-panel__actions--dual">
              <button
                type="button"
                className="btn btn--primary"
                onClick={goAdvice}
                disabled={loadingTradeAdvice || loadingMarket || !quote?.price || quote?.error}
              >
                {loadingTradeAdvice ? 'Consiglio…' : 'Consigli acquisto / vendita →'}
              </button>
              <button
                type="button"
                className="btn btn--cta"
                onClick={goForecast}
                disabled={loadingForecast || loadingMarket || !quote?.price || quote?.error}
              >
                {loadingForecast ? 'Calcolo…' : 'Calcola previsione →'}
              </button>
            </div>

            <IntelligentAlerts alerts={intelligence?.alerts} />

            {(analysisPanels.includes('indicators') ||
              analysisPanels.includes('correlations')) && (
              <div className="app__grid app__grid--duo">
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
              </div>
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
                <Suspense fallback={<PanelFallback />}>
                  <AdvancedDashboard
                    intelligence={intelligence}
                    loading={loadingIntelligence || loadingForecast}
                  />
                </Suspense>
                <GeopoliticalSummary
                  geo={geopolitical}
                  fx={fx}
                  meta={meta}
                  loading={geoLoading}
                />
                <Suspense fallback={<PanelFallback />}>
                  <GeopoliticalImpactChart
                    geo={geopolitical}
                    history={history}
                    fx={fx}
                    meta={meta}
                    loading={geoLoading || loadingMarket}
                  />
                </Suspense>
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

            <section className="app-card app-card--forecast-split">
              <div className="app__grid app__grid--forecast">
                <Suspense fallback={<PanelFallback />}>
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
                </Suspense>
                <ForecastCards
                  forecast={forecast}
                  loading={loadingForecast}
                  fx={fx}
                  type={type}
                  symbol={symbol}
                />
              </div>
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
                <Suspense fallback={<PanelFallback />}>
                  <GeopoliticalImpactChart
                    geo={geopolitical}
                    history={history}
                    fx={fx}
                    meta={meta}
                    loading={loadingForecast || loadingMarket}
                  />
                </Suspense>
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
