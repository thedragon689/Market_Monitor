/** Base URL API: vuoto in dev (proxy Vite → :4000), override con VITE_API_BASE. */
export const API_BASE = import.meta.env.VITE_API_BASE ?? '';
