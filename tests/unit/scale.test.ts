import { describe, expect, it } from 'vitest';
import { makeTicks, makeYearScale } from '../../src/timeline/scale';

describe('makeYearScale', () => {
  const years = [-509, -400, -390, -272, -264, -241, -218, -216, -202, -146, -133, -63, -49, -44, -27, 14, 117, 285, 330, 395, 476, 1453];
  const x = makeYearScale(years, -509, 1453);
  it('monotone croissante sur toutes les années, passage -1 → 1 compris', () => {
    let last = -Infinity;
    for (let y = -509; y <= 1453; y++) {
      if (y === 0) continue;
      const v = x(y);
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
    }
  });
  it('bornée à [0, 1], début = 0 et fin = 1', () => {
    expect(x(-509)).toBeCloseTo(0, 6);
    expect(x(1453)).toBeCloseTo(1, 6);
    expect(x(-5000)).toBe(x(-509));
    expect(x(9999)).toBe(x(1453));
  });
  it('strictement croissante entre deux étapes distinctes', () => {
    expect(x(-216)).toBeLessThan(x(-202));
  });
  it('tolère des années en double et un seul point', () => {
    expect(() => makeYearScale([5, 5], 5, 5)(5)).not.toThrow();
  });
});

describe('makeTicks', () => {
  it("n'inclut jamais l'année 0 et est strictement croissant", () => {
    const x = makeYearScale([-500, 100], -600, 400);
    const ticks = makeTicks(-600, 400, x);
    expect(ticks).not.toContain(0);
    expect([...ticks].sort((a, b) => a - b)).toEqual(ticks);
  });
});
