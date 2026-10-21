## 1. Diagnóstico medido: el juego visto desde un teléfono

Esta sección dice qué falla hoy, con la cifra de quien la midió y la captura donde se ve. No propone nada: cada punto remite a la sección que lo arregla. Las líneas de código son las de `58c14da`, que el árbol de trabajo no cambia fuera de `docs/` (`git diff --stat 58c14da HEAD -- apps packages`, vacío). Las cifras salen de los cinco mapas, de las propuestas y de los jueces, y no se han vuelto a medir: cuando aquí algo está medido, lo midió quien se cita, con el instrumento que se nombra.

| Punto | Qué falla                                       | Dónde, en el código                                                                 | La cifra                                                                                              | Capturas           |
| ----- | ----------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------ |
| 1.2   | el marco se come la pantalla                    | `Header.tsx` l. 110-117; `BottomNav.tsx` l. 44 y 54                                 | 148 de 800 px, el 18,5 %; `Watch` empieza a 328 px                                                    | 01, 08, 09, 15     |
| 1.3   | la respuesta lejos y la acción al final         | `PlanLadder.tsx` l. 125-219; `Training.tsx` l. 324; `MyRaces.tsx` l. 246-254        | la respuesta a 1.060 px; la página, 6.807; la inscripción, 19.914                                     | 01, 03             |
| 1.4   | lo que no cabe se corta                         | `Panel.tsx` l. 22; `BottomNav.tsx` l. 54 y 59; `HallOfFame.tsx` l. 91               | una tabla de 460 px en 336; `Dashb…` (pantalla); siete columnas que se desplazan sin indicio          | 14, 15, 23, 24     |
| 1.5   | la letra, el dedo y el contraste                | `BottomNav.tsx` l. 54; `ProfileStrip.tsx` l. 70 y 161; `Panel.tsx` l. 25-26 y 38-39 | letra de 8 a 11 px; 34 de 42 campos a 14 px; objetivos de 13 a 20 px; 2.816 nodos de axe              | 08, 15, 25, 28     |
| 1.6   | dos sistemas y medio, y los estados sin diseñar | `Panel.tsx` l. 7-43; `App.tsx` l. 159; `index.css` l. 5-12                          | 146 botones con 92 aspectos; 44 `Loading…`; 26 errores sin reintento; 23 `title`                      | 40, 41, 42, 47     |
| 1.7   | la red mala                                     | `main.tsx` l. 9 y 22-30; `ProtectedRoute.tsx` l. 12-13; `apps/web/public/`          | primera pintura de 3,13 a 3,28 s y lista de 4,75 a 5,70 con Slow 4G; 94,3 KB de CSS, el 91 % banderas | 48, 49, 50, 51     |
| 1.8   | los maillots                                    | `visuals.ts` l. 29-31 y 71-83; `GroupBar.tsx` l. 242; `Jersey.tsx` l. 135           | algún par de gemelos en 303 de 310 carreras a 13 px en visión normal, y en las 310 en las dicromacias | 05, 06, 09, 12, 16 |
| 1.9   | el clon, un defecto vivo de producción          | `world.ts` l. 459-468 y 542-545; `teamControl.ts` l. 182-186                        | de 219 equipos y 3.900 corredores a 220 y 3.912 tras un tick                                          | 16                 |
| 1.10  | el examen y la frontera, debajo de la pantalla  | `riders.ts` l. 449-453 y 477; `train.ts` l. 216; `trainingPlan.ts` l. 37            | `Spot on` en 17 de 18 etapas de Race France; el día a día coincide con el bloque en 88 de 350 casos   | 01, 17, 29         |

### 1.1 Qué se ha medido y cómo

- **Los cinco mapas** (`docs/diseno/e3-visual/mapas/`): 01, la web por dentro (las clases contadas en el árbol de sintaxis de los 147 ficheros de producción, con TypeScript 5.9.3); 02, el examen y la frontera (el cuadro, la precedencia de `train.ts` y lo que la API manda, con testigos en las 52 GET del banco); 03, los maillots (rasterizados y medidos con ΔE00 tras Machado 2009 sobre los 310 pelotones del mundo de prueba); 04, el corpus y las palabras del dueño, numeradas `[DUEÑO n]`; 05, las pantallas medidas y la web instalable.
- **Las 98 capturas** (`capturas/README.md`): 49 pantallas, cada una a 360 × 800 con relación de píxeles 2, `isMobile` y tacto, y a 1.280 × 800 con relación 1, de página entera. 45 llevan medidas (alto, ancho, letra más pequeña, caracteres por debajo de 12 px, objetivos por debajo de 44, tablas más anchas que su caja y nodos de contraste de axe); las otras cuatro (48 a 51) son los casos sin red.
- **El mundo** (mapa 05 §1): PGlite 0.5.4 con todas las migraciones, la génesis de producción (`seedWorld` con `GENESIS_WORLD_SEED`, `tick.ts` l. 265 y 70) y 50 días corridos por `runTick` con la grabación de `Watch` encendida, 849 s (17 s por día, medido). Al acabar, 3.902 corredores, 219 equipos, 107 etapas con su línea de `Watch` y 355 noticias. Cuatro cuentas por la API de verdad: el jugador (José Quintáns, agente libre español con plan de bloques en modo `Mixed` y cuatro carreras convocadas, dos fuera con viaje de ida y vuelta), el mánager (Nathan Van Acker, dueño de Noord Cycling, WorldTour), el visitante y una cuenta sin corredor. Cuatro cosas se escribieron con SQL porque el juego no las da en un mundo recién creado: el correo confirmado, 400 de dinero al jugador, el contrato del corredor del mánager y `premium`.
- **Los instrumentos**: Playwright 1.56.1 con el Chromium 141 de `/opt/pw-browsers` (la compilación 1194), axe-core 4.10.3 inyectado (WCAG 2.0 a 2.2, A y AA), la red de DevTools por CDP (Slow 4G, 562,5 ms y 1,44 Mbit/s; Fast 4G, 165 ms y 8,1 Mbit/s) con la CPU a ×4 y la mediana de tres cargas; Python con colour-science 0.4.7 (razón WCAG 2.x, Machado 2009 con severidad 1 en RGB lineal, CIEDE2000); el compilador de Tailwind 4.3.3 del clon y su ESLint 9.39.5 (propuesta `sistema`).
- **Lo que no es**: un teléfono. Todo es Chromium de Linux sin cabeza, con el tamaño, la relación de píxeles, el tacto, la CPU y la red emulados, contra la API en la misma máquina. Nadie ha medido WebKit, San Francisco ni Roboto, ni las barras fijas con `100dvh` y el área segura (H-13). Lo que eso deja sin ver, y quién lo mira, está en §7.8.

### 1.2 El marco se come la pantalla

A 360 × 800, la cabecera mide 50 px (`Header.tsx` l. 110-117: `py-2.5` y el logotipo de 30), la tira de pestañas de nivel 2, 41, y la barra inferior fija, 57 (`BottomNav.tsx` l. 44 y 54: `h-14` más el filete de arriba): 148 px, el 18,5 % de la pantalla, antes del contenido (capturas 01 y 15; telefono §1). En `Watch` la capa fija empieza a 328 px, tras la miga, las flechas, el título, la ruta, `Share to watch` (pantalla) y las pestañas (captura 08, medido sobre la imagen por lectura §1), y ocho segundos después de `Play` la barra inferior tapa la mitad del comentario (captura 09; mapa 05 §6). Lo arreglan el marco de §6.3 y la altura de lo fijo de §4.9.

### 1.3 La respuesta lejos, la acción al final

- **El plan de entrenamiento** (`/me/training`, captura 01): lo que el plan hace empieza a 1.060 px, en la segunda pantalla, porque los cuatro bloques van uno bajo otro antes que la lista de llegadas (`PlanLadder.tsx` l. 125-219; mapa 05 §3). Con el día a día desplegado la página mide 6.807 px, 8,5 pantallas, y `Save day edits` (pantalla; `Training.tsx` l. 324) la cierra hacia los 6.700.
- **La inscripción** (`/me/races?tab=enter`, captura 03): 193 carreras en 19.914 px, y la columna `Travel` parte `2 travel days (1 out, 1 back)` en cinco renglones por fila (`MyRaces.tsx` l. 246-254).
- **Lo más alto, por detrás**: `/world/teams` 17.025 px, `/world/races` 13.820, el acta de una etapa 11.502, `/world/nations` 8.173 y el calendario del equipo 6.887 (`capturas/README.md`, columna «Alto a 360»).

El plan de hoy, de arriba abajo, con las cotas en px de página (captura 01; las de 1.060 y 6.807, medidas por el mapa 05 §3 y por `capturas/README.md`; la de 91, la suma de la cabecera y las pestañas; la de 6.700, de telefono §1):

```text
(captura 01 · /me/training · jugador · 360 px)
    0  cabecera, 50 px; pestañas de nivel 2, 41 (Profile · Training · Race orders · My races…)
   91  Training plan, en la barra dorada (blanco sobre oro, de 2,57 a 2,06:1)
       Your month: Coach decides · Mixed · I decide, y el porqué del modo a 12 px
       WEEK 1 Build · WEEK 2 Specific · WEEK 3 Taper · WEEK 4 Recovery, uno bajo otro
       Save plan, en cian (blanco encima a 3,33:1)
1.060  WHAT THIS DOES TO YOU · 1300 TSS over four weeks.
       Day 52 You'll arrive: Loaded … Day 60 You'll arrive: Spot on (seis filas, ninguna carrera)
       Edit day by day · Hide the 28 days: 28 filas; el día de carrera dice Race day sin decir cuál
6.700  Save day edits, en índigo (fuera del @theme)
6.807  fin de la página; de 743 a 800 de la primera pantalla, la barra fija: Dashb… · My Ri… · My Te…
```

La respuesta arriba y la acción bajo el pulgar son los principios 2.2 y 2.3; los miden las comprobaciones 7, 8 y 9 de §7.1.

### 1.4 Lo que no cabe se corta

Ninguna de las 45 pantallas desborda el documento: `scrollWidth` vale 360 en todas (mapa 05 §2). El problema es lo que se recorta sin avisar:

- **El calendario del equipo** (captura 15) mete cinco columnas, 460 px, en 336, dentro de un `Panel` con `overflow-hidden` (`Panel.tsx` l. 22; `TeamCalendar.tsx` l. 196-197): `Travel` (pantalla) sale cortada y la columna `Plan`, con su `Add` o `Drop` (`TeamCalendar.tsx` l. 114), no se ve ni se puede tocar. Es la única tabla rota.
- **La barra inferior** con cinco destinos corta `Dashb…`, `My Ri…` y `My Te…`: 11 px, 20 de relleno y `truncate` (`BottomNav.tsx` l. 54 y 59), contra «con el mismo rótulo que en escritorio» de `docs/navegacion.md` l. 266-267 (mapa 04, contradicción 6).
- **El salón de la fama** (captura 24) desplaza siete columnas, 520 px en 336, sin ningún indicio (`HallOfFame.tsx` l. 91), y el ranking de España (captura 23) corta `All-rounde` a media palabra (`Country.tsx` l. 47).
- **La plantilla** (captura 14) corta los nombres (`Josef Janse…`), y la tira de pestañas de nivel 2 mide 543 px en 360 en `My Rider`: `Contract` y `Finances` quedan fuera sin indicio (mapa 05 §9).

### 1.5 Letra, dedo y contraste

- **Letra**: la más pequeña de `main` es de 8 px en las cotas del perfil de `Watch` (`ProfileStrip.tsx` l. 70 y 161; capturas 08, 09 y 35), de 10 en 04, 14, 15 y 25, y de 11 en 02, 03, 11, 19 y 24; la barra inferior, a 11 px, es la letra más pequeña de casi todas las páginas (mapa 05 §2). El 40 % de los tamaños de letra del código (287 de 710) son de 12 px o menos (mapa 01 §2.2).
- **Campos**: 34 de los 42 llevan `text-sm`, 14 px, por debajo de los 16 con que Safari de iPhone no amplía la página al enfocar (mapa 01 §2.2; lo de Safari, conocido y no comprobado).
- **Objetivos**: en 30 de las 40 pantallas que tienen alguno, el 90 % o más de los objetivos de `main` tienen un lado de menos de 44 px, y el más bajo mide de 13 px (`/me/orders`, `/account`) a 20 (`/me/training`) (mapa 05 §2). La única queja del dueño sobre el teléfono es de este tipo, contada por `994b83c` (13-8-2026): «El dueño las vio junto a «Welle Team» en la general y en la clasificacion por equipos y pregunto que significaba «Ill»» ([DUEÑO 5]): el dorsal del equipo líder, tres barras de 15 px, se leía como letras.
- **Contraste**: axe-core da 2.816 nodos por debajo de 4,5:1 a 360 px y 3.619 a 1.280, en las 44 pantallas medidas; 2.096 son `slate-400` (`#90a1b9`) sobre blanco, a 2,63:1 (mapa 05 §11). Lo que axe no mide, calculado a mano: el blanco sobre el degradado cian de cada `Panel`, de 3,33 a 2,22 (`Panel.tsx` l. 25-26); sobre el dorado de `SectionBar`, de 2,57 a 2,06 (l. 38-39); y el reloj del mundo a 1.280 px, de 1,14 a 1,47 (`WorldClock.tsx` l. 60-62; mapa 01 §2.3).

### 1.6 Dos sistemas y medio y los estados sin diseñar

- **Dos sistemas y medio** (mapa 01 §3.2): el «manager» del `@theme` (`SectionBar` dorada y `Panel` cian, en 18 páginas y 63 paneles), una tarjeta blanca `rounded-2xl` definida siete veces como constante y copiada 25 a mano (`Race.tsx` l. 71), y la capa oscura de `Watch`. La acción va en índigo (138 apariciones, fuera de la marca) o en cian (58). El `@theme` tiene seis colores (`index.css` l. 5-12), y de las 1.650 apariciones de color del código solo 86, el 5 %, son suyas (mapa 01 §2.2).
- **No hay botón**: 111 `<button>` y 35 enlaces con aspecto de botón dan 109 combinaciones de clases y 92 aspectos, con seis rellenos de acción, tres de ellos en `/me/training`; 18 de los 146 llegan a 44 px de alto (estimado con la aritmética de las clases, mapa 01 §3.3).
- **Los estados**: 44 `Loading…` (pantalla) iguales y ningún esqueleto (`App.tsx` l. 159; captura 40); 26 «Could not load…» en rojo sin reintento (captura 41); seis páginas que pintan un fallo de su consulta como si estuviera vacía; el 404 de un corredor sale como error (captura 47); el porqué de un botón deshabilitado, si se dice, vive en uno de los 23 `title` que el dedo no abre; y ningún `focus-visible:` en todo el código (mapa 01 §4 y §7).
- **Los tests que fijan el marcado**: 17 ficheros pintan con `renderToStaticMarkup` y buscan cadenas, y seis fijan clases literales (mapa 01 §9): cambiar el aspecto los rompe sin que protejan nada.

### 1.7 La red mala

- **La primera pintura** (mapa 05 §12, mediana de tres, Slow 4G y CPU ×4): de 3,13 a 3,28 s, y la página lista de 4,75 a 5,70 s en la portada, el plan y `Watch`. Nada se pinta hasta que arranca el JavaScript, porque el HTML trae `<div id="root">` vacío (`index.html` l. 16).
- **El peso** (mapa 01 §8): la hoja de estilos, 466 KB y 94,3 con gzip, bloquea la primera pintura en todas las páginas, y el 91 % son las banderas de `flag-icons` 7.5.0, 271 en dos proporciones, importadas enteras (`main.tsx` l. 9); sin ellas, 8,5 KB. El arranque suma 250,9 KB con gzip antes del trozo de la página.
- **Sin red** (mapa 05 §13; capturas 48 a 51): un enlace a una página cuyo trozo no se había cargado sustituye la web entera por la barrera de error (`main.tsx` l. 22-30); volver a una página visitada la pinta de la caché sin avisar; una página con su trozo y sin datos dice `Loading…` (pantalla) para siempre; y recargar da la página de error del navegador. Con un service worker que sirva la cáscara, quien tiene sesión vería `Log in`, porque `ProtectedRoute.tsx` l. 12-13 lee una sesión que no llega como «sin sesión» (telefono §1, punto 6; juez de código, C3).
- **Nada instalable** (mapa 05 §14): `apps/web/public/` solo tiene `favicon.svg`; no hay manifiesto, ni iconos, ni service worker, ni `theme-color` (`index.html` l. 1-19).

Lo arreglan §12 (la web instalable, sin red, la versión nueva y el peso) y los estados de §4.2.

### 1.8 Los maillots

- **La equipación no se guarda: se deriva** de la semilla y del orden de la paleta (`visuals.ts` l. 29-31 y 71-83): un color más en `JERSEY_COLORS` cambia la base de 102 de los 219 equipos y repinta también lo grabado (mapa 03 §2.3).
- **Gemelos**: dibujadas con el rasterizador de telefono, las equipaciones de hoy tienen algún par a menos de 10 de ΔE00 en 303 de las 310 carreras en visión normal y en las 310 en las tres dicromacias, a 13 y a 16 px (telefono §1, punto 7, y §6.2). El mapa 03 §3.2, que cuenta solo patrón y color de base, da 302; y 220 de las 310 tienen dos maillots idénticos del todo.
- **El tamaño real es 13 px**: en `Watch` el maillot es lo único que identifica a cada corredor de un grupo de cuatro a doce (`GroupBar.tsx` l. 242), y a ese tamaño una raya de `stripes` mide 0,81 px (mapa 03 §1.3); en la general, los de líder miden 15 × 15 (mapa 05 §7). El dueño fijó el mínimo el 21 de octubre de 2026: «los maillots creo que nunca deberian mostrarse a 13 o 16 pixels, minimo 28 pixels e incluso eso ya es muy pequeño...» (`00-encargo.md` §7.2, l. 274-275). Desde ahí ningún maillot se pinta por debajo de 28 px (D-00b, que sustituye a D-21; §7.1, comprobación 10).
- **Los líderes comparten color y figura** con las equipaciones: el verde y el azul de líder están en `JERSEY_COLORS` y la banda es el patrón de 44 equipos; a 13 px, cinco equipaciones quedan a menos de 10 del verde en visión normal y 88 en grises (mapa 03 §4.1). El dorsal del equipo líder no se pinta (mapa 03 §4.2).
- **El campeón solo se ve en `Watch`** (el `ChampionMark` provisional, `Jersey.tsx` l. 135), y no habrá campeones hasta el primer nacional: el de ruta de 111 de los 133 países se corre el día 179 (mapa 03 §5).
- **La marca**: el registro que encontró el mapa 03 es el del logotipo de la UCI (IR 1276964, clases 12, 25 y 41), no el de las bandas solas (mapa 03 §7.1); lo que hace falta verificar está en §18.

Lo arreglan §8 y §9.

### 1.9 El clon, un defecto vivo de producción

`seedWorld` corre en cada tick (`tick.ts` l. 265) y reconoce los equipos que ya existen por su `jersey_seed` (`world.ts` l. 459-468); `teamIndexFromSeed` saca de esa misma semilla el índice del equipo (l. 542-545). Y el selector del maillot de `/team/identity` escribe la candidata elegida en `jersey_seed` (`updateOwnedTeam`, `teamControl.ts` l. 182-186). Medido por el mapa 03 §2.2 en PGlite: al equipo continental `Menghu Cycling` se le pone dueño y la cuarta candidata, se pasa un tick, y el mundo pasa de 219 equipos y 3.900 corredores a 220 y 3.912, con un NPC nuevo, también `Menghu Cycling`, con la semilla vieja y doce corredores. Ningún test lo cubre (la búsqueda de `jerseySeed` en los tests de `packages/db` no da nada). Cuántos clones hay ya en producción no se sabe desde aquí. El arreglo es el paso 1 del plan, pequeño e independiente de todo lo demás (D-32; §8.9 y §17.3).

### 1.10 El examen y la frontera, debajo de la pantalla

El examen no es solo de presentación (`01-fase-propuestas.md`, cambio 1):

- **La vista previa inventa en las vueltas**: proyecta cada día de carrera como `descanso_activo` de 25 TSS (`riders.ts` l. 449-451), cuando una etapa medida cargó 252,8; en el mundo de prueba da `Spot on` (pantalla) a 17 de las 18 etapas de Race France del horizonte (mapa 02 §3). Y no dice de qué carrera habla: `raceId: null` siempre, con el `tsb` en número, que la pantalla no enseña (`riders.ts` l. 477).
- **El panel de los 28 días no enseña los bloques**: rellena el día sin orden con `defaultCoachPlan` (`trainingPlan.ts` l. 37), un ciclo de 14 días que el tick ya no usa y que coincide con lo que entrena el bloque en 88 de 350 casos (mapa 02 §1).
- **Los planes solapados**: guardar la escalera dos días distintos deja dos filas; la pantalla lee una y el tick entrena la otra (mapa 02 §2, medido en PGlite).
- **El desfase de semanas** (lectura §1.5; cierto para los tres jueces, X-05): la vista previa cuenta las semanas desde mañana (`blocks[Math.floor(i / 7)]`, `riders.ts` l. 453) y el tick desde el día del guardado (`train.ts` l. 216), así que a partir del día siguiente la escalera y lo que se entrena van desplazados.
- **La frontera se rompe por los números** (mapa 02, resumen): ningún oculto del SPEC §3.4 cruza, pero los diez atributos viajan con decimales para cualquier corredor (`GET /api/riders/:id`), y `tsb`, `ctl` y `atl` viajan en la vista previa y en el diario.

Lo que el dueño vio de esto está contado, no citado: que arriba y abajo pueden decir cosas distintas sin que se sepa cuál manda y que no se entiende `Day 182 · You'll arrive: Rusty` ([DUEÑO 12], `docs/agenda.md` l. 1560-1563), y «el jugador ve un día de viaje antes de la carrera y ninguno después, que es exactamente lo que reportó el dueño» ([DUEÑO 13], `docs/encargos.md` l. 264-265), cuyo dato se arregló el 26 de septiembre de 2026 y cuya presentación sigue (captura 02: `On your programme` no nombra el viaje). Lo arreglan §10, §11 y §13.

### 1.11 Lo que está bien y se queda

| Qué                                      | Dónde                                                                                                                                                                | Por qué se queda                                                                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| el patrón ARIA de las pestañas           | `Tabs.tsx` l. 153-222, con índice móvil y flechas (l. 172-210)                                                                                                       | es el único `tablist` bien hecho de la web; `Tabs` (§4.4) lo conserva y cambia el aspecto                                                    |
| `RiderName`                              | `RiderName.tsx` l. 15-41                                                                                                                                             | humanos en negrita y bots en cursiva ([DUEÑO 24]) y el subrayado punteado que se ve sin ratón ([DUEÑO 6]): pasan a `RiderLabel` y `TextLink` |
| `ShowAll` y `TOP_ROWS` = 20              | `ShowAll.tsx` l. 10-33                                                                                                                                               | la regla de tablas de `docs/navegacion.md` §7.3, con `aria-expanded`; `RankTable` la usa dentro                                              |
| `StageRoute`                             | `StageRoute.tsx` l. 10-22                                                                                                                                            | el origen y el destino en toda mención de una etapa, pedido por el dueño ([DUEÑO 7], `docs/balance.md` l. 17656, motor v89)                  |
| los siete `aria-live` de `Watch`         | `broadcast/`: `FixedOverlay.tsx` l. 41, `CueCard.tsx` l. 46, `VoiceTicker.tsx` l. 45, `GroupBar.tsx` l. 96, `TimeTrialBoard.tsx` l. 25 y 59, `StageCards.tsx` l. 150 | los dejó E2 con su política (`docs/retransmision.md` §18.8) y D-56 no los toca                                                               |
| el velo de E2                            | `VeilNotice.tsx` l. 19-55; `StageGate.tsx`                                                                                                                           | su lógica es de E2; E3 solo le cambia el aspecto (`Notice`, §4.7)                                                                            |
| la caché inmutable de `assets/`          | `apps/api/src/app.ts` l. 125-144                                                                                                                                     | un año e inmutable con huella, y `index.html` con `no-cache`: el service worker de §12 se apoya en ella                                      |
| el serializador de Zod, ya montado       | `apps/api/src/app.ts` l. 162-163                                                                                                                                     | quita de una respuesta lo que su esquema no declara, también anidado (juez de código, C1): es el mecanismo de §13                            |
| `wearableTitles`                         | `packages/shared/src/jerseys.ts` l. 271                                                                                                                              | la regla de qué título se lleva en qué carrera (el de contrarreloj en las cronos); la señal de §9 la dibuja y no la cambia                   |
| `getRiderTravelDays` y `travelDaysLabel` | `packages/db/src/riderSchedule.ts` l. 175-226, con `returnTravelDaysFor` (l. 128); `labels.ts` l. 157-161                                                            | el viaje de ida y vuelta ya es correcto en el dato; §11 solo cambia cómo se ve                                                               |
| `formatTime` y `money`                   | `apps/web/src/domain/format.ts` l. 4-11 y 14-17                                                                                                                      | los formatos de una diferencia y del dinero que impone el vocabulario de pantalla (§4.10)                                                    |
| la base sin prefijo es la del teléfono   | mapa 01 §2.1: 66 de 6.244 apariciones llevan un corte                                                                                                                | el principio 2.1 no pide reescribir el marcado, solo añadir `sm:` y `lg:` donde haga falta                                                   |

---

**Injertos aplicados.** Ninguno (§B no asigna ninguno a §1).

**Objeciones resueltas.** Ninguna.

**Huecos rellenados.** Ninguno.

**Decisiones de esta sección.** Ninguna. Cita como hechos D-32 (el clon, §1.9), D-56 (los `aria-live` de `Watch`, §1.11) y D-00b (el mínimo de 28 px que fijó el dueño, §1.8).

---

## 2. Principios

Diez reglas, cada una con lo que la viola hoy (§1) y la pieza que la cumple. Son de la base, `telefono` (§2), con lo que sumaron las otras tres: el tema que se hace cumplir de `sistema` (§2, principios 1 a 5), la forma reservada de `identidad` (§2, principios 1 a 3) y la escala de cada número de `lectura` (§2, principio 4). Una regla que no tenga su número en una prueba no es un principio de este documento (2.10).

| Principio                                                                                    | Lo que lo viola hoy                                                                                      | La pieza que lo cumple                                                                                                                        |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 360 × 800 es la referencia y 320 × 640 el rescate                                        | el reloj del mundo y el nombre del juego solo salen en escritorio (`Header.tsx` l. 118 y 122; §1.2)      | `PHONE_REF` y `PHONE_MIN` (§7); la clase sin prefijo es la del teléfono y `sm:` y `lg:` añaden (§3.5, §6)                                     |
| 2.2 La respuesta en la primera pantalla                                                      | el plan contesta a 1.060 px y `Watch` empieza a 328 (§1.2, §1.3)                                         | `data-answer` en los primeros 520 px (`ANSWER_MAX_TOP_PX`), comprobación 7 (§7.1) y su elemento en cada pantalla (§7.3)                       |
| 2.3 La acción bajo el pulgar                                                                 | `Save day edits` (pantalla) cierra una página de 6.807 px (§1.3)                                         | `ActionBar` (§4.3) en el 40 % de abajo (`THUMB_ZONE`), con su consecuencia; comprobación 8                                                    |
| 2.4 Una fila, dos renglones, una acción                                                      | el calendario del equipo pierde `Add` y `Drop`; la plantilla corta nombres (§1.4)                        | `RankTable`, `ActionRow` y `TripRow` (§4.5) y la tabla de las tablas (§6.1)                                                                   |
| 2.5 Nada por debajo de 12 px de letra, 44 px de dedo, 16 px en un campo ni 4,5:1 en un texto | 8 px en `Watch`, objetivos de 13 a 20 px, 34 de 42 campos a 14 px, 2.816 nodos de axe (§1.5)             | `MIN_FONT_PX`, `MIN_TARGET_PX`, `MIN_FIELD_FONT_PX` y `MIN_INLINE_TARGET_PX` (§3.5); los tokens con su contraste (§3.1); comprobaciones 3 a 6 |
| 2.6 La red mala es el caso normal                                                            | la barrera, el `Loading…` sin fin, la página de error del navegador y el `Log in` sin red (§1.7)         | `QueryView` y sus estados (§4.2), `OfflineBanner` y `UpdateToast` (§4.7), la sesión desconocida y el service worker (§12)                     |
| 2.7 Cada identidad, su forma, reservada y medida a 28 px                                     | gemelos en 303 de 310 carreras; líderes con colores de equipo; el campeón solo en `Watch` (§1.8)         | `Kit` y su vocabulario (§8), `LeaderJersey` y `ChampionSash` (§9), `KIT_MIN_PX` = 28, `KIT_MIN_DISTANCE` = 10; comprobación 10                |
| 2.8 Lo que no está en el tema no existe, y la deuda solo baja                                | seis tokens en el tema y el 95 % del color fuera de él; 146 botones con 92 aspectos (§1.6)               | el `@theme` (§3), el tema cerrado del paso 22, `vocabulario.test.ts` con `deuda.json`, `ui/1` a `ui/10` y `/_ui` (§5)                         |
| 2.9 Lo que la pantalla no enseña no viaja, y un número lleva su escala                       | atributos con decimales y `tsb` en la API; `1300 TSS over four weeks` y `Freshness 16 / 100` (§1.10)     | la regla de la frontera (§13); `StarRating`, `Scale5` y `Meter` (§4.6, §4.8)                                                                  |
| 2.10 Medido o no está hecho                                                                  | ninguna prueba mira hoy el teléfono, el contraste ni el maillot (mapa 01 §9: ni axe ni regresión visual) | `telefono.spec.ts` y su trinquete (§7), `tokens.test.ts` (§3), `kit.test.ts` y `champion.test.ts` (§16)                                       |

### 2.1 360 × 800 es la referencia y 320 × 640 el rescate

Todo token, componente y pantalla se especifica primero a 360 × 800 px y se comprueba a 320 × 640, el ancho de WCAG 1.4.10; el escritorio es una ampliación declarada con `sm:` (640) y `lg:` (1.024) y nunca la base (D-01). Consecuencia: un valor que solo existe bajo `sm:` o `lg:` es una ampliación; si falta a 360, falta.

### 2.2 La respuesta en la primera pantalla

Cada pantalla marca con `data-answer` el elemento que contesta lo que se vino a mirar, y su borde superior queda a 520 px o menos a 360 × 800. Consecuencia: lo que no es la respuesta va debajo o plegado en un `Disclosure`, y una pantalla sin `data-answer` falla la comprobación 7.

### 2.3 La acción bajo el pulgar

La acción principal de una pantalla que edita vive en la `ActionBar`, en el 40 % de abajo y a la vista en todo el desplazamiento, con su consecuencia escrita (`2 changes · Race Var: Fine (was Loaded)`, pantalla). Consecuencia: una pantalla que edita tiene un solo `data-primary-action`, y ningún `Save` suelto al final de la página.

### 2.4 Una fila, dos renglones, una acción

Quién o qué en el primer renglón, lo demás en el segundo y un botón de 44 px. Consecuencia: ninguna tabla se desplaza de lado ni recorta, y el nombre de un corredor no se corta nunca: la fila crece.

### 2.5 Nada por debajo de 12 px de letra, 44 px de dedo, 16 px en un campo ni 4,5:1 en un texto

Los cuatro mínimos son constantes de `apps/web/src/components/ui/constants.ts` que importan la prueba y los tests, y no se copian (D-02). Consecuencia: el SVG también cuenta (las cotas del perfil pasan de 8 a 12 px), y un borde de campo o de control pide 3:1 (WCAG 1.4.11).

### 2.6 La red mala es el caso normal

Toda consulta pinta esqueleto, error con reintento, vacío y sin red; sin red no es un error ni un cierre de sesión, y la API no se guarda nunca en el service worker. Consecuencia: ninguna página escribe `isPending &&`, y recargar sin red con sesión no lleva a `/login`.

### 2.7 Cada identidad, su forma, reservada y medida a 28 px

Equipación, líder y campeón se leen en las cuatro visiones a su tamaño mínimo, 28 px, el que fijó el dueño: ningún maillot se pinta más pequeño, en ninguna pantalla (D-00b, que sustituye a los 13 px de D-21). La forma de cada identidad está reservada y ningún maillot de equipo la puede llevar. Consecuencia: toda afirmación de que dos maillots se distinguen lleva su ΔE00 en las cuatro visiones a 28 px, y la comprobación 10 de la prueba falla con un maillot más pequeño.

### 2.8 Lo que no está en el tema no existe, y la deuda solo baja

Un valor de la interfaz es un token del `@theme` o no es; lo de hoy sigue resolviendo hasta el paso 22, contado como deuda fichero a fichero. Consecuencia: un PR no puede subir la deuda de un fichero, y un token nuevo entra con su pareja en `tokens.test.ts` (§5.5).

### 2.9 Lo que la pantalla no enseña no viaja, y un número lleva su escala

Un número que se enseña va con su escala (estrellas de cinco, un tramo de cinco, una palabra, una barra con sus extremos), y la API manda esa resolución y no el número interno (D-53). Consecuencia: fuera `1300 TSS`, `105 TSS`, `16 / 100` y `Morale 60%` de la pantalla, y sus números de la respuesta.

### 2.10 Medido o no está hecho

Cada principio tiene su número en una prueba: 2.1 a 2.5, en las diez comprobaciones de §7.1; 2.6, en `sinred.spec.ts`; 2.7, en la comprobación 10, `kit.test.ts`, `kits.test.ts` y `champion.test.ts`; 2.8, en `vocabulario.test.ts` y `tokens.test.ts`; 2.9, en `frontera.test.ts`. Consecuencia: E3 está terminado cuando `telefono-baseline.json` está a cero (D-18), y la app nativa se revisa con su propio número (§12.8).

---

**Injertos aplicados.** Ninguno (§B no asigna ninguno a §2).

**Objeciones resueltas.** Ninguna.

**Huecos rellenados.** Ninguno.

**Decisiones de esta sección.** Ninguna. Escribe como hechos D-01 (2.1) y D-00b, que cambia el tamaño de 2.7 de 13 a 28 px.

---

## 3. Los fundamentos: paleta, letra, espacio, densidad, radios, sombras e iconos

Los tokens de esta sección son los únicos valores de la interfaz (principio 2.8). Viven en el `@theme` de `apps/web/src/index.css`, que §3.9 escribe entero, y `tokens.test.ts` comprueba cada pareja de texto y fondo de las tablas de §3.1, §3.2 y §3.3 con la razón WCAG 2.x, mezclando en sRGB los colores con transparencia sobre su fondo, como el navegador. Los contrastes son los de telefono §3.1 (`paleta_final.py`), uso C5 (los tramos) y lectura §3.1 (`own`); los marcados con (\*) los ha medido el redactor de esta sección con `<scratchpad>/redactor-L1/fundamentos.py` (colour-science 0.4.7; el script reproduce, como control, los 3,66, 6,72, 10,57 y 9,0 de telefono y de uso).

### 3.1 La paleta

La paleta es la A, «manager sobrio» (D-03), decidida por el dueño el 21 de octubre de 2026 mirando la página de opciones: «Paleta: telefono A» (D-00a; `00-encargo.md` §7.2, l. 263). Conserva la identidad que creó el PR #105 (`9361029`, 3-8-2026: «dark navy header», «cyan panel headers, gold section bars»), la que reconoce el público de Hattrick y PCM (mapa 04 §2), y cambia su ejecución: sin degradados (ninguno pasa, y axe no los mide), sin barras de color a todo lo ancho (devuelve 36 px por panel y 48 por página al teléfono) y todo texto a 4,5:1 o más. La variable de cada token es `--color-<token>`.

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
| `good`, `good-bg`                                                                     | `text-good`, `bg-good-bg`               | `#167a3a`, `#e6f4ea`                                  | correcto, `Called up` (pantalla)                                                                               | 5,41 `surface`; 4,77 sobre su fondo                                                                              |
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

**La escala de llegada** (X-20, medida por uso, C5): el texto blanco sobre el tramo activo va de 5,02 (`Loaded`, pantalla) a 6,57 (`Cooked`); `Cooked` y `Loaded` quedan a 6,3 de ΔE00 en deuteranopía, y el tramo activo a 38 o más del apagado (`surface-2`) en toda visión. Por eso `Scale5` (§4.8) se lee por posición y por palabra, no por su color: el orden es fijo, de cansado a fresco (`Cooked`, `Loaded`, `Fine`, `Spot on`, `Rusty`, D-42), y la palabra del tramo activo va escrita en él.

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

La del sistema (D-05), decidida por el dueño: «Tipografía: sistema» (D-00a; `00-encargo.md` l. 263): `--font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', Arial, sans-serif`, cero bytes, ningún salto de letra con Slow 4G, y con los alfabetos que traerá E10. Siete tamaños, en `rem` para que la letra raíz los escale (§7.8):

| Token     | Utilidad       | Tamaño / interlínea | Peso                                   | Uso                                                                 |
| --------- | -------------- | ------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| `caption` | `text-caption` | 12 / 16 px          | 400 y 600; en versales, 600 y +0,04 em | el mínimo: ejes, rótulos, cabecera de tabla, `Chip`, barra inferior |
| `meta`    | `text-meta`    | 14 / 20             | 400                                    | segundo renglón, entradillas, texto de aviso, línea de estado       |
| `row`     | `text-row`     | 15 / 20             | 600                                    | primer renglón de una fila: el nombre, la carrera                   |
| `body`    | `text-body`    | 16 / 24             | 400                                    | texto y **todo campo**                                              |
| `title`   | `text-title`   | 18 / 24             | 600                                    | título de `Panel`                                                   |
| `page`    | `text-page`    | 24 / 32             | 700                                    | el `h1` de `PageHeader`                                             |
| `display` | `text-display` | 32 / 40             | 700                                    | cifras grandes: saldo, km a meta                                    |

El peso va dentro del token (`--text-row--font-weight`), así que `text-row` ya es 600 y `font-normal` lo baja. Pesos: 400, 600 y 700 (`font-normal`, `font-semibold`, `font-bold`); `font-medium` (243 apariciones) y `font-mono` (12) van a la deuda. El rótulo en versales es `text-caption font-semibold uppercase tracking-caps`, con `--tracking-caps: 0.04em` (decisión 3-a). Toda columna de cifras lleva `tabular-nums`. Humanos en 600 y bots en cursiva con peso 400 (`RiderName.tsx` l. 19-20; [DUEÑO 24]). Mínimo, 12 px en todo nodo de texto, SVG incluido (las cotas de `ProfileStrip.tsx` l. 70 y 161 pasan de 9 y 8 a 12), y 16 px en todo campo. No se carga ninguna fuente, así que la CSP de hoy, que solo deja `font-src 'self' data:` (`apps/api/src/app.ts` l. 183), no cambia.

### 3.5 Espacio, rejilla y densidad

El paso es de 4 px (`--spacing: 0.25rem`), y los únicos pasos permitidos son los de `SPACING_STEPS` = 0, 0,5, 1, 1,5, 2, 2,5, 3, 4, 6, 8, 12 y 16 (de 0 a 64 px; los cuenta `vocabulario.test.ts`, §5.2). Dos cortes, `sm` (40rem, 640 px) y `lg` (64rem, 1.024 px): las tres apariciones de `md:` y la de `xl:` van a la deuda. Dos contenedores: `max-w-page` (72rem, el `max-w-6xl` de hoy, `App.tsx` l. 158) y `max-w-form` (28rem). Las medidas con el dedo (D-06, telefono §3.3), todas alturas mínimas (`min-h-*`), nunca fijas, para que la letra al doble no se recorte (H-17):

| Medida                                                        | A 360 px                                                                                                       | Desde 640                             | Desde 1.024 | Con ratón (`fine:`)                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------- | ----------------------------------------------------------------- |
| margen lateral de la página; relleno de `Panel` `default`     | 12 (`px-3`); 12                                                                                                | 16; 16                                | 24; 16      | igual                                                             |
| fila de `RankTable` (con maillot, D-00b)                      | 44 con un renglón; 56 con dos (el maillot de 28, el equipo debajo y 4 px arriba y abajo)                       | igual                                 | igual       | igual: con maillot nunca baja de 44; sin él (los movimientos), 36 |
| fila con acción (`ActionRow`)                                 | 64                                                                                                             | 64                                    | 64          | 48                                                                |
| objetivo (`Button`, enlace de fila, pestaña); campo (`Field`) | 44; 48                                                                                                         | 44; 48                                | 44; 48      | 32 (`Button` `sm`); 40                                            |
| lo fijo y la cabecera                                         | `AppHeader` 48 más el área segura; `Tabs` 44; `BottomNav` 56 más `env(safe-area-inset-bottom)`; `ActionBar` 60 | `BottomNav` no se pinta (`sm:hidden`) | igual       | igual                                                             |

La densidad depende del puntero, no del ancho (I-21): `@custom-variant fine (@media (pointer: fine))`, porque el público de Hattrick y PCM lee tablas densas con ratón (mapa 04 §2), y un portátil táctil manejado con el dedo, o una tableta a 1.024, siguen en 44. Solo un componente escribe `fine:`, y solo para las medidas de la última columna; ninguna página lo usa (§6.6).

### 3.6 Radios y sombras

Un radio, `--radius-ui` de 8 px (`rounded-ui`), para panel, botón, campo, aviso y tramo; `rounded-full`, que en Tailwind v4 es estática, solo en `Chip` y en la pastilla de `BottomNav` (D-07). Dos sombras: `shadow-card` (`0 1px 2px rgb(16 32 47 / 0.08)`), en `Panel`, y `shadow-bar` (`0 -2px 8px rgb(0 0 0 / 0.12)`), en `BottomNav`, `ActionBar` y `UpdateToast`. Los radios y sombras de hoy (`rounded-md`, `rounded-lg`, `rounded-2xl`, `shadow-sm`, `shadow-md`, la sombra arbitraria de `BottomNav.tsx` l. 44) no se redefinen: son deuda y desaparecen con el cierre.

### 3.7 Los iconos

Veinticuatro iconos propios en `apps/web/src/components/ui/icons.tsx`, que pinta `Icon` (§4.6): SVG sobre una rejilla de 24 u, trazo de 2 u con extremos y uniones redondeados, `fill="none"` salvo `star-full` y `star-half`, y `currentColor`; a 16, 20 o 24 px, siempre con su texto al lado o con `aria-label` (D-07). Los emoji salen de la interfaz porque cada sistema los pinta a su manera y un glifo pequeño se leyó «Ill» en el teléfono del dueño ([DUEÑO 5]):

| Iconos                                          | Dónde                                                                                 | Lo que sustituyen                                                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `home`, `rider`, `team`, `world`, `news`        | los cinco destinos de `BottomNav`                                                     | nada: hoy son solo texto (`BottomNav.tsx` l. 59)                                                                               |
| `account`                                       | `AppHeader`, con `aria-label="Account"`                                               | el texto `Account` (pantalla) de `Header.tsx`                                                                                  |
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
| tokens de color, letra, radio, sombra, cortes y contenedores        | el `@theme` de `apps/web/src/index.css`, sin `inline` (abajo)                                       | Tailwind v4 crea de ahí las utilidades, y sin `inline` el ámbito oscuro puede redefinirlos   |
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

**`apps/web/src/index.css`, entero.** Es el fichero del paso 7, el de los tokens, compilado por el redactor con Tailwind 4.3.3 abierto y cerrado (`<scratchpad>/redactor-L1/comprobar-tema.mjs`): con las 17 líneas del cierre activas resuelven las 43 clases de muestra del sistema (`bg-canvas`, `text-row`, `rounded-ui`, `fine:h-9`, `@max-[21.25rem]:hidden`…), dejan de resolver `bg-indigo-600`, `text-sm`, `rounded-md`, `font-medium`, `md:block`, `max-w-6xl` y `shadow-sm`, y siguen resolviendo `text-[11px]` y `p-5`, como midió el juez de código (C4).

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

### 3.10 Las dos decisiones de gusto

Las dos están decididas por el dueño (D-00a), que miró `opciones/index.html` el 21 de octubre de 2026: **DD-01, la paleta**, la A de §3.1, y **DD-02, la letra**, la del sistema de §3.4. Las alternativas que vio y descartó (para la paleta, B, «manager clásico», C, «noche y oro», y D, la de la retransmisión; para la letra, Inter variable, de 47,1 a 48,3 KB el latín, y Barlow Semi Condensed 600 en títulos y cifras, 22.984 bytes) quedan en esa página con sus medidas, y §19 las recoge como decididas.

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
- **3-g**, una fila de tabla con maillot no baja de 44 px ni con ratón: D-00b (el maillot a 28) manda sobre la fila de 36 de D-06, que queda para las tablas sin maillot. Escribe D-00a (la paleta y la letra, decididas por el dueño) como hecho en §3.1, §3.4 y §3.10.

---

## 4. Los componentes y sus estados

El catálogo es cerrado (D-09): los componentes de esta sección, y ninguno más, en `apps/web/src/components/ui/`, un fichero por componente con su `.test.tsx`; una página solo los compone con utilidades de disposición, y un componente nuevo entra con un PR que lo añade a `ui/`, a `/_ui` y a sus tests (§5.5). Las medidas son a 360 px y en tokens de §3; lo que cambia desde 640 o con ratón lo dice cada fila. Aquí se escriben enteras las props de los diez componentes que usan las demás secciones; los maillots (`Kit`, `LeaderJersey`, `ChampionSash`, `WornJerseyIcon` y `KitPicker`) solo se listan en §4.11, porque su dibujo es de §8 y §9. Las cifras con (\*) las ha medido el redactor de §3 con su script (§3). Los tipos comunes viven en `apps/web/src/components/ui/types.ts`:

```ts
// apps/web/src/components/ui/types.ts
export type Tone = 'neutral' | 'accent' | 'good' | 'warn' | 'bad' | 'info'
export type ColumnPriority = 'primary' | 'secondary' | 'optional'
/** Los valores de `data-state` (§G.4, más `veiled`, el de la RankTable velada). */
// prettier-ignore
export type UiState =
  | 'ready' | 'loading' | 'slow' | 'error' | 'empty' | 'offline' | 'disabled' | 'busy' | 'dirty'
  | 'saving' | 'saved' | 'failed' | 'open' | 'closed' | 'active' | 'inactive' | 'hidden' | 'veiled'
// prettier-ignore
export type IconName =
  | 'home' | 'rider' | 'team' | 'world' | 'news' | 'account' | 'travel' | 'race'
  | 'check' | 'warning' | 'error' | 'info' | 'offline' | 'retry' | 'close' | 'more'
  | 'chevron-left' | 'chevron-right' | 'chevron-down'
  | 'star-full' | 'star-half' | 'star-empty' | 'trend' | 'share'
/** Solo margen, ancho y sitio en la rejilla (D-10); vocabulario.test.ts comprueba sus clases (§5.2). */
export type Layout = string
```

### 4.1 Reglas comunes

- **El estado se ve en el marcado** (D-10; I-03): la raíz de cada componente lleva `data-ui="<Nombre>"`, `data-variant` y `data-state`, con los valores de §G.4 (`ready`, `loading`, `slow`, `error`, `empty`, `offline`, `disabled`, `busy`, `dirty`, `saving`, `saved`, `failed`, `open`, `closed`, `active`, `inactive`, `hidden`), más `veiled` (`UiState`). Los tests miran eso y el ARIA, nunca clases; los seis que hoy fijan clases se re-sellan contra `data-*` (`stageRoute.test.tsx` l. 19, `riderResults.test.ts` l. 112-119, `CueCard.test.tsx` l. 34, `GroupBar.test.tsx` l. 82 y 190, `PlayerControls.test.tsx` l. 145, `StageCards.test.tsx` l. 361).
- **Ningún `className` para lo suyo**: un componente no acepta clases para su color, letra, radio ni sombra, porque en Tailwind v4 dos clases de una familia las ordena la CSS emitida y no el orden escrito (la maqueta de `sistema` dejó así un `select` en 26 px). Acepta `layout` (margen, ancho y sitio en la rejilla), y nada más.
- **Foco**: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`, un anillo de 2 px a 2 px del borde (6,70:1 sobre `surface`; 10,57 en el ámbito oscuro). Ningún componente lo quita; hoy no hay ni un `focus-visible:` (mapa 01 §7).
- **Encima**: solo con `hover:`, que Tailwind v4 emite dentro de `@media (hover: hover)`: en el teléfono no existe. Cambia el fondo un paso (`accent` a `accent-strong`; `surface` a `surface-2`) y nunca enseña información que no esté ya.
- **Pulsado** (`active:`): el mismo paso que encima; nada se mueve ni cambia de tamaño.
- **Deshabilitado**: la única forma de deshabilitar es dar el porqué (`disabledReason`). El componente pone `aria-disabled="true"` (no `disabled`, para que se pueda enfocar y el lector diga el porqué), `data-state="disabled"`, `bg-disabled-bg` y `text-disabled-ink`, y pinta el porqué debajo en una línea `meta` `ink-2` enlazada con `aria-describedby`. Nunca en un `title` (regla `ui/4`, §5.3).
- **Ocupado**: `aria-busy="true"`, `data-state="busy"`, un indicador de 16 px con `animate-spin motion-reduce:animate-none` y el texto de ocupado (`Saving…`, pantalla); el texto en reposo se queda en la caja con `invisible`, para que el ancho no cambie.
- **Movimiento**: con `prefers-reduced-motion`, ni pulso, ni giro, ni transiciones (`motion-reduce:`).
- **Los tests del catálogo** pintan con `renderToStaticMarkup`, sin DOM, como los de hoy (mapa 01 §9): cada estado se pinta por sus props. La conducta que pide eventos se escribe en funciones puras que se prueban solas (`isKeyboardOpen`, §4.9), y el resto lo ven `/_ui` y la prueba del teléfono (§7).

### 4.2 `QueryView` y los estados de una consulta

`QueryView` (D-11; I-30) recibe la consulta de React Query y pinta, en el sitio del contenido, uno de seis estados. Ninguna página escribe `isPending &&` ni un `Loading…` (pantalla; regla `ui/5`), y las seis páginas que hoy pintan un fallo como vacío dejan de hacerlo (mapa 01 §4).

| `data-state` | Cuándo                                                                 | Lo que pinta                                                                                                    | Texto (pantalla)                                               | ARIA                                                   |
| ------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| `loading`    | la consulta carga                                                      | `Skeleton` con la forma de lo que viene, invisible hasta `LOADING_DELAY_MS` = 300 y visible con pulso desde ahí | ninguno a la vista                                             | `role="status"`, `Loading your training plan` (oculto) |
| `slow`       | carga desde hace `SLOW_HINT_MS` = 8.000                                | el `Skeleton` y debajo una línea `meta` `ink-2` con `Retry` (`Button` `quiet`, llama a `refetch`)               | `Still loading. Slow connection?` · `Retry`                    | la línea, en el mismo `status`                         |
| `offline`    | React Query la ha dejado en pausa por red (`fetchStatus === 'paused'`) | `OfflineState`: icono `offline` de 24 en `ink-3` y una línea `meta` `ink-2`; se rehace sola al volver la red    | `You're offline. This loads when you reconnect.`               | `role="status"`                                        |
| `error`      | la consulta falla                                                      | `ErrorState` del tipo que dé `errorKindOf` (abajo), con `refetch`                                               | `Couldn't load your training plan · Try again`                 | `role="alert"`                                         |
| `empty`      | llega e `isEmpty` dice que está vacía                                  | `EmptyState`: icono de 24 en `ink-3`, el texto en `meta` `ink-2` y una acción opcional; sin caja discontinua    | `No races in the next four weeks. This month is for building.` | ninguno                                                |
| `ready`      | llega con datos                                                        | los hijos                                                                                                       | (el contenido)                                                 | ninguno                                                |

Esperar 300 ms antes de enseñar el esqueleto evita que parpadee: en caliente la web contesta de 1,07 a 1,18 s (telefono §8.2), y un esqueleto pintado desde el primer instante destellaría en cada respuesta rápida. El esqueleto ocupa desde el principio el alto final (invisible), así que la página no salta al llegar los datos. Toda petición se corta a los `REQUEST_TIMEOUT_MS` = 15.000 (`AbortSignal.timeout` en `api/request.ts`).

`ErrorState` tiene cuatro tipos, y `errorKindOf(error)` (en `ui/QueryView.tsx`) los saca de los errores que ya lanza la web (`api/request.ts` l. 19 y 61): `ContractError` es `outdated`; `ApiError` con `status` 404, `notFound`; con `status` 0 o cortada por tiempo, `network`; cualquier otra, `server`. Anatomía: icono `error` de 24 en `bad`, una frase en `body` 600 `ink`, el detalle en `meta` `ink-2` (en `server`, el código en `caption` `ink-3`: `Error 500`), y `Try again` (`Button` `secondary` con el icono `retry`); con la web instalada (`display-mode: standalone`), además `Reload app` (`Button` `quiet`), porque en iPhone no hay barra con recarga. Textos (pantalla): `server` y `network`, `Couldn't load <label> · Try again`; `outdated`, `This version is out of date · Reload`; `notFound`, el que dé la página (`This rider doesn't exist.`); y un trozo de JS que no llega sin red, `This page needs a connection the first time.` · `Try again` (D-47). Mientras reintenta, el botón está ocupado.

`Skeleton` tiene cuatro formas: `rows` (n filas, 5 por defecto, del alto de las que sustituye: 56 en una clasificación de corredores, 44 en una de equipos y 64 en una lista de `ActionRow`; con dos barras de 12 px de alto por fila), `panel` (una barra de título de 24 y tres líneas de 16), `stat` (un rótulo de 12 y una cifra de 40) y `header` (un `h1` de 32 y una línea de 20). Bloques `bg-surface-2` con `rounded-ui`, `animate-pulse motion-reduce:animate-none`.

```ts
// apps/web/src/components/ui/QueryView.tsx
import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'

export type SkeletonShape =
  | { readonly kind: 'rows'; readonly rows?: number; readonly rowHeight?: 44 | 56 | 64 }
  | { readonly kind: 'panel' }
  | { readonly kind: 'stat' }
  | { readonly kind: 'header' }

export type ErrorKind = 'network' | 'server' | 'outdated' | 'notFound'

export interface QueryViewProps<T> {
  /** La consulta tal cual: QueryView mira `status`, `fetchStatus`, `error` y llama a `refetch`. */
  readonly query: Pick<UseQueryResult<T>, 'data' | 'error' | 'status' | 'fetchStatus' | 'refetch'>
  /** Lo que carga, en minúscula y en una frase: `your training plan`. Va al lector y al error. */
  readonly label: string
  readonly isEmpty?: (data: T) => boolean
  readonly empty?: { readonly text: string; readonly action?: ReactNode }
  /** El texto de `notFound`; sin él, un 404 se pinta como `server`. */
  readonly notFound?: string
  readonly skeleton?: SkeletonShape
  /** Pone `data-answer` en lo que pinte, en cualquiera de los seis estados (§7.3). */
  readonly answer?: boolean
  readonly children: (data: T) => ReactNode
}
```

### 4.3 La acción

| Componente   | Anatomía y medidas                                                                                                                                                                                                                                                                                                            | Variantes                                                                                                                                                                                                              | Estados y su aspecto                                                                                                                                                                                                                                                                                 | Texto (pantalla)                                                                                         | Accesibilidad                                                                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`     | `min-h-11` (44; 48 en la `ActionBar`), `px-4`, `rounded-ui`, `text-body` 600; icono de 20 a la izquierda con 8 de hueco; solo icono, 44 × 44                                                                                                                                                                                  | `primary` (`bg-accent text-on-accent`), `secondary` (`bg-surface`, borde `line-strong`, `text-ink`), `quiet` (`text-accent`, sin fondo), `danger` (`bg-bad text-white`); `size` `default` o `sm` (32 solo con `fine:`) | `ready`; encima y pulsado: `primary` a `accent-strong`, `secondary` y `quiet` a `bg-surface-2`, `danger` con `brightness-90`; foco; `disabled` con su porqué debajo; `busy` con el indicador y `busyLabel`                                                                                           | `Save plan` · `Enter race` · `Withdraw`; `Nothing to save yet. Change a day first.`                      | `<button type="button">` o `<Link>` con `to`; `aria-busy`; `aria-disabled` y `aria-describedby` al porqué; `ariaLabel` con el nombre entero en una fila  |
| `ActionBar`  | fija, a `bottom` 56 px más el área segura (sobre la `BottomNav`) y a 0 desde 640; `min-h-15` (60), `bg-surface`, `border-t border-line`, `shadow-bar`, `px-3`, ancho `max-w-page`; a la izquierda la consecuencia en `meta` `ink-2` en un renglón con `…`; a la derecha un `Button` `primary` de 48 con `data-primary-action` | ninguna                                                                                                                                                                                                                | `hidden` (sin cambios: no se pinta); `dirty`; `saving` (el botón ocupado, `Saving…`); `saved` (`Saved` con `check` en `good`, 2 s, y se oculta); `failed` (`Could not save. Try again.` en `bad` y el botón pasa a `Retry`); `offline` (el aviso en `ink-2` y el botón deshabilitado con ese porqué) | `2 changes · Race Var: Fine (was Loaded)`; `You're offline. Your changes stay here until you reconnect.` | `role="region"` con `aria-label="Unsaved changes"`; la consecuencia entera en `aria-describedby`; `saved` en `role="status"`, `failed` en `role="alert"` |
| `Segmented`  | de 2 a 4 opciones del mismo ancho a todo lo ancho, `min-h-11`, borde `line-strong` de 1 px, `rounded-ui`, separadores `line-strong`, `text-meta` 600                                                                                                                                                                          | ninguna                                                                                                                                                                                                                | cada opción `active` (`bg-accent text-on-accent`) o `inactive` (`bg-surface text-ink`); foco; la raíz `disabled` con su porqué                                                                                                                                                                       | `Coach decides` · `Mixed` · `I decide` (`PlanLadder.tsx` l. 50-54)                                       | `role="radiogroup"` con `aria-label`; cada opción `role="radio"` con `aria-checked`; flechas con índice móvil, como `Tabs`                               |
| `Field`      | rótulo encima en `meta` 600 `ink`, siempre visible; el control con `min-h-12` (48), `text-body`, `bg-surface`, borde `line-strong`, `rounded-ui`, `px-3`; ayuda o error debajo en `meta`; `Textarea` desde 96                                                                                                                 | `Input`, `Select` (nativo, con `chevron-down` de 20 a la derecha), `Textarea`                                                                                                                                          | `ready`; foco (el anillo); `error` (borde `bad`, el error en `bad` con el icono `error` de 16, `aria-invalid`); `disabled` (`disabled-bg`, `disabled-ink` y su porqué); con ratón, 40 de alto                                                                                                        | `Name` · `Must be 2 to 40 characters.`                                                                   | `<label for>`; `aria-describedby` a la ayuda y al error; nunca un campo sin rótulo (hoy cuatro, mapa 01 §7)                                              |
| `TextLink`   | en línea; subrayado siempre visible de 1 px a 2 px de la letra; en una frase, 24 px de objetivo con su espaciado (WCAG 2.5.8); en una fila, la celda entera (§4.5)                                                                                                                                                            | `default` (`text-accent`); `rider` (hereda el color, subrayado punteado `decoration-line-strong`, [DUEÑO 6])                                                                                                           | `ready`; encima, subrayado de 2 px; foco; visitado igual                                                                                                                                                                                                                                             | `Race Sardegna` · `José Quintáns`                                                                        | `<a>` o `<Link>`; nunca solo color                                                                                                                       |
| `InfoButton` | el icono `info` de 20 en un objetivo de 44 × 44 (`Button` `quiet`); despliega el porqué debajo de su línea, en el flujo, en una caja `bg-surface-2` `rounded-ui` `p-3` con `meta` `ink-2`; sin ventana                                                                                                                        | ninguna                                                                                                                                                                                                                | `closed`; `open`                                                                                                                                                                                                                                                                                     | `You don't train on travel days: 1 out, 1 back.`                                                         | `aria-expanded`, `aria-controls`; `label` obligatorio y concreto (`About travel days`)                                                                   |
| `Disclosure` | un `Button` `quiet` a todo lo ancho, de 44, con `chevron-down` que gira 180° al abrir; la región debajo                                                                                                                                                                                                                       | ninguna                                                                                                                                                                                                                | `closed`; `open`                                                                                                                                                                                                                                                                                     | `Show the 28 days` · `Hide the 28 days`                                                                  | `aria-expanded` y `aria-controls`; la región, `role="region"` con `aria-labelledby` al botón                                                             |

`Disclosure` (I-33) es para lo plegado que no es el porqué de una línea: el día a día del cuadro, que el dueño quiere debajo de la escalera ([DUEÑO 11]); `InfoButton` sustituye a los 23 `title` que el dedo no abre. Un `Chip` no se pulsa nunca: lo que se conmuta es un `Segmented`.

```ts
// apps/web/src/components/ui/Button.tsx y ui/ActionBar.tsx
export interface ButtonProps {
  readonly variant?: 'primary' | 'secondary' | 'quiet' | 'danger' // por defecto 'secondary'
  /** 'sm' pinta 32 px solo con `fine:`; con el dedo sigue en 44. */
  readonly size?: 'default' | 'sm'
  readonly children: string
  readonly icon?: IconName
  readonly busy?: boolean
  readonly busyLabel?: string // `Saving…`; por defecto, el mismo texto
  /** Si está, el botón está deshabilitado y lo dice debajo; no hay otra forma de deshabilitarlo. */
  readonly disabledReason?: string
  readonly ariaLabel?: string // el nombre entero cuando el texto es corto: `Add Race Ardèche`
  readonly type?: 'button' | 'submit'
  readonly onClick?: () => void
  readonly to?: string // enlace con aspecto de botón
  readonly layout?: Layout
}

export type ActionBarStatus = 'idle' | 'saving' | 'saved' | 'failed'

export interface ActionBarProps {
  /** Cambios sin guardar; con 0 y `idle` la barra no se pinta. */
  readonly changes: number
  /** Lo que cambia al guardar, sin el recuento: `Race Var: Fine (was Loaded)`. */
  readonly consequence: string
  readonly actionLabel: string // `Save plan`, `Save kit`, `Save orders`
  readonly status: ActionBarStatus
  readonly onSave: () => void
  readonly disabledReason?: string
}
```

La `ActionBar` lee la red con `useOnline()` (de `apps/web/src/net.ts`) y pasa sola a `offline`; las mutaciones esperan en memoria y no se reintentan solas.

### 4.4 La estructura

| Componente   | Anatomía y medidas                                                                                                                                                                                                                                                          | Variantes                                                                                                                                                                                                                      | Estados y su aspecto                                                                                                                                          | Texto (pantalla)                                                                                                                                  | Accesibilidad                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `Panel`      | `bg-surface`, `border border-line`, `rounded-ui`, `shadow-card`; título `h2` en `text-title` `ink` en una línea de 44 con una acción opcional de 44 a la derecha; relleno 12, y 16 desde 640; sin `overflow-hidden` (hoy `Panel.tsx` l. 22 recorta)                         | `default`; `bleed`, sin relleno lateral en el cuerpo, para tablas                                                                                                                                                              | `ready`; lo de dentro lo pinta su `QueryView`                                                                                                                 | `Your month` · `How you'll arrive`                                                                                                                | `<section aria-labelledby>` con su `h2`                                                                                      |
| `PageHeader` | la vuelta (en pantallas de segundo nivel): `chevron-left` y el nombre del padre en `meta` `accent`, 44 de alto; el `h1` en `text-page` `ink` sobre `canvas`; debajo, **la línea de estado** en `meta` `ink-2` (I-32); una acción opcional                                   | ninguna                                                                                                                                                                                                                        | `ready`; `loading` (la línea de estado en `Skeleton` de 20 px); sin línea de estado                                                                           | `Training` · `Mixed · your plan runs Day 51 to Day 78`; `Race Valencia`                                                                           | un `h1` por página; la línea de estado es un `<p>`, no una región viva                                                       |
| `Tabs`       | carril de `min-h-11` que se desplaza de lado sin barra visible, con un desvanecido de 24 px en el borde mientras haya más; la activa se centra al entrar (`scrollIntoView({ inline: 'center' })`); `text-meta` 600, `px-3`                                                  | `nav`, bajo la cabecera en `bg-navy-dark` y en el ámbito oscuro (activa `white` con subrayado `gold` de 3 px; inactivas `on-navy-2`); `page`, en el contenido (activa `ink` con subrayado `accent` de 3 px; inactivas `ink-2`) | cada pestaña `active` o `inactive`; foco                                                                                                                      | `Profile · Training · Race orders · My races`; `Watch · Report · Classifications`                                                                 | el patrón de `Tabs.tsx` l. 153-222 (`tablist`, `tab`, `aria-selected`, flechas); la `nav`, enlaces con `aria-current="page"` |
| `AppHeader`  | 48 más `env(safe-area-inset-top)` arriba, `bg-navy`, en el ámbito oscuro; el logotipo de 28 y `Cycling Star` en `text-title` 700 `white` (por debajo de 340 px, solo el logotipo); el reloj del mundo en `meta` `on-navy-2`; `Account` como icono en 44 × 44                | `signed-in`, `signed-out` (`Log in` en `quiet` y `Sign up` en `bg-gold text-ink`, 7,30) y `unknown` (sin red: pinta la del jugador, D-47)                                                                                      | `ready`                                                                                                                                                       | `Day 50 · S1 · 4h 56m`; `Log in` · `Sign up`                                                                                                      | `<header>`; el logotipo, enlace con `aria-label="Cycling Star home"`; el reloj, con su frase entera en `aria-label`          |
| `BottomNav`  | fija abajo, `bg-navy-dark`, en el ámbito oscuro, `border-t border-line`, `shadow-bar`; 56 más `env(safe-area-inset-bottom)`; de 3 a 5 destinos del mismo ancho, cada uno con su icono de 24 en una pastilla de 56 × 28 (`rounded-full`) y su rótulo en `caption` 600 debajo | ninguna; desde 640 no se pinta (`sm:hidden`)                                                                                                                                                                                   | cada destino `active` (pastilla `bg-surface-2` del ámbito, icono y rótulo `white`) o `inactive` (`on-navy-2`); la raíz `hidden` con el teclado abierto (§4.9) | `Dashboard` · `My Rider` · `My Team` · `World` · `News`; por debajo de 340 px, si hace falta, `Home` · `Rider` · `Team` · `World` · `News` (§6.3) | `<nav aria-label="Sections">`; `aria-current="page"`; cada destino, 56 de alto                                               |
| `Stat`       | el rótulo en `caption` 600 versales (`tracking-caps`) `ink-3`; la cifra en `text-display` con `tabular-nums` `ink`; con tono `good` o `bad` si es dinero con signo; el cero, sin signo y en `ink` (hoy `−0` en rosa, captura 03)                                            | ninguna                                                                                                                                                                                                                        | `ready`; `loading` (`Skeleton` `stat`)                                                                                                                        | `Balance` · `6,173,210`; `Weekly net` · `+780`                                                                                                    | `<dl>` con `<dt>` y `<dd>` (hoy fallan `dlitem` y `definition-list` en las fichas, mapa 05 §11)                              |

La línea de estado del `PageHeader` (I-32) es lo permanente de la página, como la capa fija de la televisión: el modo y el estado del plan se leen sin bajar; lo eventual va en `Notice` (§4.7). El reloj del mundo, que hoy no sale en el teléfono (`Header.tsx` l. 122, `hidden md:block`; mapa 04, contradicción 5), va siempre (8,15:1).

```ts
// apps/web/src/components/ui/Panel.tsx
export interface PanelProps {
  readonly title?: string // sin título, el panel no lleva `h2` y necesita `ariaLabel`
  readonly ariaLabel?: string
  readonly action?: ReactNode // un `Button` `quiet` o un `TextLink`, de 44
  readonly variant?: 'default' | 'bleed'
  readonly answer?: boolean // `data-answer` (§7.3)
  readonly children: ReactNode
  readonly layout?: Layout
}
```

### 4.5 Tablas y filas

**`RankTable`** sustituye a las diez tablas de clasificación (D-16). A 360 px es una `<table>` de filas de `min-h-11` (44) con 4 px arriba y abajo: una fila con maillot nunca mide menos de 44 (D-00b), y la de un corredor, con el maillot de 28 en el primer renglón y el equipo en el segundo, mide 56; solo una tabla sin maillot (los movimientos) baja a 36 con `fine:`. Lleva el puesto en 24 px (`meta` `tabular-nums` `ink-3`, a la derecha); la celda de identidad, con el primer renglón (`RiderLabel`, o el nombre del equipo seguido de su `Kit` de 28) y el segundo; y el valor (`row` `tabular-nums`, a la derecha, con 12 px de margen a la izquierda siempre, porque hoy el equipo toca los puntos en `Rankings.tsx` l. 39 y 49: `Northwind Cycling Team178`, pantalla). La cabecera, una fila de 32 px en `caption` 600 versales `ink-3` con `scope="col"`. Las columnas declaran su `priority`: las `primary` son columna siempre; las `secondary` se pintan en el segundo renglón de la identidad por debajo de 640 y como columna desde 640; las `optional`, en el segundo renglón por debajo de 1.024 y como columna desde 1.024. El segundo renglón une sus valores con `·` en `meta` `ink-3` y parte de línea si no cabe; solo el nombre del equipo se corta, con `…` y `data-clip-ok`. Lo que cada tabla pone en cada prioridad, en §6.1.

- **Las 20 y `Show all`**: pinta `TOP_ROWS` = 20 filas y debajo `ShowAllButton` (`ShowAll.tsx` l. 10-33) a todo lo ancho, de 44: `Show all 140` y `Show top 20` (pantalla).
- **La fila propia** (I-26): si `isOwn` da una fila más allá de la 20, tras las 20 va una fila `…` de 24 px (`aria-hidden`) y después la propia. La propia, dentro o fuera de las 20, lleva una barra `border-own` de 3 px a la izquierda (4,10:1 contra blanco), fondo `bg-own-tint`, el nombre en 600 y `aria-current="true"`.
- **El enlace del nombre** (O-28; X-18): es la celda de identidad entera, en bloque y con `min-h-11` (44), un enlace por fila; el prototipo de telefono medía 20 px de alto (uso C1), y la prueba del teléfono cuenta los enlaces de tabla como controles, no como enlaces de frase (§7.1).
- **Estados**: `ready`; `veiled` (una fila a todo lo ancho, en `meta` `ink-2` con el icono `warning` en `warn`, y `Watch` como `TextLink`: `Hidden until you watch stage 3 · Watch`, pantalla); cargando, vacío (`No riders have finished yet.`, pantalla) y error, los de su `QueryView`, con `Skeleton` `rows`.
- **Accesibilidad**: `<table>` con su `<caption>` (oculto a la vista: `General classification after stage 3`), `<th scope="col">`, la fila propia con `aria-current`. Las diferencias de tiempo, siempre con `formatTime` (D-15).

```ts
// apps/web/src/components/ui/RankTable.tsx
export interface RankTableColumn<Row> {
  readonly key: string
  readonly header: string // `Time`, `Pts`, `Team`
  readonly priority: ColumnPriority
  readonly numeric?: boolean // a la derecha y con `tabular-nums`
  readonly render: (row: Row) => ReactNode
}

export interface RankTableProps<Row> {
  readonly caption: string
  readonly rows: readonly Row[]
  readonly rowKey: (row: Row) => string
  /** El puesto; null en un DNF o un equipo fuera, que van al final sin número. Sin `rank`, la
   *  tabla no tiene columna de puesto (los movimientos y la plantilla, §6.1). */
  readonly rank?: (row: Row) => number | null
  /** El primer renglón de la identidad: `RiderLabel`, o el equipo con su `Kit`. */
  readonly identity: (row: Row) => ReactNode
  readonly href: (row: Row) => string // la celda de identidad entera enlaza aquí
  readonly columns: readonly RankTableColumn<Row>[]
  readonly isOwn?: (row: Row) => boolean
  /** Las filas que hay en total, para `Show all 140`; por defecto `rows.length`. */
  readonly total?: number
  /** El velo de E2: la etapa que hay que ver y el enlace a `Watch`. */
  readonly veil?: { readonly stage: number; readonly to: string } | null
  readonly answer?: boolean
  readonly layout?: Layout
}
```

**`ActionRow`** sustituye a las filas de `TeamCalendar` y de `MyRaces`: `min-h-16` (64; 48 con `fine:`), dos renglones y un botón. El primero, `row` `ink` (la carrera) con su clase en `caption` 600 `ink-3` (`.WT`, `.Pro`); el segundo, `meta` `ink-2` (`Day 59 · FR · Travel 336 · 2 days out, 2 back`, pantalla), que parte de línea si no cabe. A la derecha, un `Button` (`secondary` por defecto) de 44 de alto y 72 de ancho mínimo. Estados: `ready`; `busy` (el botón ocupado); `disabled` (el porqué en un tercer renglón `meta` `ink-2`, enlazado al botón: `Not enough money for the trip`, pantalla); hecha, un `Chip` `good` en lugar del botón (`Called up`). Va en un `<ul>`, cada fila es un `<li>`, y el botón lleva el nombre entero (`aria-label="Add Race Ardèche"`). Las fechas, con `formatGameDay` (§4.10).

```ts
// apps/web/src/components/ui/ActionRow.tsx
export interface ActionRowProps {
  readonly title: ReactNode // `Race Ardèche` y su clase
  readonly meta: ReactNode // el segundo renglón
  readonly href?: string // el primer renglón enlaza a la carrera
  readonly action?: {
    readonly label: string // `Add`
    readonly ariaLabel: string // `Add Race Ardèche`
    readonly onClick: () => void
    readonly variant?: 'primary' | 'secondary' | 'danger'
    readonly busy?: boolean
    readonly disabledReason?: string
  }
  /** Lo ya hecho, en lugar del botón: `{ text: 'Called up', tone: 'good' }`. */
  readonly done?: { readonly text: string; readonly tone: Tone }
  readonly layout?: Layout
}
```

**`TripRow`** (I-34) pinta el viaje como un bloque (D-43): una cabecera de 48 en `bg-info-bg` con el icono `travel` de 20 en `accent`, la carrera en `row` y lo demás en `meta` `ink-2` (`Trip to Race Sardegna (IT) · Days 55 to 61 · 7 days off training`, pantalla), y debajo, en filas, la ida, los días de carrera, los descansos (que se editan) y la vuelta, cada uno con su origen (§10.5); todo el bloque con un borde izquierdo de 4 px en `accent` y `rounded-ui`. Estados: `ready`; `active`, mientras el viaje está en curso (la cabecera añade `Now`, pantalla). Es un `<li>` con `aria-labelledby` a su cabecera y los días en una lista dentro.

### 4.6 La identidad

**`RiderLabel`** (I-18; O-17) es la identidad mínima de un corredor en cualquier lista: «Cada vez que menciones un ciclista, pon su dorsal, su equipo entre paréntesis y su bandera» (`docs/balance.md` l. 1842, v13; [DUEÑO 26]). El dueño fijó el orden el 21 de octubre de 2026: que «siempre van juntos» la bandera del país, el nombre y el maillot, en ese orden (`00-encargo.md` §7.2, l. 265-266; D-00c). **Primer renglón**, contiguos y en este orden: el dorsal cuando el contexto lo tiene (una carrera: `#214`, en `meta` `tabular-nums` `ink-2`), la `Flag` del país del corredor a 21 × 16, el nombre en `row` (humano en 600, bot en cursiva con 400, [DUEÑO 24]) como `TextLink` `rider` a su ficha, y el maillot que lleva ese día a 28 px, `KIT_PX.row` (`WornJerseyIcon`: el de líder, el de campeón o la equipación), centrado en el renglón. **Segundo renglón**: el equipo en `meta` `ink-3`, cortado con `…` y `data-clip-ok` si no cabe (el maillot lleva su nombre en el `aria-label`). **El nombre no se corta nunca**: la fila crece, y si el nombre parte de línea, el maillot va pegado a su última palabra ([DUEÑO 17], §6.4). En una frase (`inline`), todo en un renglón, como la crónica: `#214`, la bandera, `José Quintáns`, el maillot y `(Mistral Racing)`. `RiderLabel` no recibe tamaño: pinta siempre 28, y ninguna otra pieza pone una bandera junto a un maillot (D-00c). Sin estados propios (`ready`).

```ts
// apps/web/src/components/ui/RiderLabel.tsx
import type { KitCode, WornJersey } from '@cyclingstar/shared' // KitCode, de §8

export interface RiderLabelProps {
  readonly rider: {
    readonly id: string
    readonly name: string // como está guardado
    readonly human: boolean // 600; un bot, cursiva
    readonly country: string | null // ISO 3166-1 alfa-2
  }
  readonly bib?: number | null // solo donde el contexto lo tiene
  readonly team?: { readonly name: string; readonly kit: KitCode } | null
  readonly worn?: WornJersey // el maillot que lleva ese día (§9.10); sin él, el del equipo
  // sin `size`: el maillot va siempre a KIT_PX.row = 28 (D-00b)
  readonly link?: boolean // por defecto true; false dentro de una celda que ya enlaza
  readonly inline?: boolean
}
```

| Componente    | Anatomía y medidas                                                                                                                                                                                                  | Estados                                                       | Texto (pantalla)                                                        | Accesibilidad                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `RiderHeader` | el maillot de 40 (`KIT_PX.card`); el nombre en `text-page` como `h1`; un `Chip` de jugador y otro de salud; el papel y el país en `meta` `ink-2`                                                                    | `ready`; `loading` (`Skeleton` `header`); `error`; `notFound` | `José Quintáns · Player · Climber · Spain`; `This rider doesn't exist.` | `h1` con el nombre                                                     |
| `Flag`        | la bandera del sprite (D-49, §12.7) a 21 × 16 en una fila, o a la altura que se pida (12, 16 o 24), con un filete `line` de 1 px; junto a un maillot solo en `RiderLabel` (D-00c)                                   | `ready`; `empty`, sin país: un hueco de su ancho (hoy `🏳️`)   | ninguno                                                                 | `role="img"` con el nombre del país en `aria-label` (`Spain`)          |
| `StarRating`  | medias estrellas en SVG con `star-full`, `star-half` y `star-empty`, a 16 en una fila y a 20 en la ficha; las llenas, relleno `gold` con contorno `gold-ink` (7,06); las vacías, solo contorno `line-strong` (3,66) | `ready`                                                       | ninguno a la vista                                                      | `role="img"` con `aria-label="3.5 of 5 stars"`                         |
| `Icon`        | uno de los 24 de §3.7, a 16, 20 o 24, en `currentColor`                                                                                                                                                             | `ready`                                                       | ninguno                                                                 | con `label`, `role="img"` y `aria-label`; sin él, `aria-hidden="true"` |

**La ficha de corredor** (I-17; O-16) no es un componente: es una composición fija de `apps/web/src/pages/RiderProfile.tsx` (hoy 536 líneas), en este orden. (1) `RiderHeader`. (2) `Panel` `Condition`, con `data-answer` en la ficha propia: la forma en `StarRating`; el fondo y la frescura en `Meter` con la palabra de `conditionLabel` (`apps/web/src/domain/condition.ts` l. 49-53), en minúscula tras los dos puntos como en G.12: `Fitness: good`, `Freshness: low` (pantalla); los cerillos del día, de 2 a 5 según SPEC §6.6, dibujados uno a uno en un `Meter` de cinco segmentos con `3 of 5` (pantalla), como ya hace `MatchRow` (l. 155-180); y la salud en `Chip`. (3) `Panel` `Attributes`, con `data-answer` en la ajena: los diez atributos en filas de 44 con su `StarRating` y, solo en la propia, la marca de cuatro pasos (`Meter`, hoy `ProgressMark`, `AttributeList.tsx` l. 39-51) y la flecha (`trend`). (4) La frase del entrenador a la vista junto al atributo de techo más alto, el de la opinión `lo_tuyo` de `ceilingOpinions` (`packages/engine/src/coachView.ts` l. 115-150), que dice `This is your thing: your biggest potential is here.` (pantalla; `apps/web/src/domain/coachOpinion.ts` l. 19); hoy se lee una a la vez (mapa 02 §7). (5) El palmarés y los resultados en `RankTable`. La ficha ajena es la misma sin lo privado: sin condición, sin marca, sin flecha y sin frase (`docs/navegacion.md` §3.6).

### 4.7 Los avisos

| Componente      | Anatomía y medidas                                                                                                                                                                                                                                                                        | Estados                                       | Texto (pantalla)                                                                                                                      | Accesibilidad                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `Notice`        | borde izquierdo de 4 px en el color del tono, fondo del tono, `rounded-ui`, `p-3`; el icono del tono de 20; el título en `body` 600 `ink` (de 14,42 a 15,00); el texto en `meta` `ink-2` (de 6,94 a 7,22); una acción `quiet` al final; cerrar (`close`, 44 × 44) solo en `info` y `good` | `ready`; tonos `info`, `good`, `warn` y `bad` | `Results from 3 stages you haven't watched are hidden · Manage`; `Coach mode: nothing you set here is used. Switch to Mixed to edit.` | `role` según su papel: `note` (fijo), `status` (llega después), `alert` (tras una acción fallida) |
| `Chip`          | `min-h-6` (24), `px-2`, `rounded-full`, `text-caption` 600, el icono del tono de 16 delante; los colores, los del tono (§3.2); nunca se pulsa                                                                                                                                             | `ready`                                       | `Leads overall` · `Called up` · `Home race` · `Your edit`                                                                             | texto siempre; un `<span>`                                                                        |
| `OfflineBanner` | una franja de 32 px bajo la cabecera, en el flujo y no fija, `bg-warn-bg`, el icono `offline` de 16 en `warn` y el texto en `meta` `ink`; al volver la red, `bg-good-bg` con `check` durante 2 s                                                                                          | `offline`; `ready` (vuelve la red); `hidden`  | `You're offline. Showing what you saw at 14:02.`; `Back online`                                                                       | `role="status"`                                                                                   |
| `UpdateToast`   | 48 de alto, sobre la `ActionBar` (o sobre la `BottomNav` si no hay barra), `bg-navy-dark` en el ámbito oscuro, `rounded-ui`, `shadow-bar`, el texto en `meta` `white` y `Reload` como `Button` `quiet`                                                                                    | `hidden`; `ready`; `busy` (recargando)        | `A new version is ready · Reload`                                                                                                     | `role="status"`; nunca sale con `Watch` en marcha (D-48)                                          |
| `InstallHint`   | el mismo sitio y la misma forma que `UpdateToast`; en iPhone, el icono `share` y el texto; en Android, `Install app` (`Button` `primary`); cerrar con `close`                                                                                                                             | `hidden`; `ready`                             | `Add Cycling Star to your Home Screen: tap Share, then Add to Home Screen`; `Install app`                                             | `role="status"`; sale tras `INSTALL_HINT_AFTER_SESSIONS` = 3 sesiones (D-51)                      |

**Lo real y lo generado** (H-14; D-59): `Chip` `neutral` con los tres textos con que E1 ya distingue el recorrido (`docs/balance.md` l. 17430), `Real route (source cited)`, `Real towns and distance, generated terrain` y `Generated route` (pantalla). E3 da la forma; E12 decide dónde se usa. **El sitio de los avisos de página**: bajo el `PageHeader` caben como mucho dos `Notice`; un tercero va bajo la respuesta, para que `data-answer` siga en los primeros 520 px (decisión 4-e).

```ts
// apps/web/src/components/ui/Notice.tsx y ui/Chip.tsx
export interface NoticeProps {
  readonly tone: Exclude<Tone, 'neutral' | 'accent'> // 'info' | 'good' | 'warn' | 'bad'
  readonly title: string // obligatorio (D-13)
  readonly children?: ReactNode // el texto
  readonly role?: 'note' | 'status' | 'alert' // por defecto 'note'
  readonly action?: { readonly label: string; readonly to?: string; readonly onClick?: () => void }
  readonly onDismiss?: () => void // solo con tone 'info' o 'good'
}

export interface ChipProps {
  readonly tone: Tone // el icono sale del tono: good check, warn warning, bad error, info info
  readonly children: string // obligatorio; un texto vacío falla en el test del componente
}
```

### 4.8 Las escalas

**`Scale5`** (D-42; X-20) es la escala de cinco tramos de la llegada: cinco tramos iguales de `min-h-9` (36) en el ancho del panel, con 4 px de hueco y `rounded-ui`, en el orden de `ARRIVAL_ORDER` (`fundido`, `cargado`, `bien`, `perfecto`, `oxidado`: `Cooked`, `Loaded`, `Fine`, `Spot on`, `Rusty`). Los inactivos, `bg-surface-2` con borde `line-strong` y la palabra en `caption` `ink-2`; el activo, relleno de su `arrival-*` con la palabra en `caption` 700 `white` (de 5,02 a 6,57). Debajo, los ejes en `caption` `ink-3`: `◀ Too tired` a la izquierda y `Too fresh ▶` a la derecha (pantalla). Marca el tramo, nunca un punto dentro de él. A 320 px cada tramo mide unos 52 px y la palabra más larga, `Spot on`, cabe (estimado; lo mide la comprobación 2). Estados: `ready` (un tramo activo); `empty` (ninguno, y `Not enough data yet` debajo en `meta` `ink-2`); `inactive` (la carrera ya ha empezado: ninguno, y `Racing now · stage 3 of 5`). Es `role="img"` con `aria-label="Race Var: you'll arrive Loaded, 2 of 5, from too tired to too fresh"` (pantalla). La instrucción de cada tramo la escribe §10.4.

```ts
// apps/web/src/components/ui/Scale5.tsx
import type { ArrivalLabel } from '@cyclingstar/shared' // contracts.ts l. 220-221

export const ARRIVAL_ORDER = ['fundido', 'cargado', 'bien', 'perfecto', 'oxidado'] as const

export interface Scale5Props {
  readonly value: ArrivalLabel | null // null: `Not enough data yet`
  readonly racing?: { readonly stage: number; readonly stages: number } // `Racing now · stage 3 of 5`
  readonly race: string // el nombre de la carrera, para el `aria-label`
  readonly layout?: Layout
}
```

**`Meter`** sustituye a las barras con cifra (`Freshness 16 / 100`, `Home.tsx` l. 354), a `ProgressMark` y al TSS: cuatro segmentos de 8 px de alto con 4 de hueco y `rounded-full`, los llenos en `accent` (4,29:1 contra el vacío y 5,81 contra blanco, \*) y los vacíos en `line`; a su lado, la palabra en `meta` (`Freshness: low`, `Load this month: hard`, pantalla). Nunca la cifra. Con `steps={5}` sirve a los cerillos, con `3 of 5` (decisión 4-c). Estados: `ready`; `empty`, sin dato (los segmentos vacíos y `No data yet`, pantalla). Es `role="meter"` con `aria-valuemin`, `aria-valuemax`, `aria-valuenow` y `aria-valuetext` en palabras (`low`).

### 4.9 Lo fijo

D-12; O-29. De abajo arriba, a 360 × 800:

| Pieza                         | Alto                                 | Dónde                                                       | Cuándo se esconde                                                                  |
| ----------------------------- | ------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `BottomNav`                   | 56 más `env(safe-area-inset-bottom)` | fija abajo, solo por debajo de 640                          | con el teclado abierto; en `Watch`, solo si E6 acepta `useHideBottomNav` (DD-13)   |
| `ActionBar`                   | 60                                   | fija sobre la `BottomNav` (abajo del todo desde 640)        | sin cambios; con el teclado abierto                                                |
| `UpdateToast` o `InstallHint` | 48                                   | fijo sobre la `ActionBar` o, sin ella, sobre la `BottomNav` | uno solo a la vez: `UpdateToast` gana e `InstallHint` espera a la siguiente sesión |
| `OfflineBanner`               | 32                                   | bajo la cabecera, en el flujo, no fijo                      | con red                                                                            |

`AppHeader` no es fija: se va con el desplazamiento, así que con todo a la vista quedan 800 − 56 − 60 = 684 px de contenido. El marco escribe en `main` la variable `--fixed-bottom` (la suma de lo fijo visible) y `main` la lleva de relleno inferior, para que nada quede debajo de una barra. La consecuencia de la `ActionBar` va en un renglón con `…` y entera en `aria-describedby` (a 320 px partía en dos, uso). **El teclado** (H-16; sin evidencia de los jueces): mientras `isKeyboardOpen(visualViewport.height, innerHeight)` sea cierto, es decir, el alto visible baje de 0,75 veces el de la ventana, la `ActionBar` y la `BottomNav` pasan a `hidden`. La función es pura, vive en `apps/web/src/components/ui/keyboard.ts` y la prueba `ActionBar.test.tsx` con alturas simuladas; en un aparato la mira la prueba del dueño (§7.7).

### 4.10 El vocabulario de pantalla

Una palabra por cosa (D-15; I-19), en `apps/web/src/domain/words.ts`, junto a `labels.ts` y `format.ts`. Los componentes la imponen: `RankTable` llama a `formatTime` (`format.ts` l. 4-11), y `ActionRow` y `TripRow` a `formatGameDay(day, today)`, que da `Day 56` (pantalla) y, a siete días o menos, `Day 56 · in 6 days`.

| Cosa                | Se escribe (pantalla)                                                                                       | Nunca                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| un día              | `Day 56`; `Day 56 · in 6 days`; `Days 56 to 60`; `Day 12 · Season 2`                                        | `GD 56`; el día absoluto                    |
| una diferencia      | `+0:40`, `+12:05`, `+1:02:10`, `s.t.`, con `formatTime`                                                     | `+0:00:20` (`fmtTime`, `Race.tsx` l. 60-69) |
| una carrera         | `Race Var .1 · one day`; en una frase, `Race Var`                                                           | `the Race Var` (`dashboard.ts` l. 68)       |
| el viaje            | `travel out`, `travel back`, `2 travel days (1 out, 1 back)`                                                | `1d`                                        |
| el origen de un día | `Race`, `Travel`, `Your edit`, `Build · week 1`, `Team plan`, `Coach decides on the day`, `Rest (I decide)` | nada sin origen                             |
| la carga            | `Rest`, `Easy`, `Steady`, `Hard`, `Very hard`                                                               | `105 TSS`                                   |
| el dinero           | `6,173,210`, `+80`, `−80`, con `money` (`format.ts` l. 14-17)                                               | `17214` (`TeamCalendar.tsx` l. 150)         |

### 4.11 Qué sustituye cada uno

| Componente                                                           | Fichero                                   | Sustituye (la línea de hoy)                                                                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                                             | `ui/Button.tsx`                           | 111 `<button>` y 35 enlaces con 92 aspectos y seis rellenos (mapa 01 §3.3); los estilos locales de `StageGate.tsx` l. 22-25 y `OrdersGate.tsx` l. 9-12                       |
| `TextLink`                                                           | `ui/TextLink.tsx`                         | `RIDER_LINK_CLASS` (`RiderName.tsx` l. 15-16), `TeamLink` (`TeamLink.tsx` l. 8-26) y dos aspectos más (`MyRaces.tsx` l. 176, `TeamSquad.tsx` l. 184)                         |
| `ActionBar`                                                          | `ui/ActionBar.tsx`                        | `Save day edits` (pantalla; `Training.tsx` l. 324) y `Save plan` (`PlanLadder.tsx` l. 206)                                                                                   |
| `Segmented`                                                          | `ui/Segmented.tsx`                        | los botones de modo sin `aria-pressed` (`PlanLadder.tsx` l. 127-143); las pestañas a mano de `Rankings.tsx` l. 134-148                                                       |
| `Field`                                                              | `ui/Field.tsx`                            | 42 campos con 23 combinaciones; `TextField` (`TextField.tsx` l. 6-31)                                                                                                        |
| `InfoButton`                                                         | `ui/InfoButton.tsx`                       | los 23 `title` (p. ej. `MyRaces.tsx` l. 166 y 275, `TeamCalendar.tsx` l. 89-96)                                                                                              |
| `Disclosure`                                                         | `ui/Disclosure.tsx`                       | `Show the 28 days` (`Training.tsx` l. 181-190)                                                                                                                               |
| `Panel`                                                              | `ui/Panel.tsx`                            | `Panel` cian (`Panel.tsx` l. 7-33), `InfoRow` (l. 46-53) y la constante `card` (`Race.tsx` l. 71, en siete ficheros)                                                         |
| `PageHeader`                                                         | `ui/PageHeader.tsx`                       | `SectionBar` (`Panel.tsx` l. 36-43, en 18 ficheros) y 13 `h1` a mano                                                                                                         |
| `Tabs`                                                               | `ui/Tabs.tsx`                             | `Tabs`, `TabPanel`, `NavTabs` y `useTabParam` (`Tabs.tsx` l. 95-282) y sus cuatro variantes (l. 36-62)                                                                       |
| `AppHeader`, `BottomNav`                                             | `ui/AppHeader.tsx`, `ui/BottomNav.tsx`    | `Header.tsx` (l. 89-185) y `WorldClock.tsx`; `BottomNav.tsx` (l. 23-72)                                                                                                      |
| `Stat`                                                               | `ui/Stat.tsx`                             | los paneles que hacen de cifra (`MyRaces`, `TeamCalendar`; captura 15)                                                                                                       |
| `RankTable`                                                          | `ui/RankTable.tsx`                        | `GcTable` y `PointsTable` (`Race.tsx` l. 199 y 241; `StageReplay.tsx` l. 69 y 124), `TeamClassTable`, `Rankings`, `HallOfFame`, `Country`, `Finances`, `Team`                |
| `ShowAll`                                                            | `components/ShowAll.tsx` (se queda)       | nada: `RankTable` lo usa dentro; fuera `Show last N` de `RaceResults.tsx` l. 128-137 y las 10 filas de `TeamCalendar.tsx` l. 225                                             |
| `ActionRow`, `TripRow`                                               | `ui/ActionRow.tsx`, `ui/TripRow.tsx`      | las filas de `TeamCalendar` y `MyRaces`; las filas azules de viaje (`Training.tsx` l. 215-234)                                                                               |
| `RiderLabel`, `RiderHeader`                                          | `ui/RiderLabel.tsx`, `ui/RiderHeader.tsx` | `RiderName` (`RiderName.tsx` l. 15-41, en 17 sitios), `Flag` y el equipo en texto; la cabecera de `RiderProfile.tsx`                                                         |
| `Flag`                                                               | `ui/Flag.tsx`                             | `Flag.tsx` (l. 8-39) con `flag-icons` entero en la hoja (`main.tsx` l. 9)                                                                                                    |
| `StarRating`, `Icon`                                                 | `ui/StarRating.tsx`, `ui/icons.tsx`       | `StarRating.tsx` (l. 2-20, `★` con relleno por ancho); los emoji y glifos de §3.7                                                                                            |
| `Notice`, `Chip`                                                     | `ui/Notice.tsx`, `ui/Chip.tsx`            | `VeilNotice` (`VeilNotice.tsx` l. 19-55) y las ocho formas de aviso ámbar; las quince formas de chip en 23 `<span>`                                                          |
| `Skeleton`, `ErrorState`, `EmptyState`, `OfflineState`, `QueryView`  | `ui/*.tsx`                                | 44 `Loading…` (`App.tsx` l. 159), 26 «Could not load…», nueve cajas discontinuas (`MyRaces.tsx` l. 37-43) y el `Loading…` sin fin sin red                                    |
| `OfflineBanner`, `UpdateToast`, `InstallHint`                        | `ui/*.tsx`                                | nada                                                                                                                                                                         |
| `Scale5`, `Meter`                                                    | `ui/Scale5.tsx`, `ui/Meter.tsx`           | `ARRIVAL_LABEL` (`PlanLadder.tsx` l. 63-69); `ProgressMark` (`AttributeList.tsx` l. 39-51), la barra de `Home.tsx` l. 354 y `MatchRow`                                       |
| `Kit`, `LeaderJersey`, `ChampionSash`, `WornJerseyIcon`, `KitPicker` | §8 y §9                                   | `Jersey`, `LeaderJersey`, `ChampionMark` y `RiderJersey` (`Jersey.tsx` l. 17, 92, 135 y 175); `WornJerseyIcon.tsx` l. 12-18; las doce semillas de `TeamManager.tsx` l. 21-26 |

Los cinco del maillot reciben su tamaño como `KitSize` (§8), que es `28 | 40 | 48 | 72 | 96` (`KIT_PX` = `{ row: 28, card: 40, team: 48, page: 72, hero: 96 }`, D-00b): un maillot de menos de 28 px no compila, y la comprobación 10 de la prueba del teléfono (§7.1) lo vigila en la pantalla, SVG incluido.

---

**Injertos aplicados.** I-03 (§4.1: `data-ui`, `data-variant` y `data-state`, sin `className`, los seis re-sellos; `/_ui` en §5.4). I-17 (§4.6: la ficha de corredor como composición). I-18 (§4.6: el dorsal y el equipo en `RiderLabel`). I-19 (§4.10: el glosario de pantalla con su columna «Nunca», en `words.ts`). I-26 (§4.5: la fila propia anclada tras `…`; su uso por tabla, §6.2). I-30 (§4.2: el esqueleto a los 300 ms). I-32 (§4.4: la línea de estado del `PageHeader`). I-33 (§4.3: `Disclosure`). I-34 (§4.5: `TripRow`; su pantalla, §11.6).

**Objeciones resueltas.** O-16 (§4.6: la ficha de corredor). O-17 (§4.6: `RiderLabel` con dorsal y equipo). O-28 (§4.5: el enlace del nombre es la celda entera, de 44). O-29 (§4.9: el orden de lo fijo, un aviso flotante a la vez, la consecuencia en un renglón y el teclado). O-31 (§4.7: `Notice` y `Chip` exigen tono y texto en su tipo, con el icono del tono; los tonos, §3.2).

**Huecos rellenados.** H-14 (§4.7: el `Chip` de lo real y lo generado, con los tres textos de E1).

**Decisiones de esta sección.**

- **4-a**, `layout` es un `string` con solo utilidades de margen, ancho y colocación, y lo hace cumplir `vocabulario.test.ts` (§5.2), porque ninguna de las diez reglas de lint lo mira. Descartado: un tipo con prefijos de clase, que TypeScript no comprueba dentro de una cadena con espacios.
- **4-b**, la única forma de deshabilitar es `disabledReason`, con `aria-disabled` y no `disabled`, para que el control se pueda enfocar y el lector diga el porqué.
- **4-c**, los cerillos se dibujan en un `Meter` de cinco segmentos (`steps={5}`), como ya hace `MatchRow`, y no con un icono: D-07 cierra el juego de iconos en 24 y no hay icono de cerillo.
- **4-d**, las estrellas llenas son `gold` con contorno `gold-ink`: el `gold` solo queda a 2,27:1 contra blanco (\*), por debajo del 3:1 que WCAG 1.4.11 pide a un gráfico, y el contorno da 7,06. Descartado: un token `star` nuevo.
- **4-e**, como mucho dos `Notice` sobre la respuesta; el resto, debajo.
- **4-f**, `AppHeader` no es fija, para que lo fijo no pase de 116 px a 360 × 800; `Cycling Star` se esconde por debajo de 340 px y queda el logotipo.
- **4-g**, `ErrorState` saca su tipo de los errores que ya lanza la web (`ContractError`, `ApiError` con su `status`), con `errorKindOf`; ningún error nuevo en `api/request.ts`.
- **4-h**, el `danger` encima y pulsado usa `brightness-90` en lugar de un token más; el blanco encima pasa de 6,57 a unos 7,6 (estimado: los canales sRGB por 0,9).
- **4-i**, la identidad de un equipo en una tabla es su nombre seguido de su maillot de 28, el mismo orden que el corredor de `RiderLabel` (D-00c), y sin bandera al lado.
- **4-j**, la fila de `RankTable` es de 44 px como mínimo y de 56 con dos renglones, porque el maillot de 28 (D-00b) va en el primer renglón; la fila de 36 con ratón de D-06 queda para las tablas sin maillot. Escribe D-00b y D-00c como hechos.

---

## 5. El sistema que se hace cumplir

Una guía de estilo no impide nada: el `@theme` ya existe (`index.css` l. 5-12) y el 95 % del color de la web pasa por fuera de él (mapa 01 §2.2). Lo que impide reinventar (O-06) son tres piezas de `sistema` (I-01, D-14): el tema cerrado en el último paso, una deuda medida fichero a fichero que solo baja, y diez reglas de lint; y una cuarta, `/_ui` (I-03). Hasta el paso 22 todo lo de hoy sigue resolviendo y cada PR deja el juego desplegable.

### 5.1 El tema cerrado

El cierre son estas 17 líneas, las primeras del `@theme` de §3.9, que hasta el paso 22 van comentadas:

```css
--color-*: initial;
--font-*: initial;
--font-weight-*: initial;
--text-*: initial;
--tracking-*: initial;
--leading-*: initial;
--radius-*: initial;
--shadow-*: initial;
--inset-shadow-*: initial;
--drop-shadow-*: initial;
--text-shadow-*: initial;
--blur-*: initial;
--perspective-*: initial;
--aspect-*: initial;
--animate-*: initial;
--breakpoint-*: initial;
--container-*: initial;
```

Con ellas activas, Tailwind 4.3.3 deja de generar todo valor de su tema por defecto que el bloque no vuelva a declarar (X-11, comprobado por el juez de código con `__unstable__loadDesignSystem`, C4): no resuelven `bg-indigo-600`, `text-white` (salvo que el tema declare `white`, como hace el de §3), `max-w-6xl`, `rounded-2xl` ni `shadow-sm`; sí siguen resolviendo los valores arbitrarios (`text-[11px]`) y los pasos libres de espaciado (`p-5`), que por eso cuenta aparte `vocabulario.test.ts` (§5.2).

**Lo que deja de resolver**, medido con el compilador de Tailwind 4.3.3 sobre las 146 fuentes de producción de `apps/web/src`: con los tokens de `sistema` (`propuesta-sistema/tw/cerrado.css`), 2.457 de 6.322 apariciones, el 38,9 %, en 176 clases (sistema §0). Con los de este documento, medido por el redactor de esta sección con el mismo script (`<scratchpad>/redactor-L1/cierre-sistema.mjs` sobre el `@theme` de §3.11 con el cierre activo), **2.740 de 6.322, el 43,3 %, en 183 clases**: color 1.451, tamaño de letra 683, peso y familia 255 (`font-medium` 243 y `font-mono` 12), radio 205, interletraje e interlineado 72, sombra 43, ancho máximo 24, cortes 4 y otras 3. La diferencia sale de que este tema no conserva `font-medium`, `rounded-md`, `rounded-lg` ni los `brand-*`, que `sistema` sí, y declara `white`, que `sistema` no. `deuda.json` nace con la segunda cifra. Los 6.322 son del escáner de Tailwind, que ve también los `.ts`; el mapa 01 contó 6.244 en el árbol de sintaxis (X-22, las dos ciertas): manda el escáner, porque es el del compilador que decide qué resuelve. Los ficheros con más deuda: `pages/Race.tsx` 187 de 408, `pages/MyRaces.tsx` 132 de 312, `pages/TeamCalendar.tsx` 110 de 256, `pages/AdminNames.tsx` 104 de 213 y `pages/RacesIndex.tsx` 100 de 252 (medido, la misma pasada).

**Los arbitrarios que se quedan**, cada uno con su motivo, en `ARBITRARY_ALLOWED` de `vocabulario.test.ts` (decisión 5-a): `pt-[env(safe-area-inset-top)]` y `pb-[env(safe-area-inset-bottom)]` (el área segura, que ningún token puede expresar); `pb-[var(--fixed-bottom)]` (la suma de lo fijo, §4.9); `@max-[21.25rem]:` (el plan B de los rótulos de `BottomNav` y el nombre de `AppHeader`, §6.3); y la máscara del desvanecido de `Tabs`, `[mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)]`. Ningún otro.

**Por qué al final y no al principio**: cerrar primero rompería a la vez 2.740 apariciones en 146 ficheros; cerrar al final convierte cada página en un PR que se puede desplegar. El PR del paso 22 hace cuatro cosas: activa las 17 líneas, borra los seis `brand-*` heredados (decisión 3-f), borra `deuda.json` y vacía la lista de heredados del lint, que pasa entero a `error` (§5.3). Desde ahí, `vocabulario.test.ts` exige cero.

### 5.2 `vocabulario.test.ts` y `deuda.json`

`apps/web/src/components/ui/vocabulario.test.ts` carga dos sistemas de diseño con `__unstable__loadDesignSystem` de `@tailwindcss/node`: el de `apps/web/src/index.css` tal como está y el cerrado (el mismo fichero con las 17 líneas activas, que el test inyecta hasta el paso 22). Saca las clases de cada fichero de producción de `apps/web/src` (sin tests ni `__fixtures__`) con el `Scanner` de `@tailwindcss/oxide`, el mismo que usa el plugin de Vite, y cuenta por fichero cuatro cosas:

1. `tema`: las apariciones que resuelven con el tema abierto y no con el cerrado.
2. `arbitrarios`: las apariciones con `[` que no están en `ARBITRARY_ALLOWED`.
3. `espaciado`: las utilidades de relleno, margen y hueco (`p-*`, `m-*`, `gap-*`, `space-*`, con sus ejes y sus negativos) con un paso que no está en `SPACING_STEPS`; los tamaños (`w-*`, `h-*`, `min-h-*`) quedan libres. Hoy, 38 de 1.342 (sistema §3.3, medido: `p-5` 16, `pl-7` 6…).
4. `layout`: las clases de una prop `layout` que no son de margen, ancho, alto o colocación en la rejilla (decisión 4-a).

El test falla si una cifra de un fichero sube sobre la de `deuda.json`, si un fichero que no está en `deuda.json` tiene alguna, y también si una baja sin que el PR lo apunte: la bajada se escribe en el mismo PR que la consigue. **Dos sondas** lo hacen fallar si el instrumento deja de medir: `bg-surface` tiene que resolver con los dos sistemas, y `bg-indigo-600` no puede resolver con el cerrado. `__unstable__loadDesignSystem` es una API inestable (sistema §14), así que `tailwindcss`, `@tailwindcss/vite`, `@tailwindcss/node` y `@tailwindcss/oxide` van a la versión exacta `4.3.3` en `apps/web/package.json` (hoy `^4.3.3`, l. 26 y 30; los dos últimos ya están en el almacén de pnpm, que usa el plugin).

```ts
// apps/web/src/components/ui/deuda.json, con este tipo (en vocabulario.test.ts)
interface Cuenta {
  readonly tema: number
  readonly arbitrarios: number
  readonly espaciado: number
  readonly layout: number
}
interface Deuda {
  readonly tailwindcss: '4.3.3'
  readonly total: Cuenta
  readonly ficheros: Readonly<Record<string, Cuenta>> // ruta desde la raíz; sin deuda, no aparece
}
```

El paso 8 lo escribe entero; sus `tema` son los de §5.1 (por ejemplo, `"apps/web/src/pages/Race.tsx": { "tema": 187, … }`), y los otros tres contadores los mide ese paso. Cada PR de la cola larga (paso 21) baja las cifras de las páginas que migra, y una página que llega a cero sale del fichero.

### 5.3 Las diez reglas

Diez selectores de `no-restricted-syntax` en `apps/web/eslint-ui.mjs`, cada uno con un mensaje que empieza por su número, para que se cuenten por regla (sistema §2 y §12, `tw/eslint.ui.mjs`). Corren sobre `apps/web/src/**/*.{ts,tsx}` salvo los tests, `apps/web/src/components/ui/**` y los `*.generated.ts`; no solo sobre `pages/`, porque `components/` tiene los hexadecimales de v3 de `broadcast/` (mapa 01 §2.4).

| Regla   | Prohíbe                                                                                                   | Mensaje                                                                             | Avisos hoy |
| ------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------- |
| `ui/1`  | un `<button>`                                                                                             | `ui/1 button: use <Button> from components/ui`                                      | 111        |
| `ui/2`  | una `<table>`                                                                                             | `ui/2 table: use <RankTable> from components/ui`                                    | 15         |
| `ui/3`  | `<input>`, `<select>` o `<textarea>`                                                                      | `ui/3 field: use <Field> from components/ui`                                        | 42         |
| `ui/4`  | `title` en un elemento HTML                                                                               | `ui/4 title: nothing lives only in a title; use <InfoButton>`                       | 23         |
| `ui/5`  | los textos `Loading…`, `Could not load` y `Could not reach` (pantalla)                                    | `ui/5 hand-made state: use <QueryView>`                                             | 70         |
| `ui/6`  | una clase de color de la paleta de Tailwind (`text-`, `bg-`, `border-`… con `slate`, `indigo`… y su paso) | `ui/6 Tailwind palette colour: use a token`                                         | 1.058      |
| `ui/7`  | un valor arbitrario (`-[…]`)                                                                              | `ui/7 arbitrary value: use a token, or add it to ARBITRARY_ALLOWED with its reason` | 39         |
| `ui/8`  | un literal hexadecimal (`#rgb`, `#rrggbb`, `#rrggbbaa`)                                                   | `ui/8 hex colour: use a token`                                                      | 28         |
| `ui/9`  | el atributo `style`                                                                                       | `ui/9 inline style`                                                                 | 8          |
| `ui/10` | un emoji en un texto o un literal (`\u{1F300}` a `\u{1FAFF}` y `\u{2600}` a `\u{27BF}`)                   | `ui/10 emoji in the interface: use <Icon>`                                          | 23         |

Los avisos de hoy son los que midió `sistema` con el ESLint 9.39.5 del repositorio (`propuesta-sistema/tw/eslint.ui.json`): **1.417 en 83 ficheros**, sobre los `.tsx`; con los `.ts` (los hexadecimales de `visuals.ts`, por ejemplo) habrá alguno más, y el paso 8 escribe la cifra exacta. Los mensajes van en inglés, como los del lint de hoy. **De `warn` a `error`** (X-12): `eslint.config.js` importa `UI_RULES` y `UI_HEREDADOS` de `eslint-ui.mjs` en dos bloques, uno con `'no-restricted-syntax': ['error', ...UI_RULES]` para todos los ficheros y otro, detrás, con `'warn'` solo para los de `UI_HEREDADOS`: en la configuración plana el segundo bloque reemplaza al primero para esos ficheros (lo advierte `eslint.config.js` l. 184-186), y ningún bloque de hoy usa esa regla en `apps/web` (las dos que hay son del motor, l. 93 y 187). Un fichero nuevo nace en `error`; uno heredado avisa sin parar el CI, porque `pnpm lint` (`eslint .`, `package.json` l. 23; `ci.yml` l. 252) no lleva `--max-warnings`. `apps/web/src/components/ui/heredados.test.ts` falla si un fichero de la lista ya no tiene ningún aviso `ui/`, así que la lista solo encoge; el paso 22 la vacía. El lint ya corre sobre `.tsx` en el CI (`eslint.config.js` l. 228 y 255, juez de código C6): las reglas no piden otro trabajo, y `00-encargo.md` §6.7 («`.js` y `.mjs`») se queda corto.

### 5.4 `/_ui`

Una ruta de la web, sin enlace desde ningún sitio, con `<meta name="robots" content="noindex">`, en su propio trozo (`React.lazy`, como las demás páginas, `App.tsx` l. 32-80), que pinta cada componente de §4 en cada uno de sus estados con datos fijos y sin llamar a la API (D-10). Una sección por componente (`<section data-ui-demo="Button">`) con un ejemplo por estado, primero sobre `canvas` y después dentro de `[data-surface='dark']` los que viven allí. Los datos fijos (`apps/web/src/pages/ui/fixtures.ts`) son los casos difíciles medidos: el nombre de corredor más largo del mundo de prueba (28 caracteres, telefono §5.1), el título más largo, `U23 time trial champion of Saint Vincent and the Grenadines` (59 caracteres, D-56), una clasificación de 140 filas con la fila propia en el puesto 34, una consecuencia de `ActionBar` que no cabe a 320 px, y una consulta en cada uno de sus seis estados. Es la primera página de la prueba del teléfono (§7.4) y donde el dueño mira el sistema en su teléfono.

**Cómo se añade un componente**: el PR crea `ui/<Nombre>.tsx` y `ui/<Nombre>.test.tsx` (un caso por estado, mirando `data-state` y el ARIA), y su sección en `/_ui`; la prueba del teléfono sobre `/_ui` tiene que seguir a cero.

### 5.5 Cuando lleguen las once épicas que faltan

E4 a E13 traen pantallas nuevas. Entran por dos puertas:

- **Un componente nuevo** solo entra con el PR de §5.4 (componente, test por estado y sección en `/_ui`) y con su fila en §4 de este documento; una página no puede inventar aspecto, porque las reglas de §5.3 la paran y, tras el paso 22, el tema no genera lo que no declara. Si necesita un estado que no está, lo añade a `UiState` (`ui/types.ts`) y a su test.
- **Un token nuevo** entra en el `@theme` con su pareja en `tokens.test.ts` (su contraste contra cada fondo en que se use, y en los dos ámbitos si vive en los dos) y con su fila en la tabla de §3.1 en el mismo PR. Sin la pareja, `tokens.test.ts` falla, porque comprueba que cada `--color-*` del bloque tiene al menos una.

---

**Injertos aplicados.** I-01 (§5.1 a §5.3: el tema cerrado al final, `vocabulario.test.ts` con `deuda.json` y las diez reglas con su lista de heredados). I-03 (§5.4: `/_ui`; los `data-*` y los re-sellos, §4.1).

**Objeciones resueltas.** O-06 (§5.1 a §5.3: con el tema abierto nada impedía reinventar; ahora lo impiden el cierre, la deuda que solo baja y las reglas sobre `apps/web/src/**`, no solo sobre `pages/`).

**Huecos rellenados.** Ninguno (§B no asigna ninguno a §5).

**Contradicciones de hecho.** X-11 (§5.1: el cierre con `initial`, cierto: los arbitrarios siguen resolviendo). X-12 (§5.3: el lint ya corre sobre `.tsx`). X-22 (§5.1: los 6.322 del escáner frente a los 6.244 del mapa 01; manda el escáner).

**Decisiones de esta sección.**

- **5-a**, la lista de arbitrarios permitidos son cinco, los de §5.1, porque expresan lo que un token no puede (el área segura, una variable que escribe el marco, una consulta de contenedor y una máscara); cualquier otro es deuda.
- **5-b**, la deuda inicial es la del tema de este documento (2.740), no la de `sistema` (2.457), porque es la que el cierre del paso 22 va a exigir.
- **5-c**, la lista de heredados encoge con un test (`heredados.test.ts`) y no a mano, para que no quede un fichero limpio en `warn`.
- **5-d**, `espaciado` cuenta relleno, margen y hueco, no tamaños: `min-h-11` (44) o `min-h-15` (60) son medidas de §3.5 y no pasos de espaciado.
- **5-e**, los mensajes de las reglas van en inglés, como los de ESLint y los del lint de hoy; los de `sistema` estaban en castellano.

---

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

---

## 7. La prueba del teléfono: el criterio de aceptación

«Se juega bien en un teléfono» es una prueba del CI (D-18): `apps/web/e2e/telefono.spec.ts`, con Playwright, sobre `/_ui` y sobre las 45 pantallas del mapa 05, a 360 × 800 y a 320 × 640 px con tacto (`hasTouch`, `isMobile`) y relación de píxeles 2. Una pantalla se juega bien en un teléfono cuando pasa las diez comprobaciones de §7.1: las nueve de D-18 y la décima, la del maillot, que añadió el dueño el 21 de octubre de 2026 al fijar que un maillot no se pinta nunca por debajo de 28 px (D-00b); E3 está terminado cuando `telefono-baseline.json` está a cero en todas (§7.4). Lo que la prueba no ve lo mira el dueño en su teléfono (§7.7) o queda como riesgo (§7.8).

### 7.1 Las diez comprobaciones

| #   | Qué mide        | Cómo lo mide, en la página                                                                                                                                                                                                                                                                                                                   | Umbral                                | Hoy (mapa 05, a 360)                                                                                                                                                                     | En el prototipo de telefono (uso C1)                                   |
| --- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | el reflujo      | `document.documentElement.scrollWidth` frente a `innerWidth`, tras cargar y volver arriba                                                                                                                                                                                                                                                    | iguales, a 360 y a 320                | 45 de 45 a 360; a 320, sin medir                                                                                                                                                         | cumple a 360 y a 320                                                   |
| 2   | los recortes    | todo elemento visible con `overflow-x` `hidden` o `clip`, o con `text-overflow: ellipsis`, cuyo `scrollWidth` pase de su `clientWidth` en más de 1 px, sin `[data-clip-ok]` en él ni en un antepasado                                                                                                                                        | 0                                     | no contado; a la vista, el calendario del equipo, la plantilla, la nación y la barra inferior con cinco destinos                                                                         | 0                                                                      |
| 3   | la letra        | cada nodo de texto visible (un `TreeWalker` de `SHOW_TEXT`, con caja de ancho mayor que 0): `getComputedStyle` de su padre; en un `<text>` de SVG, por la escala de `getScreenCTM()`                                                                                                                                                         | 12 px o más (`MIN_FONT_PX`)           | 8 px en `Watch`; 10 y 11 en tablas y fichas; 11 en la barra inferior                                                                                                                     | 12; ningún nodo por debajo                                             |
| 4   | los campos      | `font-size` calculado de cada `input`, `select` y `textarea` visible                                                                                                                                                                                                                                                                         | 16 px o más (`MIN_FIELD_FONT_PX`)     | 34 de 42 a 14 px (mapa 01 §2.2)                                                                                                                                                          | 0 por debajo                                                           |
| 5   | los objetivos   | la caja de cada `a[href]`, `button`, `input`, `select`, `textarea`, `summary`, `[role=tab]` y `[role=button]` visible: 44 × 44 (`MIN_TARGET_PX`); un enlace dentro de una frase (en línea y con más texto en su bloque), 24 × 24 o con un círculo de 24 px que no toque otro objetivo; los enlaces de tabla y de fila cuentan como controles | 0 por debajo                          | el más bajo, de 13 a 20 px en 30 pantallas                                                                                                                                               | 4: los enlaces de nombre de 20 px de alto, que con esta regla no pasan |
| 6   | axe-core 4.10.3 | `axe.run(document)` con `runOnly` en `color-contrast`, `target-size`, `select-name`, `button-name`, `link-name`, `label`, `dlitem` y `definition-list`                                                                                                                                                                                       | 0 nodos                               | 2.816 de contraste; 40 de `dlitem`; `select-name` en 01, 29 y 45; 25 de `target-size`                                                                                                    | 0                                                                      |
| 7   | la respuesta    | el borde superior de `[data-answer]` (`getBoundingClientRect().top` más `scrollY`) arriba del todo, a 360 × 800; falla si no hay ninguno, si hay dos o si su `data-ui` no es el de §7.3                                                                                                                                                      | 520 px o menos (`ANSWER_MAX_TOP_PX`)  | 1.060 en `/me/training`; la capa fija de `Watch`, 328                                                                                                                                    | 152, con 297 a la vista                                                |
| 8   | la acción       | tras la edición de la pantalla (`edit`, §7.3), `[data-primary-action]` visible y entera en el 40 % de abajo de la ventana (`THUMB_ZONE`), arriba del todo y al final del desplazamiento                                                                                                                                                      | en las dos posiciones                 | `Save day edits` (pantalla), hacia los 6.700 px                                                                                                                                          | a 687 de 800                                                           |
| 9   | el alto         | `document.documentElement.scrollHeight` en el estado inicial, en las pantallas de herramienta                                                                                                                                                                                                                                                | 3.200 px o menos (`TOOL_PAGE_MAX_PX`) | 19.914 la inscripción; 6.887 el calendario del equipo; 6.807 el plan                                                                                                                     | 1.277 (1.349 a 320)                                                    |
| 10  | el maillot      | cada `svg[data-kit]` visible: su `getBoundingClientRect()`, alto y ancho; falla el que mide menos de `KIT_MIN_PX` (28, importado de `packages/shared/src/kit.ts`) en cualquiera de los dos                                                                                                                                                   | 28 px o más (D-00b)                   | 13 px en la barra de grupos de `Watch` (`GroupBar.tsx` l. 242; capturas 08, 09 y 35); 15 × 15 los de líder en la general (captura 05, mapa 05 §7); 34 las candidatas de `/team/identity` | no pinta maillots                                                      |

Cada comprobación da un número de faltas por pantalla y ancho, que es lo que guarda la línea base: la 1, la 7, la 8 y la 9 dan 0 o 1; la 2, los elementos recortados; la 3, los nodos de texto; la 4, los campos; la 5, los objetivos; la 6, los nodos de axe; la 10, los maillots por debajo de 28. Para que la 10 vea los maillots de hoy, el PR del paso 2 pone `data-kit` en los tres `<svg>` de `Jersey.tsx` (l. 20, 104 y 153), sin tocar su aspecto; desde el paso 17 lo llevan `Kit`, `LeaderJersey` y `ChampionSash`, con su `KitCode` o su papel por valor (decisión 7-g). La 7 solo corre a 360 × 800, donde está definida; la 8, en las pantallas con `edit`; la 9, en las de herramienta: donde no corren, la línea base guarda `null`. Las cuatro constantes de letra y dedo se importan de `apps/web/src/components/ui/constants.ts`, y `PHONE_REF`, `PHONE_MIN`, `ANSWER_MAX_TOP_PX`, `THUMB_ZONE` y `TOOL_PAGE_MAX_PX`, de `apps/web/e2e/telefono.config.ts` (D-02).

### 7.2 El mundo de la prueba

H-15; O-26. `apps/web/e2e/world/build.mjs` es el port de `capturas/mundo.mjs` (248 líneas), el mismo mundo que midió el mapa 05:

1. **La base**: PGlite 0.5.4 servida por socket, con todas las migraciones (`runMigrations`), como `packages/db/src/testDb.ts` l. 58-109. PGlite tiene una sola sesión (l. 16-19): cada fase abre su conexión y la cierra, y la API va con `DB_POOL_MAX=1`.
2. **La génesis**: `runTick` con `forceDays: 0` y `GENESIS_WORLD_SEED`, que crea el mundo con `seedWorld` (`tick.ts` l. 265 y 70).
3. **Las cuentas**, el día 0, por la API de verdad (`buildApp` y better-auth con `app.inject`): el jugador, inscrito por `POST /api/riders/me/race-entries/:raceId` (`routes/riders.ts` l. 775) a Race Murcia y Race Jaén, en casa, y a Race Var y Race Sardegna, fuera; el mánager, con su corredor; y la cuenta sin corredor. **Las cuatro escrituras con SQL** del mapa 05 §1, porque el juego no las da en un mundo recién creado: el correo confirmado (`update users set email_verified = true`, como `apps/api/src/adminPanel.test.ts` l. 36); 400 de dinero al jugador (nace con 0 y un agente libre no sale de su país sin poder pagarse el viaje, `calendarRun.ts` l. 716); el contrato del corredor del mánager en un equipo WorldTour de su país, escrito como lo escribe `acceptOffer` (el mercado no ofrece nada por debajo de `MIN_RATING_FOR_OFFERS` = 0,42, `packages/db/src/contracts.ts` l. 75); y `premium` del mánager.
4. **El calendario**: 50 días por `runTick`, de 40 en 40, con `timelineRecord: 'on'`, como en producción (849 s, 17 s por día, medido por el mapa 05 §1). El último día, el mánager toma su equipo (`POST /api/teams/take-over`) y los dos corredores guardan el mismo plan de bloques.
5. **El volcado**: `dumpDataDir` en `mundo-50.tar.gz` y las cuentas en `cuentas.json`.

Cada paso comprueba su respuesta y el script falla si no es la esperada: una toma del equipo que no da 200, o un mundo que no acaba con 219 equipos, no puede llegar a la caché (decisión 7-a). El servidor de la prueba es `apps/web/e2e/world/serve.mjs`, el port de `capturas/servir.mjs`: `buildApp` con better-auth, la web compilada de `apps/web/dist`, `BROADCAST_WATCH` y `SPOILER_MODE` en `on` como en producción, sin tick, con el ancla del reloj (`worlds.created_at`) puesta para que la cuenta atrás no salga vencida, y una IP propia en `x-forwarded-for` por contexto, porque el límite de la API es de 300 peticiones por minuto e IP (`apps/api/src/security.ts` l. 10). **La caché del CI**: el mundo cuesta unos 15 minutos en una máquina de cuatro núcleos (`capturas/README.md`) y su volcado pesa 161 MB (medido por el redactor con `ls -l` sobre el `mundo-50.tar.gz` del mapa 05, en `<scratchpad>/mundo05/`). Se guarda con `actions/cache` y la clave `telefono-mundo-v1-` más la huella de `packages/db/drizzle/**`, `packages/engine/src/**` y `apps/web/e2e/world/build.mjs`: si cambia una migración, el motor o el script, se reconstruye. El PR del paso 2 mide el tamaño del archivo en la caché y su tiempo de restauración y los escribe en su descripción (D-18, sin evidencia de los jueces). **Lo que no vale** (X-23): «génesis y tres días» (telefono §5.3) no da las pantallas medidas: sin carreras terminadas, sin viaje, sin mánager y sin plan de bloques.

### 7.3 Las 45 pantallas

`TELEFONO_PANTALLAS` (O-27) tiene una entrada por cada fila con medidas de `capturas/README.md` (01 a 37 y 40 a 47). El `data-answer` es de este documento: dice qué contesta cada pantalla, y la sección que rediseña la pantalla lo pone en ese elemento. `QueryView` lo pasa a lo que pinte (§4.2), así que en las pantallas de estado (40 a 47) lo lleva el esqueleto, el error o el vacío.

| #   | Ruta                                                                 | Cuenta    | `data-answer`                                  | Herramienta | `edit` (comprobación 8)                   |
| --- | -------------------------------------------------------------------- | --------- | ---------------------------------------------- | ----------- | ----------------------------------------- |
| 01  | `/me/training`                                                       | jugador   | `Panel` `How you'll arrive` (pantalla)         | sí          | cambia el bloque de la semana 1           |
| 02  | `/me/races`                                                          | jugador   | `Panel` `On your programme`                    | sí          | ninguna                                   |
| 03  | `/me/races?tab=enter`                                                | jugador   | `Panel` `Available to enter`                   | sí          | ninguna                                   |
| 04  | `/me/profile`                                                        | jugador   | `Panel` `Condition`                            | no          | ninguna                                   |
| 05  | `/world/races/race-valencia`                                         | visitante | `RankTable`, la general                        | no          | ninguna                                   |
| 06  | `/world/races/race-valencia?tab=classifications&cls=teams`           | visitante | `RankTable`, los equipos                       | no          | ninguna                                   |
| 07  | `/world/races/race-emirates`                                         | visitante | `RankTable`, la general                        | no          | ninguna                                   |
| 08  | `/world/races/race-valencia/stages/3`                                | visitante | `FixedOverlay`, la capa fija                   | no          | ninguna                                   |
| 09  | la misma, ocho segundos después de `Play`                            | visitante | `FixedOverlay`                                 | no          | ninguna                                   |
| 10  | `/world/races/race-valencia/stages/3/report`                         | visitante | `RankTable`, el resultado                      | no          | ninguna                                   |
| 11  | `/world/rankings`                                                    | visitante | `RankTable`, el ranking                        | no          | ninguna                                   |
| 12  | `/world/teams/<el primer WorldTour de GET /api/teams>`               | visitante | `RankTable`, la plantilla                      | no          | ninguna                                   |
| 13  | `/world/riders/<el primero de GET /api/rankings>`                    | visitante | `Panel` `Attributes`                           | no          | ninguna                                   |
| 14  | `/team/squad`                                                        | manager   | `RankTable`, la plantilla                      | no          | ninguna                                   |
| 15  | `/team/calendar`                                                     | manager   | `Panel` del plan de carreras                   | sí          | ninguna                                   |
| 16  | `/team/identity`                                                     | manager   | `KitPicker`, el maillot a 72 px                | sí          | desde el paso 18, cambia el color de base |
| 17  | `/`                                                                  | jugador   | `Panel` de lo siguiente (`dashboard.ts`)       | no          | ninguna                                   |
| 18  | `/`                                                                  | visitante | `Panel` de bienvenida, con `Create account`    | no          | ninguna                                   |
| 19  | `/news`                                                              | visitante | `Panel` de las noticias                        | no          | ninguna                                   |
| 20  | `/world/races`                                                       | visitante | `Panel` de las carreras                        | no          | ninguna                                   |
| 21  | `/world/teams`                                                       | visitante | `Panel` de los equipos                         | no          | ninguna                                   |
| 22  | `/world/nations`                                                     | visitante | `Panel` de los países                          | no          | ninguna                                   |
| 23  | `/world/nations/ES`                                                  | visitante | `RankTable`, el ranking de España              | no          | ninguna                                   |
| 24  | `/world/hall-of-fame`                                                | visitante | `RankTable`                                    | no          | ninguna                                   |
| 25  | `/me/orders`                                                         | jugador   | `Panel` de las órdenes de Race Var             | sí          | cambia el papel de la primera etapa       |
| 26  | `/me/contract`                                                       | jugador   | `Panel` de las ofertas                         | sí          | ninguna                                   |
| 27  | `/me/finances`                                                       | jugador   | `Stat` `Balance`                               | no          | ninguna                                   |
| 28  | `/account`                                                           | jugador   | `Panel` de la protección de resultados         | sí          | ninguna                                   |
| 29  | `/me/training`                                                       | manager   | `Panel` `How you'll arrive`                    | sí          | cambia el bloque de la semana 1           |
| 30  | `/`                                                                  | manager   | `Panel` de lo siguiente                        | no          | ninguna                                   |
| 31  | `/login`                                                             | visitante | `Panel` del acceso                             | sí          | ninguna                                   |
| 32  | `/register`                                                          | visitante | `Panel` del registro                           | sí          | ninguna                                   |
| 33  | `/how-to-play`                                                       | visitante | el primer `Panel`                              | no          | ninguna                                   |
| 34  | `/create`                                                            | nuevo     | `Panel` de la creación del corredor            | sí          | ninguna                                   |
| 35  | `/world/races/race-jaen`                                             | visitante | `FixedOverlay`                                 | no          | ninguna                                   |
| 36  | `/world/races/race-valencia/stages/3?tab=classifications`            | visitante | `RankTable`, la general tras la etapa          | no          | ninguna                                   |
| 37  | `/me/races?tab=results`                                              | jugador   | `RankTable`, los resultados (velados)          | no          | ninguna                                   |
| 40  | `/me/training`, con `/api/riders/me/orders` sin respuesta, a los 3 s | jugador   | `Skeleton`                                     | sí          | ninguna                                   |
| 41  | `/me/training`, con `/api/riders/me/orders` en 500                   | jugador   | `ErrorState`                                   | sí          | ninguna                                   |
| 42  | `/world/rankings`, con toda la API en 500                            | visitante | `ErrorState`                                   | no          | ninguna                                   |
| 43  | `/team/squad`                                                        | jugador   | `EmptyState` (un agente libre no tiene equipo) | no          | ninguna                                   |
| 44  | `/`                                                                  | nuevo     | `EmptyState`, con `Create your rider`          | no          | ninguna                                   |
| 45  | `/me/training`                                                       | nuevo     | `EmptyState`                                   | sí          | ninguna                                   |
| 46  | `/ruta-que-no-existe`                                                | visitante | `ErrorState` `notFound`                        | no          | ninguna                                   |
| 47  | `/world/riders/00000000-0000-4000-8000-000000000000`                 | visitante | `ErrorState` `notFound`                        | no          | ninguna                                   |

Hoy fallan la comprobación 9 tres de las quince de herramienta (01, 03 y 15), la 7 todas, porque ninguna lleva `data-answer`, y la 10 al menos `Watch` (08, 09 y 35) y las clasificaciones con maillot de líder (05 y las demás generales). La 09 se mide sin axe, como hizo el mapa 05, porque la pantalla se mueve (decisión 7-b). Las ocho de herramienta sin `edit` (02, 03, 15, 26, 28, 31, 32 y 34; la 40, la 41 y la 45 son estados) guardan cada acción al momento y no tienen `ActionBar`; si la sección que rediseña una pantalla le da una, añade su `edit` en el mismo PR.

```ts
// apps/web/e2e/pantallas.ts
import type { Page } from '@playwright/test'
export type CuentaDePrueba = 'jugador' | 'manager' | 'visitante' | 'nuevo'
/** cuentas.json del mundo, más los dos ids que la prueba resuelve al empezar. */
export interface MundoDePrueba {
  readonly day: number
  readonly password: string
  readonly accounts: Readonly<Record<CuentaDePrueba, { readonly email: string | null }>>
  readonly firstWorldTourTeamId: string // de GET /api/teams
  readonly topRankedRiderId: string // de GET /api/rankings
}
export interface TelefonoPantalla {
  readonly id: string // el de la captura: '01-me-training'
  readonly path: string | ((world: MundoDePrueba) => string)
  readonly account: CuentaDePrueba
  readonly answer: string // el `data-ui` del elemento con `data-answer`
  readonly tool: boolean // corre la comprobación 9
  readonly edit?: (page: Page) => Promise<void> // deja cambios sin guardar; sin ella, la 8 no corre
  readonly intercept?: { readonly url: string; readonly respond: 'hang' | 500 } // los estados 40 a 42
  readonly waitMs?: number // espera antes de medir: la 09, 8.000 tras `Play`; la 40, 3.000
}
```

### 7.4 Dónde corre y el trinquete

I-04; D-18. Un trabajo nuevo, `Teléfono`, en `.github/workflows/ci.yml`, con el mismo patrón que el de los bancos (l. 215-230): un paso «¿Toca la web, la API o `packages/db`?» compara con `git diff --name-only` contra la base y sigue si alguna ruta empieza por `apps/web/`, `apps/api/` o `packages/db/`, en cada PR y en cada push a `main`. Restaura Chromium y el mundo de la caché, corre `pnpm build`, levanta `serve.mjs` y lanza `playwright test --project=telefono` desde `apps/web/playwright.config.ts`, con dos proyectos: `telefono` (los dos anchos) y `nocturno` (§7.5). Primero `/_ui`, que no necesita el mundo, y después las 45. **El trinquete**: `apps/web/e2e/telefono-baseline.json` guarda, por pantalla y ancho, las faltas de cada comprobación en el orden de §7.1. El PR del paso 2 lo escribe con las medidas de hoy y no cambia la web; desde ahí el CI falla si una cifra sube, y también si baja sin que el PR la apunte, como `deuda.json` (§5.2). Cada paso del plan baja las suyas. **E3 está terminado cuando el fichero está a cero** (o `null` donde no corre); el paso 24 lo borra y la prueba exige cero. La forma, con cifras de ejemplo:

```json
{
  "pantallas": {
    "_ui": {
      "360": [0, 0, 0, 0, 0, 0, 0, 0, null, 0],
      "320": [0, 0, 0, 0, 0, 0, null, 0, null, 0]
    },
    "01-me-training": {
      "360": [0, 1, 0, 0, 47, 53, 1, 1, 1, 0],
      "320": [0, 1, 0, 0, 47, 53, null, 1, 1, 0]
    }
  }
}
```

Son ilustrativas: el paso 2 escribe las de verdad. El coste son de 5 a 7 minutos más por PR que toca la web, la API o `packages/db` y unos 150 MB de Chromium en la caché (estimado por telefono): es DD-16, por defecto sí; sin la prueba, la aceptación del teléfono deja de ser automática y vuelve a ser a mano.

### 7.5 El rendimiento, cada noche

D-50. `apps/web/e2e/nocturno.spec.ts`, en un trabajo nuevo de `.github/workflows/cobertura.yml`, que ya corre cada noche (l. 23-26, `15 4 * * *`). Chromium con la red y la CPU de DevTools por CDP (Slow 4G: 562,5 ms y 1,44 Mbit/s; CPU ×4), a 360 × 800 con relación 2, la mediana de cinco cargas, en frío (sin caché ni service worker) y en caliente, sobre las cuatro páginas del mapa 05 §12: la portada del jugador, la del visitante, el plan y `Watch`. Una página está lista cuando su `[data-answer]` está en `data-state="ready"` y nada de `main` sigue en `loading`. Los umbrales: primera pintura en frío de 3,0 s o menos (hoy de 3,13 a 3,28, mapa 05 §12, mediana de tres; con el sprite de banderas, 2,93, telefono §8.3); lista en frío de 5,0 s o menos (hoy de 4,75 a 5,70); lista en caliente de 2,0 s o menos, o 3,0 en el plan (hoy 1,4, 2,8 y 1,7, telefono §5.3). El peso no espera a la noche: lo mide `peso.test.mjs` en el trabajo `Build` de cada PR (§12.7), con `CSS_BLOCKING_MAX_GZ` = 15 KB (hoy 94,3), `ENTRY_JS_MAX_GZ` = 160 KB (hoy unos 157), `PRECACHE_MAX_GZ` = 250 KB y `FLAG_SPRITE_MAX` = 60 KB. Un umbral roto pone en rojo la noche y no para ningún PR. La misma noche corren las dos pasadas de §7.8.

### 7.6 Las dependencias

O-11; X-09. Ni Playwright ni axe-core están hoy en ningún `package.json`: los guiones del mapa 05 los usaron instalados aparte (`capturas/README.md` l. 62-71). Entran en el paso 2 como `devDependencies` de versión exacta de `apps/web/package.json`: `@playwright/test` `1.56.1` y `axe-core` `4.10.3`. axe se inyecta con `page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })` y se llama con `axe.run`, como `capturas/medir.mjs`, sin `@axe-core/playwright`. Chromium es el 141 (la compilación 1194 de Playwright 1.56.1): en el CI se instala con `playwright install --with-deps chromium` si falta en la caché de `~/.cache/ms-playwright`, con la clave `playwright-1.56.1`; en el contenedor de diseño no se instala nunca (`/opt/pw-browsers`, `00-encargo.md` §4).

### 7.7 La prueba del dueño en su teléfono

D-19; H-19. Es la decisión 6 de E2 (`docs/diseno/e2-retransmision/implementacion.md` l. 17) y la puerta del paso de cierre (24); no bloquea los demás (DD-20, por defecto sí). El dueño hace estas tareas a una mano, en su teléfono y con la web instalada desde la novena, y apunta en el PR del paso 24 para cada una `sale a la primera`, `sale con ayuda` o `no sale`, con el modelo y la versión del sistema. Un `no sale` abre un arreglo antes de cerrar E3.

| #   | Tarea                                | Empieza en                      | Sale a la primera si…                                                                               |
| --- | ------------------------------------ | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | entrar                               | `/login`                        | entra sin ampliar la página ni fallar un toque                                                      |
| 2   | ver cómo llega a su próxima carrera  | la portada                      | lo lee en la primera pantalla de `/me/training`, sin bajar                                          |
| 3   | cambiar un bloque                    | `/me/training`                  | cambia el bloque de una semana, lee la consecuencia y guarda con la `ActionBar` sin buscar el botón |
| 4   | poner órdenes                        | `/me/orders`                    | pone el papel de una etapa y guarda                                                                 |
| 5   | inscribirse                          | `/me/races?tab=enter`           | encuentra con `Affordable` (pantalla) una carrera que puede pagar y se inscribe                     |
| 6   | ver una etapa                        | `Watch`                         | la sigue con el pulgar (pausa, velocidad, saltos) y nada le tapa el comentario                      |
| 7   | abrir la general y una ficha         | una carrera                     | encuentra su fila y abre la ficha de otro corredor                                                  |
| 8   | cambiar el maillot                   | `/team/identity`                | cambia figura y colores, entiende el porqué de un color tachado y guarda                            |
| 9   | instalar                             | Safari o Chrome                 | añade la web a la pantalla de inicio siguiendo `InstallHint` y la abre sin barra del navegador      |
| 10  | abrir sin red                        | la web instalada, en modo avión | ve su cabecera y lo que ya había visto, con `OfflineBanner`, y nunca `Log in`                       |
| 11  | con VoiceOver o TalkBack, si los usa | `/me/training` y `Watch`        | oye su llegada (`Scale5`) y los rótulos de la etapa (H-19); si no los usa, la tarea no se hace      |

### 7.8 Lo que la prueba no ve

D-19. Nada de esto bloquea un PR, porque pide un aparato o una letra que el CI no tiene, y un trinquete que dependiera de la letra del ejecutor sería inestable:

- **WebKit y un teléfono de verdad** (H-13): Safari, que es el motor de todo navegador de iPhone; las barras fijas con `100dvh`, `env(safe-area-inset-*)` y `viewport-fit=cover`; la letra de verdad, San Francisco y Roboto (el CI mide con la letra del sistema de su contenedor, y el plan B de §6.3 depende de ella). Los cubre la prueba del dueño (§7.7) y quedan como riesgo en §18.
- **La letra al doble** (H-17; WCAG 1.4.4 y la escala de letra de Android): una pasada nocturna a 360 × 800 con la letra raíz al 200 % (`document.documentElement.style.fontSize = '200%'`), con las comprobaciones 1 y 2, que informa. Los altos de §3.5 son mínimos, no fijos, para que no recorten.
- **De lado** (H-16): una pasada nocturna a 800 × 360 con la comprobación 1, que informa; el manifiesto no fija `orientation` (§6.5).
- **El lector de pantalla en un teléfono** (H-19): los `role="img"` de la escala y del maillot y los `aria-live` de `Watch` solo se comprueban en el marcado; los oye la undécima tarea del dueño, si usa uno, y si no queda como riesgo en §18.

---

**Injertos aplicados.** I-04 (§7.4: la prueba también sobre `/_ui` en cada PR; §7.5: el rendimiento cada noche; las 45 pantallas siguen en cada PR, contra el mundo guardado en la caché).

**Objeciones resueltas.** O-11 (§7.6: Playwright y axe-core como dependencias fijadas, y Chromium en la caché del CI). O-26 (§7.2: el mundo de la prueba definido y su paso previo, el 2). O-27 (§7.3: las 45 pantallas con su ruta, su cuenta, su `data-answer` y si son de herramienta).

**Huecos rellenados.** H-13 (§7.7 y §7.8: un teléfono de verdad lo cubre la prueba del dueño, puerta del cierre). H-15 (§7.2: el mundo reproducible, con su caché y su clave). H-16 (§7.8: la pasada de lado; las barras con el teclado, §6.5). H-17 (§7.8: la letra al doble). H-19 (§7.7: la undécima tarea, con lector de pantalla).

**Contradicciones de hecho.** X-09 (§7.6: Playwright y axe-core no son dependencias hoy). X-23 (§7.2: «génesis y tres días» no da las pantallas medidas).

**Decisiones de esta sección.**

- **7-a**, `build.mjs` comprueba cada respuesta y el estado final del mundo (219 equipos, la toma del equipo en 200) antes de volcarlo, para que un mundo a medias no llegue a la caché y fije una línea base falsa.
- **7-b**, la 09 se mide sin axe y con las demás comprobaciones, como el mapa 05, porque la pantalla se mueve.
- **7-c**, la comprobación 7 exige también que el `data-ui` del elemento marcado sea el de §7.3, para que `data-answer` no se ponga en cualquier cosa que quepa en 520 px.
- **7-d**, la 7 corre solo a 360 × 800; la 8, solo en las pantallas con `edit`; la 9, solo en las de herramienta; donde no corren, la línea base guarda `null`.
- **7-e**, axe se inyecta como hace `capturas/medir.mjs`, sin `@axe-core/playwright`: una dependencia menos y el mismo instrumento que dio las cifras de hoy.
- **7-f**, la prueba del dueño se apunta en el PR del paso 24 con tres respuestas por tarea y el modelo del teléfono.
- **7-g**, la comprobación 10 encuentra los maillots por `data-kit` en su `<svg>` y no por su `aria-label`, que cambia de texto con el maillot; el paso 2 se lo pone a los de hoy, sin cambiar su aspecto, para que la línea base cuente los de 13 y 15 px. Escribe D-00b como hecho.

---

## 8. Los maillots (I): la equipación, su dato y su editor

Esta sección da al equipo un maillot que es un dato y no un sorteo: el vocabulario cerrado de quince colores y siete figuras, sin dos equipos iguales (D-00e, que sustituye a D-20), su dibujo, nunca por debajo de 28 px (D-00b, que sustituye a D-21), la distancia entre dos (D-24), dónde se guarda con su historia (D-22), cómo se traduce el mundo de hoy sin repintar el pasado (D-23), el editor de `/team/identity` (D-25), el arreglo del clon, que va primero (D-32), y el maillot en grande, con la espalda, el culote y las zonas del patrocinador (D-00g, §8.10). El dueño, tras mirar la página de opciones: «Maillot: que tal 15 colores y 7 figuras??? Y que no se puedan repetir nunca... o sea, que no deje 2 equipos con mismo maillot... Y lo dicho, nunca mostrarlos a 13 px, minimo 28....» (`00-encargo.md` §7.2, l. 277-278, en `bd74602`, 21 de octubre de 2026). La señal de campeón, los líderes, el patrocinador y `WornJerseyIcon` son §9. Las líneas de código son las de `58c14da`, comprobadas en `b79de0e` (idéntico fuera de `docs/`). «u» es la unidad del `viewBox` de 48 de `TORSO` (`apps/web/src/components/Jersey.tsx` l. 10-11), y px = u × tamaño / 48.

### 8.1 El vocabulario

Hoy no hay vocabulario: `jerseyStyle` sortea base, segundo color y patrón con la semilla del equipo entre 14 colores y cinco patrones (`apps/web/src/components/visuals.ts` l. 34-55 y 71-83), y el mánager elige entre doce sorteos (`TeamManager.tsx` l. 21-26). Con E3 el maillot es una figura, un color base y un segundo color, por nombre, de un vocabulario cerrado en `packages/shared/src/kit.ts`, en el barril, porque lo dibuja la web, lo valida la API y lo reparte `packages/db` (D-02).

**Los quince colores** (D-00e): los doce de telefono §6.1 y tres más, elegidos aquí por medida (`<scratchpad>/redactor-L2/medir28.py`, con `<scratchpad>/venv`; resultados en `medir28.json`). De una rejilla sRGB de 18 niveles por canal (5.832 candidatos) quedan los que están a 20 o más de ΔE00 del blanco y del amarillo del líder (`#facc15`) en las cuatro visiones, porque los tres son de base y un cuerpo casi blanco o casi amarillo caería en lo reservado, y a 12,3 o más de los doce en las tres dicromacias; de los 320 mejores sale el trío que hace mayor el peor par en las tres dicromacias, y a igualdad el de visión normal: `taupe` `#876969`, `brown` `#4b1e0f` y `plum` `#5a4b5a` (8-j). El peor par de los quince en las dicromacias sigue en 12,3, el que ya tenían los doce (telefono; X-02), y ninguno con uno de los tres baja de 13,2; en visión normal el peor pasa de 15,9 a 14,7. Ninguno de los 105 pares baja de 10 en las cuatro visiones; en grises bajan 21 (con los doce, 12 de 66), y para eso existe la regla de contraste. Los tres quedan a 16,7 o más de los tres colores de líder en las cuatro visiones (el `taupe` del verde de los puntos, en deuteranopía) y a 29,3 o más del blanco y del amarillo. El nombre se escribe en el editor, porque un daltónico elige por nombre:

| `KitColorName` | Pantalla | Hex       | Papel          | `KitColorName` | Pantalla | Hex       | Papel          |
| -------------- | -------- | --------- | -------------- | -------------- | -------- | --------- | -------------- |
| `black`        | `Black`  | `#1b1d21` | base o segundo | `pink`         | `Pink`   | `#f7418a` | base o segundo |
| `navy`         | `Navy`   | `#172a5b` | base o segundo | `purple`       | `Purple` | `#4e2cae` | base o segundo |
| `blue`         | `Blue`   | `#0f6de9` | base o segundo | `taupe`        | `Taupe`  | `#876969` | base o segundo |
| `sky`          | `Sky`    | `#4cc3ff` | base o segundo | `brown`        | `Brown`  | `#4b1e0f` | base o segundo |
| `teal`         | `Teal`   | `#0f9e8f` | base o segundo | `plum`         | `Plum`   | `#5a4b5a` | base o segundo |
| `green`        | `Green`  | `#236102` | base o segundo | `yellow`       | `Yellow` | `#ffd60a` | solo segundo   |
| `orange`       | `Orange` | `#f48d32` | base o segundo | `white`        | `White`  | `#ffffff` | solo segundo   |
| `red`          | `Red`    | `#c62639` | base o segundo |                |          |           |                |

**Las siete figuras** (D-00e): las seis de D-20 y `sash`, la diagonal, que vuelve porque ya no es la señal de campeón (§9.1). Cada región es un `path` recortado por `TORSO` y pintado en el segundo color; lo más fino mide 6 u, 3,50 px a 28, frente a los 3 u de las `stripes` de hoy (mapa 03 §1.3):

| `KitFigure` | Pantalla     | Región del segundo color (`KIT_FIGURE_PATHS`)                                          | Lo más fino, a 28 px             |
| ----------- | ------------ | -------------------------------------------------------------------------------------- | -------------------------------- |
| `plain`     | `Plain`      | ninguna                                                                                | el cuerpo                        |
| `band`      | `Chest band` | `M0 23H48V33H0Z`, banda de pecho de y 23 a 33                                          | 5,83 px                          |
| `hoops`     | `Hoops`      | `M0 17H48V24H0Z M0 30H48V37H0Z`, dos aros de 7 u con 6 de hueco                        | 4,08 de aro y 3,50 de hueco      |
| `halves`    | `Halves`     | `M24 0H48V48H24Z`, la mitad derecha con su manga                                       | 5,83 de pecho por lado           |
| `yoke`      | `Yoke`       | `M0 0H48V19H0Z` y las dos mangas de `Jersey.tsx` l. 46-47                              | 6,42 bajo el cuello              |
| `sides`     | `Sides`      | `M0 0H21V48H0Z M27 0H48V48H27Z`, costados y mangas                                     | 4,08 de costado y 3,50 de cuerpo |
| `sash`      | `Sash`       | `M13.76 6.71 L41.76 38.71 L34.24 45.29 L6.24 13.29 Z`, 10 u del hombro izquierdo abajo | 5,83                             |

**La regla de contraste** (I-25): base y segundo color a `KIT_CONTRAST_MIN` = 20 de ΔE00 o más en las cinco vistas (las cuatro visiones y los grises), para que la figura no desaparezca en grises. **Nunca dos iguales** (D-00e): dos equipos del mismo mundo no llevan nunca el mismo maillot canónico, el de `canonicalKit(code)`, que tiene `halves.red.blue` y `halves.blue.red` por uno solo, porque son el mismo maillot visto de frente y de espaldas (8-k); lo hace cumplir un índice único (§8.5). **Lo reservado** (D-00e y D-24): el cuerpo amarillo (líder de la general), los lunares (montaña), la estrella y el cuerpo blanco (campeones) se cumplen por construcción, porque el amarillo y el blanco solo son segundo color y ninguna figura lleva lunares ni estrella; y queda reservado todo maillot que a 28 px esté a menos de `KIT_MIN_DISTANCE` = 10 de una señal en alguna de las cuatro visiones: los tres líderes (§9.7), el mundial, el continental y los 133 nacionales (§9.1), estos por decisión del dueño (D-00h), como lo apunta la tabla de choques (§8.4). **Las cuentas**, medidas a 28 px con el mismo script (el rasterizador de `opciones/medidas.py`, Chromium 141.0.7390.37 por Playwright, y el filete de §8.3): 13 lisos y 6 × 13 × 14 con figura, 1.105 combinaciones; pasan el contraste 547; caen a menos de 10 de un líder, del mundial o del continental 11, y de algún nacional, con la estrella en su sitio de §9.5, otros 12 (D-00h); quedan **524 permitidos, 491 distintos** contando cada `halves` y su espejo como uno, para los 219 equipos del mundo. Las constantes (`KIT_PX`, `KIT_MIN_PX`, `KIT_CHECK_SIZES` y las dos de arriba) están en §15. Los tipos, enteros; de las funciones, `parseKit` da `null` si el código no es del vocabulario, `kitCode` hace lo contrario, `kitCodeSchema` es el `z.string()` que `parseKit` acepta y `canonicalKit` da `halves.red.blue` por `halves.blue.red`:

```ts
// packages/shared/src/kit.ts (las cuatro funciones del final, por su firma)
import { z } from 'zod'
export const KIT_COLORS = {
  black: '#1b1d21',
  navy: '#172a5b',
  blue: '#0f6de9',
  sky: '#4cc3ff',
  teal: '#0f9e8f',
  green: '#236102',
  orange: '#f48d32',
  red: '#c62639',
  pink: '#f7418a',
  purple: '#4e2cae',
  taupe: '#876969',
  brown: '#4b1e0f',
  plum: '#5a4b5a',
  yellow: '#ffd60a',
  white: '#ffffff',
} as const
export type KitColorName = keyof typeof KIT_COLORS
export type KitBase = Exclude<KitColorName, 'yellow' | 'white'>
export type KitSecondary = KitColorName // menos el de la base, que comprueba kitSchema
export const KIT_SECONDARIES = Object.keys(KIT_COLORS) as [KitColorName, ...KitColorName[]]
const isBase = (c: KitColorName): c is KitBase => c !== 'yellow' && c !== 'white'
export const KIT_BASES = KIT_SECONDARIES.filter(isBase) as [KitBase, ...KitBase[]]
export const KIT_FIGURES = ['plain', 'band', 'hoops', 'halves', 'yoke', 'sides', 'sash'] as const
export type KitFigure = (typeof KIT_FIGURES)[number]
type Figured = Exclude<KitFigure, 'plain'>
export type Kit =
  | { readonly figure: 'plain'; readonly base: KitBase }
  | { readonly figure: Figured; readonly base: KitBase; readonly secondary: KitSecondary }
export type KitCode = `plain.${KitBase}` | `${Figured}.${KitBase}.${KitSecondary}` // plain.red, hoops.navy.yellow
export type KitSize = 28 | 40 | 48 | 72 | 96 | 160 | 320 // nunca menos de 28 (D-00b); 160 y 320, D-00g
const base = z.enum(KIT_BASES)
const secondary = z.enum(KIT_SECONDARIES)
const figured = z.enum(['band', 'hoops', 'halves', 'yoke', 'sides', 'sash'])
export const kitSchema = z.discriminatedUnion('figure', [
  z.strictObject({ figure: z.literal('plain'), base }),
  z.strictObject({ figure: figured, base, secondary }).refine((k) => k.secondary !== k.base),
]) satisfies z.ZodType<Kit>
export declare function parseKit(code: string): Kit | null // y kitCode, kitCodeSchema y canonicalKit

// packages/shared/src/contracts.ts (el orden es el de la comprobación)
export const kitCheckCodeSchema = z.enum([
  'kit_reciente',
  'kit_igual',
  'kit_contraste',
  'kit_reservado',
  'kit_ocupado',
  'kit_se_confunde',
])
export type KitCheckCode = z.infer<typeof kitCheckCodeSchema>
const teamRefSchema = z.strictObject({ teamId: z.string(), teamName: z.string() })
const conflictSchema = teamRefSchema.extend({
  vision: z.enum(['normal', 'protan', 'deutan', 'tritan']),
})
export const kitVerdictSchema = z.strictObject({
  ok: z.boolean(),
  code: kitCheckCodeSchema.nullable(),
  /** los ocho primeros, de más a menos carreras compartidas */
  conflicts: z.array(conflictSchema).max(8),
  /** la señal que estorba: 'leader:gc' | 'leader:points' | 'leader:kom' | 'champion:world' | 'champion:<ISO-2>' */
  reserved: z.string().nullable(),
  takenBy: teamRefSchema.nullable(), // el equipo que ya lo lleva, con kit_ocupado
})
export type KitVerdict = z.infer<typeof kitVerdictSchema>
```

### 8.2 La distinguibilidad, medida, y su puerta

La distancia entre dos maillots es la media por píxel de ΔE00 entre los dos dibujados al mismo tamaño, tras Machado 2009 con severidad 1 (el método del mapa 03), y desde D-00b se mide solo a 28 px (`KIT_CHECK_SIZES` = `[28]`), en las cuatro visiones y con los grises informados. Lo que se sabe: **hoy** (mapa 03 §3.1), de los 91 pares de la paleta bajan de 10 2, 6, 12 y 13 en visión normal, protanopía, deuteranopía y tritanopía, y 45 en grises; 303, 310, 310 y 310 de las 310 carreras de la temporada 0 tienen algún par por debajo de 10, y hay pares idénticos en 220; **el vocabulario de telefono** (§6.2, `kit.py` y `vocab.py`, en `mapa03/mundo03.json`), con doce colores y siete figuras, sin la regla y a 13 y 16 px: 0 pares de 66 en las cuatro visiones y 12 en grises, 0 carreras, y 18,5 de distancia mínima entre dos equipos que coinciden en carrera (21,8 su percentil 5); y **el de D-00e** (§8.1, a 28 px), 0 pares de 105 en las cuatro y 21 en grises, el peor en 12,3 en las dicromacias y en 14,7 en visión normal, y 524 maillots permitidos (491 distintos); las carreras, sin medir.

D-00e añade tres colores y quita lo que la regla de contraste no deja, y su medida es a 28 px, donde cada figura tiene más píxeles que a 13 o a 16; **lo que falta** (O-25) son las 310 carreras con la traducción de §8.6, que dependen del reparto y no solo del vocabulario. **La puerta** (D-00e): `packages/db/src/kits.test.ts`, en el paso 16, construye en PGlite el mundo de la génesis (`seedWorld` con `GENESIS_WORLD_SEED`, como el mapa 03), corre `seasonRivals` y la traducción de `ensureKits` y exige, a 28 px, 0 carreras de la temporada 0 (las 310 que no son nacionales) con un par por debajo de 10 en alguna de las cuatro visiones, y 0 pares de equipos del mundo con el mismo maillot canónico; escribe además los pares por carrera en grises, cuántos maillots quedan permitidos y cuántos equipos conservan su color base. Si alguna carrera falla, el mismo PR lo dice y propone qué color o qué figura sobra: el test escribe, para cada color y cada figura, cuántas carreras fallarían sin él, y el PR propone quitar el que más arregla. No hay respaldo B: DD-04 está decidida (D-00e).

### 8.3 El dibujo

`Kit` (`apps/web/src/components/ui/Kit.tsx`, props `{ code: KitCode; size: KitSize; teamName: string; surface?: KitSurface }`) dibuja en el `viewBox` de 48, de abajo arriba: `TORSO` en la base; la región de la figura en el segundo color, dentro de un `clipPath` con `TORSO` (id de `useId()` sin los dos puntos); el filete, `TORSO` sin relleno con trazo de 1 u a todos los tamaños (0,58 px a 28 y 2 px a 96), en `rgba(0,0,0,0.3)` sobre claro y en `rgba(255,255,255,0.6)` con `surface="dark"` (I-24; §9.10); y el cuello de hoy, `M20 8 Q24 12 28 8 L26 6 Q24 8 22 6 Z`, blanco al 85 % (`Jersey.tsx` l. 51). Es `role="img"` con `aria-label` y `<title>` `Mistral Racing kit` (pantalla), donde hoy todos dicen `Team jersey` (l. 25); un código que no casa pinta el hueco con `data-state="hidden"`. `TORSO`, `COLLAR` y `KIT_FIGURE_PATHS` pasan a `kit.ts`, porque la distancia dibujada de `packages/db` los usa y su huella cuenta en la tabla de choques (§8.4).

**`KIT_MIN_PX` = 28** (D-00b): ningún maillot se pinta más pequeño, SVG incluido, y el tipo lo impide, porque `KitSize` es `28 | 40 | 48 | 72 | 96 | 160 | 320` y `KIT_PX` = `{ row: 28, card: 40, team: 48, page: 72, hero: 96, showcase: 160, poster: 320 }`, los dos últimos solo en las vistas grandes (D-00g, §8.10); la comprobación 10 de la prueba del teléfono lo vigila en pantalla (§7.1). El dueño: «Otra cosa, los maillots creo que nunca deberian mostrarse a 13 o 16 pixels, minimo 28 pixels e incluso eso ya es muy pequeño...» (`00-encargo.md` §7.2, l. 274-275, en `bd74602`). Por eso `Watch` pinta un maillot por equipo (O-12, X-19): doce maillots de 16 px con el `gap-x-2` y el `pl-7` de `GroupBar.tsx` l. 235 ya ocupaban 12 × 16 + 11 × 8 = 280 px y partían en dos renglones a 320 (medido por el juez de uso, C7); a 28 serían 12 × 28 + 11 × 8 = 424 px, más que los 308 útiles a 360. La barra que dibuja §14 junta los corredores por equipo, como D-00b manda, y la lista del grupo sigue al tocarlo. Todo dibujo del maillot (`Kit`, `LeaderJersey`, `ChampionJersey` y `WornJerseyIcon`) recibe un `KitSize`, la fila de una tabla con maillot mide 44 px o más (D-00b; §6), y los tamaños de hoy (mapa 03 §1.2) pasan al `KitSize` igual o inmediatamente mayor (8-c):

| Dónde (hoy)                                                                                                                                                                                             | Hoy, px             | Con E3                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `GroupBar.tsx` l. 204 y 242, un maillot por corredor                                                                                                                                                    | 14 y 13             | un `Kit` de 28 por equipo del grupo con su cuenta (`×3`) y, aparte y delante, los corredores con maillot de líder o de campeón (D-00b; §14) |
| `CueCard.tsx` l. 61, 84, 90, 116 y 122; `TimeTrialBoard.tsx` l. 86; `ChronicleSentence.tsx` l. 25; `VoiceTicker.tsx` l. 78; `GroupBar.tsx` l. 113; `StageStory.tsx` l. 103; `RaceRadioPanel.tsx` l. 210 | de 12 a 16          | `row`, 28; cómo cabe en su línea lo dice §14                                                                                                |
| `RiderJersey` (`Race.tsx` l. 220 y 256, `StageReplay.tsx` l. 101 y 147, `stageView.tsx` l. 98, `StageStory.tsx` l. 141, `StageCards.tsx` l. 110 y 292); `Race.tsx` l. 139 y 162; `Teams.tsx` l. 33      | 15, 16 y 18; 26     | `row`, 28, en filas de 44                                                                                                                   |
| `TeamSquad.tsx` l. 207 y `RiderHeader` (§4.6); `Team.tsx` l. 87; `TeamIdentity.tsx` l. 139 y 177, y el editor (§8.7); `TeamManager.tsx` l. 93                                                           | 40; 44; 72 y 96; 34 | `card` 40; `team` 48; `page` 72 y `hero` 96; el de 34 desaparece con las doce semillas (§8.7)                                               |

### 8.4 La distancia dibujada, la tabla de choques y los rivales de temporada

**`kitDistance(a, b, size): Record<Vision, number>`** (`packages/db/src/kitDistance.ts`, solo servidor; D-24, punto 1) porta a TypeScript el rasterizador del mapa 03 (`mapas/03-maillots-medida.py`): cada píxel del tamaño pedido se supermuestrea con 8 × 8 puntos contra los `path` del dibujo (torso, figura recortada, filete y cuello), se mezcla en sRGB codificado sobre `#ffffff`, como compone el navegador, y pasa por Machado 2009 en RGB lineal y por CIEDE2000 en CIELAB D65 con `simulateCvd` y `deltaE00` de `packages/shared/src/colorMath.ts` (I-31); la distancia es la media pesada por la cobertura del torso, y cuenta la peor de las cuatro visiones (los grises se informan). La misma función, como `drawnDistance(a: KitDrawing, b: KitDrawing, size)`, mide un maillot contra un líder, una señal de campeón o el aspecto de hoy; la bandera del nacional es la única capa que no es un `path` y se muestrea de `flagCells` (§9.5). Las coberturas por figura se calculan una vez por proceso; con ellas, un par a 13 o a 16 px cuesta del orden de 0,1 a 0,2 ms en Node (estimado por identidad §6.2), y a 28 px, con 784 píxeles, unas tres veces más (estimado). `kitDistance.test.ts` compara 50 pares fijos con el script de Python a 0,5 o menos. **La tabla de choques** (I-07; D-24, punto 2): `packages/db/src/kitConflicts.generated.ts` exporta `KIT_CONFLICTS`, una entrada `KitConflictEntry` por cada uno de los 1.105 códigos (`contrastOk`; `reserved`, la señal a menos de 10 a 28 px, o `null`; y `near`, los permitidos a menos de 10 con su peor visión), `KIT_ALLOWED` (los 524 que pasan contraste y reserva) y `KIT_GEOMETRY_HASH`, el SHA-256 de `TORSO`, `COLLAR`, `KIT_FIGURE_PATHS`, `KIT_COLORS`, el filete y las 138 señales de §9 (los tres líderes, el mundial, el continental y los 133 nacionales, con la huella de `flagCells` y de `NATIONAL_STAR_OVERRIDES`, §9.5). La escribe `buildKitConflicts()` (`packages/db/scripts/kit-conflicts.ts`) con `KIT_CONFLICTS_WRITE=1`. Son 149.331 pares de maillots que pasan el contraste y 75.486 de maillot y señal, de 1 a 2 minutos (estimado con el coste de arriba), así que `kitConflicts.test.ts` compara en cada CI la huella con la geometría y recalcula 50 entradas de una semilla fija, y la regeneración entera corre cada noche; una figura retocada sin regenerar hace caer la huella. Su tamaño está sin medir, y si pasa de 1 MB se guarda como JSON junto al `.ts`. `checkKit` consulta la tabla y **nunca rasteriza en una petición**.

**Los rivales de temporada** (H-01; D-24, punto 3; sin evidencia de los jueces). Dos equipos son rivales si comparten al menos una carrera de la temporada. `seasonRivals(q, worldId, season): Promise<SeasonRivals>` (`packages/db/src/seasonRivals.ts`; `SeasonRivals` es `ReadonlyMap<teamId, ReadonlyMap<rivalId, carreras>>`) construye sin correr nada el campo de cada carrera de `SEASON_CALENDAR` con la selección del tick: `resolveFieldTeams` (`calendarRun.ts` l. 390-455) lee los admitidos y los cambios de `team_race_plan` y llama a `selectFieldTeams` (l. 279) y a `ownedTeamAttendance` (`teamPlan.ts` l. 65); su parte pura se extrae a **`fieldTeamsFor(eligible, race, raceKey, overrides)`**, que el tick sigue usando igual, y `seasonRivals` hace las dos lecturas una vez para toda la temporada. Tres límites: los admitidos se ordenan por `teams.budget` el día en que se congela la escuadra (l. 412), así que los rivales de hoy son una previsión; las nacionales quedan fuera, como en todas las medidas, porque mezclan corredores de decenas de equipos (mapa 03 §8); y no se guardan, se calculan al pedir. `seasonRivals.test.ts` comprueba que coinciden con los campos que congela el tick en el mundo de los bancos y mide su coste en PGlite; si pasa de 100 ms, se memoriza por mundo y día de juego y se invalida al escribir `team_race_plan`. Si un mánager añade una carrera y su maillot pasa a chocar con un NPC, el NPC cede esa noche (DD-08); dos humanos que chocan no se fuerzan, y `kitWorld.bench.ts` los cuenta cada noche.

### 8.5 El dato

Hoy el maillot se deriva de `teams.jersey_seed` (`packages/db/src/schema.ts` l. 268), que es también la identidad del NPC (§8.9). **La migración de drizzle-kit `0052_equipaciones`** (paso 16a; D-22, I-14) crea la tabla con historia, y `teams` no gana ninguna columna `NOT NULL` sin `DEFAULT` (O-01, X-08: el reparto no se escribe en SQL, `seedWorld` inserta sin él, `world.ts` l. 478-493, y un `NOT NULL` sin `DEFAULT` rompe el test del mundo vivo, `migrate.ts` l. 80):

```ts
// packages/db/src/schema.ts, tras `teams`
export const kitSetByEnum = pgEnum('kit_set_by', ['system', 'manager', 'sponsor', 'moderator']) // D-22
/** EL MAILLOT DE CADA EQUIPO CON SU HISTORIA (D-22): una fila por cambio, que no se toca después. */
export const teamKits = pgTable(
  'team_kits',
  {
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    validFromDay: integer('valid_from_day').notNull(),
    kit: text('kit').notNull(), // el KitCode
    setBy: kitSetByEnum('set_by').notNull(),
    sponsorDealId: text('sponsor_deal_id'), // el contrato de E8; solo con set_by = 'sponsor'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.teamId, t.validFromDay] }),
    check('team_kits_code', sql`${t.kit} ~ '^[a-z]+([.][a-z]+){1,2}$'`),
    check('team_kits_sponsor', sql`(${t.setBy} = 'sponsor') = (${t.sponsorDealId} is not null)`),
  ],
)
```

**El índice que impide dos iguales** (D-00e; 8-l), en la misma migración: `teams` (l. 252-279) gana `bib: text('bib').notNull().default('black')`, el culote de §8.10, con un `check` a los cuatro de `BIB_STYLES`, sin historia ni espera porque nunca se ve en carrera, y `kitCanonical: text('kit_canonical')`, nula, con el `canonicalKit` del último maillot guardado del equipo (el vigente, o el programado para mañana), y `uniqueIndex('teams_world_kit_uidx').on(t.worldId, t.kitCanonical)` junto al de l. 278; Postgres no compara los nulos, así que un equipo aún sin traducir no estorba. **`setKit(tx, teamId, kit, setBy, fromDay, sponsorDealId?)`** (`packages/db/src/kits.ts`) es la única que escribe maillots: inserta la fila de `team_kits` y pone `kit_canonical` en la misma transacción, y si salta el índice (23505) lanza `KitTakenError` con el equipo que lo lleva, que la ruta contesta como 409 `kit_ocupado`; así dos mánagers que guardan el mismo maillot a la vez no pueden ganar los dos. Como todo maillot nuevo vale desde mañana, el que se suelta hoy queda libre desde mañana para otro y ningún día lo llevan dos. **`kitOn(q, teamId, day): Promise<KitCode | null>`** y su versión en lote, **`kitsOn(q, teamIds, day): Promise<ReadonlyMap<string, KitCode>>`** (`kits.ts`, con `Queryable` de `titles.ts` l. 23), devuelven la fila de mayor `valid_from_day` que no pase de `day` (`distinct on (team_id) … order by team_id, valid_from_day desc`); `null` quiere decir que ese día el equipo aún no tenía maillot guardado y se dibuja con su semilla (§8.6). **`ensureKits(tx, worldId)`** (I-05) es un paso idempotente del tick, en su propia transacción tras `seedWorld` (`tick.ts` l. 265) y `backfillRosters` (l. 282-284), como este: la primera vez traduce el mundo; después solo actúa con equipos sin fila y con NPC que choquen con un humano. Todo maillot nuevo vale desde el día siguiente (`valid_from_day = currentDay + 1`), para que una etapa en curso no cambie de maillot.

**Los contratos que ganan `kit`** (I-06), en el paso 16b, como `kitCodeSchema.nullable()` (nulo solo mientras la traducción no ha corrido): `startlistTeamSchema` (`contracts.ts` l. 659), con el del día de la salida; `teamListItemSchema` (l. 685) y `teamDetailSchema` (l. 711), con `kitsOn(…, currentDay + 1)`, el de su próxima carrera, y `teamDetailSchema` también con su `bib` (§8.10); `teamClassEntrySchema` (l. 541), con el del día de la etapa que se enseña; y `RiderCard.team` (`jerseys.ts` l. 251; `broadcast/wire.ts` l. 354), con el del día de la etapa. El reparto grabado (`CastTeam`, `broadcast/timeline.ts` l. 231-234, que arma `cast.ts` l. 141-155) **no cambia**: la ruta de la retransmisión (`routes/broadcast.ts` l. 299-313) resuelve `kitsOn` con el día de la etapa y se lo pasa a `serveCast` (`broadcastSource.ts` l. 1370) en su contexto, como ya resuelve los nombres al servir; como `team_kits` no se reescribe, una etapa vieja enseña el maillot de aquel día, y el códec de E2 (`codec.ts` l. 239) no se toca. En el 19c (H-02, §13.5), `jerseySeed` sale de esos contratos (l. 665, 692 y 718), `kit` deja de ser nulo en los cuatro de estado y `RiderCard.team` queda `{ id, name, kit: KitCode | null, legacySeed: string | null }`, con la semilla que grabó el reparto solo cuando `kit` es nulo (8-f).

### 8.6 La traducción del mundo de hoy y el pasado intacto

**La traducción** (D-23, I-15) es la primera pasada de `ensureKits`. Recorre los equipos de más a menos rivales de temporada; cada uno prueba los de `KIT_ALLOWED` en orden de distancia dibujada a 28 px, en visión normal, a su aspecto de hoy (el `jerseyStyle` de `coalesce(jersey_style_seed, jersey_seed)`, §8.9; 8-i) y toma el primero que **no lleve ya otro equipo** del mundo (por su `canonicalKit`) y no esté en la lista `near` de ningún rival ya traducido. Así no queda ningún par de gemelos (hoy los hay en 220 carreras, mapa 03) y se conserva lo que la afición reconoce de cada equipo: con el vocabulario de identidad conservan su color base 63 equipos, frente a 15 con un sorteo (identidad `exp8_continuidad.py`); con el de D-00e lo mide `kits.test.ts`. Hay sitio: 491 maillots distintos para 219 equipos. Son 219 × 524 distancias a 28 px una vez, de 35 a 70 s en el primer tick tras el despliegue (estimado). Las filas llevan `set_by = 'system'`. **Los equipos que nacen después** (génesis y `seedWorld`) toman el primer maillot libre en el orden que da su semilla (`KIT_ALLOWED` barajado con FNV-1a de su `jersey_seed`) que no esté en la lista `near` de un rival (8-d). **El NPC cede** (DD-08, I-16): si el maillot de un humano pasa a chocar con el de un NPC rival, `ensureKits` le busca al NPC otro libre esa noche con la misma regla; un maillot que ya lleva otro, en cambio, no se cede nunca (8-m). **El pasado no se repinta** (O-21). En una etapa anterior a la traducción, `kitOn` da `null`, la API manda la semilla que guardó el reparto (`cast.ts` l. 146-154) y la web la pinta con **`legacyJerseyStyle(seed)`**, el `jerseyStyle` de hoy congelado con sus 14 colores y sus cinco patrones (`visuals.ts` l. 8-83), y su dibujo, `LegacyJersey` (el de `Jersey.tsx` l. 17-54), a 28 px o más como todos; lo grabado conserva sus gemelos, porque es historia. **Las noticias**: cada equipo cuyo maillot cambia recibe una en su diario (`GET /api/teams/:id/news`), `Mistral Racing has a new kit` (pantalla) en la traducción y `New kit for Mistral Racing` (pantalla) cuando un NPC cede. La traducción sigue siendo DD-07, pero su alternativa ya no cabe entera con D-00e: sin traducir siguen los gemelos de hoy, que son dos equipos con el mismo maillot (la duda 5).

### 8.7 El editor

`KitPicker` (`apps/web/src/components/ui/KitPicker.tsx`, D-25) sustituye a las doce semillas de `TeamManager.tsx` l. 21-26 y al panel `Jersey` de `TeamIdentity.tsx` l. 175-184, en `/team/identity` (`App.tsx` l. 233), y enseña el maillot en grande, a 160 y con sus tres vistas (D-00g, §8.10), en losetas de 72 y en carrera a 28, nunca más pequeño (D-00b). A 360 × 800, el mánager del mapa 05 (Noord Cycling, día 50; hoy, captura 16):

```text
┌ Your kit ───────────────────────────────────────────────┐  Panel
│ [ Front ]  [ Back ]  [ Shorts ]                          │  Tabs de la vista
│            ┌──────────────┐                              │
│            │ KitShowcase  │                              │  data-answer: la vista a 160
│            │    160 px    │                              │  (al tocarla, Sheet con la de 320)
│            └──────────────┘                              │
│ Hoops · Navy · Yellow · Black shorts                     │  meta ink-2
│ ✓ Distinct from every team in your races.                │  Notice good, role=status
│ In a race:  ▣ on white    ▣ on navy                      │  Kit de 28 en surface y en navy-dark
├ Figure ─────────────────────────────────────────────────┤
│ [▣ Plain] [▣ Chest band] [▣ Hoops]                       │  losetas de 72 con Kit de 40,
│ [▣ Halves] [▣ Yoke]      [▣ Sides]                       │  aria-pressed en la elegida
│ [▣ Sash]                                                 │
├ Main colour ────────────────────────────────────────────┤
│ (●)Black (●)Navy (●)Blue (●)Sky (●)Teal                   │  muestras de 44 con su nombre
│ (●)Green (●)Orange (●)Red (●)Pink (●)Purple               │  en caption
│ (●)Taupe (●)Brown (●)Plum                                 │
├ Second colour ──────────────────────────────────────────┤
│ (●)Black (⊘)Navy (●)Blue … (●)Yellow (●)White             │  ⊘: tachada, su porqué al tocarla
├ Shorts ─────────────────────────────────────────────────┤
│ [ Black ]          [ Black + panels ]                     │  cuatro Button secondary de 44,
│ [ Main colour ]    [ Main colour + panels ]               │  dos por fila; la vista pasa a Shorts
├ Teams you race this season ─────────────────────────────┤
│ ▣ Mistral Racing · 9 races                                │  ocho rivales, Kit de 28,
│ ▣ Pfeil Velo · 7 races …                                  │  filas de 44
└─────────────────────────────────────────────────────────┘
═ New kit from tomorrow (day 51)               [ Save kit ] ═  ActionBar, sobre la BottomNav
```

Tres losetas de 72 por fila ocupan 3 × 72 + 2 × 12 = 240 px de los 312 útiles (360 menos los márgenes de 12 y el relleno del `Panel`), y cinco muestras de 44 con su rótulo de 12 px, 5 × 56 + 4 × 4 = 296. Una muestra que no se puede elegir con la base y la figura de ese momento sale tachada y su porqué aparece debajo en `meta` al tocarla, nunca en un `title`. Las visiones se nombran `protanopia`, `deuteranopia` y `tritanopia`; un choque en visión normal no nombra ninguna. Los estados (pantalla):

| Estado                        | `data-state`                | Aspecto                                                 | Texto (pantalla)                                                                                                                                                                     |
| ----------------------------- | --------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| sin cambios                   | `ready`                     | el vigente; `ActionBar` oculta                          | `Hoops · Navy · Yellow`                                                                                                                                                              |
| comprobando                   | `busy`                      | `Skeleton` de 20 px en la línea del veredicto           | (ninguno)                                                                                                                                                                            |
| libre                         | `dirty`                     | `Notice` `good` con el icono `check`; `Save kit` activo | `Distinct from every team in your races.`                                                                                                                                            |
| ya lo lleva otro              | `dirty`                     | `Notice` `warn`; `Save kit` deshabilitado con su porqué | `This kit is already worn by Mistral Racing.`                                                                                                                                        |
| choca con un rival            | `dirty`                     | ídem                                                    | `Too close to Mistral Racing for colour-blind viewers (deuteranopia). Try another colour or figure.`; en visión normal, `Too close to Mistral Racing. Try another colour or figure.` |
| reservado                     | `dirty`                     | ídem                                                    | `Too close to the yellow jersey. Leader and champion designs are reserved.`                                                                                                          |
| se parece a un nacional       | `dirty`                     | ídem                                                    | `Too close to the champion of Morocco.` (D-00h)                                                                                                                                      |
| sin contraste                 | `disabled`                  | la muestra tachada                                      | `Too alike: the pattern would disappear in greyscale.`                                                                                                                               |
| en espera                     | `disabled`                  | losetas y muestras deshabilitadas                       | `You changed your kit on day 50. Next change from day 78.`                                                                                                                           |
| guardando, guardado, error    | `saving`, `saved`, `failed` | los de la `ActionBar` (§4.3)                            | `Saving…`; `Saved`; `Could not save. Try again.` y `Retry`                                                                                                                           |
| programado                    | `ready`                     | el nuevo a 72 px, con `Chip` `neutral`                  | `New kit from tomorrow (day 51).`                                                                                                                                                    |
| sin red o fallo del veredicto | `offline`, `error`          | `ErrorState` en la línea del veredicto                  | `Couldn't check this kit.` · `Retry`                                                                                                                                                 |

Lo reservado nombra lo que estorba: `the yellow jersey`, `the green jersey`, `the blue jersey` o `the world champion's jersey`; un nacional, con el texto de D-00h. **Las rutas**, `spoiler: 'safe'` y con su esquema de respuesta (§13.2): `GET /api/teams/me/kit` (8-e) da `{ current, bib, pending, lastChangeDay, nextChangeDay, options, rivals }`, con el programado (`{ kit, validFromDay } | null`), `options` (los códigos que no se pueden elegir, cada uno con su porqué, `contraste`, `reservado`, `ocupado` o `rival`, con lo que se tachan las muestras) y los ocho rivales con más carreras compartidas (`{ teamId, name, kit, races }`). `POST /api/teams/me/kit/check`, cuerpo `{ kit }` estricto, contesta un `KitVerdict` a los 300 ms del último toque y es la autoridad. `PUT /api/teams/me/kit`, cuerpo `{ kit?, bib? }` con uno al menos (`kitSchema` y `BibStyle`; el `bib` se guarda en el acto y no cuenta para la espera ni para la unicidad), contesta 200 `{ ok: true, validFromDay }` o, en el orden de `kitCheckCodeSchema`, 429 `kit_reciente` (antes de `KIT_CHANGE_COOLDOWN_DAYS` = 28 días de juego, DD-09), 400 `kit_igual` (el vigente o el ya programado), 400 `kit_contraste`, 409 `kit_reservado`, 409 `kit_ocupado` (otro equipo del mundo lleva ese maillot canónico, aunque sea un NPC; también si gana otro guardado a la vez, §8.5) y 409 `kit_se_confunde` (a menos de 10 de un rival de temporada), y los de hoy, 401 y 409 `sin_equipo`. **La espera** cuenta desde la última fila `manager` posterior a la última `system`; tomar el equipo (`takeOverBotTeam`, `teamControl.ts` l. 79-100) escribe una fila `system` con el maillot vigente para mañana (`on conflict do nothing`), así que el primer cambio tras tomarlo, y el primero tras la traducción, son libres (8-g). `PUT /api/teams/me` deja de aceptar `jerseySeed` en el PR 18a (`routes/teams.ts` l. 19-27; `teamControl.ts` l. 182-186). **Un solo guardado** (8-h): nombre y país siguen en `TeamManager` con `PUT /api/teams/me`, sin botón propio; la `ActionBar` lleva los dos, dice `Save kit` si solo cambió el maillot y `Save changes` (pantalla) si cambió otra cosa, llama primero a `PUT /api/teams/me` y después a `PUT /api/teams/me/kit` y da un solo resultado, como el cuadro (§10.9).

### 8.8 Para E9

El vocabulario es cerrado, sin texto libre ni imagen, y el nombre del patrocinador sale de una lista cerrada (DD-19, §9.9), así que la superficie de moderación del maillot es pequeña (identidad §6.3). E3 deja a E9 tres piezas: **la historia** de `team_kits`, con quién puso cada maillot y desde qué día; **`revertKit(tx, teamId, reason)`** (`packages/db/src/kits.ts`), que escribe con `setKit` para mañana una fila `set_by = 'moderator'` con el último maillot `system` del equipo, o uno nuevo de `ensureKits` si ese ya lo lleva otro o choca, y pone la espera; y **`POST /api/admin/teams/:id/kit/revert`**, cuerpo `{ reason }` de 3 a 200 caracteres, en `routes/admin.ts`, con `requireAdmin` y `ADMIN_VEIL` (`spoiler.ts` l. 95-98). El motivo va al registro de la API hasta que E9 tenga el suyo, y el mánager lee en su diario `Your kit was reset by a moderator.` (pantalla). El flujo de denuncia es de E9, y también si una reversión borra el maillot de las etapas ya vistas: hoy no, porque la historia no se reescribe.

### 8.9 El clon y la semilla del dibujo

**El defecto vivo** (H-21; mapa 03 §2.2, medido): `seedWorld` corre en cada tick (`tick.ts` l. 265) y reconoce los equipos por su `jersey_seed` (`world.ts` l. 459-468); cambiar el maillot escribe otra semilla (`teamControl.ts` l. 182-186) y el tick siguiente crea un NPC con la vieja: de 219 equipos y 3.900 corredores a 220 y 3.912, sin ningún test que lo cubra. Además, `teamIndexFromSeed` (`world.ts` l. 542-545) da 0 a una semilla que no es de la génesis, así que un equipo humano con la semilla cambiada que pierda su dueño se renombraría como el índice 0 de su división, con su país (l. 574, 594 y 598). **El paso 1** (D-32), independiente de todo: (1) la migración de drizzle-kit `0050_semilla_del_dibujo` añade `teams.jersey_style_seed` `text`, nula; (2) `updateOwnedTeam` escribe la semilla elegida ahí y nunca en `jersey_seed`; (3) todo lo que dibuja lee `coalesce(jersey_style_seed, jersey_seed)` y lo sirve con el nombre de hoy, `jerseySeed` (los tres contratos de equipo, el reparto de `cast.ts` l. 141-149 y `getCastIdentities`, `castIdentities.ts` l. 44-49), sin que cambie ningún contrato ni la web; (4) `teamIndexFromSeed` devuelve `null` para una semilla que no casa con `:team:<DIV>:<i>:jersey`, y `reconcileTeams` ni poda ni renombra esos equipos; (5) la descripción del PR lleva dos consultas de solo lectura para producción: los equipos con dueño cuya `jersey_seed` no casa con `:team:(WT|PRS|CON):[0-9]+:jersey$`, y los NPC cuya plantilla entera nació más de un día después de `worlds.created_at` (los clones, o un aumento de estructura). Qué se hace con los clones lo decide el dueño (DD-17); por defecto se quedan, porque son NPC de pleno derecho, y la traducción les da un maillot propio como a todos. **Los tests primero**, en `packages/db/src/jerseyClone.test.ts` (PGlite): la reproducción del mapa 03 §2.2 (dueño, candidata 3, un tick: siguen 219 equipos y 3.900 corredores, y el dibujo servido es el elegido) y el equipo con la semilla cambiada que pierde su dueño, que ni se poda ni se renombra. **La columna muere** en el PR 19c con `0053_sin_semilla_del_dibujo`, junto con `jerseySeed` de los contratos, cuando la traducción ya ha corrido en producción; lo grabado antes se sigue dibujando con la semilla de su reparto, que no es esta columna.

### 8.10 El maillot en grande: la espalda, el culote y las zonas del patrocinador

El dueño: «28 px dijimos que es el tamaño mas pequeño, pero en ocasiones tiene que poder verse mucho mayores... incluso quizas me gustaria que se puedan poner publicidad en el maillot si el equipo vende el espacio a un sponsor... para eso tiene que poder verse en la pagina del equipo el maillot en tamaño grande... e incluso quizas tambien la parte de atras del maillot?? y el pantalon?» (`00-encargo.md` §7.3, l. 304-307, en `3bd1754`, 21 de octubre de 2026). **Los tamaños** (D-00g): `showcase` 160 y `poster` 320, solo en `/team/identity` (§8.7), la ficha del equipo (`Team.tsx`, hoy a 44, l. 87) y la cabecera de la ficha del corredor (`RiderHeader`, §4.6); `poster` no cabe en un `Panel` a 360 (312 px útiles) y se abre al tocar en una `Sheet` a pantalla completa (336). **Las vistas** (`KitView`): de 28 a 96 px, solo `front`; `back` y `bib`, solo a 160 o a 320, y el tipo de `KitProps` no deja otra cosa. `KitShowcase` (`ui/KitShowcase.tsx`) las pone en `Tabs`: `Front`, `Back` y `Shorts` (pantalla).

**La espalda** es la de delante vista desde detrás (8-n): la silueta `TORSO_BACK`, la de `TORSO` con el escote más alto (`… L32 8 Q24 10 16 8 Z`, el control en y 10 y no en 12) y sin cuello; la figura reflejada (x → 48 − x, `kitBackPath`), que deja igual las cinco simétricas y lleva `halves` a la izquierda (`M0 0H24V48H0Z`) y `sash` del hombro derecho a la cadera izquierda (`M34.24 6.71 L6.24 38.71 L13.76 45.29 L41.76 13.29 Z`), porque la banda da la vuelta al cuerpo; los tres bolsillos, `POCKETS` = `M14.5 33.5H33.5 M20.8 33.5V40.5 M27.2 33.5V40.5`, en trazos de 0,5 u y `rgba(0,0,0,0.3)`; el nombre del equipo sobre los hombros, en mayúsculas de la letra del sistema a 700, en blanco o en `ink` según cuál contraste más, solo si su letra llega a 12 px y nunca cortado ni más pequeño (el nombre admite 40 letras, `routes/teams.ts` l. 20); y el sitio del dorsal, un rectángulo blanco con el número en `ink` 700 de 6 u (20 px a 160), solo cuando hay dorsal (el corredor en carrera, `#214`); en las vistas del equipo el sitio queda libre y ningún patrocinador lo ocupa. La espalda de un campeón: la del mundial, blanca; la del nacional, su bandera sin reflejar, para que un escudo o un texto no salgan del revés, y sin estrella ni letras.

**El culote** (`view="bib"`; 8-o): `BIB` = `M12 8 L36 8 L38 40 L26 40 L24 26 L22 40 L10 40 Z` y sus tirantes, `M15 8 L16.5 1 L19.5 1 L18.5 8 Z M33 8 L31.5 1 L28.5 1 L29.5 8 Z`, en su `viewBox` de 48, y un vocabulario de cuatro, `BibStyle`: el cuerpo negro (`black`, el de siempre) o del color base del maillot (`base`), con o sin los paneles de los costados (`.panel`; `BIB_PANELS` = `M12 8 L16 8 L14 40 L10 40 Z M36 8 L32 8 L34 40 L38 40 Z`, 4 u por fuera de cada pernera) en el segundo color del maillot, o en su base si es un `plain` con cuerpo negro; los puños, de y 37 a 40, van en el color de los paneles, o en el del cuerpo si no los hay. No se ofrece lo que no pasa la regla de contraste (§8.1), como `base.panel` en un `plain`, ni `base` si la base es `black`. Es del equipo también bajo un maillot de campeón (D-00g), y no cuenta para la unicidad ni para la tabla de choques, porque nunca se ve en carrera; se guarda en `teams.bib` (§8.5). La guía de la UCI pide a sus campeones el culote liso, negro o blanco (`00-encargo.md` §7.3); aquí manda nuestro vocabulario.

**Las zonas del patrocinador** (D-30, D-00g; quién compra qué, §9.9), cada una con su caja en el `viewBox` de su vista. Una letra de `MIN_FONT_PX` = 12 px pide 576 / tamaño u, y cada mayúscula avanza unos 0,65 em (estimado, como en §9.9), así que en cada caja caben estas mayúsculas (`zoneCapacity(box, size)`; en el nombre del equipo, 10 a 160 y 20 a 320):

| Zona (`SponsorZone`) | Vista            | Caja en u: x, y, ancho y alto                                        | 72 px    | 96 px    | 160 px  | 320 px |
| -------------------- | ---------------- | -------------------------------------------------------------------- | -------- | -------- | ------- | ------ |
| `chest`              | delante          | 14, 23, 20 y 10                                                      | 3        | 5        | 8       | 17     |
| `back`               | detrás           | 14, 18, 20 y 9                                                       | no se ve | no se ve | 8       | 17     |
| `sleeves`            | delante y detrás | 10, 13, 3,5 y 6, y 34,5, 13, 3,5 y 6, con el texto en vertical       | no se ve | no se ve | ninguna | 5      |
| `bibSides`           | culote           | 11,65, 14, 2,7 y 20, y 33,65, 14, 2,7 y 20, con el texto en vertical | no se ve | no se ve | ninguna | 17     |

**La regla** (8-p): en una zona comprada se pinta el nombre del patrocinador si cabe; si no, su marca de dos o tres mayúsculas (§9.9) si cabe; si no, en las vistas grandes, la caja llena del color de su ficha en la lista cerrada (DD-19), y en las pequeñas nada, para que el maillot de carrera siga siendo el del vocabulario y su distancia medida no cambie. El texto va en blanco o en `ink`, el que más contraste (§9.9). En un maillot de campeón, el pecho es de la estrella y de las letras del país (§9.1) y `chest` no se pinta; la espalda y las mangas, sí. `BACK_NAME_BOX` es 12, 11, 24 y 5, y `BACK_NUMBER_BOX`, 18, 28, 12 y 8. `kitViews.test.tsx` comprueba que la espalda de las siete figuras es la de delante reflejada, que el nombre y el dorsal solo salen cuando caben o existen y que `back` y `bib` no compilan por debajo de 160; `sponsorZones.test.ts`, que cada caja cae dentro de su silueta y la tabla de arriba. Los tipos:

```ts
// packages/shared/src/kit.ts (D-00g): los path, BACK_NAME_BOX y BACK_NUMBER_BOX, con los valores de arriba
export type KitView = 'front' | 'back' | 'bib'
export type KitBigSize = 160 | 320 // las únicas de `back` y `bib`
export const BIB_STYLES = ['black', 'black.panel', 'base', 'base.panel'] as const
export type BibStyle = (typeof BIB_STYLES)[number]
export type SponsorZone = 'chest' | 'back' | 'sleeves' | 'bibSides'
export type ZoneBox = { x: number; y: number; w: number; h: number; vertical?: true }
export declare const SPONSOR_ZONES: Record<SponsorZone, { view: KitView; boxes: ZoneBox[] }>
export declare function zoneCapacity(box: ZoneBox, size: KitSize): number // mayúsculas que caben
export declare function kitBackPath(figure: KitFigure): string | null // la de delante, reflejada
```

---

**Injertos aplicados.** I-05 (§8.5), I-06 (§8.5: los cinco contratos y el reparto servido, con el día de cada uno), I-07 (§8.4, a 28 px y con las 138 señales), I-12 (§8.1: el vocabulario; con D-00e la diagonal vuelve como figura `sash` y la señal de campeón es la de §9.1), I-14 (§8.5: `team_kits` con historia y `set_by`; el patrocinio, §9.9), I-15 (§8.6), I-16 (§8.6, con su noticia), I-24 (§8.3: el filete y su color por superficie; el parámetro, §9.10), I-25 (§8.1: la regla de contraste; §8.7: el veredicto con equipo y visión), I-31 (§8.4).

**Objeciones resueltas.** O-01 (§8.5), O-12 (§8.3: la objeción era que subir el mínimo cambia la pantalla de E2; el dueño lo ha decidido así, D-00b, y la barra pinta un maillot por equipo), O-19 (§8.7: la espera de 28 días y el NPC que cede, DD-09 y DD-08), O-21 (§8.6), O-25 (§8.1 y §8.2: el vocabulario de D-00e medido a 28 px con la regla y lo reservado; las carreras, la puerta; sin respaldo B, porque DD-04 está decidida).

**Huecos rellenados.** H-01 (§8.4: `seasonRivals` y `fieldTeamsFor`, sin tabla nueva y con sus tres límites), H-02 (§8.5; el inventario, §13.5), H-21 (§8.9). Contradicciones de hecho escritas: X-02 (§8.1: los doce caben, y con los quince el peor par de las dicromacias sigue en 12,3), X-08 (§8.5: `team_kits` y `ensureKits` en lugar del `not null` con relleno) y X-19 (§8.3: los 280 px de doce maillots de 16 serían 424 a 28).

**Decisiones de esta sección.**

- 8-a. El cuello es blanco al 85 % en todas las figuras, como hoy y como lo midió telefono. Descartado: el cuello en el segundo color de identidad, que cambiaría lo medido.
- 8-b. El filete claro es de 1 u en `rgba(0,0,0,0.3)` a todos los tamaños: la regla de identidad, mín(2, máx(1, 26 / tamaño)) u, da 1 u desde 26 px, y con 28 de mínimo es una constante. El de hoy, de 1 u al 18 %, se pierde. La puerta y `medir28.py` miden con el que se implementa, porque la tabla de choques lleva su huella.
- 8-c. Los tamaños de hoy que no son un `KitSize` pasan al igual o al inmediatamente mayor (de 12 a 26 a 28, 44 a 48), nunca a uno menor.
- 8-d. «El maillot libre más lejano de sus rivales» (D-23) es, para los que nacen, el primero libre en el orden de su semilla que no esté en la lista `near` de un rival, porque la tabla de choques solo guarda lo que está a menos de 10 y el tick no rasteriza (D-24); la puerta mide el resultado. Descartado: rasterizar en el tick contra todos los rivales, de 30 a 60 s por equipo con 201 rivales (estimado).
- 8-e. El editor necesita una lectura que G.7 no tenía, `GET /api/teams/me/kit`. Descartado: cargar la tabla de choques en la web.
- 8-f. Lo grabado antes de la traducción necesita su semilla para dibujarse (D-23), así que en el 19c `RiderCard.team` cambia `jerseySeed` por `legacySeed`, nula siempre que hay `kit`: viaja solo donde la pantalla la pinta (D-53). Ver la duda 1.
- 8-g. Como `teams` no guarda cuándo se tomó un equipo, tomarlo escribe una fila `system` que reinicia la espera. Descartado: una columna nueva en `teams` solo para esto.
- 8-h. Un solo guardado en `/team/identity`, con `Save kit` o `Save changes`. Descartado: dos botones de guardar en la misma pantalla.
- 8-i. La traducción ordena por la distancia en visión normal, porque busca el parecido que reconoce la mayoría; la separación entre rivales se exige en las cuatro.
- 8-j. Los tres colores nuevos son `taupe`, `brown` y `plum`, con la condición de quedar a 20 o más del blanco y del amarillo del líder. Descartado: el trío sin esa condición (`#873c5a`, `#c3ffc3` y `#3c1e00`), cuyo verde menta queda a 18,7 del amarillo del líder en protanopía y se leería como su cuerpo.
- 8-k. `halves.a.b` y `halves.b.a` son un solo maillot canónico, el mismo visto de espaldas (503 distintos en lugar de 536 antes de reservar los nacionales; 491 en lugar de 524 después). Descartado: contarlos como dos, que dejaría a dos equipos con el mismo maillot en cuanto uno se diera la vuelta.
- 8-l. La unicidad la guarda `teams.kit_canonical` con un índice único, escrito por `setKit` en la misma transacción que la fila de `team_kits`. Descartado: comprobarlo solo en el código, que deja pasar dos guardados a la vez, y un índice sobre `team_kits`, que con la historia no puede decir «el mismo día».
- 8-m. Un maillot que ya lleva otro equipo da siempre `kit_ocupado`, también si es un NPC; DD-08 solo hace ceder al NPC cuando el choque por distancia aparece después. Descartado: que el NPC ceda también su maillot exacto, que dejaría a un mánager quitarle a un NPC el maillot que la afición conoce.
- 8-n. La espalda es la figura de delante reflejada, como se ve desde detrás, con el nombre sobre los hombros y el dorsal en la parte baja, sobre los bolsillos. Descartado: repetir la de delante sin reflejar, que en `halves` y `sash` no daría la vuelta al cuerpo.
- 8-o. El culote tiene cuatro estilos, negro o de la base, con o sin paneles, y por defecto es negro. Descartado: un vocabulario propio de colores y figuras para el culote, que doblaría el editor.
- 8-p. Una zona comprada pinta el nombre, la marca o, solo en grande, un bloque, y en las vistas pequeñas no pinta nada. Descartado: bajar la letra de 12 px o cortar el nombre.

---

## 9. Los maillots (II): la señal de campeón, los líderes, el patrocinador y `WornJerseyIcon`

Esta sección dibuja lo que un maillot de equipo no puede llevar: la señal de campeón que eligió el dueño (D-00d, que sustituye a D-26; DD-03 decidida), con la estrella del nacional revisada país a país y las dos letras de su código (D-00f), entera y medida a 28 px, con lo que cuesta; su palabra juzgada variante a variante (D-27) y las alternativas que no eligió, con sus cifras; los tres de líder (D-28) y lo que sustituye al dorsal del equipo líder (D-29); lo que compra un patrocinador (D-30, con las zonas de §8.10); y el único componente que elige el dibujo de un corredor, `WornJerseyIcon` (D-31). Todo a 28 px o más (D-00b). El dueño ya ha aceptado el degradado del arcoíris y la estrella del nacional (D-00f); lo único que sigue siendo del orquestador es el filo `navy-dark` de las estrellas, y va marcado para que lo vea en §19 y lo pueda quitar. El vocabulario del equipo, `Kit` y `KitSurface` son de §8. Nada de lo que se dice de la marca de la UCI es asesoramiento jurídico.

### 9.1 La señal de campeón: el nacional viste su bandera; el mundial, la estrella

**La palabra del dueño** (`00-encargo.md`, 21 de octubre de 2026). Del nacional: «lo primero el maillot de pais debe por si mismo identificar el pais... o sea, diria que todo el maillot coloreado con los colores y forma de la bandera, no? Puedes hacerlo? Nada de tener que pegar despues la bandera...» (§7.2, l. 264-266, en `bd74602`), y después: «Me parece bien lo de la estrella... aunque algunas banderas justo tienen una estrella dorada... habrá que ver caso a caso para cada uno de los paises soportados... y quizas prohibir algunas combinaciones de paises para que no coincidan demasiado parecidos a una bandera, exacto... Oye, y si pusieramos en el maillot 2 letras con el codigo ISO del pais? o sea el maillot de españa es la bandera de españa y en el pecho 2 letras ES... el de marruecos, pues es la bandera de marruecos y en el pecho 2 letras MA... y asi ya no se confunde con ningun equipo.» (§7.3, l. 297-302, en `3bd1754`). Del mundial: «quizas una que tenga una estrella para que vaya con el logo de cyclingstar, tiene sentido... y quizas que la estrella sea de arco iris??? con el fondo blanco diria yo...» (§7.2, l. 270-272), y «ok, me parece bien en degradado» (§7.3, l. 310). **El dibujo**, en `packages/shared/src/kit.ts` y en u:

```ts
// packages/shared/src/kit.ts: la estrella del logotipo (Logo.tsx l. 30-32) pasa aquí, y Logo.tsx la importa
export const LOGO_STAR =
  'M36 2 L39.2 9.2 L47 10 L41.2 15.3 L42.9 23 L36 19.1 L29.1 23 L30.8 15.3 L25 10 L32.8 9.2 Z'
/** El espectro natural, de rojo a violeta, en degradado continuo y en diagonal (aceptado por el dueño). */
export const CHAMPION_RAINBOW = [
  '#e53935',
  '#fb8c00',
  '#fdd835',
  '#43a047',
  '#1e88e5',
  '#5e35b1',
] as const
export const CHAMPION_STAR_EDGE = '#0b2740' // navy-dark (lo añade el orquestador)
export const CHAMPION_GOLD = '#e0a526' // la estrella del nacional (D-00f)
export const CHAMPION_SILVER = '#c0c7d2' // la del continental, provisional (E12)
export const WORLD_STAR = { widthU: 18, cx: 24, cy: 28.5, edgeU: 1.5 } as const
/** La del nacional mide 10 u y va en el primero de estos sitios que sea campo de su bandera (§9.5). */
export const NATIONAL_STAR = { widthU: 10, edgeU: 1 } as const
export const NATIONAL_STAR_SITES = {
  high: [24, 14.8],
  right: [31.5, 14.5],
  left: [16.5, 14.5],
  center: [24, 25],
} as const
export type NationalStarFill = 'gold' | 'white' | 'navy' // navy: navy-dark con filo blanco
export type NationalStarOverride = {
  site?: keyof typeof NATIONAL_STAR_SITES
  fill?: NationalStarFill
  why: string
}
/** La regla de §9.5, revisada en la hoja; `champion.test.ts` la fija. */
export declare const NATIONAL_STAR_OVERRIDES: Readonly<Record<string, NationalStarOverride>>
/** Las dos letras del país: centradas en x 24, base en y 38,5, de 8 u a 700, filo de 2 u debajo. */
export const NATIONAL_CODE = { x: 24, y: 38.5, sizeU: 8, edgeU: 2, minPx: 72 } as const
/** La caja de la bandera: el alto del torso (de y 8 a 42) a 4:3, centrada en x 24, mangas dentro. */
export const NATIONAL_FLAG_BOX = { x: 4 / 3, y: 8, width: 136 / 3, height: 34 } as const
/** `translate(cx cy) scale(widthU / 22) translate(-36 -12.5)`: la del logotipo mide 22 × 21 u. */
export declare function starTransform(widthU: number, cx: number, cy: number): string
```

`ChampionJersey` (`apps/web/src/components/ui/ChampionJersey.tsx`, props `{ title: ChampionTitle; size: KitSize; surface?: KitSurface }`; 9-g) pinta, de abajo arriba: `TORSO` en blanco; en el nacional, dentro del `clipPath` de `TORSO`, la bandera de su país (la celda del sprite, D-49 y §12.7, por debajo de 72 px, y su SVG desde 72, 9-l), escalada para cubrir el torso conservando su proporción y centrada (9-f); el filete de los líderes, `rgba(0,0,0,0.35)` de 1,5 u (`Jersey.tsx` l. 113 y 162), o el claro de `surface="dark"` (§9.10); el cuello de siempre, `COLLAR` blanco al 85 %; la estrella, `LOGO_STAR` colocada con `starTransform`, con su filo `CHAMPION_STAR_EDGE` de unión redonda (9-e); y en el nacional, desde 72 px, las dos letras de su código (§9.5). Es `role="img"`, con `aria-label` y `<title>` de `championTitleText` (`broadcast/names.ts` l. 153-170), y `data-ui="ChampionJersey"` con `data-variant` `world`, `national` o `continental`. La capa de la bandera es la única que no es un `path`:

```tsx
// la bandera por debajo de 72 px, dentro del clipPath de TORSO; `cell`, la del país en flagSprite.generated.ts
const flag = (
  <svg
    {...NATIONAL_FLAG_BOX}
    viewBox={`${cell.x} ${cell.y} 64 48`}
    preserveAspectRatio="xMidYMid slice"
  >
    <image href={flagsUrl} width={sprite.width} height={sprite.height} />
  </svg>
)
```

- **Nacional**: el maillot entero es la bandera, mangas incluidas; como la caja es 4:3, igual que la celda, la bandera entra entera de alto y `TORSO` le recorta los lados (se ven 34 de sus 45,3 u de ancho, el 75 %). Encima, la estrella pequeña dorada, `NATIONAL_STAR` en `CHAMPION_GOLD`, que el dueño aceptó (D-00f), para que la estrella sea la señal de «campeón» en los dos casos y la bandera diga de dónde, en el sitio y del color que da la regla de §9.5; y desde 72 px, las dos letras de su código (`ES`, `MA`). **Sin bandera al lado**: se borra la de `Jersey.tsx` l. 165, y ninguna pieza pone una bandera junto al maillot salvo `RiderLabel`, que pinta la del corredor delante de su nombre (D-00c). `Champion of Italy` (pantalla).
- **Mundial** (lo correrá E12): el cuerpo blanco y la estrella del logotipo de 18 u en el pecho, rellena con `CHAMPION_RAINBOW` en un `linearGradient` de (0, 0) a (1, 1) con seis paradas iguales: el espectro natural, en degradado continuo y en diagonal, nunca los cinco colores de la UCI ni en bandas, que el dueño aceptó. El filo `navy-dark` de 1,5 u es **lo que añade el orquestador**. Sin letras: es el campeón del mundo y no de un país (D-00f). `World champion` (pantalla).
- **Continental** (E12): el cuerpo blanco y la estrella del mundial en `CHAMPION_SILVER`, provisional hasta que E12 decida los continentes; `Continental champion` (pantalla), el texto provisional de `names.ts` l. 163.

**Lo reservado** (D-00d): la estrella y el cuerpo blanco, que ningún maillot de equipo, de líder ni de patrocinador lleva; se cumple por construcción, porque ninguna figura tiene estrella y el blanco solo es segundo color (§8.1). **Ruta y crono, élite y sub-23 comparten el dibujo** y los separa el texto (`Time trial champion of Italy`, `U23 champion of Italy`, pantalla), porque `wearableTitles` solo deja llevar los títulos de la disciplina y la categoría del día (`jerseys.ts` l. 270-275; cobertura C1; X-17). El filo da 15,23:1 contra el blanco (`<scratchpad>/redactor-L2/contraste.py`, WCAG 2.x), y es lo que deja leer la estrella dorada, que sola daría 2,19:1, y la parada amarilla del arcoíris, `#fdd835`, que daría 1,40:1, sobre el blanco y en grises. **Cómo se ve**, en píxeles (px = u × tamaño / 48):

| Pieza                                    | 28 px  | 40 px  | 48 px  | 72 px    | 96 px  | 160 px      | 320 px      |
| ---------------------------------------- | ------ | ------ | ------ | -------- | ------ | ----------- | ----------- |
| la estrella del mundial, 18 u de ancho   | 10,5   | 15,0   | 18,0   | 27,0     | 36,0   | 60,0        | 120         |
| su filo, 1,5 u                           | 0,88   | 1,25   | 1,50   | 2,25     | 3,00   | 5,00        | 10,0        |
| la estrella del nacional, 10 u           | 5,83   | 8,33   | 10,0   | 15,0     | 20,0   | 33,3        | 66,7        |
| su filo, 1 u                             | 0,58   | 0,83   | 1,00   | 1,50     | 2,00   | 3,33        | 6,67        |
| las dos letras, de 8 u, y su filo de 1 u | no van | no van | no van | 12 y 1,5 | 16 y 2 | 26,7 y 3,33 | 53,3 y 6,67 |
| la bandera que se ve, 34 u de ancho      | 19,8   | 28,3   | 34,0   | 51,0     | 68,0   | 113         | 227         |
| la celda de 64 × 48 del sprite, a escala | 0,41   | 0,59   | 0,71   | SVG      | SVG    | SVG         | SVG         |

La última fila es por píxel CSS: en un teléfono de densidad 3 la celda ya se amplía 1,24 veces a 28 px y 1,77 a 40, así que por debajo de 72 los escudos se verán blandos (calculado, sin mirar en un aparato; la duda 5); desde 72 va el SVG de la bandera (9-l).

### 9.2 Lo que cuesta: la marca de la UCI

La marca es `five horizontal stripes composed of colours blue, red, black, yellow and green (in this order)` sobre blanco, registrada a nombre de la UCI y `a unique identifier of the UCI World Championships and of the UCI alone`; la guía 5.3 regula también la vertical y la diagonal y fija el orden (`No other order will be approved`), y la UCI cobra licencia y la retira (`00-encargo.md` §7.1). El registro encontrado es el del logotipo, la registración internacional 1276964 de la OMPI, con los cinco colores reivindicados y las clases 12, 25 y 41; el de las bandas solas no se ha encontrado (mapa 03 §7.1). **El coste que el dueño tiene que conocer** (D-00d; §19): el maillot blanco con una estrella de arcoíris no tiene la estructura de la marca (ni cinco bandas, ni sus colores, ni su orden), pero evoca a propósito «el arcoíris del campeón del mundo» que `SPEC.md` l. 874 prohíbe imitar; mantenerla pide reescribir esa línea como «las cinco bandas de la UCI» y verificarla ante la EUIPO y la USPTO antes del lanzamiento, que es tarea del dueño y no un PR de E3 (D-59, §18).

**Las distancias, a 28 px** (medido aquí: `medir28.py`, con el rasterizador de `opciones/medidas.py`, Chromium 141.0.7390.37; la marca es la V0 del mapa 03 §7.2, cinco bandas de 2 u sobre blanco; la equipación es la permitida más cercana de §8.1, en cada vista):

| Señal          | A la marca: normal, protanopía, deuteranopía, tritanopía y grises | Equipación más cercana, en las mismas cinco                                                                                   | Líder más cercano, en las cuatro |
| -------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| el mundial     | 12,7; 11,6; 11,7; 12,1; 9,2                                       | 14,6 `sides.taupe.white`; 12,2 `yoke.teal.white`; 11,3 `sides.pink.white`; 14,5 `sides.taupe.white`; 9,4 `sides.orange.white` | 25,9                             |
| el continental | 13,0; 12,4; 12,4; 11,7; 8,3                                       | 12,8; 11,3; 10,4; 14,0; 8,6                                                                                                   | 25,6                             |

El mundial queda tan cerca de la marca como el `ChampionMark` de hoy (12,2 a 13 px, re-medido por el juez de cobertura, `juez-cobertura/medida.py`; X-16) y mucho más que la banda de honor que el dueño descartó (45,7 y 37,6 en grises a 13 px): para la distancia dibujada los dos son «un maillot blanco con color en el pecho», que es también lo que es la marca. Lo que la separa es lo que la distancia no mide: una estrella y no bandas, el espectro y no los cinco colores, sin negro y en diagonal. Los 133 nacionales, con su estrella donde la pone la regla de §9.5 (`medir-nacional2.py`), quedan de la marca a 17,3 o más en visión normal, 16,2 en la peor dicromacia y 10,8 en grises (el más cercano, Chipre, de cuerpo blanco), y de los líderes a 11,5 o más en las cuatro visiones (O-14).

### 9.3 La palabra del dueño, variante a variante

El 20 de octubre de 2026 el dueño ofreció cambiar el arcoíris ([DUEÑO 2]): «una cosa, lo del arco iris, si esta registrado y tiene que ser diferente... igual puede ser un maillot arco iris diferente... con diferentes colores, diferente orden, diferente disposicion, incluso verticales en vez de horizontales... o que el resto en vez de ser blanco sea de otro color, no se, creatividad por favor» (`00-encargo.md` l. 221-224, conversación de diseño de E3); el 21 eligió la estrella (§9.1). Cada variante, con los cuatro criterios de `00-encargo.md` §7.1 y las cifras de las propuestas y del mapa 03 a 13 y 16 px (D-27; I-13), y la elegida, medida a 28 px. «A la marca» es la distancia dibujada a la marca, en visión normal y en grises; «equipación» es la más cercana del vocabulario de cada propuesta en las cuatro visiones:

| Variante                                                                     | 1. A la marca de la UCI                                                                                  | 2. Forma                                                       | 3. Equipación más cercana, y cuántas por debajo de 10      | 4. Reservable               | Veredicto                       |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------- | ------------------------------- |
| otros colores: cinco bandas de 2 u sobre blanco                              | es la estructura de la marca; 9,4 y 1,4 a 16 px (telefono), 8,7 y 1,5 a 13 (identidad V4)                | bandas de 0,67 px a 16, que el navegador mezcla (mapa 03 §7.3) | 14,7, 12,9, 13,8 y 14,8; ninguna (telefono)                | sí                          | fuera: más cerca que otro orden |
| otro orden                                                                   | la guía fija el orden y el público no lo nota (inrng, 2011); 14,1 y 5,3 (telefono), 14,9 y 5,3 (V1)      | ídem                                                           | 16,2, 13,8, 13,5 y 15,0; ninguna                           | sí                          | fuera                           |
| en vertical o en diagonal                                                    | la guía regula las dos; 22,5 y 14,7 (telefono), 14,4 y 8,4 (V2 y V3); en vertical, invertir es un espejo | ídem                                                           | 15,1, 11,8, 10,9 y 12,1; ninguna                           | sí                          | fuera                           |
| otro fondo: navy                                                             | los colores de la UCI en su orden siguen siendo la marca; 40,7 y 39,5                                    | «azul con algo en el pecho»                                    | 13,8, 8,4, 6,0 y 11,8: 4 en protanopía y 5 en deuteranopía | choca                       | fuera                           |
| otro fondo: oro                                                              | ídem; 22,7 y 12,5                                                                                        | ídem                                                           | 17,8, 8,7, 7,7 y 14,5: 1 y 4; a 17,9 del amarillo de líder | choca                       | fuera                           |
| espectro continuo en banda horizontal, sobre noche (V7)                      | ni cinco bandas, ni sus colores, ni blanco, pero «el arcoíris en el pecho»; 58,9 y 51,3                  | banda horizontal: la de `band` y la del verde                  | 16,8, 15,1 y 6,8 en grises: 12 (identidad)                 | no                          | fuera                           |
| el espectro de siete paradas en la diagonal, sobre noche (identidad C)       | no es la marca, pero evoca «el arcoíris del campeón del mundo» (`SPEC.md` l. 874); 48,7 y 38,2           | la de la banda de honor                                        | 24,9, 20,8 y 14,1 en grises: ninguna                       | sí, diagonal                | alternativa C, descartada       |
| **la elegida**: el espectro en la estrella del logotipo, sobre blanco (§9.1) | no es la marca, pero la evoca igual; 12,7 y 9,2 a 28 px (§9.2)                                           | «blanco con una estrella en el pecho», la del logotipo         | 14,6, 12,2, 11,3 y 14,5 a 28 px: ninguna, por la reserva   | sí: la estrella y el blanco | **la del dueño (D-00d)**        |

Las señales propias que se midieron sin depender de bandas (identidad §6.5, `exp1_senal.py` y `exp11_candidatas.py`, a 13 px; la marca en visión normal y en grises): la estrella de hoy, `ChampionMark` (12,5 y 8,2), la corona de cumbres (51,0 y 45,0, que se lee como la montaña), los meridianos (48,0 y 43,4, una mancha), la estrella grande del logotipo (49,0 y 41,7, un bulto a 13 px), el galón en V (47,6 y 39,7) y la banda de honor (44,3 y 35,5; el juez, 45,7 y 37,6). A 28 px, que es el mínimo desde D-00b, la estrella deja de ser un bulto: la del mundial mide 10,5 px. Las tres franjas de 7 u navy, cian y oro sobre blanco de telefono (23,0 y 14,6 a 16 px) se descartaron por su medida, el «blanco con franjas en el pecho» de la estructura de la marca, y no por el SPEC (O-15).

### 9.4 Las alternativas que el dueño no eligió

`opciones/index.html` las pintó a 13, 16, 28 y 72 px, sobre blanco y en un pelotón, con su simulación de daltonismo, y el dueño eligió mirándolas (`00-encargo.md` §7.2). Quedan con sus cifras (`juicios/veredicto.json` → `gusto`, DD-03), por si §19 las vuelve a abrir: **A**, la banda de honor, el defecto de D-26 (identidad A): `SASH_PATH`, la diagonal de 10 u que hoy es la figura `sash`, el mundial `#14213d` con banda y cuello `#e0a526` y el nacional sobre `#f6f3ea` con tres franjas de su bandera y filo de 2,4 u, a 45,7 de la marca (37,6 en grises) a 13 px e Italia a 22,6 (15,7). **B**, la estrella dorada sobre marino (sistema S1): torso `#14284b` y estrella `#f0b323` de radio 9,5 u y 3,9 en (24, 29), con canesú dorado la mundial, a 50,3 de la marca, y todos los nacionales iguales. **C**, el arcoíris diferente en la diagonal (identidad C): la banda de A con siete paradas (`#e53935`, `#fb8c00`, `#fdd835`, `#43a047`, `#1e88e5`, `#5e35b1` y `#d81b60`) sobre noche, a 48,7 (38,2), con el mismo coste de `SPEC.md` l. 874. **D**, la estrella sobre blanco (telefono A y lectura (a)): el `ChampionMark` que el dueño ya había visto, estrella navy de 13 u y 6,2 en (24, 28,5), a 15,1 y 9,2 a 13 px. **E**, las otras señales con bandas (telefono C, sistema D1, lectura (b) e identidad B): tres franjas navy, cian y oro sobre blanco (23,0), tres bandas sobre marino (42,3), tres arcos sobre `#0b2740` (54,9) y el galón `M7 9 L24 25 L41 9 L41 20 L24 36 L7 20 Z` (47,6). **V**, las variantes literales del 20 de octubre: las de §9.3, y ninguna pasa los cuatro criterios.

### 9.5 La bandera del nacional, su estrella caso a caso, sus letras y su hoja

**La bandera**: por debajo de 72 px, la celda de 64 × 48 del sprite (D-49, §12.7), la misma que pinta `RiderLabel` junto al nombre; desde 72, el SVG 4x3 de `flag-icons` de su país, cargado solo cuando se pinta (9-l): la mediana pesa 0,4 KB con gzip y el mayor, Serbia, 48,8 KB (medido sobre los 133). `NATIONAL_SASH`, su generador y sus sobrescrituras desaparecen; Corea sale con su taegeuk y sus trigramas. **Para medir**, `packages/db` no decodifica el WebP de la web, así que `apps/web/scripts/flag-sprite.mjs` escribe también las 133 celdas a 32 × 24 en RGB, que basta para 28 px (la caja mide 26,4 px de ancho): `packages/db/src/flagCells.generated.bin`, 306.432 bytes, y `flagCells.generated.ts`, con el orden de los países y la huella SHA-256 de `flag-icons` y del script; `drawnDistance` (§8.4) las muestrea, y su huella entra en `KIT_GEOMETRY_HASH`.

**La regla de la estrella** (D-00f; 9-i, 9-j). (1) **El sitio**: el primero de `NATIONAL_STAR_SITES` (el alto, bajo el cuello; el de la derecha de quien mira, donde va el escudo de un maillot; el de la izquierda; el centro) que sea **campo** de la bandera: bajo la huella de la estrella con su filo, como mucho un 12 % de otro color que el dominante, y ese dominante igual (a menos de 10 de ΔE00) que el de un disco de 9 u alrededor, para que la estrella no pise un emblema ni la raya entre dos franjas, ni se meta dentro de un emblema mayor que ella. (2) **El relleno**: oro; blanco si la bandera ya lleva una estrella dorada o amarilla (`CN`, `ET`, `PH`, `MY`, `VN`, `BF`, `CM`, `CV`, `MO` y `SR`); `navy` (navy-dark con filo blanco) si el campo es dorado o amarillo, con el oro a menos de 20 de él en visión normal (`BE`, `CO`, `LT`, `BR`, `VE`, `RO`, `IN`, `MD`, `XK`, `AD`, `BA`, `BJ`, `AG`, `BB`, `GW` y `ZW`). (3) **Sin campo**, la estrella va arriba y decide la hoja. Medido sobre las 133 a 96 px (`<scratchpad>/redactor-L2/medir-nacional2.py`, el rasterizador de `opciones/medidas.py`): el alto es campo en 66, el de la derecha en 77, el de la izquierda en 49 y el centro en 47; la regla pone 66 arriba, 29 a la derecha (`NO`, `SK`, `AU`, `CH`, `CA`, `NZ`, `KZ`, `ZA`, `FI`, `RS`, `TR`, `ER`, `DZ`, `PA`, `TN`, `VN`, `IS`, `UZ`, `DO`, `KG`, `HK`, `BF`, `TW`, `LC`, `ME`, `MO`, `MT`, `SC` y `TT`), 1 a la izquierda (`CY`) y 8 en el centro (`GB`, `JP`, `CR`, `GE`, `TH`, `XK`, `LA` y `NA`), y deja 29 sin campo para la hoja (`ES`, `EC`, `BR`, `HR`, `GR`, `IL`, `KR`, `UY`, `IR`, `CU`, `MD`, `KE`, `MY`, `SA`, `MK`, `GU`, `AD`, `AL`, `MU`, `AG`, `BM`, `BZ`, `DM`, `KY`, `LB`, `PR`, `SR`, `SZ` y `ZW`). La estrella se lee en todas: su relleno o su filo quedan a 23,6 o más del campo en las cinco vistas. **Los casos que nombra D-00f**: Vietnam, a la derecha y en blanco, porque su estrella amarilla ocupa el centro; China, arriba y en blanco, lejos de las cinco estrellas de su hombro; Marruecos, arriba y en oro, fuera de su pentagrama; Camerún, arriba y en blanco, sobre la franja roja y lejos de su estrella; Chile, arriba y en oro, fuera de su cantón; Cuba, sin campo entre sus franjas y su triángulo, a la hoja. La hoja enseña también los que la regla sienta dentro de un emblema porque no tienen otro campo: Japón y Laos en su disco, Kosovo en su mapa, y el Reino Unido y Georgia en el cruce de su cruz. **Ghana no está entre los 133** (`countries.ts`), ni Chad ni Irak. `NATIONAL_STAR_OVERRIDES` guarda, con su porqué, cada país cuyo sitio o relleno no es el de por defecto (arriba y en oro) y lo que decida la hoja; `champion.test.ts` comprueba con `flagCells` que cada país cumple la regla o tiene su entrada, que ninguna entrada queda sin porqué y que su estrella se lee.

**Las dos letras** (D-00f; 9-k): el código ISO-2 de `COUNTRIES` (`packages/shared/src/countries.ts` l. 6-11), solo desde `NATIONAL_CODE.minPx` = 72, donde 8 u son 12 px; por debajo, la estrella sola, y la bandera junto al nombre y el texto (`Champion of Spain`) dicen el resto. Van centradas en el pecho bajo, con la base en y 38,5 (la caja de y 32,5 a 38,5 y de x 18 a 30), en la letra del sistema (D-05), que el SVG en línea hereda de la página, a 700 y con 0,04 em de espacio; en blanco o en navy-dark, el de más contraste con el campo bajo la caja (79 en blanco y 54 en navy-dark), y con un filo de 2 u del otro color pintado debajo (`paint-order="stroke"`), del que asoma 1 u, 1,5 px a 72. El peor relleno contra su campo es 4,0:1 (`AL`, `CH`, `GE`, `KG`, `PT` y `TW`, blanco sobre rojo vivo), y contra su filo, 15,23:1, que es lo que lo lee. Las banderas con texto, Brasil y Arabia Saudí, están entre las 29 de la hoja. **Las gemelas**: a 28 px, 74 pares de nacionales quedan a menos de 10 en alguna visión (`medir-nacional2.json`); los más cercanos, en la peor de las cuatro visiones: `ID` y `SG`, 1,7 (a 28 px no se ven la media luna ni las estrellas de Singapur); `ID` y `MC`, 1,7; `IT` y `PE`, 2,3; `IT` con `IE` y con `NG`, 2,9; y `SG` y `MC`, 2,9. Desde 72 px los separan las letras (`ID` y `MC`); por debajo, el texto.

**La hoja de revisión**, que pinta la página de opciones y adjunta el PR del paso 17: el mundial, el continental y los 133 nacionales, a 28 px sobre `surface` y sobre `navy-dark` y a 72 px con sus letras; primero los 29 sin campo y los cinco con la estrella dentro de un emblema, luego los que tienen ajuste y después el resto; cada uno con su código y su nombre en inglés (`Champion of Spain`), su bandera de 21 × 16 como la pinta `RiderLabel`, el sitio y el relleno que le da la regla y por qué (la cobertura y el campo de cada sitio), el maillot de equipo permitido más cercano a 28 px con su distancia y si D-00h lo reserva, y la gemela más cercana con la suya; con el selector de visión de la página (las cuatro y los grises). El dueño contesta con la lista de los que cambia, y cada cambio va a `NATIONAL_STAR_OVERRIDES` con su porqué.

### 9.6 La 7-h de E2, contestada, y la reserva de D-00h

La decisión 7-h de E2 ([DOC 41]; `docs/retransmision.md` l. 5229) descartó para el campeón provisional «el maillot del equipo con una banda de bandera, que en gris se confunde con el verde». El nacional de D-00d no es el maillot del equipo: es la bandera entera con la estrella, medida a 28 px con la regla de §9.5 (`medir-nacional2.json`; H-09). **Frente a los líderes**, ninguno de los 133 baja de 11,5 en las cuatro visiones; en grises no está medido. **Frente a las equipaciones** (D-00h, decidido por el dueño): 10 nacionales tienen alguna de las 536 a menos de 10 en alguna visión (Baréin, Bielorrusia, China, Argelia, Kirguistán, Lituania, Marruecos, Montenegro, Omán y Portugal), con 12 maillots (`plain.green`, `plain.red`, `band.green.orange`, `band.red.black`, `band.red.orange`, `halves.red.white`, `yoke.orange.red`, `yoke.red.orange`, `yoke.red.yellow`, `yoke.red.white`, `sides.black.red` y `sides.orange.red`), y el peor es Marruecos frente a `plain.red`, a 4,7. La tabla de choques los reserva y el editor los tacha con su porqué, `Too close to the champion of Morocco.` (pantalla; §8.7), así que quedan 524 permitidos (491 distintos) y ningún nacional a menos de 10 de uno de ellos. **Lo que mide `packages/db/src/champion.test.ts`** (9-h), antes del paso 17: las 138 señales a 10 o más de todo maillot permitido y de los tres líderes en las cuatro visiones a 28 px, con los grises escritos; la regla de la estrella y sus ajustes (§9.5); las señales entre sí, con la lista de las gemelas; y la distancia del mundial, del continental y de cada nacional a la marca, que no puede bajar de la medida aquí (12,7 el mundial en visión normal).

### 9.7 Los líderes

`LeaderJersey` (`apps/web/src/components/ui/LeaderJersey.tsx`) redibuja los tres que pidió el dueño ([DUEÑO 1]: «poner un maillot amarillo en todas las clasificaciones… y uno verde al que vaya primero por puntos… y uno azul al que vaya primero en la montaña», `docs/navegacion.md` l. 455-459, agosto de 2026), con sus colores y las marcas de telefono §6.5 (D-28), en `LEADER_JERSEY` de `kit.ts`:

| Maillot (pantalla) | Base      | Marca, en u                                                                          | La marca a 28 px               | Contraste de la marca           |
| ------------------ | --------- | ------------------------------------------------------------------------------------ | ------------------------------ | ------------------------------- |
| `Race leader`      | `#facc15` | ninguna, liso                                                                        | (el cuerpo)                    | (no tiene)                      |
| `Points leader`    | `#16a34a` | banda **blanca** de y 23 a 33, la región de `band` (hoy `#bbf7d0` de 7 u)            | 5,83 px (hoy 4,08)             | 3,30:1 (hoy 2,72, mapa 03 §4.1) |
| `Mountains leader` | `#2563eb` | cinco lunares blancos de radio 4 u en los centros de `Jersey.tsx` l. 80-86 (hoy 3,4) | 4,67 px de diámetro (hoy 3,97) | 5,17:1                          |

```ts
// packages/shared/src/kit.ts (la banda usa la región de `band`; los lunares, los centros de hoy)
export const LEADER_DOTS = [
  [19, 22],
  [29, 22],
  [24, 29],
  [19, 36],
  [29, 36],
] as const
export const LEADER_JERSEY = {
  gc: { base: '#facc15', mark: null },
  points: { base: '#16a34a', mark: { kind: 'band', fill: '#ffffff' } },
  kom: { base: '#2563eb', mark: { kind: 'dots', fill: '#ffffff', radiusU: 4 } },
} as const satisfies Record<JerseyKind, { readonly base: string; readonly mark: object | null }>
```

**Medidos a 28 px** (`medir28.json`): entre sí no bajan de 19,8 en las cuatro visiones (en grises, 13,3 a 16 px, telefono); el maillot permitido más cercano queda, del amarillo, a 13,7, 10,8, 11,9 y 11,8 (5,3 en grises, `plain.sky`); del verde, a 14,9, 14,1, 11,0 y 10,5 (3,4 en grises, `band.pink.yellow`); y del azul, a 16,8, 13,1, 14,4 y 13,8 (11,0 en grises). Están a 10 o más en las cuatro porque lo que queda más cerca está reservado (§8.1): la banda del verde es también la figura `band`, y lo reservado es quedar a menos de 10 de él. El filete es el de hoy, `rgba(0,0,0,0.35)` de 1,5 u, o el claro sobre oscuro (§9.10); `role="img"`, con `aria-label` y `<title>` de `JERSEY_LABEL` (`jerseys.ts` l. 145-149). El 3,30 del blanco sobre verde lo da `contraste.py`; el 5,17 de los lunares es del mapa 03. `leaderJerseys.test.tsx` l. 28-88 se re-sella con la banda de 10 u y los lunares de 4.

### 9.8 El dorsal del equipo líder

No vuelve como dibujo (D-29, DD-06). El dueño lo mandó quitar porque en su teléfono se leía «Ill» ([DUEÑO 5]: el commit `994b83c`, del 13 de agosto de 2026, cuenta que el dueño lo vio junto a «Welle Team» y «pregunto que significaba «Ill»», y `6e1b758`, del 15, que «El dueño pide quitarlo, y esta vez es quitarlo de verdad»; mapa 04). En su lugar, la clasificación por equipos pinta el maillot de cada equipo con `Kit` a 28 px delante del nombre, donde hoy va la bandera (`TeamClassTable.tsx` l. 35; identidad §6.4), en filas de 44 px o más (D-00b), y `TeamClassTable` gana la prop `leaderTeamId: string | null`: en la tabla de una etapa, donde la fila 1 es el ganador del día y no el líder (`StageReplay.tsx` l. 230 y 236; `Race.tsx` l. 531; X-14), el equipo de `leaders.team` (`jerseys.ts` l. 128-130) lleva el `Chip` `neutral` `Leads overall` (pantalla); en la acumulada, la fila 1 ya lo es y no lleva nada más. `leaderJerseys.test.tsx` l. 81-88 sigue sellando la ausencia del dorsal, y `stageTables.test.tsx` sigue pasando con el maillot en cada fila, porque cuenta por etiqueta exacta y toma el primer enlace de la fila (l. 35-36 y 43-48; X-13, codigo C10). Los documentos que lo dan por pintado se corrigen en el paso 24 (D-58): `docs/navegacion.md` l. 462-466, 492-495 y 501-504 y cinco líneas de `docs/retransmision.md`.

### 9.9 Lo que compra el patrocinador

Para E8, que vende sitio en la camiseta («Que pueda pagar por imponer su color o por llevar su logotipo en el sitio bueno», `docs/encargos.md` l. 463-465; [DUEÑO 4]), E3 da el vocabulario y sus reglas (D-30, I-14, O-24), y nada más:

```ts
// packages/shared/src/kit.ts
export type KitZone = 'base' | 'secondary' | SponsorZone // las zonas con nombre, §8.10
export interface SponsorOffer {
  readonly zone: KitZone
  /** 'base' o 'secondary': el color del vocabulario más cercano al de su marca */
  readonly color?: KitColorName
  /** 'chest': el patrocinador de la lista cerrada (DD-19) */
  readonly sponsorId?: string
}
/** El maillot con la oferta puesta; lanza si la zona no existe en ese maillot ('secondary' en un 'plain'). */
export declare function applySponsor(kit: Kit, offer: SponsorOffer): Kit
/** El color de KIT_COLORS (de KIT_BASES para la base) a menor ΔE00 en visión normal. */
export declare function nearestKitColor(hex: string, zone: 'base' | 'secondary'): KitColorName
```

**Un color**, de base o de segundo, de los quince: el de su marca va al más cercano y el maillot que resulta tiene que pasar `checkKit`, también `kit_ocupado`; si no pasa, la pantalla de E8 ofrece el más cercano que pasa. `chest` no cambia el `Kit`: el nombre viaja aparte. **Su nombre**, en el pecho, solo desde `KIT_SPONSOR_TEXT_MIN_PX` = 72 px (X-24, por cálculo; sin evidencia de los jueces): la letra mínima de 12 px vale también en SVG, y a 72 px una unidad mide 1,5 px, así que una letra de 8 u mide 12 px y cabe en una banda de 10 u; por debajo, el nombre va en `aria-label` y en `<title>`; en las demás zonas y en las vistas grandes manda la regla de §8.10. El pecho mide 20 u de ancho (x de 14 a 34, `TORSO`), 30 px a 72; con un avance de unos 0,65 em por mayúscula a 600 (estimado, sin medir con la letra del sistema) caben tres letras con 1 u de margen, así que cada patrocinador de la lista lleva, además de su nombre, una **marca de pecho de dos o tres mayúsculas**, que es la que se pinta y hace de «logotipo» (9-a). A 72 px o más, el pecho de y 23 a 33 se pinta de un solo color, el segundo en `band` y la base en las demás figuras, y la marca va encima, centrada en (24, 28) en `caption` 600, en blanco o en `ink` `#10202f` según cuál contraste más: las peores de los quince son `pink` con `ink` y `blue` con blanco, 4,79:1 (`contraste.py`; 9-b, 9-c). La lista es cerrada y generada (DD-19), sin texto libre que moderar. Nadie compra una figura, un color reservado, la estrella ni el cuerpo blanco, y en un maillot de campeón el pecho es de la estrella y de las letras (§8.10). La fila de `team_kits` lleva `set_by = 'sponsor'` y `sponsor_deal_id`, y al acabar el contrato una fila `system` devuelve el maillot anterior si sigue libre, o el libre más cercano de `ensureKits` si no. `Kit` gana la prop `chest?: { mark: string; name: string }` para que E8 la llene cuando exista. El reparto:

| Qué                  | Lo da E3                                                                    | Lo decide E8                                                                                |
| -------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| qué se puede comprar | `KitZone`: un color, o el pecho, la espalda, las mangas y el culote (§8.10) | qué zonas se venden y a quién                                                               |
| el color             | `nearestKitColor`, `applySponsor` y `checkKit`                              | el precio, y qué pasa si no pasa `checkKit`                                                 |
| el nombre            | la marca de pecho desde 72 px, su sitio y su color                          | la lista cerrada de patrocinadores (DD-19)                                                  |
| cuánto dura          | la fila `sponsor` de `team_kits` y la vuelta al anterior                    | el contrato, la exclusividad por categoría (`docs/epics.md` G2.8) y lo que pierde el equipo |

Un ejemplo: Noord Cycling lleva `hoops.navy.yellow` y firma con un patrocinador de rojo `#d0021b` en el segundo color; `nearestKitColor('#d0021b', 'secondary')` da `red`, `applySponsor` da `hoops.navy.red`, y si `checkKit` dice `kit_ocupado` o `kit_se_confunde`, E8 ofrece el siguiente más cercano que pase.

### 9.10 `WornJerseyIcon`

Sigue en `apps/web/src/components/broadcast/WornJerseyIcon.tsx` y sigue siendo **el único sitio de la web que elige dibujo y texto por `WornJersey`** (D-31). Su firma pasa del `{ card, size }` de hoy (l. 12-18) a la del contrato de E2 (`docs/retransmision.md` l. 5210) más el tamaño y la superficie (X-25):

```ts
import type { KitCode, KitSize, WornJersey } from '@cyclingstar/shared'
import type { KitSurface } from '../ui/Kit'

/** El equipo del corredor ese día: su KitCode, o la semilla grabada si la etapa es anterior a la traducción (§8.6). */
export type WornTeam =
  | { readonly name: string; readonly kit: KitCode }
  | { readonly name: string; readonly legacySeed: string }
export interface WornJerseyIconProps {
  readonly worn: WornJersey
  readonly team: WornTeam | null
  readonly size: KitSize // 28 o más (D-00b)
  /** 'dark' en el ámbito oscuro: el filete pasa a rgba(255,255,255,0.6) */
  readonly surface?: KitSurface
}
```

Quién dibuja qué: `leader`, `LeaderJersey` con `JERSEY_LABEL`, `Race leader` (pantalla); `champion`, `ChampionJersey` con `championTitleText`, `Champion of Italy`; `team`, `Kit` con `Mistral Racing kit` (hoy `Team jersey` para todos, `Jersey.tsx` l. 25), o `LegacyJersey` con el mismo texto si llega `legacySeed`; sin equipo, el hueco de hoy, del ancho del tamaño y `aria-hidden` (l. 28-29). `wornTeamOf(card: RiderCard): WornTeam | null` traduce `RiderCard.team` (§8.5). En `RiderLabel` es el maillot que va tras el nombre (D-00c). **La superficie** (I-24): con `surface="dark"` el filete de los cuatro dibujos pasa a `rgba(255,255,255,0.6)`, 6,55:1 sobre la noche (identidad §6.1); sin él, el `navy` `#172a5b` sobre `navy-dark` `#0b2740` queda a 6,9 de ΔE00 en visión normal, 3,8 en tritanopía y 2,3 en grises (juez de uso, `oscuro.py`). `CueCard` se la pasa siempre, porque sus fondos son `bad`, `navy-dark` e `ink-2` (D-56, §14.5); la capa fija y lo que vaya en el ámbito oscuro, también. Los sitios de hoy, todos a 28 px (D-00b; cómo cabe cada línea de E2, §14):

| Sitio                                                                                                                                                    | Hoy                                         | Con E3                                                                         | `surface`            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------ | -------------------- |
| `GroupBar.tsx` l. 204 y 242                                                                                                                              | `WornJerseyIcon` de 14 (el defecto) y de 13 | un `Kit` por equipo con su cuenta, y `WornJerseyIcon` para líderes y campeones | la de su fondo (§14) |
| `TimeTrialBoard.tsx` l. 86; `CueCard.tsx` l. 61, 84 y 116                                                                                                | `WornJerseyIcon` de 13; de 14, 13 y 16      | `WornJerseyIcon`                                                               | `dark` en `CueCard`  |
| `CueCard.tsx` l. 122, el equipo del rótulo                                                                                                               | `Jersey` de 13 por la semilla               | `Kit` o `LegacyJersey`, por `wornTeamOf`                                       | `dark`               |
| `GroupBar.tsx` l. 113, `StageStory.tsx` l. 103, `RaceRadioPanel.tsx` l. 210, `ChronicleSentence.tsx` l. 25, `VoiceTicker.tsx` l. 78, `CueCard.tsx` l. 90 | `LeaderJersey` de 12 a 14                   | `LeaderJersey`                                                                 | `dark` en `CueCard`  |
| `StageCards.tsx` l. 110 y 292; `RiderJersey` en las tablas (§8.3)                                                                                        | `LeaderJersey` de 15                        | `LeaderJersey`, en filas de 44                                                 | `light`              |

`docs/retransmision.md` l. 5210 gana `size` y `surface` en el paso 24 (D-58).

---

**Injertos aplicados.** I-12 (§9.4: la banda de honor, con su dibujo y sus cifras, como la alternativa que el dueño descartó; D-00d), I-13 (§9.3: la tabla de variantes con los cuatro criterios, el espectro en la diagonal como alternativa C y la elegida medida a 28 px), I-14 (§9.9: el patrocinio con `set_by` y la vuelta al maillot anterior), I-24 (§9.10: `surface` y el filete claro; la geometría, §8.3).

**Objeciones resueltas.** O-14 (§9.2: la objeción era que el blanco con estrella se acerca a la marca; el dueño lo eligió, y su distancia, 12,7 y 9,2 en grises a 28 px, queda escrita como su coste), O-15 (§9.3: la C de telefono, descartada por su medida y no por el SPEC), O-24 (§9.9: el nombre de una lista cerrada y solo desde 72 px).

**Huecos rellenados.** H-09 (§9.6: por qué el nacional no cae en el defecto de la 7-h, con su medida a 28 px, y lo que mide `champion.test.ts`). Contradicciones de hecho escritas: X-13 (§9.8), X-14 (§9.8), X-16 (§9.2: mandan las distancias del juez para lo medido a 13 px; lo elegido se mide aquí a 28), X-17 (§9.1), X-24 (§9.9: 72 px por cálculo) y X-25 (§9.10).

**Decisiones de esta sección.**

- 9-a. El pecho de 20 u solo admite tres letras de 12 px a 72 px (cálculo de §9.9), así que lo que se pinta es una marca de pecho de dos o tres mayúsculas que trae cada patrocinador de la lista cerrada, y el nombre entero va en el `aria-label`. Descartado: el nombre entero, que a 72 px no cabe, y bajar la letra de 12 px.
- 9-b. A 72 px o más el pecho de y 23 a 33 se pinta de un solo color bajo la marca, porque en `hoops`, `halves`, `sides` y `sash` cruza dos colores y la marca no tendría un contraste fijo. Descartado: vender el pecho solo en `plain` y `band`.
- 9-c. La marca de pecho va en blanco o en `ink`, y la peor de los quince queda a 4,79:1. Descartado: `navy-dark`, con el que `pink` baja a 4,41:1.
- 9-d. `WornJerseyIconProps.team` es una unión con `legacySeed` para lo grabado antes de la traducción, que §G.5 no recoge (la duda 1).
- 9-e. La estrella del mundial mide 18 u y va en (24, 28,5), en el pecho de 20 u con 1 u de margen; la del nacional, de 10 u, en el sitio de §9.5, para dejar ver la bandera. El degradado va en diagonal, de arriba a la izquierda a abajo a la derecha. Descartado: el degradado vertical, cuyos colores se apilarían en franjas horizontales como las de la marca.
- 9-f. La caja de la bandera es el alto del torso a 4:3, la proporción de la celda del sprite, centrada: la bandera se ve entera de alto y recortada de lados. Descartado: estirar la bandera a la caja del torso, que le cambiaría la proporción.
- 9-g. El componente se llama `ChampionJersey` y no `ChampionSash`: ya no lleva banda y `sash` es ahora una figura de equipo (§8.1). Ver la duda 2.
- 9-h. `champion.test.ts` va en `packages/db`, junto al rasterizador (§8.4), y no en `packages/shared`. Ver la duda 4.
- 9-i. La estrella del nacional va por defecto arriba, bajo el cuello y en el eje, y deja a la vista el emblema central de la bandera; el orden de los sitios sigue con el del escudo (a la derecha de quien mira), el otro lado y el centro. Descartado: el centro del pecho por defecto, que es campo en 47 banderas frente a 66, y el sitio del escudo, que lo es en 77 pero saca la estrella del eje.
- 9-j. El campo pide como mucho un 12 % de otro color bajo la huella y el mismo dominante que el disco de 9 u alrededor (con este orden de sitios, el disco no cambia el sitio de ninguna de las 133, pero guarda el centro, donde Vietnam, Canadá o Burkina Faso tienen la huella entera dentro de su emblema), y el oro pasa a navy-dark cuando queda a menos de 20 del campo en visión normal. Descartado: decidir cada país a ojo, sin regla, que ningún test podría comprobar.
- 9-k. Las letras van en el pecho bajo, fijas, y no junto a la estrella, que cambia de sitio; en blanco o en navy-dark con el filo del otro color. Descartado: el oro de la estrella, que se pierde en las banderas amarillas.
- 9-l. Desde 72 px el nacional pinta el SVG de su bandera, cargado a la carta, y por debajo la celda del sprite. Descartado: un sprite al doble, que pesaría unas cuatro veces los 47 KB de D-49 y seguiría siendo un mapa de bits.

---

## 10. El examen práctico (I): el cuadro de entrenamiento

El cuadro (`/me/training`: `apps/web/src/pages/Training.tsx`, 334 l., que monta `PlanLadder.tsx`, 263 l.) es el examen obligatorio de E3: una pantalla con el motor bien y que no se entiende. Esta sección la redibuja a 360 px con los componentes del catálogo (§4) y nada más (D-40), y cierra lo que se ve de sus tres defectos: la lista de llegadas (D-34), la escala (D-42) y los dos vocabularios con su precedencia (D-40), con la carga en palabras (D-41). Lo que la pantalla necesita debajo (la vista previa nueva, `resolveTrainingDay`, el plan vivo y el viaje) es §11. Las líneas de código son las de `58c14da`. Hoy, a 360 px, lo que hace el plan empieza a 1.060 px y `Save day edits` (pantalla) cierra una página de 6.807 (mapa 05 §3; captura 01). El dueño lo contó así ([DUEÑO 12]; `docs/agenda.md` l. 1560-1563): arriba y abajo pueden decir cosas distintas sin que se sepa cuál manda, los dos vocabularios no coinciden y no se entiende `Day 182 · You'll arrive: Rusty` (pantalla).

### 10.1 Lo que contesta, en el orden en que se lee

Cuatro preguntas, en este orden (lectura §7.1), y la pantalla las contesta de arriba abajo:

1. **¿Cómo llego a mis próximas carreras?** Es la respuesta (`data-answer`): el `Panel` `How you'll arrive` (pantalla), una tarjeta por carrera con su escala.
2. **¿Qué hago cada día, y quién lo ha decidido?** El `Panel` `Your month`: el modo, la regla de la precedencia en una línea y las semanas del plan con sus días.
3. **¿Cómo lo cambio y qué cambia?** Los bloques de cada semana y, abajo, la `ActionBar` con su consecuencia (`Race Var: Fine (was Loaded)`).
4. **¿Y un día concreto?** `Edit day by day`, plegado, porque el dueño pidió «en el entrenamiento, que permita ver y editar los próximos 28 días, no solo 1 semana» ([DUEÑO 11]; lo cita `Training.tsx` l. 30-31, y `docs/balance.md` l. 11134, v59, lo llama «dictado del dueño»).

Lo permanente (el modo y hasta cuándo dura el plan) va en la línea de estado del `PageHeader` (I-32): `Mixed · your plan runs Day 51 to Day 78` (pantalla); sin plan vivo, `Mixed · no plan: your coach decides`; en `entrenador`, `Coach decides · your coach picks every day`.

### 10.2 La pantalla a 360 px, dibujada en texto

El jugador del mapa 05 el día 50 (José Quintáns, en `Mixed`, con el plan `Build`, `Specific`, `Taper`, `Recovery` guardado ese día y convocado a Race Var, día 52 en Francia, y a Race Sardegna, días 56 a 60 en Italia, con viaje los días 51, 53, 55 y 61; `capturas/README.md`), con el día a día plegado y un bloque cambiado sin guardar:

```text
 ★ Cycling Star               Day 50 · S1 · 4h 56m  (◉)    AppHeader 48
 Profile  [Training]  Race orders  My races                 Tabs page 44
 Training                                                   PageHeader, h1 en page
 Mixed · your plan runs Day 51 to Day 78                    línea de estado, meta ink-2
┌ How you'll arrive ─────────────────────────────────────┐  Panel, data-answer
│ Race Var · .1 · one day                                │  row 600, enlace en bloque de 44
│ Day 52 · in 2 days · travel Day 51 and Day 53          │  meta ink-2
│ [Cooked][■Loaded■][ Fine ][Spot on][ Rusty ]           │  Scale5, tramos de 36
│ ◀ Too tired                              Too fresh ▶   │  caption ink-3
│ You'll start tired. A lighter week before it brings    │  meta ink-2: la instrucción
│ you to Fine or Spot on.                                │
│ Race Sardegna · .1 · 5 stages                          │
│ Days 56 to 60 · in 6 days · travel Day 55 and Day 61   │
│ [Cooked][ Loaded ][■ Fine ■][Spot on][ Rusty ]         │
│ Ready to race, not at your best. A Taper week before   │
│ it can make it Spot on.                                │
│ Show all 5 races                                    ▾  │  Disclosure, 44
│ Only the start is forecast: later stages depend on     │  caption ink-3
│ how you race them.                                     │
├ Your month ────────────────────────────────────────────┤  Panel
│ ( Coach decides )( ■ Mixed ■ )( I decide )             │  Segmented, 44
│ On a day, what wins: race › travel › your edit ›       │  meta ink-2  (ⓘ InfoButton)
│ block › team plan › coach.                        ⓘ    │
│ Week 1 · Days 51 to 57                  [ Build    ▾ ] │  row 600; Field select de 48
│  51    52    53    54    55    56    57                │  caption ink-3
│ ✈Out  Race  ✈Back ▮▮▯▯  ✈Out  Race  Race               │  la tira: 7 celdas de 41
│ 1 training day                                         │  meta ink-2
│ Week 2 · Days 58 to 64                  [ Specific ▾ ] │
│ Race  Race  Race  ✈Back ▮▮▮▯ ▮▮▯▯ ▮▮▮▯                 │
│ 3 training days                                        │
│ Week 3 · Days 65 to 71 ·· Week 4 · Days 72 to 78       │  (igual)
│ Emphasis [ My strength ▾ ]   Intensity [ Normal ▾ ]    │  Field, 48
│ Load this month: steady  ▮▮▯▯                          │  Meter
│ Start a new plan tomorrow                              │  Button quiet, 44
├ Edit day by day ──────────────────── Show the 28 days ▾┤  Disclosure, plegado
└────────────────────────────────────────────────────────┘
═ Race Sardegna: Fine (was Loaded)          [ Save plan ] ═  ActionBar 60, data-primary-action
 Dashboard   My Rider   My Team   World   News              BottomNav 56
```

**Dónde cae cada cosa** (estimado con los tokens de §3 y las alturas de §4): `AppHeader` y `Tabs` ocupan hasta 92 px, el `PageHeader` con su línea de estado hasta unos 176, y el `Panel` de la respuesta empieza hacia los 188, dentro de los 520 de `ANSWER_MAX_TOP_PX`; la primera tarjeta cabe entera antes de los 400 y la segunda asoma en la primera pantalla. La `ActionBar` va fija de 684 a 744, sobre la `BottomNav`, con su botón en el 40 % de abajo (`THUMB_ZONE`). Plegada, la página mide unos 1.700 px, por debajo de los 3.200 de `TOOL_PAGE_MAX_PX`. **Medido** en el prototipo de telefono, que es esta pantalla sin la línea de estado (`proto/entrenamiento.html`, reproducido por el juez de uso, C1; X-18): la respuesta a 152 px con 297 a la vista, la acción a 687 de 800, 1.277 px de alto y ninguna falta de la prueba, salvo cuatro enlaces de nombre de 20 px de alto, que aquí no se repiten porque el nombre de cada carrera enlaza en un bloque de 44 px (D-16). **Las nueve comprobaciones** (§7.1): no hay ancho fijo de texto (1); nada se corta, los nombres de carrera y la cabecera de `TripRow` parten de línea (2); la letra más pequeña es `caption`, 12 px, en los ejes y la tira (3); los `select` van en `body`, 16 px (4); el `Segmented`, los `Field`, los `Disclosure`, `↺ Back to Build` y los enlaces miden 44 o 48 de alto (5); los contrastes son los de los tokens y la escala es `role="img"` con su texto (6); y la 7, la 8 y la 9, arriba.

**El día a día, abierto** (`Show the 28 days`, pantalla), con una orden puesta el día 62:

```text
├ Edit day by day ─────────────────── Hide the 28 days ▴┤  Disclosure abierto
│ On a day, what wins: race › travel › your edit ›      │  la misma línea de la regla
│ block › team plan › coach.                       ⓘ    │
│ Week 1 · Days 51 to 57 · Build                        │  row 600
│▌Trip to Race Var (FR) · Days 51 to 53 ·               │  TripRow: borde accent, icono travel
│▌3 days off training                                   │
│▌  Day 51 Out · Day 52 Race · Day 53 Back              │  meta ink-2
│▌Day 54            [Build · week 1]   ▮▮▯▯ Load: steady│  borde line-strong; Chip neutral; Meter
│▌  [ Endurance ride     ▾ ] [ Normal ▾ ]               │  dos Field de 48, en body
│▌Trip to Race Sardegna (IT) · Days 55 to 61 ·          │  TripRow: ida, etapas, descanso, vuelta
│▌7 days off training                                   │
│▌  Day 55 Out · Days 56 to 60 Race · Day 61 Back       │
│ Week 2 · Days 58 to 64 · Specific                     │
│▌Day 62            [Your edit]        ▯▯▯▯ Load: rest  │  borde own; Chip accent
│▌  [ Full rest          ▾ ] [ Normal ▾ ]               │
│▌  ↺ Back to Specific                                  │  Button quiet, 44
│▌Day 63            [Specific · week 2] ▮▮▮▯ Load: hard │
│ …                                                     │
│ [ Adopt team plan ]                                   │  Button secondary, solo en Mixed
└───────────────────────────────────────────────────────┘
```

Un viaje que cae entre dos semanas sale en la primera; los días de descanso de una vuelta (en Race France, el 194 y el 201) van dentro de su `TripRow` y se pueden editar (mapa 02 §6, punto 6). Cada fila de día sigue la regla de la fila de dos renglones (§2.4): arriba el día, su `Chip` y su carga; abajo los dos `Field`.

### 10.3 Defecto 1: la lista de llegadas

Hoy la lista no dice de qué carrera habla (`raceId: null` siempre, `apps/api/src/routes/riders.ts` l. 477) y pinta una fila por etapa: `Day 56`, `Day 57`, `Day 58`… con su chapa (`PlanLadder.tsx` l. 240-255; captura 01: seis filas para dos carreras). Con E3, **una tarjeta por carrera** (D-34), con la llegada a la salida de su primera etapa en el horizonte, la única de fiar (mapa 02 §3), sobre `races[]` de la vista previa (§11.2). La tarjeta, sin componente propio, es una composición de `Panel`, `TextLink` y `Scale5`:

| Renglón              | Contenido y fuente                                                                                                                                                                                                                   | Token           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| 1, el nombre         | `name` con su clase (`raceClass`) y `one day` o `5 stages` (`stageCount`); enlace a `/world/races/:raceId` (`App.tsx` l. 243) en un bloque de 44 px                                                                                  | `row` 600 `ink` |
| 2, cuándo y el viaje | `Day 52` o `Days 56 to 60` (`startDay`, `endDay`, en día de la temporada, como `PlanLadder.tsx` l. 246); `in N days` solo a siete o menos (D-43); `travel Day 51 and Day 53` con `travelOut` y `travelBack`, o nada si corre en casa | `meta` `ink-2`  |
| 3, la escala         | `Scale5` con `arrival`, y sus ejes (§10.4)                                                                                                                                                                                           | §4.8            |
| 4, qué hacer         | la instrucción fija del tramo (§10.4)                                                                                                                                                                                                | `meta` `ink-2`  |

Sus estados (pantalla): **en curso**, `ongoing: true` y `arrival: null`: el renglón 2 dice `Racing now · stage 3 of 5`, la etapa que toca, contada con los días de carrera de `days[]`, y no hay escala; **sin dato**, `arrival: null` sin `ongoing`: la escala sin ningún tramo encendido y `Not enough data yet`; **más de tres carreras**: tres a la vista y el resto tras `Show all 5 races` / `Show fewer` (`Disclosure`); **ninguna**: `EmptyState` `No races in the next four weeks. This month is for building.`; **cargando**: `Skeleton` de tres tarjetas de su alto final; **error**: `ErrorState` `Couldn't load your training plan · Try again`; **sin red**: `OfflineState` (§4.2, §12.4). Debajo del `Panel`, siempre, `Only the start is forecast: later stages depend on how you race them.` (pantalla): la llegada a la tercera etapa depende de cómo se corran las dos primeras, que nadie sabe, y por eso no se pinta.

### 10.4 Defecto 2: la escala

Hoy son cinco chapas sueltas de cinco tonos, una por fila, sin orden ni leyenda (`ARRIVAL_LABEL`, `PlanLadder.tsx` l. 63-69), y `Rusty` se lee como «cansado». **`Scale5`** (§4.8; D-42) pone los cinco tramos en el orden de `ARRIVAL_ORDER`, por TSB de cansado a fresco, con los dos malos en los extremos y el bueno en medio: cinco tramos iguales de 36 px de alto en el ancho del panel (312 px menos cuatro huecos de 4: 59 px cada uno), los inactivos en `surface-2` con borde `line-strong` y `caption` `ink-2`, el activo relleno de su `arrival-*` con `caption` 700 en blanco, y los ejes `◀ Too tired` y `Too fresh ▶` (pantalla) debajo, en `caption` `ink-3`. Marca el tramo, no un punto dentro de él: un punto pediría el TSB, que no cruza la frontera (mapa 04, tensión 23; §13). Es `role="img"` con `aria-label` `You'll arrive Loaded: second of five, from too tired to too fresh` (pantalla). Los cortes y las palabras son los de hoy (`arrivalLabel`, `packages/engine/src/training/projection.ts` l. 75-81) y no se tocan (DD-10). Debajo, **una instrucción fija por tramo** (O-32: la del prototipo, que nombraba la semana, `Make week 1 lighter to arrive Fine.`, pediría una regla y un campo que nadie ha diseñado):

| Código     | Tramo (pantalla) | Puesto | TSB al amanecer | El activo                          | Instrucción (pantalla)                                                         |
| ---------- | ---------------- | ------ | --------------- | ---------------------------------- | ------------------------------------------------------------------------------ |
| `fundido`  | `Cooked`         | 1 de 5 | menos de −30    | `arrival-cooked` `#b42318`, 6,57:1 | `You'll start exhausted. Make the week before it a Taper or a Recovery week.`  |
| `cargado`  | `Loaded`         | 2      | de −30 a −10    | `arrival-loaded` `#b45309`, 5,02   | `You'll start tired. A lighter week before it brings you to Fine or Spot on.`  |
| `bien`     | `Fine`           | 3      | de −10 a +5     | `arrival-fine` `#566579`, 5,94     | `Ready to race, not at your best. A Taper week before it can make it Spot on.` |
| `perfecto` | `Spot on`        | 4      | de +5 a +25     | `arrival-spoton` `#167a3a`, 5,41   | `This is the best way to arrive. Keep the plan.`                               |
| `oxidado`  | `Rusty`          | 5      | más de +25      | `arrival-rusty` `#1d5fa8`, 6,45    | `You'll arrive under-trained. Put a Build week two or three weeks before it.`  |

Los contrastes, del texto blanco sobre el activo, son los de telefono §3.1, reproducidos por el juez de uso (C5; X-20). `Cooked` y `Loaded` quedan a 6,3 de ΔE00 en deuteranopía, así que la escala se lee por el puesto y por la palabra, no por el color; el tramo activo queda a 38 o más del inactivo en toda visión (X-20).

### 10.5 Defecto 3: los dos vocabularios y la precedencia

Hoy, arriba, el jugador elige bloques (`Build`, `PlanLadder.tsx` l. 33-39) y, abajo, ve sesiones que salen de `defaultCoachPlan` (`apps/web/src/domain/trainingPlan.ts` l. 37), un ciclo fijo que coincide con lo que entrena el bloque en 88 de 350 casos (mapa 02 §1); la precedencia solo la dice `MODE_WHY` (l. 56-61, pintado en l. 145), que además calla la mitad de la cadena (mapa 02 §2). Con E3 los días salen de `resolveTrainingDay` (§11.4) y la pantalla enseña la regla y el origen de cada día donde se decide (D-40):

**La regla, en una línea**, bajo el `Segmented` y otra vez en la cabecera del día a día, según el modo (pantalla): `Mixed`: `On a day, what wins: race › travel › your edit › block › team plan › coach.`; `I decide`: `On a day, what wins: race › travel › your edit › block. Days you leave empty are rest.`; `Coach decides`: `On a day, what wins: race › travel › coach. Your blocks and edits are not used.` Al lado, un `InfoButton` con la explicación corta (§10.10).

**El origen de cada día**: un borde izquierdo de 4 px y un `Chip` con tono, icono y texto (D-13), en cada fila del día a día:

| `source`     | `Chip` (pantalla)                        | Tono      | Borde         | Cuándo                                                            |
| ------------ | ---------------------------------------- | --------- | ------------- | ----------------------------------------------------------------- |
| `carrera`    | `Race` y `Race Sardegna · stage 2 of 5`  | `warn`    | `warn`        | el corredor corre ese día; no se entrena (`train.ts` l. 73 y 197) |
| `viaje`      | `Travel`, dentro de su `TripRow` (§11.6) | `info`    | `accent`      | ida o vuelta; sesión `Travel`, 15 TSS (l. 200-203)                |
| `orden`      | `Your edit`, con `↺ Back to Build`       | `accent`  | `own`         | hay una orden, guardada o sin guardar                             |
| `bloque`     | `Build · week 1` (el bloque y su semana) | `neutral` | `line-strong` | la semana del plan vivo tiene bloque                              |
| `equipo`     | `Team plan`                              | `neutral` | `ink-3`       | solo en `Mixed`, sin orden ni bloque                              |
| `entrenador` | `Coach decides on the day`               | `neutral` | `line`        | lo demás en `Mixed`, y todo en `Coach decides`                    |
| `descanso`   | `Rest (I decide)`                        | `neutral` | `line`        | solo en `I decide`, sin orden ni bloque (l. 266-271)              |

**`↺ Back to Build`** (I-27): un `Button` `quiet` de 44 px en la fila de un día `Your edit`, que quita la orden y devuelve el día a lo que tendría sin ella; el texto nombra a dónde vuelve: `↺ Back to Build` (el bloque de su semana), `↺ Back to team plan`, `↺ Back to coach` o, en `I decide`, `↺ Back to rest` (pantalla; 10-a). Quitar una orden es un cambio sin guardar, como ponerla.

### 10.6 Las semanas con sus días y la tira de siete días

**Las semanas son las del plan vivo, con sus días** (D-35, I-08, O-10): `Week 1 · Days 51 to 57` (pantalla), contadas desde `plan.startDay`, que ya viaja y nadie pintaba (mapa 02 §8). Hoy las cuatro semanas no tienen fechas (`PlanLadder.tsx` l. 149-171) y la vista previa las proyecta desde mañana (`riders.ts` l. 453) mientras el tick las cuenta desde el `startDay` guardado (`packages/db/src/train.ts` l. 216): desde el día siguiente al guardado, escalera y proyección hablan de días distintos (X-05). Con la vista previa indexada por el plan vivo y `PUT /plan` que conserva su `startDay` (§11.2, §11.5), las semanas pintadas son las que entrena el tick. Cada semana: su título en `row` 600, el `select` de su bloque (`Field` de 48, con `Leave it to the coach` como opción vacía, `PlanLadder.tsx` l. 160, y el porqué del bloque debajo en `meta`, `BLOCK_WHY`, l. 42-48), la tira y su resumen. Sin plan vivo, la semana 1 empieza mañana. Si el horizonte de 28 días pasa del final del plan, una línea más: `After your plan · Days 74 to 78 · Coach` (pantalla; `· Rest` en `I decide`). `Start a new plan tomorrow` (pantalla, `Button` `quiet`) vuelve a contar las semanas desde mañana sin guardar, y la consecuencia lo dice: `New plan from Day 51` (pantalla).

**La tira de siete días** (I-28), bajo cada semana y sin abrir nada: siete celdas de 41 px de ancho (312 px menos seis huecos de 4), cada una con su día en `caption` `ink-3` y debajo **una palabra o un `Meter`**: `Race` en `caption` 600 `warn` sobre `warn-bg`; el icono `travel` de 16 px con `Out` o `Back` en `caption` sobre `info-bg`; y un día de entrenamiento, el `Meter` de cuatro segmentos de 8 px de alto (§4.8) con su carga (§10.7), sin palabra. No se pulsa: es una `<ol aria-label="Week 1, days 51 to 57">` cuyos `<li>` dicen su día en texto para el lector de pantalla (`Day 54: steady training`). Debajo, el resumen en `meta` `ink-2` (pantalla): `1 training day`, `3 training days`, `7 training days` o `No training: racing and travel`, contando los días de entrenamiento con carga. La celda `53 ✈ back` del prototipo de lectura se salía a 360 (uso C3); con una palabra por celda, `Back` mide unos 27 px de los 41 (estimado).

### 10.7 La carga en palabras y el TSS fuera

Hoy el cuadro enseña `1300 TSS over four weeks.` (`PlanLadder.tsx` l. 233; captura 01) y `105 TSS` por día (`Training.tsx` l. 279-281): una cifra sin escala, que el dueño ya descartó en otra parte («eso no aporta, ni se entiende», de la casilla `Matches / 1` de la ficha, [DUEÑO 8]; `RiderProfile.tsx` l. 147, sin versión, según el mapa 04). Con E3 la carga se dice en cinco palabras (D-41, DD-11), `Rest`, `Easy`, `Steady`, `Hard` y `Very hard` (pantalla), con `loadLevelOf(tss)` (`packages/shared/src/training.ts`) y `LOAD_STEPS_TSS` = 0, 25, 80 y 110: `Rest` con 0, `Easy` hasta 25, `Steady` hasta 80, `Hard` hasta 110 y `Very hard` por encima. Se pinta con el `Meter` (de 0 a 4 segmentos llenos) y la palabra detrás de `Load:` (`▮▮▮▯ Load: hard`, pantalla), porque el selector de intensidad ya usa `Easy` y `Hard` para otra cosa (`INTENSITY_LABELS`, `shared/training.ts` l. 11-15; 10-b). Qué sesión del catálogo cae en qué palabra (TSS de `SESSION_CATALOG`, l. 54-153), por intensidad:

| Sesión (pantalla)                          | `Easy` (suave)                                                   | `Normal`         | `Hard` (fuerte)  |
| ------------------------------------------ | ---------------------------------------------------------------- | ---------------- | ---------------- |
| `Full rest`                                | 0, `Rest`                                                        | 0, `Rest`        | 0, `Rest`        |
| `Video & tactics`; `Active rest`           | 10 y 25, `Easy`                                                  | 10 y 25, `Easy`  | 10 y 25, `Easy`  |
| `Gym`                                      | 50, `Steady`                                                     | 50, `Steady`     | 50, `Steady`     |
| `Descending & cobbles`                     | 55, `Steady`                                                     | 70, `Steady`     | 85, `Hard`       |
| `Sprint intervals`                         | 60, `Steady`                                                     | 75, `Steady`     | 90, `Hard`       |
| `Time-trial work`                          | 60, `Steady`                                                     | 80, `Steady`     | 100, `Hard`      |
| `Endurance ride`                           | 70, `Steady`                                                     | 90, `Hard`       | 110, `Hard`      |
| `Punchy climbs`                            | 75, `Steady`                                                     | 95, `Hard`       | 115, `Very hard` |
| `Threshold`                                | 85, `Hard`                                                       | 105, `Hard`      | 125, `Very hard` |
| `Climbing`                                 | 90, `Hard`                                                       | 115, `Very hard` | 140, `Very hard` |
| `Travel` (no se elige) y un día de carrera | 15, `Easy`; la carga estimada de §11.3, casi siempre `Very hard` |                  |                  |

**La carga del mes**, `Load this month: steady` (pantalla) con su `Meter`, es la palabra del redondeo de la media de `load` de los 28 días de `days[]`, días de carrera incluidos (10-c). La vista previa manda `load` de 0 a 4 y nunca TSS; el TSS deja la pantalla y la API (§13.5).

### 10.8 Los modos

**`Coach decides`** (`entrenador`): las semanas siguen a la vista con su tira (lo que hará el entrenador, de `days[]`), pero sin los `select` de bloque, que no se usan (`train.ts` l. 205 y 214; hoy se esconden, `PlanLadder.tsx` l. 147); el día a día es de solo lectura, con el `Notice` `note` `Coach mode: nothing you set here is used. Switch to Mixed to edit.` (pantalla) y un `Button` `secondary` `Switch to Mixed` que cambia el `Segmented` sin guardar. Hoy ese panel se edita y se guarda para nada (`Training.tsx` l. 317-325; mapa 02 §2). **`Mixed`** (`mixto`): todo editable; el plan de equipo cuenta, y `Adopt team plan` (`Training.tsx` l. 145-174) sigue copiando sus sugerencias como órdenes sin guardar. **`I decide`** (`manual`): los huecos sin orden ni bloque dicen `Rest (I decide)` y el plan de equipo no cuenta. Cambiar de modo es un cambio sin guardar: `Mode: Mixed (was Coach decides)` (pantalla) en la consecuencia, y la vista previa se rehace con el modo de la pantalla (§11.2). En `Coach decides`, lo que cambia en la pantalla de §10.2:

```text
 Coach decides · your coach picks every day                 línea de estado
├ Your month ────────────────────────────────────────────┤
│ ( ■ Coach decides ■ )( Mixed )( I decide )             │
│ On a day, what wins: race › travel › coach. Your       │
│ blocks and edits are not used.                     ⓘ   │
│ Week 1 · Days 51 to 57                                 │  sin select de bloque
│ ✈Out  Race  ✈Back ▮▮▯▯  ✈Out  Race  Race               │  lo que hará el entrenador
├ Edit day by day ──────────────────── Show the 28 days ▾┤
│ ▍Coach mode: nothing you set here is used. Switch to   │  Notice note, borde de 4 px
│ ▍Mixed to edit.                    [ Switch to Mixed ] │  Button secondary
```

### 10.9 Un solo guardado

Hoy hay dos botones y dos guardados: `Save plan` en el panel de arriba (`PlanLadder.tsx` l. 174-218) y `Save day edits` al final de la página (`Training.tsx` l. 317-331), con la única pista de la precedencia en una línea gris debajo (l. 327-330). Con E3, **una `ActionBar`** (§4.3) para los bloques, el modo y los días (lectura, decisión 7): aparece con el primer cambio y dice su consecuencia (pantalla): la primera carrera cuya llegada cambia, `Race Sardegna: Fine (was Loaded)`; con más cambios, `2 changes · Race Sardegna: Fine (was Loaded)`; si ninguna llegada cambia, `2 changes · arrivals stay the same`; y si solo cambió el modo, `Mode: Mixed (was Coach decides)`. La consecuencia compara la vista previa con las ediciones con la del estado guardado. **`Save plan`** llama a `PUT /api/riders/me/plan` (modo, plan y `startFresh`) y después a `PUT /api/riders/me/orders` (la ventana de órdenes tal como está en pantalla) y da **un solo resultado**: `Saving…`, `Saved` dos segundos, o `Could not save. Try again.` con `Retry`, que repite los dos, porque los dos son idempotentes (el plan se escribe sobre su `startDay` y las órdenes sustituyen su ventana, `riders.ts` l. 362-376). Sin red, `You're offline. Your changes stay here until you reconnect.` y el botón deshabilitado; los cambios esperan en memoria (§12.4).

### 10.10 Lo que es de E6

El punto de la precedencia se solapa con E6 y está repartido: «de E3 sale la solución visual y de E6 dónde vive la explicación» (`docs/agenda.md` l. 1661). E3 pone la regla en una línea donde se decide (§10.5), el origen en cada día y, hasta que E6 decida dónde vive la explicación larga, un `InfoButton` junto a la línea con esta (pantalla): `Race and travel days can't be trained. In Mixed, a day you edit beats your block; a week you leave to the coach follows your team plan, if your team has one, and then your coach. In I decide, days you leave empty are rest. In Coach decides, your coach picks every day.` Si E6 la lleva a otra pantalla, el `InfoButton` pasa a ser un `TextLink` a ella y la línea se queda. Dónde vive el cuadro en la navegación, y si el día a día merece pantalla propia, también es de E6.

### 10.11 Qué sustituye a qué

Las piezas de hoy (mapa 02 §1), con lo que las sustituye y su dato; los textos entre comillas invertidas son de pantalla:

| Hoy                                                                                           | Con E3                                                              | De dónde sale                                 |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| los tres botones de modo y `MODE_WHY` (`PlanLadder.tsx` l. 125-145)                           | `Segmented` y la línea de la regla, con su `InfoButton`             | `GET /api/riders/me/plan`, `mode`             |
| `Week 1` a `Week 4` sin fechas (l. 149-171)                                                   | `Week 1 · Days 51 to 57`, el `select` del bloque y la tira          | `plan.startDay` y `days[]` de la vista previa |
| `What this does to you` y `1300 TSS over four weeks.` (l. 227-234)                            | `Load this month: steady` con su `Meter`                            | `days[].load`                                 |
| las llegadas, una fila por etapa con su chapa (l. 235-257)                                    | una tarjeta por carrera con `Scale5` y su instrucción               | `races[]`                                     |
| `Save plan` (l. 174-218) y `Save day edits` (`Training.tsx` l. 317-331)                       | una `ActionBar` con su consecuencia                                 | `PUT /plan` y `PUT /orders`, en ese orden     |
| `Edit day by day` con `defaultCoachPlan` (`Training.tsx` l. 181-313; `trainingPlan.ts` l. 37) | los días de `resolveTrainingDay`, cada uno con su `Chip` y su borde | `days[]` (vista previa y `GET /orders`)       |
| la fila ámbar `Race day` sin carrera (l. 201-213)                                             | la fila `Race` con la carrera y la etapa                            | `days[].raceKey` y `races[]`                  |
| la fila azul `✈️ Travel day` (l. 215-234)                                                     | `TripRow` (§11.6)                                                   | `travelDays[]`                                |
| el TSS del día en número (l. 279-281)                                                         | `Meter` y `Load: steady`                                            | `days[].load`                                 |
| `Adopt team plan` (l. 145-174)                                                                | el mismo, como `Button` `secondary`, solo en `Mixed`                | `GET /api/me/team-training`                   |

Las marcas para los tests (§16): `data-answer` en el `Panel` `How you'll arrive`, `data-primary-action` en `Save plan`, `data-ui="Scale5"` con `data-state` `active` en el tramo encendido, y cada fila de día con `data-source` igual a su `source`.

---

**Injertos aplicados.** I-08 (§10.6: las semanas con sus días, desde el `startDay` del plan vivo; el contrato, §11.2), I-27 (§10.5: `↺ Back to Build`, con lo que nombra en cada modo), I-28 (§10.6: la tira de siete días, una palabra o un `Meter` por celda, no pulsable, con su resumen), I-32 (§10.1: la línea de estado del `PageHeader` en sus tres casos).

**Objeciones resueltas.** O-10 (§10.6: lo que se ve; el arreglo de la API, §11.2), O-32 (§10.4: una instrucción fija por tramo).

**Huecos rellenados.** Ninguno asignado. Contradicciones de hecho escritas: X-18 (§10.2: los prototipos, y los enlaces de 20 px que no se repiten) y X-20 (§10.4: los contrastes de la escala).

**Decisiones de esta sección.**

- 10-a. `↺ Back to …` nombra a dónde vuelve el día (el bloque, el plan de equipo, el entrenador o el descanso), porque en una semana sin bloque «Back to Build» mentiría. Descartado: un `Undo` sin destino.
- 10-b. La carga se escribe detrás de `Load:` porque `Easy` y `Hard` son también dos intensidades del selector (`INTENSITY_LABELS`). Ver la duda 1.
- 10-c. La carga del mes es el redondeo de la media de los niveles de `days[]`, en la web, para no añadir un campo a la vista previa (D-34). Descartado: un `monthLoad` de la API.
- 10-d. El resumen de la tira cuenta los días de entrenamiento con carga: un `Full rest` no es un día de entrenamiento.
- 10-e. La línea de estado sin plan vivo dice `Mixed · no plan: your coach decides`, y en `entrenador`, `Coach decides · your coach picks every day`.
- 10-f. Se añade §10.11, la tabla de qué sustituye a qué, para que quien implemente sepa qué líneas de hoy desaparecen; y cada fila de día lleva `data-source`, que §G.4 no tenía.

---

## 11. El examen práctico (II): lo que hay debajo, lo que se deja y el viaje

El encargo dice que los cinco defectos son de presentación y que ninguno se arregla con más motor (`docs/encargos.md` l. 270-271). Lo segundo es cierto y lo primero a medias: el motor está bien, pero la vista previa proyecta otra cosa que el tick y el plan que se pinta puede no ser el que se entrena (mapa 02, resumen; `01-fase-propuestas.md`, cambio 1). Esta sección arregla eso en `apps/api`, `packages/db` y `packages/shared`, sin cambiar la conducta del motor ni subir `ENGINE_VERSION` (91, `packages/engine/src/constants.ts` l. 853), y pone el viaje donde se decide. Lo que se ve es §10. Las líneas son las de `58c14da`.

### 11.1 Lo que E3 arregla debajo, y lo que deja

**Arregla** (D-33): una llegada por carrera y no por etapa, con su carrera (§11.2; hoy `raceId: null`, `apps/api/src/routes/riders.ts` l. 477); una vista previa que proyecta el plan vivo con el modo, las órdenes, el plan de equipo, la carga de carrera, el viaje y el primer día (§11.2 y §11.3; hoy ninguna de las siete, `riders.ts` l. 424-481); una sola función de precedencia para el tick y la pantalla (§11.4; hoy la cadena vive en `packages/db/src/train.ts` l. 195-272 y la web inventa los días con `defaultCoachPlan`, `apps/web/src/domain/trainingPlan.ts` l. 37); un solo plan vivo (§11.5; hoy dos filas solapadas, y la pantalla lee una y el tick entrena otra, mapa 02 §2); el TSS fuera de la pantalla y de la API (D-41, DD-11; §10.7 y §13.5); y la portada que habla del plan (§11.7). Lo único que toca `packages/engine/` son tres constantes que el motor no lee (D-37, §11.3).

**Deja escrito, para su línea**: que el entrenador no mire el calendario (`daysToNextRace: null`, `train.ts` l. 256), por lo que sano y con TSB 0 hace la semana `base` en 1.820 de 1.820 días (mapa 02 §2): es conducta del tick y cambia lo que se entrena, así que es de la línea de entrenamiento, y E3 lo enseña como es; los cortes y las palabras de `arrivalLabel` (`packages/engine/src/training/projection.ts` l. 75-81), que se quedan salvo que el dueño elija otros (DD-10); `sinRitmo`, el rango de ganancia y el objetivo D1 (`docs/entrenamiento.md` l. 1119-1148), del entrenamiento, para los que la tarjeta de §10.3 deja sitio; el `0 race days` de `getBlockReport`, que es la decisión 24 del dueño de E2 (`docs/retransmision.md` §20.2); y la pantalla de órdenes ([DUEÑO 18], H-08), que pasa al catálogo con la cola larga y cuyo «qué pesa cada orden» es de la línea de táctica.

### 11.2 La vista previa nueva

`POST /api/riders/me/plan/preview` (paso 13b; D-34, D-35; I-08, O-10, X-05) proyecta lo que hará el tick, no lo que dicen los bloques solos. El cuerpo gana el modo de la pantalla y la ventana de órdenes tal como está en pantalla (hoy el cuerpo es `putTrainingPlanSchema`, `contracts.ts` l. 198, y la ruta no lee ni el modo, l. 443); las semanas se cuentan desde el `startDay` del plan vivo y no desde mañana (hoy `blocks[Math.floor(i / 7)]` desde mañana, l. 453, frente a `train.ts` l. 216); y la respuesta deja `days[]` de números y `arrivals[]` de etapas por `races[]` y `days[]` sin un solo número interno. Los esquemas, enteros, que sustituyen a `projectedDaySchema` y `planPreviewResponseSchema` (`contracts.ts` l. 210-235):

```ts
// packages/shared/src/contracts.ts
const SRC = ['carrera', 'viaje', 'orden', 'bloque', 'equipo', 'entrenador', 'descanso'] as const
export const trainingDaySourceSchema = z.enum(SRC) satisfies z.ZodType<TrainingDaySource>
export const loadLevelSchema = z.number().int().min(0).max(4) // LoadLevel: de Rest a Very hard
const dayBlockSchema = z.object({ code: coachBlockSchema, week: z.number().int().min(1).max(4) })

/** Un día de los 28, en GET /orders: qué se entrena, quién lo decide y de qué carrera es. */
export const ordersDaySchema = z
  .object({
    gameDay: z.number().int(),
    session: z.enum(SESSIONS).nullable(), // null el día de carrera
    intensity: intensitySchema.nullable(),
    source: trainingDaySourceSchema,
    block: dayBlockSchema.strict().nullable(), // con source 'bloque'
    raceKey: z.string().nullable(), // con source 'carrera' o 'viaje'
  })
  .strict()
export const planPreviewDaySchema = ordersDaySchema
  .extend({ kind: z.enum(['race', 'travel', 'train']), load: loadLevelSchema })
  .strict()
export const planPreviewRaceSchema = z
  .object({
    raceKey: z.string(),
    raceId: z.string(), // el id de calendario, el de /world/races/:raceId
    name: z.string(),
    country: z.string().nullable(),
    raceClass: z.string(),
    stageCount: z.number().int().min(1),
    startDay: z.number().int(),
    endDay: z.number().int(),
    ongoing: z.boolean(),
    arrival: arrivalLabelSchema.nullable(), // la de su primera etapa en el horizonte; null en curso
    travelOut: z.array(z.number().int()),
    travelBack: z.array(z.number().int()),
  })
  .strict()
export const planPreviewRequestSchema = z
  .object({
    mode: trainingModeSchema,
    plan: trainingPlanSchema.pick({ blocks: true, focusAttr: true, intensity: true }).strict(),
    /** la ventana de órdenes de la pantalla, guardadas y sin guardar, como la manda PUT /orders */
    edits: z.array(trainingOrderSchema).max(28), // TRAINING_HORIZON_DAYS, riders.ts l. 90
    startFresh: z.boolean().default(false), // la vista previa de `Start a new plan tomorrow`
  })
  .strict()
export const planPreviewResponseSchema = z
  .object({ races: z.array(planPreviewRaceSchema), days: z.array(planPreviewDaySchema).max(28) })
  .strict()
export type PlanPreviewRace = z.infer<typeof planPreviewRaceSchema>
export type PlanPreviewDay = z.infer<typeof planPreviewDaySchema>
```

Fuera: `ctl`, `atl`, `tsb`, `tss` y `totalTss`. `races[]` sale de `getRiderRaceDays`, que pasa a devolver objetos con la carrera y la etapa, como ya hace `getRiderTravelDays` (`packages/db/src/riderSchedule.ts` l. 37-70 y 175-226; hoy tira la carrera que tiene en la mano, l. 59-69), y de `getRiderUpcomingRaces` (l. 333-376). `arrival` es la de la salida de la primera etapa de la carrera que cae en el horizonte, la única de fiar (mapa 02 §3); una carrera en curso trae `ongoing: true` y `arrival: null`. La ruta sigue con `spoiler: 'horizon'` y `veil: { by: ['M'] }` y gana su esquema de respuesta (§13.2). **El plan vivo**: las semanas se cuentan desde el `startDay` de `getPlanForDay(db, riderId, currentDay + 1)`, o desde mañana sin plan o con `startFresh`; en `entrenador`, cada día llama a `coachPlan` con el TSB proyectado de ese día y la salud y la tensión de hoy (lectura §7.5, punto 2), que es lo que hará el tick con sus frenos.

### 11.3 La carga de un día de carrera, el viaje y el primer día

Hoy la vista previa proyecta cada día de carrera como `descanso_activo`, 25 TSS (`riders.ts` l. 449-451), cuando una etapa medida cargó 252,8 en el diario: en el mundo de prueba da `Spot on` (pantalla) a 17 de las 18 etapas de Race France del horizonte, y con la carga medida serían `Loaded` y `Cooked` desde la tercera (estimado, mapa 02 §3). El viaje lo proyecta como un día de bloque (90 TSS de `fondo` donde el tick pone 15) y la primera llegada sale con TSB 0 si mañana se corre (l. 475-476). Con E3 (D-36, D-37; X-06, O-09), la curva se compone día a día desde el último diario (`getDailyLog` con el horizonte de quien pide, l. 437-438) con **`applyDailyLoad(prev, tss, REC)`**, que el motor ya exporta (`packages/engine/src/index.ts` l. 365) y `packages/db` ya usa (`stageRun.ts` l. 13), y no con `projectLoad`, que solo acepta sesiones del catálogo (`projection.ts` l. 40-48; codigo C8). El TSS de cada día:

| Día              | TSS                                                                                                                                                                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| de carrera       | la mediana de los últimos `PREVIEW_RACE_DAY_SAMPLE` = 10 días de carrera del corredor (`activity` `carrera:…`, `stageRun.ts` l. 757); si no tiene, la de los días de carrera del mundo en los últimos `PREVIEW_WORLD_WINDOW_DAYS` = 28; si tampoco hay, `PREVIEW_RACE_DAY_TSS` = 150 (estimado) |
| de viaje         | 15, la sesión `viaje` del tick (`train.ts` l. 200-203; `shared/training.ts` l. 153), con `getRiderTravelDays`                                                                                                                                                                                   |
| de entrenamiento | el de la sesión que da `resolveTrainingDay` (§11.4), por su intensidad (`SESSION_CATALOG`, l. 54-153)                                                                                                                                                                                           |

El TSB con que amanece un día es el de la víspera ya aplicada; el de mañana es `ctl − atl` del último diario, no 0. La mediana del mundo es un agregado de todas las etapas de 28 días, que no destripa ninguna; se calcula una vez por mundo y día de juego y se guarda en memoria. Las tres constantes viven en `packages/engine/src/constants.ts` con su comentario de intención y su línea en `docs/balance.md` (`Claude.md`: toda constante de juego), sin subir `ENGINE_VERSION`, porque el motor no las lee; el PR 13b, que las añade, es el único de E3 que toca `packages/engine/`, y por eso corre los ocho tramos de bancos que el CI lanza con ese diff (`.github/workflows/ci.yml` l. 189; unos 73 minutos, `docs/retransmision.md` §17.1, regla 4). **El contraste con el diario** (H-20; sin evidencia de los jueces): `apps/api/src/routes/planPreviewDiary.test.ts`, sobre el mundo de los bancos, proyecta desde un día la llegada a la salida de cada carrera, deja correr esos días al tick, la compara con la que sale del diario real, escribe el acuerdo (la fracción de carreras en el mismo tramo) y fija un trinquete en el valor medido.

### 11.4 `resolveTrainingDay` y el diferencial del tick

La precedencia se escribe una vez (D-38), pura, en `packages/shared/src/trainingDay.ts`, y la usan el tick (`packages/db`) y la vista previa y `GET /orders` (`apps/api`):

```ts
// packages/shared/src/trainingDay.ts
import type { TrainingMode } from './contracts.js'
import type { Attribute, RiderArchetype } from './rider.js'
import type { CoachBlock, CoachContext, Intensity, Session, TrainingChoice } from './training.js'

export type TrainingDaySource =
  'carrera' | 'viaje' | 'orden' | 'bloque' | 'equipo' | 'entrenador' | 'descanso'
export type LoadLevel = 0 | 1 | 2 | 3 | 4
type Blocks = readonly [CoachBlock | null, CoachBlock | null, CoachBlock | null, CoachBlock | null]

export interface TrainingDayContext {
  readonly gameDay: number
  readonly mode: TrainingMode
  readonly archetype: RiderArchetype
  /** corre ese día: no entrena (train.ts l. 73 y 197) */
  readonly race: { readonly raceKey: string } | null
  /** de viaje, de ida o de vuelta (l. 69-80); la carrera le gana */
  readonly travel: { readonly raceKey: string; readonly direction: 'out' | 'back' } | null
  /** la orden del día: la guardada en el tick, la de la pantalla en la vista previa */
  readonly order: TrainingChoice | null
  /** el plan vivo (§11.5) */
  readonly plan: {
    readonly startDay: number
    readonly blocks: Blocks
    readonly focusAttr: Attribute | null
    readonly intensity: Intensity | null
  } | null
  readonly teamPlan: TrainingChoice | null
  /** lo que mira el entrenador ese día; la vista previa le pone el TSB proyectado */
  readonly coach: CoachContext
}
export interface ResolvedTrainingDay {
  readonly session: Session | null
  readonly intensity: Intensity | null
  readonly source: TrainingDaySource
  readonly block: { readonly code: CoachBlock; readonly week: 1 | 2 | 3 | 4 } | null
  readonly raceKey: string | null
}
/** LA PRECEDENCIA (D-38), la de train.ts l. 195-272 escrita una vez. */
export declare function resolveTrainingDay(ctx: TrainingDayContext): ResolvedTrainingDay
```

El orden, el de hoy entero: carrera; viaje (`viaje`, `normal`); en `entrenador`, el entrenador y nada más (l. 205 y 214); la orden; el bloque de la semana `floor((gameDay − startDay) / 7)` del plan vivo, con `blockWeek` (`shared/training.ts` l. 493-518), si no es `null`; el plan de equipo, solo en `mixto`; y el entrenador (`coachPlan`, l. 520-567), salvo en `manual`, donde el hueco es `descanso_activo` con `source` `descanso` (l. 266-271). **El tick** la llama sin cambiar de conducta: arma el contexto con las lecturas en lote que ya hace (l. 82-145) y sigue saltándose a quien ha corrido ese día antes de llamarla. **El diferencial** (`packages/db/src/trainingDay.diff.test.ts`) copia la cadena de hoy como referencia congelada y compara, corredor a corredor y día a día durante 28 días, la sesión y la intensidad que elige cada una en dos mundos (el de los bancos y el de la prueba del teléfono); si cambia una sola elección, el PR no entra. `trainingDay.test.ts` cubre la tabla de los tres modos por los siete orígenes. **`GET /api/riders/me/orders`** gana `days: z.array(ordersDaySchema)` con los 28 días (`ordersResponseSchema`, `contracts.ts` l. 389-401), y la web borra `defaultCoachPlan`.

### 11.5 Un solo plan vivo

Hoy `PUT /api/riders/me/plan` guarda siempre con `startDay` de mañana (`riders.ts` l. 411-413) y la clave es `(rider_id, start_day)` (`packages/db/src/schema.ts` l. 491): guardar en dos días de la misma ventana deja dos filas; la pantalla lee `getPlanForDay`, con `.limit(1)` sin orden (`packages/db/src/training.ts` l. 233-261), y el tick se queda con la última fila de un `Map` (`train.ts` l. 136-140). Medido con `planes.mjs` (mapa 02 §2): con un plan del día 101 y otro del 111, el día 115 la escalera enseña el del 101 y el tick entrena el del 111. Con E3 (D-39, H-04), en el paso 13a, **`PUT /api/riders/me/plan`**, cuerpo `{ mode, plan: { blocks, focusAttr, intensity }, startFresh? }`: el plan se guarda sobre el `startDay` del plan vivo (el de `getPlanForDay` con mañana), o sobre mañana si no hay o si llega `startFresh: true`; y en la misma transacción se borra todo plan del corredor cuyo `start_day` quede a menos de 28 días del nuevo. **La lectura**: `getPlanForDay` ordena por `start_day` descendente antes del `.limit(1)`, y el tick guarda en su `Map` la fila de `start_day` mayor. **La limpieza**: la migración de datos de drizzle-kit `0051_un_plan_vivo` (`drizzle-kit generate --custom --name un_plan_vivo`) borra los solapes de hoy y conserva el de `start_day` mayor, que es el que leerá la regla nueva.

```sql
-- 0051_un_plan_vivo: un plan que pisa otro posterior del mismo corredor se borra (D-39)
DELETE FROM "training_plans" AS p USING "training_plans" AS q
WHERE q."rider_id" = p."rider_id" AND q."start_day" > p."start_day" AND q."start_day" - p."start_day" < 28;
```

Casos nuevos en `planPorBloques.test.ts`: guardar el día 100 y otra vez el 110 deja una sola fila, con el `startDay` 101, y con `startFresh` el 110 deja la del 111; las dos, leídas igual por la pantalla y por el tick. **La consecuencia**: un corredor con planes solapados en producción pasa a entrenar desde ese día el más reciente, cuando hoy el orden no lo fija el SQL; cuántos son, lo dice la descripción del PR con un `select` de los solapes antes de migrar.

### 11.6 El viaje, donde se decide

El dato se arregló el 26 de septiembre de 2026 (`getRiderTravelDays` con `returnTravelDaysFor`, `riderSchedule.ts` l. 128-143 y 175-226; `travelDaysLabel`, `apps/web/src/domain/labels.ts` l. 157-161); queda cómo se ve (D-43; I-34; mapa 02 §6). **Ida, carrera y vuelta son un viaje**: `TripRow` (§4.5) agrupa en el día a día la ida, las etapas, los días de descanso de una vuelta (editables) y la vuelta, bajo su cabecera, `Trip to Race Sardegna (IT) · Days 55 to 61 · 7 days off training` (pantalla), con el icono `travel` y una línea por tramo, `Day 55 Out · Days 56 to 60 Race · Day 61 Back`; sus datos son `travelDays[]` (`contracts.ts` l. 380-386) y los días de `days[]` con su `raceKey`. **Se ve donde se decide**: `On your programme` (`apps/web/src/pages/MyRaces.tsx` l. 96-182), las carreras a las que de verdad se va y que hoy no nombran el viaje, gana su línea con el icono `travel`: `Day 51 out, Day 53 back · paid 48` (pantalla) para un agente libre, que se lo pagó al inscribirse (`raceAttendanceCost`, `packages/db/src/calendarRun.ts` l. 715-722), y `Day 51 out, Day 53 back` para el corredor de un equipo, que no paga; `upcomingRaceSchema` (`contracts.ts` l. 256-267) gana `travelOut`, `travelBack` y `travelPaid` (nulo si no pagó), con la misma regla que cobra (11-b). **Una numeración**: `Day N`, el día de la temporada, en todas partes; fuera el `GD N` de `MyRaces.tsx` l. 205 y 230, y `in N days` solo a siete días o menos. **Un icono**: el `travel` del catálogo (§3.7) en lugar del `✈️` de `Training.tsx` l. 227 y del `✈` rojo de `TeamCalendar.tsx` l. 94. **El porqué del viaje caro**, en un `InfoButton` y no en el `title` de `TeamCalendar.tsx` l. 89-96: `Overseas trip: it costs more, and 2 travel days each way with no training.` (pantalla).

### 11.7 La portada habla del plan

Hoy la portada mira solo las órdenes (`apps/web/src/domain/dashboard.ts` l. 77-91) y le dice `Your training queue is empty` (l. 82) a quien tiene sus cuatro bloques (mapa 05 §3; mapa 04, contradicción 8; O-22). Con E3 (D-43, I-20), `DashboardInputs` gana `mode`, `plan: { endDay } | null` (el último día del plan vivo, `startDay + 27`) y `tomorrowTravel: { raceName, out, back } | null`, y `dashboardActions` da, en este orden (pantalla):

| Cuándo                                                                                                              | Título                            | Detalle                                             | Botón                 |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------- | --------------------- |
| mañana es día de ida                                                                                                | `You travel to Race Var tomorrow` | `You don't train on travel days: 1 out, 1 back.`    | `See your plan`       |
| el plan vivo acaba en `PLAN_END_WARN_DAYS` = 7 días o menos (fuera de `entrenador`)                                 | `Your plan ends on Day 78`        | `After that, your coach picks the sessions.`        | `Plan the next weeks` |
| sin plan vivo, sin órdenes ni bloque en los próximos `TRAINING_WARN_DAYS` = 2 días (l. 48), y fuera de `entrenador` | `Your training queue is empty`    | `Until you plan it, your coach picks the sessions.` | `Plan the week`       |

En `entrenador` no sale ninguno de los dos últimos: ahí planificar no es lo que el jugador ha elegido. Los tres llevan a `/me/training`. `dashboard.test.ts` gana un caso por fila y el de quien tiene sus bloques, que ya no ve la cola vacía.

---

**Injertos aplicados.** I-08 (§11.2: la vista previa del plan vivo, con `edits` y el modo; §11.5: `PUT /plan` conserva el `startDay`), I-20 (§11.7: la portada habla del plan), I-34 (§11.6: `TripRow`, con su cabecera y sus datos; el componente, §4.5).

**Objeciones resueltas.** O-09 (§11.3: las tres constantes en el motor, sin subir `ENGINE_VERSION`, con su línea en `docs/balance.md` y los bancos del 13b), O-10 (§11.2: la vista previa cuenta desde el `startDay` del plan vivo; lo que se ve, §10.6), O-22 (§11.7: `Your training queue is empty` solo cuando es verdad).

**Huecos rellenados.** H-04 (§11.5: `0051_un_plan_vivo` y su consecuencia), H-20 (§11.3: `planPreviewDiary.test.ts`, con su trinquete). Contradicciones de hecho escritas: X-05 (§11.2: el desfase de semanas) y X-06 (§11.3: `applyDailyLoad`, sin tocar el motor).

**Decisiones de esta sección.**

- 11-a. Los días de la vista previa son los de `GET /orders` más `kind` y `load` (`planPreviewDaySchema = ordersDaySchema.extend(…)`), con `block` incluido, porque el `Chip` `Build · week 1` (§10.5) lo necesita y así la pantalla pinta igual lo guardado y lo editado. D-34 no nombraba `block` en `PlanPreviewDay`.
- 11-b. `paid 48` solo sale a quien pagó, el agente libre (`calendarRun.ts` l. 715-722), y la cifra se recalcula con `raceAttendanceCost`, la regla que la cobró, porque el movimiento del libro no lleva la carrera (`transactions.race_key`, nulo salvo en los premios, `schema.ts` l. 1006-1012). Se equivoca solo si la residencia cambió entre la inscripción y hoy. Descartado: buscar el movimiento por su nota (`${race.name} · travel`).
- 11-c. `edits` es la ventana entera de órdenes de la pantalla, como la manda `PUT /orders`, y no una lista de diferencias: así la vista previa y el guardado leen lo mismo.
- 11-d. La mediana de carrera del corredor sale de su diario con el horizonte de quien pide; la del mundo, de todas las etapas, porque es un agregado que no dice nada de ninguna.
- 11-e. `PLAN_END_WARN_DAYS` = 7, una semana antes del final del plan, porque planificar cuatro semanas pide más aviso que los dos días de `TRAINING_WARN_DAYS`.

---

## 12. La web instalable

La decisión está tomada (`docs/agenda.md` §4.15.1: web instalable y no app nativa) y esta sección la ejecuta: que el juego se pueda añadir a la pantalla de inicio y se comporte como una app, sin barra de navegador, con su icono, arrancando rápido y sin romperse cuando la red va mal; es además el requisito de la notificación de E4 en iPhone. Hoy no hay nada: `apps/web/public/` solo tiene `favicon.svg`, `index.html` (l. 1-19) no enlaza manifiesto ni declara `theme-color`, `main.tsx` no registra service worker y `vite.config.ts` (l. 1-20) no tiene plugin (mapa 05 §14). Sin red, una recarga da la página de error del navegador (mapa 05 §13). La agenda cuenta así lo que preguntó el dueño: «La pregunta era una app de Android y de Apple para acceder de forma más nativa» (`docs/agenda.md` l. 535; [DUEÑO 23]). Las líneas son las de `58c14da`; los ficheros nuevos son los de §G.9.

### 12.1 El manifiesto

`apps/web/public/manifest.webmanifest` (paso 3; D-45), que `@fastify/static` sirve como `application/manifest+json` (medido por telefono §8.1) y que la CSP de hoy permite, porque `manifest-src` y `worker-src` caen en `default-src 'self'` (`apps/api/src/app.ts` l. 172-186). Entero:

```json
{
  "id": "/",
  "name": "Cycling Star",
  "short_name": "Cycling Star",
  "description": "A cycling manager you play from your phone between race days.",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "display_override": ["standalone", "minimal-ui"],
  "theme_color": "#123a5c",
  "background_color": "#eef2f6",
  "lang": "en",
  "dir": "ltr",
  "categories": ["games", "sports"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    {
      "src": "/icons/maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Training",
      "url": "/me/training?source=pwa-shortcut",
      "icons": [{ "src": "/icons/shortcut-training-96.png", "sizes": "96x96", "type": "image/png" }]
    },
    {
      "name": "Races",
      "url": "/world/races",
      "icons": [{ "src": "/icons/shortcut-races-96.png", "sizes": "96x96", "type": "image/png" }]
    }
  ]
}
```

| Campo                             | Por qué                                                                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `scope`                     | una sola app en todo el origen                                                                                                    |
| `start_url`                       | `?source=pwa` cuenta los arranques desde el icono en el sensor (§12.8); el enrutador lo ignora                                    |
| `name`, `short_name`              | `Cycling Star`, 12 caracteres: lo que cabe bajo un icono                                                                          |
| `description`                     | la ficha de instalación de Android (pantalla)                                                                                     |
| `display`, `display_override`     | sin barra del navegador; `minimal-ui` donde `standalone` no exista                                                                |
| `theme_color`, `background_color` | la barra de estado como la cabecera (`navy`) y la pantalla de arranque como la página (`canvas`)                                  |
| `icons`                           | los que pide Chrome, 192 y 512 (mapa 05 §14); el `maskable` lleva el dibujo en el 70 % central, dentro de la zona segura del 80 % |
| `shortcuts`                       | `Training` y `Races` (pantalla), lo que se abre entre dos días de juego, con su icono de 96                                       |
| `lang`, `dir`, `categories`       | la interfaz está en inglés (`Claude.md`); `games` y `sports` para las tiendas que los leen                                        |

### 12.2 Los iconos y las metas de `index.html`

**Los iconos** (D-45, I-23) son material generado (D-08): `apps/web/scripts/icons.mjs` pinta con el Chromium de Playwright el logotipo de `apps/web/src/components/Logo.tsx`, hoy en `#4f46e5` y `#f59e0b` de Tailwind v3 (l. 14-35; mapa 01 §6), recoloreado sobre `navy` `#123a5c`: la bici en blanco (11,76:1) y la estrella en `gold` `#e0a106` (5,19:1, calculado en `<scratchpad>/redactor-L2/contraste.py`). Escribe `icon-192.png`, `icon-512.png`, `maskable-512.png` (el dibujo en el 70 % central), `apple-touch-icon-180.png` (opaco, porque iOS rellena de negro la transparencia) y los dos de los atajos, con su huella en un test que falla si el logotipo cambia sin regenerar; el revisor los mira a 16, 48 y 180 px en el PR. `favicon.svg` se recolorea igual (hoy un cuadro `#4f46e5` con una rueda y una estrella `#f59e0b`). E3 recolorea y no redibuja: el logotipo no tiene dueño (mapa 04, contradicción 12). **Las metas**, en el `<head>` de `apps/web/index.html`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#123a5c" />
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />
<meta name="apple-mobile-web-app-title" content="Cycling Star" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

`viewport-fit=cover` hace que `env(safe-area-inset-*)` valga algo en WebKit, y sin él el hueco de la barra inferior (`BottomNav.tsx` l. 44; `App.tsx` l. 154) no sirve (sin comprobar en un aparato). La barra de estado va en `default` y no en `black-translucent` (O-02, X-10): con la translúcida, instalada en iPhone, la hora se pintaría sobre la cabecera hasta que `AppHeader` reserve `env(safe-area-inset-top)`, que lo hace en el paso 11 de todas formas (codigo C12).

### 12.3 El service worker

**Escrito a mano, sin Workbox** (D-46; I-11, O-13): `apps/web/sw/sw.js` (unas 120 líneas, estimado) con la decisión de cada petición en una función pura, **`decide(request)`**, en `apps/web/sw/decide.js`, que se prueba sola en `apps/web/sw/decide.test.ts`. Los dos ficheros declaran sus globales (`/* global self, caches, fetch */`) para que pasen `eslint .` (`.github/workflows/ci.yml` l. 252). La tabla de `decide`, en este orden (gana la primera fila que casa):

| Petición                                            | `SwDecision`    | Qué hace y por qué                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| otro método que `GET`, u otro origen                | `passthrough`   | sin `respondWith`: el navegador la hace como si no hubiera service worker                                                                                                                                                                                                                                 |
| `/api/*`, `/api/auth/*` y `/health`                 | `passthrough`   | **nunca se guarda ni se intercepta**: la API de E2 responde según lo que ha visto cada jugador (`spoiler.ts` l. 63-70), `index.html` precarga `/health` (l. 13) y el HTML de etapa precarga la API (`app.ts` l. 362-371); una caché que no distingue cuentas daría a la segunda el destripe de la primera |
| `/sw.js`                                            | `passthrough`   | el navegador la pide él; se sirve con `no-cache`                                                                                                                                                                                                                                                          |
| `/assets/*`                                         | `cache-first`   | llevan huella y la API ya los sirve un año inmutables (`app.ts` l. 125-144); un despliegue trae nombres nuevos                                                                                                                                                                                            |
| navegación (`request.mode === 'navigate'`)          | `network-first` | la red con `NAV_TIMEOUT_MS` = 3.000; si no contesta, la cáscara guardada (`/index.html`); nunca se guarda una navegación, porque el HTML de carrera y de etapa sale `private, no-store` con `Vary: Cookie` (l. 367-369)                                                                                   |
| `/manifest.webmanifest`, `/icons/*`, `/favicon.svg` | `cache-first`   | están en la precarga, y un service worker nuevo los renueva                                                                                                                                                                                                                                               |
| lo demás                                            | `passthrough`   | p. ej. `og-default.png`                                                                                                                                                                                                                                                                                   |

```js
// apps/web/sw/decide.js: pura, sin `self`; la llama el manejador `fetch` de sw.js
/** @typedef {'network-first' | 'cache-first' | 'passthrough'} SwDecision */
const PRECACHED = /^\/(manifest\.webmanifest|favicon\.svg|icons\/[\w-]+\.png)$/

/**
 * @param {{ method: string, url: string, mode: string }} request
 * @param {string} origin el de la web, `self.location.origin`
 * @returns {SwDecision}
 */
export function decide(request, origin) {
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== origin) return 'passthrough'
  const p = url.pathname
  if (p === '/health' || p === '/api' || p.startsWith('/api/')) return 'passthrough'
  if (p === '/sw.js') return 'passthrough'
  if (p.startsWith('/assets/')) return 'cache-first'
  if (request.mode === 'navigate') return 'network-first'
  return PRECACHED.test(p) ? 'cache-first' : 'passthrough'
}
```

`decide.test.ts` lleva un caso por fila de la tabla y cuatro bordes, los cuatro `passthrough`: `/api` a secas, `/health?x=1`, un `POST` a `/assets/x.js` y un `/assets/x.js` de otro origen. **La precarga**: `apps/web/vite-plugin-sw.ts` escribe `dist/sw.js` al cerrar el build con la lista que saca de `dist/.vite/manifest.json` (`vite.config.ts` l. 11): `index.html`, la entrada y su CSS, los trozos de los cinco destinos de la `BottomNav` (`/`, `/me/profile`, `/team/squad`, `/world/races` y `/news`, `apps/web/src/domain/nav.ts` l. 22-26) y el de `/me/training`, el del atajo (12-a), el manifiesto, los iconos y el sprite de banderas; unos 220 KB con gzip (estimado por sistema §8), con el tope `PRECACHE_MAX_GZ` = 250 KB de `peso.test.mjs`. El plugin inyecta también `NAV_TIMEOUT_MS` (de `apps/web/src/net.ts`) y la versión, la huella de la lista. **Con `Save-Data`** (`self.navigator.connection?.saveData`), solo la cáscara: `index.html`, la entrada y su CSS. Se descartó precargar todo el JS y la CSS, 80 ficheros y unos 320 KB (telefono §8.2), que compiten con lo que el jugador pide después con Slow 4G (O-13). **Por qué la navegación va primero por la red**, medido por telefono en caliente (Slow 4G, CPU ×4, mediana de tres): con la cáscara de la caché, `Watch` pinta a 1,47 s y está lista a 3,24, frente a 1,20 y 1,67 sin service worker, porque pierde las precargas que el servidor pone en el HTML de la etapa (`spaShell.ts` l. 201-221); primero la red, 1,08 y 1,50; en la portada y el entrenamiento no cambia nada (de 1,07 a 1,18 s), porque eso ya lo hace la caché inmutable de E2. **Nunca se persiste la caché de React Query**: sin red, los datos salen de la memoria de la sesión. **El registro**: `registerServiceWorker()` de `net.ts`, solo en producción (`import.meta.env.PROD`), tras el evento `load`; `webCacheHeaders` (`app.ts` l. 135-144) gana `sw.js` con `no-cache`, porque en la raíz saldría con `max-age=0`.

### 12.4 Sin red

Hoy, sin red, quien tiene sesión ve `Log in`: `ProtectedRoute.tsx` l. 12-13 lee una sesión que no llega como «sin sesión» (X-03; captura `pwa/out/sinred-recargar-propuesta.png` de telefono). Con E3 (D-47; I-29; X-03, X-04), en el paso 4:

**La sesión tiene tres estados** (`SessionState`, en `apps/web/src/net.ts`): `signed-in` si `authClient.useSession()` trae datos; `signed-out` si no los trae y no hay error, o el error es un 401; y `unknown` en cualquier otro caso. La regla sale de cómo responde better-auth 1.6.25: sin sesión, `get-session` contesta 200 con `null` (`api/routes/session.mjs` l. 191), y un fallo de red deja `data` como estaba (`null` en una recarga en frío) con `error` lleno (`client/session-atom.mjs` l. 88-98 y 110-122). En `unknown`, `ProtectedRoute` no lleva a `/login` y pinta la página, y la cabecera pinta la del jugador si `localStorage` tiene la marca `cs:signed-in` (se pone con `signed-in` y se quita con `signed-out`), sin nada de la cuenta. **`HorizonWatcher` no se toca**: solo vacía la caché si cambia una sesión ya resuelta (`cacheOwnerChanged`, `queryClient.ts` l. 165-167), y una recarga en frío sin red no lo es (X-04); gana un test de que `unknown` no la vacía nunca.

**El aviso**: `OfflineBanner` (§4.7), con `navigator.onLine` y el `onlineManager` de React Query, en una franja de 32 px bajo la cabecera: `You're offline. Showing what you saw at 14:02.` (pantalla), con la hora de `dataUpdatedAt` de la consulta principal de la página (I-29), porque en el teléfono no se distingue una general de esta mañana de una de ayer; al volver la red, `Back online` (pantalla) dos segundos. **Lo pausado** (`fetchStatus === 'paused'`, el `networkMode` por defecto) pinta `OfflineState` (§4.2) y se rehace solo al volver (`refetchOnReconnect`, `queryClient.ts` l. 386). **Las mutaciones** esperan en la `ActionBar`, en memoria: `You're offline. Your changes stay here until you reconnect.` (pantalla). **Un trozo que falla** pinta su `ErrorState` en su sitio, con la cabecera y la barra: `This page needs a connection the first time.` · `Try again` (pantalla), y no la barrera raíz que sustituye la web entera (`main.tsx` l. 22-30), que queda para los fallos de pintado. Los cuatro casos del mapa 05 §13, que comprueba `apps/web/e2e/sinred.spec.ts`:

| Caso (captura)                                     | Hoy                                                                                                  | Con E3                                                                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| un enlace a una página cuyo trozo no se cargó (48) | toda la web cambia por la barrera: `Something went wrong`, el error técnico del módulo y `Try again` | si es un destino de la barra o el entrenamiento, está precargado y pinta su `OfflineState`; si no, su `ErrorState` en su sitio |
| recargar (49)                                      | `net::ERR_INTERNET_DISCONNECTED`, la página de error del navegador                                   | la cáscara del service worker, con la cabecera del jugador (`unknown` y la marca), nunca `/login`, y `OfflineBanner`           |
| volver a una página visitada (50)                  | la página, de la caché de React Query, sin aviso                                                     | la misma página con `You're offline. Showing what you saw at 14:02.`                                                           |
| trozo cargado y datos sin pedir (51)               | `Loading…` sin fin (React Query no lanza consultas sin red)                                          | `OfflineState`, que se rehace al volver la red                                                                                 |

### 12.5 La versión nueva

El service worker nuevo se instala y **espera** (D-48): la web lo ve en `registration.waiting` y enseña `UpdateToast` (§4.7), `A new version is ready · Reload` (pantalla), sobre la `ActionBar`; al tocarlo manda `SKIP_WAITING` y recarga en `controllerchange`. **Nunca recarga sola**, y `UpdateToast` no sale mientras corre una retransmisión: `StageWatch` marca `setReloadBlocked(true)` (de `net.ts`) mientras reproduce, y el aviso espera a que pare. Si nadie lo toca, la versión entra al cerrar todas las pestañas. **El desfase** (una pestaña vieja contra una API nueva): `GET /health` (`apps/api/src/routes/health.ts` l. 22) gana `webBuild`, la huella del despliegue de la web, y la web la mira como mucho cada `UPDATE_CHECK_MIN_MS` = 1.800.000 ms, al volver la pestaña a primer plano; si no casa con la suya, llama a `registration.update()`. Como la web no puede saber la huella del `index.html` que la cargó, el plugin escribe la del trozo de entrada en `<meta name="cs-web-build">` de `index.html` y la API la lee de ese fichero al arrancar (12-b). Una respuesta que no pasa su esquema en la web pinta el `ErrorState` `outdated`: `This version is out of date · Reload` (pantalla).

### 12.6 iPhone y Android

**iPhone** (D-51, DD-15). Safari no tiene `beforeinstallprompt` y no dice que se pueda instalar, así que `InstallHint` (§4.7) lo explica: `Add Cycling Star to your Home Screen: tap Share, then Add to Home Screen` (pantalla), como `Notice` `note` en la portada, **tras la tercera sesión** (`INSTALL_HINT_AFTER_SESSIONS` = 3) o cuando E4 pida avisos, nunca en la primera visita, y una sola vez tras cerrarlo (`cs:install-hint-closed`). Una sesión es una carga en frío a más de 30 minutos de la anterior, contada en `localStorage` (`cs:sessions`, `cs:last-seen`) por `apps/web/src/domain/install.ts`. Desde iOS 26, toda web añadida a la pantalla de inicio se abre como app aunque no haya manifiesto, y los avisos siguen pidiendo que esté añadida (mapa 05 §14), que es el requisito de E4. **Instalada no hay barra con recarga**: con `display-mode: standalone` (o `navigator.standalone`), `ErrorState` añade `Reload app` (pantalla), y todas las pantallas de segundo nivel llevan su enlace de vuelta (§6.5). **Android**: la web guarda el evento `beforeinstallprompt` y ofrece `Install app` (pantalla) en `/account` y, una vez, en la portada tras ver una etapa entera; Chrome con los servicios de Google y Samsung Internet instalan como WebAPK, con entrada propia en el cajón (mapa 05 §14). **Medido por telefono**: Chromium lee el manifiesto sin errores (`Page.getAppManifest`) y el service worker queda activo; la instalabilidad no se pudo comprobar, porque `Page.getInstallabilityErrors` da la lista vacía también para la web de hoy, y no se ha probado en ningún teléfono (telefono §8.4). Lo comprueba la prueba del dueño (§7.7).

### 12.7 El peso

**Las banderas** (D-49; O-08, X-07) son el 91 % de la CSS: la hoja que bloquea la primera pintura pesa 94,3 KB con el gzip de Vite y 92,4 por la red, la misma hoja con dos compresores (X-26; mapa 01 §8). Pasan a un sprite WebP de 64 × 48 por bandera (el triple de 21 × 16) con las 133 del juego, unos 47 KB (telefono §8.3), importado desde `apps/web/src/assets/flags.webp` para que Vite le ponga huella en `assets/`; sus coordenadas, en `apps/web/src/components/ui/flagSprite.generated.ts`, salen de `apps/web/scripts/flag-sprite.mjs` con su test de huella; `flag-icons` sale de `main.tsx` l. 9 y `Flag` (§4.6) pinta del sprite. Se descartó `public/flags/`: en la raíz saldrían con `max-age=0` (`app.ts` l. 131-133) y cada revalidación gasta el cupo de 300 peticiones por minuto e IP (`security.ts` l. 10). **Medido por telefono** (Slow 4G, CPU ×4, mediana de cinco): la hoja pasa de 92,4 a 9,2 KB con gzip, la primera pintura de 3,20 a 2,93 s en las tres páginas medidas y bajan de 62 a 82 KB por la red. **Los presupuestos** (D-50), en `apps/web/scripts/peso.test.mjs`, tras `vite build`, con zlib de Node a nivel 9 sobre los ficheros de `dist/` (X-26), en el trabajo `Build` del CI:

| Constante             | Tope   | Hoy                                                        |
| --------------------- | ------ | ---------------------------------------------------------- |
| `CSS_BLOCKING_MAX_GZ` | 15 KB  | 94,3 (Vite) y 92,4 (por la red); con el sprite, 9,2        |
| `ENTRY_JS_MAX_GZ`     | 160 KB | unos 157: 250,9 de arranque menos 94,3 de CSS (mapa 01 §8) |
| `PRECACHE_MAX_GZ`     | 250 KB | no hay precarga; unos 220 estimados (§12.3)                |
| `FLAG_SPRITE_MAX`     | 60 KB  | no hay sprite; unos 47 (telefono)                          |

**El barril de `packages/shared`** (H-03; sin evidencia de los jueces): `request.js` lleva 42 KB de `broadcast/*` porque el paquete no declara `sideEffects` (mapa 01 §8). En el paso 6 gana `"sideEffects": false` solo si `peso.test.mjs` enseña que `request.js` los suelta y `pnpm test` sigue en verde; si no, queda escrito en este apartado con la cifra. **Cada noche**, `apps/web/e2e/nocturno.spec.ts`, con Slow 4G, CPU ×4 y la mediana de cinco: primera pintura en frío de 3,0 s o menos (hoy de 3,16 a 3,23; con el sprite, 2,93), lista en frío de 5,0 o menos (hoy de 4,7 a 5,8) y en caliente de 2,0, o de 3,0 en el entrenamiento (mapa 05 §12; telefono §5.3).

### 12.8 La prueba que revisa la app nativa

La agenda cuelga la revisión de la app nativa de una analítica que no existe (§4.22.3; mapa 04, contradicción 18; la tarea de `docs/encargos.md` l. 741-742 está sin hacer), así que E3 pone el sensor mínimo, propio y sin datos personales (D-52, DD-14), en el paso 23. **El cuerpo**: `POST /api/telemetry/vitals`, una vez por sesión, contesta siempre 204:

```ts
// packages/shared/src/contracts.ts
export const vitalsDeviceSchema = z.enum(['phone', 'tablet', 'desktop']) // por pointer: coarse y el ancho
export type VitalsDevice = z.infer<typeof vitalsDeviceSchema>
export const vitalsSchema = z
  .object({
    device: vitalsDeviceSchema,
    standalone: z.boolean(), // display-mode: standalone
    os: z.enum(['ios', 'android', 'other']),
    route: z.string().regex(/^\/[a-z0-9/:_-]{0,63}$/), // el patrón de la ruta, nunca la URL con ids
    source: z.enum(['pwa', 'pwa-shortcut']).nullable(), // el ?source= del manifiesto
    readyMs: z.number().int().min(0).max(60_000).nullable(), // «lista», donde se mida
    inpMs: z.number().int().min(0).max(10_000).nullable(),
  })
  .strict()
```

**El agregado**: la migración `0054_telemetria` crea `telemetry_vitals_daily`, una fila por (`day`, `device`, `standalone`, `os`, `route`), con `sessions` y, para poder sacar el p75 sin guardar muestras, dos cuentas por tramos, `ready_buckets` (40 de 250 ms) e `inp_buckets` (40 de 25 ms), que el `POST` suma en un `update` atómico (12-c); `ready_p75_ms` e `inp_p75_ms` se rellenan al cerrar el día, con el primer `POST` del día siguiente. Sin IP, sin cuenta y sin la URL. **La regla** (telefono §8.5), pura, en `nativeReviewVerdict(rows)` de `apps/api/src/telemetry.ts`, con sus constantes: si en una semana el `NATIVE_REVIEW_PHONE_SHARE` = 50 % o más de las sesiones es de teléfono (el sensor no cuenta jugadores, porque no guarda cuentas), la app nativa se revisa cuando, `NATIVE_REVIEW_WEEKS` = 4 semanas seguidas, el p75 de «lista» en teléfono pasa de `NATIVE_REVIEW_READY_P75_MS` = 4.000 ms o el de INP de `NATIVE_REVIEW_INP_P75_MS` = 300; o cuando menos del `NATIVE_REVIEW_INSTALL_SHARE` = 20 % de las sesiones de teléfono es instalada tres meses después de que salga `InstallHint`; o cuando E4 mide que en iPhone acepta avisos menos del `NATIVE_REVIEW_PUSH_ACCEPT` = 30 % de los instalados o que falla más del `NATIVE_REVIEW_PUSH_FAIL` = 10 %. El veredicto sale en una línea del panel de administración, por `GET /api/admin/telemetry` (con `requireAdmin` y `ADMIN_VEIL`). No sustituye a la tarea de analítica.

---

**Injertos aplicados.** I-11 (§12.3: el service worker no intercepta `/api/*`, `/health` ni `/api/auth/*`, sin `respondWith`, y no persiste la caché de React Query), I-23 (§12.2: los iconos generados con su huella), I-29 (§12.4: la hora de los datos en el aviso sin red).

**Objeciones resueltas.** O-02 (§12.2: la barra de estado en `default`), O-08 (§12.7: el sprite entra por Vite, con huella, y sus coordenadas con test), O-13 (§12.3: la precarga de los destinos y no de todo, con su tope y `Save-Data`).

**Huecos rellenados.** H-03 (§12.7: `sideEffects` en `packages/shared`, con su condición). Contradicciones de hecho escritas: X-03 (§12.4), X-04 (§12.4), X-07 (§12.7), X-10 (§12.2) y X-26 (§12.7: la misma hoja con dos compresores).

**Decisiones de esta sección.**

- 12-a. La precarga lleva también el trozo de `/me/training`, porque es el destino del atajo `Training` del manifiesto y sin él el atajo falla sin red. D-46 nombraba solo los cinco de la barra.
- 12-b. `webBuild` es la huella del trozo de entrada, que el plugin escribe en `<meta name="cs-web-build">` de `index.html` y la API lee de ese fichero, porque la web no puede conocer la huella del `index.html` que la cargó sin que el fichero se contenga a sí mismo.
- 12-c. `telemetry_vitals_daily` gana `ready_buckets` e `inp_buckets`, que §G.8 no tenía, porque un p75 diario no se puede sumar sesión a sesión. Descartado: guardar cada sesión, que guardaría más de lo que pide D-52.
- 12-d. `UpdateToast` espera a que pare la retransmisión, con `setReloadBlocked` de `net.ts`, en lugar de salir y que el jugador recargue en mitad de una etapa.
- 12-e. Una sesión, para `InstallHint`, es una carga en frío a más de 30 minutos de la anterior.
- 12-f. El sensor cuenta sesiones y no jugadores, y la regla de D-52 se aplica a la fracción de sesiones.

---

## 13. La regla de la frontera

Cualquiera abre la pestaña de red, así que ocultar un dato en la interfaz no lo oculta. El caso que lo motivó fue el techo del entrenador ([DUEÑO 14]: el entrenador anunciaba cuatro o cinco estrellas casi desde el primer entrenamiento; `docs/agenda.md` l. 996-998 y 1061), y ya está arreglado: `ceilingOpinionSchema` es un `z.enum` de nueve códigos de frase (`packages/shared/src/contracts.ts` l. 115-126). Pero la regla general no existe, y la frontera hoy no se rompe por los ocultos, que no cruzan (medido con testigos en las 52 GET que barre el banco, mapa 02 §8), sino por los números: el valor interno de los diez atributos de **cualquier** corredor viaja con todos sus decimales. Esta sección fija la regla (D-53), su mecanismo (D-54) y el inventario de hoy con su arreglo (D-55). Las líneas son las de `58c14da`.

### 13.1 La regla

Se escribe así, aquí y en la cabecera de `packages/shared/src/contracts.ts` (D-53):

> Toda respuesta de la API es un subconjunto de lo que una pantalla enseña a quien la pide, en su forma de pantalla. Un número interno (un atributo con decimales, CTL, ATL, TSB, TSS, un techo, el talento, la fragilidad, la moral exacta) no cruza nunca; cruza su estrella, su tramo, su palabra, su barra de 0 a 100 o su flecha. Las excepciones van en una lista con su motivo y su PR de salida, y la lista solo encoge.

Dos consecuencias. **«A quien la pide»**: lo que un jugador ve de su corredor (la marca de cuarto de banda bajo cada estrella, `AttributeList.tsx` l. 33-48) no lo ve de uno ajeno, y la API tampoco se lo manda. **«En su forma de pantalla»**: si la pantalla convierte un valor en estrellas, la API manda las estrellas y no el valor del que salen, aunque el valor no sea un oculto; el número que un jugador nunca debe leer es también el que un jugador nunca debe recibir. Lo que dice hoy la convención de los contratos, «Los objetos son "strip" por defecto (Zod ignora campos extra): añadir un campo en la API nunca rompe la web» (`contracts.ts` l. 9-11), sigue valiendo para la web y deja de valer para la API: un campo de más ya no sale.

### 13.2 El mecanismo

Cuatro piezas, que trabajan solas (D-54; I-09; O-04, O-05):

**1. El serializador hace de puerta.** Cada ruta del jugador declara su esquema de respuesta, y el serializador de `fastify-type-provider-zod` que la API ya monta (`apps/api/src/app.ts` l. 162-163) quita de la respuesta todo lo que el esquema no declara, también dentro de los objetos anidados (medido por el juez de código, C1: `{ id, stars, ctl, attributes, days: [{ gameDay, tsb }] }` sale `{ id, stars, days: [{ gameDay }] }`; X-21). Hoy ninguna ruta lo declara (mapa 02 §9, punto 6). El registro de E2, `registerSpoilerGuard` (`apps/api/src/spoiler.ts` l. 155-183), que ya exige `spoiler` y `veil` y no deja arrancar al servidor sin ellos, gana `response`:

```ts
// apps/api/src/spoiler.ts
/** Lo que devuelve la ruta, por código: los esquemas de packages/shared/src/contracts.ts (D-54). */
export type RouteResponse = Readonly<Partial<Record<200 | 201 | 204, z.ZodType>>>
declare module 'fastify' {
  interface FastifyContextConfig {
    response?: RouteResponse
    /** 'tests': declarado y comprobado en los tests, sin serializar en cada petición (§13.4) */
    responseCheck?: 'runtime' | 'tests'
  }
}
/** Las únicas rutas de /api sin esquema de respuesta, con su porqué. */
export const RESPONSE_EXEMPT: ReadonlyMap<string, string> = new Map([
  ['/api/auth/*', 'la sirve el manejador de better-auth, con sus propias respuestas'],
])
// en el gancho onRoute, tras comprobar spoiler y veil (l. 162-172):
//   una ruta de /api/* o /health sin config.response, fuera de RESPONSE_EXEMPT, lanza
//   `ruta sin esquema de respuesta (config.response): ${at}`; con responseCheck 'runtime' (el
//   defecto), el gancho copia config.response en r.schema.response, y lo aplica el serializador.
// RouteEntry (l. 81-88) gana `response: RouteResponse | null` y `responseCheck`.
```

**2. La resolución va en el tipo.** Un campo que la pantalla pinta como estrellas, barra o flecha se declara con su forma, y un `63.4172` no pasa el contrato (escritos enteros aquí; los usan §13.5 y §13.7):

```ts
// packages/shared/src/contracts.ts
/** Medias estrellas de 0 a 5: lo que pinta StarRating (attrStars, rider.ts l. 237-240). */
export const starsSchema = z.number().multipleOf(0.5).min(0).max(5)
/** Una barra entera de 0 a 100: lo que pinta Meter (fondo y frescura, condition.ts l. 35-42). */
export const barSchema = z.number().int().min(0).max(100)
/** La flecha de 28 días, en sus cinco niveles (trendArrow, rider.ts l. 286-292). */
export const arrowSchema = z.enum(['sube_mucho', 'sube', 'igual', 'baja', 'baja_mucho'])
/** El cuarto de banda de un atributo propio, de 0 a 3 (attrProgress; AttributeList.tsx l. 33-48). */
export const markSchema = z.number().int().min(0).max(3)
```

**3. Ningún campo sin lector.** `apps/api/src/frontera.test.ts` recorre los esquemas de respuesta del registro (los `RouteEntry` con `response`) hoja por hoja y falla si una hoja se llama como un número interno (`INTERNAL_NUMBER_NAMES`: `ctl`, `atl`, `tsb`, `tss`, `ceiling`, `talent` y `fragility`) o es un `attributes` de números, y si una hoja no se lee en `apps/web/src`. La lectura se busca con el AST de TypeScript, como `noEngine.test.ts` (l. 8-17): el nombre de la hoja tiene que aparecer como acceso a propiedad, como desestructuración o como clave literal en algún fichero de la web; es una comprobación por nombre, gruesa a propósito (no distingue dos `name`), y por eso los nombres prohibidos se miran aparte. Es `columnasVivas.test.ts` (l. 6-24) al revés: allí toda columna se escribe en algún sitio; aquí todo campo se lee. Lo que no cumple va en **`FRONTERA_SIN_USO`**, con su motivo y su PR de salida, y el test también falla si una excepción ya no hace falta (el campo salió del esquema o ya se lee), para que la lista no guarde muertos:

```ts
// apps/api/src/frontera.ts
export const INTERNAL_NUMBER_NAMES = [
  'ctl',
  'atl',
  'tsb',
  'tss',
  'ceiling',
  'talent',
  'fragility',
] as const
export interface FronteraException {
  readonly route: string // 'GET /api/riders/me/form'
  readonly field: string // 'log[].atl': la hoja, con [] por cada array
  readonly breaks: 'sin_lector' | 'numero_interno' | 'resolucion'
  readonly why: string
  readonly until: '19b' | '19c'
}
/** Solo encoge: añadir una entrada pide subir FRONTERA_SIN_USO_MAX, y eso se revisa en el PR. */
export const FRONTERA_SIN_USO_MAX = 9
export declare const FRONTERA_SIN_USO: readonly FronteraException[] // las de la tabla de abajo
```

Su contenido de hoy, el día que entra el PR 19a (con lo de la vista previa ya fuera en el 13b, §11.2):

| `route`                                                                                     | `field`                  | `breaks`         | `why`                                                                           | `until` |
| ------------------------------------------------------------------------------------------- | ------------------------ | ---------------- | ------------------------------------------------------------------------------- | ------- |
| `GET /api/riders/me/form`                                                                   | `log[].ctl`, `log[].tsb` | `numero_interno` | las lee `conditionBars` en la web para sus dos barras (`condition.ts` l. 35-42) | `19b`   |
| `GET /api/riders/me/form`                                                                   | `log[].atl`              | `numero_interno` | no la lee nadie                                                                 | `19b`   |
| `GET /api/riders/me`                                                                        | `attributes.*`           | `resolucion`     | con decimales; la web pinta estrellas, marca y cerillos                         | `19b`   |
| `GET /api/riders/:id`                                                                       | `attributes.*`           | `resolucion`     | con decimales, de cualquier corredor; la web pinta estrellas                    | `19b`   |
| `GET /api/riders/me/trend`                                                                  | `delta28`                | `resolucion`     | la web pinta la flecha                                                          | `19b`   |
| `GET /api/riders/me/summary`                                                                | `morale`                 | `resolucion`     | con decimales; la web pinta el porcentaje                                       | `19b`   |
| `GET /api/riders/me/coach-view`                                                             | `facilities`, `season`   | `sin_lector`     | no se pintan                                                                    | `19c`   |
| `GET /api/riders/me/summary`, `/api/riders/:id`, `/api/countries/:code`, `/api/free-agents` | `fame`                   | `sin_lector`     | vale siempre 0: la columna no se escribe (`schema.ts` l. 326-340)               | `19c`   |
| `GET /api/riders/me/plan`                                                                   | `plan.goalRaceId`        | `sin_lector`     | el objetivo D1 no tiene control                                                 | `19c`   |

Si el test encuentra al entrar más campos sin lector que estos, el 19a los añade con su motivo y su salida, y sube `FRONTERA_SIN_USO_MAX` una vez, en ese PR.

**4. El canario.** El de B1a (`apps/api/src/spoilerCanary.test.ts` l. 20-51) planta testigos que solo existen en lo velado y barre las GET del registro con la sesión del jugador (`__fixtures__/spoilerWorld.ts` l. 327-351). Gana tres testigos de frontera, el MON visible de `rider_attrs` (63,4172), el `ctl` del diario (61,98765) y la moral (57,31415), que ninguna respuesta puede devolver con esa cifra (I-09); y barre también **las POST de lectura**, en una lista cerrada, `CANARY_POST_READS`: hoy `POST /api/riders/me/plan/preview` y, desde el 18a, `POST /api/teams/me/kit/check`. Nunca todas las POST, que ejecutarían mutaciones en el mundo de prueba (O-05; hoy el barrido solo mira las GET, l. 334). Una regla de nombres sola no basta: un campo con decimales y otro nombre la pasa, y esto lo caza (juez de uso, sobre telefono §9).

### 13.3 Por qué no `.strict()`, y qué hace el serializador

Tres propuestas querían validar cada respuesta con una versión `.strict()` de su esquema en los tests, y dicen que habría cazado las seis claves de más de `GET /api/teams/:id/news` (`personal`, `riderId`, `riderName`, `country`, `teamId` y `teamName`; mapa 02 §8). No las habría cazado (X-01, medido por el juez de código, C2): en Zod 4.4.3, `.strict()` solo mira el objeto en que se pone, y las seis claves salen de cada ítem, dentro de `z.array(teamNewsItemSchema)` (`apps/api/src/routes/news.ts` l. 448; `contracts.ts` l. 766-773), así que una clave de más en un ítem pasa y solo una en la raíz falla. Habría que poner `.strict()` en cada objeto de cada esquema, y uno olvidado deja el hueco. El serializador hace lo contrario: parsea la respuesta con el esquema en modo _strip_ y escribe lo que sale, de modo que lo no declarado desaparece a cualquier profundidad (`fastify-type-provider-zod`, `core.cjs` l. 114-120; X-21). Por eso el mecanismo es el serializador, y los esquemas de petición siguen con `.strict()` donde ya lo llevan (`admin.ts` l. 40-47; `broadcast/wire.ts` l. 546) y en los nuevos de E3 (`kitSchema`, §8.1; `planPreviewRequestSchema`, §11.2).

### 13.4 El riesgo del 500 y cómo entra cada ruta

Declarar el esquema de respuesta tiene un coste (O-03): una respuesta que no casa con él da un 500, no un aviso; medido por el juez de código con un `Date` en un `z.string()`. Así que **cada ruta entra con su prueba**: `apps/api/src/responses.test.ts` pide cada ruta del jugador sobre el mundo de los bancos (`spoilerWorld.ts`), con la sesión del jugador y la del mánager, y exige que su respuesta real se serialice sin 500; una ruta sin caso en ese mundo lleva su caso fijo. **Las rutas de la retransmisión van las últimas**: devuelven de 0,87 a 3,8 MB de JSON (`app.ts` l. 194-196), y cuánto tarda el serializador en recorrerlas no está medido. El PR 19a lo mide antes de declararlas; si pasa de 20 ms de p95 (un presupuesto estimado, sin evidencia de los jueces), se declaran con `responseCheck: 'tests'`, que las deja en `frontera.test.ts` y en `responses.test.ts` pero no las serializa en cada petición. **Son tres PR**, en el paso 19 (§17): **19a**, el mecanismo (`response` obligatorio con el esquema de cada ruta, `responses.test.ts`, `frontera.test.ts` con `FRONTERA_SIN_USO`, el canario ampliado; las seis claves de `teams/:id/news` desaparecen con él); **19b**, los atributos y la condición (las seis primeras filas de la lista de arriba); y **19c**, el resto (las tres últimas, `jerseySeed` y la migración `0053_sin_semilla_del_dibujo`, §8.9). Cada uno deja la lista más corta.

### 13.5 El inventario de hoy, con su arreglo

Lo que viaja hoy y la pantalla no enseña, o enseña de otra forma (mapa 02 §8, con su `grep` en `apps/web/src`), con su arreglo (D-55; H-02):

| Ruta y campo                                                                                                        | Hoy, en la web                                                                          | Arreglo                                                                                                             | PR       |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------- |
| `GET /api/riders/:id`, `attributes` con decimales (`contracts.ts` l. 790; `browse.ts` l. 415-420)                   | estrellas (`AttributeList.tsx` l. 115), también en la plantilla (`TeamSquad.tsx` l. 72) | `{ stars }` por atributo, con `starsSchema`; nada más para un ajeno                                                 | 19b      |
| `GET /api/riders/me`, `attributes` (`contracts.ts` l. 79; `db/riders.ts` l. 197-200)                                | estrellas, marca y los cerillos, que calcula la web (`RiderProfile.tsx` l. 213-225)     | `{ stars, mark }` con `starsSchema` y `markSchema`, y `matches` contados en la API                                  | 19b      |
| vista previa, `arrivals[].tsb` y `raceId: null`; `days[]` con `ctl`, `atl`, `tsb`, `tss`; `totalTss`                | nada (`riders.ts` l. 463-477)                                                           | `races[]` y `days[]` de §11.2                                                                                       | 13b      |
| `GET /api/riders/me/form`, `log[]` con `ctl`, `atl` y `tsb` de 90 días                                              | las dos barras de `conditionBars` (`condition.ts` l. 35-42); `atl`, nada                | `{ gameDay, fitness, freshness }` con `barSchema`: `conditionBars` pasa al servidor                                 | 19b      |
| `GET /api/riders/me/trend`, `delta28`                                                                               | la flecha de cinco niveles (`AttributeList.tsx` l. 53-76)                               | `arrow`, con `arrowSchema`                                                                                          | 19b      |
| `GET /api/riders/me/summary`, `morale` con decimales                                                                | `Morale 60%` (`RiderProfile.tsx` l. 273; `Home.tsx` l. 307)                             | `moraleStars`, con `starsSchema` (DD-12, §13.7)                                                                     | 19b      |
| `GET /api/riders/me/coach-view`, `facilities` y `season`                                                            | nada                                                                                    | fuera                                                                                                               | 19c      |
| `fame` en `summary`, `riders/:id`, `countries/:code` y `free-agents`                                                | nada; vale siempre 0                                                                    | fuera                                                                                                               | 19c      |
| `GET /api/riders/me/plan`, `plan.goalRaceId`                                                                        | nada                                                                                    | fuera, hasta que el objetivo tenga control                                                                          | 19c      |
| `plan.startDay`; `upcoming-races.startGameDay`                                                                      | nada                                                                                    | se quedan, porque ahora se pintan: las semanas con sus días (§10.6) y `Day 52 · in 2 days` (pantalla; §10.3, §11.6) | 14 y 15  |
| `GET /api/teams/:id/news`, seis claves de más (`news.ts` l. 448)                                                    | la web las descarta sin saberlo                                                         | las quita el serializador                                                                                           | 19a      |
| `jerseySeed` en los tres contratos de equipo (l. 665, 692 y 718) y en `RiderCard.team` (`broadcast/wire.ts` l. 354) | el dibujo del maillot                                                                   | `kit` (§8.5); en `RiderCard.team`, `legacySeed` solo para lo grabado antes de la traducción (§8.5, 8-f)             | 16b, 19c |

Tras el 19c, la lista está vacía y `FRONTERA_SIN_USO_MAX` vale 0.

### 13.6 Cómo encaja con lo que E2 construyó para el destripe

E2 ya resolvió la otra mitad del problema: **el horizonte decide cuándo** se puede servir un dato nacido de una etapa (el velo, `spoiler.ts`), y **la frontera decide con qué resolución** se sirve cualquier dato. Viven en el mismo sitio y se prueban con lo mismo:

| Pieza                   | E2 (el destripe)                                                             | E3 (la frontera)                                    |
| ----------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| la declaración por ruta | `spoiler` (`safe`, `horizon`, `watch`) y `veil`                              | `response` y `responseCheck`                        |
| la alarma al arrancar   | sin `spoiler`, o con horizonte y sin `veil`, el servidor no arranca          | sin `response`, tampoco                             |
| la tabla literal        | `spoilerRegistry.test.ts` (l. 14-30) compara el registro en los dos sentidos | `frontera.test.ts` recorre los mismos `RouteEntry`  |
| el canario              | testigos de lo velado, barrido de las GET                                    | testigos de números internos, y las POST de lectura |

Un dato puede cumplir una y no la otra: el `delta28` de hoy no destripa nada y rompe la frontera; un resultado velado puede estar en su forma de pantalla y no deber salir aún. Las dos se comprueban en el mismo barrido.

### 13.7 Lo que la pantalla enseña de otra forma

Tres números que hoy se enseñan aunque el SPEC pida otra forma (mapa 02 §8; D-44; O-20): **la frescura**, en `Meter` con su palabra (`conditionLabel`, `condition.ts` l. 48-55: `Excellent`, `Good`, `Fair`, `Low`, `Very low`; `Freshness: low`; pantalla), sin el `16 / 100` de `Home.tsx` l. 354, porque el SPEC la quiere en barra y sin cifra (mapa 04, contradicción 3; [DUEÑO 9], que llegaba a leer «fatiga 118», contado en `docs/entrenamiento.md` l. 1063); **la moral**, según DD-12: por defecto en medias estrellas con `StarRating` (§4.6), que es lo que pide `SPEC.md` l. 85, «vista en estrellas o iconos» ([DOC 12]), en lugar del porcentaje de `RiderProfile.tsx` l. 273 y `Home.tsx` l. 307, que además viaja con decimales; y **el TSS**, que sale de la pantalla y de la API (D-41, §10.7). Si el dueño prefiere la moral en cinco palabras con icono, `moraleStars` pasa a un `z.enum` de cinco códigos; si prefiere el porcentaje, `morale` viaja entera, con `barSchema`, y deja de romper la frontera por sus decimales, no por su forma.

---

**Injertos aplicados.** I-09 (§13.2: `response` obligatorio en el registro de E2, la resolución en el tipo y los tres testigos del canario, el de la moral incluido).

**Objeciones resueltas.** O-03 (§13.4: la prueba de la respuesta real, la retransmisión al final y los tres PR), O-04 (§13.2: `response` en lugar de `exposes`, que no comprobaba nada), O-05 (§13.2: solo las POST de lectura, en una lista cerrada), O-20 (§13.7: la moral, con DD-12 y sus alternativas).

**Huecos rellenados.** H-02 (§13.5: `jerseySeed` sale en el 19c, con `legacySeed` donde se dibuja con ella). Contradicciones de hecho escritas: X-01 (§13.3: `.strict()` solo mira la raíz) y X-21 (§13.2 y §13.3: el serializador quita lo anidado).

**Decisiones de esta sección.**

- 13-a. La flecha cruza con cinco códigos en castellano, `sube_mucho`, `sube`, `igual`, `baja` y `baja_mucho`, como el resto de códigos de juego (§G.1, regla 3), y la pantalla dice `Improving fast`, `Improving`, `Steady`, `Slipping` y `Slipping fast` (`AttributeList.tsx` l. 59-69).
- 13-b. `markSchema` (de 0 a 3) se añade a los tres de D-54, porque la marca de cuarto de banda del corredor propio también es una resolución que tiene que ir en el tipo.
- 13-c. `RESPONSE_EXEMPT` tiene una sola entrada, `/api/auth/*`; la web compilada y las páginas de `spaShell` no son `/api` y no la necesitan.
- 13-d. `CANARY_POST_READS` incluye `POST /api/teams/me/kit/check` desde el 18a, porque también es una lectura por POST.
- 13-e. La lista solo encoge con `FRONTERA_SIN_USO_MAX`, que el 19a fija en 9 (o en lo que encuentre al entrar) y que el 19b y el 19c bajan; un test no puede saber qué PR vendrá, así que el tope se revisa en cada PR.

---

## 14. Lo que E2 dejó a E3

E2 está en producción desde el 10 de octubre de 2026, con el motor v91 (`00-encargo.md` §2): `Watch` (`apps/web/src/pages/StageWatch.tsx`, 1.144 l.) con sus modos, el resumen (`WatchBlocks.tsx` y `broadcast/PlayerControls.tsx`) y `Report` (`StageReport.tsx`). Su §7.9 deja a E3 una interfaz y no un hueco (`docs/retransmision.md` l. 5197-5210): la señal de campeón (§9.1), el dibujo definitivo de los líderes (§9.7), el editor y un vocabulario legible a tamaño pequeño (§8) y «cómo se ven» el rótulo, la barra y la capa fija, que es esta sección. Lo que E3 tiene que respetar lo dice la misma página (l. 5210): la forma además del color, el `aria-label` y el `<title>` con los textos de su §7.1, y `WornJerseyIcon` como único sitio que elige el dibujo de cada `WornJersey`, que §9.10 conserva y amplía con `size` y `surface` (D-31; X-25). Esta sección viste `Watch` y no lo rediseña (D-56), con el norte que le dio el dueño, la televisión ([DUEÑO 21], contado en `docs/agenda.md` l. 505-515), salvo una pieza que cambia por decisión del dueño: la barra de grupos deja de pintar un maillot por corredor, porque ningún maillot baja de 28 px (D-00b, que sustituye a D-21). Las líneas son las de `58c14da`.

| Pieza                                         | Hoy                                                                                                                                                                     | Con E3                                                                                                                                                  | Paso     |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| la cabeza de la etapa                         | miga, flechas, `h1`, ruta, `Share to watch` y pestañas: la capa fija empieza a 328 px (captura 08)                                                                      | una fila de 44 con la carrera y las dos flechas, el `h1` en `title` con la ruta y `share` como icono: empieza hacia los 228 (estimado por telefono §10) | 20       |
| la capa fija                                  | `bg-slate-900`, flechas `amber-300` y `emerald-300` (`FixedOverlay.tsx` l. 40 y 55-60); `aria-live="off"` sin resumen (X-15)                                            | en el ámbito oscuro: km en `display` blanco (15,23), la diferencia en `row`, el icono `trend` en `gold` (6,72) y el resumen accesible de §14.3          | 20       |
| la barra de grupos                            | clases de v3; un maillot de 14 junto a cada nombre (`GroupBar.tsx` l. 204) y uno de 13 por corredor bajo los grupos de 4 a 12 (l. 242)                                  | rótulo en `caption` 600 en versales y filas de 36; un `Kit` de 28 por equipo con su cuenta, y delante los de líder y campeón (§14.4)                    | 17a y 20 |
| el perfil                                     | hexadecimales de v3 y cotas de 8 y 9 px (`ProfileStrip.tsx` l. 63-139, 70 y 161)                                                                                        | tokens y cotas de 12 px (`MIN_FONT_PX`)                                                                                                                 | 20       |
| el rótulo                                     | `bg-red-700`, `bg-slate-900` y `bg-slate-700` (`CueCard.tsx` l. 36-43), maillots de 13 a 16, 72 px reservados (l. 45)                                                   | `bad`, `navy-dark` y `navy` en el ámbito oscuro, maillots de 28 con `surface="dark"`, 88 px reservados y el título más largo en dos renglones (§14.5)   | 17a y 20 |
| la crono, la voz, la crónica y la radio       | maillots de 12 a 16 en línea (`TimeTrialBoard.tsx` l. 86; `VoiceTicker.tsx` l. 78; `ChronicleSentence.tsx` l. 25; `StageStory.tsx` l. 103; `RaceRadioPanel.tsx` l. 210) | a 28 px, en línea con `align-middle`; el renglón crece a 28                                                                                             | 17a      |
| previa, cierre, `Highlights`, digest y mandos | botones con clases propias; dos `primary` en Race Jaén (captura 17)                                                                                                     | `Button` en el ámbito oscuro y un solo `primary` por carrera (§14.6)                                                                                    | 20       |
| `Report`                                      | 11.502 px a 360 (`capturas/README.md`); `Loading…` y `Could not load the report.` (pantalla; `StageReport.tsx` l. 107 y 125)                                            | el resultado primero y una fila de saltos; sus estados, de `QueryView` (§14.6)                                                                          | 10 y 20  |
| la imagen de compartir                        | no hay ninguna (`index.html` l. 1-19)                                                                                                                                   | `og-default.png`, generada (§14.7)                                                                                                                      | 20       |
| la barra inferior en `Watch`                  | a los ocho segundos de `Play` tapa la mitad del comentario (captura 09)                                                                                                 | `useHideBottomNav` si E6 lo acepta, y `--fixed-bottom` (§14.8)                                                                                          | 20       |

### 14.1 Lo que se queda de E2

Se quedan sin tocarse (D-56; O-18): la disposición y el orden de `Watch` (`docs/retransmision.md` §6), sus textos (las palabras de grupo de SPEC §6.15, cuyo test se queda), su ritmo (`overlayHz` y `barHz`), los siete `aria-live` de §1.11 con la política de E2 (la capa fija y la barra no son regiones vivas, l. 12495), la puerta del velo (`VeilNotice.tsx` l. 19-55 y `StageGate.tsx`, que solo toman el aspecto de `Notice`, §4.7) y el reparto congelado: `CastTeam` no cambia, el maillot de cada equipo se resuelve al servir con `kitsOn` y el día de la etapa (§8.5) y el códec de E2 no se toca. Cambia el aspecto, con los componentes de §4 y el ámbito oscuro de §3.3, que llevan la capa fija, el rótulo, `WatchBlocks`, `PlayerControls`, `StagePreviewCards` y `StageClosingCards` (D-04; I-10). Los cuatro tests de E2 que fijan clases se re-sellan contra `data-*` en el PR 20 (`CueCard.test.tsx` l. 34, `GroupBar.test.tsx` l. 82 y 190, `PlayerControls.test.tsx` l. 145 y `StageCards.test.tsx` l. 361), y los casos de `GroupBar.test.tsx` que cuentan un maillot por corredor, en el 17a, con la causa escrita en el test (D-00b; §16.3).

### 14.2 La cabeza de la etapa

```text
(pantalla · Race Valencia, etapa 3 · 360 px; las ciudades, ilustrativas)
 ‹    Race Valencia · Stage 3 of 5    ›         fila de 44: dos Button quiet de 44 × 44 y la carrera
 Stage 3 · Gandia → Alcoi                 [⇪]   h1 en title con StageRoute; share, 44 × 44
 Watch    Report    Classifications             Tabs page, 44
┌─────────────────────────────────────────────┐ capa fija, desde unos 228 px (estimado)
│ 54.3 km to go         +2:14 ▲ on the bunch  │
└─────────────────────────────────────────────┘
```

La fila de 44 sustituye a la miga y a las flechas a `opacity-40` (telefono §10): `chevron-left` y `chevron-right` son `Button` `quiet` de solo icono con `ariaLabel` `Previous stage` y `Next stage` (pantalla), y en la primera y la última etapa el botón que sobra no se pinta y deja su hueco, para que la carrera no se mueva. El nombre de la carrera es un `TextLink` a su ficha. El `h1` va en `title` (18/24, 600) con `StageRoute` (`StageRoute.tsx` l. 10-22, que se queda), y `Share to watch` (pantalla) pasa a `Button` `quiet` con el icono `share` y ese texto en `ariaLabel`. Las pestañas son `Tabs` `page`.

### 14.3 La capa fija y su resumen accesible

`FixedOverlay` (`FixedOverlay.tsx` l. 38-71) lleva `data-surface="dark"` y `bg-surface` (`#0b2740` en el ámbito), `rounded-ui` en lugar de `rounded-xl`: los km en `display` (32/40, 700) blanco, 15,23:1; la diferencia en `row` con `tabular-nums`; la flecha de tendencia, el icono `trend` de 16 px girado hacia arriba o hacia abajo, en `gold` (6,72:1) y con `aria-hidden`, en lugar de los dos colores de hoy (l. 55-60); el `versusText` y la segunda línea (`overlayDetailText`, l. 64-68) en `meta` `ink-2` (9,10:1).

**El resumen accesible** (H-05; X-15: hoy el nombre del botón es su texto visible). El `<button>` gana un `aria-label` con dos frases, que escribe una función pura nueva junto a `overlayDetailText` (`apps/web/src/domain/broadcast/screen.ts` l. 68-93):

```ts
// apps/web/src/domain/broadcast/screen.ts
/** El nombre accesible de la capa fija (docs/retransmision.md §18.8, l. 12495 y 12500): la primera
 *  frase siempre; la segunda, la de overlayDetailText en palabras, salvo en los últimos quietFinalM. */
export declare function overlaySummaryText(
  instant: Instant,
  head: Pick<BroadcastHead, 'cast' | 'profile' | 'weather'>,
): string
```

| En pantalla (hoy)                                      | En el resumen (pantalla)                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `54.3 km`, `800 m`, `3 laps` (`toGoText`)              | `54.3 km to go`, `800 m to go`, `3 laps to go`                                             |
| el grupo de cabeza                                     | `lead group 5 riders`, `lead group 1 rider`; con un solo grupo, `bunch together`           |
| `+2:14 on the bunch` (`mainGapText`, `versusText`)     | `bunch at 2 minutes 14`; por debajo de `sameTimeS`, `bunch at the same time`               |
| `3:12:05 · 42.3 km/h · 6.5% · 18°C · rain · crosswind` | `race time 3 hours 12 minutes, 42.3 km per hour, 6.5 percent, 18 degrees, rain, crosswind` |
| `▲ 0:12 in 5 km` (la tendencia, `up` o `down`)         | `gap up 12 seconds over 5 km`, `gap down 12 seconds over 5 km`                             |

Entera, con la segunda línea (pantalla): `54.3 km to go, lead group 5 riders, bunch at 2 minutes 14. Race time 3 hours 12 minutes, 42.3 km per hour, 6.5 percent, 18 degrees, rain, crosswind, gap up 12 seconds over 5 km.` Una pendiente negativa dice `minus 4 percent`, y lo que `overlayDetailText` no pinta (sin velocidad, sin lluvia) tampoco se dice. **Cuándo se lee**: `aria-live` sigue en `off` (l. 12495), así que se lee al enfocar o tocar la capa, como nombre del botón; se recalcula cuando cambia lo que se pinta (el km con su decimal, el segundo de la diferencia, el tamaño del grupo), con un `useMemo` sobre esas tres cifras, y no a `overlayHz`. `screen.test.ts` gana los casos del último km, del circuito, de un solo grupo, de la misma marca, de la pendiente negativa y de la lluvia con viento.

### 14.4 La barra de grupos y el perfil

La barra (`GroupBar.tsx`): el rótulo de cada grupo en `caption` 600 en versales (`tracking-caps`, con las palabras de E2), filas de `min-h-9` (36) y la diferencia en `meta` `tabular-nums`. **Los maillots** (D-00b; O-12; X-19): doce maillots de 16 px ya medían 280 px y partían en dos renglones a 320 (juez de uso, C7), y a 28 serían 424, más que los 308 útiles a 360; por eso cambian dos cosas, y lo que pidió el dueño se sigue cumpliendo, «cuando se escapan cinco, que se vean sus maillots» ([DUEÑO 3]; `docs/agenda.md` l. 736, transcrito sin sus comillas): cinco de cinco equipos son cinco maillots, y dos del mismo, uno con `×2`. **Un grupo de tres o menos**, que hoy se nombra en su fila con `truncate` (l. 195-212), pone a cada corredor en el orden de D-00c, la `Flag` de `RiderCard.country`, el nombre y su `WornJerseyIcon` de 28, y la fila parte de línea en lugar de cortar ([DUEÑO 17]; §6.4). **Un grupo de 4 a `nameWholeGroupUpTo`** (12), que hoy lleva debajo un maillot de 13 por corredor (l. 225-249), lleva una línea de equipos: primero, aparte, cada corredor que viste un maillot de líder o de campeón, con su `WornJerseyIcon` de 28 y sin cuenta; después, un `Kit` de 28 por equipo presente con su cuenta en `caption` 600 `ink-2` (`×3`, pantalla), de más a menos corredores y, a igualdad, por el dorsal más bajo. Los de delante no cuentan en su equipo, así que las cuentas y los de delante suman el tamaño del grupo. Cada ficha mide unos 48 px (28 del maillot, 4 de hueco y la cuenta) con 8 de separación: caben cinco por renglón en 308 px (estimado), con `TEAM_KIT_LINES_MAX` = 2 renglones; lo que no cabe se cuenta en la última ficha, `+3 teams` (pantalla), y se abre al tocar el grupo, como `+3 groups · 41 riders` (l. 32). Cada ficha es `role="img"` con `aria-label` `Mistral Racing, 3 riders` (pantalla). En el móvil la línea sigue saliendo solo bajo la fila 1 y las del espectador (l. 135), y el grueso no lleva línea, como hoy.

```text
(pantalla · la barra a 360 px, con E3; los nombres, ilustrativos)
 LEAD GROUP · 5                                    rótulo en caption 600 versales, fila de 36
   [Y] [k] ×2  [k] ×1  [k] ×1                      el líder delante; un Kit de 28 por equipo
 CHASE GROUP · 12                          +0:48
   [k] ×3  [k] ×2  [k] ×2  [k] ×1  [k] ×1          cinco por renglón
   [k] ×1  +2 teams                                el segundo renglón y lo que no cabe
 (FR) Luc Martin [k] · (ES) José Quintáns [k]      un grupo de dos, nombrado y sin cortar
 BUNCH · 143                               +2:14   el grueso, sin línea
```

Este cambio entra en el PR 17a, con el `WornJerseyIcon` nuevo, porque `KitSize` no admite 13 ni 14 px y la barra de hoy dejaría de compilar (§17.19); el resto de la barra, en el 20. **El perfil** (`ProfileStrip.tsx` l. 63-139): sus hexadecimales de v3 pasan a utilidades de token (`fill-*` y `stroke-*` de `ink-3`, `line`, `accent` y `gold`), y las cotas, de 9 y 8 px (l. 70 y 161) a 12 px con `tabular-nums`, que es lo que mide la comprobación 3 dentro del SVG. Los maillots en línea de la crono, la voz, la crónica y la radio pasan a 28 con `align-middle`, y su renglón crece a 28; la crono (`TimeTrialBoard.tsx` l. 86) cabe en sus filas de 36.

### 14.5 El rótulo

`CueCard` pinta la clase 3 (la meta, la caza, el corte) de rojo, la 2 de oscuro y el resto más claro (`CueCard.tsx` l. 30-43). Con E3 la tarjeta lleva `data-surface="dark"` y sus tres fondos son `bad` (`#b42318`, blanco encima 6,57:1), `navy-dark` (`#0b2740`, 15,23) y `navy` (`#123a5c`, 11,76) para la clase 1, **y no `ink-2`** como escribía D-56: dentro del ámbito, `ink-2` es blanco al 75 % (§3.3), y un token de tinta nunca es un fondo (decisión 14-a). El texto va en `ink` (blanco); el secundario, en `ink-2` solo sobre `navy` y `navy-dark` (9,10 y 7,36, §3.3), nunca sobre `bad`, donde no está medido. El título, en `caption` 600 en versales; `rounded-ui` en lugar de `rounded-2xl` (l. 47). Los maillots (l. 61, 84, 90, 116 y 122) pasan a 28 por `WornJerseyIcon` con `surface="dark"`, y el del equipo por `wornTeamOf` (§9.10). **El alto reservado** pasa de 72 px (`min-h-[72px]`, l. 45) a 88 (`min-h-22`): el título de 16, dos renglones de 28 con maillot y 16 de relleno (estimado; decisión 14-b), para que la voz siga sin saltar de sitio con cada rótulo; el PR 20 lo mide sobre los casos de `CueCard.test.tsx` y, si un rótulo real mide más, la clase sube a esa altura. **El título más largo** (H-07), `U23 time trial champion of Saint Vincent and the Grenadines` (59 caracteres, [DOC 40]), va en dos renglones a 320 y a 360 px sin cortar el nombre: un caso en `CueCard.test.tsx` (el título entero en el marcado y `data-cue-class` en la tarjeta) y un estado en `/_ui` (`fixtures.ts`), donde la prueba del teléfono mira que no se recorta (comprobación 2) y que su letra no baja de 12 px (comprobación 3). `CueCard.test.tsx` l. 34 se re-sella contra `data-cue-class` y `data-surface`.

### 14.6 La previa, el cierre, `Highlights`, el digest y `Report`

`StagePreviewCards` y `StageClosingCards` (`StageCards.tsx`), `WatchBlocks` (`Highlights` y el digest) y `PlayerControls` pasan al catálogo dentro del ámbito oscuro (O-18): sus botones son `Button` de 44 px, con el `primary` del ámbito (`accent` `#35bdda` y `on-accent` `#0b2740`, 6,85:1), y **un solo `primary` por carrera** (hoy Race Jaén lleva dos, captura 17); los menús que ya existen (`Speed`, `More` y `More controls`, pantalla; `PlayerControls.tsx` l. 144, 177 y 248) llevan el icono `more` y siguen siendo botones con nombre, como fija E2 (§18.8). `StageCards.test.tsx` l. 361 y `PlayerControls.test.tsx` l. 145 se re-sellan contra `data-*`. **`Report`** (`StageReport.tsx`, 141 l.; 11.502 px a 360), la pestaña única que quedó cuando el dueño vio redundantes `Story` y `Result` con `Watch` ([DUEÑO 20], contado en `docs/diseno/e2-retransmision/implementacion.md` l. 9), abre con el resultado en `RankTable` (20 y `Show all`) y, antes de la crónica, una fila de saltos a sus partes en `TextLink` de 44 px, `Result · Classifications · Chronicle` (pantalla; decisión 14-c); la crónica no se recorta. Su `Loading…` y su `Could not load the report.` (l. 107 y 125) pasan a `QueryView` en el PR 10, con `label` `the report`.

### 14.7 La imagen de compartir

`apps/web/public/og-default.png`, de 1.200 × 630 (D-56; I-23): fondo `navy` `#123a5c`, el logotipo de `Logo.tsx` recoloreado en `gold` y blanco, como los iconos de §12.2, y `Cycling Star` en blanco (11,76:1). Es material generado (D-08): la pinta `apps/web/scripts/og-image.mjs` con el Chromium de Playwright, lleva su huella en `generados.test.ts` (§16.2) y el PR 20 adjunta la imagen para que la mire una persona. Hoy no hay ninguna (`index.html` l. 1-19), así que `index.html` gana `<meta property="og:image" content="/og-default.png">` con su ancho y su alto. El service worker no la guarda (`passthrough`, §12.3).

### 14.8 Lo que E3 pide a E6, y lo que no pide

**Pide `useHideBottomNav`** (DD-13), la propuesta de E2 a E6 (`docs/retransmision.md` §18.6, l. 12460-12470), que no existe en el código: esconder la barra inferior en las fases `playing`, `waiting`, `seeking`, `recap` y `arrival`, y devolverla en `preview`, `paused` y `closing`. E3 le da `--fixed-bottom` (§4.9), para que al esconderla también desaparezca el hueco que `main` le reserva. Si E6 no la acepta, la barra se queda y `Watch` reserva `--fixed-bottom` bajo el comentario, que deja de quedar tapado. **No pide la edad en el rótulo** (H-11): la decisión 7-l de E2 la dejaba «si E3 la pide» (l. 5233), y E3 no la pide, porque el rótulo tiene dos renglones a 360 px y la edad no ayuda a entender la carrera en ese momento; la ficha la enseña a un toque (la 7-m de E2). Es de diseño y nadie la mide (D-56, sin evidencia de los jueces).

---

**Injertos aplicados.** I-10 (§14.1, §14.3, §14.5 y §14.6: las piezas de `Watch` en el ámbito oscuro), I-23 (§14.7: `og-default.png`, generada y con huella).

**Objeciones resueltas.** O-12 (§14.4: la objeción era que subir el mínimo cambiaba `Watch`; el dueño lo decidió, D-00b, y la barra pinta un maillot por equipo), O-18 (§14.3 y §14.6: el resumen accesible escrito, y la previa y el cierre vestidos).

**Huecos rellenados.** H-05 (§14.3: la frase y su segunda línea, y cuándo se lee), H-07 (§14.5: el título más largo, en `CueCard.test.tsx` y en `/_ui`), H-11 (§14.8: la edad no va). Contradicciones de hecho escritas: X-15 (§14.3) y X-19 (§14.4).

**Decisiones de esta sección.**

- 14-a. El fondo de la clase 1 del rótulo es `navy`, y no `ink-2`: dentro del ámbito oscuro `ink-2` es blanco al 75 % (§3.3) y la tarjeta tiene que estar en el ámbito para que su texto y el filete de sus maillots sean los oscuros. Cierra la duda de §3. Descartado: sacar `CueCard` del ámbito, que dejaría sus maillots con el filete de fondo claro; y un token nuevo con el `#435266` fijo, que pide su pareja en `tokens.test.ts` para un solo uso.
- 14-b. El rótulo reserva 88 px en lugar de 72, porque con el maillot de 28 un renglón mide 28; el PR 20 lo comprueba con sus casos y lo sube si hace falta.
- 14-c. La fila de saltos de `Report` dice `Result · Classifications · Chronicle`: telefono §10 decía `Story`, que fue el nombre de la pestaña que E2 renombró `Report` (su DD-28).
- 14-d. La barra junta a los corredores por equipo con `TEAM_KIT_LINES_MAX` = 2 renglones, deja delante a los de líder y campeón sin contarlos en su equipo, y nombra a los grupos de tres o menos con bandera, nombre y maillot (D-00c), partiendo de línea en lugar de cortar. Entra en el 17a con el dibujo, no en el 20.
- 14-e. El resumen accesible lo escribe `overlaySummaryText`, pura y junto a `overlayDetailText`, con las mismas piezas en el mismo orden, para que lo que se oye no se separe de lo que se ve.

---

## 15. Constantes y tokens

Esta sección no define nada nuevo: junta en un sitio lo que §3 a §14 fijan, para que quien implemente encuentre cada valor con su intención, su fichero y el paso en que nace. Los tokens se escriben enteros en §3; las constantes, en la tabla de §15.2, que es la única del documento. Dónde vive cada cosa es D-02.

### 15.1 Los tokens

Todos son variables CSS del `@theme` de `apps/web/src/index.css`, sin `inline` (§3.9 lo escribe entero), salvo lo que se dice; Tailwind v4 crea de ahí sus utilidades. `tokens.test.ts` comprueba cada pareja de texto y fondo de §3.1 a §3.3 con la razón WCAG 2.x y falla si un `--color-*` no tiene pareja (§5.5).

| Familia               | Cuántos                                                                                               | Dónde                                         | Sección          |
| --------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------- |
| color                 | 35, de `canvas` a `arrival-rusty`, más los seis `brand-*` heredados, que borra el paso 22             | `@theme`                                      | §3.1             |
| tonos de estado       | 6 (`Tone`), hechos con los de color, cada uno con su icono                                            | `ui/types.ts`                                 | §3.2             |
| el ámbito oscuro      | 13 tokens redefinidos dentro de `[data-surface='dark']`                                               | `index.css`, tras el `@theme`                 | §3.3             |
| letra                 | una familia (la del sistema), tres pesos, siete tamaños con su interlínea y `tracking-caps`           | `@theme`                                      | §3.4             |
| espacio               | `--spacing` de 0,25rem, con los doce pasos de `SPACING_STEPS`                                         | `@theme`; los pasos, en `vocabulario.test.ts` | §3.5, §5.2       |
| radio y sombras       | `radius-ui` (8 px); `shadow-card` y `shadow-bar`                                                      | `@theme`                                      | §3.6             |
| cortes y contenedores | `sm` (40rem) y `lg` (64rem); `page` (72rem) y `form` (28rem)                                          | `@theme`                                      | §3.5             |
| movimiento            | `pulse` y `spin`, que el cierre conserva                                                              | `@theme`                                      | §3.9             |
| densidad              | la variante `fine`, `@media (pointer: fine)`                                                          | `@custom-variant`                             | §3.5, §6.6       |
| iconos                | 24, sobre rejilla de 24 u y en `currentColor`                                                         | `ui/icons.tsx`, generado por `ui-icons.mjs`   | §3.7, §3.8       |
| colores del maillot   | 15 de equipo, 3 de líder y los de campeón: son datos del dibujo, fuera del tema y de `tokens.test.ts` | `packages/shared/src/kit.ts`                  | §8.1, §9.1, §9.7 |

### 15.2 Las constantes

La tabla única (D-02), con las de §G.6 corregidas por D-00b y D-00d a D-00h y las que añadieron las secciones. La columna del paso dice el PR en que nace cada una (§17.2).

| Nombre                                                                                                                                                                                              | Valor                                                                                                                                 | Intención                                                                                                                                                                                                  | Fichero                                                         | §            | Paso      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------ | --------- |
| `PHONE_REF`, `PHONE_MIN`                                                                                                                                                                            | 360 × 800 y 320 × 640, con tacto y relación de píxeles 2                                                                              | dónde se mide un teléfono                                                                                                                                                                                  | `apps/web/e2e/telefono.config.ts`                               | §7.1         | 2         |
| `ANSWER_MAX_TOP_PX`, `THUMB_ZONE`, `TOOL_PAGE_MAX_PX`                                                                                                                                               | 520; 0,4 (el 40 % de abajo); 3.200                                                                                                    | la respuesta arriba, la acción bajo el pulgar y el alto de una herramienta                                                                                                                                 | ídem                                                            | §7.1         | 2         |
| `MIN_FONT_PX`, `MIN_FIELD_FONT_PX`, `MIN_TARGET_PX`, `MIN_INLINE_TARGET_PX`                                                                                                                         | 12, 16, 44 y 24                                                                                                                       | letra, campo y objetivo mínimos (WCAG 2.5.8); la prueba los importa                                                                                                                                        | `apps/web/src/components/ui/constants.ts`                       | §2.5, §6.4   | 2         |
| `KIT_MIN_PX`, `KIT_PX`                                                                                                                                                                              | 28; `{ row: 28, card: 40, team: 48, page: 72, hero: 96 }`, y desde el 17c `showcase: 160` y `poster: 320`                             | nunca un maillot por debajo de 28 (D-00b); los tamaños con nombre; las dos vistas grandes, solo en `/team/identity`, la ficha del equipo y la cabecera de la del corredor (D-00g)                          | `packages/shared/src/kit.ts`                                    | §8.3         | 2 y 17c   |
| `TOP_ROWS`                                                                                                                                                                                          | 20 (ya existe)                                                                                                                        | las 20 primeras filas y `Show all N`                                                                                                                                                                       | `apps/web/src/components/ShowAll.tsx` l. 10                     | §4.5, §6.1   | hoy       |
| `REQUEST_TIMEOUT_MS`                                                                                                                                                                                | 15.000                                                                                                                                | una petición que no contesta se corta y sale como `network`                                                                                                                                                | `apps/web/src/net.ts`                                           | §4.2         | 4         |
| `NAV_TIMEOUT_MS`, `UPDATE_CHECK_MIN_MS`                                                                                                                                                             | 3.000; 1.800.000                                                                                                                      | cuándo la navegación cae a la cáscara (el plugin la inyecta en `sw.js`); cada cuánto se busca versión                                                                                                      | `apps/web/src/net.ts`                                           | §12.3, §12.5 | 5         |
| `INSTALL_HINT_AFTER_SESSIONS`, `INSTALL_SESSION_GAP_MS`                                                                                                                                             | 3; 1.800.000                                                                                                                          | no pedir instalar en la primera visita; una sesión es una carga en frío a 30 min de la anterior                                                                                                            | `apps/web/src/domain/install.ts`                                | §12.6        | 5         |
| `CSS_BLOCKING_MAX_GZ`, `ENTRY_JS_MAX_GZ`, `PRECACHE_MAX_GZ`, `FLAG_SPRITE_MAX`                                                                                                                      | 15 KB, 160 KB, 250 KB y 60 KB                                                                                                         | el presupuesto de peso, con zlib a nivel 9                                                                                                                                                                 | `apps/web/scripts/peso.test.mjs`                                | §12.7        | 6         |
| `SPACING_STEPS`, `ARBITRARY_ALLOWED`                                                                                                                                                                | 0, 0,5, 1, 1,5, 2, 2,5, 3, 4, 6, 8, 12 y 16; los cinco valores de §5.1                                                                | los pasos de espaciado; los arbitrarios que ningún token expresa                                                                                                                                           | `apps/web/src/components/ui/vocabulario.test.ts`                | §3.5, §5.1   | 8         |
| `KEYBOARD_OPEN_RATIO`                                                                                                                                                                               | 0,75                                                                                                                                  | el teclado está abierto si el alto visible baja de esto por el de la ventana                                                                                                                               | `apps/web/src/components/ui/keyboard.ts`                        | §4.9         | 9a        |
| `ARRIVAL_ORDER`                                                                                                                                                                                     | `fundido`, `cargado`, `bien`, `perfecto`, `oxidado`                                                                                   | la escala de llegada, de cansado a fresco                                                                                                                                                                  | `apps/web/src/components/ui/Scale5.tsx`                         | §4.8, §10.4  | 9b        |
| `LOADING_DELAY_MS`, `SLOW_HINT_MS`                                                                                                                                                                  | 300; 8.000                                                                                                                            | el esqueleto que no parpadea; el aviso de red lenta                                                                                                                                                        | `apps/web/src/components/ui/constants.ts`                       | §4.2         | 10        |
| `PREVIEW_RACE_DAY_TSS`, `PREVIEW_RACE_DAY_SAMPLE`, `PREVIEW_WORLD_WINDOW_DAYS`                                                                                                                      | 150 (estimado); 10; 28                                                                                                                | la carga de un día de carrera en la vista previa (D-36, D-37)                                                                                                                                              | `packages/engine/src/constants.ts`                              | §11.3        | 13b       |
| `LOAD_STEPS_TSS`                                                                                                                                                                                    | 0, 25, 80 y 110                                                                                                                       | de `Rest` a `Very hard` (`loadLevelOf`)                                                                                                                                                                    | `packages/shared/src/training.ts`                               | §10.7        | 13b       |
| `PLAN_END_WARN_DAYS`; `TRAINING_WARN_DAYS`                                                                                                                                                          | 7; 2 (ya existe, `dashboard.ts` l. 48)                                                                                                | cuándo avisa la portada del final del plan; de la cola vacía                                                                                                                                               | `apps/web/src/domain/dashboard.ts`                              | §11.7        | 15        |
| `KIT_COLORS`, `KIT_BASES`, `KIT_SECONDARIES`                                                                                                                                                        | los 15 colores con nombre; los 13 de base (sin `yellow` ni `white`); los 15                                                           | el vocabulario cerrado, por nombre (D-00e)                                                                                                                                                                 | `packages/shared/src/kit.ts`                                    | §8.1         | 16a       |
| `KIT_FIGURES`, `KIT_FIGURE_PATHS`, `TORSO`, `COLLAR`                                                                                                                                                | `plain`, `band`, `hoops`, `halves`, `yoke`, `sides` y `sash`; sus regiones en u; la silueta y el cuello de `Jersey.tsx` l. 10-11 y 51 | las siete figuras y el dibujo común, con huella en la tabla de choques                                                                                                                                     | ídem                                                            | §8.1, §8.3   | 16a       |
| `KIT_CHECK_SIZES`, `KIT_MIN_DISTANCE`, `KIT_CONTRAST_MIN`                                                                                                                                           | `[28]`; 10; 20                                                                                                                        | se mide solo a 28; ΔE00 dibujado mínimo entre rivales y con lo reservado, en las cuatro visiones; base contra segundo, en las cinco vistas                                                                 | ídem                                                            | §8.1, §8.2   | 16a       |
| `LEADER_JERSEY`, `LEADER_DOTS`                                                                                                                                                                      | `#facc15` liso; `#16a34a` con banda blanca de 10 u; `#2563eb` con cinco lunares blancos de 4 u en esos centros                        | los tres de líder (D-28)                                                                                                                                                                                   | ídem                                                            | §9.7         | 16a       |
| `LOGO_STAR`, `WORLD_STAR`, `NATIONAL_STAR`, `NATIONAL_FLAG_BOX`                                                                                                                                     | la estrella de `Logo.tsx` l. 30-32; 18 u en (24, 28,5) con filo de 1,5 u; 10 u en (24, 25) con filo de 1 u; el torso a 4:3            | la señal de campeón (D-00d)                                                                                                                                                                                | ídem                                                            | §9.1         | 16a       |
| `CHAMPION_RAINBOW`, `CHAMPION_STAR_EDGE`, `CHAMPION_GOLD`, `CHAMPION_SILVER`                                                                                                                        | seis paradas, de `#e53935` a `#5e35b1`; `#0b2740`; `#e0a526`; `#c0c7d2`                                                               | el espectro en degradado y la estrella del nacional, que el dueño aceptó (D-00f; `00-encargo.md` §7.3); el filo, que añadió el orquestador y el dueño no ha comentado (DD-21); la estrella del continental | ídem                                                            | §9.1         | 16a       |
| `NATIONAL_STAR_OVERRIDES`                                                                                                                                                                           | un ajuste por país, con su porqué: mover la estrella dentro del pecho o cambiarla de color                                            | las banderas que ya llevan una estrella o un emblema donde va la del campeón (Vietnam, China, Marruecos…), revisadas por el dueño en una hoja (D-00f)                                                      | ídem                                                            | §9.1, §9.5   | 16a       |
| `KIT_SPONSOR_TEXT_MIN_PX`                                                                                                                                                                           | 72                                                                                                                                    | por debajo, ninguna letra en un maillot: ni el nombre del patrocinador ni las dos del país del nacional (la letra de 12 px; D-00f, D-00g)                                                                  | ídem                                                            | §9.1, §9.9   | 16a       |
| `KIT_CONFLICTS`, `KIT_ALLOWED`, `KIT_GEOMETRY_HASH`                                                                                                                                                 | una entrada por cada uno de los 1.105 códigos; los 515 permitidos; el SHA-256 de la geometría y de las 138 señales                    | la tabla de choques, generada, que `checkKit` consulta sin rasterizar                                                                                                                                      | `packages/db/src/kitConflicts.generated.ts`                     | §8.4         | 16a       |
| `TEAM_KIT_LINES_MAX`                                                                                                                                                                                | 2                                                                                                                                     | los renglones de equipos bajo un grupo de `Watch`                                                                                                                                                          | `apps/web/src/components/broadcast/GroupBar.tsx`                | §14.4        | 17a       |
| `KIT_CHANGE_COOLDOWN_DAYS`                                                                                                                                                                          | 28 días de juego (DD-09)                                                                                                              | que la afición aprenda el maillot de un equipo                                                                                                                                                             | `packages/shared/src/kit.ts`                                    | §8.7         | 18a       |
| `INTERNAL_NUMBER_NAMES`                                                                                                                                                                             | `ctl`, `atl`, `tsb`, `tss`, `ceiling`, `talent` y `fragility`                                                                         | los nombres que ninguna hoja de respuesta lleva                                                                                                                                                            | `apps/api/src/frontera.ts`                                      | §13.2        | 19a       |
| `FRONTERA_SIN_USO`, `FRONTERA_SIN_USO_MAX`                                                                                                                                                          | las nueve excepciones de §13.2; 9 en el 19a, menos en el 19b y 0 tras el 19c                                                          | la lista de excepciones, que solo encoge                                                                                                                                                                   | ídem                                                            | §13.2        | 19a a 19c |
| `RESPONSE_EXEMPT`; `CANARY_POST_READS`                                                                                                                                                              | `/api/auth/*`; `POST /api/riders/me/plan/preview` y `POST /api/teams/me/kit/check`                                                    | la única ruta sin esquema de respuesta; las POST de lectura que barre el canario                                                                                                                           | `apps/api/src/spoiler.ts`; `apps/api/src/spoilerCanary.test.ts` | §13.2        | 19a       |
| `NATIVE_REVIEW_PHONE_SHARE`, `NATIVE_REVIEW_WEEKS`, `NATIVE_REVIEW_READY_P75_MS`, `NATIVE_REVIEW_INP_P75_MS`, `NATIVE_REVIEW_INSTALL_SHARE`, `NATIVE_REVIEW_PUSH_ACCEPT`, `NATIVE_REVIEW_PUSH_FAIL` | 0,5; 4; 4.000; 300; 0,2; 0,3; 0,1                                                                                                     | la regla que revisa la app nativa (D-52)                                                                                                                                                                   | `apps/api/src/telemetry.ts`                                     | §12.8        | 23        |

**Lo que sale de §G.6.** Por D-00d desaparecen `SASH_PATH` (su `path` es ahora la región de la figura `sash` en `KIT_FIGURE_PATHS`), `SASH_STRIPES`, `CHAMPION_NIGHT`, `CHAMPION_PAPER`, `NATIONAL_SASH_EDGE_U`, `NATIONAL_SASH` y `NATIONAL_SASH_OVERRIDES` con su generador, porque el nacional viste la celda de su bandera del sprite (§9.5). Por D-00b, `KIT_PX` pierde `strip` (13) y el `row` de 16, y `KIT_CHECK_SIZES` deja de medir a 13 y a 16. Por D-00e, `KIT_COLORS` pasa de doce a quince y `KIT_FIGURES` de seis a siete. Por D-00g, `KIT_PX` gana `showcase` (160) y `poster` (320), y `KitSize` con ellos; las vistas de 28 a 96 px enseñan solo el maillot por delante, y la espalda y el culote, con sus zonas de patrocinador, solo salen en las dos grandes (§8, §9.9). Por D-00h, lo reservado incluye los maillots de equipo a menos de `KIT_MIN_DISTANCE` de un nacional, que la tabla de choques marca con su país.

### 15.3 Las que tocan el motor y las que no

**Tres viven en el motor** (D-37; O-09, aceptada entera): `Claude.md` pide que toda constante de juego viva en `packages/engine/src/constants.ts`, y la carga que la vista previa pone a un día de carrera lo es, aunque el motor no la lea. Entran en el PR 13b con su comentario de intención, sin subir `ENGINE_VERSION` (91, l. 853), porque ninguna cambia lo que el motor calcula:

```ts
// packages/engine/src/constants.ts (PR 13b): las lee la vista previa de la API; NI el motor NI el tick.
/** LA CARGA DE UN DÍA DE CARRERA EN LA VISTA PREVIA DEL PLAN (docs/visual.md §11.3; D-36 y D-37).
 *  La vista previa no corre la etapa: le pone la mediana de los últimos PREVIEW_RACE_DAY_SAMPLE días
 *  de carrera del corredor; sin ellos, la de los días de carrera del mundo en los últimos
 *  PREVIEW_WORLD_WINDOW_DAYS; sin nada, esta cifra, estimada (una etapa medida cargó 252,8; mapa 02
 *  §3). Cambiarla no cambia ninguna carrera ni ningún entrenamiento: solo la llegada pronosticada. */
export const PREVIEW_RACE_DAY_TSS = 150
export const PREVIEW_RACE_DAY_SAMPLE = 10
export const PREVIEW_WORLD_WINDOW_DAYS = 28
```

Y su línea en `docs/balance.md`, en el mismo PR, en la entrada de la versión vigente y sin abrir otra: `PREVIEW_RACE_DAY_TSS = 150, PREVIEW_RACE_DAY_SAMPLE = 10 y PREVIEW_WORLD_WINDOW_DAYS = 28 (E3, PR 13b): la carga que la vista previa del plan pone a un día de carrera; no las lee el motor y no suben ENGINE_VERSION.` Como el diff toca `packages/engine/`, el CI corre los ocho tramos de bancos (`.github/workflows/ci.yml` l. 189; unos 73 minutos de pruebas en serie, `docs/retransmision.md` §17.1, regla 4): es el único PR de E3 que los paga (§17.1).

**Las demás no son constantes de juego** y por eso no van al motor (D-02): ninguna la lee la simulación ni el tick al correr una etapa. Las visuales de la web viven en `apps/web/src/components/ui/constants.ts` y las de red en `apps/web/src/net.ts`, y la prueba del teléfono las importa sin copiarlas, junto a las suyas de `apps/web/e2e/telefono.config.ts`. El vocabulario del maillot, sus reglas y sus dibujos de líder y de campeón viven en `packages/shared/src/kit.ts`, en el barril, porque los dibuja la web, los valida la API y los reparte `packages/db`; también `KIT_CHANGE_COOLDOWN_DAYS`, que es una regla del editor que comprueba la API y no algo que el motor simule: en el motor haría pagar los ocho tramos al 16a y al 18a sin que cambie una carrera. `LOAD_STEPS_TSS` es la escala con que la pantalla dice la carga de una sesión del catálogo, y vive junto a ese catálogo (`packages/shared/src/training.ts` l. 53-154). Lo que solo usa el servidor (la tabla de choques, la frontera, el sensor) vive en `packages/db` y `apps/api`, fuera del barril, para que no viaje a la web (H-03).

---

**Injertos aplicados.** Ninguno (§B no asigna ninguno a §15).

**Objeciones resueltas.** O-09 (§15.3: las tres constantes en el motor, con su intención y su línea en `docs/balance.md`, sin subir `ENGINE_VERSION`, y el 13b como único PR que paga los bancos).

**Huecos rellenados.** Ninguno.

**Decisiones de esta sección.**

- 15-a. La tabla dice en qué PR nace cada constante, para que ninguna se escriba dos veces; `KIT_MIN_PX` y `KIT_PX` nacen en el PR 2, porque la comprobación 10 de la prueba los importa de `kit.ts` (§7.1) antes de que exista el vocabulario.
- 15-b. Tres constantes que las secciones escribían como cifra sin nombre lo ganan: `KEYBOARD_OPEN_RATIO` = 0,75 (§4.9), `INSTALL_SESSION_GAP_MS` = 1.800.000 (los 30 minutos de 12-e) y `TEAM_KIT_LINES_MAX` = 2 (14-d).
- 15-c. Los colores del maillot no son tokens: son datos del dibujo que también usa el servidor, y en el `@theme` generarían utilidades que nadie debe usar fuera de `Kit`, `LeaderJersey` y `ChampionJersey`.
- 15-d. Las dos letras del país del nacional (D-00f) y el nombre del patrocinador (D-30) comparten umbral, `KIT_SPONSOR_TEXT_MIN_PX` = 72, porque los dos salen del mismo mínimo de 12 px con letras de unas 8 u; si §9 les da constantes separadas, esta tabla toma las suyas.

---

## 16. Tests y bancos

Esta sección junta las pruebas que piden §3 a §14: qué mide cada una, con qué umbral, dónde corre, cuánto cuesta y en qué PR nace (§17.2). E3 no toca el motor (salvo las tres constantes del 13b, §15.3), así que no añade bancos del motor: sus bancos son el mundo de la prueba del teléfono (§7.2), el mundo de los bancos de E2 (`apps/api/src/__fixtures__/spoilerWorld.ts`), la génesis de producción en PGlite y una temporada entera de noche. Las cifras de coste son estimadas salvo donde se dice; las de telefono, de su §12.

### 16.1 Reglas

1. **Tests primero.** Cada PR empieza por los ficheros de test que lista su paso en §17, con sus casos, y se cierra con `pnpm typecheck`, `pnpm test:rapido` y `pnpm lint` en verde (`package.json` l. 12, 21 y 23) y, si toca `apps/web`, `apps/api` o `packages/db`, con la prueba del teléfono (§7.4). Lo que todavía no puede pasar se escribe igual, como `it.todo` en vitest o `test.fixme` en Playwright, con la cifra medida de hoy en el nombre (la regla 1 de `docs/retransmision.md` §17.1): `test.fixme('recargar sin red da la cáscara (hoy net::ERR_INTERNET_DISCONNECTED, captura 49)')`. Encenderlo es una línea del PR que lo arregla.
2. **`data-*` y ARIA, nunca clases** (D-10). Los tests miran `data-ui`, `data-variant`, `data-state`, `data-answer`, `data-primary-action`, `data-kit`, `data-source`, `data-surface` y `data-cue-class`, el rol y el nombre accesible. Un test que cambia porque E3 cambia a propósito lo que protege se re-sella en el PR que hace el cambio, con la causa escrita en el propio test (§16.3).
3. **Sin DOM.** Los componentes se prueban con `renderToStaticMarkup`, como hoy (mapa 01 §9), un caso por estado y por sus props; la conducta que pide eventos vive en funciones puras que se prueban solas: `isKeyboardOpen`, `errorKindOf`, `sessionStateOf`, `decide`, `overlaySummaryText` y las del cuadro de §10. Lo que solo se ve en un navegador lo mide la prueba del teléfono.
4. **Los dos trinquetes.** `telefono-baseline.json` (§7.4) y `deuda.json` (§5.2) fallan si una cifra sube y también si baja sin que el PR la apunte: bajar una cifra es escribir el test primero, y cada PR de pantalla lo hace.
5. **Dónde corre cada uno** (decisiones 16-a a 16-c). `vitest.config.ts` l. 7 solo recoge `{apps,packages}/*/src/**/*.test.{ts,tsx}`, así que dos ficheros de §12 no correrían con `pnpm test`: el PR 5 añade `'apps/web/sw/**/*.test.ts'` a ese `include` para `apps/web/sw/decide.test.ts`; y `apps/web/scripts/peso.test.mjs`, que necesita `dist/`, no es de vitest: el PR 6 lo lanza con `node --test` en el trabajo `Build` tras `pnpm -r build` (`.github/workflows/ci.yml` l. 261-266), con `node:test` y `node:assert/strict` y sus globales declaradas (`/* global process, console */`) para que pase `eslint .`. Las pruebas de Playwright (`apps/web/e2e/*.spec.ts`) corren con `playwright test` en el trabajo `Teléfono` y en el nocturno. Lo largo de noche sigue la costumbre de E2, un `.long.test.ts` que se salta salvo con `CS_BANCOS=1` (`.github/workflows/cobertura.yml` l. 95-122): el `kitWorld.bench.ts` del glosario se llama `kitWorld.long.test.ts`, porque con el nombre del glosario vitest no lo encontraría.

### 16.2 La tabla de pruebas

| Prueba                                                                                        | Qué mide y con qué umbral                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Corre                                                                              | Coste (estimado)                                        | Paso                   |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------- |
| `apps/web/e2e/telefono.spec.ts`, con `pantallas.ts` y `telefono-baseline.json`                | las diez comprobaciones de §7.1 sobre `/_ui` y las 45 pantallas de `TELEFONO_PANTALLAS`, a 360 × 800 y 320 × 640; ninguna cifra sube sobre la línea base                                                                                                                                                                                                                                                                                                                                                                           | CI, trabajo `Teléfono`, en cada PR que toca `apps/web`, `apps/api` o `packages/db` | de 5 a 7 min y 150 MB de Chromium (telefono)            | 2                      |
| `apps/web/e2e/world/build.mjs`                                                                | el mundo de 50 días con sus cuatro cuentas; falla si un paso no da lo esperado (219 equipos, la toma del equipo en 200)                                                                                                                                                                                                                                                                                                                                                                                                            | CI, cuando cambia la clave de la caché                                             | unos 15 min; 161 MB (medido, §7.2)                      | 2                      |
| `apps/web/e2e/sinred.spec.ts`                                                                 | los cuatro casos de §12.4 (recargar da la cáscara con la cabecera del jugador y nunca `/login`; un trozo sin cargar pinta su `OfflineState` o su `ErrorState` en su sitio; una página vista lleva `OfflineBanner` con la hora; datos sin pedir, `OfflineState`) y una mutación en pausa sigue en la `ActionBar`                                                                                                                                                                                                                    | CI, `Teléfono`                                                                     | 1 min (telefono)                                        | 4; la recarga, 5       |
| `apps/web/e2e/instalable.spec.ts`                                                             | `Page.getAppManifest` sin errores; los iconos, de su tamaño real; `theme-color`; los dos atajos; el service worker activo                                                                                                                                                                                                                                                                                                                                                                                                          | CI, `Teléfono`                                                                     | 20 s (telefono)                                         | 3; el activo, 5        |
| `apps/web/e2e/nocturno.spec.ts`                                                               | primera pintura en frío ≤ 3,0 s, lista en frío ≤ 5,0 y en caliente ≤ 2,0 (3,0 en el plan), con Slow 4G, CPU ×4 y la mediana de cinco, en las cuatro páginas de §7.5; la letra al doble y de lado (§16.5)                                                                                                                                                                                                                                                                                                                           | cada noche, `cobertura.yml`; informa                                               | unos 6 min (telefono)                                   | 2; umbrales, 6         |
| `apps/web/scripts/peso.test.mjs`                                                              | `CSS_BLOCKING_MAX_GZ` (15 KB), `ENTRY_JS_MAX_GZ` (160), `PRECACHE_MAX_GZ` (250) y `FLAG_SPRITE_MAX` (60) sobre `dist/`, con zlib a nivel 9                                                                                                                                                                                                                                                                                                                                                                                         | CI, trabajo `Build`, con `node --test`                                             | 5 s (telefono)                                          | 6                      |
| `apps/web/src/components/ui/generados.test.ts`                                                | cada fichero generado lleva la huella SHA-256 de sus entradas y la recalcula: `icons.tsx`, `flagSprite.generated.ts` y, en `apps/web/scripts/huellas.json`, los PNG de `public/icons/` y `og-default.png` (D-08)                                                                                                                                                                                                                                                                                                                   | CI                                                                                 | 1 s                                                     | 3; crece en 6, 9a y 20 |
| `apps/web/src/tokens.test.ts`                                                                 | cada pareja de §3.1 a §3.3 a 4,5:1 (texto), 3:1 (borde y tramo) o 3,0 (deshabilitado), en los dos ámbitos; cada `--color-*` con su pareja; el ΔE00 entre los tonos, informado y sin umbral (H-18)                                                                                                                                                                                                                                                                                                                                  | CI                                                                                 | 1 s (telefono)                                          | 7                      |
| `packages/shared/src/colorMath.test.ts`                                                       | `wcagContrast`, `simulateCvd` y `deltaE00` contra valores dorados de colour-science 0.4.7, a 0,01 (I-31)                                                                                                                                                                                                                                                                                                                                                                                                                           | CI                                                                                 | 1 s                                                     | 7                      |
| `apps/web/src/components/ui/vocabulario.test.ts`, con `deuda.json`                            | por fichero, `tema`, `arbitrarios`, `espaciado` y `layout` (§5.2); ninguna cifra sube y bajar se apunta; las dos sondas (`bg-surface` resuelve; `bg-indigo-600` no resuelve con el cierre) (I-01)                                                                                                                                                                                                                                                                                                                                  | CI                                                                                 | unos 10 s (dos sistemas de diseño sobre 146 ficheros)   | 8                      |
| `ui/1` a `ui/10` (`apps/web/eslint-ui.mjs`) y `apps/web/src/components/ui/heredados.test.ts`  | las diez reglas de §5.3, en `error` para todo fichero nuevo y en `warn` para los de `UI_HEREDADOS`; la lista solo encoge                                                                                                                                                                                                                                                                                                                                                                                                           | CI, `pnpm lint` y la rápida                                                        | lo que ya cuesta el lint, más unos 20 s                 | 8                      |
| `apps/web/src/components/ui/*.test.tsx`                                                       | cada estado de cada componente de §4 con su `data-state` y su ARIA, el porqué del deshabilitado y el texto obligatorio de `Chip` y `Notice` (I-03); `ActionBar.test.tsx`, con `isKeyboardOpen` a alturas simuladas                                                                                                                                                                                                                                                                                                                 | CI                                                                                 | segundos                                                | 9a, 9b, 10 y 11        |
| `apps/web/sw/decide.test.ts`                                                                  | un caso por fila de la tabla de §12.3 y cuatro bordes, los cuatro `passthrough`: `/api` a secas, `/health?x=1`, un `POST` a `/assets/x.js` y un `/assets/x.js` de otro origen                                                                                                                                                                                                                                                                                                                                                      | CI, con el `include` ampliado                                                      | menos de 1 s                                            | 5                      |
| `apps/web/src/net.test.ts` y `queryClient.test.ts` (ampliado)                                 | `sessionStateOf`: un 200 con `null` o un 401 dan `signed-out`, datos dan `signed-in`, un fallo de red da `unknown`; la marca `cs:signed-in`; con `unknown`, `HorizonWatcher` no vacía nunca la caché (X-04)                                                                                                                                                                                                                                                                                                                        | CI                                                                                 | menos de 1 s                                            | 4                      |
| `apps/web/src/domain/install.test.ts`                                                         | una sesión es una carga en frío a más de 30 min de la anterior; `InstallHint`, en la tercera y nunca antes; cerrado, no vuelve                                                                                                                                                                                                                                                                                                                                                                                                     | CI                                                                                 | menos de 1 s                                            | 5                      |
| `apps/api/src/app.test.ts` y `apps/api/src/routes/yesterday.test.ts` (ampliados)              | `/sw.js` con `no-cache`; `/health` con `webBuild`, y su `.omit` en `yesterday.test.ts` (la regla 8 de E2)                                                                                                                                                                                                                                                                                                                                                                                                                          | CI                                                                                 | segundos                                                | 5                      |
| `packages/db/src/jerseyClone.test.ts`                                                         | la reproducción del mapa 03 §2.2: con dueño, la candidata 3 y un tick, siguen 219 equipos y 3.900 corredores y el dibujo servido es el elegido; el equipo con la semilla cambiada que pierde su dueño ni se poda ni se renombra; `teamIndexFromSeed` da `null` fuera de la génesis                                                                                                                                                                                                                                                 | CI                                                                                 | unos 30 s (una génesis en PGlite y un tick)             | 1                      |
| `packages/db/src/migrations.test.ts`, `schema.test.ts` y `columnasVivas.test.ts` (existentes) | cada migración aplica limpia; toda columna numérica con defecto tiene escritor; y el trabajo `Migraciones (base vacía)` (`ci.yml` l. 268-297) las aplica dos veces                                                                                                                                                                                                                                                                                                                                                                 | CI                                                                                 | lo de hoy                                               | 1, 13a, 16a, 19c y 23  |
| `packages/shared/src/trainingDay.test.ts`                                                     | la tabla de los tres modos por los siete orígenes de `resolveTrainingDay`                                                                                                                                                                                                                                                                                                                                                                                                                                                          | CI                                                                                 | menos de 1 s                                            | 13a                    |
| `packages/db/src/trainingDay.diff.test.ts`                                                    | el tick elige la misma sesión y la misma intensidad con `resolveTrainingDay` que con la cadena congelada, corredor a corredor y día a día durante 28 días, en el mundo de los bancos (en el trabajo `Teléfono`, también en el de la prueba); una sola diferencia y el PR no entra                                                                                                                                                                                                                                                  | CI                                                                                 | 20 s (telefono)                                         | 13a                    |
| `packages/db/src/planPorBloques.test.ts` (ampliado)                                           | guardar el día 100 y otra vez el 110 deja una fila, con `startDay` 101; con `startFresh`, la del 111; la pantalla y el tick leen la misma                                                                                                                                                                                                                                                                                                                                                                                          | CI                                                                                 | segundos                                                | 13a                    |
| `apps/api/src/routes/planPreview.test.ts`                                                     | una llegada por carrera, la de su salida; las semanas desde el `startDay` del plan vivo; el modo y las órdenes de la pantalla; el viaje a 15; el primer día desde el último diario; la carrera en curso con `arrival: null`; ningún `ctl`, `atl`, `tsb` ni `tss` en la respuesta                                                                                                                                                                                                                                                   | CI                                                                                 | unos 10 s                                               | 13b                    |
| `apps/api/src/routes/planPreviewDiary.test.ts`                                                | el acuerdo entre la llegada proyectada y la del diario real (la fracción de carreras en el mismo tramo), con trinquete en el valor medido (H-20)                                                                                                                                                                                                                                                                                                                                                                                   | CI                                                                                 | unos 30 s (deja correr al tick)                         | 13b                    |
| `apps/web/src/domain/trainingPlan.test.ts` (nuevo)                                            | las funciones puras del cuadro: la consecuencia de la `ActionBar`, el resumen de la tira, la carga del mes, la línea de la regla por modo y el destino de `↺ Back to …` (§10.5 a §10.9)                                                                                                                                                                                                                                                                                                                                            | CI                                                                                 | menos de 1 s                                            | 14                     |
| `apps/web/src/domain/dashboard.test.ts` (ampliado)                                            | un caso por fila de §11.7, y quien tiene sus bloques no ve la cola vacía (O-22)                                                                                                                                                                                                                                                                                                                                                                                                                                                    | CI                                                                                 | menos de 1 s                                            | 15                     |
| `packages/shared/src/kit.test.ts`                                                             | trazo mínimo de 6 u (3,50 px a 28); ninguna figura con lunares ni estrella; los quince colores a 12,3 o más en las tres dicromacias y a 10 o más en las cuatro visiones; `kitCode` y `parseKit` de ida y vuelta; `canonicalKit` de `halves`                                                                                                                                                                                                                                                                                        | CI                                                                                 | 2 s (telefono)                                          | 16a                    |
| `packages/db/src/kitDistance.test.ts`                                                         | 50 pares fijos a 0,5 o menos del script de Python (`mapas/03-maillots-medida.py`)                                                                                                                                                                                                                                                                                                                                                                                                                                                  | CI                                                                                 | unos 5 s                                                | 16a                    |
| `packages/db/src/kitConflicts.test.ts`                                                        | la huella casa con la geometría; 50 entradas de una semilla fija, recalculadas (I-07); de noche, la tabla entera regenerada es idéntica                                                                                                                                                                                                                                                                                                                                                                                            | CI; de noche, con `CS_BANCOS=1`                                                    | 5 s; de noche, de 1 a 2 min (§8.4)                      | 16a                    |
| `packages/db/src/champion.test.ts`                                                            | las 138 señales a 10 o más de todo maillot permitido y de los tres líderes, en las cuatro visiones a 28 px, con los grises escritos; las señales entre sí, con la lista de pares por debajo de 10 (Indonesia y Mónaco); la distancia a la marca de la UCI, que no baja de la medida (12,7 el mundial en visión normal); **`NATIONAL_STAR_OVERRIDES`**, cada país con su porqué y su caso (D-00f); y **la reserva de D-00h**: todo maillot de equipo a menos de 10 de un nacional está reservado en la tabla de choques con su país | CI                                                                                 | unos 10 s                                               | 16a                    |
| `packages/db/src/seasonRivals.test.ts`                                                        | los rivales coinciden con los campos que congela el tick en el mundo de los bancos; su coste, y la memoria por mundo y día si pasa de 100 ms                                                                                                                                                                                                                                                                                                                                                                                       | CI                                                                                 | unos 10 s                                               | 16a                    |
| `packages/db/src/kits.test.ts`                                                                | **la puerta de D-00e**: en la génesis, 0 carreras de la temporada 0 con un par por debajo de 10 a 28 px en las cuatro visiones y 0 pares de maillots canónicos iguales; escribe los grises, los permitidos, los que conservan su color base y, por color y por figura, cuántas carreras fallarían sin él; dos guardados del mismo maillot a la vez dan un `KitTakenError`; el NPC cede                                                                                                                                             | CI                                                                                 | 30 s (telefono), más la traducción, de 35 a 70 s (§8.6) | 16a                    |
| `apps/web/src/components/ui/Kit.test.tsx` y `ChampionJersey.test.tsx`                         | **las tres vistas** (D-00g): de 28 a 96 px solo se pinta el maillot por delante; en `showcase` y `poster`, delante, detrás y el culote, cada zona de patrocinador en su caja; **ningún nombre de patrocinador ni ninguna letra del país se pinta donde su letra mediría menos de 12 px** (por debajo, la zona es un bloque de su color o no se pinta); las dos letras del país, solo en el nacional y desde 72 px; el mundial, sin letras; `data-kit` en cada `<svg>`                                                              | CI                                                                                 | segundos                                                | 17a; las vistas, 17c   |
| `packages/db/src/kitWorld.long.test.ts`                                                       | una temporada entera: 0 pares por debajo de 10 entre rivales con un NPC; los choques entre humanos, contados                                                                                                                                                                                                                                                                                                                                                                                                                       | de noche, `CS_BANCOS=1`                                                            | sin medir                                               | 17b                    |
| `apps/api/src/routes/kit.test.ts`                                                             | cada código de `PUT /api/teams/me/kit` en su orden (429 `kit_reciente`, 400 `kit_igual`, 400 `kit_contraste`, 409 `kit_reservado`, también por una bandera, `champion:MA`, 409 `kit_ocupado`, 409 `kit_se_confunde`; y 401 y 409 `sin_equipo`); el veredicto con equipo y visión; `GET /api/teams/me/kit`; la reversión de E9                                                                                                                                                                                                      | CI                                                                                 | unos 10 s                                               | 18a                    |
| `apps/api/src/spoilerRegistry.test.ts` (ampliado)                                             | la lista literal de rutas gana las de E3: `GET` y `PUT /api/teams/me/kit`, `POST /api/teams/me/kit/check`, `POST /api/admin/teams/:id/kit/revert`, `POST /api/telemetry/vitals` y `GET /api/admin/telemetry`                                                                                                                                                                                                                                                                                                                       | CI                                                                                 | igual que hoy                                           | 18a y 23               |
| `apps/api/src/frontera.test.ts`                                                               | ninguna hoja de respuesta con un nombre de `INTERNAL_NUMBER_NAMES` ni un `attributes` de números; cada hoja, leída en `apps/web/src` o en `FRONTERA_SIN_USO`; falla si una excepción sobra                                                                                                                                                                                                                                                                                                                                         | CI                                                                                 | 10 s (telefono)                                         | 19a                    |
| `apps/api/src/responses.test.ts`                                                              | cada ruta del jugador serializa su respuesta real del mundo de los bancos sin 500, con la sesión del jugador y la del mánager (O-03)                                                                                                                                                                                                                                                                                                                                                                                               | CI                                                                                 | unos 20 s                                               | 19a                    |
| `apps/api/src/spoilerCanary.test.ts` (ampliado)                                               | los testigos 63,4172 (`rider_attrs`), 61,98765 (el `ctl` del diario) y 57,31415 (la moral) no salen en ninguna respuesta; barre las GET y `CANARY_POST_READS`                                                                                                                                                                                                                                                                                                                                                                      | CI                                                                                 | lo de hoy, más unos segundos                            | 19a                    |
| `apps/web/src/domain/broadcast/screen.test.ts` (ampliado)                                     | `overlaySummaryText` en los casos de §14.3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | CI                                                                                 | menos de 1 s                                            | 20                     |
| `apps/web/src/components/broadcast/CueCard.test.tsx` (ampliado)                               | el título más largo, `U23 time trial champion of Saint Vincent and the Grenadines`, entero en el marcado (H-07), y `data-cue-class` y `data-surface` en la tarjeta                                                                                                                                                                                                                                                                                                                                                                 | CI                                                                                 | menos de 1 s                                            | 20                     |
| `apps/api/src/telemetry.test.ts`                                                              | el sensor agrega por día sin IP, sin cuenta y sin la URL; los tramos y su p75; `nativeReviewVerdict` en cada una de sus ramas                                                                                                                                                                                                                                                                                                                                                                                                      | CI                                                                                 | unos 5 s                                                | 23                     |

**El coste de un PR**, sumado: lo de hoy (`typecheck` y la rápida, que E2 midió en 37,4 s y de 529 a 562 s, `docs/retransmision.md` §17.1, regla 5) más la prueba del teléfono en los que tocan `apps/web`, `apps/api` o `packages/db` (de 5 a 7 min, DD-16) y, en los que cambian la clave del mundo (`packages/db/drizzle/**` o `packages/engine/src/**`: los PR 13a, 13b, 16a, 19c y 23), unos 15 min más para reconstruirlo. Lo que E3 añade a la rápida son segundos, salvo `kits.test.ts`, `jerseyClone.test.ts` y los dos de la vista previa, que montan mundos en PGlite (de 1,5 a 2,5 min entre los cuatro, estimado).

### 16.3 Los re-sellos

D-10. Cada uno en el PR que cambia lo que protege, con la causa escrita en el test:

| Test                                                                                                                      | Qué fija hoy                                                        | A qué pasa                                                                           | Paso      |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------- |
| `apps/web/src/components/stageRoute.test.tsx` l. 19                                                                       | una clase                                                           | `data-ui` y el texto de la ruta                                                      | 12b       |
| `apps/web/src/domain/riderResults.test.ts` l. 112-119                                                                     | `placeTone` devuelve una clase                                      | `placeTone` devuelve un `Tone`                                                       | 12b       |
| `apps/web/src/pages/stageTables.test.tsx`                                                                                 | el maillot en cada fila, por etiqueta exacta (X-13)                 | no se re-sella: sigue pasando con `RankTable` y con el maillot de 28                 | 12b y 17a |
| `apps/web/src/components/leaderJerseys.test.tsx` l. 28-88                                                                 | la banda del verde de 7 u en `#bbf7d0` y lunares de 3,4 u           | banda blanca de 10 u y lunares de 4 u; l. 81-88 sigue sellando que no hay dorsal     | 17a       |
| `apps/web/src/components/broadcast/GroupBar.test.tsx`, los casos del maillot por corredor                                 | un `WornJerseyIcon` de 13 por corredor bajo los grupos de 4 a 12    | un `Kit` de 28 por equipo con su cuenta y, delante, los de líder y campeón (D-00b)   | 17a       |
| `GroupBar.test.tsx` l. 82 y 190; `CueCard.test.tsx` l. 34; `PlayerControls.test.tsx` l. 145; `StageCards.test.tsx` l. 361 | clases de v3                                                        | `data-*`: `data-cue-class` y `data-surface` en el rótulo, `data-state` en los mandos | 20        |
| `packages/shared/src/training.test.ts` l. 32-55                                                                           | `defaultCoachPlan`, que solo usaba la web (`trainingPlan.ts` l. 37) | se borran con la función, que el 14 deja sin ningún uso                              | 14        |

Los textos que cambia el examen (§10.11 y §11.7) no los fija hoy ningún test de la web (buscado: ningún `.test.` de `apps` ni `packages` contiene `You'll arrive`, `Save day edits`, `training queue is empty` ni `TSS over four weeks`), así que no hay re-sello: los fijan los tests nuevos del 14 y el 15.

### 16.4 Lo que se mide antes de escribir el código

Lo que el diseño deja sin medir tiene dueño y paso, y el PR que lo mide escribe la cifra en su descripción y en su test:

| Qué                                                           | Quién lo mide, y dónde queda                                                                                                                   | Paso      |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| el tamaño del mundo en la caché y su tiempo de restauración   | el PR 2, en `actions/cache` (el volcado pesa 161 MB, medido por el redactor de §7)                                                             | 2         |
| `sideEffects: false` en `packages/shared` (H-03)              | `peso.test.mjs`: entra solo si `request.js` suelta los 42 KB de `broadcast/*` y `pnpm test` sigue en verde                                     | 6         |
| los rótulos de la barra inferior a 320 con la letra del CI    | la comprobación 2; si corta uno, el plan B de §6.3 en el mismo PR                                                                              | 11        |
| el acuerdo de la carga de carrera con el diario (H-20)        | `planPreviewDiary.test.ts`, que fija su trinquete en lo medido                                                                                 | 13b       |
| las carreras con el vocabulario de siete figuras (O-25)       | `kits.test.ts`, la puerta: §8 midió la paleta y lo permitido a 28 px (515 y 482 distintos), y faltan las 310 carreras con la traducción        | 16a       |
| la señal contra el vocabulario y la tabla de ajustes          | `champion.test.ts`: §9 midió la marca (12,7 el mundial) y los 21 maillots frente a 17 nacionales; faltan las 138 con `NATIONAL_STAR_OVERRIDES` | 16a       |
| el coste de `seasonRivals` y el tamaño de la tabla de choques | `seasonRivals.test.ts` (si pasa de 100 ms, memoria) y el PR, con el `.ts` generado (si pasa de 1 MB, JSON al lado)                             | 16a       |
| el primer tick con la traducción                              | `kits.test.ts` en PGlite (de 35 a 70 s estimados) y la descripción del PR 17b                                                                  | 16a y 17b |
| la serialización de la retransmisión                          | el PR 19a, antes de declarar sus rutas; por encima de 20 ms de p95, `responseCheck: 'tests'`                                                   | 19a       |
| el alto del rótulo con maillots de 28                         | el PR 20 sobre los casos de `CueCard.test.tsx` (88 px estimados, §14.5)                                                                        | 20        |

### 16.5 Lo que corre cada noche

Un trabajo nuevo de `.github/workflows/cobertura.yml`, `Teléfono de noche`, a la hora del nocturno de hoy (`15 4 * * *`, l. 26), con el mundo de la caché y `playwright test --project=nocturno`, lanza `apps/web/e2e/nocturno.spec.ts` con tres pasadas que informan y no paran ningún PR (D-19; D-50, que llamaba a este fichero `rendimiento.spec.ts`: manda el nombre del glosario, decisión 16-d):

1. **El rendimiento**, con los umbrales de §16.2 sobre la portada del jugador, la del visitante, el plan y `Watch`.
2. **La letra al doble** (H-17): las 45 pantallas y `/_ui` a 360 × 800 con la letra raíz al 200 %, con las comprobaciones 1 y 2. En `/_ui` está el estado del rótulo con el título más largo de H-07, así que cada noche se ve si sus dos renglones aguantan la letra al doble sin recortarse.
3. **De lado** (H-16): las 45 a 800 × 360 con la comprobación 1.

En el trabajo `Bancos de noche (E2)` (`cobertura.yml` l. 104-122), dos pasos más con `CS_BANCOS=1`: `packages/db/src/kitWorld.long.test.ts` (una temporada entera, §16.2) y `kitConflicts.test.ts` con la tabla de choques regenerada entera. Un rojo de noche no para ningún PR, pero se mira por la mañana: el de `kitWorld.long.test.ts` quiere decir que la previsión de rivales se ha quedado corta y que el NPC no ha cedido a tiempo.

---

**Injertos aplicados.** I-01 (§16.2: `vocabulario.test.ts`, `deuda.json` y `ui/1` a `ui/10`), I-03 (§16.1 y §16.2: `data-*` en los tests de componentes; los re-sellos, §16.3), I-04 (§16.2 y §16.5: la prueba sobre `/_ui` en cada PR y el rendimiento cada noche), I-07 (§16.2: `kitConflicts.test.ts` con su huella), I-31 (§16.2: `colorMath.test.ts` con los valores dorados).

**Objeciones resueltas.** O-25 (§16.4: el vocabulario de siete figuras, medido a 28 px por §8, y las carreras en la puerta de `kits.test.ts`).

**Huecos rellenados.** H-07 (§16.2: el caso de `CueCard.test.tsx`; §16.5: el mismo título con la letra al doble), H-20 (§16.2 y §16.4: `planPreviewDiary.test.ts` con su trinquete).

**Decisiones de esta sección.**

- 16-a. `apps/web/sw/decide.test.ts` se queda junto a `decide.js` y el PR 5 amplía el `include` de `vitest.config.ts` l. 7 con `'apps/web/sw/**/*.test.ts'`. Descartado: mover el test bajo `src/`, lejos de lo que prueba.
- 16-b. `peso.test.mjs` corre con `node --test` en el trabajo `Build`, después de `pnpm -r build`, porque mide `dist/`; vitest no lo recoge ni debe recogerlo.
- 16-c. El banco nocturno del maillot se llama `kitWorld.long.test.ts` y se salta sin `CS_BANCOS=1`, como `timelineCollector.long1.test.ts` de E2; con el nombre de §G.10, `kitWorld.bench.ts`, vitest no lo encontraría.
- 16-d. La prueba de cada noche es `nocturno.spec.ts`, el nombre del glosario que usan §7 y §12; D-50 la llamaba `rendimiento.spec.ts`. Lleva el rendimiento, la letra al doble y la pasada de lado.
- 16-e. Una sola prueba de huellas para lo generado de la web, `generados.test.ts`, con las de los PNG en `apps/web/scripts/huellas.json`, porque un PNG no tiene cabecera donde escribirla.
- 16-f. `champion.test.ts` va en `packages/db`, junto a `drawnDistance` (9-h), y fija también la tabla de ajustes por país y la reserva de D-00h.
- 16-g. Las tres vistas del maillot y el mínimo de 12 px de toda letra en un maillot se prueban en `Kit.test.tsx` y `ChampionJersey.test.tsx`, y en pantalla los vigila la comprobación 3, que ya mide el texto de los SVG.

---

## 17. El plan por PR, tests primero

Esta sección ordena en veinticuatro pasos y cuarenta y dos PR todo lo que §1 a §16 piden construir, y para cada PR dice qué entra, qué tests se escriben antes que el código, de qué depende, cuánto cuesta, qué ve el dueño al acabarlo y con qué se revierte. No añade piezas: cada fichero, función, test y migración que nombra está en la sección que se cita, y donde las secciones no decían en qué PR entra una pieza, o lo decían de dos maneras, lo decide aquí con su motivo (bloque final, 17-a a 17-q). Escribe como hechos D-32 (el paso 1), D-57 (el plan) y D-58 (el paso 24), con D-00b a D-00h. La base es el plan de telefono §13 (18 pasos y unos 22 PR), con la cola larga de sistema §13, paso 16 (I-02, O-07), el relleno del maillot en el tick de identidad (I-05), la frontera en tres PR (O-03) y las vistas grandes del maillot que pidió el dueño (D-00g). Los nombres de los pasos son los de §G.11. Las líneas citadas son las de `58c14da`; si al implementar una se ha movido, manda el nombre del símbolo.

### 17.1 Reglas del plan

1. **Tests primero.** Cada PR empieza escribiendo los tests que su subsección lista, con los casos que se dicen, y se cierra con `pnpm typecheck`, `pnpm test:rapido` y `pnpm lint` en verde (`package.json` l. 12, 21 y 23) y con la prueba del teléfono si toca `apps/web`, `apps/api` o `packages/db` (§7.4). Lo que aún no puede pasar se escribe como `it.todo` o `test.fixme` con la cifra de hoy en el nombre (§16.1, regla 1). Un test que cambia porque E3 cambia a propósito lo que protege se re-sella en ese PR con la causa escrita (§16.3).
2. **Un PR por fila de §17.2**, en el orden de §17.27. Tamaños: S hasta 300 líneas de diff, M hasta 800, L más (los de E2). La descripción de cada PR lleva las cifras que su paso mide (§16.4), las bajadas de `telefono-baseline.json` y de `deuda.json` que consigue, la lista de lo que re-sella y el valor por defecto de cada decisión del dueño que toca (§19.5).
3. **`ENGINE_VERSION` no se mueve** (91, `packages/engine/src/constants.ts` l. 853). El único PR que toca `packages/engine/` es el 13b, con tres constantes que el motor no lee (D-37), y por eso es el único que paga los ocho tramos de bancos que el CI lanza con ese diff (`.github/workflows/ci.yml` l. 189; unos 73 minutos de pruebas en serie, `docs/retransmision.md` §17.1, regla 4). Un PR de E3 que necesite subirla está mal hecho y se para.
4. **Las migraciones**, solo con `drizzle-kit generate --name <nombre>` (la `0051`, con `--custom`), en el PR de su escritor, y nunca se revierten. Hoy la última es la `0049_rastro_de_etapa` (`packages/db/drizzle/meta/_journal.json`, 50 entradas), así que las cinco de E3 son, sin huecos: **`0050_semilla_del_dibujo`** (PR 1), **`0051_un_plan_vivo`** (13a), **`0052_equipaciones`** (16a, con `team_kits`, `kit_set_by` y el índice único `teams_world_kit_uidx` de §8.5), **`0053_sin_semilla_del_dibujo`** (19c) y **`0054_telemetria`** (23). Para que drizzle-kit les dé esos números, **los cinco PR con migración se fusionan en ese orden** aunque el grafo permita adelantar alguno (17-a); si otra línea toma antes un número, manda el nombre, como en E2. Las aplica el trabajo `Migraciones (base vacía)` del CI, dos veces (`ci.yml` l. 268-297), y `columnasVivas.test.ts` pide escritor a toda columna numérica con defecto.
5. **El juego queda desplegable en Railway tras cada PR** y mejor que antes. Hasta el paso 22 todo lo de hoy sigue resolviendo (D-14). E3 no tiene interruptores, así que lo que un PR cambia lo ven todos al desplegarlo; por eso cada PR dice lo que ve el dueño, que es lo que ve cualquiera, y con qué se revierte: un revert si basta, y si no, lo que deshace lo que el revert no alcanza (el service worker del 5, las filas del 17b).
6. **La web de ayer.** `apps/api/src/routes/yesterday.test.ts`, de E2, fija las claves de los esquemas que lee una pestaña vieja; todo PR que ensancha uno le pone su `.omit` (la regla 8 de E2): el 5 (`webBuild` en `/health`) y el que más tarde toque otro de su lista.
7. **El coste de CI** (DD-16): la prueba del teléfono suma de 5 a 7 minutos a cada PR que toca `apps/web`, `apps/api` o `packages/db`, y 150 MB de Chromium en la caché; el mundo de la prueba (161 MB) se reconstruye, unos 15 minutos, cuando cambia `packages/db/drizzle/**`, `packages/engine/src/**` o `build.mjs`, es decir en los PR 13a, 13b, 16a, 19c y 23 (y en el 1, si se fusiona después del 2).
8. **Los trinquetes y el final** (D-57): `telefono-baseline.json` nace en el PR 2 y `deuda.json` en el 8, y los dos solo bajan; E3 está terminado cuando la línea base está a cero, `deuda.json` ha desaparecido y la prueba del dueño en su teléfono ha pasado (§17.28).
9. **Lo generado** (D-08): el PR que introduce un fichero generado lleva en su descripción la hoja de contactos que revisa una persona (los iconos en el 3 y el 9a, el sprite en el 6, la tabla de choques y **la hoja de los 133 maillots nacionales en el 16a**, que el dueño mira una vez, D-00f; la imagen de compartir en el 20).
10. **Dos agentes a la vez como mucho** (`00-encargo.md` §5), y nunca en los mismos ficheros: el grafo de §17.27 dice qué caminos pueden ir en paralelo.

### 17.2 La tabla de pasos

| Paso · PR      | Qué entra                                                                                        | Tests primero                                                                                                            | Depende de              | Tam.              | Ve el dueño                                                        | Se revierte con                     |
| -------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ----------------- | ------------------------------------------------------------------ | ----------------------------------- |
| 1 · 1          | el clon: `0050`, la semilla del dibujo aparte, `teamIndexFromSeed`                               | `jerseyClone.test.ts`                                                                                                    | nada                    | S                 | cambiar el maillot ya no crea un equipo clon; cuántos clones hay   | revert; la `0050` es inerte         |
| 2 · 2          | Playwright y axe-core; el mundo; las 45 pantallas; las diez comprobaciones; la línea base de hoy | `telefono.spec.ts` con su página de control                                                                              | nada                    | M                 | nada en el juego; las faltas de hoy, en el PR                      | revert                              |
| 3 · 3          | manifiesto, iconos, `favicon.svg` y metas                                                        | `instalable.spec.ts`, `generados.test.ts`                                                                                | 2                       | S                 | el icono y el nombre al instalar; la barra de estado en navy       | revert                              |
| 4 · 4          | `SessionState`, `ProtectedRoute`, `OfflineBanner`, el trozo que falla en su sitio                | `net.test.ts`, `queryClient.test.ts`, `sinred.spec.ts`                                                                   | 2                       | M                 | sin red, lo visto con su hora y nunca `Log in`                     | revert                              |
| 5 · 5          | el service worker, su plugin, `UpdateToast`, `webBuild`, `InstallHint`                           | `decide.test.ts`, `install.test.ts`, `app.test.ts`                                                                       | 3, 4                    | M                 | recargar sin red funciona; el aviso de versión; instalar en iPhone | el `sw.js` de baja y después revert |
| 6 · 6          | el sprite de banderas; fuera `flag-icons`; `peso.test.mjs`                                       | `peso.test.mjs`, `Flag.test.tsx`                                                                                         | 5                       | S                 | la web pinta antes: de 3,20 a 2,93 s                               | revert                              |
| 7 · 7          | `index.css` de §3.9; `colorMath.ts`                                                              | `colorMath.test.ts`, `tokens.test.ts`                                                                                    | 2                       | M                 | casi nada: el fondo de la página                                   | revert                              |
| 8 · 8          | `vocabulario.test.ts` y `deuda.json`; `ui/1` a `ui/10`                                           | los tres de §5                                                                                                           | 7                       | M                 | nada                                                               | revert                              |
| 9 · 9a         | el catálogo de la acción, la estructura y los avisos; los iconos; `/_ui`                         | `ui/*.test.tsx`; `/_ui` a cero                                                                                           | 8                       | L                 | `/_ui` en su teléfono                                              | revert                              |
| 9 · 9b         | identidad, tablas y escalas; el dibujo de hoy, congelado                                         | `ui/*.test.tsx`, `legacyJersey.test.ts`                                                                                  | 9a, 6                   | L                 | más de `/_ui`                                                      | revert                              |
| 10 · 10        | `QueryView` y los estados en todas las páginas                                                   | `QueryView.test.tsx` y los de estado                                                                                     | 9a                      | M                 | esqueletos, errores con reintento, vacíos con su porqué            | revert                              |
| 11 · 11        | `AppHeader`, `BottomNav`, `Tabs` `nav` y lo fijo                                                 | `AppHeader.test.tsx`, `BottomNav.test.tsx`                                                                               | 9a, 4                   | M                 | el reloj del mundo en el teléfono; la barra con iconos             | revert                              |
| 12 · 12a       | las filas con acción: el calendario del equipo y las carreras                                    | la línea base de 02, 03 y 15                                                                                             | 9b, 10                  | M                 | `Add` y `Drop` alcanzables; la inscripción, corta                  | revert                              |
| 12 · 12b       | las diez clasificaciones en `RankTable`, con la fila propia                                      | los re-sellos de 12b; la línea base                                                                                      | 9b, 10                  | L                 | la general en el teléfono, con su fila                             | revert                              |
| 13 · 13a       | `0051`; un plan vivo; `resolveTrainingDay` en el tick                                            | `trainingDay.test.ts`, `trainingDay.diff.test.ts`, `planPorBloques.test.ts`                                              | 2                       | M                 | nada; quien tenía dos planes entrena el último                     | revert; la `0051` no se deshace     |
| 13 · 13b       | la vista previa nueva y `GET /orders` con `days[]`; las tres constantes del motor                | `planPreview.test.ts`, `planPreviewDiary.test.ts`                                                                        | 13a                     | L                 | cada llegada dice su carrera; fuera `1300 TSS`                     | revert                              |
| 14 · 14        | el cuadro de §10                                                                                 | `trainingPlan.test.ts`; la línea base de 01 y 29                                                                         | 13b, 9b, 10, 11         | M                 | el examen en su teléfono                                           | revert                              |
| 15 · 15        | el viaje y la portada                                                                            | `dashboard.test.ts`, `riderTravel.test.ts`                                                                               | 14, 12a                 | S                 | el viaje en el programa; la portada habla del plan                 | revert                              |
| 16 · 16a       | `kit.ts`, la distancia, la tabla de choques, los rivales, `kits.ts`, `0052`                      | `kit.test.ts`, `kitDistance.test.ts`, `kitConflicts.test.ts`, `champion.test.ts`, `seasonRivals.test.ts`, `kits.test.ts` | 7, 6, 13a               | L                 | la hoja de los 133 nacionales                                      | revert; la `0052`, vacía            |
| 16 · 16b       | `kit` en los contratos, nulo hasta el 17b                                                        | los de las rutas y `broadcast.test.ts`                                                                                   | 16a                     | M                 | nada                                                               | revert                              |
| 17 · 17a       | `Kit`, `LeaderJersey`, `ChampionJersey`, `WornJerseyIcon`; todo a 28 px; la barra por equipos    | `Kit.test.tsx`, `ChampionJersey.test.tsx`, los re-sellos                                                                 | 16b, 9b, 12b            | L                 | líderes y campeones nuevos; nada por debajo de 28                  | revert                              |
| 17 · 17b       | la traducción en el tick, con sus noticias                                                       | `kits.test.ts` (el tick), `tick.test.ts`, `kitWorld.long.test.ts`                                                        | 17a                     | M                 | cada equipo con su maillot nuevo, sin gemelos                      | borrar las filas `system` y revert  |
| 17 · 17c       | en grande: `showcase` y `poster`, detrás y el culote, las zonas del patrocinador                 | `Kit.test.tsx` (las vistas y los 12 px)                                                                                  | 17a                     | M                 | el maillot de su equipo en grande                                  | revert                              |
| 18 · 18a       | la API del editor; `PUT /api/teams/me` sin `jerseySeed`; lo de E9                                | `routes/kit.test.ts`, `spoilerRegistry.test.ts`                                                                          | 17b                     | M                 | nada en pantalla                                                   | revert                              |
| 18 · 18b       | `KitPicker` en `/team/identity`                                                                  | `KitPicker.test.tsx`; la línea base de 16                                                                                | 18a, 17c                | M                 | el editor                                                          | revert                              |
| 19 · 19a       | `response` en cada ruta; la resolución en el tipo; `frontera.test.ts`; el canario                | `responses.test.ts`, `frontera.test.ts`, `spoilerCanary.test.ts`                                                         | 13b, 18a                | L                 | nada                                                               | revert                              |
| 19 · 19b       | atributos, condición, tendencia y moral en su forma de pantalla                                  | `frontera.test.ts` (la lista), los de las rutas                                                                          | 19a                     | M                 | la moral en estrellas; la frescura sin cifra                       | revert                              |
| 19 · 19c       | el resto, `jerseySeed` fuera, `0053`                                                             | `frontera.test.ts` (vacía)                                                                                               | 19b, 17b en producción  | M                 | nada                                                               | revert; la `0053` no se deshace     |
| 20 · 20        | `Watch` vestido (§14)                                                                            | `screen.test.ts`, `CueCard.test.tsx`, los re-sellos de E2                                                                | 17a, 11                 | M                 | `Watch` legible; el resumen accesible                              | revert                              |
| 21 · 21a a 21j | la cola larga, por deuda                                                                         | `deuda.json` y la línea base de cada página                                                                              | 9b, 10, 11              | seis M y cuatro S | pantalla a pantalla                                                | revert de cada uno                  |
| 22 · 22        | el tema cerrado                                                                                  | `vocabulario.test.ts` a cero                                                                                             | 21j                     | S                 | nada                                                               | revert                              |
| 23 · 23        | el sensor, `0054`                                                                                | `telemetry.test.ts`                                                                                                      | 5; 19c por su migración | S                 | el veredicto en el panel de administración                         | revert; la tabla se queda           |
| 24 · 24        | los documentos y el cierre                                                                       | la prueba sin línea base                                                                                                 | todo                    | S                 | hace las once tareas en su teléfono                                | revert de los documentos            |

### 17.3 Paso 1 · El clon

**PR 1** · S · no depende de nada y se fusiona antes que todo (D-32; H-21). Arregla un defecto vivo de producción: cambiar el maillot en `/team/identity` hace que el tick cree un clon del equipo (de 219 equipos y 3.900 corredores a 220 y 3.912, mapa 03 §2.2), porque `seedWorld` reconoce los equipos por su `jersey_seed` (`world.ts` l. 459-468) y `updateOwnedTeam` la reescribe (`teamControl.ts` l. 182-186).

**Tests primero.** `packages/db/src/jerseyClone.test.ts` (PGlite, nuevo): (1) la reproducción del mapa 03 §2.2: `Menghu Cycling` con dueño, la candidata 3 y un tick; siguen 219 equipos y 3.900 corredores, y el `jerseySeed` servido es la candidata; (2) un equipo con la semilla cambiada que pierde su dueño ni se poda ni se renombra; (3) `teamIndexFromSeed` da `null` para una semilla que no casa con `:team:<DIV>:<i>:jersey`. `migrations.test.ts` y `schema.test.ts` con la `0050`.

**Entra.** La `0050_semilla_del_dibujo` (`teams.jersey_style_seed`, `text`, nula); `updateOwnedTeam` escribe la semilla elegida ahí y nunca en `jersey_seed`; todo lo que dibuja lee `coalesce(jersey_style_seed, jersey_seed)` con el nombre de hoy, `jerseySeed`: los tres contratos de equipo (`contracts.ts` l. 665, 692 y 718), el reparto (`cast.ts` l. 141-149) y `getCastIdentities` (`castIdentities.ts` l. 44-49); `teamIndexFromSeed` (`world.ts` l. 542-545) y `reconcileTeams`, que ni poda ni renombra a los que dan `null` (l. 574, 594 y 598). Ningún contrato ni la web cambian. La descripción lleva las dos consultas de solo lectura de §8.9 para producción.

**Ve el dueño** nada en pantalla: elegir maillot deja de crear un equipo, y la descripción del PR le dice cuántos clones hay ya en producción, que es su DD-17. **Se revierte con** un revert: la `0050` queda inerte, los equipos que eligieron maillot después vuelven a su dibujo anterior y el defecto vuelve.

### 17.4 Paso 2 · La prueba, en rojo

**PR 2** · M · no depende de nada; puede ir a la vez que el 1 (O-11, O-26). Deja medido lo de hoy antes de cambiarlo, sin tocar la web.

**Tests primero.** Son el PR: `apps/web/e2e/telefono.spec.ts` con las diez comprobaciones de §7.1, que se prueba a sí mismo contra `apps/web/e2e/control.html`, una página con exactamente una falta de cada comprobación (un bloque de 400 px de ancho, un recorte, una letra de 11 px, un campo de 14, un botón de 30, un contraste de 2,6:1, la respuesta a 900 px, la acción fuera del pulgar, 4.000 px de alto y un `svg[data-kit]` de 13): si una comprobación no cuenta su falta, el instrumento ha dejado de medir y el test falla (17-b). Y `nocturno.spec.ts`, con sus tres pasadas, que informa.

**Entra.** `@playwright/test` 1.56.1 y `axe-core` 4.10.3, de versión exacta, en `apps/web/package.json` (§7.6); `apps/web/playwright.config.ts`, `e2e/telefono.config.ts`, `e2e/pantallas.ts` con las 45 de §7.3, `e2e/world/build.mjs` y `e2e/world/serve.mjs` (§7.2); `apps/web/src/components/ui/constants.ts` con los cuatro mínimos y `packages/shared/src/kit.ts` con solo `KIT_MIN_PX`, `KIT_PX` y `KitSize`, que la comprobación 10 importa (15-a); `data-kit` en los tres `<svg>` de `Jersey.tsx` (l. 20, 104 y 153), sin cambiar su aspecto (7-g); el trabajo `Teléfono` en `ci.yml` y `Teléfono de noche` en `cobertura.yml`, con las cachés de Chromium (`playwright-1.56.1`) y del mundo (`telefono-mundo-v1-` y su huella); y `telefono-baseline.json` con las faltas de hoy.

**Ve el dueño** nada en el juego; en la descripción, la tabla de faltas de hoy por pantalla y comprobación, y el tamaño y el tiempo de restauración del mundo (D-18). **Se revierte con** un revert, que quita los dos trabajos.

### 17.5 Paso 3 · Instalable

**PR 3** · S · depende del 2. El manifiesto entero de §12.1, los iconos de `apps/web/scripts/icons.mjs` (§12.2: 192, 512, `maskable` de 512, 180 para Apple y los dos de 96 de los atajos), `favicon.svg` recoloreado y las seis metas de §12.2 en `index.html`, con la barra de estado en `default` (O-02). **Tests primero**: `instalable.spec.ts` (el manifiesto sin errores, los iconos de su tamaño, `theme-color` y los atajos; el service worker activo, `test.fixme` hasta el 5) y `generados.test.ts` con las huellas de los PNG en `huellas.json`. La descripción lleva la hoja de contactos de los iconos a 16, 48 y 180 px. **Ve el dueño**: al añadir la web a la pantalla de inicio, el icono navy y oro y el nombre `Cycling Star`, y la barra de estado en el navy de la cabecera. **Se revierte con** un revert.

### 17.6 Paso 4 · Sin red

**PR 4** · M · depende del 2. **Tests primero**: `apps/web/src/net.test.ts` (`sessionStateOf` con las respuestas de better-auth 1.6.25 de §12.4), `queryClient.test.ts` (con `unknown`, `HorizonWatcher` no vacía la caché), `OfflineBanner.test.tsx`, `OfflineState.test.tsx` y `ErrorState.test.tsx`, y `sinred.spec.ts` con sus cuatro casos (la recarga, `test.fixme` hasta el 5). **Entra**: `SessionState`, `sessionStateOf`, `useOnline` y `REQUEST_TIMEOUT_MS` en `net.ts`, con `AbortSignal.timeout` en `api/request.ts`; `ProtectedRoute` (l. 12-13) no lleva a `/login` con `unknown`; `Header.tsx` pinta la cabecera del jugador con la marca `cs:signed-in` (la cabecera nueva es el 11); `ui/OfflineBanner.tsx`, `ui/OfflineState.tsx` y `ui/ErrorState.tsx`, con sus textos, sus `data-*` y su ARIA, y con las clases de hoy hasta el 9a (17-c); y la barrera por ruta, que pinta `This page needs a connection the first time.` · `Try again` (pantalla) en su sitio, mientras la raíz (`main.tsx` l. 22-30) queda para los fallos de pintado. **Ve el dueño**: en modo avión, una página ya vista dice `You're offline. Showing what you saw at 14:02.` (pantalla), un trozo sin cargar avisa en su sitio en lugar de tirar la web, y nadie con sesión ve `Log in`. **Se revierte con** un revert.

### 17.7 Paso 5 · El service worker

**PR 5** · M · depende del 3 y del 4. **Tests primero**: `apps/web/sw/decide.test.ts` (y su línea en el `include` de `vitest.config.ts`, 16-a), `install.test.ts`, `UpdateToast.test.tsx` e `InstallHint.test.tsx`; `app.test.ts` gana `sw.js` con `no-cache` y `/health` con `webBuild`, con su `.omit` en `yesterday.test.ts`; se encienden los `test.fixme` de `sinred.spec.ts` y de `instalable.spec.ts`, más un caso que instala el service worker, sirve el de baja y comprueba que la página queda sin controlador. **Entra**: `sw/sw.js` y `sw/decide.js` (§12.3), `vite-plugin-sw.ts` con la precarga de §12.3 (el trozo de `/me/training` incluido, 12-a) y `Save-Data`; `registerServiceWorker()` y `setReloadBlocked` en `net.ts`; `UpdateToast` (§12.5), que nunca sale con `Watch` en marcha; `webBuild` en `/health` (`health.ts` l. 22) desde `<meta name="cs-web-build">` y `UPDATE_CHECK_MIN_MS`; `sw.js` con `no-cache` en `webCacheHeaders` (`app.ts` l. 135-144); `InstallHint` y `domain/install.ts` (DD-15); `Reload app` en `ErrorState` con la web instalada; y `apps/web/sw/baja.js`, el service worker de baja (17-d). **Ve el dueño**: recargar sin red da la cáscara con su cabecera; tras un despliegue, `A new version is ready · Reload` (pantalla); en iPhone, el aviso de instalar a la tercera sesión, y en Android, `Install app` en `/account`. **Se revierte con** el de baja primero: un `sw.js` que desaparece no desinstala al que ya está instalado, porque el navegador conserva el viejo si la actualización falla, así que se publica `baja.js` como `sw.js` (se desregistra y borra sus cachés) y después se revierte el resto.

### 17.8 Paso 6 · El peso

**PR 6** · S · depende del 5, porque mide la precarga. **Tests primero**: `apps/web/scripts/peso.test.mjs` con los cuatro presupuestos de §12.7, en el trabajo `Build` con `node --test` (16-b), que hoy fallaría en la hoja (94,3 KB contra 15) y pasa en el mismo PR con el sprite; `generados.test.ts` con la huella del sprite; `Flag.test.tsx` (`role="img"`, el nombre del país y el hueco sin país). **Entra**: `apps/web/scripts/flag-sprite.mjs`, que escribe `src/assets/flags.webp` (las 133 a 64 × 48) y `flagSprite.generated.ts`; `Flag.tsx` pinta del sprite (pasa a `ui/Flag.tsx` en el 9b); `flag-icons` sale de `main.tsx` l. 9 y de `package.json`; los umbrales de `nocturno.spec.ts`; y `"sideEffects": false` en `packages/shared` solo si `peso.test.mjs` enseña que `request.js` suelta sus 42 KB de `broadcast/*` y `pnpm test` sigue en verde (H-03), y si no, la cifra va a §12.7. **Ve el dueño**: la web pinta antes, la hoja que bloquea pasa de 92,4 a 9,2 KB y la primera pintura de 3,20 a 2,93 s con Slow 4G (medido por telefono §8.3), con las mismas banderas. **Se revierte con** un revert.

### 17.9 Paso 7 · Los tokens

**PR 7** · M · depende del 2. **Tests primero**: `packages/shared/src/colorMath.test.ts` (los valores dorados de colour-science, I-31) y `apps/web/src/tokens.test.ts` (cada pareja de §3.1 a §3.3 en los dos ámbitos y el ΔE00 de los tonos, informado). **Entra**: `apps/web/src/index.css` tal como lo escribe §3.9, con el cierre comentado y los seis `brand-*` heredados, y `packages/shared/src/colorMath.ts` fuera del barril. **Ve el dueño** casi nada: el fondo de la página pasa de `#e8edf2` a `#eef2f6`; todo lo de hoy sigue resolviendo. **Se revierte con** un revert.

### 17.10 Paso 8 · Las reglas

**PR 8** · M · depende del 7. **Tests primero**, que son el PR: `vocabulario.test.ts` con `deuda.json` y sus dos sondas, y `heredados.test.ts` (§5.2 y §5.3). **Entra**: `deuda.json` con el `tema` que midió §5.1 con los tokens de este documento, **2.740 apariciones en 183 clases** (y no las 2.457 de `sistema`, que usaba sus tokens; decisión 5-b), y los otros tres contadores medidos aquí; `tailwindcss`, `@tailwindcss/vite`, `@tailwindcss/node` y `@tailwindcss/oxide` a la versión exacta `4.3.3`; `apps/web/eslint-ui.mjs` con `UI_RULES` y `UI_HEREDADOS` (sistema midió 1.417 avisos en 83 ficheros `.tsx`; este PR escribe la cifra con los `.ts`) y los dos bloques de `eslint.config.js`. **Ve el dueño** nada. **Se revierte con** un revert.

### 17.11 Paso 9 · El catálogo

**PR 9a** · L · depende del 8. **Tests primero**: un `ui/<Nombre>.test.tsx` por componente con un caso por estado (§4), y la prueba del teléfono sobre `/_ui`, cuya entrada nace a cero en `telefono-baseline.json`. **Entra**: `ui/types.ts`; `apps/web/scripts/ui-icons.mjs` con las 24 fuentes de `scripts/icons/` y `icons.tsx` (§3.8), con su huella en `generados.test.ts` y su hoja de contactos; `Icon`, `Button`, `TextLink`, `Field`, `Segmented`, `InfoButton`, `Disclosure`, `ActionBar` (con `ui/keyboard.ts`), `Panel`, `PageHeader`, `Tabs` (con el patrón ARIA de `Tabs.tsx` l. 153-222), `Stat`, `Notice` y `Chip`; los tres del paso 4, ya con tokens; y `/_ui` (`pages/ui/`, `fixtures.ts`, `noindex`, su propio trozo). **Ve el dueño** `/_ui` en su teléfono, cada componente en cada estado; ninguna página cambia.

**PR 9b** · L · depende del 9a y del 6. **Tests primero**: los `.test.tsx` de `Flag`, `StarRating`, `Meter`, `Scale5`, `RiderLabel`, `RiderHeader`, `RankTable`, `ActionRow` y `TripRow`, y `packages/shared/src/legacyJersey.test.ts`: `legacyJerseyStyle(seed)` da lo mismo que el `jerseyStyle` de hoy (`visuals.ts` l. 71-83) para las 219 semillas de la génesis, contra una tabla dorada que el PR saca de él antes de moverlo, porque `packages/shared` no puede importar de la web. **Entra**: esos componentes y sus estados en `/_ui` (la clasificación de 140 filas con la fila propia en el puesto 34, el nombre de 28 caracteres); `legacyJerseyStyle` en `packages/shared/src/legacyJersey.ts` y `LegacyJersey` en `ui/legacyJersey.ts`, el dibujo de hoy congelado sin cambiar su aspecto (§8, duda 2); y `RiderLabel` con `team: { name, legacySeed } | null` hasta el 17a, que pinta el maillot de hoy a 28 px (17-e). **Ve el dueño** más de `/_ui`. **Se revierten** los dos con un revert.

### 17.12 Paso 10 · Los estados

**PR 10** · M · depende del 9a. **Tests primero**: `QueryView.test.tsx` (los seis estados de §4.2), `Skeleton.test.tsx` y `EmptyState.test.tsx`, y las bajadas de la línea base en las pantallas 40 a 47. **Entra**: `QueryView`, `Skeleton`, `EmptyState` y `errorKindOf`, con `LOADING_DELAY_MS` y `SLOW_HINT_MS`, en todas las páginas: los 44 `Loading…`, los 26 `Could not load…` (pantalla) y las seis páginas que pintan un fallo como vacío (mapa 01 §4), `StageReport.tsx` l. 107 y 125 incluidas; `ui/5` pasa de 70 avisos a 0. **Ve el dueño**: lo que carga aparece con su forma a los 300 ms, un error dice qué falló con `Try again` y un vacío dice por qué. **Se revierte con** un revert.

### 17.13 Paso 11 · El marco

**PR 11** · M · depende del 9a y del 4. **Tests primero**: `AppHeader.test.tsx` (sus tres estados, el reloj con su `aria-label`) y `BottomNav.test.tsx` (`label` y `shortLabel`, `aria-current`); y la comprobación 2 a 320 px sobre los rótulos de la barra, con la letra del CI. **Entra**: `AppHeader` (48 más `env(safe-area-inset-top)`), `BottomNav` con sus iconos y, si la comprobación 2 corta un rótulo, el plan B por debajo de 340 px en este mismo PR, avisando a E6 (6-e); `Tabs` `nav` con su desvanecido y la activa centrada; `--fixed-bottom` en `main`; y la `ActionBar` y la `BottomNav` escondidas con el teclado. **Ve el dueño**: el reloj del mundo en su teléfono (hoy solo en escritorio, `Header.tsx` l. 122), la barra inferior con iconos y rótulos enteros y las pestañas que avisan de que hay más. **Se revierte con** un revert.

### 17.14 Paso 12 · Las tablas

**PR 12a** · M · depende del 9b y del 10. `ActionRow` en el plan del mánager (`TeamCalendar.tsx` l. 197: `Add` y `Drop` vuelven a verse y a tocarse), en las inscribibles (`MyRaces.tsx` l. 340, con el `Segmented` `All races` · `Affordable` y las 20 primeras) y en el programa (l. 98). **Tests primero**: las bajadas de la línea base en las pantallas 02, 03 y 15 (la comprobación 9 de la 03 y la 15, y la 2 y la 5 de la 15, a cero) y las de `deuda.json` en los dos ficheros. **Ve el dueño**: el calendario del equipo entero en su teléfono, y la inscripción en unos 1.500 px en lugar de 19.914.

**PR 12b** · L · depende del 9b y del 10. Las diez clasificaciones de §6.1 en `RankTable`, con sus prioridades, las 20 primeras y la fila propia anclada; la de equipos pierde la bandera y la columna `Country` (6-f) y gana `leaderTeamId` con el `Chip` `Leads overall` (pantalla) en la de la etapa (§9.8). **El maillot de cada fila**: las filas no lo traen (`gcRowSchema` y `stageResultEntrySchema` solo llevan `teamId` y `teamName`, `contracts.ts` l. 493-507, y `teamClassEntrySchema` ni eso, l. 541-552), así que la tabla lo toma por `teamId` de la lista de salida de su carrera (`startlistTeamSchema`, l. 659) o, fuera de una carrera, de `GET /api/teams` (`teamListItemSchema`, l. 685), que ya se pide y se guarda en caché; hasta el 17a, con su `jerseySeed` y el dibujo de hoy a 28 px (17-q). **Tests primero**: los re-sellos de `stageRoute.test.tsx` l. 19 y `riderResults.test.ts` l. 112-119 (§16.3); `stageTables.test.tsx` sigue pasando y `leaderJerseys.test.tsx` l. 81-88 sigue sellando que no hay dorsal; las bajadas de la línea base. **Ve el dueño**: la general en su teléfono, con el dorsal, la bandera, el nombre y el maillot a 28 y el equipo debajo, y su corredor anclado si no está entre los 20. **Se revierten** los dos con un revert.

### 17.15 Paso 13 · El examen, debajo

**PR 13a** · M · depende solo del 2. **Tests primero**: `packages/shared/src/trainingDay.test.ts` (la tabla de los tres modos por los siete orígenes), `packages/db/src/trainingDay.diff.test.ts` (el tick con `resolveTrainingDay` frente a la cadena congelada, 28 días, en los dos mundos: si cambia una elección, el PR no entra; compara las dos cadenas con el mismo plan ya elegido, porque qué plan se elige lo prueba el siguiente) y los casos nuevos de `planPorBloques.test.ts` (§11.5). **Entra**: `resolveTrainingDay` en `packages/shared/src/trainingDay.ts` y el tick llamándola (`train.ts` l. 195-272); `PUT /api/riders/me/plan` que conserva el `startDay` del plan vivo, con `startFresh` y el borrado de los solapes en la misma transacción; `getPlanForDay` con orden y el `Map` del tick con el `start_day` mayor; y la `0051_un_plan_vivo` (§11.5). La descripción lleva cuántos planes solapados hay en producción antes de migrar. **Ve el dueño** nada en pantalla; un corredor con dos planes pisados entrena desde ese día el más reciente. **Se revierte con** un revert del código; la `0051` no se deshace, y lo que borró eran planes pisados por otro posterior.

**PR 13b** · L · depende del 13a; **el único que toca `packages/engine/`**, y paga los ocho tramos de bancos. **Tests primero**: `apps/api/src/routes/planPreview.test.ts` y `planPreviewDiary.test.ts` (§16.2), con el trinquete del acuerdo en el valor que mida. **Entra**: los esquemas de §11.2 (`planPreviewRequestSchema`, `planPreviewResponseSchema`, `planPreviewRaceSchema`, `planPreviewDaySchema`, `ordersDaySchema`, `trainingDaySourceSchema` y `loadLevelSchema`), y fuera `projectedDaySchema`; `getRiderRaceDays` con objetos; la curva con `applyDailyLoad`, el viaje a 15 y el primer día desde el último diario (§11.3); `coachPlan` por día en `entrenador`; `GET /api/riders/me/orders` con `days[]`; `LoadLevel`, `loadLevelOf` y `LOAD_STEPS_TSS` en `shared/training.ts`; las tres constantes del motor con su comentario y su línea en `docs/balance.md` (§15.3); y `PlanLadder.tsx` (l. 227-257) adaptado al contrato nuevo sin cambiar su aspecto: una fila por carrera con su nombre y su chapa de hoy, y sin `1300 TSS over four weeks.` (17-f). **Ve el dueño**: la lista de llegadas dice de qué carrera habla, una fila por carrera, y la cifra de TSS desaparece. **Se revierte con** un revert; las tres constantes no las lee nadie más.

### 17.16 Paso 14 · El examen, en pantalla

**PR 14** · M · depende del 13b, del 9b, del 10 y del 11. El cuadro entero de §10 con los componentes del catálogo: la línea de estado, las tarjetas por carrera con `Scale5` y su instrucción, el `Segmented` con la regla por modo y su `InfoButton`, las semanas del plan vivo con su tira de siete días, el día a día plegado con su origen y `↺ Back to …`, `TripRow`, la carga en palabras y una sola `ActionBar` que llama a `PUT /plan` y después a `PUT /orders`. **Tests primero**: `apps/web/src/domain/trainingPlan.test.ts` (nuevo, con las funciones puras de §10: la consecuencia, el resumen de la tira, la carga del mes, la línea de la regla y el destino de `↺ Back to …`); el `edit` de las pantallas 01 y 29 en `pantallas.ts` y sus comprobaciones 7, 8 y 9 a cero; y fuera `defaultCoachPlan` con sus casos de `training.test.ts` l. 32-55, que ya no usa nadie. **Ve el dueño** el examen en su teléfono: la respuesta arriba, hacia los 188 px, cada carrera con su escala y su instrucción, cada día con quién lo decide y un solo guardado. **Se revierte con** un revert.

### 17.17 Paso 15 · El viaje

**PR 15** · S · depende del 14 y del 12a. §11.6 y §11.7: `On your programme` con la línea del viaje y `upcomingRaceSchema` con `travelOut`, `travelBack` y `travelPaid` (11-b); `Day N` en todas partes (fuera el `GD` de `MyRaces.tsx` l. 205 y 230); el icono `travel` en lugar de los dos `✈`; el `InfoButton` del viaje caro; y la portada con `PLAN_END_WARN_DAYS`. **Tests primero**: `dashboard.test.ts` (un caso por fila de §11.7) y un caso de `riderTravel.test.ts` para `travelPaid`, que solo lleva cifra para el agente libre. **Ve el dueño**: el programa dice cuándo sale, cuándo vuelve y cuánto pagó; la portada avisa del viaje de mañana y del final del plan, y deja de decir `Your training queue is empty` (pantalla) a quien tiene sus bloques. **Se revierte con** un revert.

### 17.18 Paso 16 · Maillots: el dato

**PR 16a** · L · depende del 7 (`colorMath.ts`), del 6 (el script del sprite) y, por el número de su migración, del 13a. Todo lo del servidor y nada de la pantalla, ni el tick. **Tests primero**: `kit.test.ts`, `kitDistance.test.ts`, `kitConflicts.test.ts`, `champion.test.ts` (con `NATIONAL_STAR_OVERRIDES` y la reserva de D-00h), `seasonRivals.test.ts` y **`kits.test.ts`, la puerta de D-00e**: si una carrera de la temporada 0 tiene un par por debajo de 10 a 28 px, el PR lo dice y propone qué color o qué figura sobra, con la cuenta que el test escribe (§8.2); más `migrations.test.ts`, `schema.test.ts` y `columnasVivas.test.ts`. **Entra**: `packages/shared/src/kit.ts` entero (§8.1, §8.3, §9.1, §9.7 y §9.9); `kitDistance.ts` y `drawnDistance`; `flag-sprite.mjs` gana las celdas de `flagCells.generated.bin` y `.ts` (§9.5); `packages/db/scripts/kit-conflicts.ts` y `kitConflicts.generated.ts`, con los maillots que D-00h reserva por parecerse a una bandera; `seasonRivals.ts` con `fieldTeamsFor` sacada de `calendarRun.ts` l. 390-455, que el tick sigue usando igual; `kits.ts` (`setKit`, `kitOn`, `kitsOn`, `assignKits`, `checkKit`, `ensureKits` sin llamar desde el tick, `KitTakenError` y `revertKit`); y la `0052_equipaciones`, con lo que §8 guarde del culote si lo guarda (17-g). **La hoja de revisión** (D-00f): la descripción lleva los 133 maillots nacionales y el mundial a 28 y a 72 px, con los ajustes de `NATIONAL_STAR_OVERRIDES` ya puestos y su porqué; el dueño la mira una vez, y lo que pida cambiar entra en la tabla con su porqué y regenera la tabla de choques, en este PR si contesta antes de fusionarlo o en uno pequeño antes del 17a, que es el que pinta los nacionales; sin respuesta, valen los ajustes de la hoja, que son el valor por defecto (§19.4). **Ve el dueño** la hoja; en el juego, nada. **Se revierte con** un revert; nadie escribe en la `0052` hasta el 17b.

**PR 16b** · M · depende del 16a. `kit: kitCodeSchema.nullable()` en `startlistTeamSchema`, `teamListItemSchema`, `teamDetailSchema`, `teamClassEntrySchema` y `RiderCard.team`, resuelto con `kitsOn` y el día de cada uno (§8.5); la ruta de la retransmisión lo resuelve con el día de la etapa y lo pasa a `serveCast` (`routes/broadcast.ts` l. 299-313; `broadcastSource.ts` l. 1370), y `CastTeam` y el códec no cambian. Todo va nulo hasta el 17b. **Tests primero**: un caso por contrato con `kit` nulo y otro con una fila de `team_kits`, en `broadcast.test.ts` para el reparto servido. **Ve el dueño** nada. **Se revierte con** un revert.

### 17.19 Paso 17 · Maillots: el dibujo, la traducción y el maillot en grande

**PR 17a** · L · depende del 16b, del 9b y del 12b. **Tests primero**: `Kit.test.tsx`, `LeaderJersey.test.tsx`, `ChampionJersey.test.tsx` y `WornJerseyIcon.test.tsx` (§16.2: el `data-kit`, el texto de cada `aria-label`, las letras del país solo desde 72 px y ninguna en el mundial); los re-sellos de `leaderJerseys.test.tsx` l. 28-88 y de los casos de `GroupBar.test.tsx` que cuentan un maillot por corredor (§16.3); y la comprobación 10 a cero en `Watch` (08, 09 y 35) y en las clasificaciones. **Entra**: `Kit`, el `LeaderJersey` nuevo y `ChampionJersey` (§9.1; el nombre de 9-g, en lugar del `ChampionSash` del glosario), con la tabla de ajustes del 16a; `WornJerseyIcon` con su firma de §9.10 y `wornTeamOf`; fuera `ChampionMark` y la bandera de al lado (`Jersey.tsx` l. 135 y 165); `Logo.tsx` importa `LOGO_STAR`; todos los sitios de §8.3 a 28 px o más, con `RiderLabel` que pasa a `team: WornTeam | null` y las tablas que toman el `kit` de la lista de salida o de `GET /api/teams` (17-q), la clasificación por equipos con su maillot tras el nombre (17-h) y la barra de `Watch` con un maillot por equipo (§14.4; 14-d), porque `KitSize` no admite sus 13 px. **Ve el dueño**: los líderes redibujados, ningún maillot por debajo de 28 px, la barra de `Watch` por equipos y, cuando los haya, los campeones con su bandera y su estrella; los equipos siguen con su dibujo de hoy hasta el 17b. **Se revierte con** un revert.

**PR 17b** · M · depende del 17a. **Tests primero**: `kits.test.ts` gana el caso del tick (un tick da maillot a los 219 y una noticia por equipo cuyo maillot cambia, y el segundo no cambia nada), `tick.test.ts` el de `ensureKits` tras `seedWorld`, y nace `kitWorld.long.test.ts` (16-c). **Entra**: `ensureKits` en el tick, en su propia transacción tras `seedWorld` y `backfillRosters` (`tick.ts` l. 265 y 282-284); las noticias `Mistral Racing has a new kit` y `New kit for Mistral Racing` (pantalla); y fuera el panel de las doce semillas (`TeamManager.tsx` l. 21-26), porque desde aquí lo que elige ya no se ve: `/team/identity` enseña el maillot vigente hasta el editor del 18b (17-i). La descripción lleva el tiempo del primer tick con la traducción, medido en PGlite, y cuántos equipos conservan su color base. **Ve el dueño**: el primer tick tras el despliegue da a cada equipo su maillot nuevo, sin gemelos en ninguna carrera, con una noticia por equipo; las etapas grabadas antes siguen con el maillot de su día (D-23). **Se revierte con** un revert y, en producción, `delete from team_kits where set_by = 'system'` y `update teams set kit_canonical = null`: los equipos vuelven a dibujarse por su semilla; las noticias publicadas se quedan.

**PR 17c** · M · depende del 17a (D-00g). **Tests primero**: los casos de las vistas de `Kit.test.tsx` y `ChampionJersey.test.tsx` (de 28 a 96 px solo por delante; en `showcase` y `poster`, delante, detrás y el culote; ningún nombre de patrocinador ni ninguna letra por debajo de 12 px), y sus estados en `/_ui`, donde la comprobación 3 mide el texto de los SVG. **Entra**: `showcase` (160) y `poster` (320) en `KIT_PX` y `KitSize`, solo en `/team/identity`, la cabecera de la ficha del equipo (`Team.tsx` l. 87) y la de la ficha del corredor (`RiderHeader`); la vista de detrás y la del culote, con su vocabulario reducido (§8), y los campeones que solo cambian el maillot; y las zonas del patrocinador de §9.9 como **interfaz para E8**, cada una con su caja, sin vender ninguna: qué se vende, a quién y por cuánto es de E8 (DD-23). **Ve el dueño** el maillot de su equipo en grande, por delante, por detrás y con su culote. **Se revierte con** un revert.

### 17.20 Paso 18 · El editor

**PR 18a** · M · depende del 17b, para que el editor compare con los maillots ya traducidos. **Tests primero**: `apps/api/src/routes/kit.test.ts` (§16.2, con `kit_reservado` por una bandera, `champion:MA`) y `spoilerRegistry.test.ts` con las rutas nuevas. **Entra**: `GET /api/teams/me/kit`, `POST /api/teams/me/kit/check` y `PUT /api/teams/me/kit` (§8.7), con `KIT_CHANGE_COOLDOWN_DAYS` (DD-09) y el NPC que cede (DD-08); la fila `system` al tomar un equipo (`takeOverBotTeam`, `teamControl.ts` l. 79-100); `PUT /api/teams/me` sin `jerseySeed` (`routes/teams.ts` l. 19-27); y `revertKit` con `POST /api/admin/teams/:id/kit/revert` para E9 (§8.8). **Ve el dueño** nada en pantalla. **Se revierte con** un revert.

**PR 18b** · M · depende del 18a y del 17c. **Tests primero**: `KitPicker.test.tsx` con cada estado de §8.7 (también `Too close to the champion of Morocco.`, pantalla, de D-00h) y el `edit` de la pantalla 16 en `pantallas.ts`, con su comprobación 8. **Entra**: `KitPicker` en `/team/identity` con la vista grande del 17c, y un solo guardado para el maillot, el nombre y el país (8-h). **Ve el dueño** el editor: figura y colores por su nombre, lo tachado con su porqué, el veredicto con equipo y visión, y `Save kit`. **Se revierte con** un revert: la API se queda y nadie puede editar.

### 17.21 Paso 19 · La frontera

Tres PR (O-03; §13.4), y cada uno deja `FRONTERA_SIN_USO` más corta. **PR 19a** · L · depende del 13b (la vista previa ya sin números) y del 18a (la última ruta nueva antes de él). **Tests primero**: `responses.test.ts`, `frontera.test.ts` con las nueve excepciones y `FRONTERA_SIN_USO_MAX` = 9, `spoilerCanary.test.ts` con sus tres testigos y `CANARY_POST_READS`, y `spoilerRegistry.test.ts` con `response` en cada ruta. **Entra**: `RouteResponse`, `RESPONSE_EXEMPT` y `responseCheck` en `spoiler.ts`; el esquema de respuesta de cada ruta; `starsSchema`, `barSchema`, `arrowSchema` y `markSchema`; y la medida de la serialización de la retransmisión antes de declarar sus rutas (por encima de 20 ms de p95, `responseCheck: 'tests'`). Las seis claves de más de `GET /api/teams/:id/news` desaparecen con él.

**PR 19b** · M · depende del 19a: los atributos en estrellas y marca con los cerillos contados en la API, `/form` en barras enteras, `/trend` en flecha y la moral en medias estrellas (DD-12), con la web leyéndolos (las seis primeras filas de `FRONTERA_SIN_USO` fuera). **Ve el dueño** la moral en medias estrellas y la frescura sin cifra, y los atributos de cualquier corredor dejan de viajar con decimales.

**PR 19c** · M · depende del 19b y del 17b **ya corrido en producción**: la descripción lleva `select count(*) from teams where kit_canonical is null`, que tiene que dar 0. Fuera `facilities`, `season`, `fame` y `plan.goalRaceId`; `jerseySeed` sale de los tres contratos de equipo y `RiderCard.team` queda `{ id, name, kit, legacySeed }` (8-f); `kit` deja de ser nulo en los cuatro de estado; la `0053_sin_semilla_del_dibujo` borra `teams.jersey_style_seed`; y `FRONTERA_SIN_USO_MAX` = 0. **Ve el dueño** nada. **Se revierten** los tres con un revert; la `0053` no se deshace, y la columna que borra ya no la lee nadie.

### 17.22 Paso 20 · `Watch`

**PR 20** · M · depende del 17a y del 11. Todo §14 salvo los maillots de la barra, que entraron en el 17a: la cabeza de la etapa, la capa fija en el ámbito oscuro con `overlaySummaryText`, el rótulo de la barra y sus filas, el perfil con tokens y cotas de 12 px, los fondos del rótulo (`bad`, `navy-dark` y `navy`, 14-a) con sus 88 px, la previa, el cierre, `Highlights`, el digest y los mandos con un solo `primary`, la fila de saltos de `Report`, `og-default.png` con `og-image.mjs` y, si E6 lo ha aceptado, `useHideBottomNav` (DD-13). **Tests primero**: `screen.test.ts` (§14.3), `CueCard.test.tsx` con el título más largo (H-07), `FixedOverlay.test.tsx` con su `aria-label` y su `data-surface`, `generados.test.ts` con la imagen, y los re-sellos de E2 (§16.3). **Ve el dueño** `Watch` legible en su teléfono: la televisión empieza hacia los 228 px, la capa fija y los rótulos con su contraste, y un lector de pantalla lee la capa al tocarla. **Se revierte con** un revert.

### 17.23 Paso 21 · La cola larga

**PR 21a a 21j** · diez: M del 21a al 21e y el 21j, S del 21f al 21i (estimado por su deuda) · dependen del 9b, del 10 y del 11, y pueden ir dos a la vez (I-02; O-07). Una página por PR, en el orden de su deuda en `deuda.json`; las cinco primeras con la medida de §5.1 con los tokens de este documento, las cuatro siguientes con la de `sistema` con los suyos, que el PR 8 sustituye: **21a** `Race.tsx` (187 de 408 apariciones; lo que le quede tras el 12b), **21b** `MyRaces.tsx` (132 de 312; tras el 12a y el 15), **21c** `TeamCalendar.tsx` (110 de 256; tras el 12a), **21d** `AdminNames.tsx` (104 de 213), **21e** `RacesIndex.tsx` (100 de 252, con `Winner` en lugar de `🏆`, 3-d), **21f** `Account.tsx` (81, con `Install app`), **21g** `RaceOrders.tsx` (75, con `Rain`, `Showers` y `Dry`, y al catálogo sin cambiar lo que pesa cada orden, H-08), **21h** `Home.tsx` (70), **21i** `TeamSquad.tsx` (68) y **21j** el resto, con `CreateRider` (DD-18) y `Finances` sin su `🏠`. **Tests primero**, en cada uno: su fichero sale de `deuda.json` y de `UI_HEREDADOS` y las cifras de sus pantallas bajan en la línea base. **Ve el dueño** pantalla a pantalla, cada una con el sistema. **Se revierte con** el revert de cada uno.

### 17.24 Paso 22 · El tema cerrado

**PR 22** · S · depende del 21j, con `deuda.json` a cero en todos los ficheros. Activa las 17 líneas del cierre (§5.1), borra los seis `brand-*`, `deuda.json` y la lista `UI_HEREDADOS`, y las diez reglas pasan enteras a `error`. **Tests primero**: `vocabulario.test.ts` exige cero sin `deuda.json`, y sus dos sondas siguen. **Ve el dueño** nada: ya no queda nada que cerrar. **Se revierte con** un revert.

### 17.25 Paso 23 · El sensor

**PR 23** · S · depende del 5 y, por el número de su migración, del 19c. **Tests primero**: `telemetry.test.ts` (§16.2) y `spoilerRegistry.test.ts` con sus dos rutas. **Entra**: `POST /api/telemetry/vitals` con `vitalsSchema`, la `0054_telemetria` con `telemetry_vitals_daily` y sus columnas de tramos (12-c), `nativeReviewVerdict` con sus siete constantes, `GET /api/admin/telemetry` y el envío de la web, una vez por sesión (D-52, DD-14). **Ve el dueño** la línea del veredicto en el panel de administración, que al principio dice que no hay datos. **Se revierte con** un revert; la tabla se queda, vacía de nuevas filas.

### 17.26 Paso 24 · Los documentos y el cierre

**PR 24** · S · depende de todos. Corrige los documentos de D-58 (H-12): `docs/navegacion.md` §7.4 (l. 462-466, 492-495 y 501-504, el dorsal); `docs/retransmision.md` l. 4869, 12493, 12884, 13055 y 13440 (el dorsal), l. 5210 (`WornJerseyIcon` gana `size` y `surface`) y §18.8; `SPEC.md` §3.2 l. 74-75 y 78 (media estrella cada diez puntos) y l. 852 (el fundador elige con el editor); **`SPEC.md` l. 874, que ahora se reescribe siempre** y no solo con la C de DD-03, porque el dueño eligió la estrella de arcoíris (D-00d; 17-j): `Prohibido imitar logotipos, tipografías o identidades visuales de las carreras reales (el amarillo con serifa característica, el rosa de la corsa, las cinco bandas de la UCI: azul, rojo, negro, amarillo y verde, en ese orden y en cualquier disposición)`, con la verificación ante la EUIPO y la USPTO que la línea ya pide (§18.3); `docs/entrenamiento.md` l. 1697, y l. 1093-1099 si DD-10 cambia; y `docs/balance.md` con las decisiones cerradas. Borra `telefono-baseline.json`, y la prueba exige cero. **Tests primero**: la prueba del teléfono sin línea base. **Ve el dueño**: hace las once tareas de §7.7 en su teléfono y las apunta en el PR; un `no sale` abre un arreglo antes de cerrar E3 (DD-20). **Se revierte con** el revert de los documentos.

### 17.27 Orden y dependencias

```text
1                                    suelto: se fusiona el primero
2 ─┬─ 3 ──┬─ 5 ── 6                  instalable, sin red, el service worker y el peso
   ├─ 4 ──┘
   ├─ 7 ── 8 ── 9a ─┬─ 9b ─┬─ 12a    el 9b, también tras el 6; las dos tablas, tras el 9b y el 10
   │                ├─ 10 ─┴─ 12b
   │                └─ 11
   └─ 13a ── 13b ── 14 ── 15         el 14, tras el 9b, el 10 y el 11; el 15, tras el 12a

                                     ┌─ 17b ── 18a ─┐
13a, 7 y 6 ── 16a ── 16b ── 17a ─────┤              ├─ 18b    el 17a, tras el 9b y el 12b
                                     └─ 17c ────────┘

13b y 18a ── 19a ── 19b ── 19c ── 23   el 19c, con el 17b ya en producción; el 23, tras el 5
17a y 11 ── 20     9b, 10 y 11 ── 21a a 21j ── 22     todo ── 24
```

Cinco caminos. **El clon** (1), suelto. **El teléfono** (2 a 12), primero lo barato que más pesa (3 a 6: instalable, sin red, el service worker y el peso) y después el sistema (7 a 12). **El examen** (13 a 15), con el 13a que solo depende del 2 y puede empezar el segundo día: va antes que los maillots porque es el examen obligatorio del encargo y no depende de nada del maillot. **Los maillots** (16 a 18), que dependen del 9b para dibujar y del 13a para el número de su migración. **El cierre** (19 a 24): la frontera tras el examen y el editor, `Watch`, la cola larga, el tema cerrado, el sensor y los documentos. Con dos agentes, el camino del examen y el de los maillots van a la vez que el del teléfono, sin tocar los mismos ficheros.

### 17.28 Lo primero que ve el dueño, y cuándo E3 está terminado

| Tras el PR | Lo que ve el dueño en su teléfono                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------- |
| 1          | nada; elegir maillot deja de clonar el equipo                                                       |
| 3          | la web se instala con su icono                                                                      |
| 5          | aguanta sin red: recarga con su cabecera y avisa de las versiones nuevas                            |
| 6          | pinta antes                                                                                         |
| 9a         | `/_ui`, el sistema entero                                                                           |
| 11 y 12b   | el marco nuevo y las tablas sin desplazarse de lado                                                 |
| 14         | **el examen**: el cuadro de entrenamiento que se entiende                                           |
| 16a        | la hoja de los 133 maillots nacionales, que mira una vez                                            |
| 17a a 17c  | **los maillots nuevos**: líderes, campeones, un maillot por equipo sin gemelos, y el suyo en grande |
| 18b        | el editor                                                                                           |
| 20         | `Watch` vestido                                                                                     |
| 24         | la prueba de las once tareas                                                                        |

**E3 está terminado** cuando se cumplen las tres cosas a la vez (D-57): `telefono-baseline.json` está a cero en todas las pantallas y comprobaciones (y el PR 24 lo borra), `deuda.json` ha desaparecido con el tema cerrado del 22, y la prueba del dueño en su teléfono ha pasado sus tareas (D-19, DD-20). **El coste**, estimado: 42 PR, de ellos 11 S, 24 M y 7 L, unas 80 sesiones de trabajo (una por S, dos por M y tres por L); en CI, de 5 a 7 minutos de la prueba del teléfono en cada uno de unos 40 PR, cinco reconstrucciones del mundo de unos 15 minutos y una pasada de los ocho tramos de bancos, la del 13b.

---

**Injertos aplicados.** I-01 (§17.10 y §17.24: las reglas y la deuda en el 8, el tema cerrado en el 22), I-02 (§17.23: la cola larga en diez PR por deuda), I-05 (§17.19: `ensureKits` en el tick, en el 17b, tras `seedWorld` y `backfillRosters`), I-23 (§17.1, regla 9, y los pasos 3, 6, 9a, 16a y 20: lo generado con su hoja de contactos).

**Objeciones resueltas.** O-03 (§17.21: tres PR, con `responses.test.ts` y la retransmisión medida antes de declararla), O-07 (§17.23: la cola larga, y el plan en 42 PR), O-11 (§17.4: Playwright y axe-core de versión exacta, con Chromium y el mundo en la caché del CI), O-26 (§17.4: el mundo y la tabla de pantallas antes de la línea base).

**Huecos rellenados.** H-12 (§17.26: los documentos de D-58, con `SPEC.md` l. 874), H-21 (§17.3: el clon, primero y suelto).

**Decisiones de esta sección.**

- 17-a. Los cinco PR con migración se fusionan en el orden de su número (1, 13a, 16a, 19c y 23), y por eso el 16a depende del 13a y el 23 del 19c aunque no compartan código: drizzle-kit da el número siguiente al que encuentra, y así la `0052` es la de §8 (con su índice único) y no otra.
- 17-b. La prueba del teléfono se prueba a sí misma contra `apps/web/e2e/control.html`, con una falta de cada comprobación, como las dos sondas de `vocabulario.test.ts`: un instrumento que deja de medir no puede dejar el trinquete en verde.
- 17-c. `OfflineBanner`, `OfflineState` y `ErrorState` nacen en el 4 con las clases de hoy y pasan a los tokens en el 9a; sus tests miran `data-*` y ARIA, así que no se re-sellan. Descartado: esperar al catálogo para que la web aguante sin red.
- 17-d. El service worker se revierte con `apps/web/sw/baja.js`, escrito y probado en el mismo PR 5; quitar `sw.js` no desinstala el que ya está en los teléfonos.
- 17-e. `RiderLabel` nace en el 9b con `team: { name, legacySeed } | null` y pinta el maillot de hoy a 28 px; el 17a ensancha el tipo a `WornTeam | null` (§9.10), que añade `{ name, kit }`. Así las tablas del 12b llevan la identidad entera sin esperar al maillot nuevo, y §4.6 escribe el tipo final.
- 17-f. El 13b adapta `PlanLadder.tsx` al contrato nuevo sin cambiar su aspecto, para que el juego no se rompa entre el 13b y el 14; el cuadro nuevo es el 14.
- 17-g. Si §8 guarda una elección del culote (D-00g), su columna va en la `0052` del 16a, para que la numeración no cambie; si el culote sale del maillot por regla, no hay dato nuevo.
- 17-h. La clasificación por equipos pinta el nombre y después el maillot, como 4-i y §6.1 (el orden de D-00c), y no el maillot delante del nombre que dice §9.8.
- 17-q. Una fila de clasificación toma el maillot de su equipo por `teamId`: de la lista de salida de su carrera, que lo trae con el maillot del día de la salida (§8.5), o de `GET /api/teams` fuera de una carrera. Ninguna fila de resultados gana un campo, como quería 6-d; hasta el 17a se usa la `jerseySeed` de esos mismos contratos, y desde el 17a su `kit`.
- 17-i. El panel de las doce semillas sale en el 17b: desde la traducción, lo que eligiera ya no se vería, y `/team/identity` enseña el maillot vigente hasta el editor del 18b.
- 17-j. `SPEC.md` l. 874 se reescribe siempre en el 24, con el texto de §17.26: D-58 lo dejaba «solo si el dueño elige la C de DD-03», y el dueño eligió la estrella de arcoíris (D-00d), que tiene el mismo coste.
- 17-k. La barra de `Watch` por equipos entra en el 17a y no en el 20 (14-d): `KitSize` no admite sus 13 px y la web dejaría de compilar.
- 17-l. `ensureKits` existe desde el 16a pero el tick no lo llama hasta el 17b, para que las noticias de maillot nuevo salgan el mismo día que el maillot se ve.
- 17-m. La hoja de los 133 nacionales es entregable del 16a, que es el que fija su dibujo y lo mide, y no del 17a: un ajuste que pida el dueño cambia la tabla de choques. No bloquea el 16a, que no pinta nada; su respuesta hace falta antes del 17a, porque los campeones de 17 países llegan antes que el resto (Australia el día 11 de la temporada, `docs/retransmision.md` §20.3, DD-06) y el 17a los enseña a todos.
- 17-n. El 18a depende del 17b, para que el veredicto compare con los maillots ya traducidos de los rivales.
- 17-o. Las vistas grandes son un PR propio, el 17c, entre el dibujo y el editor, porque el editor las enseña y E8 las usa.
- 17-p. El coste se da en sesiones de trabajo estimadas (una por S, dos por M y tres por L), como E2; el de CI, en minutos de la prueba y de los bancos.

---

## 18. Riesgos y fronteras

Lo que E3 toca de otras épicas, lo que puede salir mal de lo suyo y lo que deja fuera a propósito. Cada riesgo dice cómo se cubre o quién lo mira; ninguno se deja para revisarlo más adelante.

### 18.1 Las fronteras

| Con quién         | Qué toca E3                                                                                                                                                                                   | Cómo se cubre                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E2                | el aspecto de `Watch` y una pieza de su diseño, la barra de grupos por equipos (D-00b); `WornJerseyIcon` gana `size` y `surface`; `registerSpoilerGuard` gana `response`; el service worker   | se quedan la disposición, los textos, el ritmo, los `aria-live`, el velo y el reparto congelado (§14.1); el maillot se resuelve al servir y el códec no cambia (§8.5); el service worker nunca toca `/api/*` ni `/health` y la navegación va primero a la red, que guarda las precargas de la etapa (§12.3); sus tests se re-sellan con la causa escrita (§16.3) y `yesterday.test.ts` lleva sus `.omit`; `docs/retransmision.md` se corrige en el paso 24 |
| E4                | la notificación en iPhone pide la web añadida a la pantalla de inicio y un service worker                                                                                                     | los dan los pasos 3 y 5; `InstallHint` sale también cuando E4 pida avisos (D-51); la regla de la app nativa usa la aceptación y los fallos de avisos que mide E4 (`NATIVE_REVIEW_PUSH_ACCEPT` y `NATIVE_REVIEW_PUSH_FAIL`, §12.8)                                                                                                                                                                                                                          |
| E6                | la barra inferior en `Watch` (`useHideBottomNav`, DD-13), los rótulos de la barra por debajo de 340 px, dónde vive la explicación larga de la precedencia y cómo se agrupan las listas largas | E3 da componentes y reglas medibles y E6 decide dónde (§10.10, §6.3, 6-a); el plan B de los rótulos se aplica en el PR 11 solo si la comprobación 2 lo pide, avisando a E6 (6-e)                                                                                                                                                                                                                                                                           |
| E8                | lo que compra un patrocinador: un color del vocabulario y las zonas del maillot (pecho, espalda, mangas y costados del culote), con su nombre solo donde la letra llega a 12 px (D-30, D-00g) | E3 da `KitZone`, `SponsorOffer`, `applySponsor`, `nearestKitColor` y las cajas de cada zona, y `checkKit` valida el resultado (§9.9); qué se vende, a quién, por cuánto, la exclusividad por categoría (`docs/epics.md` G2.8) y la lista de patrocinadores son de E8 (DD-19, DD-23)                                                                                                                                                                        |
| E9                | moderar el maillot                                                                                                                                                                            | el vocabulario es cerrado y el nombre del patrocinador sale de una lista (DD-19); E3 deja la historia de `team_kits`, `revertKit` y `POST /api/admin/teams/:id/kit/revert` (§8.8); el flujo de denuncia es de E9, y el texto libre, si DD-19 cambia, con el `name_status` de los nombres                                                                                                                                                                   |
| E10               | los idiomas: textos más largos y otros alfabetos                                                                                                                                              | ningún componente fija el ancho de un texto; la letra del sistema ya trae los alfabetos (D-05); la prueba del teléfono corre con cada idioma cuando E10 exista, y el plan B de los rótulos ya es un rótulo corto por destino                                                                                                                                                                                                                               |
| E12               | el Mundial y los continentales; lo real y lo generado                                                                                                                                         | el mundial y el continental ya están dibujados (§9.1), el continental en plata y provisional; `championTitleText` de los continentes es de E12; el `Chip` de lo real y lo generado lo da E3 y E12 decide dónde va (D-59)                                                                                                                                                                                                                                   |
| E5, E7, E11 y E13 | pantallas nuevas                                                                                                                                                                              | entran por la puerta de §5.5: un componente nuevo con su test y su sitio en `/_ui`, un token nuevo con su pareja; tras el paso 22, el tema no genera nada que no declare                                                                                                                                                                                                                                                                                   |

### 18.2 Los riesgos propios

| Riesgo                                               | Lo que puede pasar                                                                                                                                                                                                                                       | Cómo se cubre                                                                                                                                                                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ΔE00 por debajo de 10 es el umbral del encargo       | no es un experimento con personas: dos maillots a 10,5 pueden confundirse en un teléfono con poco brillo, y la tricromacia anómala, más frecuente que la dicromacia, no se modela                                                                        | Machado 2009 con severidad 1 es la peor visión de cada tipo y cubre por arriba a la anómala (mapa 03 §8); la forma separa además del color, y los grises se informan                                                    |
| todo se ha medido en Chromium de Linux (H-13)        | WebKit, San Francisco y Roboto, `100dvh` y el área segura en un aparato pueden romper lo que la prueba da por bueno; el plan B de los rótulos depende de la letra del CI                                                                                 | la prueba del dueño en su teléfono, puerta del paso 24 (§7.7; DD-20)                                                                                                                                                    |
| el lector de pantalla en un teléfono (H-19)          | los `role="img"` de la escala y del maillot y los `aria-live` de `Watch` solo se comprueban en el marcado                                                                                                                                                | la undécima tarea del dueño si usa VoiceOver o TalkBack; si no, queda como riesgo abierto                                                                                                                               |
| `viewport-fit=cover` de lado en un iPhone con muesca | desde el paso 3 la página llega a los bordes, y solo se reservan las áreas seguras de arriba y de abajo (`ARBITRARY_ALLOWED`, §5.1): de lado, un margen de 12 px queda bajo la muesca                                                                    | sin medir; la pasada nocturna de lado es en Chromium, sin muesca; si la prueba del dueño lo ve, el margen lateral pasa a `max(12px, env(safe-area-inset-left))` y entra en `ARBITRARY_ALLOWED`                          |
| un mundo de prueba de 50 días                        | casi sin campeones: el día 50 solo han corrido su nacional unos pocos de los 17 países que lo corren antes del 179 (Australia el día 11, Colombia el 39; `docs/retransmision.md` §20.3), así que ninguna de las 45 pantallas asegura un `ChampionJersey` | los campeones se miden en `champion.test.ts` y en `/_ui` (`fixtures.ts`), y la hoja del 16a los enseña todos                                                                                                            |
| la marca de la UCI (D-59)                            | el mundial blanco con su estrella queda a 12,7 de la marca a 28 px y a 9,2 en grises (§9.2), tan cerca como el `ChampionMark` de hoy (12,2)                                                                                                              | `SPEC.md` l. 874 se reescribe en el paso 24 y la verificación ante la EUIPO y la USPTO es tarea del dueño antes del lanzamiento (§18.3); `champion.test.ts` no deja que la distancia baje; no es asesoramiento jurídico |
| la estrella y las banderas (D-00f, D-00h)            | 21 maillots de equipo quedan a menos de 10 de 17 nacionales a 28 px, y Indonesia y Mónaco visten igual                                                                                                                                                   | la tabla de choques los reserva y el editor los tacha con su porqué; las dos letras del país separan a los gemelos desde 72 px; la hoja del 16a, revisada por el dueño, y `NATIONAL_STAR_OVERRIDES`                     |
| las banderas a densidad 3 (§9, duda 5)               | la celda de 64 × 48 del sprite se amplía 1,24 veces a 28 px y 1,77 a 40: los escudos pueden verse blandos                                                                                                                                                | la hoja del 16a y la prueba del dueño; si se ven blandos, el sprite crece y `FLAG_SPRITE_MAX` con él                                                                                                                    |
| el primer tick con la traducción (17b)               | 219 × 515 distancias a 28 px, de 35 a 70 s estimados, dentro del tick                                                                                                                                                                                    | va en su propia transacción tras `seedWorld`; `kits.test.ts` lo mide en PGlite en el 16a y el 17b escribe la cifra; si pasa de lo que aguanta un día del tick, la traducción se parte por divisiones                    |
| los rivales son una previsión (D-24)                 | los admitidos se ordenan por presupuesto el día en que se congela la escuadra, y un choque entre humanos puede aparecer a mitad de temporada                                                                                                             | el NPC cede esa noche (DD-08); dos humanos no se fuerzan y `kitWorld.long.test.ts` los cuenta cada noche                                                                                                                |
| el 500 del esquema de respuesta (O-03)               | una respuesta de producción con una forma que el mundo de los bancos no tiene da 500                                                                                                                                                                     | `responses.test.ts` con las respuestas reales; las rutas sin caso en ese mundo llevan uno fijo; las de la retransmisión, medidas antes, y con `responseCheck: 'tests'` si pasan de 20 ms                                |
| un service worker atascado                           | una versión mala del service worker deja a los jugadores en una web vieja                                                                                                                                                                                | `/sw.js` sin caché, `UpdateToast` y `webBuild` (§12.5); y el service worker de baja, escrito y probado en el PR 5 (17-d)                                                                                                |
| `__unstable__loadDesignSystem` de Tailwind           | al actualizar Tailwind, la API inestable cambia y `vocabulario.test.ts` deja de medir sin avisar                                                                                                                                                         | versión exacta 4.3.3 y las dos sondas, que lo hacen fallar (§5.2)                                                                                                                                                       |
| los clones y los planes solapados en producción      | hay equipos clon y planes pisados que nadie ha contado                                                                                                                                                                                                   | las consultas del PR 1 (DD-17) y del 13a, en su descripción, antes de cambiar nada                                                                                                                                      |

### 18.3 Lo que E3 no hace

- **Lo que pesa cada orden en la pantalla de órdenes** ([DUEÑO 18], H-08): E3 la pasa al catálogo en el PR 21g y no cambia lo que hace cada orden, que es de la línea de táctica.
- **El entrenador que no mira el calendario** (`daysToNextRace: null`, `train.ts` l. 256): es conducta del tick y cambia lo que se entrena, así que es de la línea de entrenamiento; E3 lo enseña como es (§11.1). También quedan fuera los cortes de `arrivalLabel` (DD-10), `sinRitmo`, el rango de ganancia, el objetivo D1 y el `0 race days` de `getBlockReport` (la decisión 24 del dueño de E2).
- **La analítica**: la tarea de `docs/encargos.md` l. 741-742 sigue sin hacer, y el sensor de §12.8 no la sustituye.
- **El logotipo** (D20): E3 lo recolorea para los iconos y la imagen de compartir y no lo redibuja, porque no tiene dueño (mapa 04, contradicción 12).
- **Un modo oscuro** para todo el juego (DD-05) y **la app nativa**, de la que E3 solo pone el sensor que dirá si hace falta.
- **La verificación de las marcas ante la EUIPO y la USPTO** (H-10; D-59): no es un PR de E3, sino la tarea que `SPEC.md` l. 874 pone antes del lanzamiento, con el dueño de responsable. Lo que hay que verificar: el maillot blanco con la estrella de arcoíris del campeón del mundo (§9.1), frente a las cinco bandas de la UCI y al registro de su logotipo (la registración internacional 1276964 de la OMPI, clases 12, 25 y 41; el de las bandas solas no se ha encontrado, mapa 03 §7.1); los lunares blancos sobre azul del líder de la montaña, frente al maillot de lunares rojos sobre blanco del Tour de Francia (H-10); el amarillo del líder sin serifa ni la letra de ninguna carrera (la letra del sistema, D-05); y los nombres finales de carreras y del juego, como ya pide la línea. Nada de esto es asesoramiento jurídico.

---

**Injertos aplicados.** Ninguno (§B no asigna ninguno a §18).

**Objeciones resueltas.** Ninguna asignada; recoge como riesgo la de O-03 (§18.2), que resuelven §13.4 y §17.21.

**Huecos rellenados.** H-08 (§18.3: la pantalla de órdenes pasa al catálogo y lo que pesa cada orden es de la táctica), H-10 (§18.3: los lunares, la serifa y la lista de lo que hay que verificar), H-19 (§18.2: el lector de pantalla, como riesgo si el dueño no lo usa).

**Decisiones de esta sección.**

- 18-a. El margen lateral de lado en un iPhone con muesca se deja como riesgo con su arreglo escrito, y no se pone ya en el paso 3: no está medido y añadiría un arbitrario a `ARBITRARY_ALLOWED` sin evidencia.
- 18-b. Si el primer tick con la traducción no cabe en un día del tick, la traducción se reparte por divisiones en días seguidos (WT, PRS y CON), con los rivales de las ya traducidas como fijos. Descartado de entrada, porque su coste estimado cabe.
- 18-c. La lista de lo que hay que verificar ante la EUIPO y la USPTO se escribe aquí entera, para que el dueño la tenga en un sitio cuando llegue el lanzamiento.

---

## 19. Decisiones que son del dueño

Veintitrés decisiones no las toma este documento, porque son de qué juego quiere el dueño y no de diseño. Veinte las cerró la síntesis con su valor por defecto (`DD-01` a `DD-20`); tres las añade esta sección (`DD-21` a `DD-23`): el filo oscuro de las estrellas, que añadió el orquestador y el dueño no ha comentado; el ribete del excampeón, del que no ha dicho nada; y el reparto de las zonas del patrocinador, que es suyo con E8. **Cinco ya están contestadas**: las cuatro de gusto, que el dueño decidió el 21 de octubre de 2026 mirando la página de opciones (DD-01 a DD-04; `00-encargo.md` §7.2 y §7.3, D-00a a D-00h), y DD-07, que D-00e deja sin alternativa (§19.4). Quedan **dieciocho abiertas**, cada una con un valor por defecto que es el que se implementa si el dueño no contesta y que el código lleva puesto desde el PR en que nace. El formato es el de `docs/retransmision.md` §20 (I-22): qué se decide, el defecto y su porqué, la consecuencia con su cifra, dónde se cambia y antes de qué PR, y qué cambia si dice lo contrario (O-23).

### 19.1 Cómo se lee

Cambiar de opinión después cuesta distinto según dónde viva el valor:

- **Un token del `@theme`** (§3): un PR que no toca ningún componente, en cualquier momento. DD-01, ya decidida, y DD-05, después del paso 22.
- **Una constante de `kit.ts`** (§8, §9): barata antes del 16a; después, la tabla de choques se regenera, su huella cambia y la puerta de `kits.test.ts` y `champion.test.ts` vuelven a correr; y después del 17b, un maillot que deja de estar permitido obliga a re-traducir a quien lo lleva. DD-03, DD-04, DD-21 y DD-22.
- **Una regla de la API o un texto de la web**: un PR corriente. DD-06, DD-09, DD-11 (antes del 13b), DD-12 (antes del 19b), DD-15, DD-18 y DD-20.
- **El dato**: lo que escribe el 17b en `team_kits` no se reescribe, porque es historia; deshacerlo es borrar filas. DD-07 y DD-08.
- **El motor**: `arrivalLabel` vive en `packages/engine`, así que DD-10 contestada después del 13b es otro PR que paga los ocho tramos de bancos.
- **El proceso y el CI**: DD-14, DD-16 y DD-20.
- **Producción**: DD-17, con la consulta del PR 1 delante.
- **Otra épica**: DD-13 (E6) y DD-19 y DD-23 (E8, con E9).

### 19.2 La tabla

| #     | Qué se decide                                             | Por defecto (se implementa)                                                                                                                                                                                                           | Consecuencia y cifra                                                                                                                                                                                                                                 | Dónde se cambia y antes de qué PR                                                                                            | Si dice lo contrario                                                                                                                                                                 |
| ----- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DD-01 | la paleta                                                 | **decidida por el dueño el 21/10/2026: A**, «manager sobrio» («Paleta: telefono A», `00-encargo.md` l. 263; D-00a), la de los tres jueces                                                                                             | conserva el navy, el cian y el oro del PR #105, quita las dos superficies que fallan el contraste (de 2,06 a 3,33) y devuelve 36 px por panel y 48 por página al teléfono (§3.1)                                                                     | los seis tokens de color de la paleta; ya decidida                                                                           | B, C o D (§19.3): seis tokens del `@theme` y ningún componente, con sus parejas en `tokens.test.ts`                                                                                  |
| DD-02 | la letra                                                  | **decidida: A**, la del sistema («Tipografía: sistema», l. 263)                                                                                                                                                                       | 0 KB, ningún salto de letra con Slow 4G y los alfabetos de E10 (§3.4)                                                                                                                                                                                | `--font-sans`; ya decidida                                                                                                   | Inter (de 47,1 a 48,3 KB el latín) o Barlow Semi Condensed 600 (22.984 bytes) desde `public/fonts/` con `swap`: un salto de letra en la primera visita y más peso                    |
| DD-03 | la señal de campeón                                       | **decidida** (D-00d y D-00f; l. 264-272 y 297-310): el nacional viste su bandera, con la estrella dorada revisada país a país y sus dos letras desde 72 px; el mundial, blanco con la estrella del logotipo en arcoíris, en degradado | a 28 px el mundial queda a 12,7, 11,6, 11,7 y 12,1 de la marca de la UCI en las cuatro visiones y a 9,2 en grises (§9.2), y 21 maillots de equipo se reservan por 17 banderas (D-00h); pide reescribir `SPEC.md` l. 874 y verificar la marca (§19.4) | `kit.ts`, `NATIONAL_STAR_OVERRIDES`, `ChampionJersey` y `champion.test.ts`; la respuesta a la hoja de los 133, antes del 17a | la banda de honor u otra de §9.4: cambian `kit.ts`, `ChampionJersey`, la tabla de choques y `champion.test.ts`, y si vuelve la diagonal, `sash` sale del vocabulario                 |
| DD-04 | el vocabulario del maillot                                | **decidida** (D-00e y D-00h; l. 277-278 y 297-299): quince colores y siete figuras, nunca dos equipos con el mismo maillot, y fuera los que se parecen a la bandera de un campeón                                                     | 515 maillots permitidos y 482 distintos para 219 equipos, a 28 px (§8.1); la puerta de `kits.test.ts` en el 16a, sin respaldo                                                                                                                        | `KIT_COLORS`, `KIT_FIGURES` y la tabla de choques; ya decidida                                                               | si la puerta falla, el PR 16a propone qué color o qué figura sobra con su cuenta, y eso sí se le pregunta (§8.2)                                                                     |
| DD-05 | un modo oscuro para todo el juego                         | no en E3 (D-04)                                                                                                                                                                                                                       | duplica los estados de todos los componentes y nadie lo ha pedido (mapa 04 §2); queda el ámbito oscuro de `Watch`, la cabecera y la barra                                                                                                            | un PR de tokens bajo `prefers-color-scheme`, después del 22; no hace falta respuesta                                         | ese PR, con la paleta C de telefono y sus parejas en `tokens.test.ts`                                                                                                                |
| DD-06 | el dorsal del equipo líder                                | no vuelve como dibujo (D-29)                                                                                                                                                                                                          | el dueño lo mandó quitar porque se leía «Ill» ([DUEÑO 5]); van el maillot de cada equipo y `Leads overall` en la tabla de la etapa (§9.8)                                                                                                            | `TeamClassTable`; antes del 12b                                                                                              | un `Chip` amarillo con su número donde ya se ve el dorsal, nunca un glifo; se re-sella `leaderJerseys.test.tsx` l. 81-88                                                             |
| DD-07 | traducir una vez los maillots de los 219 equipos          | **cerrada por D-00e**: sí, con continuidad (D-23)                                                                                                                                                                                     | hoy 220 de las 310 carreras tienen dos maillots idénticos (mapa 03 §3.2), y D-00e no deja dos iguales: no traducir ya no cabe; el pasado conserva su aspecto y cada equipo recibe su noticia                                                         | el 17b                                                                                                                       | solo cabe el cuándo: en el reinicio del mundo, si llega antes que el 17b; esperar más deja los gemelos contra D-00e                                                                  |
| DD-08 | si el maillot de un humano choca con un NPC, cede el NPC  | sí (D-24)                                                                                                                                                                                                                             | un maillot que ya lleva otro equipo da siempre `kit_ocupado` (8-m): la regla vale para el choque por distancia que aparece después, cuando un mánager añade una carrera                                                                              | `ensureKits`; antes del 18a                                                                                                  | humanos y NPC chocan igual: el editor tacha más y el mánager tiene menos sitio (con el vocabulario de identidad, un equipo PRS elegía entre unos 31, medido)                         |
| DD-09 | la espera entre dos cambios de maillot                    | 28 días de juego, una semana real; el primer cambio tras tomar el equipo, y el primero tras la traducción, libres (D-25; 8-g)                                                                                                         | la afición aprende el maillot de un equipo                                                                                                                                                                                                           | `KIT_CHANGE_COOLDOWN_DAYS`; antes del 18a, y después es una constante                                                        | 14 deja dos cambios por semana real; 7, casi uno por día real; una temporada lo congela                                                                                              |
| DD-10 | las palabras y los cortes de la llegada                   | los de hoy, con su escala y su instrucción (D-42)                                                                                                                                                                                     | faltaba la escala, no las palabras, y el motor no se toca                                                                                                                                                                                            | `arrivalLabel` (`projection.ts` l. 75-81); antes del 13b, el único PR que ya paga los bancos                                 | `Stale`, `Peaking`, `Fresh`, `Loaded` y `Buried` en +18, +5, −10 y −35 (`docs/entrenamiento.md` l. 1093-1099): cambian el motor, `projection.test.ts` l. 154-170 y la tabla de §10.4 |
| DD-11 | el TSS fuera de la pantalla y de la API                   | sí (D-41)                                                                                                                                                                                                                             | la carga, en cinco palabras ([DUEÑO 8]: «eso no aporta, ni se entiende», de otra cifra sin escala)                                                                                                                                                   | la vista previa y `days[]`; antes del 13b                                                                                    | el TSS vuelve en `meta` en el día a día y viaja en la vista previa y en `days[]`                                                                                                     |
| DD-12 | la moral                                                  | en medias estrellas (D-44), como pide SPEC §3.3 l. 85, «en estrellas o iconos»                                                                                                                                                        | `moraleStars` con `starsSchema`, y fuera el porcentaje con decimales (§13.7)                                                                                                                                                                         | `GET /api/riders/me/summary`; antes del 19b                                                                                  | cinco palabras con icono (un `z.enum` de cinco códigos), o el porcentaje de hoy, entero, con `barSchema`                                                                             |
| DD-13 | esconder la barra inferior en `Watch` mientras corre      | sí, propuesto a E6 (`useHideBottomNav`)                                                                                                                                                                                               | sin él, la barra tapa la mitad del comentario (captura 09)                                                                                                                                                                                           | E6; antes del 20                                                                                                             | la barra se queda y `Watch` reserva `--fixed-bottom` bajo el comentario (§14.8)                                                                                                      |
| DD-14 | la regla que revisa la app nativa, con su sensor          | sí, con los umbrales de D-52                                                                                                                                                                                                          | la decisión de `docs/agenda.md` §4.15.1 lleva una prueba y no hay analítica que la dé                                                                                                                                                                | `apps/api/src/telemetry.ts`; antes del 23                                                                                    | esperar a la tarea de analítica, que deja la decisión sin prueba, u otros umbrales (las siete constantes de §15.2)                                                                   |
| DD-15 | cuándo se ofrece instalar                                 | tras la tercera sesión o cuando E4 pida avisos, nunca en la primera visita (D-51)                                                                                                                                                     | el aviso no compite con entender el juego                                                                                                                                                                                                            | `INSTALL_HINT_AFTER_SESSIONS`; antes del 5                                                                                   | en la primera visita, compite; nunca, el jugador de iPhone no sabe que puede, porque Safari no lo dice                                                                               |
| DD-16 | Playwright en el CI                                       | sí (D-18)                                                                                                                                                                                                                             | de 5 a 7 minutos más por PR que toca la web, la API o `packages/db` y 150 MB de Chromium (estimado por telefono), y 161 MB del mundo (medido)                                                                                                        | el trabajo `Teléfono`; antes del 2                                                                                           | la aceptación del teléfono vuelve a ser a mano y no hay trinquete                                                                                                                    |
| DD-17 | los clones que ya haya en producción                      | se quedan (D-32)                                                                                                                                                                                                                      | son NPC de pleno derecho, con corredores, contratos y resultados, y la traducción les da su maillot                                                                                                                                                  | una migración de datos; después del 1, con su consulta delante                                                               | borrarlos pasa sus corredores a agentes libres y arrastra contratos y ofertas (`onDelete cascade`), como la poda de `reconcileTeams`                                                 |
| DD-18 | la línea `Your country: …` de la creación del corredor    | se queda, como ayuda del campo del país en `meta` `ink-2` ([DUEÑO 19]: «mientras se depura», `CreateRider.tsx` l. 29)                                                                                                                 | el dueño la pidió para depurar y no ha dicho que se quite                                                                                                                                                                                            | `CreateRider.tsx`; antes del 21j                                                                                             | se quita en el 21j                                                                                                                                                                   |
| DD-19 | el nombre del patrocinador                                | de una lista cerrada, con su marca de pecho de dos o tres mayúsculas (D-30; 9-a)                                                                                                                                                      | sin texto libre no hay nada que moderar en el maillot, y la marca hace de logotipo                                                                                                                                                                   | E8, con E9; antes de E8                                                                                                      | texto libre de hasta 12 caracteres, moderado por E9 con el `name_status` de los nombres (`schema.ts` l. 260)                                                                         |
| DD-20 | la prueba del dueño en su teléfono como puerta del cierre | sí (D-19), con sus once tareas (§7.7)                                                                                                                                                                                                 | todo lo demás está medido en Chromium de Linux                                                                                                                                                                                                       | el PR 24                                                                                                                     | E3 se cierra con el trinquete a cero y sin ella: WebKit, la letra del sistema y el área segura quedan sin comprobar                                                                  |
| DD-21 | el filo oscuro de las dos estrellas                       | sí: `CHAMPION_STAR_EDGE` `#0b2740`, de 1,5 u en la mundial y 1 u en la nacional; lo añadió el orquestador y el dueño no lo ha comentado                                                                                               | 15,23:1 contra el blanco (§9.1); sin él, la estrella dorada queda a 2,19:1 del blanco y la parada amarilla del arcoíris a 1,40:1, y las dos se pierden sobre el blanco y en grises                                                                   | `kit.ts`; antes del 16a, porque la tabla de choques lleva la huella de las señales                                           | sin filo o con otro color: cambian `kit.ts` y `ChampionJersey`, y se regeneran la tabla de choques y `champion.test.ts`                                                              |
| DD-22 | el ribete del excampeón                                   | no lleva ninguno                                                                                                                                                                                                                      | el dueño no ha hablado de los excampeones; el ribete del ciclismo real son las bandas de la UCI en el cuello y los puños, la marca otra vez, y a 28 px un ribete de 1 u mide 0,58 px                                                                 | el reparto, que tendría que llevar el título vencido (E2 y E12); antes del 17a                                               | un ribete con el espectro de `CHAMPION_RAINBOW` y nunca los cinco colores de la UCI, solo desde 72 px, con el título vencido en el reparto y su medida en `champion.test.ts`         |
| DD-23 | qué zonas del maillot se venden, y cómo                   | E3 da las cuatro zonas de D-00g (pecho, espalda, mangas y costados del culote) como interfaz y no vende ninguna                                                                                                                       | sin E8 no hay patrocinadores; un nombre solo se pinta donde su letra llega a 12 px, y por debajo la zona es un bloque de su color o no se pinta (D-00g)                                                                                              | E8; antes de E8                                                                                                              | qué zonas, a quién, por cuánto y si un equipo puede vender más de una: lo decide con E8, sin tocar el dibujo de §9.9                                                                 |

### 19.3 Las cuatro de gusto, mirando `opciones/index.html`

La página pintó cada alternativa lado a lado, con su simulación de daltonismo (Machado 2009 en las tres dicromacias y en grises) y sus medidas, para que el dueño decidiera mirando (`00-encargo.md` §4). Lo que vio y lo que eligió, el 21 de octubre de 2026:

- **La paleta (DD-01)**: A, «manager sobrio» (telefono A: cabecera `#123a5c`, acento `#0b6e8a`, oro `#e0a106`, tarjetas blancas sobre `#eef2f6`); B, el manager de hoy, accesible (sistema A: la cabecera de `Panel` en `#006e8c` con blanco a 5,82 y la barra de página en `#d99400` con `ink` a 6,95); C, «noche y oro» (identidad A: `#14213d` y `#e0a526`); y D, la de la retransmisión (sistema C: cromo `#0f1d33` y botón dorado `#e8a200`). Eligió **A**, la de los tres jueces.
- **La letra (DD-02)**: la del sistema, Inter variable y la del sistema con Barlow Semi Condensed 600 en títulos y cifras, en una tabla de resultados y un rótulo. Eligió **la del sistema**.
- **La señal de campeón (DD-03)**: la banda de honor (el defecto de entonces, 45,7 de la marca a 13 px), la estrella dorada sobre marino (50,3), el arcoíris del dueño en la diagonal (48,7), la estrella sobre blanco (15,1 y 9,2 en grises), las otras señales con bandas y las variantes literales del 20 de octubre, a 13, 16, 28 y 72 px, sobre blanco y en un pelotón. No eligió ninguna tal cual: pidió el nacional con su bandera y el mundial blanco con una estrella de arcoíris (D-00d), la más cercana a la D con el color del dueño, y al día siguiente de ver su dibujo aceptó la estrella del nacional, el degradado y las letras del país (D-00f).
- **El vocabulario (DD-04)**: doce colores y seis figuras (telefono sin `sash`), catorce y seis (identidad A, 443 permitidos) y diez y seis (sistema). Pidió **quince colores y siete figuras, sin repetir nunca** (D-00e), una opción nueva que §8 midió a 28 px: el peor par de las dicromacias sigue en 12,3, y quedan 515 maillots permitidos (§8.1, `medir28.py`).

### 19.4 La palabra del dueño sobre la señal de campeón

D-27; O-15; I-12 e I-13. Lo que dijo en sus tres días (`00-encargo.md` §7.1, l. 221-224; §7.2, l. 263-278; §7.3, l. 297-310), y qué se hizo con cada cosa:

| Lo que dijo el dueño                                                                                   | Lo que se hizo                                                                                                                                                                                                                                                                                       | Dónde            |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| «con diferentes colores, diferente orden, diferente disposicion, incluso verticales» (20 de octubre)   | medidas una a una con los cuatro criterios: cinco bandas de otros colores, 9,4 de la marca y 1,4 en grises a 16 px (telefono) y 8,7 y 1,5 a 13 (identidad V4); otro orden, 14,1 y 5,3; en vertical o en diagonal, 22,5 y 14,7; la guía de la UCI fija el orden y regula las dos disposiciones: fuera | §9.3             |
| «o que el resto en vez de ser blanco sea de otro color»                                                | sobre navy, 40,7 de la marca pero choca con 4 maillots en protanopía y 5 en deuteranopía; sobre oro, a 17,9 del amarillo de líder: fuera                                                                                                                                                             | §9.3             |
| «creatividad por favor»                                                                                | señales propias sin bandas (la banda de honor, las estrellas, el galón) y su variante más fuerte, el espectro en la diagonal (identidad C, 48,7), como alternativa; la C de telefono, descartada por su medida y no por el SPEC (O-15)                                                               | §9.3, §9.4       |
| «todo el maillot coloreado con los colores y forma de la bandera» (21 de octubre)                      | el nacional es la bandera entera, mangas incluidas, y sin bandera al lado (D-00d)                                                                                                                                                                                                                    | §9.1             |
| «una estrella para que vaya con el logo de cyclingstar... de arco iris??? con el fondo blanco»         | el mundial, blanco con la estrella del logotipo en arcoíris (D-00d)                                                                                                                                                                                                                                  | §9.1             |
| «Me parece bien lo de la estrella... habrá que ver caso a caso para cada uno de los paises soportados» | la estrella dorada del nacional, aceptada, con `NATIONAL_STAR_OVERRIDES` y la hoja de los 133 a 28 y a 72 px en el PR 16a, que mira una vez (D-00f)                                                                                                                                                  | §9.1, §17.18     |
| «quizas prohibir algunas combinaciones... para que no coincidan demasiado parecidos a una bandera»     | la tabla de choques reserva los maillots de equipo a menos de 10 de un nacional, y el editor los tacha con `Too close to the champion of Morocco.` (pantalla; D-00h)                                                                                                                                 | §8.1, §8.4, §8.7 |
| «si pusieramos en el maillot 2 letras con el codigo ISO del pais?»                                     | las dos letras en el pecho del nacional, desde 72 px, donde una letra llega a 12 px; el mundial no lleva (D-00f)                                                                                                                                                                                     | §9.1             |
| «ok, me parece bien en degradado»                                                                      | el espectro del mundial en degradado, aceptado                                                                                                                                                                                                                                                       | §9.1             |
| «en ocasiones tiene que poder verse mucho mayores... la parte de atras del maillot?? y el pantalon?»   | `showcase` (160) y `poster` (320), la espalda y el culote, con las zonas del patrocinador (D-00g); los equipos corren con maillot y culote iguales y aprobados (`00-encargo.md` l. 325-330)                                                                                                          | §8, §9.9, §17.19 |

**Lo que añadió el orquestador, y en qué ha quedado.** Tres cosas, marcadas en D-00d para que el dueño las pudiera quitar: **la estrella dorada en el pecho del nacional**, que el dueño ya ha aceptado (l. 297); sin ella, la bandera sola tendría que decir que es un campeón, un maillot de equipo parecido a una bandera se confundiría con su campeón y la reserva de D-00h tendría que crecer, sin medir cuánto. **El espectro natural en degradado** dentro de la estrella, nunca los cinco colores de la UCI ni en bandas, también aceptado (l. 310); con bandas o con los colores de la UCI, la estrella se acercaría a la estructura de la marca, sin medir a 28 px. **El filo oscuro**, del que el dueño no ha dicho nada: es DD-21, y quitarlo deja la estrella dorada a 2,19:1 del blanco. Y una provisional, la estrella del continental en plata, hasta que E12 decida los continentes.

**Lo que cuesta, medido por §9** (`medir28.py`, a 28 px; nada de esto es asesoramiento jurídico):

- **El mundial blanco con su estrella queda cerca de la marca de la UCI**: a 12,7, 11,6, 11,7 y 12,1 en las cuatro visiones y a 9,2 en grises, tan cerca como el `ChampionMark` de hoy (12,2 a 13 px, re-medido por el juez de cobertura) y mucho más que la banda de honor que el dueño descartó (45,7 y 37,6 en grises a 13 px). Para la distancia dibujada los dos son un maillot blanco con color en el pecho, que es también lo que es la marca; lo que los separa es lo que la distancia no mide: una estrella y no bandas, el espectro y no los cinco colores, sin negro y en diagonal. Mantenerlo pide **reescribir `SPEC.md` l. 874**, que prohíbe imitar «el arcoíris del campeón del mundo», para que nombre las cinco bandas de la UCI (el texto entero, en §17.26), y **verificarlo ante la EUIPO y la USPTO antes del lanzamiento** (§18.3), que es tarea del dueño.
- **La estrella dorada no separa del todo las banderas a 28 px**: 21 maillots de equipo quedan a menos de 10 de 17 nacionales en alguna visión (Portugal, Polonia, Kazajistán, Lituania, Bielorrusia, Bulgaria, China, Marruecos, Argelia, Vietnam, Azerbaiyán, Kirguistán, Baréin, Burkina Faso, Omán, Montenegro y Macao), el peor Marruecos frente a `plain.red` (6,3 en visión normal, 4,3 en deuteranopía y en tritanopía, 3,1 en grises). Por D-00h la tabla de choques los reserva, entre ellos **`plain.red`, `plain.green`, `plain.teal` y `plain.taupe`**: ningún equipo puede vestir de rojo, verde, turquesa o topo lisos. Y **Indonesia y Mónaco visten igual** (dos bandas, roja y blanca): los separan sus letras desde 72 px y, por debajo, el texto (`Champion of Indonesia`, pantalla).
- **La alternativa de DD-07 ya no cabe**: no traducir los maillots de hoy dejaría los gemelos (220 carreras con dos maillots idénticos), que D-00e prohíbe; por eso DD-07 está cerrada y solo queda su cuándo.

### 19.5 Cuándo hace falta cada respuesta

| Antes del PR   | Decisión                                                                              |
| -------------- | ------------------------------------------------------------------------------------- |
| ya contestadas | DD-01 y DD-02 (el 7 las lleva), DD-03 y DD-04 (el 16a), DD-07 (el 17b)                |
| 2              | DD-16, Playwright en el CI                                                            |
| después del 1  | DD-17, los clones, con la consulta del PR 1 delante                                   |
| 5              | DD-15, cuándo se ofrece instalar                                                      |
| 12b            | DD-06, el dorsal del equipo líder                                                     |
| 13b            | DD-10, las palabras de la llegada (después, otro PR con los bancos), y DD-11, el TSS  |
| 16a            | DD-21, el filo de las estrellas                                                       |
| 17a            | la respuesta a la hoja de los 133 nacionales (D-00f) y DD-22, el ribete del excampeón |
| 18a            | DD-08, el NPC cede, y DD-09, la espera                                                |
| 19b            | DD-12, la moral                                                                       |
| 20             | DD-13, la barra en `Watch`, con E6                                                    |
| 21j            | DD-18, la línea `Your country: …`                                                     |
| 23             | DD-14, la regla de la app nativa                                                      |
| 24             | DD-20, la prueba del dueño, que es la puerta                                          |
| con E8         | DD-19, el nombre del patrocinador, y DD-23, las zonas                                 |
| ninguno        | DD-05, el modo oscuro                                                                 |

---

**Injertos aplicados.** I-12 (§19.3 y §19.4: la banda de honor, alternativa que el dueño descartó, con sus cifras), I-13 (§19.4: las variantes del dueño con los cuatro criterios y su espectro en la diagonal como alternativa), I-16 (§19.2: el NPC cede, DD-08), I-22 (§19, entera: cada decisión con su defecto, su porqué y lo que cambia).

**Objeciones resueltas.** O-15 (§19.4: la C de telefono, descartada por su medida), O-19 (§19.2: la espera y el NPC, DD-09 y DD-08), O-20 (§19.2: la moral, DD-12, con sus alternativas), O-21 (§19.2 y §19.4: DD-07, con el pasado intacto y ahora cerrada por D-00e), O-23 (§19.2: cada decisión con lo que cambia si el dueño dice lo contrario y antes de qué PR).

**Huecos rellenados.** H-06 (§19.2: la línea `Your country: …`, DD-18), H-13 (§19.2: la prueba del dueño como puerta, DD-20), H-21 (§19.2: los clones de producción, DD-17).

**Decisiones de esta sección.**

- 19-a (del dueño). DD-21, el filo oscuro de las dos estrellas: por defecto se queda; lo añadió el orquestador y el dueño no lo ha comentado.
- 19-b (del dueño). DD-22, el ribete del excampeón: por defecto no; el dueño no ha hablado de los excampeones y el ribete real son las bandas de la UCI.
- 19-c (del dueño). DD-23, las zonas del patrocinador: por defecto E3 las da como interfaz y no vende ninguna; el reparto es del dueño con E8.
- 19-d. DD-07 pasa a cerrada: D-00e no deja dos equipos con el mismo maillot y hoy hay gemelos, así que la alternativa de no traducir desaparece y solo queda cuándo.
- 19-e. DD-03 y DD-04 se dan por contestadas con D-00a a D-00h; lo que de ellas puede volver al dueño (la hoja de los 133 y una puerta que falle) lleva su PR en §19.5.

---

## 20. Apéndices: injertos, objeciones, cobertura y vocabulario

Estos apéndices dicen de dónde sale cada pieza del documento y dónde cayó, para que `docs/visual.md` se lea sin el rastro de `docs/diseno/e3-visual/`. Salen de `juicios/veredicto.json` y de los bloques de cierre de §1 a §19. La base es `telefono`, elegida por los tres jueces (96,5 puntos de 120 sumados, frente a 87,5 de `sistema`, 86,5 de `lectura` y 71,5 de `identidad`), fundida con el sistema que se hace cumplir de `sistema`, los maillots de `identidad` y lo que hay debajo del examen de `lectura` (D-01).

### 20.1 A. Los injertos y dónde cayeron

| Injerto | De                       | Qué                                                                             | Dónde cayó                         |
| ------- | ------------------------ | ------------------------------------------------------------------------------- | ---------------------------------- |
| I-01    | sistema §0, §2, §12      | el tema cerrado al final, `vocabulario.test.ts`, `deuda.json`, `ui/1` a `ui/10` | §5.1 a §5.3, §16.2, §17.10, §17.24 |
| I-02    | sistema §13              | la cola larga por deuda, en diez PR                                             | §17.23                             |
| I-03    | sistema §2.4, §4         | `data-*`, sin `className`, `/_ui` y los seis re-sellos                          | §4.1, §5.4, §16.1, §16.3           |
| I-04    | sistema §5, §12          | la prueba sobre `/_ui` en cada PR y el rendimiento cada noche                   | §7.4, §7.5, §16.5                  |
| I-05    | identidad §6.2, §13      | `ensureKits` en el tick, sin `NOT NULL`                                         | §8.5, §17.19                       |
| I-06    | identidad §6.2           | los contratos que ganan `kit`                                                   | §8.5                               |
| I-07    | sistema §3.5, §6.3       | la tabla de choques precalculada, con huella                                    | §8.4, §16.2                        |
| I-08    | lectura §1.5, §7.5       | la vista previa del plan vivo; `PUT /plan` conserva el `startDay`               | §10.6, §11.2, §11.5                |
| I-09    | lectura §9               | `response` obligatorio, la resolución en el tipo, el testigo de la moral        | §13.2                              |
| I-10    | sistema §3.1             | el ámbito oscuro                                                                | §3.3, §14.1, §14.3, §14.5, §14.6   |
| I-11    | sistema §8, lectura §8.2 | el service worker no toca `/api/*`, `/health` ni `/api/auth/*`                  | §12.3                              |
| I-12    | identidad §6.5, D3       | la banda de honor, que fue el defecto y el dueño descartó (D-00d)               | §8.1, §9.4, §19.3, §19.4           |
| I-13    | identidad §6.5, D3       | las variantes del dueño con los cuatro criterios y su espectro en la diagonal   | §9.3, §19.4                        |
| I-14    | identidad §6.2, §6.6     | `team_kits` con historia; el patrocinio con `set_by`                            | §8.5, §9.9                         |
| I-15    | identidad, sistema       | la traducción por parecido y `legacyJerseyStyle`                                | §8.6                               |
| I-16    | identidad §6.3, D7       | el NPC cede                                                                     | §8.6, §19.2                        |
| I-17    | lectura, sistema         | la ficha de corredor                                                            | §4.6                               |
| I-18    | sistema, lectura         | el dorsal y el equipo en `RiderLabel`                                           | §4.6                               |
| I-19    | lectura §4.2             | el vocabulario de pantalla con su columna de lo que nunca se escribe            | §4.10                              |
| I-20    | lectura §7.5             | la portada habla del plan                                                       | §11.7                              |
| I-21    | sistema §3.3             | la densidad por puntero                                                         | §3.5, §6.6                         |
| I-22    | sistema §15              | el formato de las decisiones del dueño                                          | §19                                |
| I-23    | identidad, principio 9   | el material generable como regla                                                | §3.8, §12.2, §14.7, §17.1          |
| I-24    | identidad §6.1, §6.7     | el filete claro sobre oscuro y `surface`                                        | §8.3, §9.10                        |
| I-25    | identidad §6.1, §6.3     | la regla de contraste y el veredicto con equipo y visión                        | §8.1, §8.7                         |
| I-26    | lectura §4.1             | la fila propia anclada                                                          | §4.5, §6.2                         |
| I-27    | lectura §7.4             | `↺ Back to Build`                                                               | §10.5                              |
| I-28    | lectura §7.3             | la tira de siete días                                                           | §10.6                              |
| I-29    | lectura §8.3             | la hora de los datos sin red                                                    | §12.4                              |
| I-30    | sistema §4               | el esqueleto a los 300 ms                                                       | §4.2                               |
| I-31    | sistema §2.5, §3.5       | `colorMath.ts`, fuera del barril                                                | §3.9, §8.4, §16.2                  |
| I-32    | lectura §4.1             | la línea de estado del `PageHeader`                                             | §4.4, §10.1                        |
| I-33    | sistema §4               | `Disclosure`                                                                    | §4.3                               |
| I-34    | lectura §4.1, §7.4       | `TripRow`                                                                       | §4.5, §11.6                        |

### 20.2 B. Las objeciones resueltas y lo desestimado

| Objeción | Contra telefono                                          | Se resuelve en                                                            |
| -------- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| O-01     | `teams.kit` no nulo con relleno en la migración          | §8.5: `team_kits` aparte y ninguna columna `NOT NULL`                     |
| O-02     | `black-translucent` sin área segura                      | §12.2: la barra de estado en `default`                                    |
| O-03     | el 500 del esquema de respuesta                          | §13.4 y §17.21: `responses.test.ts` y tres PR                             |
| O-04     | `exposes` no comprueba nada                              | §13.2: `response` en `registerSpoilerGuard`                               |
| O-05     | el canario barre todas las POST                          | §13.2: solo las de lectura, en `CANARY_POST_READS`                        |
| O-06     | nada impide reinventar                                   | §5.1 a §5.3: el cierre, la deuda y las diez reglas sobre todo `src/`      |
| O-07     | falta la cola larga                                      | §17.23                                                                    |
| O-08     | el sprite, por Vite y con huella                         | §12.7                                                                     |
| O-09     | `PREVIEW_RACE_DAY_TSS` es constante de juego             | §11.3 y §15.3: en el motor, sin subir la versión                          |
| O-10     | el desfase de semanas                                    | §10.6 y §11.2                                                             |
| O-11     | Playwright y axe-core no son dependencias                | §7.6 y §17.4                                                              |
| O-12     | `KIT_MIN_PX` = 16 cambia `Watch`                         | §8.3 y §14.4: el dueño fijó 28 (D-00b), y la barra pinta por equipos      |
| O-13     | la precarga de 80 ficheros                               | §12.3: los destinos de la barra, con tope y `Save-Data`                   |
| O-14     | la señal conserva el cuerpo blanco                       | §9.2: el dueño eligió el blanco con su estrella, y su coste queda escrito |
| O-15     | el descarte de la C estira el SPEC                       | §9.3 y §19.4: descartada por su medida                                    |
| O-16     | falta la ficha de corredor                               | §4.6                                                                      |
| O-17     | `RiderLabel` sin dorsal ni equipo                        | §4.6                                                                      |
| O-18     | ni previa ni cierre, ni el resumen de la capa fija       | §14.3 y §14.6                                                             |
| O-19     | la espera y el NPC, fuera de las decisiones              | §8.7 y §19.2 (DD-08 y DD-09)                                              |
| O-20     | la moral en palabras sin decisión                        | §13.7 y §19.2 (DD-12)                                                     |
| O-21     | repintar las etapas grabadas                             | §8.6 y §19.2: el pasado no se repinta                                     |
| O-22     | `Your training queue is empty` a quien tiene sus bloques | §11.7                                                                     |
| O-23     | decisiones sin consecuencia                              | §19.2                                                                     |
| O-24     | el nombre del patrocinador, texto libre                  | §9.9: una lista cerrada, desde 72 px                                      |
| O-25     | sin `Sash` hay que volver a medir                        | §8.1, §8.2 y §16.4: medido a 28 px, y las carreras en la puerta           |
| O-26     | el mundo de la prueba sin definir                        | §7.2 y §17.4                                                              |
| O-27     | la lista de pantallas                                    | §7.3                                                                      |
| O-28     | el enlace del nombre mide 20 px                          | §4.5 y §6.2: la celda entera, de 44                                       |
| O-29     | lo fijo sin orden ni tope                                | §4.9                                                                      |
| O-30     | los rótulos medidos con Inter                            | §6.3: el plan B por debajo de 340 px                                      |
| O-31     | ningún estado solo en color, sin mecanismo               | §3.2 y §4.7: tono, icono y texto en el tipo                               |
| O-32     | dos instrucciones para el mismo tramo                    | §10.4: una instrucción fija por tramo                                     |
| O-33     | el escritorio sin columnas                               | §6.1: la prioridad de cada columna                                        |

**Lo desestimado**, de cada propuesta (lo que las decisiones dejan descartado):

- **De `telefono`**: `teams.kit` en `jsonb` (D-22); `exposes` (D-54); `black-translucent` (D-45); precargar los 80 ficheros (D-46); `KIT_MIN_PX` = 16 (D-21; el dueño, 28); los códigos de origen en inglés (D-38); las «semanas `base`» del modo entrenador (D-35); repintar lo grabado (D-23); `PREVIEW_RACE_DAY_TSS` en `shared` (D-37); el nombre del patrocinador desde 40 px (D-30); «génesis y tres días» (D-18); y las tres franjas de su C, por su medida (D-27).
- **De `sistema`**: ser la base (D-01); sus nueve valores oscuros (D-04); diez colores y siete figuras (D-20); la estrella dorada sobre marino (D-26); `teams.jersey_design` (D-22); el verde y el azul de líder oscurecidos (D-28); «en modo entrenador no hay pronóstico» (D-35); `.strict()` en los tests (D-54); y el presupuesto de 255 KB (D-50).
- **De `identidad`**: la columna fija que se desplaza (D-16); `Leader` en la tabla de equipos (D-29); el aviso a los 10 s (D-11); la banda de 7 u en `#bbf7d0` (D-28); `data: 'public' | 'owner' | 'derived'` (D-54); `{ card, size, surface }` (D-31); las banderas en `public/flags/` (D-49); el nombre desde 64 px y comprar la figura (D-30); y la escala invertida (D-42).
- **De `lectura`**: sus quince colores con `rosa` y `gris`, a 1,6 en deuteranopía (D-20); validar por ámbito (D-24); la prueba a mano antes de fusionar (D-18); los códigos `order` y `empty` (D-38); `teams.jersey` (D-22); la instrucción que nombra la semana (D-42); y el nombre del patrocinador desde 28 px (D-30).
- **Del dueño, el 21 de octubre**: la banda de honor (el defecto de D-26) y los doce colores y seis figuras (el de D-20), que sustituyen D-00d y D-00e.

### 20.3 C. La cobertura del encargo

| Lo que pide el encargo (`00-encargo.md`)                                                                                                                                                                                                                                                              | Dónde se cumple                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| §1.1 el sistema visual: letra, paleta, densidad, jerarquía, rejilla, componentes y estados                                                                                                                                                                                                            | §3, §4, §5                                                                                              |
| §1.2 el teléfono como criterio de aceptación, y la prueba que revisa la app nativa                                                                                                                                                                                                                    | §6, §7; §12.8                                                                                           |
| §1.3 el daltonismo: forma además de color                                                                                                                                                                                                                                                             | §3.2, §8.1 a §8.4, §9                                                                                   |
| §1.4 los maillots: la señal de campeón, el editor y el vocabulario, y lo que compra un patrocinador                                                                                                                                                                                                   | §9.1 a §9.6; §8; §9.9                                                                                   |
| §1.5 la web instalable                                                                                                                                                                                                                                                                                | §12                                                                                                     |
| §1.6 el examen: los tres defectos del cuadro y los dos del viaje                                                                                                                                                                                                                                      | §10, §11                                                                                                |
| §1.7 la regla de la frontera                                                                                                                                                                                                                                                                          | §13                                                                                                     |
| §1.8 el material generable                                                                                                                                                                                                                                                                            | §3.8, §12.2, §14.7, §17.1                                                                               |
| §2, sus nueve filas: E2 en producción; el `ChampionMark` provisional; las doce semillas y los cinco patrones; el viaje, arreglado en el dato; el techo en códigos; `raceId: null` y el `tsb`; las cinco etiquetas y la precedencia; Tailwind v4 sin `tailwind.config`; la web instalable, inexistente | §14; §9.1 y §9.10; §1.8, §8.7 y §8.9; §11.6; §13; §11.2 y §13.5; §10.4 y §10.5; §3.9 y §5.1; §1.7 y §12 |
| §7.1 el «maillot arco iris diferente» del dueño (20 de octubre)                                                                                                                                                                                                                                       | §9.3, §19.4                                                                                             |
| §7.2 la paleta, la letra, el campeón, los 28 px, el vocabulario y la identidad del corredor (21 de octubre)                                                                                                                                                                                           | §3.1 y §3.4; §9.1; §2.7 y §8.3; §8.1; §4.6                                                              |
| §7.3 la estrella país a país, las dos letras, la reserva de las banderas, el maillot en grande y el degradado (21 de octubre)                                                                                                                                                                         | §9.1, §9.5 y §16.2; §8.4; §17.19; §19.4                                                                 |
| los siete componentes del encargo: una tabla de resultados, una ficha de corredor, un panel, un aviso, un botón deshabilitado, una carga y un error                                                                                                                                                   | §4.5 y §6.1; §4.6; §4.4; §4.7; §4.1 y §4.3; §4.2; §4.2                                                  |
| las cinco categorías de maillot de `docs/retransmision.md` D.6 (l. 13431): las tres de clasificación, la de campeón y la del equipo                                                                                                                                                                   | §9.7; §9.1; §8 y, el dorsal del equipo líder, §9.8                                                      |

**Los once cambios de `01-fase-propuestas.md`**: el examen no es solo de presentación (§1.10, §11); la frontera se rompe por los números (§13); la semilla del maillot es la identidad del NPC, el clon (§1.9, §8.9, §17.3); gemelos en visión normal, `Watch` y líderes con colores de equipo (§8, §9.7, §14.4); el dorsal del equipo líder no existe (§9.8); el dueño no había hablado del aspecto, las cuatro de gusto (§19.3); la escala de estrellas del SPEC está vieja (§4.6, §13.5, §17.26); el estilo de hoy fue una decisión, el PR #105 (§3.1); ninguna pantalla desborda y el problema es lo recortado, la letra y el dedo (§1.4, §1.5, §6); sin red la web se cae, e iOS 26 (§12.4, §12.6); las banderas son el 91 % de la CSS (§12.7).

### 20.4 D. Los huecos y las contradicciones de hecho

| Hueco | Qué faltaba                                        | Se rellena en                                  |
| ----- | -------------------------------------------------- | ---------------------------------------------- |
| H-01  | los rivales de temporada                           | §8.4: `seasonRivals` y `fieldTeamsFor`         |
| H-02  | `jerseySeed` cruzando la frontera                  | §8.5 y §13.5: sale en el 19c, con `legacySeed` |
| H-03  | el barril de `packages/shared` en el arranque      | §12.7 y §17.8: `sideEffects`, con su condición |
| H-04  | los planes ya solapados en producción              | §11.5: la `0051`                               |
| H-05  | el resumen accesible de la capa fija               | §14.3                                          |
| H-06  | la línea `Your country: …`                         | §19.2 (DD-18)                                  |
| H-07  | el título más largo en el rótulo                   | §14.5, §16.2 y §16.5                           |
| H-08  | la pantalla de órdenes                             | §18.3 y §17.23                                 |
| H-09  | la 7-h de E2 y la bandera del nacional             | §9.6                                           |
| H-10  | los lunares, la serifa y la verificación de marcas | §18.3                                          |
| H-11  | la edad en el rótulo                               | §14.8                                          |
| H-12  | los documentos que E3 corrige                      | §17.26                                         |
| H-13  | un teléfono de verdad                              | §7.7, §7.8 y §19.2 (DD-20)                     |
| H-14  | lo real y lo generado                              | §4.7                                           |
| H-15  | el mundo de prueba reproducible                    | §7.2                                           |
| H-16  | el teclado virtual y el teléfono de lado           | §4.9, §6.5 y §7.8                              |
| H-17  | la letra ampliada                                  | §7.8 y §16.5                                   |
| H-18  | los tonos de estado entre sí                       | §3.2                                           |
| H-19  | el lector de pantalla en un teléfono               | §7.7 y §18.2                                   |
| H-20  | la carga del día de carrera sin contrastar         | §11.3 y §16.2                                  |
| H-21  | el clon en producción y `teamIndexFromSeed`        | §8.9, §17.3 y §19.2 (DD-17)                    |

**Las contradicciones de hecho** entre propuestas, con lo que comprobaron los jueces, quedan escritas donde se usan: X-02 (doce colores sí caben para un daltónico), X-08 (el `not null` con relleno no se puede) y X-19 (doce maillots de 16 px son 280 px) en §8; X-13, X-14, X-16, X-17, X-24 y X-25 (la tabla de equipos, el líder de la etapa, las distancias a la marca, un dibujo por título, el patrocinador desde 72 px y la firma de `WornJerseyIcon`) en §9; X-11, X-12 y X-22 (el cierre con `initial`, el lint sobre `.tsx` y los dos recuentos de clases) en §5; X-09 y X-23 (Playwright no es dependencia; «génesis y tres días» no vale) en §7; X-18 y X-20 (los prototipos del cuadro y los contrastes de la escala) en §6, §10 y §3.2; X-05 y X-06 (el desfase de semanas y `applyDailyLoad`) en §11; X-03, X-04, X-07, X-10 y X-26 (la sesión sin red, `HorizonWatcher`, las banderas sin huella, la barra translúcida y la hoja con dos compresores) en §12; X-01 y X-21 (`.strict()` solo mira la raíz; el serializador quita lo anidado) en §13; y X-15 (el resumen de la capa fija no existía) en §14.

### 20.5 E. El vocabulario

Las palabras de la prosa que el cuerpo usa sin definirlas en un solo sitio (el resto, en su sección):

| Palabra                                | Qué es                                                                                                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| la cáscara; el trozo                   | `index.html`, la entrada y su CSS, que el service worker sirve sin red; un fichero de JS de `assets/` que carga una página                                                                                               |
| la sesión desconocida                  | el estado `unknown` de `SessionState`: la petición de sesión falló por red, y no quiere decir que no haya sesión (D-47)                                                                                                  |
| las cuatro visiones; las cinco vistas  | la normal, la protanopía, la deuteranopía y la tritanopía (Machado 2009, severidad 1, en RGB lineal); con los grises, las cinco                                                                                          |
| la distancia dibujada                  | la media por píxel de ΔE00 entre dos maillots dibujados al mismo tamaño, desde D-00b a 28 px (`kitDistance`)                                                                                                             |
| lo reservado                           | lo que ningún maillot de equipo lleva: el cuerpo amarillo, los lunares, la estrella, el cuerpo blanco, y todo maillot a menos de 10 de una señal de líder o de campeón, también de una bandera de campeón (D-00e, D-00h) |
| la tabla de choques                    | `kitConflicts.generated.ts`: para cada maillot, los que le quedan a menos de 10 y la señal reservada que estorba                                                                                                         |
| los rivales de temporada               | los equipos que comparten al menos una carrera de la temporada, por la selección determinista del tick                                                                                                                   |
| la traducción                          | la primera pasada de `ensureKits`, que da a cada equipo de hoy el maillot permitido más parecido a su aspecto (D-23)                                                                                                     |
| la semilla de identidad; la del dibujo | `teams.jersey_seed`, con la que `seedWorld` reconoce al NPC y que no se reescribe; `teams.jersey_style_seed`, la elegida por el mánager, del paso 1 al 19c                                                               |
| el clon                                | el NPC que el tick creaba al cambiar la semilla de identidad de un equipo (mapa 03 §2.2)                                                                                                                                 |
| el maillot llevado                     | el único que se ve de un corredor (`WornJersey` de E2): el de líder, el de campeón o el de su equipo                                                                                                                     |
| el plan vivo                           | el plan de bloques cuyo `start_day` cae en los 28 días que acaban hoy; solo hay uno (D-39)                                                                                                                               |
| el número interno; la resolución       | un valor que el jugador no ve nunca (un atributo con decimales, CTL, ATL, TSB, TSS, un techo); la forma en que cruza (estrella, tramo, palabra, barra o flecha)                                                          |
| u                                      | la unidad del `viewBox` de 48 de `TORSO`: px = u × tamaño / 48                                                                                                                                                           |

**Los nombres que cambian respecto del glosario**, por las decisiones del dueño y las de las secciones: `ChampionSash` es `ChampionJersey` (9-g); `KitSize` es `28 | 40 | 48 | 72 | 96 | 160 | 320` y `KIT_CHECK_SIZES` es `[28]` (D-00b, D-00g); salen las entradas de la banda de honor y de la banda nacional, `SASH_STRIPES`, `CHAMPION_NIGHT`, `CHAMPION_PAPER` y `NATIONAL_SASH*` (D-00d), y entran `NATIONAL_STAR_OVERRIDES` y las dos letras del país (D-00f); `kitWorld.bench.ts` es `kitWorld.long.test.ts` (16-c); la prueba de cada noche es `nocturno.spec.ts` y no `rendimiento.spec.ts` (16-d); `champion.test.ts` vive en `packages/db` (9-h); `legacyJerseyStyle` vive en `packages/shared/src/legacyJersey.ts` y `LegacyJersey` en `ui/legacyJersey.ts` (§8, duda 2); `assignKits` es la parte pura del reparto dentro de `ensureKits`; y la deuda inicial son 2.740 apariciones en 183 clases, no 2.457 (5-b).

**Los alias de las propuestas** (§G.13), que solo aparecen aquí: `SaveBar` es `ActionBar`; `FormScale` y `BandScale`, `Scale5`; `DataTable`, `RankTable`; `RowList`, `List` y `ListRow`, `ActionRow`; `RiderIdentity` y `RiderTag`, `RiderLabel`; `Section`, `Panel`; `PageTitle`, `PageHeader`; `LoadingState` y `Loading`, `Skeleton`; `Toast`, `UpdateToast`; `LevelBar`, `SegmentMeter` y `Bar`, `Meter`; `Stars`, `StarRating`; `Fact`, `Stat`; `Explain`, `InfoButton`; `KitIcon`, `TeamJersey` y el `Jersey` de hoy, `Kit`; `ChampionJersey` de sistema y el `ChampionMark` de hoy, el `ChampionJersey` de §9; `teams.kit`, `teams.jersey_design` y `teams.jersey`, `team_kits`; `jerseyVocabulary.ts`, `kit.ts`; `jerseyConflicts.ts`, `kitConflicts.generated.ts`; `jerseyClash`, `checkKit` y `kitDistance`; `assignJerseys` y `assignKit`, `assignKits`; `JERSEY_PX`, `KIT_PX`; `JERSEY_DISTINCT` y `JERSEY_MIN_DE`, `KIT_MIN_DISTANCE`; `JERSEY_CHANGE_DAYS`, `KIT_CHANGE_COOLDOWN_DAYS`; `KIT_TEXT_MIN_PX`, `KIT_SPONSOR_TEXT_MIN_PX`; `maillot_reservado` y `maillot_parecido`, `kit_reservado` y `kit_se_confunde`; `jersey_status` y `kit_status`, la historia de `team_kits` con `set_by`; `exposes` y `data`, `response`; `FRONTERA_SIN_LECTOR` y `FRONTIER_EXCEPTIONS`, `FRONTERA_SIN_USO`; `noRawPalette.test.ts` y `contrast.test.ts`, `ui/6` y `tokens.test.ts`; `scripts/ui-telefono.mjs`, `telefono.spec.ts`; `pantallas.yml`, `nocturno.spec.ts`; `SW_NAV_TIMEOUT_MS`, `NAV_TIMEOUT_MS`; `INSTALL_HINT_VISIT`, `INSTALL_HINT_AFTER_SESSIONS`; `ARRIVAL_BANDS` y `ARRIVAL_SCALE`, `ARRIVAL_ORDER` y los tokens `arrival-*`; `ink-soft` e `ink-muted`, `ink-2` e `ink-3`; `page`, `sunken`, `band` y `surface-sunken`, `canvas` y `surface-2`; `action` y `link`, `accent`; `positive`, `negative`, `warning`, `success` y `danger`, `good`, `bad` y `warn`; `focus-dark`, el `focus` del ámbito oscuro; los `brand-*` de hoy, `navy`, `navy-dark`, `cyan` y `gold`; y la figura `Sash` de telefono es la `sash` de §8.1, que vuelve al vocabulario porque ya no es la señal de campeón.

---

**Injertos aplicados.** Ninguno propio: §20.1 dice dónde cayeron los 34.

**Objeciones resueltas.** Ninguna propia: §20.2 dice dónde se resolvieron las 33.

**Huecos rellenados.** Ninguno propio: §20.4 dice dónde se rellenaron los 21.

**Decisiones de esta sección.**

- 20-a. Las palabras de carga se escriben siempre tras `Load:` (10-b), y así conviven con el `Easy` y el `Hard` de la intensidad y con el `Steady` de la flecha de la tendencia (§13, duda 1) sin cambiar ningún texto de hoy: la regla de una palabra por cosa (D-15) se cumple con la palabra y su rótulo.
- 20-b. El apéndice de vocabulario define solo lo que el cuerpo usa sin definir en un sitio, y lista los nombres que cambiaron respecto del glosario, para que `docs/visual.md` se lea sin `borrador/`.
