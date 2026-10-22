import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { BATTLE_UNITS, sceneScenario, UNIT_BY_ID } from '../../src/battle/unitInfo';
import { battlesUsing, type BattleSource } from '../../src/battle/unitUsage';
import { durationOf, stateAt } from '../../src/battle/engine';
import type { BattleScenario } from '../../src/types-battle';
import { DATA, readJson } from '../data/helpers';

const scenario = (id: string) => readJson<BattleScenario>(join(DATA, 'battles', 'scenarios', `${id}.json`));
const source = (stepId: string, year: number): BattleSource => ({ empireId: 'x', stepId, title: stepId, year, troops: [], scenario: scenario(stepId) });
const ids = (unit: string, sources: BattleSource[]) => battlesUsing(UNIT_BY_ID.get(unit)!, sources).map((b) => b.stepId);

describe('unités de bataille (galerie)', () => {
  const sources = [source('gaugameles-331', -331), source('aindjalout-1260', 1260), source('lepante-1571', 1571), source('waterloo-1815', 1815)];

  it('retrouve les batailles par formation, monture et manœuvre', () => {
    expect(ids('phalange', sources)).toEqual(['gaugameles-331']);
    expect(ids('chars', sources)).toEqual(['gaugameles-331']);
    expect(ids('feinte', sources)).toEqual(['aindjalout-1260']);
    expect(ids('carre', sources)).toEqual(['waterloo-1815']);
    expect(ids('tortue', sources)).toEqual([]);
  });

  it("distingue galères et vaisseaux par l'année", () => {
    expect(ids('galeres', sources)).toEqual(['lepante-1571']);
    expect(ids('vaisseaux', [source('lepante-1571', 1571)])).toEqual([]);
  });

  it('déduit une bataille sans scénario du scénario générique', () => {
    const generic: BattleSource = {
      empireId: 'x',
      stepId: 'g',
      title: 'g',
      year: -331,
      troops: [30000, 40000],
      armies: [
        {
          side: 'A',
          faction: 'grecs-macedoniens',
          path: [
            [0, 0],
            [1, 1],
          ],
          winner: true,
        },
        {
          side: 'B',
          faction: 'parthes-perses',
          path: [
            [0, 0],
            [1, 1],
          ],
          winner: false,
        },
      ],
    };
    const [ref] = battlesUsing(UNIT_BY_ID.get('phalange')!, [generic]);
    expect(ref?.historic).toBe(false);
  });

  it('chaque mini-scène est jouable par le moteur', () => {
    for (const u of BATTLE_UNITS) {
      const s = sceneScenario(u.scene);
      const frame = stateAt(s, 100, durationOf(s) * 0.8, [u.scene.faction]);
      expect(frame.figures.length, u.id).toBeGreaterThan(0);
    }
  });
});
