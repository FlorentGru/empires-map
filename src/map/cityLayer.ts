import type { Feature, FeatureCollection, Point } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { City, Empire } from '../types';

const INK = '#3b2a1a';
const HALO = '#f4ead3';
const CAPITAL = '#9b2d20';
const FONT_BOLD = ['Open Sans Semibold'];
const FONT_REGULAR = ['Noto Sans Regular'];

type CityCollection = FeatureCollection<Point, CityProps>;
interface CityProps {
  label: string;
  sub: string;
  rank: number;
  capital: boolean;
  /** Capitale d'un autre empire de l'Atlas à cette date (empire contemporain) : anneau, toujours affichée. */
  foreign: boolean;
  sort: number;
}

const EMPTY: CityCollection = { type: 'FeatureCollection', features: [] };

/** Nom valable à l'année donnée (sinon le plus proche, sinon le nom actuel). */
export function nameAt(city: City, year: number): string {
  const valid = city.names.find((n) => (n.from == null || n.from <= year) && (n.to == null || year <= n.to));
  if (valid) return valid.name;
  const before = [...city.names].reverse().find((n) => n.from != null && n.from <= year);
  return (before ?? city.names[0])?.name ?? city.modern;
}

const norm = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function isVisible(city: City, year: number): boolean {
  return city.founded <= year && (city.destroyed == null || year <= city.destroyed);
}

export function isCapital(city: City, empireId: string, year: number): boolean {
  return !!city.capitalOf?.some((c) => c.empire === empireId && c.from <= year && year <= c.to);
}

/** Capitale, à cette date, d'un autre empire que `empireId` (empires contemporains de l'Atlas). */
export function isForeignCapital(city: City, empireId: string, year: number): boolean {
  return !!city.capitalOf?.some((c) => c.empire !== empireId && c.from <= year && year <= c.to);
}

/** Niveau de zoom minimal d'affichage par rang : 1 toujours, 2 dès 4, 3 dès 5,5. */
const byRank = (r1: unknown, r2: unknown, r3: unknown) => ['step', ['zoom'], r1, 4, r2, 5.5, r3] as never;

/** Points + libellés des villes. setData uniquement au changement d'étape, avec cache par année. */
export class CityLayer {
  private cache = new Map<string, CityCollection>();

  constructor(
    private map: MapLibreMap,
    private cities: City[],
    private empire: Empire,
  ) {
    map.addSource('cities', { type: 'geojson', data: EMPTY });
    const capital = ['get', 'capital'] as never;
    const shown = ['any', capital, ['get', 'foreign']] as never;
    // rang 1 : toujours ; rang 2 : zoom ≥ 4 ; rang 3 : zoom ≥ 5,5 (taille 0 = non placé).
    const size = (px: number) =>
      byRank(
        ['case', ['any', shown, ['==', ['get', 'rank'], 1]], px, 0],
        ['case', ['any', shown, ['<=', ['get', 'rank'], 2]], px, 0],
        px,
      );
    // Symbole de capitale étrangère : anneau autour du point (comme sur les cartes d'atlas).
    map.addLayer({
      id: 'city-capital-ring',
      type: 'circle',
      source: 'cities',
      filter: ['all', ['get', 'foreign'], ['!', capital]] as never,
      paint: {
        'circle-radius': 7,
        'circle-opacity': 0,
        'circle-stroke-color': INK,
        'circle-stroke-width': 1.3,
        'circle-pitch-alignment': 'map',
      },
    });
    map.addLayer({
      id: 'city-dot',
      type: 'circle',
      source: 'cities',
      paint: {
        'circle-radius': byRank(
          ['case', capital, 5.5, ['any', ['get', 'foreign'], ['==', ['get', 'rank'], 1]], 3.6, 0],
          ['case', capital, 5.5, ['any', ['get', 'foreign'], ['<=', ['get', 'rank'], 2]], 3.2, 0],
          ['case', capital, 5.5, 2.6],
        ),
        'circle-color': ['case', capital, CAPITAL, INK],
        'circle-stroke-color': HALO,
        'circle-stroke-width': ['case', capital, 2, 1.2],
        'circle-pitch-alignment': 'map',
      },
    });
    map.addLayer({
      id: 'city-label',
      type: 'symbol',
      source: 'cities',
      layout: {
        'symbol-sort-key': ['get', 'sort'],
        'text-field': [
          'case',
          ['==', ['get', 'sub'], ''],
          ['format', ['get', 'label'], { 'text-font': ['literal', FONT_BOLD] }],
          [
            'format',
            ['get', 'label'],
            { 'text-font': ['literal', FONT_BOLD] },
            '\n',
            {},
            ['get', 'sub'],
            { 'font-scale': 0.82, 'text-font': ['literal', FONT_REGULAR] },
          ],
        ],
        'text-font': FONT_BOLD,
        'text-size': size(13),
        'text-anchor': 'top',
        'text-offset': [0, 0.7],
        'text-max-width': 9,
        'text-padding': 2,
        'text-optional': true,
      },
      paint: { 'text-color': INK, 'text-halo-color': HALO, 'text-halo-width': 1.6, 'text-halo-blur': 0.4 },
    });
  }

  private build(year: number): CityCollection {
    const key = `${this.empire.id}:${year}`;
    let fc = this.cache.get(key);
    if (!fc) {
      const features: Feature<Point, CityProps>[] = [];
      for (const c of this.cities) {
        if (!isVisible(c, year)) continue;
        const cap = isCapital(c, this.empire.id, year);
        const foreign = !cap && isForeignCapital(c, this.empire.id, year);
        // Ville réservée à un autre empire : affichée quand même si elle est sa capitale à cette date.
        if (c.empires && !c.empires.includes(this.empire.id) && !foreign) continue;
        const label = nameAt(c, year);
        const sub = norm(label) === norm(c.modern) ? '' : `(${c.modern})`;
        features.push({
          type: 'Feature',
          properties: { label, sub, rank: c.rank, capital: cap, foreign, sort: (cap ? 0 : foreign ? 0.5 : c.rank) * 10 },
          geometry: { type: 'Point', coordinates: c.coords },
        });
      }
      fc = { type: 'FeatureCollection', features };
      this.cache.set(key, fc);
    }
    return fc;
  }

  show(year: number) {
    (this.map.getSource('cities') as GeoJSONSource | undefined)?.setData(this.build(year));
  }

  destroy() {}
}
