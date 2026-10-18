import { describe, expect, it } from 'vitest';
import { dropCoveredLabels, existsAt, lastStepAtOrBefore, pointInGeometry } from '../../src/lib/contemporaries';

describe('lastStepAtOrBefore', () => {
  const steps = [{ year: -200 }, { year: 100 }, { year: 300 }];
  it('dernière étape d’année ≤ year', () => {
    expect(lastStepAtOrBefore(steps, 117)).toEqual({ year: 100 });
    expect(lastStepAtOrBefore(steps, 300)).toEqual({ year: 300 });
  });
  it('aucune étape avant', () => expect(lastStepAtOrBefore(steps, -300)).toBeUndefined());
  it('existsAt', () => {
    expect(existsAt({ start: -10, end: 10 }, 10)).toBe(true);
    expect(existsAt({ start: -10, end: 10 }, 11)).toBe(false);
  });
});

describe('dropCoveredLabels', () => {
  const square = {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
      [
        [4, 4],
        [6, 4],
        [6, 6],
        [4, 6],
        [4, 4],
      ],
    ],
  };
  it('point dans un polygone, trous exclus', () => {
    expect(pointInGeometry([2, 2], square)).toBe(true);
    expect(pointInGeometry([5, 5], square)).toBe(false);
    expect(pointInGeometry([20, 2], square)).toBe(false);
  });
  it('retire les étiquettes couvertes, garde bordures et autres', () => {
    const pt = (name: string, c: number[]) => ({ geometry: { type: 'Point', coordinates: c }, properties: { kind: 'label', name } });
    const border = {
      geometry: {
        type: 'LineString',
        coordinates: [
          [1, 1],
          [2, 2],
        ],
      },
      properties: { kind: 'border' },
    };
    const out = dropCoveredLabels([pt('dedans', [2, 2]), pt('dehors', [20, 20]), border], [{ geometry: square }]);
    expect(out.map((f) => (f.properties as any).name)).toEqual(['dehors', undefined]);
  });
});
