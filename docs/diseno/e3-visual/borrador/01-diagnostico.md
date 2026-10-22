## 1. Diagnóstico medido: el juego visto desde un teléfono

Esta sección dice qué falla hoy, con la cifra de quien la midió y la captura donde se ve. No propone nada: cada punto remite a la sección que lo arregla. Las líneas de código son las de `58c14da`, que el árbol de trabajo no cambia fuera de `docs/` (`git diff --stat 58c14da HEAD -- apps packages`, vacío). Las cifras salen de los cinco mapas, de las propuestas y de los jueces, y no se han vuelto a medir: cuando aquí algo está medido, lo midió quien se cita, con el instrumento que se nombra.

| Punto | Qué falla                                       | Dónde, en el código                                                                 | La cifra                                                                                              | Capturas           |
| ----- | ----------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------ |
| 1.2   | el marco se come la pantalla                    | `Header.tsx` l. 110-117; `BottomNav.tsx` l. 44 y 54                                 | 148 de 800 px, el 18,5 %; `Watch` empieza a 328 px                                                    | 01, 08, 09, 15     |
| 1.3   | la respuesta lejos y la acción al final         | `PlanLadder.tsx` l. 125-219; `Training.tsx` l. 324; `MyRaces.tsx` l. 246-254        | la respuesta a 1.060 px; la página, 6.807; la inscripción, 19.914                                     | 01, 03             |
| 1.4   | lo que no cabe se corta                         | `Panel.tsx` l. 22; `BottomNav.tsx` l. 54 y 59; `HallOfFame.tsx` l. 91               | una tabla de 460 px en 336; `Dashb…` (pantalla); siete columnas que se desplazan sin indicio          | 14, 15, 23, 24     |
| 1.5   | la letra, el dedo y el contraste                | `BottomNav.tsx` l. 54; `ProfileStrip.tsx` l. 70 y 161; `Panel.tsx` l. 25-26 y 38-39 | letra de unos 4 a 11 px; 34 de 42 campos a 14 px; objetivos de 13 a 20 px; 2.816 nodos de axe         | 08, 15, 25, 28     |
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

- **Letra**: la más pequeña de `main` está en las cotas del perfil de `Watch` (`ProfileStrip.tsx` l. 70 y 161; capturas 08, 09 y 35): el mapa 05 las dio en 8 px con `getComputedStyle`, que no escala el SVG, y en pantalla son 9 y 8 unidades de un `viewBox` de 600 pintado a 310 px, unos 4 y 5 px (medido por el refutador de uso con `getScreenCTM()`, Ruso-039; §14.4). Después, de 10 px en 04, 14, 15 y 25, y de 11 en 02, 03, 11, 19 y 24; la barra inferior, a 11 px, es la letra más pequeña de casi todas las páginas (mapa 05 §2). El 40 % de los tamaños de letra del código (287 de 710) son de 12 px o menos (mapa 01 §2.2).
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
- **Sin red** (mapa 05 §13; capturas 48 a 51): un enlace a una página cuyo trozo no se había cargado sustituye la web entera por la barrera de error (`main.tsx` l. 22-30); volver a una página visitada la pinta de la caché sin avisar; una página con su trozo y sin datos dice `Loading…` (pantalla) para siempre; y recargar da la página de error del navegador. Y una sesión que no llega por falta de red se lee como «sin sesión» (`ProtectedRoute.tsx` l. 12-13): si se vuelve a pedir sin red, quien la tiene acaba en `Log in` (telefono §1, punto 6; juez de código, C3).
- **Nada instalable** (mapa 05 §14): `apps/web/public/` solo tiene `favicon.svg`; no hay manifiesto, ni iconos, ni service worker, ni `theme-color` (`index.html` l. 1-19). Se queda así: el dueño ha retirado la web instalable de E3 porque hará una app (D-00p).

Lo arreglan §12 (sin red, el peso y la primera pintura) y los estados de §4.2. Recargar sin red seguirá dando la página de error del navegador, porque sin service worker no hay cáscara guardada (D-00p).

### 1.8 Los maillots

- **La equipación no se guarda: se deriva** de la semilla y del orden de la paleta (`visuals.ts` l. 29-31 y 71-83): un color más en `JERSEY_COLORS` cambia la base de 102 de los 219 equipos y repinta también lo grabado (mapa 03 §2.3).
- **Gemelos**: dibujadas con el rasterizador de telefono, las equipaciones de hoy tienen algún par a menos de 10 de ΔE00 en 303 de las 310 carreras en visión normal y en las 310 en las tres dicromacias, a 13 y a 16 px (telefono §1, punto 7, y §6.2). El mapa 03 §3.2, que cuenta solo patrón y color de base, da 302; y 220 de las 310 tienen dos maillots idénticos del todo.
- **El tamaño real es 13 px**: en `Watch` el maillot es lo único que identifica a cada corredor de un grupo de cuatro a doce (`GroupBar.tsx` l. 242), y a ese tamaño una raya de `stripes` mide 0,81 px (mapa 03 §1.3); en la general, los de líder miden 15 × 15 (mapa 05 §7). El dueño fijó el mínimo el 21 de octubre de 2026: «los maillots creo que nunca deberian mostrarse a 13 o 16 pixels, minimo 28 pixels e incluso eso ya es muy pequeño...» (`00-encargo.md` §7.2, l. 274-275). Desde ahí ningún maillot se pinta por debajo de 28 px (D-00b, que sustituye a D-21; §7.1, comprobación 10).
- **Los líderes comparten color y figura** con las equipaciones: el verde y el azul de líder están en `JERSEY_COLORS` y la banda es el patrón de 44 equipos; a 13 px, cinco equipaciones quedan a menos de 10 del verde en visión normal y 88 en grises (mapa 03 §4.1). El dorsal del equipo líder no se pinta (mapa 03 §4.2).
- **El campeón solo se ve en `Watch`** (el `ChampionMark` provisional, `Jersey.tsx` l. 135), y no habrá campeones hasta el primer nacional: el de ruta de 111 de los 133 países se corre el día 179 (mapa 03 §5).
- **La marca**: el registro que encontró el mapa 03 es el del logotipo de la UCI (IR 1276964, clases 12, 25 y 41), no el de las bandas solas (mapa 03 §7.1); lo que hace falta verificar está en §18.

Lo arreglan §8 y §9.

### 1.9 El clon, un defecto vivo de producción

`seedWorld` corre en cada tick (`tick.ts` l. 265) y reconoce los equipos que ya existen por su `jersey_seed` (`world.ts` l. 459-468); `teamIndexFromSeed` saca de esa misma semilla el índice del equipo (l. 542-545). Y el selector del maillot de `/team/identity` escribe la candidata elegida en `jersey_seed` (`updateOwnedTeam`, `teamControl.ts` l. 182-186). Medido por el mapa 03 §2.2 en PGlite: al equipo continental `Menghu Cycling` se le pone dueño y la cuarta candidata, se pasa un tick, y el mundo pasa de 219 equipos y 3.900 corredores a 220 y 3.912, con un NPC nuevo, también `Menghu Cycling`, con la semilla vieja y doce corredores. Ningún test lo cubre: ningún test de `packages/db` ni de `apps/api` llama a `updateOwnedTeam`, y los 17 de `packages/db/src` que nombran `jerseySeed` solo lo usan como dato de prueba (por ejemplo `cast.test.ts` l. 259; contado con `grep` sobre los `*.test.ts`). En producción hay como mucho un clon: el dueño cambió el maillot de un solo equipo y no hay más jugadores que él (D-00q). El arreglo es el paso 1 del plan, pequeño e independiente de todo lo demás, y el mismo paso borra el clon que exista (D-32 y D-00q; §8.9 y §17.3).

### 1.10 El examen y la frontera, debajo de la pantalla

El examen no es solo de presentación (`01-fase-propuestas.md`, cambio 1):

- **La vista previa inventa en las vueltas**: proyecta cada día de carrera como `descanso_activo` de 25 TSS (`riders.ts` l. 449-451), cuando una etapa medida cargó 252,8; en el mundo de prueba da `Spot on` (pantalla) a 17 de las 18 etapas de Race France del horizonte (mapa 02 §3). Y no dice de qué carrera habla: `raceId: null` siempre, con el `tsb` en número, que la pantalla no enseña (`riders.ts` l. 477).
- **El panel de los 28 días no enseña los bloques**: rellena el día sin orden con `defaultCoachPlan` (`trainingPlan.ts` l. 37), un ciclo de 14 días que el tick ya no usa y que coincide con lo que entrena el bloque en 88 de 350 casos (mapa 02 §1).
- **Los planes solapados**: guardar la escalera dos días distintos deja dos filas; la pantalla lee una y el tick entrena la otra (mapa 02 §2, medido en PGlite).
- **El desfase de semanas** (lectura §1.5; cierto para los tres jueces, X-05): la vista previa cuenta las semanas desde mañana (`blocks[Math.floor(i / 7)]`, `riders.ts` l. 453) y el tick desde el día del guardado (`train.ts` l. 216), así que a partir del día siguiente la escalera y lo que se entrena van desplazados.
- **La frontera se rompe por los números** (mapa 02, resumen): ningún oculto del SPEC §3.4 cruza, pero los diez atributos viajan con decimales para cualquier corredor (`GET /api/riders/:id`), y `tsb`, `ctl` y `atl` viajan en la vista previa y en el diario.

Lo que el dueño vio de esto está contado, no citado: que arriba y abajo pueden decir cosas distintas sin que se sepa cuál manda y que no se entiende `Day 182 · You'll arrive: Rusty` ([DUEÑO 12], `docs/agenda.md` l. 1560-1563), y «el jugador ve un día de viaje antes de la carrera y ninguno después, que es exactamente lo que reportó el dueño» ([DUEÑO 13], `docs/encargos.md` l. 286-287), cuyo dato se arregló el 26 de septiembre de 2026 y cuya presentación sigue (captura 02: `On your programme` no nombra el viaje). Lo arreglan §10, §11 y §13.

### 1.11 Lo que está bien y se queda

| Qué                                      | Dónde                                                                                                                                                                | Por qué se queda                                                                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| el patrón ARIA de las pestañas           | `Tabs.tsx` l. 153-222, con índice móvil y flechas (l. 172-210)                                                                                                       | es el único `tablist` bien hecho de la web; `Tabs` (§4.4) lo conserva y cambia el aspecto                                                    |
| `RiderName`                              | `RiderName.tsx` l. 15-41                                                                                                                                             | humanos en negrita y bots en cursiva ([DUEÑO 24]) y el subrayado punteado que se ve sin ratón ([DUEÑO 6]): pasan a `RiderLabel` y `TextLink` |
| `ShowAll` y `TOP_ROWS` = 20              | `ShowAll.tsx` l. 10-33                                                                                                                                               | la regla de tablas de `docs/navegacion.md` §7.3, con `aria-expanded`; `RankTable` la usa dentro                                              |
| `StageRoute`                             | `StageRoute.tsx` l. 10-22                                                                                                                                            | el origen y el destino en toda mención de una etapa, pedido por el dueño ([DUEÑO 7], `docs/balance.md` l. 17656, motor v89)                  |
| los siete `aria-live` de `Watch`         | `broadcast/`: `FixedOverlay.tsx` l. 41, `CueCard.tsx` l. 46, `VoiceTicker.tsx` l. 45, `GroupBar.tsx` l. 96, `TimeTrialBoard.tsx` l. 25 y 59, `StageCards.tsx` l. 150 | los dejó E2 con su política (`docs/retransmision.md` §18.8) y D-56 no los toca                                                               |
| el velo de E2                            | `VeilNotice.tsx` l. 19-55; `StageGate.tsx`                                                                                                                           | su lógica es de E2; E3 solo le cambia el aspecto (`Notice`, §4.7)                                                                            |
| la caché inmutable de `assets/`          | `apps/api/src/app.ts` l. 125-144                                                                                                                                     | un año e inmutable con huella, y `index.html` con `no-cache`: el peso y la primera pintura de §12 se apoyan en ella                          |
| el serializador de Zod, ya montado       | `apps/api/src/app.ts` l. 162-163                                                                                                                                     | quita de una respuesta lo que su esquema no declara, también anidado (juez de código, C1): es el mecanismo de §13                            |
| `wearableTitles`                         | `packages/shared/src/jerseys.ts` l. 271                                                                                                                              | la regla de qué título se lleva en qué carrera (el de contrarreloj en las cronos); la señal de §9 la dibuja y no la cambia                   |
| `getRiderTravelDays` y `travelDaysLabel` | `packages/db/src/riderSchedule.ts` l. 175-226, con `returnTravelDaysFor` (l. 128); `labels.ts` l. 157-161                                                            | el viaje de ida y vuelta ya es correcto en el dato; §11 solo cambia cómo se ve                                                               |
| `formatTime` y `money`                   | `apps/web/src/domain/format.ts` l. 4-11 y 14-17                                                                                                                      | los formatos de una diferencia y del dinero que impone el vocabulario de pantalla (§4.10)                                                    |
| la base sin prefijo es la del teléfono   | mapa 01 §2.1: 66 de 6.244 apariciones llevan un corte                                                                                                                | el principio 2.1 no pide reescribir el marcado, solo añadir `sm:` y `lg:` donde haga falta                                                   |

---

**Injertos aplicados.** Ninguno (§B no asigna ninguno a §1).

**Objeciones resueltas.** Ninguna.

**Huecos rellenados.** Ninguno.

**Decisiones de esta sección.** Ninguna. Cita como hechos D-32 y D-00q (el clon y su borrado, §1.9), D-56 (los `aria-live` de `Watch`, §1.11), D-00b (el mínimo de 28 px que fijó el dueño, §1.8) y D-00p (la web instalable, retirada por el dueño, §1.7).
