/**
 * Moteur de la fenêtre « Voir la bataille » : PUR (sans DOM), déterministe.
 * Il produit, pour un instant t, la liste des figurines à dessiner ; render.ts les peint sur un canvas.
 */
import type { BattleFormation, BattlePhase, BattlePoint, BattleScenario, BattleUnit, BattleUnitKind, BattleUnitState } from '../types-battle';
import type { TimelineStep } from '../types';

export const TERRAIN_W = 100;
export const TERRAIN_H = 60;
/** Nombre maximal de figurines affichées (lisibilité et fluidité du canvas). */
export const MAX_FIGURES = 200;

export type FigureState = BattleUnitState | 'mort';

export interface BattleFigure {
  id: string;
  unit: string;
  army: number;
  kind: BattleUnitKind;
  x: number;
  y: number;
  state: FigureState;
  /** Image de marche (0 ou 1) ; alterne quand l'unité bouge ou combat. */
  frame: 0 | 1;
  /** Sens du camp : 1 regarde vers la droite, -1 vers la gauche (figurine en miroir). */
  facing: 1 | -1;
}

export interface BattleFrame {
  figures: BattleFigure[];
  /** Index de la phase courante et avancement dans cette phase (0 à 1). */
  phase: number;
  progress: number;
  t: number;
}

/** Hachage déterministe d'une chaîne vers [0, 1[ (pour les décalages et l'ordre des pertes). */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

const CANDIDATE_SCALES = [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];

/** Hommes représentés par une figurine : le plus petit palier qui garde le total sous MAX_FIGURES (marge pour les arrondis). */
export function scaleFor(totalTroops: number): number {
  for (const s of CANDIDATE_SCALES) if (totalTroops / s <= MAX_FIGURES - 10) return s;
  return CANDIDATE_SCALES[CANDIDATE_SCALES.length - 1]!;
}

/** Nombre de figurines d'une unité (au moins une). */
export function figureCount(unit: BattleUnit, scale: number): number {
  return Math.max(1, Math.round(unit.troops / scale));
}

/** Figurines de chaque unité, dans l'ordre de scenario.units. */
export function figuresOf(scenario: BattleScenario, scale: number): number[] {
  return scenario.units.map((u) => figureCount(u, scale));
}

export function durationOf(scenario: BattleScenario): number {
  return scenario.phases.reduce((s, p) => s + Math.max(0.001, p.duration), 0);
}

export function totalTroops(scenario: BattleScenario): number {
  return scenario.units.reduce((s, u) => s + u.troops, 0);
}

/* ---------- Scénario générique ---------- */

const KIND_SHARE: [string, BattleUnitKind, number][] = [
  ['centre', 'infanterie', 0.6],
  ['aile-haute', 'cavalerie', 0.2],
  ['aile-basse', 'cavalerie', 0.2],
];

/**
 * Simulation schématique d'une étape sans scénario écrit : deux camps face à face (plus de deux armées : les
 * vainqueurs contre les autres), chaque armée = centre d'infanterie + deux ailes de cavalerie.
 * Le camp de la première armée est à gauche ; le camp vainqueur est celui des armées `winner`
 * (à défaut, celui de la première armée).
 */
export function genericScenario(step: Pick<TimelineStep, 'armies'>, troops: number[]): BattleScenario {
  const armies = step.armies ?? [];
  const winners = armies.map((a) => a.winner === true);
  const anyWinner = winners.some(Boolean);
  const anyLoser = winners.some((w) => !w);
  // Camp de chaque armée (0 = gauche, 1 = droite).
  const campOf = armies.map((_, i) => {
    if (armies.length <= 1) return 0;
    const group = anyWinner && anyLoser ? (winners[i] ? 1 : 0) : i === 0 ? 0 : 1;
    const first = anyWinner && anyLoser ? (winners[0] ? 1 : 0) : 0;
    return group === first ? 0 : 1;
  });
  // Le camp vainqueur : celui des armées « winner », sinon celui de la première armée.
  const winnerCamp = anyWinner && anyLoser ? campOf[winners.indexOf(true)]! : 0;

  const units: BattleUnit[] = [];
  const spread = (camp: number, army: number) => {
    const mates = armies.map((_, i) => i).filter((i) => campOf[i] === camp);
    const m = mates.length;
    const k = mates.indexOf(army);
    return { yc: TERRAIN_H / 2 + (k - (m - 1) / 2) * (44 / m), wing: 11 / m, band: 44 / m };
  };
  armies.forEach((_, a) => {
    const camp = campOf[a]!;
    const { yc, wing } = spread(camp, a);
    const x = camp === 0 ? 15 : 85;
    const total = troops[a] ?? 0;
    for (const [name, kind, share] of KIND_SHARE) {
      const dy = name === 'centre' ? 0 : name === 'aile-haute' ? -wing : wing;
      units.push({
        id: `a${a}-${name}`,
        army: a,
        kind,
        troops: Math.round(total * share),
        at: [x, yc + dy],
        formation: kind === 'cavalerie' ? 'coin' : 'ligne',
      });
    }
  });

  const moves = (fn: (u: BattleUnit, camp: number, won: boolean) => { to?: BattlePoint; state?: BattleUnitState; losses?: number }) => {
    const out: BattlePhase['moves'] = {};
    for (const u of units) {
      const camp = campOf[u.army]!;
      out[u.id] = fn(u, camp, camp === winnerCamp);
    }
    return out;
  };
  const toward = (u: BattleUnit, x: number, narrow = 0): BattlePoint => {
    // Les ailes se resserrent légèrement vers l'axe du combat.
    const y = u.at[1] + (TERRAIN_H / 2 - u.at[1]) * narrow;
    return [x, y];
  };
  const phases: BattlePhase[] = [
    {
      label: 'Les deux armées marchent l’une vers l’autre.',
      duration: 4,
      moves: moves((u, camp) => ({ to: toward(u, camp === 0 ? 40 : 60), state: 'marche' })),
    },
    {
      label: 'Le choc : les lignes s’affrontent au corps à corps.',
      duration: 5,
      moves: moves((u, camp, won) => ({ to: toward(u, camp === 0 ? 45 : 55, 0.25), state: 'combat', losses: won ? 0.1 : 0.15 })),
    },
    {
      label: 'Une armée cède : sa ligne se rompt et elle recule en désordre.',
      duration: 4,
      moves: moves((u, camp, won) =>
        won
          ? { to: toward(u, camp === 0 ? 55 : 45, 0.2), state: 'marche', losses: 0.15 }
          : { to: toward(u, camp === 0 ? 10 : 90), state: 'fuite', losses: 0.45 },
      ),
    },
    {
      label: 'Les vainqueurs poursuivent les fuyards et restent maîtres du terrain.',
      duration: 3,
      moves: moves((u, camp, won) =>
        won ? { to: toward(u, camp === 0 ? 72 : 28, 0.1), state: 'marche', losses: 0.2 } : { to: toward(u, camp === 0 ? 3 : 97), state: 'fuite', losses: 0.6 },
      ),
    },
  ];
  return { terrain: 'plaine', units, phases };
}

/* ---------- Trajectoires ---------- */

interface Key {
  t0: number;
  t1: number;
  from: BattlePoint;
  to: BattlePoint;
  state: BattleUnitState;
  loss0: number;
  loss1: number;
}

interface Compiled {
  starts: number[];
  duration: number;
  keys: Map<string, Key[]>;
  /** Sens de chaque armée (selon la moyenne des x de départ de ses unités). */
  facing: Map<number, 1 | -1>;
}

const cache = new WeakMap<BattleScenario, Compiled>();

function compile(sc: BattleScenario): Compiled {
  const hit = cache.get(sc);
  if (hit) return hit;
  const starts: number[] = [];
  let t = 0;
  for (const p of sc.phases) {
    starts.push(t);
    t += Math.max(0.001, p.duration);
  }
  const keys = new Map<string, Key[]>();
  for (const u of sc.units) {
    let pos = u.at;
    let state: BattleUnitState = 'marche';
    let loss = 0;
    const list: Key[] = [];
    sc.phases.forEach((p, i) => {
      const m = p.moves[u.id] ?? {};
      const to = m.to ?? pos;
      if (m.state) state = m.state;
      const nl = Math.max(loss, Math.min(1, m.losses ?? loss));
      list.push({ t0: starts[i]!, t1: starts[i]! + Math.max(0.001, p.duration), from: pos, to, state, loss0: loss, loss1: nl });
      pos = to;
      loss = nl;
    });
    keys.set(u.id, list);
  }
  const facing = new Map<number, 1 | -1>();
  const sums = new Map<number, [number, number]>();
  for (const u of sc.units) {
    const s = sums.get(u.army) ?? [0, 0];
    sums.set(u.army, [s[0] + u.at[0], s[1] + 1]);
  }
  for (const [a, [sx, n]] of sums) facing.set(a, sx / n < TERRAIN_W / 2 ? 1 : -1);
  const out = { starts, duration: t, keys, facing };
  cache.set(sc, out);
  return out;
}

const smooth = (p: number) => p * p * (3 - 2 * p);

function keyAt(keys: Key[], t: number): { key: Key; p: number; index: number } {
  let index = keys.length - 1;
  for (let i = 0; i < keys.length; i++) {
    if (t < keys[i]!.t1) {
      index = i;
      break;
    }
  }
  const key = keys[index]!;
  const p = Math.min(1, Math.max(0, (t - key.t0) / (key.t1 - key.t0)));
  return { key, p, index };
}

function unitAt(keys: Key[], t: number) {
  const { key, p } = keyAt(keys, t);
  const e = smooth(p);
  const x = key.from[0] + (key.to[0] - key.from[0]) * e;
  const y = key.from[1] + (key.to[1] - key.from[1]) * e;
  const moving = (key.from[0] !== key.to[0] || key.from[1] !== key.to[1]) && p > 0 && p < 1;
  return { x, y, state: key.state, losses: key.loss0 + (key.loss1 - key.loss0) * p, moving };
}

/* ---------- Formations ---------- */

const SPACE_ALONG = 1.7;
const SPACE_DEPTH = 1.4;

/** Décalage (dx, dy) de la figurine i dans son bloc de n figurines ; `facing` oriente l'avant du bloc. */
export function formationOffset(formation: BattleFormation, i: number, n: number, facing: 1 | -1): [number, number] {
  if (formation === 'coin') {
    // Coin en V : la pointe (rang 0) en avant, les rangs s'élargissent derrière.
    const k = Math.floor(Math.sqrt(i));
    const j = i - k * k;
    const kmax = Math.floor(Math.sqrt(Math.max(0, n - 1)));
    return [(kmax / 2 - k) * SPACE_DEPTH * facing, (j - k) * SPACE_ALONG * 0.8];
  }
  const along = formation === 'ligne' ? Math.ceil(Math.sqrt(n * 2.5)) : formation === 'colonne' ? Math.ceil(Math.sqrt(n / 2.5)) : Math.ceil(Math.sqrt(n));
  const cols = Math.max(1, Math.min(along, n));
  const rows = Math.ceil(n / cols);
  const col = i % cols;
  const row = Math.floor(i / cols);
  return [((rows - 1) / 2 - row) * SPACE_DEPTH * facing, (col - (cols - 1) / 2) * SPACE_ALONG];
}

/** Rang de mort de chaque figurine (ordre pseudo-aléatoire stable), en cache par unité. */
const rankCache = new Map<string, number[]>();
function deathThresholds(unitId: string, n: number): number[] {
  const key = `${unitId}:${n}`;
  let r = rankCache.get(key);
  if (!r) {
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => hash01(`${unitId}#${a}`) - hash01(`${unitId}#${b}`));
    const out = Array.from({ length: n }, () => 0);
    order.forEach((fig, rank) => (out[fig] = (rank + 0.5) / n));
    r = out;
    rankCache.set(key, r);
  }
  return r;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Positions de toutes les figurines à l'instant t (secondes à vitesse ×1). */
export function stateAt(scenario: BattleScenario, scale: number, t: number): BattleFrame {
  const c = compile(scenario);
  const time = clamp(Number.isFinite(t) ? t : 0, 0, c.duration);
  const figures: BattleFigure[] = [];
  let phase = 0;
  let progress = 0;
  for (const u of scenario.units) {
    const keys = c.keys.get(u.id)!;
    const n = figureCount(u, scale);
    const facing = c.facing.get(u.army) ?? 1;
    const cur = unitAt(keys, time);
    const thr = deathThresholds(u.id, n);
    const ka = keyAt(keys, time);
    phase = ka.index;
    progress = ka.p;
    for (let i = 0; i < n; i++) {
      const [dx, dy] = formationOffset(u.formation, i, n, facing);
      const jx = (hash01(`${u.id}x${i}`) - 0.5) * 0.7;
      const jy = (hash01(`${u.id}y${i}`) - 0.5) * 0.7;
      let center: { x: number; y: number } = cur;
      let state: FigureState = cur.state;
      if (thr[i]! < cur.losses) {
        // Tombé : reste au sol là où l'unité se trouvait au moment où ses pertes ont franchi son seuil.
        let lo = 0;
        let hi = c.duration; // bornes fixes : la place des morts ne dépend pas de t
        for (let k = 0; k < 18; k++) {
          const mid = (lo + hi) / 2;
          if (thr[i]! < unitAt(keys, mid).losses) hi = mid;
          else lo = mid;
        }
        center = unitAt(keys, hi);
        state = 'mort';
      }
      const alive = state !== 'mort';
      const frame = alive && (cur.moving || state === 'combat') ? ((Math.floor(time * 4 + hash01(`${u.id}f${i}`) * 2) & 1) as 0 | 1) : 0;
      figures.push({
        id: `${u.id}#${i}`,
        unit: u.id,
        army: u.army,
        kind: u.kind,
        x: clamp(center.x + dx + jx, 0, TERRAIN_W),
        y: clamp(center.y + dy + jy, 0, TERRAIN_H),
        state,
        frame,
        facing,
      });
    }
  }
  return { figures, phase, progress, t: time };
}

/** Début (en secondes) de la phase i. */
export function phaseStart(scenario: BattleScenario, i: number): number {
  return compile(scenario).starts[i] ?? 0;
}
