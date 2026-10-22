import { useSyncExternalStore } from 'react';

/** Même seuil que les `@media (max-width: 767px)` des feuilles de style. */
export const MOBILE_QUERY = '(max-width: 767px)';

/** Téléphone (lecture ponctuelle, hors React : état initial, calculs de caméra). */
export function isMobileNow(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_QUERY).matches;
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

/**
 * Téléphone (≤ 767 px), suivi en direct : bascule si la fenêtre change de taille ou si l'écran pivote.
 * `useSyncExternalStore` lit `matchMedia` sans état intermédiaire (pas de rendu bureau puis mobile).
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, isMobileNow, () => false);
}
