import { describe, expect, it } from 'vitest';
import { DESCRIPTION_MAX, idOfSlug, pageDescription, pageTitle, parsePath, pathOf, plainText, slugOf, truncate, type Route } from '../../src/lib/seo';

describe('chemins des pages', () => {
  const routes: Route[] = [
    { kind: 'home' },
    { kind: 'empire', empire: 'rome' },
    { kind: 'empire', empire: 'china' },
    { kind: 'step', empire: 'china', step: 'yamen-1279' },
    { kind: 'step', empire: 'saint-empire', step: 'otton-962' },
    { kind: 'hub', hub: 'monuments' },
    { kind: 'hub', hub: 'empires' },
  ];

  it('aller-retour route → chemin → route', () => {
    for (const r of routes) expect(parsePath(pathOf(r))).toEqual(r);
  });

  it('slugs français et chemins attendus', () => {
    expect(slugOf('china')).toBe('chine');
    expect(idOfSlug('chine')).toBe('china');
    expect(idOfSlug('rome')).toBe('rome');
    expect(pathOf({ kind: 'step', empire: 'china', step: 'yamen-1279' })).toBe('chine/yamen-1279/');
    expect(pathOf({ kind: 'home' })).toBe('');
  });

  it('tolère l’absence de « / » final et les doubles barres', () => {
    expect(parsePath('rome/cannes-216')).toEqual({ kind: 'step', empire: 'rome', step: 'cannes-216' });
    expect(parsePath('//monuments')).toEqual({ kind: 'hub', hub: 'monuments' });
  });
});

describe('textes des pages', () => {
  const empire = { name: 'Rome, de la République à Byzance', start: -509, end: 1453, description: 'Une **cité** du Latium.' };
  const step = { year: -216, title: 'Cannes, le désastre', summary: 'Le 2 août 216, **Hannibal** encercle et anéantit l’armée romaine.' };

  it('titre d’étape avec l’année et l’empire', () => {
    expect(pageTitle({ kind: 'step', empire: 'rome', step: 'cannes-216' }, empire, step)).toBe(
      'Cannes, le désastre (216 av. J.-C.) – Rome, de la République à Byzance',
    );
  });

  it('description en texte brut, datée, bornée', () => {
    const d = pageDescription({ kind: 'step', empire: 'rome', step: 'cannes-216' }, empire, step);
    expect(d.startsWith('216 av. J.-C. : Le 2 août 216, Hannibal')).toBe(true);
    expect(d.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it('plainText et truncate', () => {
    expect(plainText('Un **gras**, un [lien](https://x.fr) et _italique_.')).toBe('Un gras, un lien et italique.');
    const t = truncate('un deux trois quatre cinq six sept huit', 20);
    expect(t.length).toBeLessThanOrEqual(20);
    expect(t.endsWith('…')).toBe(true);
    expect(truncate('court', 20)).toBe('court');
  });
});
