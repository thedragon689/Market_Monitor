import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { API_BASE } from '../../config/api';
import { apiFetch } from '../../utils/apiFetch';
import { formatPrice } from '../../utils/format';
import { inferNativeCurrency } from '../../utils/nativeCurrency';

export default function PortfolioAssetChart({ symbol, assetType, currency }) {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const ccy = currency || inferNativeCurrency(assetType, null, symbol);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await apiFetch(
          `${API_BASE}/api/history?symbol=${encodeURIComponent(symbol)}&type=${assetType}&days=90`
        );
        if (!cancelled && data?.series) {
          setSeries(
            data.series.map((p) => ({
              date: p.date?.slice(5) ?? '',
              price: Number(p.price),
            }))
          );
        }
      } catch {
        if (!cancelled) setSeries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol, assetType]);

  if (loading) {
    return (
      <div className="skeleton skeleton--portfolio-chart portfolio-skeleton-chart--sm" aria-hidden />
    );
  }

  if (!series.length) return null;

  return (
    <section className="portfolio-chart portfolio-chart--asset app-card">
      <h3>Andamento {symbol} (90g)</h3>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="assetArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--teal)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--teal)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={48}
            domain={['auto', 'auto']}
          />
          <Tooltip
            formatter={(v) => [formatPrice(v, ccy), 'Prezzo']}
            contentStyle={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="var(--teal)"
            strokeWidth={2}
            fill="url(#assetArea)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}
