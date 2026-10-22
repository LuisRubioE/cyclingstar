#!/usr/bin/env python3
"""Corrector L2, D-00m: el nacional sin estrella, medido a 28 px.

Reutiliza `redactor-L2/medir-nacional2.py` (su fase 2) con un solo cambio: el maillot nacional es la
bandera recortada por TORSO, con el filete y el cuello, y SIN estrella (`nacional_d00(cc, False, ...)`).
Mide, a 28 px y con el rasterizador de `opciones/medidas.py` (Chromium por Playwright):
  1. la reserva de D-00h: los maillots permitidos (tras líderes, mundial y continental en las cuatro
     visiones) a menos de 10 de algún nacional en alguna de las cuatro visiones;
  2. la misma cuenta si además se reserva, frente a los tres líderes, la distancia en grises (Ruso-028);
  3. los nacionales contra la marca de la UCI, contra los líderes (cuatro visiones y grises) y entre sí;
  4. el mundial y el continental contra los permitidos finales (la tabla de §9.2) y los líderes contra
     los permitidos finales (§9.7), en las cinco vistas.
Uso: <scratchpad>/venv/bin/python -I -B medir-nacional3.py
"""
import importlib.util
import json
import re
import sys
from pathlib import Path

import numpy as np

SCR = Path("/tmp/claude-0/-home-user-cyclingstar/47687d53-4f57-510b-bd22-ec77a69f1ecc/scratchpad")


def carga(nombre, ruta):
    spec = importlib.util.spec_from_file_location(nombre, ruta)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


N2 = carga("medir_nacional2", SCR / "redactor-L2/medir-nacional2.py")
M, K = N2.M, N2.K


def r1(x):
    return round(float(x), 1)


def main():
    paises = re.findall(r"code: '([A-Z]{2})', name: '([^']*)'", (SCR / "repo/packages/shared/src/countries.ts").read_text())
    banderas = {cc: M.bandera_web(cc, N2.FLAGS) for cc, _ in paises}
    vocab, total, ok = K.vocabulario(K.D20[:10] + [("taupe", "#876969"), ("brown", "#4b1e0f"), ("plum", "#5a4b5a")] + K.D20[10:])
    lid = K.lideres()
    senales = {"W-mundo": K.mundial(), "W-continental": K.mundial("#c0c7d2"), "V0": M.variante("#ffffff", M.bandas_h(M.UCI))}
    nac = {f"N-{cc}": M.nacional_d00(cc, False, banderas, True) for cc, _ in paises}  # para_medir ya declara xmlns:xlink
    t = [(k, s_, 28) for k, s_ in {**vocab, **senales, **lid, **nac}.items()]
    print(f"{len(t)} dibujos a 28 px", file=sys.stderr)
    px, chromium = M.rasteriza(t, SCR / "corrector-L2/trabajo-nacional3")
    V, S, L, N = (M.Dibujos(x, px, 28) for x in (vocab, senales, lid, nac))
    res_lid4 = np.zeros(len(V.claves), bool)
    res_lidg = np.zeros(len(V.claves), bool)
    for k in L.claves:
        for v in M.COLOR4:
            res_lid4 |= V.a_todos(L, k, v) < 10
        res_lidg |= V.a_todos(L, k, "gris") < 10
    res_w = np.zeros(len(V.claves), bool)
    for k in ("W-mundo", "W-continental"):
        for v in M.COLOR4:
            res_w |= V.a_todos(S, k, v) < 10
    out = {"chromium": chromium, "combinaciones": total, "contraste": ok}

    def cuenta(reservado_previo, etiqueta):
        permitidos = [c for c, r in zip(V.claves, reservado_previo) if not r]
        P = M.Dibujos(permitidos, px, 28)
        cerca = np.zeros(len(P.claves), bool)
        por_pais = {}
        for k in N.claves:
            dmin = np.full(len(P.claves), np.inf)
            peor_v = {}
            for v in M.COLOR4:
                d = P.a_todos(N, k, v)
                dmin = np.minimum(dmin, d)
            cerca |= dmin < 10
            i = int(np.argmin(dmin))
            por_pais[k[2:]] = [r1(dmin[i]), P.claves[i]]
        finales = [c for c, x in zip(P.claves, cerca) if not x]
        out[etiqueta] = {
            "permitidos_antes_de_nacionales": len(permitidos),
            "reservados_por_nacionales": int(cerca.sum()),
            "lista": sorted(c for c, x in zip(P.claves, cerca) if x),
            "permitidos": len(finales),
            "distintos": len({K.canonico(c) for c in finales}),
            "nacionales_con_kit_bajo_10": sorted(cc for cc, (d, _) in por_pais.items() if d < 10),
            "kit_mas_cercano": por_pais,
        }
        return finales

    fin4 = cuenta(res_lid4 | res_w, "cuatro_visiones")
    fing = cuenta(res_lid4 | res_lidg | res_w, "lideres_tambien_en_grises")
    out["reservados_lideres_4"] = int(res_lid4.sum())
    out["reservados_lideres_grises_extra"] = int((res_lidg & ~res_lid4).sum())
    out["lista_lideres_grises_extra"] = sorted(c for c, a, b in zip(V.claves, res_lidg, res_lid4) if a and not b)
    out["reservados_mundial_continental_extra"] = int((res_w & ~res_lid4).sum())
    # Marruecos frente a plain.red, en las cinco vistas
    i_red, i_ma = V.idx["plain.red"], N.idx["N-MA"]
    out["MA_plain_red"] = [r1(N.a_todos(V, "plain.red", v)[i_ma]) for v in M.VISIONES]
    # los nacionales contra la marca, los líderes (cinco vistas) y entre sí
    uci = {k[2:]: [r1(N.a_todos(S, "V0", v)[N.idx[k]]) for v in M.VISIONES] for k in N.claves}
    out["uci_min"] = {v: min(x[i] for x in uci.values()) for i, v in enumerate(M.VISIONES)}
    out["uci_mas_cercano_gris"] = min(uci.items(), key=lambda kv: kv[1][4])[0]
    lider4 = {k[2:]: r1(min(N.a_todos(L, x, v)[N.idx[k]] for x in L.claves for v in M.COLOR4)) for k in N.claves}
    out["lider_min_4"] = min(lider4.values())
    out["lider_min_4_pais"] = min(lider4, key=lider4.get)
    lg = {}
    for x in L.claves:
        d = N.a_todos(L, x, "gris")
        lg[x] = {"min": r1(d.min()), "pais": N.claves[int(np.argmin(d))][2:], "bajo_10": sorted(N.claves[i][2:] for i in np.where(d < 10)[0])}
    out["lideres_en_grises"] = lg
    pares = []
    for i, a in enumerate(N.claves):
        dmin = np.full(len(N.claves), np.inf)
        for v in M.COLOR4:
            dmin = np.minimum(dmin, N.a_todos(N, a, v))
        for j in range(i + 1, len(N.claves)):
            if dmin[j] < 10:
                pares.append([a[2:], N.claves[j][2:], r1(dmin[j])])
    out["gemelas"] = sorted(pares, key=lambda x: x[2])
    # el mundial, el continental y los líderes contra los permitidos finales, en las cinco vistas
    for etiqueta, fin in (("cuatro_visiones", fin4), ("lideres_tambien_en_grises", fing)):
        F = M.Dibujos(fin, px, 28)
        cerca = {}
        for k, D in (("W-mundo", S), ("W-continental", S), *((x, L) for x in L.claves)):
            fila = []
            for v in M.VISIONES:
                d = F.a_todos(D, k, v)
                i = int(np.argmin(d))
                fila.append([r1(d[i]), F.claves[i]])
            cerca[k] = fila
        out[etiqueta]["mas_cercano_de_cada_senal"] = cerca
    dest = SCR / "corrector-L2/medir-nacional3.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("hecho", file=sys.stderr)


if __name__ == "__main__":
    main()
