import type { FeatureCollection } from 'geojson';
import type { ReligionTerritories, StepReligions } from '../lib/religions';

/** Données du calque « Religions » (public/data/religions/), chargées à la demande et gardées en cache. */
const cache = new Map<string, Promise<unknown>>();

function get<T>(file: string, fallback: T): Promise<T> {
  let p = cache.get(file) as Promise<T> | undefined;
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/religions/${file}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<T>;
      })
      .catch((err) => {
        console.warn(`[religions] ${file} indisponible, calque vide :`, err);
        cache.delete(file); // un échec réseau ne doit pas être mémorisé
        return fallback;
      });
    cache.set(file, p);
  }
  return p;
}

const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] };

export const loadReligionTerritories = () => get<ReligionTerritories>('territories.json', {});
export const loadReligionSnapshots = () => get<string[]>('snapshots.json', []);
export const loadReligionSnapshot = (name: string) => get<FeatureCollection>(`hb/${name}.geojson`, EMPTY_FC);
export const loadReligionCountries = () => get<FeatureCollection>('countries-2026.geojson', EMPTY_FC);

export async function loadStepReligions(empireId: string, stepId: string): Promise<StepReligions | undefined> {
  return (await loadReligionTerritories())[empireId]?.[stepId];
}
