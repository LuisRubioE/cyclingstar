# E3 · Los scripts de medida que cita el documento

`docs/visual.md` da muchas cifras como medidas, y cada una dice con qué script se midió. Esos scripts
corrieron en el scratchpad de la sesión de diseño (20 a 22 de octubre de 2026), que se pierde con ella;
aquí está la copia de los que el documento cita, con sus salidas cuando son pequeñas, para que cada
cifra se pueda volver a medir. Las copias difieren de lo que corrió solo en el formato de Prettier y en
lo que ESLint pide para que el CI pase (un `global` y dos nombres sin uso), sin cambiar lo que miden.

## Qué hay

| Fichero                                                               | Qué mide                                                                                                                                                                                                                            | Lo cita           |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `fundamentos.py` (salida, `fundamentos.txt`)                          | los contrastes WCAG y los ΔE00 de los fundamentos que nadie había medido: el ámbito oscuro, los tonos de estado y sus fondos en las cuatro visiones y en grises                                                                     | §3                |
| `oscuro.py` (salida, `oscuro.txt`)                                    | cada pareja de texto y fondo del modo oscuro opcional (D-00i) con su umbral, y los ΔE00 de los tonos de estado en oscuro                                                                                                            | §3.3, §4 y §9     |
| `comprobar-tema.mjs`, con `tema-final.css` y `tema-final-cerrado.css` | que el `@theme` de §3.9 compila con Tailwind 4.3.3, abierto y cerrado, y resuelve las clases que dice                                                                                                                               | §3.9              |
| `clases.mjs`                                                          | si las clases nuevas que piden las correcciones resuelven con el tema cerrado                                                                                                                                                       | §3                |
| `cierre-sistema.mjs`, con `sistema-cerrado.css`                       | lo que deja de resolver el tema cerrado, fichero a fichero: 2.457 apariciones con los tokens de `sistema` y 2.740 con los de este documento                                                                                         | §5.1 y §17.21     |
| `sistema-eslint.ui.mjs`                                               | los diez selectores de `no-restricted-syntax` de la propuesta `sistema`, con los que contó 1.417 avisos en 83 ficheros                                                                                                              | §5.3              |
| `textos.mjs` (salida, `textos.out`)                                   | el ancho de los textos nuevos de `Scale5` (D-00n) en Inter y en DejaVu Sans, con Chromium                                                                                                                                           | §4.8 y §10.4      |
| `letras2.mjs` (salida, `letras2.out`)                                 | los mismos anchos con tres letras y dos pesos, y el de los nombres de equipo en la espalda a 12 px                                                                                                                                  | §8.10 y §10.4     |
| `contraste.py` y `contraste2.py`                                      | las razones WCAG de §9.1, §9.9 y §12.2, y las del filete claro sobre los fondos oscuros y de la tachadura sobre las quince muestras                                                                                                 | §8 y §9           |
| `medir28.py` (salida, `medir28.json`)                                 | los tres colores que se añaden a los doce de D-20, el vocabulario de quince colores y siete figuras a 28 px, y las señales y los líderes frente a lo permitido                                                                      | §8.1, §9.2 y §9.7 |
| `medir-nacional2.py` (salida, `medir-nacional2.json`)                 | la estrella del nacional colocada país a país (D-00f), que el dueño quitó después (D-00m); se guarda porque `medir-nacional3.py` la reutiliza                                                                                       | §9.5              |
| `medir-nacional3.py` (salida, `medir-nacional3.json`)                 | el nacional sin estrella a 28 px: la reserva por las banderas, los 491 maillots permitidos y 458 distintos, las gemelas y los nacionales frente a los líderes y la marca                                                            | §8.1, §9, §19.6   |
| `juez-cobertura-medida.py`                                            | la medida del juez de cobertura: el par de colores más cercano de la paleta del maillot de cada propuesta, y la señal de campeón por defecto de cada una y la de hoy (`ChampionMark`) frente a la marca de la UCI, a 13, 16 y 28 px | §9.2              |
| `filete.py` (salida, `filete.txt`)                                    | el filete claro del maillot (`kit-edge` y `kit-edge-strong`) mezclado sobre los cuatro fondos claros donde se pinta, con su razón WCAG, y el alfa que pediría 3:1; lo escribió el cierre para A-L1-007                              | §3.1 y §16.2      |

Además se apoyan en dos ficheros que ya estaban en el rastro: `../opciones/medidas.py`, el
rasterizador con Chromium y la simulación de daltonismo de la página de opciones, y
`../mapas/03-maillots-medida.py`, el método del mapa 03.

## Lo que no se guarda, y cómo se rehace

- `mapa03/mundo03.json` (765 KB): el mundo del mapa 03. Lo escribe `mundo.mjs`, que va dentro de
  `../mapas/03-maillots-medida.py` (su l. 38).
- `propuesta-sistema/tw/eslint.ui.json` (1 MB): la salida de ESLint con `sistema-eslint.ui.mjs` sobre
  `apps/web/src`. El PR 8 vuelve a contar los avisos con la regla definitiva (§5.3).
- `mundo05/` (154 MB): el mundo de PGlite de las capturas. Lo rehace `../capturas/mundo.mjs` (unos 15
  minutos; `../capturas/README.md`).

## Cómo se vuelven a correr

Los scripts conservan las rutas del scratchpad donde corrieron (la variable `SCR` de los de Python y
las rutas absolutas de los `.mjs`); para correrlos otra vez hay que apuntarlas a un clon del
repositorio y a esta carpeta. El entorno es el de `../ESTADO.md` («Cómo retomar si la sesión se
corta»): un clon de `58c14da` con `pnpm install --frozen-lockfile`, un entorno de Python con
`colour-science` 0.4.7 y `numpy`, y el Chromium que ya trae la máquina (`/opt/pw-browsers`, sin
`playwright install`). Los de Python se corren con `python -I -B`, para que no dejen `__pycache__`.
