/** Utilitaires d'années historiques (pas d'année 0 : -1 est suivi de 1). */

export function formatYear(year: number): string {
  return year < 0 ? `${-year} av. J.-C.` : `${year}`;
}

/** Année astronomique (1 av. J.-C. = 0), pour mesurer des durées correctes. */
export function toAstronomical(year: number): number {
  return year < 0 ? year + 1 : year;
}
