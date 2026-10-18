import { beforeAll, describe, expect, it } from 'vitest';
import { loadAllEmpires } from '../../src/data/loadEmpire';

// Les timelines se chargent à la demande : toutes avant les tests.
beforeAll(() => loadAllEmpires());
import { offlineQuiz, rng } from '../../src/quiz/offline';
import type { City } from '../../src/types';

describe('quiz hors ligne (navigateur)', () => {
  it('produit n questions valides, déterministes pour une graine', () => {
    const cities: City[] = [];
    const a = offlineQuiz('rome', 5, cities, 42);
    const b = offlineQuiz('rome', 5, cities, 42);
    expect(a.questions).toHaveLength(5);
    expect(a).toEqual(b);
    for (const q of a.questions) {
      expect(q.choix).toHaveLength(4);
      expect(new Set(q.choix).size).toBe(4);
      expect(q.bonne_reponse).toBeGreaterThanOrEqual(0);
      expect(q.bonne_reponse).toBeLessThan(4);
      expect(q.empire).toBe('rome');
    }
  });

  it('a un générateur pseudo-aléatoire reproductible', () => {
    const r1 = rng(7);
    const r2 = rng(7);
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
  });
});
