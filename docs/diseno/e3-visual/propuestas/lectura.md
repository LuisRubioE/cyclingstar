# Propuesta E3 · lente de la lectura: cada pantalla contesta una pregunta en su primera pantalla, y la API no manda más de lo que esa respuesta enseña

Commit `58c14da`. Base de hechos: los cinco mapas y las capturas a 360 y 1.280 px. Código leído para
la lente: `PlanLadder.tsx` y `Training.tsx` enteros, `routes/riders.ts` l. 296-481, `db/train.ts`
l. 60-275, `db/training.ts` l. 196-261, `riderSchedule.ts`, `projection.ts`, `banister.ts`, los
contratos del plan en `contracts.ts`, `MyRaces.tsx`, `Panel.tsx`, `Header.tsx`, `BottomNav.tsx`,
`WornJerseyIcon.tsx`, `condition.ts`, `dashboard.ts`, `spoiler.ts` y `app.ts`; y `docs/entrenamiento.md`
§5.2 a §5.5, `docs/agenda.md` §4.14, §4.19, §4.20 y apéndice A, y `docs/retransmision.md` §6 y §7.9.
**Medidas propias** en `<scratchpad>/propuesta-lectura/` (se pierden con la sesión): `scripts/color.py`
(WCAG 2.x y ΔE00 tras Machado 2009, severidad 1, en RGB lineal, como el mapa 03), `maillots.py`,
`maillots2.py`, `campeon.py`, `campeon2.py` y `lideres.py` (con el rasterizador del mapa 03 cargado
como módulo) y `proto/training.html` con `proto/medir.mjs` (el cuadro nuevo en el Chromium de
`/opt/pw-browsers`, 360 × 800, relación 2). Cifra sin otra marca, medida así.

---

## 0. Resumen

Lo obvio sería una paleta nueva, un catálogo de componentes y repintar pantalla a pantalla. Esta
propuesta empieza antes: por la pregunta que contesta cada pantalla y por el orden en que se lee, que
es lo que la televisión resolvió hace cuarenta años y lo que E2 ya aplicó en `Watch` (lo permanente y
lo eventual, `docs/retransmision.md` §6.2). El sistema visual es la gramática que hace que la respuesta
se lea igual en todas partes; la paleta y los componentes, su vocabulario. Tres piezas:

1. **Cuatro capas por pantalla, en el mismo orden**: la respuesta (permanente, en la primera pantalla
   del teléfono), su porqué, los mandos que la cambian y la referencia, plegada. Se mide: cada página
   marca su respuesta con `data-answer` y tiene que empezar por encima de 600 px a 360 × 800. Hoy el
   plan la tiene a 1.060 px (mapa 05 §3); el prototipo del cuadro nuevo, a 228.
2. **Una palabra por cosa y ningún número sin su escala**: `Day 52` e `in 2 days` en todo el juego,
   un formato de tiempo, la identidad de corredor y de carrera siempre igual; fuera
   `1300 TSS over four weeks` y `Freshness 16 / 100`, dentro tramos, barras y estrellas con su escala.
3. **La frontera como verdad del producto**: la API manda lo que alguna pantalla enseña y a su
   resolución; el tramo, la estrella o el entero viajan ya convertidos. Cuatro mecanismos lo hacen
   cumplir, montados sobre el registro de rutas que E2 ya exige al arrancar.

El examen prueba las tres a la vez: el cuadro contesta primero «¿cómo llego a la Race X?» (una fila
por carrera, con su viaje y una escala de cinco tramos) y después «¿qué hago cada día y quién lo
decide?» (las semanas del plan con fechas y cada día con su origen, `Your edit`, `Build week`, `Coach`).
Y como una escala que dice algo falso es peor que una palabra suelta, E3 arregla en la API y en
`packages/db`, sin tocar el motor, lo que la pantalla promete y el tick no cumple: una función de
precedencia para los dos, el plan con sus fechas, un solo plan vivo y la carga de carrera estimada.

Medido: tres tintas de texto por encima de 5,5:1 sobre el fondo; un vocabulario de maillot de 605
diseños que baja los pares indistinguibles a 13 px de 3,4 a 1,2 % en visión normal y de 10,2 a 2,4 %
en deuteranopía, con 95 separados entre sí en las cuatro visiones; y una señal de campeón (la estrella
del juego sobre blanco) a 11,9 o más de todo diseño y 17,4 de todo líder. Deja `sinRitmo`, la ganancia
y el objetivo D1, la ayuda (E6), los logotipos (E8, E9), el Mundial (E12) y la analítica. Son 15 PR;
los tres primeros no cambian nada visible.

## 1. Diagnóstico

1. **La respuesta no está en la primera pantalla.** `/me/training` enseña lo que hace el plan a
   1.060 px y mide 6.807 (mapa 05 §3); la capa fija de `Watch` arranca a 328 px de 800 tras miga,
   flechas, título, ruta, `Share to watch` y pestañas (captura 08, medido sobre la imagen); en
   `/team/calendar`, `Add` y `Drop` quedan fuera de la tabla recortada (captura 15).
2. **Jerarquía plana**: la barra dorada de página y la cian de cada panel pesan igual, con blanco a
   2,06-3,33:1 (mapa 01 §2.3); siete cabeceras cian para siete cifras en `/team/calendar`.
3. **Números sin escala**: `1300 TSS over four weeks` y `105 TSS` (`PlanLadder.tsx` l. 233;
   `Training.tsx` l. 279-281), `Freshness 16 / 100` y `Morale 60%` (captura 17), `17214` sin
   separador junto a `6,173,210` (`TeamCalendar.tsx` l. 150). El dueño, de otra casilla: «eso no
   aporta, ni se entiende» ([DUEÑO 8], `RiderProfile.tsx` l. 147).
4. **Una cosa, varias palabras.** `Day N`, `GD N` e `in N days` (mapa 02 §6); `Finances.tsx` l. 134 y
   `TeamFeed.tsx` l. 17 pintan el día absoluto, que desde la segunda temporada no es el de la
   temporada (`seasonPosition`, `time.ts` l. 61-70; por lectura, sin probar); `+0:40` en el acta y
   `+0:00:20` en la general (`formatTime`, `format.ts` l. 4-11, frente a `fmtTime`, `Race.tsx`
   l. 60-65); bloques arriba, sesiones abajo y «cola» en la portada (mapa 05 §3).
5. **La pantalla promete lo que el tick no cumple** (mapa 02 §2 y §3). Y uno que el mapa no cuenta:
   la vista previa toma `blocks[Math.floor(i / 7)]` desde mañana (`riders.ts` l. 453) y el tick
   `Math.floor((gameDay − startDay) / 7)` desde el día del guardado (`train.ts` l. 216): pasado un día,
   escalera y proyección van desplazadas respecto de lo que se entrena, y no hay fechas que lo delaten.
6. **La frontera se rompe por los números** (mapa 02 §8 y §9), y nada lo impide: contratos _strip_.
7. **Lo eventual se mezcla con lo permanente** (ocho formas de aviso entre los datos, 23 explicaciones
   solo en `title`, mapa 01 §3.2 y §7), y **los estados están sin diseñar** (mapa 01 §4; mapa 05 §13).
8. **Lo pequeño se ve mal**: letra de 8 a 11 px, objetivos de 13 a 20 (mapa 05 §2), y el maillot de
   13 px, lo único que identifica a un corredor en un grupo de `Watch`, con gemelos (mapa 03 §3).

## 2. Principios

1. **Cada pantalla contesta una pregunta, y en la primera pantalla del teléfono.** Consecuencia:
   `data-answer` y un banco que falla si empieza por debajo de 600 px (§5.4).
2. **Cuatro capas, siempre en el mismo orden**: respuesta, porqué, mandos, referencia. Consecuencia:
   las llegadas antes que la escalera; el día a día plegado ([DUEÑO 11]); la ayuda larga, de E6.
3. **Lo permanente y lo eventual, como en la tele.** Consecuencia: una línea de estado fija bajo cada
   título, el reloj del mundo también en el teléfono, y los avisos en una sola zona (`Notice`).
4. **Un número lleva su escala, o no se enseña.** Consecuencia: `BandScale`, `Bar` con sus extremos,
   estrellas «de cinco», puestos «de N»; fuera el TSS y las cifras de frescura y moral.
5. **Una palabra por cosa.** Consecuencia: un glosario cerrado (§4.2) que imponen los componentes.
6. **La API manda lo que la pantalla enseña, a su resolución** (`docs/encargos.md` l. 254-257).
   Consecuencia: la conversión se hace en el servidor y la resolución va en el tipo (§9).
7. **El color significa; la posición y la forma informan.** Consecuencia: el tramo se lee por su sitio
   y el campeón por su estrella; ningún texto baja de 4,5:1; el color de estado solo dice estado.
8. **Densidad de manager, al tamaño del pulgar.** Consecuencia: filas fijas de 44 px en dos renglones,
   letra mínima de 12 px, cifras tabulares a la derecha, top 20 y la fila propia siempre a la vista.

## 3. Los fundamentos

### 3.1 La paleta

Tokens por función en el `@theme` de `apps/web/src/index.css` (hoy seis de marca, l. 5-12), para que un
modo oscuro futuro sea redefinirlos. Contrastes medidos con `scripts/color.py`.

| Token                                                  | Hex                                                   | Uso                                                                              | Contraste medido                                                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `page`, `surface`, `sunken`                            | `#eef2f6`, `#ffffff`, `#f5f7fa`                       | fondo del `body` (hoy `#e8edf2`), paneles, celdas y esqueletos                   | `page` a 1,12:1 del blanco: separan la sombra y el filete                                                          |
| `band`                                                 | `#e8f0f5`                                             | cabecera de `Section`                                                            | `navy` encima, 10,20; `ink-3`, 5,38                                                                                |
| `line`, `line-field`                                   | `#d5dde6`, `#8796a8`                                  | divisor; borde de campo                                                          | decorativo; 3,02 contra blanco (componente)                                                                        |
| `ink`                                                  | `#0f172b`                                             | texto                                                                            | 17,83 en blanco; 15,85 en `page`                                                                                   |
| `ink-2`                                                | `#3f4d61`                                             | secundario, línea de estado                                                      | 8,59; 7,63                                                                                                         |
| `ink-3`                                                | `#556274`                                             | equipo en tablas, metas, etiquetas; sustituye a `slate-400` (2,63) y `slate-500` | 6,20; 5,51; 5,78 en `sunken`                                                                                       |
| `navy`, `navy-dark`                                    | `#123a5c`, `#0b2740`                                  | cabecera; barra inferior                                                         | blanco encima, 11,76 y 15,23                                                                                       |
| `on-navy-2`                                            | `#c9d6e3`                                             | reloj del mundo, pestaña inactiva                                                | 7,96 y 10,31 (el reloj de hoy, 1,14, mapa 05 §11)                                                                  |
| `action`, `action-hover`, `action-tint`                | `#0b6e88`, `#095a70`, `#e3f1f5`                       | botón primario, enlace, foco; encima; selección                                  | blanco en `action` 5,83, `action` en blanco 5,83 y en `page` 5,19; blanco en `hover` 7,75; `action` en `tint` 5,05 |
| `gold`, `gold-light`                                   | `#d99400`, `#f0b429`                                  | `Sign up`; acento sobre marino                                                   | `navy-dark` en `gold` 5,94 (hoy blanco, 2,56); `gold-light` en `navy` 6,31                                         |
| `own`, `own-tint`                                      | `#a87300`, `#fdf4dc`                                  | barra de 3 px y fondo de la fila propia                                          | barra 4,10 contra blanco; `ink` en el fondo 16,26                                                                  |
| `good`, `warn`, `danger`, `info`                       | `#137a4a`, `#995c00`, `#c01f1f`, `#1f5fa6`            | texto de estado                                                                  | 5,37; 5,40; 6,07; 6,47 en blanco                                                                                   |
| sus tintes                                             | `#e3f5ea`, `#fff3d6`, `#fde8e8`, `#e5eefa`            | fondo de `Notice` y `Chip`                                                       | su texto encima: 4,73; 4,90; 5,17; 5,53                                                                            |
| escala, apagado                                        | `#dfe5ec`                                             | tramos sin encender                                                              |                                                                                                                    |
| escala, encendido                                      | `#b42318`, `#b85c00`, `#5b6b80`, `#137a4a`, `#2f62b0` | `Cooked`, `Loaded`, `Fine`, `Spot on`, `Rusty`                                   | contra el apagado de 3,62 a 5,18:1 y ΔE00 de 32,0 a 57,0 en las cinco vistas                                       |
| `broadcast`, `broadcast-ink`, `broadcast-ink-2`, `cue` | `#0f172b`, `#ffffff`, `#aab8c8`, `#a3120f`            | superficie de `Watch`, su tinta, el rótulo                                       | 17,83; 8,83; blanco en `cue` 7,92                                                                                  |

En grises los encendidos se confunden (`Fine` y `Spot on`, 0,3), y da igual: nunca hay dos a la vez y
el tramo se lee por su sitio. **Modo oscuro, no** (no lo ha pedido el dueño, duplica los pares y
`Watch` ya es oscuro; decisión 12). **PR #105 se conserva en lo que sirve** (fue una decisión para el
público de Hattrick y PCM, mapa 04 §2), pero el color deja de llevar blanco por debajo de 4,5:1.

### 3.2 La tipografía

La pila del sistema que Tailwind v4 ya sirve (`theme.css` l. 2-4), 0 KB (§15, decisión 2); pesos 400,
600 y 700 (fuera `font-medium` y `font-mono`); cifras tabulares en tablas, escalas y `Watch`.

| Token                             | px / interlínea   | Peso     | Uso                                                               |
| --------------------------------- | ----------------- | -------- | ----------------------------------------------------------------- |
| `--text-meta`                     | 12 / 16           | 400, 600 | metas, chips, etiquetas de escala, segundo renglón: **el mínimo** |
| `--text-dense`                    | 14 / 20           | 400, 600 | filas, listas, línea de estado                                    |
| `--text-body`                     | 16 / 24           | 400      | texto y campos (Safari de iPhone no amplía a 16)                  |
| `--text-heading`                  | 16 / 24           | 600      | título de `Section`, en `navy`                                    |
| `--text-display`                  | 24 / 30           | 700      | título de página                                                  |
| `--text-figure`, `--text-overlay` | 28 / 32 y 20 / 24 | 700      | cifra protagonista; capa fija de `Watch` en el teléfono           |

Nada por debajo de 12 px, tampoco en un SVG (las cotas de `Watch` pasan de 8 a 12); versales solo en la
barra de grupos (SPEC §6.15, l. 609); fuera `text-[11px]` y `text-[10px]` (27 veces, mapa 01 §2.2).

### 3.3 Espaciado, rejilla, densidad, radios, sombras e iconos

- **Espaciado** de 4 px en seis pasos: 4, 8, 12, 16, 24 y 32. **Rejilla**: márgenes de 12 px por
  debajo de 640 (los 336 útiles con que diseñó E2, `docs/retransmision.md` l. 12458) y 16 por encima;
  1.152 px de ancho máximo (`App.tsx` l. 158); dos columnas desde 1.024, como `Watch` (l. 3850).
- **Densidad**: fila interactiva de 44 px (14/20 más 12/16 más 8 de relleno), fila de dato de 36,
  control de 44. **Radios**: 4, 8 y pastilla (hoy siete). **Sombras**: `0 1px 2px rgb(15 23 43 / 0.08)`
  para paneles y `0 -2px 8px rgb(15 23 43 / 0.16)` para barras fijas.
- **Iconos**: fuera los emoji del armazón (`✈️`, `🚴`, `🏁`, `⚠`, mapa 01 §6), que cada sistema pinta a
  su manera, y los glifos de barras (el dueño leyó uno de 15 px como «Ill», [DUEÑO 5]). Dieciséis SVG
  de 24 u, trazo de 2 u, `currentColor`, a 16 o 20 px y siempre con texto o `aria-label` (`travel`,
  `race`, dos de estrella, cinco de tendencia, `info`, `warning`, `check`, `retry`, `offline`,
  `chevron`, `more`): material generable (agenda §4.22.5), revisado a 16 px en grises.
- **Dónde vive**: los tokens, solo en `@theme` (Tailwind v4 genera `bg-surface` o `text-dense`; los SVG
  usan `var(--color-…)`); el vocabulario del maillot, en `packages/shared/src/jerseyVocabulary.ts`,
  porque lo valida el servidor; los textos de pantalla, en `apps/web/src/design/words.ts`.

## 4. Los componentes y sus estados

### 4.1 El catálogo cerrado

En `apps/web/src/components/ui/`. Foco: anillo de 2 px en `action` separado 2 px (5,83:1). Deshabilitado:
fondo `#e6ebf1`, texto `ink-3` (5,17:1) y su porqué en una línea visible, nunca en `title`.

| Componente                                                 | Sustituye a                                                                              | Anatomía y medidas                                                                                                                                                                                                                                                                                                                                                               | Estados                                                                                              | Ejemplo (pantalla)                                                                                    | Accesibilidad                                                                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `PageHeader`                                               | `SectionBar` (18 ficheros), 13 `h1` a mano                                               | título `display` `ink` y, debajo, la **línea de estado** (`dense`, `ink-2`), lo permanente de la página                                                                                                                                                                                                                                                                          | normal; cargando (línea en esqueleto); sin estado                                                    | `Training` · `Mixed · your plan runs Day 51 to Day 78`                                                | `h1` único                                                                                                  |
| `Section`                                                  | `Panel` (63) y la tarjeta `card` (7 constantes, 25 copias)                               | cabecera de 40 px en `band` con `h2` `heading` `navy` y acción; cuerpo de 16 px; radio 8; sin `overflow-hidden` (lo ancho se desplaza dentro, mapa 01 §5)                                                                                                                                                                                                                        | normal, plegada, cargando, error, vacío                                                              | `Your next races`                                                                                     | `aria-labelledby`; `aria-expanded` si pliega                                                                |
| `Fact`                                                     | `InfoRow` y las tarjetas de una cifra                                                    | etiqueta `ink-2`, valor 600 tabular, su escala en `meta`; 36 px                                                                                                                                                                                                                                                                                                                  | normal, cargando                                                                                     | `Season points · 548 · 1st of 3,902`                                                                  | `dl` (hoy fallan `dlitem` y `definition-list`, mapa 05 §11)                                                 |
| `Button`                                                   | 109 combinaciones (mapa 01 §3.3)                                                         | `primary` (`action`), `secondary` (blanco, borde `line-field`), `quiet` (texto `action`), `danger` (6,07); 44 px; sm de 36 visibles y 44 de área, solo en filas                                                                                                                                                                                                                  | encima, foco, pulsado (`action-hover`, 1 px abajo), deshabilitado, cargando (`Saving…` a ancho fijo) | `Save plan` · `Not enough money for the trip`                                                         | `aria-busy`, `aria-describedby` al porqué                                                                   |
| `Chip`                                                     | 15 formas en 23 `span`                                                                   | 24 px, `meta` 600, pastilla; neutro (`sunken`), `action-tint` y los cuatro de estado                                                                                                                                                                                                                                                                                             | estático                                                                                             | `Your edit` · `Called up`                                                                             | texto, no solo color                                                                                        |
| `Notice`                                                   | 8 avisos ámbar y `VeilNotice`                                                            | **la zona de lo eventual**, una, bajo el `PageHeader`; icono 16, `dense`, acción `quiet`                                                                                                                                                                                                                                                                                         | entra, se queda mientras dura la causa, se cierra si es informativo                                  | `You're offline. Showing what you saw at 14:02.`                                                      | `role="status"`; `alert` si es error                                                                        |
| `LoadingState`, `ErrorState`, `EmptyState`, `OfflineState` | 44 `Loading…`, 26 errores sin reintento, 9 cajas discontinuas, el `Loading…` eterno      | esqueleto con la forma de lo que viene (pulso de 1,5 s, quieto con `prefers-reduced-motion`); frase y `Try again`; porqué y acción siguiente; sin red, reintento al volver                                                                                                                                                                                                       | en pausa sin red (`fetchStatus === 'paused'`) la carga pasa a `OfflineState`                         | `Could not load your training plan.` · `No races in the next four weeks. This month is for building.` | `status` o `alert` con nombre                                                                               |
| `Tabs`                                                     | cuatro variantes y tres pestañas a mano                                                  | `page` (subrayado de 3 px, `gold-light` sobre marino o `action` sobre claro) y `segmented`; 44 px; degradado de 16 px en el borde si el carril sigue                                                                                                                                                                                                                             | activa, encima, foco, deshabilitada                                                                  | `Upcoming` · `Available to enter`                                                                     | el patrón ARIA de `Tabs.tsx` l. 153-222                                                                     |
| `Field`                                                    | 42 campos, 23 combinaciones                                                              | `select`, `input`, `segmented`; 44 px, `body`, etiqueta siempre visible                                                                                                                                                                                                                                                                                                          | foco, deshabilitado con porqué, error en `danger`                                                    | `Week 1 block`                                                                                        | etiqueta (hoy falla `select-name`), `aria-invalid`                                                          |
| `DataTable`                                                | las 15 tablas, `GcTable` y `PointsTable` dobles                                          | puesto 28 px, identidad, valor tabular a la derecha; fila fija de 44 px en dos renglones; cabecera pegajosa; top 20, `Show all 140` y la **fila propia** anclada tras `…`, con barra `own`, fondo `own-tint` y nombre en 600; DNF en `ink-3` con chip (hoy `slate-300`, 1,48:1)                                                                                                  | cargando (20 filas), error, vacío, velada                                                            | `34 · José Quintáns · +4:12`                                                                          | `caption`, `th scope`, fila propia `aria-current`                                                           |
| `RowList`                                                  | tablas de más de 4 columnas en el teléfono                                               | la fila en dos renglones con su acción de 44 px                                                                                                                                                                                                                                                                                                                                  | como `DataTable`                                                                                     | `Day 59 · Race Ardèche .Pro` / `336 · 2 travel days (1 out, 1 back)` · `Add`                          | `ul`                                                                                                        |
| `RiderTag`, `RaceTag`, `GameDate`                          | `RiderName` y lo suelto; cinco maneras de nombrar carrera; `GD N`                        | dorsal, bandera 16 × 12, maillot de 16, nombre (humano 600, NPC cursiva, subrayado punteado: [DUEÑO 6], [DUEÑO 24]) y equipo debajo ([DUEÑO 26]); bandera, nombre, clase y `one day` o `N stages`; el día                                                                                                                                                                        | propia, abandonada; en curso; hoy, pasado                                                            | `142 · Cristian Lombardo` / `Onda Pro Cycling` · `Race Sardegna .1 · 5 stages` · `Day 52 · in 2 days` | bandera con país; `time`                                                                                    |
| `BandScale`                                                | las cinco chapas de `ARRIVAL_LABEL` (`PlanLadder.tsx` l. 63-69)                          | N tramos de 10 px con 2 de hueco; el encendido de 14 px en su color; etiquetas `meta`, la encendida en 700; marca `best`; eje `tired` y `rested`                                                                                                                                                                                                                                 | con valor, sin valor (`Racing now`), cargando                                                        | §7.2                                                                                                  | `role="img"`: `Arrival at Race Var: Loaded, 2 of 5 from Cooked (tired) to Rusty (rested). Best is Spot on.` |
| `SegmentMeter`, `Bar`, `Stars`                             | `ProgressMark` (`AttributeList.tsx` l. 39-51) y el TSS del día; `16 / 100`; `StarRating` | cuatro segmentos de 10 × 3 px; barra 0-100 con extremos y la palabra de `conditionLabel` (`condition.ts` l. 48-55); medias estrellas                                                                                                                                                                                                                                             | 0 a 4; sin dato                                                                                      | `Hard` · `Freshness · Low`                                                                            | `aria-label="Load: Hard, 3 of 4"`; `role="meter"`; `3.5 of 5 stars`                                         |
| la ficha de corredor                                       | `RiderProfile.tsx` (536 l.)                                                              | composición, en este orden: `PageHeader` con el nombre y `Climber · 18 · Free agent · Spain`; `Condition` (forma en `Stars`, fondo y frescura en `Bar`, cerillos como iconos de 2 a 5, SPEC §4.1, y salud); atributos en filas de 44 px (`Stars`, y en la propia `SegmentMeter` y flecha), con la frase del entrenador a la vista en el «lo tuyo» (hoy una a la vez, mapa 02 §7) | propia, ajena (solo estrellas, SPEC §3.2), cargando, error                                           | `Mountain` ★★★½ · `This is your thing: your biggest potential is here.`                               | `h1`; cada atributo, su `aria-label`                                                                        |
| `SaveBar`                                                  | `Save plan` y `Save day edits` sueltos                                                   | fija sobre la barra inferior mientras haya cambios: `Unsaved changes`, el efecto, `Discard` y `Save`; 56 px y el área segura                                                                                                                                                                                                                                                     | oculta, visible, guardando, error                                                                    | `Unsaved changes · Race Var: Loaded → Fine`                                                           | `role="region"` con nombre                                                                                  |
| `TripRow`                                                  | ida, carrera y vuelta sueltas                                                            | icono `travel`, `RaceTag`, días y `no training`; debajo, cada día                                                                                                                                                                                                                                                                                                                | normal, en curso                                                                                     | `Race Var trip · Day 51 to 53 · no training`                                                          | `li`                                                                                                        |

### 4.2 El glosario de pantalla

| Cosa                | Se escribe (pantalla)                                                                                  | Nunca                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| un día              | `Day 56`; `Day 56 · in 6 days`; `Day 56 to 60`; `Day 12 · Season 2`                                    | `GD 56`, el día absoluto              |
| una diferencia      | `+0:40`, `+12:05`, `+1:02:10`, `s.t.` (`formatTime` y la regla de `Watch`)                             | `+0:00:20`                            |
| una carrera         | `Race Var .1 · one day`; en una frase, `Race Var`                                                      | `the Race Var` (`dashboard.ts` l. 68) |
| el viaje            | `travel out`, `travel back`; `2 travel days (1 out, 1 back)` (`labels.ts` l. 157-161)                  | `1d`                                  |
| el origen de un día | `Your edit`, `Build week` (o el bloque), `Team plan`, `Coach`, `Active rest (empty)`, `Race`, `Travel` | nada                                  |
| la carga            | `Rest`, `Easy`, `Steady`, `Hard`, `Very hard`                                                          | `105 TSS`                             |
| el dinero           | `6,173,210`, `−80` (`money`, `format.ts` l. 14-17)                                                     | `17214`                               |

## 5. El teléfono

### 5.1 Las tablas anchas (mapa 01 §5)

- **Clasificaciones, etapa, llegada, equipos y ranking**: `DataTable` de cuatro columnas, fila fija de
  44 px (hoy de 40 a 120, capturas 05 y 11), top 20 y fila propia, también en el ranking (hoy 100).
- **Calendario del equipo** (recortado) e **inscribibles** (193 filas, viaje en cinco renglones):
  `RowList` con la acción de 44 px; en inscribibles, top 20 por fecha y `Show all 193`.
- **Salón de la fama** (7) y **nación** (5): desplazamiento con la primera columna fija, degradado de
  borde y `aria-label="Scroll for more columns"`; top 20 en la nación.
- **Movimientos, plantilla y plan del mánager**: `RowList` de dos renglones (adiós a `Josef Janse…`).

### 5.2 La navegación, los objetivos y la letra

La barra inferior se queda (es de E6) con el activo en una barra de 3 px de `gold-light` en vez de la
pastilla, y la etiqueta a 12 px en 600: caben enteros `Dashboard` (63 px), `My Rider` (52) y `My Team`
(53) en celdas de 64 (medido en el Chromium de Linux con su fuente de reserva; en un iPhone, sin
medir), sin `Dashb…` y sin cambiar el rótulo (mapa 04, contradicción 6). El reloj sube a la cabecera,
`Day 50 · 4h 56m` en `on-navy-2` (95 px a 12 px). En la etapa, la cabecera del teléfono baja a dos líneas
(`Race Valencia · Stage 3 of 5 ‹ ›` y la ruta), con `Share` en `more`, y la capa fija empieza por
encima de 200 px. Todo objetivo mide 44 × 44 px salvo un enlace en una frase; en una fila, el objetivo
es la fila entera.

### 5.3 El peso

`flag-icons` sale de la CSS (91 % de la comprimida, mapa 01 §8): las 133 banderas del juego se copian
al `build` en `/flags/4x3/xx.svg` y `Flag` pinta un `img` con `loading="lazy"`, tamaño fijo y `alt`.
Sin ellas la CSS que bloquea la primera pintura pasa de 94,3 KB con gzip a 8,5 (mapa 01 §8).

### 5.4 El criterio de aceptación: «se juega bien en un teléfono»

**Herramienta**: los guiones del mapa 05 (`capturas/mundo.mjs`, `servir.mjs`, `capturas.mjs`,
`medir.mjs`, `pintura.mjs`) mudados a `scripts/visual/`, con Playwright 1.56.1 y axe-core 4.10.3.
**Dónde**: a mano antes de fusionar cada PR de E3 que toque pantallas, contra el mundo de 50 días
guardado (15 minutos una vez; la pasada, unos 5, estimado). **Umbrales**, a 360 × 800 y 390 × 844:

1. `scrollWidth` igual al ancho, y ninguna tabla más ancha que su caja fuera de una zona desplazable.
2. Ningún texto por debajo de 12 px (hoy 8) y todo objetivo de 44 × 44 o más (hoy el 90 % o más
   fallan en 30 pantallas), con la excepción de §5.2.
3. axe-core (WCAG 2.2 AA) a cero en `color-contrast`, `target-size`, `select-name`, `label`,
   `button-name`, `link-name`, `dlitem` y `definition-list` (hoy 2.816 nodos de contraste).
4. `[data-answer]` por encima de 600 px en portada, plan, `My races`, ficha, carrera, `Watch`, `Report`
   y calendario del equipo; ninguna página de lista por encima de 4.000 px al entrar (hoy 19.914).
5. Con CPU ×4, «lista» en 2,5 s con `Fast 4G` y en 5,0 con `Slow 4G` en portada, plan, carrera y
   `Watch` (hoy de 4,75 a 5,70 con `Slow 4G`, mapa 05 §12), y CSS del arranque por debajo de 15 KB.
6. Sin red, los cuatro casos del mapa 05 §13 dan el estado de §8.3, ninguno en blanco ni en la barrera.

Y antes del primer invitado, la prueba del dueño en su teléfono que E2 dejó pendiente
(`implementacion.md` l. 1247-1256), con estos seis puntos como lista.

## 6. Los maillots

### 6.1 El vocabulario del maillot del equipo

A 13 px se lee el color dominante, una figura grande y la diferencia de luz entre los dos colores; una
raya de `stripes` mide 0,81 px y un panel 1,63 (mapa 03 §1.3). El vocabulario se queda con eso:

- **Seis figuras** en la rejilla de 48 u de `TORSO` (`Jersey.tsx` l. 10-11), recortadas al torso:
  `plain`; `band` (y de 23 a 31, 2,2 px a 13); `halves` (la mitad derecha desde x 24); `yoke`
  (hombros, mangas y pecho hasta y 21); `sash` (diagonal de 9,6 u, 2,6 px); `sleeves`. Fuera
  `stripes` y `panels`.
- **Quince colores** repartidos en luz. De base: negro `#1d1d1f`, marino `#1c2f5e`, azul `#2453c7`,
  celeste `#5ab4e5`, turquesa `#0b7d74`, verde `#1f5e2e`, lima `#a6c935`, naranja `#ee7a1a`, rojo
  `#c81e2d`, granate `#6e1a2b`, rosa `#e0559a`, morado `#5b2a86` y gris `#8b9097`. Solo de segundo:
  amarillo `#f4d21f` (el liso es del líder) y blanco (el cuerpo blanco es del campeón, §6.4).
- **Dos reglas**: el segundo color a 2:1 o más de la base (pasan 104 de 182 parejas), para que la
  figura se vea en grises; y ningún diseño a menos de ΔE00 10 de un líder o de una señal de campeón en
  las cuatro visiones, dibujado a 13 px (quita 17 de 622: las bandas de lima, naranja, rojo y
  turquesa, la lima lisa y con mangas, y el canesú celeste).

Quedan **605 diseños**, medidos a 13 px (media de ΔE00 por píxel sobre el torso, como en el mapa 03)
frente a los 910 de hoy (14 colores, 13 segundos y 5 patrones, `visuals.ts` l. 34-55):

| A 13 px                                                         | normal      | protanopía   | deuteranopía | tritanopía   | grises        |
| --------------------------------------------------------------- | ----------- | ------------ | ------------ | ------------ | ------------- |
| pares a menos de 10: hoy y propuesto                            | 3,4 y 1,2 % | 7,2 y 2,3 %  | 10,2 y 2,4 % | 8,6 y 1,7 %  | 61,3 y 12,2 % |
| pares a menos de 10 por pelotón de 22 sorteado: hoy y propuesto | 7,97 y 2,68 | 16,61 y 5,33 | 23,52 y 5,36 | 19,92 y 3,83 | 141,5 y 28,3  |

Sorteado, el pelotón sigue teniendo gemelos (1.842 de 2.000 en visión normal), así que el maillot del
NPC se **asigna**: el empaquetado voraz (mejor de 30 órdenes) da **95 diseños a 10 o más entre sí en
las cuatro visiones** (31 con los grises), y caben juntos los 34 de WorldTour y ProTeams.

### 6.2 La asignación y la semilla

La semilla no se toca: es la identidad del NPC y cambiarla crea un clon (mapa 03 §2.2). El dibujo va
en una columna nueva, `teams.jersey` (`jsonb` nula, `{ figure, base, second }`, migración con
drizzle-kit), y deja de derivarse (hoy un color más repinta 102 equipos, mapa 03 §2.3). Un asignador
puro (`assignJerseys`) reparte el conjunto empaquetado por ámbito: WorldTour con ProTeams (34) y los
continentales por continente (102 en Europa, 49 en Asia, 20 en América, 7 en Oceanía, 7 en África,
contados sobre `TEAM_DIST`, `world.ts` l. 46-131, con `continentForCountry`); Europa repite siete
diseños, en países distintos. Lo rellena un `backfill` y la génesis. El reparto de E2 sigue grabando
`jerseySeed` (`cast.ts` l. 146-154) y `serveCast` añade `jersey` al servir.

### 6.3 El editor

```text
(pantalla · /team/identity · 360 px; hoy, doce semillas, captura 16)
Team jersey                    [13 px] [28 px] [72 px]   la vista a los tres tamaños
Figure        (Plain)(Band)(Halves)(Yoke)(Sash)(Sleeves)  segmented de 44 px
Main colour   13 muestras de 44 px · Second colour  15, apagadas las de menos de 2:1
In your division   tu maillot entre los 33 de tu ámbito, a 13 px
Clear of every team in your division in all four colour visions.        [Save jersey]
```

`PUT /api/teams/me/jersey` (Zod `.strict()`, tres enumerados) valida con `jerseyClash`, un puerto a
TypeScript del rasterizador a 13 px, de Machado y de CIEDE2000, frente a su ámbito, los líderes y las
señales. Errores (pantalla): `Too close to Noord Cycling at small size (protanopia).`, `Too close to a
leader's jersey.` y `These two colours are too close in brightness: the figure would vanish in grey.`
Con vocabulario cerrado no hay nada que moderar; a E9 le queda `teams.jersey_changed_at`.

### 6.4 La señal de campeón

A 13 px el color se pierde y la forma queda: la señal es **la estrella del juego** (el logotipo es una
bici con estrella, `Logo.tsx` l. 29-35), que ningún equipo ni líder puede llevar, sobre un cuerpo
blanco que ningún equipo lleva. **Nacional**, de línea o de crono, cada una en su disciplina
(`wearableTitles`, `jerseys.ts` l. 271-275): cuerpo blanco, estrella `#0b2740` de 16,8 u (4,55 px a
13, 5,6 a 16, 9,8 a 28 y 25,2 a 72), filete de líder y la bandera al lado desde 16 px (`Jersey.tsx`
l. 165), y a 72 px también en cuello y puños: es el `ChampionMark` de E2 (7-h), que el dueño ya ha
visto en `Watch`, hecho definitivo. **Mundial** (para E12): estrella y cuello en `#a87300` (4,10:1
contra blanco) y filete marino de 2 u. A 13 px (a 16 y 28, igual o mejor):

| A 13 px                                                           | normal      | protanopía | deuteranopía | tritanopía | grises     |
| ----------------------------------------------------------------- | ----------- | ---------- | ------------ | ---------- | ---------- |
| nacional: diseño más cercano de los 605                           | 12,0        | 11,9       | 12,1         | 12,1       | 10,7       |
| mundial: diseño más cercano                                       | 16,2        | 16,3       | 15,8         | 15,5       | 10,6       |
| nacional frente a mundial                                         | 12,9        | 12,6       | 13,1         | 12,4       | 9,2        |
| la marca de la UCI (V0 del mapa 03) frente a nacional y a mundial | 11,2 y 15,1 |            |              |            | 7,4 y 10,9 |

El líder más cercano queda a 24,9 de la nacional y a 17,4 de la mundial en la peor visión. **No es
el arcoíris ni se le parece**: la marca son cinco bandas horizontales azul, rojo, negro, amarillo y
verde, y la guía cubre vertical, diagonal y orden (`00-encargo.md` §7.1); la estrella no tiene bandas,
ni esos colores, ni esa disposición. El 11,2 hasta V0 es distancia visual («blanco con algo oscuro en
el pecho», como el `ChampionMark` de hoy, a 12,2), no jurídica. Las variantes del dueño, en §15.

### 6.5 Los líderes, el dorsal y el patrocinador

Los tres líderes conservan su dibujo (`Jersey.tsx` l. 73-86) y su figura queda **reservada** por la
regla de §6.1: ningún diseño a menos de 10 en las cuatro visiones (en grises siguen cerca 25 diseños
del amarillo, 76 del verde y 6 del azul, medido sobre los 605). **El dorsal del equipo líder no
vuelve** (§15, decisión 5): el dueño lo quitó porque a 15 px se leía «Ill» ([DUEÑO 5]), en la
clasificación por equipos el líder ya es la fila 1 y `leaderJerseys.test.tsx` l. 81-88 sella su
ausencia; E3 corrige los seis pasajes que lo dan por pintado (mapa 04, contradicción 1). **Para E8**,
tres zonas: el color (de los 15 y pasando §6.3; si choca, baja a segundo o no se vende), la marca (en
la banda o el canesú, `meta` 600, solo a 28 px o más) y el nombre del equipo; la marca es texto y la
modera E9 con el `name_status` de los nombres (`schema.ts` l. 260). Dato: `teams.jersey.sponsor?`.

### 6.6 El contrato `WornJerseyIcon`

`WornJerseyIcon({ worn, team, size })`, el que dejó E2 (`docs/retransmision.md` l. 5210; hoy recibe
`{ card, size }`, `WornJerseyIcon.tsx` l. 12-18): el único que elige dibujo (líder, campeón, equipo),
con `role="img"`, `aria-label` y `<title>` de `championTitleText` (`World champion`); 13 px mínimo.

## 7. El examen práctico: el cuadro de entrenamiento y el viaje

### 7.1 Las preguntas, en el orden en que se leen

(1) ¿Cómo llego a mis próximas carreras? Es la respuesta, `data-answer`. (2) ¿Qué hago cada día y
quién lo ha decidido? (3) ¿Cómo lo cambio y qué cambia? (4) ¿Y un día concreto? Plegado, porque el
dueño pidió «que permita ver y editar los próximos 28 días, no solo 1 semana» ([DUEÑO 11],
`Training.tsx` l. 30-31). El modo y el estado del plan son lo permanente, en la línea de estado.

### 7.2 La primera pantalla

Prototipo medido (`proto/training.html`): la primera llegada ocupa de 228 a 367 px, las dos carreras
acaban a 497 y la semana 1 cabe antes de la barra inferior; ningún texto baja de 12 px; sin desborde.

```text
(pantalla · /me/training · 360 px · el jugador del mapa 05, día 50; llegadas de hoy, captura 01)
★ Cycling Star            Day 50 · 4h 56m            Account
Profile   Training   Race orders   My races
Training
Mixed · your plan runs Day 51 to Day 78                     ← línea de estado
┌ Your next races ──────────────────────────────────────┐
│ Race Var .1 · one day                                  │  RaceTag, data-answer
│ Day 52 · in 2 days · travel Day 51 and Day 53          │
│ ▁▁▁▁ ████ ▁▁▁▁ ▁▁▁▁ ▁▁▁▁                                │  BandScale
│ Cooked [Loaded] Fine  Spot on  Rusty      best: Spot on│
│ Carrying fatigue. A lighter week before would help.    │
│ Race Sardegna .1 · 5 stages                            │
│ Day 56 to 60 · in 6 days · travel Day 55 and Day 61    │
│ ▁▁▁▁ ████ ▁▁▁▁ ▁▁▁▁ ▁▁▁▁   Cooked [Loaded] Fine …     │
│ Carrying fatigue. A lighter week before would help.    │
└────────────────────────────────────────────────────────┘
```

Una fila por carrera, con la llegada a **su primer día del horizonte**, la única de fiar (mapa 02 §3);
en curso, `Racing now · stage 3 of 5`, sin escala. Frases (pantalla): `Too tired to race well. Rest
more in the days before.` (`Cooked`), `Carrying fatigue. A lighter week before would help.`, `A little
tired. Close to your best.`, `Your best window. Keep the plan.` y `Too rested: short of racing rhythm.
Train more before it.` (`Rusty`). Palabras y cortes se quedan (`projection.ts` l. 75-81; §15, decisión
6). **El tramo es la posición marcada**: la API manda el código y nada más fino, que resuelve la
tensión 23 del mapa 04 sin romper la frontera. Sin carreras, el `EmptyState` de `PlanLadder.tsx` l. 237.

### 7.3 El mes: las semanas del plan, con sus fechas y sus días

```text
┌ Your month ──────────────── ( Coach decides | Mixed | I decide ) ┐
│ Mixed: your blocks and your edits win; what you leave alone goes │
│ to your team plan, then to your coach.                           │
│ Week 1 · Day 51 to 57 · 1 training day               [Build    ▾]│
│ ✈51  R52  ✈53  ▮▮▯▯54  ✈55  R56  R57                             │  7 celdas de 40 px
│ Week 2 · Day 58 to 64 · 3 training days              [Specific ▾]│
│ R58  R59  R60  ✈61  ▯▯▯▯62  ▮▮▮▯63  ▮▮▮▯64                       │
│ Week 3 · Day 65 to 71 · 7 training days              [Taper    ▾]│
│ Emphasis [My strength ▾]   Intensity [Normal ▾]                  │
└──────────────────────────────────────────────────────────────────┘
```

Cada semana es **la del plan guardado, con sus fechas** desde `plan.startDay`, que ya viaja y nadie
usaba (mapa 02 §8). `R` es la celda de carrera (`warn`, con `Race` escrito), `✈` el icono `travel`
(`info`) y el entrenamiento lleva su `SegmentMeter`: se ve sin abrir nada que la semana 1 tiene un
solo día de entrenamiento. Tocar un bloque recalcula las llegadas sin guardar y saca la `SaveBar` con
el efecto (`Race Sardegna: Fine → Spot on`). Guardar conserva el `startDay` del plan vivo; empezar de
cero es `Start a new plan tomorrow`; tras el plan, `After your plan · Day 79 to 83 · Coach`.

### 7.4 El día a día, con el origen de cada día

```text
┌ Day by day ────────────────────────────────────── [Hide] ┐
│ Mixed: what you write here beats your blocks. Days you   │
│ leave alone follow your block, then your team plan, then │
│ your coach.                                              │
│ Week 1 · Day 51 to 57 · Build                            │
│ ✈ Race Var trip · Day 51 to 53 · no training             │  TripRow
│   Day 51 travel out · Day 52 race · Day 53 travel back   │
│ Day 54  [Build week]                        ▮▮▯▯ Steady  │
│   [Video & tactics      ▾] [Normal ▾]  Trains Tactics    │
│ ✈ Race Sardegna trip · Day 55 to 61 · no training        │
│ Day 62  [Your edit]  ↺ Back to Specific     ▯▯▯▯ Rest    │
│   [Full rest            ▾] [Normal ▾]                    │
└──────────────────────────────────────────────────────────┘
```

En `I decide`, la cabecera dice `Only what you write is trained. Days you leave alone, outside your
blocks, are active rest.` y esos días, `Active rest (empty)`. En `Coach decides`, `Your coach picks
every day from how you feel that morning. Blocks and day edits are not used.`, y el día a día es de
solo lectura (hoy se guarda para nada, mapa 02 §2). Cambiar una sesión vuelve el día `Your edit` con
`↺ Back to Build`, que borra la orden: la precedencia se ve donde se decide. La explicación larga de la
cadena es de E6 (agenda l. 1661).

### 7.5 Los tres defectos, los dos del viaje y lo que cambia debajo

| Defecto                                                                | En pantalla                                                                    | En la API y en `packages/db`                                                                                                                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A.3: la lista no dice de qué carrera habla y repite una fila por etapa | `RaceTag`, una fila por carrera                                                | `races[]` con nombre, país, clase, etapas, días y viaje; fuera `raceId: null` (`riders.ts` l. 477); `getRiderRaceSchedule` devuelve objetos, como `getRiderTravelDays`    |
| A.3: cinco etiquetas sueltas                                           | `BandScale` y su frase                                                         | `arrival` es solo el código; fuera `tsb`                                                                                                                                  |
| A.1 y A.2: la precedencia invisible y dos vocabularios                 | la línea del modo, semanas con fechas y el chip de origen                      | `days[]` con `source`, de la misma función que usa el tick; fuera `defaultCoachPlan` de la web (`trainingPlan.ts` l. 37), como pedía `docs/entrenamiento.md` l. 1287-1291 |
| §4.19: la vuelta y el precio en días                                   | `TripRow`, `travel Day 51 and Day 53`, la línea del viaje en `My races` (§7.6) | el dato ya está (26-9-2026); la vista previa deja de tratar el viaje como día de bloque                                                                                   |

Lo de debajo, sin tocar el motor:

1. **Una función de precedencia**, `resolveTrainingDay(ctx) → { choice, source }`, pura, en
   `shared/training.ts`: la cadena de `train.ts` l. 195-272 escrita una vez (carrera, viaje, modo
   `entrenador`, orden, bloque, plan de equipo solo en `mixto`, entrenador, hueco de `manual`), para el
   tick y la vista previa. Un diferencial prueba que el tick elige lo mismo que hoy para todos los
   corredores en 28 días de dos mundos: refactor sin cambio, sin `ENGINE_VERSION`.
2. **La vista previa proyecta lo que hará el tick**: modo, órdenes guardadas y sin guardar (el cuerpo
   gana `edits`), plan de equipo, viaje (15 TSS), el `startDay` del plan, el TSB del último diario el
   primer día (hoy 0, `riders.ts` l. 475-476), el entrenador con `coachPlan` y el TSB proyectado, y el
   día de carrera con la mediana de los diez últimos del corredor en `rider_daily_log`, la del mundo
   en 28 días o 150 (`PREVIEW_RACE_DAY_TSS`, estimado).
3. **Un solo plan vivo**: `setTrainingPlan` (`db/training.ts` l. 196-227) borra en su transacción los
   planes a menos de 28 días del nuevo; `getPlanForDay` (l. 248) y el tick ordenan por `start_day`
   descendente; `PUT /plan` acepta el `startDay` del plan vivo (hoy fuerza mañana, l. 413).
4. **La portada habla del plan** (`dashboard.ts` l. 77-91 mira el plan y el modo, no solo las órdenes):
   `Your plan ends on Day 78` con `Plan the next weeks`.

```text
planPreviewResponseSchema (sustituye a contracts.ts l. 223-235), todo .strict():
  races[]: raceKey, raceName, country|null, raceClass, stageCount, firstDay, lastDay, ongoing,
           arrival: arrivalLabel|null, travelOut: int[], travelBack: int[]
  days[]:  gameDay, kind: race|travel|train, source: race|travel|order|block|team|coach|empty,
           session|null, intensity|null, load: int 0..4, raceKey|null
  sin ctl, atl, tsb, tss ni totalTss
```

### 7.6 El viaje donde se decide

```text
(pantalla · My races · Upcoming · 360 px; hoy sin viaje, captura 02)
Race Var .1 · one day                      #214
Day 52 · in 2 days                         Set orders
✈ Day 51 out, Day 53 back · paid 48
(pantalla · Race calendar del mánager · 360 px · RowList; hoy recortada, captura 15)
Day 59 · Race Ardèche .Pro                                   [ Add ]
336 · 2 travel days (1 out, 1 back)
```

`On your programme` gana la línea del viaje: los días, de `getRiderTravelDays`; el dinero, del
movimiento `travel` del libro, que hoy solo enseña `Finances` (captura 27). Un solo icono de viaje
(hoy dos `✈`, `Training.tsx` l. 227 y `TeamCalendar.tsx` l. 94). **Lo que no arregla E3**: `sinRitmo`,
el rango de ganancia y el objetivo D1 (`docs/entrenamiento.md` l. 1119-1148) son del entrenamiento, y
`BandScale` les deja sitio (`· no race rhythm`, pantalla); que el entrenador no afine antes de correr
(`daysToNextRace: null`, `train.ts` l. 256) es del motor, y E3 lo enseña como es.

## 8. La web instalable

### 8.1 Manifiesto e iconos

`apps/web/public/manifest.webmanifest`, enlazado en `index.html` junto a `theme-color` `#123a5c`:
`id` y `scope` `/`, `name` y `short_name` `Cycling Star`, `description` `A persistent cycling world:
train your rider, race a season, watch every stage.`, `start_url` `/`, `display` `standalone`, `lang`
`en`, `background_color` `#eef2f6`, `theme_color` `#123a5c`, `categories` `games` y `sports`, iconos de
192 y 512 (`any`) y de 512 `maskable` (el dibujo en el 80 % central). Iconos: la bici en blanco
(11,76:1) y la estrella en `gold-light` (6,31:1) sobre marino, recoloreados del logotipo (hoy índigo
de v3, mapa 01 §6), más `apple-touch-icon` de 180 px y el `favicon.svg`: el logotipo no tiene dueño
(mapa 04, contradicción 12) y E3 recolorea, no rediseña.

### 8.2 El trabajador de servicio

A mano en `apps/web/public/sw.js` (unas 120 líneas, estimado), con un plugin de Vite de unas 30 que le
inyecta la lista de `assets/`; sin Workbox. **Guarda** el armazón (`index.html` como `/`), los trozos
de `assets/` (con huella, que la API ya sirve inmutables un año, `app.ts` l. 125-144), los iconos y las
banderas; navegación con red primero, 3 s de espera y el armazón de reserva; `assets/`, caché primero.
**No guarda nunca** `/api/*` ni `/health`: la API de E2 sirve según lo que ha visto cada jugador
(`spoiler.ts` l. 63-70), y una respuesta guardada enseñaría a otra sesión del aparato lo que tiene
velado; tampoco se persiste la caché de React Query. **Una versión nueva** espera y la web enseña el
`Notice` `A new version is ready.` con `Reload`; nunca recarga sola, y nunca con `Watch` en marcha.

### 8.3 Sin red, iPhone, Android y la medida

Mapa 05 §13: el trozo no cargado (48) ya está guardado y da su `OfflineState`; recargar (49) sirve el
armazón con `You're offline.`; la visitada (50) enseña lo que tenía con `You're offline. Showing what
you saw at 14:02.`; los datos sin pedir (51), `OfflineState`. La barrera de `main.tsx` l. 22-30 queda
para los fallos de pintado y cada página gana la suya, con cabecera y barra. **iPhone**: desde iOS 26
toda web de la pantalla de inicio se abre como app (mapa 05 §14); bastan `apple-touch-icon`,
`apple-mobile-web-app-title` y `viewport-fit=cover` con el área segura arriba (la de abajo ya está,
`BottomNav.tsx` l. 44), y en `/account`, `Add to Home Screen: tap Share, then Add to Home Screen.`
(pantalla). **Android**: la sugerencia de instalar, un `Notice` en la tercera visita. El aviso al
teléfono es de E4. **La medida que revisa la app nativa**: `app_open { standalone, width, platform }`
y `ready_ms`, eventos propios sin terceros; a los 90 días con 200 jugadores activos a la semana, si más
de la mitad de las sesiones son de teléfono y falla un umbral de §5.4, o la retención a 30 días del
teléfono queda 15 puntos bajo la de escritorio, se reabre (agenda §4.15.1). Recogerlos es una tarea
sin hacer (`docs/encargos.md` l. 741-742).

## 9. La regla de la frontera

**La regla.** Una respuesta de la API lleva lo que alguna pantalla enseña y nada más, con la resolución
con que la pantalla lo enseña: si la pantalla convierte un valor en estrellas, tramo, barra de 0 a 100
o frase, el servidor manda la estrella, el tramo, el entero o el código, nunca el valor del que salen.
Excepciones cerradas: los identificadores (`id`, `raceKey`, semillas) y lo que la web necesita para
pedir otra cosa. Lo que hoy viaja sin pantalla va en una lista con su motivo y su PR de salida, y la
lista solo encoge. **El mecanismo**, cuatro piezas:

1. **Contrato por ruta**: el registro de E2 (`registerSpoilerGuard`, `spoiler.ts` l. 155-183) ya
   exige `spoiler` y `veil` al arrancar y gana `response`, el esquema de la respuesta; en los tests y
   en desarrollo, la respuesta se valida `.strict()` antes de salir (habría cazado las seis claves de
   más de `teams/:id/news`, mapa 02 §8).
2. **Todo campo se lee**: `frontera.test.ts` recorre con el AST las hojas de cada esquema de respuesta
   y exige que algo de `apps/web/src` las lea o que estén en `FRONTERA_SIN_LECTOR` con su motivo: es
   `columnasVivas.test.ts` al revés (mapa 02 §9).
3. **La resolución en el tipo**: estrellas `z.number().multipleOf(0.5).min(0).max(5)`, barras
   `z.number().int().min(0).max(100)`, tramos y flechas enumerados: un `63.4172` no pasa el contrato.
4. **El canario** de B1a (`spoilerCanary.test.ts` l. 20-51, `spoilerWorld.ts` l. 327-351) gana
   testigos en `rider_attrs` (63,4172), en el diario (`ctl` 61,98765) y en la moral (57,31415), y
   barre también la vista previa, que es POST (hoy solo GET, l. 334).

| Lo que viaja hoy sin pantalla (mapa 02 §8)                                                 | Arreglo                                                                                                                                                                            | PR  |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `GET /api/riders/:id` y `/me`, `attributes` con decimales                                  | `stars` en medias para todos; `mark` (0 a 3) solo el propio (SPEC §3.2, l. 80-82); los cerillos, contados en el servidor (`matches`; hoy en la web, `RiderProfile.tsx` l. 213-225) | 9   |
| vista previa: `arrivals[].tsb`; `days[]` con `ctl`, `atl`, `tsb`, `tss`                    | `arrival` y `load` (§7.5)                                                                                                                                                          | 4   |
| `/me/form`: `log[]` con `ctl`, `atl`, `tsb`                                                | `{ gameDay, fitness, freshness }` de 0 a 100 (`conditionBars`, `condition.ts` l. 40-42, al servidor)                                                                               | 9   |
| `/me/trend`, `delta28`; `/me/summary`, `morale` con decimales                              | `arrow` de cinco códigos; moral entera                                                                                                                                             | 9   |
| `coach-view` `facilities` y `season`; `fame` en cuatro rutas; `goalRaceId` en la respuesta | fuera hasta que una pantalla los enseñe                                                                                                                                            | 9   |
| `teams/:id/news`, seis claves de más                                                       | fuera, con `.strict()`                                                                                                                                                             | 3   |
| `plan.startDay`, `upcoming-races.startGameDay`                                             | se quedan: ahora se enseñan como fechas                                                                                                                                            | 4   |

**Con lo que E2 construyó para el destripe**: el horizonte decide CUÁNDO se puede servir un dato y la
frontera, CON QUÉ RESOLUCIÓN; viven en el mismo registro y en el mismo canario.

## 10. Lo que E2 dejó a E3

**Se queda** lo que E2 fijó como información (`docs/retransmision.md` §6, §7.1, §7.9): orden,
contenido y textos, lo permanente y lo eventual, la fila de 32 px, los maillots de 13 y 14 px, los
`aria-live` y el resumen de §18.8. **Cambia el aspecto**: capa fija en `broadcast` con `text-overlay`
tabular y segunda línea en `broadcast-ink-2` (8,83:1); rótulo en `cue` (7,92; hoy `red-700`, 6,42);
perfil con cotas de 12 px y sus hexadecimales de v3 (`ProfileStrip.tsx` l. 63-139) en tokens; barra
con el vocabulario y la estrella de §6; la previa y el cierre (`StagePreviewCards`, `StageClosingCards`)
en `broadcast` con `Watch` como único `primary`; cabecera de etapa compacta (§5.2); en `Highlights` y el
`digest` de la portada, un solo `primary` por carrera y el resto `secondary` o `quiet` (hoy Race Jaén
lleva dos cian, `Watch the race in 2 minutes` y `Watch`, captura 17); `Report` con `DataTable` y el
relato en `body`. Y se vuelve a pedir a E6 `useHideBottomNav` (§18.6): sin él, la barra tapa el
comentario (captura 09).

## 11. Constantes y tokens

Los tokens son los de §3; las constantes visuales, en `apps/web/src/design/constants.ts`, salvo las que
calcula el servidor.

| Constante                                                                    | Valor                             | Intención                                                                  | Dónde                    |
| ---------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------- | ------------------------ |
| `TOP_ROWS`                                                                   | 20                                | la convención de `docs/navegacion.md` §7.3, en todas las tablas            | web (hoy `ShowAll.tsx`)  |
| `ANSWER_MAX_TOP_PX`, `MIN_FONT_PX`, `MIN_TARGET_PX`                          | 600, 12, 44                       | la respuesta en la primera pantalla; letra y objetivo mínimos              | banco y tests de marcado |
| `ROW_PX`, `ROW_DENSE_PX`                                                     | 44, 36                            | fila interactiva y de dato                                                 | web                      |
| `ARRIVAL_BANDS`, `ARRIVAL_BEST`                                              | `fundido` a `oxidado`; `perfecto` | el orden de cansado a descansado; el tramo con `best`                      | web                      |
| `LOAD_STEPS_TSS`                                                             | 0, 25, 80, 110                    | de `Rest` a `Very hard` sobre el catálogo (`shared/training.ts` l. 53-154) | shared                   |
| `PREVIEW_RACE_DAY_TSS`                                                       | 150                               | día de carrera sin historial (estimado)                                    | API                      |
| `JERSEY_CHECK_PX`, `JERSEY_MIN_DE`, `JERSEY_MIN_RATIO`, `JERSEY_CHANGE_DAYS` | 13, 10, 2,0, 7                    | la validación del maillot; días de juego entre dos cambios                 | shared; el último, API   |
| `SW_NAV_TIMEOUT_MS`, `INSTALL_HINT_VISIT`                                    | 3000, 3                           | la espera antes del armazón; la visita de la sugerencia                    | `sw.js`, web             |

## 12. Tests y bancos

| Qué                                                                                                | Umbral                                                                                                                                                       | Dónde y coste                              |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `tokens.test.ts`: cada par declarado en `index.css`                                                | texto 4,5:1; componente 3:1                                                                                                                                  | CI, menos de 1 s                           |
| `noRawPalette.test.ts`: ninguna clase `slate-`, `indigo-`, `amber-` ni hexadecimal fuera de tokens | lista de excepciones que solo encoge                                                                                                                         | CI, 1 s                                    |
| marcado (`renderToStaticMarkup`, como los 17 de hoy)                                               | `BandScale` con un tramo encendido; chip de origen por modo; `TripRow`; fila propia                                                                          | CI                                         |
| `resolveTrainingDay.test.ts` y el diferencial del tick                                             | la tabla de modos por orígenes; el tick idéntico en 28 días de dos mundos                                                                                    | CI; el mundo grande, a mano (15 min)       |
| vista previa y planes                                                                              | `entrenador` distinto de `mixto`; viaje a 15 TSS; primer día con el TSB del diario; una fila por carrera con nombre; sin `tsb`; dos guardados dejan una fila | CI (PGlite, como `planPorBloques.test.ts`) |
| frontera                                                                                           | cero campos sin lector fuera de la lista; ningún testigo en ninguna respuesta                                                                                | CI                                         |
| `jerseyClash.test.ts` y el asignador                                                               | los 605 pasan y los 17 no; señales a 10 o más; las 310 carreras del banco del mapa 03 sin pares por debajo de 10 en las cuatro visiones                      | CI; el de pelotones, a mano (3 min)        |
| banco del teléfono                                                                                 | los seis umbrales de §5.4                                                                                                                                    | a mano antes de fusionar, unos 20 min      |

Se re-sellan los seis tests con clases literales (mapa 01 §9), `leaderJerseys.test.tsx` en lo que
dibuja (su aserción del dorsal sigue) y `stageTables.test.tsx`.

## 13. Plan por pasos, tests primero

| PR  | Qué                                                                                                             | Tests antes                                                | Depende | Coste |
| --- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------- | ----- |
| 0   | banco visual: los guiones del mapa 05 en `scripts/visual/`; `data-answer` en las ocho páginas                   | el banco da la línea base de hoy                           | nada    | S     |
| 1   | tokens en `@theme`, sin usarlos                                                                                 | `tokens.test.ts`                                           | 0       | S     |
| 2   | frontera, el mecanismo, con la lista de hoy                                                                     | `.strict()`, `frontera.test.ts`, canario con POST          | nada    | M     |
| 3   | primitivas de §4.1; `Panel` y `SectionBar` se reimplementan encima y todo el juego gana el contraste de golpe   | marcado de cada estado; `noRawPalette`                     | 1       | M     |
| 4   | examen I, API y `packages/db`: `resolveTrainingDay`, tick refactorizado, vista previa nueva, un plan vivo       | diferencial, vista previa, dos guardados                   | 2       | M     |
| 5   | examen II, web: el cuadro de §7, fuera `defaultCoachPlan`, la portada habla del plan                            | marcado; banco: respuesta por encima de 600 px             | 3 y 4   | M     |
| 6   | el viaje y las fechas: `On your programme`, `GameDate` en todo el juego, `RowList` en el calendario             | banco sin tablas recortadas                                | 3       | S     |
| 7   | `DataTable` en las 15 tablas, un formato de tiempo                                                              | fila propia, DNF, alturas                                  | 3       | M     |
| 8   | banderas fuera de la CSS                                                                                        | CSS del arranque por debajo de 15 KB                       | nada    | S     |
| 9   | frontera II: estrellas, marca, cerillos, barras, flechas y moral desde el servidor                              | canario con los testigos nuevos; lista vacía               | 2       | M     |
| 10  | web instalable: manifiesto, iconos, `sw.js`, estados sin red, aviso de versión, eventos                         | banco sin red; instalable en Chromium                      | 3       | M     |
| 11  | maillots I: vocabulario, `teams.jersey`, asignador y `backfill`, líderes reservados, estrella, `WornJerseyIcon` | `jerseyClash.test.ts`; asignador sobre los pelotones       | nada    | M     |
| 12  | maillots II: el editor y su validación                                                                          | un error del servidor por caso                             | 11      | M     |
| 13  | `Watch` y la etapa (§10)                                                                                        | los seis tests re-sellados; capa fija por encima de 200 px | 3 y 11  | S     |
| 14  | la cola larga sobre el catálogo; `noRawPalette` sin excepciones                                                 | `noRawPalette` a cero                                      | 3       | L     |

S, un día de agente; M, dos o tres; L, varios (estimado). Todo paso deja el juego desplegable: 0, 1 y
2 no cambian nada visible, 3 arregla el contraste de todo, 4 y 5 cierran el examen.

## 14. Riesgos y fronteras

- **Riesgos**: que el refactor del tick cambie una elección (lo para el diferencial: si cambia, el 4
  no entra); que el maillot nuevo repinte los 219 equipos y las etapas viejas (una noticia lo
  anuncia); que el trabajador sirva un armazón viejo (`index.html` va `no-cache` y la versión nueva
  avisa); que las banderas sumen peticiones (133 ficheros de 1 a 2 KB con `lazy`, estimado; `assets/`
  ya no cuenta para el límite por IP, `app.ts` l. 125-133).
- **E2**: `WornJerseyIcon`, el horizonte (el trabajador no guarda la API) y el aspecto de `Watch`, sin
  tocar su información. **E4**: el `push`, sobre el trabajador de E3. **E6**: dónde vive la
  explicación de la precedencia, `useHideBottomNav` y los rótulos de la barra. **E8**: las zonas de
  §6.5; el precio es suyo. **E9**: el nombre del patrocinador; el vocabulario cerrado no se modera.
  **E10**: los textos crecen al traducirse (sin medir): las filas truncan con `…` y la escala admite
  dos renglones. **E12**: la señal del Mundial queda dibujada; título, tabla y carrera son suyos.

## 15. Decisiones que son del dueño

**1. La paleta.** **(a) Manager sobrio, por defecto** (§3.1): cabecera marina, secciones blancas con
banda `#e8f0f5` y título marino (10,20:1), acción `#0b6e88` (5,83), dorado de acento. **(b) Manager de
hoy, accesible**: barras de color, oscuras (título de sección blanco sobre `#0b6e88`, 5,83; de página
`#0b2740` sobre `#d99400`, 5,94): el aire de PR #105, con más ruido. **(c) Retransmisión**: secciones
con título blanco sobre `#123a5c` (11,76) y filete dorado de 3 px. Elegir (b) o (c) cambia dos tokens.

**2. La tipografía.** **(a) La del sistema, por defecto**: 0 KB, la más rápida en el teléfono, cada
aparato la suya. **(b) Inter** variable desde `apps/web/public/fonts/` (unos 50 KB con gzip en latín,
estimado): la misma letra en todo aparato. **(c) Barlow Semi Condensed** para títulos, cifras y `Watch`
(unos 25 KB por peso, estimado): más caracteres por fila y aire de tele. OFL, sin serifa (SPEC §8).

**3. La señal de campeón.** **(a) La estrella, por defecto** (§6.4). **(b) El arcoíris diferente del
dueño, en su versión más fuerte**: otros colores (oro `#e8b400`, cian `#35bdda` y blanco), otra
disposición (tres arcos concéntricos de 2,5 u en el pecho en lugar de bandas rectas) y otro fondo
(marino `#0b2740`), para el Mundial, con la estrella nacional de (a). A 13 px queda a 54,9 de V0 en
visión normal y 49,1 en grises, la más lejana de la marca; pero un diseño queda a 9,8 en tritanopía y
25 bajan de 10 en grises (su cuerpo oscuro se parece a los equipos oscuros), y cada arco mide 0,7 px.
Las demás variantes del dueño, con los cuatro criterios (medidas del mapa 03 §7.2):

| Variante                                      | Distancia a la marca                      | Forma a 16, 28 y 72 px                                               | Daltonismo                                       | Reservada                              |
| --------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------- |
| los cinco colores en otro orden, horizontales | dentro: «No other order will be approved» | bandas de 0,67 px a 16 que se funden; legibles a 72                  | a 5,6 de V0 en grises a 13 px                    | no: 94 equipos con bandas horizontales |
| en vertical                                   | dentro: la guía regula la vertical        | igual                                                                | a 11,5 en grises                                 | no: 45 equipos con paneles             |
| otros colores, horizontales sobre blanco      | cerca: es la disposición de la UCI        | igual                                                                | a 8,1 de V0 a 13 px, más cerca que el otro orden | no                                     |
| los de la UCI sobre otro fondo                | dentro: los colores son la marca          | igual                                                                | sobre dorado, 98 equipos a menos de 10 en grises | no                                     |
| arcos de otros colores sobre marino, la (b)   | lejos en color, disposición y fondo       | los tres arcos juntos miden 2,5 px a 16 y 11,3 a 72: una curva clara | ver arriba                                       | sí: ningún equipo lleva arcos          |

Con (a) el cuerpo blanco queda reservado a los campeones; con (b) se libera para los equipos y el
marino con arcos queda reservado.

**4. El vocabulario del maillot.** **(a) Seis figuras, por defecto** (§6.1): 605 diseños; 95
separados en las cuatro visiones y 31 con grises. **(b) Cinco, sin `sash`**: 501 diseños, 72 y 26, más
cerca de hoy. **(c) Cuatro figuras (`plain`, `band`, `halves`, `sash`) y diez colores de base**: 262
diseños, 57 y 19; el editor más sencillo, que no separa los 34 de WorldTour y ProTeams en grises.

| Decisión                             | Por defecto, y por qué                                                                                                                      | Si elige otra cosa                                                                                                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5. El dorsal del equipo líder        | **no vuelve**: se leía «Ill» y el líder ya es la fila 1 (§6.5)                                                                              | vuelve amarillo y con su número, no con barras, solo en la ficha de etapa y a 16 px o más                                                                                                                                                 |
| 6. Palabras y cortes de la llegada   | **los de hoy** (+25, +5, −10, −30) con escala y frase: faltaba la escala, y `Stale` diría «pasado de vueltas» a quien está pasado de fresco | los del diseño (`Stale`, `Peaking`, `Fresh`, `Loaded`, `Buried`, en +18, +5, −10 y −35, `docs/entrenamiento.md` l. 1093-1099): se toca `arrivalLabel`, que vive en el motor aunque no mueva la carrera, y `projection.test.ts` l. 154-170 |
| 7. Un solo guardado para plan y días | **sí**, la `SaveBar`: un mes, un guardado                                                                                                   | dos `primary`, cada uno con su efecto debajo                                                                                                                                                                                              |
| 8. El TSS en pantalla                | **fuera**, la carga en cinco palabras ([DUEÑO 8])                                                                                           | vuelve en `meta` en el día a día, y entonces puede viajar                                                                                                                                                                                 |
| 9. Frescura y moral                  | **barra con su palabra**, sin cifra (SPEC §3.3, l. 85-90; MVP l. 114)                                                                       | `16 / 100` se queda y el entero viaja                                                                                                                                                                                                     |
| 10. Los maillots cambian una vez     | **sí**, con una noticia del mundo: es lo que compra la separación medida                                                                    | cada equipo pasa al diseño más parecido a su aspecto de hoy, con menos separación                                                                                                                                                         |
| 11. Cambiar de maillot               | **una vez cada siete días de juego**                                                                                                        | sin límite, un equipo puede cambiar de identidad cada día                                                                                                                                                                                 |
| 12. Modo oscuro                      | **no** en E3 (§3.1)                                                                                                                         | un PR de tokens bajo `prefers-color-scheme` con su tabla de contrastes, tras el PR 14                                                                                                                                                     |
