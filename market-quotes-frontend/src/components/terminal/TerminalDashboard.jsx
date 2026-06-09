import { useCallback, useMemo, useState } from 'react';
import CategoryIcon from '../icons/CategoryIcon';
import RefreshIcon from '../icons/RefreshIcon';
import SearchIcon from '../icons/SearchIcon';
import TerminalWidget from './TerminalWidget';
import TerminalDataTable from './TerminalDataTable';
import TerminalPerformanceChart from './TerminalPerformanceChart';
import TerminalNewsFeed from './TerminalNewsFeed';
import TerminalHeatmap from './TerminalHeatmap';
import TerminalStatusBar from './TerminalStatusBar';
import TerminalChartLegend from './TerminalChartLegend';
import TerminalTopMovers from './TerminalTopMovers';
import { useCompareHistories } from '../../hooks/useCompareHistories';
import {
  DEFAULT_CHART_PICKS,
  TERMINAL_CENTER_PANELS,
  TERMINAL_CHART_COLORS,
  TERMINAL_LEFT_PANELS,
  TERMINAL_RAIL_LEFT,
  TERMINAL_RAIL_RIGHT,
  TERMINAL_RIGHT_PANELS,
} from '../../data/terminalPanels';

const MAX_CHART_ASSETS = 6;

function enrichCatalogItems(catalog, panel) {
  const raw = catalog?.[panel.catalogKey] || [];
  let items = raw.map((item) => ({ ...item, assetType: panel.assetType }));

  if (panel.sectorOnly) {
    items = items.filter((i) => i.sector);
  }
  if (panel.skipIds?.length) {
    const skip = new Set(panel.skipIds.map((id) => id.toUpperCase()));
    items = items.filter((i) => !skip.has(i.id.toUpperCase()));
  }

  return items.filter((i) => i.quote?.price != null || i.name);
}

function pickWithColors(picks) {
  return picks.map((p, i) => ({
    ...p,
    color: TERMINAL_CHART_COLORS[i % TERMINAL_CHART_COLORS.length],
  }));
}

function countQuoted(summary) {
  if (!summary) return null;
  return Object.values(summary).reduce((n, s) => n + (s?.quoted ?? 0), 0);
}

export default function TerminalDashboard({
  catalog,
  catalogSummary,
  catalogUpdatedAt,
  loadingCatalog,
  fx,
  geoNews,
  loadingGeo,
  onSelectAsset,
  onRefresh,
  loadingMarket,
  timeframe,
  onTimeframeChange,
  onTypeChange,
  selectedSymbol,
}) {
  const [search, setSearch] = useState('');
  const [chartPicks, setChartPicks] = useState(DEFAULT_CHART_PICKS);
  const [activeRail, setActiveRail] = useState('indices');

  const coloredPicks = useMemo(() => pickWithColors(chartPicks), [chartPicks]);
  const { seriesById, chartData, loading: loadingChart } = useCompareHistories(
    coloredPicks,
    timeframe
  );

  const articles = geoNews?.news ?? geoNews?.articles ?? [];
  const quotedTotal = countQuoted(catalogSummary);

  const filterSearch = useCallback(
    (items) => {
      const q = search.trim().toLowerCase();
      if (!q) return items;
      return items.filter(
        (i) =>
          i.id.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q) ||
          (i.hint && i.hint.toLowerCase().includes(q))
      );
    },
    [search]
  );

  const scrollToPanel = (panelId) => {
    const el = document.getElementById(`terminal-panel-${panelId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleToggleChart = useCallback((asset) => {
    setChartPicks((prev) => {
      const key = asset.id.toUpperCase();
      const exists = prev.some((p) => p.id.toUpperCase() === key);
      if (exists) return prev.filter((p) => p.id.toUpperCase() !== key);
      if (prev.length >= MAX_CHART_ASSETS) return prev;
      return [...prev, { id: asset.id, type: asset.type, name: asset.name }];
    });
  }, []);

  const handleRemoveChart = useCallback((id) => {
    setChartPicks((prev) => prev.filter((p) => p.id.toUpperCase() !== id.toUpperCase()));
  }, []);

  const handleRail = (id, side) => {
    setActiveRail(id);
    scrollToPanel(id);
    if (side === 'right' && id === 'crypto') onTypeChange?.('crypto');
    if (side === 'right' && id === 'forex') onTypeChange?.('forex');
    if (side === 'right' && id === 'commodities') onTypeChange?.('commodity');
    if (side === 'left' && id === 'indices') onTypeChange?.('index');
    if (side === 'left' && id === 'sectors') onTypeChange?.('etf');
    if (side === 'left' && id === 'rates') onTypeChange?.('rates');
  };

  const leftPanels = TERMINAL_LEFT_PANELS.map((panel) => ({
    panel,
    items: filterSearch(enrichCatalogItems(catalog, panel)),
  }));

  const rightPanels = TERMINAL_RIGHT_PANELS.map((panel) => ({
    panel,
    items: filterSearch(enrichCatalogItems(catalog, panel)),
  }));

  const centerPanels = TERMINAL_CENTER_PANELS.map((panel) => ({
    panel,
    items: filterSearch(enrichCatalogItems(catalog, panel)),
  }));

  const tableProps = {
    loading: loadingCatalog && !catalog,
    chartPicks,
    onToggleChart: handleToggleChart,
    onSelectRow: onSelectAsset,
    selectedSymbol,
    fx,
  };

  return (
    <div className="terminal-dashboard">
      <TerminalStatusBar
        summary={catalogSummary}
        updatedAt={catalogUpdatedAt}
        fx={fx}
        quotedTotal={quotedTotal}
        loading={loadingCatalog && !catalog}
      />

      <div className="terminal-dashboard__toolbar">
        <label className="terminal-search">
          <span className="terminal-search__icon" aria-hidden>
            <SearchIcon />
          </span>
          <input
            type="search"
            className="terminal-search__input"
            placeholder="Cerca ticker, nome o categoria…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="terminal-dashboard__toolbar-actions">
          {selectedSymbol && (
            <span className="terminal-dashboard__active-asset">
              Attivo: <code>{selectedSymbol}</code>
            </span>
          )}
          <button
            type="button"
            className="terminal-btn"
            onClick={onRefresh}
            disabled={loadingMarket || loadingCatalog}
          >
            <RefreshIcon size={15} />
            Aggiorna
          </button>
        </div>
      </div>

      <div className="terminal-dashboard__layout">
        <aside className="terminal-rail terminal-rail--left" aria-label="Collegamenti rapidi">
          {TERMINAL_RAIL_LEFT.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`terminal-rail__btn ${activeRail === r.id ? 'is-active' : ''}`}
              title={r.label}
              aria-label={r.label}
              onClick={() => handleRail(r.id, 'left')}
            >
              <CategoryIcon id={r.iconId} size={22} />
            </button>
          ))}
        </aside>

        <div className="terminal-dashboard__col terminal-dashboard__col--left">
          {leftPanels.map(({ panel, items }) => (
            <TerminalWidget key={panel.id} title={panel.title} panelId={panel.id}>
              <TerminalDataTable items={items} {...tableProps} />
            </TerminalWidget>
          ))}
        </div>

        <div className="terminal-dashboard__col terminal-dashboard__col--center">
          <TerminalWidget title="Top movers" panelId="movers">
            <TerminalTopMovers
              catalog={catalog}
              fx={fx}
              loading={loadingCatalog && !catalog}
              onSelect={onSelectAsset}
            />
          </TerminalWidget>

          <TerminalWidget title="Notizie di mercato" panelId="news">
            <TerminalNewsFeed articles={articles} loading={loadingGeo} />
          </TerminalWidget>

          <TerminalWidget title="Performance comparata" panelId="chart">
            <TerminalChartLegend picks={coloredPicks} onRemove={handleRemoveChart} />
            <TerminalPerformanceChart
              chartData={chartData}
              seriesById={seriesById}
              loading={loadingChart || loadingCatalog}
              timeframe={timeframe}
              onTimeframeChange={onTimeframeChange}
            />
          </TerminalWidget>

          <TerminalWidget title="Heatmap settori USA" panelId="heatmap">
            <TerminalHeatmap catalog={catalog} fx={fx} onSelect={onSelectAsset} />
          </TerminalWidget>

          <TerminalWidget title="Tassi · rendimenti" panelId="rates">
            <TerminalDataTable
              items={enrichCatalogItems(catalog, {
                catalogKey: 'rates',
                assetType: 'rates',
              })}
              {...tableProps}
              maxRows={10}
            />
          </TerminalWidget>

          {centerPanels.map(({ panel, items }) => (
            <TerminalWidget key={panel.id} title={panel.title} panelId={panel.id}>
              <TerminalDataTable items={items} {...tableProps} maxRows={8} compact />
            </TerminalWidget>
          ))}
        </div>

        <div className="terminal-dashboard__col terminal-dashboard__col--right">
          {rightPanels.map(({ panel, items }) => (
            <TerminalWidget key={panel.id} title={panel.title} panelId={panel.id}>
              <TerminalDataTable items={items} {...tableProps} />
            </TerminalWidget>
          ))}
        </div>

        <aside className="terminal-rail terminal-rail--right" aria-label="Collegamenti rapidi">
          {TERMINAL_RAIL_RIGHT.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`terminal-rail__btn ${activeRail === r.id ? 'is-active' : ''}`}
              title={r.label}
              aria-label={r.label}
              onClick={() => handleRail(r.id, 'right')}
            >
              <CategoryIcon id={r.iconId} size={22} />
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
}
