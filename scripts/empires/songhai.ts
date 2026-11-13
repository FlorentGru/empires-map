// Configuration « Empire songhaï » (1430-1591) : 15 étapes composées (scripts/empires/fromCarto.ts)
// d'après overrides/songhai/_carto.json : pays Natural Earth 1:50m (Mali, Niger, Burkina Faso, Nigeria,
// Mauritanie, Algérie, Sénégal) découpés par des régions nommées suivant le Niger moyen, de Djenné au Dendi
// (overrides/songhai/_regions.geojson). Une entité « Empire songhaï » (core) + Aïr et Agadez, Diara, Galam
// et Katsina-Kano (1513) en vassaux. Teghaza et Taoudeni, simples salines, restent hors territoire.
// Frontières approximatives.
import { cartoEmpire } from './fromCarto.ts';

export const songhai = cartoEmpire('songhai');
