# Atlas des Empires

Un planisphère interactif pour voir l'évolution des grands empires de l'histoire. Choisis un empire, appuie sur **Play** et regarde ses frontières évoluer d'une date clé à la suivante : batailles, traités, réformes, chutes. Chaque étape est accompagnée d'une explication détaillée.

Premier empire disponible : **Rome, de la République à Byzance** (509 av. J.-C. → 1453), en 29 étapes.

## Fonctionnalités

- Carte 2D inclinée avec relief 3D (désactivable) et vue à plat
- Fondu entre les frontières, avec surbrillance des zones gagnées (vert) et perdues (rouge)
- Frise chronologique cliquable, lecture automatique, vitesse ×0,5 à ×2, raccourcis clavier (Espace, ←, →)
- Panneau d'explication : récit, conséquences, fiche bataille, sources
- 55 villes avec leur nom d'époque et leur nom actuel, capitales selon la date
- Légende, liens partageables (`?empire=rome&step=zama-202`), interface adaptée au mobile

## Démarrer

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:5173.

### Régénérer les données de frontières

```bash
npm run fetch:data   # télécharge historical-basemaps et Natural Earth dans .cache/
npm run build:data   # produit public/data/empires/rome/{territories,diffs}/ et le fond de carte
```

Les corrections historiques des frontières se trouvent dans `overrides/rome/*.geojson`.

## Structure

| Dossier | Contenu |
|---|---|
| `src/` | Application React + MapLibre GL (carte, frise, lecteur, panneaux) |
| `src/types.ts` | Contrat de données (empire, étape, ville, diff) |
| `data/empires/<id>/timeline.json` | Étapes historiques d'un empire (un dossier par empire) |
| `data/cities.json` | Villes, noms successifs, capitales |
| `scripts/` | Pipeline géographique (extraction, overrides, diffs, contrôles) |
| `overrides/` | Corrections manuelles des frontières, étape par étape |
| `public/data/` | Données générées, servies au navigateur |

Pour ajouter un empire, il suffit d'ajouter un dossier dans `data/empires/` et ses territoires : le code n'a pas besoin de changer.

## Feuille de route

- Nouveaux empires : mongol, perse achéménide, napoléonien, britannique…
- Gamification : quiz, « devine la frontière », succès
- Rejouer les grandes batailles

## Crédits et licence

- Frontières historiques : [historical-basemaps](https://github.com/aourednik/historical-basemaps) © A. Ourednik, sous licence GPL-3.0
- Terres : [Natural Earth](https://www.naturalearthdata.com/), domaine public
- Relief : Mapzen / AWS Terrain Tiles
- Carte : [MapLibre GL JS](https://maplibre.org/)

Les données de frontières dérivent de historical-basemaps, c'est pourquoi le projet est distribué sous **GPL-3.0** (voir `LICENSE`).
