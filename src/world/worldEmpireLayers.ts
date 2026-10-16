import type { Feature, FeatureCollection, Point } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { labelPointsOf } from '../data/labelPoints';
import type { TerritoryCollection } from '../data/loadEmpire';
import { prefersReducedMotion } from '../lib/motion';
import { variantLine } from '../map/color';
import type { Empire } from '../types';

const FADE_MS = 250;
const HALO = '#f4ead3';
const FONT = ['Noto Sans Regular'];
const EMPTY = { type: 'FeatureCollection', features: [] } as const;
const status = ['get', 'status'] as never;

const fillOpacity = (on: 0 | 1) => ['match', status, 'allied', 0, 'vassal', 0.22 * on, 0.45 * on] as never;
const DASHED = ['match', status, ['vassal', 'allied'], true, false] as never;
const SOLID = ['!', DASHED] as never;

type LabelCollection = FeatureCollection<Point, { label: string; area: number }>;

export const fillLayerId = (empireId: string) => `world-${empireId}-fill`;

/**
 * Un territoire par empire présent, une source et quatre couches par empire, empilés dans l'ordre
 * de la liste (le plus ancien dessous). Le fondu repose sur les transitions de peinture de MapLibre.
 */
export class WorldEmpireLayers {
  private visible = new Map<string, boolean>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private transition = { duration: prefersReducedMotion() ? 0 : FADE_MS };

  constructor(
    private map: MapLibreMap,
    private empires: Empire[],
  ) {
    const transition = this.transition;
    for (const e of empires) {
      const src = `world-${e.id}`;
      const lbl = `world-${e.id}-lbl`;
      map.addSource(src, { type: 'geojson', data: EMPTY as never });
      map.addSource(lbl, { type: 'geojson', data: EMPTY as never });
      map.addLayer({ id: fillLayerId(e.id), type: 'fill', source: src, paint: { 'fill-color': e.color, 'fill-opacity': 0, 'fill-opacity-transition': transition } });
      const line = { 'line-color': variantLine(e.color, 0), 'line-width': 1.3, 'line-opacity': 0, 'line-opacity-transition': transition };
      map.addLayer({ id: `world-${e.id}-line`, type: 'line', source: src, filter: SOLID, layout: { 'line-join': 'round' }, paint: line });
      map.addLayer({ id: `world-${e.id}-dash`, type: 'line', source: src, filter: DASHED, layout: { 'line-join': 'round' }, paint: { ...line, 'line-dasharray': [3, 2], 'line-width': 1.1 } });
      map.addLayer({
        id: `world-${e.id}-label`,
        type: 'symbol',
        source: lbl,
        layout: {
          'text-field': ['get', 'label'],
          'text-font': FONT,
          'text-size': ['interpolate', ['linear'], ['zoom'], 1, 9, 5, 13] as never,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.1,
          'text-max-width': 7,
          'symbol-sort-key': ['*', -1, ['get', 'area']] as never,
          'text-optional': true,
        },
        paint: { 'text-color': variantLine(e.color, 0), 'text-halo-color': HALO, 'text-halo-width': 1.4, 'text-opacity': 0, 'text-opacity-transition': transition },
      });
    }
  }

  layerIds(): string[] {
    return this.empires.map((e) => fillLayerId(e.id));
  }

  private setOpacity(id: string, on: 0 | 1) {
    const m = this.map;
    if (!m.getLayer(fillLayerId(id))) return;
    m.setPaintProperty(fillLayerId(id), 'fill-opacity', fillOpacity(on));
    m.setPaintProperty(`world-${id}-line`, 'line-opacity', 0.9 * on);
    m.setPaintProperty(`world-${id}-dash`, 'line-opacity', 0.8 * on);
    m.setPaintProperty(`world-${id}-label`, 'text-opacity', on);
  }

  /** Pose (ou remplace) le territoire d'un empire et le rend visible. */
  show(id: string, fc: TerritoryCollection) {
    const m = this.map;
    const src = m.getSource(`world-${id}`) as GeoJSONSource | undefined;
    if (!src) return;
    clearTimeout(this.timers.get(id));
    src.setData(fc);
    const labels: Feature<Point, { label: string; area: number }>[] = labelPointsOf(fc).map((p) => ({
      type: 'Feature',
      properties: { label: fc.features[p.index]?.properties?.name ?? '', area: p.area },
      geometry: { type: 'Point', coordinates: p.coords },
    }));
    (m.getSource(`world-${id}-lbl`) as GeoJSONSource).setData({ type: 'FeatureCollection', features: labels } as LabelCollection);
    this.visible.set(id, true);
    this.setOpacity(id, 1);
  }

  /** Fondu sortant, puis vidage des données (une couche à opacité 0 reste cliquable). */
  hide(id: string) {
    if (this.visible.get(id) === false) return;
    this.visible.set(id, false);
    this.setOpacity(id, 0);
    clearTimeout(this.timers.get(id));
    this.timers.set(
      id,
      setTimeout(() => {
        if (this.visible.get(id) !== false || !this.map.getStyle()) return;
        (this.map.getSource(`world-${id}`) as GeoJSONSource | undefined)?.setData(EMPTY as never);
        (this.map.getSource(`world-${id}-lbl`) as GeoJSONSource | undefined)?.setData(EMPTY as never);
      }, this.transition.duration + 50),
    );
  }

  destroy() {
    for (const t of this.timers.values()) clearTimeout(t);
  }
}
