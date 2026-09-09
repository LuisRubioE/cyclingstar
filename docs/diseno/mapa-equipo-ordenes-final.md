# Mapa: plan de equipo, órdenes del jugador/bot y modelo de final

Parcela leída entera: `packages/engine/src/stage/teamPlan.ts` (566 l.), `world/autoOrders.ts` (277), `stage/types.ts` (429), `stage/finish.ts` (344), `stage/startOrder.ts` (156), `world/callups.ts` (171). Además, por Grep y lectura por tramos: `stage/simulate.ts` (6.539 l.), `stage/tactics.ts` (855), `stage/chase.ts` (129), `constants.ts` y los llamadores en `packages/db/src/{stageRun,calendarRun,callups}.ts`.

Convención: «l.» = línea aproximada. Las citas entre comillas angulares son textuales del código (la mayoría son frases del dueño recogidas en comentarios).

---

## 0. Cómo se encadena todo (visión de conjunto)

```
packages/db/callups.ts + calendarRun.ts
   └─ selectSquad()  → quién va a la carrera (escuadra de 7-8)            [callups.ts]
packages/db/stageRun.ts (cada etapa)
   ├─ autoStageOrders()  → StageOrders para quien NO trae plan del jugador [autoOrders.ts]
   ├─ órdenes del jugador (tabla stage_orders) → StageOrders (mandan siempre)
   └─ simulateStage()                                                     [simulate.ts]
        ├─ deriveFinishTerrain + finishType(campo entero) → stageFinishType, bunchFinish
        ├─ buildTeamPlans()  → TeamPlan por equipo (una vez por etapa)     [teamPlan.ts]
        ├─ cada decisión del pelotón:
        │     teamStance(plan, TeamSituation) → TeamStance
        │     frontClaim → quién LLEVA EL FRENTE (uno solo, con histéresis)
        │     teamDrive(stance, gastado, esElDueño) → ESCALAR en [-1,1] por equipo
        │     driveOfRider(id) → ese escalar (0 si rebelde o sin equipo)
        │     attackFactorOf(id) → teamAttackFactor(stance) (1 si rebelde/sin equipo)
        ├─ relayTurn/relayDuty → quién tira (rol + frescura + drive + effort + ...)
        ├─ capa táctica (tactics.ts) → ataques (rol × mentalidad × triggerKm × teamAttack ...)
        └─ finishStage() → orden dentro de cada grupo de meta               [finish.ts + simulate.ts]
```

---

## 1. `stage/types.ts`: el contrato de las órdenes

### 1.1 `StageRole` (l. 67)

Valores: `'lider' | 'sprinter' | 'lanzador' | 'gregario' | 'cazaetapas' | 'marcador' | 'libre'`.

### 1.2 `Mentality` (l. 70)

`'reservon' | 'oportunista' | 'combativo' | 'supercombativo'`.

### 1.3 `Effort` (l. 73)

`'ahorrar' | 'normal' | 'a_tope'`. Ausente = `normal`. Comentario (v58): la pantalla lo ofrecía («All-in: empty the tank today») y la base lo guardaba «pero **no llegaba al motor**… Era literalmente un botón desconectado, y es la mitad de la respuesta a la queja del dueño: “el resultado es casi lo mismo ponga lo que ponga ahí”».

### 1.4 `StageOrders` (l. 75-99)

| Campo            | Tipo           | Nota                                                                                                         |
| ---------------- | -------------- | ------------------------------------------------------------------------------------------------------------ |
| `role`           | `StageRole`    | obligatorio                                                                                                  |
| `targetRiderId?` | string         | «Objetivo para roles que lo requieren (lanzador, gregario, marcador)»                                        |
| `mentality`      | `Mentality`    | obligatorio                                                                                                  |
| `effort?`        | `Effort`       | v58                                                                                                          |
| `triggerKm?`     | number \| null | v58. Promesa de la pantalla: «Launch a move at this distance. Leave blank to let your mentality decide when» |
| `contestSprints` | boolean        | obligatorio                                                                                                  |
| `contestClimbs`  | boolean        | obligatorio                                                                                                  |

### 1.5 `StageRider` (l. 102-164): lo que rodea a las órdenes

- `eff0`, `energy`, `matches`.
- `tsb`: **«PENDIENTE DE IMPLEMENTAR (SPEC 6.6): campo definido pero sin efecto en la simulación de etapa»** (l. 111).
- `gcDeficitSeconds` (l. 124): desde v9 el motor lo LEE (cuerda de la general, ataques en el final en alto). 0 solo cuenta si hay diferencias en el campo.
- `gcRank?` (l. 140): puesto en la general resuelto por `packages/db/src/gcSort.ts`; el motor «no lo reimplementa». Nulo = no hay general.
- `bib?` (l. 150): dorsal; solo se usa en la rampa de la crono.
- `teamId?` (l. 163): «**Nulo o ausente = agente libre**, y eso es una decisión de diseño… el dueño lo dijo explícitamente (“un ciclista sin equipo, pues corre de forma individual”)».

### 1.6 Tipos de observación (no deciden nada)

`PullMotive` (l. 253-277): `solo | abanico | tren | fuga | persecucion | grupeto | equipo_etapa | equipo_maillot | equipo_general | rol`. Nace de: «¿para qué carajos tiran si en ese grupo donde están no está su líder? ¿Para llevarle 138 ciclistas más a su líder? MAL». `SnapshotRider.pullFor` (v57): «ahora dice por qué tiran… pero no dice quién es, wey». `StageEffort`/`StageSpend` (v47): «esta vez le dije que corriera súper agresivo… y no hay ni una sola mención en el journal ni en la race radio, pero consumió un montón de energía».

---

## 2. `stage/teamPlan.ts`: el plan de equipo

### 2.1 Reglas de cabecera (l. 28-34), literales

1. «**Las individualidades priman sobre el plan.** El que corre por su cuenta (§VI.2) queda FUERA del plan: ni le empuja ni le frena.»
2. «**Un corredor sin equipo corre solo.**»
3. «**Un campo sin equipos se comporta EXACTAMENTE como antes.**»

Cita fundacional del dueño (l. 12-16): «no es solo saber qué equipo(s) participan de la persecución... también es saber POR QUÉ!! que normalmente será por ganar la etapa porque es una etapa en la que tienen al favorito o uno de los favoritos... o por la general (o bien son el líder y es una fuga peligrosa para la general... o bien el equipo de un favorito para la general, ídem)». Y el corolario: «**el que no tiene ninguno de los tres motivos no tiene por qué gastar**».

### 2.2 `TeamPurpose` (l. 44-52)

| Valor     | Significado                                                      | De dónde sale                                                     |
| --------- | ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| `etapa`   | «Tenemos al favorito, o a uno de los favoritos, para ESTE final» | `finishScore` del recorrido, contra el campo                      |
| `maillot` | «Somos el equipo del líder»                                      | `gcDeficitSeconds === 0` de un leal, con `hasGcContext`           |
| `general` | «Somos el equipo de un favorito de la general»                   | déficit ≤ `gcThreatFraction·gcControlLeash` = 0,6·700 = **420 s** |
| `ninguno` | Ninguno de los tres. «No tiene por qué gastar, y no gasta.»      |                                                                   |

### 2.3 `TeamIntent` (l. 59-71)

`perseguir` (cazar), `lanzar` (últimos km, montar tren), `controlar` (limitar boquete sin capturar), `proteger` (tempo y arropar para final que trepa), `fuga` (ya tiene hombre delante: ni tira ni ataca), `nada` (se esconde y manda gente a la fuga).

### 2.4 `TeamPlanRider` (l. 74-92)

`riderId`, `teamId` (null = libre), `role`, `mentality`, `targetRiderId?`, `spr` (se pasa pero **no se lee en teamPlan.ts**; ver §2.6), `finishScore` (calculado en simulate con `finishScore(r.eff0, stageFinishType)`), `gcDeficitSeconds`.

### 2.5 `TeamPlanContext` (l. 95-108)

- `bunchFinish`: `admitsBunchFinish(stageFinishType)` — false solo en `alto`/`solitario`.
- `hasGcContext`: `input.riders.some(gcDeficitSeconds > 0)`.

### 2.6 `TeamPlan` (l. 111-145), campo a campo, y cómo se rellena en `buildTeamPlans` (l. 192-283)

| Campo                 | Cómo se calcula                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `teamId`, `memberIds` | agrupación por `teamId`; miembros ordenados por id (determinismo)                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `leaderId`            | `pickLeader` (l. 170): (a) si algún `gregario`/`lanzador` apunta con `targetRiderId` a un compañero, gana el más votado (desempate por id); (b) si nadie apunta a nadie, `leaderScore`: `sprinter` = 4 si `bunchFinish` si no 1; `lider` = 3; `cazaetapas` = 1; resto 0 → el mayor; null si todos 0. **No mira la general ni los atributos** (anotado como agujero en simulate l. 2160: «`pickLeader` elige al jefe de filas por ROL y por el final que dibuja el recorrido, y nunca mira la general»). |
| `rebelIds`            | (l. 228-235) miembro ≠ leaderId que: (i) se declara `lider` o `sprinter` habiendo ya un leaderId → «Dos jefes en un equipo… el jugador humano se pone de líder cuando su equipo ya tiene uno. `world/autoOrders.ts` nunca nombra dos, así que en un pelotón de bots esto no ocurre nunca»; (ii) es `gregario`/`lanzador` con `targetRiderId` fuera del equipo. Coste «INTRÍNSECO y no administrativo: queda fuera del plan».                                                                            |
| `loyal` (interno)     | miembros no rebeldes; «Si su líder es un rebelde, el equipo se queda sin baza».                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `stageCandidateId`    | el leal con mayor `finishScore` (desempate id), **solo si** `bestFinish − candidate.finishScore ≤ teamStageCardGap` (= **8** puntos, «dejan tres o cuatro equipos con carta en un campo de ocho»); si no, null. `bestFinish` es el máximo del **campo entero** (incluidos libres y rebeldes).                                                                                                                                                                                                           |
| `quality`             | `finishScore` del candidato (0 si no lo hay). Desempata quién toma el frente.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `gcDeficitSeconds`    | mínimo déficit entre los leales; null sin `hasGcContext`.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `purposes`            | `etapa` si hay carta; `maillot` si déficit = 0; `general` si 0 < déficit ≤ 420 s; si nada → `['ninguno']`. **Puede haber varios**.                                                                                                                                                                                                                                                                                                                                                                      |
| `sprintFinish`        | = `ctx.bunchFinish` (nombre engañoso: es «admite llegada agrupada», no «sprint»).                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `budget`              | `teamBudgetPerRider (9) × max(1, nº leales)`. Unidades = trabajo al frente de `advance()`.                                                                                                                                                                                                                                                                                                                                                                                                              |

Nota: `spr` de `TeamPlanRider` no se usa en ninguna decisión de este fichero.

### 2.7 `TeamSituation` (l. 286-313) — lo que la carretera le dice al plan

| Campo                | Cómo lo rellena simulate.ts (l. 1840-1905)                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manUpTheRoad`       | v38/v49: true si `stageCandidateId` o `leaderId` (no rebeldes) van en un movimiento por delante; si el equipo no tiene ninguna de las dos cartas, cualquier miembro no rebelde. Cita v38: «Nadie renuncia a su velocista porque su noveno hombre esté en la escapada». Cita v49: «Un equipo no persigue NUNCA un grupo en el que va su hombre, y tiene dos: el que juega la etapa y el que lleva la general». |
| `kmToGo`             | km restantes                                                                                                                                                                                                                                                                                                                                                                                                  |
| `frontThreatDeficit` | mínimo `gcDeficitSeconds` de los que van en el movimiento de cabeza; null sin general o sin nada delante                                                                                                                                                                                                                                                                                                      |
| `leaderUpTheRoad`    | v58: `leaderId` en un movimiento (no rebelde). «¡Pero el que tiene el jersey no está en ese grupo! Eso no tiene sentido»                                                                                                                                                                                                                                                                                      |
| `gapSeconds`         | boquete al movimiento de cabeza; null si no hay nada delante. v38: «la postura se decidía SIN MIRAR LA CARRETERA»                                                                                                                                                                                                                                                                                             |

### 2.8 `TeamStance` (l. 316-323)

`purpose` (uno solo, el que más derecho da), `intent`, `threatened`, `purposeCount` (motivos ≠ `ninguno`).

### 2.9 `isThreatened` (l. 326-343)

Solo con motivos `maillot`/`general` y con general. Compara la general **virtual** del de delante (`frontThreatDeficit − gapSeconds`) con la de nuestro hombre: amenazado si `virtual − plan.gcDeficitSeconds ≤ 420`. Cita v38: «si la fuga está a 2 minutos y no hay nadie peligroso, no tiras; si está a 20 minutos, sí que tiras, ¡a muerte!».

### 2.10 `intentFor` (l. 351-406)

- `etapa`: sin `sprintFinish` → `proteger`. Con él: `kmToGo ≤ finalDriveKm (15)` → `lanzar`; sin nada delante o `gap < teamChaseMinGapSeconds (25 s)` → `controlar`; `gap < teamChaseSecondsPerKm (1,5) × kmToGo` → `controlar`; si no → `perseguir`. Cita: «etapa con rematador, lejos: perseguir… ¿pero y si no hay fuga también? ¿y si la fuga está cerca también?». Se probó `nada` y «midió fatal» (frente sin dueño, corte que se iba en el km 160). Y «NO SE CAZA DESDE EL KILÓMETRO VEINTE» (presupuesto fundido hacia el km 120, fuga a 6 min).
- `maillot`: siempre `controlar`.
- `general`: `controlar` si amenazado, si no `nada` («deja el trabajo al del maillot, que es de quien es el problema»).
- `ninguno`: `nada`.

### 2.11 `claimFor` / `frontClaim` (l. 418-426, 481)

Derecho al frente: `fuga`/`nada` = 0; `controlar` no amenazado = 2; `controlar` amenazado = 4 si `maillot`, 3 si no; `perseguir`/`lanzar` = 3; `proteger` = 1. «Manda el MAILLOT AMENAZADO».

### 2.12 `teamStance` (l. 440-478)

Si `manUpTheRoad` y (no lleva maillot **o** `leaderUpTheRoad`) → `intent: 'fuga'` con `purposes[0]`. Si no, recorre los motivos y se queda con el de mayor `claim` (empate: el primero en orden `etapa, maillot, general`).

### 2.13 `teamDrive` (l. 537-544) — **el plan llega al corredor como un escalar**

`raw = onTheFront ? driveOnFront : driveWaiting` con la tabla de constants.ts (l. 2411-2418):

| intent           | lleva el frente          | espera |
| ---------------- | ------------------------ | ------ |
| perseguir/lanzar | 1,00                     | 0,30   |
| controlar        | 0,75 (1,00 si amenazado) | 0,10   |
| proteger         | 0,55                     | −0,35  |
| fuga             | —                        | −0,90  |
| nada             | —                        | −0,50  |

Con `purposeCount > 1` y raw > 0: `+teamDriveSecondCard (0,2)` con tope 1. Luego el presupuesto: si base > `teamDriveTired (−0,4)`, interpola hacia −0,4 según `spentFraction` (gastado/budget). «No baja nunca de ahí: fundido no significa que estorbe.»

`driveOfRider(riderId)` (simulate l. 1630): 0 si rebelde; 0 si sin equipo; si no, `teamDriveNow.get(team)`. **Único punto de entrada del plan en el turno de relevos**: en `relayDuty` (l. 502-553) se suma `teamRelayDriveWeight (1,3) × empuje`, y `empuje = 0` si el corredor es «la carta» (`protectedByTeam || role === 'lider' || role === 'sprinter'`). Cita v42: «PEEEERO el líder con el maillot amarillo está también tirando???». Además en `relayTurn` (l. 622-640) `paraMí = clamp(1 − drive)` pondera el término «no puedo ganar» (`relayNoChanceWeight (1) × paraMí × sinOpciones`).

**Qué NO ve el corredor del plan**: solo recibe ese número; no sabe el motivo, ni el intent, ni quién es la carta (eso lo usa la crónica en `pullFor`, l. 3300-3360, y las reglas de ayuda al jefe, no la física del corredor). Dentro de un grupo que no es el pelotón (`isBunch` false) `driveOfRider` se pasa como 0 (l. 3095): «el plan de equipo decide qué hace el equipo CON EL PELOTÓN; dentro de una fuga se relevan todos».

### 2.14 `teamAttackFactor` (l. 553-566) — segundo escalar

`fuga` → 0,4; `perseguir`/`lanzar` → 0,7; `controlar`/`proteger` → 0,85; `nada`/`ninguno` → **1,4** («el que no tiene ningún motivo es el que manda gente a la fuga»). Llega a `MoveRider.teamAttack` (simulate l. 4449 `attackFactorOf`) y multiplica el apetito en `attackAppetite` (tactics l. 383): «Multiplica, no decide». 1 para rebeldes y libres.

### 2.15 Quién lleva el frente (simulate l. 1905-1990)

`claimOf(plan) = frontClaim(stance)` si tiene hombres en el pelotón. Relevo: mayor claim, menor `spentFraction`, mayor `quality`, id. Histéresis: se cede si el actual pierde la baza, agota presupuesto, o (v38) `spent ≥ teamFrontHandoverSpent (0,35)` y el relevo tiene claim ≥ y `spent + 0,2 ≤` el del actual. Si no queda nadie fresco, «manda la baza aunque venga fundido» (v33: 59 % de bloques sin nadie al frente en los últimos 20 km). El presupuesto se gasta en l. 3420 (`teamSpent`) solo con trabajo en el pelotón.

### 2.16 Otras lecturas del plan en simulate.ts

- **Fuerza de la caza** (l. 1990-2010): solo intents `perseguir`/`lanzar` suman; `avail = Σ present·(1−spent) / Σ present`; el equipo con hombre en la fuga no cuenta (v38, cita: «especialmente si los equipos de los sprinters tienen a alguien metido en la fuga y entonces no van a tirar— y la escapada se va a 15 o 20 minutos»).
- **Bajar a por el jefe** (l. 2040-2310, `helpBack*`): solo `leaderId` del plan que se ha quedado en un `shed` a entre `regroupGapSeconds` y 300 s, con ≥ 5 km por correr. Por la general (`maillot`/`general`) o por la etapa solo si `stageCandidateId === leaderId`, hubo percance (`mishapKm`) ≤ 5 km antes y el equipo está entre los 3 de mayor `quality`. Cita v37: «por la etapa yo creo que nadie debería bajarse… salvo que sea un pinchazo/caída y la distancia sea pequeña, y sea gran favorito». Baja solo quien tiene `role === 'gregario'` con `targetRiderId` nulo o = leaderId (v58: «Si yo como humano digo que voy por libre…»); nunca el maillot (`esElMaillot`, v50: «se quedó a posta para ayudar a un compañero que estaba a 8 minutos en la general»); nunca desde la cabeza de carrera («alguien de la fuga no lo mandes para atrás… alguien del pelotón sí»); y la carta de la etapa no se sacrifica.
- **`jefeEnApuros`** (l. 2925-2950): solo con motivos de general; los compañeros que van ≥ `regroupGapSeconds` por delante del jefe dejan de tirar (`sittingOn`), también en el pelotón desde v58.
- **Crónica** (`pullFor`, l. 3300-3360): `equipo_etapa`→`stageCandidateId`; `equipo_maillot`/`equipo_general`→`leaderId`; v59: «vi un grupo que tira para las opciones de su líder Alejandro, pero Alejandro no estaba en ese grupo» → solo se nombra si está en el grupo.

---

## 3. Todas las órdenes del jugador y qué hace el motor con cada una

### 3.1 `role` — dónde se lee

| Lugar                                                                                           | Qué hace                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constants.relayDutyByRole` (l. 1668) vía `relayDuty` (simulate l. 508)                         | Deber de relevo base: gregario 1,0; lanzador 0,85; libre 0,6; cazaetapas 0,5; marcador 0,35; sprinter 0,2; lider 0,1                                                                  |
| `relayDuty` l. 530                                                                              | `lider` y `sprinter` no reciben el empuje del equipo (son «la carta»)                                                                                                                 |
| simulate l. 1152-1170 (`worksFor`, `domestiquesFor`, `leadOutFor`, `lanzaPara`, `markTargetOf`) | `gregario`+target → protege al target (`relayProtectedPenalty` 1,2 en el deber del jefe si el gregario va en su grupo); `lanzador`+target → tren de meta; `marcador`+target → marcaje |
| `tactics.ROLE_APPETITE` (l. 231)                                                                | Apetito de ataque: cazaetapas 1,0; libre 0,45; lider 0,3; gregario 0,2; lanzador 0,12; marcador 0,1; sprinter 0,05                                                                    |
| `tactics.followProbability` (l. 527)                                                            | `tacticFollowRoleWeight (0,3) × ROLE_APPETITE` en la prob. de saltar                                                                                                                  |
| `tactics.giveUpLambda` (l. 847)                                                                 | `lider`, `sprinter`, `cazaetapas` nunca «se dejan ir»                                                                                                                                 |
| `teamPlan.pickLeader`/`leaderScore`/`rebelIds`                                                  | ver §2.6                                                                                                                                                                              |
| `autoOrders`                                                                                    | `libre` es el defecto de quien no recibe rol                                                                                                                                          |
| `chase.isFinisher` (l. 46) / `chaseField` (l. 71)                                               | `sprinter` es contendiente aunque no llegue a SPR 70; `lanzador`/`gregario` cuentan como helpers del tren                                                                             |
| simulate l. 2195 (`tieneElEncargo`)                                                             | solo `gregario` baja a por el jefe                                                                                                                                                    |
| simulate l. 3140-3150 y l. 4838-4855                                                            | lanzadores en el turno en los últimos `sprintTrainKm (3)` → `trenes` para `sprintRegimeKmh`; y cada lanzador presente con su sprinter quema un cerillo                                |
| `relayTurn` l. 640 (`lanzando`)                                                                 | `relayLeadOutBoost (1,5)` al deber del lanzador en los últimos 3 km si su sprinter va en el grupo                                                                                     |
| `constants.finishRoleWeight` (l. 3490) vía `finishStage` l. 6307                                | Factor sobre la puntuación de meta: cazaetapas/sprinter/lider 1,0; libre 0,97; marcador 0,92; lanzador 0,88; gregario 0,88                                                            |
| `disputeBanner`                                                                                 | no mira el rol; mira `contest*`                                                                                                                                                       |

### 3.2 `mentality` — dónde se lee

| Lugar                                                     | Qué hace                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `tactics.MENTALITY_APPETITE` (l. 254) en `attackAppetite` | supercombativo 1,6; combativo 1,25; oportunista 0,8; reservon 0,3 (multiplica al rol) |
| `tactics.followProbability` l. 527                        | `0,15 × (MENTALITY_APPETITE − 1)`                                                     |
| `tactics.giveUpLambda` l. 848                             | `supercombativo` no se deja ir                                                        |
| simulate l. 3759 (`comesOff`)                             | **`reservon` NO quema cerillo para no soltarse**; las otras tres sí                   |
| `teamPlan`                                                | se pasa en `TeamPlanRider` pero **no se lee**                                         |

### 3.3 `effort` — dónde se lee

**Un único sitio**: `relayDuty` (simulate l. 550): `relayEffortWeight (0,5) × EFFORT_PUSH` con `ahorrar −1, normal 0, a_tope +1`. Comentario de constants (l. 1840): «Medio punto es la mitad del salto que hay entre un gregario (1,0) y un corredor libre (0,6)… Manda el oficio; el esfuerzo inclina». **No toca** el apetito de ataque, el cerillo, la reserva, el sprint ni la energía inicial.

### 3.4 `triggerKm` — dónde se lee

Llega a `MoveRider.triggerKm` (simulate l. 4440) y se lee **solo** en `attackAppetite` (tactics l. 375-378): si `|km − triggerKm| ≤ triggerWindowKm (2)` el apetito se multiplica por `triggerAppetiteBoost (3)`; fuera, por `triggerAppetiteOutside (0,15)`. «No es un permiso, es una CITA»; «no es un veto absoluto… el motor nunca obliga a nadie a atacar». Sigue pasando por todos los filtros previos: sin cerillos → 0, energía < mínimo → 0, `gastado` → 0, sprinter con SPR ≥ 70 no va a la fuga/contraataque, y el intento del grupo tiene que haberse sorteado antes (`rollMoveAttempt`, cooldown por grupo, `tacticNoAttackKm`, `tacticMaxMoves`).

### 3.5 `targetRiderId` — dónde se lee

- simulate l. 1152-1170: construye `worksFor` (crónica), `domestiquesFor` (protección del jefe en `relayTurn` → `protectedByTeam`), `leadOutFor`/`lanzaPara` (tren de meta y régimen de sprint), `markTargetOf` (marcaje).
- `teamPlan.pickLeader` (votos) y `rebelIds` (target fuera del equipo = rebelde).
- simulate l. 2196: el gregario solo baja a por su jefe si el target es él (o nulo).
- `chase.chaseField` l. 71-85: helpers del tren; sin target, un gregario/lanzador cuenta para el mejor SPR de su equipo.
- Marcaje (l. 3679-3740 `markedPerfil`/`comesOff`, l. 4508-4525 respuesta al ataque): tres desenlaces de `marcaje.ts` (`stuck`/`gives`/`dropped`), `wheelProbability(tac, tac_rival, marksAlso)`.
- **No se valida** que el target sea del mismo equipo ni que exista (salvo en `pickLeader`, que ignora targets fuera del equipo).

### 3.6 `contestSprints` / `contestClimbs` — dónde se lee

**Un único sitio**: `disputeBanner` (simulate l. 6050): filtra `interested`; si nadie del grupo lo tiene activado, disputan **todos**. Puntúa `eff.SPR` (volante) o `max(MON, COL)` (cima) con ruido `sprintScoreNoiseSd (0,045)`, cobra `bannerCost` a cada contendiente. La cima por orden de grupos (`disputeClimb`, l. 6095) **no mira `contestClimbs`**: todos los del grupo se ordenan y cobran si puntúan. No afectan a la meta.

### 3.7 Resumen de palancas «finas» vs «gruesas»

- Gruesas: `role` (turno, ataque, tren, protección, peso en meta) y `mentality` (ataque, cerillo).
- Finas: `effort` (±0,5 en el deber), `triggerKm` (×3 / ×0,15 apetito), `contest*` (solo banners).

---

## 4. `world/autoOrders.ts`: cómo reparte roles un equipo bot cada día

### 4.1 Entradas

`AutoOrderRider { riderId, attrs (efectividades/atributos base), teamId, gcRank? }` y `AutoOrderStage { kind: 'llana'|'media'|'reina'|'cri'|'clasica'|string, timeTrial }`. **No ve**: la forma/energía de hoy, los cerillos, quién ganó ayer, el perfil concreto del recorrido (solo el `kind`), el `finishType` real del motor, la meteorología, ni las órdenes de otros equipos.

### 4.2 Determinismo

«PURO y DETERMINISTA (decide solo por atributos, con desempate estable por id)». Con los mismos atributos, mismo `kind` y mismo `gcRank`, sale lo mismo cada día. Solo cambia día a día lo que cambie `attrs` (Banister) o `gcRank`. Sin azar.

### 4.3 Métricas (l. 46-68)

`climbScore = 0,6·MON + 0,4·COL`; `sprintScore = SPR`; `breakScore = 0,5·TAC + 0,3·LLA + 0,2·RES`; `allroundScore = 0,4·max(MON,COL) + 0,3·LLA + 0,3·CRI`; `leadOutScore = 0,6·LLA + 0,4·SPR`. `SPRINTER_MIN = 68`; `GC_CARD_RANK = 5`.

### 4.4 `assignTeam` (l. 89-228), en orden

0. **El maillot manda sobre el terreno (v42)**: el mejor `gcRank ≤ 5` sale `lider`/`reservon`/`contestClimbs = mountain`. Cita: «el líder con el maillot amarillo está también tirando???» y el maillot que «salía de lanzador de su propio velocista». v50: era un `find` y cogía al primero del array; el maillot salía de `cazaetapas` («el líder… lo veo demasiado combativo; se escapa, lo consiguen, le pillan, luego lo vuelve a intentar»).
1. **Jefe por terreno**: `flat` (`kind === 'llana'`): mejor SPR si ≥ 68 → `sprinter`/`reservon`/`contestSprints`; si no había maillot, es el líder; y el mejor `leadOutScore` restante → `lanzador` (target el sprinter). Si no hay sprinter y no hay maillot: mejor `allroundScore` → `lider`/`oportunista`. No llano (`media`/`reina` → `climbScore`; `clasica` u otro → `allroundScore`) y sin maillot: → `lider`/`reservon`/`contestClimbs = mountain`.
2. **Baroudeur**: si quedan > 2, mejor `breakScore` → `cazaetapas`/`combativo`/`contestSprints = flat`/`contestClimbs = mountain`.
3. **El resto, gregarios del jefe (v38)**: antes «DOS gregarios “y el resto, libres”» dejaba «sin órdenes 70 en una llana y 88 en una media montaña o una reina… la MITAD EXACTA del pelotón», con deber 0,6 > cazaetapas. «En una carrera no hay nadie “sin órdenes”… Eso es un equipo.»

Consecuencias: **un equipo bot nunca tiene dos líderes, nunca da `marcador`, nunca da `effort` ni `triggerKm`** (quedan `undefined` = `normal` / null), y **solo un lanzador** por tren. `contestSprints` solo lo llevan el sprinter, su lanzador y el cazaetapas en llano.

### 4.5 `autoStageOrders` (l. 235-277)

CRI/`timeTrial` → mapa vacío (todos `libre`). Agentes libres: llano y SPR ≥ 68 → `sprinter`; `breakScore ≥ 58` → `cazaetapas`/`combativo`; resto sin orden (`libre`/`reservon`).

### 4.6 `raceLeadScore` (l. 57-63)

Para dorsales (`calendarRun.ts::assignBibs`): montaña ≥ llana → `climbScore`; llana > montaña → `max(sprintScore, allroundScore)`; si no → `allroundScore`. Cita: «le han dado el dorsal 131 a un wey que ha quedado en el puesto 50 a 10 minutos…».

### 4.7 Cómo lo usa `packages/db/src/stageRun.ts` (l. 270-310)

Se calcula para **todos**, con `gcRank` cuando hay general; una orden explícita en `stage_orders` (`ordersByRider`) manda; si no, la automática; si tampoco, `libre/reservon`. Desde v58 pasa `effort` y `triggerKm` del jugador. Importante: **un equipo humano con un solo corredor humano recibe órdenes automáticas para el resto**, y esas automáticas no saben qué rol se puso el humano (de ahí los rebeldes de §2.6).

---

## 5. `world/callups.ts`: quién va a cada carrera

### 5.1 Entradas

`CallupCandidate { riderId, archetype (Vocation), pointsSeason, formStars [0,5], freshness [0,100], desire, teamTrust [0,100], young }`, `raceFit` (por vocación), `philosophy`, `size`, `seed`.

### 5.2 `raceVocationFit` (l. 47-64)

Media sobre las etapas de `KIND_AFFINITY[kind][vocación]` (l. 38-44). Ej.: `llana: velocidad 1, fondo 0,4, crono 0,3, clasicas 0,2, escalada 0,1`; `reina: escalada 1, fondo 0,7…`.

### 5.3 `callupScore` (l. 104-119)

`1,0·fit + 0,8·clamp(pts/400) + 0,6·form/5 + 0,7·fresh/100 + 0,5·desire + 0,4·trust/100 + philosophyBonus`. `PHILOSOPHY_BONUS = 0,6`: `sprints` → velocidad; `clasicas` → clasicas; `cantera` → jóvenes; `general` → `fit × 0,6`; `equilibrado` → 0. Comentario sobre frescura: «Preferencia fuerte, no veto».

### 5.4 `selectSquad` (l. 133-171)

Muestreo ponderado **sin reemplazo**, peso `exp(2,5·score)`, RNG `seededRng('callup:'+seed)`. Es la única parte estocástica (reproducible).

### 5.5 Respuesta a «¿alineación para sprinter vs para escalador?»

**No hay lógica de composición.** Cada corredor se puntúa **individualmente** contra la afinidad media del recorrido; nada mira quién más va (no hay «si va el sprinter, lleva lanzadores»; no hay cupos por vocación; no hay «tren» ni «gregarios de montaña»). Una carrera mixta (`media` + `llana`) promedia afinidades y saca un fit intermedio para todos. La única señal de conjunto es indirecta: `philosophy = 'general'` favorece a los de mejor fit. Los papeles del día se deciden después, en `autoStageOrders`, con quien haya ido.

### 5.6 Llamadores (`packages/db`)

- `calendarRun.ts` (l. 515-590): bots, `size` = 8 (gran vuelta) / 7; filtra ocupados (`busy`) y, en grandes vueltas, WT reparte la plantilla en tercios por `gtSuit = seasonPoints + GT_VOCATION_BONUS` (Tour/Giro/Vuelta), Pro a lo sumo una grande; `minSquad`. Semilla `${worldSeed}:field:${raceKey}:${team.id}`.
- `callups.ts` (l. 85-200): equipos con humanos; la convocatoria se **deriva del roster congelado** (`ENROLL_LOCK_DAYS = 14 > CALLUP_LEAD_DAYS = 5`) y `selectSquad` solo es respaldo.

---

## 6. `stage/startOrder.ts`: rampa de la crono

`timeTrialStartOrder(riders)`: `hasGc = some(gcDeficitSeconds > 0)`. Con general: déficit descendente, luego `gcRank` descendente (v19: «el desempate en una etapa 2 no es por dorsal, es por posición en la etapa 1»), luego dorsal, luego id; intervalo `ttStartIntervalGcS = 120`. Sin general: por dorsal (`bibKey`: sin dorsal primero; última cifra de mayor a menor con 0 = 10; dentro, dorsal descendente), intervalo `ttStartIntervalBibS = 60`. Pura, total, sin plan de equipo.

---

## 7. `stage/finish.ts` + `finishStage` (simulate l. 6183-6470): el modelo de final

### 7.1 Terreno → tipo (`deriveFinishTerrain`, `finishType`)

`FinishTerrain`: `avgGradient` (últimos 5 km), `hilltopGradient` (últimos 3 km), última cota (`climbKm`, `climbGradient`, `climbScore = km·g²`, `climbKmToFinish`) buscada en los últimos 15 km con rachas ≥ 3 % toleranto 5 bloques de respiro y mínimo 0,4 km; `descentFraction` (3 km), `paveFraction` (30 km).

`finishType(t, groupSize)` (l. 125-162): `groupSize ≤ 1` → `solitario`. `alto` si cota ≥ 3 km y (g ≥ 4 % **o** ≥ 300 m de desnivel) y (corona ≤ 0,6 km de meta **o** últimos 3 km ≥ 5 %). `puncheur` si corona ≤ 5 km y `climbScore ≥ 15`, o `avgGradient ≥ 2,5`. `descenso` si fracción ≥ 0,5. `pave` si fracción ≥ 0,1. Si no: `sprint_masivo` (≥ `finishBunchMinRiders` 15) o `sprint_reducido`. Notas medidas: Muro de Huy → `puncheur`; `race-basque-country` e2 (4 km al 3 %) dejó de ser `alto` en v30.

`admitsBunchFinish` = no `alto` ni `solitario` (v22, Québec). `isSprintFinish` = los dos sprints. `isUphillFinish` = `alto`|`puncheur`.

### 7.2 `finishScore(eff, type)` (l. 290-295) y pesos (`constants.finishWeights`, l. 3439)

| tipo            | pesos                                  |
| --------------- | -------------------------------------- |
| sprint_masivo   | SPR 0,66, LLA 0,18, TAC 0,16           |
| sprint_reducido | SPR 0,5, LLA 0,15, TAC 0,25, RES 0,1   |
| puncheur        | COL 0,4, SPR 0,28, TAC 0,2, RES 0,12   |
| alto            | MON 0,6, COL 0,2, RES 0,15, TAC 0,05   |
| pave            | PAV 0,5, LLA 0,27, TAC 0,15, SPR 0,08  |
| descenso        | DES 0,42, TAC 0,25, SPR 0,18, LLA 0,15 |
| solitario       | RES 0,35, LLA 0,3, TAC 0,2, MON 0,15   |

Se usa con `eff` **erosionado** en meta (`effNow(eff0, erosion(energy, energy0, RES), energy ≤ 0)`), y con `eff0` fresco para el plan de equipo (§2.6) y con `riderEff(m)` para apetito/cooperación durante la etapa.

### 7.3 Cómo se decide el orden dentro de un grupo (`finishStage`)

Los grupos se ordenan por reloj; dentro de cada grupo, por `score`, que para cada corredor es:

```
score = finishScore(effErosionado, type) × N(1, 0,045)              (ruido único de desempate)
      × finishRoleWeight[role]                                       (v48; 0,88-1,0)
      × (1 − clamp(0,6 × (work/meanWork − 1), ±0,15))                (peaje del trabajo del día, relativo al grupo)
      × (1 + 0,05 × min(lanzadoresQueHanLanzado, 2))   solo si isSprintFinish  (tren: +5 %/+10 %)
      × launchEffect(metros, aguanta, primerLanzamiento) solo si isSprintFinish  (≤ 1, suelo 0,7)
      × clamp(N(1, placementSd), 1 ± 3sd)                             (colocación; sd = 0 si grupo < 15)
```

Luego `strungOut`: los que traen segundos cedidos (`markLossS + driftS`) entran detrás.

Detalles:

- **Tren que cuenta** (`trenDe`, l. 6232): lanzadores con `targetRiderId` = este sprinter, en el mismo grupo, con `pullWindow ≥ leadOutMinWork (0,4) × max(0,1, humorDelPeloton)`. Cita: «un sprinter que tenga a sus lanzadores tirando del pelotón le ayudan a colocarse… Puede haber varios equipos con sus lanzadores al mismo tiempo, aunque no necesariamente con el mismo éxito».
- **Lanzamiento** (v39, l. 6250-6295): `aguanta = sprintHoldMetres(SPR, frescura)` = `max(90, (200 + 2·(SPR−50)) × (0,55 + 0,45·fresh))`. Cada uno abre a `N(aguanta + sesgo, sd)`: `sd = 55 × (0,45 si tiene tren) × max(0,2, 1 − 0,35·lectura TAC)`; `sesgo = −55 m` sin tren si nadie lanza en el grupo (×0,6 si alguien sí). Referencia `primerLanzamiento` = máximo entre los 10 mejores por `finishScore`. `launchEffect` = `max(0,7, 1 − (0,14·pasado + 0,07·tarde)/100)`, `tarde = firstLaunch − launch − 70 m`. Cita: «si se lanza demasiado temprano puede no llegar, y si se lanza demasiado tarde igual ya no sobrepasa al que se lanzó antes».
- **Colocación** (`placementSd`, finish l. 225-233): 0 si grupo ≤ 15; lineal hasta 60 corredores; `sdMax 0,07 × crowd × (1 − relief)`, `relief = min(0,55, 0,18 × min(lanzadores, 2) + (TAC − 50)/400)`.

### 7.4 Cuánto pesa el equipo en la meta (respuesta con evidencia)

- `finishStage` **no recibe `teamOf` ni `teamPlans`**; Grep de `teamId|teamOf` entre l. 6170-6500 devuelve vacío. El único vínculo de equipo es `leadOutFor` (rol `lanzador` + `targetRiderId` explícito) y `finishRoleWeight`.
- **Un lanzamiento ayuda**: hasta +10 % de score (2 lanzadores que hayan trabajado), menos dispersión al abrir (sd ×0,45), no abre tarde, y menos desorden de colocación (relief 0,18 por lanzador). Además el lanzador quema un cerillo en los últimos 3 km (l. 4838-4855) y el pelotón entra en el `sprintRegimeKmh` (51 → 63 km/h con 3 trenes; `sprintRegimeSoloShare 0,65`).
- **Dos compañeros en un grupo pequeño NO tienen ninguna ventaja en la meta**: no hay término de compañeros, ni de «uno lanza al otro» si no lleva rol `lanzador` con target, ni de alternancia de ataques. Lo único que hace un compañero en un grupo pequeño es lo que hace cualquiera: relevar según su deber (`relayTurn` con `driveOfRider` = 0 fuera del pelotón), o **no relevar** si «no tiene opciones» (`noChanceToWin`) — que, con dos del mismo equipo, puede dejar al compañero peor sin colaborar en vez de sacrificarse. En el caso `gregario`/`lanzador` el peso 0,88 los perjudica en el remate aunque su jefe no esté. Evidencia adicional en el comentario de `finishRoleWeight` (constants l. 3460-3470): «no tiene sentido que luchen el sprint 2 del mismo equipo (y encima les gana el otro!!!); si hubieran colaborado quizás hubieran ganado uno de ellos» — la respuesta fue un factor por rol, no una mecánica de colaboración; «LO PRIMERO QUE SE MIDIÓ FUE FALSO… De los seis casos de dos compañeros en el top-3, ninguno llevaba un lanzador dentro. Eran gregarios».
- Durante la carrera, dentro de una fuga/grupo pequeño, el plan de equipo se apaga por diseño (§2.13) y `teamAttackFactor` sigue actuando sobre el apetito, pero no hay coordinación «tú atacas, yo me quedo a rueda» entre compañeros.

### 7.5 Qué NO ve el modelo de final

- El equipo (salvo lanzadores explícitos), el plan, `stageCandidateId`, la mentalidad, `effort`, `triggerKm`, el viento, la posición en el grupo durante la etapa (solo `pullWindow` de los lanzadores), los cerillos restantes (solo la energía vía erosión y `sprintHoldMetres`), el marcaje (solo como segundos cedidos).

---

## 8. Deuda reconocida y límites anotados (recopilación)

1. **`StageRider.tsb`** «PENDIENTE DE IMPLEMENTAR… el motor lo ignora» (types l. 111).
2. **`pickLeader` nunca mira la general** (simulate l. 2160): en una llana de gran vuelta el jefe del plan es el velocista y el maillot podía entrar en la lista de los que bajan; se parcheó con `esElMaillot` en `helpBack`, pero el jefe nominal del plan sigue siendo el sprinter (afecta a `leaderUpTheRoad`, `jefeEnApuros`, `pullFor`).
3. **`pinchazo` y avería mecánica «no existen todavía en el motor y quedan anotados en docs/balance.md»** (simulate l. 285, l. 2082; constants l. 3874): la ayuda al favorito de la etapa solo se dispara por caída (`mishapKm`).
4. **«SE PROBÓ QUE EL GRUPO RODARA AL RITMO DEL JEFE Y NO SE HA HECHO (v36)»** (simulate l. 3022): con el tope la ayuda perjudicaba (66 % vs 70 %); el grupeto de rescate rueda a sus fuertes.
5. **`intentFor('etapa')` con `nada` «midió fatal»** (teamPlan l. 366-380): se descartó y se sustituyó por `controlar`.
6. **Bajar el presupuesto para forzar relevos entre equipos «es la palanca equivocada, también medido»** (simulate l. 1930-1940): apaga la caza (fuga gana 38 % de llanas).
7. **Los rebeldes solo existen con jugador humano**: «`world/autoOrders.ts` nunca nombra dos» (teamPlan l. 219).
8. **`TeamPlanRider.spr` y `mentality` se pasan al plan y no se leen** (teamPlan).
9. **`sprintFinish` del plan es en realidad `bunchFinish`** (`puncheur`, `pave`, `descenso` cuentan como «sprintFinish» → intent `lanzar` en los últimos 15 km aunque el remate no sea de SPR).
10. **`effort` solo actúa en el deber de relevo** (un término, ±0,5); `triggerKm` solo en el apetito; `contest*` solo en banners. La «segunda mitad» de la queja del dueño («el resultado es casi lo mismo ponga lo que ponga ahí») queda respondida en el turno pero no en ataque/energía.
11. **La convocatoria no compone equipo** (callups): score individual, sin cupos ni «tren para el sprinter».
12. **`autoStageOrders` no distingue etapas dentro de `media`/`reina`** ni mira el perfil real (solo `kind`), ni el `finishType` que luego usa el motor; el tipo `clasica` cae en `allroundScore`.
13. **`finishStage` no conoce el equipo** (§7.4): dos compañeros no colaboran en la meta; se trató con `finishRoleWeight` (v48), no con una mecánica.
14. **`disputeClimb` ignora `contestClimbs`** (todos los del grupo coronan y cobran `bannerCost` si puntúan); `disputeBanner` cae a «todos» si nadie está interesado.
15. **Cruce de grupos en un puerto «Queda ANOTADO como límite, no resuelto»** (simulate l. 5298) — fuera de parcela, se cita porque afecta a quién llega en qué grupo a meta.
16. **`chase.ts` cabecera**: aún dice «un lanzador y hasta dos gregarios» de `autoOrders` (desde v38 son todos gregarios) — comentario desactualizado, no defecto.
17. **Lluvia que va y viene «queda anotado en §20»** (simulate l. 1039) — fuera de parcela.

---

## 9. Constantes de referencia (constants.ts)

`teamBudgetPerRider 9`, `teamFrontHandoverSpent 0,35`, `teamFrontHandoverEdge 0,2`, `teamChaseSecondsPerKm 1,5`, `teamChaseMinGapSeconds 25`, `teamDrive{Chase 1, Control 0,75, Tempo 0,55, Waiting 0,3, Watching 0,1, Shelter −0,35, UpTheRoad −0,9, Idle −0,5, Tired −0,4, SecondCard 0,2}`, `teamStageCardGap 8`, `teamRelayDriveWeight 1,3`, `teamChaseTiredForce 0,5`, `teamAttack{UpTheRoad 0,4, Chasing 0,7, Defending 0,85, Free 1,4}`, `gcControlLeash 700`, `gcThreatFraction 0,6`, `finalDriveKm 15`, `relayDutyByRole` (§3.1), `relayFreshnessWeight 0,5`, `relayFreshnessCap 0,45`, `relayProtectedPenalty 1,2`, `relaySittingOnPenalty 2`, `relayEffortWeight 0,5`, `relayJitterWeight 0,05`, `relayDutyThreshold 1,5` (pelotón) / `Loose 0` / `NoTeams 0,5`, `relayNoChanceWeight 1`, `relayRaceLeaderPenalty 3`, `relayLeadOutBoost 1,5`, `relayMinPullers 4`, `relayRotationMax 20`, `triggerWindowKm 2`, `triggerAppetiteBoost 3`, `triggerAppetiteOutside 0,15`, `breakawaySkipSprThreshold 70`, `tacticPullingAppetite 0,1`, `coopNoChanceGap 12`, `coopSelfishKm 15`, `coopSelfishFarKm 80`, `coopSelfishFloor 0,25`, `chaseContenderMinSpr 70`, `chaseContenderMaxGap 12`, `chaseHelperBonus 0,15`, `chaseHelpersMax 3`, `chaseFullUnits 2,5`, `chaseMinForce 0,12`, `finishWeights` (§7.2), `finishRoleWeight` (§3.1), `finishWorkWeight 0,6`, `finishWorkMax 0,15`, `sprintScoreNoiseSd 0,045`, `sprintHold{Base 200, PerPoint 2, Min 90, FreshFloor 0,55}`, `launch{EarlyPenalty 0,14, LatePenalty 0,07, WindowM 70, EffectFloor 0,7, SdBase 55, TrainSdShare 0,45, TacScale 40, TacRelief 0,35, StandoffM 55, NoTrainLateShare 0,6}`, `sprintContenders 10`, `placement{FullBunchRiders 60, SdMax 0,07, TrainRelief 0,18, TacScale 400, ReliefMax 0,55}`, `leadOutBoostPerHelper 0,05`, `leadOutMaxHelpers 2`, `leadOutMinWork 0,4`, `sprintTrainKm 3`, `sprint{ApproachKmh 51, FlammeKmh 63, RegimeMinTrains 1, RegimeFullTrains 3, RegimeSoloShare 0,65, RegimeMaxGradient 2}`, `finishBunchMinRiders 15`, `bunchSprintMinRiders 8` (crónica), `helpBack{MinKmToGo 5, MaxGapSeconds 300, MishapKm 5, StageFavouriteTeams 3}`, `ttStartIntervalGcS 120`, `ttStartIntervalBibS 60`.
