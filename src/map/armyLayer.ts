import { Marker, type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import type { ArmyMove, Faction, TimelineStep } from '../types';
import { FACTION_COLORS, soldierSvg } from './sprites';
import { standardSvg } from './standard';
import { CLASH_MS, haversineKm, marchMs, OUTCOME_MS } from '../lib/march';

const SRC = 'army-paths';
const LAYER = 'army-paths-line';
const TRAIL_SRC = 'army-trails';
const TRAIL_CASING = 'army-trails-casing';
const TRAIL_LAYER = 'army-trails-line';
/** Durées (ms à vitesse 1) : marche selon la distance (src/lib/march.ts), mêlée, puis issue. */
const WALK_MS = 4000;
const RETREAT_MS = OUTCOME_MS;
/** Soldats par régiment selon `strength` (1, 2, 3), et plafond pour l'ensemble de l'étape. */
const REGIMENT = { 1: 12, 2: 20, 3: 30 } as const;
const MAX_SOLDIERS = 96;
const RETREAT = 0.15;
/** Part des soldats qui tombent pendant la mêlée. */
const FALL_LOSER = 0.45;
const FALL_WINNER = 0.15;
/** Écart (px) entre colonnes et entre rangs de la formation. */
const COL_PX = 12;
const ROW_PX = 7;
const SPARKS = 16;

const PEOPLE: Record<Faction, string> = {
  romains: 'Romains',
  latins: 'Latins',
  samnites: 'Samnites',
  carthaginois: 'Carthaginois',
  gaulois: 'Gaulois',
  'grecs-macedoniens': 'Macédoniens',
  germains: 'Germains',
  'parthes-perses': 'Parthes / Perses',
  egyptiens: 'Égyptiens',
  daces: 'Daces',
  'goths-vandales': 'Goths / Vandales',
  arabes: 'Arabes',
  'turcs-seldjoukides': 'Seldjoukides',
  'croises-latins': 'Croisés',
  ottomans: 'Ottomans',
  byzantins: 'Byzantins',
  francais: 'Français',
  britanniques: 'Britanniques',
  autrichiens: 'Autrichiens',
  prussiens: 'Prussiens',
  russes: 'Russes',
  espagnols: 'Espagnols',
  portugais: 'Portugais',
  polonais: 'Polonais',
  chinois: 'Chinois',
  xiongnu: 'Xiongnu',
  mongols: 'Mongols',
  jurchens: 'Jurchens',
  mandchous: 'Mandchous',
  japonais: 'Japonais',
  coreens: 'Coréens',
  tibetains: 'Tibétains',
  vietnamiens: 'Vietnamiens',
  'turcs-gokturks': 'Göktürks',
  khitans: 'Khitans',
  ouighours: 'Ouïghours',
  tangoutes: 'Tangoutes',
  khwarezmiens: 'Khwarezmiens',
  rus: 'Rus’',
  'chevaliers-europeens': 'Chevaliers',
  mamelouks: 'Mamelouks',
  tercios: 'Espagnols',
  azteques: 'Aztèques',
  incas: 'Incas',
  'francais-ancien-regime': 'Français',
  neerlandais: 'Néerlandais',
  'anglais-elisabethains': 'Anglais',
  'espagnols-xxe': 'Espagnols',
  rifains: 'Rifains',
  americains: 'Américains',
  independantistes: 'Indépendantistes',
};
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Étiquette d'armée : camp en gras, peuple en petit (une seule fois s'ils sont identiques). */
function labelHtml(a: ArmyMove, origin?: string | null): string {
  const people = PEOPLE[a.faction];
  const sub = plain(a.side) === plain(people) ? '' : `<small>${esc(people)}</small>`;
  const from = origin ? `<small class="army-label__from">· depuis ${esc(origin)}</small>` : '';
  return `<strong>${esc(a.side)}</strong>${sub}${from}<span class="army-label__win" aria-hidden="true">🏆</span>`;
}

const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

function geom(a: ArmyMove) {
  const cum = [0];
  for (let i = 1; i < a.path.length; i++) cum.push(cum[i - 1]! + haversineKm(a.path[i - 1]!, a.path[i]!));
  const last = a.path[a.path.length - 1]!;
  const prev = a.path[a.path.length - 2]!;
  const lastDir = last[0] >= prev[0] ? 1 : -1;
  const retreat: [number, number] = [last[0] + (prev[0] - last[0]) * RETREAT, last[1] + (prev[1] - last[1]) * RETREAT];
  return { cum, total: cum[cum.length - 1]!, lastDir, retreat };
}

/** Une armée de `step` qui reprend la route d'une armée non vaincue de `prev` (même id) ? */
export function chainedArmies(step: TimelineStep | undefined, prev: TimelineStep | null | undefined): ArmyMove[] {
  if (!step || !prev) return [];
  const before = (prev.armies ?? []).filter((a) => a.path.length >= 2);
  const hadWinner = before.some((a) => a.winner === true);
  const ok = new Set(before.filter((a) => a.id && !(hadWinner && a.winner !== true)).map((a) => a.id));
  return (step.armies ?? []).filter((a) => a.path.length >= 2 && a.id && ok.has(a.id));
}

/**
 * Armées de steps[index] qui poursuivent une campagne : leur id apparaît dans une étape ANTÉRIEURE
 * (pas forcément la précédente : Austerlitz → Confédération du Rhin → Iéna). Leur path[0] est le champ
 * de bataille précédent ; on joue donc toute la marche (pas de raccourci) avec une durée longue.
 */
export function continuedArmies(steps: TimelineStep[], index: number): ArmyMove[] {
  const step = steps[index];
  if (!step) return [];
  const seen = new Set<string>();
  for (let j = 0; j < index; j++) for (const a of steps[j]?.armies ?? []) if (a.id) seen.add(a.id);
  return (step.armies ?? []).filter((a) => a.path.length >= 2 && a.id && seen.has(a.id));
}

/** Pseudo-aléatoire stable (graine entière) : la même armée garde la même formation. */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function hashOf(v: string): number {
  let h = 0;
  for (let i = 0; i < v.length; i++) h = (h * 31 + v.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Sprites en data-URL, mis en cache : des centaines de soldats sans re-parser de SVG. */
const spriteCache = new Map<string, string>();
function sprite(key: string, svg: () => string): string {
  let url = spriteCache.get(key);
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg())}`;
    spriteCache.set(key, url);
  }
  return url;
}

/** Échelle des régiments selon le zoom : une masse lisible de loin, détaillée de près. */
function zoomScale(zoom: number): number {
  return Math.min(1.5, Math.max(0.8, 0.85 + (zoom - 3) * 0.2));
}

interface ArmyRun {
  id?: string;
  path: [number, number][];
  cum: number[]; // distances cumulées (km)
  total: number;
  startDist: number;
  loser: boolean;
  /** Position du retrait (fin du dernier segment reculée de RETREAT). */
  retreat: [number, number];
  marker: Marker;
  el: HTMLDivElement;
  regiment: HTMLDivElement;
  /** Demi-largeur du bloc (px, avant échelle) : sert à écarter les deux camps au contact. */
  halfW: number;
  segIdx: number; // segment courant (pour le flip)
  flipped: boolean;
  /** Sens du dernier segment : +1 vers l'est, −1 vers l'ouest. */
  lastDir: number;
  settled: boolean;
  winner: boolean;
  label: HTMLElement | null;
  /** Tracé parcouru (flèche de campagne), mis à jour pendant la marche. */
  trail: [number, number][];
  /** Côté du régiment par rapport au point de contact : −1 à gauche (ouest), +1 à droite. */
  side: number;
}

/**
 * Armées en régiments : un marqueur HTML par armée, contenant une formation de 12 à 30 soldats
 * (images en cache, deux images de marche alternées par CSS) et un porte-étendard.
 * Chronologie (à vitesse 1) : marche 4 s (5,5 s en campagne), mêlée 2,5 s, issue 1,5 s.
 * Une seule boucle rAF : setLngLat des régiments et tracé progressif de la flèche de campagne.
 */
export class ArmyLayer {
  private runs: ArmyRun[] = [];
  private clash: Marker | null = null;
  private clashEl: HTMLDivElement | null = null;
  private clashOn = false;
  private raf = 0;
  private t0 = 0;
  private walkMs = WALK_MS;
  private sp = 1;
  private total = WALK_MS + CLASH_MS + RETREAT_MS;
  private tmp: [number, number] = [0, 0];
  private hasPaths = false;
  private lastTrail = 0;
  /** Fanions « Départ : … » posés au premier point de chaque marche. */
  private origins: Marker[] = [];
  private onZoom = () => {
    const k = String(zoomScale(this.map.getZoom()));
    for (const r of this.runs) r.el.style.setProperty('--army-scale', k);
  };

  constructor(private map: MapLibreMap) {
    map.on('zoom', this.onZoom);
  }

  /** Retire les marqueurs des runs non conservés, le choc et la boucle d'animation. */
  private release(keep: Set<ArmyRun>) {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    for (const r of this.runs) if (!keep.has(r)) r.marker.remove();
    this.runs = [];
    this.clash?.remove();
    this.clash = null;
    this.clashEl = null;
    this.clashOn = false;
    for (const o of this.origins) o.remove();
    this.origins = [];
  }

  private removePaths() {
    if (this.hasPaths && this.map.getStyle()) {
      for (const l of [TRAIL_LAYER, TRAIL_CASING, LAYER]) if (this.map.getLayer(l)) this.map.removeLayer(l);
      for (const s of [TRAIL_SRC, SRC]) if (this.map.getSource(s)) this.map.removeSource(s);
    }
    this.hasPaths = false;
  }

  clear() {
    this.release(new Set());
    this.removePaths();
  }

  destroy() {
    this.clear();
    this.map.off('zoom', this.onZoom);
  }

  /**
   * prevStep : étape n−1 en avance séquentielle (sinon null). Les armées non vaincues qui y figuraient
   * (même id) gardent leur régiment et repartent de leur position.
   */
  start(
    step: TimelineStep,
    prevStep: TimelineStep | null,
    speed: number,
    reduced: boolean,
    continued: ArmyMove[] = [],
    /** Nom du lieu de départ de chaque armée (src/lib/origin.ts), ou null. */
    originOf: (a: ArmyMove) => string | null = () => null,
  ) {
    const armies = (step.armies ?? []).filter((a) => a.path.length >= 2);
    const reuse = new Map<ArmyMove, ArmyRun>();
    if (prevStep && !reduced) {
      const ok = new Set(chainedArmies(step, prevStep));
      for (const a of armies) {
        if (!ok.has(a)) continue;
        const r = this.runs.find((x) => x.id === a.id && !x.loser && !new Set(reuse.values()).has(x));
        if (r) reuse.set(a, r);
      }
    }
    this.release(new Set(reuse.values()));
    if (armies.length === 0) {
      this.removePaths();
      return;
    }
    this.sp = Math.max(0.25, speed);
    const cont = new Set(continued);
    // Marche entière, d'autant plus longue que la route est longue (campagnes à travers la carte).
    this.walkMs = marchMs(armies);
    this.total = (this.walkMs + CLASH_MS + RETREAT_MS) / this.sp;
    const mobile = window.innerWidth < 768;
    const hasWinner = armies.some((a) => a.winner === true);

    // Effectifs : 12 / 20 / 30 soldats selon la force, réduits proportionnellement au-delà du plafond.
    const counts = armies.map((a) => {
      const n = REGIMENT[(a.strength ?? 2) as 1 | 2 | 3] ?? REGIMENT[2];
      return mobile ? Math.ceil(n / 2) : n;
    });
    const sum = counts.reduce((x, y) => x + y, 0);
    const cap = mobile ? MAX_SOLDIERS / 2 : MAX_SOLDIERS;
    if (sum > cap) for (let i = 0; i < counts.length; i++) counts[i] = Math.max(6, Math.floor((counts[i]! * cap) / sum));

    this.addPaths(armies);
    armies.forEach((a, i) => {
      const loser = hasWinner && a.winner !== true;
      const old = reuse.get(a);
      const origin = originOf(a);
      const run = old ? this.rebuild(old, a, loser, origin) : this.build(a, counts[i] ?? REGIMENT[2], loser, cont.has(a), i, origin);
      this.runs.push(run);
      if (origin) this.addOrigin(a, origin);
    });
    // Les camps se font face : si deux armées arrivent dans le même sens, la seconde se range en face.
    const firstSide = this.runs[0] ? -this.runs[0].lastDir : -1;
    this.runs.forEach((r, i) => {
      r.side = i === 0 ? firstSide : -r.lastDir === firstSide && this.runs.length === 2 ? -firstSide : -r.lastDir;
      if (r.label) r.label.className = `army-label army-label--${r.side < 0 ? 'left' : 'right'}`;
      this.setFront(r, false);
    });
    // Étiquettes empilées quand plusieurs armées sont du même côté.
    const perSide = new Map<number, number>();
    for (const r of this.runs) {
      const k = perSide.get(r.side) ?? 0;
      perSide.set(r.side, k + 1);
      r.label?.style.setProperty('--stack', String(k));
    }
    this.onZoom();

    const end = armies[0]!.path[armies[0]!.path.length - 1]!;
    if (armies.length >= 2) {
      const el = document.createElement('div');
      el.className = 'clash-marker';
      el.setAttribute('aria-hidden', 'true');
      const title = armies.map((a) => esc(a.side)).join(' ⚔ ');
      let sparks = '';
      for (let k = 0; k < SPARKS; k++) {
        const x = (rand(k * 7 + 1) - 0.5) * 130;
        const y = (rand(k * 13 + 5) - 0.5) * 56;
        sparks += `<span class="clash-spark" style="--x:${x.toFixed(0)}px;--y:${y.toFixed(0)}px;--d:${(rand(k * 3 + 2) * 0.9).toFixed(2)}s"></span>`;
      }
      el.innerHTML =
        `<span class="clash-marker__title">${title}</span><span class="clash-marker__cloud"></span>` +
        `<span class="clash-marker__dust"></span>${sparks}<span class="clash-marker__icon">⚔</span>`;
      this.clashEl = el;
      this.clash = new Marker({ element: el }).setLngLat(end).addTo(this.map);
    }

    if (reduced) {
      for (const r of this.runs) this.place(r, 1, 1, true);
      this.updateTrails(1, true);
      this.setClash(true);
      this.markFinal();
      return;
    }
    for (const r of this.runs) this.place(r, 0, 0, false);
    this.updateTrails(0, true);
    this.t0 = 0;
    this.raf = requestAnimationFrame(this.tick);
  }

  private addPaths(armies: ArmyMove[]) {
    const map = this.map;
    const data = {
      type: 'FeatureCollection' as const,
      features: armies.map((a) => ({
        type: 'Feature' as const,
        properties: { color: FACTION_COLORS[a.faction] },
        geometry: { type: 'LineString' as const, coordinates: a.path },
      })),
    };
    const existing = map.getSource(SRC) as GeoJSONSource | undefined;
    if (this.hasPaths && existing) {
      existing.setData(data);
      return;
    }
    const before = map.getLayer('city-dot') ? 'city-dot' : undefined;
    map.addSource(SRC, { type: 'geojson', data });
    // Itinéraire prévu : pointillé discret ; la flèche pleine se dessine par-dessus au fil de la marche.
    map.addLayer(
      {
        id: LAYER,
        type: 'line',
        source: SRC,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 0.4, 'line-dasharray': [0.5, 2] },
      },
      before,
    );
    map.addSource(TRAIL_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer(
      {
        id: TRAIL_CASING,
        type: 'line',
        source: TRAIL_SRC,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#2b2219', 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 5, 7, 9], 'line-opacity': 0.35 },
      },
      before,
    );
    map.addLayer(
      {
        id: TRAIL_LAYER,
        type: 'line',
        source: TRAIL_SRC,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 3, 7, 6], 'line-opacity': 0.85 },
      },
      before,
    );
    this.hasPaths = true;
  }

  /** Flèches de campagne : chemin parcouru jusqu'à la position courante (≈ 30 mises à jour / s). */
  private updateTrails(now: number, force = false) {
    if (!force && now - this.lastTrail < 33) return;
    this.lastTrail = now;
    const src = this.map.getSource(TRAIL_SRC) as GeoJSONSource | undefined;
    if (!src) return;
    src.setData({
      type: 'FeatureCollection',
      features: this.runs
        .filter((r) => r.trail.length >= 2)
        .map((r) => ({
          type: 'Feature' as const,
          properties: { color: r.el.style.getPropertyValue('--c') },
          geometry: { type: 'LineString' as const, coordinates: r.trail },
        })),
    });
  }

  /** Formation : rangs décalés, léger désordre, chutes et dispersion préparées (variables CSS). */
  private regimentHtml(a: ArmyMove, n: number, loser: boolean, seed: number): { html: string; halfW: number; h: number } {
    const rows = n <= 12 ? 3 : n <= 20 ? 4 : 5;
    const cols = Math.ceil(n / rows);
    const fall = loser ? FALL_LOSER : FALL_WINNER;
    const walk0 = sprite(`${a.faction}|0`, () => soldierSvg(a.faction, 0));
    const walk1 = sprite(`${a.faction}|1`, () => soldierSvg(a.faction, 1));
    const down = sprite(`${a.faction}|v`, () => soldierSvg(a.faction, 0, 'vaincu'));
    const w = (cols - 1) * COL_PX + 26;
    const h = (rows - 1) * ROW_PX + 28;
    let html = '';
    for (let i = 0; i < n; i++) {
      const row = i % rows; // 0 = rang arrière (haut de l'écran)
      const col = Math.floor(i / rows);
      const r1 = rand(seed + i * 3);
      const r2 = rand(seed + i * 3 + 1);
      const r3 = rand(seed + i * 3 + 2);
      const x = col * COL_PX + (row % 2 ? COL_PX / 2 : 0) + (r1 - 0.5) * 4;
      const y = row * ROW_PX + (r2 - 0.5) * 3;
      const falls = r3 < fall;
      // Déroute : vers l'arrière (gauche avant miroir), éparpillée ; certains disparaissent.
      const sx = -(20 + r1 * 46);
      const sy = (r2 - 0.5) * 40;
      html +=
        `<div class="army-soldier${falls ? ' army-soldier--falls' : ''}${row < rows - 2 ? ' army-soldier--back' : ''}${r2 > 0.6 ? ' army-soldier--flee' : ''}" ` +
        `style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;z-index:${row + 1};--d:${(-r1 * 0.5).toFixed(2)}s;` +
        `--fall:${(0.2 + r3 * 2).toFixed(2)}s;--sx:${sx.toFixed(0)}px;--sy:${sy.toFixed(0)}px;--s:${(0.92 + r2 * 0.14).toFixed(2)}">` +
        `<img class="army-frame army-frame--0" src="${walk0}" alt="" draggable="false">` +
        `<img class="army-frame army-frame--1" src="${walk1}" alt="" draggable="false">` +
        `<img class="army-frame army-frame--down" src="${down}" alt="" draggable="false"></div>`;
    }
    // Porte-étendard en tête de colonne (côté droit avant miroir), au rang du milieu.
    const flag = sprite(`std|${a.faction}`, () => standardSvg(FACTION_COLORS[a.faction]));
    html += `<img class="army-standard" src="${flag}" alt="" draggable="false" style="left:${(w - 18).toFixed(0)}px;top:${(h / 2 - 34).toFixed(0)}px">`;
    return { html, halfW: w / 2, h };
  }

  /** Fanion de départ à la couleur du camp, au premier point de la marche. */
  private addOrigin(a: ArmyMove, origin: string) {
    const el = document.createElement('div');
    el.className = 'army-origin';
    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--c', FACTION_COLORS[a.faction]);
    el.innerHTML = `<span class="army-origin__flag"></span><span class="army-origin__label">Départ : ${esc(origin)}</span>`;
    this.origins.push(new Marker({ element: el, anchor: 'bottom-left', offset: [-2, 0] }).setLngLat(a.path[0]!).addTo(this.map));
  }

  private build(a: ArmyMove, n: number, loser: boolean, fullMarch: boolean, index: number, origin: string | null = null): ArmyRun {
    const { cum, total, lastDir, retreat } = geom(a);
    const seed = hashOf(`${a.id ?? a.side}|${a.faction}|${index}`) % 10_000;
    const { html, halfW, h } = this.regimentHtml(a, n, loser, seed);
    const el = document.createElement('div');
    el.className = 'army-marker';
    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--c', FACTION_COLORS[a.faction]);
    el.style.setProperty('--hw', `${halfW}px`);
    el.style.setProperty('--rh', `${h}px`);
    el.innerHTML =
      `<span class="army-label army-label--${lastDir > 0 ? 'left' : 'right'}" style="--c:${FACTION_COLORS[a.faction]}">${labelHtml(a, origin)}</span>` +
      `<div class="army-regiment"><span class="army-dust"></span><div class="army-marker__flip">${html}</div></div>`;
    const regiment = el.querySelector('.army-regiment') as HTMLDivElement;
    const label = el.querySelector<HTMLElement>('.army-label');
    const marker = new Marker({ element: el, anchor: 'bottom' }).setLngLat(a.path[0]!).addTo(this.map);
    // Toujours toute la marche : depuis la base de départ ou le champ de bataille précédent.
    const startDist = 0;
    const run: ArmyRun = {
      id: a.id,
      path: a.path,
      cum,
      total,
      startDist,
      loser,
      retreat,
      marker,
      el,
      regiment,
      halfW,
      segIdx: -1,
      flipped: false,
      lastDir,
      settled: false,
      winner: a.winner === true,
      label,
      trail: [],
      side: -lastDir,
    };
    this.setFront(run, false);
    return run;
  }

  /** Réutilise le régiment d'une armée de l'étape précédente : état « marche » depuis sa position. */
  private rebuild(r: ArmyRun, a: ArmyMove, loser: boolean, origin: string | null = null): ArmyRun {
    const { cum, total, lastDir, retreat } = geom(a);
    Object.assign(r, {
      id: a.id,
      path: a.path,
      cum,
      total,
      startDist: 0,
      loser,
      retreat,
      segIdx: -1,
      flipped: false,
      lastDir,
      settled: false,
      winner: a.winner === true,
      trail: [],
      side: -lastDir,
    });
    // Ne retirer que les états d'animation : les classes maplibregl-marker positionnent le marqueur.
    // Copie voulue : on retire des classes pendant le parcours (classList est une liste vivante).
    // oxlint-disable-next-line unicorn/no-useless-spread
    for (const c of [...r.el.classList]) if (c.startsWith('army-marker--')) r.el.classList.remove(c);
    r.el.style.setProperty('--c', FACTION_COLORS[a.faction]);
    if (r.label) {
      r.label.className = `army-label army-label--${lastDir > 0 ? 'left' : 'right'}`;
      r.label.style.setProperty('--c', FACTION_COLORS[a.faction]);
      r.label.innerHTML = labelHtml(a, origin);
    }
    this.setFront(r, false);
    return r;
  }

  /** Recul du bloc derrière le point de contact ; en mêlée, les deux camps s'interpénètrent. */
  private setFront(r: ArmyRun, contact: boolean) {
    const off = contact ? r.halfW - 14 : r.halfW + 6;
    r.regiment.style.setProperty('--off', `${(r.side * off).toFixed(0)}px`);
    // Au contact, le régiment fait face à l'ennemi (les figurines regardent vers la droite).
    if (contact) {
      r.flipped = r.side > 0;
      r.el.classList.toggle('army-marker--west', r.flipped);
    }
  }

  /** Point à la distance d le long du chemin, écrit dans out (aucune allocation). */
  private pointAt(r: ArmyRun, d: number, out: [number, number]) {
    const { cum, path } = r;
    let i = Math.max(0, r.segIdx);
    if (d < (cum[i] ?? 0)) i = 0;
    while (i < path.length - 2 && d > cum[i + 1]!) i++;
    const seg = cum[i + 1]! - cum[i]!;
    const f = seg > 0 ? clamp01((d - cum[i]!) / seg) : 1;
    const a = path[i]!;
    const b = path[i + 1]!;
    out[0] = a[0] + (b[0] - a[0]) * f;
    out[1] = a[1] + (b[1] - a[1]) * f;
    if (i !== r.segIdx) {
      r.segIdx = i;
      const flip = b[0] < a[0];
      if (flip !== r.flipped) {
        r.flipped = flip;
        r.el.classList.toggle('army-marker--west', flip);
      }
    }
  }

  /** Positionne le régiment. walk ∈ [0,1] : progression de la marche ; retreat ∈ [0,1] : recul du vaincu. */
  private place(r: ArmyRun, walk: number, retreat: number, final: boolean) {
    const out = this.tmp;
    const d0 = r.startDist + (r.total - r.startDist) * walk;
    this.pointAt(r, d0, out);
    // Flèche : sommets déjà franchis + position courante.
    const trail = r.path.slice(0, r.segIdx + 1) as [number, number][];
    const startAt = r.startDist > 0 ? this.trailStart(r) : null;
    r.trail = startAt ? [startAt, ...trail.slice(this.segOf(r, r.startDist) + 1)] : trail;
    r.trail.push([out[0], out[1]]);
    if (r.loser && retreat > 0) {
      out[0] += (r.retreat[0] - out[0]) * retreat;
      out[1] += (r.retreat[1] - out[1]) * retreat;
    }
    r.marker.setLngLat(out);
    if (final && r.loser) this.settle(r, true);
  }

  private segOf(r: ArmyRun, d: number): number {
    let i = 0;
    while (i < r.path.length - 2 && d > r.cum[i + 1]!) i++;
    return i;
  }

  /** Début de la flèche quand la marche commence en cours de route (longue campagne raccourcie). */
  private trailStart(r: ArmyRun): [number, number] {
    const i = this.segOf(r, r.startDist);
    const seg = r.cum[i + 1]! - r.cum[i]!;
    const f = seg > 0 ? clamp01((r.startDist - r.cum[i]!) / seg) : 0;
    const a = r.path[i]!;
    const b = r.path[i + 1]!;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }

  private settle(r: ArmyRun, defeated: boolean) {
    if (r.settled) return;
    r.settled = true;
    r.el.classList.add('army-marker--still');
    if (defeated) r.el.classList.add('army-marker--defeated');
  }

  private setClash(on: boolean) {
    if (on === this.clashOn || !this.clashEl) return;
    this.clashOn = on;
    this.clashEl.classList.toggle('clash-marker--on', on);
  }

  private markFinal() {
    const anyWinner = this.runs.some((r) => r.winner);
    for (const r of this.runs) {
      if (anyWinner && r.winner) {
        r.label?.classList.add('army-label--winner');
        r.el.classList.add('army-marker--victory');
      }
      this.settle(r, r.loser);
      r.el.classList.add('army-marker--final');
    }
    this.clashEl?.classList.add('clash-marker--done');
  }

  private setPhase(cls: 'army-marker--walking' | 'army-marker--clash', on: boolean) {
    for (const r of this.runs) r.el.classList.toggle(cls, on);
  }

  private phase = 0;

  private tick = (now: number) => {
    if (this.t0 === 0) {
      this.t0 = now;
      this.setPhase('army-marker--walking', true);
      this.phase = 1;
    }
    const k = 1 / this.sp;
    const el = now - this.t0;
    const tw = this.walkMs * k; // fin de la marche
    const tc = tw + CLASH_MS * k; // fin de la mêlée, début de l'issue
    const walk = easeInOut(clamp01(el / tw));
    const back = easeInOut(clamp01((el - tc) / (RETREAT_MS * k)));
    if (el < tw) {
      for (const r of this.runs) this.place(r, walk, 0, false);
      this.updateTrails(now);
    } else {
      if (this.phase < 2) {
        this.phase = 2;
        for (const r of this.runs) {
          this.place(r, 1, 0, false);
          if (this.clashEl) this.setFront(r, true);
        }
        this.updateTrails(now, true);
        this.setPhase('army-marker--walking', false);
        if (this.clashEl) {
          this.setPhase('army-marker--clash', true);
          this.setClash(true);
        }
      }
      const hasWinnerRun = this.runs.some((r) => r.winner);
      if (el >= tc && this.phase < 3) {
        this.phase = 3;
        this.setPhase('army-marker--clash', false);
        this.clashEl?.classList.add('clash-marker--done');
        for (const r of this.runs) {
          this.setFront(r, false);
          if (r.loser) r.el.classList.add('army-marker--defeated', 'army-marker--rout');
          else if (hasWinnerRun) {
            r.label?.classList.add('army-label--winner');
            r.el.classList.add('army-marker--victory');
          }
        }
      }
      if (el >= tc && el < this.total) for (const r of this.runs) if (r.loser) this.place(r, 1, back, false);
    }
    if (el >= this.total) {
      for (const r of this.runs) this.place(r, 1, r.loser ? 1 : 0, true);
      this.markFinal();
      this.raf = 0; // tout est immobile : la boucle s'arrête
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  };
}
