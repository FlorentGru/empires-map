// Empires contemporains de chaque étape : public/data/empires/<E>/contemporaries/<stepId>.geojson
// Pour l'étape S (année Y) de E : territoires des autres empires F existant en Y (étape de F la plus récente
// d'année ≤ Y), core/vassal seulement, privés de l'emprise de E à S, parties < 5000 km² supprimées.
// Usage : npx tsx scripts/build-contemporaries.ts   (toujours tous les empires)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { Empire, TerritoryProperties } from '../src/types.ts';
import { existsAt, lastStepAtOrBefore } from '../src/lib/contemporaries.ts';
import { emptyDir } from './fs-utils.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EMPIRES_DATA = path.join(ROOT, 'data/empires');
const EMPIRES_PUB = path.join(ROOT, 'public/data/empires');
const MIN_AREA_KM2 = 5000;
const MIN_CLIPPED_KM2 = 30000;
const MASK_BUFFER_KM = 30;

type Poly = Feature<Polygon | MultiPolygon>;
type Terr = FeatureCollection<Polygon | MultiPolygon, TerritoryProperties>;

const r3 = (n: number) => Math.round(n * 1000) / 1000;
function roundCoords(c: unknown): unknown {
  return Array.isArray(c) && typeof c[0] === 'number' ? (c as number[]).map(r3) : (c as unknown[]).map(roundCoords);
}

const ids = fs.readdirSync(EMPIRES_DATA).filter((id) => !id.startsWith('_') && fs.existsSync(path.join(EMPIRES_DATA, id, 'timeline.json')));
const empires = new Map<string, Empire>();
for (const id of ids) empires.set(id, JSON.parse(fs.readFileSync(path.join(EMPIRES_DATA, id, 'timeline.json'), 'utf8')) as Empire);

const terrCache = new Map<string, Terr>();
function loadTerr(id: string, territory: string): Terr {
  const k = `${id}/${territory}`;
  let t = terrCache.get(k);
  if (!t) {
    t = JSON.parse(fs.readFileSync(path.join(EMPIRES_PUB, id, 'territories', `${territory}.geojson`), 'utf8')) as Terr;
    terrCache.set(k, t);
  }
  return t;
}

function union(feats: Poly[]): Poly | null {
  if (!feats.length) return null;
  if (feats.length === 1) return feats[0];
  try {
    return turf.union(turf.featureCollection(feats)) as Poly | null;
  } catch {
    return null;
  }
}

/** Retire `mask` de `g`. Échec : garde g s'il ne recoupe pas le masque, sinon null. */
function subtract(g: Poly, mask: Poly | null): Poly | null {
  if (!mask) return g;
  try {
    return turf.difference(turf.featureCollection([g, mask])) as Poly | null;
  } catch {
    try {
      return turf.booleanIntersects(g, mask) ? null : g;
    } catch {
      return null;
    }
  }
}

/** Parties ≥ 5000 km², simplifiées et arrondies ; null s'il n'en reste aucune. */
function clean(g: Poly, minKm2: number): Polygon | MultiPolygon | null {
  const parts = (g.geometry.type === 'Polygon' ? [g.geometry.coordinates] : g.geometry.coordinates).filter((c) => turf.area(turf.polygon(c)) / 1e6 >= minKm2);
  if (!parts.length) return null;
  let out: Poly = turf.feature({ type: 'MultiPolygon', coordinates: parts });
  try {
    out = turf.simplify(out, { tolerance: 0.05, highQuality: false }) as Poly;
  } catch {
    /* garde la géométrie brute */
  }
  const geom = out.geometry;
  const coords = roundCoords(geom.coordinates) as never;
  return parts.length === 1 && geom.type === 'MultiPolygon' && geom.coordinates.length === 1
    ? { type: 'Polygon', coordinates: (coords as number[][][][])[0] }
    : ({ type: geom.type, coordinates: coords } as Polygon | MultiPolygon);
}

for (const [eid, E] of empires) {
  const outDir = path.join(EMPIRES_PUB, eid, 'contemporaries');
  emptyDir(outDir);
  let files = 0;
  let bytes = 0;
  const seen = new Set<string>();
  for (const step of E.steps) {
    const mine = loadTerr(eid, step.territory).features.filter((f) => f.geometry) as Poly[];
    const raw = union(mine);
    // léger tampon : absorbe les liserés dus aux contours légèrement différents d'un empire à l'autre
    let mask = raw;
    try {
      if (raw) mask = (turf.buffer(raw, MASK_BUFFER_KM, { units: 'kilometers' }) as Poly | undefined) ?? raw;
    } catch {
      /* garde l'union brute */
    }
    const feats: Feature<Polygon | MultiPolygon>[] = [];
    for (const [fid, F] of empires) {
      if (fid === eid || !existsAt(F, step.year)) continue;
      const fs_ = lastStepAtOrBefore(F.steps, step.year);
      if (!fs_) continue;
      for (const f of loadTerr(fid, fs_.territory).features) {
        const status = f.properties.status ?? 'core';
        if (!f.geometry || (status !== 'core' && status !== 'vassal')) continue;
        const rest = subtract(f as Poly, mask);
        // Entité largement recouverte par E (mêmes terres, contours un peu différents) : on ne garde que de vrais blocs.
        const clipped = rest && turf.area(rest) < 0.5 * turf.area(f);
        const geom = rest && clean(rest, clipped ? MIN_CLIPPED_KM2 : MIN_AREA_KM2);
        if (!geom) continue;
        seen.add(F.name);
        feats.push({
          type: 'Feature',
          properties: {
            empire: fid,
            empireName: F.name.split(',')[0]!.trim(),
            name: f.properties.name,
            color: F.color,
            stepId: fs_.id,
            year: fs_.year,
            status,
          },
          geometry: geom,
        });
      }
    }
    if (!feats.length) continue;
    const json = JSON.stringify({ type: 'FeatureCollection', features: feats });
    fs.writeFileSync(path.join(outDir, `${step.id}.geojson`), json);
    files++;
    bytes += json.length;
  }
  console.log(`${eid} : ${files}/${E.steps.length} étapes avec contemporains, ${(bytes / 1024).toFixed(0)} Ko — ${[...seen].join(' ; ') || 'aucun'}`);
}
