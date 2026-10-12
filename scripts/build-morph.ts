// Bandes de morphing entre deux étapes consécutives : public/data/empires/rome/morph/<stepId>.geojson
// (FeatureCollection, properties MorphProperties). Le front les anime pour faire « glisser » la frontière.
//   - stable : prev ∩ curr (entités fusionnées), t = 0
//   - gained : curr − prev, découpé en N bandes par distance à l'ANCIENNE frontière (t = k/N)
//   - lost   : prev − curr, découpé en N bandes par distance à la NOUVELLE frontière (t = k/N)
// Distance : dmax = max sur les sommets du morceau de la distance à la source (échantillonnage) ;
// bande k = morceau ∩ buffer(source, k·dmax/N) − buffer(source, (k−1)·dmax/N), la dernière prend le reste.
// Si la source n'existe pas ou ne touche pas l'autre étape (saut énorme), les bandes rayonnent depuis
// le centroïde de l'intersection, à défaut depuis le point `location` de l'étape.
// Les buffers sont calculés sur la frontière simplifiée (tolérance 0.05) ; les bandes sont ensuite
// intersectées avec les vraies géométries, donc les bords restent nets.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import { ROME_STEPS } from './steps.ts';
import type { MorphProperties } from '../src/types.ts';

type Poly = Feature<Polygon | MultiPolygon>;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TERR_DIR = path.join(ROOT, 'public/data/empires/rome/territories');
const MORPH_DIR = path.join(ROOT, 'public/data/empires/rome/morph');
const TIMELINE = path.join(ROOT, 'data/empires/rome/timeline.json');

const N = 24;
const MIN_KM2 = 300; // morceaux entiers (gained/lost avant découpage)
const MIN_FRAG_KM2 = 10; // fragments issus du découpage en bandes
const TOL = 0.02;
const CALC_TOL = 0.05;
const MAX_BYTES = 120 * 1024;
const AREA_TOL = 0.03;
const ABS_TOL_KM2 = 300;

const intersect = (a: Poly | null, b: Poly | null): Poly | null =>
  a && b ? ((turf.intersect(turf.featureCollection([a, b])) as Poly | null) ?? null) : null;
const difference = (a: Poly | null, b: Poly | null): Poly | null =>
  a ? (b ? ((turf.difference(turf.featureCollection([a, b])) as Poly | null) ?? null) : a) : null;
const unionAll = (l: Poly[]): Poly | null =>
  l.length === 0 ? null : l.length === 1 ? l[0] : ((turf.union(turf.featureCollection(l)) as Poly | null) ?? null);
const areaKm2 = (f: Poly | null): number => (f ? turf.area(f) / 1e6 : 0);

function parts(f: Poly | null): Polygon[] {
  if (!f) return [];
  const g = f.geometry;
  return g.type === 'Polygon' ? [g] : g.coordinates.map((c) => ({ type: 'Polygon', coordinates: c }) as Polygon);
}

function readMerged(id: string): Poly | null {
  const fc = JSON.parse(fs.readFileSync(path.join(TERR_DIR, `${id}.geojson`), 'utf8')) as FeatureCollection;
  return unionAll(fc.features.map((f) => turf.cleanCoords(f) as Poly));
}

function simplified(f: Poly): Poly {
  return turf.simplify(f, { tolerance: CALC_TOL, highQuality: true }) as Poly;
}

// ---------- distance ----------

type Source = { kind: 'poly'; geom: Poly; segs: number[][] } | { kind: 'point'; pt: Position };

function segmentsOf(f: Poly): number[][] {
  const segs: number[][] = [];
  for (const p of parts(f))
    for (const ring of p.coordinates)
      for (let i = 0; i + 1 < ring.length; i++) segs.push([ring[i][0], ring[i][1], ring[i + 1][0], ring[i + 1][1]]);
  return segs;
}

/** Distance (km) d'un point à un ensemble de segments, projection équirectangulaire locale. */
function distToSegs(x: number, y: number, segs: number[][]): number {
  const kx = 111.32 * Math.cos((y * Math.PI) / 180);
  const ky = 110.57;
  let best = Infinity;
  for (const [x1, y1, x2, y2] of segs) {
    const ax = (x1 - x) * kx, ay = (y1 - y) * ky, bx = (x2 - x) * kx, by = (y2 - y) * ky;
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2));
    const px = ax + t * dx, py = ay + t * dy;
    const d = px * px + py * py;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

function distToPoint(x: number, y: number, pt: Position): number {
  const kx = 111.32 * Math.cos((y * Math.PI) / 180);
  return Math.hypot((pt[0] - x) * kx, (pt[1] - y) * 110.57);
}

function sampleVertices(f: Poly): Position[] {
  const out: Position[] = [];
  for (const p of parts(f)) for (const ring of p.coordinates) for (const c of ring) out.push(c);
  return out;
}

function dist(src: Source, c: Position): number {
  return src.kind === 'poly' ? distToSegs(c[0], c[1], src.segs) : distToPoint(c[0], c[1], src.pt);
}

function bufferOf(src: Source, km: number): Poly {
  if (src.kind === 'point') return turf.circle(src.pt, km, { steps: 48, units: 'kilometers' }) as Poly;
  return turf.buffer(src.geom, km, { units: 'kilometers', steps: 6 }) as Poly;
}

function fromParts(ps: Polygon[]): Poly | null {
  if (ps.length === 0) return null;
  return turf.feature(
    ps.length === 1 ? ps[0] : { type: 'MultiPolygon', coordinates: ps.map((p) => p.coordinates) },
  ) as Poly;
}

// ---------- découpage en bandes ----------

interface Band {
  t: number;
  geom: Poly;
}

function bands(whole: Poly | null, src: Source, minKm2: number): Band[] {
  // Petits morceaux conservés : ils tombent dans la bande de leur distance (pas de perte d'aire).
  void minKm2;
  const piece = fromParts(parts(whole));
  if (!piece) return [];
  let dmax = 0;
  for (const c of sampleVertices(piece)) dmax = Math.max(dmax, dist(src, c));
  if (dmax <= 0) return [{ t: 1, geom: piece }];
  const out: Band[] = [];
  let remaining: Poly | null = piece;
  for (let k = 1; k <= N && remaining; k++) {
    if (k === N) {
      out.push({ t: 1, geom: remaining });
      break;
    }
    const buf = bufferOf(src, (k * dmax) / N);
    const inside = intersect(remaining, buf);
    if (inside) out.push({ t: k / N, geom: inside });
    remaining = difference(remaining, buf);
  }
  return out;
}

// ---------- sortie ----------

const r3 = (v: number) => Math.round(v * 1000) / 1000;

function roundRing(ring: Position[]): Position[] {
  const out: Position[] = [];
  for (const c of ring) {
    const p = [r3(c[0]), r3(c[1])];
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  if (out.length && (out[0][0] !== out[out.length - 1][0] || out[0][1] !== out[out.length - 1][1])) out.push([...out[0]]);
  return out;
}

function finalize(f: Poly, tol: number): Polygon | MultiPolygon | null {
  const s = turf.simplify(f, { tolerance: tol, highQuality: true }) as Poly;
  const polys: Position[][][] = [];
  for (const p of parts(s)) {
    const outer = roundRing(p.coordinates[0]);
    if (outer.length < 4) continue;
    const rings = [outer, ...p.coordinates.slice(1).map(roundRing).filter((r) => r.length >= 4)];
    if (turf.area(turf.polygon(rings)) / 1e6 < MIN_FRAG_KM2) continue;
    polys.push(rings);
  }
  if (polys.length === 0) return null;
  return polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys };
}

type MF = Feature<Polygon | MultiPolygon, MorphProperties>;

function buildFeatures(stable: Poly | null, gained: Band[], lost: Band[], tol: number): MF[] {
  const out: MF[] = [];
  const add = (kind: MorphProperties['kind'], t: number, f: Poly | null) => {
    if (!f) return;
    const g = finalize(f, tol);
    if (g) out.push({ type: 'Feature', properties: { kind, t: r3(t) }, geometry: g });
  };
  add('stable', 0, stable);
  for (const b of gained) add('gained', b.t, b.geom);
  for (const b of lost) add('lost', b.t, b.geom);
  return out;
}

export function writeMorph(): void {
  const timeline = JSON.parse(fs.readFileSync(TIMELINE, 'utf8')) as { steps: { id: string; location: Position }[] };
  const loc = new Map(timeline.steps.map((s) => [s.id, s.location]));
  fs.rmSync(MORPH_DIR, { recursive: true, force: true });
  fs.mkdirSync(MORPH_DIR, { recursive: true });
  const t0 = Date.now();
  let prev = readMerged(ROME_STEPS[0].id);
  let total = 0;
  for (const step of ROME_STEPS.slice(1)) {
    const cur = readMerged(step.id);
    const stable = intersect(prev, cur);
    const gainedAll = cur ? difference(cur, prev) : null;
    const lostAll = prev ? difference(prev, cur) : null;
    const fallback = (): Source => ({
      kind: 'point',
      pt: stable ? (turf.centroid(stable).geometry.coordinates as Position) : (loc.get(step.id) ?? [12.5, 41.9]),
    });
    const mk = (g: Poly | null): Source => {
      if (!g || !stable) return fallback();
      const s = simplified(g);
      return { kind: 'poly', geom: s, segs: segmentsOf(s) };
    };
    // 300 km², abaissé pour les petits territoires (sinon l'écart d'aire dépasse la tolérance).
    const minKm2 = Math.max(MIN_FRAG_KM2, Math.min(MIN_KM2, 0.003 * Math.min(areaKm2(prev), areaKm2(cur))));
    const gained = bands(gainedAll, mk(prev), minKm2);
    const lost = bands(lostAll, mk(cur), minKm2);
    let tol = TOL;
    let features = buildFeatures(stable, gained, lost, tol);
    let json = JSON.stringify({ type: 'FeatureCollection', features });
    while (Buffer.byteLength(json) > MAX_BYTES && tol < 0.2) {
      tol *= 1.4;
      features = buildFeatures(stable, gained, lost, tol);
      json = JSON.stringify({ type: 'FeatureCollection', features });
    }
    fs.writeFileSync(path.join(MORPH_DIR, `${step.id}.geojson`), json + '\n');
    total += Buffer.byteLength(json);
    prev = cur;
  }
  console.log(`✓ morph/ (${ROME_STEPS.length - 1} fichiers, ${(total / 1024).toFixed(0)} Ko, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

export function checkMorph(): boolean {
  const rows: string[][] = [['id', 'gained', 'lost', 'taille', 'Δ stable+gained/curr', 'Δ stable+lost/prev', '']];
  let ok = true;
  let prevArea = areaKm2(readMerged(ROME_STEPS[0].id));
  let total = 0;
  for (const step of ROME_STEPS.slice(1)) {
    const curArea = areaKm2(readMerged(step.id));
    const file = path.join(MORPH_DIR, `${step.id}.geojson`);
    if (!fs.existsSync(file)) {
      rows.push([step.id, '—', '—', '—', '—', '—', 'MANQUANT']);
      ok = false;
      continue;
    }
    const size = fs.statSync(file).size;
    total += size;
    const fc = JSON.parse(fs.readFileSync(file, 'utf8')) as FeatureCollection<Polygon | MultiPolygon, MorphProperties>;
    const sum = { stable: 0, gained: 0, lost: 0 };
    const cnt = { stable: 0, gained: 0, lost: 0 };
    let lastT = { gained: -1, lost: -1 };
    let problem = '';
    fc.features.forEach((f, i) => {
      const k = f.properties.kind;
      sum[k] += areaKm2(f);
      cnt[k]++;
      if (k === 'stable') {
        if (i !== 0 || f.properties.t !== 0) problem = 'stable mal placée';
      } else {
        if (f.properties.t < lastT[k] || f.properties.t <= 0 || f.properties.t > 1) problem = 'ordre/t invalide';
        lastT[k] = f.properties.t;
      }
    });
    const dc = ((sum.stable + sum.gained) / curArea - 1) * 100;
    const dp = ((sum.stable + sum.lost) / prevArea - 1) * 100;
    // Tolérance relative (3 %), ou absolue (±300 km²) pour les petits territoires.
    const tooFar = (rel: number, ref: number) => Math.abs(rel) > AREA_TOL * 100 && Math.abs((rel / 100) * ref) > ABS_TOL_KM2;
    if (tooFar(dc, curArea) || tooFar(dp, prevArea)) problem ||= 'écart d’aire > 3 % et > 300 km²';
    if (size > MAX_BYTES) problem ||= '> 120 Ko';
    if (problem) ok = false;
    rows.push([step.id, String(cnt.gained), String(cnt.lost), `${(size / 1024).toFixed(1)} Ko`, `${dc.toFixed(2)} %`, `${dp.toFixed(2)} %`, problem]);
    prevArea = curArea;
  }
  const w = rows[0].map((_, c) => Math.max(...rows.map((r) => r[c].length)));
  console.log('\nContrôle morph');
  for (const r of rows) console.log(r.map((v, c) => v.padEnd(w[c])).join(' | '));
  console.log(`Total morph : ${(total / 1024).toFixed(0)} Ko`);
  if (total > 2 * 1024 * 1024) ok = false;
  return ok;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] !== 'check') writeMorph();
  if (!checkMorph()) process.exit(1);
}
