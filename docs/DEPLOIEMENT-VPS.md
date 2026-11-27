# Héberger l'Atlas sur le VPS (à côté d'un autre projet)

L'Atlas est un **site statique**. `vite build` avec `VITE_STATIC=1`, puis `scripts/prerender.ts`, produisent `dist/`. Ce dossier contient les pages HTML pré-rendues, le JS, les polices et les données géographiques. Il n'y a aucun programme à faire tourner sur le serveur : un serveur web existant sert ce dossier. GitHub Pages n'a pas de **sage** (quiz hors ligne inclus) ; sur le VPS, il peut tourner dans un conteneur à côté (section « Le sage en ligne »).

Principe : **ne pas toucher à l'autre projet**. L'Atlas a son dossier (`/var/www/atlas`), son port (**8081**) et son propre bloc de configuration. Tant qu'il n'y a pas de nom de domaine, l'adresse est `http://<IP du VPS>:8081/`. GitHub Pages reste l'adresse principale : les balises canonical et le sitemap pointent vers elle, ce qui évite le contenu en double.

**Installation en place (VPS Contabo 185.183.53.60, novembre 2026)** : http://185.183.53.60:8080/
- Conteneur `caddy:2` dans `/srv/atlas` (`docker-compose.yml` et `Caddyfile` : copies dans `deploy/`), publié sur le port **8080**. Il sert `/srv/atlas/site` en lecture seule. Le port 80 reste au projet `/srv/gaming`.
- Pare-feu : `ufw allow 8080/tcp`.
- **Mettre à jour le Caddyfile** (cache, compression des glyphes) : la clé `deploy` ne peut écrire que dans `site/`, c'est donc à faire à la main. Depuis le PC : `scp deploy/Caddyfile.atlas <utilisateur>@185.183.53.60:/tmp/Caddyfile`, puis sur le VPS : `sudo cp /tmp/Caddyfile /srv/atlas/Caddyfile && cd /srv/atlas && sudo docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile && sudo docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile`. Contrôle : `curl -sI -H "Accept-Encoding: gzip" "http://185.183.53.60:8080/fonts/Noto%20Sans%20Regular/0-255.pbf"` doit montrer `Content-Encoding` et `Cache-Control`.
- Utilisateur système `deploy` (sans mot de passe). Sa clé dans `/home/deploy/.ssh/authorized_keys` est limitée par `command="/usr/bin/rrsync /srv/atlas/site",restrict` : elle ne peut que copier des fichiers dans ce dossier, aucune commande shell.
- Secrets GitHub : `VPS_HOST`, `VPS_USER` (= `deploy`), `VPS_SSH_KEY` (clé privée dédiée, supprimée du PC), `VPS_KNOWN_HOSTS`.
- Les sections suivantes décrivent la procédure générale (port 8081, `/var/www/atlas`) ; elles restent valables pour une autre machine.

Mises à jour : le workflow `.github/workflows/vps.yml` reconstruit le site à chaque push sur `main` et l'envoie par `rsync` sur SSH. Tant que les secrets ci-dessous n'existent pas, toutes ses étapes sont **sautées** et il reste vert.

## 1. Découvrir le VPS
Sur le VPS (`ssh <utilisateur>@<IP>`) :
```bash
cat /etc/os-release | head -3
sudo ss -tlnp | grep -E ':(80|443|8080|8081)\b'   # qui occupe les ports web
systemctl is-active nginx caddy apache2 2>/dev/null
docker ps --format '{{.Names}} {{.Image}} {{.Ports}}' 2>/dev/null
sudo ufw status 2>/dev/null
```
Choisissez ensuite la variante de l'étape 3 :
- **nginx** actif → variante A ;
- **Caddy** actif → variante B ;
- l'autre projet tourne en **conteneurs Docker** → variante C ;
- le port 8081 est déjà pris → prenez un autre port libre, partout.

## 2. Utilisateur, dossier et clé de déploiement (une fois)
Sur le VPS :
```bash
sudo adduser --disabled-password --gecos "" atlas-deploy
sudo mkdir -p /var/www/atlas && sudo chown atlas-deploy:www-data /var/www/atlas
sudo -u atlas-deploy mkdir -p -m 700 /home/atlas-deploy/.ssh
```
Sur **votre** machine, créez une clé réservée au déploiement (sans mot de passe, car elle sert à GitHub Actions) :
```bash
ssh-keygen -t ed25519 -f atlas-deploy -N "" -C "atlas-deploy"
ssh-keyscan <IP du VPS>          # empreinte du serveur, pour VPS_KNOWN_HOSTS
```
- **Clé publique** : copiez le contenu de `atlas-deploy.pub` dans `/home/atlas-deploy/.ssh/authorized_keys` sur le VPS (droits 600, propriétaire `atlas-deploy`).
- **Secrets du dépôt** : dans GitHub, **Settings → Secrets and variables → Actions → New repository secret**, créez-en quatre :

| Secret | Valeur |
|---|---|
| `VPS_HOST` | l'IP du VPS |
| `VPS_USER` | `atlas-deploy` |
| `VPS_SSH_KEY` | le contenu du fichier `atlas-deploy` (la clé **privée**) |
| `VPS_KNOWN_HOSTS` | la sortie de `ssh-keyscan` |

La clé privée ne va **que** dans ce secret : supprimez ensuite le fichier `atlas-deploy` de votre machine. L'utilisateur `atlas-deploy` ne peut écrire que dans `/var/www/atlas`.

## 3. Servir le site sur le port 8081
Les fichiers sont dans `deploy/` du dépôt : copiez-les sur le VPS (`scp`) ou recopiez leur contenu.

**A. nginx**
```bash
sudo cp nginx-atlas.conf /etc/nginx/sites-available/atlas
sudo ln -s /etc/nginx/sites-available/atlas /etc/nginx/sites-enabled/atlas
sudo nginx -t && sudo systemctl reload nginx
```
La configuration déclare le type de `.mjs` (le worker de MapLibre). Sans cette ligne, le nginx d'Ubuntu l'envoie en `application/octet-stream` : la page s'affiche mais la **carte reste vide**.

**B. Caddy système** : `Caddyfile.atlas` est celui du conteneur (C). Ajoutez son bloc à la fin de `/etc/caddy/Caddyfile` en remplaçant `:80` par `:8081` et `/srv/site` par `/var/www/atlas`, puis `sudo systemctl reload caddy`.

**C. Docker** (installation en place : Caddy dans un conteneur, site dans `./site`, port 8080)
```bash
sudo mkdir -p /srv/atlas/site /srv/atlas/data
sudo cp docker-compose.atlas.yml /srv/atlas/docker-compose.yml && sudo cp Caddyfile.atlas /srv/atlas/Caddyfile
cd /srv/atlas && sudo docker compose up -d
```

**Pare-feu** : `sudo ufw allow 8081/tcp`. Si l'hébergeur a un pare-feu dans son panneau, ouvrez-y aussi le port 8081.

## 4. Premier déploiement et contrôle
- Dans GitHub, **Actions → VPS → Run workflow**. Ensuite, chaque push sur `main` déploie tout seul.
- Contrôle :
  ```bash
  curl -I http://<IP>:8081/                         # 200
  curl -I http://<IP>:8081/abbassides/haroun-786/   # 200
  curl -I http://<IP>:8081/n-existe-pas/            # 404 (page du site)
  ```
- Ouvrez `http://<IP>:8081/` dans le navigateur : la carte doit s'afficher.
- Vérifiez que l'autre projet répond toujours comme avant.

## Le sage en ligne (conteneur `agent`)
Le sage est un deuxième conteneur dans `/srv/atlas`, à côté de Caddy, sans toucher à `/srv/gaming`. Caddy relaie `/api/*` vers `agent:8000` sur le réseau interne de Docker : le port 8000 n'est jamais ouvert sur Internet. Fichiers : `agent/Dockerfile`, `.dockerignore`, `deploy/docker-compose.atlas.yml`, `deploy/Caddyfile.atlas`.

**Coût** : `/api/chat` et `/api/quiz` sont publics. `agent/server.py` limite à `ATLAS_LIMITE_HEURE` requêtes par visiteur et par heure (30 par défaut) et à `ATLAS_LIMITE_JOUR` pour tout le serveur et par jour (500 par défaut). Au-delà : réponse 429, message « le sage se repose » dans le chat et quiz hors ligne. Fixez **aussi** un plafond de dépense chez le fournisseur du modèle (Google AI Studio ou console Anthropic) : c'est la seule vraie garantie.

Installation (une fois), sur le VPS :
```bash
free -h && sudo docker stats --no-stream    # l'agent prend jusqu'à 768 Mo (mem_limit)
sudo git clone https://github.com/FlorentGru/empires-map.git /srv/atlas/repo
sudo nano /srv/atlas/agent.env              # la clé, voir ci-dessous
sudo chmod 600 /srv/atlas/agent.env
```
Contenu de `agent.env`, écrit par vous (même format que `agent/.env`, voir `agent/README.md`) :
```
ATLAS_MODEL=...
GOOGLE_API_KEY=...            # ou ANTHROPIC_API_KEY selon le modèle
ATLAS_LIMITE_HEURE=30
ATLAS_LIMITE_JOUR=500
```
Puis, depuis le PC, envoyez les deux fichiers de `deploy/` (`scp deploy/docker-compose.atlas.yml deploy/Caddyfile.atlas <utilisateur>@185.183.53.60:/tmp/`) et sur le VPS :
```bash
sudo cp /tmp/docker-compose.atlas.yml /srv/atlas/docker-compose.yml && sudo cp /tmp/Caddyfile.atlas /srv/atlas/Caddyfile
cd /srv/atlas && sudo docker compose up -d --build
curl -s http://localhost:8080/api/health     # {"ok":true,"modele":"..."}
```
Enfin, dans GitHub, **Settings → Secrets and variables → Actions → Variables**, créez `VPS_SAGE` = `1` et relancez **Actions → VPS → Run workflow** : le site du VPS est alors construit avec le sage. Sans cette variable, il reste statique (GitHub Pages l'est toujours).

**Mettre l'agent à jour** (la clé `deploy` de la CI ne peut écrire que dans `site/`, c'est donc à la main) :
```bash
cd /srv/atlas/repo && sudo git pull && cd .. && sudo docker compose up -d --build agent
```
Journaux : `sudo docker compose logs -f agent`. Couper le sage : `sudo docker compose stop agent` et supprimer `VPS_SAGE`.

## Plus tard : un nom de domaine
Avec un domaine, l'Atlas passe sur un sous-domaine (`atlas.<domaine>`) en HTTPS :
1. Créez un enregistrement DNS `A` pour `atlas` vers l'IP du VPS.
2. Selon le serveur :
   - **nginx** : remplacez `listen 8081` par `listen 80` avec `server_name atlas.<domaine>`, puis `sudo certbot --nginx -d atlas.<domaine>` ;
   - **Caddy** : remplacez `:8081` par `atlas.<domaine>`, et le HTTPS est automatique.
3. Fermez le port 8081.
4. Pour faire du VPS l'adresse principale, ajoutez `SITE_URL: https://atlas.<domaine>/` à l'étape `prerender` de `vps.yml`.
