import { describe, expect, it } from 'vitest';
import { monumentSpan, standingAt } from '../../src/map/monumentLayers';
import type { Monument } from '../../src/types-monument';

const m = (id: string, built: number, until?: number) => ({ id, name: id, location: [0, 0], built, until, kind: 'temple', civilization: '', description: '', wikipedia: '' }) as Monument;
const list = [m('pyramides', -2560), m('phare', -280, 1323), m('notre-dame', 1345)];

describe('monuments', () => {
  it('ne montre que les monuments debout à la date', () => {
    expect(standingAt(list, 117).map((x) => x.id)).toEqual(['pyramides', 'phare']);
    expect(standingAt(list, 1323).map((x) => x.id)).toEqual(['pyramides']);
    expect(standingAt(list, 1805).map((x) => x.id)).toEqual(['pyramides', 'notre-dame']);
  });

  it('formate la période', () => {
    expect(monumentSpan({ built: 1345 })).toBe('depuis 1345');
    expect(monumentSpan({ built: -280, until: 1323 })).toBe('280 av. J.-C. – 1323');
  });
});
