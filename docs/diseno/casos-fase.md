# Catálogo de situaciones de carrera — LENTE «FASE DE LA ETAPA» (prefijo FASE)

Lente: la etapa en línea recorrida de la salida a la meta, fase por fase. Otras lentes (equipo, general, sprint puro, crono, clima…) las cubren otros agentes; aquí se citan solo cuando la fase las dispara. Fuentes: los seis mapas del scratchpad (`mapa-requisitos-duenio.md`, `mapa-spec.md`, `mapa-simulate-decisiones.md` [D-01…D-51], `mapa-tactics.md`, `mapa-equipo-ordenes-final.md`, `mapa-entrenamiento-atributos.md`) y comprobaciones con Grep sobre `packages/engine/src` (anotadas como «Grep:»).

Convenciones de estado del motor: **CUBIERTO** / **PARCIAL** / **AUSENTE** / **CONTRARIO** (hace lo opuesto). «no consta en los mapas» = ni el mapa ni el Grep lo encuentran.

Escenarios de banco citados: `llana-180`, `media-190`, `reina-150`, `reina-150-s3`, `reina-real-s3`, `cri-40` (`sim/scenarios.ts`), más `smallTours`, `realQueens`, `calendarQueens`, `grandTour`, el banco del pavé (`race-flanders`/`race-roubaix`), y el «banco de carrera pequeña» que `docs/tactica.md` §4 pide y aún no existe.

---

## A. SALIDA Y PRIMEROS KILÓMETROS — la formación de la fuga

### [FASE-01] Salida neutralizada y el kilómetro 0 real

- **Cuándo**: desde la salida neutralizada (5-10 km a paso de coche) hasta la bandera. Toda etapa en línea.
- **Quién decide**: nadie táctico; el pelotón como colectivo (se rueda en bloque tras el coche). El motor decide la velocidad de arranque.
- **Lo que pasa en carretera**: en el neutralizado no se ataca; la carrera empieza al bajar la bandera. En el km 0 real el pelotón ya viene a 35-40 km/h y los primeros ataques salen en el primer kilómetro real, no antes. Variante: recorridos cuyo primer puerto empieza dentro del neutralizado (Col du Banchet, `classicRoutes.ts:284`) recortan la subida al arranque.
- **Lo que hace hoy el motor**: el perfil arranca en el km 0 real; `initialSpeed` 35 km/h «tras la salida neutralizada» (`group.ts:16`, `constants.ts:1303`). No hay tramo neutralizado modelado (Grep `neutrali`: solo comentarios). **CUBIERTO** en lo que importa (la carrera empieza en el km 0 real).
- **Lo que dijo el dueño**: — (ninguna cita sobre el neutralizado).
- **Información necesaria**: km de la bandera real (lo da el perfil). El motor la tiene.
- **Cómo se mediría**: velocidad media de los primeros 2 km del pelotón en `llana-180`: banda 35-42 km/h (arranque desde parado a ritmo de carrera; justificación: PCS marca 38-42 km/h en la primera hora de una llana).

### [FASE-02] Los primeros intentos: nadie ataca en el km 0, casi siempre alguien en los km 1-5

- **Cuándo**: km 0-10 de cualquier etapa en línea.
- **Quién decide**: corredores individuales (cazaetapas, libres, equipos sin baza); el pelotón como aduana.
- **Lo que pasa en carretera**: los ataques de salida empiezan en cuanto baja la bandera, pero no en los primeros 300 m: el pelotón coge ritmo, se estira, y a partir del km 1-2 salen las primeras ráfagas. En etapas con la fuga «cotizada» (montaña, media montaña) el primer intento sale antes y va más gente; en una llana pura sale un pequeño grupo de 3-6 en los primeros 5-10 km y se deja ir pronto.
- **Lo que hace hoy el motor**: `moveLambda` con `settle = clamp(kmRun/5)` (`tacticSettleKm` 5) sube λ desde 0 en el arranque; `tacticMinAttackKm` 1. Corridas que atacan antes del km 1: 69,5 % → 12 %. Se dejó deliberadamente que a veces ataquen «del disparo» («que las fugas salgan del disparo es verdad y no se toca»). **CUBIERTO**.
- **Lo que dijo el dueño**: «siempre se intenta una fuga en el primer km, lo cual está mal» (v33); «yo veo que en el 99 % de los casos en el km 1 ataca alguien, lo cual no tiene mucho sentido» (v39, comentario en `pelotonAllows`).
- **Información necesaria**: km recorrido, cohesión del grupo (`groupSize/fieldSize`), atractivo de la fuga hoy (`breakAppeal`). El motor lo tiene.
- **Cómo se mediría**: % de etapas con primer `attack_go` antes del km 1 en `llana-180` y `media-190`: banda 5-15 % (banda ya medida en v33: 12 %); km mediano del primer intento: 1,5-6 km.

### [FASE-03] La ráfaga de intentos hasta que cuaja la fuga del día

- **Cuándo**: primeros 20-60 km (llano); en montaña puede durar 80-100 km y romper el pelotón.
- **Quién decide**: los atacantes (rol, mentalidad, equipo sin baza); el pelotón como aduana (`pelotonAllows`) y como perseguidor (`tacticControlCommit`).
- **Lo que pasa en carretera**: la mayoría de intentos fracasa (regla 4); hay 3-10 intentos antes de que cuaje uno (regla 5); cada intento sube el ritmo del pelotón y lo estira; entre intentos hay un bache de 1-3 km. En una llana con equipos de sprinters mandando cuaja pronto (km 5-20) porque a todos les conviene; en una media montaña la lucha por la fuga puede durar una hora a 50 km/h y descolgar a los sprinters antes de la primera cota.
- **Lo que hace hoy el motor**: un solo intento por bloque desde el pelotón (D-23), enfriamiento `tacticAttemptCooldownKm` 4,5 km por grupo, tope `tacticMaxMoves` 3 movimientos vivos; mientras hay movimiento sin cuerda el pelotón cierra a `tacticControlCommit` 0,72 y la táctica se congela (`closingNow`, D-15); corona de fuga del día a 45 s (`tacticBreakGapSeconds`) dentro del 55 % del recorrido (D-26). **CUBIERTO** en la mecánica; **PARCIAL** en el desgaste: no hay «hora de carrera a 50 km/h que rompe el pelotón» porque el cierre a 0,72 es fijo y la criba en llano es 0 salvo viento (D-34).
- **Lo que dijo el dueño**: «Muchos intentos fracasan, sin más» / «Lo normal es que haya muchos intentos antes de que cuaje la fuga del día» (reglas 4 y 5, §13.1); «hubo una buena escapada tras varios intentos…» (v11).
- **Información necesaria**: cuántos intentos van, quién ya lo ha intentado (memoria de intentos del día: solo `lastAttemptKm` por grupo y `gastadoHastaKm` por corredor tras fuga larga), qué equipos ya tienen representante. El motor NO lleva «este ya lo ha intentado dos veces» salvo por cerillos.
- **Cómo se mediría**: nº de `attack_go` antes de `breakaway_formed` en `llana-180`: mediana 3-8; km de formación: mediana 10-40 km en llana, 20-70 km en `media-190`. Justificación: crónicas PCS de llanas de gran vuelta (fuga formada km 5-30) y medias (km 30-80).

### [FASE-04] Quién va a la fuga: composición y cupo por equipo

- **Cuándo**: al formarse la fuga del día.
- **Quién decide**: cada corredor (apetito), cada equipo (mandar a uno), el pelotón (dejar ir a ESA composición).
- **Lo que pasa en carretera**: va el cazaetapas designado de los equipos sin baza, uno por equipo (raramente dos; nunca seis); no van los sprinters ni los favoritos de la general; en montaña van escaladores «de segunda fila» de equipos sin líder; en una llana van rodadores. Si un equipo mete dos, uno se guarda (no tira) para el final. Variante: equipo débil sin ninguna baza manda al mejor rodador; equipo del maillot no manda a nadie (o manda uno «de vigilancia» en fugas de montaña numerosas).
- **Lo que hace hoy el motor**: `attackAppetite` = rol × mentalidad × `teamAttack` (escalar: `nada`→1,4, `fuga`→0,4…) × frescura; veto SPR ≥ 70 en `fuga`/`contraataque`; `followProbability` sin `teamId` (mapa-tactics §10: dos compañeros pueden ir en el mismo movimiento sin que nada lo frene salvo el `teamAttack` común que baja a 0,4 SOLO al recalcular la postura cada 10 bloques, no en el mismo bloque). `autoOrders` da UN `cazaetapas` por equipo. **PARCIAL**: el cupo emerge de los roles, no de una regla; los seis del mismo equipo en una fuga de nueve (tactica.md §1) siguen siendo posibles.
- **Lo que dijo el dueño**: los seis casos de tactica.md §1 («seis del mismo equipo en la fuga de nueve»); «Nadie renuncia a su velocista porque su noveno hombre esté en la escapada» (v38, `manUpTheRoad`).
- **Información necesaria**: quién de mi equipo ya va en el movimiento (compañeros en el grupo que ataca / en el que se forma), qué equipos están representados, quién es la carta de mi equipo. El motor lo sabe fuera de `tactics.ts` (`teamOf`, `inMove`) pero `MoveRider` no lo recibe.
- **Cómo se mediría**: máximo de corredores de un mismo equipo en la fuga del día, banco de carrera pequeña (22 equipos × 8): P95 ≤ 2; % de fugas con ≥ 3 del mismo equipo ≤ 3 %. Justificación: en fugas de 5-10 en WT es rarísimo ver tres del mismo equipo salvo en «fugas bidón» de 30+.

### [FASE-05] La aduana: el pelotón deja ir ESTA fuga o no («esta fuga no me vale»)

- **Cuándo**: en cada intento que abre hueco, primeros 20-60 km.
- **Quién decide**: el pelotón como agregado de equipos con motivo (sprinters, maillot, general).
- **Lo que pasa en carretera**: el pelotón deja ir una fuga si (a) no lleva a nadie peligroso para la general, (b) no es demasiado numerosa para la fuerza de los que tendrán que cazar, (c) los equipos con baza están representados o no les importa, (d) no lleva al mejor sprinter de un equipo rival. Si le falta un representante, un equipo con hombre fresco salta o tira dos km hasta que la fuga «se completa» y entonces se sientan todos. Variante general apretada: el equipo del maillot cierra cualquier fuga con un top-15.
- **Lo que hace hoy el motor**: `pelotonAllows(party, ctx)`: p = 0,3 + 0,5·run × rampa de arranque − 0,05·(1−breakAppeal)·(size−3) × penalización por proximidad en la general (`closest/420`) + VETO si lleva al maillot (`carriesGcLeader`). **No mira qué equipos van** ni si el sprinter de un rival va dentro ni la fuerza de la caza. La aduana es un dado, no un voto por equipo. Además un movimiento SIN cuerda puede prosperar igual (`allowed || dayBreak`, deuda mapa-tactics §11.2). **PARCIAL** (funciona como filtro estadístico; no como decisión colectiva con motivos).
- **Lo que dijo el dueño**: «si la fuga está a 2 minutos y no hay nadie peligroso, no tiras; si está a 20 minutos, sí que tiras, ¡a muerte!» (v38, `isThreatened`); «Muchos intentos fracasan, sin más» (regla 4). tactica.md A2 (una línea) y mapa-spec §9.5: «lo que falta es decir cómo cada equipo vota (“esta fuga no me vale”) y cómo se agrega».
- **Información necesaria**: composición por equipo del movimiento, mejor sprinter/GC dentro, fuerza disponible de la caza (`chaseStrength`), km restantes, `breakAppeal`. Todo existe en `simulate.ts`; nada llega a `pelotonAllows`.
- **Cómo se mediría**: % de fugas del día en `llana-180` con el sprinter de un equipo con tren dentro: ≤ 2 % (banda propuesta; en la realidad un tren no deja ir al rival directo). % de fugas coronadas SIN cuerda (`allowed=false ∧ dayBreak`): ≤ 10 % (hoy 17 de 17 de un caso medido se colaban).

### [FASE-06] El pelotón que «se despista»: la fuga se va a 15-20 minutos

- **Cuándo**: etapa de transición de gran vuelta; equipos de sprinters con hombre delante; día después de la reina; sin equipo del maillot amenazado.
- **Quién decide**: los equipos con baza (deciden NO tirar), el equipo del maillot (decide cuánto conceder).
- **Lo que pasa en carretera**: nadie asume la caza; la fuga se va a 10-20 min; a 60 km el maillot pone dos hombres para que no pase de X min (donde X no compromete la general); la etapa la gana la fuga por minutos. Variante: fuga con un corredor a 8 min de la general que se hace virtualmente líder → el equipo del maillot tira «a muerte» desde lejos (FASE-08).
- **Lo que hace hoy el motor**: el equipo con su CARTA en la fuga del día no tira (`manUpTheRoad`, D-10/D-12); `intentFor('general')` sin amenaza → `nada`; `maillot` → `controlar`; humor del pelotón (`pelotonMoodSpread`); techo `flatMoveWorstMarginS` 900 s. **CUBIERTO** (la fuga que más gana en llano pasó de 0 a 593 s).
- **Lo que dijo el dueño**: «Especialmente si los equipos de los sprinters tienen a alguien metido en la fuga y entonces no van a tirar, y la escapada se va a 15 o 20 minutos» (v38); «puede ocurrir y ocurre a veces, que el pelotón se despista, deja hacer a una escapada… pueden perfectamente llegar con 8 o incluso 15 minutos; ya ha pasado en grandes vueltas» (v38); «lo que NO se relaja es que alguna fuga tenga que ganar alguna llana».
- **Información necesaria**: qué equipos tienen carta en la fuga, general virtual del mejor fugado, día de la vuelta (ayer fue la reina: no existe), km restantes. El motor tiene lo primero y lo segundo; no arrastra nada del día anterior.
- **Cómo se mediría**: `smallTours.flatMoveWorstMarginS` 0-900 s (**banda del dueño**); `flat.breakawayWinPct` 5-16 % (**banda del dueño**).

### [FASE-07] La fuga numerosa de montaña / media montaña («escapada bidón»)

- **Cuándo**: etapas de media montaña y montaña sin final en alto, o con general decidida; km 0-80.
- **Quién decide**: corredores (todo el que puede salta), equipos de la general (dejan ir si no hay peligro), pelotón.
- **Lo que pasa en carretera**: van 20-50 corredores; los equipos de la general dejan que se vaya lejos (10+ min); dentro se ataca desde el penúltimo puerto; el pelotón rueda a tempo bajo todo el día y llega a 15-20 min. En una llana, en cambio, van 3-6.
- **Lo que hace hoy el motor**: `breakAppeal` (fracción de km en subida + final en alto) eleva el umbral de dilución `bigGroupThreshold·(1+9·appeal)` → en montaña «salta todo el que puede»; `pelotonAllows` deja de penalizar el tamaño con `breakAppeal` alto. **CUBIERTO** en tamaño; **PARCIAL** en lo que pasa dentro después (FASE-33) y en que `breakAppeal` es propiedad del DÍA, no de la situación (una media montaña con general decidida y otra con general a 10 s tienen el mismo appeal).
- **Lo que dijo el dueño**: foto pedida para la media montaña: «un grupo grande, algunos por detrás en grupos, y por delante uno o dos» (v38-2 §16); «recalibremos la capa táctica para que la fuga en una etapa de montaña gane en más casos» (v43); «está bien así» (18,1 %, v44).
- **Información necesaria**: colchón de la general, día de la vuelta, si hay final en alto (sí), quién de la general va en el grupo. Parcialmente.
- **Cómo se mediría**: tamaño mediano de la fuga del día en `media-190`: 8-25; en `reina-150`: 6-20 (Tour 2025 e12: 52; Vuelta 2025 e12: 53; «en LLANO, cuatro», comentario de `breakAppeal`). `calendarQueens` fuga gana 6-30 % (**banda del dueño**, vigilancia).

### [FASE-08] Un hombre de la general se cuela en la fuga (maillot, top-5, o el «lejano» que se hace líder virtual)

- **Cuándo**: cualquier fase de formación; también en contraataques a mitad de etapa.
- **Quién decide**: el corredor de la general (no debería ir), su equipo, el equipo del maillot (persigue).
- **Lo que pasa en carretera**: el maillot no va NUNCA a la fuga del día; un top-5 tampoco (le cerrarían al instante); un corredor a 8-15 min sí puede ir y el equipo del maillot calcula la general virtual: si le vale, tira hasta dejarle a X; si no, le deja. Variante etapa 1 / carrera de un día: no hay general, todos son «el líder» → sin veto. Variante general apretada (< 1 min entre 1.º y 5.º): el equipo del maillot cierra cualquier fuga con top-20.
- **Lo que hace hoy el motor**: veto al maillot en `pelotonAllows` y en la corona (`carriesGcLeader`); rampa por proximidad `closest/420` (`tacticAllowGcPenalty` 0,75); `isThreatened` compara general VIRTUAL (`frontThreatDeficit − gapSeconds`) con la de nuestro hombre (D-10); `gcLeash()` = min(700, 0,6·peor déficit de la cabeza) en llano. `hasGcContext` = false en etapa 1. **CUBIERTO** para el maillot; **PARCIAL** para el resto: la amenaza mira al MEJOR clasificado de la fuga, no lo que la fuga le cuesta a MI hombre (tactica.md C1) y `followProbability` lee la general como SÍ/NO (v32 §6).
- **Lo que dijo el dueño**: «Race Sardegna e2, 136 km llanos. El maillot amarillo —un escalador— en la fuga del día» (v32, parte de producción); «los amenazados en la general tienen veto de facto» (SPEC 6.10).
- **Información necesaria**: general de cada uno de la fuga, general de MI líder, general virtual, km restantes. El motor tiene la general de todos; solo la usa por «el mejor de la cabeza».
- **Cómo se mediría**: maillot en la fuga del día: 0 en 800 etapas (ya medido). Nueva: % de etapas de `grandTour` en que un top-10 entra en la fuga del día: ≤ 3 % (en un Tour real ocurre 0-2 veces en 21 etapas).

### [FASE-09] La fuga cazada pronto y la «segunda fuga del día»

- **Cuándo**: la fuga del día se caza antes del 50 % (viento, pelotón nervioso, fuga que se rompe sola) o no cuaja ninguna hasta muy tarde.
- **Quién decide**: los que no fueron en la primera (frescos), el pelotón (cansado de cerrar, deja ir la segunda).
- **Lo que pasa en carretera**: tras cazar pronto, el pelotón levanta el pie 2-3 km y sale la SEGUNDA fuga del día con gente nueva, que suele ser la que llega. Si la etapa va compacta hasta el km 100+, se rueda a tempo y la fuga que sale entonces es corta y ambiciosa (grupo de 10-15 fuertes).
- **Lo que hace hoy el motor**: `dayBreakFormed` se pone a `true` UNA vez y nunca se resetea (Grep `dayBreakFormed`: `simulate.ts:1301, 5611`); tras cazar la fuga del día el `kind` desde el pelotón pasa a `contraataque` (λ 0,02/km, `KIND_FOLLOW` 0,7) o `puente`, nunca a `fuga` (λ 1,2/km). La corona de fuga del día se cierra al 55 % del recorrido (`tacticBreakWindowFraction`). No hay noción de «segunda fuga del día» ni de tregua tras la captura. **PARCIAL / CONTRARIO** en λ: tras una captura temprana el pelotón real hierve y el motor casi se apaga (0,02 vs 1,2).
- **Lo que dijo el dueño**: — (mapa-spec §9.1 lo lista como situación ausente: «la fuga cazada y qué pasa después (contraataques, la segunda fuga)»).
- **Información necesaria**: km de la captura, km restantes, quién estuvo delante (gastado), quién está fresco, equipos aún sin representante. El motor tiene `gastadoHastaKm` y km; no tiene la noción.
- **Cómo se mediría**: en `llana-180` y `media-190`, cuando la fuga del día se caza antes del 50 %: % de etapas con un nuevo movimiento que prospera antes de 15 km: banda 40-70 % (en la realidad la segunda fuga es casi sistemática tras captura temprana).

---

## B. EL MEDIO DE LA ETAPA — control, ritmo, humor, avituallamiento

### [FASE-10] El control del boquete: a qué distancia se estabiliza y quién lo lleva

- **Cuándo**: desde que cuaja la fuga hasta el inicio de la caza (km 30-120).
- **Quién decide**: el equipo dueño del frente (sprinters con carta, maillot), con sus gregarios.
- **Lo que pasa en carretera**: el equipo del maillot o de los sprinters deja crecer el boquete hasta 3-6 min, luego pone dos hombres a tempo para que no crezca más; regla del pulgar: «1 minuto por cada 10 km que quedan» al empezar la caza real. Con dueño único los otros equipos se esconden. Variante: dos equipos con carta se reparten (uno pone 2, otro pone 2). Variante equipo débil (sin tren): deja la fuga a 8-10 min y espera al sprint no llegar.
- **Lo que hace hoy el motor**: `intentFor('etapa')`: `controlar` si `gap < 25 s` o `gap < teamChaseSecondsPerKm 1,5 × kmToGo`, si no `perseguir` («NO SE CAZA DESDE EL KILÓMETRO VEINTE»); `frontTeamId` único con histéresis (D-11); lazo cerrado `chaseHoldCommit 0,62 + 0,016·err` contra `leash = 300·(1+0,6·(1−force))` (D-16); sin dueño, `relayTeamsNoOwner` 3 a `noOwnerCommitFactor` 0,94. **CUBIERTO**.
- **Lo que dijo el dueño**: «pon también foco en revisar la lógica de quién tira de cada grupo… rehaz ese bloque entero, wey» (v38-2); «¿y si no hay fuga también? ¿y si la fuga está cerca también?» (v38-2); «si el frente no tiene dueño único, debería haber 1, 2 o 3 equipos que tiren, pero con menor intensidad» (v35); «un equipo que lleva 80 km tirando no puede seguir a tope» (v15).
- **Información necesaria**: boquete, km restantes, fuerza de mis hombres (presupuesto), quién más tiene motivo. El motor lo tiene.
- **Cómo se mediría**: `chronicle.frontTeamsPerStage` 1,8-4; boquete máximo mediano de la fuga del día en `llana-180`: 2-6 min (PCS llanas de gran vuelta: 2-5 min típico); `flat.catchKmToFinish` 8-25 km (banda existente).

### [FASE-11] El pelotón sin prisa: «echar la hueva», el día tranquilo

- **Cuándo**: etapa de transición; fuga sin peligro; después de la reina; calor; etapa larguísima; última semana.
- **Quién decide**: el pelotón como colectivo (los equipos con motivo deciden gastar poco); el equipo del maillot marca el ritmo mínimo.
- **Lo que pasa en carretera**: tempo bajo (36-38 km/h), charlas, paradas técnicas colectivas, la fuga crece; la caza se hace tarde y justa (o no se hace). El humor no es un dado del día: depende de lo que pasó ayer, del calor, de la etapa que viene mañana y de si alguien tiene interés en ir rápido.
- **Lo que hace hoy el motor**: `humorDelPeloton` = UN dado por etapa (`pelotonMoodCentre` 0,9, `Spread` 0,14) aplicado a lo que el pelotón DECIDE (no a suelos ni al puerto decisivo, D-18); dosificación `pacingMin` 0,7 según demanda del recorrido; medido 43 % de etapas «sin prisa». **CUBIERTO** como fenómeno; **PARCIAL** como causa (dado sin memoria ni motivo; no sabe que ayer fue la reina ni que hace 38 °C —el calor existe en clima pero solo como coste, no como humor—).
- **Lo que dijo el dueño**: «También la probabilidad de que el pelotón eche la hueva y vaya lento» (v38); «muchas veces el pelotón debería tener flojera y dejar hacer» (comentario 968-969); «probablemente dándole más hueva al pelotón, es decir, que en general no estén tan motivados en gastar fuerzas tirando» (983-984).
- **Información necesaria**: etapa de ayer/mañana (no existe: nada se arrastra), calor (existe), interés de cada equipo (existe), km restantes. Falta la memoria entre etapas.
- **Cómo se mediría**: % de etapas llanas de `grandTour` con velocidad media < 39 km/h: 20-45 % (43 % medido sin prisa; PCS: ~30 % de llanas de gran vuelta bajan de 40 km/h). Correlación con «ayer reina» cuando exista memoria: velocidad media el día después de la reina − media del resto ≤ −1 km/h.

### [FASE-12] Dosificación en la clásica larga y en la etapa de 220+ km

- **Cuándo**: recorridos con demanda alta (`demandaDelDia` > 75 unidades): Sanremo, Lombardía, Flandes, etapas de 230 km.
- **Quién decide**: cada corredor (y el pelotón como suma).
- **Lo que pasa en carretera**: las primeras 4 horas se corren a tempo bajo, la carrera empieza a 80 km de meta; los favoritos no gastan una cerilla antes del km 150; la fuga del día se va a 10 min y se caza justo.
- **Lo que hace hoy el motor**: `pacingReferenceDemand` 75, `pacingSlope` 1, `pacingMin` 0,7 sobre el compromiso decidido (no en cuestas si `demandaDelDia < climbEaseDemand 95`) (D-18). **CUBIERTO**.
- **Lo que dijo el dueño**: «tal vez en una clásica superlarga tengan que dosificar esfuerzos mejor y entonces no salir tan a muerte para no saturarse» (v39 §3).
- **Información necesaria**: demanda total del recorrido (la tiene). Lo que no tiene: la dosificación individual del favorito (guardar cerillos hasta el km X) — los cerillos solo se protegen por `reservon`.
- **Cómo se mediría**: `erosion.longClassicFresh` 0,45-0,8 y `hardestClassicFresh` (bandas existentes); pájaras Lombardía ≤ 12 % (banda provisional v33).

### [FASE-13] Avituallamiento, zona de bidones y paradas técnicas

- **Cuándo**: 1-2 zonas de avituallamiento por etapa (km 60-130); parada técnica colectiva en la primera hora tranquila.
- **Quién decide**: el pelotón como colectivo (tregua no escrita: no se ataca en el avituallamiento ni cuando el maillot para); el gregario (baja al coche a por bidones y vuelve).
- **Lo que pasa en carretera**: en el avituallamiento el ritmo baja 2-3 km, nadie ataca (atacar ahí es de mala educación y se castiga); los gregarios van al coche y tienen que remontar (coste); en calor hay bidones extra y más viajes al coche. Si un equipo ataca en el avituallamiento, el pelotón reacciona con rabia.
- **Lo que hace hoy el motor**: no consta en los mapas; Grep `avituall|bidón|feed zone` en `engine/src`: solo dos comentarios (`constants.ts:3165, 3839`). **AUSENTE**. El calor existe como coste (`heatCostScale` 0,08), no como bidones ni viajes al coche.
- **Lo que dijo el dueño**: —.
- **Información necesaria**: km de los avituallamientos (no está en el perfil), qué gregarios bajan (no hay posición dentro del grupo), calor (existe).
- **Cómo se mediría**: si se modela: 0 ataques que nazcan en la ventana de avituallamiento (±1 km) en el 95 % de las etapas; coste extra de los gregarios «de bidones» ≤ 2 % de depósito por viaje (justificación: 30-60 s de esfuerzo para remontar el pelotón).

### [FASE-14] Relevos dentro de la fuga a mitad de etapa: quién se escaquea y por qué

- **Cuándo**: fuga del día consolidada, km 40-150.
- **Quién decide**: cada fugado (para sí o para su equipo).
- **Lo que pasa en carretera**: relevan todos mientras la fuga tiene que vivir; se escaquea el que tiene al equipo persiguiendo detrás, el sprinter que espera el remate, el que va vacío, el que sabe que en el final llegará el súper escalador; si uno se escaquea sin motivo aparente, los demás bajan el ritmo para que no se la lleve gratis (o le echan de la fuga con relevos secos). Dos del mismo equipo: uno se guarda.
- **Lo que hace hoy el motor**: `relayTurn` en fuga: listón 0, `sittingOn` (su equipo lleva el frente del pelotón: `relaySittingOnPenalty` 2; su jefe está en apuros; grupo de caza con compañero delante), `relayNoChanceWeight`, `relayRaceLeaderPenalty` al `gcRank 1`; cooperación remedida cada 2 km con `interésPropio` y contagio (D-27). **CUBIERTO** en lo individual; **AUSENTE** en «dos del mismo equipo se coordinan» (mapa-tactics §6: la noción de equipo dentro de la fuga es solo negativa).
- **Lo que dijo el dueño**: «el escapado de ese equipo no debería entrar a los relevos… así además llega más fresco al final» (v33); «si es una etapa de montaña y en la fuga van con un súper escalador y tú eres mal escalador, lo normal es que no cooperes» (v39 §1); «si hay 1 wey que no pasa a cooperar en la escapada, los otros quizás quieran desgastarse menos… para que ese wey que va ahí sin gastar energía se la lleve» (comentario 4787-4790); «lo de quién tira de cada grupo habría que irlo midiendo a menudo… quizás cada km».
- **Información necesaria**: quién de mi equipo va aquí, quién tira detrás, quién remata mejor aquí, cuánto me queda. Falta «compañero en el grupo» en la decisión de relevo (existe `idSet.has(helper)` solo para arropo).
- **Cómo se mediría**: fugado cuyo equipo lleva el frente del pelotón y aun así releva: ≤ 15 % de las fotos (13-19 % medido en v33); con dos del mismo equipo en una fuga de 5-8: el peor rematador de los dos releva ≥ 1,5× lo que el mejor (banda propuesta; hoy no se mide).

### [FASE-15] Cambio de manos del frente y la alianza a mitad de etapa

- **Cuándo**: km 60-150; el equipo que controlaba se ha gastado o la fuga crece más de lo previsto.
- **Quién decide**: los equipos con motivo (etapa/maillot/general).
- **Lo que pasa en carretera**: el equipo del maillot pide ayuda a los sprinters («os la dejamos a 4 min, ahora vosotros»); si nadie coge el relevo la fuga se va (FASE-06); dos o tres equipos ponen un hombre cada uno con menor intensidad; el que ya ha tirado 80 km no vuelve al frente.
- **Lo que hace hoy el motor**: `frontTeamId` con relevo por (claim, gasto, quality) e histéresis `teamFrontHandoverSpent` 0,35 / `Edge` 0,2 (D-11); presupuesto `teamBudgetPerRider` 9 que se agota (`teamDriveTired`); sin dueño → hasta 3 equipos a 0,94. **CUBIERTO**. No hay «negociación» ni memoria de «ya tiré ayer».
- **Lo que dijo el dueño**: «un equipo que lleva 80 km tirando no puede seguir a tope» (v15); «no tiene sentido que si 3 equipos colaboraron, solo 1 de cada aparezca» (v28); «PULLING (8)» de cinco equipos distintos → no (v35).
- **Información necesaria**: gasto de cada equipo, motivo de cada equipo, boquete. Lo tiene.
- **Cómo se mediría**: `chronicle.frontTeamsPerStage` 1,8-4 (banda existente); equipos pagando viento a la vez: ≤ 3 (medido v35).

### [FASE-16] La caza que llega tarde y la claudicación («dan la etapa por perdida»)

- **Cuándo**: últimos 40-15 km; boquete > lo que se puede cerrar (cierre necesario > 3 s/km con equipos fundidos).
- **Quién decide**: los equipos de sprinters (deciden rendirse o apretar); el maillot (si no hay peligro, no ayuda).
- **Lo que pasa en carretera**: a 30 km con 3 min y trenes gastados los sprinters se sientan y la etapa la gana la fuga por 5-60 s (el término medio realista) o por minutos si se rinden antes; si aprietan y llegan a 10 s en los últimos 2 km, la fuga puede aguantar por el desorden del sprint («caza fallida por un segundo»). Un equipo NO se rinde si tiene el mejor sprinter y le faltan pocos segundos.
- **Lo que hace hoy el motor**: claudicación `conceded` solo si `front.dayBreak ∧ gap ≥ 10 s ∧ cierreNecesario > gear.feasible` → `sprinters_give_up` (D-16); 88 % de fugas que ganan llanas entran entre 5 y 60 s (v23). **CUBIERTO**.
- **Lo que dijo el dueño**: «lo que FALTA es el término medio realista» (fugas que ganan por 5-60 s, v23); «en etapas llanas nunca gana una fuga casual» (v23).
- **Información necesaria**: boquete, km, fuerza disponible, quién de la fuga remata (si la fuga lleva un buen sprinter, cazar «casi» no vale). Lo tiene salvo el remate de la fuga.
- **Cómo se mediría**: margen de la fuga ganadora en llano: 80-95 % entre 5 y 60 s; `flat.catchKmToFinish` 8-25 km (banda existente).

### [FASE-17] Caída o incidente a mitad de etapa y la tregua del pelotón

- **Cuándo**: caída masiva, caída del maillot, avería del maillot, paso a nivel, tramo neutralizado por el jurado.
- **Quién decide**: el pelotón (el equipo del maillot y los rivales «de buena fe»), el equipo del caído (rescate).
- **Lo que pasa en carretera**: si cae el maillot o un top-5 lejos de meta, el pelotón levanta el pie (regla no escrita) 5-10 km hasta que vuelve, y su equipo baja a por él; si cae en el desenlace (últimos 30 km) no se espera. Si cae un corredor cualquiera, su equipo manda 1-2 gregarios; el pelotón sigue. Si el que cae es el rival directo, hay equipos que aprovechan (y se les critica).
- **Lo que hace hoy el motor**: caídas con montón (`crashPile`), rescate del jefe D-13 (por la general: todos menos uno; por la etapa: percance + favorito + ≤ 60 s), «el maillot no baja a por nadie». **No hay tregua del pelotón** (el compromiso no baja por una caída del maillot); no hay pinchazo ni avería. **PARCIAL** (rescate sí; tregua AUSENTE; pinchazo AUSENTE).
- **Lo que dijo el dueño**: «¿está implementado que si el líder del equipo se cae, se descuelgue parte de su equipo para ayudarle?» (v36); «por la etapa yo creo que nadie debería bajarse… salvo que sea un pinchazo/caída y la distancia sea pequeña, y sea gran favorito» (v37); «normalmente cuando se cae alguien en el pelotón casi siempre se caen varios» (comentario 5385).
- **Información necesaria**: quién ha caído (maillot/top-5 sí lo sabe), km restantes, si vuelve o no (velocidad de su grupo). Tiene todo menos la regla.
- **Cómo se mediría**: cuando el maillot cae a > 40 km de meta y queda a ≤ 90 s: % de veces que reengancha: 80-95 % (con tregua); a < 30 km: 20-40 % (sin tregua). Banda propuesta a partir de la costumbre («no se ataca al maillot caído» salvo en el desenlace).

### [FASE-18] El corredor «a media etapa» que se descuelga por sí mismo y su reenganche

- **Cuándo**: mitad de etapa, tras una cota de tempo, un abanico o un tirón; el pelotón sin prisa.
- **Quién decide**: el descolgado (pelear o dejarse ir), su equipo (esperarle o no), el pelotón (ritmo).
- **Lo que pasa en carretera**: con el pelotón a tempo el descolgado vuelve la mitad de las veces; con el pelotón apretando no vuelve nunca y la diferencia crece y crece; un grupo de 4-8 vuelve más que uno solo; el sprinter descolgado en una cota de tempo recibe a 2-3 compañeros que le devuelven.
- **Lo que hace hoy el motor**: `droppedCommit` (física), puerta `rejoinGapSeconds` 22 s que pide estar VOLVIENDO, `shedChaseEdge`, `shedFightFreshness` (último tercio del depósito). Grupo 4-8 con pelotón sin prisa: 60 %; apretando 6 %; con prisa 2 % (v35). Rescate solo del `leaderId` del plan (no del sprinter si el jefe del plan es él… sí, si `bunchFinish` el sprinter es el `leaderId`). **CUBIERTO**.
- **Lo que dijo el dueño**: «es muy fácil reengancharse… lo normal debería ser que la diferencia siga y siga aumentando» (v35); «un grupo de 5 creo razonable que vuelva la mitad de las veces» (v35).
- **Información necesaria**: ritmo del pelotón (compromiso), tamaño, frescura, si el jefe está entre ellos. Lo tiene.
- **Cómo se mediría**: bandas de v35 (60 % / 6 % / 2 %), **bandas del dueño** (la mitad con el pelotón tranquilo).

---

## C. EL SPRINT INTERMEDIO Y EL PASO POR LA CIMA (KOM) — objetivos que cambian el ritmo

### [FASE-19] La meta volante: la fuga se la juega, el pelotón acelera por el maillot de puntos

- **Cuándo**: banner `meta_volante`, km 50-150.
- **Quién decide**: los fugados con `contestSprints`; en el pelotón, el equipo del maillot de puntos (acelera 3-5 km antes para que su sprinter puntúe) y sus rivales.
- **Lo que pasa en carretera**: en la fuga hay un mini-sprint (o se lo regalan al que más lo necesita); en el pelotón, si la clasificación por puntos está en juego, los trenes lanzan un sprint a 60 km/h por los puntos restantes y luego el pelotón se «apaga» 5 km (bache que a menudo la fuga aprovecha para ganar un minuto). En vueltas con bonificaciones intermedias, los hombres de la general también se disputan los 3-2-1 s.
- **Lo que hace hoy el motor**: `disputeBanner` SOLO en el grupo de cabeza (`front`) (D-25, `simulate.ts:5809-5815`), filtra `contestSprints` (si nadie lo tiene, disputan todos), cobra `bannerCost`; puntúa `eff.SPR` erosionado. El pelotón NO acelera ni disputa; no hay maillot de puntos como motivo de equipo (`TeamPurpose` solo etapa/maillot/general); no hay bonificaciones intermedias (Grep: `timeBonuses` solo en meta, `simulate.ts:6496`). **PARCIAL** (fuga sí; pelotón AUSENTE; bonis intermedias AUSENTE).
- **Lo que dijo el dueño**: — (mapa-spec §9.1 anota «las bonificaciones como objetivo; las clasificaciones secundarias (montaña, puntos, joven) como motivo de equipo — hoy solo hay tres motivos»).
- **Información necesaria**: clasificación por puntos (el motor no la recibe: `StageRider` solo lleva `gcDeficitSeconds`, `gcRank`), km al banner, quién de mi equipo la pelea. Falta la clasificación secundaria.
- **Cómo se mediría**: en `grandTour`, velocidad del pelotón en los 3 km previos a la volante cuando el 1.º y 2.º de la regularidad van en el pelotón y están a ≤ 40 pts: +6 a +12 km/h sobre el tempo (banda propuesta: 38 → 48 km/h típico); boquete de la fuga en los 5 km siguientes: crece ≥ 20 s el 50-70 % de las veces.

### [FASE-20] La cima puntuable (KOM): el escalador de la fuga ataca antes de coronar

- **Cuándo**: banner `cima`, en la fuga (mitad de etapa) o en el pelotón (puertos de tempo).
- **Quién decide**: los escaladores de la fuga que pelean la montaña; el equipo del maillot de la montaña.
- **Lo que pasa en carretera**: el que quiere los puntos ataca a 500 m-1 km de la cima y corona solo, luego espera al grupo en el descenso; si es el maillot de la montaña el resto le deja; en un puerto de tempo del pelotón nadie disputa la cima salvo el hombre del maillot de la montaña que sale del pelotón a 300 m. Una cima de categoría especial a mitad de etapa puede mover a un fugado a irse solo definitivamente.
- **Lo que hace hoy el motor**: `disputeClimb` ordena por grupos y dentro del grupo por `max(MON, COL)` erosionado, cobra `bannerCost` a los que puntúan, **ignora `contestClimbs`** (`simulate.ts:6097-6130`; mapa-equipo §8.14); `komLead` solo para la crónica («líder de la montaña»). No hay ataque antes de la cima ni espera después. **PARCIAL** (puntos sí; conducta AUSENTE).
- **Lo que dijo el dueño**: — (solo la queja narrativa de que el líder «se proclamaba líder otra vez en cada cima»).
- **Información necesaria**: clasificación de la montaña (no llega al motor), km a la cima, mi perfil vs el del grupo. Falta la clasificación.
- **Cómo se mediría**: % de cimas de 1.ª/HC coronadas por un corredor solo (≥ 5 s) desde una fuga de ≥ 4 con `contestClimbs`: 30-50 % (banda propuesta: en fugas de montaña el KOM se pelea con ataque la mayoría de las veces cuando hay maillot en juego).

### [FASE-21] Las bonificaciones en meta y la general apretada en llano

- **Cuándo**: llegadas agrupadas en vueltas cortas sin terreno selectivo; últimos km.
- **Quién decide**: los hombres de la general (disputar el sprint por 10-6-4 s o no arriesgar).
- **Lo que pasa en carretera**: en una vuelta de 5 días llanas la general se decide por bonis: los líderes se meten en el sprint (y arriesgan caída) o dejan que los sprinters se lo lleven; el equipo del maillot lanza a su líder a la boni si el sprinter rival no llega.
- **Lo que hace hoy el motor**: `timeBonuses` en meta (`simulate.ts:6496`); modelo de final por tipo (v7-v10) para que un sprinter de 4★ no gane la general «0/30 generales» en Sharjah; `finishRoleWeight` lider 1,0. No hay decisión «me meto en el sprint por la boni». **PARCIAL**.
- **Lo que dijo el dueño**: «un corredor con 4 estrellas en sprint y 1-2 en todo lo demás ganó 4 de las 5 etapas de Race Sharjah y la general» (v7); «La general de una carrera sin terreno selectivo se sigue decidiendo por bonificaciones» (anotación v7-v10).
- **Información necesaria**: colchón en la general, quién puede quitarme la boni, riesgo. Tiene la general; no la decisión.
- **Cómo se mediría**: `smallTours` (Sharjah/Arabia): general ganada por el mejor sprinter puro ≤ 20 % (0/30 medido en v10); top-10 de la general presente en el top-5 de un sprint masivo: 5-20 % (banda propuesta).

---

## D. LA APROXIMACIÓN — posicionamiento antes del obstáculo

### [FASE-22] Aproximación a un puerto: la pelea por entrar delante y el pie del puerto

- **Cuándo**: 5-10 km antes del pie del puerto decisivo (o de cualquier puerto de 1.ª/HC); también antes del penúltimo.
- **Quién decide**: los equipos de los favoritos (ponen el tren al pie), los sprinters (se ponen delante para perder menos), el pelotón.
- **Lo que pasa en carretera**: la velocidad sube 5-10 km/h antes del pie; los equipos de la general se colocan en cabeza con 3-4 hombres cada uno; los que van atrás pierden 20-30 s en la primera rampa por el acordeón; el tren del favorito arranca el puerto a bloque y el pelotón se parte en el primer km. En un puerto de tempo a mitad de etapa la aproximación es tranquila.
- **Lo que hace hoy el motor**: `freeRunTarget` cambia SOLO al entrar en el bloque de subida (`onClimb`): `climbRaceCommit` 0,85 o `climbTempoCommit` 0,7; en llano previo `pelotonTempoCommit` 0,55 (D-14, código `simulate.ts:2680-2686`). No hay posición dentro del grupo (D-22 «el motor no tiene posiciones»), ni colocación salvo en abanico (D-48) y en la meta (`placementSd`). No hay acordeón. **AUSENTE**.
- **Lo que dijo el dueño**: «Un final en alto no es el equipo del favorito tirando hasta reventar a todos» (regla 9) — habla del puerto, no de la aproximación. Sobre viento: «aunque eso implicará también definir las colocaciones» (v41).
- **Información necesaria**: km al pie del próximo puerto y su dureza (calculable como `kmToNextPaves`; no existe para subidas), quién es favorito hoy, gregarios disponibles. Falta la posición.
- **Cómo se mediría**: velocidad media del pelotón en los 5 km previos al último puerto de `reina-150` vs los 5 km anteriores a esos: +4 a +10 km/h; corredores del pelotón que pierden ≥ 15 s en el primer km del puerto sin ser descolgados (acordeón): 10-30 % del grupo (banda propuesta).

### [FASE-23] Aproximación a un sector de pavés

- **Cuándo**: 2-5 km antes de cada sector (Flandes, Roubaix, etapa de adoquín de gran vuelta).
- **Quién decide**: todos los equipos con carta (ponen a su hombre en las 10 primeras posiciones), el pelotón (velocidad).
- **Lo que pasa en carretera**: la velocidad sube a 55-60 km/h en los 3 km previos; se pelea codo con codo; hay caídas por nervios; el que entra en la posición 60 pierde el sector. Los favoritos van con 2-3 gregarios que les llevan delante. En un sector a 150 km de meta se entra rápido pero sin romper; en los cinco últimos, a bloque.
- **Lo que hace hoy el motor**: `kmToNextPaves` y `pavesApproachKm` 2 km → suelo de compromiso `pavesRaceCommit` 0,8 en la aproximación y en el sector (D-19, `simulate.ts:2832`); criba en el adoquín por dado con `dropPavesFactor·estrellas` (D-37); caídas escaladas en pavés y lluvia. Sin posición, sin «favorito entra delante». **PARCIAL** (velocidad sí; colocación AUSENTE).
- **Lo que dijo el dueño**: «pave 69 ok» (v39 §8 / v58 §6: PAV mediano del ganador ≥ 69); «Lo que falta no es calibración sino otro modelo de final en adoquín» (v39 §8).
- **Información necesaria**: km al sector, categoría del sector (estrellas: la tiene), gregarios disponibles, posición. Falta la posición.
- **Cómo se mediría**: PAV mediano del ganador en el banco del pavé ≥ 69 (**banda del dueño**); número de corredores en el grupo de cabeza tras el último sector de 5★: 5-25 (Roubaix real: 1-15; Flandes: 2-10).

### [FASE-24] Aproximación a un tramo de viento lateral (el giro de la carretera)

- **Cuándo**: llanas con viento; el pelotón sabe que a X km la carretera gira y el viento pasa a ser lateral.
- **Quién decide**: los equipos fuertes de rodadores (deciden ROMPER), los líderes (se colocan delante con 5 km de antelación), el pelotón (se estira).
- **Lo que pasa en carretera**: los equipos que quieren romper aceleran justo antes del giro; el abanico se forma en 500 m y el que va detrás de la posición 30 está fuera; luego los cortados se organizan en su propio abanico; el hueco crece 1-3 min si los de delante insisten; el abanico se cierra cuando el viento deja de ser lateral o los equipos de delante dejan de colaborar.
- **Lo que hace hoy el motor**: viento como un número por etapa (`vientoLateral`), corte `corte()` por dado `windBreakPerKm` 0,015·viento en cualquier bloque llano, colocación en PUNTOS (frente +25, jefe colocado +12, piernas, suerte ±10) (D-48); `abanicoAbierto` nunca se cierra («el viento sopla todo el día»); no hay tramos expuestos ni previsión (límite §19.5). **PARCIAL**: el abanico existe como capacidad y el corte como dado; la ANTICIPACIÓN (acelerar antes del giro) y el CIERRE del abanico están AUSENTES.
- **Lo que dijo el dueño**: «el viento y los abanicos… aquí te delegaré el 100 % de que hagas esto… aunque eso implicará también definir las colocaciones» (v41); «en un abanico el jefe TAMPOCO tira» (v41 §7).
- **Información necesaria**: dirección de la carretera por tramo y del viento (no existe: escalar por etapa), quién es fuerte en llano por equipo, km restantes. Falta el dato de tramos.
- **Cómo se mediría**: % de llanas con viento en que el pelotón se parte: 4 % medido (`windMin` 0,87); ratio de equipos «rompedores» representados en el primer abanico: ≥ 70 % de los equipos con `frontTeamId` reciente. Si entra el tramo expuesto: % de `echelon_split` que ocurren dentro de los 2 km posteriores a un cambio de rumbo ≥ 60 % (banda propuesta).

### [FASE-25] Estrechamientos, rotondas y el embudo de los últimos 10 km

- **Cuándo**: últimos 10 km de una llana (pueblos, rotondas, puentes); cualquier estrechamiento señalado.
- **Quién decide**: los trenes (se colocan antes del estrechamiento), los hombres de la general (se ponen delante para evitar la caída), el pelotón.
- **Lo que pasa en carretera**: la velocidad ya es de 55+ km/h; los trenes pelean la cabeza antes de cada rotonda; hay caídas en el embudo; los líderes de la general van con 2 gregarios en las 20 primeras posiciones y se apartan a 3 km (regla de los 3 km: mismo tiempo si caída/incidente en los últimos 3 km de una llegada llana).
- **Lo que hace hoy el motor**: `isFinal` (`finalBlocks`) sube la λ de caída (`crashLambda(block, isFinal)`, `crash.ts:19-25`); régimen de sprint (`sprintRegimeKmh`) sube la velocidad en los últimos 3 km con trenes; sin posición ni estrechamientos en el perfil; no hay regla de los 3 km (Grep: nada). **PARCIAL** (caídas sí; colocación y regla de los 3 km AUSENTES).
- **Lo que dijo el dueño**: «es el último km… deberíamos ver aquí a los equipos de los sprinters llevando al pelotón a toda velocidad» (v33).
- **Información necesaria**: estrechamientos del recorrido (no en el perfil), general de cada uno, posición. Falta casi todo salvo la general.
- **Cómo se mediría**: % de caídas de la etapa que ocurren en los últimos 10 km de una llana: 30-50 % (banda propuesta: PCS/UCI reportan que la mayoría de caídas de llanas van en el desenlace); hombres del top-10 de la general implicados en caídas finales: ≤ la proporción de su peso en el pelotón × 0,5 (van protegidos).

---

## E. EL PUERTO — tempo vs decisivo, tren de montaña, líder, gregarios

### [FASE-26] El puerto de tempo (lejos de meta): subir sin romper, soltar a los sprinters y reagrupar

- **Cuándo**: puertos de 2.ª/1.ª a más de 30-40 km de meta en una media o reina; también el primer puerto de la etapa.
- **Quién decide**: el equipo del maillot (tempo), los sprinters (se dejan ir y forman el autobús), la fuga.
- **Lo que pasa en carretera**: el pelotón sube a un tempo alto pero no de selección; los sprinters y sus lanzadores se descuelgan y forman el grupeto con calma («el autobús»); en el descenso y el valle los que perdieron poco vuelven; el pelotón de favoritos no ataca aquí salvo emboscada (FASE-31).
- **Lo que hace hoy el motor**: `climbTempoCommit` 0,7 fuera de `raceThisClimb` (últimos 30 km); criba por deriva (D-36) con `climbTempoFraction` 0,5; grupetos con `droppedCommit`; reenganche en descenso con puerta que no absorbe si el hueco crece (v35). **CUBIERTO**.
- **Lo que dijo el dueño**: «así el pelotón no se destroza en cada cota y las diferencias las marca el último puerto, como en la realidad» (comentario 404-406); «en una etapa reina falta que los campeones se esfuercen un poquito más» (v39 §6 → 0,62 → 0,70); «en una bajada es normal que algunos de los que perdieron contacto al subir se reenganchen, pero no todos, wey» (v35).
- **Información necesaria**: km restantes, quién manda el tempo (equipo del maillot), si hay fuga peligrosa delante. Lo tiene.
- **Cómo se mediría**: `smallTours.mediaGroups` 3-8 grupos de tiempo en una MEDIA (banda existente); tamaño del grupo principal tras un puerto de 1.ª a > 60 km de meta en `reina-150`: 60-90 % del campo (banda propuesta).

### [FASE-27] El puerto decisivo: el tren del favorito y la selección

- **Cuándo**: último puerto de una reina o el que decide (últimos 30 km); final en alto.
- **Quién decide**: el equipo del favorito de la general (pone el tren a bloque), el maillot (defiende), los rivales (atacan), la fuga (se rompe).
- **Lo que pasa en carretera**: al pie el tren del favorito o del maillot sube a bloque para eliminar gregarios rivales y sprinters; a 5-6 km de la cima quedan 10-20; los gregarios se van apagando uno a uno y se apartan; los fuertes atacan en el decil más empinado; el maillot responde solo a los que le amenazan.
- **Lo que hace hoy el motor**: `raceThisClimb` (≤ 30 km) → `climbRaceCommit` 0,85, `climbPaceFraction` 0,12 (tiran los `paceSetters`), criba por deriva y reserva W′ (D-36), `ataque_final` con `tacticStrongFloor` + `perfilRank` + general (`gcDefendShare`, `gcChallengeShare`); 55,3 % de finales en alto decididos por ataque. **CUBIERTO**.
- **Lo que dijo el dueño**: «Un final en alto no es el equipo del favorito tirando hasta reventar a todos. Los fuertes atacan: por la etapa y por la general, en el momento oportuno, y vigilándose entre ellos» (regla 9); «es una llegada en alto con un puerto brutal al final… y el que llega en el puesto 150 solo perdió 26 segundos» (v49).
- **Información necesaria**: quién es mi líder, quién es su rival, colchón, km a la cima, pendiente del tramo. Lo tiene salvo «mi líder en el grupo» dentro de `tactics.ts`.
- **Cómo se mediría**: `mountain.top10GapSeconds` suelo 40 s (**banda del dueño**); `realQueens.lastGroupPct` (8-14 %); ataques en el decil más empinado ≥ 60 % (SPEC 6.17, no forzado); `mountain.breakawayWinPct` 25-45 (canónico) / `calendarQueens` 6-30 (**del dueño**).

### [FASE-28] El tren de montaña: gregarios que se queman en orden y se apartan

- **Cuándo**: en el puerto decisivo (y en los 20 km previos).
- **Quién decide**: el director/equipo del líder (orden de los relevos: primero los rodadores, luego los escaladores gregarios, el último «lugarteniente» hasta 3 km de la cima), cada gregario (cuando ya no puede, se aparta sin pelear).
- **Lo que pasa en carretera**: el gregario que acaba su relevo se aparta a un lado y se deja ir con calma (no pelea por seguir); el siguiente coge el relevo; el último gregario sube al líder hasta donde puede y luego marca el ritmo del grupo del líder si este se descuelga. Un equipo con dos líderes (A y B) usa a B como último gregario o le deja libre según el día.
- **Lo que hace hoy el motor**: `relayTurn` por deber (gregario 1,0) + frescura + empuje del equipo con dueño del frente; en subida el ritmo lo ponen los `paceSetters` (perfil ≥ pace − 4); el gregario que ya no puede sale por DERIVA (`driftDropGapSeconds` 20 s) y gasta reserva antes (`reserveS` 65 s) como cualquiera: **no se aparta**, pelea hasta soltarse. No hay orden de relevos por «tipo de gregario». **PARCIAL** (el relevo existe; el «apartarse» y el orden son emergentes por frescura, no por plan).
- **Lo que dijo el dueño**: «el tamaño a medir no es el tamaño del grupo, sino el tamaño de la gente que va tirando» (v38); «un líder arropado por gregarios dentro del pelotón gasta LO MISMO que uno que va a rueda» (v38); «lo de que pelean a tope aunque vaya vacío, arréglalo» (v40).
- **Información necesaria**: quién de mi equipo va en el grupo, quién es mi líder, mi reserva, cuánto queda de puerto. Tiene reserva y km; falta «mi líder está aquí» en la decisión de gastar la reserva.
- **Cómo se mediría**: gregarios del equipo del frente que gastan > 50 % de su reserva W′ ANTES de soltarse en el puerto decisivo: ≤ 30 % (un gregario no se vacía peleando la rueda; banda propuesta); orden de descuelgue de los gregarios de un mismo equipo correlacionado con perfil de escalador (Spearman ≥ 0,5).

### [FASE-29] El maillot que marca y solo responde a los peligrosos

- **Cuándo**: puerto decisivo con general en juego; también el último km de un final en alto.
- **Quién decide**: el maillot y su último gregario.
- **Lo que pasa en carretera**: el maillot no ataca; sigue solo a los que están a menos de X min de él (X = su colchón); deja ir a los que van a 5+ min; si un rival directo ataca, responde en 3-5 s o pone a su gregario a cerrar a tempo; con colchón grande, sube a su ritmo y concede 20-30 s.
- **Lo que hace hoy el motor**: `gcDefendShare` (colchón/60 s) quita apetito al defensor y sube su `followProbability` a 0,847 (`stake`); `gcChallengeShare` empuja a los rivales dentro de 420 s; la respuesta es «saltar a cualquier ataque», no «a ESTE rival» (`marcaje.ts` solo con orden `marcador` de un jugador; `autoOrders` nunca la da). No lee la general del atacante concreto en la respuesta. **PARCIAL** (defensa sí; marcaje selectivo AUSENTE).
- **Lo que dijo el dueño**: «no tiene sentido que un líder haga eso [atacar una y otra vez]; otra cosa es que los que van segundo, tercero o cuarto lo hagan… y curiosamente no veo que lo hagan» (v52); «la defensa del maillot no existe como conducta propia» (E3, deuda).
- **Información necesaria**: general del ATACANTE (la tiene en `members`), colchón sobre él, su perfil, mi gregario disponible. Tiene los datos; la regla mira el colchón mínimo del grupo, no al atacante.
- **Cómo se mediría**: en `grandTour` reina con general: % de ataques de un rival a ≤ 60 s del maillot que el maillot sigue: 70-90 %; de un rival a ≥ 5 min: ≤ 20 % (bandas propuestas).

### [FASE-30] Los rivales de la general atacan; el favorito «se rompe» (el día malo)

- **Cuándo**: puerto decisivo; también el penúltimo con el líder aislado.
- **Quién decide**: 2.º-5.º de la general (atacan por turnos, «uno tras otro»), sus equipos (mandan un gregario a la fuga de la mañana para el relevo), el maillot (aguanta o se hunde).
- **Lo que pasa en carretera**: los rivales atacan escalonados para aislar al maillot; si el maillot se hunde (pájara, calor, enfermedad) pierde 2-5 min y la general cambia; el equipo del maillot manda hombres atrás. Variante: el favorito «pincha» de forma y remonta después (v26).
- **Lo que hace hoy el motor**: `gcChallengeShare` (peso 0,35 en `ataque_final`; 0,6 en el resto con `gcTerrain`); relación rival/maillot 1,01 → 1,32 (v52, «menos de lo esperado»); deriva + reserva permiten hundimientos (13 por corrida) y remontadas (6) (v26); rescate D-13 hacia un `shed`. No hay «ataques escalonados» coordinados ni el gregario en la fuga de la mañana como relevo. **PARCIAL**.
- **Lo que dijo el dueño**: «otra cosa es que los que van segundo, tercero o cuarto lo hagan, porque ellos quieren luchar por la carrera… y curiosamente no veo que lo hagan» (v52/v57); «una cosa que debería poder pasar y nunca pasa es que haya remontadas en una subida… o uno que empieza muy bien… y luego se hunde» (v26); E3: «la emboscada y el día en que el líder se rompe» no tocados.
- **Información necesaria**: colchón exacto, quién es rival directo, compañeros delante (en la fuga) para relevar, frescura del maillot (visible por su ritmo). Falta «compañero delante como relevo».
- **Cómo se mediría**: ataques por etapa de montaña del 2.º-5.º / del maillot: ≥ 2,0 (medido 1,32; banda propuesta: el maillot casi no ataca); % de grandes vueltas en que el maillot pierde ≥ 2 min en una etapa de la tercera semana: 15-35 % (banda propuesta).

### [FASE-31] La emboscada: atacar de lejos, en el penúltimo puerto o en una media montaña que corona a 36 km

- **Cuándo**: media montaña con el último puerto a 30-50 km de meta; reina con dos puertos encadenados; viento en un valle intermedio.
- **Quién decide**: un equipo de la general con gregarios en la fuga de la mañana; el rival que ha perdido tiempo.
- **Lo que pasa en carretera**: el equipo rompe en el penúltimo puerto o en el descenso, con relevos de los que iban en la fuga; el maillot se queda aislado y pierde 1-3 min (o la general). Ocurre 1-2 veces por gran vuelta.
- **Lo que hace hoy el motor**: `ataque_final` solo en `(onClimb ∧ raceThisClimb) ∨ kmToGo ≤ 12`; el empujón de la general vive en `ataque_final` y, desde v52, en el resto de kinds solo con `gcTerrain` (5 % de km en subida) y factores suaves (`gcEarlyChallengeGain` 0,6). En una media cuyo último puerto corona a 36 km «no reciben ese empujón en todo el día» (v51). Sin relevo de gregarios desde la fuga. **AUSENTE** en lo esencial.
- **Lo que dijo el dueño**: (anotación de `constants.ts:306`) «la etapa se decide a veces mucho antes —Race Great Ocean, de 116…»; E3: «la emboscada… no tocada».
- **Información necesaria**: colchón del maillot, si está aislado (compañeros en su grupo), compañeros míos delante, terreno que queda. Falta «aislado» y «compañeros delante» en la táctica.
- **Cómo se mediría**: en `grandTour` (21 etapas): número de etapas de media/montaña en que el top-3 de la general pierde ≥ 60 s en una etapa cuya última cima está a > 25 km de meta: 0,5-2 por vuelta (banda propuesta).

### [FASE-32] El gregario que espera al jefe descolgado en el puerto («espérame»)

- **Cuándo**: puerto decisivo o de tempo; el jefe pierde la rueda del grupo.
- **Quién decide**: el gregario (esperar o seguir), el jefe (pedir ayuda), el equipo.
- **Lo que pasa en carretera**: el gregario que va delante se aparta y espera al jefe SIN que haya 22 s de hueco (se deja caer al verle sufrir); luego le lleva al ritmo del jefe (no al suyo); si el jefe está muerto, el gregario tira igual hasta la meta. El maillot no espera a nadie.
- **Lo que hace hoy el motor**: D-13 drop-back hacia un `shed` con hueco `regroupGapSeconds` 22 s ≤ gap ≤ 300 s y ≥ 5 km por correr; `jefeEnApuros` (deja de tirar a 22 s); «se probó que el grupo de rescate rodara al ritmo del JEFE y NO se ha hecho» (66 % vs 70 %). Nadie espera dentro de la criba (D-36 «no ve equipo»). **PARCIAL** (rescate a posteriori; anticipación AUSENTE; ritmo del jefe descartado por medida).
- **Lo que dijo el dueño**: «si necesita ayuda un líder y tiene gente en el grupo anterior…» (v36); «El jefe no pide la ayuda: se la mandan… No hay “espera a mi compañero”» (v36 §7, límite); «si va en un grupo de perseguidores y su jefe está en problemas… pues ahí sí, que se descuelgue» (v37).
- **Información necesaria**: deriva del jefe (`driftS`: la tiene), mi grupo vs el suyo, km restantes. Tiene los datos.
- **Cómo se mediría**: tiempo medio entre que el jefe empieza a derivar (`driftS > 5`) y que su primer gregario baja: ≤ 30 s de carretera (hoy ≥ 22 s + 1 km de decisión); % de jefes de la general que suben el puerto decisivo con ≥ 1 compañero mientras pierden tiempo: 60-85 % (banda propuesta).

### [FASE-33] La fuga en el puerto decisivo: se rompe, el mejor sigue, el resto se deja coger

- **Cuándo**: la fuga del día llega al último puerto con 2-6 min.
- **Quién decide**: el mejor escalador de la fuga (se va solo), los demás (pelear la etapa o dejarse coger y guardar para mañana), el grupo de favoritos.
- **Lo que pasa en carretera**: en las primeras rampas el mejor escalador de la fuga ataca; los rodadores se dejan ir sin pelear y esperan al pelotón (o al autobús); el solitario gana si le quedan 2+ min al pie de los últimos 5 km; si no, le cazan los favoritos a 2 km. A veces dos de la fuga se marcan y les cazan.
- **Lo que hace hoy el motor**: `shatter` sobre cada move (deriva + reserva); `ataque_grupo` favorece al PEOR rematador (regla 6) — en subida con final en alto el «peor rematador» es el peor escalador: el que ataca a 15 km es el que menos opciones tiene, **CONTRARIO** a lo que ocurre (el que ataca en el puerto es el mejor escalador; `ataque_final` sí usa `perfilRank` pero solo desde el pelotón/grupo con `raceThisClimb`… D-24: desde un move solo `puente` o `ataque_grupo`). Los rodadores no «se dejan coger»: pelean con reserva hasta soltarse. `relayNoChanceWeight` sí les saca del turno. **PARCIAL / CONTRARIO** en quién ataca.
- **Lo que dijo el dueño**: «Dentro de una fuga se sigue atacando, sobre todo si es numerosa, y sobre todo… los que peor rematarían al sprint… en los últimos km» (regla 6 — habla del llano); «si es una etapa de montaña y en la fuga van con un súper escalador y tú eres mal escalador, lo normal es que no cooperes» (v39 §1); `breakScore` sin MON/COL: «el hombre de la fuga en una reina se elegía con las piernas del llano» (v44 §1, retirado).
- **Información necesaria**: tipo de final (alto → el mejor perfil ataca), mi perfil vs el del grupo, km, ventaja sobre los favoritos. Tiene los datos; el `kind` desde un move no distingue.
- **Cómo se mediría**: en `reina-150`, cuando la fuga entra al último puerto con ≥ 2 min: % de veces que el primer `ataque_grupo` en subida lo da el mejor MON del grupo: ≥ 60 % (hoy favorece al peor rematador); `calendarQueens` fuga gana 6-30 % (**del dueño**).

### [FASE-34] Remontadas y hundimientos dentro de la subida

- **Cuándo**: cualquier puerto largo; sobre todo el decisivo.
- **Quién decide**: física individual (reserva, deriva), decisión de ritmo (subir a lo tuyo y remontar).
- **Lo que pasa en carretera**: el que sube «a lo suyo» remonta a los que se pasaron de ritmo en la primera mitad; el que atacó pronto se hunde; los relojes en la cima no son el orden del pie.
- **Lo que hace hoy el motor**: deriva continua + reserva W′/CP 65 s (v26): remontadas 0 → 6, hundimientos 0 → 13, relojes distintos en la cima 8 → 19,5. **CUBIERTO**.
- **Lo que dijo el dueño**: «una cosa que debería poder pasar y nunca pasa es que haya remontadas en una subida… uno que empieza mal y luego va remontando… o uno que empieza muy bien, muy fuerte, y luego se hunde» (v26); encargo: resultado «hiperrealista».
- **Información necesaria**: ritmo propio, reserva, quién va delante a tiro. Lo tiene.
- **Cómo se mediría**: remontadas (adelantar a ≥ 3 corredores dentro del puerto tras haber perdido ≥ 10 s) por corrida en `reina-150`: 4-12; hundimientos: 8-20 (bandas propuestas alrededor de lo medido en v26).

### [FASE-35] La cima del último puerto: coronar solo con poco, esperar o seguir

- **Cuándo**: cima del último puerto con descenso y valle a meta (10-40 km).
- **Quién decide**: el que corona con 10-30 s (seguir solo o esperar al grupo), los favoritos (perseguir en el descenso o no), el equipo del maillot.
- **Lo que pasa en carretera**: con < 20 s de ventaja y 30 km de valle, el solitario espera al grupo perseguidor si hay compañeros en él, o sigue si es buen bajador y rodador; el grupo de favoritos se reagrupa en la cima si hay gregarios detrás a 30 s (los esperan para el valle); los sprinters descolgados vuelven en el descenso.
- **Lo que hace hoy el motor**: nada específico en la cima: los grupos siguen con su compromiso; fusiones por contacto (D-44) y puerta de reenganche (D-42); un move en cabeza sigue con `coop`. No hay «esperar en la cima». **AUSENTE**.
- **Lo que dijo el dueño**: «uno que va en grupo 2 podría esperar a uno del grupo 3 y ayudarlo» (v36 — dicho para el rescate del jefe, aplicable aquí).
- **Información necesaria**: ventaja, km restantes, terreno restante, compañeros detrás y su distancia, DES/LLA propio vs perseguidores. Tiene los relojes; falta la decisión.
- **Cómo se mediría**: en `media-190` (última cima a 15-40 km): % de coronas en solitario con ≤ 20 s que acaban ganando la etapa: 10-30 %; % que se dejan coger antes de 5 km de descenso: 30-60 % (bandas propuestas).

---

## F. LA CIMA Y EL DESCENSO — quién arriesga, quién espera

### [FASE-36] El descenso tras el puerto decisivo: el que arriesga abre hueco, el líder no arriesga con lluvia

- **Cuándo**: descenso de 10-25 km tras la última cima con meta al pie o tras un valle corto.
- **Quién decide**: el buen bajador con poco que perder (arriesga), el maillot (asegura), los equipos con hombre delante (frenan al grupo en las curvas), el equipo con hombre atrás (aprieta).
- **Lo que pasa en carretera**: un bajador de élite abre 20-40 s en 15 km de descenso técnico; con lluvia los líderes ceden 30-60 s a propósito; el que va a rueda en el descenso «arrastra» al grupo con frenazos; caídas de los que arriesgan.
- **Lo que hace hoy el motor**: el descenso solo criba por dado en su primer km (`descentSelectKm` 1, D-35); caídas escaladas por DES y lluvia (`crash.ts`); `blockPerfil` en descenso = DES (mapa-atributos §1). «Nada táctico se decide en el descenso (no hay “bajar a tope para abrir hueco” ni marcaje específico)» (mapa-simulate §4.11); `finishType 'descenso'` pesa DES 0,42 solo en el remate. **AUSENTE** como decisión (la física sí distingue DES).
- **Lo que dijo el dueño**: «¿qué chingados pasó entre el km 191 y el 192?» (descenso que aniquilaba, comentario 3811); «en una bajada es normal que algunos se reenganchen, pero no todos» (v35).
- **Información necesaria**: DES propio vs del grupo, lluvia, colchón en la general (el maillot no arriesga), km de descenso restante. Tiene todo salvo la decisión.
- **Cómo se mediría**: en un descenso final de ≥ 10 km con lluvia (`media-190` con `finishType 'descenso'`): % de etapas en que un corredor con DES ≥ 85 abre ≥ 15 s sobre un grupo de ≥ 5: 20-40 %; el maillot pierde ≥ 10 s a propósito en descenso con lluvia: 30-60 % (bandas propuestas).

### [FASE-37] Reagrupamiento en el descenso y el valle: los que vuelven y los que no

- **Cuándo**: descenso y llano tras un puerto de tempo o tras el penúltimo puerto.
- **Quién decide**: los descolgados (pelean o no), sus equipos (les bajan gregarios), el pelotón (ritmo).
- **Lo que pasa en carretera**: en el descenso vuelven los que perdieron < 30-40 s en la cima si el pelotón baja tranquilo; los que perdieron 1-2 min no vuelven salvo con 3-4 gregarios y pelotón parado; el autobús de sprinters nunca vuelve en la reina.
- **Lo que hace hoy el motor**: puerta de reenganche que exige estar VOLVIENDO (v35), `descentSelectKm`, `droppedCommit`, «los que pierden en montaña cinco minutos se reintegran demasiado fácil» (v58 §6, abierto: la puerta de 22 s no era la causa). **CUBIERTO** en descenso corto; **ABIERTO** en el reenganche fácil tras perder minutos.
- **Lo que dijo el dueño**: «en una bajada es normal que algunos de los que perdieron contacto al subir se reenganchen, pero no todos, wey… no tiene que reducirse siempre» (v35); «los que pierden en montaña 5 minutos luego se reintegran demasiado fácil» (v58).
- **Información necesaria**: hueco, ritmo del pelotón, frescura, gregarios. Lo tiene.
- **Cómo se mediría**: % de corredores que pierden ≥ 3 min en la cima de un puerto de 1.ª/HC de `reina-real-s3` y acaban en el grupo principal: ≤ 5 % (banda propuesta; hoy «demasiado fácil»); en descenso tras puerto de tempo, % de descolgados a ≤ 30 s que vuelven: 50-80 %.

### [FASE-38] Ataque en el descenso final hacia meta (final tipo «descenso»)

- **Cuándo**: la meta está al pie del descenso o a < 5 km del pie.
- **Quién decide**: el mejor bajador del grupo de cabeza (ataca en la cima o en las primeras curvas); los demás (siguen o se conforman).
- **Lo que pasa en carretera**: el ataque se da en la cima misma (para entrar primero en las curvas) o en las curvas de arriba; el que va primero elige la trazada; los perseguidores pierden 5-10 s en 5 km si no arriesgan; en meta llega solo o con 2-3 a rueda.
- **Lo que hace hoy el motor**: `ataque_final` solo `onClimb ∧ raceThisClimb` o `kmToGo ≤ 12` — en descenso `kmToGo ≤ 12` sí permite `ataque_final`, pero su apetito en llano/descenso usa la rama «peor rematador» (mapa-tactics §3.7: fuera de `onClimb` igual que `ataque_grupo`), no DES; el salto `jumpGapSeconds` usa el perfil del bloque (= DES en descenso, correcto). `finishType 'descenso'` pesa DES 0,42 en meta. **PARCIAL** (la física del salto ve DES; quién ataca no).
- **Lo que dijo el dueño**: «si es un final en llano no haría sentido que un escalador ataque al final ahí» (comentario en `ataque_final`) — el principio (atacar con el atributo del terreno) aplica al descenso.
- **Información necesaria**: DES propio vs grupo, km de descenso restante, tipo de final. Lo tiene; el apetito no lo usa.
- **Cómo se mediría**: en etapas con `finishType 'descenso'`: % en que el instigador del último `ataque_final` en descenso está en el top-3 de DES del grupo: ≥ 60 %; Spearman DES-puesto en el grupo de cabeza ≥ 0,4 (bandas propuestas).

---

## G. EL VALLE FINAL Y LOS ÚLTIMOS 10 / 5 / 3 KM

### [FASE-39] El valle tras el último puerto: el grupo decisivo se mira y la colaboración se rompe

- **Cuándo**: 8-30 km de llano/descenso a meta con un grupo de 3-15 delante (media montaña, clásica de montaña).
- **Quién decide**: cada miembro del grupo (relevar o esconderse), el que sabe que pierde el sprint (ataca), los que tienen compañero detrás (no tiran).
- **Lo que pasa en carretera**: a 20 km relevan todos; a 8-10 km el mejor sprinter del grupo deja de relevar y los demás le miran; salen ataques de los que no rematan; el grupo se rompe y gana un solitario 20-30 % de las veces (en media montaña); si el grupo de detrás viene fuerte, la desconfianza les cuesta la etapa.
- **Lo que hace hoy el motor**: `interésPropio`/`noChanceToWin` con `cerca` creciendo de 80 a 15 km (D-27, `relayNoChanceWeight`) saca del turno al que no puede ganar — el MEJOR rematador sí releva («relevan los seis, incluido el que sabe que pierde», lo contrario); `ataque_grupo` ≤ 18 km favorece al peor rematador; deuda v38 §16: ganador en solitario en media montaña 4 % contra 20-30 %. **PARCIAL** (mecanismo parcial, resultado rojo).
- **Lo que dijo el dueño**: foto pedida «un grupo grande, algunos por detrás en grupos, y por delante uno o dos»; «Lo que sigue rojo es el ganador en solitario: 4 % contra el 20-30 % que pidió» (v38-2 §16); «en un grupo de seis a 8 km de meta relevan los seis, incluido el que sabe que pierde el sprint» (v39 §1, describiendo el defecto); «Dentro de una fuga se sigue atacando… los que peor rematarían al sprint… en los últimos km» (regla 6).
- **Información necesaria**: mi remate vs el mejor del grupo (lo tiene), compañeros en el grupo y detrás (no llega a `tactics.ts`), distancia del grupo perseguidor (no llega), km. Falta lo de equipo y lo de detrás.
- **Cómo se mediría**: ganador en solitario en `media-190`: 20-30 % (**banda del dueño**); % de grupos decisivos de 3-10 que llegan a meta con < 70 % de sus miembros: 40-70 % (banda propuesta).

### [FASE-40] Los descolgados que se dejan ir en los últimos 25 km y el autobús

- **Cuándo**: últimos 25 km de cualquier etapa dura; sprinters en la reina.
- **Quién decide**: el corredor agotado (regla 8), el grupeto como colectivo (ritmo justo para el corte).
- **Lo que pasa en carretera**: el vacío se deja ir sin pelear con el único cuidado del fuera de control; el autobús rueda a un ritmo calculado (el «capitán» del grupeto lleva la cuenta); en el último km del autobús nadie sprinta.
- **Lo que hace hoy el motor**: `administerEffort` (`giveUpKm` 25, `giveUpEnergyFraction` 0,22, λ 0,35, tope colectivo 0,33 de la cohorte, guardarraíl del fuera de control con `predictedShedPace`) (D-49); ritmo del grupeto `droppedCommit` + `share` de rendidos + `grupetoWait`; corte `applyStageTimeCut` por grupos con presupuesto 4 %. **CUBIERTO**. Límite: el guardarraíl mide contra el tiempo ya corrido, «casi inerte en etapas largas» (v17).
- **Lo que dijo el dueño**: «Es normal que un corredor agotado se descuelgue en los últimos km… Salvo motivación especial, se deja ir, con el único cuidado del fuera de control» (regla 8); «74 minutos???» (v17); «el último grupo de una etapa reina entra entre el 8 % y el 14 %» (v16).
- **Información necesaria**: depósito, km, ritmo necesario para el corte (lo calcula), si el jefe me necesita (no lo ve: «un gregario puede sentarse aunque su jefe le necesite»).
- **Cómo se mediría**: `grandTour.queenLastGroupPct` 8-14 % (banda existente, sentada en su suelo); `abandonCauses.outOfTimePct` 1-15 %.

### [FASE-41] Fuga a 10-15 km con un minuto: la agonía y los ataques dentro

- **Cuándo**: últimos 18-5 km con la fuga del día viva y el pelotón cazando.
- **Quién decide**: cada fugado (relevar a fondo para llegar, o atacar porque en el sprint pierde), el pelotón (apretar o rendirse).
- **Lo que pasa en carretera**: a 15 km con 1 min los fugados dejan de mirar y tiran a bloque; a 8 km, el peor sprinter de la fuga ataca; a 4 km el segundo peor; el mejor sprinter se guarda a rueda; si el pelotón está a 15 s a 2 km, la fuga se descompone en ataques desesperados y a veces uno aguanta por 2 s.
- **Lo que hace hoy el motor**: `ataque_grupo` desde el move si `kmToGo ≤ tacticInsideAttackKm 18` o tensión ≥ 25, con λ subiendo a `lambdaLateAttack` 0,5 en ≤ 12 km, favoreciendo al peor rematador (`tacticWorstFinisherWeight` 1,5 → 2,5×); `tacticNoAttackKm` 3 corta todo ataque en los últimos 3 km. **CUBIERTO** en lo individual; sin equipo (dos de un equipo alternan ataques: AUSENTE); sin conocimiento de la distancia del pelotón (el fugado no sabe que le vienen a 15 s).
- **Lo que dijo el dueño**: regla 6 (§13.1); «fíjate cómo funciona un sprint sin lanzadores, por ejemplo en una fuga…» (v39 §5).
- **Información necesaria**: mi remate vs el mejor del grupo (sí), boquete con el pelotón (no llega a `MoveRider`), km, compañeros (no).
- **Cómo se mediría**: en `llana-180` con fuga viva a 10 km: nº de `ataque_grupo` en los últimos 15 km por fuga: mediana 1-3; % de etapas ganadas por un fugado que atacó a la fuga en los últimos 15 km vs ganadas al sprint de la fuga: 40-70 % (banda propuesta).

### [FASE-42] Los últimos 15 km de una llana: el tirón final de los trenes

- **Cuándo**: `bunchFinish` y ≤ 15 km; fuga cazada o a tiro.
- **Quién decide**: los equipos con sprinter (lanzar), el resto (esconderse), los hombres de la general (colocarse delante y apartarse a 3 km).
- **Lo que pasa en carretera**: los trenes toman el frente a 15-10 km, la velocidad sube a 50-55 km/h; nadie más releva; los equipos sin sprinter dejan a sus hombres de la general en las 20 primeras posiciones hasta el km −3; el que quiere «flyer» ataca a 5-8 km y casi nunca llega.
- **Lo que hace hoy el motor**: `intentFor('etapa')` → `lanzar` a ≤ `finalDriveKm` 15; suelo `gear.finalDrive` 0,72-0,85 (D-19); `frontTeamId` «manda la baza aunque venga fundida» (v33); ataques `ataque_final` en llano ≤ 12 km favoreciendo al peor rematador. **CUBIERTO**.
- **Lo que dijo el dueño**: «es el último km… deberíamos ver aquí a los equipos de los sprinters llevando al pelotón a toda velocidad para lanzarles el sprint» (v33).
- **Información necesaria**: quién tiene sprinter, boquete, km. Lo tiene.
- **Cómo se mediría**: `flat.bestSprinterWinPct` 30-45 % (banda existente); velocidad media del pelotón en los km −15 a −3 en `llana-180`: 48-56 km/h (banda propuesta según PCS).

### [FASE-43] El «flyer» de los últimos 5-3 km y el ataque bajo la flamme rouge

- **Cuándo**: últimos 5 km de una llana con pelotón compacto; último km en llegadas de grupo reducido; puncheur.
- **Quién decide**: un rodador/puncheur (ataca a 3-4 km o a 1,5 km), los trenes (cerrar o ignorar).
- **Lo que pasa en carretera**: ataques a 3-5 km casi siempre se cazan a 1 km; ataques a 1,5 km bajo la flamme rouge ganan 2-5 % de las llanas (el «golpe de mano»); en finales de puncheur el ataque decisivo suele ser en el último km (repecho).
- **Lo que hace hoy el motor**: `tacticNoAttackKm` 3 → ningún ataque nace en los últimos 3 km (D-22); el repecho final se resuelve con `finishScore` puncheur (COL 0,4). **CONTRARIO** para el último km (imposible por construcción), **PARCIAL** para los 3-5 km (existe `ataque_final` con λ 0,5).
- **Lo que dijo el dueño**: «el sprint en sí no se simula… los últimos doscientos metros… no son un bloque de carretera sino un remate» (comentario 4834); «llegó un grupo de 50 personas… eso es un sprint» (v45).
- **Información necesaria**: tamaño del grupo, trenes presentes, mi remate vs el grupo, mi COL/LLA. Lo tiene.
- **Cómo se mediría**: % de llanas de `grandTour` ganadas por un ataque nacido a ≤ 5 km: 2-6 % (PCS: 1-2 por gran vuelta); en finales `puncheur` con grupo ≥ 15 a 3 km: % decididas por un ataque en el último km: 30-50 % (banda propuesta).

### [FASE-44] El repecho final / muro (final puncheur) con grupo grande

- **Cuándo**: último km al 6-12 % (Huy, Amstel, finales de clásica de Ardenas y etapas «uphill finish»).
- **Quién decide**: los puncheurs (cuándo lanzar: a 300 m o a 700 m), sus equipos (llevarles a la base delante), los sprinters (renunciar).
- **Lo que pasa en carretera**: la carrera se decide en la base (posición) y en el momento de lanzar; el que lanza a 600 m se hunde a 150 m; el equipo del favorito lleva a su hombre a la base en cabeza a 60 km/h.
- **Lo que hace hoy el motor**: `finishType 'puncheur'` (corona ≤ 5 km ∧ `climbScore` ≥ 15 o `avgGradient` ≥ 2,5) → pesos COL 0,4/SPR 0,28/TAC 0,2/RES 0,12; `admitsBunchFinish` true → el pelotón hace `lanzar` y trenes (`sprintFinish` engañoso, mapa-equipo §8.9); no hay «lanzar el repecho pronto/tarde» (el submotor de lanzamiento es solo para `isSprintFinish`). **PARCIAL**.
- **Lo que dijo el dueño**: «una rampa del 3 % en meta mataba el sprint (Québec 99 % → 1 %)» (v22, deuda corregida); v30: el muro de 3 km «lo gana un cronista» era falso.
- **Información necesaria**: pendiente y longitud del repecho (la tiene), mi COL vs grupo, posición en la base (no). Falta la posición.
- **Cómo se mediría**: en etapas `puncheur` (Muro de Huy): Spearman COL-puesto en el grupo de cabeza ≥ 0,5; % de veces que gana un SPR ≥ 80 con COL < 60: ≤ 5 % (bandas propuestas).

### [FASE-45] El último kilómetro con trenes: el sprint masivo (submotor)

- **Cuándo**: `sprint_masivo` (≥ 15 en el grupo), últimos 3 km / último km.
- **Quién decide**: los lanzadores (cuándo apartarse), el sprinter (cuándo abrir), los sin tren (a qué rueda pegarse).
- **Lo que pasa en carretera**: de 3 km a 1 km los trenes pelean la cabeza a 60+ km/h; el último lanzador se aparta a 200-250 m; el sprinter abre a 200-250 m si tiene tren, antes o después si no; el que abre a 350 m se hunde; el que abre a 120 m ya no pasa; la colocación desordena a los que no tienen tren.
- **Lo que hace hoy el motor**: `elTren` (el turno son SOLO los lanzadores en ≤ 3 km, D-03), régimen `sprintRegimeKmh` 51 → 63 km/h con 3 trenes, lanzadores queman cerillo (D-28), `sprintHoldMetres`, `launchEffect` pronto/tarde, `placementSd` con alivio por tren y TAC, `leadOutBoostPerHelper` +5 %/+10 %, `commitmentForSpeed` («EL SPRINT ERA GRATIS»). El tren gana 42 de 60. **CUBIERTO**.
- **Lo que dijo el dueño**: «cuando llegue un pelotón al sprint me gustaría que el último km se gestionase un poco diferente: un sprinter que tenga a sus lanzadores tirando del pelotón le ayudan a colocarse; ojo, aquí van súper a muerte, velocidades realmente de vértigo… Puede haber varios equipos con sus lanzadores al mismo tiempo, aunque no necesariamente con el mismo éxito» (comentario 4814-4818); «Tren del sprint ≥ 300 m de 48 a 62 km/h» (SPEC 6.17).
- **Información necesaria**: mis lanzadores en el grupo (sí), rivales con tren (no directamente; sí vía régimen), km. Lo tiene.
- **Cómo se mediría**: `flat.bestSprinterWinPct` 30-45 %; `smallTours.sweepPct` 0-30 % y `photoRepeatTopFive` (bandas existentes); velocidad del último km con ≥ 2 trenes: 58-66 km/h (banda propuesta).

### [FASE-46] Sprint de grupo reducido sin lanzadores: «todos se miran y uno se lanza»

- **Cuándo**: fuga de 3-12 que llega; grupo de favoritos en el llano tras el puerto.
- **Quién decide**: cada uno (cuándo abrir), el que sabe que pierde (lanza largo desde 400 m).
- **Lo que pasa en carretera**: nadie quiere tirar en el último km, el grupo se frena a 40 km/h, el peor sprinter lanza a 400-500 m para sorprender, el mejor espera a 200 m; a veces gana el largo si los demás dudan.
- **Lo que hace hoy el motor**: `sprint_reducido` (SPR 0,5/LLA 0,15/TAC 0,25/RES 0,1); `launchStandoffM` 55 m de sesgo sin tren (×0,6 si alguien lanza), `launchSdBase` 55 m escalado por TAC, `launchEffect`; «Grupo de 2-14 ya resuelve por `sprint_reducido`» (v45). **CUBIERTO**.
- **Lo que dijo el dueño**: «fíjate cómo funciona un sprint sin lanzadores, por ejemplo en una fuga, donde puede haber un momento en el que todos se miran y de repente uno se lanza… pero si se lanza demasiado temprano puede no llegar, y si se lanza demasiado tarde igual ya no sobrepasa al que se lanzó antes» (v39 §5); «o incluso si llegase un grupo de 2 en llano… lo que se forma entre ellos por ganar es un sprint» (v45).
- **Información necesaria**: remate de cada uno vs el grupo (sí), TAC (sí). Lo tiene.
- **Cómo se mediría**: % de sprints reducidos (3-8) ganados por quien NO es el mejor SPR del grupo: 25-45 % (banda propuesta: el sprint de fuga es más caótico que el masivo).

### [FASE-47] Dos compañeros en el grupo de cabeza pequeño: uno lanza (o ataca) para el otro

- **Cuándo**: grupo de 2-8 con dos del mismo equipo, últimos 10 km.
- **Quién decide**: el equipo (quién es la carta), los dos compañeros.
- **Lo que pasa en carretera**: el peor rematador ataca a 5-8 km para que los rivales gasten cerrando; si le cazan, el compañero contraataca o sprinta a rueda; en el último km el peor lanza al mejor. No se disputan el sprint entre ellos.
- **Lo que hace hoy el motor**: `finishStage` no recibe `teamOf` (mapa-equipo §7.4: «Dos compañeros en un grupo pequeño NO tienen ninguna ventaja»); `finishRoleWeight` 0,88 al gregario (parche v48); `tactics.ts` sin `teamId` (dos compañeros pueden atacarse mutuamente). **AUSENTE** (parcheado por rol).
- **Lo que dijo el dueño**: «no tiene sentido que luchen el sprint 2 del mismo equipo (y encima les gana el otro!!!). Si hubieran colaborado quizás hubieran ganado uno de ellos» (v48); tactica.md B1: «se relevan entre ellos y le hacen relevos cortos al rival; uno ataca antes del final».
- **Información necesaria**: compañero en el grupo, quién remata mejor de los dos, km. Falta «compañero en el grupo» en táctica y meta.
- **Cómo se mediría**: banco de carrera pequeña: cuando dos del mismo equipo llegan en un grupo de 2-8, % de veces que el mejor SPR del par queda por detrás del peor: ≤ 10 %; % de veces que uno de los dos atacó en los últimos 10 km: 40-70 % (bandas propuestas).

### [FASE-48] La llegada del solitario y el sprint por la segunda plaza

- **Cuándo**: fuga o ataque que llega solo con ≥ 10 s.
- **Quién decide**: el solitario (dosificar, no arriesgar en el último km), el grupo de detrás (sprint por el 2.º puesto, o no si son los de la general).
- **Lo que pasa en carretera**: el solitario levanta el pie en los últimos 300 m (celebra); el grupo perseguidor disputa la segunda plaza normalmente (y las bonificaciones de 2.º y 3.º si las hay); si el grupo de detrás es el de los favoritos y no hay bonis, algunos no sprintan.
- **Lo que hace hoy el motor**: grupos ordenados por reloj; dentro de cada grupo `finishScore` por tipo (`finishType(terrain, members)`); `timeBonuses` por puesto. **CUBIERTO** en lo mecánico. No hay «no sprintar» del hombre de la general (irrelevante para el resultado salvo bonis).
- **Lo que dijo el dueño**: —.
- **Información necesaria**: —.
- **Cómo se mediría**: nada específico; se comprueba que el margen del solitario en meta no se reduce artificialmente en el último km (mediana de `peakGap − gap final` en el último km ≤ 3 s).

### [FASE-49] Final en alto: el último kilómetro entre favoritos (y el gregario que se aparta)

- **Cuándo**: `finishType 'alto'`, último km.
- **Quién decide**: los 3-8 favoritos que quedan (atacar a 1 km, esperar al sprint en cuesta), el maillot (no arriesgar).
- **Lo que pasa en carretera**: el último gregario se aparta a 2-3 km; entre favoritos hay 1-3 ataques en los últimos 2 km; el que va al límite se sienta y pierde 20-40 s en 1 km; el sprint en cuesta lo gana el más fresco (RES) más que el más explosivo.
- **Lo que hace hoy el motor**: `ataque_final` hasta `tacticNoAttackKm` 3 (no en los últimos 3 km); `finishScore 'alto'` MON 0,6/COL 0,2/RES 0,15/TAC 0,05 con eff EROSIONADO; deriva y reserva hasta la línea. **PARCIAL** (los ataques del último km-2 km no existen; los tiempos sí).
- **Lo que dijo el dueño**: regla 9; «una reina real deja llegar juntos a un grupo de 5-15 y no 1» (v23 encargo, premisa corregida en v26: «el “1” del motor era realista para un final en alto»).
- **Información necesaria**: mi frescura vs los demás (sí), colchón (sí), km (sí).
- **Cómo se mediría**: `mountain.top10GapSeconds` suelo 40 (**del dueño**); grupo de cabeza ≤ 30 s en final en alto: 1-4 corredores (Tour 2024: 1·1·1); % de finales en alto con un ataque nacido a ≤ 3 km: 30-60 % (banda propuesta, hoy imposible).

### [FASE-50] La fuga cazada en el último puerto / valle y el contraataque inmediato

- **Cuándo**: captura de la fuga del día a 5-30 km de meta.
- **Quién decide**: los frescos del pelotón (contraatacan en el momento de la captura: «el momento más peligroso»), los trenes (cerrar), el fugado cazado (se sienta).
- **Lo que pasa en carretera**: en el km de la captura el pelotón afloja 30 s y salen 2-4 contraataques; en llano los trenes cierran; en media montaña el contraataque de un puncheur/rodador fuerte a 15 km gana un 10-20 % de las veces. El fugado cazado queda «gastado» y no vuelve a atacar.
- **Lo que hace hoy el motor**: tras la captura `moves.length` baja, `chaseAbandoned` se resetea; `kind` desde el pelotón: `ataque_final` si ≤ 12 km o puerto decisivo, si no `contraataque` λ 0,02/km (muy bajo) / `puente`; el cazado tras ≥ 15 km fuera queda `gastado` hasta `km + min(fuera·0,5, 80)` (D-29). Sin «bache» tras la captura. **PARCIAL** (dentro de 12 km sí; a 13-30 km casi nada).
- **Lo que dijo el dueño**: «el wey que iba en la primera fuga solo y que debería haberse desgastado mucho, le pillaron… y más adelante vuelve a escaparse como si nada» (v42); «Se puede atacar para enganchar al grupo de delante… Y a veces no se llega» (regla 7).
- **Información necesaria**: km de la captura (sí), frescura de cada uno (sí), tipo de final (sí), trenes presentes (vía régimen).
- **Cómo se mediría**: en `media-190` y `llana-180`, cuando la fuga del día se caza a 13-30 km: % de etapas con ≥ 1 movimiento nuevo en los 3 km siguientes: 50-80 %; % ganadas por ese contraataque en media montaña: 10-25 % (bandas propuestas).

---

## H. TRANSVERSALES DE FASE que el rediseño debe fijar

### [FASE-51] Las «fases» como estado explícito del motor (salida / fuga / control / caza / aproximación / decisión / desenlace)

- **Cuándo**: siempre; es el reloj táctico de la etapa.
- **Quién decide**: el motor (deriva la fase de la carretera) y, dentro, cada actor con la lógica de esa fase.
- **Lo que pasa en carretera**: los ciclistas saben en qué fase están («todavía no ha empezado la carrera», «ahora hay que estar delante», «esto ya es el final») y las conductas cambian de golpe, no por interpolación de constantes.
- **Lo que hace hoy el motor**: la fase es IMPLÍCITA, repartida en umbrales independientes: `tacticSettleKm` 5 (arranque), `tacticBreakWindowFraction` 0,55 (ventana de fuga del día), `chaseAnnounceFrac` 0,4, `climbRaceKmToGo` 30 (puerto decisivo), `finalDriveKm` 15 (tirón), `lateAttackKm` 12 (ataques tardíos), `tacticInsideAttackKm` 18, `giveUpKm` 25 (dejarse ir), `sprintTrainKm` 3 (tren), `tacticNoAttackKm` 3 (fin de ataques), `helpBackMinKmToGo` 5, `grupetoWaitMinKmToGo` 10, `pavesApproachKm` 2, `descentSelectKm` 1, `finalBlocks` (caídas). Una decisión cada 10 bloques para el pelotón; la táctica cada bloque. **PARCIAL** (existe como umbrales sueltos, no como estado que todos lean).
- **Lo que dijo el dueño**: «Yo creo que tienes que hacer un break y REPENSAR TODA la lógica de todas las situaciones que pueden ocurrir en carrera y hacer unas NUEVAS reglas» (tactica.md); mapa-spec §9.2: el rediseño anterior no dice «con qué frecuencia decide (bloque, km, fase)».
- **Información necesaria**: km, perfil restante, tipo de final, si hay fuga y a cuánto, si el puerto que viene decide. Todo existe.
- **Cómo se mediría**: coherencia interna: 0 casos en que dos umbrales de fase se contradigan (p. ej. `lanzar` activo con `ataque_final` en puerto); y las bandas de cada fase anteriores.

### [FASE-52] Memoria de la etapa anterior sobre las fases de hoy

- **Cuándo**: día 2+ de una vuelta: ayer reina → hoy transición tranquila; ayer ganó X → hoy le marcan; ayer tiró 100 km el equipo Y → hoy se esconde.
- **Quién decide**: pelotón (humor), equipos (presupuesto real), corredores (cerillos: `−1 si ayer terminó bajo el 12 %`).
- **Lo que pasa en carretera**: la etapa después de la reina se corre lenta; el equipo que quemó a sus gregarios ayer no controla hoy; al ganador de ayer se le mira.
- **Lo que hace hoy el motor**: solo `matches −1` si ayer acabó bajo el 12 % del depósito (`stageRun.ts`), `energy0` vía TSB, `gcRank`/`gcDeficitSeconds`. `autoOrders` cambia el rol por `gcRank`. «Hoy el motor no arrastra NADA de un día para otro en lo táctico» (tactica.md D1). **AUSENTE**.
- **Lo que dijo el dueño**: «3 etapas seguidas de montaña y las 3 las gana el mismo ciclista» (E3); «el mismo gana dos etapas seguidas» (tactica.md §1).
- **Información necesaria**: `StageInput` debería traer: kind de ayer, ganador de ayer, trabajo al frente de cada equipo ayer, `mishapKm` de ayer. `packages/db` lo sabe.
- **Cómo se mediría**: en `grandTour`: velocidad media de la etapa siguiente a la reina − media de las llanas: −0,5 a −2 km/h; `smallTours.sameWinnerPairPct` (banda existente); ataques seguidos al ganador de ayer / a los demás ≥ 1,3 (banda propuesta).

---

## Resumen por estado (52 situaciones)

- **CUBIERTO** (18): FASE-01, 02, 03 (mecánica), 06, 10, 12, 15, 16, 18, 26, 27, 34, 37 (descenso corto), 40, 42, 45, 46, 48.
- **PARCIAL** (23): FASE-04, 05, 07, 08, 11, 14, 17, 19, 21, 23, 24, 25, 28, 29, 30, 32, 38, 39, 41, 44, 49, 50, 51.
- **AUSENTE** (9): FASE-13, 20 (conducta), 22, 31, 35, 36, 47, 52, y la «segunda fuga» de FASE-09.
- **CONTRARIO** (3, total o en parte): FASE-09 (λ tras captura temprana), FASE-33 (quién ataca en la fuga en el puerto: el peor rematador en vez del mejor escalador), FASE-43 (ningún ataque posible en los últimos 3 km).

Datos que faltan al motor y que varias fases necesitan a la vez: (1) posición dentro del grupo / colocación fuera del abanico y la meta (FASE-22, 23, 24, 25, 44); (2) `teamId` y «compañeros en mi grupo / delante / detrás» dentro de `tactics.ts` y `finish.ts` (FASE-04, 14, 30, 31, 39, 41, 47); (3) clasificaciones secundarias y bonificaciones intermedias en `StageInput` (FASE-19, 20, 21); (4) memoria del día anterior (FASE-11, 52); (5) «km al próximo obstáculo» para subidas como ya existe para pavés (FASE-22); (6) tramos expuestos al viento y estrechamientos en el perfil (FASE-24, 25); (7) avituallamientos en el perfil (FASE-13); (8) la fase como estado explícito (FASE-51).
