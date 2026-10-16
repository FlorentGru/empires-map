import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import type { Feature, FeatureCollection, Point } from 'geojson';
import monuments from '../../data/monuments.json';
import { MONUMENT_KINDS, type Monument } from '../types-monument';
import { formatYear } from '../lib/years';
import { addMonumentIcons } from './monumentIcons';
import { openMapCard } from './mapCard';

const SRC = 'monuments';
const LAYER = 'monuments-icons';
const HALO = '#f4ead3';
const ALL = monuments as Monument[];

/** Monuments debout à l'année donnée : achevés (built ≤ year) et pas encore détruits (year < until). */
export function standingAt(list: Monument[], year: number): Monument[] {
  return list.filter((m) => m.built <= year && (m.until === undefined || year < m.until));
}

/** Période d'existence lisible : « depuis 80 » ou « 280 av. J.-C. – 1323 ». */
export function monumentSpan(m: Pick<Monument, 'built' | 'until'>): string {
  return m.until === undefined ? `depuis ${formatYear(m.built)}` : `${formatYear(m.built)} – ${formatYear(m.until)}`;
}

/**
 * Grands monuments de l'époque (data/monuments.json) : icône par type, nom à partir du zoom 4,
 * clic → bulle avec dates, civilisation, description et lien Wikipédia. Filtrés par année à chaque étape.
 */
export class MonumentLayers {
  private ready: Promise<void>;
  private year = 0;

  constructor(private map: MapLibreMap, beforeId?: string) {
    const data: FeatureCollection<Point, { id: string; kind: string; name: string; built: number; until: number }> = {
      type: 'FeatureCollection',
      features: ALL.map((m) => ({
        type: 'Feature',
        properties: { id: m.id, kind: m.kind, name: m.name, built: m.built, until: m.until ?? 99999 },
        geometry: { type: 'Point', coordinates: m.location },
      })),
    };
    this.ready = addMonumentIcons(map, MONUMENT_KINDS).then(() => {
      if (!map.getStyle() || map.getSource(SRC)) return;
      map.addSource(SRC, { type: 'geojson', data });
      map.addLayer(
        {
          id: LAYER,
          type: 'symbol',
          source: SRC,
          filter: this.filterFor(this.year),
          layout: {
            'icon-image': ['concat', 'monument-', ['get', 'kind']] as never,
            'icon-size': ['interpolate', ['linear'], ['zoom'], 2, 0.6, 5, 0.85, 8, 1.1] as never,
            'icon-allow-overlap': true,
            'text-field': ['step', ['zoom'], '', 4, ['get', 'name']] as never,
            'text-font': ['Noto Sans Regular'],
            'text-size': 10.5,
            'text-offset': [0, 1.35],
            'text-anchor': 'top',
            'text-max-width': 9,
            'text-optional': true,
          },
          paint: { 'text-color': '#3b2a1a', 'text-halo-color': HALO, 'text-halo-width': 1.4 },
        },
        // Sous les villes (calque ajouté de façon asynchrone, une fois les icônes chargées).
        beforeId ?? (map.getLayer('city-dot') ? 'city-dot' : undefined),
      );
      map.on('click', LAYER, this.onClick);
      map.on('mouseenter', LAYER, this.onEnter);
      map.on('mouseleave', LAYER, this.onLeave);
    });
  }

  private filterFor(year: number) {
    return ['all', ['<=', ['get', 'built'], year], ['>', ['get', 'until'], year]] as never;
  }

  private onEnter = () => {
    this.map.getCanvas().style.cursor = 'pointer';
  };
  private onLeave = () => {
    this.map.getCanvas().style.cursor = '';
  };

  private onClick = (e: MapMouseEvent & { features?: Feature[] }) => {
    const id = e.features?.[0]?.properties?.id as string | undefined;
    const m = ALL.find((x) => x.id === id);
    if (!m) return;
    const title = document.createElement('p');
    title.className = 'map-card__title';
    title.textContent = m.name;
    const meta = document.createElement('p');
    meta.className = 'map-card__meta';
    meta.textContent = `${m.civilization} · ${monumentSpan(m)}`;
    const text = document.createElement('p');
    text.className = 'map-card__text';
    text.textContent = m.description;
    const link = document.createElement('a');
    link.className = 'map-card__link';
    link.href = m.wikipedia;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'En savoir plus sur Wikipédia ↗';
    openMapCard(this.map, e.originalEvent.clientX, e.originalEvent.clientY, m.name, [title, meta, text, link]);
  };

  /** Année de l'étape affichée. */
  setYear(year: number) {
    this.year = year;
    void this.ready.then(() => {
      if (this.map.getLayer(LAYER)) this.map.setFilter(LAYER, this.filterFor(year));
    });
  }

  setEnabled(on: boolean) {
    void this.ready.then(() => {
      if (this.map.getLayer(LAYER)) this.map.setLayoutProperty(LAYER, 'visibility', on ? 'visible' : 'none');
    });
  }

  destroy() {
    const m = this.map;
    m.off('click', LAYER, this.onClick);
    m.off('mouseenter', LAYER, this.onEnter);
    m.off('mouseleave', LAYER, this.onLeave);
    if (!m.getStyle()) return;
    if (m.getLayer(LAYER)) m.removeLayer(LAYER);
    if (m.getSource(SRC)) m.removeSource(SRC);
  }
}
