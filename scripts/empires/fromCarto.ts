// Empires « composés » d'après une spécification de données : overrides/<id>/_carto.json.
// Chaque étape liste des entités ordonnées (priorité décroissante), chacune avec un `status`
// (core, vassal, allied) et une expression `source` évaluée ici :
//   { country, region? }    pays Natural Earth 1:50m (regex), éventuellement découpé par une région nommée
//   { region }              polygone de overrides/<id>/_regions.geojson
//   { snapshot, match }     entités d'un instantané historical-basemaps dont NAME correspond à la regex
//   { union: [...] } / { diff: [a, b, ...] } / { inter: [a, b, ...] }   opérations booléennes
// Utilisé par l'Empire espagnol et le Saint-Empire.
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
  inter?: Src[];
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

function evalSrc(id: string, s: Src, c: GeoCtx): Poly | null {
  if (s.union) return c.union(...s.union.map((x) => evalSrc(id, x, c)));
  if (s.diff) {
    const [a, ...rest] = s.diff.map((x) => evalSrc(id, x, c));
    return c.diff(a, ...rest);
  }
  if (s.inter) {
    const [a, ...rest] = s.inter.map((x) => evalSrc(id, x, c));
    return rest.reduce((r, x) => c.inter(r, x), a);
  }
  if (s.country) return c.country(s.country, s.region);
  if (s.snapshot) return c.snap(s.snapshot, s.match ?? '.');
  if (s.region) return c.region(s.region);
  throw new Error(`${id} : source inconnue ${JSON.stringify(s)}`);
}

/** Empire composé d'après overrides/<id>/_carto.json (spécification par étape de l'historien-cartographe). */
export function cartoEmpire(id: string): EmpireConfig {
  const carto = JSON.parse(fs.readFileSync(path.join(ROOT, 'overrides', id, '_carto.json'), 'utf8')) as {
    steps: CartoStep[];
    checkpoints: CartoCheckpoint[];
  };
  const byId = new Map(carto.steps.map((s) => [s.id, s]));
  const steps: EmpireStep[] = carto.steps.map((s) => ({ id: s.id, year: s.year, compose: true }));
  const compose = (step: EmpireStep, c: GeoCtx): ComposedEntity[] => {
    const spec = byId.get(step.id);
    if (!spec) throw new Error(`${id} : étape « ${step.id} » absente de _carto.json`);
    return spec.entities.map((e) => {
      const geom = evalSrc(id, e.source, c);
      if (!geom) throw new Error(`${id} : géométrie vide « ${e.name} » à l'étape ${step.id}`);
      return { name: e.name, status: e.status, geom };
    });
  };
  return { id, steps, defaultEntity: carto.steps[0]!.entities[0]!.name, compose, checkpoints: carto.checkpoints };
}
