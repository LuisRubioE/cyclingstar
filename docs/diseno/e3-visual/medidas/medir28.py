#!/usr/bin/env python3
"""Redactor L2, tras las decisiones del dueño del 21-10-2026 (D-00b, D-00d y D-00e).

Mide tres cosas, y nada más:

  1. Los tres colores que se añaden a los doce de D-20: los que hacen mayor el mínimo de ΔE00 entre
     los pares de los quince en las tres dicromacias (Machado 2009, severidad 1, en RGB lineal), con
     el amarillo y el blanco solo de segundo color y los tres nuevos de base.
  2. El vocabulario de quince colores y siete figuras a 28 px: cuántos diseños pasan la regla de
     contraste (ΔE00 >= 20 entre base y segundo en las cinco vistas), cuántos quedan a menos de 10 de
     lo reservado (los tres líderes de D-28 y la estrella del mundial y la continental), y cuántos
     son distintos contando `halves` y su espejo como uno.
  3. Las dos señales de campeón de D-00d a 28 px: su distancia a la marca de la UCI (V0 del mapa 03
     §7.2) y a la equipación permitida más cercana, en las cuatro visiones y en grises.

Reutiliza el rasterizador (Chromium por Playwright) y la distancia dibujada de
docs/diseno/e3-visual/opciones/medidas.py, que es el método del mapa 03.

Uso: <scratchpad>/venv/bin/python -I -B medir28.py [--todas]
"""

import argparse
import importlib.util
import json
import re
import sys
from pathlib import Path

import numpy as np

REPO = Path("/home/user/cyclingstar")
SCR = Path("/tmp/claude-0/-home-user-cyclingstar/47687d53-4f57-510b-bd22-ec77a69f1ecc/scratchpad")
FLAGS = SCR / "repo/apps/web/node_modules/flag-icons/flags/4x3"
spec = importlib.util.spec_from_file_location("medidas", REPO / "docs/diseno/e3-visual/opciones/medidas.py")
M = importlib.util.module_from_spec(spec)
spec.loader.exec_module(M)
colour = M.colour

DICRO = ("protan", "deutan", "tritan")
D20 = [
    ("black", "#1b1d21"), ("navy", "#172a5b"), ("blue", "#0f6de9"), ("sky", "#4cc3ff"), ("teal", "#0f9e8f"),
    ("green", "#236102"), ("orange", "#f48d32"), ("red", "#c62639"), ("pink", "#f7418a"), ("purple", "#4e2cae"),
    ("yellow", "#ffd60a"), ("white", "#ffffff"),
]
LIDER_BASES = {"gc": "#facc15", "points": "#16a34a", "kom": "#2563eb"}


def hexes(arr):
    return ["#%02x%02x%02x" % tuple(int(round(c * 255)) for c in x) for x in arr]


def labs(rgb, v):
    return M.lab(np.asarray(rgb, float), v)


def de(a, b):
    return colour.difference.delta_E_CIE2000(a, b)


# ------------------------------------------------------------------------- 1. los tres colores


def tres_colores():
    """El trío que hace mayor el peor par en las tres dicromacias (desempate: el de visión normal), entre
    los candidatos que quedan a 20 o más del blanco y del amarillo del líder en las cuatro visiones: los
    tres son de base, y un cuerpo casi blanco o casi amarillo caería en lo reservado (D-00e)."""
    fijos = np.array([M.hex_rgb(h) for _, h in D20])
    pasos = np.linspace(0, 1, 18)  # 18 niveles por canal: 5.832 candidatos
    pool = np.array(np.meshgrid(pasos, pasos, pasos, indexing="ij")).reshape(3, -1).T
    V5 = DICRO + ("normal", "gris")
    L_pool = {v: labs(pool, v) for v in V5}
    L_fij = {v: labs(fijos, v) for v in V5}
    ind = np.full(len(pool), np.inf)
    ind_n = de(L_pool["normal"][:, None, :], L_fij["normal"][None, :, :]).min(1)
    for v in DICRO:
        ind = np.minimum(ind, de(L_pool[v][:, None, :], L_fij[v][None, :, :]).min(1))
    cuerpo = np.array([M.hex_rgb("#ffffff"), M.hex_rgb("#facc15")])
    wy = np.full(len(pool), np.inf)
    for v in ("normal",) + DICRO:
        wy = np.minimum(wy, de(L_pool[v][:, None, :], labs(cuerpo, v)[None, :, :]).min(1))
    validos = np.where((wy >= 20) & (ind >= 12.3))[0]
    top = validos[np.argsort(ind[validos])[-320:]]
    n = len(top)
    m = np.full((n, n), np.inf)
    for v in DICRO:
        a = L_pool[v][top]
        m = np.minimum(m, de(a[:, None, :], a[None, :, :]))
    an = L_pool["normal"][top]
    mn = de(an[:, None, :], an[None, :, :])
    ind_t, indn_t = ind[top], ind_n[top]
    best, trio = (-1.0, -1.0), None
    for i in range(n):
        for j in range(i + 1, n):
            base = min(ind_t[i], ind_t[j], m[i, j])
            if base < best[0]:
                continue
            base_n = min(indn_t[i], indn_t[j], mn[i, j])
            k = np.arange(j + 1, n)
            vals = np.minimum.reduce([np.full(len(k), base), ind_t[k], m[i, k], m[j, k]])
            valn = np.minimum.reduce([np.full(len(k), base_n), indn_t[k], mn[i, k], mn[j, k]])
            if not len(k):
                continue
            orden = np.lexsort((valn, vals))
            c = orden[-1]
            if (vals[c], valn[c]) > best:
                best = (float(vals[c]), float(valn[c]))
                trio = (top[i], top[j], top[k[c]])
    nuevos = pool[list(trio)]
    quince = np.vstack([fijos, nuevos])
    informe = {"nuevos": hexes(nuevos), "min_dicro_de_los_nuevos": round(best[0], 1), "min_normal_de_los_nuevos": round(best[1], 1)}
    for v in ("normal",) + DICRO + ("gris",):
        L = labs(quince, v)
        d = de(L[:, None, :], L[None, :, :])
        iu = np.triu_indices(15, 1)
        informe[f"min_{v}"] = round(float(d[iu].min()), 1)
        informe[f"pares_bajo10_{v}"] = int((d[iu] < 10).sum())
    for v in DICRO:
        L = labs(fijos, v)
        d = de(L[:, None, :], L[None, :, :])
        iu = np.triu_indices(12, 1)
        informe[f"doce_min_{v}"] = round(float(d[iu].min()), 1)
    lid = np.array([M.hex_rgb(h) for h in LIDER_BASES.values()])
    informe["a_lideres"] = {}
    for h, c in zip(hexes(nuevos), nuevos):
        informe["a_lideres"][h] = {v: [round(float(x), 1) for x in de(labs(c[None], v), labs(lid, v))] for v in ("normal",) + DICRO}
        informe.setdefault("a_blanco_y_amarillo", {})[h] = round(float(wy[np.argmin(np.abs(pool - c).sum(1))]), 1)
    return informe, hexes(nuevos)


# --------------------------------------------------------------- 2. el vocabulario a 28 px

FIGURAS = [
    ("plain", []),
    ("band", [M.r(0, 23, 48, 10)]),
    ("hoops", [M.r(0, 17, 48, 7), M.r(0, 30, 48, 7)]),
    ("halves", [M.r(24, 0, 24, 48)]),
    ("yoke", [M.r(0, 0, 48, 19)] + M.SLEEVES),
    ("sides", [M.r(0, 0, 21, 48), M.r(27, 0, 21, 48)]),
    ("sash", [M.p(M.SASH_ID)]),
]
FILETE = 'stroke="#000" stroke-opacity=".3" stroke-width="1"'  # kitFiletU(28) = 1 u (§8.3)


def maillot(base, sec, formas):
    cuerpo = f'<use href="#t__ID__" fill="{base}"/>'
    if formas:
        cuerpo += f'<g clip-path="url(#c__ID__)">{M.relleno(formas, sec)}</g>'
    cuerpo += f'<use href="#t__ID__" fill="none" {FILETE}/>'
    cuerpo += f'<path d="{M.COLLAR}" fill="#fff" fill-opacity=".85"/>'
    return M.doc(M.TORSO_DEFS, cuerpo)


def vocabulario(colores):
    nombres = [n for n, _ in colores]
    bases = [i for i, (n, _) in enumerate(colores) if n not in ("yellow", "white")]
    out, contraste_ok, total = {}, 0, 0
    for fi, (fig, formas) in enumerate(FIGURAS):
        if not formas:
            for b in bases:
                out[f"plain.{nombres[b]}"] = maillot(colores[b][1], "#ffffff", [])
                total += 1
                contraste_ok += 1
            continue
        for b in bases:
            for s in range(len(colores)):
                if s == b:
                    continue
                total += 1
                if all(M.de_colores(colores[b][1], colores[s][1], v) >= 20 for v in M.VISIONES):
                    contraste_ok += 1
                    out[f"{fig}.{nombres[b]}.{nombres[s]}"] = maillot(colores[b][1], colores[s][1], formas)
    return out, total, contraste_ok


def canonico(code):
    p = code.split(".")
    if p[0] == "halves" and p[2] not in ("yellow", "white"):
        a, b = sorted([p[1], p[2]])
        return f"halves.{a}.{b}"
    return code


# ------------------------------------------------------------------ 3. las señales y los líderes

LOGO_STAR = "M36 2 L39.2 9.2 L47 10 L41.2 15.3 L42.9 23 L36 19.1 L29.1 23 L30.8 15.3 L25 10 L32.8 9.2 Z"  # Logo.tsx l. 31
SEIS = ["#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#5e35b1"]  # el espectro natural, sin el rosa
NAVY_DARK = "#0b2740"
GOLD = "#e0a526"


def estrella(ancho_u, cx, cy, relleno, filo_u):
    s = ancho_u / 22.0  # la estrella del logotipo mide 22 × 21 en su viewBox de 72 × 60
    return (
        f'<path d="{LOGO_STAR}" transform="translate({cx} {cy}) scale({s:.4f}) translate(-36 -12.5)" '
        f'fill="{relleno}" stroke="{NAVY_DARK}" stroke-width="{filo_u / s:.3f}" stroke-linejoin="round"/>'
    )


def mundial(relleno="url(#arco__ID__)"):
    stops = "".join(f'<stop offset="{i / 5:.3f}" stop-color="{c}"/>' for i, c in enumerate(SEIS))
    defs = f'<linearGradient id="arco__ID__" x1="0" y1="0" x2="1" y2="1">{stops}</linearGradient>'
    cuerpo = (
        f'<use href="#t__ID__" fill="#ffffff"/><use href="#t__ID__" fill="none" {M.LEAD}/>'
        f'<path d="{M.COLLAR}" fill="#fff" fill-opacity=".85"/>' + estrella(18, 24, 28.5, relleno, 1.5)
    )
    return M.doc(M.TORSO_DEFS + defs, cuerpo)


def bandera(cc):
    fuente = (FLAGS / f"{cc.lower()}.svg").read_text(encoding="utf-8")
    m = re.search(r"<svg([^>]*)>(.*)</svg>", fuente, re.S)
    attrs, dentro = m.group(1), m.group(2)
    vb = re.search(r'viewBox="([^"]+)"', attrs).group(1)
    dentro = re.sub(r'id="([^"]+)"', lambda x: f'id="{cc}-{x.group(1)}"', dentro)
    dentro = re.sub(r"url\(#([^)]+)\)", lambda x: f"url(#{cc}-{x.group(1)})", dentro)
    dentro = re.sub(r'href="#([^"]+)"', lambda x: f'href="#{cc}-{x.group(1)}"', dentro)
    anidada = (
        f'<svg x="1.333" y="8" width="45.333" height="34" viewBox="{vb}" '
        f'preserveAspectRatio="xMidYMid slice" xmlns:xlink="http://www.w3.org/1999/xlink">{dentro}</svg>'
    )
    cuerpo = (
        f'<use href="#t__ID__" fill="#ffffff"/><g clip-path="url(#c__ID__)">{anidada}</g>'
        f'<use href="#t__ID__" fill="none" {M.LEAD}/><path d="{M.COLLAR}" fill="#fff" fill-opacity=".85"/>'
        + estrella(10, 24, 25, GOLD, 1.0)
    )
    return M.doc(M.TORSO_DEFS, cuerpo)


def lideres():
    def uno(base, extra):
        return M.doc(M.TORSO_DEFS, f'<use href="#t__ID__" fill="{base}"/>{extra}<use href="#t__ID__" fill="none" {M.LEAD}/>')

    banda = f'<g clip-path="url(#c__ID__)">{M.relleno([M.r(0, 23, 48, 10)], "#ffffff")}</g>'
    lunares = "".join(f'<circle cx="{x}" cy="{y}" r="4" fill="#ffffff"/>' for x, y in M.DOTS)
    return {"L-gc": uno("#facc15", ""), "L-points": uno("#16a34a", banda), "L-kom": uno("#2563eb", lunares)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--todas", action="store_true", help="las 133 nacionales, no solo la muestra")
    args = ap.parse_args()
    trabajo = SCR / "redactor-L2/trabajo28"
    res = {}

    inf, nuevos = tres_colores()
    res["colores"] = inf
    print(json.dumps(inf, ensure_ascii=False), file=sys.stderr)
    # nombres de pantalla de los tres (los elige el redactor por su tono; §8.1)
    nombre_de = {"#876969": "taupe", "#4b1e0f": "brown", "#5a4b5a": "plum"}
    nombres_nuevos = [nombre_de.get(h, f"nuevo{i + 1}") for i, h in enumerate(nuevos)]
    colores = D20[:10] + list(zip(nombres_nuevos, nuevos)) + D20[10:]

    vocab, total, ok = vocabulario(colores)
    res["vocabulario"] = {"combinaciones": total, "pasan_contraste": ok}
    paises = re.findall(r"code: '([A-Z]{2})'", (SCR / "repo/packages/shared/src/countries.ts").read_text())
    muestra = paises if args.todas else ["IT", "ES", "BE", "FR", "DE", "NL", "PL", "JP", "GB", "US", "CO", "KR"]
    senales = {"W-mundo": mundial(), "W-continental": mundial("#c0c7d2"), "V0": M.variante("#ffffff", M.bandas_h(M.UCI))}
    senales.update({f"N-{cc}": bandera(cc) for cc in muestra})
    lid = lideres()
    trabajos = [(k, s, 28) for k, s in {**vocab, **senales, **lid}.items()]
    print(f"pintando {len(trabajos)} dibujos a 28 px", file=sys.stderr)
    px, chromium = M.rasteriza(trabajos, trabajo)
    res["chromium"] = chromium
    V = M.Dibujos(vocab, px, 28)
    S = M.Dibujos(senales, px, 28)
    L = M.Dibujos(lid, px, 28)

    # lo reservado por distancia: a menos de 10 de un líder o de la estrella del mundial o la continental
    reservado = np.zeros(len(V.claves), bool)
    for k in L.claves:
        for v in M.COLOR4:
            reservado |= V.a_todos(L, k, v) < 10
    for k in ("W-mundo", "W-continental"):
        for v in M.COLOR4:
            reservado |= V.a_todos(S, k, v) < 10
    permitidos = [c for c, r in zip(V.claves, reservado) if not r]
    res["vocabulario"].update({
        "reservados_por_distancia": int(reservado.sum()),
        "permitidos": len(permitidos),
        "permitidos_distintos_con_espejo": len({canonico(c) for c in permitidos}),
    })
    P = M.Dibujos(permitidos, px, 28)

    def fila(conj, k):
        uci = [M.r1(conj.a_todos(S, "V0", v)[conj.idx[k]]) for v in M.VISIONES] if conj is S else None
        cerca = []
        for v in M.VISIONES:
            d = P.a_todos(conj, k, v)
            i = int(np.argmin(d))
            cerca.append([M.r1(d[i]), P.claves[i]])
        if conj is L:
            otros = [x for x in L.claves if x != k]
            dl = M.r1(min(L.a_todos(L, k, v)[L.idx[o]] for v in M.COLOR4 for o in otros))
        else:
            dl = M.r1(min(L.a_todos(conj, k, v).min() for v in M.COLOR4))
        return {"uci": uci, "cerca": cerca, "lider_mas_cercano_4v": dl}

    res["senales"] = {k: fila(S, k) for k in S.claves if k != "V0"}
    # si las nacionales se reservaran por distancia: los permitidos a menos de 10 de alguna, en 4 visiones
    cerca_nac = np.zeros(len(P.claves), bool)
    for k in S.claves:
        if k.startswith("N-"):
            for v in M.COLOR4:
                cerca_nac |= P.a_todos(S, k, v) < 10
    nac = [k for k in S.claves if k.startswith("N-")]
    peor = {v: min(float(P.a_todos(S, k, v).min()) for k in nac) for v in M.VISIONES}
    bajo10 = [k for k in nac if min(float(P.a_todos(S, k, v).min()) for v in M.COLOR4) < 10]
    res["nacionales"] = {"cuantas": len(nac), "kits_a_menos_de_10_de_alguna": int(cerca_nac.sum()),
                         "peor_distancia_por_vision": {v: M.r1(x) for v, x in peor.items()},
                         "nacionales_con_un_kit_a_menos_de_10": len(bajo10), "lista": [k[2:] for k in bajo10],
                         "uci_min": {v: M.r1(min(S.a_todos(S, "V0", v)[S.idx[k]] for k in nac)) for v in M.VISIONES},
                         "kits_cercanos": [c for c, x in zip(P.claves, cerca_nac) if x],
                         "permitidos_reservando_nacionales": int((~cerca_nac).sum()),
                         "distintos_reservando_nacionales": len({canonico(c) for c, x in zip(P.claves, cerca_nac) if not x})}
    res["lideres"] = {k: fila(L, k) for k in L.claves}
    salida = SCR / "redactor-L2/medir28.json"
    salida.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(res, ensure_ascii=False)[:4000])


if __name__ == "__main__":
    main()
