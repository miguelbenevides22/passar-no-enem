import json, unicodedata, re, sys
import openpyxl

SRC = '/tmp/pne/PASSAR_NO_ENEM_LOVABLE_PACKAGE/03_BANCO_MESTRE/Banco_Mestre_V12_1_FINAL.xlsx'
wb = openpyxl.load_workbook(SRC, data_only=True)

def rows(sheet):
    ws = wb[sheet]
    it = ws.iter_rows(values_only=True)
    hdr = list(next(it))
    out = []
    for r in it:
        if all(c is None for c in r):
            continue
        out.append(dict(zip(hdr, r)))
    return out

report = {"source_file": "Banco_Mestre_V12_1_FINAL.xlsx", "checks": []}
def chk(name, ok, detail):
    report["checks"].append({"check": name, "status": "PASS" if ok else "FAIL", "detail": detail})

matriz = rows('V12.1-A Matriz')
habil = rows('V12.1-A Habilidades')
objetos = rows('V12.1-B Objetos')
grafo = rows('V12.1-C Grafo')
questoes = rows('V12.1-D Questões 2025')
mapas = rows('V12.1-E Mapeamentos')
final = rows('V12.1-F.2 Banco Final')
audit_final = rows('V12.1-F Auditoria Final')

chk('Competências oficiais', len(matriz) == 30, f'{len(matriz)} linhas')
chk('Habilidades oficiais', len(habil) == 120, f'{len(habil)} linhas')
chk('Objetos oficiais', len(objetos) == 38, f'{len(objetos)} linhas')
chk('Nós do grafo', len(grafo) == 63, f'{len(grafo)} linhas')
chk('Questões 2025', len(questoes) == 180, f'{len(questoes)} linhas')
chk('Mapeamentos', len(mapas) == 180, f'{len(mapas)} linhas')

# areas per question
from collections import Counter
area_count = Counter(q['Área'] for q in questoes)
chk('Distribuição por área (45 cada)', all(v == 45 for v in area_count.values()) and len(area_count) == 4, dict(area_count))

qids = [q['Questão'] for q in questoes]
chk('IDs de questão únicos', len(set(qids)) == len(qids), f'{len(set(qids))} únicos')

# official skill codes
skill_codes = set()
for h in habil:
    skill_codes.add(f"{h['Área']}.H{h['Habilidade']}")
chk('Códigos de habilidade únicos', len(skill_codes) == len(habil), f'{len(skill_codes)} códigos')

bad_skill = [m['Questão'] for m in mapas if m['Habilidade'] not in skill_codes]
chk('Habilidade do mapeamento existe na Matriz', not bad_skill, f'{len(bad_skill)} fora da Matriz: {bad_skill[:10]}')

# graph integrity
node_ids = {g['ID'] for g in grafo}
chk('IDs de nó únicos', len(node_ids) == len(grafo), f'{len(node_ids)}')
missing_prereq = []
edges = []
for g in grafo:
    pr = g['Pré-requisitos']
    for p in (pr.split('|') if pr else []):
        p = p.strip()
        edges.append((p, g['ID']))
        if p not in node_ids:
            missing_prereq.append((g['ID'], p))
chk('Pré-requisitos apontam para nós existentes', not missing_prereq, missing_prereq)

# cycle detection
adj = {}
for p, d in edges:
    adj.setdefault(p, []).append(d)
state = {}
cycles = []
def dfs(n, stack):
    state[n] = 1
    for m in adj.get(n, []):
        if state.get(m) == 1:
            cycles.append(stack + [m])
        elif state.get(m) is None:
            dfs(m, stack + [m])
    state[n] = 2
for n in node_ids:
    if state.get(n) is None:
        dfs(n, [n])
chk('Grafo acíclico', not cycles, cycles[:5])

# annulled + liberação
annul = [a['Questão'] for a in audit_final if str(a.get('Anulada?')).strip().upper() == 'SIM']
lib_map = {f['Questão']: str(f['Liberação']).strip().upper() for f in final}
liberadas = [q for q, v in lib_map.items() if v == 'SIM']
chk('Questões anuladas identificadas', True, f'{len(annul)} anuladas: {annul}')
chk('Liberação F.2 presente para todas', len(lib_map) == 180, f'{len(lib_map)} registros, {len(liberadas)} liberadas')

# Q -> pedagogical node derivation (strict, no inference)
def norm(s):
    s = unicodedata.normalize('NFKD', str(s or '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

node_by_name = {}
for g in grafo:
    node_by_name.setdefault(norm(g['Nome']), []).append(g['ID'])

derived = {}
ambiguous = []
unmapped = []
for m in mapas:
    key = norm(m['Conteúdo pedagógico'])
    hits = node_by_name.get(key, [])
    if len(hits) == 1:
        derived[m['Questão']] = hits[0]
    elif len(hits) > 1:
        ambiguous.append(m['Questão'])
    else:
        unmapped.append(m['Questão'])
chk('Q→PedagogicalNode por correspondência exata',
    True,
    f'{len(derived)} mapeadas, {len(ambiguous)} ambíguas, {len(unmapped)} sem correspondência (todas ficam evidenceAllowed=false)')

report['summary'] = {
    'competencias': len(matriz), 'habilidades': len(habil), 'objetos': len(objetos),
    'nos_grafo': len(grafo), 'arestas': len(edges), 'questoes': len(questoes),
    'mapeamentos': len(mapas), 'anuladas': len(annul), 'liberadas_f2': len(liberadas),
    'q_node_mapeadas': len(derived), 'q_node_ambiguas': len(ambiguous), 'q_node_sem_correspondencia': len(unmapped),
}

data = {
    'matriz': matriz, 'habilidades': habil, 'objetos': objetos, 'grafo': grafo,
    'questoes': questoes, 'mapeamentos': mapas, 'final_f2': final, 'auditoria_final': audit_final,
    'derived_nodes': derived, 'ambiguous': ambiguous, 'unmapped': unmapped, 'annulled': annul,
}
json.dump(data, open('/tmp/bank_data.json', 'w'), ensure_ascii=False, default=str)
print(json.dumps(report, ensure_ascii=False, indent=2)[:6000])
