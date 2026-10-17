# Atlas des Empires — contexte pour Claude

Chargé automatiquement au début de chaque session Claude Code, sur toutes les machines (versionné dans git). À garder court : il est relu à chaque session. Le détail est dans `docs/`.

## Le projet
Carte interactive (React + Vite + TS strict + MapLibre GL, relief 3D) qui montre étape par étape l'évolution d'empires : frontières qui glissent (SDF + shader en custom layer), batailles, armées, personnages, mode Histoire narré, chatbot ADK.
- Architecture : `docs/ARCHITECTURE.md`. Agent ADK (Python, `agent/`) : `docs/AGENT.md`. Lancement et tests : `README.md`.
- Contrat de données : `src/types.ts`. Données : `data/empires/<id>/timeline.json`, `data/cities.json`, pipeline géo `scripts/` → `public/data/empires/<id>/`.
- Ajouter un empire : skill `.claude/skills/ajouter-un-empire/` (historien, puis carte + front + figurines). Un nouvel empire doit aussi avoir `people.json`, `profile.json` et `inventions.json`.

## État (à mettre à jour en fin de session)
- Sur `main` : Rome, Napoléon, Chine, Mongols, Espagne ; chatbot ADK (le « sage », Gemini ou Claude via `ATLAS_MODEL`) ; apogée sur la frise ; régiments animés (marche proportionnelle à la distance, `src/lib/march.ts`) ; empires contemporains ; carte du monde entière ; formulaire « Votre avis » (mailto) ; villes de départ des armées (`from`, `src/lib/origin.ts`) ; personnages illustres (`data/empires/<id>/people.json`, galerie, outil `chercher_personnage` du sage) ; monuments (`data/monuments.json`, calque, éventail des piles) ; routes commerciales (`data/routes.json`) et catastrophes/guerres (`data/disasters.json`) ; vue « Le monde en l'an X » (`src/world/`, `?world=1&year=`) ; quiz du sage (`agent/atlas_agent/quiz.py`, `src/quiz/`) ; comparaison de deux empires (`src/compare/`, `?compare=a,b`, profils `data/empires/<id>/profile.json`) ; inventions révolutionnaires (`data/empires/<id>/inventions.json`, calque, frise, galerie, comparaison, outil du sage) ; piles d'icônes monuments + inventions réunies dans un seul éventail (`src/map/pileFan.ts`) ; capitales des voisins (`data/capitals.json` → `build-neighbors`, points `kind: 'capital'`) et des empires contemporains (`capitalOf` de `data/cities.json`, anneau dans le calque des villes). Cadre des voisins de la Chine et des Mongols : `NEIGHBOR_BOUNDS` dans `scripts/build-neighbors.ts`.
- Hébergement gratuit : `npm run serve` (local + réseau domestique) ; GitHub Pages via `.github/workflows/pages.yml` (build `VITE_STATIC=1`, sans sage ; quiz hors ligne en TS `src/quiz/offline.ts`).
- À faire par l'utilisateur : renseigner son adresse dédiée dans `src/config.ts` (`FEEDBACK_EMAIL`, publique) ; activer Pages (Settings → Pages → Source : GitHub Actions).
- Brouillons à finaliser, un par session : `data/drafts/{carolingiens,saint-empire}/` (voir `data/drafts/README.md`). (Le fond de carte couvre déjà le monde entier.)

## Règles de travail
- Répondre en français. L'utilisateur se forme au métier d'ingénieur IA : expliquer les choix.
- Commit + push après chaque changement. CI GitHub seulement sur `main` et les PR.
- Ne jamais créer, lire ni manipuler de clé API (l'utilisateur la met lui-même dans `agent/.env`).
- Sous-agents : modèle Sonnet, peu nombreux, séquentiels (parallèles seulement sur fichiers disjoints), prompts précis.
- Économie de tokens : ne jamais lire en entier les gros JSON/GeoJSON (extraits via `node -e`), peu de captures.
- Captures : Chromium du projet (`@playwright/test`) en headless ; l'utilisateur juge la fluidité dans son navigateur (Brave).
- Le serveur Vite doit être relancé après régénération de `public/data` ; ne pas utiliser `pkill -f` avec un motif qui correspond à la commande elle-même.
- Deux machines : Linux (ce PC, Node installé) et un PC Windows (`C:\Users\fgru\project\empires-map`, sans Node). `git pull` en début de session.
