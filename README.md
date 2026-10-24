# Atlas des Empires

[![CI](https://github.com/FlorentGru/empires-map/actions/workflows/ci.yml/badge.svg)](https://github.com/FlorentGru/empires-map/actions/workflows/ci.yml)

Un planisphère interactif pour voir l'évolution des grands empires de l'histoire. Choisis un empire, appuie sur **Play** et regarde ses frontières évoluer d'une date clé à la suivante : batailles, traités, réformes, chutes. Chaque étape est accompagnée d'une explication détaillée.

Empires disponibles : **l'Empire d'Alexandre le Grand** (336 → 323 av. J.-C.), **Rome** (509 av. J.-C. → 1453), **la Chine** (-1600 → 1912), **l'Empire mongol** (1206 → 1368), **l'Empire espagnol** (1492 → 1976), **l'Empire carolingien** (751 → 888), **le Saint-Empire romain germanique** (962 → 1806), **l'Empire ottoman** (1299 → 1922) et **l'Empire napoléonien** (1799 → 1815). Site en ligne : https://florentgru.github.io/empires-map/ Le sélecteur liste, par continent, les plus vastes et les plus célèbres empires de l’histoire, à remplir au fil du projet.

## Fonctionnalités

- Carte 2D inclinée avec relief 3D (désactivable) et vue à plat
- Fondu entre les frontières, avec surbrillance des zones gagnées (vert) et perdues (rouge)
- Frise chronologique cliquable, lecture automatique, vitesse ×0,5 à ×2, raccourcis clavier (Espace, ←, →)
- Panneau d'explication : récit, conséquences, fiche bataille, sources
- Page « Tous les empires » (`?empires=1`) : frise de tous les empires du catalogue (disponibles en couleur, à venir grisés), filtre par continent, résumé au clic (apogée, périodes, moments clés, personnages, inventions, héritage) et résumé rédigé par le sage
- « ▶ Voir la bataille » : une fenêtre animée simule la bataille avec les figurines et couleurs de chaque peuple, à l'échelle (1 figurine ≈ N hommes) ; scénario historique (formations, manœuvres, terrain) pour 12 grandes batailles (Cannes, Gaugamèles, Austerlitz, Waterloo…), simulation schématique pour quelques autres
- Mode « 🎯 Devine la suite » : avant chaque étape, une question à choix sur ce qui arrive (vainqueur, événement, année, territoire), avec score (`&guess=1`)
- Armées animées qui marchent depuis leur ville de départ, fiches de bataille, personnages avec leur citation
- Mode Histoire : l'empire raconté étape par étape par un narrateur
- Régions survolables et cliquables (royaumes vassaux, provinces, dynasties rivales), avec une courte explication
- Calques de l'époque : 87 monuments (dont les 7 merveilles du monde antique), inventions, 24 routes commerciales, 48 catastrophes et guerres, empires contemporains et capitales des voisins
- Galerie des personnages illustres, des monuments et des inventions
- Vue « Le monde en l'an X » (`?world=1&year=…`) : tous les empires à une même date
- Comparaison de deux empires côte à côte (`?compare=rome,china`)
- Quiz du sage (rédigé par l'IA) ou quiz hors ligne
- 222 villes avec leur nom d'époque et leur nom actuel, capitales selon la date
- Légende, liens partageables et lisibles (`/rome/zama-202/`, `/monuments/` ; les anciens liens `?empire=&step=` marchent encore), formulaire « Votre avis », interface adaptée au mobile

## Tests

Un test par grosse fonctionnalité, pas un test par détail :
- `npm test` : logique centrale (Vitest) : années, périodes, armées et marches, comparaison, événements du monde, piles, quiz hors ligne.
- `npm run test:data` : validation de toutes les données, un contrôle groupé par fichier qui liste toutes les erreurs d'un coup.
- `npm run test:e2e` : 17 parcours dans Chromium (Playwright), un par fonctionnalité (carte, armées, galerie, comparaison, monde en l'an X, quiz, sage, calques de l'époque…) ; première fois : `npx playwright install chromium`. Ils construisent le site puis le servent sur le port 4173.
- Un seul test : `npx vitest run tests/unit/march.test.ts -t "<nom>"` ou `npx playwright test e2e/map.spec.ts -g "<nom>"`.
- `npm run check:bundle` : vérifie que le JavaScript chargé au démarrage reste sous 460 Ko (gzip ; les SVG des figurines sont chargés à la demande, `src/map/sprites.ts`).
- `npm run lint` (oxlint) et `npm run format` / `format:check` (Prettier) : style du code.
- Le CI GitHub Actions lance en parallèle les contrôles rapides (types, style, tests unitaires et de données) et les tests dans le navigateur.

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

> Le panneau navigateur intégré à Claude ralentit l'affichage (environ 1 image/s) quand il n'a pas le focus : pour juger la fluidité, ouvrir http://localhost:5173 dans son propre navigateur. Ajouter `?debug=1` à l'URL affiche le compteur d'images par seconde (et, pendant un glissement de frontière, la pire image et le nombre d'images lentes).

Si la page ne s'affiche pas, c'est presque toujours que le serveur n'est pas lancé : relancer `npm start`. Si le port 5173 est déjà pris, un ancien serveur tourne encore : le fermer, ou utiliser l'adresse qu'il affiche.

### Régénérer les données de frontières

```bash
npm run fetch:data   # télécharge historical-basemaps et Natural Earth dans .cache/
npm run build:data   # tous les empires : territoires, diffs, animations (SDF), fond de carte
npm run build:data:napoleon   # un seul empire (rome, napoleon, china, mongols, espagne, saint-empire, carolingiens, alexandre)
```

Les corrections historiques des frontières se trouvent dans `overrides/<empire>/` : des polygones par étape et, pour les cartes composées région par région, `_carto.json`. Relancer le serveur Vite après une régénération.

### Référencement (SEO)

`npm run build` pré-rend 262 pages HTML (accueil, empires, étapes, pages de synthèse `/empires/`, `/monuments/`, `/personnages/`, `/inventions/`) avec leurs balises, Open Graph et JSON-LD, ainsi que `sitemap.xml`, `robots.txt`, `llms.txt` et une page 404. Les images de partage et les icônes se régénèrent avec `npm run build:og` (PNG commités dans `public/og/`).

## Lancer l'Atlas gratuitement

Aucun serveur payant n'est nécessaire : l'Atlas est un site statique (HTML, JS, données), et le sage tourne sur ton propre PC.

### Sur ton PC (Linux, macOS ou Windows)
1. Installer **Node.js LTS** (gratuit, [nodejs.org](https://nodejs.org)) et **Git**.
2. Récupérer le projet : `git clone https://github.com/FlorentGru/empires-map.git`, puis `cd empires-map` (ou `git pull` s'il est déjà là).
3. Installer les dépendances (une fois, puis après chaque mise à jour) : `npm ci`.
4. Lancer : `npm run serve`, puis ouvrir **http://localhost:4173**.
   - Le serveur écoute aussi sur le réseau local : depuis un téléphone ou une tablette sur le même Wi-Fi, ouvrir `http://<adresse-IP-du-PC>:4173` (Windows : `ipconfig` ; Linux : `ip addr`). Le pare-feu peut demander l'autorisation la première fois.
   - Pour développer (rechargement à chaud) : `npm run dev`, puis http://localhost:5173.
5. Facultatif, le **sage** (chatbot et quiz rédigé par l'IA) : dans un second terminal, `npm run agent` (Python 3.12 et une clé d'API dans `agent/.env`, voir [agent/README.md](agent/README.md)).

Arrêter le serveur : `Ctrl+C` dans le terminal.

### En ligne, gratuitement, avec GitHub Pages
Le workflow [.github/workflows/pages.yml](.github/workflows/pages.yml) construit et publie l'Atlas à chaque push sur `main`, à l'adresse `https://<compte>.github.io/empires-map/`.
- **Activation (une seule fois)** : sur GitHub, dépôt → **Settings** → **Pages** → *Build and deployment* → **Source : GitHub Actions**. Le prochain push (ou *Actions → Pages → Run workflow*) publie le site.
- **Limites de la version en ligne** : le sage et le quiz rédigé par l'IA n'y sont pas (ils ont besoin du serveur Python et d'une clé, qu'on ne publie jamais). Le **quiz hors ligne**, la carte et tout le reste fonctionnent.

## Structure

| Dossier | Contenu |
|---|---|
| `src/` | Application React + MapLibre GL (carte, frise, lecteur, panneaux) |
| `src/types.ts` | Contrat de données (empire, étape, ville, diff) |
| `data/empires/<id>/` | Un dossier par empire : étapes (`timeline.json`), personnages, profil, inventions, régions |
| `data/*.json` | Villes, monuments, routes, catastrophes, capitales des voisins |
| `scripts/` | Pipeline géographique (extraction, overrides, diffs, champs de distance, contrôles), pré-rendu SEO |
| `overrides/` | Corrections manuelles des frontières, étape par étape |
| `public/data/` | Données générées, servies au navigateur |
| `build/` | Plugin Vite qui fabrique l'index des empires, chargés ensuite à la demande |
| `agent/` | Le sage : agent Google ADK en Python |
| `tests/`, `e2e/` | Tests unitaires et de données (Vitest), parcours dans le navigateur (Playwright) |

Pour ajouter un empire, il suffit d'ajouter un dossier dans `data/empires/` (avec `timeline.json`, `people.json`, `profile.json`, `inventions.json` et `regions.json`) et ses territoires : le code n'a pas besoin de changer. Avec Claude Code, le skill `ajouter-un-empire` guide tout le processus.

## Feuille de route

- Nouveaux empires : Perse achéménide, Empire britannique…
- Gamification : « devine la frontière », succès
- Rejouer les grandes batailles

## Guide conversationnel (agent IA)

Un chatbot construit avec **Google ADK** (Python) répond aux questions sur l'histoire des empires à partir des données du projet et peut déplacer la carte (« Montre-moi Austerlitz »). Il fonctionne avec Gemini ou Claude.

```bash
cp agent/.env.example agent/.env   # y mettre une clé Google AI Studio ou Anthropic
npm run agent                      # serveur de l'agent (port 8000), à côté de npm start
```

Explications complètes, pour apprendre à construire un agent : [docs/AGENT.md](docs/AGENT.md).

## Documentation

Le fonctionnement détaillé (pipeline géographique, animation des frontières par champs de distance, performances, organisation en agents) est expliqué dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Crédits et licence

- Frontières historiques : [historical-basemaps](https://github.com/aourednik/historical-basemaps) © A. Ourednik, sous licence GPL-3.0
- Terres : [Natural Earth](https://www.naturalearthdata.com/), domaine public
- Relief : Mapzen / AWS Terrain Tiles
- Carte : [MapLibre GL JS](https://maplibre.org/)

Les données de frontières dérivent de historical-basemaps, c'est pourquoi le projet est distribué sous **GPL-3.0** (voir `LICENSE`).
