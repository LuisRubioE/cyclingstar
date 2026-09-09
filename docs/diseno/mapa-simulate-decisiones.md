# Mapa de los SITIOS DE DECISIÓN de `packages/engine/src/stage/simulate.ts`

Fichero leído entero (6.539 líneas, estado a día 2026-09-08). Este mapa recoge **qué decide el motor, dónde, con qué entradas y con qué constantes**; no opina ni propone. Las líneas son aproximadas (±5). Las CITAS textuales del dueño que aparecen en comentarios sobre conducta táctica están recogidas en la sección 9; los límites anotados como tales («queda anotado», «no se ha hecho», «se probó y se refutó») en la sección 8.

Convenciones de lectura:

- «ve EQUIPO» = la decisión lee `teamId`/`teamOf`/`teamPlans`/`plan.leaderId`/`plan.stageCandidateId`/`rebels`.
- «ve GENERAL» = lee `gcDeficitSeconds` / `gcRank` / `hasGcContext`.
- «ve COMPAÑEROS en el grupo» = mira si hay hombres del mismo equipo en `members`/`idSet`.
- «ve DELANTE/DETRÁS» = lee relojes (`tS`) de otros grupos.

---

## 1. Estado por corredor: `RiderSim` (líneas 185-329)

| Campo                                                        | Qué guarda                                                                                                                                                                                        | Quién lo escribe                                                        | Quién lo lee en decisiones                                                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `input: StageRider`                                          | eff0 (ya escalado por `dayFactor`), `orders` (role, mentality, targetRiderId, effort, triggerKm, contestSprints/Climbs), `teamId`, `gcDeficitSeconds`, `gcRank`, `fragility`, `matches`, `energy` | Al construir (1071-1119)                                                | Todo el motor                                                                                                                               |
| `energy0`, `energy`                                          | Depósito inicial y actual                                                                                                                                                                         | `advance` (coste bloque), cerillos, reserva, banners                    | `relayDuty` (frescura), `riderEff` (erosión, pájara), `giveUpLambda`, `helpBack` (freshness), `droppedCommit`, `asMoveRider.energyFraction` |
| `groupId`                                                    | Grupo actual (`peloton`, `mov-N`, `shed-N`)                                                                                                                                                       | `dropOut`, ataques, fusiones, reenganches, drop-back                    | Casi todo                                                                                                                                   |
| `work`                                                       | Gasto total (TSS)                                                                                                                                                                                 | `advance`, cerillos, reserva                                            | `finishStage` (peaje de trabajo relativo al grupo)                                                                                          |
| `frontWorkPeloton`, `frontWorkMove`                          | Trabajo al frente por clase de grupo                                                                                                                                                              | `advance`                                                               | `break_share` (crónica)                                                                                                                     |
| `pullWindow`                                                 | Trabajo al frente del pelotón con olvido (`pullWindowDecayPerKm` 0,87/km)                                                                                                                         | `advance`; decae en la decisión del pelotón (2552)                      | `peloton_pull` (crónica) y **`finishStage`: si un lanzador ha lanzado** (`listónTren`)                                                      |
| `finishTs`, `finishOrder`, `bonusS`, `sprintPts`, `climbPts` | Meta y puntos                                                                                                                                                                                     | `finishStage`, banners, `buildResults`                                  | —                                                                                                                                           |
| `matches`, `matchBoostS`                                     | Cerillos restantes; segundos de impulso activo (v39: tiempo, no metros)                                                                                                                           | `comesOff`, `attemptFrom`, tren último km; decae por bloque (1750-1760) | `riderPerfil` (+`matchBonus`), `asMoveRider.matches` (táctica)                                                                              |
| `workJitter`                                                 | Desempate fijo del turno (subflujo `work:<id>`)                                                                                                                                                   | Construcción                                                            | `relayDuty`                                                                                                                                 |
| `markLossS`                                                  | Segundos cedidos marcando sin soltarse                                                                                                                                                            | `comesOff`, respuesta al ataque                                         | Tiempo de meta (`lossOf`), foto                                                                                                             |
| `driftS`                                                     | LA DERIVA: segundos perdidos contra el frente del grupo sin soltarse                                                                                                                              | `shatter` (subida), se pone a 0 en llano (`advance`)                    | `paceSetters`, `dropOut` al pasar `driftDropGapSeconds`, tiempo de meta                                                                     |
| `reserveS`                                                   | LA RESERVA W′ (`reserveSeconds` 65 s)                                                                                                                                                             | `shatter` (gasto), `advance` (recarga a rueda)                          | `shatter` (tolerancia de 4 puntos solo mientras quede)                                                                                      |
| `gaveUp`                                                     | Ya se dejó ir (regla 8, acto único)                                                                                                                                                               | `administerEffort`                                                      | `relayTurn` (no), `attributeChase`, `helpBack` (no baja), ritmo del grupeto (`share`)                                                       |
| `bonkNoticed`, `bonkKm`                                      | Pájara narrada; km seguidos a cero                                                                                                                                                                | `shatter`, `collapseCheck`                                              | `collapseCheck`                                                                                                                             |
| `hurt`                                                       | Caída seria (`minor`/`major`)                                                                                                                                                                     | `crashCheck`                                                            | `dropOut` (no coge autobús), fusiones (`allHurt`), `helpBack` (no baja), colapso                                                            |
| `mishapKm`                                                   | Km del último percance de cualquier gravedad                                                                                                                                                      | `crashCheck`                                                            | `helpBack` (`favoritoDeHoy`)                                                                                                                |
| `fugaDesdeKm`, `gastadoHastaKm`                              | Desde cuándo va en un movimiento; hasta qué km está gastado tras ser cazado                                                                                                                       | `attemptFrom` / captura (5681-5691)                                     | `asMoveRider.gastado` (táctica no le deja atacar ni saltar)                                                                                 |
| `abandonedKm`                                                | Se bajó                                                                                                                                                                                           | `collapseCheck`                                                         | `membersOf` (deja de existir)                                                                                                               |
| `incident`                                                   | (no se usa en este fichero salvo tipo)                                                                                                                                                            | —                                                                       | —                                                                                                                                           |
| `pulling`, `pullMotive`, `pullFor`                           | ¿Tira? ¿Para qué? ¿Para quién?                                                                                                                                                                    | `advance`; se limpia al cambiar de grupo (5833-5862)                    | **`pulling` lo lee la táctica** (`asMoveRider.pulling`, solo en el pelotón); el resto es observación                                        |
| `parte: StageEffort`                                         | Contadores de observación (kmAlFrente, kmEnFuga, kmDescolgado, ataques, saltos, cerillos, reservaGastadaS, gasto{…}, pajaraKm, descuelgueKm)                                                      | En el sitio donde pasa cada cosa                                        | Nadie (solo salida)                                                                                                                         |

**Lo que un corredor NO lleva en su estado**: posición dentro del grupo (el montón de la caída lo aproxima con una tirada contigua de la lista), ninguna memoria de a quién ha atacado/marcado antes, ni de las órdenes de otros (eso vive en los mapas `domestiquesFor`, `leadOutFor`, `lanzaPara`, `markTargetOf`, `worksFor`).

## 1-bis. Estado por movimiento: `Move` (líneas 134-183)

`g: Group` (id, riderIds, tS, vActual, compromiso, coop, tension), `kind: MoveKind` (`fuga` | `puente` | `contraataque` | `ataque_final` | `ataque_grupo`), `sourceId`, `bornKm/bornTs`, `allowed` (¿el pelotón dio cuerda? se decide UNA vez al nacer), `prospered` (superó `tacticBreakGapSeconds` 45 s sobre su grupo de origen), `dayBreak`, `narrated`, `closed`, `targetId`/`bridgeUntilKm` (puente), `restCommit` (cooperación con la que nació), `chaseLedger` (trabajo de sus perseguidores por corredor), `lastIds`, `peakGapS/peakGapKm`.

Los grupos `shed-N` son `Group` a secas (sin memoria táctica). El pelotón es un `Group` con id fijo `peloton`, pero **el título de «pelotón» (`mainId`) se mueve por tamaño** con histéresis (`mainGroupId`, `mainGroupTakeoverRatio` 1,25).

---

## 2. Lo que se calcula UNA VEZ POR ETAPA (líneas 897-1690)

| Qué                                                                                                                                                                            | Línea     | Entradas                                                                                                                           | Constantes                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Orden canónico de `riders` por `riderId` (invariancia a permutaciones)                                                                                                         | 912-917   | —                                                                                                                                  | —                                                                                                |
| Desvío a `simulateTimeTrial` si `input.timeTrial`                                                                                                                              | 919       | —                                                                                                                                  | —                                                                                                |
| Subflujos RNG nominales: `breakaway`, `tactics`, `sprint`, `placement`, `launch`, `rough`, `abandon`, `crash`, `day`, `mood`, `viento`, `work:<id>`                            | 921-1005  | seed                                                                                                                               | — (el subflujo `hazard` de la subida se retiró en v26)                                           |
| **Humor del pelotón** `humorDelPeloton` (un dado por etapa)                                                                                                                    | 992       | `mood`                                                                                                                             | `pelotonMoodCentre` 0,9, `pelotonMoodSpread` 0,14                                                |
| **Viento lateral** `vientoLateral`, `cabenEnFila`, `abanicoAbierto=false`                                                                                                      | 1004-1031 | `viento`                                                                                                                           | `windDayShape` 2,2, `windMin` 0,87, `windEchelonMax` 150, `windEchelonRiders` 12                 |
| **Clima** `{lluvia, calor}`                                                                                                                                                    | 1050      | `stageWeather(seed, input.lugar)`                                                                                                  | —                                                                                                |
| `enFila(block,size)` = tamaño efectivo con viento en llano                                                                                                                     | 1061      | vientoLateral, cabenEnFila                                                                                                         | —                                                                                                |
| Piernas del día `dayFactor` por corredor (±3σ)                                                                                                                                 | 1074      | `day`                                                                                                                              | `dayFormSd` 0,035                                                                                |
| Mapas de órdenes: `domestiquesFor` (líder → gregarios con `targetRiderId`), `leadOutFor`/`lanzaPara` (sprinter ↔ lanzadores), `markTargetOf` (marcador → objetivo), `worksFor` | 1132-1171 | `orders.role`, `orders.targetRiderId`                                                                                              | —                                                                                                |
| `demandaDelDia` y **dosificación**                                                                                                                                             | 1489-1496 | `costBase` por bloque                                                                                                              | `pacingReferenceDemand` 75, `pacingSlope` 1, `pacingMin` 0,7                                     |
| `breakAppeal` (fracción de km en subida + extra si final en alto)                                                                                                              | 1497-1504 | blocks, `stageFinishType`                                                                                                          | `breakAppealClimbWeight` 4, `breakAppealUphillBonus` 0,35                                        |
| `gcTerrain` (¿se juega la general aquí?)                                                                                                                                       | 1511      | kmSubida/total                                                                                                                     | `gcTerrainClimbShare` 0,05                                                                       |
| `finishTerrain`, `stageFinishType`, **`bunchFinish`**                                                                                                                          | 1456-1527 | blocks, nº corredores                                                                                                              | —                                                                                                |
| **`chaseStrength`** (`chaseField`) y `chasingSprinters`                                                                                                                        | 1535-1541 | eff0 de todos, `bunchFinish`                                                                                                       | `chaseMinForce` 0,12                                                                             |
| `chaseGear(force)` → {leash, commitCap, finalDrive, feasible} (se recalcula en cada decisión)                                                                                  | 1550-1558 | fuerza disponible                                                                                                                  | `chaseMaxLeashSeconds` 300, `chaseWeak*`, `finalDriveCommit` 0,85, `chaseFeasibleSecondsPerKm` 3 |
| `leadSprinterId` (mejor SPR entre finishers)                                                                                                                                   | 1561      | eff0                                                                                                                               | —                                                                                                |
| **`hasGcContext`** = alguien con `gcDeficitSeconds > 0`                                                                                                                        | 1569      | general                                                                                                                            | —                                                                                                |
| **`teamPlans = buildTeamPlans(...)`**, `teamOf`, `rebels`                                                                                                                      | 1577-1599 | teamId, role, mentality, targetRiderId, SPR, `finishScore(eff0, stageFinishType)`, gcDeficitSeconds, `{bunchFinish, hasGcContext}` | (en `teamPlan.ts`)                                                                               |
| `teamSpent`, `teamNow`, `teamDriveNow`, `frontTeamId=null`, postura inicial con `restStance`                                                                                   | 1601-1624 | —                                                                                                                                  | —                                                                                                |
| `driveOfRider(id)` (0 para rebelde y para sin equipo), `attackFactorOf(id)`, `purposeOfTeam`, `spentFractionOf`                                                                | 1630-1646 | teamNow, rebels                                                                                                                    | —                                                                                                |
| `abandonBudget` = 4 % del pelotón                                                                                                                                              | 1664      |                                                                                                                                    | `abandonStageCapFraction` 0,04                                                                   |
| `frontMove()` (movimiento con menor tS y con gente)                                                                                                                            | 1667      | moves                                                                                                                              | —                                                                                                |
| **`gcLeash()`**                                                                                                                                                                | 1682-1690 | `hasGcContext`, peor `gcDeficitSeconds` del movimiento de cabeza                                                                   | `gcControlLeash` 700, `gcThreatFraction` 0,6                                                     |
| `kmToNextPaves[]`                                                                                                                                                              | 1445      | blocks                                                                                                                             | `pavesApproachKm` 2                                                                              |
| `probeAt` (fotos pedidas)                                                                                                                                                      | 1318      | probe                                                                                                                              | —                                                                                                |

---

## 3. Estructura del BUCLE PRINCIPAL por bloque (línea 1693 → 5892; `dx` = 0,1 km)

Orden real de operaciones dentro de cada bloque `i`:

1. **Fotos previas** (1701-1722): `relojAntes` (tS de cada grupo antes de avanzar; lo usa la fusión por alcance) y `grupoAntes` (grupo de cada corredor; lo usa la limpieza de `pulling` al final).
2. `km`, `descentStartKm` (marca al ENTRAR en descenso), `isFinal` (`finalBlocks`), `spentReserve = new Set()`.
3. **Caduca el cerillo** en segundos de carretera según `vActual` del grupo de cada uno (1750-1760).
4. Banderas de terreno: `onClimb`, `onPaves`, `onRough` (= subida ∨ pavés ∨ llano con viento), `raceThisClimb` (= quedan ≤ `climbRaceKmToGo` 30 km).
5. **Decisión del pelotón cada `decisionEveryBlocks` = 10 bloques (1 km)** (1801-2875):
   1. `front = frontMove()`, `gap`, `kmRestantes`.
   2. **Plan de equipo al día** (si hay equipos): `inMove` (solo movimientos por DELANTE del pelotón), `menInPeloton` (grupo `mainId`), `frontThreatDeficit`, `teamStance` por equipo, **`frontTeamId`** (quién lleva el frente, con histéresis y relevo), `teamDriveNow`, `chaseReady/avail`, `enLaFuga` → `gear` recalculado, **drop-back de gregarios** (`domestiques_drop_back` / `no_help_for_leader`).
   3. Telemetría de situación: `liveGroups` ordenados por reloj y rango, **`mainId` = `mainGroupId(...)`**, `chaseIdx`, partes `front_group` / `time_gap`.
   4. Atribución `peloton_pull` (decay de `pullWindow`), `break_share`.
   5. **Controlador del compromiso del pelotón**: `freeRunTarget` → `closing` / caza de sprinters (lazo cerrado, claudicación) / control de la general (`gcLeash`) → humor y dosificación (salvo cuando «se decide») → suelos (tirón final, viento, pavés) → `noOwnerCommitFactor` → histéresis `commitHysteresis`. Luego `consolidated` (`peloton_concedes`).
6. **`jefeEnApuros`** (2922-2949): set de ids cuyo hombre de la general va ≥ `regroupGapSeconds` (22 s) por detrás.
7. Definición de closures del bloque: `interésPropio`, `advance`, `dropOut`, `predictedShedPace`, `markedPerfil`, `comesOff`, `shatter`, `administerEffort`, `collapseCheck`.
8. **`collapseCheck`** sobre pelotón, moves (inFront=true) y shed (inFront=false) (4044-4046).
9. Fracciones de ritmo: `climbFrac`, `roughFrac`, `pelFrac`, `moveFrac(m)` (4048-4069).
10. **`administerEffort`** (regla 8) sobre pelotón (inFront=false), moves (true), shed (false) (4074-4076).
11. **`shatter(peloton)`** (4077).
12. **Corte del abanico** `corte(peloton)` y `corte(sg)` por cada shed (4088-4175), solo llano con viento y no `isFinal`.
13. **`shatter` de cada move** (4176) y **`shatter` del shed que sea `mainId`** (4225-4228).
14. Crónica de la criba: `peloton_split` / `peloton_regroup` (dentro de `raceThisClimb`) o `peloton_selection` (lejos de meta) (4235-4413).
15. **Capa táctica**: `kmToGo`, `racingNow`, `attemptFrom` desde el pelotón (un solo tipo de intento por bloque, si no `closingNow`), y desde cada move (puente o `ataque_grupo`) (4415-4782).
16. **Revisión de la cooperación de cada move** cada `coopReviewBlocks` = 20 (2 km) (4801-4809).
17. **Tren del último km**: lanzadores encienden cerillo (4838-4853).
18. `relojDeGrupo`, `mejorRelojDelEquipo`, `tieneHombreDelante`, `relojPrincipal`, `compromisoPrincipal` (4872-4911).
19. **`advance(peloton)`** → **`advance` de cada move** (+ `tension += 0,4·dx`, cúspide `peakGap`) → **ritmo de cada shed** (`droppedCommit`, `share` de rendidos, `grupetoWait`) → **`advance` de cada shed** (4912-5017).
20. **Reenganche y fusión de shed** (5030-5177): al pelotón (`caught` o `cerrando` dentro de puerta) o entre grupetos (`mergeGap`).
21. **Rebases pendientes y fusión por alcance entre moves/shed** («no se puede atravesar un grupo») (5207-5356).
22. **Caídas** `crashCheck` en pelotón, moves, shed (5360-5429).
23. **Puentes caducados** → `bridge_failed` (5434-5443).
24. **Resolución de movimientos** (5449-5806): fusiones entre moves (`captureGapSeconds` 5 s), `prospered`/corona de fuga del día/`attack_sticks`, captura por el pelotón (`gastadoHastaKm`), fuga del día cazada (`stillAway`), movimientos vacíos (`move_faded`).
25. Banners (`meta_volante` solo grupo de cabeza; `cima` todos por orden) (5809-5824).
26. Limpieza de `pulling/pullMotive/pullFor` para el que cambió de grupo y `pullFor` si el destinatario ya no está; foto `probe` (5833-5891).

Tras el bucle: `finishStage` (6183), `applyStageTimeCut` (5970), `buildResults` (6485).

**Consecuencia del orden que hay que tener presente**: el turno de relevos (`advance`) se decide DESPUÉS de la táctica y de la criba del mismo bloque; la táctica lee `m.pulling` del bloque ANTERIOR; el plan de equipo y `frontTeamId` se revisan solo cada 10 bloques; `jefeEnApuros` y `tieneHombreDelante` se calculan cada bloque.

---

## 4. Decisiones, una a una

### 4.1 RELEVOS: quién da la cara

#### D-01 `relayDuty(m, protectedByTeam, teamDriveNow, sittingOn)` — deber de relevo (líneas 502-553)

- **Fórmula**: `relayDutyByRole[role]` + `relayFreshnessWeight`(0,5)·min(frescura, `relayFreshnessCap` 0,45) − (`relayProtectedPenalty` 1,2 si arropado) − (`relaySittingOnPenalty` 2 si su equipo persigue) + `teamRelayDriveWeight`(1,3)·empuje + `relayEffortWeight`(0,5)·EFFORT_PUSH[effort] + `relayJitterWeight`(0,05)·jitter.
- `relayDutyByRole`: gregario 1,0 · lanzador 0,85 · libre 0,6 · cazaetapas 0,5 · marcador 0,35 · sprinter 0,2 · líder 0,1.
- **El empuje de equipo vale 0** para el que es «la carta del equipo»: `protectedByTeam` ∨ role ∈ {`lider`, `sprinter`} (v42).
- Ve: rol, frescura, `orders.effort` (a_tope/ahorrar del jugador, v58), si tiene gregarios propios EN ESTE GRUPO (`protectedByTeam` calculado en `relayTurn`), empuje de equipo (`driveOfRider`, solo en el pelotón), `sittingOn`.
- NO ve: general, ni rivales, ni lo que hay delante/detrás (eso entra por `sittingOn` y el empuje, calculados fuera).
- Deliberadamente no interviene la posición en el array.

#### D-02 `relayTurn(...)` — quiénes y cuántos tiran (líneas 578-823)

- Entradas por hombre: `duty` de D-01 − (`relayNoChanceWeight` 1)·`paraMí`·`sinOpciones(id)` [salvo abanico] − (`relayRaceLeaderPenalty` 3 si `gcRank === 1`, salvo abanico) + (`relayLeadOutBoost` 1,5 si `lanzando(id)`).
  - `paraMí = 1 − drive`: el que lleva empuje de equipo ignora el «no puedo ganar».
- **Techo**: `min(members, relayRotationMax 20, ceil(paceFraction·members))`.
- **Listón** (tres situaciones): fuga/grupeto o abanico → `relayDutyThresholdLoose` 0; pelotón con equipos → `relayDutyThreshold` 1,5; pelotón sin equipos → `relayDutyThresholdNoTeams` 0,5 − `relayDutyPaceRelief` 0,6·paceFraction.
- **Suelo**: `max(1, min(members, relayMinPullers 4, ceil(members/relayMinPer 45)))`.
- **En abanico** (`enAbanico`): rota la fila entera (`members − protegidos`), acotado por techo; los protegidos (jefe con gregarios) son los únicos que salen.
- Si hay que rellenar por debajo del listón, primero **los del dueño del frente** (`delDueño`), luego por deber, luego id.
- Salida final pasa por `elTren`.
- Ve: EQUIPO (vía `domestiquesFor`, `driveOfRider`, `delDueño` = `teamOf === frontTeamId`), GENERAL (`gcRank === 1` → penalización del maillot), COMPAÑEROS en el grupo (`idSet.has(helper)`), rivales (indirectamente vía `sinOpciones`, que compara `finishScore` contra el mejor del grupo).
- NO ve: qué hay delante/detrás por sí mismo — llega empaquetado en `sittingOn`/`jefeEnApuros`/`tieneHombreDelante`.

#### D-03 `elTren(turno, scored, lanzando)` — el último km no es rotación (líneas 843-851)

- Si hay algún `lanzando(id)` en el grupo, **el turno son SOLO los lanzadores** (todos los trenes a la vez); si no, el turno normal.
- `lanzando(id)` (3114-3118): `isBunch ∧ kmToGo ≤ sprintTrainKm (3) ∧ lanzaPara.get(id) ∈ idSet`.
- Ve: EQUIPO (vía `lanzaPara`, es decir órdenes `lanzador` + `targetRiderId`) y COMPAÑERO (el sprinter en el grupo). NO ve general ni rivales.

#### D-04 Llamada a `relayTurn` dentro de `advance` (líneas 3086-3120): las banderas

- `driveOfRider` → solo si `isBunch` (grupo `mainId`); en fuga/grupeto el empuje es 0.
- `sittingOn(id)` = (¬isBunch ∧ `teamOf(id) === frontTeamId`) ∨ `jefeEnApuros.has(id)` ∨ (`kind === 'move'` ∧ `tieneHombreDelante(id, group.tS)`).
- `hayEquipos = teamPlans.size > 0`; `delDueño = isBunch ∧ teamOf === frontTeamId`; `sinOpciones = interésPropio(members).de`; `lanzando` (D-03); `enAbanico = abanicoAbierto ∧ viento ∧ llano`.
- Ve: EQUIPO, `frontTeamId`, delante/detrás (por `jefeEnApuros` y `tieneHombreDelante`).

#### D-05 `jefeEnApuros` (líneas 2922-2949) — «mi hombre de la general va por detrás»

- Por cada plan con propósito `maillot` o `general`: si `plan.leaderId` sigue en carrera y el reloj de su grupo está ≥ `regroupGapSeconds` (22 s) por detrás del grupo de un compañero, ese compañero entra en el set (y no releva, en el pelotón o donde vaya). El que ya va CON el jefe no cuenta.
- Ve: EQUIPO (`plan.leaderId`, `memberIds`), GENERAL (vía `plan.purposes`), DETRÁS (relojes).
- NO ve: rebeldes (no los filtra), ni si el jefe está herido/rendido.
- Constante: `regroupGapSeconds`. Se probó sin umbral y la huella de la llana se iba 387 s.

#### D-06 `tieneHombreDelante(id, tS)` (líneas 4872-4889) — no se persigue lo propio desde un grupo de caza

- `mejorRelojDelEquipo` = menor tS entre todos los del equipo; tiene hombre delante si `mejor < tS − grupetoJoinGapSeconds (12)`.
- Solo se aplica cuando `kind === 'move'` (grupo de caza que no es el pelotón). En el pelotón lo dice el plan (§V.1); en un grupeto sería absurdo.
- Ve: EQUIPO, DELANTE. NO ve: si el de delante es su carta o un noveno hombre (aquí sí cuenta cualquiera del equipo, al contrario que `manUpTheRoad` en D-10).

#### D-07 `interésPropio(members)` / `noChanceToWin` (líneas 2976-2995) — «¿para qué voy a tirar si no puedo ganar?»

- `selección = 1 − members/racingNow`; `tipo = finishType(finishTerrain, members.length)`; `remate = finishScore(riderEff(m), tipo)`; `de(id) = selección · noChanceToWin(remate, mejorDelGrupo, kmToGo)`; `media` = promedio.
- Ve: RIVALES en el mismo grupo (el mejor remate), tamaño del grupo vs carrera. NO ve equipo (se pondera después con `paraMí`), ni general.
- Usos: `relayTurn` (D-02), **revisión de cooperación de la fuga** (D-27).

#### D-08 `motivoDelRelevo(m)` (líneas 3251-3363) — evidencia «para qué/para quién tira» (observación)

- Orden de ramas: `solo` → `abanico` → `tren` (para `lanzaPara`) → (¬isBunch ∧ group.tS ≥ relojPrincipal) → `persecucion` si `group.compromiso ≥ compromisoPrincipal`, si no `grupeto` → carta del plan en este grupo (`stageCandidateId` si propósito `etapa`, si no `leaderId`) → `equipo_maillot/general/etapa` con `para` → (¬isBunch) `persecucion` si hay alguien delante, si no `fuga` → si `driveOfRider > 0` → `equipo_*` con `para` solo si el hombre está aquí → `rol`.
- Es OBSERVACIÓN: nadie la lee de vuelta. Ve EQUIPO, `purposeOfTeam`, compañeros en el grupo, delante/detrás.

#### D-09 Limpieza de `pulling/pullMotive/pullFor` al cambiar de grupo (5833-5862). Observación pura (el que llega entra a rueda en la foto; se quita el nombre si el destinatario se fue).

### 4.2 EL PLAN DE EQUIPO en la decisión del pelotón (cada 10 bloques)

#### D-10 Postura de cada equipo `teamStance(plan, situación)` (líneas 1814-1904)

- `inMove` = corredores en movimientos con `tS < peloton.tS` (solo lo que va DELANTE).
- `menInPeloton(plan)` = miembros no rebeldes con `groupId === mainId`.
- `frontThreatDeficit` = menor `gcDeficitSeconds` del movimiento de cabeza (si `hasGcContext`).
- `manUpTheRoad` = alguna de las **cartas** (`stageCandidateId`, `leaderId`) va delante y no es rebelde; si el plan no tiene cartas, cualquier miembro.
- `leaderUpTheRoad` = `plan.leaderId` va delante (v58: excepción al equipo del maillot).
- Situación: `{manUpTheRoad, leaderUpTheRoad, kmToGo, frontThreatDeficit, gapSeconds}`.
- Ve: EQUIPO, GENERAL, DELANTE. NO ve: lo que hay detrás, ni el humor, ni el terreno del bloque (eso lo lleva `teamPlan.ts`, no leído aquí).
- Constantes: en `teamPlan.ts`.

#### D-11 Quién lleva el frente `frontTeamId` (líneas 1905-1981)

- `claimOf(plan) = frontClaim(stance)` si `menInPeloton > 0`, si no 0.
- `relief` = mejor por (claim desc, gasto asc, quality desc, id) entre los que tienen claim > 0 y `spentFraction < 1`.
- Cede si: no hay actual, o claim(actual)=0, o gastado ≥ 1, o `cansado` (= gastado ≥ `teamFrontHandoverSpent` 0,35 ∧ claim(relief) ≥ claim(actual) ∧ gasto(relief) + `teamFrontHandoverEdge` 0,2 ≤ gasto(actual)).
- Si nadie fresco: sigue el que estaba si aún tiene claim; si no, **el fundido con más claim** (v33: en el desenlace nadie es fresco y el tren tiene que lanzar).
- Ve: EQUIPO (planes, `teamSpent`), delante (vía stance). NO ve: rivales concretos, ni general directamente.

#### D-12 Empuje y fuerza DISPONIBLE de la caza (líneas 1982-2029)

- `teamDriveNow = teamDrive(stance, spent, esElDueño)` por equipo.
- `avail = Σ present·(1−spent) / Σ present` sobre equipos con intent `perseguir` o `lanzar`.
- `enLaFuga` = equipos con gente en la fuga del DÍA (`mv.dayBreak`); `trenesQueTiran` = trains de `chaseStrength` cuyo equipo no está en la fuga; `fuerza` = `chaseForce(trenesQueTiran)`.
- `gear = chaseGear(fuerza · lerp(teamChaseTiredForce 0,5, 1, avail))`.
- Ve: EQUIPO (incl. en la fuga del día), no ve rivales fuera de los trenes de `chaseField`.
- Límite: solo la **fuga del día** exime a un tren; un compañero en un contraataque posterior no.

#### D-13 Drop-back de gregarios `domestiques_drop_back` / `no_help_for_leader` (líneas 2052-2319)

- Puerta: `kmRestantes ≥ helpBackMinKmToGo (5)`. Por cada plan con `leaderId`: jefe vivo, fuera del `bunchNow`, en un **`shed`** (no en un move), con `regroupGapSeconds (22) ≤ gap ≤ helpBackMaxGapSeconds (300)`.
- `porLaGeneral` = purposes ∋ `maillot`/`general`. `favoritoDeHoy` = `stageCandidateId === leaderId` ∧ `mishapKm` en los últimos `helpBackMishapKm` 5 km ∧ menos de `helpBackStageFavouriteTeams` 3 equipos con más `quality`.
- `puedeBajar(m)`: en `bunchNow` → sí; en la cabeza de carrera o en el grupo del jefe → no; en otro grupo → solo si su reloj es menor que el del jefe (va por delante).
- `esElMaillot(m)` = `hasGcContext ∧ gcDeficitSeconds ≤ 0` → **el líder de la carrera no baja nunca** (v50).
- `tieneElEncargo(m)` = `role === 'gregario'` ∧ (`targetRiderId` nulo o === leaderId) (v58: «si yo como humano digo que voy por libre…»).
- `disponibles` = miembros ≠ leader, no rebeldes, no la carta de etapa si el equipo juega `etapa` con otro, con encargo, no maillot, pueden bajar, `!hurt`, `!gaveUp`, frescura ≥ `helpBackMinFreshness` 0,35.
- `guarda = min(helpBackGcKeepInBunch 1, disponibles en bunch)`; `quiere` = por la general `disponibles − guarda`; por la etapa `helpBackStageHelpers 2 − conEl` si `favoritoDeHoy ∧ gap ≤ helpBackStageGapSeconds 60`; si no 0.
- Van los más enteros, primero los que ya van a medio camino. Mueve `groupId` al `shed` del jefe.
- Ve: EQUIPO, GENERAL (maillot, purposes), COMPAÑEROS (dónde va cada uno), DETRÁS, `mishapKm`, `quality` de otros equipos.
- NO ve: si el jefe va en un `mov` por detrás (solo `shed`), pinchazos/averías (no existen), ni si el pelotón está cazando (la vuelta la resuelve luego la física de `droppedCommit` y la puerta).

### 4.3 EL CONTROLADOR DEL PELOTÓN (compromiso), líneas 2678-2875

#### D-14 `freeRunTarget` (2680-2686)

- Subida: `raceThisClimb` ? `climbRaceCommit` 0,85 : `climbTempoCommit` 0,7. Llano: `bunchFinish ∧ kmRestantes ≤ finalDriveKm (15)` ? `gear.finalDrive` : `pelotonTempoCommit` 0,55.
- Ve: terreno y km; NO ve equipo ni general.

#### D-15 Rama `closing` (2709-2711): hay movimientos y ninguno `allowed` ni `dayBreak` → `target = max(freeRun, tacticControlCommit 0,72)`. Ve: `allowed` (decidido en `pelotonAllows` al nacer). Congela también la táctica (`closingNow`).

#### D-16 Rama caza de sprinters (2712-2758)

- Condición: `ahead ∧ chasingSprinters ∧ !chaseAbandoned`.
- Anuncio `sprinters_chase` una vez pasada `chaseAnnounceFrac` 0,4 del recorrido, con `porQue = purposeOfTeam(frontTeamId)`.
- `desiredGap = gear.leash · frac` (frac decae a 0 en `chaseCatchTargetKm` 12 km); `err = gap − desiredGap`; `cierreNecesario = gap / (kmRestantes − 12)`.
- **Claudicación** `conceded` solo si `front.dayBreak ∧ gap ≥ chaseNeverConcedeSeconds 10 ∧ cierreNecesario > gear.feasible` → `sprinters_give_up`, `chaseAbandoned = true` (se resetea cuando `moves.length === 0`).
- Si no: `target = min(gear.commitCap, max(0,1, chaseHoldCommit 0,62 + chaseGain 0,016·err))`.
- Ve: fuerza del campo (`chaseField`, ajustada por equipos en D-12), delante. NO ve general (para eso está D-17), ni a los rivales por nombre.

#### D-17 Rama control de la general (2759-2768): `ahead` sin caza de sprinters → `err = gap − gcLeash()`; subida → `freeRunTarget`; llano → `min(1, max(0,1, 0,62 + 0,016·err))`. Ve GENERAL (peor déficit de la cabeza) vía `gcLeash`. NO ve equipo.

#### D-18 Humor y dosificación (2786-2805): `seDecide = (onClimb ∧ raceThisClimb) ∨ kmRestantes ≤ finalDriveKm`; si no se decide: `target *= humor · dosis` (ambos = 1 en subida si `demandaDelDia < climbEaseDemand 95`). Ve: nada del equipo/general.

#### D-19 Suelos (2810-2834): tirón final `gear.finalDrive` (si `bunchFinish ∧ ≤15 km ∧ !chaseAbandoned`); viento en llano `windRaceCommit 0,82 · (abanicoAbierto ? 1 : vientoLateral)`; pavés y aproximación `pavesRaceCommit 0,8`.

#### D-20 `noOwnerCommitFactor` 0,94 si hay equipos y `frontTeamId === null` (2843). Histéresis `commitHysteresis` (2844-2847).

#### D-21 Fuga consolidada `peloton_concedes` (2856-2874): `km ≥ 33 % ∧ gap ≥ concedeMinGapSeconds 60 ∧ compromiso < breakawayCommitThreshold 0,25` durante `breakawayConsolidateKm` 2 km. Es crónica; no cambia conducta.

### 4.4 LOS ATAQUES (capa táctica), líneas 4415-4782

#### D-22 `attemptFrom(source, kind, target)` (4458-4727)

- **Puertas**: `kmToGo > tacticNoAttackKm 3`; `moves.length < tacticMaxMoves 3`; cooldown por grupo `tacticAttemptCooldownKm` 4,5 km (`lastAttemptKm`); `members ≥ 2`.
- **`MoveContext`**: kind, km, kmToGo, totalKm, groupSize, `fieldSize = racingNow`, `gcTerrain`, `onClimb`, `tension`, `hasGcContext`, `breakAppeal`, `...gcDefence(members{riderId, gcDeficitSeconds})` (quién defiende la general EN ESTE GRUPO y con cuánto colchón).
- `rollMoveAttempt(rngTactics, ctx)` → si no, nada. Si sí, `lastAttemptKm` se marca (aunque luego no nazca nada).
- **`MoveRider`** (`asMoveRider`, 4435-4455): riderId, role, mentality, `triggerKm` (orden del jugador), perfil, `finishScore(riderEff, finishType(terrain, members))`, energyFraction, matches, TAC, SPR, gcDeficitSeconds, `teamAttack = attackFactorOf(id)` (factor de la postura del equipo; 1 para rebelde/sin equipo), `pulling` (solo si el grupo es el pelotón: el que iba tirando no ataca), `gastado` (v42).
- `chooseInstigator(pool, ctx, rng)` → quién ataca (en `tactics.ts`).
- **Respuesta al ataque, por cada otro del grupo**: si le MARCA (`markTargetOf`) → `wheelProbability(tac, tacInstigador, marksAlso)`; si está en la rueda → `resolveMarking(markingMargin(perfil, perfilInstigador))`: `stuck` salta; `gives` suma `markLossS` y se queda; `dropped` se queda. Si no marca (o no estaba en la rueda) → `followProbability(r, instigator, ctx)` y `sustainsJump`.
- Si `party > members · tacticFollowFractionMax 0,5` → `attack_swarm` (no nace grupo, no cuesta cerillo).
- **Acelerón físico**: `vGrupo = targetSpeed(quedan, P75 de los que quedan, compromiso del origen, relayRotation(quedan))`; `vAtaque = targetSpeed(perfil + matchBonus 10 + tacticSurgeBonus 12, 1, misma rotación)`; `gap = jumpGapSeconds(vAtaque, vGrupo)`. Si `gap < tacticJumpMinGapSeconds 2` → no nace, pero **cada uno del party paga cerillo y `tacticAttackCost` 1,8**.
- Si nace: `coop = moveCooperation(party, meanRank de finishScore, tension, rngBreak)`; grupo `mov-N` con `tS = source.tS − gap`, `compromiso = puente ? tacticBridgeCommit 0,92 : coop`; cada uno paga cerillo (instigador `tacticAttackCost`, seguidores ×`tacticFollowCostFactor` 0,5) y enciende `matchBoostS`; `fugaDesdeKm` se fija.
- **Cuerda**: `allowed = source ≠ PELOTON ∨ pelotonAllows(party, ctx, rngTactics)`.
- Ve: EQUIPO solo como escalar `teamAttack`; GENERAL (gcDeficit propio y `gcDefence` del grupo, `hasGcContext`, `gcTerrain`); RIVALES en el grupo (finishScore relativo, marcaje); NO ve lo que hay delante/detrás salvo por el `kind` que le llega y por `tension`. **No ve** `frontTeamId`, ni `jefeEnApuros`, ni si su jefe está en el grupo (el instigador puede ser un gregario con su líder al lado: lo que lo modula es `role` y `teamAttack`).

#### D-23 Qué se intenta desde el pelotón (4730-4756)

- `closingNow` (igual que D-15) → no se ataca.
- `kind` = `ataque_final` si `(onClimb ∧ raceThisClimb) ∨ kmToGo ≤ lateAttackKm 12`; si no `fuga` si no hay fuga del día; si no `puente` si la cabeza está a `bridgeGapMinSeconds 30 ≤ gap ≤ bridgeGapMaxSeconds 150`; si no `contraataque`.
- Uno solo por bloque.

#### D-24 Desde cada movimiento (4759-4782): tamaño ≥ `tacticInsideAttackMinRiders` 3; puente al de delante si a tiro; si no, `ataque_grupo` solo si `kmToGo ≤ tacticInsideAttackKm 18` o `tension ≥ breakawayTensionThreshold 25`.

#### D-25 Regla 7, puente caducado (5434-5443): `km > bridgeUntilKm` (nace a `km + tacticBridgeKm 8`) → `compromiso = restCommit`, `bridge_failed`.

#### D-26 Corona de la fuga del día (5589-5634): `!prospered ∧ gapOverSource ≥ tacticBreakGapSeconds 45` → `prospered`. Es fuga del día si `!dayBreakFormed ∧ kind ≠ puente ∧ source === PELOTON ∧ km ≤ tacticBreakWindowFraction 0,55 · total ∧ !carriesGcLeader(gcDeficits, hasGcContext)`. Ve GENERAL (el maillot no corona: el pelotón sigue cerrando). Si no, `attack_sticks` (solo si `km − bornKm ≤ tacticStickWindowKm 20`).

#### D-27 Cooperación de la fuga se remide (4801-4809): cada 20 bloques, `objetivo = restCommit · (1 − coopContagionWeight 0,6 · interésPropio.media)`, con histéresis. Ve RIVALES en el grupo (D-07). NO ve equipo (ni `sittingOn` — esos salen ya del turno, no de la velocidad).

#### D-28 Tren del último km enciende cerillos (4838-4853): `kmToGo ≤ 3 ∧ admitsBunchFinish` → cada lanzador en `mainId` con su sprinter en `mainId`, con cerillos y sin impulso activo, gasta 1 cerillo + `tacticAttackCost`. Ve EQUIPO (vía `leadOutFor`), COMPAÑERO en el grupo.

#### D-29 Al cazado tras fuga larga se le acabó el día (5681-5691): `fuera ≥ tacticSpentMinKm 15` → `gastadoHastaKm = km + min(fuera · tacticSpentShare 0,5, tacticSpentMaxKm 80)`. Solo cuando lo caza el PELOTÓN (no si se descuelga de la fuga por deriva).

### 4.5 MARCAJE entre favoritos

#### D-30 `markedPerfil(m, block)` (3678-3691): un marcador deriva respecto a su HOMBRE, no al grupo — `stuck` → sube al perfil del objetivo; `gives` → `own + markDraftTolerance 4`; `dropped` → a lo suyo. Solo si el objetivo va en su mismo grupo. Ve RIVAL concreto (orden `marcador` + `targetRiderId`).

#### D-31 `comesOff` fase marcaje (3724-3742): al romperse la goma (subida por deriva, pavés/descenso por dado), si marca a alguien en su grupo: `stuck` → no se suelta, `driftS=0`; `gives` → `markLossS += secondsLost`, no se suelta; `dropped` → sigue al cerillo.

#### D-32 Respuesta al ataque del marcado: ver D-22 (`wheelProbability`, `marksAlso`).

- Lo que el marcaje NO ve: equipo del marcado, general; no hay marcaje «emergente» entre favoritos sin orden explícita.

### 4.6 CRIBA (`shatter`), líneas 3780-3919

#### D-33 Pájara (3786-3805): `energy ≤ 0` → `dropOut` inmediato, `rider_bonks` (narrado con throttle `bonkNarrateKmGap`).

#### D-34 `selectionFactor(block, lluvia)` (414-452): subida 1 (la deriva no se escala); pavés `dropPavesFactor·estrellas/dropPavesStarsReference · (1 + rainPavesScale·lluvia)`; descenso `dropDescentFactor · (1 + rainDescentScale·lluvia)` si `g ≤ dropDescentMaxGradient`, si no 0; llano 0 (el viento va por el corte, no por dado).

#### D-35 Descenso selecciona solo en su primer `descentSelectKm` 1 km (3829).

#### D-36 Subida = deriva + reserva (3853-3906): `pace = pacemakerP75(alive, block, paceFraction)` (en subida solo los `paceSetters`, D-38); `own = (markedPerfil ?? riderPerfil) + (reserveS > 0 ? dropDeficitTolerance 4 : 0)`; `drift = blockSeconds(own) − blockSeconds(pace)` con el MISMO turno. `drift ≤ 0` → recupera reserva y cierra `driftS`. `drift > 0 ∧ reserveS > 0` → gasta reserva (`reserveEnergyCost 1 · spend/65` de depósito), no cede. Si no → `driftS += drift`; al pasar `driftDropGapSeconds` 20 → `comesOff(…, allowMatch=false)` → `dropOut(m, group, driftS)`.

#### D-37 Pavés/descenso = dado (3907-3917): `deficit = pace − perfil > 4` → `λ = lambdaDropBase · factor · deficit / dropDeficitDenom`; `rollHazard(rngRough)` → `comesOff(…, allowMatch=true)` → `dropOut`.

#### D-38 `paceSetters` (489-493): en subida marcan el ritmo solo los `driftS ≤ 0` con `perfil + 4 ≥ pace`.

- Dónde se cribra (4077, 4176, 4225): pelotón, cada move, y **solo el shed que sea `mainId`**. Los demás grupetos no se criban (límite anotado, §8).
- Ve: perfiles, reserva, marcaje. NO ve equipo, general, compañeros (un gregario no «espera» al jefe en la criba; lo que existe es el drop-back de D-13 y el marcaje).

#### D-39 `comesOff` fase cerillo (3756-3771): `allowMatch ∧ matches > 0 ∧ mentality ≠ 'reservon' ∧ energy > matchCost 5` → gasta 1 cerillo, `matchBoostS = 120 s`, −5 de depósito, `driftS = 0`, no se suelta. **En subida no se quema aquí** (allowMatch=false): allí el equivalente es la reserva.

### 4.7 CERILLOS y DEPÓSITO

- `riderPerfil` (372-387): `+ matchBonus 10` mientras `matchBoostS > 0`, en todo terreno (v39, también llano).
- Caducidad (1750-1760): `matchBoostS −= blockSeconds(vActual del grupo)`.
- Gasto: D-39 (aguantar), D-22 (atacar/saltar, incluido el intento que no abre hueco), D-28 (lanzar). El `sprinter` y la mentalidad `reservon` solo se protegen en D-39 (no en D-22, donde decide `tactics.ts`).
- Depósito por bloque (3496-3522): `blockCost(block, compromisoReal, pulling, relayers.size, dx, arropo) · (1 + heatCostScale 0,08 · calor)`; `compromisoReal = max(compromiso, commitmentForSpeed(...))` solo con régimen de remate. **Sin descuento por llevar gregarios** (v38, cita del dueño).
- Reserva (3452-3468): recarga/gasto según `balance = (idle − mine)/idle` con `reserveSeconds 65 / reserveRecoverySeconds 400` por segundo de carretera; no recarga en el bloque en que la gastó (`spentReserve`).
- Banners: `bannerCost` por contendiente (6075-6078, 6129).
- Erosión y pájara: `riderEff` = `effNow(eff0, erosion(energy, energy0, RES), bonkPenalty(...))` (357-362).

### 4.8 RÉGIMEN DE REMATE y VELOCIDAD del grupo (dentro de `advance`, 3042-3180)

- `p75 = pacemakerP75(members, block, paceFraction)`; `trenes` = nº de sprinters en el grupo con algún lanzador en `relayers` (solo `isBunch ∧ kmToGo ≤ 3 ∧ admitsBunchFinish`); `régimen = sprintRegimeKmh(kmToGo, trenes, g)` o 0.
- `techoAbanico` (solo abanico abierto): `20 − (20 − 12)·vientoLateral`; `arropo` = `gutterShelter(members, cabenEnFila)` o `shelterProtected`.
- `advanceGroup(group, block, p75, min(alFrente, techoAbanico), {isFinal, sprintKmh: régimen})`.
- Ve: EQUIPO vía `leadOutFor`; el resto es física.

### 4.9 GRUPETOS, DESCUELGUE, REENGANCHES Y FUSIONES

#### D-40 `dropOut(m, group, delayS)` (3555-3607): cuenta `droppedSinceNotice`, `pulling=false`, `tS = group.tS + delayS`; si `!hurt` se une al `shed` (≠ origen) a ≤ `grupetoJoinGapSeconds` 12 s; si no, crea `shed-N` con `compromiso = droppedCommit(block, 1, frescura, tS − peloton.tS, enFila(pelotón), peloton.compromiso)`. **El herido no coge autobús** (v20). Ve: DETRÁS (otros shed). NO ve equipo.

#### D-41 Ritmo de cada grupeto por bloque (4957-5007): `able = droppedCommit(block, enFila(mem), frescura media, sg.tS − peloton.tS, enFila(pelotón), peloton.compromiso)`; `compromiso = able + (min(able, giveUpCommit 0,5) − able)·share_de_rendidos`. **Espera al que viene detrás** (`grupetoWait`): si `mem < grupetoWaitSize 4 ∧ kmToGo ≥ grupetoWaitMinKmToGo 10 ∧ hay un shed detrás a ≤ grupetoWaitSeconds 90` → `compromiso = min(…, grupetoWaitCommit 0,3)`. Ve DETRÁS; NO ve equipo ni general ni delante (siempre se mide contra `peloton`, el grupo con id fijo, no contra `mainId`).

#### D-42 Reenganche al pelotón (5118-5163): `caught = !onRough ∧ sg.tS ≤ peloton.tS ∧ peloton.tS − sg.tS ≤ rejoinGapSeconds 22`; o `!onRough ∧ cerrando (sg.vActual > peloton.vActual) ∧ gapSeconds ≤ 22 · shutFor(size)` con `shutFor` = 1 si el grupeto ≥ `chaseBackBusFactor 3 × pelotón`, si no `paceShut = max(chaseBackShutFloor 0,15, min(1, (1 − compromiso)/(1 − chaseBackShutTempo 0,55)))`. Se mide contra `peloton` (id fijo).

#### D-43 Fusión entre grupetos (5164-5173): `|Δt| ≤ mergeGap` (`grupetoJoinGapSeconds` 12 en `onRough`, `regroupGapSeconds` 22 si no); nunca con un grupo todo de heridos.

#### D-44 Fusión por alcance moves/shed («no se atraviesa», 5207-5356): por el orden de `relojAntes`, el de detrás que ahora tiene `tS ≤` al de delante se funde en el de delante (`tS = min`), salvo `onRough`, donde se apunta un rebase pendiente (`rebasesPendientes`) que se confirma si abre ≥ `captureGapSeconds` 5 en ≤ `overtakeConfirmKm` 3 km → `group_overtake`. El pelotón no entra aquí.

#### D-45 Fusiones entre moves (5452-5569): `back.tS − front.tS ≤ 5` → back entra en front; hereda `dayBreak`, media de tensión, máximo por corredor del `chaseLedger`; `attack_reeled` si el padre reabsorbe un ataque no prosperado; `bridge_made`/`move_merge`.

#### D-46 Captura por el pelotón (5663-5721): `peloton.tS − m.tS ≤ 5` → todos a `PELOTON`, `peloton.tS = min(...)`, D-29, `move_caught`/`attack_reeled`, `attributeChase`.

#### D-47 Fuga del día cazada (5728-5785): cuando ninguno de `dayBreakEver` tiene reloj `< peloton.tS`.

### 4.10 ABANICOS (viento lateral), líneas 4088-4175 y varios

#### D-48 `corte(group, dentro)`: solo `vientoLateral > 0 ∧ llano ∧ !isFinal`; `dentro > cabenEnFila`; dado `rollHazard(rngViento, windBreakPerKm 0,015 · vientoLateral)`. **Colocación** en puntos de perfil: `riderPerfil + windPlacementTeam 25 (si teamOf === frontTeamId) + windPlacementLeader 12 (si tiene gregario propio en el grupo) + windPlacementLuck 10 · U(−1,1)`. Se parte en hasta `windEchelonMaxGroups` 3 filas de `cabenEnFila`, cada fila `f · windEchelonGapSeconds 15` por detrás (vía `dropOut`); `abanicoAbierto = true`; `echelon_split`.

- Ve: EQUIPO (`frontTeamId`, gregarios en el grupo). NO ve general ni rivales.
- Efectos colaterales de `abanicoAbierto` (D-02 fila entera; `roughFrac = 1`; `techoAbanico`; `gutterShelter`; suelo de compromiso entero D-19; `onRough` = no hay reenganche). El **límite**: el abanico no se cierra nunca (el viento sopla todo el día).

### 4.11 EL DESCENSO

- Selección: D-34/D-35 (dado, solo primer km, escalado por lluvia). El terreno NO es `onRough`: sí hay reenganche y fusión en descenso.
- Caídas: `rollCrash(rngCrash, block, isFinal, eff, erosión, fragility, lluvia)` (5381) + montón `crashPile` con `crashPileHurtChance` 0,06 (5396-5417). Pelotón, moves y shed.
- Nada táctico se decide en el descenso (no hay «bajar a tope para abrir hueco» ni marcaje específico).

### 4.12 EL MAILLOT QUE NO RELEVA (y no se sacrifica)

- D-01: `esLaCartaDelEquipo` (rol `lider`/`sprinter` o arropado) anula el empuje.
- D-02: `gcRank === 1` → `relayRaceLeaderPenalty` 3 (queda el último; solo tira por el suelo). **Solo el 1.º** («el segundo, el tercero y el cuarto sí tienen que dar la cara»).
- D-10: `leaderUpTheRoad` cambia la postura del equipo del maillot (en `teamPlan.ts`).
- D-13: `esElMaillot` no baja a por nadie.
- D-26: `carriesGcLeader` impide la corona de fuga del día.
- `pelotonAllows` (tactics.ts) le niega la cuerda.

### 4.13 ADMINISTRAR ESFUERZO, COLAPSO, ABANDONO, CORTE

#### D-49 `administerEffort` (regla 8, 3927-4000): solo en los últimos `giveUpKm` 25 km; freno colectivo `giveUpGroupMaxFraction` 0,33 de la cohorte por grupo; `giveUpLambda({role, mentality, energyFraction, inFrontGroup}, kmToGo)`; `rollHazard(rngTactics)`; guarda del fuera de control: `slower · remainingS ≤ giveUpMaxLossFraction 0,05 · group.tS` con `slower` de `predictedShedPace` (régimen resignado `shedResignGapSeconds` 300). → `gaveUp`, `dropOut`, `rider_sits_up`. Ve: rol/mentalidad/depósito; NO ve equipo (un gregario puede sentarse aunque su jefe le necesite) ni general.

#### D-50 `collapseCheck` (4011-4043): `bonkKm`, `shouldCollapse({bonkKm, kmToGo, inFrontGroup, lostFraction, hurt, groupSize})`, `rollHazard(rngAbandon, collapseLambda)`, tope `abandonBudget`. → `rider_abandons` (`caida` | `colapso`).

#### D-51 `applyStageTimeCut` (5970-6033): contra el ganador, por GRUPOS de tiempo, `timeCutFraction(elevationGainPerKm)`, presupuesto restante del 4 %; readmitidos pierden `sprintPts`.

### 4.14 META (`finishStage`, 6183-6470)

- Por grupo de llegada: `type = finishType(terrain, members)`; `meanWork`; **tren que ha trabajado**: `pullWindow ≥ leadOutMinWork 0,4 · humor`; lanzamiento (`sprintHoldMetres`, `launchSd*`, `launchStandoffM`, `sprintContenders` 10); `score = finishScore · ruido · finishRoleWeight[role] · (1 − peaje trabajo, tope `finishWorkMax` 0,15) · (1 + leadOutBoostPerHelper 0,05 · min(tren, 2)) · launchEffect · colocación (`placementSd`)`; tiempo del grupo + `lossOf = markLossS + driftS`.
- Ve: EQUIPO vía `leadOutFor` y rol; NO ve general ni «dejar ganar al compañero».

---

## 5. Tabla de visibilidad: qué ve cada decisión

| Decisión                | Equipo                  | General                  | Compañeros en grupo | Rivales                      | Delante                | Detrás           |
| ----------------------- | ----------------------- | ------------------------ | ------------------- | ---------------------------- | ---------------------- | ---------------- |
| D-01 relayDuty          | empuje + arropo         | no                       | arropo              | no                           | no                     | no               |
| D-02 relayTurn          | dueño frente, arropo    | `gcRank===1`             | sí                  | mejor remate (`sinOpciones`) | vía sittingOn          | vía jefeEnApuros |
| D-03 elTren             | lanzaPara               | no                       | sprinter presente   | no                           | no                     | no               |
| D-05 jefeEnApuros       | leaderId, purposes      | purposes                 | —                   | no                           | no                     | reloj del jefe   |
| D-06 tieneHombreDelante | teamOf                  | no                       | no                  | no                           | mejor reloj del equipo | no               |
| D-07 interésPropio      | no                      | no                       | —                   | mejor del grupo              | no                     | no               |
| D-10 teamStance         | sí                      | déficit de la cabeza     | menInPeloton        | no                           | inMove                 | no               |
| D-11 frontTeamId        | sí                      | vía stance               | sí                  | otros equipos (claim)        | vía stance             | no               |
| D-12 fuerza de caza     | equipos en fuga del día | no                       | sí                  | trenes                       | fuga del día           | no               |
| D-13 drop-back          | sí                      | maillot, purposes        | sí                  | quality de otros             | cabeza de carrera      | jefe en shed     |
| D-16 caza sprinters     | fuerza (D-12)           | no                       | no                  | no                           | gap                    | no               |
| D-17 gcLeash            | no                      | peor déficit delante     | no                  | no                           | gap                    | no               |
| D-22 attemptFrom        | escalar `teamAttack`    | sí (`gcDefence`, propio) | solo si marca       | finishScore relativo         | no                     | no               |
| D-26 corona             | no                      | carriesGcLeader          | no                  | no                           | —                      | —                |
| D-27 coop fuga          | no                      | no                       | —                   | mejor del grupo              | no                     | no               |
| D-28 tren cerillos      | leadOutFor              | no                       | sprinter            | no                           | no                     | no               |
| D-30/31 marcaje         | no                      | no                       | objetivo            | objetivo                     | no                     | no               |
| D-36 criba subida       | no                      | no                       | no                  | no                           | no                     | no               |
| D-40 dropOut            | no                      | no                       | no                  | no                           | no                     | shed cercano     |
| D-41 ritmo grupeto      | no                      | no                       | rendidos            | no                           | pelotón (id fijo)      | shed detrás      |
| D-42 reenganche         | no                      | no                       | no                  | no                           | pelotón (id fijo)      | —                |
| D-48 corte abanico      | frontTeamId, gregarios  | no                       | sí                  | no                           | no                     | no               |
| D-49 dejarse ir         | no                      | no                       | no                  | no                           | inFront                | no               |
| D-50 colapso            | no                      | no                       | groupSize           | no                           | inFront                | lostFraction     |
| Meta                    | leadOutFor, rol         | no                       | tren                | mismo grupo                  | —                      | —                |

Lecturas transversales que se desprenden del mapa (hechos, no juicios):

- Solo tres sitios leen la GENERAL de un rival concreto: `gcLeash`/`frontThreatDeficit` (peor déficit del movimiento de cabeza), `gcDefence` (dentro del grupo que intenta) y `carriesGcLeader`. El resto usa `hasGcContext`, `gcRank===1` o `gcDeficitSeconds ≤ 0` del propio corredor.
- El único mecanismo que lleva a un corredor a «esperar» o «volver atrás» por un compañero es D-13 (y solo hacia un `shed`, no hacia un `mov` retrasado). Los demás mecanismos de equipo solo sacan del turno (D-04/05/06).
- La táctica de ataque (D-22) no ve `frontTeamId`, `jefeEnApuros` ni si el jefe va en el mismo grupo; el equipo entra como un escalar (`teamAttack`).
- `relayDuty` no ve el terreno ni cuánto queda de etapa (eso lo llevan el listón por `paceFraction`, `lanzando` y `sinOpciones`).
- Los grupetos y el reenganche se miden siempre contra el `Group` con id `peloton`, aunque el título `mainId` lo tenga un `shed`.

---

## 6. Constantes de STAGE por tema (valores actuales)

- Relevos: `relayDutyByRole`, `relayFreshnessWeight` 0,5, `relayFreshnessCap` 0,45, `relayProtectedPenalty` 1,2, `relaySittingOnPenalty` 2, `teamRelayDriveWeight` 1,3, `relayEffortWeight` 0,5, `relayJitterWeight` 0,05, `relayNoChanceWeight` 1, `relayRaceLeaderPenalty` 3, `relayLeadOutBoost` 1,5, `relayRotationMax` 20, `relayDutyThreshold` 1,5, `relayDutyThresholdLoose` 0, `relayDutyThresholdNoTeams` 0,5, `relayDutyPaceRelief` 0,6, `relayMinPullers` 4, `relayMinPer` 45, `sprintTrainKm` 3.
- Plan de equipo: `teamFrontHandoverSpent` 0,35, `teamFrontHandoverEdge` 0,2, `teamChaseTiredForce` 0,5, `noOwnerCommitFactor` 0,94, `helpBack*` (MinKmToGo 5, MaxGapSeconds 300, GcKeepInBunch 1, StageHelpers 2, StageGapSeconds 60, MishapKm 5, MinFreshness 0,35, StageFavouriteTeams 3), `regroupGapSeconds` 22.
- Controlador: `decisionEveryBlocks` 10, `pelotonTempoCommit` 0,55, `climbRaceCommit` 0,85, `climbTempoCommit` 0,7, `climbRaceKmToGo` 30, `finalDriveKm` 15, `finalDriveCommit` 0,85, `tacticControlCommit` 0,72, `chaseHoldCommit` 0,62, `chaseGain` 0,016, `chaseMaxLeashSeconds` 300, `chaseCatchTargetKm` 12, `chaseNeverConcedeSeconds` 10, `chaseFeasibleSecondsPerKm` 3, `chaseMinForce` 0,12, `chaseWeak*`, `chaseAnnounceFrac` 0,4, `gcControlLeash` 700, `gcThreatFraction` 0,6, `pelotonMoodCentre` 0,9, `pelotonMoodSpread` 0,14, `pacing*` (75/1/0,7), `climbEaseDemand` 95, `windRaceCommit` 0,82, `pavesRaceCommit` 0,8, `pavesApproachKm` 2, `commitHysteresis`, `concede*`, `breakawayCommitThreshold` 0,25, `breakawayConsolidateKm` 2.
- Táctica: `tacticNoAttackKm` 3, `tacticMaxMoves` 3, `tacticAttemptCooldownKm` 4,5, `tacticFollowFractionMax` 0,5, `tacticSurgeBonus` 12, `tacticJumpMinGapSeconds` 2, `tacticAttackCost` 1,8, `tacticFollowCostFactor` 0,5, `tacticBridgeCommit` 0,92, `tacticBridgeKm` 8, `bridgeGapMinSeconds` 30, `bridgeGapMaxSeconds` 150, `lateAttackKm` 12, `tacticInsideAttackKm` 18, `tacticInsideAttackMinRiders` 3, `breakawayTensionPerKm` 0,4, `breakawayTensionThreshold` 25, `tacticBreakGapSeconds` 45, `tacticBreakWindowFraction` 0,55, `tacticStickWindowKm` 20, `coopReviewBlocks` 20, `coopContagionWeight` 0,6, `tacticSpentMinKm` 15, `tacticSpentShare` 0,5, `tacticSpentMaxKm` 80, `gcTerrainClimbShare` 0,05, `breakAppeal*`.
- Cerillos/depósito/reserva: `matchCost` 5, `matchBonus` 10, `matchBoostSeconds` 120, `reserveSeconds` 65, `reserveRecoverySeconds` 400, `reserveEnergyCost` 1, `dropDeficitTolerance` 4, `driftDropGapSeconds` 20, `heatCostScale` 0,08, `bannerCost`, `frontWorkIdleCommit` 0,5, `pullWindowDecayPerKm` 0,87.
- Criba/grupetos: `climbPaceFraction` 0,12, `climbTempoFraction` 0,5, `pelotonPaceFraction` 0,25, `pavesPaceFraction`, `descentSelectKm` 1, `lambdaDropBase`, `dropPaves*`, `dropDescent*`, `rain*`, `grupetoJoinGapSeconds` 12, `rejoinGapSeconds` 22, `captureGapSeconds` 5, `chaseBackBusFactor` 3, `chaseBackShutFloor` 0,15, `chaseBackShutTempo` 0,55, `grupetoWaitSize` 4, `grupetoWaitSeconds` 90, `grupetoWaitCommit` 0,3, `grupetoWaitMinKmToGo` 10, `shedResignGapSeconds` 300, `giveUpKm` 25, `giveUpCommit` 0,5, `giveUpMaxLossFraction` 0,05, `giveUpGroupMaxFraction` 0,33, `mainGroupTakeoverRatio` 1,25, `overtakeConfirmKm` 3, `overtakeNoticeKmGap` 10.
- Viento: `windDayShape` 2,2, `windMin` 0,87, `windEchelonMax` 150, `windEchelonRiders` 12, `windBreakPerKm` 0,015, `windEchelonMaxGroups` 3, `windEchelonGapSeconds` 15, `windPlacementTeam` 25, `windPlacementLeader` 12, `windPlacementLuck` 10.
- Abandonos: `abandonStageCapFraction` 0,04, `crashPileHurtChance` 0,06.
- Meta: `leadOutMinWork` 0,4, `leadOutBoostPerHelper` 0,05, `leadOutMaxHelpers` 2, `sprintContenders` 10, `finishRoleWeight`, `finishWorkWeight` 0,6, `finishWorkMax` 0,15, `bunchSprintMinRiders` 8, `launch*`.

---

## 7. Órdenes del jugador que el motor LEE en este fichero

`orders.role` (siete roles), `orders.mentality` (p. ej. `reservon` protege cerillos en D-39; el resto lo consume `tactics.ts`), `orders.targetRiderId` (gregario/lanzador/marcador), `orders.effort` (`ahorrar`/`normal`/`a_tope`, solo en D-01), `orders.triggerKm` (pasa a `MoveRider`), `orders.contestSprints/contestClimbs` (banners). `teamId`, `gcDeficitSeconds`, `gcRank`, `fragility`, `matches`, `energy`, `eff0`.

---

## 8. DEUDA RECONOCIDA: límites anotados en los comentarios

1. **Pinchazo y avería mecánica no existen** (RiderSim.mishapKm, 280-288; drop-back, 2080-2082): «quedan anotados en docs/balance.md: cuando existan, marcan aquí y esta regla los ve sola».
2. **La lluvia no va y viene durante la etapa** (1037-1039): «que la lluvia vaya y venga durante la etapa queda anotado en §20».
3. **Se probó que el grupeto de rescate rodara al ritmo del jefe y NO se ha hecho** (3022-3040): con el tope el jefe volvía el 66 % contra el 70 % del que se quedaba solo; sin tope 81 % contra 63 %. Se retira además el segundo motivo, que describía un defecto ya corregido (los grupetos no se cribaban).
4. **Un grupeto que ya no es la carrera no pierde a nadie en el puerto** (4220-4223): «LO QUE ESTO NO ARREGLA, dicho en vez de disimulado: un grupeto que ya NO es la carrera —el que va tercero a diez minutos— sigue sin perder a nadie en el puerto. En carretera sí los pierde. Arreglarlo pide que la cola de las reinas pueda pasar del 14 %, que es una banda con ancla en §VI.3 y no se mueve sin decisión del dueño.» Se probó cribarlos todos con dos fracciones y el banco dijo que no (37 grupos en meta / cola 14,33 %).
5. **En un puerto dos grupos pueden cruzarse sin juntarse** (5298-5300): «Queda ANOTADO como límite, no resuelto… Arreglarlo pide que la criba actúe dentro del mismo bloque en que se fusiona». La v58 lo midió (22 cruces, 19 en puerto) y decidió NO fusionar y sí narrar (`group_overtake`): la mayoría eran adelantamientos reales.
6. **Fusionar por contacto en subida se probó y la medida lo refutó** (5285-5291): la fuga pasaba a ganar el 54,2 % de las reinas y la etapa 9 dejaba de seleccionar.
7. **La criba lejana no puede saber si se deshace 50 km después** (4371-4373): «eso es futuro, y el motor emite en carretera. Lo resuelve la crónica».
8. **El montón de la caída no tiene posiciones dentro del grupo** (5390-5391): «una TIRADA CONTIGUA de la lista, que es lo más parecido a “los que iban a su alrededor” que puede decir un motor sin posiciones dentro del grupo».
9. **El sprint en sí no se simula** (4834-4836): «los últimos doscientos metros… no son un bloque de carretera sino un remate, y eso lo resuelve `finishScore`».
10. **El llano no selecciona por dado ni con viento: se probó al revés y daba carreras incoherentes** (438-450); **el abanico como dado por corredor se probó y se descartó** (4079-4082).
11. **Primer intento con `hurt` en el drop-back hacía la regla imposible** (2086-2091): 0 avisos en 120 etapas; se cambió a `mishapKm`.
12. **La regla «con los suyos al lado el jefe NO tira» se caía al 17,4 % los días de viento** (789-797): en abanico es al revés (los suyos relevan, él va en la rueda).
13. **`noChanceToWin` aplicado al pelotón entero apagaba los trenes** (2968-2974, 3062-3067): la frontera es la fracción de carrera que queda en el grupo, no «pelotón sí/no».
14. **Sin umbral de 22 s en `jefeEnApuros` la huella de la llana se iba 387 s** (2912-2917).
15. **El humor aplicado al puerto decisivo hundía la reina** (2774-2779); **la dosificación aplicada a las cuestas hundía las reinas reales** (2792-2799).
16. **Prohibir el ataque en el km 0 desplazaba `rngTactics` de todas las etapas** (4544-4551): se quita la frase, no el intento.
17. **Bajar el presupuesto de equipo para forzar el relevo de frente era la palanca equivocada** (1932-1936): apagaba el empuje y la fuga ganaba el 38 % de las llanas.
18. **Cobrar dos evaluaciones más de la ley de velocidad por grupo y bloque costó 1.950 → 2.665 s de batería** (3216-3222, 3507-3512): por eso `compromisoReal` solo se pregunta con régimen y el reparto rodar/relevo solo para el que tira.
19. **`pickLeader` (teamPlan.ts) elige al jefe por rol y final, nunca por la general** (2157-2161): por eso `esElMaillot` se dice aquí «de una vez».
20. **Comentario del corte en crono que declaraba un defecto ya inexistente** (5921-5931): retirado en v40; recordatorio explícito de que «un comentario que declara un defecto que ya no existe es peor que no tener comentario».
21. **Retirados**: `climbTempoSelection` (419-422), `shedCommit` (4944-4948), `chaseBackSecondsPerKm` y el tope fantasma (5019-5024, 5073-5079), `domestiqueProtectPerHelper` (3470-3482), `pullOffFrontShare` (567-570), el subflujo `hazard` de la subida (943-951), `hurt` como disparador del drop-back.

---

## 9. CITAS DEL DUEÑO sobre conducta en carrera (textuales, con el sitio donde viven)

Relevos y equipo:

- «ok, pelotón unido… ok, equipo del líder tira del pelotón… PEEEERO el líder con el maillot amarillo está también tirando???» (relayDuty, 513-514).
- «otra vez el maillot amarillo tirando… bueno, no es el pelotón, es un grupo de 20 del que solo tiran 10» (relayTurn, 653-654). «ellos quieren luchar por la carrera… ¡y curiosamente no veo que lo hagan!» (665-666).
- «yo creo que en general quizás deberíamos aplicar un máximo de unos 20 ciclistas; más de 20 pasando a los relevos es irreal… pero eso aplica tanto a una fuga de 25 en la que ya no hay entendimiento entre todos como al propio pelotón: si hay 4 equipos colaborando, pues 5 de cada uno» (683-686).
- «yo creo que tendríamos que decir que los que estén por encima de un umbral X tiran; y si está por encima del máximo, seleccionar al top de esos; y si sale 0, escoger el mínimo que según el tamaño del grupo podría ser 1-4» (695-697).
- «si el frente no tiene dueño único, debería haber 1, 2 o 3 equipos que tiren, pero con MENOR INTENSIDAD» (2836-2838).
- «cada vez que alguien tire del pelotón, tienes que mencionar por qué; está trabajando para alguien, ¿no? Si no, no debería desgastarse» (pullReason, 854-856; 1147-1149). «no tiene sentido que si 3 equipos colaboraron, solo 1 de cada aparezca» (1391). «no es solo saber qué equipo(s) participan de la persecución… también es saber POR QUÉ» (2611-2612).
- «busca de algún modo dejar una evidencia que explique por qué o para qué tira cada ciclista de un grupo» (316-317, 3390-3392). «¿para qué carajos tiran si en ese grupo donde están no está su líder? ¿Para llevarle 138 ciclistas más?» (1875-1876, 3390). «ahora dice por qué tiran, pero dice algo así como _his team's card for this finish_… pero no dice quién es, wey» (3241-3243). «ahora siguen tirando los compañeros del líder, bien hecho… pero ahora dice _his job in the team_, lo cual es como no decir nada» (3289-3291). «vi un grupo que tira para las opciones de su líder Alejandro, pero Alejandro no estaba en ese grupo» (3336-3337, 5842-5843). «esto no es una escapada, es el grupo del maillot amarillo intentando alcanzar al segundo» (3323-3324). «hay un grupo atrás que dice que está _just riding_, pero va más rápido que el grupo de cabeza. Eso no tiene sentido» (3265-3267). «en el grupo de cabeza hay unos _just riding — this group is chasing nothing_… ¡pero si es el grupo de cabeza donde está el líder!» (1710-1712).
- «hay un equipo que tiene a 1 ciclista tirando del pelotón pero tiene a 1 ciclista tirando de la fuga… eso es sabotearse a su trabajo»; «el escapado de ese equipo no debería entrar a los relevos… así además llega más fresco al final» (3078-3081).
- «si va en cabeza de carrera lo normal es que no se deje caer, pero que tampoco tire de la fuga (salvo que vaya solo, claro está)» (2883-2884).
- «mucho más grave ahora… el líder se ha quedado atrás y entonces delante están tirando sus 2 compañeros. ¿No se han enterado de que su líder se ha quedado atrás?» (2897-2899).
- «un líder arropado por gregarios dentro del pelotón gasta LO MISMO que uno que va a rueda en el pelotón cómodamente sin entrar a los relevos» (3473-3474).
- «en un grupo de seis a ocho kilómetros de meta relevan los seis, incluido el que sabe que pierde el sprint… y si en la fuga van con un súper escalador y tú eres mal escalador, lo normal es que no cooperes» (3045-3047).
- «lo de quién tira de cada grupo habría que irlo midiendo a menudo… quizás no cada 100 metros, pero quizás cada km. Y ojo, porque si hay 1 wey que no pasa a cooperar en la escapada, los otros quizás quieran desgastarse menos y entonces tirar menos fuerte para no desgastarse para que ese wey que va ahí sin gastar energía se la lleve» (4787-4790).
- «All-in: empty the tank today» (orden de esfuerzo del jugador, 544).

Drop-back y rescate del jefe:

- «si es el favorito para una gran vuelta o carrera por etapas, puede justificar descolgar a todo el equipo menos 1; si es una carrera de 1 día no, salvo que la diferencia sea pequeña» (2039-2041). «en ese caso que el líder no pase a tirar, él se reserva» (2049-2050).
- «por la etapa yo creo que nadie debería bajarse… salvo que sea un pinchazo/caída y la distancia sea pequeña, y sea gran favorito para ganar la etapa, según el tipo de etapa» (2074-2076; también 284-285).
- «alguien de la fuga no lo mandes para atrás… alguien del pelotón sí. Salvo que sea con carrera rota… y uno que va en grupo 2 podría esperar a uno del grupo 3 y ayudarlo» (2103-2105). «si va en un grupo de perseguidores y su jefe está en problemas… pues ahí sí, que se descuelgue» (2113-2114).
- «km 55, 107 Isaac Clark drops back out of the bunch to pace 105 Frank Fischer 103s back. ¡O sea! No es que se quedara por falta de energía, sino que se quedó a posta para ayudar a un compañero que estaba a 8 minutos en la general» (2150-2153).
- «si un ciclista tiene a su líder atrás, es normal que se deje caer para ayudarle… pero eso aplica a los bots y a los humanos que en sus instrucciones hayan indicado que ayudan a su líder X. Si yo como humano digo que voy por libre, entonces no debería ocurrir eso» (2176-2179).
- «el líder se queda atrás… ¿y nadie de su equipo tira para ayudarle?» (2233-2234).

Caza, humor, fugas:

- «también la probabilidad de que el pelotón eche la hueva y vaya lento… muchas veces el pelotón debería tener flojera y dejar hacer» (968-969). «probablemente dándole más hueva al pelotón, es decir, que en general no estén tan motivados en gastar fuerzas tirando» (983-984). «quizás entonces en una etapa reina falta que los campeones se esfuercen un poquito más» (2775-2776).
- «puede ocurrir y ocurre a veces, que el pelotón se despista, deja hacer a una escapada —especialmente si los equipos de los sprinters tienen a alguien metido en la fuga y entonces no van a tirar— y la escapada se va a 15 o 20 minutos» (2000-2003).
- «tal vez en una clásica superlarga tengan que dosificar esfuerzos mejor y entonces no salir tan a muerte para no saturarse» (1475-1476).
- «el wey que iba en la primera fuga solo y que debería haberse desgastado mucho, le pillaron… y más adelante vuelve a escaparse como si nada»; «Diogo Teixeira iba cabeza de carrera en solitario como 2 veces después de que el pelotón le atrapó y ya va ahora por una tercera vez» (5668-5670).
- «Si su velocidad de ataque es menor que la del que va tirando del grupo, tampoco se crea ningún boquete» (4616-4617).

Cerillos, sprint, tren:

- «el cerillo tal vez en vez de durar un número de metros debería durar un número de segundos, ¿no? O sea, en llano que dure 1,5 km o incluso más me parece razonable; ahora bien, en una de montaña, en vez de 1,5 km quizás deberían ser 0,5 (claro, dependerá de la pendiente, que a su vez marca la velocidad)» (1737-1741).
- «cuando llegue un pelotón al sprint me gustaría que el último km se gestionase un poco diferente: un sprinter que tenga a sus lanzadores tirando del pelotón le ayudan a colocarse; ojo, aquí van súper a muerte, velocidades realmente de vértigo, y eso incrementa las probabilidades de que gane ese sprinter. Puede haber varios equipos con sus lanzadores al mismo tiempo, aunque no necesariamente con el mismo éxito» (4814-4818; 3135-3137; 6321-6323).
- «obviamente es muy diferente ir en cabeza a 70 km/h que a 30 km/h» (3488).
- «un sprint sin lanzadores, por ejemplo en una fuga, donde puede haber un momento en el que todos se miran y de repente uno se lanza» (6228-6229).
- «llegó un grupo de 50 personas… eso es un sprint» (6404).

Criba, grupetos, reenganches, cruces:

- «así el pelotón no se destroza en cada cota y las diferencias las marca el último puerto, como en la realidad» (404-406). «de 81 a 3» (1773). «no menciones uno a uno todos los ciclistas que se van descolgando» (3796-3797). «hay 5 ciclistas, ¡podrías haber dicho cuáles!» (2383).
- «es una llegada en alto con un puerto brutal al final… y el que llega en el puesto 150 solo perdió 26 segundos» (4189-4190).
- «¿qué chingados pasó entre el km 191 y el 192?» (descenso, 3811).
- «es muy fácil reengancharse»; «en una bajada es normal que algunos se reenganchen, pero no todos, wey» (5126-5127).
- «¿qué me dices de este tercer grupo que va a 94 km/h?»; «los que pierden en montaña cinco minutos luego se reintegran demasiado fácil» (5141-5143).
- «hay 10 escapados que sacan 59 segundos a un grupo de 45, y 56 segundos más tarde un grupo de 90… y en el km 192 los tres grupos se han juntado. WTF» (5104-5106).
- «entre el km 108 y el 109 iban 3 en cabeza y un grupo de 16 detrás… y de repente es al revés, justo esos 16 van por delante y los otros 3 por detrás. Eso es MUY inverosímil» (5182-5184).
- «normalmente cuando se cae alguien en el pelotón casi siempre se caen varios… normalmente VARIOS, con lo cual podrían tirar» (5385-5386).

Clima:

- «lluvia sobre adoquín… es lo que justifica de verdad las caídas y los abandonos» (1038). «el clima debería depender del país y del GD» (1043).
