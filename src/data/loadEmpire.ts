import type { FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';
import INDEX from 'virtual:empire-index';
import type { ContemporaryProperties, DiffKind, MorphProperties, Empire, EmpireMeta, EmpireStats, NeighborProperties, TerritoryProperties, TimelineStep } from '../types';
import { labelPointsOf } from './labelPoints';
import { loadInventions } from './loadInventions';
import { loadRegions } from './loadRegions';

export type TerritoryCollection = FeatureCollection<Polygon | MultiPolygon, TerritoryProperties>;

/* ---------- Registre des empires ----------
 * Ajouter un empire = ajouter un dossier data/empires/<id>/timeline.json.
 * Les dossiers préfixés « _ » (fixtures de développement) ne sont utilisés
 * que si aucun vrai empire n'est disponible.
 *
 * Chargement à la demande : au démarrage, seul l'index léger (virtual:empire-index, généré au build)
 * et la timeline de l'empire affiché sont chargés. EMPIRES se remplit au fur et à mesure ; les vues qui
 * parcourent tous les empires (galerie, comparaison, monde, quiz) attendent loadAllEmpires().
 */
const loaders = import.meta.glob<Empire>('../../data/empires/*/timeline.json', { import: 'default' });

// Surfaces par étape (scripts/build-stats.ts), rattachées à chaque empire (petits fichiers, chargés avec la timeline).
const statsLoaders = import.meta.glob<EmpireStats>('../../data/empires/*/stats.json', { import: 'default' });

function byStartYear(a: { start: number }, b: { start: number }) {
  return a.start - b.start;
}

const realIndex = INDEX.filter((e) => !e.id.startsWith('_'));
/** Empires disponibles (métadonnées), triés par date de début : connus dès le démarrage. */
export const EMPIRE_INDEX: EmpireMeta[] = (realIndex.length > 0 ? realIndex : INDEX).sort(byStartYear);

/** Empires dont la timeline est chargée, triés par date de début (tableau partagé, rempli par loadEmpire). */
export const EMPIRES: Empire[] = [];

const pending = new Map<string, Promise<Empire>>();

/** Identifiant valide : celui demandé s'il existe, sinon Rome, sinon le premier empire. */
export function resolveEmpireId(id: string | null | undefined): string {
  return (EMPIRE_INDEX.find((e) => e.id === id) ?? EMPIRE_INDEX.find((e) => e.id === 'rome') ?? EMPIRE_INDEX[0])!.id;
}

/** Charge (une seule fois) la timeline d'un empire et l'ajoute à EMPIRES. */
export function loadEmpire(id: string): Promise<Empire> {
  const key = resolveEmpireId(id);
  let p = pending.get(key);
  if (!p) {
    p = (async () => {
      const [empire, stats] = await Promise.all([
        loaders[`../../data/empires/${key}/timeline.json`]!(),
        statsLoaders[`../../data/empires/${key}/stats.json`]?.() ?? Promise.resolve(undefined),
        loadInventions(key),
        loadRegions(key),
      ]);
      const steps = [...(empire.steps ?? [])].sort((a, b) => a.year - b.year);
      const full: Empire = { ...empire, steps, stats: empire.stats ?? stats };
      if (!EMPIRES.some((e) => e.id === full.id)) {
        EMPIRES.push(full);
        EMPIRES.sort(byStartYear);
      }
      return full;
    })();
    pending.set(key, p);
  }
  return p;
}

/** Toutes les timelines (vues qui parcourent tous les empires). */
export function loadAllEmpires(): Promise<Empire[]> {
  return Promise.all(EMPIRE_INDEX.map((e) => loadEmpire(e.id))).then(() => EMPIRES);
}

/** Empire déjà chargé (sinon Rome ou le premier chargé). */
export function getEmpire(id: string | null | undefined): Empire | undefined {
  return EMPIRES.find((e) => e.id === id) ?? EMPIRES.find((e) => e.id === 'rome') ?? EMPIRES[0];
}

/** Charge un module de vue et, avant de l'afficher, toutes les timelines (à passer à React.lazy). */
export function withAllEmpires<T>(load: () => Promise<T>): () => Promise<T> {
  return () => Promise.all([load(), loadAllEmpires()]).then(([m]) => m);
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
  labelPointsOf(data); // points d'étiquette calculés une fois, au chargement
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
      void loadSdf(empire.id, step.id);
      void loadNeighbors(empire.id, step.id);
      void loadContemporaries(empire.id, step.id);
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

/* ---------- Champs de distance (glissement continu, étape n-1 → n) ---------- */

export interface SdfMeta {
  bounds: [[number, number], [number, number], [number, number], [number, number]];
  width: number;
  height: number;
  rangeKm?: number;
  gainKm?: number;
  lossKm?: number;
}

export interface SdfData {
  bitmap: ImageBitmap;
  meta: SdfMeta;
}

const sdfCache = new Map<string, Promise<SdfData | null>>();

export function sdfUrl(empireId: string, stepId: string, ext: 'png' | 'json'): string {
  return `${import.meta.env.BASE_URL}data/empires/${encodeURIComponent(empireId)}/sdf/${encodeURIComponent(stepId)}.${ext}`;
}

/** PNG + métadonnées du champ de distance ; null si absent ou invalide (repli sur les bandes puis le fondu). */
export function loadSdf(empireId: string, stepId: string): Promise<SdfData | null> {
  const key = `${empireId}/${stepId}`;
  let p = sdfCache.get(key);
  if (!p) {
    p = (async () => {
      try {
        if (typeof createImageBitmap !== 'function') return null;
        const metaRes = await fetch(sdfUrl(empireId, stepId, 'json'));
        if (!metaRes.ok) return null;
        const meta = (await metaRes.json()) as SdfMeta; // le serveur de dev renvoie index.html si absent : json() échoue
        if (!Array.isArray(meta?.bounds) || meta.bounds.length !== 4 || !(meta.width > 0) || !(meta.height > 0)) return null;
        const imgRes = await fetch(sdfUrl(empireId, stepId, 'png'));
        if (!imgRes.ok) return null;
        const blob = await imgRes.blob();
        if (!blob.type.startsWith('image/')) return null;
        const bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
        return { bitmap, meta };
      } catch {
        sdfCache.delete(key);
        return null;
      }
    })();
    sdfCache.set(key, p);
  }
  return p;
}

/* ---------- Voisins de l'époque (par étape) ---------- */

export type NeighborCollection = FeatureCollection<Geometry, NeighborProperties>;

const EMPTY_NEIGHBORS: NeighborCollection = { type: 'FeatureCollection', features: [] };
const neighborCache = new Map<string, Promise<NeighborCollection>>();

export function neighborsUrl(empireId: string, stepId: string): string {
  return `${import.meta.env.BASE_URL}data/empires/${encodeURIComponent(empireId)}/neighbors/${encodeURIComponent(stepId)}.geojson`;
}

/** Voisins de l'étape. Fichier absent ou invalide : collection vide (jamais d'erreur). */
export function loadNeighbors(empireId: string, stepId: string): Promise<NeighborCollection> {
  const url = neighborsUrl(empireId, stepId);
  let p = neighborCache.get(url);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return EMPTY_NEIGHBORS;
        const data = (await res.json()) as NeighborCollection; // dev : index.html si absent, json() échoue
        if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) return EMPTY_NEIGHBORS;
        const features = data.features.filter((f) => f?.geometry && (f.properties?.kind === 'label' || f.properties?.kind === 'capital' || f.properties?.kind === 'border'));
        return { type: 'FeatureCollection', features } satisfies NeighborCollection;
      } catch {
        return EMPTY_NEIGHBORS;
      }
    })();
    neighborCache.set(url, p);
  }
  return p;
}

/* ---------- Empires contemporains (par étape) ---------- */

export type ContemporaryCollection = FeatureCollection<Geometry, ContemporaryProperties>;

const EMPTY_CONTEMPORARIES: ContemporaryCollection = { type: 'FeatureCollection', features: [] };
const contemporaryCache = new Map<string, Promise<ContemporaryCollection>>();

export function contemporariesUrl(empireId: string, stepId: string): string {
  return `${import.meta.env.BASE_URL}data/empires/${encodeURIComponent(empireId)}/contemporaries/${encodeURIComponent(stepId)}.geojson`;
}

/** Empires contemporains de l'étape. Fichier absent ou invalide : collection vide (jamais d'erreur). */
export function loadContemporaries(empireId: string, stepId: string): Promise<ContemporaryCollection> {
  const url = contemporariesUrl(empireId, stepId);
  let p = contemporaryCache.get(url);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return EMPTY_CONTEMPORARIES;
        const data = (await res.json()) as ContemporaryCollection; // dev : index.html si absent, json() échoue
        if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) return EMPTY_CONTEMPORARIES;
        const features = data.features.filter((f) => f?.geometry && typeof f.properties?.empire === 'string');
        return { type: 'FeatureCollection', features } satisfies ContemporaryCollection;
      } catch {
        return EMPTY_CONTEMPORARIES;
      }
    })();
    contemporaryCache.set(url, p);
  }
  return p;
}
