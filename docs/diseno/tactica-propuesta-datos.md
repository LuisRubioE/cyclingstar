# Rediseño táctico desde el ESTADO: qué información existe, por dónde viaja y qué reglas se vuelven posibles

Propuesta completa de rediseño de la capa táctica del motor de etapa. La escribe un arquitecto de
datos y de estado, y la tesis es una sola:

> **Casi ningún defecto del catálogo es una regla mal escrita. Casi todos son información que no
> llega al sitio donde se decide.**

La prueba está verificada y es dura: `stage/tactics.ts` son 855 líneas donde se decide quién ataca,
quién salta y quién colabora, y **no contiene la palabra `teamId` ni una vez**. `finish.ts` tampoco.
`group.ts` tampoco. `marcaje.ts` tampoco. De los ocho hombres de un equipo, a la función que decide
si un corredor ataca le llega **un escalar** (`teamAttack`, cuatro valores posibles: 0,4 · 0,7 ·
0,85 · 1,4) que además es **idéntico para los ocho**. Un gregario y su jefe deciden con el mismo
número. Dos compañeros en una fuga de tres no saben que son compañeros.

De ahí salen, sin necesidad de escribir ni una regla nueva, la mitad de los 28 racimos del catálogo:
R01 (compañeros visibles), R02 (superioridad numérica), R03 (la aduana como voto por equipos), R04
(general virtual), R05 (motivos), R16 (tren), R18 (colaboración), R20 (pulso por el frente), R21
(estructura) y R24 (directores falibles) son **todos el mismo agujero**: el estado del equipo no
viaja hasta donde se decide.

Por eso este documento no empieza por las reglas. Empieza por el **inventario de estado**: qué
existe hoy, dónde vive, quién lo escribe, quién lo lee y **dónde se pierde**. Las reglas se derivan
después, y se derivan solas: cuando un corredor puede ver a sus compañeros en su grupo, «dos contra
uno se relevan y atacan por turnos» deja de ser una regla que haya que inventar y pasa a ser la
consecuencia obvia de un dato que ya está delante.

---

## Índice

1. [Qué se rehace y qué no](#1-qué-se-rehace-y-qué-no)
2. [El modelo de decisión](#2-el-modelo-de-decisión)
3. [Los tres contextos y su contrato](#3-los-tres-contextos-y-su-contrato)
4. [Las reglas, racimo por racimo](#4-las-reglas-racimo-por-racimo)
5. [El plan de equipo de verdad](#5-el-plan-de-equipo-de-verdad)
6. [El jugador humano y el mánager](#6-el-jugador-humano-y-el-mánager)
7. [Los bancos que hacen falta](#7-los-bancos-que-hacen-falta)
8. [Plan de implementación por pasos](#8-plan-de-implementación-por-pasos)
9. [Lo que esto mueve y hay que decidir en bloque](#9-lo-que-esto-mueve-y-hay-que-decidir-en-bloque)
10. [Decisiones que son del dueño](#10-decisiones-que-son-del-dueño)

---

## 0. El inventario de estado, que es de donde sale todo lo demás

Antes de la frontera y del modelo, la foto. Cinco depósitos de estado, con lo que hoy llevan y lo
que les falta. **Los porcentajes de la última columna son las situaciones del catálogo que se
desbloquean solo con rellenar ese depósito**, sin escribir ninguna regla nueva.

| # | Depósito | Dónde vive hoy | Qué lleva hoy | Qué NO lleva | Racimos que desbloquea |
| - | -------- | -------------- | ------------- | ------------ | ---------------------- |
| 1 | **Lo que ENTRA a la etapa** | `StageInput` (`stage/types.ts:167`) | `profile`, `riders[]`, `timeTrial?`, `lugar?` | Formato de la carrera, qué queda de recorrido, las cuatro clasificaciones, la memoria del pelotón, el parte del tiempo, el trazado | R04 R05 R06 R07 R08 R09 R10 R14 R26 R27 R28 |
| 2 | **Lo que lleva el CORREDOR** | `RiderSim` (`simulate.ts:185`) | energía, grupo, trabajo, cerillos, deriva, reserva, `pulling`, `hurt`, `gastado` | Posición dentro del grupo, memoria de a quién ha seguido/marcado, turno vigente, deudas, lo que CREE del rival | R02 R13 R15 R16 R18 R24 |
| 3 | **Lo que sabe el EQUIPO** | `TeamPlan` (`teamPlan.ts:111`) + 2 escalares | jefe, carta, motivo, presupuesto, `intent`, `claim` | Estructura persistente, dónde está cada uno de los ocho, motivos secundarios, política de caza, la pizarra del director | R01 R03 R05 R10 R20 R21 R24 |
| 4 | **Lo que sabe el GRUPO** | `Group` (`group.ts:11`) | id, ids, reloj, velocidad, compromiso, coop, tensión | Composición por equipos, orden de la rueda, quién acaba de tirar, aforo, quién va delante de quién | R02 R15 R16 R17 R18 R26 |
| 5 | **Lo que SALE de la etapa** | `StageOutput` (`types.ts:398`) | eventos, resultados, `workUnits`, incidentes, `tank`, `efforts` | Quién fugó, quién no relevó, quién le debe qué a quién, qué equipo ganó, la moral, el margen del corte | R08 R09 R10 R23 R25 |

El depósito 1 es el más grave y el más barato: **hoy la etapa de mañana no arrastra NADA táctico de
la de hoy**. Lo único que cruza la noche es `ctl`/`atl` (por Banister), `alive` y `gcTotal`. La
propia base de datos ya sabe cosas que el motor no recibe: `raceGc` (`schema.ts:463`) acumula
`puntosVolante` y `puntosMontana` **por corredor y por carrera desde hace versiones**, y el motor
nunca los ve, así que S-035 («un corredor no sabe qué clasificación lidera») y los 24 casos de R05
están AUSENTES por un campo que no se pasa, no por una mecánica que no exista.

Esa es la forma de casi todo el catálogo, y el orden de trabajo de este documento.

---

## 1. Qué se rehace y qué no

La frontera se traza donde el dueño ya la trazó en el diseño hermano de entrenamiento (§0, «las dos
fronteras»): **el motor no conoce atributos, conoce un `StageRider`**; y **los bancos generan su
campo con el generador de producción**. Aquí se añade una tercera, que es la que ordena este
documento:

> **Frontera 3 — la FÍSICA no se toca; lo que se rehace es QUIÉN DECIDE y CON QUÉ.**
> Si un cambio necesita mover la ley de velocidad, el reparto del viento o la erosión para que salga
> el resultado que se busca, el cambio está mal planteado.

### 1.1 Lo que se queda INTACTO, y por qué

| Pieza | Fichero | Por qué se queda |
| ----- | ------- | ---------------- |
| Ley de velocidad, `blockPerfil`, `vRef`, `relPower`, `loadExponent`, exposición | `physics.ts` | Es lo único calibrado contra la carretera real (VAM 1.560 m/h, cronos 40-56 km/h). Todo el catálogo se puede cerrar sin tocarla. El propio dueño lo cerró en S-467: «el problema no es la ley». |
| `erosion()`, `erosionCoef`, `bonkPenalty`, `TANK`, `initialEnergy` | `physics.ts` | Sostienen las cinco bandas de `erosion` y la cola de la reina. Mover una mueve las cinco. |
| `matchCount`, `matchBonus` 10, `matchBoostSeconds` 120, `reserveSeconds` 65 | `physics.ts`, `constants.ts` | S-454 y S-455 están `CUBIERTO` y medidos. La moneda física del esfuerzo funciona; lo que falta es quién decide gastarla. |
| Reparto del viento (`advanceGroup`, `pullers`, `enFila`) | `group.ts` | Medido en v38/v39. Lo que cambia es **quién** está en `pullers`, no cómo se reparte. |
| `finishWeights` (los siete tipos y sus pesos) | `constants.ts:3439` | La traducción atributo→remate está anclada al Muro de Huy y a las clásicas reales. Lo que cambia es qué grupo llega y quién va dentro. |
| `crash.ts` (dado y severidades) | `crash.ts` | Las bandas de `abandonCauses` cuelgan de aquí. Lo que se añade es el RADIO y las consecuencias, no la probabilidad. |
| `simulateTimeTrial` (compuesto CRI, pacing, rampa) | `timetrial.ts` | Las bandas `timeTrials.tailPct` 8-15 y `worstStagePct` 0-17 son de las mejor ancladas del banco. R27 añade estado alrededor, no dentro. |
| `mainGroupId`, `mergeGroups`, `chaseReferenceIndex` | `group.ts` | Tres parches convergidos en una regla buena («el pelotón es el grupo que lleva la gente»). Se conserva y se le añade composición. |
| Huellas selladas `attribution.test.ts`, `timetrial.test.ts`, `raceRadio.test.ts` | `stage/` | Se re-sellan **una sola vez**, en el paso 6, con la causa escrita y el antes/después en `docs/balance.md`, según la regla de la casa del diseño de entrenamiento §0. No se re-sellan paso a paso. |

### 1.2 Lo que se REHACE

| Pieza | Hoy | Pasa a ser |
| ----- | --- | ---------- |
| `tactics.ts` (855 l.) | Funciones puras que reciben `MoveRider` sin `teamId` | Se **conserva entera como capa de resolución** (λ, boquete, sostener el salto) y se le antepone `agents.ts`: la decisión se toma con tres contextos y llega a `tactics.ts` como un `Intent` ya resuelto |
| `teamPlan.ts` (566 l.) | Plan derivado UNA vez por etapa, congelado; llega al corredor como 2 escalares | `squad.ts`: estructura persistente de carrera + `DayPlan` recalculado por fase + `SquadRuntime` vivo cada km, que el corredor **lee entero** |
| `chase.ts` (129 l.) | Foto de salida: fuerza del campo como escalar | `front.ts`: subasta del frente con derecho, precio, pagadores y gorrones (R20) |
| El bucle de `simulate.ts` (l. 1693-5892) | 51 decisiones cableadas en línea | Mismo bucle, mismo orden, pero las decisiones **llaman a funciones puras con contexto**; el bucle deja de ser el sitio donde vive la lógica |
| `StageInput` | 4 campos | + `race: RaceContext` (opcional; sin él, comportamiento de hoy) |
| `StageOutput` | 6 campos | + `memory: StageMemory` (lo que la etapa deja para mañana) |

### 1.3 La regla de compatibilidad, que es lo que hace barato el plan

`RaceContext` y `StageMemory` son **opcionales**. Un `StageInput` sin `race` corre exactamente como
hoy: sin clasificaciones secundarias, sin memoria, con humor de dado y con estructura derivada del
terreno. Eso permite que:

- las huellas selladas y los escenarios canónicos sigan pasando sin tocarlos hasta el paso 6;
- cada paso del plan §8 se pueda medir **con y sin** el contexto nuevo, en la misma corrida, que es
  la única forma honesta de atribuir un movimiento de banda a su causa;
- los bancos que hoy no tienen general (`realQueens`, `calendarQueens`, `climbs`) sigan corriendo
  igual mientras no se decida darles una.

---

## 2. El modelo de decisión

### 2.1 Qué es un agente

Un **agente** es un corredor en un bloque de decisión, con tres contextos delante y una memoria
propia. No es un objeto nuevo en memoria: es una vista sobre `RiderSim` que se construye barata y se
tira.

```ts
// packages/engine/src/stage/agent.ts (nuevo)

export interface Agent {
  riderId: string
  /** Lo que sabe de sí mismo. §3.1 */
  self: SelfView
  /** Lo que ve de su grupo. §3.2 */
  group: GroupView
  /** Lo que sabe (o cree) de la carrera. §3.3 */
  race: RaceView
  /** Su hoja del día, tal cual la escribió el jugador o `autoOrders`. */
  orders: StageOrders
  /** Su papel de HOY, derivado de la estructura del equipo (§5). */
  duty: DayDuty
  /** Lo que arrastra dentro de la etapa. §2.4 */
  mem: AgentMemory
}
```

`AgentMemory` es la pieza que hoy no existe y que R18 y R24 necesitan entera:

```ts
export interface AgentMemory {
  /** Bloques que lleva EN LA CABEZA del turno actual. 0 = no está tirando. (S-492) */
  pullBlocks: number
  /** km en que acabó su último turno. No vuelve a cabeza hasta que la rueda gire. (S-492) */
  lastPullEndedKm: number | null
  /** A quién ha seguido ya en esta etapa (no se salta dos veces a la misma rueda seguidas). */
  followed: string[]
  /** A quién marca de hecho AHORA, con o sin orden (marcaje emergente, S-273). */
  marking: string | null
  /** Quién le marca a él, si lo ha notado (S-323: el marcaje es simétrico). */
  markedBy: string[]
  /** Deudas vivas dentro de la etapa: «éste no me relevó» (S-081, S-122, S-366). */
  owed: Map<string, number>
  /** Turnos negados y a quién (para el contagio de R18). */
  refusals: number
  /** Cerillos que se ha guardado a propósito por orden de esfuerzo (S-068). */
  hoarded: number
}
```

### 2.2 Qué decide, y con qué frecuencia

El catálogo pide conductas de cuatro escalas de tiempo distintas y el motor hoy las mezcla todas en
el bloque de 100 m o en el tick de 1 km. La propuesta las separa explícitamente. **Cada decisión
tiene una y solo una cadencia**, y eso es lo que hace que el coste de CPU no se dispare (§7.5).

| Cadencia | Quién decide | Qué se decide | Coste |
| -------- | ------------ | ------------- | ----- |
| **Bloque (100 m)** | nadie «decide»: se ejecuta | Física, avance, posición en la fila, consumo del turno vigente, caducidad del cerillo, cruce de banner | El de hoy |
| **Kilómetro (10 bloques)** | el director de cada equipo (`SquadRuntime`) | Pizarra (`Blackboard`), postura, claim del frente, política de caza, voto de aduana, cupo de fuga, presupuesto | 1 pasada por equipo (≤ 22) |
| **Turno (cada `relayTurnKm` = 1,5 km, o cuando el que tira se rompe)** | el grupo | Quién pasa a cabeza, quién se aparta, orden de la rueda | 1 pasada por grupo |
| **Fase (evento)** | la carrera | Cambio de fase → recálculo del `DayPlan`, de la carta y de los papeles | ~6 veces por etapa |
| **Suceso (evento)** | el afectado y quien se entere | Caída, pinchazo, corte, captura, cambio de líder virtual, cima, entrada en sector | Por suceso |

Las **fases** dejan de ser umbrales sueltos y pasan a ser un estado compartido y explícito, que es
literalmente lo que pide S-218:

```ts
export type Phase =
  | 'neutralizado'   // km < km0real (S-073, S-223)
  | 'salida'         // km0 → primera fuga consolidada (S-038, S-077)
  | 'aduana'         // hay intentos, aún no hay fuga del día (S-114, S-119)
  | 'control'        // fuga del día viva, boquete estable (S-150, S-168)
  | 'caza'           // el cierre necesario ha pasado del umbral (S-169)
  | 'aproximacion'   // 5-10 km antes de un punto conocido (puerto, sector, volante) (S-240, S-241)
  | 'decisivo'       // puerto/sector que decide (S-284)
  | 'desenlace'      // últimos 15 km o últimos 3 km del grupo de cabeza (S-347)
  | 'tregua'         // ventana concedida: captura, avituallamiento, percance (S-231, S-226, S-237)
```

La fase es **por grupo**, no por carrera: el grupo de cabeza puede estar en `desenlace` mientras el
grupeto está en `control`. Eso es lo que resuelve S-370 y S-442 de una vez.

### 2.3 El bucle, con el orden nuevo

El orden de operaciones dentro de un bloque se conserva casi entero (lo del `mapa-simulate-decisiones`
§3), con **cuatro inserciones**. Marcadas con `+`:

```
por cada bloque i:
   1. fotos previas (relojAntes, grupoAntes)
   2. caduca cerillo, banderas de terreno
+  2b. FASE de cada grupo: phaseOf(group, race) → si cambia, emite phase_change y marca dirty
   3. si i % 10 == 0:  TICK DEL DIRECTOR
+       3a. para cada equipo: blackboard = perceive(team, truth, blackboardPrev)   // R24
        3b. squadRuntime = updateSquad(structure, dayPlan, blackboard)             // R21, R05
        3c. frontAuction(squads) → frontTeamId, pagadores, intensidad               // R20
        3d. customs(squads, moves) → cuerda por movimiento, revisable                // R03
   4. jefeEnApuros, closures del bloque
   5. collapse, administerEffort, shatter, corte de abanico
+  5b. TURNO: si toca (relayTurnKm) o el que tira se rompe → rotateTurn(group)      // R18
   6. capa táctica: para cada grupo, intents = decide(agents) → resolve → moves     // R02, R19
   7. tren del último km, advance, reenganches, fusiones, caídas
+  7b. MEMORIA: apunta deudas, turnos, km al frente, sucesos conocidos               // R09
   8. resolución de movimientos, banners, limpieza
```

Las cuatro inserciones son **puras** (funciones sin estado que reciben una foto y devuelven una
decisión), que es lo que permite testearlas de unidad sin correr una etapa entera, cosa que hoy es
imposible para el 80 % de las 51 decisiones.

### 2.4 Cómo se resuelve el conflicto entre dos corredores del MISMO equipo

Hoy no hay conflicto porque no hay coordinación: `chooseInstigator` sortea sobre el pool entero, así
que dos compañeros pueden atacar en el mismo movimiento o uno contra otro (`mapa-tactics` §10). La
pieza que falta es un **árbitro por equipo y por bloque**, y es de diez líneas.

La regla es: **de cada equipo, en cada grupo y en cada bloque, como mucho un hombre paga una acción
cara**. Acción cara = atacar, saltar a un puente, tomar el frente, bajarse a por el jefe. El que
paga se elige por una prioridad que no es de fuerza sino de **papel**, porque eso es lo que dice el
catálogo entero (S-094: «el peón ataca primero y la carta se guarda»; S-304: «ataca primero el peor
rematador»; S-349: «nunca se disputan el sprint entre ellos»).

```ts
// packages/engine/src/stage/squadArbiter.ts (nuevo, puro)

export type CostlyAction = 'atacar' | 'puentear' | 'tomar_frente' | 'bajar_a_por_jefe'

export function arbitrate(
  candidates: { riderId: string; action: CostlyAction; appetite: number; duty: DayDuty }[],
  squad: SquadRuntime,
  group: GroupView,
): string[] {                 // ids que EJECUTAN; el resto se queda
  const out: string[] = []
  for (const action of ['bajar_a_por_jefe','tomar_frente','puentear','atacar'] as CostlyAction[]) {
    const pool = candidates.filter(c => c.action === action)
    if (pool.length === 0) continue
    if (pool.length === 1) { out.push(pool[0].riderId); continue }

    // 1. Si la CARTA del equipo está en el pool y hay más de uno, la carta NO paga:
    //    ataca el peón para que los rivales gasten cerrando (S-094, S-304, S-306).
    const peones = pool.filter(c => c.duty.kind !== 'carta')
    const elegibles = peones.length > 0 ? peones : pool

    // 2. Entre peones: el PEOR rematador del final que viene, que es el que menos
    //    pierde si le cierran y el que más gana si le dejan (regla 6 ya existente).
    elegibles.sort((a, b) =>
      (group.finishRankOf(a.riderId) - group.finishRankOf(b.riderId))    // peor remate primero
      || (b.appetite - a.appetite)
      || (a.riderId < b.riderId ? -1 : 1))                                // determinismo

    out.push(elegibles[0].riderId)

    // 3. El SEGUNDO del mismo equipo no ataca este bloque, pero queda ARMADO:
    //    si el primero es cerrado, el segundo ataca en el bloque siguiente con
    //    apetito ×`squadRelayAttackBoost` (2,0). Eso es «atacar por turnos» (S-304).
    for (const c of elegibles.slice(1)) squad.armed.set(c.riderId, km + squadRelayAttackKm)
  }
  return out
}
```

Y la contrapartida negativa, que es la mitad que hoy sale al revés (S-357, S-358, S-343): **un
compañero nunca salta a la rueda de un compañero**. En `followProbability`:

```ts
if (group.teamOf(follower) === group.teamOf(instigator) && follower !== instigator) {
  // Si el que ataca es de los míos, no le cierro yo el hueco: me quedo y estorbo.
  return 0
}
```

Un cambio de tres líneas que cierra por sí solo S-303, S-304, S-306, S-343, S-349, S-357 y S-358 —
siete situaciones, cuatro de ellas `CONTRARIO`.

### 2.5 Cómo se resuelve el conflicto entre el PLAN y la ORDEN individual

La regla 1 de §V.1 es literal y no se toca: **la individual manda**. Lo que cambia es que hoy eso se
implementa con un binario brutal (`rebelIds`: o estás en el plan o estás fuera del todo, con
`teamAttack = 1` y sin protección) y el catálogo pide tres grados (S-053 el exceptuado, S-024 la
carta blanca, S-057 el rebelde).

```ts
export type PlanBinding =
  | 'dentro'       // acepta el papel: recibe empuje, arropo, tren y rescate
  | 'exceptuado'   // licencia CONCEDIDA: no trabaja, no recibe ayuda, no perjudica (S-053)
  | 'carta-blanca' // exceptuado por UN día, concedido por el equipo (S-024)
  | 'rebelde'      // se lo tomó él: como exceptuado + coste de confianza y convocatoria (S-393)

export function bindingOf(orders: StageOrders, plan: DayPlan, structure: SquadStructure): PlanBinding {
  const declared = plan.roles.get(orders.riderId)
  if (structure.exempt.includes(orders.riderId)) return 'exceptuado'
  if (plan.blankCheque === orders.riderId) return 'carta-blanca'
  // Choque real: se declara carta y el equipo ya tiene otra, o trabaja para alguien de fuera.
  const choca =
    (orders.role === 'lider' || orders.role === 'sprinter') && plan.card !== null && plan.card !== orders.riderId
    || (needsTarget(orders.role) && orders.targetRiderId != null && !structure.members.includes(orders.targetRiderId))
  return choca ? 'rebelde' : 'dentro'
}
```

Y la tabla de efectos, que es donde hoy se pierde el matiz de S-053 y de S-188 (`CONTRARIO`: el
equipo persigue a su propio exceptuado):

| binding | `drive` (turno) | `attackFactor` | arropo / tren | ¿cuenta como «hombre delante»? | ¿su equipo le persigue? |
| ------- | --------------- | -------------- | ------------- | ------------------------------ | ----------------------- |
| `dentro` | del plan | del plan | sí | sí | no |
| `exceptuado` | 0 | 1,0 | **no** | **sí** (S-188) | **no** (S-188) |
| `carta-blanca` | 0 | 1,3 | parcial (arropo sí, tren no) | sí | no |
| `rebelde` | 0 | 1,0 | no | **no** (S-113) | **sí**, si amenaza la baza |

La diferencia entre `exceptuado` y `rebelde` es exactamente la que pide el dueño y es de una línea
en `manUpTheRoad`: **al exceptuado no se le persigue; al rebelde sí**.

### 2.6 Pseudocódigo del bloque de decisión, al modo de `docs/motor.md` §13.2

`motor.md` §13.2 describe el intento de movimiento como un procedimiento numerado. Este es su
equivalente para el bloque de decisión completo, que es lo que sustituye a `attemptFrom`:

```
DECIDIR(grupo g, km, race):
  1. Si g.phase == 'neutralizado' o 'tregua'  → no hay acción cara. FIN. (S-073, S-226, S-231)
  2. agentes ← [ agentFor(r, g, race) para r en g.members ]        // §3, tres contextos
  3. Para cada agente a:
       a.intents ← []
       Si puedeAtacar(a):        a.intents += Intent('atacar',   apetito(a))
       Si puedePuentear(a, g):   a.intents += Intent('puentear', apetitoPuente(a))
       Si puedeTomarFrente(a):   a.intents += Intent('tomar_frente', derecho(a.squad))
       Si jefeEnApuros(a):       a.intents += Intent('bajar_a_por_jefe', encargo(a))
  4. // ÁRBITRO POR EQUIPO: uno por equipo y por acción (§2.4)
     porEquipo ← agrupar(agentes con intents, por a.teamId)
     ejecutan ← ⋃ arbitrate(candidatos_del_equipo, squad, g)  ∪  {libres y rebeldes}
  5. // ÁRBITRO DEL GRUPO: cuántos intentos caben en este bloque
     //   - Se ELIMINA `tacticMaxMoves` como contador global (S-444).
     //   - Se ELIMINA el apagón por `closingNow` (S-487).
     //   - El tope pasa a ser por GRUPO y por FASE: cuántos intentos ha aguantado este grupo
     //     en los últimos `attemptWindowKm` (5 km) contra `attemptsPerWindow(phase, size)`.
     cupo ← attemptsPerWindow(g.phase, g.size, race.roadClass)
     Si intentos_recientes(g) ≥ cupo → solo pasa el de MAYOR apetito, y solo si supera
                                        `attemptOverflowAppetite` (1,8× el mediano). (S-116, S-329)
  6. Para cada intento que pasa, en orden de apetito descendente:
       λ ← moveLambda(kind, ctx)                 // se conserva de tactics.ts
       Si no rollMoveAttempt(λ, dx) → siguiente
       instigador ← el agente del intento         // ya NO se sortea: el árbitro lo eligió
       seguidores ← quienes(followProbability > dado)  con las dos reglas nuevas:
            · compañero del instigador → 0            (§2.4)
            · marcador emergente del instigador → wheelProbability   (S-273)
       boquete ← jumpGapSeconds(...)              // se conserva
       cuerda ← customsVote(g, movimiento, squads)  // R03: voto, no dado
       nace el movimiento con `allowed = cuerda.pasa`, `commit = coop(...)`
  7. Apunta en memoria: cerillos, coste, `mem.followed`, `mem.owed` de los que no saltaron
     debiendo, y el suceso en el `Blackboard` de cada equipo con su retardo. (R24)
```

Las tres diferencias con el procedimiento de hoy son de **estado, no de fórmula**: el instigador se
elige por papel y no por sorteo; el cupo de intentos es del grupo y de la fase y no un contador
global de movimientos vivos; y la cuerda es un voto por equipos y no un dado.

---

## 3. Los tres contextos y su contrato

Un corredor decide con tres vistas. Las tres son **de solo lectura**, se construyen una vez por
bloque de decisión y por grupo (no por corredor: se comparten), y ninguna expone la verdad del
motor más allá de lo que su equipo puede saber (R24).

### 3.1 `SelfView` — lo que un corredor sabe de sí mismo

Hoy esto existe repartido entre `MoveRider` (12 campos) y `RiderSim` (24). Se unifica y se le añade
lo que falta.

```ts
export interface SelfView {
  riderId: string
  teamId: string | null

  // --- Piernas de AHORA (ya existe, se conserva) ---
  perfil: number            // perfil efectivo en este bloque, con erosión y cerillo
  finishScore: number       // remate en el final que viene, PARA EL TAMAÑO DE SU GRUPO
  energyFraction: number    // [0,1]
  matches: number
  reserveS: number          // reserva supraumbral restante (S-454)
  driftS: number            // deriva acumulada

  // --- Piernas del PAPEL (nuevo: hoy `tac` y `spr` son de SALIDA, no efectivos) ---
  spr: number; tac: number; mon: number; col: number; lla: number; des: number; pav: number
  // (los diez códigos erosionados, no `eff0`: hoy `MoveRider.tac` y `.spr` son eff0 y eso hace
  //  que un sprinter fundido siga «siendo sprinter» para el veto de fuga de S-473)

  // --- Su sitio en la carrera (nuevo) ---
  gc: ClassSlot             // puesto y distancia en la general
  points: ClassSlot         // …y en las otras tres (S-035, R05)
  mountain: ClassSlot
  youth: ClassSlot
  jersey: JerseyKind | null // amarillo/verde/montaña/joven/equipos/mundial/nacional (S-452)

  // --- Su papel de hoy (nuevo) ---
  duty: DayDuty             // §5.3
  binding: PlanBinding      // §2.5
  orders: StageOrders

  // --- Su estado dentro de la etapa (nuevo) ---
  posInGroup: number        // 1..N, posición en la fila. LA PIEZA QUE FALTA PARA R15 ENTERO
  wheelOf: string | null    // de quién va a rueda (S-490)
  pullBlocks: number        // bloques que lleva en cabeza AHORA (S-492)
  kmSinceLastPull: number
  ailment: Ailment | null   // golpe de ayer, enfermedad, congelado (S-380, S-381, S-148)
  raceReady: number         // [0,1] ritmo de competición (S-468)
  moral: number             // [0,1] (S-384)
  contractYear: boolean     // escaparate / ya firmado (S-428)
  knowsRoad: number         // [0,1] este trozo de carretera (S-429)
}
```

**Lo que NO lleva y no debe llevar**: el depósito de nadie más, la verdad del hueco, la intención de
ningún rival. Todo eso pasa por el `Blackboard`.

### 3.2 `GroupView` — lo que un corredor ve de su grupo

Es el contexto que **hoy no existe en absoluto**. `MoveContext` lleva `groupSize` y nada más: ni
quién va dentro, ni de qué equipos, ni quién tira. Este es el que apaga R01, R02, R18 y medio R16.

```ts
export interface GroupView {
  groupId: string
  kind: 'peloton' | 'movimiento' | 'shed' | 'grupeto'
  size: number
  phase: Phase
  isBunch: boolean          // ¿lleva el título de pelotón? (mainId)

  // --- LOS MÍOS (R01: la pieza más barata del catálogo) ---
  mates: Mate[]             // compañeros presentes AQUÍ
  mateCount: number
  matesAhead: MateElsewhere[]   // compañeros en grupos por DELANTE (S-133, S-177, S-249)
  matesBehind: MateElsewhere[]  // …y por detrás (S-247, S-288, S-290)
  myCardIs: 'aqui' | 'delante' | 'detras' | 'fuera'   // dónde está la carta de mi equipo
  numericalEdge: number     // mis hombres − los del mejor rival presente (R02)

  // --- LOS OTROS ---
  byTeam: Map<string, TeamPresence>   // cuántos, quién es su carta, si ya llevan hombre delante
  freeAgents: string[]                // los sin equipo (S-235)
  rivals: RivalSlot[]                 // los que me pueden ganar ESTE final
  danger: string | null               // el que más me cuesta si prospera (S-176)
  bestFinisher: string                // el mejor rematador del grupo (S-253, S-363)
  worstFinisher: string

  // --- EL TURNO (R18: hoy no hay orden ni duración) ---
  puller: string | null      // quién va en cabeza AHORA
  wheel: string[]            // el orden de la rueda, de cabeza a cola (S-492)
  turnKmLeft: number         // cuánto le queda al que tira
  refusals: Map<string, number>  // quién se ha negado y cuántas veces (contagio)
  commitment: number         // compromiso del grupo (existe)
  tension: number            // tensión (existe, S-491)
  coopByTeam: Map<string, number>  // quién colabora de verdad, por casa (S-210)

  // --- LA FILA (R15: aforo, posición, rueda) ---
  capacity: number | null    // cabenEnFila si hay viento (S-460)
  crowding: number           // [0,1] cuánto cuesta estar delante (acordeón, S-189)
  roadClass: RoadClass       // 'ancha' | 'normal' | 'revirada' (S-493)

  finishRankOf(id: string): number   // [0,1] dentro del grupo
  perfilRankOf(id: string): number
  teamOf(id: string): string | null
}

export interface Mate {
  riderId: string
  duty: DayDuty
  binding: PlanBinding
  energyFraction: number     // de un compañero SÍ se sabe: van juntos todo el día
  matches: number
  posInGroup: number
  pulling: boolean
}

export interface TeamPresence {
  teamId: string
  count: number
  cardHere: string | null
  manUpTheRoad: boolean
  onTheFront: boolean
  claimNow: number           // su derecho al frente (R20)
  spentFraction: number      // lo que llevan gastado hoy — LEÍDO CON ERROR si no es mi equipo
}
```

**Nota de pureza**: `TeamPresence.spentFraction` de un rival es la lectura del `Blackboard`
(estimada), no `teamSpent`. De un compañero es exacta. Esa asimetría es toda la S-488.

### 3.3 `RaceView` — lo que un corredor (su director) sabe de la carrera

Aquí es donde vive el retardo. Nadie recibe la verdad: **todo lo que sale de `RaceView` viene del
`Blackboard` de su equipo**, que es la verdad de hace uno o dos kilómetros con su error.

```ts
export interface RaceView {
  km: number; kmToGo: number; totalKm: number
  phase: Phase
  stage: StageShape          // qué etapa es (§5.4)
  format: RaceFormat
  dayIndex: number; dayCount: number

  // --- Quién va delante y cuánto (creído, no real) ---
  ahead: GroupBelief[]       // de cabeza hacia atrás
  behind: GroupBelief[]
  frontGap: number           // s al grupo de cabeza, REDONDEADO y con retardo
  frontGapAge: number        // km desde que ese número se midió (S-458)
  frontComposition: Composition    // quién va dentro: equipos, cartas, rematadores

  // --- LA GENERAL VIRTUAL (R04: la pieza que hoy es un escalar) ---
  virtual: VirtualGc
  /** Lo que ESTA situación le cuesta a MI hombre, en puestos y en segundos. (S-103) */
  costToMyMan: { places: number; seconds: number; riderId: string | null }
  /** Cuánto colchón necesita mi hombre HOY, dado lo que queda de carrera. (S-391) */
  cushionNeeded: number
  /** Quién es líder virtual AHORA MISMO. (S-101, S-294) */
  virtualLeader: string | null

  // --- Puntos del recorrido conocidos (R06, R15) ---
  nextBanner: BannerAhead | null      // volante o cima: km, categoría, puntos, segundos
  nextClimb: ClimbAhead | null        // pie, cima, categoría, altitud, km a meta desde la cima
  nextSector: SectorAhead | null      // pavé, tierra
  finishAhead: FinishShape            // el final REAL, no la etiqueta (S-049)

  // --- Contexto del día (R14, R09, R28) ---
  weather: WeatherNow
  mood: { value: number; causes: MoodCause[] }
  timeCutEstimate: { seconds: number; error: number }   // R26: es una ESTIMACIÓN (S-310, S-365)
}
```

### 3.4 El contrato de verdad: quién puede leer qué

Es la parte del diseño que decide si R24 (directores falibles) es posible o es imposible, y hoy es
imposible porque todo el mundo lee `simulate.ts` directamente.

| Dato | El propio corredor | Un compañero | Un rival del mismo grupo | El director del equipo |
| ---- | ------------------ | ------------ | ------------------------ | ---------------------- |
| Depósito / cerillos | exacto | exacto | **nunca** | exacto de los suyos |
| Señales de esfuerzo (posición, si deriva, si sube sentado) | — | exacto | **con error** (`readNoise`) | con error |
| Hueco a otro grupo | — | — | — | **retardado + redondeado + sesgado** |
| Composición del grupo de delante | — | — | — | retardada (radio) |
| Sucesos (caída, pinchazo, corte) | inmediato si le pasa a él | 0-1 km | 1-2 km | 1-2 km, a veces mal |
| Clasificaciones | exacto | exacto | exacto | exacto |
| Órdenes ajenas | — | **sí, las de su equipo** | nunca | las de su equipo |

Esa tabla es el tipo `Blackboard`:

```ts
export interface Blackboard {
  teamId: string
  km: number
  /** Hueco creído por grupo. `beliefOf(groupId)` = verdad de hace `lag` km, redondeada a
   *  `round` s y desplazada `bias` s. (S-458) */
  gaps: Map<string, { seconds: number; measuredKm: number }>
  /** Sucesos ya conocidos, con el km en que se supieron y si llegaron BIEN. (S-478) */
  known: Map<string, { atKm: number; accurate: boolean }>
  /** Lo que se lee de cada rival relevante. (S-488) */
  reads: Map<string, RivalRead>
  /** Composición del grupo de cabeza tal como la cree este equipo. */
  frontComposition: Composition
}

export interface RivalRead {
  riderId: string
  positionBand: 'cabeza' | 'medio' | 'cola'
  helpersLeft: number        // cuántos gregarios le quedan: se cuentan, se ven
  strainSignal: number       // [0,1]: sube sentado / de pie / ha bajado a por bidones
  confidence: number         // [0,1]: baja si el rival DISIMULA (S-488)
}
```

Y la función que lo produce, que es toda la pieza de R24:

```ts
export function perceive(
  team: SquadRuntime, truth: RaceTruth, prev: Blackboard, km: number, rng: Rng,
): Blackboard {
  const q = team.structure.quality        // [0,1] calidad de dirección (S-009, S-014)
  const lag   = lerp(dirLagKmMax /*2,0*/, dirLagKmMin /*0,6*/, q)
  const round = lerp(dirRoundMax /*30 s*/, dirRoundMin /*5 s*/, q)
  const bias  = rng.normal(0, lerp(dirBiasSdMax /*20 s*/, dirBiasSdMin /*4 s*/, q))

  const gaps = new Map()
  for (const g of truth.groups) {
    const past = truth.gapAt(g.id, km - lag)          // el hueco de hace `lag` km
    gaps.set(g.id, { seconds: Math.round((past + bias) / round) * round, measuredKm: km - lag })
  }
  // Sucesos: se conocen `newsLagKm` (1,2 km) después, y con `newsWrongChance` (0,25) mal.
  // Lecturas del rival: strainSignal = verdad + N(0, readNoiseSd·(1 − q)), y el que
  //   DISIMULA (S-488) resta `hideStrength` a la señal mientras le quede reserva.
  ...
}
```

**Por qué esto es la pieza madre de R24, S-009, S-013, S-014, S-152, S-169 y S-458**: hace que dos
equipos con los mismos vatios corran distinto, sin tocar la física. Un equipo de calidad 0,3 empieza
a cazar con el número de hace dos kilómetros redondeado a treinta segundos, y por eso llega tarde
una de cada cinco veces. Hoy las cazas «salen siempre clavadas» porque nadie puede equivocarse.

---

## 4. Las reglas, racimo por racimo

Los 28 racimos del catálogo, en su orden. Cada uno con: **la pieza de estado** que lo resuelve, la
regla en forma implementable, **qué situaciones cierra** (por ID), **constantes nuevas con valor de
partida** y **cómo se mide**. Donde el valor de partida es una conjetura razonada y no un número
medido, se dice «calibrar con banco» explícitamente.

Convención de la columna de medida: `estadística` → `banco` → `banda propuesta`. Las bandas nuevas
van todas a §9.

---

### R01 · Compañeros visibles dentro del grupo — 15 situaciones

**Pieza**: `GroupView.mates`, `matesAhead`, `matesBehind`, `myCardIs`. Es la más barata del catálogo:
un `Map<groupId, Map<teamId, string[]>>` que se construye una vez por bloque de decisión al recorrer
los grupos, coste O(N).

**Reglas**

```
R01.1  Nadie releva mientras un hombre de los suyos vaya por delante y NO sea un rebelde.
       enTurno(a) = false  si  a.group.matesAhead.some(m => m.binding !== 'rebelde')
       — y esto vale también DENTRO del pelotón, que es la mitad que falta en S-128.

R01.2  Un equipo con hombre delante MARCA: cierra los saltos que amenazan a su fugado.
       followProbability(a, instigador) ×= 1 + guardAheadGain·(1 − distanciaNormalizada)
       cuando a.group.matesAhead ≠ ∅ y el instigador amenaza a ese grupo.   (S-177, la mitad ausente)

R01.3  Se trabaja para el MEJOR SITUADO de los míos que aún puede ganar algo, esté donde esté.
       beneficiario(a) = argmax_{m ∈ {mates ∪ matesAhead ∪ matesBehind}} valorEsperado(m)
       — decide `pullFor` y el empuje, y cierra S-191 y el «X tira para Y que no está aquí» de v59.

R01.4  Esperar al compañero: si mi carta se queda en el puerto y yo voy delante, dejo de relevar en
       la coronación y regulo en el descenso hasta `waitMaxSeconds` (45 s) o hasta que el hueco con
       los perseguidores baje de `waitAbortGapS` (60 s).     (S-249, S-110 con aritmética)
```

**Cierra**: S-089, S-113, S-128, S-133, S-177, S-187, S-188, S-191, S-211, S-247, S-249, S-250,
S-307, S-314, S-318.

**Constantes**: `guardAheadGain` 0,45 · `waitMaxSeconds` 45 · `waitAbortGapS` 60 · `mateVisibleGapS`
25 (hasta qué hueco «ves» a un compañero de otro grupo; más allá te lo cuenta el director con
retardo). Todas **calibrar con banco**.

**Medida**: `pullsWithMateAheadPct` = % de bloques en que alguien tira teniendo compañero delante →
banco `chronicle` sobre `teamedField` → banda propuesta **0-3 %** (hoy, en el pelotón, es alta y no
se mide).

---

### R02 · Superioridad numérica: dos compañeros en el mismo grupo — 12 situaciones

**Pieza**: `GroupView.numericalEdge` + `squadArbiter` (§2.4) + la regla de no saltar a la rueda de un
compañero.

**Reglas**

```
R02.1  (§2.4) Un solo hombre por equipo paga acción cara por bloque; ataca el PEÓN, no la carta.
R02.2  Ningún compañero salta a la rueda de un compañero: followProbability = 0.
R02.3  Ataque alternado: si el peón es cerrado, el segundo queda ARMADO durante
       squadRelayAttackKm (3 km) con apetito ×squadRelayAttackBoost (2,0).
R02.4  Relevos de la mayoría: en un grupo donde mi equipo tiene mayoría, el deber del turno de los
       míos se reparte: solo entran `ceil(mateCount/2)`, y la carta nunca.   (S-306)
R02.5  El que está en minoría, con dos rivales de la misma casa contra él:
       si remata MEJOR que los dos  → interés propio ×selfishMinorityGain (1,6): se escaquea.
       si remata PEOR              → ataca antes: apetito ×minorityAttackBoost (1,5), y lejos.
       si el pelotón viene a menos de `minorityCollabGapS` (45 s) → colabora igual. (S-265)
R02.6  En meta: dos del mismo equipo en el mismo grupo no se disputan el sprint.
       El de peor `finishScore` pasa a `lanzador` improvisado: aporta
       leadOutBoostPerHelper al otro y renuncia a su propio remate. (S-349, S-357, S-362)
```

**Cierra**: S-094, S-265, S-293, S-303, S-304, S-305, S-306, S-343, S-349, S-357, S-358, S-362.

**Constantes**: `squadRelayAttackKm` 3 · `squadRelayAttackBoost` 2,0 · `selfishMinorityGain` 1,6 ·
`minorityAttackBoost` 1,5 · `minorityCollabGapS` 45. **Calibrar con banco**; los dos primeros son
los sensibles.

**Medida**: `mateSprintClashPct` = % de llegadas agrupadas con dos del mismo equipo en el top-3 sin
que uno haya lanzado al otro → banco `smallTours` → banda propuesta **0-8 %** (v48 lo midió ad hoc:
«de los seis casos, ninguno llevaba un lanzador dentro»).

---

### R03 · La aduana como voto por equipos, revisable cada kilómetro — 24 situaciones

**Pieza**: `customsVote()`, que sustituye a `pelotonAllows` (el dado). El voto se recalcula **cada
kilómetro** mientras el movimiento viva, y su resultado ya no es un `boolean` congelado al nacer
(`Move.allowed`) sino un **presupuesto de cuerda vivo**: `Move.leashSeconds`.

**Reglas**

```
customsVote(mov, squads, race) → { leashSeconds, closers[] }

  Cada equipo emite un voto en [−1, +1]:
     v_repr   = +0,9  si tiene una CARTA dentro del movimiento
                +0,4  si tiene un hombre cualquiera dentro
                −0,6  si no tiene a nadie Y tiene motivo con derecho al frente
                 0     si no tiene a nadie y no tiene motivo
     v_gc     = −1,0  si la general VIRTUAL del mejor fugado pasa por delante de MI hombre
                       (escala: −1,0 si le pasa; −0,5·(1 − d/cushionNeeded) si se acerca)   (S-088, S-103)
     v_remate = −0,8  si dentro va alguien que le gana ESTE final a mi carta          (S-090)
                +0,3  si dentro NO hay ningún rematador de mi terreno
     v_comp   = −0,5  si el movimiento lleva ≥ `customsSameTeamCap` (2) de una misma casa
                       Y el grupo es pequeño (< 10): «esa fuga no me vale»            (S-083, S-114)
     v_mem    = −0,4  si dentro va el ganador de ayer / el revelación de ayer          (S-423, S-425)
                −0,3  si dentro va quien estuvo fuera ayer                             (S-076)

  voto_e = clamp(v_repr + v_gc + v_remate + v_comp + v_mem, −1, +1)

  // La agregación NO es una media: es una SUBASTA de trabajo (S-119).
  // La fuga sale si nadie con hombres frescos está dispuesto a pagar el cierre.
  fuerzaCierre = Σ_{e : voto_e < −customsCloseThreshold (0,25)}  poder(e)
       poder(e) = presentes(e) · (1 − spentFraction(e)) · claimWeight(e.motivo)
  fuerzaDejar  = Σ_{e : voto_e > +0,25}  poder(e)

  leashSeconds = leashBase (90)
       · (1 + customsLeashGain (3,0) · clamp(fuerzaDejar − fuerzaCierre, −1, 1))
       · terrainFactor(breakAppeal)
       · moodFactor(race.mood)
  closers = los equipos con voto < −0,25, ordenados por poder    // quién PAGA el cierre (R20)

  VETOS que sobreviven (se conservan tal cual):
     · el maillot en la fuga (S-118) → leash = 0
     · el sprinter puro no se va (S-473) y el que venía tirando casi nunca (S-472)
  VETO NUEVO:
     · el que corona una cima puntuable y se sienta deja de contar como fugado (S-080)
```

Y el otro lado de la aduana, **quién es elegible para irse**, que hoy es una única fórmula de
rodador (S-433, `CONTRARIO` con cita):

```
breakCandidateScore(r, stage) =
     0,40 · terrainFit(r, stage.terrainAhead)     // MON+COL en reina, LLA+TAC en llana
   + 0,25 · TAC
   + 0,20 · RES
   + 0,15 · motivoFit(r, squad.claims)            // el hombre del maillot de montaña en día de cimas
   × (1 − 0,5·fugóAyer(r))                        // COSTE, no veto (S-046)
   × (r.duty.kind === 'carta' ? 0,2 : 1)          // la carta no se va salvo estructura cazaetapas
```

**Cierra**: S-064, S-066, S-076, S-083, S-086, S-087, S-088, S-090, S-091, S-095, S-114, S-115,
S-116, S-117, S-118, S-119, S-120, S-121, S-149, S-425, S-433, S-472, S-473, S-474.

**S-474 (el infiltrado)** sale gratis de aquí: un equipo con `v_gc < 0` pero sin poder para pagar el
cierre mete a un hombre con `duty.kind = 'infiltrado'`, cuyo `relayDuty` es 0 dentro del movimiento;
el `moveCooperation` del grupo baja `infiltratorCoopPenalty` (0,12) por infiltrado y los demás
equipos ven la composición y le dan menos cuerda.

**Constantes**: `customsSameTeamCap` 2 · `customsCloseThreshold` 0,25 · `customsLeashGain` 3,0 ·
`leashBase` 90 s · `infiltratorCoopPenalty` 0,12 · `customsReviewKm` 1. **Todas calibrar con banco**:
este racimo es el que más mueve `flat.breakawayWinPct` y `mountain.breakawayWinPct` (§9).

**Medida**: tres estadísticas nuevas, todas sobre el banco `smallTours` y el nuevo banco pequeño
(§7.2):
- `breakTeamsRepresented` = equipos distintos en la fuga del día / tamaño de la fuga → banda **0,65-1,0**
  (hoy no se mide; el catálogo pide «un hombre por equipo» en fugas pequeñas).
- `sameTeamInBreakPct` = % de fugas de ≤ 8 con 3+ de la misma casa → banda **0-6 %**.
- `leashRevisions` = veces por etapa que la cuerda cambia de signo → banda **1-6** (S-120: hoy es 0
  porque se decide una vez).

---

### R04 · La general virtual y el colchón que depende de lo que queda — 17 situaciones

**Pieza**: `RaceView.virtual`, `costToMyMan`, `cushionNeeded`. Hoy la tolerancia es **un escalar**
(`gcLeash = min(700, 0,6 · peor déficit del grupo de cabeza)`) y por eso «la misma fuga con un hombre
a 3 min se trata igual el día 3 que el día 19» (S-391).

**Reglas**

```
R04.1  General virtual COMPLETA, por equipo y por corredor:
       virtualGc(rider) = gcTime(rider) + (rider va detrás ? gap : 0)
       ordenada; `costToMyMan.places` = puestos que pierde mi hombre; `.seconds` = segundos.
       — hoy solo se mira el MEJOR del grupo de cabeza; esto los suma a todos (S-103, S-102).

R04.2  El colchón que necesita mi hombre depende de LO QUE QUEDA DE CARRERA, no de 700 s:
       cushionNeeded(rider, race) =
             gcRecoverKmPerSecond   ·  race.remaining.climbKm        // lo que se saca en montaña
           + gcRecoverTtPerSecond   ·  race.remaining.timeTrialKm    // …y en crono
           + gcBonusPerStageLeft    ·  race.remaining.stages         // bonificaciones que quedan
       con `gcRecoverKmPerSecond` 3,5 s/km de puerto, `gcRecoverTtPerSecond` 1,2 s/km de crono,
       `gcBonusPerStageLeft` 4 s. Día 3 de una vuelta de 21 con 40.000 m: ~2.400 s de colchón útil.
       Día 19 con 1 llana: ~40 s. ESO es lo que hace que la misma fuga se trate distinto.  (S-391)

R04.3  Tolerancia por movimiento (sustituye a `gcLeash`):
       leashGc(mov) = clamp( cushionNeeded(miHombre) − costToMyMan.seconds, 0, gcLeashMax (900) )
       y el equipo cierra a tope (`intent: perseguir`, `drive` 1,0) cuando leashGc == 0.

R04.4  Maillot prestado (S-096) y maillot que no sobrevive al día:
       si finishScore(miMaillot, stage.finishAhead) < `jerseyKeepThreshold` (percentil 40 del campo)
       y quedan puertos, el equipo NO se funde: pasa a `intent: controlar` con drive 0,55.

R04.5  Traspaso del maillot en carretera (S-294): cuando `virtualLeader` cambia y se mantiene
       `virtualLeaderHoldKm` (3 km), se emite `virtual_leader_change`; el equipo del nuevo pasa a
       `controlar` y el del viejo a `perseguir` si aún puede.

R04.6  Maillot sin equipo (S-079): un agente libre con el maillot recibe drive 0,8 sobre sí mismo:
       tira él o lo pierde.
```

**Cierra**: S-048, S-078, S-079, S-096, S-097, S-098, S-099, S-100, S-101, S-102, S-103, S-104,
S-181, S-239, S-258, S-294, S-391.

**Constantes**: `gcRecoverKmPerSecond` 3,5 · `gcRecoverTtPerSecond` 1,2 · `gcBonusPerStageLeft` 4 ·
`gcLeashMax` 900 · `jerseyKeepThreshold` p40 · `virtualLeaderHoldKm` 3. Las tres primeras salen de
aritmética real (28,8 s/km de diferencia P75 65-88 medida en v44 §5, dividida por el rango típico de
la general) y las tres se **calibran con banco**. `gcControlLeash` 700 **se retira** (§9).

**Medida**: `virtualLeaderChanges` por gran vuelta → banco `grandTour` → banda **2-8**;
`leashSpreadByDay` = razón entre la cuerda media del primer tercio y del último tercio de una vuelta
→ banda **1,5-4,0** (hoy vale 1,0 por construcción, que es el defecto).

---

### R05 · Motivos secundarios como claim de equipo — 24 situaciones

**Pieza**: `ClassificationState` en `RaceContext` (el dato ya está en `raceGc`, solo hay que pasarlo)
+ `TeamClaim`, el vocabulario de motivos.

```ts
export type Motive =
  | 'etapa' | 'maillot' | 'general'                       // los tres de hoy
  | 'montaña' | 'puntos' | 'joven' | 'equipos'            // los cuatro que faltan (S-162)
  | 'combatividad' | 'patrocinador' | 'ranking'           // los tres de fondo (S-044, S-066, S-447)
  | 'ninguno'

export interface TeamClaim {
  motive: Motive
  riderId: string | null      // quién lo encarna
  weight: number              // [0,1] cuánto le importa a esta casa
  frontRight: number          // derecho al frente que da (0-4)
  breakQuota: number          // cuántos hombres autoriza a mandar a la fuga
}
```

**Reglas**

```
R05.1  Los motivos se ORDENAN, no se suman (S-020, cita del dueño):
       manda el de mayor `frontRight`; el segundo aporta `teamDriveSecondCard` (0,2) y nada más.
       Tabla de derecho al frente:
          maillot amenazado 4 · general amenazado 3 · etapa con carta 3 · puntos en día de volante 3
          montaña en día de cimas 2 · maillot no amenazado 2 · joven 2 · equipos 1
          combatividad 0 · patrocinador 0 · ranking 1 · ninguno 0
R05.2  Cada motivo dicta CUÁNDO se paga y cuándo se afloja:
          puntos:   tira desde `bannerApproachKm` (8 km) antes de la volante; suelta 500 m después
                    (S-105); monta el tren DOS veces (S-196).
          montaña:  no persigue nunca; mete hombres en los intentos hasta que uno cuaja (S-065);
                    lleva a su hombre al pie del puerto.
          joven:    corre una general de segundo nivel: arropa, no persigue, marca a SU rival de
                    edad y no a los favoritos (S-271, S-272).
          equipos:  no deja caer al tercer hombre: si el 3.º del equipo va a > `teamsClassGapS`
                    (60 s), un compañero baja a llevarle (S-250, S-295).
          patrocinador (invitado): `breakQuota` = 1 TODOS los días, aunque no haya baza;
                    y el día después de salir, `breakQuota` = 0 (S-066).
          combatividad: apetito ×`combativityAppetite` (1,4) para uno del equipo, elegido por
                    `breakScore`, en etapas con `breakAppeal` > 0,3 (S-044).
          ranking:  en meta, todos los del equipo esprintan por el puesto aunque no puedan ganar,
                    y en la general final no se regala ningún puesto (S-447).
R05.3  El maillot amarillo NUNCA sale con orden de disputar cimas ni volantes (S-015, `CONTRARIO`):
       `autoOrders` pone `contestClimbs=false`, `contestSprints=false` al `gcRank === 1`.
R05.4  El maillot que obliga (S-452): arcoíris o campeón nacional → `customsVote.v_mem −0,3` para su
       cuerda y `+markPressure` 0,3 de marcaje; y él sale con mentalidad un escalón más combativa.
R05.5  Un equipo que pierde su motivo lo pierde de verdad: al caer del podio por equipos, `equipos`
       desaparece de `claims` y sus hombres quedan libres (S-396).
```

**Cierra**: S-015, S-016, S-017, S-018, S-019, S-020, S-031, S-034, S-041, S-042, S-043, S-044,
S-045, S-065, S-105, S-108, S-162, S-271, S-272, S-383, S-396, S-407, S-447, S-452.

**Constantes**: `bannerApproachKm` 8 · `teamsClassGapS` 60 · `combativityAppetite` 1,4 ·
`motiveSecondWeight` 0,2 (= `teamDriveSecondCard`, se reutiliza). **Calibrar con banco**.

**Medida**: `frontMotiveMix` = reparto de `pullMotive` por etapa → banco `chronicle` ampliado →
banda propuesta: **al menos 3 motivos distintos en el 60 % de las etapas de una gran vuelta**;
`komLeaderInBreakPct` = % de días con muchos puntos de cima en que el líder de la montaña o su rival
directo va en la fuga → banda **40-85 %**.

---

### R06 · Las pancartas: volante y cima como puntos del recorrido — 20 situaciones

**Pieza**: `RaceView.nextBanner` (el punto existe en `Block.banner`, pero **nadie lo ve antes de
cruzarlo**) + el coste que paga solo el que acelera.

**Reglas**

```
R06.1  El banner es visible `bannerApproachKm` (8 km) antes. Entra en la fase: si hay algún equipo
       con motivo `puntos` o algún corredor con `contestSprints`, la fase del grupo pasa a
       'aproximacion' y el compromiso sube `bannerApproachCommit` (+0,12).           (S-236, S-196)
R06.2  El coste lo paga QUIEN ACELERA, no quien puntúa (S-141, `CONTRARIO`):
       disputa(r) = r.orders.contestSprints (volante) o .contestClimbs (cima)
                    ∨ r.duty.motive ∈ {puntos, montaña}
                    ∨ (banner.seconds > 0 ∧ r.gc.rank ≤ bonusContenders (10))          (S-193)
       Solo los que disputan queman `bannerCost` y `bannerMatch` (0,5 cerillos en cima HC/1.ª).
       El que pasa octavo yendo colocado no paga NADA.
R06.3  `disputeClimb` PASA a mirar `contestClimbs` (hoy no lo mira: es la mitad de S-031).
       Si nadie del grupo lo lleva marcado, puntúan por orden de paso SIN coste.
R06.4  El acelerón se contagia: durante `bannerSurgeKm` (2 km) antes de una cima de cat ≥ 2 el
       compromiso del grupo entero sube `climbBannerSurge` (+0,10).                    (S-212)
R06.5  El fugado que corona y se sienta (S-080): si su único motivo era `montaña` y ya cobró la
       última cima puntuable, `duty.kind ← 'rendido'`, deja de relevar y su grupo pierde su aporte.
R06.6  El pelotón también esprinta la volante por lo que dejan los fugados (S-153, `CONTRARIO`):
       si `banner.points[k] > 0` para k > (fugados delante), los interesados del pelotón la disputan
       y después el compromiso cae `bannerAfterDrop` (−0,15) durante `bannerAfterKm` (5 km) →
       ventana de contraataque (S-236).
R06.7  Toda etapa en línea de una vuelta lleva al menos una meta volante, colocada por el generador
       ANTES del pie del último puerto o a > 30 km de meta (S-033). Es un cambio de generador.
```

**Cierra**: S-033, S-035, S-080, S-109, S-124, S-136, S-137, S-138, S-140, S-141, S-142, S-153,
S-196, S-212, S-220, S-221, S-236, S-315, S-336, S-373.

**Constantes**: `bannerApproachKm` 8 · `bannerApproachCommit` 0,12 · `bannerSurgeKm` 2 ·
`climbBannerSurge` 0,10 · `bannerAfterDrop` −0,15 · `bannerAfterKm` 5 · `bonusContenders` 10 ·
`bannerMatch` 0,5. **Calibrar con banco.**

**Medida**: `bannerCostShare` = fracción del grupo que paga `bannerCost` en una cima → banda **0,05-0,35**
(hoy es 1,0 en `disputeClimb`, que es el defecto exacto de S-141); `bannerContenders` = cuántos
esprintan una volante → banda **3-15** (S-137).

---

### R07 · Bonificaciones — 6 situaciones

**Pieza**: `Banner.seconds` (no existe) + `RaceView.nextBanner.seconds` visible al decidir.

**Reglas**

```
R07.1  Volantes y cimas pueden dar segundos: `banner.seconds = [3,2,1]` si la carrera lo declara.
R07.2  El número es VISIBLE al decidir: un hombre de la general con
       `gc.deficit ≤ bonusWorthSeconds` (20 s) entra en la disputa del sprint de meta aunque no
       remate: apetito de sprint ×`bonusSprintPull` (1,5) y el maillot se mete a taparle.  (S-334)
R07.3  El líder con la general HECHA (`gc.deficit` del 2.º > `gcSettledSeconds`, 180 s) no disputa la
       etapa: `finishScore` ×`settledLeaderFinish` (0,85) y su equipo no monta tren.       (S-335)
R07.4  El sprinter-maillot conserva su tren y su lanzador (S-352, `CONTRARIO`): el veto del maillot
       se aplica a la FUGA y al ataque, nunca al sprint de meta.
```

**Cierra**: S-193, S-334, S-335, S-352, S-353, S-360.

**Constantes**: `bonusWorthSeconds` 20 · `bonusSprintPull` 1,5 · `gcSettledSeconds` 180 ·
`settledLeaderFinish` 0,85. **Calibrar con banco.**

**Medida**: `gcRidersInSprintPct` = % de sprints masivos con al menos un top-5 de la general entre
los 10 primeros, en vueltas con general apretada (< 30 s) → banda **35-80 %** (hoy ~0).

---

### R08 · El depósito que persiste entre etapas — 16 situaciones

**Pieza**: `RaceContext.memory.ailments` + `raceReady` + recuperación por corredor. La mitad ya
existe y está `CUBIERTO` (S-377, S-378): `deepDepletedYesterday` cruza la noche por
`stageRun.ts:246`. Lo que falta es lo que **no** cruza.

**Reglas**

```
R08.1  Golpe de ayer (S-380): `ailment = {kind:'golpe', severity, daysLeft}` →
       eff0 ×(1 − `bruiseEffLoss` 0,04·severity), `relayDuty` −1,0, `descentRisk` ×0,6,
       y `dropLambda` ×1,25. Dura `bruiseDays` (3) menguando.
R08.2  Enfermedad progresiva (S-381, `CONTRARIO`): la enfermedad no es un dado de abandono, es un
       estado con curva. `illness.stage` ∈ {incubando, agudo, remitiendo}; el abandono solo puede
       ocurrir desde `agudo` y con `illnessDays ≥ 2`.
R08.3  Recuperación por corredor (S-482): `recoveryRate(REC, edad)`; el veterano aguanta el esfuerzo
       aislado (`recoveryPeakAge` 32) y se hunde en la repetición (`recoveryRepeatPenalty` por día
       consecutivo duro); el joven en su primera gran vuelta cae en la tercera semana
       (`firstGtWeek3Drop` 0,08 sobre eff0).
R08.4  Ritmo de competición (S-468): `raceReady = clamp(1 − daysWithoutRacing/`raceReadyDays` (30), 0,7, 1)`
       → coste de bloque ×(2 − raceReady) durante la primera hora, `posInGroup` inicial peor,
       apetito de ataque ×raceReady. Sube `raceReadyGainPerDay` (0,1) por día de dorsal.
R08.5  El director LEE todo esto al repartir papeles: `assignTeam` recibe `energyFraction`,
       `matches`, `ailment` y `raceReady`, que hoy no recibe (`AutoOrderRider` solo lleva atributos).
R08.6  Retirada por orden (S-450): el equipo puede bajar a un hombre sano pero gastado si
       `remainingUsefulness < withdrawThreshold` (0,25) y quedan ≥ 3 días. Es una decisión del
       director, se narra, y mañana corre con uno menos.
```

**Cierra**: S-144, S-377, S-378, S-379, S-380, S-381, S-385, S-389, S-398, S-399, S-410, S-411,
S-431, S-450, S-468, S-482.

**Constantes**: `bruiseEffLoss` 0,04 · `bruiseDays` 3 · `recoveryPeakAge` 32 ·
`recoveryRepeatPenalty` 0,03/día · `firstGtWeek3Drop` 0,08 · `raceReadyDays` 30 ·
`raceReadyGainPerDay` 0,1 · `withdrawThreshold` 0,25. **Calibrar con banco**, y R08.3 hay que
cruzarla con `diseno-entrenamiento.md` §4.5 para no duplicar el reloj de edad: **usa `kAge` y `REC`
del diseño hermano, no una curva nueva**.

**Medida**: `dnsPct` (no toman la salida) → banco `grandTour` → banda **0-6 %**;
`week3EffDrop` = caída media de eff0 entre la semana 1 y la 3 → banda **0,04-0,12**.

---

### R09 · Las deudas y el humor del pelotón — 21 situaciones

**Pieza**: `PelotonMemory` entero, y el humor con causa en vez de dado.

**Reglas**

```
R09.1  El humor deja de ser un dado por etapa (`humorDelPeloton`, `mood` subflow) y pasa a ser
       una suma de causas nombradas (S-224, S-424, S-484):
         mood = moodBase (1,0)
              − moodAfterQueen (0,12)      si ayer fue reina
              − moodBeforeQueen (0,08)     si mañana es reina                (S-427)
              − moodTransfer (0,06)        si el traslado de ayer > `transferHardKm` (150 km)  (S-484)
              − moodHeat (0,10)·calor      si calor extremo                  (S-238)
              − moodNoMotive (0,10)        si ningún equipo tiene motivo con derecho ≥ 2  (S-234)
              + moodRestDayEve (0,06)      víspera de descanso               (S-422)
              − moodRestDayAfter (0,08)    día después de descanso           (S-422)
              + moodDesperate (0,05)·equiposSinNada/total                    (S-397, S-402)
       El dado se conserva SOLO como ruido: N(mood, `moodNoiseSd` 0,04). Sigue siendo determinista
       (mismo subflujo `mood`), pero ahora se puede explicar en la crónica.
R09.2  Deudas de relevo (S-081, S-413):
       ledger[from→to] += `debtPerRefusal` (1,0) cuando alguien no releva debiendo, en un grupo
       donde el otro sí relevó. Al día siguiente: `relayDuty(to)` −= `debtRelayPenalty` (0,4)·debt
       cuando `from` está en su grupo, y `customsVote.v_mem` −0,2. Decae `debtDecayPerDay` (0,35).
R09.3  El ganador de ayer y el revelación (S-423, S-425): `customsVote.v_mem` −0,4; y marcaje:
       el equipo del 2.º dedica un hombre a `marking = ganador de ayer` (S-400, S-401).
R09.4  Rivalidad estructural (S-404): pares de equipos con `rivalry > rivalryThreshold` (0,6) nunca
       se relevan entre sí ni se alían. La rivalidad nace de historial (ganarle una etapa sube 0,15)
       y decae `rivalryDecayPerRace` (0,1).
R09.5  Reparto tácito de fugas (S-408): un equipo sin baza que fugó ayer tiene `breakQuota` 0 hoy si
       hay ≥ `quotaRotationTeams` (4) equipos sin baza; el turno rota por orden de última fuga.
R09.6  El trato dentro de la fuga (S-453): dos fugados pueden pactar `deal = {cede: 'etapa',
       recibe: 'volante'}` si sus motivos no chocan; el que rompe el trato paga `debtPerBrokenDeal`
       (2,0) en el ledger y en la aduana de mañana.
```

**Cierra**: S-046, S-081, S-106, S-224, S-229, S-234, S-354, S-397, S-401, S-402, S-403, S-404,
S-408, S-413, S-422, S-423, S-424, S-426, S-427, S-453, S-484.

**Constantes**: `moodBase` 1,0 · `moodAfterQueen` 0,12 · `moodBeforeQueen` 0,08 · `moodTransfer`
0,06 · `moodHeat` 0,10 · `moodNoMotive` 0,10 · `moodRestDayEve` 0,06 · `moodRestDayAfter` 0,08 ·
`moodDesperate` 0,05 · `moodNoiseSd` 0,04 · `transferHardKm` 150 · `debtPerRefusal` 1,0 ·
`debtRelayPenalty` 0,4 · `debtDecayPerDay` 0,35 · `rivalryThreshold` 0,6 · `rivalryDecayPerRace` 0,1
· `quotaRotationTeams` 4 · `debtPerBrokenDeal` 2,0. **Todas calibrar con banco**; la suma de causas
debe quedar centrada en el `pelotonMoodCentre` 0,9 de hoy para no mover las huellas (§9).

**Medida**: `moodExplainedPct` = % de etapas cuyo humor tiene al menos una causa nombrada → banda
**90-100 %**; `breakTeamRepeatPct` = % de días en que la fuga repite el equipo del día anterior →
banda **5-25 %** (S-408).

---

### R10 · El plan de varios días — 12 situaciones

**Pieza**: `SquadStructure.cards[].targetDays` + `RaceBudget`, que reparte el presupuesto de la
carrera entre etapas. Hoy `budget = teamBudgetPerRider (9) × leales` **por etapa y sin memoria**.

**Reglas**

```
R10.1  Presupuesto de CARRERA: `raceBudget = teamBudgetPerRider · leales · stageCount · raceBudgetSlack (1,15)`.
       Reparto: `dayBudget(d) = raceBudget · weight(d) / Σ weight`, con
          weight(d) = 1 + `targetDayWeight` (1,6) si d ∈ card.targetDays
                        − `eveWeight` (0,35)      si d+1 ∈ targetDays          (S-427, S-405)
                        − `afterQueenWeight` (0,25) si d−1 fue reina            (S-424)
       Un equipo que se gasta el presupuesto del día tiene drive interpolado hacia
       `teamDriveTired` como hoy; pero además **se lo lleva de la carrera**: gastar de más hoy es
       menos presupuesto mañana. Eso es todo S-055 y S-405.
R10.2  El objetivo de carrera existe como dato (S-022): `structure.cards[].scope` y
       `structure.objective ∈ {general, etapas, maillot-secundario, aprender}`.
R10.3  La crono dentro del plan (S-382, S-386, S-387, S-394):
       · si `remaining.timeTrialKm > 0` y mi hombre es mal cronista → apetito de ataque en montaña
         ×`badTtAttackBoost` (1,4) los días ANTES de la crono, y la víspera se esconde.
       · el buen cronista con la general en la crono controla y no gasta antes (`intent: controlar`).
R10.4  El día después de perder tiempo (S-376, `CONTRARIO`): si mi hombre cedió
       `> lostBigSeconds` (90 s) ayer, hoy `structure` no cambia pero el `DayPlan` sí:
       `chasePolicy = 'nunca'`, `breakQuota` +1 y apetito de la carta ×`revengeAttack` (1,5).
R10.5  Corrección del plan leyendo lo de ayer (S-403, S-420): el director bot re-evalúa
       `chasePolicy` y `breakQuota` con `memory.teamTally`; el humano lo hace con el informe (§6).
```

**Cierra**: S-022, S-028, S-055, S-376, S-382, S-384, S-386, S-387, S-394, S-405, S-409, S-420.

**Constantes**: `raceBudgetSlack` 1,15 · `targetDayWeight` 1,6 · `eveWeight` 0,35 ·
`afterQueenWeight` 0,25 · `badTtAttackBoost` 1,4 · `lostBigSeconds` 90 · `revengeAttack` 1,5.
**Calibrar con banco.**

**Medida**: `budgetPeakRatio` = presupuesto del día objetivo / día medio, por equipo → banda
**1,4-2,5**; `targetDayWinShare` = % de victorias de un equipo que caen en sus `targetDays` → banda
**35-75 %**.

---

### R11 · Percances mecánicos y el coche de equipo — 10 situaciones

**Pieza**: `Mishap` como suceso de primera clase + `Caravan`, el orden de los coches. Es el racimo
más «de estado puro»: no hay ninguna decisión nueva, hay un suceso que hoy no existe y un dato
(dónde está tu coche) del que cuelga el precio de todo lo demás.

```ts
export interface Mishap {
  riderId: string; km: number
  kind: 'pinchazo' | 'averia' | 'caida'
  /** Segundos parado antes de que llegue asistencia. */
  stopS: number
  /** Quién le asiste: su coche, la neutra, o un compañero que le da la bici. */
  aid: 'coche' | 'neutra' | 'companero' | 'ninguna'
  /** Dónde ocurre: decide si hay caravana. */
  where: 'peloton' | 'grupo' | 'cabeza' | 'puerto' | 'sector'
}

export interface Caravan {
  /** Orden de los coches: el del líder primero, el del modesto el vigésimo. */
  order: string[]                 // teamId[]
  /** Se REORDENA cuando la carrera se parte: suben los que tienen hombre delante. */
  reorderedAtKm: number | null
  /** Dónde está la caravana: no hay coches en cabeza de carrera ni en un puerto estrecho. */
  presentIn: Set<string>          // groupId[]
}
```

**Reglas**

```
R11.1  Probabilidad de pinchazo por bloque: `flatRate` (0,00004/km) × terreno
       (llano 1, pavé `pavePunctureFactor` 6, tierra 9, mojado ×1,6). Avería: 1/4 del pinchazo,
       coste doble.
R11.2  Tiempo parado = `mishapBaseS` (18 s) + espera de asistencia:
          coche propio:   `carArrivalS` (25 s) + `carOrderPenaltyS` (2 s) × posición en la caravana
          neutra:         `neutralArrivalS` (55 s) y rueda que encaja peor (+8 s de rodadura)
          ninguna (cabeza de carrera, puerto estrecho, carrera partida):  `noAidS` (95 s)
       — «treinta segundos de diferencia sistemáticos» entre el coche del líder y el del modesto
         (S-222) sale de `carOrderPenaltyS × 19 ≈ 38 s`.
R11.3  El ascensor de los coches (S-435): mientras haya caravana detrás, el que vuelve gana
       `caravanPaceGain` (12 s/km) hasta reengancharse. Sin caravana, 0.
R11.4  Colar un hombre en la fuga COMPRA coche (S-222 + S-084/S-093): al reordenar, los equipos con
       hombre delante suben; los demás se quedan sin asistencia en cabeza el resto del día.
R11.5  La bici del gregario (S-201): solo vale si `talla` y `pedales` coinciden
       (`bikeSwapCompatible`, 0,45 de probabilidad dentro de un equipo); el que la cede queda
       `aid:'ninguna'` hasta que llegue su coche. Dentro de los últimos 3 km no salva nada (S-374).
R11.6  En la crono no hay compañero (S-202): la bici de repuesto la trae el coche propio, siempre,
       con `ttSwapS` (35 s). Con eso el corte del 0,25 deja de ser una salvaguarda dormida (S-375).
```

**Cierra**: S-111, S-127, S-146, S-192, S-201, S-202, S-222, S-283, S-298, S-435 (y desbloquea
S-375).

**Constantes**: `flatPunctureRate` 0,00004/km · `pavePunctureFactor` 6 · `dirtPunctureFactor` 9 ·
`mishapBaseS` 18 · `carArrivalS` 25 · `carOrderPenaltyS` 2 · `neutralArrivalS` 55 · `noAidS` 95 ·
`caravanPaceGain` 12 s/km · `bikeSwapCompatible` 0,45 · `ttSwapS` 35. Los de tiempo salen de
carretera (un cambio de rueda real son 15-25 s); las tasas, **calibrar con banco**.

**Medida**: `mishapsPerStage` → banda **1,5-6** en llano, **3-12** en pavé; `mishapLossMedianS` por
tipo de sitio → bandas **20-60 s** (pelotón) y **90-240 s** (cabeza/puerto);
`ttIncidentPct` → banda **1-4 %** (S-127, que es el número que el catálogo pide literalmente).

---

### R12 · Caídas: la tregua, el rescate y el tiempo — 18 situaciones

**Pieza**: la caída ya existe (`crash.ts`); lo que falta es **quién se entera y cuándo** (el
`Blackboard`, §3.4) y **la tregua como acto con autor**.

**Reglas**

```
R12.1  La noticia llega tarde y mal (S-478): el suceso entra en `blackboard.known` a
       `km + newsLagKm(q)` con `newsLagKm = lerp(2,0, 0,6, calidad)`, y con
       `newsWrongChance` (0,25) llega con el corredor equivocado o la gravedad equivocada.
       TODAS las decisiones de este racimo leen `known`, no la verdad.
R12.2  La tregua NO la dispara el terreno: la PIDE alguien (S-237).
          pedir: el equipo del afectado se pone delante  ⟺  afectado.duty.kind == 'carta'
                 ∧ fase ∉ {decisivo, desenlace} ∧ no hay abanico abierto
          conceder: cada equipo vota con
                 +debtTo(equipoDelCaido)  (le debo: esperé yo ayer o me esperaron)
                 −truceGainNow            (lo que gano si NO espero: general virtual)
                 +truceNorm (0,5)         (la costumbre)
          se concede si Σ votos > 0 y ≥ `truceMinTeams` (3) equipos con hombres delante.
          Negarla cuesta: `ledger[yo→ellos] += 1,5` y reputación (S-195 es su cara opuesta).
R12.3  El rescate escalonado (S-290): bajan de 1 a 4 según lo que se juega, **y desde cualquier
       clase de grupo**, no solo desde un `shed` (el defecto medido de S-290).
          n = 1 + floor(3 · valorDelJefe) ,  valorDelJefe = f(motivo, general, kmToGo)
       Elegidos por `freshness × LLA`, nunca la carta de la etapa, nunca el maillot.
R12.4  La regla de los 3 km (S-374): con caída/pinchazo/avería dentro de los últimos 3 km se da el
       tiempo del grupo, SALVO final en alto y crono. El jurado puede declararla a 4-5 km si
       `finishHazard > hazardDeclareThreshold` (0,6).
R12.5  El taponamiento (S-466): en un sector con `width < taponWidth` (5 m), una caída bloquea a los
       de detrás en función de `posInGroup`: los que van por detrás del punto pierden
       `taponBaseS` (25 s) + `taponPerRiderS` (0,4 s) × cuántos hay delante de ellos.
R12.6  Caída en la fuga (S-110, `CONTRARIO`): aritmética, no cortesía. Se espera si
       `gapToChase > waitAbortGapS` (60 s) ∧ el caído da relevos ∧ no es el que gana el sprint.
```

**Cierra**: S-110, S-145, S-156, S-195, S-198, S-199, S-200, S-213, S-237, S-251, S-252, S-290,
S-297, S-374, S-435, S-456, S-466, S-478.

**Constantes**: `newsLagKmMax` 2,0 · `newsLagKmMin` 0,6 · `newsWrongChance` 0,25 · `truceNorm` 0,5 ·
`truceMinTeams` 3 · `hazardDeclareThreshold` 0,6 · `taponWidth` 5 · `taponBaseS` 25 ·
`taponPerRiderS` 0,4. **Calibrar con banco.**

**Medida**: `truceGrantedPct` = % de caídas de una carta lejos de meta en que se concede tregua →
banda **45-85 %**; `rescueSuccessPct` = % de jefes cortados que vuelven con rescate → banda
**55-85 %** (v36 midió 66 % con tope y 81 % sin; la banda cubre las dos).

---

### R13 · Fatiga y hundimiento dentro de la etapa — 14 situaciones

**Pieza**: la moneda física está `CUBIERTO` y medida (S-454, S-455, S-461, S-475). Lo que falta es
**que el hundimiento sea observable y que alguien reaccione**: `RivalRead.strainSignal`.

**Reglas**

```
R13.1  Señal de esfuerzo observable, con error (S-488):
       strainTruth(r) = 0,5·(1 − energyFraction) + 0,3·min(1, driftS/20) + 0,2·(1 − reserveS/65)
       strainSeen(r, observador) = clamp(strainTruth − hide(r) + N(0, readNoiseSd·(1 − q)), 0, 1)
          hide(r) = `hideStrength` (0,25) mientras le quede reserva y su `TAC` esté por encima de la
                    mediana: el jefe tocado se esconde DELANTE y con cara de fresco.
R13.2  Oler la sangre CON identidad (S-319, S-269 `CONTRARIO`): en un grupo, si
       `strainSeen(rival) > bloodThreshold` (0,55) y ese rival es `danger` para alguien:
          · el compromiso del grupo sube `bloodCommit` (+0,10)
          · el apetito de ataque de sus rivales directos ×`bloodAttack` (1,8)
          · y el que ataca elige el MOMENTO: `nextClimb.steepestDecile` si hay puerto (S-275, S-322)
       Hoy pasa lo contrario: cuando el favorito se rompe, se ataca menos.
R13.3  Aislar al líder (S-292): los gregarios del 2.º pasan a `intent: 'endurecer'` (tempo alto sin
       cazar) mientras `helpersLeft(maillot) > 1`; en cuanto baja a 0, el 2.º ataca.
R13.4  Pájara con causa (S-147, S-206): `bonkRisk` sube si no se avitualla en las 3 primeras horas;
       el gregario que baja a por bidones lo evita para su jefe y paga el viaje él
       (`bottleTripCost` 0,8 de depósito). El frío en descenso largo (S-148) resta
       `coldEffLoss` (0,03) al que no coge chaqueta, y repartirlas es un viaje de gregario.
R13.5  El relevo pasa al siguiente cuando el que tiraba se apaga (S-206): `rotateTurn` se dispara
       por evento, no solo por kilómetro, cuando `strainTruth(puller) > pullerBreakThreshold` (0,8).
```

**Cierra**: S-112, S-147, S-148, S-206, S-260, S-269, S-277, S-288, S-319, S-454, S-455, S-461,
S-467, S-475.

**Constantes**: `readNoiseSd` 0,18 · `hideStrength` 0,25 · `bloodThreshold` 0,55 · `bloodCommit`
0,10 · `bloodAttack` 1,8 · `bottleTripCost` 0,8 · `coldEffLoss` 0,03 · `pullerBreakThreshold` 0,8.
**Calibrar con banco**; `bloodAttack` es la que revierte S-269 y hay que medirla contra
`mountain.top10GapSeconds`.

**Medida**: `attacksAfterLeaderCracks` = ataques por km en los 5 km siguientes a que el maillot
empiece a derivar, dividido por la tasa base → banda **1,5-3,5** (hoy < 1, que es el `CONTRARIO`).

---

### R14 · Meteorología con previsión — 12 situaciones

**Pieza**: `WeatherForecast` en `RaceContext` (existe `stageWeather` y `weatherForecast` en el
cliente; **el motor recibe el clima pero las órdenes no lo pueden citar**) + viento de cara/cola,
que hoy no existe (solo lateral).

**Reglas**

```
R14.1  El viento tiene DIRECCIÓN: `wind = {lateral, head}` con `head ∈ [−1, 1]`.
       El de cara/cola escala la velocidad de referencia del llano ×(1 − `windHeadGain` (0,08)·head)
       y, sobre todo, el CÁLCULO DE LA CAZA: con viento de cara la fuga se caza antes; con viento de
       cola, después. Hoy nadie lo ve.                                                (S-203)
R14.2  El parte existe antes de la etapa y las órdenes lo pueden citar (S-032):
       `triggerWhen: { kind: 'lluvia' | 'viento' | 'km' | 'puerto' | 'sector', value }`.
R14.3  La lluvia va y viene: `rainAt(km)` con `rainOnsetChance` (0,20) de empezar a mitad de etapa;
       cambia el plan del día en el tick de fase (S-204, S-205).
R14.4  El abanico se cierra cuando la carretera gira (S-324, `CONTRARIO`): `windEffective(km)`
       depende del RUMBO del trazado, que el generador ya puede emitir; los cortados vuelven cuando
       `windEffective < windMinEffective` (0,3).
R14.5  El material del día (S-430): elección por equipo con el parte en la mano; acierto/error
       ±`materialEffDelta` (0,02) en el terreno correspondiente. Es una decisión del director, se
       narra, y el que se equivoca lo paga.
R14.6  La lotería del horario de la crono (S-462): la ventana meteorológica se mueve durante la
       tarde; los últimos en salir (los favoritos, por orden inverso) pueden coger otro tiempo.
       `ttWeatherWindowShare` (0,3) del campo comparte condición.
```

**Cierra**: S-032, S-037, S-203, S-204, S-205, S-238, S-281, S-299, S-324, S-325, S-430, S-462.

**Constantes**: `windHeadGain` 0,08 · `rainOnsetChance` 0,20 · `windMinEffective` 0,3 ·
`materialEffDelta` 0,02 · `ttWeatherWindowShare` 0,3. **Calibrar con banco**; ojo, v42 midió que
viento, lluvia y calor están «dentro del ruido» con las semillas de hoy: R14 no se puede medir sin
subir semillas (§7.5).

**Medida**: `catchKmByWind` = mediana de `catchKmToFinish` con viento de cara vs de cola → se exige
**diferencia ≥ 4 km**; `echelonReclosePct` → banda **20-60 %**.

---

### R15 · Colocación y posición como recurso — 25 situaciones

**Pieza**: `SelfView.posInGroup` y `wheelOf`. **Es la pieza que hoy no existe en ninguna parte** («el
motor no guarda posición por corredor dentro de un grupo», S-490) y de la que cuelgan 25 situaciones,
el segundo racimo más grande.

```ts
/** Posición dentro de un grupo. Barata: un array ordenado por grupo, reordenado cada km. */
export interface GroupOrder {
  groupId: string
  /** riderIds de cabeza a cola. `pos(r) = index + 1`. */
  order: string[]
  /** Coste de estar delante: sube con el tamaño y con lo revirado del trazado. */
  frontCostPerKm: number
}
```

**Reglas**

```
R15.1  Colocarse cuesta y ahorra: el que va delante paga `placeCostPerKm` (0,03 de depósito/km) por
       mantener el sitio; el que va en el puesto 120 paga el ACORDEÓN:
          acordeon(pos, size, roadClass) = `accordionBase` (0,015) · (pos/size)² · roadFactor
       con roadFactor {ancha 0,6, normal 1,0, revirada 1,8}. En 150 km eso son ~1 cerillo de
       diferencia entre ir tercero e ir ciento veinte, que es exactamente S-189.
R15.2  Mover a los tuyos al frente cuesta kilómetros (S-489): `moveUpKm(desde, hasta, size)` ≈
       `moveUpKmPerDecile` (0,7 km) por decil de posición; y un cerillo por hombre si se hace en
       menos de la mitad de ese espacio. Decidir tarde = llegar al frente ya gastado.
R15.3  La rueda que eliges (S-490): en fila india, abanico o tirón final, si el que va delante de ti
       abre hueco, tú lo heredas: `inheritedGap = gapOf(wheelOf) · `wheelInheritance` (0,85)`.
       Por eso el equipo mete a su jefe tercero y no décimo.
R15.4  Aproximación a un punto conocido (S-240, S-241, S-243): `phase = 'aproximacion'` desde
       `approachKm(kind)` {puerto 6, sector 3, volante 8, meta 10}; los equipos con carta gastan
       `approachHelpers` (2-3) hombres en subir a su hombre; el que no llega paga
       `approachLateS` (25 s) de acordeón en el pie.
R15.5  Abanico como DECISIÓN (S-155, `CONTRARIO`): un equipo con ≥ `echelonMinMen` (5) hombres en
       las `echelonFrontPlaces` (20) primeras plazas, en tramo expuesto, y con
       `echelonGain > echelonCostThreshold`, ELIGE romper. Se narra con autor.
R15.6  El aforo decide quién entra, por POSICIÓN, no por puntos de perfil (S-460):
       entran los `capacity` primeros de `GroupOrder`; el segundo abanico nace por rebose.
       El ancho de la carretera entra en `capacity`: `capacity = base(viento) · widthFactor`.
R15.7  Abrir el hueco a propósito (S-457): un corredor puede poner `intent: 'no cerrar'` si el que
       tiene delante es rival de su carta y él va cubierto; responde de ello si se equivoca de hombre.
R15.8  El gregario bajador (S-465): el mejor DES del equipo se coloca delante del jefe en el
       descenso que importa; el jefe hereda `min(su DES + `descenderTow` (6), el del bajador)`.
       El que no tiene bajador cede `noDescenderS` (25 s), el doble con lluvia.
R15.9  El adoquín cobra piernas además de posición (S-480): dentro de un sector, el exponente de la
       traducción atributo→velocidad pasa de 0,39 (aire del llano) a `paveExponent` (0,65).
R15.10 El último giro (S-446): con curva/rotonda a < `lastTurnKm` (1,5), los `lastTurnPlaces` (3)
       primeros salen con `lastTurnBonus` (0,06) de score y el que entra 15.º pierde el sprint.
```

**Cierra**: S-155, S-160, S-165, S-189, S-240, S-241, S-242, S-243, S-248, S-252, S-254, S-282,
S-369, S-428, S-430, S-446, S-457, S-460, S-463, S-465, S-466, S-480, S-481, S-489, S-490.

**Constantes**: `placeCostPerKm` 0,03 · `accordionBase` 0,015 · `moveUpKmPerDecile` 0,7 ·
`wheelInheritance` 0,85 · `approachKm` {6,3,8,10} · `approachHelpers` 2 · `approachLateS` 25 ·
`echelonMinMen` 5 · `echelonFrontPlaces` 20 · `descenderTow` 6 · `noDescenderS` 25 · `paveExponent`
0,65 · `lastTurnKm` 1,5 · `lastTurnPlaces` 3 · `lastTurnBonus` 0,06. **Todas calibrar con banco**;
`paveExponent` es la que el §14 punto 17 deja anotada.

**Medida**: `positionCostSpread` = diferencia de depósito en meta entre el tercil de cabeza y el de
cola, a igual nivel → banda **0,05-0,15**; `echelonAuthoredPct` = % de abanicos con equipo autor →
banda **50-90 %** (hoy 0, aparecen sin autor).

---

### R16 · El tren de sprint como submotor de 15 km — 14 situaciones

**Pieza**: `Train`, con varios lanzadores encadenados y ascensos. Hoy hay `leadOutFor` y un régimen
de 3 km; entre el km 15 y el km 3 «sigue rotando el turno normal por deber» (S-347).

```ts
export interface Train {
  teamId: string; sprinterId: string
  /** Orden de lanzamiento: el primero se vacía antes. */
  chain: string[]
  /** Desde qué km entra cada eslabón. */
  entryKm: number[]
  /** Carril: dos trenes no caben. */
  lane: number | null
  state: 'formando' | 'lanzando' | 'roto'
}
```

**Reglas**

```
R16.1  Los trenes se forman a `trainFormKm` (15 km) y se ordenan por carril: `laneCapacity` (1,5)
       trenes caben cómodos. El que se sube por fuera obliga al de dentro a acelerar antes de
       tiempo (`trainForcedEarlyM` 80 m) y los dos gastan un hombre de más (S-481).
R16.2  Eslabones encadenados (S-351): cada lanzador entra a `entryKm[i]`, tira `leadOutPullKm`
       (1,2 km) y se aparta; el siguiente hereda. Si uno se funde o se descuelga, **asciende el
       siguiente** y la cadena se recalcula (S-356).
R16.3  El sprinter sin tren se pega a una rueda ajena y la defiende (S-337, S-338):
       `wheelOf = mejor tren presente`, y paga `stolenWheelPenalty` (0,03) de score por no ser suyo.
R16.4  Dos cartas en el mismo grupo con final ambiguo (S-291): la carta se recalcula a
       `cardRecalcKm` (3 km) con el final REAL y el grupo que queda; la otra pasa a peón.
R16.5  Encajonado (S-445, S-481): `placementSd` deja de ser solo un dado y recibe CAUSA:
       si `posInGroup > laneCapacity·trainMen` en el km −1, `boxedIn = true` → el score se multiplica
       por `boxedInFactor` (0,80) y se narra «perdió sin que le ganaran».
R16.6  El lanzador cuyo sprinter ya no está se recicla (S-372): pierde el peaje del rol
       (`finishRoleWeight` vuelve a 1,0) en vez de conservarlo.
```

**Cierra**: S-185, S-291, S-337, S-338, S-342, S-346, S-347, S-348, S-351, S-355, S-356, S-372,
S-445, S-481.

**Constantes**: `trainFormKm` 15 · `laneCapacity` 1,5 · `trainForcedEarlyM` 80 · `leadOutPullKm` 1,2
· `stolenWheelPenalty` 0,03 · `cardRecalcKm` 3 · `boxedInFactor` 0,80. **Calibrar con banco.**

**Medida**: `trainsPerBunchFinish` → banda **2-5** (S-355, hoy no se mide); `boxedInPct` = % de
sprints masivos con al menos un top-5 de `finishScore` encajonado → banda **15-45 %**.

---

### R17 · El tipo de final se calcula por grupo — 16 situaciones

**Pieza**: ya existe (`finishType(t, groupSize)` se calcula por tamaño, S-370 `CUBIERTO`). Lo que
falta es que **la carta y los papeles salgan de ahí y no de la etiqueta** (S-049, `CONTRARIO`).

**Reglas**

```
R17.1  `DayPlan.card` sale de `finishScore(eff0, finishAhead)` contra el campo, NUNCA del `kind`.
       `autoOrders` recibe `finishAhead: FinishShape` en vez de `kind: string`.        (S-047, S-049)
R17.2  El final se re-evalúa por grupo a `cardRecalcKm` (3 km) y en cada fusión/ruptura (S-291).
R17.3  Quién abre el sprint reducido y a cuántos metros (S-339): abre el que PEOR remata, desde
       `openWorstM` (450 m); el rápido aguanta hasta `openBestM` (175 m). Hoy está invertido.
R17.4  El grupo reducido salido de una fuga cambia de régimen: `sprintRegimeKmh` se aplica también
       a grupos de `bunchSprintMinRiders` (8) hacia arriba (S-339, segunda mitad).
R17.5  Muro/repecho final (S-327, S-278): manda la posición en la base (`posInGroup` en el km del
       pie) y el momento de lanzar; el puncheur que no remata ataca en la parte dura AUNQUE queden
       menos de 3 km (se levanta `tacticNoAttackKm` para `finishType ∈ {puncheur, alto}`).
R17.6  El sprint de dos (S-340): se vigila, se para (`commit` cae a `standoffCommit` 0,45) y se
       resuelve a veces con un ataque antes de la línea.
```

**Cierra**: S-049, S-274, S-278, S-316, S-327, S-328, S-330, S-331, S-339, S-340, S-341, S-367,
S-370, S-445, S-446, S-480.

**Constantes**: `openWorstM` 450 · `openBestM` 175 · `standoffCommit` 0,45. **Calibrar con banco**;
la inversión de S-339 mueve `smallTours.bestSprinterWinPct` (§9).

**Medida**: `openerFinishRank` = rango de remate medio del que abre el sprint reducido → banda
**0,15-0,45** (0 = peor rematador; hoy está por encima de 0,6, invertido).

---

### R18 · La colaboración que se rompe — 21 situaciones

**Pieza**: el **turno con duración y orden** (`GroupView.wheel`, `AgentMemory.pullBlocks`). Hoy
`relayTurn` «se rehace entera desde cero cada bloque de 100 m, por puntuación, sin memoria de quién
acaba de tirar, sin relevo hacia atrás y sin duración» (S-492).

**Reglas**

```
R18.1  El turno DURA. `rotateTurn(group)` se llama cada `relayTurnKm` (1,5 km en pelotón,
       0,8 km en fuga, 0,4 km en abanico) o cuando el que tira se rompe:
          · el que tira se aparta y va a la COLA de `wheel`
          · pasa a cabeza el primero de `wheel` que pase el listón de deber
          · nadie vuelve a cabeza hasta que la rueda gire entera, salvo que no haya nadie más
       El listón de deber (`relayDuty`) se CONSERVA tal cual, con sus pesos medidos.
R18.2  Cupo por equipos (S-210, cita literal del dueño): si colaboran E equipos,
       cada uno pone `clamp(round(relayRotationMax/E), 1, `relayPerTeamMax` (5))` hombres,
       y guarda a su carta. El techo de 20 y el suelo de 1-4 se conservan.
R18.3  El compromiso se reevalúa, no se hereda (S-264, S-301, S-302, `CONTRARIO`):
       el disparador de romper la colaboración deja de ser el kilometraje a meta y pasa a ser el
       MARGEN sobre los perseguidores:
          seguro = clamp((gapToChase − `safeMarginS` (35 s)) / `safeSpanS` (60 s), 0, 1)
          interésPropio(r) = noChanceToWin(r) · (0,25 + 0,75·seguro)
       Una pareja con el pelotón encima releva hasta la flamme rouge; un grupo con 3 minutos se mira
       desde los 15 km. Eso es S-301, S-302, S-333 y S-363 de una vez.
R18.4  Asimetría del que remata mejor (S-253, S-363): el MEJOR rematador es el que deja de relevar,
       no el que no puede ganar. `relayDuty(mejorRematador) −= `bestFinisherDuty` (0,8)` cuando
       `seguro > 0,6`. Y los demás bajan el ritmo para que no gane (S-366): `commit` ×
       `passengerPunish` (0,92) por cada pasajero.
R18.5  El contagio, con memoria (S-122): `refusals` sube; el compromiso baja
       `coopContagionWeight` × media de desertores (se conserva); y con
       `refusals ≥ contagionAttackThreshold` (2) los demás ATACAN para soltarle.
R18.6  Alianzas (S-174, S-175): se PIDEN. `allianceAsk(from,to)` con
       `sharedProblem = solapamiento de `danger` entre los dos equipos`; si se acepta, ambos
       aportan hombres al frente y contraen `ledger`. Se rompe en cuanto uno tiene lo suyo.
R18.7  La tensión se conserva entera (S-491, `CUBIERTO`) y se le añade el reloj de la fusión:
       al fusionar, los recién llegados no entran a la cabeza durante `mergeGraceKm` (2 km) (S-209).
R18.8  Negarse a relevar a un equipo concreto (S-256) es una orden del jugador y un estado del bot:
       `refuseTeams: string[]` en `StageOrders` y en `DayPlan`.
```

**Cierra**: S-082, S-122, S-208, S-209, S-210, S-235, S-253, S-257, S-264, S-301, S-302, S-333,
S-361, S-363, S-364, S-366, S-368, S-453, S-477, S-491, S-492.

**Constantes**: `relayTurnKm` {peloton 1,5, fuga 0,8, abanico 0,4} · `relayPerTeamMax` 5 ·
`safeMarginS` 35 · `safeSpanS` 60 · `bestFinisherDuty` 0,8 · `passengerPunish` 0,92 ·
`contagionAttackThreshold` 2 · `mergeGraceKm` 2. **Calibrar con banco**; R18.3 es la que revierte
`coopSelfishKm`/`coopSelfishFarKm` (§9).

**Medida**: `turnLengthKm` = mediana de km por turno en cabeza → banda **0,8-2,5** (hoy es ~0,1, un
bloque, que es el defecto); `pullerRepeatPct` = % de bloques en que el que tira es el mismo que el
bloque anterior tras haber cumplido su turno → banda **0-15 %**;
`soloWinMediaPct` (ganador en solitario en media montaña) → banda **15-35 %** (§14 punto 4: hoy 4 %
contra el 20-30 % pedido).

---

### R19 · Fases explícitas y sus ventanas — 19 situaciones

**Pieza**: `Phase` por grupo (§2.2). Y las dos amputaciones que hay que quitar.

**Reglas**

```
R19.1  SE RETIRA `tacticMaxMoves` (3) como contador global (S-444, `CONTRARIO`). Sustituye:
          attemptsPerWindow(phase, size, roadClass):
             salida 4 · aduana 3 · control 1 · caza 1 · aproximacion 1
             decisivo `max(2, floor(size/8))` · desenlace 2 · tregua 0
          contados por GRUPO en `attemptWindowKm` (5 km).
       Un puerto decisivo con 12 hombres admite 2 intentos por ventana, haya 3 o 9 grupos vivos.
R19.2  SE RETIRA el apagón por `closingNow` (S-487, `CONTRARIO`). Mientras el pelotón cierra un
       intento se sigue atacando; el que cerró paga: los que formaron parte del cierre tienen
       apetito ×`justClosedAppetite` (0,3) durante `justClosedKm` (3 km). Es «cerrar cuesta la caza
       siguiente» sin apagar a nadie más.
R19.3  Ventanas de tregua explícitas: tras una captura, `phase = 'tregua'` durante
       `truceAfterCatchKm` (1,5 km) con el compromiso a `truceCommit` (0,55) **también dentro de los
       últimos 15 km** — es decir, el suelo del tirón final (`finalDrive`) NO se aplica en esa
       ventana (S-231 y S-329, las dos caras de la misma frontera).
R19.4  Segunda fuga del día (S-116): al acabar la tregua, `attemptsPerWindow` sube a 3 durante
       `secondBreakWindowKm` (10 km) y `customsVote` se recalcula con composición nueva.
R19.5  El flyer (S-326): `tacticNoAttackKm` (3) se levanta para el PEOR rematador del grupo si el
       terreno le ayuda (`finishType ∈ {puncheur, alto, pave, descenso}`), con λ
       `lambdaFlyer` (0,25/km) y coste doble.
R19.6  Puente desde un grupo rezagado (S-132): `attemptFrom` se permite desde cualquier grupo, no
       solo desde el pelotón y los movimientos; el `KIND_FOLLOW` del puente se conserva.
R19.7  Etapa corta de montaña (S-471): si `totalKm < shortMountainKm` (140) y hay puerto en los
       primeros `earlyClimbKm` (25), la fase salta directamente a `decisivo`: no hay aduana ni
       control.
```

**Cierra**: S-116, S-121, S-130, S-131, S-132, S-152, S-169, S-170, S-173, S-218, S-231, S-232,
S-326, S-329, S-350, S-444, S-471, S-476, S-487.

**Constantes**: `attemptWindowKm` 5 · `justClosedAppetite` 0,3 · `justClosedKm` 3 ·
`truceAfterCatchKm` 1,5 · `truceCommit` 0,55 · `secondBreakWindowKm` 10 · `lambdaFlyer` 0,25 ·
`shortMountainKm` 140 · `earlyClimbKm` 25. **Calibrar con banco**; R19.1 y R19.2 son las que más
mueven el número de ataques por etapa y hay que medirlas contra `tactics.ts` (que hoy no tiene
banda) antes de tocar nada más.

**Medida**: `attemptsPerStage` y su reparto por km → banco `sim:tactics` **promovido a CI con banda**:
`attemptsAfterKm100Pct` = % de intentos que ocurren después del km 100 → banda **25-60 %** (hoy el
propio comentario del código mide «cuatro intentos hasta el km 19 y ni uno más en los 190 restantes»).

---

### R20 · El pulso por el frente: quién paga la caza — 20 situaciones

**Pieza**: `frontAuction()`, que sustituye a `frontTeamId` + `chaseField`. El frente deja de ser «un
equipo con histéresis» y pasa a ser **una subasta con pagadores, gorrones y precio**.

**Reglas**

```
frontAuction(squads, race) → { owner, payers[], intensity, price }

  price = cierre necesario:
     price = (gapCreído − objetivo) / kmÚtiles  ·  roadPriceFactor(roadClass)
        roadPriceFactor: ancha 0,8 · normal 1,0 · revirada 1,6      (S-493: el mismo hueco cuesta
        el doble en carretera de tercera; el director empieza a cazar 20 km antes)
  Cada equipo declara:
     derecho_e   = claimFor(motivo, amenaza)        // 0-4, tabla de R05.1
     capacidad_e = presentes · (1 − spent) · media(LLA de los presentes)
     ganas_e     = derecho_e · policy_e             // policy ∈ {nunca 0, si-amenaza 0,5, siempre 1}
  owner   = argmax(ganas · capacidad), con histéresis `frontHandoverEdge` (0,2) — se conserva
  payers  = todos los e con ganas_e ≥ `payShareThreshold` (1,5), cada uno aporta
            `min(relayPerTeamMax, ceil(capacidad_e · 5))` hombres
  intensity = clamp(price / Σ capacidad(payers), 0, 1)
  Si payers = ∅ y price > 0  → NADIE tira: el frente sin dueño (S-166, S-167, S-229).
     `noOwnerCommitFactor` (0,94) se conserva, y AHORA además la rotación se limita a
     `noOwnerMaxTeams` (3) casas, que es la mitad que S-167 declara ausente.
```

Y las reglas de conducta que cuelgan:

```
R20.1  Se persigue AL QUE HACE DAÑO, no al más adelantado (S-176, `CONTRARIO`, la nº 1 del catálogo):
       `target = argmax_mov  daño(mov)`, con
          daño(mov) = Σ_e  peso_e · costToMyMan(e, mov)
       Si delante van tres irrelevantes y detrás el 2.º de la general, el objetivo es el segundo.
       Esto cambia `chaseReferenceIndex` de «el primero en orden de carretera con tamaño» a
       «el movimiento con más daño agregado», y es un cambio de UNA función.
R20.2  El pulso: dos equipos con el mismo motivo se miran (S-166, S-172). Nadie empieza durante
       `standoffKm` (4 km) si `|ganas_a − ganas_b| < `standoffEdge` (0,4)`; la fuga gana tiempo.
R20.3  El gorrón (S-171): un equipo con `ganas ≥ threshold` que no aporta hombres paga
       `ledger` y en la etapa siguiente su `claim` baja `freeRiderPenalty` (0,5).
R20.4  Cazar a tope parte el pelotón (S-230, `CONTRARIO`): con `intensity > `chaseSplitCommit` (0,85)`
       durante > `chaseSplitKm` (10 km) en llano, el grupo que caza pierde
       `chaseSplitFraction` (0,08) de sus hombres por detrás.
R20.5  Cuándo se sientan (S-186): el equipo de cazaetapas NO persigue nunca; prueba contras mientras
       `leashSeconds > 0` y después `intent: 'nada'`.
R20.6  Controlar ≠ cazar (S-168, S-150): dos regímenes con nombre —`controlar` (2 hombres,
       `controlCommit` 0,62, sostenible 100 km) y `cazar` (4-5 hombres, `intensity` libre, ≤ 60 km)—
       y el paso de uno a otro se decide con `price` y `capacidad`, no con un umbral de segundos.
```

**Cierra**: S-071, S-150, S-151, S-166, S-167, S-168, S-171, S-172, S-174, S-175, S-176, S-178,
S-180, S-186, S-230, S-296, S-442, S-474, S-477, S-493.

**Constantes**: `payShareThreshold` 1,5 · `noOwnerMaxTeams` 3 · `standoffKm` 4 · `standoffEdge` 0,4
· `freeRiderPenalty` 0,5 · `chaseSplitCommit` 0,85 · `chaseSplitKm` 10 · `chaseSplitFraction` 0,08 ·
`roadPriceFactor` {0,8 / 1,0 / 1,6} · `controlCommit` 0,62. **Calibrar con banco**; R20.1 es la que
más puede mover `flat.breakawayWinPct` y `flatMoveWorstMarginS`.

**Medida**: `chaseTargetCorrectPct` = % de bloques de caza en que el objetivo es el movimiento de
mayor daño → banda **85-100 %** (hoy indefinido, porque no hay concepto de daño);
`payersPerChase` = equipos que aportan hombres al frente durante una caza → banda **1-3**;
`standoffKmMedian` → banda **0-12 km**.

---

### R21 · La estructura de equipo persistente y la carta del día — 23 situaciones

**Pieza**: `SquadStructure`, fijada antes de la etapa 1 y persistida en base de datos, y `DayPlan`
derivado de ella. Es el racimo que el dueño dictó con seis estructuras nombradas; se desarrolla
entero en §5, aquí van solo las reglas.

**Reglas**

```
R21.1  La estructura se fija en la convocatoria y SOLO cambia por HECHOS (S-002, S-392):
       abandono o hundimiento de la carta, pérdida del motivo, o aparición de un maillot.
       Nunca por el terreno del día.
R21.2  La carta del día sale de la estructura Y del final REAL (S-047, S-049, `CONTRARIO`):
          card(day) = argmax_{r ∈ leales}  finishScore(eff0_r, finishAhead) · cardWeight(r, structure)
          cardWeight = 1,35 si r es carta de la estructura y el terreno le sirve
                       1,00 si es carta y no le sirve del todo
                       0,80 el resto
       Y `pickLeader` PASA A MIRAR LA GENERAL (§14 punto 2, hoy no la mira): si el equipo tiene
       motivo `maillot` o `general`, el jefe es ese hombre, no el mejor rematador del día.  (S-062)
R21.3  Herencia (S-190, S-409, S-483): si la carta abandona o queda irrecuperable, otro HEREDA el
       papel dentro de la misma etapa (`cardRecalcKm`) y los roles que apuntaban al ausente
       degradan a `libre` en vez de seguir trabajando por un fantasma.
R21.4  Cambio de carta a mitad de etapa (S-197): el director puede emitir `changeCard` cuando
       `valorEsperado(cartaActual) < changeCardThreshold` (0,25) y hay alternativa; se narra.
R21.5  El exceptuado y sus tres grados: §2.5.
R21.6  Equipo sin futuro (S-469): `structure.kind = 'sin-baza'` → no hay jerarquía, los ocho tienen
       `breakQuota` 1 y en meta van a lo suyo; y el pelotón lo sabe: `allianceAsk` hacia ellos se
       rechaza siempre (no pueden devolver nada).
R21.7  Equipos pequeños (S-008): con < `smallSquadMen` (6), `frontRight` máximo 2 y `breakQuota` 1;
       no se monta tren; y `allianceAsk` se emite antes (pacto tácito).
```

**Cierra**: S-001, S-002, S-003, S-004, S-005, S-006, S-007, S-008, S-021, S-047, S-049, S-050,
S-051, S-052, S-053, S-179, S-190, S-197, S-390, S-392, S-395, S-469, S-483.

**Constantes**: `cardWeightStructure` 1,35 · `changeCardThreshold` 0,25 · `smallSquadMen` 6.
**Calibrar con banco**; R21.2 es la que corrige «el 70 % del campo acaba de gregario» (§14 punto 14).

**Medida**: `roleMix` = reparto de roles del campo → banda propuesta **gregarios 45-60 %** (hoy
70 %), **cartas 12-20 %**; `structureStability` = cambios de estructura por carrera y equipo →
banda **0-1,5**.

---

### R22 · El sistema de órdenes del jugador — 35 situaciones

Es el racimo más grande del catálogo. Se desarrolla en §6; aquí, la pieza y el vocabulario.

**Pieza**: `StageOrders` pasa de 7 campos planos a un **programa condicional** pequeño y acotado
(N1: «el plan como PROGRAMA»), sin radio en vivo (el dueño la tumbó).

```ts
export interface StageOrders {
  // --- lo de hoy, intacto ---
  role: StageRole; targetRiderId?: string; mentality: Mentality
  effort?: Effort; triggerKm?: number | null
  contestSprints: boolean; contestClimbs: boolean

  // --- lo nuevo ---
  /** Disparador rico, no solo un km (S-214, S-322, S-032). */
  trigger?: Trigger
  /** Política de caza y de defensa, escribible antes (S-215, S-071). */
  chasePolicy?: 'nunca' | 'si-amenaza' | 'siempre'
  /** Condicionales acotadas: máximo `maxConditions` (3) por hoja (S-321). */
  when?: Condition[]
  /** Con quién NO colaboro (S-256). */
  refuseTeams?: string[]
  /** El día del autobús (S-216). */
  survival?: boolean
  /** Objetivos parciales que SÍ cambian el día (S-031). */
  claims?: Motive[]
}

export type Trigger =
  | { kind: 'km'; value: number }
  | { kind: 'puerto'; which: 'ultimo' | 'penultimo'; at: 'pie' | 'mitad' | 'mas_duro' }  // S-322
  | { kind: 'sector'; index: number }
  | { kind: 'clima'; cond: 'lluvia' | 'viento' }                                          // S-032
  | { kind: 'kmToGo'; value: number }

export interface Condition {
  if: { kind: 'salta'; riderId: string }                       // «ataco si salta Z» (S-321)
     | { kind: 'fugaMayorQue'; seconds: number }               // «si la fuga pasa de 2', tiro» (S-215)
     | { kind: 'jefeCortado' }                                 // «espero a mi jefe» explícito
     | { kind: 'grupoMenorQue'; size: number }
  then: 'atacar' | 'seguir' | 'tirar' | 'esperar' | 'no_relevar'
}
```

**Reglas**

```
R22.1  Precedencia (regla 1 de §V.1, se conserva y se hace explícita): la orden individual manda.
       Si choca con el plan, el corredor pasa a `exceptuado` o `rebelde` (§2.5), NUNCA se le
       sobreescribe la orden.
R22.2  El bot reparte SABIENDO lo que escribió el humano (S-054, S-060): `autoStageOrders` recibe
       `existingOrders` y no puede producir ciclos de objetivos ni dos cartas.
R22.3  Nadie es jefe sin quererlo (S-058, `CONTRARIO`): `pickLeader` ignora los votos hacia un
       hombre cuya hoja dice `libre`.
R22.4  El aviso antes de guardar (S-059, S-070): la pantalla dice cuándo una orden no podrá
       cumplirse, con la razón. Ya existe `raceOrdersAdvice`, se le añaden equipo y general.
R22.5  Las tres palancas finas pasan a valer (S-029, S-068):
          `effort` deja de ser solo ±0,5 en el deber: además escala `matchBudget` (±1 cerillo),
          `placeCostPerKm` (colocarse) y el umbral de `giveUpLambda`.
          `triggerKm` se conserva (×3 / ×0,15) y gana los disparadores de `Trigger`.
          `contestClimbs` pasa a leerse en `disputeClimb` (R06.3).
R22.6  Carta blanca (S-024): el jugador puede PEDIRLA; el director bot la concede con probabilidad
       `blankChequeChance(trust, díasSinNada)`; concedida, no hay coste de confianza (S-393).
```

**Cierra**: S-011, S-023, S-024, S-025, S-026, S-029, S-030, S-031, S-032, S-040, S-054, S-057,
S-058, S-059, S-060, S-061, S-062, S-063, S-067, S-068, S-069, S-070, S-071, S-125, S-214, S-215,
S-216, S-217, S-256, S-320, S-321, S-322, S-323, S-415, S-421.

**Constantes**: `maxConditions` 3 · `blankChequeBase` 0,15. **Calibrar con banco** (y con juego:
§10).

**Medida**: `orderEffectSize` = diferencia de resultado del mismo corredor con la misma semilla
cambiando una palanca → banco nuevo `orders.test.ts` (§7.3) → se exige **efecto medible en las siete
palancas**; hoy dos de cinco no llegaban al motor y `effort` mueve ±0,5 en un solo término.

---

### R23 · El relato que explica el porqué — 14 situaciones

**Pieza**: el estado ya calculado se EMITE. La crónica no necesita nada nuevo salvo que el motor le
pase lo que ya sabe: `pullFor` con nombre, `motive` con nombre, `phase`, `virtualLeader`,
`costToMyMan`.

**Reglas**

```
R23.1  Todo `peloton_pull` lleva `{teamId, motive, beneficiaryId, sinceKm}` y el beneficiario se
       nombra SOLO si está donde se dice (v59 ya lo corrigió). Se añade `motive: 'propio'`
       («tira para sí mismo», S-434, §14 punto 8), que hoy no existe en `PullMotive`.
R23.2  Se levanta el tope de tres protagonistas por evento (S-439): `protagonistas` admite hasta 3
       NOMBRES y, por encima, `{count, teams[]}`. Es un cambio de contrato del evento.
R23.3  La fase se emite (`phase_change`) y la criba lleva su causa (`cause: 'puerto'|'sector'|
       'viento'|'caza'`), que es §14 punto 33 (S-441).
R23.4  El informe cruza la orden escrita con lo que pasó (S-417): `StageMemory.orderOutcomes`
       guarda, por corredor con orden humana, `{orden, cumplida, motivo_si_no}`.
R23.5  El informe NO re-simula (S-418, `CONTRARIO`): lee los eventos congelados.
R23.6  El corredor propio aparece siempre en su radio (S-419), aunque no sea noticia.
```

**Cierra**: S-056, S-218, S-219, S-221, S-416, S-417, S-418, S-419, S-420, S-434, S-439, S-440,
S-441, S-449.

**Constantes**: ninguna nueva.

**Medida**: `pullReasonNamedPct` (existe como `teamPullWithReasonPct` 95-100 %) se amplía a
`pullBeneficiaryNamedPct` → banda **90-100 %**; `cribaCausePct` → banda **75-100 %** (hoy 58 %).

---

### R24 · Directores bot falibles — 11 situaciones

**Pieza**: `Blackboard` + `DirectorQuality` + `roadCaptain`. Está descrita entera en §3.4; aquí las
reglas que faltan.

**Reglas**

```
R24.1  `DirectorQuality ∈ [0,1]` por equipo, estable en la carrera, derivada del presupuesto del
       equipo y de su división: WT 0,55-0,9, Pro 0,35-0,7, Continental 0,2-0,55. Afecta SOLO a
       información y a plazos, nunca a vatios (S-014, cita literal).
R24.2  Órdenes malas (S-013): con probabilidad `badOrderChance(q) = 0,25·(1 − q)`, `autoStageOrders`
       comete uno de los cuatro errores que el juego ya sabe enumerar (`raceOrdersAdvice`):
       sprinter en montaña, lanzador sin sprinter, gregario de un ausente, `ahorrar`+`supercombativo`.
R24.3  El capitán de ruta (S-459): cada equipo tiene `roadCaptainId` = el de más `TAC` y años entre
       los presentes, y **manda en las ventanas donde la orden no llega**:
          `radioBlackout(km) = puerto con coches retenidos ∨ carrera partida ∨ últimos 3 km`
       En blackout, las decisiones del equipo las toma el capitán con `q_captain` en vez de `q`;
       un equipo sin capitán con voz (`fame < captainFameMin`) se queda quieto.
       El capitán es además quien PIDE la tregua (S-237), la alianza (S-174) y convoca la parada
       colectiva (S-226).
R24.4  El número se administra (S-458): el director elige qué decir. `told(gap) = gap · (1 + bias)`
       con `bias` según intención (`inflar` +0,15 para que tiren, `recortar` −0,15 para que no se
       rindan). Dos corredores del mismo grupo pueden actuar sobre cifras distintas si están en
       grupos distintos. La mentira se paga: al descubrirse, `trust` del equipo baja.
R24.5  La orden tarda en ejecutarse (S-489): ver R15.2.
```

**Cierra**: S-009, S-010, S-012, S-013, S-014, S-029, S-458, S-459, S-478, S-488, S-489.

**Constantes**: `dirLagKmMax` 2,0 · `dirLagKmMin` 0,6 · `dirRoundMax` 30 s · `dirRoundMin` 5 s ·
`dirBiasSdMax` 20 s · `dirBiasSdMin` 4 s · `badOrderChance` 0,25·(1−q) · `captainFameMin` 35 ·
`readNoiseSd` 0,18 (compartida con R13). **Calibrar con banco**, y con cuidado: R24 es la que hace
que las cazas fallen, y eso mueve `catchKmToFinish` y `flat.breakawayWinPct` (§9).

**Medida**: `chaseMissPct` = % de cazas que no llegan por < 30 s → banda **5-20 %** (hoy ~0: «las
cazas salen siempre clavadas»); `qualityWinSpread` = victorias de equipos de q alto vs q bajo a
igualdad de atributos → se exige **razón 1,15-1,6** (si es 1,0 la calidad no hace nada; si pasa de
1,6, la información pesa más que las piernas y eso es otro juego).

---

### R25 · El precio de obedecer y de desobedecer — 6 situaciones

**Pieza**: `StageMemory.compliance` + `teamTrust` (que ya existe en `CallupCandidate`, y hoy nada lo
mueve por motivos deportivos).

**Reglas**

```
R25.1  Cumplir paga (S-414): `trust += `trustPerJob` (2)` por día en que el corredor hizo el trabajo
       que su papel pedía (km al frente ≥ umbral por rol, o rescate ejecutado, o tren lanzado).
       `trust` pesa en `callupScore` (ya lo hace, `W_TRUST` 0,4) y en la renovación.
R25.2  Ir por libre cuesta (S-393): `rebelde` → `trust −= `trustPerRebel` (8)`, arropo 0 al día
       siguiente y `−callupPenalty` (0,3) durante `rebelMemoryRaces` (3) carreras. Con permiso
       (`carta-blanca`), no cuesta nada.
R25.3  El mánager juez y parte (S-027): si el mánager humano se nombra carta más de
       `selfCardShare` (0,5) de los días, la moral de los humanos de su equipo baja
       `moraleAbuse` (3)/día y sus contratos se hacen más caros de renovar.
R25.4  La moral mueve la conducta (S-384): `moral` escala apetito (×0,85-1,15) y
       `giveUpLambda` (×1,2-0,8). Sube al ganar, baja al hundirse.
R25.5  Reconocimiento del recorrido (S-429): `knowsRoad(rider, sector)` por hombre —local, ediciones
       corridas, reconocimiento— y afecta a `posInGroup` en las aproximaciones y al riesgo de
       descenso; caduca (`roadKnowledgeDecayYears` 3) y no vale en mojado si se reconoció en seco.
```

**Cierra**: S-011, S-027, S-384, S-393, S-414, S-429.

**Constantes**: `trustPerJob` 2 · `trustPerRebel` 8 · `callupPenalty` 0,3 · `rebelMemoryRaces` 3 ·
`selfCardShare` 0,5 · `moraleAbuse` 3 · `roadKnowledgeDecayYears` 3. **Calibrar con banco de mundo**
(no de carrera): esto se mide en `sim/world.ts`, no en una etapa.

**Medida**: `rebelSeasonPoints` = puntos de temporada de los que van de rebeldes vs los que aceptan
el papel, a igualdad de atributos → se exige **ratio < 0,95** (la advertencia anotada: «la estrategia
óptima pasa a ser ir siempre de líder»).

---

### R26 · El grupeto y el corte — 14 situaciones

**Pieza**: `Grupeto` como grupo con capo, pacto y **estimación** del corte; y, debajo, la apuesta:
que el corte elimine de verdad (S-494).

**Reglas**

```
R26.1  La readmisión mira el NÚMERO (S-494, la causa que falta):
          si llegan fuera de control `n` hombres:
             n ≥ `busReadmitMin` (15) → readmitidos en bloque, con penalización de puntos
             n < 15                   → eliminados, salvo percance documentado
       Hoy la readmisión es INCONDICIONAL y por eso el tamaño del grupeto no vale nada.
R26.2  El corte es una ESTIMACIÓN hasta que alguien gana (S-310, S-365): el capo trabaja con
       `timeCutEstimate = pace_estimado · coef(etapa)` y su error
       `timeCutErrorSd` (0,015 del tiempo) según la calidad del director.
R26.3  El grupeto REGULA (S-365, S-359): `commit_grupeto` = f(margen creído):
          margen > `busEasyMargin` (0,25) → `busCruiseCommit` (0,42): pasea
          margen ∈ [0, 0,25]             → interpola hasta `busPushCommit` (0,72)
          margen < 0                     → 0,85 y suelta al que no puede
       Hoy su ritmo sale de «frescura media + hueco contra el pelotón», sin corte ninguno.
R26.4  El capo (S-310): el de más `fame`+`TAC` del grupeto organiza el turno entre equipos rivales.
R26.5  Se espera por IDENTIDAD y por número (S-311, S-371): un sprinter con equipo dentro, un
       compañero, o cualquiera si `n < busReadmitMin` (porque el tamaño es la protección).
R26.6  Grupeto voluntario (S-139, S-135, `CONTRARIO`): se LEVANTA el veto de `giveUpLambda` por rol.
       Un sprinter con motivo `ninguno` en un día de montaña se descuelga ANTES de que duela
       (`voluntaryDropKm` desde el pie del primer puerto), con sus gregarios, y forma el autobús.
       El hombre de la general que ya no lo es pierde su `duty.kind = 'carta'` y puede dejarse ir.
R26.7  La criba llega a TODOS los grupos que suben (S-443), incluido el tercero a diez minutos.
       Esto exige que la cola de las reinas pueda pasar del 14 % → **decisión del dueño** (§10).
```

**Cierra**: S-135, S-139, S-184, S-216, S-310, S-311, S-359, S-365, S-371, S-375, S-412, S-443,
S-464, S-494.

**Constantes**: `busReadmitMin` 15 · `timeCutErrorSd` 0,015 · `busEasyMargin` 0,25 ·
`busCruiseCommit` 0,42 · `busPushCommit` 0,72 · `voluntaryDropKm` 0. **Calibrar con banco**;
R26.1 y R26.7 mueven `grandTour.queenLastGroupPct` y `outOfTimePct` (§9) y son las dos que necesitan
decisión del dueño.

**Medida**: `busMarginMedian` = margen del grupeto sobre el corte → banda **3-12 %** (hoy no existe);
`eliminatedPct` = % de corredores que quedan fuera de verdad → banda **0-2 %** por etapa (hoy 0 por
construcción).

---

### R27 · La crono como modo de carrera — 14 situaciones

**Pieza**: `TimeTrialContext`, que la crono hoy no tiene: corre sin plan, sin órdenes y sin
incidentes.

**Reglas**

```
R27.1  Dosificación ordenable (S-143, S-125): `effort` y `pacingShape ∈ {'plano','creciente',
       'a_tope'}` cambian el reparto de ritmo por tramos:
          a_tope     → primer tercio ×`ttHotStart` (1,04), último ×0,95, riesgo de hundirse ×2
          creciente  → 0,97 / 1,03
       Con `pacingShape` la crono deja de correrse igual para todos.
R27.2  El gregario no corre a tope (S-125): `targetEffort(r) = 0,70` si su papel es
       `duty.kind === 'peon'` y no se juega nada; entra en el corte y guarda para mañana.
R27.3  Referencias del rival (S-332, S-021): el maillot corre con los parciales del 2.º:
       cada `ttSplitKm` (10 km) recibe el parcial del rival que ya pasó (con retardo) y ajusta:
       con colchón, `riskFactor` 0,9 en curvas; sin colchón, 1,15 y riesgo de perderlo todo.
       Y un hombre del equipo sale antes A MARCAR TIEMPO para dar esa referencia (S-021).
R27.4  Percances (S-127, S-202): la crono genera incidentes al `ttIncidentRate` (0,02/corredor),
       más con lluvia y en curvas. Con eso, el corte del 0,25 deja de estar dormido (S-375).
R27.5  Orden de salida (S-036, S-039, S-072): se conserva la rampa; se añaden
       **intervalos desiguales** (`ttIntervalTailS` 180 para los últimos de la general contra
       `ttIntervalS` 60 del resto) y el castigo asimétrico del alcance: el alcanzado no puede coger
       la rueda y se hunde (`caughtPenalty` 0,03), el que alcanza no gana nada.
R27.6  CRE (S-163): formato nuevo. El tiempo lo da el 4.º hombre; el ritmo sale del 4.º más rápido;
       los débiles tiran corto y se dejan caer; el jefe va protegido. Es un modo aparte,
       `simulateTeamTimeTrial`, no un parche del individual.
R27.7  Cambio de bici planeado (S-436): cuesta `bikeChangeS` (20 s) contra lo que se gana arriba.
```

**Cierra**: S-021, S-036, S-039, S-072, S-125, S-126, S-127, S-143, S-163, S-263, S-332, S-382,
S-436, S-462.

**Constantes**: `ttHotStart` 1,04 · `ttSplitKm` 10 · `ttIncidentRate` 0,02 · `ttIntervalTailS` 180 ·
`caughtPenalty` 0,03 · `bikeChangeS` 20. **Calibrar con banco** contra `timeTrials.tailPct` 8-15 y
`worstStagePct` 0-17, que son bandas estrechas y bien ancladas.

**Medida**: `ttIncidentPct` → banda **1-4 %**; `ttPacingSpread` = diferencia de tiempo entre
`a_tope` y `creciente` para el mismo corredor → se exige **2-12 s en 40 km** (si es 0, la orden no
sirve; si pasa de 12, la orden decide más que las piernas).

---

### R28 · El formato de la carrera como contexto — 30 situaciones

**Pieza**: `RaceContext.format` + `StageShape` + `RoadContext`. Es el racimo más grande en número y
el más barato en decisión: casi todo es **pasar datos que ya existen**.

```ts
export interface RaceFormat {
  kind: 'un-dia' | 'una-semana' | 'gran-vuelta' | 'campeonato' | 'cre'
  dayCount: number
  hasGc: boolean
  hasSecondaryClass: boolean
  fieldCap: number
  /** El nacional: sin equipos, escuadras desiguales por nacimiento (S-485). */
  nationalBlocks?: { country: string; riderIds: string[] }[]
}

export interface StageShape {
  /** El final REAL, ya calculado, no la etiqueta. */
  finishAhead: FinishShape
  /** Dónde cae la última cima respecto a meta. LA MITAD DE S-486. */
  lastClimbKmToFinish: number
  climbs: ClimbAhead[]; sectors: SectorAhead[]; banners: BannerAhead[]
  roadClass: RoadClass          // 'ancha' | 'normal' | 'revirada'   (S-493)
  altitudeMax: number           // (S-479)
  circuitLaps: number | null    // (S-227)
  sectorsToday: 1 | 2           // semietapa (S-431)
  neutralKm: number             // (S-073)
}
```

**Reglas**

```
R28.1  Los tres frenos del maillot se apagan el día 1 SOLO para la general que no existe, no para el
       maillot que se va a repartir (S-074, S-388): con `format.hasGc` y `dayIndex === 1`, la cuerda
       usa `virtualGc` sobre el tiempo de HOY.
R28.2  Última etapa de trámite (S-075, S-270): si la general está decidida
       (`gap(1º,2º) > gcSettledSeconds`), `phase` arranca en `tregua` hasta
       `processionEndKm` (circuito) y luego sprint de verdad. Si NO está decidida, es todo o nada:
       ataques desde el penúltimo puerto y `budget` = todo lo que queda.
R28.3  Circuito (S-227): la criba se acumula vuelta a vuelta; la fuga se caza en la penúltima; el
       ataque decisivo sale en la última.
R28.4  Campeonato nacional (S-485): `format.kind = 'campeonato'`, sin general, sin cupo, un solo
       maillot, escuadras por país desiguales. El bloque grande controla solo; los demás se alían
       contra él (`allianceAsk` automático con `sharedProblem = 1`) y no le dan un relevo.
R28.5  Neutralizado y km 0 (S-073, S-223): en `phase = 'neutralizado'` no se ataca; la velocidad de
       la primera hora sale de la pelea por la fuga, no de una constante (35-42 km/h el día tranquilo,
       45-52 el día de aduana disputada). La neutralización a mitad de etapa congela relojes y
       reabre la carrera con un km 0 nuevo.
R28.6  Altitud (S-479): por encima de `altitudePenaltyM` (2.000 m), el coste del bloque sube
       `altitudeCostPerKm` (0,04 por cada 500 m) y pesa MÁS para el corpulento
       (`altitudeMassWeight` sobre el peso implícito de LLA/SPR).
R28.7  Dos carreras a la vez (S-470): `selectSquad` de una resta de la otra; la pequeña se corre con
       lo que sobra.
R28.8  **El generador coloca la parte selectiva** (S-486, `CONTRARIO`, nº 3 del catálogo):
       una etapa tipada de montaña debe decidirse en la montaña. `lastClimbKmToFinish` pasa a ser
       una DECISIÓN del generador con tres formas declaradas —final en alto (0 km), cima cercana
       (≤ 5 km) o valle largo puesto a propósito (> 15 km)— y un reparto objetivo
       (`queenShapeMix` 45/35/20 %). Hoy salen 22, 1, 31, 50 y 19 km sin que nadie lo decida.
R28.9  El perfil que se lee es el de la carretera (S-451, `CONTRARIO`, nº 2 del catálogo): se retira
       el estirado del último segmento de `profileGen.normalize()`, el terreno deja de ser una
       etiqueta única por carrera y el segmento deja de tiparse solo por pendiente.
```

**Cierra**: S-001, S-037, S-073, S-074, S-075, S-085, S-117, S-157, S-158, S-159, S-164, S-223,
S-225, S-226, S-227, S-228, S-270, S-287, S-289, S-388, S-431, S-438, S-451, S-463, S-470, S-471,
S-479, S-485, S-486, S-493.

**Constantes**: `processionEndKm` 60 · `altitudePenaltyM` 2000 · `altitudeCostPerKm` 0,04 ·
`queenShapeMix` {45,35,20} · `roadClassMix` por país. **R28.8 y R28.9 no son calibración: son
corrección de datos**, y hasta que estén, «ninguna fila de montaña se puede medir ni dar por buena»
(cita literal del catálogo sobre S-451).

**Medida**: `lastClimbKmToFinishDist` sobre las reinas generadas → banda: **mediana ≤ 5 km, p90 ≤ 25
km**; `queenGeneratedElevation` → banda **2.500-5.000 m** (hoy mediana 2.023, 0 de 157 por encima de
4.000); `climberWinShareQueen` → banda **35-70 %** (hoy «un escalador de 95 gana 1 de 5»).

---

### Cobertura de este diseño sobre el catálogo

| Racimos | Situaciones que cubren | Cierra este diseño |
| ------- | ---------------------- | ------------------ |
| R01-R28 | 445 de 494 (90 %) | 445 |
| Fuera de racimo | 49 | S-432 (dado de forma, ya `CUBIERTO`), S-437 (orden de carretera, física, se conserva), S-448 (el comisario) quedan **fuera a propósito**; los otros 46 caen dentro de las piezas de §3 (contextos) sin necesitar regla propia |

**S-448 (el comisario) es la única exclusión razonada**: es un actor nuevo con su propio ciclo
(relegaciones, penalizaciones después de meta) que no comparte pieza con nada de lo anterior y que
cambia resultados ya publicados. Se propone dejarlo fuera de esta tanda y anotarlo. **Decisión del
dueño 10** (§10).

---

## 5. El plan de equipo de verdad

### 5.1 Las seis estructuras que dictó el dueño, como tipo

El dueño dictó seis formas de equipo y dijo cuándo cada una no tiene sentido. Eso es directamente un
tipo con su validación:

```ts
export type StructureKind =
  | 'sprinter'      // un sprinter fuerte y el resto trabajando solo para él
  | 'escalador'     // un hombre fuerte de montaña y el resto para él
  | 'general'       // un hombre para la general (completo o solo montaña) y el resto para él
  | 'doble'         // un sprinter Y un escalador, y el resto para ambos
  | 'cazaetapas'    // solo cazaetapas: la fuga y la oportunidad sorpresiva
  | 'mixta'         // gregarios de un líder, con alguien EXCEPTUADO que va por libre
  | 'sin-baza'      // el equipo sin futuro (S-469); no es del dictado, sale de S-469

export interface SquadStructure {
  teamId: string
  kind: StructureKind
  /** 1 (o 2 en `doble`). Cada carta con su alcance y sus días. */
  cards: SquadCard[]
  /** Los exceptuados: no trabajan, no reciben ayuda, no perjudican (S-053). */
  exempt: string[]
  /** Motivos declarados de esta casa para esta carrera (R05). */
  claims: TeamClaim[]
  /** Presupuesto de la carrera entera (R10). */
  raceBudget: number
  /** Calidad de dirección: solo información y plazos, nunca vatios (R24). */
  quality: number
  /** Día en que se fijó, y por qué cambió si cambió (S-002, S-392). */
  fixedOnDay: number
  changes: { day: number; reason: StructureChangeReason; from: StructureKind }[]
}

export interface SquadCard {
  riderId: string
  scope: 'general' | 'general-montaña' | 'sprint' | 'montaña' | 'clasica' | 'etapas'
  /** Los días del recorrido que son SUYOS (S-405, S-407). */
  targetDays: number[]
  /** Quién trabaja para él (los `mixta` reparten). */
  helpers: string[]
}
```

### 5.2 Cómo se elige la estructura en la convocatoria

La convocatoria hoy puntúa **corredor a corredor** contra la afinidad media del recorrido y «no hay
lógica de composición» (`mapa-equipo-ordenes-final` §5.5). La propuesta invierte el orden, que es
exactamente lo que pide S-001: **primero la baza, después el relleno**.

```
CONVOCAR(equipo, carrera):
  1. shape ← raceShape(carrera)      // §5.4: cuánto llano, cuánta montaña, cuánta crono, cuántos días
  2. Para cada estructura candidata k ∈ StructureKind:
        viabilidad(k) = mejorCandidato(equipo, k) × encaje(k, shape) × filosofía(equipo, k)
        · encaje(k, shape) aplica los VETOS del dueño:
             sprinter  en carrera sin llano            → 0      (S-004)
             escalador en clásica llana / vuelta llana → 0      (S-005)
             general   sin general (carrera de un día) → 0, pasa a `escalador`/`clasica` (S-007)
             doble     si la carrera no tiene AMBOS terrenos con peso ≥ `dualMinShare` (0,25) → 0
             cazaetapas siempre viable, con encaje ×(1 + breakAppealMedio)
        · filosofía: `sprints`, `clasicas`, `cantera`, `general`, `equilibrado` (ya existe)  (S-003)
  3. k* ← argmax viabilidad;  si max < `noCardThreshold` (0,35) → k* = 'cazaetapas'   (S-064, S-084)
  4. cards ← el/los mejores para k*; scope según shape:
        general con crono en el recorrido  → 'general' (completo: montaña + crono)
        general sin crono                  → 'general-montaña'                        (S-006)
  5. RELLENO POR NECESIDAD, no por puntuación individual:
        sprinter   → 2 lanzadores (mejor `leadOutScore`) + 3 gregarios de llano + 1 cazaetapas
        escalador  → 2 gregarios de montaña + 2 de llano + 1 bajador (mejor DES) + 1 cazaetapas
        general    → igual que escalador + 1 rodador de crono si hay CRE
        doble      → 1 lanzador + 1 gregario de montaña + 2 mixtos + 1 cazaetapas
        cazaetapas → los `breakScore` más altos, sin jerarquía
        mixta      → relleno del líder, y `exempt` = el que el mánager marque (o el humano que lo pida)
     Nunca un lanzador sin sprinter, nunca ocho escaladores en una vuelta llana,
     nunca un marcador sin favorito rival.                                             (S-001)
  6. Se guarda `SquadStructure` con la carrera. Persiste hasta el final.
```

`selectSquad` conserva su muestreo ponderado sin reemplazo (es la única parte estocástica y es
reproducible), pero **el peso pasa a depender del hueco que queda por llenar**, no solo del score
individual: `peso(r) = exp(2,5 · callupScore(r)) · fitFor(r, huecoActual)`.

### 5.3 Cómo se traduce a papeles del día

```ts
export interface DayDuty {
  kind: 'carta' | 'segunda-carta' | 'lanzador' | 'peon-llano' | 'peon-montaña'
      | 'bajador' | 'cazaetapas' | 'marcador' | 'infiltrado' | 'libre' | 'rendido'
  worksFor: string | null
  motive: Motive
  /** Presupuesto personal del día, en unidades de trabajo al frente. */
  budget: number
  /** ¿Está autorizado a irse en la fuga? */
  breakLicence: boolean
}
```

Y la derivación, que es donde S-047 y S-049 dejan de ser `CONTRARIO`:

```
PAPELES(structure, dayPlan, stageShape, race):
  1. motivos ← ordenar(structure.claims, por frontRight(motivo, race))       // R05.1
  2. card    ← R21.2 (estructura × final REAL, y la general manda si hay motivo maillot/general)
  3. si la carta de la estructura NO puede hacer nada hoy (finishScore por debajo del p60 del campo
     y sin motivo de general):
        → «hoy no tenemos nada»: breakQuota ← 2, el resto al autobús sin tirar        (S-050)
  4. reparto:
        · helpers de la carta = los que pide la estructura, ajustado por `mixta`
        · en `doble`, los gregarios se reparten por TERRENO del día, no a mitades      (S-051)
        · los `exempt` no reciben papel: `kind = 'libre'`, `binding = 'exceptuado'`
        · `breakLicence` = true para `cazaetapas` y para tantos como `breakQuota`
  5. presupuesto: `dayBudget` de R10.1 repartido: carta 0, lanzadores 1,2×, peones 1,0×
  6. `chasePolicy` ← del motivo de mayor derecho, o de la orden del mánager (S-071)
```

### 5.4 Cómo cambian con la general y con el formato

```ts
export interface RaceShape {
  flatShare: number; climbShare: number; ttShare: number   // fracción de km
  queenDays: number; sprintDays: number; ttDays: number
  hasGc: boolean; dayCount: number
  gcDecidedBy: 'montaña' | 'crono' | 'bonificaciones' | 'ninguna'
}
```

| Situación | Qué cambia |
| --------- | ---------- |
| Vuelta corta con crono (S-386, S-387) | `gcDecidedBy = 'crono'`: los equipos de general **controlan sin perseguir** las etapas en línea; la víspera de la crono los cronistas no entran en fugas; el día después, los que perdieron cambian de objetivo |
| Vuelta de solo llanas (S-159) | La estructura `general` degrada a `sprinter`: el líder es un sprinter y tiene **motivo doble** (maillot + etapa), lo que ya está `CUBIERTO` y se conserva |
| Vuelta corta, un solo día de montaña (S-287) | Ese día es `targetDay` de **todos** los equipos con estructura `general`: tempo desde lejos y ataques también en el penúltimo puerto |
| El jefe se hunde (S-409, S-392) | `structure.changes += {reason: 'carta_hundida'}`; la carta pasa a otro; los `helpers` del viejo se liberan; el viejo pasa a `peon` de lujo |
| Aparece un maillot inesperado (S-395) | El cazaetapas que hereda el maillot: `claims += maillot`, deja de atacar, el equipo le arropa `jerseyDefendDays` (2) aunque le cueste medio equipo, y cuando lo pierda vuelve a su papel |
| Tercera semana (S-389) | Los equipos que perdieron la general re-declaran `kind = 'cazaetapas'` (es un HECHO: perder la general), el maillot controla con 4-5 hombres y la fuga gana más |
| Carrera de un día (S-158) | No hay mañana: `dayBudget` = todo; nadie guarda; el descolgado abandona en vez de entrar en el corte |
| Campeonato nacional (S-485) | No hay `SquadStructure` por equipo sino por **bloque nacional**; los sueltos se alían contra el bloque grande |

### 5.5 Los motivos que faltan hoy

Hoy `TeamPurpose` tiene exactamente tres: `etapa`, `maillot`, `general`, más `ninguno`. Faltan
**siete**, y por eso «dos tercios del pelotón no tienen ninguna razón para correr» (S-162):

| Motivo | Qué le da derecho | Qué le obliga | Situaciones |
| ------ | ----------------- | ------------- | ----------- |
| `montaña` | Su hombre lidera o es 2.º de la montaña, en día con ≥ `komDayPoints` (20) puntos | Meter hombres en los intentos hasta que uno cuaje; no perseguir; llevarle al pie | S-017, S-042, S-043, S-065, S-108 |
| `puntos` | Su hombre lidera o es 2.º de puntos, en día con volante disputable | Tirar 8 km antes de la volante; soltar 500 m después; tren dos veces | S-016, S-041, S-105, S-136, S-196, S-383, S-407 |
| `joven` | Su hombre lidera o es 2.º del joven | Arropar; no perseguir; marcar al otro joven, no a los favoritos | S-018, S-271, S-272 |
| `equipos` | Está en el podio por equipos | No dejar caer al 3.º; meter tres arriba en montaña | S-019, S-034, S-250, S-295, S-396 |
| `combatividad` | Ninguno de los anteriores y `breakAppeal` > 0,3 | Un hombre a la fuga, con apetito ×1,4 | S-044, S-045 |
| `patrocinador` | Invitación / wildcard | Un hombre a la fuga TODOS los días; el día después afloja | S-066 |
| `ranking` | Se juega la plaza anual | Esprintar por el 12.º; no regalar puestos en la general final | S-447 |

### 5.6 Lo que llega al corredor

Hoy: **dos escalares** (`teamDrive`, `teamAttackFactor`). Propuesta: el corredor recibe
`GroupView.mates`, `matesAhead`, `byTeam`, su `DayDuty` y el `SquadRuntime` de su equipo. Los dos
escalares **se conservan** como resumen para las decisiones que no necesitan más (el turno de
relevos, sobre todo), porque están medidos y funcionan; lo que cambia es que dejan de ser lo único.

---

## 6. El jugador humano y el mánager

### 6.1 Qué puede ordenar (y qué no)

El dueño tumbó la radio en vivo por una razón estructural que no cambia: «es incompatible con
avanzar un día cada seis horas». Así que la orden sigue siendo **una hoja por etapa, escrita antes**.
Lo que cambia es su vocabulario (R22): de siete campos planos a siete campos planos **más** un
disparador rico, una política de caza, hasta tres condicionales y dos listas.

| Puede | Cómo | Situación |
| ----- | ---- | --------- |
| «Ataco en el tramo más duro del último puerto» | `trigger: {kind:'puerto', which:'ultimo', at:'mas_duro'}` | S-322 |
| «Si llueve en el adoquín me coloco delante desde el km 40» | `trigger: {kind:'clima', cond:'lluvia'}` + `when` | S-032 |
| «Si la fuga pasa de dos minutos, tiro» | `when: [{if:{kind:'fugaMayorQue', seconds:120}, then:'tirar'}]` | S-215 |
| «Ataco si salta Z» | `when: [{if:{kind:'salta', riderId:Z}, then:'seguir'}]` | S-321 |
| «Hoy me voy al grupeto» | `survival: true` | S-216 |
| «No le doy relevos al equipo Y» | `refuseTeams: [Y]` | S-256 |
| «Hoy voy a por la montaña» y que SIRVA | `claims: ['montaña']` → cambia ruta, apetito y coste | S-031 |
| «Quiero mi oportunidad hoy» | pedir `carta-blanca`; el director la concede o no | S-024 |
| «No quiero ser el jefe hoy» | `role: 'libre'` **y que se respete** (R22.3) | S-058 |
| «Guardo para la etapa 14» | `effort: 'ahorrar'` con efecto real (R22.5) + objetivo de carrera | S-405 |
| **NO puede** | | |
| Cambiar de idea durante la etapa | por diseño (el dueño) | — |
| Ver la hoja de un compañero | secreto antes, deducible después (S-416) | S-025 pide la excepción entre dos humanos que se coordinan: **decisión del dueño 8** |
| Ordenar a otros corredores | salvo el mánager, y con políticas, no órdenes | G2 |

### 6.2 Cómo conviven órdenes humanas y bots en el mismo equipo

Hoy hay un defecto de orden de ejecución con consecuencias grandes: **`autoStageOrders` se calcula
sin conocer las filas humanas** (`stageRun.ts:286-300`). De ahí salen S-054, S-058, S-060, S-062 y
la mitad de S-057.

La corrección es de secuencia, no de lógica:

```
runOneStage:
  1. leer órdenes humanas de `stage_orders`                          (hoy: paso 2)
  2. autoStageOrders(riders, stage, existingOrders)                  (hoy no recibe el 3er argumento)
       · nunca nombra una segunda carta si un humano ya se declaró carta y el equipo no tiene otra
       · nunca apunta un lanzador/gregario a un humano cuya hoja dice `libre`      (S-058)
       · nunca produce ciclos de objetivos ni dos cartas                            (S-060)
       · rellena alrededor de lo que el humano puso, como haría un director real    (S-054)
  3. buildDayPlan(structure, ordersMerged)                            (hoy: buildTeamPlans)
```

Y los tres grados de §2.5 sustituyen al binario `rebelde`, de modo que declararse líder cuando ya hay
uno deja de ser gratis y deja de ser catastrófico: es `rebelde`, con coste de confianza (R25.2) y sin
perder el derecho a correr su carrera.

**Dos humanos en el mismo equipo** (S-061, S-025): el desempate deja de ser por id y pasa a ser
`general → remate en el final de hoy → contrato`, en ese orden. Y se abre la coordinación explícita:
un humano puede declararse `gregario` de otro humano y **ambos lo ven** (hoy la API solo devuelve las
propias órdenes). Eso es S-025, hoy `CUBIERTO` a medias.

### 6.3 El mánager (G2), y hasta dónde llega en esta tanda

G2 es un épico entero y no cabe aquí. Lo que esta propuesta necesita de él es **una sola cosa**, y es
la que el propio dueño formuló: «POLÍTICAS en vez de órdenes, aplicada en dos niveles: el mánager
fija el plan del equipo y cada corredor escribe el suyo dentro de ese marco».

Traducido a estado, son cuatro campos escribibles por el mánager y legibles por el corredor:

```ts
export interface ManagerPlan {          // por equipo y carrera; nulo = el bot decide
  structure: StructureKind | null       // «esta carrera la corremos para el sprinter»
  cardRiderIds: string[]                // a quién se protege
  chasePolicy: 'nunca' | 'si-amenaza' | 'siempre'
  breakQuota: number
  exempt: string[]                      // a quién se le da licencia
  targetDays: number[]                  // los días marcados
}
```

Con eso:
- **S-026** («el mánager fija el plan y el corredor escribe el suyo dentro del marco») queda cerrado:
  el corredor **ve** el `ManagerPlan` antes de escribir su hoja (S-023) y puede responder a él.
- **S-071** (política de caza como orden) queda cerrado.
- **S-027** (juez y parte) se paga con R25.3, dentro del juego, no con una prohibición.
- **S-012** (heredar un equipo bot sin que se note): el `ManagerPlan` por defecto es exactamente el
  que deriva el bot, así que un humano que hereda no cambia nada en carretera hasta que toca algo.

Lo que **no** entra en esta tanda: convocatoria nombre a nombre, promesas, primas, comunicación
(G2.2, G2.3, G2.6, G2.13). Se anota.

### 6.4 El informe, que es donde el jugador aprende

`StageMemory.orderOutcomes` (R23.4) alimenta el informe privado con lo único que hoy falta y el dueño
pidió con nombre: «esto se decidió aquí y tú habías dicho esto otro» (S-417). Tres líneas por etapa:

- **qué pediste** (las siete palancas + condicionales),
- **qué pasó** (el evento con su km),
- **por qué no se pudo** cuando no se pudo (sin cerillos, el grupo se cerró, tu jefe se cayó, el
  disparador nunca se dio).

---

## 7. Los bancos que hacen falta

La regla de la casa se conserva íntegra: **presupuesto ≥ 4× el coste MEDIDO en CI**, y una banda que
no puede fallar no vigila. Lo que sigue es qué medir, sobre qué escenario, y cuánto cuesta.

### 7.1 El problema de fondo: hoy no hay campo pequeño con bandas

Es la ceguera nº 1 de `mapa-bancos` §7 y bloquea medio catálogo: «los canónicos son 176 en 22×8; los
generados son ≥ 126; el único campo pequeño de CI es `teamedField` 8×5 = 40 y solo para la voz de la
crónica. **Nada mide una carrera de 5-10 equipos de 4-6**». Y sin eso no se puede medir R02
(superioridad numérica), R03 (cupo de fuga), R18 (turno por equipos), R20 (pulso), R21 (equipos
pequeños, S-008) ni R28 (nacional, S-485).

### 7.2 Banco nuevo: `smallRaces.ts`

```
Escenario `carrera-pequeña`:
   6 equipos × 5 hombres = 30, generados con `generateNpcRider` división CON/PRS
   + 6 agentes libres (S-235)
   sobre 3 recorridos reales pequeños ya cargados (`race-jaen`, `race-andalusia`, y una
   media montaña) × 8 semillas
   CON general acumulada entre etapas (hoy `realQueens` corre sin general: no se puede medir R04)
```

Qué mide, con banda propuesta:

| Estadística | Racimo | Banda propuesta | Por qué |
| ----------- | ------ | --------------- | ------- |
| `breakTeamsRepresented` | R03 | 0,65-1,0 | «un hombre por equipo» en fugas pequeñas (S-083) |
| `sameTeamInBreakPct` | R03 | 0-6 % | «tres de la misma casa» es lo que el pelotón veta |
| `payersPerChase` | R20 | 1-3 | con 6 equipos, más de 3 pagando es irreal |
| `standoffKmMedian` | R20 | 0-12 | el pulso existe pero no puede durar toda la etapa |
| `mateSprintClashPct` | R02 | 0-8 % | dos compañeros disputándose el sprint |
| `turnLengthKm` | R18 | 0,8-2,5 | el turno dura |
| `soloWinMediaPct` | R18 | 15-35 % | §14 punto 4: hoy 4 % contra 20-30 % pedido |
| `roleMix.gregarios` | R21 | 45-60 % | §14 punto 14: hoy 70 % |

**Coste**: 3 recorridos × ~4 etapas × 8 semillas × 36 corredores. Una etapa de 36 corredores cuesta
del orden de **1/5** de una de 176 (el coste va con N por grupo y por bloque). Estimación: **~95 s
local → ~170 s en CI**, timeout 720 s. Es el banco más barato del conjunto y el que más desbloquea.

### 7.3 Banco nuevo: `orders.test.ts` — que las palancas del jugador valgan algo

Hoy «ningún banco varía `mentality`, `contest*`, `targetRiderId` o rol por decisión externa» (ceguera
nº 7). Y la queja fundacional del dueño es literalmente esa: «el resultado es casi lo mismo ponga lo
que ponga ahí».

```
Para cada palanca p ∈ {role, mentality, effort, trigger, chasePolicy, claims, survival}:
   correr 24 semillas de `llana-180` y 24 de `reina-150` con el MISMO corredor marcado,
   una vez con el valor A y otra con el valor B, pareado por semilla.
   Exigir: |media(A) − media(B)| > `orderMinEffect` en al menos una métrica declarada por palanca
           (puesto, km al frente, km en fuga, depósito en meta, puntos).
```

Banda: **efecto medible en las 7 palancas**; y el techo, que es igual de importante: ninguna palanca
puede mover el puesto medio más de `orderMaxEffect` (**8 puestos** en un campo de 176), porque
entonces la orden decide más que las piernas.

**Coste**: 7 palancas × 2 valores × 48 etapas = 672 etapas de 176. Demasiado. **Se recorta a
`llana-180` con 12 semillas y campo de 88** (11×8): 7×2×12 = 168 etapas ≈ **210 s CI**, timeout 900 s.

### 7.4 Ampliaciones de bancos existentes

| Banco | Qué se le añade | Coste extra |
| ----- | --------------- | ----------- |
| `grandTour` | `virtualLeaderChanges`, `leashSpreadByDay`, `moodExplainedPct`, `busMarginMedian`, `eliminatedPct`, `dnsPct`, `week3EffDrop` | 0 s: son lecturas de eventos que ya se emiten |
| `smallTours` | `mateSprintClashPct`, `breakTeamRepeatPct`, `openerFinishRank`, `trainsPerBunchFinish`, `boxedInPct` | 0 s |
| `chronicle` | `pullBeneficiaryNamedPct`, `frontMotiveMix`, `cribaCausePct` | 0 s |
| `realQueens` | `climberWinShareQueen`, `lastClimbKmToFinishDist` | 0 s |
| `calendarQueens` | `queenGeneratedElevation`, reparto `queenShapeMix` | 0 s |
| `sim:tactics` | **promovido a CI con banda** para `attemptsPerStage`, `attemptsAfterKm100Pct`, `chaseMissPct`, `chaseTargetCorrectPct` | ~120 s CI |
| Nuevo `weather` | `catchKmByWind`, `echelonReclosePct` — **necesita 3× semillas** porque v42 midió que el clima está «dentro del ruido» | ~180 s CI |

### 7.5 Invariantes nuevos (los 46 pasan a 60)

| # | Invariante | Racimo |
| - | ---------- | ------ |
| 47 | Nadie releva teniendo un compañero no rebelde por delante (salvo abanico) | R01 |
| 48 | Ningún corredor salta a la rueda de un compañero | R02 |
| 49 | Dos del mismo equipo nunca acaban 1.º y 2.º de un sprint masivo sin que uno haya lanzado | R02 |
| 50 | El turno en cabeza dura ≥ `relayTurnKm`·0,5 salvo rotura del que tira | R18 |
| 51 | El objetivo de la caza es siempre el movimiento de mayor daño agregado | R20 |
| 52 | Ningún equipo con `manUpTheRoad` aporta hombres al frente | R01/R20 |
| 53 | La cuerda de un movimiento cambia al menos una vez si cambia su composición | R03 |
| 54 | El coste de banner lo paga solo quien lo disputa | R06 |
| 55 | Ningún corredor decide con un hueco de antigüedad 0 salvo el propio | R24 |
| 56 | Una tregua concedida no coexiste con un ataque en el mismo grupo | R12/R19 |
| 57 | Un exceptuado nunca es perseguido por su propio equipo | R21 |
| 58 | El campo cuya estructura es `sprinter` nunca convoca un lanzador sin sprinter | R21 |
| 59 | En una etapa tipada de montaña, la última cima está a ≤ 25 km de meta en el p90 | R28 |
| 60 | Ninguna palanca de órdenes mueve el puesto medio más de `orderMaxEffect` | R22 |

### 7.6 El coste total en minutos de CI

| Job | Hoy | Después | Δ |
| --- | --- | ------- | - |
| `test:rapido` (toda la suite menos `sim/`) | ~102 s | ~140 s (unidades nuevas de `agent.ts`, `squad.ts`, `front.ts`, `perceive.ts` — todas puras y baratas) | +38 s |
| `test:bancos` | ~540 s («nueve minutos» con el job entero) | ~1.050 s | +510 s |
| — `smallRaces` (nuevo) | — | 170 s | |
| — `orders` (nuevo) | — | 210 s | |
| — `sim:tactics` promovido | 0 (fuera de CI) | 120 s | |
| — `weather` (nuevo, 3× semillas) | — | 180 s | |
| — invariantes 47-60 sobre corridas ya existentes | — | ~30 s | |
| Nocturno con cobertura (×1,75-2,26) | ~20 min | ~38 min | +18 min |

**Verdad incómoda que hay que decir**: eso casi dobla el job de bancos, y el nocturno ya ha caído por
timeout antes. Hay dos salidas honestas y una deshonesta. Las honestas: (a) partir el job de bancos
en dos (`bancos-rapidos` en cada PR que toque el motor, `bancos-lentos` solo en el nocturno y en
`main`), o (b) bajar semillas en los bancos viejos que hoy están sobre-muestreados. La deshonesta es
ensanchar bandas para que corran menos semillas. **Recomendación: (a)**, y está en §10 como decisión.

---

## 8. Plan de implementación por pasos

Ordenado **por dependencia, no por importancia**. La regla que ordena todo: **primero los contextos,
después las reglas que los leen**. Un paso no empieza hasta que el estado que necesita existe y está
medido, porque medir una regla sobre un dato que aún no llega es medir ruido.

Notación: **HS** = mueve huellas selladas · **BB** = mueve bandas · **EV** = `ENGINE_VERSION++`.
Un PR por cada `EV`, nunca dos subidas en el mismo PR (regla del diseño hermano §0).

---

### Paso 1 — Los tres contextos, sin cambiar ninguna decisión

**Qué**: crear `stage/context.ts` (`SelfView`, `GroupView`, `RaceView`, `GroupOrder`),
`stage/agent.ts` (`Agent`, `AgentMemory`) y las funciones que los construyen a partir del estado que
YA existe. `RaceContext` opcional en `StageInput`. Ninguna decisión los lee todavía.

- **Racimos**: ninguno (es el andamio de todos).
- **Ficheros**: `stage/types.ts`, `stage/context.ts` (nuevo), `stage/agent.ts` (nuevo),
  `stage/simulate.ts` (construcción por bloque de decisión).
- **HS/BB/EV**: no · no · no. **Es un paso de refactor puro con test de determinismo bit a bit**:
  las mismas semillas dan los mismos eventos.
- **Hecho cuando**: `pnpm test` y `pnpm sim 120` dan resultados idénticos a `main`, y hay test de
  unidad de construcción de los tres contextos sobre fotos a mano.
- **Modelo**: **Sonnet**. Es mecánico pero toca `simulate.ts` entero y hay que no romper nada.

---

### Paso 2 — R01: compañeros visibles

**Qué**: rellenar `GroupView.mates`/`matesAhead`/`matesBehind`/`myCardIs` y aplicar las cuatro reglas
de R01. Es el paso con más rendimiento por línea del plan entero.

- **Racimos**: R01 (15 situaciones).
- **Ficheros**: `stage/context.ts`, `simulate.ts` (`relayTurn`, `relayDuty`), `stage/tactics.ts`
  (`followProbability` recibe `GroupView`).
- **HS/BB/EV**: **HS sí** (cambia quién tira → cambian los relojes) · **BB probable**
  (`chronicle.teamPullFlatPct`, `flat.breakawayWinPct`) · **EV sí**.
- **Hecho cuando**: invariantes 47 y 52 en verde; `pullsWithMateAheadPct` ≤ 3 %; `flat` y `mountain`
  dentro de banda o con el movimiento declarado en `balance.md`.
- **Modelo**: **Sonnet**.

---

### Paso 3 — R02 + §2.4: el árbitro de equipo

**Qué**: `squadArbiter.ts`, la regla de no saltar a la rueda de un compañero, el ataque alternado y
la renuncia al sprint entre compañeros.

- **Racimos**: R02 (12 situaciones, 4 de ellas `CONTRARIO`).
- **Ficheros**: `stage/squadArbiter.ts` (nuevo), `tactics.ts` (`chooseInstigator` deja de sortear
  sobre el pool y recibe al elegido), `finish.ts` (renuncia entre compañeros).
- **HS/BB/EV**: **HS sí** · **BB sí** (`smallTours.bestSprinterWinPct`, `photoRepeatTopFive`) ·
  **EV sí**.
- **Hecho cuando**: invariantes 48 y 49 en verde; `mateSprintClashPct` ≤ 8 %.
- **Modelo**: **Sonnet**. `squadArbiter` es puro y se puede escribir con test primero; la
  integración en `finish.ts` es la parte delicada.

---

### Paso 4 — R19: fases explícitas y quitar los dos apagones

**Qué**: `Phase` por grupo; retirar `tacticMaxMoves` y el apagón por `closingNow`; ventanas de tregua
y contraataque; el flyer; el puente desde grupos rezagados.

- **Racimos**: R19 (19 situaciones, 5 `CONTRARIO`), y desbloquea R12 y R20.
- **Ficheros**: `stage/phase.ts` (nuevo), `simulate.ts` (`attemptFrom`, el controlador),
  `constants.ts`.
- **HS/BB/EV**: **HS sí** · **BB sí** (número de ataques por etapa; `flat.breakawayWinPct` es el
  riesgo) · **EV sí**.
- **Hecho cuando**: `attemptsAfterKm100Pct` ∈ 25-60 %; `attemptsPerStage` estable; `flat` y
  `mountain` dentro de banda.
- **Modelo**: **Sonnet**. Es el paso con más riesgo de calibración de todo el plan: quitar dos topes
  a la vez puede disparar los ataques. Se hace **con las dos retiradas en el mismo PR y medido**, no
  una en cada uno, porque S-444 y S-487 son «el gemelo» uno del otro y separarlas mide mal.

---

### Paso 5 — R18: el turno con duración y orden

**Qué**: `GroupOrder` + `rotateTurn`; cupo por equipos; compromiso reevaluado contra el margen;
asimetría del mejor rematador; contagio con memoria; alianzas pedidas.

- **Racimos**: R18 (21 situaciones), cierra §14 punto 4 (el ganador en solitario en media montaña).
- **Ficheros**: `simulate.ts` (`relayTurn` deja de rehacerse cada bloque), `tactics.ts`
  (`noChanceToWin` → `interésPropio` sobre margen), `group.ts`.
- **HS/BB/EV**: **HS sí** · **BB sí** (`smallTours.mediaGroups`, `flatMoveWorstMarginS`) · **EV sí**.
- **Hecho cuando**: invariante 50 en verde; `turnLengthKm` ∈ 0,8-2,5; `soloWinMediaPct` ∈ 15-35 %.
- **Modelo**: **Sonnet**.

---

### Paso 6 — `RaceContext` de verdad: clasificaciones, memoria y formato

**Qué**: `packages/db` empieza a pasar `RaceContext` con las cuatro clasificaciones (el dato ya está
en `raceGc`), `PelotonMemory`, `RaceFormat`, `RemainingTerrain` y `WeatherForecast`. **Aquí se
re-sellan las huellas, una sola vez**, con la causa escrita.

- **Racimos**: ninguno todavía (es el andamio de R04, R05, R06, R07, R08, R09, R10, R26, R28).
- **Ficheros**: `stage/types.ts`, `packages/db/stageRun.ts`, `packages/db/schema.ts` (tablas
  `race_memory`, `team_structure`), migración drizzle.
- **HS/BB/EV**: **HS sí** (re-sellado con causa) · no · **EV sí**.
- **Hecho cuando**: una etapa sin `race` da resultados idénticos a `main`; una con `race` los da
  distintos y explicables; `balance.md` con antes/después.
- **Modelo**: **Sonnet** (motor) + **Haiku** para la migración y el cableado de `db`, que es
  mecánico.

---

### Paso 7 — R21 + R05: estructura persistente y motivos

**Qué**: `SquadStructure` en base de datos, elegida en la convocatoria (§5.2); `DayPlan` derivado;
los siete motivos nuevos; `pickLeader` mira la general; `autoStageOrders` recibe `finishAhead` en vez
de `kind` y las órdenes humanas existentes.

- **Racimos**: R21 (23) + R05 (24) = 47 situaciones. El bloque más grande del plan.
- **Ficheros**: `stage/squad.ts` (sustituye a `teamPlan.ts`), `world/autoOrders.ts`,
  `world/callups.ts`, `packages/db/callups.ts`, `packages/db/calendarRun.ts`.
- **HS/BB/EV**: **HS sí** · **BB sí** (`roleMix`, `chronicle.frontTeamsPerStage`,
  `smallTours` entero) · **EV sí**.
- **Hecho cuando**: invariantes 57 y 58 en verde; `roleMix.gregarios` ∈ 45-60 %;
  `frontMotiveMix` con ≥ 3 motivos en el 60 % de las etapas.
- **Modelo**: **Sonnet**, y en dos PR: (7a) estructura y convocatoria; (7b) motivos y `autoOrders`.

---

### Paso 8 — R03 + R20: la aduana como voto y el frente como subasta

**Qué**: `customsVote` sustituye a `pelotonAllows`; `frontAuction` sustituye a `frontTeamId` +
`chaseField`; se persigue al que hace daño (S-176).

- **Racimos**: R03 (24) + R20 (20) = 44 situaciones, con la nº 1 del catálogo dentro.
- **Ficheros**: `stage/customs.ts` (nuevo), `stage/front.ts` (sustituye a `chase.ts`), `tactics.ts`
  (`pelotonAllows` se retira), `simulate.ts` (el controlador).
- **HS/BB/EV**: **HS sí** · **BB sí, mucho** (`flat.breakawayWinPct`, `mountain.breakawayWinPct`,
  `catchKmToFinish`, `flatMoveWorstMarginS`, `calendarQueens.breakawayWinPct`) · **EV sí**.
- **Hecho cuando**: invariantes 51 y 53 en verde; `chaseTargetCorrectPct` ≥ 85 %;
  `breakTeamsRepresented` ∈ 0,65-1,0; las cinco bandas de fuga dentro o declaradas.
- **Modelo**: **Sonnet**. Es el paso que más calibración necesita y el que más veces habrá que
  re-correr `pnpm sim 500`.

---

### Paso 9 — R04 + R07: general virtual y bonificaciones

**Qué**: `virtualGc` completa, `cushionNeeded` sobre lo que queda, `leashGc` sustituye a `gcLeash`,
segundos de pancarta y bonificaciones visibles al decidir.

- **Racimos**: R04 (17) + R07 (6) = 23 situaciones.
- **Ficheros**: `stage/gc.ts` (nuevo), `customs.ts`, `front.ts`, `simulate.ts` (banners).
- **HS/BB/EV**: HS probable · **BB sí** (`grandTour`, `smallTours`) · **EV sí**.
- **Hecho cuando**: `leashSpreadByDay` ∈ 1,5-4,0; `virtualLeaderChanges` ∈ 2-8;
  `gcRidersInSprintPct` ∈ 35-80 %.
- **Modelo**: **Sonnet**.

---

### Paso 10 — R15: posición dentro del grupo

**Qué**: `GroupOrder` como recurso: acordeón, coste de colocarse, herencia de rueda, aproximaciones,
abanico con autor y con aforo por posición, bajador, adoquín con su exponente, último giro.

- **Racimos**: R15 (25 situaciones), y desbloquea la mitad de R16 y de R12.
- **Ficheros**: `stage/position.ts` (nuevo), `simulate.ts` (abanico, descenso, pavé), `physics.ts`
  (solo el exponente del pavé, que es §14 punto 17 y está anotado como deuda).
- **HS/BB/EV**: **HS sí** · **BB sí** (pavés 5-12 %, `mediaGroups`) · **EV sí**.
- **Hecho cuando**: `positionCostSpread` ∈ 0,05-0,15; `echelonAuthoredPct` ≥ 50 %; el invariante 44
  del pavé sigue en verde.
- **Modelo**: **Sonnet**.

---

### Paso 11 — R24: la pizarra y el capitán de ruta

**Qué**: `perceive()`, `Blackboard`, `DirectorQuality`, órdenes malas, capitán de ruta, noticias con
retardo.

- **Racimos**: R24 (11), y **hace posibles** las mitades que faltan de R12, R13 y R20.
- **Ficheros**: `stage/perceive.ts` (nuevo), `simulate.ts` (todas las decisiones de equipo leen la
  pizarra), `world/autoOrders.ts` (órdenes malas).
- **HS/BB/EV**: **HS sí** · **BB sí** (`catchKmToFinish` se ensancha por construcción) · **EV sí**.
- **Hecho cuando**: invariante 55 en verde; `chaseMissPct` ∈ 5-20 %; `qualityWinSpread` ∈ 1,15-1,6.
- **Modelo**: **Sonnet**.

---

### Paso 12 — R13 + R12: señales, sangre, tregua y rescate

**Qué**: `strainSeen` con disimulo; oler la sangre con identidad; tregua pedida y concedida; rescate
desde cualquier grupo; regla de los 3 km; taponamiento.

- **Racimos**: R13 (14) + R12 (18) = 32 situaciones.
- **Ficheros**: `stage/read.ts` (nuevo), `stage/truce.ts` (nuevo), `simulate.ts` (`helpBack`,
  `crashCheck`).
- **HS/BB/EV**: **HS sí** · **BB probable** (`mountain.top10GapSeconds`) · **EV sí**.
- **Hecho cuando**: `attacksAfterLeaderCracks` ∈ 1,5-3,5; `truceGrantedPct` ∈ 45-85 %;
  `rescueSuccessPct` ∈ 55-85 %.
- **Modelo**: **Sonnet**.

---

### Paso 13 — R06 + R17 + R16: pancartas, final por grupo y trenes

**Qué**: banners visibles con coste del que acelera; `contestClimbs` leído; final por grupo con carta
recalculada; trenes encadenados con carriles y ascensos; encajonado con causa.

- **Racimos**: R06 (20) + R17 (16) + R16 (14) = 50 situaciones.
- **Ficheros**: `stage/banner.ts`, `stage/train.ts` (nuevos), `finish.ts`, `simulate.ts`.
- **HS/BB/EV**: **HS sí** · **BB sí** (`bestSprinterWinPct`, `sweepPct`) · **EV sí**.
- **Hecho cuando**: invariante 54 en verde; `bannerCostShare` ∈ 0,05-0,35;
  `openerFinishRank` ∈ 0,15-0,45; `trainsPerBunchFinish` ∈ 2-5.
- **Modelo**: **Sonnet**.

---

### Paso 14 — R08 + R09 + R10 + R25: la memoria entre etapas

**Qué**: `StageMemory` de salida; deudas; humor con causa; presupuesto de carrera; golpes y
enfermedad progresiva; ritmo de competición; confianza y moral.

- **Racimos**: R08 (16) + R09 (21) + R10 (12) + R25 (6) = 55 situaciones.
- **Ficheros**: `stage/memory.ts` (nuevo), `packages/db/stageRun.ts`, `packages/db/schema.ts`,
  `world/callups.ts`.
- **HS/BB/EV**: HS no (la memoria no existe en las huellas, que se construyen a mano) · **BB sí**
  (`grandTour.abandonPct`, `abandonCauses`) · **EV sí**.
- **Hecho cuando**: `moodExplainedPct` ≥ 90 %; `dnsPct` ∈ 0-6 %;
  `rebelSeasonPoints` ratio < 0,95 en el banco de mundo.
- **Modelo**: **Sonnet** para el motor, **Haiku** para el esquema y las migraciones.

---

### Paso 15 — R26: el grupeto con miedo

**Qué**: readmisión que mira el número; corte como estimación con error; grupeto que regula; capo;
grupeto voluntario; criba en todos los grupos.

- **Racimos**: R26 (14 situaciones).
- **Ficheros**: `stage/bus.ts` (nuevo), `simulate.ts` (`applyStageTimeCut`, `giveUpLambda`).
- **HS/BB/EV**: **HS sí** · **BB sí** (`queenLastGroupPct`, `outOfTimePct`, `realQueens.lastGroupPct`)
  · **EV sí**.
- **Hecho cuando**: `busMarginMedian` ∈ 3-12 %; `eliminatedPct` ∈ 0-2 %;
  `queenLastGroupPct` dentro de su banda **nueva** (§9).
- **Modelo**: **Sonnet**. Necesita **decisión del dueño 2** antes de empezar.

---

### Paso 16 — R22 + R23 + R06.7: órdenes ricas y relato

**Qué**: `Trigger`, `Condition`, `chasePolicy`, `refuseTeams`, `claims`, `survival`; `ManagerPlan`;
crónica con beneficiario, motivo, fase y causa de criba; informe que cruza orden y resultado.

- **Racimos**: R22 (35) + R23 (14) = 49 situaciones.
- **Ficheros**: `stage/types.ts`, `packages/shared/contracts.ts`, `packages/db/raceOrders.ts`,
  `apps/web/RaceOrders.tsx`, `stageJournal.ts`, `raceOrdersAdvice.ts`.
- **HS/BB/EV**: no · no · **EV sí** (el contrato del evento cambia).
- **Hecho cuando**: banco `orders.test.ts` en verde con las 7 palancas; invariante 60 en verde;
  `pullBeneficiaryNamedPct` ≥ 90 %.
- **Modelo**: **Sonnet** para el motor y el contrato; **Haiku** para la pantalla y los textos.

---

### Paso 17 — R14 + R11: clima y percances

**Qué**: viento de cara/cola, lluvia que va y viene, material del día; pinchazo y avería como suceso,
caravana con orden, ascensor de coches.

- **Racimos**: R14 (12) + R11 (10) = 22 situaciones, y desbloquea S-375.
- **Ficheros**: `stage/weather.ts`, `stage/mishap.ts` (nuevo), `stage/caravan.ts` (nuevo),
  `timetrial.ts`.
- **HS/BB/EV**: **HS sí** · **BB sí** (`abandonCauses`, `timeTrials`) · **EV sí**.
- **Hecho cuando**: `mishapsPerStage` en banda; `ttIncidentPct` ∈ 1-4 %; `catchKmByWind` con
  diferencia ≥ 4 km.
- **Modelo**: **Sonnet**.

---

### Paso 18 — R27: la crono como modo

**Qué**: dosificación ordenable, referencias del rival, intervalos desiguales, alcance asimétrico,
CRE.

- **Racimos**: R27 (14 situaciones).
- **Ficheros**: `stage/timetrial.ts`, `stage/teamTimeTrial.ts` (nuevo), `startOrder.ts`.
- **HS/BB/EV**: **HS sí** (`timetrial.test.ts`) · **BB sí** (`timeTrials`) · **EV sí**.
- **Hecho cuando**: `ttPacingSpread` ∈ 2-12 s; `tailPct` y `worstStagePct` dentro de banda.
- **Modelo**: **Sonnet**.

---

### Paso 19 — R28: formato y generador

**Qué**: `RaceFormat`, `StageShape`, `RoadContext`; circuito, nacional, semietapa, neutralización,
altitud; **y las dos correcciones de datos**: `profileGen.normalize()` (S-451) y la colocación de la
última cima (S-486).

- **Racimos**: R28 (30 situaciones), con la nº 2 y la nº 3 del catálogo dentro.
- **Ficheros**: `packages/engine/routes/profileGen.ts`, `featureProfile.ts`, `stage/types.ts`,
  `packages/db/calendarRun.ts`.
- **HS/BB/EV**: **HS sí** · **BB sí, todas las de montaña** · **EV sí**.
- **Hecho cuando**: invariante 59 en verde; `queenGeneratedElevation` ∈ 2.500-5.000 m;
  `climberWinShareQueen` ∈ 35-70 %.
- **Modelo**: **Sonnet**. **Aviso de orden**: aunque este paso va el último por dependencia de
  medida, **S-451 y S-486 bloquean la interpretación de todo lo de montaña**; si el dueño quiere
  medir montaña de verdad antes, este paso sube al 2.º puesto y todo lo de montaña se re-mide después.
  Está en §10 como **decisión 1**.

---

### Resumen del plan

| Paso | Racimos | Situaciones | HS | BB | EV | Modelo |
| ---- | ------- | ----------: | -- | -- | -- | ------ |
| 1 Contextos | — | 0 | no | no | no | Sonnet |
| 2 R01 | R01 | 15 | sí | sí | sí | Sonnet |
| 3 R02 | R02 | 12 | sí | sí | sí | Sonnet |
| 4 R19 | R19 | 19 | sí | sí | sí | Sonnet |
| 5 R18 | R18 | 21 | sí | sí | sí | Sonnet |
| 6 RaceContext | — | 0 | sí (re-sello) | no | sí | Sonnet+Haiku |
| 7 R21+R05 | R21 R05 | 47 | sí | sí | sí | Sonnet ×2 |
| 8 R03+R20 | R03 R20 | 44 | sí | sí | sí | Sonnet |
| 9 R04+R07 | R04 R07 | 23 | prob. | sí | sí | Sonnet |
| 10 R15 | R15 | 25 | sí | sí | sí | Sonnet |
| 11 R24 | R24 | 11 | sí | sí | sí | Sonnet |
| 12 R13+R12 | R13 R12 | 32 | sí | prob. | sí | Sonnet |
| 13 R06+R17+R16 | R06 R17 R16 | 50 | sí | sí | sí | Sonnet |
| 14 R08+R09+R10+R25 | R08 R09 R10 R25 | 55 | no | sí | sí | Sonnet+Haiku |
| 15 R26 | R26 | 14 | sí | sí | sí | Sonnet |
| 16 R22+R23 | R22 R23 | 49 | no | no | sí | Sonnet+Haiku |
| 17 R14+R11 | R14 R11 | 22 | sí | sí | sí | Sonnet |
| 18 R27 | R27 | 14 | sí | sí | sí | Sonnet |
| 19 R28 | R28 | 30 | sí | sí | sí | Sonnet |

**Ningún paso es de Haiku entero.** Haiku sirve para las migraciones de esquema, el cableado de
`packages/db`, los textos de pantalla y las tablas de constantes con su comentario de intención —que
son un tercio del trabajo mecánico— pero cada paso lleva al menos una decisión de motor que no se
puede delegar. Los pasos 6, 14 y 16 son los que más trabajo de Haiku admiten (aproximadamente la
mitad de cada uno).

**Los cuatro primeros pasos (1-4) cierran 46 situaciones y no necesitan `RaceContext`.** Si hay que
enseñar algo pronto, es ahí: son las que más se notan en carretera y las que menos infraestructura
piden.

---

## 9. Lo que esto mueve y hay que decidir en bloque

Tabla única, como pidió el encargo. **El diseño no se ha encogido para que las bandas viejas pasen**,
y tampoco las mueve en silencio: aquí está todo lo que tocaría, con su valor de hoy, el propuesto y
el porqué. Nada de esto se toca sin aprobación; y si algo sale de banda por un cambio que no está en
esta tabla, «el que está mal es el cambio» (doctrina del dueño, v26 §6).

### 9.1 Bandas de `sim/targets.ts`

| Banda | Hoy | Propuesto | Por qué |
| ----- | --- | --------- | ------- |
| `flat.breakawayWinPct` | 5-16 % | **5-18 %** | La aduana pasa a ser un voto (R03) y el frente una subasta (R20): habrá días con nadie dispuesto a pagar. El techo sube 2 puntos, no más, porque el suelo es lo que vigila |
| `flat.catchKmToFinish` | 8-25 km (mediana) | **6-30 km** | R24 hace que las cazas fallen o lleguen justas: hoy «salen siempre clavadas». Ensanchar aquí es el precio explícito de que exista el error de dirección |
| `flat.bestSprinterWinPct` | 30-45 % | **28-45 %** | R16 (encajonado con causa) y R17.3 (abre el peor rematador) le quitan una parte al mejor. El suelo baja 2 |
| `mountain.breakawayWinPct` | 25-45 % | **retirar de `reina-150` y re-anclar en `realQueens`** | El propio `targets.ts` dice que «`reina-150` no es una etapa reina sino media montaña con la etiqueta cambiada» (v44). Medir la fuga de montaña sobre 1.200 m no mide nada. Se propone banda **12-35 %** sobre reinas reales, después del paso 19 |
| `mountain.top10GapSeconds` | 40-300 s | **40-300 s (sin cambio)** | R13 (sangre) la sube, R18 (turno) la baja. Se mantiene y se vigila; si se mueve, se declara |
| `grandTour.queenLastGroupPct` | 8-14 % | **7-18 %** | R26.7 (cribar todos los grupos) es incompatible con el techo de 14, y el propio §14 punto 2 lo dice: «arreglarlo pide que la cola pueda pasar del 14 %». El suelo baja a 7 por lo del diseño de entrenamiento §10. **Decisión del dueño 2** |
| `grandTour.abandonPct` | 12-20 % | **12-22 %** | R08.6 (retirada por orden) y R26.1 (eliminación real) añaden salidas. +2 en el techo |
| `abandonCauses.outOfTimePct` | 1-15 % | **2-20 %** | Hoy la readmisión es incondicional y el fuera de control no elimina a nadie: con R26.1 pasa a existir |
| `abandonCauses.crashPct` | 30-67 % | **28-67 %** | R11 (percance mecánico) añade una causa que no es caída; el reparto se reequilibra por dilución |
| `smallTours.sameWinnerPairPct` | 15-55 % | **12-50 %** | R09 (marcaje al ganador de ayer) y R21 (cartas por estructura) atacan justo la repetición |
| `smallTours.mediaGroups` | 3-8 (mediana) | **3-9** | R18.3/R18.4 rompen la colaboración antes: más grupos en media montaña |
| `smallTours.flatMoveWorstMarginS` | 0-900 s | **0-1.200 s** | El dueño ya pidió que «de vez en cuando» la fuga llegue con 15-20 min; con R03 y R20, el día de pacto de no cazar existe de verdad |
| `smallTours.bestSprinterWinPct` | 25-60 % | **22-60 %** | mismo motivo que `flat` |
| `calendarQueens.breakawayWinPct` | 6-30 % | **6-35 %** | R03 (candidato por terreno, S-433) mete escaladores en la fuga de montaña: es exactamente lo que el dueño pidió en v43 |
| `timeTrials.tailPct` | 8-15 % | **8-16 %** | R27.4 (incidentes) alarga la cola por su extremo |
| `chronicle.teamPullFlatPct` | 50-85 % | **65-90 %** | R01 y R20 hacen que casi todo tirón tenga dueño identificable |
| `chronicle.frontTeamsPerStage` | 1,8-4 (media) | **2,0-4,5** | R20 admite varios pagadores en la misma caza |
| **Nueva** `realQueens.climberWinShareQueen` | — | **35-70 %** | S-486/§14 punto 6: hoy «un escalador de 95 gana 1 de 5» |
| **Nueva** `realQueens.medianLeadGroupRiders` | deuda impresa, mide 1 | **3-10** | El encargo lo pedía y nació rojo; con R18 y R13 pasa a ser un objetivo real |

### 9.2 Invariantes de `invariants.test.ts`

| Invariante | Hoy | Propuesto | Por qué |
| ---------- | --- | --------- | ------- |
| 3 `catchKmToFinish` | mediana 8-25 | acompaña a la banda: 6-30 | R24 |
| 18 relevos (`relayWork/shelteredWork > 1,10`) | 1,10 | **> 1,20** | R18.1: con turnos que duran, el que tira gasta más de verdad |
| 26/32 último grupo 8-14 % | 8-14 | 7-18 | R26.7 |
| 37 el mejor rematador | 25-60 % | 22-60 % | R16, R17 |
| 44 pavés 5-12 % | 5-12 | **5-14 %** | R15.9: el sector cobra piernas además de posición |
| `SATURATION_DEPLETION` 0,96 | 0,96 | sin cambio | no se toca nada de erosión |
| **Nuevos 47-60** | — | §7.5 | 14 invariantes nuevos |

### 9.3 Constantes que se RETIRAN

| Constante | Valor | Por qué se retira | Situación |
| --------- | ----- | ----------------- | --------- |
| `tacticMaxMoves` | 3 | Contador global de grupos vivos por encima de toda la táctica | S-444 |
| el salto de `attemptFrom` por `closingNow` | — | Apaga la capa táctica mientras se cierra un intento | S-487 |
| `gcControlLeash` | 700 | Sustituida por `cushionNeeded` sobre lo que queda de carrera | S-391 |
| `gcThreatFraction` | 0,6 | Idem | S-391 |
| `coopSelfishKm` / `coopSelfishFarKm` | 15 / 80 | El disparador pasa a ser el margen sobre los perseguidores, no el km a meta | S-301, S-302 |
| `teamStageCardGap` | 8 | La carta sale de la estructura y del final real, no de un umbral de puntos | S-047, S-049 |
| `giveUpLambda` vetos por rol | lider/sprinter/cazaetapas | Vetan justo la conducta que S-135 y S-139 piden | S-135, S-139 |
| `humorDelPeloton` como dado único | 0,9 ± 0,14 | Pasa a suma de causas + ruido, centrado en el mismo 0,9 | S-224 |

### 9.4 Huellas selladas

| Huella | Cuándo se mueve | Causa que se escribirá |
| ------ | --------------- | ---------------------- |
| `attribution.test.ts` | Paso 6 (re-sello único) y pasos 8, 13 | «Compañeros visibles, árbitro de equipo, fases, turno con duración: cambia quién tira y cuándo, luego cambian los relojes» |
| `timetrial.test.ts` | Paso 18 | «Dosificación ordenable e incidentes en la crono» |
| `raceRadio.test.ts` | Paso 16 | «El evento de tirón lleva beneficiario y motivo; el de criba lleva causa» |

**Cada re-sello lleva su medición antes/después en `docs/balance.md`, y ninguno se hace en el mismo
PR que otro.**

### 9.5 Constantes nuevas: recuento

**118 constantes nuevas** repartidas en los 28 racimos. De ellas:
- **21** salen de la carretera o de aritmética verificable (tiempos de cambio de rueda, intervalos de
  crono, `carOrderPenaltyS`, `gcRecoverKmPerSecond`…);
- **12** son reordenaciones de constantes que ya existen (los suelos y techos del turno, el tope de
  20, el suelo de 1-4);
- **85 son «calibrar con banco»**, y están marcadas como tales una a una en §4.

Todas viven en `packages/engine/src/constants.ts` con su comentario de intención, como manda
`CLAUDE.md`, y todo movimiento se anota en `docs/balance.md`.

---

## 10. Decisiones que son del dueño

Diez, cada una con su recomendación. Las tres primeras bloquean pasos del plan; las demás se pueden
tomar sobre la marcha.

---

**Decisión 1 — ¿El generador de recorridos se arregla ANTES o DESPUÉS de la táctica?**

S-451 (el perfil que se lee no es la carretera) y S-486 (la última cima cae 20-50 km antes de meta)
son la nº 2 y la nº 3 del catálogo, y el propio catálogo dice que «mientras eso siga así, S-443,
S-367 y S-164 no se pueden medir». Pero arreglarlos mueve todas las bandas de montaña **antes** de
que exista la táctica que las va a mover otra vez.

- **Opción A**: paso 19 al final (como está el plan). Se mide la táctica sobre el recorrido de hoy y
  se re-mide todo lo de montaña después.
- **Opción B**: subirlo al paso 2. Se arregla el dato primero y todo lo de montaña se mide una sola
  vez, sobre carretera de verdad.

> **Recomendación: B.** Cuesta una tanda de re-calibración al principio en vez de dos al final, y
> evita calibrar la táctica de montaña contra un recorrido que sabemos que está mal. El coste de
> hacerlo al final es medir dos veces; el de hacerlo al principio es esperar una semana.

---

**Decisión 2 — ¿La cola de las reinas puede pasar del 14 %?**

`grandTour.queenLastGroupPct` 8-14 % está anclada en §VI.3 y «no se mueve sin decisión del dueño»
(§14 punto 2). Sin moverla, **R26 entero es imposible**: el grupeto que ya no es la carrera no se
puede cribar (S-443), y sin cribar no hay miedo, y sin miedo el grupeto se organiza por inercia
(S-494).

> **Recomendación: sí, a 7-18 %.** El corte de §VI.3 va del 8 % (llana) al 18 % (reina): la banda
> 8-14 es más estrecha que el propio corte que la carrera aplica. 7-18 % es coherente con el
> reglamento del juego y deja sitio a que la criba llegue a todos los grupos.

---

**Decisión 3 — ¿Se parte el job de bancos de CI?**

El plan añade ~510 s al job de bancos y ~18 min al nocturno con cobertura (§7.6), y el nocturno ya ha
caído por timeout antes.

- **Opción A**: partir en `bancos-rapidos` (en cada PR que toque el motor: invariantes + coherencia +
  el banco pequeño nuevo) y `bancos-lentos` (nocturno y `main`: gran vuelta, reinas reales, órdenes,
  clima).
- **Opción B**: bajar semillas de los bancos viejos sobre-muestreados.
- **Opción C**: no medir parte de lo nuevo.

> **Recomendación: A**, y explícitamente **no C**. Una regla que no se mide es una regla que vuelve.
> B se puede hacer después, con la medida delante, pero no como forma de pagar lo nuevo.

---

**Decisión 4 — ¿Cuánta información puede perder un director malo?**

`DirectorQuality` (R24) hace que un equipo de calidad 0,3 decida con el hueco de hace 2 km redondeado
a 30 s. Eso es lo que hace que las cazas fallen (`chaseMissPct` 5-20 %), pero también hace que un
equipo modesto pierda carreras por información y no por piernas.

- **Opción A**: rango amplio (lag 0,6-2,0 km, redondeo 5-30 s) — el propuesto.
- **Opción B**: rango estrecho (lag 0,6-1,2 km, redondeo 5-15 s) — la calidad se nota menos.

> **Recomendación: A, con el guardarraíl del banco**: `qualityWinSpread` acotado a 1,15-1,6. Si la
> medida sale por encima de 1,6, la información pesa más que las piernas y hay que estrechar. El
> dueño ya dijo la doctrina: «bots peores por INFORMACIÓN, no por vatios» — pero también «la física
> es la misma para todos», y 1,6 es donde eso deja de ser verdad de hecho.

---

**Decisión 5 — ¿El corte de tiempo elimina de verdad?**

R26.1 propone que llegar fuera de control con menos de 15 hombres elimine. Hoy la readmisión es
incondicional y por eso el tamaño del grupeto no vale nada. Pero eliminar corredores cambia el
tamaño del pelotón para el resto de la carrera y toca `abandonPct` y `outOfTimePct`.

> **Recomendación: sí, con `busReadmitMin` 15 y el techo de `eliminatedPct` en 2 % por etapa.**
> Sin esto R26 es decorado. Con el techo, el riesgo está acotado: como mucho tres o cuatro hombres
> en una gran vuelta entera.

---

**Decisión 6 — ¿Cuántas condicionales puede escribir un jugador?**

`maxConditions` 3 es un número puesto a ojo. Más condicionales es más control y más pantalla; menos
es más simple y más cerca de «el resultado es casi lo mismo ponga lo que ponga».

> **Recomendación: 3, y una sola por tipo.** Es suficiente para las cuatro condicionales que el
> catálogo pide con nombre (S-215, S-321, S-256, S-216) y no convierte la hoja de órdenes en un
> lenguaje de programación. Si el jugador pide más, se sabrá.

---

**Decisión 7 — ¿La estructura de equipo se enseña al jugador?**

`SquadStructure` es lo que decide si un corredor va a trabajar para otro toda la carrera. Enseñarla
antes de escribir la hoja cierra S-023 y S-026; ocultarla mantiene la asimetría que el dueño describe
en G2.15 («ser mandado… tiene que doler»).

> **Recomendación: enseñarla.** «Doler» no es «no enterarse». El corredor debe ver el marco antes de
> escribir dentro de él, y poder responder (pedir carta blanca, declararse rebelde sabiendo el
> precio). La asimetría se mantiene en el poder, no en la información.

---

**Decisión 8 — ¿Dos humanos del mismo equipo pueden ver la hoja del otro?**

S-025 dice «dos jugadores pueden coordinarse dentro del juego, viendo la hoja del otro y no por
fuera». S-416 dice «las órdenes son secretas antes de la etapa».

> **Recomendación: sí entre compañeros que se apuntan mutuamente** (uno se declara gregario del otro
> y el otro lo acepta), no en general. Es la única forma de que la coordinación ocurra dentro del
> juego, y no rompe el secreto frente a los rivales, que es lo que S-416 protege.

---

**Decisión 9 — ¿Se declara el `pacingShape` de la crono, o sale del `effort`?**

R27.1 propone un campo nuevo. El `effort` ya existe y podría bastar.

> **Recomendación: sale del `effort`.** `a_tope` → salida caliente, `ahorrar` → creciente, `normal` →
> plano. Un campo menos en pantalla, la misma conducta, y `effort` gana por fin un efecto grande, que
> es media respuesta a la queja fundacional.

---

**Decisión 10 — ¿Entra el comisario (S-448)?**

Es la única situación del catálogo que este diseño deja fuera a propósito: relegaciones, penalización
por rebufo de coches, resultados que cambian después de meta.

> **Recomendación: no en esta tanda.** No comparte pieza con nada, cambia resultados ya publicados y
> obliga a que la crónica cuente algo que ocurre después de la crónica. Se anota como deuda con
> nombre. Es la excusa perfecta para no acabar nunca, y por eso se dice ahora y no al final.

---

## Apéndice A — Las veinte más graves, y dónde muere cada una

| # | Situación | Estado | Paso que la cierra |
| - | --------- | ------ | ------------------ |
| 1 | S-176 el pelotón que no sabe a quién persigue | `CONTRARIO` | **8** (R20.1) |
| 2 | S-451 el perfil que no es la carretera | `CONTRARIO` | **19** (o 2, decisión 1) |
| 3 | S-486 dónde cae la última cima | `CONTRARIO` | **19** (o 2, decisión 1) |
| 4 | S-047 roles consistentes con la estructura | `CONTRARIO` | **7** (R21.2) |
| 5 | S-155 el abanico como decisión | `CONTRARIO` | **10** (R15.5) |
| 6 | S-285 el satélite y la emboscada | `CONTRARIO` | **2** (R01.1-R01.3) |
| 7 | S-308 grupo de favoritos sin gregarios | `CONTRARIO` | **5** (R18.3-R18.4) |
| 8 | S-031 las órdenes sobre objetivos parciales | `CONTRARIO` | **13** (R06.3) + **16** (R22) |
| 9 | S-269 el día que el favorito se rompe | `CONTRARIO` | **12** (R13.2) |
| 10 | S-433 las piernas del llano para la fuga | `CONTRARIO` | **8** (R03, `breakCandidateScore`) |
| 11 | S-114 la aduana del pelotón | `AUSENTE` | **8** (R03) |
| 12 | S-083 cupo y composición de la fuga | `AUSENTE` | **8** (R03) |
| 13 | S-162 el vocabulario de motivos | `AUSENTE` | **7** (R05) |
| 14 | S-391 el colchón depende de lo que queda | `AUSENTE` | **9** (R04.2) |
| 15 | S-444 tres movimientos y ni uno más | `CONTRARIO` | **4** (R19.1) |
| 16 | S-487 los intentos no se solapan | `CONTRARIO` | **4** (R19.2) |
| 17 | S-458 el hueco de hace un kilómetro | `AUSENTE` | **11** (R24) |
| 18 | S-222 el coche de equipo | `AUSENTE` | **17** (R11) |
| 19 | S-478 el percance se sabe tarde | `AUSENTE` | **11** (R24) + **12** (R12.1) |
| 20 | S-488 lo que se ve del rival | `AUSENTE` | **11** (R24) + **12** (R13.1) |

**Diez de las veinte caen en los pasos 2, 4, 7, 8 y 9.** Ninguna necesita tocar la física.

---

## Apéndice B — Por qué esta propuesta no es «otro parchecito»

El dueño dijo: «te digo una cosa y pones un parchecito, pero no arreglas el problema real». La forma
de comprobar que esto no lo es, es mirar qué pasa con las situaciones **que nadie ha nombrado
todavía**. El catálogo dice de sí mismo que «el bucle de completitud se cortó por tope, no por
convergencia»: hay una cola de casos de borde que aún no está escrita.

Con el diseño de hoy, cada uno de esos casos futuros necesitará su propia perilla, porque no hay
sitio donde apoyarlo: el corredor que decide no ve a su equipo, no ve el grupo, no ve la carrera y
no recuerda nada.

Con este diseño, la mayoría de esos casos ya tienen dónde apoyarse antes de que alguien los escriba:

- cualquier regla que empiece por «dos del mismo equipo…» → `GroupView.mates`;
- cualquier regla que empiece por «el equipo de X…» → `SquadRuntime` + `TeamClaim`;
- cualquier regla que empiece por «como no se enteró de que…» → `Blackboard`;
- cualquier regla que empiece por «ayer…» → `PelotonMemory`;
- cualquier regla que empiece por «el que iba delante de él…» → `GroupOrder`;
- cualquier regla que empiece por «en esta fase…» → `Phase`.

Eso es lo que distingue rehacer de parchear: **no es que las reglas nuevas sean mejores, es que el
sitio donde escribirlas existe**.

---

_Propuesta escrita desde la lente de datos y estado. Los 28 racimos del catálogo quedan cubiertos;
445 de las 494 situaciones tienen regla implementable con su medida; S-448 queda fuera declarada.
Todo lo que mueve bandas, invariantes o huellas está en §9, en un solo sitio, y nada se mueve sin la
aprobación del dueño._
