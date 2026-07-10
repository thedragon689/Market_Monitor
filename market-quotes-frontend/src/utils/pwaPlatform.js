/** Rileva iOS (Safari / Chrome iOS) — niente evento beforeinstallprompt. */
export function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
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
