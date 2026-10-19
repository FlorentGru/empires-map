# Prompt — Agent 1 : Historien

À lancer avec `Agent` (`subagent_type: "general-purpose"`, `model: "sonnet"`, `run_in_background: true`). Remplace les champs `<…>`.

---

Projet « Atlas des Empires », C:\Users\fgru\project\empires-map (Windows ; dans Git Bash : /c/Users/fgru/project/empires-map). Tu es l'HISTORIEN. Périmètre d'écriture : `data/empires/<id>/timeline.json` (nouveau) et `data/cities.json`. Rien d'autre. Pas de commit.

RÈGLES D'ÉCONOMIE (impératives) : ne lis JAMAIS en entier les gros JSON (data/empires/*/timeline.json, cities.json) — utilise de petits scripts `node -e`/python pour lire un extrait ou écrire. Pour le format, lis `src/types.ts` (Empire, EmpirePeriod, TimelineStep, BattleInfo, ArmyMove avec `id` chaîné, Figure, Faction/FACTIONS, Archetype/ARCHETYPES, City) et extrais UNE étape d'exemple de `data/empires/rome/timeline.json` (ex. cannes-216). Pas de navigateur. Rapport final court.

PUBLIC : un Français curieux qui connaît mal le sujet. Texte clair et vivant, noms et peuples expliqués à leur première apparition.

À ÉCRIRE — `data/empires/<id>/timeline.json` (objet Empire) :
- id "<id>", name « <nom> », color "<hex>", start <début>, end <fin>, description (3-4 phrases), view { center: [<lon>, <lat>], zoom: <3–4> }, bounds [[<ouest>, <sud>], [<est>, <nord>]] (cadre des voisins dessinés, assez large pour les empires contemporains ; il ne limite jamais la caméra).
- periods (si l'empire est long) : <liste id / nom / début / fin>, chacune avec une couleur hex douce et distincte et un `summary` de 2-3 phrases lu en mode Histoire. Une étape appartient à la dernière période dont start ≤ year : les bornes doivent se toucher sans se chevaucher.
- steps : ~<N> étapes triées par année (jamais 0 ; av. J.-C. = négatif), ids `kebab-année` (ex. `cannes-216`). Incontournables : <liste>.
- Chaque étape : title, type, location [lon,lat], zoom (3 à 5,5), summary, details (markdown 150-300 mots), consequences (3-5, territoriales d'abord), sources (2-3, dont Wikipédia FR avec url testée par `curl -s -o /dev/null -w '%{http_code}' -L`), `territory` = id, et `territoryNote` PRÉCISE : ce que contrôle l'empire (provinces, régions), les États vassaux/tributaires et, en période de division, CHAQUE État rival avec son nom français. C'est la spécification du cartographe.
- `battle` + `armies` pour les batailles (factions de FACTIONS), path 2-8 points plausibles (sur terre, cols, ou en mer pour les flottes), winner ; `id` stable pour une armée qui revient : son path[0] = dernier point de son path précédent.
- `figures` pour la politique/diplomatie (archétypes d'ARCHETYPES), citation ≤ 120 caractères authentique attribuée (« selon … ») ou « (formule libre) ». Chaque étape ≥ 1 armée ou figure.
MÉTHODE : écris période par période avec un script, contrôle à chaque fois.

`data/cities.json` : ajoute ~<N> villes (format City) avec noms successifs ; lieux de bataille en rank 3 avec `empires: ["<id>"]` ; `capitalOf` avec `empire: "<id>"`. Ne modifie pas les villes existantes sauf pour ajouter un `capitalOf`.

CONTRÔLE FINAL (script) : JSON valides, ids uniques, étapes triées, chaque étape dans une période, factions/archétypes valides, path 2-8 points et chaînage, quotes ≤ 120, ≥ 1 armée/figure par étape, details 150-300 mots.

RAPPORT FINAL : étapes par période, liste compacte `id | année | territoryNote (1 ligne)`, villes ajoutées, incertitudes (citations, factions approximatives).
