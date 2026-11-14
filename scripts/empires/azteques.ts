// Configuration « Empire aztèque » (1428-1521) : 16 étapes composées (scripts/empires/fromCarto.ts)
// d'après overrides/azteques/_carto.json : pays Natural Earth 1:50m (Mexique, Guatemala) découpés par des
// provinces tributaires nommées (overrides/azteques/_regions.geojson), du golfe du Mexique au Pacifique.
// Une entité « Empire aztèque » (core) + l'isthme de Tehuantepec (allié, vassal en 1500). Enclaves
// indépendantes retirées : Tlaxcala, Metztitlán, Yopitzinco, Tututepec ; côte totonaque perdue en 1519,
// Texcoco et Tepeaca en 1520, île de Tenochtitlan seule en 1521. Frontières approximatives.
import { cartoEmpire } from './fromCarto.ts';

export const azteques = cartoEmpire('azteques');
