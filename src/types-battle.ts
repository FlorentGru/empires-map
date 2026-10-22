/**
 * Simulation de bataille (fenêtre « Voir la bataille », src/battle/).
 * Une bataille est jouable si elle a une entrée dans data/battles/troops.json ; elle a un scénario historique
 * si data/battles/scenarios/<stepId>.json existe, sinon le moteur en déduit une simulation schématique.
 */

/** Effectifs d'une bataille jouable : un nombre d'hommes par armée, dans l'ordre de step.armies. */
export interface BattleTroops {
  troops: number[];
  /** Chiffres très incertains (sources antiques, estimations divergentes). */
  uncertain?: boolean;
  /** Paysage du lieu : sol, végétation et décor généré autour des éléments du scénario. */
  biome: BattleBiome;
}

/**
 * Paysage d'une bataille, d'après son lieu : désert (Mésopotamie, Levant), steppe, prairie (Europe tempérée),
 * forêt (Germanie), montagne (cols), méditerranée (garrigue, oliviers), mer (batailles navales).
 */
export type BattleBiome = 'desert' | 'steppe' | 'prairie' | 'foret' | 'montagne' | 'mediterranee' | 'mer';

/** data/battles/troops.json : clé « <empireId>/<stepId> ». */
export type BattleTroopsFile = Record<string, BattleTroops>;

/**
 * Terrain normalisé : x de 0 (gauche) à 100 (droite), y de 0 (haut) à 60 (bas).
 * Un point [x, y] désigne toujours une position sur ce terrain.
 */
export type BattlePoint = [number, number];

export type BattleTerrain = 'plaine' | 'colline' | 'foret' | 'riviere' | 'mer' | 'ville';

/**
 * Élément de décor dessiné (arbres, maisons, sillons… : src/battle/scenery.ts).
 * Lignes : `riviere`, `route`, `pont` (2 points : les deux culées). Polygones : tous les autres
 * (`village` = quelques maisons, `ville` = maisons serrées et clocher, `champ` = sillons, `rochers` = blocs épars).
 */
export interface BattleDecor {
  kind: 'riviere' | 'colline' | 'foret' | 'cote' | 'marais' | 'village' | 'ville' | 'route' | 'champ' | 'rochers' | 'pont';
  /** Polygone ou ligne, selon `kind`. */
  points: BattlePoint[];
  /** Nom affiché (« Aufide », « plateau de Pratzen »). */
  label?: string;
}

/**
 * `artillerie` : canons (une figurine = une pièce avec son servant). Une `infanterie` dont la faction porte
 * une arme à feu (fusil, arquebuse : voir src/battle/weapons.ts) tire au combat, les `archers` lancent des volées.
 */
export type BattleUnitKind = 'infanterie' | 'cavalerie' | 'archers' | 'elephants' | 'navires' | 'artillerie';
export type BattleFormation = 'ligne' | 'colonne' | 'carre' | 'coin';
export type BattleUnitState = 'marche' | 'combat' | 'fuite';
/**
 * Manière de combattre pendant une phase `combat` :
 * - `feu` (défaut des unités à distance : armes à feu, archers, artillerie) : sur place, cycle viser → tirer → recharger ;
 * - `baionnette` : charge, arme pointée en avant, sans tirer (assaut, mêlée) ; pour l'infanterie sans arme à feu, c'est la mêlée.
 */
export type BattleAction = 'feu' | 'baionnette';

/** Un bloc de troupes : ses figurines se répartissent autour de sa position selon sa formation. */
export interface BattleUnit {
  id: string;
  /** Index de l'armée (camp, faction, couleur) dans step.armies. */
  army: number;
  kind: BattleUnitKind;
  troops: number;
  /** Position de départ (centre du bloc). */
  at: BattlePoint;
  formation: BattleFormation;
  /** Nom affiché au survol ou en légende (« Cavalerie de Maharbal »). */
  label?: string;
}

/** Ce que fait une unité pendant une phase (interpolation depuis sa position à la fin de la phase précédente). */
export interface BattleMove {
  to?: BattlePoint;
  state?: BattleUnitState;
  /** Part des effectifs de départ perdue à la fin de la phase (cumulée, de 0 à 1). */
  losses?: number;
  /** Manière de combattre si `state` vaut `combat` (défaut : `feu` pour les unités à distance, sinon mêlée). */
  action?: BattleAction;
}

export interface BattlePhase {
  /** Une ou deux phrases de narration, affichées pendant la phase. */
  label: string;
  /** Durée en secondes à vitesse ×1. */
  duration: number;
  /** Mouvements par id d'unité ; une unité absente reste en place, dans son état précédent. */
  moves: Record<string, BattleMove>;
}

/** data/battles/scenarios/<stepId>.json : déroulement historique d'une bataille célèbre. */
export interface BattleScenario {
  terrain: BattleTerrain;
  decor?: BattleDecor[];
  units: BattleUnit[];
  phases: BattlePhase[];
  /** Sources du déroulement (« Polybe, Histoires, III, 113-117 »). */
  sources?: string[];
}
