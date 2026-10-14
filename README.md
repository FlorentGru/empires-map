# Atlas des Empires

Un planisphère interactif pour voir l'évolution des grands empires de l'histoire. Choisis un empire, appuie sur **Play** et regarde ses frontières évoluer d'une date clé à la suivante : batailles, traités, réformes, chutes. Chaque étape est accompagnée d'une explication détaillée.

Empires disponibles : **Rome** (509 av. J.-C. → 1453), **l'Empire napoléonien** (1799 → 1815) et bientôt **la Chine** (-1600 → 1912). Le sélecteur liste plus de 80 empires de l'histoire, à remplir au fil du projet.

## Fonctionnalités

- Carte 2D inclinée avec relief 3D (désactivable) et vue à plat
- Fondu entre les frontières, avec surbrillance des zones gagnées (vert) et perdues (rouge)
- Frise chronologique cliquable, lecture automatique, vitesse ×0,5 à ×2, raccourcis clavier (Espace, ←, →)
- Panneau d'explication : récit, conséquences, fiche bataille, sources
- 55 villes avec leur nom d'époque et leur nom actuel, capitales selon la date
- Légende, liens partageables (`?empire=rome&step=zama-202`), interface adaptée au mobile

## Lancer le projet

Première installation (une seule fois) :

```bash
cd ~/projects/empires-map
npm install
```

Ensuite, au choix :

| Méthode | Commande | Quand l'utiliser |
|---|---|---|
| **Dans un terminal** (le plus fiable) | `npm start` | Démarre le serveur et ouvre le navigateur sur http://localhost:5173. Il tourne tant que le terminal reste ouvert. |
| **Depuis Claude** | dire « lance le serveur » | Claude démarre la configuration `dev` de `.claude/launch.json`, ou réutilise le serveur s'il tourne déjà, et ouvre le panneau navigateur. Le serveur s'arrête avec la session. |
| **Version de production** | `npm run build && npm run preview` | Tester le site optimisé sur http://localhost:4173. |

> Le panneau navigateur intégré à Claude ralentit l'affichage (environ 1 image/s) quand il n'a pas le focus : pour juger la fluidité, ouvrir http://localhost:5173 dans son propre navigateur. Ajouter `?debug=1` à l'URL affiche le compteur d'images par seconde.

Si la page ne s'affiche pas, c'est presque toujours que le serveur n'est pas lancé : relancer `npm start`. Si le port 5173 est déjà pris, un ancien serveur tourne encore : le fermer, ou utiliser l'adresse qu'il affiche.

### Régénérer les données de frontières

```bash
npm run fetch:data   # télécharge historical-basemaps et Natural Earth dans .cache/
npm run build:data   # tous les empires : territoires, diffs, animations (SDF), fond de carte
npm run build:data:napoleon   # un seul empire (rome, napoleon, china)
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

## Documentation

Le fonctionnement détaillé (pipeline géographique, animation des frontières par champs de distance, performances, organisation en agents) est expliqué dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Crédits et licence

- Frontières historiques : [historical-basemaps](https://github.com/aourednik/historical-basemaps) © A. Ourednik, sous licence GPL-3.0
- Terres : [Natural Earth](https://www.naturalearthdata.com/), domaine public
- Relief : Mapzen / AWS Terrain Tiles
- Carte : [MapLibre GL JS](https://maplibre.org/)

Les données de frontières dérivent de historical-basemaps, c'est pourquoi le projet est distribué sous **GPL-3.0** (voir `LICENSE`).
