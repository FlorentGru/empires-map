// Configuration « Califat fatimide » (909-1171) : 18 étapes composées (scripts/empires/fromCarto.ts)
// d'après overrides/fatimides/_carto.json : pays Natural Earth 1:50m découpés par des régions nommées
// (overrides/fatimides/_regions.geojson). Une entité « Califat fatimide » (core) + des vassaux (Zirides,
// Sicile kalbide, tribus berbères…). Frontières approximatives.
import { cartoEmpire } from './fromCarto.ts';

export const fatimides = cartoEmpire('fatimides');
