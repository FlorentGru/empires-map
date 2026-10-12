import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { DiffKind, MorphProperties, Empire, TerritoryProperties, TimelineStep } from '../types';

export type TerritoryCollection = FeatureCollection<Polygon | MultiPolygon, TerritoryProperties>;

/* ---------- Registre des empires ----------
 * Ajouter un empire = ajouter un dossier data/empires/<id>/timeline.json.
 * Les dossiers préfixés « _ » (fixtures de développement) ne sont utilisés
 * que si aucun vrai empire n'est disponible.
 */
const modules = import.meta.glob<Empire>('../../data/empires/*/timeline.json', {
  eager: true,
  import: 'default',
});

function byStartYear(a: Empire, b: Empire) {
  return a.start - b.start;
}

function sanitize(empire: Empire): Empire {
  const steps = [...(empire.steps ?? [])].sort((a, b) => a.year - b.year);
  return { ...empire, steps };
}

const all = Object.values(modules).filter((e): e is Empire => !!e && typeof e.id === 'string').map(sanitize);
const real = all.filter((e) => !e.id.startsWith('_') && e.steps.length > 0);

export const EMPIRES: Empire[] = (real.length > 0 ? real : all.filter((e) => e.steps.length > 0)).sort(byStartYear);

export function getEmpire(id: string | null | undefined): Empire | undefined {
  return EMPIRES.find((e) => e.id === id) ?? EMPIRES.find((e) => e.id === 'rome') ?? EMPIRES[0];
}

/* ---------- Territoires (fetch + cache) ---------- */

export type DiffCollection = FeatureCollection<Polygon | MultiPolygon, { kind: DiffKind }>;

const EMPTY: TerritoryCollection = { type: 'FeatureCollection', features: [] };
const cache = new Map<string, Promise<TerritoryCollection>>();

export function territoryUrl(empireId: string, territory: string): string {
  return `${import.meta.env.BASE_URL}data/empires/${encodeURIComponent(empireId)}/territories/${encodeURIComponent(territory)}.geojson`;
}

async function fetchTerritory(url: string): Promise<TerritoryCollection> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // Le serveur de dev renvoie index.html pour un fichier absent : json() échoue alors.
  const data = (await res.json()) as TerritoryCollection;
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('GeoJSON invalide');
  return data;
}

export function loadTerritory(empireId: string, territory: string): Promise<TerritoryCollection> {
  const url = territoryUrl(empireId, territory);
  let p = cache.get(url);
  if (!p) {
    p = fetchTerritory(url).catch((err: unknown) => {
      console.warn(`[territoire] ${url} indisponible :`, err);
      cache.delete(url); // permettra une nouvelle tentative plus tard
      return EMPTY;
    });
    cache.set(url, p);
  }
  return p;
}

/** Précharge le territoire de l'étape suivante (et de la précédente) pour des transitions fluides. */
export function preloadAround(empire: Empire, index: number): void {
  for (const i of [index + 1, index - 1]) {
    const step: TimelineStep | undefined = empire.steps[i];
    if (!step) continue;
    void loadTerritory(empire.id, step.territory);
    if (i === index + 1) {
      void loadDiff(empire.id, step.id);
      void loadMorph(empire.id, step.id);
    }
  }
}

/* ---------- Diffs précalculés (étape n-1 → n) ---------- */

const EMPTY_DIFF: DiffCollection = { type: 'FeatureCollection', features: [] };
const diffCache = new Map<string, Promise<DiffCollection>>();

export function diffUrl(empireId: string, stepId: string): string {
  return `${import.meta.env.BASE_URL}data/empires/${encodeURIComponent(empireId)}/diffs/${encodeURIComponent(stepId)}.geojson`;
}

/** Diff avec l'étape précédente. Fichier absent ou invalide : aucune diff (jamais d'erreur). */
export function loadDiff(empireId: string, stepId: string): Promise<DiffCollection> {
  const url = diffUrl(empireId, stepId);
  let p = diffCache.get(url);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return EMPTY_DIFF;
        const data = (await res.json()) as DiffCollection;
        if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) return EMPTY_DIFF;
        const features = data.features.filter(
          (f) => f?.geometry && (f.properties?.kind === 'gained' || f.properties?.kind === 'lost'),
        );
        return { type: 'FeatureCollection', features } satisfies DiffCollection;
      } catch {
        return EMPTY_DIFF;
      }
    })();
    diffCache.set(url, p);
  }
  return p;
}

/* ---------- Morph (frontière qui glisse, étape n-1 → n) ---------- */

export type MorphCollection = FeatureCollection<Polygon | MultiPolygon, MorphProperties>;

const morphCache = new Map<string, Promise<MorphCollection | null>>();

export function morphUrl(empireId: string, stepId: string): string {
  return `${import.meta.env.BASE_URL}data/empires/${encodeURIComponent(empireId)}/morph/${encodeURIComponent(stepId)}.geojson`;
}

/** Morph depuis l'étape précédente ; null si le fichier est absent ou invalide (repli sur le fondu). */
export function loadMorph(empireId: string, stepId: string): Promise<MorphCollection | null> {
  const url = morphUrl(empireId, stepId);
  let p = morphCache.get(url);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = (await res.json()) as MorphCollection;
        if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) return null;
        const features = data.features.filter(
          (f) => f?.geometry && (f.properties?.kind === 'stable' || f.properties?.kind === 'gained' || f.properties?.kind === 'lost'),
        );
        return features.length > 0 ? ({ type: 'FeatureCollection', features } satisfies MorphCollection) : null;
      } catch {
        return null;
      }
    })();
    morphCache.set(url, p);
  }
  return p;
}
