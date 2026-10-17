// Configuration « Empire espagnol » (1492-1976) : 33 étapes, une Feature PAR ÉTAT (Espagne, vice-royautés, possessions).
//
// Choix cartographique : COMPOSITION pilotée par les données. Chaque étape est décrite dans
// overrides/espagne/_carto.json (spécification de l'historien-cartographe) par une liste d'entités ordonnées
// (priorité décroissante) ; chaque entité a un `status` (core = possession espagnole, vassal = dépendance/protégé)
// et une expression `source` évaluée ici :
//   { country, region? }    pays Natural Earth 1:50m (regex), éventuellement découpé par une région nommée
//   { region }              polygone de overrides/espagne/_regions.geojson
//   { snapshot, match }     entités d'un instantané historical-basemaps dont NAME correspond à la regex
//   { union: [...] } / { diff: [a, b, ...] }   opérations booléennes
// Les instantanés sont trop grossiers pour les Amériques d'avant 1800 ; on privilégie Natural Earth + régions.
// Frontières approximatives (échelle de la décennie, pas de la commune). Aucune géométrie ne franchit
// l'antiméridien (Philippines, Mariannes et Carolines restent < 180°E).
import fs from 'node:fs';
import path from 'node:path';
import type { Checkpoint, ComposedEntity, EmpireConfig, EmpireStep, GeoCtx, Poly, Status } from './types.ts';

interface Src {
  country?: string;
  region?: string;
  snapshot?: string;
  match?: string;
  union?: Src[];
  diff?: Src[];
}
interface CartoStep {
  id: string;
  year: number;
  entities: { name: string; status: Status; source: Src }[];
}
interface CartoCheckpoint {
  name: string;
  pt: [number, number];
  where: Checkpoint['where'];
  from?: string;
  to?: string;
}

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const CARTO = JSON.parse(fs.readFileSync(path.join(ROOT, 'overrides/espagne/_carto.json'), 'utf8')) as {
  steps: CartoStep[];
  checkpoints: CartoCheckpoint[];
};

const STEPS: EmpireStep[] = CARTO.steps.map((s) => ({ id: s.id, year: s.year, compose: true }));
const BY_ID = new Map(CARTO.steps.map((s) => [s.id, s]));

function evalSrc(s: Src, c: GeoCtx): Poly | null {
  if (s.union) return c.union(...s.union.map((x) => evalSrc(x, c)));
  if (s.diff) {
    const [a, ...rest] = s.diff.map((x) => evalSrc(x, c));
    return c.diff(a, ...rest);
  }
  if (s.country) return c.country(s.country, s.region);
  if (s.snapshot) return c.snap(s.snapshot, s.match ?? '.');
  if (s.region) return c.region(s.region);
  throw new Error(`espagne.ts : source inconnue ${JSON.stringify(s)}`);
}

function compose(step: EmpireStep, c: GeoCtx): ComposedEntity[] {
  const spec = BY_ID.get(step.id);
  if (!spec) throw new Error(`espagne.ts : étape « ${step.id} » absente de _carto.json`);
  return spec.entities.map((e) => {
    const geom = evalSrc(e.source, c);
    if (!geom) throw new Error(`espagne.ts : géométrie vide « ${e.name} » à l'étape ${step.id}`);
    return { name: e.name, status: e.status, geom };
  });
}

export const espagne: EmpireConfig = {
  id: 'espagne',
  steps: STEPS,
  defaultEntity: CARTO.steps[0].entities[0].name,
  compose,
  checkpoints: CARTO.checkpoints,
};
