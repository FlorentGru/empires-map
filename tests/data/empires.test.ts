import { describe, expect, it } from 'vitest';
import { ARCHETYPES, FACTIONS } from '../../src/types';
import { coordsOf, empireIds, exists, DATA, pngHeader, publicFile, readJson, size, validLonLat } from './helpers';
import { join } from 'node:path';

const ids = empireIds();

it('au moins un empire disponible', () => expect(ids.length).toBeGreaterThan(0));

describe.each(ids)('empire « %s »', (empireId) => {
  const empire = readJson(join(DATA, 'empires', empireId, 'timeline.json'));
  const steps: any[] = empire.steps ?? [];
  const at = (s: any) => `${empireId}/${s.id}`;

  it('champs requis et identifiant du dossier', () => {
    expect(empire.id, 'id = nom du dossier').toBe(empireId);
    for (const k of ['name', 'color', 'description']) expect(typeof empire[k], `${empireId}.${k}`).toBe('string');
    expect(empire.color).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    expect(Number.isInteger(empire.start) && Number.isInteger(empire.end)).toBe(true);
    expect(empire.start).toBeLessThan(empire.end);
    expect(steps.length).toBeGreaterThan(1);
  });

  it('étapes : ids uniques, triées, sans année 0, dans [start, end]', () => {
    const seen = new Set<string>();
    steps.forEach((s, i) => {
      expect(typeof s.id, `étape #${i}`).toBe('string');
      expect(seen.has(s.id), `id en double : ${at(s)}`).toBe(false);
      seen.add(s.id);
      expect(Number.isInteger(s.year), `année entière : ${at(s)}`).toBe(true);
      expect(s.year, `année 0 interdite : ${at(s)}`).not.toBe(0);
      expect(s.year, `${at(s)} < start`).toBeGreaterThanOrEqual(empire.start);
      expect(s.year, `${at(s)} > end`).toBeLessThanOrEqual(empire.end);
      if (i > 0) expect(s.year, `étapes non triées à ${at(s)}`).toBeGreaterThanOrEqual(steps[i - 1].year);
    });
  });

  it('étapes : champs requis', () => {
    for (const s of steps) {
      for (const k of ['title', 'type', 'summary', 'details', 'territory'])
        expect(typeof s[k] === 'string' && s[k].length > 0, `${at(s)}.${k} manquant`).toBe(true);
      expect(Array.isArray(s.consequences), `${at(s)}.consequences`).toBe(true);
      expect(Array.isArray(s.sources), `${at(s)}.sources`).toBe(true);
      if (s.location) expect(s.location.length === 2 && validLonLat(s.location), `${at(s)}.location`).toBe(true);
    }
  });

  it('territoires : GeoJSON existant, non vide, (Multi)Polygon, coordonnées valides', () => {
    for (const s of steps) {
      const f = publicFile(empireId, 'territories', `${s.territory}.geojson`);
      expect(exists(f), `fichier manquant : ${f}`).toBe(true);
      const fc = readJson(f);
      expect(fc.features?.length, `${at(s)} : territoire vide`).toBeGreaterThan(0);
      for (const [i, ft] of fc.features.entries()) {
        expect(['Polygon', 'MultiPolygon'], `${at(s)} feature ${i}`).toContain(ft.geometry?.type);
        const bad = coordsOf(ft.geometry).find((c) => !validLonLat(c));
        expect(bad, `${at(s)} feature ${i} : coordonnée hors limites`).toBeUndefined();
      }
    }
  });

  it('transitions : diff, SDF (png + json) et voisins présents et valides', () => {
    for (const s of steps.slice(1)) {
      const diff = publicFile(empireId, 'diffs', `${s.id}.geojson`);
      expect(exists(diff), `diff manquant : ${diff}`).toBe(true);
      const png = publicFile(empireId, 'sdf', `${s.id}.png`);
      const json = publicFile(empireId, 'sdf', `${s.id}.json`);
      expect(exists(png), `SDF png manquant : ${png}`).toBe(true);
      expect(exists(json), `SDF json manquant : ${json}`).toBe(true);
      const h = pngHeader(png);
      expect(h, `PNG invalide : ${png}`).not.toBeNull();
      expect(h!.colorType, `${png} : doit être RGB sans alpha (type 2)`).toBe(2);
      expect(h!.bitDepth, `${png} : 8 bits`).toBe(8);
      const meta = readJson(json);
      expect(meta.bounds?.length, `${json} : bounds`).toBe(4);
      for (const p of meta.bounds) expect(p.length === 2 && validLonLat(p), `${json} : bound invalide`).toBe(true);
      expect(meta.width, `${json}.width`).toBeGreaterThan(0);
      expect(meta.height, `${json}.height`).toBeGreaterThan(0);
      expect([meta.width, meta.height], `${json} vs PNG`).toEqual([h!.width, h!.height]);
    }
    for (const s of steps) {
      const nb = publicFile(empireId, 'neighbors', `${s.id}.geojson`);
      expect(exists(nb), `voisins manquants : ${nb}`).toBe(true);
    }
  });

  it('figures : factions, archétypes connus, citations ≤ 120 caractères', () => {
    for (const s of steps)
      for (const f of s.figures ?? []) {
        expect(ARCHETYPES, `${at(s)} figure « ${f.name} » : archétype`).toContain(f.archetype);
        expect(FACTIONS, `${at(s)} figure « ${f.name} » : faction`).toContain(f.faction);
        if (f.quote) expect(f.quote.length, `${at(s)} citation de « ${f.name} » (${f.quote.length} car.)`).toBeLessThanOrEqual(120);
      }
  });

  it('armées : faction connue, path de 2 à 8 points, chaînage des ids', () => {
    const last = new Map<string, [number, number]>();
    for (const s of steps)
      for (const a of s.armies ?? []) {
        expect(FACTIONS, `${at(s)} armée « ${a.side} »`).toContain(a.faction);
        expect(a.path.length, `${at(s)} armée « ${a.side} » : taille du path`).toBeGreaterThanOrEqual(2);
        expect(a.path.length, `${at(s)} armée « ${a.side} » : taille du path`).toBeLessThanOrEqual(8);
        for (const p of a.path) expect(validLonLat(p), `${at(s)} armée « ${a.side} » : point hors limites`).toBe(true);
        if (a.id) {
          const prev = last.get(a.id);
          if (prev) {
            const [x, y] = a.path[0];
            expect(Math.abs(x - prev[0]) <= 0.05 && Math.abs(y - prev[1]) <= 0.05, `${at(s)} armée « ${a.id} » : path[0] ${[x, y]} ≠ dernier point précédent ${prev}`).toBe(true);
          }
          last.set(a.id, a.path[a.path.length - 1]);
        }
      }
  });

  it('périodes : ordonnées et couvrant [start, end]', () => {
    const per: any[] = empire.periods ?? [];
    if (per.length === 0) return;
    expect(per[0].start, `${empireId} : première période`).toBeLessThanOrEqual(empire.start);
    expect(per[per.length - 1].end, `${empireId} : dernière période`).toBeGreaterThanOrEqual(empire.end);
    per.forEach((p, i) => {
      expect(p.start, `période ${p.id}`).toBeLessThan(p.end);
      if (i > 0) {
        expect(p.start, `période ${p.id} chevauche ${per[i - 1].id}`).toBeGreaterThanOrEqual(per[i - 1].end);
        expect(p.start, `trou entre ${per[i - 1].id} et ${p.id}`).toBeLessThanOrEqual(per[i - 1].end);
      }
    });
    expect(new Set(per.map((p) => p.id)).size, 'ids de période uniques').toBe(per.length);
  });
});
