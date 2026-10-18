import { describe, expect, it } from 'vitest';
import { numberToFrench } from '../../src/story/numbers';
import { spokenDate } from '../../src/story/script';

describe('numberToFrench', () => {
  const cases: [number, string][] = [
    [0, 'zéro'],
    [1, 'un'],
    [16, 'seize'],
    [17, 'dix-sept'],
    [21, 'vingt et un'],
    [71, 'soixante et onze'],
    [72, 'soixante-douze'],
    [80, 'quatre-vingts'],
    [81, 'quatre-vingt-un'],
    [91, 'quatre-vingt-onze'],
    [99, 'quatre-vingt-dix-neuf'],
    [100, 'cent'],
    [200, 'deux cents'],
    [216, 'deux cent seize'],
    [202, 'deux cent deux'],
    [1000, 'mille'],
    [1453, 'mille quatre cent cinquante-trois'],
    [1980, 'mille neuf cent quatre-vingts'],
    [1805, 'mille huit cent cinq'],
    [2000, 'deux mille'],
    [2026, 'deux mille vingt-six'],
  ];
  it.each(cases)('%i → %s', (n, s) => expect(numberToFrench(n)).toBe(s));
});

describe('spokenDate', () => {
  it('avant J.-C. et après', () => {
    expect(spokenDate(-216)).toBe("En l'an deux cent seize avant Jésus-Christ");
    expect(spokenDate(1805)).toBe('En mille huit cent cinq');
    expect(spokenDate(476)).toBe("En l'an quatre cent soixante-seize");
  });
});
