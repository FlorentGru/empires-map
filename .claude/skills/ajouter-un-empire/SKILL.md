---
name: ajouter-un-empire
description: Ajoute un nouvel empire jouable à l'Atlas des Empires (contenu historique, frontières, animations, figurines, tests). À utiliser quand l'utilisateur demande d'ajouter, créer ou remplir un empire (« ajoutons l'empire mongol », « on fait les Incas »), ou de passer un empire du catalogue de « bientôt » à disponible.
---

# Ajouter un empire à l'Atlas des Empires

Méthode éprouvée sur Rome, l'Empire napoléonien et la Chine. Le but est un résultat complet en **2 agents Sonnet successifs**, l'orchestrateur (toi) faisant le contrat, les petites corrections et l'intégration.

## Règles de travail (préférences de Florent)
- Orchestrateur sur Opus ; **chaque agent en `model: "sonnet"`**. Peu d'agents ; en série s'ils dépendent l'un de l'autre, en parallèle seulement si leurs fichiers sont disjoints.
- Avant d'écrire un prompt, **diagnostique toi-même** et donne aux agents les fichiers exacts, le contrat et les interdits — c'est le plus gros levier d'économie de tokens.
- Interdits à écrire dans chaque prompt : pas de navigateur intégré (bridé à ~1 image/s), ne jamais lire en entier les gros JSON/GeoJSON (utiliser `node -e`), ne relancer que `npm run build:data:<id>`, rapport final court, pas de commit (c'est l'orchestrateur qui commite).
- **Ne pousser sur `main` que des commits verts** : entre le contrat (étape 1) et les figurines (étape 3), le typecheck échoue ; commite en local et ne pousse qu'une fois `npm run typecheck && npm test && npm run test:data` passés (sinon GitHub envoie un e-mail d'échec à Florent à chaque push).
- Réponses à Florent en français, en expliquant simplement ce qui a été fait et ce qui reste à vérifier dans son navigateur.

## Étapes

### 0. Cadrage (avec l'utilisateur)
Si ce n'est pas déjà décidé, demande avec `AskUserQuestion` : période couverte (bornes), découpage en grandes périodes si l'empire dépasse ~300 ans, une frise unique ou plusieurs. Propose une recommandation.
Récupère l'`id` dans `data/empires-catalog.json` (l'empire devient « disponible » dès que `data/empires/<id>/timeline.json` existe).

### 1. Contrat (toi)
Dans `src/types.ts` :
- nouvelles valeurs de `Faction` et `FACTIONS` (peuples et adversaires de l'empire), de `Archetype` et `ARCHETYPES` (personnages typiques) ;
- ajoute les libellés français dans `PEOPLE` de `src/map/armyLayer.ts`.
`npm run typecheck` échouera ensuite uniquement dans `src/figures/` : c'est attendu (l'agent 2 dessine les figurines).
Commit local, **sans push** (la CI serait rouge).

### 2. Agent 1 — Historien (contenu)
Prompt : [references/prompt-historien.md](references/prompt-historien.md) (remplir les champs entre chevrons).
Produit `data/empires/<id>/timeline.json` et complète `data/cities.json`.
À la livraison : relis le rapport, corrige toi-même les petites incohérences (périodes qui se chevauchent, années, ids), valide le JSON, commit local (sans push tant que les figurines manquent).

### 3. Agent 2 — Carte + front + figurines
Prompt : [references/prompt-cartographe-front.md](references/prompt-cartographe-front.md).
Produit `scripts/empires/<id>.ts`, `overrides/<id>/`, les données dans `public/data/empires/<id>/` (territoires, diffs, morph, **SDF du glissement**, voisins), les figurines manquantes et les ajustements de front.
À la livraison, vérifie toi-même :
```bash
npm run typecheck && npm test && npm run test:data && npx vite build
git status --short public/data/empires   # seuls les fichiers du nouvel empire doivent changer (+ les */contemporaries/ des autres empires, régénérés automatiquement)
```
Corrige les petits écarts (une ville mal classée, un statut) directement dans `scripts/empires/<id>.ts`, relance `npm run build:data:<id>`, puis commit + push.

### 4. Vérifications finales (toi)
- Attends la CI : `gh run watch $(gh run list --limit 1 --json databaseId -q '.[0].databaseId') --exit-status`.
- Mets à jour `README.md` (empires disponibles) et `docs/ARCHITECTURE.md` si une technique nouvelle a été introduite.
- Donne à Florent 3-4 liens de test `http://localhost:5173/?empire=<id>&step=<stepId>` sur les étapes marquantes, et rappelle `npm start` si le serveur ne tourne pas.
- Signale honnêtement les limites (frontières approximatives, citations « attribuées », figurines empruntées à un autre peuple).

## Pièges déjà rencontrés
- Les instantanés historical-basemaps sont souvent **trop grossiers** (un seul bloc pour toute une dynastie) : composer les étapes à partir de pays Natural Earth découpés par des **régions nommées** (`overrides/<id>/_regions.geojson`), comme `scripts/empires/napoleon.ts` et `china.ts`.
- Le trait de côte 1:50m peut faire tomber une ville en mer (Constantinople) : utiliser `noclip` ou tester un point à l'intérieur des terres.
- Les entités `status: 'allied'` sont un simple contour : elles sont exclues des diffs, morph et SDF.
- Les armées qui reviennent d'une bataille à l'autre ont un `id` stable et `path[0]` = dernier point de leur trajet précédent.
- Après génération de nouvelles données, **redémarrer le serveur de dev** (le sien et celui de Florent) : un serveur Vite lancé avant la création d'un dossier de `public/` peut servir ses fichiers comme une page HTML (glissement absent, retour au fondu). Les scripts vident désormais les dossiers au lieu de les supprimer (`scripts/fs-utils.ts`), ce qui évite le cas le plus courant.
- Ne jamais regénérer les autres empires : `git status` doit rester vide pour eux.
- Sous Windows, `npm run fetch:data` peut lancer le `bash` de WSL au lieu de Git Bash : lancer directement `bash scripts/fetch-basemaps.sh` depuis Git Bash.
