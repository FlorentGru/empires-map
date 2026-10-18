// Apogée d'un empire : l'étape où sa surface est la plus grande,
// sauf si la timeline désigne explicitement une autre étape (empire.apogee).
import type { Empire } from '../types';

/** Surface (km²) par id d'étape ; une étape absente compte pour 0. */
export type AreaByStep = Record<string, number>;

/** Id de l'étape de plus grande surface (la première en cas d'égalité), ou null si rien n'est mesuré. */
export function largestStep(stepIds: string[], areas: AreaByStep): string | null {
  let best: string | null = null;
  let max = 0;
  for (const id of stepIds) {
    const a = areas[id] ?? 0;
    if (a > max) {
      max = a;
      best = id;
    }
  }
  return best;
}

/** Étape d'apogée affichée : la surcharge de la timeline si elle existe, sinon la plus grande surface. */
export function apogeeStepId(empire: Pick<Empire, 'steps' | 'apogee' | 'stats'>): string | null {
  const ids = empire.steps.map((s) => s.id);
  const forced = empire.apogee?.stepId;
  if (forced && ids.includes(forced)) return forced;
  return empire.stats ? largestStep(ids, empire.stats.areas) : null;
}

/** Surfaces normalisées sur [0, 1] par rapport au maximum (courbe de puissance de la frise). */
export function normalizedAreas(stepIds: string[], areas: AreaByStep): number[] {
  const values = stepIds.map((id) => areas[id] ?? 0);
  const max = Math.max(0, ...values);
  return values.map((v) => (max > 0 ? v / max : 0));
}

/** « ≈ 5,0 M km² » ou « ≈ 850 000 km² ». */
export function formatArea(km2: number): string {
  if (km2 >= 1e6) return `≈ ${(km2 / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} M km²`;
  const rounded = Math.round(km2 / 10_000) * 10_000;
  return `≈ ${rounded.toLocaleString('fr-FR')} km²`;
}
