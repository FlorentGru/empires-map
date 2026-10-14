import type { FeatureCollection, LineString } from 'geojson';
import type { Map as MapLibreMap, MapOptions } from 'maplibre-gl';

type StyleSpecification = Exclude<MapOptions['style'], string | undefined | null>;

/** Palette « carte ancienne ». Gardée en phase avec les variables CSS de styles.css. */
export const MAP_COLORS = {
  ocean: '#c9d3cf',
  land: '#ecdfc0',
  coast: '#7a5a3a',
  graticule: '#8a7a62',
};

export const DEM_SOURCE = 'dem';
export const TERRAIN_EXAGGERATION = 1.5;
/** Zone utile : limite le nombre de tuiles de relief chargées. */
export const MAX_BOUNDS: [[number, number], [number, number]] = [
  [-30, -45],
  [160, 78],
];

function glyphsUrl(): string {
  // URL absolue : le worker de MapLibre ne résout pas les chemins relatifs à la page.
  const base = new URL(import.meta.env.BASE_URL, window.location.href).href;
  return `${base}fonts/{fontstack}/{range}.pbf`;
}

function demSource() {
  return {
    type: 'raster-dem' as const,
    tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
    encoding: 'terrarium' as const,
    tileSize: 256,
    maxzoom: 10,
    attribution: 'Terrain : Mapzen / AWS Terrain Tiles',
  };
}

/**
 * Style inline Mercator : fond océan, graticule, relief (raster-dem Terrarium public AWS)
 * et hillshade parchemin. Les terres sont insérées avant la graticule par addLand ;
 * territoires, villes et marqueur viennent ensuite par-dessus le hillshade.
 */
export function baseStyle(): StyleSpecification {
  return {
    version: 8,
    projection: { type: 'mercator' },
    glyphs: glyphsUrl(),
    sources: {
      graticule: { type: 'geojson', data: graticule(15) },
      [DEM_SOURCE]: demSource(),
    },
    layers: [
      { id: 'ocean', type: 'background', paint: { 'background-color': MAP_COLORS.ocean } },
      {
        id: 'graticule',
        type: 'line',
        source: 'graticule',
        paint: { 'line-color': MAP_COLORS.graticule, 'line-width': 0.5, 'line-opacity': 0.35, 'line-dasharray': [4, 4] },
      },
      {
        id: 'hillshade',
        type: 'hillshade',
        source: DEM_SOURCE,
        paint: {
          'hillshade-exaggeration': 0.4,
          'hillshade-shadow-color': '#6b5a48',
          'hillshade-highlight-color': '#fff7e2',
          'hillshade-accent-color': '#8a7560',
        },
      },
    ],
  };
}

function graticule(stepDeg: number): FeatureCollection<LineString> {
  const features: FeatureCollection<LineString>['features'] = [];
  for (let lon = -180; lon <= 180; lon += stepDeg) {
    const coords: [number, number][] = [];
    for (let lat = -80; lat <= 80; lat += 5) coords.push([lon, lat]);
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });
  }
  for (let lat = -75; lat <= 75; lat += stepDeg) {
    const coords: [number, number][] = [];
    for (let lon = -180; lon <= 180; lon += 5) coords.push([lon, lat]);
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });
  }
  return { type: 'FeatureCollection', features };
}

/**
 * Ajoute les terres locales (public/data/basemap/land.geojson) sous la graticule.
 * Si le fichier est absent ou invalide, la carte reste « océan seul ».
 */
export async function addLand(map: MapLibreMap): Promise<void> {
  const url = `${import.meta.env.BASE_URL}data/basemap/land.geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || (data.type !== 'FeatureCollection' && data.type !== 'Feature')) throw new Error('GeoJSON invalide');
    if (!map.getStyle() || map.getSource('land')) return;
    map.addSource('land', { type: 'geojson', data });
    map.addLayer({ id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': MAP_COLORS.land } }, 'graticule');
    map.addLayer(
      { id: 'coast', type: 'line', source: 'land', paint: { 'line-color': MAP_COLORS.coast, 'line-width': 0.7, 'line-opacity': 0.8 } },
      'graticule',
    );
  } catch (err) {
    console.warn('[fond de carte] land.geojson indisponible, affichage océan seul :', err);
  }
}
