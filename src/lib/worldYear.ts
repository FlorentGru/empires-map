// Vue « Le monde en l'an X » : logique pure (empires présents, étapes, échelle de la frise).
import { EMPIRE_INDEX, EMPIRES } from '../data/loadEmpire';
import { existsAt, lastStepAtOrBefore } from './contemporaries';
import type { Empire, TimelineStep } from '../types';

// Bornes de la frise : au moins -3000 → 1900, élargies automatiquement pour couvrir tout empire de l'Atlas.
export const MIN_YEAR = Math.min(-3000, ...EMPIRE_INDEX.map((e) => e.start));
export const MAX_YEAR = Math.max(1900, ...EMPIRE_INDEX.map((e) => e.end));

/** Année valide : entier dans [MIN_YEAR, MAX_YEAR], sans année 0 (-1 est suivi de 1). */
export function clampYear(year: number): number {
  const y = Math.round(Math.min(MAX_YEAR, Math.max(MIN_YEAR, Number.isFinite(year) ? year : 0)));
  return y === 0 ? 1 : y;
}

export interface PresentEmpire {
  empire: Empire;
  step: TimelineStep;
}

/** Empires existants à l'année donnée, avec leur dernière étape d'année ≤ year (ordre de EMPIRES). */
export function empiresAt(year: number, empires: readonly Empire[] = EMPIRES): PresentEmpire[] {
  const out: PresentEmpire[] = [];
  for (const empire of empires) {
    if (!existsAt(empire, year)) continue;
    const step = lastStepAtOrBefore(empire.steps, year);
    if (step) out.push({ empire, step });
  }
  return out;
}

export interface StepYear {
  year: number;
  empireId: string;
  stepId: string;
}

/** Toutes les étapes de tous les empires, triées par année. */
export function allStepYears(empires: readonly Empire[] = EMPIRES): StepYear[] {
  const list: StepYear[] = [];
  for (const e of empires) for (const s of e.steps) list.push({ year: s.year, empireId: e.id, stepId: s.id });
  return list.sort((a, b) => a.year - b.year);
}

/** Année de l'étape suivante (dir = 1) ou précédente (dir = -1), tous empires confondus ; year si aucune. */
export function nextStepYear(year: number, dir: 1 | -1, steps: readonly StepYear[] = allStepYears()): number {
  if (dir === 1) {
    for (const s of steps) if (s.year > year) return clampYear(s.year);
    return year;
  }
  for (let i = steps.length - 1; i >= 0; i--) if (steps[i]!.year < year) return clampYear(steps[i]!.year);
  return year;
}

/**
 * Échelle de la frise : linéaire par morceaux, plus d'espace pour les périodes riches.
 * Points (année, position 0..1) : l'Antiquité lointaine est comprimée (20 % pour 2 500 ans avant -500),
 * puis -500..0 gagne 25 %, 0..1000 30 %, 1000..MAX_YEAR 25 %.
 */
export const SCALE_POINTS: readonly (readonly [number, number])[] = [
  [MIN_YEAR, 0],
  [-500, 0.2],
  [0, 0.45],
  [1000, 0.75],
  [MAX_YEAR, 1],
];

/** Année → position 0..1 sur la piste (monotone, bornée). */
export function yearToPos(year: number): number {
  const y = Math.min(MAX_YEAR, Math.max(MIN_YEAR, year));
  for (let i = 1; i < SCALE_POINTS.length; i++) {
    const [y1, p1] = SCALE_POINTS[i]!;
    if (y <= y1) {
      const [y0, p0] = SCALE_POINTS[i - 1]!;
      return p0 + ((y - y0) / (y1 - y0)) * (p1 - p0);
    }
  }
  return 1;
}

/** Position 0..1 → année (réciproque de yearToPos, non arrondie). */
export function posToYear(pos: number): number {
  const p = Math.min(1, Math.max(0, pos));
  for (let i = 1; i < SCALE_POINTS.length; i++) {
    const [y1, p1] = SCALE_POINTS[i]!;
    if (p <= p1) {
      const [y0, p0] = SCALE_POINTS[i - 1]!;
      return y0 + ((p - p0) / (p1 - p0)) * (y1 - y0);
    }
  }
  return MAX_YEAR;
}
