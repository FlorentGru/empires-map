import { beforeAll, describe, expect, it } from 'vitest';
import { EMPIRES, loadAllEmpires } from '../../src/data/loadEmpire';
import { guessQuestion } from '../../src/guess/questions';

beforeAll(() => loadAllEmpires());

describe('Devine la suite', () => {
  it('pose, pour chaque étape suivante de chaque empire, une question valide qui ne dévoile pas la réponse', () => {
    const errors: string[] = [];
    for (const e of EMPIRES) {
      for (let i = 0; i + 1 < e.steps.length; i++) {
        const q = guessQuestion(e, i, i + 1);
        const where = `${e.id}/${e.steps[i + 1]!.id}`;
        if (q.choix.length < 2 || new Set(q.choix).size !== q.choix.length) errors.push(`${where} : choix en double`);
        if (q.bonne_reponse < 0 || q.bonne_reponse >= q.choix.length) errors.push(`${where} : bonne réponse hors des choix`);
        const good = q.choix[q.bonne_reponse]!;
        if (q.choix.length > 2 && good.length > 4 && q.question.includes(good)) errors.push(`${where} : l'énoncé contient la réponse « ${good} »`);
        if (q.etape_id !== e.steps[i + 1]!.id) errors.push(`${where} : question sur une autre étape`);
      }
    }
    expect(errors).toEqual([]);
  });

  it('est déterministe : même étape, même question', () => {
    const e = EMPIRES[0]!;
    expect(guessQuestion(e, 0, 1)).toEqual(guessQuestion(e, 0, 1));
  });
});
