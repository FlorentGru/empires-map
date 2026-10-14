import type { Map as MapLibreMap } from 'maplibre-gl';
import type { Figure, TimelineStep } from '../types';
import { FACTION_COLORS, characterSvg } from './sprites';

const TYPE_MS = 1200;
const TYPE_DELAY_MS = 1500; // la caméra arrive vers 2 s
const BATTLE_DELAY_MS = 3500; // les figures d'une bataille n'apparaissent qu'après le choc
const CHAIN_DELAY_MS = 5000; // idem pour une étape à armées chaînées (marche plus longue)
const DIST = 90; // distance mini ancre → centre de la carte (px)
const DIST_MOBILE = 70;
const SPRITE_W = 44;
const SPRITE_H = 48;

/** 8 directions écran : N, NE, E, SE, S, SO, O, NO. */
const DIRS: [number, number][] = [
  [0, -1],
  [Math.SQRT1_2, -Math.SQRT1_2],
  [1, 0],
  [Math.SQRT1_2, Math.SQRT1_2],
  [0, 1],
  [-Math.SQRT1_2, Math.SQRT1_2],
  [-1, 0],
  [-Math.SQRT1_2, -Math.SQRT1_2],
];

interface Arrival {
  last: [number, number];
  prev: [number, number];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface Insets {
  right: number;
  left: number;
  top: number;
  bottom?: number;
}

/** Une carte de personnage : élément, ancre géographique, taille mesurée (une fois). */
interface Card {
  el: HTMLDivElement;
  link: HTMLDivElement;
  arrow: HTMLElement;
  anchor: [number, number];
  /** Direction de préférence (vecteur écran, relatif aux armées) ; null = calculée à partir de `slot`. */
  slot: number; // 0 seule, -1 / +1 paire
  /** Emprise de la carte autour de l'origine du sprite : décalage et taille. */
  ox: number;
  oy: number;
  w: number;
  h: number;
  off: boolean;
}

const overlap = (a: Rect, b: Rect) => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
};

/**
 * Personnages d'époque : une superposition DOM unique, une carte par personnage placée à chaque frame de
 * mouvement de la caméra (8 candidats autour de l'ancre, sans chevaucher armées, autres cartes ni panneaux).
 */
export class FigureLayer {
  private overlay: HTMLDivElement | null = null;
  private cards: Card[] = [];
  private scroll: HTMLElement | null = null;
  private arrivals: Arrival[] | null = null;
  private title = '';
  private typed: { el: HTMLElement; chars: string[] }[] = [];
  private timers: number[] = [];
  private raf = 0;
  private layoutRaf = 0;
  private t0 = 0;
  private speed = 1;
  private onMove = () => this.schedule();

  /** insets : zones de l'écran à ne pas recouvrir (panneau latéral, barre du haut, frise). */
  constructor(private map: MapLibreMap, private insets: () => Insets) {}

  clear() {
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.layoutRaf);
    this.raf = 0;
    this.layoutRaf = 0;
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    this.map.off('move', this.onMove);
    this.map.off('resize', this.onMove);
    this.overlay?.remove();
    this.overlay = null;
    this.cards = [];
    this.scroll = null;
    this.arrivals = null;
    this.typed = [];
  }

  destroy() {
    this.clear();
  }

  show(step: TimelineStep, speed: number, reduced: boolean, chained = false) {
    this.clear();
    const figures = step.figures ?? [];
    if (figures.length === 0) return;
    this.speed = Math.max(0.25, speed);
    this.title = step.title;

    const armies = (step.armies ?? []).filter((a) => a.path.length >= 2);
    if (armies.length === 0) {
      this.spawn(step, figures, null, reduced, TYPE_DELAY_MS / this.speed);
      return;
    }
    // Étape de bataille : les figures arrivent après le choc, à l'écart des armées.
    const arrivals: Arrival[] = armies.map((a) => ({ last: a.path[a.path.length - 1]!, prev: a.path[a.path.length - 2]! }));
    if (reduced) {
      this.spawn(step, figures, arrivals, true, 0);
    } else {
      const delay = (chained ? CHAIN_DELAY_MS : BATTLE_DELAY_MS) / this.speed;
      this.timers.push(window.setTimeout(() => this.spawn(step, figures, arrivals, false, 150), delay));
    }
  }

  private spawn(step: TimelineStep, figures: Figure[], arrivals: Arrival[] | null, reduced: boolean, typeDelayMs: number) {
    const container = this.map.getContainer();
    const overlay = document.createElement('div');
    overlay.className = 'figure-overlay';
    container.appendChild(overlay);
    this.overlay = overlay;
    this.arrivals = arrivals;

    const pair = figures.length === 2;
    const battle = arrivals ? arrivals[0]!.last : null;
    figures.forEach((f, i) => {
      const pos = battle ?? f.position ?? step.location;
      if (!pos) return;
      const slot = pair ? (i === 0 ? -1 : 1) : 0;
      const el = this.build(f, slot);
      const link = document.createElement('div');
      link.className = 'figure-link';
      overlay.appendChild(link);
      overlay.appendChild(el);
      const arrow = el.querySelector<HTMLElement>('.figure-marker__arrow')!;
      this.cards.push({ el, link, arrow, anchor: pos, slot, ox: 0, oy: 0, w: 0, h: 0, off: false });
    });

    if (pair && !battle && this.cards.length === 2) {
      const el = document.createElement('div');
      el.className = 'treaty-marker figure-scroll';
      el.setAttribute('aria-hidden', 'true');
      el.textContent = '📜';
      overlay.appendChild(el);
      this.scroll = el;
    }

    // Mesure unique de chaque carte (bulle et étiquette comprises).
    for (const c of this.cards) this.measure(c);
    this.layout();

    if (reduced) {
      for (const t of this.typed) t.el.textContent = t.chars.join('');
    } else if (this.typed.length > 0) {
      this.timers.push(
        window.setTimeout(() => {
          this.t0 = 0;
          this.raf = requestAnimationFrame(this.tick);
        }, typeDelayMs),
      );
    }
    this.map.off('move', this.onMove);
    this.map.on('move', this.onMove);
    this.map.on('resize', this.onMove);
    // Les armées bougent encore un instant (recul du vaincu) : on replace une fois posées.
    if (arrivals && !reduced) {
      this.timers.push(window.setTimeout(() => this.schedule(), 80));
      this.timers.push(window.setTimeout(() => this.schedule(), 1100 / this.speed));
    } else {
      this.timers.push(window.setTimeout(() => this.schedule(), 80));
    }
  }

  private measure(c: Card) {
    const b = c.el.querySelector<HTMLElement>('.figure-bubble');
    const l = c.el.querySelector<HTMLElement>('.figure-marker__label');
    const bw = b?.offsetWidth ?? 0;
    const bh = b?.offsetHeight ?? 0;
    const lw = l?.offsetWidth ?? 0;
    const lh = l?.offsetHeight ?? 0;
    const left = Math.min(0, (SPRITE_W - bw) / 2, (SPRITE_W - lw) / 2);
    const right = Math.max(SPRITE_W, (SPRITE_W + bw) / 2, (SPRITE_W + lw) / 2);
    const top = b ? -(bh + 8) : 0;
    const bottom = SPRITE_H + 2 + lh;
    c.ox = left;
    c.oy = top;
    c.w = right - left;
    c.h = bottom - top;
  }

  private build(f: Figure, slot: number): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'figure-marker';
    el.style.visibility = 'hidden';
    const tint = FACTION_COLORS[f.faction];
    const flip = slot > 0 ? ' figure-marker__sprite--flip' : '';
    let bubble = '';
    if (f.quote) {
      bubble =
        `<div class="figure-bubble" role="note" aria-label="${escapeHtml(f.name)} : ${escapeHtml(f.quote)}">` +
        `<span class="figure-bubble__ghost" aria-hidden="true">« ${escapeHtml(f.quote)} »</span>` +
        '<span class="figure-bubble__typed" aria-hidden="true"></span></div>';
    }
    el.innerHTML =
      '<span class="figure-marker__arrow" aria-hidden="true"></span>' +
      `<div class="figure-marker__card">${bubble}` +
      `<div class="figure-marker__sprite${flip}">${characterSvg(f.archetype, tint)}</div>` +
      `<div class="figure-marker__label"><strong>${escapeHtml(f.name)}</strong><span>${escapeHtml(f.role)}</span>` +
      `<em class="figure-marker__where">→ ${escapeHtml(this.title)}</em></div></div>`;
    const t = el.querySelector<HTMLElement>('.figure-bubble__typed');
    if (t && f.quote) this.typed.push({ el: t, chars: Array.from(`« ${f.quote} »`) });
    return el;
  }

  private tick = (now: number) => {
    if (this.t0 === 0) this.t0 = now;
    const p = Math.min(1, (now - this.t0) / (TYPE_MS / this.speed));
    for (const t of this.typed) t.el.textContent = t.chars.slice(0, Math.ceil(t.chars.length * p)).join('');
    if (p < 1) this.raf = requestAnimationFrame(this.tick);
    else this.raf = 0;
  };

  /** Une seule passe de placement par frame. */
  private schedule() {
    if (this.layoutRaf || !this.overlay) return;
    this.layoutRaf = requestAnimationFrame(() => {
      this.layoutRaf = 0;
      this.layout();
    });
  }

  /** Rectangle englobant des armées et du choc (coordonnées du conteneur), ou null. Mesuré une fois par passe. */
  private armiesRect(cx: number, cy: number): Rect | null {
    const els = this.map.getContainer().querySelectorAll('.army-marker, .clash-marker, .army-label');
    let l = Infinity;
    let t = Infinity;
    let r = -Infinity;
    let b = -Infinity;
    els.forEach((e) => {
      const q = e.getBoundingClientRect();
      if (q.width === 0 && q.height === 0) return;
      l = Math.min(l, q.left);
      t = Math.min(t, q.top);
      r = Math.max(r, q.right);
      b = Math.max(b, q.bottom);
    });
    return l === Infinity ? null : { x: l - cx - 6, y: t - cy - 6, w: r - l + 12, h: b - t + 12 };
  }

  /** Rectangles approximatifs des noms d'États affichés sur la carte (canvas) : les cartes ne doivent pas les masquer. */
  private labelRects(): Rect[] {
    if (!this.map.getLayer('territory-labels')) return [];
    const out: Rect[] = [];
    for (const f of this.map.queryRenderedFeatures({ layers: ['territory-labels'] })) {
      if (f.geometry.type !== 'Point') continue;
      const p = this.map.project(f.geometry.coordinates as [number, number]);
      const text = String(f.properties?.label ?? '');
      const w = Math.min(160, text.length * 8.5) + 12;
      out.push({ x: p.x - w / 2, y: p.y - 13, w, h: 26 });
    }
    return out;
  }

  /** Vecteur écran « à l'opposé de l'arrivée des armées » (unitaire). */
  private awayVector(): [number, number] {
    let vx = 0;
    let vy = 0;
    let fx = 1;
    let fy = 0;
    let k = 0;
    for (const a of this.arrivals ?? []) {
      const p1 = this.map.project(a.last);
      const p0 = this.map.project(a.prev);
      vx += p1.x - p0.x;
      vy += p1.y - p0.y;
      if (k++ === 0) {
        fx = p1.x - p0.x;
        fy = p1.y - p0.y;
      }
    }
    let len = Math.hypot(vx, vy);
    if (len < 1) {
      // Armées arrivant de côtés opposés : perpendiculaire, vers le haut de l'écran.
      vx = -fy;
      vy = fx;
      if (vy > 0) {
        vx = -vx;
        vy = -vy;
      }
      len = Math.hypot(vx, vy);
      if (len < 1e-6) return [0, -1];
    }
    return [-vx / len, -vy / len];
  }

  private layout() {
    const overlay = this.overlay;
    if (!overlay || this.cards.length === 0) return;
    const container = this.map.getContainer();
    const W = container.clientWidth;
    const H = container.clientHeight;
    if (W < 50 || H < 50) return; // carte masquée : mesures inexploitables
    const cbox = container.getBoundingClientRect();
    const army = this.armiesRect(cbox.left, cbox.top);
    const labels = this.labelRects();

    const ins = this.insets();
    const minX = ins.left + 8;
    const maxX = W - ins.right - 8;
    const minY = ins.top;
    const maxY = H - (ins.bottom ?? 0);
    const zone: Rect = { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
    const base = window.innerWidth < 768 ? DIST_MOBILE : DIST;

    // Direction préférée de chaque carte.
    let away: [number, number] = [0, -1];
    if (this.arrivals) away = this.awayVector();
    const prefOf = (slot: number): [number, number] => {
      if (!this.arrivals) return slot === 0 ? [0, -1] : [slot, 0];
      if (slot === 0) return away;
      const a = (slot * Math.PI) / 3; // paire : éventail de ±60° autour de la direction opposée
      return [away[0] * Math.cos(a) - away[1] * Math.sin(a), away[0] * Math.sin(a) + away[1] * Math.cos(a)];
    };

    const placed: Rect[] = [];
    const projected: { x: number; y: number }[] = [];
    for (const c of this.cards) {
      const pt = this.map.project(c.anchor);
      projected.push({ x: pt.x, y: pt.y });
      c.off = pt.x < minX || pt.x > maxX || pt.y < minY || pt.y > maxY;
      let rect: Rect;
      if (c.off) {
        // Ancre hors de la zone libre : la carte se colle au bord le plus proche.
        const x = Math.min(Math.max(pt.x - c.w / 2, zone.x), zone.x + zone.w - c.w);
        const y = Math.min(Math.max(pt.y - c.h / 2, zone.y), zone.y + zone.h - c.h);
        rect = { x, y, w: c.w, h: c.h };
      } else {
        const pref = prefOf(c.slot);
        const order = DIRS.map((d) => d).sort((a, b) => b[0] * pref[0] + b[1] * pref[1] - (a[0] * pref[0] + a[1] * pref[1]));
        let best: Rect | null = null;
        let bestScore = Infinity;
        for (const [ux, uy] of order) {
          const dist = Math.max(base, 24 + Math.abs(ux) * (c.w / 2) + Math.abs(uy) * (c.h / 2));
          const r: Rect = { x: pt.x + ux * dist - c.w / 2, y: pt.y + uy * dist - c.h / 2, w: c.w, h: c.h };
          const padded: Rect = { x: r.x - 4, y: r.y - 4, w: r.w + 8, h: r.h + 8 };
          let score = (c.w * c.h - overlap(r, zone)) * 2;
          for (const o of placed) score += overlap(padded, o);
          if (army) score += overlap(padded, army);
          for (const l of labels) score += overlap(padded, l);
          if (score === 0) {
            best = r;
            break;
          }
          if (score < bestScore) {
            bestScore = score;
            best = r;
          }
        }
        rect = best!;
      }
      placed.push(rect);

      // Écritures : la carte (origine du sprite = rect − décalage), puis le trait de rappel ou la flèche.
      const px = rect.x - c.ox;
      const py = rect.y - c.oy;
      c.el.style.transform = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0)`;
      c.el.style.visibility = 'visible';
      c.el.classList.toggle('figure-marker--off', c.off);
      const sx = rect.x + rect.w / 2;
      const sy = rect.y + rect.h / 2;
      if (c.off) {
        c.link.style.display = 'none';
        const ang = Math.atan2(pt.y - sy, pt.x - sx);
        c.arrow.style.transform = `translate(${SPRITE_W / 2}px,${SPRITE_H / 2}px) rotate(${ang.toFixed(3)}rad) translateX(${(Math.max(c.w, c.h) / 2 + 6).toFixed(0)}px)`;
      } else {
        // Trait : de l'ancre (à 8 px) jusqu'au point de la carte le plus proche.
        const nx = Math.min(Math.max(pt.x, rect.x), rect.x + rect.w);
        const ny = Math.min(Math.max(pt.y, rect.y), rect.y + rect.h);
        const dx = nx - pt.x;
        const dy = ny - pt.y;
        const len = Math.hypot(dx, dy);
        if (len > 14) {
          const ux = dx / len;
          const uy = dy / len;
          c.link.style.display = 'block';
          c.link.style.width = `${(len - 12).toFixed(1)}px`;
          c.link.style.transform = `translate3d(${(pt.x + ux * 8).toFixed(1)}px,${(pt.y + uy * 8).toFixed(1)}px,0) rotate(${Math.atan2(dy, dx).toFixed(4)}rad)`;
        } else c.link.style.display = 'none';
      }
    }

    if (this.scroll && projected.length === 2) {
      const mx = (projected[0]!.x + projected[1]!.x) / 2;
      const my = (projected[0]!.y + projected[1]!.y) / 2;
      this.scroll.style.transform = `translate3d(${(mx - 12).toFixed(1)}px,${(my - 26).toFixed(1)}px,0)`;
    }
  }
}
