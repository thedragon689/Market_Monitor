/** Normalizza un numero in formato E.164 (+prefisso internazionale). */
export function normalizePhoneNumber(phoneNumber) {
  let num = String(phoneNumber || '').trim().replace(/[\s\-().]/g, '');
  if (!num) throw new Error('Numero di telefono richiesto');
  if (!num.startsWith('+')) num = `+${num}`;
  const digits = num.slice(1);
  if (!/^\d{8,15}$/.test(digits)) {
    throw new Error('Numero non valido: usa il prefisso internazionale (es. +393331234567)');
  }
  return num;
}
