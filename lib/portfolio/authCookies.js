const REFRESH_COOKIE = 'mm_refresh';

function isDeployed() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.NETLIFY === 'true' ||
    Boolean(process.env.CONTEXT) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  );
}

function parseDurationSec(str) {
  const m = String(str || '7d').match(/^(\d+)([smhd])$/);
  if (!m) return 7 * 24 * 3600;
  const n = Number(m[1]);
  const u = { s: 1, m: 60, h: 3600, d: 86400 }[m[2]];
  return n * u;
}

function serializeCookie(name, value, { maxAge, path, httpOnly, secure, sameSite }) {
  let out = `${name}=${encodeURIComponent(value)}`;
  if (maxAge != null) out += `; Max-Age=${maxAge}`;
  out += `; Path=${path}`;
  if (httpOnly) out += '; HttpOnly';
  if (secure) out += '; Secure';
  if (sameSite) out += `; SameSite=${sameSite}`;
  return out;
}

export function readRefreshCookie(req) {
  const header = req.headers?.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    if (key !== REFRESH_COOKIE) continue;
    return decodeURIComponent(trimmed.slice(eq + 1));
  }
  return null;
}

export function attachRefreshCookie(res, refreshToken) {
  if (!refreshToken) return;
  const cookie = serializeCookie(REFRESH_COOKIE, refreshToken, {
    maxAge: parseDurationSec(process.env.JWT_REFRESH_EXPIRES),
    path: '/api/auth',
    httpOnly: true,
    secure: isDeployed(),
    sameSite: 'Lax',
  });
  res.append('Set-Cookie', cookie);
}

export function clearRefreshCookie(res) {
  const cookie = serializeCookie(REFRESH_COOKIE, '', {
    maxAge: 0,
    path: '/api/auth',
    httpOnly: true,
    secure: isDeployed(),
    sameSite: 'Lax',
  });
  res.append('Set-Cookie', cookie);
}

/** Risposta token: refresh in cookie httpOnly; body senza refresh in produzione. */
export function sendTokenResponse(res, tokens) {
  attachRefreshCookie(res, tokens.refreshToken);
  if (isDeployed()) {
    const { refreshToken, ...rest } = tokens;
    return rest;
  }
  return tokens;
}
