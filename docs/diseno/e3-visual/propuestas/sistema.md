# Propuesta E3 · lente `sistema`: el sistema visual como código

Árbol `58c14da` (`main`, 20 de octubre de 2026). Base de hechos: los cinco mapas y las capturas 01,
02, 03, 05, 06, 08, 09, 11, 15, 16, 24, 40 a 42 y 48, a 360 y 1.280 px. Leídos enteros `index.css`,
`Panel.tsx`, `ShowAll.tsx`, `TextField.tsx`, `VeilNotice.tsx`, `RiderName.tsx`, `StarRating.tsx`,
`Jersey.tsx`, `TeamManager.tsx`, `PlanLadder.tsx`, `Training.tsx`, `WornJerseyIcon.tsx`, `main.tsx`,
`vite.config.ts`, `index.html`, `eslint.config.js` y `vitest.config.ts`; por tramos, `Tabs.tsx`,
`visuals.ts`, `App.tsx`, `queryClient.ts`, `FixedOverlay.tsx`, `CueCard.tsx`, `ci.yml`, `app.ts`,
`spaShell.ts`, `spoiler.ts`, `routes/riders.ts`, `contracts.ts`, `jerseys.ts`, `db/src/training.ts`,
`train.ts`, `riderSchedule.ts`, el `theme.css` de Tailwind 4.3.3 y `docs/retransmision.md` §7.9.
**Medidas propias** en `<scratchpad>/propuesta-sistema/`, sin tocar repositorio ni clon: `tokens.py` y
`tokens_alt.py` (contraste), `paleta.py`, `subconj.py`, `maillots.py` y `mundial.py` (maillot y campeón,
con el rasterizador de `mapas/03-maillots-medida.py` y el mundo de 219 equipos y 310 pelotones del mapa
03), `de00.py` (ΔE00 vectorizado, idéntico a colour-science en 20.000 pares), `tw/cierre.mjs` y
`tw/espaciado.mjs` (el tema cerrado contra las 146 fuentes de producción, con el escáner y el sistema de
diseño de Tailwind 4.3.3 del clon), `tw/eslint.ui.mjs` (las reglas de lint, con el ESLint 9.39.5 del
clon) y `maqueta/` (el cuadro rehecho, compilado con el tema cerrado y medido en Chromium 1194 con
axe-core 4.10.3). Color: Machado 2009, severidad 1, en RGB lineal, y ΔE00 en CIELAB D65; «las cuatro
visiones» son la normal, la protanopía, la deuteranopía y la tritanopía.

## 0. Resumen

Lo obvio para E3 es escribir una guía de estilo, crear media docena de componentes y repintar las
pantallas una a una. Una guía no impide nada: el `@theme` ya existe (`index.css` l. 5-12) y el 95 % del
color de la web pasa por fuera de él (86 de 1.650 apariciones son de la marca, mapa 01 §2.2). Esta
propuesta hace del sistema algo que el compilador y los tests obligan a cumplir.

1. **Lo que no está en el tema no existe.** El `@theme` vacía las familias de valores de Tailwind
   (`--color-*: initial`, y lo mismo letra, radios, sombras, cortes y anchos) y declara 39 colores con
   nombre de papel (`ink-muted`, `surface-sunken`, `action`) y 28 tokens de letra, espacio, radio,
   sombra, corte y ancho. `bg-indigo-600` deja de generar CSS. **Medido** con el compilador de Tailwind
   4.3.3 sobre las 146 fuentes de producción: dejan de resolver 2.457 de las 6.322 apariciones de clase
   (38,9 %), 176 clases distintas. Es la deuda exacta, fichero a fichero.
2. **La deuda solo baja.** Un trinquete (`apps/web/src/ui/deuda.json`) guarda la de cada fichero; el test
   falla si sube y obliga a apuntar la bajada. La migración va pantalla a pantalla, cada PR deja el juego
   desplegable, y cerrar el tema es el último PR, no el primero.
3. **Un catálogo cerrado de 25 componentes** en `apps/web/src/ui/`, con todos sus estados, y diez reglas
   de lint que impiden reinventarlos fuera. **Medido** con el ESLint del repositorio: 1.417 avisos en 83
   ficheros, la otra mitad del trinquete.
4. **Los estados de datos son un componente**: `QueryView` pinta los cinco de React Query (cargando,
   error con `Try again`, vacío, sin red y listo) y sustituye los 70 escritos a mano.
5. **Contraste y daltonismo son tests de CI** con los números de este documento: 41 parejas del tema
   claro y 25 del ámbito oscuro, todas ≥ 4,5 en texto y ≥ 3 en gráfico (hoy, blanco sobre la cabecera
   de `Panel`, de 3,33 a 2,22).
6. **El maillot es un dato y no una semilla**: `teams.jersey_design`, con un vocabulario de 10 colores y
   7 figuras (610 diseños). **Medido** dibujado a 13 px: ningún par de colores baja de 11,7 en las cuatro
   visiones (hoy, 0,5 en deuteranopía), el 96,6 % de los pares de diseños pasa de 10, y con el reparto
   que valida el servidor ninguno de los 310 pelotones del mundo tiene un par indistinguible (hoy, los
   310).
7. **La señal de campeón es una estrella dorada sobre azul marino**, figura reservada y emblema del
   juego, y el mundial le añade un canesú dorado: a 50,1 de la marca de la UCI a 13 px (el
   `ChampionMark` de hoy está a 12,1).

Resuelve el examen con la pantalla rehecha y medida a 360 px (el pronóstico empieza a 200 px y no a
1.060 como hoy; con los 28 días abiertos, la página baja de 6.807 a 4.999 px), la web instalable con un
service worker que nunca guarda `/api`, y la regla de la frontera con tres tests. Deja los cortes de `arrivalLabel` (motor),
la carga de los días de carrera en la proyección, el logotipo (D20, sin dueño), `useHideBottomNav` (E6)
y la analítica (una tarea sin épica). Son 18 pasos y unos 37 PR (estimado); el primero que se ve es el 4
(los estados) y el examen llega en los pasos 9 y 10.

## 1. Diagnóstico

1. **Nada impide reinventar.** Seis colores en el `@theme` y el resto, el tema de Tailwind por defecto
   (mapa 01 §2.1); 146 botones con 92 aspectos (§3.3); la tarjeta definida siete veces y copiada 25 a
   mano (§3.2). Ninguna regla de lint mira la interfaz, y los seis tests que fijan clases literales
   (mapa 01 §9) encarecen cambiar el aspecto sin proteger ninguno. El lint ya corre sobre `.tsx` en el
   CI (`eslint.config.js` l. 228 y l. 255; `ci.yml` l. 252), así que las reglas nuevas no piden otro job.
2. **El contraste falla en las 44 pantallas medidas**: 2.816 nodos a 360 px, tres de cada cuatro de
   `slate-400` sobre blanco (2,63), y las barras de título de 2,06 a 3,33 (mapa 05 §11; capturas 01,
   02 y 15, donde se ve el degradado).
3. **Los estados están sin diseñar**: 44 `Loading…`, 26 «Could not load…» sin reintento, seis páginas
   que pintan un error como vacío (mapa 01 §4) y, sin red, `Loading…` para siempre (mapa 05 §13;
   capturas 40 a 42 y 48).
4. **El teléfono**: nada desborda, pero el calendario del equipo recorta su tabla y su `Add` no se
   alcanza (captura 15), la letra baja a 8 px, los objetivos miden de 13 a 20 px y `/me/training` mide
   8,5 pantallas (mapa 05 §2, §3, §5 y §9).
5. **Los maillots**: la semilla es la identidad del equipo NPC y cambiarla lo clona (mapa 03 §2.2), la
   paleta va atada a la semilla y repinta el pasado (§2.3), hay gemelos en 302 de 310 pelotones (§3.2)
   y el tamaño real es 13 px (§1.2; captura 09, donde los líderes de la fila son manchas).
6. **El examen no es solo de presentación** (mapa 02 §1 a §3 y §6): la vista previa inventa en las
   vueltas, el panel de los 28 días no sale de los bloques y dos planes solapados se leen distinto.
7. **El peso**: las banderas son el 91 % de la CSS (mapa 01 §8) y bloquean la primera pintura, que llega
   hacia 3,2 s y el contenido entre 4,7 y 5,7 s con `Slow 4G` (mapa 05 §12).
8. **La frontera** se rompe por los números (mapa 02 §8 y §9).

Comprobado de nuevo y coincide: los pares de `JERSEY_COLORS` por debajo de 10 (2, 6, 12 y 13, mapa 03
§3.1). Cuento 6.322 apariciones y 477 clases (el mapa 01, 6.244 y 468): el escáner ve también los `.ts`.

## 2. Principios

1. **Lo que no está en el tema no existe.** Consecuencia: `initial` en todas las familias de valores y
   un test que falla si una clase no resuelve; los valores arbitrarios (`text-[11px]`, que Tailwind
   resuelve aunque el tema esté cerrado, medido) van en una lista con su motivo.
2. **Los valores viven en un sitio y las páginas solo componen.** Consecuencia: en una página hay
   utilidades de disposición y tokens; botón, tabla, campo, estado y aviso salen de `ui/`.
3. **La deuda se mide y solo baja.** Consecuencia: el trinquete por fichero; nada se migra de golpe.
4. **Un test fija conducta, nunca clases.** Consecuencia: cada componente expone `data-ui`,
   `data-variant` y `data-state`, y los tests miran eso y el ARIA.
5. **Cada número de este documento es el umbral de un test.** Consecuencia: `colorMath.ts` en
   `packages/shared` (WCAG, Machado 2009 y ΔE00), con valores dorados sacados de colour-science.
6. **Un estado de datos, un componente.** Consecuencia: ninguna página escribe `isPending &&`.
7. **El maillot es un dato cerrado que valida el servidor.** Consecuencia: la semilla sigue siendo la
   identidad del NPC y deja de dibujar.
8. **Lo que no se toca a 360 px no está terminado.** Consecuencia: el criterio de §5 es una prueba con
   umbrales, y E3 se da por hecho cuando la pasan todas las pantallas.

## 3. Los fundamentos

### 3.1 La paleta (A, por defecto; B y C en §15)

Contraste WCAG 2.x medido (`tokens.py`). Texto pide 4,5; borde de campo, foco y gráfico, 3.

| Token                 | Hex                   | Uso                                               | Contraste medido                                     |
| --------------------- | --------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| `canvas`              | `#e8edf2`             | el tablero (`body`), como hoy (`index.css` l. 16) | fondo                                                |
| `surface`             | `#ffffff`             | panel, tabla, campo                               | fondo                                                |
| `surface-sunken`      | `#f1f5f9`             | cabecera de tabla, fila encima, deshabilitado     | fondo                                                |
| `line`                | `#d6dee8`             | divisores (decorativo)                            | no lo pide                                           |
| `line-strong`         | `#7d8da3`             | borde de campo y de control                       | 3,38 sobre `surface`; 3,09 sobre `surface-sunken`    |
| `ink`                 | `#0f172b`             | texto base                                        | 17,83 sobre blanco; 15,14 sobre `canvas`             |
| `ink-soft`            | `#314158`             | texto secundario, etiqueta de campo               | 10,36; 9,45 sobre `surface-sunken`                   |
| `ink-muted`           | `#536379`             | rótulos, equipo bajo el nombre, vacíos, pie       | 6,12; 5,20 sobre `canvas`; 5,46 sobre `warning-tint` |
| `ink-inverse`         | `#ffffff`             | texto sobre marca y acción                        | ver abajo                                            |
| `brand-navy`          | `#123a5c`             | cabecera                                          | blanco encima 11,76                                  |
| `brand-navy-deep`     | `#0b2740`             | nivel 2 y barra inferior                          | blanco 15,23                                         |
| `brand-cyan`          | `#1499bb`             | acento decorativo (filetes, marcas)               | 3,33 sobre blanco: nunca texto                       |
| `brand-cyan-strong`   | `#006e8c`             | cabecera de `Panel`, sin degradado                | blanco 5,82 (hoy 3,33 a 2,22)                        |
| `brand-gold`          | `#d99400`             | barra de `PageHeader`, sin degradado              | `ink` encima 6,95 (hoy blanco, 2,57 a 2,06)          |
| `action`              | `#123a5c`             | botón principal (uno solo: hoy seis rellenos)     | blanco 11,76                                         |
| `action-hover`        | `#0b2740`             | botón principal encima y pulsado                  | blanco 15,23                                         |
| `link`                | `#006e8c`             | enlace                                            | 5,82; 4,94 sobre `canvas`; 5,31 sobre sunken         |
| `focus`               | `#006e8c`             | anillo de foco de 2 px                            | 5,82; 4,94 sobre `canvas`                            |
| `positive` / `-tint`  | `#00704e`             | `Saved.`, sumas                                   | 6,13; 5,44 sobre `#e6f5ee`; 5,20 sobre `canvas`      |
| `negative` / `-tint`  | `#b8000a`             | error, restas, botón de peligro                   | 6,90; 6,04 sobre `#fdeceb`; blanco encima 6,90       |
| `warning` / `-tint`   | `#8f3900`             | el velo, avisos, día de carrera                   | 7,63; 6,80 sobre `#fdf1d6`                           |
| `info` / `-tint`      | `#00639e`             | viaje, notas                                      | 6,41; 5,63 sobre `#e6f2fb`                           |
| `star` / `star-empty` | `#b07a00` y `#7d8da3` | estrella llena (forma llena) y vacía (contorno)   | 3,73 y 3,38 sobre blanco (hoy `#ffb900`, 1,72)       |
| `form-*`              | §4, n.º 21            | las cinco celdas de la escala de llegada          | tinta encima de 5,32 a 14,60                         |

**El ámbito oscuro.** `[data-surface='dark']` redefine nueve tokens (`ink` `#ffffff`, `ink-soft`
`#e2e8f0`, `ink-muted` `#b4bfcf`, `link` `#7dd3fc`, `line-strong` `#8a9ab0`, `action` `#ffffff`,
`action-hover` `#e2e8f0`, `ink-inverse` `#0f172b`, `focus` `#ffffff`) y los componentes no saben dónde
están: el mismo `Button` sirve en `Watch`. Medido sobre `broadcast` `#0f172b`, `broadcast-raised`
`#1d293d`, `broadcast-soft` `#314158` y los dos azules de la cabecera: el peor texto, 5,57; el peor
borde, 4,11; el botón, 17,83 (el reloj de la cabecera pasa de 1,14 a 6,33). `broadcast-alert` `#b8000a`
(6,90) sustituye a `bg-red-700`, y las flechas son `#fcd34d` (12,37) y `#6ee7b7` (11,70). **Sin modo
oscuro**: nadie lo ha pedido (mapa 04 §2) y duplica las pruebas; queda la puerta de un bloque
`@media (prefers-color-scheme: dark)` con el mismo mecanismo y su fila en el test.

### 3.2 La letra

**La del sistema**, `system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', Arial, sans-serif`:
0 bytes, sin parpadeo y con los alfabetos que traerá E10 (el chino incluido) ya en el
teléfono. Las alternativas, con su peso medido, en §15. Siete papeles sustituyen a los nueve tamaños y a
los 27 `text-[10px]` y `text-[11px]` de hoy (mapa 01 §2.2):

| Token          | Tamaño / interlineado | Peso                                  | Uso                                                      |
| -------------- | --------------------- | ------------------------------------- | -------------------------------------------------------- |
| `text-caption` | 12 / 16 px            | 400                                   | metadatos; nunca texto que se pulsa                      |
| `text-label`   | 12 / 16 px            | 600, interletraje 0,04 em, mayúsculas | rótulo de sección y cabecera de tabla (la `head` de hoy) |
| `text-data`    | 14 / 20 px            | 400 y 600                             | filas de tabla y listas, con `tabular-nums` en cifras    |
| `text-body`    | 16 / 24 px            | 400                                   | prosa, campos (16 px: Safari de iPhone no amplía)        |
| `text-title`   | 16 / 24 px            | 600                                   | título de `Panel`                                        |
| `text-heading` | 20 / 28 px            | 700                                   | título de página (`PageHeader`)                          |
| `text-display` | 28 / 36 px            | 700                                   | la cifra de `Stat` y el nombre de la ficha               |

Pesos 400, 500, 600 y 700; ninguno más. Toda cifra que se compare en columna lleva `tabular-nums` (hoy
en 31 ficheros, mapa 01 §2.2). **Mínimo: 12 px** en todo `main` (hoy 8 en el perfil de `Watch`,
`ProfileStrip.tsx` l. 70 y 161, y 10 y 11 en tablas y fichas, mapa 05 §2).

### 3.3 El espacio, la rejilla y la densidad

- **Espaciado**: el paso de 4 px (`--spacing: 0.25rem`) con los pasos 0, 0,5, 1, 1,5, 2, 2,5, 3, 4, 6,
  8, 12 y 16. **Medido**: de 1.342 utilidades, 38 quedan fuera (`p-5` 16, `pl-7` 6…), al trinquete.
- **Rejilla**: el marco de hoy (`App.tsx` l. 158), `max-w-page` 72 rem y 12 px de margen, 16 desde 640;
  cortes `sm` 640 (dos columnas) y `lg` 1.024 (cuatro, y la columna lateral de `Watch`); `md` sale.
- **Densidad**: por puntero y no por ancho. Con dedo, fila y control de 44 px; con ratón
  (`@custom-variant fine (@media (pointer: fine))`), fila de 36 y botón pequeño de 32, para el público
  de Hattrick y PCM, que quiere tablas densas en escritorio.

### 3.4 Radios, sombras e iconos

Tres radios: `sm` 4 px (chip, celda), `md` 8 px (panel, botón, campo, aviso), `lg` 12 px (hoja del
editor); `rounded-full` solo en la pastilla de pestaña. Dos sombras: `shadow-panel` (`0 1px 2px` y un
filete de 1 px al 6 %, que sustituye a `shadow-sm` más `ring-black/5`) y `shadow-bar` (la de
`BottomNav.tsx` l. 44, ya con nombre). **Iconos**: un juego cerrado de 16 en `ui/icons.tsx`, SVG en
rejilla de 24 con trazo de 2 y `currentColor` (flecha izquierda y derecha, chevrón arriba y abajo,
`check`, cerrar, info, aviso, error, avión, bicicleta, calendario, estrella llena y vacía, recargar, sin
red), a 16 o 20 px, siempre con su texto al lado o con `aria-label`. Los emoji salen de la interfaz
(23, medido): cambian con el sistema y un glifo pequeño se leyó «Ill» en el móvil del dueño ([DUEÑO 5]).
Los de los logros (`ranking.ts` l. 571-621) son contenido y se quedan.

### 3.5 Dónde vive cada cosa

| Qué                                                   | Dónde                                     | Por qué                                                                                  |
| ----------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| tokens de color, letra, espacio, radio, sombra, corte | `@theme` de `apps/web/src/index.css`      | Tailwind v4 genera las utilidades de ahí; los tests leen el CSS y no copian valores      |
| componentes, iconos y constantes visuales de la web   | `apps/web/src/ui/` (`constants.ts`)       | un directorio, una regla de lint con frontera clara                                      |
| paleta, figuras y geometría del maillot; validación   | `packages/shared/src/jerseyVocabulary.ts` | la API valida el diseño y E2 lo graba; el dibujo de la web importa los colores de aquí   |
| tabla de choques entre diseños                        | `packages/shared/src/jerseyConflicts.ts`  | generada y comprobada por test; fuera del barril de `shared`, para que no viaje a la web |
| WCAG, Machado 2009, CIELAB y ΔE00                     | `packages/shared/src/colorMath.ts`        | la usan los tests de la web y el validador de la API                                     |

## 4. Los componentes y sus estados

Un catálogo **cerrado**: lo que no está aquí no se pinta, y un componente nuevo entra con un PR que lo
añade a `ui/`, a la página de catálogo `/_ui` (cada estado, con datos fijos) y a sus tests. Todo
interactivo mide 44 px con dedo y lleva foco visible (`focus-visible`, 2 px de `focus` a 2 px). Ningún
componente acepta `className` para lo que es suyo (color, letra, radio, sombra): la maqueta lo midió, dos
clases de ancho en el mismo elemento dejaron un `select` en 26 px, porque gana la que Tailwind emite
después y no la que se escribe después. Aceptan `layout` (márgenes y ancho) y nada más.

| N.º | Componente                                                       | Sustituye (medido, mapa 01)                                         | Variantes y medidas                                                                                                                      | Estados y su aspecto                                                                                                                                                                                 | Texto de ejemplo (pantalla) y accesibilidad                                                      |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | `Button` (y `to` para enlace con aspecto)                        | 111 `<button>` y 35 enlaces, 92 aspectos, seis rellenos             | `primary` (`action`), `secondary` (`surface`, borde `line-strong`), `quiet` (texto `link`), `danger` (`negative`); alto 44, 32 con ratón | encima: `action-hover` o `surface-sunken`; foco: anillo; pulsado: `action-hover`; deshabilitado: `surface-sunken`, `ink-muted`, borde `line` y su motivo debajo; cargando: icono que gira y el verbo | `Save plan`, `Saving…`; motivo `Nothing to save yet. Change a day first.` con `aria-describedby` |
| 2   | `TextLink`                                                       | 4 aspectos de enlace; `RIDER_LINK_CLASS` (`RiderName.tsx` l. 15-16) | normal (subrayado continuo) y nombre (punteado, [DUEÑO 6]); `RiderName` sigue: humanos en negrita, NPC en cursiva                        | encima: subrayado de 2 px; foco; visitado igual                                                                                                                                                      | `Haritz Arias`; nunca solo color                                                                 |
| 3   | `Field` con `Input`, `Select`, `Textarea`                        | 42 campos en 23 combinaciones; `TextField`                          | alto 44, letra 16, radio `md`, borde `line-strong`; etiqueta siempre visible (`text-data` 600, `ink-soft`), pista `text-caption`         | foco: borde y anillo `focus`; inválido: borde `negative`, icono y mensaje debajo, `aria-invalid`; deshabilitado: `surface-sunken` y motivo; solo lectura                                             | `Emphasis` / `My strength`; el mensaje enlazado con `aria-describedby`                           |
| 4   | `Segmented`                                                      | los modos (`PlanLadder.tsx` l. 127-143), las pestañas de `Rankings` | de 2 a 4 opciones, mismo ancho, 44 px                                                                                                    | elegida: `action` con `ink-inverse`; las demás, `surface` con borde; foco                                                                                                                            | `Coach decides`, `Mixed`, `I decide`; `role="radiogroup"` y `aria-checked`                       |
| 5   | `Tabs`                                                           | `Tabs.tsx` (cuatro variantes, l. 36-62) y tres tiras a mano         | `nav` (cabecera), `page` (subrayado), `filter` (pastilla)                                                                                | activa; encima; foco; si desborda, máscara de 24 px en el borde que sigue (hoy, ningún indicio: mapa 05 §9)                                                                                          | el ARIA de hoy se queda (`Tabs.tsx` l. 172-210)                                                  |
| 6   | `Disclosure`                                                     | `Show the 28 days` y las explicaciones en `title` (23)              | botón `quiet` con chevrón y región debajo; `Explain` es su variante de 44 px con el icono de info                                        | plegado; abierto; foco                                                                                                                                                                               | `Show the 28 days`; `aria-expanded` y `aria-controls`                                            |
| 7   | `Panel`                                                          | `Panel`, la constante `card` (7 ficheros, 25 usos) y 25 copias      | título en `brand-cyan-strong` liso, `text-title`, con acción a la derecha; cuerpo 16 px; sin `overflow-hidden`                           | normal; las tablas desplazan dentro de su propia región                                                                                                                                              | `Your races this month`; `h2`                                                                    |
| 8   | `PageHeader`                                                     | `SectionBar` (18 ficheros) y 13 `h1` distintos                      | barra `brand-gold` lisa con `text-heading` en `ink`; vuelta atrás encima, línea de metadatos y acciones                                  | normal                                                                                                                                                                                               | `Training plan`; un `h1` por página                                                              |
| 9   | `Stat`                                                           | los paneles que hacen de cifra (`MyRaces`, `TeamCalendar`)          | rótulo `text-label`, cifra `text-display` con `tabular-nums`, tono `positive` o `negative`                                               | normal; cero sin signo (hoy `−0` en rojo, captura 03)                                                                                                                                                | `Balance` / `272`                                                                                |
| 10  | `DataTable`                                                      | 15 tablas; `GcTable` y `PointsTable` dos veces                      | columnas con `priority` (`primary`, `secondary`, `optional`) y `numeric`; fila 44 / 36 px; primera columna fija al desplazar             | cargando: 5 filas esqueleto del mismo alto; vacío y error dentro; fila propia resaltada (`surface-sunken` y filete `brand-cyan`); DNF en `ink-muted` (hoy `slate-300`, 1,48)                         | `top 20` y `Show all 176` dentro (`TOP_ROWS`, `ShowAll.tsx` l. 10); `caption`, `scope="col"`     |
| 11  | `List` y `ListRow`                                               | las listas que hacen de tabla (`RacesIndex`, `News`, `RaceResults`) | fila de 44 px con hasta tres líneas                                                                                                      | igual que la tabla                                                                                                                                                                                   | `Race Var · .1 · day 52`                                                                         |
| 12  | `Chip`                                                           | 15 formas en 23 `<span>`                                            | tonos `neutral`, `info`, `positive`, `warning`, `negative`, `brand`; 20 px de alto, `text-caption` 600; nunca se pulsa                   | normal                                                                                                                                                                                               | `.WT`, `home`, `Finished`, `Your edit`                                                           |
| 13  | `Notice`                                                         | 8 formas del aviso ámbar; el aspecto de `VeilNotice`                | tonos `info`, `positive`, `warning`, `negative`; icono, texto y acción opcional                                                          | fijo (`role="note"`); vivo (`role="status"`); tras una acción fallida (`role="alert"`)                                                                                                               | `Results from 3 stages you haven't watched are hidden · Manage`                                  |
| 14  | `QueryView`                                                      | 44 `Loading…` y 26 «Could not load…»                                | recibe la consulta, `isEmpty`, el vacío y el nombre de lo que carga                                                                      | `pending` → 15; `error` → 16; `paused` (sin red) → 18; vacío → 17; listo → hijos                                                                                                                     | `label="your training plan"`                                                                     |
| 15  | `LoadingState`                                                   | `Loading…` arriba a la izquierda (captura 40)                       | esqueleto con la forma de lo que viene (filas, panel, cifra); `animate-pulse` apagado con `prefers-reduced-motion`                       | visible a los 300 ms, para no parpadear                                                                                                                                                              | `role="status"`, oculto: `Loading your training plan`                                            |
| 16  | `ErrorState`                                                     | la frase roja sin reintento (capturas 41 y 42)                      | icono de error, frase y `Try again` (`secondary`, llama a `refetch`); el 404, aparte                                                     | reintentando: el botón cargando                                                                                                                                                                      | `Could not load your training plan.` · `Try again`; 404: `This rider does not exist.`            |
| 17  | `EmptyState`                                                     | 9 cajas discontinuas y los vacíos en `slate-400`                    | icono, `text-title`, texto y acción opcional                                                                                             | normal                                                                                                                                                                                               | `No races in the next four weeks.` · `Find races`                                                |
| 18  | `OfflineState` y `OfflineBanner`                                 | nada (mapa 05 §13)                                                  | en la consulta pausada; y una franja `info` bajo la cabecera mientras no hay red                                                         | sin red; vuelve la red: la franja se va sola                                                                                                                                                         | `You're offline. Showing what was already loaded.`; `role="status"`                              |
| 19  | `StarRating`                                                     | `StarRating.tsx` (`★` con relleno por ancho, l. 10-12)              | SVG: llena en `star`, vacía en contorno `star-empty`, medias; 14 y 16 px                                                                 | normal                                                                                                                                                                                               | `3.5 of 5 stars`; la forma distingue en grises, donde los dos colores quedan a 2,6 de ΔE00       |
| 20  | `Meter`                                                          | las barras de 0 a 100 (`Home.tsx` l. 354)                           | pista `surface-sunken` con borde `line-strong`, relleno `brand-cyan-strong`, marca de cuatro pasos (`entrenamiento.md` decisión 24)      | normal; sin cifra                                                                                                                                                                                    | `Freshness · Fresh` (hoy `16 / 100`, el número que MVP l. 114 prohíbe)                           |
| 21  | `FormScale`                                                      | `ARRIVAL_LABEL`, cinco chapas sueltas (`PlanLadder.tsx` l. 63-69)   | cinco celdas fijas: `Cooked` `#7a1e14`, `Loaded` `#e0893a`, `Fine` `#e4e9ef`, `Spot on` `#1f7a4c`, `Rusty` `#3d5a80`; 44 px              | la del corredor con contorno `ink` de 2 px y `▲ you`; `Best` bajo `Spot on`; `← Tired` y `Rested →` en los extremos                                                                                  | `role="img"`, `aria-label="You arrive Loaded (Cooked, Loaded, Fine, Spot on, Rusty)"`            |
| 22  | `RiderIdentity`                                                  | cada tabla la compone a su manera                                   | dorsal, bandera, nombre, equipo, maillot ([DUEÑO 26]); una línea desde 640 px, dos en el teléfono                                        | resaltado si es el propio                                                                                                                                                                            | `#121 Haritz Arias (Aurora Racing)`                                                              |
| 23  | `TeamJersey`, `LeaderJersey`, `ChampionJersey`, `WornJerseyIcon` | `Jersey.tsx` y `WornJerseyIcon.tsx`                                 | tamaños con nombre: 13, 16, 28, 44, 72 y 96 px (§11); el dibujo, §6                                                                      | normal                                                                                                                                                                                               | `role="img"`, `aria-label` y `<title>` con `JERSEY_LABEL` o `championTitleText`                  |
| 24  | `Flag`                                                           | `flag-icons` entero en la CSS (`main.tsx` l. 9)                     | `<img>` del SVG del país, perezosa, a 12, 14 o 16 px de alto                                                                             | sin país: hueco de su ancho                                                                                                                                                                          | `alt="Spain"`                                                                                    |
| 25  | `Icon`                                                           | Unicode y emoji (mapa 01 §6)                                        | los 16 de §3.4                                                                                                                           | normal                                                                                                                                                                                               | `aria-hidden` con texto al lado                                                                  |

**Las escalas.** `FormScale` es la escala de cinco tramos del examen; sus celdas, medidas en las cuatro
visiones, quedan a 34,7, 16,7, 14,5 y 10,6 en su peor par (`Loaded` y `Fine` en la normal; `Spot on` y
`Rusty` en tritanopía), y la posición y la palabra la sostienen en grises (6,9). Las barras (`Meter`)
llevan la marca de cuatro pasos y nunca la cifra. **La ficha de corredor** es una composición fija y no
un componente: `PageHeader` con nombre, bandera, edad y equipo; `Stat` de forma y de moral, las dos en
`StarRating` (la moral va hoy en porcentaje, `RiderProfile.tsx` l. 273); los diez atributos en
`DataTable` con `StarRating` y la marca de cuatro pasos; `Meter` para fondo y frescura; y el palmarés
en `List`. La pública es la misma sin lo privado (`docs/navegacion.md` §3.6).

## 5. El teléfono

**Las tablas anchas**, con `DataTable` y sus prioridades (capturas 03, 11, 15, 23 y 24):

| Tabla                                             | Hoy a 360 px                                           | Con `DataTable`                                                                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| calendario del equipo (`TeamCalendar.tsx` l. 197) | 460 px en 336, recortada; `Add` y `Drop` inalcanzables | `Race` primaria con el día y la bandera en su segunda línea, `Travel` secundaria debajo (`336 · 2 travel days`), `Plan` como `Button` de 44 px al final                     |
| salón de la fama (`HallOfFame.tsx` l. 92)         | 520 px con desplazamiento, `All-rounde` cortado        | corredor primario y victorias numéricas visibles; el resto, secundario bajo el nombre; desplazamiento solo si aún no cabe, con la primera columna fija y sombra en el borde |
| nación (`Country.tsx` l. 48)                      | 429 px con desplazamiento                              | igual que el salón                                                                                                                                                          |
| ranking (`Rankings.tsx` l. 29)                    | el equipo toca los puntos (`Team178`)                  | la columna numérica lleva 12 px de margen por regla del componente                                                                                                          |
| `Available to enter` (`MyRaces.tsx` l. 222-283)   | `Travel` partido en cinco renglones                    | `Travel` secundaria: `48 · 2 travel days (1 out, 1 back)` en una línea bajo la carrera                                                                                      |
| general, puntos, etapa, acta                      | caben con dos renglones por fila                       | igual, con el equipo en `ink-muted` (6,12) en lugar de `slate-400` (2,63)                                                                                                   |

**Navegación.** Es de E6; E3 le da dos reglas medibles: ningún rótulo de la barra inferior se corta a
360 px (hoy `Dashb…`, `My Ri…`, `My Te…`, mapa 05 §9) y toda tira que desborda enseña su máscara (§15).

**El criterio de aceptación.** Una pantalla «se juega bien en un teléfono» cuando pasa, a 360 × 800 y a
390 × 844 (relación 2, táctil), las seis pruebas de `scripts/ui-telefono.mjs`, que nace de
`capturas/medir.mjs`:

1. `scrollWidth` igual al ancho de la ventana.
2. Ninguna tabla más ancha que su caja salvo dentro de una región `[data-scroll-region]` de `DataTable`.
3. Letra mínima calculada en `main` de 12 px, y 16 px en los campos.
4. Cero controles (botón, campo, pestaña, opción) con un lado por debajo de 44 px; los enlaces dentro de
   una frase, 24 px (WCAG 2.5.8).
5. axe-core 4.10.3, WCAG 2.2 A y AA: cero nodos.
6. El primer `Panel` empieza a menos de 400 px de arriba.

Y las cinco páginas de la barra inferior, además: contenido listo en 4,5 s o menos con `Slow 4G` y la CPU
a ×4 en frío, y en 2,5 s con el service worker (hoy de 4,7 a 5,7 s; umbrales estimados, se fijan en el
paso 18 con la medida). Corre en el CI sobre `/_ui` en cada PR que toca `apps/web`, y cada noche sobre
las 45 pantallas del mapa 05 con un mundo de prueba pequeño (el de B1 con un mánager y un agente libre,
por construir). E3 no está terminado hasta que pasan todas.

## 6. Los maillots

### 6.1 El vocabulario

**Diez colores** (`paleta.py` y `subconj.py`: un tono por familia con nombre, máximo del mínimo ΔE00 en
las cuatro visiones): negro `#151b24`, azul `#2a66db`, celeste `#4bc6fa`, verde azulado `#00584f`,
granate `#68111c`, rojo `#d02c2a`, naranja `#fd8637`, rosa `#b36c8f`, morado `#5e2b99` y gris `#a2acb7`;
el blanco solo como segundo color. **Medido**, el par más cercano: 18,1 en visión normal, 14,5 en
protanopía, 11,7 en deuteranopía y 13,2 en tritanopía, sin ningún par por debajo de 10 (hoy, con 14
colores: 6,5, 1,3, 0,5 y 1,9). Con doce familias el mínimo cae a 5,7 (medido): doce tonos no caben
separados en el eje azul y amarillo de un daltónico. El amarillo y el verde de líder quedan fuera.

**Siete figuras** en la rejilla de 48 unidades del torso de hoy (`Jersey.tsx` l. 10-11), sin rasgos de
menos de 7 u (1,9 px a 13 px; hoy la raya de `stripes` mide 3 u, 0,81 px) salvo el puño de la manga,
de 5,8 u: `plain`; `halves`
(mitad derecha, x ≥ 24); `hoop` (franja de y 25 a 33); `yoke` (todo lo que está por encima de y 21,
mangas incluidas); `sash` (banda diagonal de 9 u del hombro izquierdo a la cadera derecha); `sides`
(costados de 7 u desde y 18); `sleeves` (las mangas). Cuello blanco al 85 % y filete de 1,5 u al 35 %
en todos, el de los líderes de hoy.

**Medido a 13 px** (`maillots.py`): 610 diseños (10 lisos y 600 con figura). Pasan de 10 el 99,1 % de
los pares en visión normal, el 97,5 % en protanopía, el 97,9 % en deuteranopía y el 98,7 % en
tritanopía, y el 96,6 % en las cuatro a la vez (de 185.745 pares). Un conjunto codicioso de diseños
mutuamente distinguibles en las cuatro tiene 101 (el pelotón más grande, 22 equipos).

### 6.2 El dato

- **`teams.jersey_design jsonb not null`** (migración con drizzle-kit: columna nula, relleno, `not null`)
  con `{ v: 1, figure, base, secondary }` y su `jerseyDesignSchema` en `shared` (`z.enum` cerrados,
  `.strict()`). `teams.jersey_seed` (`schema.ts` l. 268) sigue siendo la identidad del NPC, que
  `seedWorld` reconoce por ella (`world.ts` l. 460-468), y deja de dibujar: el editor ya no puede clonar
  un equipo (mapa 03 §2.2).
- **El relleno**, una vez: cada equipo, de más vecinos a menos (los que comparten carrera), toma el
  diseño más cercano a su base de hoy que no choque con ningún vecino ni con un reservado. **Medido** en
  el mundo del mapa 03 (vecinos por equipo: mediana 28, máximo 201): 0 de 310 pelotones con un par por
  debajo de 10 en alguna visión (hoy, dibujados igual, 310 de 310), 174 de 219 equipos con la base a
  menos de 20 de la de hoy y 68 diseños distintos. Un mundo nuevo lo hace al crear cada equipo.
- **Lo grabado** guarda `jerseySeed` (`cast.ts` l. 146-154): `CastTeam.jerseyDesign` opcional para lo que
  se grabe desde entonces, y `legacyJerseyStyle(seed)`, el `jerseyStyle` de hoy congelado
  (`visuals.ts` l. 71-83), para lo de antes. El pasado conserva su aspecto, como en la tele.

### 6.3 El editor y la moderación

`/team/identity` sustituye las doce semillas (`TeamManager.tsx` l. 21-26) por tres filas, `Pattern`
(siete teselas de 44 px con el maillot a 34), `Main colour` (diez muestras) y `Second colour` (once), y
una vista previa a 13, 28 y 96 px, la de 13 junto a los maillots de la próxima carrera del equipo
(pantalla: `How it looks in the peloton`). Cada cambio llama a `POST /api/teams/me/jersey/check`, que
contesta `{ ok, reserved, conflicts }` contra los equipos con los que comparte carrera esta temporada, con
la tabla de choques. Estados (pantalla): libre, `Distinct from every team you race with.` (`positive`);
parecido, `Too close to Noord Cycling at small size. You meet them in Race Var.` (`warning`); reservado,
`That is the Points leader's jersey.` (`negative`); y guardando, guardado y error con `Button` y
`Notice`. `Save changes` queda deshabilitado con su motivo mientras haya choque, y el servidor repite la
comprobación en `PUT /api/teams/me` (`jerseyDesign` en lugar de `jerseySeed`, hoy cualquier texto de 1 a
120, `routes/teams.ts` l. 23) con `maillot_reservado` o `maillot_parecido`. **Para E9**: con un
vocabulario cerrado no hay contenido libre; quedan `teams.jersey_status` (`ok`, `reset`) y
`POST /api/admin/teams/:id/jersey/reset`, que vuelve al diseño del relleno.

### 6.4 La señal de campeón

**Por defecto, la estrella** (`ChampionJersey`): torso azul marino `#14284b` y una estrella de cinco
puntas en oro `#f0b323` (radio exterior 9,5 u, interior 3,9 u, centro en 24, 29: 18,1 × 17,2 u), con la
bandera del país a su lado como hoy (`Jersey.tsx` l. 165). **El mundial** añade el canesú dorado (la
figura `yoke` en oro). Ruta y crono, élite y sub-23 comparten dibujo: solo se lleva el título de la
disciplina y la categoría del día (`wearableTitles`, `jerseys.ts` l. 271-275), y el texto los distingue
(`Time trial champion of Italy`, pantalla). La estrella es figura reservada: ningún diseño de equipo la
lleva, y el azul marino y el oro no están en la paleta.

| Medida (peor de las cuatro visiones)                      | 13 px            | 16 px            | 28 px       | 72 px       |
| --------------------------------------------------------- | ---------------- | ---------------- | ----------- | ----------- |
| tamaño de la estrella                                     | 4,9 × 4,7 px     | 6,0 × 5,7        | 10,5 × 10,0 | 27,1 × 25,8 |
| nacional a la marca de la UCI (normal / peor)             | 50,1 / 47,9      | 52,0 / 49,0      | 56,6 / 53,9 | 56,9 / 54,4 |
| mundial a la marca de la UCI (normal / peor)              | 34,4 / 33,0      | 35,5 / 32,8      | 39,1 / 37,0 | 39,6 / 37,3 |
| nacional al diseño de equipo más cercano                  | 12,9             |                  |             |             |
| mundial a la nacional; al amarillo; al equipo más cercano | 26,6; 24,8; 13,2 | 26,7; 25,4; 12,6 |             |             |

La nacional queda a 27,7 de los líderes y la mundial a 24,8 o más; la estrella contrasta 7,79 con su
fondo. El `ChampionMark` de hoy está a 12,1 de la marca a 13 px (mapa 03 §7.3). Las variantes del dueño, en §15.

### 6.5 Los líderes y el dorsal

Los tres colores que nombró el dueño ([DUEÑO 1]) se quedan; cambia lo que a 13 px no se veía. General:
`#facc15` liso. Puntos: `#15803d` con banda blanca de 10 u (y 24 a 34; hoy 7 u en `#bbf7d0`). Montaña:
`#1d4ed8` con cinco lunares blancos de 4,0 u de radio (hoy 3,4). **Medido** a 13 px contra los 610
diseños: el amarillo veta 1 (naranja liso, 9,2 en deuteranopía), el verde 4 (el peor, 7,4) y el azul
ninguno (10,8); con los líderes de hoy, el verde vetaría 10 y el azul 7. Entre ellos, 24,4, 38,6 y 19,7
en su peor visión. Los cinco diseños vetados son la lista de reservados del validador. **El dorsal del
equipo líder no vuelve** (el dueño lo mandó quitar, `6e1b758`; `leaderJerseys.test.tsx` l. 81-88): la
alternativa, en §15.

### 6.6 Lo que compra el patrocinador (para E8) y el contrato de E2

El diseño gana un campo `sponsor` opcional: un color (`slot` `base` o `secondary`, de la misma paleta y
por el mismo validador: nadie compra un aspecto reservado ni parecido) o un logotipo (`zone` `chest`,
16 × 8 u, o `sleeves`), que solo se dibuja desde 28 px, porque a 13 px una unidad mide 0,27 px. Precio,
exclusividad y lo que pierde el equipo son de E8 (`docs/encargos.md` l. 463-469). **El contrato**:
`WornJerseyIcon({ worn, team, size })`, con `team: { jerseyDesign } | null`, la firma de
`docs/retransmision.md` l. 5210 más el tamaño, en lugar de la de hoy (`{ card, size }`,
`WornJerseyIcon.tsx` l. 12-18); sigue siendo el único sitio que elige dibujo por `WornJersey`, con
`aria-label` y `<title>`.

## 7. El examen práctico

### 7.1 Lo que cambia en la API (y en `packages/db`, no en el motor)

1. **El doble plan**: `PUT /plan` borra los planes del corredor cuya ventana se solapa con la nueva antes
   de guardar, y `getPlanForDay` (`db/training.ts` l. 237-248, hoy `.limit(1)` sin orden) y el tick
   (`train.ts` l. 136-140, hoy la última fila de un `Map`) toman el de `start_day` mayor. Test primero: el
   caso medido del mapa 02 §2 (planes del 101 y del 111: el día 115, pantalla y tick leen el mismo).
2. **Cada día dice de dónde sale**: `GET /api/riders/me/orders` añade `days[]` con `gameDay`,
   `session`, `intensity`, `block` y `source` (`carrera`, `viaje`, `orden`, `bloque`, `equipo`,
   `entrenador` o `descanso`), calculado por `resolveTrainingDay`, una función pura de `packages/shared`
   sacada de la cadena de `train.ts` l. 195-272, que pasa a usar también el tick (un test compara las
   dos salidas en el banco de B1). La web borra la mezcla con `defaultCoachPlan` (`trainingPlan.ts`
   l. 36-42), que coincide con el bloque en 88 de 350 casos (mapa 02 §1). Un día `entrenador` no tiene
   sesión: el entrenador decide esa mañana.
3. **Una llegada por carrera**: `arrivals[]` con `raceKey`, `raceName`, `country`, `stageCount`,
   `startDay`, `label` y `travel` (`out` y `back`, días), con la etiqueta de la primera etapa del
   horizonte, la única de fiar (mapa 02 §3), y sin `tsb` (`riders.ts` l. 477). `getRiderRaceDays` ya
   tiene la carrera y la tira al devolver números (`riderSchedule.ts` l. 59-69).
4. **La proyección cuenta el viaje** con la misma `getRiderTravelDays` que el plan (`riderSchedule.ts`
   l. 175-226): `viaje` a 15 TSS donde hoy pone 90 de bloque. En modo `entrenador` no hay pronóstico.
5. Fuera de `days[]` salen `ctl`, `atl` y `tsb` (§9).

### 7.2 La pantalla (medida en `maqueta/`, solo con componentes de §4)

```text
PageHeader   Training plan
             Pick four weeks of training and see how you arrive at each race.
Panel        Your races this month
  Flag Race Var  Chip .1
  One-day race · day 52 · in 2 days
  Icon(plane) Out day 51 · back day 53
  FormScale  [Cooked][Loaded ▲ you][Fine][Spot on][Rusty]   ← Tired · Best · Rested →
  Flag Race Sardegna  Chip .1 · 5 stages
  Days 56 to 60 · starts in 6 days
  Icon(plane) Out day 55 · back day 61
  FormScale  [Cooked][Loaded ▲ you][Fine][Spot on][Rusty]
  Only the start is forecast: the stages after it depend on how you race them.
Panel        Your month
  Segmented  Coach decides | Mixed (elegido) | I decide
  Notice     What decides each day, in Mixed
             1 Race · 2 Travel · 3 Your edits · 4 Your blocks · 5 Team plan · 6 Coach
  Field      WEEK 1 · DAYS 51 TO 57   [Build]   Where attributes actually move. Leaves you tired.
             (semanas 2 a 4)
  Field      Emphasis [My strength]   Field  Intensity [Normal]
  Button     Save plan        1300 TSS over four weeks
Panel        Edit day by day
  Disclosure Show the 28 days
  WEEK 1 · BUILD · DAYS 51 TO 57
  Day 51  Chip(info) Travel      On your way to Race Var (FR)
  Day 52  Chip(warning) Race     Race Var · one-day race
  Day 54  Chip(brand) Your edit                                   120 TSS
          Select [Tempo]  Select [Normal]
  Day 62  Chip Build week                                          90 TSS
  Button     Save day edits (deshabilitado)   Nothing to save yet. Change a day first.
```

**Medido** a 360 × 800 en Chromium con axe: 1.709 px plegada (2,1 pantallas) y 4.999 con los 28 días
abiertos (6,2; hoy 6.807 y 8,5), el pronóstico a 200 px (con los controles primero, a 1.116; hoy empieza
a 1.060), letra mínima 12 px, 0 de 48 controles por debajo de 44 px y 0 fallos de axe; la CSS de la
maqueta con el tema cerrado, 16,4 KB sin comprimir.

### 7.3 Los cinco defectos, uno a uno

| Defecto                                                 | Hoy                                                                                    | Con el sistema                                                                                                                                                                                                                                            |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| la lista de llegadas no dice la carrera y repite etapas | `Day N · You'll arrive:` por etapa (`PlanLadder.tsx` l. 240-255)                       | una tarjeta por carrera con su nombre, bandera, formato, días, viaje y `FormScale` (§7.1, punto 3)                                                                                                                                                        |
| cinco palabras sin escala                               | chapas de cinco tonos sin orden (l. 63-69)                                             | `FormScale`: orden fijo, dos extremos malos con su dirección (`Tired`, `Rested`), `Best` marcado; las cinco palabras se quedan (`Rusty`, `Spot on`, `Fine`, `Loaded`, `Cooked`)                                                                           |
| dos vocabularios y la precedencia invisible             | `MODE_WHY` en 12 px arriba (l. 145) y una línea gris abajo (`Training.tsx` l. 327-330) | la regla del modo en un `Notice` numerado; cada día con su `Chip` de origen; la cabecera de semana repite el bloque (`WEEK 1 · BUILD`); en `Coach decides`, los días de solo lectura con su motivo `Switch to Mixed or I decide to edit days.` (pantalla) |
| el viaje solo se ve en el panel plegado                 | filas azules sueltas (`Training.tsx` l. 217-234)                                       | la ida y la vuelta en la tarjeta de su carrera, arriba, y nombradas también en el día                                                                                                                                                                     |
| `On your programme` no dice el viaje; tres numeraciones | `Day N`, `GD N` e `in N days` (mapa 02 §6)                                             | una fila más por carrera, `Travel: out day 51, back day 53 · 48`; `Day 52 · in 2 days` en todas partes                                                                                                                                                    |

**Lo que se queda para otra línea**: la carga real de un día de carrera en la proyección (pide una
estimación del motor), los cortes de `arrivalLabel` (`projection.ts` l. 75-81: +25 y −30 frente a los
+18 y −35 del diseño), el entrenador sin calendario (`train.ts` l. 256), `sinRitmo` y el rango de
ganancia (`entrenamiento.md` l. 1119-1133). La explicación larga de la precedencia es de E6.

## 8. La web instalable

`apps/web/public/manifest.webmanifest`, enlazado en `index.html` con `theme-color`, `apple-touch-icon`,
`apple-mobile-web-app-title` y `viewport-fit=cover`:

```json
{
  "id": "/",
  "name": "Cycling Star",
  "short_name": "Cycling Star",
  "description": "A cycling manager game. Train, race and rise.",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#123a5c",
  "background_color": "#e8edf2",
  "lang": "en",
  "dir": "ltr",
  "categories": ["games", "sports"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "purpose": "any" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "purpose": "maskable" }
  ]
}
```

**Iconos**: la bici con estrella de `Logo.tsx`, en blanco y `brand-gold` sobre `brand-navy` (hoy índigo
y ámbar fuera de la marca, mapa 01 §6), a 192 y 512, el `maskable` con el dibujo dentro del círculo
central de 410 px, `apple-touch-icon` de 180 × 180 opaco y `favicon.svg` redibujado. El logotipo de
verdad es de D20 (mapa 04, contradicción 12).

**El service worker** (`/sw.js`, escrito a mano, unas 150 líneas estimadas, con la lista de ficheros
sacada en la compilación de `dist/.vite/manifest.json`, que `vite.config.ts` l. 11 ya genera):

| Petición               | Estrategia                                                        | Por qué                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| navegación             | red primero, 3 s, y si no, el `index.html` guardado               | el HTML se revalida siempre (`no-cache`, `app.ts` l. 136 y 142); el título lo pone `usePageTitle`                                                      |
| `/assets/*`            | caché primero                                                     | llevan huella y se sirven un año como inmutables (`app.ts` l. 135 y 141)                                                                               |
| `/flags/*`, `/icons/*` | caché primero                                                     | ídem, con huella desde el paso 7                                                                                                                       |
| `/api/*` y `/health`   | **nunca**: ni se guarda ni se intercepta                          | `private, no-store` (`spoiler.ts` l. 318); la API sirve según lo que ha visto cada jugador y la caché se vacía al cambiar de cuenta (`main.tsx` l. 24) |
| al instalar            | la entrada, la CSS y los trozos de los cinco destinos de la barra | unos 220 KB con gzip (estimado: los 250,9 del arranque, menos 85,8 de banderas, más cinco páginas, mapa 01 §8)                                         |

**Sin red**: `OfflineBanner` con el `onlineManager` de React Query; cada consulta pausada pinta
`OfflineState`; los botones que escriben se deshabilitan con el motivo `You're offline.`; y una barrera
de error por ruta dentro de `main` conserva cabecera y barra (hoy la única está en la raíz, `main.tsx`
l. 22-30, y sustituye la web entera: captura 48), con `This page needs a connection the first time.` y
`Try again` (pantalla). **Versión nueva**: el service worker nuevo espera y un `Notice` dice
`A new version is ready.` con `Reload` (`skipWaiting` y recarga en `controllerchange`). **iPhone**:
desde iOS 26 toda web de la pantalla de inicio abre como app (mapa 05 §14) y bastan icono y título; el
aviso (instalada y con permiso tras un gesto) es de E4, y el texto de cómo instalar, de E6.

**La medida que revisa la app nativa.** La tarea de analítica (`docs/encargos.md` l. 741-742) anota por
sesión `display-mode`, puntero, ancho y la vuelta a los 7 días. La web está «a la altura» si, con el
móvil en la mitad de las sesiones o más durante 30 días, las pantallas pasan §5 y la vuelta del móvil
llega al 80 % de la del escritorio; si falla dos meses seguidos, se reabre la agenda §4.15.1 (§15).

## 9. La regla de la frontera

**La regla** (para `docs/visual.md` y la cabecera de `contracts.ts`): «La API solo manda lo que la
pantalla pinta, y en la forma en que lo pinta. Un número interno (atributo, `ctl`, `atl`, `tsb`, techo,
talento, fragilidad) cruza solo traducido a lo que el jugador ve: estrellas, tramo, palabra o barra de
cuatro pasos. Toda excepción va en una lista con su motivo».

**El mecanismo**, tres tests que copian lo que E2 ya construyó para el destripe:

1. `apps/api/src/frontera.test.ts`: cada respuesta de las rutas del jugador pasa `schema.strict()`.
   Habría cazado las seis claves de más de `GET /api/teams/:id/news` (mapa 02 §8).
2. `apps/web/src/frontera.test.ts`: cada campo de cada esquema de respuesta de `contracts.ts` se lee en
   `apps/web/src` (AST de TypeScript, como `noEngine.test.ts`) o está en `FRONTERA_SIN_USO` con su
   porqué, como `MUERTAS_CONOCIDAS` de `columnasVivas.test.ts`.
3. El canario de B1a (`spoilerCanary.test.ts`) barre también los `POST` de lectura (la vista previa) y
   planta testigos de números internos (el MON 63,4172 y el `ctl` 61,98765 del mapa 02 §8): ninguna
   ruta puede devolver su valor.

**Lo que se arregla del inventario del mapa 02 §8**: `attributes` de cualquier corredor y del propio
pasan a `attributeStars` (medias estrellas cada diez puntos: manda `rider.ts` l. 218-240, no el SPEC) y a
la marca de cuatro pasos, calculadas en el servidor, como los cerillos (`RiderProfile.tsx` l. 213-225);
salen `arrivals[].tsb`, `days[].ctl`, `atl` y `tsb`, y `log[].atl`; `delta28` viaja como el nivel de su
flecha; `facilities`, `season` y `fame` salen o se pintan. `ctl` y `tsb` del diario quedan en la lista
con el motivo de `condition.ts` l. 4-16. Sin tercera declaración por ruta: el registro de E2 ya obliga.

## 10. Lo que E2 dejó a E3

| Pieza                                                   | Hoy                                                                    | Con el sistema                                                                                            |
| ------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| capa fija (`FixedOverlay`)                              | `bg-slate-900`, flechas `amber-300` y `emerald-300`                    | `broadcast` en ámbito oscuro, `broadcast-up` y `broadcast-down`; el `aria-live="off"` y su resumen, igual |
| barra de grupos (`GroupBar`)                            | maillot a 13 px (l. 242), nombres ocultos en el teléfono (l. 243)      | el vocabulario de §6 está hecho para esos 13 px; las mayúsculas por CSS se quedan (SPEC §6.15)            |
| perfil (`ProfileStrip`)                                 | cotas a 8 y 9 px (l. 70 y 161), siete hexadecimales                    | 12 px y `fill="var(--color-…)"`                                                                           |
| rótulo (`CueCard`)                                      | rojo, `slate-900` o `slate-700` según la clase (l. 36-43)              | `broadcast-alert`, `broadcast` y `broadcast-soft`; el maillot por `WornJerseyIcon` nuevo                  |
| previa, `Highlights`, digest                            | botones propios (`WatchBlocks.tsx` l. 119, `PlayerControls.tsx` l. 57) | `Button` en ámbito oscuro                                                                                 |
| `Report` y clasificaciones                              | tarjeta `rounded-2xl` propia, tablas duplicadas                        | `Panel` y `DataTable`                                                                                     |
| cierre y `Connection lost · Retry`                      | estados propios                                                        | `ErrorState` y `OfflineState`                                                                             |
| el comentario tapado por la barra inferior (captura 09) | sin resolver                                                           | E3 da `--bottom-nav-h` y la regla 6 de §5; esconder la barra es de E6 (`useHideBottomNav`)                |
| disposición, orden y textos                             | de E2                                                                  | no cambian                                                                                                |

## 11. Constantes y tokens

Los tokens están en §3 y viven en el `@theme`; las constantes que no son CSS:

| Constante                      | Valor                                                            | Intención                                                     | Dónde                                       |
| ------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------- |
| `TOP_ROWS`                     | 20                                                               | la regla de tablas (`docs/navegacion.md` §7.3)                | `ui/constants.ts` (hoy `ShowAll.tsx` l. 10) |
| `TOUCH_MIN_PX`, `LINK_MIN_PX`  | 44 y 24                                                          | objetivos táctiles (WCAG 2.5.5 y 2.5.8)                       | `ui/constants.ts` y la prueba de §5         |
| `FONT_MIN_PX`, `INPUT_FONT_PX` | 12 y 16                                                          | letra mínima y la de los campos                               | ídem                                        |
| `JERSEY_PX`                    | `strip` 13, `row` 16, `card` 28, `team` 44, `page` 72, `hero` 96 | los seis tamaños a los que se dibuja un maillot               | `ui/constants.ts`                           |
| `JERSEY_DISTINCT`              | 10                                                               | ΔE00 mínimo entre dos diseños a 13 px, en las cuatro visiones | `shared/jerseyVocabulary.ts`                |
| `PALETTE_MIN`                  | 11                                                               | ΔE00 mínimo entre dos colores de la paleta (medido 11,7)      | ídem                                        |
| `CONTRAST_TEXT`, `CONTRAST_UI` | 4,5 y 3                                                          | WCAG 1.4.3 y 1.4.11                                           | `shared/colorMath.ts`                       |
| `SPACING_STEPS`                | 0, 0,5, 1, 1,5, 2, 2,5, 3, 4, 6, 8, 12, 16                       | los pasos de espaciado permitidos                             | `ui/vocabulario.test.ts`                    |
| `CIERRE`                       | las 17 líneas `--*: initial`                                     | el tema cerrado, inyectado por el test hasta el paso 17       | ídem                                        |
| `LOADING_DELAY_MS`             | 300                                                              | lo que espera el esqueleto para no parpadear                  | `ui/constants.ts`                           |
| `NAV_TIMEOUT_MS`               | 3.000                                                            | cuánto espera la navegación a la red                          | `public/sw.js`                              |

## 12. Tests y bancos

| Test                                | Qué mide                                                                                                                                                                 | Umbral                                                                                                             | Dónde y coste (estimado)              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `shared/colorMath.test.ts`          | WCAG, Machado y ΔE00 contra valores dorados de colour-science                                                                                                            | diferencia ≤ 0,01                                                                                                  | CI, menos de 1 s                      |
| `ui/tokens.test.ts`                 | lee el `@theme` y comprueba las 41 parejas claras y las 25 oscuras                                                                                                       | 4,5 texto, 3 borde, foco y gráfico                                                                                 | CI, menos de 1 s                      |
| `ui/vocabulario.test.ts`            | con `__unstable__loadDesignSystem` de `tailwindcss` (versión fijada) y el AST, toda clase que resuelve en el tema por defecto y no en el cerrado; arbitrarios; espaciado | deuda por fichero ≤ `deuda.json`; 0 desde el paso 17; dos sondas propias (`bg-surface` existe, `bg-indigo-600` no) | CI, unos 3 s                          |
| lint `ui/1` a `ui/10`               | botón, tabla, campo, `title`, estado a mano, paleta de Tailwind, arbitrario, hexadecimal, `style`, emoji                                                                 | 0 fuera de la lista de ficheros heredados; un test exige que cada uno de la lista siga teniendo algún aviso        | CI, `pnpm lint`                       |
| `ui/*.test.tsx`                     | cada estado de cada componente: ARIA, `data-state`, motivo de deshabilitado                                                                                              | todos                                                                                                              | CI, milisegundos                      |
| `shared/jerseyVocabulary.test.ts`   | la paleta en las cuatro visiones, los vetos de los reservados, la tabla de choques regenerada                                                                            | `PALETTE_MIN`, `JERSEY_DISTINCT`; la tabla, idéntica                                                               | CI, unos 5 s (rasterizar 610 diseños) |
| `db` del relleno                    | el reparto del mundo de prueba                                                                                                                                           | 0 pelotones con un par por debajo de `JERSEY_DISTINCT`                                                             | CI, con PGlite                        |
| frontera (§9)                       | `strict`, uso de campos, canario con `POST` y testigos numéricos                                                                                                         | 0                                                                                                                  | CI, unos 10 s                         |
| peso                                | gzip de la CSS y del arranque tras `vite build`                                                                                                                          | CSS ≤ 15 KB (hoy 94,3); arranque ≤ 255 KB (hoy 250,9)                                                              | job `Build`, 2 s más                  |
| `scripts/ui-telefono.mjs` en `/_ui` | las seis pruebas de §5 a 360 y 390 px                                                                                                                                    | 0                                                                                                                  | CI si toca `apps/web`, unos 2 min     |
| `pantallas.yml`                     | §5 en las 45 pantallas y la primera pintura                                                                                                                              | §5                                                                                                                 | cada noche, unos 15 min               |

**Se re-sellan** los seis tests que fijan clases, para que fijen `data-*`: `stageRoute.test.tsx` l. 19,
`riderResults.test.ts` l. 112 a 119 (`placeTone` devuelve un tono, no una clase), `CueCard.test.tsx`
l. 34, `GroupBar.test.tsx` l. 82 y 190, `PlayerControls.test.tsx` l. 145 y `StageCards.test.tsx` l. 361;
y `leaderJerseys.test.tsx` l. 28-88, con la geometría de §6.5. Los de textos caen si cambian palabras.

## 13. Plan por pasos, tests primero

| Paso | PR  | Tests que van antes                                                       | Código                                                                                                                                                                      | Lo que se ve                                                              |
| ---- | --- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1    | 1   | `colorMath.test.ts`, `tokens.test.ts`                                     | `colorMath.ts`; los tokens de §3 en el `@theme`, sin cerrar                                                                                                                 | nada                                                                      |
| 2    | 1   | `vocabulario.test.ts` con `deuda.json` (2.457)                            | las reglas `ui/1` a `ui/10` con los 83 ficheros heredados                                                                                                                   | nada                                                                      |
| 3    | 2   | `ui/*.test.tsx` del lote                                                  | `Button`, `TextLink`, `Field`, `Segmented`, `Disclosure`, `Chip`, `Notice`, `Icon`; `/_ui`; `ui-telefono.mjs`                                                               | la página de catálogo                                                     |
| 4    | 1   | `QueryView` con sus cinco estados                                         | los estados (14 a 18), la barrera por ruta, `OfflineBanner`                                                                                                                 | reintento y aviso sin red donde se use                                    |
| 5    | 2   | trinquete de `ui/5` a 0                                                   | los 70 estados a mano pasan a `QueryView`                                                                                                                                   | en toda la web                                                            |
| 6    | 1   | `tokens.test.ts` ya cubre las barras                                      | `Panel`, `PageHeader`, `Stat`                                                                                                                                               | títulos legibles en los 21 ficheros con `Panel` y los 18 con `SectionBar` |
| 7    | 1   | peso de la CSS                                                            | `Flag` con ficheros; fuera `flag-icons` de `main.tsx` l. 9                                                                                                                  | CSS de 94 a unos 9 KB con gzip (8,5 medido sin banderas)                  |
| 8    | 3   | tests de `DataTable`                                                      | `DataTable`; las 15 tablas, el calendario del equipo primero                                                                                                                | `Add` y `Drop` alcanzables                                                |
| 9    | 2   | el doble plan del mapa 02; `resolveTrainingDay` contra el tick; contratos | §7.1                                                                                                                                                                        | nada aún                                                                  |
| 10   | 2   | `FormScale`; marcado del cuadro                                           | §7.2 y §7.3, `MyRaces`                                                                                                                                                      | el examen                                                                 |
| 11   | 2   | `jerseyVocabulary.test.ts`; el relleno                                    | `jerseyVocabulary.ts`, `jerseyConflicts.ts`, la migración, `CastTeam.jerseyDesign`                                                                                          | maillots nuevos, sin gemelos                                              |
| 12   | 1   | `leaderJerseys.test.tsx` re-sellado                                       | los cuatro dibujos y `WornJerseyIcon({ worn, team, size })`                                                                                                                 | líderes y campeón definitivos                                             |
| 13   | 2   | la comprobación y los vetos en la API                                     | el editor y la ruta de E9                                                                                                                                                   | el editor                                                                 |
| 14   | 2   | `decide(request)` del service worker como función pura                    | manifiesto, iconos, `sw.js`, aviso de versión                                                                                                                               | se instala y aguanta sin red                                              |
| 15   | 2   | los tres de §9                                                            | `attributeStars`, fuera los números                                                                                                                                         | nada (la pantalla ya pintaba estrellas)                                   |
| 16   | 10  | el trinquete baja en cada uno                                             | las pantallas por deuda: `Race` 166, `MyRaces` 98, `TeamCalendar` 93, `AdminNames` 92, `RacesIndex` 83, `Account` 81, `RaceOrders` 75, `Home` 70, `TeamSquad` 68 y el resto | pantalla a pantalla                                                       |
| 17   | 1   | `vocabulario.test.ts` exige el cierre en el fichero                       | las líneas `initial`; fuera `deuda.json` y la lista de heredados                                                                                                            | nada: ya no queda nada que cerrar                                         |
| 18   | 1   | los umbrales de §5 medidos                                                | `pantallas.yml`                                                                                                                                                             | E3 terminado si todo pasa                                                 |

Unos 37 PR (estimado). Dependencias: 1 y 2 antes que todo; 3 antes que 4 a 16; 9 antes que 10; 11 antes
que 12 y 13; del 3 al 15, dos agentes a la vez sin tocar los mismos ficheros. Cada paso deja el juego
desplegable: hasta el 17 el tema no se cierra y lo de hoy sigue resolviendo.

## 14. Riesgos y fronteras

| Con quién o qué   | Riesgo o frontera                                                                               | Cómo se cubre                                                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tailwind          | `__unstable__loadDesignSystem` puede cambiar al actualizar                                      | versión exacta en `apps/web/package.json` y dos sondas que hacen fallar el test si el instrumento deja de medir                                            |
| el dueño          | el relleno repinta los 219 equipos de una vez                                                   | 174 conservan su base; la decisión está en §15 con su alternativa                                                                                          |
| E2                | seis tests de `broadcast/` se re-sellan; el contrato de `WornJerseyIcon` cambia                 | el paso 12 los toca juntos y no cambia ningún dato de E2                                                                                                   |
| E4                | el aviso al teléfono necesita la web instalada                                                  | el paso 14 va antes que E4; el permiso usa `Button` y `Notice`                                                                                             |
| E6                | barra inferior, `useHideBottomNav`, dónde vive cada explicación                                 | E3 da componentes y reglas medibles (§5); E6 decide dónde                                                                                                  |
| E8                | el patrocinador quiere un color o un logotipo                                                   | §6.6: el mismo validador; logotipo solo desde 28 px                                                                                                        |
| E9                | moderar el maillot                                                                              | vocabulario cerrado, `jersey_status` y la ruta de reinicio                                                                                                 |
| E10               | el texto traducido crece y el chino corta distinto                                              | ningún componente fija el ancho de un texto; `/_ui` con un pseudoidioma de textos ×1,4 en la prueba de §5                                                  |
| E12               | el Mundial y los continentales                                                                  | la mundial ya está dibujada; un continental tendrá que quedar a `JERSEY_DISTINCT` de la nacional y de la mundial (con mangas doradas queda a 9,8: no vale) |
| E5, E7, E11 y E13 | pantallas nuevas                                                                                | el catálogo y el tema cerrado: sin valores nuevos fuera de `@theme`, y un componente nuevo solo entra por la puerta de §4                                  |
| el propio sistema | la letra del sistema cambia de un sistema operativo a otro, y la prueba es en Chromium de Linux | se mide con números, no con píxeles; el dueño mira `/_ui` en su teléfono (`Claude.md` l. 26)                                                               |

## 15. Decisiones del dueño

**1. La paleta** (las tres pasan sus parejas, medido en `tokens_alt.py`):

| Opción                                 | Qué cambia                                                                                                                | Medidas                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **A, manager accesible** (por defecto) | conserva el estilo de PR #105: cabecera `#123a5c`, `Panel` en `#006e8c` liso, barra dorada `#d99400` con `ink`            | blanco sobre el panel 5,82; `ink` sobre el oro 6,95      |
| B, paneles claros                      | cabecera de `Panel` `#e3f2f7` con título `#123a5c`; botón `#006e8c` (encima `#005a73`); título de página sobre el tablero | 10,25; botón 5,82 y 7,75; título 9,98                    |
| C, retransmisión                       | cromo `#0f1d33` en cabecera y paneles, botón dorado `#e8a200` con `ink` (encima `#f2b52a`), filete dorado                 | 16,88; botón 8,15 y 9,70; el filete es decorativo (2,19) |

Por defecto A, porque el estilo fue una decisión para el público de Hattrick y PCM (mapa 04 §2) y lo que
fallaba era el contraste, no el estilo. Con B o C cambian los valores de seis tokens (cabecera de
`Panel`, barra de página y acción) y ningún componente.

**2. La tipografía** (peso medido de los `woff2` de Fontsource):

| Opción                                                                  | Peso                                                             | Qué da                                                       |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| **la del sistema** (por defecto)                                        | 0 KB                                                             | sin espera ni parpadeo; cada teléfono la suya                |
| Inter variable                                                          | 47,1 KB el latín y 83,1 el latín extendido (Ł, ő, ș…)            | la misma letra en todos; cifras tabulares buenas             |
| Barlow Semi Condensed (títulos y cifras) con la del sistema en el texto | 68,5 KB los pesos 400, 600 y 700 en latín, 43,9 más el extendido | aire de rótulo de televisión y más letras por línea a 360 px |

**3. La señal de campeón.** Las variantes del dueño (00-encargo §7.1), juzgadas con sus cuatro criterios
(distancia a la marca; forma a 16, 28 y 72 px; daltonismo medido; figura reservada); «a V0» es la
distancia dibujada a la marca de la UCI a 13 px, normal y peor daltonismo:

| Variante                                              | Distancia a la marca (hechos de §7.1)                | Forma a 16, 28 y 72 px                               | A V0 y al equipo más cercano (peor visión)                         | Reservada: ¿la forma sola dice «campeón» a 13 px? |
| ----------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| los colores de la UCI en otro orden, sobre blanco     | la guía fija el orden; el público no lo nota (inrng) | cada banda mide 0,67, 1,17 y 3 px; a 16 px se funden | 15,0 normal (mapa 03, V1)                                          | no: una franja, como `hoop`                       |
| en vertical o en diagonal                             | la guía ya regula las dos                            | igual                                                | 17,2 normal en vertical (mapa 03, V2 y V3); la diagonal, sin medir | no: una raya, como `sides`                        |
| otros cinco colores sobre blanco, en vertical (D2)    | lejos en los colores, igual en la disposición        | igual                                                | 18,1 / 15,2; 11,1                                                  | no                                                |
| los de la UCI sobre azul marino (D3)                  | son los colores registrados, en su orden             | igual                                                | 44,5 / 43,4; 9,1 (choca con un equipo)                             | no                                                |
| tres bandas anchas de la marca sobre azul marino (D1) | sin colores de la UCI, sin blanco, tres y no cinco   | bandas de 1,5, 2,6 y 6,8 px: se leen desde 28        | 42,3 / 38,0; 14,6                                                  | a medias: a 13 px es una franja clara             |
| **la estrella, S1** (por defecto)                     | ninguna banda                                        | estrella de 6,0, 10,5 y 27,1 px                      | 50,1 / 47,9; 12,9                                                  | sí: una mancha central que ninguna figura tiene   |

Alternativas concretas: **S1** (§6.4); **D1**, la línea del dueño: azul marino `#14284b` con tres bandas
de 4,5 u en `#1499bb`, `#f0b323` y blanco, desde y 23, 28 y 33, y el mundial con el mismo canesú dorado;
**S2**: oro `#f0b323` con la estrella azul marino, a 31,2 de V0 pero a 12,6 del amarillo de líder.
Por defecto S1: la más lejana de la marca, la única que no es una banda, y el emblema del juego.

**4. El vocabulario del maillot:**

| Opción                                           | Medida                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| **10 colores y 7 figuras** (por defecto)         | 610 diseños; colores ≥ 11,7; 96,6 % de pares ≥ 10 a 13 px; 101 mutuamente distinguibles    |
| 12 colores y 7 figuras (con verde lima y marrón) | el par de colores más cercano, 5,7 en deuteranopía (medido); los diseños, sin medir        |
| 10 colores y 5 figuras (sin `hoop` ni `sleeves`) | 410 diseños; son las dos figuras que menos aportan al conjunto distinguible (6 y 2 de 101) |

**5. Las demás**, con su valor por defecto:

| Decisión                                  | Por defecto                              | Si elige otra cosa                                                                                |
| ----------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| repintar los equipos NPC                  | sí, una vez, con el relleno de §6.2      | sin repintar, los gemelos siguen (310 de 310 pelotones) y el validador solo protege a los humanos |
| el dorsal del equipo líder                | no vuelve                                | vuelve como `Chip` amarillo con las cifras (`#214`) donde ya se ve el dorsal; nunca como glifo    |
| las palabras de la escala                 | las cinco de hoy                         | las del diseño, `Buried`, `Loaded`, `Fresh`, `Peaking`, `Stale` (`entrenamiento.md` l. 1086-1099) |
| el orden del cuadro                       | las llegadas antes que los controles     | los controles antes: el pronóstico baja a 1.116 px                                                |
| los rótulos de la barra inferior (con E6) | `Home`, `Rider`, `Team`, `World`, `News` | los de escritorio, que hoy se cortan con cinco destinos                                           |
| los umbrales de la app nativa (§8)        | 50 % de sesiones móviles; vuelta al 80 % | otros números; la regla de dos meses seguidos se queda                                            |
| modo oscuro                               | no                                       | un bloque de tokens y su fila en `tokens.test.ts`                                                 |
