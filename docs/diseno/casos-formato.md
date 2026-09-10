# Catálogo de situaciones — LENTE «FORMATO DE CARRERA»

Lente: qué cambia en la conducta de cada tipo de equipo según el FORMATO (clásica llana / pavés / cotas / montaña / larga; vuelta corta con y sin crono; vuelta de solo llanas; gran vuelta por semanas; contrarreloj individual por posición en la carrera; CRE; circuito; final en alto vs tras descenso vs valle largo). Otras lentes cubren fuga/pelotón/desenlace en abstracto; aquí todo se mira desde «qué carrera es hoy y qué carrera es mañana».

Fuentes leídas enteras: los seis mapas (`mapa-requisitos-duenio.md`, `mapa-spec.md`, `mapa-simulate-decisiones.md`, `mapa-tactics.md`, `mapa-equipo-ordenes-final.md`, `mapa-entrenamiento-atributos.md`). Comprobaciones por Grep en `packages/engine/src` (septiembre 2026, `ENGINE_VERSION = 52`):

- `StageInput` (`stage/types.ts:167-187`) lleva SOLO `profile`, `riders`, `timeTrial?: boolean`, `lugar?`. **No lleva** número de etapa, total de etapas, «es la última», «mañana hay crono / descanso / montaña», clase de la carrera ni clasificaciones secundarias. El único contexto de carrera que entra es por corredor: `gcDeficitSeconds`, `gcRank`, `bib`, `teamId`, `orders`, `energy`/`matches` (que arrastran la fatiga vía Banister). `packages/db/stageRun.ts` sí sabe `stageDay`, `isFinal`, `kind`, `isOneDay` (l.82-104) y **no se los pasa al motor** (l.369-379): los usa para las noticias, la enfermedad entre etapas y para poner a 0 las bonificaciones en carreras de un día (l.512).
- `hasGcContext` = alguien con `gcDeficitSeconds > 0` (`simulate.ts:1569`). En la etapa 1 de cualquier vuelta y en toda clásica vale `false`: para el motor **la etapa 1 de una gran vuelta es indistinguible de una clásica**.
- Bonificaciones: solo en meta, `STAGE.timeBonuses = [10, 6, 4]` (`constants.ts:3811`, `simulate.ts:6496`). No hay bonificaciones en metas volantes; los banners reparten puntos (`sprintPts`, `climbPts`) que el motor no lee de vuelta.
- Contrarreloj (`stage/timetrial.ts`): ritmo fijo `ttCommitment = 0,85`, sin órdenes (`autoStageOrders` devuelve mapa vacío en `timeTrial`, todos `libre`), sin equipos, sin incidentes (`incidents: []`), alcances solo narrados (`tt_catch`), orden de salida inverso a la general a 120 s o por dorsal a 60 s (`startOrder.ts`). El maillot recibe `LEADER_JERSEY_BOOST` (×1,04 en `eff0`, `db/stageRun.ts:352-364`) también en la crono.
- CRE: «No existe modo CRE ni entrada que lo active (`StageInput.timeTrial` es booleano)» (`constants.ts:3725`); `teamTtShelter 0,5 / teamTtPaceRider 4 / teamTtPaceFactor 0,98` definidas y sin uso.
- Circuito: solo existe en datos de recorrido (`routes/classicRoutes.ts::circuitClimbs`); el motor no sabe qué es una vuelta ni cuántas quedan.
- Composición de vueltas (`routes/calendar.ts::mixRoles`): primera etapa siempre llana; crono en la penúltima o antepenúltima (`ittEarlierChance`), segunda crono hacia el 35 % si n ≥ 15; última etapa «decisiva o de trámite» por sorteo (`lastDecisiveChance`, `grandTourLastDecisiveFactor`), más corta (`lastStageKmFactor`); garantías de final en alto.
- Terreno de meta (`stage/finish.ts`): la última cota se busca en los últimos 15 km; `alto` si corona ≤ 0,6 km de meta o últimos 3 km ≥ 5 %; `puncheur` si corona ≤ 5 km y `climbScore ≥ 15`; `descenso` si ≥ 50 % de los últimos 3 km baja; `pave` si ≥ 10 % de los últimos 30 km. Un puerto que corona a 22 km de meta **no existe para el modelo de final**.

## Tipos de equipo del dueño (vocabulario de este catálogo)

Los tipos salen de los motivos e intenciones del plan de equipo (`teamPlan.ts`: `etapa | maillot | general | ninguno`; `perseguir | lanzar | controlar | proteger | fuga | nada`), de `autoOrders.ts` y de la regla del dueño «un ciclista sin equipo corre de forma individual»:

| Tipo                                       | Quién es                                         | Cómo lo ve hoy el motor                                                                            |
| ------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **T1 equipo de velocista**                 | sprinter + lanzador + gregarios                  | `etapa` con `bunchFinish` → `controlar`/`perseguir`/`lanzar`; tren de D-03/D-28                    |
| **T2 equipo del maillot**                  | lleva al 1.º de la general                       | `maillot` → siempre `controlar`; `relayRaceLeaderPenalty`; `esElMaillot` no baja                   |
| **T3 equipo de un favorito de la general** | 2.º-5.º (≤ 420 s)                                | `general` → `controlar` si amenazado, si no `nada`; empujón `gcChallengeShare` solo en `gcTerrain` |
| **T4 equipo de clásicas / puncheur**       | carta `etapa` en `puncheur`/`pave`/`descenso`    | mismo camino que T1 porque `sprintFinish` = `bunchFinish` (deuda §8.9 del mapa de equipo)          |
| **T5 equipo sin baza / de fuga**           | ninguna carta a ≤ 8 puntos del mejor, ni general | `ninguno` → `nada`, `teamAttackFree` 1,4                                                           |
| **T6 equipo con jugador humano**           | órdenes propias; puede ser rebelde               | §VI.2: fuera del plan, coste intrínseco, sin consecuencia administrativa                           |
| **T7 corredor sin equipo**                 | `teamId` nulo                                    | agente libre: `driveOfRider` 0, `teamAttack` 1                                                     |

Bancos que existen y a los que remite «Cómo se mediría»: canónicos `llana-180`, `media-190`, `reina-150`, `reina-150-s3`, `reina-real-s3`, `cri-40` (`sim/scenarios.ts`); `grandTour` (race-france, 21 etapas, 22×8, fatiga arrastrada); `smallTours` (carreras pequeñas reales enteras); `realQueens`; `calendarQueens`; `timeTrials` (cronos reales); `climbs`; `coherence`; `tactics`. Faltan y se piden aquí: un **banco de clásicas** (las ocho reales ya cargadas) y el **banco de carrera pequeña con estado arrastrado** que pide `tactica.md §4`.

---

## A. Clásicas (un día, sin mañana)

### [FORMATO-01] Clásica llana: la fuga de figurantes y el día que pertenece a los trenes

- **Cuándo**: clásica de un día sin terreno selectivo (Scheldeprijs, Brujas–De Panne sin viento). Km 0-30 pelea por la fuga; km 30-150 control; km 150-meta caza y tren.
- **Quién decide**: T5 (quién va a la fuga), T1 (quién controla y cuándo caza), el pelotón como colectivo (a cuántos deja ir).
- **Lo que pasa en carretera**: la fuga la forman equipos SIN velocista (T5, continentales invitados): 4-7 corredores, uno por equipo, casi nunca dos del mismo. Los T1 dejan ir hasta que ningún fugado es un rematador y el número es pequeño; luego un solo T1 «compra» el control (rueda a 3-4 min) y a 60-70 km se suman 2-3 T1 más y cierran a ritmo medido (1 min por 10 km). Variante T1 fuerte único: controla solo y a veces se pasa (fuga cazada a 30 km → contraataques). Variante sin T1 claro (campo modesto): nadie compra el control, la fuga se va a 8-15 min y gana (de ahí «al menos una sin sprint» del dueño). Los T7 y T5 no gastan en el pelotón.
- **Lo que hace hoy el motor**: D-10/D-11 (`teamStance`, `frontTeamId`), D-12 fuerza de caza por trenes, D-16 lazo cerrado con `chaseCatchTargetKm` 12; `teamChaseSecondsPerKm` 1,5 («no se caza desde el km 20»); `pelotonAllows` con `tacticAllowSizePenalty` por tamaño. **PARCIAL**: el reparto «uno por equipo» no existe (tactica.md A1: `teamAttackUpTheRoad 0,4` binario, sin cupo); la aduana no vota por equipos («esta fuga no me vale» ausente, mapa-spec §9.5). Sin general, `hasGcContext` = false y la clásica se corre como una llana canónica.
- **Lo que dijo el dueño**: «Las etapas llanas no siempre tienen por qué llegar al sprint: puede haber escapados» (v10); «en etapas llanas nunca gana una fuga casual» (v23); «una etapa llana debería tener una banda más centrada en el 10 %» (v38). Sobre composición: «no tiene sentido que luchen el sprint 2 del mismo equipo» (v48) y los seis casos de tactica.md («seis del mismo equipo en la fuga»).
- **Información necesaria**: cada T1 tiene que saber cuántos y quiénes hay en la fuga, de qué equipos, si alguno remata (finishScore relativo al campo) y cuántos T1 hay en el pelotón para repartirse la caza. Hoy el plan ve `manUpTheRoad` de sus cartas y `gapSeconds`, pero la aduana (`pelotonAllows`) solo ve `size` y déficit de general; el corredor que salta no ve `teamId`.
- **Cómo se mediría**: sobre un banco de clásicas llanas + `llana-180` con 22 equipos: (a) «gana la fuga» **5-16 %** (banda del dueño, v38); (b) «máximo de un equipo en la fuga del día» ≤ 2 en ≥ 90 % de las etapas (en carretera dos del mismo equipo en una fuga llana es raro y tres casi nunca); (c) `catchKmToFinish` 8-25 (banda existente); (d) «equipos T1 que tiraron en la caza» mediana 2-3 (`frontTeamsPerStage` 1,8-4 existente).

### [FORMATO-02] Clásica llana con viento: el abanico como decisión, no como accidente

- **Cuándo**: clásica llana o etapa llana costera con viento lateral; tramos expuestos concretos (el motor hoy sopla toda la etapa).
- **Quién decide**: el equipo fuerte con números (T1 o T2/T3 en vuelta), cada corredor (colocarse).
- **Lo que pasa en carretera**: un equipo con 6-7 hombres delante ELIGE romper al entrar en el tramo expuesto: se pone en fila en cabeza, cierra la cuneta y acelera a tope 3-5 km; el resto o está en los primeros 30 o se queda. Los equipos con el jefe mal colocado pagan gregarios enteros para llevarlo al primer abanico; el T1 cuyo velocista queda cortado deja de tener motivo y pasa a `nada`. Después del tramo, el primer abanico decide si seguir (si tiene rematador y números) o esperar (si su jefe quedó atrás). Variante clásica (sin general): la ruptura la mueve solo el interés de la etapa; variante gran vuelta 1.ª semana: la mueven los T2/T3 para hacer daño a un rival (ver FORMATO-50).
- **Lo que hace hoy el motor**: D-48 `corte` con dado `windBreakPerKm 0,015·viento`, colocación por puntos (+25 equipo del frente, +12 jefe con gregario, ±10 suerte), hasta 3 filas; D-19 suelo `windRaceCommit 0,82`; D-02 en abanico rota la fila entera salvo protegidos; `onRough` sin reenganche; **el abanico no se cierra nunca** (§19.5). **PARCIAL**: no hay decisión «rompo aquí» de un equipo (el corte es un dado por km), ni tramos expuestos, ni «me quedo con mi jefe cortado» (D-13 solo hacia un `shed` con jefe de general).
- **Lo que dijo el dueño**: «el viento y los abanicos… aquí te delegaré el 100 %… aunque eso implicará también definir las colocaciones» (v41); «en un abanico el jefe TAMPOCO tira» (v41 §7).
- **Información necesaria**: previsión de viento y tramo (no existe), cuántos de los míos en las primeras posiciones, dónde va mi carta, si el rival de la general está detrás del corte (general virtual por equipo). El motor tiene `vientoLateral`, `cabenEnFila`, `frontTeamId`; no tiene posición dentro del grupo ni tramos.
- **Cómo se mediría**: sobre `llana-180` con viento forzado y sobre las llanas de `smallTours`: (a) llanas con viento partidas 4-12 % (v41 fijó 6 %/4 %); (b) «el primer abanico contiene ≥ 4 del equipo que rompió» ≥ 70 % (si rompe un equipo, se lleva a los suyos); (c) «cartas cortadas en el segundo abanico cuyo equipo dejó de tirar delante» ≥ 80 %.

### [FORMATO-03] Clásica de pavés: la pelea por entrar delante en cada sector

- **Cuándo**: Flandes/Roubaix/Dwars; en los 2-3 km antes de cada sector (`pavesApproachKm` 2) y sobre todo antes de los sectores de 4-5 estrellas.
- **Quién decide**: cada equipo con carta de pavés (T4) y cada favorito (colocación); el pelotón acelera como colectivo.
- **Lo que pasa en carretera**: la velocidad sube a 55-60 km/h antes del sector porque TODOS los equipos quieren a su hombre en las 15 primeras posiciones; cada T4 gasta 2-3 gregarios llevándolo; el que entra en la posición 60 pierde el grupo aunque tenga piernas (los cortes, las caídas, el «acordeón»). El equipo fuerte «hace la carrera» desde 80-100 km con un gregario de lujo delante para tener un relevo cuando su jefe ataque. El T1 con velocista puro no cuenta aquí; el T2/T3 no existe (clásica).
- **Lo que hace hoy el motor**: D-19 suelo `pavesRaceCommit 0,8` en el sector y su aproximación; D-34/D-37 selección por dado escalada por estrellas (`dropPavesFactor`, B1 v40) y lluvia; sin reenganche dentro del sector (`onRough`). **PARCIAL**: no hay posición en el grupo, así que no hay «pelea por entrar delante» ni coste de colocación; el corte del sector no distingue al mal colocado del que no puede; la crónica de meta pide PAV ≥ 69 y llega (v58 «pave 69 ok»).
- **Lo que dijo el dueño**: «pave 69 ok» (v58 §6); «lo que falta no es calibración sino otro modelo de final en adoquín» (v39 §8).
- **Información necesaria**: km al siguiente sector y su categoría (existe `kmToNextPaves`), dónde va mi carta en el grupo (no existe), cuántos gregarios me quedan frescos (existe energía), lluvia (existe).
- **Cómo se mediría**: banco de clásicas de pavés (las cuatro reales cargadas): (a) PAV mediano del ganador ≥ 69 (dueño); (b) «grupo de cabeza a 30 km» 6-20 corredores en ≥ 70 %; (c) «trabajo al frente de los gregarios de T4 en los 3 km antes de un sector de ≥ 4★» ≥ 2× el trabajo medio de la etapa (la aproximación es donde se gasta el equipo).

### [FORMATO-04] Clásica de pavés: superioridad numérica en el grupo decisivo

- **Cuándo**: últimos 40-60 km de Flandes/Roubaix; grupo de 6-15 con 2-3 del mismo equipo T4.
- **Quién decide**: el equipo con números (sus corredores, coordinados), los rivales solos.
- **Lo que pasa en carretera**: el equipo con dos o tres alterna ataques: uno salta, los rivales persiguen, el otro no releva y contraataca cuando cierran; el que no remata al sprint se sacrifica de lanzador a 3 km. Los rivales solos hacen relevos cortos y esperan al sprint o atacan en el último sector. Si la cooperación se rompe (todos se miran), gana el que salta primero desde atrás.
- **Lo que hace hoy el motor**: `relayTurn` en fuga con `driveOfRider` 0, `noChanceToWin` y `sittingOn`; `ataque_grupo` por peor rematador (`tacticWorstFinisherWeight`), sin `teamId` en `tactics.ts` (0 apariciones); `finishStage` no recibe `teamOf`. **AUSENTE**: la coordinación entre compañeros (tactica.md B1 sin mecánica; mapa-equipo §7.4 «dos compañeros en un grupo pequeño no tienen ninguna ventaja»).
- **Lo que dijo el dueño**: «no tiene sentido que luchen el sprint 2 del mismo equipo (y encima les gana el otro!!!). Si hubieran colaborado quizás hubieran ganado uno de ellos» (v48); «en un grupo decisivo cerca de meta la colaboración se rompe» (deuda v38 §16).
- **Información necesaria**: quiénes de mi equipo van en este grupo, quién de los dos remata mejor, quién acaba de atacar (memoria del último ataque del grupo: no existe en `RiderSim`), cuántos rivales persiguen.
- **Cómo se mediría**: banco de clásicas de pavés y `media-190` con 22 equipos: (a) «grupos decisivos (≤ 15 a −30 km) con ≥ 2 de un equipo»: el equipo con números gana ≥ 1,5× su cuota per cápita (en carretera la superioridad numérica se convierte en victoria con claridad); (b) «dos del mismo equipo en el podio con el mejor de los dos detrás» ≤ 10 % de esos casos; (c) «ataques alternos» (dos compañeros atacan en ventanas distintas de 5 km) en ≥ 40 % de esos grupos.

### [FORMATO-05] Clásica de pavés: percance del favorito y el equipo que espera

- **Cuándo**: pinchazo/caída de la carta de T4 entre 100 y 30 km de meta.
- **Quién decide**: el equipo (2-3 gregarios se dejan caer), el favorito (pide o no), el pelotón (aprovecha o no).
- **Lo que pasa en carretera**: en pavés el pinchazo es la incidencia normal (2-4 por favorito y carrera). Dos gregarios paran, lo llevan, el pelotón NO espera si hay rivales con interés (en Roubaix nunca se espera); si el percance es a > 100 km el pelotón «se relaja» un poco por costumbre. Si la carta ya está fuera de opción (> 2 min a 40 km), el equipo cambia de carta al siguiente mejor.
- **Lo que hace hoy el motor**: D-13 rama de la etapa exige `mishapKm` (caída) ≤ 5 km, favorito top-3 por `quality`, ≤ 60 s, dos ayudantes. **PARCIAL**: «El PINCHAZO y la avería mecánica no existen todavía en el motor» (v37); y el cambio de carta dentro de la etapa no existe (`stageCandidateId` se fija una vez por etapa en `buildTeamPlans`).
- **Lo que dijo el dueño**: «por la etapa yo creo que nadie debería bajarse… salvo que sea un pinchazo/caída y la distancia sea pequeña, y sea gran favorito para ganar la etapa, según el tipo de etapa» (v37).
- **Información necesaria**: qué le pasó a mi carta (pinchazo vs piernas), cuánto pierde, cuánto queda, si mi segunda carta sigue delante. El motor tiene `mishapKm` de caídas; no tiene pinchazos ni «segunda carta».
- **Cómo se mediría**: banco de pavés con pinchazos modelados: (a) «favoritos (top-5 por PAV) con percance a −80..−30 km que vuelven al grupo de cabeza» 30-50 % (en carretera cerca de la mitad de los grandes vuelven si van acompañados, casi ninguno solo); (b) «gregarios que bajan por percance del favorito» 1-2, nunca > 2.

### [FORMATO-06] Clásica de cotas (Ardenas): la fuga «de permiso» y las cotas que criban antes del final

- **Cuándo**: Amstel/Flecha/Lieja: 30 cotas, fuga de 6-10 que se va a 5-8 min, pelotón que se criba por acumulación desde −80 km.
- **Quién decide**: el equipo del gran favorito (T4 puncheur) controla; los T5 van a la fuga; los favoritos deciden cuándo se acaba el control (Redoute / Roche-aux-Faucons).
- **Lo que pasa en carretera**: a diferencia de la llana, aquí NO controlan los T1 (no hay sprint), controla el equipo del favorito con dos gregarios de fondo, dejando 5-8 min porque sabe que las cotas cazan; a −60 km empiezan a caer los primeros del pelotón (100 → 60 → 30) por repetición, no por un solo esfuerzo; los cazaetapas atacan a −35 km para adelantar la selección; la fuga muere a −25..−15 km. El T1 aquí es T5 (su velocista no cuenta) y manda gente a la fuga.
- **Lo que hace hoy el motor**: `breakAppeal` (fracción de km de subida) sube el umbral de `crowd` y `settle` de la cuerda; `climbTempoCommit 0,7` en cotas antes de `raceThisClimb`; `shatter` por deriva y reserva (D-36) con recarga a rueda; `peloton_selection` narra la criba lejana; `finishType` `puncheur`. **PARCIAL**: la acumulación existe por depósito y reserva, pero la cuerda de la general no aplica (clásica) y el «control» lo lleva quien tenga `etapa`, es decir, T4 con `bunchFinish` = true en `puncheur` → intent `lanzar` en los últimos 15 km aunque no haya tren (deuda §8.9). La media montaña rehecha (v38-2 §16) dio «grupo mayor 115 de 176, 6 grupos» y «ganador en solitario 4 % contra 20-30 %».
- **Lo que dijo el dueño**: foto pedida: «un grupo grande, algunos por detrás en grupos, y por delante uno o dos» (v38-2 §16); «así el pelotón no se destroza en cada cota y las diferencias las marca el último puerto, como en la realidad» (comentario en simulate).
- **Información necesaria**: cuántas cotas quedan y cuál es la decisiva (perfil: existe), quién de los míos sigue en el grupo (existe vía `idSet`), la fuerza de la fuga en cuesta (no: `chaseField` mide SPR).
- **Cómo se mediría**: banco de clásicas de cotas (Lieja/Amstel cargadas) y `media-190`: (a) tamaño del grupo de cabeza a −30 km 25-60 (Lieja real: 30-50); (b) «la fuga del día muere entre −30 y −10 km» ≥ 60 %; (c) ganador en solitario **20-30 %** (banda del dueño); (d) `mediaGroups` 3-8 (existente).

### [FORMATO-07] Clásica de cotas: el final de puncheur — ataque en la última cota o sprint reducido

- **Cuándo**: última cota a 1-5 km de meta (Cauberg, Muro de Huy, Roche-aux-Faucons + llano).
- **Quién decide**: el puncheur (atacar arriba vs esperar), el equipo con dos cartas (puncheur + sprinter), los marcadores.
- **Lo que pasa en carretera**: si la cota corona a ≤ 1 km, gana el que mejor sube 1,5 km (Huy) y nadie ataca antes; si corona a 3-5 km, el puncheur puro tiene que abrir hueco en la cota y aguantar el llano, y el equipo con sprinter de fondo (T4 con dos cartas) NO ataca: cierra huecos y reserva al rápido. Los favoritos se marcan entre sí (2-3 «pegados» a la rueda del más fuerte) y a veces por marcarse se les escapa un tercero.
- **Lo que hace hoy el motor**: `finishType` `puncheur` (corona ≤ 5 km y score ≥ 15, o pendiente media ≥ 2,5 %); `ataque_final` en llano favorece al peor rematador (D-22); `finishWeights.puncheur` (COL 0,4 SPR 0,28 TAC 0,2 RES 0,12); marcaje solo con orden explícita (`autoStageOrders` nunca da `marcador`). **PARCIAL**: no hay «dos cartas por equipo» (`stageCandidateId` es uno); no hay marcaje emergente entre favoritos (mapa-tactics §7).
- **Lo que dijo el dueño**: «si es un final en llano no haría sentido que un escalador ataque al final ahí» (tactics.ts, cita v9); «ha ganado al sprint… ¿un contrarrelojista?» (v45).
- **Información necesaria**: km de la corona a meta (existe `climbKmToFinish`), quién remata mejor que yo en el grupo (existe `finishRank`), si mi compañero rápido sigue en el grupo (no lo ve `tactics.ts`), quién me marca (solo si hay orden).
- **Cómo se mediría**: banco de clásicas de cotas: (a) «gana el mejor COL del grupo de cabeza» 35-55 % en `puncheur` con corona ≤ 1 km (Huy: casi siempre) y 20-40 % con corona a 3-5 km; (b) «equipo con puncheur + sprinter (SPR ≥ 75) en el grupo de cabeza: su puncheur ataca ≤ 50 % de las veces que atacaría sin compañero rápido».

### [FORMATO-08] Clásica de montaña (Lombardía): último puerto corto, bajada y carretera hasta meta

- **Cuándo**: Lombardía/Emilia/clásicas de montaña generadas: último puerto empinado a 15-25 km, descenso técnico, 5-10 km de llano.
- **Quién decide**: los favoritos (atacar arriba y bajar a tope vs esperar), el grupo de 3-6 que se forma (colaborar o mirarse), los descendedores.
- **Lo que pasa en carretera**: el ataque en el puerto abre 20-40 s; en la bajada el mejor bajador o recupera o amplía; en el llano final un grupo de 3-6 se mira y el que no remata ataca a 4-2 km; ganador en solitario o sprint de 3-5. La fuga del día no vive hasta aquí (muere en el penúltimo puerto).
- **Lo que hace hoy el motor**: generador `mountainClassicSegments` (v40 §1: «último puerto corto y empinado + bajada + carretera hasta meta»); descenso selecciona solo su primer km (`descentSelectKm 1`, D-35) y con fusión/reenganche permitidos; «nada táctico se decide en el descenso» (mapa-simulate §4.11); `ataque_grupo` dentro de `tacticInsideAttackKm 18`. **PARCIAL**: falta el descenso como arma (bajar a tope para abrir/cerrar), y la colaboración que se rompe en el grupo decisivo (deuda v38 §16).
- **Lo que dijo el dueño**: «el generador daba a una clásica de montaña el perfil de una reina (final en alto de 9-15 km): Jura 82 % en pájara» (hallazgo v40 §1, resuelto); «una cosa que debería poder pasar y nunca pasa es que haya remontadas en una subida» (v26). Ganador en solitario 20-30 % (v38 §16).
- **Información necesaria**: mi DES contra los del grupo, km de bajada que quedan, quién del grupo remata peor (existe), si voy solo y cuánto saco (el `Move` sabe su gap).
- **Cómo se mediría**: banco de clásicas de montaña (Lombardía cargada + generadas): (a) ganador en solitario 20-30 % (dueño); (b) «el hueco de la cima cambia ≥ 10 s en la bajada» en ≥ 50 % de los ataques en cima (hoy el descenso casi no mueve relojes); (c) tamaño del grupo ganador mediana 1-5; pájaras ≤ 12 % (Lombardía, v33).

### [FORMATO-09] Clásica larga (Sanremo, 280-300 km): 200 km de nada y dosificación

- **Cuándo**: Sanremo y las de > 250 km. Fuga de 8-10 del km 10 a 10 min; pelotón a 38 km/h hasta el Turchino; caza desde −100 km; Cipressa a −27, Poggio a −9.
- **Quién decide**: T1 (los trenes controlan la caza desde muy lejos porque la fuga va a 10 min y la distancia es enorme); todos (cuánto gastar); los puncheurs (atacar en el Poggio).
- **Lo que pasa en carretera**: los equipos dejan una fuga grande a mucho porque saben que 280 km la matan; la caza empieza a −100 km con relevos suaves de gregarios de fondo (los lanzadores se guardan); al Poggio llegan 60-80; el ataque en el Poggio es del puncheur/escalador rápido; los trenes de T1 llegan rotos (uno o dos lanzadores por sprinter, no tres). El que se gastó controlando en el km 150 no está en el km 280.
- **Lo que hace hoy el motor**: `demandaDelDia` y dosificación (`pacingReferenceDemand 75`, `pacingMin 0,7`) sobre lo que el pelotón decide, no en el puerto que decide; `climbEaseDemand 95`; erosión con banda `longClassicFresh` 0,45-0,8; `teamChaseSecondsPerKm` escala la caza con lo que queda; `frontTeamId` con presupuesto que se agota. **PARCIAL**: Sanremo va etiquetada `hilly` («se arregla el día que el terreno deje de ser una etiqueta única por carrera», LÍMITE); la cuerda no razona «con 280 km la fuga se muere sola» salvo por `teamChaseSecondsPerKm`; el gasto del tren en la caza no se reserva para el final.
- **Lo que dijo el dueño**: «tal vez en una clásica superlarga tengan que dosificar esfuerzos mejor y entonces no salir tan a muerte» (v39 §3); «un equipo que lleva 80 km tirando no puede seguir a tope» (v15).
- **Información necesaria**: km totales y restantes (existe), fuerza de la fuga vs lo que le queda al pelotón (existe parcial: `avail`), quién de los míos tiene que estar entero a −10 km (el plan sabe la carta; no reserva a los lanzadores hasta `sprintTrainKm` 3).
- **Cómo se mediría**: sobre Sanremo real y una `clasica-290` canónica: (a) erosión mediana 0,45-0,8 (banda existente); (b) «la fuga del día pasa de 8 min» ≥ 40 % y muere entre −40 y −10 km ≥ 70 %; (c) «lanzadores con `pullWindow ≥ 0,4` en el último km» ≥ 50 % de los sprinters del grupo (que el tren llegue vivo); (d) tamaño del grupo de meta 20-80 en ≥ 60 %.

### [FORMATO-10] Clásica larga: el sprint tras 280 km lo decide el trabajo del día

- **Cuándo**: llegada agrupada de 30-80 en Sanremo/Gante-Wevelgem.
- **Quién decide**: sprinters (aguantar el Poggio a rueda), sus equipos (un lanzador reservado), los que atacaron en el Poggio (rematar o rendirse).
- **Lo que pasa en carretera**: gana el sprinter que menos gastó (el que subió el Poggio a rueda, sin cerrar huecos) y que conserva un lanzador; los sprinters puros que tuvieron que cerrar en el Poggio rematan a un 90 %; los puncheurs que atacaron y fueron cazados a 2 km no rematan.
- **Lo que hace hoy el motor**: `finishStage` con `eff` erosionado, peaje del trabajo relativo al grupo (`finishWorkWeight 0,6`, tope 0,15), `sprintHoldMetres(SPR, frescura)`, `launchEffect`, tren `+5 %/+10 %`; D-29 `gastadoHastaKm` solo veta atacar, no rematar. **CUBIERTO en su mayoría**; **PARCIAL**: el que atacó en el Poggio y fue cazado remata igual que el que fue a rueda salvo por su energía.
- **Lo que dijo el dueño**: «llegó un grupo de 50 personas… eso es un sprint» (v45); «un sprint sin lanzadores, por ejemplo en una fuga, donde puede haber un momento en el que todos se miran y de repente uno se lanza» (v39 §5).
- **Información necesaria**: energía relativa dentro del grupo (existe), quién atacó en los últimos 10 km (existe en `parte.ataques` como observación, no como estado de decisión), lanzador presente (existe).
- **Cómo se mediría**: Sanremo real + `clasica-290`: (a) «gana el mejor SPR del grupo de meta» 25-40 % (más bajo que la llana canónica 30-45 porque el desgaste desordena); (b) «el que atacó en los últimos 10 km y fue cazado entra top-5» ≤ 15 %.

### [FORMATO-11] Clásica (cualquiera): no hay mañana — nadie guarda y por la etapa no se baja nadie

- **Cuándo**: todo el día de una carrera de un día.
- **Quién decide**: cada equipo (gasto total), cada corredor (sin reserva para mañana), el líder de la carrera (no existe).
- **Lo que pasa en carretera**: en una clásica los 7 del equipo se gastan hasta cero por la carta; ningún gregario «guarda para mañana»; si la carta se cae y no vuelve, el equipo cambia de carta o se disuelve (cada uno a lo suyo); nadie se deja caer por un jefe salvo percance cercano (FORMATO-05). El grupeto no tiene motivo para entrar en el corte: los descolgados abandonan (Roubaix: 50 % de abandonos).
- **Lo que hace hoy el motor**: `hasGcContext` false → sin `maillot`/`general`, D-13 rama de la general apagada, `esElMaillot` false; el corte (`applyStageTimeCut`) se aplica igual; `giveUpLambda` (regla 8) igual que en vuelta; el humano puede retirarse solo entre etapas. **PARCIAL**: no hay «hoy es de un día» explícito (se infiere de la general vacía, lo que confunde con la etapa 1 de una vuelta, FORMATO-21); no hay «abandonar porque ya no sirvo» en una clásica (el motor solo abandona por colapso/caída/fuera de control).
- **Lo que dijo el dueño**: «si es una carrera de 1 día no [se bajan], salvo que la diferencia sea pequeña (y en ese caso que el líder no pase a tirar, él se reserva)» (v36); «Claro!! Quiero que si un ciclista no puede más pues que abandone automáticamente» (v14).
- **Información necesaria**: «¿hay mañana?» (no llega al motor: `StageInput` sin `isOneDay`/`isFinal`), quién es la carta ahora (existe una sola, fija).
- **Cómo se mediría**: banco de clásicas: (a) abandonos en clásicas de pavés 20-45 % del campo (Roubaix real 30-50 %; Flandes 25-40 %); en clásicas de cotas 10-30 %; (b) «gregarios de T4 que terminan con ≤ 15 % de depósito» ≥ 50 % (el equipo se vacía); (c) drop-backs por la general en clásicas = 0 (invariante duro).

### [FORMATO-12] Clásica: el equipo sin baza vive de la fuga (y de una sola plaza)

- **Cuándo**: T5 (continental invitado, o WT sin carta hoy) en cualquier clásica.
- **Quién decide**: el equipo (a quién manda), el pelotón (a quién deja).
- **Lo que pasa en carretera**: el T5 manda UNO a la fuga (el «baroudeur» del día) y el resto va a rueda y termina; si el primero falla, prueba otro, nunca dos a la vez en la misma fuga; el T5 no persigue nunca; su corredor en la fuga tira a tope porque es su única oportunidad, salvo si su equipo tiene un rematador para el sprint (entonces se guarda: FORMATO-01).
- **Lo que hace hoy el motor**: `ninguno` → `nada`, `teamAttackFree 1,4`, `driveWaiting −0,5`; `autoStageOrders` nombra un `cazaetapas` por equipo; `pelotonAllows` sin composición por equipos. **PARCIAL**: nada impide que salten dos o tres del mismo T5 (tactica.md: «seis del mismo equipo en la fuga de nueve»).
- **Lo que dijo el dueño**: «el que no tiene ninguno de los tres motivos no tiene por qué gastar» (V.1); casos de tactica.md §1.
- **Información necesaria**: quién de mi equipo ya va delante (existe para el plan: `manUpTheRoad`; no lo ve el corredor que salta), si el pelotón dejará ir a otro más (aduana por composición).
- **Cómo se mediría**: banco de clásicas y `smallTours`: «fugas del día con ≥ 2 del mismo equipo» ≤ 15 % (llano) y ≤ 30 % (montaña, donde las fugas son de 20-50); «≥ 3 del mismo equipo» ≤ 3 %.

---

## B. Vueltas cortas (4-8 etapas)

### [FORMATO-13] Vuelta corta con crono: la general se hace en la crono y las etapas en línea son «de trámite controlado»

- **Cuándo**: vuelta de 5-7 etapas con una CRI de 14-40 km (siempre en vueltas llanas de 4+, `ittAlwaysFlatStages`); etapas en línea sin final en alto.
- **Quién decide**: T2 (equipo del cronista líder), T1 (trenes), T3 (rivales de la general a 20-60 s).
- **Lo que pasa en carretera**: tras la crono el líder suele ser un cronista que no gana en alto; su equipo controla TODAS las etapas en línea a ritmo (no persigue por la etapa: deja que los T1 cacen); los T3 solo pueden atacar en abanicos, en cotas cortas o en bonificaciones. Antes de la crono nadie de la general quiere gastar: las etapas en línea previas se corren «de sprinters» y los T3 mandan gente a la fuga para las bonificaciones o simplemente descansan.
- **Lo que hace hoy el motor**: `maillot` → `controlar` con claim 2 (4 si amenazado); `general` → `nada` si no amenazado (`isThreatened` con general virtual de la cabeza); `gcTerrain` = false en llana → los T3 no reciben empujón. **CUBIERTO en la postura; AUSENTE la anticipación**: el motor no sabe que mañana hay crono (`StageInput` sin calendario), así que un T3 con escalador corre igual el día anterior a la crono que el posterior.
- **Lo que dijo el dueño**: «No existen carreras por etapas de 5 etapas llanas en la realidad. Mira el perfil del Tour de Sharjah: tuvo 1 contrarreloj y 2 etapas con puertos» (v10); «la general de una carrera sin terreno selectivo se sigue decidiendo por bonificaciones» (v7-v10).
- **Información necesaria**: qué etapas quedan y cuál decide (calendario de la vuelta: no llega), general virtual por equipo (parcial: `frontThreatDeficit − gap`).
- **Cómo se mediría**: `smallTours` (vueltas con crono): (a) «el ganador de la general es top-3 de la crono» 50-80 % en vueltas llanas con crono; (b) «el equipo del maillot lleva el frente ≥ 40 % de los bloques de control en las etapas post-crono» ≥ 70 % de esas etapas; (c) `sweepPct` 0-30 (existente).

### [FORMATO-14] Vuelta corta con crono: el día ANTES y el día DESPUÉS de la crono

- **Cuándo**: la etapa en línea inmediatamente anterior a la CRI (la general aún abierta) y la inmediatamente posterior (general hecha).
- **Quién decide**: T3 y sus corredores (gastar o guardar), T2 provisional (líder por bonificaciones que sabe que perderá el maillot en la crono).
- **Lo que pasa en carretera**: día antes: los cronistas van escondidos, nadie de la general entra en fugas ni relevos, el líder por bonificaciones (sprinter) no defiende nada más que la etapa. Día después: los que perdieron la general por > 1 min cambian de objetivo (etapa, fuga), el nuevo líder controla, y el escalador a 40 s solo tiene el final en alto (si lo hay) para recuperar.
- **Lo que hace hoy el motor**: nada distingue esos dos días: `autoStageOrders` mira solo `kind` y `gcRank`; el propósito `general` se calcula por déficit ≤ 420 s sin saber si queda terreno para recuperar. **AUSENTE**.
- **Lo que dijo el dueño**: «SÍ se corre distinto el día 18 que el día 3» (E3, medido a nivel de brecha); petición N1: «mejorar la granularidad de las instrucciones, con más escenarios hipotéticos».
- **Información necesaria**: «¿qué queda de la carrera?» (etapas restantes con su tipo), «¿tengo dónde recuperar?» (final en alto o crono pendiente), mi déficit. Nada de esto llega al motor.
- **Cómo se mediría**: `smallTours`: (a) «corredores de la general (top-5 por CRI del campo) en la fuga del día anterior a la crono» ≤ 5 %; (b) «ataques por corredor de los T3 a > 90 s tras la crono sin final en alto pendiente» ≥ 2× los del día anterior (cambio de rol medible con `parte.ataques`).

### [FORMATO-15] Vuelta corta sin crono: general por bonificaciones y un único final en alto

- **Cuándo**: vuelta de 4-6 etapas sin CRI (posible en terreno `hilly`/`mountain`); la general se hace en el final en alto garantizado y en las bonificaciones 10-6-4.
- **Quién decide**: T1 con líder-sprinter (defiende con bonificaciones), T3 escaladores (esperan el día de montaña), pelotón (control).
- **Lo que pasa en carretera**: los primeros días el maillot es un sprinter que se defiende ganando bonificaciones; su equipo controla y él disputa el sprint por 10 s; los escaladores no gastan nada hasta el final en alto; después del final en alto, el líder escalador controla y los sprinters vuelven a lo suyo. Si el final en alto es corto (media-alto), los puncheurs con bonificaciones acumuladas pueden ganar la general.
- **Lo que hace hoy el motor**: bonificaciones solo en meta (`timeBonuses [10,6,4]`); el sprinter líder recibe `lider`/`reservon` de `autoStageOrders` (v42: los cinco primeros de la general son carta antes que el terreno) → **deja de disputar el sprint como sprinter** en la llana siguiente (`ROLE_APPETITE`, `relayDutyByRole`, y `finishRoleWeight` lider 1,0 pero sin tren: `lanzaPara` apunta a un `sprinter`). **CONTRARIO en ese caso**: el sprinter maillot no es lanzado por su lanzador porque ya no es `sprinter` en las órdenes.
- **Lo que dijo el dueño**: «un corredor con 4 estrellas en sprint y 1-2 en todo lo demás ganó 4 de las 5 etapas de Race Sharjah y la general» (v7); «El maillot puesto de LANZADOR de su propio velocista» (v42).
- **Información necesaria**: si el líder es sprinter y hoy hay sprint (el equipo debería lanzarlo igual), cuántos segundos de bonificación separan a los primeros, qué día es el final en alto.
- **Cómo se mediría**: `smallTours` (vueltas sin crono): (a) «el sprinter que lleva el maillot es lanzado por su tren (≥ 1 lanzador con `pullWindow ≥ 0,4`)» ≥ 80 % de las llanas en que sigue líder; (b) «general final decidida por bonificaciones (diferencia 1.º-2.º ≤ suma de bonificaciones del 1.º)» 20-50 % en vueltas sin crono y sin final en alto largo.

### [FORMATO-16] Vuelta corta: el único día de montaña es el día D para todos los equipos de la general

- **Cuándo**: la única etapa `media-alto`/`reina` de una vuelta corta.
- **Quién decide**: T2 y todos los T3 (ese día TODOS tienen motivo), T1 (ese día no tienen ninguno), T5 (la fuga tiene poco sitio porque la general se juega).
- **Lo que pasa en carretera**: los T3 hacen tempo alto desde lejos para endurecer (no solo el T2), la fuga se deja pero a poco (2-3 min) y se caza al pie del puerto; los T1 mandan a su sprinter al grupeto desde el primer puerto; se ataca en el último puerto y también en el penúltimo si es la única oportunidad («no hay otro día»).
- **Lo que hace hoy el motor**: `gcTerrain` true, `gcChallengeShare` empuja a los T3 (peso 0,35; relación rival/maillot 1,01 → 1,32, «menos de lo esperado», v52); `climbRaceCommit 0,85` en los últimos 30 km; `general` → `nada` si no amenazado por la fuga (no tempo). **PARCIAL**: el «no hay otro día» no existe (el motor no sabe que es la única); los T3 no hacen tempo para endurecer.
- **Lo que dijo el dueño**: «otra cosa es que los que van segundo, tercero o cuarto lo hagan, porque ellos quieren luchar por la carrera… y curiosamente no veo que lo hagan» (v52/v57); «solo en montaña y media montaña» (v52).
- **Información necesaria**: «es el único día» (calendario restante), colchón sobre cada rival (existe `gcDefence` dentro del grupo), quién de mi equipo sigue en el grupo de favoritos.
- **Cómo se mediría**: `smallTours` (vueltas con un solo día de montaña): (a) ataques por corredor de los T3 (2.º-5.º) ≥ 1,5× los del maillot (hoy 1,32) y ≥ 2× en el único día de montaña frente a los días de montaña de una vuelta con dos o más; (b) «la fuga gana el único día de montaña» 5-15 % (menor que la banda general 6-30 de `calendarQueens`, porque todos tienen motivo).

### [FORMATO-17] Vuelta de solo llanas (Sharjah/Arabia): el líder es un sprinter y su equipo controla todo

- **Cuándo**: vueltas cortas de terreno `flat` (con crono obligada desde v10, pero las etapas en línea son todas llanas).
- **Quién decide**: T1 líder (controla y sprinta), T1 rivales (persiguen y sprintan), T3 (aquí = otros sprinters a 4-10 s), T5.
- **Lo que pasa en carretera**: el equipo del líder tiene motivo doble (maillot + etapa) y se funde controlando cada día; los T1 rivales persiguen porque la etapa es suya; los T5 saben que la fuga solo vive si el pelotón se despista; la general se juega en bonificaciones y en un abanico. La variabilidad del ganador la trae la colocación, los trenes que fallan y la fuga que se cuela una vez de cinco.
- **Lo que hace hoy el motor**: `smallTours` corre Sharjah/Arabia con `sweepPct` 0-30, `photoRepeatTopFive`, `flatMoveWorstMarginS` 0-900; `placementSd`; `teamDriveSecondCard 0,2` para el equipo con dos motivos. **CUBIERTO** en lo medido (barrido 9,7 → 3,2 %). Deuda: el maillot-sprinter deja de ser `sprinter` (FORMATO-15).
- **Lo que dijo el dueño**: «Race Arabia la gana el mismo corredor las cinco etapas… Encuentra dónde se pierde la varianza del desenlace» (v24); «en 5 etapas llanas esperaría que al menos una no fuese al sprint» (v10).
- **Información necesaria**: mismo que FORMATO-01 más la general por bonificaciones.
- **Cómo se mediría**: bandas existentes: `sweepPct` 0-30, «al menos una llana sin sprint masivo» mediana ≥ 1 de 5, `flatMoveWorstMarginS` ≤ 900, `photoRepeatTopFive` (existente).

### [FORMATO-18] Vuelta de solo llanas: la general se decide en el último sprint por bonificaciones

- **Cuándo**: última etapa llana con dos sprinters a ≤ 10 s en la general.
- **Quién decide**: los dos T1 en liza (lanzar al suyo y estorbar al rival), el sprinter líder (ir al sprint o «marcar» al rival), los demás T1 (que se meten en medio).
- **Lo que pasa en carretera**: el líder no necesita ganar, necesita no ceder 6 s: su equipo controla, su tren le lleva a la rueda del rival; el rival necesita ganar con el líder fuera del top-3 → su tren intenta lanzarlo pronto; los terceros T1 rompen el marcaje. La fuga ese día está prohibida por los dos equipos.
- **Lo que hace hoy el motor**: sin marcaje emergente; sin «necesito X puestos»; el sprint es `finishScore` con tren y colocación; el maillot recibe `reservon` y la penalización de relevo. **AUSENTE** como conducta; el resultado agregado sale de la aritmética de la meta.
- **Lo que dijo el dueño**: «La general de una carrera sin terreno selectivo se sigue decidiendo por bonificaciones» (v7-v10, aceptado como decisión de composición, no como conducta).
- **Información necesaria**: diferencia exacta con el rival, bonificaciones en juego, si el rival va en mi grupo (existe `gcDefence`), posición relativa en el sprint (no existe).
- **Cómo se mediría**: `smallTours` de terreno `flat`: «cuando 1.º y 2.º están a ≤ 10 s en la última etapa, el líder entra top-5 del sprint» ≥ 60 % (el líder-sprinter va a proteger), y «cambio de líder en la última etapa» 15-35 %.

### [FORMATO-19] Vuelta corta: el cazaetapas que hereda el maillot y su equipo modesto

- **Cuándo**: fuga que gana la etapa 2 con 3 min; el fugado (de un T5) se pone líder en una vuelta de 5-6 etapas.
- **Quién decide**: el equipo modesto (defender o no), el fugado (correr de líder), los T2/T3 verdaderos (recuperar cuándo).
- **Lo que pasa en carretera**: el equipo modesto DEFIENDE los primeros días (es su premio): controla a ritmo, pierde 4-5 hombres en el intento; los favoritos dejan que se desgaste y recuperan en la crono o el final en alto. Si el fugado es escalador de verdad, la carrera se le puede quedar.
- **Lo que hace hoy el motor**: `autoStageOrders` cambia el rol a `lider`/`reservon` por `gcRank ≤ 5` (v42, medido en v57); `maillot` → `controlar` con presupuesto `teamBudgetPerRider 9 × leales`. **CUBIERTO en el rol; PARCIAL en la decisión**: no hay «¿merece la pena defender?» (el T5 modesto controla igual que un WT).
- **Lo que dijo el dueño**: petición de que el cazaetapas que se pone líder «cambie de rol entre etapas» (v57, ya lo hacía); «Race Sardegna e2… el maillot amarillo —un escalador— en la fuga del día» (v32).
- **Información necesaria**: fuerza de mi equipo frente al campo (`quality`, presupuesto), etapas restantes y su terreno (no llega).
- **Cómo se mediría**: `smallTours`: «el maillot heredado por fuga se defiende ≥ 1 etapa más» 60-85 %; «lo pierde en la crono/final en alto» ≥ 70 % de las veces que lo pierde.

---

## C. Gran vuelta (tres semanas)

### [FORMATO-20] Primera semana nerviosa: proteger, no atacar

- **Cuándo**: etapas 1-9 de una gran vuelta; llanas y media montaña sin final duro; pelotón de 176 completo.
- **Quién decide**: T2/T3 (proteger al jefe: colocación, no cerrar huecos, no caídas), T1 (los días son suyos), T5 (fugas de 3-5 que se dejan sin pelea).
- **Lo que pasa en carretera**: los equipos de la general gastan gregarios en COLOCAR al jefe delante en los últimos 30 km (caídas, abanicos, cortes en el sprint), no en perseguir; la fuga la cazan solo los T1; el maillot es un sprinter o el prologuista; nadie de la general ataca; el nerviosismo se traduce en caídas masivas (varias por etapa) y en cortes de 10-30 s que los jueces neutralizan a 3 km (regla que el motor no tiene).
- **Lo que hace hoy el motor**: `general` → `nada` si no amenazado, `proteger` solo si `etapa` sin `bunchFinish`; `rollCrash` con `isFinal` y erosión; `crashPile`; no hay posición en el grupo ni regla de los 3 km. **PARCIAL**: la protección existe solo como «no entrar al turno» y colocación en abanico (v38 retiró el descuento por gregarios).
- **Lo que dijo el dueño**: «un líder arropado por gregarios dentro del pelotón gasta LO MISMO que uno que va a rueda cómodamente sin entrar a los relevos» (v38); «normalmente cuando se cae alguien en el pelotón casi siempre se caen varios» (comentario simulate).
- **Información necesaria**: quién es mi jefe y dónde va (existe), km al final (existe), riesgo de caída de hoy (existe `lluvia`, `isFinal`); posición en el grupo (no existe).
- **Cómo se mediría**: `grandTour` etapas 1-9: (a) `abandonPct` acumulado 12-20 (existente) con reparto caída ~45 %; (b) «favoritos (top-10 final) que pierden ≥ 30 s en llanas de la 1.ª semana» 5-20 % de favorito-etapas (cortes y caídas, no ataques); (c) ataques de corredores con propósito `general` en llanas = 0-2 % de los ataques.

### [FORMATO-21] Etapa 1 (todos a 0): el motor no sabe que hay una vuelta detrás

- **Cuándo**: primera etapa en línea de cualquier vuelta (siempre llana por construcción del calendario).
- **Quién decide**: T1 (etapa + primer maillot), T2/T3 (evitar pérdidas), T5.
- **Lo que pasa en carretera**: la etapa 1 se corre como llana de sprinters pero con nervio de gran vuelta; el que gana se pone líder y su equipo controlará mañana; los favoritos de la general NO se dejan cortar; la bonificación del 1.º es el primer maillot.
- **Lo que hace hoy el motor**: `hasGcContext` = false (todos déficit 0) → no hay `maillot`/`general`, no hay `carriesGcLeader`, no hay `gcLeash`, `gcDefence` es null: **la etapa 1 de una gran vuelta se corre exactamente como una clásica llana**. `autoStageOrders` sí recibe `gcRank` (nulo el día 1). **AUSENTE** el «hay tres semanas detrás» (favoritos que se cuidan).
- **Lo que dijo el dueño**: «hasGcContext… en etapa 1 / carrera de un día TODOS tienen déficit 0 y leído literalmente diría que el pelotón entero es el líder» (comentario recogido en mapa-tactics §2). «La primera etapa es siempre llana» (calendar.ts, decisión de composición).
- **Información necesaria**: «esto es una vuelta de N etapas y hoy es la 1» (no llega), quiénes son los favoritos de la general del campo (derivable de atributos: `raceLeadScore` en db).
- **Cómo se mediría**: `grandTour` e1: «favoritos de la general (top-10 por `climbScore`+`CRI`) en fugas o relevando en la etapa 1» ≤ 3 %; «cortes ≥ 20 s que separan a un favorito en la etapa 1» ≤ 10 %.

### [FORMATO-22] Etapa de transición (2.ª semana, media montaña): la fuga de 20-30 y el maillot que deja ir

- **Cuándo**: etapas 10-15 de media montaña sin final en alto; general ya con diferencias.
- **Quién decide**: T2 (a cuánto controla), T3 (si tiene alguien peligroso en la fuga), T5 y los T3 ya lejanos (llenan la fuga), T1 (su sprinter va al grupeto).
- **Lo que pasa en carretera**: la pelea por la fuga dura 40-60 km porque quieren ir 40; cuaja una de 20-30 con un hombre por equipo (algunos dos); el T2 la deja a 8-12 min si nadie está a < 10 min en la general; la fuga se pelea entre ella a −40 km; el pelotón entra a 10-15 min. Es el formato donde «la fuga gana» y donde el equipo del maillot corre más barato.
- **Lo que hace hoy el motor**: `breakAppeal` y `bigGroupThreshold·(1+9·breakAppeal)` («en montaña pura salta todo el que puede»), `gcLeash = min(700, 0,6·peor déficit)`, `isThreatened` con general virtual; `pelotonMoodSpread`. **PARCIAL**: `tacticMaxMoves 3` y `tacticFollowFractionMax 0,5` limitan la pelea larga; la fuga de 30 no sale con «uno por equipo»; `calendarQueens` 18,1 % de victorias de la fuga en montaña (dueño: «está bien así», banda de vigilancia 6-30).
- **Lo que dijo el dueño**: «puede ocurrir… que el pelotón se despista, deja hacer a una escapada… pueden perfectamente llegar con 8 o incluso 15 minutos; ya ha pasado en grandes vueltas» (v38); «si la fuga está a 2 minutos y no hay nadie peligroso, no tiras; si está a 20 minutos, sí que tiras, ¡a muerte!» (v38); «los de la general tiran para que no se vaya a 20 minutos, no para cazarla» (comentario `gcControlLeash`).
- **Información necesaria**: general virtual de TODOS los fugados frente a mi hombre (hoy solo el más cercano al maillot), quién de los míos va en la fuga (existe para el plan), cuánto queda de vuelta (no llega: en la 3.ª semana se deja más).
- **Cómo se mediría**: `grandTour` etapas de transición (media sin final en alto): (a) «gana la fuga» 40-70 % (Tour real: la mayoría de las transiciones se las lleva la fuga); (b) tamaño mediano de la fuga del día 12-30; (c) «ventaja de la fuga en meta cuando gana» mediana 4-12 min; (d) «equipos representados en la fuga» ≥ 60 % de los equipos en ≥ 50 % de esas etapas.

### [FORMATO-23] La «fuga bidón»: el maillot que se regala y el equipo que decide cederlo o no

- **Cuándo**: transición con un corredor a 8-15 min de la general en una fuga de 30 que se va a > su déficit.
- **Quién decide**: T2 (ceder el maillot para descansar, o defenderlo), T3 (aprovechar el desconcierto), el fugado (correr por la general).
- **Lo que pasa en carretera**: el T2 decide a mitad de etapa si le vale perder el maillot a un T5 «inofensivo» (ahorra tres días de control) o si el fugado es escalador y puede aguantar (entonces limita a X). El T3 puede pactar con el T2 o dejar que el T2 se funda. El fugado, si ve el maillot virtual, deja de relevar para la etapa y tira por el tiempo.
- **Lo que hace hoy el motor**: `isThreatened` (amenazado si `virtual − mío ≤ 420`) → `controlar` con claim 4; no hay «ceder a propósito»: si el fugado a 9 min supera el colchón, el T2 tira a muerte (`0,62 + 0,016·err`). En la fuga, `gcDeficitSeconds` del fugado no cambia su cooperación (D-27 solo mira `finishScore`). **CONTRARIO** en el caso de cesión voluntaria; **AUSENTE** el fugado que corre por el maillot virtual.
- **Lo que dijo el dueño**: «la emboscada y el día en que el líder se rompe» no tocados (E3); «el grupo del líder… podría llamarse grupo del maillot amarillo» (v58, narrativa).
- **Información necesaria**: general virtual del fugado (existe como escalar), su capacidad de defenderlo después (perfil de escalada frente a lo que queda: no), etapas restantes.
- **Cómo se mediría**: `grandTour`: «cambios de maillot por fuga en transiciones» 0,3-1,5 por gran vuelta (Tour 2011-2024: entre 0 y 2); «el maillot cedido vuelve al líder original o a un T3 antes del final» ≥ 80 %.

### [FORMATO-24] Víspera y día siguiente al descanso: ir a por todas / arrancar dormidos

- **Cuándo**: la etapa antes de un día de descanso (todos se vacían: «mañana no se corre») y la etapa después (pelotón lento en la salida, pájaras raras, «el día de descanso sienta mal a algunos»).
- **Quién decide**: cada corredor (gasto), T2/T3 (aprovechar), el pelotón (humor).
- **Lo que pasa en carretera**: en la víspera del descanso hay más ataques de la general y la fuga va a tope; el día siguiente el pelotón sale con humor bajo y hay sustos de favoritos (pájaras o «piernas de madera»).
- **Lo que hace hoy el motor**: nada: `StageInput` no sabe del descanso (Grep: sin `restDay`); el humor `pelotonMoodSpread` es un dado por etapa sin causa; la fatiga entra solo vía Banister (`ctl/atl` → `energy0`, `matches`). El clima tampoco descuenta días de descanso (§20.8). **AUSENTE**.
- **Lo que dijo el dueño**: — (nada específico; N1 pide escenarios hipotéticos que solo tienen sentido con este dato).
- **Información necesaria**: «mañana descanso» / «ayer descanso» (un booleano por etapa que db conoce), `tsb` (definido y sin efecto: `StageRider.tsb` «PENDIENTE DE IMPLEMENTAR»).
- **Cómo se mediría**: `grandTour` (con descansos declarados): «ataques de corredores con propósito `general` en la víspera de descanso» ≥ 1,3× la media de las etapas de su mismo tipo; «favoritos que pierden ≥ 1 min el día después» 5-15 % (dato real: alguno casi cada año).

### [FORMATO-25] Tercera semana: campos rotos y equipos que cambian de propósito

- **Cuándo**: etapas 16-20; 140-155 corredores; gregarios fundidos; general con huecos de minutos.
- **Quién decide**: T3 ya lejanos (pasan a `etapa`/fuga), T2 (con menos equipo), T1 (a menudo sin sprinter: abandonó), T5.
- **Lo que pasa en carretera**: los equipos que perdieron la general (> 5 min) se reconvierten a cazaetapas: mandan a sus escaladores a la fuga y ya no persiguen; el T2 lleva 4-5 hombres útiles y controla a menos; la fuga gana más; los sprinters que quedan disputan las pocas llanas con trenes de un lanzador; las diferencias en el último puerto son mayores por fatiga acumulada.
- **Lo que hace hoy el motor**: `energy0` baja con el TSB (`mTankFreshness`), cerillos −1 si `tsb < −25`, banda `queenThirdWeek` 0,6-0,85; `general` solo si ≤ 420 s (los lejanos pasan a `ninguno` → `nada` y `teamAttackFree 1,4`) → **CUBIERTO** para el cambio de propósito por umbral; `chaseField` es foto de salida y cuenta sprinters ausentes solo si abandonaron (los descolgados sí cuentan) → **PARCIAL**; `helpBack` sigue mandando a «todos menos uno» aunque el jefe vaya 15.º (propósito `general` exige ≤ 420 s, así que se apaga; bien).
- **Lo que dijo el dueño**: «reina real 3.ª semana: 100 % pájaras» (Cambio 0 → `erosionMax 0,92`); «el último grupo de una etapa reina entra entre el 8 % y el 14 %» (v16); «74 minutos???» (v17, Colombia e5).
- **Información necesaria**: mi déficit y el de los rivales (existe), cuántos gregarios frescos me quedan (existe energía), «quedan N etapas» (no llega: un T3 a 6 min con dos finales en alto por delante no ha perdido).
- **Cómo se mediría**: `grandTour` etapas 16-20 vs 2-9: (a) «gana la fuga» en montaña 3.ª semana ≥ 1,3× la 1.ª/2.ª; (b) `queenLastGroupPct` ≥ 8 (existente, ROJO tolerado por el dueño); (c) «brecha 1.º-10.º en el último final en alto» 1,3-2× la del primer final en alto; (d) abandonos acumulados 12-20 %.

### [FORMATO-26] El día en que el líder se rompe (3.ª semana): esperar, dejarlo o cambiar de jefe

- **Cuándo**: el maillot o un T3 pierde 30-60 s en un puerto de tempo a −40 km.
- **Quién decide**: su equipo (2-3 se quedan con él; el resto sigue con la segunda carta), los rivales (aprietan: «el que huele sangre»), el propio jefe (pide o no).
- **Lo que pasa en carretera**: los rivales T3 ponen a sus gregarios a tirar a tope en cuanto ven al maillot descolgado (aprovechar); el equipo del maillot deja a dos con él y si tiene segundo hombre en la general lo protege delante; si el maillot pierde > 3 min, el equipo cambia de jefe para el resto de la vuelta. En clásica (FORMATO-05) nada de esto pasa.
- **Lo que hace hoy el motor**: D-13 drop-back («por la general todos menos uno», solo hacia `shed`, 22-300 s, ≥ 5 km), `jefeEnApuros` saca del turno a los suyos; los rivales NO aprietan al ver al maillot atrás (`gcDefence` mira solo dentro del grupo, `teamStance` no ve «el maillot va detrás»); no hay cambio de jefe. **PARCIAL**; la reacción de los rivales **AUSENTE** («la emboscada y el día en que el líder se rompe» no tocados, E3).
- **Lo que dijo el dueño**: «si es el favorito para una gran vuelta… puede justificar descolgar a todo el equipo menos 1» (v36); «El líder se queda atrás… ¿y nadie de su equipo tira para ayudarle?» (v57); «uno que va en grupo 2 podría esperar a uno del grupo 3 y ayudarlo» (v36).
- **Información necesaria**: el maillot va detrás y a cuánto (los relojes existen; el plan T3 no los lee), quién es mi segundo hombre (no existe), km que quedan y terreno.
- **Cómo se mediría**: `grandTour` y `realQueens`: «cuando el maillot pierde ≥ 30 s a > 20 km de meta, el compromiso del grupo de cabeza sube ≥ 0,1 en los 2 km siguientes» ≥ 70 %; «el maillot descolgado a −40 km pierde en meta» mediana 2-5 min (hoy vuelve «demasiado fácil», v58 §6 abierto).

### [FORMATO-27] La emboscada: compañeros en la fuga como relevo del jefe que ataca de lejos

- **Cuándo**: etapa de montaña con valle o descenso entre el penúltimo y el último puerto; un T3 con 2-3 hombres en la fuga del día.
- **Quién decide**: T3 (planificado desde la salida), su jefe (saltar en el descenso/valle), los fugados propios (esperar al jefe), T2 (reaccionar con quién).
- **Lo que pasa en carretera**: el T3 mete gente en la fuga a propósito; el jefe ataca en el descenso o el valle a 40-60 km; sus fugados dejan de relevar, esperan y le llevan a tope; el T2, con el equipo desgastado, tiene que perseguir con el maillot en persona o ceder. Es el mecanismo real por el que se ganan grandes vueltas en la 3.ª semana (Formigal 2016, Granon 2022).
- **Lo que hace hoy el motor**: nada de esto: los ataques con general fuera de `ataque_final` reciben solo `(1−0,7·gcDefendShare)(1+0,6·gcChallengeShare)` (v52) y `lambdaCounterAttack 0,02`; el fugado no espera a nadie (D-13 solo baja hacia un `shed`, y «de un mov no baja nadie»); no hay «compañero delante → atacar más»; `teamStance` `fuga` baja el apetito de todo el equipo (`teamAttackUpTheRoad 0,4`): **CONTRARIO** (tener compañeros delante hoy quita ganas de atacar al jefe).
- **Lo que dijo el dueño**: «la emboscada» (E3, no tocado); «otra cosa es que los que van segundo, tercero o cuarto lo hagan, porque ellos quieren luchar por la carrera» (v52); N1: «si mi jefe se descuelga en el primer puerto, espérale».
- **Información necesaria**: cuántos de los míos van delante y a cuánto (existe para el plan; no para el apetito del jefe), terreno que viene (descenso/valle: perfil existe), colchón del maillot y estado de su equipo (no existe «cuántos gregarios le quedan al T2»).
- **Cómo se mediría**: `grandTour`/`realQueens`: «ataques de la general (2.º-5.º) a > 30 km de meta en montaña» 0,5-2 por etapa de montaña (hoy casi 0 fuera de `ataque_final`); «cuando el atacante tiene ≥ 1 compañero en la fuga, el compañero deja el turno y el hueco crece» ≥ 60 %; «emboscadas que mueven ≥ 30 s la general» 10-25 % de las que se lanzan.

### [FORMATO-28] Última etapa de paseo: pacto de no agresión y sprint en el circuito

- **Cuándo**: etapa 21 (o la última de una vuelta corta) llana con circuito urbano; general decidida.
- **Quién decide**: el pelotón como colectivo (nadie ataca hasta el circuito), T2 (desfila en cabeza), T1 (el único sprint que importa), los jueces (tiempo neutralizado al entrar al circuito).
- **Lo que pasa en carretera**: 80 km de paseo, fotos, champán; al entrar en el circuito la carrera arranca; algún cazaetapas ataca en el circuito y casi nunca llega; los T1 controlan y sprintan; ningún T2/T3 arriesga nada; el tiempo de la general se congela.
- **Lo que hace hoy el motor**: nada: el motor no sabe que es la última etapa ni que la general está decidida; `stageMix` la hace más corta (`lastStageKmFactor`) y llana si el sorteo dice «trámite». Se corre como cualquier llana con `maillot` → `controlar`. **AUSENTE** (pacto, neutralización). En cambio CUBIERTO por casualidad: el maillot con colchón > 60 s ya no ataca (`gcDefendShare`) y la llana no da empujón a los rivales (`gcTerrain` false).
- **Lo que dijo el dueño**: «última etapa decisiva a veces» (v10, composición); «No existen carreras por etapas de 5 etapas llanas en la realidad» (v10).
- **Información necesaria**: «es la última» + «la general está decidida (1.º-2.º > X s)» (ni una ni otra llega al motor), «hay circuito final y desde qué km».
- **Cómo se mediría**: `grandTour` e21: «ataques antes del km −60» ≤ 1 por etapa; «cambios en el top-10 de la general en la última etapa llana» 0 % (con neutralización) o ≤ 5 % sin ella; «gana el mejor sprinter del campo» 30-45 % (como `flat`).

### [FORMATO-29] Última etapa decisiva (final en alto o crono final): todo o nada según la general

- **Cuándo**: última etapa `reina`/`media-alto` o CRI final; general apretada (≤ 60 s) o decidida (> 3 min).
- **Quién decide**: T2 y T3 (según colchón), sus gregarios (nada que guardar), T5 (la fuga tiene sitio si la general está decidida, ninguno si está apretada).
- **Lo que pasa en carretera**: general apretada: los T3 atacan desde el penúltimo puerto, el T2 gasta todo el equipo en tempo, la fuga se caza; general decidida: el T2 deja ir la fuga a 15 min, los T3 lejanos van a la fuga, la etapa la gana la fuga o un escalador sin general; el maillot desfila detrás. En la CRI final apretada: FORMATO-37.
- **Lo que hace hoy el motor**: la asimetría por colchón existe (`gcDefendShare` satura a 60 s; `gcChallengeShare`); el «no hay mañana» no; la fuga en final en alto canónico 25-45 % (control de forma). **PARCIAL**: el colchón se lee dentro del grupo (`gcDefence`), y la etapa no sabe que es la última.
- **Lo que dijo el dueño**: «un final en alto no es el equipo del favorito tirando hasta reventar a todos. Los fuertes atacan: por la etapa y por la general, en el momento oportuno, y vigilándose entre ellos» (regla 9, §13.1); «si el líder se sienta, son sus rivales los que tienen que moverle» (v46).
- **Información necesaria**: «es la última» (no llega), colchón sobre cada rival (existe dentro del grupo), quién puede recuperar cuánto (perfil vs km de puerto: derivable).
- **Cómo se mediría**: `grandTour` con última decisiva: «ataques de los T3 en la última etapa decisiva con 1.º-2.º ≤ 60 s» ≥ 2× los de una reina intermedia con la misma diferencia; «gana la fuga en la última etapa decisiva con general decidida (> 3 min)» 30-60 %, con general apretada ≤ 15 %.

### [FORMATO-30] Clasificaciones secundarias como motivo de equipo (montaña, puntos, joven, equipos)

- **Cuándo**: 2.ª y 3.ª semana; equipos que ya no juegan la general ni etapas de sprint.
- **Quién decide**: T5 y T3 lejanos (ir a por la montaña: fuga en todas las etapas con puertos), T1 (puntos: controlar la fuga para que su sprinter puntúe en la meta volante), equipos con joven.
- **Lo que pasa en carretera**: el aspirante a la montaña va en la fuga cada día de puertos y su equipo le mete un compañero para llevarle a los puertos; los T1 con líder de la regularidad limitan la fuga a ≤ 3 para que pasen menos puntos delante o incluso persiguen antes de la meta volante y luego sueltan; la clasificación por equipos a veces mueve a un equipo a colocar tres en la fuga.
- **Lo que hace hoy el motor**: `sprintPts`/`climbPts` se reparten (`disputeBanner`, `disputeClimb`), `komLead.proclaimed` es narrativa; `contestClimbs` solo filtra el banner de meta volante; los motivos del plan son tres (`etapa`/`maillot`/`general`). **AUSENTE**: «hoy solo hay tres motivos y ninguno cubre "voy a por el maillot de la montaña"» (mapa-spec §9.1).
- **Lo que dijo el dueño**: — (solo vía tactica.md: «las clasificaciones secundarias… como motivo de equipo» listadas como falta).
- **Información necesaria**: clasificación de la montaña/puntos acumulada (db la tiene, no entra en `StageInput`), qué puertos y metas volantes hay hoy (perfil existe), quién es mi aspirante.
- **Cómo se mediría**: `grandTour`: «el líder de la montaña va en la fuga del día en etapas con ≥ 2 puertos de 1.ª/HC» 40-70 %; «puntos de la montaña ganados por fugados vs pelotón» ≥ 60 % en transiciones; «el líder de la regularidad puntúa en la meta volante» 40-70 % de las llanas.

### [FORMATO-31] Metas volantes: la fuga se dimensiona por los puntos que se lleva

- **Cuándo**: llanas de gran vuelta con meta volante a mitad de etapa; T1 con líder de puntos.
- **Quién decide**: T1 (cuántos dejan ir: ≤ 3 para que el sprinter puntúe 4.º con 13 pts), los fugados (esprintar la volante o dejarla).
- **Lo que pasa en carretera**: el pelotón esprinta la meta volante con el tren (lanzamiento a 200 m) aunque la fuga esté a 4 min; después se relaja otra vez; los fugados se reparten la volante por acuerdo o la disputan.
- **Lo que hace hoy el motor**: «Meta volante: solo el grupo de cabeza esprinta por los puntos» (`simulate.ts:5810`): el pelotón no disputa si hay fuga; `contestSprints` solo en sprinter, lanzador y cazaetapas de llano. **PARCIAL/CONTRARIO** para el pelotón (no puntúa detrás de la fuga).
- **Lo que dijo el dueño**: —.
- **Información necesaria**: puntos en juego por puesto detrás de la fuga (tabla), quién lidera los puntos.
- **Cómo se mediría**: `grandTour`: «el pelotón disputa la meta volante detrás de la fuga (evento con protagonistas del pelotón)» ≥ 60 % de las llanas con fuga ≤ 5; «tamaño de la fuga del día en llanas con líder de puntos en el pelotón» mediana 2-4.

### [FORMATO-32] Abandono del jefe a mitad de vuelta: el equipo se reconvierte

- **Cuándo**: el jefe de la general o el sprinter abandona (caída, enfermedad) con 10 etapas por delante.
- **Quién decide**: el equipo (nueva carta: segundo mejor de la general, o modo cazaetapas), el bot mánager.
- **Lo que pasa en carretera**: el día siguiente el equipo corre distinto: sus escaladores se van a la fuga, nadie controla, el gregario de lujo pasa a jefe; a veces un equipo se va entero de la carrera en la práctica (5 abandonos en cadena).
- **Lo que hace hoy el motor**: `autoStageOrders` recalcula cada día por atributos y `gcRank` con los presentes (el abandonado no está) → nuevo jefe por terreno, `cazaetapas` por `breakScore`. **CUBIERTO en lo básico**; no hay «moral del equipo tras el abandono» (G2.11: «nada la mueve por motivos humanos»).
- **Lo que dijo el dueño**: «un corredor ganó 3 etapas… luego resulta que dice en noticias que se enfermó… y en las clasificaciones, incluso tras la etapa 1, pone DNF» (v45, narrativa).
- **Información necesaria**: quién queda y cuál es su general (existe), moral (no en el motor).
- **Cómo se mediría**: `grandTour`: «equipos que pierden a su carta de general: fugados suyos al día siguiente» ≥ 1,5× su media anterior.

### [FORMATO-33] El umbral de los 420 s: dónde deja de existir la general para un equipo

- **Cuándo**: en cualquier etapa con general: un equipo cuyo mejor hombre pasa de 7 minutos.
- **Quién decide**: el plan de equipo (propósito), el corredor (apetito).
- **Lo que pasa en carretera**: en la 1.ª semana 7 min es mucho; en la 3.ª semana con tres finales en alto y una crono por delante, 7 min NO es estar fuera (Froome 2018: 3:20 y ganó; Sagan/Hindley remontadas de 4-5 min); y a la inversa, en una vuelta corta de 5 días 2 min ya es estar fuera. El umbral real es «lo que puedo recuperar en lo que queda».
- **Lo que hace hoy el motor**: `general` si `0 < déficit ≤ gcThreatFraction·gcControlLeash = 420 s` fijo; `isThreatened` idem; `attackAppetite` idem. **PARCIAL**: un solo umbral para todos los formatos (mapa-spec §9.7: falta la «general virtual por equipo» y lo que le cuesta a MI hombre).
- **Lo que dijo el dueño**: «`gcControlLeash` no mueve nada» (v44 §8, comentario a reescribir); «recalibremos la capa táctica para que la fuga en una etapa de montaña gane en más casos» (v43).
- **Información necesaria**: terreno restante de la vuelta (final en alto/crono por delante) y su capacidad de abrir diferencias; no llega al motor.
- **Cómo se mediría**: `grandTour` y `smallTours`: «equipos con propósito `general` en la etapa 20» = equipos cuyo hombre está a ≤ (segundos recuperables estimados) — como prueba de forma: en gran vuelta la banda de «equipos con motivo de general» debe ESTRECHARSE de la etapa 10 a la 20 (de 8-12 a 3-6 equipos); en una vuelta de 5 días, de 10-15 a 3-6 entre la e2 y la e5.

---

## D. Contrarreloj

### [FORMATO-34] CRI primera etapa / prólogo: salida por dorsales, todos a tope, el primer maillot

- **Cuándo**: CRI el día 1 de una vuelta (o crono de un día: campeonatos nacionales de crono).
- **Quién decide**: cada corredor (ritmo), el equipo casi nada (orden de salida por dorsal, sin general).
- **Lo que pasa en carretera**: todos a tope; el orden lo marca el dorsal (el 1 de cada equipo sale último); el primero que marca el mejor tiempo se sienta en la silla; no hay táctica de equipo salvo «el gregario sale antes y da referencias de las curvas/viento» (información, no vatios). El T1/T2/T3 no existen: es individual; la única decisión de equipo es quién lleva qué dorsal (jefe = dorsal acabado en 1).
- **Lo que hace hoy el motor**: `timeTrialStartOrder` por dorsal (última cifra descendente, 0 = 10) a 60 s; `ttCommitment 0,85` para todos; `tt_best_time`, `tt_split`, `tt_catch`. **CUBIERTO** en lo que una crono sin táctica exige. Límite anotado: «una crono de un DÍA se siembra por dorsal y no por ranking (decisión de diseño pendiente)» (v19 §12).
- **Lo que dijo el dueño**: «si es primera etapa o una carrera de un día entonces salen por dorsales, acabando con el 1, antes el 11, antes el 21, 31,… entonces en el Journal puedes ir diciendo quién hace el mejor tiempo y quién le supera» (v18).
- **Información necesaria**: dorsal (existe `bib`), nada más.
- **Cómo se mediría**: `cri-40` y `timeTrials`: `specialistWinPct` 90-100 (existente); `tailPct` 8-15 (banda del dueño).

### [FORMATO-35] CRI intermedia: orden inverso a la general y lo que eso implica

- **Cuándo**: CRI en la etapa 4-16 de una vuelta; salida inversa a la general a 2 min (los últimos 20 a 2-3 min, los primeros a 1 min en la realidad).
- **Quién decide**: los favoritos (saben lo que han hecho sus rivales que salieron antes: pueden ajustar), los gregarios (salen primero: descansar o marcar tiempo para dar referencias), el T2 (proteger al jefe del riesgo).
- **Lo que pasa en carretera**: salir el último es una VENTAJA de información (parciales de los rivales en el pinganillo) y de calma (carretera conocida por los suyos); salir entre los primeros es salir «con el pelotón detrás»: los gregarios de fondo dosifican al 70-80 % para pasar el corte y guardar piernas para mañana, salvo el cronista que quiere la etapa; los alcances son constantes (el 150.º cazado por el 148.º) y no dan rebufo; los favoritos se alcanzan entre sí solo si la general está muy rota.
- **Lo que hace hoy el motor**: `startOrder` inverso a la general a 120 s (`ttStartIntervalGcS`), desempate por `gcRank`; alcances narrados sin efecto. **CUBIERTO** el orden; **AUSENTE** «lo que eso implica»: nadie dosifica (0,85 fijo), nadie ajusta al parcial del rival, nadie guarda para mañana; `autoStageOrders` da `libre` a todos en TT.
- **Lo que dijo el dueño**: «si es de una carrera por etapas y no es la primera etapa, salen en orden inverso de la general… separados por 2 minutos, con lo que eso implica» (v18); «el desempate en una etapa 2 no es por dorsal, es por posición en la etapa 1» (v19).
- **Información necesaria**: mi puesto de salida y quién sale antes/después (existe en `plan`), parciales de los rivales ya en meta (existen: `raw` por bloque), mi rol de mañana (no), cuánto necesito para el corte (`timeCutItt 0,25` dormido: sin incidentes no salta).
- **Cómo se mediría**: `timeTrials` reales en vuelta: (a) «gregarios (rol contractual/`autoOrders` de la etapa anterior) en el tercio final de la crono» ≥ 60 % (hoy el orden de meta es el de CRI puro); (b) «el ganador sale entre los últimos 30» ≥ 70 % (sale bien ya por construcción: los mejores de la general suelen ser buenos cronistas); (c) coste de depósito de los gregarios que dosifican ≤ 60 % del de los que van a tope.

### [FORMATO-36] CRI intermedia: quién va a tope y quién dosifica (y la orden del jugador)

- **Cuándo**: la misma CRI; corredores sin opción de etapa ni general.
- **Quién decide**: cada corredor (bot por rol: cronista → a tope; gregario → ahorrar; escalador de la general → a tope pero sin riesgo), el jugador humano (`effort`).
- **Lo que pasa en carretera**: un gregario de montaña rueda al 70 % dentro del corte y llega fresco a la reina de mañana; el cronista sin general va a tope por la etapa; el sprinter va a mínimo; el escalador líder va a tope porque cada segundo cuenta; el jugador humano decide su esfuerzo (y hoy su pantalla promete «All-in» sin efecto en la crono).
- **Lo que hace hoy el motor**: `ttCommitment 0,85` para TODOS; `effort` solo actúa en `relayDuty` de las etapas en línea; `timetrial.ts` no lee `orders`. **AUSENTE**; y para el jugador **CONTRARIO** a la promesa de la pantalla («el resultado es casi lo mismo ponga lo que ponga ahí», v58).
- **Lo que dijo el dueño**: «creo que hay que rediseñar y mejorar el tema de las instrucciones por etapa… el resultado es casi lo mismo ponga lo que ponga ahí» (v58); MVP «política de dosificación en CRI» dejada fuera.
- **Información necesaria**: rol del día (existe `orders.role` aunque `autoOrders` dé `libre`), `effort` (existe, no leído en TT), corte estimado (derivable del ganador previsto), mañana (no llega).
- **Cómo se mediría**: `timeTrials` con órdenes: «corredores con `effort = ahorrar` terminan con ≥ 25 puntos más de depósito que los `a_tope` de perfil igual» (invariante duro); «gregarios de montaña dentro del corte» 100 % (el corte de la crono no debe eliminar a nadie que dosifica: `timeCutItt` 0,25); `tailPct` 8-15 se mantiene o sube a 10-18 por los que dosifican (revisar banda: la cola real de una crono de gran vuelta incluye a los que no van a tope).

### [FORMATO-37] CRI final (última etapa): la general se decide contra el reloj y el maillot corre «a lo seguro»

- **Cuándo**: última etapa CRI (el calendario la coloca en la penúltima/antepenúltima; en carreras reales a veces última) con la general a ≤ 60 s.
- **Quién decide**: el maillot (arriesgar en curvas o no; sabe el tiempo del 2.º porque salió 2 min antes), el 2.º (a tope, sin referencia), los equipos (nada, salvo bicicleta y estudio del recorrido).
- **Lo que pasa en carretera**: el 2.º sale antes y marca; el maillot sabe en cada parcial si va a perder la carrera y ajusta: con colchón, no arriesga (menos caídas); sin colchón, todo. En cronoescaladas finales (Planche 2020) la general puede volcar. El alcance del maillot por el 2.º casi nunca ocurre (2 min = mucho).
- **Lo que hace hoy el motor**: sin general en la física de la crono (`gcDeficit` solo ordena la salida); `LEADER_JERSEY_BOOST` ×1,04 ayuda al maillot también en la crono («el maillot da alas», db); sin incidentes en crono (`incidents: []`), luego «arriesgar» no existe. **AUSENTE** el pacing por objetivo; **CUBIERTO** la aritmética de la general.
- **Lo que dijo el dueño**: «con lo que eso implica» (v18); «una crono de un día… decisión de diseño pendiente» (v19 §12).
- **Información necesaria**: tiempo del rival en cada parcial (existe en el motor durante la simulación: `clockAt`), colchón, «es la última».
- **Cómo se mediría**: `grandTour` con CRI final (cuando el sorteo la deja última) y `smallTours`: «vuelcos de la general en la última CRI con 1.º-2.º ≤ 30 s» 20-40 %; «el maillot con colchón ≥ 60 s termina fuera del top-10 de la crono» ≤ 25 % (corre seguro pero no regala).

### [FORMATO-38] Cronoescalada: escaladores contra cronistas, y el equipo no pinta nada

- **Cuándo**: CRI con final en alto (Planche, Monte Lussari) o cronoescalada pura (Alpe d'Huez 2004).
- **Quién decide**: cada corredor (ritmo por tramos: llano al 0,85, subida al perfil de MON), los equipos (cambio de bici: no modelado).
- **Lo que pasa en carretera**: los cronistas ganan tiempo en el llano y lo pierden arriba; los escaladores al revés; el pacing por tramos es la única táctica; la general se mueve más que en una crono llana.
- **Lo que hace hoy el motor**: `ttPerfil` desliza a MON con `climbWeight(g)` en subida; `ttCommitment` fijo. **CUBIERTO en la física**; sin pacing por tramos.
- **Lo que dijo el dueño**: «la ley de atributo → velocidad es aproximadamente el doble de inclinada de lo que es en carretera… el nivel bajo de un profesional no puede rodar a 37 km/h en una crono llana» (v19).
- **Información necesaria**: perfil (existe).
- **Cómo se mediría**: `timeTrials` con cronoescalada: «gana un escalador (MON ≥ CRI + 10) en cronoescalada» 40-70 %; «brecha 1.º-10.º» 1,5-2,5× la de una crono llana del mismo largo.

### [FORMATO-39] Contrarreloj por equipos (CRE): el formato que no existe y qué exige de cada equipo

- **Cuándo**: CRE de 20-40 km en la etapa 1-4 de una vuelta (Tour, Vuelta, Tirreno, Dauphiné; en el calendario real cargado hay una etapa marcada «CRE» en `stageFeatures.ts:4046`).
- **Quién decide**: el equipo entero (ritmo del 4.º/5.º hombre, quién tira más, a quién se deja caer), el líder (protegido), el jugador humano en un equipo bot (su rol en la fila).
- **Lo que pasa en carretera**: el tiempo lo da el 4.º (o 5.º) que cruza; el equipo rueda al ritmo del 4.º más fuerte, no del mejor; los débiles tiran poco y corto y se dejan caer a mitad («lastre») sin que el equipo espere; el líder va a rueda y da relevos cortos; un equipo con 8 rodadores gana 1-2 min a uno de 8 escaladores → la CRE castiga la estructura «un jefe y siete escaladores» y premia al T1/T2 con rodadores. Los corredores descolgados terminan solos y su tiempo es el propio (corte). Da la primera general con diferencias de EQUIPO, que luego condiciona quién controla (FORMATO-13).
- **Lo que hace hoy el motor**: **AUSENTE**: «No existe modo CRE ni entrada que lo active» (`constants.ts:3725`); `teamTt*` definidas sin uso; SPEC 6.13 promete «CRE con shelter 0,5 y ritmo del 4.º mejor ×0,98»; V.4 la aplaza («no urge»).
- **Lo que dijo el dueño**: — (V.4 es decisión del encargo: «se conserva pendiente, no urge»).
- **Información necesaria**: composición del equipo (existe), perfil de cada uno en llano/CRI, quién es el 4.º (derivable), órdenes del jugador (rol en la fila / dejarse caer).
- **Cómo se mediría**: banco `cre-30` canónico con 22 equipos: «gana el equipo con mejor media de los 4 mejores `ttPerfil`» 60-85 %; «brecha 1.º-último equipo» 1,5-4 min en 30 km; «corredores que terminan sueltos» 20-40 % del campo; «el líder de la general de cada equipo termina con su grupo» ≥ 95 %.

### [FORMATO-40] CRI: el corredor en apuros (pinchazo, caída, cambio de bici) y el corte dormido

- **Cuándo**: cualquier CRI; en la realidad 2-5 incidentes por crono de 176.
- **Quién decide**: el corredor (seguir o parar), el coche del equipo (bici de repuesto), los jueces (corte 25 %).
- **Lo que pasa en carretera**: un pinchazo cuesta 30-60 s; una caída en una curva mojada puede costar la general (o la carrera); el corte del 25 % solo pilla a quien se cae o pincha dos veces.
- **Lo que hace hoy el motor**: `simulateTimeTrial` devuelve `incidents: []`; «o se modela el incidente en la crono, o el 0,25 es una salvaguarda dormida» (v20 §6). **AUSENTE**.
- **Lo que dijo el dueño**: «Corte de tiempo en contrarreloj» (v14 fuera, v19/v20 activado) — cita del encargo: «en producción este corte no va a saltar hasta que el motor modele el pinchazo y la caída dentro de una contrarreloj».
- **Información necesaria**: lluvia (existe), DES/TAC del corredor (existen), fragilidad (no llega al motor).
- **Cómo se mediría**: `timeTrials`: «incidentes por crono» 1-4 % del campo; «eliminados por el corte en crono» 0-1 % (dato real: casi nunca).

---

## E. Circuito y forma del final

### [FORMATO-41] Etapa en circuito (vueltas repetidas): la cota que se sube N veces y «faltan dos vueltas»

- **Cuándo**: clásicas en circuito (Québec, Montréal, campeonatos, Hamburgo) y finales de etapa con 2-3 vueltas urbanas.
- **Quién decide**: el pelotón (la carrera arranca «a dos vueltas»), los equipos (la fuga se deja hasta la vuelta X), los favoritos (atacar en el penúltimo o último paso por la cota).
- **Lo que pasa en carretera**: la misma cota se sube 8-18 veces: la selección es acumulativa y predecible (todos saben dónde duele); la fuga se deja hasta que quedan 2-3 vueltas y se caza en el penúltimo paso; el ataque decisivo es en el último paso (Camilien-Houde a 9 km) o en el penúltimo si hay equipos con dos cartas; el grupo grande vuelve en el llano de la vuelta y se agrupa al sprint reducido si nadie salta.
- **Lo que hace hoy el motor**: el circuito llega como perfil lineal con las N cimas por aritmética (`circuitClimbs`); el motor no sabe qué es una vuelta ni cuántas quedan; `raceThisClimb` = últimos 30 km (2-3 pasos); `climbTempoCommit` antes. **PARCIAL** (la física acumula; la táctica «a dos vueltas» no existe, y un pelotón no puede razonar «esta cota la conozco»).
- **Lo que dijo el dueño**: Québec: «una rampa del 3 % en meta mataba el sprint (Québec 99 % → 1 %)» (v22, resuelto con `admitsBunchFinish`).
- **Información necesaria**: longitud de la vuelta y pasos restantes (derivable del perfil si se marca la periodicidad), quién queda en el grupo tras cada paso (existe).
- **Cómo se mediría**: banco de clásicas con circuito (Québec/Montréal cargadas): «la fuga del día muere entre el antepenúltimo y el penúltimo paso» ≥ 60 %; «el ataque ganador sale en el último paso por la cota» 40-70 %; tamaño del grupo de meta 5-40.

### [FORMATO-42] Final en alto: el tren de montaña a ritmo y los fuertes que atacan

- **Cuándo**: etapa `alto` (corona ≤ 0,6 km o últimos 3 km ≥ 5 %), puerto final de 8-20 km.
- **Quién decide**: T2 (tempo con 2-3 escaladores gregarios hasta −4 km), T3 (atacar a −5..−2 km o dejarse llevar), T5 fugados (sobrevivir), T1 (grupeto desde el pie).
- **Lo que pasa en carretera**: el equipo del maillot marca un ritmo que criba a 40-60 → 10-15 → 5-8 a −4 km; los ataques son cortos y repetidos entre 5 y 2 km; en la 1.ª semana el final en alto lo gana el pelotón de favoritos casi siempre (la fuga solo si «cuesta abajo» para la general); en la 3.ª, la fuga tiene sitio si el T2 deja ir. El «1» dentro de 30 s es realista en final en alto (Tour 2024).
- **Lo que hace hoy el motor**: `finishType` `alto`, `bunchFinish` false → T1/T4 `proteger`; `climbRaceCommit 0,85`; `ataque_final` en subida por `perfilRank` + `gcDefendShare`/`gcChallengeShare`; 55,3 % decididos por ataque (§13); `shatter` por deriva/reserva; `mountain.breakawayWinPct` 25-45 como control de forma; `top10GapSeconds` suelo 40. **CUBIERTO** en su mayor parte; **PARCIAL**: el tempo del T2 lo lleva `frontTeamId` con `driveOnFront` pero «los favoritos atacan a tope y la subida decide» (sin tren de montaña explícito).
- **Lo que dijo el dueño**: regla 9 (§13.1); «una reina real deja llegar juntos a un grupo de 5-15 y no 1» → corregido: «el "1" del motor era realista para un final en alto y falso para todo lo demás» (v23/v26); «es una llegada en alto con un puerto brutal al final… y el que llega en el puesto 150 solo perdió 26 segundos» (v49, Giro e9).
- **Información necesaria**: colchón por rival (existe en grupo), km a la cima (existe), cuántos gregarios de montaña me quedan (existe energía; no «de montaña»).
- **Cómo se mediría**: `reina-150`, `realQueens`, `calendarQueens`: bandas existentes (fuga 25-45 canónico / 6-30 real; `top10GapSeconds` ≥ 40; grupo de cabeza a 30 s mediana 1-3; `lastGroupPct` 8-14).

### [FORMATO-43] Final tras descenso: el que gana el puerto tiene que bajar

- **Cuándo**: último puerto corona a 5-15 km de meta con descenso hasta la línea o casi (`descenso` si ≥ 50 % de los últimos 3 km baja).
- **Quién decide**: el escalador (atacar arriba sabiendo que bajan detrás), el bajador (dejar hacer y recuperar bajando), el grupo (se reagrupa: sprint reducido).
- **Lo que pasa en carretera**: los ataques en el puerto son menos decisivos (se sabe que la bajada reagrupa); el mal bajador no ataca solo; el bajador ataca en la cima o en la bajada (Nibali, Pidcock); con lluvia, el que lleva la general no arriesga y cede 10-20 s. Los T2 no hacen tempo hasta la cima: guardan un gregario para bajar delante del jefe.
- **Lo que hace hoy el motor**: `finishType` `descenso` (DES 0,42 TAC 0,25 SPR 0,18 LLA 0,15); `dropDescentFactor` solo si `g ≤ −4 %` y solo el primer km (`descentSelectKm`); descenso NO es `onRough` (sí hay reenganche/fusión); «Nada táctico se decide en el descenso». **PARCIAL**: el reagrupamiento existe por física; el «no ataco arriba porque bajan» y el «ataco bajando» no existen; la lluvia suelta ruedas en descenso pero no hace al maillot conservador.
- **Lo que dijo el dueño**: «en una bajada es normal que algunos de los que perdieron contacto al subir se reenganchen, pero no todos, wey» (v35); «¿qué chingados pasó entre el km 191 y el 192?» (descenso, comentario simulate).
- **Información necesaria**: mi DES vs los del grupo (existe), km de bajada tras la cima (perfil existe), lluvia (existe), «llevo la general» (existe).
- **Cómo se mediría**: `media-190` con final `descenso` y banco de clásicas: «ganador con DES en el top-3 del grupo de cabeza» 40-60 %; «ataques en cima que llegan solos a meta» 10-25 %; «el maillot cede ≥ 10 s en descenso final con lluvia» 10-30 % (frente a ≤ 5 % en seco).

### [FORMATO-44] Valle largo tras el último puerto (Colombia e5, Race Alps): la montaña selecciona y el valle reagrupa

- **Cuándo**: último puerto corona a 20-50 km; después valle/llano; final `sprint_reducido`/`solitario` para el modelo de final (la cota está fuera de los 15 km de búsqueda).
- **Quién decide**: los que coronan solos (seguir o esperar), los grupos de detrás (colaborar para volver), los equipos con números en el grupo delantero (tirar para que no vuelvan), el T2 (controlar por la general).
- **Lo que pasa en carretera**: el escalador que corona con 30 s solo, muere en el valle (20 km solo contra 8); un grupo de 3-6 que corona junto colabora y llega si tiene 1 min; los T3 con dos hombres delante tiran a tope; el grupo del maillot, si el T2 tiene gente, cierra a los peligrosos y deja a los inofensivos; la etapa la gana un rodador-escalador del grupo delantero o el grupo de favoritos al sprint. Es también donde el motor mostró su regresión de los «74 minutos» (v17) y donde Race Alps repite ganador.
- **Lo que hace hoy el motor**: el puerto se corre con `raceThisClimb` (≤ 30 km) → `climbRaceCommit` y `ataque_final` (si corona a > 30 km, nada de eso: FORMATO-46); `finishType` no ve la cota; los `mov` en el valle pierden por física (`shelterOf`, 1 contra n); la cooperación se remide cada 2 km (`noChanceToWin`); `tieneHombreDelante` saca del turno al que tiene compañero delante. **PARCIAL**: no hay «este grupo tiene dos del mismo equipo → tiran ellos»; el `gcLeash` en llano usa `0,62 + 0,016·err` sin distinguir peligroso/inofensivo dentro del grupo de cabeza; el «ganador repetido» de Race Alps sigue ABIERTO («las cinco dejan 22/1/31/50/19 km tras la última cota… si la fuga no gana NUNCA… la gana siempre alguien del grupo de favoritos, y el mismo hombre repite»).
- **Lo que dijo el dueño**: «74 minutos???» (v17, Race Colombia e5); «Race Alps: un escalador de 95 gana 1 de 5 etapas de montaña y no es favorito en las otras cuatro» / «3 etapas seguidas de montaña y las 3 las gana el mismo ciclista» (v42 §3 / v43 §11, ABIERTO).
- **Información necesaria**: km de valle restantes (perfil existe), quiénes de mi equipo van en cada grupo (existe para el plan; no para la decisión de relevo dentro de un `mov` salvo `tieneHombreDelante`), general virtual de cada fugado para el T2 (parcial).
- **Cómo se mediría**: sobre Race Alps y Colombia reales + una `media-valle-40` canónica (cima a 40 km): «el corredor que corona solo con ≤ 45 s llega solo a meta» ≤ 15 %; «un grupo de 3-6 que corona con ≥ 60 s llega delante» 40-70 %; «ganador repetido en etapas consecutivas de montaña de la misma carrera» ≤ 25 % de los pares (`sameWinnerPairPct` existente en `smallTours`); `mediaGroups` 3-8.

### [FORMATO-45] Puerto de tempo + valle + puerto decisivo: la etapa reina de dos actos

- **Cuándo**: reina con HC a −80 km, valle, final en alto (Galibier–Alpe; Tourmalet–Luz).
- **Quién decide**: T2 (tempo en el primero para vaciar equipos rivales, no para romper), T3 (mandar gente delante para el segundo acto: FORMATO-27), T1 (grupeto desde el pie del primero), T5 (fuga que sobrevive al primero).
- **Lo que pasa en carretera**: el primer puerto criba gregarios (de 176 a 40-60 en el grupo de favoritos) y forma el grupeto; en el valle se reagrupa parcialmente y los equipos de la general con hombres delante deciden si los esperan o si los usan; el último puerto es FORMATO-42.
- **Lo que hace hoy el motor**: `climbTempoCommit 0,7` en el primero (`raceThisClimb` false), `climbRaceCommit` en el último; `shatter` en ambos; `grupetoWait`, reenganches por puerta 22 s; `helpBack`; el cruce de grupos sin fusión en puerto (LÍMITE v56). **CUBIERTO en la física**; la decisión de «guardar a la gente en el valle» no existe (los `mov` se remiden por `noChanceToWin`).
- **Lo que dijo el dueño**: «así el pelotón no se destroza en cada cota y las diferencias las marca el último puerto, como en la realidad»; «quizás entonces en una etapa reina falta que los campeones se esfuercen un poquito más» (v39 §6); «los que pierden en montaña 5 minutos luego se reintegran demasiado fácil» (v58 §6, ABIERTO).
- **Información necesaria**: cuál es el puerto decisivo (perfil: derivable), quién de los míos va delante (existe), reenganches que deben o no ocurrir según prisa del grupo (existe `droppedCommit`).
- **Cómo se mediría**: `realQueens`/`calendarQueens`: «tamaño del grupo del maillot en el valle entre puertos» 20-60; «descolgados en el primer puerto que vuelven antes del último» 20-50 % (con pelotón sin prisa), ≤ 10 % (con prisa: banda del dueño v35 «grupo 4-8: 60 % / 6 % / 2 %»).

### [FORMATO-46] Media montaña con el último puerto a > 30 km: donde la general se ataca lejos

- **Cuándo**: última cota corona a 30-60 km (Great Ocean, Formigal, muchas «media» generadas).
- **Quién decide**: T3 (atacar en la cota lejana con gente delante), T2 (controlar con pocos), el pelotón (cazar en 30 km de llano).
- **Lo que pasa en carretera**: la etapa se decide en la cota lejana o no se decide; los T3 la usan para emboscar; si el grupo de favoritos llega junto al llano, el T2 controla y la fuga gana o hay sprint reducido.
- **Lo que hace hoy el motor**: `raceThisClimb` solo con ≤ 30 km → en esa cota `climbTempoCommit` y sin `ataque_final`; `gcChallengeShare` solo en `ataque_final` y (v52) en el resto de kinds con `gcTerrain`; «en una media montaña cuyo último puerto corona a 36 km los rivales no reciben empujón en todo el día» (v51, anotado); `constants.ts`: «la etapa se decide a veces mucho antes —Race Great Ocean—». **PARCIAL** (anotado como deuda).
- **Lo que dijo el dueño**: «solo en montaña y media montaña» (v52); v51: «Lo que NO arregla».
- **Información necesaria**: «esta es la última cota aunque quede llano» (perfil: derivable), rivales en el grupo (existe), compañeros delante (no en el apetito).
- **Cómo se mediría**: `media-190` con cima a 36 km y las «media» de `smallTours`: «ataques de los T3 en la última cota (aunque corone a 30-60 km)» ≥ 50 % de los que harían si coronase a 10 km; «la general se mueve ≥ 20 s entre los top-5» 15-35 % de esas etapas.

---

## F. Transversales de formato

### [FORMATO-47] Llana de 3.ª semana sin sprinters: la caza que ya no existe

- **Cuándo**: etapa 19 llana; 3-4 de los 8 sprinters han abandonado; los trenes tienen 1 lanzador.
- **Quién decide**: los T1 que quedan (cazar con poco), el pelotón (dejar ir).
- **Lo que pasa en carretera**: la fuga gana mucho más (Tour 2022 e19: fuga de Laporte); los T1 se ponen de acuerdo tarde; la caza fracasa a 5 km.
- **Lo que hace hoy el motor**: `chaseField` es foto de salida SOBRE LOS PRESENTES (abandonados no están en `input.riders`) → la fuerza sí baja con los abandonos; pero un sprinter presente y vaciado cuenta igual; `avail` por presupuesto. **CUBIERTO en parte**.
- **Lo que dijo el dueño**: «un equipo que lleva 80 km tirando no puede seguir a tope» (v15).
- **Información necesaria**: sprinters vivos y frescos (existe energía), lanzadores presentes (existe).
- **Cómo se mediría**: `grandTour` llanas e15+ vs e2-e9: «gana la fuga» ≥ 1,5× (Tour real: 3.ª semana 1 de 3 llanas se la lleva la fuga).

### [FORMATO-48] Convocatoria que no encaja con el formato: estructuras de equipo que «no tienen sentido»

- **Cuándo**: en la convocatoria (5-14 días antes) y en `autoStageOrders` cada día.
- **Quién decide**: el mánager bot (`selectSquad`), el mánager humano (G2), `autoStageOrders`.
- **Lo que pasa en carretera**: la tabla de abajo. En la realidad un equipo compone por formato: al Tour lleva jefe + 3 escaladores + 2 rodadores + 1 sprinter con 1 lanzador; a Roubaix 7 rodadores de pavés; a una vuelta llana un sprinter con 2 lanzadores y rodadores; nunca un `marcador` sin favorito rival, nunca un `lanzador` sin sprinter, nunca 8 escaladores en Sharjah.
- **Lo que hace hoy el motor**: `callupScore` individual por afinidad media del recorrido, «No hay lógica de composición» (mapa-equipo §5.5); `autoStageOrders` solo por `kind` y `gcRank`; nunca `marcador`, un solo `lanzador`, en TT todos `libre`. **AUSENTE** la composición; **PARCIAL** el reparto diario.
- **Lo que dijo el dueño**: «que el 70 % del campo sean gregarios es otra pregunta» (v48, anotado); «Un mánager no puede tener un segundo trabajo ⇒ políticas en dos niveles» (G2).
- **Información necesaria**: el formato de la carrera entera (tipos de etapa, crono, CRE, km) y las cartas del equipo.
- **Cómo se mediría**: banco de convocatorias sobre el calendario real: «equipos que llevan sprinter (SPR ≥ 75) a una gran vuelta con ≥ 5 llanas» ≥ 80 %; «lanzadores convocados sin sprinter» ≤ 5 %; «escaladores (MON ≥ 80) convocados a una vuelta `flat`» ≤ 1 por equipo.

| Formato                    | Estructura que NO tiene sentido                           | Estructura que manda                                        |
| -------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| Clásica llana              | T2/T3 (no hay general), tren de montaña, `marcador`       | T1 con 2 lanzadores; T5 con un baroudeur                    |
| Clásica de pavés           | T1 con velocista puro, escaladores                        | T4 con 2-3 cartas de PAV y gregarios de pavés               |
| Clásica de cotas           | tren de sprint, rodadores                                 | T4 puncheur + 1 escalador rápido                            |
| Clásica de montaña         | T1, lanzadores                                            | escalador-bajador + gregarios de fondo                      |
| Clásica larga              | 8 puncheurs sin fondo                                     | 4 rodadores de fondo + sprinter/puncheur                    |
| Vuelta corta con crono     | 8 escaladores                                             | cronista-rodador como jefe + tren                           |
| Vuelta corta sin crono     | cronista puro como jefe                                   | escalador/puncheur con bonificaciones                       |
| Vuelta de solo llanas      | escaladores, `lider` no sprinter                          | sprinter-líder con 2 lanzadores + rodadores para el abanico |
| Gran vuelta                | 8 sprinters; 8 escaladores sin rodador                    | jefe + 3 escaladores + 2 rodadores + sprinter + lanzador    |
| CRI                        | `lanzador`, `gregario`, `marcador` (ningún rol de equipo) | individual; el equipo solo dosifica                         |
| CRE                        | equipos de 7 escaladores ligeros; un solo rodador         | 4-5 rodadores + jefe protegido                              |
| Circuito                   | tren de sprint si la cota es dura                         | puncheur + 1 compañero para el penúltimo paso               |
| Final en alto              | tren de sprint (grupeto desde el pie)                     | tren de montaña de 2-3                                      |
| Final tras descenso        | escalador puro sin bajar                                  | escalador que baja / bajador                                |
| Valle largo tras el puerto | escalador solo                                            | equipo con 2 en el grupo delantero                          |

### [FORMATO-49] Vuelta corta: el cronista líder en la única etapa de montaña

- **Cuándo**: vuelta con crono y un final en alto posterior; el líder es cronista con 40-60 s.
- **Quién decide**: T2 (tempo para limitar), el cronista (dejarse llevar y limitar pérdidas: «ir a mi ritmo»), T3 escaladores (atacar de lejos porque el final corto no basta).
- **Lo que pasa en carretera**: los escaladores atacan desde el penúltimo puerto o desde el pie porque necesitan minutos; el cronista no responde, hace su ritmo constante (la remontada de v26) y cede lo justo; su equipo lo lleva hasta el pie y se aparta.
- **Lo que hace hoy el motor**: `gcDefendShare` hace que el maillot marque y no ataque; «ir a mi ritmo» no existe como decisión (la deriva/reserva lo aproxima: «uno que empieza mal y luego va remontando»); `gcChallengeShare` empuja a los rivales solo dentro de `ataque_final` con fuerza. **PARCIAL**.
- **Lo que dijo el dueño**: «una cosa que debería poder pasar y nunca pasa es que haya remontadas en una subida… uno que empieza mal y luego va remontando… o uno que empieza muy bien, muy fuerte, y luego se hunde» (v26).
- **Información necesaria**: colchón vs cada escalador (existe en grupo), lo que ese escalador me saca por km de puerto (derivable: la ley), km de puerto restantes.
- **Cómo se mediría**: `smallTours` con crono + final en alto: «el líder cronista (CRI ≥ MON + 10) conserva la general tras el final en alto» 40-70 % con colchón ≥ 45 s; «ataques de escaladores T3 a > 5 km de la cima» ≥ 1 por etapa.

### [FORMATO-50] Gran vuelta, 1.ª semana con viento: los equipos de la general hacen el abanico

- **Cuándo**: llana costera de la 1.ª semana (Zeeland, Albi, Camargue) con viento lateral.
- **Quién decide**: T2/T3 con rodadores (romper para hacer daño a un rival mal colocado), T1 (sprint al fondo), todos (colocación).
- **Lo que pasa en carretera**: aquí el abanico lo provocan los T3 con equipo de rodadores (no los T1): sacan 1-2 min a un favorito; el T1 del primer abanico colabora porque su sprinter gana el sprint reducido; el favorito cortado pierde la vuelta en un día.
- **Lo que hace hoy el motor**: D-48 con colocación `windPlacementTeam` para el equipo del frente (el que lleva `frontTeamId`, normalmente un T1 con `etapa`/`controlar`); los T3 no tienen intent que los ponga delante en un día de viento (`general` → `nada` si no amenazado). **PARCIAL/CONTRARIO**: los T3 son los que menos colocados van.
- **Lo que dijo el dueño**: «aunque eso implicará también definir las colocaciones» (v41); «SÍ se corre distinto el día 18 que el día 3» (E3).
- **Información necesaria**: viento y tramo (no), rodadores frescos en mi equipo (existe), rival mal colocado (no: sin posiciones).
- **Cómo se mediría**: `grandTour` llanas con viento (`vientoLateral > 0`): «favoritos top-10 finales cortados ≥ 30 s en un día de viento» 5-20 % de favorito-días de viento; «el equipo que rompe es un T2/T3» ≥ 40 % de los abanicos en gran vuelta (frente a ~0 % en clásica).

---

## Resumen para el fundidor

- **Dato que falta en `StageInput` y que casi todas las situaciones de esta lente necesitan**: el CONTEXTO DE CARRERA (etapa i de N; tipo de las etapas restantes; «es la última»; «mañana descanso / crono»; «carrera de un día»; clasificaciones secundarias; circuito y vueltas). Sin él, FORMATO-11/13/14/16/21/24/28/29/30/33/35/37 son irresolubles por el motor aunque la táctica se rediseñe.
- **Situaciones CONTRARIAS hoy**: FORMATO-15 (el sprinter maillot deja de ser sprinter), FORMATO-23 (el T2 nunca cede el maillot), FORMATO-27 (compañeros delante quitan ganas de atacar al jefe), FORMATO-31 (el pelotón no disputa la volante detrás de la fuga), FORMATO-36 (la pantalla promete esfuerzo en crono y no llega), FORMATO-50 (los T3 son los peor colocados en el viento).
- **Situaciones AUSENTES sin nada parecido**: FORMATO-14, 18, 24, 28, 30, 39 (CRE), 40.
- **Bancos que faltan** para medir esta lente: banco de clásicas (ocho reales cargadas), `cre-30`, banco de convocatorias, y el banco de carrera pequeña con estado arrastrado (tactica.md §4).
