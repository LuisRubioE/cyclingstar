# Propuesta E3 · lente del teléfono: el sistema visual diseñado desde 360 × 800 px

Árbol `58c14da`. Base: los cinco mapas y las capturas a 360 y 1.280 px; el código que cito lo he leído.
**Medidas propias** en `<scratchpad>/propuesta-telefono/`, sin tocar el repositorio: paleta y contraste
(`paleta_final.py`, `paleta_opt3.py`); maillots rasterizados como en el mapa 03, con ΔE00 tras Machado
2009 en las cuatro visiones y en grises, sobre los 310 pelotones de `mapa03/mundo03.json` (`kit.py`,
`vocab.py`, `hoy.py`, `reserva.py`, `campeon.py`); banderas (`banderas.py`); la web del clon con
manifiesto y service worker, servida con la API y el mundo de PGlite del mapa 05 y medida en Chromium con
Slow 4G y CPU ×4 (`pwa/`); y un prototipo del entrenamiento (`proto/`). Cifra sin otra marca, medida así.

## 0. Resumen

Lo obvio sería un sistema de escritorio que luego «se adapta al móvil». Esta propuesta lo hace al
revés: cada token, componente y pantalla se especifica primero a 360 × 800 px, con el pulgar y con Slow
4G, y el escritorio es una ampliación declarada. Y convierte «se juega bien en un teléfono» en una
prueba del CI con un número por pantalla: E3 está terminado cuando el número es cero en todas.

1. **La prueba del teléfono** (§5.3): nueve comprobaciones con umbral a 320 y 360 px y una línea base
   que solo puede bajar. El prototipo del entrenamiento la pasa entera.
2. **La respuesta arriba y la acción bajo el pulgar**: la respuesta en los primeros 520 px, y la acción
   de toda pantalla que edita en una barra fija con la consecuencia al lado. Hoy `Save day edits`
   cierra una página de 6.807 px.
3. **Una fila, dos renglones, una acción**: ninguna tabla se desplaza de lado ni recorta; el calendario
   del equipo recupera `Add` y `Drop` y la inscripción baja de 19.914 px a unos 1.500.
4. **La red mala es el caso normal**: service worker con cáscara y trozos y nunca la API; navegación
   primero por la red, porque la cáscara de la caché retrasa `Watch` en caliente (lista a 3,24 s frente
   a 1,67); una sesión «desconocida», porque hoy, sin red, quien tiene sesión ve `Log in`; y las
   banderas a un sprite: la hoja que bloquea baja de 92 a 9 KB y la primera pintura, de 3,20 a 2,93 s.
5. **El maillot se dibuja para 16 px**: doce colores con nombre (ningún par baja de 12,3 de ΔE00 en las
   cuatro visiones), siete figuras sin trazo menor de 2 px, guardados en `teams.kit` y asignados por
   coincidencia en carrera: ninguna de las 310 carreras tiene dos equipaciones a menos de 10 en ninguna
   visión (hoy, 303 en visión normal). La semilla no se toca y se acaba el clon.
6. **El campeón lleva la estrella del juego sobre blanco**: nadie más puede ser blanco ni llevarla,
   ninguna equipación queda a menos de 10 y está a 16,6 de la marca de la UCI a 16 px, donde la
   variante «otros colores» del dueño queda a 9,4: a ese tamaño, la misma.
7. **El examen**: llegada por carrera en una escala de cinco tramos sin que cruce el TSB, cada día con su
   origen, el viaje agrupado y tres arreglos de API para que la pantalla no mienta. **La frontera**, por
   construcción: el serializador quita lo no declarado y un test exige que cada campo se pinte.

Deja el modo oscuro (§15), la app nativa con su regla de revisión (§8.5), lo que es de E6 (dónde vive
cada explicación, la barra en `Watch`), los precios de E8, la política de E9 y el Mundial de E12.

## 1. Diagnóstico, desde el pulgar

1. **El marco se come la pantalla**: cabecera de 50 px, pestañas de 41 y barra fija de 57, el 18,5 % de
   800 (capturas 01 y 15); `Watch` empieza a 328 px y la barra le tapa el comentario (capturas 08 y 09).
2. **La respuesta en la segunda pantalla y el botón en la novena**: lo que hace el plan empieza a 1.060
   px (mapa 05 §3) y `Save day edits` (`Training.tsx` l. 324) cierra 6.807 px; en la inscripción,
   `2 travel days (1 out, 1 back)` ocupa cinco renglones por fila (captura 03; `MyRaces.tsx` l. 246-254).
3. **Lo que no cabe se corta sin avisar**: el calendario del equipo pierde `Add` y `Drop` (captura 15;
   `Panel.tsx` l. 22), el salón de la fama desplaza siete columnas sin indicio (captura 24), la
   plantilla corta nombres (captura 14) y la barra inferior corta los suyos (`Dashb…`: 11 px, 20 de
   relleno y `truncate`, `BottomNav.tsx` l. 54 y 59).
4. **Letra, dedo y contraste**: de 8 a 11 px (mapa 05 §2), 34 de 42 campos a 14 px, por debajo de los
   16 con que Safari no amplía (mapa 01 §2.2), objetivos de 13 a 20 px en 30 pantallas y 2.816 nodos
   que fallan AA (mapa 05 §11).
5. **La explicación vive en un `title`** que el dedo no abre (23, mapa 01 §7); 92 KB de CSS con gzip
   bloquean la primera pintura, el 91 % banderas (mapa 01 §8); y no hay nada instalable (mapa 05 §14).
6. **Sin red la web se cae, y un service worker a secas no basta**: con el mío la cáscara arranca, pero
   el jugador ve `Log in` (`pwa/out/sinred-recargar-propuesta.png`): `ProtectedRoute.tsx` l. 12-13 lee
   la sesión que no llega como «sin sesión», y `HorizonWatcher.tsx` l. 33 vacía la caché por lo mismo.
7. **El maillot a 13 px**: dibujadas con mi rasterizador, las equipaciones de hoy tienen algún par a
   menos de 10 en 303 de 310 carreras en visión normal y en las 310 en las tres dicromacias (Race
   France: 6, 17, 32 y 14 pares, donde el mapa 03 §3.2 da 6, 17, 31 y 14).

## 2. Principios

1. **360 × 800 es la referencia y 320 × 640 el rescate** (el ancho de WCAG 1.4.10): la clase sin
   prefijo es la del teléfono, y `sm:` (640) y `lg:` (1.024) añaden.
2. **La respuesta en la primera pantalla**: cada pantalla marca qué contesta (`data-answer`) y su borde
   superior queda en los primeros 520 px.
3. **La acción bajo el pulgar**: la principal de una pantalla que edita vive en `ActionBar`, en el 40 %
   de abajo y a la vista en todo el desplazamiento, con su consecuencia escrita.
4. **Una fila, dos renglones, una acción**: quién o qué arriba, lo demás abajo, un botón de 44 px. El
   nombre de un corredor no se corta nunca: la fila crece.
5. **Nada por debajo de 12 px de letra, 44 px de dedo, 16 px en un campo ni 4,5:1 en un texto.**
6. **La red mala es el caso normal**: toda consulta pinta esqueleto, error con reintento, vacío y sin
   red; sin red no es un error ni un cierre de sesión, y la API no se guarda nunca.
7. **Forma antes que color, al tamaño más pequeño**: equipación, líder, campeón, tramo y origen del día
   se leen en las tres dicromacias a su tamaño mínimo, 16 px para un maillot.
8. **Lo que la pantalla no enseña no viaja**, y lo que viaja tiene forma de pantalla (§9).
9. **Medido o no está hecho**: cada principio tiene su número en la prueba, y la app nativa el suyo.

## 3. Los fundamentos

### 3.1 La paleta

Se conserva la identidad del PR #105 (navy, cian, oro: mapa 04 §2), la que reconoce el público de
Hattrick y PCM, y se cambia su ejecución: sin degradados (ninguno pasa, y axe no los mide), sin barras de
color a todo lo ancho (36 px por panel y 48 por página) y todo texto a 4,5:1 o más (`paleta_final.py`).

| Token (`--color-*`)     | Hex                   | Uso                                                        | Razón medida                                          |
| ----------------------- | --------------------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| `canvas`                | `#eef2f6`             | fondo de página (hoy `#e8edf2`, fuera del tema)            | fondo                                                 |
| `surface`, `surface-2`  | `#ffffff`, `#f5f7fa`  | tarjetas y filas; tramos inactivos, esqueletos             | fondos                                                |
| `line`, `line-strong`   | `#d8dee6`, `#7b8794`  | separador; borde de campo, control y tramo                 | line-strong 3,66 sobre surface y 3,25 sobre canvas (1.4.11 pide 3) |
| `ink`                   | `#10202f`             | texto                                                      | 16,54 sobre surface, 14,70 sobre canvas               |
| `ink-2`                 | `#435266`             | secundario, segundo renglón                                | 7,96, 7,08 y 7,42 (surface, canvas, surface-2)        |
| `ink-3`                 | `#566579`             | rótulos y ejes; sustituye a `slate-400` (2,63) y `slate-500` | 5,94, 5,28 y 5,54                                   |
| `navy`, `navy-dark`     | `#123a5c`, `#0b2740`  | cabecera; pestañas de nivel 2, barra inferior, capa fija   | blanco 11,76 y 15,23; blanco al 75 %, 7,36 y 9,10     |
| `cyan`                  | `#1499bb`             | marca, solo decorativo                                     | 3,33 sobre blanco: nunca texto                        |
| `accent`, `accent-strong` | `#0b6e8a`, `#085a71` | enlace, botón primario; pulsado                           | 5,81 en los dos sentidos y 5,17 sobre canvas; blanco sobre strong 7,75 |
| `gold`, `gold-ink`      | `#e0a106`, `#7a5000`  | realce con `ink` encima; texto dorado                      | `ink` encima 7,30, sobre navy-dark 6,72; gold-ink 7,06 |
| `good` y `good-bg`      | `#167a3a`, `#e6f4ea`  | correcto, `Spot on`, `Called up`                           | 5,41; 4,77 sobre su fondo                             |
| `warn` y `warn-bg`      | `#8f4e00`, `#fff3d6`  | aviso, el velo                                             | 6,45; 5,85                                            |
| `bad` y `bad-bg`        | `#b42318`, `#fdeceb`  | error, `Cooked`, peligro                                   | 6,57; 5,75                                            |
| `info-bg`               | `#e3f2f7`             | días de viaje, avisos informativos                         | accent encima 5,07                                    |
| `focus`, `focus-dark`   | `#1d4ed8`, `#ffd166`  | anillo de 2 px con 2 de separación, en claro y en oscuro   | 6,70 y 5,96; 8,16 sobre navy y 10,57 sobre navy-dark  |
| `disabled-ink` y `-bg`  | `#6b7787`, `#e9edf2`  | control deshabilitado                                      | 3,87 (WCAG lo exime y se lee)                         |

Ningún estado va solo en color. El tramo activo de la escala de llegada lleva texto blanco sobre
`#b42318` (`Cooked`, 6,57), `#b45309` (`Loaded`, 5,02), `#566579` (`Fine`, 5,94), `#167a3a` (`Spot on`,
5,41) o `#1d5fa8` (`Rusty`, 6,45), y se lee por posición y palabra: `Cooked` y `Loaded` quedan a 6,3 de
ΔE00 en deuteranopía. **Sin modo oscuro** (§15): duplica tokens y estados y nadie lo ha pedido.

### 3.2 La tipografía

**La pila del sistema**, `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`: cero bytes y
ningún salto de letra con Slow 4G; cifras tabulares (`tabular-nums`) en toda columna de números.

| Token (`--text-*`) | Tamaño / interlínea | Peso       | Uso                                                                   |
| ------------------ | ------------------- | ---------- | --------------------------------------------------------------------- |
| `caption`          | 12 / 16             | 400 y 600  | el mínimo: ejes, rótulos en versales (600 y +0,04 em), barra inferior |
| `meta`             | 14 / 20             | 400        | segundo renglón, entradillas, avisos                                  |
| `row`              | 15 / 20             | 600        | primer renglón de fila: el nombre, la carrera                         |
| `body`             | 16 / 24             | 400        | texto y todo campo                                                    |
| `title`            | 18 / 24             | 600        | título de panel                                                       |
| `page`             | 24 / 32             | 700        | el `h1`                                                               |
| `display`          | 32 / 40             | 700        | cifras grandes: saldo, km a meta                                      |

Humanos en 600 y bots en itálica, como hoy (`RiderName.tsx` l. 19-20; [DUEÑO 24]).

### 3.3 Rejilla, densidad, radios, sombras e iconos

Rejilla de 4 px; margen lateral de 12 px a 360 (`App.tsx` l. 158), 16 desde 640 y 24 desde 1.024.
**Alturas**: fila 48, fila con acción 64, campo 48, objetivo 44, cabecera 48, pestañas 44, barra
inferior 56 más la muesca, barra de acción 60; relleno de panel 12, y 16 desde 640. **Radios**: 8 y
9.999 para el `Chip` (hoy siete). **Sombras**: `card`, `0 1px 2px rgb(16 32 47 / 0.08)`, y `bar`,
`0 -2px 8px rgb(0 0 0 / 0.12)`. **Iconos**: 24 propios de trazo de 2 px, generados (agenda §4.22.5) y
revisados a 16 y 24, que sustituyen a los emoji de la interfaz (`✈️`, `🚴`, `🏁`, `⚠`; mapa 01 §6).

### 3.4 Dónde vive cada cosa

Color, letra, radio y sombra, en el `@theme` de `apps/web/src/index.css`, que en Tailwind v4 crea las
utilidades (`bg-surface`, `text-caption`): lo que no es token no tiene clase. El vocabulario del maillot,
en `packages/shared/src/kit.ts`, porque lo usan la web, la API al validar y `packages/db` al generar.

## 4. Los componentes y sus estados

Un catálogo cerrado en `apps/web/src/components/ui/`: una página nueva solo usa esto, y una regla de
ESLint prohíbe en `pages/` los colores sueltos de Tailwind (`slate-*`, `indigo-*`, hexadecimales) y
`text-[Npx]` con N menor de 12 (§12). Medidas a 360 px; desde 640, lo que la fila dice.

| Componente (sustituye)                                                              | Anatomía y medidas                                                                                                                                                                                   | Estados y su aspecto                                                                                                                                                                                                                                                | Texto de ejemplo (pantalla)                                                  | Accesibilidad                                                                                          |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `Button` (146 botones con 92 aspectos y seis rellenos de acción; mapa 01 §3.3)      | 44 px de alto (48 en la barra de acción), relleno de 16, radio 8, `body` 600; `primary` (accent y blanco), `secondary` (surface, borde line-strong, ink), `quiet` (texto accent), `danger` (bad)     | normal; encima (solo con `hover:hover`): accent-strong; foco: anillo focus; pulsado: accent-strong; deshabilitado: disabled-bg y disabled-ink con el porqué en una línea `meta` debajo; cargando: indicador de 16 px y `Saving…`, sin cambiar de ancho                | `Save plan` · `Enter race` · `Withdraw`                                      | `<button>`; `aria-busy` al cargar; `aria-disabled` y `aria-describedby` al porqué, nunca un `title`    |
| `ActionBar` (`Save day edits` al final de la página, `Save all` en la barra dorada) | fija sobre la barra inferior (`bottom: 56 px + inset`), 60 px, surface con sombra de barra; a la izquierda la consecuencia en `meta` ink-2, a la derecha un `Button` primario                       | oculta sin cambios; sucia: `2 changes · Race Var: Fine (was Loaded)`; guardando: `Saving…`; guardada: `Saved` 2 s y se oculta; error: `Could not save. Try again.` en bad y `Retry`; sin red: `You're offline. Your changes stay here until you reconnect.`, botón deshabilitado | `Save plan` · `Save kit` · `Save orders`                                     | `role="region"` con `aria-label="Unsaved changes"`; el resultado en `role="status"`                    |
| `Panel` (`Panel` cian, la constante `card` en 7 ficheros y 25 copias)               | surface, radio 8, sombra de tarjeta, relleno 12; título `title` ink en la primera línea y una acción opcional de 44 px a la derecha; `bleed` para tablas (sin relleno lateral)                      | normal; cargando: su `Skeleton`; error: `ErrorState` dentro; vacío: `EmptyState` dentro                                                                                                                                                                             | `Your month`                                                                 | `<section aria-labelledby>` con `h2`                                                                   |
| `PageHeader` (`SectionBar` dorada en 18 páginas, 13 `h1` a mano)                    | `h1` `page` ink sobre canvas, subtítulo `meta` ink-2, enlace de vuelta de 44 px                                                                                                                      | (sin estados)                                                                                                                                                                                                                                                      | `← Race Valencia` · `Training`                                               | un `h1` por página                                                                                     |
| `RankTable` (`GcTable` y `PointsTable` dos veces, `TeamClassTable`, `Rankings`, `HallOfFame`, `Country`, `Finances`, `Team`) | fila de 48 px: puesto 24 px (`meta` tabular ink-3), bandera 21 × 16, identidad (renglón 1 `row`; renglón 2 maillot de 16 y equipo en `meta` ink-3), valor `row` tabular a la derecha; desde 640 el renglón 2 vuelve a columnas | cargando: 5 filas esqueleto de 48; vacío: `No riders have finished yet.`; error; velado: `Hidden until you watch stage 3 · Watch`; recortada: `Show all 140` y `Show top 20` (`ShowAll.tsx`, que se queda)                                              | `+0:20` (un solo formato: `formatTime`, `format.ts` l. 4)                    | `<table>` con `<caption>`, `scope`; el enlace del nombre ocupa la celda de identidad (44 px)          |
| `ActionRow` (filas de `TeamCalendar` y de `MyRaces`)                                | 64 px: renglón 1 carrera `row` y clase en `caption` mono; renglón 2 `Day 59 · FR · Travel 336 · 2 days out, 2 back` en `meta`; a la derecha un `Button` de 44 de alto y 72 de ancho mínimo         | normal; ocupada: indicador en el botón; deshabilitada: el porqué en el renglón 2 (`Not enough money for the trip`); hecha: `Chip` good `Called up`                                                                                                                  | `Add` · `Drop` · `Enter` · `Withdraw`                                        | nombre completo del botón: `aria-label="Add Race Ardèche"`                                             |
| `RiderLabel` (`RiderName`, `Flag` y el equipo en texto, en 17 sitios)               | bandera 21 × 16, nombre (humano 600, bot itálica, subrayado punteado line-strong), maillot de 16 px; nunca se corta: parte de línea                                                                 | (sin estados)                                                                                                                                                                                                                                                      | `José Antonio Fernández`                                                     | enlace con el nombre; bandera `role="img"` con el país                                                 |
| `RiderHeader` (la cabecera de la ficha)                                             | maillot de 40, nombre `page`, `Chip` de jugador y de salud, rol y país en `meta`; debajo filas `InfoRow` de 48                                                                                       | cargando; error; no encontrado: `This rider doesn't exist.` (hoy un 404 sale como error, captura 47)                                                                                                                                                              | `José Quintáns · Player · Climber · Spain`                                   | `h1` con el nombre                                                                                     |
| `Notice` (8 formas de aviso ámbar; mapa 01 §3.2)                                    | borde izquierdo de 4 px, icono de 20, título `body` 600, texto `meta`, acción `quiet`; tonos info, good, warn y bad sobre su `-bg`                                                                   | (sin estados)                                                                                                                                                                                                                                                      | `Results from 3 stages you haven't watched are hidden · Manage`              | `role="note"`, o `status` si llega después                                                             |
| `Tabs` (las 4 variantes de `Tabs.tsx` y 3 copias a mano)                            | 44 px; activa subrayada 3 px en accent (en la cabecera, gold); carril desplazable con un desvanecido de 24 px a la derecha mientras haya más; la activa se centra al entrar                          | normal; foco; activa                                                                                                                                                                                                                                                | `Watch · Report · Classifications`                                           | el patrón ARIA que ya tiene `Tabs.tsx` l. 153-222                                                      |
| `Segmented` (los botones de modo de `PlanLadder.tsx` l. 127-143, sin `aria-pressed`) | 44 px a todo lo ancho, borde line-strong; la opción activa en accent con blanco                                                                                                                      | normal; foco; activa; deshabilitada                                                                                                                                                                                                                                 | `Coach · Mixed · I decide`                                                   | `role="radiogroup"` y `aria-checked`                                                                   |
| `Field` (42 campos con 23 combinaciones; `TextField` solo en el acceso)             | rótulo `meta` 600 encima, control de 48 px con `body`, borde line-strong, ayuda o error en `meta` debajo                                                                                             | normal; foco: anillo; inválido: borde bad y el error debajo; deshabilitado                                                                                                                                                                                          | `Name` · `Must be 2 to 40 characters.`                                       | `<label for>`, `aria-invalid`, `aria-describedby`                                                      |
| `Chip` (15 formas en 23 `<span>`)                                                   | 24 px, `caption` 600, radio 9.999, tonos neutral, accent, good, warn y bad sobre su `-bg`                                                                                                           | (sin estados: no se toca)                                                                                                                                                                                                                                          | `Leads overall` · `Called up` · `Home race`                                  | texto siempre; nunca un color solo                                                                     |
| `Scale5` (las cinco chapas de `ARRIVAL_LABEL`, `PlanLadder.tsx` l. 63-69)           | cinco tramos iguales de 36 px de alto en el ancho del panel; inactivos surface-2 con borde line-strong y `caption` ink-2; el activo relleno de su tono con `caption` 700 blanco; ejes `◀ Too tired` y `Too fresh ▶` | un tramo activo, o ninguno con `Not enough data yet`                                                                                                                                                                                                         | `Loaded` y la instrucción de §7.3 | `role="img"` con `aria-label="You'll arrive Loaded: second of five, from too tired to too fresh"`      |
| `Meter` (la barra de frescura con su cifra, `Home.tsx` l. 354; el TSS)              | cuatro segmentos de 8 px de alto, como `ProgressMark` (`AttributeList.tsx` l. 33-38), con la palabra al lado                                                                                         | uno a cuatro llenos                                                                                                                                                                                                                                                 | `Freshness: low` · `Load this month: hard`                                   | `role="meter"` con `aria-valuetext` en palabras, nunca la cifra                                        |
| `Skeleton` (44 `Loading…` sin indicador)                                            | bloques surface-2 del alto final (no mueven la página al llegar); pulso solo sin `prefers-reduced-motion`; a los 8 s, una línea `Still loading. Slow connection?` y `Retry`                          | cargando; lento                                                                                                                                                                                                                                                     | `Still loading. Slow connection?`                                            | `role="status"` con `aria-label="Loading"`                                                             |
| `ErrorState` (26 «Could not load…» en rojo sin reintento)                           | icono, título `body` 600, detalle `meta`, `Button` secundario; instalada, además `Reload app`, porque en iPhone no hay barra con recarga                                                              | error de red; error del servidor; versión vieja (`This version is out of date · Reload`)                                                                                                                                                                            | `Couldn't load your training plan · Try again`                               | `role="alert"`                                                                                         |
| `EmptyState` (9 cajas discontinuas)                                                 | icono de 24, texto `meta` ink-2 y una acción opcional                                                                                                                                                | (sin estados)                                                                                                                                                                                                                                                      | `No races in the next four weeks. This month is for building.`              | texto normal                                                                                           |
| `OfflineBanner` y `OfflineState` (el `Loading…` sin fin del mapa 05 §13)            | franja de 32 px bajo la cabecera en warn-bg; una consulta en pausa pinta `OfflineState` en su sitio y se rehace sola al volver la red                                                               | sin red; recuperando: `Back online` 2 s                                                                                                                                                                                                                             | `You're offline. Showing what you already opened.`                           | `role="status"`                                                                                        |
| `UpdateToast`                                                                       | sobre la barra de acción, 48 px                                                                                                                                                                      | hay versión nueva; recargando                                                                                                                                                                                                                                       | `A new version is ready · Reload`                                            | `role="status"`                                                                                        |
| `InfoButton` (23 `title` que el dedo no abre)                                       | `ⓘ` en un objetivo de 44 × 44 que despliega el porqué debajo, en línea, sin ventana                                                                                                                 | cerrado; abierto                                                                                                                                                                                                                                                    | `You don't train on travel days: 1 out, 1 back.`                             | `aria-expanded` y `aria-controls`                                                                      |
| `KitIcon` y `WornJerseyIcon`, `Flag`, `StarRating`                                  | §6; `Flag` del sprite (§8.3); `StarRating` en medias estrellas, la regla del código (`rider.ts` l. 218-240), no la del SPEC                                                                          | (sin estados)                                                                                                                                                                                                                                                      | `Race leader` · `Champion of Italy`                                          | `role="img"` con `aria-label` y `<title>`                                                              |
| `AppHeader` y `BottomNav`                                                           | §5.2                                                                                                                                                                                                 | activo: icono en pastilla de 56 × 28 y rótulo 600                                                                                                                                                                                                                   | `Dashboard · My Rider · My Team · World · News`                              | `<nav aria-label="Sections">`, `aria-current="page"`                                                   |

**Los estados de una consulta, en un solo sitio**: `QueryView` pinta `Skeleton` si carga,
`OfflineState` si React Query la ha dejado en pausa por falta de red (`fetchStatus` `paused`),
`ErrorState` con `refetch` si falla y `EmptyState` si llega vacía; las seis páginas que hoy pintan un
fallo como vacío (mapa 01 §4) dejan de hacerlo. El foco, con `focus-visible:` (hoy cero, mapa 01 §7).

## 5. El teléfono

### 5.1 Las tablas anchas, una por una

La regla de §2.4 sobre las tablas del mapa 01 §5 y del mapa 05 §5. «Top 20 + `Show all`»
(`docs/navegacion.md` §7.3) pasa a ser obligatoria en todas: hoy la cumplen 7 de 15.

| Tabla                                                                                       | Hoy a 360 px                                                        | En el teléfono                                                                                                             | Filas                     |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| General, puntos y montaña (`Race.tsx` l. 205 y 246), etapa (`StageReplay.tsx` l. 83 y 137), llegada (`stageView.tsx` l. 88) | el equipo parte el nombre: filas de 49 a 85 px, equipo a 2,63:1 | `RankTable`: 49 px medidos con nombres de hasta 22 caracteres (el p99 es 20) y 67 con el más largo, de 28; tiempo `+0:20` | 20 y `Show all`           |
| Equipos (`TeamClassTable.tsx` l. 24)                                                        | la bandera hace de equipo                                           | una línea de 44 px con el maillot de 16; en la de la etapa, `Chip` `Leads overall` en el líder de la acumulada             | 20                        |
| Ranking (`Rankings.tsx` l. 29)                                                              | el equipo toca los puntos (`Northwind Cycling Team178`)             | `RankTable`                                                                                                                | 20 (hoy 100)              |
| Salón de la fama (`HallOfFame.tsx` l. 92), 7 columnas                                       | se desplaza de lado sin indicio                                     | renglón 1 puesto, nombre y `Total`; renglón 2 `2 overall · 4 stages · 0 mountains · 0 points`                              | 20 (hoy 40)               |
| Nación (`Country.tsx` l. 48), 5 columnas                                                    | `All-rounde` cortado                                                | renglón 2 `Andes Ruta · Climber`                                                                                           | 20 (hoy todas)            |
| Movimientos (`Finances.tsx` l. 129)                                                         | 4 columnas en `Panel p-0`                                           | renglón 1 concepto e importe con signo; renglón 2 día y carrera                                                            | 20 (hoy 60)               |
| Plantilla (`Team.tsx` l. 123, `TeamSquad.tsx`)                                              | `Josef Janse…` y un `Detail` aparte                                 | la fila entera enlaza a la ficha; renglón 2 papel y puntos                                                                 | todas                     |
| Plan del mánager (`TeamCalendar.tsx` l. 197)                                                | **recortada**: sin `Add` ni `Drop`                                  | `ActionRow`                                                                                                                | 20 próximas               |
| Inscribibles (`MyRaces.tsx` l. 340), 193 filas                                              | 19.914 px                                                           | `ActionRow` y un `Chip` conmutable `Affordable only`                                                                       | 20: unos 1.500 px (estimado) |
| Programa (`MyRaces.tsx` l. 98)                                                              | sin viaje                                                           | `ActionRow` con `Set orders`; renglón 2 `Bib 214 · ✈ Day 51 out, Day 53 back`                                              | todas                     |

### 5.2 Navegación, dedo y letra

- **Cabecera de 48 px** con el logotipo, `Account` en 44 px y el reloj del mundo en `meta` blanco al
  80 % (8,15:1; `Day 50 · S1 · 4h 56m`, pantalla), que hoy no sale en el teléfono (`Header.tsx` l. 122).
  **Pestañas de nivel 2 de 44 px**, con un desvanecido de 24 px que avisa de que hay más y la activa
  centrada (hoy `Contract` y `Finances` quedan fuera sin indicio).
- **Barra inferior con icono de 24 en una pastilla de 56 × 28 y rótulo `caption` debajo**: con cinco
  destinos, `Dashboard` mide 62 px en un hueco de 72 a 360 y de 64 a 320 (prototipo). En `Watch` se
  esconde mientras corre la carrera (`useHideBottomNav`, de E2 a E6, `docs/retransmision.md` §18.6).
- **Objetivos** de 44 × 44, o de 24 con 24 libres en un enlace dentro de una frase (WCAG 2.5.8);
  **letra** de 12 px, también en SVG, y 16 en campos; **cortes**: el nombre de un corredor nunca ([DUEÑO
  17]), el de un equipo en el segundo renglón sí, con `…` y `data-clip-ok` (el maillot lleva el nombre en
  su `aria-label`), una cifra o un botón nunca. Nada solo en `:hover` o en `title`, ningún gesto de
  deslizar (chocan con el carril de pestañas y el «atrás» del sistema) y un enlace de vuelta en toda
  pantalla de segundo nivel, porque instalada en iPhone no hay barra del navegador.

### 5.3 El criterio de aceptación: la prueba del teléfono

`apps/web/e2e/telefono.spec.ts`, en el CI tras `pnpm build`, contra la API con un mundo creado en el
propio trabajo (génesis y tres días: de 2 a 3 minutos, estimado con los 17 s por día del mapa 05 §1),
en unas 35 pantallas, a 360 × 800 y 320 × 640 con tacto y con las cuatro cuentas del mapa 05. La
columna «Prototipo» la da `proto/telefono.mjs`, que es esta prueba en pequeño.

| #   | Comprobación                                                                                    | Umbral                                    | Hoy                                   | Prototipo              |
| --- | ----------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------- | ---------------------- |
| 1   | Reflujo: `scrollWidth` del documento                                                            | el ancho, a 320 y a 360                   | 45 de 45 a 360 (mapa 05 §2)           | cumple                 |
| 2   | Recortes: `overflow` oculto o `ellipsis` con texto que no cabe y sin `data-clip-ok`             | 0                                         | el calendario, la barra inferior      | 0                      |
| 3   | Letra de todo nodo de texto visible, SVG incluido                                               | ≥ 12 px                                   | 8 px                                  | 12; 0 nodos por debajo |
| 4   | Letra de `input`, `select` y `textarea`                                                         | ≥ 16 px                                   | 34 de 42 a 14                         | 0 por debajo           |
| 5   | Objetivos: enlaces, botones, campos, pestañas                                                   | 44 × 44, o la excepción de 2.5.8          | de 13 a 20 px en 30 pantallas         | 0                      |
| 6   | axe-core 4.10.3: `color-contrast`, `target-size`, `select-name`, `button-name`, `link-name`, `label` | 0 nodos                              | 2.816 a 360                           | 0                      |
| 7   | Borde superior de `[data-answer]` a 360 × 800                                                   | ≤ 520 px                                  | 1.060 en el entrenamiento             | 152, con 297 a la vista |
| 8   | Con cambios sin guardar, `[data-primary-action]` a la vista y en el 40 % de abajo               | arriba y al final                         | `Save day edits` hacia los 6.700 px   | a 687 de 800           |
| 9   | Alto en el estado inicial                                                                       | ≤ 3.200 px en las de herramienta          | 19.914 en la inscripción              | 1.277                  |

**Trinquete**: el primer PR guarda en `telefono-baseline.json` las faltas de cada pantalla; el CI falla
si una sube, cada migración baja las suyas y **E3 está terminado con el fichero a cero** (de 5 a 7
minutos de CI y 150 MB de Chromium, estimado). **Rendimiento**, cada noche, con Slow 4G, CPU ×4 y la
mediana de cinco: primera pintura en frío ≤ 3,0 s (hoy 3,16 a 3,23; con el sprite, 2,93), lista en
frío ≤ 5,0 (hoy 4,7 a 5,8) y en caliente ≤ 2,0, o 3,0 en el entrenamiento (hoy 1,4, 2,8 y 1,7), hoja
que bloquea ≤ 15 KB con gzip (hoy 92) y JS del arranque ≤ 160 (hoy 157, mapa 01 §8). **Y la persona**:
para la prueba del dueño en su teléfono (decisión 6 de E2, `implementacion.md` l. 17), diez tareas a
una mano (entrar, ver su llegada, cambiar un bloque, poner órdenes, inscribirse, ver una etapa, abrir
la general y una ficha, cambiar el maillot, instalar, abrir sin red) y cuáles no salen a la primera.

## 6. Los maillots

### 6.1 El vocabulario del maillot del equipo

Para 16 px, con 2 px de trazo o hueco como mínimo (6 u del `viewBox` de 48 de `Jersey.tsx`), sobre la
silueta de hoy. **Doce colores con nombre**, escritos en el editor porque un daltónico elige por nombre:
black `#1b1d21`, navy `#172a5b`, blue `#0f6de9`, sky `#4cc3ff`, teal `#0f9e8f`, green `#236102`, orange
`#f48d32`, red `#c62639`, pink `#f7418a`, purple `#4e2cae`, y de segundo color yellow `#ffd60a` y white
`#ffffff`; sin mover su tono más de 10° (`paleta_opt3.py`), ningún par baja de 15,9 en visión normal ni
de 12,3 en las dicromacias.

| Figura (pantalla) | Lo que pinta el segundo color, en u                                     | A 16 px                           |
| ----------------- | ----------------------------------------------------------------------- | --------------------------------- |
| `Plain`           | nada                                                                    | el cuerpo                         |
| `Chest band`      | banda de pecho de y 23 a 33                                             | 3,3 px                            |
| `Hoops`           | dos aros, de y 17 a 24 y de 30 a 37                                     | 2,3 px, con 2,0 de hueco          |
| `Halves`          | la mitad derecha, de x 24 a 48, con su manga                            | 3,3 px de pecho por lado          |
| `Yoke`            | hombros, mangas y pecho alto, hasta y 19                                | 3,7 px bajo el cuello             |
| `Sash`            | del hombro izquierdo a la cadera derecha, unos 10 u de ancho            | 3,4 px                            |
| `Sides`           | costados y mangas, de x 0 a 21 y de 27 a 48, con 6 u de cuerpo en medio | 2,3 px de costado y 2,0 de centro |

**Reservados** a los líderes y al campeón: cuerpo amarillo o blanco, lunares, estrella y galón. De las
670 combinaciones (10 lisas y 6 × 10 × 11) quedan **651** sin las 19 que a 16 px quedan a menos de 10
de un reservado en alguna visión (10 del amarillo, como `Plain` orange; 9 del verde; `reserva.py`).

### 6.2 La distinguibilidad, medida

Distancia dibujada: media por píxel de ΔE00 sobre el maillot rasterizado como en el mapa 03 (`kit.py`).

| Medida                                                                  | Hoy                                       | Propuesta                                   |
| ----------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------- |
| Pares de la paleta por debajo de 10, en las cuatro visiones; en grises  | 2, 6, 12 y 13 de 91; 45 (mapa 03 §3.1)    | 0, 0, 0 y 0 de 66; 12                       |
| Mayor conjunto con todos sus pares ≥ 10 en las cuatro visiones (voraz)  | sin medir                                 | 127 a 16 px (59 a 15, 28 a 20); 120 a 13 px |
| Carreras de 310 con algún par por debajo de 10 (4 visiones); pares por carrera en grises a 13 px | 303, 310, 310 y 310, a 13 y a 16 px; 111,9 | 0, 0, 0 y 0, a 13 y a 16 px; 12,9 |
| Distancia mínima entre dos equipos que coinciden en carrera             | pares idénticos en 220 carreras (mapa 03) | 18,5; 21,8 en el percentil 5                |

La asignación hace la mayor parte: con las figuras de hoy y la paleta nueva también salen cero carreras
con un par, pero el margen baja a 11,9 (`vocab_alt.py`, alternativa C de §15); las figuras dan el resto.

### 6.3 Dónde se guarda, cómo nace y cómo se edita

`teams.kit` (`jsonb` no nulo, `{ figure, base, secondary }` por nombre), con migración de drizzle-kit y
relleno. **`jersey_seed` no se toca más**: sigue siendo la identidad del NPC (`world.ts` l. 460-468), y
se acaban el clon del mapa 03 §2.2 y las semillas candidatas (`TeamManager.tsx` l. 23-25). `assignKits`
(`packages/db/src/kits.ts`) recorre los equipos de más a menos rivales con los que coinciden en carrera y
da a cada uno la combinación libre más lejana de las de esos rivales, en la génesis, en la migración y
cada temporada al NPC que choque: en la temporada 0, 219 distintas y ningún choque. El reparto de E2 gana
`kit` junto a `jerseySeed` (`cast.ts` l. 146-154), y una etapa vieja enseña el maillot de aquel día. **El
editor** (`/team/identity`): el maillot a 72 px (`data-answer`) y, a 16, sus ocho rivales más frecuentes
y los reservados; figuras en losetas de 72 y colores en muestras de 44 con su nombre, tachadas con su
porqué las que chocan (`Too close to the yellow jersey`, pantalla), y `Save kit` en la `ActionBar`. **El
servidor valida**: `PUT /api/teams/me/kit` con un `kitSchema` `.strict()` y `checkKit`, que da 400
`kit_igual`, 409 `kit_reservado`, 409 `kit_se_confunde` (a menos de 10 de un equipo con el que coincide
esta temporada) y 429 `kit_reciente` (un cambio cada 14 días de juego). Hace falta (con 28 rivales, la
mediana, un maillot al azar choca con alguno con probabilidad 0,51) y cabe: con 11 vecinas por
combinación quedan unas 340 (estimado). **Para E9**: `teams.kit_status` (`active`, `reported`,
`reverted`), `kit_changed_at` y `POST /api/admin/teams/:id/kit/revert`, que devuelve el del generador.

### 6.4 La señal de campeón

**La estrella sobre blanco**: cuerpo `#ffffff`, que nadie más puede tener, y estrella de 13 u de radio
exterior y 6,2 interior en (24, 28,5), de 8,7 px de ancho a 16, 15,2 a 28 y 39 a 72. **Nacional** (ruta
o crono, élite o sub-23, que dice el texto): navy `#123a5c`, con la bandera al lado como hoy
(`Jersey.tsx` l. 165). **Mundial** (E12): `#e0a106` con borde navy de 1,6 u y sin bandera. Es la
estrella del nombre, del logotipo y del provisional de E2 (`Jersey.tsx` l. 121-123), de 16,8 a 26 u.

| Señal (16 px salvo indicación) | A la marca de la UCI, normal y grises, a 16 / 28 / 72 px | Equipación más cercana en las cuatro visiones; grises  | Líder más cercano |
| ------------------------------ | -------------------------------------------------------- | ------------------------------------------------------ | ----------------- |
| Estrella nacional              | 16,6 y 10,5 / 16,9 y 12,0 / 16,8 y 12,8                  | 16,9, 14,0, 14,4, 16,2; 13,1: ninguna por debajo de 10 | 30,9              |
| Estrella mundial               | 14,7 y 9,0 / 16,5 y 10,7 / 17,9 y 13,1                   | 16,0, 12,1, 12,3, 15,1; 6,9: ninguna (8 en grises)     | 22,5              |
| Galón nacional (alternativa B) | 22,4 y 16,3 / 23,3 y 18,4 / 23,2 y 19,2                  | 23,5, 19,6, 20,1, 22,3; 16,4: ninguna                  | 27,5              |
| `ChampionMark` de hoy          | 12,4 y 7,3 / 13,2 y 8,9 / 13,7 y 10,1                    | 12,6, 10,9, 11,1, 12,8; 9,7                            | 26,4              |

**Las variantes del dueño**, con los cuatro criterios de `00-encargo.md` §7.1, a 16 px (`campeon.py`):

| Variante                                                  | 1. Distancia a la marca                                                       | 2. Forma                    | 3. Equipación más cercana (4 visiones); < 10          | 4. Reserva; ¿vale? |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------- | ------------------ |
| Otros colores: cinco bandas de 2 u en los de la marca     | 9,4 y 1,4 (8,9 y 3,7 a 28): la misma a la vista, y la estructura protegida    | bandas de 0,67 px, mezcladas | 14,7, 12,9, 13,8, 14,8; ninguna                       | sí; no             |
| Otro orden                                                | 14,1 y 5,3; `No other order will be approved`, y nadie lo nota (inrng, 2011) | ídem                        | 16,2, 13,8, 13,5, 15,0; ninguna                       | sí; no             |
| En vertical                                               | 22,5 y 14,7, pero la guía regula vertical y diagonal                         | ídem                        | 15,1, 11,8, 10,9, 12,1; ninguna                       | sí; no             |
| Otro fondo: navy                                          | 40,7 y 39,5                                                                   | «azul con algo en el pecho» | 13,8, 8,4, 6,0, 11,8; 4 en protan y 5 en deutan       | choca; no          |
| Otro fondo: oro                                           | 22,7 y 12,5                                                                   | ídem                        | 17,8, 8,7, 7,7, 14,5; 1 y 4, y a 17,9 del amarillo    | choca; no          |
| Tres franjas de 7 u (navy, cian, oro) sobre blanco        | 23,0 y 14,6 (24,7 y 15,7 a 28)                                                | 2,3 px por franja: se lee   | 20,2, 16,5, 17,0, 18,8; ninguna, ni en grises         | sí; a §15          |

Cinco bandas de 0,67 px se leen «blanco con algo en el pecho», lo que la UCI protege en cualquier orden y
orientación; la sexta, mi lectura más fuerte del dueño, falla el criterio 1 en el espíritu del SPEC §8.

### 6.5 Los líderes y el dorsal del equipo líder

Las tres figuras que el dueño conoce, con marcas de teléfono: general `#facc15` lisa; puntos `#16a34a`
con banda **blanca** de 10 u (hoy `#bbf7d0` de 7 u, a 2,72:1 de su base); montaña `#2563eb` con cinco
lunares blancos de 4 u (hoy 3,4). Entre sí no bajan de 18,8 en las cuatro visiones ni de 13,3 en grises.
**El dorsal del equipo líder no vuelve como icono**: el dueño lo quitó porque en su teléfono se leía
«Ill» ([DUEÑO 5]), y un pictograma que se lee como letras es lo que esta lente prohíbe. Vuelve como
`Chip` `Leads overall` en la clasificación por equipos de una etapa; `leaderJerseys.test.tsx` l. 81-88
sigue sellando la ausencia y el PR corrige `docs/navegacion.md` §7.4 (mapa 04, contradicción 1).

### 6.6 Lo que compra el patrocinador, y el contrato `WornJerseyIcon`

**Para E8**, un color (primero o segundo, de los doce: su marca va al más cercano en ΔE00 y el maillot
sigue pasando `checkKit`) y un nombre en la banda o la zona del segundo color, solo desde 40 px (a 16 y
28 no se pinta), en `caption` 600 en versales, de hasta 12 caracteres y a 4,5:1 de su zona, moderado
por E9; precios y exclusividad, de E8 (`docs/epics.md` G2.8). **El contrato**:
`WornJerseyIcon({ worn, team, size })`, con `team: { name, kit } | null` y `size` 16, 28, 40 o 72: el
de E2 (`docs/retransmision.md` l. 5210) más el tamaño, en lugar del `{ card, size }` de hoy
(`WornJerseyIcon.tsx` l. 12-18), y el único que elige dibujo y texto (`JERSEY_LABEL`,
`championTitleText`, `Sierra Cycling kit`). Con `KIT_MIN_PX` = 16, los 13 px de `GroupBar.tsx` l. 242,
`CueCard` y `TimeTrialBoard` suben a 16: doce maillots ocupan 216 de los 336 px de la fila.

## 7. El examen práctico

### 7.1 La pantalla, a 360 px

`proto/entrenamiento.html` es esta pantalla con los tokens de §3: la prueba de §5.3 le da la respuesta a
152 px, ninguna falta y la acción a 687 px de 800. Solo usa componentes de §4.

```text
 Cycling Star          Day 50 · S1 · 4h 56m   (◉)    AppHeader 48, Tabs 44, PageHeader
┌ HOW YOU'LL ARRIVE ─────────────────────────────┐   Panel, data-answer
│ Race Var · Day 52                    in 2 days │
│ [Cooked][■Loaded][ Fine ][Spot on][ Rusty ]    │   Scale5, con sus ejes
│ You'll start tired. A lighter week before it…  │
│ Race Sardegna · Day 56 · 5 stages · ✈ 55 / 61  │
├ YOUR MONTH ────────────────────────────────────┤
│ ( Coach )( ■ Mixed )( I decide )               │   Segmented
│ On a day, what wins: race › travel › your edit │
│ › block › team plan › coach.                   │
│ Week 1 · Days 51 to 57             [ Build ▾ ] │   filas de 56
├ DAY BY DAY ──────────────────────── Show ▾ ────┤   plegado: dictado del dueño
═ Race Var: Fine (was Loaded)       [ Save plan ] ═   ActionBar, sobre la BottomNav
```

### 7.2 Defecto 1: la lista de llegadas no dice de qué habla

**Pantalla**: una tarjeta por carrera y no por etapa, con nombre, salida (`Day 52`, e `in 2 days` a
siete o menos), etapas y viaje; tres a la vista y el resto tras `Show all 5 races`. Su llegada es la
del amanecer de la primera etapa, la única de fiar (mapa 02 §3). **API**:
`POST /api/riders/me/plan/preview` da una entrada por carrera (`raceKey`, `raceId`, `name`, `country`,
`startDay`, `stageCount`, `arrival`, `travel`) con lo que `getRiderRaceDays` ya tiene y tira
(`riderSchedule.ts` l. 37-70) y `getRiderTravelDays` (l. 175-226), y se van `raceId: null` y `tsb`
(`riders.ts` l. 477). La proyección deja de inventar: un día de carrera lleva la carga mediana de los del
propio diario, o `PREVIEW_RACE_DAY_TSS` = 150, y no los 25 de descanso de l. 449-451 (con la carga
medida, Race France pasaría de `Spot on` a `Loaded` en la tercera etapa y a `Cooked` desde la cuarta,
estimado en el mapa 02 §3); el viaje, los 15 TSS de `viaje` del tick (`train.ts` l. 200-203); y la
llegada de mañana, el TSB del último diario y no 0 (l. 475-476). Nada de esto toca el motor.

### 7.3 Defecto 2: cinco palabras sueltas no son una escala

`Scale5` ordena los tramos por TSB, de `Cooked` a `Rusty`, con los dos malos en los extremos, el activo
relleno y los ejes `◀ Too tired` y `Too fresh ▶`, que deshacen la lectura de `Rusty` como «cansado».
Debajo, la instrucción del tramo (pantalla):

| Código     | Tramo     | Instrucción                                                                    |
| ---------- | --------- | ------------------------------------------------------------------------------ |
| `fundido`  | `Cooked`  | `You'll start exhausted. Make the week before it a Taper or a Recovery week.`  |
| `cargado`  | `Loaded`  | `You'll start tired. A lighter week before it brings you to Fine or Spot on.`  |
| `bien`     | `Fine`    | `Ready to race, not at your best. A Taper week before it can make it Spot on.` |
| `perfecto` | `Spot on` | `This is the best way to arrive. Keep the plan.`                               |
| `oxidado`  | `Rusty`   | `You'll arrive under-trained. Put a Build week two or three weeks before it.`  |

«Con tu posición marcada» se resuelve sin el número: se marca el tramo, no un punto dentro de él, que
pediría el TSB que `docs/entrenamiento.md` l. 1086 prohíbe (mapa 04, tensión 23). Los cortes son los
del motor (`projection.ts` l. 75-81) y no se tocan.

### 7.4 Defecto 3: dos vocabularios y una precedencia invisible

**El puente se calcula en el servidor**: `GET /api/riders/me/orders` añade, para los 28 días,
`days: { gameDay, session, intensity, source, block, raceKey }[]`, con `source` en `race`, `travel`,
`edit`, `block`, `team`, `coach` o `rest`, de `resolveTrainingDay`, función pura nueva de
`packages/shared` con lo que hoy lee el bucle de `train.ts` l. 195-272. El tick pasa a llamarla sin
cambiar de conducta (un test compara las dos día a día) y la web borra `defaultCoachPlan`
(`trainingPlan.ts` l. 37), que coincide con el bloque en 88 de 350 casos (mapa 02 §1). **La precedencia,
donde se edita**: la línea de §7.1 en los dos paneles, y cada día con su origen en un borde izquierdo de
4 px y un `Chip` (`Race`, `Travel`, `Your edit`, `Build · week 1`, `Team plan`,
`Coach decides on the day`). En `entrenador`, los días en solo lectura con un `Notice` (pantalla):
`Coach mode: nothing you set here is used. Switch to Mixed to edit.` (hoy se editan y se guardan para
nada), y la vista previa con semanas `base`, que es lo que entrena el tick (1.820 de 1.820 días, mapa 02
§2); en `manual`, los huecos dicen `Rest (I decide)`. Que el entrenador no mire el calendario (`train.ts`
l. 256) es conducta del tick: queda anotado para la línea de entrenamiento.

**Los planes solapados** (mapa 02 §2): `PUT /api/riders/me/plan` borra en la misma transacción todo plan
cuya ventana pise la nueva y `getPlanForDay` ordena por `start_day`; un caso nuevo de
`planPorBloques.test.ts` guarda el día 100 y el 110 y exige una sola fila, leída igual en pantalla y en
el tick. Las semanas llevan sus días (`Days 51 to 57`) con `plan.startDay`, que hoy viaja sin usarse. Y
el TSS deja pantalla y API: la carga del mes va en `Meter` (`Load this month: hard`) y la de la sesión
en cuatro palabras, como pide el SPEC §14 («estrellas y cerillos deben bastar»).

### 7.5 El viaje

El dato se arregló el 26 de septiembre (mapa 02 §6); queda la pantalla. **Se ve donde se decide**, en
`On your programme` y en la portada (`You travel to Race Var tomorrow`, pantalla). **Ida, carrera y
vuelta son un viaje**: un bloque en el panel de los días, con su cabecera
(`Trip to Race Sardegna (IT) · Days 55 to 61 · 7 days off training`, pantalla), que agrupa viaje, etapas
y descansos, estos editables. **La proyección lo cuenta** (§7.2). **Una numeración**, `Day N` (fuera
`GD`, `MyRaces.tsx` l. 205 y 230), con `in N days` a siete o menos, y **un icono**, el `travel` de §3.3
en vez de los dos `✈` (`Training.tsx` l. 227, `TeamCalendar.tsx` l. 94); el porqué del viaje caro, en
un `InfoButton` y no en un `title` (l. 89-96).

## 8. La web instalable

### 8.1 El manifiesto y los iconos

`apps/web/public/manifest.webmanifest`, que `@fastify/static` sirve como `application/manifest+json`
(medido) y que la CSP de hoy permite (`default-src 'self'`, `app.ts` l. 172-192):

| Campo                             | Valor                                                                                     | Por qué                                                       |
| --------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `id`, `start_url`, `scope`        | `"/"`, `"/?source=pwa"`, `"/"`                                                            | una sola app; `source` cuenta en §8.5 los arranques del icono |
| `name`, `short_name`              | `"Cycling Star"` los dos, 12 caracteres                                                   | lo que cabe bajo un icono                                     |
| `description`                     | `"A cycling manager you play from your phone between race days."` (pantalla)              | la ficha de instalación de Android                            |
| `display`, `display_override`     | `"standalone"`, `["standalone", "minimal-ui"]`                                            | sin barra de navegador                                        |
| `theme_color`, `background_color` | `"#123a5c"`, `"#eef2f6"`                                                                  | la barra de estado como la cabecera; el arranque como la página |
| `lang`, `dir`, `categories`       | `"en"`, `"ltr"`, `["games", "sports"]`                                                    |                                                               |
| `icons`                           | 192 y 512 `any`; 512 `maskable` con el dibujo en el 70 % central (la zona segura es el 80 %) | los que pide Chrome (mapa 05 §14)                         |
| `shortcuts`                       | `Training` (`/me/training?source=pwa-shortcut`) y `Races` (`/world/races`), icono de 96    | lo que se abre entre dos días de juego                        |

En `index.html`: `viewport-fit=cover` (sin él, `env(safe-area-inset-*)` vale 0 en WebKit y el hueco de
`App.tsx` l. 154 no sirve; no comprobado en un dispositivo), `theme-color`, `apple-touch-icon` de 180,
`apple-mobile-web-app-title` y `apple-mobile-web-app-status-bar-style` `black-translucent`. Los iconos
salen del logotipo, hoy en índigo y ámbar de Tailwind v3 (mapa 01 §6), rehecho en navy y oro y revisado
a 16, 48 y 180 px: la marca sigue sin dueño (mapa 04, contradicción 12), pero el icono es de E3.

### 8.2 El service worker: qué guarda y qué no guarda nunca

- **Precarga**: `apps/web/sw.js` a mano (unas 120 líneas, sin Workbox), con la lista que un plugin de
  `vite.config.ts` saca de `dist/.vite/manifest.json` (l. 11): `index.html`, todo JS y CSS (80 ficheros,
  unos 320 KB con gzip sin las banderas, estimado), manifiesto, iconos y sprite; con `Save-Data`, solo la
  cáscara. Así una página nunca abierta se pinta sin red en su estado (medido con `/news`).
- **`/assets/*`**: primero la caché; llevan huella (`app.ts` l. 125-136): una versión baja lo que cambió.
- **Navegación: primero la red**, con `NAV_TIMEOUT_MS` = 3.000 y la cáscara guardada si no contesta.
  Medido en caliente (Slow 4G, CPU ×4, mediana de tres): la cáscara de la caché retrasa `Watch`
  (primera pintura 1,47 s y lista 3,24 frente a 1,20 y 1,67) porque pierde las precargas que el servidor
  pone en el HTML de la etapa (`spaShell.ts` l. 201-221); primero la red da 1,08 y 1,50. En portada y
  entrenamiento no cambia nada (de 1,07 a 1,18 s con y sin él): eso ya lo hace la caché inmutable de E2.
- **Nunca** `/api/*`, `/health` ni `/api/auth/*`: la API de E2 responde según lo que ha visto cada
  jugador y el HTML de carrera y etapa sale `private, no-store` con `Vary: Cookie` (`app.ts`
  l. 368-369), y una caché del service worker, que no distingue cuentas, daría a la segunda el destripe
  de la primera. Sin red, los datos salen solo de la memoria de React Query de la sesión.

### 8.3 Sin red, red mala y banderas

1. **La sesión tiene tres estados**: con sesión, sin ella y desconocida. Si la petición de sesión falla
   por red, `ProtectedRoute` no lleva a `/login`, `HorizonWatcher` no vacía la caché y la cabecera pinta
   la del jugador con una marca `cs:signed-in` en `localStorage`, sin nada de la cuenta.
2. **`OfflineBanner`** con `navigator.onLine`; lo pausado se rehace al volver (`refetchOnReconnect`,
   `queryClient.ts` l. 386) y las mutaciones esperan en la `ActionBar`, en memoria.
3. **Red lenta**: `Skeleton` desde el principio, `Still loading. Slow connection?` y `Retry` a los 8 s, y
   toda petición cortada a los 15. **Un trozo que falla** pinta su `ErrorState` en su sitio, no la
   barrera que sustituye la web entera (`main.tsx` l. 22-30).
4. **Banderas**: las 133 del juego en un sprite WebP de 64 × 48 por bandera (el triple de 21 × 16), de
   47 KB, que pide el primer `Flag` y no la primera pintura; la hoja baja de 92,4 a 9,2 KB con gzip. En
   frío (Slow 4G, CPU ×4, mediana de cinco), la primera pintura pasa de 3,20 a 2,93 s en las tres páginas
   medidas, la lista llega de 0,2 a 0,4 s antes y bajan de 62 a 82 KB por la red (`peso-medir.mjs`); la
   general pinta igual. Los 133 SVG en una hoja pesarían 327 KB: a 16 px los escudos no se ven.

### 8.4 La versión nueva, el iPhone y Android

El service worker nuevo espera y la web enseña `UpdateToast` (`registration.waiting`); si nadie lo toca,
entra al cerrar las pestañas. Contra el desfase, `/health` da `webBuild`, la huella del `index.html`, y
una respuesta que no pasa su esquema pinta `This version is out of date · Reload` (pantalla).
**iPhone**: sin `beforeinstallprompt`, `InstallHint` lo explica con
`Add Cycling Star to your Home Screen: tap Share, then Add to Home Screen` (pantalla), tras la tercera
sesión o cuando E4 pida avisos; desde iOS 26 la web añadida se abre como app aunque no haya manifiesto,
y los avisos siguen pidiendo que esté añadida (mapa 05 §14), que es el requisito de E4; sin barra no
hay recarga, de ahí `Reload app`. **Android**: la web guarda `beforeinstallprompt` y ofrece
`Install app` en `/account` y una vez en la portada tras ver una etapa. **Medido**: Chromium lee el
manifiesto sin errores (`Page.getAppManifest`) y el service worker queda activo; la instalabilidad no
la he podido comprobar (`Page.getInstallabilityErrors` da la lista vacía también para la web de hoy,
que no tiene manifiesto), ni he probado en ningún teléfono.

### 8.5 La prueba que algún día revisa la app nativa

La agenda la cuelga de una analítica que no existe (§4.22.3; mapa 04, contradicción 18), así que E3 pone
el sensor mínimo, propio y sin datos personales: `POST /api/telemetry/vitals` una vez por sesión, con
`device` (`phone`, `tablet` o `desktop`, por `pointer: coarse` y el ancho), `standalone`, `os`, ruta,
`readyMs` e `inpMs` donde se mida, agregado por día sin IP ni cuenta. **La regla** (§15, decisión 8): si
en una semana el 50 % o más de los jugadores activos entra desde un teléfono, la app nativa se revisa
cuando, cuatro semanas seguidas, el p75 de «lista» en teléfono pase de 4 s o el de INP de 300 ms; o menos
del 20 % de ellos la tenga instalada tres meses después de `InstallHint`; o E4 mida que en iPhone menos
del 30 % de los instalados acepta avisos o que falla más del 10 %.

## 9. La regla de la frontera

**La regla**: toda respuesta de la API es un subconjunto de lo que una pantalla enseña a quien la pide,
en su forma de pantalla. Un número interno (atributo con decimales, CTL, ATL, TSB, TSS, techo, talento,
fragilidad, moral exacta) no cruza nunca; cruza su estrella, su tramo, su palabra o su flecha:

1. **Cada ruta declara su esquema de respuesta** (`schema.response[200]`, el Zod de `contracts.ts`), y
   el serializador de `fastify-type-provider-zod`, que ya está (`app.ts` l. 162-163), quita lo no
   declarado: medido en el clon, `{ id, stars, ctl, attributes }` sale `{ id, stars }`. Habría quitado
   las seis claves de más de `GET /api/teams/:id/news` (mapa 02 §8).
2. **`apps/api/src/frontera.test.ts`**: falla si un campo de un esquema de respuesta se llama como un
   número interno (`ctl`, `atl`, `tsb`, `tss`, `ceiling`, `talent`, `fragility`) o es un `attributes` de
   números, y exige con el AST, como `noEngine.test.ts` l. 8-17, que cada campo se lea en
   `apps/web/src` o esté en `FRONTERA_SIN_USO` con su porqué.
3. **El canario de B1a, ampliado** (`spoilerCanary.test.ts` l. 20-51): testigos en `rider_attrs` y el
   diario, y barrido también por las POST (`spoilerWorld.ts` l. 334), por donde sale la vista previa.
4. **La alarma**: el registro de E2 (`spoiler.ts` l. 63-88) gana `exposes: 'public' | 'owner'` por
   ruta y el servidor no arranca si falta. El velo corta por etapa; esto, por clase de dato.

| Ruta y campo (mapa 02 §8)                                       | Arreglo                                                                                  |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `GET /api/riders/:id`, `attributes` con decimales               | `{ stars }` en medias estrellas (`rider.ts` l. 218-240), nada más para un ajeno          |
| `GET /api/riders/me`, `attributes`                              | `{ stars, mark }` (0 a 3, `AttributeList.tsx` l. 33-38) y los cerillos ya contados por la API (`RiderProfile.tsx` l. 213-225 deja de calcularlos) |
| vista previa, `arrivals[].tsb`; `days[]` con `ctl`, `atl`, `tsb`, `tss` | fuera; `days[]` pasa a `{ gameDay, session, intensity, source }` (§7.4)          |
| `GET /api/riders/me/form`, `log[]`                              | fuera `atl`; las dos barras de 0 a 100 de `condition.ts` l. 35-42 se calculan en la API |
| `GET /api/riders/me/trend`, `delta28`                           | el código de la flecha de cinco niveles                                                  |
| `coach-view`, `facilities` y `season`; `fame` en cuatro rutas   | fuera: no se pintan, y `fame` vale siempre 0                                             |
| `plan.goalRaceId`                                               | fuera hasta que tenga control; `plan.startDay` se queda, porque ahora se pinta           |

Y lo que la pantalla enseña de otra forma que el SPEC: la moral deja el porcentaje por cinco niveles
con palabra, la frescura su `16 / 100` (`Home.tsx` l. 354) por `Meter`, y el TSS se va (§7.4).

## 10. Lo que E2 dejó a E3

`Watch` no se rediseña: se viste, de arriba abajo a 360 px.

- **La cabeza de la etapa** queda en una fila de 44 (`‹ Race Valencia · Stage 3 of 5 ›`, sin los `<span>`
  a `opacity-40` de `StageReplay.tsx` l. 459 y 468), el `h1` en `title` con la ruta y `Share to watch`
  como icono: la televisión empieza hacia los 228 px y no a los 328 (estimado).
- **La capa fija**, sobre navy-dark: km a meta en `display` blanco (15,23:1), la diferencia en `row`, la
  flecha en gold (6,72:1) y el resumen a demanda de `docs/retransmision.md` §18.8, pendiente.
- **La barra de grupos**, con maillots de 16 px, rótulo en `caption` 600 en versales (`GroupBar.tsx`
  l. 215) y filas de 36; **el perfil**, con cotas de 12 px y sus hexadecimales de v3
  (`ProfileStrip.tsx` l. 63-139) en tokens; **el rótulo**, en los dos renglones que fijó E2 y con los
  fondos de `CueCard` (`bg-red-700`, `bg-slate-900`, `bg-slate-700`) en `bad`, `navy-dark` e `ink-2`.
- **`Highlights`, el `digest` y `Report`**: los botones de `WatchBlocks` y `PlayerControls` pasan a
  `Button`; `Report`, de 11.502 px, abre con el resultado (20 y `Show all`) y una fila de saltos
  (`Result · Classifications · Story`) antes de la crónica, que no se recorta.
- **Se queda** el reparto de su §6.1, el ritmo, los `aria-live` y la puerta del velo.

## 11. Constantes y tokens

| Nombre                                              | Valor                          | Intención                                             | Dónde                               |
| --------------------------------------------------- | ------------------------------ | ----------------------------------------------------- | ----------------------------------- |
| colores, tamaños de letra, radios y sombras de §3   | §3                             | una sola fuente de aspecto                            | `@theme` de `apps/web/src/index.css` |
| `PHONE_REF`, `PHONE_MIN`                            | 360 × 800, 320 × 640           | dónde se mide                                         | `apps/web/e2e/telefono.config.ts`   |
| `ANSWER_MAX_TOP_PX`, `THUMB_ZONE`, `TOOL_PAGE_MAX_PX` | 520, el 40 % de abajo, 3.200 | la respuesta, la acción y el alto                     | ídem                                |
| `MIN_FONT_PX`, `MIN_FIELD_FONT_PX`, `MIN_TARGET_PX` | 12, 16, 44                     | §2.5                                                  | ídem y la regla de ESLint           |
| `TOP_ROWS`                                          | 20 (ya existe)                 | la regla de tablas                                    | `components/ShowAll.tsx` l. 10      |
| `KIT_MIN_PX`, `KIT_SIZES`, `KIT_COLORS`, `KIT_BASES`, `KIT_FIGURES` | 16; 16, 28, 40, 72; §6.1 | el vocabulario cerrado y su tamaño | `packages/shared/src/kit.ts` |
| `KIT_MIN_DISTANCE`, `KIT_CHANGE_COOLDOWN_DAYS` | 10 (dibujado a 16 px, 4 visiones); 14 días de juego | reserva y rivales; que la afición aprenda el maillot | ídem |
| `PREVIEW_RACE_DAY_TSS`                              | 150                            | la carga de un día de carrera sin diario              | `packages/shared/src/training.ts`   |
| `NAV_TIMEOUT_MS`, `REQUEST_TIMEOUT_MS`, `SLOW_HINT_MS`, `UPDATE_CHECK_MIN_MS` | 3.000, 15.000, 8.000, 1.800.000 | cuándo se cae a la cáscara, se corta, se avisa y se busca versión | `apps/web/src/net.ts` |
| `CSS_BLOCKING_MAX_GZ`, `ENTRY_JS_MAX_GZ`            | 15 KB, 160 KB                  | el presupuesto de la primera pintura                  | `apps/web/scripts/peso.test.mjs`    |
| `INSTALL_HINT_AFTER_SESSIONS` | 3 | no pedir instalar en la primera visita | `apps/web/src/domain/install.ts` |

## 12. Tests y bancos

| Prueba                                                | Qué mide y con qué umbral                                                                                       | Corre               | Coste (estimado)  |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------- |
| `apps/web/e2e/telefono.spec.ts` (Playwright)          | las nueve comprobaciones de §5.3, con su trinquete                                                               | CI, cada PR         | 5 a 7 min, 150 MB |
| `apps/web/e2e/sinred.spec.ts`                         | recargar sin red da la cáscara con la cabecera del jugador, nunca `/login`; una página no abierta pinta `OfflineState`, nunca la barrera; una mutación en pausa sigue en la `ActionBar` | CI | 1 min |
| `apps/web/e2e/instalable.spec.ts`                     | `Page.getAppManifest` sin errores, iconos con su tamaño real, service worker activo, `theme-color`               | CI                  | 20 s              |
| `apps/web/scripts/peso.test.mjs`; `pintura.mjs` (el de `capturas/`) | hoja que bloquea ≤ 15 KB con gzip, JS del arranque ≤ 160, precarga ≤ 400, sprite ≤ 60; la pintura con los umbrales de §5.3 | CI; cada noche | 5 s; 6 min |
| `apps/web/src/tokens.test.ts`                         | lee el `@theme` y comprueba cada pareja de §3.1 con la fórmula de WCAG                                          | CI                  | 1 s               |
| `packages/shared/src/kit.test.ts`                     | Machado y CIEDE2000 en TypeScript reproducen a 0,01 una tabla de `colour-science`; paleta ≥ 12 y reserva ≥ 10   | CI                  | 2 s               |
| `packages/db/src/kits.test.ts`                        | `assignKits` con las listas de salida de la temporada 0: ninguna carrera con un par por debajo de 10            | CI                  | 30 s              |
| `apps/api/src/frontera.test.ts` y el canario ampliado | §9                                                                                                              | CI                  | 10 s              |
| `packages/db/src/trainingDay.test.ts`                 | `resolveTrainingDay` y el tick, iguales día a día en el mundo de los bancos; los planes solapados               | CI                  | 20 s              |
| ESLint en `apps/web/src/pages`                        | ni `text-[Npx]` con N < 12, ni colores sueltos de Tailwind, ni hexadecimales, ni `title` sin texto visible       | CI (`ci.yml` l. 252) | nada             |

**Se re-sellan** (mapa 01 §9) `stageRoute.test.tsx` l. 19, `riderResults.test.ts` l. 112-119 y los de
clases de `CueCard`, `GroupBar`, `PlayerControls` y `StageCards`; `leaderJerseys.test.tsx` (banda de 10
u, lunares de 4) y `stageTables.test.tsx` (maillot en las filas); y los de textos que cambia §7.

## 13. Plan por pasos, tests primero

Cada paso deja el juego desplegable y mejor. Coste: S, un PR pequeño; M, uno mediano; L, dos.

| Paso | Qué, con sus tests delante                                                                                                  | Depende | Coste |
| ---- | --------------------------------------------------------------------------------------------------------------------------- | ------- | ----- |
| 1    | Playwright en el CI y `telefono.spec.ts` con la línea base de hoy: la web no cambia y el trinquete queda fijado               | nada    | M     |
| 2    | Instalable mínima: manifiesto, iconos y logotipo, `theme-color`, `viewport-fit`, metas de Apple; `instalable.spec`           | 1       | S     |
| 3    | Sin red, aún sin service worker: sesión desconocida, `OfflineBanner`, `QueryView`, el trozo que falla; `sinred.spec`         | 1       | M     |
| 4    | Service worker y su plugin, primero la red, `UpdateToast`, `webBuild` en `/health`                                          | 2, 3    | M     |
| 5    | Sprite de banderas; `peso.test`                                                                                             | 1       | S     |
| 6    | Tokens, `focus-visible` y pila de letra; `tokens.test` y la regla de ESLint en aviso                                        | 1       | M     |
| 7    | El catálogo de §4 y los estados de cada página (44 `Loading…`, 26 errores, 9 vacíos)                                         | 6       | L     |
| 8    | Cabecera, pestañas y barra inferior con iconos                                                                              | 7       | M     |
| 9    | `RankTable` y `ActionRow` en las diez tablas de §5.1, primero el calendario del equipo                                      | 7       | L     |
| 10   | El examen en la API y en `packages/db`: llegada por carrera sin TSB, carga y viaje en la proyección, planes solapados, `resolveTrainingDay` | 1 | L |
| 11   | El examen en pantalla: `Scale5`, tarjetas por carrera, semanas con días, días con su origen, `ActionBar`                     | 7, 10   | M     |
| 12   | El viaje: programa, portada, viaje agrupado, `Day N`                                                                        | 11      | S     |
| 13   | Maillots, el dato: `teams.kit`, `kit.ts`, `assignKits` y su relleno, `CastTeam.kit`; `kit.test`, `kits.test`                | 1       | M     |
| 14   | Maillots, el dibujo: `WornJerseyIcon({ worn, team, size })`, 16 px, líderes y estrella; los re-sellos                       | 13      | M     |
| 15   | El editor con `checkKit` y la interfaz de E9                                                                                | 14      | M     |
| 16   | La frontera: esquemas de respuesta en todas las rutas, `frontera.test`, canario por POST, el inventario de §9               | 10      | L     |
| 17   | `Watch` en el teléfono (§10), `useHideBottomNav` si E6 lo acepta y la regla de ESLint en error                              | 8, 14   | S     |
| 18   | El sensor de §8.5 y su tabla diaria                                                                                         | 4       | S     |

Unos 22 PR. Primero lo que más pesa en el teléfono y menos cuesta (pasos 2 a 5: el juego se instala,
aguanta sin red y pinta antes); E3 queda terminado cuando el paso 17 deja a cero la línea base del 1.

## 14. Riesgos y fronteras

- **E2**: seis tests suyos se re-sellan y `WornJerseyIcon` cambia de firma y de dibujo, no de dato
  (`docs/retransmision.md` l. 5136); la navegación primero por la red guarda sus precargas (§8.2).
  **E4**: el aviso en iPhone pide la web instalada y un service worker, que da E3 (pasos 2 y 4). **E6**
  decide la barra en `Watch`, sus destinos y dónde vive cada explicación (`docs/agenda.md` l. 1661).
- **E8** compra color y nombre dentro del vocabulario, nunca una figura ni un color de fuera; la
  comisión de tienda solo pesa si la regla de §8.5 se dispara. **E9** modera el nombre del patrocinador
  y, si quiere, el maillot (§6.3). **E10**: nada de §4 tiene ancho fijo de texto y la prueba corre en
  cada idioma. **E12**: Mundial y continentales usan la estrella de §6.4 y miden su color con `kit.test`.
- **Propios**: `ΔE00 < 10` es el umbral del encargo, no un experimento con personas, y Machado con
  severidad 1 aproxima la dicromacia (mapa 03 §8); lo medido es Chromium sin cabeza con Inter, no Safari
  ni un teléfono; y un mundo con meses de calendario cambia quién coincide con quién, de ahí que
  `assignKits` repase los NPC cada temporada.

## 15. Decisiones que son del dueño

1. **La paleta.** Por defecto **A, «manager sobrio»** (§3.1): navy `#123a5c`, acento `#0b6e8a`, oro
   `#e0a106`, tarjetas blancas sobre `#eef2f6`, sin degradados. **B, «manager clásico»**: la de hoy con
   la cabecera de panel `#0b6e8a` y título blanco (5,81:1) y la barra de página `#e0a106` con título
   `#10202f` (7,30:1); más parecida a hoy, a 36 px por panel y 48 por página. **C, «noche»**:
   superficies `#0b2740` y `#123a5c`, texto blanco (15,23 y 11,76), secundario blanco al 75 % (9,10) y
   acento `#35bdda` (6,85), como `Watch` en todo el juego: es el modo oscuro, y repasa cada estado.
2. **La tipografía.** Por defecto **A, la del sistema**, 0 KB. **B, Inter variable** propia: 48 KB el
   latín y 85 el latín extendido que piden los nombres de 133 países (`@fontsource-variable/inter`
   5.2.8), y un salto de letra en la primera visita. **C, el sistema para el texto y Barlow Condensed
   600 y 700 para cifras y títulos**, el aire de la televisión: 21 KB por peso en latín
   (`@fontsource/barlow-condensed` 5.2.6). Con B o C, `font-display: swap`.
3. **La señal de campeón.** Por defecto **A, la estrella** (§6.4). **B, el galón**: el mismo blanco con
   una V navy de 8 u del hombro al pecho; mide más en todo (22,4 de la marca, 19,6 de la equipación más
   cercana en protanopía), pero no es el emblema del juego y su versión mundial en oro queda a 6,9 del
   amarillo de líder en grises. **C, la variante del dueño que sobrevive al teléfono**: tres franjas de
   7 u (navy, cian `#1499bb`, oro) sobre blanco; pasa forma, daltonismo y reserva y queda a 23,0 de la
   marca, pero es la camiseta blanca con franjas en el pecho que el `SPEC.md` §8 prohíbe imitar, y
   pide verificarla ante EUIPO y USPTO antes del lanzamiento. Sus cinco variantes literales van a la
   página de opciones con su distancia a la marca: ninguna pasa los cuatro criterios (§6.4).
4. **El vocabulario del maillot.** Por defecto **A, doce colores y siete figuras** (651 combinaciones,
   margen mínimo entre rivales de 18,5). **B, diez colores y cinco figuras** (sin sky ni purple;
   `Plain`, `Chest band`, `Halves`, `Yoke`, `Sash`): 296 combinaciones, 71 distinguibles a la vez y
   margen de 12,8, menos que elegir y más fácil de recordar. **C, la paleta nueva con las figuras de
   hoy** (`solid`, `band`, `stripes`, `panels`, `shoulders`): 450, margen de 11,9 y rayas de 1 px a 16;
   lo que menos cambia. En las tres, ninguna carrera de la temporada 0 tiene un par a menos de 10.
5. **Modo oscuro**: no en E3 (es la paleta C, y un PR M). **Playwright en el CI**: sí, con 5 a 7 minutos
   más por PR; sin él, la aceptación deja de ser automática.
6. **El dorsal del equipo líder**: no vuelve como icono, sino como `Leads overall` (§6.5). **Esconder
   la barra inferior en `Watch`** mientras corre la carrera: sí, propuesto a E6.
7. **El TSS fuera de pantalla y API**, con la carga en palabras (§7.4): sí. **Repintar una vez los 219
   equipos NPC**, también en las etapas grabadas antes del paso 13: sí, o habría que guardar el maillot
   de hoy en cada reparto viejo.
8. **La regla de revisión de la app nativa** con su sensor (§8.5): sí; esperar a la tarea D11 deja la
   decisión de §4.15.1 sin prueba. **El aviso de instalar**: tras la tercera sesión o cuando E4 pida
   avisos, nunca en la primera visita.
9. **Las palabras de la llegada** se quedan, con ejes e instrucción; si no, las de
   `docs/entrenamiento.md` l. 1086-1099 (`Buried`, `Loaded`, `Fresh`, `Peaking`, `Stale`), que tocan los
   cortes del motor.
