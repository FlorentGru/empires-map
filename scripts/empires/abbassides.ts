// Configuration « Califat abbasside » (750-1258) : 22 étapes composées (scripts/empires/fromCarto.ts)
// d'après overrides/abbassides/_carto.json : pays Natural Earth 1:50m découpés par des provinces nommées
// (overrides/abbassides/_regions.geojson : Ifriqiya, Sicile, Chach, Jibal, Fars, Khuzestan, Irak du Sud, Jazira…).
// Une entité « Califat abbasside » (core, qui se réduit à l'Irak après 945), les camps rivaux de la guerre civile
// de 813, et les dynasties autonomes qui reconnaissent le calife (vassal : Aghlabides, Tahirides, Samanides,
// Tulunides, Bouyides, Hamdanides, Seldjoukides, Ayyoubides…). Frontières approximatives.
import { cartoEmpire } from './fromCarto.ts';

export const abbassides = cartoEmpire('abbassides');
