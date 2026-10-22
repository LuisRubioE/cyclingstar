"""Corrector L2: contrastes WCAG 2.x del filete claro sobre los fondos oscuros y de la tachadura sobre las quince muestras."""
def lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def lum(h):
    r, g, b = (int(h[i:i + 2], 16) for i in (1, 3, 5))
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
def wcag(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True)
    return (x + 0.05) / (y + 0.05)
def mezcla(fg, alfa, bg):
    f = [int(fg[i:i + 2], 16) for i in (1, 3, 5)]; g = [int(bg[i:i + 2], 16) for i in (1, 3, 5)]
    return '#%02x%02x%02x' % tuple(round(alfa * a + (1 - alfa) * b) for a, b in zip(f, g))
for fondo in ('#0b2740', '#123a5c', '#b42318'):
    print('filete claro sobre', fondo, round(wcag(mezcla('#ffffff', 0.6, fondo), fondo), 2))
K = dict(black='#1b1d21', navy='#172a5b', blue='#0f6de9', sky='#4cc3ff', teal='#0f9e8f', green='#236102', orange='#f48d32',
         red='#c62639', pink='#f7418a', purple='#4e2cae', taupe='#876969', brown='#4b1e0f', plum='#5a4b5a', yellow='#ffd60a', white='#ffffff')
for borde in ('#10202f', '#0b2740'):
    peor = min((max(wcag('#ffffff', c), wcag(borde, c)), n) for n, c in K.items())
    print('tachadura blanca con filo', borde, 'peor:', round(peor[0], 2), peor[1])
print('line-strong sobre surface', round(wcag('#7b8794', '#ffffff'), 2), '| ink sobre surface', round(wcag('#10202f', '#ffffff'), 2))
