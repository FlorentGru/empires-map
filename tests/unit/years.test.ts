import { describe, expect, it } from 'vitest';
import { formatYear, toAstronomical } from '../../src/lib/years';

describe('formatYear', () => {
  it('écrit les années négatives en « av. J.-C. »', () => {
    expect(formatYear(-753)).toBe('753 av. J.-C.');
    expect(formatYear(-1)).toBe('1 av. J.-C.');
  });
  it('laisse les années positives telles quelles', () => {
    expect(formatYear(1453)).toBe('1453');
    expect(formatYear(1)).toBe('1');
  });
  it("n'affiche jamais « 0 » pour une année négative", () => {
    for (let y = -2000; y < 0; y += 7) expect(formatYear(y)).not.toMatch(/^0/);
  });
  it('année astronomique : 1 av. J.-C. = 0, donc 1 av. → 1 apr. = 1 an', () => {
    expect(toAstronomical(-1)).toBe(0);
    expect(toAstronomical(1) - toAstronomical(-1)).toBe(1);
  });
});
