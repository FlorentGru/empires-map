import { describe, expect, it } from 'vitest';
import { pickSnapshot, presentReligions, religionLine, snapshotYear, withReligions } from '../../src/lib/religions';

const NAMES = ['world_bc500', 'world_bc1', 'world_100', 'world_1000', 'world_1279'];

describe('pickSnapshot', () => {
  it('lit les années des instantanés', () => {
    expect(snapshotYear('world_bc500')).toBe(-500);
    expect(snapshotYear('world_1279')).toBe(1279);
  });
  it("prend l'instantané le plus proche, l'antérieur préféré de justesse", () => {
    expect(pickSnapshot(-509, NAMES)).toBe('world_bc500'); // seul candidat après, avant absent
    expect(pickSnapshot(-100, NAMES)).toBe('world_bc1');
    expect(pickSnapshot(60, NAMES)).toBe('world_100'); // 61 ans après bc1 contre 40 avant 100 : le suivant est plus proche
    expect(pickSnapshot(1500, NAMES)).toBe('world_1279');
  });
  it('rend null sans instantané', () => expect(pickSnapshot(100, [])).toBeNull());
});

describe('religions des entités', () => {
  const geometry = { type: 'Polygon' as const, coordinates: [] };
  const fs = [
    { geometry, properties: { name: 'Gaule' } },
    { geometry, properties: { name: 'Inconnue' } },
  ];
  const out = withReligions(fs, { Gaule: { religion: 'polytheisme', minorities: ['judaisme'] } });
  it('ajoute la religion aux entités connues seulement', () => {
    expect(out[0]!.properties).toEqual({ name: 'Gaule', religion: 'polytheisme', minorities: ['judaisme'] });
    expect(out[1]!.properties).toEqual({ name: 'Inconnue' });
  });
  it("liste les religions présentes dans l'ordre du contrat, sans doublon", () => {
    const f = (religion?: string) => ({ properties: { religion } });
    expect(
      presentReligions([
        [f('islam'), f('catholicisme')],
        [f('islam'), f()],
      ]),
    ).toEqual(['catholicisme', 'islam']);
    expect(presentReligions([])).toEqual([]);
  });
  it('écrit la ligne de la fiche', () => {
    expect(religionLine({ religion: 'catholicisme', minorities: ['judaisme'], note: 'Après 380.' })).toBe(
      'Religion : Catholicisme · minorités : Judaïsme. Après 380.',
    );
    expect(religionLine({ religion: 'islam' })).toBe('Religion : Islam.');
  });
});
