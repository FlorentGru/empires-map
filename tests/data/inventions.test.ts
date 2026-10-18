import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { INVENTION_CATEGORIES, type Invention } from '../../src/types-invention';
import { DATA, empireIds, exists, readJson, itAll } from './helpers';

const words = (s: string) => s.trim().split(/\s+/).length;

const withInventions = empireIds().filter((id) => exists(join(DATA, 'empires', id, 'inventions.json')));

describe('inventions.json', () => {
  it('existe pour au moins un empire', () => {
    expect(withInventions.length).toBeGreaterThan(0);
  });

  describe.each(withInventions)('%s', (empire) => {
    const inventions = readJson<Invention[]>(join(DATA, 'empires', empire, 'inventions.json'));
    const tl = readJson(join(DATA, 'empires', empire, 'timeline.json'));

    it('contient 8 à 12 inventions aux ids kebab-case uniques', () => {
      expect(inventions.length).toBeGreaterThanOrEqual(8);
      expect(inventions.length).toBeLessThanOrEqual(12);
      const ids = inventions.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id, id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });

    itAll('%s est valide', inventions.map((i) => [i.id, i] as const), (_id, i) => {
      expect(i.name.trim().length).toBeGreaterThan(0);
      expect(i.place.trim().length).toBeGreaterThan(0);
      expect(INVENTION_CATEGORIES).toContain(i.category);
      expect(Number.isInteger(i.year)).toBe(true);
      expect(i.year).toBeGreaterThanOrEqual(tl.start);
      expect(i.year).toBeLessThanOrEqual(tl.end);
      expect(i.at).toHaveLength(2);
      const [lon, lat] = i.at;
      expect(lon).toBeGreaterThanOrEqual(-180);
      expect(lon).toBeLessThanOrEqual(180);
      expect(lat).toBeGreaterThanOrEqual(-60);
      expect(lat).toBeLessThanOrEqual(85);
      const d = words(i.description);
      expect(d, `description ${d} mots`).toBeGreaterThanOrEqual(50);
      expect(d, `description ${d} mots`).toBeLessThanOrEqual(80);
      expect(words(i.impact)).toBeLessThanOrEqual(45);
      expect(i.sources.length).toBeGreaterThanOrEqual(1);
      for (const s of i.sources) {
        expect(s.label.trim().length).toBeGreaterThan(0);
        expect(s.url.startsWith('https://')).toBe(true);
      }
    });
  });
});
