/** Catégories de monuments affichées sur la carte. */
export type MonumentKind =
  'temple' | 'palais' | 'tombeau' | 'forteresse' | 'muraille' | 'eglise' | 'mosquee' | 'amphitheatre' | 'cite' | 'phare' | 'statue' | 'pont' | 'jardin';

export const MONUMENT_KINDS: MonumentKind[] = [
  'temple',
  'palais',
  'tombeau',
  'forteresse',
  'muraille',
  'eglise',
  'mosquee',
  'amphitheatre',
  'cite',
  'phare',
  'statue',
  'pont',
  'jardin',
];

/** Un grand monument du monde (data/monuments.json). */
export interface Monument {
  /** Identifiant unique en kebab-case. */
  id: string;
  /** Nom en français. */
  name: string;
  /** Position exacte [longitude, latitude] en degrés décimaux. */
  location: [number, number];
  /** Année d'achèvement ou de mise en service (négative avant J.-C.). */
  built: number;
  /** Année de destruction, de ruine ou d'abandon ; absente si le monument existe encore. */
  until?: number;
  kind: MonumentKind;
  /** Civilisation ou empire bâtisseur, en quelques mots (« Rome », « Empire khmer »). */
  civilization: string;
  /** Description de 40 à 70 mots. */
  description: string;
  /** URL de l'article Wikipédia (français). */
  wikipedia: string;
  /** L'une des sept merveilles du monde antique : icône dorée, nom toujours affiché, bandeau de la galerie. */
  wonder?: true;
}
