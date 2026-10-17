import { describe, expect, it } from 'vitest';
import { continentOf, eraOf, stepsShowing } from '../../src/lib/monumentInfo';
import type { Empire, TimelineStep } from '../../src/types';
import type { Monument } from '../../src/types-monument';

const colisee = { id: 'colisee', built: 80, location: [12.49, 41.89] } as Monument;
const step = (id: string, year: number, location: [number, number]) => ({ id, year, title: id, location }) as TimelineStep;
const rome = { id: 'rome', name: 'Rome, de la République à Byzance', steps: [step('cannes', -216, [16.1, 41.3]), step('trajan', 117, [12.5, 41.9]), step('hadrien', 130, [12.5, 41.9]), step('constantinople', 330, [28.9, 41]), step('chute-1453', 1453, [28.9, 41])] } as Empire;
const china = { id: 'china', name: 'Chine', steps: [step('han', 100, [108.9, 34.3])] } as Empire;

describe('galerie des monuments', () => {
  it('classe par époque et par continent', () => {
    expect(eraOf({ built: 80 })).toBe('antiquite');
    expect(eraOf({ built: 1345 })).toBe('moyen-age');
    expect(eraOf({ built: 1653 })).toBe('moderne');
    expect(continentOf([12.49, 41.89])).toBe('Europe');
    expect(continentOf([31.13, 29.98])).toBe('Afrique');
    expect(continentOf([116.39, 39.92])).toBe('Asie');
    expect(continentOf([-72.54, -13.16])).toBe('Amériques');
  });

  it('liste les étapes où le monument est debout et dans le cadre, une par siècle et par empire', () => {
    const s = stepsShowing(colisee, [rome, china]);
    expect(s.map((x) => x.stepId)).toEqual(['trajan', 'constantinople', 'chute-1453']);
  });
});
