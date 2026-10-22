"""Redactor L2: las razones WCAG 2.x que piden §9.1, §9.9 y §12.2 y que ninguna fuente da.

Uso: <scratchpad>/venv/bin/python -I -B contraste.py
"""


def lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


PARES = [
    ("icono: gold sobre navy", "#e0a106", "#123a5c"),
    ("icono: blanco sobre navy", "#ffffff", "#123a5c"),
    ("banda mundial: CHAMPION_GOLD sobre CHAMPION_NIGHT", "#e0a526", "#14213d"),
    ("banda continental: CHAMPION_SILVER sobre CHAMPION_NIGHT", "#c0c7d2", "#14213d"),
    ("filo nacional: CHAMPION_NIGHT sobre CHAMPION_PAPER", "#14213d", "#f6f3ea"),
    ("papel contra surface", "#f6f3ea", "#ffffff"),
    ("papel contra canvas", "#f6f3ea", "#eef2f6"),
    ("lider puntos: blanco sobre #16a34a", "#ffffff", "#16a34a"),
    ("lider montana: blanco sobre #2563eb", "#ffffff", "#2563eb"),
]
COLORES = {
    "black": "#1b1d21", "navy": "#172a5b", "blue": "#0f6de9", "sky": "#4cc3ff",
    "teal": "#0f9e8f", "green": "#236102", "orange": "#f48d32", "red": "#c62639",
    "pink": "#f7418a", "purple": "#4e2cae", "yellow": "#ffd60a", "white": "#ffffff",
}

for nombre, a, b in PARES:
    print(f"{nombre}: {ratio(a, b):.2f}")
print("pecho del patrocinador: la mejor de blanco y CHAMPION_NIGHT sobre cada color")
for n, h in COLORES.items():
    w, k = ratio("#ffffff", h), ratio("#14213d", h)
    print(f"  {n} {h}: blanco {w:.2f}, noche {k:.2f} -> {'blanco' if w >= k else 'noche'} {max(w, k):.2f}")
