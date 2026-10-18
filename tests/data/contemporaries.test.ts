import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DATA, empireIds, exists, publicFile, readJson, validLonLat, coordsOf, itAll } from './helpers';

const ids = empireIds();
const empires = new Map(ids.map((id) => [id, readJson(join(DATA, 'empires', id, 'timeline.json'))]));

describe.each(ids)('contemporains de « %s »', (eid) => {
  const E = empires.get(eid);
  const dir = publicFile(eid, 'contemporaries');
  const files = exists(dir) ? readdirSync(dir).filter((f) => f.endsWith('.geojson')) : [];

  it('dossier généré (npm run build:contemporaries)', () => {
    expect(exists(dir), `${eid}/contemporaries`).toBe(true);
  });

  itAll('%s : propriétés valides et empire F existant à la date', files, (file) => {
    const step = E.steps.find((s: any) => `${s.id}.geojson` === file);
    expect(step, `étape ${file} existe dans ${eid}`).toBeTruthy();
    const fc = readJson(join(dir, file));
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features.length).toBeGreaterThan(0);
    for (const f of fc.features) {
      const p = f.properties;
      const F = empires.get(p.empire);
      expect(F, `empire ${p.empire}`).toBeTruthy();
      expect(p.empire, 'pas lui-même').not.toBe(eid);
      expect(F.start <= step.year && step.year <= F.end, `${p.empire} existe en ${step.year}`).toBe(true);
      expect(p.empireName, 'nom court = avant la virgule').toBe(F.name.split(',')[0].trim());
      expect(p.color).toBe(F.color);
      const fs = F.steps.find((s: any) => s.id === p.stepId);
      expect(fs, `étape ${p.stepId} de ${p.empire}`).toBeTruthy();
      expect(fs.year).toBe(p.year);
      expect(fs.year).toBeLessThanOrEqual(step.year);
      expect(typeof p.name === 'string' && p.name.length > 0).toBe(true);
      expect(['core', 'vassal']).toContain(p.status);
      expect(['Polygon', 'MultiPolygon']).toContain(f.geometry.type);
      expect(coordsOf(f.geometry).every(validLonLat)).toBe(true);
    }
  });
});
