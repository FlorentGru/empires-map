"""Quelle entité d'un instantané (ou quel pays Natural Earth, ou quelle région d'un _regions.geojson) contient un point ?
Usage :
  python -I locate.py <racine du dépôt> <world_1783|ne|chemin/vers/_regions.geojson> <lon>,<lat> [<lon>,<lat> ...]
Sortie : une ligne par point « lon,lat → NAME » (ou « → (mer / aucune entité) »)."""
import json, os, sys


def ring_contains(ring, x, y):
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def poly_contains(poly, x, y):
    return ring_contains(poly[0], x, y) and not any(ring_contains(h, x, y) for h in poly[1:])


def geom_contains(g, x, y):
    if not g:
        return False
    if g['type'] == 'Polygon':
        return poly_contains(g['coordinates'], x, y)
    if g['type'] == 'MultiPolygon':
        return any(poly_contains(p, x, y) for p in g['coordinates'])
    return False


root, src = sys.argv[1], sys.argv[2]
if src == 'ne':
    path, key = os.path.join(root, '.cache', 'natural-earth', 'ne_50m_admin_0_countries.geojson'), 'ADMIN'
elif src.startswith('world_'):
    path, key = os.path.join(root, '.cache', 'historical-basemaps', src + '.geojson'), 'NAME'
else:
    path, key = src, 'name'
feats = json.load(open(path, encoding='utf-8'))['features']
for arg in sys.argv[3:]:
    x, y = (float(v) for v in arg.split(','))
    hits = [str((f.get('properties') or {}).get(key)) for f in feats if geom_contains(f.get('geometry'), x, y)]
    print(f'{arg} → {" | ".join(hits) if hits else "(mer / aucune entité)"}')
