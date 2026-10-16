import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { ARCHETYPES, FACTIONS, type Person } from '../../src/types';
import { DATA, empireIds, exists, readJson } from './helpers';

const words = (s: string) => s.trim().split(/\s+/).length;

describe.each(empireIds())('empire « %s » : personnages et départs', (empireId) => {
  const timeline = readJson(join(DATA, 'empires', empireId, 'timeline.json'));
  const steps: any[] = timeline.steps ?? [];
  const peopleFile = join(DATA, 'empires', empireId, 'people.json');
  const hasPeople = exists(peopleFile);
  const people: Person[] = hasPeople ? readJson(peopleFile) : [];

  it.runIf(hasPeople)('fiches valides', () => {
    expect(people.length).toBeGreaterThanOrEqual(1);
    expect(new Set(people.map((p) => p.id)).size, 'ids uniques').toBe(people.length);
    for (const p of people) {
      expect(p.id, p.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(ARCHETYPES, `${p.id}.archetype`).toContain(p.archetype);
      expect(FACTIONS, `${p.id}.faction`).toContain(p.faction);
      expect(p.name.length, `${p.id}.name`).toBeGreaterThan(0);
      expect(p.title.length, `${p.id}.title`).toBeGreaterThan(0);
      const n = words(p.bio);
      expect(n, `${p.id}.bio (${n} mots)`).toBeGreaterThanOrEqual(120);
      expect(n, `${p.id}.bio (${n} mots)`).toBeLessThanOrEqual(220);
      expect(p.keyFacts.length, `${p.id}.keyFacts`).toBeGreaterThanOrEqual(3);
      expect(p.keyFacts.length, `${p.id}.keyFacts`).toBeLessThanOrEqual(5);
      if (p.born !== undefined && p.died !== undefined) expect(p.born, `${p.id} born ≤ died`).toBeLessThanOrEqual(p.died);
      expect(p.sources.length, `${p.id}.sources`).toBeGreaterThanOrEqual(1);
      for (const s of p.sources) {
        expect(s.label.length).toBeGreaterThan(0);
        expect(s.url, `${p.id} source`).toMatch(/^https:\/\//);
      }
    }
  });

  it('chaque figure.person existe dans people.json', () => {
    const ids = new Set(people.map((p) => p.id));
    for (const s of steps)
      for (const f of s.figures ?? [])
        if (f.person !== undefined) expect(ids.has(f.person), `${empireId}/${s.id} : ${f.name} → ${f.person}`).toBe(true);
  });

  it('chaque from est une chaîne non vide', () => {
    for (const s of steps)
      for (const a of s.armies ?? [])
        if (a.from !== undefined) {
          expect(typeof a.from, `${empireId}/${s.id} ${a.side}`).toBe('string');
          expect(a.from.trim().length, `${empireId}/${s.id} ${a.side}`).toBeGreaterThan(0);
        }
  });
});
