import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import type { TradeRoute } from '../../src/types-route';
import { DATA, readJson } from './helpers';

const routes = readJson<TradeRoute[]>(join(DATA, 'routes.json'));

describe('data/routes.json', () => {
  it('contient au moins 15 routes', () => {
    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBeGreaterThanOrEqual(15);
  });

  it('a des identifiants kebab-case uniques', () => {
    const ids = routes.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id, id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it.each(routes.map((r) => [r.id, r] as const))('%s est valide', (_id, r) => {
    expect(r.name.trim().length).toBeGreaterThan(0);
    expect(['terre', 'mer']).toContain(r.kind);
    expect(Number.isInteger(r.from)).toBe(true);
    expect(Number.isInteger(r.to)).toBe(true);
    expect(r.from).toBeLessThan(r.to);
    expect(r.path.length).toBeGreaterThanOrEqual(4);
    expect(r.path.length).toBeLessThanOrEqual(30);
    for (const p of r.path) {
      expect(p).toHaveLength(2);
      const [lon, lat] = p;
      // lon > 180 autorisé : tracés qui traversent l'antiméridien (Pacifique)
      expect(lon).toBeGreaterThanOrEqual(-180);
      expect(lon).toBeLessThanOrEqual(360);
      expect(lat).toBeGreaterThanOrEqual(-60);
      expect(lat).toBeLessThanOrEqual(85);
    }
    expect(r.stops.length).toBeGreaterThanOrEqual(3);
    expect(r.stops.length).toBeLessThanOrEqual(10);
    for (const s of r.stops) expect(s.trim().length).toBeGreaterThan(0);
    expect(r.goods.length).toBeGreaterThanOrEqual(2);
    expect(r.goods.length).toBeLessThanOrEqual(6);
    const words = r.description.trim().split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(80);
    expect(r.wikipedia.startsWith('https://')).toBe(true);
  });
});
