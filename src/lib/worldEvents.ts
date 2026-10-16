// Routes commerciales et catastrophes actives à une date (fonctions pures, testées).
import type { TradeRoute } from '../types-route';
import type { Disaster } from '../types-disaster';
import { haversineKm } from './march';

/** Routes en activité à l'année donnée (from ≤ year < to). */
export function activeRoutes(routes: TradeRoute[], year: number): TradeRoute[] {
  return routes.filter((r) => r.from <= year && year < r.to);
}

/** Catastrophes et guerres en cours à l'année donnée (start ≤ year ≤ end). */
export function activeDisasters(list: Disaster[], year: number): Disaster[] {
  return list.filter((d) => d.start <= year && year <= d.end);
}

/** Catastrophes et guerres qui chevauchent une période [from, to] (marqueurs de la frise). */
export function disastersBetween(list: Disaster[], from: number, to: number): Disaster[] {
  return list.filter((d) => d.start <= to && d.end >= from);
}

/**
 * Diffusion d'une épidémie atteinte à l'année donnée : points des vagues datées ≤ year,
 * avec l'ancienneté de chaque vague (0 = la plus récente) pour l'estomper.
 */
export function spreadUpTo(d: Disaster, year: number): { point: [number, number]; year: number; age: number }[] {
  const waves = (d.spread ?? []).filter((w) => w.year <= year);
  const years = [...new Set(waves.map((w) => w.year))].sort((a, b) => b - a);
  return waves.flatMap((w) => w.points.map((point) => ({ point, year: w.year, age: years.indexOf(w.year) })));
}

/** Distances cumulées (km) le long d'un tracé. */
export function cumulative(path: [number, number][]): number[] {
  const cum = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1]! + haversineKm(path[i - 1]!, path[i]!));
  return cum;
}

/** Point du tracé à la fraction t ∈ [0, 1] de sa longueur, et cap (+1 vers l'est, −1 vers l'ouest). */
export function pointAlong(path: [number, number][], cum: number[], t: number): { at: [number, number]; east: boolean } {
  const total = cum[cum.length - 1] ?? 0;
  const d = Math.min(1, Math.max(0, t)) * total;
  let i = 0;
  while (i < path.length - 2 && d > cum[i + 1]!) i++;
  const a = path[i]!;
  const b = path[i + 1] ?? a;
  const seg = (cum[i + 1] ?? 0) - cum[i]!;
  const f = seg > 0 ? (d - cum[i]!) / seg : 0;
  return { at: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], east: b[0] >= a[0] };
}

/** « ≈ 50 M morts », « ≈ 830 000 morts », « ≈ 16 000 morts ». */
export function formatDeaths(n: number): string {
  if (n >= 1e6) return `≈ ${(n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M morts`;
  const rounded = n >= 10_000 ? Math.round(n / 1000) * 1000 : n;
  return `≈ ${rounded.toLocaleString('fr-FR')} morts`;
}

/** Enveloppe convexe (algorithme de la chaîne monotone), anneau fermé ; sert aux zones de guerre. */
export function convexHull(points: [number, number][]): [number, number][] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return [...pts, ...(pts[0] ? [pts[0]] : [])];
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  return [...hull, hull[0]!];
}
