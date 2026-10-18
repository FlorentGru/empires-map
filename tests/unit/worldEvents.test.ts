import { describe, expect, it } from 'vitest';
import { activeDisasters, activeRoutes, cumulative, disastersBetween, formatDeaths, pointAlong, spreadUpTo } from '../../src/lib/worldEvents';
import type { TradeRoute } from '../../src/types-route';
import type { Disaster } from '../../src/types-disaster';

const route = (id: string, from: number, to: number) =>
  ({
    id,
    from,
    to,
    path: [
      [0, 0],
      [10, 0],
    ],
  }) as TradeRoute;
const peste = {
  id: 'peste-noire',
  kind: 'epidemie',
  start: 1346,
  end: 1353,
  spread: [
    { year: 1346, points: [[35.4, 45.0]] },
    {
      year: 1347,
      points: [
        [28.9, 41.0],
        [15.5, 38.2],
      ],
    },
    { year: 1348, points: [[2.35, 48.85]] },
  ],
} as Disaster;

describe('routes et catastrophes actives', () => {
  it('filtre par année', () => {
    expect(activeRoutes([route('soie-han', -130, 220), route('hanse', 1250, 1669)], 117).map((r) => r.id)).toEqual(['soie-han']);
    expect(activeRoutes([route('a', 100, 200)], 200)).toHaveLength(0);
    expect(activeDisasters([peste], 1350)).toHaveLength(1);
    expect(activeDisasters([peste], 1354)).toHaveLength(0);
    expect(disastersBetween([peste], 1300, 1346)).toHaveLength(1);
  });

  it('cumule la diffusion jusqu’à l’année, la vague la plus récente en premier', () => {
    expect(spreadUpTo(peste, 1345)).toHaveLength(0);
    const s = spreadUpTo(peste, 1347);
    expect(s).toHaveLength(3);
    expect(s.find((p) => p.year === 1347)?.age).toBe(0);
    expect(s.find((p) => p.year === 1346)?.age).toBe(1);
  });
});

describe('déplacement le long d’un tracé', () => {
  const path: [number, number][] = [
    [0, 0],
    [10, 0],
    [10, 10],
  ];
  const cum = cumulative(path);
  it('mesure et interpole', () => {
    expect(cum[1]).toBeCloseTo(1112, -1);
    expect(pointAlong(path, cum, 0).at).toEqual([0, 0]);
    expect(pointAlong(path, cum, 0.25).at[0]).toBeCloseTo(5, 0);
    expect(pointAlong(path, cum, 1).at).toEqual([10, 10]);
    expect(pointAlong(path, cum, 0.1).east).toBe(true);
  });
});

describe('format des morts', () => {
  it('arrondit lisiblement', () => {
    expect(formatDeaths(50_000_000)).toBe('≈ 50 M morts');
    expect(formatDeaths(830_000).replace(/\s/g, ' ')).toBe('≈ 830 000 morts');
    expect(formatDeaths(36_417).replace(/\s/g, ' ')).toBe('≈ 36 000 morts');
  });
});

import { convexHull } from '../../src/lib/worldEvents';
describe('enveloppe convexe', () => {
  it('ignore les points intérieurs et ferme l’anneau', () => {
    const h = convexHull([
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
      [2, 2],
      [1, 3],
    ]);
    expect(h).toHaveLength(5);
    expect(h[0]).toEqual(h[4]);
    expect(h).not.toContainEqual([2, 2]);
  });
});

import { nearestStepIndex } from '../../src/lib/worldEvents';
describe('étape la plus proche', () => {
  it('choisit l’étape la plus proche de l’année', () => {
    const steps = [{ year: 1206 }, { year: 1241 }, { year: 1346 }];
    expect(nearestStepIndex(steps, 1347)).toBe(2);
    expect(nearestStepIndex(steps, 1220)).toBe(0);
    expect(nearestStepIndex([], 1)).toBe(-1);
  });
});

import { lanes } from '../../src/lib/worldEvents';
describe('lignes de la frise', () => {
  it('sépare les intervalles qui se chevauchent', () => {
    const a = { start: 1206, end: 1368 };
    const b = { start: 1337, end: 1453 };
    const c = { start: 1400, end: 1410 };
    const l = lanes([a, b, c]);
    expect(l.get(a)).toBe(0);
    expect(l.get(b)).toBe(1);
    expect(l.get(c)).toBe(0);
  });
});
