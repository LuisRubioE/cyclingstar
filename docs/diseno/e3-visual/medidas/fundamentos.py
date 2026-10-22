"""E3, redactor L1 (§3 de docs/visual.md): las medidas nuevas de los fundamentos.

Solo mide lo que el esqueleto pide o lo que ninguna propuesta midió (las demás cifras se citan):
  1. `line` y `line-strong` dentro del ámbito oscuro (D-04), contra sus dos superficies.
  2. `accent-strong`, `disabled-bg` y `disabled-ink` dentro del ámbito (decisiones 3-b y 3-c).
  3. Parejas de texto del tema claro que nadie midió y que los componentes de §4 usan.
  4. ΔE00 entre los tonos de estado y entre sus fondos en las cuatro visiones y en grises (H-18).

Método, el mismo de propuesta-telefono/color.py y mapas/03: razón WCAG 2.x con la luminancia
relativa de sRGB; Machado 2009 con severidad 1 aplicado en RGB lineal y recortado a [0, 1]; CIELAB
con el blanco de sRGB (D65) y CIEDE2000. Los colores con transparencia se mezclan en sRGB sobre su
fondo, como el navegador.

Uso: <scratchpad>/venv/bin/python -I fundamentos.py
"""
import itertools
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


T = {  # el tema claro, D-03
    "canvas": "#eef2f6", "surface": "#ffffff", "surface-2": "#f5f7fa", "line": "#d8dee6",
    "line-strong": "#7b8794", "ink": "#10202f", "ink-2": "#435266", "ink-3": "#566579",
    "navy": "#123a5c", "navy-dark": "#0b2740", "cyan": "#1499bb", "accent": "#0b6e8a",
    "accent-strong": "#085a71", "white": "#ffffff", "gold": "#e0a106", "gold-ink": "#7a5000",
    "good": "#167a3a", "good-bg": "#e6f4ea", "warn": "#8f4e00", "warn-bg": "#fff3d6",
    "bad": "#b42318", "bad-bg": "#fdeceb", "info-bg": "#e3f2f7", "focus": "#1d4ed8",
    "disabled-ink": "#6b7787", "disabled-bg": "#e9edf2", "own": "#a87300", "own-tint": "#fdf4dc",
}
W75 = {bg: mix("#ffffff", bg, 0.75) for bg in ("#0b2740", "#123a5c")}
W80 = {bg: mix("#ffffff", bg, 0.8) for bg in ("#0b2740", "#123a5c")}


def row(label, a, b, value=None):
    r = wcag(a, b) if value is None else value
    print(f"  {label:58s} {a} sobre {b}  {r:5.2f}")


print("1. Referencia en el tema claro (D-03, ya medido por telefono; se repite como control)")
row("line sobre surface", T["line"], T["surface"])
row("line sobre canvas", T["line"], T["canvas"])
row("line-strong sobre surface", T["line-strong"], T["surface"])
row("line-strong sobre canvas", T["line-strong"], T["canvas"])
row("surface-2 sobre surface (de una superficie a la otra)", T["surface-2"], T["surface"])

D1, D2 = "#0b2740", "#123a5c"  # surface y surface-2 del ámbito
print("\n2. Ámbito oscuro: candidatos de line-strong (umbral 3:1 contra las dos superficies)")
for c in ("#6f8aa6", "#7891ab", "#7f97b0", "#8299b1", "#869db5", "#8ea4bb", "#93a8bf"):
    print(f"  {c}: sobre {D1} {wcag(c, D1):4.2f} · sobre {D2} {wcag(c, D2):4.2f}")
print("   candidatos de line (decorativo: visible sobre las dos y muy por debajo de line-strong)")
for c in ("#24496c", "#29506f", "#2c5274", "#2f5679", "#335a7d", "#375f82"):
    print(f"  {c}: sobre {D1} {wcag(c, D1):4.2f} · sobre {D2} {wcag(c, D2):4.2f}")

print("\n3. Ámbito oscuro: accent-strong (primario encima y pulsado; on-accent #0b2740 encima)")
for c in ("#35bdda", "#5ccbe3", "#6fd1e6", "#7fd6e9", "#8fdcec"):
    print(f"  {c}: on-accent encima {wcag(D1, c):5.2f} · sobre {D1} {wcag(c, D1):5.2f} · sobre {D2} "
          f"{wcag(c, D2):5.2f} · ΔE00 con #35bdda {de(c, '#35bdda', 'normal'):4.1f}")
print("   disabled-bg y disabled-ink en el ámbito")
for bgc in ("#1b4062", "#1f4567", "#234a6c"):
    for ink in ("#9aabbd", "#a3b2c3", "#aab8c8"):
        print(f"  bg {bgc} (sobre {D1} {wcag(bgc, D1):4.2f}; sobre {D2} {wcag(bgc, D2):4.2f}) · ink {ink} "
              f"encima {wcag(ink, bgc):4.2f}")
print("   lo que ya está fijado, como control")
row("ink-2 (blanco al 75 %) sobre surface del ámbito", W75[D1], D1)
row("ink-2 (blanco al 75 %) sobre surface-2 del ámbito", W75[D2], D2)
row("on-navy-2 (blanco al 80 %) sobre navy", W80[D2], D2)
row("on-navy-2 (blanco al 80 %) sobre navy-dark", W80[D1], D1)
row("focus #ffd166 sobre navy-dark", "#ffd166", D1)
row("focus #ffd166 sobre navy", "#ffd166", D2)
row("gold sobre navy-dark", T["gold"], D1)
row("gold sobre navy (subrayado de Tabs nav, gráfico)", T["gold"], D2)
row("accent #35bdda sobre navy (enlace en el ámbito)", "#35bdda", D2)

print("\n4. Parejas del tema claro que usan los componentes de §4 y nadie midió")
pairs = [
    ("ink sobre good-bg (título de Notice)", "ink", "good-bg"),
    ("ink sobre warn-bg", "ink", "warn-bg"),
    ("ink sobre bad-bg", "ink", "bad-bg"),
    ("ink sobre info-bg", "ink", "info-bg"),
    ("ink-2 sobre good-bg (texto de Notice)", "ink-2", "good-bg"),
    ("ink-2 sobre warn-bg", "ink-2", "warn-bg"),
    ("ink-2 sobre bad-bg", "ink-2", "bad-bg"),
    ("ink-2 sobre info-bg", "ink-2", "info-bg"),
    ("ink-2 sobre own-tint (segundo renglón de la fila propia)", "ink-2", "own-tint"),
    ("ink-3 sobre own-tint (equipo en la fila propia)", "ink-3", "own-tint"),
    ("ink-3 sobre info-bg (día de viaje)", "ink-3", "info-bg"),
    ("accent sobre surface-2 (enlace en cabecera de tabla)", "accent", "surface-2"),
    ("ink-2 sobre surface-2 (tramo inactivo, Chip neutral)", "ink-2", "surface-2"),
    ("line-strong sobre surface-2 (borde del tramo inactivo)", "line-strong", "surface-2"),
    ("own sobre own-tint (la barra de 3 px)", "own", "own-tint"),
    ("disabled-ink sobre surface", "disabled-ink", "surface"),
    ("white sobre bad (Button danger)", "white", "bad"),
    ("white sobre accent-strong (primario pulsado)", "white", "accent-strong"),
    ("on-navy-2 en la BottomNav: ver la parte 3", "white", "white"),
]
for label, a, b in pairs[:-1]:
    row(label, T[a], T[b])

print("\n5. ΔE00 entre los tonos de estado (H-18; se informa, no es umbral: D-13)")
TONES = {"good": T["good"], "warn": T["warn"], "bad": T["bad"], "info": T["accent"]}
BGS = {"good-bg": T["good-bg"], "warn-bg": T["warn-bg"], "bad-bg": T["bad-bg"], "info-bg": T["info-bg"]}
for name, group in (("tono (texto, borde e icono)", TONES), ("fondo del tono", BGS)):
    print(f"  {name}")
    for a, b in itertools.combinations(group, 2):
        ds = " · ".join(f"{v} {de(group[a], group[b], v):4.1f}" for v in VIEWS)
        print(f"    {a:8s} / {b:8s}: {ds} · luminancia {wcag(group[a], group[b]):4.2f}")

print("\n6. Complementos del ámbito oscuro")
row("surface-2 del ámbito sobre su surface", D2, D1)
row("line-strong #7f97b0 sobre disabled-bg #1f4567", "#7f97b0", "#1f4567")
row("disabled-bg #1f4567 sobre surface-2 del ámbito", "#1f4567", D2)
row("white sobre accent-strong del ámbito? (no se usa: on-accent)", "#ffffff", "#7fd6e9")
row("on-accent #0b2740 sobre accent-strong #7fd6e9", D1, "#7fd6e9")
print(f"  ΔE00 accent / accent-strong del ámbito en las cinco vistas: " + " · ".join(f"{v} {de('#35bdda', '#7fd6e9', v):4.1f}" for v in VIEWS))

print("\n7. Gráficos de §4 (WCAG 1.4.11 pide 3:1)")
row("accent sobre line (segmento lleno contra vacío de Meter)", T["accent"], T["line"])
row("gold sobre surface (estrella sin contorno)", T["gold"], T["surface"])
row("gold-ink sobre surface (contorno de la estrella llena)", T["gold-ink"], T["surface"])
row("own sobre surface (la barra de la fila propia)", T["own"], T["surface"])
row("bad con brightness 90 %: blanco encima", "#ffffff", hexa(rgb(T["bad"]) * 0.9))
