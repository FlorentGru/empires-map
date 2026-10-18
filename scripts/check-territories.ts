// Tableau de contrôle des territoires générés : repère les sauts de surface incohérents.
// Pour les empires à satellites (features avec `status`) : aires core / vassaux / alliés et points de contrôle
// (EmpireConfig.checkpoints, via booleanPointInPolygon).
// Lancé automatiquement à la fin de build-territories.ts ; utilisable seul :
//   npx tsx scripts/check-territories.ts [--empire <id>]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { paths, selectedEmpires } from './empires/index.ts';
import type { EmpireConfig, Status } from './empires/types.ts';

/** Seuil (en %) au-delà duquel une variation est signalée. */
const JUMP_WARN = 60;

type F = Feature<Polygon | MultiPolygon>;

function printTable(rows: string[][], rightFrom: number, rightTo: number): void {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)));
  const line = (r: string[]) => '| ' + r.map((c, i) => (i >= rightFrom && i <= rightTo ? c.padStart(widths[i]) : c.padEnd(widths[i]))).join(' | ') + ' |';
  console.log('\n' + line(rows[0]));
  console.log('|' + widths.map((w) => '-'.repeat(w + 2)).join('|') + '|');
  for (const r of rows.slice(1)) console.log(line(r));
}

const km2 = (n: number) => Math.round(n).toLocaleString('fr-FR');

export function checkTerritories(cfg: EmpireConfig): boolean {
  const dir = paths(cfg.id).territories;
  const loaded = new Map<string, FeatureCollection>();
  for (const step of cfg.steps) {
    const file = path.join(dir, `${step.id}.geojson`);
    if (fs.existsSync(file)) loaded.set(step.id, JSON.parse(fs.readFileSync(file, 'utf8')) as FeatureCollection);
  }
  const hasStatus = [...loaded.values()].some((fc) => fc.features.some((f) => f.properties?.status));
  console.log(`\nContrôle territoires — ${cfg.id}`);
  const head = ['id', 'année', 'sourceYear', 'entités'];
  if (hasStatus) head.push('aire core km²', 'vassaux km²', 'alliés km²', 'Δ% core');
  else head.push('surface km²', 'Δ% préc.');
  head.push('taille', '');
  const rows: string[][] = [head];
  const entityLines: string[] = [];
  let prev: number | null = null;
  let ok = true;
  for (const step of cfg.steps) {
    const fc = loaded.get(step.id);
    if (!fc) {
      rows.push([step.id, String(step.year), '—', '—', ...head.slice(4, -2).map(() => '—'), '—', 'MANQUANT']);
      ok = false;
      prev = null;
      continue;
    }
    const size = fs.statSync(path.join(dir, `${step.id}.geojson`)).size;
    const by: Record<string, number> = { core: 0, vassal: 0, allied: 0, none: 0 };
    for (const f of fc.features) by[f.properties?.status ?? 'none'] += turf.area(f) / 1e6;
    const total = by.core + by.vassal + by.allied + by.none;
    const refArea = hasStatus ? by.core : total;
    const years = [...new Set(fc.features.map((f) => f.properties?.sourceYear))].join('/');
    const delta = prev ? ((refArea - prev) / prev) * 100 : null;
    const flags: string[] = [];
    if (size > 150 * 1024) flags.push('> 150 Ko');
    if (delta !== null && Math.abs(delta) > JUMP_WARN) flags.push('saut');
    if (fc.features.length === 0 || total <= 0) {
      flags.push('VIDE');
      ok = false;
    }
    const dStr = delta === null ? '' : `${delta >= 0 ? '+' : ''}${delta.toFixed(0)} %`;
    const row = [step.id, String(step.year), years, String(fc.features.length)];
    if (hasStatus) row.push(km2(by.core), km2(by.vassal), km2(by.allied), dStr);
    else row.push(km2(total), dStr);
    row.push(`${(size / 1024).toFixed(1)} Ko`, flags.join(', '));
    rows.push(row);
    if (hasStatus)
      entityLines.push(
        `  ${step.id}: ` + fc.features.map((f) => `${f.properties?.name} (${f.properties?.status ?? '-'}, ${km2(turf.area(f) / 1e6)})`).join(' ; '),
      );
    prev = refArea;
  }
  printTable(rows, 4, head.length - 2);
  if (entityLines.length) {
    console.log('\nEntités par étape (nom, statut, km²)');
    for (const l of entityLines) console.log(l);
  }
  if (!checkPoints(cfg, loaded)) ok = false;
  return ok;
}

function checkPoints(cfg: EmpireConfig, loaded: Map<string, FeatureCollection>): boolean {
  const cps = cfg.checkpoints ?? [];
  if (cps.length === 0) return true;
  const idx = new Map(cfg.steps.map((s, i) => [s.id, i]));
  const bad: string[] = [];
  let n = 0;
  const grid: string[][] = [['point', ...cfg.steps.map((s) => s.id.split('-').pop()! + (cfg.steps.filter((x) => x.year === s.year).length > 1 ? '*' : ''))]];
  for (const cp of cps) {
    const a = cp.from ? idx.get(cp.from) : 0;
    const b = cp.to ? idx.get(cp.to) : cfg.steps.length - 1;
    if (a === undefined || b === undefined) {
      bad.push(`${cp.name} : plage d'étapes inconnue (${cp.from}..${cp.to})`);
      continue;
    }
    const pt = turf.point(cp.pt);
    const row = [cp.name];
    cfg.steps.forEach((step, i) => {
      const fc = loaded.get(step.id);
      const hits = (fc?.features ?? []).filter((f) => turf.booleanPointInPolygon(pt, f as F));
      const sts = hits.map((f) => (f.properties?.status as Status | undefined) ?? '-');
      const sym = sts.length === 0 ? '·' : sts.includes('core') ? 'C' : sts.includes('vassal') ? 'V' : sts.includes('allied') ? 'A' : '?';
      row.push(sym);
      if (i < a || i > b) return;
      n++;
      const okHere = cp.where === 'any' ? sts.length > 0 : cp.where === 'not-core' ? !sts.includes('core') : sts.includes(cp.where);
      if (!okHere) bad.push(`${cp.name} @ ${step.id} : attendu ${cp.where}, obtenu ${sts.length ? sts.join('/') : 'hors territoire'}`);
    });
    grid.push(row);
  }
  console.log('\nPoints de contrôle (C core, V vassal, A allié, · hors territoire)');
  const w = grid[0].map((_, c) => Math.max(...grid.map((r) => r[c].length)));
  for (const r of grid) console.log(r.map((v, c) => (c === 0 ? v.padEnd(w[c]) : v.padStart(w[c]))).join(' '));
  console.log(bad.length ? `✗ ${bad.length} point(s) de contrôle en échec sur ${n}` : `✓ ${n} vérifications de points de contrôle OK`);
  for (const b of bad) console.log(`  - ${b}`);
  return bad.length === 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let ok = true;
  for (const cfg of selectedEmpires()) if (!checkTerritories(cfg)) ok = false;
  if (!ok) process.exit(1);
}
