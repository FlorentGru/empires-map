import { describe, expect, it } from 'vitest';
import { battleStepMs, longestMarchKm, marchMs, pathKm } from '../../src/lib/march';
import type { ArmyMove, TimelineStep } from '../../src/types';

const army = (path: [number, number][]) => ({ side: 'x', faction: 'mongols', path }) as ArmyMove;
// Samarcande → Kalka (~3 300 km à vol d'oiseau par segments) ; Rome → Capoue (~190 km).
const long = army([
  [66.96, 39.65],
  [49.9, 40.4],
  [37.6, 47.5],
]);
const short = army([
  [12.5, 41.9],
  [14.25, 41.08],
]);

describe('durée des marches', () => {
  it('mesure les chemins en km', () => {
    expect(pathKm(short.path)).toBeGreaterThan(150);
    expect(pathKm(short.path)).toBeLessThan(230);
    expect(longestMarchKm([short, long])).toBeCloseTo(pathKm(long.path));
  });

  it('allonge la marche avec la distance, entre 4 et 9 s', () => {
    expect(marchMs([short])).toBe(4000);
    expect(marchMs([long])).toBeGreaterThan(marchMs([short]));
    expect(
      marchMs([
        army([
          [0, 0],
          [170, 60],
        ]),
      ]),
    ).toBe(9000);
    expect(marchMs([])).toBe(4000);
  });

  it("donne la durée d'une étape avec armées, ou null sans armée", () => {
    expect(battleStepMs({ armies: [short] } as TimelineStep)).toBe(4000 + 2500 + 1500 + 2000);
    expect(battleStepMs({} as TimelineStep)).toBeNull();
    expect(battleStepMs({ armies: [army([[1, 1]])] } as TimelineStep)).toBeNull();
  });
});
