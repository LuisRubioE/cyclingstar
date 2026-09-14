# Mapa 04: el BANCO DE MEDIDA y su dependencia de los perfiles

Lectura del árbol a fecha 2026-09-14 (HEAD `8585ca2`, `ENGINE_VERSION = 69` en
`packages/engine/src/constants.ts` l. 718). Ficheros leídos enteros: `packages/engine/src/sim/targets.ts`
(735 l.), `scenarios.ts` (481), `realQueens.ts` (481), `cli.ts` (320), `calendarQueens.ts` (200 l.
útiles) y su test. Por partes: `smallTours.ts` (lista `SMALL_TOURS`, `shapeStats`), `grandTour.ts`
(medida de colas, l. 295-340), `analyze.ts` (qué cuenta cada estadístico), `invariants.test.ts` (qué
banda se comprueba con cuántas semillas), `world.ts` (l. 138-200 y 755-830, la composición de días de
carrera), `routes/calendar.ts` (`stageMix` l. 546, `stagesFromEdition` l. 216), `routes/profileGen.ts`
(`mountainSegments` l. 300-445), `routes/finalKind.ts`, `constants.ts` (bloque `ROUTE.queen*`, l.
1160-1190). Documentos: `docs/epics.md` E3 (pasos 1 a 8) y V2, `docs/balance.md` v40 §1, v43 §5-§10
(l. 8575-8700), v44 cierre (l. 9069-9110), v60 §1b (l. 11678-11765).

La pregunta del mapa es una sola: **de las bandas de `TARGETS`, cuáles dependen del PERFIL de la
etapa, sobre qué perfil se miden hoy, y qué pasa con ellas si el generador de recorridos cambia de
forma.** El final propone cómo medir que un generador nuevo es mejor.

---

## 0. Los comandos y dónde corre cada cosa

| Comando (`package.json` l. 14-24)    | Fichero                               | Qué corre                                                                                                                                                                                                                            | Bandas que comprueba                                                                                                                                                              |
| ------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm sim [runs=500]`                | `sim/cli.ts`                          | `llana-180`, `media-190` (informativo), `reina-150`, `cri-40`, cronos reales (`runs/60`), desgaste (5 escenarios), voz de equipo, gran vuelta (`runs/60`, 4-12), reinas reales (4-12), carreras pequeñas (3-8), puertos, Colombia e5 | `flat`, `mountain`, `timeTrial`, `timeTrials`, `erosion`, `chronicle`, `grandTour`, `abandonCauses`, `realQueens`, `smallTours`. Sale con código 1 si alguna falla (l. 317)       |
| `pnpm sim:tactics [runs=120]`        | `sim/tacticsCli.ts`                   | Variedad, Sharjah, caza por campo, final en alto, atribución, «se deja ir»                                                                                                                                                           | Ninguna de `TARGETS`; es un banco de promesas de la capa táctica                                                                                                                  |
| `pnpm sim:mundo [temporadas] [runs]` | `sim/worldCli.ts`                     | 25 temporadas de población; **no simula etapas** (`world.ts` l. 20-24)                                                                                                                                                               | Ninguna de `TARGETS`                                                                                                                                                              |
| `pnpm test:bancos`                   | `vitest run packages/engine/src/sim/` | `invariants.test.ts`, `calendarQueens.test.ts`, `coherence.test.ts`, `raceRadio.test.ts`, `world.test.ts`                                                                                                                            | Las mismas familias que `pnpm sim` con MENOS semillas, más `calendarQueens` (que `cli.ts` NO imprime: `analyzeCalendarQueens` solo se llama desde `calendarQueens.test.ts` l. 57) |
| `pnpm test:rapido`                   | vitest sin `sim/**`                   | El resto de la suite                                                                                                                                                                                                                 | Ninguna banda                                                                                                                                                                     |

Dos hechos que importan para todo lo que sigue:

1. **`world.ts` no compone carreras**: `calendarioDe(division)` (l. 169-186) toma del `SEASON_CALENDAR`
   las etapas con su `kind` y su `raceClass` y sortea 65 días de carrera por corredor (l. 763-775),
   pero aplica una carga sintética por terreno (`RACE_DAY_TSS`) y `raceLearning` sin correr nada
   (l. 795-830). Para este mapa solo cuenta que **lee el `kind` del generador**: si el generador
   cambia el reparto de tipos, el banco de mundo cambia su carga sin enterarse.
2. **Las carreras «reales» de los bancos son perfiles GENERADOS.** `stagesFromEdition` (calendar.ts l.
   216-226) toma de `RACE_EDITIONS` la salida, la meta, el km y el `terrain` verificados, y el perfil
   detallado lo dibuja `featureSpec`/`oneDaySpec` con semilla `from|to|km`. Es decir: `race-france`
   e20, `race-colombia` e5 o `race-italy` e19 son «reales» en longitud y terreno, y son **generadas** en
   segmentos, rampas y tipo de final. v60 §1b lo dice sin rodeos: al tocar el generador «todos los
   recorridos generados del calendario cambian» (balance.md l. 11680-11682).

---

## 1. Los perfiles sobre los que se mide

### 1.1 Canónicos (`scenarios.ts`): perfil de MANUAL, campo a mano

| Escenario      | Perfil (l.)                                                                             | Campo                                                                                      | Quién lo usa                                                                                 |
| -------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `llana-180`    | 1 segmento `llano` de 180 km, meta volante km 100 (l. 209-213)                          | 10 sprinters en degradado 88..70, 6 cazaetapas, 160 relleno; 176 en 22 equipos (`inTeams`) | `flat.*`, `phases.*`, `erosion.flatFresh`, `chronicle.*` (solo su perfil, con `teamedField`) |
| `media-190`    | 12 llano + 8 cotas de 4-6 km al 6-8 % con bajada, la última corona a 10 km (l. 280-290) | como la llana más 5 «puncheurs»                                                            | Solo informativo en `cli.ts` l. 72-79; **sin banda**                                         |
| `reina-150`    | 135 km `llano` + 1 `puerto` de 15 km al 8 %, meta `cima` (l. 332-336). **1.200 m**      | 4 líderes MON 84-87, 6 baroudeurs, 3 sprinters, 163 relleno; 176 en 22 equipos             | `mountain.*`, `erosion.queenFresh`                                                           |
| `reina-150-s3` | la misma con `initialEnergy(100, −55)` (l. 350-361)                                     | el mismo                                                                                   | Informativo (`cli.ts` l. 150-157); era objetivo hasta la v14                                 |
| `cri-40`       | 40 km `llano`, `timeTrial: true` (l. 471)                                               | 8 especialistas CRI 80-84 + 32 correctos; **sin equipos**                                  | `timeTrial.*`                                                                                |

### 1.2 Del calendario con campo UNIFORME (`realRaceScenario`, l. 396-416)

`race-flanders` (`longClassicScenario`), `race-lombardy` (`hardestClassicScenario`), `race-france` e18
en tercera semana (`realQueenThirdWeekScenario`). Campo `uniformField()`: 176 a 60 en todo, 22
equipos. Miden solo erosión (`erosion.longClassicFresh`, `.hardestClassicFresh`, `.queenThirdWeek`).

### 1.3 Del calendario con campo GENERADO por nivel (`generateNpcRider` + `autoStageOrders`)

| Banco            | Lista                                                                                                                                                | Cerrada                              | Campo                                                                                              | Semillas CI / `pnpm sim` |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------ |
| `grandTour`      | `race-france`, 21 etapas (`GRAND_TOUR_ID`, grandTour.ts l. 30)                                                                                       | sí                                   | 176 generados, fatiga y general acumuladas día a día                                               | 12 vueltas / 4-12        |
| `realQueens`     | 9 reinas: colombia e5, two-seas e4, spain e7, france e20, italy e19, catalonia e4, guatemala e9, tachira e6, rhone-alpes e8 (realQueens.ts l. 46-92) | sí (l. 42-44)                        | `buildField(worldSeed, race.level)`: 22×8 WT, 20×7 PRS, 18×7 CON (l. 109-113); fresco, sin general | 6 / 4-12                 |
| `smallTours`     | 10 carreras: arabia, sharjah, besseges, provence, oman, victoria, down-under, colombia, almeria, tramuntana (smallTours.ts l. 61-102)                | sí                                   | mismo `fieldFor`, corridas ENTERAS con fatiga y general                                            | 8 / 3-8                  |
| `timeTrials`     | 5 cronos: colombia, nc-co-itt, italy, spain, chrono (timeTrials.ts l. 56-79)                                                                         | sí                                   | campo de la división                                                                               | 6 / `runs/60`            |
| `calendarQueens` | 1 de cada 6 de las ~157 reinas ordenadas por desnivel (`PASO = 6`, calendarQueens.ts l. 51, 85-87)                                                   | **no**, se recalcula sola (l. 22-27) | `realQueenSetup` (el mismo campo que `realQueens`)                                                 | 4 (solo test, l. 57)     |

---

## 2. Qué bandas dependen del perfil, y de cuál

Criterio para la columna «sensibilidad al perfil»: ALTA si el propio comentario de `targets.ts` o
`balance.md` tiene medida una variación grande al cambiar solo el trazado; MEDIA si depende del tipo
de etapa pero no está medida la pendiente; BAJA si el perfil apenas entra (campo, ley de velocidad,
salud).

| Banda (`TARGETS`)                                                                                | Estadístico (dónde se calcula)                                                                 | Perfil sobre el que se mide                                          | Canónico / real               | Sensibilidad | Evidencia                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flat.breakawayWinPct` 5-16 %                                                                    | evento `meta` con `datos.fuga === 1` (`analyze.ts` l. 46)                                      | `llana-180` (g = 0, 180 km)                                          | canónico                      | ALTA         | v38: el dueño recentró la banda porque el 2-8 describía una llana de gran vuelta (targets l. 35-41). En producción, 5 de 24 llanas (21 %) las ganó la fuga (l. 480-485)                                  |
| `flat.bestSprinterWinPct` 30-45 %                                                                | ganador === `bestSprinterId`                                                                   | `llana-180`                                                          | canónico                      | BAJA         | depende del campo (empate a tres → ruido), no del trazado                                                                                                                                                |
| `flat.catchKmToFinish` 8-25                                                                      | mediana de `totalKm − km` del `breakaway_caught` (l. 49)                                       | `llana-180`                                                          | canónico                      | MEDIA        | con un repecho final el pelotón cerraría antes; no medido                                                                                                                                                |
| `phases.attemptsPerStage` 10-25, `attemptsAfterKm100` 2-25, `counterAfterCatchPct` 25-60         | `analyzePhases` sobre la llana                                                                 | `llana-180`                                                          | canónico                      | MEDIA        | `flyerWinPct` no tiene banda porque en llana pura «el terreno no ayuda NUNCA» (targets l. 63-73): reconocimiento explícito de que el perfil decide la medida                                             |
| `mountain.breakawayWinPct` 25-45 %                                                               | `datos.fuga === 1` (`analyze.ts` l. 81)                                                        | `reina-150` (1.200 m)                                                | canónico                      | **ALTA**     | 26,7 % con puerto de 15 km, 10 % con 25, 3,3 % con 35, 0 % con 50 (targets l. 87-92; epics E3 paso 4). Reetiquetada «control de forma» en v44                                                            |
| `mountain.top10GapSeconds` 40-300 s                                                              | `results[9].tiempoS − results[0].tiempoS` (l. 83)                                              | `reina-150`                                                          | canónico                      | **ALTA**     | «depende de cuánto dura el puerto»: al cambiar la VAM el mismo 9 % pasó de 171 a 250 s (targets l. 94-98)                                                                                                |
| `timeTrial.p90MinusP10Seconds` 80-170 s, `specialistWinPct` 90-100 %                             | brecha central / ganador especialista                                                          | `cri-40` (40 km llanos)                                              | canónico                      | BAJA         | es la ley de velocidad sobre un campo estrecho; una crono con repecho la movería, pero está anclada en llano                                                                                             |
| `timeTrials.tailPct` 8-15 %, `worstStagePct` 0-17 %                                              | cola del último en % del ganador, mediana del banco                                            | 5 cronos generadas del calendario                                    | real (generada)               | MEDIA        | la erosión de 12 km más ensancha 0,7 puntos (targets l. 156-161): la LONGITUD del perfil entra, el relieve apenas                                                                                        |
| `erosion.flatFresh` 0-0,02                                                                       | erosión mediana del campo                                                                      | `llana-180`                                                          | canónico                      | ALTA         | por construcción: g = 0                                                                                                                                                                                  |
| `erosion.queenFresh` 0,18-0,5                                                                    | ídem                                                                                           | `reina-150`                                                          | canónico                      | **ALTA**     | «lo que esta mediana mide hoy es lo que el grupeto AHORRA» porque el puerto son los últimos 15 km (targets l. 181-186); la reina real erosiona 0,51 y habría exigido mover el techo                      |
| `erosion.longClassicFresh` 0,45-0,8                                                              | ídem                                                                                           | `race-flanders` generada (278 km, 16 muros)                          | real (generada)               | ALTA         | v40 §1: cuatro clásicas saturaban porque el generador les daba final en alto de 9-15 km (balance l. 8103-8125)                                                                                           |
| `erosion.queenThirdWeek` 0,6-0,85                                                                | ídem con TSB −55                                                                               | `race-france` e18 generada                                           | real (generada)               | ALTA         | v15: sobre `reina-150-s3` la curva salía de la fórmula y la reina real saturaba al 100 % (targets l. 191-201)                                                                                            |
| `erosion.hardestClassicFresh` 0,45-0,92                                                          | ídem                                                                                           | `race-lombardy` generada                                             | real (generada)               | ALTA         | techo duro contra saturación; nació porque «tres clásicas saturaron sin que nadie lo notara» (l. 205-208)                                                                                                |
| `chronicle.*` (3 bandas)                                                                         | `analyzeTeamVoice` sobre `teamedField(8×5)`                                                    | perfil de `llana-180` (`cli.ts` l. 165)                              | canónico                      | BAJA         | mide el plan de equipo; el perfil solo tiene que ser llano                                                                                                                                               |
| `grandTour.abandonPct` 12-20 %                                                                   | media de abandonos sobre 21 etapas                                                             | las 21 de `race-france` generadas                                    | real (generada)               | MEDIA        | las caídas dependen de pavé y descensos; las 7 reinas ponen la fatiga                                                                                                                                    |
| `grandTour.queenLastGroupPct` 8-14 %                                                             | mediana del último clasificado en las etapas `kind === 'reina'` (grandTour.ts l. 320-335, 499) | las 7 reinas de `race-france`, «todas finales en alto de 170-185 km» | real (generada)               | **ALTA**     | estaba en verde mientras Colombia e5 metía a 126 de 130 a 74 min: «ninguna etapa de la gran vuelta tiene esa forma» (realQueens.ts l. 5-11)                                                              |
| `abandonCauses.*` (3 bandas)                                                                     | reparto caída/enfermedad/fuera de control                                                      | las 21 de `race-france`                                              | real (generada)               | MEDIA        | el fuera de control depende de la cola de la reina; las otras dos, de salud                                                                                                                              |
| `smallTours.bestSprinterWinPct` 25-60 %, `sweepPct` 0-30 %                                       | victorias del mejor rematador en llegadas agrupadas (≥ 15 en el tiempo del ganador)            | etapas llanas de 10 carreras generadas                               | real (generada)               | MEDIA        | qué etapa cuenta como «agrupada» lo decide el perfil (cuántos llegan juntos)                                                                                                                             |
| `smallTours.flatWinnerGroupPct` 85-100 %                                                         | mediana del % en el tiempo del ganador, etapas `llana`                                         | ídem                                                                 | real (generada)               | ALTA         | objetivo de «no romper» una llana que llega entera (targets l. 447-455)                                                                                                                                  |
| `smallTours.mediaGroups` 3-8, `mediaOneGroupPct` 0-20 %                                          | grupos de tiempo y % con el campo entero al mismo segundo, etapas `media`                      | etapas `media` de las 10 carreras                                    | real (generada)               | **ALTA**     | «una media de verdad deja de 3 a 8 grupos: hay cotas, hay abanico» (l. 457-462); depende de cuántas cotas dibuja `hillySegments` y dónde                                                                 |
| `smallTours.flatMoveWorstMarginS` 0-900 s                                                        | peor margen de una fuga que gana en llano                                                      | etapas `llana`                                                       | real (generada)               | MEDIA        | v38: el dueño abrió el techo a 15 min                                                                                                                                                                    |
| `smallTours.photoRepeatTopFive` 1-3,6, `worstRacePhotoRepeat` 0-4,1, `sameWinnerPairPct` 15-55 % | repetición del top-5 y del ganador entre pares de llegadas agrupadas de la MISMA carrera       | composición de cada carrera (qué etapas son llanas)                  | real (generada)               | **ALTA**     | «una carrera de CINCO llegadas agrupadas seguidas y llanas (Arabia) repite más que una que alterna, y eso es del calendario y no del motor» (l. 574-577): la COMPOSICIÓN de `stageMix` entra en la banda |
| `realQueens.lastGroupPct` 7-14 %, `worstStagePct` 0-18 %                                         | cola del último, mediana de las 54 corridas (9×6) y peor etapa                                 | 9 reinas generadas elegidas por forma                                | real (generada)               | **ALTA**     | tabla v17→v19 por etapa: «las que acaban ARRIBA seleccionan MÁS y las que acaban abajo, menos», de 2,5 % (spain e7, meta en llano) a 13,3 % (france e20, final en alto) (targets l. 615-628)             |
| `calendarQueens.breakawayWinPct` 6-30 %                                                          | `datos.fuga === 1` sobre 27 etapas × 4                                                         | muestra sistemática por desnivel de TODAS las reinas                 | real (generada), se recalcula | **ALTA**     | 43,8 % por debajo de 1.500 m y 1,6 % entre 2.500 y 3.500 (test l. 33-37); la banda es «vigilancia» y su ancho es 3σ de muestreo (targets l. 693-706)                                                     |

Medidas SIN banda que también dependen del perfil y se imprimen: `medianLeadGroupRiders` (grupo de
cabeza a 30 s, `smallTours.ts` l. 111 y 516; el motor da 1 y el encargo pide 5-15, targets l. 597-618),
`media-190` entera (`cli.ts` l. 72-79), `climbs.ts` (remontadas dentro del puerto), `queenGeometry`
(mix de `finalKind` y km tras la última cota, `calendarQueens.ts` l. 184-200), `mountainRejoins`
(`realQueens.ts` l. 431-481).

**Resumen numérico**: de las 32 bandas de `TARGETS`, 12 se miden sobre perfiles canónicos de manual
(`flat` 3, `phases` 3, `mountain` 2, `timeTrial` 2, `erosion` 2) más las 3 de `chronicle` que usan el
perfil de la llana; 17 se miden sobre perfiles generados del calendario. Las de sensibilidad ALTA al
trazado son 14, y de ellas **4 viven sobre `reina-150` o `llana-180`**, o sea sobre formas que el
calendario no produce.

---

## 3. La lección: un banco canónico en verde certificaba algo falso

Reconstrucción con las citas, en el orden en que se descubrió (epics.md E3 y V2; balance.md v43-v44).

### 3.1 Cronología

| Paso (E3)  | Hecho medido                                                                                                                                                                                                                                                                                                                                                                                       | Fuente                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1          | `grandTour` y `smallTours` pasaban `gcDeficitSeconds: 0` a todos: «un banco de gira sin general no mide una gran vuelta: mide 21 clásicas seguidas». Lección enunciada: «lo que el banco no lleva, el banco no puede medir».                                                                                                                                                                       | epics.md l. 87-97                              |
| 2          | La general no cambia quién gana (10 contra 10 en 456 etapas). Y salió lo grande: en 312 etapas de montaña de gira, **la fuga ganó 0**. Mientras, `TARGETS.mountain.breakawayWinPct` (25-45) estaba en VERDE con 27-30 % sobre `reina-150`, «el mismo estadístico dígito a dígito».                                                                                                                 | epics.md l. 99-112; balance l. 8575-8590       |
| 3          | Manda el perfil. Tabla de tres bancos: `reina-150` (manual, sin fatiga, sin general) 27-30 %; `realQueens` (real, sin fatiga, sin general) **3,3 %**; gran vuelta (real, fatiga, general) **0 %**. «El salto está entero en la primera fila.» La reina que más deja ganar (16,7 %) es la de 47 km rodadores.                                                                                       | epics.md l. 114-126; balance l. 8591-8617      |
| 4          | No es el relieve repartido (40 % de relieve previo aún da 17,5 %); no es el campo (cruce 2×2: 35,0 / 36,7 con perfil canónico, 0 / 0 con `race-france` e20); **es cuánto puerto tiene la etapa**: 15 km 26,7 %, 25 km 10 %, 35 km 3,3 %, 50 km 0 %. Conclusión: «`reina-150` no es una etapa reina fácil: es media montaña con la etiqueta cambiada».                                              | epics.md l. 128-150; balance l. 8618-8690      |
| V2         | Tres opciones para el dueño: mover el objetivo y recalibrar (deja el motor en ROJO, 3,3 contra 25), dejarlo y anotar (barato y deshonesto), o banda sobre `realQueens` con lo que hoy se cumple y subirla por pasos.                                                                                                                                                                               | epics.md l. 153-170                            |
| 5          | La fuga llega al pie con los mismos 11 min tanto si el puerto mide 15 como 50 km; «no la cazan: la SUBEN». `climbRaceKmToGo` de 30 a 5 solo duplica (7,5 → 15 %). Contradice el comentario de `gcControlLeash`.                                                                                                                                                                                    | epics.md l. 172-181                            |
| 6          | No son las piernas (fuga con MON 92 sigue en 0 %) ni la composición (`breakScore` con piernas de llano: 3,33 → 4,44 %, 0,6σ). Es el RITMO: pelotón a 0,85 en el puerto decisivo, fuga en 0,58-0,72. Y luego la aritmética: una fuga P75 65 contra un top 12 % a 88 va un 14,7 % más lenta, 28,8 s/km; 40 km de puerto se comen 19 min. `gcControlLeash` barrido de 700 a 1.800: **no mueve nada**. | epics.md l. 183-213                            |
| 7          | **Corrige todo lo anterior**: el generador hace montaña MÁS BLANDA que la real (mediana de las 157 reinas: 2.023 m; máxima 3.965; ninguna por encima de 4.000; una reina real tiene 3.500-5.000). Sobre muestra sistemática de 27 × 16: **18,1 %**, con 43,8 % bajo 1.500 m y 0 % sobre 3.500. «Los bancos miden etapas elegidas por FORMA, no por FRECUENCIA.»                                    | epics.md l. 215-237; calendarQueens.ts l. 4-20 |
| v44 cierre | El dueño: «está bien así». Entra `calendarQueens.breakawayWinPct` 6-30 como VIGILANCIA (3σ con 108 carreras). La banda vieja no se retira: se reetiqueta «gana la fuga (final en alto canónico)».                                                                                                                                                                                                  | balance l. 9069-9085; targets l. 79-85         |

### 3.2 Qué era exactamente lo falso

No era el número. 27-30 % sobre 1.200 m es una medida correcta de esa etapa. Lo falso era la
**afirmación** que el banco firmaba en verde: «en montaña la fuga vive mucho más: el pelotón controla la
general, no persigue la etapa» (targets.ts l. 76). Sobre las etapas que el juego corre, esa
afirmación valía 3,3 % (formas elegidas) y 18,1 % (frecuencia real), y en cinco versiones nadie lo
midió porque el invariante nunca se puso rojo. Y la lectura posterior (v43 §7, balance l. 8636-8655)
dice qué tiene un perfil real que la canónica no tiene: **subida fuera de los últimos 30 km**. La
canónica tiene 0 %; las nueve reales, del 6 % al 38 %. La banda estaba medida sobre «una forma de
etapa que no existe en el calendario».

### 3.3 El mismo patrón, seis veces

El comentario de `targets.ts` lo nombra como regla («lo que no se mide sobre carreras reales, no se
mide», l. 213-215 y l. 375-379) y la historia lo repite:

| Versión | Banco canónico en verde                           | Lo que producción hacía                                    | Banco nuevo                            |
| ------- | ------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------- |
| v15     | `erosion.queenThirdWeek` sobre `reina-150-s3`     | la reina real saturaba con el 100 % en pájara              | `reina-real-s3` (`race-france` e18)    |
| v17     | `grandTour.queenLastGroupPct` (7 finales en alto) | Colombia e5: 126 de 130 a 74 min                           | `realQueens` (9 formas)                |
| v19     | `timeTrial.p90MinusP10Seconds` sobre `cri-40`     | cola del 46,4 % y 65 alcances en `race-colombia` e3        | `timeTrials` (5 cronos)                |
| v23     | `flat.bestSprinterWinPct` (empate a tres)         | Race Arabia: 5 de 5 el mismo                               | `smallTours` (10 carreras enteras)     |
| v40     | saturación solo sobre un día WorldTour            | Jura, Andorra, Appennino, Ses Salines con el tanque a cero | las 8 más exigentes del calendario     |
| v44     | `mountain.breakawayWinPct` sobre `reina-150`      | 0 % en gira, 3,3 % en formas, 18,1 % en frecuencia         | `calendarQueens` (muestra sistemática) |

Cuatro de los seis casos son **defectos del perfil sobre el que se medía**, no del motor. Y hay una
diferencia de segundo orden entre ellos que importa para el rediseño del generador: `realQueens`,
`smallTours` y `timeTrials` son listas CERRADAS por nombre (para comparar entre versiones,
realQueens.ts l. 42-44), y `calendarQueens` se recalcula sola (para medir el calendario de hoy,
calendarQueens.ts l. 22-27). **Las cerradas conservan el nombre pero no la forma**: al cambiar el
generador, `race-france` e20 sigue llamándose igual y su perfil es otro.

### 3.4 Lo que el generador ya cambió después (v60 §1b, `ENGINE_VERSION` 63 → 64)

`mountainSegments` (profileGen.ts l. 337-414) ahora decide primero el desnivel objetivo (60 % en
2.600-4.600 uniforme en logaritmo, 40 % en 1.200-2.500; `ROUTE.queenDplusRange`,
`queenHighDplusShare`, `queenLowDplusRange`, constants l. 1167-1170) y el tipo de final
(`ROUTE.queenFinalMix` 0,45/0,20/0,25/0,10, l. 1185), y después dibuja los puertos escalando su
longitud, nunca su pendiente (factor recortado a [0,55; 1,8], l. 380-384). Medido sobre las 157 reinas
(balance l. 11716-11726):

| Métrica                |    v63 |      v64 |
| ---------------------- | -----: | -------: |
| `alto`                 | 56,7 % |   38,2 % |
| `cima_cerca`           |  2,5 % |    8,9 % |
| `valle_corto`          | 35,0 % |   42,0 % |
| `valle_largo`          |  5,7 % |   10,8 % |
| dPlus > 3.500 m        |  1,9 % |   10,8 % |
| dPlus < 1.500 m        | 20,4 % |   21,0 % |
| km tras la última cota | med. 0 | med. 9,0 |

Y dos cosas que el mapa tiene que dejar dichas: (a) la mediana de desnivel siguió en 2.053 m, y el
criterio «2.800-4.200» se declaró **aritméticamente incompatible** con conservar la cola baja que
`calendarQueens.test.ts` exige (balance l. 11730-11745); (b) el comentario de `targets.ts` l. 79-84
sigue diciendo «mediana de 2.023», que es la cifra del generador viejo. Las cuatro aserciones de
`calendarQueens.test.ts` quedaron en verde con el generador nuevo, y `realQueens`, `grandTour` y
`smallTours` no tienen anotada en balance.md una remedición por etapa tras la v64: sus perfiles
cambiaron y sus bandas siguieron pasando, que es exactamente la situación que este mapa quiere que no
se dé por buena sin mirar.

---

## 4. Si el generador cambia de forma: qué se rompe, qué debe moverse

### 4.1 Lo que NO se movería, y por eso es ciego

Las 15 bandas sobre `llana-180`, `reina-150`, `cri-40` y `chronicle`. No dependen del generador:
seguirán en verde con cualquier calendario. Son útiles como **controles de forma** (misma etapa antes y
después de un cambio de motor) y **no dicen nada del juego**. El riesgo no es que fallen: es que se
lean como certificación, que es lo que pasó con `mountain.breakawayWinPct` durante cinco versiones.

### 4.2 Lo que se rompería sin que nadie lo decida (listas cerradas sobre perfiles generados)

| Banda                                                                 | Por qué se mueve con el generador                                                                                                                                                                                                                                                 | Dirección esperada si la montaña se endurece o los finales bajan                                                                                    |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `realQueens.lastGroupPct` 7-14 %, `worstStagePct` ≤ 18 %              | Las 9 etapas se eligieron por una forma que ya no está garantizada: `why` de `race-france` e20 dice «171 km y 4.516 m con final en alto» (l. 65) y `race-catalonia` e4 «38 de los últimos 50 km son puerto» (l. 75); con `queenFinalMix` el final de cada una se vuelve a sortear | Más `valle_*` baja la cola (spain e7 con meta en llano: 2,5 %); más desnivel la sube. El `worstStagePct` de rhone-alpes e8 estaba a 17,57 contra 18 |
| `grandTour.queenLastGroupPct` 8-14 %                                  | Las 7 reinas de `race-france` eran «todas finales en alto»; con 45 % de `alto` habrá 3-4 con valle                                                                                                                                                                                | Baja (v19 midió que el valle devuelve el autobús). Ya rozó 7,63 contra 8 en una tanda (constants l. 1290)                                           |
| `grandTour.abandonPct`, `abandonCauses.outOfTimePct` ≥ 1 %            | El fuera de control lo produce la cola de la reina                                                                                                                                                                                                                                | Con colas más cortas, `outOfTimePct` puede quedarse mudo otra vez (el suelo del 1 % existe para eso, targets l. 393-402)                            |
| `erosion.queenThirdWeek`, `.longClassicFresh`, `.hardestClassicFresh` | Son tres perfiles generados por nombre                                                                                                                                                                                                                                            | Cualquier cambio en `mountainClassicSegments` o en `featureProfile` mueve la erosión de Flandes y Lombardía; el techo duro 0,92 es la alarma        |
| `smallTours.mediaGroups`, `mediaOneGroupPct`, `flatWinnerGroupPct`    | Dependen de `hillySegments`/`hillyUphillSegments` y de `stageMix`                                                                                                                                                                                                                 | Cotas más cerca de meta parten más; cotas más lejos traen el campo entero (el defecto de producción, 23 %)                                          |
| `smallTours.photoRepeat*`, `sameWinnerPairPct`                        | Cuentan PARES de llegadas agrupadas por carrera: si `stageMix` cambia el reparto llana/media, cambia el número de pares y la repetición                                                                                                                                           | Menos llanas seguidas baja la repetición por composición, no por motor                                                                              |
| `timeTrials.tailPct`, `worstStagePct`                                 | Solo si `ittSegments` cambia longitud o añade repechos                                                                                                                                                                                                                            | Longitud +12 km = +0,7 puntos de cola (targets l. 158-161)                                                                                          |

Todas estas fallarían o pasarían **por el generador y no por el motor**, y el diff que las hiciera
fallar sería uno de `routes/`, que `ci.yml` sí manda a `test:bancos` (está dentro de `packages/engine/`).
Lo que no existe es una prueba que diga «esta banda cambió porque cambió el perfil», salvo el
mecanismo de `checkReplay` que obliga a subir `ENGINE_VERSION` (balance l. 11681-11683).

### 4.3 Lo que DEBERÍA moverse a propósito

1. **`mountain.breakawayWinPct` y `mountain.top10GapSeconds`**: o `reina-150` recibe el desnivel de una
   reina (la «otra puerta» de v43 §10, balance l. 8693-8695) y las bandas se remiden, o las dos se
   marcan como control de forma y se les quita la palabra «montaña» del informe. Hoy el rótulo dice
   «final en alto canónico» pero la clave sigue siendo `mountain`.
2. **`calendarQueens.breakawayWinPct` 6-30**: es la única banda diseñada para recalcularse; con un
   generador nuevo hay que remedir el 18,1 y recentrar (y anotar la cifra en targets.ts, que aún cita
   2.023 m). Debería ganar una segunda banda por cubeta de desnivel, porque el test ya afirma la
   pendiente (`facil > dura + 10`) y la banda global se la traga.
3. **`REAL_QUEENS`**: la lista se cerró para comparar entre versiones, pero con el `finalKind`
   sorteado cada `why` puede dejar de ser verdad. Debería cerrarse por **forma medida** (desnivel y
   `finalKind` fijados vía `MountainOptions`, que `mountainSegments` ya acepta, l. 320-322) y no por
   nombre de carrera; o al menos un test que compruebe que cada `why` sigue describiendo el perfil
   (`finalKindOf(stage.profile)` contra lo que la lista dice).
4. **`grandTour.queenLastGroupPct`**: con las 7 reinas de `race-france` ya no homogéneas, debería
   partirse por `finalKindOf` (alto contra valle), como `realQueens` ya partió su lectura en v19.
5. **`smallTours.photoRepeat*`**: separar la parte de composición (cuántas llanas seguidas trae
   `stageMix`) de la parte de motor; la propia banda reconoce que Arabia repite «por el calendario».
6. **`medianLeadGroupRiders`** (deuda sin banda): un generador con más `cima_cerca` y `valle_corto`
   es la ocasión de medirla por tipo de final y ponerle banda donde ya no nazca en rojo.

---

## 5. Cómo medir que un generador nuevo es MEJOR

Dos ejes que no se pueden confundir, porque en v60 §1b ya se vio que chocan: **realismo** (¿se parece
el calendario a lo que se corre?) y **variedad** (¿dos etapas del mismo tipo se distinguen?). Las
métricas de abajo son de geometría (coste ≈ 0, sobre las ~157 reinas y las ~500 etapas, como
`queenGeometry`) salvo donde se dice, y todas deberían medirse **pareadas**: mismo `worldSeed`, mismo
campo, misma semilla de etapa, generador viejo contra nuevo, como hizo la v49 con la brecha 1.º-10.º.

### 5.1 Realismo (distribuciones del calendario contra referencias externas)

| Métrica                                                           | Cómo se calcula                                                                                    | Referencia que ya está escrita en el repo                                                                                 | Criterio de «mejor»                                                                   |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Desnivel de reina por formato (gran vuelta / una semana / un día) | `desnivelDe` por etapa, cuantiles p10/p50/p90 por `format`                                         | Reina de gran vuelta 3.500-5.000 m (epics l. 218); reina de vuelta pequeña «la cola baja existe» (constants l. 1160-1166) | p50 de gran vuelta sube hacia 3.000+ SIN vaciar la cubeta < 1.500 de las pequeñas     |
| Mix de `finalKind` por generador                                  | `queenGeometry` partido por `mountainSegments` / `hillyUphillSegments` / `mountainClassicSegments` | `ROUTE.queenFinalMix` ± 0,08; v60 §1b anota que el mix del calendario mezcla tres generadores (balance l. 11748-11753)    | Cada generador dentro de ±0,08 de SU reparto; el del calendario, dentro del suyo      |
| Km tras la última cota (mediana y p90)                            | `kmAfterLastClimb`                                                                                 | Mediana pasó de 0 a 9 km (balance l. 11726); clásicas de montaña coronan a 15-20 km (profileGen l. 430-436)               | p90 de clásicas de montaña en 15-25; reinas `alto` en 0                               |
| Subida fuera de los últimos `climbRaceKmToGo` (30 km)             | % de km de `subida` con `kmToGo > 30` sobre el total                                               | Es la variable que separó canónica (0 %) de reales (6-38 %) en v43 §7 (balance l. 8636-8655)                              | Ninguna reina generada en 0 %; distribución 5-40 %                                    |
| Longitud y pendiente de puertos                                   | `len`, `g` medio y máximo por puerto de ≥ `CLIMB_MIN_KM`                                           | `mountainSegments` sortea 6-11 km al 5,5-7,5 y final 9-15 al 7,5-9,5 (l. 362-366); la escala solo toca longitud           | Ningún puerto por encima de 25 km ni final por debajo de 8,6 (ya garantizado, l. 393) |
| Saturación de erosión                                             | `analyzeErosion` sobre las 8 más exigentes (invariante v40) con campo uniforme                     | Techo 0,92 (`erosion.hardestClassicFresh`)                                                                                | 0 de N saturan; demanda máxima sigue en Lombardía, no en una generada                 |
| Cola de la reina por `finalKind`                                  | `realQueens`-like sobre muestra sistemática, partida por `finalKindOf`                             | Tabla v19: alto 13,3 %, valle 2,5-3,5 % (targets l. 615-628)                                                              | Orden alto > cima_cerca > valle_corto > valle_largo se conserva; ninguna > 18 %       |
| Fuga que gana por cubeta de desnivel                              | `analyzeCalendarQueens` por banda                                                                  | 43,8 / 13,7 / 1,6 / 0 (epics l. 226-233)                                                                                  | Monótona decreciente; total dentro de 6-30 o recentrado con medida                    |
| Quién gana por tipo de final (simulación, cara)                   | vocación del ganador (`generateNpcRider` la lleva) por `finalKind`                                 | Escalador 72,3 % en `alto` y 50,0 % en `valle_largo` (constants l. 1181-1183)                                             | La correlación R28.2 se conserva o se acentúa                                         |

### 5.2 Variedad (que dos etapas del mismo tipo no sean la misma)

| Métrica                                                          | Cómo se calcula                                                                                                | Criterio de «mejor»                                                                                      |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Entropía de `finalKind` dentro de cada vuelta con ≥ 2 reinas     | Shannon sobre las cubetas de la carrera                                                                        | Ninguna gran vuelta con sus 5-7 reinas todas `alto` (hoy `race-france` lo era)                           |
| Distancia entre perfiles del mismo `kind`                        | Correlación de los vectores `g` por km (`sampleProfile`) entre pares de etapas del mismo tipo y longitud ±10 % | Mediana de correlación < 0,8: una reina no es otra reina desplazada                                      |
| Dispersión de desnivel dentro de la cubeta alta                  | σ de dPlus en 2.600-4.600                                                                                      | > 500 m (la uniforme en log da eso; una constante daría 0)                                               |
| Nº de puertos por reina y reparto de su posición (km al primero) | recuento de `puerto ≥ 1,5 km`; km del primero                                                                  | 2-4 puertos; primer puerto entre el 20 % y el 60 % de la etapa, no siempre en el mismo sitio             |
| Composición de vueltas (`stageMix`)                              | Frecuencia de cada secuencia llana/media/reina/cri en vueltas de 5                                             | Ninguna secuencia > 25 % de las vueltas de 5; ya hay tests de garantías (calendar.test.ts l. 168-257)    |
| Repetición de la foto por composición (simulación, cara)         | `photoRepeatTopFive` pareado viejo/nuevo sobre `smallTours`                                                    | La parte que se mueve se explica por pares de agrupadas (composición), no por el motor                   |
| Ganadores distintos por vuelta y por tipo (simulación, cara)     | `distinctWinnerPct` de `winShare` y el mismo por `kind`                                                        | Sube o se mantiene con el mismo motor: si un generador nuevo baja la variedad de ganadores, ha empeorado |

### 5.3 Reglas de método para la comparación

1. **Pareado y con `engineVersion: 1` fijo en la semilla**, como todo el banco (realQueens.ts l.
   179-182): la diferencia por semilla es la medida; la mediana agrupada baila en huecos de la
   nube (v49, targets l. 108-131).
2. **Las listas cerradas se leen dos veces**: con el nombre (¿qué le pasó a `race-france` e20?) y con la
   forma (¿qué le pasa a las etapas `alto` de 4.000 m?). Si solo se lee por nombre, un cambio de forma
   se confunde con un cambio de motor.
3. **Un generador es mejor si mueve las bandas de §4.2 en la dirección que la carretera dice y NO mueve
   las de §4.1** (que no puede mover). Si una banda canónica se mueve al cambiar `routes/`, hay un
   acoplamiento que no debería existir.
4. **Ninguna banda nueva nace en rojo**: se mide primero (como `media-190` y `medianLeadGroupRiders`
   hoy), se imprime en `pnpm sim`, y se le pone banda cuando la cifra tenga dueño y sigma conocida.
5. **Todo lo geométrico va al test rápido** y solo lo simulado a `test:bancos`: `queenGeometry` cuesta
   lo que cuesta leer 157 perfiles y puede correr en cada push, cosa que hoy no hace.
