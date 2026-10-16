"""Contrôle d'un brouillon data/drafts/<id>/ (orchestrateur).
Usage : python -I -X utf8 validate_draft.py <racine du dépôt> <id> [<id> ...]"""
import json, os, re, sys

root = sys.argv[1]
types = open(os.path.join(root, 'src', 'types.ts'), encoding='utf-8').read()


def const_list(name):
    m = re.search(r'export const ' + name + r'\s*:[^=]*=\s*\[(.*?)\];', types, re.S)
    return set(re.findall(r"'([^']+)'", m.group(1)))


FACTIONS, ARCHETYPES = const_list('FACTIONS'), const_list('ARCHETYPES')
cities = json.load(open(os.path.join(root, 'data', 'cities.json'), encoding='utf-8'))
city_ids = {c['id'] for c in cities}
drafts = os.path.join(root, 'data', 'drafts')
all_contract_f, all_contract_a, added_by = set(), set(), {}
for d in sorted(os.listdir(drafts)) if os.path.isdir(drafts) else []:
    p = os.path.join(drafts, d, 'contract.json')
    if os.path.exists(p):
        c = json.load(open(p, encoding='utf-8'))
        all_contract_f |= {x['id'] for x in c.get('factions', [])}
        all_contract_a |= {x['id'] for x in c.get('archetypes', [])}
    p = os.path.join(drafts, d, 'cities.json')
    if os.path.exists(p):
        for c in json.load(open(p, encoding='utf-8')).get('add', []):
            added_by.setdefault(c['id'], []).append(d)

for dup, who in added_by.items():
    if len(who) > 1:
        print(f'⚠ ville « {dup} » ajoutée par plusieurs brouillons : {who}')

for eid in sys.argv[2:]:
    base = os.path.join(drafts, eid)
    errs, warn = [], []
    t = json.load(open(os.path.join(base, 'timeline.json'), encoding='utf-8'))
    periods = sorted(t.get('periods', []), key=lambda p: p['start'])
    for a, b in zip(periods, periods[1:]):
        if a['end'] != b['start']:
            errs.append(f"périodes {a['id']}→{b['id']} : {a['end']} ≠ {b['start']}")
    steps = t['steps']
    ids = [s['id'] for s in steps]
    if len(ids) != len(set(ids)):
        errs.append('ids d\'étapes en double')
    if [s['year'] for s in steps] != sorted(s['year'] for s in steps):
        errs.append('étapes non triées')
    per_count = {}
    F, A = FACTIONS | all_contract_f, ARCHETYPES | all_contract_a
    for s in steps:
        per = [p for p in periods if p['start'] <= s['year']]
        pid = per[-1]['id'] if per else None
        per_count[pid] = per_count.get(pid, 0) + 1
        if s['year'] == 0: errs.append(f"{s['id']} : année 0")
        if s.get('territory') != s['id']: errs.append(f"{s['id']} : territory ≠ id")
        if not (s.get('armies') or s.get('figures')): errs.append(f"{s['id']} : ni armée ni figure")
        n = len(re.findall(r'\w+', s.get('details', '')))
        if not 140 <= n <= 320: warn.append(f"{s['id']} : details {n} mots")
        for a in s.get('armies') or []:
            if a['faction'] not in F: errs.append(f"{s['id']} : faction inconnue {a['faction']}")
            if not 2 <= len(a['path']) <= 8: errs.append(f"{s['id']} : path {len(a['path'])} points")
        for f in s.get('figures') or []:
            if f['faction'] not in F: errs.append(f"{s['id']} : faction inconnue {f['faction']}")
            if f['archetype'] not in A: errs.append(f"{s['id']} : archétype inconnu {f['archetype']}")
            if len(f.get('quote', '')) > 120: errs.append(f"{s['id']} : citation > 120")
    # Carto
    cp = os.path.join(base, 'carto.json')
    if os.path.exists(cp):
        c = json.load(open(cp, encoding='utf-8'))
        cs = [(s['id'], s['year']) for s in c['steps']]
        if cs != [(s['id'], s['year']) for s in steps]:
            errs.append('carto.json : ids/années ≠ timeline')
        ck = {s['id'] for s in c['steps']}
        for k in c.get('checkpoints', []):
            for key in ('from', 'to'):
                if k.get(key) and k[key] not in ck: errs.append(f"checkpoint {k['name']} : {key} inconnu {k[key]}")
        modes = {}
        for s in c['steps']: modes[s.get('mode')] = modes.get(s.get('mode'), 0) + 1
    else:
        errs.append('carto.json absent'); modes = {}; c = {}
    # Villes
    cc = json.load(open(os.path.join(base, 'cities.json'), encoding='utf-8'))
    for x in cc.get('add', []):
        if x['id'] in city_ids: errs.append(f"ville {x['id']} existe déjà dans data/cities.json")
    for x in cc.get('patch', []):
        if x['id'] not in city_ids and x['id'] not in added_by: errs.append(f"patch sur ville inconnue {x['id']}")
    rg = os.path.join(base, '_regions.geojson')
    nreg = len(json.load(open(rg, encoding='utf-8'))['features']) if os.path.exists(rg) else 0
    contract = json.load(open(os.path.join(base, 'contract.json'), encoding='utf-8')) if os.path.exists(os.path.join(base, 'contract.json')) else {}
    print(f"\n=== {eid} : {len(steps)} étapes {per_count} | modes {modes} | {len(c.get('checkpoints', []))} checkpoints | "
          f"{nreg} régions | villes +{len(cc.get('add', []))} ~{len(cc.get('patch', []))} | "
          f"factions {[x['id'] for x in contract.get('factions', [])]} archétypes {[x['id'] for x in contract.get('archetypes', [])]}")
    for e in errs: print('  ✗', e)
    for w in warn: print('  ·', w)
    if not errs: print('  ✓ aucune erreur')
