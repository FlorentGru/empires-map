/** Catégories d'inventions et d'innovations (filtre / pastille de l'interface). */
export type InventionCategory =
  | 'technique'
  | 'science'
  | 'militaire'
  | 'agriculture'
  | 'ecriture'
  | 'administration'
  | 'medecine'
  | 'navigation'
  | 'monnaie'
  | 'droit'
  | 'architecture';

export const INVENTION_CATEGORIES: InventionCategory[] = [
  'technique',
  'science',
  'militaire',
  'agriculture',
  'ecriture',
  'administration',
  'medecine',
  'navigation',
  'monnaie',
  'droit',
  'architecture',
];

/** Une invention ou innovation née (ou diffusée) pendant la durée d'un empire. */
export interface Invention {
  /** Identifiant kebab-case, unique dans l'empire. */
  id: string;
  /** Nom en français. */
  name: string;
  /** Année (négatif = av. J.-C.). */
  year: number;
  /** Date incertaine ou conventionnelle. */
  approx?: boolean;
  /** Ville ou région d'apparition. */
  place: string;
  /** [longitude, latitude] du lieu d'apparition ou de première diffusion connue. */
  at: [number, number];
  /** Inventeur ou promoteur, s'il est connu. */
  inventor?: string;
  category: InventionCategory;
  /** 50-80 mots, grand public ; précise s'il s'agit d'une invention ou d'une diffusion. */
  description: string;
  /** Pourquoi c'est révolutionnaire : 1-2 phrases, 45 mots maximum. */
  impact: string;
  sources: { label: string; url: string }[];
}
