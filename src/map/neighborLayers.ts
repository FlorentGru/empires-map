import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { NeighborCollection } from '../data/loadEmpire';

const SRC = 'neighbors';
const HALO = '#f4ead3';
const EMPTY: NeighborCollection = { type: 'FeatureCollection', features: [] };

const area = ['get', 'area'] as never;
const size = ['interpolate', ['linear'], area, 50_000, 9, 3_000_000, 12] as never;

/**
 * Voisins de l'époque : contours en tirets sous les territoires, noms en gris-brun.
 * Les noms ne sont placés que si l'aire dépasse un seuil dépendant du zoom (taille 0 = non placé).
 */
export class NeighborLayers {
  constructor(private map: MapLibreMap, beforeId?: string) {
    map.addSource(SRC, { type: 'geojson', data: EMPTY });
    map.addLayer(
      {
        id: 'neighbors-border',
        type: 'line',
        source: SRC,
        filter: ['==', ['get', 'kind'], 'border'],
        layout: { 'line-join': 'round' },
        paint: { 'line-color': '#7a6a55', 'line-width': 0.8, 'line-dasharray': [2, 2], 'line-opacity': 0.35 },
      },
      beforeId,
    );
    map.addLayer(
      {
        id: 'neighbors-label',
        type: 'symbol',
        source: SRC,
        filter: ['==', ['get', 'kind'], 'label'],
        layout: {
          'symbol-sort-key': ['*', -1, area] as never,
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': [
            'step',
            ['zoom'],
            ['case', ['>=', area, 100_000], size, 0],
            4,
            ['case', ['>=', area, 30_000], size, 0],
            5,
            size,
          ] as never,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.15,
          'text-max-width': 8,
          'text-padding': 2,
          // Si la position centrale est prise (nom de ville…), on essaie autour du point.
          'text-variable-anchor': ['center', 'top', 'bottom', 'left', 'right'],
          'text-radial-offset': 0.6,
          'text-optional': true,
        },
        paint: { 'text-color': '#6d5f4b', 'text-halo-color': HALO, 'text-halo-width': 1.4, 'text-halo-blur': 0.3 },
      },
      beforeId,
    );
  }

  setEnabled(on: boolean) {
    for (const id of ['neighbors-border', 'neighbors-label']) {
      if (this.map.getLayer(id)) this.map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    }
  }

  update(fc: NeighborCollection) {
    (this.map.getSource(SRC) as GeoJSONSource | undefined)?.setData(fc);
  }

  destroy() {}
}
