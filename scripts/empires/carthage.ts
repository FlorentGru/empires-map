// Configuration « Empire carthaginois » (-650 à -146) : 17 étapes composées (scripts/empires/fromCarto.ts)
// d'après overrides/carthage/_carto.json : pays Natural Earth 1:50m (Tunisie, Libye, Algérie, Maroc, Italie,
// Espagne, Malte) découpés par des régions nommées (overrides/carthage/_regions.geojson) : territoire punique
// d'Afrique, Emporia de Tripolitaine, bandes côtières de comptoirs, ouest de la Sicile, Sardaigne, Baléares,
// côte andalouse et Espagne barcide. Une entité « Empire carthaginois » (core) + les alliés d'Hannibal en
// Italie du sud en -216 (allié). Frontières approximatives.
import { cartoEmpire } from './fromCarto.ts';

export const carthage = cartoEmpire('carthage');
