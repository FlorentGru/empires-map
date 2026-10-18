// Adresse de la vue « Le monde en l'an X » (?world=1&year=), séparée de la vue pour rester dans le JS initial.
import { clampYear } from '../lib/worldYear';

export const DEFAULT_WORLD_YEAR = 117;

/** Année demandée par l'URL (?world=1&year=117), sinon la valeur par défaut. */
export function readWorldYear(): number {
  const y = Number(new URLSearchParams(window.location.search).get('year'));
  return clampYear(Number.isFinite(y) && y !== 0 ? y : DEFAULT_WORLD_YEAR);
}

export function writeWorldUrl(year: number): void {
  const url = new URL(window.location.href);
  url.searchParams.set('world', '1');
  url.searchParams.set('year', String(year));
  url.searchParams.delete('empire');
  url.searchParams.delete('step');
  if (url.href !== window.location.href) window.history.replaceState(null, '', url);
}

export function clearWorldUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('world');
  url.searchParams.delete('year');
  if (url.href !== window.location.href) window.history.replaceState(null, '', url);
}
