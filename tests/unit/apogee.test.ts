import { describe, expect, it } from 'vitest';
import { apogeeStepId, formatArea, largestStep, normalizedAreas } from '../../src/lib/apogee';
import type { TimelineStep } from '../../src/types';

const steps = ['a', 'b', 'c'].map((id) => ({ id }) as TimelineStep);
const areas = { a: 100, b: 400, c: 250 };

describe('apogée', () => {
  it("prend l'étape de plus grande surface (la première en cas d'égalité)", () => {
    expect(largestStep(['a', 'b', 'c'], areas)).toBe('b');
    expect(largestStep(['a', 'b'], { a: 5, b: 5 })).toBe('a');
    expect(largestStep(['a'], {})).toBeNull();
  });

  it('respecte la surcharge de la timeline si elle désigne une étape existante', () => {
    const stats = { areas, apogee: 'b' };
    expect(apogeeStepId({ steps, stats })).toBe('b');
    expect(apogeeStepId({ steps, stats, apogee: { stepId: 'c' } })).toBe('c');
    expect(apogeeStepId({ steps, stats, apogee: { stepId: 'inconnue' } })).toBe('b');
    expect(apogeeStepId({ steps })).toBeNull();
  });

  it('normalise les surfaces sur [0, 1]', () => {
    expect(normalizedAreas(['a', 'b', 'c', 'd'], areas)).toEqual([0.25, 1, 0.625, 0]);
    expect(normalizedAreas(['a'], {})).toEqual([0]);
  });

  it('formate les surfaces en français', () => {
    expect(formatArea(4_685_241)).toMatch(/^≈ 4,7 M km²$/);
    expect(formatArea(867_888).replace(/\s/g, ' ')).toBe('≈ 870 000 km²');
  });
});
