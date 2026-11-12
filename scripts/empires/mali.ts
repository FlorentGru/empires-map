// Configuration « Empire du Mali » (1235-1670) : 17 étapes composées (scripts/empires/fromCarto.ts)
// d'après overrides/mali/_carto.json : pays Natural Earth 1:50m (Mali, Guinée, Sénégal, Gambie, Mauritanie,
// Niger, Guinée-Bissau) découpés par des régions nommées suivant le haut Niger, le delta intérieur, la boucle
// du Niger et les fleuves Sénégal et Gambie (overrides/mali/_regions.geojson). Une entité « Empire du Mali »
// (core) + Tekrour, Jolof, Takedda (tributaires) et Mema (allié, 1235-1236). Frontières approximatives.
import { cartoEmpire } from './fromCarto.ts';

export const mali = cartoEmpire('mali');
