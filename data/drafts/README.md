# Brouillons d'empires (à reprendre)

Ce dossier n'est lu par aucun code : un empire n'y devient pas « disponible ». Les brouillons ont été préparés sur un PC sans Node.js (octobre 2026).

## État au 16/10/2026 (branche `wip/mongols-et-brouillons`)

| Empire | Où | Fait | Reste |
|---|---|---|---|
| Mongols (1206-1368) | `data/empires/mongols/` + factions dans `src/types.ts` | histoire (35 étapes), villes | figurines (`src/figures/`), `scripts/empires/mongols.ts`, données `public/`, README. **La CI échoue tant que ce n'est pas fait** (typecheck + test:data). |
| Carolingiens (751-888) | `data/drafts/carolingiens/` | histoire (21 étapes), carto préparée | tout le reste |
| Saint-Empire (962-1806) | `data/drafts/saint-empire/` | histoire (32 étapes), carto préparée | tout le reste |
| Espagne (1492-1976) | `data/drafts/espagne/` | histoire (33 étapes), carto préparée | tout le reste ; fond de carte à élargir (≈ [-130,-56,165,62]) |
| Britannique, Russie | — | rien | volontairement non lancés |

## Contenu d'un brouillon
- `timeline.json` : objet Empire complet (format `src/types.ts`).
- `cities.json` : `{ add: [City], patch: [{ id, capitalOf?, addEmpire? }] }`, à fusionner dans `data/cities.json`.
- `contract.json` : nouvelles factions et nouveaux archétypes, avec une description pour le dessin et la fiche.
- `carto.json` : par étape, les entités à dessiner (statut, sources : instantané historical-basemaps, pays Natural Earth, régions), des checkpoints et des notes.
- `_regions.geojson` : régions nommées, en polygones grossiers.

## Passer un brouillon en empire disponible
1. Déplacer `timeline.json` → `data/empires/<id>/` et `_regions.geojson` → `overrides/<id>/`, puis fusionner `cities.json` dans `data/cities.json`.
2. Ajouter les factions et archétypes de `contract.json` dans `src/types.ts` et dans `PEOPLE` de `src/map/armyLayer.ts`.
3. Suivre la skill `.claude/skills/ajouter-un-empire` à partir de l'agent 2 (carte + front + figurines), avec `carto.json` comme spécification de `scripts/empires/<id>.ts`.

## Outils (`scripts/drafts/`, Python, sans dépendance)
- `build_index.py <dépôt> <sortie>` : index des NAME et bbox de chaque instantané `.cache/` (lancer `npm run fetch:data` avant).
- `locate.py <dépôt> <world_XXXX|ne|regions.geojson> lon,lat …` : quelle entité contient un point.
- `validate_draft.py <dépôt> <id> …` : contrôle d'un brouillon.
- `PROMPT-COMMUN.md` : consignes données aux agents. Les chemins du scratchpad de l'ancien PC sont à adapter.

Lancer avec `python -I -X utf8 …`.
