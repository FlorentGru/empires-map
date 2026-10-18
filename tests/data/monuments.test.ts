import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { MONUMENT_KINDS, type Monument } from '../../src/types-monument';
import { DATA, readJson, itAll } from './helpers';

const monuments = readJson<Monument[]>(join(DATA, 'monuments.json'));

describe('data/monuments.json', () => {
  it('contient au moins 60 monuments', () => {
    expect(Array.isArray(monuments)).toBe(true);
    expect(monuments.length).toBeGreaterThanOrEqual(60);
  });

  it('a des identifiants kebab-case uniques', () => {
    const ids = monuments.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id, id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  itAll('%s est valide', monuments.map((m) => [m.id, m] as const), (_id, m) => {
    expect(m.name.trim().length).toBeGreaterThan(0);
    expect(m.civilization.trim().length).toBeGreaterThan(0);
    expect(m.location).toHaveLength(2);
    const [lon, lat] = m.location;
    expect(lon).toBeGreaterThanOrEqual(-180);
    expect(lon).toBeLessThanOrEqual(180);
    expect(lat).toBeGreaterThanOrEqual(-60);
    expect(lat).toBeLessThanOrEqual(85);
    expect(MONUMENT_KINDS).toContain(m.kind);
    expect(Number.isInteger(m.built)).toBe(true);
    if (m.until !== undefined) {
      expect(Number.isInteger(m.until)).toBe(true);
      expect(m.until).toBeGreaterThan(m.built);
    }
    const words = m.description.trim().split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(70);
    expect(m.wikipedia.startsWith('https://')).toBe(true);
  });
});
