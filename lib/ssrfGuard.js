import dns from 'dns/promises';
import net from 'net';

const BLOCKED_HOSTS = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  'host.docker.internal',
]);

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const n = ip.toLowerCase();
    return n === '::1' || n.startsWith('fc') || n.startsWith('fd') || n.startsWith('fe80');
  }
  return false;
}

/** Blocca URL verso reti private / metadata (SSRF). */
export async function assertSafeOutboundUrl(urlString) {
  let url;
  try {
    url = new URL(String(urlString).trim());
  } catch {
    throw new Error('URL webhook non valido');
  }

  if (url.protocol !== 'https:') {
    throw new Error('URL webhook deve usare HTTPS');
  }

  if (url.username || url.password) {
    throw new Error('URL webhook non può contenere credenziali');
  }

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) {
    throw new Error('Host webhook non consentito');
  }

  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('IP privato non consentito');
    return url.toString();
  }

  const records = await dns.lookup(host, { all: true });
  if (!records.length) throw new Error('Host webhook non risolvibile');

  for (const { address } of records) {
    if (isPrivateIp(address)) {
      throw new Error('Host webhook risolve a indirizzo privato');
    }
  }

  return url.toString();
}
