/**
 * Zoom sur un territoire depuis la légende. Événement découplé : la légende émet, WorldMap écoute
 * (évite de faire transiter la carte par toute l'application).
 */
export const FOCUS_ENTITY_EVENT = 'atlas:focus-entity';

export interface FocusEntityDetail {
  /** Fichier de territoire de l'étape affichée. */
  territory: string;
  /** Index de la Feature (entité) dans ce fichier. */
  index: number;
}

export function focusEntity(territory: string, index: number): void {
  window.dispatchEvent(new CustomEvent<FocusEntityDetail>(FOCUS_ENTITY_EVENT, { detail: { territory, index } }));
}

/** Emprise [ouest, sud, est, nord] d'une géométrie (Multi)Polygon. */
export function geometryBounds(g: GeoJSON.Polygon | GeoJSON.MultiPolygon): [number, number, number, number] {
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const p of polys)
    for (const [x, y] of p[0] ?? []) {
      if (x < w) w = x;
      if (x > e) e = x;
      if (y < s) s = y;
      if (y > n) n = y;
    }
  return [w, s, e, n];
}

/**
 * Point à cadrer à la prochaine étape affichée (ex. « Voir sur la carte » d'un monument dans la galerie) :
 * la navigation remonte la carte, qui consomme ce point une fois sa caméra posée.
 */
let pendingPoint: { at: [number, number]; zoom: number } | null = null;

export function requestFocusPoint(at: [number, number], zoom = 6.5): void {
  pendingPoint = { at, zoom };
}

export function takeFocusPoint(): { at: [number, number]; zoom: number } | null {
  const p = pendingPoint;
  pendingPoint = null;
  return p;
}
