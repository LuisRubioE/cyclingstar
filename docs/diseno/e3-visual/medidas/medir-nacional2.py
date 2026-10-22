#!/usr/bin/env python3
"""Redactor L2, D-00f y D-00h: la regla de la estrella del nacional, aplicada y medida.

  1. Para cada bandera y cada sitio del pecho (high, center, left, right): la huella de la estrella
     de 10 u con su filo, el color dominante bajo ella y en un disco de 9 u alrededor, y qué parte de
     la huella no es del dominante. Un sitio es «campo» si la huella cubre menos del 12 % de otro
     color y su dominante es el del disco (a menos de 10 de ΔE00): la estrella no pisa un emblema ni
     una raya entre franjas, ni se sienta dentro de un emblema más grande que ella.
  2. La regla: el primer sitio que es campo, en ese orden; el relleno oro, o blanco si la bandera ya
     lleva una estrella dorada o amarilla, o navy-dark con filo blanco si el campo es dorado o
     amarillo (ΔE00 del oro al campo, en visión normal, por debajo de 20).
  3. Las dos letras en la caja baja del pecho: blanco o navy-dark, el de más contraste WCAG.
  4. A 28 px, con la regla aplicada: los nacionales contra los maillots permitidos (la reserva de
     D-00h), contra la marca de la UCI y contra los líderes, y entre sí (las gemelas).
  5. Dos hojas de contactos (72 px con letras y 28 px) para mirarlas.

Uso: <scratchpad>/venv/bin/python -I -B medir-nacional2.py
"""

import importlib.util
import json
import re
import sys
from pathlib import Path

import numpy as np

REPO = Path("/home/user/cyclingstar")
SCR = Path("/tmp/claude-0/-home-user-cyclingstar/47687d53-4f57-510b-bd22-ec77a69f1ecc/scratchpad")
FLAGS = SCR / "repo/apps/web/node_modules/flag-icons/flags/4x3"


def carga(nombre, ruta):
    spec = importlib.util.spec_from_file_location(nombre, ruta)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


M = carga("medidas", REPO / "docs/diseno/e3-visual/opciones/medidas.py")
K = carga("medir28", SCR / "redactor-L2/medir28.py")
colour = M.colour

GOLD, WHITE, NAVY = "#e0a526", "#ffffff", "#0b2740"
SITIOS = {"high": (24, 14.8), "right": (31.5, 14.5), "left": (16.5, 14.5), "center": (24, 25)}  # en este orden: el escudo va a la derecha de quien mira
CAJA_LETRAS = (18, 32.5, 12, 6)
CUBRE_MAX = 0.12
ESTRELLA_AMARILLA = {"VN", "CN", "CM", "BF", "MY", "MO", "CV", "ET", "SR", "PH"}  # ya llevan una


def xl(svg):
    return svg.replace('<svg viewBox="0 0 48 48">', '<svg viewBox="0 0 48 48" xmlns:xlink="http://www.w3.org/1999/xlink">', 1)


def estrella(cx, cy, relleno, filo, ancho=10.0, filo_u=1.0):
    s = ancho / 22.0
    return (f'<path d="{M.LOGO_STAR}" transform="translate({cx:g} {cy:g}) scale({s:.4f}) translate(-36 -12.5)" '
            f'fill="{relleno}" stroke="{filo}" stroke-width="{filo_u / s:.3f}" stroke-linejoin="round"/>')


def mascara(cuerpo):
    return M.doc("", cuerpo)


def nacional(cc, banderas, sitio, relleno, letras=None):
    base = xl(M.nacional_d00(cc, False, banderas, True))
    rel = {"gold": GOLD, "white": WHITE, "navy": NAVY}[relleno]
    filo = WHITE if relleno == "navy" else NAVY
    extra = estrella(*SITIOS[sitio], rel, filo)
    if letras:
        fill, edge = letras
        extra += (f'<text x="24" y="38.5" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8" '
                  f'font-weight="700" letter-spacing="0.32" fill="{fill}" stroke="{edge}" stroke-width="2" '
                  f'paint-order="stroke" stroke-linejoin="round">{cc}</text>')
    return base.replace("</svg>", extra + "</svg>") if base.endswith("</svg>") else base


def dominante(rgb):
    q = np.clip((rgb * 15).round().astype(int), 0, 15)
    clave = q[:, 0] * 256 + q[:, 1] * 16 + q[:, 2]
    vals, cuenta = np.unique(clave, return_counts=True)
    return rgb[clave == vals[np.argmax(cuenta)]].mean(0)


def de(a, b, v="normal"):
    return colour.difference.delta_E_CIE2000(M.lab(np.asarray(a, float), v), M.lab(np.asarray(b, float), v))


def wcag(a, b):
    la, lb = sorted([M.luminancia(np.asarray(a, float)), M.luminancia(np.asarray(b, float))], reverse=True)
    return float((la + 0.05) / (lb + 0.05))


def hexs(c):
    return "#%02x%02x%02x" % tuple(int(round(x * 255)) for x in c)


def hoja(svgs, celda, lado, cols=12):
    partes = []
    for i, (cc, svg) in enumerate(svgs):
        x, y = (i % cols) * (celda + lado), (i // cols) * (celda + lado)
        s = svg.replace("__ID__", cc).replace('<svg viewBox="0 0 48 48" xmlns:xlink="http://www.w3.org/1999/xlink">',
                                               f'<svg x="{x}" y="{y}" width="{celda}" height="{celda}" viewBox="0 0 48 48">', 1)
        partes.append(s)
        if lado >= 10:
            partes.append(f'<text x="{x + celda / 2}" y="{y + celda + lado - 2}" text-anchor="middle" font-size="10" '
                          f'font-family="sans-serif" fill="#000">{cc}</text>')
    n = cols * (celda + lado)
    return (f'<svg viewBox="0 0 {n} {n}" xmlns:xlink="http://www.w3.org/1999/xlink"><rect width="{n}" height="{n}" fill="#eef2f6"/>'
            + "".join(partes) + "</svg>"), n


def main():
    paises = re.findall(r"code: '([A-Z]{2})', name: '([^']*)'", (SCR / "repo/packages/shared/src/countries.ts").read_text())
    banderas = {cc: M.bandera_web(cc, FLAGS) for cc, _ in paises}
    trabajos = [(f"F-{cc}", xl(M.nacional_d00(cc, False, banderas, True)), 96) for cc, _ in paises]
    s = 10 / 22.0
    for k, (cx, cy) in SITIOS.items():
        trabajos.append((f"H-{k}", mascara(
            f'<path d="{M.LOGO_STAR}" transform="translate({cx:g} {cy:g}) scale({s:.4f}) translate(-36 -12.5)" '
            f'fill="#000" stroke="#000" stroke-width="{1 / s:.3f}" stroke-linejoin="round"/>'), 96))
        trabajos.append((f"D-{k}", mascara(f'<circle cx="{cx}" cy="{cy}" r="9" fill="#000"/>'), 96))
    x, y, w, h = CAJA_LETRAS
    trabajos.append(("H-letras", mascara(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#000"/>'), 96))
    print(f"fase 1: {len(trabajos)} dibujos", file=sys.stderr)
    px, chromium = M.rasteriza(trabajos, SCR / "redactor-L2/trabajo-nacional2")
    out = {"chromium": chromium, "paises": {}}
    regla = {}
    for cc, nombre in paises:
        rgb, alfa = px[(f"F-{cc}", 96)]
        fila = {"nombre": nombre, "sitios": {}}
        elegido = None
        for k in SITIOS:
            m = px[(f"H-{k}", 96)][1] > 0.5
            d = (px[(f"D-{k}", 96)][1] > 0.5) & (alfa > 0.5)
            dom, ani = dominante(rgb[m]), dominante(rgb[d])
            cubre = float((de(rgb[m], np.broadcast_to(dom, rgb[m].shape)) > 10).mean())
            iguales = float(de(dom, ani)) < 10
            campo = cubre <= CUBRE_MAX and iguales
            fila["sitios"][k] = {"dominante": hexs(dom), "disco": hexs(ani), "cubre": round(cubre, 3), "campo": campo,
                                 "oro_normal": round(float(de(M.hex_rgb(GOLD), dom)), 1),
                                 "blanco_normal": round(float(de(M.hex_rgb(WHITE), dom)), 1)}
            if campo and elegido is None:
                elegido = k
        revisar = elegido is None
        sitio = elegido or "high"
        campo_c = fila["sitios"][sitio]
        if cc in ESTRELLA_AMARILLA:
            relleno = "white" if campo_c["blanco_normal"] >= 20 else "navy"
        elif campo_c["oro_normal"] < 20:
            relleno = "navy"
        else:
            relleno = "gold"
        dom = M.hex_rgb(campo_c["dominante"])
        rel = M.hex_rgb({"gold": GOLD, "white": WHITE, "navy": NAVY}[relleno])
        filo = M.hex_rgb(WHITE if relleno == "navy" else NAVY)
        se_lee = min(max(float(de(rel, dom, v)), float(de(filo, dom, v))) for v in M.VISIONES)
        ml = px[("H-letras", 96)][1] > 0.5
        dl = dominante(rgb[ml])
        cb, cn = wcag(M.hex_rgb(WHITE), dl), wcag(M.hex_rgb(NAVY), dl)
        letras = ("#ffffff", NAVY) if cb >= cn else (NAVY, "#ffffff")
        fila.update({"sitio": sitio, "relleno": relleno, "revisar": revisar, "se_lee": round(se_lee, 1),
                     "letras": {"dominante": hexs(dl), "relleno": letras[0], "wcag": round(max(cb, cn), 2)}})
        regla[cc] = (sitio, relleno, letras)
        out["paises"][cc] = fila
    # fase 2: a 28 px con la regla, y las hojas
    vocab, total, ok = K.vocabulario(K.D20[:10] + [("taupe", "#876969"), ("brown", "#4b1e0f"), ("plum", "#5a4b5a")] + K.D20[10:])
    lid = K.lideres()
    senales = {"W-mundo": K.mundial(), "W-continental": K.mundial("#c0c7d2"), "V0": M.variante("#ffffff", M.bandas_h(M.UCI))}
    nac = {f"N-{cc}": nacional(cc, banderas, *regla[cc][:2]) for cc, _ in paises}
    t2 = [(k, s_, 28) for k, s_ in {**vocab, **senales, **lid, **nac}.items()]
    s72, n72 = hoja([(cc, nacional(cc, banderas, *regla[cc])) for cc, _ in paises], 72, 12)
    s28, n28 = hoja([(cc, nacional(cc, banderas, *regla[cc][:2])) for cc, _ in paises], 28, 8)
    t2 += [("HOJA72", s72, n72), ("HOJA28", s28, n28)]
    print(f"fase 2: {len(t2)} dibujos", file=sys.stderr)
    px2, _ = M.rasteriza(t2, SCR / "redactor-L2/trabajo-nacional2b")
    np.save(SCR / "redactor-L2/hoja72.npy", (px2[("HOJA72", n72)][0].reshape(n72, n72, 3) * 255).astype(np.uint8))
    np.save(SCR / "redactor-L2/hoja28.npy", (px2[("HOJA28", n28)][0].reshape(n28, n28, 3) * 255).astype(np.uint8))
    V = M.Dibujos(vocab, px2, 28)
    S = M.Dibujos(senales, px2, 28)
    L = M.Dibujos(lid, px2, 28)
    N = M.Dibujos(nac, px2, 28)
    reservado = np.zeros(len(V.claves), bool)
    for k in L.claves:
        for v in M.COLOR4:
            reservado |= V.a_todos(L, k, v) < 10
    for k in ("W-mundo", "W-continental"):
        for v in M.COLOR4:
            reservado |= V.a_todos(S, k, v) < 10
    permitidos = [c for c, r in zip(V.claves, reservado) if not r]
    P = M.Dibujos(permitidos, px2, 28)
    cerca = np.zeros(len(P.claves), bool)
    peor = {}
    por_pais = {}
    for k in N.claves:
        dmin = np.full(len(P.claves), np.inf)
        for v in M.COLOR4:
            d = P.a_todos(N, k, v)
            dmin = np.minimum(dmin, d)
        cerca |= dmin < 10
        i = int(np.argmin(dmin))
        por_pais[k[2:]] = [round(float(dmin[i]), 1), P.claves[i]]
    uci = {}
    for k in N.claves:
        uci[k[2:]] = [M.r1(N.a_todos(S, "V0", v)[N.idx[k]]) for v in M.VISIONES]
    lider = {k[2:]: M.r1(min(N.a_todos(L, x, v)[N.idx[k]] for x in L.claves for v in M.COLOR4)) for k in N.claves}
    pares = []
    claves = N.claves
    for i, a in enumerate(claves):
        dmin = np.full(len(claves), np.inf)
        for v in M.COLOR4:
            dmin = np.minimum(dmin, N.a_todos(N, a, v))
        for j in range(i + 1, len(claves)):
            if dmin[j] < 10:
                pares.append([a[2:], claves[j][2:], round(float(dmin[j]), 1)])
    out["a28"] = {
        "permitidos": len(permitidos),
        "kits_a_menos_de_10_de_algun_nacional": int(cerca.sum()),
        "lista": [c for c, x in zip(P.claves, cerca) if x],
        "permitidos_tras_reservar": int((~cerca).sum()),
        "distintos_tras_reservar": len({K.canonico(c) for c, x in zip(P.claves, cerca) if not x}),
        "nacionales_con_kit_bajo_10": sorted([cc for cc, (d, _) in por_pais.items() if d < 10]),
        "kit_mas_cercano": por_pais,
        "uci": uci,
        "uci_min": {v: min(x[i] for x in uci.values()) for i, v in enumerate(M.VISIONES)},
        "lider_min": min(lider.values()),
        "gemelas": sorted(pares, key=lambda x: x[2]),
    }
    (SCR / "redactor-L2/medir-nacional2.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("hecho", file=sys.stderr)


if __name__ == "__main__":
    main()
