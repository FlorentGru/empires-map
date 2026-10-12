import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';

const SRC = 'countries-2026';
const INK = '#4a5a6a';
const HALO = '#f4ead3';
const EMPTY = { type: 'FeatureCollection', features: [] } as const;

/**
 * Calque « Pays 2026 » : frontières terrestres actuelles (pointillés) et noms des pays, au-dessus des
 * territoires et sous les villes. Données chargées à la première activation ; fichier absent = couches vides.
 */
export class CountriesLayer {
  private loadState: 'idle' | 'loading' | 'done' = 'idle';
  private shown = false;

  constructor(private map: MapLibreMap, beforeId?: string) {
    map.addSource(SRC, { type: 'geojson', data: EMPTY as never });
    map.addLayer(
      {
        id: 'countries-2026-line',
        type: 'line',
        source: SRC,
        minzoom: 2,
        filter: ['==', ['get', 'kind'], 'border'],
        layout: { visibility: 'none', 'line-join': 'round' },
        paint: {
          'line-color': INK,
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1, 7, 1.4] as never,
          'line-dasharray': [3, 2],
          'line-opacity': 0.8,
        },
      },
      beforeId,
    );
    // Rang ≤ 3 dès le zoom 3, les autres dès 4,5 (taille 0 = non placé).
    map.addLayer(
      {
        id: 'countries-2026-label',
        type: 'symbol',
        source: SRC,
        minzoom: 3,
        filter: ['==', ['get', 'kind'], 'label'],
        layout: {
          visibility: 'none',
          'symbol-sort-key': ['get', 'rank'],
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['step', ['zoom'], ['case', ['<=', ['get', 'rank'], 3], 10, 0], 4.5, 11, 6, 12] as never,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.15,
          'text-max-width': 8,
          'text-padding': 2,
        },
        paint: { 'text-color': INK, 'text-halo-color': HALO, 'text-halo-width': 1.4, 'text-halo-blur': 0.4 },
      },
      beforeId,
    );
  }

  private async load() {
    if (this.loadState !== 'idle') return;
    this.loadState = 'loading';
    const url = `${import.meta.env.BASE_URL}data/basemap/countries-2026.geojson`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.type !== 'FeatureCollection') throw new Error('GeoJSON invalide');
      if (this.map.getStyle()) (this.map.getSource(SRC) as GeoJSONSource | undefined)?.setData(data);
    } catch (err) {
      console.warn('[pays 2026] countries-2026.geojson indisponible, calque vide :', err);
    }
    this.loadState = 'done';
  }

  setVisible(on: boolean) {
    if (on) void this.load();
    if (on === this.shown || !this.map.getStyle()) return;
    this.shown = on;
    const vis = on ? 'visible' : 'none';
    this.map.setLayoutProperty('countries-2026-line', 'visibility', vis);
    this.map.setLayoutProperty('countries-2026-label', 'visibility', vis);
  }

  destroy() {}
}
