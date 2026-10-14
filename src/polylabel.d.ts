declare module 'polylabel' {
  /** Pôle d'inaccessibilité d'un polygone GeoJSON (anneaux [x, y]) ; `distance` = rayon du plus grand cercle inscrit. */
  export default function polylabel(polygon: number[][][], precision?: number, debug?: boolean): [number, number] & { distance: number };
}
