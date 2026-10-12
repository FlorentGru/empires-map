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
}

export interface Empire {
  id: string;
  name: string;
  /** Couleur principale du territoire (hex). */
  color: string;
  start: number;
  end: number;
  description: string;
  steps: TimelineStep[];
}

/** Propriétés de chaque Feature d'un GeoJSON de territoire. */
export interface TerritoryProperties {
  empire: string;
  /** Ex. "Empire romain d'Occident", "Empire byzantin". */
  name: string;
  /** Année de l'instantané historical-basemaps utilisé, ou de l'override. */
  sourceYear: number;
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
}

/**
 * Diff précalculé entre une étape et la précédente :
 * public/data/empires/<empire>/diffs/<stepId>.geojson
 * (FeatureCollection, properties { kind: 'gained' | 'lost' }).
 */
export type DiffKind = 'gained' | 'lost';
