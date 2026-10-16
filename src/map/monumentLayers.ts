import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import type { Feature, FeatureCollection, Point } from 'geojson';
import monuments from '../../data/monuments.json';
import { MONUMENT_KINDS, type Monument } from '../types-monument';
import { formatYear } from '../lib/years';
import { addMonumentIcons } from './monumentIcons';
import { openMapCard } from './mapCard';
import { fanPositions, stacks, type ScreenPoint } from '../lib/stacks';
import { monumentIconSvg } from './monumentIcons';
import { prefersReducedMotion } from '../lib/motion';
import './monuments.css';

/** Deux icônes plus proches que cela (px) forment une pile. */
const STACK_PX = 18;

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
  private enabled = true;
  /** Piles visibles (≥ 2 monuments), recalculées à chaque fin de mouvement. */
  private piles: ScreenPoint[][] = [];
  private badges: HTMLDivElement[] = [];
  /** Éventail ouvert : ses pastilles, et les ids masqués dans le calque. */
  private fan: { el: HTMLDivElement; ids: string[] } | null = null;
  private closeTimer = 0;

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
      map.on('moveend', this.refreshPiles);
      map.on('movestart', this.closeFan);
      map.once('idle', this.refreshPiles);
    });
  }

  private filterFor(year: number, hidden: string[] = []) {
    const f: unknown[] = ['all', ['<=', ['get', 'built'], year], ['>', ['get', 'until'], year]];
    if (hidden.length) f.push(['!', ['in', ['get', 'id'], ['literal', hidden]]]);
    return f as never;
  }

  private applyFilter() {
    if (this.map.getLayer(LAYER)) this.map.setFilter(LAYER, this.filterFor(this.year, this.fan?.ids ?? []));
  }

  /** Piles visibles à l'écran (monuments d'une même ville) et leur badge de nombre. */
  private refreshPiles = () => {
    for (const b of this.badges) b.remove();
    this.badges = [];
    this.piles = [];
    if (!this.enabled || !this.map.getLayer(LAYER)) return;
    const seen = new Set<string>();
    const pts: ScreenPoint[] = [];
    for (const f of this.map.queryRenderedFeatures({ layers: [LAYER] })) {
      const id = f.properties?.id as string;
      const m = ALL.find((x) => x.id === id);
      if (!m || seen.has(id)) continue;
      seen.add(id);
      const p = this.map.project(m.location);
      pts.push({ id, x: p.x, y: p.y });
    }
    this.piles = stacks(pts, STACK_PX).filter((g) => g.length > 1);
    const box = this.map.getContainer();
    for (const g of this.piles) {
      const b = document.createElement('div');
      b.className = 'monument-badge';
      b.textContent = String(g.length);
      b.style.left = `${g[0]!.x + 9}px`;
      b.style.top = `${g[0]!.y - 15}px`;
      b.setAttribute('aria-hidden', 'true');
      box.append(b);
      this.badges.push(b);
    }
  };

  private pileOf(id: string): ScreenPoint[] | undefined {
    return this.piles.find((g) => g.some((p) => p.id === id));
  }

  /** Écarte les monuments d'une pile en éventail autour de leur point commun. */
  private openFan(pile: ScreenPoint[]) {
    this.closeFan();
    const cx = pile.reduce((s, p) => s + p.x, 0) / pile.length;
    const cy = pile.reduce((s, p) => s + p.y, 0) / pile.length;
    // Rayon assez grand pour que les noms (84 px de large) ne se chevauchent pas.
    const pos = fanPositions(pile.length, pile.length > 4 ? 68 : 56);
    const reduced = prefersReducedMotion();
    const el = document.createElement('div');
    el.className = 'monument-fan';
    el.style.left = `${cx}px`;
    el.style.top = `${cy}px`;
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', `${pile.length} monuments`);
    const reach = Math.max(...pos.map(([x, y]) => Math.hypot(x, y))) + 40;
    el.style.setProperty('--reach', `${reach}px`);
    let lines = '';
    pos.forEach(([x, y]) => (lines += `<line x1="0" y1="0" x2="${x}" y2="${y}"/>`));
    el.innerHTML = `<svg class="monument-fan__lines" viewBox="${-reach} ${-reach} ${reach * 2} ${reach * 2}" aria-hidden="true">${lines}</svg><span class="monument-fan__hub" aria-hidden="true"></span>`;
    pile.forEach((p, i) => {
      const m = ALL.find((x) => x.id === p.id)!;
      const [x, y] = pos[i]!;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'monument-fan__item';
      btn.style.setProperty('--x', `${x}px`);
      btn.style.setProperty('--y', `${y}px`);
      btn.setAttribute('aria-label', m.name);
      btn.innerHTML = `<span class="monument-fan__icon">${monumentIconSvg(m.kind)}</span><span class="monument-fan__name">${m.name.replace(/</g, '&lt;')}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = btn.getBoundingClientRect();
        this.openCard(m, r.left + r.width / 2, r.top);
      });
      el.append(btn);
    });
    el.addEventListener('mouseenter', () => window.clearTimeout(this.closeTimer));
    el.addEventListener('mouseleave', () => {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = window.setTimeout(this.closeFan, 300);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeFan();
    });
    this.map.getContainer().append(el);
    this.fan = { el, ids: pile.map((p) => p.id) };
    for (const b of this.badges) b.hidden = true;
    this.applyFilter();
    // Déploiement : du centre vers chaque place (transition CSS), sauf mouvement réduit.
    if (reduced) el.classList.add('monument-fan--open');
    else requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('monument-fan--open')));
  }

  private closeFan = () => {
    window.clearTimeout(this.closeTimer);
    if (!this.fan) return;
    this.fan.el.remove();
    this.fan = null;
    for (const b of this.badges) b.hidden = false;
    this.applyFilter();
  };

  private onEnter = (e: MapMouseEvent & { features?: Feature[] }) => {
    this.map.getCanvas().style.cursor = 'pointer';
    const id = e.features?.[0]?.properties?.id as string | undefined;
    const pile = id ? this.pileOf(id) : undefined;
    if (pile && !this.fan) this.openFan(pile);
  };
  private onLeave = () => {
    this.map.getCanvas().style.cursor = '';
  };

  private onClick = (e: MapMouseEvent & { features?: Feature[] }) => {
    const id = e.features?.[0]?.properties?.id as string | undefined;
    const m = ALL.find((x) => x.id === id);
    if (!m) return;
    // Pile (tactile, sans survol) : le premier toucher ouvre l'éventail.
    const pile = this.pileOf(m.id);
    if (pile && !this.fan) {
      this.openFan(pile);
      return;
    }
    this.openCard(m, e.originalEvent.clientX, e.originalEvent.clientY);
  };

  private openCard(m: Monument, clientX: number, clientY: number) {
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
    openMapCard(this.map, clientX, clientY, m.name, [title, meta, text, link]);
  }

  /** Année de l'étape affichée. */
  setYear(year: number) {
    this.year = year;
    this.closeFan();
    void this.ready.then(() => {
      this.applyFilter();
      this.map.once('idle', this.refreshPiles);
    });
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.closeFan();
    void this.ready.then(() => {
      if (this.map.getLayer(LAYER)) this.map.setLayoutProperty(LAYER, 'visibility', on ? 'visible' : 'none');
      if (on) this.map.once('idle', this.refreshPiles);
      else this.refreshPiles();
    });
  }

  destroy() {
    const m = this.map;
    m.off('click', LAYER, this.onClick);
    m.off('mouseenter', LAYER, this.onEnter);
    m.off('mouseleave', LAYER, this.onLeave);
    m.off('moveend', this.refreshPiles);
    m.off('movestart', this.closeFan);
    this.closeFan();
    for (const b of this.badges) b.remove();
    if (!m.getStyle()) return;
    if (m.getLayer(LAYER)) m.removeLayer(LAYER);
    if (m.getSource(SRC)) m.removeSource(SRC);
  }
}
