# Héberger l'Atlas sur le VPS (à côté d'un autre projet)

L'Atlas est un **site statique**. `vite build` avec `VITE_STATIC=1`, puis `scripts/prerender.ts`, produisent `dist/`. Ce dossier contient les pages HTML pré-rendues, le JS, les polices et les données géographiques. Il n'y a aucun programme à faire tourner sur le serveur : un serveur web existant sert ce dossier. La version en ligne n'a pas de **sage**, comme sur GitHub Pages ; le quiz hors ligne est inclus.

Principe : **ne pas toucher à l'autre projet**. L'Atlas a son dossier (`/var/www/atlas`), son port (**8081**) et son propre bloc de configuration. Tant qu'il n'y a pas de nom de domaine, l'adresse est `http://<IP du VPS>:8081/`. GitHub Pages reste l'adresse principale : les balises canonical et le sitemap pointent vers elle, ce qui évite le contenu en double.

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

**B. Caddy** : ajoutez le bloc de `Caddyfile.atlas` à la fin de `/etc/caddy/Caddyfile`, puis `sudo systemctl reload caddy`.

**C. Docker**
```bash
sudo mkdir -p /opt/atlas
sudo cp docker-compose.atlas.yml nginx-atlas.conf /opt/atlas/
cd /opt/atlas && sudo docker compose -f docker-compose.atlas.yml up -d
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

## Plus tard : un nom de domaine
Avec un domaine, l'Atlas passe sur un sous-domaine (`atlas.<domaine>`) en HTTPS :
1. Créez un enregistrement DNS `A` pour `atlas` vers l'IP du VPS.
2. Selon le serveur :
   - **nginx** : remplacez `listen 8081` par `listen 80` avec `server_name atlas.<domaine>`, puis `sudo certbot --nginx -d atlas.<domaine>` ;
   - **Caddy** : remplacez `:8081` par `atlas.<domaine>`, et le HTTPS est automatique.
3. Fermez le port 8081.
4. Pour faire du VPS l'adresse principale, ajoutez `SITE_URL: https://atlas.<domaine>/` à l'étape `prerender` de `vps.yml`.
