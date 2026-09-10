# Rediseño de la capa táctica — diseño final

> **Procedencia, en una línea, para que se sepa qué se ha leído aquí.** Cuatro propuestas
> (`incremental`, `agentes`, `dominio`, `datos`) · **tres jueces** independientes, que eligieron
> `incremental` como base · **una síntesis**, que es este documento · **cuatro refutadores
> adversarios** —contra el código, por cobertura contra `catalogo-situaciones.md`, contra el dueño
> contra `mapa-requisitos-duenio.md`, y por coste y riesgo contra `mapa-bancos.md`— que sacaron
> **86 fallos**. De los 86, **81 llevan corrección escrita en el texto**: **69 aplicados enteros** y
> **12 aplicados en parte**, con la mitad desestimada y su porqué en el **Apéndice C**, que recoge
> **14 objeciones** con nombre de revisor. **Los 5 restantes no aparecen en ningún informe de
> corrección y no se dan por aplicados**: se dice aquí en vez de redondear a 86, porque un fallo que
> nadie tocó y nadie desestimó es exactamente lo que este apéndice existe para no dejar en silencio.
> Dos pares de refutaciones se contradicen entre sí; las dos caras van escritas en el Apéndice C y
> ninguna se resuelve eligiendo bando.

> «Es que vas dando palos de ciego: te digo una cosa y pones un parchecito, pero no arreglas el
> problema real. Tienes que hacer un break y REPENSAR TODA la lógica de todas las situaciones que
> pueden ocurrir en carrera y hacer unas NUEVAS reglas, y con eso rehacer el motor (la parte
> táctica), porque ahora mismo está todo del NAAAAABO.»

Y sobre el primer intento: «está muy superficial… no puede ser tan reduccionista como fuga, pelotón
y desenlace: HAY MUCHÍSIMAS más casuísticas».

Este documento **sustituye a `docs/tactica.md`**. Es el diseño único que se implementa: recorre los
**28 racimos** de `catalogo-situaciones.md` —las 494 situaciones agrupadas por la pieza de motor que
las arregla—, escribe para cada uno la regla en forma implementable, la constante con su valor de
partida y el banco que la mide, y deja el orden en que hay que construirlo.

Sale de cuatro propuestas (`tactica-propuesta-incremental.md`, `-agentes.md`, `-dominio.md`,
`-datos.md`) y de tres juicios independientes. La base es **incremental**, que ganó los tres juicios,
por un hallazgo que las otras tres no vieron: las cuatro huellas selladas viven en escenarios
**sintéticos** construidos a mano, así que arreglar el generador de perfiles —el `CONTRARIO` nº 2 y
el nº 3 del catálogo, y prerrequisito de todo lo de montaña— mueve media docena de bandas de campo
real y **no mueve un dígito de ninguna huella**. Eso convierte el par bloqueante S-451/S-486 en un
primer paso barato y en verde en vez de en una recalibración doble al final.

Sobre esa base se injerta lo que los tres jueces pidieron, y se retira lo que los tres señalaron:

- de `datos`: la **regla de compatibilidad** (`RaceContext` y `StageMemory` opcionales), el
  **inventario de estado**, el **`PlanBinding` de cuatro estados**, el **techo del banco de
  órdenes**, dos invariantes baratos que cazan fugas del propio refactor, el re-anclaje de
  `mountain.breakawayWinPct` en `realQueens`, el **cambio mínimo de `followProbability = 0` entre
  compañeros**, y el **Apéndice A** —las veinte más graves, una fila cada una— **con las dos filas
  que a incremental le faltaban** (S-285 y S-308, que caen fuera de los 28 racimos);
- de `agentes`: el banco **`temblor`** entero con su invariante duro, y el banco **`informacion` de
  dos brazos** con el invariante de que el brazo de control reproduce el motor de hoy;
- de `dominio`: los cinco **invariantes de CONTROL**, la **predicción declarada antes de medir** por
  huella, el pavé cobrado en la **λ del dado** en vez de en el exponente de la física, los
  **subflujos de dados propios** por pieza, `orderDirection` con **tolerancia cero**,
  `PULSO.aduanaBase = 0,30` como **hipótesis nula** de la aduana, el **techo de `qualityGradient`**,
  `chaseCostShare` como **Gini**, «la verdad se degrada por **capas**, no por corredor», y el
  recuento de constantes **derivadas** frente a **[calibrar]**.

Y se **retira** de la base lo que los tres juicios coincidieron en señalar: `breakFinaleCommit` y
`breakClimbCommit` (probadas, medidas y revertidas en la v44, `dc489a6`, sobre un asunto que el
dueño cerró con «el problema no es la ley»), el `sectorExponent` 0,52 (que era física en un paso que
prometía no tocarla), y los movimientos de `flat.breakawayWinPct` y `calendarQueens.breakawayWinPct`,
que son las dos únicas bandas de conducta de fuga que el dueño fijó él mismo.

**Cómo leer.**

- Las citas del dueño van entre «» **y solo esas**. Lo que dice el repositorio sobre sí mismo va
  atribuido a su fichero o a su versión de `docs/balance.md`.
- Cada número lleva su justificación, o va marcado **[calibrar]** —punto de partida para un banco
  nombrado, no calibración medida—. **No hay ningún «a definir».**
- Cada constante nueva va marcada **DERIVADA** (con el número existente del que sale) o
  **[calibrar]**. El recuento está en el Apéndice B.
- Lo que decide el dueño va marcado **[DECISIÓN DEL DUEÑO n]** en el texto y recogido en §10 con
  recomendación. Donde hay decisión hay un valor por defecto: el que se implementa si no dice otra
  cosa.
- **Todo lo que este diseño mueve —bandas, invariantes, huellas y escenarios— está en un solo sitio,
  §9.** El dueño ha dicho: «no me preocupan en este punto las bandas, eso puede ser al final que las
  decidamos en conjunto… a fin de cuentas yo no fui quien creó las bandas, fue Claude con mi feedback
  quien las propuso». Este documento se lo toma al pie de la letra **en las dos direcciones**: no
  encoge una sola regla para que pase una banda vieja, y no mueve una sola banda en silencio.
- Ficheros, líneas y números están verificados contra el árbol a `ENGINE_VERSION = 52`. **Y esa
  verificación se ha vuelto a pasar entera, porque la primera no lo estaba**: el conteo de bandas de
  `sim/targets.ts` decía 30 y son **34**; `sim/raceRadio.test.ts` decía 26 pruebas y son **25**; la
  lista de subflujos de dados inventaba un `rngMood` que no existe y se dejaba fuera `rngHazard`; el
  bloque de `StageInput` de §1.2 traía dos tipos (`TimeTrialInput`, `Place`) que no existen en el
  árbol; y dos listones de saturación se listaban como bandas de `targets.ts` cuando viven en
  `sim/invariants.test.ts`. Los cinco están corregidos en su sitio, y cada corrección dice en el
  texto qué decía antes, para que no se re-introduzca.

---

## 0. La ausencia madre, y el inventario de estado

### 0.1 La ausencia, verificada

`packages/engine/src/stage/tactics.ts` son **855 líneas donde se decide quién ataca**, y **no
contiene la palabra `teamId` ni una vez**. `finish.ts`, 344 líneas donde se decide quién gana,
tampoco. `group.ts` tampoco. El único de los cuatro que la tiene es `chase.ts`, y solo para agrupar
ayudantes sin objetivo.

Del equipo sobrevive **un escalar**, `teamAttack`, calculado fuera (`teamPlan.ts::teamAttackFactor`)
e idéntico para los ocho hombres de la casa: `fuga` 0,4 · `perseguir`/`lanzar` 0,7 ·
`controlar`/`proteger` 0,85 · `nada` 1,4. Multiplica el apetito y ya. Y un segundo, `teamDrive`, que
entra en el deber de relevo y **vale 0 fuera del pelotón**, o sea que dentro de una fuga el plan de
equipo está literalmente apagado.

**Y ese 0 no es un descuido: es una CORRECCIÓN DELIBERADA Y MEDIDA de la v38, y hay que nombrarla
antes de tocarla.** `simulate.ts:3091-3095` lo dice con todas las letras: «EL EMPUJE DE EQUIPO MANDA
EN EL PELOTÓN, NO EN LA FUGA (v38)… Sin esto, el fugado cuyo equipo tiene un hombre delante —él
mismo— se llevaba el castigo de "no persigas lo tuyo" y no tiraba de su propia fuga», implementado
como `(riderId) => (isBunch ? driveOfRider(riderId) : 0)`. O sea: el 0 fuera del pelotón es un
**guardarraíl contra una regresión concreta y medida**, no la ausencia madre.

La ausencia madre está debajo, y es la que este documento arregla: la v38 tuvo que apagar el plan
entero dentro de la fuga **porque el motor no sabe distinguir dos cosas que en carretera no se
parecen en nada** —«empujar a los míos dentro de mi propia fuga» y «no perseguir lo que es mío»—, y
no sabe distinguirlas porque no hay censo. R02 (`teamTurn`) y R18 (el turno con orden) **retiran esa
guarda**, y por eso el paso 7 lleva escrita la regresión que la causó (§8, criterio de «hecho» del
paso 7): el fugado que deja de relevar en su propia fuga es el modo de fallo que hay que vigilar, no
una sorpresa que se descubra después.

De ahí salen, sin excepción, los seis sinsentidos que el dueño cazó, los 59 `CONTRARIO` del catálogo
y buena parte de los 178 `AUSENTE`. **No son 494 defectos: son una ausencia vista desde 494 sitios**,
más un puñado de piezas que de verdad no existen (percances, pancartas, colocación, memoria entre
etapas, información con retardo).

El diseño, en una frase: **dejar de tirar la información en la frontera**, y hacerlo en el orden en
que cada pieza desbloquea a la siguiente.

### 0.2 El inventario de estado, que es de donde sale el orden de trabajo

Antes de la frontera y del modelo, la foto. Cinco depósitos, con lo que llevan y lo que les falta. La
última columna son los racimos que se desbloquean **solo con rellenar ese depósito**, sin escribir
ninguna regla nueva.

| #   | Depósito                     | Dónde vive hoy                               | Qué lleva                                                                        | Qué NO lleva                                                                                                                       | Racimos que desbloquea                      |
| --- | ---------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | **Lo que ENTRA a la etapa**  | `StageInput` (`stage/types.ts:167`)          | `profile`, `riders[]`, `timeTrial?`, `lugar?`                                    | formato de la carrera, qué queda de recorrido, las cuatro clasificaciones, la memoria del pelotón, el parte del tiempo, el trazado | R04 R05 R06 R07 R08 R09 R10 R14 R26 R27 R28 |
| 2   | **Lo que lleva el CORREDOR** | `RiderSim` (`simulate.ts:185`)               | energía, grupo, trabajo, cerillos, deriva, reserva, `pulling`, `hurt`, `gastado` | posición dentro del grupo, memoria de a quién ha seguido o marcado, turno vigente, deudas, lo que CREE del rival                   | R02 R13 R15 R16 R18 R24                     |
| 3   | **Lo que sabe el EQUIPO**    | `TeamPlan` (`teamPlan.ts:111`) + 2 escalares | jefe, carta, motivo, presupuesto, `intent`, `claim`                              | estructura persistente, dónde está cada uno de los ocho, motivos secundarios, política de caza, la pizarra del director            | R01 R03 R05 R10 R20 R21 R24                 |
| 4   | **Lo que sabe el GRUPO**     | `Group` (`group.ts:11`)                      | id, ids, reloj, velocidad, compromiso, coop, tensión                             | composición por equipos, orden de la rueda, quién acaba de tirar, aforo, quién va delante de quién                                 | R02 R15 R16 R17 R18 R26                     |
| 5   | **Lo que SALE de la etapa**  | `StageOutput` (`types.ts:398`)               | eventos, resultados, `workUnits`, incidentes, `tank`, `efforts`                  | quién fugó, quién no relevó, quién le debe qué a quién, qué equipo ganó, la moral, el margen del corte                             | R08 R09 R10 R23 R25                         |

El depósito 1 es el más grave y el más barato: **hoy la etapa de mañana no arrastra nada táctico de
la de hoy**. Lo único que cruza la noche es `ctl`/`atl` (Banister), `alive` y `gcTotal`. Y la propia
base de datos ya sabe cosas que el motor no recibe: `raceGc` (`schema.ts:463`) acumula
`puntosVolante` y `puntosMontana` **por corredor y por carrera desde hace versiones**, y el motor
nunca los ve. O sea que S-035 («un corredor no sabe qué clasificación lidera») y buena parte de los
24 casos de R05 están `AUSENTE` **por un campo que no se pasa, no por una mecánica que no existe**.
Eso abarata el paso 4 del plan mucho más de lo que parece.

---

## 1. Qué se rehace y qué no

### 1.1 La frontera exacta

Tres fronteras la fijan, y las tres se escriben aquí para que ningún paso las cruce por accidente.

> **Frontera 1 — el motor de etapa no conoce atributos, conoce un `StageRider`.** Es la frontera del
> diseño hermano (`diseno-entrenamiento.md` §0), que ya está cerrado. Este documento comparte con él
> los diez atributos, `eff0 = attr · mForm · mHealth · mMorale` y el efecto inicial del corredor, y
> **no contradice ninguna de sus decisiones**.
>
> **Frontera 2 — la LEY de la carretera no se toca; el COSTE DEL BLOQUE admite multiplicadores
> tácticos declarados.** Ésta es la redacción precisa, y sustituye a la que este documento traía
> antes («la física no se toca»), que era a la vez demasiado fuerte y demasiado vaga: cinco reglas de
> este diseño multiplican `blockCost`, y con la redacción vieja o eran ilegales o pasaban de
> contrabando. Lo que **no se toca** es:
>
> - la **ley de velocidad** (`targetSpeed`, `vRef`, `relPower`, `loadExponent`, `accLimit`);
> - el **reparto del viento** (`advanceGroup`, `pullers`, `enFila`, `shelterOf`);
> - la **economía del depósito** (`erosion()`, `erosionCoef`, `bonkPenalty`, `TANK`, la reserva y el
>   cerillo), o sea la función que traduce gasto en erosión.
>
> Lo que **sí admite modulación táctica**, y solo por la vía que se declara en §9.1bis, es **cuánto
> gasta un corredor concreto en un bloque concreto** —que en carretera depende de dónde va, de a qué
> ritmo se corre y del frío—. Se aplica en **un solo punto**, `tacticalCostMultiplier(r, block)`,
> **fuera de `physics.ts`**, con **tope declarado** y **suma cero por grupo**, para que el invariante
> de control C1 pueda vigilarlo de verdad (§7.6). Si un cambio necesita mover la ley de velocidad, el
> reparto del viento o la función de erosión para que salga el resultado que se busca, **ese** cambio
> está mal planteado. El propio dueño lo cerró en S-467: «el problema no es la ley».
>
> **Frontera 3 — el motor sigue siendo `(input, seed) → output`.** Ninguna pieza nueva escribe
> estado que sobreviva a la etapa. La memoria entra como `StageInput` y sale como `StageOutput`; la
> construye `packages/db`. De esa pureza cuelgan los 46 invariantes, `stageSeed` con
> `engineVersion` fijo a 1 en los bancos, y `checkReplay`.

**No se toca nada de esto**, y cada paso de §8 lleva la comprobación de que no lo tocó:

| Capa                                 | Ficheros                                                                                                                         | Por qué se queda                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Física de carretera**              | `physics.ts` (778 l.): `blockCost`, `blockPerfil`, `targetSpeed`, `vRef`, `relPower`, `loadExponent`, `advanceGroup`, `accLimit` | Es lo único calibrado contra la carretera real (VAM 1.560 m/h, cronos 40-56 km/h). Los invariantes 45 y 46 son unidades sobre ella. **`physics.ts` no se edita en ningún paso salvo el 18 (altitud) y el 20 (viento).** Lo que sí ocurre, y va declarado, es que el valor que `blockCost` devuelve se multiplica DESPUÉS por `tacticalCostMultiplier` (Frontera 2, §9.1bis): eso no cambia la función, cambia el gasto de un hombre en un bloque, y por eso lleva tope e invariante propios. |
| **Depósito, erosión, W′**            | `erosion()`, `erosionCoef`, `bonkPenalty`, `TANK`, `initialEnergy`, `reserveSeconds` 65, `reserveRecoverySeconds` 400            | Sostienen las cinco bandas de `erosion` y la cola de la reina: mover una mueve las cinco. R13 está `CUBIERTO` en 7 de 14 filas justamente porque esta moneda existe y está medida (S-454, S-455, S-461, S-475).                                                                                                                                                                                                                                                                              |
| **Cerillos en segundos**             | `matchCount`, `matchBonus` 10, `matchBoostSeconds` 120, caducidad por `vActual`                                                  | S-455 `CUBIERTO`, cita del dueño cerrada. Se usan más, no se cambian.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Criba de subida**                  | `shatter`, deriva, `paceSetters`, `pacemakerP75`                                                                                 | S-461 y S-260 `CUBIERTO`. Lo que falta no es la criba: es que alguien la **lea** (R13, R24).                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Reparto del viento**               | `advanceGroup`, `pullers`, `enFila`, `shelterOf`                                                                                 | Medido en v38/v39. Lo que cambia es **quién** está en `pullers`, no cómo se reparte.                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Los siete `finishWeights` de hoy** | `constants.ts:3439`: `sprint_masivo`, `sprint_reducido`, `puncheur`, `alto`, `pave`, `descenso`, `solitario`                     | **Sus pesos no se tocan ni uno.** La traducción atributo→remate está anclada al Muro de Huy y a las clásicas reales. Lo que cambia es qué grupo llega y quién va dentro. **Aviso: R17.2 AÑADE un octavo tipo (`muro`) sin tocar los siete. Eso es un cambio de contrato del tipo `FinishType`, no un re-ajuste de pesos, y va declarado como tal en §9.6 con su paso y su huella.**                                                                                                          |
| **Caídas**                           | `crash.ts` (dado y severidades)                                                                                                  | Las bandas de `abandonCauses` cuelgan de aquí. Lo que se añade es el RADIO y las consecuencias, no la probabilidad.                                                                                                                                                                                                                                                                                                                                                                          |
| **Crono como física**                | `timetrial.ts` (569 l.), compuesto CRI, pacing, rampa de `startOrder.ts`                                                         | `timeTrials.tailPct` 8-15 y `worstStagePct` 0-17 son de las mejor ancladas del banco. R27 añade estado **alrededor**, no dentro.                                                                                                                                                                                                                                                                                                                                                             |
| **El pelotón como grupo**            | `mainGroupId`, `mergeGroups`, `chaseReferenceIndex`                                                                              | Tres parches convergidos en una regla buena («el pelotón es el grupo que lleva la gente», histéresis 1,25). Se conserva y se le añade composición.                                                                                                                                                                                                                                                                                                                                           |
| **Cómo nace un corredor**            | `generateNpcRider`, `sampleNpcAge`, Banister                                                                                     | Parcela de `diseno-entrenamiento.md`, cerrada.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Determinismo**                     | `stageSeed`, subflujos nominales, orden canónico por `riderId` (`simulate.ts:912-917`)                                           | Todo dado nuevo estrena **subflujo propio** (§2.6). Ningún resultado de hoy cambia porque un dado «se corra».                                                                                                                                                                                                                                                                                                                                                                                |

**Se rehace esto, y solo esto:**

| Pieza                      | Fichero               | Qué le pasa                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El contrato de la decisión | `tactics.ts`          | `MoveRider`/`MoveContext` pasan a ser **tres contextos** (§3). La mecánica del intento (λ → seguir → sostener → boquete → cooperación) **se conserva entera**: es correcta, está medida y tiene detrás las nueve reglas de dominio que dictó el dueño (`motor.md` §13.1-13.2). Lo que cambia es **qué ve** y **quién puede ser instigador**. |
| El plan de equipo          | `teamPlan.ts`         | De «cuatro motivos y seis intenciones derivados cada etapa y congelados» a **estructura persistente de carrera + carta del día + once motivos** (§5). El vocabulario viejo sobrevive dentro.                                                                                                                                                 |
| El reparto de papeles      | `world/autoOrders.ts` | De `stage.kind` a la estructura y al **final real** (S-047, S-049). Es el `CONTRARIO` nº 4 de las veinte más graves.                                                                                                                                                                                                                         |
| La aduana                  | `pelotonAllows`       | De un dado con rampa a un **voto por equipos revisable cada km** (R03), con la conducta de hoy conservada como hipótesis nula (§4/R03).                                                                                                                                                                                                      |
| El frente                  | `frontTeamId`         | De «uno con histéresis» a **subasta con alianzas, gorrones y pulso** (R20).                                                                                                                                                                                                                                                                  |
| El modelo de final         | `finish.ts`           | Gana grupo y equipo: dos compañeros en la meta dejan de ser desconocidos (R02, R16, R17).                                                                                                                                                                                                                                                    |
| Lo que no existe           | ficheros nuevos       | `placement.ts` (R15), `banners.ts` (R06), `mishap.ts` (R11), `belief.ts` (R24), `classifications.ts` (R05, en `packages/db`).                                                                                                                                                                                                                |

### 1.2 La regla de compatibilidad: el contexto es OPCIONAL

Es el injerto de mayor rendimiento de los tres juicios y no cuesta nada.

Éste es el contrato **de hoy, copiado literalmente de `packages/engine/src/stage/types.ts:167-186`**
—porque es el bloque que el implementador va a copiar al empezar el paso 2, y una firma inventada
aquí es media hora perdida allí— con los dos campos nuevos encima:

```ts
interface StageInput {
  profile: StageProfile
  riders: StageRider[]
  /** CRI/cronoescalada: grupos de un corredor, sin drafting ni hazards (SPEC 6.13). */
  timeTrial?: boolean // ← es un boolean, no un `TimeTrialInput`
  /** Dónde y cuándo se corre (v42): de aquí sale el clima. */
  lugar?: { pais?: string; dia: number } // ← es un objeto anónimo, no un `Place`
  race?: RaceContext // ← NUEVO, OPCIONAL
  memory?: StageMemory // ← NUEVO, OPCIONAL
}
```

**`StageOutput` NO gana nada**, y conviene decir por qué, porque una versión anterior de este
documento le añadía un `memory?: StageMemory` que contradecía a R09 y a §3.3 en la misma página. La
memoria de mañana **la construye `packages/db`** leyendo lo que la etapa ya emite hoy —`events`,
`results`, `workUnits`, `efforts`, `incidents`— más las tablas de clasificación del paso 4. El motor
**no la escribe**, y por eso Frontera 3 se sostiene: no hay ningún campo de salida nuevo que un banco
tenga que sellar, y no hay dos sitios donde pueda vivir la verdad. Lo que `packages/db` necesita para
construirla y hoy no puede deducir —quién no relevó, quién rompió un trato, el margen del corte— sale
de **eventos nuevos** de R23, que ya son parte del `StageOutput` de hoy (`events`), no de un campo
aparte.

**Un `StageInput` sin `race` corre exactamente como hoy, por construcción.** Sin clasificaciones
secundarias, sin memoria, con humor de dado y con estructura derivada del terreno. Tres consecuencias
que ninguna otra forma consigue:

1. Las huellas selladas y los escenarios canónicos **siguen pasando sin tocarlos** durante todos los
   pasos de andamio (0-4 de §8).
2. Cada paso se puede medir **CON y SIN** el contexto nuevo **en la misma corrida**, que es la única
   forma honesta de atribuir un movimiento de banda a su causa. No es una estimación: es un A/B
   pareado por semilla.
3. Los bancos que hoy no tienen general (`realQueens`, `calendarQueens`, `climbs`) siguen corriendo
   igual mientras no se decida darles una **[DECISIÓN DEL DUEÑO 5]**.

**Lo que la opcionalidad NO compra, y hay que decirlo.** Dos de los tres juicios pidieron «re-sellado
único». Eso solo es cierto para el **contrato**: las huellas se quedan idénticas mientras `race` esté
ausente, y se re-sellan **una vez** el día en que los escenarios sintéticos ganan contexto (paso 5).
A partir de ahí, cada paso que cambia conducta mueve la huella y **tiene que** moverla: una huella
que no se mueve cuando la regla cambia no está midiendo nada. Lo que sí se conserva de la petición es
lo importante: **una causa por re-sellado, escrita, con la predicción declarada antes de medir**
(§9.3). Re-sellar deja de ser un trámite y pasa a ser la comprobación de una predicción.

### 1.3 Las huellas selladas, una por una

Hay **cuatro** ficheros con huella, y conviene separarlos porque no se mueven a la vez:

1. **`stage/attribution.test.ts`** — huella `puesto:riderId:tiempoS` de cuatro corridas:
   `llana-180-0`, `llana-180-1`, `reina-150-0`, `reina-150-1`. Es la más cara y la que más veces se
   ha re-sellado (v16, v20, v46, v49), siempre con causa escrita.
   **Hecho verificado, y es el que ordena el plan: los cuatro escenarios son SINTÉTICOS**,
   construidos a mano en `sim/scenarios.ts` (`llana-180` y `reina-150`), y el comentario de la
   línea 392 dice que esos perfiles lisos no bastan para calibrar. Por tanto arreglar el generador de
   perfiles (S-451, S-486) **no mueve esta huella ni un dígito**, aunque mueva media docena de bandas
   de bancos reales.
2. **`stage/timetrial.test.ts`** — dos cosas distintas bajo el mismo techo: la huella de la crono
   canónica (se mueve en los pasos 13 y 19) y la afirmación «cambiar la rampa entera no cambia una
   sola clasificación», que **no es una huella sino una invariante de diseño** —el orden de salida no
   da tiempo— y que el rediseño **tiene que seguir cumpliendo**: lo que cambia el tiempo en R27 es la
   orden de dosificación, no el turno de salida.
3. **`sim/raceRadio.test.ts`** — **25** pruebas (conteo verificado hoy) casi todas de unidad sobre
   fotos construidas a mano. Se mueve solo donde cambia el contrato del evento: `pullMotive` con
   valores nuevos y `time_gap` con `costsToTeams` (R23, paso 17).
4. **`index.test.ts`** — `ENGINE_VERSION` (hoy **52**). Un `++` por paso que cambia conducta, **nunca
   dos en el mismo PR**: si el banco de mundo o el de carrera se mueve, tiene que poder atribuirse a
   una causa.

### 1.4 Las bandas

**34** bandas en `sim/targets.ts` —conteo verificado hoy, entrada por entrada: son 34 objetos con
`min:` y `max:`, no 30— y 46 invariantes en `sim/invariants.test.ts`. La doctrina, en las dos
direcciones:

- **No se encoge una sola regla para que pase una banda vieja.** Si una regla saca una banda de
  rango, lo que se discute es la banda.
- **No se mueve una sola banda en silencio.** §9 es la lista completa, con valor de hoy, valor
  propuesto, paso y motivo. **Las 34, incluidas las tres que este documento no nombraba**
  (`abandonCauses.illnessPct`, `smallTours.worstRacePhotoRepeat`, `realQueens.worstStagePct`).
- **Si la banda tenía ancla de dominio, lo que se discute es la regla.** Y aquí hay que corregir un
  recuento que este documento traía mal: **no son tres, son trece**. **Trece son las FILAS de la
  tabla `mapa-requisitos-duenio.md` §13, contadas ahí y no de memoria**, y van las trece por nombre
  para que nadie las vuelva a contar mal —una fila de esa tabla puede llevar más de una banda, y
  ésa es la trampa en la que este documento ya cayó—:

  1. `flat.breakawayWinPct` 5-16 · 2. `smallTours.flatMoveWorstMarginS` 0-900 ·
  2. `timeTrials.tailPct` 8-15 · 4. `calendarQueens` fuga en montaña 6-30 ·
  3. **`mountain.top10GapSeconds` suelo 40** · 6. la cola de la reina del CLI ·
  4. el PAV ≥ 69 del ganador de pavé · 8. la saturación white-roads ≤ 0,96 ·
  5. **las tres bandas provisionales de la v33 en UNA sola fila** (llano 2-10 «luego 5-16» —que es
     la misma banda de la fila 1 y **no cuenta dos veces**—, **montaña 24-45** con la vuelta a 25 en la
     v34, y pájaras de Lombardía ≤ 12) · 10. el listón de bots con 5★ · 11. la alarma de cracks ·
  6. **rueda contra cara en llano** (5 % → «¿vemos con un 10 %?», v38; sale 14 % con el exponente)
     —**la fila que este documento se dejaba fuera**, y por eso su lista enumeraba catorce cosas
     mientras el recuento decía trece— · 13. la ventana de ataques de la general.

  A eso se suma la ley de velocidad (invariante 43), que es ancla de física y no de feedback.
  **Consecuencia práctica y no menor: tres bandas que este documento proponía mover dentro de §9.1
  —`mountain.top10GapSeconds`, `mountain.breakawayWinPct` y la cola de la reina— tienen ancla del
  dueño y por tanto salen de §9.1 y entran en §10 como decisiones numeradas.**

Hay además cuatro bandas **sentadas encima de su ruido** que este rediseño va a rozar sí o sí
(`flat.breakawayWinPct`, `grandTour.queenLastGroupPct`, `realQueens.lastGroupPct`,
`mountain.top10GapSeconds`). Para ésas la propuesta no es ensanchar: es **subir semillas donde se
pueda pagar y mover el suelo donde no**, y está marcado como tal.

---

## 2. El modelo de decisión

### 2.1 Qué es un agente

Hoy hay **un solo decisor real**: el corredor, con un escalar de equipo pegado. El diseño tiene
tres, y los tres son necesarios porque el catálogo pide conductas que ninguno de ellos solo puede
producir.

| Agente                  | Quién es                                                  | Qué decide                                                                                                                               | Cada cuánto                                      | Estado propio que arrastra                                                                         |
| ----------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **Director** (`TeamDS`) | uno por equipo, fuera de la carretera                     | postura, motivo activo, derecho al frente, voto de aduana, presupuesto del día, quién baja a por el jefe, cambio de carta en carrera     | **1 km** (10 bloques, la cadencia que ya existe) | `spent`, `claimHeld`, `beliefs` (huecos con retardo), `allies`, `lastOrderKm`                      |
| **Capitán de ruta**     | por equipo **y por grupo**: el leal presente de mayor TAC | lo que el director no llegó a decir: entrar al turno, abandonar la caza, esperar a un compañero, cerrar un hueco, pedir tregua o alianza | **evento** y cambio de fase                      | `lastCallKm`                                                                                       |
| **Corredor**            | los 176                                                   | atacar, saltar, relevar, disputar una pancarta, colocarse, dejarse ir, cómo remata                                                       | **bloque (100 m)** para lo que es suyo           | lo de hoy (`energy`, `matches`, `driftS`, `reserveS`…) + `placement`, `turnIndex`, `commitUntilKm` |

**Por qué el capitán existe y no es un lujo.** R24 pone retardo en la información del director
(S-458, S-478, S-489). Con retardo y sin capitán, un equipo se queda **mudo** justo en el minuto en
que pasa todo. Con capitán, el equipo reacciona **tarde y peor** —que es exactamente lo que pide
S-459— pero reacciona. Y el derecho a hablar no es un rol asignable: sale del palmarés y de los años
(TAC), así que un equipo puede no tener a nadie con voz, que es la otra mitad de la fila.

**Lo que este diseño NO hace, y por qué.** No convierte a los 176 corredores en agentes con
compromiso propio, catorce intenciones y un subflujo de dados cada uno. La mecánica del intento —una
sola, por grupo y bloque— es la única del motor que el dueño nunca ha discutido («una sola mecánica,
no nueve», `motor.md` §13.2), está medida, y sustituirla costaba **+40 % de coste de motor** en un
motor que ya se ha frenado un 48 % en dos versiones. Lo que estaba mal no era la mecánica: era **lo
que ve**.

### 2.2 La escalera de frecuencias

Nada se decide más a menudo de lo que hace falta. El coste de CI es un requisito, no un detalle.

| Cadencia            | Qué se decide ahí                                                                                                                                                         | Coste                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **bloque (100 m)**  | intento táctico (1 por grupo, como hoy), respuesta al ataque, criba, cerillo, `placement` (una suma por corredor), censo del grupo                                        | +1 float por corredor y bloque. Despreciable frente a `blockCost`; listón declarado **≤ 5 %** para `placement` (§4/R15), dentro del **≤ 10 % agregado** del motor repartido por pieza en §7.7. |
| **km (10 bloques)** | postura de equipo, frente, **aduana revisada** (R03/S-120), general virtual (R04), lectura del rival y de la pizarra (R24), grupeto (R26), tren (R16 dentro de los 15 km) | Es la cadencia que ya existe (`decisionEveryBlocks` 10). Se le cuelga más, no se añade una nueva.                                                                                              |
| **2 km**            | cooperación de cada movimiento (`coopReviewBlocks` 20, ya existe), deuda de relevos (R09)                                                                                 | sin cambio                                                                                                                                                                                     |
| **fase**            | tabla entera de conducta: λ, suelo de compromiso, si la aduana está abierta, si se puede atacar dentro, si el rescate está permitido (R19)                                | una comparación por km                                                                                                                                                                         |
| **evento**          | caída, pinchazo, corte, captura, pancarta, cambio de líder virtual → despiertan al director y al capitán **con retardo** (`newsLagKm`)                                    | una cola de sucesos por equipo                                                                                                                                                                 |
| **etapa**           | plan del día desde la estructura (R21), presupuesto (R10), parte meteorológico (R14)                                                                                      | como hoy                                                                                                                                                                                       |
| **carrera**         | estructura del equipo y convocatoria (R21/R28), objetivo y días marcados (R10)                                                                                            | fuera del motor, en `packages/db`                                                                                                                                                              |

**La verdad se degrada por CAPAS, no por corredor.** Es la línea que ordena el coste de R24 y viene
de `dominio`: lo que un corredor sabe de sí mismo es exacto; lo que sabe de su grupo es casi exacto
—está ahí, los ve— salvo el estado interno de los rivales, que se lee por señales; y lo que sabe de
la carrera **no lo sabe él: lo sabe su director**, y llega viejo y torcido. Tiene dos virtudes. Es
verdad en carretera: en un grupo sabes perfectamente cuántos sois y de qué equipos, y no tienes ni
idea de a cuánto va la fuga si no te lo dicen. Y es **barata**: el ruido de percepción se calcula
**una vez por equipo y por kilómetro** (22 × 200 = 4.400 evaluaciones por etapa) en vez de una vez
por corredor y por bloque (176 × 2.000 = 352.000). Dos órdenes de magnitud, sin perder ninguna
conducta del catálogo.

### 2.3 El bucle, en pseudocódigo

Al estilo de `docs/motor.md` §13.2. Lo que va en **negrita** es nuevo; el resto es el orden real de
`simulate.ts` §3, que **no cambia**.

```
por bloque i  (dx = 0,1 km):

  si i % decisionEveryBlocks == 0:                       # 1 km
      race    = raceView(km)                             # la VERDAD del motor
      fase    = phaseOf(race, evs)                       # R19  ← sustituye a tacticMaxMoves/closingNow
      para cada equipo t:
          creencia[t] = believe(t, race, evs, rngPizarra)  # R24  retardo + redondeo + error + sesgo
          postura[t]  = stance(plan[t], creencia[t], fase)
      frente  = frontAuction(postura, creencia, rngAduana) # R20  subasta, alianzas, gorrones, pulso
      aduana  = customs(movimientos, postura, creencia)    # R03  revisa allowed de TODOS, no solo al nacer

  para cada grupo g (orden de carretera):
      censo    = census(g)                               # R01  quién es de quién: aquí, delante, detrás
      para cada equipo t con hombres en g:
          reparto[t] = teamTurn(g, t, censo, postura[t], fase)   # R02  carta, peones, quién ataca
      caras    = arbitrate(g, reparto, fase)             # R02  UN hombre por casa paga una acción cara
      turno    = relayTurn(g, reparto, censo, fase)      # R18  cola CON orden y duración
      intento  = attemptFrom(g, kindOf(fase, g, race), censo, race, creencia, caras)

  # la carretera, sin cambios
  advance(...)  ·  shatter(...)  ·  corte(...)  ·  banners(...)  ·  crashCheck(...)
  mishapCheck(...)                                       # R11  nuevo, misma forma que crashCheck
  resolverMovimientos(...)  ·  fusiones  ·  reenganches
  publicar(evs)                                          # sucesos con su km real; los equipos los leen tarde
```

`attemptFrom` conserva sus cinco caras (`fuga`, `contraataque`, `puente`, `ataque_grupo`,
`ataque_final`) y su mecánica entera. Lo único que cambia es lo que ve y quién puede instigar.

### 2.4 Conflicto entre dos corredores del mismo equipo en el mismo bloque

Hoy no existe conflicto **porque no existe coordinación**: `chooseInstigator` sortea sobre el pool
entero, así que dos compañeros pueden atacar en el mismo movimiento, o uno contra otro. La regla
nueva es que **el equipo decide antes que el dado**, en dos piezas: el reparto (`teamTurn`) y el
árbitro de casa (`arbitrate`).

**Antes del pseudocódigo, la convención que este documento tenía rota en tres sitios.**
`finishRank` y `myFinishRank` valen **[0,1] y 0 = MEJOR rematador del grupo, 1 = el PEOR**, con el
`finishType` de ese grupo. Es la que fija §3.2 y la que usa R18.3; las dos fórmulas que iban al revés
(el desempate de `arbitrate` y el `launchBias` de R17.3) están corregidas contra ella más abajo, y el
banco `duelBench` lleva una **aserción de signo** sobre `bestFinisherPullShare` —el mejor rematador
tiene que trabajar MENOS que su parte, nunca más— porque es la única prueba que caza este error si
alguien vuelve a invertirlo.

Las cinco reglas van numeradas **R02.1 a R02.5**, para que las referencias cruzadas del documento
(R02.9 apunta a R02.4) tengan a dónde apuntar:

```
function teamTurn(g, t, censo, postura, fase):
    leales = censo.mates(t).filter(r => binding(r) == 'dentro' || binding(r) == 'carta-blanca')
    si leales vacío: return NADA

    # R02.1  LA CARTA DE ESTE GRUPO, no la de la etapa                    (S-049, S-291)
    tipo  = finishType(finishTerrain, g.size)
    carta = leales.maxBy(r => finishScore(riderEff(r), tipo))
    si postura.purpose ∈ {maillot, general} y el jefe de general está aquí:
        carta = jefeDeGeneral                              # manda la general sobre el remate

    peones = leales \ {carta}

    # R02.2  LA INDIVIDUAL MANDA (regla 1 de §V.1)                        (S-063)
    para r en leales con orden explícita que contradice el plan:
        binding(r) = 'rebelde';  peones.remove(r)
        si r == carta: carta = peones.maxBy(finishScore)

    # R02.3  EL TURNO: releva el peón, no la carta                        (S-303, S-094)
    para r en peones:  r.dutyBonus += teamPeonDuty (0,6)
    carta.dutyBonus   -= teamCardDuty (1,2)                # ya existe como relayProtectedPenalty

    # R02.4  NADIE SALTA A LA RUEDA DE UN COMPAÑERO                       (S-304, S-358)
    para r en leales \ {instigador}:
        r.followDamp = (r == carta) ? 0 : teamMateFollowDamp (0,15)

    return { carta, peones, dutyBonus, followDamp }
```

Y el árbitro, que es la pieza de diez líneas que hoy falta. **De cada equipo, en cada grupo y en cada
bloque, como mucho un hombre paga una acción cara.** Acción cara = jugar la carta, tomar el frente,
irse a la fuga, bajarse a por el jefe, lanzar, marcar, atacar, disputar una pancarta. El orden de
cupos no es de fuerza sino de **papel**, porque eso es lo que dice el catálogo entero.

```
# R02.5  EL ÁRBITRO DE CASA
function arbitrate(g, reparto, fase) -> ids que EJECUTAN:
    ORDEN = [carta, frente, fuga, rescate, lanzamiento, marcaje, ataque, pancarta]
    para cada accion en ORDEN:
        pool = candidatos de este equipo con esa acción
        si |pool| <= 1: emitir y seguir

        # (a) la CARTA no paga: ataca el peón para que los rivales gasten cerrando
        elegibles = pool.filter(no es carta)  ||  pool

        # (b) entre peones: el PEOR rematador del final que viene           (S-304, S-306)
        #     CON LA CONVENCIÓN DE §3.2 (0 = mejor), «el peor» es finishRank ALTO:
        elegibles.sort(por finishRank DESC, luego appetite desc, luego riderId)
        emitir(elegibles[0])

        # (c) el SEGUNDO queda ARMADO: si al primero le cierran, ataca al bloque
        #     siguiente con apetito × teamRelayAttackBoost (2,0). Eso es «atacar por turnos».
        para c en elegibles[1..]: armado[c] = km + teamRelayAttackKm (1,5)
```

**Por qué el peor rematador y no el mejor**: es la regla 6 de `motor.md` §13.1, ya medida y ya
implementada para el individuo (`tacticWorstFinisherWeight` 1,5). Lo único que se añade es que el
equipo la aplique **entre los suyos**, que es literalmente S-094 («el peón releva por los dos y ataca
primero para que los rivales gasten cerrando; la carta se guarda y remata»).

**Excepción escrita, porque el catálogo tiene una fila contraria.** S-300 dice que en el puerto
decisivo el que ataca dentro de la fuga es el **mejor escalador**, no el peor rematador. No es una
contradicción: `finishScore` se calcula con el `finishType` **del grupo**, y en un final en alto el
mejor escalador **es** el mejor rematador. La fila `CONTRARIO` de S-300 se cierra sola en cuanto
`finishType` se calcula por grupo (R17) y el perfil está bien escrito (paso 1). Se deja dicho para
que nadie meta un caso especial.

**Y el cambio de tres líneas que va suelto y antes que todo lo demás** (paso 3), porque se puede
medir en aislamiento:

```ts
// packages/engine/src/stage/tactics.ts :: followProbability
if (group.teamOf(follower) === group.teamOf(instigator) && follower !== instigator) {
  return 0 // si el que ataca es de los míos, no le cierro yo el hueco: me quedo y estorbo
}
```

Cierra por sí solo **S-303, S-304, S-306, S-343, S-349, S-357 y S-358** —siete situaciones, cuatro de
ellas `CONTRARIO`— y se mide sin ruido antes de que llegue nada más.

### 2.5 Conflicto entre el plan del equipo y la orden individual

Regla 1 de §V.1, literal en `teamPlan.ts` l. 28-34: «**Las individualidades priman sobre el plan.**
El que corre por su cuenta queda FUERA del plan: ni le empuja ni le frena». **Se conserva entera.**
Lo que cambia es que hoy se implementa con un binario brutal (`rebelIds`: o estás dentro o estás
fuera del todo) y el catálogo pide **cuatro estados**, no dos: el exceptuado permanente (S-053), la
carta blanca de un día (S-024) y el rebelde (S-057) son cosas distintas y con precio distinto.

```ts
export type PlanBinding =
  | 'dentro' // acepta el papel: recibe empuje, arropo, tren y rescate
  | 'exceptuado' // licencia PERMANENTE de la estructura: no trabaja, no recibe ayuda, no perjudica (S-053)
  | 'carta-blanca' // exceptuado por UN día, concedido por el equipo (S-024)
  | 'rebelde' // se lo tomó él: como exceptuado + coste de confianza y convocatoria (S-393)

export function bindingOf(orders, plan, structure): PlanBinding {
  if (structure.exempt.includes(orders.riderId)) return 'exceptuado'
  if (plan.blankCheque === orders.riderId) return 'carta-blanca'
  const choca =
    ((orders.role === 'lider' || orders.role === 'sprinter') &&
      plan.card !== null &&
      plan.card !== orders.riderId) ||
    (needsTarget(orders.role) &&
      orders.targetRiderId != null &&
      !structure.members.includes(orders.targetRiderId))
  return choca ? 'rebelde' : 'dentro'
}
```

Y la tabla de efectos, que es donde hoy se pierde el matiz de S-053 y de S-188 (`CONTRARIO`: el
equipo persigue a su propio exceptuado):

| binding        | `drive` (turno) | `attackFactor` | arropo / tren / rescate        | ¿cuenta como «hombre delante» de su equipo? | **¿su equipo le persigue?** | coste en `trust`      |
| -------------- | --------------- | -------------- | ------------------------------ | ------------------------------------------- | --------------------------- | --------------------- |
| `dentro`       | del plan        | del plan       | sí                             | sí                                          | no                          | 0                     |
| `exceptuado`   | 0               | 1,0            | **no**                         | **sí** (S-188)                              | **no** (S-188)              | 0                     |
| `carta-blanca` | 0               | **1,3**        | arropo sí, tren no, rescate no | sí                                          | no                          | 0 (R25.4)             |
| `rebelde`      | 0               | 1,0            | no                             | **no** (S-113)                              | **sí**, si amenaza la baza  | `rebelTrustCost` (12) |

La diferencia entre `exceptuado` y `rebelde` es exactamente la que pide el dueño y es de una línea en
`manUpTheRoad`: **al exceptuado no se le persigue; al rebelde sí**. Y la diferencia entre
`exceptuado` y `carta-blanca` es de precio y de duración: la primera es estructura de carrera, la
segunda es un permiso de hoy con `attackFactor` más alto —el hombre al que le han dado su día ataca
más, no igual— y sin coste de confianza.

Además, los dos agujeros medidos de hoy se cierran aquí:

```
# (a) NADIE ES NOMBRADO JEFE SIN QUERERLO                                  (S-058)
pickLeader ignora los votos que apuntan a un hombre cuya orden explícita es 'libre' o
'cazaetapas'. Ese hombre no recibe arropo, ni tren, ni rescate: es la contrapartida honesta.

# (b) EL REPARTO DEL BOT CONOCE YA LAS ÓRDENES HUMANAS                     (S-054, S-060)
stageRun.ts invierte el orden: primero lee stage_orders, luego llama a
autoStageOrders(riders, {kind, timeTrial, humanOrders}), que trata las filas humanas como
HECHOS y reparte alrededor: no nombra dos cartas, no produce ciclos (X lanza a Y y Y lanza a X),
y no pone de lanzador a quien se declaró carta.
```

La asimetría que esto conserva a propósito: **el que se sale del plan paga por dentro, no por una
regla que se lo prohíba**. Es la doctrina de G2 («hace falta que abusar SALGA CARO por dentro del
juego»), y R25 le pone el precio.

### 2.6 Determinismo

Cada pieza nueva **estrena subflujo propio**: `rngDirector` (jitter del tic y desempate entre
opciones empatadas), `rngPizarra` (el error de lectura), `rngAduana` (el dado de la aduana, que R03.3
sí usa: la aduana es probabilidad, no umbral), `rngCapitan`, `rngPlacement2` (la deriva de posición),
`rngMishap`, `rngObstacle` (R28.6) y **`rngTactics2`**, que es el caso raro y va explicado abajo
porque no estrena una pieza: estrena unos intentos que ya existían y estaban vetados.

Los subflujos que **ya existen** son **once**, y ésta es la lista verificada contra
`packages/engine/src/stage/simulate.ts`, no de memoria: `rngAbandon`, `rngBreak`, `rngCrash`,
`rngDay`, **`rngHazard`**, `rngLaunch`, `rngPlacement`, `rngRough`, `rngSprint`, `rngTactics`,
`rngViento`. **Ninguno de los once se toca.** (Una versión anterior de este documento listaba un
`rngMood` que no existe en ningún fichero del motor y se dejaba fuera `rngHazard`, que es justo el
que las piezas nuevas iban a pisar: el humor sale de `rngDay`.)

**Y `rngHazard` y `rngCrash` merecen la línea entera, porque son los dos que este diseño pisa de
verdad.** Tres piezas nuevas viven pegadas a ellos:

- **R11 (`mishapCheck`)** va **justo detrás** de `crashCheck` en el bucle de §2.3, y **no consume ni
  un dígito** de `rngCrash` ni de `rngHazard`: tira de `rngMishap`, subflujo propio. El orden importa
  y por eso está escrito: `crashCheck` primero, `mishapCheck` después, nunca al revés y nunca
  fusionados en un solo dado de «incidente», que es lo que desplazaría el flujo de todas las etapas.
- **R12.6 (el tapón)** no tira ningún dado nuevo: es una **consecuencia determinista** de una caída
  que `rngCrash` ya sorteó, resuelta por `placement`. El reparto de afectados usa `rngPlacement2`, no
  `rngHazard`.
- **R28.6 (el obstáculo)** sí es un dado nuevo (`lambdaObstacle`), y por eso **no entra en
  `rngHazard`**: estrena `rngObstacle`. Meterlo en `rngHazard` habría sido gratis de escribir y
  habría movido las cuatro huellas y todos los bancos por una fila `AUSENTE` de baja prioridad.

Es exactamente la lección de la v21/v25 que se invoca en el párrafo siguiente, aplicada a los dos
subflujos donde este rediseño la habría repetido.

**Y hay un tercero, `rngTactics`, donde «no se toca» necesita letra pequeña, porque la frase a secas
sería falsa.** Ningún paso cambia _cómo_ se tira de `rngTactics`, pero el **paso 5** cambia **cuántas
veces** se tira: retira `tacticMaxMoves` y `closingNow` **como vetos**, o sea que hay intentos que hoy
no se hacen y a partir de ahí sí, y cada intento nuevo consume dados. Eso es **exactamente** la
v21/v25 con el signo invertido —allí se prohibió el intento del km 0 y desplazó el flujo de todas las
etapas del juego; aquí se permiten dos clases de intento y lo desplazaría igual—. La salida es la
misma que para las piezas nuevas: **los intentos recién permitidos, y solo ésos, tiran de
`rngTactics2`**. Se puede afirmar que eso deja `rngTactics` idéntico dígito a dígito porque los dos
vetos de hoy vetan **antes de tirar**: `simulate.ts:4460` es un `return` previo a construir el
`MoveContext`, y `:4755` es un `if (!closingNow) attemptFrom(...)` que ni entra. Ninguno de los dos
consume un dígito, así que el flujo viejo no se corre. El detalle del A/B que esto compra está en
§9.3, donde el paso 5 declara **sus dos causas** de re-sellado.

Por qué importa y no es fontanería: con veintiún pasos encadenados, **un subflujo propio por pieza es
lo que permite atribuir un movimiento de huella a un paso concreto en vez de a un desplazamiento de
dados**. Es la lección de la v21/v25 con `rngTactics` y el km 0, donde prohibir el intento del
kilómetro cero desplazaba el flujo de todas las etapas del juego. Y es lo que permite que los pasos
de andamio (2 y 4) salgan **idénticos dígito a dígito**, que es la prueba de que el andamiaje no
filtra.

**Prueba de permutación** (invariante nuevo **69**). El orden canónico por `riderId` ya existe
(`simulate.ts:912-917`), pero en cuanto entran censo por equipos, árbitro de casa y turno con orden
persistente, **la invariancia a permutaciones deja de ser gratis**: hay que probarla. Correr la misma
etapa con la lista de corredores permutada tiene que dar el **mismo resultado bit a bit**. Cuesta una
corrida extra de un canónico (≈ 3 s) y caza la clase de defecto que un refactor de contextos produce
de verdad.

---

## 3. Los tres contextos y su contrato

Tres registros que viajan enteros hasta el bloque. Los tres son **de solo lectura** y se construyen
una vez por grupo y por km (o por bloque, donde el catálogo lo pida). **Ningún campo es opcional «por
si acaso»**: cada uno lo pide una fila del catálogo, y esa fila va anotada al lado.

### 3.1 `SelfView` — lo que un corredor sabe de sí mismo (exacto)

Extiende el `MoveRider` de hoy. En comentario, lo nuevo y la fila que lo pide.

```ts
type SelfView = {
  riderId: string
  teamId: string | null // ← nulo = agente libre                    (S-040, S-079, S-338)
  role: StageRole
  mentality: Mentality
  effort: Effort
  triggerKm: number | null
  triggerOn: TriggerCond | null // ← R22: «si salta Z», «en el tramo más duro» (S-321, S-322)

  perfil: number // efectivo en este bloque
  finishScore: number // con el finishType de ESTE grupo          (S-370)
  energyFraction: number
  reserveFraction: number // ← R13: cuánta W′ le queda                (S-454)
  matches: number
  tac: number
  spr: number
  des: number // ← R15: el bajador                        (S-465)

  gcDeficitSeconds: number
  gcRank: number | null
  standings: StandingRow[] // ← R05/R06: puntos, montaña, joven, equipos (S-035)

  pulling: boolean // iba en la rotación el bloque anterior     (S-472)
  turnIndex: number | null // ← R18: dónde va en la cola del turno      (S-492)
  commitUntilKm: number | null // ← R18/§7: hasta dónde vale su compromiso  (banco `temblor`)
  placement: number // ← R15: [0,1], 0 = cabeza del grupo        (S-189, S-490)
  gastado: boolean
  hurt: 'minor' | 'major' | null
  bruised: boolean // ← R08: se cayó ayer                       (S-380)
  raceRhythm: number // ← R08: [0,1], días sin dorsal             (S-468)
  kmSinceFeed: number // ← R13: avituallamiento                    (S-147, S-226)

  binding: PlanBinding // ← §2.5: dentro | exceptuado | carta-blanca | rebelde
  duty: DutyTag // ← R21: 'carta' | 'peon' | 'lanzador' | 'grupeto' | 'infiltrado'
  worksFor: string | null // a quién sirve HOY (puede no ser el leaderId del plan)
  debtTo: string[] // ← R09: a quién le debe un relevo          (S-081, S-413)
  contractYear: boolean // ← R25: el escaparate                      (S-428)
  knowsRoadHere: boolean // ← R25: reconocimiento por tramo           (S-429)
}
```

Lo que **sigue sin llevar, y a propósito**: la verdad del rival. Un corredor no lee `energy` ajena
nunca. Para eso está `GroupView.signals` (§3.2), que se lee con error y admite disimulo.

### 3.2 `GroupView` — lo que un corredor ve de su grupo (casi exacto)

Es la pieza más barata del catálogo y la que más filas apaga (R01: 15 situaciones). Se calcula **una
vez por grupo y bloque** y se comparte por referencia entre los que van en él.

```ts
type GroupView = {
  groupId: string
  kind: 'peloton' | 'move' | 'shed' // el título de «pelotón» lo sigue dando mainGroupId
  size: number
  isMain: boolean
  tS: number
  compromiso: number
  tension: number // ← S-491: el reloj que pudre una fuga

  // --- EL CENSO (R01) -------------------------------------------------------
  mates: MateHere[] // los míos que van AQUÍ
  matesAhead: MateThere[] // los míos que van DELANTE, con su hueco (S-128, S-133, S-177)
  matesBehind: MateThere[] // los míos que van DETRÁS               (S-247, S-288, S-290)
  teamCensus: Map<string, TeamContingent> // cuántos de cada casa, y quién es su carta
  freeAgents: number // sueltos: el listón del turno los trata aparte (S-235)
  captainOf: Map<string, string> // equipo → capitán de ruta presente     (S-459)

  // --- EL PELIGRO (R02, R13, R24) -------------------------------------------
  bestFinisherId: string // el mejor remate de este grupo con ESTE finishType
  // CONVENCIÓN, Y ES LA ÚNICA DEL DOCUMENTO: 0 = MEJOR rematador del grupo, 1 = el PEOR.
  // Se calcula con el finishType de ESTE grupo (R17), no con la etiqueta de la etapa.
  // Todas las fórmulas que la usan van escritas contra ella: el desempate de `arbitrate` (§2.4)
  // ordena por finishRank DESC para que salga el peor; `launchBias` (R17.3) multiplica POR
  // finishRank para que abra antes el peor; `bestFinisherSitGain` (R18.3) multiplica por
  // (1 − finishRank) para que se guarde el mejor.
  myFinishRank: number // [0,1], 0 = mejor rematador
  myPerfilRank: number // [0,1], 0 = mejor perfil efectivo
  threats: ThreatRow[] // los que me quitan algo si llegan conmigo
  signals: Map<string, RoadSignal> // ← R24: lo que se VE del otro, con error (S-488)

  // --- QUIÉN TIRA (R18, R20) ------------------------------------------------
  turn: Turn // ← R18: la cola CON orden y duración   (S-492)
  frontTeamId: string | null // el dueño del frente en este grupo

  // --- EL FINAL DE ESTE GRUPO (R17) -----------------------------------------
  finishType: FinishType // calculado con size, no con la etiqueta de la etapa (S-370)
  trains: SprintTrain[] // ← R16, solo dentro de trainFormKm     (S-351, S-355)
  lanes: number // ← R15/R16: cuántos trenes caben aquí  (S-481)
}

type MateHere = { riderId; role; duty; binding; freshness; finishRank; placement }
// finishRank con la MISMA convención: 0 = mejor rematador del grupo
type MateThere = { riderId; gapS; duty; binding; groupId }
type TeamContingent = { teamId; here: number; cardId: string | null; loyal: number }
type ThreatRow = { riderId; teamId: string | null; costIfHeWins: number }
type Turn = { order: string[]; head: number; kmLeft: number }
type RoadSignal = {
  placeSeen: number // en qué puesto le veo (con error)
  matesLeftSeen: number // cuántos gregarios le quedan
  drifting: number // [0,1] cuánto le veo sufrir            (S-319, S-269)
  standing: boolean // sube de pie = está al límite
  teamOffFront: boolean // su equipo ha soltado el frente
}
```

**Contrato de `signals`, y hay que respetarlo o el diseño se cae**: nunca se rellena con la verdad.
Se rellena con `readSignal(observador, objetivo)` de R24, que mete ruido en función del TAC del
observador y admite disimulo del observado. Es lo que hace que «oler la sangre» **pueda fallar**
(S-488) y que el jefe tocado pueda esconderse delante con cara de fresco.

### 3.3 `RaceView` — lo que un corredor (su director) sabe de la carrera (vieja y torcida)

```ts
type RaceView = {
  km: number
  kmToGo: number
  totalKm: number
  phase: Phase // ← R19                                 (S-218)
  fieldSize: number
  racingNow: number

  // --- LA CARRETERA POR DELANTE Y POR DETRÁS --------------------------------
  ahead: GroupBrief[] // en orden, con hueco y composición por equipos
  behind: GroupBrief[]
  dayBreakId: string | null
  mainId: string

  // --- LA GENERAL VIRTUAL (R04) ---------------------------------------------
  virtual: VirtualGc // qué pasa si esto se consolida
  costToMyMan: number // puestos que pierde MI hombre           (S-103)
  myLeash: number // segundos que puedo tolerar HOY         (S-391)
  jerseyHolderId: string | null
  virtualLeaderId: string | null //                                        (S-101, S-294)

  // --- EL DÍA ---------------------------------------------------------------
  weather: WeatherNow // ← R14: lateral, de cara, lluvia, calor, frío (S-203, S-205)
  roadClass: 'abierta' | 'normal' | 'revirada' // ← R20                       (S-493)
  roadWidth: number // ← R15/R16: de cuántos carriles         (S-481)
  nextBanner: BannerPoint | null // ← R06                                  (S-033, S-236)
  kmToNextPaves: number
  kmToNextClimb: number
  lastClimbKmToFinish: number // ← R28                                  (S-486, S-289)
  feedZones: number[] // ← R13                                  (S-147, S-226)

  // --- LO QUE VIENE DESPUÉS DE HOY (R10, R28) -------------------------------
  raceShape: RaceShape // días, terreno restante, crono restante
  isMarkedDay: boolean // el día objetivo de mi equipo           (S-405)
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
type VirtualGc = { rows: { riderId; virtualS; virtualRank }[] }
```

**Los dos contratos que sostienen todo esto:**

1. `RaceView` es **la verdad**. Ningún equipo la lee directamente: lee `believe(t, race)` (R24), que
   devuelve la misma forma con los huecos envejecidos, redondeados, con error y con el sesgo del
   director. El corredor **sí** lee la verdad de lo que tiene delante de los ojos —su grupo—, porque
   eso lo ve. Es la línea de §2.2 hecha tipo.
2. `RaceView.memory` y `RaceView.raceShape` **no son estado del motor**. Entran como parte de
   `StageInput.race`, igual que `gcDeficitSeconds` hoy. `packages/db` los construye leyendo las
   etapas anteriores —`events`, `results`, `workUnits`, `efforts`, `incidents` y las cuatro tablas
   de clasificación del paso 4—, y **el motor no emite ningún campo de memoria de vuelta**: no hay
   `StageOutput.memory`, ni lo hubo nunca en el código, ni lo va a haber. El motor sigue siendo
   `(input, seed) → output`, que es lo que sostiene todos los bancos (Frontera 3). Si algo que
   `packages/db` necesita no se puede deducir de la salida de hoy —quién no relevó, quién rompió un
   trato, el margen del corte—, la respuesta es **un evento nuevo en `events`** (R23), no un campo de
   salida paralelo: los eventos ya están sellados y narrados, y un segundo canal sería un segundo
   sitio donde puede vivir la verdad.

### 3.4 Tabla de contrato: qué ve cada decisión, antes y después

Esta tabla es el diff del rediseño en una hoja. La columna «hoy» sale de `mapa-simulate-decisiones.md`
§5, verbatim.

| Decisión                  | Ve HOY                                                           | Ve DESPUÉS                                                                              | Racimo                  |
| ------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------- |
| D-01 `relayDuty`          | empuje escalar + arropo                                          | + censo, turno con orden, deuda, motivo de la negativa                                  | R01 R18                 |
| D-02 `relayTurn`          | dueño del frente, arropo, `gcRank===1`                           | + cola persistente con duración, cupo por equipos, listón aparte para sueltos           | R18                     |
| D-06 `tieneHombreDelante` | mejor reloj del equipo                                           | + quién es (carta/peón/exceptuado/rebelde) y en qué grupo                               | R01                     |
| D-10 `teamStance`         | déficit de la cabeza, `inMove`                                   | + once motivos, general virtual por equipo, creencia con retardo                        | R04 R05 R24             |
| D-11 `frontTeamId`        | claim con histéresis, uno solo                                   | + subasta, alianzas, gorrones, pulso, reparto medido con Gini                           | R20                     |
| D-13 drop-back            | maillot, purposes, `quality`                                     | + señales del rival, capitán, escalonado por hueco, jefe que renuncia                   | R12 R24                 |
| D-17 `gcLeash`            | peor déficit delante, constante 700                              | + colchón sobre el terreno que QUEDA, por equipo                                        | R04                     |
| **D-22 `attemptFrom`**    | **escalar `teamAttack`**                                         | **censo, árbitro de casa, fase, creencia, señales, general virtual**                    | **R01 R02 R03 R19 R24** |
| D-26 corona (aduana)      | dado con rampa, una vez al nacer                                 | voto por equipos revisable cada km, con precio y pujas                                  | R03                     |
| D-30/31 marcaje           | objetivo explícito del jugador                                   | + marcaje emergente por general y por clasificación secundaria                          | R05 R13                 |
| D-41 ritmo del grupeto    | frescura media, hueco contra `peloton`                           | + capo, estimación del corte con error, margen de ayer, miedo por número                | R26                     |
| D-48 corte del abanico    | puntos de perfil + 25 al equipo del frente + 12 al jefe + suerte | **posición real**: entran los `cabenEnFila` con menor `placement`; el corte tiene AUTOR | R15                     |
| Meta (`finishStage`)      | rol, lanzador explícito, dado de colocación                      | + `teamOf`, censo del grupo, `placement` real, encajonamiento, trenes que se estorban   | R02 R15 R16 R17         |

---

## 4. Las reglas, racimo por racimo

Formato de cada racimo: **pieza** · **reglas** en forma implementable · **cierra** (IDs) ·
**constantes nuevas** con valor de partida, marcadas DERIVADA o [calibrar] · **cómo se mide**
(estadística, banco y banda propuesta).

Cuando una banda lleva **[calibrar]** es porque el número honesto no se puede escribir hoy: el banco
que lo mediría no existe todavía y se construye en §7, y el paso 21 lo fija. No hay ningún «a
definir».

---

### R01 · Compañeros visibles dentro del grupo (15 situaciones)

**Pieza.** `census(g)` → `GroupView.mates` / `matesAhead` / `matesBehind` / `teamCensus`. Un recorrido
por los miembros del grupo y una comparación de relojes. Es **la pieza más barata del catálogo y la
que más filas apaga**.

**Reglas.**

```
R01.1  matesAhead(r) = { m ∈ equipo(r) : reloj(grupo(m)) < g.tS − mateAheadGapS }
       si matesAhead(r) no vacío y el mejor de ellos NO es rebelde:
            sittingOn(r) = true  con motivo 'mate_ahead'      # no entra al turno
       → generaliza `tieneHombreDelante` (hoy SOLO en grupos 'move') AL PELOTÓN,
         y deja de exigir que el de delante sea CARTA.                            (S-128, S-133)

R01.2  matesBehind(r) con una CARTA DE GENERAL dentro y hueco ≥ mateBehindGapS (22 s):
            sittingOn(r) = true  y  el capitán evalúa el rescate                  (S-247, S-288)
       → generaliza `jefeEnApuros` de «purposes maillot|general» al hombre de la GENERAL de
         cualquier equipo, esté o no en el podio (S-048), y a cualquier grupo por detrás (R12.4).

       LA RAMA DE ETAPA SE CONSERVA TAL COMO LA DICTÓ LA v37, Y NO SE GENERALIZA. Una versión
       anterior de este documento la abría «A CUALQUIER CARTA, incluida la de etapa» y bajaba el
       umbral de 22 s a 12. Las dos cosas están mal, y las dos tienen medida detrás:
         · v37 (L.7305-7307): «por la etapa yo creo que nadie debería bajarse… salvo que sea un
           pinchazo/caída y la distancia sea pequeña, y sea gran favorito». La rama de etapa exige
           las CUATRO condiciones —percance ∧ carta del día ∧ gran favorito ∧ gap ≤ 60 s— y con
           ellas los avisos pasaron de 6,59 a 0,01 por etapa. Abrirla a «cualquier carta» devuelve
           ese 6,59.
         · v58 §4 acotó la regla al hombre de la general y le puso umbral 22 s porque SIN umbral la
           huella de la llana canónica se iba 387 s.
       O sea: `mateBehindGapS` = 22 s para la general, y la rama de etapa con sus cuatro puertas.
       Si alguien quiere bajarlo a 12 apoyándose en que ahora hay señales de carretera (R24) y el
       gregario reacciona al sufrimiento antes que al hueco (S-259, R13.2), eso es UN PASO APARTE,
       con la huella `llana-180` delante y el margen de 387 s como criterio de «hecho» declarado.
       No se cuela dentro de este racimo.

R01.3  EL REBELDE Y EL EXCEPTUADO, que parecen contradecirse y no lo hacen:
            el rebelde NO cuenta como hombre propio para la POSTURA del equipo   (S-113)
            pero NINGÚN compañero entra al turno para cazarle                    (S-188)
       → el equipo conserva su problema; el individuo conserva su lealtad.
         Al exceptuado no se le persigue nunca; al rebelde sí, si amenaza la baza (§2.5).

R01.4  EL EQUIPO PARTIDO EN TRES GRUPOS                                          (S-191)
       servedBy(equipo) = argmax_{m ∈ equipo} expectedValue(m)
       expectedValue = P(gana algo) × valor, con el finishType del grupo de m
       y NADIE persigue un grupo donde va uno de los suyos, sea del color que sea.

R01.5  LA FUGA QUE SE ROMPE EN EL PUERTO                                         (S-249)
       si el que se queda es la carta y el de delante es peón:
            el de delante no releva en la coronación y afloja en el descenso
            hasta mateWaitMaxS o hasta que le alcance, lo que llegue antes.

R01.6  EL SATÉLITE  (S-285, CONTRARIO nº 6 de las veinte más graves)
       Es la regla que faltaba, y no cae en ningún racimo del catálogo.
       si un leal va en un movimiento por delante y su JEFE ataca por detrás:
            deja de relevar en el acto (motivo 'awaiting_leader')
            y cuando el jefe llega a su altura, entra al frente con compromiso
            satelliteTowCommit (0,95) durante satelliteTowKm (5) o hasta meta.
       → «el satélite no tira en la fuga, se deja caer cuando su jefe ataca y le lleva a tope los
         últimos kilómetros». Su gemela —que tener hombres delante DÉ ganas de atacar de lejos— es
         R02.10, porque es apetito y no censo.

R01.7  LA CLASIFICACIÓN POR EQUIPOS COMO MOTIVO DE NO DEJAR CAER AL TERCERO      (S-250)
       si el motivo 'equipos' está activo (R05.5): matesBehind incluye al TERCER hombre
       y el rescate se evalúa también por él, no solo por la carta.
```

**Cierra.** S-089, S-113, S-128, S-133, S-177, S-187, S-188, S-191, S-211, S-247, S-249, S-250,
S-307, S-314, S-318. **Más S-285**, que el catálogo dejó fuera de los 28 racimos.

**Constantes nuevas.**

| Constante            | Valor    | Clase                                                                   | Por qué                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------- | -------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mateAheadGapS`      | **12**   | DERIVADA de `grupetoJoinGapSeconds` 12                                  | Mismo significado: «va por delante de verdad», el hueco mínimo que ya cuenta como estar en otro sitio.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `mateBehindGapS`     | **22**   | **Se CONSERVA el de hoy**                                               | Es el umbral de `jefeEnApuros`, puesto en la v58 §4 porque **sin umbral la huella de la llana se iba 387 s**. No se toca en esta tanda. La reacción temprana al sufrimiento (S-259, R13.2) entra por `signals.drifting`, que es un disparador **adicional** y no una rebaja de éste.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `stageRescueMaxGapS` | **60**   | DERIVADA de la v37, literal                                             | El techo de la rama de etapa del rescate: percance ∧ carta del día ∧ gran favorito ∧ gap ≤ 60 s. Con esas cuatro puertas los avisos bajaron de 6,59 a 0,01 por etapa; sin ellas, vuelven.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `mateWaitMaxS`       | **25**   | [calibrar]                                                              | Un descenso de puerto da para esperar medio minuto sin regalar la fuga. Banco: `realQueens`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `satelliteTowCommit` | **0,95** | **[calibrar]** contra `satelliteTowPct`, banco `realQueens` + media-190 | Es el «a tope» de un remolque de satélite. **No se deriva de nada**, y hay que decirlo: la versión anterior de este documento lo derivaba de un `POS.abanicoCommit` que **no existe en el repositorio** (grep de `POS`, `abanicoCommit` y `vientoMinimo` en `packages` y `apps`: cero resultados) y de `approachCommit`, que es una constante **nueva de este mismo documento** (R15b.2). Derivar una constante nueva de otra constante nueva no es un ancla: es una convención con disfraz, y el Apéndice B la contaría como derivada sin serlo. El ancla real más cercana es `windRaceCommit` **0,82** (`constants.ts:3052`), el compromiso con que hoy se rompe una carrera en viento; 0,95 está por encima a propósito —un remolque de cinco kilómetros es más duro y más corto— y por eso se calibra en vez de derivarse. |
| `satelliteTowKm`     | **5**    | [calibrar]                                                              | Un relevo de satélite en televisión dura entre 3 y 8 km. Banco: `realQueens` + media-190.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

**Cómo se mide.**

| Estadística        | Qué cuenta                                                                                       | Banco                          | Banda                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `mateAheadPullPct` | bloques en que uno tira teniendo un compañero no rebelde delante ÷ bloques con esa configuración | carrera pequeña + `smallTours` | **0-3 %** (no 0: el capitán puede tirar si el de delante no es carta y su equipo tiene otro motivo) |
| `satelliteTowPct`  | ataques de lejos de una carta con compañero delante que acaban con relevo del satélite           | `realQueens` + media-190       | **≥ 60 %** de esos ataques                                                                          |
| `censusCost`       | ms/etapa que cuesta el censo                                                                     | cualquiera                     | **≤ 3 % del coste de etapa**                                                                        |

Invariante nuevo (**70**): «nadie tira teniendo un compañero delante» ≤ 3 %.
Invariante nuevo (**68**, de `datos`): «**a un exceptuado no le persigue nunca su propio equipo**».
Es barato, comparte corrida y caza justo el defecto que produce un refactor de contextos mal cableado.

(La numeración es la de la tabla maestra de §7.6, que es **la única fuente**. Una versión anterior de
este documento daba a estos dos el 47 y el 57, que ya estaban usados por R24 y por R09
respectivamente; el 47 y el 57 quedan donde §7.6 los pone y estos dos reciben número propio.)

---

### R02 · Superioridad numérica: dos compañeros en el mismo grupo (12 situaciones)

Racimo entero roto: 4 `CONTRARIO` y 8 `AUSENTE`, ni una sola fila `CUBIERTO`.

**Pieza.** `teamTurn(g, t, …)` + `arbitrate(g, …)` de §2.4, más el brazo de meta: **`finish.ts`
recibe `teamOf`**, que hoy no recibe (verificado: Grep de `teamId|teamOf` entre `simulate.ts`
l. 6170-6500 devuelve vacío).

**Reglas.** Las cinco de §2.4 (carta del grupo, la individual manda, un instigador por casa, no
saltar a la rueda del compañero, releva el peón) más:

```
R02.6  META: DOS LEALES Y NINGÚN LANZADOR                                        (S-362, S-349, S-357)
       el peor por finishScore hace de lanzador improvisado:
            carta.score *= 1 + improvisedLeadOutBoost (0,05)
            peon.score  *= finishSacrificeWeight (0,90)
       y NUNCA los dos disputan: el peón no entra en sprintContenders.
       → «en un grupo reducido cualquier compañero lanza sin rol de lanzador».

       ¡CUIDADO CON LA DOBLE CUENTA, Y ES UN ERROR QUE ESTE DOCUMENTO YA COMETIÓ! `leadOutBoostPerHelper`
       **ya existe** (`constants.ts:3893`, valor 0,05) y **ya se aplica en el mismo sitio del remate**
       (`simulate.ts:6345`: `score *= 1 + STAGE.leadOutBoostPerHelper * min(present, leadOutMaxHelpers)`).
       Escribir R02.6 con ese nombre la aplicaba DOS VECES. Por eso:
            (a) la constante de R02.6 se llama `improvisedLeadOutBoost` y es NUEVA;
            (b) el lanzador improvisado **NO se suma a `present`** en `trenDe()`: no tiene rol de
                lanzador, y contarlo allí sería la misma doble cuenta por otra puerta;
            (c) si en un mismo grupo hay lanzador declarado Y lanzador improvisado, manda el
                declarado y el improvisado no aporta nada: `present` ya lo cobra.
       La alternativa —reutilizar la constante existente subiendo `present` en 1— es legítima y más
       barata, pero pierde la distinción entre «tren montado» y «apaño de dos», que es justo lo que
       S-362 pide. Se elige (a)-(c) y se deja escrita la alternativa.

R02.7  MAYORÍA                                                                   (S-306, S-305)
       con k ≥ 3 de la misma casa en un grupo de n ≤ 8:
            compromiso objetivo = clamp(0,55 + majorityPaceGain (0,08)·k, 0, 0,95)
            y se ataca POR TURNOS: cooldown de ataque POR EQUIPO (teamAttackCooldownKm 6),
            no por grupo (que sigue en 4,5).
       Tres equipos con dos cada uno: cada pareja mete UNO al turno y guarda al otro;
       los guardados se miran hasta que uno rompe el pacto (el primero cuyo margen supere
       trioAttackMarginS).

R02.8  MINORÍA — QUÉ HACE ÉL                                                     (S-265, S-358)
       outnumbered = clamp((maxContingenteRival − misLeales) / 3, 0, 1)
       si remato mejor:  duty −= outnumberedSitGain (0,9)·outnumbered      # me escaqueo
       si remato peor:   appetite *= 1 + outnumberedAttackGain (0,6)·outnumbered  # ataco lejos
       si el pelotón viene cerca (gap < 45 s): colaboro igual              # o no llega nadie
       → es la fila literal: «se escaquea si remata mejor, ataca lejos si remata peor, y colabora
         si el pelotón viene cerca».

R02.9  DOS CARTAS DE GENERAL: EL «1-2»                                           (S-293)
       con dos leales dentro de gcCoLeaderS (45 s) el uno del otro en la general:
            uno ataca, el otro NO cierra y contraataca a rueda del que cierre.
            followDamp(coLíder → coLíder) = 0     # excepción escrita a R02.4
            si uno cae de la carrera, el otro pasa a jefe sin discusión (R21).

R02.10 TENER HOMBRES DELANTE DA GANAS DE ATACAR DE LEJOS   (S-285, la otra mitad)
       appetite(carta) *= 1 + satelliteAttackGain (0,45) · min(matesAhead, 2) / 2
       solo si phase ∈ {decisivo, aproximacion} y los de delante no son rebeldes.
       → hoy el motor hace lo contrario: el compañero de delante ESTORBA (teamAttack 0,4 con
         `manUpTheRoad`), así que atacar de lejos con gente delante sale PEOR que sin nadie.
         Con R01.6 y esto, la emboscada existe: es la jugada más rentable del ciclismo real.

R02.11 EL PUNCHEUR QUE ATACA CONTRA EL SPRINT DE SU COMPAÑERO                    (S-343, CONTRARIO)
       si el equipo tiene carta de sprint viva en el grupo y el final admite llegada agrupada:
            appetite(otro leal) *= teamMateSpoilDamp (0,20)
       salvo estructura 'doble' con las dos cartas declaradas (§5.1), donde vale 1.
```

**Cierra.** S-094, S-265, S-293, S-303, S-304, S-305, S-306, S-343, S-349, S-357, S-358, S-362.
**Más S-285** (con R01.6).

**Constantes nuevas.**

| Constante                | Valor    | Clase                                                                                                 | Por qué                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `numSuperiorityMaxGroup` | **12**   | [calibrar]                                                                                            | Por encima de doce, dos compañeros dejan de ser una mayoría y pasan a ser dos corredores. Banco: `duelBench`. **Acota R02.7 y R02.8 (mayoría y minoría dentro de un grupo), y NO acota el derecho al frente**: S-248 —«siete hombres contra tres en el pelotón»— pide justamente lo contrario y vive en un grupo de 176. Su pieza es `smallSquadClaim` movido de la convocatoria al kilómetro, en `frontAuction` (R20.2), no aquí. |
| `cardHoldBack`           | **0,25** | [calibrar]                                                                                            | La carta se guarda: su apetito a un cuarto mientras haya peón disponible.                                                                                                                                                                                                                                                                                                                                                          |
| `teamMateFollowDamp`     | **0,15** | [calibrar]                                                                                            | No es 0 del todo: si el compañero se va y a mí me conviene ir, voy. El 0 estricto es la regla de §2.4 para `followProbability`; esto es el apetito.                                                                                                                                                                                                                                                                                |
| `teamPeonDuty`           | **0,6**  | DERIVADA de `relayDutyByRole` (gregario 1,0 − libre 0,6 ≈ el escalón que hoy separa un papel de otro) |                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `teamCardDuty`           | **1,2**  | DERIVADA de `relayProtectedPenalty` 1,2                                                               | Es el mismo número, aplicado por decisión y no por etiqueta de rol.                                                                                                                                                                                                                                                                                                                                                                |
| `finishSacrificeWeight`  | **0,90** | DERIVADA de `finishRoleWeight[gregario]` 0,88                                                         | Es el mismo castigo, aplicado por decisión y no por rol. Es justo lo que el comentario de `constants.ts` l. 3460-3470 dejó pendiente: «la respuesta fue un factor por rol, no una mecánica de colaboración».                                                                                                                                                                                                                       |
| `improvisedLeadOutBoost` | **0,05** | DERIVADA de `leadOutBoostPerHelper` 0,05, que **ya existe**                                           | Mismo número, **sitio distinto y sumando distinto**: el lanzador improvisado no entra en `present`, así que no se cobra dos veces. Ver el aviso de R02.6.                                                                                                                                                                                                                                                                          |
| `outnumberedSitGain`     | **0,9**  | [calibrar]                                                                                            |                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `outnumberedAttackGain`  | **0,6**  | [calibrar]                                                                                            |                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `gcCoLeaderS`            | **45**   | DERIVADA de `tacticBreakGapSeconds` 45                                                                | El hueco que el motor ya considera «esto es otra cosa».                                                                                                                                                                                                                                                                                                                                                                            |
| `teamAttackCooldownKm`   | **6**    | DERIVADA del cooldown de grupo 4,5 × 1,33                                                             | Un equipo se espera algo más que el grupo para repetir.                                                                                                                                                                                                                                                                                                                                                                            |
| `majorityPaceGain`       | **0,08** | [calibrar]                                                                                            |                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `satelliteAttackGain`    | **0,45** | [calibrar]                                                                                            | Banco: `realQueens` + media-190.                                                                                                                                                                                                                                                                                                                                                                                                   |
| `teamMateSpoilDamp`      | **0,20** | [calibrar]                                                                                            |                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `teamRelayAttackBoost`   | **2,0**  | [calibrar]                                                                                            | El segundo, armado, ataca al bloque siguiente con el doble de ganas.                                                                                                                                                                                                                                                                                                                                                               |
| `teamRelayAttackKm`      | **1,5**  | [calibrar]                                                                                            | Ventana del armado.                                                                                                                                                                                                                                                                                                                                                                                                                |

**Cómo se mide.**

| Estadística             | Qué cuenta                                                                             | Banco                           | Banda                                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mateVsMateSprintPct`   | grupos de meta con dos leales en el top-3 y ninguno habiendo lanzado                   | carrera pequeña + `smallTours`  | **0-2 %** (hoy no se mide, y el defecto está citado: «no tiene sentido que luchen el sprint 2 del mismo equipo, y encima les gana el otro»)              |
| `pairEdgePct`           | de las fugas de tres con una pareja y un suelto, cuántas gana la pareja                | **`duelBench`** (nuevo, barato) | **72-88 %**. Azar puro = 66,7 %. Por encima de 88 la superioridad sería determinista y el rival dejaría de tener juego, que es lo que S-265 le devuelve. |
| `teamAttacksAlternated` | de los ataques de un equipo con k ≥ 2 en un grupo, fracción que hace el peor rematador | `duelBench` + carrera pequeña   | **60-90 %**                                                                                                                                              |
| `satelliteTowPct`       | ver R01                                                                                | `realQueens`                    | **≥ 60 %**                                                                                                                                               |

Invariante nuevo (**48**): «dos compañeros no se disputan un sprint entre ellos» = 0 %.

---

### R03 · La aduana como voto por equipos, revisable cada kilómetro (24 situaciones)

Es **la pieza de la que cuelga el día entero**: S-114 es la nº 11 de las veinte más graves y su razón
es que «si la cuerda sale de un dado, todo lo que viene después —control, caza, desenlace— está
construido sobre azar».

**Pieza.** `customs(movimientos, posturas, creencias)` sustituye a `pelotonAllows`. **La aduana es
una subasta de trabajo** (S-119): la fuga sale si nadie con hombres frescos está dispuesto a pagar el
cierre.

**La hipótesis nula, escrita antes que la regla — y escrita bien, porque la versión anterior de este
documento la escribía de una forma que era matemáticamente imposible.** `tacticAllowBase` (0,3) es
hoy una **PROBABILIDAD** (`constants.ts:2681`), no un umbral. Si la aduana se escribe como
`allowed = pot < price` con `price > 0`, entonces con todos los votos a cero `pot = 0 < price`
**siempre**, y la aduana deja pasar el 100 % de los movimientos: no reproduce la conducta de hoy, la
triplica. Y encima `rngAduana` —el subflujo que §2.6 declara— no lo usaría nadie.

Así que la aduana **es y sigue siendo un dado**, y lo que el voto cambia es su probabilidad.
`tacticAllowBase` pasa a `customsBase` **con el mismo valor**, y la regla se escribe de modo que
**con `pot = 0` la probabilidad valga exactamente `customsBase` = 0,30**, que es la conducta de hoy. Es el injerto de `dominio` y no es un detalle de estilo: este es el
paso que más mueve `flat.breakawayWinPct` y `mountain.breakawayWinPct`, o sea las dos bandas que el
dueño fijó en persona, y sin hipótesis nula no hay forma de saber si un movimiento viene del voto o
de haber tirado la rampa por el camino.

**Reglas.**

```
R03.0  EL VETO, QUE VA ANTES QUE LA CUENTA Y NO DENTRO DE ELLA                   (S-118)
       si move.carriesGcLeader ∧ el equipo del maillot tiene ≥ 1 hombre vivo en carrera:
             move.allowed = false;  FIN.       # no se puja, no se compara, no se sortea
       → S-118 está CUBIERTO hoy y tiene cita del dueño (v32): «el maillot no se va en la fuga».
         La versión anterior de este documento lo escribía como un sumando de 99 dentro de
         `objection`, y como `pot` recorta cada objeción a `min(objection, payable)` y `payable`
         está acotada muy por debajo de 1, ese «veto» valía lo mismo que cualquier otra objeción:
         una fuga con el líder dentro podía salir, y S-118 REGRESABA. Un veto que se puede pagar
         no es un veto. Por eso sale de la suma y se resuelve antes, con `return`.
         La excepción es el maillot sin equipo (S-079, R04.5): si no le queda un hombre vivo, no
         hay quien lo ejerza y el movimiento pasa a la cuenta normal.

R03.1  EL PRECIO DE CERRAR
       price(move) = customsSizeGain-y-carretera, SIN customsBase y SIN rampa:
       price(move) = (1 + customsSizeGain (0,12) · max(0, party − 3))
                   · roadFactor(roadClass)                     # R20/S-493
                   · (1 + customsWindGain (0,4) · vientoLateral)
                   · rampa(km)                                 # la rampa de arranque de hoy, intacta
       LA RAMPA VA AQUÍ Y SOLO AQUÍ, y es la segunda corrección de peso a la versión anterior.
       Allí `rampa(km)` multiplicaba `price` Y `payable`, y como la decisión era una comparación
       entre los dos, el factor SE CANCELABA: la rampa de arranque —medida, con cita («en el 99 %
       de los casos en el km 1 ataca alguien», v39) y declarada intacta— no habría tenido NINGÚN
       efecto sobre `allowed`. Aplicada solo al precio significa lo que tiene que significar: al
       principio del día cerrar es BARATO, y por eso los primeros intentos mueren.

R03.2  LA OBJECIÓN DE CADA EQUIPO, CON SU ESCALA ESCRITA
       objection(t, move) ∈ [0, 4]  (se recorta al final; sin el veto, que ya no vive aquí)
             0                                    si t tiene una CARTA dentro           (S-086)
           − customsLoyalInside (0,25)             si t tiene un leal cualquiera dentro  (S-092)
           + gcObjection(t, move)                  # R04: puestos que pierde mi hombre   (S-088, S-103)
           + stageObjection(t, move)               # alguien de dentro me gana la etapa   (S-090)
           + secondaryObjection(t, move)           # R05: mi rival de montaña/puntos      (S-108)
           × memoryFactor(t, move)                 # R09: el ganador de ayer, el fugado de ayer

       stageObjection = 1,0 si ∃ f ∈ move : finishScore(f) ≥ finishScore(carta_t) − customsRivalGap (6)
       gcObjection    = clamp(costToMyMan(t, move) / customsGcPlaces (3), 0, 2)
       secondaryObjection ∈ [0, 1]                 # R05, misma escala que stageObjection

       LAS TRES ESTÁN EN LA MISMA ESCALA A PROPÓSITO —«una carta mía se juega algo» = 1,0— y el
       techo de 4 es el equipo que lo tiene todo en juego. Es lo que hace comparables `objection` y
       `payable`, que sin escala común no lo eran.

R03.3  LA PUJA Y EL DADO                                                         (S-119, S-091, S-229)
       payable(t) = presentInPeloton(t)/8 · (1 − spentFraction(t)) · quality(t)      ∈ [0, 1]
       pot        = Σ_{t : objection(t) > 0} min(objection(t), payable(t))           ∈ [0, ~6]

       # LA ADUANA ES UN DADO, NO UN UMBRAL. Con pot = 0 devuelve customsBase exacto.
       P(allowed) = clamp( customsBase (0,30) · f(price(move), pot), 0, customsAllowMax (0,85) )
       f(price, pot) = price / (price + customsPotWeight (1,0) · pot)
       move.allowed = rngAduana() < P(allowed)

       COMPROBACIÓN DE LA HIPÓTESIS NULA, que es lo que el paso 6 mide en A/B:
             pot = 0  ⇒  f = price/price = 1  ⇒  P = customsBase = 0,30 = LA CONDUCTA DE HOY.
       Y la forma tiene el signo correcto en los dos extremos: mucho dinero dispuesto a pagar el
       cierre (pot alto) hunde P; una fuga cara de cerrar (price alto, por tamaño, carretera o
       viento) la sube.

       → SE RECALCULA CADA KM mientras el movimiento no sea dayBreak.                    (S-120)
         El dado NO se vuelve a tirar cada km: se tira al nacer y en cada revisión se compara el
         `P` nuevo con el `P` de la revisión anterior, y solo cambia `allowed` si la diferencia
         supera `commitHysteresisMargin` (R18.9). Sin eso, mil tiradas por etapa dan un `allowed`
         que tiembla, que es justo lo que `customsRevisionsPerStage` 0,5-4 vigila.
         La fuerza se mide con los VIVOS y no con la foto de salida.                     (S-229)

R03.4  QUIÉN ES ELEGIBLE PARA IRSE
       (a) veto al velocista puro       — ya existe (breakawaySkipSprThreshold 70)       (S-473)
           pasa de umbral ABSOLUTO a percentil del campo del día (p90 de SPR), para que
           funcione también en continental.                                     [DECISIÓN DEL DUEÑO 3]
       (b) descuento al que tiraba      — ya existe (tacticPullingAppetite 0,1)          (S-472)
       (c) CUPO POR EQUIPO, que es un PRECIO y no un veto                                (S-083)
             quota(t) = 1
                      + 1 si party ≥ customsBigBreakRiders (12)                          (S-115)
                      + 1 si desperation(t) ≥ 0,7                                        (R09/S-402)
                      + 1 si t es invitado sin representación                            (S-066)
                      − 1 si t tuvo hombre en la fuga de AYER   (mínimo 0)                (S-046, S-408)
             si t ya tiene quota(t) hombres delante: appetite = 0 para el resto de leales
       (d) EL HOMBRE CORRECTO   (S-433, CONTRARIO nº 10 de las veinte más graves)
             breakScore = 0,45·TAC + 0,35·terrainScore + 0,20·RES
             terrainScore = MON·climbShare + LLA·(1 − climbShare)     # climbShare = kmSubida/total
             → en una reina se manda al ESCALADOR, no al rodador. Se retira el `breakScore`
               de `autoOrders`, que es la fórmula de rodador con la que se elige hoy siempre.

             ESTO YA SE PROBÓ UNA VEZ Y SE RETIRÓ, y hay que decirlo con el mismo rigor con que
             este documento cita `dc489a6` para `breakFinaleCommit`. **v44 §1**: la composición
             MEJORABA, pero el efecto sobre la victoria de la fuga era pequeño (3,3 → 4,4 %) y
             **ponía en ROJO la foto de meta de las carreras pequeñas** —`smallTours.photoRepeatTopFive`
             y `bestSprinterWinPct`—, así que se **retiró**. Se vuelve a proponer aquí por dos
             motivos que entonces no existían: el perfil pasa a ser la carretera (paso 1), así que
             `climbShare` significa algo distinto; y el cupo por equipo (c) y la memoria (R09.7)
             cambian QUIÉN entra, no solo con qué puntuación.
             CONSECUENCIA OBLIGATORIA, y va en la columna «Mueve» del paso 6: `smallTours.photoRepeatTopFive`
             y `smallTours.bestSprinterWinPct` se miden en ese paso, y la **predicción declarada
             antes de medir** es «la foto de meta de las carreras pequeñas NO vuelve a rojo». Si
             vuelve, se para y se diagnostica; no se ensancha la banda.

R03.5  EL INFILTRADO                                                             (S-474)
       si objection(t) > 0 ∧ payable(t) < price/2 ∧ t tiene un leal disponible:
             manda uno con duty 'infiltrado': entra en la fuga y NUNCA releva.
             efecto: compromiso del movimiento × (1 − 1/party); no se organiza y se muere sola.
             y el resto del pelotón, al ver quién va dentro, le da MENOS cuerda:
                   objection ajena × infiltratedSeenGain (1,25)

R03.6  LA ADUANA DEL PUENTE Y DEL CONTRAATAQUE                                   (S-121, S-173)
       misma subasta con dos correcciones:
             + bridgeReinforceGain (0,5) a la objeción si el puente lleva rematadores
             − bridgePassGain (0,4) si el puente REFUERZA una fuga que ya me conviene cazar
               («que hagan ellos el trabajo»)                                            (S-173)

R03.7  LA SEGUNDA FUGA DEL DÍA                                                   (S-116, CONTRARIO)
       tras una captura: phase = 'captura' durante capturaKm (1) y luego 'fuga' otra vez
       durante secondBreakWindowKm (8) con λ × secondBreakLambda (2,5).
       Sale gente NUEVA, y esa puede ser la que llegue.

R03.8  EL HOMBRE AL PUENTE, Y LA FUGA QUE NO CUAJA HASTA QUE ESTÁN TODOS  (S-095, S-087)
       Es la regla que faltaba: las dos filas figuraban en el «Cierra» de este racimo y NINGUNA de
       las siete reglas anteriores las escribía. R03.5 manda un hombre, sí, pero a SABOTEAR
       (`duty 'infiltrado'`, «NUNCA releva») y solo con `payable < price/2`, que es lo contrario de
       lo que S-095 pide.
       si objection(t) > 0  ∧  payable(t) ≥ price/2  ∧  t no tiene a NADIE dentro:
             t emite un intento de PUENTE con duty 'representante' y appetite = 1
             durante bridgeWindowKm (5), con el mejor breakScore disponible (R03.4d)
             y el representante SÍ releva: va a estar, no a estorbar.
       EN CUANTO ENTRA:  objection(t) → 0 (S-086, ya escrito) y t sale del `pot`.
       → De ahí sale S-087 sin ninguna regla extra: mientras queden equipos con objeción y sin
         representación, el `pot` sigue alto, `P(allowed)` sigue bajo, y **la fuga no cuaja**. En
         cuanto los interesados están dentro, el `pot` se hunde y la fuga se va. Es literalmente
         «el equipo sin representación cierra el intento y lo vuelve a intentar».
       → Y es la regla que PRODUCE `breakTeamsRepresentedPct` 55-90 %, que hasta ahora era una
         banda sin ninguna regla detrás que la generara.
```

**Cierra.** S-064, S-066, S-076, S-083, S-086, S-087, S-088, S-090, S-091, S-095, S-114, S-115,
S-116, S-117, S-118, S-119, S-120, S-121, S-149, S-425, S-433, S-472, S-473, S-474.

**Constantes nuevas.**

| Constante                | Valor    | Clase                                                                                            | Por qué                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `customsBase`            | **0,30** | **DERIVADA de `tacticAllowBase` 0,30**                                                           | Anclaje deliberado: con todos los votos a cero, la aduana reproduce la conducta de hoy. Es la hipótesis nula del paso 6.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `customsSizeGain`        | **0,12** | DERIVADA de `tacticAllowSizePenalty` 0,05, reescalada al nuevo dominio (precio, no probabilidad) | Una fuga de nueve cuesta un 72 % más de cerrar que una de tres.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `customsWindGain`        | **0,4**  | [calibrar]                                                                                       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `customsLoyalInside`     | **0,25** | [calibrar]                                                                                       | Un leal cualquiera dentro descuenta; una **carta** dentro anula (eso es 0, no un descuento).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `customsRivalGap`        | **6**    | DERIVADA de `chaseContenderMaxGap` 12, la mitad                                                  | Aquí basta con «me puede ganar», no con «es contendiente».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `customsGcPlaces`        | **3**    | [calibrar]                                                                                       | Tres puestos perdidos = objeción máxima parcial.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `customsJerseyVeto`      | ~~99~~   | **NO LLEGA A EXISTIR como número**                                                               | Sigue siendo **veto** y no descuento, y por eso **deja de ser una constante**: tras R03.0 el veto es una RAMA (`if (…) { move.allowed = false; return }`), no un sumando, y no hay ninguna fórmula que multiplique un 99. Se deja escrita la fila para que se vea el porqué: un umbral tan alto que «nadie lo paga» era la forma de escribir un veto **dentro** de una suma, y esa suma recortaba cada objeción a `min(objection, payable) ≤ 1`. Un número que no puede hacer su trabajo no se calibra: se sustituye por la rama. Lo que queda del 99 es el **invariante 72**, que es donde el veto se comprueba. **No cuenta en el Apéndice B.** |
| `customsBigBreakRiders`  | **12**   | [calibrar]                                                                                       | Frontera entre «la fuga de cuatro a ocho de un día llano», donde el cupo muerde, y «la de veinte o cuarenta de montaña», donde dos de la misma casa es lo normal (S-083 lo dice literalmente).                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `customsRevisionEveryKm` | **1**    | DERIVADA de `decisionEveryBlocks` 10                                                             |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `infiltratedSeenGain`    | **1,25** | [calibrar]                                                                                       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `bridgeReinforceGain`    | **0,5**  | [calibrar]                                                                                       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `bridgePassGain`         | **0,4**  | [calibrar]                                                                                       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `secondBreakWindowKm`    | **8**    | [calibrar]                                                                                       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `secondBreakLambda`      | **2,5**  | DERIVADA de la ventana de captura de R19                                                         |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `customsAllowMax`        | **0,85** | DERIVADA de `tacticAllowMax` 0,7, subido                                                         | Techo de la probabilidad de la aduana. Sube de 0,7 a 0,85 porque el suelo ya no es un dado ciego: con `pot = 0` la fuga se va sola.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `customsPotWeight`       | **1,0**  | [calibrar] contra `flat.breakawayWinPct`                                                         | Cuánto pesa el dinero dispuesto a pagar el cierre frente al precio. Es **la** perilla del paso 6 y la que se barre primero.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `bridgeWindowKm`         | **5**    | [calibrar]                                                                                       | Ventana del hombre al puente de R03.8. Banco: carrera pequeña, contra `breakTeamsRepresentedPct`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

**Se retira**: `tacticAllowKmGain` 0,5, `tacticAllowSizePenalty` 0,05, `tacticAllowGcPenalty` 0,75,
`tacticAllowMax` 0,7, y el `breakScore` de rodador de `autoOrders`. **Se conserva** la rampa de
arranque entera (`tacticAllowSettleFlatKm` 6 / `ClimbKm` 100 / `Floor` 0,15 y `tacticSettleKm` 5):
es correcta, está medida y tiene cita («en el 99 % de los casos en el km 1 ataca alguien», v39). Pasa
a multiplicar **`price` y SOLO `price`** (R03.1). Multiplicar los dos lados de la comparación la
habría anulado, y ése es el defecto que se corrige aquí.

**Guardarraíl declarado, porque una rampa anulada no se ve en ninguna banda de hoy**: el paso 6 añade
al banco `breakBirthKm` —**el km en que nace la fuga del día**, mediana y p10— con banda **1-12 km**
(la cita de la v39 fija el suelo). Si tras el paso 6 la fuga del día nace de media en el km 40, la
rampa está muerta aunque `flat.breakawayWinPct` siga en banda.

**Cómo se mide.**

| Estadística                | Qué cuenta                                                                | Banco                         | Banda                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `breakTeamMaxShare`        | máximo de hombres de un mismo equipo en la fuga del día                   | carrera pequeña, 8×6          | mediana **1**, p95 **≤ 2**, máximo **3**                                                                                        |
| `breakTeamsRepresentedPct` | equipos con motivo que acaban representados en la fuga del día            | carrera pequeña               | **55-90 %**                                                                                                                     |
| `breakMotivedPct`          | fugados con un motivo declarado (no relleno)                              | carrera pequeña               | **70-100 %**                                                                                                                    |
| `customsRevisionsPerStage` | veces que un `allowed` cambia de valor **después** de nacer               | llana canónica                | **0,5-4** (que la revisión sirva de algo, y no tiemble)                                                                         |
| `breakClimberShare`        | fracción de la fuga del día con MON ≥ p60 del campo, en etapas de montaña | `realQueens`                  | **≥ 0,50** (hoy la fórmula es de rodador siempre)                                                                               |
| `breakBirthKm`             | km en que nace la fuga del día (mediana y p10)                            | llana canónica                | **1-12 km** — el guardarraíl de que la rampa de arranque sigue viva tras el paso 6                                              |
| `jerseyInBreakPct`         | fugas del día que llevan al `gcRank === 1` con su equipo vivo             | carrera pequeña + `grandTour` | **0 %** (invariante duro **72**)                                                                                                |
| `flat.breakawayWinPct`     | ya existe                                                                 | llana canónica                | **5-16** — es la banda del dueño; **se re-mide con 300-500 semillas en el paso 0 y se re-decide con él en el paso 6**; ver §9.1 |

El primero es el que contesta la queja literal —«seis del mismo equipo en una fuga de nueve»— y **hoy
no lo mide nadie**: `mapa-bancos.md` §7.2 lo dice explícitamente («ningún banco cruza `protagonistas`
de `fuga_formada` con `teamId`»).

Invariantes nuevos: **49** «la fuga del día no lleva tres de la misma casa» (p95 ≤ 2) · **53** «la
fuga en montaña la componen escaladores» (≥ 0,50) · **72** «**ninguna fuga del día lleva al
`gcRank === 1`**» (0 %, tolerancia cero, salvo maillot sin un solo hombre vivo). El 72 es **lo que
queda del viejo `customsJerseyVeto` 99**: el veto ya no es un número dentro de la suma sino la rama
de R03.0, y lo que lo hace veto de verdad es que haya una cifra de tolerancia cero vigilándolo. Es
también el que caza la regresión de S-118 si alguien devuelve el veto al `pot`, que es por donde se
perdió la primera vez. Se imprime con las demás: §7.5 lo lista como `jerseyInBreakPct`.

---

### R04 · La general virtual y el colchón que depende de lo que queda (17 situaciones)

**Pieza.** Dos funciones puras y una tabla: `virtualGc(race)`, `costToMyMan(team, move)` y
`leashOf(team, raceShape)`.

**Reglas.**

```
R04.1  LA GENERAL VIRTUAL, POR EQUIPO                                            (S-103, S-102)
       virtualS(f, gap) = gcDeficit(f) − gap                    # si esto se consolida
       costToMyMan(t, move) = #{ f ∈ move : virtualS(f, gap) < gcDeficit(carta_t) }
       → puestos que pierde MI hombre. Hoy solo existe `frontThreatDeficit` (el MEJOR de la fuga),
         que no dice nada de a quién le cuesta ni cuánto.
       Y de ahí sale «si la fuga pasa a todo el podio, dos o tres equipos reparten el trabajo;
       si solo pasa al líder, los demás miran» sin ninguna regla extra.

R04.1b LO QUE ME CUESTA UN MOVIMIENTO, ENTERO: `threatOf(t, move)`               (S-176)
       `costToMyMan` es SOLO general, y con eso no se puede cerrar S-176 —el CONTRARIO nº 1—,
       porque en una etapa llana el perseguidor normal es el equipo del sprinter y su
       `costToMyMan` vale **0 en todos los movimientos**: un `argmax` sobre un empate a cero, sin
       desempate escrito. La caza de R20.1 apuntaría a cualquier sitio, y `chaseTargetCorrectPct`
       85-100 % sería inmedible en la llana canónica, que es donde vive el defecto.
       Así que el coste se escribe ENTERO y en un solo sitio, y es LITERALMENTE los tres términos
       de `objection` de R03.2:
             threatOf(t, move) = gcObjection(t, move)          # R04.1, escala [0,2]
                               + stageObjection(t, move)       # R03.2,  escala [0,1]
                               + secondaryObjection(t, move)   # R05,    escala [0,1]
       DESEMPATE, escrito y determinista: a igualdad de amenaza (dentro de threatTieBand 0,05),
       el movimiento MÁS CERCA DE META; a igualdad de eso, el `groupId` menor.
       Es el mismo cálculo que la aduana ya hace, y por eso se extrae a UNA función pura que
       consumen las dos: `customs()` la usa para el `pot` y `frontAuction()` para el objetivo.
       Escribirlo dos veces era garantizar que se desincronizaran.

R04.2  EL COLCHÓN SOBRE EL TERRENO QUE QUEDA   (S-391, nº 14 de las veinte más graves)
       recoverable(r, shape) = gcClimbRecoverPerKm (1,6 s/km) · kmSubidaRestante
                             + gcTtRecoverPerKm    (1,1 s/km) · kmCronoRestante
                             + gcFlatRecoverBase   (25 s)      si quedan ≥ 3 etapas en línea
       leash(t) = clamp(recoverable(carta_t) · gcLeashShare (0,6),
                        gcLeashMinS (90), gcLeashMaxS (900))
       → SUSTITUYE a gcControlLeash = 700, que es una constante y decide sola a quién se persigue
         durante toda la carrera. Día 3 de 21 con montaña por delante: leash ≈ 900 → se deja ir.
         Día 19 con una crono corta: leash ≈ 150 → se caza.
       El comentario de `gcControlLeash` «queda desmentido por la medida y hay que reescribirlo»
       (deuda §14.5) se cierra aquí retirando la constante, no reescribiendo el comentario.

R04.3  QUIÉN DEFIENDE                                                            (S-239, S-258)
       defensor(g) = el mejor colocado en la general PRESENTE en g
       colchón     = déficit del siguiente presente − déficit del defensor
       → hoy `gcDefence` exige déficit 0 y devuelve null si el maillot no va en el grupo, o sea que
         en un grupo de veinte sin el maillot NADIE defiende nada. Con esto, tiran los que pierden
         puestos con la situación, y el maillot solo si nadie más pierde.

R04.4  EL MAILLOT PRESTADO                                                       (S-096, CONTRARIO)
       borrowed(t) = finishScore(carta_t, terrenoRestante)
                   < bestFinishScore(campo, terrenoRestante) − jerseyBorrowedGap (12)
       si borrowed: el motivo 'maillot' pasa a claim jerseyBorrowedClaim (1) en vez de 4.
       → el equipo del cronista que perderá el maillot en la montaña NO se funde controlando:
         el trabajo es del favorito real.

R04.5  EL MAILLOT SIN EQUIPO — CON LAS DOS CONDICIONES DE LA FILA, NO CON UNA (S-079, CONTRARIO)
       La versión anterior de este documento decía: «`relayRaceLeaderPenalty` (3) se aplica solo si
       el líder tiene ≥ 2 leales EN SU GRUPO; con 0 o 1, el líder RELEVA». Eso está mal por dos
       sitios a la vez, y los dos están medidos:
         · **Regresa S-129**, que está CUBIERTO y es «el defecto que el dueño vio TRES veces»: «el
           líder de la general no paga viento nunca salvo emergencia». En el final de etapa normal
           —grupo de veinte, el maillot con uno o ningún gregario dentro— la regla nueva le pone a
           relevar. Y S-129 no se nombraba ni una vez en este documento.
         · **Deshace la v57 §4**, que puso `relayRaceLeaderPenalty` = 3 **solo para el PRIMERO fuera
           del pelotón** después de que el dueño viera «otra vez el maillot amarillo tirando del
           pelotón… bueno, no es el pelotón, es un grupo de 20, del que solo tiran 10», y lo midió:
           **9 fotos de 637 → 3**.
       La fila S-079 pide dos cosas a la vez y la versión anterior se quedaba con media: «si nadie
       trabaja por él **Y LA FUGA LE QUITA EL MAILLOT**, el líder sin equipo releva o lo pierde».
       Redacción correcta:
             la penalización SE APLICA SIEMPRE, como hoy, salvo que se cumplan LAS TRES:
                   (a) teamId == null  ∨  0 leales VIVOS EN CARRERA (no «en su grupo»)
                   (b) virtualLeaderId ≠ jerseyHolderId          # la emergencia: le están quitando el maillot
                   (c) no hay nadie más en su grupo con purpose general que pierda puestos (R04.3)
             y aun entonces releva con `relayRaceLeaderPenalty` a la MITAD, no a cero: paga lo
             justo para no perderlo, no hace de gregario de nadie.
       → El maillot sin equipo **pierde tiempo**; ése es el precio de no tener equipo, y es lo que
         S-266 y GRUPO-50 piden por el otro lado. Relevar es la excepción de emergencia.
       Invariante de NO REGRESIÓN, nuevo (**73**), porque sin él esto no se ve en ninguna banda:
             `jerseyOnFrontPct` = bloques con el `gcRank === 1` en `turn.head` en etapas llanas
             ≤ 3 % ; y `jerseyOnFrontFotos` ≤ 5 de 637 (el número que dejó la v57 §4).

R04.6  EL TRASPASO EN CARRETERA                                                  (S-294)
       virtualLeaderId se recalcula cada km; en cuanto cambia:
             su equipo pasa de purpose 'general' a 'maillot' (deja de atacar, controla)
             y todos los demás con purpose general le atacan a ÉL.

R04.7  CEDER EL MAILLOT A PROPÓSITO                                              (S-161, CONTRARIO)
       si leash(t) > gapDelMejorFugado ∧ el fugado no amenaza el podio final ∧ quedan ≥ 5 días:
             el equipo del maillot PUEDE dejarlo marchar: claim 4 → 1 durante ese día,
             con P(jerseyDumpProb 0,35) y decisión del director (no del corredor).
       → se quita el jersey y se ahorra diez días de control, que es lo que hace un equipo real.
```

**Cierra.** S-048, S-078, S-079, S-096, S-097, S-098, S-099, S-100, S-101, S-102, S-103, S-104,
S-161, S-181, S-239, S-258, S-294, S-391.

**Constantes nuevas.**

| Constante             | Valor        | Clase                                                                    | Por qué                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | ------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gcClimbRecoverPerKm` | **1,6 s/km** | [calibrar] sobre `realQueens`                                            | Es el orden de la diferencia entre dos hombres de general **vecinos** por km de puerto, no entre el mejor y el peor: hoy el 1.º y el 10.º de la reina canónica se separan 40-300 s sobre 15 km, o sea 2,7-20 s/km entre extremos. Se mide como «segundos que se mueve la general por km de subida» y el número medido lo sustituye en el paso 21.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `gcTtRecoverPerKm`    | **1,1 s/km** | [calibrar] sobre `timeTrials`                                            | **No hay derivación honesta y hay que decirlo**: la que traía este documento no salía de sus propios datos. `tailPct` 8-15 % sobre una crono de 40 km a 50 km/h (2.880 s) son 230-432 s repartidos en 40 km = **5,8-10,8 s/km**, no 0,7-1,4; y además `tailPct` mide la COLA CONTRA EL GANADOR (`targets.ts:153`), no la distancia entre dos hombres consecutivos. El ancla honesta más cercana es `timeTrials.p90MinusP10Seconds` **80-170 s** sobre 40 km = 2,0-4,25 s/km, y eso separa al p10 del p90, o sea al 80 % del campo; entre dos hombres de general **vecinos en el top-10** es una fracción pequeña de esa cifra. 1,1 s/km es un punto de partida plausible dentro de esa fracción y **nada más**: se mide en el paso 0 (segundos que se mueve la general entre puestos consecutivos por km de crono, sobre las 5 cronos reales) y el número medido lo sustituye en el paso 21. **`leash(t)` —la pieza que S-391 pide— depende directamente de este número, así que su calibración es prerrequisito del paso 6, no del 21.** |
| `gcFlatRecoverBase`   | **25 s**     | DERIVADA de las bonificaciones 10/6/4 acumulables                        | Lo que se puede recuperar en llano sin abanico es bonificación, y poco más.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `gcLeashShare`        | **0,6**      | DERIVADA de `gcThreatFraction` 0,6                                       | Mismo número y mismo significado; se conserva la constante.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `gcLeashMinS`         | **90**       | [calibrar]                                                               | Suelo: por debajo de minuto y medio no se controla, se caza.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `gcLeashMaxS`         | **900**      | **[calibrar]** contra `grandTour` (`leashSpanS`, `jerseyChangesPerRace`) | Se parece al 900 de `smallTours.flatMoveWorstMarginS`, pero **no se deriva de él y hay que decirlo**: ese 900 es una **alarma de PEOR CASO** —«la escapada se va a 15 o 20 minutos… ya ha pasado en grandes vueltas», v38, y `mapa-requisitos-duenio.md` lo etiqueta literalmente «Sigue siendo alarma de peor caso»—, no una tolerancia de control ni un colchón que un director conceda. Usar un techo de alarma como techo de decisión es cambiarle el significado por el camino. 900 se conserva como punto de partida por orden de magnitud y se calibra contra el recorrido del colchón en una gran vuelta.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `jerseyBorrowedGap`   | **12**       | DERIVADA de `teamStageCardGap` 8 × 1,5                                   | El mismo escalón que ya decide quién tiene carta, con margen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `jerseyBorrowedClaim` | **1**        | DERIVADA de `claimFor('proteger')` 1                                     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `jerseyDumpProb`      | **0,35**     | [calibrar]                                                               | No es determinista: un equipo real a veces se lo quita y a veces no.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

**Se retira**: `gcControlLeash` 700.

**Cómo se mide.**

| Estadística             | Qué cuenta                                                                                        | Banco                         | Banda                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------- |
| `leashSpanS`            | recorrido del colchón entre el día 1 y el último de una gran vuelta                               | `grandTour`                   | **≥ 400 s de recorrido** (si no se mueve, la pieza no hace nada)    |
| `chaseTargetCorrectPct` | fracción de cazas cuyo objetivo es el movimiento que MÁS cuesta al que paga, no el más adelantado | `grandTour` + carrera pequeña | **85-100 %** — es la medida de S-176                                |
| `jerseyChangesPerRace`  | cambios de maillot en una gran vuelta                                                             | `grandTour`                   | **2-8** [calibrar]                                                  |
| `jerseyOnFrontPct`      | bloques de etapa llana con el `gcRank === 1` en la cabeza del turno                               | llana canónica + `grandTour`  | **≤ 3 %** (invariante **73**, no regresión de S-129 y de la v57 §4) |

Invariantes nuevos: **50** «se persigue lo que hace daño, no lo más adelantado» (≥ 85 %) ·
**73** «**el maillot no tira del pelotón**» (`jerseyOnFrontPct` ≤ 3 % en llanas, ≤ 5 fotos de 637),
que es el invariante de no regresión de S-129 y del arreglo medido de la v57 §4.

---

### R05 · Motivos secundarios como claim de equipo (24 situaciones)

S-162 es la nº 13 de las veinte más graves, y su razón es demoledora: «sin motivos secundarios, **dos
tercios del pelotón no tienen ninguna razón para correr**». 19 de sus 24 filas están `AUSENTE`.

**Pieza.** El vocabulario de motivos, y las cuatro clasificaciones que los alimentan.

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

Los tres primeros son los de hoy con sus mismos números (`claimFor`), de modo que **un campo sin
clasificaciones secundarias se comporta exactamente como hoy**.

**Reglas.**

```
R05.1  ORDENAR, NO SUMAR                                                         (S-020)
       El equipo activa UN motivo por km: el de mayor claim con condición cumplida.
       El secundario aporta claim 0 mientras el primario esté en intent perseguir|lanzar,
       y su claim entero en cuanto el primario esté satisfecho o sea 'nada'.
       → sustituye a `teamDriveSecondCard` (+0,2), que SUMA, y por eso hoy el maillot acaba
         cazando puntos (que es lo que S-015 declara CONTRARIO).

R05.2  PUNTOS                                          (S-016, S-105, S-196, S-336, S-383, S-407)
       activo si standings.puntos.deficit ≤ pointsChaseDeficit (40) o rank ≤ 3
       intent 'pancarta' en los bannerApproachKm (12) antes de una volante si gap ≤ 240 s
       intent 'nada'     en los bannerReliefKm (5) después              # S-105 literal:
             «un solo equipo tira 40 km por veinte puntos y afloja 500 m después de la volante»
       el tren se monta DOS veces (volante y meta) y los hombres gastados FALTAN luego (S-196)
       y el que va a por el verde sigue esprintando por el quinto puesto cuando ya no gana (S-336).

R05.3  MONTAÑA                                                    (S-017, S-042, S-043, S-065, S-108)
       intent 'sembrar' siempre: mete hombres en los intentos hasta que uno cuaje
       cupo de aduana +1 los días con ≥ komDayPoints (30) puntos de cima
       nunca colabora en la caza
       si el rival directo de la clasificación entra en un intento: se mete con él a cualquier
       precio (appetite = 1 mientras ese intento viva)                                   (S-043)
       y dentro de la fuga, el líder de la montaña y su rival NO se relevan antes de la cima (S-108).

R05.4  JOVEN                                                              (S-018, S-271, S-272)
       igual que 'general' pero defensor y amenaza se calculan sobre la clasificación de jóvenes.
       Un joven fuera del podio de la general y dentro del podio joven corre ESA carrera:
       no sigue a los favoritos, marca al otro joven.

R05.5  EQUIPOS                                                (S-019, S-034, S-250, S-295, S-396)
       activo si teamsRank ≤ 5 o deficit ≤ teamsThreatS (240)
       efecto: helpBack y matesBehind se extienden al TERCER hombre, no solo a la carta (R01.7)
       y los gregarios de montaña de ese equipo aprietan un poco más para no perder el 3.er tiempo
       se apaga en cuanto el equipo baja de 3 corredores vivos.                          (S-396)
       El DORSAL AMARILLO (S-034) obliga a defender ESA clasificación, no a dar la cara en
       abstracto: el extra de derecho al frente lo da el maillot individual, no el dorsal.

R05.6  PATROCINADOR / INVITACIÓN                                                 (S-066)
       equipos con flag `invited`: cupo mínimo 1 TODOS los días y appetite × sponsorGain (1,6)
       hasta que uno cuaje; después, 0 para el resto de la casa.
       Y el día DESPUÉS de salir tres horas en la tele, ese hombre afloja (R08/freshness).

R05.7  COMBATIVIDAD                                                              (S-044, S-045)
       motivo INDIVIDUAL, no de equipo: un cazaetapas con duty 'carta' y sin opciones de ganar
       conserva appetite alto todo el día; su objetivo es ESTAR, no llegar.
       Si la fuga se forma sin él, su día se ha acabado: appetite × 0,2 el resto de la etapa.

R05.8  RANKING ANUAL                                                             (S-447)
       activo el último tercio de la temporada para equipos en la frontera del ranking:
       en la meta, el corredor con este motivo entra en sprintContenders aunque no pueda ganar
       (esprinta por el duodécimo) y no regala un puesto en la general final.

R05.9  EL MAILLOT QUE OBLIGA                                                     (S-452)
       campeón del mundo o nacional: objection ajena × championWatchGain (1,35)
       y appetite propio × championShowGain (1,25): corre obligado a mostrarse.

R05.10 EL MAILLOT NO CAZA PUNTOS                                                 (S-015, CONTRARIO)
       autoOrders: al portador del maillot (gcRank == 1) se le ponen
             contestSprints = contestClimbs = false.
       DOS PRECISIONES QUE LA VERSIÓN ANTERIOR SE COMÍA, y las dos importan:
         (a) NO es «sin excepción»: R07.4 es una excepción escrita —si el maillot ES el sprinter y
             el final admite llegada agrupada, conserva el sprint— y decir «sin excepción» dos
             líneas antes de la excepción es una contradicción, no un énfasis.
         (b) HOY EL CÓDIGO HACE LO CONTRARIO Y FUE UNA DECISIÓN: `world/autoOrders.ts:149` da al
             maillot `order({ role: 'lider', mentality: 'reservon', contestClimbs: mountain })`
             —el maillot SÍ disputa cimas en etapa de montaña, por decisión de la v42—, y la
             puerta de la carta de general no es `gcRank == 1` sino `gcRank <= GC_CARD_RANK` con
             `GC_CARD_RANK = 5` (línea 44).
       Redacción correcta, entonces: la puerta de esta regla es `gcRank == 1` **porque es el
       PORTADOR del maillot quien no caza puntos** (no el hombre de general en general, que es lo
       que `GC_CARD_RANK` 5 delimita y que R05.4/§5.3 usan para otra cosa), y **`contestClimbs:
       mountain` para el maillot SE RETIRA**, con su motivo: la v42 se lo dio para que el maillot no
       regalara la montaña, y R05.3 + R05.11 lo resuelven mejor —hay un equipo con motivo 'montana'
       que la disputa a propósito—. Efecto esperado y declarado en §9.1: `komJerseyContestedPct`
       **sube** (los puntos de cima pasan a manos de quien los busca) y el maillot deja de gastar
       cerillos en cotas que no decide.

R05.12 AISLAR AL LÍDER: EL INTENT QUE FALTABA               (S-292 AUSENTE, S-194 PARCIAL)
       Es la pieza que este documento no tenía y que el catálogo nombra LITERALMENTE como
       inexistente. GENERAL-11 (= S-292): «no existe intent "aislar"/"endurecer"… en subida el
       compromiso del pelotón es `climbRaceCommit` 0,85 FIJO cuando `raceThisClimb`, es decir, el
       pelotón sube a tope siempre… sin que ningún equipo lo decida». Y S-194 la señala como su
       mitad que falta: «falta que endurezca con sus gregarios para aislarle (S-292)».
       Los siete `intent` nuevos de §5.5 —sembrar, pancarta, sabotear, aliar, tregua, escaparate,
       ocupar— no incluían ninguno que hiciera esto, así que S-292 y S-194 quedaban sin pieza y
       aun así contadas dentro del 90 % de cobertura. Se añade el OCTAVO:

       intent 'aislar'
             ACTIVO si:  purpose(t) ∈ {general, joven}
                       ∧ ∃ rival de general por delante de mi carta en la general
                       ∧ matesLeftSeen(rival) ≥ 1                  # R24: LEÍDO, con error
                       ∧ onClimb ∧ kmToGo ≤ isolateKm (35)
             EFECTO:
                   los peones del equipo entran al turno con compromiso `isolateCommit` (0,90)
                   —un tempo que NO busca romper, busca soltar gregarios—
                   y la λ de ataque de MI PROPIA CARTA se pone a 0 mientras dure
                   → no se ataca con el rival arropado: primero se le quita la escolta.
             SE APAGA en cuanto matesLeftSeen(rival) == 0, y ENTONCES salta la carta:
                   appetite(carta) × isolateReleaseGain (1,8) durante isolateReleaseKm (3).
       → Es exactamente la secuencia de la fila: «los gregarios del 2.º tiran para descolgar a los
         del maillot, y cuando se queda solo, el 2.º salta». Y se apoya en `matesLeftSeen` de R24.5,
         que ya existe con su ruido: **aislar a alguien que en realidad conserva dos hombres es un
         error caro y posible**, que es la mitad buena de la pieza.
       → Y encaja con S-284 y S-286 (el tren de montaña de R16.9): el tempo que aísla lo pone el
         tren de montaña, no un compromiso de grupo anónimo.
       BANDA, ya escrita en GENERAL-11: `secondAttacksWhenIsolatedPct` = veces en que el 2.º de la
       general ataca cuando el maillot llega sin gregarios; **60-90 %**. Banco: `realQueens`.

R05.11 SABER QUÉ SE LIDERA                                                       (S-035, S-221)
       SelfView.standings lleva puesto y distancia en las CUATRO clasificaciones, y el evento
       de cima lleva la ACUMULADA para que se pueda cantar «pasa a liderar la montaña».
       → hoy `raceGc` ya acumula puntosVolante y puntosMontana y el motor nunca los recibe:
         es un campo que no se pasa, no una mecánica que no existe.
```

**Dependencia dura, y es lo que abarata este racimo.** Exige que existan las clasificaciones. Hoy
`packages/db/src/gcSort.ts` solo resuelve la general. Hace falta `classifications.ts` con cuatro
tablas acumuladas y un `StandingRow[]` en el `StageRider`. **Va antes que el racimo**, en el paso 4,
y **no cambia conducta por sí solo**.

**Cierra.** S-015, S-016, S-017, S-018, S-019, S-020, S-031, S-034, S-041, S-042, S-043, S-044,
S-045, S-065, S-105, S-108, S-162, S-271, S-272, S-336, S-383, S-396, S-407, S-447, S-452.
**Más S-292 y S-194** (R05.12), que el catálogo dejó sin racimo y que este documento no nombraba.

**Constantes nuevas.** `PURPOSE_CLAIM` (tabla; los tres primeros DERIVADOS de `claimFor` de hoy, los
siete nuevos [calibrar]) · `pointsChaseDeficit` **40** [calibrar] · `pointsChaseMaxGapS` **240**
[calibrar] · `bannerApproachKm` **12** [calibrar] · `bannerReliefKm` **5** DERIVADA de la cita
literal de S-105 («afloja 500 m después», redondeado a la resolución de decisión) · `komDayPoints`
**30** [calibrar] · `teamsThreatS` **240** **[calibrar]** contra `grandTour`
(`secondaryJerseyOwnerPct`) —la versión anterior lo declaraba «DERIVADA de
`gcThreatFraction · gcControlLeash` = 420 × 0,57», y eso era falso por partida doble: el 0,57 no
aparece justificado en ninguna parte, y `gcControlLeash` **es una de las constantes que este mismo
documento retira** (§9.5), así que la derivada habría quedado colgando de un número muerto. Una
derivación que necesita un coeficiente inventado no es una derivación— · `sponsorGain` **1,6**
[calibrar] · `championWatchGain` **1,35** [calibrar] ·
`championShowGain` **1,25** [calibrar] · `isolateKm` **35** [calibrar] · `isolateCommit` **0,90**
DERIVADA de `climbRaceCommit` 0,85, algo por encima (el tempo que aísla es más duro que el de
control) · `isolateReleaseGain` **1,8** [calibrar] · `isolateReleaseKm` **3** [calibrar].

**Se retira**: `teamDriveSecondCard` 0,2.

**Cómo se mide.**

| Estadística                    | Qué cuenta                                                                                            | Banco                         | Banda                                                                                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `motivePct`                    | fracción del campo con un motivo activo ≠ `ninguno`                                                   | `grandTour` + carrera pequeña | **65-90 %**. Hoy sería ≈ 33 % por construcción (tres motivos y solo unos pocos equipos): es la traducción numérica de «dos tercios del pelotón no tienen ninguna razón para correr». |
| `secondaryJerseyOwnerPct`      | maillots secundarios que acaban en manos de alguien que los disputó a propósito, frente a subproducto | `grandTour`                   | **70-100 %**                                                                                                                                                                         |
| `pointsChaseKm`                | km que un equipo tira solo por la volante                                                             | `grandTour`                   | **15-60 km** [calibrar] (S-105 dice «40 km»)                                                                                                                                         |
| `secondAttacksWhenIsolatedPct` | veces que el 2.º de la general ataca cuando el maillot llega sin gregarios                            | `realQueens`                  | **60-90 %** (banda de GENERAL-11, S-292)                                                                                                                                             |
| `isolationAttemptPct`          | puertos decisivos con un equipo en `intent 'aislar'`                                                  | `realQueens` + `grandTour`    | **25-60 %** [calibrar]                                                                                                                                                               |

Invariante nuevo (**51**): «los cuatro maillots tienen dueño y ninguno se decide por accidente».

---

### R06 · Las pancartas: volante y cima como puntos del recorrido (20 situaciones)

**Pieza.** `stage/banners.ts`: la pancarta como **punto real del trazado**, no como un porcentaje del
recorrido.

```ts
type BannerPoint = {
  km: number
  kind: 'volante' | 'cima'
  category: 0 | 1 | 2 | 3 | 4 // 0 = HC
  points: number[] // a los N primeros que fija la categoría
  bonusS: number[] // R07: puede ser []
  surgeKm: number // cuánto antes empieza el acelerón
}
```

**Reglas.**

```
R06.1  QUIÉN LA DISPUTA, Y QUIÉN PAGA                          (S-137, S-141, ambas CONTRARIO)
       bannerAppetite(r, b) = base(r, b)
                            · (1 + komLeadGain (0,8) · esLíderOSegundoDeEsaClasificación)
                            · (1 + bannerOrderGain (1,5) · orders.contestSprints|contestClimbs)
       contienden solo los que pasan bannerContestMin (0,25); **SOLO ELLOS pagan bannerCost**.
       EL DEFECTO, ESCRITO COMO ES Y NO PEOR DE LO QUE ES (verificado en `simulate.ts:6126-6132`):
             `disputeClimb` **IGNORA `contestClimbs`** —al revés que `disputeBanner`
             (l. 6049-6052), que sí la lee y solo cae a «disputan todos» si nadie está interesado—
             y **cobra `bannerCost` a los N primeros de la tabla de puntos, aunque ninguno de ellos
             la disputara**. No cobra a todo el grupo: el `if (pts <= 0) return` deja fuera a los
             que no puntúan. La mitad falsa de la acusación era ésa; la mitad cierta —que la
             casilla del jugador no la lee nadie en las cimas— es el CONTRARIO nº 8 (S-031) y es
             la que se arregla aquí.
       Y ojo con la banda que lo mide: ver el aviso de `bannerContestants` más abajo.

R06.2  EL ACELERÓN Y LA VENTANA DE ALIVIO                                        (S-212, S-236)
       en los surgeKm antes de una pancarta con category ≤ 2 o points[0] ≥ 8:
             compromiso del grupo ≥ bannerSurgeCommit (0,90) para los contendientes
             y `placement` se pelea (R15): la pancarta es un PUNTO DE COLOCACIÓN
       después, durante bannerReliefKm (5):
             compromiso × bannerReliefDamp (0,85)  y  λ × bannerReliefLambda (1,8)
             → la ventana de contraataque que hoy no existe: «se relaja justo después».

R06.3  ORDEN DE PASO PARA TODOS LOS GRUPOS                     (S-220 CUBIERTO; S-153 CONTRARIO)
       los puntos se reparten por orden de paso mirando a TODOS los grupos, pero solo a los N
       primeros que fija la categoría (ya ocurre).
       Lo que falta: el PELOTÓN también esprinta la volante por lo que dejan los fugados:
             puntosDisponibles = points.slice(fugadosDelante)
             si no vacío ∧ hay alguien con motivo 'puntos': se disputa, y luego se apaga 5 km.

R06.4  EL FUGADO QUE CORONA Y SE DEJA COGER                                      (S-080)
       si el único motivo de un fugado era la montaña y ya coronó la última cima puntuable de su
       alcance:  giveUpLambda += komDoneGiveUp (0,5). Se sienta y espera al pelotón.

R06.5  EL SPRINTER QUE PASA EL INTERMEDIO Y SE VA AL GRUPETO                     (S-138)
       cobrada la volante, el sprinter con motivo 'puntos' cambia su duty a 'grupeto' al pie del
       primer puerto: giveUpLambda alto y VOLUNTARIO (R26.3).

R06.6  CUÁNTO VALE EL PUERTO                                                     (S-140)
       climbWeight(b) = points[0] / komMaxPoints (20)
       λ de ataque en el puerto × (0,6 + 0,8·climbWeight)
       → nadie se destroza por un cat. 4; por un HC con el maillot en juego se corre desde 10 km
         antes de la cima (que es lo que da el `surgeKm` de categoría 0).

R06.7  LA CIMA DISPUTADA DENTRO DE LA FUGA                                       (S-124, S-109)
       dos km antes, la fuga se estira; el que pelea la montaña ataca a 500 m-1 km, corona solo,
       después SE ESPERA y el grupo se rehace en el descenso:
             tras la cima, su compromiso × komWinnerWaitDamp (0,55) durante komWaitKm (2).
       El intermedio dentro de la fuga lo pelean dos o tres de los seis; los demás pasan a rueda.
```

**Dependencia**: exige que el generador coloque pancartas de verdad. Hoy solo hay **una** meta
volante en el escenario canónico y las cimas se derivan del perfil. Va con el **paso 1** (el perfil),
y con él S-033: «toda etapa en línea de una vuelta lleva meta volante —y hay etapas con dos—, y lo
que la hace valer no es un porcentaje del recorrido sino dónde cae respecto al terreno y al final».

**Cierra.** S-033, S-035, S-080, S-109, S-124, S-136, S-137, S-138, S-140, S-141, S-142, S-153,
S-196, S-212, S-220, S-221, S-236, S-315, S-336, S-373.

**Constantes nuevas.** `komLeadGain` **0,8** [calibrar] · `bannerOrderGain` **1,5** [calibrar] ·
`bannerContestMin` **0,25** [calibrar] · `bannerSurgeCommit` **0,90** DERIVADA de `gear.finalDrive`
0,72-0,85 (algo por encima: el acelerón de pancarta es corto y duro) · `bannerReliefDamp` **0,85**
[calibrar] · `bannerReliefLambda` **1,8** [calibrar] · `komDoneGiveUp` **0,5** [calibrar] ·
`komMaxPoints` **20** DERIVADA del reparto de cimas HC · `bannerSurgeKm` **2** (volante) / **3**
(cima cat. ≤ 2) / **10** (cima cat. 0 con maillot en juego) [calibrar] · `komWinnerWaitDamp` **0,55**
[calibrar] · `komWaitKm` **2** [calibrar].

**Cómo se mide.**

| Estadística                | Qué cuenta                                                 | Banco                        | Banda                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | ---------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bannerContestants`        | corredores que pagan `bannerCost` por pancarta             | llana canónica + `grandTour` | **3-15** — S-137 literal: «esprintan entre tres y quince». **AVISO: hoy este número no lo fija la conducta, lo fija la longitud de `STAGE.climbPoints[cat]` / `sprintPoints`**, porque solo pagan los que puntúan. Medirlo antes de R06.1 no dice nada de la carrera: dice cuántos puestos reparte la tabla. Es medible **solo después** de que el pago se ate a `bannerAppetite ≥ bannerContestMin` en vez de al puesto, y por eso su primera lectura útil es la del paso 10, no la del paso 0. |
| `bannerCostOnUninterested` | coste cobrado a corredores sin motivo ni casilla           | todos                        | **0** (invariante duro)                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `postBannerAttackPct`      | pancartas seguidas de un intento en los 5 km siguientes    | llana canónica               | **20-50 %**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `komJerseyContestedPct`    | puntos de montaña ganados por alguien con motivo 'montana' | `grandTour`                  | **55-90 %**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

Invariante nuevo (**52**): «nadie paga una pancarta que no disputaba» = 0.

---

### R07 · Bonificaciones (6 situaciones)

**Pieza.** Los segundos de **meta** ya existen y ya se restan del tiempo en los tres acumuladores de
general. Faltan dos cosas: la **pancarta con segundos**, y el número **visible para quien decide**.

```
R07.1  BONIFICACIÓN EN LA PANCARTA                                               (S-193)
       bonusS = [3,2,1] en volantes y cimas de vuelta que lo declaren.
       Los disputan los HOMBRES DE GENERAL —no los sprinters— cuando el rival de general está a
       ≤ bonusChaseDeficitS (20 s): entran en `bannerAppetite` con base de general, no de puntos.

R07.2  EL NÚMERO VISIBLE                                                         (S-334, S-353)
       en el remate, un hombre con purpose maillot|general y un rival a ≤ bonusChaseDeficitS:
             entra en sprintContenders aunque su finishScore no lo justifique
             y su score × (1 + bonusStakeGain (0,08))         # se juega algo, aprieta
       → «el 2.º remata por los 10 s y el maillot se mete a taparle». Hoy nadie los VE al decidir.

R07.3  EL QUE YA LA TIENE HECHA                                                  (S-335)
       si colchón > bonusIgnoreCushionS (180): finishScore del maillot × leaderConcedeWeight (0,6).
       No se pelea la etapa; a veces la deja a la fuga o a un compañero.

R07.4  EL SPRINTER-MAILLOT                                                       (S-352, CONTRARIO)
       autoOrders paso 0: el maillot manda sobre el terreno, PERO si el maillot es el mejor SPR
       del equipo y el final admite llegada agrupada, CONSERVA rol 'sprinter' y su tren.
       Lo que se le quita es `contestClimbs`, no el sprint. Y defiende la general a golpe de
       bonificación, que es la fila literal.

R07.5  LA LLEGADA DEL SOLITARIO Y LA SEGUNDA PLAZA                               (S-360, CUBIERTO)
       ya ocurre; se conserva y se le añade que las bonificaciones de 2.º y 3.º sean visibles en
       R07.2, para que el sprint por la segunda plaza tenga apuesta de general.
```

**Cierra.** S-193, S-334, S-335, S-352, S-353, S-360.

**Constantes nuevas.** `bonusChaseDeficitS` **20** DERIVADA de la suma de bonificaciones de meta
(10+6+4) · `bonusStakeGain` **0,08** [calibrar] · `bonusIgnoreCushionS` **180** [calibrar] ·
`leaderConcedeWeight` **0,6** [calibrar] · `bannerBonusS` **[3,2,1]** DERIVADA del reparto real.

**Cómo se mide.** `bonusDecidedRacePct` = vueltas llanas cuya general la decide una bonificación;
banda **10-40 %** sobre un calendario de vueltas de solo llano (Sharjah/Arabia, dentro de
`smallTours`). `jerseyInSprintPct` = sprints masivos con el maillot entre los diez primeros teniendo
colchón < 20 s; banda **50-100 %**.

---

### R08 · El depósito que persiste entre etapas (16 situaciones)

**Frontera con `diseno-entrenamiento.md`, que ya está cerrado.** Ese documento se queda con la mitad
fisiológica: depósito, cerillos, REC en `isDeepDepleted` y en el umbral de TSB, recuperación por
edad. **Este documento no la toca ni la contradice**: se limita a la mitad táctica, que es **cómo el
director LEE ese estado al planificar**.

```
R08.1  EL PARTE DEL EQUIPO                                          (S-398, S-399, S-410, S-411)
       El director ve, por hombre: freshness, cerillos, bruised, illDays, kmAlFrente acumulados.
       teamBudget(día) = teamBudgetPerRider (9) · Σ_leales fitFactor(r) · dayWeight(día)   # R10
       fitFactor(r) = clamp(0,4 + 0,6·freshness(r), 0,4, 1)
       → el equipo que ayer tiró 120 km hoy tiene menos presupuesto y pone a otros dos; al cuarto
         o quinto día de controlar, el equipo del maillot ya no llega y el maillot cambia de manos.
       Con 7 hombres por enfermedad, el reparto se hace con 7 y no con 8: `budget` ya escala.

R08.2  EL TOCADO Y EL ENFERMO                                           (S-380, S-381, S-144)
       bruised → duty degradado a 'peon' o 'grupeto'; no entra al turno; no arriesga en descenso
                 (crashLambda × bruisedCrashGain 1,4); giveUpLambda × 1,6.
       illDays crece varios días antes de un abandono: no es un dado de un día (S-381).
       LA CUNETA (S-144): la decisión de seguir mira lo que se juega, y NO la decide solo él:
             abandonAppetite × (1 − stakeOf(r)),  stakeOf = carta 0,7 · general 0,4 · resto 0
             y el coche decide: si el equipo necesita ocho mañana, `carOrder = 'acaba'` fuerza
             seguir dentro del corte; si el hombre ya no sirve, `carOrder = 'retira'`.

R08.3  EL LÍDER ADMINISTRA LA VUELTA, NO LA ETAPA                       (S-379, CONTRARIO)
       un favorito NO gasta un cerillo en una media montaña del día 6 aunque pudiera ganarla:
             appetite = 0 si duty == 'carta' de general ∧ !isMarkedDay ∧ phase != 'decisivo'
             salvo que costToMyMan > 0.
       matchBudgetRace(r) = matches · raceMatchShare(día, shape)                          # R10

R08.4  EL QUE LLEGA SIN RITMO Y EL QUE VIENE DE UNA VUELTA               (S-468, S-385, S-482)
       raceRhythm ∈ [0,1] entra en el StageRider (lo calcula packages/db por días sin dorsal):
             tacticalCostMultiplier += rhythmCostGain (0,25)·(1 − raceRhythm)   en la primera hora
             # ← Frontera 2 / §9.1bis: NO edita physics.ts, y entra en el tope y en la suma cero
             placement inicial peor  ·  appetite × raceRhythm
       La recuperación desigual (S-482) es de `diseno-entrenamiento.md` §4: aquí solo se LEE,
       para repartir trabajo y convocar.

R08.5  LA RETIRADA POR ORDEN Y LA SEMIETAPA                             (S-450, S-431)
       el equipo puede bajar a un hombre sano y gastado entre etapas (decisión de packages/db,
       no del motor) y mañana corre con uno menos por decisión propia.
       Un día con dos sectores es DOS StageInput con el mismo día y depósito ENCADENADO:
       el que se vacía en la primera paga en la segunda.

R08.6  TERCERA SEMANA                                                   (S-377, S-389, S-378)
       ya ocurre (`deepDepletedYesterday` resta un cerillo, `stageRun.ts:246-255`). Lo que se
       añade es que el DIRECTOR lo lea: los equipos que perdieron la general se reconvierten a
       cazaetapas (R21), el maillot controla con 4-5 hombres y la fuga gana más.
```

**Cierra.** S-144, S-377, S-378, S-379, S-380, S-381, S-385, S-389, S-398, S-399, S-410, S-411,
S-431, S-450, S-468, S-482.

**Constantes nuevas.** `bruisedCrashGain` **1,4** [calibrar] · `rhythmCostGain` **0,25** [calibrar] ·
`stakeOf` (tabla: carta 0,7 · general 0,4 · resto 0) [calibrar] · `fitFactor` (fórmula, DERIVADA del
`spentFraction` que ya modula `teamDrive`). El resto sale de R10.

**Cómo se mide.** `frontTeamRotationDays` = días distintos en que cambia el equipo que más tira en
una gran vuelta; banda **≥ 8 de 21** (hoy no se mide). `jerseyTeamFadeDay` = día en que el equipo del
maillot deja de poder controlar; banda **día 9-18** (S-399: «al cuarto o quinto día de controlar»,
pero contando desde que lo tiene). Banco: `grandTour`.

---

### R09 · Las deudas y el humor del pelotón (21 situaciones)

14 de 21 filas `AUSENTE`. **Pieza.** `RaceMemory` **como entrada**, no como estado del motor. La
construye `packages/db` leyendo `stage_snapshots` de los días anteriores; el motor la recibe en
`StageInput.memory` y **no la escribe**. Es deliberado: mantiene la Frontera 3 y por tanto no rompe
ni un banco.

```ts
type RaceMemory = {
  day: number
  stageWinners: { riderId; teamId; day }[]
  breakawayDaysByTeam: Map<string, number[]> // quién fugó qué días        (S-408, S-046)
  frontKmByTeam: Map<string, number> // quién ha pagado             (S-398)
  relayDebt: { from: string; to: string; day: number }[] // quién no relevó     (S-081)
  pactsBroken: { from: string; to: string; day: number }[] // quién rompió un trato (S-453)
  teamsWithWin: Set<string> // ya cumplieron               (S-397)
  daysSinceResult: Map<string, number> // desesperación               (S-402)
  rivalries: [string, string][] // parejas que no colaboran    (S-404)
  goodwill: Map<string, number> // se gana concediendo treguas (R12)
  marginFromYesterday: Map<string, number> // el margen del corte         (S-412)
  moodCause: MoodCause
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
R09.1  EL HUMOR TIENE CAUSA                       (S-224, S-234, S-422, S-424, S-427, S-484)
       humor = pelotonMoodCentre (0,9) + Σ efectos + N(0, pelotonMoodSpread)
       efectos:  reina_ayer −0,12 · vispera_reina −0,08 · post_descanso −0,06
                 vispera_descanso +0,05 · traslado_largo −0,05 · calor −0,10·calor
                 ultima_etapa −0,20 hasta el circuito, luego +0,10                       (S-075)
       Y EL DADO SE ENCOGE: pelotonMoodSpread 0,14 → 0,07.
       → el humor deja de ser un dado y pasa a ser una CONSECUENCIA, que es la fila literal
         («el humor del pelotón debe tener causa, no ser un dado del día»).
       Cuidado con no pasarse: el dueño pidió explícitamente «la probabilidad de que el pelotón
       eche la hueva» (v38), así que el dado NO se retira, se encoge a la mitad y se le suman
       causas. Un humor sin dado sería otro defecto, no un arreglo.

R09.2  LA MEMORIA DE LA ADUANA                                (S-423, S-425, S-106, S-401)
       memoryFactor(t, move) =
             × customsYesterdayWinner (1,6)  si dentro va el GANADOR de ayer
             × customsRevelation (1,4)       si dentro va el que saltó ayer al top-10
             × customsBurnedUs (1,5)         si t es un equipo de sprinters al que la fuga le
                                             robó la etapa AYER                          (S-106)
       Es un DESCUENTO FUERTE, no un veto: al ganador de ayer se le acorta la cuerda, no se le
       prohíbe irse. Y el equipo agraviado dedica un hombre a la rueda del rival y no le releva
       (S-401 → marcaje de R13/R22).

R09.3  LA DEUDA DE RELEVOS Y EL TRATO DENTRO DE LA FUGA            (S-081, S-413, S-453)
       si (A,B) ∈ relayDebt de los últimos debtMemoryDays (3):
             relayDuty(A) −= relayDebtPenalty (0,8) en cualquier grupo donde vaya B
       EL TRATO (S-453) es un acuerdo explícito dentro de la fuga:
             si A cede la etapa a B a cambio de la volante o de la cima:
                   A no entra en sprintContenders y B no disputa esa pancarta
             se registra en `pactsBroken` si alguien lo rompe, y se cobra HOY en los relevos y
             MAÑANA en la aduana.
       Y al que ayer ganó sin relevar, hoy la fuga no le coopera (S-413): mismo mecanismo.

R09.4  LA DESESPERACIÓN Y LA CONFORMIDAD                                  (S-397, S-402)
       desperation(t) = clamp(daysSinceResult(t) / desperationDays (7), 0, 1)
       cupo de aduana +1 con desperation ≥ 0,7; teamAttackFactor × (1 + 0,5·desperation)
       si t ∈ teamsWithWin: teamAttackFactor × wonAlreadyDamp (0,7) y presupuesto × 0,8
       → «el que cumplió guarda a su gente; el que lleva quince días sin nada mete dos hombres
         en todos los intentos», con escalado y no con un binario.

R09.5  RIVALIDADES Y ALIANZAS                                             (S-404, S-174)
       (t1,t2) ∈ rivalries → nunca forman alianza en frontAuction, aunque coincida el interés.
       goodwill(t) sube al conceder una tregua y baja al negarla o al atacar sobre un percance;
       una alianza PEDIDA a un equipo con goodwill < 0 se rechaza.
       Y el que pide una alianza contrae DEUDA: si luego no pone los hombres, lo paga en los
       relevos de esa misma etapa y en la aduana de mañana.

R09.6  EL PACTO DE NO AGRESIÓN                                            (S-426)
       tras dos días con demandaDelDia ≥ truceDemand (110) o una caída masiva:
             moodCause = 'tregua', humor × 0,8 y la aduana se abre a la primera.

R09.7  LA ROTACIÓN DEL FUGADO                                             (S-046, CONTRARIO)
       el que fugó ayer NO tiene veto: tiene COSTE. quota(t) − 1 y appetite × yesterdayBreakDamp
       (0,4). Un cazaetapas especialista sigue pudiendo repetir dos y tres días seguidos, que es
       exactamente lo que la fila pide («lo que se paga es de piernas y de aduana, no de
       elegibilidad»).

R09.9  LA REVANCHA DEL TREN                                               (S-354, AUSENTE)
       Figuraba en el «Cierra» de este racimo sin ninguna regla que la escribiera: `RaceMemory`
       guarda `stageWinners`, pero nada la cruzaba con el tren de R16.
       si t perdió el sprint de AYER siendo carta y por COLOCACIÓN
          (su carta acabó ≤ sprintRevengeRank (5) y su `placement` de meta > 0,4):
             launchStandoffM(t) × sprintRevengeGain (1,25)      # abre antes, arriesga más
             y el tren se monta a trainFormKm + 3 km
       si t ∈ teamsWithWin y ganó el ÚLTIMO sprint:
             launchStandoffM(t) × 0,85                          # se conforma con la rueda
       → «el equipo que perdió el sprint por colocación lanza antes hoy; el que ya ganó se
         conforma con la rueda». Se mide con `leadOutWinShare` (R16) partido por si hubo revancha.

R09.8  EL DÍA SIN MOTIVO Y EL CAMPO SIN FUERZA                            (S-234, S-229)
       si Σ objection(t) == 0 al km settleKm: se constata pronto, la fuga se va a 8-20 min y el
       pelotón ya no vuelve a apretar salvo una caza tardía a 40-60 km.
       La fuerza para cerrar se mide con los VIVOS y no con la foto de salida (S-229): payable
       ya lo hace por construcción.
```

**Cierra.** S-046, S-081, S-106, S-224, S-229, S-234, S-354, S-397, S-401, S-402, S-403, S-404,
S-408, S-413, S-422, S-423, S-424, S-426, S-427, S-453, S-484.

**Constantes nuevas.** `pelotonMoodSpread` **0,14 → 0,07** (movimiento, no constante nueva) · tabla
de efectos de humor (siete filas, todas [calibrar] contra `moodExplainedPct`) ·
`customsYesterdayWinner` **1,6** [calibrar] · `customsRevelation` **1,4** [calibrar] ·
`customsBurnedUs` **1,5** [calibrar] · `relayDebtPenalty` **0,8** DERIVADA de `relayDutyByRole`
(gregario 1,0 − sprinter 0,2 = 0,8, el rango entero del deber por rol) · `debtMemoryDays` **3**
[calibrar] · `desperationDays` **7** [calibrar] · `wonAlreadyDamp` **0,7** [calibrar] ·
`yesterdayBreakDamp` **0,4** [calibrar] · `truceDemand` **110** [calibrar] · `sprintRevengeGain`
**1,25** [calibrar] · `sprintRevengeRank` **5** [calibrar].

**Cómo se mide.**

| Estadística            | Qué cuenta                                             | Banco               | Banda                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sameWinnerNextDayPct` | ganador que repite en días **consecutivos**            | **carrera pequeña** | **2-12 %**. El banco actual mide 1,8 % (1 de 57) y el dueño ve otra cosa en producción; la diferencia está en el tamaño del campo, así que se mide donde el defecto vive. |
| `breakTeamRepeatPct`   | fuga del día con el mismo equipo que ayer              | carrera pequeña     | **0-25 %** (S-408: «casi nunca repite»)                                                                                                                                   |
| `moodExplainedPct`     | etapas cuyo humor tiene causa nombrada                 | `grandTour`         | **60-100 %**                                                                                                                                                              |
| `moodSpreadS`          | dispersión del ritmo de la primera hora entre semillas | llana canónica      | **≥ 3 km/h** — el guardarraíl contra encoger el dado de más                                                                                                               |

Invariante nuevo (**57**, y es de los caros pero de los que importan): «una carrera pequeña no repite
ganador un día sí y otro también» (2-12 %). (El 57 es de R09 y de nadie más; el «a un exceptuado no
le persigue su propio equipo» de R01, que este documento numeraba también 57, es el **68**.)

---

### R10 · El plan de varios días (12 situaciones)

**Pieza.** `RacePlan` por equipo, construido en la convocatoria y guardado en `packages/db`. Entra al
motor como parte del `TeamPlan` del día.

```ts
type RacePlan = {
  teamId: string
  objective: 'general' | 'etapas' | 'sprints' | 'montana' | 'joven' | 'presencia'
  structure: TeamStructure // §5
  markedDays: number[] // el día objetivo                        (S-405)
  dayWeight: number[] // suma = nDays                           (S-055)
  matchPlan: number[] // cerillos por día                       (S-379, S-382)
}
```

**Reglas.**

```
R10.1  PRESUPUESTO POR DÍA, NO POR HOMBRE                                (S-055, S-405)
       dayWeight(d) = 1,0 base
                    × dayMarkedGain (1,6)  si d ∈ markedDays
                    × dayEveDamp    (0,6)  si d+1 ∈ markedDays
                    × dayAfterDamp  (0,7)  si d−1 ∈ markedDays
       normalizado a Σ dayWeight = nDays: gastar de más hoy se paga mañana DE VERDAD.
       → hoy el presupuesto es `teamBudgetPerRider (9) × leales`, una constante por hombre.

R10.2  LA CRONO DENTRO DEL PLAN                              (S-382, S-386, S-387, S-394)
       si shape.kmCrono > 0:
             el que va a perder ttLossEstimate ≥ ttPanicS (90 s) contra el líder marca la
             VÍSPERA de la crono como día objetivo y ataca de lejos.                     (S-394)
             La víspera, los cronistas no entran en fugas (appetite × 0,3).              (S-387)
             Si la general la hace la crono, las etapas en línea son 'control':
                   claim del maillot 4 → jerseyTtControlClaim (2,5)                      (S-386)
             Y el que va a perder tres minutos NO se vacía en la crono: rueda para no perder
             más y guarda para la montaña (S-382 → R27.1, ttPacing 'conservador').

R10.3  LA CORRECCIÓN DEL PLAN                                (S-376, S-403, S-409, S-420)
       tras cada etapa, packages/db reevalúa:
             si la carta perdió > planReviewLossS (120 s) sin ser el día marcado:
                   markedDays.push(el próximo día apto) y el equipo ataca mañana         (S-376)
             si la carta perdió > structureBreakS (300 s): cambia la ESTRUCTURA          (R21)
             si el plan salió mal por planteamiento (caza tardía, fuga regalada):
                   la revancha del director: dos hombres a vigilar, o el trabajo 30 km antes (S-403)
       → «el que perdió minutos ayer cambia de plan: se mete en la fuga o ataca de lejos, y su
         equipo le lanza».

R10.4  EL OBJETIVO DE CARRERA DEL JUGADOR                                (S-022, S-028)
       `objective` es dato, no adorno: cambia la convocatoria (§5.2), el reparto de dayWeight y
       el pico de forma que `diseno-entrenamiento.md` §5 ya sabe programar. El mánager lo reparte
       entre los suyos (S-028) y eso ordena entrenamiento, convocatoria y forma.
```

**Cierra.** S-022, S-028, S-055, S-376, S-382, S-384, S-386, S-387, S-394, S-405, S-409, S-420.

**Constantes nuevas.** `dayMarkedGain` **1,6** [calibrar] · `dayEveDamp` **0,6** [calibrar] ·
`dayAfterDamp` **0,7** [calibrar] · `ttPanicS` **90** [calibrar] · `jerseyTtControlClaim` **2,5**
DERIVADA (entre `claimFor('controlar' amenazado)` 4 y `controlar` no amenazado 2) ·
`planReviewLossS` **120** [calibrar] · `structureBreakS` **300** DERIVADA de `helpBack`'s 300 s, el
hueco que el motor ya considera irrecuperable.

**Cómo se mide.** `budgetSpentOnMarkedPct` = fracción del presupuesto de carrera que un equipo gasta
en sus días marcados; banda **25-55 %** (con 21 días y 2-3 marcados, el azar daría 10-14 %).
`eveOfQueenGapS` = ventaja de la fuga la víspera de una reina frente a la media; banda **≥ 1,3×**
(S-427). Banco: `grandTour`.

---

### R11 · Percances mecánicos y el coche de equipo (10 situaciones)

Racimo entero `AUSENTE` (10 de 10). Es una pieza nueva, no una corrección. Y desbloquea R12: S-222 es
la nº 18 de las veinte más graves porque «bloquea el precio de cualquier percance».

**Pieza.** `stage/mishap.ts`, con la misma forma que `crash.ts` (dado por bloque, radio,
consecuencias), y el coche de equipo con su caravana.

```ts
type Mishap = { riderId; kind: 'pinchazo' | 'averia' | 'rueda_cedida'; km; stopS; needsCar }
```

**Reglas.**

```
R11.1  EL DADO
       λ_mishap(block) = mishapBase (0,00008 /km)
                       · terrainFactor { llano 1 · subida 1,2 · descenso 1,5 · paves 20 · tierra 45 }
                       · (1 + mishapRainGain (0,6)·lluvia)
                       · (1 + mishapPlacementGain (0,5)·placement)     # atrás se pincha más
       → el ×20 en pavés es lo que hace que S-283 («pinchazo en el peor sitio») exista de verdad.

R11.2  EL COCHE                                                          (S-222, S-435)
       carArrivalS(r) = carBaseS (25)
                      + carPerPlaceS (0,35) · placeInBunch(r)
                      + carConvoyRankS (4)  · (convoyRank(teamOf(r)) − 1)
       convoyRank sale de la general (el equipo del líder va el primero) y cambia cada día:
       treinta segundos de diferencia SISTEMÁTICOS entre el del líder y el del modesto.
       En cabeza de carrera, en un puerto cerrado o con la carrera partida: × carNoAccessGain (3),
       y ahí aparece la ASISTENCIA NEUTRA, que tarda más y da una rueda que encaja peor
       (stopS × neutralWheelGain 1,3).
       Y LA CARAVANA SE REORDENA cuando la carrera se parte: los comisarios suben los coches de
       los equipos con hombres delante. Colar a uno en la fuga compra además coche, ruedas y
       bidones donde se decide la etapa.
       stopS = carArrivalS + mishapChangeS (12 s pinchazo | 25 s avería)

R11.3  EL ASCENSOR DE LA CARAVANA                                        (S-435)
       mientras haya caravana y no se suba: el que vuelve gana caravanPullS (12 s/km) durante
       caravanMaxKm (6). En cabeza de carrera, en un puerto o con la carrera partida: 0, y el
       mismo percance cuesta MINUTOS.

R11.4  LA RUEDA Y LA BICI                                                (S-201)
       el sacrificio material casi nunca es la rueda: es la BICI entera, y solo vale si coinciden
       talla y pedales:  sameBike(a,b) = |altura_a − altura_b| ≤ bikeSwapCm (3)
       el que la cede pierde `stopS` entero y su día se ha acabado hasta que llega el coche.
       Dónde NO existe: en la crono no hay compañero al que quitársela (S-202); dentro de los
       últimos 3 km no salva nada porque el tiempo ya está dado (S-374).

R11.5  QUIÉN SE PARA                                                     (S-145, S-156, S-298)
       dos leales con duty 'peon' y freshness ≥ helpBackMinFreshness bajan a por la carta y le
       devuelven a rebufo de la caravana: los dos pierden solo lo que los coches no devuelven.
       En cabeza de carrera, en un puerto o con la carrera partida NO hay coches y pagan entero.
       El pelotón NO espera salvo tregua concedida (R12.2).
       Dentro de la fuga (S-111, S-110): aritmética, no cortesía —
             wait = gapToPeloton > mishapWaitMinGapS (75) ∧ pullShare(r) ≥ 1/party
             y NUNCA se espera al que va a ganar el sprint del grupo.

R11.6  EN LA CRONO                                                       (S-127, S-202, S-375)
       simulateTimeTrial deja de devolver `incidents: []` y emite pinchazo/caída con
       ttMishapLambda (0,015 por corredor): 1-4 % de incidentes.
       → es lo que hace que el corte del 25 % de la crono deje de ser «una salvaguarda dormida»,
         que es como el propio código lo llama (v20 §6).

       ESTO ROMPE EL INVARIANTE 11, Y HAY QUE DECLARARLO ANTES DE ROMPERLO. `invariants.test.ts:182-188`
       afirma hoy `stats.all.outOfTime === 0` y `stats.all.readmitted === 0` sobre las 5 cronos
       reales × 6 semillas, con tolerancia CERO. El invariante nuevo 56 pide literalmente lo
       contrario («≥ 1 caso por debajo del 25 %»), así que no son dos invariantes compatibles: el
       56 SUSTITUYE al 11.
       Redacción del cambio, que va en §9.2 con su paso y su causa:
             invariante 11 → **se retira su tolerancia cero** y pasa a banda:
                   `ttOutOfTimePct` **0-2 %** y `ttReadmittedPct` **0-2 %**
             invariante 56 → **≥ 1 caso** por debajo del 25 % en el banco de cronos reales
       Los dos son el mismo hecho por sus dos lados: el corte de la crono existe para el que
       pincha, y ahora alguien pincha. Lo que el 11 protegía —«el último de una crono llana es un
       corredor flojo, no un eliminado»— lo sigue protegiendo la banda 0-2 %.
```

**Cierra.** S-111, S-127, S-146, S-192, S-201, S-202, S-222, S-283, S-298, S-435.

**Constantes nuevas.** `mishapBase` **0,00008/km** [calibrar] · `terrainFactor` (tabla) [calibrar] ·
`mishapRainGain` **0,6** [calibrar] · `mishapPlacementGain` **0,5** [calibrar] · `carBaseS` **25**
[calibrar] · `carPerPlaceS` **0,35** [calibrar] · `carConvoyRankS` **4** [calibrar] ·
`carNoAccessGain` **3** [calibrar] · `neutralWheelGain` **1,3** [calibrar] · `mishapChangeS`
**12/25** [calibrar] · `caravanPullS` **12 s/km** [calibrar] · `caravanMaxKm` **6** [calibrar] ·
`bikeSwapCm` **3** DERIVADA (una talla de cuadro) · `mishapWaitMinGapS` **75** [calibrar] ·
`ttMishapLambda` **0,015** DERIVADA del objetivo declarado 1-4 %.

**Justificación de `mishapBase`**: 0,00008/km × 180 km × 176 corredores ≈ **2,5 percances por etapa
llana**, y ×20 en un sector de pavés de 30 km da ≈ 8 más. Es el orden de la carretera real: una
clásica de pavés vive de eso. **[calibrar]** contra el invariante 44 (pavés: 5-12 % de bajas por
caída), que **no puede subir por culpa de los pinchazos**: los pinchazos no son bajas, y el paso 13
lo comprueba explícitamente.

**Cómo se mide.** `mishapsPerStage` banda **1-5** en llano y **5-20** en pavés.
`mishapCostMedianS` banda **35-80 s** en llano (coche + cambio + vuelta a rebufo) y **≥ 150 s**
dentro de un sector. `ttIncidentPct` banda **1-4 %**. `convoyAdvantageS` = diferencia de coste medio
de un percance entre el equipo del líder y el vigésimo; banda **20-45 s** (S-222 dice «treinta
segundos de diferencia sistemáticos»). Invariante nuevo (**56**): «el corte de la crono ya no es una
salvaguarda dormida» (≥ 1 caso por debajo del 25 % en el banco de cronos reales).

---

### R12 · Caídas: la tregua, el rescate y el tiempo (18 situaciones)

**Pieza.** La tregua como suceso **que alguien pide**, no como un umbral de terreno. Depende de R24
(la noticia llega tarde) y de R11 (el coche).

```
R12.1  LA NOTICIA                             (S-478, nº 19 de las veinte más graves)
       un percance en el km k llega al frente en k + newsLagKm(t) y llega MAL:
             P(newsWrong) = newsWrongProb (0,25)·(1 − dirQuality)·2
             → nombre equivocado, gravedad equivocada, o número equivocado de afectados
       TODA la lógica siguiente decide sobre la CREENCIA, no sobre el hecho. Es la fila literal:
       «a veces el que se para no era el que hacía falta».

R12.2  LA TREGUA SE PIDE, NO SE DISPARA                                          (S-237)
       si la víctima es carta de maillot|general de t y t tiene frontClaim > 0:
             su CAPITÁN emite truce_requested en el km en que el equipo se entera.
       el pelotón CONCEDE si:  phase ∉ {decisivo, desenlace}
                             ∧ kmToGo > truceMinKmToGo (25)
                             ∧ !abanicoAbierto ∧ !onClimb                # nunca en pleno abanico
                             ∧ goodwill(t) ≥ 0                                          (R09)
                             ∧ ningún equipo con purpose general tiene virtualGain ≥ ambushMinGainS (30)
       concedida: compromiso = min(compromiso, truceCommit 0,45) durante truceKm (3)
                  goodwill(concedentes) += 1
       negada:    goodwill(el que la niega) −= 2, y eso se cobra mañana.
       → «la tregua no la dispara el terreno: la pide alguien, y el pelotón la concede o la niega
         según quién pida y cómo se portó antes».

R12.3  LA EMBOSCADA                                                              (S-195)
       negar la tregua y APRETAR es una decisión explícita de un equipo con purpose general y su
       hombre delante: compromiso ≥ ambushCommit (0,88) durante ambushKm (8).
       Cuesta reputación (goodwill −2) y presupuesto. No es gratis, y por eso no siempre pasa.

R12.4  EL RESCATE ESCALONADO                                       (S-290, S-198, S-288, S-199)
       LA PUERTA VA PRIMERO, y son DOS ramas distintas que la v37 y la v58 dejaron medidas. No hay
       una sola regla de rescate: hay la de general y la de etapa, y mezclarlas devuelve un defecto
       que ya costó dos versiones arreglar.
             rama GENERAL:  la carta es el hombre de la general de t
                            ∧ gapS ≥ mateBehindGapS (22)            # v58 §4: sin umbral, 387 s
             rama ETAPA:    la carta es la carta DEL DÍA de t
                            ∧ hubo PERCANCE o CAÍDA (no un simple descuelgue)
                            ∧ es GRAN FAVORITO del final de hoy (finishRank ≤ 0,15 del campo)
                            ∧ gapS ≤ stageRescueMaxGapS (60)
                            # v37 (L.7305-7307): «por la etapa yo creo que nadie debería bajarse…
                            #   salvo que sea un pinchazo/caída y la distancia sea pequeña, y sea
                            #   gran favorito». Con esas cuatro puertas: 6,59 → 0,01 avisos/etapa.
       si no se cumple ninguna de las dos, NO BAJA NADIE. Es la parte que no se generaliza.

       bajan de 1 a 4 leales, TODOS MENOS UNO:
             elegibles ordenados por (freshness desc, LLA desc)      # rodadores, no escaladores
             n = clamp(ceil(gapS / rescuePerManS (35)), 1, leales − 1)
       LA PUERTA QUE HOY FALLA, y es de una línea: el drop-back solo se dispara si el grupo del
       jefe es un `shed` (simulate.ts:2061). Si el jefe queda cortado en un `mov` —un grupo de
       perseguidores nacido de un ataque, que es el caso NORMAL con la carrera rota— no baja
       nadie. Se sustituye por: cualquier grupo por detrás del suyo.
       El grupo de rescate rueda a SUS fuertes (v36 lo probó y el tope perjudicaba: no se cambia).
       Y EL JEFE PUEDE RENUNCIAR: si duty == 'carta' ∧ orders.effort == 'ahorrar', no baja nadie
       (S-290 pide que el jefe pueda pedirla o renunciar; hoy «se la mandan», deuda §14.11).
       Si se cae un gregario clave (S-199), el equipo REASIGNA arropo o lanzamiento en carrera.

R12.5  LA REGLA DE LOS 3 KM                                                      (S-374)
       si km ≥ total − 3 ∧ (mishap|crash|corte) ∧ finishType ∉ {alto, solitario, crono}:
             tiempo del grupo en el que iba.
       En meta en alto y en crono, cada uno se come el suyo. El jurado puede declararla a 4-5 km
       en finales llanos peligrosos: `threeKmRuleKm` es un dato del recorrido, no una constante.

R12.6  EL MONTÓN Y EL TAPÓN                                                (S-251, S-466)
       `crashPile` ya existe. Se añade el TAPÓN: en un bloque con roadClass 'revirada', sector
       estrecho o muro, una caída BLOQUEA a los de detrás:
             afectados = los de placement ∈ [p_caído, p_caído + taponShare (0,25)]
             pierden taponLossS (30-60 s) o ponen pie a tierra
       → y eso lo decide LA POSICIÓN CON LA QUE ENTRARON, no sus piernas. Depende de R15.

R12.7  EL CAÍDO GRAVE Y EL GRUPETO                                         (S-456, S-213)
       ya ocurre (S-456 CUBIERTO): el que se va al suelo de verdad abre grupo propio y ningún
       grupo se funde con un grupo que va entero de tocados. Se conserva.
       El grupeto espera al caído de los suyos mientras el margen del corte lo permita (S-213),
       y con R26.1 ese margen por fin significa algo.

R12.8  EL COMPAÑERO QUE SE PARA                                                  (S-145)
       el que se para con el jefe le espera y le devuelve a rebufo de la caravana (R11.3):
       los dos pierden solo lo que los coches no devuelven. En cabeza, en un puerto o con la
       carrera partida no hay coches y pagan el tiempo entero.
```

**Cierra.** S-110, S-145, S-156, S-195, S-198, S-199, S-200, S-213, S-237, S-251, S-252, S-290,
S-297, S-374, S-435, S-456, S-466, S-478.

**Constantes nuevas.** `truceMinKmToGo` **25** [calibrar] · `truceCommit` **0,45** DERIVADA de
`freeRunTarget` · `truceKm` **3** [calibrar] · `ambushMinGainS` **30** [calibrar] · `ambushCommit`
**0,88** DERIVADA de `gear.finalDrive` 0,85 · `ambushKm` **8** [calibrar] · `rescuePerManS` **35**
[calibrar] · `taponShare` **0,25** [calibrar] · `taponLossS` **30-60** DERIVADA de la fila (S-466 da
el número) · `threeKmRuleKm` (dato del recorrido, 3 por defecto, 4-5 declarable).

**Cómo se mide.** `truceRequestedPct` **5-20 %** de las etapas con caída de una carta;
`truceGrantedPct` **50-85 %**. `rescueSuccessPct` = jefes cortados que vuelven; hoy se midió 66-81 %
según la variante, banda **55-80 %**. `rescueInMovePct` = rescates cuyo jefe estaba en un `mov` y no
en un `shed`; banda **≥ 25 %** (hoy es 0 % por la puerta de la línea 2061, y ése es el defecto).
`newsLagEffectS` = diferencia de tiempo perdido entre el mismo escenario con y sin retardo; se
publica **sin banda** el primer paso y con banda **≥ 8 s** después. Banco: `grandTour` y un escenario
ad hoc de caída dentro de `duelBench`.

---

### R13 · Fatiga y hundimiento dentro de la etapa (14 situaciones)

7 de 14 ya `CUBIERTO`: **la moneda física existe y está medida** (S-454 la reserva, S-455 el cerillo
en segundos, S-461 el P75 de la fracción fuerte, S-475 el nivel erosionado). Lo que falta es que el
**estado sea observable** y que alguien reaccione. Este racimo, por tanto, **no toca física**: toca
lectura.

```
R13.1  OLER LA SANGRE CON IDENTIDAD             (S-319; S-269 CONTRARIO nº 9; S-288)
       read = readState(observador, objetivo) ∈ [0,1]              # R24, CON ERROR
       para cada rival de general con read ≤ bloodThreshold (0,45):
             appetite × (1 + bloodGain (0,7)·(bloodThreshold − read)/bloodThreshold)
       y los ataques se ESCALONAN: el 2.º-5.º atacan por turnos (cooldown por equipo de R02.7),
       no todos a la vez.
       → el día que el maillot cede, sus rivales ATACAN MÁS. Hoy atacan menos, porque el bonus de
         rivales vive en `ataque_final` y el mecanismo de S-319 es «ciego a la identidad del que
         flaquea» (su propia regla lo dice).
       Y PUEDE FALLAR: `readState` mete ruido y admite disimulo, así que hay falsos positivos
       Y falsos negativos. Eso es una virtud, no un defecto: es la mitad de la carrera que se juega
       desde el coche. El disimulo de R24.5 va **acotado y es agotable** justamente para que no
       apague esta regla sobre la clase de corredor a la que apunta: ver el aviso de R24.5.

R13.2  EL GREGARIO SE APARTA AL VER                                     (S-259, S-288)
       si un leal ve a su carta con signals.drifting ≥ mateWatchDrift (0,3):
             sale del turno YA, sin esperar a los 22 s de hueco, y le marca el ritmo
             (`markedPerfil`, que ya existe).
       → «el gregario se aparta al VER sufrir al jefe». Es lo que permite bajar `mateBehindGapS`
         de 22 a 12 en R01 sin que el gregario reaccione tarde.

R13.3  LA PÁJARA DEL QUE TIRA                                                    (S-206)
       si el hombre en `turn.head` cae por debajo de pullerCollapseFraction (0,15) de depósito:
             sale del turno, se narra, y entra el SIGUIENTE DE SU EQUIPO si lo hay.
       → «cuando el hombre que tiraba se apaga, el relevo pasa al siguiente del equipo y se nota».

R13.4  COMER                                                              (S-147, S-226)
       feedZones ∈ el perfil (1-2 por etapa, las coloca el paso 1).
       kmSinceFeed > feedMaxKm (60):  bonkLambda × feedStarveGain (2,5)
       en la zona de avituallamiento: compromiso × feedZoneDamp (0,85) y no se ataca.
       LA PARADA TÉCNICA COLECTIVA TIENE AUTOR: la convoca el portador del maillot o un capitán
       de ruta (S-459) cuando la fuga YA está hecha y pasa de convoyGapS (180 s). Por eso es
       obligatoria para todos, y por eso el que ataca ahí rompe una tregua que alguien pidió, y
       lo paga en la aduana y en los relevos (R09.5).
       Los gregarios que bajan al coche pagan el viaje de vuelta (R11.3, sin el ascensor).

R13.5  FRÍO Y DESCENSO LARGO                                                     (S-148)
       en descenso con lluvia y temperatura baja:
             tacticalCostMultiplier += coldCostScale (0,06)   # Frontera 2 / §9.1bis, con tope
       Y lo gestionable es el MATERIAL: en la cima el equipo pasa chaquetas —una decisión que
       cuesta coldStopS (8 s) al que la reparte y evita el coste al que la coge—.
       El que no la coge baja congelado; el que se para a ponérsela pierde la rueda del grupo.
       No tener a nadie que te suba la chaqueta cuesta lo mismo que no tener bajador (S-465).

R13.6  LO QUE YA ESTÁ Y SE CONSERVA               (S-112, S-260, S-277, S-454, S-455, S-461, S-475)
       la reserva que se muerde relevando y se recarga a rueda; el cerillo en segundos; el nivel
       erosionado; el P75 de la fracción fuerte; las remontadas dentro de la subida; el fugado
       que revienta; el escalador que llega vacío a los últimos 500 m.
       Este racimo NO los toca. Solo hace que alguien los MIRE.
```

**Cierra: 13 de las 14 filas del racimo.** S-112, S-147, S-148, S-206, S-260, S-269, S-277, S-288,
S-319, S-454, S-455, S-461, S-475. **S-467 NO se cierra**: queda anotada, con la misma fórmula con
que R27 trata S-163. Estaba a la vez en el «Cierra» de este racimo y en la tabla de «lo que queda
fuera a propósito» de §4, y las dos cosas no pueden ser ciertas.

**Sobre S-467 (la fuga que encara el puerto final).** Es la única fila de este racimo que **no se
cierra con una regla propia**, y hay que decirlo con todas las letras porque es donde la propuesta
base metía la pata. La perilla directa —`breakFinaleCommit` y `breakClimbCommit`— **ya se probó, se
midió, movía la canónica y las reales 8:1, y salió del código en `dc489a6` (v44 §6)**. Y el dueño
cerró el asunto con «el problema no es la ley». Aquí S-467 se ataca **solo** por sus causas: el
hombre correcto en la fuga (R03.4d), el turno con orden y la ruptura tardía (R18), el compromiso del
solitario reevaluado (R18.4) y el perfil bien escrito (R28). Si con las cuatro puestas la fuga sigue
sin coronar nunca un puerto final, entonces **sí es una decisión del dueño sobre la ley**, y va a
§10 como tal —no como una perilla que ya se quitó una vez. La fila queda marcada **HIPÓTESIS SIN
VERIFICAR**, que es como el propio catálogo la marca.

**Constantes nuevas.** `bloodThreshold` **0,45** [calibrar] · `bloodGain` **0,7** [calibrar] ·
`mateWatchDrift` **0,3** [calibrar] · `pullerCollapseFraction` **0,15** DERIVADA de
`matchDepletionThreshold` 0,12 · `feedMaxKm` **60** DERIVADA de «las tres primeras horas» de S-147 a
40 km/h ≈ 120 km, con dos zonas · `feedStarveGain` **2,5** [calibrar] · `feedZoneDamp` **0,85**
[calibrar] · `convoyGapS` **180** [calibrar] · `coldCostScale` **0,06** [calibrar] · `coldStopS`
**8** [calibrar].

**Cómo se mide.** `attacksWhenLeaderCracks` = ataques por km en los 10 km siguientes a que el maillot
empiece a derivar, dividido por la media de la etapa; hoy sería **< 1** (el motor lo apaga), banda
propuesta **1,5-3,5×**. `falsosPositivosDeSangrePct` = veces que se aprieta sobre un rival que en
realidad iba bien; banda **15-40 %** en el brazo real y **0 %** en el brazo de control (§7.4). Y su
gemela de signo contrario, `falsosNegativosDeSangrePct` = veces que NO se aprieta sobre uno que
estaba roto; banda **10-35 %** real y **0 %** control (R24.5: el disimulo es ruido, no sesgo).
`bonkFeedPct` = pájaras atribuibles a no comer; banda **20-60 %** de las pájaras. Banco: `realQueens`
y `grandTour`.

---

### R14 · Meteorología con previsión (12 situaciones)

**Pieza.** El clima como estado del día **con segmentos**, anunciado antes y citable por las órdenes.

```ts
type WeatherPlan = {
  reliability: number // [0,1], baja si el parte es de hace días
  segments: { fromKm; lluvia; calor; frio; windDir; windKmh }[]
}
type WeatherNow = { lluvia; calor; frio; vientoLateral; vientoFrontal; abanicoAbierto }
```

```
R14.1  VIENTO CON DIRECCIÓN                                              (S-203, S-324)
       vientoLateral y vientoFrontal salen de windDir contra el rumbo del bloque.
       vientoFrontal ∈ [−1,1]: targetSpeed × (1 − windAheadScale (0,08)·vientoFrontal)
       EL ABANICO SE CIERRA cuando la carretera gira (S-324, CONTRARIO): si vientoLateral cae por
       debajo de echelonCloseThreshold (0,35) durante echelonCloseKm (2), abanicoAbierto = false
       y los cortados PUEDEN volver.

R14.2  LA LLUVIA LLEGA A MITAD DE ETAPA                                  (S-205, S-204)
       `segments` permite lluvia que empieza en el km 90. Con lluvia y purpose maillot|general:
             el equipo sube a todos sus hombres al frente (placement objetivo ≤ rainPlaceTarget 0,15)
             y LO PAGA: presupuesto del día siguiente × rainCostGain (1,15).             (S-204)

R14.3  EL PARTE ES PÚBLICO Y CITABLE                                     (S-032, CONTRARIO)
       `WeatherPlan` ya está en la pantalla de órdenes (`RaceOrders.tsx`, con fiabilidad y
       tooltip). Lo que falta es que las ÓRDENES LO CITEN: `triggerOn: {at:'weather', ...}`
       (R22), «si llueve en el adoquín, me coloco delante desde el km 40».
       Y la colocación tiene que existir también fuera del abanico: eso es R15.

R14.4  MATERIAL Y ETAPA ACORTADA                                         (S-430, S-037)
       elección de material por equipo antes de la etapa: 3 opciones (lenticular con viento,
       presión baja en el pavé, desarrollo corto en la reina), efecto ±2 puntos de perfil en el
       terreno que corresponda, penalización simétrica si se falla el parte.
       Recorte de etapa por peligro: el generador puede acortar CON AVISO PREVIO, para que el
       equipo rehaga el plan (que es lo que la fila pide).

R14.5  DESCENSO CON LLUVIA                                               (S-281, S-325, S-299)
       descentRisk(r) = 0,3 si duty carta con colchón · 1,0 si necesita ganar.
       El que lleva la general baja PROTEGIDO y cede 10-30 s a propósito; el bajador abre 20-40 s
       (R15a.7). Con el adoquín mojado la selección se dispara y por eso la aproximación es una
       guerra (S-299 → R15b.2).

R14.6  CALOR EXTREMO Y LA LOTERÍA DEL HORARIO                            (S-238, S-462)
       calor extremo: humor −0,10·calor (R09.1) y el cierre se encarece (price × calorGain).
       En la crono, `WeatherPlan` por FRANJA: la lluvia o el viento que entran a media tarde
       castigan a un bloque entero de horarios —normalmente a los últimos, que son los favoritos
       por el orden inverso—. Efecto medio ttWeatherSpreadS (±20 s) por franja (R27.5).
```

**Cierra.** S-032, S-037, S-203, S-204, S-205, S-238, S-281, S-299, S-324, S-325, S-430, S-462.

**Constantes nuevas.** `windAheadScale` **0,08** [calibrar] · `echelonCloseThreshold` **0,35**
**[calibrar]** contra `echelonClosedPct` 30-70 % (la versión anterior la declaraba «DERIVADA de
`POS.vientoMinimo`», y `POS` **no existe en el repositorio**: grep en `packages` y `apps`, cero
resultados. La puerta real que abre el abanico hoy es la de `corte()` con `windRaceCommit` 0,82 y
`windEchelonGapSeconds` 15, `constants.ts:3052/3061`; el umbral de lateral con que se cierra **no
tiene ancla y se calibra**, y decirlo es más honesto que inventarle una) · `echelonCloseKm`
**2** [calibrar] · `rainPlaceTarget` **0,15** [calibrar] · `rainCostGain` **1,15** [calibrar] ·
`descentRisk` (tabla) [calibrar] · `calorGain` **1,2** [calibrar].

**AVISO DE FRONTERA.** R14.1 toca `targetSpeed`, o sea **la LEY DE VELOCIDAD**. Va en su propio paso
(el 20), con `ENGINE_VERSION++` propio, y mueve **todas** las huellas y el invariante 43. **Es el
único paso de este documento que toca la LEY DE VELOCIDAD**, por eso está separado, va el último y es
**opcional** [DECISIÓN DEL DUEÑO 7]. Si se recorta, se recorta esto y el diseño no queda cojo: las
otras once filas de R14 no tocan `targetSpeed`.

**Y hay que decir lo que la redacción anterior escondía**: «el único paso que toca la física» era
falso tal como estaba escrito, porque **cinco reglas de otros pasos multiplican el coste del bloque**
—R15a.1 (`placePushCost`), R15a.2 (`accordionGain`), R08.4 (`rhythmCostGain`), R13.5
(`coldCostScale`) y R28.7 (`altitudeGain`)—, y `blockCost` vive en `physics.ts`. Con la Frontera 2
reescrita (§1.1) eso ya no es contrabando: las cinco entran por `tacticalCostMultiplier`, están
listadas en un solo sitio (§9.1bis) con su paso y su tope, y el invariante C1 las vigila de verdad.
Los pasos que **editan `physics.ts`** siguen siendo **dos y solo dos**: el **18** (altitud) y el
**20** (viento).

**Cómo se mide.** `echelonClosedPct` = abanicos que se cierran antes de meta; banda **30-70 %** (hoy
0 %: «el viento sopla todo el día»). `windDayGapS` = brecha del día de viento frente a la media;
banda **1,5-4×**. Banco: llana canónica **con `lugar`** (hoy los canónicos corren sin él) y
`smallTours`. Aviso de granularidad: v42 midió que viento, lluvia y calor están **dentro del ruido**
con 6 semillas, así que este banco corre con **×3 semillas** o no mide nada.

---

### R15 · Colocación y posición como recurso (25 situaciones)

El racimo **más caro** y el que más filas rotas tiene (23 de 25 entre `AUSENTE` y `PARCIAL`). Se
parte en dos por coste y por riesgo: **R15a** (el estado existe y lo leen los sitios que hoy usan un
dado) y **R15b** (colocar cuesta y se puede ordenar).

**Pieza.** `stage/placement.ts`. Un escalar por corredor, `placement ∈ [0,1]`, 0 = cabeza del grupo.
Es el dato que hoy no existe en ninguna parte —el motor no guarda posición por corredor dentro de un
grupo— y del que cuelgan el abanico, el sector, el sprint, el tapón y el acordeón.

#### R15a — `placement` existe y lo leen los sitios que hoy usan un dado

```
R15a.1  EL ESTADO
        placement(r) inicial = 0,5 + N(0, 0,15), y luego, por km (no por bloque):
              placement += placeDriftPerKm (0,04)·dkm            # si no haces nada, retrocedes
                         − placeGainPerKm (0,25)·dkm·pushing     # si empujas
                         + N(0, placeNoise (0,015))·(1 − TAC/200)
              pushing ∈ [0,1] lo decide el capitán o el corredor (R15b)
        Coste de empujar: tacticalCostMultiplier += placePushCost (0,45)·pushing
              # ← §9.1bis: fuera de physics.ts, con tope y con suma cero por grupo
        Cadencia: UNA VEZ POR KM, 176 × 200 = 35.200 operaciones por etapa, del orden de lo que
        ya cuesta `relayDuty`. No es un problema, y hay plan B (cada 2 km) si el listón se pasa.

R15a.2  EL ACORDEÓN     (S-189, cita del dueño: «en el puesto ciento veinte se pagan arreones
        en cada rotonda, cada pueblo y cada estrechamiento»)
        en llano nervioso (phase ∈ {aproximacion, desenlace} ∨ roadClass 'revirada'):
              tacticalCostMultiplier += accordionGain (0,35)·(placement − placementMedioDelGrupo)
        → NÓTESE EL «− MEDIA DEL GRUPO», Y ES LO QUE HACE QUE ESTO SEA LEGAL. Escrito como estaba
          antes —`× (1 + accordionGain·placement)`— el acordeón **subía el gasto medio del pelotón
          entero** un 17,5 %, y eso es la economía del depósito, que ancla las cinco bandas de
          `erosion` (invariante de control C1). Escrito contra la media del grupo, **redistribuye**:
          el que va delante paga menos, el que va atrás paga más, y la suma por grupo es cero por
          construcción. Es lo que la fila dice de verdad —en el puesto 120 se pagan arreones que en
          el puesto 10 no— y no un encarecimiento global disfrazado.

        AVISO DE HISTORIA, porque esto ya se anuló una vez y por cita literal del dueño. La v38
        eliminó `domestiqueProtectPerHelper` / `domestiqueProtectMax` después de que él dijera que
        «un líder arropado por gregarios dentro del pelotón gasta LO MISMO que uno que va a rueda
        cómodamente sin entrar a los relevos», y la v38-2 §17 lo MIDIÓ: el diferencial quedó en
        **2,9 % sobre ocho etapas**. La cita es sobre el RESULTADO —gasta lo mismo—, no sobre el
        mecanismo, así que cambiarle la causa (acordeón en vez de viento) no basta para devolverlo:
        si el efecto vuelve, la frase del dueño vuelve a ser falsa.
        POR ESO ESTA REGLA LLEVA SU PROPIO LISTÓN, y es criterio de «hecho» del paso 14:
              `shelteredLeaderSavingPct` = ahorro del líder arropado por gregarios frente al que va
              a rueda al fondo del mismo pelotón, en etapa llana ≤ **3 %**
        —el número que la v38-2 §17 dejó medido—. Si sale por encima, `accordionGain` baja hasta que
        entre, o la regla vuelve a §10 como decisión del dueño con el número delante. No se ensancha
        nada y no se re-interpreta la cita.

R15a.3  EL ABANICO DEJA DE SER UN DADO DE COLOCACIÓN         (S-155 CONTRARIO nº 5, S-460, S-243)
        corte(): los que entran en el abanico son los `cabenEnFila` con MENOR placement.
        Se retiran windPlacementTeam (25), windPlacementLeader (12) y windPlacementLuck (10):
        el equipo que quiere estar delante lo consigue GASTANDO, no con un bonus por ser el dueño
        del frente. El aforo (`cabenEnFila`, S-460) ya existe y se conserva entero; lo que se le
        añade es que el ANCHO DE LA CARRETERA entre en la cuenta (`roadWidth`).

R15a.3b EL ABANICO TIENE AUTOR, Y HAY QUE ESCRIBIR QUIÉN LO DECIDE   (S-155 nº 5, S-165)
        R15a.3 cambia QUIÉN entra en el corte; R15b.3 es un dado individual de no cerrar un hueco,
        acotado a `duty 'peon'` y a las fases `aproximacion` y `decisivo`. Ninguna de las dos dice
        **cuándo un EQUIPO decide abrir un abanico**, y el abanico canónico de media etapa está en
        fase `control`, donde R15b.3 ni siquiera se activa. Con eso, el invariante 60 («el abanico
        tiene autor» ≥ 50 %) mediría algo que ninguna regla produce, y S-165 —CONTRARIO con cita:
        «en gran vuelta el abanico lo provocan los equipos de la general con sus rodadores y sus
        jefes colocados, para sacar minutos a un favorito mal colocado»— figuraba en el «Cierra» de
        este racimo sin regla que la citara. Se escribe la decisión:

        echelonAttempt(t), evaluado cada km por el DIRECTOR (no por el corredor):
              CONDICIONES
                    vientoLateral ≥ echelonWindMin (0,45)      # hay con qué
                  ∧ placement medio de los leales ≤ echelonReadyPlace (0,25)
                  ∧ ∃ rival de general con threatOf(t, rival) > 0
                    y placeSeen(rival) ≥ echelonVictimPlace (0,45)   # ← LEÍDO con creencia (R24)
                  ∧ spent(t) ≤ echelonBudgetMax (0,6)
                  ∧ roadClass ≠ 'revirada'                     # en carretera de tercera no cuaja
              EFECTO, durante echelonKm (6) y con `commitMinKm['abanico'] = 4` (R18.9):
                    pushing = 1 para todos los leales presentes
                    compromiso del grupo ≥ echelonCommit (0,92)
                    y el equipo QUEDA REGISTRADO COMO AUTOR: el evento `peloton_split` sale con
                    `cause: 'viento'` y `byTeam: t` (R23.3)
              COSTE: presupuesto del día × echelonSpend (1,4) y, si el corte no cuaja, el equipo
                    llega al final con dos hombres menos. Abrir un abanico y fallar SALE CARO, que
                    es lo que hace que no se intente todos los días.
        → Con esto R15b.3 pasa a ser lo que de verdad es: la **ejecución individual** de una
          decisión de equipo (el peón que no cierra el hueco cuando su director ya ha decidido
          abrirlo), y por eso se le levanta la puerta de fase: dentro de `echelonKm` de un
          `echelonAttempt` propio, R15b.3 vale también en fase `control`.
        → Y el invariante 60 pasa a medir una regla que existe.

R15a.4  EL SPRINT                                              (S-445, S-446, S-481, S-338)
        `placementSd` deja de ser un dado por tamaño de grupo y pasa a leer `placement` real:
              scoreFinal × placeFinishWeight,  placeFinishWeight = 1 − placeFinishMax (0,18)·placement
        ENCAJONADO (S-445, la CAUSA que hoy falta): si placement > boxedThreshold (0,55) y los
        `lanes` están llenos, el corredor NO LLEGA A ABRIR → launchEffect = boxedEffect (0,72).
        Pierde sin que le gane nadie, llegando entero y bien lanzado, que es la fila.
        EL ÚLTIMO GIRO (S-446): en una curva, rotonda o estrechamiento dentro de los últimos
        lastTurnKm (1,5), el orden de paso es el de `placement` y CONGELA la posición hasta meta:
        los tres primeros salen con turnGainM (2,5 cuerpos) y el decimoquinto ya no gana.

R15a.5  LA RUEDA QUE ELIGES                                                      (S-490)
        en FILA (abanico, sector, tirón final): placement(r) ≥ placement(wheelAhead(r)),
        y si el de delante abre hueco, TODOS los de detrás lo pagan por buenos que sean.
        Por eso un equipo mete a su jefe TERCERO en la fila y no décimo.
        Se aplica solo en fila —una fracción pequeña de los bloques—, no en todo el pelotón.

R15a.6  EL SECTOR                                              (S-241, S-282, S-463, S-480)
        entrar a un sector con placement > sectorSafePlace (0,25) cuesta sectorLossS (8 s/sector)
        y multiplica λ_mishap (R11.1).
        EN TIERRA (S-463) además: no se remonta por dentro del sector (placeGainPerKm × 0,25 por
        el polvo), los pinchazos se multiplican (×45) y en mojado el que se sale no vuelve.
        Y EL ADOQUÍN COBRA POSICIÓN (S-480): la selección del sector escala con la posición,
              λ_selección = base · (0,4 + 1,2 · placement)
        → el que va delante pasa; el que va 80.º, no. **Y se hace escalando la λ del dado, NO
          moviendo el exponente atributo→velocidad.** Esto es deliberado y es una corrección a la
          propuesta base, que metía un `sectorExponent` 0,52 en `physics.ts`: eso es FÍSICA en un
          paso que promete no tocarla (Frontera 2). El exponente del pavé queda como **deuda
          anotada (§14 punto 17)**, no como efecto colateral de un paso de colocación.

R15a.7  EL BAJADOR                                                               (S-465)
        si el equipo tiene un leal con DES ≥ descenderMin (72) y duty 'peon':
              va delante de la carta en el descenso que importa; la carta baja A SU RUEDA con
              descenderTolerance (3 puntos de DES efectivo) y no pierde.
        Sin bajador: la carta cede descentNoHelperS (20 s) en un descenso decisivo SIN que nadie
        le ataque, y con lluvia el doble.
        Y el descenso final selecciona más que uno de mitad de etapa (S-280): `descentSelectKm`
        deja de ser 1 km fijo y pasa a ser el descenso ENTERO cuando kmToGo ≤ 25.

R15a.8  EL CORREDOR EN AÑO DE CONTRATO                                           (S-428)
        contractYear: +escaparateAppetite (0,15) al apetito y −0,1 al umbral de colocarse.
        Y la otra mitad: el que YA firmó con otro equipo (`signedElsewhere`) deja de vaciarse por
        la carta de esta casa —no baja a por bidones, no cierra huecos, no se quema en el tempo—
        SIN desobedecer nunca de forma visible: dutyBonus × quietRetreatDamp (0,55).
        Su director lo sabe al repartir papeles, y por eso el equipo cree tener ocho y tiene siete.
```

#### R15b — colocar cuesta, y se puede ordenar

```
R15b.1  LA ORDEN TARDA EN LLEGAR A LA CARRETERA                                  (S-489)
        mover k leales desde placement p hasta ≤ 0,15 cuesta:
              placeMoveKm = placeMoveBaseKm (2,5) + placeMovePerManKm (0,4)·k
              y un cerillo por hombre si p > 0,5
        El director lo tiene que decidir con `placeMoveKm` de antelación, y CON CREENCIA (R24).
        → decidir tarde no es solo perseguir con menos margen: es perseguir con hombres que
          llegan al frente ya gastados. Es la forma más común de perder sin hacer nada mal.
        No es S-243 ni S-240 —ésos son la anticipación a un punto CONOCIDO del mapa—: es el precio
        de cualquier decisión tomada EN REACCIÓN, donde no hay nada que anticipar.

R15b.2  LA PELEA POR EL SITIO                              (S-240, S-241, S-242, S-243, S-252)
        en los approachKm (6) antes de un pie de puerto, sector, embudo o tramo expuesto:
              cada equipo con carta fija pushing = 1 para approachHelpers (3) leales
              compromiso del grupo ≥ approachCommit (0,88)
              crashLambda × approachCrashGain (2,2)
        → «en los 10-15 km previos la carrera se estira, se pelea el sitio y AHÍ SE CAE LA GENTE»
          (S-252) deja de ser una coincidencia y pasa a ser la misma regla.
        El que llega mal al pie del puerto paga: driftS inicial = placeBadEntryS (12 s)·placement.
        Entrar el 100.º al pie de un puerto son 12 s regalados antes de empezar a subir, que es
        lo que pasa en carretera y lo que S-240 llama «20-30 s de acordeón» junto con R15a.2.

R15b.3  ABRIR EL HUECO A PROPÓSITO                                               (S-457)
        cortar es también una ACCIÓN INDIVIDUAL de colocación: un hombre puede dejar de cerrar el
        hueco que tiene delante, o dejar pasar al rival y quedarse él a rueda, para que la carrera
        se parta justo por detrás del que le estorba:
              si duty 'peon' ∧ el de detrás es amenaza de mi carta
                 ∧ (phase ∈ {aproximacion, decisivo}  ∨  mi equipo está dentro de un
                    echelonAttempt vivo (R15a.3b), que es lo que la habilita en fase 'control'):
                    P(no cerrar) = gateOpenProb (0,25)·(1 − read(rival))
        y responde de ello si se equivoca de hombre: si su carta queda del lado malo, trust −2.
        Es lo que convierte el abanico en DECISIÓN y no en dado, junto con R20.

R15b.4  DOS TRENES POR EL MISMO CARRIL                                           (S-481)
        lanes = clamp(floor(roadWidth / 1,5), 1, 4)
        si trenes > lanes: el de fuera paga trainOutsideCost (1,3×) y OBLIGA al de dentro a abrir
        trainForcedEarlyM (80 m) antes → los dos pierden, y muy a menudo gana el tercero que
        venía a rueda de los dos. La carretera tiene sitio para uno y medio, no para cuatro.

R15b.5  LA PRIMERA SEMANA NERVIOSA                                               (S-160)
        en la primera semana de una vuelta, los equipos de general gastan gregarios en COLOCAR al
        jefe delante y no en perseguir: `pushing` alto, `frontClaim` bajo, y nadie de la general
        ataca. Sale solo de R15b.2 + R10 (dayWeight) + R19 (fase), sin regla propia.
```

**Cierra.** S-155, S-160, S-165, S-189, S-240, S-241, S-242, S-243, S-252, S-254, S-280,
S-282, S-369, S-428, S-430, S-446, S-457, S-460, S-463, S-465, S-466, S-480, S-481, S-489, S-490.
Son **24 de las 25 filas del racimo**, más **S-280**, que el catálogo no lista aquí y este documento
nombra dentro de R15 para que no se pierda. **S-248 SALE de esta lista**: figuraba aquí y ninguna
regla de R15a ni de R15b la escribía —lo más parecido era `smallSquadClaim` en §5.2, que mira la
escuadra CONVOCADA y no los hombres presentes en el grupo—. Su pieza está en **R20.2**
(`clamp(presentes(t, g)/6, 0, 1)` dentro de `frontAuction`, por grupo y por kilómetro) y allí se
cuenta. Es el mismo error de contabilidad que S-467 tenía entre R13 y §4, y se corrige igual: una
situación se cuenta en el racimo que lleva su regla, **una sola vez**.

**Constantes nuevas.**

| Constante                  | Valor                              | Clase                                                                                           | Por qué                                                                                                                                                                                                                                                                 |
| -------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `placeDriftPerKm`          | **0,04**                           | [calibrar]                                                                                      | Sin hacer nada bajas 4 décimas cada 10 km: en 100 km pasas de la primera fila a la cola. Es el acordeón.                                                                                                                                                                |
| `placeGainPerKm`           | **0,25**                           | [calibrar]                                                                                      | Colocarse una décima cuesta menos de medio kilómetro de esfuerzo.                                                                                                                                                                                                       |
| `placeNoise`               | **0,015**                          | [calibrar]                                                                                      | El azar del pelotón, atenuado por TAC.                                                                                                                                                                                                                                  |
| `placePushCost`            | **0,45**                           | [calibrar] contra el invariante 18                                                              | Subir cien puestos ≈ un cerillo largo.                                                                                                                                                                                                                                  |
| `accordionGain`            | **0,35**                           | [calibrar]                                                                                      |                                                                                                                                                                                                                                                                         |
| `placeFinishMax`           | **0,18**                           | DERIVADA de `placementSd` sdMax 0,07 × 2,6                                                      | Mismo orden que el dado que sustituye.                                                                                                                                                                                                                                  |
| `boxedThreshold`           | **0,55**                           | [calibrar]                                                                                      |                                                                                                                                                                                                                                                                         |
| `boxedEffect`              | **0,72**                           | DERIVADA del suelo de `launchEffect` 0,7                                                        |                                                                                                                                                                                                                                                                         |
| `lastTurnKm`               | **1,5**                            | [calibrar]                                                                                      |                                                                                                                                                                                                                                                                         |
| `turnGainM`                | **2,5**                            | DERIVADA de la fila (S-446 da «dos o tres cuerpos»)                                             |                                                                                                                                                                                                                                                                         |
| `sectorSafePlace`          | **0,25**                           | DERIVADA de «las 15 primeras posiciones» de S-241 sobre 60                                      |                                                                                                                                                                                                                                                                         |
| `sectorLossS`              | **8**                              | [calibrar]                                                                                      |                                                                                                                                                                                                                                                                         |
| `placeBadEntryS`           | **12**                             | DERIVADA de `grupetoJoinGapSeconds` 12                                                          | El hueco mínimo que ya cuenta como estar en otro sitio.                                                                                                                                                                                                                 |
| `descenderMin`             | **72**                             | [calibrar]                                                                                      |                                                                                                                                                                                                                                                                         |
| `descenderTolerance`       | **3**                              | DERIVADA de `dropDeficitTolerance` 4, un punto menos                                            | Bajar a rueda de uno bueno es ir tres puntos por encima de lo tuyo.                                                                                                                                                                                                     |
| `descentNoHelperS`         | **20**                             | DERIVADA de la fila (S-465 da «20-30 s»)                                                        |                                                                                                                                                                                                                                                                         |
| `escaparateAppetite`       | **0,15**                           | [calibrar]                                                                                      | Pequeño y visible.                                                                                                                                                                                                                                                      |
| `quietRetreatDamp`         | **0,55**                           | [calibrar]                                                                                      |                                                                                                                                                                                                                                                                         |
| `placeMoveBaseKm`          | **2,5**                            | DERIVADA de la fila (S-489 da «tres a cinco kilómetros» para cuatro hombres: 2,5 + 0,4×4 = 4,1) |                                                                                                                                                                                                                                                                         |
| `placeMovePerManKm`        | **0,4**                            | DERIVADA de la misma                                                                            |                                                                                                                                                                                                                                                                         |
| `approachHelpers`          | **3**                              | DERIVADA de la fila (S-241: «2-3 gregarios»)                                                    |                                                                                                                                                                                                                                                                         |
| `approachCommit`           | **0,88**                           | DERIVADA de `gear.finalDrive` 0,85                                                              |                                                                                                                                                                                                                                                                         |
| `approachCrashGain`        | **2,2**                            | [calibrar] contra `abandonCauses.crashPct`                                                      |                                                                                                                                                                                                                                                                         |
| `gateOpenProb`             | **0,25**                           | [calibrar]                                                                                      |                                                                                                                                                                                                                                                                         |
| `trainOutsideCost`         | **1,3**                            | [calibrar]                                                                                      |                                                                                                                                                                                                                                                                         |
| `trainForcedEarlyM`        | **80**                             | [calibrar]                                                                                      |                                                                                                                                                                                                                                                                         |
| `paveSelectionPlaceGain`   | **λ = base·(0,4 + 1,2·placement)** | [calibrar] contra el invariante 44                                                              | Sustituye al `sectorExponent` que la propuesta base metía en `physics.ts`.                                                                                                                                                                                              |
| `echelonWindMin`           | **0,45**                           | [calibrar] contra `echelonByDecisionPct`                                                        | Con menos lateral no cuaja ni queriendo.                                                                                                                                                                                                                                |
| `echelonReadyPlace`        | **0,25**                           | DERIVADA de la fila **S-241** («las 15 primeras posiciones» sobre 60)                           | Mismo significado que `sectorSafePlace` y **el mismo origen, no el mismo padre**: derivarla de `sectorSafePlace` sería colgar una constante nueva de otra constante nueva, que el Apéndice B declara que **no es un ancla**. Se deriva del sitio del que las dos salen. |
| `echelonVictimPlace`       | **0,45**                           | [calibrar]                                                                                      | Y se lee con creencia (R24): abrirlo sobre un rival que en realidad iba tercero es un error caro y posible.                                                                                                                                                             |
| `echelonBudgetMax`         | **0,6**                            | [calibrar]                                                                                      | Un equipo fundido no abre abanicos.                                                                                                                                                                                                                                     |
| `echelonCommit`            | **0,92**                           | DERIVADA de `windRaceCommit` 0,82, subido                                                       | El compromiso con que hoy se rompe una carrera en viento, y algo más: aquí es una decisión, no un accidente.                                                                                                                                                            |
| `echelonKm`                | **6**                              | [calibrar]                                                                                      | Ventana del intento; `commitMinKm['abanico'] = 4` la protege del temblor.                                                                                                                                                                                               |
| `echelonSpend`             | **1,4**                            | [calibrar]                                                                                      | Lo que cuesta intentarlo, cuaje o no.                                                                                                                                                                                                                                   |
| `shelteredLeaderSavingPct` | **listón ≤ 3 %**                   | DERIVADA de la medida de la v38-2 §17 (2,9 %)                                                   | No es una perilla: es el techo que `accordionGain` no puede pasar sin reabrir la cita del dueño de la v38.                                                                                                                                                              |

**Se retira**: `windPlacementTeam` 25, `windPlacementLeader` 12, `windPlacementLuck` 10.
**No se toca**: `physics.ts`. El exponente del pavé sigue siendo el del llano (0,39) y queda como
deuda §14.17, nombrada.

**Coste, con listón escrito.** Un float por corredor y por **km** (no por bloque), y una ordenación
por grupo solo donde se lee (abanico, sector, sprint, tapón). Listón declarado: **≤ 5 % del coste de
etapa** —el 8 % de la versión anterior era el presupuesto AGREGADO del motor y no el de esta pieza
sola; el reparto por pieza que sí suma está en §7.7 (`placement` 5 · censo 3 · fases 1 · creencias 1
= 10)—, medido en el paso. Si lo supera, `placement` se actualiza cada 2 km: el catálogo no pide
resolución de 100 m para la posición.

**Cómo se mide.**

| Estadística                | Qué cuenta                                                                    | Banco             | Banda                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `echelonByDecisionPct`     | abanicos con equipo autor identificado                                        | llana con viento  | **50-100 %** (hoy 0 %)                                                                                                                 |
| `boxedLossPct`             | sprints masivos en que el mejor SPR pierde por encajonamiento                 | llana canónica    | **8-25 %**                                                                                                                             |
| `placementCostShare`       | fracción del gasto del día que se va en colocar                               | todos             | **5-20 %** (si es 0 la posición es gratis; por encima del 20 la etapa se decide por colocarse)                                         |
| `pavePositionEffect`       | correlación entre posición al entrar al sector y perder el grupo              | Flandes (inv. 44) | **≥ 0,45**                                                                                                                             |
| `placementCost`            | ms/etapa                                                                      | todos             | **≤ 5 % del coste de etapa** (ver el reparto de §7.7: el 8 % de antes era el presupuesto AGREGADO del motor, no el de esta pieza sola) |
| `shelteredLeaderSavingPct` | ahorro del líder arropado frente al que va a rueda al fondo del mismo pelotón | llana canónica    | **≤ 3 %** — el guardarraíl de la cita de la v38, criterio de «hecho» del paso 14                                                       |

Invariante nuevo (**60**): «el abanico tiene autor» ≥ 50 %.

---

### R16 · El tren de sprint como submotor de 15 km (14 situaciones)

**Pieza.** `stage/train.ts`: un `Train` **con estado**, no un `elTren` que a 3 km sustituye la
rotación por lanzadores. **Y con `kind`, porque hay dos trenes y este documento solo modelaba uno**:
el de sprint y el de montaña. El de montaña (S-286, S-284, las dos `PARCIAL` con cita) no aparecía en
ningún racimo, y sin él `lastHelperCommit` de R18.8 quedaba huérfano —una constante que nadie
aplicaba— y S-284/S-286 se contaban dentro de la cobertura sin tener pieza.

```ts
type Train = {
  teamId: string
  cardId: string
  kind: 'sprint' | 'montana' // ← NUEVO
  helpers: string[] // en orden de relevo, del primero al último
  index: number
  state: 'formando' | 'tirando' | 'roto' | 'lanzado'
}
```

```
R16.1  SE FORMA A LOS 15 KM                                              (S-351, S-347)
       en kmToGo ≤ trainFormKm (15) cada equipo con carta de sprint monta su tren con hasta
       trainMaxLaunchers (3) leales, ordenados por (LLA desc, freshness desc).
       Cada lanzador tira trainTurnKm { 5 · 3 · 1,5 } y se aparta; index++ al agotarlo.
       → hoy `elTren` solo sustituye la rotación con kmToGo ≤ sprintTrainKm (3), y entre el km 15
         y el 3 sigue rotando el turno normal por deber con su techo de veinte. El frente de los
         últimos 15 km SE DISPUTA Y SE PIERDE (S-347): un tren se funde y otro lo hereda, uno
         llega tarde y remonta por fuera, un contraataque obliga a rehacerlo, y hay días en que a
         8 km todavía no manda nadie.

R16.2  ASCENSOS Y ROTURA                                                         (S-356)
       si un lanzador se funde (freshness < 0,2), se descuelga o abandona: index++ y el siguiente
       hereda su turno. Si no queda ninguno: state 'roto', la carta se queda sola, y
       **`chaseField` SE RECALCULA sin ese tren** — hoy es una foto de salida, deuda anotada.

R16.3  CUÁNTOS TRENES Y DE QUIÉN                                                 (S-355)
       trains = equipos con carta de sprint y ≥ 1 lanzador vivo en el grupo.
       `sprintRegimeKmh` ya lee el número; ahora el número es REAL y no una foto.

R16.4  EL SPRINTER SIN TREN                                              (S-337, S-338)
       elige rueda: wheelPick = el tren con mejor (quality − wheelPickWeight (0,5)·placement del
       hueco libre). Su `placement` SIGUE al del tren elegido; launchStandoffM × 0,7.
       La defiende, y sale de ella. Pierde por COLOCACIÓN, no por piernas, que es la fila.

R16.5  DOS CARTAS Y UN FINAL AMBIGUO                                     (S-291, S-185)
       la carta se recalcula por el `finishType` de los ÚLTIMOS 3 km y por el grupo que queda;
       la otra pasa a peón.
       Un equipo con maillot y velocista: el maillot va a rueda del PROPIO tren en los últimos
       3 km (protegido, sin tirar nunca) y el velocista lo esprinta. Los dos, no uno.

R16.6  DÓNDE SE ABRE, Y QUE NO ES UNA CONSTANTE                          (S-348, S-342, S-369)
       el lanzador entra a 1.000-600 m, se vacía y se aparta a 200-250 m; el sprinter sale de su
       rueda entre 250 y 150 m — **pero eso es un llano sin viento**:
             viento de cola o meta en bajada:  launchStandoffM × trainTailwindGain (1,4)
             viento de cara o arrastre:        launchStandoffM × trainHeadwindDamp (0,7)
             sobre adoquín:                     × 1,3 y `placeFinishMax` × 1,5              (S-369)
       Con arrastre ascendente el primero que abre se muere, y el corredor pesado se apaga en los
       últimos metros (S-342): `finishWeights` ya lo hace vía terreno; lo que faltaba era el
       momento de abrir.

R16.7  ESTORBARSE  → R15b.4                                                      (S-481)
R16.8  EL LANZADOR SIN SPRINTER SE RECICLA                                       (S-372)
       si su sprinter ya no está en el grupo, el lanzador PIERDE el peaje del rol y vuelve a
       `finishRoleWeight` de libre. Hoy pierde el premio y conserva el peaje, que es al revés.

R16.9  EL TREN DE MONTAÑA                                          (S-286, S-284, ambas PARCIAL)
       Mismo submotor, otro `kind`, y es lo que hace que el último puerto de una gran vuelta se
       parezca a lo que se ve en televisión.
       SE FORMA al pie del puerto DECISIVO (no a 15 km de meta) para todo equipo con carta de
       general o de montaña y ≥ 2 leales presentes.
       ORDEN DE RELEVO: peones por MON ASCENDENTE —de menos a más fuerte, que es la fila literal—.
       CADA UNO tira climbTurnKm (2,5) o hasta freshness < 0,2, lo que llegue antes; index++.
             No pelea la rueda al apartarse: sale del grupo y se deja caer (S-286).
       EL ÚLTIMO se aparta a lastHelperKm (3-5 km, [calibrar]) de la cima, y mientras tira lleva
             `lastHelperCommit` (0,90) —que es DONDE encaja esa constante de R18.8, hasta ahora sin
             sitio— y λ de ataque × 0,4 en el grupo: el tempo del último gregario DESACTIVA los
             ataques hasta la rampa final.
       Y CUANDO SE APARTA, SE ABRE LA VENTANA DE SALVAS (S-284):
             entre kmToGo(cima) −5 y −2, λ × salvoLambda (2,2) para las cartas presentes,
             con cooldown POR EQUIPO (R02.7) y `commitMinKm['ataque'] = 0,5`:
             ataques CORTOS y REPETIDOS, vigilándose. El 2.º y el 3.º mueven más que el maillot,
             que sale solo de R04.3 + R05.12 + R18.8 sin regla extra.
       INTERACCIÓN CON R05.12 ('aislar'): el tren de montaña es el instrumento del intent 'aislar'.
             Un equipo en 'aislar' monta este tren con `isolateCommit` en vez de con el tempo
             normal. Son la misma pieza vista desde el director y desde la carretera.
```

**Cierra.** S-185, S-291, S-337, S-338, S-342, S-346, S-347, S-348, S-351, S-355, S-356, S-372,
S-445, S-481. **Más S-286 y S-284** (R16.9), que el catálogo dejó **sin racimo** —no aparecen en la
lista de situaciones de ninguno de los 28— y que este documento no nombraba.
**S-354 NO se cuenta aquí**: es del racimo de R09, allí figuraba en el «Cierra» sin regla y allí se
cierra ahora, con **R09.9**. Se nombra en este racimo porque su efecto entra por una pieza de aquí
—`launchStandoffM` y el km en que se monta el tren— y **se mide con una estadística de aquí**:
`leadOutWinShare` **partido en dos**, con revancha y sin revancha, que es lo que distingue «el tren
arriesga porque ayer perdió por colocación» de «el tren arriesga siempre».

**Constantes nuevas.** `trainFormKm` **15** DERIVADA de `finalDriveKm` 15 · `trainMaxLaunchers` **3**
DERIVADA de la fila (S-351: «dos o tres lanzadores») · `trainTurnKm` **{5, 3, 1,5}** [calibrar] ·
`wheelPickWeight` **0,5** [calibrar] · `trainTailwindGain` **1,4** [calibrar] · `trainHeadwindDamp`
**0,7** [calibrar] · `climbTurnKm` **2,5** [calibrar] · `lastHelperKm` **4** DERIVADA de la fila
(S-286: «3-5 km de la cima») · `salvoLambda` **2,2** [calibrar].

**Se retira**: `sprintTrainKm` 3 **como frontera del tren** (sigue siendo la frontera de
`sprintRegimeKmh`, que es otra cosa y está medida).

**Cómo se mide.** `trainsPerBunchFinish` banda **2-5** (S-355 literal). `trainBrokenPct` = trenes que
llegan rotos a la flamme; banda **20-55 %** (S-356: pasa a menudo). `leadOutWinShare` = victorias del
sprinter con tren completo frente a sin tren; banda **1,4-2,5×**. `frontOwnerAt8kmPct` = llanas con
un dueño claro del frente a 8 km de meta; banda **55-90 %** (S-347: «hay días en que a 8 km todavía
no manda nadie»). Banco: `smallTours` y llana canónica.
Y para el tren de montaña: `climbTrainPct` = puertos decisivos con un tren de montaña identificado,
banda **50-90 %**; `lastHelperDropKm` = km a la cima en que se aparta el último gregario, banda
**2,5-6**; `salvoAttacksPerQueen` = ataques entre −5 y −2 km de la cima decisiva, banda **2-8**
(S-284: «corto y repetido»). Banco: `realQueens` y `grandTour`.

---

### R17 · El tipo de final se calcula por grupo (16 situaciones)

Ya existe `finishType(terrain, groupSize)` y ya se calcula por grupo: S-370 está `CUBIERTO`. **Lo que
falta es que la carta y los roles salgan de ahí** —S-047 y S-049 son el `CONTRARIO` nº 4 de las
veinte más graves— y tres detalles del último kilómetro.

```
R17.1  LOS ROLES SALEN DEL FINAL REAL, NO DE LA ETIQUETA           (S-047, S-049, S-052)
       autoOrders recibe `deriveFinishTerrain(profile)` y `finishType(terrain, 40)` en vez de
       `stage.kind`. Consecuencias, todas del catálogo:
             el sprinter es la carta en TODA etapa donde pueda ganar, puncheur incluido    (S-047)
             el jefe de general lo es aunque vaya 12.º                                     (S-047)
             la media montaña se decide por el final previsto y las órdenes y el plan nombran
             al MISMO hombre                                                               (S-052)
       → y toca «el 70 % del campo acaba de gregario», que es el punto 14 de §14 del mapa. HIPÓTESIS,
         y hay que escribirla como tal: que ese 70 % sea la CONSECUENCIA de repartir papeles por la
         etiqueta de la etapa —y no una preferencia de diseño— es lo que R17.1 supone, no lo que
         nadie ha medido. La bitácora lo deja abierto con todas las letras: «otra pregunta… este
         banco la deja a la vista sin contestarla» (v48 §4). Por eso `gregarioSharePct` **se publica
         sin banda** en los pasos 0 y 8 y su banda 45-65 % es **[DECISIÓN DEL DUEÑO 21]**, no un
         criterio de «hecho»: si tras R17.1 el número no baja, la causa era otra y hay que buscarla,
         no ensanchar la banda hasta que entre.
       Y `autoStageOrders` deja de tratar `clasica` con `allroundScore`.

R17.2  EL TIPO GANA UN VALOR: 'muro'  — Y ES UN CAMBIO DE CONTRATO     (S-327, S-330)
       muro = cota ≤ 1 km de meta con g ≥ 8 %.
       finishWeights.muro = { COL 0,55 · SPR 0,20 · TAC 0,15 · RES 0,10 }

       ESTO NO ES AÑADIR UNA FILA A UNA TABLA: `FinishType` gana un valor, y eso rompe todo
       `switch` exhaustivo sobre él. Va declarado en §9.6 como cambio de contrato, con su lista de
       sitios: `finishRoleWeight`, `admitsBunchFinish`, `isSprintFinish`, `finishWeights`, y todo
       consumidor de `FinishType` en `finish.ts`, `simulate.ts`, `autoOrders.ts` y `contracts.ts`.
       Paso **8**, con `ENGINE_VERSION++` propio y **predicción de huella declarada**: `llana-180`
       no se mueve (no hay muro en el canónico) y `reina-150` tampoco (su final es `alto`), así que
       la huella no debe moverse **por esta regla** —si se mueve, hay un `switch` con `default` que
       estaba tratando `muro` como otra cosa, y eso es el defecto, no el cambio—.
       `admitsBunchFinish('muro')` = **false** e `isSprintFinish('muro')` = **false**: se remata en
       cuesta, no en llano.

       LA ALTERNATIVA, ESCRITA POR SI SE RECORTA: retirar `muro` y cerrar S-327 y S-330 con
       `finishPuncheurScore` y `finishPuncheurKmToGo`, que ya distinguen cota corta y dura dentro
       del tipo `puncheur`. Es más barato y no toca el contrato; lo que pierde es que un muro y un
       puncheur de 4 km sigan compartiendo pesos, que es justo lo que las dos filas señalan. La
       recomendación es hacerlo (el tipo nuevo), y por eso está en §9.6 y no aquí escondido.
       NÓTESE que §1.1 declara intocables **los siete pesos de hoy**, no el tipo `FinishType`:
       ninguno de los siete se mueve ni un dígito, y el ancla del Muro de Huy es precisamente lo
       que esta regla respeta —hoy el Muro de Huy sale `puncheur` «y eso es correcto»
       (`stage/finish.ts:126-128`), y con `muroMaxKmToFinish` 1,0 km lo sigue saliendo, porque su
       cota no muere en el último kilómetro—.
       → S-327 y S-330 dejan de compartir tipo con un puncheur de 4 km, que es lo que hoy hace
         que un final de muro lo gane un rodador con punta.
       Y con la cota a ≤ 1 km gana el que mejor sube, y JUSTO POR ESO los que no la ganan atacan
       en la cota ANTERIOR, a 15-25 km (S-330): sale de R19 (fase 'decisivo') + R13.1.

R17.3  QUIÉN ABRE EL SPRINT REDUCIDO                          (S-339, hoy INVERTIDO)
       # con la convención de §3.2 (finishRank 0 = MEJOR), «abre antes el peor» es multiplicar
       # POR finishRank, no por (1 − finishRank):
       launchBias(r) = launchWorstFinisherM (+90 m) · finishRank(r)
       → abre ANTES el que PEOR remata, y el rápido aguanta la rueda hasta los 150-200 m.
         Hoy el orden está invertido: abre antes el más rápido.
       Y un grupo reducido salido de una fuga CAMBIA de régimen: `finishType` por grupo ya lo
       resuelve en cuanto R17.1 esté, sin regla extra.

R17.4  EL PAVÉ DEL FINAL SE MIDE EN LOS ÚLTIMOS 10 KM, NO EN 30        (S-480, S-369)
       La constante se llama **`finishPaveKm`** (`constants.ts:3416`), no `paveFinishKm`: el nombre
       que traía este documento no existe en el repositorio (grep en `packages` y `apps`: cero).
       Y el ejemplo que justificaba bajarla a 3 era falso: `finishPaveKm` es la **COLA** de los
       últimos N km (`finish.ts:116`: `paveFraction: fraction(tail(STAGE.finishPaveKm), 'paves')`),
       no el km absoluto. Un adoquín «en el km 150» solo cae dentro de esa cola en una etapa de
       exactamente 180 km; en una de 250 está a 100 km de meta y no cuenta nada.
       EL DEFECTO REAL, en km A META y no en km absolutos: con ventana de 30 km, un sector que
       muere a **25 km de la línea** sigue tipando la etapa de pavé, y los 25 km de asfalto que
       siguen la convierten en otra cosa. Es exactamente el caso que el comentario de la constante
       ya nombra por el otro lado —«el Ronde, cuyos últimos 13 km tras el Paterberg son asfalto»—:
       hoy el Ronde se salva por `finishPaveFraction`, no por la ventana.
             finishPaveKm 30 → **10**  [DECISIÓN DEL DUEÑO 18]
       Y NO a 3, por dos razones. La primera: `finishPaveFraction` 0,1 exige que el 10 % de esa
       ventana sea pavé; sobre 3 km eso son **300 metros**, y cualquier plaza empedrada de un
       pueblo tiparía la etapa de pavé. La segunda: Paris-Roubaix mide 0,30 en la ventana de 30 y
       «entra de sobra»; con ventana de 10 km sigue entrando (el Carrefour de l'Arbre está a 17 km
       y el velódromo tiene su propio pavé), pero **hay que comprobarlo**, y por eso es decisión y
       no propuesta: es un recorrido real cuyo tipado cambia.
       COMPROBACIÓN OBLIGATORIA en el paso 8, con los cinco recorridos de pavé del inventario:
       Roubaix, Ronde, Flandes del banco, Strade y Dwars. Predicción declarada: **Roubaix sigue
       tipando `pave`, el Ronde sigue sin tiparlo**. Si Roubaix cae, la ventana se queda en 30 y el
       defecto se ataca con `finishPaveFraction` en vez de con `finishPaveKm`.

R17.5  EL GRUPO DE CABEZA DE UNA REINA                    (S-367, LA DEUDA SIN BANDA de la v23)
       NO es una regla nueva: es la CONSECUENCIA de R02 (los compañeros colaboran), R18 (la
       colaboración se rompe tarde en un grupo pequeño), R13 (los rivales atacan al que cede) y
       R28 (el perfil es la carretera). El mecanismo ya está construido —la reserva mantiene al
       corredor clavado al ritmo aunque su nivel no llegue (S-454)—; lo que falta es que se
       CALIBRE, porque la deriva reparte los segundos de forma continua en vez de dar el escalón
       de la foto de grupo.
       LA BANDA, CON SU HISTORIA ENTERA Y NO CON LA MITAD QUE CONVENÍA. Este documento decía
       «se le pone banda por primera vez: 3-10» y lo atribuía a «la petición literal del dueño de
       la v23». Las dos cosas hay que corregirlas:
         (a) NO ES UNA CITA DEL DUEÑO, ES UN ENCARGO. `targets.ts:591-593` lo dice: «El ENCARGO
             pedía un objetivo también para la reina: "una reina real deja llegar juntos a un grupo
             de 5-15 y no 1"». Este documento se impone en su guía de lectura que «las citas del
             dueño van entre «» y solo esas»; ésta no lo es.
         (b) EL OBJETIVO SALIÓ ROJO Y LA BANDA NO SE PUSO, a propósito: «un objetivo que nace rojo
             no es un objetivo, es un TODO con formato de test».
         (c) Y LA PREMISA SE CORRIGIÓ DESPUÉS. **v26 §5**, con el Tour 2024 delante: en finales EN
             ALTO el resultado real es 1·1·1 dentro de 30 s. «El "1" del motor era realista para un
             final en alto y falso para todo lo demás.» `reina-150` y buena parte de `realQueens`
             son finales en alto.
       Redacción correcta, entonces, y es más estrecha y más honesta que la anterior:
             `medianLeadGroupRiders` gana banda **5-15** —la del encargo, sin rebajarla a 3-10—
             **SOLO en reinas cuyo final NO es `alto`** (`queenFinalKind ∈ {cima_cerca,
             valle_corto, valle_largo}`, que es lo que R28.2 hace explícito y contable).
             En reinas con final EN ALTO se **publica sin banda**, porque v26 §5 dejó dicho que
             ahí el 1 es realista y no un defecto.
       BANCO: la métrica vive en `smallTours.ts` (`ShapeStats.medianLeadGroupRiders`, ventana
       `LEAD_GROUP_SECONDS` = 30, l. 105/447/466) y se imprime desde `sim/cli.ts:265`.
       **`realQueens.ts` NO la calcula**, así que asignarla a ese banco era asignarla a un sitio que
       no la produce: o se mide en `smallTours` ShapeStats, o se PORTA a `realQueens` explícitamente
       **en el paso 0**, partida por `queenFinalKind`. Se hace lo segundo, porque partirla por tipo
       de final es justo lo que la hace medible.
       **[DECISIÓN DEL DUEÑO 19]**: recomendación, 5-15 en valle y sin banda en alto. Y el motivo
       exacto, porque importa y §1.4 lo acota: **no** es una de las trece bandas con ancla de dominio
       de §13 del mapa —el dueño no fijó ésta—; es decisión porque convierte en objetivo un ENCARGO
       cuyo objetivo **nació rojo y al que a propósito no se le puso banda**. Estrechar el alcance
       (solo valle) y devolver el número al 5-15 del encargo son dos movimientos en direcciones
       contrarias, y ninguno de los dos lo decide un diseño solo.
       Y es un test de aceptación del racimo, **medido donde vive**: ver §9.3.

R17.6  EL QUE ESPERA AL ÚLTIMO KILÓMETRO Y EL QUE SE HUNDE      (S-274, S-316, S-341, S-277)
       ya ocurren o son consecuencia: el favorito con mejor punta puede guardarse y jugarse el
       sprint del grupito (S-274, con R18.3 que le deja de relevar); el final en alto también se
       decide por desgaste sin que nadie abra hueco (S-316, CUBIERTO); tras un puerto gana el que
       subió más cómodo (S-341, CUBIERTO). Se conservan.
```

**Cierra.** S-049, S-274, S-278, S-316, S-327, S-328, S-330, S-331, S-339, S-340, S-341, S-367,
S-370, S-445, S-446, S-480. **Y con R21**, S-047 y S-052.

**Constantes nuevas.** `finishWeights.muro` (tabla) DERIVADA de `alto` y `puncheur`, entre los dos ·
`launchWorstFinisherM` **+90 m** [calibrar] · `finishPaveKm` **30 → 10** (movimiento, [DECISIÓN DEL
DUEÑO 18]) ·
`muroMaxKmToFinish` **1,0** [calibrar] · `muroMinGradient` **8 %** [calibrar].

**Cómo se mide.**

| Estadística             | Qué cuenta                                                                            | Banco                                                                                          | Banda                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `medianLeadGroupRiders` | existe (`smallTours.ShapeStats`, ventana 30 s), **mide 1**, es la deuda de la v23     | `smallTours` ShapeStats **+ `realQueens` partida por `queenFinalKind`** (portada en el paso 0) | **5-15 en reinas de final NO alto**; **sin banda en final en alto** (v26 §5)                                                                                                                                                                                                                                                                                                                                                                 |
| `roleFromFinishPct`     | etapas en que la carta del equipo coincide con el mejor del equipo para el final REAL | carrera pequeña + `smallTours`                                                                 | **85-100 %**                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `gregarioSharePct`      | fracción del campo con rol gregario                                                   | `smallTours`                                                                                   | **SE PUBLICA SIN BANDA** en los pasos 0 y 8 (hoy 70 %). El 45-65 % que este documento traía como banda va a §10 como **[DECISIÓN DEL DUEÑO 21]** con recomendación, porque `mapa-requisitos-duenio.md` §14 punto 14 deja el reparto de roles como **pregunta abierta** —«otra pregunta… este banco la deja a la vista sin contestarla» (v48 §4)— y ponerle banda es contestarla por la puerta de atrás. No es criterio de «hecho» del paso 8 |
| `wallWinnerColPct`      | finales de muro ganados por alguien con COL ≥ p80                                     | `calendarQueens`                                                                               | **55-90 %** [calibrar]                                                                                                                                                                                                                                                                                                                                                                                                                       |

Invariante nuevo (**55**): «una reina **con meta en valle** deja llegar a un grupo, no a un hombre»
(5-15). En finales en alto no afirma nada, porque v26 §5 midió que ahí el 1 es la carretera.

---

### R18 · La colaboración que se rompe (21 situaciones)

**Pieza.** El turno con **duración y orden** (S-492, `AUSENTE`), montado sobre el `relayTurn` que ya
existe con su listón de deber, su techo de veinte y su suelo de uno a cuatro (S-477, `CUBIERTO`).

Hoy `relayTurn` (`simulate.ts:578`) **se rehace entera desde cero cada bloque de 100 m y en cada
grupo**, por puntuación (`relayDuty` + desempate fijo `workJitter`), **sin memoria de quién acaba de
tirar, sin relevo hacia atrás y sin duración** —la constante que contaba el apartarse,
`pullOffFrontShare`, se retiró—. Así que los mismos hombres van al frente kilómetro tras kilómetro
hasta que la frescura les cambia el orden. Eso es lo que se arregla.

```
R18.1  EL TURNO ES UNA COLA                                                      (S-492)
       Turn = { order: string[], head: number, kmLeft: number }
       turnPullKm = { llano 0,6 · subida 0,3 · abanico 0,25 }
       el que agota su turno pasa al FINAL de la cola; no vuelve a cabeza hasta que gire entera.
       La PERTENENCIA se recalcula cada km (relayTurn, sin cambios); el ORDEN persiste.
       Efecto colateral gratis: `pulling` deja de ser una bandera y pasa a ser «voy en la cabeza
       de la cola», que es lo que R03.4(b) quería decir con «el que venía en la rotación».

R18.2  QUIÉN NO PASA, Y POR QUÉ                     (S-122, S-128, S-133, S-256, S-474)
       sittingOn(r) con MOTIVO NOMBRADO, que la crónica publica:
             'mate_ahead' (R01) · 'team_on_front' · 'debt' (R09) · 'no_chance' (existe)
             'order_refuse' (R22/S-256) · 'infiltrado' (R03.5) · 'saving' (effort ahorrar)
             'awaiting_leader' (R01.6) · 'leaders_group' (R18.8)
       CONTAGIO: existe (`coopContagionWeight` 0,6). Se conserva.
       Y la mitad que falta de S-122: si uno se escaquea SIN MOTIVO, los demás bajan el ritmo
       antes que regalarle la etapa, y a veces atacan para soltarle (eso es R18.3, el pasajero).

R18.3  LA RUPTURA CERCA DE META                     (S-253, S-363, S-364, S-366)
       ÁMBITO, PRIMERO, PORQUE SIN ÉL ESTA REGLA HUNDE EL PELOTÓN:
             se aplica SOLO si  g.kind ≠ 'peloton'  ∧  g.size ≤ collabBreakMaxSize (12)
       Escrita sin esa guarda —como estaba— bajaba el compromiso de CUALQUIER grupo por debajo de
       los 8 km, el pelotón incluido, justo donde R16 monta los trenes y donde la tabla de fases da
       a `desenlace` un `commitFloor = finalDrive`. Eso deja dos valores en vigor para el mismo
       bloque sin ninguna regla de precedencia.
       PRECEDENCIA, escrita (y es la misma que R19.2bis): **el `commitFloor` de la fase MANDA sobre
       cualquier amortiguación de racimo**. `collabBreakDamp` puede bajar el compromiso hasta el
       suelo de la fase y ni un punto más. La única excepción es la ventana de la captura (R19.5),
       donde el suelo del tirón final se levanta a propósito y está escrito allí.
       El banco `temblor` gana un contador para esto: `bloquesConDosCompromisosPct`, banda **= 0**.

       tres regímenes en vez de uno:
             kmToGo > breakFinaleKm (15):   compromiso normal
             8 < kmToGo ≤ 15:               se deja de mirar y se tira A BLOQUE
             kmToGo ≤ collabBreakKm (8):    compromiso = max(commitFloor(fase),
                                                            restCommit · collabBreakDamp (0,55))
                                            y λ de ataque interno × 3
       LA ASIMETRÍA, que es lo que hoy falta (S-363, S-253): **el que se guarda es el MEJOR
       rematador, no el que no puede ganar**. Con la convención de §3.2 (finishRank 0 = MEJOR), la
       fórmula que descuenta deber al mejor es ésta, y es la que ya estaba bien escrita:
             duty(r) −= bestFinisherSitGain (1,0) · (1 − finishRank(r))   con kmToGo ≤ 15
             # finishRank 0 (el mejor) → −1,0 de deber. finishRank 1 (el peor) → 0.
       `duelBench` lleva la **aserción de signo** que caza esto si alguien invierte la convención:
       `bestFinisherPullShare` ≤ 0,8/n, nunca ≥ 1/n.
       y el suelo de relevos se levanta dentro de collabBreakKm, para que el grupo pueda llegar
       a pararse de verdad («todos se miran y la velocidad cae»).
       QUIÉN CIERRA (S-364): cierra el que más pierde si el ataque prospera —
             closer = argmax_r (finishScore(r) − finishScore(atacante)) entre los que pueden
             y el que ha cerrado `closerMaxTimes` (2) ya no cierra el tercero.
       EL PASAJERO (S-366): pullShare(r) < 1/(2·party) → los demás bajan el ritmo
             compromiso × (1 − passengerDamp (0,12)) y su score de meta × 0,93.

R18.4  GRUPOS PEQUEÑOS                              (S-301, S-302, S-264, S-333, S-368)
       fuga de DOS: es el grupo que MÁS TARDE deja de relevar. Con el pelotón encima se releva
             hasta la flamme rouge; la ruptura la dispara el MARGEN SOBRE LOS PERSEGUIDORES y no
             el kilometraje: rompe cuando margen > pairBreakMarginS (60) o kmToGo ≤ pairBreakKm (4).
       fuga de TRES: el PEOR rematador ataca cuando margen > trioAttackMarginS (45) —antes que en
             una pareja, después que en un grupo grande— y el mejor NO cierra: deja que cierre el
             tercero (es R18.3 aplicado a n=3).
       EL SOLITARIO (S-264, S-333, ambos CONTRARIO): su compromiso se REEVALÚA, no se HEREDA del
       movimiento en que nació:
             soloCommit = clamp(0,55 + 0,40·(1 − kmToGo/soloDoseKm (60)), 0,5, 0,97)
             → dosifica lejos y se vacía cerca, con el mismo suelo que el tirón final del pelotón.
       Y contra el que se ha ido de la fuga, los de atrás cierran SOLO si le interesa a todos
       (S-368): `closer` de R18.3 sobre el grupo de origen.

R18.4bis EL MANO A MANO DE GENERAL                            (S-266, AUSENTE, cita del dueño)
       R18.4 escribe la fuga de dos en términos de CUÁNDO se rompe el relevo. Falta la otra fuga de
       dos, que es la que decide las grandes vueltas: **el maillot y su rival, solos**, donde el
       relevo no se rompe tarde, es que **no existe desde el primer metro**.
       si en un grupo hay EXACTAMENTE dos hombres de general dentro de gcDuelS (120 s) el uno del
       otro y el resto del grupo no juega la general:
             el que va POR DELANTE en la general: relayDuty = 0 y `sittingOn` con motivo 'gc_duel'
                   → «el que lleva el maillot ya va ganando… se esconde y obliga a los demás a
                     mover la carrera» (v57), «si el líder se sienta, son sus rivales los que
                     tienen que moverle» (v46)
             el que va POR DETRÁS: releva solo, y recibe λ de ataque PROPIA
                   λ_duel = lambdaDuel (0,25)/km mientras el hueco no se abra
       Y LA CONSTANTE QUE HOY LO BLOQUEA SE RETIRA, porque sin eso la regla no se puede ejecutar:
             `tacticInsideAttackMinRiders` **3 → 2** (`constants.ts:2724`)
       GRUPO-50 lo nombra literalmente: «`tacticInsideAttackMinRiders` = 3 impide `ataque_grupo` en
       un grupo de dos». Va a §9.5 con su paso (el 7) y su motivo.
       R18.8 no cubre esto: exige ≥ 3 cartas de equipos distintos.
       BANDA, ya escrita en GRUPO-50: `jerseyPullShareInDuel` = km al frente del maillot en grupos
       de 2-3 con su rival directo, **≤ 20 %**. Banco: `duelBench` + `realQueens`.

R18.5  LA ALIANZA DENTRO DE LA FUGA                                      (S-082, S-453)
       dos que se entienden (mismo equipo, o pacto de S-453) relevan a tope entre sí y dejan
       fuera al que no colabora: turnPullKm × allyTurnGain (1,3) entre aliados, y el excluido
       entra al turno con el listón subido.

R18.6  CUPO DEL TURNO POR EQUIPOS                   (S-210, cita literal del dueño)
       techo del turno = min(members, relayRotationMax (20),
                             Σ_t min(presentes(t), perTeamCap))
       perTeamCap = ceil(relayRotationMax / equiposColaborando)
       → «si hay 4 equipos colaborando, 5 de cada uno». Y el que se queda sin relevos CEDE EL
         FRENTE ENTERO (R20).

R18.7  RENEGOCIAR AL FUSIONAR, Y EL GRUPO SIN EQUIPOS                    (S-209, S-235)
       `mergeGroups` ya hereda reloj y velocidad del de delante, se queda con el MÁXIMO de los dos
       compromisos y promedia coop y tensión (S-491). Lo que se añade:
             PEAJE DE LOS RECIÉN LLEGADOS: entran al final de la cola del turno y hacen la cabeza
             los primeros mergeTollKm (2) km. Hoy entran en igualdad desde el bloque siguiente.
             Y el compromiso pasa de `max` a `weighted(size)`: un grupo que absorbe a otro no
             puede salir más rápido de lo que le toca, que es justo lo que hoy pasa.
       EL GRUPO SIN EQUIPOS (S-235): el listón alto del pelotón (1,5) no se aplica a los agentes
       libres; para ellos, `relayDutyThresholdLoose` (0,8). En un campo mixto los sueltos no
       pueden quedar fuera del turno por un listón pensado para equipos.

R18.8  EL GRUPO DE LÍDERES SIN GREGARIOS       (S-308, CONTRARIO nº 7 de las veinte más graves)
       Es la segunda regla que el catálogo dejó fuera de los 28 racimos, y hay que escribirla.
       leadersGroup(g) = |cartas de equipos distintos| ≥ 3 ∧ gregariosPorCarta ≤ 1 ∧ g.size ≤ 12
       LA PUERTA QUE VA ANTES, Y SIN LA CUAL ESTA REGLA APAGA LA CARRERA JUSTO CUANDO NO DEBE.
       Hay dos situaciones, las dos con cita del dueño, en las que los favoritos **SÍ colaboran** y
       este documento no las nombraba:
             S-255 (CONTRARIO, GRUPO-36): «los que ganan tiempo en la general colaboran aunque no
                   vayan a ganar la etapa: el interés de general manda sobre el de etapa» — «que
                   los que van segundo, tercero o cuarto… quieren luchar por la carrera» (v52).
             S-312 (AUSENTE, GRUPO-37): «con el maillot descolgado los rivales se alían y tiran
                   todos sin atacarse hasta que el hueco está hecho» — «El líder se queda atrás…
                   ¿y nadie de su equipo tira para ayudarle?» (v57 §3).
       Redacción:
             si ∃ r ∈ g con virtualGain(r) > 0 frente a un hombre de general que va DETRÁS del
                grupo (sea el maillot o no), y el hueco a ese hombre < consolidateGapS (90):
                   → EL DEBER NO SE AMORTIGUA (leaderGroupDutyDamp NO se aplica)
                   → la λ de ataque INTERNO se apaga (× consolidateAttackDamp 0,15)
                   → motivo de relevo nombrado: 'consolidando'
                y esto dura HASTA que el hueco supere `consolidateGapS`. Sólo entonces entra R18.8
                entera y el grupo se rompe por dentro.
       → Es la secuencia real: primero se hace el hueco entre todos, después se pelean el hueco.
       MEDIDA, con la banda ya escrita en GRUPO-36 y GRUPO-37: `topTenRelayWhileGapPct` = relevos
       dados por los top-10 de la general presentes mientras haya un top-5 descolgado detrás,
       **≥ 50 % de los bloques**. Banco: `realQueens` + `grandTour`.

       si leadersGroup(g) ∧ NO se cumple la puerta de consolidación:
             EL DEBER DE RELEVO SE ANULA:  relayDuty(r) × leaderGroupDutyDamp (0,15)
                   con motivo 'leaders_group'
             SE ATACAN POR TURNOS: cooldown por equipo (R02.7) y λ × leaderGroupLambda (1,8)
             Y CADA UNO MARCA A SU RIVAL DIRECTO DE LA GENERAL:
                   markTarget(r) = el rival de general más cercano por gcDeficit presente en g
                   (marcaje EMERGENTE, sin orden del jugador: es S-273 y S-267)
             SALVO que quede UN gregario (S-309): ese último marca un tempo alto que DESACTIVA
                   los ataques hasta la rampa final: compromiso ≥ lastHelperCommit (0,90) y
                   λ × 0,4 mientras tire.
       → en un grupo de líderes el motor hace hoy lo contrario de lo que hace un pelotón: RELEVAR.
         Eso desactiva la última media hora de todas las etapas de montaña, y la selección se
         decide al sprint en vez de a golpes.

R18.9  EL TEMBLOR: TODO COMPROMISO TIENE DURACIÓN MÍNIMA E HISTÉRESIS
       Es el guardarraíl del rediseño entero, y va aquí porque el turno es el primer sitio donde
       muerde. Toda decisión con compromiso —turno, intención de equipo, frente, marcaje, tren—
       lleva:
             commitMinKm[intención]   # turno 0,3-0,6 · frente 3 · marcaje 2 · fuga 5 · tren 1
             y la comparación con el retador se hace CON MARGEN, no dentro de la utilidad:
                   cambiar ⟺ utilidad(retador) > utilidad(vigente) · (1 + commitHysteresisMargin)
                   commitHysteresisMargin = 0,15
       Poner la histéresis en la COMPARACIÓN y no dentro de cada utilidad es lo que permite que
       **una sola constante gobierne el temblor de todo el motor** y se pueda calibrar sola.
       Sin esto, un rediseño puede salir con todos los números en banda y la carrera ILEGIBLE en
       la crónica, que es el modo de fallo que ningún banco de hoy ve (§7.5).
```

**Cierra.** S-082, S-122, S-208, S-209, S-210, S-235, S-253, S-257, S-264, S-301, S-302, S-333,
S-361, S-363, S-364, S-366, S-368, S-453, S-477, S-491, S-492. **Más S-308 y S-309**, que el
catálogo dejó fuera, **más S-266** (R18.4bis), **S-255 y S-312** (la puerta de consolidación de
R18.8), que este documento no nombraba y contaba como cerradas.

**Constantes nuevas.** `turnPullKm` **{0,6 / 0,3 / 0,25}** DERIVADA del `pullOffFrontShare` retirado ·
`breakFinaleKm` **15** DERIVADA de `finalDriveKm` 15 · `collabBreakKm` **8** DERIVADA de la fila
(S-253: «a 8-10 km casi nadie releva») · `collabBreakDamp` **0,55** [calibrar] ·
`bestFinisherSitGain` **1,0** [calibrar] · `closerMaxTimes` **2** [calibrar] · `passengerDamp`
**0,12** [calibrar] · `pairBreakKm` **4** [calibrar] · `pairBreakMarginS` **60** [calibrar] ·
`trioAttackMarginS` **45** DERIVADA de `tacticBreakGapSeconds` 45 · `soloDoseKm` **60** [calibrar] ·
`allyTurnGain` **1,3** [calibrar] · `perTeamCap` (derivada de `relayRotationMax` 20) ·
`mergeTollKm` **2** [calibrar] · `relayDutyThresholdLoose` **0,8** DERIVADA del listón del pelotón
1,5, la mitad · `leaderGroupDutyDamp` **0,15** [calibrar] · `leaderGroupLambda` **1,8** [calibrar] ·
`lastHelperCommit` **0,90** DERIVADA de `bannerSurgeCommit`, **aplicada en R16.9** (el tren de
montaña), que es donde tiene sitio · `collabBreakMaxSize` **12** DERIVADA de
`numSuperiorityMaxGroup` 12 · `gcDuelS` **120** [calibrar] · `lambdaDuel` **0,25/km** [calibrar] ·
`consolidateGapS` **90** [calibrar] · `consolidateAttackDamp` **0,15** DERIVADA de
`leaderGroupDutyDamp` 0,15, el mismo número por el otro lado · **`commitMinKm`** (tabla) [calibrar] ·
**`commitHysteresisMargin` 0,15** [calibrar].

**Se retira**: `tacticInsideAttackMinRiders` **3 → 2** (R18.4bis; hoy impide el ataque en un grupo
de dos, que es exactamente lo que S-266 pide).

**Lo que NO se propone, y por qué.** `breakFinaleCommit` y `breakClimbCommit`. Están medidas, movían
la canónica y las carreras reales 8:1, salieron del código en `dc489a6` (v44 §6) y el dueño cerró el
tema con «está bien así» y «el problema no es la ley». La deuda §14.4 —el ganador en solitario en
media montaña, 4 % contra el 20-30 % que pidió— se ataca **solo** con el turno con orden, la
asimetría del mejor rematador, la ruptura a 8 km y el compromiso del solitario reevaluado. Si con eso
no se mueve, **es una decisión del dueño sobre la ley** (§10, decisión 15), no una perilla que ya se
probó y se quitó.

**Cómo se mide.**

| Estadística                          | Qué cuenta                                                                                    | Banco                       | Banda                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------ | --------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `soloWinMediaPct`                    | ganadores en solitario en media montaña                                                       | **media-190** (entra en CI) | **12-28 %**, y hay que decir lo que esto es: **una REBAJA del objetivo que pidió el dueño (20-30 %)**, no un número técnico. Hoy mide 4 %; el suelo se pone en 12 porque es lo que se espera alcanzar con R18, no porque 12 sea la carretera. Por eso va a **§10 como [DECISIÓN DEL DUEÑO 20]** con recomendación, y a **§9.1bis** como banda nueva con su procedencia («rebaja de un objetivo del dueño»), en vez de quedarse enterrada en esta tabla. Se recalibra en el paso 21. |
| `relayRefusalNamedPct`               | negativas a relevar con motivo nombrado                                                       | coherencia                  | **90-100 %**                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `turnRotationKm`                     | km medio de un turno en cabeza                                                                | llana canónica              | **0,4-0,9**                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `leadersGroupRelayPct`               | relevos dados en un grupo de líderes sin gregarios                                            | `realQueens`                | **0-15 %** (hoy: relevan todos)                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `bestFinisherPullShare`              | fracción del trabajo de los últimos 15 km que hace el mejor rematador del grupo               | `duelBench` + media-190     | **≤ 0,8 / n** (o sea: menos que su parte)                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `compromisosMasCortosQueSuMinimoPct` | compromisos rotos antes de su `commitMinKm`                                                   | todos                       | **= 0** (invariante duro **61**), **con su COBERTURA publicada al lado**: ver el aviso del paso 7 en §8                                                                                                                                                                                                                                                                                                                                                                             |
| `bloquesConDosCompromisosPct`        | bloques con dos valores de compromiso en vigor (suelo de fase contra amortiguación de racimo) | `temblor`                   | **= 0**                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `topTenRelayWhileGapPct`             | relevos de los top-10 de la general con un top-5 descolgado detrás                            | `realQueens` + `grandTour`  | **≥ 50 %** (S-255, S-312)                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `jerseyPullShareInDuel`              | km al frente del maillot en grupos de 2-3 con su rival directo                                | `duelBench` + `realQueens`  | **≤ 20 %** (S-266, GRUPO-50)                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

Invariantes nuevos: **71** (de `datos`) «el turno en cabeza dura ≥ `turnPullKm`·0,5 salvo rotura del
que tira» · **61** «`compromisosMasCortosQueSuMinimoPct` = 0».
(El **71**, no el 50: el 50 es «se persigue lo que hace daño» de R04/R20 en la tabla maestra de §7.6,
que es la única fuente de numeración.)

---

### R19 · Fases explícitas y sus ventanas (19 situaciones)

Este racimo mata **los dos `CONTRARIO` que apagan la capa táctica entera**: S-444 (`tacticMaxMoves`
3, un contador de grupos vivos por encima de toda la táctica) y S-487 (`closingNow`, que salta
`attemptFrom` desde el pelotón ENTERO mientras exista un movimiento sin cuerda). Entre los dos apagan
la carrera por delante y por detrás de la fuga del día, y uno está medido con su propio comentario:
**«cuatro intentos hasta el km 19 y ni uno más en los 190 restantes»** (Race Almeria e1).

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
R19.1  CÓMO SE CALCULA (cada km) — **COMO LISTA ORDENADA DE GUARDAS, Y EL ORDEN ES LA REGLA**
       Varias condiciones se cumplen a la vez y a menudo: en el km 20 de una etapa con la fuga aún
       sin cuajar y un puerto a 6 km se cumplen `fuga`, `aproximacion` y a veces `caza`, y cada una
       da un valor distinto de aduana (sí/no) y de `λscale` (1,00 / 0,70 / 0,55). Escribirlas sin
       orden dejaba la fase —que es EL ESTADO COMPARTIDO del que cuelga toda la conducta—
       indeterminada. Se evalúan de arriba abajo y **la primera que se cumple gana**:

       1. neutralizado : km < neutralKm (dato del perfil)                          (S-073, S-223)
       2. tregua       : truce concedida y viva                                    (R12.2)
       3. captura      : durante capturaKm (1) tras una captura
       4. desenlace    : kmToGo ≤ finalDriveKm ∧ finishType admite llegada agrupada
       5. decisivo     : (onClimb ∧ raceThisClimb) ∨ sector decisivo ∨ kmToGo ≤ lateAttackKm
       6. aproximacion : approachKm antes de puerto, sector, embudo o tramo expuesto
       7. caza         : gap decreciendo con compromiso ≥ 0,75
       8. fuga         : sin dayBreak                                    (y km ≥ settleKm)
       9. salida       : sin dayBreak ∧ km < settleKm
      10. control      : el resto

       DOS ELECCIONES DE ORDEN QUE NO SON OBVIAS Y VAN RAZONADAS:
             · `desenlace` por encima de `decisivo`: en un final en alto se cumplen los dos, y
               manda el que fija el suelo del tirón final, que es el que la carrera obedece.
             · `caza` por encima de `fuga`: mientras el pelotón cierra de verdad, la etapa ya no
               está en fase de fuga aunque no haya `dayBreak`. Es lo que evita que el km 20 de una
               etapa nerviosa se lea como `fuga` con la aduana abierta de par en par.
       `salida` por debajo de `fuga` con la puerta `km < settleKm` explícita: son excluyentes por
       construcción y el orden solo desempata la lectura.

R19.2  LA TABLA DE FASE (sustituye a los umbrales sueltos)                        (S-218)

       phase          λscale  commitFloor  aduana  ataqueDentro  rescate  maxMovesDesdeAquí
       neutralizado    0,00      0,35        no        no           no        0
       salida          0,60      0,45        sí        no           sí        2
       fuga            1,00      0,50        sí        no           sí        4
       control         0,45      0,55        sí        sí(tensión)  sí        4
       caza            0,55      0,75        sí        sí           sí        4
       aproximacion    0,70      0,88        no        sí           no        5
       decisivo        1,30      0,75        no        sí           no        6
       desenlace       1,00    finalDrive    no        sí           no        6
       captura         2,50      0,45        sí        sí           sí        6
       tregua          0,10      0,45        no        no           sí        1

       El `commitFloor` de `decisivo` es **0,75**, heredado de `caza`, y no un «—». La guía de
       lectura de este documento promete que «no hay ningún "a definir"», y un guion en la columna
       que fija el suelo del compromiso en la fase donde se decide la etapa era exactamente eso.
       0,75 y no más: en el puerto decisivo el grupo va a tope por selección, no por un suelo
       impuesto, y ponerlo más alto habría hecho el trabajo que R13.1 y R18.8 tienen que hacer.

R19.2bis PRECEDENCIA ENTRE EL SUELO DE FASE Y LAS AMORTIGUACIONES DE RACIMO
       Regla única y escrita, porque tres reglas de este documento bajan el compromiso por su
       cuenta (R18.3 `collabBreakDamp`, R18.8 `leaderGroupDutyDamp`, R12.2 `truceCommit`):
             **el `commitFloor` de la fase es un SUELO DURO: ninguna amortiguación de racimo lo
             cruza.** Las amortiguaciones bajan el compromiso hasta ese suelo y ahí se paran.
       DOS EXCEPCIONES, y son las dos únicas, las dos escritas:
             · la ventana de la captura (R19.5), donde el suelo del tirón final NO se aplica a
               propósito —es lo que hace posibles S-231 y S-329—;
             · la fase `tregua`, cuyo propio suelo (0,45) ya es el más bajo de la tabla.
       El banco `temblor` lo vigila con `bloquesConDosCompromisosPct` = 0.

       La fase es un ESTADO COMPARTIDO que cambia la conducta de golpe, que es la fila literal.

R19.3  SE RETIRA tacticMaxMoves = 3                            (S-444, CONTRARIO nº 15)
       El techo pasa a ser POR FASE y POR GRUPO DE ORIGEN (el cooldown de 4,5 km ya existe).
       Motivo escrito: un contador de grupos vivos en carretera decidía si se podía intentar algo
       ANTES de mirar quién quedaba en el grupo, cuánto faltaba y quién mandaba. Con la fuga del
       día, un puente y un contraataque —situación normal en una reina— nadie podía saltar en el
       puerto decisivo, ni desde el pelotón ni desde dentro de la fuga.

R19.4  SE RETIRA closingNow COMO VETO                          (S-487, CONTRARIO nº 16)
       Mientras el pelotón cierra un intento sin cuerda, SE SIGUE ATACANDO: es justo cuando salta
       el bueno, por el otro lado y con el que cerraba ya gastado.
       El cierre deja de ser un veto y pasa a ser PRECIO: payable(t) × closingBusyDamp (0,7).
       Los intentos SE SOLAPAN, y cerrar cuesta la caza siguiente.

R19.5  LA VENTANA DE LA CAPTURA                        (S-231 y S-329, las dos caras)
       fase 'captura' durante capturaKm (1), y luego contraataqueKm (2) con λ × 2,5.
       Y DENTRO DE ESA VENTANA EL SUELO DEL TIRÓN FINAL NO SE APLICA:
             es exactamente lo que hoy tapa el bajón entero dentro de los últimos 15 km, y por eso
             S-231 (la tregua tras la captura) y S-329 (el contraataque inmediato) comparten
             frontera y comparten arreglo.
       Cazar en la pancarta desordena el sprint que sigue (S-152), y eso sale solo.

R19.6  EL FLYER                                                (S-326, CONTRARIO)
       tacticNoAttackKm 3 → flyerKm (0,8), con λ_flyer bajo (lambdaFlyer 0,08) y SOLO para el peor
       rematador del grupo cuando el terreno ayuda (repecho, curva, viento de cola).
       Objetivo declarado y medible: gana el 2-5 % de las llanas.

R19.7  EL PUENTE DESDE ATRÁS, Y DEJARLO MARCHAR                (S-132, S-173, S-131)
       `attemptFrom(shed, 'puente')` permitido: un descolgado puede saltar hacia el grupo de
       delante POR ACCIÓN PROPIA, no solo esperar a que le absorban. Es la mitad de la regla 7
       que no existe.
       La aduana del puente está en R03.6, incluido «dejarlo marchar para que haga el trabajo».

R19.8  LA ETAPA CORTA DE MONTAÑA                                                 (S-471)
       si total < shortMountainKm (145) ∧ climbShare > 0,5:
             se SALTAN las fases 'fuga' y 'control': de 'salida' a 'decisivo' en el primer puerto.
       → no hay aduana ni control: los equipos de la general atacan desde el primer puerto,
         ninguna fuga consigue cuerda porque no queda etapa para cazarla, y el que planifica el
         día como si fuera una etapa normal llega tarde a todo.

R19.9  LO QUE YA ESTÁ Y SE CONSERVA          (S-116, S-121, S-130, S-152, S-169, S-170, S-350, S-476)
       la ráfaga de intentos; el cazado al que ya no se le da cuerda; la caza que empieza cuando
       el hueco deja de ser recuperable y no cuando es grande; el desgaste del actuador; la
       captura entre el km −15 y el −1; y el boquete de un ataque, que se CALCULA (45 s de
       comparación de velocidades) y no se sortea, y que el intento se paga igual aunque no abra
       hueco (S-476, CUBIERTO y nadie lo había inventariado).
```

**Cierra.** S-116, S-121, S-130, S-131, S-132, S-152, S-169, S-170, S-173, S-218, S-231, S-232,
S-326, S-329, S-350, S-444, S-471, S-476, S-487.

**Constantes nuevas.** tabla de fases (10 filas × 6 columnas; las columnas `λscale` y `commitFloor`
DERIVADAS de los umbrales sueltos de hoy, el resto [calibrar]) · `capturaKm` **1** [calibrar] ·
`contraataqueKm` **2** [calibrar] · `closingBusyDamp` **0,7** [calibrar] · `flyerKm` **0,8**
[calibrar] · `lambdaFlyer` **0,08** [calibrar] · `shortMountainKm` **145** DERIVADA de la fila
(S-471: «100-140 km») · `approachKm` **6** [calibrar] · `neutralKm` (dato del perfil, 3-8 km).

**Se retira**: `tacticMaxMoves` **3**, `closingNow` como veto, `tacticControlCommit` como rama
exclusiva, `tacticNoAttackKm` 3 (pasa a `flyerKm` 0,8).

**Cómo se mide.**

| Estadística            | Qué cuenta                                                    | Banco                            | Banda                                                                                  |
| ---------------------- | ------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------- |
| `attemptsPerStage`     | intentos por etapa                                            | llana canónica                   | **10-25** (hoy ≈ 12 y se corta a 3 movimientos vivos)                                  |
| `attemptsAfterKm100`   | intentos después del km 100                                   | llana canónica + Race Almeria e1 | **≥ 2** — el defecto medido de S-487 es literalmente «ni uno más en los 190 restantes» |
| `counterAfterCatchPct` | capturas seguidas de un contraataque en 3 km                  | llana canónica                   | **25-60 %**                                                                            |
| `flyerWinPct`          | llanas ganadas por un flyer nacido dentro de los últimos 3 km | llana canónica                   | **1-6 %** (objetivo declarado 2-5 %)                                                   |

Invariante nuevo (**54**): «después del km 100 se sigue intentando algo» (≥ 2 intentos).

---

### R20 · El pulso por el frente: quién paga la caza (20 situaciones)

Contiene **S-176**, el `CONTRARIO` **nº 1** de las veinte más graves: «es el error de puntería del
motor entero: se persigue al grupo más adelantado en vez de al que hace daño, así que toda la lógica
de caza apunta al sitio equivocado».

**Pieza.** El frente como **subasta**. Hoy lo lleva UNO por una tabla de `claim` con histéresis, y
eso funciona pero no es un pulso: nadie negocia, nadie se esconde, nadie se enfada.

```
R20.1  A QUIÉN SE PERSIGUE                                                       (S-176)
       El objetivo de la caza no es `frontMove()` sino, POR EQUIPO:
             target(t)     = argmax_move threatOf(t, move)  # R04.1b: lo que ME cuesta, ENTERO
             desiredGap(t) = leash(t)                       # R04.2
       `threatOf` y NO `costToMyMan`, y es la corrección que hace ejecutable el CONTRARIO nº 1:
       `costToMyMan` es un conteo puramente de general, así que para un equipo con `purpose 'etapa'`
       —el perseguidor NORMAL de una llana— vale **0 en todos los movimientos** y el `argmax` se
       queda en un empate a cero sin desempate. `threatOf` suma los tres términos (general, etapa,
       secundaria) reutilizando literalmente los de `objection` de R03.2, y lleva su desempate
       escrito. Es la misma función que la aduana, extraída a un solo sitio.
       y el compromiso del pelotón sale del MÍNIMO desiredGap entre los equipos que PAGAN.
       → si delante van tres irrelevantes y detrás el 2.º de la general, se persigue al segundo.
       Y el libro de la persecución (`chaseLedger`) deja de estar atado a `kind === 'peloton'`
       (deuda §14.9): se lleva por grupo, que es como se cobra.

R20.2  LA SUBASTA DEL FRENTE                                     (S-166, S-167, S-171, S-248)
       cada km:  claim(t) = PURPOSE_CLAIM[purpose(t)] · presence(t) · (1 − spent(t))
                            · precioDeLaCarretera(bloque)                            # R20.7
                            · clamp(presentes(t, g) / 6, 0, 1)          # ← S-248, ver abajo

       EL DERECHO AL FRENTE BAJA CON LOS HOMBRES PRESENTES (S-248, PARCIAL con cita). Este
       documento tenía `smallSquadClaim` en §5.2, aplicado a la CONVOCATORIA —los 4-6 hombres que
       viajan a la carrera—, y la fila pide otra cosa: «el equipo con pocos hombres ahorra y se
       cuelga del trabajo ajeno; el derecho al frente baja con los HOMBRES PRESENTES». Un equipo de
       ocho que llega al km 150 con tres en el pelotón es exactamente el caso, y la versión de §5.2
       no lo veía. Se mueve aquí, al kilómetro y al grupo, que es donde muerde. §5.2 conserva el
       factor **solo** para la escuadra reducida de partida (S-008), y los dos no se multiplican
       entre sí: manda el del kilómetro.
       Y NO lo apaga `numSuperiorityMaxGroup` (12): esa constante acota R02.7 y R02.8 dentro de un
       grupo pequeño, no el derecho al frente en el pelotón, que es donde S-248 vive.
       dueño = argmax claim, con la histéresis de hoy (`teamFrontHandoverSpent` 0,35 / Edge 0,2)
               y con `commitMinKm['frente'] = 3` (R18.9): el frente no cambia de manos cada km.
       SI HAY EMPATE dentro de frontTieBand (0,5): 2-3 equipos COMPARTEN, cada uno a
             frontSharedIntensity (0,7) del empuje
       → «si el frente no tiene dueño único, deberían tirar 1, 2 o 3 equipos pero con MENOR
         INTENSIDAD» (cita del dueño). Hoy solo existe como `noOwnerCommitFactor` 0,94, que es la
         segunda mitad (la intensidad) sin la primera (que sean 2-3 casas y no cinco).

R20.3  EL PULSO                                                                  (S-166)
       si dos o más equipos tienen objection > 0 y ninguno tiene payable ≥ price:
             ninguno empieza durante standoffKm = standoffBaseKm (2,0) · (1 + goodwillGap),
             acotado a standoffMaxKm (8)
             y la fuga gana standoffGainS (25 s por km de pulso)
       → «con dos o tres equipos del mismo interés, nadie quiere empezar: el pulso cuesta
         kilómetros y la fuga gana tiempo».

       LA ARITMÉTICA TIENE QUE CERRAR CON SU PROPIA BANDA, y antes no cerraba: con `standoffKm` 0,8
       y 25 s/km, un pulso completo daba **20 s** y la banda `standoffGapGainS` empieza en **40**.
       Tres números y solo dos grados de libertad; manda la banda, que es lo medible, y se ajusta
       el kilometraje:
             standoffBaseKm 2,0 × 25 s/km = **50 s**   (dentro de 40-200)
             standoffMaxKm  8,0 × 25 s/km = **200 s**  (el techo exacto de la banda)
       Y NO CHOCA con `commitMinKm['frente'] = 3` (R18.9), aunque lo parezca: `commitMinKm` protege
       a quien **tiene** el frente de soltarlo antes de 3 km; durante un pulso **nadie lo tiene**,
       así que no hay compromiso vivo que proteger. La histéresis que sí aplica es la de entrar:
       una vez que un equipo rompe el pulso y toma el frente, lo mantiene 3 km.

       ¿SE PUEDE REPETIR EN LA MISMA ETAPA? **Sí, hasta `standoffMaxPerStage` (2) veces**, y esto
       era lo que quedaba ambiguo. Un pulso se cierra cuando alguien toma el frente o cuando se
       agota `standoffMaxKm`; a partir de ahí no vuelve a abrirse hasta que el frente se suelte otra
       vez (R20.5, `frontFadeKm` 80) y las condiciones se repitan. **Nunca en fase `caza`,
       `aproximacion`, `decisivo` ni `desenlace`**: el pulso es de la fase de control, que es donde
       la fila lo pone.

R20.4  LA ALIANZA SE PIDE Y SE ROMPE                             (S-174, S-175)
       askAlly(t1,t2) si objection > 0 en ambos, (t1,t2) ∉ rivalries y goodwill ≥ 0.
       La pide un CAPITÁN, coche con coche o rueda con rueda: «ponme dos y pongo dos».
       Reparto DESIGUAL por construcción: el de más claim pone allyMajorMen (2), el otro 1, y el
       tercero se esconde.
       Se rompe el km en que uno de los dos ve su objection en 0 → el otro hereda el muerto y la
       fuga vuelve a crecer.
       Y EL QUE LA PIDE CONTRAE DEUDA: si no pone los hombres, lo paga en los relevos de hoy y en
       la aduana de mañana (R09.5).

R20.5  EL QUE SE ESCONDE Y EL QUE PAGA DE MÁS                    (S-172, S-151, S-170, S-168)
       purpose general no amenazado → intent 'nada' (ya existe: «tira tú, que es tu problema»).
       Lo que falta y se añade: la negativa entre equipos con el MISMO motivo —dos escuadras de
       sprinter que se miran— y el cálculo «llego al sprint con dos hombres más si tiras tú»:
             sitOutValue(t) = teamSitOutGain (0,35) · lanzadoresVivos(t)
             si sitOutValue > objection(t) − payable(t): intent 'nada' aunque tenga motivo
       El que ha llevado el peso frontFadeKm (80) pide relevo y NO vuelve (ya existe).
       El que caza y no llega paga dos veces (ya existe vía presupuesto).
       Y los DOS REGÍMENES (S-168): controlar son dos hombres a ritmo sostenible durante 100 km;
       cazar son cuatro o cinco quemándose en los últimos 40-60. Son dos `gear` distintos y hoy
       comparten uno.

R20.6  CAZAR CUESTA CORREDORES                                   (S-230, CONTRARIO)
       tras chaseHardKm (20) con compromiso ≥ 0,85 en llano:
             corte(peloton) puede dispararse SIN VIENTO, con λ = chaseShatterLambda (0,010/km)
       → el pelotón se parte por su propia caza, y el grupo que caza se hace más pequeño y más
         lento. Hoy cazar a tope 40 km en llano no cuesta un corredor.

R20.7  EL PRECIO LO PONE LA CARRETERA                                            (S-493)
       precioDeLaCarretera = 1
         + roadWindingExtra (0,45) · [roadClass == 'revirada']
         + roadNarrowExtra  (0,25) · [roadWidth < 2 carriles]
         + roadHeadwindExtra(0,35) · vientoFrontal
         − roadTailwindRelief(0,25) · vientoDeCola
       multiplica `price(move)` en R03 y el cierre necesario en el lazo de la caza.
       → «en carretera ancha y recta cuatro hombres devuelven tres minutos en cuarenta kilómetros,
         y en carretera de tercera con curvas, pueblos y rotondas el pelotón se estira, paga
         acordeón y pierde la mitad de su ventaja de número». `roadClass` y `roadWidth` son datos
         del recorrido que hoy no existen y los genera el paso 1.

R20.8  EL EQUIPO DE CAZAETAPAS NUNCA PERSIGUE                    (S-186, CONTRARIO)
       intentFor(purpose 'ninguno' | 'combatividad') NUNCA devuelve 'perseguir'.
       Prueba contras mientras hay cuerda y después se sienta. Hoy puede acabar tirando.

R20.9  QUÉ GRUPO ES «EL PELOTÓN» Y CONTRA QUÉ RELOJ SE MIDE TODO                 (S-442)
       `mainId` ya se mueve por tamaño con histéresis 1,25, y esa mitad está construida. La otra
       no: el reenganche (D-42) y el ritmo de cada grupeto (D-41) se miden siempre contra el
       `Group` con id fijo `peloton`, no contra `mainId`. Se cambian los dos a `mainId`.

R20.10 LA POLÍTICA DE CAZA COMO ORDEN  → R22                                     (S-071)
```

**Cierra.** S-071, S-150, S-151, S-166, S-167, S-168, S-171, S-172, S-174, S-175, S-176, S-178,
S-180, S-186, S-230, S-296, S-442, S-474, S-477, S-493. **Más S-248** (R20.2), que estaba en el
«Cierra» de R15 sin regla que la citara.

**Constantes nuevas.** `frontTieBand` **0,5** [calibrar] · `frontSharedIntensity` **0,7** DERIVADA de
`noOwnerCommitFactor` 0,94 reinterpretado (0,94 era el efecto agregado; 0,7 es el empuje individual
de cada casa que comparte) · `standoffBaseKm` **2,0** DERIVADA de la banda `standoffGapGainS` 40-200 s y de `standoffGainS`
25 s/km (2,0 × 25 = 50 s, dentro de banda) · `standoffMaxKm` **8,0** DERIVADA de la misma (8 × 25 =
200 s, el techo exacto) · `standoffMaxPerStage` **2** [calibrar] · `standoffGainS` **25 s/km**
[calibrar]
· `allyMajorMen` **2** DERIVADA de la cita («ponme dos y pongo dos») · `frontFadeKm` **80** DERIVADA
(ya existe como conducta) · `chaseHardKm` **20** [calibrar] · `chaseShatterLambda` **0,010/km**
[calibrar] contra `flatWinnerGroupPct` 85-100 · `teamSitOutGain` **0,35** [calibrar] ·
`roadWindingExtra` **0,45** [calibrar] · `roadNarrowExtra` **0,25** [calibrar] ·
`roadHeadwindExtra` **0,35** [calibrar] · `roadTailwindRelief` **0,25** [calibrar].

**Se retira**: `noOwnerCommitFactor` 0,94 (lo sustituye R20.2, que es la regla entera que el dueño
pidió, no la mitad).

**Cómo se mide.**

| Estadística             | Qué cuenta                                                                                | Banco                           | Banda                                                                                                                                                                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `chaseTargetCorrectPct` | ver R04                                                                                   | `grandTour` + pequeña           | **85-100 %**                                                                                                                                                                                                                               |
| `frontTeamsPerStage`    | existe (inv. 22)                                                                          | voz de equipo                   | **1,8-4 → 2,2-4,5**                                                                                                                                                                                                                        |
| **`chaseCostShare`**    | **coeficiente de Gini del reparto del trabajo de cierre entre los equipos que colaboran** | voz de equipo + carrera pequeña | **0,25-0,55**. 0 = todos igual, que es falso; 1 = uno solo, que es lo de hoy. Es lo que mide S-171 («el reparto nunca es equitativo: uno pone dos hombres, otro uno de propina y el tercero se esconde») y ninguna otra estadística lo ve. |
| `standoffGapGainS`      | segundos que gana la fuga durante un pulso                                                | carrera pequeña                 | **40-200 s**                                                                                                                                                                                                                               |
| `chaseSplitPct`         | llanas en que la caza parte el pelotón                                                    | llana canónica                  | **5-25 %**                                                                                                                                                                                                                                 |
| `flatMoveWorstMarginS`  | existe, cita del dueño                                                                    | `smallTours`                    | **0-900, sin cambio**                                                                                                                                                                                                                      |

---

### R21 · La estructura de equipo persistente y la carta del día (23 situaciones)

Todo el contenido está en **§5**, porque es donde el dueño dictó las estructuras y donde se explica
cómo se eligen, cómo se traducen a papeles del día y cómo cambian. Aquí solo el cierre y la medida.

**Pieza.** `TeamStructure` persistente de carrera (en `packages/db`) + `cardOfDay(structure, shape,
day, memory, state)` + herencia de carta en carretera. Sustituye a un plan que hoy se deriva cada
mañana del `stage.kind` y **se congela el día entero**: `buildTeamPlans` se ejecuta UNA vez por etapa
(`simulate.ts` ~1577) y `leaderId`, `stageCandidateId` y `purposes` quedan fijos, de modo que solo se
reevalúa la postura contra la carretera. Eso es lo que hace que S-190, S-197, S-200 y S-291 sean
imposibles hoy.

**Cierra.** S-001, S-002, S-003, S-004, S-005, S-006, S-007, S-008, S-021, S-047, S-049, S-050,
S-051, S-052, S-053, S-179, S-190, S-197, S-200, S-291, S-390, S-392, S-395, S-469, S-483.

**Cómo se mide.**

| Estadística               | Qué cuenta                                                                                                                                                                        | Banco                         | Banda                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------ |
| `structureFitPct`         | escuadras cuya estructura es legal para el recorrido: nunca un lanzador sin sprinter, nunca ocho escaladores en una vuelta llana, nunca un cronista puro en una carrera sin crono | carrera pequeña + `grandTour` | **95-100 %** (invariante duro) |
| `cardInheritedPct`        | equipos que pierden su carta y nombran otra el mismo día o al siguiente                                                                                                           | carrera pequeña               | **80-100 %**                   |
| `structureChangesPerRace` | cambios de estructura en una gran vuelta                                                                                                                                          | `grandTour`                   | **0-2**                        |
| `cardChangedOnRoadPct`    | etapas con `card_changed` emitido en carretera                                                                                                                                    | carrera pequeña               | **5-25 %** [calibrar]          |

Invariante nuevo (**58**, de `datos`): «el campo cuya estructura es `sprint` nunca convoca un
lanzador sin sprinter».

---

### R22 · El sistema de órdenes del jugador (35 situaciones)

Es el racimo más grande del catálogo. Todo el contenido está en **§6**. Aquí el cierre y la medida,
porque la medida es la contestación literal a la queja fundacional del dueño: **«el resultado es casi
lo mismo ponga lo que ponga ahí»**.

**Cierra: 33 de las 35 filas.** S-023, S-024, S-025, S-026, S-029, S-030, S-031, S-032, S-040,
S-054, S-057, S-058, S-059, S-060, S-061, S-062, S-063, S-067, S-068, S-069, S-070, S-071, S-125,
S-214, S-215, S-216, S-256, S-320, S-321, S-322, S-323, S-421, **y S-217 y S-415 con las dos reglas
nuevas de §6.4** (R22.J y R22.K), que antes figuraban cerradas sin que ninguna regla las tratara.

**S-011 se cierra a medias y hay que decirlo.** La fila pide, entre otras cosas, decidir la
convocatoria, y §6.3 declara explícitamente «decidir la convocatoria nombre a nombre — **No**»
(rompe G2). Lo que sí se le da es el campo de **deseos de convocatoria** de R22.K, que ORDENA
`callupScore` sin nombrar la escuadra. La fila queda marcada **PARCIAL CERRADA A MEDIAS**, con la
misma fórmula con que R27 trata S-163 y R13 trata S-467, y no se cuenta como cierre completo ni aquí
ni en R25.

**Cómo se mide: el banco de órdenes, con SUELO, TECHO y DIRECCIÓN.** Hoy «ningún banco varía
`mentality`, `contestSprints/Climbs`, `targetRiderId` o rol por decisión externa» (`mapa-bancos.md`
§7.7): la queja no se puede ni refutar ni confirmar.

| Estadística          | Qué exige                                                                       | Banda                                                                                                             | Por qué                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `orderEffectSpread`  | **suelo**: cada palanca cambia el resultado                                     | **≥ 0,25** de diferencia de win-rate o de puesto medio normalizado, en al menos una métrica declarada por palanca | Contesta «el resultado es casi lo mismo ponga lo que ponga ahí». Una palanca que no mueve nada es la queja literal.                                                                                                                                                                                                                                                                                                      |
| **`orderMaxEffect`** | **techo**: ninguna palanca mueve el puesto medio más de **`0,045 · fieldSize`** | **≤ 0,045 · fieldSize**                                                                                           | Una palanca que decide sola convierte el juego en una pantalla de configuración, y choca con «todo jugador es un CICLISTA». **En FRACCIÓN del campo y no en puestos absolutos**, porque el techo se declaraba «≤ 8 puestos en un campo de 176» y se mide en `ordersBench`, que corre un campo de **88**: 8 puestos sobre 88 es el doble de listón que 8 sobre 176. 0,045 · 176 = 7,9 ≈ los 8 de siempre; 0,045 · 88 = 4. |
| **`orderDirection`** | **dirección**: el cambio va en el sentido que promete la pantalla               | **tolerancia CERO sobre el efecto PAREADO**                                                                       | Un `a_tope` no puede acabar de media más arriba que un `ahorrar`. Es la otra mitad de la queja: un efecto grande y con el signo cambiado también pasa el suelo. **Y se mide pareado por semilla, no sobre medias crudas**: ver el aviso de §7.3.                                                                                                                                                                         |

**Y son ONCE palancas, no siete.** Las cuatro nuevas (`triggerOn`, `chasePolicy`,
`refuseRelayTeams`, `dayGoal`) son justamente las que cierran **S-214, S-215, S-216, S-256, S-321 y
S-322** —seis situaciones `AUSENTE` con cita—, así que dejarlas fuera del banco significaba que las
seis quedaban sin ninguna prueba. `ordersBench` sube a **11 palancas × 2 valores × 12 semillas**
(§7.3), y los tres invariantes hablan de las once.

Invariantes nuevos: **59** «las once palancas del jugador mueven el resultado»
(`orderEffectSpread` ≥ 0,25) · **62** «ninguna palanca mueve el puesto medio más de
`orderMaxEffect` = 0,045 · fieldSize» · **63** «`orderDirection` en las once, tolerancia cero sobre
el efecto pareado».

---

### R23 · El relato que explica el porqué (14 situaciones)

Es el racimo **más barato después de R01** y el que hace visible todo lo demás: **sin él, ninguna
regla nueva se puede diagnosticar**. Todo lo que el dueño ha cazado este mes lo ha cazado en la radio
de carrera.

```
R23.1  pullMotive GANA VALORES                                          (S-434, S-441)
       'propio' (S-434: el jefe de filas que se hace su propio ritmo al frente de ocho en el
       último puerto —tirar por la propia carta es un motivo con nombre, no un «libre»),
       'equipo_puntos' | 'equipo_montana' | 'equipo_joven' | 'equipo_equipos' (R05),
       'colocando' (R15), 'tren' (existe), 'aliado' (R20.4), 'infiltrado' (R03.5, y se narra
       como que NO tira, que es la gracia).

R23.2  time_gap GANA costsToTeams: [{teamId, places}]           (S-219, S-440)
       → «a quién le cuesta» esta situación, que es lo que R04 ya calcula y hoy no se narra.
       Y con eso, «en cualquier punto del diario se puede leer quién va delante, con cuánta
       ventaja, sobre quién y cuánto queda» (SPEC 6.15) deja de depender de la suerte.

R23.3  peloton_split GANA cause: 'puerto'|'sector'|'viento'|'caza'|'caida'       (S-441)
       Es el agujero del Cambio 5 (§16) y la deuda §14.33. La cobertura de la criba lejana
       (58 % contra 75 % pedido) sube sola en cuanto la causa existe.

R23.4  EL TOPE DE TRES PROTAGONISTAS                                             (S-439)
       se sustituye por: hasta tres NOMBRES + conteo + equipos —«y otros seis, cuatro de ellos
       del equipo X»—. Cuando tiran diez o atacan seis, el parte los cuenta a todos.
       Efecto medido y esperado: `ataqueSinCerrar` puede BAJAR DE 2 A 0, que es exactamente lo
       que su comentario decía que hacía falta («bajarlo a cero exige que la salida y el
       desenlace nombren a la misma gente»).

R23.5  EL INFORME DEJA DE RE-SIMULAR                             (S-418, CONTRARIO)
       lee los eventos congelados. Hoy vuelve a simular la etapa con el motor de HOY, así que un
       informe de hace tres versiones cuenta una carrera que no ocurrió.

R23.6  EL INFORME CRUZA ORDEN CON HECHO                                          (S-417)
       «esto se decidió aquí y tú habías dicho esto otro», y POR QUÉ no se pudo cumplir:
       «tu cita era el km 80; a esa altura tu grupo estaba cerrando un intento y tu apetito era
       0,04». Es donde el jugador aprende, y hoy no existe.

R23.7  EL CORREDOR PROPIO SIEMPRE APARECE NOMBRADO EN SU RADIO                   (S-419)
       aunque no sea noticia. Es una línea y cierra una fila.

R23.8  LA ESTRUCTURA SE EXPLICA                                                  (S-056)
       la crónica dice quién es la carta de cada equipo hoy y para quién trabaja cada uno, y
       AVISA cuando el plan cambia (`card_changed`, R21).
```

**Cierra.** S-056, S-218, S-219, S-221, S-416, S-417, S-418, S-419, S-420, S-434, S-439, S-440,
S-441, S-449.

**Cómo se mide.** El banco de coherencia ya existe y mide 12 contradicciones con tolerancia cero. Se
añaden tres: `motivoSinDestinatario` (un `pullFor` que nombra a alguien que no está en el grupo: ya
corregido en v59, aquí **se sella**), `cribaSinCausa` (banda **0**) y `frenteSinSubasta` (un
`peloton_pull` sin dueño ni reparto declarado, banda **0**). `ataqueSinCerrar` **baja de 2 a 0**.
`teamPullWithReasonPct` se conserva en **95-100 %**: es «la alarma de que alguien ha dejado tirar a
un equipo sin razón, el desgastarse a lo wey que esto viene a impedir».

Invariante nuevo (**64**): «toda criba narrada dice qué la produjo» (0 sin causa).

---

### R24 · Directores bot falibles (11 situaciones)

Contiene **tres de las veinte más graves** (S-458, S-478, S-488). Es la capa que hace posibles G9 y
S-014 **sin tocar la física**: mismos vatios, distinto número en la pizarra.

Y es el paso **más peligroso del plan**, porque desafina todas las cazas. Por eso lleva, obligatorio,
un **brazo de control apagable por constantes** que lo hace reversible y atribuible (§7.4).

```ts
type Belief = { gapS: number; size: number; atKm: number; sure: number }
```

```
R24.1  CALIDAD DE DIRECCIÓN                                              (S-009, S-014)
       dirQuality(t) ∈ [0,1]: base por división { WT 0,85 · PRS 0,65 · CON 0,50 }
       ± un dado por CARRERA de sd dirQualitySd (0,10). Determinista por semilla de carrera.
       → «los equipos malos ven peor y deciden más tarde; LA FÍSICA ES LA MISMA PARA TODOS».
       Y el director bot elige estructuras «razonables, nunca óptimas» (S-009), que es la misma
       doctrina que `diseno-entrenamiento.md` aplica al entrenador bot.

R24.2  EL NÚMERO DE LA PIZARRA                                                   (S-458)
       infoLagKm(t)  = dirLagBase (0,8) + dirLagQuality (1,2)·(1 − dirQuality)
       boardRound(t) = 5 s si dirQuality ≥ 0,8 · 10 s si ≥ 0,6 · 15 s si no
       believe(t, move) = redondear(gapReal(km − infoLagKm), boardRound) + N(0, boardSd(t))
       boardSd(t) = dirSdBase (6 s) + boardErrorSlope (18)·(1 − dirQuality)
       → se empieza a cazar tarde, se afloja pronto, y «de vez en cuando la caza no llega por
         treinta segundos que nadie tenía apuntados».

R24.3  EL NÚMERO SE ADMINISTRA                                    (S-458, la segunda mitad)
       El director ELIGE qué decir: lo infla para que su gente tire, lo recorta para que no se
       rindan, se lo calla al que va justo de moral:
             spin(t, r) = boardSpin (0,08) · sign(intent)   # +8 % si 'perseguir', −8 % si 'nada'
       Así DOS CORREDORES DEL MISMO GRUPO actúan sobre cifras distintas, y la mentira se paga
       cuando se descubre (el que tiró sobre un número inflado pierde `trust` en su director:
       `dirTrust` baja y a la etapa siguiente responde peor).
       Con esta mitad, S-014 deja de ser una constante por equipo y MUERDE CORREDOR A CORREDOR.

R24.4  LA NOTICIA DEL SUCESO                                                     (S-478)
       newsLagKm(t) = newsLagBase (1,2) + 1,5·(1 − dirQuality)
       P(newsWrong)  = newsWrongProb (0,25)·(1 − dirQuality)·2
       → tregua, rescate y emboscada se deciden sobre información equivocada (R12.1).

R24.5  LO QUE SE VE DEL RIVAL                                                    (S-488)
       readState(obs, tgt) = clamp(trueFraction(tgt)
                                   + N(0, signalSd(TAC_obs) · (1 + hideGain (0,12)·disguise(tgt)))
                                   , 0, 1)
       signalSd(tac)  = 0,28 − 0,0022·tac         # TAC 90 → 0,08 ; TAC 40 → 0,19
       disguise(tgt)  = clamp(reserveFraction(tgt), 0, 1)
                        · (1 − climbKmAcumulados / disguiseFadeKm (12))
                        · [duty 'carta' ∧ TAC ≥ 70]

       EL DISIMULO ES RUIDO, NO SESGO, Y ES AGOTABLE. Las dos cosas son correcciones, y las dos
       tienen consecuencia medible:
         (a) La versión anterior sumaba **+0,35·disguise** al valor leído, con `disguise` binario.
             Sobre un umbral `bloodThreshold` de 0,45 (R13.1), eso exige `trueFraction ≤ 0,10` para
             disparar: **cualquier carta con TAC ≥ 70 y un segundo de reserva quedaba prácticamente
             invisible**, o sea que R13.1 —el CONTRARIO nº 9, «el día que el favorito se rompe»— se
             apagaba justo sobre la clase de corredor a la que apunta. Un sesgo de un solo signo
             produce falsos NEGATIVOS; el banco `informacion` pide `falsosPositivosDeSangrePct`
             15-40 %, que es lo contrario. Aplicado como **ensanchamiento del ruido** (× 1,12 sobre
             `signalSd`), el disimulo hace la lectura menos fiable **en los dos sentidos**: se ve
             sangre donde no la hay y se deja de ver donde sí.
         (b) `disguise` **decae**: con la reserva y con los kilómetros de puerto acumulados. Nadie
             pone cara de fresco a doce kilómetros de puerto con el depósito vacío. A los
             `disguiseFadeKm` (12) el disimulo vale 0 y el jefe tocado se ve.
       Y EL BANCO SE PARTE EN DOS, porque una sola cifra no puede vigilar dos errores de signo
       contrario: `falsosPositivosDeSangrePct` **15-40 %** y `falsosNegativosDeSangrePct`
       **10-35 %**, las dos con banda y las dos a 0 % en el brazo de control.
                        # el jefe tocado se esconde DELANTE y con cara de fresco
       y `matesLeftSeen` = leales visibles del rival, con el mismo ruido: el equipo al que le
       quedan dos hombres ENSEÑA UNO Y GUARDA EL OTRO.
       → oler la sangre PUEDE FALLAR (R13.1), y el jefe tocado puede esconderse. Es la mitad de
         la carrera que se juega desde el coche, y hoy el pelotón juega con las cartas boca arriba.
       COSTE: se calcula UNA VEZ POR EQUIPO Y POR KM (§2.2), no por corredor y por bloque.

R24.6  EL CAPITÁN DE RUTA                                                        (S-459)
       captain(t, g) = el leal presente de mayor TAC.
       Decide cuando (km − plan.lastOrderKm) > infoLagKm, o en las VENTANAS en que la orden
       físicamente no llega: el puerto donde retienen los coches, la carrera partida en abanicos
       con el coche al otro lado del corte, el tramo sin cobertura, los últimos kilómetros con el
       ruido. Decide: entrar al turno, soltar el frente, esperar a un compañero, cerrar un hueco.
       **Solo con `GroupView`; NUNCA con `RaceView`.** Es lo que le distingue del director.
       Y NEGOCIA hacia fuera: pide la tregua (R12.2), pide la alianza (R20.4), convoca la parada
       colectiva (R13.4). El derecho a hablar sale del palmarés y de los años (TAC ≥ captainMinTac
       75), así que un equipo puede nombrar a uno y NO TENER A NADIE CON VOZ.

R24.7  ÓRDENES MALAS                                                             (S-013)
       con dirQuality < badOrderThreshold (0,55), un dado por etapa
       (badOrderProb = 0,25·(1 − q)) produce UNA de las cuatro que el juego ya sabe enumerar:
             lanzador sin sprinter · sprinter en reina · gregario del hombre equivocado ·
             no nombrar carta teniéndola.
       → «un director bot modesto también escribe órdenes malas». Hoy un bot nunca escribe una
         orden mala, que es la fila.

R24.8  LA EJECUCIÓN TARDA  → R15b.1                                              (S-489)
R24.9  HEREDAR UN EQUIPO BOT SIN QUE SE NOTE                             (S-012, CUBIERTO)
       la política por defecto de un equipo con mánager humano nuevo es EXACTAMENTE la que hoy
       se deriva. Se conserva, y §6.5 lo respeta.
```

**Cierra.** S-009, S-010, S-012, S-013, S-014, S-029, S-458, S-459, S-478, S-488, S-489.

**Constantes nuevas y sus valores de CONTROL.** Esta tabla es la que hace el paso reversible:

| Constante              | Valor real                                       | **Valor de control**  | Clase      |
| ---------------------- | ------------------------------------------------ | --------------------- | ---------- |
| `dirQualityByDivision` | {WT 0,85 · PRS 0,65 · CON 0,50}                  | **todos 1,0**         | [calibrar] |
| `dirQualitySd`         | 0,10                                             | **0**                 | [calibrar] |
| `dirLagBase`           | 0,8 km                                           | **0**                 | [calibrar] |
| `dirLagQuality`        | 1,2                                              | **0**                 | [calibrar] |
| `dirSdBase`            | 6 s                                              | **0**                 | [calibrar] |
| `boardErrorSlope`      | 18                                               | **0**                 | [calibrar] |
| `boardSpin`            | 0,08                                             | **0**                 | [calibrar] |
| `newsLagBase`          | 1,2 km                                           | **0**                 | [calibrar] |
| `newsWrongProb`        | 0,25                                             | **0**                 | [calibrar] |
| `hideGain`             | 0,12 (ensancha `signalSd`, no desplaza el valor) | **0**                 | [calibrar] |
| `disguiseFadeKm`       | 12                                               | —                     | [calibrar] |
| `signalSd(tac)`        | 0,28 − 0,0022·tac                                | **0**                 | [calibrar] |
| `badOrderThreshold`    | 0,55                                             | **0** (nunca dispara) | [calibrar] |
| `captainMinTac`        | 75                                               | —                     | [calibrar] |

**LA REGLA DURA, y es el invariante 47 —el único que lleva ese número—:** con `dirLagBase = 0`,
`boardErrorSlope = 0`,
`boardSpin = 0`, `newsLagBase = 0`, `signalSd = 0` y `dirQuality = 1`, **el motor reproduce el paso
anterior BLOQUE A BLOQUE**. Es la prueba de que R24 es una **capa separable** y no un cambio de
conducta encubierto, y es lo que convierte el paso más peligroso del plan en uno **reversible por
constantes y atribuible por número**. Sin esa prueba, es el paso que nadie sabrá diagnosticar.

**Cómo se mide: el banco `informacion`, de DOS BRAZOS.** Es el único banco que corre el mismo
escenario dos veces (§7.4).

| Estadística                                                                                                    | Banda (brazo real) | Banda (brazo de control)   |
| -------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------- |
| `catchLatePct` (cazas que llegan tarde por decisión tardía)                                                    | **8-25 %**         | **0-3 %**                  |
| `catchKmSd` (desviación del km de captura)                                                                     | **≥ 4 km**         | ≈ la de hoy                |
| `diffEquiposBuenosVsMalos` (puestos, WT vs CON con corredores equivalentes)                                    | **3-15**           | **0-2**                    |
| `falsosPositivosDeSangrePct` (se aprieta sobre uno que iba bien)                                               | **15-40 %**        | **0 %**                    |
| `falsosNegativosDeSangrePct` (no se aprieta sobre uno que estaba roto)                                         | **10-35 %**        | **0 %**                    |
| `rescatesSobreInformacionErronea`                                                                              | **5-25 %**         | **0 %**                    |
| **`qualityGradient`** (victorias de un equipo de calidad 0,9 frente a uno de 0,3, con corredores equivalentes) | **1,25-1,80×**     | **1,00-1,05×**             |
| **Reproducción bloque a bloque del paso anterior**                                                             | —                  | **exacta (invariante 47)** |

**El techo de `qualityGradient` es tan importante como el suelo**, y su razón es de diseño y no de
calibración: por debajo de 1,25 el banquillo es decorado y G9 no existe; **por encima de 1,80 el
juego lo decide el mánager y no el ciclista**, lo que choca de frente con «todo jugador es un
CICLISTA».

---

### R25 · El precio de obedecer y de desobedecer (6 situaciones)

**Pieza.** `trust` por corredor-equipo (**ya existe** como `teamTrust` en `callups.ts`, con peso 0,4
en `callupScore`) y `morale` (**ya existe**). Lo que falta es que **algo los mueva**: hoy son una
tabla muerta, y §VI.2 «lo deja en manos del mánager humano, y hoy todos los equipos son bots»
(deuda §14.12).

```
R25.1  trust(r) −= rebelTrustCost (12)  y  morale −= 4   al correr de rebelde SIN permiso
R25.2  trust(r) += dutyTrustGain (3)    al cumplir un trabajo caro:
       kmAlFrente ≥ 40, `helpBack` ejecutado, o lanzamiento con pullWindow ≥ 0,4
       → «cumplir tampoco da nada» (S-414) deja de ser cierto: se paga en convocatorias,
         salario y renovación, aunque cueste puestos.
R25.3  morale += winMoraleGain (8) al ganar; −= failMoraleCost (5) al fallar siendo la carta
       El crecido ATACA MÁS y el hundido se esconde:                            (S-384)
             appetite × (1 + moraleAttackGain (0,25)·(morale − 50)/50)
R25.4  LA CARTA BLANCA                                                          (S-024)
       el equipo puede conceder `carta-blanca` por UN día (§2.5). CON permiso, ir por libre NO
       cuesta trust; sin permiso, sí. Es la diferencia entre pedirlo y tomárselo.
R25.5  EL MÁNAGER JUEZ Y PARTE                                                  (S-027)
       nombrarse jefe de filas baja el trust de TODOS los demás leales trustAbuseCost (2)/día,
       y el trust bajo mueve la salida en el mercado: los humanos de ese equipo se van.
       Sale caro POR DENTRO DEL JUEGO, no por una regla que lo prohíba.
R25.6  EL RECONOCIMIENTO DEL RECORRIDO                                          (S-429)
       knowsRoad(r, tramo) NO es un binario de equipo: es un saber POR HOMBRE Y POR TROZO.
       Se tiene gratis por nacionalidad (corre en su tierra) o por ediciones corridas; el que
       reconoció en seco NO reconoció la carretera mojada; y lo reconocido CADUCA (firme nuevo,
       rotonda que no estaba): `recceAgeDecay` (0,8/año).
       Efecto: +recceTac (4) de TAC efectivo en ESE tramo. Es la diferencia entre el local y el
       extranjero del mismo pelotón, y la que un director usa al elegir quién lleva al jefe.
```

**Cierra.** S-011, S-027, S-384, S-393, S-414, S-429.

**Constantes nuevas.** `rebelTrustCost` **12** [calibrar] · `dutyTrustGain` **3** [calibrar] ·
`winMoraleGain` **8** [calibrar] · `failMoraleCost` **5** [calibrar] · `moraleAttackGain` **0,25**
[calibrar] · `trustAbuseCost` **2** [calibrar] · `recceTac` **4** [calibrar] · `recceAgeDecay`
**0,8/año** [calibrar].

**Cómo se mide, y el banco NO puede ser `world`.** `world.ts` **no simula etapas** —`mapa-bancos.md`
§4.4 y §8: «la carga de un día de carrera es representativa por terreno… aquí no gana nadie»—, y
**todos** los disparadores de `trust` que R25.2 define son sucesos de DENTRO de la etapa: kmAlFrente
≥ 40, `helpBack` ejecutado, lanzamiento con `pullWindow` ≥ 0,4. Un banco que no corre etapas no puede
producir la entrada de la pieza, así que medirla ahí habría dado un cero limpio y falso.

| Estadística               | Qué cuenta                                               | Banco                                                                                     | Banda                                                    |
| ------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `trustSpreadEndSeason`    | desviación de `teamTrust` tras una temporada de carreras | **`smallRaces` encadenado** (8 carreras × 4 etapas, con memoria entre días) + `grandTour` | **≥ 12 puntos** (si no se separa, la pieza no hace nada) |
| `rebelCallupDropPct`      | caída de convocatorias de un rebelde reincidente         | **`world`**, que es donde la convocatoria vive                                            | **20-60 %**                                              |
| `dutyTrustEventsPerStage` | trabajos caros pagados con `trust` por etapa             | `smallRaces`                                                                              | **1-6**                                                  |

**Y el coste ya no son 12 s.** Los 12 s eran los de `world`; el brazo de `trust` pasa a colgarse de
`smallRaces`, que ya corre en el paso 0 y cuyo coste hay que MEDIR (§7.7). El sobrecoste marginal de
llevar la cuenta de `trust` sobre corridas que ya existen es ≈ 0; lo que desaparece es la línea de
12 s que este documento se apuntaba como si midiera algo.

---

### R26 · El grupeto y el corte (14 situaciones)

**La apuesta que falta debajo de todo el racimo**: mientras el corte **readmita siempre y a todos**,
el tamaño del grupeto **no es un activo** y el racimo entero se organiza por inercia en vez de por
miedo (S-494, S-464).

```
R26.1  LA READMISIÓN MIRA EL NÚMERO                                    (S-494, S-464)
       llegados = los que entran fuera de control
       si |llegados| ≥ readmitBlockRiders (20):
             readmisión EN BLOQUE con penalización (pierden los PUNTOS del día, no la general)
       si no: fuera, salvo el tope del 4 % que ya existe.
       → por primera vez el grupeto TIENE ALGO QUE PERDER, y por eso se organiza. Es la causa que
         les falta a S-310, S-359, S-365, S-371 y S-412: sin ella el grupeto se organiza por
         inercia, cuando en carretera se organiza POR MIEDO, y el miedo es proporcional a lo poco
         que sois. Es también lo que hace que se espere al rezagado y se pelee por engancharse
         antes que por ir más rápido.       **[DECISIÓN DEL DUEÑO 8]**

R26.2  EL GRUPETO ES UN GRUPO CON CAPO                            (S-310, S-311, S-365)
       capo = el de mayor TAC entre los que llevan equipo dentro.
       EL CORTE NO EXISTE HASTA QUE ALGUIEN GANA: el grupeto trabaja con una ESTIMACIÓN
             cutEstimate = tiempoGanadorEstimado · timeCutFraction(desnivel) ± N(0, cutSd 0,02)
             targetLossS = cutEstimate · grupetoSafety (0,85)
       y esa estimación se la da el director por radio (R24: llega tarde y con error).
       compromiso se elige para que la pérdida prevista ≈ targetLossS: APRIETA SI VA JUSTO,
       PASEA SI VA HOLGADO, acelera al final y suelta al que no puede.
       ESPERA POR IDENTIDAD (S-311): a un sprinter con equipo dentro, a un compañero; y por
       NÚMERO (R26.1), no solo por tamaño abstracto.

R26.3  EL GRUPETO VOLUNTARIO                                (S-139, S-135, ambos CONTRARIO)
       `giveUpLambda` devuelve 0 hoy si el rol es lider|sprinter|cazaetapas, si la mentalidad es
       supercombativo o si va en el grupo de cabeza; y la regla 8 solo actúa en los últimos 25 km.
       Cambia:
             sprinter en etapa con climbShare ≥ 0,25 **Y CUYO FINAL NO ADMITE LLEGADA AGRUPADA**:
                   λ ALTA desde el pie del PRIMER puerto
                   (`grupetoOptOutKm` = km del primer puerto, en vez de `giveUpKm` 25)
                   y CON SUS GREGARIOS (S-184): forman el autobús juntos

             LA PUERTA `admitsBunchFinish` ES OBLIGATORIA, y la versión anterior no la tenía. Sin
             ella la regla manda al sprinter al grupeto desde el pie del primer puerto en CUALQUIER
             etapa con un cuarto de subida, y eso es exactamente lo contrario de lo que pide la
             media montaña con final llano —S-244, CONTRARIO con cita (EQUIPO-13): «en las cotas el
             equipo del sprinter NO tira; dos o tres gregarios se quedan con él si se descuelga y
             le traen en el descenso y el llano; el pelotón de rivales intenta lo contrario: tirar
             en la cota para reventar al sprinter»—. S-244 no se nombraba en todo el documento.

             ASÍ QUE HAY DOS RAMAS, no una:
             (a) final que NO admite llegada agrupada (alto, muro, puncheur duro):
                   grupeto voluntario, como arriba.
             (b) final que SÍ la admite (media montaña con final llano, S-244):
                   el sprinter **NO opta al grupeto**. Su equipo NO tira en la cota
                   (`frontClaim` × 0, motivo 'nada' mientras `onClimb`) y baja
                   `approachHelpers` (3) gregarios a traerle —el rescate escalonado de R12.4 con
                   `duty 'carta' de etapa` y la puerta de percance levantada, porque aquí no hay
                   percance: hay una cota—.
                   Y LOS RIVALES HACEN LO CONTRARIO: los equipos con carta de puncheur o de
                   general ganan el intent **'reventar'** en esa cota —`frontClaim` alto y
                   compromiso ≥ `burnSprinterCommit` (0,88) mientras dure—, que es la otra mitad
                   literal de la fila.
             BANDAS, ya escritas en EQUIPO-13: `sprinterTeamOnClimbPct` = etapas `media` con un
             equipo de sprinter al frente durante una cota, **≤ 15 %**; `sprinterBroughtBackPct` =
             sprinters descolgados que vuelven con ≥ 2 compañeros, **30-60 %**.
             lider con gcDeficit > gcOutOfRaceS (900): λ alta — ya no juega nada       (S-135)
             el que SIGUE siendo carta: λ = 0, como hoy
       → «el velocista se descuelga ANTES DE QUE DUELA, con sus gregarios, forma el autobús y
         corre contra el corte, no contra la etapa». Y el hombre de la general que ya no juega
         nada se deja ir pronto y a propósito, para ahorrar o para servir a otro.

R26.4  LA CUENTA QUE VIENE DE AYER                                               (S-412)
       `marginFromYesterday` entra en `RaceMemory`: el grupeto se organiza sabiendo el margen que
       arrastra de los días anteriores, y aprieta si lo gastó.

R26.5  EL GRUPETO QUE YA NO ES LA CARRERA SÍ SE CRIBA           (S-443, deuda §14.2)
       `shatter` se aplica a TODOS los `shed`, no solo al que lleva el título de `mainId`.
       Hoy el tercer grupo a diez minutos sube el puerto sin perder a nadie, y en carretera sí
       los pierde.
       ESTO SUBE LA COLA DE LAS REINAS POR ENCIMA DEL 14 %, y esa banda tiene ancla en §VI.3:
       es **[DECISIÓN DEL DUEÑO 6]** y no una propuesta.

R26.6  EL DESCOLGADO SOLO DETRÁS                                                 (S-123)
       la decisión de dejarse ir se mide contra el CORTE DE LA ETAPA QUE QUEDA POR DELANTE, no
       contra el tiempo ya corrido: hoy «casi nunca ata» y en etapas largas es inerte (deuda
       §14.15). Pelea y vuelve la mitad de las veces si el pelotón va a tempo y está cerca; con
       el pelotón apretando no vuelve nunca.
       Atarlo al corte se probó en v16 y no movió nada donde importa: **ahora sí mueve**, porque
       con R26.1 el corte por fin significa algo.

R26.7  EL CORTE DE LA CRONO                                                      (S-375)
       hoy es «una salvaguarda dormida» porque `simulateTimeTrial` devuelve `incidents: []`.
       Se cierra con R11.6, no aquí. Y solo se lleva al que ha tenido un percance, que es la fila.
```

**Cierra.** S-123, S-135, S-139, S-184, S-216, S-310, S-311, S-359, S-365, S-371, S-375, S-412,
S-443, S-464, S-494. **Más S-244** (R26.3, rama b), que este documento no nombraba y cuya conducta
contradecía.

**Y una deuda que este racimo NO cierra, y que hay que nombrar porque es la más pesada de la lista
abierta.** `mapa-requisitos-duenio.md` §14.1, primer punto por peso: **«los que pierden en montaña 5
minutos luego se reintegran demasiado fácil»** (v58 §6), y sobre ella: «queda abierto… La puerta no
era la causa, así que sigue sin resolverse; lo que se sabe ahora es dónde NO está» (estrechar
`rejoinGapSeconds` está REFUTADO: rompe el pavé, PAV 69 → 67). Este documento no la nombraba ni una
vez, y **dos de sus reglas empujan en la dirección contraria**: R26.5 (cribar todos los `shed`,
que devuelve gente a grupos de detrás) y R14.1 (el abanico se cierra y «los cortados PUEDEN volver»).
No se cierra en esta tanda —no hay hipótesis con la que atacarla, y meterla sin hipótesis es repisar
terreno refutado—, pero **se mide para no empeorarla a ciegas**: `rejoinAfterBigLossPct` = fracción
de descolgados a > 3 min que acaban en el grupo principal, medida en el **paso 0** y otra vez en el
**paso 12**, publicada **sin banda** las dos veces. Si sube, la tanda lo sabrá; hoy no lo sabría.

**Constantes nuevas.** `readmitBlockRiders` **20** [calibrar] · `grupetoSafety` **0,85** [calibrar] ·
`cutSd` **0,02** [calibrar] · `grupetoOptOutKm` (derivada: el km del primer puerto) ·
`gcOutOfRaceS` **900** **[calibrar]** contra `grandTour` (la versión anterior lo derivaba de
`gcLeashMaxS` 900, que a su vez se derivaba de una alarma de peor caso: una derivada colgando de otra
derivada colgando de un número que significa otra cosa) · `burnSprinterCommit` **0,88** DERIVADA de
`gear.finalDrive` **0,85**, subido —**y no de `approachCommit`**, aunque coincidan en el número:
`approachCommit` nace en este mismo documento (R15b.2) y el Apéndice B declara que derivar una
constante nueva de otra constante nueva no es un ancla, es una convención con disfraz. Las dos
cuelgan del mismo sitio real, que es `gear.finalDrive`.

**Cómo se mide.** `sprinterTeamOnClimbPct` **≤ 15 %** y `sprinterBroughtBackPct` **30-60 %**
(S-244, banco `smallTours` + media-190). `rejoinAfterBigLossPct` = descolgados a > 3 min que vuelven
al grupo principal; **sin banda**, publicada en los pasos 0 y 12 (§14.1 del mapa).
`grupetoMarginS` = margen con que el grupeto entra en el corte; banda **60-420 s**
(hoy no se mide, y si es siempre enorme no hay tensión ninguna). `outOfTimePct` **1-15 %** (existe).
`voluntaryGrupetoPct` = sprinters que se descuelgan antes de que duela en etapas de montaña; banda
**50-90 %**. `busSizeAtCutoff` = tamaño del grupeto cuando entra; banda **8-45** [calibrar]: es lo
que hace que el miedo tenga escala. Banco: `grandTour` y `realQueens`.

---

### R27 · La crono como modo de carrera (14 situaciones)

9 de 14 filas `AUSENTE`. **Pieza.** Un modo contrarreloj de verdad **montado ENCIMA** de
`timetrial.ts`, que no se toca: la ley de la crono, el compuesto CRI, el pacing y la rampa de
`startOrder.ts` se quedan como están, y sus dos bandas mejor ancladas (`tailPct` 8-15,
`worstStagePct` 0-17) **no se mueven**.

```
R27.1  DOSIFICACIÓN ORDENABLE                            (S-143, S-125 CONTRARIO, S-382)
       ttPacing ∈ {'a_tope','progresivo','conservador'}, orden del jugador o del director:
             a_tope      → −ttAllOutS (12 s) esperados, × ttBlowUpGain (2,2) de P(hundimiento
                           en el último tercio)
             conservador → +ttSaveS (10 s), sin riesgo, y GUARDA DEPÓSITO para mañana
       El gregario sin nada que jugarse corre al ttDomestiqueShare (0,70) DENTRO DEL CORTE, y eso
       le deja depósito para el día siguiente: es la fila literal de S-125.
       Y el que va a perder tres minutos no se vacía (S-382): el director le pone 'conservador'.

R27.2  LAS REFERENCIAS DEL RIVAL                                (S-332, S-039, S-036)
       el maillot corre con los parciales del 2.º: si va perdiendo > ttPanicSplitS (8 s) en un
       parcial, sube el riesgo (y con él P(hundimiento)); si va ganando, lo baja y no arriesga en
       las curvas.
       ORDEN DE SALIDA: ya existe (`startOrder.ts`) y AHORA IMPLICA algo. Y los intervalos NO son
       iguales (S-036): los últimos de la general salen cada 2-3 minutos y los demás cada minuto,
       que es el escalón por el que S-039 y S-462 muerden en la general y no en todo el pelotón.
       EL ALCANCE es un castigo ASIMÉTRICO: el alcanzado no puede coger la rueda, hay distancia
       mínima y el comisario la vigila, así que se hunde (ttCaughtPenaltyS 15 s); el que alcanza
       no gana nada salvo la referencia.
       El que sale pronto DOSIFICA PARA MAÑANA y el que sale último corre con los parciales del
       rival en el oído (S-039).

R27.3  PERCANCES Y CAMBIO DE BICI                        (S-127, S-202, S-375, S-436)
       → R11.6 (el dado), más el cambio de bici PLANEADO de la crono mixta:
             el equipo decide ANTES el punto del cambio: cuesta ttBikeSwapS (18 s) y gana
             ttBikeGainPerKm (0,35 s/km) en el terreno adecuado.
             A veces la decisión correcta es NO cambiar, y por eso es una decisión.

R27.4  MARCAR TIEMPO PARA EL JEFE                                                (S-021)
       un leal sale antes con la orden de marcar tiempo: su parcial se le comunica al jefe y le
       da ttPacerGainS (5 s) por referencia. Es «con lo que eso implica», la fila literal.

R27.5  LA LOTERÍA DEL HORARIO                                                    (S-462)
       `WeatherPlan` por FRANJA (R14.6): los últimos —los favoritos, por el orden inverso— pueden
       coger lluvia o viento. Efecto medio ttWeatherSpreadS (±20 s) por franja.
       Y el equipo lo sabe: adelanta calentamiento, cambia material, o asume que hoy la general
       la reparte el cielo.

R27.6  LA CRONO DE UN DÍA SE SIEMBRA POR RANKING                                 (S-072)
       el prólogo de una vuelta sí se sale por dorsal acabando con el 1 (ya ocurre). Lo que sigue
       abierto es la crono de un DÍA, que tendría que sembrarse por ranking —saliendo el último
       el más fuerte— y hoy se siembra por dorsal (deuda §14.17). Se cierra aquí.

R27.7  CRONOESCALADA                                            (S-126, S-263, CUBIERTO/PARCIAL)
       manda MON, el pacing pesa el doble, la única táctica es el reparto de ritmo por tramos.
       Se conserva. Y el líder cronista en la única etapa de montaña no responde: sube a su ritmo
       constante y limita pérdidas (S-263), que sale de R13.1 + R18.8 sin regla propia.

R27.8  CRE — FUERA DE ALCANCE                                                    (S-163)
       Es un FORMATO de carrera entero, no un momento de la etapa: el tiempo lo da el 4.º hombre,
       se rueda a su ritmo, los débiles tiran corto y se dejan caer, y el jefe va protegido.
       Queda ANOTADA, no cerrada.  **[DECISIÓN DEL DUEÑO 11]**
```

**Cierra.** S-021, S-036, S-039, S-072, S-125, S-126, S-127, S-143, S-263, S-332, S-382, S-436,
S-462. **S-163 queda anotada, no cerrada**, y así se dice en el recuento.

**Constantes nuevas.** `ttAllOutS` **12** [calibrar] · `ttSaveS` **10** [calibrar] ·
`ttBlowUpGain` **2,2** [calibrar] · `ttDomestiqueShare` **0,70** [calibrar] · `ttPanicSplitS` **8**
[calibrar] · `ttCaughtPenaltyS` **15** [calibrar] · `ttBikeSwapS` **18** DERIVADA de la fila (S-436:
«15-25 s») · `ttBikeGainPerKm` **0,35** [calibrar] · `ttPacerGainS` **5** [calibrar] ·
`ttWeatherSpreadS` **20** [calibrar] · `ttIntervalS` **{60 · 120 · 180}** DERIVADA de la fila (S-036).

**Cómo se mide.** `ttPacingSpreadS` = diferencia de tiempo entre `a_tope` y `conservador` para el
mismo hombre; banda **15-35 s** (si es menos, la palanca no vale nada, que es la queja literal del
dueño sobre las órdenes; si es más, la orden decide más que las piernas). `ttBlowUpPct` =
hundimientos en el último tercio con `a_tope`; banda **10-30 %**. `ttIncidentPct` **1-4 %** (R11).
**Se conservan** `tailPct` 8-15, `worstStagePct` 0-17 y `specialistWinPct` 90-100. Banco:
`timeTrials` (5 cronos reales) + `cri-40`, **más una variante de `cri-40` con equipos y general**,
que hoy no existe y sin la cual R27.2 no se puede medir.

---

### R28 · El formato de la carrera como contexto (30 situaciones)

Es el racimo **más grande** y dos de sus filas son **bloqueantes de todo lo demás en montaña**: por
eso abren el plan (§8, paso 1).

```
R28.1  EL PERFIL TIENE QUE SER LA CARRETERA          (S-451, CONTRARIO nº 2 de las 20 más graves)
       (a) `profileGen.normalize()` DEJA DE ESTIRAR el último segmento, que es lo que convierte
           en final en alto lo que no lo es (Race Aulne).
       (b) El terreno DEJA DE SER UNA ETIQUETA ÚNICA POR CARRERA: Milano-Sanremo es `hilly` de
           principio a fin, y no lo es. Pasa a ser por SEGMENTO.
       (c) El segmento se tipa por pendiente **Y POR CONTEXTO**: una rampa dentro de un descenso
           no es una subida.
       (d) Las reinas generadas alcanzan 3.500-5.000 m como la carretera. Hoy: **0 de 157 pasan
           de 4.000 m, con mediana 2.023 m**.
           **Y la COLA BAJA SE CONSERVA, que es la mitad que faltaba escribir.** Lo que se corrige
           es el TECHO de la distribución, no la distribución entera: el calendario real tiene
           reinas de 1.200 m y el banco las necesita. `calendarQueens.test.ts` lo afirma en tres
           líneas duras (l. 60, 62, 64) que este documento no miraba: `facil.races > 0` (la banda
           <1.500 m no se queda vacía), `stats.dPlus.min < 1500`, y `facil.wonFromMovePct >
           dura.wonFromMovePct + 10` (en la montaña blanda la fuga llega y en la dura no; si todas
           las reinas se vuelven duras, la afirmación pierde su lado fácil y el banco deja de
           decir nada). Y hay un efecto de arrastre: `targets.ts` documenta el reparto de hoy
           —«43,8 % <1.500 m, 1,6 % >2.500»—, así que desplazar la masa hacia arriba **arrastra
           `calendarQueens.breakawayWinPct` hacia el 1,6 %**, muy por debajo del suelo 6 de una
           banda que §9.1 declara CONTROL. Por eso las cuatro cosas —las tres aserciones y la
           banda— son criterio de «hecho» del paso 1, y por eso `queenDplusRange` es un TECHO
           alcanzable y no un desplazamiento en bloque.
       (e) Las seis carreras del encargo sin fuente con dato mínimo (Bruges, Copenhague, Bretaña,
           Polonia, Benelux, y Montréal con dato incompleto) o se cargan con dato, o se declaran
           generadas y se marcan como tales en el inventario. **No pueden seguir corriendo con
           perfil generado sin que nadie lo sepa.**   (§14 puntos 25 y 27)
       Y el perfil gana los datos que los demás racimos necesitan y hoy no existen:
             pancartas de verdad (R06), `feedZones` (R13.4), `neutralKm` (R19.1),
             `roadClass` y `roadWidth` (R15, R20.7), `giros` en los últimos 1.500 m (R15a.4),
             sectores de tierra (R15a.6), altitud por cima (R28.7).

R28.2  DÓNDE CAE LA ÚLTIMA CIMA                                  (S-486, CONTRARIO nº 3)
       El generador DECIDE el tipo de final de una reina en vez de dejarlo al azar:
             finalKind ∈ { alto (0 km) · cima_cerca (≤ 5 km) · valle_corto (5-20) · valle_largo (>20) }
             reparto queenFinalMix { 0,45 · 0,20 · 0,25 · 0,10 }
       → hoy las CINCO reinas de Race Alps dejan 22, 1, 31, 50 y 19 km tras la última cota. Y aquí
         hay que bajar el tono, porque este documento afirmaba «el motor tiene MEDIDO que por
         encima de 5 km una etapa deja de comportarse como final en alto (v42 §3)», y la bitácora
         dice literalmente lo contrario: `mapa-requisitos-duenio.md` §3, fila v42 §3 / v43 §11
         está marcada **«Sin medir. Hipótesis: las cinco dejan 22/1/31/50/19 km tras la última
         cota… "No está demostrado que sea la causa"»**, estado ABIERTO, y §14.6 lo repite («no lo
         he medido»).
         O SEA: la correlación entre «km tras la última cota» y «el escalador desaparece del
         resultado» es una **HIPÓTESIS**, no un hecho medido. El hecho medido es el síntoma: «un
         escalador de 95 gana 1 de 5 etapas de montaña y no es favorito en las otras cuatro».
         POR ESO EL PASO 0 LLEVA LA MEDIDA QUE FALTA, y va antes de fijar `queenFinalMix`:
               `climberWinRateByLastClimbKm` = win-rate del escalador (MON ≥ p85) contra los km
               tras la última cota, sobre `allCalendarQueens()` —las ~157, coste ≈ 0 porque es
               geometría del perfil cruzada con resultados que ya existen—.
         Si la correlación aparece, `queenFinalMix` está justificado y el paso 1 va entero. **Si NO
         aparece, `queenFinalMix` no se justifica** y el paso 1 se reduce a `normalize()` y al
         desnivel, que son las dos partes que no dependen de esta hipótesis. Y el Apéndice A baja
         S-486 de «nº 3 de las veinte más graves» a «hipótesis con síntoma medido», que es lo que
         es.
       Frontera con S-451, escrita: aquí el perfil no se deforma ni se lee mal, se DISPONE de modo
       que la parte selectiva acaba antes de la línea.

R28.3  RaceShape, LEÍDO POR TODO LO DEMÁS
       días, terreno restante, crono restante, finales masivos previstos. Lo leen: la convocatoria
       (§5.2), `RacePlan` (R10), las fases (R19.8), la última etapa (S-075, S-270), la etapa 1
       (S-388, S-074), el circuito (S-227), la semietapa (S-431) y el colchón (R04.2).

R28.4  LA ÚLTIMA ETAPA                                                   (S-075, S-270)
       general DECIDIDA: paseo hasta el circuito (compromiso ≤ 0,45), sin fugas serias ni ataques
             de general durante ~80 km, y el sprint del circuito DE VERDAD.
       última etapa DECISIVA (final en alto o crono final): todo o nada — se ataca desde el
             PENÚLTIMO puerto, los equipos se funden enteros y el maillot no deja ir nada.

R28.5  ETAPA 1 Y CARRERA DE UN DÍA                               (S-074, S-388, S-158, S-007)
       `hasGcContext` falso hoy apaga los tres frenos del maillot **justo el día 1**, y la cuerda
       es la más larga de la carrera. Cambia:
             en etapa 1 de una VUELTA, hasGcContext = true con todos a 0, y el «líder virtual»
             se calcula sobre el boquete: nadie deja marchar una fuga que se vestiría el primer
             maillot con minutos. Y los favoritos se cuidan y no se dejan cortar (S-388).
       En carrera de UN DÍA: no hay general, no hay control por maillot, el equipo solo persigue
             por la etapa (S-007, CUBIERTO); los siete se vacían por la carta, nadie guarda para
             mañana (matchPlan = todo hoy) y el descolgado ABANDONA en vez de entrar en el corte.

R28.6  LOS FORMATOS QUE NO EXISTEN                       (S-485, S-431, S-470, S-227, S-223, S-438)
       CAMPEONATO NACIONAL (S-485): son **532 de las 1.418 etapas del calendario**, convocadas de
             una en una y sin escuadras (`calendarRun.ts`: «Campeonato nacional: sin equipos»,
             `NATIONAL_FIELD_CAP` 40). No es una clásica pequeña: no hay general, no hay
             invitación ni cupo, hay UN SOLO maillot, y las escuadras son desiguales POR
             NACIMIENTO —el equipo que aporta seis de los diez mejores del país corre como una
             selección y controla la carrera solo, y a su lado hay hombres que están solos de
             verdad—. Los demás se ALÍAN contra ese bloque, no le dan un relevo y marcan
             únicamente su jersey. Y el sub-23 se corre por un contrato.
             Implementación: `nationalBlocs` = agrupación por equipo de origen dentro del campo,
             que alimenta el censo (R01) y la aduana (R03) como si fueran equipos.
       SEMIETAPA (S-431): dos `StageInput` el mismo día, con depósito encadenado (R08.5).
       DOS CARRERAS LA MISMA SEMANA (S-470): la convocatoria de una RESTA de la otra; un cambio
             de última hora en la grande deja a la pequeña sin ningún hombre para el frente.
       CIRCUITO (S-227): la criba se ACUMULA vuelta a vuelta, la fuga se caza en el penúltimo
             paso y el ataque decisivo sale en el último. La carrera arranca «a dos vueltas».
       NEUTRALIZADO Y NEUTRALIZACIÓN (S-073, S-223): `neutralKm` y fase 'neutralizado' (no se
             ataca); y el parón CON REANUDACIÓN es un suceso táctico entero: hay un km 0 nuevo,
             nadie tiene las mismas piernas, la fuga se rehace y el plan se reescribe.
       OBSTÁCULO (S-438): paso a nivel, moto o público, con λ_obstacle (0,0004/km); el jurado
             decide si neutraliza o si el corte cuenta, y el grupo de delante decide si aprieta.

R28.7  ALTITUD                                                                   (S-479)
       por encima de altitudeThresholdM (2.000):
             tacticalCostMultiplier += altitudeGain (0,04)·(m − 2000)/1000·(1 + pesoRelativo)
             # ← §9.1bis, con tope; y es el ÚNICO de los cinco que además edita physics.ts
       → el corpulento y el que no ha hecho altura pierden mucho más que el escalador ligero, así
         que un puerto a 2.500 m criba distinto que uno idéntico a 900 m. El equipo lo cuenta al
         elegir dónde ataca y a quién lleva a la reina.
       AVISO: de los cinco multiplicadores de §9.1bis, éste es el único que **NO es de suma cero
       por grupo** —la altitud encarece a todo el que sube, no redistribuye— y por tanto el único
       que puede mover la economía del depósito. Va en un **PR PROPIO dentro del paso 18** (§8: el
       18 se parte en cuatro), con `ENGINE_VERSION++` propio, con `physics.ts` editado a propósito,
       con el invariante 43 **declarado antes y comprobado después**, y con los invariantes 13-20
       (erosión) re-medidos y su predicción escrita. Es una **excepción declarada a C2** y así
       consta en §9.2: C2 pasa a decir «pasos 18 y 20», no «solo el paso 20».

R28.8  LOS FORMATOS QUE YA SE CORREN BIEN Y SOLO NECESITAN EL DATO
       (S-085 transición · S-117 clásica llana · S-157 Ardenas · S-158 clásica · S-159 vuelta de
       solo llanas · S-164 reina de dos actos · S-225 clásica larga · S-226 avituallamiento ·
       S-228 llana de 3.ª semana · S-287 vuelta corta · S-289 última cota lejos · S-471 etapa
       corta de montaña · S-493 trazado)
       Ninguna necesita regla propia: todas salen de `RaceShape` + fases (R19) + aduana (R03) +
       colchón (R04) en cuanto el perfil es la carretera. Es lo que hace que este racimo, con 30
       filas, quepa en dos pasos y medio.
```

**Cierra.** S-001, S-037, S-073, S-074, S-075, S-085, S-117, S-157, S-158, S-159, S-164, S-223,
S-225, S-226, S-227, S-228, S-270, S-287, S-289, S-388, S-431, S-438, S-451, S-463, S-470, S-471,
S-479, S-485, S-486, S-493.

**Constantes nuevas.** `queenFinalMix` **{0,45 / 0,20 / 0,25 / 0,10}** [calibrar] contra
`calendarQueens` · `queenDplusRange` **{3.500-5.000 m}** DERIVADA de la carretera real ·
`altitudeThresholdM` **2.000** DERIVADA de la fisiología · `altitudeGain` **0,04** [calibrar] ·
`lambdaObstacle` **0,0004/km** [calibrar] · `neutralKm` (dato del perfil, 3-8) ·
`NATIONAL_FIELD_CAP` **40** (ya existe).

**Cómo se mide.**

| Estadística              | Qué cuenta                                                        | Banco                                                     | Banda                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `queenDplusMedian`       | desnivel mediano de las reinas generadas                          | `calendarQueens`                                          | **2.800-4.200 m** (hoy **2.023**)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `queenFinalKindMix`      | reparto de tipos de final de reina                                | **`allCalendarQueens()`** (las ~157, no la muestra de 27) | contra `queenFinalMix` **± 0,08** — y **medido sobre las 157 a propósito**: es GEOMETRÍA DEL PERFIL, no simulación, así que cuesta ≈ 0 correrlo entero. Sobre la muestra sistemática de `analyzeCalendarQueens` (una de cada 6, `PASO = 6` en `calendarQueens.ts:46`, ≈ 27 etapas) el error típico de una proporción de 0,45 es ≈ 0,096, **mayor que la tolerancia entera**, y el propio Apéndice B avisa de que «todo lo más fino que 2-4 puntos porcentuales está dentro del ruido». Una tolerancia por debajo de su propio ruido de muestreo no vigila: sortea. |
| `lastClimbToFinishKm`    | mediana de km tras la última cota en reinas                       | `calendarQueens` + `realQueens`                           | **mediana ≤ 8 km**, **p90 ≤ 25 km**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `climberWinsQueenPct`    | victorias de escaladores (MON ≥ p85) en etapas tipadas de montaña | `calendarQueens`                                          | **55-85 %** (hoy: «un escalador de 95 gana 1 de 5»)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `nationalBlocControlPct` | nacionales en que el bloque mayoritario controla la carrera       | carrera pequeña                                           | **40-80 %** [calibrar]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

**AVISO DE COSTE, y es el que ordena el plan entero.** R28.1 y R28.2 **mueven `realQueens`,
`smallTours`, `calendarQueens` y `grandTour`** —todas las bandas de campo real— y **NO MUEVEN NINGUNA
HUELLA SELLADA**, porque las cuatro huellas viven en escenarios sintéticos construidos a mano. Esa
asimetría es la razón por la que este racimo abre el plan en vez de cerrarlo.

Invariantes nuevos: **65** «las reinas del calendario tienen el desnivel de la carretera»
(2.800-4.200 m) · **66** (de `datos`) «en una etapa tipada de montaña, la última cima está a ≤ 25 km
de meta en el p90».

---

### Cobertura de este diseño sobre el catálogo

**La contabilidad, hecha y cuadrada, porque antes no cuadraba.** Los 28 racimos cubren **445 de las
494 situaciones** (90 %). A eso, este documento añade explícitamente:

- **S-285** y **S-308**, las dos `CONTRARIO` con cita (nº 6 y nº 7 de las veinte más graves) que
  caen fuera de los 28 racimos y que el catálogo no asignó a ninguno. Cerradas en R01.6 / R02.10 y
  en R18.8.
- **S-309** (grupo de favoritos con un solo gregario), que colgaba de S-308 y tampoco tenía racimo.
- **S-123**, **S-200**, **S-280**, **S-291**, **S-309**, **S-336**, **S-347**, **S-352**, **S-368**,
  **S-372**, **S-442**, **S-461**, **S-491**, **S-492** quedan nombradas dentro de su racimo aunque
  el catálogo no las listara ahí, para que el implementador no las pierda.

**La cuenta, sumada.** 445 (racimos) + 3 añadidas fuera de racimo (S-285, S-308, S-309) + 2 de las
14 «nombradas dentro de su racimo» que estaban fuera de racimo (S-123, S-280) + 3 de las 5 «fuera a
propósito» que estaban fuera de racimo (S-448, S-432, S-437) = **453 contabilizadas**.

Y esta revisión escribe **catorce reglas nuevas** para situaciones que no la tenían. **Pero solo
nueve de las catorce suman a la cuenta**, y la distinción importa porque sumarlas todas era contar
dos veces lo mismo —el mismo error que S-467 tenía entre R13 y §4 y que S-248 tenía entre R15 y
R20—. Verificado ID a ID contra las listas `**Situaciones**:` de `catalogo-situaciones.md`:

- **Nueve estaban FUERA de los 28 racimos y sí suman**: **S-292 y S-194** (R05.12, `intent
'aislar'`), **S-266** (R18.4bis), **S-255 y S-312** (la puerta de consolidación de R18.8),
  **S-244** (R26.3 rama b), **S-286 y S-284** (R16.9, el tren de montaña) y **S-129** (R04.5 más el
  invariante 73). Ninguna de las nueve aparece en la lista de situaciones de ningún racimo del
  catálogo, así que no estaban dentro del 445.
- **Cinco YA estaban dentro del 445 y NO suman**: **S-354** (en el racimo de R09), **S-095 y S-087**
  (en el de R03), **S-248** (en el de R15) y **S-048** (en el de R04). Lo que cambia en éstas no es
  la cuenta: es que **figuraban en un «Cierra» sin ninguna regla que las escribiera**, y ahora
  llevan pieza —R09.9, R03.8, R20.2 y §5.3—. Un ID contado como cubierto sin regla detrás es
  exactamente la clase de agujero que esta revisión busca, y taparlo no da un punto de cobertura
  nuevo: quita uno falso.

**453 + 9 = 462 contabilizadas.** El 467 de la versión anterior salía de sumar las catorce.

Quedan las situaciones **que no están ni cubiertas por un racimo ni declaradas fuera**, y sin esta
tabla la afirmación «90 % de cobertura» no es verificable ni el implementador sabe qué NO tiene que
hacer. Van todas, una fila cada una, con su estado y el motivo por el que no llevan regla propia.
**Son 33 filas, y se cuentan en la tabla, no de memoria**: la versión anterior decía «27», que era
494 − 467 con el 467 mal sumado, y la tabla ya tenía 33 filas cuando lo decía. De las 33, **nueve
llevan ya pieza en esta revisión** —S-129, S-194, S-244, S-255, S-266, S-284, S-286, S-292 y
S-312, marcadas «Ahora lleva pieza» en su fila— y son las nueve que suben la cuenta a 462; **una**
(S-207) aparece además en la tabla de «lo que queda fuera a propósito», porque se declara fuera Y se
mide sin banda; y las **veintitrés** restantes siguen sin regla propia a propósito, con el motivo
escrito en su fila. Lo que esta tabla NO hace es cuadrar sola con el 494: entre las 49 que quedan
fuera de los 28 racimos y estas 33 hay filas que el catálogo cuenta en un racimo y nombra también
aquí, y **ese desajuste es del catálogo, no de este documento**; se anota y no se inventa un número
para taparlo.

| Situación                                               | Estado      | Cita | Por qué no lleva regla propia                                                                                                                                                                                                                            |
| ------------------------------------------------------- | ----------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S-038** el intento del km 0                           | `CUBIERTO`  | sí   | La cierra **R19.6** (`flyerKm` 0,8 sustituye a `tacticNoAttackKm` 3) sin nombrarla: «raro y caro en vez de imposible» es literalmente lo que hace bajar el veto a 800 m.                                                                                 |
| **S-077** la ráfaga de intentos                         | `CUBIERTO`  | sí   | Ya ocurre y R19.9 la conserva explícitamente. Se mide con `attemptsPerStage` 10-25.                                                                                                                                                                      |
| **S-093** cazaetapas «a cubrir» en día de sprint        | `PARCIAL`   | sí   | La cierra **R03.4(c)** (cupo 1) + **R20.8** (nunca persigue) + **R09.4**. No necesita regla: es la combinación.                                                                                                                                          |
| **S-107** fuga numerosa de 15-20                        | `PARCIAL`   | sí   | La cierra **R18.6** (cupo del turno por equipos, `perTeamCap`) + **R03.4(c)** con `customsBigBreakRiders` 12. «La fuga de la fuga a 40-60 km» sale de R18.3.                                                                                             |
| **S-129** el maillot tira de su pelotón                 | `CUBIERTO`  | sí   | **Ahora sí lleva pieza**: el invariante **73** (`jerseyOnFrontPct` ≤ 3 %) y la redacción corregida de R04.5. Era el CUBIERTO que este documento estaba a punto de regresar.                                                                              |
| **S-134** el solitario en tierra de nadie               | `PARCIAL`   | sí   | La cierra **R18.4** (`soloCommit` reevaluado) + **R26.6**. Sentarse a esperar al grupo de detrás es `soloCommit` bajo con `kmToGo` alto.                                                                                                                 |
| **S-154** el puerto de tempo lejos de meta              | `PARCIAL`   | sí   | La cierra **R05.12** (`intent 'aislar'`, tempo que no busca romper) + **R16.9** (el tren de montaña). Es la misma conducta con otro motivo.                                                                                                              |
| **S-182** defender el maillot escalando con el colchón  | `PARCIAL`   | sí   | La cierra **R04.2** (`leash(t)`, que ES el colchón) + **R04.4**. El trabajo escala con el colchón porque el colchón ya es una función.                                                                                                                   |
| **S-183** el escalador que trabaja para el sprinter     | `CONTRARIO` | sí   | La cierra **R02.3** (el peón releva, la carta no) + **§5.3** con la corrección de `gcRank ≤ 5` → `leash`: quién es «hombre de general» deja de ser un puesto.                                                                                            |
| **S-194** el 2.º y el 3.º atacan                        | `PARCIAL`   | sí   | **Ahora lleva pieza**: R05.12 (`intent 'aislar'`), que es la mitad que la fila decía que faltaba.                                                                                                                                                        |
| **S-207** reagrupamiento en el descenso                 | `PARCIAL`   | sí   | **No se cierra**: es la deuda §14.1 de `mapa-requisitos-duenio.md` («los que pierden 5 minutos se reintegran demasiado fácil»), refutada por el lado de `rejoinGapSeconds`. Se **mide sin banda** en los pasos 0 y 12 (R26) para no empeorarla a ciegas. |
| **S-233** el pelotón se olvida de la fuga               | `PARCIAL`   | sí   | La cierra **R09.8** (día sin motivo) + **R09.1** (el humor con causa). La mitad que faltaba era el humor, y deja de ser un dado.                                                                                                                         |
| **S-244** el equipo del sprinter en media montaña       | `CONTRARIO` | sí   | **Ahora lleva pieza**: R26.3 rama (b). Era la conducta que este documento invertía.                                                                                                                                                                      |
| **S-245** el equipo del escalador con viento o pavés    | `PARCIAL`   | sí   | La cierra **R15a.3b** (`echelonAttempt`: colocar antes del tramo y castigar al rival cortado es literalmente el intento con autor) + **R15b.2**.                                                                                                         |
| **S-246** hombre peligroso en la fuga en final en alto  | `CONTRARIO` | sí   | La cierra **R04.1b** (`threatOf` incluye `stageObjection`, no solo general) + **R20.1**: por primera vez un equipo puede decidir cazar por la ETAPA antes del último puerto.                                                                             |
| **S-255** los favoritos colaboran por la general        | `CONTRARIO` | sí   | **Ahora lleva pieza**: la puerta de consolidación de R18.8.                                                                                                                                                                                              |
| **S-261** coronar solo con poco                         | `AUSENTE`   | sí   | La cierra **R18.4** (`soloCommit`) + **R15a.7** (el bajador) + **R01.5**. La decisión «seguir si eres bajador-rodador, esperar si tienes compañeros detrás» son esas tres piezas.                                                                        |
| **S-262** clásica de montaña (Lombardía)                | `PARCIAL`   | sí   | La cierra **R18.3** (grupo de 3-6 que se mira) + **R15a.7** (la bajada amplía o borra) + **R17.1** (el final real).                                                                                                                                      |
| **S-266** mano a mano de general                        | `AUSENTE`   | sí   | **Ahora lleva pieza**: R18.4bis, con `tacticInsideAttackMinRiders` 3 → 2.                                                                                                                                                                                |
| **S-268** se corre por PUESTOS, no solo por el maillot  | `AUSENTE`   | —    | La cierra **R04.3** (`defensor(g)` es el mejor colocado PRESENTE, no el maillot) + **R04.1** (`costToMyMan` es por hombre). El 4.º ataca al 3.º porque el coste se calcula por hombre.                                                                   |
| **S-275** dónde se ataca dentro del puerto              | `AUSENTE`   | —    | La cierra **R28.1(c)** (el segmento se tipa por pendiente y contexto) + **R16.9** (la ventana de salvas entre −5 y −2). «Donde la rampa hace daño» exige que el perfil sepa dónde está la rampa, que es el paso 1.                                       |
| **S-276** quién salta y quién no aguanta                | `CUBIERTO`  | sí   | Ya ocurre; R13.6 lo conserva explícitamente.                                                                                                                                                                                                             |
| **S-279** el ataque en el descenso final                | `AUSENTE`   | sí   | La cierra **R15a.7** (`descentSelectKm` = el descenso entero con `kmToGo ≤ 25`, y el bajador con `descenderMin`).                                                                                                                                        |
| **S-284** salvas en el puerto decisivo                  | `PARCIAL`   | sí   | **Ahora lleva pieza**: R16.9 (`salvoLambda`, ventana −5/−2).                                                                                                                                                                                             |
| **S-286** el tren de montaña                            | `PARCIAL`   | sí   | **Ahora lleva pieza**: R16.9 (`Train.kind = 'montana'`, `climbTurnKm`, `lastHelperKm`).                                                                                                                                                                  |
| **S-292** aislar al líder                               | `AUSENTE`   | sí   | **Ahora lleva pieza**: R05.12, el `intent 'aislar'`.                                                                                                                                                                                                     |
| **S-312** el día en que el líder se rompe               | `AUSENTE`   | sí   | **Ahora lleva pieza**: la puerta de consolidación de R18.8.                                                                                                                                                                                              |
| **S-313** la fuga alcanzada por los favoritos           | `PARCIAL`   | sí   | La cierra **R18.7** (peaje de los recién llegados: entran al final de la cola) + **R18.2** (`sittingOn` con motivo). El fugado alcanzado no releva porque el peaje es al revés y su deber ya está pagado.                                                |
| **S-317** ¿se rehace el grupo de favoritos en el valle? | `PARCIAL`   | —    | La cierra **R18.8** con su puerta de consolidación: «solo si los de atrás tienen motivo y se organizan» es exactamente `virtualGain > 0` + `consolidateGapS`.                                                                                            |
| **S-344** el peaje del trabajo en el remate             | `CUBIERTO`  | sí   | Ya ocurre; se conserva. R18.3 (`passengerDamp`) le añade el lado contrario sin tocarlo.                                                                                                                                                                  |
| **S-345** el que entra descosido                        | `CUBIERTO`  | sí   | Ya ocurre (la deriva); R15b.2 (`placeBadEntryS`) le da además una causa de colocación.                                                                                                                                                                   |
| **S-400** el maillot nuevo estrena marcaje              | `PARCIAL`   | sí   | La cierra **R04.6** (el traspaso en carretera: su equipo pasa a 'maillot' y los demás le atacan a ÉL) + **R18.8** (marcaje emergente).                                                                                                                   |
| **S-406** el día de tregua del equipo                   | `CONTRARIO` | —    | La cierra **R09.6** (`moodCause 'tregua'`) + **R05** (`purpose 'ninguno'` con `intent 'nada'` como abstención ACTIVA, §5.5). «No tira, pero tampoco ataca ni manda gente a la fuga» es `intent 'nada'` bien implementado.                                |

**La suma, con la tabla delante y sin redondear al alza.** De las 33 filas, **nueve ya están
contadas** en el 462 (son las que ganan pieza en esta revisión: S-129, S-194, S-244, S-255, S-266,
S-284, S-286, S-292 y S-312), así que lo que la tabla añade son **24**: **462 + 24 = 486**. Y ahí se
para: **quedan 8 situaciones** que ni entran en el 462 ni tienen fila aquí, y son las que el catálogo
cuenta dentro de la lista de situaciones de un racimo **y** este documento nombra además fuera de él,
de modo que sumarlas otra vez sería contarlas dos veces. **Ese desajuste es del catálogo, no de este
documento**, y se anota tal cual en vez de inventar ocho filas para que el 494 cuadre de mentira. La
versión anterior de este párrafo decía «467 + 27 = 494» con el 467 mal sumado y una tabla que ya
tenía 33 filas: cerraba el número y no cerraba la cuenta.

De las 33 filas de la tabla: **veintitrés se cierran sin regla propia** por la combinación que la
fila indica, **nueve pasan a llevar pieza** en esta revisión y **una** (S-207) queda explícitamente
abierta y se mide sin banda —como S-467, más abajo—. La de no regresión es **S-129**, que además del
`CUBIERTO` gana invariante propio (el **73**).

Lo que **queda fuera a propósito**, y se dice para que nadie lo cuente como cerrado:

| Situación                                             | Estado     | Por qué queda fuera                                                                                                                                                                                                              |
| ----------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S-163** CRE                                         | `AUSENTE`  | Es un formato de carrera entero, no un momento de etapa. **[DECISIÓN DEL DUEÑO 11]**, recomendación: no ahora.                                                                                                                   |
| **S-448** el comisario                                | `AUSENTE`  | Actor nuevo en una capa que no existe: sanciones, relegaciones, apelaciones. Aporta poco a la táctica y abre un frente entero. **[DECISIÓN DEL DUEÑO 12]**, recomendación: no.                                                   |
| **S-432** el dado de forma del día                    | `CUBIERTO` | Es una tirada, no una pieza; y es parcela de `diseno-entrenamiento.md`.                                                                                                                                                          |
| **S-437** el orden de carretera entre grupos          | `PARCIAL`  | Es física de fusión, no decisión. v56 midió que aplicar la fusión por contacto DENTRO del puerto rehacía el pelotón (fuga en montaña 54 %): queda como límite anotado, no como deuda por reintentar.                             |
| **S-467** la fuga en el puerto final                  | `PARCIAL`  | Se ataca por sus causas (R03.4d, R18, R28), **no con la perilla revertida**. **Sale del «Cierra» de R13**, donde estaba a la vez que aquí. Si no se mueve, **[DECISIÓN DEL DUEÑO 15]**.                                          |
| **S-207** el reagrupamiento tras perder cinco minutos | `PARCIAL`  | Es la deuda §14.1, la más pesada de la lista abierta, y la vía obvia (`rejoinGapSeconds`) está **refutada**. Se mide sin banda en los pasos 0 y 12 (R26) para no empeorarla a ciegas. **No se cierra en esta tanda, y se dice.** |
| **S-011** el mánager y la convocatoria                | `PARCIAL`  | Se cierra **a medias**: `wantsRaces` de R22.K ordena `callupScore`, pero nombrar la escuadra rompe G2 y §6.3 lo prohíbe.                                                                                                         |

---

## 5. El plan de equipo de verdad

Hoy el «plan» se deriva cada mañana del `stage.kind` y de `finishScore`, y **no dura de un día para
otro**. El dueño pidió otra cosa: **estructuras persistentes**, dictadas con nombre y con sus
prohibiciones. Son **seis**, no siete ni ocho: se implementan las seis que dictó, con los nombres que
les dio.

### 5.1 Las seis estructuras, tal como las dictó

```ts
type TeamStructure =
  | { kind: 'sprint'; cardId: string; launchers: string[]; rest: 'gregario' }
  | { kind: 'montana'; cardId: string; climbers: string[]; rest: 'gregario' }
  | { kind: 'general'; cardId: string; complete: boolean; rest: 'gregario' }
  | { kind: 'doble'; sprintId: string; climbId: string; split: Map<string, 'sprint' | 'climb'> }
  | { kind: 'cazaetapas'; hunters: string[] }
  | { kind: 'mixta'; cardId: string; exempt: string[]; rest: 'gregario' }

interface RaceStructure {
  teamId: string
  raceId: string
  structure: TeamStructure
  objective: ObjetivoDeCarrera // R10
  fixedOnDay: number
  changes: { day: number; cause: string; from: string; to: string }[]
}
```

| Estructura   | Qué es, con sus palabras                                                                                 | Prohibición dictada                                                                                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sprint`     | «Un sprinter fuerte y el resto trabajando solo para él»                                                  | **No** en una clásica de montaña ni en una vuelta sin llano (S-004). Ahí el sprinter va de gregario de llano y de cazaetapas en fugas de transición.                                          |
| `montana`    | «Un hombre fuerte de montaña y el resto para él»                                                         | **No** en una clásica llana ni en una vuelta de solo llano y crono (S-005). Sin terreno propio, el equipo se declara de cazaetapas de partida: fuga cada día y nadie tira.                    |
| `general`    | «Un hombre para la general —completo montaña+crono si hay crono, solo montaña si no— y el resto para él» | Requiere que la carrera tenga general (S-006, S-007). Y cambia CÓMO se corre: a **controlar** si el jefe gana tiempo en la crono, y a **ganarlo en montaña desde lejos** si no la tiene.      |
| `doble`      | «Un sprinter Y un escalador, y el resto trabajando para ambos»                                           | Requiere que ambos superen `doblePct` y que el recorrido dé terreno a los dos (S-051, S-185). Cada gregario sabe para cuál de las dos cartas trabaja hoy, y el reparto cambia con el terreno. |
| `cazaetapas` | «Solo cazaetapas, buscando la fuga y una oportunidad sorpresiva»                                         | **Es el suelo: siempre legal** (S-064, S-084). Manda uno a la fuga, prueba con otro si falla, y no paga un metro de viento en el pelotón.                                                     |
| `mixta`      | «Gregarios de un líder, con alguien exceptuado que va por libre»                                         | El exceptuado no trabaja, no recibe ayuda y **no perjudica** (S-053). No es un rebelde: es un permiso.                                                                                        |

**La doble dimensión, que es lo que hoy no existe.** La estructura es una fila; el **final previsto
por grupo** de hoy (R17) es una columna. El motor tiene hoy **una sola dimensión** —el `kind` de la
etapa— y por eso «la casa entera puede correr para el hombre que no era» (S-047, el `CONTRARIO`
nº 4).

| Estructura   | Papeles con final masivo                                  | Papeles con final en alto                                  |
| ------------ | --------------------------------------------------------- | ---------------------------------------------------------- |
| `sprint`     | 1 sprinter · 2 lanzadores · 5 gregarios                   | 1 libre · 1 cazaetapas · 6 al grupeto o gregarios de llano |
| `montana`    | 1 libre · 1 cazaetapas · 6 gregarios de colocación        | 1 líder · 5 gregarios · 1 cazaetapas · 1 libre             |
| `general`    | 1 líder protegido · 4 gregarios · 1 cazaetapas · 2 libres | 1 líder · 6 gregarios · 1 cazaetapas                       |
| `doble`      | sprinter + 2 lanzadores · escalador + 1 · 3 gregarios     | escalador + 3 · sprinter al grupeto · 2 cazaetapas         |
| `cazaetapas` | 3 cazaetapas · 5 libres                                   | 4 cazaetapas · 4 libres                                    |
| `mixta`      | 1 líder · 4 gregarios · 1-2 exceptuados · 1 libre         | igual                                                      |

**El exceptuado**, que hoy no existe y está `CONTRARIO` (S-053): `binding = 'exceptuado'` ⇒
`drive = 0`, `attackFactor = 1`, sin arropo ni tren ni rescate — **pero** `appetite = 0` mientras su
equipo esté en `intent ∈ {perseguir, lanzar, controlar}` con su carta viva. **No ataca cuando su
equipo controla**, que es la mitad de la fila que hoy se pierde. Y **nadie le persigue** (S-188).

### 5.2 Cómo se elige la estructura en la convocatoria

Hoy `world/callups.ts` puntúa a cada corredor **individualmente** contra la afinidad media del
recorrido y **no hay lógica de composición ninguna**: no existe «si va el sprinter, lleva
lanzadores». S-001 pide exactamente lo contrario: **elegir primero la baza de la carrera entera y
rellenar a su alrededor**.

```
function chooseStructure(roster, shape, philosophy):

    # 1. LEGALIDAD — las prohibiciones del dueño son DURAS, no una penalización
    legal = []
    si shape.bunchFinishShare >= structSprintMinShare (0,25):  legal += 'sprint'
    si shape.climbShare       >= structClimbMinShare  (0,12):  legal += 'montana'
    si shape.hasGc:                                            legal += 'general'
    si 'sprint' ∈ legal ∧ 'montana' ∈ legal:                   legal += 'doble'
    legal += 'cazaetapas'                                      # siempre: es el suelo
    legal += 'mixta'                                           # siempre: variante de las demás

    # 2. ENCAJE: PERCENTIL del mejor hombre del roster CONTRA EL CAMPO QUE VA A CORRER
    fit('sprint')     = shape.bunchFinishShare · pct(bestSpr,   campo.SPR)
    fit('montana')    = shape.climbShare       · pct(bestClimb, campo.climbScore)
    fit('general')    = shape.hasGc · pct(bestGc, campo.gcScore) · (complete ? 1 : 1 − shape.ttShare)
    fit('doble')      = min(fit sprint, fit montana) · dobleBonus (1,15)  si ambos ≥ doblePct (0,60)
    fit('cazaetapas') = cazaFloor (0,35)                       # el suelo del que no tiene baza
    fit('mixta')      = fit(mejor otra) · mixtaDamp (0,92)     # cuesta un poco tener un suelto

    # 3. LA FILOSOFÍA DE LA CASA INCLINA, NO DECIDE                              (S-003)
    fit[k] *= 1 + philosophyGain (0,20)  si k coincide con teams.philosophy
    # (sprints, clásicas, cantera, general): cambia A QUÉ VA a cada carrera, no solo a quién lleva

    structure = argmax fit    (desempate por id, determinismo)

    # 4. LA ESCUADRA SE CONSTRUYE ALREDEDOR                          (S-001, la fila AUSENTE)
    cuota = QUOTA[structure]
    para cada hueco de la cuota: el mejor disponible por el score de ESE hueco
    INVARIANTE DURO: nunca un lanzador sin sprinter; nunca ocho escaladores en una vuelta llana;
                     nunca un cronista puro en una carrera sin crono; nunca un marcador sin
                     favorito rival al que marcar.
```

**`pct(x, campo)` y no un umbral absoluto**, y es deliberado: es exactamente la corrección que
`diseno-entrenamiento.md` §6 punto 5 dejó dictada para `SPRINTER_MIN` —«lo que el 68 quería decir es
_este equipo tiene una baza de sprint COMPARADA con el pelotón que corre hoy_, y eso es un percentil,
no un número»—. Se adopta aquí también para no contradecir al documento hermano, y por la misma
razón práctica: con un umbral absoluto, en PRS (SPR maduro ≈ 61) y en CON (≈ 54) el rol de sprinter
**desaparece**.

**Cuotas por estructura** (escuadra de 8; con 7 se cae el último `libre`):

| Estructura   | carta       | apoyo                     | resto                             |
| ------------ | ----------- | ------------------------- | --------------------------------- |
| `sprint`     | 1 sprinter  | 2 lanzadores (LLA+SPR)    | 3 rodadores + 2 libres            |
| `montana`    | 1 escalador | 3 gregarios de montaña    | 2 rodadores + 2 libres            |
| `general`    | 1 jefe      | 2 de montaña + 2 de llano | 2 libres (uno cazaetapas)         |
| `doble`      | 2 cartas    | 1 lanzador + 2 de montaña | 3 repartidos según el día         |
| `cazaetapas` | —           | —                         | 8 cazaetapas de perfiles variados |
| `mixta`      | 1 jefe      | 4-5 gregarios             | 1-2 exceptuados                   |

**Equipos pequeños (S-008).** Con una escuadra CONVOCADA de 4-6 hombres, el equipo sale de casa
sabiendo que no puede pagar el frente: se protege al jefe y se manda uno a la fuga. Y el pacto tácito
de R20.4 aparece con más facilidad, porque **nadie puede pagar solo** —que es la fila literal.
**El factor numérico no vive aquí**: `clamp(presentes(t, g)/6, 0, 1)` se aplica en `frontAuction`
(R20.2), **por grupo y por kilómetro**, que es donde S-248 pide que muerda —«el derecho al frente
baja con los hombres PRESENTES»— y donde ve también al equipo de ocho que llega al km 150 con tres.
Aplicarlo dos veces (a la convocatoria y al kilómetro) sería cobrarlo dos veces; se cobra una, en el
kilómetro.

**El campeonato nacional (S-485)** no pasa por aquí: se convoca de uno en uno y sin escuadras. Su
sustituto es `nationalBlocs` (R28.6), que agrupa por equipo de origen para el censo y la aduana.

### 5.3 De la estructura a los papeles del día

```
function cardOfDay(structure, shape, day, memory, state):
    finalReal = finishType(deriveFinishTerrain(profile(day)), 40)   # ← EL FINAL, no la etiqueta

    según structure.kind:
      'sprint'     → carta = cardId si admitsBunchFinish(finalReal); si no, NINGUNA.
                     Sin baza (S-050): manda 1-2 hombres a la fuga desde el km 0 y el resto al
                     autobús SIN TIRAR. «El equipo del sprinter no tiene nada que hacer hoy» no
                     significa correr a medias: significa esta jugada concreta.
      'montana'    → carta = cardId si climbShare(day) ≥ 0,12 ∨ finalReal ∈ {alto, muro, puncheur}
      'general'    → carta = cardId SIEMPRE que haya general, vaya 1.º o vaya 12.º        (S-047)
                     y si `complete` es falso, el equipo endurece la montaña desde lejos en vez
                     de controlar, porque su hombre no gana tiempo en la crono               (S-006)
      'doble'      → carta = el de los dos con mejor finishScore en finalReal; el otro pasa a peón,
                     y sus gregarios se reparten según climbShare del día                    (S-051)
      'cazaetapas' → sin carta: cupo de fuga 1-2 y ningún metro de viento                    (S-084)
      'mixta'      → carta = cardId; los exceptuados quedan FUERA del reparto                (S-053)

    # LA GENERAL MANDA SOBRE EL TERRENO — arregla el agujero de pickLeader          (S-062, S-048)
    # Y NO POR PUESTO: `gcRank ≤ 5` era exactamente el umbral que R17.1 declara equivocado dos
    # secciones antes («el jefe de general lo es aunque vaya 12.º», S-047) y que S-048 (PARCIAL,
    # con cita) señala por su nombre: «el equipo protege a su hombre de la general por lo que
    # puede hacer EN LA MONTAÑA QUE VIENE, no por el puesto de hoy». Con `gcRank ≤ 5`, un equipo
    # de estructura `sprint` cuyo hombre de general va 8.º no le promueve nunca.
    si algún leal cumple  gcDeficit(r) ≤ leash(t)            # R04.2: mira el terreno que QUEDA
                       ∨  finishScore(r, terrenoRestante) ∈ top-gcContenderN (10) del campo
       ∧ la carrera tiene general:
          ese hombre es la carta de general, y la carta de etapa (si la hay) es la SEGUNDA.
          purposes = ['maillot'|'general', 'etapa'] en ese orden.
          # `leash(t)` cambia con los días: el día 3 de 21 con montaña por delante casi todo el
          # top-20 cumple; el día 19 con una crono corta, cuatro hombres. Es lo que S-048 pide.
    # → hoy `pickLeader` «elige al jefe de filas por ROL y por el final que dibuja el recorrido,
    #   y NUNCA MIRA LA GENERAL» (comentario de simulate.ts:2160), así que en una llana de gran
    #   vuelta el jefe del plan es el velocista y el maillot podía entrar en la lista de los que
    #   bajan. Se parcheó con `esElMaillot` en helpBack; aquí se arregla en la raíz.
```

**Y el presupuesto del día no es una constante por hombre** (S-055): sale de `dayWeight` (R10.1) por
`fitFactor` (R08.1). Depende del objetivo y de lo que viene mañana.

### 5.4 Cómo cambian: la general, el formato y los hechos

La estructura **dura toda la carrera y solo cambia por HECHOS, no por el terreno del día** (S-002).
Los hechos son estos, y solo estos:

```
si la carta ABANDONA o queda irrecuperable (gap > cardLostS 300 s sin poder volver):
      heredero = el mejor leal por finishScore en finalReal
      los roles que apuntaban al muerto se DEGRADAN: worksFor = heredero o null
      → nadie sigue tirando por un ausente. Y el equipo emite `card_changed` (crónica).  (S-190, S-197)
      Esto ocurre EN CARRETERA, no solo entre etapas: hoy `buildTeamPlans` corre una vez por etapa
      y `leaderId`, `stageCandidateId` y `purposes` quedan congelados el día entero (S-200).

si la carta pierde > structureBreakS (300 s) en la general:
      al día siguiente la estructura pasa a 'cazaetapas' y LIBERA a los gregarios      (S-392, S-409)
      y sus escaladores se van a la fuga, nadie controla, el gregario de lujo pasa a jefe
      y las órdenes con objetivo muerto degradan a 'libre'                             (S-390)

si un CAZAETAPAS hereda el maillot:
      estructura → 'general' PROVISIONAL, arropo dos días aunque le cueste medio equipo,
      y vuelve a lo suyo al perderlo                                                   (S-395)

si un RIVAL DE REFERENCIA desaparece de la carrera:
      todos recalculan ESA MISMA NOCHE: el que era segunda opción hereda la condición de carta
      —y con ella la factura de controlar—, el que le marcaba libera un hombre, y una etapa que
      ayer se cazaba sola hoy no la caza nadie                                         (S-483)

si el equipo se queda SIN PATROCINADOR para el año siguiente:
      la jerarquía se apaga por dentro: todos con duty 'libre', cupo de fuga 3, y en el sprint
      cada uno va a lo suyo. Y el pelotón lo sabe: ni le concede favores ni le espera relevos,
      porque un equipo que no tiene futuro no puede devolver nada                      (S-469)
      → objection ajena × noFutureDamp (0,8) y goodwill fijo en 0.

si el SPRINTER se descuelga, se cae o abandona en carretera:
      el equipo deja de tirar y baja dos o tres hombres a traerle; si está fuera de combate,
      CAMBIA DE CARTA o se sienta. No sigue montando un tren para un ausente.          (S-179)

si el equipo pierde TRES hombres:
      el motivo 'equipos' desaparece y sus hombres quedan libres                       (S-396)
      y con cinco no se reclama el frente (smallSquadClaim, §5.2)                      (S-410)
```

**Presupuesto de cambios**: `structureChangesPerRace` banda **0-2**. Una estructura que cambia cada
tres días no es una estructura.

### 5.5 Los motivos que faltan hoy, y los `intent` que traen

Hoy los motivos son **tres**: `etapa`, `maillot`, `general` (más `ninguno`). Con R05 pasan a
**once**. Y con ellos aparecen **ocho** `intent` que hoy **no tienen ninguna expresión en el motor**:

| `intent` nuevo | Qué es                                                                                                    | De dónde sale                                                                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sembrar`      | meter hombres en los intentos hasta que uno cuaje                                                         | `montana`, `patrocinador` (S-065, S-066)                                                                                                                                                        |
| `pancarta`     | perseguir para la volante y aflojar 500 m después                                                         | `puntos` (S-105)                                                                                                                                                                                |
| `sabotear`     | meter un infiltrado en la fuga en vez de pagar el cierre                                                  | cualquiera con R03.5 (S-474)                                                                                                                                                                    |
| `aliar`        | pedir o aceptar el reparto del frente                                                                     | R20.4 (S-174)                                                                                                                                                                                   |
| `tregua`       | pedir o conceder la tregua                                                                                | R12.2 (S-237)                                                                                                                                                                                   |
| `escaparate`   | el equipo sin nada que se mete en todo                                                                    | R09.4 (S-397, S-402)                                                                                                                                                                            |
| `ocupar`       | ponerse al frente **a ritmo bajo** y neutralizar a quien quiera cerrar                                    | `fuga` con carta dentro (S-086)                                                                                                                                                                 |
| **`aislar`**   | **poner tempo duro en el puerto para descolgar a los gregarios del rival, y saltar cuando se queda solo** | **R05.12 (S-292, S-194)** — es el que el catálogo nombra literalmente como inexistente: «no existe intent "aislar"/"endurecer"… el pelotón sube a tope siempre sin que ningún equipo lo decida» |

`ocupar` merece una nota, porque es media fila que hoy falta y nadie la ve: cuando un equipo tiene su
carta delante, `teamStance` ya devuelve `intent 'fuga'`, el empuje pasa a −0,9 y el equipo sale del
cómputo de la caza. **Eso está construido.** Lo que falta es la segunda mitad: **ponerse al frente a
ritmo bajo y estorbar**, porque hoy el equipo **se retira** del frente en vez de **ocuparlo**.

Y dos que ya existen y hoy nunca se usan bien:

- **`proteger`**, que hoy significa «tempo» y debería significar **no relevar + colocar** (S-189):
  arropar sí ahorra energía, y no por el viento sino por el acordeón (R15a.2).
- **`nada`**, que hoy es esconderse y debería incluir la **abstención activa** (S-084): mandar uno a
  la fuga y no pagar un metro. No es lo mismo no hacer nada que no hacer nada **a propósito**.

---

## 6. El jugador humano y el mánager

### 6.1 El principio, y por qué no cambia

El dueño ya tumbó la radio en vivo: «es incompatible con avanzar un día cada seis horas» (epics N1).
Lo que pidió es **granularidad**: «mejorar la granularidad de las instrucciones, con más escenarios
hipotéticos quizás». Y ya midió el problema: **«el resultado es casi lo mismo ponga lo que ponga
ahí»**.

Este documento **no mueve la frontera**: las órdenes se escriben antes de la etapa y no se cambian
durante. Lo que cambia es que **puedan decir más cosas**, que **valgan algo** (con suelo, techo y
dirección medidos, R22) y que **el informe cierre el bucle**.

### 6.2 Lo que un humano puede ordenar

Las siete palancas de hoy se conservan **enteras**. Se añaden **cuatro campos, todos opcionales**,
y con ellos el juego pasa a tener **once palancas** —que es el número que usan `ordersBench` (§7.3),
los invariantes 59, 62 y 63 (§7.6) y `raceReportOrdersSchema` (§9.6)—:

```ts
type StageOrders = {
  role: StageRole // sin cambios
  targetRiderId?: string // sin cambios
  mentality: Mentality // sin cambios
  effort?: Effort // sin cambios de vocabulario; deja de ser solo ±0,5 en el turno
  triggerKm?: number | null // sin cambios
  contestSprints: boolean
  contestClimbs: boolean // ← y AHORA SE LEE (R06.1): hoy `disputeClimb` la ignora

  // --- NUEVO ---
  triggerOn?: TriggerCond | null // la cita deja de ser solo un km    (S-214, S-321, S-322)
  chasePolicy?: ChasePolicy // «si la fuga pasa de 2′, tiro»      (S-215, S-071)
  refuseRelayTeams?: string[] // «con ésos no colaboro»             (S-256)
  dayGoal?: DayGoal // «hoy me voy al grupeto» / «hoy es mi día» (S-216, S-024, S-030)
}

type TriggerCond =
  | { at: 'km'; km: number } // lo de hoy
  | { at: 'climb'; which: 'last' | 'penultimate'; part: 'pie' | 'duro' | 'cima' } // S-322
  | { at: 'attack'; byRiderId: string } // S-321: «si salta Z»
  | { at: 'gap'; overS: number } // S-215
  | { at: 'weather'; cond: 'lluvia' | 'viento' } // S-032
  | { at: 'sector'; index: number } // pavé o tierra

type ChasePolicy = 'nunca' | 'si_amenaza' | 'siempre'
type DayGoal = 'ganar' | 'general' | 'puntos' | 'montaña' | 'grupeto' | 'ahorrar' | 'servir'
```

**Y `effort` deja de ser un botón medio desconectado**, que es la mitad de la queja que la v58 dejó
abierta. Hoy actúa en **un solo sitio**: un término de ±0,5 en el deber de relevo. Pasa a tocar
cuatro:

| `effort`  | Turno (hoy)   | **Cerillos**              | **Reserva**                        | **Presupuesto de carrera**              |
| --------- | ------------- | ------------------------- | ---------------------------------- | --------------------------------------- |
| `ahorrar` | −0,5 de deber | no quema por no soltarse  | umbral de gasto **+25 %**          | `dayWeight` × 0,7, se lo lleva a mañana |
| `normal`  | 0             | como hoy                  | como hoy                           | 1,0                                     |
| `a_tope`  | +0,5 de deber | **+1 cerillo disponible** | umbral **−25 %** (se muerde antes) | `dayWeight` × 1,4, y mañana menos       |

Esto contesta a «el resultado es casi lo mismo ponga lo que ponga ahí» **con mecánica, no con un
aviso en pantalla**. Y `mentality` conserva su efecto lateral declarado (S-069): la pantalla dice que
«reservón» también significa **no quemar un cerillo por no soltarse**.

### 6.3 Lo que sigue sin poder ordenar, y por qué

| Deseo                                   | ¿Se puede?              | Por qué                                                                                                                                                                                                                                                                |
| --------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cambiar de idea durante la etapa        | **No, por diseño**      | La cita del dueño en N1. Es la frontera del juego, no una limitación técnica.                                                                                                                                                                                          |
| Hablar o negociar con el equipo         | **No todavía**          | Es G7/G2.13, sin empezar. `dayGoal` es el sustituto barato: **declara, no negocia**.                                                                                                                                                                                   |
| Marcar a cualquiera del pelotón         | Solo los más relevantes | `getRaceRivals(limit=60)` hoy, por FAMA. Se propone subir a **120** y ordenar por **relevancia deportiva** (general, palmarés en este terreno), no por fama.                                                                                                           |
| Órdenes de mánager sobre terceros       | **Solo políticas**      | G2: «POLÍTICAS en vez de órdenes, aplicada en dos niveles». Ver §6.5.                                                                                                                                                                                                  |
| Decidir la convocatoria nombre a nombre | **No**                  | G2 lo deja fuera; `objective` (R10.4), la filosofía de la casa (S-003) y el **deseo de convocatoria** de R22.K (`wantsRaces`, que ordena `callupScore` sin nombrar a nadie) son las palancas. Por eso S-011 se cierra **a medias** y así consta en el «Cierra» de R22. |

### 6.4 Cómo conviven órdenes humanas y bots en el mismo equipo

Los dos agujeros medidos se cierran en §2.5 (el bot lee las órdenes humanas antes de repartir; nadie
es jefe sin quererlo). Además:

```
R22.A  EL BOT LEE LAS ÓRDENES HUMANAS ANTES DE REPARTIR                 (S-054, S-060)
       stageRun.ts invierte el orden: primero `stage_orders`, luego
       autoStageOrders(riders, {kind, timeTrial, humanOrders}).
       autoOrders trata las filas humanas como HECHOS y reparte alrededor:
             — no nombra dos cartas
             — no produce CICLOS (X lanza a Y y Y lanza a X)                     (S-060)
             — no pone de lanzador a quien se declaró carta
       Es un cambio de ~20 líneas y cierra cuatro `CONTRARIO`.

R22.B  NADIE ES JEFE SIN QUERERLO                                                (S-058)
       `pickLeader` ignora los votos que apuntan a un hombre cuya orden explícita es 'libre' o
       'cazaetapas'. Contrapartida honesta y escrita en pantalla: ese hombre NO recibe arropo, ni
       tren, ni rescate.

R22.C  DOS HUMANOS QUE SE DECLARAN LÍDER                                         (S-061)
       el desempate deja de ser POR ID: general (gcRank) → finishScore en el final real →
       antigüedad de contrato → id. Y el segundo recibe un AVISO ANTES DE GUARDAR.

R22.D  EL GREGARIO CON EL OBJETIVO EQUIVOCADO                                    (S-059)
       si `targetRiderId` apunta a alguien que no es la carta del plan, se DETECTA Y SE AVISA
       antes de guardar la hoja. No se prohíbe: se avisa. Trabajar para el compañero equivocado
       es una decisión legítima; hacerlo sin saberlo, no.

R22.E  EL HUMANO CON EL MAILLOT QUE NO LO DEFIENDE                               (S-030)
       `dayGoal` 'ganar' o 'ahorrar' con el maillot puesto → el equipo NO se funde controlando
       por él: purpose 'maillot' pasa a claim `jerseyBorrowedClaim` (1). Su decisión, su precio.

R22.F  EL HUMANO GREGARIO QUE QUIERE SU DÍA                                      (S-024)
       pide `carta-blanca`; el equipo la CONCEDE o no (dirQuality y trust deciden). Concedida,
       ir por libre no cuesta trust; denegada, si lo hace igual es rebelde y sí cuesta.

R22.G  AVISO CUANDO LA ORDEN NO PODRÁ CUMPLIRSE                          (S-214, S-070)
       `raceOrdersAdvice` gana las reglas que hoy no ve: el equipo (ya hay líder), la general
       (llevas el maillot y pediste atacar: los vetos se sostienen pero la pantalla lo dice), la
       estructura, y el clima que la pantalla ya enseña.
       Y el informe posterior lo CIERRA (R23.6): «tu cita era el km 80; a esa altura tu grupo
       estaba cerrando un intento y tu apetito era 0,04».

R22.H  DOS HUMANOS QUE SE COORDINAN                                              (S-025)
       un humano puede declararse gregario de otro humano, y los dos VEN la hoja del otro dentro
       del juego (no por fuera). Es lo único que se abre de G7 aquí, y solo entre compañeros de
       equipo, porque ya está `CUBIERTO` a medias.

R22.I  EL AGENTE LIBRE                                                           (S-040)
       `teamId = null`: corre a la desesperada. Se mete en la fuga MÁS que un gregario de equipo
       grande, no menos: appetite × freeAgentGain (1,35). Y en el sprint se busca la vida a rueda
       (R16.4), perdiendo por colocación y no por piernas.

R22.J  EL JEFE HUMANO LEGÍTIMO PIDE, Y LOS GREGARIOS BOT OBEDECEN IGUAL         (S-217)
       Figuraba en el «Cierra» de R22 y ninguna de las nueve reglas anteriores la trataba.
       Un humano con `duty 'carta'` de su equipo puede emitir DOS peticiones en su hoja, y las dos
       entran como `TeamDayPolicy` del día —no como radio en vivo, que sigue prohibida (§6.1)—:
             `askPace: 'duro' | 'normal' | 'tranquilo'`   → mueve `purposeOrder` y `budgetShare`
             `askCloseGaps: boolean`                      → sube `chasePolicy` a 'si_amenaza'
       Y EL BOT LAS TRATA EXACTAMENTE IGUAL QUE SI VINIERAN DE UN DIRECTOR BOT, que es la fila:
       la legitimidad la da el `duty`, no la especie. Un humano que NO es la carta puede pedirlas
       también, y entonces valen lo que vale una sugerencia: `dirQuality` decide si se atienden,
       con la misma función que decide si se concede una `carta-blanca` (R22.F).
       Se mide con `ordersBench`: `askPace` es la palanca nº 10 y `askCloseGaps` la nº 11.

R22.K  ENTRE ETAPAS SE PUEDE DECIDIR ALGO MÁS QUE ABANDONAR                     (S-415)
       Igual: estaba en el «Cierra» sin regla, y R08.5 solo cubre la retirada por orden DEL EQUIPO
       (S-450), que es otra cosa.
       Entre etapa y etapa, un humano puede fijar en su ficha de carrera:
             `dayGoal` del día siguiente (§6.2), que ya existe como campo
             `raceObjective` propio: 'general' | 'etapas' | 'aguantar' | 'servir'
                   → entra en `dayWeight` (R10.1) como un factor por hombre, no por equipo
             `restDayRequest: boolean` → un día tranquilo: `effort = 'ahorrar'` y `dayWeight` × 0,7
       Nada de esto se puede cambiar DURANTE la etapa: la frontera de §6.1 no se mueve.
       Y un «deseo de convocatoria» —`wantsRaces: raceId[]`, ordenado— que **ordena `callupScore`
       sin nombrar la escuadra**: es lo que S-011 pide sin romper G2 (§6.3).
```

### 6.5 El mánager (G2), y hasta dónde llega aquí

Hoy el mánager premium puede: renombrar el equipo, hacer el draft del calendario y fijar el plan de
entrenamiento sugerido. **No** decide roles, ni convocatorias nombre a nombre, ni órdenes de
terceros.

Este documento le añade **exactamente una cosa**, y es la que G2 pide («el mánager fija el plan del
equipo y cada corredor escribe el suyo dentro de ese marco», S-026):

```ts
type TeamDayPolicy = {
  protectedId?: string // «hoy la casa corre para éste»
  cardId?: string // la carta de etapa, si es otra
  chasePolicy: ChasePolicy // «nunca / si amenaza / siempre»          (S-071, S-215)
  purposeOrder: TeamPurpose[] // el orden de motivos del día             (S-020)
  budgetShare: number // [0,1] cuánto del presupuesto de carrera gastar hoy  (S-055)
  exempt: string[] // a quién se le da carta blanca hoy       (S-024)
}
```

Es una **política, no una orden**: no nombra lo que hace cada hombre. Lo demás lo sigue derivando el
director bot, y el corredor humano sigue escribiendo su hoja dentro del marco. Con eso:

- Un mánager humano **hereda un equipo bot sin que se note el cambio de manos** (S-012): la política
  por defecto es **exactamente** la que hoy se deriva. Es un requisito duro y un invariante de
  control.
- **Abusar sale caro por dentro** (R25.5), no por una regla que lo prohíba: nombrarse jefe de filas
  baja el trust de todos los demás leales, y los humanos de ese equipo se van (S-027).
- **G2.15 («ser mandado») deja de ser invisible**: el corredor **ve la política de su equipo antes de
  escribir su hoja** (S-023) y puede responder a ella con `dayGoal`. Hoy nadie le manda nada y él no
  ve nada.
- El objetivo de temporada repartido entre los suyos (S-028) ordena entrenamiento, convocatoria y
  pico de forma, y engancha con `diseno-entrenamiento.md` §5 sin contradecirlo.

**Lo que el mánager sigue sin poder hacer, y por qué**: nombrar la escuadra hombre a hombre (rompe
G2 y hace irrelevante la convocatoria), escribir órdenes individuales a terceros (es el juego del
otro jugador), y cambiar nada durante la etapa (misma frontera que §6.1).

### 6.6 El aviso de «no hay órdenes»

S-010 (`CUBIERTO`) pide que el aviso «You have no orders set — your coach will ride it for you» se
cuente **etapa a etapa** y no se apague con una sola hoja guardada en toda la carrera. Hoy
`hasOrders = orders.length > 0` lo apaga con una. Es una línea en `domain/dashboard.ts`, y va con el
paso 17.

---

## 7. Los bancos que hacen falta

### 7.1 El problema de fondo: el banco no reproduce lo que el dueño ve

`docs/tactica.md` §4 lo dejó demostrado y no se ha discutido desde entonces: **el banco no reproduce
casi nada de lo que el dueño ve en producción**. «Gana el mismo dos etapas seguidas» mide **1,8 %**
(1 de 57); «seis del mismo equipo en una fuga de nueve» mide 4 de 20 en el **0,9 %** de las fotos.
Las dos medidas son limpias y las dos dicen «aquí no pasa».

O sea que el defecto vive **en lo que la producción añade y el banco no tiene**: campos pequeños con
pocos equipos, la general de verdad, las órdenes automáticas del día y el estado que se arrastra.

`mapa-bancos.md` §7.1 lo confirma desde el otro lado, y con nombres: «el único campo pequeño de CI es
`teamedField` 8×5 = 40 y solo para la voz de la crónica… **nada mide una carrera de 5-10 equipos de
4-6** (ni con órdenes, ni con general)».

**Consecuencia, y es la que ordena el paso 0**: sin ese banco **no se puede saber si un cambio
arregla algo**. Construirlo antes de escribir una línea de motor no es prudencia: es la única forma
de que los veintiún pasos siguientes signifiquen algo.

### 7.2 El banco que no existe y va primero: `smallRaces.ts`

```ts
// packages/engine/src/sim/smallRaces.ts  (NUEVO)
const SMALL_RACES = [ /* 8 carreras reales de 3-5 etapas, lista CERRADA */ ]

smallRaceSetup(raceId) → 5-10 equipos de 4-6 (según el raceId real), generados con
  generateNpcRider (Frontera 2 de `diseno-entrenamiento.md`), con autoStageOrders CON gcRank,
  general acumulada, clasificaciones secundarias y RaceMemory ENCADENADA entre etapas.
```

Corre la carrera **entera**, con memoria entre días, como `smallTours` pero **con el tamaño de campo
que el dueño mira**. Lista cerrada por el mismo motivo que `smallTours` y `realQueens` la tienen: un
banco cuya muestra cambia sola no vigila, informa.

### 7.3 Los otros tres bancos nuevos

2. **`duelBench.ts`** — escenarios de **grupo pequeño construidos a mano**: fuga de 2, fuga de 3
   (pareja + suelto), grupo de 6 (tres parejas), grupo de favoritos de 4 sin gregarios, y un
   escenario de caída con rescate. Barato (2-6 corredores por corrida) y es **el único sitio donde
   la superioridad numérica se puede medir sin ruido**: 400 corridas ≈ **8 s**.
3. **`ordersBench.ts`** — el banco de órdenes que hoy **no existe** (`mapa-bancos.md` §7.7: «ningún
   banco varía `mentality`, `contestSprints/Climbs`, `targetRiderId` o rol por decisión externa»).
   El mismo hombre, el mismo campo, las mismas semillas, **una palanca cambiada**, pareado por
   semilla. Mide **suelo, techo y dirección** (R22). **Once palancas, no siete** —las cuatro nuevas
   son las que cierran S-214, S-215, S-216, S-256, S-321 y S-322, así que dejarlas fuera del banco
   dejaba seis situaciones sin prueba—: 12 semillas × **11 palancas** × 2 valores sobre `llana-180`
   con campo de 88 (11×8) ≈ **70 s estimados, a MEDIR en el paso 0**.

   **Y `orderDirection` con tolerancia cero solo es honesto si se mide pareado.** Meter en el job
   rápido un invariante de tolerancia CERO sobre un estadístico estocástico con 12 semillas es la
   receta exacta del CI intermitente que este repositorio ya sufrió: `mapa-bancos.md` §7.21 avisa de
   que «los bancos reales de CI corren 6-12 semillas por etapa… todo lo más fino que 2-4 puntos
   porcentuales está dentro del ruido», y §8 recuerda nocturnos caídos «con CERO afirmaciones
   falladas». Así que la dirección **no se mide sobre medias crudas** sino sobre el **efecto pareado
   por semilla**: misma semilla, misma etapa, una palanca cambiada, y se exige que la **mediana de
   las diferencias pareadas** tenga el signo prometido **con su intervalo de confianza del lado
   correcto**. Una mediana pareada con 12 semillas es un estadístico casi determinista; una media
   cruda no lo es. Si aun así el intervalo cruza el cero en alguna palanca, hay dos salidas escritas
   y ninguna es ensanchar: subir a **≥ 60 semillas** para esa palanca, o mover `ordersBench` entero
   al job largo.

4. **`media-190` entra en CI** — hoy es informativo y sin banda (`mapa-bancos.md` §7.10), y es justo
   el escenario donde vive la deuda §14.4 (el ganador en solitario en media montaña, 4 % contra
   20-30 %). Con R18 esa deuda se ataca de frente, así que el escenario **tiene que vigilar**.

Y **dos variantes** de escenarios existentes, que cuestan casi nada y sin las cuales dos racimos no
se pueden medir:

5. **`cri-40` con equipos y general** — R27.2 (las referencias del rival) es inmedible sin ella:
   `cri-40` hoy son 40 corredores sin equipos y sin déficit.
6. **llana canónica CON `lugar`** — R14 es inmedible sin ella: los canónicos corren hoy **sin
   clima**, y `smallTours`, `realQueens`, `timeTrials`, `calendarQueens` y `climbs` también.

### 7.4 Los dos bancos de método: `informacion` y `temblor`

Estos dos no miden una conducta del catálogo: **vigilan el rediseño**. Sin ellos, el trabajo puede
salir con todos los números en banda y estar mal.

**`informacion` — el brazo de control (R24).** Es el único banco que corre **dos veces el mismo
escenario**: con la capa de información y sin ella.

```
control:  dirLagBase=0 · boardErrorSlope=0 · boardSpin=0 · newsLagBase=0 · signalSd=0 · dirQuality=1
real:     los valores de R24
```

| Estadística                                        | Banda (real) | Banda (control)            |
| -------------------------------------------------- | ------------ | -------------------------- |
| `catchLatePct`                                     | 8-25 %       | 0-3 %                      |
| `catchKmSd`                                        | ≥ 4 km       | ≈ la de hoy                |
| `diffEquiposBuenosVsMalos` (puestos)               | 3-15         | 0-2                        |
| `falsosPositivosDeSangrePct`                       | 15-40 %      | 0 %                        |
| `falsosNegativosDeSangrePct`                       | 10-35 %      | 0 %                        |
| `rescatesSobreInformacionErronea`                  | 5-25 %       | 0 %                        |
| `qualityGradient`                                  | 1,25-1,80×   | 1,00-1,05×                 |
| **Reproducción bloque a bloque del paso anterior** | —            | **exacta (invariante 47)** |

**Coste**: `llana-180` y `reina-150` × 30 semillas × 2 brazos ≈ **175 s estimados, a MEDIR en el
paso 0**. Es el único banco caro de este bloque, y compra la reversibilidad del paso más peligroso
del plan.

**`temblor` — el invariante que este diseño necesita y nadie tiene.** Si las decisiones oscilan
bloque a bloque, la carrera puede salir **con los números correctos y ser ILEGIBLE en la crónica**.
No hay ningún banco hoy que lo vea, y es **exactamente el modo de fallo** que produce un motor donde
el turno gana orden, el frente gana subasta, el director gana tic y el corredor gana `placement`.
Coste marginal **0 s**: son contadores sobre escenarios que ya corren.

| Estadística                               | Banda     | Por qué                                                             |
| ----------------------------------------- | --------- | ------------------------------------------------------------------- |
| `cambiosDeIntencionPorCorredorEtapa`      | **2-9**   | Menos de 2 es un motor rígido; más de 9 es temblor.                 |
| `oscilacionesAB` (A→B→A en menos de 3 km) | **0-5 %** | El patrón exacto del temblor.                                       |
| **`compromisosMasCortosQueSuMinimoPct`**  | **= 0**   | **Invariante duro**: `commitMinKm` (R18.9) se respeta siempre.      |
| `frontHandoversPorEtapa`                  | **1,8-4** | Ya existe como `frontTeamsPerStage`; se reinterpreta y se conserva. |

### 7.5 Qué mide cada racimo, y sobre qué escenario

| Racimo | Estadística principal                                     | Escenario                                                               | Banda propuesta                                                     | ¿Hoy?              |
| ------ | --------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------ |
| R01    | `mateAheadPullPct`                                        | carrera pequeña                                                         | 0-3 %                                                               | no existe          |
| R02    | `mateVsMateSprintPct`                                     | pequeña + `smallTours`                                                  | 0-2 %                                                               | no existe          |
| R02    | `pairEdgePct`                                             | `duelBench`                                                             | 72-88 %                                                             | no existe          |
| R03    | `breakTeamMaxShare` (p95)                                 | carrera pequeña                                                         | ≤ 2                                                                 | no existe          |
| R03    | `breakTeamsRepresentedPct`                                | carrera pequeña                                                         | 55-90 %                                                             | no existe          |
| R03    | `breakClimberShare`                                       | `realQueens`                                                            | ≥ 0,50                                                              | no existe          |
| R04    | `chaseTargetCorrectPct`                                   | `grandTour` + pequeña                                                   | 85-100 %                                                            | no existe          |
| R04    | `leashSpanS`                                              | `grandTour`                                                             | ≥ 400 s                                                             | no existe          |
| R05    | `motivePct`                                               | `grandTour` + pequeña                                                   | 65-90 %                                                             | no existe          |
| R06    | `bannerContestants`                                       | llana canónica                                                          | 3-15                                                                | no existe          |
| R07    | `bonusDecidedRacePct`                                     | `smallTours` (Arabia)                                                   | 10-40 %                                                             | no existe          |
| R08    | `frontTeamRotationDays`                                   | `grandTour`                                                             | ≥ 8 de 21                                                           | no existe          |
| R09    | `sameWinnerNextDayPct`                                    | **carrera pequeña**                                                     | 2-12 %                                                              | parcial            |
| R10    | `budgetSpentOnMarkedPct`                                  | `grandTour`                                                             | 25-55 %                                                             | no existe          |
| R11    | `mishapsPerStage`                                         | llana + Flandes                                                         | 1-5 / 5-20                                                          | no existe          |
| R12    | `truceGrantedPct`                                         | `grandTour` + `duelBench`                                               | 50-85 %                                                             | no existe          |
| R13    | `attacksWhenLeaderCracks`                                 | `realQueens`                                                            | 1,5-3,5×                                                            | no existe          |
| R14    | `echelonClosedPct`                                        | llana con viento (×3 semillas)                                          | 30-70 %                                                             | no existe          |
| R15    | `boxedLossPct`                                            | llana canónica                                                          | 8-25 %                                                              | no existe          |
| R15    | `echelonByDecisionPct`                                    | llana con viento                                                        | 50-100 %                                                            | no existe          |
| R16    | `trainsPerBunchFinish`                                    | `smallTours`                                                            | 2-5                                                                 | no existe          |
| R17    | `medianLeadGroupRiders`                                   | `smallTours` ShapeStats + `realQueens` **partida por `queenFinalKind`** | **5-15 en reinas de final NO alto**; **sin banda en final en alto** | **DEUDA (mide 1)** |
| R17    | `gregarioSharePct`                                        | `smallTours`                                                            | **sin banda** (§14 pto. 14 del mapa; su 45-65 % es la decisión 21)  | no existe          |
| R18    | `soloWinMediaPct`                                         | **media-190** (entra en CI)                                             | 12-28 %                                                             | sin banda          |
| R18    | `bestFinisherPullShare`                                   | `duelBench` + media-190                                                 | ≤ 0,8/n                                                             | no existe          |
| R19    | `attemptsAfterKm100`                                      | llana canónica + Almeria e1                                             | ≥ 2                                                                 | no existe          |
| R20    | `frontTeamsPerStage`                                      | voz de equipo (inv. 22)                                                 | 1,8-4 → **2,2-4,5**                                                 | existe             |
| R20    | **`chaseCostShare` (Gini)**                               | voz de equipo + pequeña                                                 | **0,25-0,55**                                                       | no existe          |
| R21    | `structureFitPct`                                         | carrera pequeña                                                         | 95-100 %                                                            | no existe          |
| R22    | `orderEffectSpread` / `orderMaxEffect` / `orderDirection` | `ordersBench` (**once** palancas)                                       | ≥ 0,25 / **≤ 0,045 · `fieldSize`** / tol. 0 pareada                 | no existe          |
| R23    | `cribaSinCausa`                                           | coherencia                                                              | 0                                                                   | no existe          |
| R24    | `catchKmSd` / `qualityGradient`                           | `informacion` (2 brazos)                                                | ≥ 4 km / 1,25-1,80×                                                 | no existe          |
| R25    | `trustSpreadEndSeason`                                    | **`smallRaces` encadenado** (no `world`) + `grandTour`                  | ≥ 12 puntos                                                         | no existe          |
| R25    | `rebelCallupDropPct`                                      | `world` (2 mundos × 25 temporadas)                                      | 20-60 %                                                             | no existe          |
| R26    | `grupetoMarginS`                                          | `grandTour`                                                             | 60-420 s                                                            | no existe          |
| R27    | `ttPacingSpreadS`                                         | `timeTrials` + `cri-40` con equipos                                     | 15-35 s                                                             | no existe          |
| R28    | `queenDplusMedian`                                        | `calendarQueens`                                                        | 2.800-4.200 m                                                       | **mide 2.023**     |
| R28    | `climberWinsQueenPct`                                     | `calendarQueens`                                                        | 55-85 %                                                             | no existe          |
| R05    | `secondAttacksWhenIsolatedPct`                            | `realQueens`                                                            | 60-90 %                                                             | no existe          |
| R09    | `rejoinAfterBigLossPct`                                   | `realQueens` + `grandTour`                                              | **sin banda** (deuda §14.1)                                         | no existe          |
| R16    | `climbTrainPct`                                           | `realQueens`                                                            | 50-90 %                                                             | no existe          |
| R17    | `gregariosEnPodioPct`                                     | `smallTours`                                                            | **≤ 30 %** (el número que dejó la v48)                              | no existe          |
| R18    | `topTenRelayWhileGapPct`                                  | `realQueens` + `grandTour`                                              | ≥ 50 %                                                              | no existe          |
| R18    | `jerseyPullShareInDuel`                                   | `duelBench` + `realQueens`                                              | ≤ 20 %                                                              | no existe          |
| R04    | `jerseyOnFrontPct`                                        | llana canónica + `grandTour`                                            | ≤ 3 %                                                               | no existe          |
| R26    | `sprinterTeamOnClimbPct`                                  | `smallTours` + media-190                                                | ≤ 15 %                                                              | no existe          |
| R03    | `breakBirthKm`                                            | llana canónica                                                          | 1-12 km                                                             | no existe          |
| R03    | `jerseyInBreakPct`                                        | carrera pequeña + `grandTour`                                           | **0 %** (invariante duro **72**)                                    | no existe          |
| método | `compromisosMasCortosQueSuMinimoPct`                      | todos                                                                   | **= 0**                                                             | no existe          |
| método | `bloquesConDosCompromisosPct`                             | `temblor`                                                               | **= 0**                                                             | no existe          |
| método | `oscilacionesAB`                                          | todos                                                                   | 0-5 %                                                               | no existe          |
| método | **`msPorEtapaSimulador`**                                 | canónicos + producción                                                  | **≤ +10 % sobre la foto del paso 0**                                | no existe          |

**Son 52 filas** —contadas en la tabla, una a una, no de memoria, y **la suma también va escrita
porque antes no cerraba**: 39 antes de esta revisión + **10** de la tanda anterior de correcciones +
`jerseyInBreakPct` (que tiene invariante duro —el **72**— y no estaba en la lista que los pasos 0 y
21 imprimen: un invariante de tolerancia cero que nadie imprime es un invariante que nadie mira) +
`gregariosEnPodioPct` (que nace al atar `finishRoleWeight[gregario]` 0,88 → 0,94 al número que el
dueño miró en la v48, §9.5) + `rebelCallupDropPct` (que nace de partir la fila de R25 en dos) =
**39 + 10 + 1 + 1 + 1 = 52**. El desglose anterior sumaba 51 sobre una tabla de 52 porque se dejaba
fuera `gregariosEnPodioPct`, que es justamente la que ata una subida de constante a una queja
literal. Y ése es el número que los pasos 0 y 21 tienen que imprimir. Conviene decirlo porque
los recuentos de este documento se han desincronizado más de una vez: **cuéntense en la tabla, no de
memoria**.

**Por qué R25 se parte en dos filas, y por qué su banco cambia.** La versión anterior medía
`trustSpreadEndSeason` sobre **`world`**, y eso era estructuralmente imposible: `world.ts` **no
simula etapas** —«la carga de un día de carrera es representativa por terreno… aquí no gana nadie»
(`mapa-bancos.md` §4.4 y §8)—, mientras que **todos** los disparadores de `trust` que R25.2 define
son sucesos **de dentro de la etapa**: kilómetros al frente ≥ 40, un `helpBack` ejecutado, un
lanzamiento con `pullWindow` ≥ 0,4. Un banco que no corre etapas no puede producir ni uno solo de los
tres, así que la banda ≥ 12 puntos habría medido siempre 0 y nadie habría sabido por qué. El reparto
correcto es el que separa **causa** de **efecto**:

- **`trustSpreadEndSeason` se mide en `smallRaces` encadenado** (§7.2), que sí corre etapas y sí
  arrastra memoria entre días, que son las dos condiciones que la estadística necesita. **Coste: ya
  no son los ~12 s de `world`**; son las 8 carreras × 4 etapas × 6 semillas de `smallRaces`, cuyo
  coste **se mide en el paso 0** junto con el del propio banco (§7.7). La fila de `smallRaces` en la
  tabla de coste de §7.7 **ya lo incluye**: `trustSpreadEndSeason` es un contador sobre una corrida
  que ya se paga, no una corrida nueva.
- **`world` se queda con el efecto en convocatorias**, `rebelCallupDropPct` **20-60 %** (cuánto le
  cae la convocatoria a un rebelde reincidente a lo largo de la temporada), que es exactamente lo
  que `world` sabe medir: 2 mundos × 25 temporadas, ~12 s, y sin necesidad de que nadie gane una
  etapa. Las bandas y los bancos de las tres estadísticas de R25 están en la tabla del propio
  racimo (§4/R25) y esta fila no las duplica: las cita.

### 7.6 Los invariantes: los 46 de hoy, más 5 de CONTROL y 27 nuevos

**Esta tabla es LA FUENTE ÚNICA de numeración.** Cualquier número de invariante citado en un racimo
de §4 o en un criterio de «hecho» de §8 se lee de aquí, no al revés. Se dice porque una versión
anterior de este documento asignaba el **47** a dos cosas (R01 y R24), el **50** a dos (R04 y R18) y
el **57** a dos (R01 y R09), y el criterio del paso 3 citaba «inv. 47» apuntando a un invariante que
solo nace en el paso 11. Se renumera **una vez**, desde el 47, y las citas de los racimos ya están
corregidas contra esta tabla. La comprobación de arranque: `packages/engine/src/sim/invariants.test.ts`
tiene hoy **46** `it(` —verificado—, así que el 47 arranca donde dice.

**Los cinco de CONTROL van primero, y no miden conducta nueva: vigilan que este trabajo no se salga
de su parcela.** Son el injerto de `dominio` y es lo que a la propuesta base le faltaba: tenía el
listón de coste (el ≤ 8 % agregado de entonces, hoy repartido por pieza y con suma que cuadra en
§7.7) pero no el listón de «esto no ha filtrado a la física».

| #      | Invariante de CONTROL                                                                                                                                       | Cómo se comprueba                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **C1** | **La economía del depósito no se ha movido**: los invariantes 13-20 (erosión y saturación) siguen en banda **con los mismos números**                       | Si una tanda táctica mueve `queenFresh` (0,18-0,50) o `longClassicFresh` (0,45-0,80), **el que está mal es el cambio**. Doctrina explícita, no un «hay que mirarlo». **Y ahora es comprobable, que antes no lo era**: los cinco multiplicadores de coste de este diseño están en UN punto (`tacticalCostMultiplier`, §9.1bis), cuatro de los cinco son de **suma cero por grupo** —redistribuyen, no encarecen— y el quinto (altitud) va en un PR propio con los 13-20 re-medidos y su predicción escrita. C1 se comprueba con dos cifras: los invariantes 13-20 en banda **y** `sumaTacticalCostMultiplierPorGrupo` ≈ 0 (± `tacticalCostSumTol` 0,02). El criterio «`physics.ts` sin tocar (Grep en el diff)» **NO comprueba C1** y por eso deja de ser el criterio del paso 14: `blockCost` vive en `physics.ts`, así que multiplicarlo desde fuera cambia la misma cifra sin que el Grep se entere. |
| **C2** | **La ley de velocidad no se ha movido**: invariante 43 (llana ≤ 48 km/h > media > reina ≥ 32) intacto                                                       | Lo pueden tocar **los pasos 18 (altitud) y 20 (viento)**, y solo esos dos. La versión anterior decía «solo el paso 20», y el propio criterio de «hecho» del paso 18 admitía que la altitud toca el coste: eran dos frases del mismo documento diciendo cosas distintas. La altitud va en un **PR propio** dentro del 18, con el 43 declarado antes y comprobado después, y consta en §9.2 como **excepción declarada a C2**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **C3** | **Los andamios no cambian nada**: los pasos 2 y 4 dejan las **cuatro huellas idénticas dígito a dígito**                                                    | Es la prueba de que el andamiaje no filtra, y lo que hacen posible los subflujos propios (§2.6).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **C4** | **Un campo sin equipos se comporta como antes**: con `teamId: null` en todos, **ninguna** pieza nueva se activa (ni censo, ni árbitro, ni subasta, ni cupo) | Amplía el invariante 24 de hoy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **C5** | **Un director de calidad 1 con información perfecta reproduce la conducta del paso anterior**                                                               | Es el A/B del banco `informacion` (§7.4) y demuestra que R24 es una **capa** y no un cambio encubierto.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

Y los **veinte** de conducta, del **47** al **66** (la numeración sigue a los 46 de hoy). Son veinte
filas y hay que contarlas: la versión anterior decía «quince» sobre esta misma tabla.

| #   | Qué afirma                                                                                                 | Racimo     | Coste |
| --- | ---------------------------------------------------------------------------------------------------------- | ---------- | ----- |
| 47  | **Con las constantes de control, el motor reproduce el paso anterior bloque a bloque**                     | R24        | comp. |
| 48  | Dos compañeros no se disputan un sprint entre ellos (0 %)                                                  | R02        | comp. |
| 49  | La fuga del día no lleva tres de la misma casa (p95 ≤ 2)                                                   | R03        | 240 s |
| 50  | Se persigue lo que hace daño, no lo más adelantado (≥ 85 %)                                                | R04/R20    | comp. |
| 51  | Los cuatro maillots tienen dueño y ninguno se decide por accidente                                         | R05        | 300 s |
| 52  | Nadie paga una pancarta que no disputaba (0)                                                               | R06        | comp. |
| 53  | La fuga en montaña la componen escaladores (≥ 0,50)                                                        | R03        | 300 s |
| 54  | Después del km 100 se sigue intentando algo (≥ 2 intentos)                                                 | R19        | comp. |
| 55  | Una reina **con meta en valle** deja llegar a un grupo, no a un hombre (5-15)                              | R17        | 900 s |
| 56  | El corte de la crono ya no es una salvaguarda dormida (≥ 1 caso)                                           | R11        | comp. |
| 57  | Una carrera pequeña no repite ganador un día sí y otro también (2-12 %)                                    | R09        | 480 s |
| 58  | Ningún equipo con estructura `sprint` convoca un lanzador sin sprinter                                     | R21        | comp. |
| 59  | **Las once** palancas del jugador mueven el resultado (≥ 0,25)                                             | R22        | ~70 s |
| 60  | El abanico tiene autor (≥ 50 %)                                                                            | R15        | 120 s |
| 61  | **`compromisosMasCortosQueSuMinimoPct` = 0**                                                               | R18/método | comp. |
| 62  | Ninguna palanca mueve el puesto medio más de `0,045 · fieldSize`                                           | R22        | comp. |
| 63  | `orderDirection` se cumple en **las once** palancas (tolerancia 0 sobre el efecto **pareado** por semilla) | R22        | comp. |
| 64  | Toda criba narrada dice qué la produjo (0 sin causa)                                                       | R23        | comp. |
| 65  | Las reinas del calendario tienen el desnivel de la carretera (2.800-4.200 m)                               | R28        | comp. |
| 66  | En una etapa tipada de montaña, la última cima está a ≤ 25 km de meta en el p90                            | R28        | comp. |

Y dos más, **baratos, que cazan fugas de estado del propio refactor** y no una conducta del catálogo
(injerto de `datos`, y comparten corrida con invariantes que ya existen):

| #   | Qué afirma                                                              | Por qué                                                                                                                          |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 67  | **Ningún corredor decide con un hueco de antigüedad 0 salvo el propio** | Es el defecto exacto que produce un cableado de creencias a medias: alguien lee `RaceView` en vez de `believe(t)`.               |
| 68  | **A un exceptuado no le persigue nunca su propio equipo**               | Es el defecto exacto que produce un `PlanBinding` mal propagado. **Es el que R01 citaba como «57»**, número que pertenece a R09. |

Y el de determinismo, que deja de ser gratis:

| #   | Qué afirma                                                                                                         | Por qué                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 69  | **Prueba de permutación**: la misma etapa con la lista de corredores permutada da el mismo resultado **bit a bit** | El orden canónico por `riderId` ya existe, pero con censo por equipos, árbitro de casa y turno con orden persistente la invariancia deja de ser automática. |

Y **cuatro que esta revisión añade**, dos de ellos porque eran invariantes huérfanos —declarados
dentro de su racimo con un número que ya estaba usado y ausentes de esta tabla— y dos porque son
guardarraíles de no regresión que no existían:

| #   | Qué afirma                                                                                | Racimo | Coste |
| --- | ----------------------------------------------------------------------------------------- | ------ | ----- |
| 70  | **Nadie tira teniendo un compañero no rebelde delante** (`mateAheadPullPct` ≤ 3 %)        | R01    | comp. |
| 71  | **El turno en cabeza dura ≥ `turnPullKm`·0,5** salvo rotura del que tira                  | R18    | comp. |
| 72  | **Ninguna fuga del día lleva al `gcRank === 1`** (0 %, salvo maillot sin un hombre vivo)  | R03    | comp. |
| 73  | **El maillot no tira del pelotón** (`jerseyOnFrontPct` ≤ 3 % en llanas; ≤ 5 fotos de 637) | R04    | comp. |

**Total: 46 de hoy + 5 de control (C1-C5) + 27 nuevos (47-73) = 78.** El 47 es de R24 y de nadie
más; el 50 es de R04/R20; el 57 es de R09.

«comp.» = comparte corrida con un invariante que ya existe: **no añade coste**.

### 7.7 El coste en minutos de CI: la línea base no existe, y el paso 0 es medirla

**La regla de la casa es presupuesto ≥ 4× el coste MEDIDO en CI**, no estimado: «el ×2,2 era una
estimación» y «el factor se quedó corto por SIETE». Esta sección la incumplía de arriba abajo, y hay
que decirlo antes de escribir un solo número más.

**El 536 s no es una medida de hoy: es un comentario caducado.** Sale de `.github/workflows/ci.yml`
l. 63-65, que dice literalmente «`packages/engine/src/sim/` **3 ficheros, 69 pruebas, 536 s**». Hoy
`test:bancos` es `vitest run packages/engine/src/sim/` (`package.json:21`) y ese directorio tiene
**cinco ficheros de prueba** (`calendarQueens`, `coherence`, `invariants`, `raceRadio`, `world`) sobre
catorce módulos. Y `docs/diseno/mapa-bancos.md:500` lo marca él mismo: «`sim/` = 536 s de 638 s de
suite **(cuando eran 3 ficheros/69 pruebas)**».

**Y la propia fuente que este documento cita lo desmiente por un factor grande.** Los costes MEDIDOS
en el nocturno, sumados desde `invariants.test.ts:244-256` y `mapa-bancos.md` §6:

```
  invariantes (11 filas medidas)   912+435+434+259+218+207+191+88+83+65+24  =  2.916 s
  coherencia (10 filas medidas)    243+172+205+300+634+320+220+71+64+87     =  2.316 s
  calendarQueens (27 × 4)                                        ~840 s CI  =    840 s
  world (2 mundos × 25 temporadas, ×2 brazos)                               =     ~24 s
                                                                  ─────────────────────
                                                        suelo, sin canónicos 1-7  ≈ 6.096 s
```

Seis mil segundos, no quinientos treinta y seis. Los dos números conviven en la misma fuente y este
documento nunca los reconcilió. Y hay una tercera pista de que el 536 está muerto: la propia §7.7
proponía «retirar del CI diurno los invariantes 16 y 20 (**259 s y 434 s**)» —693 s— para aliviar un
job que supuestamente entero dura 536 s. Dos invariantes no pueden costar más que la suite que los
contiene.

**Consecuencia, y es dura: todas las cifras derivadas de esta sección quedan invalidadas.** El
«Total nuevo ≈ 716 s», el «≈ 1.252 s ≈ 21 minutos», el «+8 % ≈ 43 s» y el «`bancos-rapidos` ≈ 420 s»
se calculaban todos sobre 536. Ninguno se conserva.

**Lo que sí se conserva es la lista de añadidos, con sus estimaciones marcadas COMO ESTIMACIONES** y
con la instrucción de sustituirlas por medidas en el paso 0:

| Añadido                                                            | Coste **estimado** (a medir) | De dónde sale la estimación                                                             |
| ------------------------------------------------------------------ | ---------------------------: | --------------------------------------------------------------------------------------- |
| `smallRaces` 8 carreras × 4 etapas × 6 semillas                    |                       ~250 s | 192 etapas de 40-60 corredores; una de 176 cuesta ≈ 2,7 s, escala ≈ lineal con el campo |
| `duelBench` 400 corridas de 2-6 corredores                         |                         ~8 s | trivial                                                                                 |
| `ordersBench` **11** palancas × 2 × 12 semillas, campo de 88       |                        ~70 s | 264 etapas de 88, solo llana canónica                                                   |
| `informacion` 2 brazos × 30 semillas × 2 escenarios                |                       ~175 s | el más caro de los nuevos; compra la reversibilidad del paso 11                         |
| `media-190` en CI, 40 semillas                                     |                       ~115 s | mismo orden que la reina canónica (172 s con 40)                                        |
| `cri-40` con equipos (variante)                                    |                        ~20 s | «una crono cuesta poco»                                                                 |
| llana canónica con `lugar`, ×3 semillas para R14                   |                        ~60 s | v42: el clima está dentro del ruido con 6 semillas                                      |
| `temblor`, invariantes de control C1-C5, los que comparten corrida |                          0 s | contadores sobre escenarios que ya corren                                               |
| Sobrecoste del motor                                               |   **+10 %**, repartido abajo | listón por pieza, ver la tabla siguiente                                                |

**EL PASO 0 ES LA MEDIDA, y ningún paso posterior avanza sin ella.** Concretamente:

1. Correr `pnpm test:bancos` en **CI** con `--reporter=verbose` y publicar el segundo real por
   fichero y por `it`, en `docs/balance.md` **v60 §0**.
2. Correr los cuatro bancos nuevos **vacíos** (sin conducta, solo la maquinaria) y publicar su coste.
3. Medir el sobrecoste del motor (censo + `placement` + fases + creencias) sobre un canónico.
4. **Reescribir esta sección entera con esos números** antes del paso 1.
5. **Regla dura: si un coste medido supera su estimación en más de 2×, el paso que lo introduce se
   para** y se rediseña la pieza o el banco. Es la aplicación literal de «el factor se quedó corto
   por SIETE».

**El presupuesto del sobrecoste del motor, repartido por pieza, porque antes no cuadraba.** La fila
agregada decía «+8 %» y R15 declaraba «≤ 8 % del coste de etapa» **para `placement` solo**, y R01
«≤ 3 %» para el censo: 8 + 3 = 11 antes de contar fases y creencias. Reparto que sí suma:

| Pieza             |     Listón | Plan B si se pasa                                                                             |
| ----------------- | ---------: | --------------------------------------------------------------------------------------------- |
| `placement` (R15) |  **≤ 5 %** | actualizar cada 2 km en vez de cada km (ya estaba escrito)                                    |
| censo (R01)       |  **≤ 3 %** | cachear `teamCensus` por grupo y bloque, recalcular solo al fusionar o partir                 |
| fases (R19)       |  **≤ 1 %** | una comparación por km; si se pasa, la tabla de fases se precalcula por etapa                 |
| creencias (R24)   |  **≤ 1 %** | pasar de por-equipo-y-km a **por equipo y 2 km**, que es la misma degradación que `placement` |
| **Total motor**   | **≤ 10 %** |                                                                                               |

**Y EL COSTE DE PRODUCCIÓN, que esta sección no presupuestaba en absoluto.** El +10 % no se paga solo
en CI: se paga en el simulador que corre las **1.418 etapas del calendario** con tick de producción
(`railway.tick.json`), y `mapa-bancos.md` §4.2 avisa de que «el motor SE HA VUELTO MÁS LENTO… un 48 %
más de trabajo en dos versiones». Así que:

| Fila de producción                             | Hoy                      | Listón después             |
| ---------------------------------------------- | ------------------------ | -------------------------- |
| `msPorEtapaSimulador` (etapa de 176, canónico) | **a medir en el paso 0** | **≤ +10 %** sobre esa foto |
| Tick completo del calendario                   | a medir en el paso 0     | ≤ +10 %                    |

`msPorEtapaSimulador` entra en el criterio de «hecho» de los pasos **2, 11, 14 y 15** —los cuatro que
añaden estado por corredor o por equipo— y **no solo en el listón de CI**. Si se pasa, se aplica el
plan B de la pieza que corresponda.

#### ¿Y la partición del job en dos?

La propuesta era `bancos-rapidos` / `bancos-largos`. **Se mantiene como propuesta, y se le quitan las
dos cosas que la hacían un truco:**

**(a) La composición declarada no cabía en su propio presupuesto.** `bancos-rapidos` incluía
«invariantes 13-14» (**207 + 191 = 398 s medidos**) y «coherencia de llana y reina» (**243 + 172 =
415 s medidos**): **813 s** antes de sumar los canónicos 1-7, `ordersBench`, `duelBench`, los
invariantes 18 y 21-24, `temblor` y `smallRaces` con 2 semillas. El presupuesto declarado era 420 s.
O el job rápido **excluye 13-14 y coherencia** —y entonces **no vigila la erosión en PR**, que es
justo lo que el invariante de control C1 tiene que vigilar en esta tanda— o **no baja el PR a
7 minutos**. Las dos salidas son legítimas; la que no lo es es escribir las dos a la vez. La
recomendación, con la medida delante: **`bancos-rapidos` conserva 13-14** (la erosión es lo que C1
protege y esta tanda la roza en cinco sitios) y **suelta la coherencia de captura y boquete** al
nocturno, y el presupuesto del job rápido se declara **después de medir**, no antes.

**(b) La regla dura obliga a correr el job largo en casi todos los pasos.** «Todo paso que mueva una
banda de `bancos-largos` corre `bancos-largos` antes de mezclar» + la columna «Mueve» de §8, que
lista `grandTour`, `smallTours`, `realQueens` o `calendarQueens` en los pasos **1, 3, 5-19** = **17
de los 21 PR pagan el job largo entero**. Eso **no es un defecto de la partición**: la partición
sigue ganando en los PR que no son de esta tanda —correcciones de UI, de `packages/db`, de la API—.
Pero vender «el PR normal baja de 9 a 7 minutos» **para esta tanda** es falso, y §8 lo dice ahora con
todas las letras: **los 17 pasos marcados corren `bancos-largos`.**

Si el nocturno se cae, las dos salidas honestas por orden de preferencia son: (a) bajar `smallRaces`
de 6 a 4 semillas en el largo; (b) retirar del CI diurno los invariantes 16 y 20 (**259 s y 434 s
medidos**, controles de saturación de movimiento lento) y dejarlos solo en el nocturno. La
deshonesta —ensanchar bandas para correr menos semillas— **no está en la lista**.

---

## 8. Plan de implementación por pasos

**Reglas para todos los pasos**, que son las de la casa: `pnpm typecheck && pnpm test:rapido` en
verde; si toca `packages/engine`, `pnpm test:bancos`; si mueve una banda de `bancos-largos`, se corre
`bancos-largos` **antes de mezclar**; cada cambio de conducta sube `ENGINE_VERSION` (hoy **52**) y su
test en `index.test.ts`, y deja su entrada en `docs/balance.md` (nota **v60**, una subsección por
paso); toda constante nueva en `constants.ts` con su comentario de intención y su marca DERIVADA o
[calibrar]; comentarios y docs en español, UI en inglés. **Un PR por paso, y los que suben
`ENGINE_VERSION` no se juntan entre sí.**

Y **seis** reglas que este documento se aplica a sí mismo:

1. **Ningún paso puede decir «sin tocar bandas» si toca la aduana, el frente o la meta.** La columna
   «Mueve» lista lo exacto, y §9 lo junta todo.
2. **Cada paso declara ANTES de medir qué espera que se mueva y dónde** (§9.3). Re-sellar es
   comprobar una predicción, no anotar una sorpresa. **Y declara sus causas, en plural si son varias**:
   el paso 5 tiene dos —el contrato y el desplazamiento del flujo de `rngTactics`— y las dos van
   escritas y separadas por `rngTactics2` (§2.6, §9.3). Un paso con dos causas y una escrita es un
   re-sellado que no se puede atribuir.
3. **Los 17 pasos marcados con `grandTour`, `smallTours`, `realQueens` o `calendarQueens` en la
   columna «Mueve» corren `bancos-largos` antes de mezclar** —los pasos 1, 3 y del 5 al 19—. Es
   decir: en esta tanda, el PR normal **no** baja a 7 minutos, y §7.7 lo dice sin adornos. La
   partición del job sigue valiendo para los PR que no son de esta tanda.
4. **`msPorEtapaSimulador` es criterio de «hecho» de los pasos 2, 11, 14 y 15** (§7.7): el
   sobrecoste no se paga solo en CI, se paga en el tick de producción que corre 1.418 etapas.
5. **Las migraciones no se revierten.** El `rollback` de un paso es un **feature flag**, no un
   `git revert`. Cada paso que toca `packages/db` declara su flag y su valor por defecto.
6. **Todo paso que cambia el mundo vivo lleva su columna «efecto sobre carreras en curso»** y su
   plan: relleno hacia atrás (`backfill`) o guarda por carrera. Ver §8.3.

| #      | Paso                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Racimos que cierra                                           | Ficheros                                                                                                                                                                                 | Mueve                                                                                                                                                                                                                                                                | Criterio de «hecho»                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Modelo                                                                    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **0**  | **La red de medida, la foto de antes, y LA MEDIDA DEL RELOJ.** (a) **Medir `pnpm test:bancos` en CI con `--reporter=verbose`** y publicar el segundo real por fichero y por `it`: es la línea base que §7.7 no tenía. (b) Medir `msPorEtapaSimulador` y el tick de producción. (c) `sim/smallRaces.ts`, `duelBench.ts`, `ordersBench.ts` (**11 palancas**); `media-190` en CI; `cri-40` con equipos; llana con `lugar`. (d) Portar `medianLeadGroupRiders` a `realQueens` **partida por `queenFinalKind`**. (e) Re-medir `flat.breakawayWinPct` con **300 y 500 semillas** y publicar la nube. (f) Medir `climberWinRateByLastClimbKm` sobre `allCalendarQueens()` —la hipótesis de R28.2, hoy SIN MEDIR—. (g) Medir `gcTtRecoverPerKm` real sobre las 5 cronos. (h) Publicar `gregarioSharePct`, `rejoinAfterBigLossPct` y `gregariosEnPodioPct` **sin banda**. (i) Las 52 estadísticas de §7.5 impresas **SIN banda**; contadores de `temblor`; partición de `ci.yml` **decidida con los números medidos, no antes**. **Y la foto queda ESCRITA**: `docs/balance.md` **v60 §0**, antes de tocar una línea de motor. | ninguno (es la red)                                          | `sim/*`, `ci.yml`, `package.json`, `docs/balance.md`                                                                                                                                     | **nada** (no toca el motor)                                                                                                                                                                                                                                          | `pnpm sim` imprime las **52** con su número de hoy; las cuatro huellas idénticas; **el coste real de `test:bancos` publicado**; la nube de `flat.breakawayWinPct` a 120/300/500 semillas publicada; la v60 §0 publicada                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | **Sonnet** (deja de ser Haiku: siete medidas con criterio, no fontanería) |
| **1**  | **El perfil es la carretera.** `profileGen.normalize()` sin estirar; terreno por SEGMENTO y no por carrera; tipado por pendiente **y contexto**; desnivel de reinas a 3.500-5.000 **conservando la cola baja** (el calendario real tiene reinas de 1.200 m); `queenFinalMix` **solo si la medida (f) del paso 0 encontró la correlación**; pancartas y `feedZones` reales; `neutralKm`; `roadClass`; `roadWidth`; `giros`; sectores de tierra; altitud por cima; las seis carreras sin dato, declaradas. **Sube `ENGINE_VERSION`**: un generador de recorridos distinto es un cambio de conducta de pleno derecho sobre toda etapa de recorrido real, y sin la subida `checkReplay` (`sim/raceRadio.ts:49-55`, que solo compara `snapshotEngineVersion === ENGINE_VERSION`) seguiría declarando fieles unos snapshots que ya no reproducen.                                                                                                                                                                                                                                                                           | **R28** (parcial); habilita R06, R13.4, R15, R17, R19, R20.7 | `world/profileGen.ts`, `featureProfile.ts`, `stage/types.ts`, `constants.ts` (ENGINE_VERSION), inventario de recorridos                                                                  | `realQueens`, `smallTours`, `calendarQueens`, `grandTour`. **NINGUNA huella sellada.**                                                                                                                                                                               | `queenDplusMedian` ∈ 2.800-4.200; `lastClimbToFinishKm` mediana ≤ 8 y p90 ≤ 25; `queenFinalKindMix` ± 0,08 **sobre `allCalendarQueens()`**; **las cuatro huellas idénticas dígito a dígito**. **Y las tres aserciones duras de `calendarQueens.test.ts` que este paso pone en riesgo y que nadie miraba (l. 60, 62, 64): `facil.races > 0` (la banda <1500 m NO se queda vacía), `stats.dPlus.min < 1500`, y `facil.wonFromMovePct > dura.wonFromMovePct + 10`. Más `calendarQueens.breakawayWinPct` ∈ 6-30**, que §9.1 declara CONTROL y que desplazar toda la distribución hacia arriba arrastra hacia el 1,6 % de las reinas de >2.500 m. Si sale, el paso 1 lleva **decisión del dueño propia** antes de mezclarse, no un «se mide y se le enseña». | **Sonnet**                                                                |
| **2**  | **Los contextos viajan, OPCIONALES, y nadie los lee.** `SelfView`/`GroupView`/`RaceView`; `race?` y `memory?` en `StageInput`/`StageOutput`; `census(g)`; `teamId` en `MoveRider`; subflujos nuevos declarados y vacíos. **Cero cambios de conducta.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | ninguno (lo habilita todo)                                   | `stage/tactics.ts`, `finish.ts`, `simulate.ts`, `types.ts`                                                                                                                               | **nada**                                                                                                                                                                                                                                                             | Las cuatro huellas **idénticas dígito a dígito**; los 46 invariantes verdes; **C3** y **C4** en verde; `censusCost` ≤ 3 %; prueba de permutación (inv. 69) en verde; un test que afirma que `GroupView.mates` está poblado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | **Sonnet**                                                                |
| **3**  | **R01 + el cambio de tres líneas.** `matesAhead`/`matesBehind` generalizados al pelotón y a cualquier carta; el satélite (R01.6); `PlanBinding` de cuatro estados; `followProbability = 0` entre compañeros.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | **R01**, y siete situaciones de R02                          | `simulate.ts` (`relayTurn`, `sittingOn`, `manUpTheRoad`), `tactics.ts`                                                                                                                   | huellas 4/4 · `chronicle.teamPullFlatPct` · `flat.*`                                                                                                                                                                                                                 | `mateAheadPullPct` ≤ 3 % (**inv. 70**, no el 47: el 47 es de R24 y nace en el paso 11); inv. **68** verde; `satelliteTowPct` ≥ 60 %; los 15 IDs de R01 con su caso de prueba; **C1 y C2 verdes**; **la rama de etapa del rescate conserva las cuatro puertas de la v37** (percance ∧ carta del día ∧ gran favorito ∧ ≤ 60 s) y `mateBehindGapS` sigue en 22                                                                                                                                                                                                                                                                                                                                                                                             | **Sonnet**                                                                |
| **4**  | **Las clasificaciones y la memoria existen.** `db/classifications.ts` (puntos, montaña, joven, equipos) leyendo el `raceGc` que **ya acumula** `puntosVolante` y `puntosMontana`; `StandingRow[]` en `StageRider`; `RaceMemory` y `RaceShape` construidos por `packages/db`. **Nadie los lee todavía.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | ninguno (habilita R05, R06, R07, R09, R10, R26, R28)         | `packages/db/*`, `stage/types.ts`, `schema.ts` (migración)                                                                                                                               | **nada** en el motor; sí el esquema                                                                                                                                                                                                                                  | Las cuatro huellas idénticas; las cuatro tablas cuadran contra los eventos congelados de una gran vuelta; **C3 en verde**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | **Haiku**                                                                 |
| **5**  | **R19 — las fases, y el fin de los dos apagones.** Tabla de fases; se retira `tacticMaxMoves`; `closingNow` deja de vetar y pasa a precio; ventana de captura; flyer; puente desde atrás; etapa corta de montaña. **Y los escenarios sintéticos ganan `race`: el RE-SELLADO DE CONTRATO, una vez.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | **R19**                                                      | `tactics.ts`, `simulate.ts`, `constants.ts`, `sim/scenarios.ts`                                                                                                                          | huellas 4/4 (**re-sellado con DOS causas declaradas**) · `flat.breakawayWinPct` · `flat.catchKmToFinish` · `mountain.*`                                                                                                                                              | `attemptsAfterKm100` ≥ 2 (inv. 54); Race Almeria e1 deja de tener «cuatro intentos y ni uno más»; `counterAfterCatchPct` ∈ 25-60 %; `flat.breakawayWinPct` **medido con 300 semillas y re-decidido con el dueño**, no «sigue en 5-16» a ciegas; **`rngTactics2` estrenado y comprobado**: con `race` ausente y `rngTactics2` apagado, las cuatro huellas salen **idénticas al paso 4 dígito a dígito** (es lo que separa las dos causas del re-sellado, §9.3), y `rngTactics` no se corre porque los dos vetos de hoy vetan antes de tirar (`simulate.ts:4460` y `:4755`)                                                                                                                                                                               | **Sonnet**                                                                |
| **6**  | **R03 + R04 — la aduana y la general virtual.** `customs()` con `customsBase = 0,30` como hipótesis nula; cupo por equipo; `breakScore` por terreno; infiltrado; `virtualGc`, `costToMyMan`, `leash` sobre el terreno restante; maillot prestado; maillot sin equipo; ceder el maillot.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | **R03**, **R04**                                             | `tactics.ts`, `teamPlan.ts`, `simulate.ts`                                                                                                                                               | huellas 4/4 · `flat.breakawayWinPct` · `mountain.breakawayWinPct` · `calendarQueens` · `smallTours.flatMoveWorstMarginS` · **`smallTours.photoRepeatTopFive` y `smallTours.bestSprinterWinPct`** (las dos que el `breakScore` por terreno puso en rojo en la v44 §1) | **A/B obligatorio y ejecutable**: con todos los votos a 0, `P(allowed) = customsBase = 0,30` reproduce el paso 5 (R03.3). `breakTeamMaxShare` p95 ≤ 2 (inv. 49); `breakClimberShare` ≥ 0,50 (inv. 53); `jerseyInBreakPct` = 0 (inv. 72); `leashSpanS` ≥ 400 s; **`jerseyOnFrontPct` ≤ 3 % en llanas y ≤ 5 fotos de 637** (inv. 73: R04.5 se mezcla en este paso y el maillot sin equipo es donde se regresa S-129; sin esta cifra el paso 6 podría darse por hecho con el líder tirando del pelotón otra vez); **`breakBirthKm` mediana ∈ 1-12 km** (que la rampa siga viva tras sacarla de los dos lados de la comparación); **predicción declarada: la foto de meta de las carreras pequeñas NO vuelve a rojo**                                       | **Sonnet**                                                                |
| **7**  | **R02 + R18 — el equipo dentro del grupo, y el turno con orden.** `teamTurn` + `arbitrate` con los ocho cupos; un instigador por casa; `finish.ts` recibe `teamOf`; cola de turno con duración y orden; asimetría del mejor rematador; ruptura a 8 km; solitario que dosifica; cupo por equipos; **grupo de líderes sin gregarios (S-308)**; `commitMinKm` + `commitHysteresisMargin`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | **R02**, **R18**                                             | `tactics.ts`, `finish.ts`, `simulate.ts`                                                                                                                                                 | huellas 4/4 · `mountain.top10GapSeconds` · `smallTours.*` · `medianLeadGroupRiders` · **`chronicle.teamPullFlatPct`**                                                                                                                                                | `mateVsMateSprintPct` ≤ 2 % (inv. 48); `pairEdgePct` ∈ 72-88 %; `leadersGroupRelayPct` ≤ 15 %; `topTenRelayWhileGapPct` ≥ 50 %; `jerseyPullShareInDuel` ≤ 20 %; `compromisosMasCortosQueSuMinimoPct` = 0 (inv. 61) **con su COBERTURA publicada al lado** (ver aviso); **`oscilacionesAB` ≤ 5 %**; **la guarda de la v38 se retira con su regresión medida**: `chronicle.teamPullFlatPct` en banda **y** `breakNoRelayByOwnTeamPct` (fugados que dejan de relevar en su PROPIA fuga porque su equipo tiene «un hombre delante» —él mismo—) **= 0 %**                                                                                                                                                                                                    | **Sonnet**                                                                |
| **8**  | **R21 + R17 — estructura, carta del día y el final real.** `TeamStructure` en `packages/db` (convocatoria con composición); `autoOrders` lee `deriveFinishTerrain` en vez de `stage.kind`; el exceptuado; herencia de carta EN CARRETERA; `finishType` gana `muro` (**cambio de contrato, §9.6**); `launchBias` corregido contra la convención de §3.2; `finishPaveKm` 30→10 (decisión 18); **se retira `contestClimbs: mountain` del maillot** (`autoOrders.ts:149`, decisión de la v42) con su efecto declarado en `komJerseyContestedPct`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | **R21**, **R17**                                             | `world/callups.ts`, `world/autoOrders.ts`, `teamPlan.ts`, `finish.ts`, `packages/db/*`                                                                                                   | huellas 4/4 · `smallTours.bestSprinterWinPct` · `sweepPct` · `photoRepeatTopFive` · `gregarioSharePct`                                                                                                                                                               | `structureFitPct` ≥ 95 % (inv. 58); `roleFromFinishPct` ≥ 85 %; ningún lanzador sin sprinter en 8 carreras × 6 semillas; **`gregariosEnPodioPct` ≤ 30 %** (el número que dejó la v48 al arreglar «no tiene sentido que luchen el sprint 2 del mismo equipo»); **los cinco recorridos de pavé re-tipados**: Roubaix sigue `pave`, el Ronde sigue sin serlo. **`gregarioSharePct` se PUBLICA, sin banda**: es una pregunta que la bitácora deja abierta (§14 punto 14, v48 §4: «otra pregunta… este banco la deja a la vista sin contestarla»), no un objetivo, y su 45-65 % va a §10 como **[DECISIÓN DEL DUEÑO 21]**, no como criterio de «hecho». Si el reparto no se mueve tras R17.1, la causa era otra: se busca, no se ensancha                    | **Sonnet**                                                                |
| **9**  | **R20 + R05 — la subasta del frente y los once motivos.** `frontAuction` con alianzas, pulso y gorrones; `PURPOSE_CLAIM`; `intentFor` de los siete motivos nuevos; `target(t)` (S-176); cazar cuesta corredores; `roadFactor`; `mainId` sustituye a `peloton` en D-41/D-42.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | **R20**, **R05**                                             | `teamPlan.ts`, `simulate.ts`, `chase.ts`                                                                                                                                                 | huellas 4/4 · `chronicle.frontTeamsPerStage` · `teamPullFlatPct` · `flat.*`                                                                                                                                                                                          | `chaseTargetCorrectPct` ≥ 85 % (inv. 50); `frontTeamsPerStage` ∈ 2,2-4,5; **`chaseCostShare` (Gini) ∈ 0,25-0,55**; `motivePct` ∈ 65-90 % (inv. 51); `standoffGapGainS` ∈ 40-200 s                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | **Sonnet**                                                                |
| **10** | **R06 + R07 + R26 — pancartas, bonificaciones y el grupeto con apuesta.** `banners.ts`; acelerón y ventana de alivio; **`contestClimbs` respetado**; bonificaciones de pancarta; grupeto con capo, estimación con error y **readmisión por número**; grupeto voluntario; se criban **todos** los `shed`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | **R06**, **R07**, **R26**                                    | `stage/banners.ts` (nuevo), `simulate.ts`, `applyStageTimeCut`                                                                                                                           | huellas 4/4 · `grandTour.queenLastGroupPct` · `realQueens.lastGroupPct` · `outOfTimePct`                                                                                                                                                                             | `bannerContestants` ∈ 3-15 (inv. 52); `bannerCostOnUninterested` = 0; `grupetoMarginS` ∈ 60-420 s; la cola de la reina **medida y declarada** (decisión nº 6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | **Sonnet**                                                                |
| **11** | **R24 — el director falible, con brazo de control.** `belief.ts`: `dirQuality`, retardo, redondeo, error, **sesgo**; noticia tardía y mala; `readState` con disimulo; capitán de ruta; órdenes malas. **Y el banco `informacion` de dos brazos.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | **R24**; habilita R12 y R13                                  | `stage/belief.ts` (nuevo), `simulate.ts`, `teamPlan.ts`, `autoOrders.ts`, `sim/informacion.ts`                                                                                           | huellas 4/4 · `flat.catchKmToFinish` · `capturePct` · **todas** las de caza                                                                                                                                                                                          | **Invariante 47 duro**: el brazo de control reproduce el paso 10 **bloque a bloque**. `catchKmSd` ≥ 4 km (banda del banco `informacion`, brazo real); `catchLatePct` ∈ 8-25 % real / 0-3 % control; `qualityGradient` ∈ 1,25-1,80×                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | **Sonnet**                                                                |
| **14** | **R15a — la colocación existe.** (**SE ADELANTA delante del 12 y del 13**, y hay que decir por qué: R12.6 —el tapón— define a los afectados como «los de `placement ∈ [p_caído, p_caído + taponShare]`» y lleva escrito «Depende de R15»; y R11.1 tiene el término `mishapPlacementGain (0,5)·placement`. Los dos leían un estado que no existía hasta este paso. El orden pasa a ser **11 → 14 → 12 → 13 → 15**.) `placement.ts` (por km); acordeón **de suma cero por grupo**; el abanico deja de ser un dado y **gana autor** (R15a.3b); sprint y encajonamiento; el último giro; la rueda que eliges; sectores con λ escalada por posición; el bajador; el año de contrato.                                                                                                                                                                                                                                                                                                                                                                                                                                       | **R15a**                                                     | `stage/placement.ts` (nuevo), `simulate.ts`, `finish.ts`                                                                                                                                 | huellas 4/4 · `flat.bestSprinterWinPct` · `photoRepeatTopFive` · pavé (inv. 44) · **`erosion.*` re-medidas con predicción escrita (§9.1bis)**                                                                                                                        | `boxedLossPct` ∈ 8-25 %; `echelonByDecisionPct` ≥ 50 % (inv. 60); `placementCostShare` ∈ 5-20 %; `placementCost` ≤ 5 %; `msPorEtapaSimulador` ≤ +10 %; **`shelteredLeaderSavingPct` ≤ 3 %** (el guardarraíl de la cita de la v38); **los invariantes 13-20 en verde CON LOS MISMOS NÚMEROS** y `sumaTacticalCostMultiplierPorGrupo` ≈ 0 — **éste es el criterio, no «`physics.ts` sin tocar (Grep en el diff)»**, que no comprueba nada porque `blockCost` vive ahí y se multiplica desde fuera                                                                                                                                                                                                                                                         | **Opus**                                                                  |
| **12** | **R13 + R12 — hundimiento observable, tregua pedida y rescate.** `bloodGain` sobre `readState`; el gregario que se aparta al VER; pájara del que tira; comer y la parada con autor; tregua pedida/concedida/negada; emboscada con precio; **rescate escalonado y la puerta del `mov`**; regla de los 3 km; tapón.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | **R13**, **R12**                                             | `simulate.ts`, `belief.ts`                                                                                                                                                               | huellas 4/4 · `mountain.top10GapSeconds` · `grandTour.abandonPct`                                                                                                                                                                                                    | `attacksWhenLeaderCracks` ∈ 1,5-3,5×; `truceGrantedPct` ∈ 50-85 %; `rescueSuccessPct` ∈ 55-80 %; **`rescueInMovePct` ≥ 25 %** (hoy 0 %)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | **Sonnet**                                                                |
| **13** | **R11 — percances y coche.** `mishap.ts`; caravana con orden por general y reordenación; ascensor; asistencia neutra; bici del gregario; incidentes en la crono.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | **R11**                                                      | `stage/mishap.ts` (nuevo), `simulate.ts`, `timetrial.ts`                                                                                                                                 | huellas 4/4 · `timetrial.test.ts` · `abandonCauses.*`                                                                                                                                                                                                                | `mishapsPerStage` en banda; `ttIncidentPct` ∈ 1-4 % (inv. 56); `convoyAdvantageS` ∈ 20-45 s; **inv. 44 (pavés 5-12 %) SIGUE EN VERDE** (los pinchazos no son bajas, y se comprueba); **el invariante 11 se RETIRA con causa escrita** y se sustituye por el 56 más las bandas `ttOutOfTimePct` 0-2 % y `ttReadmittedPct` 0-2 % (§9.2): su tolerancia cero y el 56 son afirmaciones incompatibles                                                                                                                                                                                                                                                                                                                                                        | **Sonnet**                                                                |
| **15** | **R16 + R15b — el tren como submotor y colocar cuesta.** `SprintTrain` con estado y ascensos; `chaseField` recalculado; trenes que se estorban; sprinter sin tren; dónde se abre según el viento; colocar cuesta km y cerillos; pelea por el sitio; abrir el hueco a propósito.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | **R16**, **R15b**                                            | `stage/train.ts` (nuevo), `placement.ts`, `finish.ts`                                                                                                                                    | huellas 4/4 · `flat.bestSprinterWinPct` · `smallTours.*`                                                                                                                                                                                                             | `trainsPerBunchFinish` ∈ 2-5; `trainBrokenPct` ∈ 20-55 %; `leadOutWinShare` ∈ 1,4-2,5×; `frontOwnerAt8kmPct` ∈ 55-90 %                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | **Sonnet**                                                                |
| **16** | **R09 + R10 + R25 — memoria, plan de varios días y precio de obedecer.** `RaceMemory` leída de verdad; humor con causa y dado a la mitad; deuda de relevos y tratos; desesperación; rivalidades; `RacePlan` con `dayWeight`; `trust` y `morale` movidos; reconocimiento por tramo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | **R09**, **R10**, **R25**                                    | `teamPlan.ts`, `simulate.ts`, `packages/db/*`, `world/callups.ts`                                                                                                                        | huellas 4/4 · `smallTours.sameWinnerPairPct` · `sweepPct` · `world.*` · **`smallRaces.*`** (es donde vive `trustSpreadEndSeason`, §7.5)                                                                                                                              | `sameWinnerNextDayPct` ∈ 2-12 % (inv. 57); `moodExplainedPct` ≥ 60 %; **`moodSpreadS` ≥ 3 km/h** (el guardarraíl de no encoger el dado de más); `budgetSpentOnMarkedPct` ∈ 25-55 %; `trustSpreadEndSeason` ≥ 12                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | **Sonnet**                                                                |
| **17** | **R22 + R23 — órdenes del jugador y relato. SE PARTE EN CUATRO PR**, porque cruza cuatro paquetes (motor, base de datos con migración, API y web), cierra 49 situaciones y reescribe el informe: nadie revisa eso entero con criterio. **17a** contratos + migración de `stage_orders` + UI de las cuatro palancas nuevas, **sin efecto en el motor** (`ENGINE_VERSION` no sube). **17b** el motor LEE **las cuatro palancas NUEVAS** —las once del contrato menos las siete que ya lee (§6.2, §9.6)— + `effort` en cuatro sitios + `autoOrders` invertido + nadie es jefe sin quererlo + desempate de dos líderes + `TeamDayPolicy` + R22.J/R22.K, con `ordersBench` de once palancas midiendo suelo, techo y dirección. **17c** R23 crónica: `pullMotive` nuevos, `costsToTeams`, causa de la criba, el tope de tres protagonistas. **17d** el informe deja de re-simular, cruza orden con hecho y el aviso etapa a etapa.                                                                                                                                                                                          | **R22**, **R23**                                             | 17a: `contracts.ts`, `schema.ts`, `apps/web` · 17b: `types.ts`, `autoOrders.ts`, `stageRun.ts`, `teamPlan.ts` · 17c: `simulate.ts`, `raceRadio` · 17d: `apps/api`, `domain/dashboard.ts` | 17a: **nada** · 17b: huellas 4/4 · 17c: `raceRadio.test.ts` · coherencia · 17d: nada                                                                                                                                                                                 | 17a: huellas idénticas, migración aplicada sobre base vacía y sobre base con datos · 17b: `orderEffectSpread` ≥ 0,25 (inv. 59); **`orderMaxEffect` ≤ 0,045·fieldSize** (inv. 62); **`orderDirection` tolerancia 0 sobre el efecto pareado** (inv. 63) · 17c: `cribaSinCausa` = 0 (inv. 64); `ataqueSinCerrar` **baja a 0** · 17d: un informe de la v52 se lee igual con el motor de la v74                                                                                                                                                                                                                                                                                                                                                              | **Sonnet**                                                                |
| **18** | **R08 + R28 — depósito entre etapas y el resto del formato. SE PARTE EN CUATRO PR**, porque metía cinco subsistemas, un formato de carrera nuevo y un cambio de física en un único PR con una sola subida de `ENGINE_VERSION`, y eso destruye la atribución que todo este documento defiende. **18a** R08 entero: parte del equipo, depósito entre etapas, el líder dosifica la vuelta, ritmo de competición, la cuneta con el coche. **18b** formatos SIN física: última etapa, etapa 1 con general, circuito, semietapa, dos carreras a la vez. **18c** `nationalBlocs` —**532 de las 1.418 etapas del calendario**, o sea más de un tercio: merece PR propio—. **18d** **altitud**, con `physics.ts` editado, `ENGINE_VERSION++` propio y su medición declarada: es la **excepción a C2** y consta como tal en §9.2.                                                                                                                                                                                                                                                                                               | **R08**, **R28** (resto)                                     | 18a-c: `packages/db/*`, `teamPlan.ts`, `simulate.ts` · 18d: `physics.ts`                                                                                                                 | huellas 4/4 · `grandTour.*` · `realQueens.*`                                                                                                                                                                                                                         | 18a: `frontTeamRotationDays` ≥ 8; `jerseyTeamFadeDay` ∈ 9-18 · 18b: la etapa 1 deja de apagar los tres frenos · 18c: `nationalBlocControlPct` medido · 18d: **inv. 43 declarado antes y comprobado después**, invariantes 13-20 re-medidos con predicción escrita, y C2 declarado movido                                                                                                                                                                                                                                                                                                                                                                                                                                                                | **Sonnet**, salvo **18d: Opus**                                           |
| **19** | **R27 — la crono como modo.** Dosificación ordenable; referencias del rival e intervalos desiguales; el alcance asimétrico; marcar tiempo; cambio de bici planeado; siembra por ranking; lotería del horario.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | **R27** (sin CRE)                                            | `timetrial.ts`, `startOrder.ts`, `types.ts`, `sim/scenarios.ts`                                                                                                                          | `timetrial.test.ts` (la huella; **no** la invariante de la rampa) · `timeTrials.*`                                                                                                                                                                                   | `ttPacingSpreadS` ∈ 15-35 s; `ttBlowUpPct` ∈ 10-30 %; **`tailPct`, `worstStagePct` y `specialistWinPct` siguen en banda**; «la rampa no da tiempo» sigue verde                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | **Sonnet**                                                                |
| **20** | **R14 — meteorología con previsión.** _(opcional, [DECISIÓN DEL DUEÑO 7])_ Viento con dirección; el abanico se cierra; lluvia que llega; material; parte citable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | **R14**                                                      | `weather.ts`, `physics.ts`, `simulate.ts`                                                                                                                                                | **huellas 4/4** · **la ley de velocidad (inv. 43)** y **todas** las bandas                                                                                                                                                                                           | `echelonClosedPct` ∈ 30-70 %; `windDayGapS` ∈ 1,5-4×; inv. 43 **re-anclado con causa escrita**; C2 se declara movido, con su predicción cumplida                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | **Opus**                                                                  |
| **21** | **Calibrar y sellar.** Barrido de las constantes [calibrar]; las bandas de §9 escritas en `targets.ts`; `mountain.breakawayWinPct` re-anclada; nota v60 con tablas antes/después por paso; SPEC §6 reescrito a lo implementado; se retiran los comentarios desfasados que `mapa-bancos.md` §8 enumera.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | —                                                            | `sim/targets.ts`, `docs/balance.md`, `SPEC.md`, `constants.ts`                                                                                                                           | todas, de forma declarada                                                                                                                                                                                                                                            | `pnpm sim 500` sin ningún objetivo fuera de banda; las **52** estadísticas de §7.5 **con banda escrita** (o publicadas sin banda, con su motivo, las que §10 deja como decisión); ninguna constante sigue marcada [calibrar] sin número medido o sin decisión del dueño anotada; **el Apéndice B re-sumado contra `constants.ts` de verdad**                                                                                                                                                                                                                                                                                                                                                                                                            | **Sonnet**                                                                |

**Sobre el reparto de modelo.** **Opus** en los pasos 14, **18d** y 20: los tres tocan un estado
nuevo por corredor (14) o el coste del bloque dentro de `physics.ts` (18d, 20), y los tres exigen
razonar el coste de CI y la interacción con la criba **mientras se escribe**. El paso 4 es **Haiku**:
fontanería sin decisiones —cuatro tablas acumuladas que ya sabemos ordenar—. **El paso 0 deja de ser
Haiku y pasa a Sonnet**: ya no es «montar bancos», son siete medidas con criterio (el reloj de CI, la
nube de `flat.breakawayWinPct` a tres tamaños de muestra, la correlación que R28.2 da por hecha sin
tenerla, `gcTtRecoverPerKm` real) de las que cuelga el resto del plan. Todo lo demás es **Sonnet**:
reglas locales con contrato escrito, criterio de «hecho» numérico y ficheros nombrados.

**AVISO DEL PASO 7 — el invariante 61 nace medio vacío, y hay que decirlo con un número al lado.**
§7.4 y el criterio del paso 7 apuntan aquí, y esto es lo que apuntaban. R18.9 dice que «toda decisión
con compromiso —turno, intención de equipo, **frente**, **marcaje**, **tren**— lleva `commitMinKm`»,
con la tabla `turno 0,3-0,6 · frente 3 · marcaje 2 · fuga 5 · tren 1`. Pero de esas cinco clases de
compromiso **solo dos existen en el paso 7**: la subasta del frente es el paso 9 (R20.2 es quien usa
`commitMinKm['frente'] = 3`), el marcaje emergente entra con R13 en el paso 12, y el tren es el
paso 15 (R16). O sea que un `compromisosMasCortosQueSuMinimoPct` = 0 medido en el paso 7 **no dice
«no hay temblor»: dice «todavía no hay casi nada que vigilar»**, y leerlo como lo primero es la forma
exacta de dar por bueno un guardarraíl que aún no guarda nada.

Por eso el invariante 61 **se amplía por pasos, y publica su COBERTURA al lado del cero**:

| Paso   | Clases de compromiso vigiladas                 | Cobertura declarada                       |
| ------ | ---------------------------------------------- | ----------------------------------------- |
| **7**  | turno (`turnPullKm`·0,5) e intención de equipo | **2 de 5**                                |
| **9**  | + frente (subasta de R20.2) y alianza (R20.4)  | **3 de 5** (la alianza cuelga del frente) |
| **12** | + marcaje emergente (R13/R18.8)                | **4 de 5**                                |
| **15** | + tren (R16, `Train` con `kind`)               | **5 de 5**                                |

`cobertura61Pct` = compromisos vigilados / compromisos vivos, **impresa junto al 0 % en los cuatro
pasos**, y es criterio de «hecho» de los cuatro. En el paso 15 tiene que valer **100 %**: si no, hay
una clase de compromiso que nadie mide y `commitMinKm` ha dejado de ser «una sola constante con
histéresis única», que es lo que R18.9 promete. Y consecuencia honesta de esto, que también va
escrita: **`commitMinKm` se retoca al menos tres veces** —en el 7 con dos clases medidas, en el 9 con
cuatro y en el 15 con cinco—, así que su valor final es el del paso 15 y los tres anteriores son
provisionales. Un número que se toca tres veces no es un número calibrado hasta la tercera.

### 8.1 El orden, y por qué es ése

```
0 ──► 1 ──► 2 ──┬──► 3 ──► 6 ──► 7 ──► 9
                │         ▲       ▲
                ├──► 4 ───┘       │
                │                 │
                ├──► 5 ───────────┘
                │
                ├──► 8 ──────────────► 15
                ├──► 11 ──► 14 ──► 12 ──► 13
                │            └──────────► 15
                └──► 10, 16, 17a-d, 18a-d, 19, 20  ──► 21
```

**El 14 sube delante del 12 y del 13**, y no es un detalle de orden: R12.6 (el tapón) reparte
afectados por `placement` y su propio texto dice «Depende de R15», y R11.1 lleva el término
`mishapPlacementGain · placement`. Con el orden anterior las dos leían un estado que no existía. La
alternativa —partir R12.6 y el término de posición de R11.1 y llevarlos al 14 con línea propia— era
peor: partía dos reglas en dos PR distintos por no mover una fila de la tabla.

- **0 antes que todo**, porque es la lección de `docs/tactica.md` §4: el banco no reproduce lo que el
  dueño ve, y sin el banco pequeño no se sabe si un cambio arregla algo. Y la foto queda **escrita en
  la bitácora**, no solo impresa: es la línea base contra la que se compara cada paso.
- **1 antes que cualquier regla de montaña**, porque S-451 y S-486 son bloqueantes declarados por el
  propio catálogo: «mientras eso siga así, S-443, S-367 y S-164 no se pueden medir». Y puede ir
  primero **y en verde** porque las cuatro huellas viven en escenarios sintéticos.
- **2 es el diff mínimo que abre el máximo**: no cambia una conducta y habilita R01, R02, R03, R04,
  R17, R18, R20 y R24 —ocho racimos, 160 situaciones—. Es el paso que este documento defendería si
  solo se pudiera hacer uno.
- **5 antes que 6**, porque la aduana revisable no sirve de nada mientras `tacticMaxMoves` y
  `closingNow` apaguen la capa: se estaría midiendo un voto que nadie puede ejercer. Y es el paso que
  lleva el **re-sellado de contrato**, porque es donde los sintéticos ganan `race`.
- **11 antes que 12**, porque la tregua y el rescate se deciden sobre información equivocada. Ponerlos
  con información perfecta y luego romperla es hacer el trabajo dos veces.
- **14 antes que 15**, porque el tren necesita `placement` para estorbarse; **y 14 antes que 12 y 13**,
  porque el tapón y el dado de percance leen `placement` (R12.6 lo dice en su propio texto).
- **20 el último y opcional**, porque es el único que toca **la ley de velocidad** (`targetSpeed`).
  No es el único que toca `physics.ts` —el 18 la edita por la altitud— ni el único que modula el coste
  del bloque —son cinco, listados en §9.1bis—, pero sí el único que mueve la ley, y por eso mueve las
  cuatro huellas y el invariante 43 de golpe.

### 8.2 Qué se puede parar, y dónde

Si hay que parar antes de tiempo, hay **tres cortes limpios**:

| Corte               | Qué queda hecho                                                                     | Qué contesta                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Tras el paso 7**  | R01+R02+R03+R04+R17(parcial)+R18+R19+R28(parcial) = **8 racimos, ~155 situaciones** | **Las seis quejas originales del dueño**, y **10** de las 20 más graves. Es el corte recomendado si hay que elegir uno. |
| **Tras el paso 12** | 16 racimos, y **la capa de información entera**                                     | **17** de las 20 más graves.                                                                                            |
| **Tras el paso 19** | Todo menos el clima con dirección (R14)                                             | 20 de 20.                                                                                                               |

**Las cuentas, rehechas contra la columna «Paso» del Apéndice A**, porque las anteriores estaban
infladas. En pasos ≤ 7 mueren S-451(1), S-486(1), S-285(3 y 7), S-308(7), S-433(6), S-114(6),
S-083(6), S-391(6), S-444(5) y S-487(5) = **10**, no 12. En pasos ≤ 12 siguen abiertas S-155(14),
S-031(10 y 17) y S-222(13) = **17** cerradas, no 18.

**Y como el corte tras el paso 7 es el recomendado, van por nombre las diez que quedan vivas en él**,
que es lo que el que decide parar necesita saber: **S-176** (el pelotón que no sabe a quién persigue,
paso 9), **S-047** (roles consistentes, 8), **S-162** (el vocabulario de motivos, 9), **S-155** (el
abanico como decisión, 14), **S-031** (las órdenes sobre objetivos parciales, 10 y 17), **S-269** (el
día que el favorito se rompe, 12), **S-458** (el hueco de hace un kilómetro, 11), **S-222** (el coche
de equipo, 13), **S-478** (el percance se sabe tarde, 11 y 12) y **S-488** (lo que se ve del rival,
11 y 12).

Ninguno de los tres cortes deja el motor peor que hoy ni a medio camino de una pieza: cada paso es un
PR verde, revisable solo, con su banda y su causa escrita.

### 8.3 El mundo vivo, y que las migraciones no se revierten

Este plan no decía una palabra de las carreras **en curso**, en un juego que avanza un día cada seis
horas (`railway.tick.json`) y cuyas migraciones son de una sola dirección (el job `migrations` de
`ci.yml` valida idempotencia **hacia adelante** sobre base vacía). Cuatro pasos cambian lo que una
carrera ya empezada ve a mitad de camino:

| Paso    | Qué cambia en el mundo vivo               | Qué ve una vuelta de 21 etapas que va por la 12 el día del despliegue                                            | Plan                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**   | el generador de recorridos                | las etapas 13-21 de esa carrera tienen perfil NUEVO y las 1-12 el viejo: la vuelta cambia de carácter a mitad    | **Guarda por carrera**: `raceId` cuyo `startedAt` es anterior a la versión X conserva su perfil generado, que ya está persistido. Los recorridos se generan al crear la carrera, no al correr la etapa, así que el perfil viejo **ya está en la base** y basta con no regenerarlo.                                                                                                                                      |
| **4**   | `race_classifications` y `team_race_plan` | las cuatro clasificaciones arrancan **en cero** el día 12, y la del maillot de puntos dice que nadie ha puntuado | **Relleno hacia atrás obligatorio**: `packages/db` reconstruye las cuatro tablas leyendo los `stage_snapshots` de las etapas 1-11, que ya llevan los eventos de pancarta. Es el mismo código que R09 usa para `RaceMemory`, corrido una vez sobre el histórico. Si una carrera no tiene snapshots suficientes, arranca **sin** `race` (la regla de compatibilidad de §1.2 lo permite) y corre como hoy hasta que acabe. |
| **16**  | `RaceMemory` leída de verdad              | el día 12 el pelotón «no recuerda» nada de los once días anteriores                                              | Igual: relleno hacia atrás desde `stage_snapshots`. Y si falta, `memory` queda `undefined` y el motor corre como hoy: **es opcional por construcción**, y ésta es la razón por la que lo es.                                                                                                                                                                                                                            |
| **17a** | migración de `stage_orders`               | las hojas de órdenes guardadas no tienen los cuatro campos nuevos                                                | Columnas **nullable** con defecto `NULL` = «no hay preferencia», que es exactamente la conducta de hoy. Cero relleno necesario.                                                                                                                                                                                                                                                                                         |

**Y la regla que faltaba, escrita:** el `rollback` de cualquiera de estos pasos **no es un `git
revert`** —la migración ya está aplicada y no se deshace— **sino un feature flag**. Cada paso que
toca `packages/db` declara el suyo (`FEATURE_CLASSIFICATIONS`, `FEATURE_RACE_MEMORY`,
`FEATURE_NEW_PROFILE`) con valor por defecto **apagado** hasta que el paso pasa su criterio de
«hecho» en producción, no solo en CI.

---

## 9. Lo que esto mueve y hay que decidir en bloque

**Tabla única. Nada de lo que sigue se toca en silencio.** El dueño dijo que las bandas se deciden
juntas y al final, y que él no las creó; por eso este diseño propone lo correcto y **lista aquí todo
lo que eso mueve**, con el valor de hoy al lado.

### 9.1 Bandas de `sim/targets.ts`

| Banda                                               | Hoy                     | Propuesto                                                                                      | Paso            | Por qué                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`flat.breakawayWinPct`**                          | 5-16                    | **suelo 5 CONTROL; techo 16 se RE-MIDE en el paso 0 y se RE-DECIDE con el dueño en el paso 6** | 0, 5, 6         | **El suelo no se mueve y el techo no es lo que parece, y la distinción importa.** El **suelo** es del dueño y es CONTROL: «incluso 2-10 % no me parece muy justa… una etapa llana debería tener una banda más centrada en el 10 %» (v38); si la aduana por voto tira la fuga por debajo del 5 %, **el que está mal es el cambio**, no la banda, y ésa es la hipótesis nula de `customsBase = 0,30`. El **techo**, en cambio, su propia fuente lo describe como artefacto: `targets.ts` dice que se ensanchó en la v33 **«por MUESTREO (120 semillas dan 10,00 %, 300 dan 6,33 %, 500 dan 4,20 %; σ≈2,2 puntos)»** y que **«el techo describe el tamaño de la muestra, no la carrera»**. Un CONTROL sobre un estadístico que pasa de 10,0 a 4,2 según cuántas semillas se corran no vigila la carrera: vigila el muestreo, y congelarlo pre-programa que si la aduana por voto o la retirada de `tacticMaxMoves` lo sacan de rango se doblegue **la regla** en vez de la banda. Por eso: **paso 0 re-mide con 120, 300 y 500 semillas y publica la nube** (ya está en el paso 0, apartado (e)); **paso 6 lo re-decide con el dueño, con la predicción escrita**. Lo que NO se hace es escribir «sigue en 5-16» como criterio de «hecho» medido con 120 semillas, que es lo que decía la versión anterior.                                                                                                   |
| **`calendarQueens.breakawayWinPct`**                | 6-30                    | **6-30 — CONTROL**                                                                             | 1, 6            | **NO SE MUEVE**, por el mismo motivo: el dueño la dio por buena sobre el 18,1 % medido con «está bien así» (v44). El propio comentario dice que «no es un objetivo de carretera: es una VIGILANCIA, por decisión del dueño al ver el número medido». Arreglar el perfil (paso 1) la va a mover; si se sale, **se mide y se le enseña al dueño**, no se ensancha.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **`mountain.breakawayWinPct`**                      | 25-45 sobre `reina-150` | **12-35 sobre `realQueens`**                                                                   | 6, 21           | **Se RE-ANCLA, no se retira ni se deja en «calibrar».** El propio `targets.ts` declara que `reina-150` «no es una etapa reina sino media montaña con la etiqueta cambiada» (1.200 m) y que la métrica «cae de 26,7 % a 0 % según el puerto pase de 15 a 50 km»: **mide la posición del puerto, no la carrera**. Moverla a `realQueens` con banda 12-35 % da una medida real durante toda la transición **sin depender de la decisión cara** de sustituir el escenario canónico (decisión nº 5). **Pero el re-anclaje de escenario y la bajada del suelo son dos cosas distintas, y solo una es propuesta técnica.** Cambiar `reina-150` por `realQueens` sí lo es: el escenario viejo mide la posición del puerto. Bajar el suelo de **25 a 12** no: es **bajar a la mitad el objetivo de fuga en montaña**, y esa banda salió del dueño —mapa §2, v33: «me parecen buenos esos valores, están cerca de los objetivos» sobre las **tres** bandas ensanchadas (fuga llano 2-10, **montaña 24-45**, pájaras Lombardía ≤ 12), y la v34 la estrechó de vuelta a 25—. Así que el suelo va a §10 como **[DECISIÓN DEL DUEÑO 23]**, con los dos números delante: lo que mide `realQueens` hoy y lo que se espera que mida con R03.4(d) y R18 puestos. Mientras no conteste, el paso 6 mide y publica **sin banda** en `realQueens`, y la banda vieja sobre `reina-150` **queda declarada inválida, no aflojada**. |
| `flat.bestSprinterWinPct`                           | 30-45                   | **26-46**                                                                                      | 15              | El tren real ayuda al mejor, pero los trenes que se estorban y el encajonamiento le quitan. Neto ≈ 0 con **más varianza**, que es lo que se ensancha.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `flat.catchKmToFinish`                              | 8-25                    | **5-25**                                                                                       | 11              | Con el retardo de la pizarra algunas cazas llegan al km −5 y otras no llegan. **Lo que se abre es el suelo**, no el techo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **`mountain.top10GapSeconds`**                      | 40-300                  | **techo 300 → 360; SUELO: se queda en 40 salvo [DECISIÓN DEL DUEÑO 22]**                       | 7, 12           | **Aquí este documento leía el comentario del repositorio al revés, y hay que decirlo entero.** La propuesta anterior era 40-300 → **60-360** con el argumento «el suelo sube porque sale de la nube en que estaba sentado». Es exactamente lo contrario de lo que pasó: `targets.ts` dice que **«EL SUELO BAJA DE 60 A 40 EN LA v49, por decisión del dueño, y no porque un número no pasara: porque el suelo estaba DENTRO de la nube que pretendía vigilar»**, con las 120 corridas dando **una nube de 41 a 87 s** y un hueco medido en `… 52 52 55 │ 65 65 66 …` que mueve la mediana diez segundos cuando **una sola semilla** lo cruza. Subir el suelo a 60 lo devuelve al centro de esa nube y **reintroduce el fallo intermitente documentado**. Así que se parte en dos: **el techo sube a 360** —eso sí es propuesta técnica, y es por el efecto de R18.8 (el grupo de favoritos deja de relevar) y R13.1 (los rivales atacan al que cede)— y **el suelo NO se toca dentro de esta tabla**: es una de las trece con ancla de dominio de §1.4 y va a §10 como **[DECISIÓN DEL DUEÑO 22]**, con la nube medida delante y con la contrapartida honesta escrita (si el suelo sube, hay que subir las semillas del invariante 5 hasta que la mediana deje de bailar, y ese coste va a §7.7).                                                                                                          |
| `chronicle.teamPullFlatPct`                         | 50-85                   | **70-95**                                                                                      | 3, 9            | `pullFor` gana motivos y destinatario real: quedan muchos menos relevos sin voz de equipo. El comentario decía que «un objetivo del 90 % obligaría a inventar un dueño donde no lo hay»; con la subasta de R20, el dueño existe.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `chronicle.frontTeamsPerStage`                      | 1,8-4                   | **2,2-4,5**                                                                                    | 9               | El frente compartido a menor intensidad es una regla del dueño que hoy solo existe como `noOwnerCommitFactor`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `chronicle.teamPullWithReasonPct`                   | 95-100                  | **sin cambio**                                                                                 | 3, 9            | Sigue siendo «la alarma de que alguien ha dejado tirar a un equipo sin razón».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **`grandTour.queenLastGroupPct`**                   | 8-14                    | **8-16**                                                                                       | 10              | Cribar todos los `shed` (deuda §14.2) sube la cola. **Es la única banda de esta lista con ancla de dominio**, el corte del §VI.3: **[DECISIÓN DEL DUEÑO 6]**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **`realQueens.lastGroupPct`**                       | 7-14                    | **7-16**                                                                                       | 10              | Mismo motivo y misma decisión.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `grandTour.abandonPct`                              | 12-20                   | **12-22**                                                                                      | 12, 13          | Percances y tapones añaden abandonos por caída.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **`abandonCauses.crashPct`**                        | 30-67                   | **30-70**                                                                                      | 13              | Ya rozaba el techo (65 % con 6 vueltas) y los percances no ayudan. **La deuda del reparto 45/50/5 sigue nombrada y NO se cierra aquí**: el arreglo probado (`HEALTH.illnessRaceMax`) se refutó porque tira `queenLastGroupPct` a 6,9 %, y «eso no es un arreglo, es mover el bulto». **Y no se mueve sola: ver el aviso del simplex debajo de la tabla.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **`abandonCauses.illnessPct`**                      | 20-67                   | **18-67**                                                                                      | 12, 13          | **Banda que este documento no nombraba y que se mueve por arrastre mecánico, no por decisión.** Es un REPARTO: las tres causas suman 100, así que subir el techo de la caída al 70 % empuja la enfermedad hacia su suelo. Hoy mide 34 % contra un suelo de 20; con R11 (percances) y R12 (tapones) sumando abandonos por caída, la enfermedad baja en porcentaje **sin que enferme nadie menos**. El suelo baja a 18 para que la alarma siga siendo la que era —«que no vuelva a no enfermar nadie», la regresión de la v14— y no salte por aritmética del reparto. **Se mide junto a las otras dos o no se mide.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **`abandonCauses.outOfTimePct`**                    | 1-15                    | **sin cambio**                                                                                 | 10, 13          | La tercera pata del mismo simplex, y la que **no** se toca: R26 criba todos los `shed` y eso sube la cola de la reina (§9.1, `queenLastGroupPct`), pero el corte por tiempo elimina por número, no por porcentaje del reparto. **Va en la tabla porque el simplex obliga a declarar las tres**, aunque ésta se confirme quieta. Su suelo del 1 % es el que de verdad vigila: un corte mudo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **`smallTours.worstRacePhotoRepeat`**               | 0-4,1                   | **0-3,8**                                                                                      | 14, 16          | **Otra que este documento no nombraba.** Es la hermana de `photoRepeatTopFive` (que sí se movía, de 1,0-3,6 a 1,0-3,2) medida sobre la PEOR carrera del banco en vez de sobre la mediana, y por eso se movía en silencio con ella. Colocación real (R15a) y memoria (R09) dan más variedad de foto también en la peor. Hoy la peor es `race-besseges` con 2,24. **El techo baja lo mismo que el de su hermana (−0,4×), no más**: el 4,1 tenía dueño escrito («una carrera de cinco llegadas agrupadas y llanas repite más, y eso es del calendario, no del motor») y ese dueño sigue valiendo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **`realQueens.worstStagePct`**                      | 0-18                    | **sin cambio**                                                                                 | 10              | **La tercera que faltaba.** Es la gemela de `realQueens.lastGroupPct` (7-14 → 7-16) medida sobre la peor etapa suelta, y su techo **no es de calibración**: es el corte de tiempo de la reina de §VI.3 (`timeCutQueen`, 18 %). **Por eso no se mueve aunque su gemela sí**: subir el techo de la cola mediana es una banda; subir éste sería decir que una etapa puede dejar a su cola entera fuera de control, y eso no es una banda, es cambiar el corte. Si al cribar todos los `shed` (paso 10) alguna etapa se sale, **el que está mal es el cambio**, y es la misma doctrina de las bandas CONTROL.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `smallTours.bestSprinterWinPct`                     | 25-60                   | **25-55**                                                                                      | 8, 16           | La memoria («al de ayer no le dejan») y el encajonamiento reparten más.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `smallTours.sweepPct`                               | 0-30                    | **0-22**                                                                                       | 16              | Es exactamente el defecto que R09 ataca: «Race Arabia: gana las 5».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `smallTours.sameWinnerPairPct`                      | 15-55                   | **12-45**                                                                                      | 16              | Ídem.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `smallTours.mediaOneGroupPct`                       | 0-20                    | **0-15**                                                                                       | 7               | La media se parte más con la colaboración rota cerca de meta.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `smallTours.photoRepeatTopFive`                     | 1,0-3,6                 | **1,0-3,2**                                                                                    | 14, 16          | Colocación real y memoria dan más variedad de foto.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `smallTours.flatMoveWorstMarginS`                   | 0-900                   | **sin cambio**                                                                                 | —               | Es la cita del dueño, entera. Se conserva.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `smallTours.mediaGroups`                            | 3-8                     | sin cambio                                                                                     | —               | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `smallTours.flatWinnerGroupPct`                     | 85-100                  | sin cambio                                                                                     | —               | Es el objetivo de NO ROMPER; R20.6 (cazar cuesta corredores) se mide **contra** él.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `timeTrials.tailPct` / `worstStagePct`              | 8-15 / 0-17             | **sin cambio**                                                                                 | —               | R27 no toca la ley de la crono, solo el reparto de esfuerzo alrededor.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `timeTrial.p90MinusP10Seconds` / `specialistWinPct` | 80-170 / 90-100         | sin cambio                                                                                     | —               | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `erosion.*` (5 bandas)                              | —                       | **sin cambio, y es INVARIANTE DE CONTROL C1**                                                  | —               | No se toca la física del depósito. Si una tanda táctica las mueve, el que está mal es el cambio.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **`medianLeadGroupRiders`** (DEUDA sin banda)       | **mide 1**              | **5-15 SOLO en reinas de final NO alto; sin banda en final en alto**                           | 0 (se porta), 7 | Deja de ser deuda sin banda y pasa a objetivo, **partida por tipo de final**. Tres correcciones sobre lo que este documento decía: **(a) no es cita del dueño, es un ENCARGO** (`targets.ts:591-593`: «El encargo pedía un objetivo también para la reina: "una reina real deja llegar juntos a un grupo de 5-15 y no 1"»), y la guía de lectura de este documento reserva las «» para las citas del dueño. **(b) El 3-10 rebajaba el encargo sin decirlo**: se pone el 5-15 que se pidió. **(c) La premisa se corrigió con datos**: v26 §5, con el Tour 2024 delante, midió 1·1·1 dentro de 30 s en finales EN ALTO —«el "1" del motor era realista para un final en alto y falso para todo lo demás»—, y `reina-150` y buena parte de `realQueens` son finales en alto, así que ahí la banda mediría la carretera y la llamaría defecto. **No** está entre las trece con ancla de dominio de §1.4 —no la fijó el dueño—, pero es **[DECISIÓN DEL DUEÑO 19]** igualmente y por otro motivo: convierte en objetivo un encargo **que nació ROJO y al que a propósito no se le puso banda** («un objetivo que nace rojo no es un objetivo, es un TODO con formato de test»). Eso no lo decide un diseño.                                                                                                                                                                                                     |
| **Ley de velocidad (inv. 43)**                      | —                       | **re-anclar SOLO si se hace el paso 20**                                                       | 20              | Es el invariante de control **C2**. Si no se hace R14, no se toca.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

**Recuento, contado fila a fila y cuadrado contra el árbol**: **34** bandas hoy —el conteo de
`sim/targets.ts` entrada por entrada, no el 30 que este documento traía; el `min: number` de la
declaración del tipo no es una banda—. Y el reparto de antes tampoco cuadraba (decía «13 se mueven»
sobre una tabla con 14 filas movidas), así que va entero y por nombre:

- **16 se mueven**: `flat.bestSprinterWinPct`, `flat.catchKmToFinish`, `mountain.top10GapSeconds`,
  `chronicle.teamPullFlatPct`, `chronicle.frontTeamsPerStage`, `grandTour.abandonPct`,
  `grandTour.queenLastGroupPct`, `realQueens.lastGroupPct`, `abandonCauses.crashPct`,
  `abandonCauses.illnessPct`, `smallTours.bestSprinterWinPct`, `smallTours.sweepPct`,
  `smallTours.sameWinnerPairPct`, `smallTours.mediaOneGroupPct`, `smallTours.photoRepeatTopFive` y
  `smallTours.worstRacePhotoRepeat`. **`illnessPct` y `worstRacePhotoRepeat` se movían ya con la
  versión anterior de esta tabla, por arrastre y sin fila propia**; lo que cambia hoy no es que se
  muevan, es que están escritas y con su porqué.
- **1 se re-ancla de escenario** (`mountain.breakawayWinPct`: `reina-150` → `realQueens`), **y su
  SUELO no se re-ancla aquí**: bajarlo de 25 a 12 es **[DECISIÓN DEL DUEÑO 23]**.
- **1 se parte en suelo y techo**: `flat.breakawayWinPct`. El **suelo 5 es CONTROL** (lo fijó el
  dueño en la v38) y no se mueve; el **techo 16 se re-mide en el paso 0 con 120/300/500 semillas y
  se re-decide con el dueño en el paso 6**, porque su propia fuente dice que «el techo describe el
  tamaño de la muestra, no la carrera».
- **1 se declara CONTROL y NO se mueve**: `calendarQueens.breakawayWinPct`.
- **15 se confirman explícitamente sin cambio**: `chronicle.teamPullWithReasonPct`,
  `abandonCauses.outOfTimePct`, `smallTours.flatMoveWorstMarginS`, `smallTours.mediaGroups`,
  `smallTours.flatWinnerGroupPct`, `realQueens.worstStagePct`, `timeTrials.tailPct`,
  `timeTrials.worstStagePct`, `timeTrial.p90MinusP10Seconds`, `timeTrial.specialistWinPct` y las
  **5 de `erosion`**, que son el invariante de control C1.

16 + 1 + 1 + 1 + 15 = **34**, y por eso ahora suma. Fuera de las 34 quedan dos cosas: **1 deuda sin
banda que gana banda** (`medianLeadGroupRiders`; las otras tres bandas nuevas que este diseño crea van
en §9.1bis) y la **ley de velocidad**, que no es una banda de `targets.ts` sino el invariante 43 y se
re-ancla solo si se hace el paso 20.

**Y el recuento de anclas de dominio, que la versión anterior daba en uno, luego en cuatro, y son
SIETE filas y tres decisiones.** Este documento decía primero «solo **una** de las que se mueven
tiene ancla de dominio (la cola de la reina)», y eso era leer §1.4 con la lista corta; la corrección
siguiente lo dejó en **cuatro**, y eso era contar solo las que **se mueven**. Las dos cifras se
quedan cortas por el mismo sitio: §1.4 lista **trece** filas de bandas y umbrales que el dueño fijó o
movió en persona, contra la tabla §13 de `mapa-requisitos-duenio.md`, y de esas trece **siete** están
en esta tabla: **tres se mueven** y **cuatro se confirman quietas** —y confirmar quieta una banda con
ancla del dueño también es una decisión, y también hay que escribirla, que es justo lo que no se hacía—.
**Tres** dan lugar a decisión del dueño, y son las tres que se mueven:

| Fila de §9.1 con ancla de dominio                                                       | Qué se propone                                                                   | Decisión       |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------- |
| `grandTour.queenLastGroupPct` + `realQueens.lastGroupPct` (la cola de la reina del CLI) | techo 14 → 16                                                                    | **[DUEÑO 6]**  |
| `mountain.top10GapSeconds` (suelo 40)                                                   | subirlo a 60 **no se hace sin firma**; el techo 300 → 360 sí es propuesta        | **[DUEÑO 22]** |
| `mountain.breakawayWinPct` (suelo 25, banda provisional de la v33)                      | bajarlo a 12 al re-anclar a `realQueens`                                         | **[DUEÑO 23]** |
| `flat.breakawayWinPct` (suelo 5)                                                        | **no se toca**: el suelo es CONTROL; el techo se re-mide y se re-decide          | —              |
| `calendarQueens.breakawayWinPct` 6-30                                                   | **no se toca**: CONTROL declarado, «está bien así» (v44)                         | —              |
| `smallTours.flatMoveWorstMarginS` 0-900                                                 | **no se toca**: es la cita del dueño entera                                      | —              |
| `timeTrials.tailPct` 8-15                                                               | **no se toca**: «la banda es la del dueño» (v19); R27 no toca la ley de la crono | —              |

Las otras **seis** de las trece no son bandas de `sim/targets.ts`, y van por nombre para que la resta
se pueda comprobar: el **PAV ≥ 69** del ganador de pavé, la **saturación white-roads ≤ 0,96**
(`SATURATION_DEPLETION`, §9.2), el **listón de bots con 5★**, la **alarma de cracks**, **rueda contra
cara en llano** y la **ventana de ataques de la general**. Son umbrales, listones y cortes, cada uno
vive donde le toca —§9.2, §9.5, §10, o fuera de esta tanda—, y **este diseño no mueve ninguno de los
seis**. 7 + 6 = 13, y por eso ahora la resta cierra. **Ninguna de las trece se mueve dentro de §9.1
en silencio**, y ésa es toda la regla.

**Y una regla de lectura que esta tabla no tenía y necesita: `abandonCauses` es un SIMPLEX.**
`crashPct`, `illnessPct` y `outOfTimePct` son el reparto de una misma tarta de ~190 abandonos y
suman 100. **Mover una mueve las otras dos por aritmética, no por conducta**, y la versión anterior
de esta tabla movía `crashPct` de 30-67 a 30-70 sin decir que eso empuja `illnessPct` hacia su suelo
del 20 % sin que enferme nadie menos. Consecuencia operativa, y es criterio de «hecho» de los pasos
12 y 13: **las tres se miden y se declaran juntas, en la misma corrida y en la misma fila de
`docs/balance.md`**, y ninguna de las tres se da por buena mirándola sola. Si hace falta discutir el
reparto de verdad —el 45/50/5 de §VI.3— eso es la deuda nombrada, y no se cierra aquí.

**Dos números que esta tabla listaba y no son bandas de `sim/targets.ts`**: `SATURATION_DEPLETION`
(0,96) y `SATURATION_BONK_PCT` (12) viven en `packages/engine/src/sim/invariants.test.ts:78` y `:91`.
No son objetivos de campo con `min`/`max`: son listones de un invariante. Se han movido a §9.2, que
es donde encajan.

### 9.1bis Los cinco multiplicadores del coste de bloque, y las bandas nuevas

Esta subsección existe porque la Frontera 2 (§1.1) la exige: si el coste del bloque admite
multiplicadores tácticos, **tienen que estar los cinco en un solo sitio, con su paso, su tope y su
signo**, o la frontera vuelve a ser una frase. Cuatro sitios del documento apuntan aquí (§1.1, §4/R14,
§7.6/C1 y el paso 14 de §8); esto es lo que apuntaban.

**El punto único.** No hay cinco sitios que multipliquen `blockCost`: hay uno.

```
coste_final(r, block) = blockCost(...) × (1 + clamp(Σ mult_i(r, block), −tacticalCostCap, +tacticalCostCap))
```

`tacticalCostMultiplier(r, block)` vive **fuera de `physics.ts`** (en `stage/cost.ts`, nuevo, junto a
`placement.ts`), acumula los cinco términos, los recorta con un tope único y devuelve **un factor por
corredor y por bloque**. `physics.ts` no se entera: se le multiplica el resultado, no se le edita la
función. Esto es lo que hace comprobable a C1, que con la redacción vieja («`physics.ts` sin tocar,
Grep en el diff») no comprobaba nada.

| #   | Multiplicador                      | Constante y valor                                                           | Paso   | Signo                            | Qué modula                                                                                                                                                                                                                                                                                                                         |
| --- | ---------------------------------- | --------------------------------------------------------------------------- | ------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **R15a.1 — empujar hacia delante** | `placePushCost` **0,45** [calibrar]                                         | **14** | **Suma cero por grupo**          | Ganar puestos cuesta; perderlos no devuelve nada, pero el que se deja caer no paga. El grupo entero gasta lo mismo; cambia **quién**.                                                                                                                                                                                              |
| 2   | **R15a.2 — el acordeón**           | `accordionGain` **0,35** [calibrar]                                         | **14** | **Suma cero por grupo**          | Se aplica sobre `placement − placementMedioDelGrupo`, no sobre `placement`. Por eso el de delante paga menos y el de atrás más, y el pelotón **no** se encarece de media —que es lo que la redacción vieja (`× (1 + accordionGain·placement)`) sí hacía—. Techo duro: `shelteredLeaderSavingPct` ≤ 3 %, la medida de la v38-2 §17. |
| 3   | **R08.4 — el ritmo de la carrera** | `rhythmCostGain` **0,25** [calibrar]                                        | **9**  | **Suma cero por grupo**          | `(1 − raceRhythm)` en la primera hora: una carrera lanzada cuesta a todos, una tranquila a nadie. Como es idéntico para todo el grupo, redistribuye entre grupos, no dentro.                                                                                                                                                       |
| 4   | **R13.5 — el frío**                | `coldCostScale` **0,06** [calibrar]                                         | **13** | **Suma cero por grupo**          | Mismo caso: el clima es del bloque, no del hombre. Escala pequeña a propósito; el frío se cobra sobre todo en `coldStopS`, no aquí.                                                                                                                                                                                                |
| 5   | **R28.7 — la altitud**             | `altitudeGain` **0,04** [calibrar], `altitudeThresholdM` **2.000** DERIVADA | **18** | **NO es de suma cero: ENCARECE** | Es el único de los cinco que sube el gasto medio, porque en carretera la altitud lo sube de verdad, y el único que además **edita `physics.ts`**. Por eso va en un PR propio con los invariantes 13-20 re-medidos y su predicción escrita, y por eso el paso 18 es uno de los dos únicos que tocan `physics.ts`.                   |

**El tope, y por qué hay tope.** `tacticalCostCap` **0,60** [calibrar]: la suma de los cinco no puede
mover el coste de un bloque más de un ±60 %. Sale de que los dos grandes (`placePushCost` 0,45 y
`accordionGain` 0,35) puedan coincidir en el peor caso —el que remonta cien puestos en pleno acordeón—
sin que el bloque se vuelva incoherente con la erosión medida. Sin tope, cinco términos [calibrar]
multiplicándose es exactamente la forma de mover `erosion.*` sin que nadie lo vea.

**El invariante que lo vigila** (C1, §7.6): `sumaTacticalCostMultiplierPorGrupo` ≈ 0, con tolerancia
`tacticalCostSumTol` **0,02**. Se comprueba **grupo a grupo y bloque a bloque**, y se comprueba con
los cuatro primeros multiplicadores activos y el quinto apagado; con altitud encendida el invariante
cambia de forma y pasa a ser «los 13-20 en banda con los mismos números», que es el criterio del
paso 18.

**La predicción declarada sobre `erosion.*`** (la que el paso 14 pide y no estaba escrita): las cinco
bandas de `erosion` —`flatFresh` 0-0,02, `queenFresh` 0,18-0,50, `longClassicFresh` 0,45-0,80,
`queenThirdWeek` 0,60-0,85, `hardestClassicFresh` 0,45-…— **no se mueven ni un dígito en los pasos 9,
13 y 14**, porque los cuatro multiplicadores de esos pasos son de suma cero: la mediana del grupo es
la misma, cambia la dispersión dentro de él. Lo que **sí** se espera que se mueva, y hay que medirlo
aparte, es la **varianza** de la erosión dentro del pelotón, no su mediana. **Si en el paso 14 se
mueve la mediana de `queenFresh`, la suma cero está mal implementada y se para la tanda**; no se
re-ancla la banda. En el paso 18 sí se mueven, hacia arriba, y ése es el PR que las re-mide.

**Bandas nuevas que este diseño CREA** (no están en `sim/targets.ts` hoy y aquí es donde se declaran,
para que no nazcan enterradas en la tabla de su racimo):

| Banda nueva                          | Valor                                                           | Banco                                                                                      | Procedencia                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `soloWinMediaPct`                    | **12-28 %**                                                     | `media-190` (entra en CI)                                                                  | **Rebaja de un objetivo del dueño** (pidió 20-30 %; hoy mide 4 %). El suelo de 12 es lo que se espera alcanzar con R18, no lo que dice la carretera. Por eso es **[DECISIÓN DEL DUEÑO 20]** y no una propuesta técnica. Se recalibra en el paso 21.                                                                                                                                                                 |
| `medianLeadGroupRiders`              | **5-15 en reinas de final NO alto; SIN banda en final en alto** | `smallTours` ShapeStats + `realQueens` partida por `queenFinalKind` (portada en el paso 0) | Deuda sin banda de la v23. **Procedencia: ENCARGO, no cita del dueño** (`targets.ts:591-593`), y encargo cuyo objetivo **nació rojo y por eso no llevaba banda**. El 5-15 es el del encargo, sin la rebaja a 3-10 que este documento traía. La partición por tipo de final la impone **v26 §5**: en final en alto el 1·1·1 dentro de 30 s es la carretera (Tour 2024) y no un defecto. **[DECISIÓN DEL DUEÑO 19]**. |
| `sumaTacticalCostMultiplierPorGrupo` | **≈ 0 ± 0,02**                                                  | todos                                                                                      | No es un objetivo de carretera: es el invariante C1 hecho número, y nace aquí porque sin él la Frontera 2 no se puede comprobar.                                                                                                                                                                                                                                                                                    |
| `shelteredLeaderSavingPct`           | **≤ 3 %**                                                       | `llana-180`, `smallTours`                                                                  | DERIVADA de la medida de la v38-2 §17 (2,9 %). No es una perilla: es el techo que `accordionGain` no puede pasar sin reabrir la cita del dueño de la v38.                                                                                                                                                                                                                                                           |

Las cuatro entran en `sim/targets.ts` en su paso y **cuentan**: si se hacen los veintiún pasos, las
bandas pasan de **34** a **38**.

**Por qué aquí van cuatro y no las cuarenta y tantas de §7.5, dicho para que §0 siga siendo verdad.**
§0 promete que «todo lo que este diseño MUEVE está en un solo sitio, §9», y las ~52 estadísticas de
§7.5 no mueven nada: **nacen**. Son medidas de conducta que hoy no existen, con su banda propuesta
y su banco, y su inventario único es la tabla de §7.5 —copiarlas aquí crearía dos listas de lo mismo
que se desincronizarían al primer cambio, que es exactamente el defecto que este documento se pasa
media revisión corrigiendo—. A §9.1bis suben **solo** las que no son una medida nueva sino un
movimiento con dueño: `soloWinMediaPct` (rebaja de un objetivo del dueño), `medianLeadGroupRiders`
(§9.1, encargo rojo que gana banda), `sumaTacticalCostMultiplierPorGrupo` y
`shelteredLeaderSavingPct` (guardarraíles de una frontera y de una cita). El criterio, escrito para
que no haya que discutirlo cada vez: **si la banda contradice, rebaja o reinterpreta algo que el
dueño o la bitácora ya dijeron, va aquí; si solo mide algo que nadie había mirado, se queda en §7.5**.
Y hay dos más que cumplen ese criterio y viven donde les toca, con su decisión: `gregarioSharePct`
(decisión 21, publicada **sin** banda) y `finishPaveKm` (decisión 18, §9.5).

### 9.2 Invariantes

| Invariante                                                           | Qué le pasa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Paso   |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1-7 (canónicos)                                                      | Siguen; bandas movidas según §9.1. **El 5 (`mountain.top10GapSeconds`) es el único que cambia de banda, y solo por el techo**: 300 → 360. Su suelo 40 es decisión del dueño (§10, decisión 22) y **no se toca sin firma**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | var.   |
| **8-12 (el bloque de las cronos REALES)**                            | **Este agujero hay que taparlo antes de nada: la tabla saltaba del 7 al 13 y omitía los cinco, en una sección que el documento promete completa.** Los cinco viven en el mismo banco (`REAL_TIME_TRIALS` × 6 semillas, `invariants.test.ts:157-205`) y son, uno a uno: **8** el banco cubre formas distintas y las dos cronos de producción están dentro (cobertura, no conducta: intacto); **9** `timeTrials.tailPct` 8-15 % (intacto, §9.1 lo confirma quieto); **10** ninguna crono suelta se dispara, `timeTrials.worstStagePct` 0-17 (intacto); **12** las velocidades son de profesional —el último ≥ 40 km/h y el ganador ≤ 56— (intacto: R27 mueve el reparto del esfuerzo, no la ley de la crono). El que **sí** cambia es el **11**, y va en su propia fila                                                                                                                                                                                                                                                                                                                                                                                                                                 | 13, 19 |
| **11 (el corte de la crono no elimina a nadie en una crono normal)** | **SE RETIRA su tolerancia cero, con causa escrita, y se sustituye por el 56.** `invariants.test.ts:182-188` afirma hoy `expect(stats.all.outOfTime).toBe(0)` **y** `expect(stats.all.readmitted).toBe(0)` sobre las cronos reales × 6 semillas. R11.6 mete `ttMishapLambda` 0,015 por corredor y el invariante **56** pide explícitamente «≥ 1 caso por debajo del 25 %»: **son afirmaciones incompatibles**, y no por descuido —los percances en crono existen, y un invariante que dice que nunca los hay es una salvaguarda dormida, no una vigilancia; el propio comentario del 11 lo admite al escribir que «el corte de una contrarreloj existe para el que pincha, se cae o se queda tirado»—. En su lugar nacen **dos bandas declaradas**: `ttOutOfTimePct` **0-2 %** y `ttReadmittedPct` **0-2 %**. El cero deja de ser el listón; el listón pasa a ser «que no sea un goteo». Y el 56 vigila el otro lado: que tampoco vuelva a ser cero para siempre. **Lo que NO se retira del 11 es su tercera aserción** —`worst.medianTailPct < 100 · timeCutItt`, o sea que la cola siga viviendo cerca del corte y no a un mundo de él—: ésa se conserva tal cual, porque no la toca ningún percance | **13** |
| **13-20 (erosión y saturación)**                                     | **Intactos, con los MISMOS números. Invariante de control C1.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | —      |
| 21-24 (voz de equipo)                                                | Siguen; `teamPullFlatPct` y `frontTeamsPerStage` movidas; el 24 se amplía a C4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 3, 9   |
| 25-30 (gran vuelta)                                                  | Siguen; movidas `grandTour.abandonPct` (12-20 → 12-22) y `queenLastGroupPct` (8-14 → 8-16, **[DUEÑO 6]**). **Y el 28 se nombra aparte porque es el simplex**: el «se van por las tres puertas» mide `abandonCauses`, o sea `crashPct` (30-67 → **30-70**), `illnessPct` (20-67 → **18-67**, por arrastre) y `outOfTimePct` (1-15, **quieta**). Las tres se miden y se declaran **en la misma corrida**, según la regla de lectura de §9.1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 10-13  |
| **31-33 (reinas reales)**                                            | **El 31 faltaba en esta tabla y se añade**: es el de cobertura («el banco cubre formas distintas, y el caso de la regresión está dentro», `invariants.test.ts`), no mide conducta y queda **intacto**, igual que el 8 en el bloque de las cronos. El **32** lleva `realQueens.lastGroupPct` movida (7-14 → 7-16, **[DUEÑO 6]**) y el **33** es `worstStagePct` 0-18, que §9.1 **confirma quieta** porque su techo es el corte de tiempo de §VI.3 y no una calibración                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 10     |
| 34 (Giro e9), 35 (Colombia e5)                                       | **Intactos: son regresiones nombradas y el rediseño no puede empeorarlas**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | —      |
| **36-42 (`smallTours`)**                                             | **Dos correcciones de numeración en una fila, y las dos se veían contando.** El **36** faltaba —es el de cobertura del banco de carreras pequeñas, «las carreras de la queja están dentro», intacto por el mismo motivo que el 8 y el 31—; y el rango **terminaba en 43, que ya está tomado por la ley de velocidad** dos filas más abajo: el bloque de conducta de `smallTours` es 37-42 y con el de cobertura delante, **36-42**. Van **SEIS** bandas movidas y no cuatro, que es lo que decía esta casilla: `bestSprinterWinPct` 25-60 → 25-55, `sweepPct` 0-30 → 0-22, `sameWinnerPairPct` 15-55 → 12-45, `mediaOneGroupPct` 0-20 → 0-15, `photoRepeatTopFive` 1,0-3,6 → 1,0-3,2 y `worstRacePhotoRepeat` 0-4,1 → **0-3,8**. Las seis son las mismas seis de `smallTours` que §9.1 lista entre las dieciséis que se mueven                                                                                                                                                                                                                                                                                                                                                                        | 8, 16  |
| **43 (ley de velocidad)**                                            | **Intacto salvo paso 20. Invariante de control C2.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 20     |
| **`SATURATION_DEPLETION` 0,96 / `SATURATION_BONK_PCT` 12**           | **Intactos, con los mismos números.** Viven en `sim/invariants.test.ts:78` y `:91`, no en `sim/targets.ts`, y por eso estaban mal listados como banda en §9.1. Son listones de saturación del depósito, o sea parte de C1: si una tanda táctica los mueve, el que está mal es el cambio. La saturación white-roads ≤ 0,96 tiene además **ancla de dominio** (§1.4), así que ni se ensancha ni se discute aquí.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | —      |
| 44 (pavés 5-12 %)                                                    | **Intacto**: los pinchazos **no son bajas**, y se comprueba explícitamente en el paso 13                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 13     |
| 45, 46 (unidades de física)                                          | Intactos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | —      |
| **C1-C5 (control, nuevos)**                                          | Cinco invariantes que vigilan la FRONTERA, no la conducta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | var.   |
| **47-73 (conducta y método, nuevos)**                                | 27 invariantes de §7.6                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | var.   |

**Y ahora esta tabla recorre el 1 al 46 sin un hueco y sin un repetido**, que es lo que promete y lo
que no cumplía: se taparon los **8-12** (el bloque de las cronos reales), y esta edición final tapa
los otros dos que quedaban —el **31** y el **36**, los dos de cobertura de banco— y saca el **43** del
rango de `smallTours`, donde estaba contado dos veces: una como conducta de carrera pequeña y otra
como ley de velocidad, que es el invariante de control C2. El único número que aparece en dos filas
es el **11**, y a propósito: entra en el rango 8-12 como parte de su banco y sale a fila propia
porque es el único de los cinco que cambia de aserción.

**Total: 46 → 46 + 5 de control + 27 nuevos (47-73) = 78.** Se dice el número entero porque esta
casilla decía «23 nuevos (47-69) = 74» mientras §7.6 —**la fuente única de numeración**— ya listaba
cuatro más: el **70** (nadie tira con un compañero delante, R01), el **71** (el turno dura lo suyo,
R18), el **72** (**ninguna fuga del día lleva al `gcRank === 1`**, R03, el que convierte el veto del
maillot en veto de verdad) y el **73** (**el maillot no tira del pelotón**, R04, la no regresión de
S-129 y de la v57 §4). Dos de los cuatro son guardarraíles de no regresión de conductas CUBIERTAS
con cita del dueño, o sea justo los que no pueden faltar en el recuento.

**Y el 46 de partida no baja aunque el 11 pierda su tolerancia cero**, que es la pregunta obvia al
leer su fila: el invariante 11 **no se borra**, se le cambian los listones (dos aserciones pasan de
`toBe(0)` a las bandas `ttOutOfTimePct` y `ttReadmittedPct` 0-2 %, y la tercera se conserva tal
cual). Sigue siendo un `it(` de `invariants.test.ts` y sigue contando: **46 → 46**. Lo que cambia no
es cuántos hay, es qué afirma uno de ellos, y por eso va en esta tabla con paso y causa en vez de en
§9.5, que es donde viven las cosas que se retiran de verdad.

### 9.3 Huellas selladas: la predicción declarada ANTES de medir

Esto es lo que convierte el re-sellado en un experimento en vez de en un trámite. **Cada fila dice
qué se espera que se mueva y dónde, antes de correrlo.** Si no se mueve donde debe, se para la tanda
y se diagnostica; no se re-sella.

| Huella                                        | Idéntica hasta | Se mueve en                                                                                       | **Predicción declarada**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `llana-180-0`                                 | **paso 2**     | **3**, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17b, 18, 20                                     | Sigue ganando un `spr-*` (`spr-6`, reloj **14711**) y el pelotón sigue llegando junto: hoy son **173 hombres al mismo segundo** y solo **3 relojes distintos** en las 176 plazas. Se exige que sigan siendo **≥ 170 de 176** al mismo segundo. Cambia el ORDEN dentro del reloj, **quién va en la fuga** (paso 6) y **quién llega colocado** (paso 14). Si cambia el ganador de tipo —si gana un escalador—, algo está mal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `llana-180-1`                                 | **paso 2**     | ídem                                                                                              | Ídem, con sus números: gana `spr-0` a **14748**, **172 al mismo segundo** y **4 relojes distintos**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `reina-150-0`                                 | **paso 2**     | **3**, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17b, 18, 20                                     | **Cambia de ganador**: hoy gana un corredor de relleno (`pel-105`) a **14753**, con **once hombres al mismo segundo** en cabeza y el segundo grupo a **+57 s**; con R17 (la carta sale del final real) y R02 (los compañeros colaboran) tiene que ganar uno de los `gc-*` o `bar-*`. **Los relojes distintos son 45 hoy** —contados sobre el sello vigente, no 44: el 44 es el número que la v49 escribió en su comentario y que el sello dejó atrás— y se espera que **no bajen de 40**: si la montaña vuelve a llegar a escalones, el paso que lo hizo está mal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **`reina-150-1`**                             | **paso 2**     | ídem                                                                                              | **Aquí este documento leía una huella que ya no existe, y hay que reescribirla con el sello vigente.** Decía «hoy la gana `gc-0` **EN SOLITARIO a +92 s** del segundo grupo». El sello de `attribution.test.ts` dice otra cosa: **`1:gc-0:14525, 2:gc-3:14525, 3:pel-6:14612`**, o sea **DOS hombres al mismo segundo** y el tercero a **+87 s**, con **45 relojes distintos**. El +92 s es el valor **pre-v49**, y sobrevive solo en el comentario histórico de la línea 295 del mismo fichero, que es de donde este documento lo copió. Tres consecuencias: **(a)** el criterio de aceptación «si tras el paso 7 sigue llegando uno solo, se para la tanda» **ya está cumplido hoy y no prueba nada** —hoy llegan dos—, así que se retira; **(b)** lo que se exige tras el paso 7 es medible y es esto: `leadGroupRiders30S` (hombres dentro de 30 s del ganador) **pasa de 2 a ≥ 3**, y la ventaja sobre el primer perseguidor **baja de +87 s a 20-70 s**; **(c)** el ganador puede seguir siendo `gc-0` —ya es un `gc-*` y no un hombre de relleno—, así que **la prueba del ganador vive en `reina-150-0`**, que sí la gana relleno. **Y lo que NO se exige aquí es el grupo de 4-12 hombres**: el final de `reina-150` es `alto` (así consta en §9.6) y **v26 §5** midió con el Tour 2024 delante que en final en alto el resultado real es 1·1·1 dentro de 30 s —el 1 del motor era realista para un final en alto y falso para todo lo demás—. Exigir un grupo aquí sería parar la tanda por reproducir la carretera. Por eso `medianLeadGroupRiders` **no se mide en esta huella** (§9.1: banda 5-15 **solo** en reinas de final NO alto) y **este escenario no es el test de aceptación de R02+R17+R18**: ese test se mide donde vive, en `realQueens` partida por `queenFinalKind` y en `duelBench`. |
| `timetrial.test.ts` — huella de la crono      | **paso 12**    | 13, 19                                                                                            | El orden general se mantiene; cambian los tiempos de los que sufren un incidente (paso 13) y de los que llevan `ttPacing` distinto de `progresivo` (paso 19). El **especialista sigue ganando**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `timetrial.test.ts` — «la rampa no da tiempo» | **siempre**    | **nunca**                                                                                         | Es una **invariante de diseño**, no una huella: el orden de salida no da tiempo. Lo que cambia el tiempo en R27 es **la orden de dosificación**, no el turno. Si esta se mueve, el paso 19 está mal escrito.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `raceRadio.test.ts` — contratos de foto       | **paso 16**    | 17                                                                                                | Cambian los contratos de `pullMotive` (valores nuevos), `time_gap` (`costsToTeams`) y `peloton_split` (`cause`). Las **25** pruebas de unidad sobre fotos a mano (conteo verificado, no 26) siguen pasando salvo las tres que afirman esos contratos.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `index.test.ts` — `ENGINE_VERSION`            | —              | **1**, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, **17b, 17c**, **18a, 18b, 18c, 18d**, 19, 20 | **52 → 74** si se hacen los veintiuno. Nunca dos subidas en el mismo PR. **Son 22 subidas y no 17**, y la cuenta cambió por tres motivos que van escritos: **(a) el paso 1 sube**, porque un generador de recorridos distinto cambia el resultado de **toda etapa sobre recorrido real**, y sin la subida `checkReplay` (`sim/raceRadio.ts:49-55`, que compara **solo** `snapshotEngineVersion === ENGINE_VERSION`) seguiría declarando fieles unos snapshots que ya no reproducen, durante los dieciséis pasos que faltan hasta que R23.5 congela el informe (paso 17d); **(b)** el paso 17 se parte en cuatro y suben **dos** de los cuatro —**17b** (el motor lee las palancas) y **17c** (la crónica emite `pullMotive` y `cause` nuevos, que viajan dentro de `events` y por tanto cambian la salida de la etapa)—, mientras **17a** (contratos y migración) y **17d** (el informe deja de re-simular) no tocan el motor; **(c)** el paso 18 se parte en cuatro y **suben los cuatro**, porque son cuatro cambios de conducta independientes y la regla de la casa es un PR, una subida.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

**El re-sellado, contado desde la columna «Mueve» de §8, que es la fuente única.** Y aquí había dos
errores que se tapaban el uno al otro, así que van los dos por delante.

**Error 1: el paso 3 no es andamio.** Esta subsección decía «los pasos 0-4 son de andamio y dejan las
huellas idénticas dígito a dígito (invariante de control C3)», y las cuatro filas decían «idéntica
hasta **paso 4**». Pero la columna «Mueve» del paso 3 en §8 dice **«huellas 4/4»**, y con razón:
R01 pone `followProbability = 0` **entre compañeros**, y eso cambia **quién cierra el hueco** y por
tanto el orden de meta. C3, además, no protege el 3: dice literalmente «los pasos **2 y 4**». Eran
dos frases del mismo documento diciendo cosas distintas, y la buena es la de §8. Así que las cuatro
huellas son **idénticas hasta el paso 2**, se **mueven en el 3** con su causa (`followProbability`
entre compañeros) y su predicción (el ganador **no** cambia en ninguna de las cuatro; cambian puestos
detrás del ganador en las dos reinas, donde hay compañeros de verdad —`gc-*` y `bar-*`—, y **casi
nada** en las dos llanas, donde el pelotón llega junto y el orden lo decide el remate), y vuelven a
salir **idénticas en el 4**, que sí es andamio puro.

**Error 2: el recuento.** Decía «son **doce** re-sellados». La unión de la columna «Mueve» de §8 da
otra cifra, y va contada: pasos **3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17b, 18 y 20** = **16
re-sellados** de `attribution.test.ts`. El 8 y el 20 faltaban en las filas de arriba (el 8 mueve
`smallTours.*` y la carta del día; el 20, si se hace, mueve **las cuatro huellas y el invariante 43
de golpe**, y así lo dice §8.1). Son dieciséis porque hay dieciséis cambios de conducta que tocan las
cuatro corridas selladas: batirlos en uno haría imposible atribuir un movimiento a su paso, que es la
única razón por la que las huellas existen.

**El paso 5 tiene DOS causas, y hay que escribirlas las dos.** Una versión anterior de este documento
declaraba solo la primera, y eso viola la regla de esta misma subsección («una causa por re-sellado,
escrita»):

1. **El re-sellado de contrato**: los escenarios sintéticos de `sim/scenarios.ts` ganan `race`, y a
   partir de ahí `StageInput.race` deja de estar ausente en las cuatro corridas selladas. Ocurre
   **una sola vez** en todo el plan.
2. **El desplazamiento del flujo de `rngTactics`**: el paso 5 retira `tacticMaxMoves` y `closingNow`
   **como vetos**, o sea que **hay intentos que antes no se hacían y ahora sí**. Cada intento nuevo
   consume dados que antes no se consumían, y eso corre el flujo de `rngTactics` en **todas** las
   etapas del juego a partir del punto donde el veto mordía. **Es exactamente la lección de la
   v21/v25 con el km 0** (§2.6), con el signo invertido: allí se prohibió un intento y desplazó el
   flujo; aquí se permiten dos clases de intento y lo desplaza igual.

**Y por eso el paso 5 estrena `rngTactics2`.** Los intentos que hoy vetan `tacticMaxMoves` y
`closingNow` —y **solo** ésos— tiran de un subflujo propio, `rngTactics2`. Esto no es cosmética y se
puede afirmar porque el código lo permite: en `simulate.ts:4460` el veto de `tacticMaxMoves` es un
`return` **antes** de construir el `MoveContext` y antes de cualquier tirada, y en `:4755` el de
`closingNow` es un `if (!closingNow) attemptFrom(...)`, o sea que tampoco tira. **Los dos vetan sin
consumir un solo dígito**, así que mandar los intentos recién permitidos a `rngTactics2` deja
`rngTactics` **con la misma secuencia que hoy, dígito a dígito**.

Lo que eso compra, y es lo que hace el paso 5 medible: el A/B del paso 5 se corre **con `race`
ausente y `rngTactics2` apagado** —y tiene que salir idéntico al paso 4, dígito a dígito, igual que
los pasos de andamio— y luego con los dos encendidos. Así la huella que se mueve se atribuye a la
conducta nueva y no al desplazamiento de dados, que es la duda que un re-sellado de dos causas deja
abierta para siempre si no se separa aquí. `rngTactics2` **se queda** después del paso 5: retirarlo
volvería a fusionar los flujos y a mover todas las etapas por segunda vez, por nada.

### 9.4 Escenarios canónicos

| Escenario   | Hoy                                                   | Propuesto                                                                                                                                                                                                         |
| ----------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `llana-180` | 176 en 22×8, volante en el km 100                     | **Sin cambio.** Es el ancla del llano. Gana una **variante con `lugar`** para R14 (paso 0).                                                                                                                       |
| `reina-150` | 135 km de llano + puerto de 15 km al 8 %, **1.200 m** | **[DECISIÓN DEL DUEÑO 5]**: renombrar a `media-150` y crear `reina-real` sobre un recorrido de 3.500-4.500 m con final en alto. Mientras no se decida, `mountain.breakawayWinPct` se mide en `realQueens` (§9.1). |
| `media-190` | informativo, sin banda, **fuera de CI**               | **Entra en CI con banda** (`mediaGroups`, `soloWinMediaPct`): es donde vive la deuda §14.4 y donde R18 se mide.                                                                                                   |
| `cri-40`    | 40 corredores **sin equipos y sin general**           | **+ una variante con equipos y general** para R27.2.                                                                                                                                                              |
| —           | —                                                     | **`smallRaces`** (nuevo, §7.2): 8 carreras reales de 5-10 equipos de 4-6.                                                                                                                                         |
| —           | —                                                     | **`duelBench`** (nuevo, §7.3): grupos de 2-6 construidos a mano.                                                                                                                                                  |
| —           | —                                                     | **`ordersBench`** (nuevo, §7.3): la misma etapa con una palanca cambiada.                                                                                                                                         |
| —           | —                                                     | **`informacion`** (nuevo, §7.4): dos brazos, real y control.                                                                                                                                                      |

### 9.5 Constantes que se RETIRAN

`tacticMaxMoves` 3 · `closingNow` como veto · `tacticAllowKmGain` 0,5 · `tacticAllowSizePenalty`
0,05 · `tacticAllowGcPenalty` 0,75 · `tacticAllowMax` 0,7 · `gcControlLeash` 700 (lo sustituye
`leash(t)`) · `noOwnerCommitFactor` 0,94 · `teamDriveSecondCard` 0,2 · `windPlacementTeam` 25 ·
`windPlacementLeader` 12 · `windPlacementLuck` 10 · `sprintTrainKm` 3 **como frontera del tren** ·
`tacticNoAttackKm` 3 · el `breakScore` de rodador de `autoOrders`.

Todas se conservan **comentadas** como referencia del modelo anterior, igual que se hizo con
`breakawaySizeRange` y `breakawayScore*` en la v9.

**Y una que NO se retira, a propósito**: `tacticAllowBase` 0,30 **cambia de nombre** a `customsBase`
**con el mismo valor**, para que `pot = 0` reproduzca la conducta de hoy. Es la hipótesis nula del
paso 6.

**Constantes con historia que cambian de dueño**, y hay que decirlo:

| Constante                                                             | Hoy                                                                                                     | Qué le pasa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `breakawaySkipSprThreshold`                                           | 70 (absoluto)                                                                                           | Pasa a **percentil del campo del día** (p90 de SPR), para que funcione en continental. **[DECISIÓN DEL DUEÑO 3]**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `coopReviewBlocks`                                                    | 20 (2 km)                                                                                               | Se conserva. La revisión de la aduana pasa a 1 km, que es lo que el dueño pidió; la de cooperación se queda donde está porque está medida.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **`finishRoleWeight[gregario]`**                                      | 0,88                                                                                                    | **Sube a 0,94 SOLO si `gregariosEnPodioPct` no se mueve, y el 0,88 se queda si se mueve.** La idea es correcta —el 0,88 era el parche de la v48 para el problema que R02 resuelve de verdad, y su propio comentario lo dice: «la respuesta fue un factor por rol, no una mecánica de colaboración»— pero **la versión anterior la escribía como un cambio incondicional, y eso deshace más de la mitad de un arreglo medido contra una queja literal del dueño**. La queja es de la v48: **«no tiene sentido que luchen el sprint 2 del mismo equipo (y encima les gana el otro!!!)»**, y el arreglo se midió en el número que él estaba mirando: **gregarios en el podio 45,8 % → 27,3 %** (y cazaetapas 0,41× → 1,44×). Subir de 0,88 a 0,94 devuelve **más de la mitad** de ese recorrido. Y ningún banco del diseño vigilaba lo que él miró: el paso 8 medía `gregarioSharePct`, que es el **reparto de roles** y otra cosa distinta. Por eso esta revisión añade **`gregariosEnPodioPct`** a §7.5 con banda **≤ 30 %** —el número que dejó la v48, redondeado por arriba desde el 27,3 % medido— y ata la subida a él: **paso 8, se mide con 0,88; se sube a 0,94; se vuelve a medir. Si `gregariosEnPodioPct` pasa de 30 %, se revierte a 0,88 y R02 se da por insuficiente**, que es información y no un fracaso. Un parche no se retira porque haya llegado la mecánica de verdad: se retira cuando la mecánica de verdad demuestra, con el mismo número, que ya no hace falta. |
| `SPRINTER_MIN`                                                        | 68                                                                                                      | Ya marcado **[DECISIÓN DEL DUEÑO 25]** en `diseno-entrenamiento.md` §6: pasa a percentil. **Se hereda, no se reabre.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `pelotonMoodSpread`                                                   | 0,14                                                                                                    | **Baja a 0,07** y se le suman siete causas. El dado **no se retira**: el dueño pidió «la probabilidad de que el pelotón eche la hueva». Guardarraíl: `moodSpreadS` ≥ 3 km/h.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `descentSelectKm`                                                     | 1                                                                                                       | Pasa a «el descenso entero» cuando `kmToGo ≤ 25`: un descenso final largo deja hoy de seleccionar tras 1 km (S-280).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **`tacticInsideAttackMinRiders`** (`constants.ts:2724`)               | 3                                                                                                       | **Baja a 2** (R18.4bis, paso 7). **Esta fila faltaba y la citaba el Apéndice B**, que dice de ella «no suma como nueva: es una que se retira y va en §9.5» —y en §9.5 no estaba, así que la referencia colgaba—. No se retira del código: **cambia de valor**, y por eso vive en esta tabla y no en la lista de arriba. Motivo: con 3, `ataque_grupo` es imposible en un grupo de dos, o sea que **el mano a mano de general no puede existir** (S-266, `AUSENTE`); GRUPO-50 lo nombra literalmente. Con 2, el duelo de dos hombres vuelve a ser una situación que el motor sabe escribir.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **`finishPaveKm`** (`constants.ts:3416`)                              | 30                                                                                                      | Baja a **10**, **[DECISIÓN DEL DUEÑO 18]**, paso 8. **El nombre de esta fila estaba mal**: este documento la llamaba `paveFinishKm`, que **no existe** en el repositorio (grep en `packages` y `apps`: cero resultados). Y el motivo estaba mal contado: `finishPaveKm` es la **COLA** de los últimos N km (`finish.ts:116`, `paveFraction: fraction(tail(STAGE.finishPaveKm), 'paves')`), no un km absoluto, así que «un adoquín en el km 150» solo cae dentro en una etapa de exactamente 180 km. El defecto real va en **km A META**: con ventana de 30 km, un sector que muere a **25 km de la línea** sigue tipando la etapa de pavé. **Y NO baja a 3**: `finishPaveFraction` 0,1 exige que el 10 % de la ventana sea pavé, y sobre 3 km eso son **300 metros** —cualquier plaza empedrada tiparía la etapa—. Con 10 km el listón queda en 1 km de pavé, que es un sector de verdad. Comprobación obligatoria en el paso 8 sobre los cinco recorridos de pavé del inventario, con predicción declarada (Roubaix sigue `pave`, el Ronde sigue sin serlo); si Roubaix cae, la ventana se queda en 30 y el defecto se ataca por `finishPaveFraction`.                                                                                                                                                                                                                                                                                                                                 |
| **`contestClimbs: mountain` del maillot** (`world/autoOrders.ts:149`) | el portador del maillot sale con `contestClimbs = true` en etapa de montaña, **por decisión de la v42** | **Se RETIRA** (R05.10, paso 8). No es una constante numérica, pero es un valor por defecto que decide conducta y se movía en silencio, así que va en esta tabla. Motivo: la v42 se lo dio para que el maillot no regalara la montaña, y R05.3 + R05.11 lo resuelven mejor —hay un equipo con motivo `montana` que la disputa a propósito—. **Efecto esperado y declarado ANTES de medir**: `komJerseyContestedPct` (puntos de cima en manos de quien los busca) **sube** hacia su banda **55-90 %**, y el maillot deja de gastar cerillos en cotas que no decide. Se mide en el paso 10, con R06 ya puesto. Si en vez de subir baja, el que está mal es el cambio.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

### 9.6 Esquema y contratos

- **Migración**: `stage_orders` gana `trigger_on`, `chase_policy`, `refuse_relay_teams`, `day_goal`;
  tablas nuevas `team_race_plan` y `race_classifications` (puntos, montaña, joven, equipos);
  `stage_snapshots` gana los campos de `StageMemory`.
- **`contracts.ts`**: `raceReportOrdersSchema` pasa a devolver **las once palancas** (hoy devuelve
  cuatro), y `stageOrderSchema` gana los cuatro campos opcionales.
- **`StageInput`** gana `race?: RaceContext` y `memory?: StageMemory`, **los dos opcionales**.
  **`StageOutput` NO gana nada**, y es deliberado: una versión anterior de este documento le añadía
  aquí un `memory?: StageMemory` que contradecía a R09, a §1.2 y a §3.3 en la misma página. La
  memoria de mañana **la construye `packages/db`** leyendo lo que la etapa ya emite hoy (`events`,
  `results`, `workUnits`, `efforts`, `incidents`) más las tablas del paso 4; lo que hoy no se puede
  deducir —quién no relevó, quién rompió un trato, el margen del corte— sale de **eventos nuevos de
  R23**, que viajan dentro de `events`, no de un campo aparte. **El motor no escribe la memoria**
  (Frontera 3), y por eso no hay ningún campo de salida nuevo que sellar ni dos sitios donde pueda
  vivir la verdad.
- **`FinishType` gana un octavo valor, `muro`** (R17.2, **paso 8**). **Es un cambio de contrato, no
  un re-ajuste de pesos**, y se declara aquí entero porque §1.1 promete que los siete
  `finishWeights` no se tocan y esto podría leerse como que sí: los siete **siguen intactos**, lo que
  hay es una fila nueva (`COL 0,55 · SPR 0,20 · TAC 0,15 · RES 0,10`, DERIVADA de `alto` y
  `puncheur`). Lo que rompe es todo lo que hace exhaustividad sobre el tipo: **`finishRoleWeight`,
  `admitsBunchFinish`, `isSprintFinish` y cualquier `switch` sobre `FinishType`** tienen que ganar su
  rama (`admitsBunchFinish('muro')` = false, `isSprintFinish('muro')` = false), y `deriveFinishTerrain`
  su condición (cota ≤ `muroMaxKmToFinish` 1,0 km con `g` ≥ `muroMinGradient` 8 %). **Huella:
  ninguna de las cuatro se mueve por esto** —`llana-180` no tiene muro y el final de `reina-150` es
  `alto`—, así que el `ENGINE_VERSION++` del paso 8 se lo lleva R21, no R17.2. **Y el ancla del Muro
  de Huy que §1.1 invoca no se rompe**: con `muroMaxKmToFinish` = 1,0 km, Huy sigue saliendo
  `puncheur` como hoy (`stage/finish.ts:126-128`, «y eso es correcto»); `muro` es para la cota corta
  y dura que hoy se tipa mal, no para Huy. **La alternativa por si se recorta** está escrita en R17.2:
  retirar `muro` y cerrar S-327/S-330 con `finishPuncheurScore`/`finishPuncheurKmToGo` dentro del
  tipo `puncheur`, que no toca el contrato y pierde solo la distinción entre muro y repecho largo.
- **`ENGINE_VERSION`**: 52 → **74** si se hacen los veintiún pasos. **Son 22 subidas, no 17**, y la
  lista nominal está en §9.3: se añade el **paso 1** (el generador de recorridos cambia el resultado
  de toda etapa sobre recorrido real, y `checkReplay` solo compara el número de versión), suben **dos**
  de los cuatro PR del paso 17 (17b y 17c) y **los cuatro** del paso 18. Cada subida en su PR y ninguna
  compartida.

---

## 10. Decisiones que son del dueño

Cada una con recomendación, y **el defecto ya no es uno solo**. La versión anterior de esta sección
decía «la recomendación es lo que se implementa por defecto si no dice otra cosa: no hay ningún "a
definir"», y eso, aplicado a las veintitrés decisiones por igual, tenía una consecuencia que nadie
había escrito: **las bandas que el dueño fijó o movió en persona se habrían movido por silencio**. La
cola de la reina (decisión 6) es la única banda de §9.1 que el propio documento reconocía con ancla de
dominio, y su defecto era «sí, subir el techo a 16 %» — o sea, se subía sola si él no contestaba. Eso
contradice de frente lo que el dueño dejó dicho en la v20 —**«no persigas el 45 % a ciegas… Prefiero
una especificación corregida a un motor calibrado hacia un objetivo equivocado»**— y lo que
`mapa-requisitos-duenio.md` §14.2 dice de esa banda concreta: está «atada a la banda 14 % de §VI.3 …
y **no se mueve sin decisión del dueño**».

**Así que el defecto se parte en dos clases, y cada decisión dice a cuál pertenece:**

- **Clase A — defecto activo.** La recomendación se implementa si no dice otra cosa. Son las
  decisiones de **arquitectura, alcance y método**: no tocan ninguna banda ni umbral que el dueño
  fijara o moviera en persona, y pararlas a la espera de una respuesta bloquearía el plan por nada.
- **Clase B — defecto PARADO.** La recomendación **no** se implementa sin respuesta escrita, y **el
  paso que la contiene se para en ese punto** (el resto del paso puede mezclarse; lo que la decisión
  toca, no). Son las que mueven una banda, un umbral o un corte que **él** fijó o movió: **6, 22, 23,
  5, 3, 8, 7, 19, 20 y 21**. La regla que las agrupa está en §1.4: «si la banda tenía ancla de
  dominio, lo que se discute es la regla», y una regla no se discute sola.

La columna **«Si no contesta»** de cada decisión dice el valor literal con el que se sigue adelante,
para que «parado» signifique algo concreto y no «alguien se acordará».

**Son veintitrés y la cuenta va escrita, porque este documento la traía en diecisiete y luego la
resumía mal.** Nacieron **17** con la síntesis; la revisión adversaria añadió **cuatro** que los
racimos ya citaban y que §10 no tenía —la **18** (`finishPaveKm` 30 → 10, R17.4), la **19**
(`medianLeadGroupRiders` gana banda, R17.5), la **20** (el suelo de `soloWinMediaPct`, §9.1bis) y la
**21** (banda al reparto de roles, `gregarioSharePct`)— y **dos** más al partir los dos suelos de
montaña de su propuesta técnica: la **22** (suelo de `mountain.top10GapSeconds`) y la **23** (suelo de
`mountain.breakawayWinPct`). **17 + 4 + 2 = 23**, sin huecos y sin repetidos en la numeración. La
redacción anterior decía «esta revisión añade la 22 y la 23, y las 19-21 ya habían nacido en la
anterior» y se dejaba fuera la **18**, con lo que su propia suma daba 22 sobre una tabla de 23.

| #                                        | Clase | Si no contesta                                                                                                                                                                                       |
| ---------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 memoria de carrera                     | A     | memoria de CARRERA (nace y muere con la carrera)                                                                                                                                                     |
| 2 cupo de fuga                           | A     | cupo BLANDO (precio, no veto), salvo el del maillot                                                                                                                                                  |
| 3 `breakawaySkipSprThreshold` percentil  | **B** | **se queda en 70 absoluto**; el paso 6 mezcla sin esta pieza y en continental los sprinters siguen yéndose a la fuga, medido y anotado                                                               |
| 4 directores bot falibles                | A     | sí, `dirQuality` {0,85 · 0,65 · 0,50}                                                                                                                                                                |
| 5 sustituir `reina-150`                  | **B** | **`reina-150` se queda como escenario canónico y con su nombre**; `mountain.breakawayWinPct` se publica **sin banda** en `realQueens` hasta que conteste                                             |
| 6 cola de la reina 14 → 16 %             | **B** | **el techo se queda en 14 %**; el paso 10 criba todos los `shed` igual, mide `queenLastGroupPct` y **si se sale, se para el paso 10 y se le enseña el número**; no se mezcla con la banda ensanchada |
| 7 ¿se hace el paso 20?                   | **B** | **no se hace.** Es el único que mueve la ley de velocidad (inv. 43, C2); un cambio de física no entra por defecto                                                                                    |
| 8 corte de tiempo por número             | **B** | **se queda como hoy** (readmite siempre y a todos); R26 se implementa sin `readmitBlockRiders` y se dice en la crónica que el grupeto no tiene apuesta                                               |
| 9 rechazar el liderazgo                  | A     | sí, `pickLeader` ignora los votos que apuntan a quien se declaró `libre`                                                                                                                             |
| 10 retirar `tacticMaxMoves`/`closingNow` | A     | sí, los dos, en el paso 5                                                                                                                                                                            |
| 11 CRE                                   | A     | no ahora                                                                                                                                                                                             |
| 12 comisario                             | A     | no todavía                                                                                                                                                                                           |
| 13 re-sellado por tanda                  | A     | por tanda, con causa y predicción                                                                                                                                                                    |
| 14 `orderEffectSpread` invariante        | A     | invariante, con las tres caras                                                                                                                                                                       |
| 15 la ley en cuesta                      | A     | **no** se toca (el defecto es no tocar la física)                                                                                                                                                    |
| 16 general a `realQueens`                | A     | sí a `realQueens`, no a `calendarQueens` ni `climbs`                                                                                                                                                 |
| 17 partir el job de CI                   | A     | se decide **con los números del paso 0 delante**, no antes                                                                                                                                           |
| 18 `finishPaveKm` 30 → 10                | A     | 30 → 10, con la comprobación de los cinco recorridos; si Roubaix cae, vuelve a 30                                                                                                                    |
| 19 `medianLeadGroupRiders` gana banda    | **B** | **se publica sin banda** (que es como está hoy) en los dos tipos de final; no se convierte un encargo rojo en objetivo por silencio                                                                  |
| 20 `soloWinMediaPct` suelo 12            | **B** | **se publica sin banda**; `media-190` entra en CI midiendo, no vigilando                                                                                                                             |
| 21 `gregarioSharePct` gana banda         | **B** | **se publica sin banda** — que es además la recomendación, así que aquí las dos coinciden                                                                                                            |
| 22 suelo de `mountain.top10GapSeconds`   | **B** | **se queda en 40**; el techo sube a 360 igual, que eso sí es propuesta técnica                                                                                                                       |
| 23 suelo de `mountain.breakawayWinPct`   | **B** | **se publica sin banda** en `realQueens`; la banda vieja sobre `reina-150` queda declarada inválida y no se sustituye por otra                                                                       |

**Y una regla de lectura para las de clase B**, para que no se conviertan en una excusa: _parado_ no
es _aparcado_. El paso corre igual, **mide** y publica el número **sin banda**, con su predicción
escrita. Lo único que no ocurre sin firma es **escribir la banda nueva en `sim/targets.ts`**. Medir
nunca necesita permiso; cambiar el listón, sí.

**1. ¿Cuánta memoria arrastra la carrera?** (S-423, S-401, S-404)
El catálogo pide que al ganador de ayer se le acorte la cuerda, que haya deudas de relevos y que haya
rivalidades entre equipos.
→ **Recomendación: memoria de CARRERA, no de temporada.** `RaceMemory` nace y muere con la carrera;
lo único que sobrevive entre carreras es `trust` y `morale`, que ya existen. Motivo: una memoria de
temporada obliga a un esquema nuevo y hace las carreras previsibles a veinte días vista. Las
rivalidades estructurales (S-404) se **derivan** de la temporada pero se **aplican** dentro de la
carrera, que es lo barato y lo suficiente.

**2. ¿Cupo de fuga estricto o blando?** (S-083)
→ **Recomendación: blando.** El cupo es un **precio** (`appetite = 0` al superarlo) y no un veto,
salvo el del maillot, que sigue siendo veto por cita expresa (v32). Un cupo duro hace las carreras
más creíbles **y también más previsibles**; el precio deja sitio al día raro, que es justo lo que
`flatMoveWorstMarginS` 0-900 protege por decisión del dueño.

**3. ¿`breakawaySkipSprThreshold` pasa de absoluto a percentil?** (S-473)
Hoy es 70 sobre SPR crudo, calibrado contra una génesis que ya no existe. En PRS (SPR maduro ≈ 61) y
CON (≈ 54) el veto **no dispara nunca**, así que en continental los sprinters se van a la fuga.
→ **Recomendación: sí, percentil (p90 del campo del día).** Es la misma corrección que
`diseno-entrenamiento.md` §6 ya dictó para `SPRINTER_MIN`, y no reabrirla sería tener dos umbrales
absolutos incoherentes en el mismo motor.

**4. ¿Los directores bot fallan, y por qué?** (S-009, S-013, S-014, G9)
→ **Recomendación: sí, y por INFORMACIÓN, no por vatios.** `dirQuality` por división
{WT 0,85 · PRS 0,65 · CON 0,50}. Es la única forma de que G9 («hacer que los bots sean peores que los
humanos») exista sin romper la física, y el propio catálogo lo dice: «es la pieza que las hace
posibles sin tocar la física —mismos vatios, distinto número en la pizarra». **Riesgo asumido y
declarado**: desafina todas las cazas y mueve todas las huellas (paso 11). **Mitigación obligatoria**:
el brazo de control y el invariante 47, que lo hacen reversible por constantes.

**5. ¿Se sustituye el escenario canónico `reina-150`?**
El propio `targets.ts` dice que «no es una etapa reina sino media montaña con la etiqueta cambiada»
(1.200 m), y que `mountain.breakawayWinPct` «cae de 26,7 % a 0 % según el puerto pase de 15 a 50 km»:
la banda **mide la posición del puerto, no la carrera**.
→ **Recomendación: sí, sustituirlo por una reina de verdad** (3.500 m, dos puertos, final en alto)
en el paso 21, con la huella de `reina-150` **retirada** y una nueva sellada. Es caro y es honesto:
mantener una banda que no mide lo que dice es peor que moverla.
→ **Y mientras tanto, sin esperar a la decisión**: `mountain.breakawayWinPct` se mide en `realQueens`
con banda **12-35 %** desde el paso 6. Eso desbloquea la transición entera sin obligar a decidir esto
hoy, que es lo que a la propuesta base le faltaba.

**6. ¿La cola de las reinas puede pasar del 14 %?** (deuda §14.2, S-443)
Cribar los grupetos que ya no son la carrera es lo que la carretera hace, y el motor no lo hace
porque **la banda tiene ancla en §VI.3**. Se probó y salió 14,33 % con 37 grupos en meta.
→ **Recomendación: sí, subir el techo a 16 %** (`grandTour.queenLastGroupPct` y
`realQueens.lastGroupPct`). El corte del §VI.3 va del 8 % (llana) al 18 % (reina): 16 % **sigue
dentro del corte** y es la carretera.
→ **Clase B. Si no contesta: el techo se queda en 14 %.** Y hay que corregir dos cosas que esta
decisión decía: (a) **no es «la única banda de §9.1 con ancla de dominio»** —son cuatro filas y tres
decisiones, 6, 22 y 23, contadas en §9.1 contra la lista de trece de §1.4—; y (b) **su defecto no
puede ser «sí»**, porque `mapa-requisitos-duenio.md` §14.2 dice de esta banda exactamente que está
«atada a la banda 14 % de §VI.3 … y **no se mueve sin decisión del dueño**». Con el defecto viejo, la
única banda que el documento reconocía como suya se le habría movido por silencio. El paso 10 criba
todos los `shed` igual, mide la cola, la publica **con el número medido delante** —14,33 % con 37
grupos en meta es lo que ya salió al probarlo— y **se para ahí** hasta que él conteste.

**7. ¿Se hace el paso 20 (viento con dirección)?**
Es el único paso que mueve **la ley de velocidad** (invariante 43, que además es el invariante de
control C2). Ojo con la redacción vieja, que decía «el único que toca la física»: eso era falso —hay
cinco multiplicadores del coste de bloque repartidos por los pasos 9, 13, 14 y 18 (§9.1bis), y el 18
además edita `physics.ts` por la altitud—. Lo que es único de este paso es la **ley**, que es la
frontera que de verdad no se cruza (§1.1, Frontera 2).
→ **Recomendación: sí, pero el ÚLTIMO y SOLO, con `ENGINE_VERSION++` propio.** R14 cierra 12
situaciones y una es un `CONTRARIO` con cita (S-032, el parte que las órdenes pueden citar); pero si
hay que recortar, **es lo primero que se cae sin dejar el diseño cojo**: las otras once filas de R14
no tocan `targetSpeed`.

**8. ¿El corte de tiempo mira el número?** (S-494, S-464)
Hoy readmite **siempre y a todos**, y por eso el tamaño del grupeto no es un activo y R26 entero se
organiza por inercia en vez de por miedo.
→ **Recomendación: sí.** `readmitBlockRiders` 20: al grupo grande se le readmite en bloque con
penalización (pierde los puntos del día, no la general), al pequeño no. Es lo que **le da apuesta al
racimo entero**, y no cuesta nada implementarlo. Sin esto, S-310, S-359, S-365, S-371 y S-412 se
cierran «por fuera» y no significan nada.

**9. ¿Un humano puede rechazar el liderazgo?** (S-058)
Hoy, si sus gregarios bot le apuntan, es jefe aunque escriba `libre`.
→ **Recomendación: sí.** `pickLeader` ignora los votos que apuntan a quien se declaró `libre` o
`cazaetapas`. **La contrapartida honesta**, y va escrita en pantalla: ese hombre no recibe arropo, ni
tren, ni rescate. Es la mitad de la cita del dueño que la v58 dejó sin hacer.

**10. ¿Se retiran `tacticMaxMoves` y `closingNow`?** (S-444, S-487)
Son los dos `CONTRARIO` que apagan la capa táctica por delante y por detrás de la fuga del día, y uno
está medido con su propio comentario: «cuatro intentos hasta el km 19 y ni uno más en los 190
restantes».
→ **Recomendación: sí, los dos, en el paso 5.** El techo pasa a ser por fase y por grupo de origen;
el cierre pasa a ser **precio** en vez de veto. Es **el paso de mayor rendimiento por línea tocada de
todo el plan**.

**11. ¿Se hace la CRE?** (S-163)
Es un formato de carrera entero, no un momento de la etapa: el tiempo lo da el 4.º hombre, se rueda a
su ritmo, los débiles tiran corto y se dejan caer, y el jefe va protegido.
→ **Recomendación: no ahora.** Queda anotada como fuera de alcance, con su ficha en el catálogo y su
línea en la deuda. Meterla aquí duplicaría el tamaño del paso 19 sin cerrar ningún racimo más.

**12. ¿Existe el comisario?** (S-448)
Sanciones, relegaciones por sprint irregular, rebufo de coches, avituallamiento fuera de zona, y la
clasificación que cambia después de meta.
→ **Recomendación: no, todavía.** Es un actor nuevo en una capa que no existe, aporta poco a la
táctica y abre un frente entero (reglamento, apelaciones, narración). Se anota y se deja fuera. Es la
única situación del catálogo que **no cae en ningún racimo y no se cierra**.

**13. ¿Se re-sellan las huellas por tanda o al final?**
→ **Recomendación: por tanda, con causa escrita Y PREDICCIÓN DECLARADA ANTES**, como se hizo en la
v49. Re-sellar al final convierte doce causas en una nota ilegible y hace imposible atribuir un
movimiento de banda a su paso, que es la única razón por la que las huellas existen. La opcionalidad
del contexto (§1.2) ya compra lo que se puede comprar: los pasos de andamio salen **idénticos**, y el
re-sellado **de contrato** ocurre una sola vez, en el paso 5.

**14. ¿`orderEffectSpread` es un invariante o una vigilancia?**
Mide si las palancas del jugador cambian el resultado. El dueño se quejó de que no lo hacen.
→ **Recomendación: invariante, y con las TRES caras.** Suelo `orderEffectSpread` ≥ 0,25 (una palanca
que no mueve nada es la queja literal); techo `orderMaxEffect` **≤ `0,045 · fieldSize`** (una
palanca que decide sola convierte el juego en una pantalla de configuración y choca con «todo jugador
es un CICLISTA»); y dirección `orderDirection` con **tolerancia cero sobre el efecto pareado por
semilla** (si la pantalla promete algo, el motor lo cumple: un `a_tope` no puede acabar de media por
debajo de un `ahorrar`). El suelo solo no basta: un efecto grande con el signo cambiado también lo
pasa.
**Dos correcciones sobre la redacción anterior de esta decisión, y las dos son de coherencia con §6.2
y con §7.3:**

- **Son ONCE palancas, no siete.** §6.2 conserva las siete de hoy enteras y añade cuatro campos
  (`triggerOn`, `chasePolicy`, `refuseRelayTeams`, `dayGoal`), y son justamente esos cuatro los que
  cierran **S-214, S-215, S-216, S-256, S-321 y S-322** —seis `AUSENTE` con cita—. Medir el suelo,
  el techo y la dirección sobre siete dejaba las seis sin ninguna prueba. `ordersBench` corre
  **11 × 2 × 12 ≈ 70 s estimados**, y el «estimados» va en negrita a propósito: **el segundo real se
  mide en el paso 0** y **en qué job cae se decide después de medir** (§7.7), no antes. Y hay una
  segunda puerta escrita en §7.3: si el intervalo del efecto pareado cruza el cero en alguna palanca,
  `ordersBench` sube a **≥ 60 semillas** para esa palanca o se va entero al job largo. Un invariante
  de tolerancia cero en el job rápido solo es honesto si su estadístico es casi determinista.
- **El techo va en FRACCIÓN del campo, no en puestos absolutos.** Se declaraba «≤ 8 puestos en un
  campo de 176» y se mide en `ordersBench`, que corre un campo de **88** (11×8): 8 puestos sobre 88
  es el doble de listón que 8 sobre 176. `0,045 · 176` = 7,9 ≈ los 8 de siempre y `0,045 · 88` = 4,
  o sea el mismo listón en los dos sitios. **No es un ensanchamiento**: es el mismo número dicho de
  forma que no cambie según dónde se mida.

**15. ¿La ley en cuesta se toca para que la fuga corone el puerto final?** (S-467, deuda §14.5)
Está medido que la aritmética de la ley en cuesta —P75 65 contra 88 son 28,8 s/km, que sobre 40 km de
puerto son diecinueve minutos— es la causa de fondo de que una fuga no aguante en montaña. Las dos
perillas que se probaron (`breakFinaleCommit`, `breakClimbCommit`) **se revirtieron en `dc489a6`** y
el dueño cerró el tema con «el problema no es la ley».
→ **Recomendación: NO tocarla, y atacar S-467 solo por sus causas** —el hombre correcto en la fuga
(R03.4d), el turno con orden (R18.1), la asimetría del mejor rematador (R18.3), el compromiso del
solitario reevaluado (R18.4) y el perfil bien escrito (R28)—. **Y medirlo en el paso 21 con
`breakClimberShare` y `calendarQueens.breakawayWinPct`.** Si con las cinco puestas la fuga sigue sin
coronar nunca, entonces vuelve aquí como decisión sobre la ley, con los números delante. Lo que **no**
se hace es reabrir dos perillas que ya se quitaron una vez.

**16. ¿Se le dan clasificaciones y general a `realQueens`, `calendarQueens` y `climbs`?**
Hoy corren con déficit 0, o sea **sin general en absoluto**. Con la regla de compatibilidad (§1.2)
pueden seguir así indefinidamente, pero entonces R04, R05 y R07 **no se miden en montaña**.
→ **Recomendación: sí, a `realQueens`; no a `calendarQueens` ni a `climbs`.** `realQueens` son 9
etapas y darle una general sintética cuesta poco; `calendarQueens` muestrea 157 reinas para medir el
GENERADOR y no la carrera, y `climbs` mira dentro del puerto. Coste: ≈ 0 s (es un campo del input).

**17. ¿Se parte el job de CI en dos?**
**Esta decisión estaba escrita sobre una línea base falsa y hay que rehacerla entera.** Decía «el
total pasa de 536 s a ≈ 1.252 s», y los **536 s no son una medida de hoy**: son un comentario de
`.github/workflows/ci.yml` l. 63-65 escrito **cuando `packages/engine/src/sim/` tenía 3 ficheros y 69
pruebas**, y el propio `mapa-bancos.md:500` lo marca como caducado. Hoy `test:bancos` corre cinco
ficheros de prueba sobre catorce módulos, y las cifras MEDIDAS que conviven en la misma fuente suman
**≈ 6.096 s de suelo** (§7.7). Así que **el 1.252 s, el «21 minutos», el «+8 % ≈ 43 s», el
«`bancos-rapidos` ≈ 420 s» y el «de 9 a 7 minutos» quedan todos invalidados**: ninguno se conserva.
→ **Recomendación: sí a la partición, pero DECIDIDA DESPUÉS DE MEDIR, no antes** (§7.7). El paso 0
mide `pnpm test:bancos` en CI con `--reporter=verbose`, publica el segundo real por fichero y por
`it` en `docs/balance.md` v60 §0, y **con esos números** se escribe la composición de
`bancos-rapidos` / `bancos-largos`. La condición dura se conserva: todo paso que mueva una banda del
largo **corre el largo antes de mezclar**.
→ **Y la consecuencia honesta, que la versión anterior vendía al revés: en esta tanda el PR normal NO
baja a 7 minutos.** La columna «Mueve» de §8 lista `grandTour`, `smallTours`, `realQueens` o
`calendarQueens` en **17 de los 21 pasos** (1, 3 y del 5 al 19), así que esos 17 PR pagan el job largo
entero. La partición sigue ganando para los PR que **no** son de esta tanda —UI, `packages/db`,
API—, y ése es su valor real. **No** se ensancha ninguna banda para correr menos semillas.
→ **Clase A. Si no contesta: se decide con los números del paso 0 delante.**

**18. ¿`finishPaveKm` baja de 30 km a 10?** (S-480, S-369, R17.4)
Es un recorrido real cuyo tipado cambia, y por eso es decisión y no propuesta. `finishPaveKm` es la
**cola** de los últimos N km (`finish.ts:116`), no un km absoluto: con 30 km, un sector que muere a
**25 km de la línea** sigue tipando la etapa de pavé, y los 25 km de asfalto que vienen detrás la
convierten en otra cosa. El propio comentario de la constante ya nombra el caso por el otro lado —«el
Ronde, cuyos últimos 13 km tras el Paterberg son asfalto»—, y hoy el Ronde se salva por
`finishPaveFraction`, no por la ventana.
→ **Recomendación: sí, 30 → 10. Y NO a 3**, que es lo que este documento proponía con un ejemplo
falso (un adoquín «en el km 150» solo cae dentro de la cola en una etapa de exactamente 180 km).
Sobre 3 km, `finishPaveFraction` 0,1 se cumple con **300 metros de empedrado** y cualquier plaza de
pueblo tiparía la etapa; sobre 10 km hacen falta 1.000 m, que ya es un sector. **Comprobación
obligatoria en el paso 8** con los cinco recorridos de pavé del inventario (Roubaix, Ronde, Flandes
del banco, Strade, Dwars) y **predicción declarada antes de correrla**: Roubaix sigue tipando `pave`,
el Ronde sigue sin tiparlo. **Si Roubaix cae, la ventana se queda en 30** y el defecto se ataca por
`finishPaveFraction`.

**19. ¿`medianLeadGroupRiders` gana banda, y con qué número?** (S-367, deuda de la v23)
Es la deuda sin banda de la v23, y este documento la traía con tres cosas mal: la llamaba «petición
literal del dueño» cuando `targets.ts:591-593` dice **encargo** («El encargo pedía un objetivo también
para la reina: "una reina real deja llegar juntos a un grupo de 5-15 y no 1"»); rebajaba ese 5-15 a
**3-10** sin decirlo; e ignoraba que el objetivo **salió ROJO y por eso no se le puso banda** —«un
objetivo que nace rojo no es un objetivo, es un TODO con formato de test»—. Y hay una corrección de
premisa posterior: **v26 §5**, con el Tour 2024 delante, midió que en finales EN ALTO el resultado
real es 1·1·1 dentro de 30 s. «El "1" del motor era realista para un final en alto y falso para todo
lo demás.»
→ **Recomendación: banda 5-15 —la del encargo, sin rebajarla— y SOLO en reinas cuyo final no sea
`alto`** (`queenFinalKind ∈ {cima_cerca, valle_corto, valle_largo}`, que R28.2 hace explícito y
contable). En reinas con final en alto **se publica sin banda**: ahí el 1 es la carretera y ponerle
banda sería llamar defecto a lo que v26 §5 midió. Se mide donde vive —`smallTours` `ShapeStats`, y
**portada a `realQueens` partida por `queenFinalKind` en el paso 0**, porque `realQueens.ts` **no la
calcula** hoy—. Consecuencia que va escrita: **`reina-150-1` deja de ser el test de aceptación de
R02+R17+R18** (su final es `alto`), y lo que se le exige es que el ganador cambie de tipo y que la
ventaja se comprima; ver §9.3.

**20. ¿Se acepta un suelo de 12 % en `soloWinMediaPct` cuando el dueño pidió 20-30 %?** (deuda §14.4)
El dueño pidió 20-30 % de ganadores en solitario en media montaña **mirando producción, no el banco**.
Hoy el motor mide **4 %**, y el suelo de 12 que este documento propone no sale de la carretera: sale
de lo que se espera alcanzar con R18 (turno con orden, asimetría del mejor rematador, ruptura a 8 km,
solitario que dosifica).
→ **Recomendación: sí, 12-28 % como banda de trabajo, PERO declarada como lo que es: una rebaja de un
objetivo del dueño, no un número técnico.** Va en §9.1bis con esa procedencia y **se recalibra en el
paso 21** contra lo que de verdad haya salido. Si con las cuatro piezas de R18 el número se queda
cerca de 12, la conversación que toca es la de la decisión 15 (la ley en cuesta), no la de ensanchar
la banda otra vez. Lo que **no** se hace es enterrar la rebaja en la tabla de un racimo.

**21. ¿Se le pone banda al reparto de roles (`gregarioSharePct`)?** (§14 punto 14 del mapa)
Hoy el **70 %** del campo acaba de gregario, y la bitácora lo dejó como **pregunta abierta** con todas
las letras: «otra pregunta… este banco la deja a la vista sin contestarla» (v48 §4). R17.1 tiene una
hipótesis —que ese 70 % es la consecuencia de repartir papeles por la etiqueta de la etapa— pero
nadie la ha medido.
→ **Recomendación: publicarlo SIN banda en los pasos 0 y 8, y no hacerlo criterio de «hecho» de
ningún paso.** El 45-65 % que este documento traía como banda queda aquí como **recomendación para
cuando la pregunta se conteste**, no como objetivo: ponerle banda ahora es contestar por la puerta de
atrás una pregunta que el dueño dejó abierta, y además haría que el paso 8 se diera por bueno o por
malo según un número que nadie ha decidido. Si tras R17.1 el reparto no se mueve, la causa era otra y
hay que buscarla —no ensanchar la banda hasta que entre—.

**22. ¿El suelo de `mountain.top10GapSeconds` vuelve a subir de 40 a 60?** (invariante 5, v49 §9)
Ésta **no estaba en esta sección y tenía que estar**: este documento la movía dentro de §9.1 como
propuesta técnica —«40-300 → 60-360, el suelo sube porque sale de la nube en que estaba sentado»— y
eso es leer el comentario del repositorio **exactamente al revés**. `targets.ts` dice: **«EL SUELO
BAJA DE 60 A 40 EN LA v49, por decisión del dueño, y no porque un número no pasara: porque el suelo
estaba DENTRO de la nube que pretendía vigilar»**. Los números que lo sostienen están medidos y son
tres: las **120 corridas de `reina-150` dan una nube de 41 a 87 s**; hay un hueco en el racimo de la
mediana (`… 52 52 55 │ 65 65 66 …`) que la mueve **diez segundos de golpe cuando una sola semilla lo
cruza**; y la comparación pareada de la v49 midió **diferencia por semilla con mediana 0 s y p10-p90
de −1 a +1 s** mientras la mediana del banco pasaba de 66 a 55. O sea: el motor no se movió, se movió
el estadístico. Un suelo de 60 vuelve a ponerlo en el centro de la nube y **reintroduce el fallo
intermitente**.
→ **Recomendación: NO subirlo.** El **techo sí sube, 300 → 360**, y eso se queda en §9.1 como
propuesta técnica: R18.8 (el grupo de favoritos deja de relevar) y R13.1 (los rivales atacan al que
cede) ensanchan la selección por arriba, no por abajo. El suelo se queda en **40**, que es lo que un
suelo tiene que hacer: cazar que la montaña deje de seleccionar, no arbitrar dónde cae la mediana.
→ **Y si aun así hay que subirlo, la contrapartida va escrita y no es gratis**: subir el suelo obliga
a **subir las semillas del invariante 5** hasta que la mediana deje de bailar —la alternativa que la
propia v49 declaró honesta y descartó por coste—, y **ese coste va a §7.7**, medido en el paso 0
junto con el resto del reloj de CI. No se sube un suelo sobre una mediana inestable sin pagar la
estabilidad.
→ **Clase B. Si no contesta: el suelo se queda en 40.**

**23. ¿El suelo de `mountain.breakawayWinPct` baja de 25 a 12 al re-anclarlo a `realQueens`?**
El re-anclaje de escenario es propuesta técnica y no necesita firma: `reina-150` «no es una etapa
reina sino media montaña con la etiqueta cambiada» (1.200 m) y la métrica «cae de 26,7 % a 0 % según
el puerto pase de 15 a 50 km», o sea **mide la posición del puerto, no la carrera**. Lo que sí
necesita firma es el número: **bajar el suelo de 25 a 12 es bajar a la mitad el objetivo de fuga en
montaña**, y esa banda tiene ancla de dominio. `mapa-requisitos-duenio.md` §2, v33, la recoge:
«**me parecen buenos esos valores, están cerca de los objetivos**» sobre las **tres** bandas
ensanchadas de aquella tanda —fuga en llano 2-10, **montaña 24-45** y pájaras de Lombardía ≤ 12—, y
la v34 la estrechó de vuelta a **25**. Este documento la contaba entre las que no tienen ancla, y por
eso la movía dentro de §9.1.
→ **Recomendación: re-anclar el escenario ya (paso 6) y PUBLICAR SIN BANDA hasta que él conteste.**
El paso 6 mide `mountain.breakawayWinPct` sobre `realQueens` y lo publica con los dos números
delante: lo que da hoy y lo que da con R03.4(d) (el hombre correcto en la fuga) y R18 (el turno con
orden) puestos. Si con las dos piezas el número sube por sí solo hacia el 25, no hay nada que
decidir. Si se queda abajo, entonces la conversación es la de la decisión 15 —la ley en cuesta— y no
la de aflojar el suelo, que es justo lo que la regla del dueño sobre las bandas prohíbe.
→ **Clase B. Si no contesta: se publica sin banda, y la banda vieja sobre `reina-150` queda declarada
INVÁLIDA, no aflojada.** Una banda que mide la posición del puerto no se conserva por inercia.

---

## Apéndice A — Las veinte más graves, y el paso en que muere cada una

Es la tabla que se revisa **en cada PR** para saber si el paso hizo lo que prometía. Sale del propio
orden de prioridad del catálogo, e incluye **las dos filas que caen fuera de los 28 racimos** —S-285
y S-308—, para las que este documento escribe regla propia (R01.6/R02.10 y R18.8).

| #   | Situación                                         | Estado      | Regla que la cierra                                                              | **Paso**                    |
| --- | ------------------------------------------------- | ----------- | -------------------------------------------------------------------------------- | --------------------------- |
| 1   | **S-176** el pelotón que no sabe a quién persigue | `CONTRARIO` | R20.1 (`target(t)`), con R04.1                                                   | **9**                       |
| 2   | **S-451** el perfil que no es la carretera        | `CONTRARIO` | R28.1                                                                            | **1**                       |
| 3   | **S-486** dónde cae la última cima                | `CONTRARIO` | R28.2 (`queenFinalMix`)                                                          | **1**                       |
| 4   | **S-047** roles consistentes con la estructura    | `CONTRARIO` | R17.1 + R21 (§5.3)                                                               | **8**                       |
| 5   | **S-155** el abanico como decisión                | `CONTRARIO` | R15a.3 + R15b.3 + R20                                                            | **14**                      |
| 6   | **S-285** el satélite y la emboscada              | `CONTRARIO` | **R01.6** (deja de relevar y remolca) + **R02.10** (da ganas de atacar de lejos) | **3** y **7**               |
| 7   | **S-308** grupo de favoritos sin gregarios        | `CONTRARIO` | **R18.8** (el deber se anula, se atacan por turnos, se marcan)                   | **7**                       |
| 8   | **S-031** las órdenes sobre objetivos parciales   | `CONTRARIO` | R06.1 (`contestClimbs` se lee y solo paga el que disputa) + R22                  | **10** y **17**             |
| 9   | **S-269** el día que el favorito se rompe         | `CONTRARIO` | R13.1 (`bloodGain` sobre `readState`)                                            | **12**                      |
| 10  | **S-433** las piernas del llano para la fuga      | `CONTRARIO` | R03.4(d) (`breakScore` por terreno)                                              | **6**                       |
| 11  | **S-114** la aduana del pelotón                   | `AUSENTE`   | R03.1-R03.3 (voto por equipos, subasta)                                          | **6**                       |
| 12  | **S-083** cupo y composición de la fuga           | `AUSENTE`   | R03.4(c) (cupo como precio)                                                      | **6**                       |
| 13  | **S-162** el vocabulario de motivos               | `AUSENTE`   | R05 (once motivos) + clasificaciones                                             | **9** (habilitado en **4**) |
| 14  | **S-391** el colchón depende de lo que queda      | `AUSENTE`   | R04.2 (`leash` sobre el terreno restante)                                        | **6**                       |
| 15  | **S-444** tres movimientos y ni uno más           | `CONTRARIO` | R19.3 (se retira `tacticMaxMoves`)                                               | **5**                       |
| 16  | **S-487** los intentos no se solapan              | `CONTRARIO` | R19.4 (`closingNow` pasa a precio)                                               | **5**                       |
| 17  | **S-458** el hueco de hace un kilómetro           | `AUSENTE`   | R24.2 + R24.3 (la pizarra, con retardo, error y sesgo)                           | **11**                      |
| 18  | **S-222** el coche de equipo                      | `AUSENTE`   | R11.2 + R11.3 (caravana con orden y ascensor)                                    | **13**                      |
| 19  | **S-478** el percance se sabe tarde               | `AUSENTE`   | R24.4 (la noticia) + R12.1-R12.2 (decidir sobre la creencia)                     | **11** y **12**             |
| 20  | **S-488** lo que se ve del rival                  | `AUSENTE`   | R24.5 (`readState` con ruido y disimulo) + R13.1                                 | **11** y **12**             |

**Contadas contra la columna «Paso» de esta misma tabla, que es lo que la versión anterior no hizo.**
Decía «**doce** de las veinte caen en los pasos 1, 5, 6 y 7», y son **nueve**: S-451 (1), S-486 (1),
S-444 (5), S-487 (5), S-433 (6), S-114 (6), S-083 (6), S-391 (6) y S-308 (7). **Diez** contando
**S-285**, que necesita el paso 3 **y** el 7 y por tanto solo cae dentro si se cuenta también el 3 —y
el 3 está dentro del corte de §8.2, así que la cifra que vale para decidir si parar es **diez**, la
misma que §8.2 da—. La diferencia con el «doce» no es cosmética: son dos situaciones graves que el
que decide parar creería cerradas y no lo estarían.

**Y ninguna de las diez necesita tocar la física.** Las dos que sí tocan **coste de bloque** —S-155
vía `placement` (paso 14) y S-222 vía tiempos de coche (paso 13)— **caen fuera del corte**, así que
el corte recomendado no cruza la Frontera 2 ni una vez. Cuando se hagan, las dos modulan el coste
desde `stage/cost.ts` con los multiplicadores de suma cero de §9.1bis, no editando `physics.ts`.

---

## Apéndice B — Recuento de constantes

| Racimo                   |    Nuevas | DERIVADAS |           [calibrar] |
| ------------------------ | --------: | --------: | -------------------: |
| R01                      |         5 |         2 |                    3 |
| R02                      |        16 |         6 |                   10 |
| R03                      |        16 |         6 |                   10 |
| R04                      |         9 |         4 |                    5 |
| R05                      |        14 |         2 |        11 (+1 mixta) |
| R06                      |        11 |         2 |                    9 |
| R07                      |         5 |         2 |                    3 |
| R08                      |         3 |         1 |                    2 |
| R09                      |        13 |         1 |                   12 |
| R10                      |         7 |         2 |                    5 |
| R11                      |        15 |         2 |                   13 |
| R12                      |         9 |         3 |                    6 |
| R13                      |        10 |         2 |                    8 |
| R14                      |         7 |         0 |                    7 |
| R15                      |        35 |        14 |                   21 |
| R16                      |         9 |         3 |                    6 |
| R17                      |         5 |         1 |                    4 |
| R18                      |        25 |         9 |                   16 |
| R19                      |         9 |         3 |                    6 |
| R20                      |        15 |         5 |                   10 |
| R24                      |        14 |         0 |                   14 |
| R25                      |         8 |         0 |                    8 |
| R26                      |         6 |         2 |                    4 |
| R27                      |        11 |         2 |                    9 |
| R28                      |         7 |         2 |                    5 |
| **Frontera 2 (§9.1bis)** |         2 |         0 |                    2 |
| **Total**                | **≈ 306** |  **≈ 76** | **≈ 229 (+1 mixta)** |

**Doce filas se han re-contado contra el texto de §4 en esta revisión**, y hay que decir cuáles y
por qué, porque el recuento anterior era el de una versión del documento que ya no existe:

| Fila | Antes           | Ahora                        | Qué la movió                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---- | --------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R01  | 5 · 3 D · 2 c   | 5 · **2 D** · **3 c**        | `mateBehindGapS` 22 **deja de contar como nueva** (se CONSERVA la de hoy, no se crea); entra `stageRescueMaxGapS` 60 DERIVADA (la rama de etapa de la v37); `satelliteTowCommit` pasa de DERIVADA a **[calibrar]** porque su origen —`POS.abanicoCommit`— **no existe en el repositorio**.                                                                                                                                                                                                                                                                                                                               |
| R03  | 14 · 5 D · 9 c  | **16** · **6 D** · **10 c**  | Entran `customsPotWeight`, `customsAllowMax` y `bridgeWindowKm` (la aduana como dado y el hombre al puente de R03.8); **sale `customsJerseyVeto`**, que tras R03.0 no llega a existir como número.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| R04  | 9 · 5 D · 4 c   | 9 · **4 D** · **5 c**        | `gcLeashMaxS` 900 pasa a [calibrar]: el 900 de `smallTours.flatMoveWorstMarginS` es una **alarma de peor caso**, no una tolerancia de control, y usarla como ancla le cambiaba el significado.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| R05  | 11 · 2 D · 9 c  | **14** · 2 D · **11 c**      | Entran las cuatro de R05.12 (`isolateKm`, `isolateCommit`, `isolateReleaseGain`, `isolateReleaseKm`); `teamsThreatS` pasa a [calibrar] al caerse su derivación (colgaba de `gcControlLeash`, que **este documento retira**). `PURPOSE_CLAIM` es una **tabla mixta** —tres entradas DERIVADAS de `claimFor` y siete [calibrar]—: cuenta como **una nueva** y no se reparte entre las dos columnas, de ahí el «+1 mixta».                                                                                                                                                                                                  |
| R09  | 11 · 1 D · 10 c | **13** · 1 D · **12 c**      | Entran `sprintRevengeGain` y `sprintRevengeRank` (R09.9, la revancha del tren: S-354 figuraba en el «Cierra» sin regla que la escribiera).                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| R14  | 7 · 1 D · 6 c   | 7 · **0 D** · **7 c**        | `echelonCloseThreshold` deja de derivarse de `POS.vientoMinimo`, que **tampoco existe**. R14 se queda **sin ninguna DERIVADA**, y eso es información: el racimo del viento no tiene un solo ancla en el motor de hoy.                                                                                                                                                                                                                                                                                                                                                                                                    |
| R16  | 6 · 2 D · 4 c   | **9** · **3 D** · **6 c**    | Entran las tres del tren de montaña de R16.9 (`climbTurnKm`, `lastHelperKm`, `salvoLambda`), que S-286 y S-284 pedían y ningún racimo escribía.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| R15  | 27 · 9 D · 18 c | **35** · **14 D** · **21 c** | Entran las **siete** del `echelonAttempt` de R15a.3b (`echelonWindMin`, `echelonReadyPlace`, `echelonVictimPlace`, `echelonBudgetMax`, `echelonCommit`, `echelonKm`, `echelonSpend`) —la decisión de abrir el abanico, sin la cual el invariante 60 medía algo que ninguna regla producía— y el listón **`shelteredLeaderSavingPct`** ≤ 3 %, que no es una perilla sino el techo que `accordionGain` no puede pasar sin reabrir la cita del dueño de la v38. `echelonReadyPlace` se deriva de la **fila S-241** y no de `sectorSafePlace`: colgar una nueva de otra nueva no es un ancla, y esta misma tabla lo prohíbe. |
| R18  | 21 · 6 D · 15 c | **25** · **9 D** · **16 c**  | Entran `gcDuelS` **120** y `lambdaDuel` **0,25/km** (R18.4bis, el mano a mano de general que S-266 pedía) y `consolidateGapS` **90** y `consolidateAttackDamp` **0,15 D** (la puerta de consolidación de R18.8, que cierra S-255 y S-312). Ninguna de las cuatro existía cuando se contó esta fila. **Y `tacticInsideAttackMinRiders` no suma**: no es nueva, es una que **se retira** (3 → 2) y va en §9.5.                                                                                                                                                                                                             |
| R20  | 14 · 2 D · 12 c | **15** · **5 D** · **10 c**  | El pulso pasa de una constante a tres: `standoffBaseKm` **2,0**, `standoffMaxKm` **8,0** y `standoffMaxPerStage` **2**, porque con `standoffKm` 0,8 y `standoffGainS` 25 s/km la aritmética daba 20 s contra una banda que empieza en 40. `standoffBaseKm` y `standoffMaxKm` cuentan como **DERIVADAS** aunque su origen no sea una constante del motor sino la **banda** `standoffGapGainS` 40-200 s: una banda es un número medible con dueño, que es lo que un ancla tiene que ser, y por eso la excepción se escribe aquí en vez de esconderse en la columna.                                                        |
| R24  | 13 · 0 D · 13 c | **14** · 0 D · **14 c**      | Entra `disguiseFadeKm` **12**: el disimulo de R24.5 pasa de sesgo fijo y binario a **ruido agotable**, y sin la constante del agotamiento la regla no se puede escribir. R24 **sigue sin una sola DERIVADA**, y eso es información: la capa de información no tiene un solo ancla en el motor de hoy, igual que R14.                                                                                                                                                                                                                                                                                                     |
| R26  | 5 · 1 D · 4 c   | **6** · **2 D** · 4 c        | Entra `burnSprinterCommit` **0,88 D** (la rama (b) de R26.3: los rivales revientan al sprinter en la cota, que es la otra mitad literal de S-244), derivada de `gear.finalDrive` 0,85 y **no** de `approachCommit`, por la misma regla de arriba.                                                                                                                                                                                                                                                                                                                                                                        |

**Por qué el total lleva «≈», dicho para que la diferencia no crezca en silencio.** Las filas de
arriba suman **286 · 76 D · 209 c**; el total dice ≈ 306 · 76 · 229. La diferencia son las
constantes de los racimos que **no declaran bloque propio** en §4 —**R21**, **R22** y **R23**, cuyos
números viven en §5.1-§5.3 (estructuras y papeles) y en §6.2 (las once palancas)— más las que este
documento introduce fuera de racimo. El «≈» es honesto mientras sea eso; deja de serlo en cuanto
alguien lo use para no cuadrar. Por eso el criterio de «hecho» del paso 21 es **«el Apéndice B
re-sumado contra `constants.ts` de verdad»**: si al re-sumar no cuadra, **se corrige la tabla, no el
total**.

La fila **Frontera 2** no es un racimo: son las dos constantes que nacen del punto único de coste
—`tacticalCostCap` **0,60** y `tacticalCostSumTol` **0,02**—, que no pertenecen a ninguna regla
porque su trabajo es **vigilar a las cinco reglas que multiplican el coste del bloque**. Van en
`stage/cost.ts` con los cinco multiplicadores, no en el `constants.ts` de su racimo, precisamente
para que se lean juntas.

**Lo que este recuento dice, y hay que leerlo con honestidad**: 229 constantes marcadas [calibrar] es
**una superficie de calibración mayor que todo el juego de constantes tácticas que el motor tiene
hoy**, y el propio `mapa-bancos.md` §7.21 avisa de que «todo lo más fino que 2-4 puntos porcentuales
está dentro del ruido» con 6-12 semillas. **Cuatro** consecuencias operativas —son cuatro y van
numeradas cuatro; esta línea decía «tres» sobre una lista de cuatro puntos:

1. **El paso 21 no las barre todas.** Barre las que tienen banda propia en §7.5 —**48 de las 52
   filas**, porque **dos se publican SIN banda a propósito** —`rejoinAfterBigLossPct` (deuda §14.1)
   y `gregarioSharePct` (§14 punto 14, decisión 21)— y **dos son mixtas**: `medianLeadGroupRiders`
   lleva banda en reinas de final NO alto y ninguna en final en alto (v26 §5), y
   `msPorEtapaSimulador` es un listón de coste contra la foto del paso 0, no un objetivo de
   conducta— y deja el resto en su valor de partida, que está justificado o derivado. Una constante sin banda
   que la vigile no se calibra: se deja quieta y se anota.
2. **Las 76 DERIVADAS no se tocan nunca sin tocar su origen.** Si alguien mueve
   `grupetoJoinGapSeconds` 12, se mueven `mateAheadGapS` y `placeBadEntryS` con él —**pero no
   `mateBehindGapS`**, que es 22 y no sale de ahí: es el umbral de `jefeEnApuros` que la v58 §4 puso
   con una medida detrás (sin él, la huella de la llana se iba 387 s), se **conserva** y no es una
   derivada de nada. La versión anterior de esta lista lo daba como derivado de
   `grupetoJoinGapSeconds`, que habría hecho que mover el hueco del grupeto arrastrase el umbral del
   rescate sin que nadie lo pretendiera. Van agrupadas en `constants.ts` con el comentario que dice
   de dónde salen.
3. **Cada paso barre solo lo suyo**, con el A/B de la regla de compatibilidad (§1.2) para separar el
   efecto de la constante del efecto de la pieza. Calibrar 306 números a la vez al final es la forma
   segura de no saber nunca qué movió qué.
4. **Ninguna DERIVADA puede colgar de una constante que este documento retira, ni de otra constante
   nueva de este documento**, y las dos comprobaciones son mecánicas y van en el paso 21 junto al
   «Apéndice B re-sumado contra `constants.ts` de verdad»:
   - **Contra las retiradas (§9.5).** Una derivada cuyo origen desaparece queda colgando de un número
     muerto: el valor sobrevive como cifra mágica y el comentario miente. Es lo que pasaba con
     `teamsThreatS` = `gcThreatFraction · gcControlLeash` × 0,57, con `gcControlLeash` retirada en
     el mismo documento. Regla: si el origen está en §9.5, la derivada pasa a **[calibrar] con banco
     nombrado** o se re-deriva de la pieza que sustituye al origen.
   - **Contra las nuevas.** Derivar una constante nueva de otra constante nueva **no es un ancla**:
     es una convención con disfraz, y este recuento la contaría como DERIVADA sin serlo. Un ancla es
     un número que ya está en el motor y que ya ha pasado por una medida. Es lo que pasaba con
     `satelliteTowCommit`, derivado de `approachCommit` (R15b.2), que nace aquí.
   - **Y un ancla tiene que EXISTIR.** Se ha pasado el grep entero: de los identificadores que los
     racimos R01-R13 citan como origen de una derivación, **todos los que quedan existen** en
     `packages/engine/src/constants.ts`. Los dos que no existían —`POS.abanicoCommit` y
     `POS.vientoMinimo`, de un espacio de nombres `POS` que no está en `packages` ni en `apps`— ya
     están reescritos como [calibrar] (R01 y R14). Y se ha pasado también el grep **al revés**, que
     es el que caza la colisión: ningún nombre propuesto como constante NUEVA en R01-R13 existe ya
     en `constants.ts`. El único caso era `leadOutBoostPerHelper` (`constants.ts:3893`, ya aplicada
     en `simulate.ts:6345`), que se habría cobrado **dos veces** en el remate y hoy se llama
     `improvisedLeadOutBoost` con su aviso escrito en R02.6.

---

## Apéndice C — Objeciones desestimadas, y por qué

- **«Reescribir `tactics.ts` de cero sería más limpio.»** No: la mecánica del intento (λ → seguir →
  sostener → boquete calculado → cooperación) es correcta, está medida y tiene detrás nueve reglas de
  dominio dictadas por el dueño. Lo que está mal no es la mecánica: es **lo que ve**. Reescribirla
  tiraría la única parte que no hay que tirar.
- **«Convertir a los 176 en agentes con compromiso propio es más fiel.»** No compensa: cuesta +40 %
  de motor autodeclarado sobre un motor «ya frenado un 48 % en dos versiones», sustituye la única
  mecánica que el dueño nunca ha discutido, y pone los otros diecisiete pasos encima de esa apuesta.
  Lo que se conserva de esa idea es lo bueno: el árbitro de casa, la histéresis en la comparación y
  el banco `temblor`.
- **«El escalar `teamAttack` se puede enriquecer sin llevar `teamId`.»** No: `chooseInstigator` tiene
  que poder decir «éste no, que ya hay dos míos delante», y eso no cabe en un número por equipo. R02,
  R03 y R18 son imposibles sin el censo.
- **«La memoria entre etapas obliga a que el motor tenga estado.»** No: entra como `StageInput`,
  igual que `gcDeficitSeconds` hoy. El motor sigue siendo `(input, seed) → output`, y por eso ningún
  banco se rompe por esto. **Un actor con estado que «se serializa entre etapas» sería lo único de
  este documento capaz de romper todos los bancos a la vez**, y por eso no está.
- **«`placement` es demasiado caro.»** Un float por corredor y **por km** son 35.200 operaciones por
  etapa, del orden de lo que ya cuesta `relayDuty`. El listón está escrito (**≤ 5 %** para `placement`,
  dentro del ≤ 10 % agregado del motor, §7.7) y hay plan B
  (cada 2 km).
- **«Bajar `pelotonMoodSpread` de 0,14 a 0,07 quita variedad.»** La quita del dado y la devuelve por
  causa: siete efectos de humor con signo, más la desesperación, más la memoria. Y lleva guardarraíl
  (`moodSpreadS` ≥ 3 km/h) precisamente porque el dueño pidió «la probabilidad de que el pelotón eche
  la hueva».
- **«Las bandas se están moviendo demasiado.»** Se mueven **dieciséis de treinta y cuatro** —el
  conteo bueno de `sim/targets.ts`, no el 30 que este documento traía—, todas en §9.1 con su motivo;
  **una se declara CONTROL y no se mueve** (`calendarQueens.breakawayWinPct`), **una se parte en
  suelo CONTROL y techo a re-decidir** (`flat.breakawayWinPct`), **una se re-ancla de escenario**
  (`mountain.breakawayWinPct`), **quince se confirman quietas con su fila escrita**, y **cuatro
  BANDAS de las que se mueven** tienen ancla de dominio —la cola de la reina en sus **dos** bandas
  (decisión 6), el suelo de `mountain.top10GapSeconds` (decisión 22) y el suelo de
  `mountain.breakawayWinPct` (decisión 23)—, o sea **tres decisiones del dueño y no una**. Y para que
  las dos cifras de §9.1 no se lean como una contradicción: **la tabla de anclas de §9.1 tiene SIETE
  filas**, que son estas tres que se mueven —contadas por fila, la cola de la reina es una— más las
  **cuatro que se confirman quietas** (`flat.breakawayWinPct`, `calendarQueens.breakawayWinPct`,
  `smallTours.flatMoveWorstMarginS` y `timeTrials.tailPct`). Cuatro **bandas** que se mueven, tres
  **filas** que se mueven, siete filas con ancla: son tres cuentas distintas de la misma cosa y cada
  una dice cuál es su unidad. El
  «solo una» que esta línea decía antes venía de leer §1.4 con la lista corta de tres anclas, cuando
  la buena tiene **trece**. Dos de las dieciséis
  —`abandonCauses.illnessPct` y
  `smallTours.worstRacePhotoRepeat`— se movían ya con la versión anterior de la tabla, **por
  arrastre y en silencio**; lo que cambia no es que se muevan, es que ahora están escritas. El resto
  son bandas que el propio repositorio documenta como «el margen que hoy se puede sostener» o
  «sentadas encima de su ruido».
- **«El tren de sprint y el de montaña son la misma pieza y no hacen falta dos `kind`.»** No al
  revés de lo que parece: **sí** son la misma pieza —por eso R16.9 generaliza `SprintTrain` a
  `Train` con `kind` en vez de escribir un submotor nuevo—, pero el `kind` no sobra. Cambian las
  tres cosas que definen un tren: **cuándo se forma** (15 km de meta contra el pie del puerto
  decisivo), **con qué orden** (por SPR/lanzador contra por MON ascendente) y **cómo se deshace**
  (el último lanza a 200 m; el último gregario de montaña se aparta a 3-5 km de la cima y **no pelea
  la rueda**). Un solo `kind` obligaría a poner esas tres diferencias en `if` dentro de la pieza, que
  es la misma deuda con otro nombre.
- **«Reproponer `breakFinaleCommit` cerraría la deuda §14.4 de una vez.»** Ya se probó, se midió,
  movía la canónica y las reales 8:1, y salió del código. Volver a ponerla no es diseño: es repisar
  terreno refutado. La deuda se ataca por sus causas, y si no cede, es una decisión con los números
  delante (§10, decisión 15).

**Objeciones de la revisión adversaria que NO se aplican, y por qué.** Van con nombre del revisor,
porque dos pares de ellas se contradicen entre sí y el lector tiene derecho a ver las dos caras.

**Son catorce, fundidas en una sola lista y sin duplicados.** Las cuatro tandas de corrección
escribieron sus desestimaciones por separado y en el orden en que fueron cayendo, de modo que esta
tabla mezclaba revisores fila a fila y **se dejaba fuera una** —la de bajar `finishPaveKm` a 3, que
estaba desestimada en el texto de R17.4 y en §9.5 pero no tenía fila aquí, y una desestimación que
solo vive dentro del racimo que corrige es exactamente lo que este apéndice existe para no permitir—.
Aquí van las catorce **agrupadas por revisor**, en el mismo orden en que §0 los presenta —contra el
código, por cobertura, contra el dueño, y por coste y riesgo—, numeradas y sin repetir ninguna. Nueve
se desestiman **en parte** (se aplica una mitad y se rechaza la otra, con la línea de corte escrita) y
cinco **enteras**. Ninguna se desestima por ser incómoda, y **las dos filas donde dos revisores se
contradicen de frente van marcadas**: la **8** (el revisor contra el dueño pide penalizar siempre; el
de cobertura defiende la excepción de S-079, `CONTRARIO` con cita) y la **12** (el de coste y riesgo
quiere retirar el CONTROL de `flat.breakawayWinPct`; el del dueño quiere protegerlo entero). Las dos
se resuelven **dando a cada mitad su dueño y escribiendo la línea de corte**, no eligiendo bando: una
refutación que gana por ser la última en llegar no es una refutación, es un orden de lectura.

| Objeción                                                                                                                                                                                                                                                                                       | Quién                                                                                                               | Por qué NO se aplica                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1.** «Ajustar la banda `bannerContestants` 3-15: hoy el número lo fija la longitud de `STAGE.climbPoints[cat]`, no la conducta, así que medirlo sin cambiar eso no dice nada.»                                                                                                               | Revisor **contra el código** (`simulate.ts:6126-6132`)                                                              | El diagnóstico es correcto y está escrito en la tabla de R06; **la banda no se mueve**. 3-15 es cita literal del dueño («esprintan entre tres y quince») y moverla porque hoy la produce una tabla de puntos sería encoger el objetivo para que pase la medida vieja, que es exactamente lo que la regla del dueño sobre las bandas prohíbe. Lo que se corrige es **cuándo se lee**: su primera lectura útil es la del **paso 10**, con el pago ya atado a `bannerAppetite ≥ bannerContestMin`; antes de eso mide la longitud de `climbPoints`, no la carrera, y así consta en la fila.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **2.** «La puerta de R05.10 debería ser `gcRank <= GC_CARD_RANK` (5), como en `autoOrders.ts:44`, no `gcRank == 1`.»                                                                                                                                                                           | Revisor **contra el código**                                                                                        | Verificado y desestimado: son dos puertas distintas y la coincidencia de nombre engaña. `GC_CARD_RANK` 5 delimita **quién tiene carta de general** —a quién se protege, quién hereda—, y R05.4 y §5.3 la usan para eso. R05.10 dice otra cosa: **el PORTADOR del maillot** no caza puntos de volante ni de cima, porque el maillot ya lo tiene y el cerillo que gasta ahí lo pierde en la general. El 4.º de la general sí puede cazar puntos: no está defendiendo nada. Igualarlas apagaría el motivo `puntos` a cinco hombres por equipo de general y ahí sí se rompe R05. Lo que sí se aplica de la objeción es lo importante: el «sin excepción» se retira (R07.4 es una excepción escrita) y `contestClimbs: mountain` del maillot se retira **con su motivo y su efecto declarado** (§9.5, paso 8).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **3.** «Mover `smallSquadClaim` de la convocatoria al kilómetro» — entendido como _quitarlo_ de §5.2.                                                                                                                                                                                          | Revisor **por cobertura** (S-248)                                                                                   | Se mueve, pero **no se quita de §5.2**: S-008 («la escuadra de 4-6 hombres sabe desde casa que no puede pagar el frente») y S-248 («el derecho al frente baja con los hombres PRESENTES») son dos filas distintas, con dos citas distintas, y la primera es de la convocatoria. Lo que se corrige es que el factor **no se cobre dos veces**: el de §5.2 elige estructura y papeles; el que multiplica `claim(t)` en `frontAuction` es el del kilómetro (R20.2), y manda ése.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **4.** «Ampliar la tabla de §4 a **las 41** situaciones que no están ni cubiertas ni declaradas fuera: una fila por situación.»                                                                                                                                                                | Revisor **por cobertura**                                                                                           | Se aplican **33 de las 41**, y las ocho restantes se desestiman **como filas**, no como problema. Las 33 son las que el revisor verificó que **no aparecen ni una vez por ID** en este documento, y ésas sí necesitaban fila: sin ella el implementador no sabe qué no tiene que hacer. Las otras ocho **sí están nombradas** dentro de un racimo de §4 y a la vez el catálogo las cuenta en la lista de situaciones de otro: darles fila propia aquí sería **contarlas dos veces**, que es exactamente el error que esta revisión persigue en S-467, S-248 y S-129. Se escriben en la aritmética —462 + 24 = 486, y quedan 8— y se declara que **el desajuste es del catálogo**. Inventar ocho filas para que el 494 cuadre habría sido cerrar el número sin cerrar la cuenta, que es lo que hacía la versión anterior con su «467 + 27 = 494».                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **5.** «Si la banda `standoffGapGainS` es 40-200 s, `standoffKm` tiene que ser 1,6-8 km, **y entonces choca con `commitMinKm['frente'] = 3`** de R18.9.»                                                                                                                                       | Revisor **por cobertura** (R20.3)                                                                                   | La primera mitad se aplica entera (`standoffBaseKm` 2,0 y `standoffMaxKm` 8,0, que dan 50 s y 200 s exactos). **El choque se desestima, verificado contra R18.9**: `commitMinKm['frente']` protege a quien **tiene** el frente de soltarlo antes de 3 km, y durante un pulso **nadie lo tiene** —ésa es la definición del pulso—, así que no hay compromiso vivo que proteger. La histéresis que sí muerde es la de **entrar**: el equipo que rompe el pulso y toma el frente lo mantiene 3 km, y eso es lo que impide que el pulso se reabra al kilómetro siguiente. Va escrito en R20.3 para que nadie vuelva a leerlo como contradicción.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **6.** «`medianLeadGroupRiders` es **una cuarta banda con ancla de dominio**, y §1.4 sostiene que solo hay tres.»                                                                                                                                                                              | Revisor **por cobertura**                                                                                           | Verificado y desestimado **en su premisa**: §1.4 ya no dice tres, dice **trece**, y las lista una a una contra las trece FILAS de `mapa-requisitos-duenio.md` §13 —de las cuales **siete** aparecen en la tabla de §9.1: tres se mueven y cuatro se confirman quietas—. `medianLeadGroupRiders` **no está entre ellas**, y no debe estarlo: el dueño no fijó esta banda. Lo que sí se aplica es la consecuencia —va a §10 como **decisión 19**—, pero por el motivo correcto: convierte en objetivo un **encargo cuyo objetivo nació ROJO** y al que a propósito no se le puso banda. Meterla entre las anclas de dominio habría sido atribuirle al dueño una banda que no dictó, que es la misma clase de error que la fila corrige por el otro lado.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **7.** «`finishPaveKm` tiene que bajar a **3 km**, no a 10: hoy un adoquín en el km 150 basta para que la etapa se tipe de pavé, y con 30 km de ventana el defecto es enorme.»                                                                                                                 | Revisor **por cobertura** (S-480, S-369)                                                                            | **Se aplica el defecto, se desestima el número, y de paso se retira el ejemplo, que era falso.** El defecto es real y se corrige: 30 km es demasiada ventana y baja a **10** (§9.5, **[DECISIÓN DEL DUEÑO 18]**). Lo que no se aplica es el 3. Dos motivos, los dos verificados contra el árbol. **Primero, el ejemplo no existe**: `finishPaveKm` no es un km absoluto sino la **COLA** de los últimos N km (`finish.ts:116`, `paveFraction: fraction(tail(STAGE.finishPaveKm), 'paves')`), así que un adoquín «en el km 150» solo cae dentro en una etapa de exactamente 180 km; en una de 250 está a 100 km de meta y no cuenta nada. El defecto de verdad va en **km A META**, y así está reescrito. **Segundo, el 3 rompe el listón por el otro lado**: `finishPaveFraction` 0,1 exige que el 10 % de la ventana sea pavé, y sobre 3 km eso son **300 metros** —cualquier plaza empedrada de pueblo tiparía la etapa de pavé—. Con 10 km el listón queda en 1 km, que es un sector de verdad. Y como es un recorrido real cuyo tipado cambia, va con comprobación obligatoria en el paso 8 sobre los cinco recorridos de pavé y con predicción declarada (Roubaix sigue `pave`, el Ronde sigue sin serlo); si Roubaix cae, la ventana vuelve a 30 y el defecto se ataca por `finishPaveFraction`. |
| **8.** «R04.5 pone al líder a relevar: **mantener la penalización SIEMPRE** y resolver S-079 por otra vía (el maillot sin equipo pierde tiempo, no releva).»                                                                                                                                   | Revisor **contra el dueño** (mapa §3, v57 §4: 9 fotos de 637 → 3; y mapa §15: «el que lleva el maillot se esconde») | Se aplica **la mitad** y se desestima la otra mitad, a propósito. La mitad que se aplica: la penalización vuelve a ser **siempre**, y el invariante 73 la vigila con el número de la v57 §4. La que se desestima es el «siempre» **absoluto**: el revisor **por cobertura** señala, con razón y con cita, que S-079 es `CONTRARIO` con el dueño detrás y pide dos condiciones —«si nadie trabaja por él **Y la fuga le quita el maillot**»—, así que borrar la excepción entera cierra un `CONTRARIO` regresando otro. La redacción de R04.5 conserva **las dos** condiciones de la fila más una tercera (que no haya otro hombre de general en el grupo que pierda puestos), y aun cumpliéndose las tres el líder releva **a la mitad** de la penalización, no a cero. Dos objeciones incompatibles, una redacción que satisface a las dos y un invariante que la mide: eso es el arreglo, no un punto medio.                                                                                                                                                                                                                                                                                                                                                                                         |
| **9.** «Las ~39 bandas nuevas de §7.5 no están en §9, y §0 promete que todo lo que se mueve vive en §9: llevarlas todas a un §9.1-bis.»                                                                                                                                                        | Revisor **contra el dueño** (§0, `soloWinMediaPct`)                                                                 | Se aplica la mitad que importa —`soloWinMediaPct` sube a §9.1bis marcada como **rebaja de un objetivo del dueño** y a §10 como decisión 20— y se desestima llevar las ~39. Una banda de §7.5 **no mueve nada: nace**. Copiar las cuarenta y tantas a §9 crearía dos inventarios de lo mismo que se desincronizarían al primer cambio, que es el defecto que esta revisión lleva media docena de correcciones arreglando (el recuento de bandas, el de constantes, el de filas de cobertura). El criterio queda escrito en §9.1bis: **sube la que contradice, rebaja o reinterpreta algo que el dueño o la bitácora ya dijeron; se queda en §7.5 la que solo mide algo que nadie había mirado**. Con ese criterio suben cuatro, y las otras dos que lo cumplen (`gregarioSharePct`, `finishPaveKm`) viven en §10 y §9.5 con su decisión.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **10.** «Invertir el defecto de §10 **solo** para las decisiones 6, 8, 5, 3 y 7; el resto pueden mantener defecto activo.»                                                                                                                                                                     | Revisor **contra el dueño** (diseno-tactica.md:4166 y mapa §14.2)                                                   | Se aplica, **y se amplía**, que es la única parte que se desestima: la lista de clase B no son cinco decisiones sino **diez** —6, 22, 23, 5, 3, 8, 7, 19, 20 y 21—. El criterio del revisor es correcto («las que tocan una banda o un umbral que el dueño fijó o movió en persona») pero su lista se quedó corta porque se escribió antes de que §1.4 pasara de tres anclas de dominio a **trece**, y antes de que existieran las decisiones 19, 20, 21 (encargo rojo, rebaja de un objetivo suyo, pregunta que él dejó abierta) y las 22 y 23 (los dos suelos de montaña). Aplicar el criterio a rajatabla da diez, no cinco. Y se añade la columna «Si no contesta» con el valor literal, que es lo que el revisor pedía.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **11.** «`queenFinalKindMix`: ensanchar la tolerancia a **± 0,15** y decir que solo caza sesgos gruesos.»                                                                                                                                                                                      | Revisor **por coste y riesgo** (`calendarQueens.ts:45`, `PASO = 6`)                                                 | El diagnóstico es correcto —con n ≈ 27 el error típico de una proporción de 0,45 es ≈ 0,096, mayor que la tolerancia entera— pero **la alternativa que el propio revisor da primero es mejor y es la que se aplica**: medirlo sobre `allCalendarQueens()`, las ~157. Es **geometría del perfil, no simulación**, así que correrlo entero cuesta ≈ 0 y el ± 0,08 pasa a estar por encima de su ruido en vez de por debajo. Ensanchar a ± 0,15 habría sido pagar con precisión un coste que no hay que pagar, y además viola la regla del dueño sobre las bandas: no se afloja un objetivo para que pase una medida que se puede hacer bien.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **12.** «`flat.breakawayWinPct` **no puede ser CONTROL**: su techo lo describe su propia fuente como artefacto de muestreo (120 semillas dan 10,00 %, 300 dan 6,33 %, 500 dan 4,20 %; σ≈2,2), así que la fila entera tiene que pasar a "se re-mide y se re-decide con el dueño en el paso 6".» | Revisor **por coste y riesgo** (`targets.ts`, comentario de `flat.breakawayWinPct`)                                 | **Se aplica al techo y se desestima para el suelo, y la distinción no es un punto medio: son dos números con dueños distintos.** El techo sí: pasa a re-medirse en el paso 0 con 120/300/500 semillas, la nube se publica, y el paso 6 lo re-decide con el dueño con la predicción escrita — porque un CONTROL sobre un estadístico que se mueve de 10,0 a 4,2 según cuántas semillas se corran vigila el muestreo, no la carrera. El **suelo 5** se queda como CONTROL: el dueño lo fijó él mismo y por arriba, no por abajo —«incluso 2-10 % no me parece muy justa… una etapa llana debería tener una banda más centrada en el 10 %» (v38)—, o sea que su queja era que **había poca fuga**. Retirar el CONTROL del suelo por un argumento de muestreo que solo afecta al techo sería usar un defecto estadístico real para aflojar por el lado que él pidió apretar, y eso es exactamente lo que la regla del dueño sobre las bandas prohíbe. Y hay un choque declarado con el **revisor contra el dueño**, que sostiene lo contrario —que ésta es una de las bandas que hay que proteger como CONTROL entera—: la fila lo resuelve dando a cada mitad lo que le corresponde en vez de elegir un bando.                                                                                            |
| **13.** «Sustituir `reina-150` por `reina-real` **en el paso 1**, que es cuando el generador de perfiles se toca de todas formas y cuando la huella es más barata de resellar.»                                                                                                                | Revisor **por coste y riesgo** (§9.4, decisión 5)                                                                   | **Se desestima la primera opción y se aplica la segunda, que el propio revisor da como alternativa.** Adelantar la sustitución al paso 1 suena barato y no lo es: el paso 1 tiene la columna «Mueve» más peligrosa del plan —`realQueens`, `smallTours`, `calendarQueens`, `grandTour`, más las tres aserciones duras de `calendarQueens.test.ts` y la banda CONTROL `calendarQueens.breakawayWinPct`— y su criterio de «hecho» es precisamente **las cuatro huellas idénticas dígito a dígito**. Meter dentro un escenario canónico nuevo convierte el único paso del plan que se puede validar por identidad en un paso que se valida por juicio, y **si algo se mueve ya no se sabe si fue el generador o el escenario**. Lo que sí se aplica, y es lo que el fallo perseguía de verdad: `reina-150-1` **deja de ser el test de aceptación** de R02+R17+R18 (§9.3), ese test se muda a `realQueens` partida por `queenFinalKind` y a `duelBench`, y `mountain.breakawayWinPct` se mide en `realQueens` desde el paso 6. Con eso el escenario viejo deja de decidir nada aunque siga sellado, que era el problema. La sustitución con renombrado a `media-150` se queda en el paso 21, con su decisión (nº 5).                                                                                       |
| **14.** «El invariante 61 nace medio vacío: declarar en §8 que se amplía por pasos y publicar su cobertura.»                                                                                                                                                                                   | Revisor **por coste y riesgo** (R18.9, paso 7)                                                                      | Se aplica entero (el aviso del paso 7, con su tabla de cobertura por paso y `cobertura61Pct` como criterio de «hecho» de los pasos 7, 9, 12 y 15). Se deja constancia aquí solo de la consecuencia que el revisor pedía escribir y que incomoda: **`commitMinKm` se retoca tres veces** y su valor final es el del paso 15. La alternativa —esperar al paso 15 para introducir la histéresis entera— se **desestima**: dejaría los pasos 7 a 14 sin ningún guardarraíl contra el temblor, que es el modo de fallo que este rediseño más se juega. Mejor un guardarraíl que cubre dos quintos y lo dice, que ninguno.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
