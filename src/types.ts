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
  steps: TimelineStep[];
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
  | 'romains' | 'latins' | 'samnites' | 'carthaginois' | 'gaulois' | 'grecs-macedoniens'
  | 'germains' | 'parthes-perses' | 'egyptiens' | 'daces' | 'goths-vandales' | 'arabes'
  | 'turcs-seldjoukides' | 'croises-latins' | 'ottomans' | 'byzantins'
  // Époque napoléonienne
  | 'francais' | 'britanniques' | 'autrichiens' | 'prussiens' | 'russes' | 'espagnols'
  | 'portugais' | 'polonais';

export const FACTIONS: Faction[] = [
  'romains', 'latins', 'samnites', 'carthaginois', 'gaulois', 'grecs-macedoniens',
  'germains', 'parthes-perses', 'egyptiens', 'daces', 'goths-vandales', 'arabes',
  'turcs-seldjoukides', 'croises-latins', 'ottomans', 'byzantins',
  'francais', 'britanniques', 'autrichiens', 'prussiens', 'russes', 'espagnols',
  'portugais', 'polonais',
];

export type Archetype =
  | 'senateur' | 'consul' | 'empereur' | 'empereur-byzantin' | 'roi' | 'pape'
  | 'chef-barbare' | 'calife' | 'sultan' | 'doge'
  // Époque napoléonienne
  | 'empereur-napoleon' | 'general' | 'roi-moderne' | 'tsar' | 'diplomate' | 'amiral';

export const ARCHETYPES: Archetype[] = [
  'senateur', 'consul', 'empereur', 'empereur-byzantin', 'roi', 'pape',
  'chef-barbare', 'calife', 'sultan', 'doge',
  'empereur-napoleon', 'general', 'roi-moderne', 'tsar', 'diplomate', 'amiral',
];

export interface ArmyMove {
  /** Libellé affiché : « Rome », « Carthage ». */
  side: string;
  faction: Faction;
  /** [lon, lat] de la base jusqu'au champ de bataille (2 à 6 points, le dernier = le champ de bataille). */
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
}
