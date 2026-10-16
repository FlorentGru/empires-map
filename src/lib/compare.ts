// Comparaison de deux empires : période de profil, chiffres dérivés, écarts (fonctions pures, testées).
import type { Empire } from '../types';
import type { EmpireProfile, Estimate, ProfilePeriod } from '../types-profile';
import { apogeeStepId } from './apogee';

/** Période du profil qui contient l'année (la dernière commencée), sinon la plus proche. */
export function periodAt(profile: EmpireProfile, year: number): ProfilePeriod | undefined {
  const ps = profile.periods;
  return [...ps].reverse().find((p) => p.start <= year && year <= p.end) ?? [...ps].sort((a, b) => Math.abs(a.start - year) - Math.abs(b.start - year))[0];
}

/** Période de l'apogée (étape de plus grande surface), ou la première période. */
export function apogeePeriod(empire: Empire, profile: EmpireProfile): ProfilePeriod | undefined {
  const id = apogeeStepId(empire);
  const step = empire.steps.find((s) => s.id === id);
  return step ? periodAt(profile, step.year) : profile.periods[0];
}

/** Plus grande surface (km²) atteinte pendant une période, d'après stats.json. */
export function maxAreaIn(empire: Empire, period: Pick<ProfilePeriod, 'start' | 'end'>): number | undefined {
  const areas = empire.stats?.areas;
  if (!areas) return undefined;
  const vals = empire.steps.filter((s) => s.year >= period.start && s.year <= period.end).map((s) => areas[s.id] ?? 0);
  const max = Math.max(0, ...vals);
  return max > 0 ? max : undefined;
}

/** Habitants par km². */
export function density(population?: Estimate, areaKm2?: number): number | undefined {
  return population && areaKm2 ? population.value / areaKm2 : undefined;
}

/** Part de la population sous les armes (%). */
export function mobilisation(army?: Estimate, population?: Estimate): number | undefined {
  return army && population ? (army.value / population.value) * 100 : undefined;
}

/** Écart lisible entre deux valeurs : « ×3,2 » quand l'une dépasse nettement l'autre (≥ 1,5), sinon null. */
export function factor(a?: number, b?: number): { ratio: string; bigger: 'a' | 'b' } | null {
  if (!a || !b) return null;
  const r = a >= b ? a / b : b / a;
  if (r < 1.5) return null;
  return { ratio: `×${r.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}`, bigger: a >= b ? 'a' : 'b' };
}

/** Nombre d'étapes de bataille dans la frise (étapes avec fiche bataille ou de type bataille). */
export function battleCount(empire: Empire): number {
  return empire.steps.filter((s) => s.type === 'bataille' || !!s.battle).length;
}

/** Nombre lisible : 60 M, 830 000, 2,5 M. */
export function formatNumber(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`;
  if (n >= 10_000) return (Math.round(n / 1000) * 1000).toLocaleString('fr-FR');
  return n.toLocaleString('fr-FR', { maximumFractionDigits: n < 10 ? 1 : 0 });
}

/** « 60 M (50 – 70 M) » ou « 60 M ». */
export function formatEstimate(e: Estimate, unit = ''): string {
  const u = unit ? ` ${unit}` : '';
  const range = e.low !== undefined && e.high !== undefined ? ` (${formatNumber(e.low)} – ${formatNumber(e.high)})` : '';
  return `${formatNumber(e.value)}${u}${range}`;
}
