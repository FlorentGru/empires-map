import { describe, expect, it } from 'vitest';
import { geometryBounds } from '../../src/map/focusEntity';

describe('geometryBounds', () => {
  it('Polygon : [ouest, sud, est, nord]', () => {
    const g: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [-10, 30],
          [40, 30],
          [40, 55],
          [-10, 55],
          [-10, 30],
        ],
      ],
    };
    expect(geometryBounds(g)).toEqual([-10, 30, 40, 55]);
  });
  it('MultiPolygon : union des emprises des anneaux extérieurs', () => {
    const g: GeoJSON.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
        [
          [
            [10, -5],
            [12, -5],
            [12, 3],
            [10, -5],
          ],
        ],
      ],
    };
    expect(geometryBounds(g)).toEqual([0, -5, 12, 3]);
  });
});
