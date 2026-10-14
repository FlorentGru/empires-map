import type { Empire, EmpirePeriod } from '../types';

/**
 * Index de la période d'une année : la DERNIÈRE période dont `start ≤ year`
 * (les bornes se touchent : l'année de fin d'une période appartient à la suivante).
 * -1 si l'empire n'a pas de période ou si l'année précède la première.
 */
export function periodIndexAt(periods: EmpirePeriod[] | undefined, year: number): number {
  if (!periods) return -1;
  let found = -1;
  periods.forEach((p, i) => {
    if (p.start <= year) found = i;
  });
  return found;
}

/** Première étape (index) de chaque période, ou -1 si la période n'a aucune étape. */
export function firstStepOfPeriods(empire: Pick<Empire, 'periods' | 'steps'>): number[] {
  const firsts = (empire.periods ?? []).map(() => -1);
  empire.steps.forEach((s, i) => {
    const p = periodIndexAt(empire.periods, s.year);
    if (p >= 0 && firsts[p] === -1) firsts[p] = i;
  });
  return firsts;
}

export interface Chapter {
  n: number;
  periodId: string;
  name: string;
  summary: string;
  /** Première étape de sa période. */
  first: boolean;
}

/** Chapitre (période) d'une étape, ou null. */
export function chapterAt(empire: Pick<Empire, 'periods' | 'steps'>, index: number): Chapter | null {
  const step = empire.steps[index];
  if (!step) return null;
  const p = periodIndexAt(empire.periods, step.year);
  if (p < 0 || !empire.periods) return null;
  const per = empire.periods[p];
  const prev = empire.steps[index - 1];
  const first = !prev || periodIndexAt(empire.periods, prev.year) !== p;
  return { n: p + 1, periodId: per.id, name: per.name, summary: per.summary, first };
}
