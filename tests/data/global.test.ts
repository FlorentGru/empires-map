import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { DATA, empireIds, readJson, validLonLat } from './helpers';

const ids = empireIds();

describe('data/cities.json', () => {
  const cities: any[] = readJson(join(DATA, 'cities.json'));
  it('ids uniques, noms non vides, coordonnées valides', () => {
    const seen = new Set<string>();
    for (const c of cities) {
      expect(seen.has(c.id), `ville en double : ${c.id}`).toBe(false);
      seen.add(c.id);
      expect(c.names?.length > 0 && c.names.every((n: any) => n.name?.trim()), `ville ${c.id} : noms`).toBe(true);
      expect(c.modern?.trim(), `ville ${c.id} : nom actuel`).toBeTruthy();
      expect(validLonLat(c.coords), `ville ${c.id} : coordonnées ${c.coords}`).toBe(true);
      expect([1, 2, 3], `ville ${c.id} : rank`).toContain(c.rank);
    }
  });
  it('références à des empires existants', () => {
    for (const c of cities) {
      for (const e of c.empires ?? []) expect(ids, `ville ${c.id}.empires`).toContain(e);
      for (const k of c.capitalOf ?? []) expect(ids, `ville ${c.id}.capitalOf`).toContain(k.empire);
    }
  });
});

describe('data/empires-catalog.json', () => {
  const catalog: any[] = readJson(join(DATA, 'empires-catalog.json'));
  it('ids uniques, champs requis', () => {
    expect(new Set(catalog.map((c) => c.id)).size, 'ids en double').toBe(catalog.length);
    for (const c of catalog) {
      expect(typeof c.name === 'string' && typeof c.region === 'string', `catalogue ${c.id}`).toBe(true);
      expect(c.start, `catalogue ${c.id}`).toBeLessThan(c.end);
    }
  });
  it.each(ids)('l’empire disponible « %s » figure au catalogue', (id) => {
    expect(catalog.map((c) => c.id), `${id} absent de data/empires-catalog.json`).toContain(id);
  });
});
