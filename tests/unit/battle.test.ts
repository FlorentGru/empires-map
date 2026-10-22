import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';
import {
  durationOf,
  figuresOf,
  genericScenario,
  MAX_EFFECTS,
  MAX_FIGURES,
  scaleFor,
  stateAt,
  TERRAIN_H,
  TERRAIN_W,
  totalTroops,
} from '../../src/battle/engine';
import { AVOID_START, sceneryLayout } from '../../src/battle/layout';
import { firearmOf, isRanged } from '../../src/battle/weapons';
import { weaponClass } from '../../src/battle/poses';
import { SOLDIER_SPECS } from '../../src/figures/soldiers';
import type { Faction } from '../../src/types';
import type { BattleBiome, BattleScenario, BattleTroopsFile } from '../../src/types-battle';
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

/** Deux unités face à face : l'une tire (à l'arrêt) pendant 20 s, l'autre est une cible. */
const duel = (
  kind: 'infanterie' | 'archers' | 'artillerie',
  move: Partial<BattleScenario['phases'][0]['moves'][string]> = {},
  to: [number, number] = [30, 30],
): BattleScenario => ({
  terrain: 'plaine',
  units: [
    { id: 'tireur', army: 0, kind, troops: 2000, at: [30, 30], formation: 'ligne' },
    { id: 'cible', army: 1, kind: 'infanterie', troops: 2000, at: [60, 30], formation: 'ligne' },
  ],
  phases: [{ label: 'x', duration: 40, moves: { tireur: { state: 'combat', to, ...move }, cible: { state: 'combat' } } }],
});
const FUSILIERS: (Faction | undefined)[] = ['francais', 'romains']; // la cible (armée 1) ne tire pas

describe('armes et tirs', () => {
  it('firearmOf / isRanged', () => {
    expect(firearmOf('francais')).toBe('fusil');
    expect(firearmOf('tercios')).toBe('arquebuse');
    expect(firearmOf('romains')).toBeNull();
    expect(isRanged({ kind: 'archers' }, 'romains')).toBe(true);
    expect(isRanged({ kind: 'infanterie' }, 'romains')).toBe(false);
    expect(isRanged({ kind: 'infanterie' }, 'britanniques')).toBe(true);
  });

  it('la liste des factions à fusil / arquebuse correspond aux dessins', () => {
    for (const [f, spec] of Object.entries(SOLDIER_SPECS)) {
      const cls = weaponClass(spec.weapon);
      const expected = cls === 'fusil' ? 'fusil' : cls === 'arquebuse' ? 'arquebuse' : null;
      expect(firearmOf(f as Faction), f).toBe(expected);
    }
  });

  it('une unité à fusil au combat passe par vise, tir, recharge et produit de la fumée', () => {
    const sc = duel('infanterie');
    const scale = scaleFor(totalTroops(sc));
    const poses = new Set<string>();
    const kinds = new Set<string>();
    for (let t = 0; t < 30; t += 0.05) {
      const f = stateAt(sc, scale, t, FUSILIERS);
      for (const g of f.figures.filter((g) => g.unit === 'tireur')) poses.add(g.pose);
      for (const e of f.effects) kinds.add(e.kind);
    }
    expect([...poses].sort()).toEqual(['recharge', 'tir', 'vise']);
    expect(kinds.has('fumee')).toBe(true);
    expect(kinds.has('eclair')).toBe(true);
  });

  it('les figurines ne sont pas synchrones (décalage par figurine et par rang)', () => {
    const sc = duel('infanterie');
    const scale = scaleFor(totalTroops(sc));
    const f = stateAt(sc, scale, 12.3, FUSILIERS).figures.filter((g) => g.unit === 'tireur');
    expect(new Set(f.map((g) => g.pose)).size).toBeGreaterThan(1);
  });

  it('déterministe : poses et effets identiques pour un même t, même après un saut', () => {
    const sc = duel('artillerie');
    const scale = scaleFor(totalTroops(sc));
    const a = stateAt(sc, scale, 17.7, FUSILIERS);
    stateAt(sc, scale, 3, FUSILIERS);
    stateAt(sc, scale, 25, FUSILIERS);
    expect(stateAt(sc, scale, 17.7, FUSILIERS)).toEqual(a);
  });

  it('en mouvement, pas de tir : pose marche et aucun effet', () => {
    const sc = duel('infanterie', {}, [55, 30]);
    const scale = scaleFor(totalTroops(sc));
    const f = stateAt(sc, scale, 20, FUSILIERS); // mi-course, en pleine vitesse
    for (const g of f.figures.filter((g) => g.unit === 'tireur')) expect(g.pose).toBe('marche');
    expect(f.effects).toHaveLength(0);
  });

  it('action baionnette : pose baionnette, pas de tir ; unité sans arme à feu au combat : idem', () => {
    const bay = duel('infanterie', { action: 'baionnette' });
    let f = stateAt(bay, scaleFor(totalTroops(bay)), 10, FUSILIERS);
    for (const g of f.figures.filter((g) => g.unit === 'tireur')) expect(g.pose).toBe('baionnette');
    expect(f.effects).toHaveLength(0);
    const romains = duel('infanterie');
    f = stateAt(romains, scaleFor(totalTroops(romains)), 10, ['romains', 'romains']);
    for (const g of f.figures) expect(g.pose).toBe('baionnette');
    expect(f.effects).toHaveLength(0);
  });

  it('l’artillerie tire des boulets, avec recul de la pièce ; les archers des flèches', () => {
    const sc = duel('artillerie');
    const scale = scaleFor(totalTroops(sc));
    let boulet = 0;
    let recul = 0;
    for (let t = 0; t < 30; t += 0.05) {
      const f = stateAt(sc, scale, t, FUSILIERS);
      boulet += f.effects.filter((e) => e.kind === 'boulet').length;
      recul = Math.max(recul, ...f.figures.map((g) => g.recoil));
    }
    expect(boulet).toBeGreaterThan(0);
    expect(recul).toBeGreaterThan(0.5);
    const arc = duel('archers');
    let fleches = 0;
    for (let t = 0; t < 30; t += 0.05) fleches += stateAt(arc, scaleFor(totalTroops(arc)), t).effects.filter((e) => e.kind === 'fleche' && e.tail).length;
    expect(fleches).toBeGreaterThan(0);
  });

  it('au plus MAX_EFFECTS effets, même avec une grosse armée', () => {
    const sc = duel('infanterie');
    sc.units[0]!.troops = 40000;
    sc.units[1]!.troops = 40000;
    const scale = scaleFor(totalTroops(sc));
    for (let t = 0; t < 30; t += 0.7) expect(stateAt(sc, scale, t, FUSILIERS).effects.length).toBeLessThanOrEqual(MAX_EFFECTS);
  });

  it('scénario générique ≥ 1500 avec arme à feu : batterie d’artillerie qui tire', () => {
    const step = {
      year: 1805,
      armies: [
        { ...army('France', true), faction: 'francais' as Faction },
        { ...army('Autriche', false), faction: 'autrichiens' as Faction },
      ],
    };
    const sc = genericScenario(step, [60000, 50000]);
    const guns = sc.units.filter((u) => u.kind === 'artillerie');
    expect(guns).toHaveLength(2);
    const scale = scaleFor(totalTroops(sc));
    let boulets = 0;
    for (let t = 0; t <= durationOf(sc); t += 0.1)
      boulets += stateAt(sc, scale, t, ['francais', 'autrichiens']).effects.filter((e) => e.kind === 'boulet').length;
    expect(boulets).toBeGreaterThan(0);
    checkRun(sc, scale);
    // avant 1500 ou sans arme à feu : pas d'artillerie
    expect(genericScenario({ ...step, year: 1400 }, [60000, 50000]).units.some((u) => u.kind === 'artillerie')).toBe(false);
    expect(genericScenario(two, [60000, 50000]).units.some((u) => u.kind === 'artillerie')).toBe(false);
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

describe('paysage (layout.ts)', () => {
  const BIOMES: BattleBiome[] = ['prairie', 'steppe', 'desert', 'foret', 'montagne', 'mediterranee', 'mer'];
  const generic = () => genericScenario({ armies: [army('A', true), army('B')], year: 1800 }, [20000, 15000]);
  const withDecor = (): BattleScenario => ({
    ...generic(),
    decor: [
      {
        kind: 'riviere',
        points: [
          [10, 5],
          [40, 30],
          [90, 40],
        ],
      },
      {
        kind: 'foret',
        points: [
          [60, 5],
          [90, 5],
          [90, 20],
          [60, 20],
        ],
      },
      {
        kind: 'village',
        points: [
          [20, 40],
          [35, 40],
          [35, 52],
          [20, 52],
        ],
        label: 'Hameau',
      },
    ],
  });
  const inBounds = (x: number, y: number) => x >= 0 && x <= TERRAIN_W && y >= 0 && y <= TERRAIN_H;

  it('est déterministe', () => {
    for (const b of BIOMES) expect(sceneryLayout(withDecor(), b)).toEqual(sceneryLayout(withDecor(), b));
  });

  it('garde tous les éléments dans le terrain et borne le décor généré', () => {
    for (const b of BIOMES) {
      for (const sc of [generic(), withDecor()]) {
        const l = sceneryLayout(sc, b);
        for (const e of [...l.trees, ...l.houses, ...l.rocks]) expect(inBounds(e.x, e.y)).toBe(true);
        for (const s of l.shapes) for (const [x, y] of s.points) expect(inBounds(x, y)).toBe(true);
        expect(l.generated).toBeLessThanOrEqual(60);
      }
    }
  });

  it('ne génère rien près des positions de départ des unités', () => {
    for (const b of BIOMES) {
      const sc = generic();
      const l = sceneryLayout(sc, b);
      const gen: [number, number][] = [...l.trees.filter((t) => t.gen), ...l.rocks.filter((r) => r.gen)].map((e) => [e.x, e.y]);
      for (const s of l.shapes.filter((s) => s.gen)) for (const p of s.points) gen.push(p);
      for (const [x, y] of gen) for (const u of sc.units) expect(Math.hypot(x - u.at[0], y - u.at[1])).toBeGreaterThanOrEqual(AVOID_START);
    }
  });

  it('chaque biome produit une mise en page, et le décor du scénario devient arbres et maisons', () => {
    for (const b of BIOMES) expect(sceneryLayout(generic(), b)).toBeTruthy();
    const l = sceneryLayout(withDecor(), 'prairie');
    expect(l.trees.length).toBeGreaterThan(5);
    expect(l.houses.length).toBeGreaterThanOrEqual(4);
    expect(sceneryLayout(generic(), 'prairie').generated).toBeGreaterThan(0);
    expect(sceneryLayout(generic(), 'mer').generated).toBe(0);
  });
});
