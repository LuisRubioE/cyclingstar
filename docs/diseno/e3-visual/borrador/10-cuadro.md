## 10. El examen práctico (I): el cuadro de entrenamiento

El cuadro (`/me/training`: `apps/web/src/pages/Training.tsx`, 334 l., que monta `PlanLadder.tsx`, 263 l.) es el examen obligatorio de E3: una pantalla con el motor bien y que no se entiende. Esta sección la redibuja a 360 px con los componentes del catálogo (§4) y nada más (D-40), y cierra lo que se ve de sus tres defectos: la lista de llegadas (D-34), la escala (D-42) y los dos vocabularios con su precedencia (D-40), con la carga en palabras (D-41 y D-00o) y la llegada en palabras que se entienden (D-00n). Lo que la pantalla necesita debajo (la vista previa nueva, `resolveTrainingDay`, el plan vivo y el viaje) es §11. Las líneas de código son las de `58c14da`. Hoy, a 360 px, lo que hace el plan empieza a 1.060 px y `Save day edits` (pantalla) cierra una página de 6.807 (mapa 05 §3; captura 01). El dueño lo contó así ([DUEÑO 12]; `docs/agenda.md` l. 1560-1563): arriba y abajo pueden decir cosas distintas sin que se sepa cuál manda, los dos vocabularios no coinciden y no se entiende `Day 182 · You'll arrive: Rusty` (pantalla).

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
 ★                           Day 50 · S1 · 4h 56m  (◉)    AppHeader 48; Cycling Star, desde 640
 Profile  [Training]  Race orders  My races                 Tabs nav 44
 Training                                                   PageHeader, h1 en page
 Mixed · your plan runs Day 51 to Day 78                    línea de estado, meta ink-2
┌ How you'll arrive ─────────────────────────────────────┐  Panel, data-answer
│ Race Var · .1 · one day                                │  row 600, enlace en bloque de 44
│ Day 52 · in 2 days · travel Day 51 and Day 53          │  meta ink-2
│ [Cooked][■Loaded■][ Fine ][Spot on][Under- ]           │  Scale5, tramos de 36;
│                                    [trained]           │  Spot on con borde good de 2 px
│ ◀ Too much training          Too little training ▶     │  caption ink-3
│ Too much training: you'll start tired. A lighter week  │  meta ink-2: la instrucción
│ before it brings you to Fine or Spot on.               │  del tramo (§10.4)
│ Race Sardegna · .1 · 5 stages                          │
│ Days 56 to 60 · in 6 days · travel Day 55 and Day 61   │
│ [Cooked][ Loaded ][■ Fine ■][Spot on][Under- ]         │
│                                      [trained]         │
│ A little tired: ready to race, not at your best. A     │
│ Taper week before it can make it Spot on.              │
│ Show all 5 races                                    ▾  │  Disclosure, 44
│ Only the start is forecast: later stages depend on     │  caption ink-3
│ how you race them.                                     │
├ Your month ────────────────────────────────────────────┤  Panel
│ ( Coach decides )( ■ Mixed ■ )( I decide )             │  Segmented, 44; una opción que no cabe parte en dos renglones (§4.3)
│ On a day, what wins: race › travel › your edit ›       │  meta ink-2  (ⓘ InfoButton)
│ block › team plan › coach.                        ⓘ    │
│ Week 1 · Days 51 to 57                  [ Build    ▾ ] │  row 600; Field inline select de 48
│  51    52    53    54    55    56    57                │  caption ink-3
│  ✈    Race   ✈    ▮▮▯▯   ✈    Race  Race               │  la tira: 7 celdas de 41 × 48,
│  Out         Back        Out                           │  el icono encima de la palabra
│ 1 training day                                         │  meta ink-2
│ Week 2 · Days 58 to 64                  [ Specific ▾ ] │
│ Race  Race  Race   ✈   ▮▮▮▯ ▮▮▯▯ ▮▮▮▯                  │
│                   Back                                 │
│ 3 training days                                        │
│ Week 3 · Days 65 to 71 ·· Week 4 · Days 72 to 78       │  (igual)
│ Emphasis [ My strength ▾ ]   Intensity [ Normal ▾ ]    │  Field inline, 48
│ Load this month: steady  ▮▮▯▯                          │  Meter
│ Start a new plan tomorrow                              │  Button quiet, 44
├ Edit day by day ──────────────────── Show the 28 days ▾┤  Disclosure, plegado
└────────────────────────────────────────────────────────┘
═ Race Sardegna: Fine (was Loaded)          [ Save plan ] ═  ActionBar 60, data-primary-action
 Dashboard     My Rider       World        News            BottomNav 56: cuatro destinos,
                                                            el agente libre no tiene My Team
```

**Dónde cae cada cosa** (estimado con los tokens de §3 y las alturas de §4): `AppHeader` y `Tabs` ocupan hasta 92 px, el `PageHeader` con su línea de estado hasta unos 176, y el `Panel` de la respuesta empieza hacia los 188, dentro de los 520 de `ANSWER_MAX_TOP_PX`; la primera tarjeta cabe entera antes de los 400 y la segunda asoma en la primera pantalla. La `ActionBar` va fija de 684 a 744, sobre la `BottomNav`, con su botón en el 40 % de abajo (`THUMB_ZONE`). Plegada, la página mide unos 1.700 px, por debajo de los 3.200 de `TOOL_PAGE_MAX_PX`. **Medido** en un prototipo de telefono más simple que esta pantalla (`proto/entrenamiento.html`: sin la tira de siete días ni `TripRow`, con `Coach` por `Coach decides`, la consecuencia de la `ActionBar` en varios renglones y los tramos con 2 px de hueco; reproducido por el juez de uso, C1; X-18): la respuesta a 152 px con 297 a la vista, la acción a 687 de 800, 1.277 px de alto y ninguna falta de la prueba, salvo cuatro enlaces de nombre de 20 px de alto, que aquí no se repiten porque el nombre de cada carrera enlaza en un bloque de 44 px (D-16). Esta pantalla está sin medir: la mide la prueba del teléfono en el PR 14. **Las diez comprobaciones** (§7.1): no hay ancho fijo de texto (1); nada se corta, los nombres de carrera y la cabecera de `TripRow` parten de línea (2); la letra más pequeña es `caption`, 12 px, en los ejes y la tira (3); los `select` van en `body`, 16 px (4); el `Segmented`, los `Field`, los `Disclosure`, `Back to Build` y los enlaces miden 44 o 48 de alto (5); los contrastes son los de los tokens y la escala es `role="img"` con su texto (6); la 7, la 8 y la 9, arriba; y la 10 no tiene maillots que medir en esta pantalla.

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
│▌  [ Endurance ride     ▾ ] [ Normal ▾ ]               │  dos Field inline de 48, en body
│▌Trip to Race Sardegna (IT) · Days 55 to 61 ·          │  TripRow: ida, etapas, descanso, vuelta
│▌7 days off training                                   │
│▌  Day 55 Out · Days 56 to 60 Race · Day 61 Back       │
│ Week 2 · Days 58 to 64 · Specific                     │
│▌Day 62            [Your edit]        ▯▯▯▯ Load: rest  │  borde own; Chip accent
│▌  [ Full rest          ▾ ] [ Normal ▾ ]               │
│▌  ↺ Back to Specific                                  │  Button quiet, 44, icon retry
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

Sus estados (pantalla): **en curso**, `ongoing: true` y `arrival: null`: el renglón 2 dice `Racing now · stage 3 of 5, Gandia → Alcoi`, la etapa que toca, contada con los días de carrera de `days[]`, con su origen y su destino (`StageRoute`, [DUEÑO 7]; las ciudades, ilustrativas), y la escala va en su estado `inactive` (§4.8), sin ningún tramo encendido; **sin dato**, `arrival: null` sin `ongoing`: la escala sin ningún tramo encendido y `Not enough data yet`; **más de tres carreras**: tres a la vista y el resto tras `Show all 5 races` / `Show fewer` (`Disclosure`); **ninguna**: `EmptyState` `No races in the next four weeks. This month is for building.`; **cargando**: `Skeleton` de tres tarjetas de su alto final; **error**: `ErrorState` `Couldn't load your training plan · Try again`; **sin red**: `OfflineState` (§4.2, §12.1). Debajo del `Panel`, siempre, `Only the start is forecast: later stages depend on how you race them.` (pantalla): la llegada a la tercera etapa depende de cómo se corran las dos primeras, que nadie sabe, y por eso no se pinta.

### 10.4 Defecto 2: la escala

Hoy son cinco chapas sueltas de cinco tonos, una por fila, sin orden ni leyenda (`ARRIVAL_LABEL`, `PlanLadder.tsx` l. 63-69), y `Rusty` se lee como «cansado». El dueño: «Rusty no se entiende...ni too fresh... quizas ponle algo como "poco entrenamiento" o "bajo de forma" pero en ingles... claro» (`00-encargo.md` §7.6, 22 de octubre de 2026). **`Scale5`** (§4.8; D-42) pone los cinco tramos en el orden de `ARRIVAL_ORDER`, por TSB de cansado a fresco, con los dos malos en los extremos y el mejor, `Spot on`, en el cuarto, porque los cortes de hoy no son simétricos (DD-10): cinco tramos iguales de 36 px de alto en el ancho del panel (312 px menos cuatro huecos de 4: 59 px cada uno a 360, y 51,2 a 320), los inactivos en `surface-2` con borde `line-strong` y `caption` `ink-2`, el activo relleno de su `arrival-*` con `caption` 700 en `on-arrival` (blanco en el claro), y los ejes debajo, en `caption` `ink-3`, que dicen la causa (D-00n): `◀ Too much training` y `Too little training ▶` (pantalla). **El mejor se ve siempre** (10-g): el tramo `perfecto` lleva, activo o no, un borde de 2 px en `good` en lugar del de 1 px `line-strong`, y el `aria-label` lo dice. **La palabra cabe en dos renglones** (10-h; las medidas, en §4.8): `Spot on` parte por su espacio y `Undertrained` por su guion blando (`Under\u00ADtrained`, U+00AD), en `Under-` y `trained`. Con DejaVu Sans, la letra del CI y la más ancha de las medidas (Inter, DejaVu Sans y Liberation Sans, a 12 px y de 600 a 700), `Undertrained` en una palabra mide hasta 90,1 px, `Spot on` hasta 52,2 y cada mitad hasta 49,1, en un tramo de 51,2 a 320 (49,2 por dentro de su borde de 1 px, y 47,2 en `Spot on`, con el de 2); dos renglones de 16 caben en los 36 del tramo, y los dos ejes caben juntos en un renglón también a 320 (medido por los correctores de L1 y de L2, `docs/diseno/e3-visual/medidas/textos.mjs` y `docs/diseno/e3-visual/medidas/letras2.mjs`). Marca el tramo, no un punto dentro de él: un punto pediría el TSB, que no cruza la frontera (mapa 04, tensión 23; §13). Es `role="img"` con el `aria-label` de §4.8, que lleva la carrera (`Scale5Props.race`): `Race Var: you'll arrive Loaded, 2 of 5, from too much training to too little training; best is Spot on` (pantalla). Los cortes de hoy (`arrivalLabel`, `packages/engine/src/training/projection.ts` l. 75-81) no se tocan, ni el motor ni el código interno, que sigue siendo `oxidado`: solo cambia el texto de pantalla del tramo más fresco, `Undertrained` en lugar de `Rusty` (D-00n, decidido por el dueño). Debajo, **una instrucción fija por tramo**, que empieza por la causa, como los ejes (O-32: la del prototipo, que nombraba la semana, `Make week 1 lighter to arrive Fine.`, pediría una regla y un campo que nadie ha diseñado):

| Código     | Tramo (pantalla) | Puesto      | TSB al amanecer | El activo                          | Instrucción (pantalla)                                                                                      |
| ---------- | ---------------- | ----------- | --------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `fundido`  | `Cooked`         | 1 de 5      | menos de −30    | `arrival-cooked` `#b42318`, 6,57:1 | `Far too much training: you'll start exhausted. Make the week before it a Taper or a Recovery week.`        |
| `cargado`  | `Loaded`         | 2           | de −30 a −10    | `arrival-loaded` `#b45309`, 5,02   | `Too much training: you'll start tired. A lighter week before it brings you to Fine or Spot on.`            |
| `bien`     | `Fine`           | 3           | de −10 a +5     | `arrival-fine` `#566579`, 5,94     | `A little tired: ready to race, not at your best. A Taper week before it can make it Spot on.`              |
| `perfecto` | `Spot on`        | 4, el mejor | de +5 a +25     | `arrival-spoton` `#167a3a`, 5,41   | `The best way to arrive: trained and rested. Keep the plan.`                                                |
| `oxidado`  | `Undertrained`   | 5           | más de +25      | `arrival-rusty` `#1d5fa8`, 6,45    | `Too little training: you'll arrive rested but out of form. Put a Build week two or three weeks before it.` |

Los contrastes, del texto blanco sobre el activo, son los de telefono §3.1, reproducidos por el juez de uso (C5; X-20); el token `arrival-rusty` conserva su nombre, que no se ve. El borde `good` del mejor queda a 5,41:1 sobre `surface` (§3.1). `Cooked` y `Loaded` quedan a 6,3 de ΔE00 en deuteranopía, así que la escala se lee por el puesto y por la palabra, no por el color; el tramo activo queda a 38 o más del inactivo en toda visión (X-20).

### 10.5 Defecto 3: los dos vocabularios y la precedencia

Hoy, arriba, el jugador elige bloques (`Build`, `PlanLadder.tsx` l. 33-39) y, abajo, ve sesiones que salen de `defaultCoachPlan` (`apps/web/src/domain/trainingPlan.ts` l. 37), un ciclo fijo que coincide con lo que entrena el bloque en 88 de 350 casos (mapa 02 §1); la precedencia solo la dice `MODE_WHY` (l. 56-61, pintado en l. 145), que además calla la mitad de la cadena (mapa 02 §2). Con E3 los días salen de `resolveTrainingDay` (§11.4) y la pantalla enseña la regla y el origen de cada día donde se decide (D-40):

**La regla, en una línea**, bajo el `Segmented` y otra vez en la cabecera del día a día, según el modo (pantalla): `Mixed`: `On a day, what wins: race › travel › your edit › block › team plan › coach.`; `I decide`: `On a day, what wins: race › travel › your edit › block. Days you leave empty are rest.`; `Coach decides`: `On a day, what wins: race › travel › coach. Your blocks and edits are not used.` Al lado, un `InfoButton` con la explicación corta (§10.10).

**El origen de cada día**: un borde izquierdo de 4 px y un `Chip` con tono, icono y texto (D-13), en cada fila del día a día:

| `source`     | `Chip` (pantalla)                                                                                            | Tono      | Borde         | Cuándo                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------ | --------- | ------------- | ----------------------------------------------------------------- |
| `carrera`    | `Race`; la carrera y la etapa, en el renglón de abajo: `Race Sardegna · Stage 2 · Olbia → Nuoro` ([DUEÑO 7]) | `neutral` | `warn`        | el corredor corre ese día; no se entrena (`train.ts` l. 73 y 197) |
| `viaje`      | `Travel`, dentro de su `TripRow` (§11.6)                                                                     | `info`    | `accent`      | ida o vuelta; sesión `Travel`, 15 TSS (l. 200-203)                |
| `orden`      | `Your edit`, con `Back to Build`                                                                             | `accent`  | `own`         | hay una orden, guardada o sin guardar                             |
| `bloque`     | `Build · week 1` (el bloque y su semana)                                                                     | `neutral` | `line-strong` | la semana del plan vivo tiene bloque                              |
| `equipo`     | `Team plan`                                                                                                  | `neutral` | `ink-3`       | solo en `Mixed`, sin orden ni bloque                              |
| `entrenador` | `Coach decides on the day`                                                                                   | `neutral` | `line`        | lo demás en `Mixed`, y todo en `Coach decides`                    |
| `descanso`   | `Rest (I decide)`                                                                                            | `neutral` | `line`        | solo en `I decide`, sin orden ni bloque (l. 266-271)              |

El día de carrera va en `Chip` `neutral`, sin icono, y con su borde `warn`: el triángulo de `warn` (§3.2) es el de los avisos y del velo (`RankTable` `veiled`, §4.5), y un día de carrera, lo normal del juego, no es un problema (10-i); la celda `Race` de la tira sigue en `caption` 600 `warn` sobre `warn-bg`, sin icono. **`Back to Build`** (I-27): un `Button` `quiet` de 44 px con `icon="retry"` (§3.7; el icono, no el glifo `↺` dentro del texto, que §3.7 saca de los textos), en la fila de un día `Your edit`, que quita la orden y devuelve el día a lo que tendría sin ella; el texto nombra a dónde vuelve: `Back to Build` (el bloque de su semana), `Back to team plan`, `Back to coach` o, en `I decide`, `Back to rest` (pantalla; 10-a). Quitar una orden es un cambio sin guardar, como ponerla.

### 10.6 Las semanas con sus días y la tira de siete días

**Las semanas son las del plan vivo, con sus días** (D-35, I-08, O-10): `Week 1 · Days 51 to 57` (pantalla), contadas desde `plan.startDay`, que ya viaja y nadie pintaba (mapa 02 §8). Hoy las cuatro semanas no tienen fechas (`PlanLadder.tsx` l. 149-171) y la vista previa las proyecta desde mañana (`riders.ts` l. 453) mientras el tick las cuenta desde el `startDay` guardado (`packages/db/src/train.ts` l. 216): desde el día siguiente al guardado, escalera y proyección hablan de días distintos (X-05). Con la vista previa indexada por el plan vivo y `PUT /plan` que conserva su `startDay` (§11.2, §11.5), las semanas pintadas son las que entrena el tick. Cada semana: su título en `row` 600, el `select` de su bloque (`Field` `inline` de 48, §4.3, sin rótulo propio y con `aria-labelledby` al título de la semana, con `Leave it to the coach` como opción vacía, `PlanLadder.tsx` l. 160, y el porqué del bloque debajo en `meta`, `BLOCK_WHY`, l. 42-48), la tira y su resumen. Sin plan vivo, la semana 1 empieza mañana. Si el horizonte de 28 días pasa del final del plan, una línea más: `After your plan · Days 74 to 78 · Coach` (pantalla; `· Rest` en `I decide`). `Start a new plan tomorrow` (pantalla, `Button` `quiet`) vuelve a contar las semanas desde mañana sin guardar, y la consecuencia lo dice: `New plan from Day 51` (pantalla).

**La tira de siete días** (I-28), bajo cada semana y sin abrir nada: siete celdas de 41 px de ancho a 360 (312 px menos seis huecos de 4) y 35,4 a 320 ((272 − 24) / 7), de 48 px de alto, cada una con su día en `caption` `ink-3` y debajo **una palabra o un `Meter`**: `Race` en `caption` 600 `warn` sobre `warn-bg`; en la de viaje, el icono `travel` de 16 px **encima** de `Out` o `Back`, en `caption` sobre `info-bg`, y no a su lado, porque icono, hueco y palabra en línea miden 46 y 47 px con Inter y con DejaVu Sans, más que la celda (refutador de uso, `maqueta.mjs`); y un día de entrenamiento, el `Meter` de cuatro segmentos de 8 px de alto (§4.8) con su carga (§10.7), sin palabra. Lo más ancho de una celda es `Race` en `caption` 600, de 28,8 a 32,6 px, que cabe en los 35 de 320. No se pulsa: es una `<ol aria-label="Week 1, days 51 to 57">` cuyos `<li>` dicen su día en texto para el lector de pantalla (`Day 54: steady training`). Debajo, el resumen en `meta` `ink-2` (pantalla): `1 training day`, `3 training days`, `7 training days` o `No training: racing and travel`, contando los días de entrenamiento con carga. La celda `53 ✈ back` del prototipo de lectura se salía a 360 (uso C3); con el icono encima, `Back` mide unos 27 px de los 35 a 41 (estimado).

### 10.7 La carga en palabras y el TSS fuera

Hoy el cuadro enseña `1300 TSS over four weeks.` (`PlanLadder.tsx` l. 233; captura 01) y `105 TSS` por día (`Training.tsx` l. 279-281): una cifra sin escala, que el dueño ya descartó en otra parte («eso no aporta, ni se entiende», de la casilla `Matches / 1` de la ficha, [DUEÑO 8]; `RiderProfile.tsx` l. 147, sin versión, según el mapa 04). Con E3 la carga se dice en cinco palabras (D-41; D-00o, decidido por el dueño: «Si, quitalo mejor»), `Rest`, `Easy`, `Steady`, `Hard` y `Very hard` (pantalla), con `loadLevelOf(tss)` (`packages/shared/src/training.ts`) y `LOAD_STEPS_TSS` = 0, 25, 80 y 110: `Rest` con 0, `Easy` hasta 25, `Steady` hasta 80, `Hard` hasta 110 y `Very hard` por encima. Se pinta con el `Meter` (de 0 a 4 segmentos llenos) y la palabra detrás de `Load:` (`▮▮▮▯ Load: hard`, pantalla), porque el selector de intensidad ya usa `Easy` y `Hard` para otra cosa (`INTENSITY_LABELS`, `shared/training.ts` l. 11-15; 10-b). Qué sesión del catálogo cae en qué palabra (TSS de `SESSION_CATALOG`, l. 54-153), por intensidad:

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
│  ✈    Race   ✈    ▮▮▯▯   ✈    Race  Race               │  lo que hará el entrenador
│  Out         Back        Out                           │
├ Edit day by day ──────────────────── Show the 28 days ▾┤
│ ▍Coach mode: nothing you set here is used. Switch to   │  Notice note, borde de 4 px
│ ▍Mixed to edit.                    [ Switch to Mixed ] │  Button secondary
```

### 10.9 Un solo guardado

Hoy hay dos botones y dos guardados: `Save plan` en el panel de arriba (`PlanLadder.tsx` l. 174-218) y `Save day edits` al final de la página (`Training.tsx` l. 317-331), con la única pista de la precedencia en una línea gris debajo (l. 327-330). Con E3, **una `ActionBar`** (§4.3) para los bloques, el modo y los días (lectura, decisión 7): aparece con el primer cambio y dice su consecuencia (pantalla): la primera carrera cuya llegada cambia, `Race Sardegna: Fine (was Loaded)`; con más cambios, `2 changes · Race Sardegna: Fine (was Loaded)`; si ninguna llegada cambia, `2 changes · arrivals stay the same`; y si solo cambió el modo, `Mode: Mixed (was Coach decides)`. La consecuencia compara la vista previa con las ediciones con la del estado guardado. **`Save plan`** llama a `PUT /api/riders/me/plan` (modo, plan y `startFresh`) y después a `PUT /api/riders/me/orders` (la ventana de órdenes tal como está en pantalla) y da **un solo resultado**: `Saving…`, `Saved` dos segundos, o `Could not save. Try again.` con `Retry`, que repite los dos, porque los dos son idempotentes (el plan se escribe sobre su `startDay` y las órdenes sustituyen su ventana, `riders.ts` l. 362-376). Sin red, `You're offline. Your changes stay here until you reconnect.` y el botón deshabilitado; los cambios esperan en memoria (§12.1).

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

**Injertos aplicados.** I-08 (§10.6: las semanas con sus días, desde el `startDay` del plan vivo; el contrato, §11.2), I-27 (§10.5: `Back to Build`, con el icono `retry` y lo que nombra en cada modo), I-28 (§10.6: la tira de siete días, una palabra o un `Meter` por celda, no pulsable, con su resumen), I-32 (§10.1: la línea de estado del `PageHeader` en sus tres casos).

**Objeciones resueltas.** O-10 (§10.6: lo que se ve; el arreglo de la API, §11.2), O-32 (§10.4: una instrucción fija por tramo).

**Huecos rellenados.** Ninguno asignado. Contradicciones de hecho escritas: X-18 (§10.2: el prototipo medido es más simple que esta pantalla, que mide el PR 14, y los enlaces de 20 px no se repiten) y X-20 (§10.4: los contrastes de la escala).

**Decisiones de esta sección.**

- 10-a. `Back to …` nombra a dónde vuelve el día (el bloque, el plan de equipo, el entrenador o el descanso), porque en una semana sin bloque «Back to Build» mentiría, y lleva el icono `retry` del catálogo. Descartado: un `Undo` sin destino, y el glifo `↺` dentro del texto.
- 10-b. La carga se escribe detrás de `Load:` porque `Easy` y `Hard` son también dos intensidades del selector (`INTENSITY_LABELS`).
- 10-c. La carga del mes es el redondeo de la media de los niveles de `days[]`, en la web, para no añadir un campo a la vista previa (D-34). Descartado: un `monthLoad` de la API.
- 10-d. El resumen de la tira cuenta los días de entrenamiento con carga: un `Full rest` no es un día de entrenamiento.
- 10-e. La línea de estado sin plan vivo dice `Mixed · no plan: your coach decides`, y en `entrenador`, `Coach decides · your coach picks every day`.
- 10-f. Se añade §10.11, la tabla de qué sustituye a qué, para que quien implemente sepa qué líneas de hoy desaparecen; y cada fila de día lleva `data-source`, que el glosario de la v0 no tenía.
- 10-g. El mejor tramo, `Spot on`, se señala siempre con un borde de 2 px en `good`, también inactivo, y el `aria-label` acaba en `best is Spot on`. Descartado: el icono `check` delante de la palabra, que con `Spot on` mide de 62 a 70 px y no cabe en los 51,2 de un tramo a 320.
- 10-h. La palabra del tramo puede partir en dos renglones, `Spot on` por su espacio y `Undertrained` por un guion blando. Descartado: bajar la letra de 12 px, o un nombre más corto que el que eligió el dueño (D-00n).
- 10-i. El día de carrera va en `Chip` `neutral`, sin el triángulo de `warn`, con su borde `warn`. Descartado: el tono `warn`, que pinta lo normal del juego con el icono de los avisos.
- 10-j. En la celda de viaje el icono va encima de la palabra, y la celda mide 48 px de alto. Descartado: el icono al lado, que se sale de la celda a 320 y a 360.
- 10-k. Los `select` de la semana y del día son `Field` `inline` (§4.3), sin rótulo propio y con `aria-labelledby` al título de su fila. Descartado: un rótulo encima de cada uno, unos 24 px más por día abierto, 672 en los 28.
- 10-l. Las instrucciones de los tramos empiezan por la causa, como los ejes de D-00n (`Too much training`, `Too little training`). Descartado: dejarlas como estaban, que hablaban de cansancio y no de entrenamiento.

**Propuesto para el glosario.** `data-source` (el `source` de un día, en su fila del cuadro, para los tests); `Field` `inline` (§4.3); textos (pantalla): `Undertrained` (el tramo `oxidado`, en lugar de `Rusty`, D-00n); `◀ Too much training` y `Too little training ▶` (los ejes de `Scale5`, en lugar de `◀ Too tired` y `Too fresh ▶`); `Race Var: you'll arrive Loaded, 2 of 5, from too much training to too little training; best is Spot on`; las cinco instrucciones de §10.4; `Mixed · no plan: your coach decides`; `Coach decides · your coach picks every day`; `On a day, what wins: race › travel › your edit › block. Days you leave empty are rest.`; `On a day, what wins: race › travel › coach. Your blocks and edits are not used.`; `Back to Build`, `Back to team plan`, `Back to coach`, `Back to rest` (con el icono `retry`); `Race Sardegna · Stage 2 · Olbia → Nuoro` (bajo el `Chip` `Race`); `Show fewer`; `New plan from Day 51`; `Mode: Mixed (was Coach decides)`; `2 changes · arrivals stay the same`; `Load: hard`; `Switch to Mixed`; `No training: racing and travel`; `travel Day 51 and Day 53`; y el texto del `InfoButton` de §10.10.

**Dudas para el ensamblador.**

1. D-41 fija `Easy` y `Hard` como palabras de carga, y el selector de intensidad ya las usa (`INTENSITY_LABELS`: `Easy`, `Normal`, `Hard`). Esta sección lo separa con `Load:` (10-b); la tabla de «una palabra por cosa» de §4.10 (D-15) debería recogerlo o cambiar uno de los dos.
2. El ejemplo de §G.12, `After your plan · Days 79 to 83 · Coach`, no puede darse con un plan que empieza el 51: aquí se usa `Days 74 to 78` con un plan que empezó el 46.
