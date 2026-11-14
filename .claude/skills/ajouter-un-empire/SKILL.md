---
name: ajouter-un-empire
description: Ajoute un nouvel empire jouable à l'Atlas des Empires (contenu historique, frontières, animations, figurines, tests). À utiliser quand l'utilisateur demande d'ajouter, créer ou remplir un empire (« ajoutons l'empire mongol », « on fait les Incas »), ou de passer un empire du catalogue de « bientôt » à disponible.
---

# Ajouter un empire à l'Atlas des Empires

Méthode éprouvée sur dix empires (de Rome aux Incas). Le but : un résultat complet avec **3-4 agents courts** et le bon modèle pour chaque tâche. L'orchestrateur (toi) fait le contrat, les relectures, les petites corrections et l'intégration.

## Modèles et économie de tokens
| Tâche | Modèle | Prompt |
|---|---|---|
| Cadrage, contrat de types, relectures, intégration, finitions (SEO, OG, README) | Opus (toi) | — |
| Historien : timeline, villes, people, profile, inventions (un seul agent : le contexte n'est lu qu'une fois) | `sonnet` | [prompt-historien.md](references/prompt-historien.md) |
| Cartographe : `_carto.json` + `_regions.geojson` (fromCarto), contrôles par points | `sonnet` | [prompt-cartographe.md](references/prompt-cartographe.md) |
| Figurines des factions nouvelles (copie guidée d'une faction voisine) | `haiku` | [prompt-figurines-haiku.md](references/prompt-figurines-haiku.md) |
| Textes des régions (`regions.json`) | `haiku` | [prompt-regions-haiku.md](references/prompt-regions-haiku.md) |

Repères mesurés sur les Incas : figurines (Haiku) ~80 k tokens en 1 min ; historien (Sonnet) ~160 k tokens en 8 min. Haiku suffit quand la tâche a **un exemple à recopier, des fichiers exacts et une commande de validation** ; dès qu'il faut un jugement (histoire, géographie), garder Sonnet.

Leviers, par ordre d'effet :
1. **Réutiliser** factions et archétypes existants avant d'en créer (`grep` dans `src/types.ts` : les Incas avaient déjà `incas`, `tercios`, `souverain-precolombien`, `conquistador`). Regrouper les adversaires mineurs sous une faction générique (`chancas` = tous les peuples andins rivaux).
2. **Diagnostiquer soi-même** avant le prompt : fichiers exacts, lignes à lire, exemple à copier, interdits, commande de validation.
3. Paralléliser les agents à fichiers disjoints : historien ∥ figurines (le contrat fixe les factions), puis cartographe seul.
4. Les cartes passent toujours par `fromCarto` : des données, pas de code TS.
5. Faire les retouches d'une ligne soi-même (légende `EMPIRE_SPRITES`, `SLUGS`) au lieu de les déléguer.

## Règles de travail (préférences de Florent)
- Peu d'agents ; en série s'ils dépendent l'un de l'autre, en parallèle seulement si leurs fichiers sont disjoints. Lancer en `run_in_background: true`.
- Interdits à écrire dans chaque prompt : pas de navigateur intégré, ne jamais lire en entier les gros JSON/GeoJSON (`node -e` avec `JSON.parse(fs.readFileSync(...))`), ne relancer que `npm run build:data:<id>`, rapport final court, pas de commit (c'est l'orchestrateur qui commite).
- **Ne pousser sur `main` que des commits verts** (sinon GitHub envoie un e-mail d'échec à Florent). Entre le contrat et les figurines, le typecheck échoue : commite en local ou sur une branche de travail (la CI ne tourne que sur `main` et les PR).
- **Caméra libre** : ne jamais borner la navigation (`maxBounds`, `setMaxBounds`) ; `bounds` dans `timeline.json` sert seulement à cadrer les voisins au build (`scripts/build-neighbors.ts`).
- Réponses à Florent en français, en expliquant simplement ce qui a été fait et ce qui reste à vérifier dans son navigateur.

## Étapes

### 0. Cadrage (avec l'utilisateur)
Si ce n'est pas déjà décidé, demande avec `AskUserQuestion` : période couverte (bornes), découpage en grandes périodes si l'empire dépasse ~300 ans, une frise unique ou plusieurs. Propose une recommandation.
Récupère l'`id` dans `data/empires-catalog.json` (l'empire devient « disponible » dès que `data/empires/<id>/timeline.json` existe). Si `.cache/` est absent : `npm run fetch:data` (une fois, pendant que l'historien travaille).

Suivi : chaque empire du catalogue a déjà son issue (label `empire`, sous-issue de #57 « Prochains empires du catalogue », liste de livrables à cocher) : reprends-la (`gh issue list --label empire`) et passe sa carte du project n° 2 « En cours » (`gh project item-edit`). Pour un empire hors catalogue, crée-la sur le même modèle. Les commits citent `#N` (« Ottomans 1/3 (#N): … »), le dernier `Closes #N` ; à la fin, carte « Fait » avec la Date.

### 1. Contrat (toi)
Dans `src/types.ts` : nouvelles valeurs de `Faction`/`FACTIONS` et `Archetype`/`ARCHETYPES` **seulement si aucune existante ne convient** ; libellés français dans `PEOPLE` de `src/map/armyLayer.ts`. Ajoute toi-même la figurine de légende dans `EMPIRE_SPRITES` (`src/panels/Legend.tsx`) et, si l'id n'est pas un mot français, son slug dans `SLUGS` (`src/lib/seo.ts`). `npm run typecheck` échoue ensuite uniquement dans `src/figures/` : attendu.

### 2. Historien (Sonnet) ∥ Figurines (Haiku)
Lance les deux en même temps (fichiers disjoints).
- Historien : `data/empires/<id>/{timeline,people,profile,inventions}.json` + `data/cities.json`. À la livraison : relis un échantillon, corrige les petites incohérences, `npm run test:data` (seuls cartes, SDF, régions, OG manquent).
- Figurines : à la livraison, vérifie typecheck + un aperçu des SVG (`soldierSvg(faction, 0)` via `npx tsx`, rendu en une capture de 3 figurines côte à côte).

### 3. Cartographe (Sonnet)
Produit `overrides/<id>/_carto.json` et `_regions.geojson`, `scripts/empires/<id>.ts` (`cartoEmpire('<id>')`), l'entrée dans `scripts/empires/index.ts` et `build:data:<id>` dans `package.json`. À la livraison :
```bash
npm run typecheck && npm test && npm run test:data && npx vite build
git status --short public/data/empires   # seuls <id>/ et les */contemporaries/ des autres empires
```
Corrige les petits écarts directement dans `_carto.json`, relance `npm run build:data:<id>`.

### 4. Régions (Haiku)
`npx tsx scripts/list-regions.ts <id>` liste chaque entité nommée ; l'agent Haiku rédige `data/empires/<id>/regions.json` puis lance `--sync`. Relis les textes (justesse historique) avant de commiter.

### 5. Vérifications finales (toi)
- `npm run build:og` → commite `public/og/<id>.png` ; `npm run build` annonce les nouvelles pages (`prerender : N pages`) ; `npm run check:bundle`.
- **Le monde en l'an X** : `npx vitest run tests/unit/worldYear.test.ts` et une capture headless de `/?world=1&year=<apogée>` : l'empire est listé et dessiné.
- Mets à jour `README.md` (empires disponibles, chiffres) et l'état dans `CLAUDE.md`.
- Pousse, puis attends la CI.
- Donne à Florent 3-4 liens de test `http://localhost:5173/<slug>/<stepId>/` et rappelle `npm start` si le serveur ne tourne pas.
- Signale honnêtement les limites (frontières approximatives, citations « attribuées », figurines empruntées à un autre peuple, sources non vérifiées).

## Pièges déjà rencontrés
- Les instantanés historical-basemaps sont souvent **trop grossiers** (un seul bloc pour toute une dynastie) : composer les étapes à partir de pays Natural Earth découpés par des **régions nommées** (`overrides/<id>/_regions.geojson`), comme `scripts/empires/napoleon.ts` et `china.ts`.
- Le trait de côte 1:50m peut faire tomber une ville en mer (Constantinople) : utiliser `noclip` ou tester un point à l'intérieur des terres.
- Les entités `status: 'allied'` sont un simple contour : elles sont exclues des diffs, morph et SDF.
- Les armées qui reviennent d'une bataille à l'autre ont un `id` stable et `path[0]` = dernier point de leur trajet précédent.
- Après génération de nouvelles données, **redémarrer le serveur de dev** (le sien et celui de Florent) : un serveur Vite lancé avant la création d'un dossier de `public/` peut servir ses fichiers comme une page HTML (glissement absent, retour au fondu). Les scripts vident désormais les dossiers au lieu de les supprimer (`scripts/fs-utils.ts`), ce qui évite le cas le plus courant.
- Le Saint-Empire avait la caméra enfermée dans son `bounds` (Europe centrale) : on ne pouvait plus aller voir les empires contemporains. `bounds` ne limite plus la caméra ; ne pas réintroduire de borne.
- Ne jamais regénérer les autres empires : `git status` doit rester vide pour eux.
- Sous Windows, `npm run fetch:data` peut lancer le `bash` de WSL au lieu de Git Bash : lancer directement `bash scripts/fetch-basemaps.sh` depuis Git Bash.
- Après création de `data/empires/<id>/`, des tests vitest peuvent échouer en `loaders[key] is not a function` : la liste de `import.meta.glob` est en cache dans `node_modules/.vitest-cache` (clé = contenu du fichier source). `rm -rf node_modules/.vitest-cache` ; la CI n'est pas touchée.
- Les URL Wikipédia : `curl` en boucle déclenche des 429 ; vérifier les titres en un seul appel à l'API (`action=query&titles=A|B|…&redirects=1`, pages `missing`), et écarter les pages d'homonymie (`prop=pageprops`).
- `require('x.geojson')` échoue et affiche tout le fichier dans l'erreur (des milliers de tokens perdus) : toujours `JSON.parse(fs.readFileSync(...))`.
- En session cloud, `fr.wikipedia.org` peut être bloqué par le réseau (403 du proxy) : ne pas boucler, lister les titres utilisés et les faire vérifier par Florent (ou ajouter l'hôte dans les réglages réseau de l'environnement).
- Capture headless en session cloud : le Playwright du projet peut ne pas trouver son navigateur ; passer `executablePath: '/opt/pw-browsers/chromium-*/chrome-linux*/chrome'`.
- Captures headless de la carte : **un seul onglet par lancement de navigateur**. Une deuxième page ouverte dans le même Chromium (WebGL logiciel) peut rester vide (relief seul, sans terres ni territoires) : ce n'est pas une régression du site.
- Cartographe : donner les surfaces visées par étape et dire que les régions suivent les provinces tributaires (pas un couloir le long d'un fleuve). Si des provinces voisines laissent des couloirs vides, élargir chaque région de ~20 km (`turf.buffer` puis `turf.simplify`) sauf les enclaves et les petits noyaux, puis vérifier checkpoints et morphs.
