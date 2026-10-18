import { describe, expect, it } from 'vitest';
import { originName } from '../../src/lib/origin';
import type { ArmyMove, City, TimelineStep } from '../../src/types';

const samarcande: City = {
  id: 'samarcande',
  modern: 'Samarcande',
  names: [
    { name: 'Maracanda', to: 700 },
    { name: 'Samarcande', from: 700 },
  ],
  coords: [66.96, 39.65],
  founded: -700,
  rank: 1,
};
const army = (p: Partial<ArmyMove>): ArmyMove => ({
  side: 'x',
  faction: 'mongols',
  path: [
    [66.97, 39.66],
    [50, 45],
  ],
  ...p,
});
const step = (id: string, year: number, armies: ArmyMove[] = [], title = id): TimelineStep => ({ id, year, title, armies }) as TimelineStep;

describe("lieu de départ d'une armée", () => {
  it('prend `from` en priorité', () => {
    expect(originName(army({ from: 'camp de Boulogne' }), step('a', 1805), [], [samarcande])).toBe('camp de Boulogne');
  });

  it("nomme la ville proche avec son nom d'époque", () => {
    expect(originName(army({}), step('a', 1220), [], [samarcande])).toBe('Samarcande');
    expect(originName(army({}), step('a', -300), [], [samarcande])).toBe('Maracanda');
    expect(
      originName(
        army({
          path: [
            [10, 10],
            [11, 11],
          ],
        }),
        step('a', 1220),
        [],
        [samarcande],
      ),
    ).toBeNull();
  });

  it('une armée qui revient part de son champ de bataille précédent', () => {
    const prev = step(
      'austerlitz-1805',
      1805,
      [
        army({
          id: 'ga',
          path: [
            [2, 50],
            [16.76, 49.13],
          ],
        }),
      ],
      'Austerlitz : le soleil',
    );
    const cur = step('iena-1806', 1806, [], 'Iéna');
    const a = army({
      id: 'ga',
      path: [
        [16.76, 49.13],
        [11.5, 50.9],
      ],
    });
    expect(originName(a, cur, [prev, cur], [])).toBe('Austerlitz');
  });
});
