import { toAstronomical } from '../lib/years';

/**
 * Échelle « mixte » : chaque ancre (début, étapes, fin) est placée à mi-chemin entre
 * sa position linéaire (années) et une position uniforme (rang). Les zones denses
 * (ex. -272 → -27) s'étalent sans que l'axe perde sa notion de durée.
 * Entre deux ancres, l'interpolation est linéaire en années → axe monotone.
 */
export function makeYearScale(years: number[], start: number, end: number, linearWeight = 0.45) {
  const raw = [start, ...years, end].map(toAstronomical).sort((a, b) => a - b);
  const anchors = raw.filter((y, i) => i === 0 || y !== raw[i - 1]);
  const lo = anchors[0];
  const hi = anchors[anchors.length - 1];
  const span = Math.max(1, hi - lo);
  const n = anchors.length;
  const xs = anchors.map((y, i) => linearWeight * ((y - lo) / span) + (1 - linearWeight) * (n > 1 ? i / (n - 1) : 0.5));

  /** Année historique → position [0, 1]. */
  return function yearToX(year: number): number {
    const y = toAstronomical(year);
    if (y <= lo) return xs[0];
    if (y >= hi) return xs[n - 1];
    let i = 1;
    while (anchors[i] < y) i++;
    const t = (y - anchors[i - 1]) / (anchors[i] - anchors[i - 1]);
    return xs[i - 1] + t * (xs[i] - xs[i - 1]);
  };
}

/** Graduations « rondes » (sans année 0), espacées d'au moins `minGap` en position. */
export function makeTicks(start: number, end: number, yearToX: (y: number) => number, minGap = 0.07): number[] {
  const span = end - start;
  const step = span > 1500 ? 200 : span > 600 ? 100 : span > 200 ? 50 : span > 60 ? 25 : span > 30 ? 10 : 1;
  const ticks: number[] = [];
  let lastX = -Infinity;
  for (let y = Math.ceil(start / step) * step; y <= end; y += step) {
    if (y === 0) continue;
    const x = yearToX(y);
    if (x - lastX >= minGap) {
      ticks.push(y);
      lastX = x;
    }
  }
  return ticks;
}
