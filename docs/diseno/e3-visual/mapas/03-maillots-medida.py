#!/usr/bin/env python3
"""E3, mapa 03: la medida de los maillots (docs/diseno/e3-visual/mapas/03-maillots.md).

Qué mide, sobre el código de 58c14da y un mundo recién creado con el código del juego:

  1. La paleta de equipación (`JERSEY_COLORS`, apps/web/src/components/visuals.ts l. 34-49): la
     matriz de ΔE00 de sus 14 colores en cinco vistas (normal, protanopía, deuteranopía, tritanopía
     y grises) y los pares por debajo de 10 y de 20.
  2. La equipación de cada equipo del mundo, con `jerseyStyle` portado aquí (visuals.ts l. 7-83) y
     cotejado, equipo a equipo, con el `jerseyStyle` de la web, que el generador transpila y ejecuta.
  3. Los pelotones: en cada carrera de la temporada 0 que no es campeonato nacional, los pares de
     equipos INDISTINGUIBLES (mismo patrón y ΔE00 de su color base por debajo de 10) en cada vista.
  4. Los líderes (`LEADER_JERSEY`, apps/web/src/components/Jersey.tsx l. 73-77): el trío, sus marcas
     y sus parecidos con las equipaciones; y el `ChampionMark` provisional (l. 121-168).
  5. Los fondos sobre los que la web pinta maillots (blanco, el del `body`, slate-700, slate-900 y
     red-700 de Tailwind 4.3.3).
  6. Las variantes de bandas del dueño (00-encargo.md §7.1), dibujadas en la rejilla de 48 unidades
     del maillot y comparadas, ya rasterizadas a 13, 16, 28 y 72 px, con las equipaciones de hoy.

Método de color: Machado, Oliveira y Fernandes (2009), severidad 1 (`matrix_cvd_Machado2009` de
colour-science 0.4.7), aplicada en RGB lineal y recortada a [0, 1]; ΔE00 (CIE 2000) en CIELAB con
blanco D65. La vista en grises es la luminancia relativa (Rec. 709) con a* = b* = 0.

Método de dibujo (punto 6): un rasterizador propio con numpy (no hay Pillow ni cairo en el entorno)
que reproduce el SVG de `Jersey.tsx` (los mismos trazados, el mismo orden de pintado, el filete del
torso y la opacidad del cuello) con supermuestreo y la mezcla en sRGB codificado, que es como
compone el navegador. La distancia entre dos maillots dibujados es la media de ΔE00 píxel a píxel,
pesada por la cobertura del torso, sobre fondo blanco. Cotejado una vez con Chromium 1194 (Playwright,
los SVG equivalentes dibujados en un lienzo): ΔE00 medio por píxel entre el rasterizador y Chromium
de 0,25 a 2,3 en los maillots del juego (a 13 px, de 1,2 a 2,3) y de hasta 4,8 en las bandas de
0,54 px de las variantes a 13 px.

Uso (el mundo lo genera el código del juego, en Node, desde un clon compilado de 58c14da):

  python3 03-maillots-medida.py --generador <dir>/mundo.mjs        # escribe el generador
  node <dir>/mundo.mjs --root <clon> --out <dir>                    # deja <dir>/mundo03.json
  <scratchpad>/venv/bin/python -I 03-maillots-medida.py --repo <repositorio> \\
      --mundo <dir>/mundo03.json [--json <salida.json>]

El generador (`GENERADOR_MJS`, al final) levanta PGlite con todas las migraciones, crea el mundo
con `runTick` y `GENESIS_WORLD_SEED`, lee los equipos, pide a `predictStartlist` el pelotón de cada
carrera, lista los nacionales del calendario y prueba qué hace `seedWorld` cuando un equipo con
dueño cambia de `jersey_seed`.
"""

import argparse
import itertools
import json
import math
import re
import statistics
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
import numpy as np  # noqa: E402
import colour  # noqa: E402

VIEWS = ("normal", "protan", "deutan", "tritan", "gris")
VIEW_NAME = {
    "normal": "normal",
    "protan": "protanopía",
    "deutan": "deuteranopía",
    "tritan": "tritanopía",
    "gris": "grises",
}
CS = colour.RGB_COLOURSPACES["sRGB"]
MACHADO = {
    "protan": colour.matrix_cvd_Machado2009("Protanomaly", 1.0),
    "deutan": colour.matrix_cvd_Machado2009("Deuteranomaly", 1.0),
    "tritan": colour.matrix_cvd_Machado2009("Tritanomaly", 1.0),
}
REC709 = np.array([0.2126, 0.7152, 0.0722])

# Los colores de la UCI: «UCI Jerseys Visual Guidelines», versión 5.3 (abril de 2025), p. 5,
# «UCI Colours», en RGB: Blue 0 120 200, Red 200 20 60, Black 0 0 0, Yellow 250 225 0, Green 50 180 50.
UCI = ["#0078c8", "#c8143c", "#000000", "#fae100", "#32b432"]
UCI_NAMES = ["blue", "red", "black", "yellow", "green"]

# Los fondos de Tailwind 4.3.3 (node_modules/tailwindcss/theme.css), en OKLCH.
TAILWIND_OKLCH = {
    "slate-700": (0.372, 0.044, 257.287),
    "slate-900": (0.208, 0.042, 265.755),
    "red-700": (0.505, 0.213, 27.518),
}

# La geometría de Jersey.tsx, literal: el script comprueba que cada cadena sigue en el fichero.
TORSO = (
    "M16 8 L10 12 L7 20 L12 23 L14 18 L14 40 Q24 43 34 40 L34 18 L36 23 L41 20 L38 12 L32 8 "
    "Q24 12 16 8 Z"
)
STAR = (
    "M24 19 L26.4 24.6 L32.4 25.1 L27.8 29 L29.2 34.9 L24 31.8 L18.8 34.9 L20.2 29 L15.6 25.1 "
    "L21.6 24.6 Z"
)
PANEL_L = "M14 18 L20 18 L20 40 Q17 39.5 14 40 Z"
PANEL_R = "M34 18 L28 18 L28 40 Q31 39.5 34 40 Z"
SHOULDER_L = "M16 8 L10 12 L7 20 L12 23 L14 18 Z"
SHOULDER_R = "M32 8 L38 12 L41 20 L36 23 L34 18 Z"
COLLAR = "M20 8 Q24 12 28 8 L26 6 Q24 8 22 6 Z"
JERSEY_TSX_LITERALS = [
    TORSO,
    STAR,
    PANEL_L,
    PANEL_R,
    SHOULDER_L,
    SHOULDER_R,
    COLLAR,
    '<rect x="14" y="24" width="20" height="6" fill={secondary} />',
    '<rect x="14" y="18" width="20" height="3" fill={secondary} />',
    '<rect x="14" y="26" width="20" height="3" fill={secondary} />',
    '<rect x="14" y="34" width="20" height="3" fill={secondary} />',
    'stroke="rgba(0,0,0,0.18)" strokeWidth="1"',
    'stroke="rgba(0,0,0,0.35)" strokeWidth="1.5"',
    '<rect x="14" y="25" width="20" height="7" fill={mark} />',
    'r="3.4"',
    'fill={accent} opacity="0.85"',
]
DOTS = [(19, 22), (29, 22), (24, 29), (19, 36), (29, 36)]


# ------------------------------------------------------------------------------------- el color


def hex_rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return np.array([int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)])


def rgb_hex(rgb):
    return "#" + "".join(f"{int(round(min(1, max(0, c)) * 255)):02x}" for c in rgb)


def to_linear(srgb):
    return colour.cctf_decoding(np.clip(srgb, 0, 1), function="sRGB")


def in_view(lin, view):
    """RGB lineal visto por una visión: Machado 2009 (severidad 1) o la luminancia."""
    if view == "normal":
        return lin
    if view == "gris":
        y = lin @ REC709
        return np.stack([y, y, y], axis=-1)
    return np.clip(lin @ MACHADO[view].T, 0, 1)


def lab_of_srgb(srgb, view):
    lin = in_view(to_linear(srgb), view)
    xyz = colour.RGB_to_XYZ(lin, CS, apply_cctf_decoding=False)
    return colour.XYZ_to_Lab(xyz, CS.whitepoint)


_LAB = {}


def lab(hexcolor, view):
    key = (hexcolor.lower(), view)
    if key not in _LAB:
        _LAB[key] = lab_of_srgb(hex_rgb(hexcolor), view)
    return _LAB[key]


def de(a, b, view):
    return float(colour.delta_E(lab(a, view), lab(b, view), method="CIE 2000"))


def luminance(hexcolor):
    return float(to_linear(hex_rgb(hexcolor)) @ REC709)


def wcag(a, b):
    la, lb = sorted([luminance(a), luminance(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


def oklch_hex(L, C, H):
    a, b = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
    xyz = colour.Oklab_to_XYZ(np.array([L, a, b]))
    lin = colour.XYZ_to_RGB(xyz, CS, apply_cctf_encoding=False)
    return rgb_hex(colour.cctf_encoding(np.clip(lin, 0, 1), function="sRGB"))


# --------------------------------------------------------- jerseyStyle, portado de visuals.ts


def hash_seed(seed):
    """FNV-1a de 32 bits sobre las unidades UTF-16, como `hashSeed` (visuals.ts l. 8-15)."""
    h = 0x811C9DC5
    units = seed.encode("utf-16-le")
    for i in range(0, len(units), 2):
        h ^= units[i] | (units[i + 1] << 8)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def seeded_picker(seed):
    """xorshift32, como `seededPicker` (visuals.ts l. 18-27)."""
    state = hash_seed(seed) or 1

    def nxt():
        nonlocal state
        state ^= (state << 13) & 0xFFFFFFFF
        state ^= state >> 17
        state ^= (state << 5) & 0xFFFFFFFF
        return state / 0xFFFFFFFF

    return nxt


def pick_from(arr, r):
    return arr[min(len(arr) - 1, math.floor(r * len(arr)))]


def jersey_style(seed, colors, patterns):
    """`jerseyStyle` (visuals.ts l. 71-83): base, secundario (un solo re-sorteo), acento y patrón."""
    r = seeded_picker(seed)
    base = pick_from(colors, r())
    secondary = pick_from(colors, r())
    if secondary == base:
        secondary = pick_from(colors, r())
    pattern = pick_from(patterns, r())
    return {"base": base, "secondary": secondary, "accent": "#ffffff", "pattern": pattern}


# ------------------------------------------------------------------------------------ el código


def read_sources(repo):
    vis = (repo / "apps/web/src/components/visuals.ts").read_text(encoding="utf-8")
    block = re.search(r"export const JERSEY_COLORS = \[(.*?)\] as const", vis, re.S).group(1)
    colors = re.findall(r"'(#[0-9a-f]{6})',\s*//\s*([^\n]+)", block)
    pats = re.search(r"export const JERSEY_PATTERNS: JerseyPattern\[\] = \[(.*?)\]", vis).group(1)
    jer = (repo / "apps/web/src/components/Jersey.tsx").read_text(encoding="utf-8")
    missing = [s for s in JERSEY_TSX_LITERALS if s not in jer]
    if missing:
        sys.exit(f"Jersey.tsx ha cambiado; faltan estos trazados: {missing}")
    leaders = {
        k: {"base": b, "mark": m, "pattern": p}
        for k, b, m, p in re.findall(
            r"(gc|points|kom): \{ base: '(#[0-9a-f]{6})', mark: '(#[0-9a-f]{6})', pattern: '(\w+)' \}",
            jer,
        )
    }
    css = (repo / "apps/web/src/index.css").read_text(encoding="utf-8")
    return {
        "colors": [c for c, _ in colors],
        "color_names": {c: n.strip() for c, n in colors},
        "patterns": re.findall(r"'(\w+)'", pats),
        "leaders": leaders,
        "champion_torso": re.search(r'<path d=\{TORSO\} fill="(#[0-9a-f]{6})"', jer).group(1),
        "champion_star": re.search(r'<path d=\{STAR\} fill="(#[0-9a-f]{6})"', jer).group(1),
        "body": re.search(r"body \{\s*background-color: (#[0-9a-f]{6})", css).group(1),
        "brand": dict(re.findall(r"--color-(brand-[a-z-]+): (#[0-9a-f]{6});", css)),
    }


# ------------------------------------------------------------------------------ el rasterizador


def flatten(d, nq=12):
    """Un trazado absoluto con M, L, Q y Z, en polígonos (las curvas, en `nq` tramos)."""
    toks = re.findall(r"[MLQZ]|-?\d+(?:\.\d+)?", d)
    polys, cur, i, cmd = [], [], 0, None
    while i < len(toks):
        t = toks[i]
        if t in "MLQZ":
            cmd = t
            i += 1
            if cmd == "Z":
                polys.append(cur)
                cur = []
            continue
        if cmd in ("M", "L"):
            cur.append((float(toks[i]), float(toks[i + 1])))
            i += 2
        elif cmd == "Q":
            cx, cy, x, y = (float(v) for v in toks[i : i + 4])
            x0, y0 = cur[-1]
            for s in range(1, nq + 1):
                u = s / nq
                cur.append(
                    (
                        (1 - u) ** 2 * x0 + 2 * (1 - u) * u * cx + u * u * x,
                        (1 - u) ** 2 * y0 + 2 * (1 - u) * u * cy + u * u * y,
                    )
                )
            i += 4
    if cur:
        polys.append(cur)
    return polys


def rect(x, y, w, h):
    return [[(x, y), (x + w, y), (x + w, y + h), (x, y + h)]]


def inside(polys, X, Y):
    out = np.zeros(X.shape, bool)
    for poly in polys:
        res = np.zeros(X.shape, bool)
        n = len(poly)
        for k in range(n):
            (xi, yi), (xj, yj) = poly[k], poly[k - 1]
            cond = (yi > Y) != (yj > Y)
            with np.errstate(divide="ignore", invalid="ignore"):
                xint = (xj - xi) * (Y - yi) / (yj - yi) + xi
            res ^= cond & (X < xint)
        out |= res
    return out


def near_outline(polys, X, Y, half):
    d2 = np.full(X.shape, np.inf)
    for poly in polys:
        pts = poly + [poly[0]]
        for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
            dx, dy = x2 - x1, y2 - y1
            l2 = dx * dx + dy * dy
            t = 0.0 if l2 == 0 else np.clip(((X - x1) * dx + (Y - y1) * dy) / l2, 0, 1)
            d2 = np.minimum(d2, (X - (x1 + t * dx)) ** 2 + (Y - (y1 + t * dy)) ** 2)
    return d2 <= half * half


TORSO_POLY = flatten(TORSO)


def team_shapes(style):
    """`Jersey` (Jersey.tsx l. 17-54), en el orden en que pinta."""
    base, sec, pat = style["base"], style["secondary"], style["pattern"]
    shapes = [("fill", TORSO_POLY, base, 1.0), ("stroke", TORSO_POLY, "#000000", 0.18, 1.0)]
    if pat == "band":
        shapes.append(("fill", rect(14, 24, 20, 6), sec, 1.0))
    elif pat == "stripes":
        for y in (18, 26, 34):
            shapes.append(("fill", rect(14, y, 20, 3), sec, 1.0))
    elif pat == "panels":
        shapes += [("fill", flatten(PANEL_L), sec, 1.0), ("fill", flatten(PANEL_R), sec, 1.0)]
    elif pat == "shoulders":
        shapes += [("fill", flatten(SHOULDER_L), sec, 1.0), ("fill", flatten(SHOULDER_R), sec, 1.0)]
    shapes.append(("fill", flatten(COLLAR), style["accent"], 0.85))
    return shapes


def leader_shapes(spec):
    """`LeaderJersey` (Jersey.tsx l. 92-119)."""
    shapes = [
        ("fill", TORSO_POLY, spec["base"], 1.0),
        ("stroke", TORSO_POLY, "#000000", 0.35, 1.5),
    ]
    if spec["pattern"] == "band":
        shapes.append(("fill", rect(14, 25, 20, 7), spec["mark"], 1.0))
    if spec["pattern"] == "dots":
        for cx, cy in DOTS:
            shapes.append(("circle", (cx, cy, 3.4), spec["mark"], 1.0))
    return shapes


def champion_shapes(torso, star):
    """El `ChampionMark` provisional (Jersey.tsx l. 162-163), sin la bandera, que va fuera del SVG."""
    return [
        ("fill", TORSO_POLY, torso, 1.0),
        ("stroke", TORSO_POLY, "#000000", 0.35, 1.5),
        ("fill", flatten(STAR), star, 1.0),
    ]


def band_h(colors, y0=22.0, h=2.0):
    return [("fill", rect(14, y0 + i * h, 20, h), c, 1.0) for i, c in enumerate(colors)]


def band_v(colors, x0=19.0, w=2.0):
    return [("fill", rect(x0 + i * w, 18, w, 22), c, 1.0) for i, c in enumerate(colors)]


def variant_shapes(body, stripes):
    return [("fill", TORSO_POLY, body, 1.0), ("stroke", TORSO_POLY, "#000000", 0.35, 1.5)] + stripes


def render(shapes, size, bg="#ffffff"):
    """El maillot a `size` px: supermuestreo, mezcla en sRGB codificado y media por píxel."""
    k = 12 if size <= 32 else 4
    n = size * k
    u = (np.arange(n) + 0.5) / k * (48.0 / size)
    X, Y = np.meshgrid(u, u)
    img = np.ones((n, n, 3)) * hex_rgb(bg)
    cov = np.zeros((n, n), bool)
    for sh in shapes:
        if sh[0] == "fill":
            mask = inside(sh[1], X, Y)
            if sh[1] is TORSO_POLY:
                cov |= mask
            col, a = hex_rgb(sh[2]), sh[3]
        elif sh[0] == "stroke":
            mask = near_outline(sh[1], X, Y, sh[4] / 2)
            cov |= mask
            col, a = hex_rgb(sh[2]), sh[3]
        else:
            cx, cy, r = sh[1]
            mask = (X - cx) ** 2 + (Y - cy) ** 2 <= r * r
            col, a = hex_rgb(sh[2]), sh[3]
        img[mask] = img[mask] * (1 - a) + col * a
    img = img.reshape(size, k, size, k, 3).mean(axis=(1, 3))
    cov = cov.reshape(size, k, size, k).mean(axis=(1, 3))
    return img, cov


class Drawn:
    """Un maillot dibujado a un tamaño, con su CIELAB en cada vista."""

    def __init__(self, shapes, size):
        img, self.cov = render(shapes, size)
        self.lab = {v: lab_of_srgb(img, v).reshape(-1, 3) for v in VIEWS}
        self.w = self.cov.reshape(-1)


def drawn_distance(a, b, view):
    w = np.maximum(a.w, b.w)
    d = colour.delta_E(a.lab[view], b.lab[view], method="CIE 2000")
    return float((d * w).sum() / w.sum())


# ------------------------------------------------------------------------------------- la medida


def pairs_below(items, view, thr):
    return [
        (a, b)
        for a, b in itertools.combinations(items, 2)
        if a["style"]["pattern"] == b["style"]["pattern"]
        and de(a["style"]["base"], b["style"]["base"], view) < thr
    ]


def look(style):
    """Lo que se ve: base, patrón y, si el patrón se pinta, el secundario."""
    if style["pattern"] == "solid":
        return (style["base"], "solid", None)
    return (style["base"], style["pattern"], style["secondary"])


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--repo", type=Path)
    ap.add_argument("--mundo", type=Path)
    ap.add_argument("--json", type=Path)
    ap.add_argument("--carrera", default="race-france")
    ap.add_argument("--generador", type=Path, help="escribe el generador del mundo y sale")
    args = ap.parse_args()
    if args.generador:
        args.generador.write_text(GENERADOR_MJS, encoding="utf-8")
        print(f"generador escrito en {args.generador}")
        return
    if args.repo is None or args.mundo is None:
        ap.error("--repo y --mundo son obligatorios")

    src = read_sources(args.repo)
    world = json.loads(args.mundo.read_text(encoding="utf-8"))
    colors, patterns = src["colors"], src["patterns"]
    names = src["color_names"]
    out = {"fuentes": src}
    p = print

    # 0. El cotejo del port con la web.
    if world["jerseyColors"] != colors or world["jerseyPatterns"] != patterns:
        sys.exit("la paleta del mundo no es la del repositorio")
    bad = 0
    for t in world["teams"]:
        mine = jersey_style(t["jerseySeed"], colors, patterns)
        bad += mine != t["style"]
        for i, c in enumerate(t["candidates"]):
            bad += jersey_style(f"{t['id']}:jersey:{i}", colors, patterns) != c
    total = len(world["teams"]) * 12
    p(f"# Cotejo de jerseyStyle con la web: {total - bad} de {total} iguales")
    if bad:
        sys.exit("el port de jerseyStyle no coincide")

    # 1. La paleta.
    p("\n# 1. Paleta JERSEY_COLORS: pares de 91 con ΔE00 < 10 y < 20")
    pal = {}
    for v in VIEWS:
        ds = [(de(a, b, v), a, b) for a, b in itertools.combinations(colors, 2)]
        below10 = sorted(x for x in ds if x[0] < 10)
        below20 = [x for x in ds if x[0] < 20]
        pal[v] = {
            "lt10": len(below10),
            "lt20": len(below20),
            "min": min(ds),
            "pares_lt10": [(round(d, 1), names[a], names[b]) for d, a, b in below10],
        }
        p(f"  {VIEW_NAME[v]:13s} <10: {len(below10):2d}  <20: {len(below20):2d}  mínimo {min(ds)[0]:.1f} ({names[min(ds)[1]]}/{names[min(ds)[2]]})")
        for d, a, b in below10:
            p(f"      {d:5.1f}  {names[a]}/{names[b]}")
    out["paleta"] = pal
    p("  matriz normal (fila, columna en el orden de JERSEY_COLORS):")
    for a in colors:
        p("   " + f"{names[a]:22s}" + " ".join(f"{de(a, b, 'normal'):5.1f}" for b in colors))

    # 2. El mundo.
    teams = world["teams"]
    by_id = {t["id"]: t for t in teams}
    p(f"\n# 2. El mundo: {len(teams)} equipos, semilla {world['generatedWith']['worldSeed']}")
    from collections import Counter

    divs = Counter(t["division"] for t in teams)
    p(f"  divisiones: {dict(divs)}")
    p(f"  patrones: {dict(Counter(t['style']['pattern'] for t in teams))}")
    p(f"  bases: {dict((names[c], n) for c, n in Counter(t['style']['base'] for t in teams).most_common())}")
    same = [t for t in teams if t["style"]["secondary"] == t["style"]["base"]]
    hidden = [t for t in same if t["style"]["pattern"] != "solid"]
    p(f"  secundario igual a la base tras el re-sorteo: {len(same)} (con patrón que no se ve: {len(hidden)})")
    looks = Counter(look(t["style"]) for t in teams)
    twins = sum(n for n in looks.values() if n > 1)
    bp = Counter((t["style"]["base"], t["style"]["pattern"]) for t in teams)
    p(f"  maillots idénticos: {twins} equipos en {sum(1 for n in looks.values() if n > 1)} grupos")
    p(f"  combinaciones base y patrón usadas: {len(bp)} de {len(colors) * len(patterns)}; equipos que comparten la suya con otro: {sum(n for n in bp.values() if n > 1)}")
    cand_looks = [len({(c["base"], c["pattern"]) for c in [t["style"]] + t["candidates"]}) for t in teams]
    p(f"  las 12 candidatas de TeamManager: {statistics.mean(cand_looks):.1f} combinaciones base y patrón distintas de media (mín. {min(cand_looks)}, máx. {max(cand_looks)})")
    out["mundo"] = {
        "equipos": len(teams),
        "divisiones": divs,
        "patrones": Counter(t["style"]["pattern"] for t in teams),
        "secundario_igual": len(same),
        "patron_invisible": len(hidden),
        "identicos": twins,
        "combinaciones_usadas": len(bp),
    }
    st = world["seedIdentityTest"]
    p(f"  la semilla como identidad: antes {st['before']}, después {st['after']}; con la semilla vieja: {st['teamsWithOldSeedAfterTick']}")

    # 2b. La equipación no se guarda: sale de la semilla y del orden de la paleta (pickFrom).
    def repaint(cols, pats):
        nb = npat = nall = 0
        for t in teams:
            a, b = t["style"], jersey_style(t["jerseySeed"], cols, pats)
            nb += a["base"] != b["base"]
            npat += a["pattern"] != b["pattern"]
            nall += a != b
        return nb, npat, nall

    out["repintado"] = {}
    for label, cols, pats in (
        ("un color más al final de JERSEY_COLORS", colors + ["#123456"], patterns),
        ("un patrón más al final de JERSEY_PATTERNS", colors, patterns + ["nuevo"]),
        ("un color menos (el último)", colors[:-1], patterns),
    ):
        nb, npat, nall = repaint(cols, pats)
        out["repintado"][label] = (nb, npat, nall)
        p(f"  con {label}: cambian la base de {nb}, el patrón de {npat} y algo de {nall} de {len(teams)} equipos")

    # 3. Los pelotones.
    p("\n# 3. Pelotones: pares de equipos indistinguibles (mismo patrón y ΔE00 de la base < 10)")
    races = world["races"]
    ref = next(r for r in races if r["id"] == args.carrera)
    peloton = {}
    for v in VIEWS:
        counts = []
        for r in races:
            items = [by_id[i] for i in r["teamIds"]]
            counts.append(len(pairs_below(items, v, 10)))
        items = [by_id[i] for i in ref["teamIds"]]
        ref_pairs = pairs_below(items, v, 10)
        involved = {t["id"] for pr in ref_pairs for t in pr}
        peloton[v] = {
            "carreras_con_par": sum(1 for c in counts if c > 0),
            "media": statistics.mean(counts),
            "mediana": statistics.median(counts),
            "max": max(counts),
            "ref_pares": len(ref_pairs),
            "ref_equipos_afectados": len(involved),
            "ref_lista": [
                (a["name"], b["name"], a["style"]["pattern"], names[a["style"]["base"]], names[b["style"]["base"]], round(de(a["style"]["base"], b["style"]["base"], v), 1))
                for a, b in ref_pairs
            ],
        }
        p(f"  {VIEW_NAME[v]:13s} carreras con algún par: {peloton[v]['carreras_con_par']} de {len(races)}; pares por carrera: media {peloton[v]['media']:.1f}, mediana {peloton[v]['mediana']}, máx. {peloton[v]['max']}; {ref['id']} ({len(ref['teamIds'])} equipos): {len(ref_pairs)} pares, {len(involved)} equipos")
    p(f"  pares de {ref['id']} en visión normal y en deuteranopía:")
    for v in ("normal", "deutan"):
        for x in peloton[v]["ref_lista"]:
            p(f"    [{VIEW_NAME[v]}] {x}")
    ident = [
        sum(1 for a, b in itertools.combinations([by_id[i] for i in r["teamIds"]], 2) if look(a["style"]) == look(b["style"]))
        for r in races
    ]
    p(f"  pares de maillots idénticos en un pelotón: {sum(1 for c in ident if c)} carreras con alguno; máx. {max(ident)}")
    out["pelotones"] = peloton
    out["carrera_ref"] = {"id": ref["id"], "equipos": len(ref["teamIds"])}

    # 4. Los líderes y el campeón.
    L = src["leaders"]
    p("\n# 4. Líderes y campeón")
    trio = {}
    for v in VIEWS:
        trio[v] = {
            "gc_points": de(L["gc"]["base"], L["points"]["base"], v),
            "gc_kom": de(L["gc"]["base"], L["kom"]["base"], v),
            "points_kom": de(L["points"]["base"], L["kom"]["base"], v),
            "banda": de(L["points"]["mark"], L["points"]["base"], v),
            "lunares": de(L["kom"]["mark"], L["kom"]["base"], v),
        }
        p(f"  {VIEW_NAME[v]:13s} amarillo/verde {trio[v]['gc_points']:5.1f}  amarillo/azul {trio[v]['gc_kom']:5.1f}  verde/azul {trio[v]['points_kom']:5.1f}  banda/verde {trio[v]['banda']:5.1f}  lunar/azul {trio[v]['lunares']:5.1f}")
    p(f"  contraste WCAG de la marca: banda {wcag(L['points']['mark'], L['points']['base']):.2f}, lunares {wcag(L['kom']['mark'], L['kom']['base']):.2f}")
    look_alikes = {}
    for v in VIEWS:
        gc = [t for t in teams if t["style"]["pattern"] == "solid" and de(t["style"]["base"], L["gc"]["base"], v) < 10]
        pts = [t for t in teams if t["style"]["pattern"] == "band" and de(t["style"]["base"], L["points"]["base"], v) < 10]
        kom = [t for t in teams if de(t["style"]["base"], L["kom"]["base"], v) < 10]
        refset = set(ref["teamIds"])
        look_alikes[v] = {
            "gc_liso": (len(gc), sum(t["id"] in refset for t in gc)),
            "verde_banda": (len(pts), sum(t["id"] in refset for t in pts)),
            "azul_base": (len(kom), sum(t["id"] in refset for t in kom)),
        }
        p(f"  {VIEW_NAME[v]:13s} equipos lisos como el amarillo: {look_alikes[v]['gc_liso']}; con banda y base como el verde: {look_alikes[v]['verde_banda']}; con base como el azul: {look_alikes[v]['azul_base']} (mundo, {ref['id']})")
    ct, cs_ = src["champion_torso"], src["champion_star"]
    champ = {
        v: {
            "torso_blanco": de(ct, "#ffffff", v),
            "torso_body": de(ct, src["body"], v),
            "estrella_torso": de(cs_, ct, v),
            "torso_equipo_min": min(de(ct, c, v) for c in colors),
        }
        for v in VIEWS
    }
    for v in VIEWS:
        c = champ[v]
        p(f"  {VIEW_NAME[v]:13s} ChampionMark: torso/blanco {c['torso_blanco']:4.1f}, torso/body {c['torso_body']:4.1f}, estrella/torso {c['estrella_torso']:5.1f}, torso/equipación más cercana {c['torso_equipo_min']:5.1f}")
    p(f"  la estrella {cs_} es el color de JERSEY_COLORS «{names.get(cs_, '?')}»: {cs_ in colors}")
    out["lideres"] = {"trio": trio, "parecidos": look_alikes, "campeon": champ}

    # 5. Los fondos.
    bgs = {"blanco": "#ffffff", "body": src["body"]}
    bgs.update({k: oklch_hex(*v) for k, v in TAILWIND_OKLCH.items()})
    p(f"\n# 5. Fondos: {bgs}")
    fondos = {}
    for name, bg in bgs.items():
        fondos[name] = {}
        for v in VIEWS:
            ds = sorted((de(c, bg, v), names[c]) for c in colors)
            fondos[name][v] = {
                "lt10": sum(d < 10 for d, _ in ds),
                "lt20": sum(d < 20 for d, _ in ds),
                "peor": (round(ds[0][0], 1), ds[0][1]),
            }
        p(f"  {name:10s} " + "  ".join(f"{VIEW_NAME[v][:6]} <10:{fondos[name][v]['lt10']} <20:{fondos[name][v]['lt20']} peor {fondos[name][v]['peor']}" for v in VIEWS))
    out["fondos"] = {"colores": bgs, "medida": fondos}

    # 6. Los tamaños (cálculo de las coordenadas del SVG, no medida en pantalla).
    p("\n# 6. Lo que mide cada elemento en px (viewBox de 48 unidades)")
    elems = {
        "banda de equipo (6 u)": 6,
        "raya de stripes (3 u)": 3,
        "panel (6 u de ancho)": 6,
        "banda del verde (7 u)": 7,
        "lunar (6,8 u de diámetro)": 6.8,
        "estrella (16,8 u de ancho)": 16.8,
        "filete de equipo (1 u)": 1,
        "filete de líder (1,5 u)": 1.5,
        "banda de la UCI de la variante (2 u)": 2,
    }
    for s in (12, 13, 14, 15, 16, 18, 26, 34, 72, 96):
        p(f"  {s:3d} px: " + "; ".join(f"{k} {u * s / 48:.2f}" for k, u in elems.items()))

    # 7. Las variantes del dueño, dibujadas.
    brand5 = [src["brand"][k] for k in ("brand-navy-dark", "brand-navy", "brand-cyan", "brand-cyan-light", "brand-gold")]
    variants = {
        "V0 UCI de referencia (blanco, horizontal, su orden)": variant_shapes("#ffffff", band_h(UCI)),
        "V1 otro orden (invertido), horizontal": variant_shapes("#ffffff", band_h(UCI[::-1])),
        "V2 en vertical, su orden": variant_shapes("#ffffff", band_v(UCI)),
        "V3 en vertical y en otro orden": variant_shapes("#ffffff", band_v(UCI[::-1])),
        "V4 otra paleta (la de marca del juego)": variant_shapes("#ffffff", band_h(brand5)),
        "V5 colores UCI sobre fondo oscuro (#1e293b)": variant_shapes("#1e293b", band_h(UCI)),
        "V6 colores UCI sobre fondo dorado (#d99400)": variant_shapes(src["brand"]["brand-gold"], band_h(UCI)),
        "CM ChampionMark de hoy (estrella)": champion_shapes(ct, cs_),
    }
    family = {
        "V0": {"band", "stripes"},
        "V1": {"band", "stripes"},
        "V2": {"panels"},
        "V3": {"panels"},
        "V4": {"band", "stripes"},
        "V5": {"band", "stripes"},
        "V6": {"band", "stripes"},
        "CM": set(),
    }
    sizes = (13, 16, 28, 72)
    team_looks = {}
    for t in teams:
        team_looks.setdefault(look(t["style"]), []).append(t)
    p(f"\n# 7. Variantes del dueño frente a las {len(teams)} equipaciones ({len(team_looks)} aspectos distintos) y a {ref['id']}")
    drawn_team = {s: {lk: Drawn(team_shapes(ts[0]["style"]), s) for lk, ts in team_looks.items()} for s in sizes}
    drawn_lead = {s: {k: Drawn(leader_shapes(L[k]), s) for k in ("gc", "points", "kom")} for s in sizes}
    refset = set(ref["teamIds"])
    var = {}
    for vname, shapes in variants.items():
        code = vname[:2]
        fam = family[code]
        var[vname] = {
            "figura_mundo": sum(t["style"]["pattern"] in fam for t in teams),
            "figura_ref": sum(t["style"]["pattern"] in fam for t in teams if t["id"] in refset),
        }
        p(f"  {vname}: comparten figura {var[vname]['figura_mundo']} equipos del mundo y {var[vname]['figura_ref']} de {ref['id']}")
        for s in sizes:
            dv = Drawn(shapes, s)
            ref0 = Drawn(variants["V0 UCI de referencia (blanco, horizontal, su orden)"], s)
            row = {}
            for v in VIEWS:
                dist = {lk: drawn_distance(dv, d, v) for lk, d in drawn_team[s].items()}
                world10 = sum(len(team_looks[lk]) for lk, d in dist.items() if d < 10)
                world20 = sum(len(team_looks[lk]) for lk, d in dist.items() if d < 20)
                ref10 = sum(1 for t in teams if t["id"] in refset and dist[look(t["style"])] < 10)
                ref20 = sum(1 for t in teams if t["id"] in refset and dist[look(t["style"])] < 20)
                row[v] = {
                    "a_V0": drawn_distance(dv, ref0, v),
                    "equipo_min": min(dist.values()),
                    "mundo_lt10": world10,
                    "mundo_lt20": world20,
                    "ref_lt10": ref10,
                    "ref_lt20": ref20,
                    "lider_min": min(drawn_distance(dv, d, v) for d in drawn_lead[s].values()),
                }
            var[vname][s] = row
            p(f"    {s:2d} px " + " | ".join(f"{VIEW_NAME[v][:6]} a V0 {row[v]['a_V0']:4.1f} eq.min {row[v]['equipo_min']:4.1f} <10 {row[v]['mundo_lt10']}/{row[v]['ref_lt10']} <20 {row[v]['mundo_lt20']}/{row[v]['ref_lt20']} líder {row[v]['lider_min']:4.1f}" for v in VIEWS))
    out["variantes"] = var

    # 7b. El orden de las cinco bandas: las 119 permutaciones frente al orden de la UCI.
    p("\n# 7b. Las 119 órdenes distintos de los cinco colores UCI, dibujados, frente al orden UCI")
    perm = {}
    for s in sizes:
        base = Drawn(variants["V0 UCI de referencia (blanco, horizontal, su orden)"], s)
        perm[s] = {}
        for v in ("normal", "deutan", "gris"):
            ds = []
            for order in itertools.permutations(range(5)):
                if order == (0, 1, 2, 3, 4):
                    continue
                d = Drawn(variant_shapes("#ffffff", band_h([UCI[i] for i in order])), s)
                ds.append(drawn_distance(base, d, v))
            perm[s][v] = (min(ds), statistics.median(ds), max(ds))
        p(f"  {s:2d} px: " + "; ".join(f"{VIEW_NAME[v]} mín {perm[s][v][0]:.1f} mediana {perm[s][v][1]:.1f} máx {perm[s][v][2]:.1f}" for v in perm[s]))
    out["permutaciones"] = perm

    # 7c. Equipo contra equipo, dibujados, en el pelotón de referencia.
    p(f"\n# 7c. {ref['id']}: pares de equipos con distancia dibujada < 10 (todos los colores y el patrón)")
    items = [by_id[i] for i in ref["teamIds"]]
    drawn_pairs = {}
    for s in (13, 16, 28):
        drawn_pairs[s] = {}
        for v in VIEWS:
            n = 0
            for a, b in itertools.combinations(items, 2):
                if drawn_distance(drawn_team[s][look(a["style"])], drawn_team[s][look(b["style"])], v) < 10:
                    n += 1
            drawn_pairs[s][v] = n
        p(f"  {s:2d} px: " + ", ".join(f"{VIEW_NAME[v]} {drawn_pairs[s][v]}" for v in VIEWS) + f" (de {len(items) * (len(items) - 1) // 2})")
    out["pares_dibujados_ref"] = drawn_pairs

    # 7d. Los líderes dibujados frente a la equipación más parecida del mundo.
    p("\n# 7d. Cada maillot de líder frente a la equipación dibujada más parecida del mundo")
    lead = {}
    for s in (13, 16):
        lead[s] = {}
        for k in ("gc", "points", "kom"):
            lead[s][k] = {}
            for v in VIEWS:
                ds = sorted((drawn_distance(drawn_lead[s][k], d, v), lk) for lk, d in drawn_team[s].items())
                lead[s][k][v] = (round(ds[0][0], 1), ds[0][1], sum(len(team_looks[lk]) for d, lk in ds if d < 10))
            p(f"  {s:2d} px {k:6s} " + " | ".join(f"{VIEW_NAME[v][:6]} {lead[s][k][v][0]} ({names[lead[s][k][v][1][0]]} {lead[s][k][v][1][1]}) <10: {lead[s][k][v][2]}" for v in VIEWS))
    out["lideres_dibujados"] = lead

    if args.json:
        args.json.write_text(json.dumps(out, indent=1, default=lambda o: dict(o) if isinstance(o, Counter) else str(o)), encoding="utf-8")
        p(f"\n(json en {args.json})")


GENERADOR_MJS = r'''#!/usr/bin/env node
/* global process, console */
/**
 * E3, mapa 03: EL MUNDO DE LA MEDIDA DE LOS MAILLOTS. Genera con el código del juego un mundo recién
 * creado y vuelca a JSON lo que necesita `03-maillots-medida.py`:
 *
 *   1. PGlite servida por socket con todas las migraciones (como `packages/db/src/testDb.ts`).
 *   2. La génesis: `runTick` con `forceDays: 0` y `GENESIS_WORLD_SEED` (como el arranque de la API),
 *      que llama a `seedWorld` (`packages/db/src/world.ts` l. 459).
 *   3. Los equipos con su `jersey_seed` y su equipación, calculada con `jerseyStyle` de
 *      `apps/web/src/components/visuals.ts`, transpilado tal cual con el TypeScript del clon.
 *   4. El pelotón de cada carrera de la temporada 0 que no es campeonato nacional, con
 *      `predictStartlist` (`packages/db/src/calendarRun.ts` l. 785), la misma elección que hará el tick.
 *   5. Los campeonatos nacionales del calendario (`SEASON_CALENDAR`), para saber cuándo hay campeones.
 *   6. La prueba de la semilla como identidad: cambiar el `jersey_seed` de un equipo con dueño (lo que
 *      hace `PUT /api/teams/me`) y volver a pasar el tick, para ver si `seedWorld` crea otro equipo.
 *
 * Uso, desde un clon compilado (`pnpm install --frozen-lockfile && pnpm build`):
 *   node mundo.mjs --root <clon> --out <carpeta>
 * Deja `<carpeta>/mundo03.json` y `<carpeta>/visuals.mjs` (el transpilado). Unos 30 s.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i < 0 ? fallback : (process.argv[i + 1] ?? fallback)
}
const ROOT = resolve(arg('--root', process.cwd()))
const OUT = resolve(arg('--out', 'mapa03'))
mkdirSync(OUT, { recursive: true })
process.env.DB_POOL_MAX = '1'

const fromRoot = (p) => pathToFileURL(resolve(ROOT, p)).href
const requireDb = createRequire(resolve(ROOT, 'packages/db/package.json'))
const load = async (name) => import(pathToFileURL(requireDb.resolve(name)).href)
const { PGlite } = await load('@electric-sql/pglite')
const { citext } = await load('@electric-sql/pglite/contrib/citext')
const { PGLiteSocketServer } = await load('@electric-sql/pglite-socket')
const db = await import(fromRoot('packages/db/dist/index.js'))
const engine = await import(fromRoot('packages/engine/dist/index.js'))

// visuals.ts tal cual, transpilado con el TypeScript del clon: la equipación sale del código de la web.
const ts = createRequire(resolve(ROOT, 'package.json'))('typescript')
const visualsSrc = readFileSync(resolve(ROOT, 'apps/web/src/components/visuals.ts'), 'utf8')
const visualsJs = ts.transpileModule(visualsSrc, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
writeFileSync(resolve(OUT, 'visuals.mjs'), visualsJs)
const visuals = await import(pathToFileURL(resolve(OUT, 'visuals.mjs')).href)

const log = (msg) => process.stderr.write(`${msg}\n`)

async function freePort() {
  return new Promise((ok, ko) => {
    const srv = createServer()
    srv.once('error', ko)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => ok(port))
    })
  })
}

const pg = await PGlite.create({ extensions: { citext } })
const port = await freePort()
const socket = new PGLiteSocketServer({ db: pg, port, host: '127.0.0.1' })
await socket.start()
const url = `postgres://postgres@127.0.0.1:${port}/postgres`

const tick = () =>
  db.runTick(url, {
    now: new Date(),
    msPerGameDay: 6 * 60 * 60 * 1000,
    worldSeed: db.GENESIS_WORLD_SEED,
    engineVersion: engine.ENGINE_VERSION,
    forceDays: 0,
    timelineRecord: 'off',
  })

log('migraciones')
await db.runMigrations(url)
log('génesis')
await tick()

async function withDb(fn) {
  const { db: database, client } = db.createDb(url)
  try {
    return await fn(database, client)
  } finally {
    await client.end({ timeout: 5 })
  }
}

const out = await withDb(async (database, client) => {
  const [world] = await client`select id, world_seed from worlds`
  const teamRows = await client`
    select id, name, country, division, budget, jersey_seed from teams order by division, jersey_seed`
  const teams = teamRows.map((t) => ({
    id: t.id,
    name: t.name,
    country: t.country,
    division: t.division,
    budget: t.budget,
    jerseySeed: t.jersey_seed,
    style: visuals.jerseyStyle(t.jersey_seed),
    // las once candidatas de TeamManager.tsx l. 23-26 (dependen del id, que es aleatorio)
    candidates: Array.from({ length: 11 }, (_, i) => visuals.jerseyStyle(`${t.id}:jersey:${i}`)),
  }))

  log('pelotones de la temporada 0')
  const races = []
  const nationals = []
  for (const race of engine.SEASON_CALENDAR) {
    if (race.championshipCountry != null) {
      nationals.push({
        id: race.id,
        startDay: race.startDay,
        country: race.championshipCountry,
        category: race.championshipCategory ?? 'elite',
        discipline: race.id.endsWith('-itt') ? 'itt' : 'road',
      })
      continue
    }
    const sl = await db.predictStartlist(database, null, world.id, race, 0)
    races.push({
      id: race.id,
      name: race.name,
      raceClass: race.raceClass,
      format: race.format,
      startDay: race.startDay,
      stages: race.stages.length,
      region: race.region ?? null,
      country: race.country ?? null,
      frozen: sl.frozen,
      teamIds: sl.teams.map((t) => t.id),
      freeAgents: sl.freeAgents.length,
    })
  }

  // Los corredores con equipo de cada país grande: el pelotón de un nacional mezcla equipos.
  const byCountry = await client`
    select r.country, count(*)::int as riders, count(distinct r.team_id)::int as teams
    from riders r where r.team_id is not null group by r.country order by riders desc limit 12`

  log('la semilla como identidad')
  const count = async () => {
    const [n] = await client`select (select count(*)::int from teams) as teams,
      (select count(*)::int from riders) as riders`
    return n
  }
  const before = await count()
  const [victim] = await client`
    select id, name, jersey_seed from teams where division = 'CON' order by jersey_seed limit 1`
  const [user] = await client`
    insert into users (email, name) values ('manager03@example.com', 'Manager 03') returning id`
  const newSeed = `${victim.id}:jersey:3`
  await client`update teams set owner_user_id = ${user.id}, jersey_seed = ${newSeed} where id = ${victim.id}`
  return { world, teams, races, nationals, byCountry, before, victim, newSeed }
})

await tick()
const after = await withDb(async (_database, client) => {
  const [n] = await client`select (select count(*)::int from teams) as teams,
      (select count(*)::int from riders) as riders`
  const clones = await client`
    select t.id, t.name, t.owner_user_id, (select count(*)::int from riders r where r.team_id = t.id) as riders
    from teams t where t.jersey_seed = ${out.victim.jersey_seed}`
  return { counts: n, clones }
})

const result = {
  generatedWith: {
    root: ROOT,
    engineVersion: engine.ENGINE_VERSION,
    worldSeed: out.world.world_seed,
    currentDay: 0,
  },
  jerseyColors: [...visuals.JERSEY_COLORS],
  jerseyPatterns: [...visuals.JERSEY_PATTERNS],
  teams: out.teams,
  races: out.races,
  nationals: out.nationals,
  ridersByCountry: out.byCountry,
  seedIdentityTest: {
    before: out.before,
    changedTeam: { id: out.victim.id, name: out.victim.name, oldSeed: out.victim.jersey_seed },
    newSeed: out.newSeed,
    after: after.counts,
    teamsWithOldSeedAfterTick: after.clones,
  },
}
writeFileSync(resolve(OUT, 'mundo03.json'), JSON.stringify(result, null, 1))
log(`hecho: ${out.teams.length} equipos, ${out.races.length} carreras, ${out.nationals.length} nacionales`)
await socket.stop()
await pg.close()
process.exit(0)
'''

if __name__ == "__main__":
    main()
