// Galerie des monuments : époque, continent et étapes de l'Atlas où le monument est visible (pur, testé).
import type { Empire } from '../types';
import type { Monument } from '../types-monument';
import { haversineKm } from './march';

export type Era = 'antiquite' | 'moyen-age' | 'moderne';
export const ERA_LABELS: Record<Era, string> = { antiquite: 'Antiquité', 'moyen-age': 'Moyen Âge', moderne: 'Époque moderne' };

/** Époque d'achèvement : avant 500, 500 – 1500, après 1500. */
export function eraOf(m: Pick<Monument, 'built'>): Era {
  return m.built < 500 ? 'antiquite' : m.built < 1500 ? 'moyen-age' : 'moderne';
}

/** Continent approximatif d'après la position (le Proche-Orient compte en Asie, l'Égypte en Afrique). */
export function continentOf([lon, lat]: [number, number]): string {
  if (lon < -25) return 'Amériques';
  if (lon > 110 && lat < -10) return 'Océanie';
  if (lat < 37 && lon < 33 && lon > -20) return 'Afrique';
  if (lat < 12 && lon >= 33 && lon < 52) return 'Afrique'; // Corne de l'Afrique
  if (lon < 40 && lat >= 36) return 'Europe';
  if (lon < 60 && lat >= 45) return 'Europe';
  return 'Asie';
}

/**
 * Étapes de l'Atlas où le monument est debout ET proche du lieu de l'étape (≤ maxKm), donc visible
 * dans le cadrage : au plus `limit` étapes, triées par date, une seule par empire et par siècle.
 */
export function stepsShowing(m: Monument, empires: Empire[], maxKm = 2500, limit = 8) {
  const out: { empireId: string; empireName: string; stepId: string; title: string; year: number }[] = [];
  const seen = new Set<string>();
  for (const e of empires) {
    for (const s of e.steps) {
      if (s.year < m.built || (m.until !== undefined && s.year >= m.until) || !s.location) continue;
      if (haversineKm(s.location, m.location) > maxKm) continue;
      const key = `${e.id}:${Math.floor(s.year / 100)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ empireId: e.id, empireName: e.name.split(',')[0]!, stepId: s.id, title: s.title, year: s.year });
    }
  }
  return out.sort((a, b) => a.year - b.year).slice(0, limit);
}

/** Étape de l'Atlas la plus proche d'un événement : d'abord par la date, puis par la distance au lieu. */
export function nearestStepFor(at: [number, number], year: number, empires: Empire[]) {
  let best: { empireId: string; stepId: string; title: string; year: number; empireName: string } | null = null;
  let score = Infinity;
  for (const e of empires)
    for (const s of e.steps) {
      if (!s.location) continue;
      // 1 an d'écart pèse autant que 50 km : la date compte d'abord.
      const sc = Math.abs(s.year - year) * 50 + haversineKm(s.location, at);
      if (sc < score) {
        score = sc;
        best = { empireId: e.id, stepId: s.id, title: s.title, year: s.year, empireName: e.name.split(',')[0]! };
      }
    }
  return best;
}
