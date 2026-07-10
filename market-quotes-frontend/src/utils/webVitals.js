/** Web Vitals reporter (Prompt 14) — invia metriche a /api/analytics/vitals se configurato. */
import { API_BASE } from '../config/api';

function send(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    rating: metric.rating,
    navigationType: metric.navigationType,
    path: window.location.pathname,
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon(`${API_BASE}/api/analytics/vitals`, body);
    return;
  }
  fetch(`${API_BASE}/api/analytics/vitals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

export async function initWebVitals() {
  if (typeof window === 'undefined') return;
  try {
    const { onCLS, onINP, onLCP, onFCP, onTTFB } = await import('web-vitals');
    onCLS(send);
    onINP(send);
    onLCP(send);
    onFCP(send);
    onTTFB(send);
  } catch {
    /* web-vitals opzionale */
  }
}
