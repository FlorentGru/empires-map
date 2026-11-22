// Configuration « Empire du Japon » (1868-1947) : 16 étapes composées (scripts/empires/fromCarto.ts)
// d'après overrides/japon/_carto.json : pays Natural Earth 1:50m (Japon, Corée, Taïwan, Chine, Russie,
// Asie du Sud-Est, Océanie) découpés par des régions nommées (overrides/japon/_regions.geojson)
// pour la Mandchourie, la Chine occupée, le Guandong, Tsingtao, Sakhaline du Sud, les Kouriles et Okinawa.
// Frontières approximatives (occupations militaires schématiques).
import { cartoEmpire } from './fromCarto.ts';

export const japon = cartoEmpire('japon');
