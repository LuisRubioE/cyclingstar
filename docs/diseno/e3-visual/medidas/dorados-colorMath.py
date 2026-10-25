"""E3, PR 7 (docs/visual.md §3.9; I-31): los valores dorados de `packages/shared/src/colorMath.ts`.

`colorMath.test.ts` compara a 0,01 lo que calcula `colorMath.ts` con lo que da colour-science 0.4.7, con el
método de `fundamentos.py`: razón WCAG 2.x con la luminancia relativa de sRGB; los colores con
transparencia, mezclados en sRGB sobre su fondo y redondeados a 8 bits, como el navegador; Machado 2009 con
severidad 1 aplicado en RGB lineal y recortado a [0, 1]; los grises, la luminancia de Rec. 709 en los tres
canales; CIELAB con el blanco de sRGB (D65) y CIEDE2000.

Escribe en la salida el JSON que el test lleva pegado, con las tres matrices de Machado, la de sRGB a XYZ
y el blanco de referencia, que `colorMath.ts` copia con toda su precisión.

Uso: <venv con colour-science==0.4.7>/bin/python -I dorados-colorMath.py
"""
import json
import re
import warnings

warnings.filterwarnings("ignore")
import numpy as np  # noqa: E402
import colour  # noqa: E402

assert colour.__version__ == "0.4.7", colour.__version__

CS = colour.RGB_COLOURSPACES["sRGB"]
MACHADO = {
    "protan": colour.matrix_cvd_Machado2009("Protanomaly", 1.0),
    "deutan": colour.matrix_cvd_Machado2009("Deuteranomaly", 1.0),
    "tritan": colour.matrix_cvd_Machado2009("Tritanomaly", 1.0),
}
REC709 = np.array([0.2126, 0.7152, 0.0722])


def parse(c):
    """`#rrggbb` o `rgb(r g b / a)`: los canales de 0 a 1 y el alfa."""
    if c.startswith("#"):
        h = c[1:]
        return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]), 1.0
    m = re.fullmatch(r"rgb\((\d+) (\d+) (\d+) / ([\d.]+)\)", c)
    return np.array([int(m.group(i)) / 255 for i in (1, 2, 3)]), float(m.group(4))


def hexa(c):
    return "#" + "".join(f"{int(round(min(1, max(0, x)) * 255)):02x}" for x in c)


def opaque(fg, bg):
    """El color tal como sale: con transparencia, mezclado en sRGB sobre su fondo, a 8 bits."""
    rgb, a = parse(fg)
    if a == 1.0:
        return hexa(rgb)
    back, b = parse(bg)
    assert b == 1.0
    return hexa(rgb * a + back * (1 - a))


def lin(h):
    return colour.cctf_decoding(np.clip(parse(h)[0], 0, 1), function="sRGB")


def lum(h):
    return float(lin(h) @ REC709)


def wcag(fg, bg):
    x, y = sorted([lum(opaque(fg, bg)), lum(opaque(bg, "#ffffff"))], reverse=True)
    return (x + 0.05) / (y + 0.05)


def view(l, v):
    if v == "normal":
        return l
    if v == "gray":
        y = l @ REC709
        return np.array([y, y, y])
    return np.clip(l @ MACHADO[v].T, 0, 1)


def lab(h, v):
    xyz = colour.RGB_to_XYZ(view(lin(h), v), CS, apply_cctf_decoding=False)
    return colour.XYZ_to_Lab(xyz, CS.whitepoint)


def de(a, b, v):
    return float(colour.delta_E(lab(a, v), lab(b, v), method="CIE 2000"))


VIEWS = ("normal", "protan", "deutan", "tritan", "gray")

# Las parejas: de §3.1 y §3.3, con transparencias, y los extremos.
CONTRASTES = [
    ("#10202f", "#ffffff"),
    ("#435266", "#eef2f6"),
    ("#566579", "#f5f7fa"),
    ("#1499bb", "#ffffff"),
    ("#ffffff", "#0b6e8a"),
    ("#7b8794", "#eef2f6"),
    ("#6b7787", "#e9edf2"),
    ("rgb(255 255 255 / 0.8)", "#123a5c"),
    ("rgb(255 255 255 / 0.75)", "#0b2740"),
    ("rgb(0 0 0 / 0.3)", "#ffffff"),
    ("rgb(0 0 0 / 0.35)", "#fdf4dc"),
    ("#000000", "#ffffff"),
    ("#ffffff", "#ffffff"),
]
COLORES = ["#167a3a", "#8f4e00", "#b42318", "#0b6e8a", "#e0a106", "#1d5fa8", "#ffffff", "#000000", "#808080"]
PARES = [
    ("#167a3a", "#8f4e00"),
    ("#167a3a", "#b42318"),
    ("#167a3a", "#0b6e8a"),
    ("#8f4e00", "#b42318"),
    ("#8f4e00", "#0b6e8a"),
    ("#b42318", "#0b6e8a"),
    ("#b42318", "#b45309"),
    ("#ffffff", "#000000"),
    ("#1499bb", "#1499bb"),
]

out = {
    "constantes": {
        "machado": {v: MACHADO[v].tolist() for v in ("protan", "deutan", "tritan")},
        "rgbToXyz": CS.matrix_RGB_to_XYZ.tolist(),
        "blanco": colour.xy_to_XYZ(CS.whitepoint).tolist(),
    },
    "wcag": [{"fg": a, "bg": b, "ratio": wcag(a, b)} for a, b in CONTRASTES],
    "mezcla": [{"fg": a, "bg": b, "hex": opaque(a, b)} for a, b in CONTRASTES if parse(a)[1] < 1],
    "cvd": [
        {"color": c, "vision": v, "lineal": view(lin(c), v).tolist()}
        for c in COLORES
        for v in ("protan", "deutan", "tritan")
    ],
    "lab": [{"color": c, "lab": lab(c, "normal").tolist()} for c in COLORES],
    "deltaE00": [{"a": a, "b": b, "vista": v, "de": de(a, b, v)} for a, b in PARES for v in VIEWS],
}
print(json.dumps(out, indent=1))
