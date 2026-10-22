// Configuration « Empire d'Alexandre le Grand » (-336 → -323) : 16 étapes composées (scripts/empires/fromCarto.ts)
// d'après overrides/alexandre/_carto.json : instantané historical-basemaps world_bc323 (étendue finale)
// découpé en régions nommées (overrides/alexandre/_regions.geojson), en union croissante. Frontières approximatives.
import { cartoEmpire } from './fromCarto.ts';

export const alexandre = cartoEmpire('alexandre');
