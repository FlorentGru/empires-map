import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';
import { durationOf, figuresOf, genericScenario, MAX_FIGURES, scaleFor, stateAt, TERRAIN_H, TERRAIN_W, totalTroops } from '../../src/battle/engine';
import type { BattleScenario, BattleTroopsFile } from '../../src/types-battle';
import type { ArmyMove } from '../../src/types';
import { DATA, itAll, readJson } from '../data/helpers';

const army = (side: string, winner?: boolean): ArmyMove => ({
  side,
  faction: 'romains',
  path: [
    [0, 0],
    [1, 1],
  ],
  winner,
});

const two = { armies: [army('Rome', true), army('Carthage', false)] };
const three = { armies: [army('A', false), army('B', true), army('C', true)] };

/** Armées perdantes d'un faux step. */
const losers = (s: { armies: ArmyMove[] }) => s.armies.map((a, i) => (a.winner === false ? i : -1)).filter((i) => i >= 0);

function checkRun(sc: BattleScenario, scale: number) {
  const d = durationOf(sc);
  for (let t = 0; t <= d + 0.01; t += d / 40) {
    const f = stateAt(sc, scale, t);
    for (const g of f.figures) {
      if (![g.x, g.y].every(Number.isFinite)) throw new Error(`NaN à t=${t} (${g.id})`);
    }
    if (!Number.isFinite(f.progress) || f.phase < 0 || f.phase >= sc.phases.length) throw new Error(`phase invalide à t=${t}`);
  }
}

describe('moteur de bataille', () => {
  it('scénario générique à 2 armées : valide', () => {
    const sc = genericScenario(two, [40000, 30000]);
    expect(sc.phases).toHaveLength(4);
    expect(sc.units).toHaveLength(6);
    expect(durationOf(sc)).toBeCloseTo(16, 5);
    expect(totalTroops(sc)).toBe(70000);
    const ids = new Set(sc.units.map((u) => u.id));
    expect(ids.size).toBe(6);
    for (const p of sc.phases) for (const id of Object.keys(p.moves)) expect(ids.has(id)).toBe(true);
  });

  it('3 armées : vainqueurs contre les autres, camps distincts', () => {
    const sc = genericScenario(three, [10000, 20000, 15000]);
    expect(sc.units).toHaveLength(9);
    const side = (a: number) => (sc.units.find((u) => u.army === a)!.at[0] < 50 ? 'g' : 'd');
    expect(side(1)).toBe(side(2));
    expect(side(0)).not.toBe(side(1));
    checkRun(sc, scaleFor(totalTroops(sc)));
  });

  it.each([20000, 300000])('au plus %i hommes -> au plus 200 figurines', (n) => {
    const sc = genericScenario(two, [n * 0.6, n * 0.4]);
    const scale = scaleFor(totalTroops(sc));
    const count = figuresOf(sc, scale).reduce((a, b) => a + b, 0);
    expect(count).toBeLessThanOrEqual(MAX_FIGURES);
    expect(stateAt(sc, scale, 5).figures).toHaveLength(count);
  });

  it('scaleFor : palier connu, au moins ~40 figurines quand c’est possible', () => {
    for (const total of [3000, 20000, 90000, 150000]) {
      const s = scaleFor(total);
      expect([50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000]).toContain(s);
      expect(total / s).toBeGreaterThanOrEqual(40);
    }
  });

  it('rapport de figurines entre camps ≈ rapport des effectifs', () => {
    const sc = genericScenario(two, [60000, 20000]);
    const scale = scaleFor(totalTroops(sc));
    const counts = figuresOf(sc, scale);
    const byArmy = [0, 0];
    sc.units.forEach((u, i) => (byArmy[u.army]! += counts[i]!));
    const expected = [60000, 20000].map((n) => n / scale);
    expect(Math.abs(byArmy[0]! - expected[0]!)).toBeLessThanOrEqual(3);
    expect(Math.abs(byArmy[1]! - expected[1]!)).toBeLessThanOrEqual(3);
  });

  it('à la fin, le perdant est en fuite ou mort', () => {
    for (const step of [two, three]) {
      const sc = genericScenario(
        step,
        step.armies.map(() => 20000),
      );
      const f = stateAt(sc, scaleFor(totalTroops(sc)), durationOf(sc));
      const lost = losers(step);
      const figs = f.figures.filter((g) => lost.includes(g.army));
      expect(figs.length).toBeGreaterThan(0);
      for (const g of figs) expect(['fuite', 'mort']).toContain(g.state);
      expect(figs.some((g) => g.state === 'mort')).toBe(true);
    }
  });

  it('déterministe, positions dans le terrain', () => {
    const sc = genericScenario(two, [50000, 40000]);
    const scale = scaleFor(totalTroops(sc));
    for (const t of [0, 3.3, 7, 12.5, 16]) {
      const a = stateAt(sc, scale, t);
      expect(stateAt(sc, scale, t)).toEqual(a);
      for (const g of a.figures) {
        expect(g.x).toBeGreaterThanOrEqual(0);
        expect(g.x).toBeLessThanOrEqual(TERRAIN_W);
        expect(g.y).toBeGreaterThanOrEqual(0);
        expect(g.y).toBeLessThanOrEqual(TERRAIN_H);
      }
    }
  });

  it('les morts restent au sol (ne bougent plus)', () => {
    const sc = genericScenario(two, [50000, 40000]);
    const scale = scaleFor(totalTroops(sc));
    const mid = stateAt(sc, scale, 12).figures.filter((g) => g.state === 'mort');
    const end = new Map(stateAt(sc, scale, 16).figures.map((g) => [g.id, g]));
    expect(mid.length).toBeGreaterThan(0);
    for (const g of mid) expect(end.get(g.id)).toMatchObject({ x: g.x, y: g.y, state: 'mort' });
  });
});

describe('données de bataille', () => {
  const troops = readJson<BattleTroopsFile>(join(DATA, 'battles', 'troops.json'));
  const stepIds = (key: string) => key.split('/')[1]!;
  const scenarioDir = join(DATA, 'battles', 'scenarios');
  const scenarioIds = new Set(readdirSync(scenarioDir).map((f) => f.replace(/\.json$/, '')));

  itAll('chaque bataille jouable tourne sans NaN (version générique)', Object.entries(troops), (key, t) => {
    const armies = t.troops.map((_: number, i: number) => army(`a${i}`, i === 0));
    const sc = genericScenario({ armies }, t.troops);
    checkRun(sc, scaleFor(totalTroops(sc)));
  });

  itAll('chaque scénario historique tourne sans NaN', [...scenarioIds], (id) => {
    const sc = readJson<BattleScenario>(join(scenarioDir, `${id}.json`));
    const scale = scaleFor(totalTroops(sc));
    checkRun(sc, scale);
    const count = figuresOf(sc, scale).reduce((a, b) => a + b, 0);
    expect(count).toBeLessThanOrEqual(MAX_FIGURES + sc.units.length);
  });

  it('chaque scénario correspond à une bataille jouable', () => {
    const playable = new Set(Object.keys(troops).map(stepIds));
    for (const id of scenarioIds) expect(playable.has(id)).toBe(true);
  });
});
