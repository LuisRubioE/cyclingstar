#!/usr/bin/env python3
"""E4, mapa 05: reduce las capturas a PNG de paleta para que `capturas/` quede por debajo de unos 4 MB.

Como `docs/diseno/e3-visual/capturas/optimizar.py`: cada PNG pasa a una paleta de `--colores` colores
(128 por defecto) por cobertura máxima y sin tramado, que deja el texto nítido, y se guarda con
`optimize`. No recorta ni reescala: todas salen a relación 1 (360 o 1.280 px de ancho), y la más alta
mide 2.134 px.

Uso: python3 -I optimizar.py <carpeta-origen> <carpeta-destino> [--colores 128]
"""

import sys
from pathlib import Path

from PIL import Image


def main() -> None:
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    colors = int(sys.argv[sys.argv.index("--colores") + 1]) if "--colores" in sys.argv else 128
    dst.mkdir(parents=True, exist_ok=True)
    before = after = 0
    for f in sorted(src.glob("*.png")):
        im = Image.open(f).convert("RGB")
        q = im.quantize(colors=colors, method=Image.Quantize.MAXCOVERAGE, dither=Image.Dither.NONE)
        out = dst / f.name
        q.save(out, optimize=True)
        before += f.stat().st_size
        after += out.stat().st_size
        print(f"{f.name}\t{im.width}x{im.height}\t{f.stat().st_size // 1024} KB -> {out.stat().st_size // 1024} KB")
    print(f"total: {before / 1048576:.2f} MB -> {after / 1048576:.2f} MB")


if __name__ == "__main__":
    main()
