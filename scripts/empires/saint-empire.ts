// Configuration « Saint-Empire romain germanique » (962-1806) : 32 étapes composées (scripts/empires/fromCarto.ts)
// d'après overrides/saint-empire/_carto.json : pays Natural Earth découpés par des régions nommées
// (overrides/saint-empire/_regions.geojson). Frontières approximatives, à l'échelle de la décennie.
import { cartoEmpire } from './fromCarto.ts';

export const saintEmpire = cartoEmpire('saint-empire');
