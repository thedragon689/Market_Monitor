import {
  ANALYSIS_PANEL_OPTIONS,
  EXPLORE_PANEL_OPTIONS,
  FORECAST_PANEL_OPTIONS,
  defaultPanelSet,
} from '../data/viewChoices';
import { getDefaultState, loadPersistedState } from './persist';
import { parseUrlState } from './urlState';

export function resolveInitialAppState() {
  const defaults = getDefaultState();
  const stored = loadPersistedState();
  const url =
    typeof window !== 'undefined' ? parseUrlState(window.location.search) : {};

  const explorePanels = defaultPanelSet(
    EXPLORE_PANEL_OPTIONS,
    url.explorePanels ?? stored.explorePanels ?? defaults.explorePanels
  );
  const analysisPanels = defaultPanelSet(
    ANALYSIS_PANEL_OPTIONS,
    url.analysisPanels ?? stored.analysisPanels ?? defaults.analysisPanels
  );
  const forecastPanels = defaultPanelSet(
    FORECAST_PANEL_OPTIONS,
    url.forecastPanels ?? stored.forecastPanels ?? defaults.forecastPanels
  );

  return {
    view: url.view ?? stored.view ?? defaults.view,
    type: url.type ?? stored.type ?? defaults.type,
    symbol: url.symbol ?? stored.symbol ?? defaults.symbol,
    windowN: url.windowN ?? stored.windowN ?? defaults.windowN,
    horizonDays: url.horizonDays ?? stored.horizonDays ?? defaults.horizonDays,
    forecastMethod:
      url.forecastMethod ?? stored.forecastMethod ?? defaults.forecastMethod,
    historyTimeframe:
      url.historyTimeframe ?? stored.historyTimeframe ?? defaults.historyTimeframe,
    theme: stored.theme ?? defaults.theme,
    explorePanels,
    catalogScope: stored.catalogScope ?? defaults.catalogScope,
    analysisPanels,
    forecastPanels,
  };
}
