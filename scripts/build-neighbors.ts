// Voisins de l'époque de chaque étape : public/data/empires/<id>/neighbors/<stepId>.geojson
//   - Point { kind: 'label', name (FR), area (km²) } au pôle d'inaccessibilité ;
//   - Point { kind: 'capital', name (ville), of (voisin) } : capitale de l'époque (data/capitals.json), si elle est
//     dans le voisin (tolérance CAPITAL_TOLERANCE_KM) et dans le cadre ;
//   - (Multi)LineString { kind: 'border' } : contour simplifié, découpé aux bounds de l'empire.
// Usage : tsx scripts/build-neighbors.ts [--empire <id>]
import fs from 'node:fs';
import path from 'node:path';
import * as turf from '@turf/turf';
// @ts-ignore — pas de typings fournis par le paquet
import polylabel from 'polylabel';
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import { ROOT, selectedEmpires, paths } from './empires/index.ts';
import { NEIGHBOR_NAMES } from './neighbor-names.ts';
import CAPITALS from '../data/capitals.json' with { type: 'json' };

type Capital = { city: string; at: [number, number]; from?: number; to?: number };
// Capitales souvent sur une frontière (Constantinople, Ctésiphon…) et contours simplifiés : marge de 200 km.
const CAPITAL_TOLERANCE_KM = 200;

/** Capitale du voisin valable à l'année donnée (intervalles from/to inclusifs). */
function capitalAt(name: string, year: number): Capital | undefined {
  return ((CAPITALS as unknown as Record<string, Capital[]>)[name] ?? []).find((c) => (c.from ?? -Infinity) <= year && year <= (c.to ?? Infinity));
}

type Poly = Feature<Polygon | MultiPolygon>;
const HB_DIR = path.join(ROOT, '.cache/historical-basemaps');
const DEFAULT_BOUNDS: [Position, Position] = [[-30, 5], [75, 66]];
/** Cadre des voisins par empire (les timelines n'ont plus de `bounds` depuis la carte du monde entier). */
const NEIGHBOR_BOUNDS: Record<string, [Position, Position]> = {
  china: [[55, 5], [150, 58]],
  mongols: [[2, 8], [146, 62]],
};
const MIN_AREA_KM2 = 30000;
const MAX_BYTES = 60 * 1024;

function snapYear(name: string): number {
  const m = /^world_(bc)?(\d+)$/.exec(name)!;
  return m[1] ? -Number(m[2]) : Number(m[2]);
}
const SNAPSHOTS = fs
  .readdirSync(HB_DIR)
  .filter((f) => /^world_(bc)?\d+\.geojson$/.test(f))
  .map((f) => f.replace('.geojson', ''))
  .sort((a, b) => snapYear(a) - snapYear(b));

/** Même règle que build-territories : le plus proche, antérieur préféré s'il n'est pas beaucoup plus loin. */
function pickSnapshot(year: number): string {
  let before: string | undefined;
  let after: string | undefined;
  for (const s of SNAPSHOTS) {
    if (snapYear(s) <= year) before = s;
    else if (!after) after = s;
  }
  if (!before) return after!;
  if (!after) return before;
  return year - snapYear(before) <= (snapYear(after) - year) * 1.25 ? before : after;
}

const snapCache = new Map<string, FeatureCollection>();
function loadSnap(name: string): FeatureCollection {
  let s = snapCache.get(name);
  if (!s) {
    s = JSON.parse(fs.readFileSync(path.join(HB_DIR, `${name}.geojson`), 'utf8')) as FeatureCollection;
    snapCache.set(name, s);
  }
  return s;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;
function roundCoords(c: unknown): unknown {
  return Array.isArray(c) && typeof c[0] === 'number' ? (c as number[]).map(r3) : (c as unknown[]).map(roundCoords);
}

function polys(f: Poly): Feature<Polygon>[] {
  return f.geometry.type === 'Polygon' ? [f as Feature<Polygon>] : f.geometry.coordinates.map((c) => turf.polygon(c));
}

interface Timeline {
  bounds?: [Position, Position];
  steps: { id: string; year: number; territory: string }[];
}

const missing = new Set<string>();
const stats: Record<string, { files: number; neighbors: number; capitals: number; maxBytes: number; farCapitals: Set<string> }> = {};

for (const cfg of selectedEmpires()) {
  const tl = JSON.parse(fs.readFileSync(paths(cfg.id).timeline, 'utf8')) as Timeline;
  const bounds = tl.bounds ?? NEIGHBOR_BOUNDS[cfg.id] ?? DEFAULT_BOUNDS;
  const bbox: [number, number, number, number] = [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]];
  const outDir = path.join(ROOT, 'public/data/empires', cfg.id, 'neighbors');
  fs.mkdirSync(outDir, { recursive: true });
  const st = (stats[cfg.id] = { files: 0, neighbors: 0, capitals: 0, maxBytes: 0, farCapitals: new Set<string>() });

  for (const step of tl.steps) {
    const cs = cfg.steps.find((s) => s.id === step.id);
    const snapName = cs?.snapshot ?? pickSnapshot(step.year);
    const terr = JSON.parse(
      fs.readFileSync(path.join(paths(cfg.id).territories, `${step.territory}.geojson`), 'utf8'),
    ) as FeatureCollection<Polygon | MultiPolygon>;
    const terrNames = new Set(terr.features.map((f) => String(f.properties?.name).toLowerCase()));
    const terrUnion: Poly | null = terr.features.length
      ? terr.features.length === 1
        ? terr.features[0]
        : (turf.union(turf.featureCollection(terr.features)) as Poly)
      : null;

    // regroupe les entités de même NAME dont la bbox touche les bounds
    const byName = new Map<string, Poly[]>();
    for (const f of loadSnap(snapName).features) {
      const n = (f.properties?.NAME as string | null)?.trim();
      if (!n || !f.geometry) continue;
      const g = f as Poly;
      const bb = turf.bbox(g);
      if (bb[0] > bbox[2] || bb[2] < bbox[0] || bb[1] > bbox[3] || bb[3] < bbox[1]) continue;
      const l = byName.get(n);
      if (l) l.push(g);
      else byName.set(n, [g]);
    }

    const kept: { fr: string; area: number; geom: Poly }[] = [];
    for (const [name, list] of byName) {
      const geom: Poly =
        list.length === 1
          ? list[0]
          : turf.feature({ type: 'MultiPolygon', coordinates: list.flatMap((f) => polys(f).map((p) => p.geometry.coordinates)) });
      const area = turf.area(geom) / 1e6;
      if (area < MIN_AREA_KM2) continue;
      const fr = NEIGHBOR_NAMES[name];
      if (!fr) {
        missing.add(name);
        continue;
      }
      if (terrNames.has(fr.toLowerCase()) || terrNames.has(name.toLowerCase())) continue;
      if (terrUnion) {
        let inter: Poly | null = null;
        try {
          inter = turf.intersect(turf.featureCollection([geom, terrUnion])) as Poly | null;
        } catch {
          inter = null;
        }
        if (inter && turf.area(inter) / 1e6 > 0.5 * area) continue;
      }
      kept.push({ fr, area, geom });
    }
    if (missing.size) continue;

    let tol = 0.05;
    let text = '';
    for (let attempt = 0; attempt < 12; attempt++) {
      const feats: Feature[] = [];
      for (const k of kept) {
        // étiquette : plus grand polygone, découpé aux bounds pour rester dans le cadre
        const clippedParts = polys(k.geom)
          .map((p) => {
            try {
              return turf.bboxClip(p, bbox) as Feature<Polygon | MultiPolygon>;
            } catch {
              return null;
            }
          })
          .filter((p): p is Feature<Polygon | MultiPolygon> => !!p && p.geometry.coordinates.length > 0)
          .flatMap((p) => polys(p));
        if (!clippedParts.length) continue; // l'entité ne touche pas réellement le cadre
        const pool = clippedParts;
        const biggest = pool.reduce((a, b) => (turf.area(b) > turf.area(a) ? b : a));
        const pt = polylabel(biggest.geometry.coordinates as number[][][], 0.05);
        feats.push(turf.point([r3(pt[0]), r3(pt[1])], { kind: 'label', name: k.fr, area: Math.round(k.area) }));
        const cap = capitalAt(k.fr, step.year);
        if (cap && turf.booleanPointInPolygon(cap.at, turf.bboxPolygon(bbox))) {
          const near = polys(k.geom).some((p) => turf.booleanPointInPolygon(cap.at, p) || turf.pointToPolygonDistance(cap.at, p, { units: 'kilometers' }) <= CAPITAL_TOLERANCE_KM);
          if (near) {
            feats.push(turf.point(cap.at, { kind: 'capital', name: cap.city, of: k.fr }));
            if (attempt === 0) st.capitals++;
          }
          else if (attempt === 0) st.farCapitals.add(`${k.fr} → ${cap.city} (${Math.round(Math.min(...polys(k.geom).map((p) => turf.pointToPolygonDistance(cap.at, p, { units: 'kilometers' }))))} km)`);
        }

        const lines = turf.polygonToLine(k.geom) as Feature<any>;
        const flat: any[] = (lines as any).type === 'FeatureCollection' ? (lines as any).features : [lines];
        const segs: number[][][] = [];
        for (const l of flat) {
          const ls: number[][][] = l.geometry.type === 'LineString' ? [l.geometry.coordinates] : l.geometry.coordinates;
          for (const c of ls) {
            try {
              const line = turf.simplify(turf.lineString(c as number[][]), { tolerance: tol, highQuality: true });
              const cg = turf.bboxClip(line, bbox).geometry;
              if (cg.type === 'LineString') segs.push(cg.coordinates);
              else segs.push(...(cg.coordinates as number[][][]));
            } catch {
              /* ligne dégénérée */
            }
          }
        }
        const good = segs.filter((s) => s.length >= 2);
        if (good.length)
          feats.push({
            type: 'Feature',
            properties: { kind: 'border' },
            geometry:
              good.length === 1
                ? { type: 'LineString', coordinates: roundCoords(good[0]) as number[][] }
                : { type: 'MultiLineString', coordinates: roundCoords(good) as number[][][] },
          });
      }
      text = JSON.stringify(turf.featureCollection(feats));
      if (Buffer.byteLength(text) <= MAX_BYTES) break;
      tol *= 1.6;
    }
    fs.writeFileSync(path.join(outDir, `${step.id}.geojson`), text);
    st.files++;
    st.neighbors += kept.length;
    st.maxBytes = Math.max(st.maxBytes, Buffer.byteLength(text));
  }
}

if (missing.size) {
  console.error(`✗ ${missing.size} noms sans traduction dans scripts/neighbor-names.ts :`);
  console.error([...missing].sort().map((n) => `  ${JSON.stringify(n)}: '',`).join('\n'));
  process.exit(1);
}
console.log('empire    | fichiers | voisins moy. | capitales | taille max');
for (const [id, s] of Object.entries(stats))
  console.log(`${id.padEnd(9)} | ${String(s.files).padStart(8)} | ${(s.neighbors / Math.max(1, s.files)).toFixed(1).padStart(12)} | ${String(s.capitals).padStart(9)} | ${(s.maxBytes / 1024).toFixed(1)} Ko`);
for (const [id, s] of Object.entries(stats))
  if (s.farCapitals.size) console.log(`  ${id} : capitales hors du voisin (ignorées) : ${[...s.farCapitals].join(', ')}`);
