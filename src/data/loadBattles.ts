import TROOPS from '../../data/battles/troops.json';
import type { BattleScenario, BattleTroops, BattleTroopsFile } from '../types-battle';

/** Scénarios historiques : data/battles/scenarios/<stepId>.json (facultatifs), chargés à l'ouverture de la fenêtre. */
const loaders = import.meta.glob<BattleScenario>('../../data/battles/scenarios/*.json', { import: 'default' });

/** Effectifs d'une bataille jouable, ou undefined : le bouton « Voir la bataille » n'apparaît que s'il y en a. */
export function battleTroops(empireId: string, stepId: string): BattleTroops | undefined {
  return (TROOPS as BattleTroopsFile)[`${empireId}/${stepId}`];
}

/** Scénario historique de l'étape, s'il a été écrit. */
export async function loadBattleScenario(stepId: string): Promise<BattleScenario | undefined> {
  const load = loaders[`../../data/battles/scenarios/${stepId}.json`];
  return load ? await load() : undefined;
}
