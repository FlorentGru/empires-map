import { describe, expect, it } from 'vitest';
import { chainedArmies, continuedArmies } from '../../src/map/armyLayer';
import type { ArmyMove, TimelineStep } from '../../src/types';

const army = (id: string | undefined, winner?: boolean): ArmyMove => ({
  id,
  side: 'X',
  faction: 'romains',
  winner,
  path: [
    [0, 0],
    [1, 1],
  ],
});
const step = (id: string, armies: ArmyMove[]) => ({ id, year: 0, armies }) as unknown as TimelineStep;

describe('chainedArmies', () => {
  it("garde les armées de l'étape dont l'id était dans l'étape précédente", () => {
    const prev = step('p', [army('h', true)]);
    const cur = step('c', [army('h'), army('autre'), army(undefined)]);
    expect(chainedArmies(cur, prev).map((a) => a.id)).toEqual(['h']);
  });
  it('une armée vaincue (autre armée gagnante) ne se poursuit pas', () => {
    const prev = step('p', [army('h', false), army('r', true)]);
    const cur = step('c', [army('h'), army('r')]);
    expect(chainedArmies(cur, prev).map((a) => a.id)).toEqual(['r']);
  });
  it('vide sans étape précédente', () => {
    expect(chainedArmies(step('c', [army('h')]), null)).toEqual([]);
  });
});

describe('continuedArmies', () => {
  it('retrouve un id vu dans une étape ANTÉRIEURE, pas forcément la précédente', () => {
    const steps = [step('a', [army('ga')]), step('b', []), step('c', [army('ga'), army('nouvelle')])];
    expect(continuedArmies(steps, 2).map((a) => a.id)).toEqual(['ga']);
    expect(continuedArmies(steps, 0)).toEqual([]);
    expect(continuedArmies(steps, 5)).toEqual([]);
  });
  it('ignore les armées sans id ou avec un path trop court', () => {
    const short = { ...army('ga'), path: [[0, 0]] } as ArmyMove;
    const steps = [step('a', [army('ga')]), step('b', [short, army(undefined)])];
    expect(continuedArmies(steps, 1)).toEqual([]);
  });
});
