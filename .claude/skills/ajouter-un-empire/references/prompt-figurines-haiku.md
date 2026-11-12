# Prompt — Figurines (Haiku)

Juste après le contrat, en parallèle de l'historien. `Agent` avec `subagent_type: "general-purpose"`, `model: "haiku"`, `run_in_background: true`. Haiku est fiable ici parce qu'il **recopie une faction voisine** : donne-lui la faction modèle et la ligne où elle se trouve (`grep -n "  <modele>: {" src/figures/soldiers.tsx`), et décris chaque nouvelle faction par des couleurs hex et 2-3 attributs concrets.

---

Projet /home/user/empires-map (React + TypeScript strict). Tâche courte et précise : dessiner <K> nouvelles figurines de soldats, <factions>, déjà déclarées dans `src/types.ts` (type Faction). Pas de commit, pas de navigateur, rapport final en 5 lignes maximum.

Fichiers à modifier, et rien d'autre : `src/figures/soldiers.tsx`, `src/figures/colors.ts`, `src/figures/descriptions.ts`.

1. `src/figures/soldiers.tsx` : lis UNIQUEMENT les lignes <a>-<b> (la spec `<modele>`) avec `sed -n`, et les helpers (`grep -n "const path\|const rect\|const circ\|const stroke\|const WOOD\|const GOLD" src/figures/soldiers.tsx`). Dans le MÊME objet que `<modele>`, ajoute juste après lui : <pour chaque faction : tunique (hex), coiffe, arme, bouclier ou `shield: ''`>. Garde le même format exact (skin, tunic, legs, boots, deco, head, shield, weapon) et reste dans les coordonnées du modèle (viewBox 32×40).
2. `src/figures/colors.ts` : ajoute <faction: 'hex'> à la fin de l'objet.
3. `src/figures/descriptions.ts` : dans FACTION_INFO, après `<modele>`, ajoute { label, era, text }, avec 3-4 phrases sobres et justes en français : <éléments historiques à dire>.

Validation OBLIGATOIRE : `npm run typecheck` sans erreur (corrige en lisant le message ; ne modifie pas `src/types.ts`), puis `npx prettier --write` sur les 3 fichiers et `npm run lint`. Rapport : lignes ajoutées par fichier et résultat du typecheck.
