import type { Map as MapLibreMap } from 'maplibre-gl';
import { fanPositions, stacks, type ScreenPoint } from '../lib/stacks';
import { prefersReducedMotion } from '../lib/motion';
import './monuments.css';

/** Deux icônes plus proches que cela (px) forment une pile. */
const STACK_PX = 18;

/** Un calque d'icônes qui participe aux piles (monuments, inventions…). */
export interface PileSource {
  /** Calque symbol MapLibre. */
  layer: string;
  /** Coordonnée d'un élément du calque. */
  locate: (id: string) => [number, number] | undefined;
  /** Nom et icône SVG d'un élément, pour sa pastille dans l'éventail. */
  item: (id: string) => { name: string; iconSvg: string } | undefined;
  /** Clic sur une pastille de l'éventail (coordonnées écran du haut de la pastille). */
  onPick: (id: string, clientX: number, clientY: number) => void;
  /** Éléments de ce calque à masquer (ceux déployés dans l'éventail ; [] à la fermeture). */
  onHidden: (ids: string[]) => void;
}

/** Point d'une pile : `key` = « calque|id ». */
type Pt = ScreenPoint & { src: PileSource; ref: string };

const managers = new WeakMap<MapLibreMap, PileFan>();

/** Gestionnaire unique d'une carte : monuments et inventions d'une même ville forment une seule pile. */
export function pileFanFor(map: MapLibreMap): PileFan {
  let m = managers.get(map);
  if (!m) {
    m = new PileFan(map);
    managers.set(map, m);
  }
  return m;
}

/**
 * Icônes empilées (tous calques inscrits confondus) : badge de nombre collé à la pile, et éventail qui écarte
 * les icônes au survol (ou au premier toucher), refermé dès que la carte bouge.
 */
export class PileFan {
  private sources: PileSource[] = [];
  /** Piles visibles (≥ 2 éléments), recalculées à chaque fin de mouvement. */
  private piles: Pt[][] = [];
  /** Badges de nombre et coordonnée de leur pile (repositionnés à chaque mouvement de la carte). */
  private badges: { el: HTMLDivElement; at: [number, number] }[] = [];
  /** Éventail ouvert : son élément et les points déployés (masqués dans leurs calques). */
  private fan: { el: HTMLDivElement; pts: Pt[] } | null = null;
  private closeTimer = 0;

  constructor(private map: MapLibreMap) {
    map.on('moveend', this.refresh);
    map.on('move', this.placeBadges);
    map.on('movestart', this.close);
    map.on('dragstart', this.close);
    map.on('zoomstart', this.close);
  }

  register(src: PileSource) {
    this.sources.push(src);
  }

  unregister(src: PileSource) {
    this.close();
    this.sources = this.sources.filter((s) => s !== src);
    this.refresh();
  }

  /** Ids d'un calque actuellement déployés (à exclure de son filtre). */
  hiddenOf(src: PileSource): string[] {
    return (this.fan?.pts ?? []).filter((p) => p.src === src).map((p) => p.id);
  }

  /** Recalcule les piles une fois la carte redessinée (après un changement de filtre ou de données). */
  refreshWhenIdle() {
    this.map.once('idle', this.refresh);
  }

  /** Piles visibles à l'écran et leur badge de nombre. */
  refresh = () => {
    for (const b of this.badges) b.el.remove();
    this.badges = [];
    this.piles = [];
    const pts: Pt[] = [];
    for (const src of this.sources) {
      if (!this.map.getLayer(src.layer) || this.map.getLayoutProperty(src.layer, 'visibility') === 'none') continue;
      const seen = new Set<string>();
      for (const f of this.map.queryRenderedFeatures({ layers: [src.layer] })) {
        const id = f.properties?.id as string;
        const at = src.locate(id);
        if (!at || seen.has(id)) continue;
        seen.add(id);
        const p = this.map.project(at);
        pts.push({ id, x: p.x, y: p.y, src, ref: `${src.layer}|${id}` });
      }
    }
    // stacks() regroupe par proximité ; on garde la référence de chaque point (calque + id).
    const byRef = new Map(pts.map((p) => [p.ref, p]));
    this.piles = stacks(
      pts.map((p) => ({ id: p.ref, x: p.x, y: p.y })),
      STACK_PX,
    )
      .filter((g) => g.length > 1)
      .map((g) => g.map((p) => byRef.get(p.id)!));
    const box = this.map.getContainer();
    for (const g of this.piles) {
      const b = document.createElement('div');
      b.className = 'monument-badge';
      b.textContent = String(g.length);
      b.setAttribute('aria-hidden', 'true');
      if (this.fan) b.hidden = true;
      box.append(b);
      this.badges.push({ el: b, at: g[0]!.src.locate(g[0]!.id)! });
    }
    this.placeBadges();
  };

  /** Suit la carte pendant un glissement ou un zoom : le badge reste collé à sa pile. */
  private placeBadges = () => {
    for (const b of this.badges) {
      const p = this.map.project(b.at);
      b.el.style.transform = `translate(${(p.x + 9).toFixed(1)}px, ${(p.y - 15).toFixed(1)}px)`;
    }
  };

  private pileOf(src: PileSource, id: string): Pt[] | undefined {
    return this.piles.find((g) => g.some((p) => p.src === src && p.id === id));
  }

  /** Survol d'une icône : ouvre l'éventail si elle fait partie d'une pile. */
  enter(src: PileSource, id: string | undefined) {
    const pile = id ? this.pileOf(src, id) : undefined;
    if (pile && !this.fan) this.open(pile);
  }

  /** Clic sur une icône : vrai si le clic a ouvert l'éventail (tactile, sans survol) au lieu d'une fiche. */
  click(src: PileSource, id: string): boolean {
    const pile = this.pileOf(src, id);
    if (pile && !this.fan) {
      this.open(pile);
      return true;
    }
    return false;
  }

  /** Écarte les éléments d'une pile en éventail autour de leur point commun. */
  private open(pile: Pt[]) {
    this.close();
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
    el.setAttribute('aria-label', `${pile.length} lieux empilés`);
    const reach = Math.max(...pos.map(([x, y]) => Math.hypot(x, y))) + 40;
    el.style.setProperty('--reach', `${reach}px`);
    let lines = '';
    pos.forEach(([x, y]) => (lines += `<line x1="0" y1="0" x2="${x}" y2="${y}"/>`));
    el.innerHTML = `<svg class="monument-fan__lines" viewBox="${-reach} ${-reach} ${reach * 2} ${reach * 2}" aria-hidden="true">${lines}</svg><span class="monument-fan__hub" aria-hidden="true"></span>`;
    pile.forEach((p, i) => {
      const it = p.src.item(p.id);
      if (!it) return;
      const [x, y] = pos[i]!;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'monument-fan__item';
      btn.dataset.layer = p.src.layer;
      btn.style.setProperty('--x', `${x}px`);
      btn.style.setProperty('--y', `${y}px`);
      btn.setAttribute('aria-label', it.name);
      btn.innerHTML = `<span class="monument-fan__icon">${it.iconSvg}</span><span class="monument-fan__name">${it.name.replace(/</g, '&lt;')}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = btn.getBoundingClientRect();
        p.src.onPick(p.id, r.left + r.width / 2, r.top);
      });
      el.append(btn);
    });
    el.addEventListener('mouseenter', () => window.clearTimeout(this.closeTimer));
    el.addEventListener('mouseleave', () => {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = window.setTimeout(this.close, 300);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
    this.map.getContainer().append(el);
    this.fan = { el, pts: pile };
    for (const b of this.badges) b.el.hidden = true;
    for (const src of new Set(pile.map((p) => p.src))) src.onHidden(this.hiddenOf(src));
    // Déploiement : du centre vers chaque place (transition CSS), sauf mouvement réduit.
    if (reduced) el.classList.add('monument-fan--open');
    else requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('monument-fan--open')));
  }

  close = () => {
    window.clearTimeout(this.closeTimer);
    if (!this.fan) return;
    const srcs = new Set(this.fan.pts.map((p) => p.src));
    this.fan.el.remove();
    this.fan = null;
    for (const b of this.badges) b.el.hidden = false;
    for (const src of srcs) src.onHidden([]);
  };
}
