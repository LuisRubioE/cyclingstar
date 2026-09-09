# Mapa de bancos: QUÉ SE MIDE HOY en `packages/engine/src/sim/`

Lectura técnica del estado del árbol a fecha 2026-09-08 (HEAD `abd0276`). Solo describe lo que hay;
no propone. Ficheros leídos enteros: `targets.ts`, `invariants.test.ts`, `scenarios.ts`,
`analyze.ts`, `grandTour.ts`, `realQueens.ts`, `smallTours.ts`, `timeTrials.ts`, `tactics.ts`
(el de `sim/`), `coherence.ts`, `coherence.test.ts`, `raceRadio.ts`, `calendarQueens.ts` y su test,
`cli.ts`, `tacticsCli.ts`. Por encima: `climbs.ts`, `world.ts`/`world.test.ts`, `raceRadio.test.ts`,
`.github/workflows/ci.yml` y `cobertura.yml`, `scripts/medir-*.mjs`, cabecera de `docs/tactica.md`.

---

## 0. Resumen de la arquitectura de medida

| Pieza               | Qué es                                                                                                                                                                                | Quién la consume                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `targets.ts`        | **Fuente única** de las bandas (`TARGETS`), 30 bandas en 12 familias. Cada una con su razón y su historia.                                                                            | `invariants.test.ts`, `calendarQueens.test.ts`, `cli.ts` (`pnpm sim`)                      |
| `scenarios.ts`      | Escenarios canónicos con campo **fijo a mano** (llana-180, media-190, reina-150, reina-150-s3, cri-40) y escenarios sobre recorridos **reales** con campo **uniforme** (60 en todo).  | invariantes, coherencia, cli, tactics                                                      |
| `analyze.ts`        | Montecarlo de una etapa suelta: `analyzeFlat`, `analyzeMountain`, `analyzeErosion`, `analyzeTimeTrial`.                                                                               | invariantes, cli                                                                           |
| `grandTour.ts`      | Corre `race-france` (21 etapas, 176 corredores generados) día a día con fatiga, general y abandonos.                                                                                  | invariantes, cli                                                                           |
| `realQueens.ts`     | 9 reinas reales elegidas a mano (lista CERRADA), una etapa suelta cada una con campo generado por nivel. Además `colombiaRegressionTails`, `italy9SummitFinishes`, `mountainRejoins`. | invariantes, cli, `climbs.ts`, `calendarQueens.ts`                                         |
| `smallTours.ts`     | 10 carreras reales (lista CERRADA) corridas ENTERAS con el mismo campo, fatiga y general.                                                                                             | invariantes, cli, `medir-defectos.mjs banco`                                               |
| `timeTrials.ts`     | 5 cronos reales (lista CERRADA), campo de la división de la carrera.                                                                                                                  | invariantes, cli                                                                           |
| `calendarQueens.ts` | Muestra SISTEMÁTICA (1 de cada 6 por desnivel) de las ~157 reinas del calendario. Se recalcula solo.                                                                                  | `calendarQueens.test.ts`                                                                   |
| `climbs.ts`         | Lo que pasa DENTRO de un puerto (3 fotos: pie, mitad, cima) sobre las mismas reinas reales.                                                                                           | solo `cli.ts` (informativo, sin banda)                                                     |
| `tactics.ts`        | Bancos de la capa táctica: variedad, Sharjah, caza por campo, final en alto, atribución, plan de equipo, «se deja ir».                                                                | `teamedField`+`analyzeTeamVoice` en invariantes y cli; el resto SOLO en `pnpm sim:tactics` |
| `coherence.ts`      | Auditoría de la crónica (12 contradicciones + 4 medidas de «espina dorsal»).                                                                                                          | `coherence.test.ts`, `scripts/medir-defectos.mjs`                                          |
| `raceRadio.ts`      | Estado de carrera km a km desde `StageProbe` (grupos, huecos, quién tira, motivo, para quién).                                                                                        | `raceRadio.test.ts`, `scripts/race-radio.mjs`, `apps/api`                                  |
| `world.ts`          | Población de bots a lo largo de 25 temporadas (entrena y corre; NO simula etapas).                                                                                                    | `world.test.ts`, `pnpm sim:mundo`                                                          |

**Determinismo**: todo con `stageSeed({worldSeed, raceId, stageDay, engineVersion: 1})` —
`engineVersion` FIJO a 1 en todos los bancos para que un cambio de motor no se confunda con un cambio
de dados. `campaignSeeds(nombre, n)` deriva n semillas de un nombre.

### Dónde y cuándo corre cada cosa (`ci.yml`, `cobertura.yml`, `package.json`)

- `pnpm test:rapido` (job `Test`, cada push/PR): TODA la suite **menos `packages/engine/src/sim/**`**.
  Justificación en el yml: «3 ficheros / 69 pruebas / 536 s contra 95 ficheros / 1.201 pruebas / 102 s».
- `pnpm test:bancos` = `vitest run packages/engine/src/sim/` (job `Bancos de simulación`): **solo si el
  diff toca `packages/engine/`** (o no hay base con la que comparar). «Tardan nueve minutos».
  Cubre `invariants.test.ts`, `coherence.test.ts`, `raceRadio.test.ts`, `calendarQueens.test.ts`,
  `world.test.ts`.
- `cobertura.yml`: nocturno 04:15 UTC, suite entera con cobertura (×1,76-2,26 de instrumentación).
  Es el que ha tirado varios nocturnos por timeout, y de ahí la regla «presupuesto ≥ 4× el coste medido en CI».
- `pnpm sim [runs=500]`: la campaña completa de calibración con informe y `exit 1` si algo sale de banda.
- `pnpm sim:tactics [runs=120]`: informe SIN bandas (no bloquea nada).
- `pnpm sim:mundo [temporadas=25] [corridas=3]`: informe del banco de mundo.

---

## 1. Escenarios y campos (qué pelotón corre cada banco)

### 1.1 Escenarios canónicos (`scenarios.ts`), campo FIJO a mano

Constructor base: `rider(id, over)` → `eff0 = eff(50)`, `energy 100`, `matches 4`, `tsb 0`, órdenes
`{role:'libre', mentality:'reservon', contestSprints:false, contestClimbs:false}`, `gcDeficitSeconds: 0`.
**Ninguno lleva `gcRank`, y `gcDeficitSeconds` es 0 en todos** → según los comentarios de
`grandTour.ts` (l. 251-257) eso deja `hasGcContext` en falso y «esa capa entera» (amenaza a la
general, `gcThreatFraction`) no se ejecuta en los canónicos.

Desde la v38 todos pasan por `inTeams(riders, 8)` (l. 80-132): cada corredor con rol propio
(sprinter/cazaetapas/líder) es JEFE de un equipo, uno por equipo; los `libre` rellenan y pasan a
`gregario` con `targetRiderId` = su jefe, salvo los DOS primeros del equipo de un sprinter, que pasan
a `lanzador` («un tren son dos hombres, no siete»). A un equipo sin jefe se le promueve el primer
relleno a `lider`. Los atributos no se tocan.

| Escenario                  | `name`         | Perfil                                                                                                                       | Campo                                                                                                                                                                                                                                      | Cita del dueño que lo justifica                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `flatScenario()`           | `llana-180`    | 180 km llano, meta volante km 100                                                                                            | 10 sprinters en degradado SPR 88·82·80,5·79·77,5·76·74,5·73·71,5·70 (base 55, LLA 70/68…), 6 cazaetapas (TAC 60, LLA 68, combativo, contestSprints), 160 rodadores base 56 LLA 62-69. **176 en 22 equipos de 8**. `bestSprinterId: spr-0`. | «no te creo… en lo que veo del motor en las llanas la fuga NUNCA gana; quizás tienes que poner más ciclistas en la simulación para que salga algo real… sí, pon un pelotón de verdad en el escenario canónico» (v38); y «sin equipo no hay motivo para que el pelotón tire para acabar con una fuga… al introducir equipos reduces las probabilidades de que las fugas lleguen drásticamente, y por tanto esas simulaciones no valen para nada». |
| `mediumMountainScenario()` | `media-190`    | 12 km llano + 8 cotas de 4-6 km al 6-8 % con descenso y llano menguante (14…8 km) + 10 km llano. ~2.700 m. No acaba en alto. | 10 sprinters (MON 48), 5 puncheurs (`pun-*`: MON 70-73, COL 68, LLA 68, SPR 70, cazaetapas contestClimbs), 5 cazaetapas, 156 rodadores. 176 en 22×8.                                                                                       | «estaría bien poner también algunas de media montaña… muchas montañitas no tan duras, pero que disminuyan las probabilidades de que los sprinters lleguen o que lleguen con fuerzas, y que una fuga con escaladores/rodadores tenga más opciones de ganar»; «una clásica así con algo de montaña pero que no acabe en alto». **Solo se imprime en `pnpm sim`, SIN banda.**                                                                       |
| `queenScenario()`          | `reina-150`    | 135 km llano + puerto de 15 km al 8 %, cima km 150                                                                           | 4 líderes GC (MON 84-87, COL 80, lider contestClimbs), 6 baroudeurs (MON 72-75, cazaetapas combativo), 3 sprinters (SPR 84, MON 42, `libre`), 163 relleno MON 54-65. 176 en 22×8. `bestSprinterId: gc-3` (sic). 1.200 m de desnivel.       | Anotado en `targets.ts`: «`reina-150` … no es una etapa reina sino media montaña con la etiqueta cambiada» (v44).                                                                                                                                                                                                                                                                                                                                |
| `queenThirdWeekScenario()` | `reina-150-s3` | mismo                                                                                                                        | mismo, con `energy = initialEnergy(CTL 100, TSB −55)` y `tsb −55`                                                                                                                                                                          | Informativo desde la v15; control de ORDEN (tiene que erosionar menos que la real).                                                                                                                                                                                                                                                                                                                                                              |
| `timeTrialScenario()`      | `cri-40`       | 40 km llano, `timeTrial: true`                                                                                               | 8 especialistas (CRI 80-84, RES 72, LLA 68) + 32 rodadores (CRI 66-75). **40 corredores, sin equipos** (no pasa por `inTeams`). `bestSprinterId: cri-4`.                                                                                   | «8 especialistas y 32 corredores de crono correcto», campo ESTRECHO por construcción.                                                                                                                                                                                                                                                                                                                                                            |

### 1.2 Recorridos reales con campo UNIFORME (`uniformField()`, `realRaceScenario(raceId, stageIndex=1)`)

176 corredores **todos a 60 en todo**, `fragility 1`, los 22 primeros `lider`, `inTeams(…, 8)`.
«Todos iguales a propósito… para que lo único que explique la erosión sea el RECORRIDO». Lleva
`lugar: {pais, dia}` (v42) → **clima real** de la carrera. Usos: `longClassicScenario()` =
`race-flanders` (278 km, 16 muros, 6 pavés); `hardestClassicScenario()` = `race-lombardy` (241 km,
~4.100 m); `realQueenThirdWeekScenario()` = `race-france` e18 con CTL 100 / TSB −55 (`reina-real-s3`);
y las carreras de un día del bucle de saturación y de coherencia (`race-jaen`, `race-andalusia`).

### 1.3 Campos GENERADOS con `generateNpcRider` (los bancos «con forma de producción»)

| Banco                              | Nivel → equipos                                                | Divisiones por equipo (rotan)                               | Estado inicial                                 | Órdenes                                 | General                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `grandTour.ts` (`race-france`)     | 22×8 fijo                                                      | 18 WT + 4 PRS                                               | ctl 55-80, atl 45-65, moral 55-75, `rec` = REC | `autoStageOrders` cada día con `gcRank` | **Sí**: `gcTotal` acumulado (tiempo − bonificación), ordenado solo entre vivos → `gcRank` y `gcDeficitSeconds` reales |
| `realQueens.ts` (`realQueenSetup`) | WT 22×8 / PRS 20×7 / CON 18×7                                  | WT: [WT,WT,WT,PRS]; PRS: [PRS,PRS,CON]; CON: [CON×4,PRS,WT] | igual                                          | `autoStageOrders` SIN `gcRank`          | **No**: `gcDeficitSeconds: 0`, sin `gcRank`                                                                           |
| `smallTours.ts`                    | misma tabla que realQueens                                     | misma                                                       | igual + `rec`                                  | `autoStageOrders` con `gcRank`          | **Sí**, como grandTour                                                                                                |
| `timeTrials.ts`                    | WT 22×8 / PRS 20×7 / CON 19×7; campeonato 1×40 CON sin equipos | una sola división por nivel                                 | igual                                          | `autoStageOrders` timeTrial             | **Sintética**: rank por MON, déficit 0 / 30·i (<12) / 600 / 900. Dorsales por bloques de decena                       |
| `calendarQueens.ts`                | reutiliza `realQueenSetup`                                     | —                                                           | —                                              | —                                       | No                                                                                                                    |

Lo que `grandTour` y `smallTours` arrastran entre etapas (`TourRider`): `ctl`, `atl` (vía
`applyDailyLoad(stageTss(workUnits))`), `alive` (colapso/dnf del motor, `injuryEndsRace`,
`raceIllnessProbability`), `gcTotal`. **Nada más**: la moral es constante, no hay clasificaciones
secundarias, no hay memoria de quién fugó ayer ni de qué equipo ya ganó.

### 1.4 Campos a medida dentro de tests y `tactics.ts`

- `teamedField({teams: 8, per: 5, kind, strong})` (`tactics.ts` l. 523): 40 corredores, por equipo un
  rematador (SPR 84−t si `t < strong`, si no 62), un lanzador nato (SPR 66, LLA 72), un escalador
  (MON 74), relleno; roles por `autoStageOrders`. **Es el único campo pequeño (8 equipos) de CI**, y
  solo se usa para la voz de la crónica.
- `sharjahField()` (40: un «sprinter malo» SPR 78 / 45 en todo + 39 rivales mejores), órdenes a mano,
  sin `teamId`. Solo `pnpm sim:tactics`.
- `grandTourSprintField()` (5 trenes de 4 + 6 baroudeurs + 14 = 40) y `proSprintField()` (2 trenes de
  2 + 6 + 30 = 40), con `targetRiderId` pero sin `teamId`. Solo `pnpm sim:tactics`.
- Campo de la regresión de Colombia (`colombiaRegressionTails`): 130 corredores en 26 equipos de 5,
  **escalón** 8 a 82 / 16 a 62 / 106 a 52 en todo, `autoStageOrders`, sin general.
- Campo de relevos (invariante 18): 10 gregarios + 10 sprinters a 65, sin equipos, 180 km llano.
- Campo de pavés (invariante 44): 40 a 55 (PAV 55), `fragility 1`, `libre`, sin equipos.

---

## 2. Las bandas de `targets.ts` (lista COMPLETA)

Formato: **clave** — banda — quién la mide (invariante nº de §3 / `pnpm sim`) — justificación resumida
(con lo que el comentario cuenta de su historia).

### `flat` (sobre `llana-180`)

1. **`breakawayWinPct`** — 5-16 % — inv. 1 / sim — «La fuga es minoría en llano». Techo ensanchado en
   v33 (8→10) por MUESTREO (120 semillas dan 10,00 %, 300 dan 6,33 %, 500 dan 4,20 %; σ≈2,2 puntos);
   recentrada en v38 por el dueño: «incluso 2-10 % no me parece muy justa… una etapa llana debería
   tener una banda más centrada en el 10 %». El techo «describe el tamaño de la muestra, no la carrera».
2. **`bestSprinterWinPct`** — 30-45 % — inv. 2 / sim — «Con 3 sprinters de nivel, el mejor gana
   bastantes pero no siempre». (Comentario heredado: desde v38 son 10 en degradado con 88 vs 82.)
3. **`catchKmToFinish`** — 8-25 km (mediana) — inv. 3 / sim — «La caza se cierra dentro de los últimos
   25 km, no a 60 ni en el último km».

### `mountain` (sobre `reina-150`)

4. **`breakawayWinPct`** — 25-45 % — inv. 4 / sim — «el pelotón controla la general, no persigue la
   etapa». Suelo 24→25 en v34. **Y ES UN CONTROL DE FORMA, NO EL OBJETIVO DEL JUEGO (v44)**:
   reina-150 tiene 1.200 m; la métrica «cae de 26,7 % a 0 % según el puerto pase de 15 a 50 km».
5. **`top10GapSeconds`** — 40-300 s (mediana) — inv. 5 / sim — Techo 240→300 al corregir la VAM
   (1.940→1.560 m/h, el puerto pasó de 33 a 46 min). Suelo 60→40 en v49 «por decisión del dueño, y no
   porque un número no pasara»: la nube de 120 corridas va de 41 a 87 s con un hueco en 55│65, y la
   mediana saltaba 10 s con una semilla (comparación pareada: mediana 0 s, p10-p90 −1/+1 s). «La
   alternativa honesta era subir las semillas… y se descartó por lo que cuesta en CI».

### `timeTrial` (sobre `cri-40`)

6. **`p90MinusP10Seconds`** — 80-170 s — inv. 6 / sim — Re-anclada en v19 (120-240 → 80-170): el
   campo es estrecho (68-79), entre p10 y p90 hay 7-8 % de vatios = 2,5-3 % de tiempo ≈ 80-90 s.
   Medido 107 s. «El SUELO es el que importa»: con ley plana quedarían ~50 s.
7. **`specialistWinPct`** — 90-100 % — inv. 7 / sim.

### `timeTrials` (cronos REALES, `timeTrials.ts`)

8. **`tailPct`** — 8-15 % (mediana del banco entero) — inv. 9 / sim — Producción repartía 46,4 %
   (Colombia e3) y 41,2 % (nc-co-itt); un especialista ~50 km/h, el peor 43-44. «Por debajo del 8 % la
   crono deja de seleccionar… Por encima del 15 % vuelven los alcances en cadena».
9. **`worstStagePct`** — 0-17 % — inv. 10 / sim — un punto por encima: `race-chrono` (45 km) mide 15,3 %
   contra 14,6 % en Colombia por la erosión de 12 km más.

### `erosion` (docs/motor.md §VI.1)

10. **`flatFresh`** — 0-0,02 — inv. 13 / sim — «Una llana rodada en pelotón no debe erosionar al corredor fresco».
11. **`queenFresh`** — 0,18-0,50 — inv. 14 / sim — suelo 0,20→0,18 en v16 (0,211→0,190 sobre 500):
    «lo que esta mediana mide hoy es, en buena parte, lo que el grupeto AHORRA».
12. **`longClassicFresh`** — 0,45-0,80 — inv. 17 / sim — sobre el Ronde real (278 km).
13. **`queenThirdWeek`** — 0,60-0,85 — inv. 15 / sim — re-anclado en v15 sobre `reina-real-s3`
    (`race-france` e18) en vez de la caricatura de 1.200 m, que obligaba a endurecer la curva del
    depósito y hacía saturar a la reina real (100 % pájara, erosión topada en 0,920).
14. **`hardestClassicFresh`** — 0,45-0,92 — inv. 19 / sim — techo DURO contra saturación (Lombardía).

### `chronicle` (plan de equipo, `teamedField` 8×5 llana)

15. **`teamPullFlatPct`** — 50-85 % — inv. 21 / sim — voz de EQUIPO en `peloton_pull` sobre grupo
    grande (`size > frontNamesMaxRiders = 8`). «Un objetivo del 90 % obligaría a inventar un dueño
    donde no lo hay». Medido antes de la v15: 0,0 %.
16. **`frontTeamsPerStage`** — 1,8-4 (MEDIA) — inv. 22 / sim — «Uno solo todo el día sería un plan de
    equipo de cartón; ocho sería no tener plan». Media y no mediana por la retícula (1 · 1,5 · 2).
17. **`teamPullWithReasonPct`** — 95-100 % — inv. 23 / sim — «no es solo saber qué equipo(s) participan
    de la persecución… también es saber POR QUÉ». El 95 % «es la alarma de que alguien ha dejado tirar
    a un equipo sin razón… el “desgastarse a lo wey” que esto viene a impedir».

### `grandTour` (`race-france`, 21 etapas)

18. **`abandonPct`** — 12-20 % (MEDIA de vueltas) — inv. 25 / sim — «se sale con ~176 y se termina con
    140-155». Una vuelta suelta oscila 12-21 %.
19. **`queenLastGroupPct`** — 8-14 % (mediana del último clasificado de las 7 reinas) — inv. 26 / sim —
    grupeto a 25-40 min sobre 4h30-5h30 = 9-13 %; corte §VI.3 del 8 % (llana) al 18 % (reina). Medido
    v14: 6,7 %.

### `abandonCauses` (sobre la misma gran vuelta)

20. **`crashPct`** — 30-67 % — inv. 28 / sim — bandas sacadas de listas REALES (Vuelta 24, Giro 23/24,
    Tour 24), no de la tabla vieja de §VI.3. Medido 62 % (65 % con 6 vueltas): «es el techo que se va
    a rozar primero».
21. **`illnessPct`** — 20-67 % — inv. 28 / sim — medido 34 %; suelo = que no vuelva a «no enfermaba
    absolutamente nadie».
22. **`outOfTimePct`** — 1-15 % — inv. 28 / sim — «El suelo del 1 % es lo que de verdad vigila». Medido 4 %.
    **Deuda nombrada**: el reparto objetivo de §VI.3 (45/50/5) NO se cumple (62/34/4, caída y enfermedad
    invertidas); el arreglo (`HEALTH.illnessRaceMax` 0,0050) «se probó… y `queenLastGroupPct` cae de
    8,4 % a 6,9 %… Eso no es un arreglo, es mover el bulto».

### `smallTours` (10 carreras reales enteras)

23. **`bestSprinterWinPct`** — 25-60 % (sobre llegadas agrupadas, ≥15 con el tiempo del ganador) —
    inv. 37 / sim — techo = Cavendish Tour 2009 (6 de ~9); suelo = «el mejor rematador ES el mejor»
    (al azar daría 6-14 %). Medido 41,1 %: «esta mitad de la hipótesis del dueño era falsa».
24. **`sweepPct`** — 0-30 % (carreras con ≥3 agrupadas en las que el mejor las gana TODAS) — inv. 38 /
    sim — la queja literal «Race Arabia: gana las 5». Medido 9,7 %.
25. **`flatWinnerGroupPct`** — 85-100 % — inv. 39 / sim — objetivo de NO ROMPER: «el 99 % del campo en el
    tiempo del ganador… no está mal».
26. **`mediaGroups`** — 3-8 (mediana) — inv. 40 / sim — producción: 30 medias, mediana 3 grupos, 7 con
    el campo entero al mismo segundo.
27. **`mediaOneGroupPct`** — 0-20 % — inv. 40 / sim — «EL TECHO NO ES EL OBJETIVO, ES EL MARGEN QUE HOY SE
    PUEDE SOSTENER» (producción 23 %, motor 9,5 %).
28. **`flatMoveWorstMarginS`** — 0-900 s (peor margen de una fuga que gana en llano) — inv. 41 / sim —
    v23 puso 180 s; **el dueño lo corrigió en v38**: «puede ocurrir y ocurre a veces, que el pelotón se
    despista, deja hacer a una escapada (especialmente si los equipos de los sprinters tienen a alguien
    metido en la fuga y entonces no van a tirar…), y la escapada se va a 15 o 20 minutos. Los de la
    general tiran para que no se vaya a 20 minutos, pero pueden perfectamente llegar con 8 o incluso 15
    minutos… No es para que pase muy a menudo, pero de vez en cuando sí». Se sigue exigiendo `wins > 0`.
29. **`photoRepeatTopFive`** — 1,0-3,6 (de 5) — inv. 42 / sim — pares de llegadas agrupadas de la MISMA
    carrera; al azar 0,9. Medido 2,19→2,03.
30. **`worstRacePhotoRepeat`** — 0-4,1 — inv. 42 / sim — peor carrera (Bességes 2,62→2,24).
31. **`sameWinnerPairPct`** — 15-55 % — inv. 42 / sim — «el único de los tres números que distingue una
    carrera sana de una clavada» (Colombia 0 %, Arabia 100 %, producción 59 %). Medido 28,2→25,0 %.
    _(sin banda, documentado aquí)_ **grupo de cabeza de una reina**: el encargo pedía «una reina real
    deja llegar juntos a un grupo de 5-15 y no 1»; el banco mide `medianLeadGroupRiders` (dentro de
    30 s) y **da 1**. «El objetivo que el encargo pide sale ROJO hoy… un objetivo que nace rojo no es un
    objetivo, es un TODO con formato de test». Se imprime como `DEUDA` en `pnpm sim`.

### `realQueens` (9 reinas reales)

32. **`lastGroupPct`** — 7-14 % (mediana agrupada de las 54 corridas) — inv. 32 / sim — suelo 8→7 en
    v19 porque «las FORMAS se han separado» (finales en alto 13,3 %, meta en llano 2,5 %); la mediana
    agrupada cae en el hueco entre dos racimos.
33. **`worstStagePct`** — 0-18 % — inv. 33 / sim — techo = `STAGE.timeCutQueen` (18 %): «no es un número
    de calibración». Race Colombia e5 hacía 22 % en producción.

### `calendarQueens`

34. **`breakawayWinPct`** — 6-30 % — `calendarQueens.test.ts` — «No es un objetivo de carretera: es una
    VIGILANCIA, por decisión del dueño al ver el número medido —“está bien así”—». 27 etapas × 4 semillas,
    σ≈3,7 → tres sigmas alrededor del 18,1 %. Dependencia del desnivel: 43,8 % <1.500 m, 1,6 % >2.500.

> Cuenta: 30 bandas con `min/max` + la deuda sin banda del grupo de cabeza. (`smallTours` tiene 9,
> no 10: la décima es la deuda.)

Listones que NO están en `targets.ts` pero actúan como banda en `invariants.test.ts`:
`SATURATION_DEPLETION = 0.96` (0,95→0,96 en v58 porque a 0,95 «era una moneda al aire» sobre
`race-white-roads`: semilla a semilla 0,932-0,962), `SATURATION_BONK_PCT = 12` (10→12 en v33, no
estrechado en v34: Lombardía da 11,7 % con 3 semillas, 8,5 % con 12), `capturePct > 85`, `relayWork /
shelteredWork > 1.10`, pavés 5-12 %, cierre 50-75 s/10 km, inercia ≤ 4 km/h, velocidades de crono
(último ≥ 40, ganador ≤ 56 km/h), Giro e9 (`biggestGroupPct ≤ 33`, puesto 150 > 180 s), llana >
media > reina en km/h del ganador (llana ≤ 48, reina ≥ 32).

---

## 3. Los 46 invariantes de `invariants.test.ts`

Leyenda de campo: **FIJO** = escenario canónico a mano (`scenarios.ts`), **UNIF** = campo uniforme a
60 sobre recorrido real, **GEN** = `generateNpcRider` por nivel, **DUEÑO** = el campo del dueño (escalón
8/16/106), **AD HOC** = construido en el propio test.

| #   | Línea | Describe / nombre                              | Qué mide (aserción)                                                                                                                                             | Escenario · campo · semillas                                                             | Timeout       |
| --- | ----- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------- |
| 1   | 105   | llano: la fuga gana el porcentaje objetivo     | `breakawayWinPct` ∈ flat.breakawayWinPct (5-16). «Gana la fuga» = `meta.datos.fuga === 1` (ganó DESDE LA CARRETERA, no «estaba en la lista de `fuga_formada`»). | llana-180 · FIJO 176 en 22×8 · 120                                                       | 5 s (defecto) |
| 2   | 109   | llano: el mejor sprinter gana                  | `winner === bestSprinterId (spr-0)` ∈ 30-45 %                                                                                                                   | ídem                                                                                     | —             |
| 3   | 113   | llano: captura mediana                         | `capturePct > 85` (sobre etapas CON fuga) y mediana km a meta de `fuga_cazada` ∈ 8-25                                                                           | ídem                                                                                     | —             |
| 4   | 123   | montaña: la fuga gana                          | ∈ 25-45 %                                                                                                                                                       | reina-150 · FIJO · 120                                                                   | —             |
| 5   | 127   | montaña: brecha 1º-10º                         | mediana `results[9].tiempoS − results[0]` ∈ 40-300 s                                                                                                            | ídem                                                                                     | —             |
| 6   | 136   | crono: p90−p10                                 | mediana ∈ 80-170 s                                                                                                                                              | cri-40 · FIJO 40 sin equipos · 120                                                       | —             |
| 7   | 140   | crono: la gana un especialista                 | id `cri-*` gana ∈ 90-100 %                                                                                                                                      | ídem                                                                                     | —             |
| 8   | 157   | crono real: el banco cubre formas              | `race-colombia` y `nc-co-itt` presentes, ≥4, raceId únicos                                                                                                      | lista `REAL_TIME_TRIALS`                                                                 | —             |
| 9   | 165   | crono real: cola 8-15 %                        | `all.runs = 5×6`; mediana `tailPct` ∈ 8-15                                                                                                                      | 5 cronos · GEN por división · 6/crono                                                    | 300 s         |
| 10  | 171   | …ninguna crono suelta se dispara               | `worst.medianTailPct ≤ 17`                                                                                                                                      | ídem (compartido)                                                                        | 300 s         |
| 11  | 182   | el corte de la crono no elimina                | `outOfTime = 0`, `readmitted = 0`, `worst < 25 %` (`timeCutItt`)                                                                                                | ídem                                                                                     | 300 s         |
| 12  | 190   | velocidades de profesional                     | por crono: `medianLastKmh ≥ 40`, `medianWinnerKmh ≤ 56`, ganador > último                                                                                       | ídem                                                                                     | 300 s         |
| 13  | 265   | llana no erosiona al fresco                    | `medianErosion` ∈ 0-0,02                                                                                                                                        | llana-180 · FIJO · 60                                                                    | 900 s         |
| 14  | 270   | reina en fresco sí erosiona                    | ∈ 0,18-0,50                                                                                                                                                     | reina-150 · FIJO · 60                                                                    | 900 s         |
| 15  | 286   | reina REAL 3.ª semana                          | ∈ 0,60-0,85; `medianDepletion ≤ 0,96`; `bonkPct ≤ 12`                                                                                                           | reina-real-s3 (`race-france` e18) · UNIF con TSB −55 · 12                                | 300 s         |
| 16  | 302   | la reina SINTÉTICA erosiona menos que la real  | `synth.medianErosion < real.medianErosion`                                                                                                                      | reina-150-s3 · FIJO · 60 + reina-real-s3 · 12                                            | 1.200 s       |
| 17  | 314   | clásica larga en fresco                        | ∈ 0,45-0,80                                                                                                                                                     | race-flanders · UNIF · 12                                                                | 360 s         |
| 18  | 323   | el que releva se desgasta más                  | Σ `workUnits` gregarios / sprinters > 1,10                                                                                                                      | AD HOC 10+10 a 65, 180 km llano, sin equipos · 20                                        | 30 s          |
| 19  | 420   | la clásica más dura no satura                  | ∈ 0,45-0,92                                                                                                                                                     | race-lombardy · UNIF · 12                                                                | 360 s         |
| 20  | 430   | ninguna carrera de un día satura               | para cada WT un-día no-TT (>10) + las 8 más duras del resto (por `Σ costBase·dx`): `medianDepletion ≤ 0,96` y `bonkPct ≤ 12`                                    | ~20 carreras · UNIF · 3 cada una                                                         | 1.800 s       |
| 21  | 468   | el parte puede nombrar a un EQUIPO             | `pulls > 50`; `teamVoicePct` ∈ 50-85                                                                                                                            | `teamedField` 8×5 llana strong 4 sobre perfil llana-180 · 40 (`voz-llana`) · sin general | 60 s          |
| 22  | 473   | el frente cambia de manos                      | `frontTeamsAvg` ∈ 1,8-4                                                                                                                                         | ídem (compartido)                                                                        | 60 s          |
| 23  | 477   | …y el parte dice POR QUÉ                       | `withReasonPct` ∈ 95-100; `reasons.etapa > maillot + general`                                                                                                   | ídem                                                                                     | 60 s          |
| 24  | 486   | un campo SIN equipos no cambia                 | con `teamId: null`: ningún `rider_defies_team`; los `peloton_pull` nombran > 1 «equipo» (prefijo de id)                                                         | mismo campo sin equipos · 3                                                              | —             |
| 25  | 554   | el pelotón adelgaza 12-20 %                    | `runs = 12`; `abandonPct` (media) ∈ 12-20                                                                                                                       | race-france · GEN 22×8 · **12 vueltas** (compartidas por 25-29)                          | **5.400 s**   |
| 26  | 594   | último grupo de una reina 8-14 %               | `tails.reina.stages ≥ 42`; mediana ∈ 8-14                                                                                                                       | ídem                                                                                     | 900 s         |
| 27  | 607   | ninguna reina termina al mismo segundo         | `tails.reina.oneGroupPct = 0`                                                                                                                                   | ídem                                                                                     | 300 s         |
| 28  | 624   | se van por las tres puertas                    | `crashPct` 30-67, `illnessPct` 20-67, `outOfTimePct` 1-15, suma 100                                                                                             | ídem                                                                                     | 300 s         |
| 29  | 639   | alguien se baja de la bici                     | `causes.colapso > 0` y `< causes.lesion`                                                                                                                        | ídem                                                                                     | 300 s         |
| 30  | 646   | el tope del 4 % por etapa                      | `runGrandTour('tope-4pct')`: `gone > 0` y `< ceil(21·0,04·176)`                                                                                                 | 1 vuelta extra                                                                           | 300 s         |
| 31  | 671   | reinas reales: el banco cubre formas           | Colombia e5 presente, ≥6, una etapa por carrera                                                                                                                 | lista `REAL_QUEENS` (9)                                                                  | —             |
| 32  | 678   | último grupo 7-14 %                            | `all.stages = 9×6`; mediana agrupada ∈ 7-14                                                                                                                     | 9 reinas · GEN por nivel · 6                                                             | 900 s         |
| 33  | 684   | ninguna etapa suelta fuera del corte           | `worst.medianLastGroupPct ≤ 18`                                                                                                                                 | ídem                                                                                     | 300 s         |
| 34  | 715   | la etapa 9 del Giro reparte                    | 4 corridas: `biggestGroupPct ≤ 33`; puesto 150 > 180 s (si existe); brechas 10/50/100/150 estrictamente crecientes; cola ≤ 18 %                                 | race-italy e9 · GEN WT · 4                                                               | 600 s         |
| 35  | 732   | Race Colombia e5 no vuelve a 74 min            | peor cola ≤ 18 %; `groups > 2` en cada corrida                                                                                                                  | race-colombia e5 · **DUEÑO** 130 (8@82/16@62/106@52) · 5                                 | 120 s         |
| 36  | 769   | carreras pequeñas: el banco cubre formas       | arabia, provence, almeria, tramuntana; ≥8; únicas; ≥3 niveles                                                                                                   | lista `SMALL_TOURS` (10)                                                                 | —             |
| 37  | 788   | el mejor rematador gana bastantes, y no todas  | `races = 10×8`; `medianEdge > 1`; `bestSprinterWinPct` ∈ 25-60                                                                                                  | 10 carreras enteras · GEN por nivel · **8 corridas/carrera** (v41)                       | **3.900 s**   |
| 38  | 797   | …y no se lleva TODAS                           | `sweepableRaces ≥ 10`; `sweepPct` ∈ 0-30                                                                                                                        | ídem (compartido)                                                                        | 300 s         |
| 39  | 804   | una LLANA sigue metiendo al pelotón entero     | `shapes.llana.medianWinnerGroupPct` ∈ 85-100                                                                                                                    | ídem                                                                                     | 300 s         |
| 40  | 810   | una MEDIA se parte                             | `media.stages > 40`; `medianGroups` ∈ 3-8; `oneGroupPct` ∈ 0-20                                                                                                 | ídem                                                                                     | 300 s         |
| 41  | 817   | ninguna fuga gana una llana por cuatro minutos | `flatMargins.wins > 0`; `maxMarginS ≤ 900`                                                                                                                      | ídem                                                                                     | 300 s         |
| 42  | 825   | la foto de meta no es la misma                 | `pairs > 50`; `repeatTopFive` 1-3,6; `worstRepeatTopFive ≤ 4,1`; `sameWinnerPct` 15-55                                                                          | ídem                                                                                     | 300 s         |
| 43  | 841   | la ley de velocidad no se ha movido            | llana > media > reina (km/h mediana del ganador); llana ≤ 48; reina ≥ 32                                                                                        | ídem                                                                                     | —             |
| 44  | 856   | pavés: 5-12 % de bajas por caída               | media de `incidents` únicos / 40 ∈ 5-12 %                                                                                                                       | AD HOC 40 a 55, 20 llano + 30 pavés 4★ + 10 llano · 80                                   | 120 s         |
| 45  | 905   | cierre del pelotón comprometido                | `advanceGroup` puro: fuga 0,6 vs pelotón 0,85 a 68; tras 50 bloques mide, tras 100 más cierra 50-75 s                                                           | unidad de `group.ts`                                                                     | —             |
| 46  | 925   | inercia acotada                                | `accLimit(0)·blockSeconds(v) ≤ 4` para v 40-55                                                                                                                  | unidad de `physics.ts`                                                                   | —             |

Observación de cobertura por campo: los invariantes 1-7, 13-14, 16 corren campos FIJOS; 15, 17, 19-20
campos UNIFORMES; 9-12, 25-34, 37-43 campos GENERADOS; 35 el del DUEÑO; 18, 21-24, 44 AD HOC; 45-46
son unidades. **Ninguno corre con órdenes del jugador ni con un campo de menos de 18 equipos, salvo
21-24 (8×5, solo para la voz de la crónica).**

---

## 4. Los otros bancos con test en CI (`pnpm test:bancos`)

### 4.1 `calendarQueens.test.ts` (2 pruebas)

- «la muestra es sistemática»: >100 reinas en el calendario, muestra >15, cubre extremos.
- «el desnivel decide» (timeout 3.600 s; medido 126 s libre / 370 s cargado / ~840 s CI): 27 etapas ×
  4 semillas con `realQueenSetup`; `wonFromMovePct(<1500) > wonFromMovePct(2500-3500) + 10`;
  `dPlus.min < 1500`, `max > 2500`; y el conjunto ∈ 6-30 %.

### 4.2 `coherence.test.ts` (10 pruebas; presupuesto = `ceil(costeCI·4/60)·60 s`)

Mide sobre **eventos crudos** del motor (`rawChronicle`: filtra `narra === 0` y `attack_go` en km<1;
ordena por km y `tS`). Cinco invariantes de §16 con tolerancia CERO salvo `ataqueSinCerrar: 2`:

- «ninguna etapa se contradice» × 4 escenarios: llana-180 (40 semillas, 243 s CI), reina-150 (40, 172 s),
  Flandes UNIF (20, 205 s), Race Jaén UNIF (40, 300 s). Peor etapa por defecto ≤ tolerancia para
  `frenteSinExplicar`, `cazadaFantasma`, `ataqueSinCerrar`, `montanaDosVeces`, `perseguidorDeUno`.
- «la captura nombra a los de delante» (634 s CI): Jaén + Flandes + reina, 30 semillas cada; cuando la
  fuga cambió de gente, `breakaway_caught.datos.size === protagonistas.length` y `deLos` = tamaño de salida.
- «el boquete se mide contra el grueso» (320 s): 60 × Jaén; ningún `time_gap.chaseSize = 1`.
- Espina dorsal (v27): llana/reina/Race Andalucía × 20: todo `time_gap` con cabeza ≤ 8 trae nombres,
  `chaseKind ∈ {peloton, caza}`, `toGo ≥ 0`. `chaseReferenceIndex` puro con 6 casos a mano. Vocabulario
  de grupos ≤ 3 nombres por etapa (220 s).
- Anotado: «el motor SE HA VUELTO MÁS LENTO. Cinco etapas de Flandes costaban 14,0 s en la v38, 19,3 a
  mitad de la v39 y 20,7 en la v40 —un 48 % más de trabajo en dos versiones—».

### 4.3 `raceRadio.test.ts` (~26 pruebas, casi todas de unidad sobre fotos a mano)

Orden por carretera, hueco = resta de relojes, pelotón = «el que lleva la gente» (≥ 2/3 con histéresis
`mainGroupTakeoverRatio 1,25`), quién tira y con qué `pullWindow`, maillots primero en `watching`,
velocidad por hombres que siguen juntos (mediana, descarta `dt < 3600·dKm/radioMaxKmh(85)`),
`checkReplay` por `engineVersion`. Tres pruebas de integración sobre **reina-150 FIJO, 1 semilla,
fotos cada 5 km**: la etapa sale idéntica con y sin radio; partición exacta y huecos monótonos; el
que tira está en su grupo.

### 4.4 `world.test.ts` (6 pruebas, 2 mundos × 25 temporadas, ~12 s; `beforeAll` 300 s)

Alarma de incendios, no calibración («ésas las pone el dueño… en `sim/targets.ts`»): cracks ≤ 35 %,
5★ medias ≤ 3, correr aporta > 1 punto de media (brazo de control sin carreras, v58), medianías ≤ 40 %,
p90−p10 ≥ 10 y la media no baja, plantilla constante y edad 24-32, congelados = 0. **No simula etapas.**

---

## 5. Lo que mide cada módulo de análisis (para saber qué NÚMEROS existen ya)

### `analyze.ts` (etapa suelta)

- `FlatStats`: `breakawayWinPct` (meta con `fuga`), `bestSprinterWinPct`, `capturePct` (sobre etapas con
  `fuga_formada`), `breakFormedPct`, `medianCatchKmToFinish`. Comentarios desactualizados
  («objetivo 2-8 %», «entre 25 y 8»).
- `MountainStats`: `breakawayWinPct`, `medianTop10GapSeconds`.
- `ErosionStats`: `medianErosion`, `medianDepletion`, `bonkPct` (`energy ≤ 0`) sobre `out.tank`.
- `TimeTrialStats`: `medianP90MinusP10Seconds`, `specialistWinPct`.

### `grandTour.ts`

- Por etapa en línea, `StageTail`: `kind`, `stageIndex`, `finishers`, `lastGroupPct`, `groups`
  (relojes distintos), `oneGroup`, `winnerGroupPct`, `biggestGroupPct` (v47: el bloque más grande
  aunque no vaya con el ganador), `top10GapSeconds`, `wonFromMove`.
- `TailStats` por tipo (reina/media/llana/todas): medianas y máximos de lo anterior + `wonFromMovePct`.
- `GrandTourResult`: `abandonPct`, `causes {colapso, fueraControl, lesion, enfermedad}`, `capHitStages`,
  `readmitted`, `readmissionStages`. `abandonMix` → `crashPct` (lesion+colapso), `illnessPct`, `outOfTimePct`.
- Corre con `lugar` (clima real de Francia en julio) desde v42.

### `realQueens.ts`

- `runStage` → `StageTail` (sin `lugar`: **sin clima**). `analyzeRealQueens(n)` → `perStage`, `all`, `worst`.
- `colombiaRegressionTails(n)`, `italy9SummitFinishes(n)` (`biggestGroupPct`, `lastGroupPct`, brechas en
  10/50/100/150).
- `mountainRejoins(n)` (v59, l. 404-476): por corredor, peor hueco contra la cohorte del pelotón antes del
  75 % de la etapa, terreno (puerto/bajada/llano) y `finalS` contra la mediana de ESA cohorte. Nace de:
  «los que pierden en montaña 5 minutos en medio de una etapa luego se reintegran demasiado fácil».
  **No lo consume ningún test ni ningún CLI** (grep en `packages/` y `scripts/`).

### `smallTours.ts`

- Por etapa, `TourStageRow`: `winnerId`, `topTen`, `favourites` (5 mejores `finishScore` del `eff0` del
  día), `bestSprinterWon`, `winnerGroupRiders`, `leadGroupRiders30S`, `winnerGroupPct`, `groups`,
  `oneGroup`, `lastGroupPct`, `wonFromMove`, `marginToNextGroupS`, `winnerKmh`, `farSelections`
  (`peloton_selection` narrados; «en las 81 etapas del día 46 aparece UNA sola vez»; sin banda).
- `winShare`: `bunchStages` (≥15 con el tiempo del ganador = `finishBunchMinRiders`),
  `bestSprinterWinPct`, `sweepPct`, `sweepableRaces`, `distinctWinnerPct` (sin banda), `medianEdge`.
- `shapeStats` por tipo: `medianGroups`, `medianWinnerGroupPct/Riders`, `medianLeadGroupRiders`,
  `oneGroupPct`, `medianLastGroupPct`, `wonFromMovePct`, `medianWinnerKmh`, `farSelections`.
- `finishPhoto`: `pairs`, `repeatTopFive`, `sameWinnerPct`, `sameTopTwoPct` (sin banda),
  `worstRaceId/worstRepeatTopFive`, `favouritesKept` (sin banda).
- `moveMargins` (llanas): `wins`, `medianMarginS`, `maxMarginS`, `runawayPct` (≥120 s), `closePct` (5-60 s).
- Sin `lugar` (**sin clima**). Los abandonos se aplican pero no se cuentan.

### `timeTrials.ts`

- `TimeTrialTail`: `tailPct` (sobre TODOS, eliminados incluidos), `medianPct`, `p90MinusP10Seconds`,
  `winnerKmh`, `lastKmh`, `catches` (`tt_catches`), `outOfTime`, `readmitted`.

### `calendarQueens.ts`

- `wonFromMovePct` total y por banda de desnivel (<1500, 1500-2500, 2500-3500, >3500), `dPlus` min/mediana/max.

### `climbs.ts` (solo `pnpm sim`, informativo)

- Por puerto ≥ 4 km (`findClimbs` cose rellanos ≤ 0,5 km): `gainers`/`losers` (≥5 puestos entre pie y
  cima), `comebacks`, `blowups`, `bestGain/worstLoss`, `clocksAtTop`, `lossPerKm`. `zeroGainerPct`:
  «Corridas cuyo puerto decisivo NO produce ni una remontada: hoy son todas». `finishShape`: dentro de
  10/30/60 s, relojes, escalón mayor, `sharedPct`.

### `tactics.ts` (solo `pnpm sim:tactics` salvo la voz de equipo)

- `analyzeVariety`: intentos por etapa, `prosperFraction`, km de la fuga del día, intentos fallidos
  antes, `noBreakPct`, `distinctScripts` (fuga|intentos|cazada|desdefuga|final), `distinctWinners`,
  `lateAttackPct`, `attackerWinPct`.
- `analyzeSharjah`: race-sharjah entera con 40 a mano y general arrastrada (déficit, sin rank):
  `stagesWithTimeGapsPct`, `medianSameTime`, `sprinterGcWins`, `medianGcMargin`, `sprinterStageWins`.
- `analyzeChase(riders, tag, races)`: 5 llanas × N sobre el perfil de llana-180 con el mismo campo:
  `force`/`trains` de `chaseField`, `noBunchPct`, `medianNoBunchPerWeek`, `breakawayWinPct`.
- `analyzeUphillFinish`: `attackDecidedPct` (ganador figura en un `ataque`), `attritionPct`,
  `attacksMedian`, `medianMargin`.
- `analyzeAttribution`: `peloton_pull` por etapa (mediana, ventana 3-6), nombres por parte, capturas
  narradas y `chase_work` atribuidos, `break_share` presente en % de etapas.
- `analyzeTeamVoice(riders, profile, seeds, gcDeficits?)`: `pulls` (grupo > 8), `teamVoicePct`,
  `withReasonPct`, `reasons {etapa, maillot, general, sinMotivo}` (`datos.porQue`), `frontTeamsAvg`.
  `tacticsCli` lo corre también con `HILLY_PROFILE`, reina y con una general inyectada a mano (`gcTable`).
- `analyzeGiveUp`: `abandona_ritmo` por etapa, % de etapas, `worstLossPct`.

### `coherence.ts` (lectura pura de una crónica)

12 claves (`DEFECTS`): `ataqueSinCerrar`, `frenteQueCrece`, `montanaDosVeces`, `resumenAntesDelSuceso`,
`cazadaFantasma`, `perseguidorDeUno`, `frenteSinExplicar`, `ataqueConcordancia`, `pasajerosConcordancia`
(RETIRADA en v40, falsos positivos), `parteRepetido`, `ataqueDobleLinea`, `numerosQueSeContradicen`.
`storyMetrics`: `mudoKm` (silencio máximo sin línea de situación, listón `MUTE_KM_LIMIT = 30`: «el
estado de carrera no puede quedarse mudo 35 km»), `mudoConFuga`, `dosConHueco` (ventana 3 km),
`finalLineas`/`finalDelGanador` (últimos 15 km), `nombresDeGrupo` (≤ 3: lead group / chase group / bunch).

### `raceRadio.ts`

`RadioGroup`: `kind` (fuga/contra/peloton/tierra/grupeto), `position`, `size`, `riderIds/riderTs`,
`gapS`, `energyPct`, `pulling[{riderId, pullWindow, motivo: PullMotive, para}]`. `StoredRadioGroup`
añade `speedKmh` (mediana de los que siguen juntos; `null` si no hay dato), `motivos`, `paraQuien`,
`watching` (maillots primero; grupos ≤ 12 se nombran enteros). Es OBSERVACIÓN, no decide nada.

### `scripts/medir-*.mjs` (fuera de CI; leen `dist`)

- `medir-carrera.mjs <raceId>`: grupos, cola y clase de ganador por etapa (**`gcDeficitSeconds = 0`
  en todo el campo**, anotado en `medir-maillot.mjs` como limitación).
- `medir-maillot.mjs`: ¿se va el maillot en la fuga? (`pelotonAllows` directo + carrera entera con
  general arrastrada). Nace de Race Sardegna e2: el líder-escalador se fue en la fuga y ganó al sprint.
- `medir-caza.mjs` (v28): cuántas cazas las firma UN equipo / varios.
- `medir-peloton.mjs` (v29): etiqueta vieja vs «el grupo que lleva la gente».
- `medir-huecos.mjs`: distribución de cierres de hueco entre dos fotos (descolgado a la velocidad del
  pelotón, 30 s cerrados en 1 km, tres grupos que se reúnen). «MIDE, NO ACUSA».
- `medir-rebufo.mjs` (v34): factura de «hombres al viento» por grupo, rebufo del líder arropado,
  cuántos tiran / de cuántos equipos / cuántos del equipo que lleva el frente.
- `medir-defectos.mjs produccion|banco|etapa`: las 12 contradicciones sobre producción o sobre `smallTours`.
- `race-radio.mjs`: tabla km a km (banco o producción con `checkReplay`).
- Los scripts `medir-caza`/`medir-peloton` construyen `NEUTRAL = {agresividad, ritmo, riesgo,
colaboracion}`, una forma de órdenes distinta de `StageOrders` del motor: parecen desfasados.

---

## 6. Cuánto tarda cada banco

Regla de la casa (invariants l. 216-263, coherence l. 89-109): **presupuesto ≥ 4× el coste MEDIDO en
CI** (no estimado: «el ×2,2 era una estimación» y «el factor se quedó corto por SIETE»); factor
local→CI medido ~1,8; instrumentación de cobertura ×1,75-2,26; humor del runner ×1,3.

| Prueba                                                                           | Coste medido (CI nocturno)                                                                                                                                                      | Timeout                                          |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 37 el mejor rematador (10 carreras × 8 corridas, 1-9 etapas, 126-176 corredores) | 912 s (con 4 corridas; con 8 «cuesta unos minutos más»)                                                                                                                         | 3.900 s                                          |
| 25 el pelotón adelgaza (12 vueltas × 21 etapas × 176)                            | ~682 s local → ~1.230 s CI                                                                                                                                                      | 5.400 s                                          |
| 20 ninguna carrera de un día satura (~20 recorridos × 3)                         | 434 s                                                                                                                                                                           | 1.800 s                                          |
| 16 la reina sintética erosiona menos (60 + 12)                                   | 259 s                                                                                                                                                                           | 1.200 s                                          |
| 26 + 32 último grupo 8-14 %                                                      | 218 s                                                                                                                                                                           | 900 s                                            |
| 13 llana no erosiona (60)                                                        | ≥ 207 s                                                                                                                                                                         | 900 s                                            |
| 14 reina en fresco (60)                                                          | ≥ 191 s                                                                                                                                                                         | 900 s                                            |
| 19 la clásica más dura (12)                                                      | 88 s                                                                                                                                                                            | 360 s                                            |
| 17 la clásica larga (12)                                                         | 83 s                                                                                                                                                                            | 360 s                                            |
| 15 reina real 3.ª semana (12)                                                    | ≥ 65 s                                                                                                                                                                          | 300 s                                            |
| 44 pavés (80 etapas de 60 km × 40)                                               | 24 s                                                                                                                                                                            | 120 s                                            |
| 1-7 (120 semillas cada canónico)                                                 | sin anotar; 1-3 comparten 120 llanas, 4-5 120 reinas, 6-7 120 cronos                                                                                                            | 5 s por `it` (el coste se paga en el `describe`) |
| coherencia: llana / reina / Flandes / Jaén                                       | 243 / 172 / 205 / 300 s                                                                                                                                                         | ×4 redondeado al minuto                          |
| coherencia: captura (90 etapas) / boquete (60 Jaén) / vocabulario (60)           | 634 / 320 / 220 s                                                                                                                                                               | ×4                                               |
| espina dorsal: llana / reina / Andalucía (20)                                    | 71 / 64 / 87 s                                                                                                                                                                  | ×4                                               |
| calendarQueens (27 × 4)                                                          | 126 s libre, 370 cargado, ~840 CI                                                                                                                                               | 3.600 s                                          |
| world (2 mundos × 25 temporadas, ×2 por el brazo de control)                     | ~12 s + control                                                                                                                                                                 | 300 s                                            |
| Job `benches` entero                                                             | «nueve minutos» (ci.yml); `sim/` = 536 s de 638 s de suite (cuando eran 3 ficheros/69 pruebas)                                                                                  | —                                                |
| `pnpm sim 500`                                                                   | canónicos 500 semillas cada; cronos reales 8; clásicas 25; voz 100; gran vuelta 8 («~22 s» por vuelta, dato viejo; hoy ~57 s); reinas reales 8; carreras pequeñas 6; `climbs` 8 | —                                                |

Costes unitarios anotados: una gran vuelta ≈ 57 s local (682/12); una clásica de 250-280 km «~6 veces
más» que la llana canónica; cinco etapas de Flandes 20,7 s en v40; una crono «cuesta poco».

---

## 7. QUÉ NO SE MIDE HOY (lista explícita)

Cada punto dice dónde está la ceguera. «Sin banda» = existe el número pero no bloquea; «no existe» =
no hay ni número.

1. **Carreras con pocos equipos / pelotón pequeño con bandas.** Los canónicos son 176 en 22×8 desde
   v38; los generados son ≥ 18×7 = 126 (continental). El único campo pequeño de CI es `teamedField`
   8×5 = 40 y solo para la voz de la crónica (inv. 21-24). Los campos de 40 de `tactics.ts`
   (Sharjah, gran vuelta de 5 trenes, ProSeries) viven en `pnpm sim:tactics`, sin banda ni CI.
   Nada mide una carrera de 5-10 equipos de 4-6 (ni con órdenes, ni con general).
2. **Composición de la fuga por equipos.** No existe. Ningún banco cruza `protagonistas` de
   `fuga_formada`/`front_group` con `teamId`. «Seis del mismo equipo en una fuga de nueve»
   (`docs/tactica.md`) es invisible para todos los bancos. `analyzeVariety` cuenta intentos y km de la
   fuga, no quién va ni de qué equipo. Tampoco se mide el TAMAÑO de la fuga del día.
3. **Cooperación de compañeros dentro de una fuga.** No existe. `break_share`/`break_cooperation` solo
   se cuentan como «aparece en el % de etapas» (`analyzeAttribution`, sin banda, sin CI). «Dos
   compañeros en una fuga de tres, y gana el otro» no lo ve nadie.
4. **Un equipo con hombre en la fuga que NO persigue.** Cita del dueño (v38, en `flatMoveWorstMarginS`)
   incorporada solo como margen máximo de 900 s; no hay medida de «quién persigue y por qué no».
   `analyzeTeamVoice` mide motivo del que TIRA (`etapa/maillot/general`), no del que se abstiene.
5. **El mismo ganador dos días seguidos.** Solo parcialmente: `sameWinnerPct` en `smallTours` compara
   pares de LLEGADAS AGRUPADAS (≥ 15 con el tiempo del ganador) de la misma carrera, todos los pares,
   no días consecutivos, y excluye por construcción medias que se parten, reinas y cronos.
   `distinctWinnerPct` (todas las etapas) se imprime sin banda. La queja de Provence («etapa 2 y
   etapa 3 el resultado se parece demasiado», llana-media-reina) está en el banco por nombre pero la
   métrica no compara etapas de tipos distintos. En montaña no hay medida de repetición de ganador.
6. **Órdenes automáticas día a día.** `autoStageOrders` se INVOCA en grandTour/smallTours/realQueens/
   timeTrials pero su salida nunca se afirma: no hay banco que compruebe qué rol recibe cada corredor,
   si el equipo del maillot defiende, si un rol cambia con la general, ni cuántos cazaetapas siembra
   por equipo. El único `it` sobre roles es inv. 24 (sin equipos no hay `rider_defies_team`).
7. **Órdenes del jugador.** Ningún banco varía `mentality`, `contestSprints/Climbs`, `targetRiderId` o
   rol por decisión externa; todo son órdenes fijas a mano o `autoStageOrders`.
8. **Memoria entre etapas más allá de fatiga y general.** Lo único que se arrastra es `ctl/atl`,
   `alive` y `gcTotal`. No hay estado de «ya ganamos», «ayer fugó», objetivos de equipo por carrera,
   moral que cambie, ni clasificaciones secundarias (puntos, montaña, jóvenes): los motivos posibles
   del frente son solo `etapa/maillot/general`. En `realQueens`/`calendarQueens`/`climbs` no hay
   general en absoluto (déficit 0).
9. **Grupo de cabeza de una reina (5-15 dentro de 30 s).** Medido (`medianLeadGroupRiders` = 1),
   **sin banda**, impreso como `DEUDA`.
10. **Media montaña canónica (`media-190`).** Solo informativo en `pnpm sim`; sin banda; no está en CI.
11. **Reenganche tras descolgarse en un puerto (v59, `mountainRejoins`).** Código sin consumidor.
12. **Dentro del puerto (`climbs.ts`).** Informativo en `pnpm sim`; «sin ni una remontada… hoy son
    todas»; sin banda.
13. **Variedad, final en alto por ataque vs desgaste, «se deja ir», caza según el campo, general de
    Sharjah, atribución.** Todo en `pnpm sim:tactics`, sin banda, sin CI.
14. **Clima.** Solo lo llevan `grandTour` y `realRaceScenario` (saturación, coherencia, erosión de
    clásicas). `smallTours`, `realQueens`, `timeTrials`, `calendarQueens`, `climbs` y los canónicos
    corren SIN `lugar`.
15. **Quién gana en montaña y quién gana la general** de una vuelta generada (perfil del ganador,
    margen de la general, cuántos cambios de líder). Solo `analyzeSharjah` (CLI) mira una general, con
    campo a mano.
16. **Abandonos en carreras pequeñas** (se aplican, no se cuentan) y **readmisiones fuera de la gran vuelta**.
17. **Metas volantes / bonificaciones** como conducta (solo se restan en `gcTotal`). Sprints
    intermedios no tienen métrica.
18. **Contrarreloj por equipos**: no existe en los bancos.
19. **Sprint y remate por equipos**: quién lanza a quién, si el tren funciona (v48 «los aguadores se
    llevaban medio podio» se midió ad hoc, no hay banco).
20. **El gregario que espera/arrastra a su líder descolgado** (v57 «¿y nadie de su equipo tira para
    ayudarle?»): `medir-rebufo.mjs` mira quién tira y de qué equipo, sin CI ni banda.
21. **Granularidad**: los bancos reales de CI corren 6-12 semillas por etapa y 4 por reina del
    calendario; todo lo más fino que 2-4 puntos porcentuales «está dentro del ruido» (v42: viento,
    lluvia y calor «dentro del ruido», medio sigma).
22. **La crónica renderizada** (frases de `apps/api`): aquí solo eventos crudos; la narración tiene sus
    tests aparte.

---

## 8. Deuda reconocida en los comentarios (límites anotados, cosas probadas y refutadas)

- **Bandas sentadas sobre su ruido (defecto con nombre «V1»)**: `flat.breakawayWinPct` (techo por
  muestreo; «Quien quiera estrecharla de verdad tiene que subir primero las semillas del invariante»),
  `mountain.top10GapSeconds` (suelo bajado a 40 para salir de la nube), `SATURATION_DEPLETION` 0,95→0,96,
  `SATURATION_BONK_PCT` 10→12, `grandTour.queenLastGroupPct` (6 vueltas → «moneda al aire», 11 % de
  fallos; resuelto subiendo a 12), `smallTours` 4→8 corridas (15 % a menos de un par), `world`
  cracks 25→35.
- **`mountain.breakawayWinPct` no es el objetivo del juego**, es control de forma (v44).
- **Reparto de causas de abandono invertido** (62/34/4 contra 45/50/5 de §VI.3): arreglo probado
  (`HEALTH.illnessRaceMax` 0,0050 → 50/47/3, total 16,6 %) y **refutado** porque tira
  `queenLastGroupPct` a 6,9 %. «Queda como deuda NOMBRADA y medida». `crashPct` roza el techo (65 % con 6 vueltas).
- **Grupo de cabeza de la reina = 1** (encargo: 5-15): deuda de la v23, sin banda; «calibrar hacia él es
  una tanda entera: el final en alto lo resuelve la capa de ataques (§13.1, regla 9) más el modelo de
  final, y moverlo toca la reina canónica, `realQueens` y `grandTour.queenLastGroupPct`».
- **`mediaOneGroupPct` 20 %** y **`crashPct`/`illnessPct` techo 67 %**: «el margen que hoy se puede
  sostener», no la diana.
- **Atribuciones refutadas (v42)**: «el viento acorta la cola», «la lluvia la arregla», «el calor la
  vuelve a romper» — todas dentro del ruido de 6 vueltas.
- **`ataqueSinCerrar` tolera 2** porque los eventos nombran 3 protagonistas como mucho: «Bajarlo a cero
  exige que la salida y el desenlace nombren a la misma gente, que es otra tanda».
- **`pasajerosConcordancia` retirada** (v40): «Un medidor que grita defectos inexistentes es peor que no tenerlo».
- **Velocidad de grupo en la radio**: dos intentos refutados por el banco (v34 relojes de grupo; v58
  «se probó excluir a todo el que cambia de grupo y el banco lo refutó en el acto»); solución actual:
  descartar `dt` imposibles (`radioMaxKmh 85`).
- **`realQueens.lastGroupPct` suelo 8→7**: no por un número, sino porque las formas se separaron
  (final en alto 13,3 % vs meta en llano 2,5 %) y la mediana agrupada cae en el hueco.
- **Motor cada vez más caro**: Flandes ×5 de 14,0 s (v38) a 20,7 s (v40); nocturnos caídos por
  timeouts con cero aserciones falladas (v43, v45); de ahí los presupuestos ×4.
- **`medir-carrera.mjs` corre con déficit 0** → no ve nada de la general (anotado en `medir-maillot.mjs`).
- **Comentarios desfasados**: `targets.ts`/`smallTours.ts` describen `llana-180` con «tres sprinters SPR
  84, 85 y 86» (desde v38 son 10 en degradado con 88 vs 82); `analyze.ts` cita objetivos viejos
  («2-8 %», «60-240», «120-240»); `invariants.test.ts` cabecera «invariantes de la etapa llana»;
  `grandTour.ts` l. 8-9 «etapas sueltas de 40 corredores»; `cli.ts` «~22 s» por vuelta.
- **`raceRadio` «pelotón» ≥ 2/3**: dos quejas opuestas fijan el listón (grupo de 129 llamado «grupo de
  cabeza»; 59/65 y el de 65 no es «el pelotón»).
- **`world.ts` no simula etapas**: «La carga de un día de carrera es representativa por terreno… aquí no gana nadie».

---

## 9. Citas del dueño sobre conducta en carrera (requisitos recogidos de los comentarios)

Fuga y persecución:

- «sin equipo no hay motivo para que el pelotón tire para acabar con una fuga, y las fugas deberían llegar mucho más de lo que llegan… al introducir equipos reduces las probabilidades de que las fugas lleguen drásticamente, y por tanto esas simulaciones no valen para nada» (`scenarios.ts` `inTeams`).
- «no te creo… en lo que veo del motor en las llanas la fuga NUNCA gana; quizás tienes que poner más ciclistas en la simulación para que salga algo real… sí, pon un pelotón de verdad en el escenario canónico» (`flatScenario`).
- «incluso 2-10 % no me parece muy justa… yo creo que una etapa llana debería tener una banda más centrada en el 10 %» (`flat.breakawayWinPct`).
- «puede ocurrir y ocurre a veces, que el pelotón se despista, deja hacer a una escapada (especialmente si los equipos de los sprinters tienen a alguien metido en la fuga y entonces no van a tirar…), y la escapada se va a 15 o 20 minutos. Los de la general tiran para que no se vaya a 20 minutos, pero pueden perfectamente llegar con 8 o incluso 15 minutos; ya ha pasado en grandes vueltas. No es para que pase muy a menudo, pero de vez en cuando sí» (`flatMoveWorstMarginS`).
- «está bien así» (18,1 % de fugas ganadoras en la montaña del calendario, `calendarQueens`).
- «en general una cosa que se ve es que los que pierden en montaña 5 minutos en medio de una etapa luego se reintegran demasiado fácil» (`mountainRejoins`, v59).

Media montaña y desenlaces:

- «estaría bien poner también algunas de media montaña… o sea, muchas montañitas no tan duras, pero que disminuyan las probabilidades de que los sprinters lleguen o que lleguen con fuerzas, y que una fuga con escaladores/rodadores tenga más opciones de ganar»; «una clásica así con algo de montaña pero que no acabe en alto» (`mediumMountainScenario`).
- «hay 23 ciclistas en el mismo tiempo y luego todos los demás llegan a 1 segundo... lo cual es técnicamente imposible» (inv. 27).
- «una reina real deja llegar juntos a un grupo de 5-15 y no 1» (deuda smallTours).
- «es un despropósito… es una llegada en alto con un puerto brutal al final, donde debería haber muchas diferencias, y el que llega en el puesto 150 solo perdió 26 segundos» (Giro e9, v47).
- «que haya remontadas en una subida… o uno que empieza muy fuerte y luego se hunde» (`climbs.ts`, v26).
- «Race Arabia: gana las 5»; «etapa 2 y etapa 3 el resultado se parece demasiado» (`SMALL_TOURS`).

Equipo, maillot y quién tira:

- «no es solo saber qué equipo(s) participan de la persecución… también es saber POR QUÉ»; «desgastarse a lo wey» (`teamPullWithReasonPct`).
- «Cumbre Escuadra ha tomado el frente» (criterio visible de la voz de equipo).
- «el líder con el maillot amarillo está también tirando???» y «el líder se la pasa todo el tiempo tirando» (`autoOrders.ts`, v42).
- «le han dado el dorsal 131 a un wey que ha quedado en el puesto 50 a 10 minutos, mientras que el 132 y otro más de ese equipo son primero y segundo de la general… y mirando sus stats son claramente mejores que el 131» (`raceLeadScore`).
- «busca de algún modo dejar una evidencia que explique por qué o para qué tira cada ciclista de un grupo» (v47, `RadioPuller.motivo`); «dice algo así como _his team's card for this finish_… pero no dice quién es, wey» (v57, `para`); «te dije que SIEMPRE se vean los 3 maillots y solo sale uno» (v47, `priority`).
- «El líder se queda atrás… ¿y nadie de su equipo tira para ayudarle?» (docs/balance.md v57 §3).
- Race Sardegna e2: el líder de la general (escalador) se fue en la fuga y ganó al sprint una etapa de velocistas (`medir-maillot.mjs`).
- «A ver, lo de las tácticas en la carrera… es que vas dando palos de ciego, te digo una cosa y pones un parchecito, pero no arreglas el problema real. Yo creo que tienes que hacer un break y REPENSAR TODA la lógica de todas las situaciones que pueden ocurrir en carrera y hacer unas NUEVAS reglas y con eso rehacer el motor (la parte táctica), porque ahora mismo está todo del NAAAAABO» (`docs/tactica.md`); tabla: «Seis del mismo equipo en una fuga de nueve», «Dos compañeros en una fuga de tres, y gana el otro».

Radio, física observable y crónica:

- «¿qué me dices de este tercer grupo que va a 94 km/h cuando están _just riding_? Menos mal que están just riding, si llegan a competir de verdad…» (v58).
- «Hay un ciclista suelto que se quedó descolgado del pelotón… ¿cómo es posible que vaya tan rápido como el pelotón?»; «No entiendo cómo en 1 km se han reducido 30 segundos de distancia entre algunos grupos»; «En el siguiente km se reúnen mágicamente 3 grupos» (`medir-huecos.mjs`).
- «mira el siguiente km» (descarta la pájara en el pico de 14,3 km/h, v49).
- «no tiene ni pies ni cabeza» (Race Jaén, v25); «si lees todo el Journal no SABES quién va ganando, quién va persiguiendo… es un lío los últimos mensajes»; «el estado de carrera no puede quedarse mudo 35 km» (v27).

Progresión:

- «no estoy muy convencido de que funcione bien; quiero una revisión muy detallada de esto»; «que no acaben todos siendo Pogačar», «que tampoco se quede nadie sin pasar de cuatro en nada», «que se puedan balancear entrenamiento y carreras»; «siendo menos cartesianos» (`world.ts`).

---

## 10. Constantes del motor que los bancos usan como listón

`STAGE.dx 0,1`, `timeCutFlat 0,08`, `timeCutQueen 0,18`, `timeCutItt 0,25`, `abandonStageCapFraction 0,04`,
`finishBunchMinRiders 15`, `frontNamesMaxRiders 8`, `gapChaseMainFraction 0,5`, `mainGroupTakeoverRatio 1,25`,
`radioMaxKmh 85`, `climbRaceKmToGo 30` (solo se DISPUTAN las cotas de los últimos 30 km), `erosionMax 0,92`,
`relayDutyByRole` (gregario 1,0 · lanzador 0,85 · libre 0,6 · sprinter 0,2). `PELOTON_MIN_SHARE 2/3`,
`LEAD_GROUP_SECONDS 30`, `RUNAWAY_MARGIN_S 120`, `CLOSE_MARGIN 5-60 s`, `MUTE_KM_LIMIT 30`, `FINALE_KM 15`,
`CLIMB_POS_THRESHOLD 5`, `BUNCH_MIN_RIDERS 8` (coherencia), `PASO 6` (calendarQueens).
