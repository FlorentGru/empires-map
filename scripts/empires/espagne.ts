// Configuration « Empire espagnol » (1492-1976) : 33 étapes, une Feature PAR ÉTAT (Espagne, vice-royautés, possessions).
//
// Choix cartographique : COMPOSITION pilotée par les données (scripts/empires/fromCarto.ts), d'après
// overrides/espagne/_carto.json (spécification de l'historien-cartographe) : une liste d'entités ordonnées
// (priorité décroissante) ; chaque entité a un `status` (core = possession espagnole, vassal = dépendance/protégé)
// et une expression `source` (évaluée par fromCarto.ts) :
//   { country, region? }    pays Natural Earth 1:50m (regex), éventuellement découpé par une région nommée
//   { region }              polygone de overrides/espagne/_regions.geojson
//   { snapshot, match }     entités d'un instantané historical-basemaps dont NAME correspond à la regex
//   { union: [...] } / { diff: [a, b, ...] }   opérations booléennes
// Les instantanés sont trop grossiers pour les Amériques d'avant 1800 ; on privilégie Natural Earth + régions.
// Frontières approximatives (échelle de la décennie, pas de la commune). Aucune géométrie ne franchit
// l'antiméridien (Philippines, Mariannes et Carolines restent < 180°E).
import { cartoEmpire } from './fromCarto.ts';

export const espagne = cartoEmpire('espagne');
