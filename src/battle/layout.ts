/**
 * Mise en page du paysage d'une bataille : fonctions PURES (aucun canvas), déterministes.
 * Le dessin est dans scenery.ts. Coordonnées du terrain : x de 0 à 100, y de 0 à 60.
 * Les éléments du scénario (BattleDecor) sont complétés par un décor GÉNÉRÉ selon le biome, rejeté de la zone des
 * armées (positions de départ, destinations, ligne entre les camps) : le décor ne doit jamais masquer la bataille.
 */
import type { BattleBiome, BattleDecor, BattlePoint, BattleScenario } from '../types-battle';
import { hash01, TERRAIN_H, TERRAIN_W } from './engine';

export type TreeKind = 'feuillu' | 'conifere' | 'olivier' | 'pin' | 'palmier';
export type RoofKind = 'tuile' | 'chaume' | 'ardoise' | 'terrasse';

/** Arbre : `s` = hauteur en unités du terrain, `v` = variante de teinte (0 à 2). */
export interface SceneTree {
  x: number;
  y: number;
  s: number;
  kind: TreeKind;
  v: number;
  gen: boolean;
}
export interface SceneHouse {
  x: number;
  y: number;
  /** Largeur en unités du terrain. */
  s: number;
  roof: RoofKind;
  tower: boolean;
}
export interface SceneRock {
  x: number;
  y: number;
  s: number;
  v: number;
  gen: boolean;
}
export interface SceneShape extends BattleDecor {
  gen: boolean;
}
export interface SceneryLayout {
  /** Triés par y croissant (dessinés avec les figurines). */
  trees: SceneTree[];
  houses: SceneHouse[];
  rocks: SceneRock[];
  /** Éléments du scénario, puis champs générés. */
  shapes: SceneShape[];
  /** Nombre d'éléments générés (arbres + rochers + champs). */
  generated: number;
}

/** Rayon libre autour des positions de départ et destinations des unités, pour le centre d'un élément généré. */
export const AVOID_UNITS = 13;
/** Distance minimale d'un élément généré (même isolé dans un bosquet) à une position de départ. */
export const AVOID_START = 10;
/** Distance minimale à la ligne entre les deux camps. */
export const AVOID_LINE = 8;

const MAX_TREES = 220;

/** Quantités générées par biome (réduites de moitié quand le scénario a déjà un décor riche). */
const GEN: Record<BattleBiome, { groves: number; trees: number; fields: number; rocks: number }> = {
  prairie: { groves: 2, trees: 5, fields: 2, rocks: 1 },
  foret: { groves: 3, trees: 6, fields: 0, rocks: 1 },
  steppe: { groves: 0, trees: 2, fields: 0, rocks: 2 },
  desert: { groves: 0, trees: 0, fields: 0, rocks: 4 },
  montagne: { groves: 2, trees: 4, fields: 0, rocks: 5 },
  mediterranee: { groves: 1, trees: 6, fields: 1, rocks: 2 },
  mer: { groves: 0, trees: 0, fields: 0, rocks: 0 },
};

export function treeKindFor(biome: BattleBiome, h: number): TreeKind {
  switch (biome) {
    case 'foret':
      return h < 0.3 ? 'conifere' : 'feuillu';
    case 'montagne':
      return 'conifere';
    case 'mediterranee':
      return h < 0.5 ? 'olivier' : 'pin';
    case 'desert':
      return 'palmier';
    default:
      return 'feuillu';
  }
}

function treeSize(kind: TreeKind, h: number): number {
  const base = kind === 'conifere' ? 4.2 : kind === 'palmier' ? 4.8 : kind === 'olivier' ? 3 : 3.8;
  return base + h * 1.4;
}

export function pointInPolygon(poly: BattlePoint[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance d'un point à un segment. */
export function distToSegment(x: number, y: number, a: BattlePoint, b: BattlePoint): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2));
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
}

const isLine = (k: BattleDecor['kind']) => k === 'riviere' || k === 'route' || k === 'pont';
const clampX = (x: number) => Math.max(1, Math.min(TERRAIN_W - 1, x));
const clampY = (y: number) => Math.max(1, Math.min(TERRAIN_H - 1, y));

/** Points jitterés d'une grille, à l'intérieur d'un polygone (ordre déterministe, au plus `max`). */
function scatterIn(poly: BattlePoint[], spacing: number, seed: string, max: number): BattlePoint[] {
  if (poly.length < 3) return [];
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const out: BattlePoint[] = [];
  let row = 0;
  for (let y = Math.min(...ys); y <= Math.max(...ys); y += spacing * 0.8, row++) {
    for (let x = Math.min(...xs) + (row % 2) * spacing * 0.5; x <= Math.max(...xs); x += spacing) {
      const px = x + (hash01(`${seed}x${x.toFixed(1)}_${row}`) - 0.5) * spacing * 0.8;
      const py = y + (hash01(`${seed}y${x.toFixed(1)}_${row}`) - 0.5) * spacing * 0.6;
      if (pointInPolygon(poly, px, py)) out.push([clampX(px), clampY(py)]);
    }
  }
  if (out.length <= max) return out;
  // Trop dense : on garde un sous-ensemble régulier.
  const step = out.length / max;
  return Array.from({ length: max }, (_, i) => out[Math.floor(i * step)]!);
}

const centroid = (pts: BattlePoint[]): BattlePoint => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];

function roofFor(biome: BattleBiome, kind: 'village' | 'ville'): RoofKind {
  if (biome === 'desert') return 'terrasse';
  if (biome === 'montagne') return 'ardoise';
  if (kind === 'ville' || biome === 'mediterranee') return 'tuile';
  return 'chaume';
}

/** Zone des armées : points à éviter et segment entre les camps. */
function armyZone(scenario: BattleScenario): { starts: BattlePoint[]; avoid: BattlePoint[]; line: [BattlePoint, BattlePoint] | null } {
  const starts = scenario.units.map((u) => u.at);
  const avoid = [...starts];
  for (const ph of scenario.phases) for (const m of Object.values(ph.moves)) if (m.to) avoid.push(m.to);
  const a = scenario.units.filter((u) => u.army === 0);
  const b = scenario.units.filter((u) => u.army !== 0);
  const line: [BattlePoint, BattlePoint] | null = a.length && b.length ? [centroid(a.map((u) => u.at)), centroid(b.map((u) => u.at))] : null;
  return { starts, avoid, line };
}

/** Mise en page complète : éléments du scénario (arbres, maisons, rochers déduits des polygones) + décor généré. */
export function sceneryLayout(scenario: BattleScenario, biomeIn: BattleBiome): SceneryLayout {
  const biome: BattleBiome = scenario.terrain === 'mer' ? 'mer' : biomeIn;
  const seed = `${biome}:${scenario.units[0]?.id ?? ''}:${scenario.units.length}`;
  const decor = scenario.decor ?? [];
  const trees: SceneTree[] = [];
  const houses: SceneHouse[] = [];
  const rocks: SceneRock[] = [];
  const shapes: SceneShape[] = decor.map((d) => ({ ...d, points: d.points.map(([x, y]) => [clampX(x), clampY(y)] as BattlePoint), gen: false }));

  // --- Éléments du scénario ---
  shapes.forEach((d, di) => {
    const s = `${seed}d${di}`;
    if (d.kind === 'foret') {
      for (const [i, [x, y]] of scatterIn(d.points, 3.4, s, 70).entries()) {
        const h = hash01(`${s}k${i}`);
        const kind = treeKindFor(biome, h);
        trees.push({ x, y, s: treeSize(kind, hash01(`${s}s${i}`)), kind, v: Math.floor(hash01(`${s}v${i}`) * 3), gen: false });
      }
    } else if (d.kind === 'village' || d.kind === 'ville') {
      const dense = d.kind === 'ville';
      const pts = scatterIn(d.points, dense ? 2.9 : 4.2, s, dense ? 24 : 8);
      const want = dense ? pts.length : Math.max(4, Math.min(8, pts.length));
      const c = centroid(d.points);
      let tower = -1;
      if (dense && pts.length) {
        let best = Infinity;
        pts.forEach(([x, y], i) => {
          const dd = Math.hypot(x - c[0], y - c[1]);
          if (dd < best) {
            best = dd;
            tower = i;
          }
        });
      }
      pts.slice(0, want).forEach(([x, y], i) => {
        houses.push({ x, y, s: (dense ? 2.3 : 2.5) + hash01(`${s}h${i}`) * 0.7, roof: roofFor(biome, d.kind as 'village' | 'ville'), tower: i === tower });
      });
    } else if (d.kind === 'rochers') {
      for (const [i, [x, y]] of scatterIn(d.points, 3.6, s, 14).entries()) {
        rocks.push({ x, y, s: 1.2 + hash01(`${s}r${i}`) * 1.3, v: i % 3, gen: false });
      }
    }
  });

  // --- Décor généré ---
  const cfg = GEN[biome];
  const rich = decor.length >= 3;
  const q = (n: number) => (rich ? Math.ceil(n / 2) : n);
  const zone = armyZone(scenario);
  const blocking = shapes.filter((d) => !isLine(d.kind) && d.points.length >= 3 && d.kind !== 'colline' && d.kind !== 'foret');
  const lines = shapes.filter((d) => isLine(d.kind) && d.points.length >= 2);
  let generated = 0;

  /** Un point candidat convient-il (marges, hors armées, hors eau/bâti/champs, loin des rivières et routes) ? */
  const free = (x: number, y: number, centre: boolean): boolean => {
    if (x < 2 || x > TERRAIN_W - 2 || y < 3 || y > TERRAIN_H - 3) return false;
    const r = centre ? AVOID_UNITS : AVOID_START;
    for (const p of centre ? zone.avoid : zone.starts) if (Math.hypot(x - p[0], y - p[1]) < r) return false;
    if (zone.line && distToSegment(x, y, zone.line[0], zone.line[1]) < AVOID_LINE) return false;
    for (const d of blocking) if (pointInPolygon(d.points, x, y)) return false;
    for (const d of lines) for (let i = 1; i < d.points.length; i++) if (distToSegment(x, y, d.points[i - 1]!, d.points[i]!) < 2.5) return false;
    return true;
  };
  const pick = (key: string, accept: (x: number, y: number) => boolean): BattlePoint | null => {
    for (let t = 0; t < 80; t++) {
      const x = 2 + hash01(`${key}x${t}`) * (TERRAIN_W - 4);
      const y = 3 + hash01(`${key}y${t}`) * (TERRAIN_H - 6);
      if (accept(x, y)) return [x, y];
    }
    return null;
  };
  const addTree = (x: number, y: number, key: string) => {
    if (trees.length >= MAX_TREES || !free(x, y, false)) return;
    const kind = treeKindFor(biome, hash01(`${key}k`));
    trees.push({ x, y, s: treeSize(kind, hash01(`${key}s`)), kind, v: Math.floor(hash01(`${key}v`) * 3), gen: true });
    generated++;
  };

  if (biome === 'desert') {
    // Palmiers seulement près de l'eau (rivière, marais, côte du scénario).
    const water = shapes.filter((d) => d.kind === 'riviere' || d.kind === 'marais' || d.kind === 'cote');
    water.forEach((d, wi) => {
      const anchor = d.points[Math.floor(d.points.length / 2)];
      if (!anchor) return;
      for (let i = 0; i < 4; i++) {
        const a = hash01(`${seed}pa${wi}${i}`) * Math.PI * 2;
        const r = 3 + hash01(`${seed}pr${wi}${i}`) * 3;
        const x = anchor[0] + Math.cos(a) * r;
        const y = anchor[1] + Math.sin(a) * r;
        if (!blocking.some((b) => pointInPolygon(b.points, x, y))) addTree(x, y, `${seed}p${wi}${i}`);
      }
    });
  } else {
    for (let g = 0; g < q(cfg.groves); g++) {
      const c = pick(`${seed}g${g}`, (x, y) => free(x, y, true));
      if (!c) continue;
      const n = 4 + Math.floor(hash01(`${seed}gn${g}`) * 3);
      for (let i = 0; i < n; i++) {
        const a = hash01(`${seed}ga${g}${i}`) * Math.PI * 2;
        const r = Math.sqrt(hash01(`${seed}gr${g}${i}`)) * 4;
        addTree(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * 0.7, `${seed}gt${g}${i}`);
      }
    }
    for (let i = 0; i < q(cfg.trees); i++) {
      const p = pick(`${seed}t${i}`, (x, y) => free(x, y, true));
      if (p) addTree(p[0], p[1], `${seed}ti${i}`);
    }
  }
  for (let i = 0; i < q(cfg.fields); i++) {
    const c = pick(`${seed}f${i}`, (x, y) => free(x, y, true) && x > 7 && x < TERRAIN_W - 7 && y > 7 && y < TERRAIN_H - 7);
    if (!c) continue;
    const w = 5 + hash01(`${seed}fw${i}`) * 3;
    const h = 3 + hash01(`${seed}fh${i}`) * 2;
    const poly: BattlePoint[] = [
      [c[0] - w, c[1] - h],
      [c[0] + w, c[1] - h * 0.8],
      [c[0] + w * 0.9, c[1] + h],
      [c[0] - w * 0.9, c[1] + h * 0.8],
    ];
    if (!poly.every(([x, y]) => free(x, y, false))) continue;
    shapes.push({ kind: 'champ', points: poly, gen: true });
    generated++;
  }
  for (let i = 0; i < q(cfg.rocks); i++) {
    const p = pick(`${seed}r${i}`, (x, y) => free(x, y, true));
    if (!p) continue;
    const n = 1 + Math.floor(hash01(`${seed}rn${i}`) * 3);
    for (let k = 0; k < n; k++) {
      const x = p[0] + (hash01(`${seed}rx${i}${k}`) - 0.5) * 3;
      const y = p[1] + (hash01(`${seed}ry${i}${k}`) - 0.5) * 2;
      if (!free(x, y, false)) continue;
      rocks.push({ x, y, s: 1.1 + hash01(`${seed}rs${i}${k}`) * 1.2, v: k % 3, gen: true });
      generated++;
    }
  }

  trees.sort((a, b) => a.y - b.y);
  houses.sort((a, b) => a.y - b.y);
  return { trees, houses, rocks, shapes, generated };
}
