// Configuration « Empire carolingien » (751-888) : 21 étapes composées (scripts/empires/fromCarto.ts)
// d'après overrides/carolingiens/_carto.json : instantanés historical-basemaps (world_700/800/900)
// complétés par des régions nommées (overrides/carolingiens/_regions.geojson). Frontières approximatives.
import { cartoEmpire } from './fromCarto.ts';

export const carolingiens = cartoEmpire('carolingiens');
