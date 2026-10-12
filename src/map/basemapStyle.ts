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

/** Style inline, sans tuiles distantes, sans glyphs : uniquement des couches fill/line. */
export function baseStyle(): StyleSpecification {
  return {
    version: 8,
    projection: { type: 'globe' },
    sources: {
      graticule: { type: 'geojson', data: graticule(15) },
    },
    layers: [
      { id: 'ocean', type: 'background', paint: { 'background-color': MAP_COLORS.ocean } },
      {
        id: 'graticule',
        type: 'line',
        source: 'graticule',
        paint: { 'line-color': MAP_COLORS.graticule, 'line-width': 0.5, 'line-opacity': 0.35, 'line-dasharray': [4, 4] },
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
