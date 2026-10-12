import { area, difference, featureCollection, union } from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { TerritoryCollection } from '../data/loadEmpire';
import { prefersReducedMotion, tween } from '../lib/motion';

type Poly = Feature<Polygon | MultiPolygon>;
export type DiffKind = 'gained' | 'lost';
export type DiffCollection = FeatureCollection<Polygon | MultiPolygon, { kind: DiffKind }>;

const EMPTY: DiffCollection = { type: 'FeatureCollection', features: [] };
/** En dessous (m²), une différence est considérée comme un artefact de géométrie. */
const MIN_AREA_M2 = 2e9;
export const HIGHLIGHT_MS = 2000;

function merge(fc: TerritoryCollection): Poly | null {
  const polys = fc.features.filter((f) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'));
  if (polys.length === 0) return null;
  if (polys.length === 1) return polys[0] as Poly;
  return union(featureCollection(polys as Poly[]));
}

function minus(a: Poly | null, b: Poly | null): Poly | null {
  if (!a) return null;
  if (!b) return a;
  return difference(featureCollection([a, b]));
}

/** Zones gagnées / perdues entre deux étapes. Toute erreur de géométrie → pas de diff. */
export function computeDiff(prev: TerritoryCollection | null, curr: TerritoryCollection): DiffCollection {
  if (!prev || prev.features.length === 0) return EMPTY;
  try {
    const a = merge(prev);
    const b = merge(curr);
    const out: DiffCollection['features'] = [];
    const push = (f: Poly | null, kind: DiffKind) => {
      if (f && area(f) > MIN_AREA_M2) out.push({ type: 'Feature', properties: { kind }, geometry: f.geometry });
    };
    push(minus(b, a), 'gained');
    push(minus(a, b), 'lost');
    return { type: 'FeatureCollection', features: out };
  } catch (err) {
    console.warn('[diff] calcul impossible, surbrillance ignorée :', err);
    return EMPTY;
  }
}

/** Surbrillance qui clignote puis s'estompe (~2 s). */
export class DiffHighlight {
  private cancel: () => void = () => {};
  private timer = 0;

  constructor(private map: MapLibreMap, beforeId?: string) {
    map.addSource('diff', { type: 'geojson', data: EMPTY });
    const color = ['match', ['get', 'kind'], 'gained', '#2f8a3a', '#b3261e'] as const;
    map.addLayer(
      {
        id: 'diff-fill',
        type: 'fill',
        source: 'diff',
        paint: { 'fill-color': color as never, 'fill-opacity': 0, 'fill-opacity-transition': { duration: 0 } },
      },
      beforeId,
    );
    map.addLayer(
      {
        id: 'diff-line',
        type: 'line',
        source: 'diff',
        paint: { 'line-color': color as never, 'line-width': 2, 'line-opacity': 0, 'line-opacity-transition': { duration: 0 } },
      },
      beforeId,
    );
  }

  private setOpacity(k: number) {
    this.map.setPaintProperty('diff-fill', 'fill-opacity', 0.6 * k);
    this.map.setPaintProperty('diff-line', 'line-opacity', k);
  }

  flash(diff: DiffCollection) {
    this.stop();
    if (diff.features.length === 0) return;
    (this.map.getSource('diff') as GeoJSONSource | undefined)?.setData(diff);
    if (prefersReducedMotion()) {
      // Pas de clignotement : affichage fixe puis retrait.
      this.setOpacity(0.6);
      this.timer = window.setTimeout(() => this.setOpacity(0), HIGHLIGHT_MS);
      return;
    }
    this.cancel = tween(HIGHLIGHT_MS, (t) => {
      const blink = 0.55 + 0.45 * Math.cos(t * Math.PI * 6); // 3 pulsations
      const fade = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      this.setOpacity(blink * fade);
    });
  }

  stop() {
    this.cancel();
    window.clearTimeout(this.timer);
    this.setOpacity(0);
  }

  destroy() {
    this.cancel();
    window.clearTimeout(this.timer);
  }
}
