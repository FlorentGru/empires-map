# Prompt — Cartographe (Sonnet)

Après l'historien. `Agent` avec `subagent_type: "general-purpose"`, `model: "sonnet"`, `run_in_background: true`. Remplace les `<…>`.

---

Projet « Atlas des Empires », /home/user/empires-map (pipeline géo en tsx). Tu es le CARTOGRAPHE de <nom> (id "<id>", <N> étapes). Pas de commit, pas de navigateur, rapport final court.

ÉCONOMIE (impératif) :
- Ne lis jamais en entier un gros JSON/GeoJSON : `node -e` avec `JSON.parse(fs.readFileSync(...))`. `require()` échoue sur `.geojson` et affiche tout le fichier.
- Données Natural Earth dans `.cache/`.
- Ne lance que `npm run build:data:<id>` ; ne regénère JAMAIS les autres empires.

Le travail est surtout DES DONNÉES : la méthode est `scripts/empires/fromCarto.ts`. Lis ce fichier (71 lignes) et `scripts/empires/ottomans.ts` (7 lignes) ; pour le format, extrais avec node 2 étapes et 3 checkpoints de `overrides/ottomans/_carto.json`, puis 2 features de `_regions.geojson`.

## À produire
1. `scripts/empires/<id>.ts` (copie de ottomans.ts : `cartoEmpire('<id>')`), enregistré dans `scripts/empires/index.ts`. Ajoute `build:data:<id>` dans `package.json` sur le modèle de `build:data:ottomans`.
2. `overrides/<id>/_regions.geojson` : polygones nommés en français (`region`), dessinés en suivant le relief et les fleuves, 8 à 12 points chacun. Ils découpent les pays Natural Earth (`{ "country": "<regex>", "region": "..." }`). Extensions successives réunies par `union`. Proposition de régions : <liste>.
3. `overrides/<id>/_carto.json` : { empire, basemapNote, steps, checkpoints }. Une étape par étape de la timeline (ids et années identiques) ; la spécification est la `territoryNote` (extrais `id | year | territoryNote`). Statuts : `core` pour l'empire (et les royaumes rivaux en période de division), `vassal` pour les tributaires, `allied` pour un simple contour. Les rivaux indépendants n'apparaissent pas, sauf en période de division.
4. `checkpoints` : ~20 villes témoins (`where` core / not-core, `from`/`to` = ids d'étapes) : <liste ville → statut attendu>. Une ville côtière hors du trait de côte : point à 5-10 km dans les terres.
5. `npm run build:data:<id>` : les checkpoints passent tous, et les surfaces (`public/data/empires/<id>/stats.json`) sont plausibles (apogée ~<surface> km²).

## RÈGLE STRICTE
`git status --short public/data/empires` ne montre QUE `<id>/` et les `*/contemporaries/` des autres empires ; tout autre changement est annulé par `git checkout`.

## Validation finale
`npm run typecheck`, prettier sur les fichiers créés, puis `npm run test:data` : seuls `regions.json` et l'image OG peuvent encore manquer.

Rapport final :
- fichiers ;
- tableau `étape | surface km²` ;
- checkpoints ;
- limites.
