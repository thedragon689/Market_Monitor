/**
 * Azioni nazionali (Borsa Italiana / FTSE MIB).
 * Sincronizzato con market-quotes-frontend/src/data/symbols.js
 */

const it = (row) => ({ ...row, region: 'Italia', market: 'IT' });

export const NATIONAL_STOCKS = [
  it({ id: 'ENI.MI', yahoo: 'ENI.MI', name: 'Eni', hint: 'Energia · FTSE MIB', sector: 'Energia' }),
  it({
    id: 'ISP.MI',
    yahoo: 'ISP.MI',
    name: 'Intesa Sanpaolo',
    hint: 'Banca · FTSE MIB',
    sector: 'Finanza',
  }),
  it({
    id: 'UCG.MI',
    yahoo: 'UCG.MI',
    name: 'UniCredit',
    hint: 'Banca · FTSE MIB',
    sector: 'Finanza',
  }),
  it({ id: 'ENEL.MI', yahoo: 'ENEL.MI', name: 'Enel', hint: 'Utility · FTSE MIB', sector: 'Utility' }),
  it({
    id: 'STM.MI',
    yahoo: 'STM.MI',
    name: 'STMicroelectronics',
    hint: 'Semiconduttori · FTSE MIB',
    sector: 'Tech',
  }),
  it({ id: 'RACE.MI', yahoo: 'RACE.MI', name: 'Ferrari', hint: 'Auto · FTSE MIB', sector: 'Auto' }),
  it({ id: 'G.MI', yahoo: 'G.MI', name: 'Generali', hint: 'Assicurazioni · FTSE MIB', sector: 'Finanza' }),
  it({
    id: 'LDO.MI',
    yahoo: 'LDO.MI',
    name: 'Leonardo',
    hint: 'Difesa · FTSE MIB',
    sector: 'Industriale',
  }),
  it({
    id: 'TEN.MI',
    yahoo: 'TEN.MI',
    name: 'Tenaris',
    hint: 'Acciaio · FTSE MIB',
    sector: 'Industriale',
  }),
  it({
    id: 'PRY.MI',
    yahoo: 'PRY.MI',
    name: 'Prysmian',
    hint: 'Cavi · FTSE MIB',
    sector: 'Industriale',
  }),
];

const BY_ID = new Map(NATIONAL_STOCKS.map((s) => [s.id.toUpperCase(), s]));

export function getNationalStockEntry(symbol) {
  return BY_ID.get(String(symbol).trim().toUpperCase()) ?? null;
}

export function toYahooNationalSymbol(symbol) {
  const entry = getNationalStockEntry(symbol);
  if (entry?.yahoo) return entry.yahoo;
  return String(symbol).trim().toUpperCase();
}

export function toStooqNationalSymbol(symbol) {
  const entry = getNationalStockEntry(symbol);
  if (entry?.stooq) return String(entry.stooq).toLowerCase();
  return String(symbol).trim().toLowerCase();
}
