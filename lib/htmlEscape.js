/** Escape HTML entities for user-controlled strings in templates. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Validate portfolio/market symbol — alphanumeric, ^, =, ., - */
export function sanitizeSymbol(symbol) {
  const s = String(symbol ?? '').trim().slice(0, 32);
  if (!/^[A-Za-z0-9.^=\-]{1,32}$/.test(s)) {
    return s.replace(/[^A-Za-z0-9.^=\-]/g, '').slice(0, 32) || 'N/A';
  }
  return s;
}
