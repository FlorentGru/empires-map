// Configuration « Empire russe » (1547-1917) : 27 étapes composées (scripts/empires/fromCarto.ts)
// d'après overrides/russie/_carto.json : pays Natural Earth 1:50m découpés par des régions nommées
// (overrides/russie/_regions.geojson). Une entité « Empire russe » (core) + des vassaux (Hetmanat cosaque,
// Géorgie orientale, Finlande, Boukhara, Khiva, Touva). Frontières approximatives ; Kaliningrad jamais inclus.
import { cartoEmpire } from './fromCarto.ts';

export const russie = cartoEmpire('russie');
