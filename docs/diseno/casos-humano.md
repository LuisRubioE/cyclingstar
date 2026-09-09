# Catálogo de situaciones — LENTE «JUGADOR HUMANO CONTRA BOT»

Alcance de esta lente: todo lo que ocurre en la frontera entre **lo que una persona quiere ordenar** y
**lo que el motor sabe ejecutar**. No cubre física, ni recorridos, ni la conducta bot pura (otras
lentes). Cubre: el vocabulario de órdenes de hoy (`StageOrders`), lo que NO se puede decir, el humano
líder / gregario / por libre dentro de un equipo bot, dos humanos en el mismo equipo, el mánager
humano de G2, el bucle de aprendizaje (N1) y dónde tendría que degradarse un bot para cumplir G9.

Fuentes leídas: `packages/engine/src/stage/types.ts` (`StageOrders`, l. 66-99),
`apps/web/src/pages/RaceOrders.tsx`, `apps/web/src/domain/raceOrdersAdvice.ts` (entero),
`SPEC.md` §6.10 y §6.18, `docs/epics.md` (G2, G7-G9, N1) y los seis mapas del rediseño
(`mapa-requisitos-duenio.md`, `mapa-spec.md`, `mapa-simulate-decisiones.md`, `mapa-tactics.md`,
`mapa-equipo-ordenes-final.md`, `mapa-jugador-humano.md`, `mapa-entrenamiento-atributos.md`).
Comprobaciones puntuales con Grep sobre `packages/engine/src` y `packages/db/src` cuando el mapa no
bastaba (se dice en cada caso).

**Dos hechos transversales que condicionan casi todo el catálogo** (ambos verificados con Grep, no
sólo leídos en los mapas):

1. **El motor es ciego a la humanidad del corredor.** `grep isBot|userId packages/engine/src` sólo
   devuelve un comentario en `world/lifecycle.ts`. `StageRider` no lleva ninguna marca de humano.
   Todas las diferencias humano/bot de este catálogo nacen ARRIBA (en `packages/db/stageRun.ts`, que
   sustituye la orden automática por la del jugador) y desaparecen al entrar en `simulateStage`.
2. **`riders.team_trust` es una columna muerta.** `packages/db/src/columnasVivas.test.ts` la declara
   textualmente: «Confianza del corredor con su equipo. **Nunca se ha escrito** (migración 0002), así
   que todos valen 50. La usa `selectSquad` con peso 0,4 sobre 4,0, o sea que aporta un 5 % CONSTANTE
   a todo el mundo y no ordena nada: **la dimensión está diseñada y no existe**». Es decir: la
   disciplina de SPEC 6.18 (`team_trust -= U(5,10)` al desobedecer, `+1` por cumplir) **no existe en
   ninguna parte del código**, ni para bots ni para humanos.

Convenciones: **CUBIERTO** / **PARCIAL** / **AUSENTE** / **CONTRARIO** (el motor hace lo opuesto).
«D-NN» remite a `mapa-simulate-decisiones.md` §4. «no consta en los mapas» = no lo he podido afirmar.

---

## Bloque A — Las cinco capas de SPEC 6.18: lo que el vocabulario de hoy sí dice

### [HUMANO-01] «Lanzo a mi compañero X» (capa 1, rol con objetivo)

- **Cuándo**: llana o final que admite llegada agrupada (`admitsBunchFinish`), últimos 3 km
  (`sprintTrainKm`). El humano escribe `role=lanzador` + `targetRiderId` = un compañero del roster.
- **Quién decide**: el jugador antes de la etapa; el motor lo ejecuta en los últimos 3 km.
- **Lo que pasa en carretera**: el lanzador se pone en cabeza a 51-63 km/h, coloca a su hombre,
  quema el último cartucho y se aparta. Variantes: (a) su sprinter está en el grupo → tren real;
  (b) su sprinter se ha descolgado o va en la fuga → el lanzador debería reciclarse (rodar para sí
  o ayudar al segundo); (c) hay tres trenes a la vez → se disputa la posición y sólo uno pega el
  último relevo limpio.
- **Lo que hace hoy el motor**: **CUBIERTO** y es de lo mejor construido. `lanzando(id)` (D-03) exige
  `isBunch ∧ kmToGo ≤ 3 ∧ lanzaPara ∈ idSet`; si hay algún lanzador, **el turno son sólo los
  lanzadores** (`elTren`); `relayLeadOutBoost` 1,5 al deber; D-28 le quema un cerillo; en meta
  `trenDe` exige `pullWindow ≥ leadOutMinWork 0,4` y da `+0,05` de score por lanzador (tope 2), baja
  la dispersión del lanzamiento (`sd ×0,45`) y alivia la colocación (`placementRelief` 0,18). El
  caso (b) NO está cubierto: si el sprinter no está en el grupo, `lanzando` es falso y el hombre
  simplemente vuelve al turno normal con `finishRoleWeight` 0,88 — el peaje del rol se cobra igual.
- **Lo que dijo el dueño**: «un sprinter que tenga a sus lanzadores tirando del pelotón le ayudan a
  colocarse… Puede haber varios equipos con sus lanzadores al mismo tiempo, aunque no necesariamente
  con el mismo éxito» (v39/v42, `constants.ts` `leadOutBoostPerHelper`).
- **Información necesaria para decidirlo**: dónde va mi sprinter (la tiene: `idSet`), cuántos trenes
  más hay (la tiene: `trenes` en D-04), si mi hombre sigue vivo (la tiene), si merece la pena lanzar
  a un segundón porque el primero se fue (NO la tiene: no hay reasignación de objetivo).
- **Cómo se mediría**: banco de palanca (misma semilla, se varía una sola palanca) sobre 32 llanas
  del banco canónico de 22 equipos: **% de etapas en que el sprinter con tren humano acaba mejor que
  su misma copia sin tren**. Banda razonable **60-80 %**: el tren vale hasta +10 % de score sobre un
  ruido de σ 4,5 % más colocación, así que debe ganar la mayoría de las veces pero no siempre —si
  saliera > 90 % el tren sería determinista y el sprint dejaría de ser un sorteo.

### [HUMANO-02] «Trabajo para mi compañero X» (gregario con objetivo)

- **Cuándo**: cualquier etapa con equipos; el humano escribe `role=gregario` + objetivo.
- **Quién decide**: el jugador; el motor lo usa en cinco sitios distintos.
- **Lo que pasa en carretera**: el gregario da la cara, arropa a su hombre, le lleva bidones, y si su
  jefe se cae o pincha se descuelga a esperarle. Variantes: jefe en el mismo grupo (arropo) / jefe
  descolgado (rescate) / jefe delante en la fuga (no relevar, no sabotear).
- **Lo que hace hoy el motor**: **CUBIERTO** en tres de las cuatro mitades. `relayDutyByRole.gregario`
  = 1,0 (el deber más alto); `domestiquesFor` da `protectedByTeam` a su jefe si van en el mismo grupo
  (`relayProtectedPenalty` 1,2 sobre el deber del jefe); `tieneElEncargo` (D-13) exige exactamente
  `role==='gregario'` con target nulo o = leaderId para bajar a por él; `ROLE_APPETITE.gregario` 0,2
  le apaga las ganas de atacar; `finishRoleWeight` 0,88 le penaliza en el remate (v48). **Falta la
  cuarta**: si el objetivo del humano NO es el `leaderId` que ha derivado `pickLeader`, el humano
  queda con el deber 1,0 y el peaje 0,88 **pero sin nadie a quien arropar** que el plan reconozca; es
  el peor de los dos mundos.
- **Lo que dijo el dueño**: «si un ciclista tiene a su líder atrás, es normal que se deje caer para
  ayudarle… pero eso aplica a los bots y a los humanos que en sus instrucciones hayan indicado que
  ayudan a su líder X. **Si yo como humano digo que voy por libre, entonces no debería ocurrir eso**»
  (`simulate.ts:2175-2179`, v58).
- **Información necesaria**: quién es el jefe del plan (el plan lo sabe, el jugador NO lo ve en
  pantalla), si mi objetivo es el jefe del plan (nadie lo comprueba ni lo avisa), dónde va mi jefe
  (la tiene).
- **Cómo se mediría**: sobre el mismo banco, **% de gregarios humanos cuyo `targetRiderId` coincide
  con el `plan.leaderId` derivado**. Hoy no es medible desde fuera; con el dato, banda **≥ 90 %**
  para el caso «el jugador quiso servir al jefe real» — por debajo de eso la pantalla está dejando
  que la gente pague el peaje del gregario sin cobrar el arropo, y eso es un defecto de interfaz.

### [HUMANO-03] «Marco al rival X» (capa 4, la única orden que apunta fuera del equipo)

- **Cuándo**: etapa con favoritos identificables; el humano escribe `role=marcador` + un rival.
- **Quién decide**: el jugador. Es la única capa de SPEC 6.18 que un bot NUNCA reparte
  (`autoStageOrders` jamás da `marcador`).
- **Lo que pasa en carretera**: el sombra vive en la rueda del favorito, salta cuando salta, paga el
  85 % del coste de cada arreón y renuncia a su propia carrera. El marcado, si es combativo, amaga
  para vaciarle la caja.
- **Lo que hace hoy el motor**: **PARCIAL**. Existe y es bueno: `markedPerfil` (D-30) hace que el
  marcador derive respecto a SU HOMBRE (+4 de rebufo) en subida, `comesOff` (D-31) le da tres
  desenlaces (`stuck`/`gives`/`dropped`), y la respuesta al ataque usa `wheelProbability` (D-22).
  **Lo que falta de SPEC 6.18**: no existe el AMAGO del marcado («cada amago cuesta 2 unidades sin
  cerillo y, con probabilidad p_rueda, obliga al marcador a quemar un cerillo en vano»), la
  mentalidad del marcador no queda «forzada a reservón», y el coste heredado del 85 % no consta
  como constante en los mapas. Además la UI sólo ofrece **60 rivales por fama** (`getRaceRivals`
  limit 60): en una gran vuelta de 176 no puedes marcar a quien quieras.
- **Lo que dijo el dueño**: (SPEC 6.18, Paso 27) «marcar al favorito le resta 8-20 puntos de
  victoria»; el corpus lo da RESUELTO en v26 («el marcador deriva respecto a su hombre; se pega 22
  de 60, distancia mediana 68 s → 19 s»).
- **Información necesaria**: quién es el rival peligroso (el jugador lo elige a ciegas, sin general
  virtual ni forma del rival), si alguien más le marca (`marcadores_extra` está en la fórmula pero
  el jugador no lo sabe), si el rival va a estar en su grupo (nadie lo garantiza).
- **Cómo se mediría**: banda del dueño ya escrita en SPEC 6.17: **el marcaje resta 8-20 puntos de
  victoria al marcado** sobre el banco de finales en alto. Añadir: **% de etapas en que el marcador
  humano acaba en el grupo de su objetivo** — banda **35-60 %** (v26 midió 22 de 60 = 37 % pegados;
  por encima del 60 % el marcaje sería gratis y mataría al favorito siempre).

### [HUMANO-04] «Disputo las metas volantes / las cimas» (capa 3, las dos casillas)

- **Cuándo**: cualquier etapa con banners; casillas `contestSprints` / `contestClimbs`.
- **Quién decide**: el jugador (y el bot, que sólo las pone al sprinter, su lanzador y el cazaetapas
  en llano).
- **Lo que pasa en carretera**: el que va a por el maillot verde se coloca y esprinta el banner
  gastando dos unidades de tanque; el que no, pasa sentado. En la montaña lo mismo con el lunares.
- **Lo que hace hoy el motor**: **PARCIAL y con una asimetría fea**. `disputeBanner` (l. 6050) filtra
  `interested`, y **si nadie del grupo la tiene activada disputan TODOS**; `disputeClimb` (l. 6095)
  **no mira `contestClimbs` en absoluto**: todos los del grupo se ordenan y cobran `bannerCost` si
  puntúan. O sea que la casilla de la montaña, que la pantalla vende como «Chase mountain (KOM)
  points — Costs energy», **no cambia nada**: pagas igual sin marcarla y no ahorras marcándola.
  Eso es CONTRARIO a la promesa de la pantalla.
- **Lo que dijo el dueño**: SPEC 6.11: «Al cruzar un banner, el primer grupo en pasar que contenga
  interesados (**órdenes de 6.18** o IA según clasificaciones en juego) disputa un mini sprint».
- **Información necesaria**: si la clasificación por puntos/montaña está en juego y a cuánto voy
  (el motor no recibe NINGUNA clasificación secundaria; `StageRider` sólo trae `gcDeficitSeconds` y
  `gcRank`), cuánto cuesta el banner frente a lo que me queda de etapa.
- **Cómo se mediría**: **% de corredores del grupo de cabeza que pagan `bannerCost` en una cima
  teniendo `contestClimbs=false`**. Banda objetivo **≤ 10 %** (sólo los que de verdad la disputan);
  hoy es el 100 % de los que puntúan, y eso lo detecta un test de una línea.

### [HUMANO-05] «Ataco en el km 80» (capa 3, el disparador que sí existe)

- **Cuándo**: `triggerKm` puesto; el motor lo lee en `attackAppetite`.
- **Quién decide**: el jugador.
- **Lo que pasa en carretera**: un corredor con una cita mental («ataco en el pie del puerto») se
  guarda todo el día y se juega la carta ahí. Si el momento no llega en las condiciones adecuadas
  (va cortado, el grupo va a 60, ya hay fuga), no ataca.
- **Lo que hace hoy el motor**: **PARCIAL, y el jugador no puede saberlo**. `triggerKm` multiplica el
  apetito ×3 dentro de ±2 km y ×0,15 fuera (`triggerWindowKm/Boost/Outside`). Pero pasa DESPUÉS de
  todos los vetos duros de `attackAppetite`: sin cerillos → 0; `energyFraction < 0,25` → 0;
  `gastado` → 0; y en `fuga`/`contraataque`, `spr ≥ 70` → 0. Y ANTES tiene que haber salido el dado
  del grupo (`rollMoveAttempt`, cooldown 4,5 km, `tacticMaxMoves` 3, `tacticNoAttackKm` 3). El
  comentario lo dice: «No es un permiso, es una CITA… el motor nunca obliga a nadie a atacar».
- **Lo que dijo el dueño**: la promesa está escrita en la pantalla: «Launch a move at this distance.
  Leave blank to let your mentality decide when». Y la queja madre: «el resultado es casi lo mismo
  ponga lo que ponga ahí» (`raceOrdersAdvice.ts:6-7`).
- **Información necesaria**: el jugador necesita saber que su cita puede caer en el vacío; el motor
  necesita saber que hubo una cita para poder CONTARLO después (hoy no hay evento «tu cita del km 80
  no se pudo cumplir porque ibas sin cerillos»).
- **Cómo se mediría**: banco de palanca sobre 40 etapas: **% de citas (`triggerKm`) que producen al
  menos un intento del jugador dentro de ±2 km**. Banda razonable **45-70 %**: por debajo de 45 % la
  promesa de la pantalla es falsa; por encima de 70 % la cita sería una orden y el pelotón dejaría de
  ser una aduana (SPEC 6.8: la λ es una intensidad, no un permiso).

### [HUMANO-06] «Hoy me lo gasto todo / hoy me guardo» (`effort`)

- **Cuándo**: cualquier etapa; tres valores `ahorrar|normal|a_tope`.
- **Quién decide**: el jugador. Ningún bot pone nunca `effort` (`autoOrders` lo deja `undefined`).
- **Lo que pasa en carretera**: «a tope» es el hombre que da relevos que no le tocan, se mete en
  todos los cortes y llega vacío; «ahorrar» es el que se esconde todo el día y aparece en el último
  puerto.
- **Lo que hace hoy el motor**: **PARCIAL, un solo término**. `relayEffortWeight (0,5) × EFFORT_PUSH`
  en `relayDuty` (D-01) y nada más: no toca el apetito de ataque, ni el cerillo, ni la reserva
  (`reserveSeconds`), ni el `commitmentForSpeed` del sprint, ni la energía inicial, ni el
  `giveUpLambda`. El propio mapa lo etiqueta: «Es un empujón, no un veto». Medio punto es la mitad
  del salto entre gregario (1,0) y libre (0,6): en el pelotón, con listón 1,5, mueve a poca gente.
- **Lo que dijo el dueño**: «le dije que corriera súper agresivo… y **no hay ni una sola mención en
  el journal ni en la race radio, pero consumió un montón de energía**; algo habrá hecho, digo yo»
  (`contracts.ts:156-162`) — de ahí nació el parte `RaceEffortLog`, no un efecto de motor.
- **Información necesaria**: el motor necesitaría saber para qué se ahorra (etapa objetivo,
  clasificación) y hoy no lo sabe; el jugador necesita ver la diferencia y hoy el informe personal
  **ni siquiera le enseña qué `effort` puso** (`raceReportOrdersSchema` sólo trae role, mentality y
  las dos casillas).
- **Cómo se mediría**: banco de palanca, mismo corredor y misma semilla, `ahorrar` vs `a_tope`:
  **diferencia mediana de tanque gastado al final de la etapa** y **diferencia mediana de puesto**.
  Banda razonable **8-20 % de tanque** y **≥ 1,5 puestos de mediana** en una llana: por debajo de eso
  el botón sigue siendo el que el dueño describió («casi lo mismo ponga lo que ponga»).

### [HUMANO-07] «Mi mentalidad» (capa 2) y el efecto lateral que nadie anuncia

- **Cuándo**: siempre; obligatoria, por defecto `reservon`.
- **Quién decide**: el jugador (y el bot: `reservon` al líder, `combativo` al cazaetapas).
- **Lo que pasa en carretera**: un corredor conservador no salta a nada y llega entero; un
  supercombativo se mete en todo y a veces se funde.
- **Lo que hace hoy el motor**: **CUBIERTO con un efecto lateral oculto**. `MENTALITY_APPETITE`
  (1,6/1,25/0,8/0,3) multiplica el apetito y entra en `followProbability`. Pero además:
  **`reservon` NO quema cerillo para no soltarse** (`comesOff`, D-39, l. 3759) y **`supercombativo`
  no se deja ir** (`giveUpLambda`). O sea que la mentalidad más «segura» de la pantalla es la que te
  hace descolgarte antes en un pavé o un descenso, y la pantalla no lo dice en ninguna parte.
  Contraste con SPEC 6.18 capa 2, que promete multiplicadores `0 | 0,5 | 1,5 | 3,0` modulados por
  `clamp(cerillos/3)` y por `TSB > −25`: ni los valores coinciden ni existe la modulación por TSB
  (`StageRider.tsb` está «PENDIENTE DE IMPLEMENTAR»).
- **Lo que dijo el dueño**: «el líder… lo veo demasiado combativo; se escapa, lo consiguen, le
  pillan, luego lo vuelve a intentar… no tiene sentido que un líder haga eso» (v50).
- **Información necesaria**: el jugador necesita saber que `reservon` es también «no me juego un
  cerillo por aguantar»; hoy la etiqueta dice sólo «saves energy and only reacts».
- **Cómo se mediría**: banco de palanca en el banco del pavé y en el del descenso: **% de bloques en
  que un `reservon` se descuelga donde su copia `oportunista` aguanta**. Banda razonable: la
  diferencia debe existir pero ser pequeña, **3-10 puntos porcentuales**; si fuera > 15 la mentalidad
  estaría decidiendo la física y no la táctica.

### [HUMANO-08] El objetivo que abandona: el rol se queda huérfano

- **Cuándo**: `lanzador`/`gregario`/`marcador` cuyo `targetRiderId` abandona, se cae o no toma la
  salida.
- **Quién decide**: nadie: es una situación que el motor tiene que resolver solo.
- **Lo que pasa en carretera**: el gregario de un jefe que abandona pasa a correr para sí o se pone a
  disposición del segundo; el lanzador sin sprinter se recicla; el director lo dice por radio.
- **Lo que hace hoy el motor**: **AUSENTE**. SPEC 6.18 lo especifica literalmente: «El objetivo
  (`target_rider_id`) debe estar inscrito; si abandona, **el rol degrada a `libre` y se narra**».
  Grep de `degrada` en `packages/engine/src/stage` no devuelve nada relacionado; los mapas
  (`worksFor`/`domestiquesFor`/`leadOutFor`/`markTargetOf`, l. 1152-1170) se construyen UNA VEZ al
  arrancar la etapa y no se recalculan. Consecuencia: el gregario sigue con deber 1,0 y peaje 0,88
  en meta trabajando para un fantasma. Tampoco se valida que el objetivo exista o esté inscrito
  (mapa de órdenes §3.5: «No se valida que el target sea del mismo equipo ni que exista»).
- **Lo que dijo el dueño**: SPEC 6.18 (arriba), textual.
- **Información necesaria**: si el objetivo sigue en carrera (`sims.get(target)` lo sabe en cada
  bloque); el motor la tiene y no la usa.
- **Cómo se mediría**: **nº de corredor-etapas con rol dependiente cuyo objetivo ya no corre**, sobre
  el banco de grandes vueltas (donde hay abandonos). Banda objetivo **0** tras el arreglo; hoy es
  medible directamente y con abandonos del 12-20 % por carrera debería salir un puñado por vuelta.

---

## Bloque B — Lo que un humano NO puede decir hoy (el hueco de N1)

### [HUMANO-09] «No le doy relevos al equipo Y» / «con ésos no colaboro»

- **Cuándo**: en una fuga o en un grupo de caza donde va un rival cuyo equipo está persiguiendo por
  detrás, o un hombre al que no quiero llevar a meta.
- **Quién decide**: el corredor, en carretera, cada kilómetro. Es de las decisiones más comunes del
  ciclismo real.
- **Lo que pasa en carretera**: «yo a ése no le tiro»: el escapado se sienta cuando le toca el turno
  detrás del hombre del equipo que está cerrando, o cuando el otro es el mejor sprinter del grupo, o
  cuando le lleva ventaja en la general. La fuga se para, se miran, y a veces la cazan por eso.
- **Lo que hace hoy el motor**: **AUSENTE como orden, PARCIAL como conducta emergente**. El motor
  tiene tres razones para no relevar y **ninguna es ordenable**: `sittingOn` (tu equipo lleva el
  frente del pelotón, v33; o tienes compañero delante, v41), `jefeEnApuros` (D-05), y `sinOpciones`
  (`noChanceToWin`, D-07, que compara `finishScore` contra el mejor del grupo). No existe ninguna
  orden por rival ni por equipo. `tactics.ts` no contiene la palabra `teamId`.
- **Lo que dijo el dueño**: «si hay 1 wey que no pasa a cooperar en la escapada, los otros quizás
  quieran desgastarse menos… para que ese wey que va ahí sin gastar energía se la lleve» (v39 §1) —
  está implementado como contagio (`coopContagionWeight` 0,6), no como decisión de nadie.
- **Información necesaria**: quién va conmigo y de qué equipo (el `MoveRider` **no lleva `teamId`**),
  qué equipos persiguen detrás (el motor lo sabe, el corredor no lo recibe), quién me gana al sprint
  (sí lo tiene, vía `finishRank`).
- **Cómo se mediría**: sobre el banco de fugas de llano, **% de kilómetros de fuga en que al menos un
  fugado está fuera del turno por una razón distinta a `sittingOn`**. Hoy sólo puede salir de
  `sinOpciones`. Con la orden puesta, banda razonable **10-30 % de los km de fuga**: el dueño ya
  fijó que en un grupo de seis a 8 km relevan los seis, así que el escaqueo tiene que ser minoritario
  pero visible.

### [HUMANO-10] «Ataco si salta Z» (condicional de respuesta)

- **Cuándo**: final en alto, últimos 30 km; el jugador quiere responder al favorito, no adelantarse.
- **Quién decide**: el jugador, escribiendo el plan; el motor, ejecutándolo.
- **Lo que pasa en carretera**: es LA decisión del corredor de general: no abrir yo, pero estar en la
  rueda del que abra. Variante: responder sólo a uno concreto; variante: responder a cualquiera que
  saque más de X segundos.
- **Lo que hace hoy el motor**: **AUSENTE como orden; PARCIAL como conducta**. Sólo hay dos maneras
  de estar en la rueda de alguien: `marcador` + objetivo (orden fija, todo el día, con su peaje de
  apetito 0,1 y deber 0,35) o el dado genérico de `followProbability` (TAC, rol, mentalidad,
  energía, `stake` de la general). No existe «responde pero no abras». Es literalmente el ejemplo
  con que epics.md N1 describe la épica.
- **Lo que dijo el dueño**: «lo que hay que hacer si acaso es mejorar la granularidad de las
  instrucciones, **con más escenarios hipotéticos quizás**» (epics N1); y tumbó la radio en vivo:
  «es incompatible con avanzar un día cada seis horas».
- **Información necesaria**: quién ataca (el motor lo tiene: `instigator`), si está en mi grupo (lo
  tiene), si es «Z» (lo tendría si la orden lo nombrara), cuánto me cuesta responder (`sustainsJump`
  lo calcula ya).
- **Cómo se mediría**: no es medible hoy. Cuando exista: **% de ataques del rival citado a los que el
  jugador responde efectivamente** sobre un banco de finales en alto. Banda razonable **50-75 %**:
  por debajo la condición no se nota, por encima el marcaje sería perfecto y ya está la capa 4 para
  eso (y `wheelProbability` tiene techo 0,90 por decisión de SPEC 6.18).

### [HUMANO-11] «Si la fuga pasa de dos minutos, tiro»

- **Cuándo**: llana o media montaña, primera mitad de etapa, con fuga en carretera.
- **Quién decide**: el jugador (o el mánager: es una política de equipo, la `chase_policy` de SPEC).
- **Lo que pasa en carretera**: el equipo pone dos hombres a limitar la cuerda, y si el hueco crece
  demasiado mete a un tercero. Es el trabajo de control clásico.
- **Lo que hace hoy el motor**: **AUSENTE como orden, CUBIERTO como derivación**. El equipo bot lo
  hace muy bien: `teamStance` → `intentFor` compara `gap` contra `teamChaseSecondsPerKm (1,5) ×
kmToGo` y contra `teamChaseMinGapSeconds (25)` para elegir entre `controlar` y `perseguir`, y
  `isThreatened` compara la general **virtual** del de delante. Pero eso es una DERIVACIÓN del plan,
  no una orden: no hay campo por el que una persona pueda escribirla. SPEC 6.18 capa 5 sí la
  especifica («política de control de fuga `nunca | si_amenaza | siempre`») y **no existe en
  `StageOrders` ni en ningún contrato del motor** (mapa-spec §5.5).
- **Lo que dijo el dueño**: «si la fuga está a 2 minutos y no hay nadie peligroso, no tiras; si está
  a 20 minutos, sí que tiras, ¡a muerte!» (v38, vive en `isThreatened`).
- **Información necesaria**: el hueco (el plan lo tiene desde v38: «la postura se decidía SIN MIRAR
  LA CARRETERA»), la amenaza en la general virtual (la tiene), y para el jugador: no ve nada de esto
  al escribir la hoja.
- **Cómo se mediría**: con la orden puesta, **% de bloques en que la postura del equipo coincide con
  la política escrita por el mánager** — banda **≥ 95 %** (una política que se incumple el 20 % de
  las veces no es una orden). Y como control de no-regresión: la fuga sigue ganando **5-16 %** de las
  llanas (banda del dueño, v38).

### [HUMANO-12] «Espero a mi jefe si se descuelga» / «si me descuelgo, esperadme»

- **Cuándo**: puerto, pavé, abanico o percance; el jefe pierde el grupo.
- **Quién decide**: hoy el motor, unilateralmente. En la carretera lo decide el director.
- **Lo que pasa en carretera**: el jefe levanta la mano, el coche lo dice, y bajan uno o dos. O al
  revés: el jefe grita «¡seguid!» y nadie baja.
- **Lo que hace hoy el motor**: **PARCIAL y sólo en una dirección**. D-13 (`helpBack*`) baja gregarios
  a por el `leaderId` del plan bajo siete condiciones (jefe en un `shed`, no en un `mov`; gap entre
  22 y 300 s; ≥ 5 km por correr; por la general todos menos uno, por la etapa dos y sólo con
  `mishapKm` ≤ 5 km y estando entre los 3 equipos de más `quality`; el maillot nunca baja; de la
  cabeza de carrera no baja nadie). **Lo que no existe**: el jefe no pide ayuda, y el humano no puede
  pedirla ni renunciar a ella. Los mapas lo anotan como límite textual: «**El jefe no pide la ayuda:
  se la mandan**… No hay "espera a mi compañero" ni un director que decida distinto según el día»
  (v36 §7, v37 §4). Y «SE PROBÓ QUE EL GRUPO RODARA AL RITMO DEL JEFE Y NO SE HA HECHO (v36)»: con
  el tope la ayuda perjudicaba (66 % vs 70 %).
- **Lo que dijo el dueño**: «oye, pero ¿está implementado que si el líder del equipo se cae, se
  descuelgue parte de su equipo para ayudarle? porque igual no es solo un tema de etiquetas sino de
  construir algo que no existe en el motor» (v36); y «por la etapa yo creo que nadie debería
  bajarse… salvo que sea un pinchazo/caída y la distancia sea pequeña» (v37).
- **Información necesaria**: quién es el jefe HOY según el jugador (no según `pickLeader`), y si el
  jefe quiere la ayuda. Ninguna de las dos existe como dato.
- **Cómo se mediría**: sobre el banco de grandes vueltas, **avisos `domestiques_drop_back` por
  etapa**. Ya hay banda medida por el dueño: la rama de la etapa pasó de 6,59 a **0,01 avisos/etapa**
  (v37) y ésa es la referencia a no romper; la rama de la general debe quedarse en **0,3-1,5
  avisos/etapa** en una gran vuelta (es un suceso de puerto, no de todos los días).

### [HUMANO-13] «Hoy me voy al grupeto» / «hoy sobrevivo»

- **Cuándo**: etapa reina para un velocista, tercera semana, día después de un percance.
- **Quién decide**: el corredor, y en la carretera es una decisión consciente y muy temprana.
- **Lo que pasa en carretera**: el velocista se pone en la cola en el primer puerto, organiza el
  autobús con otros seis, y calculan el corte al minuto. Es táctica colectiva, no rendición.
- **Lo que hace hoy el motor**: **AUSENTE como orden**. `giveUpLambda` (D-49, regla 8) sólo actúa en
  los últimos `giveUpKm` 25 km, con freno colectivo (`giveUpGroupMaxFraction` 0,33) y guarda del
  fuera de control; lee rol y mentalidad (`lider`, `sprinter` y `cazaetapas` **nunca** se dejan ir;
  `supercombativo` tampoco) pero **no ve equipo ni general**, y no hay ninguna palanca para decir
  «hoy voy al autobús desde el km 40». El ritmo del grupeto (D-41) es física (`droppedCommit`), con
  espera al de detrás (`grupetoWait`), no decisión de nadie.
- **Lo que dijo el dueño**: «El grupeto existe precisamente para entrar dentro del corte, y casi
  siempre lo consigue» (v20; fuera de control 0-4 %). Y: «Sospecho que el defecto de fondo… es que
  **no existe el corredor en apuros**… todo el mundo acaba en un autobús, y un autobús organizado
  entra siempre dentro del corte» (v20).
- **Información necesaria**: el corte de la etapa (el motor lo calcula al final, `applyStageTimeCut`,
  no durante), cuánto llevo perdido, quién más va a ir al autobús.
- **Cómo se mediría**: **% de humanos con orden «grupeto» que entran dentro del corte** — banda
  **≥ 96 %** (coherente con «fuera de control 0-4 %», v20) — y como contrapartida, **% de tanque que
  ahorran frente a su copia sin la orden**: banda **15-30 %**, que es lo que justifica la orden.

### [HUMANO-14] «Mi objetivo de esta vuelta es la general» (objetivo de carrera)

- **Cuándo**: al inscribirse o al escribir la hoja de la primera etapa de una vuelta.
- **Quién decide**: el jugador (y en G2, el mánager, que reparte objetivos entre los suyos).
- **Lo que pasa en carretera**: el que va a la general se coloca, no gasta, no entra en fugas, y
  cambia toda su semana; el que va a etapas hace lo contrario.
- **Lo que hace hoy el motor**: **AUSENTE**. `StageOrders` es por etapa y no tiene ningún campo de
  objetivo. La única señal de general que llega es `gcDeficitSeconds`/`gcRank`, **calculada por la
  base** y usada por el **plan bot**, no por el jugador. Lo más cercano que puede hacer un humano es
  ponerse `lider`/`reservon` en cada etapa a mano y copiar la hoja con «Copy to the rest of the
  race». No hay presupuesto de carrera, ni etapa clave, ni «guardo para la 17».
- **Lo que dijo el dueño**: E3 preguntaba «¿se corre distinto sabiendo la clasificación?» y la
  respuesta medida fue que sí para el campo (brecha 1.º-10.º −38 s con general apretada) pero «**la
  defensa del maillot no existe como conducta propia**». Nada de eso llegó a ser una ORDEN.
- **Información necesaria**: el objetivo, que hoy no existe como dato; y para que sirva, el motor
  necesitaría leerlo en `attackAppetite` (hoy sólo lee `gcDeficitSeconds` con la puerta
  `gcTerrainClimbShare`) y en `relayDuty`.
- **Cómo se mediría**: banco de una vuelta de 5 etapas, mismo corredor, objetivo `general` vs
  `etapas`: **diferencia de tanque gastado en las dos primeras etapas** (banda **10-25 %**) y
  **diferencia de puesto final en la general** (banda **≥ 3 puestos de mediana**). Si el objetivo no
  mueve ninguna de las dos, es una etiqueta.

### [HUMANO-15] «Ataco en el tramo más duro del último puerto» (capa 3, la que falta)

- **Cuándo**: final en alto o media montaña con puerto decisivo.
- **Quién decide**: el jugador.
- **Lo que pasa en carretera**: nadie ataca «en el km 143»; se ataca en la rampa del 11 %, a tres
  kilómetros de la cima, cuando el ritmo del equipo rival se rompe.
- **Lo que hace hoy el motor**: **AUSENTE**. SPEC 6.18 capa 3 la enumera («atacar en el tramo más
  duro del último puerto») y `StageOrders` no tiene el campo (mapa-spec §5.6: «`attack_last_climb`
  (capa 3) no existe en `StageOrders`»). Lo único disponible es `triggerKm`, un número absoluto que
  el jugador tiene que estimar leyendo la altimetría SVG de la pantalla de órdenes. El motor SÍ sabe
  dónde está el decil más empinado (`selectionFactor`, `climbScore = Σ km·g²`, `raceThisClimb`), o
  sea que el dato existe y sólo falta el vocabulario.
- **Lo que dijo el dueño**: SPEC 6.17 pedía «ataques en el decil más empinado» como invariante y el
  corpus lo da como «queda anotado… no se fuerza en CI».
- **Información necesaria**: el perfil del último puerto (el motor lo tiene bloque a bloque), dónde
  corona (`climbKmToFinish` en `deriveFinishTerrain`).
- **Cómo se mediría**: **% de ataques del jugador con orden «último puerto» que caen dentro del decil
  más empinado de la última cota**. Banda **≥ 60 %**; y de control, que el `triggerKm` numérico siga
  funcionando igual (huella sellada).

### [HUMANO-16] «Si llueve en el adoquín, me coloco delante desde el km 40»

- **Cuándo**: clásica de pavé o etapa con sectores, con parte meteorológico.
- **Quién decide**: el jugador, que **ve el parte en la propia pantalla de órdenes** (`Forecast`, con
  fiabilidad y «(outlook)» si < 60 %).
- **Lo que pasa en carretera**: con lluvia, la posición antes de cada sector vale más que las
  piernas; los equipos pelean el kilómetro previo.
- **Lo que hace hoy el motor**: **CONTRARIO en el sentido débil**: la pantalla enseña el clima (v42,
  decisión explícita del dueño de ponerlo AHÍ) pero **la orden no puede referirse a él**. El motor sí
  modela lluvia (multiplica caídas ×0,8 tras medida, parte el adoquín mojado, suelta ruedas en
  descenso) y sí modela colocación, **pero sólo en abanico** (`windPlacementTeam` 25,
  `windPlacementLeader` 12, `windPlacementLuck` 10). No hay colocación en pavé ni orden de
  colocarse.
- **Lo que dijo el dueño**: «ojo, el clima debería depender del país y del GD» (v42) y eligió que el
  parte se viera en la pantalla de órdenes. Es el ejemplo textual de N1: «si llueve en el adoquín,
  colócate delante desde el km 40».
- **Información necesaria**: la meteo del día (el motor la tiene: `StageInput.lugar` + `climate.ts`),
  la posición en el grupo (sólo existe como concepto en abanico).
- **Cómo se mediría**: cuando exista, **% de sectores de pavé que el jugador con la orden aborda en
  el tercio delantero** (banda **60-85 %**, no 100 %: la colocación se pelea) y el listón ya fijado
  del pavé como no-regresión: **PAV mediano del ganador ≥ 69** (decisión del dueño, v39 §8/v58 §6).

### [HUMANO-17] Órdenes en la contrarreloj: el formulario en blanco

- **Cuándo**: etapa `timeTrial`; la pantalla muestra «Individual time trial — a solo effort against
  the clock» y **no hay formulario**.
- **Quién decide**: nadie; `autoStageOrders` devuelve mapa vacío y todos corren `libre/reservon`.
- **Lo que pasa en carretera**: una crono se corre con plan: salida conservadora o agresiva, ritmo
  por sectores, el corredor de equipo que marca tiempo pronto como referencia, y en una cronoescalada
  el material y el punto de esfuerzo.
- **Lo que hace hoy el motor**: **AUSENTE**. `startOrder.ts` es puro (orden inverso de la general a
  120 s, o por dorsal a 60 s) y `simulateTimeTrial` no recibe órdenes ni devuelve incidentes
  (`incidents: []`), lo que además deja el corte de la crono como «salvaguarda dormida» (v20 §6).
  No hay `effort` en crono, ni CRE (límite anotado desde v15/v18).
- **Lo que dijo el dueño**: «la contrarreloj hay que modelarla bien… salen en orden inverso de la
  general… separados por 2 minutos, **con lo que eso implica**» (v18) — «lo que eso implica» incluye
  precisamente la información y el plan, y sólo se implementó la narración (`tt_split`,
  `tt_best_time`, `tt_catch`).
- **Información necesaria**: el mejor tiempo hasta ahora (el motor lo calcula para narrar), los
  parciales, el objetivo del corredor.
- **Cómo se mediría**: **dispersión de tiempo por corredor entre `ahorrar` y `a_tope` en crono** —
  hoy exactamente 0 por construcción, lo que es un test de una línea. Banda razonable cuando exista:
  **1-3 % del tiempo total** (una crono mal dosificada cuesta segundos, no minutos), respetando la
  banda del dueño `timeTrials.tailPct` **8-15 %**.

### [HUMANO-18] «No hay órdenes»: el piloto automático del entrenador

- **Cuándo**: el jugador no rellena la hoja (o rellena sólo una etapa de cinco).
- **Quién decide**: `autoStageOrders`, que trata al humano como a un bot más.
- **Lo que pasa en carretera**: si un corredor no habla con el director, el director le pone en el
  plan que le toca por sus características.
- **Lo que hace hoy el motor**: **CUBIERTO**, y bien: el dashboard avisa («You have no orders set —
  your coach will ride it for you.») y `stageRun` cae a la orden automática, y si tampoco, a
  `libre/reservon`. **El defecto es de granularidad**: el aviso desaparece con **UNA** orden guardada
  en cualquier etapa (`hasOrders = orders.length > 0`), así que el jugador que puso órdenes a la
  etapa 1 de una vuelta de 21 cree que está cubierto y corre 20 etapas con el piloto automático.
- **Lo que dijo el dueño**: — (no consta cita; es deuda deducida del código, mapa-jugador-humano §1).
- **Información necesaria**: cuántas etapas de la carrera tienen orden (la web lo sabe: lo cuenta en
  el resumen «N road stages, no clashing orders»).
- **Cómo se mediría**: telemetría de producto, no de motor: **% de corredor-etapas de humanos
  convocados que corren con orden automática**. Banda de vigilancia **≤ 25 %**; por encima, la
  pantalla de órdenes no está cumpliendo su función y cualquier medida de «las órdenes deciden» está
  midiendo bots.

---

## Bloque C — El humano LÍDER en un equipo de bots

### [HUMANO-19] El humano se declara `lider` y su equipo bot ya tiene uno: el rebelde

- **Cuándo**: cualquier etapa; el humano escribe `role=lider` (o `sprinter`) y `pickLeader` ya ha
  nombrado a otro por votos o por `leaderScore`.
- **Quién decide**: `buildTeamPlans` (`rebelIds`), sin intervención de nadie.
- **Lo que pasa en carretera**: dos gallos. En la realidad se resuelve en el autobús o a hostias en
  la carretera; el que corre por libre no recibe bidones, no le esperan y su equipo no persigue por
  él.
- **Lo que hace hoy el motor**: **CUBIERTO en la mecánica, AUSENTE en la consecuencia**. `rebelIds`
  saca al humano del plan: `driveOfRider` = 0, `teamAttack` = 1 (ni freno ni empuje), sin arropo
  (`domestiquesFor` no le apunta), sin tren, no cuenta para `manUpTheRoad` ni para `menInPeloton`, y
  la crónica lo cuenta una vez (`rider_defies_team`: «X is doing this on his own account: his team
  has a leader today, and it is not him»). **Coste administrativo: cero** — `team_trust` nunca se
  escribe (verificado). El propio repo lo dice: «Como hoy todos los equipos son bots, desobedecer
  sale gratis siempre, y **la estrategia óptima pasa a ser "ir siempre de líder"**» (docs/motor.md
  §VI.2).
- **Lo que dijo el dueño**: «Sí, por equipo, pero también teniendo en cuenta las individualidades
  (especialmente si un ciclista humano desobedece las órdenes de equipo y va por su cuenta, **esas
  priman**...)» (v15 §V.1); y sobre la consecuencia: «en un equipo bot, no cuesta nada. En un equipo
  humano, lo que decida su mánager (herramienta futura)».
- **Información necesaria**: para el jugador, saber ANTES de guardar que su equipo ya tiene jefe
  (la pantalla no lo dice; `orderAdvice` no ve el equipo). Para el motor, nada nuevo: ya lo sabe.
- **Cómo se mediría**: banco de palanca con un humano simulado en cada equipo: **diferencia de
  puntos de temporada entre la política «siempre líder» y la política «rol que me toca»**. Banda
  objetivo tras G2: **la política rebelde debe rendir PEOR a 20 carreras vista** (diferencia
  ≥ 0 a favor del obediente); hoy sale a favor del rebelde y ése es exactamente el agujero.

### [HUMANO-20] El humano `libre` al que sus gregarios bot convierten en jefe sin pedirlo

- **Cuándo**: llana, el humano es el mejor SPR del equipo; o el equipo bot le apunta con
  `targetRiderId` desde `assignTeam`.
- **Quién decide**: `autoStageOrders` (para los bots) + `pickLeader` (votos).
- **Lo que pasa en carretera**: te encuentras con dos compañeros arropándote y un lanzador tirando
  para ti cuando tú habías dicho que ibas por libre.
- **Lo que hace hoy el motor**: **CONTRARIO a lo que el dueño pidió**. `autoStageOrders` se calcula
  sobre **el equipo entero sin conocer las filas humanas** (`stageRun.ts:286-300`): si el humano es
  el mejor SPR en llana, los bots reciben «lanzador de X» y «gregario de X» **aunque X haya escrito
  `libre`, `cazaetapas` o `gregario de otro`**. Y `pickLeader` cuenta esos votos, así que el humano
  es `leaderId` del plan: recibe `protectedByTeam`, sale del turno de relevos, y sus compañeros
  bajan a por él si se descuelga. El parche v58 (`tieneElEncargo`) sólo arregló al que BAJA, no al
  que es nombrado: «nadie mira si el jefe quiere ser jefe».
- **Lo que dijo el dueño**: «**Si yo como humano digo que voy por libre, entonces no debería ocurrir
  eso**» (`simulate.ts:2175-2179`, v58) — dicho del rescate, pero la frase cubre el caso entero.
- **Información necesaria**: la orden del humano, que `autoStageOrders` no recibe. Es un dato que la
  base YA tiene en `ordersByRider` diez líneas antes de la llamada.
- **Cómo se mediría**: **% de corredor-etapas en que un humano con `role=libre` acaba siendo
  `plan.leaderId`**. Banda objetivo **0 %**; hoy es medible con un test de `buildTeamPlans` y no hay
  nada que lo impida.

### [HUMANO-21] El humano líder legítimo: ¿le obedecen los gregarios bot?

- **Cuándo**: el humano ES el `leaderId` del plan (por votos o por `leaderScore`).
- **Quién decide**: nadie «obedece»: el plan de equipo produce un ESCALAR y los bots reaccionan a él.
- **Lo que pasa en carretera**: un jefe manda por radio: «subid el ritmo», «cerrad ese hueco»,
  «dejadme aquí». Sus gregarios lo hacen o no según piernas y disciplina.
- **Lo que hace hoy el motor**: **PARCIAL, y por derivación**. Lo que el humano recibe: `relayDuty`
  0,1 (rol `lider`), `protectedByTeam` (−1,2 al deber) si tiene gregarios en su grupo, no recibe el
  empuje de equipo por ser «la carta», el drop-back de D-13 si se descuelga, y `finishRoleWeight`
  1,0. Lo que NO puede hacer: pedir ritmo, pedir que cierren un hueco, mandar a uno a la fuga,
  liberar a un gregario. El plan de equipo llega al corredor **como un solo número** (`teamDrive`):
  «Qué NO ve el corredor del plan: sólo recibe ese número; no sabe el motivo, ni el intent, ni quién
  es la carta».
- **Lo que dijo el dueño**: «el frente lo lleva UNO» (regla 3 de §V.1) y «un pelotón no caza una fuga
  solo queriendo, la caza poniendo más hombres delante» (v38) — el equipo funciona, pero como
  autómata, no como jerarquía con voz.
- **Información necesaria**: para que hubiera obediencia haría falta un canal jefe→equipo dentro de
  la etapa, que N1 resuelve al revés (todo va escrito de antemano). Con N1 basta que la orden del
  jefe sea parte del PLAN DE EQUIPO (G2), no un mensaje.
- **Cómo se mediría**: **km de relevo que los compañeros del humano líder pagan por él frente a los
  que pagarían por un líder bot equivalente**. Banda objetivo **diferencia ≤ 5 %** (el motor debe ser
  ciego a la humanidad: G2 dice «Pagar da AUTORIDAD, no vatios»); si saliera diferencia, el equipo
  estaría tratando distinto a un humano y eso rompe la neutralidad.

### [HUMANO-22] El humano líder con el maillot: el motor le silencia contra su orden

- **Cuándo**: el humano va primero en la general (`gcRank === 1`, `gcDeficitSeconds ≤ 0`) y escribe
  una orden agresiva (`supercombativo`, `triggerKm`, `cazaetapas`).
- **Quién decide**: el motor, con cinco reglas acumuladas que sólo miran la general.
- **Lo que pasa en carretera**: el maillot amarillo no se va en la fuga del día, no tira, no baja a
  por nadie. Eso es cierto **casi siempre** — pero un líder que va a perder la general el día
  siguiente puede jugársela, y un líder de una carrera de tres días con 8 s puede atacar.
- **Lo que hace hoy el motor**: **CUBIERTO, hasta el punto de anular la orden del jugador**. Cinco
  reglas: `relayRaceLeaderPenalty` 3 en `relayTurn` (sólo al 1.º, salvo abanico); `esElMaillot` no
  baja a por nadie (D-13, v50); `carriesGcLeader` **veta** la corona de fuga del día (D-26) y veta la
  cuerda en `pelotonAllows` para `fuga|contraataque|puente`; `gcDefendShare` le quita el bonus de
  ataque; `autoOrders` le pone `lider/reservon` — aunque en el caso del humano la orden explícita
  manda, los cuatro vetos siguen.
- **Lo que dijo el dueño**: «el maillot amarillo —un escalador— en la fuga del día, y ganando al
  sprint una etapa de velocistas» (v32) → «Y EL MAILLOT ES VETO, NO DESCUENTO»; «el que lleva el
  maillot ya va ganando… se esconde y obliga a los demás a mover la carrera» (v57); «**el que lleva
  el maillot no baja a por nadie**, en ninguna carrera y por ningún compañero» (v51).
- **Información necesaria**: hoy el veto es binario sobre `gcDeficitSeconds ≤ 0`. Faltaría el
  contexto: cuántas etapas quedan, cuánta ventaja tengo, qué terreno viene. `isThreatened` ya usa la
  general virtual; el veto del maillot no.
- **Cómo se mediría**: **nº de etapas en 800 en que el portador del maillot corona la fuga del día**
  — banda del dueño ya fijada: **0** (v32: «29 → 0 en 800 etapas»). Añadir, para el humano:
  **% de órdenes agresivas de un maillot humano que quedan sin efecto** y que la pantalla debería
  avisar (hoy `orderAdvice` no mira la general: banda objetivo **0 % de avisos ausentes**).

### [HUMANO-23] El humano líder que quiere meterse en la fuga y su equipo deja de perseguir

- **Cuándo**: el humano (carta del equipo o `leaderId`) entra en un movimiento por delante.
- **Quién decide**: `teamStance` vía `manUpTheRoad`.
- **Lo que pasa en carretera**: un equipo con hombre en la fuga no tira. Y si el hombre es la carta,
  con más razón. Eso es correcto y el dueño lo pidió.
- **Lo que hace hoy el motor**: **CUBIERTO con un borde**. `manUpTheRoad` = alguna de las **cartas**
  (`stageCandidateId`, `leaderId`) no rebelde va delante; si el equipo no tiene cartas, cualquier
  miembro. **Borde**: si el humano se ha declarado `lider` y es REBELDE, no cuenta —su equipo sigue
  persiguiendo la fuga en la que va él, que es exactamente lo que el dueño pidió como castigo
  intrínseco («su equipo no deja de perseguir por él», v15 §3), pero el jugador no lo sabe.
- **Lo que dijo el dueño**: «Especialmente si los equipos de los sprinters tienen a alguien metido en
  la fuga y entonces no van a tirar, y la escapada se va a 15 o 20 minutos» (v38); matizado en v38-2:
  «Nadie renuncia a su velocista porque su noveno hombre esté en la escapada».
- **Información necesaria**: si el de delante es carta o relleno (la tiene), y **si el que va delante
  es el maillot** (v58 lo arregló: `leaderUpTheRoad`).
- **Cómo se mediría**: **% de bloques en que un equipo con su carta delante mantiene intent
  `perseguir`** — banda objetivo **0 %**; y de control, la fuga en llana canónica en **12 %** (v38-2)
  dentro de la banda del dueño **5-16 %**.

### [HUMANO-24] El humano líder pide un tren y su equipo bot sólo tiene un lanzador

- **Cuándo**: llana, humano `sprinter`, equipo bot.
- **Quién decide**: `assignTeam`, que da **exactamente un** `lanzador` por equipo.
- **Lo que pasa en carretera**: un tren real son 3-5 hombres; el último lanzamiento es sólo el final
  de una fila que empieza a 5 km.
- **Lo que hace hoy el motor**: **PARCIAL por decisión medida**. `autoOrders` nombra un solo
  lanzador; el resto son gregarios del jefe. En meta, `leadOutMaxHelpers` es 2, o sea que el modelo
  admite dos lanzadores pero el repartidor bot sólo produce uno. La nota de v38-2 §13 lo dice:
  «Tren = dos hombres (no todo el relleno `lanzador`)». Consecuencia para el humano: nunca podrá
  tener el segundo escalón del tren aunque su equipo tenga hombres de sobra, salvo que otro humano
  del mismo equipo se ponga `lanzador` con él de objetivo.
- **Lo que dijo el dueño**: «es el último km… deberíamos ver aquí a los equipos de los sprinters
  llevando al pelotón a toda velocidad para lanzarles el sprint» (v33).
- **Información necesaria**: qué remate dibuja el recorrido (el bot sólo ve `kind`, no el
  `finishType` real que luego usa el motor — límite anotado nº 12 del mapa de órdenes).
- **Cómo se mediría**: **distribución del nº de lanzadores que han trabajado (`pullWindow ≥ 0,4`) por
  sprinter en llanas del banco canónico**. Banda razonable: **mediana 1, cola con 2 en el 20-35 % de
  los casos** (hoy la cola con 2 sólo puede venir de humanos, así que debe salir ≈ 0 %).

---

## Bloque D — El humano GREGARIO en un equipo de bots

### [HUMANO-25] ¿Le mandan al humano gregario? (nadie le da una orden: se la pone él)

- **Cuándo**: siempre. El humano elige su propio rol; el equipo no se lo asigna.
- **Quién decide**: el jugador, en solitario, sin negociación.
- **Lo que pasa en carretera**: el gregario recibe su papel del director en la reunión de la mañana y
  lo ejecuta; su margen es cómo lo hace, no si lo hace.
- **Lo que hace hoy el motor**: **AUSENTE en la dirección equipo→humano**. `autoStageOrders` calcula
  una orden para el humano **y luego la tira** si hay fila explícita (`stageRun.ts:309-334`: «una
  orden explícita siempre manda»). El humano nunca ve qué le habría puesto su equipo, y el equipo
  nunca ve qué se puso él. Es el componente **G2.15 «Ser mandado»**, marcado sin pieza.
- **Lo que dijo el dueño**: G2.15: «cómo se vive desde ABAJO… Que te pongan de gregario cuando
  querías tu oportunidad… Tiene que doler y tiene que poder responderse —hablar, negarse, rendir
  menos, irse—, porque si no, **el jugador que no es mánager es un espectador de su propia carrera
  deportiva**».
- **Información necesaria**: un plan de equipo que exista ANTES de la hoja del jugador y que se le
  pueda enseñar. Hoy el plan (`buildTeamPlans`) nace DENTRO de `simulateStage`, después de que las
  órdenes estén cerradas: es un orden de cálculo que impide el diseño de G2.
- **Cómo se mediría**: producto: **% de humanos que ven el plan de su equipo antes de guardar la
  hoja** (hoy 0 %). Motor: **el plan de equipo debe poder calcularse fuera de `simulateStage` y dar
  el mismo resultado** — test de pureza, banda **100 % de coincidencia**.

### [HUMANO-26] El humano gregario cuyo objetivo NO es el jefe del plan

- **Cuándo**: el humano escribe `gregario` de su amigo Fulano, y `pickLeader` nombra a Mengano.
- **Quién decide**: `pickLeader` (votos y `leaderScore`) contra la orden del jugador.
- **Lo que pasa en carretera**: un gregario que trabaja para el que no es el jefe está saboteando el
  plan sin llegar a ser un rebelde declarado.
- **Lo que hace hoy el motor**: **PARCIAL y contradictorio**. El humano **no es rebelde** (`rebelIds`
  sólo cubre `lider`/`sprinter` con jefe ya nombrado, y `gregario`/`lanzador` con objetivo **fuera
  del equipo**). O sea: gregario de un compañero equivocado es legal. Consecuencias: su voto en
  `pickLeader` puede haber hecho jefe a su objetivo (si arrastra a otros); `tieneElEncargo` le impide
  bajar a por el jefe real; `domestiquesFor` sí le hace arropar a su objetivo (`protectedByTeam` al
  hombre equivocado); y él paga deber 1,0 y peaje 0,88.
- **Lo que dijo el dueño**: «Sí, por equipo, pero también teniendo en cuenta las individualidades»
  (v15) y la matización de v58 sobre `tieneElEncargo`.
- **Información necesaria**: nadie compara `targetRiderId` con `plan.leaderId`. El dato existe en el
  mismo objeto.
- **Cómo se mediría**: **% de gregarios (bot + humano) cuyo objetivo ≠ `plan.leaderId`**. En un campo
  todo bot debe ser **0 %** (`autoOrders` apunta todos al jefe); cualquier valor > 0 sale de humanos
  y es exactamente la población a la que hay que avisar en pantalla.

### [HUMANO-27] El humano gregario en la fuga con su jefe en el pelotón

- **Cuándo**: el humano `gregario` se cuela en la fuga del día; su equipo está detrás y quizá
  persiguiendo.
- **Quién decide**: en carretera, el corredor; aquí, tres reglas del motor.
- **Lo que pasa en carretera**: «si va en cabeza de carrera lo normal es que no se deje caer, pero
  que tampoco tire de la fuga (salvo que vaya solo)»; y si su equipo persigue por detrás, tirar es
  sabotearse.
- **Lo que hace hoy el motor**: **CUBIERTO**. Tres reglas encadenadas: `sittingOn` si su equipo lleva
  el frente del pelotón (v33: `relaySittingOnPenalty` 2 — «el escapado de ese equipo no debería
  entrar a los relevos… así además llega más fresco al final»); `jefeEnApuros` (D-05) si su hombre de
  la general va ≥ 22 s por detrás; y en un grupo de caza, `tieneHombreDelante` (D-06, v41). Y del
  drop-back queda excluido: «de la cabeza de carrera no baja nadie» (v37).
- **Lo que dijo el dueño**: «hay un equipo que tiene a 1 ciclista tirando del pelotón pero tiene a 1
  ciclista tirando de la fuga… eso es sabotearse a su trabajo» (v33); «Lo del gregario que va por
  delante en una fuga: si va en cabeza de carrera lo normal es que no se deje caer, pero que tampoco
  tire de la fuga (salvo que vaya solo, claro está)» (v37).
- **Información necesaria**: quién lleva el frente del pelotón (`frontTeamId`, la tiene), dónde va el
  jefe (la tiene).
- **Cómo se mediría**: banda ya medida por el dueño: **fugados que no relevan por `sittingOn`: 23 % →
  13 % (km 84) y 41 % → 19 % (km 167)** (v33); y en grupos pequeños **8,2 %** de los que sí tiran
  (v37, «916 de 1.197 son "va solo"»). Mantener esas bandas es el criterio.

### [HUMANO-28] El humano gregario que quiere su oportunidad hoy

- **Cuándo**: etapa que le va bien, jefe fuera de forma, tercera semana.
- **Quién decide**: hoy, sólo el jugador y sólo cambiando de rol en su hoja (con lo que se hace
  rebelde o pierde el arropo).
- **Lo que pasa en carretera**: el gregario pide permiso; el director le da carta blanca por un día,
  o se la niega. Es la escena central del deporte y hoy no existe.
- **Lo que hace hoy el motor**: **AUSENTE**. No hay «carta blanca», ni «libertad concedida», ni un
  estado intermedio entre gregario (deber 1,0, apetito 0,2, peaje 0,88) y líder (rebelde). El único
  escalón intermedio disponible es `libre` (deber 0,6, apetito 0,45, peaje 0,97), que no significa
  nada dentro del equipo. G2.3 «Promesas y expectativas» está marcado sin pieza.
- **Lo que dijo el dueño**: G2.15 (ver HUMANO-25) y G2.1: «El conflicto de dos gallos en un corral es
  de las mejores historias que da este deporte, y **hoy no puede ocurrir**».
- **Información necesaria**: un estado de permiso por corredor y etapa que venga del plan de equipo,
  no de la hoja individual.
- **Cómo se mediría**: cuando exista, **% de victorias de etapa que se lleva un corredor con carta
  blanca puntual** sobre una temporada. Banda razonable **3-8 %** de las etapas: tiene que ser una
  historia rara y memorable, no la norma.

### [HUMANO-29] El humano al que su equipo bot pone de lanzador de sí mismo (choque de repartos)

- **Cuándo**: llana; el humano es el mejor SPR y además escribe `gregario` o `lanzador` de otro.
- **Quién decide**: la colisión entre `autoStageOrders` (que no ve al humano) y la fila humana.
- **Lo que pasa en carretera**: nada equivalente: es un artefacto de tener dos repartidores ciegos.
- **Lo que hace hoy el motor**: **CONTRARIO**. Se generan configuraciones imposibles: un bot con
  `lanzador → humano` mientras el humano es `lanzador → otro bot`; dos hombres apuntándose entre sí;
  un `leaderId` que a su vez apunta a un tercero. `pickLeader` resuelve por votos y desempata por id,
  sin comprobar ciclos. Es la misma raíz que HUMANO-20: `autoStageOrders` recibe `autoRiders` con
  todo el roster y **no recibe `ordersByRider`**, que está calculado setenta líneas antes.
- **Lo que dijo el dueño**: — (deuda deducida del código; el mapa la anota como límite nº 1 del
  jugador humano: «no está anotado como límite en ningún comentario; se deduce del código»).
- **Información necesaria**: las órdenes humanas del mismo equipo, disponibles y no pasadas.
- **Cómo se mediría**: test de invariante sobre `assignTeam` + filas humanas: **nº de configuraciones
  con ciclo de objetivos o con dos cartas en el mismo equipo**. Banda objetivo **0**.

---

## Bloque E — El humano POR LIBRE y el precio de la libertad

### [HUMANO-30] Desobedecer no cuesta nada (la disciplina de SPEC 6.18 no existe)

- **Cuándo**: siempre que un humano se salga del plan.
- **Quién decide**: el equipo, en la vida real: no te convoca, te multa, no te renueva.
- **Lo que pasa en carretera**: la libertad existe y tiene precio. Un corredor que corre para sí en
  un equipo grande lo paga en la siguiente convocatoria.
- **Lo que hace hoy el motor**: **AUSENTE, verificado**. SPEC 6.18 lo especifica: «Disciplina: si la
  orden personal contradice el rol contractual, `team_trust -= U(5, 10)`; cumplir suma +1 por
  carrera. `team_trust` en `[0,100]` pondera convocatorias (7.3) y renovaciones (7.2). **La libertad
  existe y tiene precio**». Grep: `teamTrust` sólo aparece en `callups.ts` (peso `W_TRUST` 0,4 sobre
  4,0 en `callupScore`) y en el esquema; `columnasVivas.test.ts` la declara MUERTA: «Nunca se ha
  escrito (migración 0002), así que todos valen 50… aporta un 5 % CONSTANTE a todo el mundo y no
  ordena nada: **la dimensión está diseñada y no existe**».
- **Lo que dijo el dueño**: «No hay consecuencias administrativas de desobedecer (moral, confianza,
  no convocar)» — anotado como LÍMITE desde v15 §11; G2.4: «el motor YA tiene rebeldes… **y no hay
  nada que reaccione a eso**».
- **Información necesaria**: el evento ya existe (`rider_defies_team`) y llega a la crónica; lo que
  falta es que alguien lo escriba en `riders.team_trust` y que `selectSquad` lo note.
- **Cómo se mediría**: **desviación típica de `team_trust` en la población tras una temporada**. Hoy
  exactamente **0** (todos a 50). Banda objetivo tras G2: **σ ≥ 10 puntos** y correlación negativa
  entre rebeldías y convocatorias a objetivos marcados.

### [HUMANO-31] Cumplir tampoco da nada

- **Cuándo**: el humano hace exactamente lo que le tocaba (gregario que se vacía, lanzador que
  entrega, marcador que se pega).
- **Quién decide**: el equipo, que debería premiarlo.
- **Lo que pasa en carretera**: al buen gregario se le renueva, se le lleva al Tour y se le deja un
  día suelto.
- **Lo que hace hoy el motor**: **AUSENTE**. El `+1 por carrera` de SPEC 6.18 no existe (misma
  verificación de HUMANO-30). Peor: el motor **castiga** al cumplidor sin compensarlo:
  `finishRoleWeight` 0,88 al gregario y al lanzador (v48) y el peaje del trabajo del día en meta
  (`finishWorkWeight` 0,6, tope 0,15). El jugador que hace su trabajo pierde puestos, puntos y
  ranking, y no gana ninguna otra moneda.
- **Lo que dijo el dueño**: «no tiene sentido que luchen el sprint 2 del mismo equipo (y encima les
  gana el otro!!!). Si hubieran colaborado quizás hubieran ganado uno de ellos» (v48) — la respuesta
  fue el peso por rol; el corpus anota que «que el 70 % del campo sean gregarios es otra pregunta».
- **Información necesaria**: qué se le prometió al corredor (G2.3) y qué hizo (el parte `rider_daily_log.parte` ya lo guarda: km al frente, ataques, cerillos).
- **Cómo se mediría**: **puntos de temporada medianos de un humano que corre siempre de gregario
  frente a uno que corre siempre libre**, a 30 carreras. Hoy la diferencia debe ser fuertemente
  negativa para el gregario; banda objetivo tras G2: que la diferencia **deportiva** siga siendo
  negativa (es justo) pero se compense en **convocatorias, salario y renovación** de forma medible.

### [HUMANO-32] El humano agente libre (sin equipo)

- **Cuándo**: corredor sin `teamId` (recién creado, sin contrato) que se inscribe pagando el viaje.
- **Quién decide**: él solo, siempre.
- **Lo que pasa en carretera**: el corredor de un equipo pequeño invitado corre a la desesperada:
  se mete en la fuga porque es lo único que tiene.
- **Lo que hace hoy el motor**: **CUBIERTO por decisión explícita del dueño**. `teamId` nulo =
  «agente libre»; `driveOfRider` = 0, `teamAttack` = 1, no entra en ningún plan, no puede tener
  gregario ni lanzador (la lista de compañeros sale vacía en la UI) y sólo puede marcar rivales.
  `autoStageOrders` para libres: llano y SPR ≥ 68 → `sprinter`; `breakScore ≥ 58` → `cazaetapas`;
  resto sin orden. **Lo que falta**: no hay ninguna compensación por correr sin equipo (ni apetito
  extra de fuga, ni «hoy es mi día»), y en un pelotón con 22 equipos el agente libre es
  estructuralmente invisible.
- **Lo que dijo el dueño**: «un ciclista sin equipo, pues corre de forma individual» (§V.1, v15,
  citado en `types.ts`).
- **Información necesaria**: ninguna nueva; sí faltaría, para la conducta, saber que se corre sin
  red (el motor lo sabe: `teamId == null`).
- **Cómo se mediría**: **% de fugas del día que contienen al menos un agente libre**, comparado con
  su peso en el campo. Banda razonable **1,2-2,0× su peso poblacional**: el que no tiene equipo
  ataca más, y hoy el motor le da exactamente el mismo apetito que a un gregario de equipo grande
  (`teamAttack` 1 contra 1,4 del equipo sin motivo — es decir, **menos** que un equipo que se
  esconde: eso es CONTRARIO a la intuición del oficio).

### [HUMANO-33] La convocatoria: el humano marca deseos y el bot le lleva o no

- **Cuándo**: 5 días antes de cada carrera (`CALLUP_LEAD_DAYS`), sobre un roster congelado 14 días
  antes (`ENROLL_LOCK_DAYS`).
- **Quién decide**: `selectSquad` (muestreo ponderado sin reemplazo, `exp(2,5·score)`).
- **Lo que pasa en carretera**: no ir al Tour cuando lo habías pedido es una de las cosas que más
  duelen en este deporte.
- **Lo que hace hoy el motor**: **PARCIAL**. `callupScore` = `1,0·fit + 0,8·pts + 0,6·forma +
0,7·frescura + 0,5·deseo + 0,4·confianza + filosofía`. El deseo del humano PESA (`W_DESIRE` 0,5) y
  **la moral sólo se mueve para el humano**: `if (r.userId)` → `MORALE_CALLUP` si va,
  `−MORALE_SNUB` si lo pidió y no va (verificado en `packages/db/src/callups.ts:181-200`, comentario:
  «la tensión del jugador, SPEC 7.2»). **Lo que falta**: `team_trust` es constante (HUMANO-30), no
  hay composición de equipo («no hay "si va el sprinter, lleva lanzadores"; no hay cupos por
  vocación»), y el humano no recibe explicación de por qué no fue.
- **Lo que dijo el dueño**: SPEC 7.3: «No ser convocado a un objetivo marcado baja la moral: tensión
  deliberada»; G2.2: «Un corredor que corre poco se pudre y uno que corre demasiado llega roto a lo
  importante; **los dos tienen que quejarse**».
- **Información necesaria**: la composición del equipo (nadie la mira), el calendario del corredor
  (nadie mira la carga), y para el jugador: qué le faltó.
- **Cómo se mediría**: **% de escuadras de 8 sin ningún `leadOutScore` alto llevando un sprinter de
  SPR ≥ 68** (equipos mal compuestos). Banda objetivo **≤ 15 %**; hoy, como la selección es
  individual, debería salir alto y es un test barato de escribir.

### [HUMANO-34] Retirarse de una vuelta: la única decisión entre etapas

- **Cuándo**: entre dos etapas de una vuelta en marcha.
- **Quién decide**: el jugador, en `My races → Upcoming → Abandon` con confirmación.
- **Lo que pasa en carretera**: se abandona por lesión, por objetivo cumplido, o para preparar otra
  cosa. Es una decisión táctica de temporada.
- **Lo que hace hoy el motor**: **CUBIERTO como acción, AUSENTE como táctica**. Existe el botón
  (v14 §V.5, con confirmación «Abandon for good?») y el abandono sale como titular de noticias. No
  hay ninguna otra decisión entre etapas: ni cambiar la hoja de mañana en función de lo de hoy con
  ayuda, ni ajustar el objetivo, ni pedir día tranquilo. Es la superficie completa del «director
  deportivo» del jugador entre etapas.
- **Lo que dijo el dueño**: «Claro!! Quiero que si un ciclista no puede más pues que abandone
  automáticamente… **e incluso dejarle a un humano entre una etapa y otra decidir abandonar**»
  (v14).
- **Información necesaria**: para decidir bien haría falta saber el estado real (energía, forma,
  salud) y el juego sólo enseña estrellas y un parte de energía.
- **Cómo se mediría**: producto. **% de abandonos voluntarios de humanos que ocurren tras una etapa
  con `parte` en rojo** (pájara, fuera de control cerca). Banda razonable **≥ 60 %**: si la gente
  abandona sin señal, es que el juego no le está dando la información.

---

## Bloque F — DOS HUMANOS en el mismo equipo

### [HUMANO-35] Dos humanos se declaran los dos `lider`

- **Cuándo**: los dos rellenan su hoja sin verse.
- **Quién decide**: `pickLeader` → votos, si no `leaderScore` (sprinter 4 en llegada agrupada, lider
  3, cazaetapas 1), **desempate por id**.
- **Lo que pasa en carretera**: el equipo se parte, los gregarios no saben a quién arropar, y se
  pierde la etapa por dentro.
- **Lo que hace hoy el motor**: **PARCIAL y con un desempate arbitrario**. Gana uno y el otro es
  rebelde; el arbitraje final es **el id menor**, que es determinismo puro, no deporte. Los mapas lo
  dicen: «Dos jefes en un equipo… el jugador humano se pone de líder cuando su equipo ya tiene uno.
  `world/autoOrders.ts` nunca nombra dos, así que **en un pelotón de bots esto no ocurre nunca**»
  (teamPlan l. 219). O sea: es una situación **exclusivamente humana** y se resuelve por uuid.
- **Lo que dijo el dueño**: G2.1: «El conflicto de dos gallos en un corral es de las mejores
  historias que da este deporte, y hoy no puede ocurrir».
- **Información necesaria**: quién tiene más derecho (general, palmarés, contrato, promesa del
  mánager). Hoy `pickLeader` **no mira la general** (límite anotado nº 2 del mapa de órdenes: «en
  una llana de gran vuelta el jefe del plan es el velocista»), ni los atributos, ni el contrato.
- **Cómo se mediría**: test determinista sobre `pickLeader`: **% de desempates que se resuelven por
  id** en configuraciones con dos aspirantes. Banda objetivo **0 %** tras el arreglo (debería mandar
  la general, luego `finishScore`, luego el contrato); hoy es el 100 % de los casos empatados.

### [HUMANO-36] Un humano se pone gregario de otro humano

- **Cuándo**: dos amigos del mismo equipo se coordinan por fuera del juego.
- **Quién decide**: los dos jugadores; el motor lo acepta sin más.
- **Lo que pasa en carretera**: es exactamente lo que hace un equipo. Debería ser la forma normal de
  jugar en grupo.
- **Lo que hace hoy el motor**: **CUBIERTO de facto, sin saberlo**. El voto de un `gregario` con
  `targetRiderId` hacia un compañero cuenta en `pickLeader` y puede coronar jefe al otro humano por
  encima del reparto bot. Es la única palanca real de coordinación humana que existe hoy, y ninguna
  pantalla la explica ni la enseña (la API sólo devuelve las órdenes del propio corredor:
  `races.ts:309-312`).
- **Lo que dijo el dueño**: G7: «Canales de comunicación entre ciclistas» (sin empezar); G2.13
  «Comunicación» sin pieza.
- **Información necesaria**: que cada uno vea la hoja del otro (hoy imposible por API), o que exista
  un plan de equipo compartido.
- **Cómo se mediría**: producto: **% de equipos con ≥ 2 humanos en los que los dos apuntan al mismo
  jefe**. Es la métrica de si la coordinación es posible sin salir del juego. Banda razonable con G7
  puesto: **≥ 50 %**; hoy, sin canal, sería casualidad.

### [HUMANO-37] Dos compañeros (humanos o no) en la misma fuga: no se coordinan

- **Cuándo**: dos del mismo equipo entran en el mismo movimiento.
- **Quién decide**: nadie. Dentro de una fuga el plan de equipo **se apaga por diseño**.
- **Lo que pasa en carretera**: uno ataca y el otro se sienta a rueda de los rivales; se turnan los
  ataques hasta romper al resto; el peor rematador tira para el mejor. Es superioridad numérica y es
  media hora de televisión.
- **Lo que hace hoy el motor**: **AUSENTE**. `driveOfRider` se pasa como **0** fuera del pelotón («el
  plan de equipo decide qué hace el equipo CON EL PELOTÓN; dentro de una fuga se relevan todos»);
  `MoveRider` **no lleva `teamId`** (grep: 0 resultados en `tactics.ts`); `ataque_grupo` favorece al
  peor rematador (`tacticWorstFinisherWeight` 1,5) sin ninguna consideración de equipo; y
  `finishStage` **no recibe `teamOf` ni `teamPlans`** (grep vacío entre l. 6170-6500). La única
  noción de equipo dentro de una fuga es NEGATIVA (`sittingOn`, `tieneHombreDelante`).
- **Lo que dijo el dueño**: «no tiene sentido que luchen el sprint 2 del mismo equipo (y encima les
  gana el otro!!!). **Si hubieran colaborado quizás hubieran ganado uno de ellos**» (v48) — la
  respuesta fue `finishRoleWeight`, un factor por rol, no una mecánica; y el propio corpus anota que
  «LO PRIMERO QUE SE MIDIÓ FUE FALSO… De los seis casos de dos compañeros en el top-3, ninguno
  llevaba un lanzador dentro. Eran gregarios».
- **Información necesaria**: `teamId` en `MoveRider` y en el desenlace. Es el «cambio mínimo» que
  `docs/tactica.md` identificó bien.
- **Cómo se mediría**: **% de grupos de llegada de 2-8 con dos compañeros en los que gana un
  tercero**. Banda razonable tras el arreglo: **≤ 40 %** (la superioridad numérica debe pagar, pero
  no siempre); hoy no hay ningún mecanismo que lo mueva, así que debe salir cerca del azar.

### [HUMANO-38] Un humano marca a otro humano (rival)

- **Cuándo**: dos jugadores de equipos distintos se conocen y uno pone `marcador` del otro.
- **Quién decide**: el que marca. El marcado no puede hacer nada al respecto en su hoja.
- **Lo que pasa en carretera**: al marcado le sobra con amagar dos veces para vaciar al sombra. Es
  simétrico y es juego.
- **Lo que hace hoy el motor**: **PARCIAL, asimétrico**. El marcaje funciona (D-30/D-31), pero **el
  amago de SPEC 6.18 no existe** (ver HUMANO-03) y el marcado **no recibe ninguna señal** de que le
  marcan: `MoveRider` «no sabe quién le marca ni a quién marca». Además la orden es secreta antes y
  la crónica sólo la delata si produce un evento. En un juego con humanos esto es una asimetría
  jugable en un sentido y muda en el otro.
- **Lo que dijo el dueño**: SPEC 6.18 capa 4: «El marcado, si su mentalidad es combativa o superior,
  puede amagar… **Vaciarle la caja al sombra es la manera canónica de soltarlo**».
- **Información necesaria**: el marcado necesita saber (o intuir) que le marcan; el motor lo sabe
  (`markTargetOf`) y no se lo dice a nadie.
- **Cómo se mediría**: **cerillos gastados por el marcador frente a los del marcado** en finales en
  alto. Con el amago puesto, banda razonable **1,3-1,8×** a favor del marcador (marcar cuesta); hoy
  es ≈ 1,0× salvo por el 85 % heredado de los arreones, que no consta implementado en los mapas.

### [HUMANO-39] Ninguno de los dos ve la hoja del otro (ni antes ni después)

- **Cuándo**: siempre.
- **Quién decide**: la API: `GET /api/races/:key/orders` devuelve sólo las órdenes del propio
  corredor.
- **Lo que pasa en carretera**: las órdenes son secretas ANTES y evidentes DURANTE. Eso está bien
  especificado; lo que falta es la parte «evidentes».
- **Lo que hace hoy el motor**: **PARCIAL**. La primera mitad se cumple (secretas). La segunda a
  medias: la radio dice el motivo del relevo (`motiveLabel`) y la crónica anuncia al rebelde una
  vez, pero **el rol y la mentalidad de los demás nunca se hacen públicos**, ni siquiera al acabar.
  Un jugador no puede aprender del plan de sus rivales, que es el bucle que N1 promete.
- **Lo que dijo el dueño**: SPEC 6.18, doctrina: «Las órdenes son **secretas antes de la etapa y
  evidentes durante el relato**, como en la carretera». Y sobre el rebelde: «sigo viendo esta
  tontería absurda y que no se entiende: `Team orders are one thing…`» (v31), que se arregló
  colgando el anuncio de lo que el rebelde hace de verdad.
- **Información necesaria**: la orden de cada uno, congelada ya en `stage_snapshots.input`.
- **Cómo se mediría**: producto: **% de órdenes de la etapa que son deducibles del relato** (rol
  visible por conducta). Banda razonable **≥ 70 % para los protagonistas** (los que salen en la
  radio y la crónica); no tiene sentido pedir el 100 % para los 176.

---

## Bloque G — El MÁNAGER humano (G2) y el plan de equipo como ORDEN

### [HUMANO-40] El mánager fija el plan y el corredor escribe el suyo dentro del marco

- **Cuándo**: antes de cada carrera (plan) y antes de cada etapa (hoja individual).
- **Quién decide**: dos actores en cascada, que es el modelo que el dueño ya eligió.
- **Lo que pasa en carretera**: el director dicta el plan en la reunión; cada corredor tiene margen
  dentro de él; el que se sale, se sale a sabiendas.
- **Lo que hace hoy el motor**: **AUSENTE como contrato, CUBIERTO como derivación**. `buildTeamPlans`
  produce un `TeamPlan` completo (leaderId, stageCandidateId, purposes, intent, budget, claim) pero
  **lo DERIVA de las órdenes individuales y del recorrido**, dentro de `simulateStage`. No hay
  ninguna entrada por la que un plan llegue como dato. SPEC 6.18 capa 5 sí lo especifica («La
  táctica de equipo por carrera —**manager humano o IA**— designa protegido y política de control de
  fuga») y `mapa-spec.md` §5.5 confirma: «No aparece en el contrato del motor (`types.ts`); el plan
  de equipo se DERIVA en vez de venir de una orden de equipo».
- **Lo que dijo el dueño**: G2: «La solución es la misma que N1 propone para la carrera —**POLÍTICAS
  en vez de órdenes**—, aplicada en dos niveles: **el mánager fija el plan del equipo y cada corredor
  escribe el suyo dentro de ese marco**».
- **Información necesaria para aceptar un plan como ORDEN** (esto es la lista de campos que le
  faltan al motor): (1) **protegido/jefe de filas por carrera** (hoy `pickLeader` lo deriva y **no
  mira la general**); (2) **carta de la etapa** por si no coincide con el jefe (hoy
  `stageCandidateId` sale de `finishScore` con `teamStageCardGap` 8); (3) **política de control de
  fuga** `nunca|si_amenaza|siempre` (hoy `intentFor` la deriva de `gap` y `kmToGo`); (4) **motivo
  declarado** (hoy `purposes` se deriva de `gcDeficitSeconds` y `finishScore`; y sólo hay tres
  motivos: no existe «voy a por el maillot de la montaña»); (5) **presupuesto/quién se guarda para
  mañana** (hoy `teamBudgetPerRider` 9 fijo, por etapa); (6) **quién baja a por el jefe** (hoy
  `tieneElEncargo` lo deriva del rol y del target); (7) **prioridad entre dos cartas** (hoy no
  existe). Todo eso ya se calcula: lo que falta es poder **inyectarlo** y que la derivación sea el
  respaldo, no la fuente.
- **Cómo se mediría**: test de sustitución: **con el plan derivado inyectado como orden, la etapa
  debe salir idéntica bit a bit** (huella sellada). Banda objetivo **100 % de coincidencia** — es la
  prueba de que el plan es un contrato bien recortado y no una reescritura.

### [HUMANO-41] El mánager nombra jefe de filas y `pickLeader` opina distinto

- **Cuándo**: el mánager designa a un escalador para la reina y `pickLeader` corona al sprinter (o
  al revés).
- **Quién decide**: hoy, `pickLeader`, sin discusión.
- **Lo que pasa en carretera**: el jefe de filas lo nombra el equipo, no el perfil de la etapa.
- **Lo que hace hoy el motor**: **CONTRARIO en un caso concreto y anotado**. `pickLeader` va por
  (a) votos de gregarios/lanzadores, (b) `leaderScore` por rol y por si el final admite llegada
  agrupada. **Nunca mira la general**: límite nº 2 del mapa de órdenes: «en una llana de gran vuelta
  el jefe del plan es el velocista y el maillot podía entrar en la lista de los que bajan; se
  parcheó con `esElMaillot` en `helpBack`, pero **el jefe nominal del plan sigue siendo el
  sprinter**» — lo que contamina `leaderUpTheRoad`, `jefeEnApuros` y `pullFor`.
- **Lo que dijo el dueño**: «hay un pelotón en el que va tirando el equipo del líder… pero el líder
  va delante, en el grupo de caza, y el equipo dice que tira para defender el jersey. ¡Pero el que
  tiene el jersey no está en ese grupo!» (v58 §1) — síntoma del mismo agujero.
- **Información necesaria**: `gcRank`/`gcDeficitSeconds` de los miembros (el plan los tiene: los usa
  para `purposes`) y el nombramiento del mánager (no existe).
- **Cómo se mediría**: **% de etapas de gran vuelta en que `plan.leaderId` ≠ el mejor de la general
  del equipo teniendo motivo `maillot` o `general`**. Banda objetivo **≤ 5 %** (sólo cuando el
  equipo juega de verdad la etapa con otro hombre); hoy sale alto en llanas por construcción.

### [HUMANO-42] El mánager que es juez y parte

- **Cuándo**: el mánager humano corre él mismo y decide quién es el jefe.
- **Quién decide**: él, y ahí está el conflicto que el dueño quiere.
- **Lo que pasa en carretera**: existe y es una de las mejores historias del deporte; también es la
  forma más rápida de vaciar un equipo.
- **Lo que hace hoy el motor**: **AUSENTE**. Hoy el mánager premium (`POST /api/teams/take-over`)
  puede: editar identidad, draftear el calendario del equipo y fijar el plan de entrenamiento
  sugerido. **No** decide roles, ni convocatorias nombre a nombre, ni órdenes de sus corredores:
  ninguna ruta lo permite. O sea que el conflicto todavía no puede ocurrir, y cuando ocurra hará
  falta que exista el precio.
- **Lo que dijo el dueño**: «El mánager es juez y parte, y eso es lo mejor que tiene… si el mánager
  se nombra jefe de filas siempre, los humanos de su equipo se van. Hace falta que **abusar SALGA
  CARO por dentro del juego** (moral, salidas, reputación), no por una regla que lo prohíba»; y
  «**Pagar da AUTORIDAD, no vatios**».
- **Información necesaria**: histórico de nombramientos por corredor, promesas (G2.3) y moral que se
  mueva por motivos humanos (G2.11: «el corredor ya tiene `morale`… pero nada la mueve por motivos
  humanos»).
- **Cómo se mediría**: **% de carreras en que el mánager se nombra jefe a sí mismo** y **tasa de
  salidas de humanos de ese equipo al final de temporada**. Banda de diseño: la correlación tiene
  que ser positiva y visible (**+1 salida por cada 3-4 autonombramientos** sobre la base), o el
  precio no existe.

### [HUMANO-43] La política de caza del equipo como orden del mánager

- **Cuándo**: cada etapa; es la decisión de equipo más frecuente del ciclismo.
- **Quién decide**: el mánager (hoy: `intentFor`).
- **Lo que pasa en carretera**: «hoy no gastamos», «hoy controlamos a dos minutos», «hoy cazamos
  cueste lo que cueste». Tres políticas distintas con el mismo equipo y el mismo día.
- **Lo que hace hoy el motor**: **AUSENTE como orden, CUBIERTO y MUY calibrado como derivación**.
  `intentFor` produce `perseguir|lanzar|controlar|proteger|fuga|nada` y está afinado con cinco
  correcciones medidas del dueño (v38-2). Nota importante para el rediseño: **la opción `nada` para
  un equipo con carta de etapa se probó y «midió fatal»** (frente sin dueño, corte que se iba en el
  km 160), y **bajar el presupuesto para forzar relevos entre equipos «es la palanca equivocada,
  también medido»** (la fuga pasaba a ganar el 38 % de las llanas). Es decir: si el mánager puede
  escribir `nunca`, el motor tiene que absorberlo sin romper esas bandas.
- **Lo que dijo el dueño**: «pon también foco en revisar la lógica de quién tira de cada grupo… pues
  está bastante mal esa distribución… ok, sí, **rehaz ese bloque entero, wey**» (v38-2); y «¿y si no
  hay fuga también? ¿y si la fuga está cerca también?» → la respuesta correcta es «controlar», no
  «nada».
- **Información necesaria**: la política (falta), y todo lo demás ya lo tiene la situación
  (`gapSeconds`, `kmToGo`, `frontThreatDeficit`, `manUpTheRoad`, `leaderUpTheRoad`).
- **Cómo se mediría**: con las tres políticas puestas a mano en el banco canónico: **fuga ganadora en
  llano por política**. Bandas razonables: `siempre` **≤ 5 %**, `si_amenaza` **5-16 %** (la banda del
  dueño, que es el defecto de hoy), `nunca` **25-45 %** — y que ninguna política deje bloques sin
  dueño del frente (hoy **0 %**, v38-2, y ése es el invariante a no romper).

### [HUMANO-44] El mánager reparte los objetivos de la temporada entre los suyos

- **Cuándo**: al planificar el calendario del equipo.
- **Quién decide**: el mánager; hoy nadie.
- **Lo que pasa en carretera**: «tú llevas el Giro, tú la Vuelta, tú vas a clásicas». Es lo que
  ordena todo lo demás: entrenamiento, convocatoria, forma y rol.
- **Lo que hace hoy el motor**: **AUSENTE**. Existe el draft de calendario del equipo
  (`POST/DELETE /api/teams/me/calendar/:raceId`) y el plan de entrenamiento sugerido
  (`PUT /api/me/team-training`), pero no hay «objetivo de X para Y». Del lado del corredor lo más
  parecido son los `race-prefs` («Season objectives» en el perfil), que son **deseos de ir**, no
  objetivos de resultado. Y el entrenador bot «reparte por igual sin mirar el calendario, la forma ni
  el objetivo del mes» (v53, anotado).
- **Lo que dijo el dueño**: G2.3: «Decirle a alguien que llevará el Giro. Cumplirlo o no. **Sin esto
  la moral es un número que sube y baja solo; con esto es una relación**».
- **Información necesaria**: el objetivo, y que lo lea `world/training` (para el pico de forma) y
  `callups` (para la convocatoria). Los dos existen y ninguno lo recibe.
- **Cómo se mediría**: **correlación entre la fecha del objetivo y el pico de `formIndex`** de ese
  corredor. Banda razonable **el pico cae dentro de ±10 días del objetivo en el 50-70 % de los
  casos**; hoy debe ser ruido (el entrenador no mira el calendario).

### [HUMANO-45] Heredar un equipo bot sin que se note el cambio de manos

- **Cuándo**: un humano reclama un equipo bot en marcha (`take-over`).
- **Quién decide**: el sistema, que tiene que seguir decidiendo por defecto lo que decidía el bot.
- **Lo que pasa en carretera**: si el equipo cambia de director, el pelotón no debería notarlo de un
  día para otro.
- **Lo que hace hoy el motor**: **CUBIERTO por accidente**. Como el mánager no puede tocar nada de
  carrera, heredar un equipo no cambia absolutamente nada de su conducta. En cuanto exista el plan
  de HUMANO-40, hará falta que **el plan bot por defecto sea exactamente el que hoy se deriva** — es
  decir, que `buildTeamPlans` pase a ser «el mánager bot» y su salida sea el valor por defecto del
  formulario del mánager humano.
- **Lo que dijo el dueño**: «**La mayoría de los equipos NO tendrán mánager humano.** O sea que el
  mánager bot tiene que tomar todas estas decisiones de forma creíble por defecto, y un humano tiene
  que poder heredar un equipo ya en marcha **sin que se note el cambio de manos**» (G2).
- **Información necesaria**: ninguna nueva; es una restricción de arquitectura (la derivación de hoy
  tiene que sobrevivir como respaldo).
- **Cómo se mediría**: el mismo test de sustitución de HUMANO-40: **huella sellada idéntica** con
  plan derivado inyectado. Banda **100 %**.

### [HUMANO-46] Precedencia: plan de equipo contra orden individual

- **Cuándo**: cada vez que las dos existan y no coincidan.
- **Quién decide**: hoy, la regla 1 de `teamPlan.ts`, ya escrita.
- **Lo que pasa en carretera**: el corredor que se salta el plan corre su carrera; el equipo no le
  arropa y él lo sabe.
- **Lo que hace hoy el motor**: **CUBIERTO como principio, sin coste**. Las tres reglas de cabecera
  son literales: «**Las individualidades priman sobre el plan.** El que corre por su cuenta (§VI.2)
  queda FUERA del plan: ni le empuja ni le frena»; «Un corredor sin equipo corre solo»; «Un campo sin
  equipos se comporta EXACTAMENTE como antes». La precedencia está resuelta y es la correcta. Lo que
  falta es el precio (HUMANO-30) y la posibilidad de que el plan venga de una persona (HUMANO-40).
  Nota de diseño para el rediseño: **la tercera regla es un invariante de no-regresión** (cualquier
  contrato nuevo de plan tiene que dejar intacto el campo sin equipos).
- **Lo que dijo el dueño**: «si un ciclista humano desobedece las órdenes de equipo y va por su
  cuenta, **esas priman**» (§VI.2, v15).
- **Información necesaria**: ninguna nueva.
- **Cómo se mediría**: banco sin equipos (`teamPlans.size === 0`): **huella idéntica antes y después
  del rediseño**. Banda **100 %** — es el test que ya existe y que protege esta regla.

### [HUMANO-47] Los motivos que un mánager querría declarar y el motor no tiene

- **Cuándo**: etapa con maillot de la montaña o de los puntos en juego, o con un joven en la pelea
  del blanco.
- **Quién decide**: el mánager (y hoy, el motor, con tres motivos).
- **Lo que pasa en carretera**: media parrilla corre por cosas que no son la etapa ni la general:
  el lunares, los puntos, la combatividad, el equipo, el joven.
- **Lo que hace hoy el motor**: **AUSENTE**. `TeamPurpose` sólo tiene `etapa | maillot | general |
ninguno`, derivados de `finishScore` y `gcDeficitSeconds`. `mapa-spec.md` §9 lo señala como una de
  las ausencias del primer rediseño: «hoy sólo hay tres motivos y **ninguno cubre "voy a por el
  maillot de la montaña"**». Y el motor **no recibe ninguna clasificación secundaria**: `StageRider`
  sólo trae `gcDeficitSeconds` y `gcRank`.
- **Lo que dijo el dueño**: «no es solo saber qué equipo(s) participan de la persecución... también
  es saber **POR QUÉ**!!» (v15 §13) — la lista que dio entonces eran tres motivos, pero el juego ya
  tiene banners, puntos y cimas.
- **Información necesaria**: las clasificaciones secundarias en el input de la etapa (la base las
  tiene: `sprintPts`, cimas), y un cuarto/quinto valor de `TeamPurpose` con su `claim` propio.
- **Cómo se mediría**: **% de bloques de una etapa con banners en que algún equipo tiene un motivo
  distinto de los tres actuales**. Banda razonable **10-25 % de las etapas** con al menos un equipo
  jugando una secundaria; y de control, que `teamPullWithReasonPct` siga en **95-100 %** (v15).

---

## Bloque H — El bucle de aprendizaje (N1): el informe con el que se corrige el plan

### [HUMANO-48] «Esto se decidió aquí y tú habías dicho esto otro»

- **Cuándo**: después de cada etapa.
- **Quién decide**: nadie; es el bucle que convierte las órdenes en un juego.
- **Lo que pasa en carretera**: el director repasa el vídeo con el corredor.
- **Lo que hace hoy el motor**: **AUSENTE**. El informe personal («Your last race») enseña sólo
  `role`, `mentality`, `contestSprints`, `contestClimbs` — **no enseña `effort`, `triggerKm` ni
  `targetRiderId`** (`raceReportOrdersSchema`, `contracts.ts:1287-1292`). El veredicto (`raceVerdict`)
  es una **heurística por puesto**, no una comparación con la orden, aunque el panel se describa como
  «compara lo que el corredor ordenó con lo que ocurrió». Y el parte de energía
  (`rider_daily_log.parte`) tiene todo lo necesario (km al frente, km delante, ataques, saltos,
  cerillos, segundos sobre umbral, «lost the bunch at km») **y no lo enlaza con la orden**.
- **Lo que dijo el dueño**: N1: «la crónica y la radio dejan de ser solo lectura y pasan a ser el
  INFORME con el que se corrige el plan de la próxima —"**esto se decidió aquí y tú habías dicho esto
  otro**"—. La partida se juega escribiendo planes mejores».
- **Información necesaria**: la orden congelada (está en `stage_snapshots.input`), los eventos
  congelados (están), y el parte (está). Los tres existen y nadie los cruza.
- **Cómo se mediría**: producto: **% de etapas del jugador con al menos una línea de informe que cita
  su orden**. Banda objetivo **≥ 80 %** (siempre hay algo que decir, aunque sea «tu cita del km 80 no
  llegó: ibas sin cerillos»).

### [HUMANO-49] El informe re-simula la etapa con el motor de hoy

- **Cuándo**: cada vez que el jugador abre «Your last race».
- **Quién decide**: `getRiderLastRaceReport` (`db/raceReport.ts:78-`).
- **Lo que pasa en carretera**: no hay equivalente. Es un defecto puro.
- **Lo que hace hoy el motor**: **CONTRARIO a la regla que el propio repo escribe**. El informe
  **re-simula** la etapa desde el snapshot con `simulateStage(input, snap.seed)` **con el motor
  actual**, en vez de leer los `events` congelados —que es lo que sí hacen la crónica y la radio—.
  Consecuencia: tras cualquier `engine_version++` el informe personal de una etapa vieja puede
  contradecir a la crónica de la misma etapa, y el bucle de N1 se apoyaría en un relato falso.
- **Lo que dijo el dueño**: la regla de replay es del repo (SPEC 6.1, `checkReplay`, «huellas
  selladas»); la queja emparentada del dueño: «un corredor ganó 3 etapas… y en las clasificaciones,
  incluso tras la etapa 1, pone DNF» (v45 §1), que fue el mismo tipo de defecto (leer mal el
  congelado).
- **Información necesaria**: los eventos congelados, que ya están en `stage_snapshots.events`.
- **Cómo se mediría**: test: **el informe de una etapa antigua debe coincidir con su crónica en
  puesto, tiempo y eventos protagonizados**. Banda **100 %**; hoy falla en cuanto cambia el motor.

### [HUMANO-50] El jugador puede no aparecer en su propia carrera

- **Cuándo**: el humano va a rueda todo el día, no es top-10 y no tira.
- **Quién decide**: `radioWatchList` (`stageRun.ts:420-428`): los que tiran, los tres maillots y el
  top-10.
- **Lo que pasa en carretera**: la televisión no enfoca a todos, es cierto. Pero el corredor sabe
  siempre lo que hizo.
- **Lo que hace hoy el motor**: **PARCIAL**. En la radio el jugador es uno de los «+56 riders more»
  si no cumple ninguno de los tres criterios; en la crónica «sólo cuenta lo que es NOTICIA» y **no
  hay marca de "éste eres tú"**. La compensación privada es el parte de energía, que existe y es
  bueno, pero no cuenta CARRERA, cuenta gasto.
- **Lo que dijo el dueño**: la radio nació de «ver km por km qué grupos hay, quién va en cada grupo…
  y las distancias entre grupos»; y el parte nació de «algo habrá hecho, digo yo».
- **Información necesaria**: `userId` en la lista de vigilancia. La base lo sabe (el motor no, y no
  hace falta que lo sepa: se resuelve al construir `radioWatchList`).
- **Cómo se mediría**: **% de km de etapa en que el jugador aparece nominalmente en la radio**. Banda
  objetivo **100 %** para el corredor propio (es su carrera), manteniendo el tope de nombres para el
  resto.

---

## Bloque I — G9: dónde tendría que ser peor un bot

### [HUMANO-51] El bot no se equivoca al repartir roles (y una persona sí)

- **Cuándo**: cada etapa, para los 22 equipos.
- **Quién decide**: `assignTeam`, «PURO y DETERMINISTA (decide solo por atributos, con desempate
  estable por id)».
- **Lo que pasa en carretera**: los directores se equivocan: llevan al sprinter a una etapa que no
  es, ponen de gregario al que estaba en forma, no ven que el rival ha traído tres escaladores.
- **Lo que hace hoy el motor**: **CONTRARIO a G9**. El reparto bot es óptimo por construcción dentro
  de su información: sin azar, siempre el mejor SPR de sprinter, siempre el mejor `leadOutScore` de
  lanzador, siempre el mejor `breakScore` de cazaetapas. Su única «imperfección» es de INFORMACIÓN
  (no ve la forma del día, ni los cerillos, ni quién ganó ayer, ni el perfil real: sólo `kind`), y
  esa imperfección es fija e igual para todos los equipos, o sea que no produce variedad.
- **Lo que dijo el dueño**: G9: «Cuando tengamos muchos humanos habría que hacer que **sean peores
  que los humanos**»; G8: limpiar bots «siempre de los que tengan 0 puntos en el ranking»; y sobre
  el nivel: «claramente menos del 15 % [con 5★] de momento (y **cuando haya humanos buenos bajaremos
  eso a 0**)».
- **Información necesaria**: para degradar bien hace falta un eje **por equipo** (calidad de
  dirección) que module el reparto, no un dado global.
- **Cómo se mediría**: **% de etapas en que el reparto bot coincide con el reparto óptimo a
  posteriori** (el que habría ganado). Banda objetivo tras G9: **60-85 %** según categoría del equipo
  (WT arriba, Continental abajo); hoy es una constante por construcción y no discrimina equipos.

### [HUMANO-52] Las tres palancas que un bot nunca usa

- **Cuándo**: siempre.
- **Quién decide**: `assignTeam`, que **nunca da `marcador`, nunca pone `effort` y nunca pone
  `triggerKm`**.
- **Lo que pasa en carretera**: los tres son gestos normales de un director: «hoy vas a rueda de
  ése», «hoy te lo dejas todo», «ataca en el pie del último puerto».
- **Lo que hace hoy el motor**: **PARCIAL y asimétrico a favor del humano**. Es hoy la ÚNICA ventaja
  estructural del jugador: tres palancas que el campo bot no usa. Eso encaja con G9 por casualidad,
  no por diseño — y tiene un problema: como `effort` sólo vale medio punto de deber y `triggerKm`
  sólo es una cita, la ventaja es pequeña y el jugador no la percibe («el resultado es casi lo mismo
  ponga lo que ponga ahí»). O sea: la asimetría existe donde no se nota y no existe donde sí.
- **Lo que dijo el dueño**: G9 (arriba) y la queja madre de las instrucciones.
- **Información necesaria**: ninguna nueva; es una decisión de diseño sobre qué se le da al bot.
- **Cómo se mediría**: **puntos de temporada de un humano que usa las siete palancas frente a un bot
  clonado (mismos atributos) que usa cinco**, a 30 carreras. Banda de diseño **+5 a +15 %** a favor
  del humano: suficiente para que jugar bien importe, poco suficiente para que el pelotón bot siga
  siendo creíble.

### [HUMANO-53] Un bot nunca escribe una orden mala

- **Cuándo**: siempre.
- **Quién decide**: nadie; es una propiedad de `autoOrders`.
- **Lo que pasa en carretera**: un equipo modesto pone al sprinter a disputar una etapa de montaña
  porque no tiene otra cosa; un director se equivoca de día.
- **Lo que hace hoy el motor**: **AUSENTE**. Las cuatro reglas de `orderAdvice` describen exactamente
  las órdenes «malas» que el juego reconoce (sprinter o lanzador en montaña, rol dependiente sin
  objetivo, cita fuera del recorrido, ahorrar + supercombativo) — **y ningún bot puede producir
  ninguna de ellas**. Es decir: el juego ya sabe enumerar el error, y sólo los humanos pueden
  cometerlo.
- **Lo que dijo el dueño**: G9; y para el entrenador bot ya fijó la doctrina equivalente:
  «**Razonable, nunca óptimo**» (v53). La misma doctrina aplicada a las órdenes de carrera es la
  respuesta natural.
- **Información necesaria**: ninguna; sobra información. Falta un eje de calidad por equipo y una
  fuente de azar sembrada (`rngOrders`) que hoy no existe (`autoOrders` es «sin azar»).
- **Cómo se mediría**: **% de equipos-etapa con al menos un aviso `warn` de `orderAdvice`**. Hoy es
  **0 %** para los bots. Banda objetivo tras G9: **5-20 %** según categoría, y que el ganador de la
  etapa venga de un equipo sin aviso más veces que de uno con aviso (relación **≥ 1,3×**).

### [HUMANO-54] Bots peores por INFORMACIÓN, no por vatios

- **Cuándo**: en cada decisión de carrera.
- **Quién decide**: es una decisión de arquitectura del rediseño.
- **Lo que pasa en carretera**: los equipos malos no corren más despacio: corren peor informados y
  peor coordinados. Van tarde a los sitios, no ven la fuga buena, tiran cuando no toca.
- **Lo que hace hoy el motor**: **AUSENTE, y hay una advertencia del dueño que lo condiciona**. Todos
  los equipos deciden con la misma información y con el mismo código; la única diferencia es el
  material humano. La forma correcta de cumplir G9 sin romper «Pagar da AUTORIDAD, no vatios» es
  degradar **lo que el bot VE** (retraso en enterarse del hueco, error en la general virtual, no ver
  al segundo peligro) y **cada cuánto decide** (el pelotón decide cada 10 bloques; un equipo malo
  podría decidir cada 30), nunca su física.
- **Lo que dijo el dueño**: G2: «**Pagar da AUTORIDAD, no vatios.** Si el rol de mánager viniera con
  ventaja deportiva sería pagar por ganar»; G9: «hacer que sean peores que los humanos».
- **Información necesaria**: un `teamSkill` por equipo que module latencia y ruido de las entradas
  del plan (`gapSeconds`, `frontThreatDeficit`, `manUpTheRoad`). Todas esas entradas existen ya en
  `TeamSituation`, o sea que el punto de inyección es único y pequeño.
- **Cómo se mediría**: **diferencia de km al frente «mal gastados»** (trabajo con intent `perseguir`
  contra una fuga que no amenaza) entre equipos de skill alto y bajo. Banda razonable **1,5-2,5×** a
  favor del equipo malo (gasta más y peor), con **la velocidad media del pelotón sin cambiar**
  (control: la física es la misma para todos, ±1 %).

---

## Apéndice — Situaciones de la lente que dependen de datos que el motor no recibe

Se listan aparte porque cualquiera de ellas exige ampliar `StageInput`/`StageRider`, no la capa
táctica. Todas están respaldadas por citas del corpus.

### [HUMANO-55] «Al que ganó ayer se le mira» (memoria entre etapas)

- **Cuándo**: etapa 2 en adelante de una vuelta.
- **Quién decide**: el pelotón como colectivo, y el jugador al escribir su hoja.
- **Lo que pasa en carretera**: al que ganó ayer no le dejan irse; al que se pasó el día en la fuga
  se le da cuerda hoy; el equipo que se vació ayer no tira hoy.
- **Lo que hace hoy el motor**: **AUSENTE, textual**: «Hoy el motor **no arrastra NADA** de un día
  para otro en lo táctico» (`docs/tactica.md` D1, recogido en `mapa-spec.md` §5.9). Lo único que
  cruza el día es el estado físico (energía inicial vía Banister) y la general.
- **Lo que dijo el dueño**: «Race Alps: un escalador de 95 gana 1 de 5 etapas de montaña y no es
  favorito en las otras cuatro» / «**3 etapas seguidas de montaña y las 3 las gana el mismo
  ciclista**» (v42 §3, v43 §11) — sigue ABIERTO en el corpus, «no está demostrado que sea la causa».
- **Información necesaria**: ganador de ayer, quién estuvo en la fuga ayer, qué equipo gastó ayer,
  `mishapKm` de ayer. `packages/db` lo sabe todo; `StageInput` no lo lleva.
- **Cómo se mediría**: **% de vueltas de 5 etapas en que el mismo hombre gana ≥ 2 etapas del mismo
  tipo**. El dueño ya puso el listón implícito en Race Arabia («el top-5 se repite 3,3 de 5 contra
  1,0 en Colombia») y v24 lo bajó a **3,2 %** de barrido. Banda razonable **≤ 15 %** de vueltas con
  doblete en el mismo terreno.

### [HUMANO-56] El pinchazo, que es la mitad de las órdenes condicionales de un director

- **Cuándo**: cualquier momento; es el incidente más común del ciclismo.
- **Quién decide**: el equipo (bajar hombres, esperar, dar rueda).
- **Lo que hace hoy el motor**: **AUSENTE, anotado tres veces**: «El PINCHAZO y la avería mecánica
  **no existen todavía en el motor**» (`simulate.ts:285`, `l.2082`, `constants.ts:3874`). La regla de
  ayuda al favorito de la etapa (D-13) sólo se dispara por caída (`mishapKm`), y el corte de la crono
  es «una salvaguarda dormida» porque `simulateTimeTrial` devuelve `incidents: []`.
- **Lo que dijo el dueño**: «salvo que sea un pinchazo/caída y la distancia sea pequeña» (v37) —
  la orden condicional que más pediría un jugador («si pincho, esperadme») no puede existir hasta
  que exista el suceso.
- **Información necesaria**: el propio suceso, con su hueco y su duración.
- **Cómo se mediría**: cuando exista, **incidentes mecánicos por etapa**. Banda razonable **0,5-2 por
  etapa de 176 corredores** (es frecuente y casi siempre inocuo), con **≤ 0,15 por etapa** que
  cuesten más de 60 s — y comprobar que el corte de la crono (`timeCutItt` 0,25) deja de estar
  dormido.
