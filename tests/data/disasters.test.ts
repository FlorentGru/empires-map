import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { DISASTER_KINDS, type Disaster } from '../../src/types-disaster';
import { DATA, readJson, itAll } from './helpers';

const disasters = readJson<Disaster[]>(join(DATA, 'disasters.json'));

const validPoint = (p: number[]) =>
  p.length === 2 && p[0] >= -180 && p[0] <= 180 && p[1] >= -90 && p[1] <= 90;

describe('data/disasters.json', () => {
  it('contient au moins 40 événements', () => {
    expect(Array.isArray(disasters)).toBe(true);
    expect(disasters.length).toBeGreaterThanOrEqual(40);
  });

  it('a des identifiants kebab-case uniques', () => {
    const ids = disasters.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id, id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  itAll('%s est valide', disasters.map((d) => [d.id, d] as const), (_id, d) => {
    expect(d.name.trim().length).toBeGreaterThan(0);
    expect(DISASTER_KINDS).toContain(d.kind);
    expect(Number.isInteger(d.start)).toBe(true);
    expect(Number.isInteger(d.end)).toBe(true);
    expect(d.start).toBeLessThanOrEqual(d.end);
    expect(validPoint(d.location)).toBe(true);
    expect(d.deathsLow).toBeLessThanOrEqual(d.deaths);
    expect(d.deaths).toBeLessThanOrEqual(d.deathsHigh);
    expect(d.deathsLow).toBeGreaterThanOrEqual(0);
    expect(d.uncertainty.trim().length).toBeGreaterThan(10);
    const words = d.description.trim().split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(50);
    expect(words).toBeLessThanOrEqual(90);
    expect(d.sources.length).toBeGreaterThanOrEqual(1);
    for (const s of d.sources) {
      expect(s.label.trim().length).toBeGreaterThan(0);
      expect(s.url.startsWith('https://')).toBe(true);
    }
  });

  itAll(
    '%s (épidémie) a une diffusion cohérente', disasters.filter((d) => d.kind === 'epidemie').map((d) => [d.id, d] as const),
    (_id, d) => {
      const spread = d.spread ?? [];
      expect(spread.length).toBeGreaterThanOrEqual(4);
      expect(spread.length).toBeLessThanOrEqual(10);
      let prev = -Infinity;
      for (const step of spread) {
        expect(step.year).toBeGreaterThanOrEqual(prev);
        expect(step.year).toBeGreaterThanOrEqual(d.start);
        expect(step.year).toBeLessThanOrEqual(d.end);
        expect(step.points.length).toBeGreaterThan(0);
        for (const p of step.points) expect(validPoint(p)).toBe(true);
        prev = step.year;
      }
    },
  );

  itAll(
    '%s (guerre) a une zone et des belligérants', disasters.filter((d) => d.kind === 'guerre').map((d) => [d.id, d] as const),
    (_id, d) => {
      const area = d.area ?? [];
      expect(area.length).toBeGreaterThanOrEqual(3);
      expect(area.length).toBeLessThanOrEqual(12);
      for (const p of area) expect(validPoint(p)).toBe(true);
      expect((d.belligerents ?? []).length).toBeGreaterThanOrEqual(2);
    },
  );

  it("les empires belligérants existent dans le catalogue et ne concernent que des guerres", () => {
    const catalog = new Set(readJson<{ id: string }[]>(join(DATA, 'empires-catalog.json')).map((c) => c.id));
    const tagged = disasters.filter((d) => d.belligerentEmpires);
    expect(tagged.map((d) => d.id)).toEqual(expect.arrayContaining(['conquetes-mongoles', 'guerres-napoleoniennes', 'seconde-guerre-punique']));
    for (const d of tagged) {
      expect(d.kind, d.id).toBe('guerre');
      expect(d.belligerentEmpires!.length, d.id).toBeGreaterThan(0);
      for (const id of d.belligerentEmpires!) expect(catalog.has(id), `${d.id} : ${id}`).toBe(true);
    }
  });

  it('chaque guerre a sa zone découpée sur les terres (public/data/disaster-areas.geojson)', () => {
    const areas = readJson<{ features: { properties: { id: string }; geometry: { type: string } }[] }>(join(DATA, '..', 'public/data/disaster-areas.geojson'));
    const ids = areas.features.map((f) => f.properties.id);
    const wars = disasters.filter((d) => d.kind === 'guerre').map((d) => d.id);
    expect([...ids].sort()).toEqual([...wars].sort());
    for (const f of areas.features) expect(['Polygon', 'MultiPolygon']).toContain(f.geometry.type);
  });
});
