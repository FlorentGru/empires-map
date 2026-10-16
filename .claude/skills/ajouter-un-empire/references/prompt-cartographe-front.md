# Prompt — Agent 2 : Carte + front + figurines

À lancer après l'historien, avec `Agent` (`subagent_type: "general-purpose"`, `model: "sonnet"`, `run_in_background: true`). Remplace les champs `<…>`.

---

Projet « Atlas des Empires », C:\Users\fgru\project\empires-map (Windows ; dans Git Bash : /c/Users/fgru/project/empires-map) (Vite + React + TS strict + maplibre-gl ; pipeline géo en tsx). Tu es l'unique agent de cette livraison : CARTE + FRONT + FIGURINES pour l'empire « <id> ». Pas de commit.

RÈGLES D'ÉCONOMIE (impératives) : ne lis jamais en entier les gros JSON/GeoJSON — `node -e`. Lis seulement le code utile. Pas de navigateur. Ne lance que `npm run build:data:<id>` (jamais le build complet). Rapport final court. Ordre : figurines, front, puis pipeline.

## A. Figurines (src/figures/soldiers.tsx, characters.tsx, registry.ts, descriptions.ts)
`npm run typecheck` échoue tant que les nouvelles `Faction` / `Archetype` de src/types.ts ne sont pas dessinées. Même style et même API que l'existant (contour #3b2a1a, aplats, viewBox 32×40 soldats / 36×48 personnages, 2 frames de marche + état vaincu). Soldats : <liste avec signes distinctifs>. Personnages : <liste>. Ajoute leurs FACTION_COLORS (distinctes, lisibles sur parchemin) et leurs fiches FACTION_INFO / ARCHETYPE_INFO (3-5 lignes, sobres et justes). Valide les SVG (xmllint si présent).

## B. Front
Vérifie seulement ce qui est spécifique à cet empire : vue initiale (`empire.view`), bornes (`empire.bounds`), bandes de périodes lisibles sur la frise, légende avec ses entités, figurines de la légende. N'ajoute du code que si nécessaire.

## C. Pipeline (scripts/, overrides/<id>/, public/data/empires/<id>/)
1. Si les bornes de l'empire sortent du fond de carte actuel (`LAND_BBOX` de scripts/build-territories.ts, `BBOX` de scripts/build-countries.ts), élargis-les et garde land.geojson < ~350 Ko.
2. `scripts/empires/<id>.ts` sur le modèle de `scripts/empires/napoleon.ts` et `china.ts` (lis `scripts/empires/types.ts` et `index.ts` ; enregistre l'empire dans index.ts ; ajoute `build:data:<id>` dans package.json sur le modèle des autres). Spécification de chaque étape = son `territoryNote` (extrais-les avec node). Commence par LISTER les noms d'entités réels des instantanés historical-basemaps pertinents dans .cache (télécharge ceux qui manquent via scripts/fetch-basemaps.sh). Si les instantanés sont trop grossiers, COMPOSE les étapes à partir de pays Natural Earth découpés par des régions nommées (`overrides/<id>/_regions.geojson`). Une Feature par État avec `name` FR et `status` : `core` (l'empire, et les royaumes rivaux en période de division), `vassal` (tributaires, protectorats), `allied` (alliés contraints : simple contour).
3. `npm run build:data:<id>` : territoires, diffs, morph, SDF, voisins. Contrôle par points (Checkpoint de l'EmpireConfig) sur ~20 villes témoins par période : <liste ville → statut attendu par période>.
4. RÈGLE STRICTE : `git status --short public/data/empires` ne doit montrer QUE des fichiers de `<id>` (les autres empires ne changent pas), à l'exception des dossiers `*/contemporaries/` des autres empires, régénérés automatiquement par `build-contemporaries`.

## Validation finale
`npm run typecheck`, `npm test`, `npm run test:data`, `npx vite build`, `npm run build:data:<id>` (contrôle par points OK, SDF OK). Rapport final : fichiers, choix de cartographie (instantanés ou composition), tableau de contrôle compact, limites.
