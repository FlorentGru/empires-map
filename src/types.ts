// Contrat de données partagé entre l'historien, le cartographe et le front.

export type EventType = 'bataille' | 'traité' | 'politique' | 'fondation' | 'chute' | 'réforme';

export interface Source {
  label: string;
  url?: string;
}

/** Données de bataille : ancrage pour le futur mode « rejouer la bataille ». */
export interface BattleInfo {
  belligerents: string[];
  commanders: string[];
  outcome: string;
  forces?: string;
  losses?: string;
}

export interface TimelineStep {
  /** Identifiant stable, ex. "zama-202" ou "trajan-117". */
  id: string;
  /** Année ; négatif = av. J.-C. (pas d'année 0). */
  year: number;
  title: string;
  type: EventType;
  /** [longitude, latitude] du lieu de l'événement. */
  location?: [number, number];
  zoom?: number;
  /** 1 à 2 phrases. */
  summary: string;
  /** Récit détaillé en markdown (150 à 300 mots). */
  details: string;
  consequences: string[];
  /** Nom (sans extension) du GeoJSON dans public/data/empires/<empire>/territories/. */
  territory: string;
  sources: Source[];
  battle?: BattleInfo;
  /** Armées animées qui convergent vers le champ de bataille. */
  armies?: ArmyMove[];
  /** Personnages d'époque (politique, traité, réforme… ; 2 pour un traité). */
  figures?: Figure[];
}

/** Métadonnées légères d'un empire, connues dès le démarrage (virtual:empire-index) ; la timeline se charge à la demande. */
export interface EmpireMeta {
  id: string;
  name: string;
  color: string;
  start: number;
  end: number;
  description: string;
}

export interface Empire {
  id: string;
  name: string;
  /** Couleur principale du territoire (hex). */
  color: string;
  start: number;
  end: number;
  description: string;
  /** Vue initiale (défaut : Méditerranée). */
  view?: { center: [number, number]; zoom: number };
  /**
   * Cadre des voisins dessinés [[ouest, sud], [est, nord]], utilisé au build par scripts/build-neighbors.ts.
   * Ne limite JAMAIS la caméra : chaque empire peut se promener sur toute la carte pour voir ses contemporains.
   */
  bounds?: [[number, number], [number, number]];
  /** Grandes périodes (« chapitres ») affichées en bandes sur la frise et annoncées en mode Histoire. */
  periods?: EmpirePeriod[];
  /** Surcharge de l'apogée (par défaut : l'étape de plus grande surface, calculée dans stats.json). */
  apogee?: { stepId: string; note?: string };
  /** Surfaces par étape, générées par scripts/build-stats.ts (data/empires/<id>/stats.json). */
  stats?: EmpireStats;
  steps: TimelineStep[];
}

/** data/empires/<id>/stats.json : surface « core » (km²) de chaque étape et étape de plus grande surface. */
export interface EmpireStats {
  areas: Record<string, number>;
  apogee: string;
}

export interface EmpirePeriod {
  id: string;
  name: string;
  start: number;
  end: number;
  /** Couleur de la bande sur la frise (hex). */
  color: string;
  /** 1 à 3 phrases de présentation, lues en mode Histoire au début de la période. */
  summary: string;
}

/** Entrée du catalogue de tous les empires (data/empires-catalog.json), disponibles ou à venir. */
export interface EmpireCatalogEntry {
  /** Égal à l'id du dossier data/empires/<id> quand l'empire est disponible. */
  id: string;
  name: string;
  start: number;
  end: number;
  region: string;
}

/** Propriétés de chaque Feature d'un GeoJSON de territoire. */
export interface TerritoryProperties {
  empire: string;
  /** Ex. "Empire romain d'Occident", "Empire byzantin". */
  name: string;
  /** Année de l'instantané historical-basemaps utilisé, ou de l'override. */
  sourceYear: number;
  /** core = territoire de l'empire ; vassal = État satellite/client ; allied = allié contraint. */
  status?: 'core' | 'vassal' | 'allied';
}

/** Nom d'une ville sur une période (bornes incluses ; absentes = ouvert). */
export interface CityName {
  name: string;
  from?: number;
  to?: number;
}

/** Ville affichée sur la carte (data/cities.json : City[]). */
export interface City {
  id: string;
  /** Nom actuel, affiché entre parenthèses : « Lutetia (Paris) ». */
  modern: string;
  /** Noms d'époque successifs, triés chronologiquement. */
  names: CityName[];
  /** [longitude, latitude]. */
  coords: [number, number];
  /** Année de fondation (ou première mention) ; ville masquée avant. */
  founded: number;
  /** Année de destruction/abandon ; ville masquée après. */
  destroyed?: number;
  /** 1 = majeure (toujours visible), 2 = importante, 3 = secondaire (zoom ≥ 5). */
  rank: 1 | 2 | 3;
  /** Périodes où la ville est capitale de l'empire suivi. */
  capitalOf?: { empire: string; from: number; to: number }[];
  /** Si présent, la ville n'est affichée que pour ces empires (ex. lieux de bataille). */
  empires?: string[];
}

/**
 * Diff précalculé entre une étape et la précédente :
 * public/data/empires/<empire>/diffs/<stepId>.geojson
 * (FeatureCollection, properties { kind: 'gained' | 'lost' }).
 */
export type DiffKind = 'gained' | 'lost';

/**
 * Animation « frontière qui glisse » entre une étape et la précédente :
 * public/data/empires/<empire>/morph/<stepId>.geojson
 * - kind 'stable' : partie commune aux deux étapes (t = 0)
 * - kind 'gained' : bande gagnée ; t ∈ ]0,1] = distance normalisée à l'ANCIENNE frontière
 *   (apparaît quand la progression p ≥ t)
 * - kind 'lost'   : bande perdue ; t ∈ ]0,1] = distance normalisée à la NOUVELLE frontière
 *   (disparaît quand p ≥ 1 − t, donc les bords extérieurs reculent en premier)
 */
export interface MorphProperties {
  kind: 'stable' | 'gained' | 'lost';
  t: number;
}

/** Peuples représentés par une figurine dédiée (src/figures/registry.ts). */
export type Faction =
  | 'romains'
  | 'latins'
  | 'samnites'
  | 'carthaginois'
  | 'gaulois'
  | 'grecs-macedoniens'
  | 'germains'
  | 'parthes-perses'
  | 'egyptiens'
  | 'daces'
  | 'goths-vandales'
  | 'arabes'
  | 'turcs-seldjoukides'
  | 'croises-latins'
  | 'ottomans'
  | 'byzantins'
  // Époque napoléonienne
  | 'francais'
  | 'britanniques'
  | 'autrichiens'
  | 'prussiens'
  | 'russes'
  | 'espagnols'
  | 'portugais'
  | 'polonais'
  // Asie orientale et steppes
  | 'chinois'
  | 'xiongnu'
  | 'mongols'
  | 'jurchens'
  | 'mandchous'
  | 'japonais'
  | 'coreens'
  | 'tibetains'
  | 'vietnamiens'
  | 'turcs-gokturks'
  | 'khitans'
  | 'ouighours'
  // Empire mongol
  | 'tangoutes'
  | 'khwarezmiens'
  | 'rus'
  | 'chevaliers-europeens'
  | 'mamelouks'
  // Empire espagnol
  | 'tercios'
  | 'azteques'
  | 'incas'
  | 'francais-ancien-regime'
  | 'neerlandais'
  | 'anglais-elisabethains'
  | 'espagnols-xxe'
  | 'rifains'
  | 'americains'
  | 'independantistes'
  // Saint-Empire romain germanique
  | 'imperiaux'
  | 'communes-lombardes'
  | 'suisses'
  | 'hussites'
  | 'lansquenets'
  | 'magyars'
  | 'suedois';

export const FACTIONS: Faction[] = [
  'romains',
  'latins',
  'samnites',
  'carthaginois',
  'gaulois',
  'grecs-macedoniens',
  'germains',
  'parthes-perses',
  'egyptiens',
  'daces',
  'goths-vandales',
  'arabes',
  'turcs-seldjoukides',
  'croises-latins',
  'ottomans',
  'byzantins',
  'francais',
  'britanniques',
  'autrichiens',
  'prussiens',
  'russes',
  'espagnols',
  'portugais',
  'polonais',
  'chinois',
  'xiongnu',
  'mongols',
  'jurchens',
  'mandchous',
  'japonais',
  'coreens',
  'tibetains',
  'vietnamiens',
  'turcs-gokturks',
  'khitans',
  'ouighours',
  'tangoutes',
  'khwarezmiens',
  'rus',
  'chevaliers-europeens',
  'mamelouks',
  'tercios',
  'azteques',
  'incas',
  'francais-ancien-regime',
  'neerlandais',
  'anglais-elisabethains',
  'espagnols-xxe',
  'rifains',
  'americains',
  'independantistes',
  'imperiaux',
  'communes-lombardes',
  'suisses',
  'hussites',
  'lansquenets',
  'magyars',
  'suedois',
];

export type Archetype =
  | 'senateur'
  | 'consul'
  | 'empereur'
  | 'empereur-byzantin'
  | 'roi'
  | 'pape'
  | 'chef-barbare'
  | 'calife'
  | 'sultan'
  | 'doge'
  // Époque napoléonienne
  | 'empereur-napoleon'
  | 'general'
  | 'roi-moderne'
  | 'tsar'
  | 'diplomate'
  | 'amiral'
  // Asie orientale
  | 'empereur-chinois'
  | 'lettre-mandarin'
  | 'general-chinois'
  | 'khan'
  | 'shogun'
  | 'moine-bouddhiste'
  | 'imperatrice'
  // Empire mongol
  | 'general-mongol'
  | 'khatoun'
  // Empire espagnol
  | 'conquistador'
  | 'vice-roi'
  | 'roi-habsbourg'
  | 'souverain-precolombien'
  | 'militaire-xxe'
  // Saint-Empire romain germanique
  | 'empereur-germanique'
  | 'prince-electeur'
  | 'reformateur'
  | 'capitaine'
  // Tous empires : savant, philosophe (et figure du guide de l'Atlas)
  | 'sage';

export const ARCHETYPES: Archetype[] = [
  'senateur',
  'consul',
  'empereur',
  'empereur-byzantin',
  'roi',
  'pape',
  'chef-barbare',
  'calife',
  'sultan',
  'doge',
  'empereur-napoleon',
  'general',
  'roi-moderne',
  'tsar',
  'diplomate',
  'amiral',
  'empereur-chinois',
  'lettre-mandarin',
  'general-chinois',
  'khan',
  'shogun',
  'moine-bouddhiste',
  'imperatrice',
  'sage',
  'conquistador',
  'vice-roi',
  'roi-habsbourg',
  'souverain-precolombien',
  'militaire-xxe',
  'empereur-germanique',
  'prince-electeur',
  'reformateur',
  'capitaine',
  'general-mongol',
  'khatoun',
];

export interface ArmyMove {
  /**
   * Identifiant stable d'une armée qui revient d'une bataille à l'autre (« grande-armee », « hannibal »).
   * Si l'armée a déjà combattu dans une étape antérieure, path[0] = dernier point de son path précédent,
   * et en lecture continue ses figurines repartent du champ de bataille précédent.
   */
  id?: string;
  /** Libellé affiché : « Rome », « Carthage ». */
  side: string;
  /** Lieu de départ affiché (« Samarcande », « camp de Boulogne ») ; défaut : ville la plus proche de path[0] ou champ de bataille précédent. */
  from?: string;
  faction: Faction;
  /** [lon, lat] de la base jusqu'au champ de bataille (2 à 8 points, le dernier = le champ de bataille). */
  path: [number, number][];
  /** Nombre de figurines : 1 → 3, 2 → 5, 3 → 7. */
  strength?: 1 | 2 | 3;
  winner?: boolean;
}

export interface Figure {
  /** « Auguste ». */
  name: string;
  /** « Premier empereur ». */
  role: string;
  faction: Faction;
  archetype: Archetype;
  /** ≤ 120 caractères ; citation attribuée (« selon Suétone ») ou phrase-clé neutre. */
  quote?: string;
  /** Position sur la carte ; défaut = location de l'étape. */
  position?: [number, number];
  /** Id d'une fiche de data/empires/<id>/people.json. */
  person?: string;
}

/** Fiche détaillée d'un personnage (data/empires/<id>/people.json). Années négatives = av. J.-C. */
export interface Person {
  /** Identifiant kebab-case, unique dans l'empire. */
  id: string;
  name: string;
  archetype: Archetype;
  faction: Faction;
  born?: number;
  died?: number;
  /** Titre court (« Fondateur de la dynastie Han »). */
  title: string;
  /** Récit de 120 à 220 mots. */
  bio: string;
  /** 3 à 5 faits brefs et datés. */
  keyFacts: string[];
  sources: { label: string; url: string }[];
}

/**
 * Voisins de l'époque d'une étape : public/data/empires/<empire>/neighbors/<stepId>.geojson
 * - Point { kind: 'label', name (FR), area (km²) } au pôle d'inaccessibilité de l'État voisin ;
 * - Point { kind: 'capital', name, of } : capitale de l'époque du voisin `of` (data/capitals.json).
 * - (Multi)LineString { kind: 'border' } : contour simplifié de l'État voisin.
 */
export type NeighborProperties = { kind: 'label'; name: string; area: number } | { kind: 'capital'; name: string; of: string } | { kind: 'border' };

/**
 * Empires contemporains d'une étape : public/data/empires/<empire>/contemporaries/<stepId>.geojson
 * Territoire (privé de l'emprise de l'empire regardé) d'un autre empire F, à son étape la plus récente d'année ≤ celle de l'étape.
 */
export interface ContemporaryProperties {
  /** Id de l'empire F. */
  empire: string;
  empireName: string;
  /** Nom de l'entité (État) dans F. */
  name: string;
  color: string;
  /** Étape de F dont vient le territoire. */
  stepId: string;
  year: number;
  status: 'core' | 'vassal';
}
