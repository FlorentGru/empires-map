// Nom du lieu de départ d'une armée, affiché au début de sa marche (« Départ : Samarcande »).
import type { ArmyMove, City, TimelineStep } from '../types';
import { haversineKm } from './march';
import { nameAt } from '../map/cityLayer';

/** Rayon (km) dans lequel une ville de cities.json peut nommer le point de départ. */
const NEAR_KM = 60;

/** « Austerlitz : le soleil d'Austerlitz » → « Austerlitz » (nom court du champ de bataille). */
function shortTitle(title: string): string {
  return title.split(/\s[:–—-]\s|\s*:\s/)[0]!.trim();
}

/**
 * Lieu de départ : `from` des données ; sinon le champ de bataille précédent de la même armée
 * (même id, dernier point de son trajet) ; sinon la ville connue la plus proche (≤ 60 km) ; sinon null.
 */
export function originName(army: ArmyMove, step: TimelineStep, steps: TimelineStep[], cities: City[]): string | null {
  if (army.from?.trim()) return army.from.trim();
  const start = army.path[0];
  if (!start) return null;
  if (army.id) {
    const before = steps.filter((s) => s.year < step.year || (s.year === step.year && steps.indexOf(s) < steps.indexOf(step)));
    for (let i = before.length - 1; i >= 0; i--) {
      const prev = before[i]!;
      const same = prev.armies?.find((a) => a.id === army.id);
      const end = same?.path[same.path.length - 1];
      if (end && haversineKm(end, start) < 30) return shortTitle(prev.title);
    }
  }
  let best: City | null = null;
  let bestKm = NEAR_KM;
  for (const c of cities) {
    if (c.founded > step.year || (c.destroyed !== undefined && c.destroyed < step.year)) continue;
    const km = haversineKm(c.coords, start);
    if (km < bestKm) {
      bestKm = km;
      best = c;
    }
  }
  return best ? nameAt(best, step.year) : null;
}
