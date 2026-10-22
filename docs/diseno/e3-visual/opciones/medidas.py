#!/usr/bin/env python3
"""E3, la página de opciones: las medidas que enseña `opciones/index.html`, y sus dibujos.

Este script es la única fuente de los colores y de los dibujos de la página: los escribe, con las
cifras, en el bloque `<script type="text/plain" id="datos">` de `index.html`, y la página solo los
pinta. Mide únicamente lo que la página enseña:

  1. La razón de contraste WCAG 2.x de cada pareja de texto y fondo de la pantalla tipo, en las
     cuatro paletas (un color con transparencia se compone antes sobre su fondo, en sRGB, como el
     navegador).
  2. Las matrices de los filtros `feColorMatrix` del conmutador de visión: Machado, Oliveira y
     Fernandes (2009), severidad 1, de `colour.blindness.matrix_cvd_Machado2009` (colour-science
     0.4.7), y la luminancia de Rec. 709 para los grises.
  3. Los maillots, dibujados en SVG en la rejilla de 48 u de `TORSO` (apps/web/src/components/
     Jersey.tsx l. 10-11) y pintados en Chromium (Playwright de /opt/node22, navegadores de
     /opt/pw-browsers) con densidad 1. La distancia entre dos dibujos es la del mapa 03
     (`drawn_distance` de mapas/03-maillots-medida.py): la media de ΔE00 píxel a píxel, pesada por la
     cobertura, en cinco visiones (normal, las tres dicromacias en RGB lineal y recortadas, y grises).
     Desde lo que decidió el dueño el 21-10-2026 (borrador/00-decisiones.md, D-00b), toda cifra que la
     página enseña es a 28 px, el mínimo de un maillot:
     - El vocabulario que eligió (D-00e; borrador/08-equipacion.md §8.1-8.3): sus diseños con la regla
       de contraste y la reserva, cotejados con los de medir28.json, y un pelotón de ejemplo de 22 sin
       maillot repetido (voraz: con los tres líderes de §9.7 ya puestos, cada vez el diseño permitido
       más lejano de los ya puestos en las cuatro visiones de color) con sus pares por debajo de 10.
     - Las señales que eligió (D-00d; borrador/09-campeon.md §9.1): el nacional que viste su bandera
       (la de flag-icons, la de la web) con y sin la estrella dorada, y el mundial blanco con la
       estrella de arcoíris y su gemela de oro; y las alternativas que no eligió. De cada una, la
       distancia a la marca de la UCI (V0 del mapa 03 §7.2) y al maillot permitido más cercano.
       Las que ya midió el redactor de §8 y §9 (medir28.json) se toman de allí y se cotejan.
     - La estrella del nacional caso a caso y sus dos letras (D-00f; 09-campeon.md §9.5): el sitio y el
       relleno de cada uno de los 133 países salen de medir-nacional2.json (--nacional2), que también da
       su equipación más cercana y sus gemelas; aquí se dibujan con la bandera de la web, se pintan los
       133 a 28 px y se cotejan con esas cifras, y se escribe la hoja de revisión de la página. La
       reserva de D-00h son los 12 maillots que esa medida deja a menos de 10 de algún nacional.
     - El maillot en grande (D-00g; 08-equipacion.md §8.10): delante, detrás y culote a 160 y a 320 px
       con las zonas del patrocinador. Solo se dibuja.
     - De los cuatro vocabularios de las propuestas, que el dueño no eligió: su pelotón de ejemplo
       (el de antes, voraz a 13 px con los líderes de hoy) y sus pares por debajo de 10 a 28 px.

Uso:
  <scratchpad>/venv/bin/python -I -B medidas.py --banderas <flag-icons/flags/4x3> \
      --medir28 <scratchpad>/redactor-L2/medir28.json --nacional2 <scratchpad>/redactor-L2/medir-nacional2.json \
      [--html index.html] [--trabajo <dir>]
  (flag-icons está en apps/web/node_modules de un clon con las dependencias instaladas)
"""

import argparse
import json
import math
import os
import re
import subprocess
import sys
import tempfile
import warnings
from datetime import date
from pathlib import Path

warnings.filterwarnings("ignore")
import numpy as np  # noqa: E402
import colour  # noqa: E402

AQUI = Path(__file__).resolve().parent
VISIONES = ("normal", "protan", "deutan", "tritan", "gris")
COLOR4 = ("normal", "protan", "deutan", "tritan")
CS = colour.RGB_COLOURSPACES["sRGB"]
MACHADO = {
    "protan": colour.blindness.matrix_cvd_Machado2009("Protanomaly", 1),
    "deutan": colour.blindness.matrix_cvd_Machado2009("Deuteranomaly", 1),
    "tritan": colour.blindness.matrix_cvd_Machado2009("Tritanomaly", 1),
}
REC709 = np.array([0.2126, 0.7152, 0.0722])

# ------------------------------------------------------------------------------------- el color


def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)])


def color(v):
    """'#rrggbb' o '#rrggbb@alfa' -> (rgb, alfa)."""
    if "@" in v:
        h, a = v.split("@")
        return hex_rgb(h), float(a)
    return hex_rgb(v), 1.0


def css(v):
    rgb, a = color(v)
    if a == 1.0:
        return v
    r, g, b = (int(round(c * 255)) for c in rgb)
    return f"rgb({r} {g} {b} / {a:g})"


def to_linear(srgb):
    return colour.cctf_decoding(np.clip(srgb, 0, 1), function="sRGB")


def luminancia(rgb):
    return float(to_linear(rgb) @ REC709)


def wcag(fg, bg):
    """Razón WCAG 2.x de `fg` (que puede llevar alfa) sobre `bg` (opaco)."""
    f, a = color(fg)
    b, _ = color(bg)
    f = f * a + b * (1 - a)
    la, lb = sorted([luminancia(f), luminancia(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


def en_vision(lin, v):
    if v == "normal":
        return lin
    if v == "gris":
        y = lin @ REC709
        return np.stack([y, y, y], axis=-1)
    return np.clip(lin @ MACHADO[v].T, 0, 1)


def lab(srgb, v):
    xyz = colour.RGB_to_XYZ(en_vision(to_linear(srgb), v), CS, apply_cctf_decoding=False)
    return colour.XYZ_to_Lab(xyz, CS.whitepoint)


def de_colores(a, b, v):
    return float(colour.difference.delta_E_CIE2000(lab(hex_rgb(a), v), lab(hex_rgb(b), v)))


# ------------------------------------------------------------------------------------ las paletas

# Cada token de la pantalla tipo, con el valor de la propuesta; lo que la propuesta no da va en
# `aprox` y la página lo dice. Un valor con «@» lleva alfa.
TEL_A = {
    "hdr-bg": "#123a5c", "hdr-ink": "#ffffff", "hdr-ink-2": "#ffffff@0.75",
    "tabs-bg": "#0b2740", "tabs-ink": "#ffffff@0.75", "tabs-ink-on": "#ffffff", "tabs-mark": "#e0a106",
    "canvas": "#eef2f6", "title-bg": "#eef2f6", "title-ink": "#10202f", "title-ink-2": "#435266",
    "title-rule": "#eef2f6",
    "panel-bg": "#ffffff", "panel-hdr-bg": "#ffffff", "panel-hdr-ink": "#10202f", "panel-rule": "#ffffff",
    "th-bg": "#ffffff", "th-ink": "#566579",
    "ink": "#10202f", "ink-2": "#435266", "ink-3": "#566579", "line": "#d8dee6", "link": "#0b6e8a",
    "btn-bg": "#0b6e8a", "btn-ink": "#ffffff", "btn-hov-bg": "#085a71", "btn-hov-ink": "#ffffff",
    "btn-dis-bg": "#e9edf2", "btn-dis-ink": "#6b7787", "btn-dis-line": "#e9edf2",
    "btn2-bg": "#ffffff", "btn2-ink": "#10202f", "btn2-line": "#7b8794",
    "warn-bg": "#fff3d6", "warn-ink": "#8f4e00", "skel": "#f5f7fa", "skel-ink": "#566579",
    "err-bg": "#fdeceb", "err-ink": "#b42318", "focus": "#1d4ed8",
}
SIS_A = {
    "hdr-bg": "#123a5c", "hdr-ink": "#ffffff", "hdr-ink-2": "#b4bfcf",
    "tabs-bg": "#0b2740", "tabs-ink": "#b4bfcf", "tabs-ink-on": "#ffffff", "tabs-mark": "#1499bb",
    "canvas": "#e8edf2", "title-bg": "#d99400", "title-ink": "#0f172b", "title-ink-2": "#0f172b",
    "title-rule": "#d99400",
    "panel-bg": "#ffffff", "panel-hdr-bg": "#006e8c", "panel-hdr-ink": "#ffffff", "panel-rule": "#006e8c",
    "th-bg": "#f1f5f9", "th-ink": "#536379",
    "ink": "#0f172b", "ink-2": "#536379", "ink-3": "#536379", "line": "#d6dee8", "link": "#006e8c",
    "btn-bg": "#123a5c", "btn-ink": "#ffffff", "btn-hov-bg": "#0b2740", "btn-hov-ink": "#ffffff",
    "btn-dis-bg": "#f1f5f9", "btn-dis-ink": "#536379", "btn-dis-line": "#d6dee8",
    "btn2-bg": "#ffffff", "btn2-ink": "#0f172b", "btn2-line": "#7d8da3",
    "warn-bg": "#fdf1d6", "warn-ink": "#8f3900", "skel": "#f1f5f9", "skel-ink": "#536379",
    "err-bg": "#fdeceb", "err-ink": "#b8000a", "focus": "#006e8c",
}
IDE_A = {
    "hdr-bg": "#14213d", "hdr-ink": "#ffffff", "hdr-ink-2": "#b9c4d6",
    "tabs-bg": "#2b3a55", "tabs-ink": "#b9c4d6", "tabs-ink-on": "#ffffff", "tabs-mark": "#e0a526",
    "canvas": "#eef1f5", "title-bg": "#e0a526", "title-ink": "#14213d", "title-ink-2": "#14213d",
    "title-rule": "#e0a526",
    "panel-bg": "#ffffff", "panel-hdr-bg": "#ffffff", "panel-hdr-ink": "#16202f", "panel-rule": "#ffffff",
    "th-bg": "#ffffff", "th-ink": "#566173",
    "ink": "#16202f", "ink-2": "#566173", "ink-3": "#566173", "line": "#d6dce4", "link": "#1c5aa6",
    "btn-bg": "#123a5c", "btn-ink": "#ffffff", "btn-hov-bg": "#0e2e4a", "btn-hov-ink": "#ffffff",
    "btn-dis-bg": "#ffffff", "btn-dis-ink": "#566173", "btn-dis-line": "#d6dce4",
    "btn2-bg": "#ffffff", "btn2-ink": "#16202f", "btn2-line": "#7b8596",
    "warn-bg": "#fdf0d9", "warn-ink": "#8a4b00", "skel": "#e3e8ef", "skel-ink": "#566173",
    "err-bg": "#fbe8e6", "err-ink": "#b3261e", "focus": "#1c5aa6",
}
SIS_C = dict(
    SIS_A,
    **{
        "hdr-bg": "#0f1d33", "tabs-mark": "#e8a200",
        "title-bg": "#0f1d33", "title-ink": "#ffffff", "title-ink-2": "#b4bfcf", "title-rule": "#e8a200",
        "panel-hdr-bg": "#0f1d33", "panel-hdr-ink": "#ffffff", "panel-rule": "#e8a200",
        "btn-bg": "#e8a200", "btn-ink": "#0f172b", "btn-hov-bg": "#f2b52a", "btn-hov-ink": "#0f172b",
    },
)
PALETAS = {
    "telefono-a": {
        "tokens": TEL_A, "radio": 8,
        "aprox": "la cabecera de tabla (sin fondo propio) y el botón secundario; el resto, de la tabla de §3.1",
    },
    "sistema-a": {
        "tokens": SIS_A, "radio": 8,
        "aprox": "el reloj y la pestaña inactiva en el #b4bfcf del ámbito oscuro, la línea bajo el título "
        "en ink y el esqueleto en surface-sunken; el resto, de §3.1 y §4",
    },
    "identidad-a": {
        "tokens": IDE_A, "radio": 12,
        "aprox": "las pestañas en night-2, la cabecera de tabla y el botón secundario; el resto, de §3.1 y §4",
    },
    "sistema-c": {
        "tokens": SIS_C, "radio": 8,
        "aprox": "la propuesta da el cromo #0f1d33, el botón #e8a200 (encima #f2b52a) y el filete dorado; "
        "la barra de página en cromo, el grosor del filete (3 px) y los demás tokens (los de sistema A) "
        "son aproximados",
    },
}
PARES = [
    ("cab", "Cabecera, «Cycling Star»", "hdr-ink", "hdr-bg", "texto"),
    ("reloj", "Cabecera, reloj del mundo", "hdr-ink-2", "hdr-bg", "texto"),
    ("pest", "Pestaña", "tabs-ink", "tabs-bg", "texto"),
    ("pest-on", "Pestaña activa", "tabs-ink-on", "tabs-bg", "texto"),
    ("titulo", "Título de página", "title-ink", "title-bg", "texto"),
    ("subtitulo", "Línea bajo el título", "title-ink-2", "title-bg", "texto"),
    ("panel", "Título de panel", "panel-hdr-ink", "panel-hdr-bg", "texto"),
    ("th", "Cabecera de tabla", "th-ink", "th-bg", "texto"),
    ("nombre", "Corredor y tiempo", "ink", "panel-bg", "texto"),
    ("equipo", "Equipo", "ink-2", "panel-bg", "texto"),
    ("puesto", "Puesto", "ink-3", "panel-bg", "texto"),
    ("enlace", "Enlace", "link", "panel-bg", "texto"),
    ("btn", "Botón", "btn-ink", "btn-bg", "texto"),
    ("btn-hov", "Botón, encima", "btn-hov-ink", "btn-hov-bg", "texto"),
    ("btn-dis", "Botón, deshabilitado", "btn-dis-ink", "btn-dis-bg", "exento"),
    ("btn2", "Botón secundario", "btn2-ink", "btn2-bg", "texto"),
    ("btn2-borde", "Borde del botón secundario", "btn2-line", "panel-bg", "grafico"),
    ("aviso", "Aviso", "warn-ink", "warn-bg", "texto"),
    ("carga", "Carga", "skel-ink", "panel-bg", "texto"),
    ("error", "Error", "err-ink", "err-bg", "texto"),
]

# ------------------------------------------------------------------------------------ el dibujo

TORSO = (
    "M16 8 L10 12 L7 20 L12 23 L14 18 L14 40 Q24 43 34 40 L34 18 L36 23 L41 20 L38 12 L32 8 "
    "Q24 12 16 8 Z"
)
COLLAR = "M20 8 Q24 12 28 8 L26 6 Q24 8 22 6 Z"
STAR = (
    "M24 19 L26.4 24.6 L32.4 25.1 L27.8 29 L29.2 34.9 L24 31.8 L18.8 34.9 L20.2 29 L15.6 25.1 "
    "L21.6 24.6 Z"
)
SLEEVE_L = "M16 8 L10 12 L7 20 L12 23 L14 18 Z"
SLEEVE_R = "M32 8 L38 12 L41 20 L36 23 L34 18 Z"
PANEL_L = "M14 18 L20 18 L20 40 Q17 39.5 14 40 Z"
PANEL_R = "M34 18 L28 18 L28 40 Q31 39.5 34 40 Z"
DOTS = [(19, 22), (29, 22), (24, 29), (19, 36), (29, 36)]
UCI = ["#0078c8", "#c8143c", "#000000", "#fae100", "#32b432"]  # guía UCI 5.3, p. 5 (mapa 03 §7.1)
BRAND5 = ["#0b2740", "#123a5c", "#1499bb", "#35bdda", "#d99400"]  # index.css l. 6-10 (mapa 03 §7.2)
ESPECTRO = ["#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#5e35b1", "#d81b60"]
LEAD = 'stroke="#000" stroke-opacity=".35" stroke-width="1.5"'
TORSO_DEFS = f'<path id="t__ID__" d="{TORSO}"/><clipPath id="c__ID__"><use href="#t__ID__"/></clipPath>'


def doc(defs, body):
    return '<svg viewBox="0 0 48 48">' + (f"<defs>{defs}</defs>" if defs else "") + body + "</svg>"


def r(x, y, w, h):
    return f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}"/>'


def p(d):
    return f'<path d="{d}"/>'


def relleno(formas, c):
    return "".join(f.replace("/>", f' fill="{c}"/>') for f in formas)


def banda(p0, p1, ancho, desplaza=0.0):
    """Paralelogramo de `ancho` u a lo largo de p0-p1 (el `band_poly` de la propuesta identidad)."""
    (x0, y0), (x1, y1) = p0, p1
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy)
    nx, ny = -dy / L, dx / L
    a, b = desplaza - ancho / 2, desplaza + ancho / 2
    pts = [(x0 + nx * a, y0 + ny * a), (x1 + nx * a, y1 + ny * a), (x1 + nx * b, y1 + ny * b), (x0 + nx * b, y0 + ny * b)]
    return "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in pts) + " Z"


def estrella(cx, cy, R, ri):
    pts = []
    for k in range(10):
        ang = math.radians(-90 + 36 * k)
        rad = R if k % 2 == 0 else ri
        pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    return "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in pts) + " Z"


def semianillo(cx, cy, r1, r2):
    return (
        f"M{cx - r2:g} {cy:g} A{r2:g} {r2:g} 0 0 1 {cx + r2:g} {cy:g} "
        f"L{cx + r1:g} {cy:g} A{r1:g} {r1:g} 0 0 0 {cx - r1:g} {cy:g} Z"
    )


SLEEVES = [p(SLEEVE_L), p(SLEEVE_R)]
SASH_ID = banda((10, 10), (38, 42), 10)  # identidad §6.5: M13.76 6.71 L41.76 38.71 L34.24 45.29 L6.24 13.29 Z
SASH_PARTES = [banda((10, 10), (38, 42), 10 / 3, o) for o in (-10 / 3, 0.0, 10 / 3)]
YOKE_SIS = [r(0, 0, 48, 21)] + SLEEVES


def campeon(campo, figura, cuello=None, defs="", filete=LEAD, cuello_op=""):
    cuerpo = (
        f'<use href="#t__ID__" fill="{campo}"/><g clip-path="url(#c__ID__)">{figura}</g>'
        f'<use href="#t__ID__" fill="none" {filete}/>'
    )
    if cuello:
        cuerpo += f'<path d="{COLLAR}" fill="{cuello}"{cuello_op}/>'
    return doc(TORSO_DEFS + defs, cuerpo)


def variante(fondo, franjas, defs=""):
    """Las variantes del mapa 03 §7.2: silueta con filete de líder y cinco bandas de 2 u."""
    return doc(defs, f'<path d="{TORSO}" fill="{fondo}" {LEAD}/>{franjas}')


def bandas_h(cols, y0=22.0, h=2.0):
    return "".join(f'<rect x="14" y="{y0 + i * h:g}" width="20" height="{h:g}" fill="{c}"/>' for i, c in enumerate(cols))


def bandas_v(cols, x0=19.0, w=2.0):
    return "".join(f'<rect x="{x0 + i * w:g}" y="18" width="{w:g}" height="22" fill="{c}"/>' for i, c in enumerate(cols))


def degradado(gid, x1, y1, x2, y2):
    stops = "".join(f'<stop offset="{i / 6:.3f}" stop-color="{c}"/>' for i, c in enumerate(ESPECTRO))
    return f'<linearGradient id="{gid}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" gradientUnits="userSpaceOnUse">{stops}</linearGradient>'


BANDERA_SASH = {  # identidad, datos/bandas-nacionales.json (material generado de flag-icons)
    "IT": ["#009246", "#fdfdfd", "#ce2b37"],
    "ES": ["#aa161b", "#f1bf00", "#aa161b"],
    "BE": ["#000001", "#fed80e", "#f31830"],
}
BANDERAS = {  # la bandera junto al maillot (la de hoy la pinta Flag.tsx), simplificada, 4:3
    "IT": '<svg viewBox="0 0 4 3"><rect width="4" height="3" fill="#ce2b37"/><rect width="2.667" height="3" fill="#f4f5f0"/><rect width="1.333" height="3" fill="#009246"/></svg>',
    "ES": '<svg viewBox="0 0 4 3"><rect width="4" height="3" fill="#aa151b"/><rect y=".75" width="4" height="1.5" fill="#f1bf00"/></svg>',
    "BE": '<svg viewBox="0 0 4 3"><rect width="4" height="3" fill="#ef3340"/><rect width="2.667" height="3" fill="#fdda24"/><rect width="1.333" height="3" fill="#000"/></svg>',
}


def banda_nacional(cols):
    partes = "".join(f'<path d="{d}" fill="{c}"/>' for d, c in zip(SASH_PARTES, cols))
    filo = f'<path d="{SASH_ID}" fill="none" stroke="#14213d" stroke-width="2.4"/>'
    return campeon("#f6f3ea", partes + filo, cols[0])


S1 = estrella(24, 29, 9.5, 3.9)
STAR_TEL = estrella(24, 28.5, 13, 6.2)
BLANCO85 = ("#ffffff", ' fill-opacity=".85"')

DISENOS_CAMPEON = {
    # identidad A, la banda de honor (§6.5)
    "C-banda-mundo": campeon("#14213d", f'<path d="{SASH_ID}" fill="#e0a526"/>', "#e0a526"),
    "C-banda-IT": banda_nacional(BANDERA_SASH["IT"]),
    "C-banda-ES": banda_nacional(BANDERA_SASH["ES"]),
    "C-banda-BE": banda_nacional(BANDERA_SASH["BE"]),
    # sistema S1 (§6.4): estrella de oro sobre marino; el mundial con el canesú dorado
    "C-s1-nac": campeon("#14284b", f'<path d="{S1}" fill="#f0b323"/>', *BLANCO85),
    "C-s1-mundo": campeon("#14284b", relleno(YOKE_SIS, "#f0b323") + f'<path d="{S1}" fill="#f0b323"/>', *BLANCO85),
    # telefono A (§6.4): estrella de 13 u sobre blanco
    "C-tel-nac": campeon("#ffffff", f'<path d="{STAR_TEL}" fill="#123a5c"/>'),
    "C-tel-mundo": campeon("#ffffff", f'<path d="{STAR_TEL}" fill="#e0a106" stroke="#123a5c" stroke-width="1.6"/>'),
    # lectura (a) (§6.4): la estrella de hoy (16,8 u) sobre blanco
    "C-lec-nac": campeon("#ffffff", f'<path d="{STAR}" fill="#0b2740"/>'),
    "C-lec-mundo": campeon("#ffffff", f'<path d="{STAR}" fill="#a87300"/>', "#a87300", filete='stroke="#123a5c" stroke-width="2"'),
    # identidad C (§15): el espectro a lo largo de la banda, sobre noche, cuello blanco
    "C-espectro": campeon(
        "#14213d", f'<path d="{SASH_ID}" fill="url(#g__ID__)"/>', "#ffffff",
        degradado("g__ID__", 10.5, 10.4, 37.5, 41.6),
    ),
    # sistema D1 (§15): tres bandas de 4,5 u sobre marino; el mundial con el canesú dorado
    "C-d1-nac": campeon(
        "#14284b", relleno([r(0, 23, 48, 4.5)], "#1499bb") + relleno([r(0, 28, 48, 4.5)], "#f0b323")
        + relleno([r(0, 33, 48, 4.5)], "#ffffff"), *BLANCO85,
    ),
    "C-d1-mundo": campeon(
        "#14284b", relleno(YOKE_SIS, "#f0b323") + relleno([r(0, 23, 48, 4.5)], "#1499bb")
        + relleno([r(0, 28, 48, 4.5)], "#f0b323") + relleno([r(0, 33, 48, 4.5)], "#ffffff"), *BLANCO85,
    ),
    # lectura (b) (§15): tres arcos de 2,5 u (oro, cian, blanco) sobre marino; centro y radios, míos
    "C-arcos": campeon(
        "#0b2740",
        f'<path d="{semianillo(24, 33, 10, 12.5)}" fill="#e8b400"/>'
        f'<path d="{semianillo(24, 33, 7.5, 10)}" fill="#35bdda"/>'
        f'<path d="{semianillo(24, 33, 5, 7.5)}" fill="#ffffff"/>',
    ),
    # la marca de la UCI y las variantes del dueño (mapa 03 §7.2; V7, propuesta identidad §6.5)
    "V0": variante("#ffffff", bandas_h(UCI)),
    "V1": variante("#ffffff", bandas_h(UCI[::-1])),
    "V2": variante("#ffffff", bandas_v(UCI)),
    "V3": variante("#ffffff", bandas_v(UCI[::-1])),
    "V4": variante("#ffffff", bandas_h(BRAND5)),
    "V5": variante("#1e293b", bandas_h(UCI)),
    "V6": variante("#d99400", bandas_h(UCI)),
    "V7": variante(
        "#14213d", '<rect x="14" y="23" width="20" height="9" fill="url(#g__ID__)"/>',
        degradado("g__ID__", 14, 0, 34, 0),
    ),
}

# Las tarjetas de la decisión 3: (id, [(diseño, etiqueta, bandera, bandera desde px)]).
OPCIONES_CAMPEON = [
    ("banda", [("C-banda-mundo", "Mundial", None, 0), ("C-banda-IT", "Italia", "IT", 0),
               ("C-banda-ES", "España", "ES", 0), ("C-banda-BE", "Bélgica", "BE", 0)]),
    ("estrella-marino", [("C-s1-nac", "Nacional (Italia)", "IT", 0), ("C-s1-mundo", "Mundial", None, 0)]),
    ("estrella-blanco", [("C-tel-nac", "Nacional, telefono", "IT", 0), ("C-tel-mundo", "Mundial, telefono", None, 0),
                         ("C-lec-nac", "Nacional, lectura", "IT", 16), ("C-lec-mundo", "Mundial, lectura", None, 0)]),
    ("espectro", [("C-espectro", "Mundial", None, 0)]),
    ("bandas-anchas", [("C-d1-nac", "Nacional (Italia)", "IT", 0), ("C-d1-mundo", "Mundial", None, 0)]),
    ("arcos", [("C-arcos", "Mundial", None, 0)]),
    ("v1", [("V1", "V1", None, 0)]),
    ("v2", [("V2", "V2, su orden", None, 0), ("V3", "V3, invertida", None, 0)]),
    ("v4", [("V4", "V4", None, 0)]),
    ("v5", [("V5", "V5, sobre #1e293b", None, 0), ("V6", "V6, sobre #d99400", None, 0)]),
    ("v7", [("V7", "V7", None, 0)]),
]

LIDERES = {  # Jersey.tsx l. 73-86, los de hoy
    "L-gc": ("#facc15", None, "plain"),
    "L-points": ("#16a34a", "#bbf7d0", "band"),
    "L-kom": ("#2563eb", "#ffffff", "dots"),
}


def lider(base, marca, figura):
    s = f'<path d="{TORSO}" fill="{base}" {LEAD}/>'
    if figura == "band":
        s += f'<rect x="14" y="25" width="20" height="7" fill="{marca}"/>'
    if figura == "dots":
        s += "".join(f'<circle cx="{x}" cy="{y}" r="3.4" fill="{marca}"/>' for x, y in DOTS)
    return doc("", s)


# ------------------------------------------------------------------------ los vocabularios

VOCABS = {
    "telefono": {
        "colores": [
            ("black", "#1b1d21", "base"), ("navy", "#172a5b", "base"), ("blue", "#0f6de9", "base"),
            ("sky", "#4cc3ff", "base"), ("teal", "#0f9e8f", "base"), ("green", "#236102", "base"),
            ("orange", "#f48d32", "base"), ("red", "#c62639", "base"), ("pink", "#f7418a", "base"),
            ("purple", "#4e2cae", "base"), ("yellow", "#ffd60a", "segundo"), ("white", "#ffffff", "segundo"),
        ],
        "figuras": [
            ("Plain", []), ("Chest band", [r(0, 23, 48, 10)]), ("Hoops", [r(0, 17, 48, 7), r(0, 30, 48, 7)]),
            ("Halves", [r(24, 0, 24, 48)]), ("Yoke", [r(0, 0, 48, 19)] + SLEEVES),
            ("Sash", [p(banda((10, 10), (38, 42), 10))]), ("Sides", [r(0, 0, 21, 48), r(27, 0, 21, 48)]),
        ],
        "aprox_figuras": ["Sash"],
        "cuello": "blanco", "filete": ('stroke="#000" stroke-opacity=".18" stroke-width="1"'),
        "regla": None, "demo": ("#0f6de9", "#ffffff"),
    },
    "sistema": {
        "colores": [
            ("negro", "#151b24", "base"), ("azul", "#2a66db", "base"), ("celeste", "#4bc6fa", "base"),
            ("verde azulado", "#00584f", "base"), ("granate", "#68111c", "base"), ("rojo", "#d02c2a", "base"),
            ("naranja", "#fd8637", "base"), ("rosa", "#b36c8f", "base"), ("morado", "#5e2b99", "base"),
            ("gris", "#a2acb7", "base"), ("blanco", "#ffffff", "segundo"),
        ],
        "figuras": [
            ("plain", []), ("halves", [r(24, 0, 24, 48)]), ("hoop", [r(0, 25, 48, 8)]), ("yoke", YOKE_SIS),
            ("sash", [p(banda((10, 10), (38, 42), 9))]), ("sides", [r(14, 18, 7, 30), r(27, 18, 7, 30)]),
            ("sleeves", SLEEVES),
        ],
        "aprox_figuras": ["sash"],
        "cuello": "blanco", "filete": LEAD, "regla": None, "demo": ("#2a66db", "#ffffff"),
    },
    "identidad": {
        "colores": [
            ("white", "#ffffff", "base"), ("black", "#16181d", "base"), ("yellow", "#ffd60a", "base"),
            ("sky", "#8fd0f5", "base"), ("silver", "#c8ced7", "base"), ("red", "#d7261e", "base"),
            ("royal", "#2a5bd7", "base"), ("green", "#2f9e44", "base"), ("orange", "#f26b0f", "base"),
            ("violet", "#7e44d0", "base"), ("navy", "#1f3a93", "base"), ("maroon", "#7a1426", "base"),
            ("forest", "#1d6b35", "base"), ("teal", "#00897b", "base"),
        ],
        "figuras": [
            ("Plain", []), ("Band", [r(0, 24, 48, 8)]), ("Yoke", [r(0, 0, 48, 25)]), ("Sleeves", SLEEVES),
            ("Stripe", [r(20, 0, 8, 48)]), ("Halves", [r(24, 0, 24, 48)]),
        ],
        "aprox_figuras": [],
        "cuello": "segundo", "filete": 'stroke="#000" stroke-opacity=".3" stroke-width="__SW__"',
        "regla": "de20", "demo": ("#2a5bd7", "#ffffff"),
    },
    "lectura": {
        "colores": [
            ("negro", "#1d1d1f", "base"), ("marino", "#1c2f5e", "base"), ("azul", "#2453c7", "base"),
            ("celeste", "#5ab4e5", "base"), ("turquesa", "#0b7d74", "base"), ("verde", "#1f5e2e", "base"),
            ("lima", "#a6c935", "base"), ("naranja", "#ee7a1a", "base"), ("rojo", "#c81e2d", "base"),
            ("granate", "#6e1a2b", "base"), ("rosa", "#e0559a", "base"), ("morado", "#5b2a86", "base"),
            ("gris", "#8b9097", "base"), ("amarillo", "#f4d21f", "segundo"), ("blanco", "#ffffff", "segundo"),
        ],
        "figuras": [
            ("plain", []), ("band", [r(0, 23, 48, 8)]), ("halves", [r(24, 0, 24, 48)]),
            ("yoke", [r(0, 0, 48, 21)] + SLEEVES), ("sash", [p(banda((10, 10), (38, 42), 9.6))]),
            ("sleeves", SLEEVES),
        ],
        "aprox_figuras": ["sash"],
        "cuello": "blanco", "filete": 'stroke="#000" stroke-opacity=".18" stroke-width="1"',
        "regla": "wcag2", "demo": ("#2453c7", "#ffffff"),
    },
}


def maillot(V, fi, base, sec):
    formas = V["figuras"][fi][1]
    cuerpo = f'<use href="#t__ID__" fill="{base}"/>'
    if formas:
        cuerpo += f'<g clip-path="url(#c__ID__)">{relleno(formas, sec)}</g>'
    cuerpo += f'<use href="#t__ID__" fill="none" {V["filete"]}/>'
    if V["cuello"] == "segundo":
        cuerpo += f'<path d="{COLLAR}" fill="{sec}"/>'
    else:
        cuerpo += f'<path d="{COLLAR}" fill="#fff" fill-opacity=".85"/>'
    return doc(TORSO_DEFS, cuerpo)


def pareja_valida(V, a, b):
    if V["regla"] == "de20":
        return all(de_colores(a, b, v) >= 20 for v in VISIONES)
    if V["regla"] == "wcag2":
        return wcag(a, b) >= 2
    return True


def candidatos(vid):
    """Los diseños que permiten las reglas de la propuesta: {clave: svg}."""
    V = VOCABS[vid]
    cols = V["colores"]
    bases = [i for i, c in enumerate(cols) if c[2] == "base"]
    pares = [(b, s) for b in bases for s in range(len(cols)) if s != b and pareja_valida(V, cols[b][1], cols[s][1])]
    out = {}
    for fi, (_, formas) in enumerate(V["figuras"]):
        if not formas and V["cuello"] != "segundo":
            for b in bases:
                out[f"{vid[0]}{fi}.{b}"] = maillot(V, fi, cols[b][1], "#ffffff")
        else:
            for b, s in pares:
                out[f"{vid[0]}{fi}.{b}.{s}"] = maillot(V, fi, cols[b][1], cols[s][1])
    return out, len(pares)


# ------------------------------------------ lo que decidió el dueño el 21-10-2026 (D-00b a D-00e)
# La geometría de borrador/09-campeon.md §9.1 y §9.7 y de 08-equipacion.md §8.1 y §8.3, la misma que
# midió el redactor de §8 y §9 (<scratchpad>/redactor-L2/medir28.py).
LOGO_STAR = "M36 2 L39.2 9.2 L47 10 L41.2 15.3 L42.9 23 L36 19.1 L29.1 23 L30.8 15.3 L25 10 L32.8 9.2 Z"
ARCOIRIS = ["#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#5e35b1"]  # CHAMPION_RAINBOW
NAVY_DARK, ORO, PLATA = "#0b2740", "#e0a526", "#c0c7d2"
PAISES = [  # (código, nombre, nombre en el juego, corredor de ejemplo)
    ("IT", "Italia", "Italy", "Luca Bertolini"),
    ("ES", "España", "Spain", "Javier Ortega"),
    ("NL", "Países Bajos", "Netherlands", "Daan de Vries"),
    ("JP", "Japón", "Japan", "Kenta Mori"),
    ("MA", "Marruecos", "Morocco", "Yassine El Amrani"),
    ("ID", "Indonesia", "Indonesia", "Rizky Pratama"),
    ("MC", "Mónaco", "Monaco", "Louis Garnier"),
]
BANDERAS_WEB = [c[0] for c in PAISES] + ["FR", "GB"]
CAJA_BANDERA = 'x="1.333" y="8" width="45.333" height="34"'  # NATIONAL_FLAG_BOX (§9.1)


def estrella_logo(ancho, cx, cy, relleno_, filo, color_filo=NAVY_DARK):
    """La estrella del logotipo (Logo.tsx l. 31) con `starTransform` (§9.1) y su filo, navy-dark salvo
    en la estrella navy del nacional, que lo lleva blanco (§9.5)."""
    s = ancho / 22.0
    return (
        f'<path d="{LOGO_STAR}" transform="translate({cx:g} {cy:g}) scale({s:.4f}) translate(-36 -12.5)" '
        f'fill="{relleno_}" stroke="{color_filo}" stroke-width="{filo / s:.3f}" stroke-linejoin="round"/>'
    )


def mundial_d00(relleno_=None):
    """El mundial: blanco y la estrella de 18 u; sin relleno, el arcoíris en diagonal (§9.1)."""
    defs = TORSO_DEFS
    if relleno_ is None:
        stops = "".join(f'<stop offset="{i / 5:.3f}" stop-color="{c}"/>' for i, c in enumerate(ARCOIRIS))
        defs += f'<linearGradient id="g__ID__" x1="0" y1="0" x2="1" y2="1">{stops}</linearGradient>'
        relleno_ = "url(#g__ID__)"
    cuerpo = (
        f'<use href="#t__ID__" fill="#ffffff"/><use href="#t__ID__" fill="none" {LEAD}/>'
        f'<path d="{COLLAR}" fill="#fff" fill-opacity=".85"/>' + estrella_logo(18, 24, 28.5, relleno_, 1.5)
    )
    return doc(defs, cuerpo)


def bandera_web(cc, carpeta):
    """La bandera de la web (flag-icons 4x3, la de Flag.tsx): su viewBox y su dibujo, con ids propios."""
    fuente = (carpeta / f"{cc.lower()}.svg").read_text(encoding="utf-8")
    m = re.search(r"<svg([^>]*)>(.*)</svg>", fuente, re.S)
    vb = re.search(r'viewBox="([^"]+)"', m.group(1)).group(1)
    pre = f"bandera-{cc.lower()}-"
    dentro = re.sub(r'id="([^"]+)"', lambda x: f'id="{pre}{x.group(1)}"', m.group(2))
    dentro = re.sub(r"url\(#([^)]+)\)", lambda x: f"url(#{pre}{x.group(1)})", dentro)
    dentro = re.sub(r'href="#([^"]+)"', lambda x: f'href="#{pre}{x.group(1)}"', dentro)
    return vb, re.sub(r">\s+<", "><", dentro.strip())


def nacional_d00(cc, con_estrella, banderas, para_medir):
    """El nacional: la bandera entera recortada por TORSO, filete, cuello y, si va, la estrella dorada."""
    if para_medir:
        vb, dentro = banderas[cc]
        capa = f'<svg {CAJA_BANDERA} viewBox="{vb}" preserveAspectRatio="xMidYMid slice">{dentro}</svg>'
    else:  # en la página, la bandera se define una vez (<symbol>) y cada maillot la usa
        capa = f'<use href="#bandera-{cc.lower()}" {CAJA_BANDERA}/>'
    cuerpo = (
        f'<use href="#t__ID__" fill="#ffffff"/><g clip-path="url(#c__ID__)">{capa}</g>'
        f'<use href="#t__ID__" fill="none" {LEAD}/><path d="{COLLAR}" fill="#fff" fill-opacity=".85"/>'
    )
    if con_estrella:
        cuerpo += estrella_logo(10, 24, 25, ORO, 1.0)
    return doc(TORSO_DEFS, cuerpo)


# La regla de la estrella del nacional y sus dos letras (D-00f; borrador/09-campeon.md §9.5). El sitio
# y el relleno de cada país los midió el redactor (medir-nacional2.json); aquí solo se dibujan.
NATIONAL_STAR_SITES = {"high": (24, 14.8), "right": (31.5, 14.5), "left": (16.5, 14.5), "center": (24, 25)}
RELLENO_ESTRELLA = {"gold": ORO, "white": "#ffffff", "navy": NAVY_DARK}
ESTRELLA_AMARILLA = {"CN", "ET", "PH", "MY", "VN", "BF", "CM", "CV", "MO", "SR"}  # ya llevan una (§9.5)
EN_EMBLEMA = {"JP", "LA", "XK", "GB", "GE"}  # la regla sienta la estrella dentro de un emblema (§9.5)
CON_TEXTO = {"BR", "SA"}  # banderas con texto (§9.5)


def nacional_regla(cc, regla, banderas, para_medir_, letras=False):
    """El nacional de §9.5: la bandera, la estrella de 10 u en su sitio y su relleno y, desde 72 px, las
    dos letras de su código (8 u a 700, base en y 38,5, filo de 2 u del otro color por debajo)."""
    sitio, relleno_, (letra, filo_letra) = regla
    if para_medir_:
        vb, dentro = banderas[cc]
        capa = f'<svg {CAJA_BANDERA} viewBox="{vb}" preserveAspectRatio="xMidYMid slice">{dentro}</svg>'
    else:
        capa = f'<use href="#bandera-{cc.lower()}" {CAJA_BANDERA}/>'
    cuerpo = (
        f'<use href="#t__ID__" fill="#ffffff"/><g clip-path="url(#c__ID__)">{capa}</g>'
        f'<use href="#t__ID__" fill="none" {LEAD}/><path d="{COLLAR}" fill="#fff" fill-opacity=".85"/>'
    )
    color_filo = "#ffffff" if relleno_ == "navy" else NAVY_DARK
    cuerpo += estrella_logo(10, *NATIONAL_STAR_SITES[sitio], RELLENO_ESTRELLA[relleno_], 1.0, color_filo)
    if letras:
        cuerpo += (
            f'<text x="24" y="38.5" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8" '
            f'font-weight="700" letter-spacing="0.32" fill="{letra}" stroke="{filo_letra}" stroke-width="2" '
            f'paint-order="stroke" stroke-linejoin="round">{cc}</text>'
        )
    return doc(TORSO_DEFS, cuerpo)


# El maillot en grande (D-00g; borrador/08-equipacion.md §8.10): delante, detrás y culote, con las zonas
# del patrocinador. Solo se dibuja: no entra en ninguna distancia.
TORSO_BACK = TORSO.replace("Q24 12 16 8 Z", "Q24 10 16 8 Z")
POCKETS = "M14.5 33.5H33.5 M20.8 33.5V40.5 M27.2 33.5V40.5"
BIB = "M12 8 L36 8 L38 40 L26 40 L24 26 L22 40 L10 40 Z"
BIB_STRAPS = "M15 8 L16.5 1 L19.5 1 L18.5 8 Z M33 8 L31.5 1 L28.5 1 L29.5 8 Z"
BIB_PANELS = "M12 8 L16 8 L14 40 L10 40 Z M36 8 L32 8 L34 40 L38 40 Z"
SPONSOR_ZONES = {  # (x, y, ancho, alto, vertical)
    "chest": [(14, 23, 20, 10, False)],
    "back": [(14, 18, 20, 9, False)],
    "sleeves": [(10, 13, 3.5, 6, True), (34.5, 13, 3.5, 6, True)],
    "bibSides": [(11.65, 14, 2.7, 20, True), (33.65, 14, 2.7, 20, True)],
}
BACK_NAME_BOX = (12, 11, 24, 5, False)
BACK_NUMBER_BOX = (18, 28, 12, 8, False)
INK = "#10202f"
LETRA_SVG = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"


def capacidad(caja, px):
    """`zoneCapacity`: las mayúsculas de 12 px que caben (12 px son 576 / px u; cada una, 0,65 em)."""
    _, _, w, h, vertical = caja
    fu = 576 / px
    largo, alto = (h, w) if vertical else (w, h)
    return 0 if alto < fu else int(largo // (0.65 * fu))


def tinta_sobre(fondo):
    return "#ffffff" if wcag("#ffffff", fondo) >= wcag(INK, fondo) else INK


def texto_en(caja, px, texto, fondo):
    x, y, w, h, vertical = caja
    cx, cy = x + w / 2, y + h / 2
    giro = f' transform="rotate(-90 {cx:g} {cy:g})"' if vertical else ""
    return (
        f'<text x="{cx:g}" y="{cy:g}" text-anchor="middle" dominant-baseline="central" font-family="{LETRA_SVG}" '
        f'font-size="{576 / px:.3f}" font-weight="700" fill="{tinta_sobre(fondo)}"{giro}>{texto}</text>'
    )


def marco(caja, px, punteado=False):
    x, y, w, h, _ = caja
    u = 48 / px  # un píxel de pantalla, en u
    patron = f"{u:.3f} {2 * u:.3f}" if punteado else f"{4 * u:.3f} {3 * u:.3f}"
    return (
        f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" fill="none" stroke="#5c6370" '
        f'stroke-width="{1.5 * u:.3f}" stroke-dasharray="{patron}"/>'
    )


def zona(caja, px, patrocinador, fondo):
    """La regla 8-p: el nombre si cabe, si no su marca, si no la caja en su color; siempre su marco."""
    nombre, marca_, color = patrocinador
    cabe = capacidad(caja, px)
    if len(nombre) <= cabe:
        dentro = texto_en(caja, px, nombre, fondo)
    elif len(marca_) <= cabe:
        dentro = texto_en(caja, px, marca_, fondo)
    else:
        x, y, w, h, _ = caja
        dentro = f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" fill="{color}"/>'
    return dentro + marco(caja, px)


def vista_frente(base, sec, formas, px, patrocinador):
    cuerpo = f'<use href="#t__ID__" fill="{base}"/><g clip-path="url(#c__ID__)">{relleno(formas, sec)}</g>'
    cuerpo += f'<use href="#t__ID__" fill="none" {FILETE_D00E}/><path d="{COLLAR}" fill="#fff" fill-opacity=".85"/>'
    cuerpo += zona(SPONSOR_ZONES["chest"][0], px, patrocinador, base)
    cuerpo += "".join(zona(c, px, patrocinador, sec) for c in SPONSOR_ZONES["sleeves"])
    return doc(TORSO_DEFS, cuerpo)


def vista_espalda(base, sec, formas, px, patrocinador, equipo):
    defs = f'<path id="t__ID__" d="{TORSO_BACK}"/><clipPath id="c__ID__"><use href="#t__ID__"/></clipPath>'
    espejo = f'<g transform="translate(48 0) scale(-1 1)">{relleno(formas, sec)}</g>'  # kitBackPath
    cuerpo = f'<use href="#t__ID__" fill="{base}"/><g clip-path="url(#c__ID__)">{espejo}</g>'
    cuerpo += f'<path d="{POCKETS}" fill="none" stroke="#000" stroke-opacity=".3" stroke-width=".5"/>'
    cuerpo += f'<use href="#t__ID__" fill="none" {FILETE_D00E}/>'
    if len(equipo) <= capacidad(BACK_NAME_BOX, px):  # nunca cortado ni más pequeño
        cuerpo += texto_en(BACK_NAME_BOX, px, equipo.upper(), sec)
    cuerpo += marco(BACK_NAME_BOX, px, True) + marco(BACK_NUMBER_BOX, px, True)
    cuerpo += zona(SPONSOR_ZONES["back"][0], px, patrocinador, base)
    cuerpo += "".join(zona(c, px, patrocinador, sec) for c in SPONSOR_ZONES["sleeves"])
    return doc(defs, cuerpo)


def vista_culote(cuerpo_color, panel, px, patrocinador):
    defs = f'<path id="t__ID__" d="{BIB}"/><clipPath id="c__ID__"><use href="#t__ID__"/></clipPath>'
    cuerpo = f'<path d="{BIB_STRAPS}" fill="{cuerpo_color}"/><use href="#t__ID__" fill="{cuerpo_color}"/>'
    cuerpo += f'<g clip-path="url(#c__ID__)"><path d="{BIB_PANELS}" fill="{panel}"/><rect x="0" y="37" width="48" height="3" fill="{panel}"/></g>'
    cuerpo += f'<use href="#t__ID__" fill="none" {FILETE_D00E}/>'
    cuerpo += "".join(zona(c, px, patrocinador, panel) for c in SPONSOR_ZONES["bibSides"])
    return doc(defs, cuerpo)


def lideres_d00():
    """Los tres de líder de §9.7: banda blanca de 10 u en el verde y lunares de 4 u en el azul."""
    def uno(base, extra):
        return doc(TORSO_DEFS, f'<use href="#t__ID__" fill="{base}"/>{extra}<use href="#t__ID__" fill="none" {LEAD}/>')

    banda_ = f'<g clip-path="url(#c__ID__)">{relleno([r(0, 23, 48, 10)], "#ffffff")}</g>'
    lunares = "".join(f'<circle cx="{x}" cy="{y}" r="4" fill="#ffffff"/>' for x, y in DOTS)
    return {"L2-gc": uno("#facc15", ""), "L2-points": uno("#16a34a", banda_), "L2-kom": uno("#2563eb", lunares)}


COLORES_D00E = [c[:2] for c in VOCABS["telefono"]["colores"][:10]] + [
    ("taupe", "#876969"), ("brown", "#4b1e0f"), ("plum", "#5a4b5a"), ("yellow", "#ffd60a"), ("white", "#ffffff"),
]
FIGURAS_D00E = [
    ("plain", []), ("band", [r(0, 23, 48, 10)]), ("hoops", [r(0, 17, 48, 7), r(0, 30, 48, 7)]),
    ("halves", [r(24, 0, 24, 48)]), ("yoke", [r(0, 0, 48, 19)] + SLEEVES),
    ("sides", [r(0, 0, 21, 48), r(27, 0, 21, 48)]), ("sash", [p(SASH_ID)]),
]
FIGURA_PANTALLA = {"plain": "Plain", "band": "Chest band", "hoops": "Hoops", "halves": "Halves",
                   "yoke": "Yoke", "sides": "Sides", "sash": "Sash"}
FILETE_D00E = 'stroke="#000" stroke-opacity=".3" stroke-width="1"'  # 1 u a todos los tamaños (§8.3)


def maillot_d00e(base, sec, formas):
    cuerpo = f'<use href="#t__ID__" fill="{base}"/>'
    if formas:
        cuerpo += f'<g clip-path="url(#c__ID__)">{relleno(formas, sec)}</g>'
    cuerpo += f'<use href="#t__ID__" fill="none" {FILETE_D00E}/><path d="{COLLAR}" fill="#fff" fill-opacity=".85"/>'
    return doc(TORSO_DEFS, cuerpo)


def candidatos_d00e():
    """Los que pasan la regla de contraste (ΔE00 >= 20 en las cinco vistas), con su código de §8.1."""
    hexs = dict(COLORES_D00E)
    nombres = list(hexs)
    bases = [n for n in nombres if n not in ("yellow", "white")]
    out, total = {}, 0
    for fig, formas in FIGURAS_D00E:
        for b in bases:
            if not formas:
                out[f"Q:plain.{b}"] = maillot_d00e(hexs[b], "#ffffff", [])
                total += 1
                continue
            for s in nombres:
                if s == b:
                    continue
                total += 1
                if all(de_colores(hexs[b], hexs[s], v) >= 20 for v in VISIONES):
                    out[f"Q:{fig}.{b}.{s}"] = maillot_d00e(hexs[b], hexs[s], formas)
    return out, total


def canonico(clave):
    """`halves.blue.red` y `halves.red.blue` son el mismo maillot (canonicalKit, §8.1)."""
    fig, b, *s = clave[2:].split(".")
    if fig == "halves" and s and s[0] not in ("yellow", "white"):
        a, c = sorted([b, s[0]])
        return f"Q:halves.{a}.{c}"
    return clave


def nombre_d00e(clave):
    fig, b, *s = clave[2:].split(".")
    return FIGURA_PANTALLA[fig] + ", " + b + (" y " + s[0] if s else "")


# ----------------------------------------------------------------------------- el rasterizador

RASTER_MJS = r"""/* global process, console */
// Pinta cada SVG de <trabajos.json> en un lienzo de px × px de Chromium (Playwright de /opt/node22,
// navegadores de /opt/pw-browsers), sobre blanco (RGB) y sobre transparente (alfa = cobertura).
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
const require = createRequire('/opt/node22/lib/node_modules/')
const { chromium } = require('playwright')
const [entrada, salida] = process.argv.slice(2)
const trabajos = JSON.parse(readFileSync(entrada, 'utf8'))
const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })
await page.setContent('<html><body></body></html>')
const partes = []
for (let i = 0; i < trabajos.length; i += 250) {
  const lote = trabajos.slice(i, i + 250)
  const res = await page.evaluate(async (lote) => {
    const out = []
    for (const t of lote) {
      const img = new Image()
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(t.svg)
      await img.decode()
      const pinta = (fondo) => {
        const c = document.createElement('canvas')
        c.width = t.px
        c.height = t.px
        const ctx = c.getContext('2d')
        if (fondo) {
          ctx.fillStyle = fondo
          ctx.fillRect(0, 0, t.px, t.px)
        }
        ctx.drawImage(img, 0, 0, t.px, t.px)
        return ctx.getImageData(0, 0, t.px, t.px).data
      }
      const a = pinta('#ffffff')
      const b = pinta(null)
      let s = ''
      for (let k = 0; k < a.length; k += 4) {
        s += String.fromCharCode(a[k], a[k + 1], a[k + 2], b[k + 3])
      }
      out.push(btoa(s))
    }
    return out
  }, lote)
  for (const b64 of res) partes.push(Buffer.from(b64, 'base64'))
}
writeFileSync(salida, Buffer.concat(partes))
console.log(browser.version())
await browser.close()
"""


def ancho_filete(px):
    return f"{max(1.0, min(2.0, 26.0 / px)):.2f}"


def para_medir(svg, px):
    s = svg.replace(
        "<svg ",
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{px}" height="{px}" ',
        1,
    )
    return s.replace("__ID__", "m").replace("__SW__", ancho_filete(px))


def rasteriza(trabajos, dir_trabajo):
    """trabajos: [(clave, svg, px)] -> ({(clave, px): (rgb P×3, cobertura P)}, versión de Chromium)."""
    dir_trabajo.mkdir(parents=True, exist_ok=True)
    mjs = dir_trabajo / "raster.mjs"
    mjs.write_text(RASTER_MJS, encoding="utf-8")
    entrada, salida = dir_trabajo / "trabajos.json", dir_trabajo / "pixeles.bin"
    entrada.write_text(json.dumps([{"svg": para_medir(s, px), "px": px} for _, s, px in trabajos]), encoding="utf-8")
    env = dict(os.environ, PLAYWRIGHT_BROWSERS_PATH=os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers"))
    res = subprocess.run(["node", str(mjs), str(entrada), str(salida)], env=env, capture_output=True, text=True)
    if res.returncode != 0:
        sys.exit(f"Chromium ha fallado:\n{res.stderr}")
    datos = np.frombuffer(salida.read_bytes(), dtype=np.uint8)
    out, o = {}, 0
    for clave, _, px in trabajos:
        n = px * px * 4
        a = datos[o : o + n].reshape(px * px, 4).astype(float) / 255
        out[(clave, px)] = (a[:, :3], a[:, 3])
        o += n
    return out, res.stdout.strip()


class Dibujos:
    """Los CIELAB de un conjunto de dibujos del mismo tamaño, en cada visión, para medir distancias."""

    def __init__(self, claves, px_map, px):
        self.claves = list(claves)
        self.idx = {k: i for i, k in enumerate(self.claves)}
        rgb = np.stack([px_map[(k, px)][0] for k in self.claves])
        self.cov = np.stack([px_map[(k, px)][1] for k in self.claves])
        self.lab = {v: lab(rgb, v) for v in VISIONES}

    def a_todos(self, otro, k, v):
        """Distancia del dibujo `k` de `otro` a todos los de este conjunto, en la visión `v`."""
        i = otro.idx[k]
        la = np.broadcast_to(otro.lab[v][i], self.lab[v].shape)
        d = colour.difference.delta_E_CIE2000(la, self.lab[v])
        w = np.maximum(otro.cov[i][None, :], self.cov)
        return (d * w).sum(1) / w.sum(1)


def voraz(D, lideres, n=22, permitido=None, canon=None):
    """El pelotón de ejemplo: los líderes ya puestos y, cada vez, el diseño más lejano de los puestos.
    Con `permitido`, solo entre esos; con `canon`, sin repetir maillot (ni su espejo)."""
    minimo = np.full(len(D.claves), np.inf)
    for k in lideres.claves:
        for v in COLOR4:
            minimo = np.minimum(minimo, D.a_todos(lideres, k, v))
    if permitido is not None:
        minimo[~permitido] = -np.inf
    elegidos = []
    for _ in range(n):
        i = int(np.argmax(minimo))
        elegidos.append(D.claves[i])
        for v in COLOR4:
            minimo = np.minimum(minimo, D.a_todos(D, D.claves[i], v))
        minimo[i] = -np.inf
        if canon:
            c = canon(D.claves[i])
            minimo[[j for j, k in enumerate(D.claves) if canon(k) == c]] = -np.inf
    return elegidos


def pares_bajo(D, claves, umbral=10.0):
    out = {}
    for v in VISIONES:
        n = 0
        for a in range(len(claves)):
            d = D.a_todos(D, claves[a], v)
            n += int(sum(d[D.idx[claves[b]]] < umbral for b in range(a + 1, len(claves))))
        out[v] = n
    return out


def r1(x):
    return round(float(x), 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--html", default=str(AQUI / "index.html"))
    ap.add_argument("--trabajo", default=None)
    ap.add_argument("--banderas", default=str(AQUI.parents[3] / "apps/web/node_modules/flag-icons/flags/4x3"))
    ap.add_argument("--medir28", default=None, help="las cifras a 28 px del redactor de §8 y §9")
    ap.add_argument("--nacional2", default=None, help="la regla de la estrella del nacional, medida (§9.5)")
    args = ap.parse_args()
    trabajo = Path(args.trabajo) if args.trabajo else Path(tempfile.mkdtemp(prefix="opciones-"))

    # 1. Las paletas: contrastes.
    paletas = {}
    for pid, P in PALETAS.items():
        t = P["tokens"]
        pares = []
        for clave, etiqueta, fg, bg, tipo in PARES:
            pares.append({"id": clave, "etiqueta": etiqueta, "fg": css(t[fg]), "bg": css(t[bg]),
                          "ratio": round(wcag(t[fg], t[bg]), 2), "tipo": tipo})
        paletas[pid] = {"tokens": {k: css(v) for k, v in t.items()}, "radio": P["radio"],
                        "aprox": P["aprox"], "pares": pares}

    # 2. Los filtros.
    def valores(m):
        filas = [list(m[i]) + [0, 0] for i in range(3)] + [[0, 0, 0, 1, 0]]
        return " ".join(f"{x:.6f}".rstrip("0").rstrip(".") if x else "0" for f in filas for x in f)

    visiones = {v: valores(MACHADO[v]) for v in ("protan", "deutan", "tritan")}
    visiones["gris"] = valores(np.array([REC709, REC709, REC709]))

    # 3. Los cuatro vocabularios de las propuestas, que el dueño no eligió: su pelotón de ejemplo, el
    #    de antes (voraz a 13 px con los líderes de hoy), que la página ya solo pinta y mide a 28 px.
    cand, n_pares = {}, {}
    for vid in VOCABS:
        cand[vid], n_pares[vid] = candidatos(vid)
    lideres = {k: lider(*v) for k, v in LIDERES.items()}
    todos = dict(lideres)
    for vid in VOCABS:
        todos.update(cand[vid])
    print(f"Pintando {len(todos)} dibujos a 13 px (para escoger los pelotones de antes)…", file=sys.stderr)
    px13, chromium = rasteriza([(k, s, 13) for k, s in todos.items()], trabajo)
    L13 = Dibujos(lideres, px13, 13)
    pelotones = {vid: voraz(Dibujos(cand[vid], px13, 13), L13) for vid in VOCABS}
    del px13

    # 4. Lo que decidió el dueño (D-00b a D-00h), a 28 px.
    m28 = json.loads(Path(args.medir28).read_text(encoding="utf-8")) if args.medir28 else None
    n2 = json.loads(Path(args.nacional2).read_text(encoding="utf-8")) if args.nacional2 else None
    carpeta = Path(args.banderas)
    if not carpeta.is_dir():
        sys.exit(f"No encuentro las banderas de flag-icons en {carpeta} (--banderas)")
    paises = re.findall(
        r"code: '([A-Z]{2})', name: '([^']*)'",
        (AQUI.parents[3] / "packages/shared/src/countries.ts").read_text(encoding="utf-8"),
    )
    banderas = {cc: bandera_web(cc, carpeta) for cc, _ in paises}
    regla = {}  # (sitio, relleno, (letra, filo de la letra)), de medir-nacional2.json
    for cc, _ in paises:
        p_ = (n2 or {}).get("paises", {}).get(cc)
        if p_:
            letra = p_["letras"]["relleno"]
            regla[cc] = (p_["sitio"], p_["relleno"], (letra, "#ffffff" if letra == NAVY_DARK else NAVY_DARK))
        else:
            regla[cc] = ("high", "gold", ("#ffffff", NAVY_DARK))
    cand_q, total_q = candidatos_d00e()
    lid28 = lideres_d00()
    mundiales = {"W-arcoiris": mundial_d00(), "W-oro": mundial_d00(ORO), "W-continental": mundial_d00(PLATA)}
    nac_medir = {f"R-{cc}": nacional_regla(cc, regla[cc], banderas, True) for cc, _ in paises}
    nuevas_pagina = dict(mundiales)
    for cc, _ in paises:
        nuevas_pagina[f"R-{cc}"] = nacional_regla(cc, regla[cc], banderas, False)
        nuevas_pagina[f"R-{cc}@L"] = nacional_regla(cc, regla[cc], banderas, False, letras=True)
    sen28 = {**mundiales, **nac_medir, **DISENOS_CAMPEON}
    trab28 = [(k, s, 28) for k, s in {**cand_q, **sen28, **lid28}.items()]
    trab28 += [(k, cand[vid][k], 28) for vid in VOCABS for k in pelotones[vid]]
    print(f"Pintando {len(trab28)} dibujos a 28 px…", file=sys.stderr)
    px28, _ = rasteriza(trab28, trabajo)
    Q = Dibujos(cand_q, px28, 28)
    S = Dibujos(sen28, px28, 28)
    L = Dibujos(lid28, px28, 28)
    # Lo reservado (§8.1 y D-00h): a menos de 10 de un líder, del mundial o del continental en alguna de
    # las cuatro visiones; y los 12 que medir-nacional2.json deja a menos de 10 de algún nacional.
    reservado = np.zeros(len(Q.claves), bool)
    for conj, claves in ((L, L.claves), (S, ["W-arcoiris", "W-continental"])):
        for k in claves:
            for v in COLOR4:
                reservado |= Q.a_todos(conj, k, v) < 10
    perm536 = ~reservado
    lista_nac = n2["a28"]["lista"] if n2 else (m28["nacionales"]["kits_cercanos"] if m28 else [])
    res_nac = {"Q:" + c for c in lista_nac}
    perm = perm536 & np.array([k not in res_nac for k in Q.claves])
    cuentas = {
        "combinaciones": total_q, "contraste": len(cand_q), "reservadosDistancia": int(reservado.sum()),
        "permitidosAntes": int(perm536.sum()), "reservadosNac": len(res_nac), "permitidos": int(perm.sum()),
        "distintos": len({canonico(k) for k, ok in zip(Q.claves, perm) if ok}),
    }
    pel_q = voraz(Q, L, permitido=perm, canon=canonico)
    pares_q = pares_bajo(Dibujos(pel_q, px28, 28), pel_q)

    def cerca_de(k, v):
        d = Q.a_todos(S, k, v)
        d[~perm536] = np.inf
        return d

    def medida(k):
        """A la marca (V0) y al permitido más cercano (de los 536, como medir28.json), en cinco vistas."""
        uci = [r1(S.a_todos(S, k, v)[S.idx["V0"]]) for v in VISIONES]
        cerca = []
        for v in VISIONES:
            d = cerca_de(k, v)
            i = int(np.argmin(d))
            cerca.append([r1(d[i]), Q.claves[i]])
        return {"uci": uci, "cerca": cerca}

    ejemplos = [f"R-{c[0]}" for c in PAISES]
    cifras = {k: dict(medida(k), fuente="medidas") for k in ["W-arcoiris", "W-oro"] + ejemplos}
    cotejo, cotejo_nac = [], []
    if m28 and "W-mundo" in m28["senales"]:
        ms = m28["senales"]["W-mundo"]
        cotejo += [abs(a - b) for a, b in zip(ms["uci"], cifras["W-arcoiris"]["uci"])]
        cotejo += [abs(a[0] - b[0]) for a, b in zip(ms["cerca"], cifras["W-arcoiris"]["cerca"])]
        cifras["W-arcoiris"] = {"uci": ms["uci"], "cerca": [[d, "Q:" + c] for d, c in ms["cerca"]], "fuente": "medir28"}
    if n2:  # las 133 de la regla, contra las del redactor: la marca en cinco vistas y el equipo en cuatro
        for cc, _ in paises:
            k = f"R-{cc}"
            uci = [r1(S.a_todos(S, k, v)[S.idx["V0"]]) for v in VISIONES]
            dmin = r1(min(float(cerca_de(k, v).min()) for v in COLOR4))
            cotejo_nac += [abs(a - b) for a, b in zip(n2["a28"]["uci"][cc], uci)]
            cotejo_nac.append(abs(n2["a28"]["kit_mas_cercano"][cc][0] - dmin))
    alternativas = {k: medida(k) for k in DISENOS_CAMPEON}

    # La hoja de revisión de §9.5: los 133 con la regla, sus marcas y su orden.
    gemela = {}
    for a, b, d in (n2["a28"]["gemelas"] if n2 else []):
        for x, y in ((a, b), (b, a)):
            if x not in gemela or d < gemela[x][1]:
                gemela[x] = [y, d]
    hoja = []
    for cc, nombre in paises:
        p_ = (n2 or {}).get("paises", {}).get(cc, {})
        sitio, rel, _ = regla[cc]
        cerca_ = n2["a28"]["kit_mas_cercano"][cc] if n2 else None
        marcas = [m for m, si in (
            ("sin-campo", p_.get("revisar")), ("emblema", cc in EN_EMBLEMA), ("estrella", cc in ESTRELLA_AMARILLA),
            ("texto", cc in CON_TEXTO), ("gemela", cc in gemela), ("reserva", bool(cerca_) and cerca_[0] < 10),
        ) if si]
        grupo = 1 if ("sin-campo" in marcas or "emblema" in marcas) else 2 if (sitio != "high" or rel != "gold") else 3
        hoja.append([cc, nombre, sitio, rel, grupo, marcas, ["Q:" + cerca_[1], cerca_[0]] if cerca_ else None, gemela.get(cc)])
    hoja.sort(key=lambda x: x[4])

    # El maillot en grande (§8.10), con un patrocinador de ejemplo.
    hexs = dict(COLORES_D00E)
    ejemplo = "Q:yoke.navy.yellow"
    if ejemplo not in Q.idx or not perm[Q.idx[ejemplo]]:
        ejemplo = next(k for k in pel_q if not k.startswith("Q:plain"))
    fig_e, base_e, sec_e = ejemplo[2:].split(".")
    formas_e = dict(FIGURAS_D00E)[fig_e]
    patrocinador = ("VELOTEC", "VT", "#0f9e8f")
    grande = {
        "G-frente-160": vista_frente(hexs[base_e], hexs[sec_e], formas_e, 160, patrocinador),
        "G-espalda-160": vista_espalda(hexs[base_e], hexs[sec_e], formas_e, 160, patrocinador, "Mistral Racing"),
        "G-culote-160": vista_culote(hexs["black"], hexs[sec_e], 160, patrocinador),
        "G-espalda-320": vista_espalda(hexs[base_e], hexs[sec_e], formas_e, 320, patrocinador, "Mistral Racing"),
    }
    capacidades = {z: [capacidad(c[0], px) for px in (72, 96, 160, 320)] for z, c in SPONSOR_ZONES.items()}
    capacidades["name"] = [capacidad(BACK_NAME_BOX, px) for px in (72, 96, 160, 320)]

    vocab = {}
    for vid, V in VOCABS.items():
        demo_b, demo_s = V["demo"]
        figuras = []
        for fi, (nombre, _) in enumerate(V["figuras"]):
            k = f"F-{vid}-{fi}"
            todos[k] = maillot(V, fi, demo_b, demo_s)
            figuras.append([nombre, k, nombre in V["aprox_figuras"]])
        pel = pelotones[vid]
        vocab[vid] = {"colores": [list(c) for c in V["colores"]], "figuras": figuras, "n": len(cand[vid]),
                      "nPares": n_pares[vid], "peloton": pel, "pares28": pares_bajo(Dibujos(pel, px28, 28), pel)}
    figuras_q = []
    for i, (fig, formas) in enumerate(FIGURAS_D00E):
        todos[f"F-q-{i}"] = maillot_d00e("#0f6de9", "#ffffff", formas)
        figuras_q.append([FIGURA_PANTALLA[fig], f"F-q-{i}"])

    usados_q = set(pel_q) | {c[1] for x in [*cifras.values(), *alternativas.values()] for c in x["cerca"]}
    usados_q |= {x[6][0] for x in hoja if x[6]} | {ejemplo}
    svg = {**lid28, **DISENOS_CAMPEON, **nuevas_pagina, **grande, **{k: cand_q[k] for k in sorted(usados_q)}}
    svg.update({k: todos[k] for vid in VOCABS for k in vocab[vid]["peloton"]})
    svg.update({k: todos[k] for vid in VOCABS for _, k, _ in vocab[vid]["figuras"]})
    svg.update({k: todos[k] for _, k in figuras_q})
    d00 = {
        "colores": [[n, h, "segundo" if n in ("yellow", "white") else "base"] for n, h in COLORES_D00E],
        "figuras": figuras_q,
        "cuentas": cuentas,
        "m28": dict(m28["vocabulario"]) if m28 else None,
        "n2": {"permitidos": n2["a28"]["permitidos_tras_reservar"], "distintos": n2["a28"]["distintos_tras_reservar"],
               "nacionales": n2["a28"]["nacionales_con_kit_bajo_10"], "gemelas": len(n2["a28"]["gemelas"]),
               "liderMin": n2["a28"]["lider_min"], "uciMin": n2["a28"]["uci_min"]} if n2 else None,
        "paleta": {"min": {v: m28["colores"][f"min_{v}"] for v in VISIONES},
                   "bajo10": {v: m28["colores"][f"pares_bajo10_{v}"] for v in VISIONES}} if m28 else None,
        "peloton": pel_q,
        "pares28": pares_q,
        "reservadosNac": sorted(res_nac),
        "paises": PAISES,
        "cifras": cifras,
        "cotejo": round(max(cotejo), 2) if cotejo else None,
        "cotejoNac": round(max(cotejo_nac), 2) if cotejo_nac else None,
        "hoja": hoja,
        "grande": {"ejemplo": ejemplo, "patrocinador": list(patrocinador), "capacidades": capacidades},
    }

    datos = {
        "fecha": date.today().isoformat(),
        "colour": colour.__version__,
        "chromium": chromium,
        "visiones": visiones,
        "paletas": paletas,
        "vocab": vocab,
        "d00": d00,
        "alternativas": {"opciones": [[oid, [list(x) for x in ds]] for oid, ds in OPCIONES_CAMPEON], "cifras": alternativas},
        "banderas": BANDERAS,
        "banderasWeb": {cc: list(banderas[cc]) for cc, _ in paises},
        "nombres": {k: nombre_d00e(k) for k in usados_q},
        "svg": svg,
    }
    texto = json.dumps(datos, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = Path(args.html)
    fuente = html.read_text(encoding="utf-8")
    patron = re.compile(r'(<script type="text/plain" id="datos">)(.*?)(</script>)', re.S)
    if not patron.search(fuente):
        sys.exit(f"No encuentro el bloque de datos en {html}")
    html.write_text(patron.sub(lambda m: m.group(1) + texto + m.group(3), fuente, count=1), encoding="utf-8")

    # El informe, para quien lo corre.
    print(f"Chromium {chromium}; colour-science {colour.__version__}; datos: {len(texto) / 1024:.0f} KB")
    print("vocabulario del dueño:", cuentas, "| medir28:", d00["m28"])
    print("pelotón sin repetir, pares <10 a 28 px:", pares_q, "| cotejo con medir28, mayor diferencia:", d00["cotejo"],
          "| con medir-nacional2, en las 133:", d00["cotejoNac"])
    print("hoja:", {g: sum(1 for x in hoja if x[4] == g) for g in (1, 2, 3)}, "| ejemplo en grande:", ejemplo, capacidades)
    for vid in VOCABS:
        print(vid, "pares <10 a 28 px:", vocab[vid]["pares28"])
    for k, c in {**cifras, **alternativas}.items():
        print(f"{k:14s} UCI {c['uci']}  equipo {[x[0] for x in c['cerca']]}  {c.get('fuente', 'medidas')}")


if __name__ == "__main__":
    main()
