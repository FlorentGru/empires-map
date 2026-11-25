// Fonctions pures du calque « Religions » (issue #81) : instantané d'une année, religions présentes, religions des entités.
import type { Religion } from '../types-religion';
import { RELIGION_IDS, RELIGIONS } from '../types-religion';

export interface EntityReligion {
  religion: Religion;
  minorities?: Religion[];
  note?: string;
}
/** public/data/religions/territories.json : empire → étape → instantané de fond et religion de chaque entité. */
export type StepReligions = { snapshot: string; entities: Record<string, EntityReligion> };
export type ReligionTerritories = Record<string, Record<string, StepReligions>>;

export interface ReligionProps {
  name: string;
  religion?: Religion;
  minorities?: Religion[];
}

/** Année d'un nom d'instantané (`world_bc500` → -500, `world_1279` → 1279). */
export function snapshotYear(name: string): number {
  const m = /^world_(bc)?(\d+)$/.exec(name);
  return m ? (m[1] ? -Number(m[2]) : Number(m[2])) : NaN;
}

/** Même règle que `pickSnapshot` de scripts/snapshots.ts : le plus proche, l'antérieur préféré s'il n'est pas beaucoup plus loin. */
export function pickSnapshot(year: number, names: readonly string[]): string | null {
  const sorted = names.filter((n) => !Number.isNaN(snapshotYear(n))).sort((a, b) => snapshotYear(a) - snapshotYear(b));
  let before: string | undefined;
  let after: string | undefined;
  for (const s of sorted) {
    if (snapshotYear(s) <= year) before = s;
    else if (!after) after = s;
  }
  if (!before) return after ?? null;
  if (!after) return before;
  return year - snapshotYear(before) <= (snapshotYear(after) - year) * 1.25 ? before : after;
}

/** Religions principales présentes dans des listes d'entités, dans l'ordre de RELIGIONS. */
export function presentReligions(lists: readonly (readonly { properties?: { religion?: unknown } | null }[])[]): Religion[] {
  const seen = new Set<unknown>();
  for (const l of lists) for (const f of l) seen.add(f.properties?.religion);
  return RELIGION_IDS.filter((r) => seen.has(r));
}

/** Ajoute la propriété `religion` (et `minorities`) aux entités d'un territoire ; sans donnée, l'entité n'est pas colorée. */
export function withReligions<G>(
  features: readonly { geometry: G; properties?: { name?: unknown } | null }[],
  entities: Record<string, EntityReligion> | undefined,
): { type: 'Feature'; geometry: G; properties: ReligionProps }[] {
  return features.map((f) => {
    const name = String(f.properties?.name ?? '');
    const e = entities?.[name];
    return {
      type: 'Feature',
      geometry: f.geometry,
      properties: { name, ...(e ? { religion: e.religion, ...(e.minorities?.length ? { minorities: e.minorities } : {}) } : {}) },
    };
  });
}

/** Religions actuellement colorées sur la carte (publiées par le calque, lues par les légendes). */
export const PRESENT_EVENT = 'atlas:religions-present';
let present: Religion[] = [];
export const getPresentReligions = () => present;
export function setPresentReligions(list: Religion[]): void {
  if (list.length === present.length && list.every((r, i) => r === present[i])) return;
  present = list;
  window.dispatchEvent(new Event(PRESENT_EVENT));
}

/** Ligne de la fiche de région : « Religion : Islam sunnite · minorités : … » puis la note éventuelle. */
export function religionLine(e: EntityReligion): string {
  const minorities = e.minorities?.length ? ` · minorités : ${e.minorities.map((m) => RELIGIONS[m].label).join(', ')}` : '';
  return `Religion : ${RELIGIONS[e.religion].label}${minorities}.${e.note ? ` ${e.note}` : ''}`;
}
