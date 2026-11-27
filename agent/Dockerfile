# Image du sage pour le VPS (docs/DEPLOIEMENT-VPS.md, « Le sage en ligne »).
# Construite depuis la racine du dépôt : l'agent lit data/ et public/data/religions/territories.json.
FROM python:3.12-slim
WORKDIR /app
COPY agent/requirements.txt agent/
RUN pip install --no-cache-dir -r agent/requirements.txt
COPY agent agent
COPY data data
COPY public/data/religions/territories.json public/data/religions/
# Pas de port publié dans docker-compose : seul Caddy joint l'agent, par le réseau interne de Docker.
CMD ["uvicorn", "agent.server:app", "--host", "0.0.0.0", "--port", "8000"]
