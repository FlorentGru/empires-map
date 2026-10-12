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
