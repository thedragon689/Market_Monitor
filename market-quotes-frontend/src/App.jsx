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
import './fintech-polish.css';
import './mobile-etoro.css';
import './dark-theme.css';
import './icons.css';
import './design-system.css';
import './pro-dashboard.css';
import './desktop-polish.css';
import './ui-stable.css';
import AppShell from './components/AppShell';
import StepIntro from './components/StepIntro';
import AppToolbar from './components/AppToolbar';
import PanelChoices from './components/PanelChoices';
import ViewFooter from './components/ViewFooter';
import ThemeToggle from './components/ThemeToggle';
import ViewFallback from './components/ViewFallback';
import MobileStickyActions from './components/MobileStickyActions';
import QuotePanel from './components/QuotePanel';
import AssetStatsRow from './components/AssetStatsRow';
import InfoPage from './components/InfoPage';
import TrustFooter from './components/TrustFooter';
import { normalizeTimeframe, sliceHistoryByTimeframe } from './data/chartTimeframes';
import { catalogToQuoteMap } from './utils/catalogPrice';
import { getCategoryMeta } from './data/categories';
import {
  ANALYSIS_PANEL_OPTIONS,
  FORECAST_PANEL_OPTIONS,
} from './data/viewChoices';
import { useCryptoLiveQuote } from './hooks/useCryptoLiveQuote';
import { API_BASE } from './config/api';
import { apiFetch } from './utils/apiFetch';
import { fetchMarket, prefetchMarket, prefetchMarkets } from './utils/fetchMarket';
import {
  getCatalogCache,
  peekCatalogCache,
  setCatalogCache,
} from './utils/catalogCache';
import {
  getMarketCache,
  peekMarketCache,
  quoteFromCatalog,
} from './utils/marketCache';
import { savePersistedState } from './utils/persist';
import { syncUrlState } from './utils/urlState';
import { resolveInitialAppState } from './utils/initAppState';
import { useMobileLayout } from './hooks/useMobileLayout';
import {
  getSymbolMeta,
  getSymbolsForType,
  symbolIdsForType,
} from './data/symbols';

const TerminalDashboard = lazy(() => import('./components/terminal/TerminalDashboard'));
const MobileExploreHub = lazy(() => import('./components/MobileExploreHub'));
const HistoryChart = lazy(() => import('./components/HistoryChart'));
const TradeAdvice = lazy(() => import('./components/TradeAdvice'));
const DataSources = lazy(() => import('./components/DataSources'));
const HelpLegend = lazy(() => import('./components/HelpLegend'));
const IntelligentAlerts = lazy(() => import('./components/IntelligentAlerts'));
const ForecastCards = lazy(() => import('./components/ForecastCards'));
const ForecastControls = lazy(() => import('./components/ForecastControls'));
const CompetitorBoard = lazy(() => import('./components/CompetitorBoard'));
const TechnicalIndicators = lazy(() => import('./components/TechnicalIndicators'));
const CommodityDashboard = lazy(() => import('./components/CommodityDashboard'));
const GeopoliticalNews = lazy(() => import('./components/GeopoliticalNews'));
const GeopoliticalSummary = lazy(() => import('./components/GeopoliticalSummary'));
const MarketCorrelations = lazy(() => import('./components/MarketCorrelations'));
const AdvancedDashboard = lazy(() => import('./components/AdvancedDashboard'));
const MlForecastPanel = lazy(() => import('./components/MlForecastPanel'));
const ForecastPreview = lazy(() => import('./components/ForecastPreview'));
const IndicatorToggles = lazy(() => import('./components/IndicatorToggles'));
const ForecastChart = lazy(() => import('./components/ForecastChart'));
const GeopoliticalImpactChart = lazy(
  () => import('./components/GeopoliticalImpactChart')
);

const INIT = resolveInitialAppState();
const INIT_MARKET = peekMarketCache(INIT.symbol, INIT.type);
const INIT_CATALOG = peekCatalogCache();

function PanelFallback({ tall }) {
  return <ViewFallback tall={tall} />;
}

export default function App() {
  const [view, setView] = useState(INIT.view);
  const [type, setType] = useState(INIT.type);
  const [symbol, setSymbol] = useState(INIT.symbol);
  const [windowN, setWindowN] = useState(INIT.windowN);
  const [horizonDays, setHorizonDays] = useState(INIT.horizonDays);
  const [forecastMethod, setForecastMethod] = useState(INIT.forecastMethod);
  const [historyTimeframe, setHistoryTimeframe] = useState(
    normalizeTimeframe(INIT.historyTimeframe)
  );
  const [showChartIndicators, setShowChartIndicators] = useState(true);
  const [chartOverlays, setChartOverlays] = useState({
    ema20: true,
    ema50: false,
    ema200: false,
    sma20: false,
    bollinger: false,
    forecastArima: false,
    forecastLstm: false,
    forecastHybrid: false,
  });
  const [indicatorToggles, setIndicatorToggles] = useState({
    ema: true,
    rsi: true,
    macd: true,
    bollinger: true,
  });
  const [dataFreshKey, setDataFreshKey] = useState(0);
  const [theme, setTheme] = useState(INIT.theme);

  const [quote, setQuote] = useState(INIT_MARKET?.quote ?? null);
  const [history, setHistory] = useState(INIT_MARKET?.history ?? []);
  const [forecast, setForecast] = useState(null);

  const [loadingMarket, setLoadingMarket] = useState(false);
  const [refreshingMarket, setRefreshingMarket] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [fx, setFx] = useState(null);
  const [competitorQuotes, setCompetitorQuotes] = useState({});
  const [loadingCompetitors, setLoadingCompetitors] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [commodityProfile, setCommodityProfile] = useState(null);
  const [loadingCommodity, setLoadingCommodity] = useState(false);
  const [geopolitical, setGeopolitical] = useState(null);
  const [geoNews, setGeoNews] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [intelligence, setIntelligence] = useState(null);
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);
  const [catalog, setCatalog] = useState(INIT_CATALOG?.catalog ?? null);
  const [catalogSummary, setCatalogSummary] = useState(INIT_CATALOG?.summary ?? null);
  const [catalogUpdatedAt, setCatalogUpdatedAt] = useState(INIT_CATALOG?.updatedAt ?? null);
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
  const analysisKeyRef = useRef('');
  const lastPriceRef = useRef(null);

  const loadCategorySources = useCallback(async () => {
    try {
      const { data } = await apiFetch(`${API_BASE}/api/sources`, { optional: true });
      if (data?.categories) setCategorySources(data.categories);
    } catch {
      /* opzionale */
    }
  }, []);

  const applyCatalogPayload = useCallback((data) => {
    if (!data?.catalog) return;
    setCatalog(data.catalog);
    setCatalogSummary(data.summary ?? null);
    setCatalogUpdatedAt(data.updatedAt ?? null);
    if (data.fx?.eurUsd) setFx(data.fx);
    setCatalogCache({
      catalog: data.catalog,
      summary: data.summary,
      updatedAt: data.updatedAt,
      fx: data.fx,
    });
    const map = catalogToQuoteMap(data.catalog);
    if (Object.keys(map).length) {
      setCompetitorQuotes((prev) => ({ ...map, ...prev }));
    }
  }, []);

  const loadCatalog = useCallback(
    async ({ force = false } = {}) => {
      const hydrated = force ? null : getCatalogCache();
      if (hydrated?.catalog) {
        applyCatalogPayload(hydrated);
      } else {
        setLoadingCatalog(true);
      }

      try {
        const { data } = await apiFetch(`${API_BASE}/api/catalog`, { optional: true });
        if (!data?.catalog) return;
        applyCatalogPayload(data);
      } catch {
        /* catalog opzionale */
      } finally {
        setLoadingCatalog(false);
      }
    },
    [applyCatalogPayload]
  );

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
      const nextType = assetType || type;
      prefetchMarket(id, nextType);
      if (assetType && assetType !== type) setType(assetType);
      setSymbol(id);
      setView('analysis');
    },
    [type]
  );

  const handleGoAnalyze = useCallback(() => {
    prefetchMarket(symbol, type);
    setView('analysis');
  }, [symbol, type]);

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
      analysisKeyRef.current = '';
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

  const isMetalMarket = type === 'commodity' || type === 'precious' || type === 'metal';

  const loadCommodityProfile = useCallback(
    async (sym, marketType) => {
      if (marketType !== 'commodity' && marketType !== 'precious' && marketType !== 'metal') {
        setCommodityProfile(null);
        return;
      }
      try {
        setLoadingCommodity(true);
        const params = new URLSearchParams({
          symbol: sym,
          type: marketType === 'metal' ? 'precious' : marketType,
          days: String(horizonDays),
          window: String(windowN),
        });
        const { data } = await apiFetch(
          `${API_BASE}/api/commodities/profile?${params}`,
          { optional: true }
        );
        setCommodityProfile(data ?? null);
        if (data?.fx?.eurUsd) setFx(data.fx);
      } catch {
        setCommodityProfile(null);
      } finally {
        setLoadingCommodity(false);
      }
    },
    [horizonDays, windowN]
  );

  const loadAnalysisBundle = useCallback(
    async (sym, marketType, rate) => {
      const bundleKey = `${sym}:${marketType}`;
      const isNewBundle = analysisKeyRef.current !== bundleKey;
      if (isNewBundle) {
        analysisKeyRef.current = bundleKey;
        setLoadingAnalysis(true);
        setLoadingIntelligence(true);
        setLoadingGeo(true);
      }
      try {
        loadCommodityProfile(sym, marketType);
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
        if (isNewBundle) {
          setLoadingAnalysis(false);
          setLoadingIntelligence(false);
          setLoadingGeo(false);
        }
      }
    },
    [horizonDays, windowN, forecastMethod, applyIntelligence, loadCommodityProfile]
  );

  const applyMarketResponse = useCallback((data, sym, marketType) => {
    if (!data) return false;
    const meta = getSymbolMeta(sym, marketType);
    const raw = data.quote;

    setMarketMeta({
      provider: data.provider,
      sources: data.sources,
      alternates: data.alternates,
      proxy: data.proxy,
    });

    if (!raw?.price) {
      setQuote({ error: 'Prezzo non disponibile al momento.' });
      setHistory([]);
      return false;
    }

    const nextPrice = raw.price;
    if (
      lastPriceRef.current != null &&
      nextPrice != null &&
      lastPriceRef.current !== nextPrice
    ) {
      setDataFreshKey((k) => k + 1);
    }
    lastPriceRef.current = nextPrice;

    setQuote({
      ...raw,
      unit: meta.unit,
      proxy: data.proxy || raw.proxy,
      provider: data.provider,
    });
    if (data.history?.length) setHistory(data.history);
    return true;
  }, []);

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

  const loadMarketData = useCallback(
    async ({ force = false } = {}) => {
      const gen = ++fetchGen.current;
      const cached = getMarketCache(symbol, type);
      const catalogQuote =
        quoteFromCatalog(catalog, symbol, type) ??
        quotesBySymbol[symbol.toUpperCase()];

      if (!force && cached?.quote?.price) {
        applyMarketResponse(cached, symbol, type);
        setLoadingMarket(false);
        setRefreshingMarket(true);
      } else if (!force && catalogQuote?.price) {
        applyMarketResponse(
          { quote: catalogQuote, history: cached?.history ?? [] },
          symbol,
          type
        );
        setLoadingMarket(!cached?.history?.length);
        setRefreshingMarket(Boolean(cached?.history?.length));
      } else {
        setLoadingMarket(true);
        setRefreshingMarket(false);
      }

      try {
        setError(null);
        if (force) setWarning(null);

        const { data } = await fetchMarket(symbol, type, { limit: 120, force });
        if (gen !== fetchGen.current) return;

        if (data.fx?.eurUsd) setFx(data.fx);
        const nextFx = data.fx?.eurUsd ? data.fx : null;

        applyMarketResponse(data, symbol, type);

        if (data.warning) setWarning(data.warning);
        else if (data.info) setWarning(data.info);

        loadAnalysisBundle(symbol, type, nextFx);

        if (!catalog?.[type]?.length) {
          window.setTimeout(() => loadCompetitorQuotes(type, nextFx), 50);
        }
      } catch (e) {
        if (gen !== fetchGen.current) return;
        if (!cached?.quote?.price && !catalogQuote?.price) {
          setError(e.message);
          setQuote(null);
          setHistory([]);
        }
      } finally {
        setLoadingMarket(false);
        setRefreshingMarket(false);
      }
    },
    [
      symbol,
      type,
      catalog,
      quotesBySymbol,
      applyMarketResponse,
      loadCompetitorQuotes,
      loadAnalysisBundle,
    ]
  );


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

  const loadForecast = useCallback(async (opts = {}) => {
    const { navigate = true } = opts;
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
      if (navigate) setView('forecast');
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

  const goForecast = useCallback(() => {
    setView('forecast');
    loadForecast();
  }, [loadForecast]);

  const handleViewChange = useCallback(
    (nextView) => {
      if (nextView === 'forecast') {
        goForecast();
        return;
      }
      setView(nextView);
      if (nextView === 'advice' && quote?.price && !quote?.error) {
        loadTradeAdvice(Boolean(forecast));
      }
    },
    [forecast, quote, goForecast, loadTradeAdvice]
  );

  const goAdvice = useCallback(() => {
    setView('advice');
    if (quote?.price && !quote?.error) {
      loadTradeAdvice(Boolean(forecast));
    }
  }, [quote, forecast, loadTradeAdvice]);

  const handleQuickNav = useCallback(
    ({ view: nextView, type: nextType }) => {
      if (nextType && nextType !== type) handleTypeChange(nextType);
      if (nextView === 'forecast') {
        goForecast();
        return;
      }
      if (nextView) handleViewChange(nextView);
    },
    [type, handleTypeChange, handleViewChange, goForecast]
  );

  const handleSelectCategory = useCallback(
    (catId) => {
      handleTypeChange(catId);
      setView('explore');
    },
    [handleTypeChange]
  );

  const handleInternalSection = useCallback(
    (section) => {
      if (section.view) setView(section.view);
      if (section.analysisPanels) setAnalysisPanels(section.analysisPanels);
      if (section.forecastPanels) setForecastPanels(section.forecastPanels);
      if (section.view === 'forecast' && quote?.price && !quote?.error) {
        loadForecast();
      }
    },
    [quote, loadForecast]
  );

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
      historyTimeframe,
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
      historyTimeframe,
    });
  }, [
    view,
    type,
    symbol,
    windowN,
    horizonDays,
    forecastMethod,
    historyTimeframe,
    theme,
    explorePanels,
    catalogScope,
    analysisPanels,
    forecastPanels,
  ]);

  useEffect(() => {
    loadCategorySources();
    loadGeoNews();
    loadCatalog();
    if (INIT_CATALOG?.catalog) {
      const map = catalogToQuoteMap(INIT_CATALOG.catalog);
      if (Object.keys(map).length) {
        setCompetitorQuotes((prev) => ({ ...map, ...prev }));
      }
    }
  }, [loadCategorySources, loadGeoNews, loadCatalog]);

  useEffect(() => {
    loadMarketData();
  }, [symbol, type, loadMarketData]);

  useEffect(() => {
    if (catalog?.[type]?.length) prefetchMarkets(catalog[type], type);
  }, [catalog, type]);

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
    loadCatalog({ force: true });
    loadMarketData({ force: true });
  };

  const catalogPanelLoading = loadingCatalog && !catalog;

  const meta = getSymbolMeta(symbol, type);
  const categoryMeta = getCategoryMeta(type);
  const liveCryptoId =
    type === 'crypto' && ['BTC-USD', 'ETH-USD'].includes(symbol.toUpperCase())
      ? symbol.toUpperCase()
      : null;
  const cryptoLive = useCryptoLiveQuote(liveCryptoId, Boolean(liveCryptoId));

  const chartHistory = useMemo(
    () => sliceHistoryByTimeframe(history, historyTimeframe),
    [history, historyTimeframe]
  );

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

  const hasQuote = Boolean(displayQuote?.price && !displayQuote?.error);
  const marketBlocking = loadingMarket && !hasQuote;
  const marketRefreshing = refreshingMarket && hasQuote;
  const marketBusy = marketBlocking || marketRefreshing;
  const quotePanelLoading = marketBlocking;
  const chartBlocking = marketBlocking && !chartHistory.length;
  const analysisBlocking = loadingAnalysis && !analysis?.indicators;
  const isLoading = marketBlocking || (loadingForecast && view === 'forecast' && !forecast);

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

  const isMobile = useMobileLayout();
  const isTerminalExplore = view === 'explore' && !isMobile;

  useEffect(() => {
    if (isTerminalExplore) {
      import('./dashboard-terminal.css');
    }
  }, [isTerminalExplore]);
  const showAnalysisLegend = analysisPanels.includes('legend');
  const showForecastLegend = forecastPanels.includes('legend');

  return (
    <div
      className={`app ${isTerminalExplore ? 'app--terminal' : ''} ${isMobile ? 'app--mobile' : ''}`}
    >
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
        loadingMarket={marketBlocking}
        isLoading={isLoading}
        isRefreshing={marketRefreshing || loadingCatalog}
        theme={theme}
        themeToggle={<ThemeToggle theme={theme} onChange={setTheme} />}
        onQuickNav={handleQuickNav}
        onInternalSection={handleInternalSection}
        onSymbolChange={handleSymbolChange}
        dataFreshKey={dataFreshKey}
        isMobile={isMobile}
        isTerminalExplore={isTerminalExplore}
      >
        {!(isMobile && view === 'explore') &&
          !isTerminalExplore &&
          view !== 'info' && <StepIntro view={view} />}
        {!(isMobile && view === 'explore') && (
          <AppToolbar
            shareState={shareState}
            loadingMarket={marketBlocking}
            refreshing={marketRefreshing || (loadingCatalog && Boolean(catalog))}
            quoteReady={quoteReady}
          />
        )}
        {alerts}


        {view === 'analysis' && !isMobile && (
          <>
            <PanelChoices
              label="Sezioni di analisi"
              hint="Scegli quali blocchi visualizzare"
              options={ANALYSIS_PANEL_OPTIONS}
              selected={analysisPanels}
              onChange={setAnalysisPanels}
            />
            {showAnalysisLegend && (
              <Suspense fallback={null}>
                <HelpLegend view={view} compact forceOpen />
              </Suspense>
            )}
          </>
        )}

        {view === 'advice' && (
          <div className="view-panel view-panel--advice">
            <Suspense fallback={<PanelFallback />}>
              <TradeAdvice
                advice={tradeAdvice}
                quote={quote}
                loading={loadingTradeAdvice || loadingMarket}
                hasForecast={adviceHasForecast}
                onEnableForecast={() => loadTradeAdvice(true)}
                loadingForecast={loadingTradeAdvice}
              />
            </Suspense>
          </div>
        )}

        {view === 'forecast' && !isMobile && (
          <>
            <PanelChoices
              label="Contenuti previsione"
              options={FORECAST_PANEL_OPTIONS}
              selected={forecastPanels}
              onChange={setForecastPanels}
            />
            {showForecastLegend && (
              <Suspense fallback={null}>
                <HelpLegend view={view} compact forceOpen />
              </Suspense>
            )}
          </>
        )}

        {view === 'explore' && isMobile && (
          <Suspense fallback={<PanelFallback label="Caricamento mercati…" tall />}>
            <MobileExploreHub
              type={type}
              symbol={symbol}
              catalog={catalog}
              catalogSummary={catalogSummary}
              catalogUpdatedAt={catalogUpdatedAt}
              quote={displayQuote}
              fx={fx}
              loadingCatalog={catalogPanelLoading}
              loadingMarket={marketBlocking}
              quotesBySymbol={quotesBySymbol}
              onSelectAsset={handleSelectAsset}
              onSelectCategory={handleSelectCategory}
              onAnalyze={handleGoAnalyze}
              onWatchlistSelect={handleSelectAsset}
              onTypeChange={handleTypeChange}
              onRefresh={refreshAll}
              onForecast={goForecast}
            />
          </Suspense>
        )}

        {isTerminalExplore && (
          <Suspense fallback={<PanelFallback label="Caricamento dashboard…" tall />}>
          <TerminalDashboard
            catalog={catalog}
            catalogSummary={catalogSummary}
            catalogUpdatedAt={catalogUpdatedAt}
            loadingCatalog={catalogPanelLoading}
            fx={fx}
            geoNews={geoForNews}
            loadingGeo={geoLoading}
            onSelectAsset={handleSelectAsset}
            onRefresh={refreshAll}
            loadingMarket={marketBlocking}
            timeframe={historyTimeframe}
            onTimeframeChange={setHistoryTimeframe}
            onTypeChange={handleTypeChange}
            selectedSymbol={symbol}
            selectedType={type}
          />
          </Suspense>
        )}

        {view === 'analysis' && (
          <div className="view-panel view-panel--analysis">
            <Suspense fallback={<PanelFallback />}>
            <DataSources
              type={type}
              provider={marketMeta?.provider}
              sources={marketMeta?.sources}
              alternates={marketMeta?.alternates}
              categoryConfig={categorySources?.[type]}
            />
            </Suspense>

            <section
              className={`asset-dashboard app-card ${marketRefreshing ? 'asset-dashboard--refreshing' : ''}`}
            >
              <QuotePanel
                variant="hero"
                quote={displayQuote}
                type={type}
                symbol={symbol}
                loading={quotePanelLoading}
                refreshing={marketRefreshing}
                fx={fx}
                freshKey={dataFreshKey}
                onGoExplore={() => handleViewChange('explore')}
              />
              <AssetStatsRow
                quote={displayQuote}
                analysis={analysis}
                loading={quotePanelLoading || analysisBlocking}
                refreshing={marketRefreshing || (loadingAnalysis && Boolean(analysis?.indicators))}
                type={type}
                symbol={symbol}
                fx={fx}
              />
              <div className="asset-dashboard__chart">
                <Suspense fallback={<PanelFallback label="Caricamento grafico…" tall />}>
                  <HistoryChart
                    history={chartHistory}
                    title={`Andamento · ${meta.name}`}
                    loading={chartBlocking}
                    refreshing={marketRefreshing && chartHistory.length > 0}
                    fx={fx}
                    meta={meta}
                    type={type}
                    symbol={symbol}
                    quote={displayQuote}
                    timeframe={historyTimeframe}
                    onTimeframeChange={setHistoryTimeframe}
                    showIndicators={showChartIndicators}
                    analysis={analysis}
                    chartOverlays={chartOverlays}
                    onChartOverlaysChange={setChartOverlays}
                    forecast={forecast}
                    onRequestForecast={() => loadForecast({ navigate: false })}
                    forecastLoading={loadingForecast}
                  />
                </Suspense>
              </div>
            </section>

            {isMobile ? (
              <MobileStickyActions
                onAdvice={goAdvice}
                onForecast={goForecast}
                loadingAdvice={loadingTradeAdvice}
                loadingForecast={loadingForecast}
                loadingMarket={quotePanelLoading}
                quoteReady={quoteReady}
              />
            ) : null}

            <div className="view-panel__actions view-panel__actions--dual">
              <button
                type="button"
                className="btn btn--primary"
                onClick={goAdvice}
                disabled={loadingTradeAdvice || quotePanelLoading || !quote?.price || quote?.error}
              >
                {loadingTradeAdvice ? 'Consiglio…' : 'Consigli acquisto / vendita →'}
              </button>
              <button
                type="button"
                className="btn btn--cta"
                onClick={goForecast}
                disabled={loadingForecast || quotePanelLoading || !quote?.price || quote?.error}
              >
                {loadingForecast ? 'Calcolo…' : 'Calcola previsione →'}
              </button>
            </div>

            <Suspense fallback={null}>
              <IntelligentAlerts alerts={intelligence?.alerts} />
            </Suspense>

            {isMetalMarket && (
              <section className="app-card app-card--commodity">
                <Suspense fallback={<PanelFallback />}>
                <CommodityDashboard
                  profile={commodityProfile}
                  loading={loadingCommodity || loadingMarket}
                  fx={fx}
                />
                </Suspense>
              </section>
            )}

            {analysisPanels.includes('forecast') && (
              <Suspense fallback={<PanelFallback tall />}>
                <ForecastPreview
                  forecast={forecast}
                  loading={loadingForecast}
                  loadingForecast={loadingForecast}
                  fx={fx}
                  type={type}
                  symbol={symbol}
                  quote={displayQuote}
                  onCalculate={() => loadForecast({ navigate: false })}
                />
              </Suspense>
            )}

            {(analysisPanels.includes('indicators') ||
              analysisPanels.includes('correlations')) && (
              <div className="app__grid app__grid--duo">
                {analysisPanels.includes('indicators') && (
                  <section className="app-card">
                    <h3 className="view-panel__subtitle">Analisi tecnica</h3>
                    <Suspense fallback={null}>
                      <IndicatorToggles
                        value={indicatorToggles}
                        onChange={setIndicatorToggles}
                        disabled={loadingAnalysis || loadingMarket}
                      />
                    </Suspense>
                    <Suspense fallback={<PanelFallback />}>
                    <TechnicalIndicators
                      analysis={analysis}
                      loading={analysisBlocking}
                      refreshing={loadingAnalysis && Boolean(analysis?.indicators)}
                      fx={fx}
                      type={type}
                      symbol={symbol}
                      visible={indicatorToggles}
                    />
                    </Suspense>
                  </section>
                )}

                {analysisPanels.includes('correlations') && (
                  <section className="app-card app-card--correlations">
                    <h3 className="view-panel__subtitle">Correlazioni · {meta.name}</h3>
                    <Suspense fallback={<PanelFallback />}>
                    <MarketCorrelations
                      intelligence={intelligence}
                      loading={loadingIntelligence || loadingMarket}
                    />
                    </Suspense>
                  </section>
                )}
              </div>
            )}

            {analysisPanels.includes('compare') && (
              <section className="app-card app-card--flush">
                <Suspense fallback={<PanelFallback tall />}>
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
                </Suspense>
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
                <Suspense fallback={<PanelFallback />}>
                  <GeopoliticalSummary
                    geo={geopolitical}
                    fx={fx}
                    meta={meta}
                    loading={geoLoading}
                  />
                </Suspense>
                <Suspense fallback={<PanelFallback />}>
                  <GeopoliticalImpactChart
                    geo={geopolitical}
                    history={history}
                    fx={fx}
                    meta={meta}
                    type={type}
                    symbol={symbol}
                    quote={displayQuote}
                    loading={geoLoading || loadingMarket}
                  />
                </Suspense>
                <h3 className="app__subsection-title">Notizie dal mondo</h3>
                <Suspense fallback={<PanelFallback />}>
                  <GeopoliticalNews geo={geoForNews} loading={geoLoading && !geoForNews?.news?.length} />
                </Suspense>
              </section>
            )}
          </div>
        )}

        {view === 'forecast' && (
          <div className="view-panel view-panel--forecast">
            {forecastPanels.includes('params') && (
              <Suspense fallback={<PanelFallback />}>
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
                historyLength={history?.length ?? 0}
              />
              </Suspense>
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
                    quote={displayQuote}
                    onForecast={goForecast}
                    forecastLoading={loadingForecast || loadingMarket}
                  />
                </Suspense>
                <Suspense fallback={<PanelFallback />}>
                  <ForecastCards
                    forecast={forecast}
                    loading={loadingForecast}
                    fx={fx}
                    type={type}
                    symbol={symbol}
                    quote={displayQuote}
                  />
                </Suspense>
              </div>
            </section>

            {forecastPanels.includes('advanced') && (
              <section className="app-card app-card--forecast-advanced">
                <h3 className="view-panel__subtitle">Previsioni avanzate · ML intelligence</h3>
                <Suspense fallback={<PanelFallback />}>
                  <MlForecastPanel
                    intelligence={intelligence}
                    loading={loadingIntelligence || loadingForecast}
                    type={type}
                    symbol={symbol}
                    quote={displayQuote}
                    fx={fx}
                  />
                </Suspense>
              </section>
            )}

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
                    type={type}
                    symbol={symbol}
                    quote={displayQuote}
                    loading={loadingForecast || loadingMarket}
                  />
                </Suspense>
              </section>
            )}
          </div>
        )}

        {view === 'info' && (
          <InfoPage
            type={type}
            marketMeta={marketMeta}
            categoryConfig={categorySources?.[type]}
          />
        )}

        <TrustFooter />

        <ViewFooter
          view={view}
          onViewChange={handleViewChange}
          onForecast={goForecast}
          loadingForecast={loadingForecast}
          loadingMarket={marketBlocking}
          assetName={meta.name}
          hasForecast={Boolean(forecast)}
        />
      </AppShell>
    </div>
  );
}
