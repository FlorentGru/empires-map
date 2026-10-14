import type { Position } from 'geojson';
import polylabel from 'polylabel';
import type { TerritoryCollection } from './loadEmpire';

export interface LabelPoint {
  /** Index de la feature dans la collection (détermine la couleur de l'entité). */
  index: number;
  coords: [number, number];
  /** Aire totale de l'entité, en km². */
  area: number;
}

const KM_PER_DEG = 111.19;

/** Aire planaire d'un anneau, en degrés² corrigés de cos(lat) (suffisant pour classer les États). */
function ringArea(ring: Position[]): number {
  let sum = 0;
  let latSum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    latSum += ring[i][1];
  }
  const lat = ring.length > 1 ? latSum / (ring.length - 1) : 0;
  return Math.abs(sum / 2) * Math.cos((lat * Math.PI) / 180);
}

function polygonAreaKm2(poly: Position[][]): number {
  let a = ringArea(poly[0] ?? []);
  for (let i = 1; i < poly.length; i++) a -= ringArea(poly[i]);
  return Math.max(0, a) * KM_PER_DEG * KM_PER_DEG;
}

/** Point d'étiquette (polylabel sur le plus grand polygone) et aire de chaque entité. */
export function computeLabelPoints(fc: TerritoryCollection): LabelPoint[] {
  const out: LabelPoint[] = [];
  fc.features.forEach((f, index) => {
    const g = f.geometry;
    if (!g) return;
    const polys: Position[][][] = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    let best: Position[][] | null = null;
    let bestArea = -1;
    let total = 0;
    for (const p of polys) {
      const a = polygonAreaKm2(p);
      total += a;
      if (a > bestArea) {
        best = p;
        bestArea = a;
      }
    }
    if (!best || best.length === 0) return;
    try {
      const pt = polylabel(best as number[][][], 0.05);
      out.push({ index, coords: [pt[0], pt[1]], area: total });
    } catch {
      /* géométrie dégénérée : pas d'étiquette */
    }
  });
  return out;
}

const cache = new WeakMap<TerritoryCollection, LabelPoint[]>();

/** Points d'étiquette d'une collection (calculés au chargement par loadTerritory, puis mis en cache). */
export function labelPointsOf(fc: TerritoryCollection): LabelPoint[] {
  let v = cache.get(fc);
  if (!v) {
    v = computeLabelPoints(fc);
    cache.set(fc, v);
  }
  return v;
}
