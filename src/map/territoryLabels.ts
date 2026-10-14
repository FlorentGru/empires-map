import type { Feature, FeatureCollection, Point } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { labelPointsOf } from '../data/labelPoints';
import type { TerritoryCollection } from '../data/loadEmpire';
import { variantLine } from './color';

const SRC = 'territory-labels';
const HALO = '#f4ead3';
const SUFFIX = { core: '', vassal: ' (vassal)', allied: ' (allié)' } as const;

type LabelCollection = FeatureCollection<Point, { name: string; label: string; status: string; area: number; color: string }>;
const EMPTY: LabelCollection = { type: 'FeatureCollection', features: [] };

const status = ['get', 'status'] as never;
/** 10 → 12 px selon l'aire au zoom 3, 12 → 15 px au zoom 7 ; vassaux et alliés 15 % plus petits. */
const bySize = (lo: number, hi: number) =>
  ['*', ['case', ['==', status, 'core'], 1, 0.85], ['interpolate', ['linear'], ['get', 'area'], 20_000, lo, 3_000_000, hi]] as never;

/**
 * Noms des États, au-dessus des territoires et sous les villes. Mis à jour une seule fois par étape,
 * quand le territoire final est affiché ; masqués pendant le glissement.
 */
export class TerritoryLabels {
  private enabled = true;
  private suspended = false;

  constructor(private map: MapLibreMap, beforeId?: string) {
    map.addSource(SRC, { type: 'geojson', data: EMPTY });
    map.addLayer(
      {
        id: 'territory-labels',
        type: 'symbol',
        source: SRC,
        layout: {
          'symbol-sort-key': ['*', -1, ['get', 'area']] as never,
          'text-field': ['get', 'label'],
          'text-font': ['Open Sans Semibold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 3, bySize(10, 12), 7, bySize(12, 15)] as never,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.12,
          'text-max-width': 8,
          'text-padding': 3,
          // Si la position centrale est prise (nom de ville…), on essaie autour du point.
          'text-variable-anchor': ['center', 'top', 'bottom', 'left', 'right'],
          'text-radial-offset': 0.6,
          'text-optional': true,
        },
        paint: { 'text-color': ['get', 'color'], 'text-halo-color': HALO, 'text-halo-width': 1.5, 'text-halo-blur': 0.3 },
      },
      beforeId,
    );
  }

  private apply() {
    if (this.map.getLayer('territory-labels')) {
      this.map.setLayoutProperty('territory-labels', 'visibility', this.enabled && !this.suspended ? 'visible' : 'none');
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.apply();
  }

  /** Masque les noms (glissement en cours). */
  hide() {
    this.suspended = true;
    this.apply();
  }

  /** Pose les noms du territoire final et les affiche. */
  update(fc: TerritoryCollection, color: string) {
    const features: Feature<Point, LabelCollection['features'][number]['properties']>[] = [];
    for (const lp of labelPointsOf(fc)) {
      const p = fc.features[lp.index]?.properties;
      if (!p?.name) continue;
      const st = p.status ?? 'core';
      features.push({
        type: 'Feature',
        properties: { name: p.name, label: p.name + SUFFIX[st], status: st, area: lp.area, color: variantLine(color, lp.index) },
        geometry: { type: 'Point', coordinates: lp.coords },
      });
    }
    (this.map.getSource(SRC) as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features });
    this.suspended = false;
    this.apply();
  }

  destroy() {}
}
