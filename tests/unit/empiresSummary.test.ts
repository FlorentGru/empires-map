import { beforeAll, describe, expect, it } from 'vitest';
import { EMPIRES, loadAllEmpires } from '../../src/data/loadEmpire';
import { duration, keyMoments, summarize } from '../../src/empires/summary';
import { apogeeStepId } from '../../src/lib/apogee';

beforeAll(() => loadAllEmpires());

describe('résumé d’un empire', () => {
  it('compte la durée sans année 0', () => {
    expect(duration(-27, 476)).toBe(502);
    expect(duration(962, 1806)).toBe(844);
  });

  it('retient, pour chaque empire, le début, l’apogée et la fin, dans l’ordre, sans doublon', () => {
    for (const e of EMPIRES) {
      const m = keyMoments(e);
      const ids = m.map((x) => x.step.id);
      expect(ids[0], e.id).toBe(e.steps[0]!.id);
      expect(ids.at(-1), e.id).toBe(e.steps.at(-1)!.id);
      expect(ids, e.id).toContain(apogeeStepId(e));
      expect(new Set(ids).size, e.id).toBe(ids.length);
      expect(m.length, e.id).toBeLessThanOrEqual(5);
      const years = m.map((x) => x.step.year);
      expect(years, e.id).toEqual([...years].sort((a, b) => a - b));
    }
  });

  it('assemble les faits principaux', () => {
    const rome = EMPIRES.find((e) => e.id === 'rome')!;
    const s = summarize(rome);
    expect(s.span).toMatch(/av\. J\.-C\..*1453.*ans/);
    expect(s.apogee?.area).toMatch(/km²/);
    expect(s.battles).toBeGreaterThan(0);
  });
});
