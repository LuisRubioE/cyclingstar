"""Juez de cobertura de E3: dos medidas que deciden entre propuestas.

1. Las paletas del maillot de las cuatro propuestas: el par de colores más cercano (ΔE00, colores
   planos) en las cuatro visiones y en grises, y cuántos pares bajan de 10.
2. Las señales de campeón por defecto de las cuatro (y la de hoy) frente a la marca de la UCI (V0
   del mapa 03), dibujadas a 13, 16 y 28 px con el rasterizador del mapa 03, recortadas al torso.

Usa las funciones de docs/diseno/e3-visual/mapas/03-maillots-medida.py (Machado 2009, severidad 1,
en RGB lineal; ΔE00 por píxel pesado por la cobertura del torso).
"""

import sys
sys.dont_write_bytecode = True
import importlib.util
import itertools
import math
import sys

import numpy as np

RUTA = "/home/user/cyclingstar/docs/diseno/e3-visual/mapas/03-maillots-medida.py"
spec = importlib.util.spec_from_file_location("m03", RUTA)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

VIEWS = m.VIEWS

# ---------------------------------------------------------------- 1. paletas
PALETAS = {
    "telefono (12)": ["#1b1d21", "#172a5b", "#0f6de9", "#4cc3ff", "#0f9e8f", "#236102", "#f48d32",
                       "#c62639", "#f7418a", "#4e2cae", "#ffd60a", "#ffffff"],
    "sistema (10)": ["#151b24", "#2a66db", "#4bc6fa", "#00584f", "#68111c", "#d02c2a", "#fd8637",
                      "#b36c8f", "#5e2b99", "#a2acb7"],
    "identidad (14)": ["#ffffff", "#16181d", "#ffd60a", "#8fd0f5", "#c8ced7", "#d7261e", "#2a5bd7",
                        "#2f9e44", "#f26b0f", "#7e44d0", "#1f3a93", "#7a1426", "#1d6b35", "#00897b"],
    "lectura (15)": ["#1d1d1f", "#1c2f5e", "#2453c7", "#5ab4e5", "#0b7d74", "#1f5e2e", "#a6c935",
                      "#ee7a1a", "#c81e2d", "#6e1a2b", "#e0559a", "#5b2a86", "#8b9097", "#f4d21f",
                      "#ffffff"],
}

print("# 1. Paletas: par más cercano (ΔE00 plano) y pares < 10, por visión")
for nombre, cols in PALETAS.items():
    fila = []
    for v in VIEWS:
        ds = [(m.de(a, b, v), a, b) for a, b in itertools.combinations(cols, 2)]
        dmin, a, b = min(ds)
        n10 = sum(1 for d, _, _ in ds if d < 10)
        fila.append(f"{v} {dmin:5.1f} ({a}-{b}) <10: {n10}")
    print(f"{nombre}: " + " | ".join(fila))


# ---------------------------------------------------------------- 2. señales de campeón
def star(cx, cy, ro, ri):
    pts = []
    for k in range(10):
        ang = -math.pi / 2 + k * math.pi / 5
        r = ro if k % 2 == 0 else ri
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    return [pts]


def render_clip(shapes, size, bg="#ffffff"):
    """El render del mapa 03 con recorte al torso para 'fillclip' y 'strokeclip'."""
    k = 12 if size <= 32 else 4
    n = size * k
    u = (np.arange(n) + 0.5) / k * (48.0 / size)
    X, Y = np.meshgrid(u, u)
    img = np.ones((n, n, 3)) * m.hex_rgb(bg)
    cov = np.zeros((n, n), bool)
    torso = m.inside(m.TORSO_POLY, X, Y)
    for sh in shapes:
        kind = sh[0]
        if kind in ("fill", "fillclip"):
            mask = m.inside(sh[1], X, Y)
            if sh[1] is m.TORSO_POLY:
                cov |= mask
            if kind == "fillclip":
                mask &= torso
            col, a = m.hex_rgb(sh[2]), sh[3]
        elif kind in ("stroke", "strokeclip"):
            mask = m.near_outline(sh[1], X, Y, sh[4] / 2)
            if kind == "stroke" and sh[1] is m.TORSO_POLY:
                cov |= mask
            if kind == "strokeclip":
                mask &= torso
            col, a = m.hex_rgb(sh[2]), sh[3]
        img[mask] = img[mask] * (1 - a) + col * a
    img = img.reshape(size, k, size, k, 3).mean(axis=(1, 3))
    cov = cov.reshape(size, k, size, k).mean(axis=(1, 3))
    return img, cov


class D:
    def __init__(self, shapes, size):
        img, c = render_clip(shapes, size)
        self.lab = {v: m.lab_of_srgb(img, v).reshape(-1, 3) for v in VIEWS}
        self.w = c.reshape(-1)


def body(col, filete=("#000000", 0.35, 1.5)):
    return [("fill", m.TORSO_POLY, col, 1.0), ("stroke", m.TORSO_POLY, filete[0], filete[1], filete[2])]


SASH = m.flatten("M13.76 6.71 L41.76 38.71 L34.24 45.29 L6.24 13.29 Z")
S1 = m.flatten("M13.76 6.71 L41.76 38.71 L39.25 40.90 L11.25 8.90 Z")
S2 = m.flatten("M11.25 8.90 L39.25 40.90 L36.75 43.10 L8.75 11.10 Z")
S3 = m.flatten("M8.75 11.10 L36.75 43.10 L34.24 45.29 L6.24 13.29 Z")
COLLAR = m.flatten(m.COLLAR)
STAR_HOY = m.flatten(m.STAR)
YOKE = m.rect(0, 0, 48, 21)


def sash_nacional(c1, c2, c3, papel="#f6f3ea", noche="#14213d"):
    return body(papel) + [
        ("fillclip", S1, c1, 1.0),
        ("fillclip", S2, c2, 1.0),
        ("fillclip", S3, c3, 1.0),
        ("strokeclip", SASH, noche, 1.0, 2.4),
        ("fill", COLLAR, c1, 1.0),
    ]


SENALES = {
    "hoy ChampionMark (#f1f5f9, estrella #1e293b)": body("#f1f5f9") + [("fill", STAR_HOY, "#1e293b", 1.0)],
    "telefono nacional (blanco, estrella navy r13)": body("#ffffff") + [("fill", star(24, 28.5, 13, 6.2), "#123a5c", 1.0)],
    "telefono mundial (blanco, estrella oro, borde navy)": body("#ffffff") + [
        ("fill", star(24, 28.5, 13, 6.2), "#e0a106", 1.0),
        ("strokeclip", star(24, 28.5, 13, 6.2), "#123a5c", 1.0, 1.6),
    ],
    "sistema nacional (azul marino, estrella oro r9,5)": body("#14284b") + [("fill", star(24, 29, 9.5, 3.9), "#f0b323", 1.0)],
    "sistema mundial (+ canesú oro)": body("#14284b") + [
        ("fillclip", YOKE, "#f0b323", 1.0),
        ("fill", star(24, 29, 9.5, 3.9), "#f0b323", 1.0),
    ],
    "identidad mundial (noche, banda oro)": body("#14213d") + [
        ("fillclip", SASH, "#e0a526", 1.0),
        ("fill", COLLAR, "#e0a526", 1.0),
    ],
    "identidad nacional Italia (papel, banda tricolor)": sash_nacional("#009246", "#fdfdfd", "#ce2b37"),
    "identidad nacional España (papel, rojo-oro-rojo)": sash_nacional("#aa161b", "#f1bf00", "#aa161b"),
    "lectura nacional (blanco, estrella #0b2740)": body("#ffffff") + [("fill", STAR_HOY, "#0b2740", 1.0)],
    "lectura mundial (blanco, estrella y cuello #a87300)": body("#ffffff", ("#123a5c", 1.0, 2.0)) + [
        ("fill", STAR_HOY, "#a87300", 1.0),
        ("fill", COLLAR, "#a87300", 1.0),
    ],
}

V0 = m.variant_shapes("#ffffff", m.band_h(m.UCI))

print("\n# 2. Señales por defecto frente a V0 (la marca de la UCI), distancia dibujada")
for size in (13, 16, 28):
    ref = D(V0, size)
    print(f"\n## {size} px")
    for nombre, shapes in SENALES.items():
        d = D(shapes, size)
        vals = {v: m.drawn_distance(d, ref, v) for v in VIEWS}
        peor_dicro = min(vals[v] for v in ("protan", "deutan", "tritan"))
        print(f"{nombre:55s} normal {vals['normal']:5.1f}  peor dicromacia {peor_dicro:5.1f}  grises {vals['gris']:5.1f}")
sys.stdout.flush()
