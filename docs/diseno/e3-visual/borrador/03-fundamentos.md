## 3. Los fundamentos: paleta, letra, espacio, densidad, radios, sombras e iconos

Los tokens de esta sección son los únicos valores de la interfaz (principio 2.8). Viven en el `@theme` de `apps/web/src/index.css`, que §3.11 escribe entero, y `tokens.test.ts` comprueba cada pareja de texto y fondo de las tablas de §3.1, §3.2 y §3.3 con la razón WCAG 2.x, mezclando en sRGB los colores con transparencia sobre su fondo, como el navegador. Los contrastes son los de telefono §3.1 (`paleta_final.py`), uso C5 (los tramos) y lectura §3.1 (`own`); los marcados con (\*) los ha medido el redactor de esta sección con `<scratchpad>/redactor-L1/fundamentos.py` (colour-science 0.4.7; el script reproduce, como control, los 3,66, 6,72, 10,57 y 9,0 de telefono y de uso).

### 3.1 La paleta

La paleta es la A, «manager sobrio» (D-03, el defecto de DD-01). Conserva la identidad que creó el PR #105 (`9361029`, 3-8-2026: «dark navy header», «cyan panel headers, gold section bars»), la que reconoce el público de Hattrick y PCM (mapa 04 §2), y cambia su ejecución: sin degradados (ninguno pasa, y axe no los mide), sin barras de color a todo lo ancho (devuelve 36 px por panel y 48 por página al teléfono) y todo texto a 4,5:1 o más. La variable de cada token es `--color-<token>`.

| Token                                                                                 | Utilidades                              | Valor                                                 | Uso                                                                                                            | Contraste medido (fondo: razón)                                                                                  |
| ------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `canvas`                                                                              | `bg-canvas`                             | `#eef2f6`                                             | fondo de página (`body`, hoy `#e8edf2` fuera del tema, `index.css` l. 15-17)                                   | fondo                                                                                                            |
| `surface`                                                                             | `bg-surface`                            | `#ffffff`                                             | tarjetas, filas, campos                                                                                        | fondo                                                                                                            |
| `surface-2`                                                                           | `bg-surface-2`                          | `#f5f7fa`                                             | tramos inactivos, esqueletos, cabecera de tabla, `Chip` `neutral`                                              | fondo; 1,07 contra `surface` (\*)                                                                                |
| `line`                                                                                | `border-line`, `divide-line`            | `#d8dee6`                                             | separador decorativo                                                                                           | 1,35 `surface`, 1,20 `canvas` (\*): WCAG no lo pide                                                              |
| `line-strong`                                                                         | `border-line-strong`                    | `#7b8794`                                             | borde de campo, de control y de tramo                                                                          | 3,66 `surface`; 3,25 `canvas`; 3,41 `surface-2` (\*)                                                             |
| `ink`                                                                                 | `text-ink`                              | `#10202f`                                             | texto, título de `Notice`                                                                                      | 16,54 `surface`; 14,70 `canvas`; de 14,42 a 15,00 sobre los cuatro fondos de tono (\*)                           |
| `ink-2`                                                                               | `text-ink-2`                            | `#435266`                                             | secundario, segundo renglón, texto de `Notice`, consecuencia de `ActionBar`                                    | 7,96; 7,08 `canvas`; 7,42 `surface-2`; de 6,94 a 7,22 sobre los fondos de tono y 7,26 sobre `own-tint` (\*)      |
| `ink-3`                                                                               | `text-ink-3`                            | `#566579`                                             | rótulos, ejes, equipo bajo el nombre                                                                           | 5,94; 5,28 `canvas`; 5,54 `surface-2`; 5,42 `own-tint` y 5,18 `info-bg` (\*)                                     |
| `white`                                                                               | `text-white`, `bg-white`                | `#ffffff`                                             | texto sobre `navy`, `navy-dark`, `bad` y los tramos                                                            | 11,76 `navy`; 15,23 `navy-dark`; 6,57 `bad` (\*)                                                                 |
| `navy`, `navy-dark`                                                                   | `bg-navy`, `bg-navy-dark`               | `#123a5c`, `#0b2740`                                  | la cabecera; las pestañas de nivel 2, la barra inferior y la capa fija                                         | blanco encima 11,76 y 15,23                                                                                      |
| `on-navy-2`                                                                           | `text-on-navy-2`                        | `rgb(255 255 255 / 0.8)`                              | reloj del mundo, pestaña y destino inactivos                                                                   | 8,15 `navy`; 10,19 `navy-dark` (\*)                                                                              |
| `cyan`                                                                                | `bg-cyan`, `border-cyan`                | `#1499bb`                                             | marca, decorativo                                                                                              | 3,33 sobre blanco: nunca texto                                                                                   |
| `accent`                                                                              | `bg-accent`, `text-accent`              | `#0b6e8a`                                             | enlace, botón primario, tono `info`                                                                            | 5,81 en los dos sentidos; 5,17 `canvas`; 5,42 `surface-2` (\*); 5,07 `info-bg`                                   |
| `accent-strong`                                                                       | `bg-accent-strong`                      | `#085a71`                                             | primario encima y pulsado                                                                                      | blanco encima 7,75                                                                                               |
| `on-accent`                                                                           | `text-on-accent`                        | `#ffffff`                                             | texto del primario; el ámbito oscuro lo redefine                                                               | 5,81 sobre `accent`                                                                                              |
| `gold`, `gold-ink`                                                                    | `bg-gold`, `text-gold`, `text-gold-ink` | `#e0a106`, `#7a5000`                                  | realce con `ink` encima, la flecha de la capa fija y el subrayado de `Tabs` `nav`; el texto dorado sobre claro | `ink` sobre `gold` 7,30; `gold` sobre `navy-dark` 6,72 y sobre `navy` 5,19 (\*); `gold-ink` 7,06 sobre `surface` |
| `good`, `good-bg`                                                                     | `text-good`, `bg-good-bg`               | `#167a3a`, `#e6f4ea`                                  | correcto, `Called up`                                                                                          | 5,41 `surface`; 4,77 sobre su fondo                                                                              |
| `warn`, `warn-bg`                                                                     | `text-warn`, `bg-warn-bg`               | `#8f4e00`, `#fff3d6`                                  | aviso, el velo                                                                                                 | 6,45; 5,85                                                                                                       |
| `bad`, `bad-bg`                                                                       | `text-bad`, `bg-bad`, `bg-bad-bg`       | `#b42318`, `#fdeceb`                                  | error, peligro, `Button` `danger`                                                                              | 6,57; 5,75                                                                                                       |
| `info-bg`                                                                             | `bg-info-bg`                            | `#e3f2f7`                                             | días de viaje, avisos informativos                                                                             | `accent` encima 5,07                                                                                             |
| `focus`                                                                               | `outline-focus`, `ring-focus`           | `#1d4ed8`                                             | anillo de foco de 2 px con 2 de separación                                                                     | 6,70 `surface`; 5,96 `canvas`                                                                                    |
| `disabled-ink`, `disabled-bg`                                                         | `text-disabled-ink`, `bg-disabled-bg`   | `#6b7787`, `#e9edf2`                                  | control deshabilitado                                                                                          | 3,87 (WCAG 1.4.3 lo exime); 4,55 sobre `surface` (\*)                                                            |
| `own`, `own-tint`                                                                     | `border-own`, `bg-own-tint`             | `#a87300`, `#fdf4dc`                                  | barra de 3 px y fondo de la fila propia                                                                        | barra 4,10 contra blanco y 3,74 contra `own-tint` (\*); `ink` encima 16,26                                       |
| `arrival-cooked`, `arrival-loaded`, `arrival-fine`, `arrival-spoton`, `arrival-rusty` | `bg-arrival-*`                          | `#b42318`, `#b45309`, `#566579`, `#167a3a`, `#1d5fa8` | el tramo activo de `Scale5`: `Cooked`, `Loaded`, `Fine`, `Spot on`, `Rusty`                                    | blanco encima 6,57, 5,02, 5,94, 5,41 y 6,45                                                                      |

Los seis `brand-*` de hoy (`index.css` l. 6-11) siguen en el `@theme` como heredados, para que lo de hoy resuelva hasta el paso 22, que los borra con el cierre; `tokens.test.ts` no los mira. `tokens.test.ts` falla si un texto de la tabla baja de 4,5:1 o un borde o un tramo de 3:1, salvo `disabled-ink`, que comprueba a 3,0 por la exención de WCAG.

### 3.2 Los estados y la escala de llegada

Ningún estado va solo en color (D-13; O-31): `Chip` y `Notice` exigen en su tipo el tono y el texto (§4.7), cada tono lleva su icono, y el dinero va siempre con su signo (`+80`, `−80`).

| Tono (`Tone`) | Texto, borde e icono | Fondo       | Icono     | Texto sobre su fondo |
| ------------- | -------------------- | ----------- | --------- | -------------------- |
| `neutral`     | `ink-2`              | `surface-2` | ninguno   | 7,42                 |
| `accent`      | `on-accent`          | `accent`    | ninguno   | 5,81                 |
| `good`        | `good`               | `good-bg`   | `check`   | 4,77                 |
| `warn`        | `warn`               | `warn-bg`   | `warning` | 5,85                 |
| `bad`         | `bad`                | `bad-bg`    | `error`   | 5,75                 |
| `info`        | `accent`             | `info-bg`   | `info`    | 5,07                 |

El ΔE00 entre los tonos, en las cuatro visiones y en grises (H-18; medido aquí, \*), es la razón del mecanismo: por el color, `warn` y `bad` son el mismo para un deuteranope y ningún par se separa en grises. `tokens.test.ts` lo informa en su salida y no lo hace umbral, porque lo que distingue es la forma y el texto.

| Par           | Normal | Protanopía | Deuteranopía | Tritanopía | Grises | Razón de luminancia |
| ------------- | ------ | ---------- | ------------ | ---------- | ------ | ------------------- |
| `good`/`warn` | 42,1   | 10,1       | 9,6          | 51,6       | 4,3    | 1,19                |
| `good`/`bad`  | 62,2   | 13,6       | 9,0          | 58,8       | 4,8    | 1,21                |
| `good`/`info` | 34,5   | 35,6       | 34,9         | 5,7        | 1,8    | 1,07                |
| `warn`/`bad`  | 18,9   | 6,3        | 1,7          | 10,1       | 0,5    | 1,02                |
| `warn`/`info` | 43,0   | 39,5       | 43,6         | 48,3       | 2,5    | 1,11                |
| `bad`/`info`  | 53,2   | 36,9       | 43,2         | 54,6       | 3,0    | 1,13                |

**La escala de llegada** (X-20, medida por uso, C5): el texto blanco sobre el tramo activo va de 5,02 (`Loaded`) a 6,57 (`Cooked`); `Cooked` y `Loaded` quedan a 6,3 de ΔE00 en deuteranopía, y el tramo activo a 38 o más del apagado (`surface-2`) en toda visión. Por eso `Scale5` (§4.8) se lee por posición y por palabra, no por su color: el orden es fijo, de cansado a fresco (`Cooked`, `Loaded`, `Fine`, `Spot on`, `Rusty`, D-42), y la palabra del tramo activo va escrita en él.

### 3.3 El ámbito oscuro

E3 no hace un modo oscuro (D-04; DD-05, por defecto no: duplica los estados de todos los componentes y nadie lo ha pedido, mapa 04 §2). Hace el ámbito `[data-surface='dark']` (I-10): un atributo que redefine los tokens para que los mismos componentes sirvan sobre fondo oscuro sin saber dónde están. Lo llevan `AppHeader`, `BottomNav`, la capa fija (`FixedOverlay`), el rótulo (`CueCard`) de fondo oscuro, `WatchBlocks`, `PlayerControls`, `StagePreviewCards` y `StageClosingCards` (§14). Lo que redefine, con su contraste sobre `surface` (`#0b2740`) y `surface-2` (`#123a5c`) del ámbito:

| Token                          | En el ámbito                         | Medida                                                                           | Quién                     |
| ------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------- | ------------------------- |
| `surface`, `surface-2`         | `#0b2740`, `#123a5c`                 | fondos; 1,30 entre sí (\*)                                                       | telefono §15.1 (paleta C) |
| `ink`; `ink-2`, `ink-3`        | `#ffffff`; `rgb(255 255 255 / 0.75)` | 15,23 y 11,76; 9,10 y 7,36                                                       | telefono; repetido (\*)   |
| `line`                         | `#2c5274`                            | 1,86 y 1,44: decorativo, visible sobre las dos y muy por debajo de `line-strong` | (\*)                      |
| `line-strong`                  | `#7f97b0`                            | 5,05 y 3,90 (WCAG 1.4.11 pide 3); 3,30 sobre `disabled-bg`                       | (\*)                      |
| `accent`, `on-accent`          | `#35bdda`, `#0b2740`                 | 6,85 y 5,29; `on-accent` sobre `accent`, 6,85                                    | telefono §15.1; (\*)      |
| `accent-strong`                | `#7fd6e9`                            | `on-accent` encima 9,21; a 8,1 de ΔE00 de `accent` (5,9 en tritanopía)           | (\*), decisión 3-b        |
| `focus`; `gold`, que no cambia | `#ffd166`; `#e0a106`                 | 10,57 y 8,16 (el `focus-dark` de telefono); 6,72 y 5,19                          | telefono; (\*)            |
| `disabled-bg`, `disabled-ink`  | `#1f4567`, `#a3b2c3`                 | el fondo, 1,53 sobre `surface` y 1,18 sobre `surface-2`; el texto encima, 4,61   | (\*), decisión 3-c        |

Dentro del ámbito, un fondo es `surface`, `surface-2` o un token que el ámbito no redefine (`navy`, `navy-dark`, `bad`, `gold`), y **un token de tinta nunca es un fondo**: `bg-ink-2` en un elemento del ámbito pintaría el blanco al 75 %. Fuera del ámbito no cambia nada, y `tokens.test.ts` comprueba las parejas de esta tabla igual que las de §3.1.

### 3.4 La letra

La del sistema (D-05, el defecto de DD-02): `--font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', Arial, sans-serif`, cero bytes, ningún salto de letra con Slow 4G, y con los alfabetos que traerá E10. Siete tamaños, en `rem` para que la letra raíz los escale (§7.8):

| Token     | Utilidad       | Tamaño / interlínea | Peso                                   | Uso                                                                 |
| --------- | -------------- | ------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| `caption` | `text-caption` | 12 / 16 px          | 400 y 600; en versales, 600 y +0,04 em | el mínimo: ejes, rótulos, cabecera de tabla, `Chip`, barra inferior |
| `meta`    | `text-meta`    | 14 / 20             | 400                                    | segundo renglón, entradillas, texto de aviso, línea de estado       |
| `row`     | `text-row`     | 15 / 20             | 600                                    | primer renglón de una fila: el nombre, la carrera                   |
| `body`    | `text-body`    | 16 / 24             | 400                                    | texto y **todo campo**                                              |
| `title`   | `text-title`   | 18 / 24             | 600                                    | título de `Panel`                                                   |
| `page`    | `text-page`    | 24 / 32             | 700                                    | el `h1` de `PageHeader`                                             |
| `display` | `text-display` | 32 / 40             | 700                                    | cifras grandes: saldo, km a meta                                    |

El peso va dentro del token (`--text-row--font-weight`), así que `text-row` ya es 600 y `font-normal` lo baja. Pesos: 400, 600 y 700 (`font-normal`, `font-semibold`, `font-bold`); `font-medium` (243 apariciones) y `font-mono` (12) van a la deuda. El rótulo en versales es `text-caption font-semibold uppercase tracking-caps`, con `--tracking-caps: 0.04em` (decisión 3-a). Toda columna de cifras lleva `tabular-nums`. Humanos en 600 y bots en cursiva con peso 400 (`RiderName.tsx` l. 19-20; [DUEÑO 24]). Mínimo, 12 px en todo nodo de texto, SVG incluido (las cotas de `ProfileStrip.tsx` l. 70 y 161 pasan de 9 y 8 a 12), y 16 px en todo campo. Si el dueño elige otra letra, se sirve desde `apps/web/public/fonts/` con `font-display: swap`, porque la CSP solo deja `font-src 'self' data:` (`apps/api/src/app.ts` l. 183).

### 3.5 Espacio, rejilla y densidad

El paso es de 4 px (`--spacing: 0.25rem`), y los únicos pasos permitidos son los de `SPACING_STEPS` = 0, 0,5, 1, 1,5, 2, 2,5, 3, 4, 6, 8, 12 y 16 (de 0 a 64 px; los cuenta `vocabulario.test.ts`, §5.2). Dos cortes, `sm` (40rem, 640 px) y `lg` (64rem, 1.024 px): las tres apariciones de `md:` y la de `xl:` van a la deuda. Dos contenedores: `max-w-page` (72rem, el `max-w-6xl` de hoy, `App.tsx` l. 158) y `max-w-form` (28rem). Las medidas con el dedo (D-06, telefono §3.3), todas alturas mínimas (`min-h-*`), nunca fijas, para que la letra al doble no se recorte (H-17):

| Medida                                                        | A 360 px                                                                                                       | Desde 640                             | Desde 1.024 | Con ratón (`fine:`)    |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------- | ---------------------- |
| margen lateral de la página; relleno de `Panel` `default`     | 12 (`px-3`); 12                                                                                                | 16; 16                                | 24; 16      | igual                  |
| fila de `RankTable`                                           | 48                                                                                                             | 48                                    | 48          | 36                     |
| fila con acción (`ActionRow`)                                 | 64                                                                                                             | 64                                    | 64          | 48                     |
| objetivo (`Button`, enlace de fila, pestaña); campo (`Field`) | 44; 48                                                                                                         | 44; 48                                | 44; 48      | 32 (`Button` `sm`); 40 |
| lo fijo y la cabecera                                         | `AppHeader` 48 más el área segura; `Tabs` 44; `BottomNav` 56 más `env(safe-area-inset-bottom)`; `ActionBar` 60 | `BottomNav` no se pinta (`sm:hidden`) | igual       | igual                  |

La densidad depende del puntero, no del ancho (I-21): `@custom-variant fine (@media (pointer: fine))`, porque el público de Hattrick y PCM lee tablas densas con ratón (mapa 04 §2), y un portátil táctil manejado con el dedo, o una tableta a 1.024, siguen en 44. Solo un componente escribe `fine:`, y solo para las medidas de la última columna; ninguna página lo usa (§6.6).

### 3.6 Radios y sombras

Un radio, `--radius-ui` de 8 px (`rounded-ui`), para panel, botón, campo, aviso y tramo; `rounded-full`, que en Tailwind v4 es estática, solo en `Chip` y en la pastilla de `BottomNav` (D-07). Dos sombras: `shadow-card` (`0 1px 2px rgb(16 32 47 / 0.08)`), en `Panel`, y `shadow-bar` (`0 -2px 8px rgb(0 0 0 / 0.12)`), en `BottomNav`, `ActionBar` y `UpdateToast`. Los radios y sombras de hoy (`rounded-md`, `rounded-lg`, `rounded-2xl`, `shadow-sm`, `shadow-md`, la sombra arbitraria de `BottomNav.tsx` l. 44) no se redefinen: son deuda y desaparecen con el cierre.

### 3.7 Los iconos

Veinticuatro iconos propios en `apps/web/src/components/ui/icons.tsx`, que pinta `Icon` (§4.6): SVG sobre una rejilla de 24 u, trazo de 2 u con extremos y uniones redondeados, `fill="none"` salvo `star-full` y `star-half`, y `currentColor`; a 16, 20 o 24 px, siempre con su texto al lado o con `aria-label` (D-07). Los emoji salen de la interfaz porque cada sistema los pinta a su manera y un glifo pequeño se leyó «Ill» en el teléfono del dueño ([DUEÑO 5]):

| Iconos                                          | Dónde                                                                                 | Lo que sustituyen                                                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `home`, `rider`, `team`, `world`, `news`        | los cinco destinos de `BottomNav`                                                     | nada: hoy son solo texto (`BottomNav.tsx` l. 59)                                                                               |
| `account`                                       | `AppHeader`, con `aria-label="Account"`                                               | el texto `Account` de `Header.tsx`                                                                                             |
| `travel`, `race`                                | el viaje (`TripRow`, `ActionRow`) y el día de carrera                                 | `✈️` y `✈` (`Training.tsx` l. 227, `TeamCalendar.tsx` l. 94), `🚴` (`Training.tsx` l. 210), `🏁` (`LastRaceReport.tsx` l. 102) |
| `check`, `warning`, `error`, `info`             | los tonos de §3.2; `info` también en `InfoButton`                                     | `⚠` y `ℹ` (`RaceOrders.tsx` l. 718), `ⓘ`                                                                                       |
| `offline`, `retry`                              | `OfflineBanner`, `OfflineState`; `Try again`, `Retry`, `Reload`                       | nada                                                                                                                           |
| `close`, `more`                                 | cerrar un aviso o `InstallHint`; el menú de `PlayerControls`                          | `⋯`                                                                                                                            |
| `chevron-left`, `chevron-right`, `chevron-down` | la vuelta de `PageHeader`, etapa anterior y siguiente, `Disclosure`, `Field` `Select` | `←` como vuelta, `‹` y `›`                                                                                                     |
| `star-full`, `star-half`, `star-empty`          | `StarRating`                                                                          | `★` con relleno por ancho (`StarRating.tsx` l. 2-20)                                                                           |
| `trend`, `share`                                | la flecha de cinco niveles, girada en pasos de 45°; `Share to watch`                  | `▲`, `▼`, `↑`, `↓`, `↗`, `↘`                                                                                                   |

Tres emoji no tienen icono y pasan a palabra (decisión 3-d): el `🏆` del ganador en el índice de carreras (`RacesIndex.tsx` l. 126 y 223) pasa a `Winner` (pantalla) delante del nombre; el `🏠` de `Housing` (`Finances.tsx` l. 39) se va, porque el título del panel y `Lives in` ya lo dicen; y el tiempo de las órdenes (`🌧`, `🌦`, `☀`, `RaceOrders.tsx` l. 244) pasa a `Rain`, `Showers` o `Dry` (pantalla) delante de `60% · 14°C`. Los emoji de los logros son contenido y se quedan (`packages/db/src/ranking.ts` l. 571-621). La `→` de `StageRoute` es un signo del texto, no un icono, y se queda.

### 3.8 El material generable

Es regla (D-08; I-23; `docs/agenda.md` §4.22.5): los iconos de la interfaz, los de la web instalable, `og-default.png`, `NATIONAL_SASH`, la tabla de choques y el sprite de banderas con sus coordenadas salen de scripts del repositorio (`apps/web/scripts/`, `packages/shared/scripts/`, `packages/db/scripts/`), y el presupuesto de dibujo a mano es cero. Cada fichero generado lleva en su cabecera la huella SHA-256 de sus entradas, un test lo regenera y lo compara, y el PR que lo introduce lleva en su descripción la hoja de contactos que revisa una persona. Para los 24 iconos (decisión 3-e): el agente del paso 9 escribe sus fuentes en `apps/web/scripts/icons/<nombre>.svg` con las reglas de §3.7, y `apps/web/scripts/ui-icons.mjs` las valida (rejilla de 24, trazo de 2, solo `currentColor`, ningún texto), escribe `icons.tsx` con la huella y pinta la hoja de contactos a 16, 20 y 24 px, sobre claro y en el ámbito oscuro.

### 3.9 Dónde vive cada cosa

| Qué                                                                 | Dónde                                                                                               | Por qué                                                                                      |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| tokens de color, letra, radio, sombra, cortes y contenedores        | el `@theme` de `apps/web/src/index.css`, sin `inline` (§3.11)                                       | Tailwind v4 crea de ahí las utilidades, y sin `inline` el ámbito oscuro puede redefinirlos   |
| el catálogo de componentes                                          | `apps/web/src/components/ui/`, un componente por fichero con su `.test.tsx`                         | una carpeta, una frontera para el lint (§5.3)                                                |
| `WornJerseyIcon`                                                    | `apps/web/src/components/broadcast/WornJerseyIcon.tsx`, donde está                                  | es el contrato de E2 y lo importan sus componentes                                           |
| constantes visuales; las de red; las de la prueba                   | `apps/web/src/components/ui/constants.ts`; `apps/web/src/net.ts`; `apps/web/e2e/telefono.config.ts` | la prueba importa las de `ui/constants.ts` y no las copia                                    |
| vocabulario y geometría del maillot, colores de líder y de campeón  | `packages/shared/src/kit.ts`, en el barril                                                          | lo dibuja la web, lo valida la API y lo reparte `packages/db` (§8)                           |
| WCAG, Machado 2009, CIELAB y ΔE00                                   | `packages/shared/src/colorMath.ts`, fuera del barril (I-31)                                         | lo usan `tokens.test.ts`, `kit.test.ts` y el servidor; en el barril viajaría a la web (H-03) |
| distancia dibujada, tabla de choques, reparto, rivales de temporada | `packages/db/src/kitDistance.ts`, `kitConflicts.generated.ts`, `kits.ts`, `seasonRivals.ts`         | solo servidor                                                                                |
| la precedencia del día                                              | `packages/shared/src/trainingDay.ts` (`resolveTrainingDay`)                                         | la usan el tick y la vista previa (§11)                                                      |
| las palabras de pantalla                                            | `apps/web/src/domain/words.ts`                                                                      | junto a `labels.ts` y `format.ts`, que ya pintan texto (§4.10)                               |
| `PREVIEW_RACE_DAY_TSS` y su ventana                                 | `packages/engine/src/constants.ts` (D-37)                                                           | `Claude.md`: toda constante de juego vive en el motor                                        |

`colorMath.ts` (I-31) da `wcagContrast`, `simulateCvd` (Machado 2009, severidad 1, en RGB lineal) y `deltaE00` (CIEDE2000 en CIELAB D65), con el tipo `Vision`; `colorMath.test.ts` los compara a 0,01 con valores dorados de colour-science 0.4.7. Una sola implementación evita dos cifras distintas para lo mismo.

### 3.10 Las dos decisiones de gusto

**DD-01, la paleta**: por defecto la A, la de §3.1; B («manager clásico»), C («noche y oro») y D (la de la retransmisión) se ven lado a lado en `opciones/index.html`, y cualquiera cambia seis tokens del `@theme` y ningún componente. **DD-02, la letra**: por defecto la A, la del sistema; B (Inter variable, de 47,1 a 48,3 KB el latín) y C (Barlow Semi Condensed 600 en títulos y cifras, 22.984 bytes) se ven en la misma página sobre una tabla de resultados y un rótulo, y cualquiera de las dos añade una carga con `swap` y un salto de letra en la primera visita.

### 3.11 `apps/web/src/index.css`, entero

Es el fichero del paso 7, el de los tokens, compilado por el redactor con Tailwind 4.3.3 abierto y cerrado (`<scratchpad>/redactor-L1/comprobar-tema.mjs`): con las 17 líneas del cierre activas resuelven las 43 clases de muestra del sistema (`bg-canvas`, `text-row`, `rounded-ui`, `fine:h-9`, `@max-[21.25rem]:hidden`…), dejan de resolver `bg-indigo-600`, `text-sm`, `rounded-md`, `font-medium`, `md:block`, `max-w-6xl` y `shadow-sm`, y siguen resolviendo `text-[11px]` y `p-5`, como midió el juez de código (C4).

```css
@import 'tailwindcss';

/* EL SISTEMA VISUAL (docs/visual.md §3): tokens.test.ts comprueba cada pareja. Sin `inline`. */
@theme {
  /* EL CIERRE (paso 22, D-14): el PR del paso 22 cambia este comentario por las 17 líneas de §5.1,
     una por renglón, y borra los heredados. Hasta entonces lo de hoy sigue resolviendo.
  --color-*: initial; --font-*: initial; --font-weight-*: initial; --text-*: initial;
  --tracking-*: initial; --leading-*: initial; --radius-*: initial; --shadow-*: initial;
  --inset-shadow-*: initial; --drop-shadow-*: initial; --text-shadow-*: initial; --blur-*: initial;
  --perspective-*: initial; --aspect-*: initial; --animate-*: initial; --breakpoint-*: initial;
  --container-*: initial;
  */
  --color-canvas: #eef2f6;
  --color-surface: #ffffff;
  --color-surface-2: #f5f7fa;
  --color-line: #d8dee6;
  --color-line-strong: #7b8794;
  --color-ink: #10202f;
  --color-ink-2: #435266;
  --color-ink-3: #566579;
  --color-white: #ffffff;
  --color-navy: #123a5c;
  --color-navy-dark: #0b2740;
  --color-on-navy-2: rgb(255 255 255 / 0.8);
  --color-cyan: #1499bb;
  --color-accent: #0b6e8a;
  --color-accent-strong: #085a71;
  --color-on-accent: #ffffff;
  --color-gold: #e0a106;
  --color-gold-ink: #7a5000;
  --color-good: #167a3a;
  --color-good-bg: #e6f4ea;
  --color-warn: #8f4e00;
  --color-warn-bg: #fff3d6;
  --color-bad: #b42318;
  --color-bad-bg: #fdeceb;
  --color-info-bg: #e3f2f7;
  --color-focus: #1d4ed8;
  --color-disabled-ink: #6b7787;
  --color-disabled-bg: #e9edf2;
  --color-own: #a87300;
  --color-own-tint: #fdf4dc;
  --color-arrival-cooked: #b42318;
  --color-arrival-loaded: #b45309;
  --color-arrival-fine: #566579;
  --color-arrival-spoton: #167a3a;
  --color-arrival-rusty: #1d5fa8;
  /* HEREDADOS (index.css de hoy, l. 6-11): los borra el paso 22. */
  --color-brand-navy: #123a5c;
  --color-brand-navy-dark: #0b2740;
  --color-brand-cyan: #1499bb;
  --color-brand-cyan-light: #35bdda;
  --color-brand-gold: #d99400;
  --color-brand-gold-light: #eaa90c;

  --font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', Arial, sans-serif;
  --font-weight-normal: 400;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --tracking-caps: 0.04em;
  --text-caption: 0.75rem;
  --text-caption--line-height: 1rem;
  --text-meta: 0.875rem;
  --text-meta--line-height: 1.25rem;
  --text-row: 0.9375rem;
  --text-row--line-height: 1.25rem;
  --text-row--font-weight: 600;
  --text-body: 1rem;
  --text-body--line-height: 1.5rem;
  --text-title: 1.125rem;
  --text-title--line-height: 1.5rem;
  --text-title--font-weight: 600;
  --text-page: 1.5rem;
  --text-page--line-height: 2rem;
  --text-page--font-weight: 700;
  --text-display: 2rem;
  --text-display--line-height: 2.5rem;
  --text-display--font-weight: 700;

  --spacing: 0.25rem;
  --radius-ui: 0.5rem;
  --shadow-card: 0 1px 2px rgb(16 32 47 / 0.08);
  --shadow-bar: 0 -2px 8px rgb(0 0 0 / 0.12);
  --breakpoint-sm: 40rem;
  --breakpoint-lg: 64rem;
  --container-page: 72rem;
  --container-form: 28rem;
  /* Con el cierre, Tailwind 4.3.3 sigue emitiendo sus @keyframes pulse y spin (comprobado). */
  --animate-pulse: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  --animate-spin: spin 1s linear infinite;
}

/* Densidad por puntero (D-06): con ratón, fila de tabla de 36 y Button sm de 32. */
@custom-variant fine (@media (pointer: fine));

/* EL ÁMBITO OSCURO (D-04, §3.3): un token de tinta nunca es un fondo aquí dentro. */
[data-surface='dark'] {
  --color-surface: #0b2740;
  --color-surface-2: #123a5c;
  --color-line: #2c5274;
  --color-line-strong: #7f97b0;
  --color-ink: #ffffff;
  --color-ink-2: rgb(255 255 255 / 0.75);
  --color-ink-3: rgb(255 255 255 / 0.75);
  --color-accent: #35bdda;
  --color-accent-strong: #7fd6e9;
  --color-on-accent: #0b2740;
  --color-focus: #ffd166;
  --color-disabled-bg: #1f4567;
  --color-disabled-ink: #a3b2c3;
  color: var(--color-ink);
}

body {
  background-color: var(--color-canvas);
  color: var(--color-ink);
}
```

---

**Injertos aplicados.** I-10 (§3.3: el ámbito oscuro, con lo que redefine medido). I-21 (§3.5: la variante `fine` y sus cuatro medidas; el uso en las tablas, §6.6). I-23 (§3.8: el material generable como regla, con el generador de iconos). I-31 (§3.9: `colorMath.ts` fuera del barril, con sus funciones y su test).

**Objeciones resueltas.** O-31 (§3.2: el mecanismo de «ningún estado solo en color» es el tono con su icono y su texto obligatorios en el tipo, y el signo del dinero; el tipo, en §4.7).

**Huecos rellenados.** H-18 (§3.2: el ΔE00 entre los tonos de estado en las cuatro visiones y en grises, medido; se informa y no es umbral).

**Contradicciones de hecho.** X-20 (§3.2: los contrastes y el ΔE00 de los tramos, los de uso C5).

**Decisiones de esta sección.**

- **3-a**, el rótulo en versales: `tracking-caps` (`--tracking-caps: 0.04em`) en lugar de `tracking-wide` (0,025 em, que se cierra) o de un valor arbitrario; da los +0,04 em de D-05 con un token. Descartado: un octavo tamaño `caption-caps`, que duplicaría el `caption`.
- **3-b**, `accent-strong` en el ámbito oscuro: `#7fd6e9`. D-04 no lo redefine, y sin él el primario encima o pulsado dentro del ámbito pintaría `#085a71` bajo el texto `#0b2740` del ámbito (1,6:1, \*). Se aclara en lugar de oscurecerse porque el texto del primario es oscuro; queda a 8,1 de ΔE00 de `accent` y el texto encima sube a 9,21.
- **3-c**, `disabled-bg` y `disabled-ink` en el ámbito oscuro: `#1f4567` y `#a3b2c3`. Los del tema claro dejarían un bloque casi blanco, más llamativo que el primario, en `PlayerControls`; estos se leen como apagados (fondo a 1,53 de `surface`) y el texto queda a 4,61, por encima de lo que WCAG exige a un deshabilitado.
- **3-d**, los tres emoji sin icono pasan a palabra (`Winner`; nada en `Housing`; `Rain`, `Showers`, `Dry`) en el PR de la cola larga de su página (§17): con un icono más por cada uno, el juego de 24 crecería por tres usos.
- **3-e**, los 24 iconos son propios, escritos como fuentes SVG por el agente del paso 9 con las reglas de §3.7 y validados por `ui-icons.mjs`. Descartado: copiar un juego de terceros, que D-07 no contempla («24 propios») y que traería una dependencia y su licencia.
- **3-f**, los seis `brand-*` siguen como heredados hasta el paso 22, para que lo de hoy resuelva (D-14) mientras las páginas migran.

**Propuesto para el glosario.**

- `tracking-caps` (`--tracking-caps`): el interletraje de +0,04 em del rótulo en versales; `apps/web/src/index.css`.
- `apps/web/scripts/ui-icons.mjs` y `apps/web/scripts/icons/<nombre>.svg`: el generador de `icons.tsx` y sus 24 fuentes, con huella y hoja de contactos (D-08).
- En el ámbito oscuro, tres valores más para la tabla de §G.2: `accent-strong` `#7fd6e9`, `disabled-bg` `#1f4567` y `disabled-ink` `#a3b2c3`; y los medidos que pedía: `line` `#2c5274` y `line-strong` `#7f97b0`.

**Dudas para el ensamblador.**

- D-56 pinta la clase 1 del rótulo con `ink-2` de fondo, y D-04 pone `CueCard` en el ámbito oscuro, donde `ink-2` es blanco al 75 %: §14 tiene que pintar ese fondo con un token que el ámbito no redefine (por ejemplo, el valor fijo de hoy en un token propio) o sacar el `CueCard` del ámbito. Aquí no se decide, porque es de §14.
- D-05 sirve la letra alternativa desde `apps/web/public/fonts/`, y D-49 descarta `public/flags/` porque la raíz sale con `public, max-age=0` (`app.ts` l. 131-132) y cada revalidación gasta el cupo de 300 por minuto e IP (`security.ts` l. 10); el mismo motivo vale para las fuentes, que irían mejor en `apps/web/src/assets/fonts/` con huella por Vite. Solo pesa si el dueño elige B o C en DD-02.
