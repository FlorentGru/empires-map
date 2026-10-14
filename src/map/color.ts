/** Petites conversions de couleur pour varier la teinte des entités d'un empire. */

function hexToHsl(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const n = parseInt(full, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, s, l];
}

function hsl(h: number, s: number, l: number, a?: number): string {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const hh = ((h % 360) + 360) % 360;
  if (a !== undefined) return `hsla(${hh}, ${(clamp(s) * 100).toFixed(1)}%, ${(clamp(l) * 100).toFixed(1)}%, ${a})`;
  return `hsl(${hh}, ${(clamp(s) * 100).toFixed(1)}%, ${(clamp(l) * 100).toFixed(1)}%)`;
}

/** Angle d'or : deux entités successives ont toujours des teintes éloignées (≥ 137°), 7 entités restent distinctes. */
export const GOLDEN_ANGLE = 137.5;
const clampTo = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Teinte, saturation, luminosité de la i-ème entité (entité 0 = couleur de l'empire, inchangée). */
export function entityHsl(base: string, index: number): [number, number, number] {
  const [h, s, l] = hexToHsl(base);
  if (index === 0) return [h, s, l];
  return [(h + index * GOLDEN_ANGLE) % 360, clampTo(s, 0.35, 0.6), clampTo(l, 0.42, 0.58)];
}

/** Couleur de remplissage de la i-ème entité. */
export function variantFill(base: string, index: number): string {
  const [h, s, l] = entityHsl(base, index);
  return hsl(h, s, l);
}

/** Couleur de contour et d'étiquette : même teinte, nettement plus sombre. */
export function variantLine(base: string, index: number): string {
  const [h, s] = entityHsl(base, index);
  return hsl(h, s, 0.22);
}

/** Rapport d'opacité d'un État vassal par rapport à un territoire « core » (0,22 / 0,48). */
export const VASSAL_ALPHA = 0.46;

/** Remplissage d'un État vassal : même teinte, éclaircie, alpha réduit (le calque applique déjà FILL_OPACITY). */
export function variantVassal(base: string, index: number): string {
  const [h, s, l] = entityHsl(base, index);
  return hsl(h, s, Math.min(0.85, l + (1 - l) * 0.35), VASSAL_ALPHA);
}
