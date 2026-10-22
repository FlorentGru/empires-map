/** « Où la voir » : les batailles jouables qui utilisent une unité de la galerie (fonction pure, testée). */
import type { ArmyMove } from '../types';
import type { BattleScenario } from '../types-battle';
import { genericScenario } from './engine';
import type { UnitInfo } from './unitInfo';

/** Une bataille jouable : son étape, ses effectifs et, si elle existe, son scénario historique. */
export interface BattleSource {
  empireId: string;
  stepId: string;
  title: string;
  year: number;
  armies?: ArmyMove[];
  troops: number[];
  scenario?: BattleScenario;
}

export interface BattleRef {
  empireId: string;
  stepId: string;
  title: string;
  year: number;
  /** Scénario écrit à la main (sinon : simulation schématique déduite des armées). */
  historic: boolean;
}

/** Vrai si une unité du scénario (ou une de ses phases) correspond à ce que décrit la fiche. */
function uses(info: UnitInfo, scenario: BattleScenario, year: number): boolean {
  const { kind, formation, action, yearMin, yearMax } = info.match;
  if (yearMin !== undefined && year < yearMin) return false;
  if (yearMax !== undefined && year > yearMax) return false;
  if (action) return scenario.phases.some((p) => Object.values(p.moves).some((m) => m.action === action));
  return scenario.units.some((u) => (!kind || u.kind === kind) && (!formation || u.formation === formation));
}

/** Batailles où apparaît l'unité, de la plus ancienne à la plus récente. */
export function battlesUsing(info: UnitInfo, sources: BattleSource[]): BattleRef[] {
  const out: BattleRef[] = [];
  for (const s of sources) {
    const scenario = s.scenario ?? genericScenario({ armies: s.armies, year: s.year }, s.troops);
    if (uses(info, scenario, s.year)) out.push({ empireId: s.empireId, stepId: s.stepId, title: s.title, year: s.year, historic: !!s.scenario });
  }
  return out.sort((a, b) => a.year - b.year || a.empireId.localeCompare(b.empireId));
}
