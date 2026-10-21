## 6. El teléfono: tablas, navegación, dedo y letra

Esta sección aplica los principios 2.1 a 2.5 a las piezas que más pesan en el teléfono: las tablas anchas, la navegación, los mínimos de dedo y letra, y lo que pasa con el teclado, de lado y en escritorio. Usa los componentes de §4 tal cual. Ninguna pantalla desborda hoy el documento (mapa 05 §2): lo que falla es lo recortado, la letra y el dedo (`01-fase-propuestas.md`, cambio 9).

### 6.1 Las tablas anchas, una por una

Ninguna tabla se desplaza de lado ni recorta, y todas pintan las 20 primeras con `Show all N` (pantalla; `TOP_ROWS` = 20; hoy lo cumplen 7 de 15, mapa 01 §5), con la fila propia anclada (§6.2). Cada columna lleva su `priority` (D-16; O-33): las `secondary` y las `optional` van en el segundo renglón de la identidad hasta que su ancho las devuelve a columna, a 640 y a 1.024 px (§4.5). El desplazamiento lateral con la primera columna fija que proponían `identidad` (§5) y `lectura` (§5.1) para el salón de la fama y la nación queda fuera: las dos caben en dos renglones.

| Tabla (hoy)                                                                                                                                      | Hoy a 360 px                                                                    | En el teléfono                                                                                                                                                                                                                                                                                                                                                     | Desde 640 (`secondary`)                                                                   | Desde 1.024 (`optional`)                                             | Filas                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| General, puntos y montaña de la carrera (`Race.tsx` l. 205 y 246), de la etapa (`StageReplay.tsx` l. 83 y 137) y llegada (`stageView.tsx` l. 88) | el equipo parte el nombre: filas de 49 a 85 px, el equipo a 2,63:1 (captura 05) | `RankTable`: puesto, identidad (`RiderLabel`: el dorsal, la bandera, el nombre y el maillot de 28 en el primer renglón; el equipo en el segundo) y `Time` (`+0:20`, `formatTime`) o `Pts`; la fila mide 56 px (estimado: 28, 20 y 4 arriba y abajo; telefono midió 49 y 67 px con el maillot de 16 en el segundo renglón y nombres de 22 y de 28 caracteres, §5.1) | `Team` (el nombre, que deja el segundo renglón); en la llegada, también `Bonus` (`−10 s`) | en la general, `Total` (`14:22:05`); en la llegada, `Sprint` y `KOM` | 20 y `Show all`; los DNF, al final y siempre a la vista (`stageView.tsx` l. 85) |
| Equipos (`TeamClassTable.tsx` l. 24)                                                                                                             | la bandera hace de equipo: tres banderas de Francia seguidas (captura 06)       | `RankTable`: puesto, el nombre del equipo seguido de su maillot de 28, en una fila de 44, y `Time`; en la de la etapa, `Chip` `Leads overall` en el líder de la acumulada (§9.8)                                                                                                                                                                                   | en la acumulada, `Stages` (las etapas puntuadas)                                          | ninguna                                                              | 20                                                                              |
| Ranking (`Rankings.tsx` l. 29)                                                                                                                   | el equipo toca los puntos (`Northwind Cycling Team178`)                         | `RankTable`: puesto, identidad con el equipo debajo y `Pts`, con sus 12 px de margen                                                                                                                                                                                                                                                                               | `Team`                                                                                    | ninguna                                                              | 20 (hoy 100)                                                                    |
| Salón de la fama (`HallOfFame.tsx` l. 92), 7 columnas                                                                                            | 520 px en 336 que se desplazan sin indicio (captura 24)                         | puesto, nombre y `Total`; en el segundo renglón, `2 overall · 4 stages · 0 mountains · 0 points` (pantalla), que parte de línea y no se corta                                                                                                                                                                                                                      | `Overall`, `Stages`                                                                       | `Mountains`, `Points`                                                | 20 (hoy 40)                                                                     |
| Nación (`Country.tsx` l. 48), 5 columnas                                                                                                         | `All-rounde` cortado (captura 23)                                               | identidad y `Pts`; en el segundo renglón, `Andes Ruta · Climber` (pantalla)                                                                                                                                                                                                                                                                                        | `Team`, `Type`                                                                            | ninguna (`fame` sale de la respuesta, D-55)                          | 20 (hoy todas)                                                                  |
| Movimientos (`Finances.tsx` l. 129)                                                                                                              | cuatro columnas en un `Panel` sin relleno (captura 27)                          | `RankTable` sin puesto: el concepto y el importe con signo (`−80`, `money`) en el primer renglón; el día (`Day 42`) en el segundo                                                                                                                                                                                                                                  | `Day`                                                                                     | `Kind`                                                               | 20 (hoy 60)                                                                     |
| Plantilla (`Team.tsx` l. 123; `TeamSquad.tsx`)                                                                                                   | `Josef Janse…` y un `Detail` aparte (captura 14)                                | `RankTable` sin puesto: la celda de identidad entera enlaza a la ficha; en el segundo renglón, el papel, los puntos y la salud en `Chip` si no está sano                                                                                                                                                                                                           | `Role`, `Pts`                                                                             | `Health`                                                             | todas                                                                           |
| Plan del mánager (`TeamCalendar.tsx` l. 197)                                                                                                     | **recortada**: sin `Add` ni `Drop` (captura 15)                                 | `ActionRow`: la carrera y su clase; `Day 59 · FR · Travel 336 · 2 days out, 2 back`; `Add` o `Drop` (`secondary`)                                                                                                                                                                                                                                                  | igual                                                                                     | dos columnas de filas (`lg:grid-cols-2`)                             | las 20 próximas y `Show all 85`                                                 |
| Inscribibles (`MyRaces.tsx` l. 340), 193 filas                                                                                                   | 19.914 px; el viaje, en cinco renglones (captura 03)                            | `ActionRow` con `Enter`; encima, un `Segmented` `All races` · `Affordable` (pantalla)                                                                                                                                                                                                                                                                              | igual                                                                                     | dos columnas de filas                                                | 20: unos 1.500 px (estimado por telefono)                                       |
| Programa (`MyRaces.tsx` l. 98)                                                                                                                   | sin el viaje (captura 02)                                                       | `ActionRow` con `Set orders`; en el segundo renglón, `Bib 214 · Day 51 out, Day 53 back · paid 48` con el icono `travel` (D-43)                                                                                                                                                                                                                                    | igual                                                                                     | igual                                                                | todas                                                                           |

`RankTable` sin puesto (movimientos y plantilla) es la misma tabla sin su primera columna: `rank` es opcional en sus props (decisión 6-c). Las listas que hacen de tabla sin estar en las diez (el índice de carreras, `RacesIndex.tsx`; las noticias, `News.tsx`; los 219 equipos y los 133 países de `/world/teams` y `/world/nations`) pasan al catálogo en el PR de la cola larga de su página, con `ActionRow` o `RankTable` y la misma regla de las 20 primeras; cómo se agrupan y en qué orden es de E6 (decisión 6-a). `RaceResults` (`Show last N`, `RaceResults.tsx` l. 128-137) pasa a `RankTable` con `TOP_ROWS`.

Tres de las diez, dibujadas a 360 px con los textos de pantalla (los nombres y las cifras, ilustrativos; `[k]` es el maillot de 28 px y `(BE)`, la bandera):

```text
(pantalla · Race Valencia, la general · 360 px)
┌ General classification ────────────────────────┐  Panel bleed; cabecera de 32 px
│ #   RIDER                                 TIME │
│ 1   #11 (BE) Sander Wouters [k]       14:22:05 │  fila de 56: dorsal, bandera, nombre, maillot
│              Noord Cycling                     │  segundo renglón: el equipo
│ 2   #23 (FR) Luc Martin [k]              +0:12 │  los demás, su diferencia (formatTime)
│              Mistral Racing                    │
│ (del 3 al 20)                                  │
│                       …                        │  fila de 24 px, aria-hidden
│▌34  #214 (ES) José Quintáns [k]          +9:02 │  la propia: barra own, fondo own-tint
│▌             Valencia Pro Team                 │
│                [ Show all 140 ]                │  ShowAllButton, 44
└────────────────────────────────────────────────┘
```

```text
(pantalla · Noord Cycling, el calendario del equipo · 360 px)
┌ Race plan ─────────────────────────────────────┐
│ Race Ardèche  .Pro                      ┌────┐ │  ActionRow, 64 px como mínimo
│ Day 59 · FR · Travel 336                │Add │ │  el botón, de 44 × 72
│ 2 days out, 2 back                      └────┘ │  el segundo renglón parte de línea
│ Race Opening Classic  .WT               ┌────┐ │
│ Day 59 · BE · Home race                 │Drop│ │
│                                         └────┘ │
│ (las 20 próximas)                              │
│                [ Show all 85 ]                 │
└────────────────────────────────────────────────┘
```

```text
(pantalla · el salón de la fama · 360 px)
┌ Hall of fame ──────────────────────────────────┐
│ #   RIDER                                TOTAL │
│ 1   (UA) Oleksandr Prykhodko [k]            12 │
│     2 overall · 4 stages · 0 mountains ·       │  el segundo renglón parte de línea
│     6 points                                   │  y no se corta: son cifras
└────────────────────────────────────────────────┘
```

### 6.2 La fila propia y el enlace del nombre

**La fila propia** (I-26): llevan fila propia las clasificaciones de la carrera y de la etapa, la llegada, la de equipos (el equipo del jugador), el ranking, la nación y el salón de la fama; no la llevan los movimientos, la plantilla ni las de `ActionRow`. Es propia la fila del corredor del jugador (`riderId`) o la de su equipo (`teamId`). Si está entre las 20, se marca donde está; si no, tras las 20 va una fila `…` y después la propia con su puesto de verdad (`34`), con la barra `own` de 3 px, el fondo `own-tint` (`ink` encima, 16,26), el nombre en 600 y `aria-current="true"`. Sin ella, el corredor del puesto 34 no sale, y `Show all 140` (pantalla) son unos 6.720 px de filas de 48 (estimado por `lectura`).

**El enlace del nombre** (O-28; X-18): la celda de identidad entera es el enlace, en bloque, con 44 px de alto como mínimo, y es el único de la fila. El prototipo de telefono (`proto/entrenamiento.html`) pasaba la prueba con cuatro enlaces de nombre de 185 a 208 × 20 px gracias a la excepción de espaciado de WCAG 2.5.8 (uso C1), que telefono §5.2 reservaba al enlace dentro de una frase; la comprobación 5 cuenta los enlaces de tabla como controles (§7.1), así que eso ya no pasa.

### 6.3 La navegación

D-17; O-30. Las tres piezas, con los componentes de §4.4:

- **`AppHeader`**, de 48 más el área segura de arriba: el logotipo, `Cycling Star` (se esconde por debajo de 340 px), el reloj del mundo en `meta` `on-navy-2` (`Day 50 · S1 · 4h 56m`, pantalla; 8,15:1), que hoy no sale en el teléfono (`Header.tsx` l. 122; mapa 04, contradicción 5), y `Account` en 44 × 44. Desde 640 la navegación de nivel 1 vuelve a la cabecera, como hoy (`Header.tsx` l. 157-171), en `Tabs` `nav`.
- **`Tabs` de nivel 2**, de 44, con el desvanecido de 24 px mientras haya más y la activa centrada al entrar: hoy, en `My Rider`, `Contract` y `Finances` quedan fuera de los 360 px sin ningún indicio (mapa 05 §9).
- **`BottomNav`**, con el icono de 24 en su pastilla de 56 × 28 y el rótulo en `caption` 600 debajo, con los mismos rótulos que en escritorio (`Dashboard`, `My Rider`, `My Team`, `World`, `News`, pantalla), como pide `docs/navegacion.md` l. 266-267 frente al `truncate` de hoy (`BottomNav.tsx` l. 59; mapa 04, contradicción 6). Con cinco destinos, `Dashboard` medía 62 px en una celda de 72 a 360 y de 64 a 320 (telefono §5.2), pero medido con Inter y no con la letra del sistema (O-30). **El plan B**: el PR del paso 11 corre la comprobación 2 a 320 px con la letra del CI, y si encuentra un rótulo cortado, por debajo de 340 px los rótulos pasan a `Home`, `Rider`, `Team`, `World` y `News` (pantalla), en el mismo PR y avisando a E6, con quien se comparte la decisión. Cada destino lleva `label` y `shortLabel`; la `<nav>` es `@container`, el rótulo largo lleva `@max-[21.25rem]:hidden` y el corto `hidden @max-[21.25rem]:inline`. En `Watch`, la barra se esconde mientras corre la carrera solo si E6 acepta `useHideBottomNav` (DD-13; `docs/retransmision.md` §18.6).

```text
(pantalla · el marco a 360 × 800 · /me/training)
┌────────────────────────────────────────────────┐
│ [logo] Cycling Star   Day 50 · S1 · 4h 56m [o] │  AppHeader, 48 más el área segura; [o], Account
│ Profile  Training  Race orders  My rac░░       │  Tabs nav, 44; desvanecido de 24 px
│ Training                                       │  PageHeader: el h1 en page
│ Mixed · your plan runs Day 51 to Day 78        │  la línea de estado, en meta ink-2
│ ┌ How you'll arrive ───────────────────────┐   │  Panel con data-answer, a menos de 520
│ │ …                                        │   │
│                                                │
│ Race Var: Fine (was Loaded)     [ Save plan ]  │  ActionBar, 60, sobre la BottomNav
│  [home]   [rider]   [team]   [world]  [news]   │  BottomNav, 56 más el área segura
│ Dashboard My Rider  My Team   World    News    │  el rótulo en caption 600
└────────────────────────────────────────────────┘
  por debajo de 340 px, si la comprobación 2 lo pide: Home · Rider · Team · World · News
```

Toda pantalla de segundo nivel lleva el enlace de vuelta del `PageHeader`, porque instalada en iPhone no hay barra del navegador.

### 6.4 Dedo, letra y cortes

- **El dedo**: todo objetivo mide 44 × 44 (`MIN_TARGET_PX` = 44), salvo un enlace dentro de una frase, que vale con 24 × 24 o con 24 px libres alrededor (`MIN_INLINE_TARGET_PX` = 24; WCAG 2.5.8). Un enlace de tabla, una pestaña o un destino no son enlaces de frase.
- **La letra**: 12 px como mínimo en todo nodo de texto, también dentro de un SVG (`MIN_FONT_PX` = 12), y 16 en todo campo (`MIN_FIELD_FONT_PX` = 16). Las cuatro constantes viven en `apps/web/src/components/ui/constants.ts` y la prueba las importa.
- **Nada vive solo en `:hover` ni en un `title`**: el porqué va en `InfoButton` o en la línea del deshabilitado (§4.1).
- **Qué se corta**, la regla que dio el dueño al quejarse de un corte: «en el grupo 3 los que tiran no se ve su nombre» (`RaceRadioPanel.tsx` l. 226-227, v59; [DUEÑO 17]):

| Qué                                           | ¿Se corta? | Cómo                                                                  |
| --------------------------------------------- | ---------- | --------------------------------------------------------------------- |
| el nombre de un corredor                      | nunca      | la fila crece                                                         |
| el nombre de un equipo, en el segundo renglón | sí         | `…` con `data-clip-ok`; el maillot lleva el nombre en su `aria-label` |
| una cifra, un puesto o una diferencia         | nunca      | su columna o su segmento no se encogen                                |
| el texto de un botón                          | nunca      | es corto; el nombre entero va en `ariaLabel` (`Add Race Ardèche`)     |
| la consecuencia de la `ActionBar`             | sí         | un renglón con `…`, entera en `aria-describedby`                      |
| el rótulo de un destino de `BottomNav`        | nunca      | el plan B de §6.3                                                     |
| el segundo renglón de una fila con cifras     | nunca      | parte de línea (el salón de la fama, §6.1)                            |

### 6.5 Gestos, vuelta atrás, teclado y horizontal

- **Ningún gesto de deslizar**: chocaría con el carril de las pestañas y con el «atrás» del sistema. La vuelta es el enlace del `PageHeader` y el «atrás» del sistema, que la web respeta porque cada pantalla es una ruta (`App.tsx` l. 162-339).
- **El teclado** (D-12; H-16, sin evidencia de los jueces): mientras está abierto (`isKeyboardOpen`, §4.9), la `ActionBar` y la `BottomNav` se esconden, para que el campo enfocado y lo que se escribe no queden debajo de 116 px de barras. Al cerrarlo vuelven, y la `ActionBar` sigue con su consecuencia.
- **De lado** (H-16): el manifiesto no fija `orientation` (D-45, §12.1), así que la web gira. A 800 × 360 las dos barras dejan unos 244 px de contenido (estimado por uso); E3 no cambia nada de lado, y la pasada nocturna a 800 × 360 mide el reflujo (la comprobación 1) e informa sin parar ningún PR (§7.8).

### 6.6 El escritorio como ampliación

El escritorio añade y no cambia (D-06; I-21): desde 640, las columnas `secondary`; desde 1.024, las `optional`, el margen de 24 px y el contenedor `max-w-page` (72rem) centrado; una página puede repartir sus paneles en dos columnas desde 1.024 (`lg:grid-cols-2`, la respuesta primero), y las tablas de §6.1 siguen a todo lo ancho de su panel. La densidad depende del puntero y no del ancho: con ratón (`fine:`), la fila de una tabla sin maillot baja a 36 px (una con maillot, nunca de 44: D-00b), `ActionRow` a 48, `Field` a 40 y `Button` `sm` a 32 (§3.5), para el público de Hattrick y PCM, que lee tablas densas en escritorio (mapa 04 §2); una tableta de 1.024 manejada con el dedo sigue en 44. Solo los componentes escriben `fine:`; una página nunca.

```text
(pantalla · Race Valencia, la general · 1.024 px con ratón)
 #   RIDER                         TEAM                     TOTAL       TIME
 1   #11 (BE) Sander Wouters [k]     Noord Cycling            14:22:05
 2   #23 (FR) Luc Martin [k]         Mistral Racing           14:22:17    +0:12
 3   #95 (IT) Paolo Rota [k]         Aurore Équipe            14:22:40    +0:35
 (filas de 44 px: con maillot no bajan de ahí ni con ratón; TEAM, secondary, sale del segundo
  renglón desde 640; TOTAL, optional, aparece desde 1.024)
```

---

**Injertos aplicados.** I-21 (§6.6: la densidad por puntero en las tablas y las filas; los tokens, §3.5). I-26 (§6.2: qué tablas llevan fila propia y cómo se ancla; el componente, §4.5).

**Objeciones resueltas.** O-28 (§6.2: el enlace del nombre es la celda entera, de 44, y la prueba lo cuenta como control). O-30 (§6.3: el plan B de los rótulos de la barra inferior por debajo de 340 px, si la comprobación 2 encuentra uno cortado con la letra del CI). O-33 (§6.1: qué columnas vuelven a 640 y a 1.024 en cada tabla).

**Huecos rellenados.** H-16 (§6.5: las barras se esconden con el teclado abierto; de lado, el manifiesto no fija la orientación y solo se mide el reflujo; la pasada, §7.8).

**Contradicciones de hecho.** X-18 (§6.2: los enlaces de 20 px del prototipo de telefono, reproducidos por uso C1; desde ahora no pasan).

**Decisiones de esta sección.**

- **6-a**, las listas que hacen de tabla y no están entre las diez (carreras, noticias, equipos, países, resultados) pasan al catálogo en la cola larga de su página con la regla de las 20 primeras; su agrupación y su orden son de E6.
- **6-b**, el filtro de las inscribibles es un `Segmented` (`All races` · `Affordable`) y no el `Chip` conmutable de telefono, porque un `Chip` no se pulsa (§4.7).
- **6-c**, `rank` es opcional en `RankTable` (§4.5): los movimientos y la plantilla no tienen puesto y usan la misma tabla sin esa columna, en lugar de un componente más.
- **6-d**, las columnas de 640 y de 1.024 de cada tabla son datos que la API ya manda (`gcRowSchema`, `stageResultEntrySchema`, `teamClassEntrySchema`, `hallOfFameRowSchema`, `countryRiderSchema`, `teamRiderSchema` y `ledgerEntrySchema`, `contracts.ts` l. 485-986): ninguna pide un campo nuevo.
- **6-e**, el plan B de los rótulos lo aplica, si hace falta, el mismo PR del paso 11, con la medida de la comprobación 2, para que no quede una decisión pendiente sin dueño.
- **6-f**, la clasificación por equipos pierde la columna `Country`: el maillot de 28 dice el equipo, y ninguna pieza salvo `RiderLabel` pone una bandera junto a un maillot (D-00c). Escribe D-00b y D-00c como hechos en §6.1, en los dibujos y en §6.6.

**Propuesto para el glosario.**

- Textos de pantalla: `All races`, `Affordable` (el filtro de las inscribibles); `Bonus`, `Sprint`, `KOM`, `Total`, `Stages`, `Overall`, `Mountains`, `Points`, `Team`, `Type`, `Role`, `Health`, `Day`, `Kind` (las cabeceras de columna de §6.1); `Bib 214 · Day 51 out, Day 53 back · paid 48` (el programa).
- `label` y `shortLabel`: los dos rótulos de un destino de `BottomNav`; `ui/BottomNav.tsx`.
