import { buildUrlState } from './urlState';

export function buildShareUrl(state) {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}${buildUrlState(state)}`;
}

export async function copyShareUrl(state) {
  const url = buildShareUrl(state);
  if (!url) return false;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return true;
  }
  const ta = document.createElement('textarea');
  ta.value = url;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  return ok;
}
