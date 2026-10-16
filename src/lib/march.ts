// Durées des marches d'armées : proportionnelles à la distance, pour voir une campagne traverser la carte.
import type { ArmyMove, TimelineStep } from '../types';

/** Mêlée puis issue (déroute, victoire), à vitesse 1 (ms). */
export const CLASH_MS = 2500;
export const OUTCOME_MS = 1500;
/** Temps laissé pour regarder la carte après la bataille. */
const LINGER_MS = 2000;
const MIN_MARCH_MS = 4000;
const MAX_MARCH_MS = 9000;
/** Au-delà, la caméra cadre d'abord toute la marche avant de rejoindre le champ de bataille. */
export const LONG_MARCH_KM = 800;

export function haversineKm(a: [number, number], b: [number, number]): number {
  const r = Math.PI / 180;
  const dLat = (b[1] - a[1]) * r;
  const dLon = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathKm(path: [number, number][]): number {
  let km = 0;
  for (let i = 1; i < path.length; i++) km += haversineKm(path[i - 1]!, path[i]!);
  return km;
}

const marching = (armies: ArmyMove[] | undefined) => (armies ?? []).filter((a) => a.path.length >= 2);

/** Plus longue marche de l'étape (km). */
export function longestMarchKm(armies: ArmyMove[] | undefined): number {
  return Math.max(0, ...marching(armies).map((a) => pathKm(a.path)));
}

/** Durée de la marche (ms à vitesse 1) : 3,5 s + 1,1 s par 1 000 km, entre 4 et 9 s. */
export function marchMs(armies: ArmyMove[] | undefined): number {
  const km = longestMarchKm(armies);
  return Math.round(Math.min(MAX_MARCH_MS, Math.max(MIN_MARCH_MS, 3500 + km * 1.1)));
}

/** Durée d'une étape avec armées (marche, mêlée, issue, pause), ou null s'il n'y a pas d'armée. */
export function battleStepMs(step: TimelineStep | undefined): number | null {
  if (!step || marching(step.armies).length === 0) return null;
  return marchMs(step.armies) + CLASH_MS + OUTCOME_MS + LINGER_MS;
}
