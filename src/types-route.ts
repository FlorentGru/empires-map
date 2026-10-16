/** Nature du tracé : parcours terrestre (caravanes, routes, canaux) ou maritime. */
export type RouteKind = 'terre' | 'mer';

/** Route commerciale historique affichée sur la carte (données : `data/routes.json`). */
export interface TradeRoute {
  /** Identifiant unique en kebab-case. */
  id: string;
  /** Nom français affiché. */
  name: string;
  /** Route terrestre ou maritime. */
  kind: RouteKind;
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
  /** Noms des étapes principales, dans l'ordre, alignées sur des points du `path` (3 à 10). */
  stops: string[];
  /** Marchandises principales (2 à 6). */
  goods: string[];
  /** Présentation grand public, 40 à 80 mots. */
  description: string;
  /** URL de l'article Wikipédia en français. */
  wikipedia: string;
}
