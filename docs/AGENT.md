# Le guide de l'Atlas : un agent avec Google ADK, expliqué pas à pas

Ce document accompagne le code du dossier `agent/`. Il est écrit pour **apprendre à construire un agent**. Chaque notion est illustrée par le code réel du projet, et la dernière partie transpose tout cela à un agent de **fiches de paie**.

---

## 1. Qu'est-ce qu'un agent ?

Un **LLM seul** (Gemini, Claude…) reçoit du texte et produit du texte. Il ne connaît que ce qu'il a appris, il ne peut rien vérifier et il ne peut agir sur rien.

Un **agent**, c'est un LLM à qui on donne :
1. une **instruction** : son rôle et ses règles ;
2. des **outils** : des fonctions de ton code qu'il a le droit d'appeler ;
3. une **boucle d'exécution** : on le laisse appeler des outils, lire leurs résultats, puis décider de la suite.

```
            ┌──────────────────────────────────────────────┐
question →  │  LLM : « j'ai besoin de chercher Austerlitz » │
            └───────────────┬──────────────────────────────┘
                            │ appel d'outil : chercher_etapes("Austerlitz")
                            ▼
                   ┌──────────────────┐
                   │  ton code Python │  → résultats réels (données du projet)
                   └────────┬─────────┘
                            │ résultat renvoyé au LLM
                            ▼
            ┌──────────────────────────────────────────────┐
            │  LLM : « je réponds, et je montre la carte »  │ → appel naviguer_vers_etape(…)
            └───────────────┬──────────────────────────────┘
                            ▼
                     réponse finale + actions
```

Point essentiel : **le LLM ne fait jamais lui-même le travail technique.** Il décide *quel* outil appeler et *avec quels arguments*. C'est ton code qui exécute, de façon sûre et déterministe. Le LLM rédige ensuite à partir de résultats vérifiés.

---

## 2. Google ADK en cinq notions

ADK (*Agent Development Kit*) est le framework open source de Google pour construire ces agents. Version utilisée ici : `google-adk` 2.12, sous Python 3.12.

| Notion | Rôle | Dans le projet |
|---|---|---|
| **`Agent`** (alias de `LlmAgent`) | Le cerveau : un modèle, une instruction et des outils | `agent/atlas_agent/agent.py` → `root_agent` |
| **Outil** (*function tool*) | Une simple fonction Python. ADK lit son **nom**, ses **types** et sa **docstring** pour l'expliquer au modèle | `agent/atlas_agent/tools.py` |
| **`Runner`** | Le moteur : il fait tourner la boucle (modèle → outil → modèle…) et produit des **événements** | `agent/server.py` |
| **Session** + **`SessionService`** | La mémoire d'une conversation : historique des messages et **état** (`state`), un dictionnaire libre | `InMemorySessionService` dans `server.py` |
| **`ToolContext`** | Paramètre spécial qu'ADK injecte dans un outil pour lui donner accès à la session (son `state`, etc.) | `naviguer_vers_etape(…, tool_context)` |

### 2.1 L'agent
```python
root_agent = Agent(
    name="guide_atlas",
    model=_choisir_modele(),          # « gemini-flash-latest » ou LiteLlm("anthropic/…")
    description="Guide de l'Atlas des Empires…",
    instruction=INSTRUCTION,          # le rôle et les règles, en français
    tools=OUTILS,                     # la liste des fonctions Python
)
```
- La variable **doit** s'appeler `root_agent` : c'est elle que cherchent `adk web` et `adk run`.
- L'**instruction** est le « contrat de comportement ». La nôtre impose de toujours passer par les outils pour les faits (« N'invente rien »), de citer l'étape, de rester sous 150 mots, et d'appeler `naviguer_vers_etape` quand l'utilisateur demande à voir un lieu.

### 2.2 Les outils : pourquoi la docstring compte
```python
def chercher_etapes(requete: str, empire: str = "") -> dict:
    """Cherche des étapes de l'Atlas par mots-clés (bataille, personnage, lieu, événement)…

    Args:
        requete: mots-clés en langage naturel (ex. « Austerlitz », « Cao Pi »).
        empire: « rome », « napoleon » ou « china » pour restreindre (vide = tous).
    """
```
ADK transforme cette fonction en **déclaration d'outil** envoyée au modèle : son nom, la description tirée de la docstring, et les paramètres typés. Le modèle ne voit **que ça**. Une docstring floue donne un outil mal utilisé. C'est l'équivalent d'une documentation d'API, mais pour une IA.

Bonnes pratiques appliquées dans `tools.py` :
- **Entrées simples et typées** (`str`, `int`), et **sortie en `dict`**, qu'ADK sérialise pour le modèle.
- **Jamais d'exception vers le modèle** : en cas de problème, l'outil renvoie `{"erreur": "Étape inconnue…"}`. Le modèle peut alors corriger, par exemple en relançant une recherche.
- **Résultats courts** : au plus 5 étapes, avec un résumé. Le modèle lit chaque token renvoyé, et on les paie.
- **Données chargées une seule fois**, au premier appel, puis gardées en mémoire.

### 2.3 Le Runner et les événements
```python
async for event in runner.run_async(user_id=…, session_id=…, new_message=message,
                                    state_delta={"actions": []}):
    for appel in event.get_function_calls():   # le modèle a demandé un outil
        outils.append(appel.name)
    if event.is_final_response():              # réponse finale à l'utilisateur
        reponse = …
```
Chaque étape de la boucle produit un **événement** : appel d'outil, résultat d'outil, texte du modèle. C'est la **trace complète** du raisonnement. On la parcourt pour récupérer la réponse et la liste des outils utilisés, que l'interface affiche sous chaque réponse pour que tu voies ce qui s'est passé.

### 2.4 La session et l'état
- La **session** garde l'historique : quand tu dis « et la bataille suivante ? », le modèle sait de quoi tu parles.
- L'**état** (`session.state`) est un dictionnaire partagé entre les outils et le serveur. On s'en sert pour transmettre les **actions** à l'interface (voir la section 3).
- `InMemorySessionService` garde tout en mémoire vive : un redémarrage efface tout. En production, on utiliserait un service persistant (base de données).

---

## 3. Le motif « l'agent propose, l'interface exécute »

Quand tu écris « Montre-moi Austerlitz », l'agent **ne pilote pas directement** ton navigateur. Il **enregistre une demande d'action** :

```python
def naviguer_vers_etape(empire: str, etape_id: str, tool_context: ToolContext) -> dict:
    _, etape = _trouver_etape(empire, etape_id)
    if not etape:
        return _erreur_etape(empire, etape_id)          # validation : pas d'action invalide
    actions = list(tool_context.state.get("actions", []))
    actions.append({"type": "navigate", "empire": empire, "step": etape_id})
    tool_context.state["actions"] = actions             # réaffectation → ADK enregistre le changement
    return {"statut": "ok", "message": "La carte va s'ouvrir sur « … »"}
```
Le serveur relit `state["actions"]` en fin de tour et les renvoie au navigateur. C'est `src/chat/ChatPanel.tsx` qui exécute la navigation, avec la même fonction que la galerie.

Pourquoi ce détour ?
- **Sécurité et contrôle** : l'agent ne peut demander que des actions **prévues et validées** par ton code.
- **Validation humaine possible** : on pourrait afficher « Aller à Austerlitz ? [Oui] » avant d'exécuter. Pour un agent qui modifie des données sensibles, comme une fiche de paie, c'est indispensable.
- **Découplage** : l'agent ne dépend pas de l'interface, et on peut le tester seul.

---

## 4. Le trajet complet d'une question

« Montre-moi Austerlitz », posée pendant que tu regardes Rome :

1. **Navigateur** : `ChatPanel` envoie `POST /api/chat` avec `{message, session_id, contexte: {empire: "rome", step: "cannes-216", titre: "…"}}`. Vite relaie `/api` vers le serveur Python (port 8000), grâce au proxy de `vite.config.ts`.
2. **Serveur** : il crée ou reprend la session, puis préfixe le message par le contexte (« [L'utilisateur regarde actuellement : …] »).
3. **Runner, premier tour** : le modèle reçoit l'instruction, l'historique, le message et la déclaration des 5 outils. Il répond par un **appel d'outil** : `chercher_etapes(requete="Austerlitz")`.
4. **Outil** : ton code renvoie `{resultats: [{empire: "napoleon", etape_id: "austerlitz-1805", …}]}`.
5. **Runner, deuxième tour** : le modèle appelle `naviguer_vers_etape("napoleon", "austerlitz-1805")`, et l'action est enregistrée dans l'état.
6. **Runner, troisième tour** : le modèle rédige la réponse finale (« Le 2 décembre 1805… »). C'est l'événement `is_final_response()`.
7. **Serveur** : il renvoie `{reponse, actions: [{type: "navigate", …}], outils_appeles: ["chercher_etapes", "naviguer_vers_etape"]}`.
8. **Navigateur** : il affiche la réponse, exécute la navigation, et la carte vole vers Austerlitz.

Pour **voir ce trajet en direct**, lance `npm run agent:web`. C'est l'interface de débogage officielle d'ADK : chaque événement, chaque appel d'outil avec ses arguments, chaque résultat. C'est le meilleur outil pour apprendre.

---

## 5. Changer de modèle (Gemini ou Claude)

```python
valeur = os.getenv("ATLAS_MODEL", "gemini-flash-latest")
if valeur.startswith("anthropic/"):
    return LiteLlm(model=valeur)    # Claude via LiteLLM (clé ANTHROPIC_API_KEY)
return valeur                        # Gemini, géré nativement par ADK (clé GOOGLE_API_KEY)
```
- **Gemini** est le modèle natif d'ADK : il suffit de donner son nom.
- **Les autres fournisseurs** (Claude, GPT, modèles locaux…) passent par **LiteLLM**, un adaptateur qui traduit l'interface d'ADK vers leur API.
- **Ce qui ne change pas** : l'instruction, les outils, le Runner, les sessions. Tout ton code métier est indépendant du fournisseur. C'est un argument fort en entreprise : on peut comparer les modèles ou en changer sans rien réécrire.

---

## 6. Sécurité

- **La clé API reste côté serveur**, dans `agent/.env`, que git ignore. Le navigateur ne la voit jamais. `agent/.env.example` montre le format sans aucune vraie valeur.
- **Les outils sont en lecture seule**, sauf `naviguer_vers_etape`, qui ne fait que *demander* une action validée.
- **Les entrées sont validées** : un identifiant d'étape inconnu est refusé proprement.
- **Le périmètre est limité** : l'instruction recentre l'agent sur l'Atlas, et le CORS n'accepte que localhost.
- **Les erreurs sont maîtrisées** : clé absente, quota ou réseau donnent un HTTP 503 avec un message clair, et l'interface affiche « lance `npm run agent` ».

---

## 7. Coûts et tokens

Chaque tour de boucle renvoie au modèle l'instruction, l'historique, la déclaration des outils et les résultats d'outils. Pour limiter la facture :
- **On ne met pas les données dans le prompt.** Les 112 étapes, environ 400 000 caractères, coûteraient cher à chaque message. Les outils n'en renvoient que les morceaux utiles. C'est le principe du **RAG par outils** (*retrieval* à la demande).
- **Résultats tronqués** (5 étapes maximum) et **réponses courtes** (150 mots).
- **Modèle rapide par défaut** (Gemini Flash) ; les modèles plus puissants sont réservés aux cas difficiles.

---

## 8. Tester et évaluer un agent

| Niveau | Quoi | Commande |
|---|---|---|
| Outils | Tests unitaires classiques, **sans modèle** : recherche, lecture, refus d'un identifiant invalide, action de navigation | `npm run agent:test` (8 tests) |
| Interface | Playwright avec **réponse simulée** : affichage, navigation exécutée, message si le serveur est absent | `npx playwright test e2e/chat.spec.ts` |
| Comportement | **Évaluation** : questions de référence et réponses ou appels d'outils attendus, rejoués contre le vrai modèle | `adk eval` (prochain exercice) |

Les tests d'outils et d'interface tournent dans la CI GitHub sans clé API. L'évaluation, elle, appelle le modèle : on la lance à la main, avant chaque changement d'instruction ou de modèle. C'est le « test de non-régression » d'un agent.

---

## 9. Transposer à ton exercice : un agent de fiches de paie

| Atlas | Fiches de paie |
|---|---|
| `chercher_etapes`, `lire_etape` | `lire_salarie(matricule)`, `lire_bulletin(matricule, mois)`, avec **contrôle d'accès** selon l'utilisateur connecté |
| Données JSON en lecture seule | Base de paie et convention collective, consultées en lecture |
| « N'invente rien, utilise les outils » | **Ne jamais laisser le modèle calculer** un net, une cotisation ou une retenue : `calculer_net(brut, statut, …)` est une fonction déterministe et testée. Le modèle explique, ton code calcule |
| `naviguer_vers_etape` → action validée | `proposer_correction(bulletin, champ, valeur)` → **validation humaine obligatoire** avant toute écriture |
| Événements ADK (`adk web`) | **Traçabilité** : qui a demandé quoi, quels outils ont été appelés, avec quelles données. C'est essentiel pour l'audit |
| Tests d'outils et évaluation | Tests unitaires des calculs sur des cas connus, et évaluations sur des bulletins **anonymisés** |

Règles d'or pour un agent métier sensible :
1. **Le LLM orchestre et explique, le code calcule et décide.**
2. **Des outils au périmètre minimal** : un outil, une responsabilité, des entrées validées.
3. **Aucune écriture sans validation humaine.**
4. **Pas de données personnelles inutiles dans le prompt** : on ne renvoie au modèle que le strict nécessaire, et on pense au RGPD.
5. **Tout est tracé et évalué.**

---

## 10. Quiz : agents enchaînés et sorties structurées

Le quiz du sage (`agent/atlas_agent/quiz.py`, `POST /api/quiz`) assemble **deux agents** dans un `SequentialAgent` :

```python
chercheur = LlmAgent(name="chercheur_quiz", tools=[lister_empires, chercher_etapes, lire_etape, ...],
                     output_key="matiere")            # faits sourcés, texte libre
redacteur = LlmAgent(name="redacteur_quiz", output_schema=Quiz, output_key="quiz",
                     instruction="... Matière collectée : {matiere} ...")   # JSON validé, sans outil
SequentialAgent(name="quiz_atlas", sub_agents=[chercheur, redacteur])
```

**Pourquoi deux agents ?** Historiquement, un `LlmAgent` avec `output_schema` ne pouvait pas appeler d'outils : le schéma impose au modèle de ne répondre qu'en JSON. Dans la version installée (ADK 2.x, `llm_agent.py`, `_capabilities.py`), le couple est accepté seulement si le modèle le déclare (`capabilities.output_schema_and_tools`) : c'est le cas de Gemini **sur Vertex AI**, pas de Gemini via clé API ni de Claude via LiteLLM. Séparer « chercher » et « rédiger » reste donc la solution portable, et elle clarifie les rôles : un agent qui explore, un agent qui met en forme.

**`output_key` et l'état de session.** Chaque agent écrit sa réponse finale dans `session.state[output_key]`. `{matiere}` dans l'instruction du second agent est remplacé par cette valeur : c'est ainsi que les agents se passent le relais. Avec `output_schema`, ADK valide la réponse (`validate_schema`) et stocke un `dict` ; on relit `session.state["quiz"]` après `runner.run_async(...)`, dans une session neuve par quiz.

**Valider, puis se replier.** Le schéma pydantic impose la forme (4 choix, index 0-3), mais pas la vérité : `valider_quiz` vérifie que `empire` et `etape_id` existent vraiment dans `data/empires`, que les choix sont distincts, etc. `generer_quiz` essaie deux fois (la 2e en renvoyant les erreurs au modèle) puis, en cas d'échec ou d'exception (pas de clé, réseau), retombe sur `quiz_hors_ligne`, déterministe (années, vainqueurs, capitales, personnages tirés des données) : la réponse porte `source: "sage" | "hors_ligne"` et l'interface l'affiche.

**Tester sans modèle** (`agent/tests/test_quiz.py`) : on inspecte la structure de l'agent (types, `output_schema`, `output_key`), on teste `valider_quiz` et `quiz_hors_ligne` (graine fixée), et on remplace `_lancer_agent` par un faux via `monkeypatch` pour vérifier le réessai et le repli. Aucun test n'appelle de modèle.

**Transposition aux fiches de paie.** Même architecture : un agent *collecteur* lit les données par des outils minimaux (contrat, heures, primes) et écrit `donnees_paie` dans l'état ; un agent *rédacteur* sans outil produit un `Bulletin` (schéma pydantic) ; le code, jamais le modèle, calcule les montants et `valider_bulletin` rejette les incohérences (totaux, taux, champs obligatoires) avant toute écriture. En cas d'échec : repli sur un brouillon déterministe ou renvoi à un humain, jamais une valeur inventée.

---

## 11. Lancer et expérimenter

```bash
cp agent/.env.example agent/.env      # puis mets ta clé dans agent/.env
npm run agent                          # serveur de l'agent (port 8000)
npm start                              # l'Atlas (autre terminal)
npm run agent:web                      # interface de débogage ADK
npm run agent:test                     # tests des outils
```

### Exercices pour progresser
1. **Ajouter un outil** `comparer_etapes(empire, etape_a, etape_b)` qui renvoie les territoires gagnés ou perdus entre deux dates. Puis observe dans `adk web` quand le modèle décide de l'utiliser.
2. **Un garde-fou par callback** : ADK permet d'intercepter un appel avant le modèle (`before_model_callback`) ou avant un outil (`before_tool_callback`). Écris un callback qui bloque toute navigation vers un empire non disponible et journalise la tentative.
3. **Multi-agents** : crée un sous-agent « quiz » (questions-réponses sur l'étape courante) et laisse l'agent principal lui **déléguer** les demandes de quiz (`sub_agents=[…]`).
4. **Évaluation** : écris 5 cas `adk eval` (« Que s'est-il passé à Cannes ? » doit appeler `chercher_etapes` puis `lire_etape`) et compare Gemini et Claude.
5. **Streaming** : renvoie la réponse au fil de l'eau (Server-Sent Events) plutôt qu'en bloc.
