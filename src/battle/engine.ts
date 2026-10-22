/**
 * Moteur de la fenêtre « Voir la bataille » : PUR (sans DOM), déterministe.
 * Il produit, pour un instant t, la liste des figurines à dessiner ; render.ts les peint sur un canvas.
 */
import type { BattleAction, BattleFormation, BattlePhase, BattlePoint, BattleScenario, BattleUnit, BattleUnitKind, BattleUnitState } from '../types-battle';
import type { Faction, TimelineStep } from '../types';
import { firearmOf, isMounted, muzzleOf, WEAPON_FX, weaponOf, type Weapon } from './weapons';
import { hash01 } from './hash';
import { layoutOf } from './formations';

export { hash01 };

export const TERRAIN_W = 100;
export const TERRAIN_H = 60;
/** Nombre maximal de figurines affichées (lisibilité et fluidité du canvas). */
export const MAX_FIGURES = 200;

export type FigureState = BattleUnitState | 'mort';
/** Attitude de la figurine : `tir` = pose de visée + éclair (un instant) ; `baionnette` = charge ou mêlée, arme en avant. */
export type FigurePose = 'marche' | 'vise' | 'tir' | 'recharge' | 'baionnette';
/** Largeur d'une figurine en unités de terrain (render.ts dessine à 2,2 % de la largeur). */
export const FW_T = 2.2;
/** Nombre maximal d'effets (éclairs, fumées, boulets, flèches) par image. */
export const MAX_EFFECTS = 300;

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
  /** Sens de la figurine : 1 regarde vers la droite, -1 vers la gauche (en miroir). Celui du camp, sauf dos tourné (feinte) ou carré. */
  facing: 1 | -1;
  /** Sens de l'arme : égal à `facing`, sauf le tir « parthe » d'un archer monté qui fuit en visant en arrière. */
  aim: 1 | -1;
  /** Rang dans le bloc (0 = premier). */
  rank: number;
  /** `tir` / `pique` : rôle dans un tercio. */
  role?: 'tir' | 'pique';
  /** Arme longue (sarisse, pique) à dessiner à la place de l'arme du soldat ; la pose dit si elle est baissée (`baionnette`) ou dressée. */
  pike: boolean;
  /** Boucliers en toit au-dessus de la tête (tortue). */
  roof: boolean;
  /** Navire qui porte la figurine (unités `navires`). */
  ship?: string;
  /** Monture ou engin à l'arrêt (pas de galop). */
  idle: boolean;
  /** Attitude (visée, tir, rechargement, charge) ; `marche` sinon. */
  pose: FigurePose;
  /** Arme de tir de la figurine, s'il y en a une (pièce, fusil, arc…). */
  weapon: Weapon | null;
  /** Recul d'une pièce d'artillerie après le coup (0 à 1). */
  recoil: number;
}

/**
 * Effet visuel dérivé du seul temps t (rien n'est mémorisé) : on peut sauter à un instant sans changer le résultat.
 * x, y : position au sol (terrain) ; z : hauteur en largeurs de figurine ; size : taille en largeurs de figurine.
 */
export interface BattleEffect {
  kind: 'eclair' | 'fumee' | 'boulet' | 'fleche';
  x: number;
  y: number;
  z: number;
  /** Secondes écoulées depuis le début de l'effet. */
  age: number;
  /** Sens du tir (1 vers la droite). */
  dir: 1 | -1;
  size: number;
  /** Opacité (fumée). */
  alpha: number;
  /** Flèche : position un instant plus tôt (pour tracer le trait). */
  tail?: { x: number; y: number; z: number };
}

export interface BattleFrame {
  figures: BattleFigure[];
  effects: BattleEffect[];
  /** Index de la phase courante et avancement dans cette phase (0 à 1). */
  phase: number;
  progress: number;
  t: number;
}

const CANDIDATE_SCALES = [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];

/** Hommes représentés par une figurine : le plus petit palier qui garde le total sous MAX_FIGURES (marge pour les arrondis). */
export function scaleFor(totalTroops: number): number {
  for (const s of CANDIDATE_SCALES) if (totalTroops / s <= MAX_FIGURES - 10) return s;
  return CANDIDATE_SCALES[CANDIDATE_SCALES.length - 1]!;
}

/** Nombre de figurines d'une unité (au moins une). */
export function figureCount(unit: BattleUnit, scale: number): number {
  const n = Math.max(1, Math.round(unit.troops / scale));
  // Une figurine d'artillerie = une pièce : une batterie reste lisible (et compte dans le plafond).
  return unit.kind === 'artillerie' ? Math.min(12, n) : n;
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

/** Peuples dont la cavalerie est faite d'archers à cheval (steppe). */
const HORSE_ARCHERS = new Set<Faction>(['mongols', 'turcs-seldjoukides', 'turcs-gokturks', 'khitans', 'xiongnu', 'scythes', 'magyars', 'ouighours']);
/** Armées de la ligne napoléonienne (colonne d'assaut, puis ligne au feu). */
const LINE_ARMIES = new Set<Faction>(['francais', 'autrichiens', 'prussiens', 'russes', 'britanniques']);

/**
 * Nature et formation par défaut d'un bloc du scénario générique, selon le peuple et l'année.
 * La formation est fixe pour toute la bataille : le camp qui attaque (`attacker`) avance en colonne, l'autre tient en ligne.
 */
export function defaultsFor(
  faction: Faction | undefined,
  kind: BattleUnitKind,
  year: number | undefined,
  attacker: boolean,
): { kind: BattleUnitKind; formation: BattleFormation } {
  const y = year ?? Number.NaN;
  if (kind === 'cavalerie') {
    if (faction && HORSE_ARCHERS.has(faction)) return { kind: 'archers-montes', formation: 'ligne' };
    return { kind, formation: 'coin' };
  }
  if (kind !== 'infanterie') return { kind, formation: 'ligne' };
  if (faction === 'grecs-macedoniens') return { kind, formation: 'phalange' };
  if (faction === 'romains' && y < -100) return { kind, formation: 'quinconce' };
  if ((faction === 'tercios' || faction === 'espagnols') && y >= 1500 && y <= 1650) return { kind, formation: 'tercio' };
  if (faction === 'britanniques') return { kind, formation: 'mince' };
  if (faction && LINE_ARMIES.has(faction)) return { kind, formation: attacker ? 'colonne' : 'ligne' };
  return { kind, formation: 'ligne' };
}

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
 * Dès 1500, une armée à arme à feu ajoute une batterie d'artillerie (~5 % des effectifs) derrière son centre ; ces
 * armes tirent pendant le choc, puis l'infanterie victorieuse charge à la baïonnette.
 */
export function genericScenario(step: Pick<TimelineStep, 'armies'> & { year?: number }, troops: number[]): BattleScenario {
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
  const gunned = armies.map((a) => firearmOf(a.faction) !== null);

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
    const battery = gunned[a]! && (step.year ?? 0) >= 1500;
    for (const [name, baseKind, share] of KIND_SHARE) {
      const { kind, formation } = defaultsFor(armies[a]?.faction, baseKind, step.year, camp === winnerCamp);
      const dy = name === 'centre' ? 0 : name === 'aile-haute' ? -wing : wing;
      units.push({
        id: `a${a}-${name}`,
        army: a,
        kind,
        troops: Math.round(total * (battery && name === 'centre' ? share - 0.05 : share)),
        at: [x, yc + dy],
        formation,
      });
    }
    if (battery)
      units.push({
        id: `a${a}-batterie`,
        army: a,
        kind: 'artillerie',
        troops: Math.round(total * 0.05),
        at: [camp === 0 ? x - 6 : x + 6, yc],
        formation: 'ligne',
      });
  });
  const shoots = units.some((u) => u.kind === 'artillerie' || firearmOf(armies[u.army]?.faction));
  /** Infanterie à arme à feu ou artillerie : reste en place pour tirer pendant le choc. */
  const gunner = (u: BattleUnit) => u.kind === 'artillerie' || (u.kind === 'infanterie' && !!firearmOf(armies[u.army]?.faction));

  const moves = (fn: (u: BattleUnit, camp: number, won: boolean) => { to?: BattlePoint; state?: BattleUnitState; losses?: number; action?: BattleAction }) => {
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
      // La batterie se poste un peu en retrait de la ligne d'infanterie.
      moves: moves((u, camp) => ({ to: toward(u, u.kind === 'artillerie' ? (camp === 0 ? 33 : 67) : camp === 0 ? 40 : 60), state: 'marche' })),
    },
    {
      label: shoots
        ? 'Le choc : les lignes se fusillent et le canon tonne, tandis que le reste de l’armée charge.'
        : 'Le choc : les lignes s’affrontent au corps à corps.',
      duration: 5,
      moves: moves((u, camp, won) =>
        gunner(u)
          ? { state: 'combat', action: 'feu', losses: won ? 0.1 : 0.15 }
          : { to: toward(u, camp === 0 ? 45 : 55, 0.25), state: 'combat', losses: won ? 0.1 : 0.15 },
      ),
    },
    {
      label: 'Une armée cède : sa ligne se rompt et elle recule en désordre.',
      duration: 4,
      moves: moves((u, camp, won) => {
        if (won && u.kind === 'artillerie') return { state: 'combat', action: 'feu', losses: 0.15 };
        if (won && gunner(u)) return { to: toward(u, camp === 0 ? 55 : 45, 0.2), state: 'combat', action: 'baionnette', losses: 0.15 };
        return won
          ? { to: toward(u, camp === 0 ? 55 : 45, 0.2), state: 'marche', losses: 0.15 }
          : { to: toward(u, camp === 0 ? 10 : 90), state: 'fuite', losses: 0.45 };
      }),
    },
    {
      label: 'Les vainqueurs poursuivent les fuyards et restent maîtres du terrain.',
      duration: 3,
      moves: moves((u, camp, won) => {
        if (won && u.kind === 'artillerie') return { state: 'combat', action: 'feu', losses: 0.2 };
        return won
          ? { to: toward(u, camp === 0 ? 72 : 28, 0.1), state: 'marche', losses: 0.2 }
          : { to: toward(u, camp === 0 ? 3 : 97), state: 'fuite', losses: 0.6 };
      }),
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
  action?: BattleAction;
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
    let action: BattleAction | undefined;
    let loss = 0;
    const list: Key[] = [];
    sc.phases.forEach((p, i) => {
      const m = p.moves[u.id] ?? {};
      const to = m.to ?? pos;
      if (m.state) {
        state = m.state;
        action = m.action;
      } else if (m.action) action = m.action;
      const nl = Math.max(loss, Math.min(1, m.losses ?? loss));
      list.push({ t0: starts[i]!, t1: starts[i]! + Math.max(0.001, p.duration), from: pos, to, state, action, loss0: loss, loss1: nl });
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
  // Vitesse en unités de terrain par seconde (dérivée de la courbe lissée).
  const speed = (Math.hypot(key.to[0] - key.from[0], key.to[1] - key.from[1]) / (key.t1 - key.t0)) * 6 * p * (1 - p);
  return { x, y, state: key.state, action: key.action, losses: key.loss0 + (key.loss1 - key.loss0) * p, moving, speed };
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

/* ---------- Tirs : cycle viser → tirer → recharger, et effets dérivés du temps ---------- */

const frac = (v: number) => v - Math.floor(v);
/** Dérive de la fumée sous le vent (unités de terrain par seconde, vers la droite). */
const WIND = 0.35;
/** Portée maximale d'un boulet / d'une volée de flèches (unités de terrain) et durées de vol (secondes). */
const RANGE = { canon: 45, arc: 32 };
const FLIGHT = { boulet: 0.6, rebond: 0.3, fleche: 1 };
/** Une unité à l'arrêt : vitesse en dessous de ce seuil (unités de terrain par seconde). */
const STILL = 0.4;
/** Hauteur de la selle au-dessus du sol, en largeurs de figurine (les tirs d'un cavalier partent de plus haut). */
const MOUNT_LIFT: Partial<Record<BattleUnitKind, number>> = { cavalerie: 0.75, 'archers-montes': 0.75, elephants: 1.9, chars: 0.7 };

/** Une pièce de plus ou de moins n'y change rien : le cycle d'une figurine est stable (hachage de son id). */
interface Cycle {
  vise: number;
  tir: number;
  total: number;
  /** Décalage du début de cycle : les rangs tirent à tour de rôle (salves). */
  off: number;
}

function cycleOf(weapon: Weapon, unit: BattleUnit, fid: string, rankIndex: number, reload: number): Cycle {
  const w = WEAPON_FX[weapon];
  const h = hash01(fid);
  const total = w.vise + w.tir + reload + (h - 0.5) * 0.3;
  const rank = rankIndex % 3;
  const off = ((((-rank * total) / 3 + frac(h * 13.7) * 0.9 + hash01(unit.id) * 1.7) % total) + total) % total;
  return { vise: w.vise, tir: w.tir, total, off };
}

/**
 * L'unité (à l'instant décrit par `s`) peut-elle tirer ? Au combat, en action « feu », à l'arrêt ; les archers montés
 * tirent aussi en mouvement et pendant une feinte.
 */
function mayFire(s: ReturnType<typeof unitAt>, weapon: Weapon, mountedArcher: boolean): boolean {
  if (s.state === 'fuite') return false;
  const act = s.action ?? 'feu';
  if (act === 'feinte') return mountedArcher;
  if (s.state !== 'combat' || act !== 'feu') return false;
  return weapon === 'bordee' || mountedArcher || s.speed < STILL;
}

/** Le tir de la figurine est-il possible à l'instant ts (figurine en vie) ? */
function canFireAt(keys: Key[], threshold: number, ts: number, weapon: Weapon, mountedArcher: boolean) {
  const s = unitAt(keys, ts);
  return threshold < s.losses || !mayFire(s, weapon, mountedArcher) ? null : s;
}

/** Sens du corps (`dir`) et de l'arme (`aim`) : pendant une feinte, le dos est tourné, mais l'archer monté tire en arrière (« parthe »). */
function orient(action: BattleAction | undefined, state: BattleUnitState, slotDir: 1 | -1, mountedArcher: boolean): { dir: 1 | -1; aim: 1 | -1 } {
  const back = action === 'feinte' && state !== 'fuite';
  const dir: 1 | -1 = back ? (-slotDir as 1 | -1) : slotDir;
  return { dir, aim: back && mountedArcher ? slotDir : dir };
}

/** Bombement du croissant (0 à 1) : l'arc s'aplatit quand l'unité recule, en se fondant d'une phase à l'autre. */
function bulgeFactor(keys: Key[], ka: { key: Key; p: number; index: number }, camp: 1 | -1): number {
  const target = (k: Key) => (k.state === 'fuite' || (k.to[0] - k.from[0]) * camp < -0.5 ? 0 : 1);
  const prev = ka.index > 0 ? target(keys[ka.index - 1]!) : 1;
  return prev + (target(ka.key) - prev) * smooth(Math.min(1, ka.p * 4));
}

/** Centre de l'unité ennemie vivante la plus proche de (x, y) à l'instant ts. */
function nearestEnemy(sc: BattleScenario, c: Compiled, army: number, x: number, y: number, ts: number): [number, number] | null {
  const mine = c.facing.get(army);
  let best: [number, number] | null = null;
  let bestD = Infinity;
  for (const u of sc.units) {
    if (c.facing.get(u.army) === mine) continue;
    const s = unitAt(c.keys.get(u.id)!, ts);
    if (s.losses > 0.95) continue;
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bestD) {
      bestD = d;
      best = [s.x, s.y];
    }
  }
  return best;
}

type Buckets = Record<BattleEffect['kind'], BattleEffect[]>;

/** Courbe de vol : de la bouche (m) à la cible (t), en parabole d'apogée `peak`. */
function flight(m: { x: number; y: number; z: number }, to: [number, number], p: number, peak: number) {
  return { x: m.x + (to[0] - m.x) * p, y: m.y + (to[1] - m.y) * p, z: m.z * (1 - p) + peak * 4 * p * (1 - p) };
}

/** Effets d'un coup tiré à ts, vus à l'instant `time` ; renvoie le recul de la pièce (0 à 1). */
function shotEffects(
  out: Buckets,
  sc: BattleScenario,
  c: Compiled,
  u: BattleUnit,
  weapon: Weapon,
  fid: string,
  k: number,
  ts: number,
  time: number,
  origin: { x: number; y: number },
  dir: 1 | -1,
  lift: number,
): number {
  const w = WEAPON_FX[weapon];
  const age = time - ts;
  const mz = muzzleOf(weapon);
  const m = { x: origin.x + dir * mz.dx * FW_T, y: origin.y + (weapon === 'bordee' ? 0.8 : 0), z: mz.dz + lift };
  const h = hash01(fid);
  if (w.flash > 0 && age < w.tir) out.eclair.push({ kind: 'eclair', x: m.x, y: m.y, z: m.z, age, dir, size: w.flash, alpha: 1 });
  for (let j = 0; j < w.puffs; j++) {
    const pa = age - j * 0.1;
    if (pa < 0 || pa >= w.smokeLife) continue;
    const q = pa / w.smokeLife;
    const v = frac(h * 7.31 + j * 0.37 + k * 0.13);
    out.fumee.push({
      kind: 'fumee',
      x: m.x + dir * (0.25 * j + 0.8 * Math.sqrt(q) * w.smokeSize * 2) + WIND * pa,
      y: m.y + (v - 0.5) * 0.5,
      z: m.z + 0.3 * pa * (0.8 + v * 0.4) + j * 0.05,
      age: pa,
      dir,
      size: (w.smokeSize + w.smokeGrow * Math.sqrt(q)) * (0.85 + v * 0.3),
      alpha: 0.8 * Math.pow(1 - q, 1.1) * Math.min(1, pa / 0.08),
    });
  }
  if (weapon === 'canon' || weapon === 'arc') {
    const range = weapon === 'canon' ? RANGE.canon : RANGE.arc;
    const target = nearestEnemy(sc, c, u.army, origin.x, origin.y, ts);
    let to: [number, number] = target ?? [m.x + dir * range * 0.6, m.y];
    const dist = Math.hypot(to[0] - m.x, to[1] - m.y) || 1;
    const reach = Math.min(1, range / dist);
    const spread = weapon === 'canon' ? 2 : 3;
    to = [m.x + (to[0] - m.x) * reach + (frac(h * 5.1 + k * 0.29) - 0.5) * spread, m.y + (to[1] - m.y) * reach + (frac(h * 3.7 + k * 0.41) - 0.5) * spread];
    const len = Math.min(dist, range);
    if (weapon === 'arc' && age < FLIGHT.fleche) {
      const p = age / FLIGHT.fleche;
      const peak = 0.8 + len * 0.1;
      const head = flight(m, to, p, peak);
      out.fleche.push({ kind: 'fleche', ...head, age, dir, size: 1, alpha: 1, tail: flight(m, to, Math.max(0, p - 0.05), peak) });
    }
    if (weapon === 'canon' && age < FLIGHT.boulet + FLIGHT.rebond) {
      if (age < FLIGHT.boulet) {
        const p = age / FLIGHT.boulet;
        out.boulet.push({ kind: 'boulet', ...flight(m, to, p, 1.4), age, dir, size: 1, alpha: 1 });
      } else {
        // Petit rebond : le boulet repart un peu plus loin, en retombant.
        const q = (age - FLIGHT.boulet) / FLIGHT.rebond;
        const ux = (to[0] - m.x) / len;
        const uy = (to[1] - m.y) / len;
        out.boulet.push({ kind: 'boulet', x: to[0] + ux * q * 3, y: to[1] + uy * q * 3, z: 0.45 * 4 * q * (1 - q), age, dir, size: 1, alpha: 1 });
      }
    }
    if (weapon === 'canon' && age < 0.3) return age < 0.06 ? age / 0.06 : 1 - (age - 0.06) / 0.24;
  }
  return 0;
}

/**
 * Positions de toutes les figurines à l'instant t (secondes à vitesse ×1), avec leur pose et les effets de tir.
 * `factions` : peuple de chaque armée (index de step.armies) ; il décide qui porte une arme à feu.
 */
export function stateAt(scenario: BattleScenario, scale: number, t: number, factions?: (Faction | undefined)[]): BattleFrame {
  const c = compile(scenario);
  const time = clamp(Number.isFinite(t) ? t : 0, 0, c.duration);
  const figures: BattleFigure[] = [];
  const fx: Buckets = { eclair: [], boulet: [], fleche: [], fumee: [] };
  let phase = 0;
  let progress = 0;
  for (const u of scenario.units) {
    const keys = c.keys.get(u.id)!;
    const n = figureCount(u, scale);
    const camp = c.facing.get(u.army) ?? 1;
    const slots = layoutOf(u.formation, n, camp, u.kind);
    const cur = unitAt(keys, time);
    const thr = deathThresholds(u.id, n);
    const ka = keyAt(keys, time);
    phase = ka.index;
    progress = ka.p;
    const weapon = weaponOf(u.kind, factions?.[u.army]);
    const wf = weapon ? WEAPON_FX[weapon] : null;
    const reload = wf ? wf.reload[0] + hash01(`${u.id}r`) * wf.reload[1] : 0;
    const everFires = !!weapon && keys.some((k) => k.state === 'combat' || k.action === 'feinte');
    const maxLife = wf ? Math.max(wf.smokeLife, weapon === 'arc' ? FLIGHT.fleche : 0, weapon === 'canon' ? FLIGHT.boulet + FLIGHT.rebond : 0) : 0;
    const mounted = isMounted(u.kind);
    const mountedArcher = mounted && weapon === 'arc';
    const lift = mounted ? (MOUNT_LIFT[u.kind] ?? 0) : 0;
    const bulgeK = u.formation === 'croissant' ? bulgeFactor(keys, ka, camp) : 1;
    const back = cur.action === 'feinte' && cur.state !== 'fuite';
    for (let i = 0; i < n; i++) {
      const slot = slots[i]!;
      const jx = (hash01(`${u.id}x${i}`) - 0.5) * 0.7;
      const jy = (hash01(`${u.id}y${i}`) - 0.5) * 0.7;
      const dx = slot.dx + (slot.bulge ?? 0) * bulgeK;
      const dy = slot.dy;
      const fid = `${u.id}#${i}`;
      let center: { x: number; y: number } = cur;
      let state: FigureState = back ? 'marche' : cur.state;
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
      const { dir, aim } = orient(cur.action, cur.state, slot.dir, mountedArcher);
      let pose: FigurePose = 'marche';
      let recoil = 0;
      let firing = false;
      // Dans un tercio, seules les manches tirent ; les piquiers ne font que baisser leur pique.
      if (weapon && wf && everFires && (u.formation !== 'tercio' || slot.role === 'tir')) {
        const cyc = cycleOf(weapon, u, fid, slot.rank, reload);
        // Coups récents (pour la fumée, les boulets, les flèches) : ceux dont le début est dans la fenêtre de vie.
        const base = time + cyc.off - cyc.vise;
        for (let k = Math.ceil((base - maxLife) / cyc.total); k <= Math.floor(base / cyc.total); k++) {
          const ts = k * cyc.total - cyc.off + cyc.vise;
          if (ts < 0 || !canFireAt(keys, thr[i]!, ts, weapon, mountedArcher)) continue;
          const at = unitAt(keys, ts);
          const origin = { x: clamp(at.x + dx + jx, 0, TERRAIN_W), y: clamp(at.y + dy + jy, 0, TERRAIN_H) };
          const o = orient(at.action, at.state, slot.dir, mountedArcher);
          recoil = Math.max(recoil, shotEffects(fx, scenario, c, u, weapon, fid, k, ts, time, origin, o.aim, lift));
        }
        if (alive && weapon !== 'bordee' && mayFire(cur, weapon, mountedArcher)) {
          firing = true;
          const tau = (time + cyc.off) % cyc.total;
          pose = tau < cyc.vise ? 'vise' : tau < cyc.vise + cyc.tir ? 'tir' : 'recharge';
        }
      }
      if (alive && !firing) {
        if (slot.lance) {
          // Arme longue : sarisse baissée (phalange, rangs 1 à 5), pique baissée seulement au combat (tercio).
          const lowered = slot.lance === 'basse' ? cur.state !== 'fuite' : slot.lance === 'combat' ? cur.state === 'combat' && !back : false;
          pose = lowered ? 'baionnette' : 'marche';
        } else if (cur.state === 'combat' && !back && u.kind !== 'artillerie' && (!weapon || cur.action === 'baionnette')) {
          // Mêlée : unités sans tir, ou action « baionnette » ; la cavalerie à l'arrêt brandit le sabre, en charge elle couche la lance.
          pose = isMounted(u.kind) && cur.action !== 'baionnette' && cur.speed < STILL ? 'vise' : 'baionnette';
        }
      }
      const gallop = alive && (mounted ? cur.moving : !firing && (cur.moving || state === 'combat'));
      const frame = gallop ? ((Math.floor(time * 4 + hash01(`${u.id}f${i}`) * 2) & 1) as 0 | 1) : 0;
      figures.push({
        id: fid,
        unit: u.id,
        army: u.army,
        kind: u.kind,
        x: clamp(center.x + dx + jx, 0, TERRAIN_W),
        y: clamp(center.y + dy + jy, 0, TERRAIN_H),
        state,
        frame,
        facing: dir,
        aim,
        rank: slot.rank,
        role: slot.role,
        pike: !!slot.lance,
        roof: alive && !!slot.toit,
        ship: slot.ship === undefined ? undefined : `${u.id}~${slot.ship}`,
        idle: (mounted || u.kind === 'navires' || u.kind === 'brulots') && !cur.moving,
        pose,
        weapon: weapon ?? null,
        recoil,
      });
    }
  }
  const effects = [...fx.eclair, ...fx.boulet, ...fx.fleche, ...fx.fumee].slice(0, MAX_EFFECTS);
  return { figures, effects, phase, progress, t: time };
}

/** Début (en secondes) de la phase i. */
export function phaseStart(scenario: BattleScenario, i: number): number {
  return compile(scenario).starts[i] ?? 0;
}
