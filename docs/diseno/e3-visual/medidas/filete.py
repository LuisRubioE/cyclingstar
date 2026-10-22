"""Cierre de E3 (A-L1-007): el filete claro del maillot, medido.
kit-edge = rgb(0 0 0 / 0.3) y kit-edge-strong = rgb(0 0 0 / 0.35) (§3.1), mezclados en sRGB sobre cada
fondo claro donde se pinta un maillot (surface, surface-2, canvas, own-tint), y su razón WCAG 2.x contra
ese fondo y contra los cuerpos claros que separa (el blanco del mundial y el amarillo de la general).
Uso: python3 -I -B filete.py
"""
def lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def lum(rgb):
    r, g, b = rgb
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def mezcla(alfa, fondo):
    # negro con alfa sobre el fondo, en sRGB (como pinta el navegador)
    return tuple(round(c * (1 - alfa)) for c in fondo)

def wcag(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True)
    return (x + 0.05) / (y + 0.05)

FONDOS = {'surface': '#ffffff', 'surface-2': '#f5f7fa', 'canvas': '#eef2f6', 'own-tint': '#fdf4dc'}
CUERPOS = {'el blanco del mundial': '#ffffff', 'el amarillo de la general': '#facc15'}
for nombre, alfa in (('kit-edge', 0.30), ('kit-edge-strong', 0.35)):
    for f, h in FONDOS.items():
        c = mezcla(alfa, hexrgb(h))
        print(f'{nombre:16} sobre {f:9} -> #{c[0]:02x}{c[1]:02x}{c[2]:02x}  {wcag(c, hexrgb(h)):.2f}:1')
for f, h in FONDOS.items():
    for cu, hc in CUERPOS.items():
        print(f'{cu} sobre {f}: {wcag(hexrgb(hc), hexrgb(h)):.2f}:1')
# Qué alfa haría falta para 3:1 sobre cada fondo
for f, h in FONDOS.items():
    a = next(x / 1000 for x in range(1000) if wcag(mezcla(x / 1000, hexrgb(h)), hexrgb(h)) >= 3)
    print(f'alfa mínima para 3:1 sobre {f}: {a:.3f}')
