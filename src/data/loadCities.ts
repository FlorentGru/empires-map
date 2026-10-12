import type { City } from '../types';

/**
 * data/cities.json est écrit en parallèle par l'historien : s'il n'existe pas encore,
 * import.meta.glob ne renvoie rien et on retombe sur un tableau vide.
 */
const loaders = import.meta.glob<{ default: City[] }>('/data/cities.json');

let cached: Promise<City[]> | null = null;

export function loadCities(): Promise<City[]> {
  cached ??= (async () => {
    const load = Object.values(loaders)[0];
    if (!load) return [];
    try {
      const mod = await load();
      const list = mod.default;
      return Array.isArray(list)
        ? list.filter((c) => c && Array.isArray(c.coords) && c.coords.length === 2 && typeof c.founded === 'number')
        : [];
    } catch (err) {
      console.warn('[villes] cities.json illisible :', err);
      return [];
    }
  })();
  return cached;
}
