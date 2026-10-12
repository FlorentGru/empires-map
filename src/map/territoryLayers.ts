import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { TerritoryCollection } from '../data/loadEmpire';
import { tween } from '../lib/motion';
import { variantFill, variantLine } from './color';

const FILL_OPACITY = 0.42;
const LINE_OPACITY = 0.9;
export const CROSSFADE_MS = 800;

const EMPTY: TerritoryCollection = { type: 'FeatureCollection', features: [] };
type Slot = 'current' | 'previous';

/** Ajoute à chaque Feature une couleur de remplissage et de contour (variation de teinte par entité). */
function decorate(fc: TerritoryCollection, color: string): TerritoryCollection {
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f, i) => ({
      ...f,
      properties: { ...f.properties, _fill: variantFill(color, i), _line: variantLine(color, i) },
    })),
  };
}

/**
 * Deux sources (courant + précédent) : à chaque changement, l'ancien territoire passe
 * dans « previous » et s'efface pendant que le nouveau apparaît (fondu enchaîné).
 */
export class TerritoryLayers {
  private currentData: TerritoryCollection = EMPTY;
  private currentOpacity = 0;
  private cancel: () => void = () => {};

  constructor(private map: MapLibreMap, beforeId?: string) {
    for (const slot of ['previous', 'current'] as Slot[]) {
      map.addSource(`territory-${slot}`, { type: 'geojson', data: EMPTY });
      map.addLayer(
        {
          id: `territory-${slot}-fill`,
          type: 'fill',
          source: `territory-${slot}`,
          paint: { 'fill-color': ['get', '_fill'], 'fill-opacity': 0, 'fill-opacity-transition': { duration: 0 } },
        },
        beforeId,
      );
      map.addLayer(
        {
          id: `territory-${slot}-line`,
          type: 'line',
          source: `territory-${slot}`,
          paint: {
            'line-color': ['get', '_line'],
            'line-width': 1.4,
            'line-opacity': 0,
            'line-opacity-transition': { duration: 0 },
          },
        },
        beforeId,
      );
    }
  }

  private setOpacity(slot: Slot, k: number) {
    this.map.setPaintProperty(`territory-${slot}-fill`, 'fill-opacity', FILL_OPACITY * k);
    this.map.setPaintProperty(`territory-${slot}-line`, 'line-opacity', LINE_OPACITY * k);
  }

  private source(slot: Slot) {
    return this.map.getSource(`territory-${slot}`) as GeoJSONSource | undefined;
  }

  show(fc: TerritoryCollection, color: string) {
    this.cancel();
    const from = this.currentOpacity;
    this.source('previous')?.setData(this.currentData);
    this.currentData = decorate(fc, color);
    this.source('current')?.setData(this.currentData);
    this.setOpacity('previous', from);
    this.setOpacity('current', 0);
    this.cancel = tween(CROSSFADE_MS, (t) => {
      const e = t * t * (3 - 2 * t); // smoothstep
      this.currentOpacity = e;
      this.setOpacity('current', e);
      this.setOpacity('previous', from * (1 - e));
    });
  }

  destroy() {
    this.cancel();
  }
}
