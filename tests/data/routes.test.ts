import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { ROUTE_CARRIERS, type TradeRoute } from '../../src/types-route';
import { DATA, readJson } from './helpers';

/** Distance (km) d'un point à un segment, approximation équirectangulaire. */
function segmentKm(p: number[], a: number[], b: number[]): number {
  const k = Math.cos((p[1] * Math.PI) / 180) * 111.32;
  const m = 110.57;
  const ax = (a[0] - p[0]) * k, ay = (a[1] - p[1]) * m;
  const bx = (b[0] - p[0]) * k, by = (b[1] - p[1]) * m;
  const dx = bx - ax, dy = by - ay;
  const l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}

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
    expect(ROUTE_CARRIERS).toContain(r.carrier);
    expect(r.stops.length).toBeGreaterThanOrEqual(3);
    expect(r.stops.length).toBeLessThanOrEqual(14);
    for (const s of r.stops) {
      expect(s.name.trim().length).toBeGreaterThan(0);
      expect(s.at).toHaveLength(2);
      expect(s.at[0], `${s.name} lon`).toBeGreaterThanOrEqual(-180);
      expect(s.at[0], `${s.name} lon`).toBeLessThanOrEqual(360);
      expect(s.at[1], `${s.name} lat`).toBeGreaterThanOrEqual(-60);
      expect(s.at[1], `${s.name} lat`).toBeLessThanOrEqual(85);
      if (s.note !== undefined) {
        const n = s.note.trim().split(/\s+/).length;
        expect(n, `${s.name} note`).toBeGreaterThan(0);
        expect(n, `${s.name} note`).toBeLessThanOrEqual(12);
      }
      let min = Infinity;
      for (let i = 0; i < r.path.length - 1; i++) min = Math.min(min, segmentKm(s.at, r.path[i], r.path[i + 1]));
      expect(min, `${s.name} à ${min.toFixed(0)} km du tracé`).toBeLessThan(30);
    }
    expect(r.goods.length).toBeGreaterThanOrEqual(2);
    expect(r.goods.length).toBeLessThanOrEqual(6);
    const words = r.description.trim().split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(80);
    expect(r.wikipedia.startsWith('https://')).toBe(true);
  });
});
