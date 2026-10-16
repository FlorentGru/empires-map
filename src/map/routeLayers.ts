import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import routes from '../../data/routes.json';
import type { TradeRoute } from '../types-route';
import { activeRoutes, cumulative, pointAlong } from '../lib/worldEvents';
import { formatYear } from '../lib/years';
import { prefersReducedMotion } from '../lib/motion';
import { openMapCard } from './mapCard';
import { addSvgImages } from './svgImages';

const ALL = routes as TradeRoute[];
const SRC = 'trade-routes';
const SRC_MOVERS = 'trade-routes-movers';
const IDS = ['trade-routes-casing', 'trade-routes-line', 'trade-routes-sea', 'trade-routes-label', 'trade-routes-movers'];
const CLICKABLE = ['trade-routes-line', 'trade-routes-sea', 'trade-routes-casing'];
const LAND = '#8a5a2b';
const SEA = '#3f6f8f';
/** Durée d'un trajet complet d'un voyageur (ms), et nombre de voyageurs par route. */
const TRIP_MS = 45_000;
const MOVERS_PER_ROUTE = 3;
const INK = '#3b2a1a';

const CAMEL =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48"><g stroke="${INK}" stroke-width="1" stroke-linejoin="round">` +
  '<path d="M4 13Q4 9 7 9Q8 6 10 9Q11.5 7 13 9H16L18 6.5L20 7L19.5 9.5L18 11V17H16.8V13.5H8.5V17H7.3V13.5Q5 14 4 13Z" fill="#c9a26a"/>' +
  '<path d="M9 9.2L10 7.5L11 9.2Z" fill="#a8281e" stroke-width="0.6"/></g></svg>';
const SHIP =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48"><g stroke="${INK}" stroke-width="1" stroke-linejoin="round">` +
  '<path d="M3.5 15H20.5L18 19H6Z" fill="#8a5a2b"/><path d="M11.5 3.5V15" fill="none"/>' +
  '<path d="M12 4.5Q17.5 8 12.3 13Z" fill="#f4ead3"/><path d="M11 6Q7 9.5 11 13Z" fill="#efe3c2"/></g></svg>';

type RouteProps = { id: string; name: string; kind: string };

/**
 * Routes commerciales actives à la date (data/routes.json) : tracé brun sur terre, pointillé bleu en mer,
 * nom le long du tracé, et caravanes / navires qui le parcourent. Clic → fiche de la route.
 */
export class RouteLayers {
  private ready: Promise<void>;
  private year = 0;
  private enabled = true;
  private raf = 0;
  private last = 0;
  private active: { route: TradeRoute; cum: number[] }[] = [];

  constructor(private map: MapLibreMap) {
    this.ready = addSvgImages(map, [['route-camel', CAMEL, 24], ['route-ship', SHIP, 24]]).then(() => {
      if (!map.getStyle() || map.getSource(SRC)) return;
      const before = map.getLayer('city-dot') ? 'city-dot' : undefined;
      map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addSource(SRC_MOVERS, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      const color = ['match', ['get', 'kind'], 'mer', SEA, LAND] as never;
      map.addLayer({ id: 'trade-routes-casing', type: 'line', source: SRC, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#f4ead3', 'line-width': 5, 'line-opacity': 0.55 } }, before);
      // Terre : trait plein brun ; mer : pointillé bleu (line-dasharray ne dépend pas des données → deux calques).
      const width = ['interpolate', ['linear'], ['zoom'], 2, 1.6, 6, 3] as never;
      map.addLayer(
        { id: 'trade-routes-line', type: 'line', source: SRC, filter: ['==', ['get', 'kind'], 'terre'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': LAND, 'line-width': width, 'line-opacity': 0.8 } },
        before,
      );
      map.addLayer(
        { id: 'trade-routes-sea', type: 'line', source: SRC, filter: ['==', ['get', 'kind'], 'mer'], layout: { 'line-cap': 'butt', 'line-join': 'round' }, paint: { 'line-color': SEA, 'line-width': width, 'line-opacity': 0.85, 'line-dasharray': [2.2, 1.6] } },
        before,
      );
      map.addLayer(
        {
          id: 'trade-routes-label',
          type: 'symbol',
          source: SRC,
          minzoom: 3.2,
          layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 10.5, 'symbol-spacing': 420, 'text-max-angle': 30 },
          paint: { 'text-color': color, 'text-halo-color': '#f4ead3', 'text-halo-width': 1.6 },
        },
        before,
      );
      map.addLayer(
        {
          id: 'trade-routes-movers',
          type: 'symbol',
          source: SRC_MOVERS,
          layout: {
            'icon-image': ['match', ['get', 'kind'], 'mer', 'route-ship', 'route-camel'] as never,
            'icon-size': ['interpolate', ['linear'], ['zoom'], 2, 0.55, 6, 0.9] as never,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          },
          paint: { 'icon-opacity': 0.95 },
        },
        before,
      );
      for (const id of CLICKABLE) {
        map.on('click', id, this.onClick);
        map.on('mouseenter', id, this.onEnter);
        map.on('mouseleave', id, this.onLeave);
      }
      this.apply();
    });
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private onEnter = () => {
    this.map.getCanvas().style.cursor = 'pointer';
  };
  private onLeave = () => {
    this.map.getCanvas().style.cursor = '';
  };

  private onClick = (e: MapMouseEvent & { features?: Feature[] }) => {
    const id = (e.features?.[0]?.properties as RouteProps | undefined)?.id;
    const r = ALL.find((x) => x.id === id);
    if (!r) return;
    const title = document.createElement('p');
    title.className = 'map-card__title';
    title.textContent = r.name;
    const meta = document.createElement('p');
    meta.className = 'map-card__meta';
    meta.textContent = `${r.kind === 'mer' ? 'Route maritime' : 'Route terrestre'} · ${formatYear(r.from)} – ${formatYear(r.to)}`;
    const goods = document.createElement('p');
    goods.className = 'map-card__text';
    goods.textContent = `Marchandises : ${r.goods.join(', ')}. Étapes : ${r.stops.join(' → ')}.`;
    const text = document.createElement('p');
    text.className = 'map-card__text';
    text.textContent = r.description;
    const link = document.createElement('a');
    link.className = 'map-card__link';
    link.href = r.wikipedia;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'En savoir plus sur Wikipédia ↗';
    openMapCard(this.map, e.originalEvent.clientX, e.originalEvent.clientY, r.name, [title, meta, goods, text, link]);
  };

  private apply() {
    const src = this.map.getSource(SRC) as GeoJSONSource | undefined;
    if (!src) return;
    const list = this.enabled ? activeRoutes(ALL, this.year) : [];
    this.active = list.map((route) => ({ route, cum: cumulative(route.path) }));
    const fc: FeatureCollection<LineString, RouteProps> = {
      type: 'FeatureCollection',
      features: list.map((r) => ({ type: 'Feature', properties: { id: r.id, name: r.name, kind: r.kind }, geometry: { type: 'LineString', coordinates: r.path } })),
    };
    src.setData(fc);
    this.drawMovers(performance.now());
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.active.length && !prefersReducedMotion() && !document.hidden) this.raf = requestAnimationFrame(this.tick);
  }

  /** Voyageurs répartis le long de chaque route, qui avancent avec le temps. */
  private drawMovers(now: number) {
    const src = this.map.getSource(SRC_MOVERS) as GeoJSONSource | undefined;
    if (!src) return;
    const features: Feature<Point, { kind: string }>[] = [];
    for (const { route, cum } of this.active) {
      for (let k = 0; k < MOVERS_PER_ROUTE; k++) {
        const t = (now / TRIP_MS + k / MOVERS_PER_ROUTE) % 1;
        features.push({ type: 'Feature', properties: { kind: route.kind }, geometry: { type: 'Point', coordinates: pointAlong(route.path, cum, t).at } });
      }
    }
    src.setData({ type: 'FeatureCollection', features });
  }

  private tick = (now: number) => {
    // ≈ 12 images/s : assez fluide pour des caravanes, léger pour la carte.
    if (now - this.last > 80) {
      this.last = now;
      this.drawMovers(now);
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  private onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    } else if (!this.raf) void this.ready.then(() => this.apply());
  };

  setYear(year: number) {
    this.year = year;
    void this.ready.then(() => this.apply());
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    void this.ready.then(() => {
      for (const id of IDS) if (this.map.getLayer(id)) this.map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
      this.apply();
    });
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    document.removeEventListener('visibilitychange', this.onVisibility);
    const m = this.map;
    for (const id of CLICKABLE) {
      m.off('click', id, this.onClick);
      m.off('mouseenter', id, this.onEnter);
      m.off('mouseleave', id, this.onLeave);
    }
    if (!m.getStyle()) return;
    for (const id of [...IDS].reverse()) if (m.getLayer(id)) m.removeLayer(id);
    for (const s of [SRC, SRC_MOVERS]) if (m.getSource(s)) m.removeSource(s);
  }
}
