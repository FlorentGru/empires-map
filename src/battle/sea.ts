/**
 * Mer, marée, tempête : fonctions PURES (aucun canvas), toutes dérivées du temps t du scénario — on peut sauter
 * à un instant sans changer le résultat. Le dessin est dans render.ts et scenery.ts.
 */
import type { BattlePoint, BattleScenario } from '../types-battle';
import { durationOf, phaseStart } from './engine';
import { pointInPolygon } from './layout';

const smooth = (p: number) => {
  const q = Math.min(1, Math.max(0, p));
  return q * q * (3 - 2 * q);
};

/** Durée (secondes) de la transition de marée au début d'une phase qui change le niveau de l'eau. */
const TIDE_RAMP = 3;

/** Le scénario décrit-il une marée (au moins une phase avec `tide`) ? */
export const hasTide = (sc: BattleScenario): boolean => sc.phases.some((p) => p.tide !== undefined);

/**
 * Niveau de l'eau à l'instant t : 1 = marée haute, 0 = marée basse. Une phase sans `tide` garde le niveau précédent
 * (haute au départ) ; le passage d'un niveau à l'autre est lissé sur les premières secondes de la phase.
 */
export function tideAt(sc: BattleScenario, t: number): number {
  if (!hasTide(sc)) return 1;
  const target: number[] = [];
  sc.phases.forEach((p, i) => target.push(p.tide === 'basse' ? 0 : p.tide === 'haute' ? 1 : (target[i - 1] ?? 1)));
  const tt = Math.min(Math.max(0, t), durationOf(sc));
  let i = sc.phases.length - 1;
  while (i > 0 && phaseStart(sc, i) > tt) i--;
  const from = i > 0 ? target[i - 1]! : target[0]!;
  const ramp = Math.min(TIDE_RAMP, sc.phases[i]!.duration * 0.6);
  const k = ramp > 0 ? smooth((tt - phaseStart(sc, i)) / ramp) : 1;
  return from + (target[i]! - from) * k;
}

/** Visibilité des pieux (0,08 à 1) : pointes à peine sous la surface à marée haute, pleinement dressés à marée basse. */
export const stakeVisibility = (level: number): number => 0.08 + 0.92 * smooth((1 - level) * 1.25);

/** Inclinaison (radians) d'un navire pris sur les pieux à marée basse ; 0 s'il est hors des pieux ou si l'eau est haute. */
export function stakeTilt(level: number, onStakes: boolean, h: number): number {
  if (!onStakes) return 0;
  const k = smooth((0.65 - level) / 0.65);
  return (h < 0.5 ? -1 : 1) * 0.2 * k;
}

/** Le navire est-il sur une zone de pieux du décor ? */
export function onStakes(sc: BattleScenario, p: BattlePoint): boolean {
  return (sc.decor ?? []).some((d) => d.kind === 'pieux' && d.points.length >= 3 && pointInPolygon(d.points, p[0], p[1]));
}

/** Grosse mer : multiplicateur du tangage et du gonflement des voiles. */
export const swayFactor = (w: BattleScenario['weather']): number => (w === 'tempete' ? 4.5 : w === 'vent' ? 1.8 : 1);
export const windFactorOf = (w: BattleScenario['weather']): number => (w === 'tempete' ? 2.2 : w === 'vent' ? 1.6 : 1);

/** Dans la tempête, une coque dont l'équipage est tombé chavire avant de sombrer ; sinon elle coule à plat. */
export const wreckStyle = (sc: BattleScenario): 'chavire' | 'coule' => (sc.weather === 'tempete' ? 'chavire' : 'coule');

/** Durée du chavirement (secondes). */
const CAPSIZE = 2.2;

/**
 * État d'une coque dont l'équipage est tombé à l'instant `diedAt` : `roll` (radians, rotation), `sink` (0 à 1, enfoncement),
 * `masts` (mâture encore debout), `fade` (opacité de la coque qui s'enfonce). Hors tempête, la coque coule à plat tout de suite, sans mâture.
 */
export function wreckState(sc: BattleScenario, diedAt: number, t: number, sign: 1 | -1): { roll: number; sink: number; masts: boolean; fade: number } {
  if (wreckStyle(sc) === 'coule') return { roll: 0, sink: 1, masts: false, fade: 1 };
  const p = Math.min(1, Math.max(0, (t - diedAt) / CAPSIZE));
  // Après le chavirement, la coque retournée s'enfonce et s'estompe peu à peu.
  const fade = 1 - 0.6 * smooth((t - diedAt - CAPSIZE) / 6);
  return { roll: sign * smooth(p) * 2.7, sink: smooth(p), masts: p < 0.5, fade };
}

/** Un point [x, y] du terrain pour chaque pieu planté dans les polygones `pieux` du décor, en rangées serrées (déterministe). */
export function stakePoints(poly: BattlePoint[], hash: (s: string) => number, seed: string): { x: number; y: number; h: number }[] {
  if (poly.length < 3) return [];
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const out: { x: number; y: number; h: number }[] = [];
  const step = 1.9;
  for (let y = Math.min(...ys); y <= Math.max(...ys); y += step) {
    for (let x = Math.min(...xs); x <= Math.max(...xs); x += step) {
      const jx = x + (hash(`${seed}x${x.toFixed(1)}${y.toFixed(1)}`) - 0.5) * 0.9;
      const jy = y + (hash(`${seed}y${x.toFixed(1)}${y.toFixed(1)}`) - 0.5) * 0.9;
      if (pointInPolygon(poly, jx, jy)) out.push({ x: jx, y: jy, h: 0.8 + hash(`${seed}h${x.toFixed(1)}${y.toFixed(1)}`) * 0.5 });
    }
  }
  return out.slice(0, 260);
}
