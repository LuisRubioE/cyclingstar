# Rediseño de la capa táctica como sistema multiagente — propuesta

**Encargo.** «Tienes que hacer un break y REPENSAR TODA la lógica de todas las situaciones que pueden
ocurrir en carrera y hacer unas NUEVAS reglas, y con eso rehacer el motor (la parte táctica), porque
ahora mismo está todo del NAAAAABO.» Y la corrección al primer intento: «está muy superficial… no
puede ser tan reduccionista como fuga, pelotón y desenlace: HAY MUCHÍSIMAS más casuísticas».

**Base.** Las 494 situaciones de `catalogo-situaciones.md` y sus 28 racimos; los seis mapas de código
(`mapa-simulate-decisiones.md`, `mapa-tactics.md`, `mapa-equipo-ordenes-final.md`,
`mapa-jugador-humano.md`, `mapa-bancos.md`, `mapa-requisitos-duenio.md`); y el diseño hermano ya
cerrado, `diseno-entrenamiento.md`, con el que este comparte los atributos y el `StageRider`.

**Tesis.** La carrera no es una máquina de estados con tres fases. Es lo que emerge de ciento setenta
y seis agentes que perciben, deciden y se comprometen, agrupados en veintidós equipos que arbitran
entre los suyos. El motor de hoy tiene la física de esa carrera bien hecha y la capa de decisión
comprimida hasta el absurdo: el plan de un equipo llega al corredor que decide **como un solo número
real** (`teamAttack`), `stage/tactics.ts` —855 líneas, donde se decide quién ataca— **no contiene la
palabra `teamId` ni una vez**, y `finish.ts` tampoco. Esa es la ausencia madre: no se puede escribir
«dos compañeros en la fuga se coordinan» en un fichero que no sabe qué es un compañero.

**Diagnóstico numérico del catálogo, que es el que ordena el trabajo**: de 494 situaciones, 62
`CUBIERTO` (13 %), 195 `PARCIAL` (39 %), 178 `AUSENTE` (36 %) y 59 `CONTRARIO` (12 %). **237 (48 %)
no existen o salen al revés.** Los 28 racimos cubren 445 de las 494 (90 %).

**Lo que este documento propone y lo que no.** Propone un modelo de agente, un contrato de
percepción, un arbitraje de equipo y 28 bloques de reglas implementables, con constantes de partida y
banco. No encoge el diseño para que las bandas viejas pasen, y tampoco las mueve en silencio: todo lo
que se movería está en **§9**, en una sola tabla, y lo que decide el dueño en **§10**.

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

## 1. Qué se rehace y qué no

La frontera es la misma que ordena el diseño de entrenamiento, movida un piso más abajo: **allí la
frontera era el `StageRider`; aquí es la ley de velocidad**. Todo lo que convierte una intención en
metros se queda; todo lo que decide la intención se rehace.

### 1.1 Las seis capas, y en cuál se trabaja

| Capa                     | Qué es                                                                                                  | Ficheros de hoy                                                          | Qué pasa con ella                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| **L0 · Física**          | vatios→velocidad, rebufo, depósito, erosión, cerillos, reserva, deriva, caídas, ley de la crono          | `physics.ts` (778 l.), `abandon.ts`, `crash`, `timetrial.ts` (569 l.)     | **INTACTA.** Ni una línea.                                           |
| **L1 · Grupos**          | el grupo como reloj, `advanceGroup`, fusión, captura, `mainGroupId`, histéresis 1,25                     | `group.ts` (227 l.)                                                       | **Casi intacta**: gana `posición por bandas` y `mainId` de referencia |
| **L2 · Percepción**      | qué ve cada agente, con qué retardo y con qué error                                                      | **no existe**                                                             | **NUEVA** (`stage/perception.ts`)                                    |
| **L3 · Agente**          | intenciones, utilidad, compromiso, histéresis                                                            | `tactics.ts` (855 l.), `marcaje.ts` (45 l.), trozos de `simulate.ts`      | **REHECHA** (`stage/agent.ts` + `stage/intents/*.ts`)                |
| **L4 · Equipo**          | estructura, papeles, cupos, arbitraje, frente                                                            | `teamPlan.ts` (566 l.), `chase.ts` (129 l.), `autoOrders.ts`, `callups.ts` | **REHECHA** (`stage/team.ts`, `world/structure.ts`)                  |
| **L5 · Carretera+relato**| aplicar las acciones resueltas a los grupos, emitir eventos                                              | `simulate.ts` (6.539 l.), `journal`                                       | **ADELGAZA**: pasa de decidir a ejecutar                              |

### 1.2 Qué NO se toca, y por qué

**La física entera de `physics.ts`.** `blockPerfil`, `vRef`, `relPower`, `loadExponent`, `targetSpeed`,
`stepSpeed`, `accLimit`, `blockCost`, `erosion()`, `bonkPenalty`, `matchCount`, `reserveSeconds` 65 /
`reserveRecoverySeconds` 400, `driftDropGapSeconds` 20, `dropDeficitTolerance` 4. Motivo: es la parte
que **el dueño ya dio por buena con números delante** —«el problema no es la ley» (v44 §5/§7, sobre
los 28,8 s/km de P75 65 contra 88)— y es la parte que las siete situaciones `CUBIERTO` de R13
describen bien (S-454, S-455, S-461, S-475). Una capa de decisión nueva sobre una física movida sería
imposible de atribuir: cualquier número que salga mal tendría dos padres.

**Las tres huellas selladas se conservan como contrato de refactor, no como resultado.**
`attribution.test.ts` (616 l.), `timetrial.test.ts` (334 l.) y `raceRadio.test.ts` construyen su
`StageRider` a mano. Los pasos 1-2 del plan (§8) **no las mueven ni un segundo**: son un refactor de
identidad y esa es su prueba. A partir del paso 3 sí se mueven, y se re-sellan con la doctrina que ya
usó la v49: **causa nombrada, medición antes/después en `docs/balance.md`, y la banda que se mueve
listada en §9**. Re-sellar para tapar un cambio sigue prohibido.

**Los 46 invariantes se conservan como red durante todo el plan.** Ninguno se borra. Trece se
re-anclan (§9) y ocho se añaden (§7).

**El generador de recorridos.** S-451 y S-486 (los puestos 2 y 3 de las veinte más graves) son
`CONTRARIO` con cita y **no son de esta parcela**: el perfil se escribe mal (`profileGen.normalize()`
estira el último segmento, el terreno es una etiqueta única por carrera, 0 de 157 reinas pasan de
4.000 m) y se dispone mal (las cinco reinas de Race Alps dejan 22, 1, 31, 50 y 19 km tras la última
cota). Este diseño **los declara prerrequisito medible, no los resuelve**: mientras el perfil no sea
el de la carretera, R06, R13, R17, R26 y R28 no se pueden medir. Va en §10, decisión 11.

**El entrenamiento y la génesis.** `diseno-entrenamiento.md` está cerrado. Este documento consume su
salida (`eff0`, `matches`, `tsb`, `fragility`, arquetipos, `SPRINTER_MIN` por división) y no propone
tocar nada aguas arriba del `StageRider`. Las dos únicas costuras:

- `SPRINTER_MIN` por división (§6 punto 5 de aquel documento, decisión 25) decide qué equipos tienen
  tren; aquí se lee, no se redefine.
- `tsb` sigue sin llegar al motor (deuda §14 punto 16 de aquel documento). Aquí se **usa** para el
  depósito entre etapas (R08): si no llega, R08 se queda en media pieza. Anotado en §10, decisión 12.

### 1.3 Qué se rehace, en una frase cada cosa

1. **`tactics.ts` deja de ser «cinco caras del mismo intento» y pasa a ser un catálogo de catorce
   intenciones** con precondición, utilidad, coste, duración e invalidadores.
2. **El plan de equipo deja de comprimirse en dos escalares** (`teamDrive`, `teamAttackFactor`) y pasa
   a ser un **contrato de cupos** que el corredor consulta y consume.
3. **`chase.ts` desaparece como fichero**: la fuerza de la caza deja de ser una foto de salida sobre
   `eff0` y pasa a ser la suma de los cupos de frente comprometidos AHORA.
4. **Nadie decide con la verdad**: entre el motor y el que decide se interpone una pizarra con
   retardo, redondeo, error por equipo y sesgo del director.
5. **La decisión tiene precio y tiene inercia**: cada intención se compromete por un mínimo de
   kilómetros y cambiar de idea cuesta.

---

## 2. El modelo de decisión

### 2.1 Qué es un agente

Un agente es **un corredor**. No hay agentes de equipo: el equipo es un árbitro, no un actor con
piernas. Un agente tiene tres cosas que hoy no tiene:

- **Percepción con contrato** (§3): tres vistas —de sí, de su grupo, de la carrera— que son lo único
  que puede leer. Hoy `attemptFrom` lee la verdad del motor: `racingNow`, la lista entera de
  miembros, el `tS` de todos los grupos.
- **Intención comprometida**: una decisión con nombre, duración y motivo, no un dado por bloque.
- **Memoria**: dentro de la etapa (qué he hecho, a quién le debo) y entre etapas (R08, R09, R25).

```ts
// packages/engine/src/stage/agent.ts
interface Agent {
  riderId: string
  teamId: string | null
  /** Compromiso vigente. Null solo en el bloque 0. */
  commitment: Commitment
  /** Cupo concedido por su equipo en el último arbitraje (§2.6). */
  claim: TeamClaim | null
  /** Memoria dentro de la etapa. */
  memory: RiderMemory
  /** Desplazamiento determinista del tick, 0..9 (§2.3). */
  tickOffset: number
}

interface Commitment {
  kind: IntentKind
  /** Parámetro de la intención: a quién marco, a qué grupo puenteo, para quién arropo. */
  targetId: string | null
  /** Km de carrera en el que se adoptó y en el que caduca. */
  sinceKm: number
  untilKm: number
  /** Utilidad con la que se adoptó; es contra ella contra la que se compara el retador. */
  score: number
  /** Por qué. Va a la crónica sin traducción (R23). */
  reason: PullMotive
  /** Sucesos que lo rompen antes de tiempo. */
  invalidators: Invalidator[]
}
```

### 2.2 Las catorce intenciones

Este es el vocabulario completo de lo que un corredor puede querer hacer. **No hay una decimoquinta**:
si una situación del catálogo no cabe en estas catorce, o es física (L0/L1) o es del árbitro de equipo
(§2.6). Cada una lleva su duración mínima de partida y sus invalidadores.

| #   | Intención     | Qué es                                                       | Mín. km | Coste                          | Invalidadores                             | Racimos                |
| --- | ------------- | ------------------------------------------------------------ | ------- | ------------------------------ | ----------------------------------------- | ---------------------- |
| 1   | `relevar`     | dar la cara en el turno de su grupo                          | 1,5     | trabajo al frente              | cambio de grupo · turno cumplido          | R18, R20, R02          |
| 2   | `esconderse`  | ir a rueda y no entrar al turno                              | 2       | 0                              | cambio de grupo · orden del árbitro       | R18, R20, R09          |
| 3   | `atacar`      | abrir un movimiento                                          | 3       | 1 cerillo + `tacticAttackCost` | boquete < 2 s · cazado                    | R19, R02, R03          |
| 4   | `saltar`      | seguir el ataque de otro                                     | 2       | 1 cerillo + 0,9                | no sostiene                               | R19, R24               |
| 5   | `puentear`    | cruzar al grupo de delante                                   | 8       | 1 cerillo + 0,9                | caducado · alcanzado · absorbido          | R19, R03               |
| 6   | `arropar`     | llevar y proteger a mi carta                                 | ∞       | acordeón evitado al jefe       | la carta se va o cae                      | R15, R21, R01          |
| 7   | `colocar`     | subir de banda dentro del grupo (yo o mi carta)              | 4       | acordeón + cerillo si banda 4→1| llegó · punto pasado                      | R15, R16, R12          |
| 8   | `marcar`      | vivir en la rueda de un rival concreto                       | 20      | pagar sus arreones             | el marcado sale del grupo · orden nueva   | R04, R05, R24          |
| 9   | `esperar`     | dejarse caer a por un compañero / al caído                   | 5       | tiempo cedido                  | recogido · hueco > techo · 3 km           | R12, R11, R01          |
| 10  | `rematar`     | disputar la meta: abrir, aguantar rueda o lanzar             | 3       | régimen de sprint              | fuera del grupo de cabeza                 | R16, R17               |
| 11  | `disputar`    | ir a por una pancarta (volante o cima)                       | 2       | `bannerCost`                   | pancarta pasada                           | R06, R07, R05          |
| 12  | `dosificar`   | administrar: grupeto, corte, mañana                          | ∞       | 0 (ahorra)                     | corte en riesgo · orden nueva             | R26, R08, R10          |
| 13  | `cortar`      | romper la carrera: abrir el abanico o no cerrar el hueco     | 2       | trabajo al frente + colocación | carretera gira · cerrado                  | R15, R20               |
| 14  | `pactar`      | negociar: tregua, alianza, trato en la fuga, parada          | 5       | reputación                     | rechazado · roto por el otro              | R09, R12, R18, R24     |

Las cinco «caras» de hoy (`fuga`, `contraataque`, `puente`, `ataque_grupo`, `ataque_final`) **dejan de
ser tipos de movimiento y pasan a ser el contexto en el que se evalúa `atacar`**: el mismo cálculo de
utilidad con distinta λ y distinto rival. Eso ya lo dice `docs/motor.md` §13.2 («una sola mecánica, no
nueve») y sigue siendo verdad; lo que cambia es que el intento deja de ser lo único que hay.

### 2.3 Con qué frecuencia se decide — los cuatro relojes

El motor de hoy tiene **tres cadencias sin nombre**: el bloque de 100 m (todo), los 10 bloques de la
decisión del pelotón, y la etapa (`buildTeamPlans` una vez, línea ~1577, y por eso `leaderId` y
`purposes` quedan congelados el día entero: es lo que rompe S-200, S-190, S-197 y S-291). Se
nombran y se reparten así:

| Reloj                | Cada             | Quién                       | Qué se decide                                                                     | Coste |
| -------------------- | ---------------- | --------------------------- | --------------------------------------------------------------------------------- | ----- |
| **R1 · bloque**      | 100 m            | todos                       | ejecutar el compromiso; **reflejos** (§2.5)                                       | nulo  |
| **R2 · agente**      | 1 km, escalonado | un décimo del campo por bloque | reevaluar la intención (§2.4)                                                 | alto  |
| **R3 · equipo**      | 1 km             | los 22 árbitros             | cupos, frente, carta del día, rescate (§2.6)                                      | medio |
| **R4 · fase/suceso** | al ocurrir       | los afectados               | invalidar compromisos y forzar R2 fuera de turno, **con retardo** (§3.4)          | medio |
| **R5 · etapa**       | 1 vez            | equipo                      | estructura → papeles del día (§5)                                                 | nulo  |

**El escalonado determinista es la pieza clave y hay que explicarla.** Si los 176 agentes deciden en
el mismo bloque pasan dos cosas malas: el coste se concentra (y el motor ya se frenó un 48 % en dos
versiones, deuda §14 punto 40) y **todos reaccionan a la vez al mismo hueco**, que es lo que produce
el rebaño. La regla:

```
tickOffset(riderId) = hash32(riderId) mod agentTickSpread     // 0..9, estable toda la carrera
decide en el bloque i  ⟺  (i + tickOffset) mod agentTickBlocks == 0
```

Con `agentTickBlocks = 10` y `agentTickSpread = 10`: cada agente decide **una vez por kilómetro**, y en
cada bloque decide **el 10 % del campo**. El coste por bloque es el mismo que hoy paga la decisión del
pelotón cada 10 bloques, repartido. Y sale gratis un efecto que el catálogo pide en tres sitios
distintos: **la reacción no es simultánea** (S-489, S-478, S-166), porque entre que uno ve algo y otro
lo ve pasan hasta 900 m.

`hash32` es determinista y no consume dados: no toca `rngTactics` ni ningún subflujo.

### 2.4 El tick del agente, en pseudocódigo

Con el mismo formato que `docs/motor.md` §13.2 usa para el intento de movimiento:

```
tickAgente(a, bloque):

  # 1. PERCIBIR — lo único que puede leer (§3). Nunca la verdad del motor.
  self  = verSelf(a)                       # exacto: es su cuerpo
  grupo = verGrupo(a)                      # casi exacto: va dentro
  race  = verCarrera(a)                    # pizarra: retardo, redondeo, error, sesgo

  # 2. ¿SIGUE VALIENDO LO QUE ESTOY HACIENDO?
  c = a.commitment
  vivo = c.untilKm > race.km  y  ningún invalidador de c se ha disparado
  if vivo:
      retador = mejorIntencion(self, grupo, race, excepto = c.kind)
      if retador.score <= c.score * (1 + commitHysteresisMargin):
          return                            # ← el anti-temblor: no se cambia por poco
      if not cabeElCambio(a, retador):      # cupo, cerillos, energía mínima
          return

  # 3. ELEGIR
  cands = intencionesPosibles(self, grupo, race)      # filtra por precondición
  cands = ordenar por utilidad(i, self, grupo, race)  # §2.7
  for i in cands:
      cupo = pedirCupo(a.teamId, a.riderId, i)        # §2.6 — arbitraje intra-equipo
      if cupo == CONCEDIDO or cupo == NO_APLICA:
          break
      # cupo == DENEGADO → se prueba la siguiente. NUNCA se deja sin intención:
      # el suelo es `esconderse`, que no consume cupo y siempre está disponible.

  # 4. COMPROMETERSE
  a.commitment = {
      kind: i.kind, targetId: i.targetId,
      sinceKm: race.km,
      untilKm: race.km + max(commitMinKm[i.kind], i.duracionPedida),
      score: i.score,
      reason: i.motivo,                     # va a la crónica sin traducir (R23)
      invalidators: i.invalidators,
  }
  a.claim = cupo
  registrarEnMemoria(a, i)                  # R09, R25: lo que se debe y lo que se cumplió
```

**Por qué la histéresis va en la comparación y no en la utilidad.** Si se metiera el sesgo dentro de
`utilidad()` habría que sumarle un término a cada una de las catorce, y la calibración se enredaría con
la de las intenciones. Poniéndolo en la comparación —`retador > vigente · (1 + m)`— hay **una sola
constante** que gobierna el temblor de todo el motor, `commitHysteresisMargin`, y se puede medir sola
(§7, banco de temblor). Valor de partida **0,15**, con el precedente medido de `commitHysteresis` 0,4
sobre el compromiso del grupo y de `mainGroupTakeoverRatio` 1,25 sobre el título de pelotón: el motor
ya usa este patrón dos veces y funciona.

**Por qué duración mínima además de histéresis.** La histéresis sola no basta: cuando dos intenciones
empatan, el ruido del bloque las alterna. La duración mínima (`commitMinKm`) prohíbe la alternancia
por debajo de una escala de kilómetros que es la de la carretera: un relevo dura 1,5 km, un marcaje
dura veinte, un arropo dura todo el día. Es exactamente lo que S-492 declara `AUSENTE` («el turno no
dura ni tiene orden: `relayTurn` se rehace entera desde cero cada bloque de 100 m y en cada grupo, sin
memoria de quién acaba de tirar, sin relevo hacia atrás y sin duración»).

### 2.5 Los reflejos: lo que sí se decide cada bloque

Tres cosas no pueden esperar al tick del kilómetro, y las tres son respuestas, no iniciativas. Son
**baratas** porque no evalúan las catorce intenciones: son una comparación y un dado.

| Reflejo                | Disparador                                          | Resuelve con                                              | Situaciones      |
| ---------------------- | --------------------------------------------------- | --------------------------------------------------------- | ---------------- |
| **responder al ataque**| alguien de mi grupo abre                            | `followProbability` de hoy + `wheelProbability` si le marco| S-276, S-321     |
| **cerrar el hueco**    | la rueda de delante abre > `wheelGapReflexS` (1,5 s)| `sustainsJump` con mi perfil                              | S-490, S-460     |
| **agarrarse**          | la deriva pasa `driftDropGapSeconds`                | `comesOff` de hoy (cerillo o reserva)                     | S-276, S-277     |

Los tres existen ya. Lo único que cambia: **el reflejo no crea compromiso**. Un corredor que salta a
una rueda no ha decidido irse a la fuga; en su siguiente tick decidirá si se queda o se deja caer. Eso
cierra S-130 y S-134 por el mecanismo correcto, y no por un veto.

### 2.6 Conflicto 1: dos corredores del mismo equipo en el mismo bloque

Hoy no hay conflicto porque no hay decisión de equipo: `teamAttack` es **idéntico para los ocho** y se
multiplica al apetito de cada uno por separado, así que dos compañeros pueden atacar en el mismo
movimiento o uno contra otro (`mapa-tactics.md` §10, consecuencias directas). El arreglo no es una
regla de desempate: es un **mercado de cupos con un solo vendedor**.

```ts
// packages/engine/src/stage/team.ts
type ClaimKind =
  | 'frente'        // llevar el frente del grupo (cupo 1 por equipo y grupo)
  | 'fuga'          // estar en un movimiento por delante (cupo por estructura, §5)
  | 'ataque'        // abrir un movimiento en este km (cupo 1 por equipo y grupo)
  | 'marcaje'       // vivir en la rueda de un rival (cupo 2 por equipo)
  | 'rescate'       // bajar a por un compañero (cupo n−1 por equipo)
  | 'carta'         // ser el que remata (cupo 1 por grupo; 2 con doble baza declarada)
  | 'lanzamiento'   // llevar a la carta (cupo 2 por carta)
  | 'pancarta'      // disputar la volante o la cima (cupo 1 por equipo y pancarta)

interface TeamClaim { kind: ClaimKind; riderId: string; sinceKm: number; untilKm: number }
```

El arbitraje corre en **R3, antes que los ticks de agente del mismo kilómetro**, y es puro:

```
arbitrar(equipo, km):
  # 1. Caducan los cupos vencidos y los de los que ya no pueden usarlos
  #    (cambiaron de grupo, se cayeron, abandonaron, se rindieron).
  # 2. Se recalcula la CARTA DEL DÍA por grupo, no por etapa (§5.4) — cierra S-291, S-200, S-190.
  # 3. Se conceden los cupos por prioridad de la estructura, no por orden de llegada:
  for kind in ORDEN_DE_CUPOS:           # carta > frente > fuga > rescate > lanzamiento > marcaje > ataque > pancarta
      candidatos = miembros leales que PIDIERON kind este km, o que ya lo tenían
      ganador = argmax(idoneidad(kind, m))    # §5.5, con desempate estable por riderId
      conceder(kind, ganador); denegar al resto
```

**Tres consecuencias que apagan racimos enteros:**

- Dos compañeros **no pueden disputarse el sprint** (S-357, S-349, `CONTRARIO`): solo uno tiene el cupo
  `carta`; el otro, si está en el grupo, recibe `lanzamiento` y su utilidad de `rematar` cae a la del
  peón. Es el mecanismo que `finishRoleWeight` (v48) intentó comprar con un factor de 0,88, y que el
  propio comentario reconoce que no fue: «LO PRIMERO QUE SE MIDIÓ FUE FALSO… ninguno llevaba un
  lanzador dentro. Eran gregarios».
- Dos compañeros **no atacan a la vez** (S-094, S-304): el cupo `ataque` es uno por equipo y km, así
  que el segundo, cuando le llega su tick, encuentra denegado el cupo y su segunda mejor intención es
  `esconderse` a rueda —que es exactamente «ataca primero el peón y la carta se guarda».
- El **frente lo lleva uno** (regla 3 de §V.1) deja de ser una excepción cableada en `frontTeamId` y
  pasa a ser un cupo más, con la misma maquinaria de histéresis.

**Y el arbitraje falla a veces, a propósito.** Un director bot modesto concede mal el cupo (R24): la
`idoneidad` se evalúa con la percepción del director, que lleva su error (§3.4). Eso es S-009
(`CONTRARIO`, con cita: «El director bot elige estructuras razonables y nunca óptimas») sin tocar los
vatios de nadie.

### 2.7 La utilidad: cómo se puntúa una intención

Una sola forma para las catorce, que es lo que permite compararlas:

```
utilidad(i) = valor(i) × probabilidad(i) − precio(i) + inclinación(i)
```

- **`valor(i)`**: qué se lleva si sale, en la moneda del corredor. La moneda es **puntos de objetivo**,
  normalizada a [0,1] contra el mejor resultado que ese corredor puede aspirar hoy: ganar la etapa 1,0;
  el podio 0,55; entrar en el corte 0,25; un puesto de general 0..0,9 según lo que se juegue el equipo;
  una pancarta según el motivo declarado (§5.3, R05). **Esto es lo que hoy no existe**: el motor sabe
  quién remata mejor (`finishScore`) pero no qué se juega cada uno, y por eso S-346, S-336 y S-137 son
  `PARCIAL`/`CONTRARIO`.
- **`probabilidad(i)`**: lo que ya calcula el motor, y bien. `jumpGapSeconds` para `atacar` (S-476,
  `CUBIERTO`: «el boquete se calcula y el intento se paga igual»), `noChanceToWin` para `relevar`,
  `sprintHoldMetres`/`launchEffect` para `rematar`, `timeCutFraction` para `dosificar`.
- **`precio(i)`**: cerillos, depósito, cupo consumido y **coste de oportunidad del cupo** (si al pedir
  `fuga` dejo a mi equipo sin nadie para el frente, el precio sube).
- **`inclinación(i)`**: rol × mentalidad × `effort` × memoria. Es donde entran las palancas del
  jugador, y donde hoy están **todas** juntas y comprimidas.

Los pesos concretos por intención van en §4, racimo por racimo. Regla de calibración que este
documento se aplica a sí mismo: **ninguna utilidad lleva más de cuatro términos**, porque una fórmula
de nueve términos no se puede calibrar con seis semillas y el propio mapa de bancos ya avisa de que
«todo lo más fino que 2-4 puntos porcentuales está dentro del ruido».

### 2.8 Conflicto 2: el plan de equipo contra la orden individual

La regla 1 de §V.1 es literal y no se toca: **«Las individualidades priman sobre el plan. El que corre
por su cuenta queda FUERA del plan: ni le empuja ni le frena.»** Lo que cambia es que hoy eso se
implementa con un booleano (`rebelIds`) que tiene dos defectos medidos:

1. **Es de etapa y binario**: o estás en el plan o no lo estás, todo el día. Un humano que escribe
   «hoy voy libre pero si mi jefe se cae, le espero» no se puede expresar (S-054, S-059, S-023).
2. **Solo existe con jugador humano** («`world/autoOrders.ts` nunca nombra dos»), así que la mitad de
   las situaciones de R22 y todas las de R25 no tienen sujeto.

El modelo nuevo tiene **tres grados**, no dos, y se declara por intención y no por corredor:

| Grado         | Qué significa                                                              | Efecto en el arbitraje                                                 | Situaciones          |
| ------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------- |
| `plan`        | el corredor acepta el reparto del equipo                                    | pide y recibe cupos; su utilidad lleva el empuje del plan               | por defecto          |
| `exceptuado`  | va por libre **con permiso**: no trabaja, no recibe ayuda, no estorba       | **no pide cupos y no bloquea ninguno**; no puede pedir `frente`         | S-053, S-188, S-314  |
| `rebelde`     | va por libre **sin permiso**                                                | igual que exceptuado + **coste de confianza** (R25)                     | S-057, S-113, S-058  |

Y la precedencia se resuelve con una sola regla, que se puede escribir en una línea:

```
Si la ORDEN INDIVIDUAL nombra una intención, esa intención se evalúa SIEMPRE y su cupo
se concede SIEMPRE (aunque el árbitro lo hubiera dado a otro), y el corredor pasa a
`exceptuado` o `rebelde` para el resto del kilómetro. El árbitro reasigna lo que quedó libre.
```

Esto cierra tres `CONTRARIO` que hoy no tienen arreglo posible: S-058 («el humano `libre` al que sus
gregarios bot convierten en jefe sin pedirlo» — el cupo `carta` no se puede conceder a quien no lo
pidió), S-060 («el humano al que su equipo bot pone de lanzador de sí mismo» — el arbitraje comprueba
ciclos antes de conceder) y S-062 («el mánager nombra jefe de filas y `pickLeader` opina distinto» —
la estructura manda sobre `pickLeader`, que desaparece; §5).

### 2.9 Determinismo con un solo flujo de dados

El motor ya tiene la doctrina bien: subflujos nominales (`breakaway`, `tactics`, `sprint`, `placement`,
`launch`, `rough`, `abandon`, `crash`, `day`, `mood`, `viento`, `work:<id>`) y la regla de que un dado
que se muda de sitio **se sigue quemando en su posición original**. Tres reglas más, que son las que
hacen falta para que ciento setenta y seis agentes no destruyan la reproducibilidad:

1. **Un subflujo por agente, no un flujo global de agentes.** `rngAgent(riderId)` = `seededRng(`agent:${riderId}`)`,
   avanzado una vez por tick. Consecuencia: **el resultado de un corredor no depende de cuántos
   corredores decidan antes que él**, ni de si otro abandonó, ni de en qué orden se recorra la lista.
   Es el patrón que ya usa `workJitter` (`work:<id>`) y el único que sobrevive a añadir una regla.
2. **El orden de recorrido es el canónico por `riderId`** (ya existe, líneas 912-917) y **el arbitraje
   de equipo corre antes que todos los ticks del mismo bloque**, en orden canónico de `teamId`. Sin
   eso, dos equipos que compiten por el mismo cupo darían resultados distintos según el orden del mapa.
3. **Un dado que no se usa se quema igual.** Si una precondición corta la evaluación antes de llegar al
   sorteo, el sorteo se hace y se descarta. Es caro en apariencia y es lo que permitió a la v21
   arreglar el ataque del km 0 sin desplazar `rngTactics` de todas las etapas del juego (S-038); sin
   esa disciplina, cada racimo que se implemente movería las huellas de los 27 restantes y sería
   imposible atribuir nada.

**Coste medido esperado.** 176 subflujos de RNG contra los 12 de hoy: el objeto de `seededRng` es un
contador de 32 bits, así que el coste es de memoria (176 × ~16 bytes) y no de CPU. El coste real de
este diseño está en las evaluaciones de utilidad (§7 lo presupuesta).

---

## 3. Los tres contextos y su contrato

El contrato es una regla, no una sugerencia: **una función de decisión de L3 o L4 recibe estos tres
registros y nada más.** Si necesita algo que no está, se añade al contrato (y entonces está para
todos, con su retardo y su error) o no se hace. Hoy la regla se rompe en los dos sentidos:
`attemptFrom` lee `racingNow` y la lista entera de miembros (verdad instantánea que un corredor no
tiene), y a la vez `MoveRider` **no lleva `teamId`** (dato trivial que cualquiera tiene).

### 3.1 `SelfView` — lo que un corredor sabe de sí mismo

Exacto y sin retardo: es su cuerpo. Lo único que se le añade a lo de hoy es memoria y clasificaciones.

```ts
interface SelfView {
  riderId: string
  teamId: string | null
  standing: 'plan' | 'exceptuado' | 'rebelde'        // §2.8

  // órdenes (§6)
  role: StageRole; mentality: Mentality; effort: Effort
  triggerKm: number | null
  conditionals: Conditional[]                         // N1, §6.3
  motives: Motive[]                                   // R05: montaña, puntos, joven, equipos…

  // cuerpo — todo esto existe ya en RiderSim
  perfil: number                                      // efectivo en ESTE bloque
  perfilFresco: number                                // el de eff0, para saber cuánto ha perdido
  energyFraction: number                              // energy/energy0
  matches: number
  matchBoostS: number
  reserveFraction: number                             // reserveS / reserveSeconds
  driftS: number

  // lo hecho hoy — hoy vive en `parte` y NADIE lo lee (mapa-simulate §1)
  kmAlFrente: number
  kmEnFuga: number
  kmDesdeMiUltimoRelevo: number                       // ← S-492: el turno tiene orden
  cerillosGastados: number
  gastadoHastaKm: number

  // lo que se juega — R04, R05, R07
  gcDeficitSeconds: number
  gcRank: number | null
  standings: Record<ClassificationId, Standing>       // ← S-035: general, puntos, montaña, joven, equipos
  bonusAlcance: number                                // ← S-334: segundos de meta que puedo quitar hoy

  // memoria dentro de la etapa
  memory: RiderMemory
}

type ClassificationId = 'general' | 'puntos' | 'montaña' | 'joven' | 'equipos'
interface Standing { rank: number; gap: number; leaderId: string | null; /** puntos o segundos */ unit: 'pts'|'s' }

interface RiderMemory {
  /** A quién le debo un relevo hoy y a quién se lo negué (R09, R18). */
  deudas: Map<string, number>            // riderId → puntos de deuda, [-3, +3]
  /** Intenciones adoptadas hoy, para no repetir la misma tres veces (anti-temblor y R23). */
  historial: { km: number; kind: IntentKind; targetId: string | null }[]
  /** Tregua/alianza/trato vigente y con quién (R09, R12, R18). */
  pactos: Pacto[]
}
```

### 3.2 `GroupView` — lo que ve de su grupo

Casi exacto: va dentro. Lo que **no** es exacto es el estado de los rivales (§3.5). Aquí está el 60 %
de lo que falta hoy: el corredor que decide no sabe quiénes son sus compañeros.

```ts
interface GroupView {
  groupId: string
  kind: 'peloton' | 'cabeza' | 'movimiento' | 'grupeto'
  size: number
  esElPeloton: boolean                       // group.id === mainId (ya existe)

  // ───── EQUIPO: lo que hoy NO EXISTE en tactics.ts ─────
  mates: MateView[]                          // compañeros presentes, sin mí
  matesUpTheRoad: MateView[]                 // compañeros en grupos POR DELANTE ← R01
  matesBehind: MateView[]                    // compañeros en grupos POR DETRÁS  ← R01
  miCarta: string | null                     // quién es la carta de mi equipo EN ESTE GRUPO
  miClaim: TeamClaim | null

  // ───── EL TURNO: hoy se rehace desde cero cada 100 m ─────
  turno: { orden: string[]; alFrente: string; kmDeSuTurno: number }   // ← S-492
  frontTeamId: string | null
  equiposQueTiran: string[]                  // ← S-167: 2-3 equipos, no cinco

  // ───── RIVALES ─────
  rivals: RivalView[]                        // los `groupScanMax` más relevantes
  mejorRematador: string                     // el peligro (ya existe como `mejorDelGrupo`)
  miRankDeRemate: number                     // [0,1]
  peligrosos: string[]                       // los que me quitan algo si llegan (R04, R05)

  // ───── ESTADO SOCIAL: existe ─────
  compromiso: number; coop: number; tension: number

  // ───── POSICIÓN: no existe. R15 entero cuelga de esto ─────
  miBanda: 1 | 2 | 3 | 4                     // cuartil de colocación
  cabenDelante: number                       // `cabenEnFila` cuando hay viento; ancho si no
  ruedaDeQuien: string | null                // ← S-490: de quién dependo en la fila
}

interface MateView {
  riderId: string
  role: StageRole
  esCarta: boolean
  claim: ClaimKind | null
  /** Frescura en TRES escalones, no un número: es lo que se ve de un compañero. */
  frescura: 'entero' | 'justo' | 'vacio'
  banda: 1 | 2 | 3 | 4
  relojS: number                             // su tS, para saber cuánto por delante/detrás va
}

interface RivalView {
  riderId: string
  teamId: string | null
  esCarta: boolean
  /** Cuánto me quita si llega: mezcla de remate, general y motivo (§4/R04). */
  amenaza: number                            // [0,1]
  señales: RivalSignals                      // ← S-488: lo que se VE, no lo que ES
}
```

### 3.3 `RivalSignals` — el estado ajeno se lee en la carretera (S-488)

Es una de las veinte más graves y es de las baratas. Hoy `interésPropio` compara `finishScore` con el
depósito real del rival, y `S-319` («huele la sangre») dice de sí misma que es «ciego a la identidad
del que flaquea». La pieza:

```ts
interface RivalSignals {
  banda: 1 | 2 | 3 | 4                 // en qué puesto va: se ve
  gregariosVisibles: number            // los que ENSEÑA, no los que tiene ← se puede falsear
  sufriendo: boolean                   // deriva > 0 sostenida ← se puede disimular
  suEquipoSoltóElFrente: boolean       // se ve
  vieneDeRelevar: boolean              // se ve
}

// Lectura, con error y con disimulo. Determinista: dado del subflujo del observador.
leerRival(observador, rival, rng):
  sufriendoReal    = rival.driftS > 0  ∨  rival.energyFraction < signalHurtEnergy (0,30)
  escondeChance    = signalHideBase (0,35) + signalHideTac · (rival.TAC − 50)/100     # TAC 80 → 0,50
  sufriendo        = sufriendoReal ∧ ¬(rng() < escondeChance ∧ rival.banda <= 2)
                     # ← «el jefe tocado se esconde DELANTE y con cara de fresco»
  gregariosVisibles= min(gregariosReales, gregariosReales − (rng() < signalHoldOne (0,30) ? 1 : 0))
  # y el que MIRA también se equivoca: la banda se lee con ±1 si el grupo es grande
  banda            = clamp(rival.banda + (grupo.size > 40 ? redondear(rng·2 − 1) : 0), 1, 4)
```

**Constantes de partida**: `signalHurtEnergy` 0,30 · `signalHideBase` 0,35 · `signalHideTac` 0,20 ·
`signalHoldOne` 0,30 · `groupScanMax` 24 (a cuántos rivales se mira; por encima de eso un corredor no
lleva la cuenta, y además acota el coste de la percepción: §7).

### 3.4 `RaceView` — lo que ve de la carrera, tarde y mal

Aquí está la pieza que S-458 (puesto 17 de las veinte más graves) llama «el error de la pizarra» y
S-478 (puesto 19) «el percance se sabe tarde». Las dos, más S-488, cierran la capa de información, y
las tres son `AUSENTE`. **Es el cambio más profundo de este diseño y el más barato de implementar**:
no toca la física, solo lo que se lee.

```ts
interface RaceView {
  km: number; kmToGo: number; totalKm: number
  phase: Phase                                  // ← R19, §4/R19
  road: RoadView                                // el terreno que VIENE (el mapa se conoce)
  format: RaceFormat                            // ← R28
  board: Blackboard                             // ← lo demás: por radio, tarde y con error
}

interface Blackboard {
  /** El kilómetro al que corresponde esta foto. NUNCA es `km`. */
  asOfKm: number
  groups: BoardGroup[]
  news: BoardNews[]
  virtual: VirtualGc                            // ← R04, calculada sobre ESTA foto (o sea, mal)
}

interface BoardGroup {
  id: string
  size: number                                  // «unos veinte», redondeado
  gapS: number                                  // redondeado y sesgado
  /** Composición CONOCIDA: los nombrados por radio, no la lista real. */
  conocidos: { riderId: string; teamId: string | null }[]
}

interface BoardNews {
  kind: 'caida' | 'pinchazo' | 'corte' | 'abanico' | 'ataque' | 'captura' | 'pancarta'
  km: number                                    // cuándo pasó de verdad
  riderIds: string[]                            // puede estar MAL (S-478)
  gravedad: 'leve' | 'grave' | 'desconocida'
  fiable: boolean
}
```

**Cómo se construye la pizarra de un equipo.** Una sola función pura, `verCarrera(equipo, km)`:

```
verCarrera(equipo, km):
  # 1. RETARDO — el número es de hace un kilómetro (S-458)
  lag     = boardLagKm + boardLagSd · N(0,1)                # 1,2 ± 0,5 km
  asOfKm  = km − max(0, lag)
  foto    = historial[asOfKm]                               # anillo de 30 fotos, una por km

  # 2. ERROR POR EQUIPO — la calidad de dirección (S-014, S-458)
  sd      = boardErrorBase + boardErrorSlope · (100 − equipo.direccion)     # 4 s + 0,35·(100−dir)
  gapS    = redondearA(foto.gapS + sd · N(0,1), boardRoundingS)             # a 15 s

  # 3. SESGO DEL DIRECTOR — el número se ADMINISTRA (S-458, segunda mitad)
  #    Se infla para que tiren; se recorta para que no se rindan.
  if equipo.intent == 'perseguir':  gapS ×= (1 + boardSpin)                 # +8 %
  if equipo.intent == 'fuga':       gapS ×= (1 − boardSpin)

  # 4. SUCESOS — llegan tarde y llegan mal (S-478)
  news = sucesos con km <= asOfKm − newsLagKm(1,5)
  for n in news:
      if rng() < newsWrongIdChance (0,25):  n.riderIds = [otro del mismo grupo]
      if rng() < newsSeverityErrorChance (0,35): n.gravedad = 'desconocida'
```

**Constantes de partida**: `boardLagKm` 1,2 · `boardLagSd` 0,5 · `boardRoundingS` 15 ·
`boardErrorBase` 4 · `boardErrorSlope` 0,35 · `boardSpin` 0,08 · `newsLagKm` 1,5 ·
`newsWrongIdChance` 0,25 · `newsSeverityErrorChance` 0,35 · `boardHistoryKm` 30.

`equipo.direccion` ∈ [0,100] es **el único atributo nuevo del mundo** que este diseño pide, y es de
equipo, no de corredor: sale de `teams.quality` (que ya existe y ya desempata quién toma el frente).
Con dirección 100 la sd es 4 s; con dirección 40, 25 s. **Los vatios son los mismos para todos**, que
es literalmente lo que S-014 pide: «Los equipos malos ven peor y deciden más tarde; la física es la
misma para todos».

**Un guardarraíl obligatorio**: `boardLagKm = 0`, `boardErrorSlope = 0`, `boardSpin = 0` y
`newsLagKm = 0` **tienen que reproducir el motor de hoy bloque a bloque**. Es la prueba de que la capa
de información está bien separada, y es el brazo de control del banco de §7.5.

### 3.5 `RoadView` — el mapa sí se conoce

Lo que viene por delante no lleva retardo: está en el libro de ruta y todo el mundo lo ha estudiado.
Lo que hoy no existe es que alguien lo LEA para decidir (S-140, S-240, S-243, S-322, S-493).

```ts
interface RoadView {
  /** El bloque de ahora. */
  aqui: { tipo: 'llano'|'subida'|'bajada'; gradiente: number; pavesEstrellas: number; altitudM: number }
  /** Lo que viene, ordenado y con su distancia. Recalculado una vez por etapa. */
  proximaCima: { km: number; categoria: 1|2|3|4|'HC'; puntos: number; bonif: number; altitudM: number } | null
  proximaVolante: { km: number; puntos: number; bonif: number } | null
  proximoSector: { km: number; tipo: 'pave'|'tierra'; estrellas: number; longitudKm: number } | null
  proximoTramoExpuesto: { km: number; longitudKm: number } | null      // ← S-243, viento
  ultimaCima: { km: number; kmAMeta: number } | null                   // ← S-486, S-289
  /** Sinuosidad del trazado [0,1]: cuánto cuesta cazar aquí. ← S-493 */
  sinuosidad: number
  /** Tipo de final PREVISTO (el real se calcula por grupo, R17). */
  finalPrevisto: FinishType
  /** Conocimiento de ESTE trozo por corredor. ← S-429 */
  conocidoPor: (riderId: string) => boolean
}
```

**`sinuosidad`** es un número nuevo por segmento, [0,1], que sale del generador y de los datos reales
(densidad de curvas y de poblaciones por km). Es el eje que S-493 dice que falta: «el catálogo tipa la
carretera por pendiente, por altitud, por adoquín y por tierra, y le falta justo el eje del trazado,
que es el primero que un director mira al decidir si hoy se caza o se claudica». Efecto (§4/R20):
multiplica el coste de cerrar y reduce la ventaja de número.

### 3.6 Tabla de contrato: qué ve cada decisión, antes y después

Es la tabla de `mapa-simulate-decisiones.md` §5 con la columna de después. Solo las filas que cambian.

| Decisión                          | Equipo (hoy → después)                  | General (hoy → después)          | Compañeros (hoy → después)    | Rivales (hoy → después)              | Delante/detrás (hoy → después)     |
| --------------------------------- | --------------------------------------- | -------------------------------- | ----------------------------- | ------------------------------------ | ---------------------------------- |
| `atacar` (D-22 `attemptFrom`)     | escalar → **estructura, cupo, mates**   | `gcDefence` → **general virtual**| solo si marca → **lista**     | `finishScore` rel. → **amenaza+señales** | no → **pizarra**              |
| `relevar` (D-01/02 `relayTurn`)   | empuje → **cupo + turno con orden**     | `gcRank===1` → **standings**     | arropo → **lista + deudas**   | mejor remate → **amenaza**           | vía banderas → **pizarra**         |
| `rematar` (`finishStage`)         | `leadOutFor` → **cupo `carta`**         | no → **bonificaciones (S-334)**  | no → **lista + cupo**         | mismo grupo → **mismo grupo**        | — → —                              |
| cuerda (`pelotonAllows`)          | no → **voto por equipos (R03)**         | déficit → **general virtual**    | no → **representación**       | no → **composición conocida**        | no → **pizarra**                   |
| criba (`shatter`)                 | no → no                                 | no → no                          | no → **el bajador (S-465)**   | no → no                              | no → no                            |
| grupeto (D-41)                    | no → **capo y cupo**                    | no → no                          | rendidos → **lista**          | no → **pacto entre rivales**         | `peloton` fijo → **`mainId`**      |
| meta volante / cima               | no → **cupo `pancarta`**                | no → **standings del motivo**    | no → **lista**                | no → **rival de la clasificación**   | grupo de cabeza → **todos**        |

---

## 4. Las reglas, racimo por racimo

Formato fijo para los veintiocho: **Pieza** (qué se construye y dónde) · **Reglas** (implementables:
fórmula o pseudocódigo) · **Cierra** (IDs) · **Constantes** (con valor de partida y su porqué) ·
**Medida** (estadística, banco y banda propuesta). Los racimos van en el orden del catálogo, que va de
más a menos rendimiento por pieza construida; el orden de **implementación** es otro y está en §8.

Cuando una constante no tiene justificación en carretera ni número medido detrás, se marca
**«calibrar con banco»** y su valor de partida es una hipótesis declarada, no un dato.

---

### R01 · Compañeros visibles dentro del grupo · 15 situaciones

> `CONTRARIO 1` · `AUSENTE 2` · `PARCIAL 9` · `CUBIERTO 3`. La pieza más barata del catálogo.

**Pieza.** `GroupView.mates`, `matesUpTheRoad`, `matesBehind` (§3.2) y el índice que los mantiene:
`teamIndex(groups) → Map<teamId, Map<groupId, riderId[]>>`, recalculado en R3 (una vez por km) y
actualizado por suceso cuando alguien cambia de grupo. **No hay nada más**: es un índice y tres
campos. Lo que cuesta es que `MoveRider` y `finishStage` los reciban, que es el refactor de identidad
del paso 1.

**Reglas.**

1. **R01.1 — «tengo un hombre delante, no paso»** (S-128, hoy solo fuera del pelotón y solo si el de
   delante es una CARTA): la utilidad de `relevar` se anula si hay un compañero por delante, **en
   cualquier grupo, sea carta o no**, salvo que el equipo tenga cupo `frente` concedido.
   ```
   utilidad(relevar) ×= (matesUpTheRoad.length > 0 ∧ miClaim ≠ 'frente') ? mateAheadRelayDamp : 1
   ```
2. **R01.2 — el equipo partido en tres** (S-191): la carta del equipo es **por grupo** (§2.6 paso 2);
   cada corredor trabaja para la carta de SU grupo, y si en su grupo no hay carta, para el compañero
   mejor situado que aún puede ganar algo, calculado con la pizarra.
3. **R01.3 — nadie persigue a los suyos** (S-177, S-188, S-113): un equipo con hombre delante no pide
   cupo `frente`; y **además marca** —lo que S-177 dice que falta—: cada compañero en el pelotón gana
   `+markGuardWeight` en la utilidad de `marcar` sobre los rivales que amenazan a su fugado.
   Excepción: el `rebelde` no cuenta como hombre propio (S-113, ya `CUBIERTO`).
4. **R01.4 — esperar al compañero** (S-249, S-311, S-250): `esperar` gana precondición nueva —compañero
   descolgado a ≤ `waitMaxGapS`— y su valor sale de lo que ese compañero vale para el equipo hoy
   (carta 1,0; tercer hombre de la clasificación por equipos `teamsClassWeight`; peón 0,15).
5. **R01.5 — el maillot en la fuga** (S-307): delante relevan los compañeros del maillot y los libres;
   detrás persiguen los equipos del 2.º y 3.º. Sale solo de R01.1 + la general virtual de R04.

**Cierra.** `S-089`, `S-113`, `S-128`, `S-133`, `S-177`, `S-187`, `S-188`, `S-191`, `S-211`, `S-247`,
`S-249`, `S-250`, `S-307`, `S-314`, `S-318`.

**Constantes.** `mateAheadRelayDamp` **0,05** (no 0: un solo hombre delante no exime del todo si el
grupo se hunde) · `markGuardWeight` **0,35** · `waitMaxGapS` **90** (por encima, esperar cuesta la
carrera; calibrar con banco) · `teamsClassWeight` **0,30**.

**Medida.** Banco `equipos` nuevo (§7.2). Estadística: `relevosDeCompañeroConHombreDelantePct` —
fracción de bloques en que alguien releva teniendo un compañero por delante. Hoy no se mide; en
producción es alta por construcción. **Banda propuesta: 0-8 %.** Y `esperasPorCompañeroPorEtapa`,
**banda 0-2** en llana, 0-4 en reina.

---

### R02 · Superioridad numérica: dos compañeros en el mismo grupo · 12 situaciones

> `CONTRARIO 4` · `AUSENTE 8`. **Cero situaciones cubiertas: el racimo entero no existe.**

**Pieza.** El bloque de coordinación intra-equipo: los cupos `carta`, `ataque` y `lanzamiento` de §2.6
aplicados **dentro de un grupo pequeño**, más la asignación de papel por pareja.

**Reglas.**

1. **R02.1 — el peón y la carta** (S-094, S-304, S-349): en un grupo con ≥ 2 leales del mismo equipo,
   el árbitro asigna `carta` al de mayor `finishScore` **del tipo de final de ESE grupo** (R17) y
   `peón` al resto. El peón:
   ```
   utilidad(atacar)  ×= pawnAttackGain          # ataca primero: que gasten cerrando
   utilidad(relevar) ×= pawnRelayGain           # releva por los dos
   utilidad(rematar)  = 0 si la carta está en el grupo  # ← S-357, S-349: no se disputan el sprint
   ```
   Y la carta: `utilidad(relevar) ×= cardRelayDamp`, `utilidad(atacar) ×= cardAttackDamp` mientras el
   peón tenga cupo `ataque` vivo (**el turno alterno**: S-304, S-358, S-306).
2. **R02.2 — nadie salta a la rueda de su compañero** (S-304 literal): en el reflejo de respuesta,
   `followProbability = 0` si el instigador es de mi equipo y tengo `peón` o `carta` asignado. Hoy es
   posible y ocurre.
3. **R02.3 — el lanzamiento improvisado** (S-362): en grupo ≤ `smallGroupMax`, cualquier compañero con
   cupo `lanzamiento` puede lanzar sin rol `lanzador`: entra en `rematar` con `modo = 'lanzar'`, lleva
   a la carta hasta `sprintHoldMetres(carta)` y cede. Hoy `lanzando()` exige `isBunch ∧ kmToGo ≤ 3 ∧
   lanzaPara`, así que en una fuga de cinco no existe.
4. **R02.4 — el rival en minoría** (S-265, S-305, S-306): un corredor solo contra una pareja lee
   `mates.length` de los rivales y decide:
   ```
   si  miRankDeRemate es el mejor del grupo → esconderse (que se maten ellos)
   si  no y el pelotón viene a ≤ minorityGiveUpS → relevar (que la fuga viva)
   si  no → atacar lejos (única forma de no perder al sprint)
   ```
5. **R02.5 — la mayoría fija el ritmo** (S-306): con `mates.length ≥ ceil(size/2)` el equipo mayoritario
   se lleva el cupo `frente` del grupo y sus ataques se alternan; los rivales en minoría reciben
   `utilidad(atacar) ×= minorityAttackDamp`.
6. **R02.6 — la superioridad se cuenta con los leales** (S-314): `mates` excluye `exceptuado` y
   `rebelde` en todos los cálculos anteriores.

**Cierra.** `S-094`, `S-265`, `S-293`, `S-303`, `S-304`, `S-305`, `S-306`, `S-343`, `S-349`, `S-357`,
`S-358`, `S-362`.

**Constantes.** `pawnAttackGain` **1,8** · `pawnRelayGain` **1,4** · `cardRelayDamp` **0,25** ·
`cardAttackDamp` **0,35** · `smallGroupMax` **12** · `minorityAttackDamp` **0,5** ·
`minorityGiveUpS` **60**. Todas: calibrar con banco; la referencia de carretera es «dos contra uno
ganan más de lo que dice el azar» (S-358).

**Medida.** Banco `equipos`, escenario `pareja` (grupos de 4-8 construidos a mano con una pareja y
cuatro sueltos, 200 semillas). Estadística: `parejaWinPct` — fracción de grupos decisivos con una
pareja en los que gana uno de los dos. Al azar, con pareja 2 de 6, sería 33 %. **Banda propuesta:
45-65 %.** Segunda: `compañerosQueSeDisputanElSprintPct`, **banda 0-2 %** (hoy: sin medir, y el
comentario de `finishRoleWeight` documenta el caso).

---

### R03 · La aduana como voto por equipos, revisable cada kilómetro · 24 situaciones

> `CONTRARIO 3` · `AUSENTE 5` · `PARCIAL 10` · `CUBIERTO 6`. Lleva dos de las veinte más graves
> (S-114 nº 11, S-083 nº 12) y una tercera (S-433 nº 10).

**Pieza.** Sustituir `pelotonAllows` —un dado con rampa— por **una subasta de trabajo por equipos**,
recalculada cada kilómetro. Y del otro lado, `breakCandidate`: quién es elegible para irse.

**Reglas.**

1. **R03.1 — el voto de un equipo** (S-114, S-086, S-087, S-088, S-090, S-119). Cada equipo emite cada
   km un voto en [−1, +1] sobre el movimiento de cabeza, con **cuatro sumandos y nada más**:
   ```
   voto(e, mov) =  wRepresentacion · (tengo hombre dentro ? 1 : −1)
                 + wPeligro        · (−peligroVirtual(e, mov))        # R04, sobre la PIZARRA
                 + wMotivo         · (motivo(e) exige el frente ? −1 : +1)
                 + wFuerza         · (puedoPagarelCierre(e) ? −1 : +1)
   cuerda(mov) = clamp( Σ voto(e)·peso(e) / Σ peso(e) , −1, 1 )
   peso(e)     = hombresEnElPeloton(e) / 8
   ```
   `cuerda > 0` → nadie pide `frente`; el hueco crece a la velocidad de la física.
   `cuerda ≤ 0` → los equipos con voto negativo pujan por el cupo `frente` (R20).
   **La cuerda ya no es una probabilidad al nacer, es un estado que se revisa** — que es literalmente
   S-120 («el voto se revisa cada kilómetro; hoy se decide una vez, al nacer»).
2. **R03.2 — histéresis del voto**: la cuerda solo cambia de signo si el nuevo valor supera el vigente
   por `leashHysteresis`. Sin esto, la aduana tiembla kilómetro a kilómetro y el frente cambia de
   manos cada 100 m. Es el anti-temblor de §2.4 aplicado a la decisión colectiva.
3. **R03.3 — quién es elegible para irse** (S-083, S-433, S-473, S-472, S-076):
   ```
   elegible(r, hoy) =  spr < breakawaySkipSprThreshold            # ← S-473, ya CUBIERTO
                     ∧ ¬gastado                                    # ← ya CUBIERTO
                     ∧ (cupoFuga(equipo) > usados(equipo))         # ← S-083, cupo por estructura
   idoneidad(r, hoy) = w_terreno · perfilDelDia(r, road)           # ← S-433, la fila CONTRARIO
                     + w_motivo  · sirveAlMotivo(r, equipo.motives)
                     − w_ayer    · fugaAyer(r)                     # ← S-076, coste no veto
                     − w_tirando · (vieneDeRelevar ? 1 : 0)        # ← S-472, ya CUBIERTO
   perfilDelDia(r, road) = LLA en llana · 0,6·MON+0,4·COL en reina · 0,5·TAC+0,3·LLA+0,2·RES en mixta
   ```
   `perfilDelDia` **sustituye a `breakScore`**, que hoy es `0,5·TAC + 0,3·LLA + 0,2·RES` en toda
   etapa, y por eso en una reina se manda al rodador (S-433, nº 10 de las veinte más graves, con la
   cita de v43 cerrada en v44 sobre el 18,1 % con un «está bien así»).
4. **R03.4 — el cupo depende del tamaño** (S-083, corrección anotada): `cupoFuga` = 1 por equipo
   mientras el movimiento tenga < `bigBreakRiders` (10); por encima, 2. «En la fuga de veinte de un
   día de montaña dos de la misma casa es lo normal y nadie veta por eso».
5. **R03.5 — el infiltrado** (S-474, `AUSENTE`): un equipo con voto negativo y sin fuerza para pagar el
   cierre puede gastar su cupo `fuga` en un hombre con la **orden de no relevar**. Efecto: el
   movimiento nace con `coop ×= infiltratorCoopDamp` y **el voto de los demás baja** al ver quién va
   dentro (entra en `wRepresentacion` con signo negativo para los otros).
6. **R03.6 — el veto del maillot se queda** (S-118, `CUBIERTO`) y **la segunda mitad de S-086**: el
   equipo con su carta delante no se retira del frente, **lo ocupa a ritmo bajo** (pide cupo `frente`
   con `intent = 'controlar'` y compromiso `slowFrontCommit`), que es lo que hoy no hace.
7. **R03.7 — la segunda fuga del día** (S-116, `CONTRARIO`): tras una captura, `cuerda` se recalcula y
   normalmente sale positiva (los que votaban cerrar ya tienen lo suyo o están gastados), así que la
   ventana del contraataque se abre sola. No hace falta regla especial; hace falta **quitar el freno**
   (S-487, R19).

**Cierra.** `S-064`, `S-066`, `S-076`, `S-083`, `S-086`, `S-087`, `S-088`, `S-090`, `S-091`, `S-095`,
`S-114`, `S-115`, `S-116`, `S-117`, `S-118`, `S-119`, `S-120`, `S-121`, `S-149`, `S-425`, `S-433`,
`S-472`, `S-473`, `S-474`.

**Constantes.** `wRepresentacion` **0,35** · `wPeligro` **0,30** · `wMotivo` **0,20** · `wFuerza`
**0,15** (suman 1: es una media ponderada, no una suma libre) · `leashHysteresis` **0,12** ·
`bigBreakRiders` **10** · `w_terreno` **0,55**, `w_motivo` **0,25**, `w_ayer` **0,12**, `w_tirando`
**0,08** · `infiltratorCoopDamp` **0,65** · `slowFrontCommit` **0,55**.

**Medida.** Tres estadísticas, todas nuevas, sobre `smallTours` y los canónicos:
- `fugaMismoEquipoPct` (fugas con ≥2 de la misma casa cuando el movimiento tiene <10): **banda 0-15 %**
  (hoy: invisible para todos los bancos, `mapa-bancos.md` §7 punto 2).
- `equiposRepresentadosPct` (fracción de equipos con hombre en la fuga del día, llana): **banda 25-60 %**.
- `perfilDelFugadoEnReina` — mediana de `0,6·MON+0,4·COL` del mejor de la fuga del día en una reina
  contra la mediana del campo: **banda +6 a +18 puntos** (hoy ≈ 0 por construcción).
Y la banda existente `flat.breakawayWinPct` 5-16 y `mountain.breakawayWinPct` 25-45 se re-miden: §9.

---

### R04 · La general virtual y el colchón que depende de lo que queda · 17 situaciones

> Lleva S-391 (nº 14 de las veinte más graves): «el colchón que necesita el líder depende de lo que
> queda de carrera», hoy una constante de 700 s que decide sola a quién se persigue toda la carrera.

**Pieza.** Dos funciones puras en `stage/gc.ts`, más el campo `RaceView.board.virtual`.

**Reglas.**

1. **R04.1 — la general virtual por equipo** (S-103, S-101, S-088):
   ```
   virtualDe(r, board) = gcDeficit(r) + Σ_{f ∈ fugados conocidos} 0   # el fugado gana, no pierde
   virtualDeFugado(f)  = gcDeficit(f) − gap(board)                    # con el hueco DE LA PIZARRA
   puestosQuePierdo(e) = |{ f : virtualDeFugado(f) < gcDeficit(cartaGc(e)) }|
   peligroVirtual(e)   = clamp( puestosQuePierdo(e) / gcPuestosQueDuelen , 0, 1 )
   ```
   **Es un conteo de puestos, no un umbral de segundos**, que es exactamente lo que S-103 pide y lo que
   hoy no existe: `isThreatened` compara un solo déficit contra 420 s.
2. **R04.2 — el colchón depende del terreno que queda** (S-391, S-099). Sustituye `gcControlLeash` 700:
   ```
   recuperable(r, road) = kmSubidaRestante · gcRecoverPerClimbKm
                        + kmCronoRestante  · gcRecoverPerTtKm · cri(r)
                        + diasRestantes    · gcRecoverPerDay
   tolerancia(e) = clamp(recuperable(cartaGc(e), road), gcLeashMin, gcLeashMax)
   ```
   Consecuencia buscada: **la misma fuga a 3 min es tolerable el día 3 y letal el día 19**, con la
   misma fórmula y sin una constante por día.
3. **R04.3 — el maillot prestado y el maillot sin equipo** (S-096, S-079, S-161, los tres `CONTRARIO`):
   el equipo del maillot solo pide `frente` si su carta **sobrevive al final de hoy**:
   `finishScore(carta, finalPrevisto) ≥ jerseySurvivalScore`. Si no, no se funde: el trabajo es del
   favorito real. Y si el maillot es agente libre, **releva él** (`relayRaceLeaderPenalty` no se aplica
   sin equipo).
4. **R04.4 — traspaso del maillot en carretera** (S-294, `AUSENTE`): cuando `virtualDeFugado(f) < 0`
   durante `virtualLeaderKm`, el equipo de `f` cambia de intent a `controlar` y los demás le atacan a
   él. Se resuelve solo con R04.1 + el arbitraje de §2.6, sin regla nueva: es un cambio de motivo.
5. **R04.5 — reconocer al hombre de la general** (S-048): la carta de general de un equipo no es
   `gcRank ≤ 5`, es `argmax(finishScore(m, 'alto') · gcViabilidad(m))` con
   `gcViabilidad = clamp(1 − gcDeficit / recuperable, 0, 1)`. Un hombre 12.º a 2 min con dos reinas por
   delante sigue siendo la carta; el mismo a 12 min no.
6. **R04.6 — «tira tú, que es tu problema»** (S-102, S-104, S-239): el reparto de la caza sale de
   `peligroVirtual` por equipo. Si solo un equipo tiene peligro > 0, tira solo; si tres lo tienen,
   pujan por `frente` y se turnan (R20). Y si el equipo del maillot está fundido
   (`spentFraction ≥ 1`), los amenazados se alían (R20.4) o el maillot cambia de manos.

**Cierra.** `S-048`, `S-078`, `S-079`, `S-096`, `S-097`, `S-098`, `S-099`, `S-100`, `S-101`, `S-102`,
`S-103`, `S-104`, `S-181`, `S-239`, `S-258`, `S-294`, `S-391`.

**Constantes.** `gcPuestosQueDuelen` **5** (perder cinco puestos es peligro 1) · `gcRecoverPerClimbKm`
**2,5 s/km** de subida que queda · `gcRecoverPerTtKm` **1,1 s/km** escalado por CRI ·
`gcRecoverPerDay` **20 s** · `gcLeashMin` **120 s** · `gcLeashMax` **900 s** ·
`jerseySurvivalScore` **55** · `virtualLeaderKm` **3**. Las tres tasas de recuperación: calibrar con
banco contra la brecha 1.º-10.º medida (`mountain.top10GapSeconds` 40-300).

**Medida.** Banco `grandTour` (ya corre 12 vueltas de 21 etapas). Estadísticas nuevas:
`cuerdaMediaPorDia` (mediana del hueco tolerado, por día de la vuelta) — **la banda es una forma, no
un número**: se exige que la mediana del día 19 sea **menor que la del día 3 en al menos un 30 %**.
Y `cambiosDeLiderPorVuelta`, **banda 1-5** (hoy sin medir: `mapa-bancos.md` §7 punto 15).

---

### R05 · Motivos secundarios como claim de equipo · 24 situaciones

> `CONTRARIO 2` · `AUSENTE 19` · `PARCIAL 3`. Lleva S-162, nº 13 de las veinte más graves: «sin
> motivos secundarios, dos tercios del pelotón no tienen ninguna razón para correr».

**Pieza.** El vocabulario de motivos, que hoy tiene tres valores (`etapa`, `maillot`, `general`) y pasa
a tener nueve, con su derecho al frente, su cupo de fuga y su efecto en la utilidad.

```ts
type Motive =
  | 'etapa' | 'maillot' | 'general'                      // los tres de hoy
  | 'puntos' | 'montaña' | 'joven' | 'equipos'           // clasificaciones (S-016..S-019)
  | 'combatividad'                                        // la tele y el dorsal rojo (S-044)
  | 'patrocinador'                                        // el invitado que se juega volver (S-066)

interface MotiveClaim {
  motive: Motive
  /** A quién sirve. */
  riderId: string
  /** Derecho al frente [0..4]: entra en la puja de R20. */
  front: number
  /** Cuántos hombres puede mandar a la fuga por este motivo. */
  breakQuota: number
  /** Qué pancartas obliga a disputar. */
  banners: ('volante' | 'cima')[]
}
```

**Reglas.**

1. **R05.1 — tabla de derechos** (el corazón del racimo). Un equipo declara sus motivos en la
   estructura (§5) y los ordena; **manda el de más derecho y el secundario se apaña** (S-020, literal:
   «con varios motivos el equipo los ordena, no los suma»).

   | Motivo         | `front` | `breakQuota` | Banners             | Efecto propio                                                  |
   | -------------- | ------: | -----------: | ------------------- | -------------------------------------------------------------- |
   | `maillot`      |       4 |            0 | —                   | veto de fuga a la carta; `relevar` = 0 para ella               |
   | `etapa`        |       3 |            1 | —                   | `lanzar` en los últimos 15 km                                  |
   | `general`      |       3 |            1 | —                   | solo si `peligroVirtual > 0` (R04.6)                            |
   | `puntos`       |       2 |            1 | volante             | tira 40 km antes de la volante y **afloja 500 m después**       |
   | `montaña`      |       1 |            2 | cima                | mete hombres en los intentos hasta que uno cuaja; no persigue   |
   | `joven`        |       2 |            0 | —                   | como `general` pero contra el otro joven, no contra el maillot  |
   | `equipos`      |       1 |            0 | —                   | no deja caer al tercer hombre; tres arriba en montaña           |
   | `combatividad` |       0 |            1 | —                   | `atacar` ×1,6; se sienta cuando ya lleva `combativeKm` fuera    |
   | `patrocinador` |       0 |            1 | —                   | uno cada día pase lo que pase; afloja el día después            |

2. **R05.2 — el motivo entra en la utilidad por el valor, no por un factor suelto** (§2.7): el valor de
   `disputar` una volante para el equipo del verde es `pointsAtStake / pointsToLead`, no una constante.
   Eso hace que S-105 («caza la fuga ANTES de la pancarta y luego le da cuerda») salga sola: el valor
   colapsa a cero 500 m después de la pancarta y el voto de R03 cambia de signo.
3. **R05.3 — el líder de una clasificación no sale a por otra** (S-015, `CONTRARIO`): un motivo
   `maillot` bloquea `disputar` para su carta. Hoy `autoOrders` le pone `contestClimbs = mountain` al
   maillot amarillo, que es la fila.
4. **R05.4 — marcar al rival de MI clasificación** (S-136, S-272, S-043, S-108): la utilidad de `marcar`
   se calcula contra `standings[motivo]`, no contra la general. «Se marca al rival de la clasificación,
   no al mejor sprinter del pelotón».
5. **R05.5 — el motivo se pierde y se gana** (S-396, S-395, S-483): si un equipo cae de la clasificación
   por equipos (menos de tres hombres), el motivo desaparece esa noche y sus hombres quedan libres. Si
   un cazaetapas hereda el maillot, su equipo gana `maillot` y pierde `combatividad`.
6. **R05.6 — el maillot que obliga** (S-452): arcoíris y campeón nacional dan un motivo
   `patrocinador` de oficio y **restan cuerda** en el voto de R03 (`−jerseyLeashPenalty`).

**Cierra.** `S-015`, `S-016`, `S-017`, `S-018`, `S-019`, `S-020`, `S-031`, `S-034`, `S-041`, `S-042`,
`S-043`, `S-044`, `S-045`, `S-065`, `S-105`, `S-108`, `S-162`, `S-271`, `S-272`, `S-383`, `S-396`,
`S-407`, `S-447`, `S-452`.

**Constantes.** La tabla de R05.1 entera (nueve filas × tres números) es la constante nueva:
`MOTIVE_RIGHTS`. Más `combativeKm` **60** · `jerseyLeashPenalty` **0,15** · `pointsBeforeBannerKm`
**40** · `pointsAfterBannerKm` **0,5**.

**Medida.** Banco `smallTours` (10 carreras enteras, ya corre 8 corridas). Estadísticas nuevas:
- `maillotsSecundariosDisputadosPct` — fracción de carreras en las que el maillot de montaña y el de
  puntos cambian de manos al menos una vez: **banda 60-100 %** (hoy: 0 por construcción, no existen).
- `motivoDelFrentePct` por motivo — el reparto de `pullFor` entre los nueve. **Banda: ninguna aún**;
  se publica una temporada y se ancla después. Es honesto decirlo: no hay dato de carretera para
  fijarla hoy, y una banda inventada no vigila.
- `puntosDelVerdeEnVolantesPct` — fracción de los puntos de volante que se lleva el líder de la
  regularidad: **banda 25-60 %.**

---

### R06 · Las pancartas: volante y cima como puntos del recorrido · 20 situaciones

**Pieza.** La pancarta pasa de ser un evento de meta a ser **un punto del trazado con aproximación**:
entra en `RoadView` (§3.5) y genera su propia mini-fase (R19).

**Reglas.**

1. **R06.1 — la pancarta es un punto, no un porcentaje** (S-033): toda etapa en línea de una vuelta
   lleva al menos una volante; su valor sale de dónde cae (`antes del pie del puerto`, `a 30 km`,
   `donde ya no se disputa`), no de un porcentaje del recorrido.
2. **R06.2 — quién la disputa** (S-137, S-153, S-141, los tres `CONTRARIO`):
   ```
   contendientes(pancarta, grupo) = { r : utilidad(disputar, r) > bannerFloor }
   utilidad(disputar, r) = valorPancarta(r) × probabilidad(r gana entre los interesados) − bannerCost
   valorPancarta(r) = motivo(r) contiene la clasificación ? ptsEnJuego / ptsAlLider : bonusValue(r)
   ```
   **Solo pagan los contendientes.** Hoy `disputeClimb` «ordena y cobra a todos los del grupo sin
   mirar `contestClimbs`» (S-031, `CONTRARIO`, nº 8 de las veinte más graves). Y el pelotón también
   esprinta la volante por lo que dejan los fugados (S-153), mirando cuántos van delante.
3. **R06.3 — el acelerón y su estela** (S-212, S-236, S-124): en los `bannerApproachKm` previos el
   compromiso del grupo sube a `max(compromiso, bannerApproachCommit)` y la pelea por la banda 1 se
   abre (`colocar`); `bannerReliefKm` después, el compromiso cae a `bannerReliefCommit` — **que es la
   ventana del contraataque** (R19).
4. **R06.4 — el que corona y se deja coger** (S-080, S-138): cobrada la última pancarta que sirve a su
   motivo, la utilidad de `relevar` del fugado cae a `postBannerRelayDamp` y la de `dosificar` sube. Es
   una consecuencia de R05.2 (el valor colapsa), no una regla nueva.
5. **R06.5 — puntúan los N primeros por categoría, vengan del grupo que vengan** (S-220, `CUBIERTO`) y
   **con las piernas de ahora** (S-142, `CUBIERTO`). Se conserva tal cual.
6. **R06.6 — la acumulada existe** (S-221, S-035): `standings` en `SelfView` (§3.1) y en la crónica.

**Cierra.** `S-033`, `S-035`, `S-080`, `S-109`, `S-124`, `S-136`, `S-137`, `S-138`, `S-140`, `S-141`,
`S-142`, `S-153`, `S-196`, `S-212`, `S-220`, `S-221`, `S-236`, `S-315`, `S-336`, `S-373`.

**Constantes.** `bannerFloor` **0,08** · `bannerApproachKm` **3** (volante) / **2,5** (cima:
S-124 dice «dos km antes la fuga se estira») · `bannerApproachCommit` **0,80** · `bannerReliefKm`
**1,5** · `bannerReliefCommit` **0,45** · `postBannerRelayDamp` **0,2** · `climbValueByCategory`
{HC 1,0 · 1: 0,7 · 2: 0,45 · 3: 0,25 · 4: 0,10} — **es S-140 entero**: «nadie se destroza por un cat4;
por un HC con el maillot en juego se corre desde 10 km antes de la cima».

**Medida.** Banco `pancartas` nuevo (§7.3), sobre una vuelta pequeña real con volantes y cimas.
`contendientesPorPancarta` **banda 3-15** (S-137 literal: «esprintan entre tres y quince»);
`costePagadoPorNoContendientes` **banda 0** (invariante duro, no banda);
`aceleronAntesDeCima` — diferencia de km/h media en los 2 km previos a un HC contra los 2 anteriores:
**banda +1,5 a +5 km/h**.

---

### R07 · Bonificaciones · 6 situaciones

**Pieza.** Los segundos de pancarta (que no existen) y **el número visible** para quien decide si se
mete en el sprint. Los de meta ya están: se reparten 10/6/4 y se restan en los tres acumuladores.

**Reglas.**

1. **R07.1 — bonificación de pancarta** (S-193): `RoadView.proximaCima/Volante.bonif`; si la carrera la
   define, `valorPancarta` de R06.2 pasa a mezclar puntos y segundos, y **los disputan los favoritos y
   sus equipos, no los sprinters**, porque el valor sale del motivo.
2. **R07.2 — el número visible** (S-334, `AUSENTE`): `SelfView.bonusAlcance` = segundos que puedo
   quitarle al que tengo delante en la general si remato entre los tres primeros. Entra en el valor de
   `rematar`:
   ```
   valor(rematar, r) += bonusWeight · (bonusAlcance / max(1, gapAlDeDelante))
   ```
   Consecuencia buscada: **el 2.º se mete en el sprint por los 10 s y el maillot se mete a taparle**
   (S-334, S-353), que es cómo se decide una vuelta llana.
3. **R07.3 — el que ya la tiene hecha no la disputa** (S-335, S-352): con la general resuelta
   (`gapAlSegundo > bonusIrrelevantS`) el valor de R07.2 se anula; pero **el sprinter-maillot sigue
   siendo sprinter** (S-352, `CONTRARIO`): el veto de `relevar` del maillot no toca `rematar` ni el
   cupo `carta`. Hoy sí lo toca, por vía de `finishRoleWeight` y del apetito.

**Cierra.** `S-193`, `S-334`, `S-335`, `S-352`, `S-353`, `S-360`.

**Constantes.** `bonusWeight` **0,45** · `bonusIrrelevantS` **90** (tres días de bonificaciones
completas: 3×10 s no cambian nada por encima de eso; calibrar con banco).

**Medida.** Banco `smallTours`, sobre las vueltas llanas del banco (Arabia, Almería).
`vueltasDecididasPorBonificacionPct` — fracción de vueltas sin crono ni montaña en las que el ganador
final no es el ganador por tiempo bruto: **banda 15-45 %** (calibrar con banco; la referencia de
carretera son las vueltas de solo llano, donde es la norma).

---

### R08 · El depósito que persiste entre etapas · 16 situaciones

**Pieza.** Estado físico multi-etapa leído por el director al planificar. La mitad de abajo ya existe
(`stageRun.ts:246-255` calcula `deepDepletedYesterday` y resta un cerillo, S-378 `CUBIERTO`); lo que
falta es que **alguien lo lea para decidir** y que la recuperación no sea igual para todos.

**Reglas.**

1. **R08.1 — el parte del día anterior entra en la estructura** (S-398, S-399, S-410, S-389): la
   `idoneidad` de todos los cupos (§2.6) pondera por `frescuraDeCarrera(r)`:
   ```
   frescuraDeCarrera(r) = clamp( 1 − (kmAlFrenteAyer/frontKmSaturation) − (fugaAyerKm/breakKmSaturation)
                                 − depletionAyer·carryDepletion , 0, 1 )
   ```
   Consecuencia: el equipo que ayer tiró 120 km hoy pone a otros dos, o el frente cambia de manos
   (S-398, S-399 literales). **Sin regla nueva de conducta: sale del arbitraje.**
2. **R08.2 — recuperar no es igual para todos** (S-482, `AUSENTE`): la tasa de recuperación entre
   etapas escala con edad y con REC. Este documento **no la implementa**: es aguas arriba del
   `StageRider` y por tanto del diseño de entrenamiento (`kAge`, `REC`). Lo que aporta aquí es el
   **consumidor**: `frescuraDeCarrera` la lee. Anotado en §10, decisión 12.
3. **R08.3 — el tocado y el enfermo duran días** (S-380, S-381, S-411, S-144, S-450): `hurt` deja de
   ser una bandera de etapa y pasa a `riders.condition = { tipo, desde, gravedad }` que dura entre
   1 y `conditionMaxDays` días. Conducta: el tocado rueda protegido (`arropar` recibido), no entra al
   turno (`relevar` = 0), no arriesga en el descenso, se descuelga antes. Y la decisión de bajarse
   **no es solo suya**: el árbitro de equipo puede retirarlo (`retirada por orden`, S-450) o pedirle
   que acabe dentro del corte.
4. **R08.4 — la tercera semana** (S-377, `CUBIERTO`) se conserva; lo que se añade es que el director
   la lee: en la semana 3 la estructura se puede revisar (§5.6).
5. **R08.5 — dos sectores** (S-431) y **el que llega sin ritmo** (S-468): fuera de alcance de la v1.
   Anotados en §10, decisión 14.

**Cierra.** `S-144`, `S-377`, `S-378`, `S-379`, `S-380`, `S-381`, `S-385`, `S-389`, `S-398`, `S-399`,
`S-410`, `S-411`, `S-431`, `S-450`, `S-468`, `S-482`.

**Constantes.** `frontKmSaturation` **90 km** · `breakKmSaturation` **120 km** · `carryDepletion`
**0,35** · `conditionMaxDays` **6**.

**Medida.** Banco `grandTour`. `frenteRepetidoPorEquipoPct` — fracción de días consecutivos en que el
mismo equipo lleva el frente: **banda 0-35 %** (hoy no se mide; el catálogo dice que al cuarto o quinto
día el equipo del maillot ya no llega). Y `abandonPct` 12-20 se re-mide (§9).

---

### R09 · Las deudas y el humor del pelotón · 21 situaciones

> `CONTRARIO 1` · `AUSENTE 14` · `PARCIAL 6`. El humor es hoy **un dado por etapa**
> (`pelotonMoodCentre` 0,9, `pelotonMoodSpread` 0,14), que es exactamente lo que S-224 reclama.

**Pieza.** Una tabla `race_memory` por carrera con lo de ayer, y el humor como **consecuencia con
causa** en vez de dado.

```ts
interface RaceMemory {                          // se persiste por carrera, no por etapa
  ganadoresPorEquipo: Map<string, number>
  fugadosAyer: string[]
  frenteAyer: Map<string, number>               // km al frente por equipo
  deudas: Map<string, Map<string, number>>      // riderId → riderId → [-3,+3]
  rivalidades: [string, string][]               // pares de equipos que no colaboran (S-404)
  ultimaEtapa: { dureza: number; descanso: boolean; trasladoH: number }
}
```

**Reglas.**

1. **R09.1 — el humor tiene causa** (S-224, S-234, S-422, S-424, S-427, S-484). Sustituye el dado:
   ```
   humor = clamp( moodBase
                − moodAfterQueen   · (ayer fue reina ? 1 : 0)
                − moodBeforeQueen  · (mañana es reina ? 1 : 0)
                − moodTransfer     · clamp(trasladoH / 3, 0, 1)
                + moodAfterRest    · (ayer fue descanso ? 1 : 0)
                − moodNoMotive     · (equiposConMotivo == 0 ? 1 : 0)
                − moodHeat         · calor
                , moodMin, moodMax )
   ```
   **Sin dado.** El humor pasa a ser explicable en la crónica, que es la mitad de lo que R23 pide.
2. **R09.2 — la deuda del relevo** (S-081, S-413, S-453, S-122): quien no relevó ayer teniendo deber
   acumula deuda con los que sí; hoy la utilidad de `relevar` de los acreedores baja frente a él y su
   `pactar` se rechaza. Rango [−3, +3], decae `debtDecayPerDay` por día.
3. **R09.3 — la aduana tiene memoria** (S-423, S-425, S-106, S-076, S-408): el voto de R03 lleva un
   sumando de memoria: `−memoryLeash · ganóAyer(r) − memoryLeash·0,6 · fugóAyer(r)`; y el equipo al que
   una fuga le robó la etapa ayer vota cerrar hoy desde el km 0. **Descuento fuerte, no veto** (la
   propia S-423 lo dice).
4. **R09.4 — la desesperación escala** (S-397, S-402): `breakQuota` del motivo `combatividad` sube de 1
   a 2 cuando el equipo lleva `desperationDays` sin resultado; y el que ya ganó su etapa baja a 0.
5. **R09.5 — la rivalidad estructural** (S-404, S-401): dos equipos marcados como rivales no se
   conceden `pactar` nunca, y `relevar` con el otro al frente cuesta un `rivalRelayDamp`.
6. **R09.6 — el pacto de no agresión** (S-426, S-224): `pactar` con alcance `tregua` puede nacer del
   capitán de ruta (R24) tras dos días durísimos; mientras dura, la cuerda de R03 es positiva por
   defecto y la fuga sale a la primera.

**Cierra.** `S-046`, `S-081`, `S-106`, `S-224`, `S-229`, `S-234`, `S-354`, `S-397`, `S-401`, `S-402`,
`S-403`, `S-404`, `S-408`, `S-413`, `S-422`, `S-423`, `S-424`, `S-426`, `S-427`, `S-453`, `S-484`.

**Constantes.** `moodBase` **0,92** · `moodAfterQueen` **0,10** · `moodBeforeQueen` **0,06** ·
`moodTransfer` **0,05** · `moodAfterRest` **0,04** · `moodNoMotive` **0,08** · `moodHeat` **0,06** ·
`moodMin` **0,68**, `moodMax` **1,02** (la envolvente de hoy es 0,9 ± 0,14 ≈ [0,76 · 1,04]: se
respeta el rango y se cambia la causa) · `debtDecayPerDay` **0,5** · `memoryLeash` **0,18** ·
`desperationDays` **6** · `rivalRelayDamp` **0,5**.

**Medida.** Banco `grandTour`. `humorPorCausaPct` — reparto de las causas del humor bajo, publicado sin
banda la primera temporada. E invariante nuevo, **duro**: `humorSinCausa = 0` (ninguna etapa con humor
fuera de `moodBase ± 0,02` sin al menos una causa registrada). Y `varianzaDelHumorEntreSemillas`
**banda 0** — el humor deja de depender de la semilla, que es el punto.

---

### R10 · El plan de varios días · 12 situaciones

**Pieza.** `RaceObjective` por equipo y por corredor, y el presupuesto repartido por etapas.

```ts
interface RaceObjective {
  target: Motive                                  // a qué va este equipo a esta carrera
  markedDays: number[]                            // las etapas marcadas ← S-405
  budget: number[]                                // presupuesto por etapa, suma = teamBudgetPerRider·n·dias
}
```

**Reglas.**

1. **R10.1 — el presupuesto no es constante por hombre** (S-055, S-405, S-427): hoy es
   `teamBudgetPerRider (9) × leales`, igual todos los días. Pasa a repartirse:
   ```
   budget[d] = base · ( 1 + dayMarkedGain·marcado(d) − dayEveGain·visperaDeMarcado(d) − dayAfterGain·despues(d) )
   ```
   normalizado para que la suma no cambie. Consecuencia: **el equipo se esconde los días anteriores
   para poder gastar el suyo** (S-405 literal) y la víspera de la reina la cuerda es larguísima
   (S-427).
2. **R10.2 — la crono dentro del plan** (S-382, S-386, S-387, S-394): con crono en el calendario, el
   objetivo `general` de un mal cronista añade `markedDays` en las etapas de montaña **anteriores** a
   la crono (S-394: «el escalador que perderá 1:30 ataca hoy de lejos»), y el buen cronista marca
   menos días. Es una regla de la convocatoria (§5), no de carretera.
3. **R10.3 — el día después de perder tiempo** (S-376, `CONTRARIO`): un corredor que perdió >
   `setbackSeconds` ayer cambia de objetivo: su equipo le concede `breakQuota` extra y su
   `utilidad(atacar)` sube `setbackAttackGain` durante `setbackDays`.
4. **R10.4 — el jefe se rompe** (S-409, S-392, S-390): revisión de estructura (§5.6).
5. **R10.5 — la moral** (S-384): entra como un factor sobre `inclinación` de todas las intenciones,
   `moralFactor = 0,9 + 0,2·(moral/100)`. La moral ya existe en el mundo; hoy no llega al motor.

**Cierra.** `S-022`, `S-028`, `S-055`, `S-376`, `S-382`, `S-384`, `S-386`, `S-387`, `S-394`, `S-405`,
`S-409`, `S-420`.

**Constantes.** `dayMarkedGain` **0,45** · `dayEveGain` **0,20** · `dayAfterGain` **0,15** ·
`setbackSeconds` **120** · `setbackAttackGain` **1,5** · `setbackDays` **3**.

**Medida.** Banco `smallTours` + `grandTour`. `gastoEnDiaMarcadoVsMedia` — razón entre el gasto del
equipo en su día marcado y su media: **banda 1,4-2,5**. `ataquesTrasPerderTiempo` — ataques por
corredor y etapa de los que cedieron > 2 min el día anterior contra la media: **banda 1,3-3,0** (hoy
es 1,0 por construcción, y esa es la fila `CONTRARIO` S-376).

---

### R11 · Percances mecánicos y el coche de equipo · 10 situaciones

> `AUSENTE 10`. **El racimo entero no existe.** Lleva S-222 (nº 18 de las veinte más graves), que
> bloquea el precio de cualquier percance.

**Pieza.** Dos cosas: el pinchazo/avería como suceso de primera clase, y **la caravana ordenada**.

```ts
interface Mishap {                        // suceso, no bandera
  kind: 'pinchazo' | 'averia' | 'caida'
  riderId: string
  km: number
  /** Segundos parado. Depende del coche (abajo). */
  stopS: number
  /** Grupo del que se cayó y al que vuelve. */
  fromGroupId: string
}

interface Caravan {
  /** Orden de los coches. Cambia cada día: el del líder delante, el modesto el vigésimo. */
  order: string[]                          // teamId[]
  /** Dónde está la caravana ahora: detrás de qué grupo. */
  behindGroupId: string
  /** Si la carrera se parte, los comisarios REORDENAN: suben los que tienen hombre delante. */
  split: boolean
}
```

**Reglas.**

1. **R11.1 — el pinchazo existe** (S-192, S-111, S-146, S-283, S-298): λ por bloque, escalado por
   terreno y lluvia:
   ```
   λ_pinchazo = flatFlatPuncturePerKm · (1 + pavePunctureGain·estrellas + dirtPunctureGain·tierra)
                                       · (1 + rainPunctureGain·lluvia)
   ```
   Avería: `λ_averia = mechFailurePerKm`, y **cuesta el doble** (S-146).
2. **R11.2 — el coche tarda lo que tarda** (S-222): `stopS = carBaseS + carPerPositionS · posEnCaravana(equipo)
   + carGroupPenaltyS · (¿está el coche detrás de mi grupo?)`. Con la caravana partida y sin hombre
   delante: `carNeutralS` (asistencia neutra, más lenta y con rueda que encaja peor).
   **Esto le da precio a colar un hombre en la fuga** (S-084, S-093): compra coche, ruedas y bidones.
3. **R11.3 — el ascensor de los coches** (S-435): tras el percance, el corredor vuelve a rebufo de la
   caravana ganando `caravanClosePerKm` s/km **mientras haya caravana**. En cabeza de carrera, en un
   puerto estrecho o con la carrera partida, no hay coches: el mismo percance cuesta minutos.
4. **R11.4 — la bici del gregario** (S-201): el sacrificio es la bici entera y solo vale con la misma
   talla; el que la cede queda fuera de hecho hasta que llega el coche. Cupo `rescate`.
5. **R11.5 — dónde NO existe** (S-201, S-202, S-374): en la crono no hay compañero; dentro de los
   últimos 3 km no salva nada porque el tiempo ya está dado.

**Cierra.** `S-111`, `S-127`, `S-146`, `S-192`, `S-201`, `S-202`, `S-222`, `S-283`, `S-298`, `S-435`.

**Constantes.** `flatPuncturePerKm` **0,00012** (≈ 1 pinchazo cada 8.300 km-corredor: sobre 176×180 km
son ≈ 3,8 por etapa) · `pavePunctureGain` **2,5/estrella** · `dirtPunctureGain` **3,0** ·
`rainPunctureGain` **0,6** · `mechFailurePerKm` **0,00003** · `carBaseS` **22** ·
`carPerPositionS` **1,6** (20 coches → 32 s entre el primero y el último: los «treinta segundos de
diferencia sistemáticos» de S-222) · `carGroupPenaltyS` **45** · `carNeutralS` **75** ·
`caravanClosePerKm` **12 s/km** (S-435: «10-15 s/km»).

**Medida.** Banco `incidentes` nuevo (§7.4). `pinchazosPorEtapa` **banda 2-6** en llana, **4-12** en
pavé; `segundosPerdidosPorPinchazoMediana` **banda 25-70 s** con caravana, **90-300 s** sin ella;
`ventajaDelCocheDelLiderS` **banda 20-40 s** contra el vigésimo.

---

### R12 · Caídas: la tregua, el rescate y el tiempo · 18 situaciones

> Lleva S-478 (nº 19 de las veinte más graves): «el percance se sabe tarde».

**Pieza.** La caída ya existe (`crashCheck`, `crashPile`). Lo que falta: **la tregua como acto con
autor**, el rescate escalonado, y la noticia con retardo (§3.4, ya construida en `Blackboard.news`).

**Reglas.**

1. **R12.1 — la tregua se pide, no se dispara** (S-237, `AUSENTE`, y es la clave del racimo):
   ```
   pedirTregua(equipo del caído) requiere:  capitán de ruta vivo (R24)  ∧  fase ∉ {decisivo, desenlace}
                                            ∧  ¬abanicoAbierto  ∧  ¬onClimb-raceThisClimb
   conceder(e) = reputacion(equipo peticionario) ≥ truceReputationFloor
               ∧ ¬(e tiene motivo con front ≥ 3 y ventaja ahora)
   ```
   Negarla no es gratis (S-195): cuesta reputación y se cobra en la aduana de mañana (R09.3). Pedirla
   sin derecho —después de no haber esperado ayer— tampoco.
2. **R12.2 — la noticia llega tarde y mal** (S-478): la tregua, el rescate y la emboscada se deciden
   sobre `Blackboard.news`, con `newsLagKm` 1,5 y `newsWrongIdChance` 0,25. **A veces el que se para no
   era el que hacía falta.** Es la regla más barata del catálogo con el mayor efecto de verosimilitud,
   porque no toca la física: solo cambia qué se lee.
3. **R12.3 — el rescate escalonado** (S-290, S-145, S-288): el cupo `rescate` da hasta `n−1` hombres,
   elegidos por **frescura y perfil de rodador**, y baja el que va por delante del jefe, no el que va
   detrás. Se arregla además la puerta medida: hoy el drop-back **solo se dispara si el grupo del jefe
   es un `shed`** (`if (!suGrupo) continue`, simulate.ts:2061), así que con la carrera rota no baja
   nadie. Pasa a mirar cualquier grupo por detrás.
4. **R12.4 — el jefe puede pedirla o renunciar** (S-290, deuda §14 punto 11: «no hay “espérame”»):
   `pactar` con alcance `rescate` desde el propio jefe; y una orden del jugador puede renunciar a él.
5. **R12.5 — la emboscada** (S-195): con el maillot cortado por causa **no física** y la tregua
   negada o no pedida, los equipos de general con `peligroVirtual` invertido suben `frente` a
   `ambushCommit` durante `ambushKm`. Coste: reputación.
6. **R12.6 — los 3 km** (S-374): la regla existe; se le añade que **no aplica con meta en alto ni en
   crono** y que el jurado puede declararla a 4-5 km en finales llanos peligrosos.
7. **R12.7 — el taponamiento** (S-466): en muro estrecho, sector o carretera sin arcén, una caída
   tapona: los de banda 3-4 pierden `blockedLossS` **por su banda, no por sus piernas**.

**Cierra.** `S-110`, `S-145`, `S-156`, `S-195`, `S-198`, `S-199`, `S-200`, `S-213`, `S-237`, `S-251`,
`S-252`, `S-290`, `S-297`, `S-374`, `S-435`, `S-456`, `S-466`, `S-478`.

**Constantes.** `truceReputationFloor` **40** · `ambushCommit` **0,88** · `ambushKm` **8** ·
`blockedLossS` **30-60 s** por banda (banda 3: 30; banda 4: 60 — S-466 literal) · `rescueMaxHelpers`
**n−1** por la general, **2** por la etapa (v36/v37, se conserva).

**Medida.** Banco `incidentes`. `treguasConcedidasPct` **banda 40-80 %** (no siempre, y no nunca);
`rescatesConLaCarreraRota` — hoy **0 por la puerta del `shed`**, banda propuesta **> 0 en el 60 % de
las etapas con jefe cortado en un `mov`**; `retrasoMedioDelRescateKm` **banda 1-3 km** (la mitad de la
gracia de S-478).

---

### R13 · Fatiga y hundimiento dentro de la etapa · 14 situaciones

> `CUBIERTO 7`: es el racimo mejor construido del catálogo, y por eso aquí se toca poco.

**Pieza.** Casi nada nuevo. La moneda física entera (reserva supraumbral, cerillo en segundos, nivel
efectivo erosionado, P75 de la fracción más fuerte) **se conserva sin tocar** (S-454, S-455, S-461,
S-475, todas `CUBIERTO`). Lo que se añade es que **el hundimiento sea observable y provoque decisión**.

**Reglas.**

1. **R13.1 — huele la sangre, con nombre** (S-319, S-269, S-288): hoy el ritmo sube solo porque el que
   deriva sale del cálculo, y la propia regla se declara «ciega a la identidad del que flaquea». Ahora:
   ```
   si  ∃ rival r con señales.sufriendo ∧ amenaza(r) > bloodThreat:
       utilidad(atacar) ×= (1 + bloodAttackGain)          para los que ganan si r se hunde
       utilidad(relevar) ×= (1 + bloodRelayGain)          para sus rivales de general
   ```
   **Se dispara sobre `RivalSignals` (§3.3), no sobre el depósito real**, así que oler la sangre puede
   fallar y el jefe tocado puede esconderse. Eso cierra S-269 (`CONTRARIO`, nº 9 de las veinte más
   graves: «cuando el líder cede, sus rivales deberían atacar más, y hoy atacan menos») por la causa
   correcta y no con un factor.
2. **R13.2 — la pájara se provoca y se evita** (S-147, S-206): `avituallar` no es una intención propia,
   es un efecto del cupo `rescate` en zona de bidones: un gregario que baja al coche paga
   `bottleTripCost` y **quita `bonkRisk` a los suyos**. Sin gregario que baje, el riesgo se mantiene.
3. **R13.3 — el que se apaga sale del turno y entra otro** (S-206, S-398): consecuencia de R08.1 y del
   turno con orden (R18); no es regla nueva.
4. **R13.4 — el frío en el descenso largo** (S-148): el material es lo gestionable. `rescate` en la
   cima reparte chaquetas: el que no la coge paga `coldLossS` en la bajada; el que se para a ponérsela
   pierde la rueda; el que las reparte gasta el viaje.
5. **R13.5 — la fuga encara el puerto final** (S-467, `PARCIAL`): **no se toca con una perilla.** La
   bitácora ya midió que `breakFinaleCommit`/`breakClimbCommit` movían la canónica y las reales 8:1 y
   salieron del código (`dc489a6`, v44 §6), y el dueño cerró la ley («el problema no es la ley»). Lo
   que este diseño aporta es la causa correcta: **quién va dentro** (R03.3, `perfilDelDia`) y **cómo
   llega** (R08.1, `frescuraDeCarrera` + reserva). Si con un escalador fresco dentro la fuga sigue sin
   coronar, entonces sí es la ley, y eso es una decisión del dueño (§10, decisión 5).

**Cierra.** `S-112`, `S-147`, `S-148`, `S-206`, `S-260`, `S-269`, `S-277`, `S-288`, `S-319`, `S-454`,
`S-455`, `S-461`, `S-467`, `S-475`.

**Constantes.** `bloodThreat` **0,35** · `bloodAttackGain` **0,8** · `bloodRelayGain` **0,4** ·
`bottleTripCost` **1,2** de depósito · `bonkRiskWithBottles` **×0,35** · `coldLossS` **25 s** por
descenso largo con lluvia.

**Medida.** Banco `reina-150` y `realQueens`. `ataquesTrasSeñalDeDebilidad` — ataques en los 3 km
posteriores a que un favorito muestre `sufriendo`, contra la media: **banda 1,5-4,0** (hoy < 1,0: es
la fila `CONTRARIO`). Y `falsosPositivosDeSangrePct` — veces que se ataca a un rival que **no** estaba
sufriendo: **banda 15-40 %** (si es 0, el disimulo no está funcionando).

---

### R14 · Meteorología con previsión · 12 situaciones

**Pieza.** El parte ya existe y está cerrado (`weatherForecast`, `stagePlace()`, v42 §2-bis / v44
«RESUELTO (E5 cerrada)»). Lo que falta es **viento de cara/cola** y que las decisiones lo citen.

**Reglas.**

1. **R14.1 — viento longitudinal** (S-203, `AUSENTE`): `windAlong ∈ [−1, +1]` por etapa y por segmento
   (de cara / de cola). Entra en `targetSpeed` como una corrección de exposición —**no es física
   nueva, es un parámetro de la que ya hay**— y sobre todo entra en `feasible` de la caza: cerrar con
   viento de cara cuesta más y con viento de cola menos.
2. **R14.2 — el sprint cambia con el viento** (S-342, S-348): `sprintHoldMetres` escala por `windAlong`
   —con cola el sprint se abre a 350-400 m, con cara el primero que abre se muere—. Es la corrección
   que S-348 pide literalmente.
3. **R14.3 — la tormenta a mitad de etapa** (S-205, S-204, deuda §14 «la lluvia no va y viene»):
   `lluvia` pasa de escalar por etapa a una serie por bloque con dos tramos. Efecto en decisión: el
   equipo del maillot pone a todos delante y **lo paga mañana** (R08.1).
4. **R14.4 — el abanico se cierra** (S-324, `CONTRARIO`): `abanicoAbierto` deja de ser permanente. Se
   cierra cuando el segmento cambia de orientación respecto al viento (`RoadView.proximoTramoExpuesto`
   acaba) y los cortados vuelven según la física de reenganche. Hoy «el viento sopla todo el día», que
   es el límite anotado en `mapa-simulate-decisiones.md` D-48.
5. **R14.5 — el material del día** (S-430) y **la lotería del horario en la crono** (S-462): fuera de
   alcance de la v1. §10, decisión 14.

**Cierra.** `S-032`, `S-037`, `S-203`, `S-204`, `S-205`, `S-238`, `S-281`, `S-299`, `S-324`, `S-325`,
`S-430`, `S-462`.

**Constantes.** `windAlongSpeedGain` **0,07** (7 % de velocidad entre cara plena y cola plena, sobre la
exposición ya existente) · `windAlongSprintGain` **0,25** sobre `sprintHoldMetres` ·
`rainOnsetKmSd` **35** · `echelonCloseKm` **por segmento, del recorrido**.

**Medida.** Invariante nuevo, **duro**: con `windAlong = 0` y lluvia constante, el motor reproduce hoy
bloque a bloque. Y `abanicosQueSeCierranPct` **banda 40-90 %** (hoy 0).

---

### R15 · Colocación y posición como recurso · 25 situaciones

> El racimo más grande del catálogo. `CONTRARIO 2` · `AUSENTE 11` · `PARCIAL 12`. Lleva S-155
> (nº 5 de las veinte más graves: «el abanico es hoy un dado y no una decisión»).

**Pieza.** **La posición dentro del grupo, por bandas.** Es la decisión de diseño más cara de este
documento y la que hay que justificar mejor.

Hoy un corredor **no tiene posición**: el montón de una caída se aproxima con «una tirada contigua de
la lista» (límite anotado, simulate.ts:5390) y el corte del abanico reparte con `riderPerfil +
windPlacementTeam 25 + windPlacementLeader 12 + windPlacementLuck 10·U(−1,1)`. Trece situaciones del
catálogo cuelgan de que eso exista.

**La opción cara sería posición continua** (un índice 1..176 por corredor, con física de adelantar).
Eso es otro motor: coste O(n log n) por bloque, y el propio mapa avisa de que cobrar dos evaluaciones
más de la ley de velocidad por grupo y bloque costó **1.950 → 2.665 s de batería**. **Se propone
bandas: cuatro cuartiles.**

```ts
type Banda = 1 | 2 | 3 | 4          // 1 = las veinte primeras plazas; 4 = la cola
interface Placement { banda: Banda; desde: number /* km */ }
```

**Reglas.**

1. **R15.1 — el acordeón** (S-189, la fila que da el porqué de todo el racimo): ir atrás cuesta
   energía, y **no por el viento**:
   ```
   costeExtraPorBloque(r) = accordionCost[r.banda] · sinuosidad(bloque) · dx
   accordionCost = { 1: 0, 2: 0,015, 3: 0,045, 4: 0,090 }     // unidades de depósito por km
   ```
   Sobre 180 km de trazado medio (sinuosidad 0,5), la banda 4 paga ≈ 8 unidades más que la banda 1:
   **un cerillo largo**. Es exactamente lo que S-189 pide («el jefe llevado delante llega al pie del
   puerto con un cerillo más que el que hizo el día en la cola») y lo que le falta a S-240, S-242 y
   S-243.
2. **R15.2 — subir cuesta y tarda** (S-489, `AUSENTE`): `colocar` mueve una banda por
   `bandChangeKm`; subir cuatro hombres de la banda 4 a la 1 cuesta ≈ `4 · 3 · bandChangeKm` de
   presencia y un cerillo cada uno si se hace en menos de `bandRushKm`. **Decidir tarde no es solo
   perseguir con menos margen: es perseguir con hombres que llegan al frente ya gastados.**
3. **R15.3 — la rueda que eliges** (S-490, `AUSENTE`): en fila india (abanico, tirón final, sector) el
   corredor tiene `ruedaDeQuien`; si el de delante abre hueco, **todos los de detrás lo pagan**:
   ```
   si  hueco(ruedaDeQuien) > wheelGapReflexS:  reflejo `cerrar` con MI perfil
       si no lo sostengo → me descuelgo, y arrastro a los de mi banda hacia atrás
   ```
   Elegir rueda es parte de `colocar`: `preferirRueda(m) = perfil(m) − penalizaciónSiYaDerivó`.
4. **R15.4 — el abanico como DECISIÓN** (S-155, `CONTRARIO`, y S-457, S-460): `cortar` es una
   intención (nº 13). Un equipo con `≥ echelonMinMen` en banda 1-2 y tramo expuesto por delante puede
   pedir cupo `frente` con `intent = 'cortar'`:
   ```
   utilidad(cortar) = valorDeRomper(equipo) × P(el corte prende)
   P(prende)        = clamp( (miHombres_banda12 / cabenDelante) · vientoLateral · (1 − sinuosidad·0,4) )
   valorDeRomper    = Σ_{rivales con carta en banda ≥ 3} amenaza(rival)
   ```
   Y **quién queda dentro lo decide la banda con la que se entró**, no puntos de perfil + 25 al equipo
   del frente + suerte (S-460, la mitad que falta). `windPlacementLuck` baja de 10 a
   `windPlacementLuckNew`, y el resto lo explica la banda.
5. **R15.5 — abrir el hueco a propósito** (S-457): un corredor puede **no cerrar** el hueco de delante
   para dejar fuera a un rival concreto. Es `cortar` en versión individual; responde de ello si se
   equivoca de hombre (queda cortado él también).
6. **R15.6 — el aforo** (S-460, ya `PARCIAL` y bien): se conserva `cabenEnFila` entre
   `windEchelonRiders` 12 y `windEchelonMax` 150; se le añade **el ancho de la carretera**
   (`RoadView`), que es la mitad que falta.
7. **R15.7 — el bajador** (S-465): el equipo pone a su mejor DES delante del jefe en el descenso que
   importa; el jefe baja a su rueda y hereda `min(propio, bajador) ` en el dado de selección del
   descenso. Sin bajador se ceden 20-30 s **sin que nadie ataque**, y con lluvia el doble.
8. **R15.8 — el sector cobra piernas además de posición** (S-480, deuda §14 punto 17): el exponente de
   la traducción atributo→velocidad dentro de un sector de adoquín pasa del 0,39 del llano a
   `paveExponent`, intermedio. **Esto sí es física**, y por eso va aparte, con `ENGINE_VERSION++` y
   medición (§8, paso 8b; §9).
9. **R15.9 — la tierra no es un adoquín más** (S-463): en un sector de tierra, entrar fuera de la
   banda 1 multiplica el riesgo de percance (polvo), no se remonta por dentro y en mojado el que se
   sale no vuelve.
10. **R15.10 — el escaparate** (S-428): el corredor en año de contrato sube `inclinación` de `atacar` y
    de arriesgar en descenso; el que ya firmó con otro equipo baja la de `relevar`, `arropar` y
    `rescate` **sin desobedecer nunca de forma visible**. Su director lo sabe al repartir cupos.

**Cierra.** `S-155`, `S-160`, `S-165`, `S-189`, `S-240`, `S-241`, `S-242`, `S-243`, `S-248`, `S-252`,
`S-254`, `S-282`, `S-369`, `S-428`, `S-430`, `S-446`, `S-457`, `S-460`, `S-463`, `S-465`, `S-466`,
`S-480`, `S-481`, `S-489`, `S-490`.

**Constantes.** `accordionCost` {1: 0 · 2: 0,015 · 3: 0,045 · 4: 0,090} · `bandChangeKm` **0,8** ·
`bandRushKm` **1,5** · `echelonMinMen` **4** · `windPlacementLuckNew` **4** (de 10) ·
`paveExponent` **0,62** (entre el 0,39 del aire y el 1,0 de la gravedad; calibrar con banco) ·
`descentDrafterGain` **0,6** (cuánto del perfil del bajador hereda el jefe) · `dirtMishapGain` **2,0**
por banda por debajo de la 1.

**Medida.** Banco `colocacion` nuevo (§7.3) y `smallTours`. Estadísticas:
- `costeDeLaBanda4Pct` — depósito extra al pie del último puerto de los que hicieron el día en banda 4:
  **banda 5-12 %** (S-189: «un cerillo más»).
- `abanicosConAutorPct` — cortes con un equipo que pidió `cortar`: **banda 40-90 %** (hoy 0: es la fila
  `CONTRARIO`).
- `bandaDeLosCortadosMediana` — la banda mediana de los que quedan fuera del abanico: **banda 2,8-4,0**
  (si sale 2,5, el corte sigue siendo suerte).

---

### R16 · El tren de sprint como submotor de 15 km · 14 situaciones

> `AUSENTE 3` · `PARCIAL 11`. Hoy `elTren` sustituye la rotación **solo con `kmToGo ≤ 3`**; entre el
> km 15 y el km 3 sigue rotando el turno normal por deber (S-347, medido y anotado).

**Pieza.** El tren como **secuencia de cupos `lanzamiento` encadenados**, con ascenso cuando uno cae y
con los trenes estorbándose.

**Reglas.**

1. **R16.1 — el tren empieza a los 15 km, no a los 3** (S-351, S-347): con `kmToGo ≤ finalDriveKm` (15)
   los equipos con cupo `carta` de tipo sprint colocan (`colocar`) y encadenan lanzadores. Cada
   lanzador tiene su **relevo asignado y su punto de entrega**:
   ```
   entregaDe(lanzador_k) = sprintHoldMetres(lanzador_k) · (k == último ? 1 : trainHandoverGain)
   ```
   El último entrega a `sprintHoldMetres(sprinter)` (200-450 m), que es lo que ya calcula `finish.ts`.
2. **R16.2 — ascenso** (S-356): si un lanzador se funde, se descuelga o abandona, **el siguiente
   asciende** y la caza se recalcula sin él. Hoy el tren se queda con un hueco.
3. **R16.3 — cuántos trenes** (S-355): `trenes = |{equipos con cupo carta de sprint y ≥1 lanzamiento}|`,
   y ese número gobierna `sprintRegimeKmh` (ya existe: 51 → 63 km/h con 3 trenes).
4. **R16.4 — dos trenes por el mismo carril** (S-481, `AUSENTE`): la carretera tiene sitio para uno y
   medio. Si dos trenes están en banda 1 a la vez:
   ```
   el que va por fuera fuerza al de dentro a abrir antes:  entrega ×= (1 − trainClashPenalty)
   los dos gastan un hombre de más;  el tercero a rueda gana  trainThirdManGain  en su score
   ```
5. **R16.5 — el sprinter sin tren** (S-337, S-338): elige una rueda ajena (`colocar` con
   `ruedaDeQuien` = tren rival), la defiende y sale de ella. Pierde por colocación, no por piernas.
6. **R16.6 — el encajonado** (S-445, `PARCIAL`): `placementSd` existe como dado; se le pone **causa**:
   ```
   encajonado(r) = banda(r) ≥ 3  ∨  (ruedaDeQuien(r) es un tren que se apagó)  ∨  vallas(último giro)
   si encajonado:  score ×= boxedInPenalty     # su punta no se usa
   ```
7. **R16.7 — el último giro** (S-446, `AUSENTE`): si `RoadView` marca curva/rotonda/estrechamiento
   dentro de los últimos 1.500 m, **el sprint se decide al entrar**: los tres primeros salen con dos o
   tres cuerpos y el que entra decimoquinto no gana. Es `colocar` con un punto conocido, más
   `boxedInPenalty`.
8. **R16.8 — dos cartas y un final ambiguo** (S-291, S-185): el cupo `carta` se recalcula por grupo y
   por final real cada km (§2.6); la otra pasa a peón. Cierra la congelación de `buildTeamPlans`.

**Cierra.** `S-185`, `S-291`, `S-337`, `S-338`, `S-342`, `S-346`, `S-347`, `S-348`, `S-351`, `S-355`,
`S-356`, `S-372`, `S-445`, `S-481`.

**Constantes.** `trainHandoverGain` **1,45** (cada lanzador entrega un 45 % más lejos que el
siguiente) · `trainClashPenalty` **0,25** · `trainThirdManGain` **0,06** · `boxedInPenalty` **0,80**
(un 20 % de score: perder sin que te ganen) · `trainStartKm` = `finalDriveKm` **15**.

**Medida.** Banco `sprint` nuevo (§7.3), sobre `llana-180` con 5 equipos con tren.
`trenesReconociblesPorLlegada` **banda 2-5** (S-355 literal); `lanzadoresPorTren` **banda 1,4-3,0**;
`ganaElMejorSprinterPct` se re-mide (banda actual 30-45 en canónico, 25-60 en `smallTours`: §9);
`encajonadosPorSprint` **banda 1-6** de los 15 primeros.

---

### R17 · El tipo de final se calcula por grupo · 16 situaciones

**Pieza.** Ya existe (`finishType(terrain, groupSize)`, S-370 `CUBIERTO`). Lo que falta: **que la carta
y los papeles salgan del final REAL y se recalculen** (S-049, `CONTRARIO`, nº 4 de las veinte más
graves junto a S-047), y las conductas del último kilómetro por tipo.

**Reglas.**

1. **R17.1 — la carta sale del final previsto, no del `kind`** (S-049, S-052, S-047): el cupo `carta`
   se concede por `finishScore(m, finalPrevisto(grupo))`, donde `finalPrevisto` viene de `RoadView` y
   se recalcula **por grupo y por km**, no por etapa. `autoOrders` deja de decidir por
   `kind: 'llana'|'media'|'reina'` (que ni siquiera es el perfil).
2. **R17.2 — quién abre y a cuántos metros** (S-339, `PARCIAL` con el orden invertido): hoy abre antes
   el más rápido. Debe ser al revés:
   ```
   metrosDeApertura(r) = sprintHoldMetres(r) · (1 + openEarlyGain · (1 − rankDeRemate(r)))
   ```
   El que peor remata abre desde 400-500 m; el rápido aguanta hasta 150-200.
3. **R17.3 — conductas por tipo** (S-327, S-328, S-330, S-340, S-367, S-274, S-278):

   | Tipo              | Quién gana                     | Regla propia                                                           |
   | ----------------- | ------------------------------ | ---------------------------------------------------------------------- |
   | `sprint_masivo`   | SPR erosionado + tren + banda  | R16 entero                                                             |
   | `sprint_reducido` | SPR + TAC + cómo llegó         | R17.2; sin trenes el grupo se frena (`reducedSlowdown`)                |
   | `puncheur`        | COL + SPR                      | el que no remata ataca en la cota **anterior**, a 15-25 km (S-330)     |
   | `alto`            | MON + RES                      | el último gregario se aparta a 2-3 km; 1-3 ataques en los últimos 2 km |
   | `pave`            | PAV + banda                    | R15.8, R15.9                                                           |
   | `descenso`        | DES + TAC                      | `descentSelectKm` deja de ser 1 km (S-280)                             |
   | `solitario`       | RES + LLA                      | S-333: se vacía con el mismo compromiso que el pelotón en tirón final  |

4. **R17.4 — el grupo de cabeza de una reina llega con 5-15** (S-367, y es la DEUDA sin banda del
   banco): **no se compra con una perilla.** Sale de R13 (la reserva mantiene al corredor clavado) más
   R02 (los compañeros no se sueltan entre sí) más R17.3 `alto`. Se convierte la deuda en banda: §9.
5. **R17.5 — el mano a mano** (S-340) y **la llegada del solitario** (S-360, `CUBIERTO`) se conservan.

**Cierra.** `S-049`, `S-274`, `S-278`, `S-316`, `S-327`, `S-328`, `S-330`, `S-331`, `S-339`, `S-340`,
`S-341`, `S-367`, `S-370`, `S-445`, `S-446`, `S-480`.

**Constantes.** `openEarlyGain` **0,9** (el peor rematador abre ~90 % más lejos) · `reducedSlowdown`
**0,82** · `descentSelectKmNew` **por longitud del descenso, no 1**.

**Medida.** `medianLeadGroupRiders` deja de ser DEUDA impresa y pasa a **banda 3-12** en `smallTours` y
`realQueens` (§9, y es decisión del dueño: §10, decisión 6). `abreElPeorRematadorPct` **banda 55-85 %**
(hoy invertido).

---

### R18 · La colaboración que se rompe · 21 situaciones

**Pieza.** El turno con **duración y orden** (S-492, `AUSENTE`) montado sobre el listón de deber que ya
existe (S-477, `CUBIERTO`: listón, techo de veinte, suelo de uno a cuatro), más el compromiso
reevaluable de §2.

**Reglas.**

1. **R18.1 — el turno es un turno** (S-492, literal: hoy `relayTurn` se rehace desde cero cada 100 m,
   sin memoria, sin relevo hacia atrás y sin duración):
   ```
   turno = { orden: [ids], alFrente: id, desdeKm }
   si  km − desdeKm ≥ pullDurationKm(grupo):
       el de cabeza se aparta → va al FINAL de `orden`;  entra el siguiente
   `relevar` no está disponible para quien acaba de apartarse hasta que la rueda gira entera
   pullDurationKm(g) = clamp( pullBaseKm · (g.size / relayPaceReference), pullMinKm, pullMaxKm )
   ```
2. **R18.2 — el compromiso del grupo se reevalúa, no se hereda** (S-264, S-301, S-302, `CONTRARIO` /
   `PARCIAL`): `moveCooperation` deja de fijar `restCommit` al nacer y pasa a recalcularse cada km
   sobre **el margen contra los perseguidores**, no sobre el kilometraje a meta:
   ```
   coop = clamp( coopBase − coopSize·(size−3) + coopHunger·(1 − meanFinishRank)
                 − coopMargin·clamp(1 − margenS / margenNecesarioS, 0, 1) , coopMin, coopMax )
   ```
   Con eso la **pareja releva hasta la flamme rouge** (S-301) y el trío se rompe antes (S-302), que es
   lo que hoy sale al revés porque el disparador es el km a meta.
3. **R18.3 — el que se guarda es el MEJOR rematador** (S-253, S-363, S-366, la corrección anotada):
   ```
   utilidad(relevar, r) ×= (1 − selfishGain · rankDeRemate(r))
   ```
   Hoy el que se guarda es el que no puede ganar, que es exactamente al revés. Y **los que han tirado
   bajan el ritmo para que no gane el pasajero** (S-366): `coop` cae si el mejor rematador no releva.
4. **R18.4 — el turno se reparte por equipos** (S-210, `PARCIAL`, con cita: «si hay 4 equipos
   colaborando, 5 de cada uno»): el techo de 20 se reparte por cupo de equipo, no por deber
   individual: `cupoTurno(e) = ceil(relayRotationMax / equiposQueColaboran)`; el que se queda sin
   relevos cede el frente entero.
5. **R18.5 — la alianza dentro de la fuga** (S-082, S-453, `AUSENTE`): `pactar` con alcance `trato`
   entre dos de la fuga: uno cede la etapa a cambio de la volante o de la cima; dos acuerdan no
   atacarse hasta el último puerto. Romperlo cuesta deuda (R09.2) hoy y en la aduana de mañana.
6. **R18.6 — el peaje del recién llegado** (S-209): al fusionarse dos grupos, los del grupo de atrás
   entran al turno con `mergeToll` km de retraso —**hacen la cabeza los primeros kilómetros**— y el
   compromiso deja de heredarse como `max` de los dos y pasa a ser la media ponderada por tamaño. Ese
   `max` es lo que hoy hace que un grupo que absorbe a otro salga más rápido de lo que le toca.
7. **R18.7 — la tensión se conserva** (S-491, `CUBIERTO`): 0,4 puntos/km, umbral 25 (≈ 62 km fuera),
   ×3 en λ, ×0,7 en cooperación, promedio al fusionar. **No se toca**: es mecánica medida.
8. **R18.8 — el grupo sin equipos** (S-235): con agentes libres el listón del pelotón (1,5) los deja
   siempre fuera; pasa a `relayDutyThresholdNoTeams` por corredor, no por campo.

**Cierra.** `S-082`, `S-122`, `S-208`, `S-209`, `S-210`, `S-235`, `S-253`, `S-257`, `S-264`, `S-301`,
`S-302`, `S-333`, `S-361`, `S-363`, `S-364`, `S-366`, `S-368`, `S-453`, `S-477`, `S-491`, `S-492`.

**Constantes.** `pullBaseKm` **1,2** · `pullMinKm` **0,4** · `pullMaxKm` **3,0** ·
`coopBase` **0,68**, `coopSize` **0,02**, `coopHunger` **0,08**, `coopMargin` **0,30**,
`coopMin` **0,30**, `coopMax` **0,82** (los cuatro primeros son los de hoy; `coopMargin` es nuevo y es
el que sustituye el disparador por km) · `selfishGain` **0,55** · `mergeToll` **2 km**.

**Medida.** Banco `llana-180` y `reina-150`. `kmPorTurnoMediana` **banda 0,6-2,5 km** (hoy: no existe
el concepto, los mismos hombres van al frente kilómetro tras kilómetro). `relevosDelMejorRematadorPct`
en los últimos 10 km de una fuga que llega: **banda 0-25 %** (hoy ≈ el del peor). Y el ganador en
solitario en media montaña, la deuda del §14 punto 4 («4 % contra el 20-30 % que pidió el dueño»):
**banda 12-32 %** (§9).

---

### R19 · Fases explícitas y sus ventanas · 19 situaciones

> `CONTRARIO 5`. Lleva las dos gemelas S-444 (nº 15) y S-487 (nº 16), que «entre las dos apagan la
> capa táctica por delante y por detrás de la fuga del día».

**Pieza.** La fase como **estado compartido y observable**, con sus ventanas, y **la retirada de los
dos topes contables**.

```ts
type Phase = 'neutralizado' | 'salida' | 'aduana' | 'control' | 'caza'
           | 'aproximacion' | 'decisivo' | 'desenlace' | 'tregua' | 'ventana'
```

**Reglas.**

1. **R19.1 — la fase se deriva, no se decreta**:
   ```
   neutralizado : km < km0
   salida       : km < settleKm ∧ ninguna fuga prosperó
   aduana       : hay movimientos y la cuerda (R03) aún no se ha resuelto
   control      : fuga del día consolidada y cuerda positiva
   caza         : algún equipo con cupo `frente` y cierre necesario ≤ factible
   aproximacion : a ≤ approachKm de un punto marcado (pie de puerto, sector, tramo expuesto, pancarta)
   decisivo     : onClimb ∧ raceThisClimb, o el sector que parte la carrera
   desenlace    : kmToGo ≤ finalDriveKm
   tregua       : hay un pacto vigente (R09.6, R12.1)
   ventana      : los `windowKm` posteriores a una captura, una pancarta o un cierre — ver R19.3
   ```
2. **R19.2 — se retira el tope de tres movimientos** (S-444, `CONTRARIO`): `tacticMaxMoves` 3
   desaparece. Lo que limita los intentos es lo que debe limitarlos: cerillos, energía mínima, cupo
   `ataque` por equipo, cooldown por grupo y la utilidad. «Con la fuga del día, un puente y un
   contraataque —situación normal en una reina— nadie puede saltar en el puerto decisivo».
3. **R19.3 — se retira el apagón mientras el pelotón cierra** (S-487, `CONTRARIO`): `closingNow` deja
   de saltar `attemptFrom` para el pelotón entero. En su lugar, **cerrar cuesta**: los que están
   pagando el cierre tienen `utilidad(atacar)` ≈ 0 por frescura, y los que se guardaron no. Es justo
   cuando salta el bueno, por el otro lado, con el que cerraba ya gastado. El propio comentario del
   código mide el daño: «cuatro intentos hasta el km 19 y ni uno más en los 190 restantes».
   Y la **ventana** (S-231, S-329, S-116, S-236): tras una captura, `compromiso` cae a
   `windowCommit` durante `windowKm`, **también dentro de los últimos 15 km**, donde hoy el suelo del
   tirón final tapa el bajón entero (es la frontera que S-231 y S-329 nombran las dos).
4. **R19.4 — el flyer** (S-326, `CONTRARIO`): `tacticNoAttackKm` 3 baja a `flyerNoAttackKm`, y en los
   últimos 3 km puede nacer un ataque **si el terreno ayuda** (repecho, curva, viento de cola) y lo
   lanza el peor rematador del grupo. Debe ganar el 2-5 % de las llanas.
5. **R19.5 — el puente desde atrás** (S-132, `AUSENTE`, «la mitad de la regla 7 que no existe»):
   `puentear` deja de ser solo del pelotón hacia delante. Un descolgado puede saltar hacia el grupo de
   delante por acción propia.
6. **R19.6 — dejar marchar el puente** (S-173): el voto de R03 se aplica también al puente, con vara
   distinta (S-121): dos inofensivos pasan, un favorito se cierra, y **reforzar la fuga adelanta la
   caza** (el voto de los demás cambia de signo).
7. **R19.7 — la etapa corta de montaña** (S-471): sin fase de `aduana` ni `control`; se corre desde el
   km 0 (§4/R28).

**Cierra.** `S-116`, `S-121`, `S-130`, `S-131`, `S-132`, `S-152`, `S-169`, `S-170`, `S-173`, `S-218`,
`S-231`, `S-232`, `S-326`, `S-329`, `S-350`, `S-444`, `S-471`, `S-476`, `S-487`.

**Constantes.** `windowKm` **1,5** · `windowCommit` **0,45** · `flyerNoAttackKm` **0,8** ·
`approachKm` **6** · `tacticMaxMoves` **RETIRADA** · `closingNow` **RETIRADA** como veto.

**Medida.** Banco `llana-180` y `reina-150`. `intentosPorEtapa` — hoy medido en 12 (llano) con el tope;
**banda propuesta 8-25**, y sobre todo `intentosDespuesDelKm100` **banda ≥ 3** (hoy el comentario mide
cero en 190 km). `contraataquesTrasCaptura` **banda 0,3-1,5 por captura**. Y `flyerWinPct` en llana:
**banda 1-6 %.**

---

### R20 · El pulso por el frente: quién paga la caza · 20 situaciones

**Pieza.** El frente como **subasta con precio**, sustituyendo `chaseField` (una foto de salida sobre
`eff0` que «no cambia con energía, con abandonos ni con quién se ha descolgado»).

**Reglas.**

1. **R20.1 — la puja** (S-166, S-167, S-171, S-172, S-174):
   ```
   puja(e) = derecho(e) · capacidad(e) − precio
   derecho(e)   = max(front de sus motivos)            # tabla R05.1
   capacidad(e) = Σ_{m en el grupo} frescuraDeCarrera(m) · relayDuty(m) / 8
   precio       = cierreNecesario(gap, kmRestantes, sinuosidad) / feasible(e)
   ```
   Gana el cupo `frente` el de mayor puja, con la histéresis de §2.4 y el relevo de hoy
   (`teamFrontHandoverSpent` 0,35 / `Edge` 0,2, que funcionan y se conservan).
2. **R20.2 — la carretera pone el precio** (S-493, `AUSENTE`):
   ```
   cierreNecesario = gap / (kmRestantes − chaseCatchTargetKm) · (1 + roadPriceGain · sinuosidad)
   ventajaDeNumero = pullers^numberExponent · (1 − sinuosidad · numberSinuosityDamp)
   ```
   «Cuatro hombres devuelven tres minutos en cuarenta kilómetros en carretera ancha y recta; en
   carretera de tercera con curvas, pueblos y rotondas el pelotón se estira, paga acordeón y pierde la
   mitad de su ventaja de número.» Ese «paga acordeón» es literalmente R15.1.
3. **R20.3 — el frente sin dueño** (S-167, `PARCIAL`, con la mitad construida): hoy
   `noOwnerCommitFactor` 0,94 baja la intensidad pero **nada limita la rotación a 2-3 casas**. Con
   R18.4 el reparto es por equipos; con la subasta, sin dueño único pujan 2-3 y el resto no entra.
4. **R20.4 — la alianza se pide y se debe** (S-174, `AUSENTE`): `pactar` con alcance `alianza`, entre
   equipos con el mismo problema. El que la pide contrae deuda; si luego no pone los hombres, lo paga
   en los relevos de hoy y en la aduana de mañana (R09.2, R09.3). Y se rompe en cuanto uno tiene lo
   suyo (S-175).
5. **R20.5 — a quién se persigue** (S-176, `CONTRARIO`, **nº 1 de las veinte más graves**): el objetivo
   de la caza no es el grupo más adelantado, es **el que hace daño**:
   ```
   objetivo(e) = argmax_{mov} amenazaPara(e, mov)          # R04.1 sobre la pizarra
   ```
   «Si delante van tres irrelevantes y detrás el 2.º de la general, se persigue al segundo.» Es un
   cambio de una línea en el consumidor y arrastra el motor entero, porque hoy `gcLeash` mide contra
   `frontMove()` y `chaseReferenceIndex` elige por orden de carretera.
6. **R20.6 — el pelotón se parte por su propia caza** (S-230, `CONTRARIO`): cazar a tope 40 km en llano
   **cuesta corredores por detrás**. Hoy el llano no selecciona por dado por decisión medida, y este
   documento la respeta: la criba de la caza no es un dado, sale de R15.1 —el acordeón de las bandas
   3-4 a compromiso alto— y de la deriva que ya existe.
7. **R20.7 — el equipo que se sienta** (S-186, S-084, S-093): el equipo sin motivo **no persigue
   nunca**: prueba contras mientras hay cuerda y después se sienta.
8. **R20.8 — el infiltrado** (S-474) vive en R03.5.

**Cierra.** `S-071`, `S-150`, `S-151`, `S-166`, `S-167`, `S-168`, `S-171`, `S-172`, `S-174`, `S-175`,
`S-176`, `S-178`, `S-180`, `S-186`, `S-230`, `S-296`, `S-442`, `S-474`, `S-477`, `S-493`.

**Constantes.** `roadPriceGain` **0,8** (sinuosidad 1 encarece el cierre un 80 %) · `numberExponent`
**0,6** (ya implícito en `pullers`) · `numberSinuosityDamp` **0,45** · `frontAuctionHysteresis`
**0,15** · el resto (`teamFrontHandover*`, `chaseCatchTargetKm`, `chaseFeasibleSecondsPerKm`) se
conserva.

**Medida.** Banco `chronicle` (ya existe con `teamedField` 8×5). `frontTeamsPerStage` 1,8-4 se conserva
y se le añade `equiposQueTiranSimultaneos` **banda 1-3** (S-167 literal). `objetivoDeLaCazaCorrectoPct`
— fracción de bloques en que el grupo perseguido es el de mayor amenaza y no el más adelantado:
**banda 80-100 %** (hoy: 0 cuando difieren). `cierreEnCarreteraRevirada` — km necesarios para cerrar
3 min con 4 hombres, sinuosidad 0,2 contra 0,8: **banda: el segundo ≥ 1,5× el primero**.

---

### R21 · La estructura de equipo persistente y la carta del día · 23 situaciones

> `CONTRARIO 4` · `AUSENTE 8` · `PARCIAL 10` · `CUBIERTO 1`. Lleva S-047 (nº 4) y S-049.
> **Es el racimo que el dueño dictó en el encargo**, con las seis estructuras. Va entero en §5.

**Pieza.** `RaceStructure` fijada antes de la etapa 1 y revisable solo por hechos (§5), más la carta
del día derivada de ella y del final previsto, más **la muerte de `pickLeader`**.

**Reglas.** En §5.1-§5.7. Resumen de las que cierran filas `CONTRARIO`:

- **S-047**: los papeles del día nacen de la estructura, no del `kind`. El 70 % del campo deja de ser
  gregario (deuda §14 punto 14) y `finishRoleWeight` deja de castigarlos.
- **S-049**: la carta sale del final previsto por grupo (R17.1).
- **S-053**: el `exceptuado` existe como grado (§2.8): no trabaja, no recibe ayuda, no ataca cuando su
  equipo controla.
- **S-052**: la media montaña se decide por el final previsto, y **el plan y las órdenes nombran al
  mismo hombre** (hoy `pickLeader` y `autoOrders` pueden discrepar).

**Cierra.** `S-001`, `S-002`, `S-003`, `S-004`, `S-005`, `S-006`, `S-007`, `S-008`, `S-021`, `S-047`,
`S-049`, `S-050`, `S-051`, `S-052`, `S-053`, `S-179`, `S-190`, `S-197`, `S-390`, `S-392`, `S-395`,
`S-469`, `S-483`.

**Constantes.** En §5.

**Medida.** Banco `estructura` nuevo (§7.2): `rolesPct` por rol sobre 10 carreras pequeñas.
**Banda propuesta: gregario 35-55 %** (hoy 70 %), `carta 12-25 %`, `libre 10-30 %`. Y
`cartaCoherenteConEstructuraPct` **banda 90-100 %** (invariante blando).

---

### R22 · El sistema de órdenes del jugador · 35 situaciones

> El racimo más numeroso. `CONTRARIO 7` · `AUSENTE 11` · `PARCIAL 10` · `CUBIERTO 7`.
> Va entero en §6. Lleva S-031 (nº 8 de las veinte más graves: «la traición al jugador»).

**Pieza.** Vocabulario de órdenes v2 (marcador, esfuerzo, motivo, política, disparadores,
condicionales), precedencia escrita (§2.8) y **aviso cuando la orden no podrá cumplirse**.

**Cierra.** `S-011`, `S-023`, `S-024`, `S-025`, `S-026`, `S-029`, `S-030`, `S-031`, `S-032`, `S-040`,
`S-054`, `S-057`, `S-058`, `S-059`, `S-060`, `S-061`, `S-062`, `S-063`, `S-067`, `S-068`, `S-069`,
`S-070`, `S-071`, `S-125`, `S-214`, `S-215`, `S-216`, `S-217`, `S-256`, `S-320`, `S-321`, `S-322`,
`S-323`, `S-415`, `S-421`.

**Medida.** Banco `ordenes` nuevo (§7.4), el que hoy **no existe en absoluto**: «ningún banco varía
`mentality`, `contestSprints/Climbs`, `targetRiderId` o rol por decisión externa»
(`mapa-bancos.md` §7 punto 7). Estadística: **el barrido de una palanca a la vez**, 16 semillas por
valor, midiendo el delta en puesto medio del corredor. **Bandas propuestas** (§7.4): cada palanca mueve
el puesto medio al menos `leverEffectMin` puestos, y ninguna lo mueve más de `leverEffectMax`. Es la
respuesta medible a «el resultado es casi lo mismo ponga lo que ponga ahí».

---

### R23 · El relato que explica el porqué · 14 situaciones

**Pieza.** El relato **no se inventa**: sale de los campos que este diseño ya obliga a llevar. Cada
`Commitment` tiene `reason` y `targetId`; cada cupo tiene dueño; cada voto de R03 tiene sumandos.

**Reglas.**

1. **R23.1 — quién trabaja para quién** (S-056, S-434): el motivo del relevo deja de derivarse a
   posteriori en `motivoDelRelevo` (nueve ramas heurísticas, líneas 3251-3363) y pasa a ser
   **el `reason` del compromiso vigente**. Se acaba «his job in the team» y «just riding». Y aparece
   `tira_para_si_mismo` (S-434, deuda §14 punto 8: `pullReason` no lo tiene).
2. **R23.2 — por qué persigue cada equipo** (S-219, S-441): el evento de caza lleva el motivo, el
   objetivo (**a quién persigue**, R20.5) y el voto que lo produjo.
3. **R23.3 — el tope de tres nombres** (S-439, deuda §14 punto 18): cuando tiran diez, el parte los
   cuenta a todos: por nombre hasta tres, **por número y por equipo después**. Cambio de contrato del
   evento, no de motor.
4. **R23.4 — el informe no re-simula** (S-418, `CONTRARIO`): `getRiderLastRaceReport` re-simula la
   etapa desde el snapshot con el motor actual (`raceReport.ts:78-`). Debe leer los `events`
   congelados, como hacen la crónica y la radio.
5. **R23.5 — cruzar la orden con lo que pasó** (S-417, S-420, S-416): el informe enseña la hoja escrita
   (las siete palancas, no cuatro) y, por cada compromiso que **no** se pudo adoptar, la causa:
   `cupo denegado`, `sin cerillos`, `energía mínima`, `el disparador cayó en fase de tregua`.
6. **R23.6 — lo que se abre se cierra** (S-449, S-440): se conserva como regla de narración.

**Cierra.** `S-056`, `S-218`, `S-219`, `S-221`, `S-416`, `S-417`, `S-418`, `S-419`, `S-420`, `S-434`,
`S-439`, `S-440`, `S-441`, `S-449`.

**Constantes.** `frontNamesMaxRiders` 8 y el tope de 3 protagonistas: **se sustituyen por «tres nombres
+ recuento»**, no por un número mayor.

**Medida.** Banco `coherence` (ya existe, 10 pruebas). `teamPullWithReasonPct` 95-100 se conserva;
se añade `pullReasonSinNombrePct` **banda 0-5 %** (hoy: «his job in the team» es la rama por defecto) y
`ataqueSinCerrar` baja de tolerar 2 a **tolerar 0** una vez que R23.3 permite nombrar a todos.

---

### R24 · Directores bot falibles · 11 situaciones

> Lleva S-458 (nº 17), S-478 (nº 19) y S-488 (nº 20) de las veinte más graves. **La capa de información
> entera.** Casi todo está ya construido en §3.3 y §3.4: aquí solo quedan el capitán de ruta y las
> órdenes malas.

**Pieza.** `Blackboard` (§3.4), `RivalSignals` (§3.3), el **capitán de ruta** y el generador de órdenes
malas.

**Reglas.**

1. **R24.1 — nadie ve el hueco real** (S-458): §3.4 entero. `boardLagKm` 1,2 ± 0,5;
   `boardRoundingS` 15; `sd = 4 + 0,35·(100 − dirección)`; `boardSpin` ±8 % según el intent.
2. **R24.2 — el estado del rival son señales** (S-488): §3.3 entero.
3. **R24.3 — la noticia llega tarde y mal** (S-478): §3.4, `news`.
4. **R24.4 — el capitán de ruta** (S-459, `AUSENTE`): cada equipo tiene, o no, un corredor con voz:
   ```
   voz(m) = palmarésNormalizado(m) · vozPalmares + añosProfesional(m)/15 · vozAños
   capitan(e) = argmax voz(m) entre los presentes, si voz ≥ vozMinima      # puede ser NULL
   ```
   Manda **en las ventanas en que la orden no llega**: puerto donde retienen los coches, carrera
   partida con el coche al otro lado, tramo sin cobertura, últimos kilómetros. En esas ventanas
   `boardLagKm` se multiplica por `radioBlackoutGain` **salvo para el equipo que tiene capitán**. Y es
   **quien negocia**: pide la tregua (R12.1), pide la alianza (R20.4), convoca la parada (S-226).
   El equipo sin capitán se queda quieto justo en el minuto que decide la carrera.
5. **R24.5 — un bot escribe órdenes malas** (S-013, S-009, `AUSENTE`/`CONTRARIO`): al repartir cupos,
   un director con `dirección` baja se equivoca con probabilidad `1 − dirección/100`, y se equivoca de
   **las cuatro maneras que el juego ya sabe enumerar** (el propio `raceOrdersAdvice.ts` las tiene):
   rol sin sentido para el terreno, objetivo inexistente, cita imposible, esfuerzo contradictorio.
6. **R24.6 — la orden tarda en llegar a la carretera** (S-489): `colocar` tarda `bandChangeKm` por
   banda (R15.2) y el árbitro decide con la pizarra, así que **decidir tarde cuesta hombres gastados**.

**Cierra.** `S-009`, `S-010`, `S-012`, `S-013`, `S-014`, `S-029`, `S-458`, `S-459`, `S-478`, `S-488`,
`S-489`.

**Constantes.** Las de §3.3/§3.4, más: `vozPalmares` **0,6** · `vozAños` **0,4** · `vozMinima` **0,45**
(≈ la mitad de los equipos tiene capitán) · `radioBlackoutGain` **2,5`** · `badOrderChanceBase`
**1 − dirección/100**.

**Medida.** Banco `informacion` nuevo (§7.5), **con brazo de control**: el mismo escenario con
`boardLagKm = 0, boardErrorSlope = 0, boardSpin = 0` contra el real. Estadísticas:
`cazasQueLleganTardePct` **banda 8-25 %** (hoy 0: «las cazas salen siempre clavadas»);
`diferenciaEntreEquiposBuenosYMalos` — puesto medio de los equipos con dirección > 80 contra
dirección < 50: **banda 3-15 puestos**, y con el brazo de control **banda 0-2** (si con información
perfecta los buenos siguen ganando, es que la ventaja no venía de la información y hay que decirlo).

---

### R25 · El precio de obedecer y de desobedecer · 6 situaciones

**Pieza.** `teamTrust` y `moral` como consecuencia dentro del juego, no como tabla muerta.

**Reglas.**

1. **R25.1 — desobedecer cuesta** (S-393, S-057): un `rebelde` (§2.8) pierde
   `trustLossRebel` de confianza por etapa; con `exceptuado` (permiso) no pierde nada. La confianza
   pesa en `callupScore` (ya existe, `W_TRUST 0,4`) y en el arropo del día siguiente.
2. **R25.2 — cumplir da algo** (S-414, `AUSENTE`, literal «cumplir tampoco da nada»): completar un
   compromiso de `arropar`, `relevar` por el equipo o `rescate` suma `trustGainDuty`, y el equipo lo
   devuelve: `breakQuota` extra en una etapa a elección del árbitro (la rotación de S-408 y S-046).
3. **R25.3 — el mánager juez y parte** (S-027): nombrarse carta siempre sale caro **por dentro**: los
   humanos del equipo pierden moral y la pierden más si el mánager tiene peor `finishScore` que ellos.
   Sin regla que lo prohíba, que es la doctrina de G2.
4. **R25.4 — el reconocimiento del recorrido** (S-429): por hombre y por trozo, no por equipo. Entra
   como `RoadView.conocidoPor` y da ventaja en `colocar` y en el riesgo del descenso.

**Cierra.** `S-011`, `S-027`, `S-384`, `S-393`, `S-414`, `S-429`.

**Constantes.** `trustLossRebel` **6/etapa** · `trustGainDuty` **2/etapa** · `knowledgeColocarGain`
**0,15** · `knowledgeRiskDamp` **0,8**.

**Medida.** Banco `world` (25 temporadas). `rebeldesQueRindenMenosA20CarrerasPct` — comparación pareada
entre un corredor que va siempre de rebelde y uno que acepta el papel: **banda: el rebelde acaba con
menos convocatorias en el 65-95 % de los pares**. Es S-057 literal («ir de rebelde tiene que rendir
peor a veinte carreras vista»).

---

### R26 · El grupeto y el corte · 14 situaciones

> S-494 (`AUSENTE`) es la apuesta que le falta al racimo: mientras la readmisión sea **incondicional**
> (S-464, `CUBIERTO`: «readmite siempre y a todos»), el tamaño del grupeto no vale nada y el racimo se
> organiza por inercia en vez de por miedo.

**Pieza.** El autobús como **grupo con capo y con pacto entre rivales**, y el corte que **elimina
según cuántos lleguen**.

**Reglas.**

1. **R26.1 — la readmisión mira el número** (S-494, y es la causa que les falta a las otras cinco):
   ```
   readmitir(grupo fuera de control) =  |grupo| ≥ cutBulkRiders  →  readmitidos con penalización
                                        |grupo| <  cutBulkRiders  →  eliminados
   ```
   Con eso **el tamaño es la protección**, y por eso se espera al rezagado, se pelea por engancharse
   antes que por ir más rápido, y el capo cuenta cabezas y no solo minutos.
2. **R26.2 — el corte es una estimación hasta que alguien gana** (S-310, S-365, S-412): el capo trabaja
   con la estimación del director por radio **y con su error** (§3.4). `dosificar` en el grupeto usa
   `corteEstimado = tiempoPrevistoDelGanador · timeCutFraction · (1 ± boardError)`.
3. **R26.3 — el capo** (S-310): `capitan(e)` de R24.4 extendido al grupeto: el de más voz de los
   presentes, sea del equipo que sea. Organiza el turno (R18.1) **entre rivales** y decide el ritmo.
4. **R26.4 — el grupeto voluntario** (S-139, S-135, S-184, S-216, los dos primeros `CONTRARIO`):
   `giveUpLambda` devuelve hoy 0 si el rol es `lider`, `sprinter` o `cazaetapas`, si la mentalidad es
   `supercombativo` o si va en el grupo de cabeza, y solo actúa en los últimos 25 km. Se sustituye por
   la intención `dosificar`, disponible **desde el km 0** cuando:
   ```
   valor(dosificar) > valor(cualquier otra)  ⟺  no me juego nada hoy ∧ mañana sí
   ```
   Eso es el velocista que se descuelga antes de que duela con sus gregarios (S-139) y el hombre de la
   general que ya no lo es (S-135). **El veto por rol desaparece**: lo que decide es lo que se juega.
5. **R26.5 — el grupeto espera por identidad** (S-311, S-371, S-213): `grupetoWait` deja de mirar solo
   el tamaño; mira si el que viene es un sprinter con equipo dentro o un compañero, y si el margen del
   corte lo permite.
6. **R26.6 — la criba llega a todos los grupos** (S-443, deuda §14 punto 2): el grupeto que ya no es la
   carrera **sí pierde gente en el puerto**. Hoy solo se criba el `shed` que es `mainId`. Esto exige
   que la cola de las reinas pueda pasar del 14 %: es **decisión del dueño** (§10, decisión 7).
7. **R26.7 — medirse contra `mainId`** (S-442, deuda declarada): el ritmo del grupeto (D-41) y el
   reenganche (D-42) se miden hoy contra el `Group` con id fijo `peloton`, no contra `mainId`. Se
   corrige.

**Cierra.** `S-135`, `S-139`, `S-184`, `S-216`, `S-310`, `S-311`, `S-359`, `S-365`, `S-371`, `S-375`,
`S-412`, `S-443`, `S-464`, `S-494`.

**Constantes.** `cutBulkRiders` **20** (por debajo de veinte el jurado sí elimina; calibrar con banco y
con el techo de vigilancia de S-464) · `cutPenaltyPoints` — pierde los puntos del día (ya existe,
S-373) · el resto se conserva.

**Medida.** Banco `grandTour`. `outOfTimePct` 1-15 se conserva pero **cambia de significado**: hoy nadie
se va por el corte. `eliminadosPorCortePorVuelta` **banda 0-6**; `tamañoMedianoDelGrupeto` **banda
15-45**; `queenLastGroupPct` 8-14 y `realQueens.lastGroupPct` 7-14 se re-miden (§9).

---

### R27 · La crono como modo de carrera · 14 situaciones

> `AUSENTE 9`. «En la crono cada uno corre igual» (S-125, `CONTRARIO`).

**Pieza.** `simulateTimeTrial` gana un plan, órdenes y sucesos. **La ley de la crono no se toca**
(huella sellada `timetrial.test.ts`); lo que se añade va por encima de ella.

**Reglas.**

1. **R27.1 — cada uno corre según lo que se juega** (S-125, S-382): `pacing` por corredor:
   ```
   pacing(r) = clamp( ttBase + ttStake·valorDeHoy(r) − ttTomorrow·valorDeMañana(r), ttMin, ttMax )
   ```
   El gregario al 70 % dentro del corte, el cronista y la carta a tope, el que va a perder tres
   minutos rodando para no perder más.
2. **R27.2 — la dosificación es ordenable** (S-143): `effort` deja de ser un ±0,5 en el deber de
   relevo y en la crono pasa a ser el reparto de ritmo por tercios: salir a tope mejora el tiempo
   `ttFastStartGain` y multiplica el riesgo de hundirse por `ttFastStartRisk`.
3. **R27.3 — las referencias del rival** (S-332, S-039, S-021): el que sale detrás corre con los
   parciales del que salió antes, **con el retardo de la pizarra**: `RaceView.board` en modo crono
   lleva los parciales de los que ya pasaron. El maillot ajusta: con colchón no arriesga en las curvas.
   Y el equipo puede mandar a un hombre a **marcar tiempo** (S-021: «con lo que eso implica»).
4. **R27.4 — percances** (S-127, S-202, S-375): la crono genera incidentes, 1-4 % (S-127 literal), y
   con eso el corte del 0,25 deja de ser «una salvaguarda dormida» (deuda §14 punto 10).
5. **R27.5 — el orden de salida** (S-036, S-072, S-039): los intervalos **no son iguales** —los últimos
   de la general salen cada 2-3 min y los demás cada minuto— y el alcance es **castigo asimétrico**: el
   alcanzado no puede coger la rueda, hay distancia mínima y el comisario la vigila.
6. **R27.6 — CRE** (S-163): formato entero, **fuera de alcance de la v1**. §10, decisión 14.

**Cierra.** `S-021`, `S-036`, `S-039`, `S-072`, `S-125`, `S-126`, `S-127`, `S-143`, `S-163`, `S-263`,
`S-332`, `S-382`, `S-436`, `S-462`.

**Constantes.** `ttBase` **0,92** · `ttStake` **0,10** · `ttTomorrow` **0,08** · `ttMin` **0,70** ·
`ttMax` **1,00** · `ttFastStartGain` **0,4 %** de tiempo · `ttFastStartRisk` **×2,2** de hundimiento ·
`ttIncidentPerKm` calibrado a **1-4 % por corredor y crono**.

**Medida.** Banco `timeTrials` (ya existe, 5 cronos reales). `tailPct` 8-15 se conserva y se re-mide
(§9). Nuevas: `incidentesEnCronoPct` **banda 1-4 %**; `dispersionDePacingPorRol` — diferencia de
tiempo entre gregarios y cartas del mismo nivel: **banda 1,5-5 %**.

---

### R28 · El formato de la carrera como contexto · 30 situaciones

> El segundo racimo más grande. `AUSENTE 16`. Lleva S-451 (nº 2) y S-486 (nº 3) de las veinte más
> graves, que **no son de esta parcela** (§1.2).

**Pieza.** `RaceFormat`, leída por la estructura (§5), por las fases (R19) y por el voto (R03).

```ts
interface RaceFormat {
  dias: number
  hayGeneral: boolean; hayCrono: boolean; kmCrono: number
  perfilAgregado: { kmLlano: number; kmSubida: number; desnivel: number }
  clasificaciones: ClassificationId[]
  cupoEquipos: number                        // 8 gran vuelta, 7 el resto, 4-6 pequeñas
  invitados: string[]                        // equipos con motivo `patrocinador` (S-066)
  tipo: 'granVuelta'|'vueltaCorta'|'clasica'|'clasicaLarga'|'nacional'|'circuito'
  /** Etapas marcadas del calendario que condicionan a esta (S-470). */
  simultaneas: string[]
}
```

**Reglas.**

1. **R28.1 — la estructura se elige contra el formato** (S-004, S-005, S-006, S-008): §5.2 entero. «Un
   sprinter en una carrera sin llano nunca es la carta»; «sin terreno propio el equipo se declara de
   cazaetapas de partida».
2. **R28.2 — sin general no hay control por maillot** (S-007, S-074, S-388): en etapa 1 y carrera de un
   día, `hasGcContext` es falso y hoy eso **apaga los tres frenos del maillot y da la cuerda más larga
   de la carrera**. Se corrige: si hay vuelta detrás (`format.dias > 1`), la etapa 1 **sí** tiene
   general —todos a 0— y nadie deja marchar una fuga que se vestiría el primer maillot con minutos.
3. **R28.3 — la clásica no tiene mañana** (S-158, S-225, S-331): `valorDeMañana` = 0, así que nadie
   guarda y el descolgado abandona en vez de entrar en el corte. Y con 280 km la caza empieza a −100
   km, que sale de `cierreNecesario` con `feasible` bajo por erosión.
4. **R28.4 — la etapa corta de montaña** (S-471): sin `aduana` ni `control`; los equipos de la general
   atacan desde el primer puerto porque **no queda etapa para cazar después**. Sale de R19.1 con
   `format` + `road`.
5. **R28.5 — última etapa** (S-075, S-270): con la general decidida, 80 km de paseo y el sprint de
   verdad; con la general viva, todo o nada desde el penúltimo puerto.
6. **R28.6 — circuito** (S-227): la criba se acumula vuelta a vuelta; la fuga se caza en el penúltimo
   paso; el ataque decisivo sale en el último.
7. **R28.7 — neutralizado y km 0** (S-073, S-223): en el neutralizado no se ataca; la velocidad de la
   primera hora no es una constante sino consecuencia de la pelea por la fuga (35-42 km/h el día
   tranquilo, 45-52 el día de aduana disputada). La neutralización con reanudación es un suceso
   táctico entero.
8. **R28.8 — dos carreras a la vez** (S-470) y **el campeonato nacional** (S-485, 532 de las 1.418
   etapas del calendario): fuera de alcance de la v1. §10, decisión 14.
9. **R28.9 — el trazado** (S-493) vive en R20.2; **la altitud** (S-479) y **la tierra** (S-463) entran
   como parámetros de `RoadView` y consumidores en R13 y R15.

**Cierra.** `S-001`, `S-037`, `S-073`, `S-074`, `S-075`, `S-085`, `S-117`, `S-157`, `S-158`, `S-159`,
`S-164`, `S-223`, `S-225`, `S-226`, `S-227`, `S-228`, `S-270`, `S-287`, `S-289`, `S-388`, `S-431`,
`S-438`, `S-451`, `S-463`, `S-470`, `S-471`, `S-479`, `S-485`, `S-486`, `S-493`.

**Constantes.** `neutralKm` **por carrera, del dato** · `firstHourKmhCalm` **35-42** /
`firstHourKmhFought` **45-52** (sale de la física con el compromiso de la aduana; se verifica, no se
impone) · `altitudeThresholdM` **2.000** y `altitudePenaltyPerKm` por corpulencia (S-479).

**Medida.** Banco `smallTours` + `calendarQueens`. `estructuraCoherentePct` **banda 95-100 %** (ningún
equipo de sprinter en una carrera sin llano). `velocidadPrimeraHora` **banda 35-52 km/h** con
correlación positiva contra la disputa de la aduana. Y S-451/S-486 son **prerrequisito**: sin perfil
correcto, R28 no se puede medir en montaña.

---

### Cobertura

Los 28 bloques de reglas cubren **445 de las 494 situaciones** (90 %), que es la cobertura de los
racimos del catálogo. Las 49 restantes se resuelven solas o no comparten pieza; de las tres que el
catálogo declara fuera de racimo, **S-432** (el dado de forma del día) ya está `CUBIERTO`, **S-437**
(el orden de carretera) es física y se conserva con su límite anotado, y **S-448** (el comisario) es un
actor que no existe en ninguna capa y este diseño **no lo crea**: §10, decisión 14.

---

## 5. El plan de equipo de verdad

Lo que el dueño dictó, literal, son **seis estructuras**. Este apartado las convierte en tipos, en
reglas de convocatoria, en papeles del día y en revisiones.

### 5.1 La estructura de carrera

Se fija **antes de la etapa 1** y dura toda la carrera; solo cambia por hechos (§5.6), nunca por el
terreno del día. Es S-002 literal.

```ts
type TeamShape =
  | 'sprinter'        // «Un sprinter fuerte y el resto trabajando solo para él»
  | 'montana'         // «Un hombre fuerte de montaña y el resto para él»
  | 'general'         // «Un hombre para la general y el resto para él»
  | 'doble'           // «Un sprinter Y un escalador, y el resto para ambos»
  | 'cazaetapas'      // «Solo cazaetapas, buscando la fuga y la oportunidad sorpresiva»
  | 'mixta'           // «Gregarios de un líder, con alguien exceptuado que va por libre»

interface RaceStructure {
  teamId: string
  shape: TeamShape
  /** Las cartas de la carrera, en orden. 1 en cinco de las seis formas; 2 en `doble`. */
  cards: { riderId: string; kind: 'sprint'|'montana'|'general'|'libre'; gcComplete?: boolean }[]
  /** Papel de carrera de cada uno. NO es el rol del día: es a quién sirve toda la carrera. */
  roles: Map<string, SeasonRole>
  /** Los que van por libre CON permiso (§2.8). */
  exceptuados: string[]
  /** Motivos declarados, ordenados por derecho (R05.1). */
  motives: Motive[]
  /** Presupuesto por etapa (R10.1). */
  budget: number[]
  /** Qué hecho la puede cambiar, y cuántas veces se ha cambiado ya. */
  revisions: { day: number; cause: RevisionCause }[]
}

type SeasonRole =
  | 'carta'            // una de las cartas
  | 'gregario_llano'   // hace el llano, se deja ir en el primer puerto
  | 'gregario_montana' // se reserva para los puertos
  | 'lanzador'         // tren de sprint
  | 'bajador'          // ← S-465
  | 'cazaetapas'       // gasta el cupo de fuga del equipo
  | 'marcador'         // apunta a un rival concreto de la carrera
  | 'exceptuado'
```

**`gcComplete`** es la distinción que el dueño pidió expresamente y que hoy no existe (S-006,
`AUSENTE`): un hombre de general **completo** (montaña + crono, si hay crono) corre **a controlar**
porque gana tiempo en la crono; uno de **solo montaña** corre **a ganarlo desde lejos** porque no la
tiene. Sale de `CRI ≥ gcCompleteCri` y de `format.kmCrono > 0`, y cambia el `intent` por defecto del
equipo y los `markedDays` de R10.2.

### 5.2 Cómo se elige la estructura en la convocatoria

Hoy **no hay lógica de composición**: `callupScore` puntúa individualmente y «nada mira quién más va».
Por eso S-001 es `AUSENTE` con cita («nunca un lanzador sin sprinter, nunca ocho escaladores en una
vuelta llana, nunca un marcador sin favorito rival»). El orden se invierte: **primero la baza, después
el relleno.**

```
convocar(equipo, carrera):
  # 1. ¿Qué formas caben en este recorrido?
  aptitud(shape) = fit(shape, format)                     # tabla 5.3
  # 2. ¿Para cuál tenemos hombre?
  for shape in shapes con aptitud > shapeFloor:
      candidato(shape) = mejor del roster disponible para esa carta
      valor(shape)     = aptitud(shape) · nivelDe(candidato) · filosofia(equipo, shape)
  shape = argmax valor                                    # ← la BAZA se elige primero
  # 3. Rellenar alrededor, con cupos por papel
  cupos = ROSTER_BY_SHAPE[shape]                          # tabla 5.4
  for papel, n in cupos:
      elegir n del roster por `fitPapel`, sin repetir, respetando `busy` y frescura
  # 4. Reglas duras (S-001)
  assert  no hay `lanzador` sin carta de sprint
  assert  no hay `marcador` sin rival nombrado
  assert  shape ≠ 'sprinter' si format.perfilAgregado.kmLlano / total < flatShareForSprint
```

`filosofia` es la vocación de la casa (S-003): `sprints`, `clasicas`, `cantera`, `general`,
`equilibrado`; ya existe en `callups.ts` como `PHILOSOPHY_BONUS 0,6` y aquí pasa a sesgar **la forma**,
no solo a quién se convoca.

### 5.3 Qué forma cabe en qué carrera (S-004, S-005, S-006, S-008)

| Forma        | Gran vuelta con crono | Gran vuelta sin crono | Vuelta llana | Vuelta corta con crono | Clásica llana | Clásica de cotas | Clásica de montaña |
| ------------ | --------------------: | --------------------: | -----------: | ---------------------: | ------------: | ---------------: | -----------------: |
| `sprinter`   |                  0,55 |                  0,55 |     **1,00** |                   0,50 |      **0,95** |             0,25 |           **0,00** |
| `montana`    |                  0,60 |              **0,85** |     **0,00** |                   0,45 |          0,00 |             0,45 |           **1,00** |
| `general`    |              **1,00** |              **0,90** |         0,35 |               **1,00** |          0,00 |             0,00 |               0,00 |
| `doble`      |                  0,80 |                  0,75 |         0,30 |                   0,55 |          0,20 |             0,60 |               0,30 |
| `cazaetapas` |                  0,45 |                  0,50 |         0,40 |                   0,45 |          0,50 |         **0,70** |               0,55 |
| `mixta`      |                  0,60 |                  0,60 |         0,50 |                   0,55 |          0,55 |             0,60 |               0,55 |

Los ceros son **prohibiciones**, y son las que el dueño escribió: «no tiene sentido en una clásica de
montaña ni en una vuelta sin llano» (sprinter), «no tiene sentido en una clásica llana ni en una
vuelta de solo llano y crono» (montaña). El resto: calibrar con banco.

### 5.4 Cómo se rellena cada forma (`ROSTER_BY_SHAPE`)

Para escuadras de 8; con 7 se quita el último de la lista; con 4-6 (carreras pequeñas, S-008) se
aplica `ROSTER_SMALL` y **el cupo de fuga baja a 1 y no hay tren**.

| Forma        | Cartas | `gregario_llano` | `gregario_montana` | `lanzador` | `bajador` | `cazaetapas` | `exceptuado` |
| ------------ | -----: | ---------------: | -----------------: | ---------: | --------: | -----------: | -----------: |
| `sprinter`   |      1 |                3 |                  0 |          3 |         0 |            1 |            0 |
| `montana`    |      1 |                2 |                  3 |          0 |         1 |            1 |            0 |
| `general`    |      1 |                2 |                  3 |          0 |         1 |            1 |            0 |
| `doble`      |      2 |                2 |                  2 |          1 |         0 |            1 |            0 |
| `cazaetapas` |      0 |                0 |                  0 |          0 |         0 |            8 |            0 |
| `mixta`      |      1 |                2 |                  2 |          1 |         0 |            1 |            1 |

`ROSTER_SMALL` (5 hombres): 1 carta, 2 gregarios del terreno dominante, 1 cazaetapas, 1 libre.
Es S-008 literal: «con cinco hombres no se controla una llana solo: pacto tácito con otros equipos,
sin tren y con el cupo de fuga en uno».

### 5.5 De la estructura a los papeles del día

Aquí muere `pickLeader` (que «elige al jefe por rol y por el final que dibuja el recorrido, y **nunca
mira la general**», anotado en simulate.ts:2160) y muere el reparto por `kind` de `autoOrders` (que es
S-047, nº 4 de las veinte más graves).

```
papelesDelDia(estructura, format, road, gc, memoria):
  finalPrevisto = road.finalPrevisto                       # el REAL, no el `kind` (S-049)

  # 1. La carta del día sale de las cartas de CARRERA, no del campo entero
  carta = argmax_{c ∈ estructura.cards} finishScore(c, finalPrevisto) · viabilidad(c, gc)
  si  ninguna carta pasa `cardFloor` contra el mejor del campo:
      el equipo NO tiene carta hoy  →  motivos pierden `etapa`  →  cupo de fuga sube (S-050, S-084)

  # 2. Los papeles se derivan del SeasonRole, del terreno y de la frescura de carrera (R08.1)
  para cada m:
      rolDelDia(m) = MAPA[m.seasonRole][terrenoDominante(road)]
      # ejemplos: gregario_llano en reina → dosificar hacia el grupeto tras el primer puerto (S-184)
      #           lanzador en reina        → se va al grupeto (S-407)
      #           bajador                  → arropar en el descenso que importa (S-465)

  # 3. Los exceptuados no reciben papel y no bloquean cupos (§2.8)
  # 4. El humano manda: si escribió una hoja, su rol es el suyo y el árbitro reparte SABIÉNDOLO (S-054)
```

**`cardFloor`** sustituye a `teamStageCardGap` 8 con el mismo espíritu («dejan tres o cuatro equipos
con carta en un campo de ocho») pero medido **contra el grupo**, no contra el campo entero, y
recalculado por km: es lo que cierra S-291 y S-200.

### 5.6 Cuándo cambia la estructura (S-392, S-190, S-409, S-179, S-390, S-483)

Solo por hechos, y cada hecho tiene su regla:

| Causa                              | Efecto                                                                                 | Cuándo                  | Situaciones          |
| ---------------------------------- | -------------------------------------------------------------------------------------- | ----------------------- | -------------------- |
| La carta abandona o queda a > X min| otra hereda; los papeles que le apuntaban degradan a `libre`                            | esa misma noche         | S-190, S-390, S-409  |
| La carta se descuelga en carretera | la carta del día pasa a la segunda opción **en el mismo km** (§2.6 paso 2)              | en carretera            | S-179, S-197, S-291  |
| Un gregario se pone líder de hecho | pasa a `carta` y el anterior a `gregario_lujo`                                          | esa noche               | S-392, S-395         |
| El equipo baja de 3 hombres        | pierde el motivo `equipos`; sus hombres quedan libres                                   | inmediato               | S-396                |
| Un rival de referencia desaparece  | el que era segunda opción **hereda la factura de controlar**                            | esa noche               | S-483                |
| Tercera semana                     | los equipos que perdieron la general se reconvierten a `cazaetapas`                     | día `thirdWeekDay`      | S-389                |
| El equipo pierde el patrocinador   | pierde la jerarquía: todos se meten en todos los intentos y en el sprint van a lo suyo  | al conocerse            | S-469                |

**Tope**: `maxRevisionsPerRace` **3**. Un equipo que cambia de plan cada día no tiene plan.

### 5.7 Los motivos que faltan hoy

Hoy los motivos posibles del frente son **solo tres**: `etapa`, `maillot`, `general`
(`mapa-bancos.md` §7 punto 8, y `TeamPurpose` en `teamPlan.ts:44-52`). Faltan seis, y están en la
tabla de R05.1: `puntos`, `montaña`, `joven`, `equipos`, `combatividad`, `patrocinador`. Sin ellos
«dos tercios del pelotón no tienen ninguna razón para correr» (S-162, nº 13 de las veinte más graves)
y los maillots secundarios se reparten como subproducto de lo que hicieron otros por otras razones.

---

## 6. El jugador humano y el mánager

### 6.1 Qué puede ordenar hoy, y qué se le añade

Hoy son siete palancas, de las cuales `effort` toca **un único término** (±0,5 en el deber de relevo),
`triggerKm` **uno** (×3 / ×0,15 en el apetito) y `contest*` **solo banners** —y `contestClimbs` no lo
lee nadie (S-031, `CONTRARIO`). La consecuencia medida está escrita por el dueño: «el resultado es casi
lo mismo ponga lo que ponga ahí».

| Palanca                       | Hoy                             | Después                                                                       | Cierra                    |
| ----------------------------- | ------------------------------- | ----------------------------------------------------------------------------- | ------------------------- |
| `role`                        | 7 roles                          | los mismos + `bajador`; y **el rol se pide, no se impone** (§2.8)             | S-057, S-058, S-060       |
| `targetRiderId`               | compañero o rival                | igual, + validación (no ciclos, no objetivo ausente)                          | S-059, S-060              |
| `mentality`                   | 4 valores                        | igual; entra en `inclinación` de las 14 intenciones                           | S-069                     |
| `effort`                      | ±0,5 en el turno                 | entra en **turno, apetito, cerillos y pacing de crono**                       | S-068, S-143              |
| `triggerKm`                   | km absoluto                      | + `triggerAt`: pie de puerto N, tramo más duro, pancarta N, km a meta         | S-214, S-322              |
| `contestSprints/Climbs`       | banners, y uno no se lee         | **motivo declarado** (R05): cambia apetito, ruta y cupo, y solo paga quien va | S-031, S-041, S-042       |
| **`objective`** (nuevo)       | —                                | objetivo de la carrera: `general`\|`etapas`\|`montaña`\|`puntos`\|`joven`     | S-022, S-383              |
| **`chasePolicy`** (nuevo)     | —                                | `nunca` \| `si_amenaza` \| `siempre`                                          | S-071, S-215              |
| **`noRelayTo`** (nuevo)       | —                                | lista de equipos/corredores a los que no doy relevos                          | S-256, S-401              |
| **`conditionals`** (nuevo)    | —                                | hasta `maxConditionals` reglas «si X entonces Y» (§6.3)                       | S-321, S-215, S-032       |
| **`role: dosificar`** (nuevo) | —                                | «hoy me voy al grupeto» / «hoy sobrevivo»                                     | S-216                     |

### 6.2 Qué NO puede ordenar, a propósito

- **Cambiar de idea durante la etapa.** Decisión del dueño, sin discusión: «incompatible con avanzar un
  día cada seis horas» (epics N1). Todo lo de §6.3 se escribe antes.
- **Mandar sobre otro corredor humano.** Un humano no es mánager por escribir su hoja.
- **Ver la hoja del rival** (S-416): secretas antes, deducibles del relato después.
- **Órdenes que el motor no puede honrar**: se avisa antes de guardar, no se acepta y se ignora. Es la
  mitad de R22 que hoy falta: «una orden que no cambia nada es peor que no ofrecerla» (S-031).

### 6.3 Las órdenes condicionales (N1)

Gramática mínima, deliberadamente pequeña: **un disparador, una intención, un parámetro**.

```
CUANDO <disparador> [DENTRO DE <ventana>] ENTONCES <intención> [<objetivo>]

disparador := km(N) | kmAMeta(N) | pieDePuerto(N) | tramoMasDuro(ultimoPuerto)
            | pancarta(N) | huecoMayorQue(S) | huecoMenorQue(S)
            | salta(riderId) | miJefeCortado | fugaCuajada | lluvia | capturaDeLaFuga
intención  := atacar | saltar | puentear | relevar | esconderse | marcar | colocar
            | disputar | dosificar | esperar | rematar
```

Precedencia, en una regla: **la primera condicional que se cumple en el orden en que se escribieron
gana, sustituye al compromiso vigente aunque no haya caducado, y consume su cupo por la vía de §2.8.**
Una vez disparada, no se repite. Si el motor no puede honrarla —sin cerillos, energía bajo el mínimo,
fase de tregua, el objetivo ya no está—, **se registra la causa y sale en el informe** (R23.5).

Ejemplos que el catálogo pide textualmente:
- S-215: `CUANDO huecoMayorQue(120) ENTONCES relevar`
- S-321: `CUANDO salta(rival-7) ENTONCES saltar rival-7`
- S-322: `CUANDO tramoMasDuro(ultimoPuerto) ENTONCES atacar`
- S-032: `CUANDO lluvia DENTRO DE km(40) ENTONCES colocar banda1`
- S-256: `chasePolicy` + `noRelayTo: [team-9]`

`maxConditionals` **3**. Más de tres es un programa, y un programa que el jugador no puede depurar es
peor que ninguno.

### 6.4 Cómo conviven órdenes humanas y bots en un mismo equipo

El defecto de hoy está medido y es de una línea: `autoStageOrders` se calcula **sobre el equipo
completo sin conocer las filas humanas** (`stageRun.ts:286-300`), así que «si el humano es el mejor SPR
del equipo en una llana, los bots reciben “lanzador de X” y “gregario de X” aunque X haya escrito
`libre`». Es S-054 y S-060.

**Regla nueva, y es la que cierra el racimo:**

```
repartirPapeles(equipo, día):
  humanas = filas de stage_orders de este equipo y día        # ← SE LEEN PRIMERO
  1. Cada humana FIJA el papel de su corredor y su grado (§2.8).
  2. Las cartas que las humanas reclaman se conceden por orden de: estructura > general > remate > id.
     El que no la obtiene y la pidió pasa a `rebelde` (con coste, R25.1) — nunca a lanzador de sí mismo.
  3. El árbitro reparte los cupos RESTANTES entre los bots, sabiendo lo que pusieron los humanos.
  4. Ningún bot recibe un objetivo que apunte a un corredor que declaró `libre` o `exceptuado` (S-058).
  5. Se detectan y rompen ciclos: A trabaja para B y B para A (S-060).
```

### 6.5 El mánager (G2)

Modelo de `epics.md` G2, respetado tal cual: «Todo jugador es un CICLISTA. Unos pocos son ADEMÁS
mánager». «Pagar da AUTORIDAD, no vatios». «POLÍTICAS en vez de órdenes, aplicada en dos niveles: el
mánager fija el plan del equipo y cada corredor escribe el suyo dentro de ese marco».

Lo que este diseño le da al mánager, y **ni un vatio más**:

| Palanca del mánager   | Qué fija                                      | Situaciones     |
| --------------------- | --------------------------------------------- | --------------- |
| `shape` + `cards`     | la estructura de la carrera (§5.1)            | S-002, S-026    |
| `motives` ordenados   | a qué va el equipo                            | S-020, S-162    |
| `chasePolicy`         | la política de caza del día                   | S-071, S-215    |
| `budget[]`            | en qué días se gasta                          | S-055, S-405    |
| `exceptuados`         | a quién se le da carta blanca                 | S-024, S-053    |
| convocatoria          | quién va, con las reglas duras de §5.2        | S-011, S-028    |

Y las tres consecuencias que G2 exige y que este diseño hace posibles porque ya tiene los contadores:
**transparencia** (el corredor ve el plan del equipo antes de escribir su hoja, S-023), **voz** (puede
responder con su hoja dentro del marco, S-026) y **precio de abusar** (R25.3: nombrarse carta siempre
mueve la moral de los humanos del equipo, sin regla que lo prohíba).

---

## 7. Los bancos que hacen falta

Regla de la casa que se respeta entera: **presupuesto ≥ 4× el coste medido en CI**, no estimado. Y la
doctrina del dueño: «si el cambio saca un objetivo de banda, el que está mal es el cambio».

### 7.1 El principio que ordena los bancos nuevos

Los 46 invariantes de hoy tienen una ceguera declarada y es exactamente la de este encargo:
**«Ninguno corre con órdenes del jugador ni con un campo de menos de 18 equipos, salvo 21-24 (8×5,
solo para la voz de la crónica)».** Los seis bancos nuevos atacan las 22 cegueras de
`mapa-bancos.md` §7 por orden de lo que este diseño cambia.

### 7.2 Banco `equipos` — composición, coordinación y estructura (cegueras 2, 3, 4, 6)

**Escenario**: `llana-180` y `reina-150` con `teamedField` 22×8, más un escenario `pareja` ad hoc
(grupos de 4-8 con una pareja del mismo equipo y el resto sueltos, 200 semillas, sin simular etapa
entera: solo el último tercio).

| Estadística                             | Racimo | Banda propuesta | Por qué                                               |
| --------------------------------------- | ------ | --------------- | ----------------------------------------------------- |
| `fugaMismoEquipoPct` (fuga < 10)        | R03    | 0-15 %          | S-083: el pelotón no da cuerda a tres de la misma casa|
| `equiposRepresentadosPct` (llana)       | R03    | 25-60 %         | 5-13 equipos de 22 en la fuga del día                 |
| `parejaWinPct`                          | R02    | 45-65 %         | al azar 33 %: dos contra uno gana más                 |
| `compañerosQueSeDisputanElSprintPct`    | R02    | 0-2 %           | S-357, `CONTRARIO`                                    |
| `relevosConHombreDelantePct`            | R01    | 0-8 %           | S-128                                                 |
| `rolesPct.gregario`                     | R21    | 35-55 %         | hoy 70 % (deuda §14 punto 14)                         |

**Coste**: llana 22×8 × 60 semillas ≈ 105 s local ≈ 190 s CI; reina ídem ≈ 175 s; `pareja` 200
semillas de un tercio de etapa ≈ 25 s. **Total ≈ 390 s CI → presupuesto 1.600 s.**

### 7.3 Banco `carrera-pequeña` — el que hoy NO EXISTE (ceguera 1)

Es la primera ceguera de la lista y la que el encargo nombra: «Nada mide una carrera de 5-10 equipos de
4-6 (ni con órdenes, ni con general)». Los canónicos son 176 en 22×8; los generados ≥ 18×7 = 126; el
único campo pequeño de CI es `teamedField` 8×5 = 40 y solo para la voz de la crónica.

**Escenario**: 6 carreras reales pequeñas del calendario (Almería, Provence, Tramuntana, Bességes y
dos nacionales), campo de **7 equipos × 5** = 35 más 5 agentes libres, **con general** y **con órdenes
automáticas**, 8 corridas cada una.

| Estadística                        | Banda propuesta | Por qué                                                            |
| ---------------------------------- | --------------- | ------------------------------------------------------------------ |
| `frenteSinDueñoPct`                | 25-70 %         | S-008: con cinco hombres no se controla solo; pacto tácito         |
| `breakawayWinPct`                  | 20-50 %         | campo modesto: la fuga gana mucho más (S-229)                      |
| `trenesReconocibles`               | 0-2             | sin tren, por cupo (`ROSTER_SMALL`)                                |
| `alianzasPorEtapa`                 | 0,3-2,0         | R20.4                                                              |
| `winnerGroupPct` en llana          | 70-100 %        | más ancha que el 85-100 de campo grande: 35 hombres se parten antes|

**Coste**: 6 carreras × ~5 etapas × 8 corridas × 40 corredores. Un campo de 40 cuesta ≈ 1/4 de uno de
176: ≈ 95 s local ≈ 170 s CI. **Presupuesto 700 s.**

### 7.4 Bancos `pancartas`, `sprint`, `colocacion`, `incidentes`, `ordenes` (cegueras 7, 17, 19)

Los cinco comparten escenario con bancos existentes y **solo añaden contadores**, así que su coste
marginal es ~0 salvo el de `ordenes`.

| Banco        | Escenario                                       | Estadísticas y bandas                                                                                 | Coste marginal |
| ------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------- |
| `pancartas`  | `smallTours` (ya corre)                          | `contendientesPorPancarta` 3-15 · `costePagadoPorNoContendientes` **= 0** (duro) · `aceleronAntesDeCima` +1,5..+5 km/h | 0 |
| `sprint`     | `llana-180` con 5 trenes (ya corre)              | `trenesReconocibles` 2-5 · `lanzadoresPorTren` 1,4-3,0 · `encajonadosPorSprint` 1-6                    | 0              |
| `colocacion` | `llana-180` + una clásica de pavé (ya corren)    | `costeDeLaBanda4Pct` 5-12 % · `abanicosConAutorPct` 40-90 % · `bandaDeLosCortadosMediana` 2,8-4,0      | 0              |
| `incidentes` | `grandTour` (ya corre 12 vueltas)                | `pinchazosPorEtapa` 2-6 · `segundosPorPinchazo` 25-70 s · `ventajaDelCocheDelLider` 20-40 s · `treguasConcedidasPct` 40-80 % | 0 |
| `ordenes`    | **nuevo**: `llana-180` y `reina-150`, un humano | barrido de una palanca a la vez, 16 semillas por valor                                                 | **+220 s CI**  |

El banco `ordenes` es el que responde a «el resultado es casi lo mismo ponga lo que ponga ahí». Mide
`Δpuesto` del corredor al variar **una sola** palanca, con todo lo demás igual:

```
leverEffect(palanca, v1, v2) = |puestoMedio(v1) − puestoMedio(v2)|
banda:   leverEffectMin (3 puestos) ≤ leverEffect ≤ leverEffectMax (60 puestos)
```

El suelo dice «esta palanca hace algo»; el techo dice «esta palanca no es el juego entero». Ambas se
exigen para las siete palancas de hoy y las cinco nuevas.

### 7.5 Banco `informacion` — el brazo de control (cegueras 21, y R24 entero)

El único banco de este documento que corre **dos veces el mismo escenario**: con la capa de información
y sin ella. Es lo que permite atribuir.

```
control:  boardLagKm = 0, boardErrorSlope = 0, boardSpin = 0, newsLagKm = 0, señales = verdad
real:     los valores de §3.3/§3.4
```

| Estadística                                | Banda (real)  | Banda (control) | Por qué                                             |
| ------------------------------------------ | ------------- | --------------- | --------------------------------------------------- |
| `cazasQueLleganTardePct`                   | 8-25 %        | 0-3 %           | S-458: hoy las cazas salen siempre clavadas         |
| `diffEquiposBuenosVsMalos` (puestos)       | 3-15          | 0-2             | S-014: los malos ven peor, no pedalean peor         |
| `falsosPositivosDeSangrePct`               | 15-40 %       | 0 %             | S-488: oler la sangre puede fallar                  |
| `rescatesSobreInformacionErronea`          | 5-25 %        | 0 %             | S-478: «a veces el que se para no era el que hacía falta» |
| **Reproducción bloque a bloque**           | —             | **exacta**      | invariante duro: el control = el motor de hoy       |

**Coste**: `llana-180` y `reina-150` × 30 semillas × 2 brazos ≈ 175 s CI. **Presupuesto 700 s.**

### 7.6 Banco `temblor` — el invariante que este diseño necesita y nadie tiene

Es la contribución propia del modelo de agentes: si las decisiones oscilan bloque a bloque, la carrera
puede salir con números correctos y ser **ilegible**. No hay ningún banco hoy que lo vea. Coste
marginal 0 (son contadores sobre escenarios que ya corren).

| Estadística                          | Banda propuesta | Por qué                                                          |
| ------------------------------------ | --------------- | ---------------------------------------------------------------- |
| `cambiosDeIntencionPorCorredorEtapa` | 2-9             | menos de 2 es un motor rígido; más de 9 es temblor                |
| `frontHandoversPorEtapa`             | 1,8-4           | ya existe (`frontTeamsPerStage`), se conserva y se reinterpreta   |
| `compromisosMasCortosQueSuMinimoPct` | **= 0**         | invariante duro: `commitMinKm` se respeta                         |
| `oscilacionesAB` (A→B→A en < 3 km)   | 0-5 %           | el patrón exacto del temblor                                      |

### 7.7 Invariantes nuevos (ocho)

Al lado de los 46 de hoy, que se conservan:

47. **La capa de información se puede apagar**: con las constantes de control, el motor reproduce hoy
    bloque a bloque (§7.5). Es la prueba de separación de L2.
48. **`commitMinKm` se respeta**: `compromisosMasCortosQueSuMinimoPct == 0`.
49. **Ningún corredor sin intención**: todo agente tiene compromiso vigente en todo bloque.
50. **Ningún cupo doble**: no hay dos corredores del mismo equipo con el mismo `ClaimKind` exclusivo.
51. **Nadie paga una pancarta que no disputó**: `costePagadoPorNoContendientes == 0` (S-031).
52. **El humor tiene causa**: `humorSinCausa == 0` (R09.1).
53. **Sin equipos, el motor se comporta como sin equipos**: la versión de hoy del invariante 24
    extendida a los cupos (un campo entero de agentes libres no crea ningún `TeamClaim`).
54. **Determinismo por agente**: correr la misma etapa con la lista de corredores permutada da el
    mismo resultado bit a bit (hoy se garantiza por el orden canónico; con 176 subflujos hay que
    probarlo).

### 7.8 Coste total en minutos de CI

| Concepto                                                    | Coste CI medido/estimado | Presupuesto (×4) |
| ----------------------------------------------------------- | -----------------------: | ---------------: |
| Job `benches` de hoy                                        |             ~540 s (9 min) |                — |
| Banco `equipos` (§7.2)                                      |                    390 s |          1.600 s |
| Banco `carrera-pequeña` (§7.3)                              |                    170 s |            700 s |
| Banco `ordenes` (§7.4)                                      |                    220 s |            900 s |
| Banco `informacion`, dos brazos (§7.5)                      |                    175 s |            700 s |
| `pancartas`, `sprint`, `colocacion`, `incidentes`, `temblor`|                      ~0 s |                — |
| **Sobrecoste de los bancos nuevos**                         |         **≈ 955 s (16 min)** |                  |

Y el **sobrecoste del motor**, que es el que de verdad preocupa (§14 punto 40: «el motor se ha frenado
un 48 % en dos versiones»):

- **Percepción** (L2): construir tres vistas por agente y por tick. Con `groupScanMax` 24 y el
  escalonado de §2.3, son 17,6 agentes por bloque × ~30 lecturas = **~530 operaciones por bloque**,
  contra las ~176 evaluaciones de física que ya se hacen. Estimado: **+25 %**.
- **Decisión** (L3): 14 utilidades × 17,6 agentes = **~250 evaluaciones por bloque**, la mayoría
  cortadas por precondición. Estimado: **+15 %**.
- **Arbitraje** (L4): 22 equipos × 8 cupos cada 10 bloques = **~18 operaciones por bloque**. **~0 %**.

**Total estimado: +40 % de coste de motor.** Sobre las 12 vueltas del invariante 25 (~1.230 s CI) eso
son ~1.720 s, dentro de su timeout de 5.400 s. Sobre el invariante 37 (912 s con 4 corridas) hay que
**medirlo antes de subir a 8 corridas**, y si no cabe se recorta la muestra, no la banda. Va en §10,
decisión 13.

---

## 8. Plan de implementación por pasos

Reglas para todos los pasos, heredadas de la casa: `pnpm typecheck && pnpm test:rapido` en verde; si
toca `packages/engine`, también `pnpm test:bancos`; cada cambio de conducta sube `ENGINE_VERSION` y
deja su entrada en `docs/balance.md`; toda constante nueva en `constants.ts` con su comentario de
intención; comentarios y docs en español, UI en inglés; `Date.now()` y `Math.random()` prohibidos. **Un
PR por paso, y los que suben `ENGINE_VERSION` no se juntan entre sí.**

Y una regla que este documento se aplica a sí mismo, igual que el de entrenamiento: **ningún paso
puede decir «sin tocar bandas» si toca la decisión**; la columna «Huellas / bandas» lista las exactas y
§9 las junta todas.

El orden es **por dependencia, no por importancia**. S-176 es la nº 1 de las veinte más graves y se
arregla en el paso 6, porque antes hace falta que exista la general virtual.

| #   | Paso                                                                                                                                                                                                       | Racimos que cierra                | Ficheros                                                                                              | Huellas / bandas                                                       | Hecho cuando                                                                                                                | Modelo |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------ |
| 0   | **Foto antes.** Contadores de §7.2-§7.6 **sin banda**, sobre los escenarios que ya corren. Publicar en `balance.md` v60 §0 el valor de hoy de las 22 estadísticas nuevas.                                   | ninguno                           | `sim/*.ts`, `sim/targets.ts`                                                                          | **ninguna**: solo mide                                                 | las 22 salen en `pnpm sim`; ninguna aserción nueva                                                                            | Haiku  |
| 1   | **Percepción, identidad.** `stage/perception.ts` con `SelfView`, `GroupView`, `RaceView` **sin retardo, sin error, sin señales**. `MoveRider` y `finishStage` pasan a recibirlos. `teamIndex`.              | R01 (identidad)                   | `stage/perception.ts`, `tactics.ts`, `finish.ts`, `simulate.ts`, `types.ts`                           | **NINGUNA. Es la prueba del refactor**: las tres huellas idénticas     | `attribution/timetrial/raceRadio` bit a bit iguales; `grep teamId stage/tactics.ts` > 0; los 46 invariantes verdes            | Sonnet |
| 2   | **Agente y compromiso.** `stage/agent.ts`, las 14 intenciones **con la utilidad de hoy dentro** (cada una envuelve el cálculo actual), `Commitment`, histéresis, duración, escalonado, `rngAgent`.          | R18 (turno), R19 (parcial)        | `stage/agent.ts`, `stage/intents/*.ts`, `simulate.ts`, `constants.ts`                                 | **mueve las tres**: el turno deja de rehacerse cada 100 m → re-sellar  | `ENGINE_VERSION++`; banco `temblor` dentro de banda; `kmPorTurnoMediana` 0,6-2,5; invariantes 48-49-54                        | Sonnet |
| 3   | **Cupos y arbitraje.** `stage/team.ts` con `ClaimKind`, `arbitrar()`, orden de cupos, `frontTeamId` como cupo. `chase.ts` **se borra**.                                                                     | R02, R20 (parcial)                | `stage/team.ts`, `teamPlan.ts`, `chase.ts` (borrar), `simulate.ts`                                    | `chronicle.frontTeamsPerStage`, `teamPullFlatPct`                      | `ENGINE_VERSION++`; invariante 50; `parejaWinPct` 45-65; `compañerosQueSeDisputanElSprint` ≤ 2 %                              | Sonnet |
| 4   | **Estructura y papeles.** `world/structure.ts`, las seis formas, `ROSTER_BY_SHAPE`, convocatoria por baza. **Muere `pickLeader`**; `autoOrders` deja de decidir por `kind`.                                 | R21, R05 (motivos)                | `world/structure.ts`, `world/callups.ts`, `world/autoOrders.ts`, `teamPlan.ts`, `db/stageRun.ts`      | `rolesPct`, `bestSprinterWinPct`, `sweepPct`, `photoRepeatTopFive`      | `ENGINE_VERSION++`; `rolesPct.gregario` 35-55 %; `estructuraCoherentePct` ≥ 95 %; ningún lanzador sin sprinter                | Sonnet + dueño |
| 5   | **Clasificaciones y motivos.** Los nueve motivos, `standings` por corredor, pancartas como puntos del trazado, bonificaciones de pancarta.                                                                  | R05, R06, R07                     | `stage/banners.ts`, `db/classifications.ts`, `stage/perception.ts`, `constants.ts`                     | invariante 51; `flat.breakawayWinPct`                                  | `ENGINE_VERSION++`; nadie paga una pancarta que no disputó; los maillots secundarios cambian de manos                        | Sonnet |
| 6   | **General virtual y aduana como voto.** R04 entero, R03 entero. `pelotonAllows` **se borra**. `gcControlLeash` 700 **se retira**.                                                                           | R03, R04                          | `stage/gc.ts`, `stage/team.ts`, `tactics.ts`, `constants.ts`                                          | **grande**: `flat/mountain.breakawayWinPct`, `catchKmToFinish`, `flatMoveWorstMarginS` | `ENGINE_VERSION++`; `cuerdaMediaPorDia` decrece ≥30 % del día 3 al 19; `fugaMismoEquipoPct` ≤ 15 %; `objetivoDeLaCazaCorrectoPct` ≥ 80 % | Sonnet + dueño |
| 7   | **Fases y la retirada de los dos topes.** R19 entero: fuera `tacticMaxMoves` y `closingNow`; ventana tras captura; flyer; puente desde atrás.                                                               | R19                               | `stage/phase.ts`, `simulate.ts`, `tactics.ts`, `constants.ts`                                         | `intentosPorEtapa`, `flat.breakawayWinPct`, `catchKmToFinish`           | `ENGINE_VERSION++`; `intentosDespuesDelKm100` ≥ 3; `flyerWinPct` 1-6 %                                                        | Sonnet |
| 8a  | **Posición por bandas.** R15 salvo el exponente del pavé: acordeón, `colocar`, rueda, `cortar`, aforo con ancho, bajador.                                                                                   | R15 (casi entero), R12.7          | `group.ts`, `stage/placement.ts`, `simulate.ts`, `constants.ts`                                        | `mediaGroups`, `mediaOneGroupPct`, `flatWinnerGroupPct`, huellas        | `ENGINE_VERSION++`; `abanicosConAutorPct` 40-90 %; `costeDeLaBanda4Pct` 5-12 %                                                | Sonnet |
| 8b  | **(Física) Exponente del pavé** (S-480, deuda §14 punto 17). **Tanda propia**, como el paso 14 del diseño de entrenamiento.                                                                                | R15 (S-480)                       | `stage/physics.ts`, `constants.ts`                                                                     | huellas + pavé 5-12 % + `realQueens`                                    | `ENGINE_VERSION++` solo; medición antes/después publicada                                                                     | Sonnet + dueño |
| 9   | **Tren, final por grupo, remate.** R16 y R17: tren desde los 15 km, ascenso, choque de trenes, quién abre y a cuántos metros, encajonado con causa, último giro.                                            | R16, R17                          | `stage/finish.ts`, `stage/train.ts`, `simulate.ts`                                                     | `bestSprinterWinPct` (dos bandas), `sameWinnerPairPct`, `medianLeadGroupRiders` | `ENGINE_VERSION++`; `abreElPeorRematador` 55-85 %; `medianLeadGroupRiders` 3-12                                      | Sonnet |
| 10  | **Información imperfecta.** R24 entero: pizarra con retardo/redondeo/error/sesgo, señales del rival, capitán de ruta, órdenes malas. **Con brazo de control desde el primer commit.**                       | R24, R13.1                        | `stage/perception.ts`, `stage/board.ts`, `world/structure.ts`, `constants.ts`                          | **todas las de caza y montaña**; invariante 47                          | `ENGINE_VERSION++`; el brazo de control reproduce el paso 9 bit a bit; `cazasQueLleganTardePct` 8-25 %                        | Sonnet + dueño |
| 11  | **Incidentes y caravana.** R11 y R12: pinchazo, avería, coche, ascensor, tregua con autor, rescate escalonado, taponamiento.                                                                                | R11, R12                          | `stage/mishap.ts`, `stage/caravan.ts`, `simulate.ts`, `abandon.ts`                                     | `abandonCauses.*`, `grandTour.abandonPct`                              | `ENGINE_VERSION++`; `pinchazosPorEtapa` 2-6; `treguasConcedidasPct` 40-80 %; el corte de la crono deja de estar dormido       | Sonnet |
| 12  | **Memoria entre etapas.** R08, R09, R10, R25: `race_memory`, humor con causa (fuera el dado), deudas, presupuesto por día, moral, confianza.                                                                | R08, R09, R10, R25                | `db/raceMemory.ts`, `db/schema.ts`, `db/stageRun.ts`, `stage/perception.ts`                            | invariante 52; `grandTour` entero                                       | `ENGINE_VERSION++` + migración; `humorSinCausa == 0`; `varianzaDelHumorEntreSemillas == 0`                                    | Sonnet |
| 13  | **Grupeto y corte.** R26: readmisión que mira el número, capo, corte estimado, criba en todos los grupos, `mainId` de referencia.                                                                           | R26                               | `simulate.ts`, `stage/grupeto.ts`, `constants.ts`                                                      | **`queenLastGroupPct` 8-14 y `realQueens.lastGroupPct` 7-14**          | `ENGINE_VERSION++`; `eliminadosPorCortePorVuelta` 0-6; la cola pasa del 14 % (decisión del dueño)                              | Sonnet + dueño |
| 14  | **Clima y crono.** R14 (viento longitudinal, lluvia que va y viene, abanico que se cierra) y R27 (pacing por corredor, referencias, incidentes, orden de salida).                                           | R14, R27                          | `stage/weather.ts`, `stage/timetrial.ts`, `stage/startOrder.ts`                                        | `timeTrials.tailPct`, `worstStagePct`; huella `timetrial.test.ts`      | `ENGINE_VERSION++`; `incidentesEnCronoPct` 1-4 %; `abanicosQueSeCierran` 40-90 %                                              | Sonnet |
| 15  | **Formato.** R28: `RaceFormat` leído por estructura, fases y voto; etapa 1 con general; clásica sin mañana; etapa corta; circuito; neutralizado.                                                            | R28                               | `world/format.ts`, `world/structure.ts`, `stage/phase.ts`                                              | `smallTours` entero                                                     | `ENGINE_VERSION++`; `velocidadPrimeraHora` 35-52 correlacionada con la aduana                                                 | Sonnet |
| 16  | **Órdenes del jugador v2 y mánager.** R22 y §6: motivo, política, `noRelayTo`, condicionales, `triggerAt`, aviso de orden imposible, reparto que lee las humanas primero, palancas del mánager.             | R22, R06(§6)                      | `contracts.ts`, `db/schema.ts`, `db/stageRun.ts`, `api/routes/races.ts`, `web/pages/RaceOrders.tsx`   | banco `ordenes`                                                         | migración; `leverEffect` de las 12 palancas dentro de banda; ninguna orden imposible se guarda sin aviso                       | Sonnet |
| 17  | **Relato.** R23: `reason` del compromiso a la crónica, a quién se persigue, tres nombres + recuento, informe que no re-simula, orden cruzada con lo que pasó.                                               | R23                               | `stage/journal.ts`, `db/raceReport.ts`, `apps/api`                                                     | `coherence` entero; huella `raceRadio.test.ts`                          | `pullReasonSinNombrePct` ≤ 5 %; `ataqueSinCerrar == 0`; el informe lee eventos congelados                                     | Haiku  |
| 18  | **Calibrar y sellar.** Barrido de las constantes marcadas «calibrar con banco»; todas las bandas de §9 a ≥ 2× la desviación entre semillas; nota v60 con tablas antes/después; SPEC y `docs/motor.md` §13 reescritos. | —                          | `sim/targets.ts`, `sim/*.test.ts`, `constants.ts`, `SPEC.md`, `docs/motor.md`, `docs/balance.md`      | **todas: es el paso donde se sella el bloque de §9**                    | CI verde; las 30 bandas viejas y las 22 nuevas dentro; ninguna sentada sobre su suelo                                          | Sonnet + dueño |

**Orden y paralelismo.** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8a → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 →
17 → 18. El 8b va cuando lo decida el dueño y **nunca en el mismo PR que el 8a**. Los pasos 16 y 17
pueden ir en paralelo con 11-15 (no comparten ficheros salvo `constants.ts`). Los pasos 0 y 1 no
cambian ninguna conducta y son la red antes de todo lo demás: **si el paso 1 no sale bit a bit, el
resto no empieza.**

**Por qué este orden.** La cadena de dependencias reales, no de importancia:

- 1 antes que todo: sin identidad de equipo en la capa que decide, ninguna regla de equipo se puede
  escribir. Es la ausencia madre.
- 2 antes que 3: los cupos se conceden a compromisos; sin compromiso no hay a qué concederlos.
- 4 antes que 5 y 6: los motivos y la general virtual los declara la estructura.
- 6 antes que 7: retirar los topes de la capa táctica sin una aduana que funcione desata la carrera.
- 8a antes que 9: el tren y el encajonado necesitan bandas.
- 10 después de 9: la capa de información se mete cuando las decisiones ya están en su sitio, para
  poder atribuirle a ella lo que se mueva.
- 13 después de 12: el corte necesita la cuenta que se arrastra de ayer.
- 18 al final, siempre.

**Qué modelo.** `Haiku` para los pasos 0 y 17 (contadores y plantillas, sin decisión de diseño).
`Sonnet` para el resto. **`Sonnet + dueño`** marca los seis pasos en los que hay una decisión de §10
dentro y no se puede programar sin respuesta: 4, 6, 8b, 10, 13 y 18.

---

## 9. Lo que esto mueve y hay que decidir en bloque

Todo en una tabla. **Nada de esto se mueve en silencio**: cada fila se propone aquí, se mide en su
paso y se sella en el 18.

### 9.1 Bandas existentes

| Banda / dónde                                       | Hoy       | Propuesto  | Paso | Por qué                                                                                                     |
| --------------------------------------------------- | --------- | ---------- | ---- | ----------------------------------------------------------------------------------------------------------- |
| `flat.breakawayWinPct`                              | 5-16 %    | **5-16 %** | 6,7  | **no se mueve**: es la banda del dueño («centrada en el 10 %»). Si la aduana por voto la saca, el que está mal es el cambio |
| `mountain.breakawayWinPct`                          | 25-45 %   | **12-40 %**| 6    | hoy mide 18,1 % y el dueño lo dio por bueno («está bien así», v44). La banda de 25-45 **no la cumple nadie**: o se baja o se declara objetivo. **Decisión 5** |
| `flat.catchKmToFinish`                              | 8-25 km   | **6-25 km**| 6,7  | la ventana tras captura (R19.3) y el flyer meten capturas más tardías                                       |
| `mountain.top10GapSeconds`                          | 40-300 s  | **40-300 s**| 9   | no se mueve; se re-mide tras R17.4 (el grupo de cabeza de 5-15 la comprime por arriba)                       |
| `chronicle.teamPullFlatPct`                         | 50-85 %   | **65-95 %**| 3    | con cupos, el frente **siempre** tiene dueño salvo pulso declarado: el suelo de hoy describe la ausencia de plan |
| `chronicle.frontTeamsPerStage`                      | 1,8-4     | **1,8-4**  | 3    | no se mueve: es exactamente la banda de temblor que este diseño necesita                                     |
| `chronicle.teamPullWithReasonPct`                   | 95-100 %  | **100 %**  | 17   | con `Commitment.reason` la razón no puede faltar: pasa de banda a invariante duro                            |
| `grandTour.abandonPct`                              | 12-20 %   | **12-22 %**| 11   | pinchazos, averías y taponamientos añaden bajas; el techo sube 2 puntos                                      |
| `grandTour.queenLastGroupPct`                       | 8-14 %    | **7-18 %** | 13   | **la clave de R26**: cribar los grupetos que ya no son la carrera exige pasar del 14 %. Es la deuda §14 punto 2, «no se mueve sin decisión del dueño». **Decisión 7** |
| `realQueens.lastGroupPct`                           | 7-14 %    | **7-18 %** | 13   | misma causa                                                                                                  |
| `realQueens.worstStagePct`                          | 0-18 %    | **0-18 %** | 13   | no se mueve: el techo es `timeCutQueen`, no calibración                                                      |
| `abandonCauses.crashPct`                            | 30-67 %   | **28-60 %**| 11   | al existir el pinchazo, la caída deja de ser la única causa mecánica; el reparto se acerca al 45/50/5 de §VI.3 |
| `abandonCauses.illnessPct`                          | 20-67 %   | **25-67 %**| 12   | la condición que dura días (R08.3) sube la enfermedad, que es la deuda §14 punto 13                          |
| `abandonCauses.outOfTimePct`                        | 1-15 %    | **2-18 %** | 13   | **cambia de significado**: hoy la readmisión es incondicional y no se va nadie                               |
| `smallTours.bestSprinterWinPct`                     | 25-60 %   | **25-60 %**| 9    | no se mueve; se re-mide tras el tren de 15 km y el encajonado                                                |
| `smallTours.sweepPct`                               | 0-30 %    | **0-25 %** | 9,12 | la memoria del pelotón (R09.3) acorta la cuerda al ganador de ayer                                           |
| `smallTours.sameWinnerPairPct`                      | 15-55 %   | **12-50 %**| 9,12 | misma causa                                                                                                  |
| `smallTours.mediaGroups`                            | 3-8       | **3-9**    | 8a   | el acordeón y el corte con autor parten más la media montaña                                                 |
| `smallTours.mediaOneGroupPct`                       | 0-20 %    | **0-12 %** | 8a   | el techo de hoy es «el margen que se puede sostener», no la diana                                            |
| `smallTours.flatWinnerGroupPct`                     | 85-100 %  | **80-100 %**| 8a  | R15.1 rompe algo más el llano                                                                                |
| `smallTours.flatMoveWorstMarginS`                   | 0-900 s   | **0-900 s**| 6    | no se mueve: es la banda del dueño («8, 15 o 20 minutos, de vez en cuando»)                                  |
| `timeTrials.tailPct`                                | 8-15 %    | **8-16 %** | 14   | el pacing por corredor (R27.1) ensancha la cola por abajo                                                     |
| `timeTrials.worstStagePct`                          | 0-17 %    | **0-18 %** | 14   | misma causa                                                                                                  |
| `calendarQueens.breakawayWinPct`                    | 6-30 %    | **6-35 %** | 6    | `perfilDelDia` (R03.3) manda escaladores a la fuga de una reina: sube el techo                                |
| **DEUDA** `medianLeadGroupRiders`                   | 1, sin banda | **3-12**| 9    | deja de ser DEUDA impresa y pasa a banda. **Decisión 6**                                                     |
| Ganador en solitario en media montaña               | 4 %, sin banda | **12-32 %** | 7,9 | deuda §14 punto 4: «20-30 % que pidió el dueño»                                                        |

### 9.2 Invariantes

| Invariante                          | Hoy                        | Propuesto                                            | Paso |
| ----------------------------------- | -------------------------- | ---------------------------------------------------- | ---- |
| 3 · captura                         | `capturePct > 85`          | **> 80**: la ventana y el flyer dejan más sin cazar  | 7    |
| 18 · el que releva se desgasta más  | `> 1,10`                   | **> 1,10**, y se añade banda 4 vs banda 1 **> 1,05** | 8a   |
| 21-24 · voz de la crónica           | `teamedField` 8×5          | **también 7×5 con general** (banco pequeño)          | 3    |
| 24 · campo sin equipos              | ningún `rider_defies_team` | **+ ningún `TeamClaim`** (invariante 53)             | 3    |
| 28 · las tres puertas               | suma 100                   | **suma 100 con cuatro puertas** (+ mecánica)         | 11   |
| 34 · Giro e9                        | `biggestGroupPct ≤ 33`     | **≤ 33** (no se mueve)                               | —    |
| 44 · pavé                           | 5-12 %                     | **5-14 %** con pinchazos                             | 11   |
| **47-54** (ocho nuevos)             | —                          | §7.7                                                  | 1-12 |

### 9.3 Huellas selladas

| Huella                       | Paso que la mueve                    | Causa que se escribe en `balance.md`                                            |
| ---------------------------- | ------------------------------------ | -------------------------------------------------------------------------------- |
| `attribution.test.ts`        | 2, 3, 6, 7, 8a, 8b, 9, 10, 13        | una re-selladura por paso, con la medición antes/después de la etapa afectada    |
| `raceRadio.test.ts`          | 2 (motivos del relevo), 17 (formato) | los motivos pasan a salir del compromiso; el tope de tres nombres cambia          |
| `timetrial.test.ts`          | **14 y solo 14**                     | pacing por corredor e incidentes; hasta entonces **no se toca**                  |
| `simulate.test.ts` (2.722 l.)| todos                                 | es de unidad, se actualiza con cada paso                                          |

**La regla de re-sellado**: se re-sella cuando el cambio está declarado, atribuido a una causa
nombrada y anotado con la medición antes/después. Precedente: `attribution.test.ts:320-355`, «RESELLADA
EN LA v49», `reina-150-0` de 9 relojes a 44.

### 9.4 Constantes que se RETIRAN

| Constante                        | Valor hoy | Por qué se retira                                                              |
| -------------------------------- | --------- | ------------------------------------------------------------------------------ |
| `tacticMaxMoves`                 | 3         | S-444: un contador de grupos no puede decidir si se puede intentar algo         |
| `closingNow` (como veto)         | —         | S-487: apaga la capa táctica justo cuando salta el bueno                        |
| `gcControlLeash`                 | 700 s     | S-391: sustituida por `recuperable(r, road)` (R04.2)                            |
| `breakScore` (`0,5·TAC+0,3·LLA+0,2·RES`) | — | S-433: sustituida por `perfilDelDia(r, road)`                                   |
| `pickLeader` / `leaderScore`     | —         | S-062, S-047: la carta sale de la estructura                                    |
| `chaseField` / `chaseForce`      | —         | S-229: una foto de salida sobre `eff0` que no ve descuelgues ni abandonos       |
| `pelotonAllows`                  | —         | S-114: la cuerda sale de un voto, no de un dado                                 |
| `pelotonMoodCentre/Spread`       | 0,9/0,14  | S-224: el humor tiene causa                                                     |
| `windPlacementLuck`              | 10        | S-460: baja a 4; el resto lo explica la banda                                   |
| `giveUpLambda` (vetos por rol)   | —         | S-135, S-139: lo que decide es lo que se juega, no el rol                       |

---

## 10. Decisiones que son del dueño

Cada una con recomendación. El valor recomendado es el que se implementa si no hay respuesta.

| #   | Decisión                                                                                                                                                                                  | Recomendación                                                                                                                                                                                                                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **¿Se rehace la capa de decisión entera o se sigue parcheando?**                                                                                                                            | **Rehacer L2-L4, conservar L0-L1.** Es el encargo, y el diagnóstico lo sostiene: 237 de 494 situaciones no existen o salen al revés, y la causa común es que el fichero donde se decide no sabe qué es un equipo. Parchear sale más caro: cada parche mueve las huellas de los otros 27 racimos.                                             |
| 2   | **Cadencia de decisión: 1 km por agente (escalonado) o 2 km.**                                                                                                                              | **1 km.** Es la cadencia que el dueño ya nombró («quizás no cada 100 metros, pero quizás cada km») y la que el motor ya usa para el pelotón. El coste se controla con el escalonado (§2.3): el 10 % del campo por bloque. Si el paso 18 mide que no cabe, se sube a 2 km **el tick, no la banda**.                                          |
| 3   | **¿Entra la información imperfecta (R24) o el motor sigue decidiendo con la verdad?**                                                                                                        | **Entra, con brazo de control obligatorio.** Es el cambio de mayor efecto por línea escrita del catálogo: tres de las veinte más graves (S-458, S-478, S-488) y la mitad de las quejas de verosimilitud. Y es reversible por constantes: con `boardLagKm = 0` el motor vuelve a ser el de hoy, lo que la hace la más segura de las grandes. |
| 4   | **Las seis estructuras del dueño: ¿son seis, o siete con «invitado/patrocinador»?**                                                                                                          | **Seis formas + `patrocinador` como MOTIVO, no como forma.** Un equipo invitado tiene forma (normalmente `cazaetapas` o `mixta`) y además la obligación de estar delante todos los días (S-066). Meterlo como séptima forma duplicaría filas de `ROSTER_BY_SHAPE` sin cambiar ningún papel.                                                |
| 5   | **`mountain.breakawayWinPct` 25-45 % contra el 18,1 % que el dueño dio por bueno.**                                                                                                          | **Bajar la banda a 12-40 % y declarar que no es objetivo, sino control de forma.** Es lo que el propio comentario ya dice desde la v44 y lo que el dueño cerró con «está bien así». Una banda que nadie cumple no vigila: da ruido en el nocturno. Si el dueño quiere el 25-45 de verdad, entonces R13.5 deja de ser calibración y pasa a ser un cambio de ley, y eso es la decisión 12. |
| 6   | **El grupo de cabeza de una reina: ¿se convierte la DEUDA en banda?**                                                                                                                        | **Sí: `medianLeadGroupRiders` 3-12.** El encargo pedía 5-15 y hoy mide 1. Poner 3-12 en vez de 5-15 es honesto: 5 es el suelo de carretera pero el motor tiene que llegar primero a que lleguen tres. Se re-ancla en el paso 18 con el dato delante.                                                                                       |
| 7   | **El corte de tiempo, ¿elimina? (S-494) Y con él, ¿puede la cola de la reina pasar del 14 %?**                                                                                              | **Sí a las dos.** Sin eliminación el tamaño del grupeto no vale nada y R26 entero se organiza por inercia en vez de por miedo: seis situaciones dependen de eso. Y cribar los grupetos que ya no son la carrera (deuda §14 punto 2, medida y refutada tres veces) es imposible con el techo del 14 %. Propuesta: **7-18 %**, con el techo de vigilancia de S-464 intacto (nadie se lleva por delante medio pelotón). |
| 8   | **¿Los nueve motivos completos, o solo `montaña` y `puntos` en la v1?**                                                                                                                     | **Los nueve.** `joven`, `equipos`, `combatividad` y `patrocinador` son cuatro líneas de tabla cada uno (R05.1) y cierran 11 situaciones más. El coste está en las clasificaciones que hay que llevar, y esas hay que llevarlas igual para `montaña` y `puntos`.                                                                            |
| 9   | **Órdenes condicionales: ¿cuántas y con qué disparadores?**                                                                                                                                  | **Tres, con los doce disparadores de §6.3.** Menos de tres no permite «ataco en el puerto y si me cazan me guardo»; más de tres es un programa que el jugador no puede depurar y que el informe no puede explicar.                                                                                                                        |
| 10  | **Rebeldía con coste (R25): ¿cuesta desobedecer en un equipo bot?**                                                                                                                          | **Sí, y poco: `trustLossRebel` 6/etapa.** Hoy §VI.2 dice «en un equipo bot no cuesta nada», y el propio comentario avisa: «la estrategia óptima pasa a ser ir siempre de líder pase lo que pase». Seis puntos por etapa se notan a veinte carreras (S-057) y no a una, que es lo que la fila pide.                                        |
| 11  | **S-451 y S-486 (el perfil escrito mal y dispuesto mal): ¿entran en este encargo?**                                                                                                          | **No, y son prerrequisito.** Son los puestos 2 y 3 de las veinte más graves y **no son táctica**: son el generador. Mientras 0 de 157 reinas pasen de 4.000 m y las cinco reinas de una carrera dejen 19-50 km tras la última cota, R06, R13, R17, R26 y R28 **no se pueden medir en montaña**. Recomendación: **una tanda propia antes del paso 9**. |
| 12  | **`tsb` sigue sin llegar al motor. ¿Se conecta?**                                                                                                                                            | **Sí, en el paso 12.** Sin él, R08 (`frescuraDeCarrera`) se apoya solo en `kmAlFrente` y `depletion`, y el «de 34 y el de 22 en la tercera semana» (S-482) no tiene sujeto. Es deuda declarada del diseño de entrenamiento y de `types.ts:111`, no de este.                                                                               |
| 13  | **El coste de CI: +16 min de bancos nuevos y +40 % de motor estimado. ¿Se acepta?**                                                                                                          | **Se acepta con vigilancia y con una regla: si no cabe, se recorta la MUESTRA, nunca la banda.** El invariante 37 (912 s) y el 25 (1.230 s) son los que hay que medir en el paso 2 y volver a medir en el 10. La alternativa —bajar el tick a 2 km— está en la decisión 2 y cuesta verosimilitud, no números.                              |
| 14  | **Qué queda fuera de la v1**: CRE (S-163), semietapa (S-431), campeonato nacional (S-485), dos carreras a la vez (S-470), material del día (S-430), lotería del horario (S-462), comisario (S-448), ritmo de competición (S-468). | **Fuera, y anotado en el catálogo como tal.** Son ocho situaciones de 494 (1,6 %) y **cada una es un formato o un actor nuevo**, no una regla: meterlas alarga el plan sin cerrar ningún racimo. Excepción a considerar: S-485, porque son 532 de las 1.418 etapas del calendario y hoy corren sin escuadras. |
| 15  | **`commitHysteresisMargin` 0,15 y los `commitMinKm` de la tabla de §2.2.**                                                                                                                    | **Salir con esos valores y calibrarlos en el paso 2 contra el banco de temblor.** Es la única familia de constantes de este documento que no tiene ningún precedente medido en el motor —`commitHysteresis` 0,4 y `mainGroupTakeoverRatio` 1,25 son el patrón, no el valor—, así que va marcada «calibrar con banco» y se ancla con dato. |

---

_Documento de propuesta. Los 28 racimos, las 494 situaciones y las citas del dueño vienen de
`catalogo-situaciones.md`; los números del motor, de los seis mapas de `docs/diseno/`; las bandas, de
`packages/engine/src/sim/targets.ts` y `invariants.test.ts`. Ninguna cifra de «hoy» está estimada: o
sale de un mapa, o sale del código, o sale de `docs/balance.md`._
