// Données du calque « Religions » (issue #81) → public/data/religions/ :
//   hb/<instantané>.geojson     polygones historical-basemaps ayant une religion (data/religions/historical.json), simplifiés ;
//   countries-2026.geojson      pays actuels (data/religions/countries.json) ;
//   territories.json            empire → étape → { snapshot, entities: nom → religion } (data/religions/territories.json).
// Usage : tsx scripts/build-religions.ts
import fs from 'node:fs';
import path from 'node:path';
import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { ROOT, EMPIRES, paths } from './empires/index.ts';
import { emptyDir } from './fs-utils.ts';
import { NEIGHBOR_NAMES } from './neighbor-names.ts';
import { SNAPSHOTS, snapYear, pickSnapshot, loadSnap } from './snapshots.ts';
import { religionAt, type CountryReligions, type ReligionPeriod, type TerritoryReligions } from '../src/types-religion.ts';

type Poly = Feature<Polygon | MultiPolygon>;
const readJson = <T>(f: string) => JSON.parse(fs.readFileSync(f, 'utf8')) as T;
const OUT = path.join(ROOT, 'public/data/religions');
const MIN_AREA_KM2 = 3000;
const HB_MAX = 150 * 1024;
const COUNTRIES_MAX = 600 * 1024;

const historical = readJson<Record<string, ReligionPeriod[]>>(path.join(ROOT, 'data/religions/historical.json'));
const countries = readJson<CountryReligions>(path.join(ROOT, 'data/religions/countries.json'));
const territories = readJson<TerritoryReligions>(path.join(ROOT, 'data/religions/territories.json'));

const round = (c: unknown, d: number): unknown =>
  Array.isArray(c) && typeof c[0] === 'number' ? (c as number[]).map((n) => Math.round(n * 10 ** d) / 10 ** d) : (c as unknown[]).map((x) => round(x, d));

const polygonsOf = (f: Poly): number[][][][] => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates);

/** Simplifie de plus en plus fort jusqu'à tenir sous maxBytes ; renvoie le texte JSON. */
function fit(feats: Poly[], maxBytes: number, tol: number): string {
  let text = '';
  for (let i = 0; i < 14; i++) {
    const out = feats.flatMap((f) => {
      try {
        const s = turf.simplify(f, { tolerance: tol, highQuality: false });
        const g = { ...s.geometry, coordinates: round(s.geometry.coordinates, tol >= 0.1 ? 2 : 3) } as Polygon | MultiPolygon;
        return g.coordinates.length ? [{ ...s, geometry: g }] : [];
      } catch {
        return [];
      }
    });
    text = JSON.stringify(turf.featureCollection(out));
    if (Buffer.byteLength(text) <= maxBytes) break;
    tol *= 1.5;
  }
  return text;
}

emptyDir(OUT);

// 1. Instantanés historiques
const missingNames = new Set<string>();
let total = 0;
let maxHb = 0;
fs.mkdirSync(path.join(OUT, 'hb'), { recursive: true });
for (const snap of SNAPSHOTS) {
  const year = snapYear(snap);
  const byName = new Map<string, number[][][][]>();
  for (const f of loadSnap(snap).features) {
    const n = (f.properties?.NAME as string | null)?.trim();
    if (!n || !f.geometry || !religionAt(historical[n], year)) continue;
    byName.set(n, [...(byName.get(n) ?? []), ...polygonsOf(f as Poly)]);
  }
  const feats: Poly[] = [];
  for (const n of [...byName.keys()].sort()) {
    const geom = turf.feature({ type: 'MultiPolygon', coordinates: byName.get(n)! }) as Poly;
    if (turf.area(geom) / 1e6 < MIN_AREA_KM2) continue;
    const p = religionAt(historical[n], year)!;
    if (!NEIGHBOR_NAMES[n]) missingNames.add(n);
    geom.properties = { name: NEIGHBOR_NAMES[n] ?? n, religion: p.religion, ...(p.minorities?.length ? { minorities: p.minorities } : {}) };
    feats.push(geom);
  }
  const text = fit(feats, HB_MAX, 0.05);
  fs.writeFileSync(path.join(OUT, 'hb', `${snap}.geojson`), text);
  total += Buffer.byteLength(text);
  maxHb = Math.max(maxHb, Buffer.byteLength(text));
}

// Liste des instantanés : la vue monde choisit le plus proche d'une année côté navigateur.
fs.writeFileSync(path.join(OUT, 'snapshots.json'), JSON.stringify(SNAPSHOTS));

// 2. Pays actuels
const ne = readJson<FeatureCollection<Polygon | MultiPolygon>>(path.join(ROOT, '.cache/natural-earth/ne_50m_admin_0_countries.geojson'));
const cfeats: Poly[] = [];
for (const f of ne.features) {
  const r = countries[String(f.properties?.ADM0_A3)];
  if (!r) continue;
  const name = String(f.properties?.NAME_FR ?? f.properties?.NAME ?? '').trim() || String(f.properties?.NAME);
  cfeats.push({ ...f, properties: { name, religion: r.religion, ...(r.minorities?.length ? { minorities: r.minorities } : {}) } });
}
cfeats.sort((a, b) => String(a.properties!.name).localeCompare(String(b.properties!.name)));
const ctext = fit(cfeats, COUNTRIES_MAX, 0.02);
fs.writeFileSync(path.join(OUT, 'countries-2026.geojson'), ctext);

// 3. Religion des entités de chaque empire, par étape
interface Timeline {
  steps: { id: string; year: number; territory: string }[];
}
const outT: Record<string, Record<string, { snapshot: string; entities: Record<string, object> }>> = {};
for (const cfg of EMPIRES) {
  const tl = readJson<Timeline>(paths(cfg.id).timeline);
  const table = territories[cfg.id] ?? {};
  outT[cfg.id] = {};
  for (const step of tl.steps) {
    const file = path.join(paths(cfg.id).territories, `${step.territory}.geojson`);
    const names = fs.existsSync(file) ? readJson<FeatureCollection>(file).features.map((f) => String(f.properties?.name)) : [];
    const entities: Record<string, object> = {};
    for (const n of [...new Set(names)].sort()) {
      const p = religionAt(table[n], step.year);
      if (p) entities[n] = { religion: p.religion, ...(p.minorities?.length ? { minorities: p.minorities } : {}), ...(p.note ? { note: p.note } : {}) };
    }
    outT[cfg.id][step.id] = { snapshot: cfg.steps.find((s) => s.id === step.id)?.snapshot ?? pickSnapshot(step.year), entities };
  }
}
const ttext = JSON.stringify(outT);
fs.writeFileSync(path.join(OUT, 'territories.json'), ttext);

if (missingNames.size) console.warn(`! sans traduction dans neighbor-names.ts (nom anglais gardé) : ${[...missingNames].sort().join(', ')}`);
const ko = (n: number) => `${(n / 1024).toFixed(1)} Ko`;
console.log(
  `hb : ${SNAPSHOTS.length} fichiers, ${ko(total)} au total, max ${ko(maxHb)} | pays : ${ko(Buffer.byteLength(ctext))} | territories.json : ${ko(Buffer.byteLength(ttext))}`,
);
