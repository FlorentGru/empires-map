import type { Map as MapLibreMap } from 'maplibre-gl';
import { fanPositions, stacks, type ScreenPoint } from '../lib/stacks';
import { prefersReducedMotion } from '../lib/motion';
import './monuments.css';

/** Deux icônes plus proches que cela (px) forment une pile. */
const STACK_PX = 18;

/** Un seul éventail ouvert à la fois, tous calques confondus (monuments et inventions d'une même ville). */
let openFan: PileFan | null = null;

export interface PileFanOptions {
  /** Calque symbol dont on cherche les piles. */
  layer: string;
  /** Coordonnée d'un élément du calque. */
  locate: (id: string) => [number, number] | undefined;
  /** Nom et icône SVG d'un élément, pour sa pastille dans l'éventail. */
  item: (id: string) => { name: string; iconSvg: string } | undefined;
  /** Clic sur une pastille de l'éventail (coordonnées écran du haut de la pastille). */
  onPick: (id: string, clientX: number, clientY: number) => void;
  /** Éléments à masquer dans le calque (ceux déployés dans l'éventail ; [] à la fermeture). */
  onHidden: (ids: string[]) => void;
  /** Libellé accessible de l'éventail, ex. « 3 monuments ». */
  label: (n: number) => string;
  /** Variante de style (classe ajoutée à l'éventail et aux badges), ex. 'invention'. */
  variant?: string;
}

/**
 * Icônes empilées d'un calque (monuments d'une même ville, inventions d'une même capitale…) : badge de nombre
 * collé à la pile, et éventail qui écarte les icônes au survol (ou au premier toucher), refermé dès que la carte bouge.
 */
export class PileFan {
  /** Piles visibles (≥ 2 éléments), recalculées à chaque fin de mouvement. */
  private piles: ScreenPoint[][] = [];
  /** Badges de nombre et coordonnée de leur pile (repositionnés à chaque mouvement de la carte). */
  private badges: { el: HTMLDivElement; at: [number, number] }[] = [];
  /** Éventail ouvert : ses pastilles, et les ids masqués dans le calque. */
  private fan: { el: HTMLDivElement; ids: string[] } | null = null;
  private closeTimer = 0;
  private enabled = true;

  constructor(private map: MapLibreMap, private o: PileFanOptions) {
    map.on('moveend', this.refresh);
    map.on('move', this.placeBadges);
    map.on('movestart', this.close);
    map.on('dragstart', this.close);
    map.on('zoomstart', this.close);
  }

  /** Ids actuellement déployés (à exclure du filtre du calque). */
  get hidden(): string[] {
    return this.fan?.ids ?? [];
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.close();
    this.refreshWhenIdle();
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
    if (!this.enabled || !this.map.getLayer(this.o.layer)) return;
    const seen = new Set<string>();
    const pts: ScreenPoint[] = [];
    for (const f of this.map.queryRenderedFeatures({ layers: [this.o.layer] })) {
      const id = f.properties?.id as string;
      const at = this.o.locate(id);
      if (!at || seen.has(id)) continue;
      seen.add(id);
      const p = this.map.project(at);
      pts.push({ id, x: p.x, y: p.y });
    }
    this.piles = stacks(pts, STACK_PX).filter((g) => g.length > 1);
    const box = this.map.getContainer();
    for (const g of this.piles) {
      const b = document.createElement('div');
      b.className = `monument-badge${this.o.variant ? ` monument-badge--${this.o.variant}` : ''}`;
      b.textContent = String(g.length);
      b.setAttribute('aria-hidden', 'true');
      if (this.fan) b.hidden = true;
      box.append(b);
      this.badges.push({ el: b, at: this.o.locate(g[0]!.id)! });
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

  private pileOf(id: string): ScreenPoint[] | undefined {
    return this.piles.find((g) => g.some((p) => p.id === id));
  }

  /** Survol d'une icône : ouvre l'éventail si elle fait partie d'une pile. */
  enter(id: string | undefined) {
    const pile = id ? this.pileOf(id) : undefined;
    if (pile && !this.fan && !openFan) this.open(pile);
  }

  /** Clic sur une icône : vrai si le clic a ouvert l'éventail (tactile, sans survol) au lieu d'une fiche. */
  click(id: string): boolean {
    const pile = this.pileOf(id);
    if (pile && !this.fan) {
      this.open(pile);
      return true;
    }
    return false;
  }

  /** Écarte les éléments d'une pile en éventail autour de leur point commun. */
  private open(pile: ScreenPoint[]) {
    this.close();
    openFan?.close();
    openFan = this;
    const cx = pile.reduce((s, p) => s + p.x, 0) / pile.length;
    const cy = pile.reduce((s, p) => s + p.y, 0) / pile.length;
    // Rayon assez grand pour que les noms (84 px de large) ne se chevauchent pas.
    const pos = fanPositions(pile.length, pile.length > 4 ? 68 : 56);
    const reduced = prefersReducedMotion();
    const el = document.createElement('div');
    el.className = `monument-fan${this.o.variant ? ` monument-fan--${this.o.variant}` : ''}`;
    el.style.left = `${cx}px`;
    el.style.top = `${cy}px`;
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', this.o.label(pile.length));
    const reach = Math.max(...pos.map(([x, y]) => Math.hypot(x, y))) + 40;
    el.style.setProperty('--reach', `${reach}px`);
    let lines = '';
    pos.forEach(([x, y]) => (lines += `<line x1="0" y1="0" x2="${x}" y2="${y}"/>`));
    el.innerHTML = `<svg class="monument-fan__lines" viewBox="${-reach} ${-reach} ${reach * 2} ${reach * 2}" aria-hidden="true">${lines}</svg><span class="monument-fan__hub" aria-hidden="true"></span>`;
    pile.forEach((p, i) => {
      const it = this.o.item(p.id);
      if (!it) return;
      const [x, y] = pos[i]!;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'monument-fan__item';
      btn.style.setProperty('--x', `${x}px`);
      btn.style.setProperty('--y', `${y}px`);
      btn.setAttribute('aria-label', it.name);
      btn.innerHTML = `<span class="monument-fan__icon">${it.iconSvg}</span><span class="monument-fan__name">${it.name.replace(/</g, '&lt;')}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = btn.getBoundingClientRect();
        this.o.onPick(p.id, r.left + r.width / 2, r.top);
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
    this.fan = { el, ids: pile.map((p) => p.id) };
    for (const b of this.badges) b.el.hidden = true;
    this.o.onHidden(this.fan.ids);
    // Déploiement : du centre vers chaque place (transition CSS), sauf mouvement réduit.
    if (reduced) el.classList.add('monument-fan--open');
    else requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('monument-fan--open')));
  }

  close = () => {
    window.clearTimeout(this.closeTimer);
    if (!this.fan) return;
    if (openFan === this) openFan = null;
    this.fan.el.remove();
    this.fan = null;
    for (const b of this.badges) b.el.hidden = false;
    this.o.onHidden([]);
  };

  destroy() {
    const m = this.map;
    m.off('moveend', this.refresh);
    m.off('move', this.placeBadges);
    m.off('movestart', this.close);
    m.off('dragstart', this.close);
    m.off('zoomstart', this.close);
    this.close();
    for (const b of this.badges) b.el.remove();
    this.badges = [];
  }
}
