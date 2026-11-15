// Configuration « Califat omeyyade » (661-750) : 18 étapes composées (scripts/empires/fromCarto.ts)
// d'après overrides/omeyyades/_carto.json : pays Natural Earth 1:50m découpés par des provinces nommées
// (overrides/omeyyades/_regions.geojson : Ifriqiya, Maghreb, Bétique, Septimanie, Khorassan, Transoxiane, Sind…).
// Une entité « Califat omeyyade » (core), les camps rivaux des guerres civiles (Zubayrides, Abbassides, insurgés)
// et des tributaires (Nubie, Arménie, Géorgie, Albanie). Frontières approximatives.
import { cartoEmpire } from './fromCarto.ts';

export const omeyyades = cartoEmpire('omeyyades');
