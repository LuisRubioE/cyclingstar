# Rehacer la táctica: el equipo como unidad de decisión

> «Es que vas dando palos de ciego: te digo una cosa y pones un parchecito, pero no arreglas el
> problema real. Tienes que hacer un break y REPENSAR TODA la lógica de todas las situaciones que
> pueden ocurrir en carrera y hacer unas NUEVAS reglas, y con eso rehacer el motor (la parte
> táctica), porque ahora mismo está todo del NAAAAABO.»
>
> Y sobre el primer intento: «está muy superficial… no puede ser tan reduccionista como fuga,
> pelotón y desenlace: HAY MUCHÍSIMAS más casuísticas».

Esta es la propuesta del **director deportivo**. Se lee de arriba abajo —carrera, equipos, papeles,
corredor— porque así es como se decide una carrera de bicicletas, y porque el diagnóstico verificado
dice que el motor lo hace justo al revés: decide de abajo arriba y por el camino tira todo lo que
sabía del equipo.

**La tesis, en una frase.** La unidad de decisión de una carrera no es el corredor: es el **equipo con
un director que reparte papeles y va corrigiendo**. Un corredor de bicicleta no elige atacar: elige
atacar _dentro del margen que su director le dejó esta mañana y de lo que le han dicho por el
pinganillo hace un kilómetro_. Ese intermediario —el banquillo— hoy no existe en el motor como cosa,
y por eso ninguna de las 494 situaciones del catálogo que empiezan por «el equipo…» puede escribirse.

**La ausencia madre, verificada.** `packages/engine/src/stage/tactics.ts` —855 líneas, el sitio donde
se decide quién ataca— **no contiene la palabra `teamId` ni una sola vez**; `finish.ts`, que decide
quién gana, tampoco. Del equipo entero sobrevive **un escalar**, `teamAttack`, calculado antes de la
etapa en `teamPlan.ts` e **idéntico para los ocho hombres de la casa**. `group.ts` y `marcaje.ts`
también dan cero. El único de los cuatro que sabe de equipos es `chase.ts`, y solo para agrupar
ayudantes.

De esa ausencia salen los seis sinsentidos que el dueño ha ido cazando, y salen **todos del mismo
sitio**:

| lo que vio                                           | la pregunta que el motor no puede hacerse |
| ---------------------------------------------------- | ----------------------------------------- |
| Seis del mismo equipo en una fuga de nueve           | «¿cuántos míos hay ya delante?»           |
| Dos compañeros en una fuga de tres, y gana el otro   | «somos dos contra uno»                    |
| El 81 tira en la fuga del líder con sus jefes detrás | «¿a quién beneficia esta fuga?»           |
| El equipo del 2.º y del 3.º no persigue              | «lo que va delante me cuesta la general»  |
| El líder salta seis o siete veces en un día          | «un ataque cuesta, y ya he gastado»       |
| El mismo gana dos etapas seguidas                    | «ayer ganó él; hoy le miran»              |

**Lo que este documento propone y las otras dos propuestas hermanas no.** No es «meter `teamId` en
`MoveRider`». Eso es la condición necesaria y ya está dicha en `docs/tactica.md` §5. Lo que falta es
el **actor**: un `DirectorSeat` por equipo, con su estado propio, su pizarra con retardo y error, su
presupuesto, su libro de deudas y su cadena de mando hasta la carretera —capitán de ruta incluido—.
Con ese actor dentro, el pulso entre equipos por quién paga la caza, las alianzas, los relevos
negados, la aduana como votación y **el director bot que se equivoca** (G9) dejan de ser reglas
sueltas y pasan a ser **conducta del mismo objeto**. Sin él, cada una de esas cosas es otro parchecito.

**Alcance.** Se recorren los **28 racimos** del catálogo (`catalogo-situaciones.md`), que cubren 445
de las 494 situaciones. Cada regla lleva fórmula o pseudocódigo, las constantes con valor de partida
y su justificación, y cómo se mide. Todo lo que este diseño movería —bandas, invariantes, huellas
selladas— está en **una sola tabla** en §9, sin mover nada en silencio.

**Las bandas.** El dueño dijo: «No me preocupan en este punto las bandas, eso puede ser al final que
las decidamos en conjunto… a fin de cuentas yo no fui quien creó las bandas, fue Claude con mi
feedback quien las propuso». Así que este diseño **no se encoge para que las bandas viejas pasen**:
propone la conducta correcta, dice qué banda deja de tener sentido y por qué, y lo lista todo junto
en §9 para decidirlo de una vez.

---

## Índice

1. [Qué se rehace y qué no](#1-qué-se-rehace-y-qué-no)
2. [El modelo de decisión: cuatro agentes, cuatro relojes](#2-el-modelo-de-decisión-cuatro-agentes-cuatro-relojes)
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

Rehacer no es tirar. El motor tiene debajo una física medida durante cincuenta y nueve versiones y
un vocabulario de plan de equipo que está bien derivado de la carrera. Lo que está mal es **dónde
vive la decisión** y **cuánta información llega a ella**. La frontera va exactamente por ahí.

### 1.1 Las seis capas, y qué pasa con cada una

| #   | Capa                    | Ficheros                                                                    | Qué pasa                | Por qué                                                                                                                                                                             |
| --- | ----------------------- | --------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Física del bloque**   | `physics.ts`, `advanceGroup`, `blockCost`, `erosion`, cerillos, reserva     | **Intacta**             | Es lo único del motor con banda, historia y refutaciones escritas. Ningún racimo pide vatios distintos: piden que se decida con otra información.                                   |
| 2   | **Geometría de grupos** | `group.ts` (fusiones, reenganches, `mainGroupId`, `chaseReferenceIndex`)    | **Intacta + un índice** | Se le añade `byTeam` (§3.2) como dato derivado, sin tocar ninguna regla de fusión. Tres parches sucesivos (v17/v25/v27) desembocaron en `mainGroupId`: no se vuelve a abrir.        |
| 3   | **Criba** (`shatter`)   | deriva, reserva, `paceSetters`, `comesOff`                                  | **Intacta + un gancho** | La ley de la criba se queda. Se le añade UN gancho: `esperaA` (R01/R12), que es un tope de perfil voluntario, no una ley nueva.                                                     |
| 4   | **Capa táctica**        | `tactics.ts`, `attemptFrom`, `pelotonAllows`, `marcaje.ts`                  | **Se rehace**           | Es donde vive la ausencia madre. Sale un `tactics.ts` que recibe contexto de grupo y de carrera en vez de dos rangos y un escalar.                                                  |
| 5   | **Plan de equipo**      | `teamPlan.ts`, `world/autoOrders.ts`, `world/callups.ts`                    | **Se rehace y sube**    | Deja de ser un precálculo por etapa y pasa a ser un **actor con estado** que vive toda la carrera (`DirectorSeat`). Es el cambio de fondo de esta propuesta.                        |
| 6   | **Modelo de final**     | `finish.ts` (`finishWeights`, `launchEffect`, `placementSd`), `finishStage` | **Mitad y mitad**       | Los **pesos y las curvas se quedan** (están medidos y calibrados). Se rehace **quién entra en el reparto**: el tipo de final por grupo (R17), el tren (R16) y los compañeros (R02). |

### 1.2 Lo que NO se toca, dicho con nombres

- **`finishWeights`** (los siete tipos de final y sus pesos). Están anclados a la ficha del corredor
  y al diseño de entrenamiento ya cerrado (`diseno-entrenamiento.md` §6 declara `finishWeights`
  entre lo que no cambia). Tocarlos es recalibrar el juego entero, no la táctica.
- **`launchEffect`, `sprintHoldMetres`, `placementSd`**: el modelo de lanzamiento de la v39 está
  medido contra una cita del dueño y funciona («D2. El tren y el lanzamiento. Ya existe y funciona»,
  `docs/tactica.md` §3).
- **`erosion()`, `bonkPenalty`, `initialEnergy`, `matchCount`, `tankState`**: frontera compartida con
  el diseño de entrenamiento. Este documento no la cruza.
- **Los invariantes 13-20** (erosión y saturación) y **45-46** (unidades de física): son el **control
  de que este trabajo no se ha ido de parcela**. Si una tanda táctica mueve `queenFresh` o
  `longClassicFresh`, el que está mal es el cambio. Se convierten explícitamente en el guardarraíl
  de todos los pasos de §8.
- **El determinismo**: `stageSeed`, los subflujos nominales (`rngTactics`, `rngBreak`, `rngSprint`…),
  el orden canónico por `riderId`. Toda pieza nueva estrena **su propio subflujo** (`rngDirector`,
  `rngAduana`, `rngPizarra`) para no desplazar los dados existentes —la lección de v25, «prohibir el
  ataque en el km 0 desplazaba `rngTactics` de todas las etapas: se quita la frase, no el intento».

### 1.3 Las cuatro huellas selladas: se mueven, y así se dice

`packages/engine/src/stage/attribution.test.ts` sella cuatro resultados dígito a dígito:
`llana-180-0`, `llana-180-1`, `reina-150-0`, `reina-150-1`. **Las cuatro se mueven** con esta
propuesta, y no es un accidente: la huella es exactamente el instrumento que se inventó para que un
cambio de conducta se cuente antes de aplicarlo (v41, v42, v46, v49, v58 la resellaron cada una con
su causa escrita).

Lo que se compromete, paso por paso de §8:

| Paso | Qué mueve la huella                          | Predicción declarada ANTES de medir                                                                                                                |
| ---- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1-2  | Nada (banco e índices, sin conducta)         | **Las cuatro idénticas dígito a dígito.** Si se mueven, hay una fuga de estado y se para la tanda.                                                 |
| 3    | Aduana por votos (R03)                       | Las dos llanas cambian **quién** se va en la fuga; ganador de la llana probablemente el mismo (lo decide el sprint). Las reinas se mueven enteras. |
| 5    | Superioridad numérica y cesión en meta (R02) | Las llanas mueven el orden dentro del reloj del sprint; las reinas cambian el podio si hay dos de una casa delante.                                |
| 7    | Pulso por el frente (R20)                    | Las cuatro: cambia quién paga el viento y por tanto quién llega con piernas.                                                                       |
| 11   | Tipo de final por grupo (R17)                | Las reinas: el grupo de cabeza deja de ser 1.                                                                                                      |

Regla de la casa que se mantiene: **se reseca con la causa escrita en el comentario**, y antes de
resellar se comprueba que se mueve **donde debe** (llanas poco, reinas mucho; ganador igual salvo
donde el racimo dice que tiene que cambiar).

### 1.4 Lo que se rehace, en una frase cada cosa

1. **`teamPlan.ts` deja de ser una función y pasa a ser un asiento** (`DirectorSeat`) con estado que
   sobrevive a la etapa y a la carrera.
2. **La estructura del equipo se fija antes de la etapa 1** (las seis formas del dueño) y solo cambia
   por hechos; la carta del día se deriva de ella y del final **real previsto por grupo**, no del
   `kind` de la etapa.
3. **El vocabulario de motivos crece** de tres (`etapa`/`maillot`/`general`) a once.
4. **La cuerda de la fuga deja de ser un dado** y pasa a ser la suma de votos de los directores,
   recalculada cada kilómetro.
5. **El frente deja de tener dueño por tabla** y pasa a subastarse entre equipos, con precio.
6. **La táctica recibe los tres contextos enteros** y `finishStage` recibe el equipo.
7. **La información deja de ser perfecta**: hueco con retardo y error, percance que se sabe tarde,
   estado del rival leído por señales y falseable.

---

## 2. El modelo de decisión: cuatro agentes, cuatro relojes

### 2.1 Qué es un agente aquí

Un **agente** es una cosa con (a) estado propio que sobrevive a la decisión, (b) un reloj que dice
cuándo le toca decidir, (c) una vista del mundo que puede ser falsa, y (d) un conjunto acotado de
salidas. Lo que hoy tiene el motor no son agentes: son funciones puras que reciben una foto y
devuelven un número. Por eso nada recuerda, nada se equivoca y nada tiene autoridad sobre nadie.

Se proponen **cuatro**, en cadena de mando. Es la cadena real de un equipo de bicicletas y es
también la que hace que cada racimo caiga en un sitio y no en dos.

```
DirectorSeat  (1 por equipo, vive toda la CARRERA)
      │  emite Orden(es) con retardo
      ▼
RoadCaptain   (1 por equipo Y POR GRUPO, vive mientras el grupo exista)
      │  rellena lo que la orden no dice, con lo que ve AQUÍ
      ▼
RiderAgent    (1 por corredor, vive la ETAPA)
      │  decide dentro de su margen
      ▼
  la carretera (física intacta)
```

Y por encima, un quinto que no es agente sino **procedimiento**: la **Mesa** (`raceTable`), donde
cada kilómetro se resuelven las decisiones que son de todos a la vez y no de nadie —la aduana de la
fuga, la subasta del frente, la tregua—. La Mesa no tiene estado propio: lee las posturas de los
directores y devuelve un resultado colectivo.

#### `DirectorSeat` — el banquillo

- **Vive**: desde la convocatoria hasta el final de la carrera. Se serializa entre etapas.
- **Decide**: la estructura del equipo (una vez), la carta del día y los papeles (cada mañana), el
  motivo activo, el voto de aduana, la puja por el frente, las alianzas, a quién se manda a la fuga,
  cuándo se baja alguien a por el jefe, y **las órdenes** que salen al pinganillo.
- **Estado propio**: `pizarra` (lo que cree de la carrera: vieja y con error), `libro` (memoria entre
  etapas: deudas, quién ganó, quién no relevó), `presupuesto` (de etapa y de carrera), `motivos`,
  `cartas`, `ordenesVivas`, `calidad` (lo bueno que es este director).
- **Reloj**: `DIR.tickKm` = **2 km**, con jitter por equipo; más despertares por evento.

#### `RoadCaptain` — el capitán de ruta (S-459)

- **Vive**: mientras su equipo tenga ≥ 2 hombres en un grupo. Se elige por `TAC` efectivo, con
  desempate por jerarquía y por id.
- **Decide**: lo que la orden no dice y no puede esperar dos kilómetros: quién de los dos releva,
  quién responde a un ataque, si el dúo alterna, si se espera al compañero en el descenso, cuándo se
  abandona una caza que ya no vale.
- **Estado propio**: `ultimaOrden` (la que llegó y cuándo), `lecturaLocal` (exacta: está ahí),
  `turnoDeCasa` (a quién le toca).
- **Reloj**: **1 km**. Es el que hace que la carrera siga teniendo sentido entre dos tics del
  director, y es la respuesta a «bots peores por INFORMACIÓN, no por vatios»: un director malo deja
  más huecos que rellenar, y el capitán de ruta rellena con lo que ve, que es menos.

#### `RiderAgent` — el corredor

- **Vive**: la etapa.
- **Decide**: su intención (`intencion`) dentro del margen que le dejaron, y sus reflejos.
- **Estado propio**: `intencion`, `intencionDesdeKm`, `margen`, `deudaCon` (a quién le debe un
  relevo), `senalesDe` (lo que cree del estado de los rivales, con error), `promesas` (lo que aceptó
  dentro de una fuga: S-453).
- **Reloj**: **1 km** para la intención; **bloque (0,1 km)** solo para reflejos.

#### La Mesa — lo colectivo

- **No tiene estado.** Cada kilómetro toma las posturas de todos los `DirectorSeat` con hombres en
  el grupo relevante y devuelve: `cuerda` (aduana, R03), `dueñoDelFrente` y `precio` (R20),
  `treguaActiva` (R12), `pactoDelGrupeto` (R26).

### 2.2 Con qué frecuencia decide cada cosa

Cuatro relojes, y la razón de cada uno es el coste. El motor «se ha frenado un 48 % en dos versiones»
(deuda 40 del §14) y ya hay nocturnos caídos por timeout: **el reloj es una decisión de rendimiento
tanto como de diseño**.

| Reloj             | Cada                               | Quién decide                                   | Coste por etapa (176 corredores, 200 km)                                          |
| ----------------- | ---------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| **bloque**        | 0,1 km (2.000 veces)               | reflejos del corredor                          | Solo consultas O(1) sobre índices ya calculados. **No se añade ningún bucle.**    |
| **kilómetro**     | 1 km (200 veces)                   | `RiderAgent.intencion`, `RoadCaptain`, la Mesa | O(corredores) una vez por km + O(equipos²) en la Mesa (22² = 484, trivial)        |
| **dirección**     | 2 km, con jitter (≈100 por equipo) | `DirectorSeat`                                 | O(equipos) × O(corredores del equipo). 22 × 8 × 100 = 17.600 evaluaciones baratas |
| **fase / evento** | ~8 fases + N sucesos               | todos, fuera de turno                          | Despreciable                                                                      |

**Por qué el bloque no decide nada nuevo.** Hoy el bucle ya paga la criba, la física y la táctica
cada 100 m, y el pelotón solo decide cada 10 bloques (`decisionEveryBlocks`). Meter razonamiento de
equipo al bloque multiplicaría el coste por veinte para una carrera que no cambia: en 100 metros no
cambia quién es tu compañero ni cuánto le cuesta la fuga a tu hombre. Lo que sí cambia en 100 metros
es si te sueltas, si respondes a un ataque que acaba de salir y si abres el sprint: **eso son los
reflejos**, y son los tres que se quedan en el bloque.

**El jitter del reloj del director** (`DIR.tickJitterKm`, ±0,7 km, derivado de `hash(teamId)`) es
importante y barato: sin él los veintidós equipos deciden en el mismo bloque, y eso produce
oscilaciones en fase —todos empiezan a cazar a la vez y todos aflojan a la vez— que es justo el
artefacto que hoy hace que «las cazas salgan siempre clavadas» (S-458).

**Los despertares por evento** (`wake`) son la pieza que evita el otro artefacto, el contrario: que
un percance a 300 metros del tic no se atienda hasta dentro de dos kilómetros. La lista es cerrada:
`caida`, `pinchazo`, `jefe_descolgado`, `fuga_coronada`, `fuga_cazada`, `corte_abierto`,
`cambio_de_fase`, `pancarta_a_2km`, `orden_del_jugador_disparada`. Y **el despertar también llega
tarde**: se encola con `DIR.noticiaLagKm` (R24, S-478).

### 2.3 El tic del director, en pseudocódigo

En el estilo de `docs/motor.md` §13.2. Puro salvo el flujo de dados que recibe.

```
función tickDirector(D: DirectorSeat, km, mundo, rng):

  ── 1. LEER (mal) ────────────────────────────────────────────────────────
  D.pizarra = actualizarPizarra(D.pizarra, mundo, km, D.calidad, rng)
      # el hueco que cree es el de hace DIR.lagKm(D.calidad) km, con error
      # relativo N(0, sigmaGap(D.calidad)); los sucesos entran con su propio
      # retardo; el estado de los rivales llega como señales, no como depósito

  ── 2. ¿SIGUE VALIENDO EL PLAN? ──────────────────────────────────────────
  hechos = hechosNuevos(D.pizarra, D.ultimaLectura)
  si hechos.contiene(jefe_perdido | carta_descolgada | maillot_cambiado | equipo_mermado):
      D.cartas   = rehacerCartas(D.estructura, D.pizarra, D.libro)   # R21
      D.motivos  = rehacerMotivos(D.estructura, D.pizarra, D.libro)  # R05
      emitir(evento 'team_replans', {teamId, causa: hechos.principal})

  ── 3. POSTURA ───────────────────────────────────────────────────────────
  D.motivoActivo = motivoDeMayorDerecho(D.motivos, D.pizarra)        # R05/R20
  D.intent       = intencionPara(D.motivoActivo, D.pizarra, D.presupuesto)

  ── 4. LO QUE SE LLEVA A LA MESA ─────────────────────────────────────────
  D.votoAduana = votoAduana(D, D.pizarra.movDeCabeza)                # R03
  D.puja       = pujaPorElFrente(D, D.pizarra)                       # R20
  D.oferta     = ofertaDeAlianza(D, D.pizarra, D.libro)              # R20/R09

  ── 5. ÓRDENES (que tardan en llegar) ────────────────────────────────────
  para cada hombre m de D.equipo:
      nueva = ordenPara(D, m, D.pizarra)         # papel, margen, disparadores
      si nueva ≠ D.ordenesVivas[m] y mereceLaPena(nueva, D.calidad):
          D.ordenesVivas[m] = {
            orden: nueva,
            emitidaKm: km,
            llegaKm: km + DIR.ordenLagKm(D.calidad, m.grupo),   # S-489
            vigenciaKm: nueva.vigencia,
          }

  ── 6. PAGAR ─────────────────────────────────────────────────────────────
  D.presupuesto.etapa -= gastoDelBloqueAnterior(D)
  D.libro.registrar(km, D.intent, D.motivoActivo)
```

Y el tic del corredor, que es donde se resuelve la precedencia:

```
función tickCorredor(r: RiderAgent, km, self, group, race, rng):

  ── 1. ¿QUÉ ME HAN DICHO Y QUÉ QUIERO? ───────────────────────────────────
  ordenEquipo = ordenVigente(r, km)          # null si aún no ha llegado o caducó
  ordenPropia = r.input.orders               # la hoja del jugador (o autoOrders)
  efectiva    = resolverOrden(ordenPropia, ordenEquipo, r)     # §2.5

  ── 2. ¿HAY ALGUIEN DE CASA QUE MANDE MÁS QUE YO AQUÍ? ───────────────────
  casa = group.byTeam[r.teamId]
  si casa.jerarquiaDe(r) > 1 y casa.fichaTomadaEsteKm:
      # otro de los míos ya ha comprometido la jugada de la casa este km
      efectiva.margen = min(efectiva.margen, CASA.margenSegundon)   # 0,35

  ── 3. INTENCIÓN ─────────────────────────────────────────────────────────
  candidatas = intencionesPosibles(efectiva.papel, self, group, race)
  mejor      = argmax(candidatas, i => utilidad(i, self, group, race, efectiva))
  si utilidad(mejor) > utilidad(r.intencion) + INTENT.histeresis:   # 0,12
      r.intencion = mejor; r.intencionDesdeKm = km

  ── 4. TOMAR LA FICHA DE CASA SI LA JUGADA ES DE CASA ────────────────────
  si r.intencion.esJugadaDeCasa y not casa.fichaTomadaEsteKm:
      casa.fichaTomadaEsteKm = true
      casa.autor = r.riderId
```

### 2.4 Conflicto 1: dos corredores del mismo equipo en el mismo bloque

Este es el conflicto que hoy **no se puede ni plantear**, porque `chooseInstigator` sortea sobre el
pool entero y «dos compañeros pueden atacar en el mismo movimiento o uno contra otro»
(`mapa-tactics.md` §10). La regla tiene tres piezas y la tercera es la que importa.

**(a) La ficha de casa.** Cada equipo tiene, por grupo y por kilómetro, **una sola ficha** para
jugadas que comprometen a la casa: atacar, saltar a un ataque ajeno que abre carrera, entrar al
turno del frente en nombre del equipo. El primero que la toma la usa; los demás siguen decidiendo,
pero con el margen reducido. No es un veto —el segundo puede seguir a un rival— es un **coste de
oportunidad**: `CASA.margenSegundon = 0,35`, calibrado para que en un grupo de cuatro con dos de una
casa el segundo salte una de cada tres veces que saltaría solo. _(Valor de partida; calibrar con
banco contra la estadística «ataques de dos compañeros en el mismo movimiento por etapa», objetivo
< 0,15.)_

**(b) El orden en que se resuelven.** Dentro de un bloque, los miembros de un equipo se resuelven
en orden de **jerarquía de casa**, no por id:

```
jerarquiaDeCasa(m) = 1 si m es la carta del día de este grupo
                     2 si m es la segunda carta
                     3 si m tiene un encargo con nombre (lanzador/gregario de alguien de aquí)
                     4 el resto
   empate → mayor finishScore del final PREVISTO PARA ESTE GRUPO → id
```

La carta decide primero porque en carretera es así: el jefe dice si va, y los demás se acomodan. Y
el desempate por `finishScore` del final **de este grupo** —no de la etapa— es lo que hace que en
una fuga de cinco el jefe pueda ser otro que en el pelotón (R17).

**(c) Y sobre todo: la segunda jugada no es «la misma otra vez».** Si la ficha está tomada por un
ataque, la intención que le queda al segundo **no es atacar**: es `marcar_respuesta` (no relevar,
esperar a que le traigan) o `lanzar` (R02). Es la diferencia entre «dos del mismo equipo atacan
seguidos», que en carretera no pasa, y «uno ataca y el otro se sienta», que es lo que pasa siempre.

```
función intencionesPosibles(papel, self, group, race):
   base = INTENCIONES_POR_PAPEL[papel]
   casa = group.byTeam[self.teamId]
   si casa.fichaTomadaEsteKm y casa.autor ≠ self.riderId:
       # ya hay jugada de casa: la mía cambia de naturaleza
       si casa.autorVaDelante:  devolver base ∩ {no_relevar, marcar, esperar, cerrar_a_rivales}
       si no:                   devolver base ∩ {relevar_por_los_dos, lanzar, proteger}
   devolver base
```

### 2.5 Conflicto 2: el plan del equipo contra la orden individual

La regla 1 de `docs/motor.md` §V.1 es **literal y no se toca**: «Las individualidades priman sobre el
plan. El que corre por su cuenta queda FUERA del plan: ni le empuja ni le frena». Lo que sí cambia es
que hoy eso es **binario** (`rebelIds`: dentro o fuera) y en carretera no lo es. Se sustituye por un
retículo con tres estados y un escalar de desviación.

```
función resolverOrden(propia: StageOrders, equipo: OrdenDeEquipo | null, r): OrdenEfectiva

   si equipo == null:                       # no ha llegado nada, o no hay equipo
       devolver { papel: propia.role, margen: 1, fuente: 'propia' }

   si propia.esExplicitaDelJugador:          # hay fila en stage_orders
       choque = distancia(propia.role, equipo.papel)          # tabla 2.6
       si choque == 0:  devolver { ...equipo, margen: 1, fuente: 'ambas' }
       si choque <= 1:  devolver { papel: propia.role,      # la individual manda…
                                   margen: 1,
                                   apoyo: equipo.apoyo,     # …y el equipo NO le retira lo suyo
                                   fuente: 'propia', desviacion: 0.3 }
       # choque grande: manda la individual y el equipo deja de darle nada
       devolver { papel: propia.role, margen: 1, apoyo: NINGUNO,
                  fuente: 'propia', desviacion: 1 }

   # bot puro: manda el equipo, pero el papel del día ya salió de sus atributos
   devolver { ...equipo, margen: equipo.margen, fuente: 'equipo' }
```

Tres cosas que esto arregla y hoy no están:

1. **La individual manda SIEMPRE, también cuando no choca.** Hoy un humano que se pone `libre` puede
   acabar de jefe de filas porque sus compañeros bot le votaron (`pickLeader`, S-058). Con esto,
   `pickLeader` **no puede nombrar jefe a quien no lo ha pedido**: si el humano escribió `libre`, el
   voto de los gregarios no le nombra, y el director rehace las cartas con los que quedan.
2. **Desviación graduada en vez de rebeldía binaria.** `desviacion ∈ {0, 0,3, 1}` decide cuánto
   apoyo pierde (protección, tren, ayuda al descolgarse) y **cuánto se anota en el libro** para R25
   (moral, confianza, convocatoria). Hoy «desobedecer sale gratis» y «la estrategia óptima pasa a ser
   ir siempre de líder» (deuda 12 del §14).
3. **El equipo se entera.** `autoOrders` deja de repartir a ciegas: `assignTeam` recibe las órdenes
   humanas ya escritas y reparte **con los que quedan** (S-054, S-060). Es un cambio de firma de tres
   líneas y cierra media docena de situaciones de R22.

### 2.6 Tabla de choque entre papeles

Es la que alimenta `distancia()`. 0 = compatible; 1 = tensión (se respeta y se apoya a medias);
2 = choque (el equipo retira el apoyo).

|                 | equipo: `lider` | `sprinter` | `lanzador` | `gregario` | `cazaetapas` | `marcador` | `libre` |
| --------------- | --------------- | ---------- | ---------- | ---------- | ------------ | ---------- | ------- |
| propia: `lider` | 0               | 2          | 2          | 2          | 1            | 2          | 1       |
| `sprinter`      | 2               | 0          | 2          | 2          | 1            | 2          | 1       |
| `lanzador`      | 2               | 1          | 0          | 1          | 1            | 1          | 1       |
| `gregario`      | 1               | 1          | 1          | 0          | 1            | 1          | 1       |
| `cazaetapas`    | 1               | 1          | 1          | 1          | 0            | 1          | 0       |
| `marcador`      | 1               | 1          | 1          | 1          | 1            | 0          | 0       |
| `libre`         | 1               | 1          | 1          | 1          | 0            | 0          | 0       |

Lectura: pedir ser jefe cuando la casa ya tiene jefe es choque (2) —es la situación S-057 y el dueño
la tiene descrita—; pedir ser gregario cuando te habían puesto de lanzador es tensión (1): se te
respeta, y el equipo te sigue arropando porque no le rompes nada.

### 2.7 Determinismo

Cada agente nuevo estrena subflujo: `rngDirector` (jitter del tic, elección entre opciones
empatadas), `rngPizarra` (el error de lectura), `rngAduana` (el dado que queda tras el voto),
`rngCapitan`. Ninguno toca `rngTactics`, `rngBreak`, `rngSprint`, `rngPlacement`, `rngLaunch`,
`rngRough`, `rngCrash`, `rngAbandon`, `rngDay`, `rngMood`, `rngViento`. Así los pasos 1-2 de §8
pueden ser **idénticos dígito a dígito** y eso vale como prueba de que el andamiaje no filtra.

---

## 3. Los tres contextos y su contrato

`docs/tactica.md` §5 los enunció: **yo**, **mi grupo**, **la carrera**. Aquí van con tipos, campo a
campo, y con la decisión de diseño que los ordena:

> **La verdad se degrada por capas, no por corredor.** Lo que un corredor sabe de sí mismo es
> exacto. Lo que sabe de su grupo es casi exacto —está ahí, los ve— salvo el **estado interno** de
> los rivales, que se lee por señales. Lo que sabe de la carrera **no lo sabe él: lo sabe su
> director**, y llega viejo y torcido.

Esa línea tiene dos virtudes. La primera es que es verdad en carretera: en un grupo sabes
perfectamente cuántos sois y de qué equipos, y no tienes ni idea de a cuánto va la fuga si no te lo
dicen. La segunda es que es **barata**: el ruido se calcula una vez por equipo y por kilómetro
(22 × 200 = 4.400 evaluaciones por etapa) en vez de una vez por corredor y por bloque
(176 × 2.000 = 352.000). El motor ya se ha frenado un 48 % en dos versiones; esto no lo vuelve a
frenar.

### 3.1 `SelfView` — lo que un corredor sabe de sí mismo (exacto)

Es casi lo que hoy es `MoveRider`, más lo que hace falta para las intenciones nuevas.

```ts
export interface SelfView {
  riderId: string
  teamId: string | null // null = agente libre («corre de forma individual»)
  // --- papel y voluntad ---
  papel: StageRole // el EFECTIVO, resuelto por resolverOrden()
  papelFuente: 'propia' | 'equipo' | 'ambas'
  mentality: Mentality
  effort: Effort
  margen: number // [0,1] cuánta iniciativa le dejaron; 1 = mano libre
  desviacion: 0 | 0.3 | 1 // cuánto se ha salido del plan (R25)
  encargo: Encargo | null // { tipo:'lanzar'|'trabajar'|'marcar'|'esperar', a: riderId }
  disparadores: Disparador[] // órdenes condicionales del jugador (N1) y del director
  // --- piernas ---
  perfil: number // perfil efectivo AHORA (SPEC 6.4)
  perfilFresco: number // el que tendría con el depósito lleno: mide cuánto ha perdido
  energyFraction: number
  reserveFraction: number // [0,1] de la reserva supraumbral (v57): el arreón que le queda
  matches: number
  gastado: boolean
  pulling: boolean
  tocado: 'no' | 'golpe' | 'enfermo' | 'sin_ritmo' // R08: lo que se arrastra de ayer
  // --- lo que se juega hoy ---
  finishScoreAqui: number // remate en el final previsto PARA SU GRUPO (R17)
  finishRankAqui: number // [0,1] dentro de su grupo
  gcDeficitSeconds: number
  gcRank: number | null
  motivosPropios: Motivo[] // montaña, puntos, joven… si él lidera o pelea una secundaria
  // --- memoria del día ---
  intencion: Intencion
  intencionDesdeKm: number
  deudaCon: string[] // a quién le debe un relevo hoy (R09/R18)
  promesas: Promesa[] // «yo no te disputo la etapa» (S-453)
}
```

Los cinco campos que hoy **no existen** y sin los cuales media docena de racimos no se puede
escribir: `margen`, `encargo`, `reserveFraction`, `tocado` y `finishScoreAqui`. Los tres primeros
son la mano del director; el cuarto es R08; el quinto es R17 y es la razón por la que hoy «el peor
rematador ataca» apunta al rematador equivocado —se calcula con el tipo de final del **tamaño del
grupo actual**, pero con el terreno de la **etapa entera**—.

### 3.2 `GroupView` — lo que ve de su grupo (casi exacto)

Es la pieza que hoy **no existe en absoluto**: hoy un corredor recibe `finishRank` y `perfilRank`,
dos números en [0,1], y nada más.

```ts
export interface GroupView {
  groupId: string
  clase: 'peloton' | 'fuga' | 'contra' | 'tierra_de_nadie' | 'grupeto' | 'corte'
  size: number
  esLaCarrera: boolean // size / racingNow: un grupo que ES la carrera no aplica «no puedo ganar»
  // --- los míos ---
  mios: MiembroDeCasa[] // ordenados por jerarquiaDeCasa
  fichaTomadaEsteKm: boolean
  autorDeCasa: string | null
  cartaDeCasaAqui: string | null // quién es la carta de mi equipo EN ESTE GRUPO
  capitanDeRuta: string | null
  // --- los otros ---
  porEquipo: Map<string, ResumenDeEquipo> // cuántos, quién es su carta, si tienen hombre delante
  equiposRepresentados: number
  agentesLibres: number
  peligro: Peligro[] // quién me hace daño AQUÍ y por qué motivo
  // --- quién trabaja ---
  turno: string[] // quién va en la rotación AHORA
  turnoPorEquipo: Map<string, number>
  duenoDelFrente: string | null // teamId
  desertores: string[] // quién debería relevar y no releva (S-122, contagio)
  // --- la física que ya existe, expuesta ---
  compromiso: number
  tension: number
  ritmoLoMarcan: string[] // paceSetters (v57): los de cabeza que aún van cómodos
  // --- el final que le espera A ESTE GRUPO ---
  finalPrevisto: FinishType // R17: se calcula por grupo, no por etapa
  finalConfianza: number // [0,1] baja si faltan muchos km o el grupo va a cambiar
}

export interface MiembroDeCasa {
  riderId: string
  jerarquia: 1 | 2 | 3 | 4
  papel: StageRole
  encargo: Encargo | null
  finishScoreAqui: number
  fresco: number // [0,1]
  puedeRelevar: boolean
}

export interface ResumenDeEquipo {
  teamId: string
  presentes: number
  cartaAqui: string | null
  tieneHombreDelante: boolean // en cualquier grupo por delante de éste
  hombresDelante: number
  motivoVisible: Motivo | null // lo que se le nota, no lo que piensa (R24)
}

export interface Peligro {
  riderId: string
  teamId: string | null
  porQue: 'remata_mejor' | 'general' | 'secundaria' | 'ganó_ayer' | 'gana_si_llega'
  cuanto: number // [0,1]
}
```

**El estado ajeno se lee por señales, no por depósito (S-488).** `MiembroDeCasa.fresco` es exacto
—son los tuyos, el director sabe cómo están—. Lo de los rivales llega en `Peligro.cuanto` y en una
estructura aparte que **puede mentir**:

```ts
export interface SenalDeRival {
  riderId: string
  puestoEnLaFila: 'delante' | 'medio' | 'atrás' // observable
  gregariosVisibles: number // observable, exacto
  sube: 'sentado' | 'de_pie' | 'derivando' // observable, se puede fingir
  suEquipoSoltoElFrente: boolean // observable, exacto
  frescuraEstimada: number // [0,1] CON ERROR
}

// frescuraEstimada = clamp( frescuraReal
//                           + N(0, DIR.sigmaRival(calidad))     // el error del que mira
//                           + disimulo(rival) , 0, 1)
// disimulo(r) = DIR.disimuloMax · clamp((TAC_r − 50)/50) · [1 si el rival está eligiendo esconderse]
```

`DIR.sigmaRival` = 0,18 a calidad 0 y 0,06 a calidad 1; `DIR.disimuloMax` = 0,15. Justificación: con
0,18 un rival que va al 40 % se lee entre 22 % y 58 % dos veces de cada tres, que es «se le nota
algo pero no cuánto»; con 0,06 se lee entre 34 % y 46 %, que es un director bueno con un buen
gregario mirándole. El disimulo tope de 0,15 hace que un `TAC` 100 pueda aparentar 15 puntos más de
frescura de la que tiene: suficiente para que «el jefe tocado se esconda delante con cara de fresco»
ocurra y no tanto como para que sea la norma. _(Calibrar con banco: estadística «veces que se ataca
a un rival que en realidad estaba entero», objetivo 15-35 % de los ataques de oportunidad.)_

### 3.3 `RaceView` — lo que sabe de la carrera (vieja y torcida)

Este es el contexto que **no es del corredor: es de su director**. Todos los hombres de una casa
comparten exactamente la misma `RaceView`, y por eso dos equipos ven carreras distintas.

```ts
export interface RaceView {
  // --- reloj y sitio ---
  km: number
  kmToGo: number
  fase: Fase // R19, explícita
  faseDesdeKm: number
  bloque: Block // terreno de AQUÍ (exacto: lo pisa)
  carretera: Carretera // R20/R28: ancho, revirada, expuesta al viento
  // --- lo que hay delante (CON RETARDO Y ERROR) ---
  frente: FrenteCreido[] // grupos por delante, en orden
  miGrupoEs: number // índice de mi grupo en esa lista
  lecturaDeKm: number // el km al que corresponde esta foto: km − DIR.lagKm
  // --- la general, tal como la ve este banquillo ---
  generalVirtual: VirtualGc // R04: qué puestos pierde MI hombre con este boquete
  colchonNecesario: number // segundos que MI hombre necesita, según lo que queda (S-391)
  // --- lo colectivo, resuelto en la Mesa ---
  cuerda: number // [0,1] cuánto se le está dejando ir a la cabeza (R03)
  duenoDelFrente: string | null
  precioDelFrente: number // unidades de presupuesto por km (R20)
  tregua: Tregua | null // R12
  humor: number // R09: el humor del pelotón HOY, con su causa
  humorCausa: 'vispera' | 'resaca' | 'traslado' | 'calor' | 'sin_motivo' | 'normal' | null
  // --- lo que se sabe del recorrido (EXACTO: está en el libro de ruta) ---
  proximaPancarta: { km: number; tipo: BannerType; cat: ClimbCategory } | null
  proximoPuerto: { km: number; km_largo: number; g: number; cimaAMetaKm: number } | null
  ultimaCimaAMetaKm: number // S-486: la mitad del dato que decide la etapa
  parte: ParteMeteorologico // R14: anunciado ANTES, citable por las órdenes
  // --- lo que pasó y no se olvida ---
  sucesos: SucesoCreido[] // caídas, pinchazos, cortes: con SU retardo (S-478)
}

export interface FrenteCreido {
  groupId: string
  tamanoCreido: number // exacto: se ven
  huecoCreido: number // segundos, VIEJO Y CON ERROR
  huecoTendencia: 'abre' | 'estable' | 'cierra'
  llevaMiHombre: boolean // exacto
  llevaAlMaillot: boolean // exacto
  mejorAmenazaGc: number | null // el mejor clasificado de dentro
  costeParaMi: number // R04: segundos de general que me cuesta si llega
  quienTiraAhi: string[] | null // solo si está cerca o si tengo hombre dentro
}
```

**Cómo se ensucia el hueco.** Una sola fórmula, y es la que cierra S-458 y con ella S-152 y S-169:

```
lagKm(cal)     = DIR.lagKmMax − (DIR.lagKmMax − DIR.lagKmMin) · cal      # 2,5 → 0,6 km
sigmaGap(cal)  = DIR.sigmaGapMax · (1 − DIR.sigmaGapQuality · cal)       # 0,12 → 0,036
redondeo(g)    = g < 60 ? 5 : g < 300 ? 10 : 30                          # la pizarra va en múltiplos

huecoCreido = redondeo( huecoReal(km − lagKm(cal)) · (1 + N(0, sigmaGap(cal))) )
```

Justificación de los tres números:

- **`lagKmMin` 0,6 km y `lagKmMax` 2,5 km.** En carretera el hueco lo canta la organización cada
  cierto tiempo y el coche lo estima entre cantos. A 42 km/h, 0,6 km es un minuto y 2,5 km son tres
  minutos y medio: el rango real entre un equipo con moto y radio buena y uno que se entera por la
  pizarra. Y es el rango que hace daño: hoy «las cazas salen siempre clavadas» porque el error es
  cero.
- **`sigmaGapMax` 0,12.** Un hueco real de 3 min se lee entre 2:40 y 3:20 dos veces de cada tres. Es
  bastante para que una caza empiece treinta segundos tarde y no tanto para que la carrera se
  vuelva aleatoria.
- **El redondeo.** Es lo que de verdad se siente: nadie tira de un número con segundos. Además da
  gratis la histéresis que hoy se compra con `commitHysteresis`.

**Cómo llegan tarde los sucesos (S-478).** `DIR.noticiaLagKm` = **1,4 km** de base, escalado:
`× (1 − 0,5·cal)` por la calidad del director, `× 1,6` si el suceso pasa detrás del pelotón y el
equipo no tiene a nadie ahí, `× 0,3` si el afectado es de la propia casa (te lo dice él por radio).
Un director bueno con su hombre implicado se entera en 200 metros; uno malo, mirando hacia atrás, en
más de dos kilómetros. Eso es exactamente «la tregua y el rescate llegan dos kilómetros después».

### 3.4 El contrato, antes y después

| Decisión            | Hoy ve                                    | Con esto ve                                                  | Racimos       |
| ------------------- | ----------------------------------------- | ------------------------------------------------------------ | ------------- |
| `attackAppetite`    | rol, mentalidad, `teamAttack`, 2 rangos   | `SelfView` + `GroupView` + `RaceView`                        | R01-R05, R19  |
| `followProbability` | TAC, rol, energía, `stake` de general     | + quién es el que salta (compañero / rival / peligro)        | R01, R02      |
| `pelotonAllows`     | tamaño, `breakAppeal`, un veto de maillot | el voto de la Mesa                                           | R03           |
| `chooseInstigator`  | apetito de todos, sorteo                  | + ficha de casa + jerarquía                                  | R02           |
| `relayTurn`         | deber, `drive` escalar, `sittingOn`       | + `GroupView.porEquipo`, deudas, promesas, alianzas          | R18, R20      |
| `moveCooperation`   | tamaño, rango medio, tensión              | + composición por equipos, promesas, alianzas                | R18           |
| `finishStage`       | rol, tren explícito, trabajo              | + compañeros en el grupo, cesión, tipo de final por grupo    | R02, R16, R17 |
| `teamStance`        | 3 motivos, `manUpTheRoad`, `gap` exacto   | 11 motivos, `RaceView` con retardo, libro de deudas          | R05, R09, R21 |
| `shatter`           | perfiles y reserva                        | + `esperaA` (tope voluntario)                                | R01, R12      |
| `disputeBanner`     | `contest*`                                | + motivo de equipo, liderato de la clasificación, coste real | R05, R06, R07 |

---

## 4. Las reglas, racimo por racimo

Cada racimo lleva: **la pieza** (qué objeto del motor lo resuelve), **las reglas** en forma
implementable, **qué cierra** (por ID), **las constantes nuevas** con valor de partida y su porqué, y
**cómo se mide**. Cuando un número no se puede justificar de antemano se marca **[calibrar]** y se
dice contra qué estadística.

Convención de espacios de nombres para las constantes nuevas:

- **`CASA.*`** — el equipo por dentro: estructura, cartas, cupos, coordinación entre compañeros.
- **`PULSO.*`** — el equipo por fuera: aduana, subasta del frente, alianzas, deudas, humor.
- **`DIR.*`** — el banquillo: calidad, retardo, error, órdenes, capitán de ruta.
- **`STAGE.*`** — se sigue usando para lo que ya vive ahí (física, criba, grupos).

---

### R01 · Compañeros visibles dentro del grupo · 15 situaciones

**La pieza.** El índice `GroupView.mios` / `GroupView.porEquipo` (§3.2), calculado **una vez por
grupo y por kilómetro** y no por corredor. Es la pieza más barata del catálogo y la que más filas
apaga, y no cambia ninguna conducta por sí sola: habilita las otras veintisiete.

**Las reglas.**

1. **Índice.** Al construir cada grupo y en cada tic de kilómetro:
   ```
   byTeam(group) = agrupar(group.riderIds, teamOf)
   para cada equipo e con presencia:
       cartaAqui(e)          = argmax(mios(e), m => finishScoreAqui(m))  # R17
       tieneHombreDelante(e) = min(tS de todos los de e) < group.tS − STAGE.grupetoJoinGapSeconds
       hombresDelante(e)     = |{m ∈ e : tS(m) < group.tS − 12}|
   ```
2. **Dónde va mi carta** (`cartaEn`): `delante` / `aqui` / `detras` / `fuera`. Es lo único que hace
   falta para S-191 («el equipo partido en tres grupos: a quién sirve cada uno»): cada trozo del
   equipo mira dónde está la carta y actúa en consecuencia, en vez de mirar un escalar común.
3. **El fugado cuyo equipo persigue detrás** (S-133) y **el equipo de cazaetapas con su hombre en la
   fuga** (S-187) dejan de ser casos: son la misma consulta.
4. **El exceptuado en la fuga** (S-188, `CONTRARIO` hoy): si el que va delante tiene
   `desviacion == 1`, **no cuenta** como `hombreDelante`. El equipo persigue como si no estuviera,
   que es exactamente lo que el dueño pidió con «no trabaja para el líder, no recibe ayuda, pero no
   le perjudica».
5. **Esperar al compañero en el descenso** (S-249): en `shatter`, un miembro con
   `encargo.tipo == 'esperar'` y su hombre a ≤ `CASA.esperaMaxGapS` por detrás rueda con un tope de
   perfil `min(propio, perfilDelQueEspera + STAGE.dropDeficitTolerance)`. No es una ley nueva de
   criba: es un tope voluntario dentro de la que hay. Se limita a descenso y llano
   (`bloque.tipo ≠ 'subida'`) porque esperar en subida es lo que la v36 midió y refutó.
6. **La clasificación por equipos** (S-250): si el motivo `equipos` está activo (R05), el tercer
   hombre de la casa vale como resultado y `giveUpLambda` se anula para él mientras esté entre los
   tres primeros de su equipo en carretera.

**Cierra.** `S-089`, `S-113`, `S-128`, `S-133`, `S-177`, `S-187`, `S-188`, `S-191`, `S-211`, `S-247`,
`S-249`, `S-250`, `S-307`, `S-314`, `S-318`.

**Constantes nuevas.**

| Constante            | Valor | Por qué                                                                                                                        |
| -------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| `CASA.esperaMaxGapS` | 45 s  | Más allá de 45 s en un descenso el que espera pierde la carrera y no le alcanza: es el orden del `regroupGapSeconds` (22) × 2. |
| `CASA.esperaMaxKm`   | 8 km  | Se espera un rato, no media etapa. Por encima el compañero ya no vuelve y el que espera se ha tirado el día.                   |

**Cómo se mide.** Estadística nueva `companionIndex`: por etapa, (a) % de bloques en que un corredor
con un compañero delante entra al turno del pelotón —hoy es alto, tiene que caer—, (b) % de esperas
en descenso que terminan en reagrupación. Banco: **carrera pequeña** (§7.1) y `smallTours`.
Invariante propuesto: **«nadie persigue a su propio hombre»** — en el pelotón, `< 3 %` de los
bloques con un equipo tirando y su carta delante (hoy no se mide; `medir-rebufo.mjs` lo roza).

---

### R02 · Superioridad numérica: dos compañeros en el mismo grupo · 12 situaciones

**La pieza.** Un **bloque de coordinación intra-equipo** que vive en el `RoadCaptain` y se aplica en
tres sitios: el turno (`relayTurn`), el ataque (`chooseInstigator` + apetito) y la meta
(`finishStage`). Es lo que el dueño pidió con nombre y hoy «no se puede ni plantear».

**Las reglas.**

1. **Los relevos del dúo (S-303, `CONTRARIO`).** Con `mios ≥ 2` en un grupo de tamaño ≤
   `CASA.duoMaxGroup` (12: por encima ya no es una situación de dúo, es un pelotón):
   ```
   deberDeCasa(m) = deber(m) × ( m == cartaDeCasaAqui ? CASA.duoCartaShare : 1 )
   CASA.duoCartaShare = 0.35
   ```
   Es decir: **releva el segundón y la carta se guarda**. Y el total que aporta la casa se acota a
   `CASA.duoQuotaShare` (0,55) de los turnos del grupo, para que dos no releven el doble que uno.
2. **El ataque alternado (S-304).** Si la casa tiene mayoría o paridad en un grupo pequeño y el
   mejor rematador del grupo NO es de la casa:
   ```
   alterna = mios ≥ 2 ∧ size ≤ CASA.duoMaxGroup ∧ mejorRemate(group) ∉ mios
   si alterna:
       turnoDeAtaque = el de casa que NO atacó la última vez
       apetito(turnoDeAtaque) *= CASA.alternaBoost        # 1.8
       apetito(los otros de casa) *= CASA.frenoCompanero  # 0.15
       # y el que no ataca NO responde al ataque de su propio compañero:
       followProbability(compañero → compañero) = 0
   ```
   El `followProbability = 0` entre compañeros cuando la casa ya tiene un hombre en el ataque es la
   regla que arregla de golpe «dos del mismo equipo saltan juntos y se anulan».
3. **El rival solo contra dos (S-265).** Al rival aislado el motor le da lo contrario de lo que
   necesita: hoy releva por deber. Regla: `sinOpciones(rival)` se calcula ahora también con
   `desventajaNumerica = 1 − 1/mios_del_mejor_equipo`, de modo que el aislado **baja su deber** y
   **sube su marcaje**. En carretera es «no puedo tirar, me van a saltar por turnos».
4. **Uno para el otro en meta (S-349, S-357, S-362).** En `finishStage`, dentro de un grupo, si dos
   de la misma casa están entre los `CASA.cesionTopN` (4) mejores por `score`:
   ```
   segundoDeCasa.score *= CASA.cesionFactor          # 0.90
   cartaDeCasa.score   *= 1 + CASA.cesionAyuda       # 1.06
   ```
   Y **se retira `finishRoleWeight` para ellos**: el 0,88 del gregario era el parche de la v48 para
   este mismo problema («no tiene sentido que luchen el sprint 2 del mismo equipo… si hubieran
   colaborado quizás hubieran ganado uno de ellos»), y con la mecánica de verdad deja de hacer
   falta. Se propone además subir `finishRoleWeight[gregario|lanzador]` de 0,88 a **0,94** una vez
   esto exista, porque el 0,88 castigaba dos veces (§9).
5. **El puncheur que ataca para que no llegue el sprint de su compañero (S-343, `CONTRARIO`).** Con
   dos cartas de perfil distinto (`sprinter_y_escalador`, §5.1), el que no gana en el final previsto
   recibe `apetito × CASA.cartaEquivocadaBoost` (2,2) en el terreno donde SÍ puede: es el motor de
   la media montaña y hoy no existe.
6. **Mayoría en la fuga (S-306) y tres equipos con dos cada uno (S-305).** El cupo de la aduana
   (R03) impide que se llegue a 4 de 7 salvo en fugas grandes; cuando se llega, la mayoría **impone
   el ritmo**: `compromiso` del grupo se calcula ponderando por casa y no por cabeza, de modo que un
   equipo con 3 de 7 mueve el compromiso como 3/7 y no como 3 individuos independientes.

**Cierra.** `S-094`, `S-265`, `S-293`, `S-303`, `S-304`, `S-305`, `S-306`, `S-343`, `S-349`, `S-357`,
`S-358`, `S-362`.

**Constantes nuevas.**

| Constante                   | Valor | Por qué                                                                                                                                  |
| --------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `CASA.duoMaxGroup`          | 12    | Por encima de doce el grupo se comporta como pelotón y el turno lo gobierna `relayRotationMax`; el dúo deja de ser visible.              |
| `CASA.duoCartaShare`        | 0,35  | La carta no deja de relevar del todo (eso es un pelotón, no una fuga de seis) pero pasa un tercio de lo que pasaría sola. **[calibrar]** |
| `CASA.duoQuotaShare`        | 0,55  | Dos de seis no pueden hacer más de la mitad del trabajo: es el «5 de cada uno si hay 4 equipos» del dueño, aplicado a grupos pequeños.   |
| `CASA.alternaBoost`         | 1,8   | El que le toca ataca casi el doble: suficiente para que la alternancia se vea en la crónica. **[calibrar]**                              |
| `CASA.frenoCompanero`       | 0,15  | El que no ataca casi no ataca. Es el mismo orden que `tacticPullingAppetite` (0,1), que ya está medido como «uno de cada diez».          |
| `CASA.cesionTopN`           | 4     | La cesión solo tiene sentido entre los que se juegan la victoria.                                                                        |
| `CASA.cesionFactor`         | 0,90  | El segundón cede un 10 %: menos que el 12 % que le quitaba `finishRoleWeight` al gregario, y por la razón correcta. **[calibrar]**       |
| `CASA.cesionAyuda`          | 0,06  | Lo que gana la carta es más o menos lo que ya da un lanzador (`leadOutBoostPerHelper` 0,05).                                             |
| `CASA.cartaEquivocadaBoost` | 2,2   | Un poco más que la mentalidad supercombativa (1,6): es una razón táctica, no un carácter. **[calibrar]**                                 |

**Cómo se mide.** Tres estadísticas nuevas en un banco `duo.ts`: (a) `duoWinShare` — de los grupos de
≤ 8 llegados a meta con dos de una casa, % en que gana uno de los dos (hoy la queja es que gana el
tercero); objetivo **55-80 %** _(al azar con 2 de 6 sería 33 %; 80 % es el techo por encima del cual
la superioridad numérica se vuelve determinista)_; (b) `duoBothAttackPct` — % de movimientos con dos
de la misma casa entre los que saltan; objetivo **0-12 %**; (c) `isolatedRelayShare` — cuánto releva
el rival aislado contra los del dúo; objetivo **< 1,0** (hoy es ≈ 1,0 por construcción). Banco:
carrera pequeña + `smallTours`.

---

### R03 · La aduana como voto por equipos, revisable cada kilómetro · 24 situaciones

**La pieza.** La **Mesa**: sustituir el dado de `pelotonAllows` por una **suma de votos ponderada de
los directores**, recalculada cada kilómetro mientras la fuga esté viva. Es la pieza de la que
cuelga el día entero: si la cuerda sale de un dado, todo lo que viene después está construido sobre
azar.

**Las reglas.**

1. **El voto de un equipo** sobre el movimiento de cabeza, cada km:
   ```
   voto(e, mov) = clamp(
        PULSO.wRepr    · repr(e, mov)              # tengo hombre dentro           S-086
      − PULSO.wSinNada · sinNada(e, mov)           # no tengo a nadie y quería      S-087
      − PULSO.wPeligro · peligroGc(e, mov)         # me quita la general            S-088
      − PULSO.wSprint  · peligroSprint(e, mov)     # lleva a alguien que me gana    S-090
      − PULSO.wCoste   · costeDeCerrar(e, mov)     # cerrarla me arruina el día
      + PULSO.wMotivo  · motivoLibre(e)            # hoy no tengo nada que perder   S-064
      , −1, +1)
   ```
   con:
   - `repr(e,mov)` = 1 si su carta o su hombre de motivo va dentro; 0,45 si va cualquier otro;
     **0 si el que va dentro tiene `desviacion == 1`** (el exceptuado no representa a nadie).
   - `sinNada(e,mov)` = 1 si el equipo tiene motivo `cazaetapas`/secundaria y **cero** hombres
     dentro y aún queda ventana (`km < PULSO.ventanaFugaFrac · totalKm`).
   - `peligroGc(e,mov)` = `clamp(costeParaMi(mov) / colchonNecesario, 0, 1)` — de R04.
   - `peligroSprint(e,mov)` = 1 si dentro va alguien con `finishScoreAqui ≥ miCarta − 6` y el final
     previsto admite llegada agrupada.
   - `costeDeCerrar(e,mov)` = `huecoCreido / (hombresDisponibles · PULSO.cierrePorHombreS)`,
     normalizado a [0,1] contra el presupuesto restante. Es lo que hace que un equipo con tres
     hombres vote «déjala» aunque le moleste.
   - `motivoLibre(e)` = 1 si `motivoActivo == 'ninguno'`.
2. **La agregación (S-119).** No es una media: el que puede pagar manda.
   ```
   peso(e) = hombresEnPeloton(e) · (1 + PULSO.pesoDelMaillot · [e lleva el maillot])
   cuerda  = clamp( Σ voto(e)·peso(e) / Σ peso(e), −1, +1 )
   ```
   `PULSO.pesoDelMaillot` = 1,5: el equipo del maillot pesa dos veces y media un hombre normal,
   porque es de quien es el problema. Es la traducción numérica de «manda el MAILLOT AMENAZADO» que
   hoy vive en `claimFor`.
3. **De la cuerda a la carretera.** Dos salidas, no una:
   ```
   pAduana   = clamp(PULSO.aduanaBase + PULSO.aduanaSpan · cuerda, 0.02, 0.92)   # ¿nace?
   huecoMeta = PULSO.leashBase · (0.35 + 0.65 · max(0, cuerda))                  # ¿a cuánto se estabiliza?
   ```
   La segunda es la que hoy no existe y explica S-149 y S-234 sin ningún caso especial: cuando la
   suma de votos es muy positiva —nadie tiene motivo, todos tienen hombre dentro— el hueco objetivo
   se va a quince minutos **porque nadie quiere pagar**, no porque un dado lo haya decidido.
4. **El voto se revisa cada kilómetro (S-120).** Hoy `allowed` se decide UNA vez al nacer y no se
   toca. Con esto, una fuga puede nacer con cuerda y perderla en el km 60 porque un equipo se ha
   quedado sin su hombre, o al revés. `Move.allowed` deja de ser `boolean` y pasa a ser
   `Move.cuerdaAhora: number` con histéresis (`PULSO.cuerdaHisteresis` 0,15).
5. **Quién es elegible para irse.** Tres filtros, del lado de fuera de la aduana:
   - **Veto al maillot** (S-118): se queda tal cual. Es veto, no descuento. Ya está medido.
   - **El sprinter puro** (S-473): se queda (`breakawaySkipSprThreshold` 70), pero **relativo al
     campo del día** y no absoluto: `spr ≥ p90(SPR del campo)`, para que en una carrera continental
     también haya un sprinter puro que no se va.
   - **El que venía tirando** (S-472): se queda (`tacticPullingAppetite` 0,1).
   - **El fugado de ayer paga aduana hoy** (S-076): `voto(e) −= PULSO.wAyer` si el que va dentro
     estuvo en la fuga de ayer; y su propio apetito baja (R09).
6. **El cupo y la composición (S-083).** No es un tope duro sino un coste creciente:
   ```
   apetitoFuga(m) *= CASA.cupoFuga ^ hombresDeMiCasaYaDelante
   CASA.cupoFuga = 0.30
   ```
   Con 0,30: el segundo de una casa sale con el 30 % de las ganas, el tercero con el 9 %, el cuarto
   con el 2,7 %. Eso convierte «seis del mismo equipo en una fuga de nueve» en un suceso raro sin
   prohibirlo —y sin prohibirlo importa, porque en una fuga de treinta de montaña sí que van dos y
   tres de la misma casa—. **Y sustituye a `teamAttackUpTheRoad` = 0,4**, que hoy es «binario y
   flojo: el mismo con uno delante que con cinco» (`docs/tactica.md` §3.A1).
7. **Que sea el de su objetivo (S-083, S-433).** A quién manda una casa a la fuga deja de salir de
   `breakScore = 0,5·TAC + 0,3·LLA + 0,2·RES` —una fórmula de rodador, sea cual sea el terreno— y
   pasa a salir del **final previsto y del motivo**:
   ```
   candidatoDeFuga(e) = argmax(m ∈ e \ {cartas}, w_final · finishScorePrevisto(m)
                                               + w_motivo · aptitudParaElMotivo(m, motivoActivo)
                                               + w_fresco · frescura(m)
                                               − w_ayer   · fugóAyer(m))
   ```
   con pesos `0,45 / 0,30 / 0,15 / 0,10`. En una etapa reina el argmax es el escalador; en una llana
   sigue siendo el rodador. Esto es la fila `CONTRARIO` número 10 de las veinte más graves.
8. **El infiltrado (S-474).** Un equipo con motivo `perseguir` y sin representación puede elegir, en
   vez de cerrar, **meter un hombre a estorbar**: `intent = 'infiltrar'`. El infiltrado entra en la
   fuga con `encargo.tipo = 'no_relevar'` y su `deber` es 0. Le sale barato al equipo y le sale caro
   a la fuga, que es justo el punto.
9. **La segunda fuga del día (S-116, `CONTRARIO`).** Al capturar una fuga, la cuerda **no se
   reinicia a cero**: el voto se recalcula con los mismos criterios y, si sigue habiendo equipos sin
   representación, sale otra. Hoy `dayBreakFormed` bloquea el título para siempre y
   `tacticBreakWindowFraction` 0,55 cierra la ventana. Se sustituye por: la ventana se reabre
   `PULSO.reaperturaKm` (6 km) después de una captura si `Σ sinNada > PULSO.reaperturaUmbral` (0,8).

**Cierra.** `S-064`, `S-066`, `S-076`, `S-083`, `S-086`, `S-087`, `S-088`, `S-090`, `S-091`, `S-095`,
`S-114`, `S-115`, `S-116`, `S-117`, `S-118`, `S-119`, `S-120`, `S-121`, `S-149`, `S-425`, `S-433`,
`S-472`, `S-473`, `S-474`.

**Constantes nuevas.**

| Constante                | Valor   | Por qué                                                                                                                                                            |
| ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PULSO.wRepr`            | 0,55    | Tener hombre dentro es el motivo más fuerte para dejarla ir: el dueño lo dice explícito («los equipos de los sprinters tienen a alguien metido y no van a tirar»). |
| `PULSO.wSinNada`         | 0,45    | Casi tanto en contra: el que no tiene a nadie cierra hasta colar a uno.                                                                                            |
| `PULSO.wPeligro`         | 0,90    | La general manda sobre todo lo demás. Es el único peso > 0,7 y por eso `peligroGc = 1` puede tumbar la fuga él solo.                                               |
| `PULSO.wSprint`          | 0,35    | Menos que la general porque una etapa se pierde y una vuelta no.                                                                                                   |
| `PULSO.wCoste`           | 0,40    | Lo que hace que un equipo mermado deje ir lo que le molesta. Sin él, todos cierran siempre.                                                                        |
| `PULSO.wMotivo`          | 0,30    | El que no tiene nada que perder deja ir; recoge `teamAttackFree` (1,4) por el lado del voto.                                                                       |
| `PULSO.wAyer`            | 0,25    | Un cuarto de voto: molesta, no veta. «Al que ganó ayer no le dejan ir» tiene que costar sin ser imposible.                                                         |
| `PULSO.pesoDelMaillot`   | 1,5     | Traduce `claimFor` (maillot amenazado = 4 contra 3) a la nueva escala.                                                                                             |
| `PULSO.aduanaBase`       | 0,30    | Es exactamente `tacticAllowBase` de hoy: con `cuerda = 0` la conducta es la actual. **Punto de anclaje deliberado.**                                               |
| `PULSO.aduanaSpan`       | 0,55    | Lleva la probabilidad de 0,02 (aduana cerrada, S-091) a 0,85 (día sin motivo). Respeta el techo de hoy (`tacticAllowMax` 0,7) por el centro.                       |
| `PULSO.leashBase`        | 1.200 s | Veinte minutos: el techo de «la escapada se va a 15 o 20 minutos» del dueño. Con `cuerda = 0` da 420 s, cerca del `gcThreatFraction·gcControlLeash` = 420 de hoy.  |
| `PULSO.cuerdaHisteresis` | 0,15    | Evita que la cuerda oscile de un km al siguiente; mismo orden que `commitHysteresis`.                                                                              |
| `PULSO.cierrePorHombreS` | 55 s    | Lo que cierra un hombre relevando en un km, del banco de cierre (invariante 45: 50-75 s en 10 km con seis hombres → ≈ 55 s/hombre/10 km). **Derivado, no nuevo.**  |
| `PULSO.ventanaFugaFrac`  | 0,55    | Es `tacticBreakWindowFraction` de hoy, movida de sitio.                                                                                                            |
| `PULSO.reaperturaKm`     | 6 km    | Un cuarto de hora: lo que tarda el pelotón en respirar tras una captura. Es también la `tregua` de R19, y comparten número a propósito.                            |
| `PULSO.reaperturaUmbral` | 0,8     | Hace falta que al menos un equipo entero siga sin nada para que se reabra.                                                                                         |
| `CASA.cupoFuga`          | 0,30    | Ver arriba: el 4.º hombre sale con el 2,7 % de las ganas. **[calibrar]** contra `breakTeamConcentration`.                                                          |

**Cómo se mide.** Cuatro estadísticas nuevas, todas sobre `fuga_formada` cruzado con `teamId` —lo
que hoy es **la ceguera nº 2 del banco** («composición de la fuga por equipos: no existe»):

- `breakTeamConcentration` — máxima fracción de una fuga que es de un mismo equipo, mediana y peor
  caso. Banda propuesta: **mediana ≤ 0,34, peor caso ≤ 0,55** _(el peor caso del banco hoy es 4 de
  20; la queja del dueño es 6 de 9 = 0,67)_.
- `breakTeamsRepresented` — cuántos equipos distintos hay en la fuga del día, mediana. Banda
  propuesta: **≥ 0,70 · min(tamañoFuga, equipos)** _(«un hombre por equipo» como norma, con margen)_.
- `breakSizeByTerrain` — tamaño mediano de la fuga del día por terreno. Banda propuesta: **llana
  3-7, media 6-16, reina 10-30** _(los datos del comentario de `breakAppeal`: Tour 2025 e12: 52,
  Vuelta e12: 53, media de 19 en alta montaña; y «en LLANO, cuatro»)_.
- `leashSpread` — desviación del hueco estabilizado entre etapas del mismo tipo. Hoy es casi
  constante; con la Mesa tiene que abrirse. Sin banda al principio: **se imprime como vigilancia**.

Banco: `smallTours` (10 carreras enteras, ya existe) + carrera pequeña (§7.1) + los canónicos.
Invariante nuevo propuesto: **«ninguna fuga es de una sola casa»** — `breakTeamConcentration` peor
caso `≤ 0,55` sobre 8 corridas de las 10 carreras pequeñas.

---

### R04 · La general virtual y el colchón que depende de lo que queda · 17 situaciones

**La pieza.** Dos cosas, y las dos viven en el `DirectorSeat`: una **general virtual por equipo**
—qué puestos pierde MI hombre si esto llega— y un **colchón necesario** calculado sobre el terreno
que queda de carrera, no sobre una constante de segundos.

**Las reglas.**

1. **La general virtual (S-103).** Cada tic de director, sobre su pizarra:
   ```
   virtual(r) = gcTotal(r) + (r va delante ? −huecoCreido : +0)
   puestoVirtual(miHombre) = 1 + |{r : virtual(r) < virtual(miHombre)}|
   costeParaMi(mov) = max(0, virtual(miHombre) − min(virtual(r) : r ∈ mov))   # segundos
   puestosQuePierdo(mov) = puestoVirtual_con(mov) − puestoActual(miHombre)
   ```
   Hoy `frontThreatDeficit` mira **solo al mejor clasificado de la fuga** y lo compara con una
   constante. Eso es lo que produce el error de puntería madre (S-176, la fila más grave del
   catálogo): «si delante van tres irrelevantes y detrás el 2.º de la general, hoy el pelotón se
   gasta en los tres irrelevantes».
2. **A quién se persigue (S-176).** El objetivo de la caza deja de ser «el grupo más adelantado» y
   pasa a ser **el que más daño hace**:
   ```
   objetivoDeCaza(e) = argmax(movimientos vivos, mov => dañoPara(e, mov))
   dañoPara(e, mov)  = w_gc     · clamp(costeParaMi(mov)/colchonNecesario)
                     + w_etapa  · [la carta de e no puede ganar si esto llega]
                     + w_sec    · [mov le quita una clasificación secundaria]
   ```
   con pesos 0,55 / 0,30 / 0,15. Y el controlador del pelotón mide su `err` contra **ese** grupo, no
   contra el de cabeza. Esto también arregla que hoy «la ventaja se midió trece kilómetros contra un
   grupeto» por el otro lado.
3. **El colchón necesario (S-391).** El umbral de «estar fuera de la general» deja de ser
   `gcControlLeash` = 700 s y pasa a calcularse:
   ```
   colchonNecesario(r) = GC.colchonBase
                       + GC.colchonPorKmMontana · kmMontanaQueQuedan
                       + GC.colchonPorKmCrono   · kmCronoQueQuedan
                       + GC.colchonPorBonif     · bonificacionesQueQuedan
   ```
   Un hombre a 3 min el día 3 de una vuelta con dos reinas y una crono por delante **no está fuera**;
   el mismo hombre a 3 min el día 19 con dos llanas por delante **sí lo está**. Hoy los dos se
   tratan igual y «se caza lo que no hacía falta cazar y se deja ir lo que decidía la vuelta».
4. **El líder virtual y el traspaso en carretera (S-101, S-294).** Cuando `puestoVirtual` de alguien
   de delante pasa a 1, el equipo de ese hombre **cambia de motivo en carretera**: de `general` a
   `maillot`, con todo lo que arrastra (deja de tirar, empieza a esconderse). Y el equipo del maillot
   real pasa de `controlar` a `perseguir` con el claim máximo. Es un cambio de estado, no un caso.
5. **El maillot sin equipo (S-079) y el maillot prestado (S-096).** Los dos son `CONTRARIO` hoy.
   - Sin equipo (agente libre con el maillot): no hay quien tire, así que **él tira**. `relayDuty` le
     quita `relayRaceLeaderPenalty` (3) cuando `hombresEnPeloton(su equipo) ≤ 1`.
   - Prestado (el cronista que lo perderá en la montaña): su director calcula
     `esperanzaDeConservarlo = P(mantener el maillot al final)` con el terreno que queda y su perfil;
     si `< GC.maillotPrestadoUmbral` (0,25), el motivo baja de `maillot` a `etapa`/`ninguno` y **el
     equipo deja de pagar el jersey**. Eso es literalmente lo que hace un equipo modesto que coge el
     amarillo en la etapa 2 de una vuelta que acaba en los Alpes.
6. **Alianza o nadie controla (S-104, S-102).** El equipo del 2.º tiene un dilema real: ayudar a
   cazar (le conviene si le cuesta general) o cruzarse de brazos («tira tú, que es tu problema»). Va
   a la subasta del frente (R20) con `voto = −peligroGc(2.º) + PULSO.gorroneo`, y `PULSO.gorroneo`
   (0,25) es la tentación de dejar que pague el otro.
7. **El lejano al que se deja ir (S-099) y el que ya no es de la general (S-135).** Con
   `colchonNecesario` el «lejano» deja de ser una constante. Y S-135 (`CONTRARIO`): un hombre cuyo
   `puestoVirtual` sale del top-`GC.topRelevante` (20) durante `GC.persistenciaKm` (30 km) **cambia
   de motivo**: su equipo deja de correr la general y él puede irse al grupeto sin que nadie le
   espere.

**Cierra.** `S-048`, `S-078`, `S-079`, `S-096`, `S-097`, `S-098`, `S-099`, `S-100`, `S-101`, `S-102`,
`S-103`, `S-104`, `S-181`, `S-239`, `S-258`, `S-294`, `S-391`.

**Constantes nuevas.**

| Constante                  | Valor    | Por qué                                                                                                                                                   |
| -------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GC.colchonBase`           | 90 s     | Lo que se pierde en una llana nerviosa o en un abanico tonto. Por debajo, nadie está a salvo aunque no queden puertos.                                    |
| `GC.colchonPorKmMontana`   | 3,5 s/km | Del propio banco: la brecha 1.º-10.º de una reina es 40-300 s con ~15 km de puerto decisivo → ~3-6 s/km sobre los que se juegan la carrera. **Derivado.** |
| `GC.colchonPorKmCrono`     | 1,1 s/km | Una crono de 40 km reparte p90−p10 = 80-170 s (banda 6) → ~2-4 s/km entre extremos, ~1,1 entre favoritos.                                                 |
| `GC.colchonPorBonif`       | 1,0      | Un segundo de bonificación pendiente es un segundo de colchón que hace falta.                                                                             |
| `GC.maillotPrestadoUmbral` | 0,25     | Con menos de una posibilidad entre cuatro, un equipo modesto no quema la semana defendiendo. **[calibrar]**                                               |
| `GC.topRelevante`          | 20       | Es el top-20 que ya usa la radio (`radioWatchList`) y `attackAppetite` («6.º-20.º 0,31 · el resto 0,21»).                                                 |
| `GC.persistenciaKm`        | 30 km    | No se cambia de plan por un mal cuarto de hora; a los 30 km ya no es un mal rato.                                                                         |
| `PULSO.gorroneo`           | 0,25     | La tentación de que pague el otro. Sin ella la caza compartida es automática y no hay pulso.                                                              |

**Cómo se mide.** `gcChaseAim` — de las cazas emprendidas, % en que el grupo perseguido era el que
más `dañoPara` producía. Hoy es por construcción el de cabeza; objetivo **≥ 80 %**. `gcLeashSpread` —
desviación del hueco tolerado entre día 3 y día 19 de la misma vuelta con la misma amenaza; hoy es
0, objetivo **≥ 120 s**. Banco: `grandTour` (que ya arrastra general de verdad) y carrera pequeña.
Invariante nuevo: **«el colchón se estrecha con la carrera»** — en `race-france`, el hueco mediano
tolerado a una fuga con un hombre a 3 min tiene que ser estrictamente decreciente entre la semana 1
y la semana 3.

---

### R05 · Motivos secundarios como claim de equipo · 24 situaciones

**La pieza.** El **vocabulario de motivos** del `DirectorSeat` pasa de cuatro valores a once, y cada
motivo trae tres cosas: **derecho al frente**, **cupo de fuga** y **efecto en las órdenes**. Sin
esto, «dos tercios del pelotón no tienen ninguna razón para correr».

**Las reglas.**

1. **El vocabulario.**
   ```ts
   type Motivo =
     | 'etapa'
     | 'maillot'
     | 'general' // los tres de hoy
     | 'montana'
     | 'puntos'
     | 'joven'
     | 'equipos' // clasificaciones secundarias
     | 'combatividad' // estar delante es el objetivo
     | 'patrocinador' // el invitado que sale todos los días
     | 'ranking' // «hazme el 12.º puesto»
     | 'ninguno'
   ```
2. **Cada motivo, con sus tres números.** `MOTIVO_TABLA` (una tabla, no un `switch`):

   | Motivo         | claim al frente                     | cupo de fuga | efecto en las órdenes                                                   |
   | -------------- | ----------------------------------- | ------------ | ----------------------------------------------------------------------- |
   | `maillot`      | 4 (amenazado)                       | −∞ (veto)    | líder `reservon`, todos gregarios, nadie a la fuga                      |
   | `general`      | 3 si amenazado                      | 0,3          | líder protegido, 1-2 hombres pueden ir de satélite (R02 §5)             |
   | `etapa`        | 3                                   | 0,5          | carta + tren o + gregarios según el final                               |
   | `puntos`       | 2,5 antes de la pancarta, 1 después | 1,2          | el hombre del verde disputa; el equipo caza ANTES de la volante (S-105) |
   | `montana`      | 1                                   | **2,0**      | manda al escalador a la fuga; disputa toda cima puntuable               |
   | `joven`        | 1,5                                 | 0,6          | como `general` pero con umbral propio y sin obligación de tirar         |
   | `equipos`      | 0,5                                 | 0,8          | no se deja caer al tercer hombre (R01 §6)                               |
   | `combatividad` | 0                                   | **2,2**      | ir delante ES el objetivo; se acepta ser cazado                         |
   | `patrocinador` | 0                                   | **1,8**      | un hombre a la fuga TODOS los días, aunque no valga (S-066)             |
   | `ranking`      | 1                                   | 0,7          | proteger un puesto concreto; no arriesgar                               |
   | `ninguno`      | 0                                   | 1,0          | nada                                                                    |

   El **cupo de fuga** multiplica el apetito de `fuga`/`contraataque` (y por tanto compone con
   `CASA.cupoFuga` de R03): un equipo con motivo `montana` manda al segundo hombre con
   `2,0 · 0,30 = 0,6` de las ganas, en vez de 0,30. Es lo que llena la fuga de veinte de una reina.

3. **Varios motivos a la vez (S-020).** Hoy `purposeCount > 1` da un +0,2 plano al empuje. Se
   sustituye por:
   ```
   motivoActivo = argmax(motivos, m => claim(m) · urgencia(m))
   urgencia(m)  = distanciaAlObjetivo(m) / oportunidadesQueQuedan(m)
   empujeTotal  = empuje(motivoActivo) + PULSO.segundoMotivo · empuje(2.º motivo)
   PULSO.segundoMotivo = 0.25
   ```
   `urgencia` es la que hace que un equipo que va 2.º en la montaña a 4 puntos con dos cimas por
   delante corra la montaña **hoy** y no dentro de tres días.
4. **El maillot puesto a cazar puntos de montaña (S-015, `CONTRARIO`).** Regla dura:
   `motivo ∈ {maillot, general}` **anula** `contestClimbs`/`contestSprints` automáticos para la
   carta. Las pancartas cuestan (`bannerCost`) y el líder no las paga salvo que la orden humana lo
   pida explícitamente (y entonces se le avisa, §6).
5. **El maillot que obliga (S-452).** Campeón del mundo y campeón nacional: `+PULSO.jerseyObliga`
   (0,4) al claim de `etapa` y al apetito de `fuga` cuando el final le va. No es una regla de motor
   nueva: es un motivo más en la tabla.
6. **El equipo que se queda sin tres hombres (S-396) y el que se queda sin patrocinador (S-469).**
   Los dos son el mismo mecanismo: **el motivo se cae**. Con `hombresVivos < CASA.minParaJugar` (4)
   el motivo baja a `ninguno` con `combatividad` de consuelo; sin patrocinador (S-469), el equipo
   corre por `ranking` individual y sus hombres suben `desviacion` a 0,3 de oficio —cada uno a lo
   suyo, que es lo que pasa en un equipo que se disuelve—.
7. **Los banners como objetivo real.** `contestSprints`/`contestClimbs` dejan de ser dos casillas
   sueltas y pasan a derivarse del motivo del equipo cuando no hay orden humana; y **se leen en la
   cima** (`disputeClimb`, que hoy los ignora, S-137).

**Cierra.** `S-015`, `S-016`, `S-017`, `S-018`, `S-019`, `S-020`, `S-031`, `S-034`, `S-041`, `S-042`,
`S-043`, `S-044`, `S-045`, `S-065`, `S-105`, `S-108`, `S-162`, `S-271`, `S-272`, `S-383`, `S-396`,
`S-407`, `S-447`, `S-452`.

**Constantes nuevas.** Las de la tabla `MOTIVO_TABLA` (33 números, todos **[calibrar]** salvo los
tres de `maillot`/`general`/`etapa`, que son los de hoy trasladados), más:

| Constante             | Valor | Por qué                                                                                                   |
| --------------------- | ----- | --------------------------------------------------------------------------------------------------------- |
| `PULSO.segundoMotivo` | 0,25  | Sube de 0,2 (`teamDriveSecondCard`) porque ahora el segundo motivo puede ser real y no un residuo.        |
| `PULSO.jerseyObliga`  | 0,40  | El arcoíris obliga a dar la cara; el orden de una mentalidad combativa (1,25 → +0,25 sobre 1).            |
| `CASA.minParaJugar`   | 4     | Con tres hombres no se controla nada: es el `relayMinPullers` (4) visto desde el otro lado. **Derivado.** |

**Cómo se mide.** `motiveMix` — reparto de `motivoActivo` sobre todos los equipos y etapas. Banda
propuesta: **`ninguno` ≤ 25 %** _(hoy, con tres motivos, la mayoría del pelotón cae en `ninguno`; en
carretera casi nadie corre sin razón)_. `secondaryJerseyOwner` — % de puntos de montaña que se lleva
alguien cuyo equipo tenía motivo `montana`; hoy es azar, objetivo **≥ 45 %**. `bannerCostByMotive` —
que el maillot no pague `bannerCost` salvo por orden humana: **0 casos** es el invariante.
Banco: `smallTours` con clasificaciones secundarias activadas (hoy no existen: ceguera nº 8).

---

### R06 · Las pancartas: volante y cima como puntos del recorrido · 20 situaciones

**La pieza.** Un **submotor de pancarta**: los banners dejan de ser un `disputeBanner` que puntúa y
cobra, y pasan a ser un punto del recorrido con **aproximación, acelerón, coste y estela**, con orden
de paso para todos los grupos.

**Las reglas.**

1. **La aproximación (S-236).** `PANC.aproximacionKm` (2 km) antes de una pancarta con interesados
   se activa una **pelea por la posición** idéntica a la del pie de puerto (R15): sube el
   `compromiso` del grupo un `PANC.tironAprox` (0,10) y se paga colocación.
2. **El acelerón y la estela (S-212).** En el bloque de la pancarta, los contendientes van a
   `perfil + matchBonus`; **el grupo entero acelera** con ellos (`PANC.estelaFactor` 0,6 del
   diferencial) y en los `PANC.estelaKm` (1,5 km) siguientes el grupo va `PANC.resacaFactor` (0,93)
   por debajo de su ritmo. Hoy la pancarta no cambia el ritmo de nadie, y en carretera un sprint
   intermedio parte grupos.
3. **El coste, solo para quien la disputa de verdad (S-141, `CONTRARIO`).** Hoy `disputeClimb`
   cobra a todo el que puntúa, venga de donde venga. Regla: paga `bannerCost` quien **cambió de
   ritmo por ella** —los `PANC.contendientes` (6) primeros de un grupo que la disputa— y no el que
   la corona porque pasaba por ahí. «El escalador reventado corona detrás del que llega entero»
   (S-142) sigue funcionando y ya no le cuesta nada.
4. **Quién renuncia (S-137, `CONTRARIO`).** `contestSprints` deja de ser sí/no. Se decide en el
   momento:
   ```
   disputa(m, pancarta) = motivoLoPide(m) ∧ puedoGanarla(m, grupo) ∧ mePuedoPermitir(m)
   mePuedoPermitir(m)   = energyFraction > PANC.minEnergia (0.45) ∧ matches > 0
                          ∧ no soy la carta de un final que importa más
   ```
5. **La volante con la fuga por delante (S-153, `CONTRARIO`).** Si la fuga ya se llevó los puntos que
   importan, el pelotón **también la esprinta** por los que quedan: `disputeBanner` se ejecuta grupo
   a grupo con los puntos **restantes**, no con la tabla entera. Es un cambio de dos líneas y una
   fila `CONTRARIO` de las gordas.
6. **El fugado que corona y se deja coger (S-080).** Con motivo `montana` y la cima coronada, el
   `RiderAgent` cambia de intención a `dosificar` y su `giveUpLambda` deja de ser 0: consiguió lo
   suyo.
7. **El sprinter que pasa el intermedio en montaña y se deja caer (S-138).** Igual, con
   `contestSprints` y motivo `puntos`: coronada la volante, `intencion = 'al_grupeto'`.
8. **Saber qué lidera y por cuánto (S-035, S-221).** `RaceView` incorpora `clasificaciones`: los
   puntos acumulados de montaña/puntos/joven **antes de hoy**, no solo los de hoy. Sin eso «pasa a
   liderar la montaña» es una frase que el motor no puede comprobar.
9. **El tren lanza el intermedio (S-196).** Si el equipo tiene motivo `puntos` y su hombre disputa,
   los lanzadores presentes entran al turno en los últimos `PANC.aproximacionKm`, igual que en meta.

**Cierra.** `S-033`, `S-035`, `S-080`, `S-109`, `S-124`, `S-136`, `S-137`, `S-138`, `S-140`, `S-141`,
`S-142`, `S-153`, `S-196`, `S-212`, `S-220`, `S-221`, `S-236`, `S-315`, `S-336`, `S-373`.

**Constantes nuevas.**

| Constante             | Valor  | Por qué                                                                                                                     |
| --------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| `PANC.aproximacionKm` | 2 km   | Igual que `pavesApproachKm` (2), que ya está medido como la distancia a la que empieza la pelea por el sitio. **Derivado.** |
| `PANC.tironAprox`     | 0,10   | Un décimo de compromiso: se nota en el ritmo y no rompe el grupo. **[calibrar]**                                            |
| `PANC.estelaFactor`   | 0,60   | El grupo sigue a los que esprintan pero no del todo.                                                                        |
| `PANC.estelaKm`       | 1,5 km | Lo que dura un cerillo en llano según el propio dueño («en llano que dure 1,5 km me parece razonable»). **Derivado.**       |
| `PANC.resacaFactor`   | 0,93   | Después de un acelerón el grupo va más lento un rato. Sin esto, la pancarta es energía gratis.                              |
| `PANC.contendientes`  | 6      | Los que de verdad se la juegan; el resto pasa. Menos que `sprintContenders` (10) porque una volante no es una meta.         |
| `PANC.minEnergia`     | 0,45   | Un poco por encima de `breakawaySkipEnergyFraction` (0,40): una volante cuesta menos que una fuga.                          |

**Cómo se mide.** `bannerPayers` — de los que pagan `bannerCost`, % que estaban entre los seis
primeros del grupo; objetivo **100 %** (invariante duro). `bannerPaceBump` — diferencia de velocidad
del grupo en el bloque de la pancarta contra el bloque anterior; objetivo **+3 a +12 %**.
`greenJerseyByMotive` — ver R05. Banco: canónico `llana-180` (que ya tiene volante en el km 100) y
carrera pequeña.

---

### R07 · Bonificaciones · 6 situaciones

**La pieza.** Los segundos de **pancarta** (que no existen y cuelgan de R06) y **el número visible**:
que quien decide si se mete en un sprint sepa cuántos segundos hay y qué le hacen a su general.

**Las reglas.**

1. **Bonificaciones de pancarta (S-193).** `Banner` gana `bonifS?: [number, number, number]`. Se
   restan del `gcTotal` igual que las de meta, que ya funcionan (10/6/4).
2. **Visible para quien decide (S-334).** `RaceView.proximaPancarta` lleva `bonifS`, y el apetito de
   disputar la mide contra el colchón:
   ```
   valorBonif(m, pancarta) = Σ bonifS[i] · P(quedar i-ésimo)  /  colchonNecesario(m)
   disputa(m) |= valorBonif > BONIF.umbralDisputa   # 0.05
   ```
   Un hombre a 8 s del maillot con 10 s en juego lo disputa; el mismo con 4 min de colchón, no.
3. **El sprinter-maillot (S-352, `CONTRARIO`).** El maillot **no le quita el sprint** a un velocista
   que lo lleva: la regla de R05 §4 (el líder no paga pancartas) se exceptúa cuando la carta de la
   etapa **es** el maillot y el final es masivo. Es el caso Sharjah entero.
4. **El líder con la general hecha regala la etapa (S-335).** Si `colchonActual > colchonNecesario ·
BONIF.holgura` (2,5), la carta de general baja su `finishScoreAqui` efectivo un
   `BONIF.regaloFactor` (0,88) en la última etapa: no disputa. Es tradición y es conducta observable.
5. **La vuelta llana que se decide por bonificaciones (S-353).** No hace falta regla nueva: con (1) y
   (2), en una vuelta de solo llanas el colchón necesario es pequeño, `valorBonif` es enorme, y las
   volantes se disputan a muerte. Sale solo.

**Cierra.** `S-193`, `S-334`, `S-335`, `S-352`, `S-353`, `S-360`.

**Constantes nuevas.**

| Constante             | Valor   | Por qué                                                                                                    |
| --------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `BONIF.umbralDisputa` | 0,05    | Un 5 % del colchón necesario: por debajo no compensa el cerillo. **[calibrar]**                            |
| `BONIF.holgura`       | 2,5     | Dos veces y media el colchón que necesitas es «la general está hecha».                                     |
| `BONIF.regaloFactor`  | 0,88    | El mismo orden que `finishRoleWeight` del gregario: no es que no pueda, es que no se lo juega.             |
| `BONIF.pancartaMedia` | [3,2,1] | Los segundos de volante habituales en las grandes vueltas; los de cima, `[1,0,0]` o ninguno según carrera. |

**Cómo se mide.** `bonifDecidedRaces` — % de vueltas de solo llanas cuya general la decide la
bonificación y no el crono acumulado. Objetivo **20-60 %** _(hoy es 0 % porque las volantes no
bonifican; en carretera una Sharjah la decide siempre)_. Banco: `analyzeSharjah`, que ya existe en
`sim/tactics.ts` y hoy no tiene banda — pasa a tenerla.

---

### R08 · El depósito que persiste entre etapas · 16 situaciones

**La pieza.** Un **estado físico multi-etapa** (`RiderCarry`) que el director lee al planificar. Es
la frontera con el diseño de entrenamiento ya cerrado, así que aquí se define **solo lo táctico**: lo
que el director hace con ese estado, no cómo se calcula.

**Las reglas.**

1. **`RiderCarry`, lo que viaja de un día al siguiente.**
   ```ts
   interface RiderCarry {
     depositoRelativo: number // [0,1] contra su propio máximo; ya existe vía ctl/atl
     cerillosGastadosAyer: number
     golpe: { tipo: 'ninguno' | 'roce' | 'serio'; desdeDia: number } // S-380
     enfermo: { grado: 0 | 1 | 2; desdeDia: number } // S-381, S-411
     ritmoDeCompeticion: number // [0,1] días de carrera recientes                 S-468
     recuperacionPersonal: number // [0,1] rasgo del corredor (REC + edad)          S-482
     moral: number // [0,1]                                          S-384
   }
   ```
   Tres de los siete ya existen en la base (`ctl`, `atl`, `alive`); los otros cuatro son nuevos y son
   **de estado**, no de física: no cambian los vatios de nadie, cambian **lo que el director decide**.
2. **El director lee el carry al repartir papeles (S-410, S-389, S-398).**
   ```
   aptoParaTirar(m)  = frescura(m) ≥ CARRY.minTirar (0.45) ∧ golpe.tipo ≠ 'serio'
   aptoParaSerCarta(m) = frescura(m) ≥ CARRY.minCarta (0.60) ∧ enfermo.grado == 0
   ```
   Un gregario gastado deja de ser gregario y pasa a `libre`; una carta tocada cede la carta. Hoy el
   reparto es puramente determinista por atributos (`autoOrders` «no ve la forma/energía de hoy»),
   que es la razón de que el mismo equipo corra igual el día 3 y el día 18.
3. **Dosificar la vuelta, no la etapa (S-379, `CONTRARIO`).** El presupuesto del equipo deja de ser
   `teamBudgetPerRider · leales` por etapa y pasa a repartirse **desde un presupuesto de carrera**:
   ```
   presupuestoDeHoy(e) = presupuestoRestante(e) · pesoDelDia(e, etapa) / Σ pesoDelDia(restantes)
   pesoDelDia(e, s)    = 1 + CARRY.pesoObjetivo · [s es día marcado por e]      # R10
   ```
   Con `CARRY.pesoObjetivo` = 1,5, un día marcado se lleva dos veces y media lo de un día normal, y
   el resto de días quedan más flojos. Eso es «administrar» y hoy es imposible.
4. **El que se cayó ayer (S-380) y el enfermo que aguanta (S-381).** `golpe`/`enfermo` bajan
   `aptoParaTirar`, suben `giveUpLambda` y **bajan el apetito de ataque**
   (`× CARRY.tocadoApetito` 0,45). El enfermo grado 2 puede no tomar la salida (S-411): decisión del
   director la noche antes, `P = CARRY.dnsPorEnfermedad` (0,35 con grado 2).
5. **El que llega sin ritmo (S-468) y la recuperación desigual (S-482).** `ritmoDeCompeticion` < 0,3
   → `−CARRY.sinRitmoPerfil` (2 puntos de perfil efectivo) los tres primeros días, y el director lo
   sabe: no le da la carta. `recuperacionPersonal` escala cuánto vuelve `depositoRelativo` cada
   noche. Los dos son datos de entrenamiento; aquí solo se leen.
6. **El equipo del maillot paga el jersey (S-399).** Cada día defendiendo cuesta
   `CARRY.jerseyCoste` (0,04 del presupuesto de carrera por día con motivo `maillot`) a **todo el
   equipo**. Es la razón de que un equipo modesto que coge el amarillo pronto llegue fundido a la
   tercera semana, y hoy no cuesta nada.
7. **El tocado decide si sigue (S-144) y el equipo baja a un hombre sano (S-450).** El director puede
   retirar a un hombre por orden si `motivoActivo == 'ninguno'` y quedan carreras cercanas donde le
   quiere fresco: `P = CARRY.retiradaPorOrden` (0,08/día en la tercera semana con equipo sin nada).
8. **La etapa con dos sectores (S-431).** El `carry` se aplica **entre sectores** con
   `CARRY.recuperacionSemietapa` (0,35 de la recuperación de una noche). No hace falta más.

**Cierra.** `S-144`, `S-377`, `S-378`, `S-379`, `S-380`, `S-381`, `S-385`, `S-389`, `S-398`,
`S-399`, `S-410`, `S-411`, `S-431`, `S-450`, `S-468`, `S-482`.

**Constantes nuevas.**

| Constante                     | Valor | Por qué                                                                                                     |
| ----------------------------- | ----- | ----------------------------------------------------------------------------------------------------------- |
| `CARRY.minTirar`              | 0,45  | Por debajo del 45 % de frescura un hombre no cierra un hueco; es el orden de `helpBackMinFreshness` (0,35). |
| `CARRY.minCarta`              | 0,60  | Una carta que sale al 60 % ya no gana; el director lo ve y cambia.                                          |
| `CARRY.pesoObjetivo`          | 1,5   | El día D vale dos veces y media un día normal. **[calibrar]** contra el reparto de victorias por etapa.     |
| `CARRY.tocadoApetito`         | 0,45  | Menos de la mitad de ganas. Entre `reservon` (0,3) y `oportunista` (0,8).                                   |
| `CARRY.sinRitmoPerfil`        | 2,0   | Dos puntos de perfil son la mitad de `dropDeficitTolerance` (4): se nota y no descalifica.                  |
| `CARRY.jerseyCoste`           | 0,04  | Veintiún días × 0,04 = 0,84 del presupuesto de carrera: defender el jersey tres semanas te deja sin equipo. |
| `CARRY.dnsPorEnfermedad`      | 0,35  | Con enfermedad grado 2, uno de cada tres no sale. Ancla: `illnessPct` 20-67 % de las causas de abandono.    |
| `CARRY.retiradaPorOrden`      | 0,08  | Poco: es una decisión rara y visible.                                                                       |
| `CARRY.recuperacionSemietapa` | 0,35  | Cuatro horas entre sectores contra doce de noche.                                                           |

**Cómo se mide.** `weekThreeShape` — reparto de `finishScoreAqui` de los diez mejores en la semana 3
contra la semana 1 en `grandTour`; hoy la diferencia la produce solo la fatiga física, tiene que
producirla también el reparto de papeles. `jerseyTeamDecay` — km al frente del equipo del maillot
por semana; objetivo **estrictamente decreciente**. Banco: `grandTour` (12 vueltas, ya existe).

---

### R09 · Las deudas y el humor del pelotón · 21 situaciones

**La pieza.** El **libro del director** (`DirectorLedger`): memoria colectiva entre etapas, con
nombre y con caducidad. Es lo que el dueño pidió cuando dijo «al que ganó ayer no le dejan ir», y es
la deuda que `docs/tactica.md` reconoce como abierta («hoy el motor no arrastra NADA de un día para
otro en lo táctico»).

**Las reglas.**

1. **El libro.**
   ```ts
   interface DirectorLedger {
     ganoAyer: Map<riderId, dia> // S-423
     fugoAyer: Map<riderId, dia> // S-046, S-076
     noRelevo: Map<riderId, { dia; veces }> // S-081, S-413
     seFundio: Map<teamId, dia>
     yaGanamos: boolean
     yaGanaronEllos: Set<teamId> // S-397
     deudaCon: Map<teamId, number> // [-1,1] alianzas y traiciones   S-174/175
     rivalidad: Map<teamId, number> // estructural, no caduca         S-404
     planFallido: { dia; que } | null // S-403
   }
   ```
   **Todo caduca salvo `rivalidad`**: `LIBRO.caducidadDias` = 3 para lo personal (quién ganó, quién
   no relevó) y 1 para `fugoAyer`. Es la respuesta a la pregunta 1 del dueño en `docs/tactica.md`
   §7: dura unos días, no toda la vuelta.
2. **Al que ganó ayer se le mira (S-423, S-401).** `+LIBRO.marcaAlGanador` (0,35) al `Peligro.cuanto`
   de ese hombre para todos los demás equipos, y `−LIBRO.wAyer` a su voto de aduana (ya en R03).
   Efecto observable: le siguen más cuando ataca y le dejan menos irse.
3. **El que no releva hoy porque el otro no relevó ayer (S-081, S-413).** `deudaCon` entre corredores
   dentro del `RiderAgent`: si `noRelevo[rival] ≥ 1` y estamos en el mismo grupo pequeño,
   `deber(yo) −= LIBRO.cobroDeDeuda` (0,6) mientras él esté en el turno. Es contagioso por
   construcción: si dos dejan de relevar, el compromiso del grupo cae y el pasajero se queda sin
   nada que aprovechar.
4. **El equipo que dejó escapar la fuga ayer la persigue hoy desde el km 0 (S-106).** Si
   `motivoActivo == 'etapa'` y ayer se perdió la etapa por una fuga, `claim` de hoy
   `× LIBRO.revanchaClaim` (1,4) durante los primeros `LIBRO.revanchaKm` (60 km).
5. **El humor del día, con causa (S-224, S-234, S-422, S-424, S-427, S-484).** Hoy es un dado
   (`pelotonMoodCentre` 0,9, `pelotonMoodSpread` 0,14). Se conserva el dado y se le **suman causas**:
   ```
   humor = clamp( N(PELOTON.moodCentre, PELOTON.moodSpread)
                + LIBRO.visperaReina      · [mañana hay reina]        # −0,10
                + LIBRO.resacaReina       · [ayer hubo reina]         # −0,12
                + LIBRO.trasDescanso      · [ayer fue descanso]       # −0,06 (arrancan dormidos)
                + LIBRO.visperaDescanso   · [mañana hay descanso]     # +0,08 (a por todas)
                + LIBRO.trasladoLargo     · [viaje > 250 km anoche]   # −0,07
                + LIBRO.sinMotivo         · [Σ motivos activos = 0]   # −0,15
                , 0.55, 1.15 )
   ```
   Los seis números son **[calibrar]** salvo el signo, que es doctrina de carretera. Y el humor
   **se narra con su causa**, que es lo que hoy falta: un pelotón lento sin explicación es un
   defecto de crónica.
6. **Rivalidad estructural (S-404) y reparto tácito (S-408).** `rivalidad[a][b]` alto → los dos
   equipos nunca entran juntos en una alianza (R20) y se marcan más. `reparto tácito`: en la Mesa, si
   varios equipos tienen motivo `combatividad`/`patrocinador`, el que **menos veces** ha ido delante
   esta carrera gana la prioridad de cupo. Es un `argmin` sobre el libro, y produce solo la rotación
   que en carretera se ve.
7. **El pacto de no agresión y el trato dentro de la fuga (S-426, S-453).** Una `Promesa` es un
   objeto con dos partes y una condición: `{de, a, tipo: 'no_disputo'|'no_ataco', hastaKm}`. Se emite
   cuando dos corredores llevan `PULSO.promesaKm` (25 km) colaborando en un grupo pequeño y sus
   motivos no chocan (uno va por la etapa, el otro por la montaña). Romperla es posible y **se anota
   en el libro de los dos equipos**: es la única forma de que traicionar signifique algo.
8. **El sprinter que falló ayer (S-354) y la revancha del director (S-403).** `moral` del corredor
   baja; el director sube el riesgo del tren (`lanza antes`, `LIBRO.revanchaLanzamiento` −25 m sobre
   `sprintHoldMetres`). Sale bien o sale mal, que es el punto.

**Cierra.** `S-046`, `S-081`, `S-106`, `S-224`, `S-229`, `S-234`, `S-354`, `S-397`, `S-401`, `S-402`,
`S-403`, `S-404`, `S-408`, `S-413`, `S-422`, `S-423`, `S-424`, `S-426`, `S-427`, `S-453`, `S-484`.

**Constantes nuevas.**

| Constante                   | Valor | Por qué                                                                                                                                                |
| --------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `LIBRO.caducidadDias`       | 3     | «¿Cuánto dura eso, un día o toda la vuelta?» → tres días. Se marca al que ganó anteayer y se olvida al de la semana pasada. **[decisión del dueño 2]** |
| `LIBRO.marcaAlGanador`      | 0,35  | Un tercio más de peligro percibido. Suficiente para que se le siga y no tanto como para que no pueda volver a ganar.                                   |
| `LIBRO.cobroDeDeuda`        | 0,6   | Es el mismo orden que `relayDutyPaceRelief` (0,6): quita a alguien del turno sin hacerlo imposible.                                                    |
| `LIBRO.revanchaClaim`       | 1,4   | Mismo orden que `teamAttackFree` (1,4). Rima a propósito: es la misma clase de empujón.                                                                |
| `LIBRO.revanchaKm`          | 60 km | Un tercio de etapa: si a esas alturas no ha cuajado, se corre como siempre.                                                                            |
| `PULSO.promesaKm`           | 25 km | El tiempo que hace falta para entenderse con alguien. Es `giveUpKm` (25) por rima, no por derivación.                                                  |
| `LIBRO.revanchaLanzamiento` | −25 m | Un octavo del `sprintHoldBase` (200 m): abrir antes es arriesgar, y se nota.                                                                           |

**Cómo se mide.** `winnerRepeatConsecutive` — % de etapas consecutivas de la misma carrera con el
mismo ganador. **Ojo, dato incómodo**: el banco mide hoy **1,8 %** (1 de 57) y el dueño ve mucho más;
`docs/tactica.md` §4 concluye que el defecto vive en producción y no en el banco. La banda propuesta
es **0-8 %** y se mide **en la carrera pequeña**, que es donde vive el defecto, no en la gran vuelta.
`moodCause` — % de etapas con humor < 0,8 que traen causa nombrada: **100 %** (invariante).
`ledgerEffect` — brecha entre el apetito de fuga del que fugó ayer y el de sus compañeros:
objetivo **≤ 0,5×**.

---

### R10 · El plan de varios días · 12 situaciones

**La pieza.** Un **objetivo de carrera por equipo** con **presupuesto repartido por etapas**, y la
corrección del plan leyendo lo de ayer. Vive en el `DirectorSeat` y se decide en la convocatoria.

**Las reglas.**

1. **El objetivo (S-022, S-028).**
   ```ts
   interface ObjetivoDeCarrera {
     motivoPrincipal: Motivo
     hombre: riderId | null
     diasMarcados: number[] // las etapas donde se juega
     presupuestoCarrera: number // unidades de trabajo al frente
     ambicion: 'ganar' | 'podio' | 'top10' | 'una_etapa' | 'estar'
   }
   ```
   Lo fija el director en la convocatoria a partir de la estructura (§5) y del recorrido.
2. **Los días marcados (S-405, S-386, S-387, S-394).**
   ```
   valorDelDia(s, objetivo) = w_terreno · afinidad(hombre, finalPrevisto(s))
                            + w_diferencias · diferenciasEsperadas(s)
                            + w_ultima · [es de las últimas y aún hay diferencias]
   diasMarcados = top-K por valorDelDia, K = ceil(dias · PLAN.fraccionMarcada)   # 0,25
   ```
   De ahí salen solos: la crono dentro del plan (S-382), «la general se hace en la crono y las
   etapas en línea son de trámite controlado» (S-386), y **la penúltima etapa antes de la crono**
   (S-394): un mal cronista con la crono marcada como día de **pérdida** marca la víspera como día
   de **ataque**. Eso es el argmax funcionando, no un caso especial.
3. **La víspera y el día después (S-387, S-424, S-427).** `pesoDelDia` (R08 §3) baja a
   `PLAN.visperaFactor` (0,7) el día anterior a uno marcado y a `PLAN.resacaFactor` (0,8) el
   siguiente. Con eso el equipo llega con hombres al día que le importa, y hoy no.
4. **El día después de perder tiempo: atacar mañana (S-376, `CONTRARIO`).** Si el hombre de la
   general perdió más de `PLAN.perdidaQueObliga` (60 s) ayer y aún quedan días marcados,
   `ambicion` no baja: sube el apetito (`× PLAN.obligadoAAtacar` 1,6) y el equipo pasa de
   `controlar` a `perseguir`/`atacar`. Hoy el motor hace lo contrario: el que va peor ataca menos.
5. **El día en que el líder se rompe: cambio de jefe (S-409, S-190).** Si la carta de general pierde
   más de `PLAN.perdidaQueDestituye` (240 s) o abandona, el director **hereda la carta** al mejor de
   los que quedan y **libera los papeles dependientes**: los gregarios pasan a `libre` o a gregarios
   del nuevo. Se emite `team_new_leader` en la crónica. Es un cambio de estado del `DirectorSeat`,
   no de la etapa.
6. **La moral después de ganar o de fallar (S-384).** Ganar sube `moral` del equipo entero
   (`+PLAN.moralVictoria` 0,12), fallar el objetivo del día lo baja (`−0,08`). La moral entra en
   `presupuesto` (`× (0,9 + 0,2·moral)`) y en el apetito. Es el único sitio donde la moral hace algo
   táctico, y es deliberadamente pequeño.
7. **El humano corrige el plan leyendo la crónica (S-420).** Ver §6.

**Cierra.** `S-022`, `S-028`, `S-055`, `S-376`, `S-382`, `S-384`, `S-386`, `S-387`, `S-394`,
`S-405`, `S-409`, `S-420`.

**Constantes nuevas.**

| Constante                  | Valor | Por qué                                                                                                            |
| -------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------ |
| `PLAN.fraccionMarcada`     | 0,25  | Cinco días de veintiuno, dos de ocho. Marcar más es no marcar nada.                                                |
| `PLAN.visperaFactor`       | 0,70  | Se guarda casi un tercio. **[calibrar]** contra `wonFromMovePct` de la víspera de las reinas.                      |
| `PLAN.resacaFactor`        | 0,80  | Menos que la víspera: el día después se corre, pero mal.                                                           |
| `PLAN.perdidaQueObliga`    | 60 s  | Un minuto es la diferencia que obliga a mover una vuelta de una semana. **[calibrar]** por formato.                |
| `PLAN.perdidaQueDestituye` | 240 s | Cuatro minutos: fuera del `gcThreatFraction·gcControlLeash` = 420 s de hoy, con margen para volver si hay montaña. |
| `PLAN.obligadoAAtacar`     | 1,6   | El mismo que `MENTALITY_APPETITE['supercombativo']`: el que va perdiendo corre como un supercombativo.             |
| `PLAN.moralVictoria`       | 0,12  | Pequeño a propósito: la moral no puede ser una segunda física.                                                     |

**Cómo se mide.** `markedDayShare` — fracción del presupuesto de carrera gastada en días marcados;
objetivo **≥ 0,40** con `fraccionMarcada` 0,25 (o sea: se gasta más donde importa). `lostTimeReaction`
— apetito de ataque del hombre de general el día después de perder ≥ 60 s, contra su media; objetivo
**≥ 1,3×** (hoy es < 1). Banco: `grandTour` y `smallTours`.

---

### R11 · Percances mecánicos y el coche de equipo · 10 situaciones

**La pieza.** El **pinchazo y la avería como sucesos de primera clase**, y **la caravana** como
recurso con orden. Los diez están `AUSENTE`: es el racimo más limpio del catálogo, no hay nada que
desmontar.

**Las reglas.**

1. **El suceso.**
   ```ts
   interface Percance {
     riderId: string
     km: number
     tipo: 'pinchazo' | 'averia' | 'rueda_cedida'
     paradaS: number // lo que se pierde de golpe
     asistidoEnKm: number // cuándo le llega el coche
   }
   ```
   `P(pinchazo por km)` = `MECA.lambdaBase` × factor de terreno (`llano` 1, `paves` 4,5, `tierra` 3,
   `subida` 0,8) × `(1 + MECA.lluviaFactor · lluvia)`. `MECA.lambdaBase` = **0,00035/km**: en una
   etapa de 200 km da 0,07 pinchazos por corredor, o sea **≈ 12 pinchazos en un pelotón de 176**,
   que es lo que se ve en una etapa normal. En un pavé de 30 km sube a ≈ 0,047 por corredor sobre ese
   tramo, ≈ 8 en el sector, que también es lo que se ve.
2. **La caravana (S-222, S-435).** El orden de los coches es **el orden de la general por equipos**,
   con el coche del maillot primero. De ahí sale el tiempo de asistencia:
   ```
   esperaS(m) = MECA.esperaBase
              + MECA.esperaPorPuesto · puestoEnLaCaravana(equipoDe(m))
              + MECA.esperaSiVaDelante · [va en un grupo escapado]
              + MECA.esperaSiVaAtras · [va en la cola del pelotón]
   ```
   `MECA.esperaBase` 18 s, `esperaPorPuesto` 1,2 s (con 22 equipos, hasta 26 s de diferencia entre el
   primero y el último: real y significativo), `esperaSiVaDelante` +35 s (el coche está detrás del
   pelotón), `esperaSiVaAtras` +10 s.
   El «ascensor» de los coches (S-435): volver a rebufo de la caravana da
   `MECA.ascensorFactor` (1,18) sobre la velocidad de cierre durante `MECA.ascensorKm` (3 km), y
   **solo si el hueco es < 90 s** (con más, ya no hay caravana que te lleve).
3. **La bici del gregario (S-201).** Si un compañero de la misma casa va a ≤ `MECA.cesionGapS` (15 s)
   y el afectado es la carta, el gregario **cede la bici**: la parada del jefe baja a
   `MECA.paradaConCesion` (12 s) y el gregario se lleva la del jefe con
   `esperaS` completa. Es la jugada más bonita del ciclismo y hoy no existe.
4. **Dónde te pilla (S-283, S-298, S-111).** El coste no es la parada: es **dónde**. Un pinchazo en
   el adoquín, en un abanico o en el tirón final cuesta la parada **más** todo el hueco que se abre
   mientras vuelve, y eso ya lo calcula la física sola en cuanto el suceso existe. El del favorito en
   el último puerto (S-298) es la parada + el hecho de que ahí no hay caravana que valga: se le suma
   `MECA.esperaSiVaDelante`.
5. **La crono (S-127, S-202, S-436).** `simulateTimeTrial` devuelve hoy `incidents: []`, lo que hace
   que **el corte de la crono (0,25) sea «una salvaguarda dormida»** (deuda 10 del §14). Con
   percances: pinchazo con `MECA.cronoParada` (35 s, la bici de repuesto está en el techo del coche),
   caída con parada mayor, y el cambio de bici planeado en la crono mixta (S-436) como decisión del
   director: `cambiarEnKm` si hay un puerto largo. Eso despierta la salvaguarda.
6. **La regla del favorito, que ya existe, se dispara sola.** `helpBack` ya mira `mishapKm` y su
   comentario dice literalmente «cuando existan, marcan aquí y esta regla los ve sola». No hay que
   tocarla.

**Cierra.** `S-111`, `S-127`, `S-146`, `S-192`, `S-201`, `S-202`, `S-222`, `S-283`, `S-298`, `S-435`.

**Constantes nuevas.** `MECA.lambdaBase` 0,00035/km, `MECA.terrenoFactor` {llano 1, paves 4,5,
tierra 3, subida 0,8, descenso 1,2}, `MECA.lluviaFactor` 0,6, `MECA.esperaBase` 18 s,
`MECA.esperaPorPuesto` 1,2 s, `MECA.esperaSiVaDelante` 35 s, `MECA.esperaSiVaAtras` 10 s,
`MECA.ascensorFactor` 1,18, `MECA.ascensorKm` 3, `MECA.cesionGapS` 15 s, `MECA.paradaConCesion` 12 s,
`MECA.cronoParada` 35 s. Todos **[calibrar]** salvo `lambdaBase` y los factores de terreno, que salen
de la cuenta de arriba.

**Cómo se mide.** `mishapsPerStage` — pinchazos + averías por etapa: objetivo **6-20** en llano,
**12-35** en pavé. `mishapCostByPosition` — segundos perdidos medianos según el equipo vaya primero o
último en la caravana: objetivo **≥ 15 s de diferencia** (si no, la caravana no sirve de nada).
`ttIncidents` — que el corte de la crono deje de ser una salvaguarda dormida: **> 0 incidentes** en
las 5 cronos reales del banco. Banco: invariante 44 (pavé, ya existe) + `timeTrials`.

---

### R12 · Caídas: la tregua, el rescate y el tiempo · 18 situaciones

**La pieza.** La caída como suceso **con radio**, la **tregua condicional** decidida en la Mesa, el
**rescate escalonado** decidido por el director, y —debajo de todo— **la noticia que llega tarde**
(§3.3), que es sobre lo que se decide todo eso.

**Las reglas.**

1. **La noticia (S-478).** Ya definida: `DIR.noticiaLagKm` 1,4 km, escalado. Consecuencia inmediata:
   la tregua no empieza en el km del suceso, empieza uno o dos kilómetros después, y **hay quien no
   se entera**. Eso es «la mitad de las decisiones de ese minuto se toman sin saber quién está en el
   suelo».
2. **La tregua (S-237), en la Mesa.**
   ```
   pidenTregua = equipos que (a) tienen a su carta implicada y (b) se han enterado
   apoyan      = equipos sin ventaja que sacar y sin motivo urgente
   tregua = Σ peso(apoyan) / Σ peso(todos) > CAIDA.umbralTregua        # 0,55
          ∧ fase ∉ {aproximacion, decisivo, desenlace}                 # S-297: en el desenlace no hay tregua
          ∧ kmToGo > CAIDA.treguaMinKmToGo                             # 25 km
   ```
   Con tregua: `compromiso` del pelotón se topa en `CAIDA.treguaCommit` (0,45) durante
   `CAIDA.treguaKm` (5 km) o hasta que el afectado vuelva.
3. **La emboscada (S-195, `AUSENTE`).** Y el otro lado: un equipo con `rivalidad` alta o con motivo
   urgente puede **votar en contra y apretar**. `apretar` = `compromiso += CAIDA.emboscada` (0,12)
   mientras el rival esté cortado. Que la tregua se pueda romper es lo que la hace interesante; que
   se rompa **a veces** es lo que la hace creíble.
4. **El rescate escalonado (S-290, S-198, S-145).** `helpBack` ya existe y está bien; lo que le falta
   es **escalón**:
   ```
   cuantosBajan(e) = clamp(round( CAIDA.bajanBase
                                + CAIDA.bajanPorGap · (gap / 60)
                                + CAIDA.bajanSiEsLaCarta · [es la carta de general] ), 0, disponibles − 1)
   ```
   `bajanBase` 1, `bajanPorGap` 0,8/min, `bajanSiEsLaCarta` 1,5. Con el jefe a 2 min bajan 1+1,6+1,5
   ≈ 4 hombres, que es lo que el dueño describió: «puede justificar descolgar a todo el equipo menos
   1». Y con 20 s baja uno.
5. **El compañero que se para con el caído (S-145).** Distinto del rescate: si el caído está en el
   suelo (`hurt ≠ null`), un compañero **se para** (`paraS = CAIDA.paradaCompanero` 25 s) y luego le
   lleva. Solo si `motivoActivo` lo justifica o el caído es la carta.
6. **La regla de los 3 km (S-374).** Caída, corte o abanico dentro de los últimos 3 km: mismo tiempo
   que el grupo en el que iba. Es una regla del reglamento, no de calibración: se implementa tal cual.
7. **La caída masiva (S-251) y el taponamiento (S-466).** El montón hoy es «una tirada contigua de la
   lista» porque no hay posiciones dentro del grupo. Con R15 (`posicion`) el radio pasa a ser
   posicional de verdad: afecta a los que van entre `pos ± CAIDA.radioPuestos` (8). Y en un sector
   estrecho (`carretera.ancho == 'estrecha'`) se añade **pie a tierra**: los de detrás pierden
   `CAIDA.pieATierra` (20 s) sin caerse.
8. **La cola (S-213) y el que no pinta nada.** Una caída en la cola no genera tregua ni rescate: no
   se entera nadie. Sale solo de (1) y (2).

**Cierra.** `S-110`, `S-145`, `S-156`, `S-195`, `S-198`, `S-199`, `S-200`, `S-213`, `S-237`,
`S-251`, `S-252`, `S-290`, `S-297`, `S-374`, `S-435`, `S-456`, `S-466`, `S-478`.

**Constantes nuevas.**

| Constante                | Valor   | Por qué                                                                                                 |
| ------------------------ | ------- | ------------------------------------------------------------------------------------------------------- |
| `CAIDA.umbralTregua`     | 0,55    | Mayoría simple con margen: la tregua es un acuerdo, no una unanimidad.                                  |
| `CAIDA.treguaMinKmToGo`  | 25 km   | El mismo `giveUpKm`: dentro de los últimos 25 km la carrera ya está lanzada y no se para. **Derivado.** |
| `CAIDA.treguaCommit`     | 0,45    | Por debajo de `pelotonTempoCommit` (0,55): se afloja de verdad y no se para del todo.                   |
| `CAIDA.treguaKm`         | 5 km    | Siete minutos de carrera: lo que tarda un equipo en llevar a su hombre de vuelta.                       |
| `CAIDA.emboscada`        | 0,12    | Un décimo largo de compromiso: se nota en el hueco y no es una caza.                                    |
| `CAIDA.bajanBase`        | 1       | Siempre baja alguien.                                                                                   |
| `CAIDA.bajanPorGap`      | 0,8/min | Con cuatro minutos bajan tres más; con seis, el equipo entero. **[calibrar]**                           |
| `CAIDA.bajanSiEsLaCarta` | 1,5     | «Por la general, todos menos uno» (v36).                                                                |
| `CAIDA.paradaCompanero`  | 25 s    | Levantar a alguien y arrancar de nuevo.                                                                 |
| `CAIDA.radioPuestos`     | 8       | Los que van alrededor. Es el orden del `frontNamesMaxRiders` (8) por rima.                              |
| `CAIDA.pieATierra`       | 20 s    | Lo que cuesta parar y arrancar en un embudo.                                                            |

**Cómo se mide.** `truceLatencyKm` — km entre la caída y el primer bloque de tregua: objetivo
**0,8-2,5 km** (hoy sería 0). `truceBrokenPct` — % de treguas que alguien rompe: objetivo **8-25 %**
_(que exista y que no sea la norma)_. `rescueSize` — hombres que bajan según el hueco: tiene que ser
creciente. Banco: `grandTour` (que ya tiene caídas medidas) + carrera pequeña.

---

### R13 · Fatiga y hundimiento dentro de la etapa · 14 situaciones

**La pieza.** Siete de las catorce ya están `CUBIERTO` —la reserva, el cerillo en segundos, el ritmo
que marcan los de cabeza, la erosión por depósito—: **la moneda física ya está y no se toca**. Lo que
falta es que **el hundimiento sea observable y que los demás reaccionen**.

**Las reglas.**

1. **El estado observable.** `SenalDeRival.sube` (§3.2) sale de la física que ya hay:
   ```
   sube(m) = driftS > 0                          ? 'derivando'
           : reserveFraction < 0.25              ? 'de_pie'
           : 'sentado'
   ```
   Es gratis: los tres datos ya existen en `RiderSim`. Lo nuevo es exponerlo **con error y con
   disimulo** (§3.2).
2. **Huele la sangre (S-319, S-269).** Hoy S-269 es `CONTRARIO`: «cuando el líder cede, sus rivales
   deberían atacar más, y hoy atacan menos». La regla:
   ```
   olorASangre(r, grupo) = max sobre rivales v de Peligro:
        clamp( (1 − frescuraEstimada(v)) · relevancia(v, r) )
   relevancia(v, r) = 1 si v es el defensor de general o la mejor carta del grupo; 0,4 si no
   apetito(r) *= 1 + FATIGA.sangreBoost · olorASangre(r, grupo)      # 0,85
   ```
   Y el freno del defensor (`gcDefendShare`) **se apaga cuando el defensor es el que flaquea**: un
   maillot derivando ya no «se sienta», está sufriendo, y los otros atacan.
   `FATIGA.sangreBoost` = 0,85: casi duplica el apetito contra un rival visiblemente roto. Es el
   mismo orden que `tacticGcStakeWeight` (0,8), que es el bonus más grande que hoy existe.
3. **El jefe descolgado (S-288).** `esperaA` (R01 §5) más la decisión del capitán de ruta: quién se
   queda y quién sigue. Regla: se queda el de **menor** `finishScoreAqui` entre los que pueden
   (el que menos pierde quedándose), y siguen los demás.
4. **La pájara del gregario (S-206) y la del que no se avitualla (S-147).** Las dos son la misma
   pieza: `avituallamiento` como decisión del `RiderAgent` en las zonas del recorrido (S-226) y
   `P(pájara)` que sube si no se avitualló en las tres primeras horas. **Es física, no táctica**: se
   deja anotado como frontera con el diseño de entrenamiento y aquí solo se consume el resultado.
5. **Frío, lluvia y descenso largo (S-148).** `DES` efectivo baja `FATIGA.frioDES` (6 puntos) tras
   `FATIGA.frioMinutos` (25 min) de descenso con lluvia. Es una línea y cierra una fila `AUSENTE`.
6. **El que deriva sale del cálculo del ritmo.** Ya está (`paceSetters`, S-461 `CUBIERTO`). Se
   confirma y no se toca.

**Cierra.** `S-112`, `S-147`, `S-148`, `S-206`, `S-260`, `S-269`, `S-277`, `S-288`, `S-319`,
`S-454`, `S-455`, `S-461`, `S-467`, `S-475`.

**Constantes nuevas.** `FATIGA.sangreBoost` 0,85, `FATIGA.frioDES` 6, `FATIGA.frioMinutos` 25.
Las tres **[calibrar]**; la primera contra `attackDecidedPct` del banco de final en alto.

**Cómo se mide.** `bloodSmellAttacks` — % de ataques del último puerto que se lanzan dentro de los
2 km siguientes a que un favorito empiece a derivar. Hoy tiene que ser ≈ el azar; objetivo
**≥ 2× el azar**. `leaderCracksStage` — de las etapas en que el maillot pierde ≥ 60 s, % en que
además pierde ≥ 120 s (el remate del herido): objetivo **≥ 35 %**. Banco: `realQueens`,
`analyzeUphillFinish` (que ya existe sin banda y pasa a tenerla).

---

### R14 · Meteorología con previsión · 12 situaciones

**La pieza.** El **parte meteorológico** como estado del día, **anunciado antes de la etapa** y
citable por las órdenes. Hoy el clima existe (`stageWeather`) pero es un dado que nadie ve venir, y
la pantalla de órdenes **ya enseña una previsión con fiabilidad** que el motor no usa: es una promesa
rota (S-032, `CONTRARIO`).

**Las reglas.**

1. **El parte.**
   ```ts
   interface ParteMeteorologico {
     vientoKmh: number
     vientoDireccion: 'cara' | 'cola' | 'lateral' | 'variable'
     lluvia: number
     calor: number
     frio: number
     fiabilidad: number // [0,1], la que la pantalla ya enseña
     cambioEnKm: number | null // S-205: la tormenta que llega a mitad
   }
   ```
   El motor lo recibe **completo**; el director lo recibe **con el error de la fiabilidad**:
   `creido = real + N(0, (1 − fiabilidad) · METEO.sigma)`. Así el jugador y el director bot ven lo
   mismo, que es lo justo.
2. **Viento de cara y de cola (S-203).** Hoy solo existe el lateral. Cara: `+METEO.caraCoste` (0,12)
   al coste del que va al frente y `×1,18` al rebufo (a rueda se ahorra más). Cola: lo contrario, y
   **abanicos imposibles**. Efecto táctico inmediato: con viento de cara la fuga no se va, con viento
   de cola no se caza. Es un factor sobre `blockCost`, no una ley nueva.
3. **El plan cambia con el parte (S-204, S-238, S-281, S-299).** El director lo lee al repartir:
   lluvia alta → más gregarios de colocación y menos ataque temprano; calor extremo → `humor` baja y
   el frente pesa más; descenso final con lluvia → el bajador (S-465) sube de valor.
4. **El abanico que se cierra (S-324, `CONTRARIO`).** Hoy «el abanico no se cierra nunca (el viento
   sopla todo el día)». Con `vientoDireccion` por bloque —derivado de la orientación del tramo, que
   el recorrido ya tiene implícita— el lateral **cambia**, y con él `cabenEnFila`. Cuando el viento
   deja de ser lateral, `abanicoAbierto = false` y hay reenganche.
5. **La tormenta a mitad (S-205) y la etapa acortada (S-037).** `cambioEnKm` reescribe el parte en
   carretera; la etapa acortada es una decisión de organización (R28) que reescribe `totalKm` y
   dispara un replan de todos los directores.
6. **El material del día (S-430).** Decisión del director en la convocatoria del día:
   `material ∈ {normal, ruedas_altas, presion_baja, desarrollo_corto}` con efectos pequeños
   (±2 puntos de `LLA`/`PAV`/`MON`). Es barato, es visible en la crónica y da textura.
7. **La lotería del horario en la crono (S-462).** Con `cambioEnKm` y orden de salida, los que salen
   a una hora corren con otro parte. Es exactamente lo mismo que (5) aplicado a `simulateTimeTrial`.

**Cierra.** `S-032`, `S-037`, `S-203`, `S-204`, `S-205`, `S-238`, `S-281`, `S-299`, `S-324`,
`S-325`, `S-430`, `S-462`.

**Constantes nuevas.** `METEO.sigma` 0,25 (la incertidumbre a fiabilidad 0), `METEO.caraCoste` 0,12,
`METEO.caraRebufo` 1,18, `METEO.colaCoste` −0,10, `METEO.tormentaP` 0,08 (probabilidad de cambio a
mitad), `METEO.materialEfecto` 2 puntos. Todas **[calibrar]** salvo `METEO.sigma`, que sale de la
propia pantalla («a forecast this far out is closer to the local average than to the sky»).

**Cómo se mide.** `windDirectionEffect` — velocidad mediana del ganador con viento de cara contra
viento de cola: objetivo **≥ 3 km/h de diferencia**. `echelonCloses` — % de abanicos que se cierran
antes de meta: objetivo **30-70 %** (hoy 0 %). **Aviso**: la ceguera nº 21 del banco dice que
«viento, lluvia y calor están dentro del ruido» con 6 vueltas; estas dos estadísticas piden **12
vueltas o un banco dedicado**, y eso es coste de CI (§7.3).

---

### R15 · Colocación y posición como recurso · 25 situaciones

**La pieza.** Una **posición dentro del grupo** (`posicion ∈ [0,1]`, 0 = primera fila) por corredor,
que cuesta mantener, se pierde sola, y decide quién se queda cortado. Es el racimo más grande del
catálogo y el que hoy tiene el agujero más raro: el motor tiene abanicos, embudos, adoquines y
sprints, y **ningún corredor sabe dónde va**.

**Las reglas.**

1. **La posición.** Un solo escalar por corredor y grupo, actualizado cada kilómetro:
   ```
   posicion' = clamp( posicion
                    + POS.derivaPorKm                                  # 0,020: te vas atrás solo
                    − POS.gananciaPorEsfuerzo · esfuerzoDeColocar      # lo que gastes
                    − POS.gananciaPorGregario · gregariosColocando     # los tuyos te suben
                    + POS.ruido · U(−1,1) · (1 − TAC/150)              # el oficio
                    , 0, 1 )
   ```
   `esfuerzoDeColocar` cuesta depósito: `costeExtra = POS.costePorPuesto · Δposicion · size/50`. Con
   `POS.costePorPuesto` = 0,9 unidades por décima de posición en un grupo de 50, colocarse desde el
   puesto 120 hasta el 20 en una etapa cuesta lo que un cerillo largo. Es **el acordeón** (S-189) y
   es exactamente lo que el dueño describió.
2. **Mover a los tuyos cuesta kilómetros (S-489).** La orden «llevad al jefe delante» no se ejecuta
   en un bloque: `DIR.ordenLagKm` (§2.3) más un tiempo de ejecución
   `POS.ejecucionKm = 0,8 + 0,35 · hombresQueSeMueven`. Cuatro hombres tardan más de dos kilómetros
   en llegar al frente, y en esos dos kilómetros puede pasar cualquier cosa. Es la mitad del racimo
   R24 que vive aquí.
3. **La rueda que eliges (S-490).** En fila (viento, embudo, sector), tu velocidad **no es la tuya**:
   ```
   si enFila: perfilEfectivo(m) = min(perfil(m), perfil(delante(m)) + POS.tolerancia)   # 3 puntos
   ```
   `delante(m)` es el de `posicion` inmediatamente menor de tu grupo. Es una línea y explica media
   docena de situaciones: el fuerte encerrado, el sprinter encajonado (S-445), el que se queda
   cortado sin tener la culpa.
4. **El abanico como DECISIÓN (S-155, `CONTRARIO`, top-5 del catálogo).** Hoy el corte es un dado.
   Regla:
   ```
   rompeAbanico(e) = vientoLateral > POS.vientoMinimo (0,35)
                   ∧ llano ∧ hombresDelante(e) ≥ POS.hombresParaRomper (4)
                   ∧ posicionMedia(los suyos) < 0,25
                   ∧ leConviene(e)         # su carta está delante y la del rival no
   si rompeAbanico: compromiso = POS.abanicoCommit (0,95) y el corte se produce por AFORO
   ```
   El corte deja de ser un dado y pasa a ser: si alguien aprieta al frente y no cabéis, os quedáis
   fuera. El aforo (`cabenEnFila`, S-460) ya existe.
5. **Abrir el hueco a propósito (S-457).** El que va justo detrás del corte **puede no cerrarlo**:
   `noCierro(m) = miCartaEstáDelante ∧ laCartaDelRivalEstáDetrás`. Es la puerta que se abre a mano y
   es lo que hace que el abanico tenga autor.
6. **El pie de puerto y el sector (S-240, S-241, S-243, S-282).** `POS.aproximacionKm` (3 km) antes
   de un puerto o un sector: los equipos con motivo pujan por colocar, y el que llega mal **paga**:
   `driftS` inicial `= POS.malaEntradaS · posicion` (12 s × posición). Entrar el 100.º al pie de un
   puerto son 12 s regalados antes de empezar a subir, que es lo que pasa.
7. **Dos trenes por el mismo carril (S-481).** Si dos trenes lanzan a la vez y
   `carretera.ancho == 'estrecha'`, el segundo pierde `POS.trenAnulado` (0,4) de su efecto de
   lanzamiento. Hay sitio para uno.
8. **El último giro (S-446).** En la última curva o rotonda (dato del recorrido, `carretera.giros`),
   el orden de paso es el de `posicion` y **congela** la posición hasta meta: quien entra primero,
   sale primero. Es lo que decide un sprint técnico.
9. **El adoquín cobra posición, no piernas (S-480).** `selectionFactor` del pavé pasa a escalar con
   `posicion` en vez de con el perfil solo: `λ = base · (0,4 + 1,2 · posicion)`. El que va delante
   pasa; el que va 80.º, no. Y eso es lo que hace que colocar antes del sector valga la pena.
10. **El tramo de tierra (S-463) y el bajador (S-465).** Tierra: como pavé pero con `DES` en vez de
    `PAV` y sin caídas en cadena. Bajador: un gregario con `DES` alto y `encargo: 'bajar'` da
    `POS.bajadorTolerancia` (3 puntos de `DES` efectivo) a su jefe mientras vaya delante de él.
11. **El corredor en año de contrato (S-428).** `+POS.escaparate` (0,15) al apetito y `−0,1` al
    umbral de colocarse. Es un rasgo del corredor, no del equipo, y es de las pocas cosas que dan
    textura sin costar nada.

**Cierra.** `S-155`, `S-160`, `S-165`, `S-189`, `S-240`, `S-241`, `S-242`, `S-243`, `S-248`,
`S-252`, `S-254`, `S-282`, `S-369`, `S-428`, `S-430`, `S-446`, `S-457`, `S-460`, `S-463`, `S-465`,
`S-466`, `S-480`, `S-481`, `S-489`, `S-490`.

**Constantes nuevas.**

| Constante                 | Valor        | Por qué                                                                                                                     |
| ------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `POS.derivaPorKm`         | 0,020        | Sin hacer nada bajas 2 décimas cada 10 km: en 100 km pasas de la 10.ª fila a la cola. Es el acordeón. **[calibrar]**        |
| `POS.gananciaPorEsfuerzo` | 0,05         | Colocarse una décima cuesta dos kilómetros de esfuerzo.                                                                     |
| `POS.gananciaPorGregario` | 0,018        | Cada gregario colocando te sube casi una décima cada 5 km. Con cuatro hombres el jefe va delante siempre, y por eso cuesta. |
| `POS.ruido`               | 0,015        | El azar del pelotón, atenuado por `TAC`.                                                                                    |
| `POS.costePorPuesto`      | 0,9          | Ver arriba: subir 100 puestos ≈ un cerillo largo. **[calibrar]** contra el invariante 18 (el que releva se desgasta más).   |
| `POS.ejecucionKm`         | 0,8 + 0,35·n | Cuatro hombres = 2,2 km. Es lo que se ve en televisión.                                                                     |
| `POS.tolerancia`          | 3            | Casi el `dropDeficitTolerance` (4): en fila puedes ir un poco más rápido que el de delante y punto.                         |
| `POS.vientoMinimo`        | 0,35         | Por debajo no hay abanico que valga.                                                                                        |
| `POS.hombresParaRomper`   | 4            | Menos de cuatro no rompen nada. `relayMinPullers` = 4. **Derivado.**                                                        |
| `POS.abanicoCommit`       | 0,95         | Casi a tope: romper la carrera es un esfuerzo de veinte minutos.                                                            |
| `POS.aproximacionKm`      | 3 km         | Un poco más que la pancarta (2), porque un puerto importa más.                                                              |
| `POS.malaEntradaS`        | 12 s         | Es el `grupetoJoinGapSeconds` (12): el hueco mínimo que ya cuenta como estar en otro sitio. **Derivado.**                   |
| `POS.trenAnulado`         | 0,40         | El segundo tren pierde casi la mitad. **[calibrar]**                                                                        |
| `POS.bajadorTolerancia`   | 3            | Como `POS.tolerancia`: bajar a rueda de uno bueno es ir tres puntos por encima de lo tuyo.                                  |
| `POS.escaparate`          | 0,15         | Pequeño y visible.                                                                                                          |

**Nota de rendimiento.** Un escalar por corredor actualizado **una vez por km** son 176 × 200 =
35.200 operaciones por etapa, del orden de lo que ya cuesta `relayDuty`. La regla 3 (`la rueda que
eliges`) se aplica **solo en fila** (viento, sector, embudo), que es una fracción pequeña de los
bloques. No es un problema.

**Cómo se mide.** `placementCostShare` — fracción del gasto total del pelotón que se va en colocar;
objetivo **5-15 %** _(si es 0 la posición es gratis; si pasa del 15 % la etapa se decide por
colocarse, que tampoco)_. `echelonAuthored` — % de cortes de abanico con equipo autor identificado;
objetivo **≥ 60 %** (hoy 0 %). `pavePositionEffect` — correlación entre posición al entrar al sector
y perder el grupo; objetivo **≥ 0,45**. Banco: invariante 44 (pavé), `race-flanders`, carrera pequeña.

---

### R16 · El tren de sprint como submotor de 15 km · 14 situaciones

**La pieza.** Un **tren con varios lanzadores encadenados** desde los 15 km, con ascensos cuando uno
se cae, con cuenta de cuántos trenes hay y de quién son, y con los trenes estorbándose. Once de las
catorce están `PARCIAL`: hay mucho construido, falta la cadena.

**Las reglas.**

1. **El tren como objeto.**
   ```ts
   interface Tren {
     teamId: string
     sprinterId: string
     cadena: string[] // lanzadores en orden de relevo, del primero al último
     activoDesdeKm: number
     estado: 'formando' | 'lanzando' | 'roto'
   }
   ```
   Se forma a `TREN.formacionKm` (15 km, = `finalDriveKm`) si el equipo tiene motivo `etapa`, final
   masivo previsto y ≥ 2 hombres además del sprinter.
2. **Los relevos encadenados (S-351).** Cada lanzador tira `TREN.turnoKm` (2,5 km para el primero,
   decreciendo un 35 % cada eslabón: 2,5 / 1,6 / 1,0 / 0,7) y se aparta. El último entrega en
   `sprintHoldMetres`, que ya está calibrado.
3. **Los ascensos (S-356).** Si un eslabón se funde, se descuelga o se cae, **el siguiente asciende**
   y el tren sigue con uno menos. Si quedan cero, `estado = 'roto'` y el sprinter queda a rueda
   (S-337: se pega al tren del rival, con `TREN.pegarseCoste` de posición).
4. **Cuántos trenes y de quién (S-355).** Ya se cuenta (`sprintRegimeKmh` con `trenes`); lo que falta
   es que la cuenta sea **por equipo** y salga a la crónica y a la radio.
5. **Dos cartas y un final ambiguo (S-291, S-185).** Con `sprinter_y_escalador` o `maillot + velocista`
   en la misma casa, el director elige **a quién se lanza** en el tic de los 15 km, con el final
   previsto ya calculado por grupo (R17), y **paga por elegir**: el que no recibe el tren pierde
   `CASA.cartaNoElegida` (0,05 de `score`). Que elegir cueste es lo que hace que la decisión importe.
6. **El sprinter sin equipo (S-338).** Agente libre: sin tren, `launchSd` completo y `sesgo −55 m`.
   Ya está en el modelo; solo hay que no darle tren por accidente.
7. **Dos trenes por el mismo carril (S-481).** Ver R15 §7.
8. **El encajonado (S-445).** Ver R15 §3: `posicion` + `POS.tolerancia`. Con eso, «perder sin que te
   ganen» ocurre solo.
9. **El arrastre a meta (S-342).** Falso llano ascendente en los últimos km: `finishType` ya lo puede
   ver (`avgGradient` de los últimos 5 km); lo que falta es que `finishWeights['sprint_masivo']`
   ceda hacia `sprint_reducido` de forma continua con la pendiente en vez de a saltos. **Se propone
   como interpolación, no como peso nuevo**: `w = lerp(masivo, reducido, clamp(avgGradient/3))`.

**Cierra.** `S-185`, `S-291`, `S-337`, `S-338`, `S-342`, `S-346`, `S-347`, `S-348`, `S-351`,
`S-355`, `S-356`, `S-372`, `S-445`, `S-481`.

**Constantes nuevas.** `TREN.formacionKm` 15 (= `finalDriveKm`, **derivado**), `TREN.turnoKm`
[2,5 / 1,6 / 1,0 / 0,7] (decrecimiento 0,65, porque cada eslabón va más rápido y dura menos: es la
misma lógica que el cerillo en segundos), `TREN.pegarseCoste` 0,12 de posición,
`CASA.cartaNoElegida` 0,05.

**Cómo se mide.** `trainChainLength` — eslabones que llegan a entregar, mediana; objetivo **2-4**.
`trainSurvival` — % de trenes formados que llegan enteros: objetivo **45-80 %**. `sprintByTrain` — %
de sprints masivos que gana un sprinter con tren completo: objetivo **50-75 %** _(por debajo el tren
no sirve; por encima el sprint lo decide el equipo y no el hombre)_. Banco: `grandTourSprintField` y
`proSprintField`, que **ya existen en `sim/tactics.ts` sin banda ni CI** (ceguera nº 19) y pasan a
tener las dos.

---

### R17 · El tipo de final se calcula por grupo · 16 situaciones

**La pieza.** Un **clasificador del último kilómetro por GRUPO**, con confianza, del que cuelgan
quién abre, a cuántos metros y quién gana. `finishType(terrain, groupSize)` ya se calcula por grupo
en `finishStage`; lo que falta es que **se calcule también durante la etapa** y que **el reparto de
papeles salga de él** y no de la etiqueta.

**Las reglas.**

1. **El final previsto, con confianza.**
   ```
   finalPrevisto(grupo, km) = finishType(finishTerrain, tamañoPrevisto(grupo, km))
   tamañoPrevisto(g, km)    = g.size · (1 − FIN.cribaEsperada(terrenoQueQueda))
   finalConfianza(km)       = clamp(1 − kmToGo / FIN.horizonteKm, 0.15, 1)     # 60 km
   ```
   `FIN.cribaEsperada` sale del propio recorrido: km de puerto que quedan × pendiente media. No hace
   falta simular hacia delante; es una tabla.
2. **La carta y los papeles salen del final REAL (S-049, `CONTRARIO`; S-047, top-5 del catálogo).**
   `autoOrders` deja de recibir `kind: 'llana'|'media'|'reina'` y pasa a recibir
   `{finishTerrain, finalPrevistoDelPeloton, ultimaCimaAMetaKm, kmSubida/total, timeTrial}`. Es el
   cambio que rompe la cadena «etiqueta → papel» y arregla de golpe la media montaña (S-052,
   `CONTRARIO`: «¿para quién se corre hoy? — se decide por el final previsto»).
3. **Dónde cae la última cima (S-486, top-5, `CONTRARIO`).** `ultimaCimaAMetaKm` entra en el
   clasificador **con peso propio**:
   ```
   si ultimaCimaAMetaKm > FIN.valleQueBorra (5 km):
       finalPrevisto degrada un escalón: alto → puncheur → reducido → masivo
       por cada FIN.valleEscalonKm (12 km) de valle
   ```
   El propio banco lo tiene medido: «por encima de 5 km una etapa deja de comportarse como un final
   en alto». Con esto, una reina con 30 km de valle final se corre como lo que es —una etapa de
   escapada— en vez de como una llegada en alto que nadie disputa.
4. **El grupo de cabeza de una reina llega 5-15, no 1 (S-367, deuda sin banda del banco).** Con (1),
   (2), (3) y R02, el grupo de favoritos deja de colaborar (S-308, `CONTRARIO`, top-5) y pasa a
   mirarse: menos ritmo, más ataques cortos, más gente que llega. La regla concreta que lo produce:
   ```
   si grupo.clase == 'fuga'|'contra' ∧ sinGregarios(grupo) ∧ finalPrevisto ∈ {alto, puncheur}:
       compromiso = min(compromiso, FIN.favoritosCommit)      # 0,62
       y el turno lo cubren solo los que TIENEN que ganar tiempo (déficit > 0)
   ```
   `sinGregarios` = ningún miembro tiene `encargo` con nombre dentro del grupo. Es exactamente «cuatro
   líderes que deberían mirarse ruedan colaborando».
5. **Quién abre y a cuántos metros (S-339, S-340).** Ya existe (`sprintHoldMetres`, `launchSd`), pero
   se aplica con el tipo de final de la etapa; pasa a aplicarse con `finalPrevisto` del grupo. Un
   sprint de dos (S-340) usa `sprintContenders = 2` y `standoff` doble: se miran más.
6. **El líder que espera al último km (S-274) y el puncheur que ataca en el muro (S-278).** Los dos
   caen solos de (1)+(2): con `finalPrevisto == 'puncheur'`, el puncheur tiene `finishScoreAqui` alto
   y ataca menos; con `masivo`, tiene que atacar antes o perder.

**Cierra.** `S-049`, `S-274`, `S-278`, `S-316`, `S-327`, `S-328`, `S-330`, `S-331`, `S-339`,
`S-340`, `S-341`, `S-367`, `S-370`, `S-445`, `S-446`, `S-480`.

**Constantes nuevas.** `FIN.horizonteKm` 60 (más allá no se puede predecir el tamaño del grupo y la
confianza se topa en 0,15), `FIN.valleQueBorra` 5 km (**medido, del propio banco**),
`FIN.valleEscalonKm` 12 km **[calibrar]**, `FIN.favoritosCommit` 0,62 (= `chaseHoldCommit`, por rima:
es el ritmo de «se controla pero no se caza»), `FIN.cribaEsperada` (tabla por terreno restante).

**Cómo se mide.** `medianLeadGroupRiders` — **ya existe y mide 1**, impreso como DEUDA sin banda. Se
propone **darle banda: 4-12** _(el encargo pedía 5-15; se baja el suelo a 4 porque una etapa con
final en alto muy duro sí deja llegar tres, y el techo a 12 porque por encima el puerto no ha
seleccionado nada)_. `finishTypeByGroup` — % de grupos de meta cuyo `finalPrevisto` a 20 km coincidió
con el real; objetivo **≥ 70 %**. `roleFromFinish` — % de cartas de equipo que corresponden al final
real y no al `kind`; objetivo **≥ 85 %**. Banco: `realQueens`, `calendarQueens`, `smallTours`.

---

### R18 · La colaboración que se rompe · 21 situaciones

**La pieza.** Un **modelo de relevos con compromiso reevaluable**, montado sobre el turno que ya
existe —listón de deber, techo de veinte, suelo de uno a cuatro, que está bien y no se toca— y
dándole al turno lo que hoy no tiene: **duración, orden y motivo**.

**Las reglas.**

1. **El turno dura y tiene orden (S-492, `AUSENTE`).** Hoy `relayTurn` devuelve un conjunto y nadie
   se aparta.
   ```ts
   interface Turno {
     orden: string[]        // quién va primero, quién segundo
     cabezaDesdeKm: number
     duracionKm: number     // COOP.turnoKm(size, terreno)
   }
   COOP.turnoKm(size, t) = COOP.turnoBase(t) · clamp(size/6, 0.5, 2)
   COOP.turnoBase = { llano 1,2 km · subida 0,5 · paves 0,4 · descenso 2,0 }
   ```
   Al agotar su turno, el de cabeza **se aparta** (pasa al final del `orden`) y entra el siguiente.
   El que se aparta recupera reserva (la física ya lo hace: `reserveS` recarga a rueda). Y el que
   **no** se aparta —el que tira de más— se anota en el libro y paga.
2. **El compromiso se pudre por dos relojes (S-491 `CUBIERTO` + S-253).** El de meta ya existe
   (`noChanceToWin` con `coopSelfishKm`); el de tensión también (`breakawayTensionPerKm`). Lo que
   falta es **juntarlos en la misma revisión** y hacerla cada **kilómetro** en vez de cada
   `coopReviewBlocks` (20 bloques = 2 km): el dueño lo pidió explícito, «quizás no cada 100 metros,
   pero quizás cada km».
3. **El relevo negado, con nombre (S-128, S-256, S-082).** El turno gana una lista de exclusiones:
   ```
   noPasoPor(m) = { compañeroDelante(m), aliadoDe(m) invertido, deudaCon(m), ordenDelJugador }
   ```
   Y **se nota**: si `|noPasoPor| / size > COOP.contagioUmbral` (0,35), el compromiso cae
   `COOP.contagioCaida` (0,25) porque «los otros quizás quieran desgastarse menos para que ese wey
   que va ahí sin gastar energía no se la lleve».
4. **La alianza dentro de la fuga (S-082).** Dos corredores de equipos distintos con motivos
   compatibles (uno por la etapa, otro por la montaña) forman `Alianza`: se relevan entre ellos, no
   se atacan hasta `alianzaHastaKm`, y **rompen a la vez** si un tercero se va. Se emite en la
   crónica. Es lo que hace que una fuga de cuatro sea una historia y no cuatro monólogos.
5. **El pasajero (S-366) y el que remata mejor.** Hoy `noChanceToWin` ya deja fuera al que no puede
   ganar; falta el simétrico: **al que puede ganar y no releva se le castiga**. Regla:
   ```
   si m no ha relevado en los últimos COOP.memoriaKm (12 km) y su finishScoreAqui es el mejor:
       los demás bajan su compromiso COOP.castigoAlPasajero (0,18)
       y en meta m pierde COOP.pasajeroEnMeta (0,04) de score      # llega igual de fresco pero solo
   ```
   El segundo término es pequeño a propósito: el pasajero **tiene que seguir siendo una estrategia
   buena a veces**, si no deja de ser un dilema.
6. **El solitario (S-264, `CONTRARIO`; S-333, `CONTRARIO`; S-361).** Hoy un corredor solo en cabeza
   se comporta mal en dos sitios. Reglas: (a) el solitario **dosifica** —`compromiso` objetivo
   `COOP.solitarioCommit` (0,80) en vez de a tope, y sube a 0,95 dentro de los últimos
   `COOP.solitarioFinalKm` (8 km)—; (b) el grupo que le persigue **acelera al verle cerca**
   (`err` del controlador con el hueco creído, que ahora tiene error: por eso a veces le cazan a 200
   m y a veces no le cazan).
7. **Dos grupos que se juntan (S-209) y el grupo intermedio (S-208).** Al fusionar, el compromiso no
   es el máximo (como hoy) sino **renegociado**: `moveCooperation` se vuelve a llamar con la
   composición nueva. Un grupo de ocho que absorbe a dos que venían muertos coopera peor, no mejor.
8. **El grupo sin equipos (S-235).** Con agentes libres y campo mixto, `relayDutyThresholdNoTeams`
   ya existe. Se conserva.

**Cierra.** `S-082`, `S-122`, `S-208`, `S-209`, `S-210`, `S-235`, `S-253`, `S-257`, `S-264`,
`S-301`, `S-302`, `S-333`, `S-361`, `S-363`, `S-364`, `S-366`, `S-368`, `S-453`, `S-477`, `S-491`,
`S-492`.

**Constantes nuevas.**

| Constante                | Valor | Por qué                                                                                                |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------------ |
| `COOP.turnoBase`         | tabla | 1,2 km en llano ≈ 1,7 min a 42 km/h: un relevo de verdad. En subida 0,5 km ≈ 2 min a 15 km/h: también. |
| `COOP.contagioUmbral`    | 0,35  | Un tercio de escaqueados y el grupo se rompe. **[calibrar]**                                           |
| `COOP.contagioCaida`     | 0,25  | Un cuarto de compromiso: se nota mucho, que es el punto.                                               |
| `COOP.memoriaKm`         | 12 km | Lo que se recuerda dentro de una fuga. Es `chaseCatchTargetKm` (12) por rima.                          |
| `COOP.castigoAlPasajero` | 0,18  | **[calibrar]**                                                                                         |
| `COOP.pasajeroEnMeta`    | 0,04  | Pequeño: sentarse tiene que seguir compensando a veces.                                                |
| `COOP.solitarioCommit`   | 0,80  | Entre `climbTempoCommit` (0,7) y `climbRaceCommit` (0,85): va fuerte, no a tope.                       |
| `COOP.solitarioFinalKm`  | 8 km  | Es el «a 8-10 km la colaboración se rompe» del propio catálogo (S-253). **Derivado.**                  |
| `COOP.revisionKm`        | 1 km  | Petición literal del dueño. Sustituye a `coopReviewBlocks` 20.                                         |

**Cómo se mide.** `turnDuration` — km medianos de un turno de cabeza por terreno; hoy no existe.
`relayRefusals` — % de miembros de un grupo que están en `noPasoPor` con motivo nombrado; objetivo
**5-30 %**. `soloWinPct` — % de victorias en solitario en media montaña: hoy **4 %** contra el
**20-30 %** que pidió el dueño (deuda 4 del §14, «falta un mecanismo que el motor no tiene: en un
grupo decisivo cerca de meta la colaboración se rompe»). **Banda propuesta: 12-30 %**, y se declara
que este racimo es el mecanismo que la deuda 4 pedía.

---

### R19 · Fases explícitas y sus ventanas · 19 situaciones

**La pieza.** La **fase como estado compartido** que cambia la conducta de golpe, con sus ventanas.
Y, sobre todo, **quitar los dos topes contables** que hoy apagan la capa táctica: el contador de tres
movimientos (S-444) y el apagón durante el cierre (S-487). Los dos son `CONTRARIO` y están entre las
veinte más graves.

**Las reglas.**

1. **Las fases.**
   ```ts
   type Fase =
     | 'neutralizado'
     | 'salida'
     | 'fuga'
     | 'control'
     | 'caza'
     | 'aproximacion'
     | 'decisivo'
     | 'desenlace'
     | 'tregua'
     | 'contra'
   ```
   Se derivan, no se sortean:
   ```
   neutralizado: km < kmNeutralizados
   salida:       km < FASE.salidaKm (5) ∨ no hay ningún movimiento vivo
   fuga:         hay movimientos y ninguno ha prosperado
   control:      hay fuga del día y cuerda ≥ 0
   caza:         hay fuga del día y cuerda < 0 y alguien paga el frente
   aproximacion: kmToGo ≤ POS.aproximacionKm antes de puerto/sector decisivo
   decisivo:     onClimb ∧ raceThisClimb, o dentro del sector que decide
   desenlace:    kmToGo ≤ finalDriveKm (15)
   tregua:       CAIDA (R12) o pacto (R09) activo
   contra:       los PULSO.reaperturaKm siguientes a una captura
   ```
2. **Se quita `tacticMaxMoves` (S-444, `CONTRARIO`).** «Un contador de grupos vivos decide si se
   puede intentar algo, y lo decide **antes** de mirar quién queda en el grupo, cuánto falta o quién
   manda». Se sustituye por lo que de verdad limita los ataques en carretera: **el coste**. Un
   intento cuesta cerillo + `tacticAttackCost` y el apetito ya cae con la energía. Si eso no basta,
   la palanca correcta es `tacticAttemptCooldownKm` (por grupo), no un tope global de la etapa.
3. **Se quita el apagón del cierre (S-487, `CONTRARIO`).** Hoy `closingNow` congela `attemptFrom`
   desde el pelotón ENTERO mientras exista un movimiento sin cuerda, y el propio comentario del
   código mide el resultado: «cuatro intentos hasta el km 19 y ni uno más en los 190 restantes».
   Se sustituye por: **el equipo que está cerrando no ataca; los demás sí**.
   ```
   puedeIntentar(m) = teamOf(m) ≠ duenoDelFrente ∧ ¬estaEnElTurno(m)
   ```
   Que es, además, la regla de carretera: el bueno salta justo cuando el que cerraba está gastado.
4. **La tregua después de la captura (S-231) y el contraataque inmediato (S-329, `CONTRARIO`).** Los
   dos son la fase `contra`: durante `PULSO.reaperturaKm` (6 km) el compromiso baja
   (`FASE.treguaPostCaptura` 0,88 del objetivo) **y el apetito sube** (`FASE.contraBoost` 1,5). Es
   una tregua para el pelotón y una oportunidad para el que no cerró. Hoy pasa lo contrario en los
   dos sentidos.
5. **El «flyer» (S-326, `CONTRARIO`).** `tacticNoAttackKm` = 3 impide atacar en los últimos 3 km. En
   carretera el flyer existe y es de lo más bonito. Regla: dentro de los últimos 3 km se permite el
   intento **solo si** el grupo es pequeño (`size ≤ FASE.flyerMaxGroup` 25) y el atacante tiene
   cerillo. En un sprint masivo sigue sin haber ataque, que es lo correcto.
6. **El puente desde un grupo rezagado (S-132, `AUSENTE`) y dejar marchar el puente (S-173).** El
   puente hoy solo va del pelotón al de cabeza. Se generaliza: cualquier grupo puede puentear al
   inmediatamente anterior si el hueco está en `[bridgeGapMin, bridgeGapMax]`. Y el pelotón **puede
   dejarlo marchar a propósito** si el puente le hace el trabajo (`votoAduana` positivo porque el que
   puentea va a cerrar por él).
7. **La etapa corta de montaña (S-471).** Con `totalKm < FASE.etapaCortaKm` (130) y
   `kmSubida/total > 0,35`: **no hay fase `fuga`**, se entra directo en `control`/`decisivo` desde el
   km 0 y `tacticAllowSettleKm` se pone a 0. Se corre desde el disparo.
8. **El ataque que no abre hueco (S-476, `CUBIERTO`).** Ya se calcula y se paga igual. Se confirma.

**Cierra.** `S-116`, `S-121`, `S-130`, `S-131`, `S-132`, `S-152`, `S-169`, `S-170`, `S-173`,
`S-218`, `S-231`, `S-232`, `S-326`, `S-329`, `S-350`, `S-444`, `S-471`, `S-476`, `S-487`.

**Constantes nuevas.** `FASE.salidaKm` 5, `FASE.treguaPostCaptura` 0,88, `FASE.contraBoost` 1,5,
`FASE.flyerMaxGroup` 25 (= `bigGroupThreshold`, **derivado**), `FASE.etapaCortaKm` 130 km.
**Constantes que se retiran**: `tacticMaxMoves` (3) y la rama `closingNow` de `attemptFrom`.

**Cómo se mide.** `attemptsPerStage` — intentos por etapa y **su distribución a lo largo del
recorrido**. Hoy el propio código mide «cuatro hasta el km 19 y ni uno más»; el objetivo es que el
histograma tenga masa después del km 100. Banda propuesta: **`attemptsAfterHalfPct` ≥ 25 %** de los
intentos en la segunda mitad de la etapa. `phaseCoverage` — que las diez fases aparezcan al menos una
vez en un banco de 10 carreras: invariante. Banco: `analyzeVariety` (existe, sin banda: pasa a
tenerla) + coherencia.

---

### R20 · El pulso por el frente: quién paga la caza · 20 situaciones

**La pieza.** **El frente como subasta.** Hoy el frente lo lleva UNO por una tabla de `claim` con
histéresis, y eso funciona pero no es un pulso: nadie negocia, nadie se esconde, nadie se enfada. La
subasta es el corazón de esta propuesta junto con la aduana.

**Las reglas.**

1. **La puja.** Cada tic de director, todo equipo con hombres en el pelotón puja:
   ```
   puja(e) = beneficio(e) − precio(e) + alianza(e)
   beneficio(e) = claim(motivoActivo(e)) · urgencia(e)                       # R05
   precio(e)    = PULSO.precioBase
                · (huecoCreido / PULSO.cierrePorHombreS / hombresDisponibles(e))
                · precioDeLaCarretera(bloque, carretera)                     # S-493
                · (1 + PULSO.precioPorGasto · spentFraction(e))
   alianza(e)   = Σ sobre aliados: PULSO.valorAlianza · puja(aliado)
   ```
2. **El precio de la carretera (S-493, `AUSENTE`).** «El mismo hueco y los mismos hombres cuestan el
   doble en un trazado revirado que en uno abierto».
   ```
   precioDeLaCarretera = 1
     + PULSO.reviradaExtra · [carretera.revirada]       # +0,45
     + PULSO.estrechaExtra · [carretera.ancho=='estrecha'] # +0,25
     + PULSO.vientoCaraExtra · vientoDeCara               # +0,35 · intensidad
     − PULSO.vientoColaAlivio · vientoDeCola              # −0,25 · intensidad
   ```
   `carretera` es un dato del recorrido que hoy no existe y hay que generarlo (R28).
3. **El resultado de la subasta.** No es «uno gana»: es un **reparto**.
   ```
   pujaOrdenada = equipos con puja > 0, de mayor a menor
   dueñoDelFrente = pujaOrdenada[0]
   colaboran      = { e : puja(e) > PULSO.umbralColaborar · puja(dueño) }    # 0,55
   hombresQueTira(e) = ceil( PULSO.cupoTurno · turnoTotal · puja(e)/Σ puja(colaboran) )
   ```
   Con `PULSO.cupoTurno` = 1: es exactamente «si hay 4 equipos colaborando, 5 de cada uno». Y el que
   no colabora **no aparece en el turno**, que es lo que hoy no se puede decir.
4. **El frente sin dueño (S-167) y a media máquina.** Si `max(puja) < PULSO.umbralDueño` (0,4),
   nadie toma el frente: dos o tres tiran con `PULSO.sinDueñoCommit` (0,88 del objetivo). Hoy esto
   existe a medias (`noOwnerCommitFactor` 0,94); se conserva el número y se le da causa.
5. **El pulso: el que «tiene que» tirar y no quiere (S-166, `AUSENTE`).** Si un equipo tiene el
   motivo obvio (maillot amenazado, sprinter con final masivo) y **no puja**, los demás pueden
   **esperarle**: el compromiso del pelotón cae a `PULSO.esperaCommit` (0,52) durante
   `PULSO.esperaKm` (8 km), el hueco crece, y el que tenía que tirar acaba tirando **con el hueco ya
   mayor**. Ese es el pulso, y es la conducta que más se ve en carretera y menos existe en el motor.
6. **La caza compartida y el gorrón (S-171, S-172, S-174, S-175).** Una `Alianza` entre equipos se
   forma cuando dos tienen el **mismo problema** (mismo objetivo de caza) y no hay `rivalidad`
   estructural. Dura hasta que uno consigue lo suyo (S-175: «en cuanto tengo lo mío, dejo de tirar»),
   y romperla se anota en `deudaCon` (R09). El gorrón —el que se beneficia sin pujar— sube su
   `deudaCon` negativa y **mañana le cuesta**.
7. **El pelotón que se parte por su propia caza (S-230, `CONTRARIO`).** Hoy cazar no rompe. Con
   `POS.derivaPorKm` y el turno con duración, un pelotón que caza a `commitCap` alto durante 40 km
   pierde por la cola: es física + posición, no una regla nueva.
8. **Cuándo se sientan (S-186, `CONTRARIO`).** Si la fuga no cuajó o el hombre de la casa fue cazado,
   el motivo se recalcula (R05) y el equipo se sienta. Sale solo.
9. **Controlar a tres minutos no es cazar (S-168).** Ya existe (`chaseGear` con `leash`) y se
   conserva; ahora el `leash` sale de la aduana (`huecoMeta`, R03 §3) y no de una constante.
10. **Qué grupo es «el pelotón» (S-442).** `mainGroupId` se conserva tal cual; lo que se corrige es
    que los grupetos y el reenganche se midan contra `mainId` y no contra el `Group` de id fijo
    `peloton`, que es una incoherencia anotada en el mapa (§5, «los grupetos se miden siempre contra
    el `Group` con id `peloton`, aunque el título lo tenga un `shed`»).

**Cierra.** `S-071`, `S-150`, `S-151`, `S-166`, `S-167`, `S-168`, `S-171`, `S-172`, `S-174`,
`S-175`, `S-176`, `S-178`, `S-180`, `S-186`, `S-230`, `S-296`, `S-442`, `S-474`, `S-477`, `S-493`.

**Constantes nuevas.**

| Constante                | Valor | Por qué                                                                                                                         |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------- |
| `PULSO.precioBase`       | 1,0   | Escala: con hueco de 3 min, 6 hombres y carretera normal el precio es ≈ 0,55, comparable a un `claim` de 3 normalizado.         |
| `PULSO.precioPorGasto`   | 0,8   | Cuanto más has gastado, más te cuesta seguir. Recoge `teamFrontHandoverSpent` (0,35) por el lado del precio.                    |
| `PULSO.valorAlianza`     | 0,35  | Un aliado vale un tercio de lo que vale él para sí mismo.                                                                       |
| `PULSO.reviradaExtra`    | 0,45  | Casi la mitad más caro. **[calibrar]** — es el número que el dueño describió como «el doble», atenuado a la mitad para empezar. |
| `PULSO.estrechaExtra`    | 0,25  |                                                                                                                                 |
| `PULSO.vientoCaraExtra`  | 0,35  |                                                                                                                                 |
| `PULSO.vientoColaAlivio` | 0,25  |                                                                                                                                 |
| `PULSO.umbralColaborar`  | 0,55  | Colabora el que quiere de verdad, no el que pasaba por ahí.                                                                     |
| `PULSO.umbralDueño`      | 0,40  | Por debajo no hay nadie con ganas.                                                                                              |
| `PULSO.cupoTurno`        | 1,0   | «5 de cada uno si hay 4 colaborando»: el reparto proporcional cabe justo en `relayRotationMax` (20). **Derivado.**              |
| `PULSO.sinDueñoCommit`   | 0,88  | Es `noOwnerCommitFactor` (0,94) endurecido: si nadie manda, se va más lento de lo que hoy se va. **[calibrar]**                 |
| `PULSO.esperaCommit`     | 0,52  | Justo por debajo de `pelotonTempoCommit` (0,55): se afloja lo justo para que se note.                                           |
| `PULSO.esperaKm`         | 8 km  | Diez minutos de pulso. Más sería una huelga.                                                                                    |

**Cómo se mide.** `frontTeamsPerStage` — **ya existe**, banda 1,8-4 (invariante 22). Con la subasta
tiene que **subir**: se propone **2,2-5**. `chaseCostShare` — reparto del trabajo de cierre entre los
equipos que colaboran, coeficiente de Gini; objetivo **0,25-0,55** _(0 = todos igual, que es falso;
1 = uno solo, que es lo de hoy)_. `standoffKm` — km medianos de «pulso» (fuga que crece con nadie al
frente teniendo alguien motivo); objetivo **3-25 km por carrera**. `medir-caza.mjs` ya mide «cuántas
cazas firma UN equipo / varios» y pasa a CI.

---

### R21 · La estructura de equipo persistente y la carta del día · 23 situaciones

**La pieza.** Una **`RaceStructure` fijada antes de la etapa 1** que solo cambia por hechos, y una
**carta del día** derivada de ella y del final previsto. Es el racimo que da nombre a la propuesta y
está desarrollado entero en **§5**; aquí van las reglas de motor y los IDs.

**Las reglas** (detalle en §5).

1. **Siete formas**, las seis del dueño más la de crono por equipos (R27): `sprinter_unico`,
   `escalador_unico`, `general_completo`, `general_montana`, `sprinter_y_escalador`, `cazaetapas`,
   `mixto`. Se fija en la convocatoria con `shapeFit(forma, formatoDeLaCarrera)` (§5.2).
2. **La carta del día sale de la estructura Y del final previsto** (R17), no del `kind` (S-047,
   S-049, S-052: los tres `CONTRARIO`, y S-047 está entre las cinco más graves del catálogo).
3. **El exceptuado (S-053, `CONTRARIO`)** es `desviacion = 0,3` con contrato: no trabaja para el
   líder, no recibe ayuda, **y no le perjudica** —o sea: no cuenta como `hombreDelante` para la
   aduana ni para `sittingOn`—.
4. **Cambios por hechos, no por etiqueta.** `RaceStructure.cambiaSi`:
   `carta_abandona | carta_pierde_mas_de_X | maillot_ganado | maillot_perdido | equipo_mermado |
rival_desaparece`. Cada uno con su regla en §5.5. Eso cubre S-179, S-190, S-197, S-390, S-392,
   S-395, S-409, S-483.
5. **Equipos pequeños (S-008).** Con 4-6 hombres la estructura se degrada automáticamente:
   `sprinter_unico` con 4 hombres es un sprinter y dos gregarios, sin tren; `general_completo` con 5
   es un líder y cuatro. Es una tabla en §5.3, no un caso especial.
6. **Marcar tiempo para el líder (S-021, `AUSENTE`).** El `encargo: 'marcar_tiempo'` en una crono
   por equipos o en una fuga: el hombre rueda a un ritmo objetivo fijado por el director, no al
   suyo. Es un tope de perfil, igual que `esperaA`.

**Cierra.** `S-001`, `S-002`, `S-003`, `S-004`, `S-005`, `S-006`, `S-007`, `S-008`, `S-021`,
`S-047`, `S-049`, `S-050`, `S-051`, `S-052`, `S-053`, `S-179`, `S-190`, `S-197`, `S-390`, `S-392`,
`S-395`, `S-469`, `S-483`.

**Constantes nuevas.** En §5, tablas `SHAPE_FIT`, `SHAPE_ROLES` y `SHAPE_DEGRADE`.

**Cómo se mide.** `structureMix` — reparto de formas de equipo en un campo; objetivo: **ninguna forma

> 40 %** en una gran vuelta _(si todos son `general_completo` la carrera es una)_.
> `domestiqueShare` — % del campo con papel `gregario`. **Hoy es el 70 %** y está anotado como deuda 14
> del §14 («este banco la deja a la vista sin contestarla»). Banda propuesta: **45-62 %** _(un equipo
> de ocho con una carta y un lanzador deja seis gregarios = 75 %; con dos cartas y un cazaetapas deja
> cuatro = 50 %; la mezcla de formas tiene que caer en medio)_. `cardMatchesFinish` — ver R17.

---

### R22 · El sistema de órdenes del jugador · 35 situaciones

**La pieza.** Vocabulario completo, **condicionales** (N1), precedencia explícita (§2.5) y **aviso
cuando la orden no podrá cumplirse**. Es el racimo más grande del catálogo y está desarrollado entero
en **§6**; aquí van las reglas de motor y los IDs.

**Las reglas** (detalle en §6).

1. **Precedencia**: §2.5. La individual manda siempre; el equipo reparte con lo que queda.
2. **Condicionales**: `Disparador[]` en `StageOrders` (§6.2), evaluados en el tic de kilómetro del
   corredor. Cubre S-214, S-215, S-216, S-256, S-320, S-321, S-322, S-323.
3. **Palancas que hoy hacen poco**: `effort` pasa de un solo término (±0,5 en el deber de relevo) a
   tocar **apetito, presupuesto personal y umbral de cerillo** (S-068, S-029). `triggerKm` gana
   hermanos: `triggerAt: {km} | {puerto: n} | {kmToGo} | {sector: n} | {condicion}` (S-322).
4. **El humano y su equipo**: S-023, S-024, S-054, S-057, S-058, S-059, S-060, S-061, S-062.
   Resueltos por §2.5 + `autoOrders` recibiendo las órdenes humanas.
5. **Aviso**: el consejo de la pantalla (`raceOrdersAdvice`) pasa a ver el equipo y la general
   (§6.4).
6. **La crono con plan (S-125, `CONTRARIO`)**: ver R27.

**Cierra.** `S-011`, `S-023`, `S-024`, `S-025`, `S-026`, `S-029`, `S-030`, `S-031`, `S-032`,
`S-040`, `S-054`, `S-057`, `S-058`, `S-059`, `S-060`, `S-061`, `S-062`, `S-063`, `S-067`, `S-068`,
`S-069`, `S-070`, `S-071`, `S-125`, `S-214`, `S-215`, `S-216`, `S-217`, `S-256`, `S-320`, `S-321`,
`S-322`, `S-323`, `S-415`, `S-421`.

**Cómo se mide.** Ver §7.2: un banco **de órdenes** que hoy no existe (ceguera nº 7: «ningún banco
varía `mentality`, `contestSprints/Climbs`, `targetRiderId` o rol por decisión externa»).
`orderEffect` — para cada palanca, diferencia de resultado con el mismo corredor y las mismas
semillas. La medida ya existe puntual («gana 7 de 16 llanas como `sprinter` y 0 de 16 como
`gregario`») y hay que convertirla en banco. Banda propuesta: **cada palanca mueve ≥ 1 resultado de
cada 8** _(si no, es un botón desconectado, que es la queja literal del dueño)_.

---

### R23 · El relato que explica el porqué · 14 situaciones

**La pieza.** Crónica e informe que **nombran al beneficiario** de cada trabajo, dicen **por qué**
persigue cada equipo y **cruzan la orden escrita con lo que pasó**. Es observación: no cambia
conducta, pero es el instrumento con el que el dueño ha cazado todo lo de este documento, así que
cada racimo tiene que emitir su evidencia.

**Las reglas.**

1. **Todo lo nuevo emite.** Lista cerrada de eventos nuevos, uno por pieza:
   `team_structure_set` (§5), `team_replans` (R21), `team_new_leader` (R10),
   `customs_vote` (R03: la cuerda con los tres equipos que más pesaron),
   `front_auction` (R20: quién pujó, quién ganó, a qué precio), `alliance_formed` / `alliance_broken`,
   `duo_alternates` (R02), `truce_called` / `truce_broken` (R12), `mishap` (R11),
   `order_arrived_late` (R24), `pizarra_wrong` (R24: cuando el director actuó con un número que
   estaba mal por más de `DIR.errorNarrable` = 20 s).
2. **El beneficiario, con nombre y presente (S-434, S-439).** `pullFor` ya existe y ya se corrigió
   («solo se nombra si está en el grupo»). Falta `tira_para_si_mismo` (deuda 8 del §14, «queda
   anotado como defecto medido»), que con `RaceView` es trivial: si el que tira es la carta y no hay
   nadie a quien servir, el motivo es `propio`.
3. **El tope de tres protagonistas (S-439).** Es la causa de los «10 ataques sin desenlace» y de que
   `ataqueSinCerrar` tolere 2. Se propone subir el tope a `CRONICA.protagonistasMax` = **5** para los
   eventos colectivos (`fuga_formada`, `breakaway_caught`, `chase_work`) y dejarlo en 3 para los
   individuales. Es lo que permite bajar la tolerancia a 0.
4. **El informe NO re-simula (S-418, `CONTRARIO`).** `getRiderLastRaceReport` re-simula la etapa con
   el motor actual en vez de leer los eventos congelados, «contra el principio que la crónica y la
   radio sí respetan». Se arregla leyendo `stage_snapshots.events`. Es un bug, no un diseño.
5. **«Esto se decidió aquí y tú habías dicho esto otro» (S-417).** El informe cruza `Disparador[]`
   con los eventos: para cada disparador, si se cumplió la condición, si se ejecutó y qué pasó. Es la
   pieza que cierra el bucle de N1.

**Cierra.** `S-056`, `S-218`, `S-219`, `S-221`, `S-416`, `S-417`, `S-418`, `S-419`, `S-420`,
`S-434`, `S-439`, `S-440`, `S-441`, `S-449`.

**Cómo se mide.** `coherence.ts` ya mide 12 contradicciones con tolerancia cero salvo
`ataqueSinCerrar: 2`. Se propone: **`ataqueSinCerrar` a 0** una vez suba el tope de protagonistas, y
**dos defectos nuevos**: `votoSinExplicar` (una cuerda que cambia sin `customs_vote`) y
`frenteSinSubasta` (un cambio de `duenoDelFrente` sin `front_auction`). Banco: `coherence.test.ts`,
que ya está en CI.

---

### R24 · Directores bot falibles · 11 situaciones

**La pieza.** **La calidad de dirección por equipo**, y con ella toda la capa de información
imperfecta: el número viejo y torcido (S-458), la noticia que llega tarde (S-478), el estado del
rival leído por señales y falseable (S-488), la orden que tarda en ejecutarse (S-489) y el capitán de
ruta que decide lo que el director no llegó a decir (S-459). **La física es la misma para todos**:
esta es la respuesta correcta a G9 —«hacer que los bots sean peores que los humanos»— porque no les
quita vatios, les quita **información y tiempo de reacción**, que es exactamente en lo que un buen
director deportivo es mejor que uno malo.

**Las reglas.**

1. **La calidad.**
   ```
   calidad(e) = clamp( DIR.calidadBase
                     + DIR.calidadPorDivision · nivelDeDivision(e)     # WT 1, PRS 0,5, CON 0
                     + DIR.calidadPorPresupuesto · presupuestoRelativo(e)
                     + DIR.calidadPorFilosofia(filosofia(e))
                     , 0, 1 )
   ```
   `DIR.calidadBase` 0,25, `PorDivision` 0,35, `PorPresupuesto` 0,25, `PorFilosofia` ±0,10. Un
   continental modesto sale en 0,25; un World Tour rico con filosofía de general, en 0,95.
2. **Lo que la calidad decide** (todo ya definido en §3.3): `lagKm` del hueco, `sigmaGap`,
   `sigmaRival`, `noticiaLagKm`, `ordenLagKm`, y **el tic**: un director malo decide cada
   `DIR.tickKm / calidad` km (a calidad 0,25 son 8 km, o sea que reacciona cuatro veces menos).
3. **Un bot escribe órdenes malas (S-013, `AUSENTE`).** No por dado, sino **por consecuencia**: con
   la pizarra torcida, `ordenPara()` produce órdenes que en carretera no tienen sentido. Y encima:
   ```
   P(orden claramente mala) = DIR.erraElReparto · (1 − calidad)
   ```
   `DIR.erraElReparto` = 0,12: uno de cada ocho repartos de un director malo pone la carta en el
   hombre equivocado (el segundo mejor en vez del mejor). Es poco y es visible.
4. **El capitán de ruta (S-459).**
   ```
   capitan(e, grupo) = argmax(mios, m => TAC_efectivo(m) + DIR.capitanJerarquia · (5 − jerarquia(m)))
   ```
   Decide `relevar / no_relevar / esperar / responder / romper` cuando `ordenVigente == null` o la
   orden no cubre la situación. Su decisión usa `GroupView` (exacto) y **no** `RaceView`: no sabe a
   cuánto va la fuga si no se lo dicen. Eso es lo que hace que un equipo con mal director corra bien
   _dentro de su grupo_ y mal _respecto a la carrera_, que es exactamente lo que se ve.
5. **El disimulo (S-488).** Ya en §3.2. La decisión de esconderse la toma el `RiderAgent`:
   `escondeSuEstado = (soy carta) ∧ (frescuraReal < 0,5) ∧ (TAC > 55)`.
6. **Lo que NO cambia.** Los vatios, el depósito, los cerillos, la criba. Un director malo con un
   corredor bueno sigue teniendo un corredor bueno. Es la frontera que hace este racimo defendible.

**Cierra.** `S-009`, `S-010`, `S-012`, `S-013`, `S-014`, `S-029`, `S-458`, `S-459`, `S-478`,
`S-488`, `S-489`.

**Constantes nuevas.**

| Constante                | Valor                           | Por qué                                                                                                           |
| ------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `DIR.tickKm`             | 2 km                            | Tres minutos de carrera: lo que tarda un director en mirar la pizarra, hablar con la moto y decidir.              |
| `DIR.tickJitterKm`       | ±0,7                            | Para que 22 equipos no decidan en el mismo bloque (§2.2).                                                         |
| `DIR.calidadBase`        | 0,25                            | Un continental no es un inútil; es alguien con menos gente mirando.                                               |
| `DIR.calidadPorDivision` | 0,35                            | La división es el factor que más explica: recursos, moto, radio.                                                  |
| `DIR.lagKmMin/Max`       | 0,6 / 2,5                       | Ver §3.3.                                                                                                         |
| `DIR.sigmaGapMax`        | 0,12                            | Ver §3.3.                                                                                                         |
| `DIR.sigmaRival`         | 0,18 → 0,06                     | Ver §3.2.                                                                                                         |
| `DIR.disimuloMax`        | 0,15                            | Ver §3.2.                                                                                                         |
| `DIR.noticiaLagKm`       | 1,4 km                          | Ver §3.3.                                                                                                         |
| `DIR.ordenLagKm`         | 0,4 + 0,3·(grupos de distancia) | Una orden al pelotón llega casi al momento; a un hombre en la fuga, tarde.                                        |
| `DIR.erraElReparto`      | 0,12                            | **[calibrar]** — es la perilla de G9 y el dueño la va a querer mover.                                             |
| `DIR.capitanJerarquia`   | 4                               | Un `TAC` de 80 sin galones y un `TAC` de 68 con galones empatan: manda el que sabe, con sesgo hacia el que manda. |
| `DIR.errorNarrable`      | 20 s                            | Por debajo no es noticia.                                                                                         |

**Cómo se mide.** Este racimo pide **medidas comparadas**, no absolutas:

- `chaseTimingError` — segundos de error mediano al iniciar una caza (empezar tarde o pronto respecto
  al momento óptimo, calculable a posteriori). Hoy es ≈ 0. Objetivo: **20-90 s**, y **creciente al
  bajar la calidad**.
- `qualityGradient` — victorias por equipo en función de `calidad`, con la fuerza del campo
  controlada. Es **la banda de G9**: objetivo **un equipo de calidad 0,9 gana entre 1,25× y 1,8× lo
  que uno de calidad 0,3 con corredores equivalentes**. Por debajo de 1,25 la dirección no importa;
  por encima de 1,8 el juego lo decide el banquillo y no el corredor.
- `truceLatencyKm` (R12) y `orderLatencyKm` — que existan y sean > 0.

Banco: carrera pequeña (§7.1) con equipos de calidad forzada, más `grandTour`. **Este es el único
racimo que necesita un banco A/B** (mismo campo, misma semilla, calidades distintas).

---

### R25 · El precio de obedecer y de desobedecer · 6 situaciones

**La pieza.** **Confianza, moral y convocatoria como consecuencia** de cumplir o de ir por libre,
dentro del juego y no en una tabla muerta. Hoy «desobedecer sale gratis siempre, y la estrategia
óptima pasa a ser ir siempre de líder».

**Las reglas.**

1. **La cuenta.** Al acabar la etapa, por corredor:
   ```
   cumplimiento = 1 − desviacionMedia(km ponderados)
   trust'  = trust  + PRECIO.trustPorCumplir · (cumplimiento − 0,5)
   moral'  = moral  + PRECIO.moralPorResultado(puesto, ambicion del día)
                    + PRECIO.moralPorCumplir · (cumplimiento − 0,5)
   ```
   `PRECIO.trustPorCumplir` = 4 puntos sobre 100 por etapa: un corredor que va por libre toda una
   vuelta pierde ~40 puntos de confianza, que es mucho pero no irreversible.
2. **Lo que la confianza hace.** Ya existe `teamTrust` en `callupScore` con peso 0,4. Se le añaden
   dos consecuencias **dentro de la carrera**: (a) con `trust < PRECIO.trustMinCarta` (35) el
   director **no le da la carta** aunque sea el mejor; (b) con `trust < PRECIO.trustMinAyuda` (20)
   sus compañeros **no bajan a por él**.
3. **Cumplir tampoco da nada, hoy (S-414).** Se corrige: cumplir sube `trust` y la moral, y la moral
   entra en el presupuesto y en el apetito (R10 §6). Un gregario que se deja la piel tiene un día
   mejor la semana siguiente.
4. **El mánager juez y parte (S-027).** Es diseño de G2, no de motor. Lo que el motor aporta es el
   **dato**: `structureLog` con quién fue carta cada día y por qué. Si un mánager humano se nombra
   siempre, el dato está y la consecuencia la pone G2.
5. **El reconocimiento del recorrido (S-429).** `conoceEsteTrozo(m, tramo)` = ha corrido esta carrera
   antes. `+PRECIO.conoceElTramo` (2 puntos de `TAC` efectivo) en descensos y sectores técnicos. Es
   pequeño, es barato y es de las cosas que dan mundo.

**Cierra.** `S-011`, `S-027`, `S-384`, `S-393`, `S-414`, `S-429`.

**Constantes nuevas.** `PRECIO.trustPorCumplir` 4, `PRECIO.moralPorCumplir` 3,
`PRECIO.trustMinCarta` 35, `PRECIO.trustMinAyuda` 20, `PRECIO.conoceElTramo` 2. Todas **[calibrar]**;
las dos de umbral tienen que quedar por debajo del `teamTrust` inicial típico para que solo las cruce
quien se lo ha ganado.

**Cómo se mide.** `defianceCost` — diferencia de convocatorias en la temporada siguiente entre
corredores con `cumplimiento` alto y bajo, a igualdad de puntos. Objetivo: **≥ 15 % menos
convocatorias** para el que va por libre. Banco: `world.ts` (25 temporadas, ya existe y es barato).

---

### R26 · El grupeto y el corte · 14 situaciones

**La pieza.** El autobús como **grupo con capo, pacto entre rivales y cálculo de corte** que arrastra
el margen de los días anteriores. Y debajo de todo, **la apuesta**: que el corte se aplique según
cuántos lleguen fuera (S-494), porque mientras readmita siempre y a todos «el tamaño del grupeto no
es un activo y el racimo entero se organiza por inercia en vez de por miedo».

**Las reglas.**

1. **El capo (S-310).** El grupeto elige capo igual que un equipo elige capitán de ruta:
   `argmax(TAC + experiencia)`. El capo fija el ritmo objetivo:
   ```
   ritmoDelGrupeto = el que llega justo dentro del corte con GRUPETO.margenS de sobra
   GRUPETO.margenS = 90 s
   ```
   Y ahí está la pieza que falta: hoy el grupeto rueda a `droppedCommit`, que es una función de
   frescura y hueco, **sin mirar el corte**. Con esto rueda **contra el reloj del corte**, que es lo
   que hace en carretera.
2. **La cuenta que se lleva desde ayer (S-412).** El corte de hoy se calcula con el tiempo del
   ganador de hoy; lo que se arrastra es el **margen acumulado en la general** contra el corte, y el
   capo lo sabe: un grupeto con gente al borde de la eliminación va más rápido.
3. **El pacto entre rivales (S-310, S-311).** Dentro del grupeto **no hay equipos**: todos relevan,
   se espera al que viene (`grupetoWait`, ya existe), y **solo se rompe** si alguien queda fuera del
   corte por su culpa. `GRUPETO.roturaUmbral`: cuando el margen previsto baja de
   `GRUPETO.margenS · 0,4`, el pacto se rompe y cada uno va a lo suyo (S-371).
4. **El corte no se aplica igual a treinta que a tres (S-494, `AUSENTE`).** Es la apuesta:
   ```
   readmision(n) = n ≥ GRUPETO.readmisionMasa ? 'todos'            # 25 hombres: no se elimina a un grupo
                 : n ≥ GRUPETO.readmisionParcial ? 'con penalizacion'  # 8: entran y pierden puntos
                 : 'eliminados'
   ```
   Hoy `applyStageTimeCut` readmite con un presupuesto del 4 % y los readmitidos pierden `sprintPts`.
   Con esto, **el tamaño del grupeto es un activo**: llegar treinta te salva, llegar tres no. Y por
   eso el grupeto se organiza.
5. **El sprinter que se descuelga a propósito (S-139, `CONTRARIO`) y el «hoy me voy al grupeto»
   (S-216).** `intencion = 'al_grupeto'` como decisión: se toma cuando `finishScoreAqui` es malo, el
   motivo del equipo no le necesita y quedan días. Baja el `giveUpLambda` a 0 (no se «deja ir»: se
   deja caer, que es distinto y es voluntario) y **se ahorra depósito de verdad**.
6. **El que ya no es de la general (S-135, `CONTRARIO`).** Ver R04 §7: al salir del top relevante,
   el hombre de general puede irse al grupeto sin que nadie le espere.
7. **La criba que no llega a los grupetos (S-443).** Deuda 2 del §14: «un grupeto que ya NO es la
   carrera sigue sin perder a nadie en el puerto, y en carretera sí los pierde. Arreglarlo pide que
   la cola de las reinas pueda pasar del 14 %». **Se propone arreglarlo y mover la banda** (§9): con
   el grupeto rodando contra el corte (regla 1) en vez de a `droppedCommit`, la cola crece por la
   razón correcta y no por dejar que se cribre todo.

**Cierra.** `S-135`, `S-139`, `S-184`, `S-216`, `S-310`, `S-311`, `S-359`, `S-365`, `S-371`,
`S-375`, `S-412`, `S-443`, `S-464`, `S-494`.

**Constantes nuevas.**

| Constante                   | Valor | Por qué                                                                                                            |
| --------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------ |
| `GRUPETO.margenS`           | 90 s  | Minuto y medio de colchón: lo que un capo prudente se guarda. **[calibrar]** contra `outOfTimePct` (banda 1-15 %). |
| `GRUPETO.roturaUmbral`      | 0,40  | Con menos del 40 % del margen previsto, sálvese quien pueda.                                                       |
| `GRUPETO.readmisionMasa`    | 25    | Un grupo de 25 no se elimina en ninguna carrera del mundo: el reglamento cede.                                     |
| `GRUPETO.readmisionParcial` | 8     | Entre 8 y 24, se readmite con penalización (puntos), que es lo que ya hace `applyStageTimeCut`.                    |

**Cómo se mide.** `grupetoMargin` — margen mediano con el que el grupeto entra en el corte; objetivo
**45-180 s** _(si es enorme, va demasiado rápido; si es negativo, el corte elimina de más)_.
`outOfTimePct` — **ya existe**, banda 1-15 %, y no debería moverse: es el control de que este racimo
no rompe nada. `queenLastGroupPct` — **ya existe**, banda 8-14 %, y **sí se mueve**: ver §9.

---

### R27 · La crono como modo de carrera · 14 situaciones

**La pieza.** Un **modo contrarreloj de verdad**: orden de salida con sentido, dosificación
ordenable, referencias del rival, percances y corte propio. Hoy `simulateTimeTrial` corre en paralelo
al motor de carretera y «todos corren igual» (S-125, `CONTRARIO`).

**Las reglas.**

1. **El plan de la crono.** El director emite, por hombre, un `PlanDeCrono`:
   ```ts
   interface PlanDeCrono {
     dosificacion: 'a_tope' | 'de_menos_a_mas' | 'de_mas_a_menos' | 'por_tramos'
     objetivo: 'ganar' | 'limitar_perdidas' | 'sobrevivir'
     cambioDeBiciKm: number | null // S-436, crono mixta
   }
   ```
   `dosificacion` reparte el presupuesto de la crono por tramos:
   `a_tope` = plano; `de_menos_a_mas` = 0,92 / 1,00 / 1,08; `de_mas_a_menos` = 1,06 / 1,00 / 0,94;
   `por_tramos` = a favor del terreno (más en subida, menos en llano). Efecto real sobre el tiempo:
   la ley de velocidad ya penaliza el exceso, así que salir demasiado fuerte **cuesta**. Es lo que
   hace que la palanca importe.
2. **Las referencias (S-332).** Un corredor con la general en juego **recibe los parciales del
   rival** en los puntos intermedios (con el retardo de su director) y ajusta:
   `si voy por detrás → subo un escalón de dosificación → riesgo de reventar`. Es la conducta más
   característica de una crono y no existe.
3. **El orden de salida (S-036, S-039, S-072).** Ya existe (`startOrder.ts`, orden inverso a la
   general con `ttStartIntervalGcS` 120). Lo que falta es que **implique algo**: el que sale último
   sabe los tiempos de todos, el que sale primero no sabe nada. Regla:
   `referenciasDisponibles(m) = los que ya han pasado por el intermedio`.
4. **La CRE (S-163, `AUSENTE`).** Contrarreloj por equipos: es una etapa con un solo grupo por
   equipo, `compromiso = 1`, turno por `COOP.turnoKm` en llano, y el tiempo del **n-ésimo** hombre
   (`CRE.hombreQueCuenta` = 4 o 5 según reglamento). Todo lo que hace falta ya existe: es
   `advanceGroup` con un grupo de ocho y un criterio de tiempo distinto. **Y encaja con la forma de
   equipo**: hay una octava forma, `crono_por_equipos`, para carreras que la incluyen.
5. **Percances (S-127, S-202).** Ver R11 §5. Despiertan la salvaguarda del `timeCutItt` (0,25).
6. **La lotería del horario (S-462).** Ver R14 §7.
7. **La crono dentro del plan de vuelta (S-382, S-263).** Ver R10 §2.
8. **Cronoescalada (S-126, `CUBIERTO`)**: se confirma y no se toca.

**Cierra.** `S-021`, `S-036`, `S-039`, `S-072`, `S-125`, `S-126`, `S-127`, `S-143`, `S-163`,
`S-263`, `S-332`, `S-382`, `S-436`, `S-462`.

**Constantes nuevas.** `CRONO.dosificacionPerfiles` (la tabla de arriba), `CRONO.escalonRiesgo` 1,06
(subir un escalón por ir perdiendo), `CRE.hombreQueCuenta` 4, `MECA.cronoParada` 35 s (R11).

**Cómo se mide.** `ttPacingSpread` — diferencia de tiempo entre la misma ficha con `a_tope` y con
`de_menos_a_mas`; objetivo **8-30 s en 40 km** _(si es 0 la palanca no existe; si pasa de 30 s la
crono la decide el plan y no las piernas)_. `ttChaseReaction` — % de corredores con general en juego
que cambian de escalón tras un parcial malo: objetivo **≥ 40 %**. Banco: `timeTrials` (5 cronos
reales, ya existe) + `cri-40`.

---

### R28 · El formato de la carrera como contexto · 30 situaciones

**La pieza.** La **descripción del formato** leída por las decisiones del día. Es el racimo más
grande junto con R22 y el que más `AUSENTE` tiene (16 de 30). Y contiene **dos de las cinco filas más
graves del catálogo**, que además son las dos únicas que hacen que **nada de montaña se pueda medir**
hasta arreglarlas.

**Las reglas.**

1. **`RaceFormat`, el objeto que hoy no existe.**
   ```ts
   interface RaceFormat {
     dias: number
     tipo: 'un_dia' | 'vuelta_corta' | 'gran_vuelta' | 'campeonato'
     hayGeneral: boolean
     kmTotales: number
     kmLlano: number
     kmMontana: number
     kmCrono: number
     kmPaves: number
     finalesEnAlto: number
     finalesMasivos: number
     bonificaciones: boolean
     clasificacionesSecundarias: Motivo[]
     equiposPorEscuadra: number
     tamanoEscuadra: number
     circuito: boolean
     kmNeutralizados: number
   }
   ```
   Lo consumen: la convocatoria (§5.2), la estructura (§5.1), `colchonNecesario` (R04),
   `diasMarcados` (R10), y la aduana (R03).
2. **El perfil que el motor lee tiene que ser la carretera (S-451, `CONTRARIO`, la nº 2 del
   catálogo).** «`profileGen.normalize()` estira el último segmento y convierte en final en alto lo
   que no lo es; el terreno es una etiqueta única por carrera; el segmento se tipa solo por
   pendiente; y 0 de 157 reinas generadas pasan de 4.000 m con una mediana de 2.023 contra los
   3.500-5.000 de la carretera». **Mientras esto no se arregle, S-443, S-367 y S-164 no se pueden
   medir.** Es trabajo de generador, no de táctica, pero **es el primer paso del plan** (§8) porque
   sin él nada de montaña se puede dar por bueno.
3. **Dónde cae la última cima (S-486, `CONTRARIO`, la nº 3).** El generador tiene que **colocar** la
   parte selectiva, no dejarla caer: `GEN.ultimaCimaAMetaKm` como parámetro del generador con
   distribución objetivo *(final en alto 0-2 km: 40 % de las reinas; 2-10 km: 25 %; 10-30 km: 25 %;
   > 30 km: 10 %)*, que es aproximadamente el reparto de las grandes vueltas reales. Y la conducta que
   > lo lee es R17 §3.
4. **La cota del puerto (S-479).** `altitud` como campo del segmento; por encima de
   `FORMATO.altitudUmbral` (1.800 m), `−FORMATO.altitudPerfil` puntos de perfil por cada 500 m, más
   para los que no son escaladores puros. Un dato y una resta.
5. **El trazado (S-493).** `carretera: { ancho, revirada, expuesta }` por segmento. Lo consume R20 §2
   y R15 §7. Es el dato que falta para que el precio de la caza sea real.
6. **La etapa corta de montaña (S-471)**: ver R19 §7. **El circuito (S-227)**: la criba se acumula
   vuelta a vuelta porque el mismo repecho se pasa N veces; sale solo si el perfil lo repite.
   **La última etapa de trámite (S-075)**: `tipo == 'gran_vuelta' ∧ ultimoDia ∧ generalDecidida` →
   `humor` a `FORMATO.paseoHumor` (0,62) hasta el circuito final. **La última etapa decisiva
   (S-270)**: lo contrario.
7. **La neutralización (S-073, S-223) y el obstáculo (S-438).** `kmNeutralizados` al principio;
   `neutralizacionEnKm` como suceso raro (paso a nivel, público, moto): la carrera se para y los
   huecos se congelan. `FORMATO.pObstaculo` = 0,004/etapa.
8. **El campeonato nacional (S-485).** «532 carreras del calendario sin formato propio»:
   `tipo: 'campeonato'` con `equiposPorEscuadra` reales del país —o sea, **equipos que no son los de
   club**, sino selecciones—, lo que cambia radicalmente la aduana y las alianzas. Es una fila de
   convocatoria, no de motor.
9. **Dos carreras la misma semana (S-470).** La plantilla se parte: `selectSquad` tiene que resolver
   **las dos a la vez** con un solo pool. Hoy filtra `busy` por orden de calendario, que es un
   `argmax` local y produce que la carrera B se lleve los restos aunque sea más importante.
10. **La etapa 1 y la carrera de un día (S-074, S-388).** `hayGeneral = false` en el día 1 y en un
    día: ya lo distingue `hasGcContext`; lo que falta es que **el motor sepa que hay una vuelta
    detrás** (S-388) para que el día 1 no se corra como una clásica.

**Cierra.** `S-001`, `S-037`, `S-073`, `S-074`, `S-075`, `S-085`, `S-117`, `S-157`, `S-158`,
`S-159`, `S-164`, `S-223`, `S-225`, `S-226`, `S-227`, `S-228`, `S-270`, `S-287`, `S-289`, `S-388`,
`S-431`, `S-438`, `S-451`, `S-463`, `S-470`, `S-471`, `S-479`, `S-485`, `S-486`, `S-493`.

**Constantes nuevas.** `FORMATO.altitudUmbral` 1.800 m, `FORMATO.altitudPerfil` 1,5 puntos/500 m,
`FORMATO.paseoHumor` 0,62, `FORMATO.pObstaculo` 0,004, y los parámetros de generador
`GEN.ultimaCimaAMetaKm` (distribución) y `GEN.desnivelReina` (objetivo 3.000-5.000 m, hoy mediana
2.023).

**Cómo se mide.** `queenDPlus` — desnivel mediano de las reinas generadas: **hoy 2.023 m**, objetivo
**3.000-4.500 m**. `lastClimbToFinish` — distribución de la distancia última cima → meta; objetivo:
la de (3). `formatCoverage` — que cada `tipo` de formato tenga al menos una carrera en el banco.
Banco: `calendarQueens` (que ya muestrea 27 reinas del calendario) y un test de generador nuevo,
barato porque no simula: solo genera perfiles y los mide.

---

### Cobertura de este documento sobre el catálogo

Los 28 racimos cubren **445 de las 494 situaciones** (90 %). Las 49 que no caen en ningún racimo son,
según el propio catálogo, «las que se resuelven solas» más tres que no comparten pieza con nada:
**S-432** (el dado de forma del día: es una tirada, no una pieza), **S-437** (el orden de carretera
entre grupos: es física y ya está) y **S-448** (el comisario: un actor que no existe en ninguna capa
y que este documento **no propone crear** — es una decisión del dueño, §10).

Reparto por estado de las 445, con lo que este diseño hace con ellas:

| Estado hoy  | Situaciones | Qué pasa                                                                |
| ----------- | ----------- | ----------------------------------------------------------------------- |
| `CONTRARIO` | 59          | **Todas** cambian de signo: son la razón de ser de cada racimo.         |
| `AUSENTE`   | 178         | 164 se implementan; 14 quedan fuera de parcela (física, entrenamiento). |
| `PARCIAL`   | 195         | Se completan; ninguna se rehace desde cero.                             |
| `CUBIERTO`  | 62          | Se **confirman y se protegen**: son el guardarraíl de cada paso.        |

---

## 5. El plan de equipo de verdad

El dueño dictó la variedad que quiere ver, y la dictó como director deportivo: no en términos de
atributos, sino de **para quién corre la casa**. Esta sección la convierte en objetos.

### 5.1 Las siete formas

```ts
export type TeamShape =
  | 'sprinter_unico' // un sprinter fuerte y el resto trabajando solo para él
  | 'escalador_unico' // un hombre fuerte de montaña y el resto para él
  | 'general_completo' // un hombre para la general, montaña + crono
  | 'general_montana' // un hombre para la general, solo montaña
  | 'sprinter_y_escalador' // dos cartas, y el resto para ambos
  | 'cazaetapas' // solo cazaetapas, buscando la fuga y la sorpresa
  | 'mixto' // gregarios de un líder, con alguien exceptuado por libre
  // + la octava, técnica, para carreras con CRE:
  | 'crono_por_equipos'

export interface RaceStructure {
  teamId: string
  raceId: string
  shape: TeamShape
  cartas: { riderId: string; para: Motivo; prioridad: 1 | 2 }[]
  exceptuados: string[] // desviacion 0,3 de oficio
  gregariosDe: Map<riderId, riderId> // quién trabaja para quién
  objetivo: ObjetivoDeCarrera // R10
  fijadaElDia: number
  cambios: { dia: number; causa: string; de: TeamShape; a: TeamShape }[]
}
```

Y lo que cada forma **significa** en papeles del día, que es la tabla `SHAPE_ROLES`. Con ocho
hombres:

| Forma                  | Cartas              | Papeles del día (final masivo)                            | Papeles del día (final en alto)                    |
| ---------------------- | ------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| `sprinter_unico`       | 1 sprinter          | 1 sprinter · 2 lanzadores · 5 gregarios                   | 1 libre · 1 cazaetapas · 6 al grupeto/gregarios    |
| `escalador_unico`      | 1 escalador         | 1 libre · 1 cazaetapas · 6 gregarios de colocación        | 1 líder · 5 gregarios · 1 cazaetapas · 1 libre     |
| `general_completo`     | 1 líder             | 1 líder protegido · 4 gregarios · 1 cazaetapas · 2 libres | 1 líder · 6 gregarios · 1 cazaetapas               |
| `general_montana`      | 1 líder             | igual, pero el líder **no** disputa bonificaciones        | igual que `general_completo`                       |
| `sprinter_y_escalador` | 2 (prio 1 y 2)      | sprinter + 2 lanzadores · escalador + 1 · 3 gregarios     | escalador + 3 · sprinter al grupeto · 2 cazaetapas |
| `cazaetapas`           | 0 (todos son carta) | 3 cazaetapas · 5 libres                                   | 4 cazaetapas · 4 libres                            |
| `mixto`                | 1 líder + 1 excep.  | 1 líder · 4 gregarios · 1 exceptuado · 2 libres           | igual                                              |
| `crono_por_equipos`    | el 4.º hombre       | los ocho relevando                                        | —                                                  |

**Lo importante de esta tabla no son las celdas: es que la fila y la columna sean las dos cosas
distintas que son.** La fila es la estructura de la carrera (persistente); la columna es el final
previsto **por grupo** de hoy (R17). Hoy el motor tiene una sola dimensión —el `kind` de la etapa— y
por eso «la casa entera puede correr para el hombre que no era» (S-047).

### 5.2 Cómo se elige la forma en la convocatoria

`world/callups.ts` hoy puntúa **individualmente** y no compone: «no hay lógica de composición… no hay
cupos por vocación; no hay tren ni gregarios de montaña». Se sustituye por dos pasos.

**Paso A: elegir la forma que mejor encaja con el formato.**

```
shapeFit(shape, F: RaceFormat) =
      SHAPE_FIT[shape].llano    · F.kmLlano   / F.kmTotales
    + SHAPE_FIT[shape].montana  · F.kmMontana / F.kmTotales
    + SHAPE_FIT[shape].crono    · F.kmCrono   / F.kmTotales
    + SHAPE_FIT[shape].masivos  · F.finalesMasivos / max(1, F.dias)
    + SHAPE_FIT[shape].altos    · F.finalesEnAlto  / max(1, F.dias)
    + SHAPE_FIT[shape].general  · [F.hayGeneral]
```

`SHAPE_FIT` (los seis pesos por forma; **[calibrar]**, pero los signos son doctrina):

| Forma                  | llano | montaña | crono | masivos | altos | general |
| ---------------------- | ----- | ------- | ----- | ------- | ----- | ------- |
| `sprinter_unico`       | 1,0   | −0,8    | 0,0   | 1,0     | −0,6  | 0,0     |
| `escalador_unico`      | −0,7  | 1,0     | 0,0   | −0,5    | 1,0   | 0,2     |
| `general_completo`     | 0,1   | 0,9     | 0,9   | 0,0     | 0,7   | 1,0     |
| `general_montana`      | 0,0   | 1,0     | −0,4  | 0,0     | 0,9   | 1,0     |
| `sprinter_y_escalador` | 0,7   | 0,7     | 0,0   | 0,7     | 0,6   | 0,2     |
| `cazaetapas`           | 0,3   | 0,4     | 0,0   | 0,1     | 0,2   | −0,3    |
| `mixto`                | 0,4   | 0,4     | 0,2   | 0,3     | 0,3   | 0,4     |

Lectura, y son literalmente las frases del dueño: `sprinter_unico` en una clásica de montaña o en una
vuelta sin llano da negativo (S-004); `escalador_unico` en una clásica llana o en una vuelta de solo
llano y crono, también (S-005); `general_completo` vale más que `general_montana` cuando hay crono, y
al revés cuando no (S-006).

**Y la filosofía de la casa (S-003)** entra como sesgo: `shapeFit += PHILOSOPHY_SHAPE_BONUS`
(`sprints` → `sprinter_unico` +0,5; `clasicas` → `mixto` +0,4; `general` → las dos de general +0,5;
`cantera` → `cazaetapas` +0,3; `equilibrado` → 0). Es la misma mecánica que ya tiene `callupScore`
con `PHILOSOPHY_BONUS = 0,6`, aplicada un nivel más arriba.

**Paso B: llenar la escuadra con cupos, no con un ranking.**

```
forma = argmax(shapes disponibles con material en la plantilla, shapeFit)
cupos = SHAPE_QUOTA[forma]      // p.ej. sprinter_unico: {sprinter 1, lanzador 2, rodador 3, libre 2}
para cada cupo en orden de prioridad:
    elegir el mejor disponible por (afinidad al cupo · 1,0 + forma · 0,6 + frescura · 0,7
                                    + deseo · 0,5 + confianza · 0,4)
```

Es el mismo `callupScore` de hoy pero **por cupo**, y eso es lo que hace que el sprinter viaje con su
tren. Sin ello «una carrera mixta promedia afinidades y saca un fit intermedio para todos».

**El equipo pequeño (S-008).** Con `tamanoEscuadra < 7`, `SHAPE_DEGRADE` recorta cupos en orden
inverso de prioridad: primero los libres, luego el segundo lanzador, luego el cazaetapas. Con 4
hombres, `sprinter_unico` es «un sprinter y tres gregarios» y `sprinter_y_escalador` **no está
disponible**: no hay para dos cartas.

### 5.3 Cómo la estructura se traduce a papeles del día

Sustituye a `world/autoOrders.ts::assignTeam`, que hoy decide con `kind` y `gcRank` y **no ve el
final real, la forma del día, ni las órdenes humanas**.

```
función papelesDelDia(D: DirectorSeat, etapa, ordenesHumanas):
   final    = finalPrevistoDelPeloton(etapa)              # R17
   cartasHoy = D.estructura.cartas.filter(c => valeParaEsteFinal(c, final))
              .filter(c => aptoParaSerCarta(c))            # R08
   si cartasHoy vacío:
       # «el equipo del sprinter no tiene nada que hacer hoy» (S-050)
       motivo = 'combatividad' ó 'montana' ó 'ninguno'
       devolver reparto de cazaetapas + grupeto

   # los humanos primero: su hoja manda (§2.5)
   fijados = ordenesHumanas
   libres  = D.equipo \ fijados

   reparto = SHAPE_ROLES[D.estructura.shape][claseDe(final)]
   asignar(reparto, libres, respetando cartasHoy y exceptuados)

   # el error del director (R24)
   si rng < DIR.erraElReparto · (1 − D.calidad):
       intercambiar la carta con el segundo mejor
```

Tres consecuencias que hoy no ocurren y son filas del catálogo:

- **El equipo del sprinter en una reina (S-050)** deja de repartir gregarios de un jefe que no va a
  hacer nada y pasa a repartir cazaetapas: cuatro hombres a la fuga, cuatro al grupeto. Es lo que
  llena la fuga de veinte de una etapa de montaña.
- **El reparto de los gregarios entre dos cartas (S-051)** se hace por `SHAPE_ROLES` y no por
  `pickLeader`, que solo sabe elegir uno.
- **La media montaña (S-052, `CONTRARIO`)** se decide por el final previsto: la misma etapa de
  `kind: 'media'` puede ser del sprinter (final masivo tras la última cota lejos) o del escalador
  (final de puncheur). Hoy siempre es lo mismo.

### 5.4 Los motivos que faltan hoy

Hoy hay **tres** (`etapa`, `maillot`, `general`) y `ninguno`. Con eso, según el propio corpus, «dos
tercios del pelotón no tienen ninguna razón para correr». Los ocho que faltan están en R05 §1 y su
tabla de derechos en R05 §2. Los tres que más cambian la carrera:

1. **`montana`**, porque es el que llena la fuga de una etapa reina —cupo 2,0— y el que hace que las
   cimas se disputen por alguien.
2. **`puntos`**, porque introduce una conducta que hoy no existe entera: **cazar antes de la pancarta
   y dar cuerda después** (S-105). Un equipo que caza para su velocista en el km 90 y se sienta en el
   km 92 es una escena de carretera que el motor no puede producir.
3. **`combatividad` / `patrocinador`**, porque son el motivo de la mitad del pelotón de una carrera
   pequeña y explican el reparto tácito de las fugas (S-408).

### 5.5 Cómo cambia la estructura

**Solo por hechos**, y cada hecho tiene su regla:

| Hecho                                        | Regla                                                                                    | Situación    |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------ |
| La carta abandona                            | Hereda el mejor de los que quedan; los gregarios dependientes pasan a `libre` o al nuevo | S-190, S-390 |
| La carta pierde > `PLAN.perdidaQueDestituye` | Igual, y el motivo baja de `general` a `etapa`                                           | S-409        |
| El sprinter se descuelga / se cae            | En carretera, `RoadCaptain` cambia de baza en el mismo bloque (no espera al director)    | S-179        |
| Se gana el maillot                           | `shape` no cambia; el **motivo** sí, y con él el presupuesto (`CARRY.jerseyCoste`)       | S-395        |
| Se pierde el maillot                         | Vuelve al motivo anterior; el libro anota `planFallido`                                  | S-294        |
| Equipo mermado (< `CASA.minParaJugar`)       | `shape → cazaetapas`, motivo `combatividad`                                              | S-396        |
| El rival desaparece                          | Se recalculan `diasMarcados` y `colchonNecesario` esa misma noche                        | S-483        |
| Orden del jugador a mitad de etapa           | No existe (por diseño del dueño); lo que existe es el **disparador** (§6.2)              | S-197        |

Y **cambiar de estructura durante una carrera por etapas (S-392) cuesta**: cada cambio anota
`−PLAN.moralVictoria` de moral al equipo y se narra (`team_replans`). Un equipo que cambia de plan
tres veces en una vuelta es un equipo perdido, y tiene que notarse.

---

## 6. El jugador humano y el mánager

El modelo del juego es: **todo jugador es un ciclista**; unos pocos son además mánager (G2). Hoy
todos los equipos son bots con humanos dentro, y la mezcla está rota en un sitio muy concreto:
`autoStageOrders` reparte el equipo entero **sin saber qué escribió el humano**.

### 6.1 Qué puede ordenar, y qué no

**Lo que se queda igual**: sigue sin haber radio en vivo. El dueño lo tumbó con la razón correcta —«es
incompatible con avanzar un día cada seis horas»— y esta propuesta no lo reabre. La decisión viaja
**dentro del plan**.

**Lo que crece** (N1: «mejorar la granularidad de las instrucciones, con más escenarios hipotéticos
quizás»):

| Palanca                 | Hoy              | Propuesta                                                                                     |
| ----------------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| `role`                  | 7 valores        | igual, + `bajador`, `infiltrado`                                                              |
| `targetRiderId`         | 1 objetivo       | hasta 2 (`marcador` puede marcar a dos, con penalización: `wheelProbability` ya lo contempla) |
| `mentality`             | 4 valores        | igual                                                                                         |
| `effort`                | ±0,5 en el deber | **presupuesto personal del día**: toca apetito, cerillos y umbral de la reserva               |
| `triggerKm`             | un km            | `triggerAt`: km · kmToGo · puerto n.º · sector n.º · **condición**                            |
| `contestSprints/Climbs` | 2 casillas       | + `contestBonifs`, y las tres se leen también en la cima (hoy `disputeClimb` las ignora)      |
| —                       | —                | **`ordenDeCarrera`**: objetivo de la carrera entera (§6.3)                                    |
| —                       | —                | **`Disparador[]`**: hasta `N1.maxDisparadores` (4) condicionales (§6.2)                       |
| —                       | —                | **`noColaboroCon: teamId[]`** (S-256), hasta 2                                                |

**Lo que sigue sin poder expresar, y a propósito**: cambiar de idea durante la etapa; hablar con el
equipo (G7); negociar el rol (G2.15). Los tres son epics abiertos y no se adelantan aquí.

### 6.2 Los disparadores (N1)

```ts
interface Disparador {
  cuando: Condicion
  entonces: Accion
  unaVez: boolean // por defecto true
  vigenciaKm?: [number, number]
}

type Condicion =
  | { tipo: 'km'; km: number }
  | { tipo: 'kmToGo'; km: number }
  | { tipo: 'puerto'; indice: number; parte: 'pie' | 'medio' | 'lo_mas_duro' | 'cima' }
  | { tipo: 'sector'; indice: number }
  | { tipo: 'hueco_de_la_fuga'; mas_de: number } // «si la fuga pasa de 2 min, tiro»
  | { tipo: 'mi_jefe_descolgado'; mas_de: number } // «espérale»
  | { tipo: 'ataca'; riderId: string } // «ataco si salta Z»
  | { tipo: 'grupo_menor_de'; n: number }
  | { tipo: 'llueve' }
  | { tipo: 'viento_lateral' }
  | { tipo: 'voy_perdiendo'; segundos: number }

type Accion =
  | { tipo: 'ataco' }
  | { tipo: 'sigo' }
  | { tipo: 'tiro' }
  | { tipo: 'no_tiro' }
  | { tipo: 'espero'; a: string }
  | { tipo: 'me_dejo_caer' }
  | { tipo: 'cambio_effort'; a: Effort }
  | { tipo: 'cambio_mentalidad'; a: Mentality }
  | { tipo: 'me_coloco' }
```

**Cómo se evalúan**: en el tic de kilómetro del `RiderAgent`, contra su **propia** vista. Y aquí hay
una decisión de diseño que importa: un disparador que depende de `hueco_de_la_fuga` se evalúa contra
`RaceView.frente[0].huecoCreido`, **no contra la verdad**. O sea: la orden del jugador se ejecuta con
la misma información imperfecta que la del bot. Es lo justo y es lo que hace que un humano en un
equipo con buen director juegue mejor —que es, además, la forma sana de que G9 no sea una humillación
artificial—.

**Qué hacen los disparadores con la precedencia**: un disparador es una **orden individual** y por
tanto manda sobre el plan (§2.5) con su tabla de choque. Si `entonces` choca con el papel del día
(«ataco» siendo `lanzador` de alguien que va en el grupo), se ejecuta y el equipo retira el apoyo, y
**se avisa en la pantalla antes de guardar**.

### 6.3 El objetivo de carrera del jugador

```ts
interface OrdenDeCarrera {
  raceKey: string
  objetivo: 'general' | 'una_etapa' | 'montana' | 'puntos' | 'joven' | 'estar' | 'ayudar_a'
  ayudarA?: string
  diasMarcados: number[] // hasta PLAN.fraccionMarcada · dias
  reparto: 'a_saco' | 'equilibrado' | 'guardar_para_los_marcados'
}
```

Cierra S-022, S-026 y buena parte de R10 para el humano. Y es lo que permite que el director bot
**cuente con él**: si el humano declara `general` y sus atributos lo sostienen, la estructura del
equipo puede salir `general_montana` **con él de carta**. Ése es el momento en que el juego deja de
ser «rellena una hoja» y pasa a ser «negocia tu sitio en el equipo», que es lo que G2.15 pide.

### 6.4 Cómo conviven órdenes humanas y bots en un mismo equipo

Cuatro reglas, y las cuatro son cambios pequeños con efecto grande:

1. **`autoOrders` recibe las órdenes humanas.** Firma nueva:
   `assignTeam(riders, stage, ordenesFijadas)`. Reparte **con los que quedan**. Cierra S-054, S-060
   («el motor le pone de lanzador de sí mismo») y la mitad de S-058.
2. **`pickLeader` no nombra jefe a quien no lo pidió.** Un humano `libre` no puede ser votado jefe
   por sus gregarios bot. Cierra S-058 y la deuda 1 del mapa del jugador humano
   («nadie mira si el jefe quiere ser jefe»).
3. **Dos humanos en el mismo equipo (S-061).** Hoy «no hay ninguna regla que los relacione» y cada
   uno rellena su hoja sin ver la del otro. Regla mínima: **se ven las hojas** dentro del mismo
   equipo (la API ya tiene el dato) y, si los dos se declaran `lider`, el director **elige uno y lo
   dice**: el otro es exceptuado con `desviacion 0,3`, no rebelde con 1. Un compañero que quiere ser
   jefe no es un traidor.
4. **La desviación cuesta y cumplir paga** (R25). Es lo que quita del tablero «la estrategia óptima
   pasa a ser ir siempre de líder».

**El aviso, que es la mitad del asunto.** `raceOrdersAdvice` hoy no ve el equipo ni la general.
Reglas nuevas: «tu equipo ya tiene jefe hoy y no eres tú: si te declaras líder correrás por tu
cuenta»; «tu disparador del km 80 cae en pleno puerto: llegarás sin cerillos»; «marcas a X y X no
está convocado»; «tu equipo no tiene sprinter y tú te pones de lanzador». Ninguna prohíbe: **todas
avisan**, que es la doctrina que ya tiene la pantalla.

### 6.5 El mánager (G2)

Lo que esta propuesta le da al mánager humano **sin construir G2**:

- El `DirectorSeat` es exactamente la silla del mánager. Un mánager humano **sustituye las decisiones
  del bot en su asiento**, una a una y opcionalmente: fijar la `RaceStructure` de una carrera, marcar
  días, escribir la política de caza (S-071: `politicaDeCaza: 'siempre' | 'si_amenaza' | 'nunca'`), y
  nombrar cartas. Lo que **no** hace es escribir las órdenes de los demás corredores humanos: eso es
  «POLÍTICAS en vez de órdenes» y es la doctrina de G2.
- El `structureLog` (quién fue carta y por qué) es el dato con el que G2.4 y G2.15 pueden existir:
  un mánager que se nombra siempre queda registrado, y sus corredores lo ven.
- La `calidad` del `DirectorSeat` de un equipo con mánager humano **es la del humano**: si juega
  bien, su equipo lee mejor la carrera. Es la forma correcta de que «pagar da AUTORIDAD, no vatios».

---

## 7. Los bancos que hacen falta

`docs/tactica.md` §4 encontró lo más incómodo de todo este trabajo: **el banco no reproduce casi nada
de lo que el dueño ve**. «Gana el mismo dos etapas seguidas» mide 1,8 % (1 de 57); «seis del mismo
equipo en una fuga de nueve», el peor caso del banco es 4 de 20 y solo en el 0,9 % de las fotos. Las
dos medidas son limpias y las dos dicen «aquí no pasa».

La conclusión de método es la que ordena esta sección: **el defecto vive en lo que la producción
añade y el banco no tiene** —campos pequeños con pocos equipos, la general de verdad, las órdenes
automáticas del día y el estado que se arrastra—. Así que **el primer paso del plan no es código de
motor: es un banco**.

### 7.1 El banco que no existe: la carrera pequeña

**Qué falta.** Ceguera nº 1 del mapa de bancos: «los canónicos son 176 en 22×8; los generados son
≥ 18×7 = 126. El único campo pequeño de CI es `teamedField` 8×5 = 40 y solo para la voz de la
crónica. **Nada mide una carrera de 5-10 equipos de 4-6** (ni con órdenes, ni con general)».

**`sim/smallField.ts`** — ocho carreras reales pequeñas (lista CERRADA, como `SMALL_TOURS`), corridas
enteras, con:

- **Campo**: 6-10 equipos de 4-6 hombres, entre 30 y 55 corredores. Divisiones mezcladas (2 WT, 3
  PRS, 4 CON) para que la `calidad` de dirección varíe de verdad (R24).
- **General arrastrada** y `autoStageOrders` con `gcRank`, como `smallTours`.
- **Clasificaciones secundarias activadas** (montaña, puntos, joven, equipos) — hoy no existen en
  ningún banco (ceguera nº 8).
- **`carry` entre etapas** (R08) y **libro del director** (R09).
- **Órdenes del jugador inyectadas** en 2 de los 8 escenarios (§7.2).

**Qué mide, y es todo lo que hoy es invisible:**

| Estadística               | Racimo | Banda propuesta             | Por qué                                              |
| ------------------------- | ------ | --------------------------- | ---------------------------------------------------- |
| `breakTeamConcentration`  | R03    | mediana ≤ 0,34; peor ≤ 0,55 | La queja literal: 6 de 9 = 0,67                      |
| `breakTeamsRepresented`   | R03    | ≥ 0,70 · min(n, eq)         | «Un hombre por equipo»                               |
| `duoWinShare`             | R02    | 55-80 %                     | «Dos compañeros en una fuga de tres, y gana el otro» |
| `duoBothAttackPct`        | R02    | 0-12 %                      | Que no salten los dos                                |
| `winnerRepeatConsecutive` | R09    | 0-8 %                       | La queja que el banco grande no reproduce            |
| `frontTeamsPerStage`      | R20    | 2,2-5                       | Sube desde la banda de hoy (1,8-4)                   |
| `chaseCostShare` (Gini)   | R20    | 0,25-0,55                   | Que la caza se reparta y no del todo                 |
| `motiveMix.ninguno`       | R05    | ≤ 25 %                      | Que el pelotón tenga razones                         |
| `qualityGradient`         | R24    | 1,25-1,80×                  | La banda de G9                                       |
| `domestiqueShare`         | R21    | 45-62 %                     | Hoy 70 %, deuda 14 del §14                           |
| `medianLeadGroupRiders`   | R17    | 4-12                        | Hoy 1, e impreso como DEUDA sin banda                |

**Coste.** Una carrera pequeña de 5 etapas con 45 corredores cuesta, escalando desde el dato medido
(una gran vuelta de 21 × 176 ≈ 57 s local): `5 × (57/21) × (45/176) ≈ 3,5 s` local. Ocho carreras × 6
semillas = **≈ 168 s local → ≈ 300 s en CI** (factor 1,8 medido). Presupuesto ×4 = **1.200 s**, que
se redondea a **1.500 s (25 min de timeout, ≈ 5 min de coste real)**.

### 7.2 El banco de órdenes (ceguera nº 7)

`sim/orders.ts`. Hoy **ningún banco varía una orden del jugador**. Sin él, la queja «el resultado es
casi lo mismo ponga lo que ponga ahí» no se puede refutar ni confirmar.

**Método**: el mismo corredor, el mismo campo, las mismas semillas, **una palanca cambiada**.
16 semillas × 3 escenarios (llana, media, reina) × 8 variaciones de palanca = 384 etapas de 45
corredores ≈ **210 s local → 380 s CI**, presupuesto **1.500 s**.

**Qué mide**: `orderEffect[palanca]` = fracción de semillas en que el resultado cambia. Banda
propuesta: **cada palanca ≥ 1 de cada 8** (0,125). Y una segunda, más fina: `orderDirection` = que el
cambio vaya en la dirección prometida por la pantalla (un `a_tope` no puede acabar de media más
arriba que un `ahorrar`). Esa es **tolerancia cero**: si la pantalla promete algo, el motor lo cumple.

### 7.3 Los bancos que ya existen y cambian

| Banco                     | Qué se le añade                                                                             | Coste extra         |
| ------------------------- | ------------------------------------------------------------------------------------------- | ------------------- |
| `smallTours` (inv. 37-43) | Las estadísticas de equipo de §7.1, sobre el mismo run. **No cuesta nada más.**             | 0 s                 |
| `grandTour` (inv. 25-30)  | `jerseyTeamDecay`, `gcLeashSpread`, `lostTimeReaction`, `truceLatencyKm`                    | 0 s (mismo run)     |
| `realQueens` (inv. 32-33) | `medianLeadGroupRiders` con banda; `bloodSmellAttacks`                                      | 0 s                 |
| `calendarQueens`          | `queenDPlus` y `lastClimbToFinish` — **sin simular**, solo generando perfiles               | +12 s               |
| `timeTrials` (inv. 9-12)  | `ttPacingSpread`, `ttChaseReaction`, `ttIncidents`                                          | +90 s (2 variantes) |
| `sim/tactics.ts`          | `analyzeVariety`, `analyzeUphillFinish`, los dos campos de sprint: **pasan a CI con banda** | +240 s              |
| `coherence.ts`            | `votoSinExplicar`, `frenteSinSubasta`; `ataqueSinCerrar` a 0                                | 0 s                 |
| `world.ts`                | `defianceCost` (R25)                                                                        | +25 s (2.º brazo)   |

### 7.4 Los invariantes nuevos

Trece, agrupados por lo que vigilan. Los cinco primeros son **de control**: no miden conducta nueva,
vigilan que este trabajo no se salga de su parcela.

**De control (no pueden moverse):**

1. **La física no se ha movido**: invariantes 13-20 (erosión y saturación) siguen en banda **con los
   mismos números**. Si se mueven, la tanda táctica ha filtrado a la física.
2. **La ley de velocidad no se ha movido**: invariante 43 (llana > media > reina) intacto.
3. **Los andamios no cambian nada**: pasos 1-2 de §8 → las cuatro huellas selladas **idénticas dígito
   a dígito**.
4. **Un campo sin equipos se comporta como antes**: invariante 24, ampliado — con `teamId: null` en
   todos, **ninguna** de las piezas nuevas se activa (ni Mesa, ni ficha de casa, ni subasta).
5. **Un director de calidad 1 con información perfecta reproduce la conducta de hoy** (±ruido): es
   el A/B que demuestra que R24 es una capa y no un cambio de conducta encubierto.

**De conducta (nuevos):**

6. «Nadie persigue a su propio hombre» (R01): < 3 % de bloques.
7. «Ninguna fuga es de una sola casa» (R03): `breakTeamConcentration` peor ≤ 0,55.
8. «Dos compañeros no atacan juntos» (R02): `duoBothAttackPct` ≤ 12 %.
9. «El colchón se estrecha con la carrera» (R04): decreciente semana 1 → 3.
10. «El que paga las pancartas es el que las disputa» (R06): 100 %.
11. «El frente cambia de manos y se reparte» (R20): `frontTeamsPerStage` 2,2-5 y Gini 0,25-0,55.
12. «Los intentos no se apagan a mitad de etapa» (R19): `attemptsAfterHalfPct` ≥ 25 %.
13. «Cada palanca del jugador mueve la carrera» (R22): `orderEffect` ≥ 0,125 en las siete.

### 7.5 El coste en minutos de CI, con la cuenta hecha

La regla de la casa es **presupuesto ≥ 4× el coste medido**, y hoy el job `Bancos de simulación`
tarda «nueve minutos» y solo corre si el diff toca `packages/engine/`.

| Concepto                      | Coste CI actual | Coste CI propuesto | Δ            |
| ----------------------------- | --------------- | ------------------ | ------------ |
| Invariantes existentes (1-46) | ~536 s          | ~536 s             | 0            |
| Coherencia                    | ~230 s          | ~230 s             | 0            |
| `calendarQueens`              | ~840 s          | ~852 s             | +12 s        |
| `world`                       | ~12 s           | ~37 s              | +25 s        |
| **`smallField` (nuevo)**      | —               | **300 s**          | **+300 s**   |
| **`orders` (nuevo)**          | —               | **380 s**          | **+380 s**   |
| `sim/tactics.ts` con banda    | 0 (fuera de CI) | 240 s              | +240 s       |
| `timeTrials` ampliado         | ~250 s          | 340 s              | +90 s        |
| **Total**                     | **≈ 1.868 s**   | **≈ 2.915 s**      | **+1.047 s** |

**+17,5 minutos de CI**, de 31 a 49 minutos para el job completo de bancos. Es mucho, y hay tres
formas de pagarlo, en orden de preferencia:

1. **`smallField` y `orders` corren solo cuando el diff toca la táctica** (`stage/tactics.ts`,
   `stage/teamPlan.ts`, `race/`, `world/autoOrders.ts`), igual que hoy `test:bancos` solo corre si el
   diff toca `packages/engine/`. Coste típico de un PR: +0 s.
2. **Bajar semillas de `smallField` de 6 a 4** en el job de PR y dejar 8 en el nocturno. −100 s.
3. **Retirar del CI diurno los invariantes 16 y 20** (1.200 s y 1.800 s de timeout, 259 s y 434 s de
   coste), que son controles de saturación de movimiento lento, y dejarlos solo en el nocturno.
   −693 s. **Esto sí es una decisión del dueño** (§10).

Recomendación: **(1) siempre, (2) si el nocturno vuelve a caerse**, y (3) solo si hace falta.

---

## 8. Plan de implementación por pasos

Ordenado **por dependencia, no por importancia**. Cada paso dice qué racimos cierra, qué ficheros
toca, si mueve huellas o bandas, cuál es el criterio de «hecho» y qué modelo puede programarlo.

Criterio de modelo: **Haiku** para trabajo mecánico con contrato cerrado (mover campos, rellenar
tablas, escribir tests de estructura); **Sonnet** para todo lo que tenga una decisión dentro
(fórmulas, calibración, reescribir una función que ya funciona). Ningún paso pide Opus: el diseño
está aquí; lo que queda es ejecución.

| #      | Paso                                               | Racimos                      | Ficheros                                                                                                 | Huellas / bandas                                                                                               | «Hecho» cuando                                                                                                                      | Modelo |
| ------ | -------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **0**  | **El perfil que se lee es la carretera**           | R28 (S-451, S-486)           | `profileGen.ts`, `featureProfile.ts`, `sim/calendarQueens.ts`                                            | Ninguna huella (los canónicos son a mano). Mueve `calendarQueens.breakawayWinPct`                              | `queenDPlus` mediana 3.000-4.500 m y `lastClimbToFinish` con la distribución de R28 §3                                              | Sonnet |
| **1**  | **El banco de carrera pequeña**                    | —                            | `sim/smallField.ts` (nuevo), `sim/targets.ts`                                                            | **Ninguna**. Solo mide                                                                                         | El banco corre en CI en < 350 s y **reproduce al menos una** de las dos quejas del dueño (concentración de fuga o ganador repetido) | Sonnet |
| **2**  | **Los tres contextos, vacíos**                     | —                            | `stage/context.ts` (nuevo), `stage/group.ts`, `stage/simulate.ts`                                        | **Las cuatro huellas idénticas dígito a dígito**                                                               | `SelfView`/`GroupView`/`RaceView` se construyen y llegan a `tactics.ts`, y **nadie los lee todavía**                                | Haiku  |
| **3**  | **El asiento del director**                        | R21 (parcial), R24 (parcial) | `race/director.ts` (nuevo), `stage/teamPlan.ts`, `world/autoOrders.ts`                                   | Huellas idénticas si `calidad = 1` y `lag = 0`                                                                 | El `DirectorSeat` sustituye a `buildTeamPlans` con la misma salida; invariante 5 de §7.4 en verde                                   | Sonnet |
| **4**  | **La aduana como voto**                            | R03                          | `stage/mesa.ts` (nuevo), `stage/tactics.ts` (`pelotonAllows`), `stage/simulate.ts`                       | **Mueve las cuatro.** Mueve `flat/mountain.breakawayWinPct`                                                    | `breakTeamConcentration` y `breakTeamsRepresented` en banda; `flat.breakawayWinPct` sigue en 5-16 o se re-ancla con causa           | Sonnet |
| **5**  | **Compañeros y superioridad numérica**             | R01, R02                     | `stage/tactics.ts`, `stage/finish.ts`, `stage/simulate.ts` (`relayTurn`)                                 | **Mueve las cuatro.** Mueve `finishRoleWeight`                                                                 | `duoWinShare` 55-80 %, `duoBothAttackPct` ≤ 12 %                                                                                    | Sonnet |
| **6**  | **La general virtual y el colchón**                | R04                          | `race/gc.ts` (nuevo), `stage/simulate.ts` (`gcLeash`, controlador)                                       | Mueve las dos reinas. **Retira `gcControlLeash`**                                                              | `gcChaseAim` ≥ 80 %; el colchón decrece semana a semana                                                                             | Sonnet |
| **7**  | **El pulso por el frente**                         | R20                          | `stage/mesa.ts`, `stage/teamPlan.ts` (`frontClaim`), `stage/simulate.ts`                                 | **Mueve las cuatro.** Mueve `frontTeamsPerStage`                                                               | `frontTeamsPerStage` 2,2-5 y Gini 0,25-0,55                                                                                         | Sonnet |
| **8**  | **El vocabulario de motivos**                      | R05, R07                     | `race/motivos.ts` (nuevo), `world/autoOrders.ts`, `stage/simulate.ts` (banners), `db/` (clasificaciones) | Mueve `teamPullWithReasonPct` e **invalida la aserción `reasons.etapa > maillot + general`** del invariante 23 | `motiveMix.ninguno` ≤ 25 %; las cuatro secundarias se reparten por motivo                                                           | Sonnet |
| **9**  | **Las fases y los dos topes**                      | R19                          | `stage/simulate.ts` (`attemptFrom`, `closingNow`), `constants.ts`                                        | **Mueve las cuatro.** Retira `tacticMaxMoves`                                                                  | `attemptsAfterHalfPct` ≥ 25 % y ninguna banda de fuga fuera                                                                         | Sonnet |
| **10** | **La colaboración con turno y duración**           | R18                          | `stage/coop.ts` (nuevo), `stage/simulate.ts` (`relayTurn`)                                               | Mueve las dos reinas. Mueve `soloWinPct`                                                                       | `turnDuration` medible; `soloWinPct` en media montaña 12-30 %                                                                       | Sonnet |
| **11** | **El tipo de final por grupo**                     | R17, R16                     | `stage/finish.ts`, `world/autoOrders.ts`, `stage/simulate.ts`                                            | **Mueve las cuatro.** Mueve `medianLeadGroupRiders` (que gana banda)                                           | `medianLeadGroupRiders` 4-12; `roleFromFinish` ≥ 85 %                                                                               | Sonnet |
| **12** | **La posición como recurso**                       | R15                          | `stage/posicion.ts` (nuevo), `stage/simulate.ts` (abanico, pavé, criba)                                  | **Mueve las cuatro.** Roza `queenLastGroupPct`                                                                 | `placementCostShare` 5-15 %; `echelonAuthored` ≥ 60 %                                                                               | Sonnet |
| **13** | **La información imperfecta**                      | R24 completo                 | `race/pizarra.ts` (nuevo), `race/director.ts`                                                            | Mueve las cuatro. **Ninguna banda de física**                                                                  | `qualityGradient` 1,25-1,80×; invariante de control 5 en verde con `calidad = 1`                                                    | Sonnet |
| **14** | **Percances y caídas**                             | R11, R12                     | `stage/mishap.ts` (nuevo), `stage/crash.ts`, `stage/timetrial.ts`                                        | Mueve `crashPct`. **Despierta `timeCutItt`**                                                                   | `mishapsPerStage` en banda; `ttIncidents` > 0                                                                                       | Sonnet |
| **15** | **La memoria entre etapas**                        | R08, R09, R10, R25           | `race/libro.ts` (nuevo), `db/stageRun.ts`, `db/calendarRun.ts`                                           | Mueve `grandTour` entero                                                                                       | `winnerRepeatConsecutive` 0-8 %; `markedDayShare` ≥ 0,40                                                                            | Sonnet |
| **16** | **Las estructuras de equipo y la convocatoria**    | R21 completo                 | `race/structure.ts`, `world/callups.ts`, `world/autoOrders.ts`                                           | Mueve **todos** los bancos con campo generado                                                                  | `structureMix` sin forma > 40 %; `domestiqueShare` 45-62 %                                                                          | Sonnet |
| **17** | **El jugador: disparadores y objetivo de carrera** | R22, R06 (banners humanos)   | `shared/contracts.ts`, `db/raceOrders.ts`, `apps/web`, `stage/simulate.ts`                               | Ninguna huella (los canónicos no llevan órdenes de jugador)                                                    | Banco `orders` en verde: las siete palancas ≥ 0,125                                                                                 | Sonnet |
| **18** | **Meteorología con previsión**                     | R14                          | `stage/weather.ts`, `world/climate.ts`, `apps/web`                                                       | Roza `crashPct` y las clásicas                                                                                 | `windDirectionEffect` ≥ 3 km/h; `echelonCloses` 30-70 %                                                                             | Haiku  |
| **19** | **La crono como modo**                             | R27                          | `stage/timetrial.ts`, `race/director.ts`                                                                 | Mueve `timeTrials` entero                                                                                      | `ttPacingSpread` 8-30 s                                                                                                             | Sonnet |
| **20** | **El grupeto contra el reloj**                     | R26                          | `stage/simulate.ts` (grupetos, `applyStageTimeCut`)                                                      | **Mueve `queenLastGroupPct`** (§9)                                                                             | `grupetoMargin` 45-180 s; `outOfTimePct` sigue en 1-15 %                                                                            | Sonnet |
| **21** | **El relato**                                      | R23                          | `stage/events.ts`, `stage/journal.ts`, `apps/api`, `db/raceReport.ts`                                    | Ninguna de conducta; mueve `coherence`                                                                         | `ataqueSinCerrar` a 0; los dos defectos nuevos a 0                                                                                  | Haiku  |

**Dependencias duras** (lo que no se puede adelantar):

- **0 antes que todo lo de montaña**: sin el perfil bien escrito, R03/R17/R26 no se pueden medir.
- **1 antes que 4**: la aduana hay que medirla donde vive el defecto.
- **2 antes que 3-13**: los contextos son el andamio de todo.
- **3 antes que 4, 7, 8, 13**: el asiento antes que lo que el asiento decide.
- **11 antes que 16**: la estructura elige por final previsto; el final previsto tiene que existir.
- **15 después de 3**: la memoria vive en el asiento.

**Dónde parar si hay que parar.** Con los pasos **0-7** ya está la mitad del catálogo y las cinco
filas más graves con cita del dueño: S-176, S-451, S-486, S-047 (parcial) y S-114. Es un corte
honesto y deja el motor coherente.

---

## 9. Lo que esto mueve y hay que decidir en bloque

Tabla única. Todo lo que este diseño movería —bandas de `targets.ts`, listones de
`invariants.test.ts`, huellas selladas y constantes con historia—, con el valor de hoy, el propuesto
y el porqué. **Nada de esto se mueve en silencio ni se ajusta para que el diseño pase**: se propone y
se decide junto.

### 9.1 Bandas de `sim/targets.ts`

| Banda                              | Hoy                                        | Propuesto           | Por qué                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------- | ------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `flat.breakawayWinPct`             | 5-16 %                                     | **5-16 %**          | **No se mueve.** Es el control de que la aduana no rompe el llano. Si sale, el que está mal es el cambio.                                                                                                                                                                                                                      |
| `mountain.breakawayWinPct`         | 25-45 %                                    | **retirar**         | Vive sobre `reina-150`, que el propio `targets.ts` reconoce que «no es una etapa reina sino media montaña con la etiqueta cambiada» (v44), y cae de 26,7 % a 0 % según el puerto pase de 15 a 50 km. Se sustituye por `calendarQueens` (real, sistemático) y por el escenario nuevo de §9.4.                                   |
| `mountain.top10GapSeconds`         | 40-300 s                                   | **60-320 s**        | El suelo bajó a 40 en v49 «por decisión del dueño, no porque un número no pasara», para salir de una nube. Con R17 y R02 el grupo de cabeza deja de ser 1 y la brecha crece por la razón correcta: se devuelve el suelo a 60 y se sube el techo un 7 %. **[calibrar]**                                                         |
| `chronicle.frontTeamsPerStage`     | 1,8-4                                      | **2,2-5**           | Con la subasta (R20) el frente se reparte de verdad. «Uno solo todo el día sería un plan de cartón; ocho sería no tener plan» sigue valiendo; el rango se desplaza.                                                                                                                                                            |
| `chronicle.teamPullFlatPct`        | 50-85 %                                    | **65-92 %**         | Con once motivos casi todo relevo tiene dueño nombrable. El 50 % de hoy describía un motor sin motivos.                                                                                                                                                                                                                        |
| `chronicle.teamPullWithReasonPct`  | 95-100 %                                   | **100 %**           | Con `motivoActivo` explícito ya no hay relevo sin razón. Pasa a tolerancia cero.                                                                                                                                                                                                                                               |
| `smallTours.bestSprinterWinPct`    | 25-60 %                                    | **20-55 %**         | Con la cesión (R02) y los trenes encadenados (R16) el mejor sigue ganando, pero el segundo de casa deja de estorbarle y otros equipos compiten mejor. **[calibrar]**                                                                                                                                                           |
| `smallTours.sweepPct`              | 0-30 %                                     | **0-22 %**          | «Al que ganó ayer le miran» (R09) tiene que bajar los repókeres. Medido hoy 9,7 %: hay margen.                                                                                                                                                                                                                                 |
| `smallTours.mediaGroups`           | 3-8                                        | **4-10**            | La media montaña con final previsto por grupo (R17) y la colaboración que se rompe (R18) parten más.                                                                                                                                                                                                                           |
| `smallTours.mediaOneGroupPct`      | 0-20 %                                     | **0-12 %**          | Su comentario dice «EL TECHO NO ES EL OBJETIVO, ES EL MARGEN QUE HOY SE PUEDE SOSTENER». Con R18 se puede sostener menos.                                                                                                                                                                                                      |
| `smallTours.flatMoveWorstMarginS`  | 0-900 s                                    | **0-1.200 s**       | `PULSO.leashBase` es 1.200 s por la cita del dueño («15 o 20 minutos»). Hoy la banda topa en 15 min; se sube al techo de la cita.                                                                                                                                                                                              |
| `smallTours.medianLeadGroupRiders` | **sin banda** (mide 1, impreso como DEUDA) | **4-12, con banda** | Es el encargo del dueño («5-15 y no 1») convertido en objetivo. Se baja el suelo a 4 y se topa en 12 por lo dicho en R17.                                                                                                                                                                                                      |
| `grandTour.queenLastGroupPct`      | 8-14 %                                     | **8-18 %**          | La deuda 2 del §14 dice literalmente que arreglar el grupeto «pide que la cola de las reinas pueda pasar del 14 %», y que es «una banda con ancla en §VI.3 que no se mueve sin decisión del dueño». **Aquí se pide esa decisión.** El techo 18 % es `STAGE.timeCutQueen`, o sea: la cola puede llegar hasta el corte y no más. |
| `abandonCauses.*`                  | 30-67 / 20-67 / 1-15                       | **sin cambio**      | Con percances (R11) la mezcla puede moverse. **Se mide antes de tocar**; si `crashPct` roza el techo de 67 se decide aparte, porque ya está anotado como deuda desde la v20.                                                                                                                                                   |
| `calendarQueens.breakawayWinPct`   | 6-30 %                                     | **6-30 %**          | **No se mueve.** El dueño la cerró con «está bien así» sobre 18,1 %. Es el control de que R03 y R28 no rompen la montaña.                                                                                                                                                                                                      |
| `erosion.*` (5 bandas)             | —                                          | **sin cambio**      | Invariante de control nº 1 (§7.4). Que no se muevan es la prueba de que esto no ha filtrado a la física.                                                                                                                                                                                                                       |
| `timeTrial.*`, `timeTrials.*`      | —                                          | **sin cambio**      | R27 cambia la conducta, no el reparto de tiempos. Si se mueven, la dosificación está mal dimensionada.                                                                                                                                                                                                                         |

### 9.2 Listones que actúan como banda dentro de `invariants.test.ts`

| Listón                                      | Hoy    | Propuesto      | Por qué                                                                                                        |
| ------------------------------------------- | ------ | -------------- | -------------------------------------------------------------------------------------------------------------- |
| `capturePct`                                | > 85   | **> 78**       | Con la segunda fuga del día (R03 §9) y el flyer (R19 §5) nacen más movimientos, y no todos se cazan.           |
| `relayWork / shelteredWork`                 | > 1,10 | **> 1,10**     | No se mueve: es el control de que el turno sigue costando.                                                     |
| pavés 5-12 %                                | —      | **5-14 %**     | Con pinchazos (R11) el pavé se lleva más gente. **[calibrar]**                                                 |
| Giro e9 `biggestGroupPct ≤ 33`              | —      | **≤ 30**       | Con R17 la etapa reparte más. La queja original era «el 150.º solo perdió 26 segundos».                        |
| `SATURATION_DEPLETION` 0,96                 | —      | **sin cambio** | Control de física.                                                                                             |
| `SATURATION_BONK_PCT` 12                    | —      | **sin cambio** | Control de física.                                                                                             |
| inv. 23 `reasons.etapa > maillot + general` | —      | **reescribir** | Con once motivos la aserción deja de tener sentido: pasa a `reasons.ninguno ≤ 25 %` y `reasons.distintos ≥ 5`. |
| `coherence.ataqueSinCerrar`                 | tol. 2 | **tol. 0**     | Con `CRONICA.protagonistasMax` = 5 (R23 §3) desaparece la causa que obligaba a tolerar dos.                    |

### 9.3 Huellas selladas

| Huella        | Cuándo se mueve                  | Predicción declarada                                                                                                                                                          |
| ------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `llana-180-0` | Pasos 4, 5, 7, 9, 11, 12, 13, 14 | Gana un `spr-*`; el pelotón sigue llegando junto (≥ 170 de 176). Cambia el orden dentro del reloj y **quién va en la fuga**.                                                  |
| `llana-180-1` | Igual                            | Igual.                                                                                                                                                                        |
| `reina-150-0` | Pasos 4, 5, 6, 9, 10, 11, 12, 13 | **Cambia de ganador**: hoy gana un corredor de relleno (`pel-105`) y con R17+R02 tiene que ganar uno de los `gc-*` o `bar-*`. Los relojes distintos suben de 44 hacia arriba. |
| `reina-150-1` | Igual                            | Hoy gana `gc-0` **en solitario a +92 s del segundo grupo**. Con R17 §4 y R18 el grupo de cabeza tiene que llegar con 4-12, o sea: **este sello dice si el racimo funciona**.  |

Y una regla de método: **cada paso resella con su causa escrita y comprueba antes de tocar que se
mueve donde debe**. Es lo que ya se hizo en v41, v42, v46, v49 y v58.

### 9.4 Escenarios canónicos

| Escenario   | Hoy                                                | Propuesto                                                                                                                                                              |
| ----------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `llana-180` | 176 en 22×8, volante km 100                        | **Sin cambio.** Es el ancla del llano.                                                                                                                                 |
| `reina-150` | 135 km llano + puerto de 15 km al 8 %, **1.200 m** | **Renombrar a `media-150`** y crear **`reina-real`** sobre un recorrido real de 3.500-4.500 m con final en alto. `targets.ts` ya reconoce que «no es una etapa reina». |
| `media-190` | Informativo, sin banda, fuera de CI                | **Entra en CI con banda** (`mediaGroups`, `soloWinPct`): es donde vive la deuda 4 del §14 y donde R18 se mide.                                                         |
| `cri-40`    | 40 corredores sin equipos                          | **+ una variante con equipos y general** para R27 §2 (las referencias del rival).                                                                                      |
| —           | —                                                  | **`pequena-45`** (nuevo, §7.1): 45 corredores en 8 equipos de 5-6.                                                                                                     |

### 9.5 Constantes con historia que se retiran o cambian de dueño

| Constante                    | Hoy                | Qué pasa                                                                                                                        |
| ---------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `tacticMaxMoves`             | 3                  | **Se retira** (R19 §2, S-444). Es un tope contable por encima de toda la táctica.                                               |
| `closingNow` (rama)          | —                  | **Se retira** (R19 §3, S-487). Se sustituye por «el que cierra no ataca».                                                       |
| `teamAttackUpTheRoad`        | 0,4                | **Se retira**, sustituida por `CASA.cupoFuga^n` (R03 §6): «binario y flojo, el mismo con uno delante que con cinco».            |
| `gcControlLeash`             | 700                | **Se retira**, sustituida por `colchonNecesario` (R04 §3). Su comentario ya «queda desmentido por la medida» (deuda 5 del §14). |
| `tacticAllowBase`            | 0,3                | Pasa a `PULSO.aduanaBase` con **el mismo valor**, para que `cuerda = 0` reproduzca la conducta de hoy.                          |
| `coopReviewBlocks`           | 20                 | Pasa a `COOP.revisionKm` = 1 km (petición literal del dueño).                                                                   |
| `finishRoleWeight[gregario]` | 0,88               | **Sube a 0,94** cuando exista R02: el 0,88 era el parche de la v48 para el problema que R02 resuelve de verdad.                 |
| `breakawaySkipSprThreshold`  | 70                 | Pasa de absoluto a **percentil del campo del día** (p90 de SPR), para que funcione en continental.                              |
| `breakScore` (`autoOrders`)  | fórmula de rodador | **Se retira**, sustituida por `candidatoDeFuga` (R03 §7). Es la fila `CONTRARIO` nº 10.                                         |
| `SPRINTER_MIN`               | 68                 | Ya marcado como **[DECISIÓN DEL DUEÑO 25]** en `diseno-entrenamiento.md` §6: pasa a percentil. Se hereda, no se reabre.         |

### 9.6 Recuento

**19 bandas** tocadas (11 se mueven, 6 se confirman explícitamente, 2 se retiran), **8 listones**,
**4 huellas selladas**, **5 escenarios**, **10 constantes con historia**. Más **≈ 120 constantes
nuevas** en cuatro espacios de nombres (`CASA`, `PULSO`, `DIR`, y los de racimo), de las cuales 31
están derivadas de números que ya existen y el resto marcadas **[calibrar]**.

---

## 10. Decisiones que son del dueño

Once, cada una con recomendación. Las cinco primeras son las que bloquean el plan.

**1. ¿Se acepta el asiento del director como objeto de primera clase?**
Es la decisión de fondo. Todo lo demás cuelga de que exista un `DirectorSeat` por equipo, con estado
que sobrevive a la etapa, con su pizarra y su libro. La alternativa es seguir pasando escalares y
resolver cada racimo con una regla nueva, que es exactamente lo que ha producido «palos de ciego».
→ **Recomendación: sí.** Sin él, R03, R05, R09, R10, R20, R21, R24 y R25 —**136 situaciones**— no
tienen dónde vivir.

**2. ¿Cuánta memoria arrastra la carrera?** (`LIBRO.caducidadDias`)
El dueño lo dejó abierto: «¿El ganador de ayer va marcado hoy? ¿Cuánto dura eso, un día o toda la
vuelta?».
→ **Recomendación: tres días** para lo personal (ganó, no relevó, fugó), **un día** para la fuga, y
**toda la carrera** solo para las alianzas y las rivalidades entre equipos. Razón: tres días es lo
que dura el recuerdo en un pelotón y es corto para que no se acumule un grafo enorme; las rivalidades
entre casas sí duran porque son de mánager, no de piernas.

**3. ¿Cuánto puede un equipo bot desviarse de su plan?** (`CASA.cupoFuga`, `DIR.erraElReparto`)
«Un cupo de fuga estricto hace las carreras más creíbles y también más previsibles».
→ **Recomendación: cupo blando** (coste exponencial, `0,30`) **y error de reparto explícito**
(`0,12` a calidad 0). Así el cupo se cumple casi siempre sin ser una ley, y lo que rompe la
previsibilidad es la falibilidad del director, que es la fuente correcta —tiene causa narrable— y no
un dado.

**4. ¿Hasta dónde llega el jugador humano?**
La tercera pregunta abierta de `docs/tactica.md` §7. «Todo lo de §3.B son decisiones que un humano
querría tomar él (¿ataco yo o le lanzo a él?)».
→ **Recomendación: hasta los disparadores y el objetivo de carrera (§6.2, §6.3), y no más.** El
jugador escribe un **programa**, no una radio. Y —esto es lo importante— **con la misma información
imperfecta que el bot**: sus condicionales se evalúan contra la pizarra de su director. Eso convierte
«tener buen director» en algo que se nota, que es la forma sana de G9.

**5. ¿Se mueve `queenLastGroupPct` de 8-14 a 8-18?**
Es la banda que la deuda 2 del §14 dice explícitamente que no se mueve sin decisión del dueño, y es
la que bloquea que el grupeto que ya no es la carrera pierda gente en el puerto.
→ **Recomendación: sí, a 8-18 %**, con el techo anclado a `STAGE.timeCutQueen` (18 %) para que la
cola nunca pase del corte. Es un ancla dura, no un número de calibración.

**6. ¿Se retira `mountain.breakawayWinPct` (25-45 %)?**
Vive sobre un escenario que el propio `targets.ts` dice que no es una reina, y su valor cambia de
26,7 % a 0 % según dónde se ponga el puerto.
→ **Recomendación: sí, retirarla** y quedarse con `calendarQueens.breakawayWinPct` (6-30 %, real,
sistemático, cerrado por el dueño con «está bien así») más un escenario `reina-real` nuevo.

**7. ¿Cuánto tiene que valer la dirección?** (`qualityGradient`, la banda de G9)
Un equipo con buen director gana más, pero ¿cuánto más?
→ **Recomendación: 1,25-1,80×** a igualdad de corredores. Por debajo de 1,25 el banquillo es
decorado; por encima de 1,80 el juego lo decide el mánager y no el ciclista, lo que choca con «todo
jugador es un CICLISTA».

**8. ¿Se implementan las clasificaciones secundarias de verdad?** (montaña, puntos, joven, equipos)
R05 las necesita como motivo, y hoy «los maillots secundarios se reparten como subproducto de lo que
hicieron otros por otras razones».
→ **Recomendación: sí, las cuatro**, y en el paso 8. Es la mitad de la razón por la que dos tercios
del pelotón hoy no tienen nada que hacer, y es barato: son acumuladores, no física.

**9. ¿Existe el comisario?** (S-448, la única situación que se queda fuera de todo racimo)
Sanciones, descalificaciones, tirones de maillot, el coche que da rebufo de más.
→ **Recomendación: no, todavía.** Es un actor nuevo en una capa que no existe, aporta poco a la
táctica y abre un frente entero (reglamento, apelaciones, narración). Se anota y se deja fuera.

**10. ¿Cómo se paga el CI?** (+17,5 minutos)
→ **Recomendación: (1) filtro por diff** —`smallField` y `orders` solo cuando el PR toca la
táctica—, y **(2) 4 semillas en PR / 8 en el nocturno**. Con eso el coste típico de un PR sube 0 s y
el nocturno sube 12 minutos. **No** retirar los invariantes 16 y 20 del CI diurno: son los controles
de que la táctica no filtra a la física, y precisamente en esta tanda son los que más falta hacen.

**11. ¿Se acepta que el diseño mueva las cuatro huellas selladas?**
→ **Recomendación: sí, y con el método de siempre.** Cada paso declara antes de medir qué espera que
se mueva y qué no (§9.3), lo comprueba, y resella con la causa escrita. Las huellas no son un
contrato de resultados: son el instrumento para que un cambio de conducta se cuente. La de
`reina-150-1` —hoy un ganador en solitario a +92 s— es, de hecho, **la mejor prueba de si esta
propuesta funciona**: si tras el paso 11 sigue llegando uno solo, R17 está mal.

---

## Apéndice A · Las diez piezas nuevas, en una línea cada una

| Pieza            | Fichero             | Qué es                                                     | Racimos                           |
| ---------------- | ------------------- | ---------------------------------------------------------- | --------------------------------- |
| `DirectorSeat`   | `race/director.ts`  | El banquillo: estado, pizarra, libro, presupuesto, órdenes | R03, R05, R09, R10, R20, R21, R24 |
| `RoadCaptain`    | `race/captain.ts`   | Quién manda en el grupo cuando la orden no llega           | R01, R02, R18, R24                |
| `RiderAgent`     | `stage/agent.ts`    | La intención del corredor dentro de su margen              | R02, R13, R19, R22                |
| `Mesa`           | `stage/mesa.ts`     | Aduana, subasta del frente, tregua, pacto                  | R03, R12, R20, R26                |
| `Pizarra`        | `race/pizarra.ts`   | La carrera vista con retardo y error                       | R24, y toda la información        |
| `RaceStructure`  | `race/structure.ts` | Las siete formas de equipo y sus cupos                     | R21, R05, R10                     |
| `DirectorLedger` | `race/libro.ts`     | Memoria entre etapas: deudas, humor, quién ganó            | R08, R09, R10, R25                |
| `Posicion`       | `stage/posicion.ts` | Dónde vas en el grupo y lo que cuesta                      | R15, R12, R16                     |
| `Contextos`      | `stage/context.ts`  | `SelfView` · `GroupView` · `RaceView`                      | todos                             |
| `smallField`     | `sim/smallField.ts` | El banco donde vive el defecto                             | todos                             |

## Apéndice B · Qué NO propone este documento

Para que no se lea como un cheque en blanco:

- **No propone tocar la física.** Ni un vatio, ni un coeficiente de erosión, ni la ley de velocidad.
- **No propone radio en vivo.** El dueño la tumbó con razón y no se reabre.
- **No propone un comisario** (§10.9).
- **No propone quitarle vatios a los bots.** G9 se paga con información y con tiempo de reacción.
- **No propone tocar `finishWeights`** ni el modelo de lanzamiento: están medidos y funcionan.
- **No propone una academia de bots, ni fama, ni ranking de 365 días**: son otras epics.
- **No resuelve las 49 situaciones que ningún racimo cubre**, y dice cuáles son y por qué.

---

_Documento de diseño. Nada de aquí se implementa hasta que el dueño lo lea y decida las once de §10._
