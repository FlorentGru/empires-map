import { Marker, type GeoJSONSource, type Map as MapLibreMap, type MapMouseEvent } from 'maplibre-gl';
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import disasters from '../../data/disasters.json';
import type { Disaster, DisasterKind } from '../types-disaster';
import { activeDisasters, convexHull, formatDeaths, OPEN_DISASTER_EVENT, spreadUpTo } from '../lib/worldEvents';
import { formatYear } from '../lib/years';
import { openMapCard } from './mapCard';
import './disasters.css';

const ALL = disasters as Disaster[];
const SRC_SPREAD = 'disasters-spread';
const SRC_WAR = 'disasters-war';
const IDS = ['disasters-war-fill', 'disasters-war-line', 'disasters-spread'];
const PLAGUE = '#6d2a7a';
const WAR = '#7a1f1a';

export const DISASTER_LABELS: Record<DisasterKind, { label: string; icon: string }> = {
  epidemie: { label: 'Épidémie', icon: '☣' },
  eruption: { label: 'Éruption volcanique', icon: '🌋' },
  seisme: { label: 'Séisme', icon: '≋' },
  tsunami: { label: 'Tsunami', icon: '🌊' },
  famine: { label: 'Famine', icon: '🌾' },
  inondation: { label: 'Inondation', icon: '💧' },
  guerre: { label: 'Guerre', icon: '⚔' },
};

function span(d: Disaster): string {
  return d.start === d.end ? formatYear(d.start) : `${formatYear(d.start)} – ${formatYear(d.end)}`;
}

/** Centre approximatif d'une zone (moyenne des sommets). */
function centerOf(points: [number, number][]): [number, number] {
  const n = points.length || 1;
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
}

/** Motif hachuré rouge sombre pour les zones de guerre. */
function hatchImage(): ImageData {
  const size = 16;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.strokeStyle = 'rgba(122, 31, 26, 0.55)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, size);
  g.lineTo(size, 0);
  g.moveTo(-size / 2, size / 2);
  g.lineTo(size / 2, -size / 2);
  g.moveTo(size / 2, size * 1.5);
  g.lineTo(size * 1.5, size / 2);
  g.stroke();
  return g.getImageData(0, 0, size, size);
}

/**
 * Catastrophes, épidémies et guerres meurtrières en cours à la date (data/disasters.json) :
 * diffusion des épidémies (cercles violets, vague récente pulsante), zones de guerre hachurées,
 * pastille par événement avec le bilan humain. Clic → fiche (bilan, fourchette, incertitude, sources).
 */
export class DisasterLayers {
  private year = 0;
  private enabled = true;
  private markers: Marker[] = [];
  private markerOf = new Map<string, HTMLElement>();

  constructor(private map: MapLibreMap) {
    if (!map.hasImage('war-hatch')) map.addImage('war-hatch', hatchImage());
    const before = map.getLayer('city-dot') ? 'city-dot' : undefined;
    const empty = { type: 'FeatureCollection' as const, features: [] };
    map.addSource(SRC_WAR, { type: 'geojson', data: empty });
    map.addSource(SRC_SPREAD, { type: 'geojson', data: empty });
    map.addLayer({ id: 'disasters-war-fill', type: 'fill', source: SRC_WAR, paint: { 'fill-pattern': 'war-hatch', 'fill-opacity': 0.32 } }, before);
    map.addLayer({ id: 'disasters-war-line', type: 'line', source: SRC_WAR, paint: { 'line-color': WAR, 'line-width': 1.2, 'line-opacity': 0.5, 'line-dasharray': [3, 2] } }, before);
    map.addLayer(
      {
        id: 'disasters-spread',
        type: 'circle',
        source: SRC_SPREAD,
        paint: {
          // Vague la plus récente : plus grande et plus vive ; les anciennes s'estompent.
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, ['case', ['==', ['get', 'age'], 0], 7, 4.5], 6, ['case', ['==', ['get', 'age'], 0], 14, 9]] as never,
          'circle-color': PLAGUE,
          'circle-opacity': ['max', 0.15, ['-', 0.55, ['*', ['get', 'age'], 0.12]]] as never,
          'circle-stroke-color': PLAGUE,
          'circle-stroke-width': ['case', ['==', ['get', 'age'], 0], 1.5, 0] as never,
          'circle-blur': 0.35,
        },
      },
      before,
    );
    window.addEventListener(OPEN_DISASTER_EVENT, this.onOpenRequest);
    for (const id of ['disasters-war-fill', 'disasters-spread']) {
      map.on('click', id, this.onLayerClick);
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

  /** Clic sur la barre de la frise : fiche ouverte près de la pastille, si l'événement est visible. */
  private onOpenRequest = (e: Event) => {
    const id = (e as CustomEvent<string>).detail;
    const d = ALL.find((x) => x.id === id);
    const el = this.markerOf.get(id);
    if (!d || !el) return;
    const r = el.getBoundingClientRect();
    this.openCard(d, r.left + r.width / 2, r.top);
  };

  private onLayerClick = (e: MapMouseEvent & { features?: Feature[] }) => {
    const d = ALL.find((x) => x.id === e.features?.[0]?.properties?.id);
    if (d) this.openCard(d, e.originalEvent.clientX, e.originalEvent.clientY);
  };

  private openCard(d: Disaster, x: number, y: number) {
    const k = DISASTER_LABELS[d.kind];
    const p = (cls: string, text: string) => {
      const el = document.createElement('p');
      el.className = cls;
      el.textContent = text;
      return el;
    };
    const parts: Node[] = [
      p('map-card__title', `${k.icon} ${d.name}`),
      p('map-card__meta', `${k.label} · ${span(d)}`),
      p('map-card__deaths', `${formatDeaths(d.deaths)} (estimations : ${formatDeaths(d.deathsLow).replace('≈ ', '')} à ${formatDeaths(d.deathsHigh).replace('≈ ', '')})`),
      p('map-card__note', d.uncertainty),
    ];
    if (d.belligerents?.length) parts.push(p('map-card__text', `Belligérants : ${d.belligerents.join(', ')}.`));
    parts.push(p('map-card__text', d.description));
    for (const s of d.sources) {
      const a = document.createElement('a');
      a.className = 'map-card__link';
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = `${s.label} ↗`;
      parts.push(a);
    }
    openMapCard(this.map, x, y, d.name, parts);
  }

  private apply() {
    for (const m of this.markers) m.remove();
    this.markers = [];
    this.markerOf.clear();
    const list = this.enabled ? activeDisasters(ALL, this.year) : [];
    const war: FeatureCollection<Polygon, { id: string }> = {
      type: 'FeatureCollection',
      features: list
        .filter((d) => d.kind === 'guerre' && (d.area?.length ?? 0) >= 3)
        .map((d) => ({ type: 'Feature', properties: { id: d.id }, geometry: { type: 'Polygon', coordinates: [convexHull(d.area!)] } })),
    };
    const spread: FeatureCollection<Point, { id: string; age: number }> = {
      type: 'FeatureCollection',
      features: list.flatMap((d) =>
        d.kind === 'epidemie' ? spreadUpTo(d, this.year).map((s) => ({ type: 'Feature' as const, properties: { id: d.id, age: s.age }, geometry: { type: 'Point' as const, coordinates: s.point } })) : [],
      ),
    };
    (this.map.getSource(SRC_WAR) as GeoJSONSource | undefined)?.setData(war);
    (this.map.getSource(SRC_SPREAD) as GeoJSONSource | undefined)?.setData(spread);
    // Pastille par événement : au lieu emblématique, ou au centre de la zone de guerre.
    for (const d of list) {
      const at = d.kind === 'guerre' && d.area?.length ? centerOf(d.area) : d.location;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `disaster-marker disaster-marker--${d.kind}`;
      el.setAttribute('aria-label', `${DISASTER_LABELS[d.kind].label} : ${d.name}, ${formatDeaths(d.deaths)}`);
      el.innerHTML = `<span class="disaster-marker__ring" aria-hidden="true"></span><span class="disaster-marker__icon" aria-hidden="true">${DISASTER_LABELS[d.kind].icon}</span><span class="disaster-marker__label">${d.name.replace(/</g, '&lt;')} · ${formatDeaths(d.deaths)}</span>`;
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.openCard(d, ev.clientX, ev.clientY);
      });
      this.markers.push(new Marker({ element: el }).setLngLat(at).addTo(this.map));
      this.markerOf.set(d.id, el);
    }
  }

  setYear(year: number) {
    this.year = year;
    this.apply();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    for (const id of IDS) if (this.map.getLayer(id)) this.map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    this.apply();
  }

  destroy() {
    window.removeEventListener(OPEN_DISASTER_EVENT, this.onOpenRequest);
    for (const m of this.markers) m.remove();
    const map = this.map;
    for (const id of ['disasters-war-fill', 'disasters-spread']) {
      map.off('click', id, this.onLayerClick);
      map.off('mouseenter', id, this.onEnter);
      map.off('mouseleave', id, this.onLeave);
    }
    if (!map.getStyle()) return;
    for (const id of [...IDS].reverse()) if (map.getLayer(id)) map.removeLayer(id);
    for (const s of [SRC_SPREAD, SRC_WAR]) if (map.getSource(s)) map.removeSource(s);
  }
}
