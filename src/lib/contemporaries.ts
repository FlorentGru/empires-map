/** Choix de l'étape d'un empire F à afficher comme « contemporain » d'une année donnée. */

/** Dernière étape (année ≤ year) ; undefined s'il n'y en a pas. Les étapes sont supposées triées par année. */
export function lastStepAtOrBefore<T extends { year: number }>(steps: readonly T[], year: number): T | undefined {
  let best: T | undefined;
  for (const s of steps) if (s.year <= year && (!best || s.year >= best.year)) best = s;
  return best;
}

/** L'empire (start..end) existe-t-il à cette année ? */
export function existsAt(empire: { start: number; end: number }, year: number): boolean {
  return empire.start <= year && year <= empire.end;
}

type Ring = number[][];
function inRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Point dans un (Multi)Polygon (anneau extérieur moins les trous). */
export function pointInGeometry(pt: readonly number[], g: { type: string; coordinates?: unknown }): boolean {
  const polys = (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []) as Ring[][];
  const [x, y] = pt;
  return polys.some((p) => p.length > 0 && inRing(x, y, p[0]) && !p.slice(1).some((h) => inRing(x, y, h)));
}

/** Retire des voisins les étiquettes (kind 'label') dont le point tombe dans un empire contemporain. */
export function dropCoveredLabels<N extends { geometry: { type: string; coordinates?: unknown } | null; properties: { kind?: string } | null }>(
  neighbors: readonly N[],
  contemporaries: readonly { geometry: { type: string; coordinates?: unknown } | null }[],
): N[] {
  if (!contemporaries.length) return [...neighbors];
  // Boîte englobante d'abord : le test point-dans-polygone exact (jusqu'à ~25 ms par étape) n'est fait que si elle contient le point.
  const boxes = contemporaries.map((c) => {
    let w = Infinity;
    let s = Infinity;
    let e = -Infinity;
    let n = -Infinity;
    const polys = (c.geometry?.type === 'Polygon' ? [c.geometry.coordinates] : c.geometry?.type === 'MultiPolygon' ? c.geometry.coordinates : []) as Ring[][];
    for (const p of polys)
      for (const [x, y] of p[0] ?? []) {
        if (x < w) w = x;
        if (x > e) e = x;
        if (y < s) s = y;
        if (y > n) n = y;
      }
    return [w, s, e, n];
  });
  return neighbors.filter((f) => {
    if (f.properties?.kind !== 'label' || f.geometry?.type !== 'Point') return true;
    const pt = f.geometry.coordinates as number[];
    const [x, y] = pt;
    return !contemporaries.some((c, i) => {
      const [w, s, e, n] = boxes[i]!;
      return x >= w && x <= e && y >= s && y <= n && c.geometry && pointInGeometry(pt, c.geometry);
    });
  });
}
