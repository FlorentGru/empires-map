import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { DESCRIPTION_MAX, pageDescription, pageTitle, parsePath, pathOf } from '../../src/lib/seo';
import type { Empire } from '../../src/types';
import { DATA, empireIds, readJson, itAll } from './helpers';

const empires = empireIds().map((id) => readJson<Empire>(join(DATA, 'empires', id, 'timeline.json')));

describe('pages des empires et des étapes (src/lib/seo.ts)', () => {
  it('chaque empire a une adresse distincte, qui le retrouve', () => {
    const paths = empires.map((e) => pathOf({ kind: 'empire', empire: e.id }));
    expect(new Set(paths).size).toBe(paths.length);
    for (const e of empires) expect(parsePath(pathOf({ kind: 'empire', empire: e.id }))).toEqual({ kind: 'empire', empire: e.id });
  });

  describe.each(empires)('$id', (e) => {
    it('ids d’étapes uniques et utilisables dans une adresse', () => {
      const ids = e.steps.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id, id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });

    itAll('%s : titre et description de page', e.steps.map((s) => [s.id, s] as const), (id, s) => {
      const route = { kind: 'step' as const, empire: e.id, step: id };
      expect(pageTitle(route, e, s).length, id).toBeLessThanOrEqual(110);
      const d = pageDescription(route, e, s);
      expect(d.length, id).toBeGreaterThan(50);
      expect(d.length, id).toBeLessThanOrEqual(DESCRIPTION_MAX);
    });
  });
});
