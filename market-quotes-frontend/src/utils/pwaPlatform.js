/** Rileva iOS (Safari / Chrome iOS) — niente evento beforeinstallprompt. */
export function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Android (Chrome / WebView / browser in-app). */
export function isAndroid() {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

/** Browser in-app (WhatsApp, Instagram, Facebook, ecc.) — install PWA limitata. */
export function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /(FBAN|FBAV|Instagram|Line\/|Twitter|WhatsApp|wv\)|MicroMessenger)/i.test(ua);
}

/** App già aperta da icona Home (PWA installata). */
export function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/** Chrome/Edge Android con installazione nativa. */
export function supportsNativeInstall() {
  return typeof window !== 'undefined' && !isIos();
}
