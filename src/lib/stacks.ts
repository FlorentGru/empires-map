// Piles d'icônes à l'écran et disposition en éventail (fonctions pures, testées).

export interface ScreenPoint {
  id: string;
  x: number;
  y: number;
}

/**
 * Regroupe les points dont les icônes se touchent à l'écran (distance < px), de proche en proche :
 * A–B et B–C proches ⇒ une seule pile {A, B, C}. Chaque pile garde l'ordre d'entrée.
 */
export function stacks(points: ScreenPoint[], px: number): ScreenPoint[][] {
  const parent = points.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i]!;
      const b = points[j]!;
      if (Math.hypot(a.x - b.x, a.y - b.y) < px) parent[find(j)] = find(i);
    }
  }
  const groups = new Map<number, ScreenPoint[]>();
  points.forEach((p, i) => {
    const r = find(i);
    const g = groups.get(r);
    if (g) g.push(p);
    else groups.set(r, [p]);
  });
  return [...groups.values()];
}

/**
 * Positions (px, relatives au centre) des pastilles d'un éventail de n éléments :
 * cercle de rayon `radius` jusqu'à 6 (premier élément en haut), spirale au-delà.
 */
export function fanPositions(n: number, radius = 34): [number, number][] {
  if (n <= 1) return [[0, 0]];
  if (n <= 6) {
    return Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return [Math.round(Math.cos(a) * radius), Math.round(Math.sin(a) * radius)] as [number, number];
    });
  }
  // Spirale : l'écart entre deux pastilles voisines reste d'environ `radius`.
  const out: [number, number][] = [];
  let angle = -Math.PI / 2;
  let r = radius;
  for (let i = 0; i < n; i++) {
    out.push([Math.round(Math.cos(angle) * r), Math.round(Math.sin(angle) * r)]);
    const step = radius / r;
    angle += step * 1.15;
    r += (radius * 0.55 * step) / Math.PI;
  }
  return out;
}
