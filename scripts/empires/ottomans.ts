// Configuration « Empire ottoman » (1299-1922) : 25 étapes composées (scripts/empires/fromCarto.ts)
// d'après overrides/ottomans/_carto.json : pays Natural Earth 1:50m découpés par des régions nommées
// (overrides/ottomans/_regions.geojson). Une entité « Empire ottoman » (core) + des vassaux (principautés
// danubiennes, khanat de Crimée, régences, Égypte autonome…). Frontières approximatives.
import { cartoEmpire } from './fromCarto.ts';

export const ottomans = cartoEmpire('ottomans');
