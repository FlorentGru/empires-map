import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import routes from '../../data/routes.json';
import { ROUTE_CARRIERS, type TradeRoute } from '../types-route';
import { activeRoutes, cumulative, pointAlong } from '../lib/worldEvents';
import { formatYear } from '../lib/years';
import { prefersReducedMotion } from '../lib/motion';
import { openMapCard } from './mapCard';
import { addSvgImages } from './svgImages';
import { carrierSvg, CARRIER_LABELS } from './routeIcons';

const ALL = routes as TradeRoute[];
const SRC = 'trade-routes';
const SRC_MOVERS = 'trade-routes-movers';
const SRC_STOPS = 'trade-routes-stops';
const IDS = [
  'trade-routes-hit',
  'trade-routes-casing',
  'trade-routes-line',
  'trade-routes-sea',
  'trade-routes-label',
  'trade-routes-stops',
  'trade-routes-stops-label',
  'trade-routes-movers',
];
/** Zone de clic invisible et large (14 px) : une ligne de 2 px est trop fine pour la souris. */
const CLICKABLE = ['trade-routes-hit', 'trade-routes-stops'];
const LAND = '#8a5a2b';
const SEA = '#3f6f8f';
/** Teintes plus foncées pour les noms (contraste sur le parchemin et la mer). */
const LAND_TEXT = '#5c3a1c';
const SEA_TEXT = '#22465e';
/** Durée d'un trajet complet d'un voyageur (ms), et nombre de voyageurs par route. */
const TRIP_MS = 45_000;
const MOVERS_PER_ROUTE = 3;

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
    // Un porteur par route (dromadaire, lama, jonque, galion…), dans les deux sens de marche.
    const images = ROUTE_CARRIERS.flatMap((c) => [
      [`carrier-${c}-e`, carrierSvg(c), 32, 24] as [string, string, number, number],
      [`carrier-${c}-w`, carrierSvg(c, true), 32, 24] as [string, string, number, number],
    ]);
    this.ready = addSvgImages(map, images).then(() => {
      if (!map.getStyle() || map.getSource(SRC)) return;
      const before = map.getLayer('city-dot') ? 'city-dot' : undefined;
      map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addSource(SRC_MOVERS, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addSource(SRC_STOPS, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer(
        {
          id: 'trade-routes-hit',
          type: 'line',
          source: SRC,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#000', 'line-width': 14, 'line-opacity': 0 },
        },
        before,
      );
      map.addLayer(
        {
          id: 'trade-routes-casing',
          type: 'line',
          source: SRC,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#f4ead3',
            'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 8, 5] as never,
            'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.9, 0.55] as never,
          },
        },
        before,
      );
      // Terre : trait plein brun ; mer : pointillé bleu (line-dasharray ne dépend pas des données → deux calques).
      // Survol : la route s'épaissit (feature-state « hover », id = index de la feature).
      const hover = (base: number, wide: number) => ['case', ['boolean', ['feature-state', 'hover'], false], wide, base];
      const width = ['interpolate', ['linear'], ['zoom'], 2, hover(1.6, 3.2), 6, hover(3, 5)] as never;
      map.addLayer(
        {
          id: 'trade-routes-line',
          type: 'line',
          source: SRC,
          filter: ['==', ['get', 'kind'], 'terre'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': LAND, 'line-width': width, 'line-opacity': 0.8 },
        },
        before,
      );
      map.addLayer(
        {
          id: 'trade-routes-sea',
          type: 'line',
          source: SRC,
          filter: ['==', ['get', 'kind'], 'mer'],
          layout: { 'line-cap': 'butt', 'line-join': 'round' },
          paint: { 'line-color': SEA, 'line-width': width, 'line-opacity': 0.85, 'line-dasharray': [2.2, 1.6] },
        },
        before,
      );
      map.addLayer(
        {
          id: 'trade-routes-label',
          type: 'symbol',
          source: SRC,
          minzoom: 2.8,
          layout: {
            'symbol-placement': 'line',
            'text-field': ['get', 'name'],
            'text-font': ['Open Sans Semibold'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 3, 12, 7, 14.5] as never,
            'text-letter-spacing': 0.02,
            'symbol-spacing': 520,
            'text-max-angle': 28,
          },
          paint: {
            'text-color': ['match', ['get', 'kind'], 'mer', SEA_TEXT, LAND_TEXT] as never,
            'text-halo-color': '#f7efd9',
            'text-halo-width': 2.2,
            'text-halo-blur': 0.4,
          },
        },
        before,
      );
      // Escales (villes clés) : petit rond à la couleur de la route, nom à partir du zoom 3,5.
      map.addLayer(
        {
          id: 'trade-routes-stops',
          type: 'circle',
          source: SRC_STOPS,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 2.6, 6, 4.5] as never,
            'circle-color': '#f7efd9',
            'circle-stroke-color': ['match', ['get', 'kind'], 'mer', SEA_TEXT, LAND_TEXT] as never,
            'circle-stroke-width': 1.8,
          },
        },
        before,
      );
      map.addLayer(
        {
          id: 'trade-routes-stops-label',
          type: 'symbol',
          source: SRC_STOPS,
          minzoom: 3.5,
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Noto Sans Regular'],
            'text-size': 11,
            'text-offset': [0, 0.9],
            'text-anchor': 'top',
            'text-optional': true,
            'text-max-width': 8,
          },
          paint: { 'text-color': ['match', ['get', 'kind'], 'mer', SEA_TEXT, LAND_TEXT] as never, 'text-halo-color': '#f7efd9', 'text-halo-width': 1.8 },
        },
        before,
      );
      map.addLayer(
        {
          id: 'trade-routes-movers',
          type: 'symbol',
          source: SRC_MOVERS,
          layout: {
            'icon-image': ['concat', 'carrier-', ['get', 'carrier'], '-', ['get', 'dir']] as never,
            'icon-size': ['interpolate', ['linear'], ['zoom'], 2, 0.6, 6, 1] as never,
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
        map.on('mousemove', id, this.onMove);
        map.on('mouseleave', id, this.onLeave);
      }
      this.apply();
    });
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private hovered: number | null = null;

  private setHover(id: number | null) {
    if (this.hovered !== null) this.map.setFeatureState({ source: SRC, id: this.hovered }, { hover: false });
    this.hovered = id;
    if (id !== null) this.map.setFeatureState({ source: SRC, id }, { hover: true });
  }

  private onEnter = () => {
    this.map.getCanvas().style.cursor = 'pointer';
  };
  private onMove = (e: MapMouseEvent & { features?: Feature[] }) => {
    const id = e.features?.[0]?.id;
    this.setHover(typeof id === 'number' ? id : null);
  };
  private onLeave = () => {
    this.map.getCanvas().style.cursor = '';
    this.setHover(null);
  };

  private onClick = (e: MapMouseEvent & { features?: Feature[] }) => {
    // Escale cliquée (au-dessus de la zone de clic des routes) : fiche de l'escale.
    const stopHit = this.map.queryRenderedFeatures(e.point, { layers: ['trade-routes-stops'] })[0];
    if (stopHit) {
      const sp = stopHit.properties as { route: string; name: string; note?: string };
      const route = ALL.find((x) => x.id === sp.route);
      const t = document.createElement('p');
      t.className = 'map-card__title';
      t.textContent = sp.name;
      const m = document.createElement('p');
      m.className = 'map-card__meta';
      m.textContent = route ? `Escale · ${route.name}` : 'Escale';
      const parts: Node[] = [t, m];
      if (sp.note) {
        const n = document.createElement('p');
        n.className = 'map-card__text';
        n.textContent = sp.note;
        parts.push(n);
      }
      openMapCard(this.map, e.originalEvent.clientX, e.originalEvent.clientY, sp.name, parts);
      return;
    }
    const id = (e.features?.[0]?.properties as RouteProps | undefined)?.id;
    const r = ALL.find((x) => x.id === id);
    if (!r) return;
    const title = document.createElement('p');
    title.className = 'map-card__title';
    title.textContent = r.name;
    const meta = document.createElement('p');
    meta.className = 'map-card__meta';
    meta.textContent = `${r.kind === 'mer' ? 'Route maritime' : 'Route terrestre'} · ${CARRIER_LABELS[r.carrier]} · ${formatYear(r.from)} – ${formatYear(r.to)}`;
    const goods = document.createElement('p');
    goods.className = 'map-card__text';
    goods.textContent = `Marchandises : ${r.goods.join(', ')}.`;
    const stops = document.createElement('ol');
    stops.className = 'map-card__stops';
    for (const st of r.stops) {
      const li = document.createElement('li');
      li.textContent = st.note ? `${st.name} — ${st.note}` : st.name;
      stops.append(li);
    }
    const text = document.createElement('p');
    text.className = 'map-card__text';
    text.textContent = r.description;
    const link = document.createElement('a');
    link.className = 'map-card__link';
    link.href = r.wikipedia;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'En savoir plus sur Wikipédia ↗';
    openMapCard(this.map, e.originalEvent.clientX, e.originalEvent.clientY, r.name, [title, meta, goods, stops, text, link]);
  };

  private apply() {
    const src = this.map.getSource(SRC) as GeoJSONSource | undefined;
    if (!src) return;
    const list = this.enabled ? activeRoutes(ALL, this.year) : [];
    this.active = list.map((route) => ({ route, cum: cumulative(route.path) }));
    const fc: FeatureCollection<LineString, RouteProps> = {
      type: 'FeatureCollection',
      features: list.map((r, i) => ({
        type: 'Feature',
        id: i,
        properties: { id: r.id, name: r.name, kind: r.kind },
        geometry: { type: 'LineString', coordinates: r.path },
      })),
    };
    this.setHover(null);
    src.setData(fc);
    (this.map.getSource(SRC_STOPS) as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: list.flatMap((r) =>
        r.stops.map((st) => ({
          type: 'Feature' as const,
          properties: { route: r.id, name: st.name, note: st.note ?? '', kind: r.kind },
          geometry: { type: 'Point' as const, coordinates: st.at },
        })),
      ),
    });
    this.drawMovers(performance.now());
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.active.length && !prefersReducedMotion() && !document.hidden) this.raf = requestAnimationFrame(this.tick);
  }

  /** Voyageurs répartis le long de chaque route, qui avancent avec le temps. */
  private drawMovers(now: number) {
    const src = this.map.getSource(SRC_MOVERS) as GeoJSONSource | undefined;
    if (!src) return;
    const features: Feature<Point, { carrier: string; dir: 'e' | 'w' }>[] = [];
    for (const { route, cum } of this.active) {
      for (let k = 0; k < MOVERS_PER_ROUTE; k++) {
        const t = (now / TRIP_MS + k / MOVERS_PER_ROUTE) % 1;
        const p = pointAlong(route.path, cum, t);
        features.push({ type: 'Feature', properties: { carrier: route.carrier, dir: p.east ? 'e' : 'w' }, geometry: { type: 'Point', coordinates: p.at } });
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
      m.off('mousemove', id, this.onMove);
      m.off('mouseleave', id, this.onLeave);
    }
    if (!m.getStyle()) return;
    for (const id of [...IDS].reverse()) if (m.getLayer(id)) m.removeLayer(id);
    for (const s of [SRC, SRC_MOVERS, SRC_STOPS]) if (m.getSource(s)) m.removeSource(s);
  }
}
