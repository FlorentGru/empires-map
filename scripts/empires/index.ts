// Registre des empires + utilitaires communs (chemins, cohérence avec data/empires/<id>/timeline.json).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Position } from 'geojson';
import type { EmpireConfig } from './types.ts';
import { rome } from './rome.ts';
import { napoleon } from './napoleon.ts';
import { china } from './china.ts';
import { mongols } from './mongols.ts';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const EMPIRES: EmpireConfig[] = [rome, napoleon, china, mongols];

export function getEmpire(id: string): EmpireConfig {
  const e = EMPIRES.find((x) => x.id === id);
  if (!e) {
    console.error(`✗ empire inconnu « ${id} » (disponibles : ${EMPIRES.map((x) => x.id).join(', ')})`);
    process.exit(1);
  }
  return e;
}

/** Empires sélectionnés par `--empire <id>` (tous par défaut). */
export function selectedEmpires(argv: string[] = process.argv.slice(2)): EmpireConfig[] {
  const i = argv.indexOf('--empire');
  return i >= 0 ? [getEmpire(argv[i + 1])] : EMPIRES;
}

export function paths(id: string) {
  return {
    overrides: path.join(ROOT, 'overrides', id),
    territories: path.join(ROOT, 'public/data/empires', id, 'territories'),
    diffs: path.join(ROOT, 'public/data/empires', id, 'diffs'),
    morph: path.join(ROOT, 'public/data/empires', id, 'morph'),
    timeline: path.join(ROOT, 'data/empires', id, 'timeline.json'),
  };
}

interface TimelineStep {
  id: string;
  year: number;
  territory: string;
  location: Position;
}

export function loadTimeline(id: string): { steps: TimelineStep[] } {
  return JSON.parse(fs.readFileSync(paths(id).timeline, 'utf8')) as { steps: TimelineStep[] };
}

/** Les étapes de la config doivent correspondre exactement (ids, années, ordre) à la timeline. Échoue sinon. */
export function checkConsistency(cfg: EmpireConfig): void {
  const tl = loadTimeline(cfg.id).steps;
  const problems: string[] = [];
  const cfgIds = new Set(cfg.steps.map((s) => s.id));
  const tlIds = new Set(tl.map((s) => s.id));
  for (const s of tl) if (!cfgIds.has(s.id)) problems.push(`étape « ${s.id} » de la timeline absente de la config`);
  for (const s of cfg.steps) if (!tlIds.has(s.id)) problems.push(`étape « ${s.id} » de la config absente de la timeline`);
  if (problems.length === 0) {
    cfg.steps.forEach((s, i) => {
      const t = tl[i];
      if (t.id !== s.id) problems.push(`ordre : position ${i + 1} = « ${s.id} » (config) / « ${t.id} » (timeline)`);
      if (t.year !== s.year) problems.push(`année de « ${s.id} » : ${s.year} (config) / ${t.year} (timeline)`);
      if (t.territory !== s.id) problems.push(`« ${s.id} » : territory = « ${t.territory} » dans la timeline (attendu l'id d'étape)`);
    });
  }
  if (problems.length) {
    console.error(`✗ ${cfg.id} : config incohérente avec data/empires/${cfg.id}/timeline.json`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
}
