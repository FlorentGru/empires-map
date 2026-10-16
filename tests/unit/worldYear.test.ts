import { describe, expect, it } from 'vitest';
import { allStepYears, clampYear, empiresAt, MAX_YEAR, MIN_YEAR, nextStepYear, posToYear, yearToPos } from '../../src/lib/worldYear';

const ids = (y: number) => empiresAt(y).map((p) => p.empire.id);

describe('empiresAt', () => {
  it('en 117 : Rome et la Chine', () => {
    expect(ids(117)).toEqual(expect.arrayContaining(['rome', 'china']));
  });
  it('en 1279 : la Chine et les Mongols', () => {
    expect(ids(1279)).toEqual(expect.arrayContaining(['china', 'mongols']));
  });
  it('la dernière étape est d’année ≤ year', () => {
    for (const p of empiresAt(1279)) expect(p.step.year).toBeLessThanOrEqual(1279);
  });
  it('aucun empire en -2999', () => {
    expect(ids(-2999)).not.toContain('rome');
  });
});

describe('étapes', () => {
  it('allStepYears est triée', () => {
    const l = allStepYears();
    expect(l.length).toBeGreaterThan(10);
    for (let i = 1; i < l.length; i++) expect(l[i]!.year).toBeGreaterThanOrEqual(l[i - 1]!.year);
  });
  it('nextStepYear avance et recule strictement', () => {
    const n = nextStepYear(117, 1);
    expect(n).toBeGreaterThan(117);
    expect(nextStepYear(117, -1)).toBeLessThan(117);
    expect(nextStepYear(MAX_YEAR, 1)).toBe(MAX_YEAR);
    expect(nextStepYear(MIN_YEAR, -1)).toBe(MIN_YEAR);
  });
  it('clampYear borne et évite 0', () => {
    expect(clampYear(-9999)).toBe(MIN_YEAR);
    expect(clampYear(5000)).toBe(MAX_YEAR);
    expect(clampYear(0)).toBe(1);
  });
});

describe('échelle de la frise', () => {
  it('est monotone et bornée dans [0, 1]', () => {
    let prev = -1;
    for (let y = MIN_YEAR; y <= MAX_YEAR; y += 25) {
      const p = yearToPos(y);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      expect(p).toBeGreaterThan(prev);
      prev = p;
    }
    expect(yearToPos(MIN_YEAR)).toBe(0);
    expect(yearToPos(MAX_YEAR)).toBe(1);
  });
  it('posToYear est la réciproque', () => {
    for (const y of [-3000, -1200, -500, 117, 1279, 1900]) expect(posToYear(yearToPos(y))).toBeCloseTo(y, 6);
  });
  it('comprime avant -500', () => {
    expect(yearToPos(-500) - yearToPos(-3000)).toBeLessThan(yearToPos(0) - yearToPos(-500));
  });
});
