import { useCallback, useMemo, useState } from 'react';
import TerminalWidget from './TerminalWidget';
import TerminalDataTable from './TerminalDataTable';
import TerminalPerformanceChart from './TerminalPerformanceChart';
import TerminalNewsFeed from './TerminalNewsFeed';
import TerminalHeatmap from './TerminalHeatmap';
import { useCompareHistories } from '../../hooks/useCompareHistories';
import {
  DEFAULT_CHART_PICKS,
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

export default function TerminalDashboard({
  catalog,
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

  const handleToggleChart = useCallback((asset) => {
    setChartPicks((prev) => {
      const key = asset.id.toUpperCase();
      const exists = prev.some((p) => p.id.toUpperCase() === key);
      if (exists) return prev.filter((p) => p.id.toUpperCase() !== key);
      if (prev.length >= MAX_CHART_ASSETS) return prev;
      return [...prev, { id: asset.id, type: asset.type, name: asset.name }];
    });
  }, []);

  const handleRail = (id, side) => {
    setActiveRail(id);
    if (side === 'right' && id === 'crypto') onTypeChange?.('crypto');
    if (side === 'right' && id === 'forex') onTypeChange?.('forex');
    if (side === 'right' && id === 'commodities') onTypeChange?.('commodity');
  };

  const leftPanels = TERMINAL_LEFT_PANELS.map((panel) => ({
    panel,
    items: filterSearch(enrichCatalogItems(catalog, panel)),
  }));

  const rightPanels = TERMINAL_RIGHT_PANELS.map((panel) => ({
    panel,
    items: filterSearch(enrichCatalogItems(catalog, panel)),
  }));

  const cryptoItems = filterSearch(
    (catalog?.crypto || []).map((i) => ({ ...i, assetType: 'crypto' }))
  );

  return (
    <div className="terminal-dashboard">
      <div className="terminal-dashboard__toolbar">
        <label className="terminal-search">
          <span className="terminal-search__icon" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            className="terminal-search__input"
            placeholder="Cerca nome, ticker o categoria…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="terminal-dashboard__toolbar-actions">
          <button
            type="button"
            className="terminal-btn"
            onClick={onRefresh}
            disabled={loadingMarket || loadingCatalog}
          >
            ↻ Aggiorna
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
              onClick={() => handleRail(r.id, 'left')}
            >
              <span aria-hidden>{r.icon}</span>
            </button>
          ))}
        </aside>

        <div className="terminal-dashboard__col terminal-dashboard__col--left">
          {leftPanels.map(({ panel, items }) => (
            <TerminalWidget key={panel.id} title={panel.title}>
              <TerminalDataTable
                items={items}
                loading={loadingCatalog}
                chartPicks={chartPicks}
                onToggleChart={handleToggleChart}
                onSelectRow={onSelectAsset}
                fx={fx}
              />
            </TerminalWidget>
          ))}
        </div>

        <div className="terminal-dashboard__col terminal-dashboard__col--center">
          <TerminalWidget title="Notizie di mercato">
            <TerminalNewsFeed articles={articles} loading={loadingGeo} />
          </TerminalWidget>

          <TerminalWidget title="Performance comparata">
            <TerminalPerformanceChart
              chartData={chartData}
              seriesById={seriesById}
              loading={loadingChart || loadingCatalog}
              timeframe={timeframe}
              onTimeframeChange={onTimeframeChange}
            />
          </TerminalWidget>

          <TerminalWidget title="Heatmap settori">
            <TerminalHeatmap catalog={catalog} fx={fx} />
          </TerminalWidget>

          <TerminalWidget title="Tassi · rendimenti">
            <TerminalDataTable
              items={enrichCatalogItems(catalog, {
                catalogKey: 'rates',
                assetType: 'rates',
              })}
              loading={loadingCatalog}
              chartPicks={chartPicks}
              onToggleChart={handleToggleChart}
              onSelectRow={onSelectAsset}
              fx={fx}
              maxRows={8}
            />
          </TerminalWidget>
        </div>

        <div className="terminal-dashboard__col terminal-dashboard__col--right">
          {rightPanels.map(({ panel, items }) => (
            <TerminalWidget key={panel.id} title={panel.title}>
              <TerminalDataTable
                items={items}
                loading={loadingCatalog}
                chartPicks={chartPicks}
                onToggleChart={handleToggleChart}
                onSelectRow={onSelectAsset}
                fx={fx}
              />
            </TerminalWidget>
          ))}

          {activeRail === 'crypto' && (
            <TerminalWidget title="Crypto">
              <TerminalDataTable
                items={cryptoItems}
                loading={loadingCatalog}
                chartPicks={chartPicks}
                onToggleChart={handleToggleChart}
                onSelectRow={onSelectAsset}
                fx={fx}
              />
            </TerminalWidget>
          )}
        </div>

        <aside className="terminal-rail terminal-rail--right" aria-label="Collegamenti rapidi">
          {TERMINAL_RAIL_RIGHT.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`terminal-rail__btn ${activeRail === r.id ? 'is-active' : ''}`}
              title={r.label}
              onClick={() => handleRail(r.id, 'right')}
            >
              <span aria-hidden>{r.icon}</span>
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
}
