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
 * (`village` = quelques maisons, `ville` = maisons serrées et clocher, `champ` = sillons, `rochers` = blocs épars,
 * `pieux` = pieux plantés dans le lit d'un fleuve : cachés à marée haute, visibles et dangereux à marée basse).
 */
export interface BattleDecor {
  kind: 'riviere' | 'colline' | 'foret' | 'cote' | 'marais' | 'village' | 'ville' | 'route' | 'champ' | 'rochers' | 'pont' | 'pieux';
  /** Polygone ou ligne, selon `kind`. */
  points: BattlePoint[];
  /** Nom affiché (« Aufide », « plateau de Pratzen »). */
  label?: string;
}

/**
 * `artillerie` : canons (une figurine = une pièce avec son servant). Une `infanterie` dont la faction porte
 * une arme à feu (fusil, arquebuse : voir src/battle/weapons.ts) tire au combat, les `archers` lancent des volées.
 */
/**
 * Montures et engins (dessinés dans src/battle/) : `cavalerie` = cavaliers sur chevaux ; `archers-montes` = cavaliers
 * des steppes qui tirent en mouvement ; `elephants` = éléphants de guerre avec cornac ; `chars` = chars (à faux) attelés ;
 * `navires` = galères (avant 1600) ou vaisseaux ; `brulots` = navires incendiaires lancés contre la flotte ennemie.
 */
export type BattleUnitKind = 'infanterie' | 'cavalerie' | 'archers' | 'archers-montes' | 'elephants' | 'chars' | 'navires' | 'brulots' | 'artillerie';
/**
 * Disposition des figurines d'un bloc (et poses propres à la formation) :
 * - `ligne` : large et peu profonde ; `mince` : ligne sur 2 rangs (ligne britannique) ; `colonne` : étroite et profonde (colonne d'assaut) ;
 * - `carre` : carré creux, figurines tournées vers l'extérieur (infanterie contre cavalerie) ; `coin` : triangle pointe en avant (cavalerie) ;
 * - `phalange` : bloc profond et serré, sarisses baissées sur les 5 premiers rangs, levées derrière ;
 * - `tortue` : bloc serré, boucliers en toit au-dessus des têtes ;
 * - `quinconce` : manipules en damier sur trois lignes (hastats, princes, triaires) ;
 * - `tercio` : piques au centre, manches d'arquebusiers aux quatre coins ;
 * - `croissant` : ligne bombée vers l'ennemi (centre de Cannes) ; `tirailleurs` : ordre dispersé, figurines espacées.
 */
export type BattleFormation = 'ligne' | 'mince' | 'colonne' | 'carre' | 'coin' | 'phalange' | 'tortue' | 'quinconce' | 'tercio' | 'croissant' | 'tirailleurs';
export type BattleUnitState = 'marche' | 'combat' | 'fuite';
/**
 * Manière de combattre pendant une phase `combat` :
 * - `feu` (défaut des unités à distance : armes à feu, archers, artillerie) : sur place, cycle viser → tirer → recharger ;
 *   les `archers-montes` tirent aussi en mouvement ;
 * - `baionnette` : charge, arme pointée en avant, sans tirer (assaut, mêlée) ; pour l'infanterie sans arme à feu, c'est la mêlée ;
 * - `feinte` (cavalerie, archers montés) : fuite simulée — l'unité tourne le dos et recule comme en `fuite`, sans pertes
 *   supplémentaires, puis fait demi-tour à la phase suivante.
 */
export type BattleAction = 'feu' | 'baionnette' | 'feinte';

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
  /**
   * Navires (`navires`, `brulots`) : type de bâtiment ; défaut selon l'année (galère avant 1600, vaisseau ensuite).
   * `galion` = grand voilier de la fin du XVIe siècle (Armada) ; `jonque` = navire chinois, coréen ou japonais ;
   * `barque` = embarcation légère à rames (flottilles vietnamiennes, brûlots).
   */
  ship?: 'galere' | 'galion' | 'vaisseau' | 'jonque' | 'barque';
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
  /** Batailles fluviales ou côtières : niveau de l'eau pendant la phase (la marée qui baisse découvre les `pieux`). */
  tide?: 'haute' | 'basse';
}

/** data/battles/scenarios/<stepId>.json : déroulement historique d'une bataille célèbre. */
export interface BattleScenario {
  terrain: BattleTerrain;
  /** Temps qu'il fait : `vent` (mer agitée, fumées et voiles couchées), `tempete` (pluie, creux, navires qui sombrent : typhon de 1281). */
  weather?: 'calme' | 'vent' | 'tempete';
  decor?: BattleDecor[];
  units: BattleUnit[];
  phases: BattlePhase[];
  /** Sources du déroulement (« Polybe, Histoires, III, 113-117 »). */
  sources?: string[];
}
