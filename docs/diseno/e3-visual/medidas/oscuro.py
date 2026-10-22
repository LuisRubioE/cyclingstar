"""E3, corrector L1 (§3.3 de docs/visual.md): el modo oscuro opcional de D-00i, medido.

Mide cada pareja de texto y fondo del modo oscuro (`:root[data-theme='dark']`) que pintan los
componentes de §4, con su umbral (4,5:1 el texto; 3:1 un borde, un tramo, un gráfico o el foco), y el
ΔE00 entre los tonos de estado en las cuatro visiones y en grises, que se informa y no es umbral
(D-13). Repite como control tres cifras ya publicadas del ámbito oscuro (15,23, 9,10 y 6,85).

Método, el de redactor-L1/fundamentos.py (y el de propuesta-telefono/color.py): razón WCAG 2.x con la
luminancia relativa de sRGB; Machado 2009 con severidad 1 en RGB lineal, recortado a [0, 1]; CIELAB
con el blanco D65 y CIEDE2000. Los colores con transparencia se mezclan en sRGB sobre su fondo.

Uso: <scratchpad>/venv/bin/python -I oscuro.py
"""
import itertools
import sys
import warnings

warnings.filterwarnings("ignore")
import numpy as np  # noqa: E402
import colour  # noqa: E402

CS = colour.RGB_COLOURSPACES["sRGB"]
MACHADO = {
    "protan": colour.matrix_cvd_Machado2009("Protanomaly", 1.0),
    "deutan": colour.matrix_cvd_Machado2009("Deuteranomaly", 1.0),
    "tritan": colour.matrix_cvd_Machado2009("Tritanomaly", 1.0),
}
REC709 = np.array([0.2126, 0.7152, 0.0722])
VIEWS = ("normal", "protan", "deutan", "tritan", "grises")


def rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def hexa(c):
    return "#" + "".join(f"{int(round(min(1, max(0, x)) * 255)):02x}" for x in c)


def mix(fg, bg, alpha):
    return hexa(rgb(fg) * alpha + rgb(bg) * (1 - alpha))


def lin(h):
    return colour.cctf_decoding(np.clip(rgb(h), 0, 1), function="sRGB")


def lum(h):
    return float(lin(h) @ REC709)


def wcag(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True)
    return (x + 0.05) / (y + 0.05)


def view(l, v):
    if v == "normal":
        return l
    if v == "grises":
        y = l @ REC709
        return np.array([y, y, y])
    return np.clip(l @ MACHADO[v].T, 0, 1)


def lab(h, v):
    xyz = colour.RGB_to_XYZ(view(lin(h), v), CS, apply_cctf_decoding=False)
    return colour.XYZ_to_Lab(xyz, CS.whitepoint)


def de(a, b, v):
    return float(colour.delta_E(lab(a, v), lab(b, v), method="CIE 2000"))


# El modo oscuro: la paleta C de telefono (§15.1: superficies #0b2740 y #123a5c, texto blanco,
# secundario blanco al 75 %, acento #35bdda), que es la del ámbito oscuro de §3.3, más lo que el
# ámbito no tiene. W75 es el blanco al 75 % (ink-2 e ink-3), mezclado sobre cada fondo.
DK = {
    "canvas": "#071a2d",
    "surface": "#0b2740",
    "surface-2": "#123a5c",
    "line": "#2c5274",
    "line-strong": "#7f97b0",
    "ink": "#ffffff",
    "accent": "#35bdda",
    "accent-strong": "#7fd6e9",
    "on-accent": "#0b2740",
    "gold": "#e0a106",
    "gold-ink": "#f0b429",
    "good": "#5bd08c",
    "good-bg": "#0e3b2e",
    "warn": "#f5b04f",
    "warn-bg": "#3d2c0c",
    "bad": "#ff8f86",
    "bad-bg": "#45191f",
    "on-bad": "#0b2740",
    "info-bg": "#0d3a55",
    "focus": "#ffd166",
    "disabled-bg": "#1f4567",
    "disabled-ink": "#a3b2c3",
    "own": "#e0a106",
    "own-tint": "#2e2a16",
    "arrival-cooked": "#ff8f86",
    "arrival-loaded": "#f5a35c",
    "arrival-fine": "#a3b2c3",
    "arrival-spoton": "#5bd08c",
    "arrival-rusty": "#82b4f5",
    "on-arrival": "#0b2740",
}
W75 = 0.75


def c(token, bg=None):
    """El color de un token; ink-2 e ink-3 son el blanco al 75 % mezclado sobre su fondo."""
    if token in ("ink-2", "ink-3"):
        return mix("#ffffff", DK[bg], W75)
    return DK[token]


TEXTO, GRAFICO = 4.5, 3.0
PAREJAS = [  # (qué, primer plano, fondo, umbral)
    ("ink sobre canvas (h1 de PageHeader)", "ink", "canvas", TEXTO),
    ("ink sobre surface (texto, nombre, valor)", "ink", "surface", TEXTO),
    ("ink sobre surface-2", "ink", "surface-2", TEXTO),
    ("ink-2 sobre canvas (línea de estado)", "ink-2", "canvas", TEXTO),
    ("ink-2 sobre surface (segundo renglón, consecuencia)", "ink-2", "surface", TEXTO),
    ("ink-2 sobre surface-2 (Chip neutral, tramo inactivo, InfoButton)", "ink-2", "surface-2", TEXTO),
    ("ink-3 sobre surface (rótulo, eje, equipo)", "ink-3", "surface", TEXTO),
    ("ink-3 sobre canvas", "ink-3", "canvas", TEXTO),
    ("accent sobre surface (enlace, quiet)", "accent", "surface", TEXTO),
    ("accent sobre canvas (vuelta de PageHeader)", "accent", "canvas", TEXTO),
    ("accent sobre surface-2", "accent", "surface-2", TEXTO),
    ("accent sobre info-bg (tono info)", "accent", "info-bg", TEXTO),
    ("on-accent sobre accent (primario, Chip accent, Segmented)", "on-accent", "accent", TEXTO),
    ("on-accent sobre accent-strong (primario encima y pulsado)", "on-accent", "accent-strong", TEXTO),
    ("gold-ink sobre surface (texto dorado)", "gold-ink", "surface", TEXTO),
    ("gold-ink sobre surface-2", "gold-ink", "surface-2", TEXTO),
    ("good sobre surface (Stat con signo)", "good", "surface", TEXTO),
    ("good sobre good-bg (Chip, Notice)", "good", "good-bg", TEXTO),
    ("warn sobre surface", "warn", "surface", TEXTO),
    ("warn sobre warn-bg", "warn", "warn-bg", TEXTO),
    ("bad sobre surface (error, Stat con signo)", "bad", "surface", TEXTO),
    ("bad sobre bad-bg", "bad", "bad-bg", TEXTO),
    ("on-bad sobre bad (Button danger)", "on-bad", "bad", TEXTO),
    ("ink sobre good-bg (título de Notice)", "ink", "good-bg", TEXTO),
    ("ink sobre warn-bg (título de Notice; OfflineBanner)", "ink", "warn-bg", TEXTO),
    ("ink sobre bad-bg", "ink", "bad-bg", TEXTO),
    ("ink sobre info-bg", "ink", "info-bg", TEXTO),
    ("ink-2 sobre good-bg (texto de Notice)", "ink-2", "good-bg", TEXTO),
    ("ink-2 sobre warn-bg", "ink-2", "warn-bg", TEXTO),
    ("ink-2 sobre bad-bg", "ink-2", "bad-bg", TEXTO),
    ("ink-2 sobre info-bg", "ink-2", "info-bg", TEXTO),
    ("ink-3 sobre info-bg (día de viaje)", "ink-3", "info-bg", TEXTO),
    ("ink sobre own-tint (la fila propia)", "ink", "own-tint", TEXTO),
    ("ink-2 sobre own-tint", "ink-2", "own-tint", TEXTO),
    ("ink-3 sobre own-tint (equipo en la fila propia)", "ink-3", "own-tint", TEXTO),
    ("disabled-ink sobre disabled-bg (WCAG lo exime; se pide 4,5)", "disabled-ink", "disabled-bg", TEXTO),
    ("on-arrival sobre arrival-cooked", "on-arrival", "arrival-cooked", TEXTO),
    ("on-arrival sobre arrival-loaded", "on-arrival", "arrival-loaded", TEXTO),
    ("on-arrival sobre arrival-fine", "on-arrival", "arrival-fine", TEXTO),
    ("on-arrival sobre arrival-spoton", "on-arrival", "arrival-spoton", TEXTO),
    ("on-arrival sobre arrival-rusty", "on-arrival", "arrival-rusty", TEXTO),
    ("line-strong sobre surface (borde de campo y de control)", "line-strong", "surface", GRAFICO),
    ("line-strong sobre canvas", "line-strong", "canvas", GRAFICO),
    ("line-strong sobre surface-2 (borde del tramo inactivo)", "line-strong", "surface-2", GRAFICO),
    ("focus sobre canvas", "focus", "canvas", GRAFICO),
    ("focus sobre surface", "focus", "surface", GRAFICO),
    ("focus sobre surface-2", "focus", "surface-2", GRAFICO),
    ("accent sobre line (segmento lleno contra vacío de Meter)", "accent", "line", GRAFICO),
    ("gold sobre surface (estrella llena)", "gold", "surface", GRAFICO),
    ("own sobre own-tint (la barra de 3 px)", "own", "own-tint", GRAFICO),
    ("own sobre surface", "own", "surface", GRAFICO),
    ("good sobre good-bg como icono y borde", "good", "good-bg", GRAFICO),
    ("arrival-cooked sobre surface (tramo)", "arrival-cooked", "surface", GRAFICO),
    ("arrival-loaded sobre surface", "arrival-loaded", "surface", GRAFICO),
    ("arrival-fine sobre surface", "arrival-fine", "surface", GRAFICO),
    ("arrival-spoton sobre surface", "arrival-spoton", "surface", GRAFICO),
    ("arrival-rusty sobre surface", "arrival-rusty", "surface", GRAFICO),
]

fallan = 0
print("1. Parejas del modo oscuro (D-00i)")
for que, fg, bg, umbral in PAREJAS:
    r = wcag(c(fg, bg), c(bg))
    marca = "ok" if r >= umbral else "FALLA"
    fallan += r < umbral
    print(f"  {marca:5s} {r:5.2f} (≥ {umbral}) {que}: {c(fg, bg)} sobre {c(bg)}")

print("\n2. Lo que no es una pareja de token contra token")
danger = (hexa(rgb(DK["on-bad"]) * 0.9), hexa(rgb(DK["bad"]) * 0.9))
print(f"  Button danger encima (brightness-90, el filtro oscurece también el texto): "
      f"{wcag(*danger):5.2f} ({danger[0]} sobre {danger[1]})")
print(f"  canvas contra surface: {wcag(DK['canvas'], DK['surface']):4.2f}; surface contra surface-2: "
      f"{wcag(DK['surface'], DK['surface-2']):4.2f} (fondos, sin umbral)")
print(f"  line sobre surface {wcag(DK['line'], DK['surface']):4.2f} y sobre canvas "
      f"{wcag(DK['line'], DK['canvas']):4.2f} (decorativo, sin umbral)")

print("\n3. Control: cifras ya publicadas del ámbito oscuro (§3.3)")
print(f"  ink sobre #0b2740 {wcag('#ffffff', '#0b2740'):5.2f} (15,23) · blanco al 75 % sobre #0b2740 "
      f"{wcag(mix('#ffffff', '#0b2740', W75), '#0b2740'):4.2f} (9,10) · #35bdda sobre #0b2740 "
      f"{wcag('#35bdda', '#0b2740'):4.2f} (6,85)")

print("\n4. ΔE00 entre los tonos de estado del modo oscuro (se informa, no es umbral: D-13)")
TONOS = {"good": DK["good"], "warn": DK["warn"], "bad": DK["bad"], "info": DK["accent"]}
for a, b in itertools.combinations(TONOS, 2):
    ds = " · ".join(f"{v} {de(TONOS[a], TONOS[b], v):4.1f}" for v in VIEWS)
    print(f"  {a:5s} / {b:5s}: {ds} · luminancia {wcag(TONOS[a], TONOS[b]):4.2f}")
print("  los tramos de la llegada, vecinos en la escala")
TRAMOS = ["arrival-cooked", "arrival-loaded", "arrival-fine", "arrival-spoton", "arrival-rusty"]
for a, b in zip(TRAMOS, TRAMOS[1:]):
    ds = " · ".join(f"{v} {de(DK[a], DK[b], v):4.1f}" for v in VIEWS)
    print(f"  {a[8:]:7s} / {b[8:]:7s}: {ds}")
print(f"  el tramo activo más cercano al inactivo (surface-2), en la peor visión: "
      f"{min(de(DK[t], DK['surface-2'], v) for t in TRAMOS for v in VIEWS):4.1f}")

print("\n5. Tema claro: las cifras que corrigen los hallazgos de L1")
print(f"  ink sobre own-tint {wcag('#10202f', '#fdf4dc'):5.2f} (el borrador decía 16,26; Rcodigo-003)")
bad90 = (hexa(rgb("#ffffff") * 0.9), hexa(rgb("#b42318") * 0.9))
print(f"  Button danger encima en claro, blanco y bad al 90 %: {wcag(*bad90):4.2f} ({bad90[0]} sobre {bad90[1]};"
      f" Rcodigo-015)")
print(f"  pastilla de hoy, surface-2 del ámbito #123a5c contra la barra #0b2740: {wcag('#123a5c', '#0b2740'):4.2f};"
      f" blanco contra on-navy-2 sobre la barra: {wcag('#ffffff', mix('#ffffff', '#0b2740', 0.8)):4.2f} (Ruso-008)")
print(f"  pastilla nueva, gold sobre navy-dark: {wcag('#e0a106', '#0b2740'):4.2f}; el icono navy-dark sobre gold:"
      f" {wcag('#0b2740', '#e0a106'):4.2f}")

print(f"\n{fallan} parejas por debajo de su umbral")
sys.exit(1 if fallan else 0)
