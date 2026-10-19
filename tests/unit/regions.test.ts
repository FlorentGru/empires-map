import { describe, expect, it } from 'vitest';
import { regionSpans } from '../../src/lib/regions';
import { citiesIn } from '../../src/map/regionCard';
import type { City } from '../../src/types';
import type { RegionFeature } from '../../src/map/territoryLayers';

describe('regionSpans', () => {
  const steps = [
    { year: 10, title: 'B', territory: 't2' },
    { year: -50, title: 'A', territory: 't1' },
    { year: 30, title: 'C', territory: 't2' },
  ];
  const entities: Record<string, { empire: string; name: string; sourceYear: number; status?: 'core' | 'vassal' | 'allied' }[]> = {
    t1: [{ empire: 'x', name: 'Royaume', sourceYear: 0 }],
    t2: [
      { empire: 'x', name: 'Royaume', sourceYear: 0, status: 'vassal' },
      { empire: 'x', name: 'Duché', sourceYear: 0, status: 'vassal' },
    ],
  };
  const spans = regionSpans(steps, (t) => entities[t] ?? []);

  it('regroupe par nom avec années de 1re et dernière étape, étapes dans l’ordre', () => {
    const r = spans.find((s) => s.name === 'Royaume')!;
    expect(r.years).toEqual([-50, 30]);
    expect(r.steps).toEqual(['A', 'B', 'C']);
    expect(spans.find((s) => s.name === 'Duché')!.years).toEqual([10, 30]);
  });

  it('retient le statut le plus fréquent', () => {
    expect(spans.find((s) => s.name === 'Royaume')!.status).toBe('vassal');
  });
});

describe('citiesIn', () => {
  const square: RegionFeature = {
    type: 'Feature',
    properties: { empire: 'x', name: 'Carré', sourceYear: 0 },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    },
  };
  const city = (modern: string, coords: [number, number], rank: 1 | 2 | 3, founded = -1000): City =>
    ({ id: modern, modern, coords, rank, founded, names: [{ name: modern }] }) as unknown as City;

  it('garde les villes dedans, existantes à l’année, les plus importantes d’abord', () => {
    const list = [city('Petite', [5, 5], 3), city('Dehors', [20, 5], 1), city('Grande', [2, 2], 1), city('Future', [3, 3], 1, 500)];
    expect(citiesIn(square, list, 0)).toEqual(['Grande', 'Petite']);
  });
});
