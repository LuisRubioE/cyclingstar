#!/usr/bin/env bash
# Ensamblado de E3, adaptado del de E2 (docs/diseno/e2-retransmision/borrador/ensamblar.sh): el v0 de la fase
# 3c (03-fase-sintesis.md), el v1 tras la pasada de coherencia (04-fase-refutacion.md §6) y, desde la fase 7,
# el documento final, docs/visual.md.
#
# Reproduce el documento a partir de los ficheros de sección, en el orden de la tabla §B de 00-esqueleto.md:
# la cabecera primero, con la línea de estado bajo el título (la suya, si la trae), y después §1 a §N,
# separadas por una línea `---`. De cada sección quita los bloques de cierre «Propuesto para el glosario»,
# «Dudas para el ensamblador» y «Dudas del cierre»; se quedan los de injertos, objeciones, huecos y
# decisiones. No toca los ficheros de sección.
#
# Uso:  bash docs/diseno/e3-visual/borrador/ensamblar.sh [--v0 | --final] [--comprobar]
# Sin opción escribe borrador/visual-v1.md; con --v0, borrador/visual-v0.md; con --final, docs/visual.md.
# Con --comprobar, además, revisa el resultado (bloques quitados, referencias a borrador/, rayas y guiones en
# medio de frase, frases cortadas, remisiones a subsecciones que no existen), que cada injerto, objeción y
# hueco de juicios/veredicto.json esté en un bloque de cierre de alguna sección y, con --final, la línea de
# estado y la regla de arranque en la cabecera.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 -I -B - "$DIR" "$@" <<'PY'
import json, os, re, sys

d, args = sys.argv[1], sys.argv[2:]
for a in args:
    if a not in ('--v0', '--final', '--comprobar'):
        sys.exit(f'argumento desconocido: {a} (uso: ensamblar.sh [--v0 | --final] [--comprobar])')
comprobar = '--comprobar' in args
final = '--final' in args
v0 = '--v0' in args
ESTADO = ('Estado: borrador v0, tras la síntesis y antes de la refutación adversaria.' if v0 else
          'Estado: borrador v1, tras la refutación adversaria y la corrección, antes de la auditoría.')
QUITAR = ('Propuesto para el glosario', 'Dudas para el ensamblador', 'Dudas del cierre')
ETIQUETA = re.compile(r'^\*\*(Injertos aplicados|Objeciones resueltas|Huecos rellenados|Contradicciones de hecho|'
                      r'Decisi[oó]n tomada aqu[ií]|Decisiones de esta secci[oó]n|Propuesto para el glosario|Dudas)')

# 1. El orden: la tabla §B del esqueleto.
orden = []
for linea in open(os.path.join(d, '00-esqueleto.md'), encoding='utf-8'):
    m = re.match(r'^\|\s*§(\d+)\s*\|.*?\|\s*`borrador/(\d\d-[\w-]+\.md)`\s*\|', linea)   # tolera el relleno de Prettier
    if m:
        orden.append((int(m.group(1)), m.group(2)))
orden.sort()
N = len(orden)
assert [n for n, _ in orden] == list(range(N)), f'la tabla §B no da §0 a §{N - 1} seguidas'

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

partes, faltan = [], []
for n, fichero in orden:
    ruta = os.path.join(d, fichero)
    if not os.path.exists(ruta):
        faltan.append(fichero)
        continue
    texto = limpia(open(ruta, encoding='utf-8').read())
    if n == 0:
        titulo, _, resto = texto.partition('\n')
        assert titulo.startswith('# '), f'{fichero} tiene que empezar por el título del documento'
        resto = resto.lstrip('\n')
        if not resto.startswith('Estado:'):
            resto = ESTADO + '\n\n' + resto
        texto = titulo + '\n\n' + resto
    else:
        assert texto.startswith(f'## {n}. '), f'{fichero} no empieza por «## {n}.»'
    partes.append(texto)
if faltan:
    print('aviso: faltan', ', '.join(faltan))
if final:
    salida = os.path.normpath(os.path.join(d, '..', '..', '..', 'visual.md'))   # docs/visual.md
else:
    salida = os.path.join(d, 'visual-v0.md' if v0 else 'visual-v1.md')
open(salida, 'w', encoding='utf-8').write('\n\n---\n\n'.join(partes) + '\n')
total = sum(1 for _ in open(salida, encoding='utf-8'))
print(f'{os.path.relpath(salida, os.path.join(d, "..", "..", "..", ".."))}: {total} líneas, {len(partes)} secciones')

if not comprobar:
    sys.exit(0)

# 2. Comprobaciones sobre el ensamblado.
L = open(salida, encoding='utf-8').read().split('\n')
fallos, avisos = [], []
def fallo(msg): fallos.append(msg)

codigo = False
cuerpo = []
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
    if final and 'borrador/' in l:
        fallo(f'l. {i}: referencia a borrador/')
    for raya in ('—', '–'):
        if raya in l:
            fallo(f'l. {i}: raya {raya!r} en medio de frase')
for i, l in cuerpo:
    sin_codigo = re.sub(r'`[^`]*`', 'X', l)
    if re.search(r'\S - \S', sin_codigo) and not l.startswith('#'):
        fallo(f'l. {i}: guion entre espacios fuera del código')
    if l.count('`') % 2:
        fallo(f'l. {i}: comilla invertida sin pareja')
    if l.strip() and not l.startswith(('#', '|', '<', '!')) and l.strip() != '---':
        if not re.search(r'[.:;)»`!?*|\]>]$', l.rstrip()):
            fallo(f'l. {i}: línea que no acaba en puntuación (¿frase cortada?): …{l.rstrip()[-50:]}')
    if not l.startswith('|'):
        if sin_codigo.count('(') != sin_codigo.count(')'):
            avisos.append(f'l. {i}: paréntesis desparejados')
        if sin_codigo.count('«') != sin_codigo.count('»'):
            avisos.append(f'l. {i}: comillas «» desparejadas')

titulos = set()
for l in L:
    m = re.match(r'^#{2,4} (\d+)(?:\.(\d+))?(?:\.(\d+))?[ .]', l)
    if m:
        clave = '.'.join(g for g in m.groups() if g)
        if clave in titulos:
            fallo(f'título repetido: §{clave}')
        titulos.add(clave)
ajeno = re.compile(r'(\.md|\.ts|\.tsx|\.json|\.mjs|\.yml|mapa ?0?\d|propuesta|juez|juicio|t[aá]ctica|generador|encargo|agenda|'
                   r'SPEC|MVP|epics|balance|navegaci[oó]n|README|entrenamiento|retransmisi[oó]n|`telefono`|`sistema`|'
                   r'`identidad`|`lectura`|\btelefono\b|\bsistema\b|\bidentidad\b|\blectura\b|\bE2\b|\bE\d+\b|'
                   r'cobertura|codigo|uso)', re.I)
for i, l in enumerate(L, 1):
    for m in re.finditer(r'§(\d+)(?:\.(\d+))?', l):
        clave = m.group(1) + ('.' + m.group(2) if m.group(2) else '')
        if clave not in titulos and not ajeno.search(l[max(0, m.start() - 60):m.start()]):
            fallo(f'l. {i}: remisión a §{clave}, que no existe')

# 3. Injertos, objeciones y huecos del veredicto en los bloques de cierre de las secciones.
v = json.load(open(os.path.join(d, '..', 'juicios', 'veredicto.json'), encoding='utf-8'))
cierres = ''
for n, fichero in orden:
    ruta = os.path.join(d, fichero)
    if not os.path.exists(ruta):
        continue
    lineas = open(ruta, encoding='utf-8').read().split('\n')
    bloque, dentro = [], False
    for l in lineas[cierre(lineas):]:
        if ETIQUETA.match(l):
            dentro = l.startswith(('**Injertos', '**Objeciones', '**Huecos', '**Contradicciones'))
        if dentro:
            bloque.append(l)
    cierres += '\n'.join(bloque) + '\n'
for clave in ('injertos', 'objeciones', 'huecos'):
    ids = [x['id'] for x in v.get(clave, [])]
    sin = [x for x in ids if not re.search(r'\b' + re.escape(x) + r'\b', cierres)]
    print(f'{clave}: {len(ids) - len(sin)} de {len(ids)} en algún bloque de cierre')
    if sin:
        fallo(f'{clave} sin bloque de cierre: {", ".join(sin)}')

# 4. Lo que pide la fase 7 del documento final.
if final:
    if not (L[2].startswith('Estado: diseño escrito, sin implementar.') or L[2].startswith('Estado: en implementación')):
        fallo('la línea 3 no es «Estado: diseño escrito, sin implementar.» ni «Estado: en implementación…»')
    fin0 = next(i for i, l in enumerate(L) if l.startswith('## 1. '))
    if not any(l.startswith('**Regla de arranque**') and 'docs/encargos.md' in l for l in L[:fin0]):
        fallo('la cabecera no lleva el párrafo de la regla de arranque')
    for i, l in enumerate(L, 1):
        for prohibido in ('Decisión tomada aquí', 'Propuesto para el glosario', '00-glosario'):
            if prohibido in l:
                fallo(f'l. {i}: «{prohibido}»')
secciones = [int(m.group(1)) for l in L for m in [re.match(r'^## (\d+)\. ', l)] if m]
if secciones != list(range(1, N)) and secciones != list(range(N)):
    fallo(f'las secciones no van seguidas: {secciones}')

for a in avisos:
    print('aviso:', a)
for f in fallos:
    print('FALLO:', f)
print(f'comprobación: {len(fallos)} fallos, {len(avisos)} avisos')
sys.exit(1 if fallos else 0)
PY

RAIZ="$(cd "$DIR/../../../.." && pwd)"
PRETTIER=/tmp/claude-0/-home-user-cyclingstar/47687d53-4f57-510b-bd22-ec77a69f1ecc/scratchpad/repo/node_modules/.bin/prettier
[[ -x "$PRETTIER" ]] || PRETTIER="pnpm exec prettier"
if [[ " $* " == *" --final "* ]]; then
  (cd "$RAIZ" && $PRETTIER --write --log-level warn docs/visual.md)
elif [[ " $* " == *" --v0 "* ]]; then
  (cd "$RAIZ" && $PRETTIER --write --log-level warn docs/diseno/e3-visual/borrador/visual-v0.md)
else
  (cd "$RAIZ" && $PRETTIER --write --log-level warn docs/diseno/e3-visual/borrador/visual-v1.md)
fi
