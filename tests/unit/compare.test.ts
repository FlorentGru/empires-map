import { describe, expect, it } from 'vitest';
import { apogeePeriod, battleCount, density, factor, formatEstimate, maxAreaIn, mobilisation, periodAt } from '../../src/lib/compare';
import type { Empire, TimelineStep } from '../../src/types';
import type { EmpireProfile, Estimate } from '../../src/types-profile';

const src = { label: 'x', url: 'https://x' };
const est = (value: number, low?: number, high?: number): Estimate => ({ value, low, high, year: 100, source: src });
const period = (id: string, start: number, end: number) => ({ id, name: id, start, end }) as EmpireProfile['periods'][number];
const profile = { empire: 'rome', periods: [period('republique', -509, -27), period('haut-empire', -27, 284), period('bas-empire', 284, 476)] } as EmpireProfile;
const step = (id: string, year: number, type = 'politique') => ({ id, year, type }) as TimelineStep;
const empire = {
  id: 'rome',
  steps: [step('cannes', -216, 'bataille'), step('trajan', 117), step('constantin', 330)],
  stats: { areas: { cannes: 300_000, trajan: 4_700_000, constantin: 3_000_000 }, apogee: 'trajan' },
} as unknown as Empire;

describe('comparaison', () => {
  it('trouve la période d’une année et celle de l’apogée', () => {
    expect(periodAt(profile, 117)?.id).toBe('haut-empire');
    expect(periodAt(profile, -27)?.id).toBe('haut-empire');
    expect(periodAt(profile, 2000)?.id).toBe('bas-empire');
    expect(apogeePeriod(empire, profile)?.id).toBe('haut-empire');
  });

  it('calcule surface, densité et mobilisation', () => {
    expect(maxAreaIn(empire, { start: -27, end: 284 })).toBe(4_700_000);
    expect(maxAreaIn(empire, { start: 500, end: 600 })).toBeUndefined();
    expect(density(est(60_000_000), 4_700_000)).toBeCloseTo(12.8, 1);
    expect(mobilisation(est(300_000), est(60_000_000))).toBeCloseTo(0.5);
    expect(battleCount(empire)).toBe(1);
  });

  it('signale les écarts nets seulement', () => {
    expect(factor(430e6, 60e6)).toEqual({ ratio: '×7,2', bigger: 'a' });
    expect(factor(50, 60)).toBeNull();
    expect(factor(undefined, 3)).toBeNull();
  });

  it('formate une estimation avec sa fourchette', () => {
    expect(formatEstimate(est(60e6, 50e6, 70e6))).toBe('60 M (50 M – 70 M)');
    expect(formatEstimate(est(300_000), 'soldats').replace(/\s/g, ' ')).toBe('300 000 soldats');
  });
});
