#!/usr/bin/env python3
"""E3, mapa 05: reduce las capturas a PNG de paleta para que `capturas/` quede por debajo de 8 MB.

Cada PNG pasa a una paleta de `--colores` colores (256 por defecto, por cobertura máxima, que en estas
pantallas de pocos colores no se desvía más de 28 de 255 en ningún canal) sin tramado, que deja el
texto nítido, y se guarda con `optimize`. Las de escritorio ya salen a relación 1 (1.280 px de ancho); las
del teléfono se quedan a relación 2 (720 px de ancho), como pide el encargo. Las páginas más altas se
recortan por abajo: a `--alto-movil` px de imagen las de 720 px de ancho (6.400 por defecto, 3.200 px
de página) y a `--alto-escritorio` las de 1.280 (3.600 por defecto), salvo las de `--completas` (por
defecto, las dos del plan de entrenamiento, el examen práctico de E3); el alto entero de cada página
está en `medidas.json` (`scrollHeight`) y el recorte se anota en la salida.

Uso: python3 optimizar.py <carpeta-origen> <carpeta-destino> [--colores 256]
       [--alto-movil 6400] [--alto-escritorio 3600] [--completas a.png,b.png]
"""

import sys
from pathlib import Path

from PIL import Image


def main() -> None:
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])

    def opt(name: str, default: int) -> int:
        return int(sys.argv[sys.argv.index(name) + 1]) if name in sys.argv else default

    colors = opt("--colores", 256)
    max_mobile = opt("--alto-movil", 6400)
    max_desktop = opt("--alto-escritorio", 3600)
    whole = set(
        sys.argv[sys.argv.index("--completas") + 1].split(",")
        if "--completas" in sys.argv
        else ["01-me-training-360.png", "01-me-training-1280.png"]
    )
    dst.mkdir(parents=True, exist_ok=True)
    before = after = 0
    for f in sorted(src.glob("*.png")):
        im = Image.open(f).convert("RGB")
        w, h = im.size
        limit = max_mobile if w < 1000 else max_desktop
        cut = ""
        if h > limit and f.name not in whole:
            im = im.crop((0, 0, w, limit))
            cut = f"\trecortada de {h} a {limit} px"
        q = im.quantize(colors=colors, method=Image.Quantize.MAXCOVERAGE, dither=Image.Dither.NONE)
        out = dst / f.name
        q.save(out, optimize=True)
        before += f.stat().st_size
        after += out.stat().st_size
        print(
            f"{f.name}\t{w}x{h}\t{f.stat().st_size // 1024} KB -> {out.stat().st_size // 1024} KB{cut}"
        )
    print(f"total: {before / 1048576:.2f} MB -> {after / 1048576:.2f} MB")


if __name__ == "__main__":
    main()
