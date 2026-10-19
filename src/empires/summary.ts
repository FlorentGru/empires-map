// Page « Tous les empires » : résumé d'un empire construit à partir de ses données (logique pure, testée).
import { apogeeStepId, formatArea } from '../lib/apogee';
import { battleCount, formatEstimate } from '../lib/compare';
import { formatYear } from '../lib/years';
import type { Empire, Person, TimelineStep } from '../types';
import type { Invention } from '../types-invention';
import type { EmpireProfile, Estimate } from '../types-profile';

export interface KeyMoment {
  step: TimelineStep;
  /** Pourquoi ce moment est retenu : début, apogée, tournant (gain ou perte de territoire), fin. */
  why: string;
}

export interface EmpireSummary {
  /** « 509 av. J.-C. – 1453 · 1962 ans ». */
  span: string;
  apogee?: { step: TimelineStep; area?: string };
  /** Population la plus élevée connue (profil), avec sa fourchette. */
  population?: string;
  battles: number;
  periods: { name: string; color: string; span: string }[];
  moments: KeyMoment[];
  people: Person[];
  inventions: Invention[];
  /** Héritage : celui de la dernière période du profil. */
  legacy?: string;
}

/** Durée lisible, sans année 0 entre av. J.-C. et apr. J.-C. */
export function duration(start: number, end: number): number {
  return end - start - (start < 0 && end > 0 ? 1 : 0);
}

function biggestPopulation(profile?: EmpireProfile): Estimate | undefined {
  return profile?.periods.map((p) => p.population?.total).reduce<Estimate | undefined>((a, b) => (b && (!a || b.value > a.value) ? b : a), undefined);
}

/**
 * Moments clés : la première étape, l'apogée, les deux plus grands tournants territoriaux (variation de surface
 * d'une étape à la suivante, d'après stats.json) et la dernière étape, dans l'ordre chronologique.
 */
export function keyMoments(e: Empire): KeyMoment[] {
  const steps = e.steps;
  if (!steps.length) return [];
  const areas = e.stats?.areas ?? {};
  const apogee = apogeeStepId(e);
  const picked = new Map<string, string>([[steps[0]!.id, 'Début']]);
  if (apogee) picked.set(apogee, 'Apogée');
  const turns = steps
    .slice(1)
    .map((s, i) => ({ s, d: (areas[s.id] ?? 0) - (areas[steps[i]!.id] ?? 0) }))
    .filter((x) => x.d !== 0 && !picked.has(x.s.id) && x.s.id !== steps.at(-1)!.id)
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    .slice(0, 2);
  for (const t of turns) picked.set(t.s.id, t.d > 0 ? 'Grande conquête' : 'Grand recul');
  if (!picked.has(steps.at(-1)!.id)) picked.set(steps.at(-1)!.id, 'Fin');
  return steps.filter((s) => picked.has(s.id)).map((step) => ({ step, why: picked.get(step.id)! }));
}

export function summarize(e: Empire, profile?: EmpireProfile, people: Person[] = [], inventions: Invention[] = []): EmpireSummary {
  const apogeeId = apogeeStepId(e);
  const apogeeStep = e.steps.find((s) => s.id === apogeeId);
  const area = apogeeId ? e.stats?.areas[apogeeId] : undefined;
  const pop = biggestPopulation(profile);
  return {
    span: `${formatYear(e.start)} – ${formatYear(e.end)} · ${duration(e.start, e.end)} ans`,
    apogee: apogeeStep ? { step: apogeeStep, area: area ? formatArea(area) : undefined } : undefined,
    population: pop ? formatEstimate(pop) : undefined,
    battles: battleCount(e),
    periods: (e.periods ?? []).map((p) => ({ name: p.name, color: p.color, span: `${formatYear(p.start)} – ${formatYear(p.end)}` })),
    moments: keyMoments(e),
    people: people.slice(0, 6),
    inventions: [...inventions].sort((a, b) => a.year - b.year).slice(0, 4),
    legacy: profile?.periods.at(-1)?.legacy,
  };
}
