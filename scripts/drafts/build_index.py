"""Index des instantanés : pour chaque fichier .cache/historical-basemaps/world_*.geojson,
la liste des entités (NAME, SUBJECTO, PARTOF, bbox, nb de sommets). Idem pour les pays Natural Earth.
Usage : python -I build_index.py <racine du dépôt> <dossier de sortie>"""
import json, os, sys

root, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)


def walk(coords, acc):
    if coords and isinstance(coords[0], (int, float)):
        acc.append(coords)
    else:
        for c in coords:
            walk(c, acc)


def bbox(geom):
    pts = []
    if geom:
        walk(geom['coordinates'], pts)
    if not pts:
        return None, 0
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return [round(min(xs), 2), round(min(ys), 2), round(max(xs), 2), round(max(ys), 2)], len(pts)


hb = os.path.join(root, '.cache', 'historical-basemaps')
index = {}
for f in sorted(os.listdir(hb)):
    d = json.load(open(os.path.join(hb, f), encoding='utf-8'))
    rows = []
    for ft in d['features']:
        p = ft.get('properties') or {}
        b, n = bbox(ft.get('geometry'))
        rows.append({k: v for k, v in {
            'NAME': p.get('NAME'), 'SUBJECTO': p.get('SUBJECTO'), 'PARTOF': p.get('PARTOF'),
            'bbox': b, 'pts': n}.items() if v not in (None, '')})
    index[f[:-8]] = rows

json.dump(index, open(os.path.join(out, 'hb-index.json'), 'w', encoding='utf-8'), ensure_ascii=False)

ne = json.load(open(os.path.join(root, '.cache', 'natural-earth', 'ne_50m_admin_0_countries.geojson'), encoding='utf-8'))
countries = []
for ft in ne['features']:
    p = ft['properties']
    b, n = bbox(ft['geometry'])
    countries.append({'ADMIN': p.get('ADMIN'), 'NAME': p.get('NAME'), 'bbox': b})
json.dump(countries, open(os.path.join(out, 'ne-countries.json'), 'w', encoding='utf-8'), ensure_ascii=False)

print(len(index), 'instantanés,', sum(len(v) for v in index.values()), 'entités ;', len(countries), 'pays NE')
