import { MARKET_CATEGORIES } from '../data/categories';
import { getSymbolsForType } from '../data/symbols';

const PRIMARY_TYPES = MARKET_CATEGORIES.filter((c) => c.group === 'primary');

export default function AssetSwitcher({
  type,
  symbol,
  onTypeChange,
  onSymbolChange,
  disabled,
}) {
  const symbols = getSymbolsForType(type);

  return (
    <div className="asset-switcher" aria-label="Cambia asset">
      <label className="asset-switcher__field">
        <span className="asset-switcher__label">Categoria</span>
        <select
          className="asset-switcher__select"
          value={type}
          onChange={(e) => onTypeChange?.(e.target.value)}
          disabled={disabled}
        >
          {PRIMARY_TYPES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.label}
            </option>
          ))}
        </select>
      </label>
      <label className="asset-switcher__field asset-switcher__field--symbol">
        <span className="asset-switcher__label">Asset</span>
        <select
          className="asset-switcher__select"
          value={symbol}
          onChange={(e) => onSymbolChange?.(e.target.value)}
          disabled={disabled}
        >
          {symbols.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id} — {s.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
