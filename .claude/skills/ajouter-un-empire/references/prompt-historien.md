# Prompt — Historien (Sonnet)

`Agent` avec `subagent_type: "general-purpose"`, `model: "sonnet"`, `run_in_background: true`. Remplace les `<…>`. Lancé en même temps que les figurines (Haiku) : fichiers disjoints.

---

Projet « Atlas des Empires », /home/user/empires-map (React + TS, données JSON). Tu es l'HISTORIEN de <nom> (id "<id>", <début>-<fin>). Tu écris uniquement `data/empires/<id>/timeline.json`, `people.json`, `profile.json`, `inventions.json` (nouveaux) et des ajouts à `data/cities.json`. Rien d'autre. Pas de commit, pas de navigateur.

ÉCONOMIE (impératif) : ne lis JAMAIS en entier les gros JSON (timeline.json des autres empires, cities.json) : `node -e` avec `JSON.parse(fs.readFileSync(...))` pour lire un extrait ou écrire. Lis uniquement : `src/types.ts` (Empire, EmpirePeriod, TimelineStep, BattleInfo, ArmyMove, Figure, City, FACTIONS, ARCHETYPES), `src/types-profile.ts`, `src/types-invention.ts`, le type des personnages (grep « people » dans src/types*.ts), les tests `tests/data/people.test.ts`, `profiles.test.ts`, `inventions.test.ts` (ils donnent les règles exactes), et UN exemple de chaque fichier ottoman en extrait (1 étape avec battle+armies, 1 avec figures, 1 personnage, 1 période de profile, 1 invention). Rapport final court.

PUBLIC : un Français curieux qui connaît mal le sujet. Texte clair et vivant ; noms et peuples expliqués à leur première apparition. Pas d'invention historique : quand les sources divergent, dis-le.

## timeline.json (objet Empire)
- id, name « <nom> », color "<hex>", start, end, description (3-4 phrases), view { center: [<lon>, <lat>], zoom 3-4 }, bounds [[<ouest>, <sud>], [<est>, <nord>]] (cadre des voisins ; ne borne jamais la caméra), `apogee` { stepId, note } si l'extension maximale se discute.
- periods : <liste id / nom / début / fin>, couleurs douces distinctes, `summary` de 2-3 phrases. Une étape appartient à la dernière période dont start ≤ year : les bornes se touchent sans se chevaucher.
- steps : ~<N> étapes triées par année (jamais 0 ; av. J.-C. = négatif), ids `kebab-année`. Incontournables : <liste>.
- Chaque étape porte title, type, location [lon,lat], zoom (3 à 5,5), summary, details (markdown, 150-300 mots), consequences (3-5, territoriales d'abord), sources (2-3, dont Wikipédia FR ; l'orchestrateur vérifie les URL), `territory` = id, et une `territoryNote` PRÉCISE : jusqu'où s'étend l'empire en régions actuelles (vallées, fleuves, villes), États vassaux/tributaires, et chaque rival nommé en français avec son statut. C'est la spécification du cartographe.
- `battle` + `armies` : factions UNIQUEMENT parmi <liste de factions, avec qui elles représentent>. Path de 2 à 8 points plausibles, winner. Une armée qui revient garde un `id` stable, et son path[0] = dernier point de son path précédent.
- `figures` : archétypes de préférence parmi <liste>. Citation ≤ 120 caractères, authentique et attribuée (« selon … ») ou « (formule libre) ». Chaque étape a ≥ 1 armée ou figure.
- Écris période par période avec un script node, et contrôle à chaque fois.

## cities.json
~<N> villes (format City), dont <liste>. Les lieux de bataille sont en rank 3 avec `empires: ["<id>"]` ; la capitale porte `capitalOf` empire "<id>". Vérifie d'abord par node qu'une ville n'existe pas déjà : dans ce cas, ajoute seulement "<id>" à `empires` ou un `capitalOf`.

## people.json, profile.json, inventions.json
Même format et même ton que pour les Ottomans ; les tests font foi.
- people : ~12 personnages (<suggestions>) ;
- profile : par période ;
- inventions : ~8 (<suggestions>).

## Contrôle final
`npm run test:data` : seuls les cartes, SDF, régions, contemporains et l'image OG de "<id>" peuvent manquer ; corrige toute autre erreur. Ajoute un script node qui vérifie : JSON valides, ids uniques, étapes triées et chacune dans une période, factions et archétypes valides, path 2-8 et chaînage, quotes ≤ 120, ≥ 1 armée ou figure par étape, details 150-300 mots.

RAPPORT FINAL (court) :
- `id | année | territoryNote (1 ligne)` ;
- villes ajoutées ;
- titres Wikipédia FR utilisés (liste unique) ;
- incertitudes.
