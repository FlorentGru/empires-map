import type { Invention } from '../types-invention';

/** Inventions révolutionnaires par empire : data/empires/<id>/inventions.json (facultatif), chargées avec la timeline. */
const loaders = import.meta.glob<Invention[]>('../../data/empires/*/inventions.json', { import: 'default' });

/** Inventions des empires déjà chargés (rempli par loadInventions, appelé par loadEmpire). */
export const INVENTIONS: Record<string, Invention[]> = {};

export async function loadInventions(empireId: string): Promise<void> {
  const load = loaders[`../../data/empires/${empireId}/inventions.json`];
  const list = load ? await load() : [];
  INVENTIONS[empireId] = Array.isArray(list) ? [...list].sort((a, b) => a.year - b.year) : [];
}

/** Inventions d'un empire déjà apparues à l'année donnée. */
export function inventionsAt(empireId: string, year: number): Invention[] {
  return (INVENTIONS[empireId] ?? []).filter((i) => i.year <= year);
}

/** Inventions apparues entre deux années (prev exclu, year inclus) : « nouvelles » à cette étape. */
export function inventionsBetween(empireId: string, prev: number, year: number): Invention[] {
  return (INVENTIONS[empireId] ?? []).filter((i) => i.year > prev && i.year <= year);
}

/** Demande d'ouverture de la fiche d'une invention (frise, panneau, galerie). */
export const OPEN_INVENTION_EVENT = 'atlas:open-invention';

/** Ouverture demandée depuis la galerie : consommée dès que la carte de l'étape choisie est prête. */
let pending: string | null = null;
export function requestInventionOpen(id: string): void {
  pending = id;
}
export function takeInventionOpen(): string | null {
  const id = pending;
  pending = null;
  return id;
}
