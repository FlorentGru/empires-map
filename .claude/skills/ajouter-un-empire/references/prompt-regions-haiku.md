# Prompt — Régions (Haiku)

Une fois les territoires générés. Commence par lancer toi-même `npx tsx scripts/list-regions.ts <id>` et colle la liste dans le prompt (Haiku n'a ainsi rien à chercher). `Agent` avec `subagent_type: "general-purpose"`, `model: "haiku"`. Relis les textes à la livraison.

---

Projet /home/user/empires-map. Tâche : écrire `data/empires/<id>/regions.json`, qui donne un texte court pour chaque région de la carte de <nom>. Pas de commit, pas de navigateur, rapport en 3 lignes. Ne modifie aucun autre fichier.

1. Lis `src/types-region.ts` (le contrat) et 2 entrées de `data/empires/rome/regions.json`, extraites avec `node -e`, pour le format et le ton.
2. Régions à couvrir (sortie de list-regions) :
<liste collée>
3. Pour chaque région : 2-3 phrases, de 25 à 80 mots au total, en français clair pour un curieux. Dis ce qu'est la région, quand et comment elle entre dans l'empire, et un fait marquant. Pour le contexte, lis avec node la `territoryNote` et le `summary` des étapes où elle apparaît, dans `data/empires/<id>/timeline.json`. N'invente aucune date ni aucun chiffre absent de la timeline.
4. `npx tsx scripts/list-regions.ts <id> --sync` (années), `npx prettier --write data/empires/<id>/regions.json`, puis `npx vitest run tests/data/regions.test.ts` : doit passer.
