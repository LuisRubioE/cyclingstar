#!/usr/bin/env bash
# Ensamblado de E2: el v0 de la fase 3c (03-fase-sintesis.md), el v1 desde la pasada de coherencia (fase 6 de
# 04-fase-refutacion.md) y, desde la fase 7, el documento final, docs/retransmision.md.
#
# Reproduce el documento a partir de los ficheros de sección, en el orden de la tabla de §B de
# 00-esqueleto.md: la cabecera primero, con la línea de estado bajo el título (la suya, si la trae), y
# después §1 a §21, separadas por una línea `---`. De cada sección quita los bloques de cierre
# «Propuesto para el glosario» (fundidos en 00-glosario.md), «Dudas para el ensamblador» y
# «Dudas del cierre» (su estado está en dudas.md); se quedan los de injertos, objeciones y huecos, y el de
# decisiones, que en la fase 7 pasó a llamarse «Decisiones de esta sección» (antes «Decisión tomada aquí»).
# No toca los ficheros de sección. El glosario de la síntesis (00-glosario.md) no se concatena: lo que no está
# en el cuerpo es el apéndice F, §21.6 de 21-apendices.md, con la tabla de dónde vive cada familia de
# nombres (decisión 21-f).
#
# Uso:  bash docs/diseno/e2-retransmision/borrador/ensamblar.sh [--final] [--comprobar]
# Sin --final escribe borrador/retransmision-v1.md, como en la fase 6; con --final escribe el documento
# final, docs/retransmision.md (fase 7).
# Con --comprobar, además, revisa el resultado (bloques quitados, referencias a borrador/, rayas y
# guiones en medio de frase, frases cortadas, remisiones a subsecciones que no existen), que cada
# injerto, objeción y hueco de juicios/veredicto.json esté en un bloque de cierre de alguna sección, y lo
# que pide la fase 7: la línea de estado y la regla de arranque en la cabecera, las veintidós secciones y
# los seis apéndices, ningún «Decisión tomada aquí» ni «Propuesto para el glosario», y ninguna mención de
# refutaciones/, del glosario como fichero ni de los lotes L1 a L10 fuera de la cabecera (§0).
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 - "$DIR" "$@" <<'PY'
import json, os, re, sys

d, args = sys.argv[1], sys.argv[2:]
for a in args:
    if a not in ('--final', '--comprobar'):
        sys.exit(f'argumento desconocido: {a} (uso: ensamblar.sh [--final] [--comprobar])')
modo = '--comprobar' if '--comprobar' in args else ''
final = '--final' in args
ESTADO = 'Estado: borrador v1, tras la refutación adversaria y la corrección, antes de la auditoría.'
QUITAR = ('Propuesto para el glosario', 'Dudas para el ensamblador', 'Dudas del cierre')
ETIQUETA = re.compile(r'^\*\*(Injertos aplicados|Objeciones resueltas|Huecos rellenados|Contradicciones de hecho|'
                      r'Decisi[oó]n tomada aqu[ií]|Decisiones de esta secci[oó]n|Propuesto para el glosario|Dudas)')

# 1. El orden: la tabla de §B del esqueleto.
orden = []
for linea in open(os.path.join(d, '00-esqueleto.md'), encoding='utf-8'):
    m = re.match(r'^\| §(\d+) \| .*? \| `borrador/(\d\d-[\w-]+\.md)` \|', linea)
    if m:
        orden.append((int(m.group(1)), m.group(2)))
orden.sort()
assert [n for n, _ in orden] == list(range(22)), 'la tabla de §B no da §0 a §21'

def cierre(lineas):
    """Índice de la última línea `---`: lo que sigue son los bloques de cierre."""
    seps = [i for i, l in enumerate(lineas) if l.strip() == '---']
    return seps[-1] if seps else len(lineas)

def limpia(texto):
    lineas = texto.rstrip('\n').split('\n')
    corte = cierre(lineas)
    fuera, quitando = [], False
    for i, l in enumerate(lineas):
        if i > corte and ETIQUETA.match(l):
            quitando = any(l.startswith('**' + q) for q in QUITAR)
        if not quitando:
            fuera.append(l)
    while fuera and not fuera[-1].strip():
        fuera.pop()
    return '\n'.join(fuera)

partes = []
for n, fichero in orden:
    texto = limpia(open(os.path.join(d, fichero), encoding='utf-8').read())
    if n == 0:
        titulo, _, resto = texto.partition('\n')
        assert titulo.startswith('# '), '00-cabecera.md tiene que empezar por el título del documento'
        resto = resto.lstrip('\n')
        if not resto.startswith('Estado:'):   # la cabecera del cierre trae su propia línea de estado
            resto = ESTADO + '\n\n' + resto
        texto = titulo + '\n\n' + resto
    else:
        assert texto.startswith(f'## {n}. '), f'{fichero} no empieza por «## {n}.»'
    partes.append(texto)
if final:
    salida = os.path.normpath(os.path.join(d, '..', '..', '..', 'retransmision.md'))   # docs/retransmision.md
else:
    salida = os.path.join(d, 'retransmision-v1.md')
open(salida, 'w', encoding='utf-8').write('\n\n---\n\n'.join(partes) + '\n')
total = sum(1 for _ in open(salida, encoding='utf-8'))
print(f'{os.path.relpath(salida, os.path.join(d, "..", "..", "..", ".."))}: {total} líneas, {len(partes)} secciones')

if modo != '--comprobar':
    sys.exit(0)

# 2. Comprobaciones sobre el ensamblado.
L = open(salida, encoding='utf-8').read().split('\n')
fallos, avisos = [], []
def fallo(msg): fallos.append(msg)

codigo = False
cuerpo = []   # (número de línea, texto) fuera de bloques de código
for i, l in enumerate(L, 1):
    if l.startswith('```'):
        codigo = not codigo
        continue
    if not codigo:
        cuerpo.append((i, l))
if codigo:
    fallo('un bloque de código sin cerrar')

for i, l in enumerate(L, 1):
    if any(l.startswith('**' + q) for q in QUITAR):
        fallo(f'l. {i}: bloque que el ensamblado quita: {l[:60]}')
    if 'borrador/' in l:
        fallo(f'l. {i}: referencia a borrador/')
    for raya in ('—', '–'):
        if raya in l:
            fallo(f'l. {i}: raya {raya!r} en medio de frase')
for i, l in cuerpo:
    sin_codigo = re.sub(r'`[^`]*`', 'X', l)
    if re.search(r'\S - \S', sin_codigo):
        fallo(f'l. {i}: guion entre espacios fuera del código')
    if re.match(r'^\s+[-*] ', l):
        fallo(f'l. {i}: viñeta sangrada')
    if l.count('`') % 2:
        fallo(f'l. {i}: comilla invertida sin pareja')
    if l.strip() and not l.startswith(('#', '|')) and l.strip() != '---':
        if not re.search(r'[.:;)»`!?*|\]]$', l.rstrip()):
            fallo(f'l. {i}: línea que no acaba en puntuación (¿frase cortada?): …{l.rstrip()[-50:]}')
    if not l.startswith('|'):
        if sin_codigo.count('(') != sin_codigo.count(')'):
            avisos.append(f'l. {i}: paréntesis desparejados')
        if sin_codigo.count('«') != sin_codigo.count('»'):
            avisos.append(f'l. {i}: comillas «» desparejadas')

# Remisiones §N.m a subsecciones que no existen (salvo las de otros documentos).
titulos = set()
for l in L:
    m = re.match(r'^#{2,3} (\d+)(?:\.(\d+))?[ .]', l)
    if m:
        clave = m.group(1) + ('.' + m.group(2) if m.group(2) else '')
        if clave in titulos:
            fallo(f'título repetido: §{clave}')
        titulos.add(clave)
ajeno = re.compile(r'(\.md|\.ts|\.json|\.mjs|\.yml|mapa ?0?\d|propuesta|juez|juicio|t[aá]ctica|generador|encargo|agenda|'
                   r'SPEC|MVP|epics|balance|navegaci[oó]n|README|entrenamiento|`estado`|`producto`|`ingeniero`|`datos`|'
                   r'`television`|ejecutabilidad|cobertura)', re.I)
for i, l in enumerate(L, 1):
    for m in re.finditer(r'§(\d+)(?:\.(\d+))?', l):
        clave = m.group(1) + ('.' + m.group(2) if m.group(2) else '')
        if clave not in titulos and not ajeno.search(l[max(0, m.start() - 40):m.start()]):
            fallo(f'l. {i}: remisión a §{clave}, que no existe')

# 3. Injertos, objeciones y huecos del veredicto en los bloques de cierre de las secciones.
v = json.load(open(os.path.join(d, '..', 'juicios', 'veredicto.json'), encoding='utf-8'))
cierres = ''
for n, fichero in orden:
    lineas = open(os.path.join(d, fichero), encoding='utf-8').read().split('\n')
    bloque, dentro = [], False
    for l in lineas[cierre(lineas):]:
        if ETIQUETA.match(l):
            dentro = l.startswith(('**Injertos', '**Objeciones', '**Huecos'))
        if dentro:
            bloque.append(l)
    cierres += '\n'.join(bloque) + '\n'
for clave in ('injertos', 'objeciones', 'huecos'):
    ids = [x['id'] for x in v[clave]]
    faltan = [x for x in ids if not re.search(r'\b' + x + r'\b', cierres)]
    print(f'{clave}: {len(ids) - len(faltan)} de {len(ids)} en algún bloque de cierre')
    if faltan:
        fallo(f'{clave} sin bloque de cierre: {", ".join(faltan)}')

# 4. Lo que pide la fase 7 (04-fase-refutacion.md §7) del documento final.
if not L[2].startswith('Estado: diseño escrito, sin implementar.'):
    fallo('la línea 3 no es «Estado: diseño escrito, sin implementar.»')
fin0 = next(i for i, l in enumerate(L) if l.startswith('## 1. '))   # la cabecera, §0, acaba antes de «## 1.»
if not any(l.startswith('**Regla de arranque**') and 'docs/encargos.md' in l for l in L[:fin0]):
    fallo('la cabecera no lleva el párrafo de la regla de arranque')
secciones = [int(m.group(1)) for l in L for m in [re.match(r'^## (\d+)\. ', l)] if m]
if secciones != list(range(22)):
    fallo(f'las secciones no son §0 a §21 en orden: {secciones}')
apendices = [m.group(1) for l in L for m in [re.match(r'^### 21\.\d+ Apéndice ([A-F]) · ', l)] if m]
if apendices != list('ABCDEF'):
    fallo(f'los apéndices de §21 no son A a F: {apendices}')
lote = re.compile(r'(?<![\w./-])L(10|[1-9])(?![\w])')
for i, l in enumerate(L, 1):
    for prohibido in ('Decisión tomada aquí', 'Propuesto para el glosario', '00-glosario', '§G.'):
        if prohibido in l:
            fallo(f'l. {i}: «{prohibido}»')
    if i > fin0:
        if 'refutaciones/' in l:
            fallo(f'l. {i}: referencia a refutaciones/ fuera de la cabecera')
        if 'glosario' in l:
            fallo(f'l. {i}: el glosario fuera de la cabecera')
        if lote.search(l):
            fallo(f'l. {i}: lote {lote.search(l).group(0)} fuera de la cabecera')
print(f'fase 7: {len(secciones)} secciones, apéndices {"".join(apendices)}, línea de estado y regla de arranque en la cabecera')

for a in avisos:
    print('aviso:', a)
for f in fallos:
    print('FALLO:', f)
print(f'comprobación: {len(fallos)} fallos, {len(avisos)} avisos')
sys.exit(1 if fallos else 0)
PY
