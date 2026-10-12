// Tableau de contrôle des territoires générés : repère les sauts de surface incohérents.
// Lancé automatiquement à la fin de build-territories.ts ; utilisable seul :
//   npx tsx scripts/check-territories.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as turf from '@turf/turf';
import type { FeatureCollection } from 'geojson';
import { ROME_STEPS } from './steps.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'public/data/empires/rome/territories');

/** Seuil (en %) au-delà duquel une variation est signalée. */
const JUMP_WARN = 60;

export function checkTerritories(): boolean {
  const rows: string[][] = [['id', 'année', 'sourceYear', 'entités', 'surface km²', 'Δ% préc.', 'taille', '']];
  let prev: number | null = null;
  let ok = true;
  for (const step of ROME_STEPS) {
    const file = path.join(DIR, `${step.id}.geojson`);
    if (!fs.existsSync(file)) {
      rows.push([step.id, String(step.year), '—', '—', '—', '—', '—', 'MANQUANT']);
      ok = false;
      prev = null;
      continue;
    }
    const size = fs.statSync(file).size;
    const fc = JSON.parse(fs.readFileSync(file, 'utf8')) as FeatureCollection;
    const area = fc.features.reduce((s, f) => s + turf.area(f), 0) / 1e6;
    const years = [...new Set(fc.features.map((f) => f.properties?.sourceYear))].join('/');
    const delta = prev ? ((area - prev) / prev) * 100 : null;
    const flags: string[] = [];
    if (size > 150 * 1024) flags.push('> 150 Ko');
    if (delta !== null && Math.abs(delta) > JUMP_WARN) flags.push('saut');
    if (fc.features.length === 0 || area <= 0) {
      flags.push('VIDE');
      ok = false;
    }
    rows.push([
      step.id,
      String(step.year),
      years,
      String(fc.features.length),
      Math.round(area).toLocaleString('fr-FR'),
      delta === null ? '' : `${delta >= 0 ? '+' : ''}${delta.toFixed(0)} %`,
      `${(size / 1024).toFixed(1)} Ko`,
      flags.join(', '),
    ]);
    prev = area;
  }
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)));
  const line = (r: string[]) => '| ' + r.map((c, i) => (i >= 4 && i <= 6 ? c.padStart(widths[i]) : c.padEnd(widths[i]))).join(' | ') + ' |';
  console.log('\n' + line(rows[0]));
  console.log('|' + widths.map((w) => '-'.repeat(w + 2)).join('|') + '|');
  for (const r of rows.slice(1)) console.log(line(r));
  return ok;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (!checkTerritories()) process.exit(1);
}
