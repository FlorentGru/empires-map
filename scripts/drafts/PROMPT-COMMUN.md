Projet « Atlas des Empires », C:\Users\fgru\project\empires-map (Windows ; dans Git Bash : /c/Users/fgru/project/empires-map). Carte interactive de l'évolution des empires. Tu prépares un BROUILLON d'empire : l'HISTOIRE puis la PRÉPARATION CARTOGRAPHIQUE. Les cartes seront générées plus tard par un autre agent quand Node.js sera installé.

PÉRIMÈTRE D'ÉCRITURE STRICT : uniquement `data/drafts/<ID>/` (à créer) et ton dossier de travail `C:\Users\fgru\AppData\Local\Temp\claude\C--Users-fgru-project-empires-map\c027dade-58e0-4bfb-8057-29446cafa624\scratchpad\<ID>\`. Ne modifie RIEN d'autre : ni `data/empires/`, ni `data/cities.json`, ni `src/`, ni `overrides/`. Quatre autres agents travaillent en parallèle sur d'autres empires, chacun dans son propre dossier. Pas de commit.

ENVIRONNEMENT : Windows. **Pas de Node.js** : n'utilise ni `node`, ni `npm`, ni `npx`. Utilise Python 3.13 avec `python -I -X utf8 script.py` (sans `-X utf8`, les accents font planter l'affichage). Dans le code Python, écris les chemins en style Windows (`C:\\Users\\...` ou `r'C:\Users\...'`) : le style `/c/Users/...` ne marche que comme argument de ligne de commande. Ouvre les fichiers en `encoding='utf-8'`. Écris le JSON avec `ensure_ascii=False, indent=2`, en LF, avec un saut de ligne final. `curl` est disponible. Pas de navigateur. Pas de `pip install`.

RÈGLES D'ÉCONOMIE (impératives) : ne lis JAMAIS en entier les gros JSON ou GeoJSON (`data/empires/*/timeline.json`, `data/cities.json`, `.cache/**`) : utilise de petits scripts Python. Rapport final court.

## Partie A — Histoire

FORMAT : lis `src/types.ts` (Empire, EmpirePeriod, TimelineStep, BattleInfo, ArmyMove avec `id` chaîné, Figure, Faction/FACTIONS, Archetype/ARCHETYPES, City). Extrais UNE étape d'exemple de `data/empires/rome/timeline.json` (ex. cannes-216). Regarde comment `data/empires/china/timeline.json` déclare `periods`, `view` et `bounds`. Si ton empire recoupe un empire existant (napoleon 1799-1815, rome jusqu'en 1453, mongols 1206-1368 : `data/empires/<id>/timeline.json`), extrais leurs ids, années et summary sur ta période, pour garder les mêmes dates et les mêmes faits. Ne copie pas leur texte.

PUBLIC : un Français curieux qui connaît mal le sujet. Texte clair et vivant ; noms et peuples expliqués à leur première apparition.

`data/drafts/<ID>/timeline.json` (objet Empire) :
- Champs id, name, color, start, end, description (3-4 phrases), view, bounds, periods (avec une couleur hex douce et distincte, et un `summary` de 2-3 phrases), steps.
- Une étape appartient à la DERNIÈRE période dont start ≤ year : les bornes se touchent sans se chevaucher. Vérifie que chaque étape tombe bien dans la période voulue ; un événement de fin de période daté pile sur la borne bascule dans la période suivante.
- steps : triées par année (jamais 0 ; av. J.-C. = négatif), ids `kebab-année` (ex. `verdun-843`), `territory` = l'id de l'étape.
- Chaque étape : title, type, location [lon,lat], zoom (1,5 à 5,5 ; vues mondiales pour les empires coloniaux), summary, details (markdown, 150-300 mots), consequences (3-5, territoriales d'abord), sources (2-3, dont Wikipédia FR avec une url testée par `curl -s -o /dev/null -w '%{http_code}' -L`).
- `territoryNote` PRÉCIS : ce que contrôle l'empire (régions et pays actuels) ; États vassaux, protectorats, dominions ; en période de division, chaque État rival avec son nom français. C'est la spécification de la partie B.
- `battle` + `armies` pour les batailles : path de 2 à 8 points plausibles (sur terre, par les cols, ou en mer pour les flottes) et un winner. Une armée qui revient garde un `id` stable, et son path[0] = dernier point de son path précédent.
- `figures` pour la politique et la diplomatie. Citation ≤ 120 caractères : authentique et attribuée (« selon … », « d'après … ») ou marquée « (formule libre) ». Chaque étape a au moins 1 armée ou 1 figure.
- Factions et archétypes : prends-les d'abord dans FACTIONS / ARCHETYPES de `src/types.ts`, mais pas de façon anachronique. Les `russes`, `francais`, `britanniques`, `prussiens`, `autrichiens`, `espagnols`, `portugais` et `polonais` existants sont dessinés en uniformes napoléoniens (≈1800). Pour d'autres époques, propose une nouvelle faction. Toute nouvelle faction ou nouvel archétype va dans `data/drafts/<ID>/contract.json` : `{ "factions": [{ "id", "label" (FR, pluriel, ex. « Francs »), "drawing" (signes distinctifs pour le dessinateur : casque, bouclier, arme, couleurs), "info" (fiche de 3-5 lignes, sobre et juste) }], "archetypes": [{ "id", "label", "drawing", "info" }] }`. Ids en kebab-case sans accent. Sois économe : 3 à 7 factions et 1 à 4 archétypes, réutilisables. Vérifie d'abord si un autre brouillon `data/drafts/*/contract.json` en a déjà proposé un équivalent (ex. `vikings`, `francs`) : si oui, réutilise son id et ne le redéclare pas.

`data/drafts/<ID>/cities.json` : `{ "add": [City…], "patch": [{ "id": "<id existant>", "capitalOf": [...]?, "addEmpire": true? }] }`. Commence par lister, par script, les villes existantes de `data/cities.json` (id, modern, coords). Pour une ville existante, ne la recrée pas : ajoute un patch (capitalOf avec `empire: "<ID>"`, ou `addEmpire: true` pour qu'elle s'affiche dans ton empire si elle a un filtre `empires`). Nouvelles villes au format City, avec leurs noms successifs ; lieux de bataille en rank 3 avec `empires: ["<ID>"]`. Pense aussi aux autres brouillons (`data/drafts/*/cities.json`) : ne recrée pas une ville qu'un autre agent a déjà ajoutée, signale-la dans ton rapport.

CONTRÔLE A (script) : JSON valides ; ids uniques ; étapes triées et dans la bonne période ; factions et archétypes existants ou présents dans contract.json ; paths de 2 à 8 points avec chaînage ; citations ≤ 120 caractères ; au moins 1 armée ou figure par étape ; details de 150 à 300 mots ; territory == id.

## Partie B — Préparation cartographique (Python seulement)

Plus tard, le pipeline (`scripts/empires/<id>.ts`, voir `scripts/empires/types.ts` et l'exemple `scripts/empires/napoleon.ts`, que tu peux lire en partie) produira une couche par étape. Deux façons de faire une étape :
- (a) filtrer les entités d'un instantané historical-basemaps (`EmpireStep.entities` : NAME → nom FR) ;
- (b) la COMPOSER avec des unions, intersections et différences : entités d'instantanés (`snap(snapshot, regexNAME)`), pays Natural Earth actuels (`country(regex ADMIN, region?)`), régions nommées de `_regions.geojson`.

Chaque entité a un `status` : `core` (l'empire, ou les royaumes rivaux en période de division), `vassal` (tributaires, protectorats, dominions) ou `allied` (alliés contraints : simple contour).

Outils prêts (ne lis pas les gros fichiers toi-même) :
- `C:\Users\fgru\AppData\Local\Temp\claude\C--Users-fgru-project-empires-map\c027dade-58e0-4bfb-8057-29446cafa624\scratchpad\carto\hb-index.json` : `{ "world_800": [{NAME, SUBJECTO?, PARTOF?, bbox, pts}, …], … }` pour les 43 instantanés disponibles (bc500…bc1, 100…1994). Filtre-le par bbox avec un script.
- `…\scratchpad\carto\ne-countries.json` : pays Natural Earth (ADMIN, NAME, bbox).
- `…\scratchpad\carto\locate.py` : `python -I -X utf8 locate.py C:\Users\fgru\project\empires-map world_1783 2.35,48.85 -0.12,51.5` affiche l'entité qui contient chaque point. Il accepte `ne` (pays actuels) ou le chemin d'un `_regions.geojson` à la place de l'instantané.

À PRODUIRE :
1. `data/drafts/<ID>/carto.json` :
```
{ "empire": "<ID>",
  "basemapNote": "étendue nécessaire vs fond de carte actuel [-25,-40,150,72] ; antiméridien éventuel",
  "steps": [ { "id", "year", "mode": "snapshot" | "compose", "snapshot"?: "world_800",
               "entities": [ { "name": "Empire carolingien", "status": "core",
                               "source": { "snapshot": "world_800", "match": "^Carolingian Empire$" }
                                       | { "union": [ <source>, … ] } | { "diff": [ <source>, <à retirer>, … ] }
                                       | { "country": "^(France|Belgium)$", "region"?: "Neustrie" } | { "region": "Marche d'Espagne" } } ],
               "notes": "écarts entre l'instantané et le territoryNote, choix faits" } ],
  "checkpoints": [ { "name", "pt": [lon,lat], "where": "core|vassal|allied|not-core|any", "from"?: stepId, "to"?: stepId } ] }
```
Les entités sont listées par ordre de priorité : une entité ne chevauche pas les précédentes. Le `match` est une regex sur les NAME RÉELS de l'index (vérifie l'orthographe exacte). Choisis l'instantané le plus proche qui reflète vraiment l'étape. S'il est trop grossier ou faux (fréquent : un seul bloc pour toute une dynastie, frontières d'une autre date), compose plutôt (b).
2. `data/drafts/<ID>/_regions.geojson` : FeatureCollection de régions nommées (`properties.name`), en polygones simples (10 à 40 sommets), pour les découpes que ni les instantanés ni Natural Earth ne donnent (marches, provinces historiques, lignes de traité). Les polygones peuvent déborder en mer : ils seront intersectés avec les terres.
3. ~20 checkpoints (villes témoins couvrant toutes les périodes, dedans ET dehors).
4. CONTRÔLE B (script) : ids de carto.json == ids de la timeline (mêmes années, même ordre). Chaque `match` trouve au moins une entité dans son instantané. Pour chaque checkpoint et chaque étape de sa plage, résous la source avec `locate.py` (snapshot, ne, régions) et vérifie la cohérence avec le statut attendu ; une composition complexe peut être approchée. Note les KO dans `notes` et dans le rapport.

RAPPORT FINAL (court) : étapes par période ; liste compacte `id | année | mode | entités (statut)` ; nouvelles factions et archétypes ; villes ajoutées et patchées ; checkpoints OK/KO ; limites (instantanés faux, étendue du fond de carte, citations incertaines).
