/** Nature d'une catastrophe ou d'une guerre meurtrière affichée sur la carte. */
export type DisasterKind =
  | 'epidemie'
  | 'eruption'
  | 'seisme'
  | 'tsunami'
  | 'famine'
  | 'inondation'
  | 'guerre';

export const DISASTER_KINDS: DisasterKind[] = [
  'epidemie',
  'eruption',
  'seisme',
  'tsunami',
  'famine',
  'inondation',
  'guerre',
];

/** Étape de diffusion d'une épidémie : villes touchées à une année donnée. */
export interface DisasterSpread {
  /** Année (négative = av. J.-C.). */
  year: number;
  /** Villes touchées [longitude, latitude] (vague de l'année ou cumul). */
  points: [number, number][];
}

export interface Disaster {
  /** Identifiant unique en kebab-case. */
  id: string;
  /** Nom français. */
  name: string;
  kind: DisasterKind;
  /** Année de début (négative = av. J.-C.). */
  start: number;
  /** Année de fin (négative = av. J.-C.), >= start. */
  end: number;
  /** Lieu emblématique ou d'origine [longitude, latitude]. */
  location: [number, number];
  /** Estimation retenue du nombre de morts. */
  deaths: number;
  /** Borne basse de la fourchette des historiens. */
  deathsLow: number;
  /** Borne haute de la fourchette des historiens. */
  deathsHigh: number;
  /** Une phrase sur la fiabilité des chiffres. */
  uncertainty: string;
  /** Description grand public (50 à 90 mots). */
  description: string;
  sources: { label: string; url: string }[];
  /** Épidémies : diffusion par année (4 à 10 étapes, années croissantes). */
  spread?: DisasterSpread[];
  /** Guerres : 3 à 12 points délimitant grossièrement la zone des combats. */
  area?: [number, number][];
  /** Guerres : camps ou belligérants principaux. */
  belligerents?: string[];
}
