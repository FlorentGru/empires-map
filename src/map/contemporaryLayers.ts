import { type GeoJSONSource, type Map as MapLibreMap, type MapMouseEvent } from 'maplibre-gl';
import type { Feature, Point } from 'geojson';
import type { ContemporaryCollection } from '../data/loadEmpire';
import { labelPointsOf } from '../data/labelPoints';
import type { TerritoryCollection } from '../data/loadEmpire';
import type { ContemporaryProperties } from '../types';
import { formatYear } from '../lib/years';
import { prefersReducedMotion } from '../lib/motion';
import './contemporaries.css';
import { closeMapCard, openMapCard } from './mapCard';

const SRC = 'contemporaries';
const SRC_LABELS = 'contemporaries-labels';
const HALO = '#f4ead3';
const EMPTY: ContemporaryCollection = { type: 'FeatureCollection', features: [] };
const FADE_MS = 220;
const IDS = ['contemporaries-fill-core', 'contemporaries-fill-vassal', 'contemporaries-line', 'contemporaries-label'];
const VASSAL = ['==', ['get', 'status'], 'vassal'] as never;

/** Demande de navigation vers un empire/étape (écoutée par App). */
export const GOTO_EVENT = 'atlas:goto';
export interface GotoDetail {
  empire: string;
  step: string;
}

/**
 * Autres empires de l'Atlas existant à la date de l'étape : remplissage léger à leur couleur, contour plein,
 * nom de l'entité et, dessous, celui de l'empire. Placé sous les calques du territoire courant.
 */
export class ContemporaryLayers {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private hasData = false;

  constructor(private map: MapLibreMap, beforeId?: string) {
    const ms = prefersReducedMotion() ? 0 : FADE_MS;
    const transition = { duration: ms };
    map.addSource(SRC, { type: 'geojson', data: EMPTY });
    map.addSource(SRC_LABELS, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    const fill = (id: string, filter: unknown, opacity: number) =>
      map.addLayer(
        {
          id,
          type: 'fill',
          source: SRC,
          filter: filter as never,
          paint: { 'fill-color': ['get', 'color'], 'fill-opacity': opacity, 'fill-opacity-transition': transition },
        },
        beforeId,
      );
    fill('contemporaries-fill-core', ['!=', ['get', 'status'], 'vassal'], 0.38);
    fill('contemporaries-fill-vassal', VASSAL, 0.2);
    map.addLayer(
      {
        id: 'contemporaries-line',
        type: 'line',
        source: SRC,
        layout: { 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 1.6, 'line-opacity': 0.9, 'line-opacity-transition': transition },
      },
      beforeId,
    );
    map.addLayer(
      {
        id: 'contemporaries-label',
        type: 'symbol',
        source: SRC_LABELS,
        layout: {
          'symbol-sort-key': ['*', -1, ['get', 'area']] as never,
          'text-field': [
            'format',
            ['get', 'name'],
            { 'font-scale': 1 },
            '\n',
            {},
            ['concat', '(', ['get', 'empireName'], ')'],
            { 'font-scale': 0.75 },
          ] as never,
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 3, 11, 7, 14] as never,
          'text-max-width': 8,
          'text-padding': 3,
          'text-variable-anchor': ['center', 'top', 'bottom', 'left', 'right'],
          'text-radial-offset': 0.6,
          'text-optional': true,
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': HALO,
          'text-halo-width': 1.5,
          'text-halo-blur': 0.3,
          'text-opacity-transition': transition,
        },
      },
      beforeId,
    );
    for (const id of ['contemporaries-fill-core', 'contemporaries-fill-vassal']) {
      map.on('click', id, this.onClick);
      map.on('mouseenter', id, this.onEnter);
      map.on('mouseleave', id, this.onLeave);
    }
  }

  private onEnter = () => {
    this.map.getCanvas().style.cursor = 'pointer';
  };
  private onLeave = () => {
    this.map.getCanvas().style.cursor = '';
  };

  /** Bulle « Voir cet empire » (au-dessus de toute l'interface, voir mapCard.ts). */
  private onClick = (e: MapMouseEvent & { features?: Feature[] }) => {
    const p = e.features?.[0]?.properties as ContemporaryProperties | undefined;
    if (!p) return;
    const title = document.createElement('p');
    title.className = 'map-card__title';
    title.textContent = `${p.name} · ${p.empireName}, ${formatYear(p.year)}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'map-card__go';
    btn.textContent = 'Voir cet empire →';
    btn.addEventListener('click', () => {
      closeMapCard();
      window.dispatchEvent(new CustomEvent<GotoDetail>(GOTO_EVENT, { detail: { empire: p.empire, step: p.stepId } }));
    });
    openMapCard(this.map, e.originalEvent.clientX, e.originalEvent.clientY, `${p.name} · ${p.empireName}`, [title, btn], btn);
  };

  private setOpacity(v: 0 | 1) {
    const m = this.map;
    if (!m.getLayer('contemporaries-line')) return;
    m.setPaintProperty('contemporaries-fill-core', 'fill-opacity', 0.38 * v);
    m.setPaintProperty('contemporaries-fill-vassal', 'fill-opacity', 0.2 * v);
    m.setPaintProperty('contemporaries-line', 'line-opacity', 0.9 * v);
    m.setPaintProperty('contemporaries-label', 'text-opacity', v);
  }

  setEnabled(on: boolean) {
    for (const id of IDS) {
      if (this.map.getLayer(id)) this.map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    }
    if (!on) closeMapCard();
  }

  /** Fondu sortant, remplacement des données, fondu entrant. */
  update(fc: ContemporaryCollection) {
    const src = this.map.getSource(SRC) as GeoJSONSource | undefined;
    const labelSrc = this.map.getSource(SRC_LABELS) as GeoJSONSource | undefined;
    if (!src || !labelSrc) return;
    clearTimeout(this.timer);
    closeMapCard();
    const apply = () => {
      src.setData(fc);
      const pts = labelPointsOf(fc as unknown as TerritoryCollection);
      const labels: Feature<Point>[] = pts.map((lp) => ({
        type: 'Feature',
        properties: { ...fc.features[lp.index].properties, area: lp.area },
        geometry: { type: 'Point', coordinates: lp.coords },
      }));
      labelSrc.setData({ type: 'FeatureCollection', features: labels });
      this.hasData = fc.features.length > 0;
      this.setOpacity(1);
    };
    if (!this.hasData || prefersReducedMotion()) {
      apply();
      return;
    }
    this.setOpacity(0);
    this.timer = setTimeout(apply, FADE_MS);
  }

  destroy() {
    clearTimeout(this.timer);
    closeMapCard();
    for (const id of ['contemporaries-fill-core', 'contemporaries-fill-vassal']) {
      this.map.off('click', id, this.onClick);
      this.map.off('mouseenter', id, this.onEnter);
      this.map.off('mouseleave', id, this.onLeave);
    }
  }
}
