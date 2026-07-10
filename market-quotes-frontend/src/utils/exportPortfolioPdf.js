import { fmtMoney, fmtPercent } from './portfolioFormat';
import { escapeHtml, sanitizeSymbol } from './htmlEscape';

/** Export PDF portfolio via finestra di stampa (nessuna dipendenza). */
export function exportPortfolioPdf({ dashboard, history, range = '1M' }) {
  const { summary, positions = [] } = dashboard ?? {};
  const ccy = escapeHtml(summary?.baseCurrency || 'EUR');
  const date = new Date().toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const rows = positions
    .map(
      (p) => `
      <tr>
        <td>${escapeHtml(sanitizeSymbol(p.symbol))}</td>
        <td>${escapeHtml(p.assetType)}</td>
        <td style="text-align:right">${escapeHtml(p.quantity)}</td>
        <td style="text-align:right">${escapeHtml(fmtMoney(p.currentValue, summary?.baseCurrency || 'EUR'))}</td>
        <td style="text-align:right">${escapeHtml(fmtMoney(p.pl, summary?.baseCurrency || 'EUR'))}</td>
        <td style="text-align:right">${p.plPercent != null ? escapeHtml(fmtPercent(p.plPercent)) : '—'}</td>
      </tr>`
    )
    .join('');

  const histRows = (history ?? [])
    .slice(-12)
    .map(
      (h) => `
      <tr>
        <td>${escapeHtml(new Date(h.date).toLocaleDateString('it-IT'))}</td>
        <td style="text-align:right">${escapeHtml(fmtMoney(h.totalValue, summary?.baseCurrency || 'EUR'))}</td>
        <td style="text-align:right">${h.totalPl != null ? escapeHtml(fmtMoney(h.totalPl, summary?.baseCurrency || 'EUR')) : '—'}</td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>Report Portfolio — ${escapeHtml(date)}</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; color: #111; padding: 32px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .meta { color: #555; margin-bottom: 24px; }
    .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
    .kpi { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
    .kpi span { display: block; font-size: 12px; color: #666; }
    .kpi strong { font-size: 18px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th, td { border-bottom: 1px solid #eee; padding: 8px 6px; text-align: left; }
    th { font-size: 11px; text-transform: uppercase; color: #666; }
    h2 { font-size: 16px; margin-top: 28px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Market Monitor — Report Portfolio</h1>
  <p class="meta">Generato il ${escapeHtml(date)} · Range storico ${escapeHtml(range)}</p>
  <div class="kpis">
    <div class="kpi"><span>Valore totale</span><strong>${escapeHtml(fmtMoney(summary?.totalValue, summary?.baseCurrency || 'EUR'))}</strong></div>
    <div class="kpi"><span>P/L totale</span><strong>${escapeHtml(fmtMoney(summary?.totalPl, summary?.baseCurrency || 'EUR'))}</strong></div>
    <div class="kpi"><span>P/L %</span><strong>${summary?.totalPlPercent != null ? escapeHtml(fmtPercent(summary.totalPlPercent)) : '—'}</strong></div>
  </div>
  <h2>Posizioni</h2>
  <table>
    <thead><tr><th>Simbolo</th><th>Tipo</th><th>Qty</th><th>Valore</th><th>P/L</th><th>P/L %</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6">Nessuna posizione</td></tr>'}</tbody>
  </table>
  <h2>Storico valore (${escapeHtml(range)})</h2>
  <table>
    <thead><tr><th>Data</th><th>Valore</th><th>P/L</th></tr></thead>
    <tbody>${histRows || '<tr><td colspan="3">Storico non disponibile</td></tr>'}</tbody>
  </table>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
