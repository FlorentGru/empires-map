import { Marker, type Map as MapLibreMap } from 'maplibre-gl';
import type { Figure, TimelineStep } from '../types';
import { FACTION_COLORS, characterSvg } from './sprites';

const TYPE_MS = 1200;
const TYPE_DELAY_MS = 1500; // la caméra arrive vers 2 s
const PAIR_DX = 50;
const BATTLE_DELAY_MS = 3500; // les figures d'une bataille n'apparaissent qu'après le choc
const BATTLE_GAP = 150; // écart écran (px) entre le lieu de bataille et la figure
const BATTLE_GAP_MOBILE = 100;
const SPRITE_CENTER = 24; // centre du sprite au-dessus de l'ancre (px)

interface Arrival {
  last: [number, number];
  prev: [number, number];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface Insets {
  right: number;
  left: number;
  top: number;
}

/** Personnages d'époque : sprite, nom + rôle, bulle de citation qui s'écrit. */
export class FigureLayer {
  private markers: Marker[] = [];
  private bubbles: HTMLElement[] = [];
  private typed: { el: HTMLElement; chars: string[] }[] = [];
  private timers: number[] = [];
  private raf = 0;
  private t0 = 0;
  private speed = 1;
  private onMoveEnd = () => this.fit();

  /** insets : zones de l'écran à ne pas recouvrir (panneau latéral, barre du haut). */
  constructor(private map: MapLibreMap, private insets: () => Insets) {}

  clear() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    this.map.off('moveend', this.onMoveEnd);
    for (const m of this.markers) m.remove();
    this.markers = [];
    this.bubbles = [];
    this.typed = [];
  }

  destroy() {
    this.clear();
  }

  show(step: TimelineStep, speed: number, reduced: boolean) {
    this.clear();
    const figures = step.figures ?? [];
    if (figures.length === 0) return;
    this.speed = Math.max(0.25, speed);

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
      this.timers.push(window.setTimeout(() => this.spawn(step, figures, arrivals, false, 150), BATTLE_DELAY_MS / this.speed));
    }
  }

  /** Décalage écran (px) de la figure par rapport au lieu de bataille : côté opposé à l'arrivée des armées. */
  private battleOffset(arrivals: Arrival[]): [number, number] {
    const map = this.map;
    let vx = 0;
    let vy = 0;
    let first: [number, number] | null = null;
    for (const a of arrivals) {
      const p1 = map.project(a.last);
      const p0 = map.project(a.prev);
      vx += p1.x - p0.x;
      vy += p1.y - p0.y;
      if (!first) first = [p1.x - p0.x, p1.y - p0.y];
    }
    let len = Math.hypot(vx, vy);
    if (len < 1) {
      // Armées arrivant de côtés opposés : on s'écarte sur la perpendiculaire (vers le haut de l'écran).
      const [fx, fy] = first ?? [1, 0];
      vx = -fy;
      vy = fx;
      if (vy > 0) {
        vx = -vx;
        vy = -vy;
      }
      len = Math.hypot(vx, vy);
      if (len < 1e-6) {
        vx = 0;
        vy = -1;
        len = 1;
      }
    }
    const gap = window.innerWidth < 768 ? BATTLE_GAP_MOBILE : BATTLE_GAP;
    return [(-vx / len) * gap, (-vy / len) * gap];
  }

  private spawn(step: TimelineStep, figures: Figure[], arrivals: Arrival[] | null, reduced: boolean, typeDelayMs: number) {
    const pair = figures.length === 2;
    let battle: [number, number] | null = null;
    let off: [number, number] = [0, 0];
    if (arrivals) {
      battle = arrivals[0]!.last;
      off = this.battleOffset(arrivals);
      // Si la figure sortirait de la carte, on prend le côté inverse.
      const box = this.map.getContainer().getBoundingClientRect();
      const c = this.map.project(battle);
      const x = c.x + off[0];
      const y = c.y + off[1];
      if (box.width > 50 && (x < 60 || x > box.width - 60 || y < 120 || y > box.height - 80)) off = [-off[0], -off[1]];
    }

    figures.forEach((f, i) => {
      const pos = battle ?? f.position ?? step.location;
      if (!pos) return;
      const side = pair ? (i === 0 ? -1 : 1) : 0;
      const ox = off[0] + side * PAIR_DX;
      const oy = off[1];
      const el = this.build(f, side, battle ? [ox, oy] : null);
      this.markers.push(new Marker({ element: el, anchor: 'bottom', offset: [ox, oy] }).setLngLat(pos).addTo(this.map));
    });

    if (pair && !battle) {
      const pos = figures[0]?.position ?? step.location;
      if (pos) {
        const el = document.createElement('div');
        el.className = 'treaty-marker';
        el.setAttribute('aria-hidden', 'true');
        el.textContent = '📜';
        this.markers.push(new Marker({ element: el, anchor: 'bottom', offset: [0, -4] }).setLngLat(pos).addTo(this.map));
      }
    }

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
    this.map.off('moveend', this.onMoveEnd);
    this.map.on('moveend', this.onMoveEnd);
    this.timers.push(window.setTimeout(() => this.fit(), 60));
  }

  private build(f: Figure, side: number, link: [number, number] | null): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'figure-marker';
    const tint = FACTION_COLORS[f.faction];
    const flip = side > 0 ? ' figure-marker__sprite--flip' : '';
    const dir = side < 0 ? ' figure-bubble--toleft' : side > 0 ? ' figure-bubble--toright' : '';
    let bubble = '';
    if (f.quote) {
      bubble =
        `<div class="figure-bubble${dir}" role="note" aria-label="${escapeHtml(f.name)} : ${escapeHtml(f.quote)}">` +
        `<span class="figure-bubble__ghost" aria-hidden="true">« ${escapeHtml(f.quote)} »</span>` +
        '<span class="figure-bubble__typed" aria-hidden="true"></span></div>';
    }
    let linkHtml = '';
    if (link) {
      // Trait pointillé du centre de la figure vers le lieu de bataille (= ancre − décalage).
      const dx = -link[0];
      const dy = -link[1] + SPRITE_CENTER;
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      const from = 24;
      const to = Math.max(from, len - 20);
      linkHtml =
        `<span class="figure-marker__link" aria-hidden="true" style="width:${Math.round(to - from)}px;` +
        `transform:translate(${(22 + ux * from).toFixed(1)}px,${(SPRITE_CENTER + uy * from).toFixed(1)}px) rotate(${Math.atan2(dy, dx).toFixed(4)}rad)"></span>`;
    }
    el.innerHTML =
      linkHtml +
      `<div class="figure-marker__card">${bubble}` +
      `<div class="figure-marker__sprite${flip}">${characterSvg(f.archetype, tint)}</div>` +
      `<div class="figure-marker__label"><strong>${escapeHtml(f.name)}</strong><span>${escapeHtml(f.role)}</span></div></div>`;
    const b = el.querySelector<HTMLElement>('.figure-bubble');
    const t = el.querySelector<HTMLElement>('.figure-bubble__typed');
    if (b && t && f.quote) {
      this.bubbles.push(b);
      this.typed.push({ el: t, chars: Array.from(`« ${f.quote} »`) });
    }
    return el;
  }

  private tick = (now: number) => {
    if (this.t0 === 0) this.t0 = now;
    const p = Math.min(1, (now - this.t0) / (TYPE_MS / this.speed));
    for (const t of this.typed) t.el.textContent = t.chars.slice(0, Math.ceil(t.chars.length * p)).join('');
    if (p < 1) this.raf = requestAnimationFrame(this.tick);
    else this.raf = 0;
  };

  /** Rectangle englobant des marqueurs d'armées (et du choc) présents à l'écran, ou null. */
  private armiesRect(): DOMRect | null {
    const els = this.map.getContainer().querySelectorAll('.army-marker, .clash-marker');
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
    return l === Infinity ? null : new DOMRect(l - 6, t - 6, r - l + 12, b - t + 12);
  }

  /** Place chaque bulle dans la zone libre : bords, panneau, et hors du rectangle des armées. */
  private fit() {
    const box = this.map.getContainer().getBoundingClientRect();
    if (box.width < 50 || box.height < 50) return; // carte masquée : mesures inexploitables
    const ins = this.insets();
    const minX = box.left + ins.left + 8;
    const maxX = box.right - ins.right - 8;
    const minY = box.top + ins.top;
    const army = this.armiesRect();
    const hits = (r: DOMRect) =>
      !!army && r.left < army.right && r.right > army.left && r.top < army.bottom && r.bottom > army.top;
    const clamp = (r: DOMRect) => {
      let shift = 0;
      if (r.right > maxX) shift = maxX - r.right;
      if (r.left + shift < minX) shift = minX - r.left;
      return shift;
    };

    for (const b of this.bubbles) {
      // Candidats : au-dessus, en dessous, puis à gauche / à droite du rectangle des armées.
      let chosen: { below: boolean; shift: number } | null = null;
      let fallback: { below: boolean; shift: number } | null = null;
      for (const mode of ['above', 'below', 'left', 'right'] as const) {
        if ((mode === 'left' || mode === 'right') && !army) continue;
        const below = mode === 'below';
        b.classList.toggle('figure-bubble--below', below);
        b.style.setProperty('--shift', '0px');
        const r0 = b.getBoundingClientRect();
        let shift = 0;
        if (mode === 'left' && army) shift = army.left - 8 - r0.right;
        else if (mode === 'right' && army) shift = army.right + 8 - r0.left;
        else shift = clamp(r0);
        b.style.setProperty('--shift', `${Math.round(shift)}px`);
        const r = b.getBoundingClientRect();
        const inside = r.left >= minX - 1 && r.right <= maxX + 1 && r.top >= minY;
        const cand = { below, shift: Math.round(shift) };
        if (mode === 'above') fallback = { below: r.top < minY, shift: Math.round(clamp(r0)) };
        if (inside && !hits(r)) {
          chosen = cand;
          break;
        }
      }
      const final = chosen ?? fallback ?? { below: false, shift: 0 };
      b.classList.toggle('figure-bubble--below', final.below);
      b.style.setProperty('--shift', `${final.shift}px`);
    }
  }
}
