# Sources et licences des données cartographiques

## Frontières historiques — historical-basemaps
- Auteur : André Ourednik et contributeurs — https://github.com/aourednik/historical-basemaps
- Licence : **GNU GPL-3.0**
- Utilisation : les fichiers `empires/rome/territories/*.geojson` sont des œuvres dérivées
  (extraction des entités romaines/byzantines, fusion, découpe sur les côtes, simplification).
  Les fichiers `empires/rome/diffs/*.geojson` (zones gagnées/perdues entre deux étapes) en sont
  également dérivés (GPL-3.0)
  des instantanés `world_bc500` … `world_1400`. Ils sont donc redistribués sous GPL-3.0.
  L'année de l'instantané utilisé figure dans la propriété `sourceYear` de chaque Feature.

## Côtes et fond de carte — Natural Earth
- Natural Earth, 1:50m Physical Vectors, « Land » — https://www.naturalearthdata.com/
  (copie GeoJSON : https://github.com/nvkelso/natural-earth-vector)
- Licence : **domaine public**
- Utilisation : `basemap/land.geojson` (simplifié, découpé à la bbox [-20, 15, 65, 62]) et découpe des territoires sur le trait de côte.

## Corrections manuelles
Les étapes sans instantané adapté sont corrigées par les overrides de `overrides/rome/`
(polygones approximatifs reconstitués d'après la littérature historique ; chaque Feature
porte une propriété `note`). Lorsqu'un override modifie une entité, `sourceYear` vaut
l'année de l'étape. Ces tracés sont indicatifs et non des frontières exactes.

Régénération : `npm run fetch:data && npm run build:data`.
