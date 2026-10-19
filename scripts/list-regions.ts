// Régions (entités nommées des territoires) d'un empire : statut, années de 1re/dernière apparition, étapes.
// Sert de brief pour rédiger data/empires/<id>/regions.json, et --sync y recopie les années.
// Usage : npx tsx scripts/list-regions.ts <id> [--sync]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Empire, TerritoryProperties } from '../src/types.ts';
import type { RegionInfo } from '../src/types-region.ts';
import { regionSpans } from '../src/lib/regions.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv[2];
if (!id) throw new Error('Usage : npx tsx scripts/list-regions.ts <id> [--sync]');

const empire = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/empires', id, 'timeline.json'), 'utf8')) as Empire;
const entitiesOf = (territory: string): TerritoryProperties[] => {
  const file = path.join(ROOT, 'public/data/empires', id, 'territories', `${territory}.geojson`);
  if (!fs.existsSync(file)) return [];
  return (JSON.parse(fs.readFileSync(file, 'utf8')) as { features: { properties: TerritoryProperties }[] }).features.map((f) => f.properties);
};
const spans = regionSpans(empire.steps, entitiesOf);

if (process.argv.includes('--sync')) {
  const file = path.join(ROOT, 'data/empires', id, 'regions.json');
  const list = JSON.parse(fs.readFileSync(file, 'utf8')) as RegionInfo[];
  for (const r of list) {
    const s = spans.find((x) => x.name === r.name);
    if (s) r.years = s.years;
    else console.warn(`absente des territoires : ${r.name}`);
  }
  // Années sur une ligne : [début, fin].
  fs.writeFileSync(file, JSON.stringify(list, null, 2).replace(/\[\s+(-?\d+),\s+(-?\d+)\s+\]/g, '[$1, $2]') + '\n');
  console.log(`${file} : années synchronisées (${list.length} régions)`);
} else {
  console.log(JSON.stringify(spans, null, 1));
}
