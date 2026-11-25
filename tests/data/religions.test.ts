import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RELIGION_IDS, religionAt, type CountryReligions, type ReligionPeriod, type TerritoryReligions } from '../../src/types-religion';
import { DATA, ROOT, empireIds, exists, publicFile, readJson, itAll } from './helpers';

const dir = join(DATA, 'religions');
const territories = readJson<TerritoryReligions>(join(dir, 'territories.json'));
const historical = readJson<Record<string, ReligionPeriod[]>>(join(dir, 'historical.json'));
const countries = readJson<CountryReligions>(join(dir, 'countries.json'));
const OUT = join(ROOT, 'public', 'data', 'religions');

// .cache (fetch:data) est absent en CI : les tests qui en dépendent sont sautés.
const HB = join(ROOT, '.cache', 'historical-basemaps');
const NE = join(ROOT, '.cache', 'natural-earth', 'ne_50m_admin_0_countries.geojson');
const itCache = (path: string) => (exists(path) ? it : it.skip);

const tables: [string, ReligionPeriod[]][] = [
  ...Object.entries(territories).flatMap(([e, t]) => Object.entries(t).map(([n, p]) => [`${e} / ${n}`, p] as [string, ReligionPeriod[]])),
  ...Object.entries(historical),
  ...Object.entries(countries).map(([c, r]) => [c, [{ from: -Infinity, ...r }]] as [string, ReligionPeriod[]]),
];

describe('data/religions', () => {
  itAll('religions connues, `from` strictement croissants', tables, (name, periods) => {
    expect(periods.length, name).toBeGreaterThan(0);
    periods.forEach((p, i) => {
      expect(RELIGION_IDS, `${name} @${p.from}`).toContain(p.religion);
      for (const m of p.minorities ?? []) expect(RELIGION_IDS, `${name} minorité`).toContain(m);
      expect((p.minorities ?? []).length, name).toBeLessThanOrEqual(2);
      if (i) expect(p.from, name).toBeGreaterThan(periods[i - 1]!.from);
    });
  });

  describe.each(empireIds())('%s', (empire) => {
    const tl = readJson(join(DATA, 'empires', empire, 'timeline.json'));
    const table = territories[empire] ?? {};
    // Première année d'apparition de chaque entité des territoires générés.
    const first = new Map<string, number>();
    for (const step of [...tl.steps].sort((a: any, b: any) => a.year - b.year)) {
      const file = publicFile(empire, 'territories', `${step.territory}.geojson`);
      if (!exists(file)) continue;
      for (const f of readJson(file).features) if (!first.has(f.properties.name)) first.set(f.properties.name, step.year);
    }

    itAll('chaque entité a une religion dès son apparition', [...first], (name, year) => {
      expect(religionAt(table[name], year), `${name} (${year})`).not.toBeNull();
    });

    itAll('fichiers public/data/religions/territories.json par étape', tl.steps.map((s: any) => [s.id, s] as const), (id) => {
      const out = readJson(join(OUT, 'territories.json'))[empire]?.[id];
      expect(out?.snapshot, id).toMatch(/^world_/);
    });
  });

  itCache(HB)('chaque clé de historical.json existe dans un instantané', () => {
    
    const known = new Set<string>();
    for (const f of readdirSync(HB).filter((f) => /^world_.*\.geojson$/.test(f)))
      for (const ft of JSON.parse(readFileSync(join(HB, f), 'utf8')).features) if (ft.properties?.NAME) known.add(String(ft.properties.NAME).trim());
    expect(Object.keys(historical).filter((k) => !known.has(k))).toEqual([]);
  });

  itCache(NE)('chaque code de countries.json existe dans Natural Earth', () => {
    
    const codes = new Set(JSON.parse(readFileSync(NE, 'utf8')).features.map((f: any) => f.properties.ADM0_A3));
    expect(Object.keys(countries).filter((c) => !codes.has(c))).toEqual([]);
  });

  it('les fichiers générés existent (npm run build:religions)', () => {
    expect(exists(join(OUT, 'countries-2026.geojson'))).toBe(true);
    expect(exists(join(OUT, 'territories.json'))).toBe(true);
  });
});
