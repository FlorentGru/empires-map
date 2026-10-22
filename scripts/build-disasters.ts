// Zones de guerre découpées sur les terres : public/data/disaster-areas.geojson (une entité par guerre, propriété `id`).
// Zone = enveloppe convexe des points `area` de data/disasters.json, intersectée avec le fond de terres affiché
// (public/data/basemap/land.geojson, écrit par build-territories) : la mer n'est plus hachurée.
// Usage : npx tsx scripts/build-disasters.ts   (après build-territories, qui produit le fond de terres)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import type { Disaster } from '../src/types-disaster.ts';
import { convexHull } from '../src/lib/worldEvents.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DISASTERS = path.join(ROOT, 'data/disasters.json');
const LAND = path.join(ROOT, 'public/data/basemap/land.geojson');
const OUT = path.join(ROOT, 'public/data/disaster-areas.geojson');
/** Îlots plus petits ignorés (invisibles à l'échelle d'une guerre, et autant d'octets en moins). */
const MIN_PART_KM2 = 300;

type Poly = Feature<Polygon | MultiPolygon>;

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

const r2 = (n: number) => Math.round(n * 100) / 100;
function roundCoords(c: unknown): unknown {
  return Array.isArray(c) && typeof c[0] === 'number' ? (c as number[]).map(r2) : (c as unknown[]).map(roundCoords);
}

if (!fs.existsSync(LAND)) fail(`${LAND} absent — lancer d'abord tsx scripts/build-territories.ts`);
const land = (JSON.parse(fs.readFileSync(LAND, 'utf8')) as FeatureCollection<Polygon | MultiPolygon>).features.map((f) => ({
  feature: f as Poly,
  bbox: turf.bbox(f),
}));
const disasters = JSON.parse(fs.readFileSync(DISASTERS, 'utf8')) as Disaster[];

const bboxOverlap = (a: number[], b: number[]) => a[0]! <= b[2]! && a[2]! >= b[0]! && a[1]! <= b[3]! && a[3]! >= b[1]!;

/** Morceaux de terre de la zone (les masses terrestres sont disjointes : simple concaténation). */
function clipToLand(zone: Feature<Polygon>): Position[][][] {
  const bb = turf.bbox(zone);
  const out: Position[][][] = [];
  for (const lp of land) {
    if (!bboxOverlap(bb, lp.bbox)) continue;
    const i = turf.intersect(turf.featureCollection([zone, lp.feature])) as Poly | null;
    if (!i) continue;
    const polys = i.geometry.type === 'Polygon' ? [i.geometry.coordinates] : i.geometry.coordinates;
    for (const p of polys) if (turf.area(turf.polygon(p)) / 1e6 >= MIN_PART_KM2) out.push(p);
  }
  return out;
}

const features: Feature<MultiPolygon, { id: string }>[] = [];
for (const d of disasters) {
  if (d.kind !== 'guerre' || (d.area?.length ?? 0) < 3) continue;
  const parts = clipToLand(turf.polygon([convexHull(d.area!)]));
  if (parts.length === 0) fail(`${d.id} : zone entièrement en mer`);
  features.push({ type: 'Feature', properties: { id: d.id }, geometry: { type: 'MultiPolygon', coordinates: roundCoords(parts) as Position[][][] } });
}

fs.writeFileSync(OUT, JSON.stringify({ type: 'FeatureCollection', features }) + '\n');
console.log(`✓ disaster-areas.geojson (${features.length} zones de guerre, ${(fs.statSync(OUT).size / 1024).toFixed(0)} Ko)`);
