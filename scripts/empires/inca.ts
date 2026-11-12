// Configuration « Empire inca » (1438-1533) : 14 étapes composées (scripts/empires/fromCarto.ts)
// d'après overrides/inca/_carto.json : pays Natural Earth 1:50m (Pérou, Équateur, Bolivie, Chili, Argentine,
// Colombie) découpés par des régions nommées suivant les Andes (overrides/inca/_regions.geojson). Une entité
// « Empire inca » (core) + Chincha (allié) et Tumbes (tributaire). Frontières approximatives.
import { cartoEmpire } from './fromCarto.ts';

export const inca = cartoEmpire('inca');
