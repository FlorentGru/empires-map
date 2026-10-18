import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { MorphCollection } from '../data/loadEmpire';
import { DIFF_COLORS } from './diff';
import { FILL_OPACITY } from './territoryLayers';
import { variantFill } from './color';

/** Durée nominale du glissement (ms, à vitesse 1). */
export const MORPH_MS = 2400;
const TINT = 0.4;
const FRONT_BANDS = 2; // nombre de bandes récemment franchies qui portent la teinte du front
const LOAD_GUARD_MS = 1000;

const EMPTY: MorphCollection = { type: 'FeatureCollection', features: [] };

const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

interface Band {
  id: number;
  t: number;
}

const SRC = { source: 'morph' } as const;

/**
 * Frontière qui glisse. Peinture CONSTANTE (feature-state) : à chaque image, seules les bandes qui
 * franchissent leur seuil reçoivent un setFeatureState, sans nouveau layout dans le worker.
 * Deux couches fill : aplat (bandes allumées) et teinte du front (vert gagné / rouge perdu).
 */
export class MorphLayer {
  private raf = 0;
  private visible = false;
  private gen = 0;

  private gained: Band[] = []; // t croissant : allumée quand t ≤ p
  private lost: Band[] = []; // t décroissant : éteinte quand t ≥ 1 − p
  private stable: number[] = [];
  private gc = 0; // gained allumées
  private lc = 0; // lost éteintes
  private front: [number[], number[]] = [[], []];

  private overlay: HTMLElement | null = null;
  private frames: number[] = [];
  private lastOverlay = 0;
  private readonly debug = new URLSearchParams(window.location.search).get('debug') === '1';

  constructor(
    private map: MapLibreMap,
    beforeId?: string,
  ) {
    map.addSource('morph', { type: 'geojson', data: EMPTY });
    const kindColor = ['match', ['get', 'kind'], 'gained', DIFF_COLORS.gained, DIFF_COLORS.lost] as never;
    map.addLayer(
      {
        id: 'morph-fill',
        type: 'fill',
        source: 'morph',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': variantFill('#888888', 0),
          'fill-opacity': ['case', ['boolean', ['feature-state', 'on'], false], FILL_OPACITY, 0] as never,
          'fill-opacity-transition': { duration: 0 },
        },
      },
      beforeId,
    );
    map.addLayer(
      {
        id: 'morph-tint',
        type: 'fill',
        source: 'morph',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': kindColor,
          'fill-opacity': ['case', ['boolean', ['feature-state', 'front'], false], TINT, 0] as never,
          'fill-opacity-transition': { duration: 0 },
        },
      },
      beforeId,
    );
  }

  private setVisible(v: boolean) {
    if (this.visible === v) return;
    this.visible = v;
    const vis = v ? 'visible' : 'none';
    this.map.setLayoutProperty('morph-fill', 'visibility', vis);
    this.map.setLayoutProperty('morph-tint', 'visibility', vis);
  }

  private fs(id: number, state: Record<string, boolean>) {
    this.map.setFeatureState({ ...SRC, id }, state);
  }

  /** Charge la collection dans la source et attend qu'elle soit prête (sourcedata, 1 rAF, garde-fou). */
  prepare(fc: MorphCollection, color: string, from: 0 | 1): Promise<void> {
    this.cancel();
    this.setVisible(false);
    const gen = ++this.gen;
    const map = this.map;
    map.removeFeatureState(SRC);
    map.setPaintProperty('morph-fill', 'fill-color', variantFill(color, 0));
    // id numérique par feature (feature-state), sans toucher à la collection en cache.
    const features = fc.features.map((f, i) => ({ ...f, id: i }));
    this.gained = [];
    this.lost = [];
    this.stable = [];
    features.forEach((f, i) => {
      const { kind, t } = f.properties;
      if (kind === 'gained') this.gained.push({ id: i, t });
      else if (kind === 'lost') this.lost.push({ id: i, t });
      else this.stable.push(i);
    });
    this.gained.sort((a, b) => a.t - b.t);
    this.lost.sort((a, b) => b.t - a.t);
    this.front = [[], []];

    return new Promise<void>((resolve) => {
      let done = false;
      let guard = 0;
      const finish = () => {
        if (done) return;
        done = true;
        map.off('sourcedata', onData);
        window.clearTimeout(guard);
        requestAnimationFrame(() => {
          if (gen === this.gen) this.initStates(from);
          resolve();
        });
      };
      const onData = (e: { sourceId?: string }) => {
        if (e.sourceId === 'morph' && map.isSourceLoaded('morph')) finish();
      };
      map.on('sourcedata', onData);
      guard = window.setTimeout(finish, LOAD_GUARD_MS);
      (map.getSource('morph') as GeoJSONSource | undefined)?.setData({ ...fc, features } as never);
    });
  }

  /** États initiaux pour la progression p (0 ou 1) : stable allumée, gained/lost selon p. */
  private initStates(p: number) {
    for (const id of this.stable) this.fs(id, { on: true });
    this.gc = 0;
    while (this.gc < this.gained.length && this.gained[this.gc]!.t <= p) this.gc++;
    this.gained.forEach((b, i) => this.fs(b.id, { on: i < this.gc }));
    this.lc = 0;
    while (this.lc < this.lost.length && this.lost[this.lc]!.t >= 1 - p) this.lc++;
    this.lost.forEach((b, i) => this.fs(b.id, { on: i >= this.lc }));
  }

  private pushFront(kind: 0 | 1, id: number) {
    const q = this.front[kind];
    this.fs(id, { front: true });
    q.push(id);
    if (q.length > FRONT_BANDS) this.fs(q.shift()!, { front: false });
  }

  /** Met à jour uniquement les bandes qui franchissent leur seuil. */
  private sync(p: number) {
    const g = this.gained;
    while (this.gc < g.length && g[this.gc]!.t <= p) {
      const b = g[this.gc++]!;
      this.fs(b.id, { on: true });
      this.pushFront(0, b.id);
    }
    while (this.gc > 0 && g[this.gc - 1]!.t > p) {
      const b = g[--this.gc]!;
      this.fs(b.id, { on: false });
      this.pushFront(0, b.id);
    }
    const l = this.lost;
    while (this.lc < l.length && l[this.lc]!.t >= 1 - p) {
      const b = l[this.lc++]!;
      this.fs(b.id, { on: false });
      this.pushFront(1, b.id);
    }
    while (this.lc > 0 && l[this.lc - 1]!.t < 1 - p) {
      const b = l[--this.lc]!;
      this.fs(b.id, { on: true });
      this.pushFront(1, b.id);
    }
  }

  /**
   * Joue le morph préparé (from → to). onDone est appelé après avoir posé la progression finale ;
   * la couche reste visible jusqu'à hide() pour permettre une bascule sans trou.
   */
  play(from: 0 | 1, durationMs: number, onDone: () => void) {
    this.cancel();
    this.setVisible(true);
    const to = 1 - from;
    const total = this.gained.length + this.lost.length;
    // Court fondu par bande : ~2,5 × l'intervalle moyen entre deux bandes (sans effet si MapLibre n'interpole pas feature-state).
    const fade = { duration: Math.round((2.5 * durationMs) / Math.max(1, total)) };
    this.map.setPaintProperty('morph-fill', 'fill-opacity-transition', fade);
    this.map.setPaintProperty('morph-tint', 'fill-opacity-transition', fade);
    this.frames = [];
    this.showOverlay(0, total);
    const t0 = performance.now();
    const frame = (now: number) => {
      const k = Math.min(1, (now - t0) / durationMs);
      this.sync(from + (to - from) * easeInOutSine(k));
      if (this.overlay) this.tickOverlay(now, total);
      if (k < 1) this.raf = requestAnimationFrame(frame);
      else {
        this.raf = 0;
        onDone();
      }
    };
    this.raf = requestAnimationFrame(frame);
  }

  /** Overlay de debug (?debug=1) : DOM direct, aucun setState par image. */
  private showOverlay(lit: number, total: number) {
    if (!this.debug) return;
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'debug-overlay';
      document.body.appendChild(this.overlay);
    }
    this.overlay.textContent = `FPS – · bandes allumées ${lit}/${total}`;
  }

  private tickOverlay(now: number, total: number) {
    this.frames.push(now);
    while (this.frames.length > 0 && now - this.frames[0]! > 1000) this.frames.shift();
    if (now - this.lastOverlay < 200 || !this.overlay) return;
    this.lastOverlay = now;
    const fps = this.frames.length;
    this.overlay.textContent = `FPS ${fps} · bandes allumées ${this.gc + this.lc}/${total}`;
  }

  cancel() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  hide() {
    this.cancel();
    this.gen++;
    this.setVisible(false);
    this.overlay?.remove();
    this.overlay = null;
  }

  destroy() {
    this.cancel();
    this.overlay?.remove();
    this.overlay = null;
  }
}
