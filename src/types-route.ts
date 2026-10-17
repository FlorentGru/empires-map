/** Nature du tracé : parcours terrestre (caravanes, routes, canaux) ou maritime. */
export type RouteKind = 'terre' | 'mer';

/** Animal ou navire qui porte les marchandises, affiché sur la carte. */
export type RouteCarrier =
  | 'chameau' | 'cheval' | 'mule' | 'lama' | 'boeuf' | 'yak' | 'porteur'
  | 'galere' | 'cogue' | 'jonque' | 'boutre' | 'galion' | 'barge' | 'drakkar';

export const ROUTE_CARRIERS: RouteCarrier[] = [
  'chameau', 'cheval', 'mule', 'lama', 'boeuf', 'yak', 'porteur',
  'galere', 'cogue', 'jonque', 'boutre', 'galion', 'barge', 'drakkar',
];

/** Escale d'une route commerciale. */
export interface RouteStop {
  /** Nom français de la ville ou du port. */
  name: string;
  /** Position réelle de l'escale [longitude, latitude] (longitude > 180 côté Pacifique du galion de Manille). */
  at: [number, number];
  /** Rôle de l'escale, 12 mots au plus. */
  note?: string;
}

/** Route commerciale historique affichée sur la carte (données : `data/routes.json`). */
export interface TradeRoute {
  /** Identifiant unique en kebab-case. */
  id: string;
  /** Nom français affiché. */
  name: string;
  /** Route terrestre ou maritime. */
  kind: RouteKind;
  /** Animal ou navire qui porte les marchandises, affiché sur la carte. */
  carrier: RouteCarrier;
  /** Année de début d'activité (négative avant J.-C.). */
  from: number;
  /** Année de fin d'activité (négative avant J.-C.), strictement supérieure à `from`. */
  to: number;
  /**
   * Tracé [longitude, latitude] dans l'ordre du trajet (4 à 30 points).
   * La longitude peut dépasser 180 (jusqu'à 360) quand le tracé traverse l'antiméridien
   * (Pacifique) : le tracé reste ainsi continu au lieu de faire le tour du monde.
   */
  path: [number, number][];
  /** Escales principales dans l'ordre du trajet (3 à 14), chacune à moins de 30 km du `path`. */
  stops: RouteStop[];
  /** Marchandises principales (2 à 6). */
  goods: string[];
  /** Présentation grand public, 40 à 80 mots. */
  description: string;
  /** URL de l'article Wikipédia en français. */
  wikipedia: string;
}
