import { Marker, type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import type { ArmyMove, Faction, TimelineStep } from '../types';
import { FACTION_COLORS, soldierSvg } from './sprites';

const SRC = 'army-paths';
const LAYER = 'army-paths-line';
/** Durées (ms à vitesse 1) : marche, puis choc 1 s, puis recul du vaincu 1 s. */
const WALK_MS = 2000;
export const CHAIN_WALK_MS = 3500;
const CLASH_MS = 1000;
const RETREAT_MS = 1000;
const MAX_MARKERS = 16;
const FAR_KM = 1500;
const RETREAT = 0.15;

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
};
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Étiquette d'armée : camp en gras, peuple en petit (une seule fois s'ils sont identiques). */
function labelHtml(a: ArmyMove): string {
  const people = PEOPLE[a.faction];
  const sub = plain(a.side) === plain(people) ? '' : `<small>${esc(people)}</small>`;
  return `<strong>${esc(a.side)}</strong>${sub}<span class="army-label__win" aria-hidden="true">🏆</span>`;
}

const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

function haversineKm(a: [number, number], b: [number, number]): number {
  const r = Math.PI / 180;
  const dLat = (b[1] - a[1]) * r;
  const dLon = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Décalage (px) de la i-ème figurine dans la formation : latéral + profondeur, stable. */
function formation(i: number, n: number): [number, number] {
  return [(i - (n - 1) / 2) * 13, i % 2 === 0 ? 5 : -6];
}

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

interface Soldier {
  marker: Marker;
  form: HTMLDivElement;
  lngLat: [number, number];
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
  soldiers: Soldier[];
  segIdx: number; // segment courant (pour le flip)
  flipped: boolean;
  /** Sens du dernier segment : +1 vers l'est, −1 vers l'ouest. */
  lastDir: number;
  els: HTMLDivElement[];
  settled: boolean;
  winner: boolean;
  label: HTMLElement | null;
}

/**
 * Armées en marche : marqueurs HTML (deux SVG alternés par CSS), une seule boucle rAF qui ne fait que
 * setLngLat. Chronologie (6 s / vitesse) : marche 0-2 s, choc 2-3 s, recul du vaincu 3-4 s.
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

  constructor(private map: MapLibreMap) {}

  /** Retire les marqueurs des runs non conservés, le choc et la boucle d'animation. */
  private release(keep: Set<ArmyRun>) {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    for (const r of this.runs) if (!keep.has(r)) for (const s of r.soldiers) s.marker.remove();
    this.runs = [];
    this.clash?.remove();
    this.clash = null;
    this.clashEl = null;
    this.clashOn = false;
  }

  private removePaths() {
    if (this.hasPaths && this.map.getStyle()) {
      if (this.map.getLayer(LAYER)) this.map.removeLayer(LAYER);
      if (this.map.getSource(SRC)) this.map.removeSource(SRC);
    }
    this.hasPaths = false;
  }

  clear() {
    this.release(new Set());
    this.removePaths();
  }

  destroy() {
    this.clear();
  }

  /**
   * prevStep : étape n−1 en avance séquentielle (sinon null). Les armées non vaincues qui y figuraient
   * (même id) gardent leurs marqueurs et repartent de leur position.
   */
  start(step: TimelineStep, prevStep: TimelineStep | null, speed: number, reduced: boolean, continued: ArmyMove[] = []) {
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
    this.walkMs = reuse.size > 0 || cont.size > 0 ? CHAIN_WALK_MS : WALK_MS;
    this.total = (this.walkMs + CLASH_MS + RETREAT_MS) / this.sp;
    const mobile = window.innerWidth < 768;
    const hasWinner = armies.some((a) => a.winner === true);

    // Budget de marqueurs : on réduit les effectifs jusqu'à tenir dans MAX_MARKERS (clash inclus).
    const counts = armies.map((a) => {
      const s = a.strength ?? 2;
      const n = s === 1 ? 3 : s === 3 ? 7 : 5;
      return mobile ? Math.min(n, 3) : n;
    });
    const sum = () => counts.reduce((x, y) => x + y, 0);
    while (sum() > MAX_MARKERS - 1) {
      const k = counts.indexOf(Math.max(...counts));
      if ((counts[k] ?? 0) <= 1) break;
      counts[k] = (counts[k] ?? 1) - 2 >= 1 ? (counts[k] ?? 1) - 2 : 1;
    }

    this.addPaths(armies);
    armies.forEach((a, i) => {
      const loser = hasWinner && a.winner !== true;
      const old = reuse.get(a);
      this.runs.push(old ? this.rebuild(old, a, loser) : this.build(a, counts[i] ?? 3, loser, cont.has(a)));
    });

    const end = armies[0]!.path[armies[0]!.path.length - 1]!;
    if (armies.length >= 2) {
      const el = document.createElement('div');
      el.className = 'clash-marker';
      el.setAttribute('aria-hidden', 'true');
      const title = armies.map((a) => esc(a.side)).join(' ⚔ ');
      el.innerHTML = `<span class="clash-marker__title">${title}</span><span class="clash-marker__dust"></span><span class="clash-marker__icon">⚔</span>`;
      this.clashEl = el;
      this.clash = new Marker({ element: el }).setLngLat(end).addTo(this.map);
    }

    if (reduced) {
      for (const r of this.runs) this.place(r, 1, 1, 1, true);
      this.setClash(true);
      this.markFinal();
      return;
    }
    for (const r of this.runs) this.place(r, 0, 0, 0, false);
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
    map.addSource(SRC, { type: 'geojson', data });
    map.addLayer(
      {
        id: LAYER,
        type: 'line',
        source: SRC,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 2.5, 'line-opacity': 0.55, 'line-dasharray': [0.5, 2] },
      },
      map.getLayer('city-dot') ? 'city-dot' : undefined,
    );
    this.hasPaths = true;
  }

  private build(a: ArmyMove, n: number, loser: boolean, fullMarch = false): ArmyRun {
    const { cum, total, lastDir, retreat } = geom(a);
    const soldiers: Soldier[] = [];
    const els: HTMLDivElement[] = [];
    for (let i = 0; i < n; i++) {
      const [dx, dy] = formation(i, n);
      const el = document.createElement('div');
      el.className = 'army-marker';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML =
        (i === 0
          ? `<span class="army-label army-label--${lastDir > 0 ? 'left' : 'right'}" style="--c:${FACTION_COLORS[a.faction]}">${labelHtml(a)}</span>`
          : '') +
        '<div class="army-marker__form"><div class="army-marker__shake"><div class="army-marker__flip">' +
        `<span class="army-frame army-frame--0">${soldierSvg(a.faction, 0)}</span>` +
        `<span class="army-frame army-frame--1">${soldierSvg(a.faction, 1)}</span>` +
        `<span class="army-frame army-frame--down">${soldierSvg(a.faction, 0, 'vaincu')}</span>` +
        '</div></div></div>';
      const form = el.querySelector('.army-marker__form') as HTMLDivElement;
      // Léger écart vers l'arrière du front pour que les deux camps ne se recouvrent pas au contact.
      form.style.transform = `translate(${dx - lastDir * 16}px, ${dy}px)`;
      form.style.setProperty('--delay', `${-(i * 0.13).toFixed(2)}s`);
      el.style.setProperty('--delay', `${-(i * 0.13).toFixed(2)}s`);
      els.push(el);
      const marker = new Marker({ element: el, anchor: 'bottom' }).setLngLat(a.path[0]!).addTo(this.map);
      soldiers.push({ marker, form, lngLat: [0, 0] });
    }
    const label = els[0]?.querySelector<HTMLElement>('.army-label') ?? null;
    // Campagne poursuivie : toute la marche depuis le champ de bataille précédent.
    const startDist = !fullMarch && total > FAR_KM ? total * (2 / 3) : 0;
    return { id: a.id, path: a.path, cum, total, startDist, loser, retreat, soldiers, segIdx: -1, flipped: false, lastDir, els, settled: false, winner: a.winner === true, label };
  }

  /** Réutilise les marqueurs d'une armée de l'étape précédente : état « marche » depuis leur position. */
  private rebuild(r: ArmyRun, a: ArmyMove, loser: boolean): ArmyRun {
    const { cum, total, lastDir, retreat } = geom(a);
    Object.assign(r, { id: a.id, path: a.path, cum, total, startDist: 0, loser, retreat, segIdx: -1, flipped: false, lastDir, settled: false, winner: a.winner === true });
    r.soldiers.forEach((s, i) => {
      const [dx, dy] = formation(i, r.soldiers.length);
      s.form.style.transform = `translate(${dx - lastDir * 16}px, ${dy}px)`;
    });
    for (const el of r.els) {
      el.classList.remove('army-marker--still', 'army-marker--defeated', 'army-marker--final', 'army-marker--clash', 'army-marker--walking', 'army-marker--west');
    }
    if (r.label) {
      r.label.className = `army-label army-label--${lastDir > 0 ? 'left' : 'right'}`;
      r.label.style.setProperty('--c', FACTION_COLORS[a.faction]);
      r.label.innerHTML = labelHtml(a);
    }
    return r;
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
        for (const el of r.els) el.classList.toggle('army-marker--west', flip);
      }
    }
  }

  /**
   * Positionne l'armée. walk ∈ [0,1] : progression de la marche ; retreat ∈ [0,1] : recul du vaincu ;
   * fade ∈ [0,1] : indique l'état vaincu (applique les classes une fois).
   */
  private place(r: ArmyRun, walk: number, retreat: number, fade: number, final: boolean) {
    const out = this.tmp;
    const d = r.startDist + (r.total - r.startDist) * walk;
    this.pointAt(r, d, out);
    if (r.loser && retreat > 0) {
      out[0] += (r.retreat[0] - out[0]) * retreat;
      out[1] += (r.retreat[1] - out[1]) * retreat;
    }
    for (const s of r.soldiers) s.marker.setLngLat(out);
    if (final && r.loser && fade > 0) this.settle(r, true);
  }

  private settle(r: ArmyRun, defeated: boolean) {
    if (r.settled) return;
    r.settled = true;
    for (const el of r.els) {
      el.classList.add('army-marker--still');
      if (defeated) el.classList.add('army-marker--defeated');
    }
  }

  private setClash(on: boolean) {
    if (on === this.clashOn || !this.clashEl) return;
    this.clashOn = on;
    this.clashEl.classList.toggle('clash-marker--on', on);
  }

  private markFinal() {
    const anyWinner = this.runs.some((r) => r.winner);
    for (const r of this.runs) {
      if (anyWinner && r.winner) r.label?.classList.add('army-label--winner');
      this.settle(r, r.loser);
      for (const el of r.els) el.classList.add('army-marker--final');
    }
  }

  private setPhase(cls: 'army-marker--walking' | 'army-marker--clash', on: boolean) {
    for (const r of this.runs) for (const el of r.els) el.classList.toggle(cls, on);
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
    const tc = tw + CLASH_MS * k; // fin du choc, début du recul
    const walk = easeInOut(clamp01(el / tw));
    const back = easeInOut(clamp01((el - tc) / (RETREAT_MS * k)));
    if (el < tw) {
      for (const r of this.runs) this.place(r, walk, 0, 0, false);
    } else {
      if (this.phase < 2) {
        this.phase = 2;
        for (const r of this.runs) this.place(r, 1, 0, 0, false);
        this.setPhase('army-marker--walking', false);
        this.setPhase('army-marker--clash', true);
        this.setClash(true);
      }
      const hasWinnerRun = this.runs.some((r) => r.winner);
      if (el >= tc && this.phase < 3) {
        this.phase = 3;
        this.setPhase('army-marker--clash', false);
        for (const r of this.runs) {
          if (r.loser) for (const el of r.els) el.classList.add('army-marker--defeated');
          else if (hasWinnerRun) r.label?.classList.add('army-label--winner');
        }
      }
      if (el >= tc && el < this.total) for (const r of this.runs) if (r.loser) this.place(r, 1, back, 1, false);
    }
    if (el >= this.total) {
      for (const r of this.runs) this.place(r, 1, r.loser ? 1 : 0, 1, true);
      this.markFinal();
      this.raf = 0; // tout est immobile : la boucle s'arrête
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  };
}
