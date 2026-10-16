// Surfaces par étape et apogée (plus grande surface) de chaque empire.
//   data/empires/<id>/stats.json  { areas: { [stepId]: km² }, apogee: stepId }
// Surface = somme des entités « core » (ou sans statut) du territoire de l'étape ;
// vassaux et alliés exclus. Lit les territoires déjà générés, ne recalcule aucune géométrie.
// Usage : npx tsx scripts/build-stats.ts [--empire <id>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { Empire, EmpireStats, TerritoryProperties } from '../src/types.ts';
import { largestStep } from '../src/lib/apogee.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EMPIRES_DATA = path.join(ROOT, 'data/empires');
const EMPIRES_PUB = path.join(ROOT, 'public/data/empires');

const arg = process.argv.indexOf('--empire');
const only = arg >= 0 ? process.argv[arg + 1] : null;

const ids = fs.readdirSync(EMPIRES_DATA).filter((id) => !id.startsWith('_') && (!only || id === only));
for (const id of ids) {
  const empire = JSON.parse(fs.readFileSync(path.join(EMPIRES_DATA, id, 'timeline.json'), 'utf8')) as Empire;
  const areas: Record<string, number> = {};
  for (const step of empire.steps) {
    const file = path.join(EMPIRES_PUB, id, 'territories', `${step.territory}.geojson`);
    if (!fs.existsSync(file)) continue;
    const fc = JSON.parse(fs.readFileSync(file, 'utf8')) as FeatureCollection<Polygon | MultiPolygon, TerritoryProperties>;
    const core = fc.features.filter((f: Feature<Polygon | MultiPolygon, TerritoryProperties>) => (f.properties.status ?? 'core') === 'core');
    areas[step.id] = Math.round(core.reduce((sum, f) => sum + turf.area(f), 0) / 1e6);
  }
  const apogee = largestStep(empire.steps.map((s) => s.id), areas);
  if (!apogee) { console.warn(`${id} : aucun territoire mesuré, stats ignorées`); continue; }
  const stats: EmpireStats = { areas, apogee };
  fs.writeFileSync(path.join(EMPIRES_DATA, id, 'stats.json'), JSON.stringify(stats, null, 1) + '\n');
  const step = empire.steps.find((s) => s.id === apogee)!;
  console.log(`${id} : apogée ${step.year} « ${step.title} » — ${areas[apogee].toLocaleString('fr-FR')} km²${empire.apogee ? ` (surcharge timeline : ${empire.apogee.stepId})` : ''}`);
}
