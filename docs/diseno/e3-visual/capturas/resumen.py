#!/usr/bin/env python3
"""E3, mapa 05: la tabla de medidas de `capturas/README.md`, sacada de `medidas.json`.

Una fila por pantalla con sus dos anchos: el alto de la página a 360 px, el ancho del documento contra
el de la ventana, la letra más pequeña (en toda la página y solo en `main`), los caracteres de `main`
por debajo de 12 px, los objetivos táctiles de `main` por debajo de 44 px (y la altura del más bajo),
las tablas más anchas que su caja a 360 px, y los nodos que axe-core da por
contraste insuficiente (360 · 1.280).

Con `--pintura <pintura.json>`, escribe en su lugar la tabla de la primera pintura simulada (mediana de
las cargas de cada página y perfil, y el reparto de los bytes por tipo).

Uso: python3 resumen.py <medidas.json>   (escribe la tabla en Markdown por la salida)
     python3 resumen.py --pintura <pintura.json>
"""

import json
import sys
from collections import OrderedDict


def secs(ms: float) -> str:
    return f"{ms / 1000:.2f}".replace(".", ",") + " s"


def paint_table(path: str) -> None:
    data = json.load(open(path, encoding="utf-8"))
    print("| Página | Perfil | Primera pintura | Lista | Peticiones | Por la red | JS · CSS · API |")
    print("| --- | --- | --- | --- | --- | --- | --- |")
    for r in data["paints"]:
        kb = {k: round(v / 1024) for k, v in r["byType"].items()}
        split = f"{kb.get('js', 0)} · {kb.get('css', 0)} · {kb.get('api', 0)}"
        if kb.get("svg"):
            split += f" (y {kb['svg']} de SVG)"
        print(
            f"| {r['page']} (`{r['path']}`) | {r['profile']} | {secs(r['fcp'])} | {secs(r['ready'])} "
            f"| {r['requests']} | {round(r['bytes'] / 1024)} KB | {split} |"
        )


def main() -> None:
    if sys.argv[1] == "--pintura":
        paint_table(sys.argv[2])
        return
    data = json.load(open(sys.argv[1], encoding="utf-8"))
    rows: "OrderedDict[str, dict]" = OrderedDict()
    for r in data["results"]:
        base = r["file"].rsplit("-", 1)[0]
        width = r["file"].rsplit("-", 1)[1].split(".")[0]
        rows.setdefault(base, {})[width] = r
    print(
        "| Captura | Ruta | Cuenta | Alto a 360 | Ancho a 360 | Letra mín. (página · main) "
        "| Caracteres < 12 px en main | Objetivos < 44 px en main | Objetivo más bajo "
        "| Tablas más anchas que su caja a 360 | Contraste (360 · 1.280) |"
    )
    print("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    for base, w in rows.items():
        m = w.get("360")
        d = w.get("1280")
        if m is None or "error" in m:
            print(f"| {base} | | | fallo | | | | | | | |")  # la captura falló: sin medidas
            continue
        scroll = [
            f"{t['cols']} col., {t['width']} en {t['containerWidth']}"
            for t in m["tables"]
            if t["scrolls"]
        ]
        axe_m = m.get("axe") or {}
        axe_d = (d or {}).get("axe") or {}
        contrast = f"{axe_m.get('contrastNodes', 'sin axe')} · {axe_d.get('contrastNodes', 'sin axe')}"
        print(
            f"| `{base}` | `{m['url']}` | {m['who']} | {m['scrollHeight']} "
            f"| {m['scrollWidth']} / {m['innerWidth']} "
            f"| {m['font']['min']} · {m['fontMain']['min']} "
            f"| {m['fontMain']['under12']} de {m['fontMain']['total']} "
            f"| {m['targetsMain']['under44']} de {m['targetsMain']['total']} "
            f"| {m['targetsMain']['minH'] if m['targetsMain']['minH'] is not None else 'no hay'} "
            f"| {'; '.join(scroll) if scroll else 'ninguna'} | {contrast} |"
        )


if __name__ == "__main__":
    main()
