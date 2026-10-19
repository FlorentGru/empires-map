import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { regionSpans } from '../../src/lib/regions';
import type { RegionInfo } from '../../src/types-region';
import type { TerritoryProperties } from '../../src/types';
import { DATA, empireIds, exists, publicFile, readJson, itAll } from './helpers';

const words = (s: string) => s.trim().split(/\s+/).length;
const withRegions = empireIds().filter((id) => exists(join(DATA, 'empires', id, 'regions.json')));

describe('regions.json', () => {
  it('existe pour chaque empire', () => {
    expect(withRegions).toEqual(empireIds());
  });

  describe.each(withRegions)('%s', (empire) => {
    const regions = readJson<RegionInfo[]>(join(DATA, 'empires', empire, 'regions.json'));
    const tl = readJson(join(DATA, 'empires', empire, 'timeline.json'));
    const spans = regionSpans(tl.steps, (t) => {
      const file = publicFile(empire, 'territories', `${t}.geojson`);
      return exists(file) ? readJson<{ features: { properties: TerritoryProperties }[] }>(file).features.map((f) => f.properties) : [];
    });

    it('explique chaque région des territoires, sans doublon ni nom inconnu', () => {
      const names = regions.map((r) => r.name);
      expect(new Set(names).size).toBe(names.length);
      expect(spans.map((s) => s.name).filter((n) => !names.includes(n))).toEqual([]);
      expect(names.filter((n) => !spans.some((s) => s.name === n))).toEqual([]);
    });

    itAll('%s est valide', regions.map((r) => [r.name, r] as const), (name, r) => {
      const n = words(r.summary);
      expect(n, name).toBeGreaterThanOrEqual(25);
      expect(n, name).toBeLessThanOrEqual(80);
      // Années recopiées par scripts/list-regions.ts <id> --sync.
      expect(r.years, name).toEqual(spans.find((s) => s.name === name)?.years);
    });
  });
});
