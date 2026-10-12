import { Marker, type Map as MapLibreMap } from 'maplibre-gl';
import type { Figure, TimelineStep } from '../types';
import { FACTION_COLORS, characterSvg } from './sprites';

const TYPE_MS = 1200;
const TYPE_DELAY_MS = 1500; // la caméra arrive vers 2 s
const PAIR_DX = 50;

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
    const pair = figures.length === 2;

    figures.forEach((f, i) => {
      const pos = f.position ?? step.location;
      if (!pos) return;
      const side = pair ? (i === 0 ? -1 : 1) : 0;
      const el = this.build(f, side);
      this.markers.push(new Marker({ element: el, anchor: 'bottom', offset: [side * PAIR_DX, 0] }).setLngLat(pos).addTo(this.map));
    });

    if (pair) {
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
        }, TYPE_DELAY_MS / this.speed),
      );
    }
    this.map.on('moveend', this.onMoveEnd);
    this.timers.push(window.setTimeout(() => this.fit(), 60));
  }

  private build(f: Figure, side: number): HTMLDivElement {
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
    el.innerHTML =
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

  /** Décale chaque bulle horizontalement pour qu'elle reste dans la zone libre de l'écran. */
  private fit() {
    const box = this.map.getContainer().getBoundingClientRect();
    if (box.width < 50 || box.height < 50) return; // carte masquée : mesures inexploitables
    const ins = this.insets();
    const minX = box.left + ins.left + 8;
    const maxX = box.right - ins.right - 8;
    for (const b of this.bubbles) {
      b.style.setProperty('--shift', '0px');
      b.classList.remove('figure-bubble--below');
      const r = b.getBoundingClientRect();
      let shift = 0;
      if (r.right > maxX) shift = maxX - r.right;
      if (r.left + shift < minX) shift = minX - r.left;
      b.style.setProperty('--shift', `${Math.round(shift)}px`);
      if (r.top < box.top + ins.top) b.classList.add('figure-bubble--below');
    }
  }
}
