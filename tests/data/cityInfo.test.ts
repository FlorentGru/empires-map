import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import type { City } from '../../src/types';
import type { CityInfo } from '../../src/types-city';
import { DATA, readJson, itAll } from './helpers';

const infos = readJson<CityInfo[]>(join(DATA, 'city-info.json'));
const cities = readJson<City[]>(join(DATA, 'cities.json'));
const ids = new Set(cities.map((c) => c.id));

describe('data/city-info.json', () => {
  it('ids uniques', () => {
    const all = infos.map((i) => i.id);
    expect(new Set(all).size).toBe(all.length);
  });

  it('chaque grande ville (rang 1 ou capitale) a une fiche', () => {
    const have = new Set(infos.map((i) => i.id));
    const missing = cities.filter((c) => (c.rank === 1 || c.capitalOf?.length) && !have.has(c.id)).map((c) => c.id);
    expect(missing).toEqual([]);
  });

  itAll('%s est valide', infos.map((i) => [i.id, i] as const), (id, i) => {
    expect(ids.has(id), 'id absent de cities.json').toBe(true);
    const words = i.summary.trim().split(/\s+/).length;
    expect(words, 'mots du résumé').toBeGreaterThanOrEqual(40);
    expect(words, 'mots du résumé').toBeLessThanOrEqual(90);
    expect(i.facts.length).toBeGreaterThanOrEqual(2);
    expect(i.facts.length).toBeLessThanOrEqual(4);
    for (const f of i.facts) expect(f, f).toMatch(/^-?\d+ : /);
    expect(i.wikipedia.startsWith('https://fr.wikipedia.org/wiki/')).toBe(true);
  });
});
