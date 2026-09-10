# Rediseño de la capa táctica — propuesta por pasos verdes

> «Es que vas dando palos de ciego: te digo una cosa y pones un parchecito, pero no arreglas el
> problema real. Tienes que hacer un break y REPENSAR TODA la lógica de todas las situaciones que
> pueden ocurrir en carrera y hacer unas NUEVAS reglas, y con eso rehacer el motor (la parte
> táctica), porque ahora mismo está todo del NAAAAABO.»

Y sobre el primer intento: «está muy superficial… no puede ser tan reduccionista como fuga, pelotón
y desenlace: HAY MUCHÍSIMAS más casuísticas».

Este documento contesta a las dos cosas. Recorre los **28 racimos** de `catalogo-situaciones.md` —las
494 situaciones agrupadas por la pieza de motor que las arregla— y para cada uno escribe la regla en
forma implementable, la constante con su valor de partida y el banco que la mide. No encoge el diseño
para que pasen las bandas viejas: propone lo correcto y junta en §9, en un solo sitio, todo lo que
eso mueve.

**La tesis de ingeniería.** Un motor de 6.539 líneas con 46 invariantes y cuatro huellas selladas no
se reescribe de cero: se transforma por pasos verdes. Cada paso de §8 deja el árbol en verde, es
revisable solo, y dice si mueve una huella o una banda. El orden no es el de importancia sino el de
**dependencia real**: hay dos pasos que no cambian ni un dígito de ninguna huella y que sin embargo
abren catorce racimos, y hay un paso —el perfil— sin el cual ninguna fila de montaña se puede medir.

---

## 0. La ausencia madre, verificada

`packages/engine/src/stage/tactics.ts` son 855 líneas donde se decide quién ataca, y **no contiene la
palabra `teamId` ni una vez**. `finish.ts`, 344 líneas donde se decide quién gana, tampoco. `group.ts`
tampoco. El único de los cuatro que la tiene es `chase.ts`, y solo para agrupar ayudantes sin objetivo
(l. 67-83).

Del equipo sobrevive **un escalar**, `teamAttack`, calculado fuera (`teamPlan.ts::teamAttackFactor`) e
idéntico para los ocho hombres de la casa: `fuga` 0,4 · `perseguir`/`lanzar` 0,7 ·
`controlar`/`proteger` 0,85 · `nada` 1,4. Multiplica el apetito y ya.

De ahí salen, sin excepción, los seis sinsentidos que el dueño cazó, los 59 `CONTRARIO` del catálogo
y buena parte de los 178 `AUSENTE`. No son 494 defectos: son **una ausencia vista desde 494 sitios**,
más un puñado de piezas que de verdad no existen (percances, pancartas, colocación, memoria,
información con retardo).

La propuesta, en una frase: **dejar de tirar la información en la frontera**, y hacerlo en el orden
en que cada pieza desbloquea a la siguiente.

---

## 1. Qué se rehace y qué no

### 1.1 La frontera exacta

**No se toca nada de esto** (y cada paso de §8 lleva la comprobación de que no lo tocó):

| Capa                      | Ficheros                                                                      | Por qué se queda                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Física de carretera**   | `physics.ts` (778 l.), `blockCost`, `targetSpeed`, `advanceGroup`, `accLimit` | Es la parte medida y estable: invariantes 45 y 46 son unidades sobre ella. Todo lo que sigue cambia QUIÉN decide, no cuánto cuesta un metro de viento.                                    |
| **Depósito, erosión, W′** | `erosion()`, `bonkPenalty`, `reserveSeconds` 65, `reserveRecoverySeconds` 400 | El racimo R13 está `CUBIERTO` en 7 de 14 filas justamente porque esta moneda existe y está medida (S-454, S-455, S-461, S-475).                                                           |
| **Cerillos en segundos**  | `matchBoostSeconds` 120, caducidad por `vActual`                              | S-455 `CUBIERTO`, cita del dueño cerrada. Se usan más, no se cambian.                                                                                                                     |
| **Criba de subida**       | `shatter`, deriva, `paceSetters`, `pacemakerP75`                              | S-461 y S-260 `CUBIERTO`. Lo que falta no es la criba: es que alguien la LEA (R13, R24).                                                                                                  |
| **Caídas y clima base**   | `crash.ts`, `weather.ts` (`stageWeather(seed, lugar)`)                        | Se AMPLÍA (R14: viento de cara, lluvia que llega a mitad) pero la ley no cambia; la ampliación va en su propio paso porque mueve todas las huellas.                                       |
| **Crono como física**     | `timetrial.ts` (569 l.), rampa de `startOrder.ts`                             | El modo táctico de la crono (R27) se monta ENCIMA: dosificación, referencias, incidentes. La ley de la crono y su huella sellada no se mueven salvo en el paso que declare que se mueven. |
| **Cómo nace un corredor** | `generateNpcRider`, `sampleNpcAge`, Banister                                  | Es la parcela de `diseno-entrenamiento.md`, ya cerrada. Este documento comparte con ella los diez atributos y el `StageRider`, y **no contradice ninguna de sus decisiones**.             |
| **Determinismo**          | `stageSeed`, subflujos nominales, `engineVersion` fijo en bancos              | Todo dado nuevo sale de un subflujo nominal propio o se añade al FINAL de uno existente. Ningún resultado de hoy cambia porque un dado «se corra».                                        |

**Se rehace esto**, y solo esto:

| Pieza                      | Fichero               | Qué le pasa                                                                                                                                                                      |
| -------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El contrato de la decisión | `tactics.ts`          | `MoveRider`/`MoveContext` pasan a ser **tres contextos** (§3). La mecánica del intento (λ, seguir, sostener, boquete) se conserva: es correcta y está medida (motor.md §13.2).   |
| El plan de equipo          | `teamPlan.ts`         | De «cuatro motivos y seis intenciones derivados cada etapa» a **estructura persistente de carrera + carta del día + nueve motivos** (§5). El vocabulario viejo sobrevive dentro. |
| El reparto de papeles      | `world/autoOrders.ts` | De `stage.kind` a la estructura y al **final real** (S-047, S-049). Es el `CONTRARIO` nº 4 de las veinte más graves.                                                             |
| La aduana                  | `pelotonAllows`       | De un dado con rampa a un **voto por equipos revisable cada km** (R03).                                                                                                          |
| El frente                  | `frontTeamId`         | De «uno con histéresis» a **subasta con alianzas y gorrones** (R20).                                                                                                             |
| El modelo de final         | `finish.ts`           | Gana grupo y equipo: dos compañeros en la meta dejan de ser desconocidos (R02, R16, R17).                                                                                        |
| Lo que no existe           | ficheros nuevos       | `placement.ts` (R15), `banners.ts` (R06), `mishap.ts` (R11), `belief.ts` (R24), `memory.ts` (entrada, no estado) (R09).                                                          |

### 1.2 Las huellas selladas, una por una

Hay **cuatro** ficheros con huella y conviene separarlos, porque no todos se mueven a la vez:

1. **`stage/attribution.test.ts`** — huella `puesto:riderId:tiempoS` de cuatro corridas:
   `llana-180-0`, `llana-180-1`, `reina-150-0`, `reina-150-1`. Es la más cara y la que más veces se
   ha re-sellado (v16, v20, v46, v49), siempre con causa escrita.
   **Hecho útil y verificado: los cuatro escenarios son SINTÉTICOS**, construidos a mano en
   `scenarios.ts`. Por tanto arreglar el generador de perfiles (S-451, S-486) **no mueve esta huella
   ni un dígito**, aunque mueva media docena de bandas de bancos reales. Esa asimetría es la que
   permite meter el paso 1 primero y en verde.
2. **`stage/timetrial.test.ts`** — «la huella de la crono canónica es la misma que la de la v17» y
   «cambiar la rampa entera no cambia una sola clasificación». Solo se mueve en el paso de R27, y
   solo la primera: la segunda es una invariante de diseño (el orden de salida no da tiempo) que el
   rediseño **tiene que seguir cumpliendo**, porque la dosificación ordenable (S-143) cambia el
   tiempo por la orden, no por el turno.
3. **`sim/raceRadio.test.ts`** — 26 pruebas casi todas de unidad sobre fotos construidas a mano. Se
   mueve solo donde cambia el contrato del evento: `pullMotive` con valores nuevos y `time_gap` con
   `costsToTeams` (R23).
4. **`index.test.ts`** — `ENGINE_VERSION` (hoy **52**). Un `++` por paso que cambia conducta, nunca
   dos en el mismo PR: si el banco de mundo o el de carrera se mueve, tiene que poder atribuirse a
   una causa.

Regla operativa, la misma que ya usa la casa: **se re-sella cuando el cambio está declarado,
atribuido a una causa nombrada y anotado en `docs/balance.md` con la medición antes/después**. «Mueve
huellas» no es un argumento de doctrina; es un coste que se paga con los números delante.

### 1.3 Las bandas

30 bandas en `targets.ts`, 46 invariantes. El dueño ha dicho: «no me preocupan en este punto las
bandas… a fin de cuentas yo no fui quien creó las bandas, fue Claude con mi feedback quien las
propuso». Este documento se lo toma al pie de la letra **en las dos direcciones**:

- No encoge una sola regla para que pase una banda vieja.
- No mueve una sola banda en silencio: **§9 es la lista completa**, con valor de hoy, valor
  propuesto y motivo. Si una regla saca una banda de rango, lo que se discute es la banda, no se
  desactiva la regla; y si la banda tenía ancla real (el corte del §VI.3, la ley de velocidad), lo
  que se discute es la regla.

Hay además cuatro bandas que **están sentadas encima de su ruido** y que este rediseño va a rozar
sí o sí (`flat.breakawayWinPct`, `grandTour.queenLastGroupPct`, `realQueens.lastGroupPct`,
`mountain.top10GapSeconds`). Para esas, la propuesta no es ensanchar: es **subir semillas donde se
pueda pagar y mover el suelo donde no**, y está en §9 marcado como tal.

---

## 2. El modelo de decisión

### 2.1 Qué es un agente

Hoy hay **un solo** decisor real: el corredor, con un escalar de equipo pegado. La propuesta tiene
tres, y los tres son necesarios porque el catálogo pide conductas que ninguno de ellos solo puede
producir:

| Agente                  | Quién es                                                  | Qué decide                                                                                                                            | Cada cuánto                            | Estado propio que arrastra                                                        |
| ----------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| **Director** (`TeamDS`) | uno por equipo, fuera de la carretera                     | postura, motivo activo, derecho al frente, voto de aduana, presupuesto del día, quién baja a por el jefe, cambios de carta en carrera | **1 km** (10 bloques, como hoy)        | `spent`, `claimHeld`, `beliefs` (huecos con retardo), `allies`, `lastOrderKm`     |
| **Capitán de ruta**     | por equipo **y por grupo**: el leal de mayor TAC presente | lo que el director no llegó a decir: entrar al turno, abandonar la caza, esperar a un compañero, cerrar un hueco                      | **evento** y cambio de fase            | `lastCallKm`                                                                      |
| **Corredor**            | los 176                                                   | atacar, saltar, relevar, disputar una pancarta, colocarse, dejarse ir, cómo remata                                                    | **bloque (100 m)** para lo que es suyo | lo de hoy (`energy`, `matches`, `driftS`, `reserveS`…) + `placement`, `turnIndex` |

La razón de que el capitán exista y no sea un lujo: R24 pone **retardo** en la información del
director (S-458, S-478, S-489). Con retardo y sin capitán, un equipo se queda mudo justo en el
minuto en que pasa todo. Con capitán, el equipo reacciona tarde y peor —que es lo que pide S-459—
pero reacciona.

### 2.2 La escalera de frecuencias

Nada se decide más a menudo de lo que hace falta: el motor ya se ha frenado un 48 % en dos versiones
y el coste de CI es un requisito, no un detalle.

| Cadencia            | Qué se decide ahí                                                                                                                                         | Coste                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **bloque (100 m)**  | intento táctico (ya existe, 1 por grupo), respuesta al ataque, criba, cerillo, `placement` (una suma por corredor)                                        | +1 float/corredor/bloque. Medido como despreciable frente a `blockCost`.   |
| **km (10 bloques)** | postura de equipo, frente, **aduana revisada** (R03/S-120), general virtual (R04), lectura del rival (R24), grupeto (R26), tren (R16 dentro de los 15 km) | Es la cadencia que ya existe (`decisionEveryBlocks` 10). Se le cuelga más. |
| **2 km**            | cooperación de cada movimiento (`coopReviewBlocks` 20, ya existe), deuda de relevos (R09)                                                                 | sin cambio                                                                 |
| **fase**            | tabla entera de conducta: λ, suelos de compromiso, si la aduana está abierta, si se puede atacar dentro, si el rescate está permitido (R19)               | una comparación por km                                                     |
| **evento**          | caída, pinchazo, corte, captura, pancarta, cambio de líder virtual → despiertan al director y al capitán **con retardo** (`newsLagKm`)                    | una cola de sucesos por equipo                                             |
| **etapa**           | plan del día desde la estructura (R21), presupuesto (R10), parte meteorológico (R14)                                                                      | como hoy                                                                   |
| **carrera**         | estructura del equipo y convocatoria (R21/R28), objetivo y días marcados (R10)                                                                            | fuera del motor, en `packages/db`                                          |

### 2.3 El bucle, en pseudocódigo

Al estilo de `docs/motor.md` §13.2. Lo que va en **negrita** es nuevo; el resto es el orden real de
`simulate.ts` §3, que no cambia.

```
por bloque i  (dx = 0,1 km):

  si i % decisionEveryBlocks == 0:                       # 1 km
      race    = raceView(km)                             # verdad del motor
      fase    = phaseOf(race, evs)                       # R19  ← sustituye a tacticMaxMoves/closingNow
      para cada equipo t:
          creencia[t] = believe(t, race, evs)            # R24  retardo + redondeo + error
          postura[t]  = stance(plan[t], creencia[t], fase)
      frente  = frontAuction(postura, creencia)          # R20  subasta, alianzas, gorrones
      aduana  = customs(movimientos, postura, creencia)  # R03  revisa allowed de TODOS, no solo al nacer

  para cada grupo g (orden de carretera):
      censo   = census(g)                                # R01  quién es de quién: aquí, delante, detrás
      para cada equipo t con hombres en g:
          reparto[t] = teamTurn(g, t, censo, postura[t], fase)   # R02  carta, peones, quién ataca
      turno   = relayTurn(g, reparto, censo, fase)               # R18  cola CON orden y duración
      intento = attemptFrom(g, kindOf(fase, g, race), censo, race, creencia)

  # la carretera, sin cambios
  advance(...)  ·  shatter(...)  ·  corte(...)  ·  banners(...)  ·  crashCheck(...)
  mishapCheck(...)                                       # R11  nuevo, misma forma que crashCheck
  resolverMovimientos(...)  ·  fusiones  ·  reenganches
  publicar(evs)                                          # sucesos con su km real; los equipos los leen tarde
```

`attemptFrom` conserva las cinco caras (`fuga`, `contraataque`, `puente`, `ataque_grupo`,
`ataque_final`) y su mecánica: λ → seguir → sostener → boquete calculado → cooperación. Lo que cambia
es **qué ve** y **quién puede ser instigador**.

### 2.4 Conflicto entre dos corredores del mismo equipo en el mismo bloque

Hoy no existe: `chooseInstigator` sortea sobre el pool entero y dos compañeros pueden atacar en el
mismo movimiento, o uno contra otro. La regla nueva es que **el equipo decide antes que el dado**:

```
function teamTurn(g, t, censo, postura, fase):
    leales = censo.mates(t).filter(r => !r.rebel && !r.exempt)
    si leales vacío: return NADA

    # 1. LA CARTA DE ESTE GRUPO, no la de la etapa (S-049, S-291)
    tipo  = finishType(finishTerrain, g.size)
    carta = leales.maxBy(r => finishScore(riderEff(r), tipo))
    si postura.purpose ∈ {maillot, general} y el jefe de general está aquí:
        carta = jefeDeGeneral                                   # manda la general sobre el remate

    peones = leales \ {carta}

    # 2. LA INDIVIDUAL MANDA (§V.1 regla 1)
    para r en leales con orden explícita del jugador que contradice el plan:
        r.mode = 'libre'                                        # ni le empuja ni le frena
        peones.remove(r); si r == carta: carta = peones.maxBy(finishScore)

    # 3. UN SOLO INSTIGADOR POR EQUIPO Y BLOQUE
    si |leales| >= 2 y g.size <= numSuperiorityMaxGroup (12):
        instigador = peones.minBy(r => finishScore(r, tipo))     # ataca el PEOR rematador (S-304)
        carta.appetite *= cardHoldBack (0,25)                    # la carta se guarda y remata
    si no:
        instigador = leales.maxBy(appetite)

    # 4. NADIE SALTA A LA RUEDA DE UN COMPAÑERO (S-304, S-358)
    para r en leales \ {instigador}:
        r.followDamp = (r == carta) ? 0 : teamMateFollowDamp (0,15)

    # 5. EL TURNO: releva el peón, no la carta (S-303, S-094)
    para r en peones:  r.dutyBonus += teamPeonDuty (0,6)
    carta.dutyBonus   -= teamCardDuty (1,2)                      # ya existe como relayProtectedPenalty

    return { carta, peones, instigador, followDamp, dutyBonus }
```

**Por qué el peor rematador y no el mejor**: es la regla 6 de motor.md §13.1, ya medida y ya
implementada para el individuo (`tacticWorstFinisherWeight` 1,5). Lo único que se añade es que el
equipo la aplique **entre los suyos**, que es exactamente S-094 («el peón releva por los dos y ataca
primero para que los rivales gasten cerrando; la carta se guarda y remata»).

**Excepción escrita, porque el catálogo tiene una fila contraria**: S-300 dice que en el puerto
decisivo el que ataca dentro de la fuga es el MEJOR escalador, no el peor rematador. No es una
contradicción: `finishScore` se calcula con el `finishType` del grupo, y en un final en alto el mejor
escalador **es** el mejor rematador. La fila `CONTRARIO` de S-300 se cierra sola en cuanto
`finishType` se calcula por grupo y con el perfil bien escrito (R17 + paso 1). Se deja dicho para que
nadie meta un caso especial.

### 2.5 Conflicto entre el plan del equipo y la orden individual

Regla 1 de §V.1, literal en `teamPlan.ts` l. 28-34: «Las individualidades priman sobre el plan». Se
conserva y se completa, porque hoy tiene dos agujeros medidos (S-058, S-060):

```
function effectiveOrder(r, plan):
    si r trae fila explícita en stage_orders:               # el jugador ha escrito
        orden = r.orders                                    # MANDA, siempre
        si contradice el plan:                              # rebelde
            drive(r) = 0 ;  teamAttack(r) = 1
            sin arropo, sin tren, sin rescate, sin lanzamiento
            el equipo NO le cuenta como hombre propio para la aduana        (S-113)
            pero NINGÚN compañero entra al turno para cazarle               (S-188)
            trust(r) -= rebelTrustCost (12)                                 (R25)
    si no:
        orden = plan.roleOf(r)                              # el director
        si km − plan.lastOrderKm > dirLagKm(t):             # la orden no ha llegado (R24)
            orden = captainCall(r, censo, fase)             # el capitán decide con lo que ve

    # LOS DOS AGUJEROS DE HOY, cerrados:
    # (a) nadie es nombrado jefe sin quererlo                                (S-058)
    si r escribió 'libre' o 'cazaetapas':
        r no puede ser plan.leaderId aunque le voten sus gregarios bot
        (pickLeader ignora los votos que apuntan a un hombre que se declaró libre)
    # (b) el reparto del bot conoce ya las órdenes humanas                   (S-054, S-060)
    autoStageOrders se calcula DESPUÉS de leer stage_orders y con ellas dentro,
    de modo que no puede producir ciclos (X lanza a Y y Y lanza a X) ni dos cartas.
```

La asimetría que esto conserva a propósito: **el que se sale del plan paga por dentro, no por una
regla que se lo prohíba**. Es la doctrina de G2 («hace falta que abusar SALGA CARO por dentro del
juego»), y R25 le pone el precio.

---

## 3. Los tres contextos y su contrato

Tres registros que viajan enteros hasta el bloque. Los tres son **de solo lectura** y se construyen
una vez por grupo y por km (o por bloque, donde el catálogo lo pida). Ningún campo es opcional «por
si acaso»: cada uno lo pide una fila del catálogo, y esa fila va anotada.

### 3.1 `SelfView` — lo que un corredor sabe de sí mismo

Extiende el `MoveRider` de hoy. En **negrita**, lo nuevo.

```ts
type SelfView = {
  riderId: string
  teamId: string | null // ← nulo = agente libre (S-040, S-079, S-338)
  role: StageRole
  mentality: Mentality
  effort: Effort
  triggerKm: number | null
  triggerOn: TriggerCond | null // ← R22: «si salta Z», «en el tramo más duro» (S-321, S-322)

  perfil: number // efectivo en este bloque
  finishScore: number // con el finishType de ESTE grupo
  energyFraction: number
  reserveFraction: number // ← R13: cuánta W′ le queda (S-454)
  matches: number
  tac: number
  spr: number

  gcDeficitSeconds: number
  gcRank: number | null
  standings: StandingRow[] // ← R05/R06: puntos, montaña, joven, equipos (S-035)

  pulling: boolean // iba en la rotación el bloque anterior
  turnIndex: number | null // ← R18: dónde va en la cola del turno (S-492)
  placement: number // ← R15: [0,1], 0 = cabeza del grupo (S-189, S-490)
  gastado: boolean
  hurt: 'minor' | 'major' | null
  bruised: boolean // ← R08: se cayó ayer (S-380)
  raceRhythm: number // ← R08: [0,1], días sin dorsal (S-468)
  kmSinceFeed: number // ← R13: avituallamiento (S-147, S-226)

  duty: DutyTag // ← R21: 'carta' | 'peon' | 'exceptuado' | 'libre' | 'rebelde'
  worksFor: string | null // a quién sirve HOY (puede no ser el leaderId del plan)
  debtTo: string[] // ← R09: a quién le debe un relevo (S-081, S-413)
  contractYear: boolean // ← R25: escaparate (S-428)
}
```

Lo que **sigue sin llevar** y a propósito: la verdad del rival. Un corredor no lee `energy` ajena
nunca; para eso está `GroupView.signals` (§3.2), que se lee con error.

### 3.2 `GroupView` — lo que un corredor ve de su grupo

Es la pieza más barata del catálogo y la que más filas apaga (R01: 15 situaciones). Se calcula **una
vez por grupo y bloque** y se comparte por referencia entre los que van en él.

```ts
type GroupView = {
  groupId: string
  kind: 'peloton' | 'move' | 'shed' // el título de «pelotón» lo da mainGroupId, sin cambios
  size: number
  isMain: boolean
  tS: number
  compromiso: number
  tension: number

  // --- EL CENSO (R01) -------------------------------------------------------
  mates: MateHere[] // los míos que van AQUÍ
  matesAhead: MateThere[] // los míos que van DELANTE, con su hueco  (S-128, S-133, S-177)
  matesBehind: MateThere[] // los míos que van DETRÁS                 (S-247, S-288, S-290)
  teamCensus: Map<string, TeamContingent> // cuántos de cada casa, y quién es su carta
  freeAgents: number // sueltos: el listón del turno los trata aparte (S-235)

  // --- EL PELIGRO (R02, R13, R24) -------------------------------------------
  bestFinisherId: string // el mejor remate de este grupo con ESTE finishType
  myFinishRank: number // [0,1]
  myPerfilRank: number // [0,1]
  threats: ThreatRow[] // los que me quitan algo si llegan conmigo
  signals: Map<string, RoadSignal> // ← R24: lo que se VE del otro, con error (S-488)

  // --- QUIÉN TIRA (R18, R20) ------------------------------------------------
  pullers: string[] // en orden de turno
  turnHead: string // el que va dando la cara ahora
  frontTeamId: string | null // el dueño del frente en este grupo
  captainOf: Map<string, string> // equipo → capitán de ruta presente (S-459)

  // --- EL FINAL DE ESTE GRUPO (R17) -----------------------------------------
  finishType: FinishType // calculado con size, no con la etiqueta de la etapa (S-370)
  trains: SprintTrain[] // ← R16, solo dentro de trainFormKm (S-351, S-355)
  lanes: number // ← R15/R16: cuántos trenes caben en esta carretera (S-481)
}

type MateHere = {
  riderId: string
  role: StageRole
  duty: DutyTag
  freshness: number
  finishRank: number
  placement: number
}
type MateThere = { riderId: string; gapS: number; duty: DutyTag; groupId: string }
type TeamContingent = { teamId: string; here: number; cardId: string | null; loyal: number }
type ThreatRow = { riderId: string; teamId: string | null; costIfHeWins: number }
type RoadSignal = {
  placeSeen: number // en qué puesto le veo (con error)
  matesLeftSeen: number // cuántos gregarios le quedan
  drifting: number // [0,1] cuánto le veo sufrir  (S-319, S-269)
  standing: boolean // sube de pie = está al límite
  teamOffFront: boolean // su equipo ha soltado el frente
}
```

**Contrato de `signals`**: nunca se rellena con la verdad. Se rellena con
`readSignal(observador, objetivo)` de R24, que mete ruido en función del TAC del observador y admite
disimulo del observado. Es lo que hace que «oler la sangre» pueda fallar (S-488) y que el jefe tocado
pueda esconderse.

### 3.3 `RaceView` — lo que un corredor ve de la carrera

```ts
type RaceView = {
  km: number
  kmToGo: number
  totalKm: number
  phase: Phase // ← R19  (S-218)
  fieldSize: number
  racingNow: number

  // --- LA CARRETERA POR DELANTE Y POR DETRÁS --------------------------------
  ahead: GroupBrief[] // en orden, con hueco y composición por equipos
  behind: GroupBrief[]
  dayBreakId: string | null
  mainId: string

  // --- LA GENERAL VIRTUAL (R04) ---------------------------------------------
  virtual: VirtualGc // qué pasa si esto se consolida
  costToMyMan: number // puestos que pierde MI hombre  (S-103)
  myLeash: number // segundos que puedo tolerar HOY    (S-391)
  jerseyHolderId: string | null
  virtualLeaderId: string | null // ← S-101, S-294

  // --- EL DÍA ---------------------------------------------------------------
  weather: WeatherNow // ← R14: viento lateral, de cara, lluvia, calor, frío (S-203, S-205)
  roadClass: 'abierta' | 'normal' | 'revirada' // ← R20 (S-493)
  nextBanner: BannerPoint | null // ← R06 (S-033, S-236)
  kmToNextPaves: number
  kmToNextClimb: number
  lastClimbKmToFinish: number // ← R28 (S-486, S-289)

  // --- LO QUE VIENE DESPUÉS DE HOY (R10, R28) -------------------------------
  raceShape: RaceShape // días, terreno restante, crono restante
  isMarkedDay: boolean // el día objetivo de mi equipo (S-405)
  memory: RaceMemory // ← R09: quién ganó ayer, quién fugó, quién debe (S-423)
}

type GroupBrief = {
  groupId: string
  gapS: number // ← CON RETARDO Y ERROR si lo lee un equipo (R24)
  size: number
  byTeam: Map<string, number>
  bestGcDeficit: number
  bestFinishScore: number
  carriesJersey: boolean
}
type VirtualGc = { rows: { riderId: string; virtualS: number; virtualRank: number }[] }
```

**Dos contratos que hay que respetar o el diseño se cae**:

1. `RaceView` es la **verdad**. Ningún equipo la lee directamente: lee `believe(t, race)` (R24), que
   devuelve la misma forma con los huecos envejecidos y redondeados. El corredor sí lee la verdad de
   lo que tiene delante de los ojos (su grupo), porque eso lo ve.
2. `RaceView.memory` **no es estado del motor**. Entra como parte de `StageInput`, igual que
   `gcDeficitSeconds` hoy. `packages/db` la construye leyendo las etapas anteriores. El motor sigue
   siendo una función pura de `(input, seed)`, que es lo que sostiene todos los bancos.

---

## 4. Las reglas, racimo por racimo

Formato de cada racimo: **pieza** · **regla(s)** · **cierra** (IDs) · **constantes nuevas** ·
**cómo se mide**.

Cuando una banda propuesta lleva «calibrar con banco», es porque el número honesto no se puede
escribir hoy: el banco que lo mediría no existe todavía y se construye en §7. No hay ningún «a
definir».

---

### R01 · Compañeros visibles dentro del grupo (15 situaciones)

**Pieza.** `census(g)` → `GroupView.mates` / `matesAhead` / `matesBehind`. Un recorrido por los
miembros del grupo y una comparación de relojes. Es la pieza más barata del catálogo.

**Reglas.**

```
R01.1  matesAhead(r) = { m ∈ equipo(r) : reloj(grupo(m)) < g.tS − mateAheadGapS }
       si matesAhead(r) no vacío y el mejor de ellos es carta o leal:
            sittingOn(r) = true                       # no entra al turno
       → generaliza tieneHombreDelante (hoy SOLO en grupos 'move') AL PELOTÓN.   (S-128)

R01.2  matesBehind(r) con el JEFE dentro y hueco ≥ mateBehindGapS:
            sittingOn(r) = true  y  el capitán evalúa el rescate       (S-247, S-288)
       → generaliza jefeEnApuros (hoy SOLO con purposes maillot|general) A CUALQUIER CARTA.

R01.3  el rebelde NO cuenta como hombre propio para la postura del equipo (S-113)
       pero NINGÚN compañero entra al turno para cazarle             (S-188)
       → resuelve la contradicción aparente entre las dos filas: el equipo conserva su problema,
         el individuo conserva su lealtad.

R01.4  equipo partido en tres grupos: se trabaja para el mejor situado que aún puede ganar algo,
       y nadie persigue un grupo donde va uno de los suyos.                        (S-191)
       servedBy(g) = argmax_{m ∈ equipo, m ∈ algún grupo} expectedValue(m)

R01.5  el que se rompe en el puerto dentro de la fuga: si el que se queda es la carta, el de delante
       no releva en la coronación y afloja en el descenso hasta mateWaitMaxS.       (S-249)
```

**Cierra.** S-089, S-113, S-128, S-133, S-177, S-187, S-188, S-191, S-211, S-247, S-249, S-250,
S-307, S-314, S-318.

**Constantes nuevas.** `mateAheadGapS` **12** (se reutiliza el `grupetoJoinGapSeconds` de hoy, mismo
significado: «va por delante de verdad») · `mateBehindGapS` **12** (hoy son 22 en `jefeEnApuros`, y
el propio comentario dice que sin umbral la huella de la llana se iba 387 s; se baja a 12 porque
ahora hay señales de carretera y el gregario reacciona al SUFRIMIENTO antes que al hueco, S-259) ·
`mateWaitMaxS` **25**.

**Cómo se mide.** Estadística nueva `mateAheadPullPct` = bloques en que un corredor tira en un grupo
teniendo un compañero por delante ÷ bloques con esa configuración. Banco: **carrera pequeña** (§7.1)
y `smallTours`. Banda propuesta **0-3 %** (no 0 %: el capitán puede decidir tirar si su hombre de
delante no es carta y el equipo tiene otro motivo). Segunda estadística: `censusCost` en ms/etapa,
para vigilar que la pieza es tan barata como se dice; listón **≤ 3 % del coste de etapa**.

---

### R02 · Superioridad numérica: dos compañeros en el mismo grupo (12 situaciones)

**Pieza.** `teamTurn(g, t, ...)` de §2.4, más el brazo de meta: `finish.ts` recibe `teamOf`.

**Reglas.** Las cinco de §2.4 (carta, individual manda, un instigador, no saltar a la rueda del
compañero, releva el peón) más:

```
R02.6  META. Dos leales en el mismo grupo de llegada y ninguno con rol lanzador:
       el peor por finishScore hace de lanzador improvisado (S-362):
            carta.score  *= 1 + leadOutBoostPerHelper (0,05)
            peon.score   *= finishSacrificeWeight (0,90)
       y NUNCA los dos disputan: el peón no entra en sprintContenders.        (S-349, S-357)

R02.7  MAYORÍA. Con k ≥ 3 de la misma casa en un grupo de n ≤ 8:
            el equipo fija el ritmo:  compromiso_objetivo = clamp(0,55 + 0,08·k, 0, 0,95)
            y ataca por turnos: cooldown de ataque POR EQUIPO, no por grupo.    (S-306)

R02.8  MINORÍA. El rival solo contra dos (S-265, S-358):
            outnumbered = clamp((maxContingenteRival − misLeales) / 3, 0, 1)
            si remato mejor:  duty −= outnumberedSitGain (0,9)·outnumbered      # me escaqueo
            si remato peor:   appetite *= 1 + outnumberedAttackGain (0,6)·outnumbered   # ataco lejos
            si el pelotón viene cerca (gap < 45 s): colaboro igual              # o no llega nadie

R02.9  DOS CARTAS DE GENERAL (S-293). Con dos leales dentro de gcCoLeaderS de la general:
            el 1-2: uno ataca, el otro NO cierra y contraataca a rueda del que cierre.
            followDamp(coLíder → coLíder) = 0  (excepción a R02.4: aquí sí se sale a rueda)
```

**Cierra.** S-094, S-265, S-293, S-303, S-304, S-305, S-306, S-343, S-349, S-357, S-358, S-362.

**Constantes nuevas.** `numSuperiorityMaxGroup` **12** · `cardHoldBack` **0,25** ·
`teamMateFollowDamp` **0,15** · `teamPeonDuty` **0,6** · `finishSacrificeWeight` **0,90** ·
`outnumberedSitGain` **0,9** · `outnumberedAttackGain` **0,6** · `gcCoLeaderS` **45** ·
`teamAttackCooldownKm` **6** (por equipo; el de grupo sigue en 4,5).

**Justificación de `finishSacrificeWeight` 0,90**: es el mismo orden que `finishRoleWeight` ya usa
para gregario/lanzador (0,88). No es un número nuevo: es el mismo castigo, aplicado por decisión y no
por etiqueta de rol, que es justo lo que el comentario de `constants.ts` l. 3460-3470 dejó pendiente
(«la respuesta fue un factor por rol, no una mecánica de colaboración»).

**Cómo se mide.**

- `mateVsMateSprintPct` = grupos de meta con dos leales en el top-3 y ninguno habiendo lanzado.
  Banco: carrera pequeña + `smallTours`. Banda **0-2 %** (hoy: no se mide, y el defecto está citado).
- `pairEdgePct` = de las fugas de tres con una pareja y un suelto, cuántas gana la pareja. Azar puro
  = 66,7 %. Banda propuesta **72-88 %**: por encima de 88 la superioridad sería determinista y el
  rival dejaría de tener juego (S-265 le da uno). Banco nuevo `duelBench` (§7.2), 400 corridas de un
  escenario de fuga de tres construido a mano: es barato (una etapa de 3 corredores).
- `teamAttacksAlternated` = de los ataques de un equipo con k ≥ 2 en un grupo, qué fracción los hace
  el peor rematador. Banda **60-90 %**.

---

### R03 · La aduana como voto por equipos, revisable cada kilómetro (24 situaciones)

Es la pieza de la que cuelga el día entero (S-114 es la nº 11 de las veinte más graves): si la cuerda
sale de un dado, todo lo que viene después está construido sobre azar.

**Pieza.** `customs(movimientos, posturas, creencias)` sustituye a `pelotonAllows`. **La aduana es
una subasta de trabajo** (S-119): la fuga sale si nadie con hombres frescos está dispuesto a pagar el
cierre.

**Reglas.**

```
R03.1  EL PRECIO DE CERRAR
       price(move) = customsPriceBase (1,0)
                   · (1 + customsSizeGain (0,12) · max(0, party − 3))
                   · roadFactor(roadClass)                       # R20/S-493
                   · (1 + customsWindGain (0,4) · vientoLateral)

R03.2  LA OBJECIÓN DE CADA EQUIPO
       objection(t, move) =
             0                                     si t tiene una CARTA dentro          (S-086)
           + customsLoyalInside (0,25)·(−1)         si t tiene un leal cualquiera dentro (S-092)
           + gcObjection(t, move)                   # R04: puestos que pierde mi hombre  (S-088, S-103)
           + stageObjection(t, move)                # alguien de dentro me gana la etapa (S-090)
           + secondaryObjection(t, move)            # R05: mi rival de montaña/puntos     (S-108)
           + customsJerseyVeto (99) si move.carriesGcLeader                              (S-118)
           × memoryFactor(t, move)                  # R09: el ganador de ayer, el fugado de ayer

       stageObjection(t, move) = 1,0  si ∃ f ∈ move : finishScore(f) ≥ finishScore(carta_t) − customsRivalGap (6)
                                 0    si no
       gcObjection(t, move)    = clamp(costToMyMan(t, move) / customsGcPlaces (3), 0, 2)

R03.3  LA PUJA Y EL DESENLACE
       payable(t) = presentInPeloton(t) · (1 − spentFraction(t)) · quality(t)
       pot        = Σ_{t : objection(t) > 0}  min(objection(t), payable(t))
       move.allowed = pot < price(move)
       → SE RECALCULA CADA KM mientras el movimiento no sea dayBreak.                    (S-120)

R03.4  QUIÉN ES ELEGIBLE PARA IRSE
       (a) veto al velocista puro       — existe (breakawaySkipSprThreshold 70)          (S-473)
       (b) descuento al que tiraba      — existe (tacticPullingAppetite 0,1)             (S-472)
       (c) CUPO POR EQUIPO:
             quota(t) = 1
                      + 1 si party ≥ customsBigBreakRiders (12)                          (S-115)
                      + 1 si desperation(t) ≥ 0,7                                        (R09/S-402)
                      − 1 si t tuvo hombre en la fuga de AYER  (mínimo 0)                (S-046, S-408)
             si t ya tiene quota(t) hombres delante: appetite = 0 para el resto de leales
       (d) EL HOMBRE CORRECTO (S-433, CONTRARIO nº 10 de las veinte más graves):
             breakScore = 0,45·TAC + 0,35·terrainScore + 0,20·RES
             terrainScore = MON·climbShare + LLA·(1 − climbShare)   # climbShare = kmSubida/total
             → en una reina se manda al escalador, no al rodador.

R03.5  EL INFILTRADO (S-474)
       si objection(t) > 0  y  payable(t) < price/2  y  t tiene un leal disponible:
             manda uno con duty = 'infiltrado': entra en la fuga y NUNCA releva.
             efecto: la fuga rueda a compromiso × (1 − 1/party) y no se organiza.

R03.6  LA ADUANA DEL CONTRAATAQUE Y DEL PUENTE (S-121, S-173)
       al puente se le aplica la misma subasta con dos correcciones:
             + bridgeReinforceGain (0,5) a la objeción si el puente lleva rematadores
             − bridgePassGain (0,4) si el puente REFUERZA una fuga que ya me conviene cazar
               («que hagan ellos el trabajo»)

R03.7  LA SEGUNDA FUGA DEL DÍA (S-116, CONTRARIO)
       tras una captura, phase = 'captura' durante capturaKm (1) y luego 'fuga' otra vez
       durante secondBreakWindowKm (8) con λ × 2,5: sale gente NUEVA, y esa puede ser la que llegue.
```

**Cierra.** S-064, S-066, S-076, S-083, S-086, S-087, S-088, S-090, S-091, S-095, S-114, S-115,
S-116, S-117, S-118, S-119, S-120, S-121, S-149, S-425, S-433, S-472, S-473, S-474.

**Constantes nuevas.** `customsPriceBase` **1,0** · `customsSizeGain` **0,12** · `customsWindGain`
**0,4** · `customsLoyalInside` **0,25** · `customsRivalGap` **6** (mismo orden que
`chaseContenderMaxGap` 12, la mitad: aquí basta con «me puede ganar», no «es contendiente») ·
`customsGcPlaces` **3** · `customsJerseyVeto` **99** (sigue siendo veto, no descuento: cita del dueño
en v32) · `customsBigBreakRiders` **12** · `customsRevisionEveryKm` **1**.

**Se retira**: `tacticAllowBase` 0,3, `tacticAllowKmGain` 0,5, `tacticAllowSizePenalty` 0,05,
`tacticAllowGcPenalty` 0,75, `tacticAllowMax` 0,7. Se **conserva** `tacticAllowSettleFlatKm` 6 /
`ClimbKm` 100 / `Floor` 0,15: la rampa de arranque es correcta y está medida (v39, la cita de «en el
99 % de los casos en el km 1 ataca alguien»); pasa a multiplicar `payable`, no a la probabilidad.

**Cómo se mide.**

| Estadística                 | Qué cuenta                                                               | Banco                | Banda propuesta                           |
| --------------------------- | ------------------------------------------------------------------------ | -------------------- | ----------------------------------------- |
| `breakTeamMaxShare`         | máximo de hombres de un mismo equipo en la fuga del día                  | carrera pequeña, 8×6 | mediana **1**, p95 **≤ 2**, máximo **3**  |
| `breakTeamsRepresentedPct`  | equipos con motivo que acaban representados en la fuga del día           | carrera pequeña      | **55-90 %**                               |
| `breakMotivedPct`           | fugados con un motivo declarado (no relleno)                             | carrera pequeña      | **70-100 %**                              |
| `customsRevisionsPerStage`  | veces que un `allowed` cambia de valor después de nacer                  | llana canónica       | **0,5-4** (que la revisión sirva)         |
| `breakClimberShare` (reina) | fracción de la fuga del día con MON ≥ p60 del campo en etapas de montaña | reinas reales        | **≥ 0,5** (hoy: la fórmula es de rodador) |
| `flat.breakawayWinPct`      | ya existe                                                                | llana canónica       | §9: **5-16 → 6-18**                       |

El primero es el que contesta la queja literal del dueño («seis del mismo equipo en una fuga de
nueve») y **hoy no lo mide nadie**: `docs/diseno/mapa-bancos.md` §7.2 lo dice explícitamente.

---

### R04 · La general virtual y el colchón que depende de lo que queda (17 situaciones)

**Pieza.** Dos funciones puras y una tabla: `virtualGc(race)`, `costToMyMan(team, move)` y
`leashOf(team, raceShape)`.

**Reglas.**

```
R04.1  LA GENERAL VIRTUAL
       virtualS(f, gap) = gcDeficit(f) − gap                     # si esto se consolida
       costToMyMan(t, move) = #{ f ∈ move : virtualS(f, gap) < gcDeficit(carta_t) }
       → puestos que pierde MI hombre. Hoy solo existe frontThreatDeficit (el MEJOR de la fuga),
         que no dice nada de a quién le cuesta.                                (S-103, S-102)

R04.2  EL COLCHÓN SOBRE EL TERRENO QUE QUEDA (S-391, nº 14 de las veinte más graves)
       recoverable(r, shape) = gcClimbRecoverPerKm (1,6 s/km) · kmSubidaRestante
                             + gcTtRecoverPerKm    (1,1 s/km) · kmCronoRestante
                             + gcFlatRecoverBase   (25 s)      si quedan ≥ 3 etapas en línea
       leash(t) = clamp(recoverable(carta_t) · gcLeashShare (0,6), gcLeashMinS (90), gcLeashMaxS (900))
       → SUSTITUYE a gcControlLeash = 700, que es una constante y decide sola a quién se persigue
         durante toda la carrera. Día 3 de 21: leash ≈ 900 → se deja ir.
                                    Día 19 con una crono: leash ≈ 150 → se caza.

R04.3  QUIÉN DEFIENDE
       defensor(g) = el mejor colocado en la general PRESENTE en g            (S-239, S-258)
       colchón     = déficit del siguiente presente − déficit del defensor
       → hoy gcDefence exige déficit 0 y devuelve null si el maillot no va en el grupo, o sea que
         en un grupo de veinte sin el maillot NADIE defiende nada.

R04.4  EL MAILLOT PRESTADO (S-096, CONTRARIO)
       borrowed(t) = finishScore(carta_t, terrenoRestante) < bestFinishScore(campo, terrenoRestante)
                                                            − jerseyBorrowedGap (12)
       si borrowed: purpose 'maillot' pasa a claim jerseyBorrowedClaim (1) en vez de 4.
       → el equipo del cronista que perderá el maillot en la montaña NO se funde controlando.

R04.5  EL MAILLOT SIN EQUIPO (S-079, CONTRARIO)
       relayRaceLeaderPenalty (3) se aplica solo si el líder tiene ≥ 2 leales en su grupo.
       Con 0 o 1: el líder releva, o pierde el maillot. Es la mitad que faltaba de la regla del v57.

R04.6  EL TRASPASO EN CARRETERA (S-294)
       virtualLeaderId se recalcula cada km; en cuanto cambia:
             su equipo pasa de purpose 'general' a 'maillot' (deja de atacar, controla)
             y todos los demás con purpose general le atacan a ÉL.
```

**Cierra.** S-048, S-078, S-079, S-096, S-097, S-098, S-099, S-100, S-101, S-102, S-103, S-104,
S-181, S-239, S-258, S-294, S-391.

**Constantes nuevas.** `gcClimbRecoverPerKm` **1,6 s/km** · `gcTtRecoverPerKm` **1,1 s/km** ·
`gcFlatRecoverBase` **25 s** · `gcLeashShare` **0,6** (se conserva `gcThreatFraction`, mismo número y
mismo significado) · `gcLeashMinS` **90** · `gcLeashMaxS` **900** · `jerseyBorrowedGap` **12** (el
mismo `teamStageCardGap` que ya decide quién tiene carta) · `jerseyBorrowedClaim` **1**.

**Justificación de 1,6 s/km de subida**: es lo que hoy separa al 1.º del 10.º en la reina canónica
(mediana 40-300 s sobre 15 km de puerto ≈ 2,7-20 s/km entre extremos; 1,6 es el orden de la diferencia
entre dos hombres de general vecinos, no entre el mejor y el peor). Marcado **calibrar con banco**:
se mide sobre `realQueens` como «segundos que se mueve la general por km de subida», y el número
medido sustituye a 1,6 en el paso 12.

**Cómo se mide.** `leashSpanS` = recorrido del colchón entre el día 1 y el último de una gran vuelta;
banda **≥ 400 s de recorrido** (si no se mueve, la pieza no está haciendo nada). `chaseWhoPct` =
fracción de cazas cuyo objetivo declarado es el movimiento que MÁS cuesta al equipo que paga, no el
más adelantado; banda **85-100 %** (es la medida de S-176). Banco: `grandTour` y carrera pequeña.

---

### R05 · Motivos secundarios como claim de equipo (24 situaciones)

S-162 es la nº 13 de las veinte más graves: «sin motivos secundarios, dos tercios del pelotón no
tienen ninguna razón para correr».

**Pieza.** El vocabulario de motivos, y las clasificaciones que los alimentan.

```ts
type TeamPurpose =
  | 'maillot'
  | 'general'
  | 'etapa' // los tres de hoy
  | 'puntos'
  | 'montana'
  | 'joven'
  | 'equipos' // los cuatro maillots
  | 'combatividad'
  | 'patrocinador'
  | 'ranking' // los tres «blandos»
  | 'ninguno'

const PURPOSE_CLAIM = {
  maillot: 4,
  general: 3,
  etapa: 3,
  puntos: 2.5,
  montana: 2,
  joven: 2,
  equipos: 1,
  patrocinador: 0.5,
  combatividad: 0.5,
  ranking: 0.5,
  ninguno: 0,
}
```

**Reglas.**

```
R05.1  ORDENAR, NO SUMAR (S-020)
       El equipo activa UN motivo por km: el de mayor claim con condición cumplida.
       El secundario aporta claim 0 mientras el primario esté en intent perseguir|lanzar,
       y su claim entero en cuanto el primario esté satisfecho o sea 'nada'.
       → sustituye a teamDriveSecondCard (+0,2), que SUMA y por eso el maillot acaba cazando puntos.

R05.2  PUNTOS (S-016, S-105, S-196, S-383, S-407)
       activo si standings.puntos.deficit ≤ pointsChaseDeficit (40) o rank ≤ 3
       intent = 'perseguir'  en los bannerApproachKm (12) antes de una volante si gap ≤ pointsChaseMaxGapS (240)
       intent = 'nada'       en los bannerReliefKm (5) después                     (S-105 literal)
       el tren se monta DOS veces: en la volante y en meta (S-196), y los hombres gastados faltan.

R05.3  MONTAÑA (S-017, S-042, S-043, S-065, S-108)
       intent = 'fuga' siempre; cupo de aduana +1 los días con ≥ komDayPoints (30) puntos de cima
       nunca colabora en la caza
       si el rival directo de la clasificación entra en un intento: se mete con él a cualquier precio
            (appetite = 1 para el líder de montaña mientras ese intento viva)      (S-043)

R05.4  JOVEN (S-018, S-271, S-272)
       igual que 'general' pero el defensor y la amenaza se calculan sobre la clasificación de jóvenes.
       Un joven fuera del podio de la general y dentro del podio joven corre ESA carrera:
       no sigue a los favoritos, marca al otro joven.

R05.5  EQUIPOS (S-019, S-034, S-250, S-295, S-396)
       activo si teamsRank ≤ 5 o deficit ≤ teamsThreatS (240)
       efecto: helpBack se extiende al TERCER hombre del equipo, no solo al leaderId
       se apaga en cuanto el equipo baja de 3 corredores vivos.                    (S-396)

R05.6  PATROCINADOR / INVITACIÓN (S-066)
       para equipos con flag invited: cupo mínimo 1 TODOS los días, y appetite × sponsorGain (1,6)
       hasta que uno cuaje; después, 0 para el resto de la casa.

R05.7  COMBATIVIDAD (S-044, S-045)
       motivo individual, no de equipo: un cazaetapas con duty 'carta' y sin opciones de ganar
       conserva appetite alto todo el día; su objetivo es ESTAR, no llegar.

R05.8  RANKING ANUAL (S-447)
       activo el último tercio de la temporada para equipos en la frontera del ranking:
       en la meta, el corredor con este motivo entra en sprintContenders aunque no pueda ganar
       (esprinta por el duodécimo).

R05.9  EL MAILLOT QUE OBLIGA (S-452)
       campeón del mundo / nacional: customs.objection ajena × championWatchGain (1,35)
       y appetite propio × championShowGain (1,25): corre obligado a mostrarse.

R05.10 EL MAILLOT NO CAZA PUNTOS (S-015, CONTRARIO)
       autoOrders: si gcRank == 1, contestSprints = contestClimbs = false, sin excepción.
```

**Cierra.** S-015, S-016, S-017, S-018, S-019, S-020, S-031, S-034, S-041, S-042, S-043, S-044,
S-045, S-065, S-105, S-108, S-162, S-271, S-272, S-383, S-396, S-407, S-447, S-452.

**Dependencia dura**: esto exige que existan las clasificaciones. Hoy `packages/db/src/gcSort.ts`
solo resuelve la general. Hace falta `classifications.ts` con cuatro tablas acumuladas (puntos,
montaña, joven, equipos) y un `StandingRow[]` en el `StageRider`. **Va antes que el racimo**, en el
paso 4 de §8, y no cambia conducta por sí solo.

**Constantes nuevas.** `PURPOSE_CLAIM` (tabla) · `pointsChaseDeficit` **40** · `pointsChaseMaxGapS`
**240** · `bannerApproachKm` **12** · `bannerReliefKm` **5** · `komDayPoints` **30** ·
`teamsThreatS` **240** · `sponsorGain` **1,6** · `championWatchGain` **1,35** · `championShowGain`
**1,25**.

**Cómo se mide.** `motivePct` = fracción del campo con un motivo activo distinto de `ninguno`; hoy
sería ≈ 33 % por construcción (solo tres motivos y solo unos pocos equipos). Banda propuesta
**65-90 %** — es la traducción numérica de «dos tercios del pelotón no tienen ninguna razón para
correr». `secondaryJerseyOwnerPct` = maillots secundarios que acaban en manos de alguien que los
disputó a propósito (frente a subproducto); banda **70-100 %**. Banco: `grandTour` (que ya corre 21
etapas con general) más el nuevo de carrera pequeña. Invariante nuevo: **«los cuatro maillots tienen
dueño y ninguno se decide por accidente»**.

---

### R06 · Las pancartas: volante y cima como puntos del recorrido (20 situaciones)

**Pieza.** `banners.ts`: la pancarta como punto real del trazado.

```ts
type BannerPoint = {
  km: number
  kind: 'volante' | 'cima'
  category: 0 | 1 | 2 | 3 | 4 // 0 = HC
  points: number[] // a los N primeros
  bonusS: number[] // R07: puede ser []
  surgeKm: number // cuánto antes empieza el acelerón
}
```

**Reglas.**

```
R06.1  QUIÉN LA DISPUTA (S-137, S-141, CONTRARIOS)
       bannerAppetite(r, b) = base(r, b)
                            · (1 + komLeadGain (0,8) · esLíderOSegundoDeEsaClasificación)
                            · (1 + bannerOrderGain (1,5) · orders.contest*)         # S-031
       contienden solo los que pasan bannerContestMin (0,25); SOLO ELLOS pagan bannerCost.
       → hoy paga todo el que puntúa, y si nadie está interesado disputan TODOS.

R06.2  EL ACELERÓN (S-212, S-236)
       en los surgeKm antes de una pancarta con category ≤ 2 o points[0] ≥ 8:
             compromiso del grupo ≥ bannerSurgeCommit (0,90) para los contendientes
             y placement se pelea (R15): la pancarta es un punto de colocación.
       después, durante bannerReliefKm (5):
             compromiso × bannerReliefDamp (0,85)  y  λ × bannerReliefLambda (1,8)
             → la ventana de contraataque que hoy no existe.

R06.3  ORDEN DE PASO PARA TODOS LOS GRUPOS (S-220, ya CUBIERTO; S-153, CONTRARIO)
       el pelotón también esprinta la volante por los puntos que dejan los fugados:
             puntosDisponibles = points.slice(fugadosDelante)
             si puntosDisponibles no vacío y hay alguien con motivo 'puntos': se disputa.

R06.4  EL FUGADO QUE CORONA Y SE DEJA COGER (S-080)
       si el único motivo de un fugado era la montaña y ya coronó la última cima puntuable
       de su alcance:  giveUpLambda += komDoneGiveUp (0,5)

R06.5  EL SPRINTER QUE PASA EL INTERMEDIO Y SE VA AL GRUPETO (S-138)
       cobrada la volante, el sprinter con motivo 'puntos' cambia su duty a 'grupeto'
       al pie del primer puerto: giveUpLambda alto y voluntario (R26).

R06.6  CUÁNTO VALE EL PUERTO (S-140)
       climbWeight(b) = points[0] / komMaxPoints (20)
       λ de ataque en el puerto × (0,6 + 0,8·climbWeight): nadie se destroza por un cat. 4.

R06.7  SABER QUÉ SE LIDERA (S-035, S-221)
       SelfView.standings y el evento cima llevan la ACUMULADA: «pasa a liderar la montaña».
```

**Cierra.** S-033, S-035, S-080, S-109, S-124, S-136, S-137, S-138, S-140, S-141, S-142, S-153,
S-196, S-212, S-220, S-221, S-236, S-315, S-336, S-373.

**Constantes nuevas.** `komLeadGain` **0,8** · `bannerOrderGain` **1,5** · `bannerContestMin`
**0,25** · `bannerSurgeCommit` **0,90** · `bannerReliefDamp` **0,85** · `bannerReliefLambda` **1,8**
· `komDoneGiveUp` **0,5** · `komMaxPoints` **20** · `bannerSurgeKm` **2** (volante) / **3** (cima).

**Dependencia**: exige que el generador de recorridos coloque pancartas. Hoy solo hay una meta
volante en el escenario canónico y las cimas se derivan del perfil. Va con el paso 1 (el perfil).

**Cómo se mide.** `bannerContestants` = corredores que pagan `bannerCost` por pancarta; banda
**3-15** (S-137 literal: «esprintan entre tres y quince»). `bannerCostOnUninterested` = coste cobrado
a corredores sin motivo; banda **0** (invariante duro). `postBannerAttackPct` = pancartas seguidas de
un intento en los 5 km siguientes; banda **20-50 %**. Banco: llana canónica (que ya tiene volante en
el km 100) y `grandTour`.

---

### R07 · Bonificaciones (6 situaciones)

**Pieza.** Los segundos de meta ya existen y ya se restan; falta la **pancarta con segundos** y el
número **visible** para quien decide.

```
R07.1  BonusS en la pancarta (S-193): bonusS = [3,2,1] en volantes de vuelta que lo declaren.
       Los disputan los hombres de general cuando gcDeficit del rival ≤ bonusChaseDeficitS (20).

R07.2  EL NÚMERO VISIBLE (S-334, S-353)
       en el remate, un hombre con purpose maillot|general y un rival a ≤ bonusChaseDeficitS:
             entra en sprintContenders aunque su finishScore no lo justifique
             y su score × (1 + bonusStakeGain (0,08))   # se juega algo, aprieta

R07.3  EL QUE YA LA TIENE HECHA (S-335)
       si colchón > bonusIgnoreCushionS (180): finishScore del maillot × leaderConcedeWeight (0,6).
       No se pelea la etapa; a veces la regala.

R07.4  EL SPRINTER-MAILLOT (S-352, CONTRARIO)
       autoOrders paso 0: el maillot manda sobre el terreno, PERO si el maillot es el mejor SPR
       del equipo y el final admite llegada agrupada, conserva rol 'sprinter' y su tren.
       Lo que se le quita es contestClimbs, no el sprint.
```

**Cierra.** S-193, S-334, S-335, S-352, S-353, S-360.

**Constantes nuevas.** `bonusChaseDeficitS` **20** · `bonusStakeGain` **0,08** ·
`bonusIgnoreCushionS` **180** · `leaderConcedeWeight` **0,6**.

**Cómo se mide.** `bonusDecidedRacePct` = vueltas llanas cuya general la decide una bonificación;
banda **10-40 %** en un calendario de vueltas de solo llano (Sharjah/Arabia). `jerseyInSprintPct` =
sprints masivos con el maillot entre los diez primeros teniendo colchón < 20 s; banda **50-100 %**.
Banco: `smallTours` (que ya lleva Arabia).

---

### R08 · El depósito que persiste entre etapas (16 situaciones)

**Frontera con `diseno-entrenamiento.md`, que ya está cerrado.** Ese documento se queda con la
mitad fisiológica: depósito, cerillos, REC en `isDeepDepleted` y en el umbral de TSB, recuperación por
edad. **Este documento no la toca ni la contradice**: se limita a la mitad táctica, que es cómo el
director LEE ese estado al planificar.

```
R08.1  EL PARTE DEL EQUIPO (S-398, S-399, S-410)
       El director ve, por hombre: freshness, cerillos, bruised, illDays, kmAlFrente acumulados.
       teamBudget del día = teamBudgetPerRider (9) · Σ_leales fitFactor(r) · dayWeight(día)   # R10
       fitFactor(r) = clamp(0,4 + 0,6·freshness(r), 0,4, 1)
       → el equipo que ayer tiró 120 km hoy tiene menos presupuesto y pone a otros dos.

R08.2  EL TOCADO Y EL ENFERMO (S-380, S-381, S-144)
       bruised → duty degradado a 'peon' o 'grupeto'; no entra al turno, no arriesga en descenso
                 (crashLambda × bruisedCrashGain 1,4), giveUpLambda × 1,6.
       illDays crece varios días antes de un abandono, no es un dado de un día (S-381).
       La decisión de seguir mira lo que se juega, no solo la soledad:
             abandonAppetite × (1 − stakeOf(r))   con stakeOf = duty carta ? 0,7 : general ? 0,4 : 0

R08.3  EL LÍDER ADMINISTRA LA VUELTA, NO LA ETAPA (S-379, CONTRARIO)
       matchBudgetRace(r) = matches · raceMatchShare(día, shape)  # R10
       un favorito NO gasta un cerillo en una media montaña del día 6:
             appetite = 0 si duty == 'carta' de general y !isMarkedDay y phase != 'decisivo'
             salvo que costToMyMan > 0.

R08.4  EL QUE LLEGA SIN RITMO (S-468) y EL QUE VIENE DE UNA VUELTA (S-385)
       raceRhythm ∈ [0,1] entra en el StageRider (lo calcula packages/db):
             coste del bloque × (1 + rhythmCostGain (0,25)·(1 − raceRhythm)) en la primera hora
             placement inicial peor  ·  appetite × raceRhythm

R08.5  LA RETIRADA POR ORDEN (S-450) y LA SEMIETAPA (S-431)
       el equipo puede bajar a un hombre sano y gastado entre etapas (decisión de packages/db).
       Un día con dos sectores es DOS StageInput con el mismo día y depósito encadenado.
```

**Cierra.** S-144, S-377, S-378, S-379, S-380, S-381, S-385, S-389, S-398, S-399, S-410, S-411,
S-431, S-450, S-468, S-482.

**Constantes nuevas.** `bruisedCrashGain` **1,4** · `rhythmCostGain` **0,25** · `stakeOf` (tabla) ·
el resto sale de R10.

**Cómo se mide.** `frontTeamRotationDays` = días distintos en que cambia el equipo que más tira en una
gran vuelta; banda **≥ 8 de 21** (hoy no se mide). `jerseyTeamFadeDay` = día en que el equipo del
maillot deja de poder controlar; banda **día 9-18** (S-399). Banco: `grandTour`.

---

### R09 · Las deudas y el humor del pelotón (21 situaciones)

**Pieza.** `RaceMemory` **como entrada**, no como estado del motor. La construye `packages/db`
leyendo `stage_snapshots` de los días anteriores; el motor la recibe en `StageInput` y no la escribe.
Esto es deliberado: mantiene el motor puro y por tanto no rompe ni un banco.

```ts
type RaceMemory = {
  day: number
  stageWinners: { riderId: string; teamId: string | null; day: number }[]
  breakawayDaysByTeam: Map<string, number[]> // quién fugó qué días  (S-408, S-046)
  frontKmByTeam: Map<string, number> // quién ha pagado             (S-398)
  relayDebt: { from: string; to: string; day: number }[] // quién no relevó a quién (S-081)
  teamsWithWin: Set<string> // ya cumplieron                (S-397)
  daysSinceResult: Map<string, number> // desesperación               (S-402)
  rivalries: [string, string][] // parejas que no colaboran     (S-404)
  goodwill: Map<string, number> // se gana concediendo treguas  (R12)
  moodCause: MoodCause // por qué el pelotón está así
  truceRequested: boolean
}
type MoodCause =
  | 'ninguno'
  | 'reina_ayer'
  | 'vispera_reina'
  | 'post_descanso'
  | 'vispera_descanso'
  | 'traslado_largo'
  | 'calor'
  | 'tregua'
  | 'ultima_etapa'
```

**Reglas.**

```
R09.1  EL HUMOR TIENE CAUSA (S-224, S-234, S-422, S-424, S-427, S-484)
       humor = pelotonMoodCentre (0,9) + Σ efectos + N(0, pelotonMoodSpread)
       efectos:  reina_ayer −0,12 · vispera_reina −0,08 · post_descanso −0,06
                 vispera_descanso +0,05 · traslado_largo −0,05 · calor −0,10·calor
                 ultima_etapa −0,20 hasta el circuito, luego +0,10        (S-075)
       Y EL DADO SE ENCOGE: pelotonMoodSpread 0,14 → 0,07.
       → el humor deja de ser un dado y pasa a ser una consecuencia, que es la fila literal.

R09.2  LA MEMORIA DE LA ADUANA (S-423, S-425, S-106, S-401)
       memoryFactor(t, move) =
             × customsYesterdayWinner (1,6)   si dentro va el ganador de ayer
             × customsRevelation (1,4)        si dentro va el que saltó ayer al top-10
             × customsBurnedUs (1,5)          si t es un equipo de sprinters al que la fuga
                                                le robó la etapa AYER                (S-106)

R09.3  LA DEUDA DE RELEVOS (S-081, S-413, S-453)
       si (A,B) ∈ relayDebt de los últimos debtMemoryDays (3):
             relayDuty(A) −= relayDebtPenalty (0,8) en cualquier grupo donde vaya B
       y el trato dentro de la fuga (S-453) es un acuerdo explícito:
             si A cede la etapa a B por la volante, A no entra en sprintContenders
             y B no disputa la pancarta. Se registra y se cobra mañana si alguien lo rompe.

R09.4  LA DESESPERACIÓN Y LA CONFORMIDAD (S-397, S-402)
       desperation(t) = clamp(daysSinceResult(t) / desperationDays (7), 0, 1)
       cupo de aduana +1 con desperation ≥ 0,7 ; teamAttackFactor × (1 + 0,5·desperation)
       si t ∈ teamsWithWin: teamAttackFactor × wonAlreadyDamp (0,7) y presupuesto × 0,8

R09.5  RIVALIDADES Y ALIANZAS (S-404, S-174)
       (t1,t2) ∈ rivalries → nunca forman alianza en frontAuction, aunque coincida el interés.
       goodwill(t) sube al conceder una tregua y baja al negarla o al atacar sobre un percance;
       una alianza pedida a un equipo con goodwill < 0 se rechaza.

R09.6  EL PACTO DE NO AGRESIÓN (S-426)
       tras dos días con demandaDelDia ≥ truceDemand (110) o una caída masiva:
             moodCause = 'tregua', humor × 0,8 y la aduana se abre a la primera.

R09.7  LA ROTACIÓN DEL FUGADO (S-046, CONTRARIO)
       el que fugó ayer NO tiene veto: tiene COSTE. quota(t) − 1 y appetite × yesterdayBreakDamp (0,4).
       Un cazaetapas especialista sigue pudiendo repetir, que es lo que la fila pide.
```

**Cierra.** S-046, S-081, S-106, S-224, S-229, S-234, S-354, S-397, S-401, S-402, S-403, S-404,
S-408, S-413, S-422, S-423, S-424, S-426, S-427, S-453, S-484.

**Constantes nuevas.** `pelotonMoodSpread` **0,14 → 0,07** · tabla de efectos de humor ·
`customsYesterdayWinner` **1,6** · `customsRevelation` **1,4** · `customsBurnedUs` **1,5** ·
`relayDebtPenalty` **0,8** · `debtMemoryDays` **3** · `desperationDays` **7** · `wonAlreadyDamp`
**0,7** · `yesterdayBreakDamp` **0,4** · `truceDemand` **110**.

**Cómo se mide.** `sameWinnerNextDayPct` = ganador que repite en días consecutivos. El banco midió
1,8 % (1 de 57) y el dueño ve otra cosa en producción: la diferencia está en el tamaño del campo, así
que **se mide en la carrera pequeña**. Banda propuesta **2-12 %**. `breakTeamRepeatPct` = fuga del
día con el mismo equipo que ayer; banda **0-25 %** (S-408: «casi nunca repite»). `moodCauseNamedPct`
= etapas cuyo humor tiene causa nombrada; banda **60-100 %**.

---

### R10 · El plan de varios días (12 situaciones)

**Pieza.** `RacePlan` por equipo, construido en la convocatoria y guardado en `packages/db`. Entra al
motor como parte del `TeamPlan` del día.

```ts
type RacePlan = {
  teamId: string
  objective: 'general' | 'etapas' | 'sprints' | 'montana' | 'joven' | 'presencia'
  structure: TeamStructure // §5
  markedDays: number[] // el día objetivo    (S-405)
  dayWeight: number[] // suma = nDays        (S-055)
  matchPlan: number[] // cerillos por día    (S-379, S-382)
}
```

**Reglas.**

```
R10.1  PRESUPUESTO POR DÍA, NO POR HOMBRE (S-055, S-405)
       dayWeight(d) = 1,0 base
                    × dayMarkedGain (1,6)  si d ∈ markedDays
                    × dayEveDamp    (0,6)  si d+1 ∈ markedDays
                    × dayAfterDamp  (0,7)  si d−1 ∈ markedDays
       normalizado a Σ dayWeight = nDays: gastar de más hoy se paga mañana de verdad.

R10.2  LA CRONO DENTRO DEL PLAN (S-382, S-386, S-387, S-394)
       si shape.kmCrono > 0:
             el que va a perder ttLossEstimate ≥ ttPanicS (90) contra el líder
             marca la VÍSPERA de la crono como día objetivo y ataca de lejos.       (S-394)
             La víspera, los cronistas no entran en fugas (appetite × 0,3).         (S-387)
             Si la general la hace la crono, las etapas en línea son 'control':
                  claim del maillot 4 → jerseyTtControlClaim (2,5)                  (S-386)

R10.3  LA CORRECCIÓN DEL PLAN (S-376, S-403, S-409, S-420)
       tras cada etapa, packages/db reevalúa:
             si carta perdió > planReviewLossS (120) sin ser el día marcado:
                   markedDays.push(el próximo día apto)  y  el equipo ataca mañana.  (S-376)
             si carta perdió > structureBreakS (300): cambia la estructura (R21).
```

**Cierra.** S-022, S-028, S-055, S-376, S-382, S-384, S-386, S-387, S-394, S-405, S-409, S-420.

**Constantes nuevas.** `dayMarkedGain` **1,6** · `dayEveDamp` **0,6** · `dayAfterDamp` **0,7** ·
`ttPanicS` **90** · `jerseyTtControlClaim` **2,5** · `planReviewLossS` **120** · `structureBreakS`
**300**.

**Cómo se mide.** `budgetSpentOnMarkedPct` = fracción del presupuesto de carrera que un equipo gasta
en sus días marcados; banda **25-55 %** (con 21 días y 2-3 marcados, el azar daría 10-14 %).
`eveOfQueenGapS` = ventaja de la fuga la víspera de una reina frente a la media; banda **≥ 1,3×**
(S-427). Banco: `grandTour`.

---

### R11 · Percances mecánicos y el coche de equipo (10 situaciones)

Racimo entero `AUSENTE` (10 de 10). Es una pieza nueva, no una corrección. Y desbloquea R12 (S-222
es la nº 18 de las veinte más graves: «bloquea el precio de cualquier percance»).

**Pieza.** `mishap.ts`, con la misma forma que `crash.ts` (dado por bloque, radio, consecuencias).

```ts
type Mishap = {
  riderId: string
  kind: 'pinchazo' | 'averia' | 'rueda_cedida'
  km: number
  stopS: number
  needsCar: boolean
}
```

**Reglas.**

```
R11.1  EL DADO
       λ_mishap(block) = mishapBase (0,00008 /km)
                       · terrainFactor { llano 1, subida 1,2, descenso 1,5, paves 20, tierra 45 }
                       · (1 + mishapRainGain (0,6)·lluvia)
                       · (1 + mishapPlacementGain (0,5)·placement)     # atrás se pincha más
       → 20× en pavés es lo que hace que S-283 («pinchazo en el peor sitio») exista.

R11.2  EL COCHE (S-222, S-435)
       carArrivalS(r) = carBaseS (25)
                      + carPerPlaceS (0,35) · placeInBunch(r)
                      + carConvoyRankS (4)  · (convoyRank(teamOf(r)) − 1)
       convoyRank sale de la general (el equipo del líder va el primero) y cambia cada día.
       En cabeza de carrera o en un puerto cerrado: carArrivalS × carNoAccessGain (3).
       stopS = carArrivalS + mishapChangeS (12 pinchazo | 25 avería)

R11.3  EL ASCENSOR DE LA CARAVANA (S-435)
       mientras haya caravana y no se suba: el que vuelve gana caravanPullS (12 s/km)
       durante caravanMaxKm (6). En puerto, 0.

R11.4  LA RUEDA Y LA BICI (S-201)
       el sacrificio material es la BICI, y solo si coinciden talla y pedales:
             sameBike(a,b) = |altura_a − altura_b| ≤ bikeSwapCm (3)
       el que la cede pierde stopS entero y su día se acaba.

R11.5  QUIÉN SE PARA (S-145, S-156, S-298)
       dos leales con duty 'peon' y freshness ≥ helpBackMinFreshness bajan a por la carta;
       el pelotón NO espera salvo tregua concedida (R12).
       Dentro de la fuga (S-111): se espera solo si el hueco con el pelotón lo permite
             y si ese hombre da relevos que hacen falta:
             wait = gapToPeloton > mishapWaitMinGapS (75) ∧ pullShare(r) ≥ 1/party

R11.6  EN LA CRONO (S-127, S-202, S-375)
       simulateTimeTrial deja de devolver incidents: [] y emite pinchazo/caída con
       ttMishapLambda (0,015 por corredor): 1-4 % de incidentes.
       → es lo que hace que el corte del 25 % de la crono deje de ser «una salvaguarda dormida».
```

**Cierra.** S-111, S-127, S-146, S-192, S-201, S-202, S-222, S-283, S-298, S-435.

**Constantes nuevas.** `mishapBase` **0,00008/km** · `terrainFactor` (tabla) · `mishapRainGain`
**0,6** · `mishapPlacementGain` **0,5** · `carBaseS` **25** · `carPerPlaceS` **0,35** ·
`carConvoyRankS` **4** · `carNoAccessGain` **3** · `mishapChangeS` **12/25** · `caravanPullS`
**12 s/km** · `caravanMaxKm` **6** · `bikeSwapCm` **3** · `mishapWaitMinGapS` **75** ·
`ttMishapLambda` **0,015**.

**Justificación de `mishapBase`**: 0,00008/km × 180 km × 176 corredores ≈ 2,5 percances por etapa
llana, y × 20 en un sector de pavés de 30 km da ≈ 8 más. Es el orden de la carretera real (una
clásica de pavés vive de eso). **Calibrar con banco** contra `inv. 44` (pavés: 5-12 % de bajas por
caída), que no puede subir por culpa de los pinchazos: los pinchazos no son bajas.

**Cómo se mide.** `mishapsPerStage` banda **1-5** en llano, **5-20** en pavés. `mishapCostMedianS`
banda **35-80 s** en llano (coche + cambio + vuelta a rebufo) y **≥ 150 s** dentro de un sector.
`ttIncidentPct` banda **1-4 %**. Invariante nuevo: **«el corte de la crono ya no es una salvaguarda
dormida»** (algún corredor por debajo del 25 % en el banco de cronos reales).

---

### R12 · Caídas: la tregua, el rescate y el tiempo (18 situaciones)

**Pieza.** La tregua como suceso **que alguien pide**, no como un umbral de terreno. Depende de R24
(la noticia llega tarde) y de R11 (el coche).

**Reglas.**

```
R12.1  LA NOTICIA (S-478, nº 19 de las veinte más graves)
       un percance en el km k llega al frente en k + newsLagKm(t) y llega MAL:
             P(newsWrong) = newsWrongProb (0,25) → nombre equivocado, gravedad equivocada
                            o número equivocado de afectados.
       TODA la lógica siguiente decide sobre la creencia, no sobre el hecho.

R12.2  LA TREGUA SE PIDE (S-237)
       si la víctima es carta de maillot|general de t y t tiene frontClaim > 0:
             t emite truce_requested en el km en que se entera.
       el pelotón CONCEDE si:  phase ∉ {decisivo, desenlace}
                             ∧ kmToGo > truceMinKmToGo (25)
                             ∧ goodwill(t) ≥ 0                                    (R09)
                             ∧ ningún equipo con purpose general tiene virtualGain ≥ ambushMinGainS (30)
       concedida: compromiso = min(compromiso, truceCommit (0,45)) durante truceKm (3)
                  goodwill(concedentes) += 1
       negada:    el que la niega se lleva goodwill −= 2, y eso se cobra mañana.

R12.3  LA EMBOSCADA (S-195)
       negar la tregua y APRETAR es una decisión explícita de un equipo con purpose general
       y su hombre delante: compromiso ≥ ambushCommit (0,88) durante ambushKm (8).
       Cuesta reputación (goodwill) y presupuesto; no es gratis.

R12.4  EL RESCATE ESCALONADO (S-290, S-198, S-288)
       bajan de 1 a 4 leales, todos menos uno:
             elegibles ordenados por (freshness desc, LLA desc)   # rodadores, no escaladores
             n = clamp(ceil(gapS / rescuePerManS (35)), 1, leales − 1)
       el grupo de rescate rueda a SUS fuertes (v36 lo probó y el tope perjudicaba: no se cambia)
       y el jefe puede RENUNCIAR: si duty == 'carta' y orders.effort == 'ahorrar', no se baja nadie.

R12.5  LA REGLA DE LOS 3 KM (S-374)
       si km ≥ total − 3 ∧ mishap|crash|corte ∧ finishType ∉ {alto, crono}:
             tiempo del grupo en el que iba. En alto y en crono, cada uno el suyo.

R12.6  EL MONTÓN Y EL TAPÓN (S-251, S-466)
       crashPile ya existe. Se añade el TAPÓN: en un bloque con roadClass 'revirada' o sector
       estrecho, una caída bloquea a los de detrás:
             afectados = los de placement ∈ [p_caído, p_caído + tapónShare (0,25)]
             pierden tapónLossS (30-60 s) o ponen pie a tierra.

R12.7  LA CAÍDA DENTRO DE LA FUGA (S-110, CONTRARIO)
       aritmética, no cortesía: misma condición que R11.5.
```

**Cierra.** S-110, S-145, S-156, S-195, S-198, S-199, S-200, S-213, S-237, S-251, S-252, S-290,
S-297, S-374, S-435, S-456, S-466, S-478.

**Constantes nuevas.** `truceMinKmToGo` **25** · `truceCommit` **0,45** · `truceKm` **3** ·
`ambushMinGainS` **30** · `ambushCommit` **0,88** · `ambushKm` **8** · `rescuePerManS` **35** ·
`tapónShare` **0,25** · `tapónLossS` **30-60**.

**Cómo se mide.** `truceRequestedPct` y `truceGrantedPct`; bandas **5-20 %** de las etapas con caída
de una carta, y **50-85 %** de concesión. `rescueSuccessPct` = jefes cortados que vuelven; hoy se
midió 66-81 % según la variante; banda **55-80 %**. `newsLagEffectS` = diferencia de tiempo perdido
entre el mismo escenario con y sin retardo; se mide en un banco pareado y se publica sin banda el
primer paso, con banda **≥ 8 s** después. Banco: `grandTour` y un escenario ad hoc de caída.

---

### R13 · Fatiga y hundimiento dentro de la etapa (14 situaciones)

7 de 14 ya `CUBIERTO`: la moneda física existe y está medida. Lo que falta es que el **estado sea
observable** y que alguien reaccione.

```
R13.1  OLER LA SANGRE CON IDENTIDAD (S-319, S-269 —CONTRARIO nº 9—, S-288)
       read = readState(observador, objetivo)   ∈ [0,1]      # R24, con error
       para cada rival de general con read ≤ bloodThreshold (0,45):
             appetite × (1 + bloodGain (0,7)·(bloodThreshold − read)/bloodThreshold)
       → el día que el maillot cede, sus rivales ATACAN MÁS. Hoy atacan menos.

R13.2  EL GREGARIO SE APARTA AL VER (S-259, S-288)
       si un leal ve a su carta con drifting ≥ mateWatchDrift (0,3): sale del turno YA,
       sin esperar a los 22 s de hueco, y le marca el ritmo (markedPerfil, que ya existe).

R13.3  LA PÁJARA DEL QUE TIRA (S-206)
       si el hombre en turnHead cae por debajo de pullerCollapseFraction (0,15) de depósito:
             sale del turno, se narra, y entra el siguiente de SU equipo si lo hay.

R13.4  COMER (S-147, S-226)
       feedZones ∈ el perfil (1-2 por etapa). kmSinceFeed > feedMaxKm (60):
             bonkLambda × feedStarveGain (2,5)
       en la zona de avituallamiento: compromiso × feedZoneDamp (0,85) y no se ataca.
       La parada técnica colectiva se CONVOCA (tiene autor) cuando la fuga pasa de convoyGapS (180).

R13.5  FRÍO Y DESCENSO (S-148)
       en descenso con lluvia y temperatura baja: coste × (1 + coldCostScale (0,06))
       y el equipo pasa chaquetas en la cima (una decisión: cuesta coldStopS (8 s), evita el coste).
```

**Cierra.** S-112, S-147, S-148, S-206, S-260, S-269, S-277, S-288, S-319, S-454, S-455, S-461,
S-467, S-475.

**Constantes nuevas.** `bloodThreshold` **0,45** · `bloodGain` **0,7** · `mateWatchDrift` **0,3** ·
`pullerCollapseFraction` **0,15** · `feedMaxKm` **60** · `feedStarveGain` **2,5** · `feedZoneDamp`
**0,85** · `convoyGapS` **180** · `coldCostScale` **0,06** · `coldStopS` **8**.

**Cómo se mide.** `attacksWhenLeaderCracks` = ataques por km en los 10 km siguientes a que el maillot
empiece a derivar, dividido por la media de la etapa. Hoy sería **< 1** (el motor lo apaga); banda
propuesta **1,5-3,5**. `bonkFeedPct` = pájaras atribuibles a no comer; banda **20-60 %** de las
pájaras. Banco: reinas reales y `grandTour`.

---

### R14 · Meteorología con previsión (12 situaciones)

**Pieza.** El clima como estado del día **con segmentos**, anunciado antes y citable.

```ts
type WeatherPlan = {
  reliability: number // [0,1], baja si el parte es de hace días
  segments: {
    fromKm: number
    lluvia: number
    calor: number
    frio: number
    windDir: number
    windKmh: number
  }[]
}
type WeatherNow = { lluvia; calor; frio; vientoLateral; vientoFrontal; abanicoAbierto }
```

```
R14.1  VIENTO CON DIRECCIÓN (S-203, S-324)
       vientoLateral y vientoFrontal salen de windDir contra el rumbo del bloque.
       vientoFrontal ∈ [−1,1]: targetSpeed × (1 − windAheadScale (0,08)·vientoFrontal)
       EL ABANICO SE CIERRA cuando la carretera gira: si vientoLateral cae por debajo de
       echelonCloseThreshold (0,35) durante echelonCloseKm (2), abanicoAbierto = false
       y los cortados pueden volver.                                       (S-324, CONTRARIO)

R14.2  LA LLUVIA LLEGA (S-205, S-204)
       segments permite lluvia a mitad de etapa. Con lluvia y purpose maillot|general:
             el equipo sube a todos sus hombres al frente (placement objetivo ≤ rainPlaceTarget 0,15)
             y lo paga: presupuesto del día siguiente × rainCostGain (1,15).      (S-204)

R14.3  EL PARTE ES PÚBLICO Y CITABLE (S-032, CONTRARIO)
       WeatherPlan entra en la pantalla de órdenes (ya está) y en triggerOn (R22):
             «si llueve en el adoquín, me coloco delante desde el km 40».

R14.4  MATERIAL (S-430) y ETAPA ACORTADA (S-037)
       elección de material por equipo antes de la etapa: 3 opciones, efecto ±2 puntos de
       perfil en el terreno que corresponda, penalización si se falla el parte.
       Recorte de etapa: el generador puede acortar con aviso previo.

R14.5  DESCENSO CON LLUVIA (S-281, S-325)
       el que lleva la general baja protegido: descentRisk(r) = 0,3 si duty carta con colchón,
       1,0 si necesita ganar. Cede 10-30 s a propósito. El bajador abre 20-40 s (R15/S-465).
```

**Cierra.** S-032, S-037, S-203, S-204, S-205, S-238, S-281, S-299, S-324, S-325, S-430, S-462.

**Constantes nuevas.** `windAheadScale` **0,08** · `echelonCloseThreshold` **0,35** ·
`echelonCloseKm` **2** · `rainPlaceTarget` **0,15** · `rainCostGain` **1,15** · `descentRisk` (tabla).

**Aviso**: R14.1 toca `targetSpeed`, o sea **física**. Va en su propio paso, con `ENGINE_VERSION++`,
y mueve **todas** las huellas y la ley de velocidad (invariante 43). Es el único paso de este
documento que toca la física, y por eso está separado y es opcional.

**Cómo se mide.** `echelonClosedPct` = abanicos que se cierran antes de meta; banda **30-70 %** (hoy:
0 %, «el viento sopla todo el día»). `windDayGapS` = brecha del día de viento frente a la media;
banda **1,5-4×**. Banco: llana canónica con `lugar` y `smallTours`.

---

### R15 · Colocación y posición como recurso (25 situaciones)

El racimo más caro y el que más filas `AUSENTE`/`PARCIAL` tiene (23 de 25). **Se parte en dos** por
coste y por riesgo.

#### R15a — `placement` existe y lo leen los sitios que hoy usan un dado

```
R15a.1  EL ESTADO
        placement(r) ∈ [0,1], 0 = cabeza del grupo. Inicial: 0,5 + N(0, 0,15).
        Deriva por bloque:
              placement += placeDriftPerKm (0,04)·dx        # si no haces nada, retrocedes
                         − placeGainPerKm (0,25)·dx·pushing # si empujas
              pushing ∈ [0,1] lo decide el capitán/el corredor (R15b)
        Coste de empujar: blockCost × (1 + placePushCost (0,45)·pushing)

R15a.2  EL ACORDEÓN (S-189, cita del dueño: el puesto ciento veinte)
        en llano nervioso (phase ∈ {aproximacion, desenlace} o roadClass 'revirada'):
              blockCost × (1 + accordionGain (0,35)·placement)
        → arropar SÍ ahorra energía, y no por el viento: por el acordeón. Es la fila literal.
        Esto sustituye al descuento por gregarios que la v38 retiró con razón.

R15a.3  EL ABANICO DEJA DE SER UN DADO DE COLOCACIÓN (S-155, S-460, S-243)
        corte(): los que entran son los cabenEnFila con MENOR placement.
        Se retiran windPlacementTeam (25), windPlacementLeader (12), windPlacementLuck (10):
        el equipo que quiere estar delante lo consigue GASTANDO, no con un bonus por ser el dueño.

R15a.4  EL SPRINT (S-445, S-446, S-481)
        placementSd deja de ser un dado por tamaño de grupo y pasa a leer placement real:
              scoreFinal × placeFinishWeight(placement)
              placeFinishWeight = 1 − placeFinishMax (0,18)·placement
        ENCAJONADO: si placement > boxedThreshold (0,55) y lanes llenos:
              el corredor no llega a abrir → launchEffect = boxedEffect (0,72).   (S-445)
        ÚLTIMO GIRO: en una curva dentro de los últimos lastTurnKm (1,5):
              los tres primeros salen con turnGainM (2,5 cuerpos) y el resto pierde.

R15a.5  LA RUEDA QUE ELIGES (S-490)
        en fila (abanico, sector, tirón final): placement(r) ≥ placement(wheelAhead(r)).
        Si el de delante abre hueco, TODOS los de detrás lo pagan por buenos que sean.

R15a.6  EL SECTOR (S-241, S-282, S-463, S-480)
        entrar a un sector con placement > sectorSafePlace (0,25) cuesta sectorLossS (8 s/sector)
        y multiplica λ_mishap. En TIERRA además: no se remonta (placeGainPerKm × 0,25 por el polvo).
        Y la ley del sector: el pavé cobra POSICIÓN, con exponente sectorExponent (0,52)
        entre el aire del llano (0,39) y la gravedad (1,0).                       (S-480)

R15a.7  EL BAJADOR (S-465)
        si el equipo tiene un leal con DES ≥ descenderMin (72) y duty peon:
              va delante de la carta en el descenso; la carta baja a su rueda y no pierde.
        Sin bajador: la carta cede descentNoHelperS (20 s) en un descenso decisivo sin ataque.
```

#### R15b — colocar cuesta y se puede ordenar

```
R15b.1  LA ORDEN TARDA (S-489)
        mover k leales desde placement p hasta ≤ 0,15 cuesta:
              placeMoveKm = placeMoveBaseKm (2,5) + placeMovePerManKm (0,4)·k
              y un cerillo por hombre si p > 0,5.
        El director lo tiene que decidir con placeMoveKm de antelación, y con creencia (R24):
        llegar tarde a colocar es la forma más común de perder sin hacer nada mal.

R15b.2  LA PELEA POR EL SITIO (S-240, S-242, S-243, S-252)
        en los approachKm antes de un pie de puerto, sector o embudo:
              cada equipo con carta fija pushing = 1 para approachHelpers (3) leales
              compromiso del grupo ≥ approachCommit (0,88)
              crashLambda × approachCrashGain (2,2)  ← por eso se cae la gente donde se cae (S-252)

R15b.3  ABRIR EL HUECO A PROPÓSITO (S-457)
        un corredor puede NO cerrar el hueco que tiene delante para dejar fuera a un rival:
              si duty peon y el de detrás es amenaza de mi carta y phase ∈ {aproximacion, decisivo}:
                    P(no cerrar) = gateOpenProb (0,25)·(1 − read(rival))
        Es lo que convierte el abanico en decisión y no en dado.

R15b.4  DOS TRENES POR EL MISMO CARRIL (S-481)
        lanes = clamp(floor(roadWidth / 1,5), 1, 4)
        si trenes > lanes: el de fuera paga trainOutsideCost (1,3×) y obliga al de dentro
        a abrir trainForcedEarlyM (80 m) antes → los dos pierden.
```

**Cierra.** S-155, S-160, S-165, S-189, S-240, S-241, S-242, S-243, S-248, S-252, S-254, S-282,
S-369, S-428, S-430, S-446, S-457, S-460, S-463, S-465, S-466, S-480, S-481, S-489, S-490.

**Constantes nuevas.** `placeDriftPerKm` **0,04** · `placeGainPerKm` **0,25** · `placePushCost`
**0,45** · `accordionGain` **0,35** · `placeFinishMax` **0,18** · `boxedThreshold` **0,55** ·
`boxedEffect` **0,72** · `lastTurnKm` **1,5** · `turnGainM` **2,5** · `sectorSafePlace` **0,25** ·
`sectorLossS` **8** · `sectorExponent` **0,52** · `descenderMin` **72** · `descentNoHelperS` **20** ·
`placeMoveBaseKm` **2,5** · `placeMovePerManKm` **0,4** · `approachHelpers` **3** ·
`approachCommit` **0,88** · `approachCrashGain` **2,2** · `gateOpenProb` **0,25** ·
`trainOutsideCost` **1,3** · `trainForcedEarlyM` **80**.

**Coste**: un float por corredor y bloque, y una ordenación por grupo y bloque solo donde se lee
(abanico, sector, sprint). Medido en el paso: listón **≤ 8 % del coste de etapa**. Si lo supera,
`placement` se actualiza cada 2 bloques en vez de cada uno; el catálogo no pide resolución de 100 m
para la posición.

**Cómo se mide.** `echelonByDecisionPct` = abanicos con autor declarado; banda **50-100 %** (hoy 0 %).
`boxedLossPct` = sprints masivos en que el mejor SPR pierde por encajonamiento; banda **8-25 %**
(S-445). `placementCostShare` = fracción del gasto del día en colocar; banda **5-20 %**. Banco:
llana canónica con viento, clásica de pavés (Flandes), carrera pequeña.

---

### R16 · El tren de sprint como submotor de 15 km (14 situaciones)

**Pieza.** `SprintTrain` con estado, no un `elTren` que a 3 km convierte el turno en lanzadores.

```ts
type SprintTrain = {
  teamId: string
  cardId: string
  launchers: string[] // en orden de relevo, del primero al último
  index: number
  state: 'formando' | 'tirando' | 'roto' | 'lanzado'
}
```

```
R16.1  SE FORMA A LOS 15 KM (S-351, S-347)
       en kmToGo ≤ trainFormKm (15) cada equipo con carta de sprint monta su tren con
       hasta trainMaxLaunchers (3) leales por (LLA desc, freshness desc).
       Cada lanzador tira trainTurnKm { 5, 3, 1,5 } y se aparta. index++ al agotarlo.

R16.2  ASCENSOS (S-356)
       si un lanzador se funde (freshness < 0,2), se descuelga o abandona: index++ y el
       siguiente hereda su turno. Si no queda ninguno: state 'roto', la carta se queda sola
       y chaseField SE RECALCULA sin ese tren (hoy es una foto de salida: deuda anotada).

R16.3  CUÁNTOS TRENES Y DE QUIÉN (S-355)
       trains = equipos con carta de sprint y ≥ 1 lanzador vivo en el grupo. Banda 2-5.
       sprintRegimeKmh ya lee el número; ahora el número es real.

R16.4  EL SPRINTER SIN TREN (S-337, S-338)
       elige rueda: wheelPick = el tren con mejor (quality − 0,5·placement del hueco libre).
       Su placement sigue al del tren elegido; launchStandoffM × 0,7. Pierde por colocación,
       no por piernas.

R16.5  DOS CARTAS Y UN FINAL AMBIGUO (S-291, S-185)
       la carta se recalcula por el finishType de los ÚLTIMOS 3 km y por el grupo que queda.
       Un equipo con maillot y velocista: el maillot va a rueda del propio tren en los últimos
       3 km (protegido) y el velocista lo esprinta. Los dos, no uno.

R16.6  ESTORBARSE (S-481) → R15b.4.
```

**Cierra.** S-185, S-291, S-337, S-338, S-342, S-346, S-347, S-348, S-351, S-355, S-356, S-372,
S-445, S-481.

**Constantes nuevas.** `trainFormKm` **15** · `trainMaxLaunchers` **3** · `trainTurnKm`
**{5, 3, 1,5}** · `wheelPickWeight` **0,5**.

**Se retira**: `sprintTrainKm` 3 como frontera del tren (pasa a ser solo la del `sprintRegimeKmh`).

**Cómo se mide.** `trainsPerBunchFinish` banda **2-5**. `trainBrokenPct` = trenes que llegan rotos a
la flamme; banda **20-55 %** (S-356: pasa a menudo). `leadOutWinShare` = victorias del sprinter con
tren completo frente a sin tren; banda **1,4-2,5×**. Banco: `smallTours` y llana canónica.

---

### R17 · El tipo de final se calcula por grupo (16 situaciones)

Ya existe `finishType(terrain, groupSize)` y ya se calcula por grupo (S-370 `CUBIERTO`). Lo que falta
es que **la carta y los roles salgan de ahí** (S-049 y S-047 son los `CONTRARIO` nº 4 de las veinte
más graves) y tres detalles del último kilómetro.

```
R17.1  LOS ROLES SALEN DEL FINAL REAL (S-047, S-049)
       autoOrders recibe deriveFinishTerrain(profile) y finishType(terrain, 40) en vez de stage.kind.
       Consecuencias: el sprinter es la carta en TODA etapa donde pueda ganar (puncheur incluido);
       el jefe de general lo es aunque vaya 12.º; media montaña se decide por el final previsto.
       → arregla de paso «el 70 % del campo acaba de gregario» (deuda §14.14).

R17.2  EL TIPO GANA UN VALOR: 'muro'
       muro = cota ≤ 1 km de meta con g ≥ 8 %.  finishWeights.muro = {COL 0,55, SPR 0,2, TAC 0,15, RES 0,1}
       → S-327 y S-330 dejan de compartir tipo con un puncheur de 4 km.

R17.3  QUIÉN ABRE EL SPRINT REDUCIDO (S-339, hoy INVERTIDO)
       launchBias(r) = launchWorstFinisherM (+90 m) · (1 − finishRank(r))
       → abre ANTES el que peor remata, no el más rápido. Es la fila literal.

R17.4  EL PAVÉ DEL FINAL SE MIDE EN LOS ÚLTIMOS 3 KM, no en 30 (S-480, S-369).

R17.5  EL GRUPO DE CABEZA DE UNA REINA (S-367, la DEUDA sin banda)
       no es una regla nueva: es la CONSECUENCIA de R02 (los compañeros colaboran),
       R18 (la colaboración se rompe tarde en un grupo pequeño) y R13 (los rivales atacan).
       Se le pone banda por primera vez: medianLeadGroupRiders 3-10.
```

**Cierra.** S-049, S-274, S-278, S-316, S-327, S-328, S-330, S-331, S-339, S-340, S-341, S-367,
S-370, S-445, S-446, S-480.

**Constantes nuevas.** `finishWeights.muro` (tabla) · `launchWorstFinisherM` **+90 m** ·
`paveFinishKm` **30 → 3**.

**Cómo se mide.** `medianLeadGroupRiders` (existe, mide **1**, es la deuda de la v23) → banda
**3-10**. `roleFromFinishPct` = etapas en que la carta del equipo coincide con el mejor del equipo
para el final REAL; banda **85-100 %**. `gregarioSharePct` banda **45-65 %** (hoy 70 %). Banco:
reinas reales y `smallTours`.

---

### R18 · La colaboración que se rompe (21 situaciones)

**Pieza.** El turno con **duración y orden** (S-492, `AUSENTE`), montado sobre el `relayTurn` que ya
existe con su listón, su techo de veinte y su suelo de cuatro (S-477 `CUBIERTO`).

```
R18.1  EL TURNO ES UNA COLA (S-492)
       Turn = { order: string[], head: number, kmLeft: number }
       turnPullKm = { llano 0,6 · subida 0,3 · abanico 0,25 }
       el que agota su turno pasa al FINAL de la cola; no vuelve a cabeza hasta que gire entera.
       La pertenencia se recalcula cada km (relayTurn, sin cambios); el ORDEN persiste.
       Efecto colateral gratis: `pulling` deja de ser una bandera y pasa a ser «voy en la cabeza
       de la cola», que es lo que R03.4(b) quería decir.

R18.2  QUIÉN NO PASA, Y POR QUÉ (S-122, S-128, S-133, S-256, S-474)
       sittingOn(r) con MOTIVO nombrado, que la crónica publica:
             'mate_ahead' (R01) · 'team_on_front' · 'debt' (R09) · 'no_chance' (existe)
             'order_refuse' (R22/S-256) · 'infiltrado' (R03) · 'saving' (effort ahorrar)
       CONTAGIO: existe (coopContagionWeight 0,6). Se conserva.

R18.3  LA RUPTURA CERCA DE META (S-253, S-363, S-364, S-366)
       tres regímenes en vez de uno:
             kmToGo > breakFinaleKm (15):  compromiso normal
             8 < kmToGo ≤ 15:              compromiso ≥ breakFinaleCommit (0,92)   # a bloque
             kmToGo ≤ collabBreakKm (8):   compromiso = restCommit · collabBreakDamp (0,55)
                                            y λ de ataque interno × 3
       QUIÉN CIERRA (S-364): cierra el que más pierde si el ataque prospera
             closer = argmax_r (finishScore(r) − finishScore(atacante)) entre los que pueden
             y el que ha cerrado closerMaxTimes (2) ya no cierra el tercero.
       EL PASAJERO (S-366): pullShare(r) < 1/(2·party) → los demás bajan el ritmo
             compromiso × (1 − passengerDamp (0,12)) y su score de meta × 0,93.

R18.4  GRUPOS PEQUEÑOS (S-301, S-302, S-264, S-333)
       fuga de dos: relevan hasta pairBreakKm (4); es el grupo que MÁS tarde deja de relevar.
       fuga de tres: el peor rematador ataca cuando margen > trioAttackMarginS (45).
       SOLITARIO (S-264, S-333, CONTRARIOS): su compromiso se REEVALÚA, no se hereda:
             soloCommit = clamp(0,55 + 0,40·(1 − kmToGo/soloDoseKm (60)), 0,5, 0,97)
             → dosifica lejos y se vacía cerca, con el mismo suelo que el tirón final del pelotón.

R18.5  LA ALIANZA DENTRO DE LA FUGA (S-082, S-453)
       dos que se entienden (mismo equipo, o pacto de S-453) relevan a tope entre sí
       y dejan fuera al que no colabora: turnPullKm × allyTurnGain (1,3) entre aliados.

R18.6  CUPO DEL TURNO POR EQUIPOS (S-210, cita literal del dueño)
       techo del turno = min(members, relayRotationMax (20), Σ_t min(presentes(t), perTeamCap))
       perTeamCap = ceil(relayRotationMax / equiposColaborando)   # «si hay 4 equipos, 5 de cada uno»

R18.7  RENEGOCIAR AL FUSIONAR (S-209) y EL GRUPO SIN EQUIPOS (S-235)
       mergeGroups recalcula el turno entero (hoy hereda el máximo de compromiso).
       El listón del pelotón (1,5) no se aplica a los agentes libres: para ellos, relayDutyThresholdLoose.
```

**Cierra.** S-082, S-122, S-208, S-209, S-210, S-235, S-253, S-257, S-264, S-301, S-302, S-333,
S-361, S-363, S-364, S-366, S-368, S-453, S-477, S-491, S-492.

**Constantes nuevas.** `turnPullKm` **{0,6 / 0,3 / 0,25}** · `breakFinaleKm` **15** ·
`breakFinaleCommit` **0,92** · `collabBreakKm` **8** · `collabBreakDamp` **0,55** ·
`closerMaxTimes` **2** · `passengerDamp` **0,12** · `pairBreakKm` **4** · `trioAttackMarginS` **45** ·
`soloDoseKm` **60** · `allyTurnGain` **1,3** · `perTeamCap` (derivada).

**Aviso de historia**: `breakFinaleCommit` y `breakClimbCommit` **ya se probaron y se revirtieron**
en la v44 (`dc489a6`). Se vuelven a proponer porque ahora no van solos: con el turno con orden y con
la ruptura a 8 km, el mecanismo que faltaba —«en un grupo decisivo cerca de meta la colaboración se
rompe», deuda §14.4— está entero. Se marca como **el paso con más riesgo de regresión** y va con
medición pareada.

**Cómo se mide.** `soloWinMediaPct` = ganadores en solitario en media montaña; hoy **4 %**, el dueño
pidió **20-30 %**; banda propuesta **12-28 %** (por debajo del 20 porque el dueño pidió el número
mirando producción, no el banco; se recalibra en el paso 12). `relayRefusalNamedPct` = negativas a
relevar con motivo nombrado; banda **90-100 %**. `turnRotationKm` = km medio de un turno; banda
**0,4-0,9**. Banco: media montaña canónica (hoy sin banda: **entra en CI**) y carrera pequeña.

---

### R19 · Fases explícitas y sus ventanas (19 situaciones)

Este racimo mata los dos `CONTRARIO` que apagan la capa táctica entera: S-444 (`tacticMaxMoves` 3) y
S-487 (`closingNow`).

```ts
type Phase =
  | 'neutralizado'
  | 'salida'
  | 'fuga'
  | 'control'
  | 'caza'
  | 'aproximacion'
  | 'decisivo'
  | 'desenlace'
  | 'captura'
  | 'tregua'
```

```
R19.1  CÓMO SE CALCULA (cada km)
       neutralizado : km < neutralKm (perfil)
       salida       : sin dayBreak ∧ km < settleKm
       fuga         : sin dayBreak
       captura      : durante capturaKm (1) tras una captura
       tregua       : truce concedida (R12)
       decisivo     : (onClimb ∧ raceThisClimb) ∨ (sector decisivo) ∨ kmToGo ≤ lateAttackKm
       desenlace    : kmToGo ≤ finalDriveKm ∧ finishType admite agrupada
       aproximacion : approachKm antes de puerto/sector/embudo
       caza         : gap decreciendo con compromiso ≥ 0,75
       control      : el resto

R19.2  LA TABLA DE FASE (sustituye a los umbrales sueltos)
       phase          λscale  commitFloor  customs  insideAttack  helpBack  maxMoves
       neutralizado    0,00      0,35        no        no           no        0
       salida          0,60      0,45        sí        no           sí        2
       fuga            1,00      0,50        sí        no           sí        4
       control         0,45      0,55        sí        sí(tensión)  sí        4
       caza            0,55      0,75        sí        sí           sí        4
       aproximacion    0,70      0,88        no        sí           no        5
       decisivo        1,30      —           no        sí           no        6
       desenlace       1,00    finalDrive    no        sí           no        6
       captura         2,50      0,45        sí        sí           sí        6
       tregua          0,10      0,45        no        no           sí        1

R19.3  SE RETIRA tacticMaxMoves = 3 (S-444, CONTRARIO)
       El techo pasa a ser por fase Y por grupo de origen (el cooldown de 4,5 km ya existe).
       Motivo escrito: un contador de grupos vivos decidía si se podía intentar algo ANTES de
       mirar quién quedaba, cuánto faltaba y quién mandaba.

R19.4  SE RETIRA closingNow como veto (S-487, CONTRARIO)
       Mientras el pelotón cierra un intento sin cuerda, SE SIGUE ATACANDO: es justo cuando salta
       el bueno, por el otro lado y con el que cerraba ya gastado.
       El cierre deja de ser un veto y pasa a ser PRECIO: payable(t) × closingBusyDamp (0,7).

R19.5  LA VENTANA DE LA CAPTURA (S-231, S-329, ambas caras de la misma frontera)
       fase 'captura' 1 km, y luego contraataqueKm (2) con λ × 2,5.
       Y DENTRO DE ESA VENTANA EL SUELO DEL TIRÓN FINAL NO SE APLICA:
             es lo que hoy tapa el bajón entero dentro de los últimos 15 km.

R19.6  EL FLYER (S-326, CONTRARIO)
       tacticNoAttackKm 3 → flyerKm (0,8), con λ_flyer bajo y solo para el peor rematador
       del grupo cuando el terreno ayuda (repecho, curva, viento de cola).
       Objetivo declarado: gana el 2-5 % de las llanas.

R19.7  EL PUENTE DESDE ATRÁS (S-132) y DEJARLO MARCHAR (S-173)
       attemptFrom(shed, 'puente') permitido. La aduana del puente en R03.6.

R19.8  LA ETAPA CORTA DE MONTAÑA (S-471)
       si total < shortMountainKm (145) ∧ climbShare > 0,5:
             se salta 'fuga' y 'control': de 'salida' a 'decisivo' en el primer puerto.
```

**Cierra.** S-116, S-121, S-130, S-131, S-132, S-152, S-169, S-170, S-173, S-218, S-231, S-232,
S-326, S-329, S-350, S-444, S-471, S-476, S-487.

**Constantes nuevas.** tabla de fases · `capturaKm` **1** · `contraataqueKm` **2** ·
`closingBusyDamp` **0,7** · `flyerKm` **0,8** · `lambdaFlyer` **0,08** · `shortMountainKm` **145** ·
`approachKm` **6**.

**Se retira**: `tacticMaxMoves` **3**, `tacticControlCommit` como rama exclusiva.

**Cómo se mide.** `attemptsPerStage` hoy ≈ 12 en llano y se corta a 3 movimientos vivos; banda
propuesta **10-25** con **≥ 2 intentos después del km 100** (invariante nuevo, porque el defecto
medido de S-487 es literalmente «cuatro intentos hasta el km 19 y ni uno más en los 190 restantes»).
`counterAfterCatchPct` = capturas seguidas de un contraataque en 3 km; banda **25-60 %`.
`flyerWinPct` en llanas; banda **1-6 %**. Banco: llana canónica y Race Almeria e1 (el caso citado).

---

### R20 · El pulso por el frente: quién paga la caza (20 situaciones)

Contiene S-176, el `CONTRARIO` **nº 1** de las veinte más graves.

```
R20.1  A QUIÉN SE PERSIGUE (S-176)
       El objetivo de la caza no es frontMove() sino, POR EQUIPO:
             target(t) = argmax_move  cost(t, move)         # R04: lo que me cuesta
             desiredGap(t) = leash(t)                       # R04.2
       y el compromiso del pelotón sale del MÍNIMO desiredGap entre los equipos que pagan.
       → si delante van tres irrelevantes y detrás el 2.º de la general, se persigue al segundo.

R20.2  LA SUBASTA DEL FRENTE (S-166, S-167, S-171)
       cada km:  claim(t) = PURPOSE_CLAIM[purpose(t)] · presence(t) · (1 − spent(t))
       dueño = argmax claim, con la histéresis de hoy (teamFrontHandoverSpent 0,35 / Edge 0,2).
       SI HAY EMPATE dentro de frontTieBand (0,5): 2-3 equipos comparten
             cada uno a frontSharedIntensity (0,7) del empuje
             → «si el frente no tiene dueño único, deberían tirar 1, 2 o 3 equipos pero con MENOR
                INTENSIDAD» (cita del dueño, hoy solo implementada como noOwnerCommitFactor 0,94).

R20.3  EL PULSO (S-166)
       si dos equipos tienen objection > 0 y ninguno tiene payable ≥ price:
             ninguno empieza durante standoffKm (0,8·(1 + goodwillGap))
             y la fuga gana standoffGainS (≈ 25 s/km de pulso).

R20.4  LA ALIANZA SE PIDE Y SE ROMPE (S-174, S-175)
       askAlly(t1,t2) si objection>0 en ambos, (t1,t2) ∉ rivalries y goodwill ≥ 0.
       Reparto desigual por construcción: el de más claim pone allyMajorMen (2), el otro 1.
       Se rompe el km en que uno de los dos ve su objection en 0 → el otro hereda el muerto
       y la fuga vuelve a crecer.

R20.5  EL QUE SE ESCONDE Y EL QUE PAGA DE MÁS (S-172, S-151, S-170)
       purpose general no amenazado → intent 'nada' (ya existe: «tira tú, que es tu problema»).
       El que ha llevado el frente frontFadeKm (80) pide relevo y NO vuelve (ya existe).
       El que caza y no llega paga dos veces (ya existe vía presupuesto).

R20.6  CAZAR CUESTA CORREDORES (S-230, CONTRARIO)
       tras chaseHardKm (20) con compromiso ≥ 0,85 en llano:
             corte(peloton) puede dispararse SIN viento, con λ = chaseShatterLambda (0,010/km)
             → el pelotón se parte por su propia caza, y el grupo que caza se hace más pequeño.

R20.7  EL PRECIO LO PONE LA CARRETERA (S-493)
       roadFactor { abierta 0,80 · normal 1,00 · revirada 1,45 }
       multiplica price(move) en R03 y el cierre necesario en el lazo de la caza.

R20.8  EL EQUIPO DE CAZAETAPAS NUNCA PERSIGUE (S-186, CONTRARIO)
       intentFor(purpose 'ninguno' | 'combatividad') nunca devuelve 'perseguir'.
       Prueba contras mientras hay cuerda y después se sienta.

R20.9  LA POLÍTICA DE CAZA COMO ORDEN (S-071) → R22.
```

**Cierra.** S-071, S-150, S-151, S-166, S-167, S-168, S-171, S-172, S-174, S-175, S-176, S-178,
S-180, S-186, S-230, S-296, S-442, S-474, S-477, S-493.

**Constantes nuevas.** `frontTieBand` **0,5** · `frontSharedIntensity` **0,7** · `standoffKm`
**0,8** · `standoffGainS` **25 s/km** · `allyMajorMen` **2** · `frontFadeKm` **80** ·
`chaseHardKm` **20** · `chaseShatterLambda` **0,010/km** · `roadFactor` (tabla).

**Se retira**: `noOwnerCommitFactor` 0,94 (lo sustituye R20.2, que es la regla que el dueño pidió).

**Cómo se mide.** `chaseTargetCorrectPct` (ver R04) banda **85-100 %**. `frontTeamsPerStage` banda
**1,8-4 → 2,2-4,5**. `standoffGapGainS` = segundos que gana la fuga durante un pulso; banda
**40-200 s**. `chaseSplitPct` = llanas en que la caza parte el pelotón; banda **5-25 %**. Banco:
llana canónica (voz de equipo, invariantes 21-23) y carrera pequeña.

---

### R21 · La estructura de equipo persistente y la carta del día (23 situaciones)

Todo el contenido está en **§5**, porque es donde el dueño dictó las estructuras. Aquí solo el
resumen de cierre y la medida.

**Cierra.** S-001, S-002, S-003, S-004, S-005, S-006, S-007, S-008, S-021, S-047, S-049, S-050,
S-051, S-052, S-053, S-179, S-190, S-197, S-390, S-392, S-395, S-469, S-483.

**Cómo se mide.** `structureFitPct` = escuadras cuya estructura es legal para el recorrido (nunca un
lanzador sin sprinter, nunca ocho escaladores en una vuelta llana); banda **95-100 %** (invariante
duro). `cardInheritedPct` = equipos que pierden su carta y nombran otra al día siguiente; banda
**80-100 %**. `structureChangesPerRace` banda **0-2**. Banco: carrera pequeña y `grandTour`.

---

### R22 · El sistema de órdenes del jugador (35 situaciones)

Todo el contenido está en **§6**. Cierra S-011, S-023, S-024, S-025, S-026, S-029, S-030, S-031,
S-032, S-040, S-054, S-057, S-058, S-059, S-060, S-061, S-062, S-063, S-067, S-068, S-069, S-070,
S-071, S-125, S-214, S-215, S-216, S-217, S-256, S-320, S-321, S-322, S-323, S-415, S-421.

---

### R23 · El relato que explica el porqué (14 situaciones)

Es el racimo más barato después de R01 y el que hace visible todo lo demás: sin él, ninguna regla
nueva se puede diagnosticar.

```
R23.1  pullMotive gana valores: 'propio' (S-434, el jefe que se hace su propio ritmo),
       'equipo_puntos' | 'equipo_montana' | 'equipo_joven' | 'equipo_equipos', 'colocando' (R15),
       'tren' (existe), 'aliado' (R20.4), 'infiltrado' (R03.5, y se narra como que NO tira).
R23.2  time_gap gana costsToTeams: [{teamId, places}]  → «a quién le cuesta» (S-219, S-440).
R23.3  peloton_split gana cause: 'puerto'|'sector'|'viento'|'caza'|'caida'  (S-441).
R23.4  el tope de tres protagonistas se sustituye por: hasta tres NOMBRES + conteo + equipos
       («y otros seis, cuatro de ellos del equipo X»)                          (S-439).
R23.5  el informe personal DEJA DE RE-SIMULAR y lee los eventos congelados     (S-418, CONTRARIO).
R23.6  el informe cruza orden con hecho: «esto se decidió aquí y tú habías dicho esto otro» (S-417).
R23.7  el corredor propio SIEMPRE aparece nombrado en su radio                 (S-419).
```

**Cierra.** S-056, S-218, S-219, S-221, S-416, S-417, S-418, S-419, S-420, S-434, S-439, S-440,
S-441, S-449.

**Cómo se mide.** El banco de coherencia ya existe y mide 12 contradicciones con tolerancia cero.
Se añaden dos: `motivoSinDestinatario` (un `pullFor` que nombra a alguien que no está en el grupo:
ya corregido en v59, se sella) y `cribaSinCausa` (banda **0**). `ataqueSinCerrar` puede **bajar de 2
a 0** gracias a R23.4, que es exactamente lo que su comentario decía que hacía falta.

---

### R24 · Directores bot falibles (11 situaciones)

Contiene tres de las veinte más graves (S-458, S-478, S-488). Es la capa que hace posibles G9 y S-014
**sin tocar la física**: mismos vatios, distinto número en la pizarra.

```ts
type Belief = { gapS: number; size: number; atKm: number; sure: number }
```

```
R24.1  CALIDAD DE DIRECCIÓN
       dirQuality(t) ∈ [0,1]: base por división { WT 0,85 · PRS 0,65 · CON 0,50 }
       ± un dado por carrera de sd dirQualitySd (0,10). Determinista por semilla de carrera.

R24.2  EL NÚMERO DE LA PIZARRA (S-458)
       infoLagKm(t)  = dirLagBase (0,8) + dirLagQuality (1,2)·(1 − dirQuality)
       boardRound(t) = 5 s si dirQuality ≥ 0,8; 10 s si ≥ 0,6; 15 s si no
       believe(t, move) = redondear(gapReal(km − infoLagKm), boardRound) + N(0, boardSd(t))
       boardSd(t)    = dirSdBase (6 s) + 18·(1 − dirQuality)
       → se empieza a cazar tarde, se afloja pronto, y la caza deja de salir clavada.

R24.3  LA NOTICIA DEL SUCESO (S-478)
       newsLagKm(t) = newsLagBase (1,2) + 1,5·(1 − dirQuality)
       P(newsWrong) = newsWrongProb (0,25)·(1 − dirQuality)·2
       → tregua, rescate y emboscada se deciden sobre información equivocada.

R24.4  LO QUE SE VE DEL RIVAL (S-488)
       readState(obs, tgt) = clamp(trueFraction(tgt)
                                   + N(0, signalSd(TAC_obs))
                                   + hideGain (0,35)·disguise(tgt), 0, 1)
       signalSd(tac) = 0,28 − 0,0022·tac        # TAC 90 → 0,08 ; TAC 40 → 0,19
       disguise(tgt) = 1 si duty 'carta' ∧ TAC ≥ 70 ∧ reserveS > 0     # sube sentado, cara de fresco
       → oler la sangre PUEDE fallar, y el jefe tocado puede esconderse. Alimenta R13.1.

R24.5  EL CAPITÁN DE RUTA (S-459)
       captain(t, g) = el leal presente de mayor TAC.
       Decide cuando (km − plan.lastOrderKm) > infoLagKm: entrar al turno, soltar el frente,
       esperar a un compañero, cerrar un hueco. Solo con GroupView; nunca con RaceView.

R24.6  ÓRDENES MALAS (S-013)
       con dirQuality < badOrderThreshold (0,55), un dado por etapa (badOrderProb = 0,25·(1 − q))
       produce UNA de las cuatro que el juego ya sabe enumerar:
             lanzador sin sprinter · sprinter en reina · gregario del hombre equivocado ·
             no nombrar carta teniéndola.

R24.7  LA EJECUCIÓN TARDA (S-489) → R15b.1.
```

**Cierra.** S-009, S-010, S-012, S-013, S-014, S-029, S-458, S-459, S-478, S-488, S-489.

**Constantes nuevas.** `dirQualityByDivision` **{0,85 / 0,65 / 0,50}** · `dirQualitySd` **0,10** ·
`dirLagBase` **0,8** · `dirLagQuality` **1,2** · `dirSdBase` **6 s** · `newsLagBase` **1,2** ·
`newsWrongProb` **0,25** · `hideGain` **0,35** · `signalSd` (fórmula) · `badOrderThreshold` **0,55**
· `badOrderProb` (fórmula).

**Riesgo declarado**: este paso **desafina todas las cazas** y por tanto mueve `flat.catchKmToFinish`,
`capturePct` y las cuatro huellas. Es el precio de que S-152 y S-169 puedan fallar, que es lo que
piden. Va tarde en el plan (paso 11), con medición pareada `dirQuality = 1` contra la real.

**Cómo se mide.** `catchLatePct` = cazas que llegan tarde por decisión tardía; banda **8-25 %** (hoy
0 %). `catchKmSd` = desviación del km de captura; banda **≥ 4 km** (hoy: «salen siempre clavadas»).
`qualityWinEdge` = victorias de equipos WT frente a CON con el mismo campo; banda **1,15-1,6×** (que
la calidad de dirección valga algo, pero no más que las piernas). Banco: carrera pequeña con niveles
mezclados y `smallTours`.

---

### R25 · El precio de obedecer y de desobedecer (6 situaciones)

**Pieza.** `trust` por corredor-equipo (existe ya como `teamTrust` en `callups.ts`, con peso 0,4 en
`callupScore`) y `morale` (existe). Lo que falta es que **algo lo mueva**.

```
R25.1  trust(r) −= rebelTrustCost (12)  y  morale −= 4   al correr de rebelde sin permiso
R25.2  trust(r) += dutyTrustGain (3)    al cumplir un trabajo caro: kmAlFrente ≥ 40,
                                        helpBack ejecutado, o lanzamiento con pullWindow ≥ 0,4
R25.3  morale += winMoraleGain (8) al ganar; −= failMoraleCost (5) al fallar siendo la carta
       El crecido ATACA más: appetite × (1 + moraleAttackGain (0,25)·(morale − 50)/50)   (S-384)
R25.4  LA CARTA BLANCA (S-024): el equipo puede conceder 'exceptuado' por un día.
       Con permiso, ir por libre NO cuesta trust. Sin permiso, sí.
R25.5  EL MÁNAGER JUEZ Y PARTE (S-027): nombrarse jefe siempre baja el trust de TODOS los demás
       leales trustAbuseCost (2)/día, y el trust bajo mueve la salida en el mercado.
R25.6  EL RECONOCIMIENTO DEL RECORRIDO (S-429): knowsRoad(r, tramo) por nacionalidad y
       ediciones corridas: +recceTac (4) de TAC efectivo en ESE tramo.
```

**Cierra.** S-011, S-027, S-384, S-393, S-414, S-429.

**Constantes nuevas.** `rebelTrustCost` **12** · `dutyTrustGain` **3** · `winMoraleGain` **8** ·
`failMoraleCost` **5** · `moraleAttackGain` **0,25** · `trustAbuseCost` **2** · `recceTac` **4**.

**Cómo se mide.** `trustSpreadEndSeason` = desviación de `teamTrust` al final de una temporada; banda
**≥ 12 puntos** (si no se separa, la pieza no hace nada). `rebelCallupDropPct` = caída de
convocatorias de un rebelde reincidente; banda **20-60 %**. Banco: `world.ts` (25 temporadas), que ya
existe y es barato (~12 s).

---

### R26 · El grupeto y el corte (14 situaciones)

La apuesta que falta debajo de todo: **mientras el corte readmita siempre y a todos, el tamaño del
grupeto no es un activo** (S-494).

```
R26.1  LA READMISIÓN MIRA EL NÚMERO (S-494, S-464)
       llegados = los que entran fuera de control
       si |llegados| ≥ readmitBlockRiders (20): readmisión EN BLOQUE con penalización
                                                  (pierden puntos, no la general)
       si no: fuera, salvo el tope del 4 % que ya existe.
       → por primera vez el grupeto tiene algo que perder, y por eso se organiza.

R26.2  EL GRUPETO ES UN GRUPO CON CAPO (S-310, S-311, S-365)
       capo = el de mayor TAC entre los que llevan equipo dentro.
       targetLossS = cutEstimate · grupetoSafety (0,85)
       cutEstimate = tiempoDelGanador_estimado · timeCutFraction(desnivel) ± N(0, cutSd (0,02))
             → EL NÚMERO NO EXISTE hasta que alguien gana: el grupeto lo ESTIMA y se equivoca.
       compromiso se elige para que la pérdida prevista ≈ targetLossS: aprieta si va justo,
       pasea si va holgado.
       ESPERA POR IDENTIDAD (S-311): a un sprinter con equipo dentro, a un compañero; no solo
       por tamaño.

R26.3  EL GRUPETO VOLUNTARIO (S-139, S-135, ambos CONTRARIO)
       giveUpLambda devuelve 0 hoy para lider|sprinter|cazaetapas. Cambia:
             sprinter en etapa con climbShare ≥ 0,25:  λ ALTA desde el pie del primer puerto
                   (grupetoOptOutKm en vez de giveUpKm 25) y con sus gregarios (S-184)
             lider con gcDeficit > gcOutOfRaceS (900):  λ alta — ya no juega nada  (S-135)
             el que sigue siendo carta: λ = 0, como hoy.

R26.4  LA CUENTA QUE VIENE DE AYER (S-412)
       marginFromYesterday entra en RaceMemory: el grupeto se organiza sabiendo el margen que
       arrastra, y aprieta si lo gastó.

R26.5  EL GRUPETO QUE YA NO ES LA CARRERA SÍ SE CRIBA (S-443, deuda §14.2)
       shatter se aplica a TODOS los shed, no solo al que lleva el título de mainId.
       Esto sube la cola de las reinas por encima del 14 % y es exactamente por eso que la deuda
       está anotada: la banda con ancla en §VI.3 es DECISIÓN DEL DUEÑO (§10).
```

**Cierra.** S-135, S-139, S-184, S-216, S-310, S-311, S-359, S-365, S-371, S-375, S-412, S-443,
S-464, S-494.

**Constantes nuevas.** `readmitBlockRiders` **20** · `grupetoSafety` **0,85** · `cutSd` **0,02** ·
`grupetoOptOutKm` (= km del primer puerto) · `gcOutOfRaceS` **900**.

**Cómo se mide.** `grupetoMarginS` = margen con que el grupeto entra en el corte; banda **60-420 s**
(hoy no se mide; si es siempre enorme, no hay tensión). `outOfTimePct` **1-15 %** (existe).
`voluntaryGrupetoPct` = sprinters que se descuelgan antes de que duela en etapas de montaña; banda
**50-90 %**. Banco: `grandTour` y reinas reales.

---

### R27 · La crono como modo de carrera (14 situaciones)

```
R27.1  DOSIFICACIÓN ORDENABLE (S-143, S-125, CONTRARIO)
       ttPacing ∈ {'a_tope','progresivo','conservador'} (orden del jugador o del director)
       efecto sobre el reparto de esfuerzo por tramo y sobre el riesgo de hundirse:
             a_tope      → −ttAllOutS (12 s) esperados, ×2,2 de P(hundimiento en el último tercio)
             conservador → +ttSaveS (10 s), sin riesgo, guarda depósito para mañana
       El gregario sin nada que jugarse corre al ttDomestiqueShare (0,70) dentro del corte.

R27.2  LAS REFERENCIAS (S-332, S-039, S-036)
       el maillot corre con los parciales del 2.º: si va perdiendo > ttPanicSplitS (8 s)
       en un parcial, sube el riesgo; si va ganando, baja.
       Orden de salida inverso a la general: ya existe (`startOrder.ts`), y AHORA IMPLICA algo.

R27.3  PERCANCES (S-127, S-202, S-375, S-436) → R11.6, más el cambio de bici PLANEADO:
       en una crono mixta el equipo decide antes el punto del cambio: cuesta ttBikeSwapS (18 s)
       y gana ttBikeGainPerKm (0,35 s/km) en el terreno adecuado.

R27.4  MARCAR TIEMPO PARA EL JEFE (S-021)
       un leal sale antes con la orden de marcar tiempo: su parcial se le comunica al jefe
       y le da ttPacerGainS (5 s) por referencia.

R27.5  LA LOTERÍA DEL HORARIO (S-462)
       WeatherPlan por franja: los últimos (los favoritos) pueden coger lluvia o viento.
       Efecto medio ttWeatherSpreadS (±20 s) por franja.

R27.6  CRE (S-163) — es un FORMATO entero, no un momento. Fuera de alcance de este documento:
       §10 decisión 11.
```

**Cierra.** S-021, S-036, S-039, S-072, S-125, S-126, S-127, S-143, S-263, S-332, S-382, S-436,
S-462. (S-163 queda anotada, no cerrada.)

**Constantes nuevas.** `ttAllOutS` **12** · `ttSaveS` **10** · `ttDomestiqueShare` **0,70** ·
`ttPanicSplitS` **8** · `ttBikeSwapS` **18** · `ttBikeGainPerKm` **0,35** · `ttPacerGainS` **5** ·
`ttWeatherSpreadS` **20**.

**Cómo se mide.** `ttPacingSpreadS` = diferencia de tiempo entre `a_tope` y `conservador` para el
mismo hombre; banda **15-35 s** (si es menos, la palanca no vale nada, que es la queja literal del
dueño sobre las órdenes). `ttBlowUpPct` = hundimientos en el último tercio con `a_tope`; banda
**10-30 %**. Se conservan las bandas de hoy (`tailPct` 8-15, `worstStagePct` 0-17,
`specialistWinPct` 90-100). Banco: `timeTrials` (5 cronos reales) + `cri-40`.

---

### R28 · El formato de la carrera como contexto (30 situaciones)

Dos de sus filas son **bloqueantes** de todo lo demás en montaña y por eso abren el plan (§8 paso 1).

```
R28.1  EL PERFIL TIENE QUE SER LA CARRETERA (S-451, CONTRARIO nº 2 de las veinte más graves)
       profileGen.normalize() deja de estirar el último segmento;
       el terreno deja de ser una etiqueta única por carrera (Sanremo 'hilly' de principio a fin);
       el segmento se tipa por pendiente Y por contexto (rampa dentro de un descenso ≠ subida);
       las reinas generadas alcanzan 3.500-5.000 m como la carretera (hoy: 0 de 157 pasan de 4.000,
       mediana 2.023).

R28.2  DÓNDE CAE LA ÚLTIMA CIMA (S-486, CONTRARIO nº 3)
       el generador DECIDE el tipo de final de una reina en vez de dejarlo al azar:
             finalKind ∈ {alto (0 km), cima_cerca (≤ 5 km), valle_corto (5-20), valle_largo (> 20)}
             con reparto queenFinalMix { 0,45 · 0,20 · 0,25 · 0,10 }
       → hoy las cinco reinas de una carrera dejan 22, 1, 31, 50 y 19 km tras la última cota,
         y por encima de 5 km la etapa deja de comportarse como final en alto.

R28.3  RaceShape (§3.3) leído por: convocatoria (§5), RacePlan (R10), fases (R19.8),
       última etapa (S-075, S-270), etapa 1 (S-388, S-074), circuito (S-227), semietapa (S-431).

R28.4  ÚLTIMA ETAPA (S-075, S-270)
       con general decidida: paseo hasta el circuito (compromiso ≤ 0,45), sin fugas serias,
       y el sprint del circuito de verdad.
       última etapa DECISIVA: todo o nada — se ataca desde el penúltimo puerto y nadie guarda.

R28.5  ETAPA 1 Y CARRERA DE UN DÍA (S-074, S-388, S-158)
       hasGcContext falso hoy apaga los tres frenos justo el día 1. Cambia:
             en etapa 1 de una vuelta, hasGcContext = true con todos a 0 y el «líder virtual»
             calculado sobre el boquete: nadie deja marchar una fuga que se vestiría el maillot
             con minutos.
       En carrera de UN día: nadie guarda para mañana (matchPlan = todo hoy) y el descolgado
       abandona en vez de entrar en el corte.

R28.6  NEUTRALIZADO, CIRCUITO, OBSTÁCULO, NACIONAL, DOS CARRERAS
       neutralKm en el perfil, fase 'neutralizado' (S-073, S-223)
       circuito: la criba se acumula vuelta a vuelta y la fuga se caza en la penúltima (S-227)
       obstáculo (paso a nivel, moto, público): suceso raro con λ_obstacle (0,0004/km) (S-438)
       campeonato nacional: formato propio — sin general, sin cupo de invitación,
             escuadras desiguales por nacimiento, un solo maillot                    (S-485)
       dos carreras la misma semana: la convocatoria de una resta de la otra          (S-470)

R28.7  ALTITUD (S-479): por encima de altitudeThresholdM (2000),
       coste × (1 + altitudeGain (0,04)·(m − 2000)/1000·(1 + pesoRelativo))
       → el corpulento pierde más que el escalador ligero.

R28.8  TIERRA (S-463) → R15a.6.
```

**Cierra.** S-001, S-037, S-073, S-074, S-075, S-085, S-117, S-157, S-158, S-159, S-164, S-223,
S-225, S-226, S-227, S-228, S-270, S-287, S-289, S-388, S-431, S-438, S-451, S-463, S-470, S-471,
S-479, S-485, S-486, S-493.

**Constantes nuevas.** `queenFinalMix` **{0,45 / 0,20 / 0,25 / 0,10}** · `altitudeThresholdM`
**2000** · `altitudeGain` **0,04** · `lambdaObstacle` **0,0004/km** · `neutralKm` (por perfil).

**Cómo se mide.** `queenDplusMedian` banda **2.800-4.200 m** (hoy 2.023). `queenFinalKindMix` contra
`queenFinalMix` ± 0,08. `lastClimbToFinishKm` mediana **≤ 8 km** en reinas. `climberWinsQueenPct` =
victorias de escaladores (MON ≥ p85) en etapas tipadas de montaña; banda **55-85 %** (hoy: «un
escalador de 95 gana 1 de 5 etapas de montaña»). Banco: `calendarQueens` (que ya muestrea 27 reinas
del calendario) y `realQueens`.

**Aviso de coste**: R28.1 y R28.2 **mueven `realQueens`, `smallTours`, `calendarQueens` y
`grandTour`** —todas las bandas de campo real— y **no mueven ninguna huella sellada**, porque las
cuatro huellas viven en escenarios sintéticos. Es la razón por la que este racimo abre el plan.

---

## 5. El plan de equipo de verdad

Hoy el «plan» se deriva cada mañana del `stage.kind` y de `finishScore`, y no dura de un día para
otro. El dueño pidió otra cosa: **estructuras persistentes**, dictadas con nombre y con sus
prohibiciones.

### 5.1 Las seis estructuras, tal como las dictó

```ts
type TeamStructure =
  | { kind: 'sprint'; cardId: string; launchers: string[]; rest: 'gregario' }
  | { kind: 'montana'; cardId: string; climbers: string[]; rest: 'gregario' }
  | { kind: 'general'; cardId: string; complete: boolean; rest: 'gregario' }
  | { kind: 'doble'; sprintId: string; climbId: string; split: Map<string, 'sprint' | 'climb'> }
  | { kind: 'cazaetapas'; hunters: string[] }
  | { kind: 'mixta'; cardId: string; exempt: string[]; rest: 'gregario' }
```

| Estructura   | Qué es                                                                                   | Prohibición dictada                                                                          |
| ------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `sprint`     | Un sprinter fuerte y el resto trabajando solo para él                                    | **No** en una clásica de montaña ni en una vuelta sin llano (S-004)                          |
| `montana`    | Un hombre fuerte de montaña y el resto para él                                           | **No** en una clásica llana ni en una vuelta de solo llano y crono (S-005)                   |
| `general`    | Un hombre para la general: `complete` (montaña + crono) si hay crono, solo montaña si no | Requiere que la carrera tenga general (S-006, S-007)                                         |
| `doble`      | Un sprinter **y** un escalador, y el resto repartido entre los dos                       | Requiere que ambos superen `doblePct` y que el recorrido dé terreno a los dos (S-051, S-185) |
| `cazaetapas` | Solo cazaetapas: la fuga y la oportunidad sorpresiva                                     | Es el suelo: siempre legal (S-064, S-084)                                                    |
| `mixta`      | Gregarios de un líder, con alguien **exceptuado** que va por libre                       | El exceptuado no trabaja, no recibe ayuda, y **no perjudica** (S-053)                        |

**El exceptuado**, que hoy no existe y es `CONTRARIO` (S-053): `duty = 'exceptuado'` ⇒
`drive = 0`, `teamAttack = 1`, sin arropo ni tren ni rescate — **pero** `appetite = 0` mientras su
equipo esté en `intent ∈ {perseguir, lanzar, controlar}` con su carta viva. No es un rebelde: es un
permiso. La diferencia con el rebelde está en R25.4 (con permiso no cuesta `trust`) y en que **nadie
le persigue** (S-188).

### 5.2 Cómo se elige la estructura en la convocatoria

Hoy `callups.ts` puntúa a cada corredor **individualmente** contra la afinidad media del recorrido y
no hay lógica de composición ninguna: no existe «si va el sprinter, lleva lanzadores». S-001 pide
justo lo contrario: **elegir primero la baza y rellenar a su alrededor**.

```
function chooseStructure(roster, shape, philosophy):
    # 1. legalidad — las prohibiciones del dueño son duras, no una penalización
    legal = []
    si shape.bunchFinishShare >= structSprintMinShare (0,25):  legal += 'sprint'
    si shape.climbShare       >= structClimbMinShare  (0,12):  legal += 'montana'
    si shape.hasGc:                                            legal += 'general'
    si 'sprint' ∈ legal ∧ 'montana' ∈ legal:                   legal += 'doble'
    legal += 'cazaetapas'                                       # siempre
    legal += 'mixta'                                            # siempre (variante de las demás)

    # 2. encaje: percentil del mejor hombre del roster CONTRA EL CAMPO QUE VA A CORRER
    fit('sprint')     = shape.bunchFinishShare · pct(bestSpr,        campo.SPR)
    fit('montana')    = shape.climbShare       · pct(bestClimb,      campo.climbScore)
    fit('general')    = shape.hasGc            · pct(bestGc,         campo.gcScore)
                        · (complete ? 1 : 1 − shape.ttShare)
    fit('doble')      = min(fit sprint, fit montana) · dobleBonus (1,15)
                        si ambos ≥ doblePct (0,60)
    fit('cazaetapas') = cazaFloor (0,35)                         # el suelo del que no tiene baza
    fit('mixta')      = fit(mejor otra) · mixtaDamp (0,92)      # cuesta un poco tener un suelto

    # 3. la filosofía de la casa inclina, no decide  (S-003)
    fit[k] *= 1 + philosophyGain (0,20) si k coincide con teams.philosophy

    structure = argmax fit   (desempate por id)

    # 4. LA ESCUADRA SE CONSTRUYE ALREDEDOR  (S-001, la fila AUSENTE)
    cuota = QUOTA[structure]     # p. ej. sprint: {carta 1, lanzador 2, rodador 3, libre 2}
    para cada hueco de la cuota: el mejor disponible por el score de ESE hueco
    INVARIANTE: nunca un lanzador sin sprinter; nunca ocho escaladores en una vuelta llana;
                nunca un cronista puro en una carrera sin crono.
```

**`pct(x, campo)` y no un umbral absoluto**: es exactamente la corrección que `diseno-entrenamiento.md`
§6 punto 5 dejó dictada para `SPRINTER_MIN` («lo que el 68 quería decir es _este equipo tiene una baza
de sprint COMPARADA con el pelotón que corre hoy_, y eso es un percentil, no un número»). Se adopta
aquí también, para no contradecir el documento hermano.

**Cuotas por estructura** (para una escuadra de 8; con 7, se cae el último `libre`; con 4-6, S-008):

| Estructura   | carta       | apoyo                     | resto                           |
| ------------ | ----------- | ------------------------- | ------------------------------- |
| `sprint`     | 1 sprinter  | 2 lanzadores (LLA+SPR)    | 3 rodadores + 2 libres          |
| `montana`    | 1 escalador | 3 gregarios de montaña    | 2 rodadores + 2 libres          |
| `general`    | 1 jefe      | 2 montaña + 2 llano       | 2 libres (uno cazaetapas)       |
| `doble`      | 2 cartas    | 1 lanzador + 2 de montaña | 3 repartidos según el día       |
| `cazaetapas` | —           | —                         | 8 cazaetapas de perfiles varios |
| `mixta`      | 1 jefe      | 4-5 gregarios             | 1-2 exceptuados                 |

**Equipos pequeños (S-008)**: con 4-6 hombres, `frontClaim` se multiplica por `smallSquadClaim`
(`present/6`, tope 1): con cinco no se reclama el frente, se protege al jefe y se manda uno a la
fuga. Y aparece el **pacto tácito** de R20.4 con más facilidad, porque nadie puede pagar solo.

### 5.3 De la estructura a los papeles del día

```
function cardOfDay(structure, shape, day, memory, state):
    finalReal = finishType(deriveFinishTerrain(profile(day)), 40)     # ← EL FINAL, no la etiqueta
    según structure.kind:
      'sprint'     → carta = cardId si admitsBunchFinish(finalReal); si no, NINGUNA
                     (S-050: «el equipo del sprinter no tiene nada que hacer hoy»:
                      manda 1-2 a la fuga desde el km 0 y el resto al autobús sin tirar)
      'montana'    → carta = cardId si climbShare(day) ≥ 0,12 o finalReal ∈ {alto, muro, puncheur}
      'general'    → carta = cardId SIEMPRE que haya general, vaya 1.º o vaya 12.º   (S-047)
      'doble'      → carta = el de los dos con mejor finishScore en finalReal; el otro pasa a peón
                     y sus gregarios se reparten según climbShare del día            (S-051)
      'cazaetapas' → sin carta: quota de fuga 1-2 y ningún metro de viento           (S-084)
      'mixta'      → carta = cardId; exceptuados quedan fuera del reparto            (S-053)

    # LA GENERAL MANDA SOBRE EL TERRENO (arregla el agujero de pickLeader)
    si algún leal tiene gcRank ≤ 5 y la carrera tiene general:
          ese hombre es la carta de general, y la carta de etapa (si la hay) es la SEGUNDA.
          purposes = ['maillot'|'general', 'etapa'] en ese orden.                    (S-062)
```

**Cambios en carretera** (S-179, S-190, S-197, S-392, S-395, S-409, S-483):

```
si carta abandona, o queda irrecuperable (gap > cardLostS 300 sin poder volver):
      heredero = el mejor leal por finishScore en finalReal
      los roles que apuntaban al muerto se DEGRADAN: worksFor = heredero o null
      y el equipo emite 'card_changed' (crónica)                                     (S-190, S-197)
si la carta pierde > structureBreakS (300) en la general:
      al día siguiente la estructura pasa a 'cazaetapas' y libera a los gregarios    (S-392, S-409)
si un rival de referencia desaparece de la carrera:
      todos recalculan esa noche; el segundo hereda la condición de carta            (S-483)
si un cazaetapas hereda el maillot:
      estructura → 'general' provisional, arropo dos días, y vuelve a lo suyo al perderlo (S-395)
si el equipo se queda sin patrocinador para el año siguiente:
      jerarquía off: todos con duty 'libre', quota de fuga 3                          (S-469)
```

### 5.4 Los motivos que faltan hoy

Hoy son tres: `etapa`, `maillot`, `general`. Con R05 pasan a **once** (§4/R05), y con ellos aparecen
`intent` nuevos que hoy no tienen expresión:

| `intent` nuevo | Qué es                                                   | De dónde sale             |
| -------------- | -------------------------------------------------------- | ------------------------- |
| `sembrar`      | meter hombres en los intentos hasta que uno cuaje        | `montana`, `patrocinador` |
| `pancarta`     | perseguir para la volante y aflojar después              | `puntos` (S-105)          |
| `sabotear`     | meter un infiltrado en la fuga en vez de pagar el cierre | cualquiera con R03.5      |
| `aliar`        | pedir o aceptar el reparto del frente                    | R20.4                     |
| `tregua`       | pedir o conceder la tregua                               | R12.2                     |
| `escaparate`   | el equipo sin nada que se mete en todo                   | R09.4                     |

Y dos que ya existen y hoy nunca se usan bien: `proteger` (que hoy significa «tempo» y debería
significar **no relevar + colocar**, S-189) y `nada` (que hoy es esconderse y debería incluir
**abstención activa**: mandar uno a la fuga y no pagar un metro, S-084).

---

## 6. El jugador humano y el mánager

### 6.1 El principio, y por qué no cambia

El dueño ya tumbó la radio en vivo: «es incompatible con avanzar un día cada seis horas» (epics N1).
Lo que pidió es **granularidad**: «mejorar la granularidad de las instrucciones, con más escenarios
hipotéticos quizás». Y ya midió el problema: «el resultado es casi lo mismo ponga lo que ponga ahí».

Este documento no cambia la frontera: **las órdenes se escriben antes de la etapa y no se cambian
durante**. Lo que cambia es que **puedan decir más cosas** y que **el informe cierre el bucle**.

### 6.2 Lo que un humano puede ordenar (vocabulario propuesto)

Las siete palancas de hoy se conservan enteras. Se añaden cuatro campos, todos opcionales:

```ts
type StageOrders = {
  role: StageRole // sin cambios
  targetRiderId?: string // sin cambios
  mentality: Mentality // sin cambios
  effort?: Effort // sin cambios, pero deja de ser solo ±0,5 en el turno (abajo)
  triggerKm?: number | null // sin cambios
  contestSprints: boolean
  contestClimbs: boolean

  // --- NUEVO ---
  triggerOn?: TriggerCond | null //  R22/N1: la cita deja de ser solo un km   (S-321, S-322, S-214)
  chasePolicy?: ChasePolicy //  «si la fuga pasa de 2′, tiro»            (S-215, S-071)
  refuseRelayTeams?: string[] //  «con ésos no colaboro»                  (S-256)
  dayGoal?: DayGoal //  «hoy me voy al grupeto» / «hoy es mi día» (S-216, S-024, S-030)
}

type TriggerCond =
  | { at: 'km'; km: number } // lo de hoy
  | { at: 'climb'; which: 'last' | 'penultimate'; part: 'pie' | 'duro' | 'cima' } // S-322
  | { at: 'attack'; byRiderId: string } // S-321: «si salta Z»
  | { at: 'gap'; overS: number } // S-215
  | { at: 'weather'; cond: 'lluvia' | 'viento' } // S-032
  | { at: 'sector'; index: number } // pavé/tierra

type ChasePolicy = 'nunca' | 'si_amenaza' | 'siempre'
type DayGoal = 'ganar' | 'general' | 'puntos' | 'montaña' | 'grupeto' | 'ahorrar' | 'servir'
```

**Y `effort` deja de ser un botón medio desconectado** (la mitad de la queja que la v58 dejó
abierta): pasa a tocar tres sitios en vez de uno.

| `effort`  | Turno (hoy)   | **Cerillos**              | **Reserva**                    | **Presupuesto de carrera**              |
| --------- | ------------- | ------------------------- | ------------------------------ | --------------------------------------- |
| `ahorrar` | −0,5 de deber | no quema para no soltarse | umbral de gasto +25 %          | `dayWeight` × 0,7, se lo lleva a mañana |
| `normal`  | 0             | como hoy                  | como hoy                       | 1,0                                     |
| `a_tope`  | +0,5 de deber | +1 cerillo disponible     | umbral −25 % (se muerde antes) | `dayWeight` × 1,4, y mañana −           |

Esto es lo que contesta a «el resultado es casi lo mismo ponga lo que ponga ahí» **con mecánica y no
con un aviso en pantalla**.

### 6.3 Lo que sigue sin poder ordenar, y por qué

| Deseo                             | ¿Se puede?              | Por qué                                                                                                |
| --------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| Cambiar de idea durante la etapa  | **No, por diseño**      | La cita del dueño en N1. Es la frontera del juego, no una limitación técnica.                          |
| Hablar/negociar con el equipo     | **No todavía**          | G7/G2.13, sin empezar. `dayGoal` es el sustituto barato: declara, no negocia.                          |
| Marcar a cualquiera del pelotón   | Solo los 60 más famosos | `getRaceRivals(limit=60)`. Se propone subir a **120** y ordenar por relevancia deportiva, no por fama. |
| Órdenes de mánager sobre terceros | **Solo políticas**      | G2: «POLÍTICAS en vez de órdenes, aplicada en dos niveles». Ver §6.5.                                  |

### 6.4 Cómo conviven órdenes humanas y bots en el mismo equipo

Los dos agujeros medidos se cierran en §2.5. Además:

```
R22.A  EL BOT LEE LAS ÓRDENES HUMANAS ANTES DE REPARTIR                              (S-054, S-060)
       stageRun.ts invierte el orden: primero lee stage_orders, luego llama a
       autoStageOrders(riders, {kind, timeTrial, humanOrders}).
       autoOrders trata las filas humanas como HECHOS y reparte alrededor:
             — no nombra dos cartas
             — no produce ciclos (X lanza a Y y Y lanza a X)
             — no pone de lanzador a quien se declaró carta
       Es un cambio de 20 líneas y cierra cuatro CONTRARIO.

R22.B  NADIE ES JEFE SIN QUERERLO                                                    (S-058)
       pickLeader ignora los votos que apuntan a un hombre cuya orden explícita es
       'libre' o 'cazaetapas'. Ese hombre no recibe arropo, ni tren, ni rescate.

R22.C  DOS HUMANOS QUE SE DECLARAN LÍDER                                             (S-061)
       el desempate deja de ser por id: general (gcRank) → finishScore en el final real →
       antigüedad de contrato → id. Y el segundo recibe un aviso ANTES de guardar.

R22.D  EL HUMANO CON EL MAILLOT QUE NO LO DEFIENDE                                   (S-030)
       dayGoal 'ganar' o 'ahorrar' con el maillot puesto → el equipo NO se funde controlando;
       purpose 'maillot' pasa a claim jerseyBorrowedClaim (1). Su decisión, su precio.

R22.E  AVISO CUANDO LA ORDEN NO PODRÁ CUMPLIRSE                                      (S-214, S-070)
       raceOrdersAdvice gana las reglas que hoy no ve: el equipo (ya hay líder), la general
       (llevas el maillot y pediste atacar), la estructura, y el clima que la pantalla ya enseña.
       Y el informe posterior lo cierra: «tu cita era el km 80; a esa altura tu grupo estaba
       cerrando un intento y tu apetito era 0,04» (S-417).
```

### 6.5 El mánager (G2), y hasta dónde llega aquí

Hoy el mánager premium puede: renombrar el equipo, hacer el draft del calendario y fijar el plan de
entrenamiento sugerido. **No** decide roles, convocatorias nombre a nombre ni órdenes de terceros.

Este documento le añade **exactamente una cosa**, y es la que G2 pide («el mánager fija el plan del
equipo y cada corredor escribe el suyo dentro de ese marco», S-026):

```ts
type TeamDayPolicy = {
  protectedId?: string // «hoy la casa corre para éste»
  cardId?: string // la carta de etapa, si es otra
  chasePolicy: ChasePolicy // «nunca / si amenaza / siempre»
  purposeOrder: TeamPurpose[] // el orden de motivos del día
  budgetShare: number // [0,1] cuánto del presupuesto de carrera gastar hoy
  exempt: string[] // a quién se le da carta blanca hoy
}
```

Es una **política**, no una orden: no nombra lo que hace cada hombre. Lo demás lo sigue derivando el
director bot, y el corredor humano sigue escribiendo su hoja dentro del marco. Con eso:

- Un mánager humano hereda un equipo bot **sin que se note el cambio de manos** (S-012): la política
  por defecto es exactamente la que hoy se deriva.
- Abusar sale caro por dentro (R25.5), no por una regla que lo prohíba.
- G2.15 («ser mandado») deja de ser invisible: el corredor **ve la política de su equipo** antes de
  escribir su hoja (S-023) y puede responder a ella con `dayGoal`.

---

## 7. Los bancos que hacen falta

### 7.1 El banco que no existe y va primero

`docs/tactica.md` §4 lo dejó demostrado: **el banco no reproduce casi nada de lo que el dueño ve**.
«Gana el mismo dos etapas seguidas» mide 1,8 % (1 de 57); «seis del mismo equipo en una fuga de
nueve» mide 4 de 20 en el 0,9 % de las fotos. Las dos medidas son limpias y las dos dicen «aquí no
pasa». O sea que el defecto vive **en lo que la producción añade y el banco no tiene**: campos
pequeños con pocos equipos, la general de verdad, las órdenes automáticas del día y el estado que se
arrastra.

`mapa-bancos.md` §7.1 lo confirma desde el otro lado: «el único campo pequeño de CI es `teamedField`
8×5 = 40 y solo para la voz de la crónica… **nada mide una carrera de 5-10 equipos de 4-6** (ni con
órdenes, ni con general)».

```ts
// packages/engine/src/sim/smallRaces.ts  (NUEVO)
const SMALL_RACES = [
  /* 8 carreras reales de 3-5 etapas, lista CERRADA */
]
smallRaceSetup(raceId) → 5-10 equipos de 4-6 (según el raceId real) generados con
  generateNpcRider, autoStageOrders CON gcRank, general acumulada, RaceMemory encadenada.
```

Corre la carrera **entera**, con memoria entre etapas, como `smallTours` pero con el tamaño de campo
que el dueño mira. Es la primera pieza del plan porque **sin ella no se puede medir nada de lo que
sigue ni saber si un cambio lo arregla**.

### 7.2 Qué mide cada racimo, y sobre qué escenario

| Racimo | Estadística principal      | Escenario                    | Banda propuesta      | ¿Hoy?          |
| ------ | -------------------------- | ---------------------------- | -------------------- | -------------- |
| R01    | `mateAheadPullPct`         | carrera pequeña              | 0-3 %                | no existe      |
| R02    | `mateVsMateSprintPct`      | carrera pequeña + smallTours | 0-2 %                | no existe      |
| R02    | `pairEdgePct`              | `duelBench` (nuevo, barato)  | 72-88 %              | no existe      |
| R03    | `breakTeamMaxShare` (p95)  | carrera pequeña              | ≤ 2                  | no existe      |
| R03    | `breakTeamsRepresentedPct` | carrera pequeña              | 55-90 %              | no existe      |
| R03    | `breakClimberShare`        | reinas reales                | ≥ 0,50               | no existe      |
| R04    | `chaseTargetCorrectPct`    | grandTour + pequeña          | 85-100 %             | no existe      |
| R04    | `leashSpanS`               | grandTour                    | ≥ 400 s de recorrido | no existe      |
| R05    | `motivePct`                | grandTour                    | 65-90 %              | no existe      |
| R06    | `bannerContestants`        | llana canónica               | 3-15                 | no existe      |
| R07    | `bonusDecidedRacePct`      | smallTours (Arabia)          | 10-40 %              | no existe      |
| R08    | `frontTeamRotationDays`    | grandTour                    | ≥ 8 de 21            | no existe      |
| R09    | `sameWinnerNextDayPct`     | **carrera pequeña**          | 2-12 %               | parcial        |
| R10    | `budgetSpentOnMarkedPct`   | grandTour                    | 25-55 %              | no existe      |
| R11    | `mishapsPerStage`          | llana + Flandes              | 1-5 / 5-20           | no existe      |
| R12    | `truceGrantedPct`          | grandTour                    | 50-85 %              | no existe      |
| R13    | `attacksWhenLeaderCracks`  | reinas reales                | 1,5-3,5×             | no existe      |
| R14    | `echelonClosedPct`         | llana con viento             | 30-70 %              | no existe      |
| R15    | `boxedLossPct`             | llana canónica               | 8-25 %               | no existe      |
| R15    | `echelonByDecisionPct`     | llana con viento             | 50-100 %             | no existe      |
| R16    | `trainsPerBunchFinish`     | smallTours                   | 2-5                  | no existe      |
| R17    | `medianLeadGroupRiders`    | reinas reales                | **3-10**             | DEUDA (mide 1) |
| R17    | `gregarioSharePct`         | smallTours                   | 45-65 %              | no existe      |
| R18    | `soloWinMediaPct`          | **media-190** (entra en CI)  | 12-28 %              | sin banda      |
| R19    | `attemptsAfterKm100`       | llana canónica               | ≥ 2                  | no existe      |
| R20    | `frontTeamsPerStage`       | voz de equipo (inv. 22)      | 1,8-4 → **2,2-4,5**  | existe         |
| R21    | `structureFitPct`          | carrera pequeña              | 95-100 %             | no existe      |
| R22    | `orderEffectSpread`        | banco de órdenes (nuevo)     | ≥ 0,25 de win rate   | no existe      |
| R23    | `cribaSinCausa`            | coherencia                   | 0                    | no existe      |
| R24    | `catchKmSd`                | carrera pequeña              | ≥ 4 km               | no existe      |
| R25    | `trustSpreadEndSeason`     | world                        | ≥ 12 puntos          | no existe      |
| R26    | `grupetoMarginS`           | grandTour                    | 60-420 s             | no existe      |
| R27    | `ttPacingSpreadS`          | timeTrials                   | 15-35 s              | no existe      |
| R28    | `queenDplusMedian`         | calendarQueens               | 2.800-4.200 m        | mide 2.023     |
| R28    | `climberWinsQueenPct`      | calendarQueens               | 55-85 %              | no existe      |

### 7.3 Bancos nuevos, y los tres que faltan además del principal

1. **`smallRaces.ts`** — el principal (§7.1). 8 carreras × 4 etapas × 6 semillas, 5-10 equipos de
   4-6 = 40-60 corredores.
2. **`duelBench.ts`** — escenarios de grupo pequeño construidos a mano: fuga de 2, de 3 (pareja +
   suelto), de 6 (tres parejas), grupo de favoritos de 4 sin gregarios. Barato (2-6 corredores por
   corrida) y es el único sitio donde la superioridad numérica se puede medir sin ruido. 400
   corridas ≈ 6 s.
3. **`ordersBench.ts`** — el banco de órdenes que hoy **no existe** (`mapa-bancos.md` §7.7: «ningún
   banco varía `mentality`, `contestSprints/Climbs`, `targetRiderId` o rol por decisión externa»).
   El mismo hombre, las mismas semillas, las siete palancas barridas: mide `orderEffectSpread`. Es
   el banco que contesta a «el resultado es casi lo mismo ponga lo que ponga ahí» con un número.
   16 semillas × 12 configuraciones ≈ 40 s.
4. **`media-190` entra en CI** — hoy es informativo y sin banda (`mapa-bancos.md` §7.10), y es
   justo el escenario donde vive la deuda §14.4 (el ganador en solitario en media montaña, 4 %
   contra 20-30 %). Con R18 esa deuda se ataca de frente, así que el escenario tiene que vigilar.

### 7.4 Invariantes nuevos

16 invariantes nuevos, del 47 al 62. Los que valen la pena nombrar:

| #   | Qué afirma                                                                      | Racimo | Coste |
| --- | ------------------------------------------------------------------------------- | ------ | ----- |
| 47  | Nadie tira teniendo un compañero delante (≤ 3 %)                                | R01    | 60 s  |
| 48  | Dos compañeros no se disputan un sprint entre ellos (0 %)                       | R02    | comp. |
| 49  | La fuga del día no lleva tres de la misma casa (p95 ≤ 2)                        | R03    | 240 s |
| 50  | Se persigue lo que hace daño, no lo más adelantado (≥ 85 %)                     | R04    | comp. |
| 51  | Los cuatro maillots tienen dueño y ninguno se decide por accidente              | R05    | 300 s |
| 52  | Nadie paga una pancarta que no disputaba (0)                                    | R06    | comp. |
| 53  | La fuga en montaña la componen escaladores (≥ 0,50)                             | R03    | 300 s |
| 54  | Después del km 100 se sigue intentando algo (≥ 2 intentos)                      | R19    | comp. |
| 55  | Una reina deja llegar a un grupo, no a un hombre (3-10)                         | R17    | 900 s |
| 56  | El corte de la crono ya no es una salvaguarda dormida (≥ 1 caso en el banco)    | R11    | comp. |
| 57  | Una carrera pequeña no repite ganador un día sí y otro también (2-12 %)         | R09    | 480 s |
| 58  | Las siete palancas del jugador mueven el resultado (`orderEffectSpread` ≥ 0,25) | R22    | 40 s  |
| 59  | La caza no sale clavada (`catchKmSd` ≥ 4 km)                                    | R24    | comp. |
| 60  | El abanico tiene autor (≥ 50 %)                                                 | R15    | 120 s |
| 61  | Las reinas del calendario tienen el desnivel de la carretera (2.800-4.200 m)    | R28    | comp. |
| 62  | Toda criba narrada dice qué la produjo (0 sin causa)                            | R23    | comp. |

«comp.» = comparte corrida con un invariante que ya existe: no añade coste.

### 7.5 El coste en minutos de CI

Hoy: `pnpm test:bancos` = **536 s** medidos (job de nueve minutos con el arranque). La regla de la
casa es **presupuesto ≥ 4× el coste medido en CI**.

| Añadido                                          | Coste medido estimado | Cómo se estima                                                                   |
| ------------------------------------------------ | --------------------: | -------------------------------------------------------------------------------- |
| `smallRaces` 8 × 4 etapas × 6 semillas           |             **250 s** | 192 etapas de 40-60 corredores; una etapa de 176 cuesta ≈ 2,7 s, escala ≈ lineal |
| `duelBench` 400 corridas de 2-6 corredores       |               **8 s** | trivial                                                                          |
| `ordersBench` 16 × 12                            |              **45 s** | 192 etapas de 176 → pero solo llana canónica, sin general                        |
| `media-190` en CI, 40 semillas                   |             **115 s** | mismo orden que la reina canónica (172 s con 40)                                 |
| Invariantes que comparten corrida                |               **0 s** | 47-48, 50, 52, 54, 56, 59, 61-62                                                 |
| Sobrecoste del motor (censo, `placement`, fases) |       **+8 %** ≈ 43 s | listón declarado en R01 y R15                                                    |
| **Total nuevo**                                  |             **461 s** |                                                                                  |
| **`test:bancos` después**                        |             **997 s** | ≈ **17 minutos**                                                                 |

Diecisiete minutos es demasiado para un job que corre en cada PR que toca `packages/engine`. **La
propuesta es partir el job en dos**, que es un cambio de `ci.yml` y no de motor:

- **`bancos-rapidos`** (cada PR que toca engine): canónicos 1-7, 13-14, 18, 21-24, 44-46, coherencia
  de llana y reina, `duelBench`, `ordersBench`, `smallRaces` con **2 semillas**. ≈ **420 s (7 min)**.
- **`bancos-largos`** (nocturno + etiqueta `full-bench` en el PR): todo lo demás, incluidas las 12
  vueltas de `grandTour`, las 10 carreras de `smallTours` y `smallRaces` con 6 semillas.
  ≈ **1.100 s**, y el nocturno ya tiene sitio.

Con eso el PR normal **baja** de 9 a 7 minutos y el nocturno sube donde puede pagarse. La condición
que hace esto honesto: **todo paso de §8 que mueva una banda de `bancos-largos` corre `bancos-largos`
antes de mezclar** (etiqueta en el PR). Es explícito, no confiado.

---

## 8. Plan de implementación por pasos

**Reglas para todos los pasos** (las mismas de la casa): `pnpm typecheck && pnpm test:rapido` en
verde; si toca `packages/engine`, `pnpm test:bancos`; si mueve una banda de `bancos-largos`, se corre
`bancos-largos` antes de mezclar; cada cambio de conducta sube `ENGINE_VERSION` (hoy **52**) y su test
en `index.test.ts`, y deja su entrada en `docs/balance.md` (siguiente nota: v60, una subsección por
paso); toda constante nueva en `constants.ts` con su comentario de intención; comentarios y docs en
español, UI en inglés. **Un PR por paso, y los que suben `ENGINE_VERSION` no se juntan entre sí.**

Y una regla que este documento se aplica a sí mismo: **ningún paso puede decir «sin tocar bandas» si
toca la aduana, el frente o la meta**. La columna «Mueve» lista lo exacto, y §9 lo junta todo.

| #      | Paso                                                                                                                                                                                                                                                                                                                                | Racimos que cierra                | Ficheros                                                                           | Mueve                                                                                                                    | Criterio de «hecho»                                                                                                                                           | Modelo     |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **0**  | **El banco de carrera pequeña, y la foto de antes.** `sim/smallRaces.ts`, `duelBench.ts`, `ordersBench.ts`; `media-190` en CI; las 34 estadísticas de §7.2 impresas **SIN banda**; partición de `ci.yml` en `bancos-rapidos`/`bancos-largos`.                                                                                       | ninguno (es la red)               | `sim/*`, `ci.yml`, `package.json`                                                  | **nada** (no toca el motor)                                                                                              | El informe de `pnpm sim` imprime las 34 con su número de hoy y las cuatro huellas salen idénticas. `bancos-rapidos` ≤ 7 min medidos en CI.                    | **Haiku**  |
| **1**  | **El perfil es la carretera.** `profileGen.normalize()` sin estirar; terreno por segmento y no por carrera; `queenFinalMix`; desnivel de reinas a 2.800-4.200; pancartas y `feedZones` en el perfil; `neutralKm`; `roadClass`; `roadWidth`.                                                                                         | R28 (parcial), habilita R06 y R17 | `world/profileGen.ts`, `featureProfile.ts`, `stage/types.ts`                       | `realQueens`, `smallTours`, `calendarQueens`, `grandTour`. **NINGUNA huella sellada.**                                   | `queenDplusMedian` ∈ 2.800-4.200; `lastClimbToFinishKm` mediana ≤ 8; las cuatro huellas idénticas dígito a dígito (prueba de que los sintéticos no se tocan). | **Sonnet** |
| **2**  | **Los tres contextos viajan, y nadie los lee.** `SelfView`/`GroupView`/`RaceView` construidos y pasados a `tactics.ts`, `finish.ts` y `relayTurn`; `census(g)`; `teamId` en `MoveRider`. **Cero cambios de conducta.**                                                                                                              | ninguno (lo habilita todo)        | `stage/tactics.ts`, `finish.ts`, `simulate.ts`, `types.ts`                         | **nada**                                                                                                                 | Las cuatro huellas **idénticas**, los 46 invariantes en verde, `censusCost` ≤ 3 % del coste de etapa. Un test que afirma que `GroupView.mates` está poblado.  | **Sonnet** |
| **3**  | **R01 — compañeros visibles.** `matesAhead`/`matesBehind` generalizados al pelotón y a cualquier carta; el rebelde; el equipo partido en tres.                                                                                                                                                                                      | **R01**                           | `simulate.ts` (`relayTurn`, `sittingOn`), `tactics.ts`                             | huellas 4/4 · `chronicle.teamPullFlatPct` · `flat.*`                                                                     | `mateAheadPullPct` ≤ 3 %; inv. 47 en verde; los 15 IDs de R01 con su caso de prueba.                                                                          | **Sonnet** |
| **4**  | **Las clasificaciones existen.** `db/classifications.ts` (puntos, montaña, joven, equipos), `StandingRow[]` en `StageRider`, `RaceMemory` construida por `packages/db` y pasada como entrada. **Nadie la lee todavía.**                                                                                                             | ninguno (habilita R05, R06, R09)  | `packages/db/*`, `stage/types.ts`, `schema.ts` (migración)                         | **nada** en el motor; sí el esquema                                                                                      | Las cuatro huellas idénticas; las cuatro tablas cuadran contra los eventos congelados de una gran vuelta.                                                     | **Haiku**  |
| **5**  | **R19 — fases, y el fin de los dos apagones.** Tabla de fases; se retira `tacticMaxMoves`; `closingNow` deja de vetar; ventana de captura; flyer; puente desde atrás; etapa corta de montaña.                                                                                                                                       | **R19**                           | `tactics.ts`, `simulate.ts`, `constants.ts`                                        | huellas 4/4 · `flat.breakawayWinPct` · `flat.catchKmToFinish` · `mountain.*`                                             | `attemptsAfterKm100` ≥ 2 (inv. 54); Race Almeria e1 deja de tener «cuatro intentos y ni uno más»; `counterAfterCatchPct` ∈ 25-60 %.                           | **Sonnet** |
| **6**  | **R03 + R04 — la aduana y la general virtual.** `customs()` sustituye a `pelotonAllows`; cupo por equipo; `breakScore` por terreno; infiltrado; `virtualGc`, `costToMyMan`, `leash` sobre el terreno restante; el maillot prestado; el maillot sin equipo.                                                                          | **R03**, **R04**                  | `tactics.ts`, `teamPlan.ts`, `simulate.ts`                                         | huellas 4/4 · `flat.breakawayWinPct` · `mountain.breakawayWinPct` · `calendarQueens` · `smallTours.flatMoveWorstMarginS` | `breakTeamMaxShare` p95 ≤ 2 (inv. 49); `breakClimberShare` ≥ 0,50 (inv. 53); `chaseTargetCorrectPct` ≥ 85 % (inv. 50).                                        | **Sonnet** |
| **7**  | **R02 + R18 — el equipo dentro del grupo, y el turno con orden.** `teamTurn()`; un instigador por equipo; no saltar a la rueda del compañero; `finish.ts` recibe `teamOf`; cola de turno con duración; ruptura a 8 km; solitario que dosifica; cupo por equipos.                                                                    | **R02**, **R18**                  | `tactics.ts`, `finish.ts`, `simulate.ts`                                           | huellas 4/4 · `mountain.top10GapSeconds` · `smallTours.*` · `medianLeadGroupRiders`                                      | `mateVsMateSprintPct` ≤ 2 % (inv. 48); `pairEdgePct` ∈ 72-88 %; `soloWinMediaPct` ≥ 12 %; `medianLeadGroupRiders` ∈ 3-10 (inv. 55, la deuda de la v23).       | **Sonnet** |
| **8**  | **R21 + R17 — estructura, carta del día y el final real.** `TeamStructure` en `packages/db` (convocatoria); `autoOrders` lee `deriveFinishTerrain` en vez de `stage.kind`; el exceptuado; herencia de carta; `finishType` gana `muro`; `launchBias` invertido.                                                                      | **R21**, **R17**                  | `world/callups.ts`, `world/autoOrders.ts`, `teamPlan.ts`, `finish.ts`              | huellas 4/4 · `smallTours.bestSprinterWinPct` · `sweepPct` · `photoRepeatTopFive` · `gregarioSharePct`                   | `structureFitPct` ≥ 95 %; `gregarioSharePct` ∈ 45-65 % (hoy 70 %); ningún lanzador sin sprinter en 8 carreras × 6 semillas.                                   | **Sonnet** |
| **9**  | **R20 + R05 — la subasta del frente y los once motivos.** `frontAuction` con alianzas, pulso y gorrones; `PURPOSE_CLAIM`; `intentFor` de los siete motivos nuevos; cazar cuesta corredores; `roadFactor`.                                                                                                                           | **R20**, **R05**                  | `teamPlan.ts`, `simulate.ts`, `chase.ts`                                           | huellas 4/4 · `chronicle.frontTeamsPerStage` · `teamPullFlatPct` · `flat.*`                                              | `frontTeamsPerStage` ∈ 2,2-4,5; `motivePct` ∈ 65-90 % (inv. 51); `standoffGapGainS` ∈ 40-200 s.                                                               | **Sonnet** |
| **10** | **R06 + R07 + R26 — pancartas, bonificaciones y el grupeto con apuesta.** `banners.ts`; acelerón y ventana de alivio; `contestClimbs` respetado; bonificaciones de pancarta; grupeto con capo, estimación con error y readmisión por número; grupeto voluntario del sprinter; se criban todos los shed.                             | **R06**, **R07**, **R26**         | `stage/banners.ts` (nuevo), `simulate.ts`, `applyStageTimeCut`                     | huellas 4/4 · `grandTour.queenLastGroupPct` · `realQueens.lastGroupPct` · `outOfTimePct`                                 | `bannerContestants` ∈ 3-15 (inv. 52); `grupetoMarginS` ∈ 60-420 s; la cola de la reina medida y **declarada** (decisión del dueño nº 6).                      | **Sonnet** |
| **11** | **R24 — el director falible.** `belief.ts`: `dirQuality`, retardo, redondeo, error; noticia del suceso tardía y mala; `readState` con disimulo; capitán de ruta; órdenes malas.                                                                                                                                                     | **R24**, habilita R12 y R13       | `stage/belief.ts` (nuevo), `simulate.ts`, `teamPlan.ts`, `autoOrders.ts`           | huellas 4/4 · `flat.catchKmToFinish` · `capturePct` · **todas** las de caza                                              | Medición **pareada** `dirQuality = 1` vs real: `catchKmSd` ≥ 4 km (inv. 59), `catchLatePct` ∈ 8-25 %, `qualityWinEdge` ∈ 1,15-1,6×.                           | **Sonnet** |
| **12** | **R13 + R12 — hundimiento observable, tregua pedida y rescate.** `bloodGain` sobre `readState`; gregario que se aparta al ver; pájara del que tira; comer; tregua pedida/concedida/negada; emboscada con precio; rescate escalonado; regla de los 3 km; tapón.                                                                      | **R13**, **R12**                  | `simulate.ts`, `belief.ts`                                                         | huellas 4/4 · `mountain.top10GapSeconds` · `grandTour.abandonPct`                                                        | `attacksWhenLeaderCracks` ∈ 1,5-3,5×; `truceGrantedPct` ∈ 50-85 %; `rescueSuccessPct` ∈ 55-80 %.                                                              | **Sonnet** |
| **13** | **R11 — percances y coche.** `mishap.ts`; caravana con orden por general; ascensor; bici del gregario; incidentes en la crono.                                                                                                                                                                                                      | **R11**                           | `stage/mishap.ts` (nuevo), `simulate.ts`, `timetrial.ts`                           | huellas 4/4 · `timetrial.test.ts` · `abandonCauses.*`                                                                    | `mishapsPerStage` en banda; `ttIncidentPct` ∈ 1-4 % (inv. 56); inv. 44 (pavés 5-12 %) **sigue en verde**.                                                     | **Sonnet** |
| **14** | **R15a — la colocación existe.** `placement.ts`; acordeón; el abanico deja de ser un dado de colocación; sprint y encajonamiento; la rueda que eliges; sectores; el bajador.                                                                                                                                                        | **R15a**                          | `stage/placement.ts` (nuevo), `simulate.ts`, `finish.ts`                           | huellas 4/4 · `flat.bestSprinterWinPct` · `photoRepeatTopFive` · pavé                                                    | `boxedLossPct` ∈ 8-25 %; `echelonByDecisionPct` ≥ 50 % (inv. 60); `placementCostShare` ≤ 8 % del coste de etapa.                                              | **Opus**\* |
| **15** | **R16 + R15b — el tren como submotor y colocar cuesta.** `SprintTrain` con estado y ascensos; trenes que se estorban; sprinter sin tren; colocar cuesta km y cerillos; pelea por el sitio; abrir el hueco a propósito.                                                                                                              | **R16**, **R15b**                 | `stage/train.ts` (nuevo), `placement.ts`, `finish.ts`                              | huellas 4/4 · `flat.bestSprinterWinPct` · `smallTours.*`                                                                 | `trainsPerBunchFinish` ∈ 2-5; `trainBrokenPct` ∈ 20-55 %; `leadOutWinShare` ∈ 1,4-2,5×.                                                                       | **Sonnet** |
| **16** | **R09 + R10 + R25 — memoria, plan de varios días y precio de obedecer.** `RaceMemory` leída de verdad; humor con causa y dado a la mitad; deuda de relevos; desesperación; `RacePlan` con `dayWeight`; `trust` y `morale` movidos.                                                                                                  | **R09**, **R10**, **R25**         | `teamPlan.ts`, `simulate.ts`, `packages/db/*`, `world/callups.ts`                  | huellas 4/4 · `smallTours.sameWinnerPairPct` · `sweepPct` · `world.*`                                                    | `sameWinnerNextDayPct` ∈ 2-12 % (inv. 57); `budgetSpentOnMarkedPct` ∈ 25-55 %; `trustSpreadEndSeason` ≥ 12.                                                   | **Sonnet** |
| **17** | **R22 + R23 — órdenes del jugador y relato.** `triggerOn`, `chasePolicy`, `refuseRelayTeams`, `dayGoal`; `effort` en tres sitios; `autoOrders` lee las órdenes humanas; nadie es jefe sin quererlo; `TeamDayPolicy`; `pullMotive` nuevos; `costsToTeams`; causa de la criba; el informe deja de re-simular y cruza orden con hecho. | **R22**, **R23**                  | `types.ts`, `autoOrders.ts`, `stageRun.ts`, `contracts.ts`, `apps/web`, `apps/api` | huellas 4/4 · `raceRadio.test.ts` · coherencia                                                                           | `orderEffectSpread` ≥ 0,25 (inv. 58); `cribaSinCausa` = 0 (inv. 62); `ataqueSinCerrar` **baja a 0**.                                                          | **Sonnet** |
| **18** | **R08 + R28 — depósito entre etapas y el resto del formato.** Parte del equipo; el líder dosifica la vuelta; ritmo de competición; última etapa; etapa 1 con general; circuito; nacional; altitud; semietapa.                                                                                                                       | **R08**, **R28** (resto)          | `packages/db/*`, `teamPlan.ts`, `simulate.ts`                                      | huellas 4/4 · `grandTour.*`                                                                                              | `frontTeamRotationDays` ≥ 8; `jerseyTeamFadeDay` ∈ 9-18; la etapa 1 deja de apagar los tres frenos.                                                           | **Sonnet** |
| **19** | **R27 — la crono como modo.** Dosificación ordenable; referencias del rival; marcar tiempo; cambio de bici planeado; lotería del horario.                                                                                                                                                                                           | **R27** (sin CRE)                 | `timetrial.ts`, `startOrder.ts`, `types.ts`                                        | `timetrial.test.ts` · `timeTrials.*`                                                                                     | `ttPacingSpreadS` ∈ 15-35 s; `ttBlowUpPct` ∈ 10-30 %; `tailPct` y `specialistWinPct` **siguen en banda**.                                                     | **Sonnet** |
| **20** | **R14 — meteorología con previsión.** _(opcional, decisión del dueño nº 7)_ Viento con dirección; el abanico se cierra; lluvia que llega; material; parte citable por las órdenes.                                                                                                                                                  | **R14**                           | `weather.ts`, `physics.ts`, `simulate.ts`                                          | **la ley de velocidad** (inv. 43) y **todas** las bandas                                                                 | `echelonClosedPct` ∈ 30-70 %; `windDayGapS` ∈ 1,5-4×; inv. 43 re-anclado con causa escrita.                                                                   | **Opus**\* |
| **21** | **Calibrar y sellar.** Barrido de las 60 constantes nuevas; las bandas de §9 escritas en `targets.ts`; nota v60 con tablas antes/después; SPEC §6 reescrito a lo implementado; se retiran los comentarios desfasados que `mapa-bancos.md` §8 enumera.                                                                               | —                                 | `sim/targets.ts`, `docs/balance.md`, `SPEC.md`                                     | todas, de forma declarada                                                                                                | `pnpm sim 500` sin ningún objetivo fuera de banda; las 34 estadísticas de §7.2 con banda escrita.                                                             | **Sonnet** |

\* **Opus** solo en los pasos 14 y 20: son los dos que tocan un estado nuevo por corredor y por
bloque (14) o la física de velocidad (20), y los dos exigen razonar el coste de CI y la interacción
con la criba mientras se escribe. Todo lo demás es **Sonnet**: reglas locales con contrato escrito.
Los pasos 0 y 4 son **Haiku**: fontanería sin decisiones (un banco nuevo que replica la forma de uno
existente, y cuatro tablas acumuladas que ya sabemos ordenar).

### 8.1 El orden, y por qué es ése

```
0 ──► 1 ──► 2 ──┬──► 3 ──► 6 ──► 7 ──► 9
                │         ▲       ▲
                ├──► 4 ───┘       │
                │                 │
                ├──► 5 ───────────┘
                │
                ├──► 8 ──► 15
                ├──► 11 ──► 12 ──► 13
                ├──► 14 ──► 15
                └──► 10, 16, 17, 18, 19, 20  ──► 21
```

- **0 antes que todo** porque es la lección de `docs/tactica.md` §4: el banco no reproduce lo que el
  dueño ve, y sin el banco pequeño no se sabe si un cambio arregla algo.
- **1 antes que cualquier regla de montaña** porque S-451 y S-486 son bloqueantes declarados: «mientras
  eso siga así, S-443, S-367 y S-164 no se pueden medir».
- **2 es el diff mínimo que abre el máximo**: no cambia una conducta y habilita R01, R02, R03, R04,
  R17, R18, R20 y R24 — ocho racimos, 160 situaciones. Es el paso que este documento defendería si
  solo se pudiera hacer uno.
- **5 antes que 6** porque la aduana revisable no sirve de nada mientras `tacticMaxMoves` y
  `closingNow` apaguen la capa: se estaría midiendo un voto que nadie puede ejercer.
- **11 antes que 12** porque la tregua y el rescate se deciden sobre información equivocada; ponerlos
  con información perfecta y luego romperla es hacer el trabajo dos veces.
- **14 antes que 15** porque el tren necesita `placement` para estorbarse.
- **20 el último y opcional**: es el único que toca la física.

### 8.2 Qué se puede parar y dónde

Si el dueño quiere parar antes de tiempo, hay tres cortes limpios:

- **Tras el paso 7**: R01+R02+R03+R04+R17+R18+R19+R21 = **8 racimos, 152 situaciones**, y las seis
  quejas originales del dueño contestadas. Es el corte recomendado si hay que elegir uno.
- **Tras el paso 12**: 16 racimos, y la capa de información entera.
- **Tras el paso 19**: todo menos el clima (R14).

---

## 9. Lo que esto mueve y hay que decidir en bloque

Tabla única. **Nada de lo que sigue se toca en silencio.**

### 9.1 Bandas de `sim/targets.ts`

| Banda                                  | Hoy        | Propuesto      | Paso  | Por qué                                                                                                                                                       |
| -------------------------------------- | ---------- | -------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flat.breakawayWinPct`                 | 5-16       | **6-18**       | 5, 6  | La aduana por voto deja pasar más los días que nadie paga (S-234, S-149) y el infiltrado y la desesperación suben la cola. El techo ya describía el muestreo. |
| `flat.bestSprinterWinPct`              | 30-45      | **26-46**      | 15    | El tren real ayuda al mejor, pero los trenes que se estorban y el encajonamiento le quitan. Neto ≈ 0 con más varianza.                                        |
| `flat.catchKmToFinish`                 | 8-25       | **5-25**       | 11    | Con el retardo de la pizarra algunas cazas llegan al km −5 y otras no llegan. El suelo es lo que se abre.                                                     |
| `mountain.breakawayWinPct`             | 25-45      | **calibrar**   | 6     | Corre sobre `reina-150`, que el propio `targets.ts` declara «media montaña con la etiqueta cambiada». Ver decisión nº 5.                                      |
| `mountain.top10GapSeconds`             | 40-300     | **60-360**     | 7,12  | El grupo de favoritos deja de relevar y los rivales atacan al que cede. El suelo sube porque sale de la nube en que estaba sentado.                           |
| `chronicle.teamPullFlatPct`            | 50-85      | **70-95**      | 3, 9  | `pullFor` gana motivos y destinatario real: quedan muchos menos relevos sin voz de equipo.                                                                    |
| `chronicle.frontTeamsPerStage`         | 1,8-4      | **2,2-4,5**    | 9     | El frente compartido a menor intensidad es una regla del dueño que hoy solo existe como `noOwnerCommitFactor`.                                                |
| `chronicle.teamPullWithReasonPct`      | 95-100     | **sin cambio** | 3, 9  | Sigue siendo la alarma de «alguien tira sin razón».                                                                                                           |
| `grandTour.queenLastGroupPct`          | 8-14       | **8-16**       | 10    | Cribar todos los `shed` (deuda §14.2) sube la cola. **Es la banda con ancla en §VI.3: decisión nº 6.**                                                        |
| `grandTour.abandonPct`                 | 12-20      | **12-22**      | 12,13 | Percances y tapones añaden abandonos por caída.                                                                                                               |
| `abandonCauses.crashPct`               | 30-67      | **30-70**      | 13    | Ya rozaba el techo (65 % con 6 vueltas) y los percances no ayudan. La deuda del reparto 45/50/5 sigue nombrada, no se cierra aquí.                            |
| `smallTours.bestSprinterWinPct`        | 25-60      | **25-55**      | 8,16  | La memoria («al de ayer no le dejan») y el encajonamiento reparten más.                                                                                       |
| `smallTours.sweepPct`                  | 0-30       | **0-22**       | 16    | Es exactamente el defecto que R09 ataca: «Race Arabia: gana las 5».                                                                                           |
| `smallTours.sameWinnerPairPct`         | 15-55      | **12-45**      | 16    | Ídem.                                                                                                                                                         |
| `smallTours.mediaGroups`               | 3-8        | sin cambio     | —     | —                                                                                                                                                             |
| `smallTours.mediaOneGroupPct`          | 0-20       | **0-15**       | 7     | La media se parte más con la colaboración rota cerca de meta.                                                                                                 |
| `smallTours.flatMoveWorstMarginS`      | 0-900      | sin cambio     | —     | Es la cita del dueño; se conserva entera.                                                                                                                     |
| `smallTours.photoRepeatTopFive`        | 1,0-3,6    | **1,0-3,2**    | 14,16 | Colocación real y memoria dan más variedad de foto.                                                                                                           |
| `realQueens.lastGroupPct`              | 7-14       | **7-16**       | 10    | Mismo motivo que `grandTour.queenLastGroupPct`. Decisión nº 6.                                                                                                |
| `calendarQueens.breakawayWinPct`       | 6-30       | **8-34**       | 1, 6  | El perfil arreglado y la fuga compuesta por escaladores. El dueño dio 18,1 % por bueno con el perfil MALO.                                                    |
| `timeTrials.tailPct` / `worstStagePct` | 8-15/0-17  | sin cambio     | —     | R27 no toca la ley de la crono, solo el reparto de esfuerzo.                                                                                                  |
| `erosion.*` (5 bandas)                 | —          | sin cambio     | —     | No se toca la física del depósito.                                                                                                                            |
| **`medianLeadGroupRiders`** (DEUDA)    | mide **1** | **banda 3-10** | 7     | Deja de ser una deuda sin banda y pasa a ser objetivo. Es la petición literal del dueño de la v23.                                                            |
| `SATURATION_DEPLETION` / `_BONK_PCT`   | 0,96 / 12  | sin cambio     | —     | —                                                                                                                                                             |
| Ley de velocidad (inv. 43)             | —          | **re-anclar**  | 20    | **Solo si se hace el paso 20** (viento con dirección). Si no, no se toca.                                                                                     |

### 9.2 Invariantes

| Invariante                     | Qué le pasa                                                                       | Paso  |
| ------------------------------ | --------------------------------------------------------------------------------- | ----- |
| 1-7 (canónicos)                | Siguen; bandas movidas según §9.1                                                 | var.  |
| 21-24 (voz de equipo)          | Siguen; `teamPullFlatPct` y `frontTeamsPerStage` movidas                          | 3, 9  |
| 25-30 (gran vuelta)            | Siguen; `abandonPct` y `queenLastGroupPct` movidas                                | 10-13 |
| 34 (Giro e9), 35 (Colombia e5) | Siguen intactos: son regresiones nombradas y **el rediseño no puede empeorarlas** | —     |
| 43 (ley de velocidad)          | Intacto salvo paso 20                                                             | 20    |
| 44 (pavés 5-12 %)              | Intacto: los pinchazos **no son bajas**, y se comprueba explícitamente            | 13    |
| 45, 46 (unidades de física)    | Intactos                                                                          | —     |
| **47-62 (nuevos)**             | 16 invariantes de §7.4                                                            | var.  |

### 9.3 Huellas selladas

| Huella                                        | Se mueve en los pasos   | Causa que se escribe al re-sellar                                                                       |
| --------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `attribution.test.ts` — `llana-180-0/1`       | 3, 5, 6, 7, 8, 9, 11-18 | Una por paso: «el equipo entra en la decisión», «la aduana es un voto», «el turno tiene orden»…         |
| `attribution.test.ts` — `reina-150-0/1`       | ídem                    | ídem                                                                                                    |
| `timetrial.test.ts` — huella de la crono      | 13, 19                  | «la crono genera incidentes» y «la dosificación es ordenable»                                           |
| `timetrial.test.ts` — «la rampa no da tiempo» | **nunca**               | Es una invariante de diseño y el rediseño la respeta: lo que cambia el tiempo es la orden, no el turno. |
| `raceRadio.test.ts` — contratos de foto       | 17                      | «`pullMotive` gana valores y `time_gap` gana `costsToTeams`»                                            |
| `index.test.ts` — `ENGINE_VERSION`            | 3, 5-20 (uno por paso)  | 52 → 68 si se hacen todos                                                                               |

### 9.4 Constantes que se **retiran**

`tacticMaxMoves` 3 · `tacticAllowBase` 0,3 · `tacticAllowKmGain` 0,5 · `tacticAllowSizePenalty` 0,05
· `tacticAllowGcPenalty` 0,75 · `tacticAllowMax` 0,7 · `gcControlLeash` 700 (lo sustituye
`leash(t)`) · `noOwnerCommitFactor` 0,94 · `windPlacementTeam` 25 · `windPlacementLeader` 12 ·
`windPlacementLuck` 10 · `teamDriveSecondCard` 0,2 · `sprintTrainKm` 3 como frontera del tren.

Todas se conservan comentadas como referencia del modelo anterior, igual que se hizo con
`breakawaySizeRange` y `breakawayScore*` en la v9.

### 9.5 Esquema y contratos

- Migración: `stage_orders` gana `trigger_on`, `chase_policy`, `refuse_relay_teams`, `day_goal`;
  tabla nueva `team_race_plan`; tablas de clasificaciones secundarias.
- `contracts.ts`: `raceReportOrdersSchema` pasa a devolver las once palancas (hoy devuelve cuatro).
- `StageInput` gana `memory`, `standings`, `raceShape`, `teamPolicies`. Sigue siendo una entrada
  pura: **el motor no escribe nada de esto**.

---

## 10. Decisiones que son del dueño

Cada una con recomendación. La recomendación es lo que se implementa por defecto si no dice otra
cosa.

**1. ¿Cuánta memoria arrastra la carrera?** (S-423, S-401, S-404; §7 punto 1 de `tactica.md`)
El catálogo pide que al ganador de ayer se le acorte la cuerda y que haya rivalidades.
→ **Recomendación: memoria de CARRERA, no de temporada.** `RaceMemory` nace y muere con la carrera;
lo único que sobrevive entre carreras es `trust` y `morale` (que ya existen). Motivo: una memoria de
temporada obliga a un esquema nuevo y hace las carreras previsibles a veinte días vista, que es
justo lo que el punto 2 de `tactica.md` §7 teme. Las rivalidades estructurales (S-404) se derivan de
la temporada pero se aplican dentro de la carrera.

**2. ¿Cupo de fuga estricto o blando?** (S-083, punto 2 de `tactica.md` §7)
→ **Recomendación: blando.** El cupo es un **precio** (`appetite = 0` al superarlo) y no un veto,
salvo el del maillot, que sigue siendo veto por cita expresa (v32). Un cupo duro hace las carreras
más creíbles y también más previsibles; el precio deja sitio al día raro, que es lo que
`flatMoveWorstMarginS` 0-900 protege.

**3. ¿Hasta dónde llega el jugador humano?** (punto 3 de `tactica.md` §7, epics N1)
→ **Recomendación: los cuatro campos nuevos de §6.2 y nada más.** Sin radio en vivo (ya lo tumbó),
sin negociación con el equipo (es G7 y no está empezado), y con `TeamDayPolicy` como única
herramienta de mánager. Es lo que cabe sin abrir G2 entero.

**4. ¿Los directores bot fallan?** (S-009, S-013, S-014, G9)
→ **Recomendación: sí, y por INFORMACIÓN, no por vatios.** `dirQuality` por división
{WT 0,85 · PRS 0,65 · CON 0,50}. Es la única forma de que G9 («hacer que los bots sean peores que
los humanos») exista sin romper la física, y el propio catálogo lo dice: «es la pieza que las hace
posibles sin tocar la física —mismos vatios, distinto número en la pizarra». **Riesgo asumido**:
desafina todas las cazas y mueve todas las huellas (paso 11).

**5. ¿Se cambia el escenario canónico `reina-150`?**
El propio `targets.ts` dice que «no es una etapa reina sino media montaña con la etiqueta cambiada»
(1.200 m), y `mountain.breakawayWinPct` «cae de 26,7 % a 0 % según el puerto pase de 15 a 50 km»: la
banda mide la posición del puerto, no la carrera.
→ **Recomendación: sí, sustituirlo por una reina de verdad** (3.500 m, dos puertos, final en alto)
en el paso 21, con la huella de `reina-150` **retirada** y una nueva sellada. Es caro y es honesto:
mantener una banda que no mide lo que dice es peor que moverla.

**6. ¿La cola de las reinas puede pasar del 14 %?** (deuda §14.2, S-443)
Cribar los grupetos que ya no son la carrera es lo que la carretera hace, y el motor no lo hace
porque la banda tiene ancla en §VI.3. Se probó y salió 14,33 % con 37 grupos en meta.
→ **Recomendación: sí, subir el techo a 16 %** (`grandTour.queenLastGroupPct` y
`realQueens.lastGroupPct`). El corte del §VI.3 va del 8 % (llana) al 18 % (reina): 16 % sigue dentro
del corte y es la carretera. **Esta es la única banda de la lista con ancla de dominio, y por eso es
decisión y no propuesta.**

**7. ¿Se hace el paso 20 (viento con dirección)?**
Es el único paso que toca la física y el único que mueve la ley de velocidad (invariante 43).
→ **Recomendación: sí, pero el último y solo, con `ENGINE_VERSION++` propio.** R14 cierra 12
situaciones y una de ellas es un `CONTRARIO` con cita (S-032, el parte que las órdenes pueden citar);
pero si hay que recortar, es lo primero que se cae sin dejar el diseño cojo.

**8. ¿El corte de tiempo mira el número?** (S-494)
Hoy readmite siempre y a todos, y por eso el tamaño del grupeto no es un activo y R26 entero se
organiza por inercia.
→ **Recomendación: sí.** `readmitBlockRiders` 20: al grupo grande se le readmite en bloque con
penalización, al pequeño no. Es lo que le da apuesta al racimo, y no cuesta nada implementarlo.

**9. ¿Un humano puede rechazar el liderazgo?** (S-058)
Hoy si sus gregarios bot le apuntan, es jefe aunque escriba `libre`.
→ **Recomendación: sí.** `pickLeader` ignora los votos que apuntan a quien se declaró `libre` o
`cazaetapas`. La contrapartida honesta: ese hombre no recibe arropo, ni tren, ni rescate. Es la
mitad de la cita del dueño que la v58 dejó sin hacer.

**10. ¿Se retiran `tacticMaxMoves` y `closingNow`?** (S-444, S-487)
Son los dos `CONTRARIO` que apagan la capa táctica por delante y por detrás de la fuga del día, y uno
de los dos está medido con su propio comentario: «cuatro intentos hasta el km 19 y ni uno más en los
190 restantes».
→ **Recomendación: sí, los dos, en el paso 5.** El techo pasa a ser por fase y el cierre pasa a ser
precio en vez de veto. Es el paso de mayor rendimiento por línea tocada de todo el plan.

**11. ¿Se hace la CRE?** (S-163)
Es un formato de carrera entero, no un momento de la etapa.
→ **Recomendación: no ahora.** Queda anotada como fuera de alcance, con su ficha en el catálogo y su
línea en la deuda. Meterla aquí duplicaría el tamaño del paso 19 sin cerrar ningún racimo más.

**12. ¿Se re-sellan las huellas por tanda o al final?**
→ **Recomendación: por tanda, con causa escrita**, como se hizo en la v49. Re-sellar al final
convierte dieciocho causas en una nota ilegible y hace imposible atribuir un movimiento de banda a su
paso, que es la única razón por la que las huellas existen.

**13. ¿`orderEffectSpread` es un invariante o una vigilancia?**
Mide si las siete palancas del jugador cambian el resultado. El dueño se quejó de que no lo hacen.
→ **Recomendación: invariante con banda 0,25-0,60.** Con suelo, porque una palanca que no mueve nada
es la queja literal; y con techo, porque una palanca que decide sola convierte el juego en una
pantalla de configuración.

**14. ¿El banco de carrera pequeña entra en `bancos-rapidos` o solo en el nocturno?**
→ **Recomendación: en los dos, con dos semillas en el rápido y seis en el largo.** Es el banco que
reproduce lo que el dueño mira; dejarlo solo en el nocturno repetiría exactamente el error que
`docs/tactica.md` §4 encontró.

---

## 11. Objeciones desestimadas, y por qué

- **«Reescribir `tactics.ts` de cero sería más limpio.»** No: la mecánica del intento (λ → seguir →
  sostener → boquete → cooperación) es correcta, está medida y tiene nueve reglas de dominio
  dictadas por el dueño detrás. Lo que está mal no es la mecánica: es **lo que ve**. Reescribirla
  tiraría la única parte que no hay que tirar.
- **«El escalar `teamAttack` se puede enriquecer sin llevar `teamId`.»** No: `chooseInstigator` tiene
  que poder decir «éste no, que ya hay dos míos delante», y eso no cabe en un número por equipo.
  R02, R03 y R18 son imposibles sin el censo.
- **«La memoria entre etapas obliga a que el motor tenga estado.»** No: entra como `StageInput`,
  igual que `gcDeficitSeconds`. El motor sigue siendo `(input, seed) → output`, y por eso ningún
  banco se rompe por esto.
- **«`placement` es demasiado caro.»** Un float por corredor y bloque es 176 sumas por bloque frente
  a las dos evaluaciones de la ley de velocidad que ya costaron 1.950 → 2.665 s de batería. El
  listón está escrito (≤ 8 %) y hay plan B (actualizar cada 2 bloques).
- **«Bajar `pelotonMoodSpread` de 0,14 a 0,07 quita variedad.»** La quita del dado y la devuelve por
  causa: seis efectos de humor con signo, más la desesperación, más la memoria. La variedad que
  queda es **explicable**, que es lo que la crónica necesita.
- **«Las bandas se están moviendo demasiado.»** Se mueven **dieciocho de treinta**, todas en §9.1 con
  su motivo, y solo una tiene ancla de dominio (la cola de la reina, decisión nº 6). El resto son
  bandas que el propio repositorio documenta como «el margen que hoy se puede sostener» o «sentadas
  encima de su ruido».
