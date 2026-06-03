/** Ordina asset per nome, variazione % o settore/famiglia. */
export function sortAssetItems(items, sortBy = 'name') {
  const list = [...items];

  const change = (item) => {
    const v = item.quote?.changePercent;
    return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
  };

  const groupKey = (item) =>
    (item.sector || item.family || item.region || '').toLowerCase();

  switch (sortBy) {
    case 'changeDesc':
      return list.sort((a, b) => {
        const ca = change(a);
        const cb = change(b);
        if (ca == null && cb == null) return a.name.localeCompare(b.name, 'it');
        if (ca == null) return 1;
        if (cb == null) return -1;
        return cb - ca || a.name.localeCompare(b.name, 'it');
      });
    case 'changeAsc':
      return list.sort((a, b) => {
        const ca = change(a);
        const cb = change(b);
        if (ca == null && cb == null) return a.name.localeCompare(b.name, 'it');
        if (ca == null) return 1;
        if (cb == null) return -1;
        return ca - cb || a.name.localeCompare(b.name, 'it');
      });
    case 'sector':
      return list.sort(
        (a, b) =>
          groupKey(a).localeCompare(groupKey(b), 'it') ||
          a.name.localeCompare(b.name, 'it')
      );
    case 'symbol':
      return list.sort((a, b) => a.id.localeCompare(b.id, 'it'));
    case 'name':
    default:
      return list.sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }
}

export const SORT_OPTIONS = [
  { id: 'name', label: 'Nome A → Z' },
  { id: 'symbol', label: 'Simbolo' },
  { id: 'changeDesc', label: 'Variazione ↓' },
  { id: 'changeAsc', label: 'Variazione ↑' },
  { id: 'sector', label: 'Settore / famiglia' },
];
