import type { RegionInfo } from '../types-region';

/** Régions expliquées par empire : data/empires/<id>/regions.json (facultatif), chargées avec la timeline. */
const loaders = import.meta.glob<RegionInfo[]>('../../data/empires/*/regions.json', { import: 'default' });

const REGIONS: Record<string, RegionInfo[]> = {};

export async function loadRegions(empireId: string): Promise<void> {
  const load = loaders[`../../data/empires/${empireId}/regions.json`];
  const list = load ? await load() : [];
  REGIONS[empireId] = Array.isArray(list) ? list : [];
}

/** Explication d'une région (nom exact de l'entité de territoire), si elle a été rédigée. */
export function regionInfo(empireId: string, name: string): RegionInfo | undefined {
  return REGIONS[empireId]?.find((r) => r.name === name);
}
