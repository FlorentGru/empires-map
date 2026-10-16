// Construit public/data/empires/<empire>/territories/<id>.geojson pour chaque empire configuré
// (scripts/empires/<empire>.ts) à partir des instantanés historical-basemaps (GPL-3.0)
// + Natural Earth (domaine public) + overrides manuels (overrides/<empire>/).
// Prérequis : npm run fetch:data
// Usage : tsx scripts/build-territories.ts [--empire <id>] [<stepId>]
//   sans <stepId> : construit toutes les étapes, puis land, diffs, morph et contrôles.
//
// Pipeline par étape :
//   1. géométrie de départ : instantané historical-basemaps (le plus proche de l'année,
//      ou `snapshot` imposé) filtré sur les entités de l'empire (`entities`), OU résultat d'une
//      étape `base`, OU entités composées par code (`compose`, voir scripts/empires/napoleon.ts :
//      pays Natural Earth, instantanés et polygones nommés overrides/<empire>/_regions.geojson).
//      Pour `compose`, une entité ne chevauche pas les précédentes (ordre = priorité) et porte un `status`.
//   2. overrides/<empire>/<id>.geojson (Features avec properties.op) :
//        op "add"      : union dans l'entité `entity` (créée si absente ; défaut = 1re entité)
//        op "subtract" : différence sur l'entité `entity`, ou sur toutes si absente
//        op "replace"  : au 1er replace du fichier, toutes les entités de départ sont
//                        supprimées ; ensuite se comporte comme "add"
//      Géométrie : Polygon/MultiPolygon (approximatif, il est découpé sur les terres),
//      ou Point = l'île / la masse terrestre Natural Earth qui contient ce point.
//      Optionnel : `from` (instantané, ex. "world_bc1", ou "countries" = pays Natural Earth)
//      + `match` (regex sur NAME / ADMIN) → la géométrie est intersectée avec ces entités (frontières cohérentes).
//      Optionnel : `status` (core|vassal|allied) pour les entités créées ou modifiées.
//   3. découpe sur les terres Natural Earth 1:50m, suppression des éclats
//   4. simplification (tolérance 0.02°, highQuality, augmentée si > 150 Ko), arrondi 3 décimales
//   5. `coastFix` de l'empire (Rome : Constantinople) : si le territoire (avant découpe) contient le point,
//      on ajoute sans découpe les polygones du fichier d'overrides (trait de côte 1:50m trop grossier)
// Puis : diffs/<id>.geojson (gagné/perdu vs étape précédente, morceaux < 2000 km² ignorés) et basemap/land.geojson (bbox réduite).
import { emptyDir } from './fs-utils.ts';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import { checkConsistency, paths, selectedEmpires } from './empires/index.ts';
import type { ComposedEntity, EmpireConfig, EmpireStep, GeoCtx, Status } from './empires/types.ts';
import type { DiffKind, TerritoryProperties } from '../src/types.ts';
import { checkTerritories } from './check-territories.ts';
import { checkMorph, writeMorph } from './build-morph.ts';

type Poly = Feature<Polygon | MultiPolygon>;
interface Entity {
  name: string;
  status?: Status;
  geom: Poly | null;
  /** Géométrie non découpée sur les terres (override `noclip` : le trait de côte 1:50m est trop grossier). */
  raw?: Poly | null;
  sourceYear: number;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HB_DIR = path.join(ROOT, '.cache/historical-basemaps');
const NE_FILE = path.join(ROOT, '.cache/natural-earth/ne_50m_land.geojson');
const NE_COUNTRIES_FILE = path.join(ROOT, '.cache/natural-earth/ne_50m_admin_0_countries.geojson');
const LAND_OUT = path.join(ROOT, 'public/data/basemap/land.geojson');
/** Emprise du fond de carte : le monde entier (Antarctique exclu). */
const LAND_BBOX: [number, number, number, number] = [-180, -60, 180, 84];
const MIN_DIFF_KM2 = 2000;

const BASE_TOLERANCE = 0.02;
const MAX_BYTES = 150 * 1024;
const MIN_PART_KM2 = 50;
const LAND_TOLERANCE = 0.03;

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

// ---------- utilitaires géométriques ----------

function polyFeature(g: Polygon | MultiPolygon): Poly {
  return turf.feature(g) as Poly;
}

function union(a: Poly | null, b: Poly | null): Poly | null {
  if (!a) return b;
  if (!b) return a;
  return (turf.union(turf.featureCollection([a, b])) as Poly | null) ?? null;
}

function unionAll(list: Poly[]): Poly | null {
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  return (turf.union(turf.featureCollection(list)) as Poly | null) ?? null;
}

function difference(a: Poly | null, b: Poly): Poly | null {
  if (!a) return null;
  return (turf.difference(turf.featureCollection([a, b])) as Poly | null) ?? null;
}

function intersect(a: Poly | null, b: Poly): Poly | null {
  if (!a) return null;
  return (turf.intersect(turf.featureCollection([a, b])) as Poly | null) ?? null;
}

function bboxOverlap(a: number[], b: number[]): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

function areaKm2(f: Poly | null): number {
  return f ? turf.area(f) / 1e6 : 0;
}

/** Éclate en polygones simples. */
function parts(f: Poly | null): Polygon[] {
  if (!f) return [];
  const g = f.geometry;
  return g.type === 'Polygon' ? [g] : g.coordinates.map((c) => ({ type: 'Polygon', coordinates: c }) as Polygon);
}

function fromParts(ps: Polygon[]): Poly | null {
  if (ps.length === 0) return null;
  if (ps.length === 1) return polyFeature(ps[0]);
  return polyFeature({ type: 'MultiPolygon', coordinates: ps.map((p) => p.coordinates) });
}

// ---------- terres Natural Earth ----------

interface LandPart {
  feature: Poly;
  bbox: number[];
}

function loadLand(): LandPart[] {
  if (!fs.existsSync(NE_FILE)) fail(`${NE_FILE} absent — lancer d'abord npm run fetch:data`);
  const fc = JSON.parse(fs.readFileSync(NE_FILE, 'utf8')) as FeatureCollection<Polygon | MultiPolygon>;
  const out: LandPart[] = [];
  for (const f of fc.features) {
    for (const p of parts(f as Poly)) {
      const feature = polyFeature(p);
      out.push({ feature, bbox: turf.bbox(feature) });
    }
  }
  return out;
}

const LAND = loadLand();

function clipToLand(f: Poly | null): Poly | null {
  if (!f) return null;
  const bb = turf.bbox(f);
  const pieces: Poly[] = [];
  for (const lp of LAND) {
    if (!bboxOverlap(bb, lp.bbox)) continue;
    const i = intersect(f, lp.feature);
    if (i) pieces.push(i);
  }
  // Les intersections sont disjointes (masses terrestres distinctes) : simple concaténation.
  return fromParts(pieces.flatMap((p) => parts(p)));
}

function landAt(pt: Position): Poly {
  const p = turf.point(pt);
  for (const lp of LAND) {
    if (pt[0] < lp.bbox[0] || pt[0] > lp.bbox[2] || pt[1] < lp.bbox[1] || pt[1] > lp.bbox[3]) continue;
    if (turf.booleanPointInPolygon(p, lp.feature)) return lp.feature;
  }
  fail(`aucune terre Natural Earth au point [${pt}]`);
}

/** Supprime les éclats (< MIN_PART_KM2) issus du découpage, sauf la plus grande partie. */
function dropSlivers(f: Poly | null): Poly | null {
  const ps = parts(f);
  if (ps.length <= 1) return f;
  const areas = ps.map((p) => turf.area(p) / 1e6);
  const maxA = Math.max(...areas);
  return fromParts(ps.filter((_, i) => areas[i] >= MIN_PART_KM2 || areas[i] === maxA));
}

// ---------- instantanés historical-basemaps ----------

function snapshotYear(name: string): number {
  const m = /^world_(bc)?(\d+)$/.exec(name);
  if (!m) throw new Error(name);
  return m[1] ? -Number(m[2]) : Number(m[2]);
}

const SNAPSHOTS = fs.existsSync(HB_DIR)
  ? fs
      .readdirSync(HB_DIR)
      .filter((f) => /^world_(bc)?\d+\.geojson$/.test(f))
      .map((f) => f.replace('.geojson', ''))
      .sort((a, b) => snapshotYear(a) - snapshotYear(b))
  : [];
if (SNAPSHOTS.length === 0) fail(`aucun instantané dans ${HB_DIR} — lancer d'abord npm run fetch:data`);

/** Le plus proche ; on préfère l'instantané antérieur s'il n'est pas beaucoup plus loin. */
function pickSnapshot(year: number): string {
  let before: string | undefined;
  let after: string | undefined;
  for (const s of SNAPSHOTS) {
    if (snapshotYear(s) <= year) before = s;
    else if (!after) after = s;
  }
  if (!before) return after!;
  if (!after) return before;
  const db = year - snapshotYear(before);
  const da = snapshotYear(after) - year;
  return db <= da * 1.25 ? before : after;
}

const snapshotCache = new Map<string, FeatureCollection>();
function loadSnapshot(name: string): FeatureCollection {
  let fc = snapshotCache.get(name);
  if (!fc) {
    const file = path.join(HB_DIR, `${name}.geojson`);
    if (!fs.existsSync(file)) fail(`instantané ${file} absent`);
    fc = JSON.parse(fs.readFileSync(file, 'utf8')) as FeatureCollection;
    snapshotCache.set(name, fc);
  }
  return fc;
}

function snapshotGeom(name: string, matcher: (n: string) => boolean): Poly | null {
  const feats = loadSnapshot(name).features.filter(
    (f) =>
      f.geometry &&
      (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') &&
      matcher(String(f.properties?.NAME ?? '')),
  ) as Poly[];
  // Nettoyage léger : certaines entités ont des anneaux dégénérés.
  const cleaned = feats.map((f) => turf.cleanCoords(f) as Poly).filter((f) => areaKm2(f) > 1);
  return unionAll(cleaned);
}

// ---------- pays Natural Earth 1:50m (frontières modernes, cohérentes entre elles) ----------

let countriesFc: FeatureCollection | null = null;
function countriesGeom(match: string): Poly | null {
  if (!countriesFc) {
    if (!fs.existsSync(NE_COUNTRIES_FILE)) fail(`${NE_COUNTRIES_FILE} absent — lancer d'abord npm run fetch:data`);
    countriesFc = JSON.parse(fs.readFileSync(NE_COUNTRIES_FILE, 'utf8')) as FeatureCollection;
  }
  const re = new RegExp(match);
  const feats = countriesFc.features.filter(
    (f) =>
      f.geometry &&
      (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') &&
      (re.test(String(f.properties?.ADMIN ?? '')) || re.test(String(f.properties?.NAME ?? ''))),
  ) as Poly[];
  return unionAll(feats.map((f) => turf.cleanCoords(f) as Poly));
}

// ---------- overrides ----------

interface OverrideProps {
  op: 'add' | 'subtract' | 'replace';
  entity?: string;
  /** Statut de l'entité (empires à satellites) ; appliqué à l'entité ajoutée/modifiée. */
  status?: Status;
  /** Instantané (ex. "world_1800") ou "countries" (pays Natural Earth). */
  from?: string;
  match?: string;
  note?: string;
  /** true : ne pas découper cette géométrie sur les terres Natural Earth (petites zones côtières). */
  noclip?: boolean;
}

function overrideGeom(f: Feature, file: string): Poly {
  const g = f.geometry;
  const props = f.properties as OverrideProps;
  let geom: Poly;
  if (g?.type === 'Point') geom = landAt(g.coordinates);
  else if (g?.type === 'MultiPoint') {
    const u = unionAll(g.coordinates.map((c) => landAt(c)));
    if (!u) fail(`${file} : MultiPoint vide`);
    geom = u;
  } else if (g?.type === 'Polygon' || g?.type === 'MultiPolygon') geom = polyFeature(g);
  else fail(`${file} : géométrie ${g?.type} non gérée`);
  if (props.from) {
    const re = new RegExp(props.match ?? '.');
    const src = props.from === 'countries' ? countriesGeom(props.match ?? '.') : snapshotGeom(props.from, (n) => re.test(n));
    if (!src) fail(`${file} : aucune entité ${props.match} dans ${props.from}`);
    const i = intersect(geom, src);
    if (!i) fail(`${file} : intersection vide avec ${props.from}/${props.match} (${props.note ?? ''})`);
    geom = i;
  }
  return geom;
}

function applyOverrides(cfg: EmpireConfig, step: EmpireStep, entities: Entity[]): { entities: Entity[]; applied: boolean } {
  const file = path.join(paths(cfg.id).overrides, `${step.id}.geojson`);
  if (!fs.existsSync(file)) return { entities, applied: false };
  const fc = JSON.parse(fs.readFileSync(file, 'utf8')) as FeatureCollection;
  if (fc.type !== 'FeatureCollection' && (fc as unknown as Feature).type !== 'Feature') fail(`${file} : GeoJSON invalide`);
  const features = fc.type === 'FeatureCollection' ? fc.features : [fc as unknown as Feature];
  let list = entities.map((e) => ({ ...e }));
  let replaced = false;
  const defaultName = list[0]?.name ?? cfg.defaultEntity;
  const get = (name: string): Entity => {
    let e = list.find((x) => x.name === name);
    if (!e) {
      e = { name, geom: null, sourceYear: step.year };
      list.push(e);
    }
    return e;
  };
  for (const f of features) {
    const props = f.properties as OverrideProps | null;
    if (!props?.op) fail(`${file} : Feature sans properties.op`);
    const geom = overrideGeom(f, path.basename(file));
    switch (props.op) {
      case 'replace':
        if (!replaced) {
          list = [];
          replaced = true;
        }
      // falls through
      case 'add': {
        const e = get(props.entity ?? defaultName);
        if (props.status) e.status = props.status;
        if (props.noclip) e.raw = union(e.raw ?? null, geom);
        else e.geom = union(e.geom, geom);
        e.sourceYear = step.year;
        break;
      }
      case 'subtract': {
        const targets = props.entity ? list.filter((e) => e.name === props.entity) : list;
        for (const e of targets) {
          const before = areaKm2(e.geom);
          e.geom = difference(e.geom, geom);
          if (Math.abs(before - areaKm2(e.geom)) > 1) e.sourceYear = step.year;
        }
        break;
      }
      default:
        fail(`${file} : op inconnue ${(props as OverrideProps).op}`);
    }
  }
  return { entities: list.filter((e) => e.geom || e.raw), applied: true };
}

const coastFixCache = new Map<string, Poly>();
function coastFix(cfg: EmpireConfig): Poly {
  const file = path.join(paths(cfg.id).overrides, cfg.coastFix!.file);
  let u = coastFixCache.get(file) ?? null;
  if (!u) {
    const fc = JSON.parse(fs.readFileSync(file, 'utf8')) as FeatureCollection;
    u = unionAll(fc.features.map((f) => polyFeature(f.geometry as Polygon)));
    if (!u) fail(`${file} vide`);
    coastFixCache.set(file, u);
  }
  return u;
}

// ---------- sortie ----------

function roundRing(ring: Position[]): Position[] {
  const out: Position[] = [];
  for (const c of ring) {
    const p = [Math.round(c[0] * 1000) / 1000, Math.round(c[1] * 1000) / 1000];
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  if (out.length && (out[0][0] !== out[out.length - 1][0] || out[0][1] !== out[out.length - 1][1])) out.push([...out[0]]);
  return out;
}

function finalize(f: Poly, tolerance: number): Polygon | MultiPolygon | null {
  const s = turf.simplify(f, { tolerance, highQuality: true }) as Poly;
  const polys: Position[][][] = [];
  for (const p of parts(s)) {
    const outer = roundRing(p.coordinates[0]);
    if (outer.length < 4) continue; // anneau extérieur dégénéré : on abandonne la partie
    const rings = [outer, ...p.coordinates.slice(1).map(roundRing).filter((r) => r.length >= 4)];
    if (turf.area(turf.polygon(rings)) / 1e6 < 1) continue;
    polys.push(rings);
  }
  if (polys.length === 0) return null;
  return polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys };
}

function validate(cfg: EmpireConfig, id: string, fc: FeatureCollection<Polygon | MultiPolygon, TerritoryProperties>) {
  if (fc.features.length === 0) fail(`${id} : FeatureCollection vide`);
  for (const f of fc.features) {
    const p = f.properties;
    if (!p || p.empire !== cfg.id || !p.name || !Number.isFinite(p.sourceYear)) fail(`${id} : properties invalides`);
    const g = f.geometry;
    if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) fail(`${id} : géométrie absente`);
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    if (polys.length === 0) fail(`${id} : géométrie vide (${p.name})`);
    for (const poly of polys)
      for (const ring of poly) {
        if (ring.length < 4) fail(`${id} : anneau de moins de 4 points (${p.name})`);
        const a = ring[0];
        const b = ring[ring.length - 1];
        if (a[0] !== b[0] || a[1] !== b[1]) fail(`${id} : anneau non fermé (${p.name})`);
        for (const c of ring)
          if (!Number.isFinite(c[0]) || !Number.isFinite(c[1]) || Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90)
            fail(`${id} : coordonnée invalide (${p.name})`);
      }
    if (turf.area(f) <= 0) fail(`${id} : surface nulle (${p.name})`);
    if (!turf.booleanValid(f)) console.warn(`  ⚠ ${id} / ${p.name} : géométrie non strictement valide (auto-intersection mineure ?)`);
  }
}

function writeStep(cfg: EmpireConfig, step: EmpireStep, entities: Entity[]): void {
  let tolerance = BASE_TOLERANCE;
  for (;;) {
    const features: Feature<Polygon | MultiPolygon, TerritoryProperties>[] = [];
    for (const e of entities) {
      if (!e.geom) continue;
      const g = finalize(e.geom, tolerance);
      if (!g) continue;
      features.push({ type: 'Feature', properties: { empire: cfg.id, name: e.name, sourceYear: e.sourceYear, ...(e.status ? { status: e.status } : {}) },
        geometry: g,
      });
    }
    const fc: FeatureCollection<Polygon | MultiPolygon, TerritoryProperties> = { type: 'FeatureCollection', features };
    validate(cfg, step.id, fc);
    const json = JSON.stringify(fc);
    if (Buffer.byteLength(json) > MAX_BYTES && tolerance < 0.2) {
      tolerance *= 1.5;
      continue;
    }
    fs.writeFileSync(path.join(paths(cfg.id).territories, `${step.id}.geojson`), json + '\n');
    if (tolerance !== BASE_TOLERANCE) console.log(`    (tolérance portée à ${tolerance.toFixed(3)} pour tenir sous 150 Ko)`);
    return;
  }
}

function writeLand(): void {
  const features: Feature[] = [];
  for (const lp of LAND) {
    if (!bboxOverlap(lp.bbox, LAND_BBOX)) continue;
    const inside =
      lp.bbox[0] >= LAND_BBOX[0] && lp.bbox[1] >= LAND_BBOX[1] && lp.bbox[2] <= LAND_BBOX[2] && lp.bbox[3] <= LAND_BBOX[3];
    const clipped = inside ? lp.feature : (turf.bboxClip(lp.feature, LAND_BBOX) as Poly);
    if (!clipped.geometry.coordinates.length) continue;
    const g = finalize(clipped, LAND_TOLERANCE);
    if (g) features.push({ type: 'Feature', properties: {}, geometry: g });
  }
  if (features.length === 0) fail('land.geojson vide');
  fs.mkdirSync(path.dirname(LAND_OUT), { recursive: true });
  fs.writeFileSync(LAND_OUT, JSON.stringify({ type: 'FeatureCollection', features }) + '\n');
  console.log(`✓ basemap/land.geojson (${features.length} polygones, ${(fs.statSync(LAND_OUT).size / 1024).toFixed(0)} Ko)`);
}

// ---------- diffs ----------

/** Fusionne les entités d'une étape (fichier déjà simplifié/arrondi). */
function readMerged(cfg: EmpireConfig, id: string): Poly | null {
  const fc = JSON.parse(fs.readFileSync(path.join(paths(cfg.id).territories, `${id}.geojson`), 'utf8')) as FeatureCollection;
  // Les alliés contraints (status 'allied') ne sont qu'un contour : exclus des diffs, morph et SDF.
  return unionAll(fc.features.filter((f) => f.properties?.status !== 'allied').map((f) => turf.cleanCoords(f) as Poly));
}

function writeDiffs(cfg: EmpireConfig): void {
  const dir = paths(cfg.id).diffs;
  emptyDir(dir);
  fs.mkdirSync(dir, { recursive: true });
  let prev = readMerged(cfg, cfg.steps[0].id);
  let total = 0;
  let biggest = { id: '', size: 0 };
  for (const step of cfg.steps.slice(1)) {
    const cur = readMerged(cfg, step.id);
    const features: Feature<Polygon | MultiPolygon, { kind: DiffKind }>[] = [];
    const add = (kind: DiffKind, f: Poly | null) => {
      for (const p of parts(f)) {
        if (areaKm2(polyFeature(p)) < MIN_DIFF_KM2) continue;
        const g = finalize(polyFeature(p), BASE_TOLERANCE);
        if (g) features.push({ type: 'Feature', properties: { kind }, geometry: g });
      }
    };
    if (cur && prev) {
      add('gained', difference(cur, prev));
      add('lost', difference(prev, cur));
    }
    const file = path.join(dir, `${step.id}.geojson`);
    fs.writeFileSync(file, JSON.stringify({ type: 'FeatureCollection', features }) + '\n');
    const size = fs.statSync(file).size;
    total += size;
    if (size > biggest.size) biggest = { id: step.id, size };
    prev = cur;
  }
  console.log(`✓ ${cfg.id}/diffs/ (${cfg.steps.length - 1} fichiers, ${(total / 1024).toFixed(0)} Ko, max ${biggest.id} ${(biggest.size / 1024).toFixed(1)} Ko)`);
}

// ---------- contexte géométrique des configs `compose` ----------

function makeCtx(cfg: EmpireConfig): GeoCtx {
  const memo = new Map<string, Poly | null>();
  const cached = (key: string, f: () => Poly | null): Poly | null => {
    if (!memo.has(key)) memo.set(key, f());
    return memo.get(key) ?? null;
  };
  let regions: Map<string, Poly> | null = null;
  const region = (name: string): Poly => {
    if (!regions) {
      const file = path.join(paths(cfg.id).overrides, '_regions.geojson');
      if (!fs.existsSync(file)) fail(`${file} absent`);
      const fc = JSON.parse(fs.readFileSync(file, 'utf8')) as FeatureCollection;
      const byName = new Map<string, Poly[]>();
      for (const f of fc.features) {
        const n = (f.properties as { region?: string } | null)?.region;
        if (!n) fail(`${file} : Feature sans properties.region`);
        if (f.geometry?.type !== 'Polygon' && f.geometry?.type !== 'MultiPolygon') fail(`${file} : région ${n} non polygonale`);
        const list = byName.get(n) ?? [];
        list.push(polyFeature(f.geometry));
        byName.set(n, list);
      }
      regions = new Map();
      for (const [n, list] of byName) regions.set(n, unionAll(list)!);
    }
    const r = regions.get(name);
    if (!r) fail(`région « ${name} » absente de overrides/${cfg.id}/_regions.geojson`);
    return r;
  };
  return {
    snap: (snapshot, match) => {
      const re = new RegExp(match);
      return cached(`snap|${snapshot}|${match}`, () => snapshotGeom(snapshot, (n) => re.test(n)));
    },
    country: (match, reg) =>
      cached(`country|${match}|${reg ?? ''}`, () => {
        const c = countriesGeom(match);
        return reg ? intersect(c, region(reg)) : c;
      }),
    region,
    island: (pt) => cached(`island|${pt}`, () => landAt(pt))!,
    union: (...list) => unionAll(list.filter((x): x is Poly => !!x)),
    inter: (a, b) => (a && b ? intersect(a, b) : null),
    diff: (a, ...b) => {
      let r = a;
      for (const x of b) if (r && x) r = difference(r, x);
      return r;
    },
    grow: (g, km, ...avoid) => {
      if (!g) return null;
      let r: Poly | null = turf.buffer(g, km, { units: 'kilometers', steps: 4 }) as Poly | null;
      for (const x of avoid) if (r && x) r = difference(r, x);
      return r;
    },
  };
}

// ---------- main ----------

function composeStep(cfg: EmpireConfig, step: EmpireStep, ctx: GeoCtx): Entity[] {
  if (!cfg.compose) fail(`${cfg.id} : l'étape ${step.id} demande compose mais la config n'en définit pas`);
  const composed: ComposedEntity[] = cfg.compose(step, ctx);
  const out: Entity[] = [];
  let acc: Poly | null = null; // union des entités déjà placées (priorité = ordre)
  for (const c of composed) {
    if (!c.geom) {
      console.warn(`  ⚠ ${step.id} : entité « ${c.name} » vide`);
      continue;
    }
    out.push({ name: c.name, status: c.status, geom: acc ? difference(c.geom, acc) : c.geom, sourceYear: c.sourceYear ?? step.year });
    acc = union(acc, c.geom);
  }
  console.log(`  compose → ${out.map((e) => `${e.name} [${e.status ?? '-'}]: ${Math.round(areaKm2(e.geom))} km²`).join(', ')}`);
  return out;
}

function buildStep(cfg: EmpireConfig, step: EmpireStep, results: Map<string, Entity[]>, ctx: GeoCtx): Entity[] {
  let entities: Entity[];
  if (step.compose) {
    entities = composeStep(cfg, step, ctx);
  } else if (step.base) {
    const base = results.get(step.base);
    if (!base) fail(`${step.id} : base ${step.base} non construite (ordre des étapes ?)`);
    entities = base.map((e) => ({ ...e }));
  } else {
    const snap = step.snapshot ?? pickSnapshot(step.year);
    const sy = snapshotYear(snap);
    const mapping = step.entities ?? {};
    const names = [...new Set(Object.values(mapping))];
    entities = names.map((name) => {
      const keys = Object.keys(mapping).filter((k) => mapping[k] === name);
      return { name, geom: snapshotGeom(snap, (n) => keys.includes(n)), sourceYear: sy };
    });
    const label = entities.map((e) => `${e.name}: ${e.geom ? Math.round(areaKm2(e.geom)) + ' km²' : 'absent'}`).join(', ');
    console.log(`  ${snap} → ${label}`);
  }
  const { entities: after, applied } = applyOverrides(cfg, step, entities);
  if (applied) console.log(`  + overrides/${cfg.id}/${step.id}.geojson`);
  const fix = cfg.coastFix ? { pt: turf.point(cfg.coastFix.point), geom: coastFix(cfg) } : null;
  return after
    .map((e) => {
      // Rustine de trait de côte (Rome : le 1:50m noie la péninsule de Constantinople) : ajout sans découpe.
      const hasFix = !!fix && !!e.geom && turf.booleanPointInPolygon(fix.pt, e.geom);
      return { ...e, geom: union(dropSlivers(clipToLand(e.geom)), union(e.raw ?? null, hasFix ? fix!.geom : null)), raw: null };
    })
    .filter((e) => e.geom && areaKm2(e.geom) > 0);
}

function buildEmpire(cfg: EmpireConfig, only: string | undefined): void {
  console.log(`\n=== ${cfg.id} ===`);
  checkConsistency(cfg);
  if (only && !cfg.steps.some((s) => s.id === only)) fail(`${cfg.id} : étape ${only} inconnue`);
  fs.mkdirSync(paths(cfg.id).territories, { recursive: true });
  const ctx = makeCtx(cfg);
  const results = new Map<string, Entity[]>();
  for (const step of cfg.steps) {
    console.log(`• ${step.id} (${step.year})`);
    const entities = buildStep(cfg, step, results, ctx);
    if (entities.length === 0) fail(`${step.id} : aucune entité trouvée`);
    results.set(step.id, entities);
    if (!only || only === step.id) writeStep(cfg, step, entities);
  }
  if (only) return;
  writeDiffs(cfg);
  writeMorph(cfg);
  if (!checkTerritories(cfg)) fail(`${cfg.id} : contrôle des territoires en échec`);
  if (!checkMorph(cfg)) fail(`${cfg.id} : contrôle des morphs en échec`);
}

function main() {
  const argv = process.argv.slice(2);
  const empIdx = argv.indexOf('--empire');
  const rest = argv.filter((_, i) => i !== empIdx && i !== empIdx + 1 || empIdx < 0);
  const only = rest.find((a) => !a.startsWith('--'));
  const list = selectedEmpires(argv);
  if (only && list.length !== 1) fail('une étape précise exige --empire <id>');
  if (!only) writeLand();
  // --land : régénère seulement le fond de carte (land.geojson), sans toucher aux territoires.
  if (argv.includes('--land')) return;
  for (const cfg of list) buildEmpire(cfg, only);
}

main();
