import { describe, expect, it } from 'vitest';
import { chapterAt, firstStepOfPeriods, periodIndexAt } from '../../src/lib/periods';
import type { EmpirePeriod, TimelineStep } from '../../src/types';

const p = (id: string, start: number, end: number): EmpirePeriod => ({ id, name: id, start, end, color: '#000', summary: '' });
const periods = [p('a', -500, -200), p('b', -200, 100), p('c', 100, 400)];
const step = (id: string, year: number) => ({ id, year }) as TimelineStep;

describe('periodIndexAt', () => {
  it('prend la dernière période dont start ≤ année', () => {
    expect(periodIndexAt(periods, -400)).toBe(0);
    expect(periodIndexAt(periods, 50)).toBe(1);
    expect(periodIndexAt(periods, 300)).toBe(2);
  });
  it("les bornes qui se touchent appartiennent à la période suivante", () => {
    expect(periodIndexAt(periods, -200)).toBe(1);
    expect(periodIndexAt(periods, 100)).toBe(2);
    expect(periodIndexAt(periods, -500)).toBe(0);
  });
  it('-1 sans période ou avant la première', () => {
    expect(periodIndexAt(undefined, 0)).toBe(-1);
    expect(periodIndexAt(periods, -600)).toBe(-1);
  });
});

describe('firstStepOfPeriods / chapterAt', () => {
  const steps = [step('s1', -300), step('s2', -250), step('s3', 100), step('s4', 200)];
  const empire = { periods, steps };
  it('première étape de chaque période (-1 si vide)', () => {
    expect(firstStepOfPeriods(empire)).toEqual([0, -1, 2]);
  });
  it('chapterAt marque la première étape de la période', () => {
    expect(chapterAt(empire, 0)).toMatchObject({ n: 1, periodId: 'a', first: true });
    expect(chapterAt(empire, 1)).toMatchObject({ n: 1, first: false });
    expect(chapterAt(empire, 2)).toMatchObject({ n: 3, periodId: 'c', first: true });
    expect(chapterAt(empire, 9)).toBeNull();
  });
});
