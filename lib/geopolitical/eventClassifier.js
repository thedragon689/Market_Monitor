/** Classificatore eventi geopolitici con peso d'impatto. */

export const EVENT_TYPES = {
  conflict: {
    id: 'conflict',
    label: 'Conflitto',
    impact: 'high',
    weight: 3.0,
    sign: -1,
    keywords: [
      'guerra', 'war', 'conflitto', 'conflict', 'missile', 'bombard', 'invasion', 'invasione',
      'attacco', 'attack', 'raid', 'offensive', 'offensiva', 'combattimento', 'fighting',
    ],
  },
  election: {
    id: 'election',
    label: 'Elezioni',
    impact: 'medium',
    weight: 1.5,
    sign: 0,
    keywords: ['elezion', 'election', 'referendum', 'voto', 'vote', 'ballot', 'coalition', 'coalizione'],
  },
  sanctions: {
    id: 'sanctions',
    label: 'Sanzioni',
    impact: 'high',
    weight: 2.2,
    sign: -1,
    keywords: ['sanzion', 'sanction', 'embargo', 'ban', 'vietato', 'blacklist', 'restrict'],
  },
  trade_deal: {
    id: 'trade_deal',
    label: 'Accordi commerciali',
    impact: 'positive',
    weight: 1.8,
    sign: 1,
    keywords: [
      'accordo commerciale', 'trade deal', 'free trade', 'libero scambio', 'partnership',
      'trattato', 'treaty', 'deal', 'accordo',
    ],
  },
  macro_data: {
    id: 'macro_data',
    label: 'Dati macroeconomici',
    impact: 'variable',
    weight: 1.2,
    sign: 0,
    keywords: [
      'pil', 'gdp', 'inflazione', 'inflation', 'occupazione', 'employment', 'jobs report',
      'tasso', 'rate', 'cpi', 'ppi', 'retail sales', 'industrial production',
    ],
  },
  natural_disaster: {
    id: 'natural_disaster',
    label: 'Disastri naturali',
    impact: 'high',
    weight: 2.0,
    sign: -1,
    keywords: [
      'terremoto', 'earthquake', 'alluvione', 'flood', 'uragano', 'hurricane', 'tsunami',
      'incendio', 'wildfire', 'siccità', 'drought',
    ],
  },
  central_bank: {
    id: 'central_bank',
    label: 'Banche centrali',
    impact: 'medium',
    weight: 1.8,
    sign: 0,
    keywords: [
      'fed', 'bce', 'ecb', 'boj', 'banca centrale', 'central bank', 'powell', 'lagarde',
      'tassi', 'rate decision', 'monetary policy', 'politica monetaria', 'qe', 'tapering',
    ],
  },
};

function keywordHit(text, keyword) {
  const k = keyword.toLowerCase();
  if (k.length <= 3) {
    const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return re.test(text);
  }
  return text.toLowerCase().includes(k);
}

export function classifyEvent(text) {
  const t = String(text || '').toLowerCase();
  const matches = [];

  for (const ev of Object.values(EVENT_TYPES)) {
    const hit = ev.keywords.filter((k) => keywordHit(t, k));
    if (hit.length) {
      matches.push({
        type: ev.id,
        label: ev.label,
        impact: ev.impact,
        weight: ev.weight,
        sign: ev.sign,
        keywords: hit,
        confidence: Math.min(1, hit.length * 0.35),
      });
    }
  }

  if (!matches.length) {
    return {
      primary: null,
      matches: [],
      eventWeight: 0,
      eventSign: 0,
    };
  }

  matches.sort((a, b) => b.weight * b.confidence - a.weight * a.confidence);
  const primary = matches[0];
  const eventWeight = matches.reduce((s, m) => s + m.weight * m.confidence, 0);
  const eventSign =
    matches.reduce((s, m) => s + m.sign * m.weight * m.confidence, 0) / (eventWeight || 1);

  return {
    primary,
    matches,
    eventWeight: Number(eventWeight.toFixed(3)),
    eventSign: Number(eventSign.toFixed(3)),
  };
}

export function classifyNewsItem(news) {
  const text = [news.title, news.description].filter(Boolean).join(' ');
  const event = classifyEvent(text);
  return { ...news, event };
}
