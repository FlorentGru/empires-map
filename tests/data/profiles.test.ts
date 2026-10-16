import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import type { Estimate, EmpireProfile, ProfilePeriod } from '../../src/types-profile';
import { DATA, empireIds, exists, readJson } from './helpers';

const MAX_WORDS = 40;
const words = (s: string) => s.trim().split(/\s+/).length;

function estimates(p: ProfilePeriod): [string, Estimate][] {
  const out: [string, Estimate][] = [['population.total', p.population.total]];
  p.population.cities.forEach((c) => out.push([`ville ${c.name}`, c.population]));
  if (p.economy.worldGdpShare) out.push(['worldGdpShare', p.economy.worldGdpShare]);
  if (p.army.size) out.push(['army.size', p.army.size]);
  if (p.politics.provinces) out.push(['provinces', p.politics.provinces]);
  if (p.infrastructure.roads) out.push(['roads', p.infrastructure.roads]);
  return out;
}

/** Tous les textes (hors url) d'une période. */
function texts(p: ProfilePeriod): string[] {
  const t: string[] = [p.name, p.legacy, p.economy.currency, p.economy.taxation, p.economy.trade, p.infrastructure.summary];
  t.push(p.army.composition, p.army.recruitment);
  t.push(p.politics.regime, p.politics.head, p.politics.succession, p.politics.institutions, p.politics.administration, p.politics.law);
  t.push(p.society.structure, p.society.women);
  return t;
}

const lists = (p: ProfilePeriod): [string, string[]][] => [
  ['resources', p.economy.resources],
  ['famousUnits', p.army.famousUnits],
  ['innovations', p.army.innovations],
  ['religions', p.society.religions],
  ['languages', p.society.languages],
  ['inventions', p.culture.inventions],
  ['works', p.culture.works],
  ['scholars', p.culture.scholars],
];

const ids = empireIds().filter((id) => exists(join(DATA, 'empires', id, 'profile.json')));

describe('profils d\'empire', () => {
  it('existent pour au moins 4 empires', () => {
    expect(ids.length).toBeGreaterThanOrEqual(4);
  });

  describe.each(ids)('%s', (id) => {
    const profile = readJson<EmpireProfile>(join(DATA, 'empires', id, 'profile.json'));
    const timeline = readJson<any>(join(DATA, 'empires', id, 'timeline.json'));
    const tlPeriods: { id: string }[] = timeline.periods ?? [];

    it('porte le nom du dossier et des périodes triées dans la durée de l\'empire', () => {
      expect(profile.empire).toBe(id);
      expect(profile.periods.length).toBeGreaterThan(0);
      let prev = -Infinity;
      for (const p of profile.periods) {
        expect(p.start, p.id).toBeLessThan(p.end);
        expect(p.start, p.id).toBeGreaterThanOrEqual(timeline.start);
        expect(p.end, p.id).toBeLessThanOrEqual(timeline.end);
        expect(p.start, p.id).toBeGreaterThanOrEqual(prev);
        prev = p.start;
      }
      expect(new Set(profile.periods.map((p) => p.id)).size).toBe(profile.periods.length);
    });

    it('réutilise les ids de période de la timeline quand elle en a', () => {
      for (const p of profile.periods) {
        if (tlPeriods.length) expect(tlPeriods.map((t) => t.id), p.id).toContain(p.id);
        else expect(p.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      }
    });

    it.each(profile.periods.map((p) => [p.id, p] as const))('période %s : chiffres cohérents', (_pid, p) => {
      expect(p.population.total).toBeDefined();
      expect(p.population.cities.length).toBeGreaterThanOrEqual(2);
      expect(p.population.cities.length).toBeLessThanOrEqual(5);
      for (const [label, e] of estimates(p)) {
        expect(e.value, label).toBeGreaterThan(0);
        if (e.low !== undefined) expect(e.low, label).toBeLessThanOrEqual(e.value);
        if (e.high !== undefined) expect(e.high, label).toBeGreaterThanOrEqual(e.value);
        expect(Number.isInteger(e.year), label).toBe(true);
        expect(e.source.label.trim().length, label).toBeGreaterThan(0);
        expect(e.source.url.startsWith('https://'), label).toBe(true);
      }
    });

    it.each(profile.periods.map((p) => [p.id, p] as const))('période %s : textes et listes remplis', (_pid, p) => {
      for (const t of texts(p)) {
        expect(t.trim().length, t).toBeGreaterThan(0);
        expect(words(t), t).toBeLessThanOrEqual(MAX_WORDS);
      }
      for (const [label, l] of lists(p)) {
        expect(l.length, label).toBeGreaterThanOrEqual(2);
        expect(l.length, label).toBeLessThanOrEqual(6);
        for (const s of l) expect(s.trim().length, label).toBeGreaterThan(0);
      }
    });
  });
});
