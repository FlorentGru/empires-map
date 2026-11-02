# Guide de l'Atlas (agent Google ADK)

Chatbot Python construit avec [Google ADK](https://adk.dev) : il répond sur l'histoire à partir de `data/` et pilote la carte.

- `atlas_agent/tools.py` : les outils (fonctions Python typées + docstrings lues par le modèle)
- `atlas_agent/agent.py` : l'agent (`root_agent`), choix du modèle via `ATLAS_MODEL`
- `server.py` : API FastAPI (`/api/health`, `/api/chat`) qui fait tourner l'agent avec un `Runner`

## Installation (Python 3.12 recommandé ; 3.14 non testé)

```bash
# avec uv (https://astral.sh/uv) :
uv venv --python 3.12 agent/.venv && uv pip install --python agent/.venv/bin/python -r agent/requirements.txt
# ou avec pip : python3.12 -m venv agent/.venv && agent/.venv/bin/pip install -r agent/requirements.txt
cp agent/.env.example agent/.env   # puis renseigner une clé
```

Clés : Gemini sur <https://aistudio.google.com/apikey> (`GOOGLE_API_KEY`), Claude sur <https://console.anthropic.com/> (`ANTHROPIC_API_KEY`, avec `ATLAS_MODEL=anthropic/<modèle>`). Ollama local, sans clé : `ATLAS_MODEL=ollama_chat/<modèle>` (testé avec `qwen3:8b` du conteneur Docker `ollama`, publié sur `127.0.0.1:11434` ; un modèle qui gère les outils : qwen3, llama3.1, mistral-small… ; `OLLAMA_API_BASE` si le serveur n'est pas sur `localhost:11434`).

## Utilisation

- `npm run agent` puis `npm start` : le site proxifie `/api` vers le port 8000.
- `npm run agent:web` : interface de débogage d'ADK (voir les appels d'outils, l'état de session).
- `npm run agent:test` : tests des outils, sans modèle ni clé.
