# Mapa 02 · El examen práctico y la frontera

Commit `58c14da` (la copia de trabajo, `4a4eeac`, solo añade documentos). **Leídos enteros**
(líneas): `apps/web/src/pages/Training.tsx` 334, `components/PlanLadder.tsx` 263,
`domain/trainingPlan.ts` 95, `condition.ts` 61 y `coachOpinion.ts` 23, `api/sheet.ts` 95 y `training.ts` 42,
`apps/api/src/routes/riders.ts` 898, `packages/db/src/train.ts` 448, `riderSchedule.ts` 474 y
`training.ts` 261, `packages/engine/src/training/projection.ts` 92 y `coachView.ts` 212, y las fuentes
del examen: `docs/agenda.md` §4.19 (l. 925-992), §4.20 (l. 994-1068) y apéndice A (l. 1558-1661), y
`docs/encargos.md` l. 228-273. **Por tramos**, con la línea citada: `packages/shared/src/contracts.ts`,
`shared/src/training.ts`, `engine/src/banister.ts` y `routes/calendar.ts`, `MyRaces.tsx`,
`TeamCalendar.tsx`, `RiderProfile.tsx`, `Home.tsx`, `AttributeList.tsx`, `BlockReport.tsx`,
`labels.ts`, `db/src/riders.ts`, `browse.ts`, `raceEntry.ts`, `calendarRun.ts`, `schema.ts`,
`apps/api/src/spoiler.ts`, los bancos B1 y su `__fixtures__/spoilerWorld.ts`, cinco tests más (de §3 y §9,
y `planPorBloques.test.ts`), `SPEC.md` §3.2-3.4, §4 y §5.6, y `docs/entrenamiento.md` l. 1055-1125
y 1280-1291. El mapa 01 describe la web por dentro y no se repite.

**Cómo se ha medido.** Dos scripts propios en `<scratchpad>/mapa02/` (se pierden con la sesión).
`frontera.mjs` levanta el mundo de los bancos B1 (`spoilerWorld.ts`, compilado en el clon: PGlite con
las migraciones, Race France con doce corredores, las etapas 1 y 2 corridas, el reloj en el día 187 y
la sesión de verdad de better-auth), planta valores testigo con SQL, pide las rutas del plan con
`app.inject`, barre las GET del registro con la sesión del jugador (`sweep`, l. 327-351) y pasa cada
cuerpo por su esquema para ver qué claves descarta. `planes.mjs` guarda dos planes solapados. Las
cuentas de `blockWeek`, `tsbFactor` y `ceilingOpinions` son `node` sobre los módulos compilados.

## Resumen

1. **La lista de llegadas inventa en las vueltas** (§3). La vista previa proyecta cada día de carrera
   como `descanso_activo`, 25 TSS (`riders.ts` l. 449-451), y una etapa medida cargó 252,8: en el
   mundo de prueba da `Spot on` a 17 de las 18 etapas de Race France del horizonte, y con la carga medida
   serían `Loaded` y `Cooked` desde la tercera (estimado). Ignora además el modo, las órdenes del día, el
   plan de equipo y el viaje, y pone TSB 0 a la primera llegada si mañana se corre (medido).
2. **El panel de los 28 días no enseña los bloques** (§1, §4 n.º 7). Un día sin orden se rellena con
   `defaultCoachPlan` (`trainingPlan.ts` l. 37), un ciclo fijo de 14 días que el tick ya no usa; coincide
   con lo que entrena un bloque en 88 de 350 casos (medido). El puente de `blockWeek()` no está oculto:
   no está. `docs/entrenamiento.md` l. 1287-1291 ya diseñó el arreglo y no se hizo.
3. **La precedencia tiene dos escalones que nadie cuenta** (§2): el modo `entrenador`, que ignora
   órdenes, bloques y plan de equipo, y los planes solapados: guardar la escalera en dos días distintos
   deja dos filas, y la pantalla lee una y el tick entrena la otra (medido en PGlite). Y el entrenador,
   sin calendario, entrena siempre la semana `base` salvo sus frenos (1.820 de 1.820, medido).
4. **El servidor ya sabe de qué carrera es cada llegada** (§5): `getRiderRaceDays` recorre la
   convocatoria con la carrera, la etapa y el formato en la mano y devuelve solo números
   (`riderSchedule.ts` l. 37-70). `getRiderTravelDays` (l. 175-226) es el modelo que copiar.
5. **El viaje está arreglado en el dato y a medias en la pantalla** (§6): solo se ve en el panel
   plegado, `On your programme` de `MyRaces` no lo nombra y la proyección lo trata como día de bloque.
6. **La frontera no se rompe por los ocultos sino por los números** (§8): ningún oculto del SPEC §3.4
   cruza (medido con testigos en las 52 GET que barre el banco), pero el valor interno de los diez atributos
   viaja con decimales para el corredor propio y para **cualquier** corredor (`/api/riders/:id`), que es
   lo que SPEC §3.2 dice que el jugador jamás ve; y `tsb`, `ctl` y `atl` viajan en la vista previa y en el
   diario, el `atl` sin un solo uso en la web.
7. **Nada impide hoy que la API mande de más** (§9): los contratos son _strip_ (`contracts.ts`
   l. 9-11) y solo validan en la web, y `.strict()` solo está en dos cuerpos de petición. Lo
   generalizable es el canario de B1a con su barrido, que hoy solo mira las GET.

## §1. El cuadro de entrenamiento, pieza a pieza

`/me/training` es `Training.tsx` (l. 59-334), que monta `PlanLadder` (l. 143) arriba. El editor día a
día no es un componente: vive en la propia página (l. 181-313).

| Pieza                        | Dónde                       | De qué dato sale                                                                                              | Qué dice y qué calla                                                                                                                                                                             |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Modos                        | `PlanLadder.tsx` l. 125-145 | `GET /api/riders/me/plan` (`riders.ts` l. 388-400), `mode` de `riders.training_mode` (`schema.ts` l. 324-325) | tres botones y `MODE_WHY` (l. 56-61) en `text-xs` debajo (l. 145); arranca en `mixto` (l. 84) hasta que llega lo guardado (l. 90-94)                                                             |
| Las cuatro semanas           | l. 149-171                  | `plan.blocks` (`training_plans`, `schema.ts` l. 472-492)                                                      | `Week 1` a `Week 4` sin fechas; `Leave it to the coach` (l. 160) y `BLOCK_WHY` (l. 42-48); se esconden en modo `entrenador` (l. 147)                                                             |
| Énfasis, intensidad, guardar | l. 174-218                  | `focusAttr`, `intensity`; `PUT /plan` fija `startDay` en mañana (`riders.ts` l. 411-413)                      | el objetivo (`goalRaceId`, D1) no tiene control: `PLAN_VACIO` lo deja en `null` (l. 78) y nadie lo lee (solo aparece en `contracts.ts` l. 194 y `db/training.ts`)                                |
| `What this does to you`      | l. 227-234                  | `POST /api/riders/me/plan/preview`, `totalTss`                                                                | `N TSS over four weeks.` en número                                                                                                                                                               |
| Llegadas                     | l. 235-257                  | `arrivals[].gameDay` y `.label`                                                                               | por fila tres `span`: `Day N` (día de la temporada, l. 246), `You'll arrive:` y la chapa de `ARRIVAL_LABEL` (l. 63-69); ni carrera ni etapa; vacía, l. 235-238                                   |
| Plan de equipo               | `Training.tsx` l. 145-174   | `GET /api/me/team-training` (`riders.ts` l. 485-506)                                                          | `Adopt team plan` copia las sugerencias como ediciones sin guardar (`trainingPlan.ts` l. 65-80)                                                                                                  |
| `Edit day by day`            | l. 181-313                  | `GET /api/riders/me/orders` (`riders.ts` l. 305-351)                                                          | plegado al entrar (`diaADia` en `false`, l. 74 y 190); semanas de siete desde mañana con sus días de temporada (l. 195-198), que no son las semanas de la escalera                               |
| Fila de carrera              | l. 201-213                  | `raceDays`, una lista de números (`contracts.ts` l. 393-394)                                                  | ámbar, `Race day`, sin nombre de carrera                                                                                                                                                         |
| Fila de viaje                | l. 217-234                  | `travelDays[]` (`contracts.ts` l. 380-386)                                                                    | azul, `Travel day`, sentido, carrera y país: la única fila del cuadro que nombra una carrera                                                                                                     |
| Día editable                 | l. 239-307                  | la orden guardada o, si no hay, `defaultCoachPlan(gameDay)` sin vocación (`trainingPlan.ts` l. 28-45)         | dos `select`, el TSS en número (l. 279-281), el efecto (l. 283-285) y la sesión del equipo si difiere (l. 286-306); no dice si el día lo escribió el jugador, sale de un bloque o del entrenador |
| `Save day edits`             | l. 317-331                  | `PUT /api/riders/me/orders` borra la ventana y guarda lo tocado (`riders.ts` l. 362-376)                      | la única pista de precedencia fuera de `MODE_WHY` es la línea gris de l. 327-330, fuera del panel                                                                                                |

**Los dos vocabularios.** Arriba, cinco bloques con nombre inglés (`BLOCK_LABEL`, l. 33-39) sobre los
códigos `base`, `construccion`, `especifico`, `afinado` y `recuperacion` (`contracts.ts` l. 175-181).
Abajo, las once sesiones elegibles del catálogo (`SESSION_CATALOG`, `shared/training.ts` l. 53-154,
sin `viaje`, `Training.tsx` l. 43). El puente es `blockWeek(block, archetype, dayOfWeek, focus,
intensity)` (`shared/training.ts` l. 493-518): la tabla `TABLA` (l. 411-485) da la sesión de cada día
de la semana, con `E` (la sesión del énfasis, l. 387-390), `PM` (`puertos` o `muros` según el
arquetipo, l. 396-400) y días fijos suaves o fuertes. El día de la semana es `gameDay % 7`, no el
puesto del día dentro del plan. Lo llaman el tick (`train.ts` l. 220) y la vista previa (`riders.ts`
l. 454); la web no (grep). `domain/condition.ts` no lo usa el cuadro: traduce el diario a las barras
de la ficha (l. 35-42) y su cabecera explica por qué `ctl` y `tsb` viajan (l. 4-16).

## §2. La cadena de precedencia de `train.ts`, hoy

El apéndice la daba en l. 199-266. Hoy el bucle de la elección es l. 195-272 y el viaje se decide
antes, en l. 69-80. De mayor a menor:

0. **El día de carrera.** Quien ha corrido hoy está en `skip` y no entrena (l. 73, 197 y 335): «la
   carrera manda sobre el viaje» (l. 73).
1. **El viaje**, en los dos sentidos (`ridersTravellingOutbound` y `ridersTravellingBack`,
   `riderSchedule.ts` l. 233-264 y 273-306): sesión `viaje`, 15 TSS (l. 200-203; `shared/training.ts`
   l. 153).
2. **El modo `entrenador`** salta todo lo que sigue: no lee la orden (l. 205), ni el bloque (l. 214),
   ni el plan de equipo (l. 206, que solo existe en `mixto`).
3. **La orden del día** (`training_orders`, l. 114-118 y 232-233), en `mixto` y `manual`.
4. **El bloque de la semana** (l. 213-228 y 234-235): semana `floor((gameDay − startDay) / 7)` del plan
   cuyo `start_day` cae entre `gameDay − 27` y `gameDay` (l. 136-140); un bloque a `null` cae al
   siguiente escalón (l. 208-212).
5. **El plan del equipo** (`team_training_orders`, l. 122-126 y 236-237), solo en `mixto`.
6. **El entrenador**, `coachPlan` (l. 249-264; `shared/training.ts` l. 520-567): salud, TSB de hoy
   (`riders.ctl − riders.atl`), tensión, apretones de la semana y lo de ayer. Sin calendario:
   `daysToNextRace: null` (l. 256), y con eso `coachBlock` da `base` por pretemporada (`shared/training.ts`
   l. 359-361) antes del mesociclo (l. 363-366): sano y con TSB 0, la semana `base` en 1.820 de 1.820 días
   y vocaciones (medido). El comentario de `train.ts` l. 243-247 («cae en su mesociclo») no se cumple, y el afinado
   antes de una carrera (`coachBlock` l. 349-354, `coachPlan` l. 545-552) no se dispara nunca.
7. **La excepción de `manual`**: sin orden ni bloque, `descanso_activo` (l. 266-271), aplicada al final
   sobre lo que hubiera salido del escalón 6.

**Dónde lo dice la pantalla.** Solo en `MODE_WHY` (`PlanLadder.tsx` l. 56-61), literal:

```
entrenador: Your coach picks every day using how you actually feel that morning — better
            information than a plan you wrote four weeks ago. Nothing you set here is used.
mixto:      Your blocks and your edits win; anything you leave alone goes back to the coach.
manual:     Only what you write. Days you leave empty are active recovery, not a coach session.
```

Y bajo el botón de guardar los días (`Training.tsx` l. 327-330): `Only the days you changed are saved.
Anything you leave alone goes back to your blocks` y, tras una raya, `or to your coach.` Lo que ninguno
de los dos dice: que en `mixto` la orden gana al bloque; que el plan de equipo va antes que el
entrenador; que «how you actually feel» es solo el freno, porque la semana es siempre `base`; que en
`entrenador` el panel de los días sigue editable y se guarda (l. 317-325) para nada; y que en `manual`
el panel enseña sesiones en días que el tick convertirá en descanso activo.

**El escalón oculto: dos planes que se solapan.** `PUT /plan` guarda siempre con `startDay` de
mañana (`riders.ts` l. 413) y la clave es `(rider_id, start_day)` (`schema.ts` l. 491): guardar en dos
días distintos de la misma ventana deja dos filas. La pantalla lee `getPlanForDay`, con `.limit(1)` y
sin `ORDER BY` (`db/training.ts` l. 233-261), y el tick se queda con la última fila de un `Map`
(`train.ts` l. 136-140). Medido con `planes.mjs`: guardados un plan que empieza el 101 (`Build`) y otro
el 111 (`Taper`), el día 115 la escalera enseña el del 101 y el tick entrena el del 111; reescrito el
del 101, los dos leen el del 101. El orden no lo fija el SQL, y en Postgres de producción no sé cuál
sale. El test `guardar el plan otra vez lo SUSTITUYE, no acumula filas` (`planPorBloques.test.ts`
l. 93-105) guarda con el mismo `startDay` y no lo cubre. Además, cada guardado reinicia la semana 1
en mañana, y la escalera no tiene fechas que lo enseñen.

## §3. La proyección y las llegadas

**Los cortes.** `arrivalLabel` (`projection.ts` l. 75-81) frente a los codos de `tsbFactor`
(`banister.ts` l. 40-47: −35, −10, +5, +18, +35) y al diseño (`docs/entrenamiento.md` l. 1086-1099).
El valor de `tsbFactor` en los bordes está calculado.

| Pantalla  | Código    | `tsbFactor` en el tramo        | Diseño, `entrenamiento.md` |
| --------- | --------- | ------------------------------ | -------------------------- |
| `Rusty`   | > +25     | de 0,856 a 0,65 en +35, y 0,55 | `Stale`, ≥ +18             |
| `Spot on` | +5 a +25  | 0,95; 1,00 hasta +18; 0,856    | `Peaking`, +5 a +18        |
| `Fine`    | −10 a +5  | de 0,55 a 0,95                 | `Fresh`, −10 a +5          |
| `Loaded`  | −30 a −10 | de 0,11 a 0,55                 | `Loaded`, −35 a −10        |
| `Cooked`  | < −30     | de 0,11 a 0                    | `Buried`, < −35            |

El comentario de `projection.ts` l. 67-71 cita +18 y −35, que el código no usa; el test dice «los
cortes son los del `tsbFactor`» y fija −31 y −30 (`projection.test.ts` l. 154-170). El diseño pedía
además `{ label, sinRitmo }` (`entrenamiento.md` l. 1119-1122), que no existe.

**Lo que proyecta de verdad la vista previa** (`riders.ts` l. 424-481), frente al tick:

| Situación                          | Vista previa                                           | Tick                                                                                                     | Medido en el mundo de prueba                                                           |
| ---------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| modo `entrenador`                  | proyecta los bloques: el cuerpo no lee `mode` (l. 443) | el entrenador (`train.ts` l. 205 y 214)                                                                  | respuesta idéntica en `mixto` y `entrenador`                                           |
| bloque a `null`                    | `base` (l. 453)                                        | el entrenador, que sin calendario también hace `base` salvo sus frenos (§2); descanso activo en `manual` | idéntica a cuatro bloques `base`                                                       |
| órdenes del día y plan de equipo   | no los lee                                             | mandan (l. 232-237)                                                                                      | (código)                                                                               |
| día de viaje                       | la sesión del bloque (l. 453-454)                      | `viaje`, 15 TSS (l. 200-203)                                                                             | el 208, vuelta de Race France, proyectado como `fondo`, 90 TSS                         |
| día de carrera                     | `descanso_activo`, 25 TSS (l. 449-451)                 | la carga de la etapa (`stageRun.ts` l. 746-748)                                                          | la etapa 2 cargó 252,8 TSS en el diario                                                |
| primera llegada si mañana se corre | `curva[−1]` no existe y el TSB es 0 (l. 475-476)       | el TSB real de ese amanecer                                                                              | día 188: `Fine` con 0; el último diario (con los testigos de §8) daba +18,6, `Spot on` |

Con el plan vacío, la respuesta trae 18 llegadas, las 18 con `raceId: null`: `Fine` el 188 y `Spot on`
del 189 al 207, con TSB de +13,7 a +23,0 (medido). Rehecha la cuenta con la carga medida, 252,8 TSS
por etapa y REC 50 (fatiga de τ 7,5), sería `Fine` el 189 (−5,0), `Loaded` el 190 (−24,9) y `Cooked`
del 191 al 207 (de −41,7 a −99,9); con 150 TSS por etapa, `Loaded` desde el 191 y `Cooked` desde el
196 (estimado). La promesa del comentario de la ruta (l. 418-423, «la promesa de la pantalla es la
única que el motor puede cumplir») solo se cumple en `mixto` o `manual`, con las cuatro semanas
puestas, sin órdenes, sin viaje y hasta la primera etapa. Agrupar por carrera (A.3) solo da una
etiqueta de fiar si es la de la salida.

## §4. Cada afirmación, con su veredicto

| N.º | Afirmación                                                                                                | Fuente                                   | Veredicto                      | Hoy, con su línea                                                                                                                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | La cadena está en `train.ts:199-266`                                                                      | agenda l. 1571                           | a medias                       | l. 195-272, y el viaje en l. 69-80 (§2)                                                                                                                                                                                                                                     |
| 2   | Viaje, orden, bloque, plan de equipo solo en `mixto`, entrenador; en `manual` el hueco es descanso activo | agenda l. 1573-1581; encargos l. 248-250 | cierta en el orden, incompleta | faltan el día de carrera (l. 73) y el modo `entrenador` (l. 205-206 y 214); el entrenador no ve el calendario (l. 256)                                                                                                                                                      |
| 3   | La regla vive en `MODE_WHY`, en el panel de arriba                                                        | agenda l. 1583-1585; encargos l. 250-252 | cierta                         | `PlanLadder.tsx` l. 56-61, pintado en l. 145; y el texto no es la regla entera (§2)                                                                                                                                                                                         |
| 4   | Quien baja a los 28 días no tiene ninguna pista                                                           | agenda l. 1585-1586                      | a medias                       | una línea gris bajo el botón (`Training.tsx` l. 327-330), fuera del panel, sin modo ni plan de equipo                                                                                                                                                                       |
| 5   | Arriba bloques con énfasis e intensidad; abajo sesiones e intensidad                                      | agenda l. 1594-1595                      | cierta                         | `PlanLadder.tsx` l. 33-39 y 174-205; `Training.tsx` l. 248-278                                                                                                                                                                                                              |
| 6   | Un bloque se expande a siete sesiones con `blockWeek()`                                                   | agenda l. 1595-1596; encargos l. 246-247 | cierta en el servidor          | `shared/training.ts` l. 493-518, en `train.ts` l. 220 y `riders.ts` l. 454; la web no la llama                                                                                                                                                                              |
| 7   | El jugador elige `Build` arriba y abajo ve siete sesiones que no sabe de dónde salen                      | agenda l. 1598-1599                      | falsa en el mecanismo          | abajo sale `defaultCoachPlan` (`trainingPlan.ts` l. 37), ciclo fijo de 14 días (`shared/training.ts` l. 203-235) que no depende del bloque: 88 de 350 coinciden (medido)                                                                                                    |
| 8   | `raceId: null` siempre, en `riders.ts:376-383`                                                            | agenda l. 1607-1616; encargos l. 235-236 | cierta                         | l. 470-478, el `return` en l. 477; `raceId: z.string().nullable()` (`contracts.ts` l. 230); 18 de 18 a `null` (medido)                                                                                                                                                      |
| 9   | Se lee `Day 182 · You'll arrive: Rusty`                                                                   | agenda l. 1563; encargos l. 235          | a medias                       | tres `span` con `gap-2` y sin «·» (`PlanLadder.tsx` l. 244-253); el día es el de la temporada                                                                                                                                                                               |
| 10  | Una carrera por etapas pinta una fila por etapa                                                           | agenda l. 1618-1621; encargos l. 236-238 | cierta                         | una por día de `getRiderRaceDays` (`riders.ts` l. 470-473); 18 filas para Race France (medido)                                                                                                                                                                              |
| 11  | Las cinco etiquetas salen de `arrivalLabel(tsb)`, `projection.ts:75`                                      | agenda l. 1623-1625                      | cierta                         | l. 75-81                                                                                                                                                                                                                                                                    |
| 12  | La tabla de cortes: > +25, +5 a +25, −10 a +5, −30 a −10, < −30                                           | agenda l. 1627-1633; encargos l. 240-241 | cierta                         | l. 76-80                                                                                                                                                                                                                                                                    |
| 13  | Son los cortes del `tsbFactor` del SPEC 4.1                                                               | agenda l. 1635-1637; encargos l. 242-243 | a medias                       | +5 y −10 sí; +25 y −30 no son codos (+18, +35, −35); el diseño los ponía en +18 y −35 (`entrenamiento.md` l. 1086-1099)                                                                                                                                                     |
| 14  | Cinco palabras sueltas, sin escala ni orden visible                                                       | agenda l. 1637-1640; encargos l. 239-245 | cierta                         | cinco chapas de cinco tonos (`PlanLadder.tsx` l. 63-69), una por fila, sin orden ni leyenda                                                                                                                                                                                 |
| 15  | Con los cuatro bloques a `null` se entrena poquísimo y el TSB pasa de +25                                 | agenda l. 1642-1644                      | no comprobable; a medias       | un `null` es `base` en la vista previa (`riders.ts` l. 453) y en el entrenador del tick (§2), unos 430 TSS a la semana (`shared/training.ts` l. 412), no «poquísimo»; pasar de +25 pide una CTL alta, y la subida que sí se mide es la de los días de carrera a 25 TSS (§3) |
| 16  | El arreglo es el mismo dato pintado de otra forma                                                         | agenda l. 1646-1648; encargos l. 243-245 | cierta para cinco tramos       | basta `label`; una posición dentro del tramo pide el TSB, que hoy viaja sin enseñarse (§8)                                                                                                                                                                                  |
| 17  | Arriba BLOQUES y abajo SESIONES, y ese puente no se ve                                                    | encargos l. 246-247                      | a medias                       | no se ve porque la pantalla no lo pinta (n.º 7)                                                                                                                                                                                                                             |
| 18  | Cuando arriba y abajo dicen cosas distintas, manda el día                                                 | encargos l. 247-248                      | cierta en `mixto` y `manual`   | `train.ts` l. 232-233; en `entrenador` no manda nada del jugador (l. 205)                                                                                                                                                                                                   |
| 19  | El viaje cuesta `k` días ir y `k` volver: 0, 1 y 2                                                        | encargos l. 260-261; agenda l. 932-946   | cierta                         | `travel.ts` l. 30-34; `riderSchedule.ts` l. 93-120                                                                                                                                                                                                                          |
| 20  | Las dos direcciones bloquean el entrenamiento, y la vuelta la convocatoria                                | encargos l. 261-262; agenda l. 942-948   | cierta                         | `train.ts` l. 69-80 y 200-203; `homeByStart`, `calendarRun.ts` l. 101-103, en l. 245, 499, 620 y 708                                                                                                                                                                        |
| 21  | El planificador solo enseña la ida                                                                        | encargos l. 262-265; agenda l. 955-963   | arreglada (26/09)              | `getRiderTravelDays` l. 175-226 con `returnTravelDaysFor` (l. 128-143); el 208 sale como vuelta (medido)                                                                                                                                                                    |
| 22  | La vuelta solo existe como columna después de correr                                                      | encargos l. 263-264                      | falsa ya entonces              | `travel_until_day` se escribe al congelar la escuadra (`calendarRun.ts` l. 666 y 728): el tercer defecto del «Arreglado» (agenda l. 982-992)                                                                                                                                |
| 23  | `MyRaces` anuncia los días por tramo, `1d` y `2d`                                                         | encargos l. 265-268; agenda l. 968-975   | arreglada                      | `travelDaysLabel` (`labels.ts` l. 157-161) en `MyRaces.tsx` l. 206 y 252-254 y en `TeamCalendar.tsx` l. 98-101; ya no hay ningún `}d` de viaje (grep)                                                                                                                       |
| 24  | Los cinco son de presentación y ninguno se arregla con más motor                                          | encargos l. 270-271; agenda l. 1652-1654 | a medias                       | ninguno toca el motor, pero la vista previa (§3) y el doble plan (§2) son de la API y de `packages/db`: `projectLoad` está bien, falla lo que se le pasa                                                                                                                    |
| 25  | El techo cruza como `tres`, `cuatro`, `cinco`                                                             | agenda l. 1001-1015                      | arreglada                      | `CEILING_OPINIONS`, nueve códigos (`contracts.ts` l. 115-126); test en `web/src/api/contracts.test.ts` l. 148-155                                                                                                                                                           |
| 26  | Relativa, se afina, puede equivocarse; acierta el mejor sitio un 72 % al principio y un 98 % a los 27     | agenda l. 1063-1066                      | cierta                         | `coachView.ts` l. 85-150; medido sobre 3.000 genomas: 72,1 % a los 19, 88,4 % a los 23 y 98,1 % a los 27 (§7)                                                                                                                                                               |

## §5. Lo que el servidor ya sabe y lo que falta en la API

| Lo que el cuadro tendría que decir              | El dato, y dónde está ya                                                                                                                                                                                                                      | Lo que habría que añadir a la API                                                                                                                                                                                                    |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| De qué carrera es cada llegada                  | `race_rosters.race_id` (`schema.ts` l. 621-653), clave `${id}:s${season}`; `getRiderRaceDays` ya tiene la carrera (`SEASON_CALENDAR`, l. 59) y el índice de etapa (l. 61-66) y los tira al devolver números (l. 69)                           | que devuelva por día `raceKey`, `raceName`, `stage`, `stageCount`; llenar `arrivals[].raceId` (`contracts.ts` l. 230) y sumar nombre y etapa                                                                                         |
| Su etapa y si es por etapas                     | `CalendarStage` trae `index`, `name` (`Stage N · label`), `from`, `to` y el tipo; `CalendarRace`, `format` y `stages` (`engine/src/routes/calendar.ts` l. 71-116); el perfil congelado, en `race_routes` (`schema.ts` l. 585-620)             | lo mismo; el formato y la etapa caben en el mismo objeto                                                                                                                                                                             |
| Agrupar por carrera                             | `getRiderUpcomingRaces` (`riderSchedule.ts` l. 333-376): nombre, clase, país, `startGameDay`, `stageCount`, `ongoing` (ruta `GET /api/riders/me/upcoming-races`, `riders.ts` l. 166-178)                                                      | una llegada por carrera (la de su primera etapa en el horizonte, la única fiable, §3), o la clave para agrupar en la web                                                                                                             |
| Qué día escribió el jugador                     | `training_orders` (`schema.ts` l. 494-506); `GET /orders` las manda (`riders.ts` l. 321-326)                                                                                                                                                  | nada: la web lo sabe ya (`orders`), y lo pierde al mezclarlo con `defaultCoachPlan` (`trainingPlan.ts` l. 36-42)                                                                                                                     |
| Qué día viene de un bloque, y de cuál           | `training_plans` con `start_day` y los cuatro bloques (`schema.ts` l. 472-492), `getPlanForDay` devuelve `{ plan, week }` (`db/training.ts` l. 233-261); la sesión, `blockWeek`; la vista previa ya la calcula (`days[].session`, l. 463-468) | por día `{ session, intensity, source }` con `source` en `viaje`, `orden`, `bloque`, `equipo`, `entrenador` o `descanso`, sacado de una función pura que use también el tick; resolver antes qué plan manda si se solapan (§2)       |
| Qué hará el entrenador                          | nada guardado: `coachPlan` devuelve `reason` (`shared/training.ts` l. 520-567) y el tick lo tira (`train.ts` l. 249-264)                                                                                                                      | el diseño ya lo pedía: `coach: { gameDay, session, intensity, reason, detail }[]` y `blocks: { week, block, reason }[4]` en `GET /orders`, y borrar `defaultCoachPlan` de la web (`entrenamiento.md` l. 1287-1291 y paso 8, l. 1639) |
| El modo y su regla en el panel de los días      | `GET /api/riders/me/plan` (`mode`), que ya pide `PlanLadder` con la clave `['training-plan']` (l. 83); el plan de equipo, `GET /api/me/team-training`, que ya pide la página (l. 66)                                                          | nada: `Training.tsx` no lee el modo (grep), pero la caché de React Query ya lo tiene                                                                                                                                                 |
| El nombre de la carrera en las filas de carrera | igual que las llegadas                                                                                                                                                                                                                        | `raceDays` como objetos, igual que `travelDays` (`contracts.ts` l. 380-401)                                                                                                                                                          |

## §6. El viaje

**Lo que dejó hecho el arreglo del 26 de septiembre.** El plan deduce la vuelta con la misma regla que
cobra el tick: `getRiderTravelDays` (`riderSchedule.ts` l. 175-226) suma ida (`outboundTravelDays`,
l. 93-102) y vuelta (`returnTravelDaysFor`, l. 128-143, que respeta `travel_until_day` si cae en los dos
días siguientes), sin duplicados (la ida pisa a la vuelta, l. 196-202) y sin días dentro de otra
carrera (l. 203-225); el tick usa la misma `returnTravelDaysFor` (l. 297-302). En el mundo de prueba,
corredor de ES en Race France (FR, tramo continental): `travelDays` trae el 208 como `back` (medido).

**Cómo se ve hoy, sitio por sitio.**

| Sitio                               | Líneas                      | Qué enseña                                                                                                                                         |
| ----------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel de los 28 días                | `Training.tsx` l. 215-234   | fila azul con `✈️ Travel day`, `On your way to` o `Heading home from`, carrera y país en mayúsculas; solo si se despliega el panel (l. 74 y 190)   |
| Escalera y llegadas                 | `PlanLadder.tsx` l. 125-260 | nada del viaje; la proyección lo cuenta como día de bloque (§3)                                                                                    |
| `MyRaces`, `On your programme`      | `MyRaces.tsx` l. 96-182     | carrera, dorsal, salida (`in N days`) y órdenes; **ni días ni dinero de viaje**, y son las carreras a las que de verdad se va                      |
| `MyRaces`, inscripciones pendientes | l. 193-208                  | `GD {startDay} · travel {dinero}` y `2 travel days (1 out, 1 back)` (l. 205-206); solo agentes libres                                              |
| `MyRaces`, `Available to enter`     | l. 222-283                  | el dinero en rojo si no llega y, debajo, `travelDaysLabel` (l. 246-254); solo agentes libres (`raceEntry.ts` l. 62)                                |
| `TeamCalendar` del mánager          | l. 80-102                   | coste del viaje por la escuadra, `✈` sin variante de emoji en rojo para el intercontinental con `title` (l. 89-96) y `travelDaysLabel` (l. 98-101) |

**Lo que queda de presentación.** (1) Al corredor con equipo el viaje solo se le ve en el panel
plegado. (2) Ida, carrera y vuelta son filas sueltas: nada las une en un viaje. (3) La proyección no
lo cuenta (90 TSS de bloque donde el tick pone 15). (4) Tres numeraciones del día: `Day N`
(`Training.tsx` l. 208, 225 y 246), `GD N` (`MyRaces.tsx` l. 205 y 230), las dos con el día de la
temporada, y `in N days` (l. 46-50). (5) Dos `✈` (`Training.tsx` l. 227, `TeamCalendar.tsx` l. 94).
(6) Los días de descanso de una vuelta (194 y 201 en Race France) salen como días editables entre las
filas de carrera, porque `raceDays` solo cuenta etapas (`riderSchedule.ts` l. 61-66).

## §7. El entrenador

`ceilingOpinions(ceilings, age, seed)` (`coachView.ts` l. 115-150) suma a cada techo un error fijo por
corredor y atributo (semilla sin temporada, l. 121-125) de σ 9 a los 19 que baja lineal a 1,5 a los 27
(`opinionSd`, l. 72-75 y 101-105), ordena los diez y habla del puesto: a los 18 y 19 `asoma` en uno y
`pronto` en el resto; de 20 a 22 `apunta` en dos, `no_parece` en tres y `quiza` en medio; desde los 23
`lo_tuyo`, dos `fuerte`, tres `flojo` y `normal` (`OPINION_RANKS`, l. 85-92; `coachReading`, l. 94-98).
`getCoachView` lo alimenta con `rider_hidden` (`db/src/riders.ts` l. 561-627). Medido sobre 3.000
genomas de `generateRiderGenome` (cinco vocaciones, semilla de opinión sintética): el `asoma` de los 19
es el mejor techo de verdad un 72,1 %; a los 20 el mejor está entre los dos `apunta` un 92,0 %; el
`lo_tuyo` acierta un 88,4 % a los 23 y un 98,1 % a los 27.

**Lo que viaja**: `coachView` = `ceilings[]` (`attr`, `opinion` en `CEILING_OPINIONS`), `notes[]`
(cinco códigos, `contracts.ts` l. 128-135), `declining`, `facilities` (`bajo`, `normal`, `alto`) y
`season` (`contracts.ts` l. 137-143). **Lo que pinta la web**: la frase de `COACH_OPINION_TEXT`
(`coachOpinion.ts` l. 10-23) dentro de la ayuda desplegable de cada atributo, `Coach: ...` en cursiva
(`AttributeList.tsx` l. 120-134), y solo una a la vez (`open` guarda un atributo, l. 89): leer las diez
pide diez toques, y la lista no marca cuál tiene «lo tuyo»; las notas, entre comillas bajo la lista
(`RiderProfile.tsx` l. 490-497, con el texto en l. 46-52); `declining`, la chapa `Declining` junto a la
edad (l. 419 y 430-440). `facilities` y `season` no se pintan en ningún sitio (grep). El entrenador no
aparece en `/me/training`: su opinión vive en `/me/profile`, y sus razones de cada día no se guardan.
Por diseño (SPEC §5.6) las notas son un bit de cada oculto (`coachNotes`, l. 184-195): `techo_cerca`
es `kDim < 0,15` (`progression.ts` l. 160-164), una cota del techo de la carta frente al atributo, que
se afina con el valor exacto del atributo que viaja (§8).

## §8. La frontera, inventariada

**Medido.** Testigos plantados en el mundo de prueba antes del barrido, y dónde aparecen (las 53 GET
del registro, `spoilerRegistry.test.ts`, salvo `/api/auth/*`, más la vista previa):

| Testigo                                                       | Rutas que lo devuelven                                                |
| ------------------------------------------------------------- | --------------------------------------------------------------------- |
| techo de MON 87,654321, talento 61,23457, fragilidad 1,234567 | ninguna                                                               |
| `riders.ctl` 61,98765 y `riders.atl` 43,21987                 | ninguna                                                               |
| MON visible 63,4172                                           | `GET /api/riders/me` y `GET /api/riders/:id`, con todos sus decimales |
| moral 57,31415                                                | `GET /api/riders/me/summary`                                          |
| `ctl`, `atl` y `tsb` del último día del diario                | `GET /api/riders/me/form`; derivados, en la vista previa (`days[]`)   |

Comparados con su esquema, 27 de las 28 rutas del jugador mandan exactamente las claves del contrato;
`GET /api/teams/:id/news` manda seis de más (`personal`, `riderId`, `riderName`, `country`, `teamId`,
`teamName`), que la web descarta sin saberlo. Inocuas, pero prueban el hueco de §9. En este mundo
llegan vacías `palmares`, `ledger`, `offers`, `race-entries`, `free-agents` y `badges`.

**Lo que viaja y no se enseña**, por gravedad (la columna «Uso» es un `grep` en `apps/web/src`):

| Ruta y campo                                                                                       | Uso en la web                                                                                      | Gravedad                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/riders/:id`, `attributes` (`contracts.ts` l. 790; `browse.ts` l. 415-420)                | estrellas y nada más (`AttributeList.tsx` l. 115); también en la plantilla (`TeamSquad.tsx` l. 72) | **alta**, SPEC §3.2: el valor interno de cualquier corredor; ni el propio lleva más que estrellas y la marca de cuatro pasos, que existe para no enseñarlo (l. 33-38) |
| `GET /api/riders/me`, `attributes` (`contracts.ts` l. 79; `db/riders.ts` l. 197-200)               | estrellas y marca; además, el cálculo de los cerillos en la ficha (`RiderProfile.tsx` l. 213-225)  | **alta**, SPEC §3.2; viaja también a `MyRaces` y `TeamSquad`, que no lo usan                                                                                          |
| vista previa, `arrivals[].tsb` (`riders.ts` l. 477)                                                | ninguno                                                                                            | **alta**, SPEC §3.2 y §3.3, y `entrenamiento.md` l. 1086 («nunca el TSB»)                                                                                             |
| vista previa, `days[]`: `ctl`, `atl`, `tsb`, `tss`, `session`, `intensity` de 28 días (l. 463-468) | ninguno                                                                                            | **alta** por los tres de carga; `session` es el bloque expandido que el panel no enseña                                                                               |
| `GET /api/riders/me/form`, `log[].atl` (90 días)                                                   | ninguno (`ctl` y `tsb` se traducen a barras y cerillos, `condition.ts` l. 35-42)                   | **media**: número interno sin uso; `ctl` y `tsb` son la excepción declarada (`condition.ts` l. 4-16)                                                                  |
| `GET /api/riders/me/trend`, `delta28`                                                              | solo la flecha de cinco niveles (`AttributeList.tsx` l. 53-76)                                     | media: delta en unidades internas; el informe del bloque ya enseña uno parecido con un decimal                                                                        |
| vista previa, `arrivals[].raceId`                                                                  | ninguno, y siempre `null`                                                                          | inocua; es el hueco de §5                                                                                                                                             |
| `coach-view`, `facilities` y `season`                                                              | ninguno                                                                                            | baja: un tramo del gimnasio del equipo y la temporada                                                                                                                 |
| `summary.fame`, `riders/:id.fame`, `countries/:code` y `free-agents` `fame`                        | ninguno                                                                                            | inocua: vale 0, la columna no se escribe nunca (`schema.ts` l. 326-340)                                                                                               |
| `plan.startDay`, `plan.goalRaceId`; `upcoming-races.startGameDay`; `travelDays[].raceKey`          | ninguno                                                                                            | inocuos; `startDay` es justo lo que la escalera necesitaría para poner fechas                                                                                         |

**Números que la pantalla sí enseña** aunque el SPEC pida otra forma (no son de frontera, pero E3 los
pinta): la moral en porcentaje (`RiderProfile.tsx` l. 273, `Home.tsx` l. 307; SPEC §3.3 la da «en
estrellas o iconos»), la frescura como `N / 100` junto a su barra (`Home.tsx` l. 354), los deltas del
informe con un decimal (`BlockReport.tsx` l. 38 y 69-77) y el TSS en cuatro sitios (`PlanLadder.tsx`
l. 233; `Training.tsx` l. 52, 56 y 280; `RaceEffortLog.tsx` l. 75).

## §9. Los mecanismos parecidos a una regla de frontera

1. **El comentario de cabecera de la ficha** (`riders.ts` l. 551-563): «ningún oculto cruza esta
   frontera» y «la API no manda lo que la pantalla no enseña». Cubre tres rutas (`trend`,
   `coach-view`, `report`) y el mismo fichero lo desmiente en l. 477 y l. 463-468. Su gemelo en
   `contracts.ts` l. 84-92 avisa contra un `ceiling: z.number()` en el contrato, pero un campo de más
   no necesita tocar el contrato: la API puede mandarlo y la web lo tira (_strip_, l. 9-11).
2. **El registro de rutas de E2** (`spoiler.ts` l. 63-88 y 155-183): cada ruta declara `spoiler`
   (`safe`, `horizon`, `watch`) y `veil` (mecanismo y, con `L`, su motivo), y el servidor no arranca si
   falta; `spoilerRegistry.test.ts` escribe la tabla literal y la compara en los dos sentidos (l. 14-30).
   **Generalizable**: una tercera declaración por ruta (qué clase de dato sirve: público, del dueño,
   derivado de un oculto) con la misma alarma al arrancar.
3. **El canario de B1a** (`spoilerCanary.test.ts` l. 20-51) y el barrido (`spoilerWorld.ts`
   l. 327-351): planta valores que solo existen en lo velado y barre todas las GET con la sesión del
   jugador. **Es el más generalizable** y este mapa lo ha hecho a mano (arriba): bastan testigos en
   `rider_hidden`, `riders.ctl`/`atl`, el diario y `rider_attrs`. Su hueco: solo barre las GET (l. 334),
   y la vista previa es POST.
4. **El diferencial de B1b** (`spoilerDiff.test.ts` l. 19-31) con su lista blanca por ruta
   (`B1B_WHITELIST` y `B1B_VEIL`, `spoilerWorld.ts` l. 60-80): el modelo para una lista de campos permitidos.
5. **La prueba del contrato del entrenador** (`web/src/api/contracts.test.ts` l. 131-155): rechaza
   `tres`, `cuatro` y `cinco`, pero en la web; no mira lo que la API manda ni caza un campo nuevo.
6. **`.strict()`**: solo en dos cuerpos de petición (`admin.ts` l. 40-47; `broadcast/wire.ts` l. 546).
   Ninguna respuesta se valida en la API (ni `response:` de Fastify ni `parse` antes de enviar, grep).
   Una versión `.strict()` de cada esquema de respuesta pasada por un test de la API habría cazado las
   seis claves de `teams/:id/news`.
7. **Las alarmas estáticas**: `columnasVivas.test.ts` (l. 6-24: toda columna numérica con valor por
   defecto se escribe en algún sitio o va en una lista con su porqué) y `noEngine.test.ts` (l. 8-17: el
   AST de `apps/web/src`). **Generalizable** al revés: todo campo de un esquema de respuesta se lee en
   `apps/web/src` o va en una lista con su motivo; hoy esa lista tendría los campos de la tabla de §8.

## Lo que este mapa no ha podido comprobar

- **La carga real de una etapa** es la de un mundo de doce corredores (252,8 TSS en una etapa, 42 en
  la otra): las llegadas «con carga real» de §3 son una estimación con ese número y con 150.
- **El caso del dueño** (`Day 182`, `Rusty` en cuatro etapas): no tengo su mundo ni su plan; §3 da una
  explicación posible, no la comprobada.
- **El orden de los planes solapados en Postgres de producción**: medido en PGlite; sin `ORDER BY` el
  resultado depende del plan de consulta.
- **Las rutas del mánager** (`/api/teams/me/*`) y las mutaciones, salvo la vista previa, no entran en
  el barrido (el jugador de B1 no tiene equipo); las seis que llegan vacías (§8), solo en la cáscara.
