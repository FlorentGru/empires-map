import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { MorphCollection } from '../data/loadEmpire';
import { DIFF_COLORS } from './diff';
import { FILL_OPACITY } from './territoryLayers';
import { variantFill } from './color';

export const MORPH_MS = 1600;
const STEPS = 48; // quantification de la progression : au plus 49 mises à jour de peinture
const FRONT = 0.08; // largeur (en t) du front teinté
const TINT = 0.4;

const EMPTY: MorphCollection = { type: 'FeatureCollection', features: [] };

const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

type Expr = unknown[];

/** Opacité du fill : stable toujours, gained quand t ≤ p, lost tant que t < 1 − p. */
function opacityExpr(p: number): Expr {
  return [
    'case',
    ['==', ['get', 'kind'], 'stable'],
    FILL_OPACITY,
    ['==', ['get', 'kind'], 'gained'],
    ['case', ['<=', ['get', 't'], p], FILL_OPACITY, 0],
    ['case', ['<', ['get', 't'], 1 - p], FILL_OPACITY, 0],
  ];
}

/** Opacité de la teinte : front vert (gained récents) et rouge (lost sur le point de disparaître). */
function tintExpr(p: number): Expr {
  return [
    'case',
    ['==', ['get', 'kind'], 'gained'],
    ['case', ['all', ['<=', ['get', 't'], p], ['>=', ['get', 't'], p - FRONT]], TINT, 0],
    ['==', ['get', 'kind'], 'lost'],
    ['case', ['all', ['<', ['get', 't'], 1 - p], ['>=', ['get', 't'], 1 - p - FRONT]], TINT, 0],
    0,
  ];
}

/**
 * Frontière qui glisse : une source, deux couches fill (aplat + teinte du front). Aucun contour sur
 * les bandes. Par image, seules deux propriétés de peinture sont réécrites, et seulement quand la
 * progression quantifiée change ; aucun setData ni setFilter pendant l'animation.
 */
export class MorphLayer {
  private raf = 0;
  private lastQ = -1;
  private visible = false;

  constructor(private map: MapLibreMap, beforeId?: string) {
    map.addSource('morph', { type: 'geojson', data: EMPTY });
    map.addLayer(
      {
        id: 'morph-fill',
        type: 'fill',
        source: 'morph',
        layout: { visibility: 'none' },
        paint: { 'fill-color': variantFill('#888888', 0), 'fill-opacity': 0, 'fill-opacity-transition': { duration: 0 } },
      },
      beforeId,
    );
    map.addLayer(
      {
        id: 'morph-tint',
        type: 'fill',
        source: 'morph',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': ['match', ['get', 'kind'], 'gained', DIFF_COLORS.gained, DIFF_COLORS.lost] as never,
          'fill-opacity': 0,
          'fill-opacity-transition': { duration: 0 },
        },
      },
      beforeId,
    );
  }

  private setProgress(p: number) {
    const q = Math.round(p * STEPS);
    if (q === this.lastQ) return;
    this.lastQ = q;
    const pq = q / STEPS;
    this.map.setPaintProperty('morph-fill', 'fill-opacity', opacityExpr(pq) as never);
    this.map.setPaintProperty('morph-tint', 'fill-opacity', tintExpr(pq) as never);
  }

  private setVisible(v: boolean) {
    if (this.visible === v) return;
    this.visible = v;
    const vis = v ? 'visible' : 'none';
    this.map.setLayoutProperty('morph-fill', 'visibility', vis);
    this.map.setLayoutProperty('morph-tint', 'visibility', vis);
  }

  /**
   * Joue le morph (from → to, 0 ou 1). onDone est appelé à la fin naturelle, après avoir posé
   * la progression finale ; la couche reste visible jusqu'à hide() pour permettre une bascule sans trou.
   */
  play(fc: MorphCollection, color: string, from: 0 | 1, durationMs: number, onDone: () => void) {
    this.cancel();
    this.map.setPaintProperty('morph-fill', 'fill-color', variantFill(color, 0));
    (this.map.getSource('morph') as GeoJSONSource | undefined)?.setData(fc);
    this.lastQ = -1;
    this.setProgress(from);
    this.setVisible(true);
    const to = 1 - from;
    const t0 = performance.now();
    const frame = (now: number) => {
      const k = Math.min(1, (now - t0) / durationMs);
      this.setProgress(from + (to - from) * easeInOutCubic(k));
      if (k < 1) this.raf = requestAnimationFrame(frame);
      else {
        this.raf = 0;
        onDone();
      }
    };
    this.raf = requestAnimationFrame(frame);
  }

  cancel() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  hide() {
    this.cancel();
    this.setVisible(false);
  }

  destroy() {
    this.cancel();
  }
}
