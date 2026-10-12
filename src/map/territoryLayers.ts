import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { TerritoryCollection } from '../data/loadEmpire';
import { prefersReducedMotion } from '../lib/motion';
import { variantFill, variantLine } from './color';

const FILL_OPACITY = 0.48;
const LINE_OPACITY = 0.9;
export const CROSSFADE_MS = 800;

const EMPTY: TerritoryCollection = { type: 'FeatureCollection', features: [] };
const SLOTS = ['a', 'b'] as const;
type Slot = (typeof SLOTS)[number];

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
 * Deux emplacements alternés (a, b) : le nouveau territoire est écrit dans celui qui est
 * masqué puis les deux opacités basculent. Le fondu est assuré par les transitions de peinture
 * natives de MapLibre : une seule valeur cible par couche et par étape, rien par image.
 */
export class TerritoryLayers {
  private active: Slot | null = null;

  constructor(private map: MapLibreMap, beforeId?: string) {
    const transition = { duration: prefersReducedMotion() ? 0 : CROSSFADE_MS };
    for (const slot of SLOTS) {
      map.addSource(`territory-${slot}`, { type: 'geojson', data: EMPTY });
      map.addLayer(
        {
          id: `territory-${slot}-fill`,
          type: 'fill',
          source: `territory-${slot}`,
          paint: { 'fill-color': ['get', '_fill'], 'fill-opacity': 0, 'fill-opacity-transition': transition },
        },
        beforeId,
      );
      map.addLayer(
        {
          id: `territory-${slot}-line`,
          type: 'line',
          source: `territory-${slot}`,
          paint: { 'line-color': ['get', '_line'], 'line-width': 1.4, 'line-opacity': 0, 'line-opacity-transition': transition },
        },
        beforeId,
      );
    }
  }

  private setOpacity(slot: Slot, k: number) {
    this.map.setPaintProperty(`territory-${slot}-fill`, 'fill-opacity', FILL_OPACITY * k);
    this.map.setPaintProperty(`territory-${slot}-line`, 'line-opacity', LINE_OPACITY * k);
  }

  show(fc: TerritoryCollection, color: string) {
    const next: Slot = this.active === 'a' ? 'b' : 'a';
    (this.map.getSource(`territory-${next}`) as GeoJSONSource | undefined)?.setData(decorate(fc, color));
    this.setOpacity(next, 1);
    if (this.active) this.setOpacity(this.active, 0);
    this.active = next;
  }

  destroy() {}
}
