#!/usr/bin/env bash
# Télécharge les données sources dans .cache/ (gitignoré). Idempotent :
# un fichier déjà présent et non vide n'est pas re-téléchargé (FORCE=1 pour forcer).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="$ROOT/.cache"
HB_DIR="$CACHE/historical-basemaps"
NE_DIR="$CACHE/natural-earth"
mkdir -p "$HB_DIR" "$NE_DIR"

HB_BASE="https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson"
NE_URL="https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson"
NE_COUNTRIES_URL="https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson"

# Instantanés réellement disponibles dans aourednik/historical-basemaps/geojson
# couvrant -509 → 1453 (Rome) puis 1700 → 1880 (Napoléon) (vérifié via l'API GitHub).
HB_FILES=(
  world_bc500 world_bc400 world_bc323 world_bc300 world_bc200 world_bc100 world_bc1
  world_100 world_200 world_300 world_400 world_500 world_600 world_700 world_800
  world_900 world_1000 world_1100 world_1200 world_1279 world_1300 world_1400
  world_1492 world_1500
  world_1700 world_1715 world_1783 world_1800 world_1815 world_1880
)

fetch() {
  local url="$1" dest="$2"
  if [[ -s "$dest" && "${FORCE:-0}" != "1" ]]; then
    echo "  ✓ $(basename "$dest") (cache)"
    return
  fi
  echo "  ↓ $(basename "$dest")"
  curl -fsSL --retry 3 -o "$dest.part" "$url"
  # Vérification minimale : JSON valide avec un tableau features.
  node -e 'const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));if(!Array.isArray(d.features)||!d.features.length)process.exit(1)' "$dest.part" \
    || { echo "  ✗ GeoJSON invalide : $url" >&2; rm -f "$dest.part"; exit 1; }
  mv "$dest.part" "$dest"
}

echo "historical-basemaps (GPL-3.0) → $HB_DIR"
for f in "${HB_FILES[@]}"; do
  fetch "$HB_BASE/$f.geojson" "$HB_DIR/$f.geojson"
done

echo "Natural Earth 1:50m land (domaine public) → $NE_DIR"
fetch "$NE_URL" "$NE_DIR/ne_50m_land.geojson"

echo "Natural Earth 1:50m admin-0 countries (domaine public) → $NE_DIR"
fetch "$NE_COUNTRIES_URL" "$NE_DIR/ne_50m_admin_0_countries.geojson"

echo "OK"
