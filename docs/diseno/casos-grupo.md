# Catálogo de situaciones — LENTE «GRUPO»: composición del grupo y superioridad numérica

Lente: qué cambia en la conducta de un grupo (fuga, grupo de favoritos, grupo perseguidor, grupeto, abanico, corredor solo) según **cuántos son, de qué equipos son y qué tienen delante y detrás**. Para cada situación se dice cómo entra en el **TURNO DE RELEVOS** (`relayDuty`/`relayTurn`, D-01/D-02), en los **ATAQUES dentro del grupo** (`attemptFrom`/`ataque_grupo`/`ataque_final`, D-22/D-24) y en el **REMATE** (`finishStage`/`finish.ts`, que hoy no recibe `teamOf` ni `teamPlans`: Grep `teamId` en `stage/finish.ts`, `tactics.ts`, `marcaje.ts`, `group.ts` → 0 resultados en los cuatro, comprobado el 2026-09-09).

Fuentes: los seis mapas de `scratchpad/diseno/` (requisitos del dueño, spec, decisiones de `simulate.ts`, `tactics.ts`, plan de equipo/órdenes/final, atributos) y comprobaciones puntuales con Grep en `packages/engine/src`. Las decisiones se citan como D-NN según `mapa-simulate-decisiones.md`. Estado: **CUBIERTO / PARCIAL / AUSENTE / CONTRARIO**.

Hechos del motor que atraviesan toda la lente (para no repetirlos en cada ficha):

- **H1.** Dentro de un grupo que no es el pelotón (`isBunch` falso) el empuje de equipo vale 0 (`driveOfRider → 0`, D-04): «el plan de equipo decide qué hace el equipo CON EL PELOTÓN; dentro de una fuga se relevan todos». La única noción de equipo dentro de una fuga es NEGATIVA y viene de fuera: `sittingOn` (mi equipo persigue detrás, v33), `jefeEnApuros` (mi hombre de la general va detrás, v58), `tieneHombreDelante` (grupo de caza con compañero delante, v41).
- **H2.** El listón del turno fuera del pelotón es `relayDutyThresholdLoose = 0`: entra al turno todo el que tenga deber > 0, hasta `min(members, relayRotationMax 20, ceil(paceFraction·members))`. Lo único que saca a alguien del turno es `sinOpciones` (`noChanceToWin`, D-07), `sittingOn` y `relayRaceLeaderPenalty` (solo `gcRank === 1`).
- **H3.** `MoveRider` no lleva `teamId`; el equipo llega a la táctica como el escalar `teamAttack` (0,4 / 0,7 / 0,85 / 1,4), idéntico para todos los miembros del equipo. `followProbability` no salta más a la rueda del jefe ni menos a la de un rival; `chooseInstigator` puede sacar a dos compañeros en el mismo movimiento o uno contra otro; `moveCooperation(size, meanFinishRank, tension, rng)` no sabe cuántos equipos hay en la fuga.
- **H4.** `ataque_grupo` exige `tacticInsideAttackMinRiders = 3` (`simulate.ts:4761`): **en un grupo de dos nadie ataca nunca**; y solo si `kmToGo ≤ 18` o `tension ≥ 25`.
- **H5.** La cooperación de un movimiento se remide cada 2 km hacia `restCommit·(1 − 0,6·interésPropio.media)` (D-27). Para un corredor solo, `media = 0` → rueda a `restCommit` (0,58-0,72 al nacer), mientras el pelotón en tirón final va a 0,85 (`finalDriveCommit`). No consta en los mapas ningún empuje de remate para un movimiento en los últimos km.
- **H6.** `finishStage` ordena dentro de cada grupo por `finishScore × ruido × finishRoleWeight × peaje de trabajo × tren (solo lanzadores con `targetRiderId`explícito y`pullWindow ≥ 0,4`) × lanzamiento × colocación`. No hay término de compañeros, ni «dejar ganar», ni «lanzamiento improvisado» sin rol `lanzador`; `autoOrders` da UN lanzador por equipo y solo en llana.
- **H7.** `pelotonAllows` (la aduana) ve tamaño del grupo, `breakAppeal`, km y déficit de general del más cercano al maillot; **no ve qué equipos van en la fuga**. `teamAttackUpTheRoad = 0,4` es «binario y flojo» (tactica.md A1-A2); no hay cupo por equipo ni «esta fuga no me vale».

---

## A. Por tamaño del grupo

### [GRUPO-01] El corredor solo en cabeza de carrera (fuga de uno)

- **Cuándo**: cualquier terreno; nace de un ataque sin seguidores, de una fuga que se deshace, o de un `ataque_final` que abre hueco. Se distingue por la distancia a meta: lejos (> 40 km) o en el desenlace (< 15 km).
- **Quién decide**: el propio corredor (y su director por radio: «sigue» / «espérate al grupo»).
- **Lo que pasa en carretera**: paga todo el viento. Lejos de meta un solitario **no tira a tope**: rueda a ritmo de fondo esperando que le lleguen compañeros de fuga (el contraataque) o que el pelotón se despiste; si en 10-15 km no viene nadie y el pelotón cierra, se sienta y espera. En el desenlace es lo contrario: se vacía. Variantes: (a) solitario de una fuga numerosa que se ha ido en el último puerto (va a tope, marca la diferencia de la etapa); (b) el «publicitario» de las carreras pequeñas que se va en el km 5 (rueda cómodo, se deja coger cuando quiere). _Relevos_: no hay turno (uno). _Ataques_: no aplica (`members ≥ 2`). _Remate_: `solitario` si llega solo; si le cogen a 2 km, remata fundido.
- **Lo que hace hoy el motor**: física CUBIERTA (`shelterOf` = 0 para el que va solo; `finishType` → `solitario` si `groupSize ≤ 1`; `attemptFrom` exige ≥ 2). Conducta PARCIAL/CONTRARIA en el desenlace: el solitario rueda a `restCommit` heredado del grupo del que nació (H5) y no se reevalúa ni sube en los últimos km; `bridge_failed` lo devuelve a `restCommit` (D-25). No existe «me espero al grupo de detrás» (el `move` solo desaparece cuando lo cazan, D-46/D-47). `interésPropio` con un solo miembro da 0 y por tanto nada le frena ni le empuja.
- **Lo que dijo el dueño**: «si va en cabeza de carrera lo normal es que no se deje caer, pero que tampoco tire de la fuga (salvo que vaya solo, claro está)» (v37). Sobre el remate en solitario: foto pedida para media montaña «por delante uno o dos» y «ganador en solitario 20-30 %» (v38-2 §16).
- **Información necesaria**: distancia a meta; hueco sobre el grupo de detrás y si ese grupo cierra o no (`vActual`, tendencia del hueco: el motor la tiene en `peakGapS/peakGapKm`); si viene alguien puenteando (existe `puente` con `targetId`); su depósito; si su equipo va a lanzar un contraataque (no existe como plan). Hoy tiene los relojes pero no los lee para su compromiso.
- **Cómo se mediría**: (1) sobre la media-montaña canónica y `smallTours`, compromiso medio de un `move` de 1 corredor por tramo de kmToGo (> 40 / 15-40 / < 15): banda razonable ≥ 0,90 en < 15 km (a la altura del tirón del pelotón) y 0,55-0,70 lejos; (2) `% de etapas con ganador en solitario` en media montaña: **20-30 % (banda del dueño)**, hoy 4 %.

### [GRUPO-02] Fuga de dos

- **Cuándo**: pareja que se va en el arranque de una llana modesta; pareja que sobrevive de una fuga mayor; los dos primeros de un final en alto; pareja formada por un puente que llega.
- **Quién decide**: los dos, en negociación implícita.
- **Lo que pasa en carretera**: relevos 50/50 mientras la meta está lejos. Si uno remata claramente mejor (sprinter contra rodador), a partir de ~15-20 km el peor rematador **deja de relevar o ataca** (la única forma que tiene de ganar), y el mejor tiene que elegir entre tirar solo (llega fundido pero llega) o dejarse coger. Si son parecidos, relevan hasta 1 km y se «miran» en el último km: el que va detrás en el último relevo lleva la rueda y ventaja. Variante: pareja de compañeros → GRUPO-32. _Relevos_: 50/50 → asimetría desde 15-20 km según remate. _Ataques_: el peor rematador ataca en el último repecho/últimos 3-5 km. _Remate_: `sprint_reducido` de dos; el efecto «rueda» es decisivo.
- **Lo que hace hoy el motor**: relevos PARCIAL: `noChanceToWin` (D-07) saca al peor del turno con `cerca = 0,25 + 0,75·(1 − lejos)` (lejos lineal 15-80 km), así que el peor deja de tirar gradualmente y el mejor rueda solo: correcto en dirección. Ataques **AUSENTE por diseño**: `tacticInsideAttackMinRiders = 3` (H4) impide cualquier ataque en pareja. Remate PARCIAL: `finishType(terrain, 2)` = `sprint_reducido`, sin término de rueda ni de «quién dio el último relevo»; `launch` sí modela pronto/tarde para dos.
- **Lo que dijo el dueño**: «o incluso si llegase un grupo de 2 en llano… lo que se forma entre ellos por ganar es un sprint» (v45). «fíjate cómo funciona un sprint sin lanzadores, por ejemplo en una fuga, donde puede haber un momento en el que todos se miran y de repente uno se lanza» (v39 §5).
- **Información necesaria**: remate relativo de los dos para el final concreto (el motor lo tiene: `finishScore` por tipo); distancia a meta; hueco con el pelotón y si cierra (para saber si atacar al compañero de fuga es suicida); cerillos de cada uno. Todo existe en `simulate.ts`, nada llega a la decisión de ataque en pareja.
- **Cómo se mediría**: banco «fugas que llegan de 2» (filtro sobre `smallTours` + llana canónica): (a) % de parejas en las que el peor rematador ataca en los últimos 10 km: banda 40-70 % (si el remate difiere ≥ 8 puntos, casi siempre; si difiere < 4, casi nunca); (b) % de victorias del mejor rematador de la pareja: 60-75 % (hoy debería medir cerca del 85-90 % por ausencia de ataques y de rueda).

### [GRUPO-03] Fuga de tres

- **Cuándo**: la fuga «de tres» es la más habitual en carreras pequeñas y en la última hora de una media montaña.
- **Quién decide**: los tres.
- **Lo que pasa en carretera**: es el tamaño en que empiezan la sociología y los ataques: dos «se miran» y el tercero se va; el peor rematador ataca a 5-8 km; el que tiene el mejor sprint deja que los otros dos gasten en cerrar. Si dos son compañeros → GRUPO-07/08/09. _Relevos_: equilibrados hasta ~20 km, luego el peor rematador se esconde. _Ataques_: el peor rematador, en el último repecho; el mejor NO cierra él (deja al tercero). _Remate_: `sprint_reducido` de tres; el que cerró el ataque llega gastado.
- **Lo que hace hoy el motor**: ataques CUBIERTO en forma (`ataque_grupo` con `1 + 1,5·(1 − finishRank)`: el peor tiene 2,5× las ganas), relevos PARCIAL (`noChanceToWin`), pero **quién cierra** el ataque es `followProbability` por TAC/rol/energía, no por interés (el mejor sprinter salta con la misma probabilidad que el tercero) → GRUPO-20. Remate sin memoria de quién cerró (solo el peaje `work` relativo al grupo, tope ±15 %).
- **Lo que dijo el dueño**: «Dentro de una fuga se sigue atacando, sobre todo si es numerosa, y sobre todo… los que peor rematarían al sprint… en los últimos km» (regla 6, §13.1). Caso visto: «dos compañeros en una fuga de tres y gana el otro» (tactica.md §1).
- **Información necesaria**: remate relativo de los tres; **quién es compañero de quién**; quién ha cerrado ya un ataque (memoria de cerillos gastados por otros, hoy solo `matches` propio); hueco con el pelotón.
- **Cómo se mediría**: sobre los grupos de 3 que llegan a meta (banco `smallTours` + media montaña): % resueltos por ataque (llegada `solitario` con el grupo a ≥ 3 s) contra % resueltos al sprint: banda 35-55 % por ataque; y, con pareja de compañeros dentro, victoria de la pareja ≥ 65 % (ver GRUPO-07).

### [GRUPO-04] Fuga de 5-8 (la fuga del día clásica)

- **Cuándo**: la fuga que el pelotón deja ir en una llana o media montaña; el grupo que sobrevive a una selección; los supervivientes de una fuga de 15.
- **Quién decide**: cada uno de la fuga; sus directores.
- **Lo que pasa en carretera**: colaboración ordenada durante 100 km (relevos cortos, todos pasan), «cabeza y rueda» con quien no pasa. A 30-40 km empieza la política: el que tiene compañero detrás en el pelotón que persigue se sale del turno; los que no rematan atacan a partir de ~20 km; a 8-10 km **la colaboración se rompe**: nadie quiere tirar, se cruzan ataques, y el resultado es un solitario o un grupo de 2-3 que llega, no los 6 al sprint. _Relevos_: rotación completa → a partir de ~30 km salen el que tiene compañero detrás y el sprinter puro; a < 10 km casi nadie releva. _Ataques_: en cadena desde ~18 km, primero los peores rematadores, después los que quedan. _Remate_: si llegan juntos, `sprint_reducido`; lo normal es que no lleguen juntos.
- **Lo que hace hoy el motor**: relevos PARCIAL (H1/H2: relevan todos con listón 0, `noChanceToWin` los saca gradualmente; `sittingOn` v33 saca al del equipo perseguidor); ataques PARCIAL (`ataque_grupo` ≤ 18 km, λ 0,1/km → 0,5 dentro de 12 km, cooldown 4,5 km por grupo, tope 3 movimientos vivos); remate PARCIAL. La **ruptura de la colaboración cerca de meta es AUSENTE** y está anotada como deuda (v38-2 §16): «en un grupo de seis a 8 km de meta relevan los seis, incluido el que sabe que pierde el sprint».
- **Lo que dijo el dueño**: «en un grupo de seis a ocho kilómetros de meta relevan los seis, incluido el que sabe que pierde el sprint» (v39 §1); «Lo que sigue rojo es el ganador en solitario: 4 % contra el 20-30 % que pidió» (v38-2 §16). Regla 6 de §13.1.
- **Información necesaria**: remate de cada uno para ESTE final con este tamaño; quién es compañero de quién dentro; quién persigue detrás y con qué fuerza (existe: `frontTeamId`, `gear`); hueco y tendencia; cerillos de cada uno y quién los ha gastado (memoria de grupo, AUSENTE).
- **Cómo se mediría**: media-montaña canónica y `smallTours`: (a) tamaño del grupo ganador cuando la fuga del día gana: mediana 1-2 (hoy debería estar en 4-6); (b) `% de relevadores` en un `move` de 5-8 a ≤ 8 km: banda 20-50 % de los miembros (hoy ~100 %); (c) ganador en solitario 20-30 % (dueño).

### [GRUPO-05] Fuga numerosa de 15-20 (y más)

- **Cuándo**: media montaña y etapas de transición de grandes vueltas; llanas con viento; días en que el pelotón «echa la hueva».
- **Quién decide**: los de la fuga por equipos; el pelotón por lo que deja ir.
- **Lo que pasa en carretera**: no hay entendimiento entre 20: relevan 8-12, el resto va a rueda; se forma «la fuga de la fuga» a 40-60 km (3-5 se van; los demás, con compañeros delante, se sientan; los que no tienen a nadie persiguen y no llegan). Los equipos con dos o tres dentro mandan: uno releva, otro se guarda para el ataque. _Relevos_: tope de ~10-12 relevando aunque sean 20; por equipos («si hay 4 equipos colaborando, 5 de cada uno»). _Ataques_: desde 40-60 km (mucho antes que en la fuga de 6), por tensión y por número. _Remate_: casi nunca llegan los 20; el tipo de final lo marca el grupo que llega.
- **Lo que hace hoy el motor**: relevos CUBIERTO en el techo (`relayRotationMax 20`, techo `ceil(paceFraction·members)`), PARCIAL en el criterio (no reparte por equipos, H1); ataques PARCIAL: `tension` sube 0,4/km y a 25 (≈ 62 km de fuga) ×3 λ y abre `ataque_grupo` antes de 18 km — pero **la tensión no depende del tamaño ni del número de equipos**; `moveCooperation` resta 0,02 por hombre sobre 3 (clamp 0,35) y `pelotonAllows` resta 0,05·(1 − breakAppeal) por hombre sobre 3. El «con compañero delante me siento» dentro de la fuga que se rompe está CUBIERTO (`tieneHombreDelante`, v41, `kind === 'move'`).
- **Lo que dijo el dueño**: «yo creo que en general quizás deberíamos aplicar un máximo de unos 20 ciclistas; más de 20 pasando a los relevos es irreal… pero eso aplica tanto a una fuga de 25 en la que ya no hay entendimiento entre todos como al propio pelotón: si hay 4 equipos colaborando, pues 5 de cada uno» (`relayTurn`, comentario 683-686). Foto de media montaña: «un grupo grande, algunos por detrás en grupos, y por delante uno o dos» (v38-2 §16). Datos citados en `breakAppeal`: «Tour 2025 e12 52 corredores, Vuelta 2025 e12 53».
- **Información necesaria**: número de equipos representados y cuántos de cada uno (AUSENTE en `Move`); quién ha relevado cuánto (existe `frontWorkMove` pero nadie lo lee en decisiones); tensión por tamaño/equipos; km a meta y terreno que viene.
- **Cómo se mediría**: sobre `moves` de ≥ 15 (media montaña canónica, `grandTour` etapas de transición): (a) km a meta al que nace la primera «fuga de la fuga» (primer `ataque_grupo` que prospera): mediana 40-60 km (hoy acotado a 18 km salvo tensión); (b) relevadores simultáneos ≤ 12 y repartidos: ningún equipo con > 50 % del turno.

### [GRUPO-06] Fuga con demasiados del mismo equipo (el cupo)

- **Cuándo**: fase de formación de la fuga (primeros 30-50 km); también en un contraataque.
- **Quién decide**: el equipo que manda gente (no manda más de 1-2) y el pelotón (no deja ir una fuga con 3+ del mismo equipo salvo que sea un equipo sin interés).
- **Lo que pasa en carretera**: un equipo bot razonable pone UNO en la fuga (dos si es una etapa para la fuga y tiene dos rodadores); si saltan tres compañeros, uno se deja caer. El pelotón (los equipos de los sprinters/del maillot) **no da cuerda** a una fuga con tres de un equipo fuerte: la cazan y esperan otra. _Relevos_: no aplica en la formación. _Ataques_: `followProbability` de un compañero al ataque de su compañero debe ser baja (salvo plan de «dos en la fuga»). _Remate_: si prospera, el equipo con mayoría → GRUPO-12.
- **Lo que hace hoy el motor**: AUSENTE. `followProbability` no ve compañeros (H3); `pelotonAllows` no ve equipos (H7); `teamAttack` es igual para los ocho del equipo y no baja cuando ya hay uno delante (el escalar `fuga` 0,4 solo se aplica cuando la postura del equipo es `fuga`, es decir, cuando su CARTA ya va delante, D-10: un noveno hombre delante no cambia la postura si el equipo tiene carta). Caso visto por el dueño: «seis del mismo equipo en la fuga de nueve» (tactica.md §1, Race Wallonia/Italy).
- **Lo que dijo el dueño**: los seis casos de tactica.md §1 «dados por vistos» (seis del mismo equipo en una fuga de nueve). Sobre la aduana: «Especialmente si los equipos de los sprinters tienen a alguien metido en la fuga y entonces no van a tirar» (v38) — la cara contraria: quien ya tiene uno no manda más.
- **Información necesaria**: cuántos del equipo van ya en el `party`/en el movimiento (AUSENTE en `MoveRider`/`MoveContext`); composición por equipos de la fuga para la aduana; interés de cada equipo del pelotón en que esa fuga se vaya (GRUPO-33).
- **Cómo se mediría**: llana canónica (176 en 22 equipos) y `smallTours`: máximo de corredores de un mismo equipo en la fuga del día: P95 ≤ 2, máximo absoluto 3; % de fugas del día con ≥ 3 del mismo equipo ≤ 3 %.

---

## B. Superioridad numérica dentro de un grupo pequeño

### [GRUPO-07] Dos compañeros contra uno: los relevos

- **Cuándo**: fuga de tres con pareja; los tres primeros de un final en alto; trío tras una criba con viento.
- **Quién decide**: la pareja (su director) y el rival.
- **Lo que pasa en carretera**: la pareja se releva entre sí con relevos largos y hace **relevos cortos o nulos al rival**: lo obligan a tirar más de un tercio del tiempo; si el rival no tira, uno de los dos tira igual (la pareja sigue interesada en llegar). El rival, solo contra dos, o se sienta (GRUPO-10) o acepta. _Relevos_: reparto 40/40/20 o 50/50/0 según remate. _Ataques_: → GRUPO-08. _Remate_: → GRUPO-09.
- **Lo que hace hoy el motor**: AUSENTE. `relayDuty` no ve compañeros salvo el arropo (`protectedByTeam`: un `lider` con `gregario` que le apunta EN el grupo recibe −1,2 y el gregario 1,0, así que en la pareja jefe+gregario el gregario tira más: PARCIAL y solo con órdenes explícitas `gregario → targetRiderId`). Con dos `cazaetapas` del mismo equipo, `noChanceToWin` puede sacar al peor de los dos del turno en vez de hacerle tirar para el bueno (**CONTRARIO**: el mecanismo de «no puedo ganar» actúa contra el interés del equipo).
- **Lo que dijo el dueño**: «no tiene sentido que luchen el sprint 2 del mismo equipo (y encima les gana el otro!!!). Si hubieran colaborado quizás hubieran ganado uno de ellos» (v48). Caso: «dos compañeros en una fuga de tres y gana el otro» (tactica.md §1). Spec 6.10 ya prometía que el fugado mira «si su equipo defiende la general detrás».
- **Información necesaria**: `teamId` de los miembros del grupo (existe en `StageRider`, no llega a `MoveRider` ni a `relayDuty` como «compañeros presentes»); cuál de los dos remata mejor este final (`finishScore` existe); hueco con el grupo de detrás (para saber si pueden permitirse que el rival no tire).
- **Cómo se mediría**: nuevo filtro sobre `smallTours`/media montaña: grupos de 3 en los últimos 20 km con exactamente una pareja: (a) fracción de km al frente del rival ≥ 33 % (hoy ~33 % por reparto uniforme; la banda buena es 35-50 %, es decir, el rival paga más que su parte); (b) victoria de la pareja **≥ 65 %** (la superioridad numérica en un trío decide ~2 de cada 3 en carretera).

### [GRUPO-08] Dos contra uno: el ataque alternado y «el peor ataca antes si el rival remata mejor»

- **Cuándo**: mismos grupos que GRUPO-07, en los últimos 10-15 km (o el último repecho).
- **Quién decide**: la pareja.
- **Lo que pasa en carretera**: si el rival remata mejor que ambos, el compañero **peor rematador ataca primero** (a 8-10 km o en el repecho): si el rival cierra, ataca el otro; si el rival no cierra, el que atacó gana. Si el rival remata peor, la pareja no ataca: le llevan al sprint y lanzan (GRUPO-09). Si el rival remata entre los dos, ataca el peor de la pareja para que el mejor llegue a rueda del rival. _Relevos_: el que no ataca se pega a la rueda del rival y no tira. _Ataques_: en cadena; el compañero NUNCA salta a la rueda de su compañero. _Remate_: el que queda con el rival remata a rueda.
- **Lo que hace hoy el motor**: AUSENTE (H3: `chooseInstigator` puede elegir a cualquiera de la pareja sin mirar al rival; `followProbability` hace que el compañero salte al ataque de su compañero igual que el rival; no hay memoria «ya atacó mi compañero»). `ataque_grupo` sí favorece al peor rematador del grupo (2,5×), pero «peor del grupo», no «peor de la pareja respecto al rival».
- **Lo que dijo el dueño**: los mismos que GRUPO-07; tactica.md B1 lo enuncia («se relevan entre ellos y le hacen relevos cortos al rival; uno ataca antes del final») y el mapa de la spec §9.6 anota que «no dice cómo entra en el turno de relevos, ni en `ataque_grupo`, ni en el remate».
- **Información necesaria**: compañeros presentes y rival(es); orden de remate de los tres para este final; quién ha atacado ya (memoria por grupo); cerillos del rival (¿ya gastó?).
- **Cómo se mediría**: mismo filtro que GRUPO-07: (a) % de ataques en tríos con pareja lanzados por un miembro de la pareja: 70-90 %; (b) % de veces que el compañero salta al ataque de su compañero: ≤ 5 % (hoy igual que un rival, ~20-40 % según TAC).

### [GRUPO-09] Dos contra uno: «yo te lanzo» (lanzamiento improvisado en grupo reducido)

- **Cuándo**: último km de un grupo de 2-14 con al menos una pareja de compañeros (y en el sprint reducido de 8-14 tras una criba).
- **Quién decide**: la pareja.
- **Lo que pasa en carretera**: el peor rematador lleva al mejor hasta los 200-250 m a toda velocidad (impide que el rival se lance antes y le da la rueda). Un gregario o un rodador hacen esto sin necesidad de rol «lanzador»; es lo natural en un grupo reducido. El lanzador acaba último del grupo. _Relevos_: el último km lo hace entero el lanzador. _Ataques_: ninguno (ya se ha decidido lanzar). _Remate_: el lanzado remata con +5-10 %; el lanzador cede.
- **Lo que hace hoy el motor**: AUSENTE salvo con órdenes explícitas: `leadOutFor`/`lanzaPara` solo con rol `lanzador` + `targetRiderId` (H6); `autoOrders` solo da un lanzador en `llana` y apuntando al sprinter del equipo; `finishStage` no recibe `teamOf`. `finishRoleWeight` (gregario/lanzador 0,88) fue la respuesta de v48 — un castigo por rol, no una mecánica de colaboración («LO PRIMERO QUE SE MIDIÓ FUE FALSO… De los seis casos de dos compañeros en el top-3, ninguno llevaba un lanzador dentro. Eran gregarios», constants.ts ~3460).
- **Lo que dijo el dueño**: «no tiene sentido que luchen el sprint 2 del mismo equipo (y encima les gana el otro!!!). Si hubieran colaborado quizás hubieran ganado uno de ellos» (v48). «un sprinter que tenga a sus lanzadores tirando del pelotón le ayudan a colocarse» (v39 §5).
- **Información necesaria**: compañeros en el grupo de llegada; remate relativo; que `finishStage` reciba `teamOf` (o un mapa `lanzaPara` derivado en carretera y no solo de las órdenes). Todo está en `simulate.ts`; nada de ello entra en `finishStage`.
- **Cómo se mediría**: `smallTours` + media montaña: en grupos de 2-14 con pareja: (a) victoria del mejor rematador de la pareja frente al mejor rival con remate equivalente (±3 puntos): 60-70 %; (b) % de casos con dos compañeros en el top-3 de un grupo reducido ≤ 10 % (hoy 27,3 % de gregarios en podio tras v48; el objetivo no es «menos gregarios en el podio» sino «no dos del mismo equipo peleando»).

### [GRUPO-10] El rival solo contra dos: qué hace él

- **Cuándo**: los mismos tríos; también 1 contra 3 en un cuarteto.
- **Quién decide**: el corredor en minoría.
- **Lo que pasa en carretera**: tres opciones según remate: (a) si remata mejor que ambos: **se sienta** («que tiren ellos») y solo cierra el ataque del bueno, no el del malo; (b) si remata peor: ataca él primero, lejos, para que la pareja tenga que perseguir; (c) si el pelotón viene cerca: colabora igual porque perder la fuga es peor que perder el sprint. _Relevos_: se escaquea sistemáticamente. _Ataques_: elige a quién cerrar. _Remate_: si llega, va a rueda del lanzado.
- **Lo que hace hoy el motor**: AUSENTE: `noChanceToWin` mira solo su remate contra el mejor del grupo; no ve que los otros dos son compañeros; `followProbability` no distingue a quién cerrar.
- **Lo que dijo el dueño**: «si hay 1 wey que no pasa a cooperar en la escapada, los otros quizás quieran desgastarse menos y entonces tirar menos fuerte para no desgastarse para que ese wey que va ahí sin gastar energía se la lleve» (comentario 4787-4790, v39) — el contagio de la no-cooperación.
- **Información necesaria**: composición por equipos del grupo; remate relativo; hueco con el grupo de detrás y su tendencia.
- **Cómo se mediría**: filtro tríos con pareja: km al frente del rival cuando es el mejor rematador: ≤ 20 % (se sienta); cuando es el peor: ataques del rival antes de 10 km ≥ 50 %.

### [GRUPO-11] Tres equipos con dos cada uno (el grupo de seis por parejas)

- **Cuándo**: grupo de cabeza de una media montaña o clásica, o fuga del día en una carrera de pocos equipos (`smallTours`).
- **Quién decide**: los tres directores.
- **Lo que pasa en carretera**: equilibrio inestable: cada pareja mete un hombre al turno y guarda al otro; los tres guardados se miran; a 10-15 km una pareja rompe el pacto (su peor rematador ataca), las otras dos cierran con el hombre que tiraba, y en meta sprintan los tres guardados con sus lanzadores. Si una pareja tiene al mejor sprinter, las otras dos atacan por turnos para que sea su pareja quien gaste. _Relevos_: uno por equipo. _Ataques_: cruzados, por parejas. _Remate_: tres lanzamientos.
- **Lo que hace hoy el motor**: AUSENTE (H1, H3, H6). Hoy relevan los seis a igual deber, atacan por remate individual y rematan sin equipo.
- **Lo que dijo el dueño**: «si hay 4 equipos colaborando, pues 5 de cada uno» (reparto del turno por equipos, comentario 683-686). Sin cita específica del caso de seis.
- **Información necesaria**: composición por equipos del grupo; cuál de cada pareja es la carta (el equipo lo sabe: `stageCandidateId`, pero la carta se elige para el campo entero, no para este grupo); qué han gastado.
- **Cómo se mediría**: filtro «grupos de 4-8 con ≥ 2 parejas» sobre `smallTours`: (a) reparto del turno: cada equipo ≤ 1,2 relevadores medios simultáneos por pareja; (b) el que releva más de una pareja no es el que mejor remata de la pareja en ≥ 75 % de los bloques.

### [GRUPO-12] Un equipo con mayoría en la fuga (3 de 5, 4 de 7)

- **Cuándo**: fugas de equipo (clásicas, etapas de transición con un equipo fuerte «en modo fuga»), grupos tras un abanico, final en alto con un equipo dominante.
- **Quién decide**: el equipo con mayoría.
- **Lo que pasa en carretera**: mandan: fijan el ritmo (uno tira siempre), los demás rivales no pueden atacar sin que un compañero cierre; a falta de 10-20 km atacan **por turnos** (uno tras otro: el rival que cierre uno se come el siguiente) y lo normal es que gane uno de la mayoría, a menudo el que ataca segundo o tercero. Los rivales en minoría se sientan y esperan el sprint o se van con el primer ataque. _Relevos_: casi todo el trabajo lo hace la mayoría (les interesa llegar). _Ataques_: en cadena por parte de la mayoría; los rivales no atacan (no pueden). _Remate_: si llegan juntos, lanzan al mejor.
- **Lo que hace hoy el motor**: AUSENTE (H3). Hoy `chooseInstigator` puede elegir a un miembro de la mayoría y `followProbability` hace que sus propios compañeros le salten a la rueda; `noChanceToWin` saca del turno a los peores de la mayoría en vez de hacerlos tirar para el bueno (CONTRARIO en el turno).
- **Lo que dijo el dueño**: los seis casos de tactica.md §1 (seis del mismo equipo en la fuga de nueve: «y gana el otro»).
- **Información necesaria**: composición por equipos del grupo; carta del equipo EN ESTE GRUPO; remate de los rivales; quién ha atacado ya.
- **Cómo se mediría**: filtro «grupos de 4-8 en meta con un equipo con ≥ 50 % de los miembros»: victoria del equipo mayoritario **≥ 75 %**; ataques del equipo mayoritario en los últimos 20 km ≥ 2 de media; ataques de los minoritarios ≤ 0,5.

### [GRUPO-32] Pareja de compañeros en una fuga grande: uno trabaja, otro se guarda

- **Cuándo**: fuga de 8-20 con dos del mismo equipo; también dos del mismo equipo en un grupo perseguidor.
- **Quién decide**: el equipo (director).
- **Lo que pasa en carretera**: el equipo decide cuál es su carta en este grupo (el mejor rematador del final que viene) y el otro **paga por los dos**: releva más, cierra los ataques que amenazan, hace de lanzador si llegan juntos. La carta se esconde y solo aparece en el desenlace. _Relevos_: el «peón» dobla su cuota; la carta releva menos de la media. _Ataques_: la carta no salta a cerrar; el peón sí. _Remate_: el peón lanza.
- **Lo que hace hoy el motor**: AUSENTE salvo con orden `gregario → targetRiderId` explícita (arropo `relayProtectedPenalty` 1,2 sobre el jefe, D-01) y solo si `autoOrders` puso al jefe como `lider`/`sprinter` y a este como su gregario — que en una fuga es raro (el `lider` bot lleva `reservon` y apetito 0,3; los que van a la fuga son `cazaetapas`). `tieneHombreDelante` (v41) ve al compañero DELANTE, no al lado.
- **Lo que dijo el dueño**: «el escapado de ese equipo no debería entrar a los relevos… así además llega más fresco al final» (v33; misma idea de guardar a uno).
- **Información necesaria**: compañeros presentes; carta del equipo para este grupo y este final (recalculada con los presentes, no con el campo); cuánto ha gastado cada uno.
- **Cómo se mediría**: filtro «`move` de ≥ 6 con pareja»: km al frente del miembro de la pareja que peor remata ≥ 1,5× los del que mejor remata; victoria de la pareja cuando llegan ambos a meta ≥ 55 %.

---

## C. La fuga y la general: quién tira, quién no, quién persigue

### [GRUPO-13] La fuga lleva al maillot: quién NO debe tirar (y quién sí, detrás)

- **Cuándo**: en carreras por etapas, cuando el líder de la general va en el grupo de cabeza (contraataque en el último puerto, corte de abanico, o una fuga a la que se coló). Es raro que el maillot vaya en la fuga del día (por eso el veto de v32), pero es frecuente en el desenlace.
- **Quién decide**: los del grupo de cabeza según su equipo; detrás, los equipos del 2.º y 3.º.
- **Lo que pasa en carretera**: dentro, **los compañeros del maillot tiran a muerte** (cada segundo es general); **los hombres cuyos jefes van detrás (2.º, 3.º…) NO tiran** (estarían trabajando contra su líder: el caso del dorsal 81), aunque tengan opciones de etapa; los agentes libres tiran por la etapa. Detrás, el equipo del maillot se sienta; **los equipos del 2.º y 3.º persiguen** con todo. _Relevos_: dentro solo el equipo del maillot + los sin jefe detrás; fuera, 2.º/3.º. _Ataques_: el maillot no ataca (marca, GRUPO-17); sus rivales dentro sí. _Remate_: el maillot no disputa la etapa si va con compañero (le lanza al compañero).
- **Lo que hace hoy el motor**: PARCIAL. Dentro: `jefeEnApuros` (D-05) saca del turno al que tiene a su hombre de la general ≥ 22 s detrás — pero solo si el plan de su equipo tiene propósito `maillot`/`general` (déficit ≤ 420 s) y su `leaderId` es ESE hombre; `pickLeader` elige por rol y final, «nunca mira la general» (deuda anotada, simulate ~2160): en una llana el `leaderId` puede ser el velocista y el 2.º de la general no cuenta como jefe → el 81 sigue tirando. `relayRaceLeaderPenalty` saca al maillot del turno (correcto: él no tira). Fuera: `leaderUpTheRoad` (v58 §1) hace que el equipo del maillot no persiga; los equipos del 2.º/3.º persiguen solo si `isThreatened` (general virtual del de delante − la suya ≤ 420 s, D-10) → CUBIERTO en dirección. Remate: sin equipo (H6).
- **Lo que dijo el dueño**: caso del 81: «el 81 tira en la fuga del líder con sus jefes 2.º y 3.º detrás» y «el equipo del 2.º y 3.º no persigue» (tactica.md §1, Race Wallonia/Italy). «hay un pelotón en el que va tirando el equipo del líder… pero el líder va delante… ¡Pero el que tiene el jersey no está en ese grupo!» (v58 §1). «no es solo saber qué equipo(s) participan de la persecución… también es saber POR QUÉ… o bien son el líder y es una fuga peligrosa para la general… o bien el equipo de un favorito para la general, ídem» (v15 §13).
- **Información necesaria**: para cada corredor del grupo de cabeza: ¿va mi hombre de la general detrás? (existe `jefeEnApuros`, pero depende de un `leaderId` que ignora la general); general virtual de mi hombre contra la del maillot (`gapVirtual` de SPEC 6.9, no calculada por equipo); detrás: quién pierde con esta fuga (el 2.º y 3.º) — hoy `isThreatened` lo aproxima.
- **Cómo se mediría**: `grandTour` y `smallTours` con general: en grupos de cabeza con el maillot y sin el 2.º/3.º: (a) relevadores cuyo mejor hombre de la general está detrás: **≤ 5 %** de los bloques; (b) equipos del 2.º/3.º al frente del grupo perseguidor: ≥ 70 % de los bloques con dueño del frente.

### [GRUPO-14] La fuga lleva al 2.º (o a un favorito) y el maillot va detrás

- **Cuándo**: media montaña y reinas de gran vuelta: el rival ataca lejos («emboscada»); también el corte de abanico que deja al maillot detrás.
- **Quién decide**: el equipo del maillot (detrás) y los compañeros del maillot que estén delante; el 2.º y su equipo delante.
- **Lo que pasa en carretera**: detrás, el equipo del maillot persigue con todo; los demás equipos con favoritos detrás ayudan; los sprinters no. Delante, **los compañeros del maillot no tiran** (se sientan, incluso frenan), **el 2.º tira él mismo** (le interesa cada segundo, no la etapa) con sus compañeros, y los libres tiran por la etapa. _Relevos_: delante, el 2.º y los suyos + libres; detrás, el equipo del maillot. _Ataques_: el 2.º no ataca a sus compañeros de fuga (quiere tiempo, no la etapa). _Remate_: el 2.º regala la etapa si hace falta a cambio de que le tiren.
- **Lo que hace hoy el motor**: CUBIERTO en su mayor parte: `jefeEnApuros` (v58 §4) saca del turno a los compañeros del maillot delante; `relayRaceLeaderPenalty` solo para `gcRank === 1`, así que el 2.º «sí da la cara» (v57 §4); `isThreatened` + `claimFor` (maillot amenazado = 4) da el frente al equipo del maillot. PARCIAL: el 2.º compite la etapa como cualquiera (no hay «cambio etapa por tiempo»); los equipos de otros favoritos detrás solo persiguen si están amenazados por el DE DELANTE, no por ayudar al maillot (correcto en carretera). AUSENTE: «la emboscada y el día en que el líder se rompe» no tocados (E3).
- **Lo que dijo el dueño**: «otra cosa es que los que van segundo, tercero o cuarto lo hagan, porque ellos quieren luchar por la carrera… y curiosamente no veo que lo hagan» (v52). «si la fuga está a 2 minutos y no hay nadie peligroso, no tiras; si está a 20 minutos, sí que tiras, ¡a muerte!» (v38, `isThreatened`).
- **Información necesaria**: general virtual de cada uno del grupo de cabeza (existe `frontThreatDeficit − gapSeconds` para el más cercano al maillot, no por corredor); para el 2.º: cuántos segundos gana si tira vs qué pierde en la etapa (una función de utilidad, AUSENTE).
- **Cómo se mediría**: `grandTour` + `calendarQueens`: (a) cuando el 2.º-5.º va en el grupo de cabeza sin el maillot, % de bloques en que él mismo releva: 40-70 %; (b) ataques del 2.º-5.º / ataques del maillot en montaña: **≥ 1,5** (hoy 1,32, «menos de lo esperado», v52).

### [GRUPO-15] Fuga con un compañero de quien persigue detrás (el hombre «mal colocado»)

- **Cuándo**: siempre que un equipo persigue (por el sprinter, por el maillot) y tiene a un hombre en la fuga.
- **Quién decide**: el hombre de la fuga (con su director).
- **Lo que pasa en carretera**: **no releva** (hace «cabeza y rueda» o directamente se pone a cola), llega fresco y en el remate juega su baza; si la fuga se enfada, aguanta el chaparrón. Variante A: el de delante es la CARTA del equipo (su mejor rematador) → el equipo detrás NO persigue (v38). Variante B: es un noveno hombre → el equipo persigue y él se sienta. Variante C (fuga que se rompe): el que tiene compañero en el grupo de delante no persigue desde el de detrás. _Relevos_: fuera del turno. _Ataques_: no ataca a la fuga (le basta con llegar fresco), salvo que su equipo detrás se rinda. _Remate_: llega el más fresco del grupo.
- **Lo que hace hoy el motor**: CUBIERTO: `relaySittingOnPenalty` 2 (v33, D-01/D-04: `teamOf(id) === frontTeamId` fuera del pelotón), `tieneHombreDelante` (v41, D-06, grupo de caza), `manUpTheRoad` con las cartas (v38/v49, D-10) para que el equipo no persiga. Límite anotado: solo la **fuga del día** exime a un tren en `chaseGear` (D-12); un compañero en un contraataque posterior no. Remate: el peaje `work` relativo al grupo (tope 15 %) le favorece un poco; sin más.
- **Lo que dijo el dueño**: «hay un equipo que tiene a 1 ciclista tirando del pelotón pero tiene a 1 ciclista tirando de la fuga… eso es sabotearse a su trabajo» → «el escapado de ese equipo no debería entrar a los relevos… así además llega más fresco al final» (v33). «hay un escapado… y detrás hay uno de su equipo también tirando» (v41 §4). «Nadie renuncia a su velocista porque su noveno hombre esté en la escapada» (v38/v49).
- **Información necesaria**: `frontTeamId` (existe), plan del propio equipo (existe), si el de delante es la carta (existe). Cubierto.
- **Cómo se mediría**: ya medido: fugados del equipo perseguidor en el turno 13 % (km 84) / 19 % (km 167) tras v33; casos v41 234 → 40. Banda a mantener: ≤ 15 % de bloques.

### [GRUPO-16] El satélite: el hombre de la fuga que espera a su jefe

- **Cuándo**: media montaña y reinas: un equipo manda a un rodador/escalador a la fuga por la mañana para que, cuando su líder ataque desde el pelotón en el último puerto y enlace, tenga un compañero que le tire en el llano/descenso hasta meta.
- **Quién decide**: el equipo (plan de la mañana) y el satélite (cuándo dejarse caer de la fuga para esperar).
- **Lo que pasa en carretera**: el satélite releva normal hasta que su jefe salta; entonces **se deja caer de la fuga** (o se sienta) para ser recogido por su jefe y tirar para él 10-20 km. También sirve para «hacer de puente»: cuando el jefe enlaza, el satélite ya está delante. _Relevos_: normal en la fuga → 100 % para el jefe cuando llega. _Ataques_: no ataca en la fuga (se guarda). _Remate_: el satélite no disputa.
- **Lo que hace hoy el motor**: AUSENTE: el único mecanismo que hace «esperar» a un compañero es D-13 (drop-back hacia un `shed` desde el pelotón/grupo de detrás, nunca desde la cabeza de carrera: «alguien de la fuga no lo mandes para atrás») y dentro de un `move` el empuje es 0 (H1). El relevo dentro del grupo formado por jefe+satélite sí saldría PARCIAL: gregario 1,0 vs lider 0,1 − 1,2 (arropo) si el satélite es `gregario` de ese jefe (con `autoOrders` todos los no-jefes son gregarios del jefe desde v38, así que sí).
- **Lo que dijo el dueño**: «alguien de la fuga no lo mandes para atrás… alguien del pelotón sí. Salvo que sea con carrera rota» (v36) — la excepción «carrera rota» es justo el satélite en el desenlace. «El jefe no pide la ayuda: se la mandan… No hay “espera a mi compañero”» (v36 §7, límite).
- **Información necesaria**: que el equipo tenga un plan del día con «satélite» (AUSENTE como intención; N1 órdenes condicionales: «si mi jefe se descuelga en el primer puerto, espérale»); posición del jefe (existe); distancia entre fuga y jefe.
- **Cómo se mediría**: `calendarQueens`/media montaña con equipos: % de ataques del favorito en el último puerto que enlazan con un compañero delante: 10-25 % (hoy: sin dato; solo por casualidad).

### [GRUPO-33] La aduana del pelotón según la composición de la fuga («esta fuga no me vale»)

- **Cuándo**: fase de formación (primeros 20-60 km).
- **Quién decide**: el pelotón como agregado de equipos con motivo (`etapa`, `maillot`, `general`).
- **Lo que pasa en carretera**: cada equipo con motivo vota: el equipo del sprinter deja ir la fuga si no lleva a un rematador peligroso ni a más de uno de un equipo fuerte, y **si él tiene un hombre dentro, mejor**; el equipo del maillot la deja si el mejor colocado va lejos en la general; los equipos sin motivo dejan ir cualquiera. La fuga «buena» es la que tiene un hombre de cada equipo con interés y ninguno peligroso: esa se va a 5-20 minutos. _Relevos_: quien no tiene a nadie delante y tiene motivo tira; los demás no. _Ataques_: los equipos sin representación mandan a la contra (GRUPO-34). _Remate_: —.
- **Lo que hace hoy el motor**: PARCIAL. `pelotonAllows` (H7) no ve equipos: solo tamaño, `breakAppeal`, km, déficit del más cercano al maillot y veto al maillot. Lo que SÍ existe es la consecuencia (v38): el equipo con su carta delante no tira (`manUpTheRoad`) y `chaseGear` descuenta a los trenes en la fuga del día (D-12) — pero eso es después de la aduana, no en ella. La fuga que más gana en llano pasó de 0 s a 593 s.
- **Lo que dijo el dueño**: «Especialmente si los equipos de los sprinters tienen a alguien metido en la fuga y entonces no van a tirar, y la escapada se va a 15 o 20 minutos» (v38). «Puede ocurrir… que el pelotón se despista, deja hacer a una escapada y la escapada se va a 15 o 20 minutos… pueden perfectamente llegar con 8 o incluso 15 minutos; ya ha pasado en grandes vueltas» (v38). «lo que NO se relaja es que alguna fuga tenga que ganar alguna llana» (v38).
- **Información necesaria**: composición por equipos del `party` (AUSENTE en `MoveContext`); motivo de cada equipo del pelotón (existe `purposes`); remate del mejor del party para el final (existe `finishScore`); general virtual del más peligroso (existe `closest`).
- **Cómo se mediría**: llana canónica: (a) % de fugas del día con un hombre de ≥ 2 de los 3 equipos con mejor `quality`: 40-60 %; (b) `flat.breakawayWinPct` **5-16 % (banda del dueño)**; (c) `flatMoveWorstMarginS` ≤ 900 s (dueño).

### [GRUPO-34] Equipo con motivo y sin representación en la fuga: manda a uno (contra o puente)

- **Cuándo**: una vez consolidada la fuga (`peloton_concedes`), si el hueco está en 30-150 s (puente) o ya es grande (contra).
- **Quién decide**: el director del equipo sin hombre delante.
- **Lo que pasa en carretera**: manda a UN rodador a puentear (o a la contra) para «tener un hombre delante» y así no tener que perseguir; si llega, el equipo se sienta; si no, persigue. Los equipos con carta en el pelotón (sprinter) mandan a un gregario, no a la carta. _Relevos_: el que salta viene de la rueda (v41). _Ataques_: puente con 1-2 (`KIND_FOLLOW` 0,35). _Remate_: —.
- **Lo que hace hoy el motor**: PARCIAL: `teamAttackFactor` 1,4 para intent `nada` (sin motivo) y 0,7 para `perseguir` (con motivo y sin hombre delante) — es decir, **el equipo con motivo y sin representación ataca MENOS (0,7) que el que no tiene motivo (1,4)**: CONTRARIO al «manda a uno para no perseguir». No hay «uno y solo uno». El `puente` sí existe (D-23, regla 7) con caducidad.
- **Lo que dijo el dueño**: «Se puede atacar para enganchar al grupo de delante desde el pelotón o desde un grupo rezagado. Y a veces no se llega» (regla 7). El corolario de v38 (el que tiene hombre no tira).
- **Información necesaria**: ¿tiene mi equipo a alguien delante? (existe `manUpTheRoad`); ¿cuánto cuesta perseguir vs mandar a uno? (presupuesto, existe `teamSpent`); ¿quién de los míos es el rodador adecuado y no la carta? (existe `stageCandidateId`).
- **Cómo se mediría**: llana/media canónicas: de los puentes/contraataques nacidos con fuga consolidada, % del instigador cuyo equipo tiene motivo y NO tiene hombre delante: 50-70 % (hoy debe estar por debajo del 30 % dado 0,7 vs 1,4).

### [GRUPO-44] Dos equipos con motivo distinto persiguiendo la misma fuga: cómo se reparten el frente

- **Cuándo**: llana de gran vuelta con fuga peligrosa para la general Y sprint previsto; media montaña con favorito de etapa y maillot amenazado.
- **Quién decide**: los dos directores (pacto por radio o de facto).
- **Lo que pasa en carretera**: lo habitual es **compartir el frente**: 2-3 hombres de cada equipo en la rotación, o alternar tramos (el del maillot hasta 40 km, el del sprinter los últimos 40). Si uno se niega, el otro tira solo y se lo cobra al final (no lanza el tren / no controla en el último puerto). _Relevos_: mixtos. _Ataques_: —. _Remate_: el que ha tirado menos llega con más.
- **Lo que hace hoy el motor**: DECISIÓN del dueño: «el frente lo lleva UNO» (regla 3 de §V.1, v15/v34) → `frontTeamId` único con histéresis y relevo por gasto (`teamFrontHandoverSpent` 0,35, D-11); sin dueño, 1-3 equipos a 0,94 (v35). El reparto se hace por TIEMPO (turnos de un equipo), no por hombres simultáneos. PARCIAL respecto a la carretera, pero es lo que el dueño pidió; el `teamDriveSecondCard` 0,2 premia al equipo con dos motivos.
- **Lo que dijo el dueño**: «El frente lo lleva UNO» (regla 3, §V.1). «si el frente no tiene dueño único, debería haber 1, 2 o 3 equipos que tiren, pero con menor intensidad» (v35). «no tiene sentido que si 3 equipos colaboraron, solo 1 de cada aparezca» (v28).
- **Información necesaria**: existe toda (planes, claims, gasto).
- **Cómo se mediría**: ya medido: `frontTeamsPerStage` 1,8-4; `teamPullWithReasonPct` 95-100 %. Añadir: equipos distintos que han llevado el frente cuando hay ≥ 2 con claim ≥ 3: ≥ 2 en el 80 % de las etapas.

### [GRUPO-46] Fuga con el líder de una clasificación secundaria (montaña, puntos, joven)

- **Cuándo**: grandes vueltas y vueltas de una semana con maillots secundarios.
- **Quién decide**: el equipo del líder de la montaña/puntos (dentro y fuera) y sus rivales por esa clasificación.
- **Lo que pasa en carretera**: el equipo del maillot de la montaña que va en la fuga tira para él hasta la cima puntuable y luego se sienta; su rival directo por esa clasificación también se mete en la fuga y ninguno de los dos releva antes del puerto (se marcan). En el pelotón, el equipo del rival por puntos persigue una fuga que lleva al líder de puntos con meta volante. _Relevos_: motivados por el banner. _Ataques_: antes de la cima puntuable (GRUPO-05 variante). _Remate_: el banner, no la meta.
- **Lo que hace hoy el motor**: AUSENTE: solo hay tres motivos (`etapa`, `maillot`, `general`; mapa spec §9.1: «ninguno cubre “voy a por el maillot de la montaña”»). `contestClimbs`/`contestSprints` solo filtran quién disputa el banner (D-08 `disputeBanner`), no la conducta del grupo. `disputeClimb` ni siquiera mira `contestClimbs`.
- **Lo que dijo el dueño**: — (no consta cita; el mapa de la spec lo lista entre lo que falta a tactica.md).
- **Información necesaria**: clasificaciones secundarias en `StageInput` (AUSENTE: solo `gcDeficitSeconds`/`gcRank`); puntos en juego en cada banner del día.
- **Cómo se mediría**: `grandTour`: % de fugas del día que llevan al líder de la montaña o a su rival directo en etapas con ≥ 2 cimas puntuables: 30-50 %.

---

## D. El grupo de favoritos y el grupo decisivo

### [GRUPO-17] Grupo de favoritos sin gregarios en el último puerto

- **Cuándo**: últimos 5-10 km de un final en alto o última cota de una media montaña: quedan 5-8 líderes y nadie más.
- **Quién decide**: cada líder (y el maillot).
- **Lo que pasa en carretera**: **nadie tira**: se miran; el ritmo lo marca el que más interés tiene en que no se ataque (el maillot con colchón o el mejor rematador); los ataques van por turnos y con reacción inmediata de los directamente interesados (el maillot marca al 2.º, el 2.º al 3.º); a 2-3 km de la cima el mejor escalador ataca en la rampa más dura y el resto se juega los puestos. Si uno tiene compañero → GRUPO-18. _Relevos_: casi nulos (rotación a tempo bajo entre los que quieren mantener el hueco con el grupo de detrás, si hay). _Ataques_: `ataque_final` por perfil + general. _Remate_: `alto` si llegan juntos; lo normal es que no.
- **Lo que hace hoy el motor**: ataques CUBIERTO (`ataque_final` en subida: `0,2 + 0,8·perfilRank`, `gcDefendShare`/`gcChallengeShare`, 55,3 % de finales en alto decididos por ataque); marcaje PARCIAL: solo con orden `marcador` explícita (`autoOrders` nunca la da) — el maillot «pasa a marcar» solo vía `stake` en `followProbability` (0,72), no marca a un rival concreto; relevos **CONTRARIO en el turno**: con listón 0 relevan todos los que tengan deber > 0 (los `lider` tienen 0,1 + frescura y `sinOpciones` → varios entran), cuando en carretera nadie da relevos. La velocidad del grupo la marca `pacemakerP75` con `climbPaceFraction` 0,12 → los fuertes tiran de facto (deriva de los débiles). Aceptable como física, pero el compromiso del grupo (coop) no depende del interés del maillot en «mantener el grupo cerrado».
- **Lo que dijo el dueño**: «Un final en alto no es el equipo del favorito tirando hasta reventar a todos. Los fuertes atacan: por la etapa y por la general, en el momento oportuno, y vigilándose entre ellos» (regla 9). «al maillot no le pasa nada distinto… La defensa del maillot no existe como conducta propia» (E3, deuda). «si el líder se sienta, son sus rivales los que tienen que moverle» (v46).
- **Información necesaria**: general virtual de cada uno (existe `gcDefence` en el grupo); quién tiene compañero (AUSENTE en la táctica); a quién debe marcar cada uno (el rival directo en la general, AUSENTE: solo `markTargetOf` de órdenes).
- **Cómo se mediría**: `realQueens`/`calendarQueens`: (a) `top10GapSeconds` ≥ 40 s (suelo del dueño); (b) marcaje emergente: % de ataques del 2.º-3.º de la general a los que el maillot responde en el mismo bloque: 60-80 % (hoy `stake` 0,72 en el dado); (c) % de finales en alto decididos por ataque 45-65 % (hoy 55,3).

### [GRUPO-18] Grupo de favoritos con UN solo gregario (el único equipo con hombre)

- **Cuándo**: como GRUPO-17 pero un líder conserva un compañero (o dos).
- **Quién decide**: ese equipo.
- **Lo que pasa en carretera**: el gregario **marca un tempo alto** que desactiva los ataques (quien ataque tiene que hacerlo contra un ritmo ya alto), lleva a su jefe hasta la rampa final y se aparta; el jefe ataca fresco o espera el sprint reducido. Los rivales tienen dos opciones: atacar al tempo (caro) o esperar a que el gregario reviente. Variante: si el jefe es el maillot, el tempo es defensivo (no busca soltar a nadie, busca que nadie ataque); si es un rival, el tempo busca desgastar al maillot. _Relevos_: solo el gregario (y su ritmo sube al compromiso del equipo). _Ataques_: menos ataques mientras dura el tempo (el gregario compra bloques). _Remate_: el jefe con gregario llega con cerillos.
- **Lo que hace hoy el motor**: relevos PARCIAL: el gregario (deber 1,0) entra al turno antes que los líderes (0,1) y el jefe con gregario presente recibe −1,2 (arropo, D-01) → el gregario tira: correcto. Pero **el compromiso del grupo no sube** por decisión del equipo (H1: `driveOfRider` 0 fuera del pelotón; la velocidad la marca `pacemakerP75` con `climbPaceFraction`), así que no existe «tempo para desactivar ataques»; `moveLambda` no baja cuando alguien marca tempo alto (solo `cohesion`, `proximity`, `tense`, `settle`). AUSENTE como conducta.
- **Lo que dijo el dueño**: «Un final en alto no es el equipo del favorito tirando hasta reventar a todos» (regla 9) — el matiz: uno o dos gregarios sí marcan tempo hasta la rampa final. «que el líder no pase a tirar, él se reserva» (v36).
- **Información necesaria**: compañeros presentes y quién es el jefe (existe vía `domestiquesFor`); si el jefe es el maillot o un rival (existe `gcRank`); cuánto le queda al gregario (existe `energy`).
- **Cómo se mediría**: `realQueens`: en grupos de favoritos (≤ 12, últimos 10 km de subida) con exactamente un equipo con gregario: (a) λ efectivo de `ataque_final` mientras el gregario releva ≤ 0,6× el de un grupo sin gregarios; (b) el jefe con gregario llega con ≥ 1 cerillo más de media que los demás.

### [GRUPO-19] El grupo decisivo cerca de meta: la colaboración se rompe (deuda v38 §16)

- **Cuándo**: 5-12 corredores a 5-10 km de meta, con el grupo de detrás lejos (≥ 40 s) o inexistente; llano, descenso o falso llano tras el último puerto; también fuga del día que llega.
- **Quién decide**: todos, cada uno por su remate.
- **Lo que pasa en carretera**: en cuanto el hueco con el de detrás está asegurado, **dejan de relevar**: el mejor rematador no tira (le basta llegar), los peores no tiran para él y atacan, los medianos hacen relevos cortos y falsos. El ritmo cae (30-35 km/h en llano), se abren ataques en cadena, y el desenlace es un solitario o un grupo de 2-3. Si el grupo de detrás cierra deprisa, la colaboración se recupera «a regañadientes». _Relevos_: ≤ 30 % de los miembros y con compromiso bajo. _Ataques_: cadena desde ~10 km, primero los peores rematadores; λ alto. _Remate_: a menudo `solitario`.
- **Lo que hace hoy el motor**: AUSENTE, anotado: «Falta un mecanismo que el motor no tiene: en un grupo decisivo cerca de meta la colaboración se rompe… Queda anotado como deuda, no comprado con una perilla» (v38-2 §16). Lo que hay: `noChanceToWin` con `cerca` hasta 1,0 dentro de 15 km (los peores salen del turno) y `coopContagionWeight` 0,6 sobre la MEDIA (D-27): el compromiso del grupo baja hasta `restCommit·(1 − 0,6·media)`, suelo `coopSelfishFloor` 0,25 — pero **el mejor rematador sigue tirando** (para él `noChanceToWin` = 0 y su deber es positivo), y `ataque_grupo` tiene cooldown 4,5 km + tope 3 movimientos. Además la fuga que llega rueda a `restCommit` (≤ 0,72) contra un pelotón en tirón final a 0,85 (H5): la fuga pierde por física antes de poder romperse.
- **Lo que dijo el dueño**: «en un grupo de seis a ocho kilómetros de meta relevan los seis, incluido el que sabe que pierde el sprint» (v39 §1). «Lo que sigue rojo es el ganador en solitario: 4 % contra el 20-30 % que pidió» (v38-2 §16). «lo de quién tira de cada grupo habría que irlo midiendo a menudo… quizás cada km» (comentario 4787).
- **Información necesaria**: hueco con el grupo de detrás y tendencia (existe); remate relativo (existe); **quién está relevando de verdad ahora** (existe `pulling`, solo se lee para el pelotón); compañeros (AUSENTE); km a meta.
- **Cómo se mediría**: media-montaña canónica (8 cotas) y `smallTours`: (a) ganador en solitario **20-30 % (banda del dueño)**; (b) relevadores en el grupo de cabeza de 5-12 a ≤ 8 km: 15-40 % de los miembros; (c) velocidad del grupo de cabeza en llano a ≤ 8 km con hueco ≥ 40 s: 5-10 km/h menos que en km 20-8.

### [GRUPO-20] El grupo decisivo: quién cierra los ataques

- **Cuándo**: cada ataque dentro de un grupo de 3-12 en el desenlace.
- **Quién decide**: los que pierden con el ataque (el mejor rematador y quienes tienen interés de general).
- **Lo que pasa en carretera**: cierra **quien más pierde si el ataque prospera**: el mejor sprinter del grupo (si el que ataca es un buen rodador) o su compañero si lo tiene; el maillot si el que ataca es rival de general; los demás miran. Después de cerrar dos o tres ataques, el que cierra se queda sin cerillos y el siguiente ataque se va: por eso los ataques van en cadena y por eso el que tiene compañero gana. _Relevos_: el que cierra no releva después. _Ataques_: la respuesta es el ataque «espejo». _Remate_: el que cerró remata peor (cerillos, `work`).
- **Lo que hace hoy el motor**: PARCIAL: `followProbability` (D-22) = TAC, rol, mentalidad, energía, `stake` de general (solo `ataque_final`); no incluye «cuánto pierdo si se va» (remate relativo) ni «tengo compañero que cierre por mí»; el `marcaje` explícito sí modela la respuesta del marcador a su objetivo (`wheelProbability` 0,6 base). Coste del cierre: cerillo + `tacticAttackCost × 0,5` — CUBIERTO.
- **Lo que dijo el dueño**: «Cuando uno ataca, algunos van atentos y saltan detrás: pueden ser 0 o 40» (regla 2). «si un ciclista está marcando a otro, debería intentar salir detrás de él» (v39).
- **Información necesaria**: remate relativo de cada uno respecto al atacante (existe `finishScore`); compañeros presentes (AUSENTE en táctica); cerillos propios (existe); general virtual (existe `gcDefence`).
- **Cómo se mediría**: `smallTours` + media montaña, ataques en grupos de 3-12 en los últimos 15 km: (a) P(salta el mejor rematador del grupo | ataca uno con remate ≥ 6 puntos peor) ≥ 0,6; (b) P(salta un compañero del atacante) ≤ 0,05; (c) correlación negativa entre cerillos gastados cerrando y puesto en meta.

### [GRUPO-21] El que se esconde y el contagio: la fuga se enfría porque uno no pasa

- **Cuándo**: fugas de 4-8 a 20-60 km de meta; también grupo de favoritos en llano tras el último puerto.
- **Quién decide**: los que sí relevan, en reacción al que no.
- **Lo que pasa en carretera**: si uno se esconde sistemáticamente (por remate, por equipo detrás, por piernas), los demás **bajan el ritmo** antes que regalarle la etapa; le señalan; a veces le atacan a propósito para soltarle. Si el pelotón viene cerca, los honrados se resignan y tiran igual. _Relevos_: baja la intensidad de todos, no solo la del escondido. _Ataques_: ataque «para soltar al escondido». _Remate_: el escondido gana más de lo que debería si llegan juntos.
- **Lo que hace hoy el motor**: PARCIAL: `coopContagionWeight` 0,6 sobre `interésPropio.media` (D-27) — pero la media es de `noChanceToWin` (quién NO PUEDE ganar), no de quién NO ESTÁ RELEVANDO: un hombre que no releva por `sittingOn` (equipo detrás) no enfría a los demás; y el «ataque para soltar al escondido» AUSENTE.
- **Lo que dijo el dueño**: «si hay 1 wey que no pasa a cooperar en la escapada, los otros quizás quieran desgastarse menos y entonces tirar menos fuerte para no desgastarse para que ese wey que va ahí sin gastar energía se la lleve» (v39, comentario 4787-4790).
- **Información necesaria**: quién ha relevado en los últimos N km (existe `frontWorkMove`/`pulling`, no leído en la coop); hueco con el pelotón; remate del escondido.
- **Cómo se mediría**: llana/media canónicas: correlación entre «fracción de miembros fuera del turno en los últimos 5 km» y compromiso del `move`: pendiente negativa clara (Δ compromiso ≥ 0,10 entre 0 y 50 % fuera del turno).

### [GRUPO-36] El grupo de favoritos tras el puerto (descenso + llano a meta): tirar para sacar tiempo a los que se quedaron

- **Cuándo**: media montaña y reinas con la cima a 10-40 km de meta: el grupo de cabeza lleva a los favoritos que han soltado a un rival (o al maillot) detrás.
- **Quién decide**: los favoritos del grupo de cabeza y sus gregarios; detrás, el rival descolgado y su equipo.
- **Lo que pasa en carretera**: aunque el que va a ganar la etapa sea un solo hombre, **los que ganan tiempo en la general colaboran** (el interés de general supera al de etapa); sus gregarios, si los hay, tiran a muerte. Detrás, el descolgado y sus compañeros (que se dejan caer, v36) persiguen. Cuando el hueco está asegurado a 3-5 km, entonces sí se rompe por la etapa (GRUPO-19). _Relevos_: todos los que ganan tiempo. _Ataques_: pocos hasta que el hueco está asegurado. _Remate_: el que peor remata ataca al final.
- **Lo que hace hoy el motor**: **CONTRARIO**: `interésPropio` (D-07) usa solo el remate de ETAPA (`noChanceToWin`) para sacar del turno: los favoritos que ganan tiempo pero no rematan se sientan y el grupo se enfría justo cuando en carretera colabora. `gcChallengeShare` solo actúa en el apetito de ataque, no en el relevo. El drop-back de los compañeros del descolgado está CUBIERTO (D-13) y el grupo de rescate rueda a sus fuertes.
- **Lo que dijo el dueño**: «que los que van segundo, tercero o cuarto… quieren luchar por la carrera» (v52). «la general sí cambia cuánto se sacan» (E3 paso 8: −38 s con general apretada). «SÍ se corre distinto el día 18 que el día 3» (E3).
- **Información necesaria**: general virtual de cada uno del grupo de cabeza frente a los que van detrás (AUSENTE por corredor: solo `frontThreatDeficit`/`gcLeash` del pelotón); quién va detrás (existen relojes).
- **Cómo se mediría**: `calendarQueens`/`grandTour` media: en grupos de cabeza de ≤ 12 con ≥ 1 favorito (top-5) descolgado detrás: % de bloques con relevo de los top-10 de la general presentes ≥ 50 % (hoy caerá con `noChanceToWin`); brecha 1.º-10.º en montaña dentro de banda (`top10GapSeconds` ≥ 40).

### [GRUPO-37] El día en que el líder se rompe: el grupo de favoritos por delante del maillot

- **Cuándo**: reina de tercera semana, viento, o el líder con mal día; el maillot pierde contacto en el último puerto o en un abanico.
- **Quién decide**: los rivales de general y sus equipos (delante); los gregarios del maillot (detrás).
- **Lo que pasa en carretera**: los rivales **se alían sin hablar**: todos tiran (cada segundo es general para todos), sus gregarios tiran hasta reventar, no hay ataques hasta que el hueco es grande; detrás, «por la general, todos menos uno» se dejan caer para el maillot (v36). Después, con el hueco hecho, los rivales se atacan entre sí (GRUPO-17). _Relevos_: todos los rivales y sus hombres. _Ataques_: suspendidos hasta consolidar. _Remate_: secundario.
- **Lo que hace hoy el motor**: AUSENTE como conducta («la emboscada y el día en que el líder se rompe» no tocados, E3); mecánicamente: el drop-back v36/v37 CUBIERTO (`helpBack*` por la general: todos menos uno); delante `interésPropio` de etapa vuelve a enfriar al grupo (CONTRARIO como GRUPO-36); `ataque_final` con `gcChallengeShare` sube el apetito de los rivales (ataques, no relevos).
- **Lo que dijo el dueño**: «si es el favorito para una gran vuelta… puede justificar descolgar a todo el equipo menos 1» (v36). «¿está implementado que si el líder del equipo se cae, se descuelgue parte de su equipo para ayudarle?» (v36). «El líder se queda atrás… ¿y nadie de su equipo tira para ayudarle?» (v57 §3).
- **Información necesaria**: relojes del maillot y de los rivales (existen); general virtual por corredor (AUSENTE); estado del maillot (pájara/`hurt`, existe).
- **Cómo se mediría**: `grandTour` reinas: en etapas donde el maillot se descuelga ≥ 30 s a > 10 km: (a) el maillot pierde ≥ 60 s en meta en el 70-90 % de los casos; (b) relevo de los rivales top-5 presentes en el grupo de cabeza ≥ 60 % de los bloques hasta que el hueco supera 60 s; (c) cambio de maillot tras ese día ≥ 40 % de las veces.

### [GRUPO-38] El grupo perseguidor intermedio (5-8 entre la fuga y el pelotón)

- **Cuándo**: contraataque que se queda a medias; grupo tras la primera selección de una media montaña; los que saltaron tarde tras la fuga.
- **Quién decide**: sus miembros según equipos y según lo que tienen delante y detrás.
- **Lo que pasa en carretera**: colaboran mientras la fuga esté a tiro (≤ 1'30") y el pelotón lejos; **quien tiene compañero delante no releva** (a veces incluso sabotea); si el pelotón cierra, se rinden y esperan; si enlazan con la fuga, la fuga nueva es más grande y se recompone (GRUPO-05). _Relevos_: los sin compañero delante. _Ataques_: raros (todos quieren enlazar). _Remate_: —.
- **Lo que hace hoy el motor**: CUBIERTO en su mayor parte: `tieneHombreDelante` (D-06) para `kind === 'move'`; `puente` con `tacticBridgeCommit` 0,92 durante 8 km y caducidad (D-25); motivo `persecucion` en la radio (v58 §2); fusiones por alcance (v56/v57). PARCIAL: sin «nos rendimos y esperamos al pelotón» explícito (el `move` rueda a `restCommit` hasta que le cazan); y el puente no sale de un `shed` (deuda §13.4).
- **Lo que dijo el dueño**: «Se puede atacar para enganchar al grupo de delante desde el pelotón o desde un grupo rezagado. Y a veces no se llega» (regla 7). «hay 10 escapados que sacan 59 segundos a un grupo de 45… y en el km 192 los tres grupos se han juntado. WTF!!!» (v57 §1). «esto no es una escapada, es el grupo del maillot amarillo intentando alcanzar al segundo» (v58 §2).
- **Información necesaria**: existe casi toda (relojes, `teamOf`). Falta la decisión de rendirse (hueco creciendo + pelotón cerrando).
- **Cómo se mediría**: media montaña canónica: % de grupos perseguidores intermedios que enlazan con la cabeza: 30-50 %; % que son absorbidos por el pelotón sin haber cerrado nada: 30-50 %; ya medido para v41: relevadores con compañero delante 234 → 40 casos (mantener ≤ 50 por llana canónica).

---

## E. Pelotón reducido y superioridad numérica en el grupo grande

### [GRUPO-39] El pelotón reducido de 20-40 tras la criba: quién controla

- **Cuándo**: media montaña con el grueso roto; clásica tras el pavé; llana con viento.
- **Quién decide**: los equipos con 2-3 hombres en el grupo y motivo.
- **Lo que pasa en carretera**: el equipo que conserva más hombres y tiene rematador **controla** (persigue la fuga si la hay, tapa ataques); los equipos con un solo hombre se esconden y atacan. Lo que era «pelotón» ya no rota por gregarios: rota por equipos con interés. _Relevos_: 2-3 equipos con dueño del frente. _Ataques_: de los equipos en minoría. _Remate_: `sprint_reducido`/`puncheur` del grupo que llegue.
- **Lo que hace hoy el motor**: PARCIAL: `mainId` con histéresis (v29/v33) da el título de pelotón al grupo que lleva la gente, `menInPeloton` usa `mainId` (v33 §2), `isBunch` = `mainId` → el plan de equipo y `frontTeamId` funcionan en el `shed` que es pelotón; `avail` pondera por hombres presentes (D-12). Deuda: `chaseLedger`/`onTheFront` atados a `kind === 'peloton'` (v29 §6, «no consta arreglado»); y el listón del turno `relayDutyThreshold` 1,5 exige empuje de equipo para relevar → un grupo de 25 con equipos sin motivo puede quedarse sin nadie (suelo `relayMinPullers` 4).
- **Lo que dijo el dueño**: «otra vez el maillot amarillo tirando del pelotón… bueno, no es el pelotón, es un grupo de 20, del que solo tiran 10» (v57 §4). «Ojo, el tamaño a medir no es el tamaño del grupo, sino el tamaño de la gente que va tirando» (v38).
- **Información necesaria**: hombres presentes por equipo en ESTE grupo (existe `menInPeloton`); motivo de cada equipo recalculado para el grupo (existe por etapa, no por grupo); existe casi todo.
- **Cómo se mediría**: media montaña canónica y Flandes/`coherence`: en el `mainId` de 15-40: % de bloques con dueño del frente ≥ 90 % (v38-2 llevó «sin dueño» a 0 % en el pelotón; medir que se conserve cuando el pelotón es un `shed`); `pullReason` `libre` ≤ 5 %.

### [GRUPO-41] Superioridad numérica en el pelotón: el equipo con 7 contra el que tiene 3

- **Cuándo**: última hora de una llana o media montaña con caídas/cribas: un equipo conserva a todos y otro ha perdido hombres.
- **Quién decide**: los directores.
- **Lo que pasa en carretera**: el equipo con números controla todo (frente, tren, tapar ataques); el que tiene 3 ahorra: no persigue, se cuelga del trabajo del otro y solo lanza en el último km con lo que le queda. Si los dos tienen sprinter, el de 3 aprovecha el tren del otro («robar la rueda»). _Relevos_: el numeroso; el escaso 0. _Ataques_: el escaso puede mandar al tercero a una contra. _Remate_: el sprinter del equipo escaso remata sin tren (sd de lanzamiento ×1 en vez de ×0,45; sin +5-10 %).
- **Lo que hace hoy el motor**: PARCIAL: el presupuesto (`teamBudgetPerRider × leales`) se fija en la salida y `avail` pondera por presentes; `frontClaim` no baja por tener pocos hombres presentes (`claimOf` solo exige `menInPeloton > 0`): un equipo con un solo gregario en el pelotón puede ser dueño del frente y ese gregario tira hasta agotar el presupuesto de ocho. «Robar la rueda» AUSENTE (el tren solo protege al propio sprinter).
- **Lo que dijo el dueño**: «un equipo que lleva 80 km tirando no puede seguir a tope» (v15). «Puede haber varios equipos con sus lanzadores al mismo tiempo, aunque no necesariamente con el mismo éxito» (v39 §5).
- **Información necesaria**: hombres presentes por equipo (existe); su frescura (existe `energy`); número de hombres del rival (existe).
- **Cómo se mediría**: llana canónica con cribas (viento): claim/dueño del frente con ≤ 2 hombres presentes en el pelotón ≤ 15 % de los bloques con alternativa; sprinter sin tren gana contra sprinter con tren de igual SPR ≤ 35 % (hoy el tren gana 42 de 60 = 70 %: coherente).

### [GRUPO-47] La alianza de circunstancias (dos equipos que comparten enemigo)

- **Cuándo**: el maillot en el grupo de cabeza y dos rivales detrás; dos equipos de sprinters contra una fuga; el favorito de etapa y el maillot amenazado por la misma fuga.
- **Quién decide**: directores (pacto) o los corredores de facto.
- **Lo que pasa en carretera**: los equipos con el mismo enemigo **suman hombres al frente** (2+2) aunque ninguno sea «dueño»; la alianza dura mientras dure el interés compartido y se rompe en cuanto uno ve que el otro se guarda. _Relevos_: mixtos, simétricos. _Ataques_: —. _Remate_: cada uno a lo suyo.
- **Lo que hace hoy el motor**: PARCIAL: v35 permite 1-3 equipos sin dueño a 0,94 (`relayTeamsNoOwner`, `noOwnerCommitFactor`), y el motivo `alianza` existió en `pullReason` v13 pero el `PullMotive` actual (`solo | abanico | tren | fuga | persecucion | grupeto | equipo_* | rol`) no lo tiene. No hay memoria de «el otro se guarda» ni simetría vigilada.
- **Lo que dijo el dueño**: «si el frente no tiene dueño único, debería haber 1, 2 o 3 equipos que tiren, pero con menor intensidad» (v35). «PULLING (8)» de cinco equipos distintos → «no media parrilla» (v35).
- **Información necesaria**: claims de cada equipo (existe); quién ha relevado cuánto por equipo en los últimos km (existe `teamSpent`, no se compara entre aliados).
- **Cómo se mediría**: `grandTour` llanas con fuga peligrosa + sprint: equipos simultáneos al frente ≤ 3 (v35: peor 6 → 3, mantener) y, cuando son 2 con claim ≥ 3, reparto del trabajo 35-65 % en los 10 km previos al tirón final.

---

## F. El grupeto

### [GRUPO-22] El grupeto: quién manda el ritmo

- **Cuándo**: reinas y medias montañas: los descolgados (sprinters, gregarios gastados, enfermos) se juntan detrás.
- **Quién decide**: el «capo» del grupeto: normalmente el sprinter con más galones o su lanzador; se calcula el corte y se marca un ritmo que entre con margen y no más.
- **Lo que pasa en carretera**: tiran todos por turnos a ritmo bajo y regular; nadie ataca; en los puertos se sube al ritmo del más lento «que merece la pena esperar» (un sprinter estrella); en el llano/descenso los lanzadores del sprinter marcan. Si el grupeto es muy grande (> 20 %), saben que el jurado ampliará y van aún más tranquilos. Variante: grupeto pequeño (3-5) que sí tiene que pelear el corte. _Relevos_: todos, suave. _Ataques_: ninguno. _Remate_: entran juntos; a veces un mini-sprint por nada.
- **Lo que hace hoy el motor**: PARCIAL: ritmo por física `droppedCommit` con `share` de rendidos hacia `giveUpCommit` 0,5 (D-41); resignación a 300 s (`shedResignGapSeconds`); turno con listón 0 (todos); `grupetoWait` (GRUPO-23); el guardarraíl del corte en `administerEffort` «mide contra el tiempo YA CORRIDO en vez de contra el corte de la etapa… casi inerte» (v17 §4, deuda). No hay «capo» ni cálculo colectivo del corte; los grupetos que no son `mainId` no se criban (deuda v49). El motor: «El grupeto existe precisamente para entrar dentro del corte, y casi siempre lo consigue» (v20).
- **Lo que dijo el dueño**: «el último grupo de una etapa reina entra entre el 8 % y el 14 %» (v16, encargo); «74 minutos???» (v17); «No persigas el 45 % a ciegas… Prefiero una especificación corregida a un motor calibrado hacia un objetivo equivocado» (v20).
- **Información necesaria**: hora prevista del ganador (proyectable: existe `predictedShedPace`); fracción del corte; quién es la carta del grupeto (sprinter del equipo con más hombres, existe todo); tamaño del grupeto vs 20 % del pelotón (existe `giveUpGroupMaxFraction` 0,33 como freno).
- **Cómo se mediría**: `realQueens`/`grandTour`: cola de la reina 8-14 % (banda de §VI.3 re-anclada); `queenLastGroupPct` ≥ 8 (moneda al aire hoy: 8,07 ± 0,39); fuera de control 0-4 % (dato real v20).

### [GRUPO-23] El grupeto espera al que viene (y al compañero)

- **Cuándo**: un grupeto pequeño ve venir a 30-90 s a uno o varios; un sprinter estrella o un compañero se ha quedado detrás del grupeto.
- **Quién decide**: el grupeto (su capo) y el equipo del que viene.
- **Lo que pasa en carretera**: un grupeto pequeño espera casi siempre (más son más fáciles para el corte); un grupeto hecho no espera a un anónimo, pero **sí espera a un sprinter con equipo dentro** (sus compañeros frenan al grupeto); un compañero baja del grupeto a por el suyo («uno que va en grupo 2 podría esperar a uno del grupo 3»). _Relevos_: se frena (compromiso bajo) hasta que llega. _Ataques_: —. _Remate_: —.
- **Lo que hace hoy el motor**: CUBIERTO en la variante pequeña: `grupetoWait` (D-41): `mem < 4 ∧ kmToGo ≥ 10 ∧ shed detrás ≤ 90 s → compromiso ≤ 0,3`. PARCIAL: no espera por IDENTIDAD (sprinter estrella, compañero), solo por tamaño; el drop-back v36 (D-13) baja gregarios desde el pelotón o desde grupos por delante hacia un `shed` con el `leaderId`, cubriendo el «grupo 2 espera al del grupo 3» solo para el jefe del plan (que en llana es el sprinter: aquí sí coincide).
- **Lo que dijo el dueño**: «uno que va en grupo 2 podría esperar a uno del grupo 3 y ayudarlo» (v36). «si fue un líder del equipo que se cayó y los otros 4 son compañeros suyos que se descuelgan para ayudarle, ahí lo normal es que si el pelotón va sin prisa, casi siempre lo consigan» (v35 §9).
- **Información necesaria**: quién viene detrás y su identidad/equipo (existen relojes y `teamOf`); si merece la pena esperarle (carta de su equipo); cuánto margen hay con el corte.
- **Cómo se mediría**: `realQueens`: grupetos ≥ 4 que frenan (compromiso ≤ 0,35 durante ≥ 1 km) cuando viene detrás a ≤ 90 s un `sprinter`/`lider` con ≥ 2 compañeros en el grupeto: 60-90 %; cuando viene un anónimo: ≤ 20 %.

### [GRUPO-24] Entrar dentro del corte: el cálculo colectivo y el grupeto que ya no es la carrera

- **Cuándo**: reinas: últimos 30-50 km del grupeto, con el ganador ya en meta o cerca.
- **Quién decide**: el grupeto como colectivo; el corredor en apuros por su cuenta.
- **Lo que pasa en carretera**: el grupeto conoce el corte (porcentaje del tiempo del ganador según dificultad) y regula: si va justo, aprieta (y suelta a los que no pueden: el corredor en apuros); si va holgado, pasea. El grupeto muy numeroso confía en la ampliación. El que se queda solo detrás del grupeto es el que se va fuera de control (0-4 % real). _Relevos_: regulados por el corte. _Ataques_: ninguno. _Remate_: —.
- **Lo que hace hoy el motor**: PARCIAL: `applyStageTimeCut` por grupos con `timeCutFraction(desnivel/km)` y presupuesto 4 % (D-51) — el corte existe pero el grupeto no lo LEE para regular; el guardarraíl de «me dejo ir» es «casi inerte» (v17 §4); el corredor en apuros existe (v20: `hurt` no coge autobús, `isInTrouble`); «un grupeto que ya NO es la carrera —el que va tercero a diez minutos— sigue sin perder a nadie en el puerto, y en carretera sí los pierde» (v49, límite atado a la banda 14 %).
- **Lo que dijo el dueño**: «Quiero que si un ciclista no puede más pues que abandone automáticamente» (v14). «Sospecho que… no existe el corredor en apuros… todo el mundo acaba en un autobús, y un autobús organizado entra siempre dentro del corte» (v20). «los que pierden en montaña 5 minutos luego se reintegran demasiado fácil» (v58 §6, abierto).
- **Información necesaria**: tiempo previsto del ganador y % de corte (calculable en carretera); tamaño del grupeto vs 20 % del pelotón; quién va en apuros detrás.
- **Cómo se mediría**: `grandTour`: fuera de control 0-4 % de los abandonos-causa (`abandonCauses`, re-anclado v20); grupetos en meta que entran a ≤ 2 % del corte ≥ 30 % (regulan al límite); cola de la reina 8-14 %.

### [GRUPO-43] El corredor solo detrás: pelear o esperar al grupeto

- **Cuándo**: descolgado del pelotón en llano/viento o del grupeto en el puerto; también el que pincha/cae (hoy solo caída).
- **Quién decide**: él.
- **Lo que pasa en carretera**: si el pelotón va sin prisa y está a ≤ 30 s, pelea (con ayuda de compañeros que bajan); si va con prisa, se sienta y **espera al grupeto de detrás** (o al coche); un solitario entre pelotón y grupeto es lo peor que le puede pasar. _Relevos_: solo. _Ataques_: —. _Remate_: entra con el grupeto que le recoja.
- **Lo que hace hoy el motor**: CUBIERTO en física: `dropOut` se une a un `shed` a ≤ 12 s o crea uno con `droppedCommit` (D-40); pelea sólo si está VOLVIENDO (v35: `cerrando`), `shedFightFreshness` (v40); fusión entre grupetos a 22 s (D-43); `grupetoWait` desde el de delante. PARCIAL: no «se sienta a esperar al grupeto que viene detrás» (el solitario rueda a `droppedCommit` hasta que le alcanzan por fusión); banco de huecos: «un hombre peleando… No hay defecto».
- **Lo que dijo el dueño**: «es muy fácil reengancharse… lo normal es que el que está atrás está agotado, y es una lucha de varios que tiran del pelotón vs uno solo» (v35). «Hay un ciclista suelto que se quedó descolgado del pelotón… ¿cómo es posible que vaya tan rápido como el pelotón?» (banco de huecos: mediana −4,8 km/h, sin defecto).
- **Información necesaria**: compromiso del pelotón (existe), hueco y tendencia (existe), grupeto detrás (existe).
- **Cómo se mediría**: ya medido (v35): grupo 4-8 con pelotón sin prisa vuelve 60 %; apretando 6 %; con prisa 2 % — mantener. Añadir: solitario descolgado que acaba en un grupeto de ≥ 3 en meta ≥ 85 %.

---

## G. El abanico

### [GRUPO-26] El abanico: colocarse antes del tramo expuesto

- **Cuándo**: llanas con viento lateral (6 % de las llanas hoy); en carretera, tramos concretos que los directores conocen.
- **Quién decide**: los equipos (todos a la vez → nerviosismo, caídas).
- **Lo que pasa en carretera**: los equipos del maillot y de los sprinters llevan a su jefe a las 20 primeras posiciones con 3-4 hombres; los que llegan tarde al tramo quedan «en la cuneta». La colocación es superioridad numérica pura: el equipo que más hombres pone delante decide dónde se corta. _Relevos_: la fila del frente rota entera. _Ataques_: no hay ataques, hay «tirones» del equipo del frente. _Remate_: los sprinters cortados pierden la etapa.
- **Lo que hace hoy el motor**: PARCIAL: colocación por puntos en `corte` (D-48): `riderPerfil + 25 (equipo del frente) + 12 (jefe con gregario en el grupo) ± 10 suerte`; el corte es un dado `windBreakPerKm 0,015 × viento` sobre `dentro > cabenEnFila`. Límite anotado: «sin previsión de viento ni tramos expuestos» (§19.5); el viento es un número por etapa. El jefe en abanico no tira (v41 §7).
- **Lo que dijo el dueño**: «el viento y los abanicos… aquí te delegaré el 100 %» / «aunque eso implicará también definir las colocaciones» (v41).
- **Información necesaria**: dónde viene el tramo expuesto (AUSENTE); hombres disponibles por equipo (existe); quién es el jefe a colocar (existe).
- **Cómo se mediría**: banco de viento (semilla con viento): en cortes de abanico, % de cartas (`stageCandidateId`/`leaderId`) de los 5 equipos con más hombres que quedan en la primera fila: 70-90 %; llanas con viento partidas 3-6 % (hoy 4 %).

### [GRUPO-27] El abanico: romper (el equipo que echa al pelotón a la cuneta)

- **Cuándo**: como GRUPO-26; el equipo con números y un jefe bien colocado decide acelerar en la cuneta.
- **Quién decide**: un equipo (el del maillot para hacer daño a un rival mal colocado; el de un sprinter para dejar atrás a otro sprinter).
- **Lo que pasa en carretera**: la decisión es DELIBERADA: el equipo mete a cinco en fila y sube a 55-60 km/h; el corte se produce donde acaba su fila. Si el rival tiene a su jefe delante, no rompen (sería trabajo gratis). _Relevos_: solo el equipo que rompe (y sus aliados). _Ataques_: el tirón es el ataque. _Remate_: el que ha roto suele tener al sprinter y gana.
- **Lo que hace hoy el motor**: AUSENTE como decisión: el corte es un dado (D-48) y no lo decide ningún equipo; el suelo de compromiso con viento (`windRaceCommit` 0,82 × viento) lo aplica el pelotón entero. Anotado: «el abanico como dado por corredor se probó y se descartó» (4079-4082).
- **Lo que dijo el dueño**: — (delegó el tema: «aquí te delegaré el 100 % de que hagas esto», v41).
- **Información necesaria**: hombres propios en la primera fila (existe la colocación), dónde están las cartas rivales (existe `teamOf`, `gcRank`, `stageCandidateId` de otros), el viento del tramo (número por etapa hoy).
- **Cómo se mediría**: banco de viento: % de cortes en los que el equipo del frente tiene a su carta en la primera fila Y una carta rival de los tres mejores equipos queda detrás: ≥ 60 % (hoy la suerte ±10 lo hace ~aleatorio condicionado a la colocación).

### [GRUPO-28] El abanico: cerrar (la segunda fila que persigue) y el que no puede volver

- **Cuándo**: tras el corte; la segunda y tercera fila.
- **Quién decide**: los cortados: el equipo del jefe cortado organiza la persecución; los que tienen al jefe delante se sientan o estorban.
- **Lo que pasa en carretera**: la segunda fila se organiza en su propio abanico (rota entera) y persigue; si el viento sigue y la primera fila tira, no vuelve (la diferencia sube). Cuando el tramo expuesto acaba (viento de cara/cola o giro), la persecución se hace fácil y suelen volver. Los cortados que tienen al jefe delante NO relevan. _Relevos_: fila entera de los que quieren volver. _Ataques_: —. _Remate_: si no vuelven, pierden la etapa y tiempo.
- **Lo que hace hoy el motor**: PARCIAL: la fila cortada es un `shed` con `droppedCommit` y `enFila`; `onRough` (viento) impide reenganche mientras dure — y el viento dura toda la etapa: «el abanico no se cierra nunca» (D-48, límite); en abanico rota la fila entera (D-02) y el jefe no tira (v41 §7). `jefeEnApuros` (v58 §4) saca del turno DELANTE al que tiene al jefe de la general detrás, pero no hay «no relevo en la fila de detrás porque mi jefe va delante» (no es `kind === 'move'`, es `shed`: D-06 no aplica).
- **Lo que dijo el dueño**: «en un abanico el jefe TAMPOCO tira» (v41 §7, corrección medida). «el líder se ha quedado atrás… y entonces delante están tirando sus 2 compañeros. ¿No se han enterado?» (v58 §4).
- **Información necesaria**: fin del tramo expuesto (AUSENTE); compañeros y jefe en cada fila (existe); fuerza de la primera fila (existe).
- **Cómo se mediría**: banco de viento: filas cortadas que vuelven ≤ 30 % mientras el viento sigue (hoy 0 % por `onRough`: banda 10-30 % una vez exista el tramo); relevo en la segunda fila de quien tiene a su carta en la primera ≤ 10 % de bloques.

### [GRUPO-29] El abanico y la general: el equipo con jefe cortado detrás y hombres delante

- **Cuándo**: corte de abanico en gran vuelta: el maillot o un favorito queda en la segunda fila con parte de su equipo delante.
- **Quién decide**: ese equipo.
- **Lo que pasa en carretera**: los de delante **dejan de relevar** inmediatamente (a veces se dejan caer para tirar del jefe: v36); los rivales de general delante tiran a muerte (GRUPO-37). _Relevos_: delante, los del jefe cortado 0; detrás, todo el equipo del jefe. _Ataques_: —. _Remate_: —.
- **Lo que hace hoy el motor**: CUBIERTO para el hombre de la general: `jefeEnApuros` en cualquier grupo desde v58 §4 (umbral 22 s); drop-back D-13 hacia un `shed` («por la general, todos menos uno») — el corte de abanico crea `shed`, así que aplica. PARCIAL: en carrera de un día (sin `hasGcContext`) no hay «jefe» de general → el equipo del favorito de etapa cortado sigue relevando delante (solo `manUpTheRoad`/`teamStance` del pelotón, y aquí el pelotón ES la primera fila).
- **Lo que dijo el dueño**: «el líder se ha quedado atrás… y entonces delante están tirando sus 2 compañeros. ¿No se han enterado?» (v58 §4).
- **Información necesaria**: existe para la general; falta la carta de etapa como «jefe en apuros» (v37 lo restringió a percance + gran favorito + ≤ 60 s para el drop-back; el «no relevar delante» no tiene esa restricción y podría ser barato).
- **Cómo se mediría**: banco de viento con general: relevo delante de compañeros del maillot/top-5 cortado ≤ 5 % (v58: 9 de 637 → 3 fotos; mantener); en carrera de un día: relevo delante de compañeros de un `stageCandidateId` cortado ≤ 15 %.

---

## H. El corredor solo (fuera de la cabeza)

### [GRUPO-30] El solitario en tierra de nadie (puente fallido, fuga deshecha): seguir, esperar o sentarse

- **Cuándo**: puente que no llega; el último superviviente de una fuga cazada por partes; el descolgado de la fuga que ve venir al pelotón.
- **Quién decide**: él.
- **Lo que pasa en carretera**: si el grupo de delante está a < 30 s y su ritmo lo permite, insiste; si no, **se sienta y espera al grupo de detrás para meterse** (y ahorrar); nunca rueda solo a media máquina durante 20 km. Si el de detrás es el pelotón y él es gregario, aprovecha para colocarse con su jefe. _Relevos_: solo → 0 al sentarse. _Ataques_: —. _Remate_: llega con el grupo que le absorbe.
- **Lo que hace hoy el motor**: PARCIAL: `bridge_failed` → `restCommit` (D-25) y sigue rodando hasta que le cazan (D-46) — es «rodar solo a media máquina», lo que en carretera no se hace; `move_faded` cuando queda vacío. El descolgado de una fuga por deriva va a `dropOut` → `shed` (D-40) con `droppedCommit`, correcto en física.
- **Lo que dijo el dueño**: «Se puede atacar para enganchar… Y a veces no se llega» (regla 7). Sobre el reenganche: «los grupos que se reúnen de golpe» (Sardegna e3, sin verificar).
- **Información necesaria**: hueco y tendencia con delante y detrás (existe); su depósito (existe).
- **Cómo se mediría**: llana/media canónicas: km rodados en solitario por un `move` de 1 sin ser cabeza de carrera: mediana ≤ 3 km (hoy sin dato; la física lo tiene que absorber antes).

### [GRUPO-31] El solitario en cabeza en los últimos 10 km con el grupo cerrando («¿llega?»)

- **Cuándo**: media montaña, clásicas, llanas con fuga que aguanta: un hombre a 20-60 s con 10 km.
- **Quién decide**: él (a tope) y detrás el grupo (GRUPO-19: ¿se organiza la caza o se miran?).
- **Lo que pasa en carretera**: el solitario va al 100 % (reserva incluida); detrás, si es un pelotón con trenes, le cogen casi siempre a ≥ 3 s/km de cierre necesario; si es un grupo de 6-10 favoritos que se miran, llega la mitad de las veces. El desenlace depende más de la composición del grupo perseguidor que de las piernas del solitario. _Relevos_: —. _Ataques_: —. _Remate_: `solitario`.
- **Lo que hace hoy el motor**: física CUBIERTA; conducta PARCIAL/CONTRARIA: el `move` de 1 rueda a `restCommit` (H5, ≤ 0,72) sin empuje de desenlace, mientras el pelotón va a `finalDrive` 0,85 y el grupo perseguidor pequeño rueda a su `coop`. La asimetría es a favor del pelotón por construcción. Hipótesis a medir: buena parte del 4 % de ganadores en solitario viene de aquí, no solo de la falta de ruptura detrás.
- **Lo que dijo el dueño**: «por delante uno o dos» / ganador en solitario 20-30 % (v38-2 §16). «lo que FALTA es el término medio realista» (fugas que ganan por 5-60 s, v23 → 88 % entran entre 5 y 60 s).
- **Información necesaria**: km a meta (existe); hueco y tendencia (existe); si el grupo de detrás está organizado (compromiso y nº de relevadores: existe).
- **Cómo se mediría**: media montaña canónica: compromiso medio de un `move` de 1-2 en los últimos 10 km ≥ 0,90; solitario a ≥ 30 s con 10 km y grupo perseguidor de ≤ 10: llega 40-60 %; con pelotón de ≥ 30 con trenes: llega 5-15 %.

---

## I. Resumen transversal para el fundidor

| Bloque                | Situaciones          | Estado dominante                                                                                                                       | Pieza mínima que las desbloquea                                                                                            |
| --------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Tamaño                | 01-06                | PARCIAL (física sí, sociología a medias); 02 ataques AUSENTE por `tacticInsideAttackMinRiders`; 06 AUSENTE                             | `Move` con composición por equipos; ataque en pareja; remate del solitario a compromiso de desenlace                       |
| Superioridad numérica | 07-12, 32            | AUSENTE (y CONTRARIO en el turno por `noChanceToWin`)                                                                                  | `teamId` en `MoveRider`; «carta del equipo en ESTE grupo»; `finishStage` con `teamOf` y lanzamiento improvisado            |
| Fuga y general        | 13-16, 33-34, 44, 46 | PARCIAL (13/14/15 bastante cubiertos vía `jefeEnApuros`/`sittingOn`/`tieneHombreDelante`); 16/33/46 AUSENTE; 34 CONTRARIO (0,7 vs 1,4) | `pickLeader` que mire la general; general virtual por corredor; aduana con composición; motivo de clasificación secundaria |
| Grupo decisivo        | 17-21, 36-38         | 19 AUSENTE (deuda v38 §16); 36/37 CONTRARIO (`interésPropio` solo mira etapa); 17/18 PARCIAL                                           | interés compuesto etapa+general en el relevo; ruptura de cooperación por hueco asegurado; quién cierra por «cuánto pierdo» |
| Pelotón reducido      | 39, 41, 47           | PARCIAL                                                                                                                                | claim ponderado por hombres presentes; `chaseLedger` desatado de `kind === 'peloton'`                                      |
| Grupeto               | 22-24, 43            | PARCIAL (física buena, sin cálculo del corte ni capo)                                                                                  | lectura del corte en carretera; espera por identidad                                                                       |
| Abanico               | 26-29                | PARCIAL; 27 AUSENTE como decisión                                                                                                      | tramo expuesto; el corte como decisión del equipo del frente                                                               |
| Solo                  | 30, 31               | PARCIAL/CONTRARIO (compromiso heredado)                                                                                                | compromiso de desenlace para movimientos; «sentarse a esperar»                                                             |

Bandas del dueño que se repiten como criterio de éxito de esta lente: ganador en solitario en media montaña **20-30 %**; `flat.breakawayWinPct` **5-16 %**; `flatMoveWorstMarginS` ≤ **900 s**; `top10GapSeconds` suelo **40 s**; cola de la reina **8-14 %**; fuera de control **0-4 %**; «el frente lo lleva UNO» y «sin dueño 1-3 equipos con menor intensidad»; «máximo unos 20 relevando… si hay 4 equipos colaborando, 5 de cada uno».
