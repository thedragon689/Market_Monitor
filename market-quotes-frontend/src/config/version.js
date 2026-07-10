/** Versione semantica mostrata in Info. */
export const APP_VERSION = '2.0.0';

/** ID cache PWA — iniettato a build-time da vite (commit Netlify). */
export const PWA_CACHE_VERSION = import.meta.env.VITE_PWA_CACHE_ID || 'dev';
