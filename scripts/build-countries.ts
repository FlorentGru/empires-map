// Génère public/data/basemap/countries-2026.geojson : frontières terrestres actuelles
// (segments partagés par ≥ 2 pays, donc sans les côtes) + étiquettes de pays.
// Usage seul : npx tsx scripts/build-countries.ts (aussi appelé par npm run build:data).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, LineString, MultiLineString, Point, Position } from 'geojson';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, '.cache/natural-earth/ne_50m_admin_0_countries.geojson');
const OUT = path.join(ROOT, 'public/data/basemap/countries-2026.geojson');
const BBOX: [number, number, number, number] = [-180, -60, 180, 84];
const TOLERANCE = 0.04;
const MAX_BYTES = 220 * 1024; // monde entier

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const key = (p: Position) => `${r3(p[0])},${r3(p[1])}`;

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function rings(g: { type: string; coordinates: unknown }): Position[][] {
  if (g.type === 'Polygon') return g.coordinates as Position[][];
  if (g.type === 'MultiPolygon') return (g.coordinates as Position[][][]).flat();
  return [];
}

function main() {
  if (!fs.existsSync(SRC)) fail(`${SRC} absent — lancer d'abord npm run fetch:data`);
  const fc = JSON.parse(fs.readFileSync(SRC, 'utf8')) as FeatureCollection;

  // Segments (extrémités arrondies, ordre normalisé) → ensemble de pays.
  const segs = new Map<string, Set<number>>();
  fc.features.forEach((f, idx) => {
    for (const ring of rings(f.geometry as never)) {
      for (let i = 0; i + 1 < ring.length; i++) {
        const a = key(ring[i]);
        const b = key(ring[i + 1]);
        if (a === b) continue;
        const k = a < b ? `${a}|${b}` : `${b}|${a}`;
        let s = segs.get(k);
        if (!s) segs.set(k, (s = new Set()));
        s.add(idx);
      }
    }
  });

  // Ne garde que les segments partagés, puis les chaîne en polylignes.
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a)!.add(b);
  };
  for (const [k, s] of segs) {
    if (s.size < 2) continue;
    const [a, b] = k.split('|');
    link(a, b);
    link(b, a);
  }
  const parse = (k: string): Position => k.split(',').map(Number);
  const used = new Set<string>();
  const ek = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const walk = (start: string, first: string): Position[] => {
    const line = [parse(start)];
    let prev = start;
    let cur = first;
    used.add(ek(prev, cur));
    for (;;) {
      line.push(parse(cur));
      const deg = adj.get(cur)!;
      if (deg.size !== 2) break;
      const next = [...deg].find((n) => n !== prev && !used.has(ek(cur, n)));
      if (!next) break;
      used.add(ek(cur, next));
      prev = cur;
      cur = next;
    }
    return line;
  };
  const lines: Position[][] = [];
  // D'abord depuis les nœuds de degré ≠ 2, puis les boucles restantes.
  for (const [n, deg] of adj) {
    if (deg.size === 2) continue;
    for (const m of deg) if (!used.has(ek(n, m))) lines.push(walk(n, m));
  }
  for (const [n, deg] of adj) for (const m of deg) if (!used.has(ek(n, m))) lines.push(walk(n, m));

  const features: Feature[] = [];
  let kept = 0;
  for (const coords of lines) {
    const ls: Feature<LineString> = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } };
    const simp = turf.simplify(ls, { tolerance: TOLERANCE, highQuality: true });
    const clipped = turf.bboxClip(simp, BBOX) as Feature<LineString | MultiLineString>;
    const parts: Position[][] = clipped.geometry.type === 'LineString' ? [clipped.geometry.coordinates] : clipped.geometry.coordinates;
    const good = parts.map((p) => p.map((c) => [r3(c[0]), r3(c[1])])).filter((p) => p.length >= 2);
    if (!good.length) continue;
    kept++;
    features.push({
      type: 'Feature',
      properties: { kind: 'border' },
      geometry: good.length === 1 ? { type: 'LineString', coordinates: good[0] } : { type: 'MultiLineString', coordinates: good },
    });
  }

  let labels = 0;
  for (const f of fc.features) {
    const p = (f.properties ?? {}) as Record<string, unknown>;
    const x = Number(p.LABEL_X);
    const y = Number(p.LABEL_Y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < BBOX[0] || x > BBOX[2] || y < BBOX[1] || y > BBOX[3]) continue;
    const name = String(p.NAME_FR ?? p.NAME ?? '').trim() || String(p.NAME);
    const point: Feature<Point> = {
      type: 'Feature',
      properties: { kind: 'label', name, rank: Number(p.LABELRANK) },
      geometry: { type: 'Point', coordinates: [r3(x), r3(y)] },
    };
    features.push(point);
    labels++;
  }

  const json = JSON.stringify({ type: 'FeatureCollection', features });
  if (Buffer.byteLength(json) > MAX_BYTES) fail(`countries-2026.geojson trop gros (${Buffer.byteLength(json)} o)`);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json + '\n');
  console.log(`✓ basemap/countries-2026.geojson (${kept} lignes, ${labels} labels, ${(fs.statSync(OUT).size / 1024).toFixed(0)} Ko)`);
}

main();
