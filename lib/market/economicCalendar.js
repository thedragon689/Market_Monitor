import axios from 'axios';

const FF_JSON = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

const IMPACT_MAP = { High: 3, Medium: 2, Low: 1, Holiday: 0 };

/** Calendario economico macro — Forex Factory JSON pubblico. */
export async function fetchEconomicCalendar({ limit = 40 } = {}) {
  try {
    const { data } = await axios.get(FF_JSON, {
      timeout: 12_000,
      headers: { Accept: 'application/json' },
    });
    const rows = Array.isArray(data) ? data : [];
    const events = rows
      .map((e) => ({
        date: e.date,
        time: e.time || null,
        country: e.country || e.currency || '',
        title: e.title || e.event || 'Evento macro',
        impact: e.impact || 'Medium',
        impactScore: IMPACT_MAP[e.impact] ?? 2,
        forecast: e.forecast || null,
        previous: e.previous || null,
        actual: e.actual || null,
      }))
      .sort((a, b) => {
        const da = new Date(`${a.date} ${a.time || '00:00'}`).getTime();
        const db = new Date(`${b.date} ${b.time || '00:00'}`).getTime();
        return da - db;
      })
      .slice(0, limit);

    return { events, source: 'forex-factory', count: events.length };
  } catch (err) {
    return {
      events: [],
      source: 'fallback',
      error: err.message,
      count: 0,
    };
  }
}
