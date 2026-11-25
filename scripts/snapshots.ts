// Instantanés historical-basemaps (.cache/historical-basemaps/world_*.geojson), partagés par build-neighbors et build-religions.
import fs from 'node:fs';
import path from 'node:path';
import type { FeatureCollection } from 'geojson';
import { ROOT } from './empires/index.ts';

export const HB_DIR = path.join(ROOT, '.cache/historical-basemaps');

export function snapYear(name: string): number {
  const m = /^world_(bc)?(\d+)$/.exec(name)!;
  return m[1] ? -Number(m[2]) : Number(m[2]);
}

export const SNAPSHOTS = fs
  .readdirSync(HB_DIR)
  .filter((f) => /^world_(bc)?\d+\.geojson$/.test(f))
  .map((f) => f.replace('.geojson', ''))
  .sort((a, b) => snapYear(a) - snapYear(b));

/** Même règle que build-territories : le plus proche, antérieur préféré s'il n'est pas beaucoup plus loin. */
export function pickSnapshot(year: number): string {
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
export function loadSnap(name: string): FeatureCollection {
  let s = snapCache.get(name);
  if (!s) {
    s = JSON.parse(fs.readFileSync(path.join(HB_DIR, `${name}.geojson`), 'utf8')) as FeatureCollection;
    snapCache.set(name, s);
  }
  return s;
}
