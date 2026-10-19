import type { TerritoryProperties } from '../types';

/** Ce que la frise dit d'une région : statut le plus fréquent, années de 1re et dernière apparition. */
export interface RegionSpan {
  name: string;
  status: NonNullable<TerritoryProperties['status']>;
  years: [number, number];
  /** Étapes où elle apparaît (titres), dans l'ordre. */
  steps: string[];
}

/**
 * Parcourt les étapes et les entités de leur territoire (`entitiesOf(territoryId)`) et regroupe par nom.
 * Partagé par scripts/list-regions.ts (brief des rédacteurs) et le test de regions.json.
 */
export function regionSpans(
  steps: readonly { year: number; title: string; territory: string }[],
  entitiesOf: (territory: string) => readonly TerritoryProperties[],
): RegionSpan[] {
  const byName = new Map<string, RegionSpan & { counts: Record<string, number> }>();
  for (const step of [...steps].sort((a, b) => a.year - b.year)) {
    for (const p of entitiesOf(step.territory)) {
      const status = p.status ?? 'core';
      let r = byName.get(p.name);
      if (!r) byName.set(p.name, (r = { name: p.name, status, years: [step.year, step.year], steps: [], counts: {} }));
      r.years[1] = step.year;
      if (!r.steps.includes(step.title)) r.steps.push(step.title);
      r.counts[status] = (r.counts[status] ?? 0) + 1;
    }
  }
  return [...byName.values()].map(({ counts, ...r }) => ({
    ...r,
    status: Object.entries(counts).sort((a, b) => b[1] - a[1])[0]![0] as RegionSpan['status'],
  }));
}
