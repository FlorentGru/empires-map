import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { DiffCollection } from '../data/loadEmpire';
import { prefersReducedMotion } from '../lib/motion';

export const DIFF_COLORS = { gained: '#2f8a3a', lost: '#b3261e' } as const;
export const HIGHLIGHT_MS = 2000;

const EMPTY: DiffCollection = { type: 'FeatureCollection', features: [] };
const PULSE_MS = 250;
const HI = 0.6;
const LO = 0.12;

/**
 * Surbrillance des zones gagnées / perdues. Les opacités utilisent les transitions de peinture
 * natives de MapLibre : quelques paliers (setTimeout) suffisent, aucun calcul par image.
 */
export class DiffHighlight {
  private timers: number[] = [];

  constructor(
    private map: MapLibreMap,
    beforeId?: string,
  ) {
    map.addSource('diff', { type: 'geojson', data: EMPTY });
    const color = ['match', ['get', 'kind'], 'gained', DIFF_COLORS.gained, DIFF_COLORS.lost] as never;
    const transition = { duration: prefersReducedMotion() ? 0 : PULSE_MS };
    map.addLayer(
      { id: 'diff-fill', type: 'fill', source: 'diff', paint: { 'fill-color': color, 'fill-opacity': 0, 'fill-opacity-transition': transition } },
      beforeId,
    );
    map.addLayer(
      {
        id: 'diff-line',
        type: 'line',
        source: 'diff',
        paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 0, 'line-opacity-transition': transition },
      },
      beforeId,
    );
  }

  private setOpacity(k: number) {
    this.map.setPaintProperty('diff-fill', 'fill-opacity', HI * k);
    this.map.setPaintProperty('diff-line', 'line-opacity', k);
  }

  private at(ms: number, k: number) {
    this.timers.push(window.setTimeout(() => this.setOpacity(k), ms));
  }

  flash(diff: DiffCollection) {
    this.stop();
    if (diff.features.length === 0) return;
    (this.map.getSource('diff') as GeoJSONSource | undefined)?.setData(diff);
    this.setOpacity(1);
    if (prefersReducedMotion()) {
      this.at(HIGHLIGHT_MS, 0);
      return;
    }
    // 3 pulsations puis extinction : haut, bas, haut, bas, haut, fin.
    this.at(400, LO / HI);
    this.at(800, 1);
    this.at(1200, LO / HI);
    this.at(1600, 1);
    this.at(HIGHLIGHT_MS, 0);
  }

  stop() {
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    this.setOpacity(0);
  }

  destroy() {
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
  }
}
