import { describe, expect, it } from 'vitest';
import { entityHsl, variantFill } from '../../src/map/color';

const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};

describe('palette des entités', () => {
  for (const base of ['#c0392b', '#2e86c1', '#27ae60', '#f1c40f', '#8e44ad']) {
    it(`7 entités successives de ${base} : ≥ 30° entre voisines`, () => {
      const hues = Array.from({ length: 7 }, (_, i) => entityHsl(base, i)[0]);
      for (let i = 1; i < hues.length; i++) expect(hueGap(hues[i - 1]!, hues[i]!)).toBeGreaterThanOrEqual(30);
    });
  }
  it("l'entité 0 garde la couleur de l'empire", () => {
    const [h] = entityHsl('#ff0000', 0);
    expect(h).toBe(0);
  });
  it('variantFill renvoie une couleur hsl valide', () => {
    expect(variantFill('#336699', 3)).toMatch(/^hsl\(\d+(\.\d+)?, [\d.]+%, [\d.]+%\)$/);
  });
});
