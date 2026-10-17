import { describe, expect, it } from 'vitest';
import { fanPositions, spreadOffsets, stacks } from '../../src/lib/stacks';

describe("piles d'icônes", () => {
  it('regroupe de proche en proche et isole les points éloignés', () => {
    const g = stacks(
      [
        { id: 'colisee', x: 100, y: 100 },
        { id: 'pantheon', x: 110, y: 104 },
        { id: 'saint-pierre', x: 124, y: 100 },
        { id: 'parthenon', x: 400, y: 300 },
      ],
      18,
    );
    expect(g.map((s) => s.map((p) => p.id))).toEqual([['colisee', 'pantheon', 'saint-pierre'], ['parthenon']]);
  });
});

describe('éventail', () => {
  const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  it('place jusqu’à 6 pastilles sur un cercle, la première en haut', () => {
    const p = fanPositions(4, 34);
    expect(p[0]).toEqual([0, -34]);
    for (const q of p) expect(Math.round(Math.hypot(q[0], q[1]))).toBe(34);
  });

  it('ne superpose jamais deux pastilles, même en spirale', () => {
    for (const n of [2, 3, 6, 7, 12]) {
      const p = fanPositions(n, 34);
      expect(p).toHaveLength(n);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) expect(dist(p[i]!, p[j]!)).toBeGreaterThan(20);
    }
  });
});

describe('spreadOffsets', () => {
  it('écarte symétriquement les valeurs trop proches et laisse les isolées en place', () => {
    expect(spreadOffsets([0.1, 0.1, 0.5], 0.01)).toEqual([-0.5, 0.5, 0]);
    expect(spreadOffsets([0.3, 0.2, 0.205, 0.21], 0.01)).toEqual([0, -1, 0, 1]);
  });
});
