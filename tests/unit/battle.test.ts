import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';
import {
  durationOf,
  figuresOf,
  genericScenario,
  hash01,
  MAX_EFFECTS,
  MAX_FIGURES,
  scaleFor,
  stateAt,
  TERRAIN_H,
  TERRAIN_W,
  totalTroops,
} from '../../src/battle/engine';
import { layoutOf } from '../../src/battle/formations';
import { AVOID_START, sceneryLayout } from '../../src/battle/layout';
import { firearmOf, isRanged, shipOf, weaponOf } from '../../src/battle/weapons';
import { onStakes, stakePoints, stakeTilt, stakeVisibility, tideAt, wreckState, wreckStyle } from '../../src/battle/sea';
import { weaponClass } from '../../src/battle/poses';
import { SOLDIER_SPECS } from '../../src/figures/soldiers';
import type { Faction } from '../../src/types';
import type { BattleBiome, BattleFormation, BattleMove, BattleScenario, BattleTroopsFile, BattleUnitKind } from '../../src/types-battle';
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

/** Un bloc à gauche (kind, formation) face à une cible d'infanterie à droite, une phase par entrée de `moves`. */
const solo = (kind: BattleUnitKind, formation: BattleFormation, moves: BattleMove[], troops = 3000): BattleScenario => ({
  terrain: 'plaine',
  units: [
    { id: 'bloc', army: 0, kind, troops, at: [25, 30], formation },
    { id: 'cible', army: 1, kind: 'infanterie', troops: 2000, at: [75, 30], formation: 'ligne' },
  ],
  phases: moves.map((m, i) => ({ label: `p${i}`, duration: 10, moves: { bloc: m, cible: { state: 'combat' } } })),
});
const figsOf = (sc: BattleScenario, t: number, factions?: (Faction | undefined)[]) => {
  const f = stateAt(sc, scaleFor(totalTroops(sc)), t, factions);
  return f.figures.filter((g) => g.unit === 'bloc');
};
const ALL_FORMATIONS: BattleFormation[] = [
  'ligne',
  'mince',
  'colonne',
  'carre',
  'coin',
  'phalange',
  'tortue',
  'quinconce',
  'tercio',
  'croissant',
  'tirailleurs',
];

describe('formations historiques', () => {
  it('dispositions déterministes, et le nombre de figurines ne dépend pas de la formation', () => {
    for (const f of ALL_FORMATIONS) {
      for (const n of [1, 3, 7, 24, 61, 120]) {
        expect(layoutOf(f, n, 1, 'infanterie'), `${f} ${n}`).toHaveLength(n);
        expect(layoutOf(f, n, -1, 'cavalerie')).toEqual(layoutOf(f, n, -1, 'cavalerie'));
        for (const sl of layoutOf(f, n, 1, 'infanterie')) expect([sl.dx, sl.dy].every(Number.isFinite)).toBe(true);
      }
      const sc = solo('infanterie', f, [{ state: 'marche', to: [40, 30] }]);
      expect(figsOf(sc, 5)).toHaveLength(figuresOf(sc, scaleFor(totalTroops(sc)))[0]!);
      expect(figsOf(sc, 5)).toEqual(figsOf(sc, 5));
    }
  });

  it('carré : chaque face regarde vers l’extérieur (avant, arrière, côtés en miroir)', () => {
    for (const facing of [1, -1] as const) {
      const slots = layoutOf('carre', 40, facing);
      const ext = Math.max(...slots.map((s) => Math.abs(s.dx)));
      const extY = Math.max(...slots.map((s) => Math.abs(s.dy)));
      const front = slots.filter((s) => s.dx * facing >= ext - 1e-6);
      const back = slots.filter((s) => s.dx * facing <= -ext + 1e-6);
      const top = slots.filter((s) => s.dy <= -extY + 1e-6 && Math.abs(s.dx) < ext - 1e-6);
      const bottom = slots.filter((s) => s.dy >= extY - 1e-6 && Math.abs(s.dx) < ext - 1e-6);
      expect(front.length).toBeGreaterThan(2);
      expect(back.length).toBeGreaterThan(2);
      for (const s of front) expect(s.dir).toBe(facing);
      for (const s of back) expect(s.dir).toBe(-facing);
      expect(new Set(top.map((s) => s.dir)).size).toBe(1);
      expect(new Set(bottom.map((s) => s.dir)).size).toBe(1);
      expect(top[0]!.dir).toBe(-bottom[0]!.dir);
      // creux : rien au centre
      expect(slots.every((s) => Math.abs(s.dx) > 0.5 || Math.abs(s.dy) > 3)).toBe(true);
    }
    // en jeu : le camp de droite (facing -1) a bien des figurines retournées
    const sc = solo('infanterie', 'carre', [{ state: 'marche' }]);
    sc.units[0]!.at = [80, 30];
    sc.units[1]!.at = [20, 30];
    expect(new Set(figsOf(sc, 1).map((g) => g.facing))).toEqual(new Set([1, -1]));
  });

  it('phalange : sarisses baissées sur les 5 premiers rangs, levées derrière, en marche comme au combat', () => {
    const sc = solo('infanterie', 'phalange', [{ state: 'marche', to: [40, 30] }, { state: 'combat' }], 4000);
    for (const t of [3, 15]) {
      const figs = figsOf(sc, t, ['grecs-macedoniens', 'romains']);
      expect(Math.max(...figs.map((g) => g.rank))).toBeGreaterThan(8);
      for (const g of figs) {
        expect(g.pike).toBe(true);
        expect(g.pose, `rang ${g.rank} à t=${t}`).toBe(g.rank < 5 ? 'baionnette' : 'marche');
      }
    }
  });

  it('tortue : toit de boucliers sur les rangs intérieurs seulement', () => {
    const figs = figsOf(solo('infanterie', 'tortue', [{ state: 'marche' }], 4000), 1);
    expect(figs.some((g) => g.roof)).toBe(true);
    for (const g of figs.filter((g) => g.rank === 0)) expect(g.roof).toBe(false);
  });

  it('tercio : seules les figurines des manches (aux coins) tirent, les piquiers baissent la pique au combat', () => {
    const slots = layoutOf('tercio', 60, 1);
    const pikes = slots.filter((s) => s.role === 'pique');
    const shots = slots.filter((s) => s.role === 'tir');
    expect(pikes.length + shots.length).toBe(60);
    expect(shots.length).toBeGreaterThanOrEqual(4);
    const px = Math.max(...pikes.map((s) => Math.abs(s.dx)));
    const py = Math.max(...pikes.map((s) => Math.abs(s.dy)));
    for (const s of shots) {
      expect(Math.abs(s.dx)).toBeGreaterThan(px);
      expect(Math.abs(s.dy)).toBeGreaterThan(py);
    }
    const sc = solo(
      'infanterie',
      'tercio',
      [
        { state: 'marche', to: [30, 30] },
        { state: 'combat', action: 'feu' },
      ],
      4000,
    );
    const f = ['tercios', 'romains'] as (Faction | undefined)[];
    expect(figsOf(sc, 5, f).every((g) => g.pose === 'marche')).toBe(true); // en marche : piques levées
    const seen = new Map<string, Set<string>>();
    for (let t = 10.5; t < 20; t += 0.1) for (const g of figsOf(sc, t, f)) seen.set(g.role!, (seen.get(g.role!) ?? new Set()).add(g.pose));
    expect([...seen.get('pique')!]).toEqual(['baionnette']);
    expect(seen.get('tir')!.has('tir')).toBe(true);
  });

  it('croissant : le centre est avancé, et l’arc s’aplatit quand l’unité recule', () => {
    const sc = solo('infanterie', 'croissant', [{ state: 'combat' }, { state: 'marche', to: [10, 30] }], 4000);
    const bow = (t: number) => {
      const figs = figsOf(sc, t);
      const mid = figs.filter((g) => Math.abs(g.y - 30) < 2);
      const wing = figs.filter((g) => Math.abs(g.y - 30) > 8);
      return mid.reduce((a, g) => a + g.x, 0) / mid.length - wing.reduce((a, g) => a + g.x, 0) / wing.length;
    };
    expect(bow(5)).toBeGreaterThan(1.5);
    expect(bow(19)).toBeLessThan(bow(5) * 0.4);
  });

  it('tirailleurs : beaucoup plus espacés que la ligne', () => {
    const gap = (f: BattleFormation) => {
      const figs = figsOf(solo('infanterie', f, [{ state: 'marche' }], 4000), 0);
      return figs.reduce((a, g) => a + Math.min(...figs.filter((h) => h !== g).map((h) => Math.hypot(h.x - g.x, h.y - g.y))), 0) / figs.length;
    };
    expect(gap('tirailleurs')).toBeGreaterThan(gap('ligne') * 1.5);
  });

  it('navires : équipages répartis par coque', () => {
    const figs = figsOf(solo('navires', 'ligne', [{ state: 'marche' }], 4000), 0);
    expect(new Set(figs.map((g) => g.ship)).size).toBe(Math.ceil(figs.length / 4));
  });
});

describe('montures', () => {
  const charge: BattleMove[] = [{ state: 'combat', to: [60, 30], action: 'feu' }];
  const flights = (kind: BattleUnitKind) => {
    const sc = solo(kind, 'ligne', charge, 2000);
    let n = 0;
    let moving = 0;
    for (let t = 0; t < 10; t += 0.05) {
      const f = stateAt(sc, scaleFor(totalTroops(sc)), t, ['mongols', 'romains']);
      n += f.effects.filter((e) => e.kind === 'fleche').length;
      if (f.figures.some((g) => g.unit === 'bloc' && g.pose === 'vise') && t > 2 && t < 8) moving++;
    }
    return { n, moving };
  };

  it('les archers montés tirent en mouvement, pas la cavalerie', () => {
    const a = flights('archers-montes');
    expect(a.n).toBeGreaterThan(0);
    expect(a.moving).toBeGreaterThan(0); // des poses de visée en pleine course (t entre 2 et 8)
    expect(flights('cavalerie').n).toBe(0);
  });

  it('feinte : dos tourné, aucune perte ajoutée, tir parthe vers l’arrière, puis demi-tour', () => {
    const sc = solo('archers-montes', 'ligne', [
      { state: 'combat', action: 'feinte', to: [10, 30] },
      { state: 'combat', action: 'feu' },
    ]);
    const camp = 1; // le bloc est à gauche : il regarde vers la droite
    let parthe = false;
    for (let t = 0.5; t < 10; t += 0.25) {
      const figs = figsOf(sc, t, ['mongols', 'romains']);
      for (const g of figs) {
        expect(g.facing).toBe(-camp);
        expect(g.state).toBe('marche'); // ni « fuite », ni « mort »
      }
      if (figs.some((g) => g.aim === camp)) parthe = true;
    }
    expect(parthe).toBe(true);
    for (const g of figsOf(sc, 15)) expect(g.facing).toBe(camp);
    // les flèches de la feinte partent vers l'ennemi (la droite), pas vers l'arrière
    const f = stateAt(sc, scaleFor(totalTroops(sc)), 7, ['mongols', 'romains']);
    expect(f.effects.filter((e) => e.kind === 'fleche').every((e) => e.dir === camp)).toBe(true);
  });

  it('les éléphants, chars et brûlots tournent sans NaN et tiennent dans le terrain', () => {
    for (const kind of ['elephants', 'chars', 'brulots', 'navires', 'cavalerie'] as const) {
      const sc = solo(kind, 'ligne', [
        { state: 'marche', to: [50, 30] },
        { state: 'combat', losses: 0.5 },
      ]);
      for (let t = 0; t <= 20; t += 1) for (const g of figsOf(sc, t, ['indiens', 'romains'])) expect([g.x, g.y].every(Number.isFinite)).toBe(true);
    }
  });
});

describe('scénario générique : formations par défaut', () => {
  const gen = (faction: Faction, year?: number, other: Faction = 'romains') =>
    genericScenario(
      {
        armies: [
          { ...army('A', true), faction },
          { ...army('B', false), faction: other },
        ],
        year,
      },
      [30000, 20000],
    );

  it('Macédoniens : phalange (infanterie) et coin (cavalerie)', () => {
    const sc = gen('grecs-macedoniens', -331);
    expect(sc.units.find((u) => u.id === 'a0-centre')!.formation).toBe('phalange');
    expect(sc.units.find((u) => u.id === 'a0-aile-haute')).toMatchObject({ kind: 'cavalerie', formation: 'coin' });
  });

  it('Mongols : archers montés ; Romains : quinconce avant -100 puis ligne ; tercios ; britanniques', () => {
    const m = gen('mongols', 1260);
    expect(m.units.filter((u) => u.army === 0 && u.id !== 'a0-centre').every((u) => u.kind === 'archers-montes')).toBe(true);
    expect(gen('romains', -216).units.find((u) => u.id === 'a0-centre')!.formation).toBe('quinconce');
    expect(gen('romains', 100).units.find((u) => u.id === 'a0-centre')!.formation).toBe('ligne');
    expect(gen('tercios', 1643).units.find((u) => u.id === 'a0-centre')!.formation).toBe('tercio');
    expect(gen('espagnols', 1700).units.find((u) => u.id === 'a0-centre')!.formation).toBe('ligne');
    expect(gen('britanniques', 1815).units.find((u) => u.id === 'a0-centre')!.formation).toBe('mince');
    // pas d'éléphants inventés
    for (const f of ['indiens', 'carthaginois'] as const) expect(gen(f, -300).units.some((u) => u.kind === 'elephants')).toBe(false);
    for (const sc of [m, gen('grecs-macedoniens', -331), gen('tercios', 1643)]) checkRun(sc, scaleFor(totalTroops(sc)));
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
    // `<empireId>.<stepId>` : scénario propre à un empire (deux empires partageant une bataille) ; sinon `<stepId>`.
    const steps = new Set(Object.keys(troops).map(stepIds));
    const keys = new Set(Object.keys(troops));
    for (const id of scenarioIds) expect(id.includes('.') ? keys.has(id.replace('.', '/')) : steps.has(id), id).toBe(true);
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

describe('navires, tempête et marée', () => {
  const sea = (extra: Partial<BattleScenario> = {}, losses?: number, tides: ('haute' | 'basse' | undefined)[] = []): BattleScenario => ({
    terrain: 'mer',
    ...extra,
    units: [{ id: 'u', army: 0, kind: 'navires', troops: 1600, at: [30, 30], formation: 'ligne' }],
    phases: [
      { label: 'a', duration: 4, moves: {}, tide: tides[0] },
      { label: 'b', duration: 6, moves: { u: { state: 'combat', losses } }, tide: tides[1] },
      { label: 'c', duration: 6, moves: {}, tide: tides[2] },
    ],
  });

  it("ship : le scénario prime, puis le peuple, puis l'année", () => {
    expect(shipOf({}, 'espagnols', 1571)).toBe('galere');
    expect(shipOf({}, 'britanniques', 1805)).toBe('vaisseau');
    expect(shipOf({ ship: 'galion' }, 'espagnols', 1588)).toBe('galion');
    for (const f of ['chinois', 'mongols', 'coreens', 'japonais'] as const) expect(shipOf({}, f, 1281)).toBe('jonque');
    expect(shipOf({}, 'vietnamiens', 1288)).toBe('barque');
    expect(shipOf({ ship: 'vaisseau' }, 'chinois', 1800)).toBe('vaisseau');
  });

  it('jonques : volées de flèches ; galions : bordées', () => {
    expect(weaponOf('navires', 'chinois', 'jonque')).toBe('arc');
    expect(weaponOf('navires', 'espagnols', 'galion')).toBe('bordee');
  });

  it('tempête : les coques qui perdent des hommes chavirent, hors tempête elles coulent à plat', () => {
    const storm = sea({ weather: 'tempete' }, 1);
    expect(wreckStyle(storm)).toBe('chavire');
    expect(wreckStyle(sea({ weather: 'vent' }, 1))).toBe('coule');
    const end = stateAt(storm, 100, durationOf(storm), ['japonais']);
    const dead = end.figures.filter((f) => f.state === 'mort');
    expect(dead.length).toBe(end.figures.length);
    expect(dead.every((f) => f.diedAt !== undefined && f.diedAt <= durationOf(storm))).toBe(true);
    const at = dead[0]!.diedAt!;
    expect(wreckState(storm, at, at, 1)).toMatchObject({ roll: 0, masts: true });
    const later = wreckState(storm, at, at + 5, 1);
    expect(Math.abs(later.roll)).toBeGreaterThan(2);
    expect(later.masts).toBe(false);
    expect(wreckState(sea({}, 1), at, at, 1)).toMatchObject({ roll: 0, sink: 1, masts: false });
  });

  it('marée basse : les pieux apparaissent, doucement', () => {
    const sc = sea(
      {
        decor: [
          {
            kind: 'pieux',
            points: [
              [40, 20],
              [60, 20],
              [60, 40],
              [40, 40],
            ],
          },
        ],
      },
      undefined,
      ['haute', 'basse', 'basse'],
    );
    expect(tideAt(sc, 1)).toBe(1);
    expect(stakeVisibility(tideAt(sc, 1))).toBeLessThan(0.15);
    expect(tideAt(sc, 4 + 1)).toBeLessThan(1);
    expect(tideAt(sc, 4 + 1)).toBeGreaterThan(0);
    expect(tideAt(sc, 12)).toBe(0);
    expect(stakeVisibility(tideAt(sc, 12))).toBeGreaterThan(0.95);
    expect(tideAt(sea(), 7)).toBe(1);
    expect(stakePoints(sc.decor![0]!.points, hash01, 's').length).toBeGreaterThan(10);
    expect(onStakes(sc, [50, 30])).toBe(true);
    expect(onStakes(sc, [10, 30])).toBe(false);
    expect(stakeTilt(0, true, 0.2)).not.toBe(0);
    expect(Math.abs(stakeTilt(1, true, 0.2))).toBe(0);
  });
});
