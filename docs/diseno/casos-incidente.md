# Catálogo de situaciones — LENTE «INCIDENTES Y CLIMA COMO DECISIÓN TÁCTICA»

Parcela: todo lo que le pasa a la carrera **desde fuera del reloj de la ley de velocidad** —el suelo, la
rueda, el viento, el agua, el calor, el hambre, el corte, la enfermedad— y que en carretera dispara una
DECISIÓN: esperar o no esperar, bajar o no bajar, romper o no romper, aguantar o bajarse de la bici.

Fuentes leídas enteras antes de escribir: `mapa-requisitos-duenio.md` (corpus del dueño), `mapa-spec.md`,
`mapa-simulate-decisiones.md` (las 51 decisiones D-NN y su tabla de visibilidad), `mapa-tactics.md`,
`mapa-equipo-ordenes-final.md`, `mapa-entrenamiento-atributos.md`, `mapa-bancos.md` (§2 bandas, §7 «qué no
se mide»). Comprobaciones directas por Grep/lectura en `/home/user/cyclingstar/packages/engine/src`:
`stage/crash.ts`, `stage/abandon.ts`, `stage/weather.ts`, `world/climate.ts`, `stage/simulate.ts`
(`crashCheck` l. 5360-5429, `administerEffort` l. 3927-4000, `collapseCheck` l. 4011-4043, el corte del
abanico l. 4088-4175, el drop-back l. 2052-2319), `constants.ts`.

**Hechos verificados que condicionan toda la lente** (no son opiniones, son lo que hay hoy):

1. **El pinchazo y la avería mecánica NO EXISTEN.** Grep de `pinchazo|puncture|avería|mecánic` en el
   motor devuelve solo COMENTARIOS que dicen que no existen (`simulate.ts:285`, `simulate.ts:2081`,
   `constants.ts:3873`: «El PINCHAZO y la avería mecánica NO existen»). La única marca de percance es
   `RiderSim.mishapKm`, que solo escribe `crashCheck`.
2. **La NEUTRALIZACIÓN no existe** en ningún sentido de carrera. La única aparición de «neutralizado» es
   la velocidad inicial del grupo (`group.ts:16`, `constants.ts:1303`, `initialSpeed` 35 km/h).
3. **El CLIMA es un número por etapa** (`stageWeather`), y solo entra por tres sitios: `crashLambda ×
(1 + rainCrashScale 0,8 · lluvia)`, `selectionFactor` en pavés (`rainPavesScale` 0,5) y descenso
   (`rainDescentScale` 1), y el coste por bloque `× (1 + heatCostScale 0,08 · calor)`. **Ninguna decisión
   táctica lee `lluvia` ni `calor`**: ni el controlador del pelotón (D-14…D-20), ni la táctica (D-22), ni
   el plan de equipo (D-10/D-11), ni el turno de relevos (D-01/D-02). El FRÍO no existe (solo `calorDe`
   por encima de 26°; por debajo el tiempo no cuesta nada).
4. **El viento es una CAPACIDAD, no una decisión**: `vientoLateral` es un dado por etapa, el abanico es un
   `rollHazard(rngViento, windBreakPerKm 0,015 · viento)` (D-48) y la única huella de equipo es la
   colocación (`windPlacementTeam` +25 al equipo que ya lleva el frente). Ningún equipo DECIDE romper, y
   `abanicoAbierto` **no se cierra nunca**.
5. **La única conducta de «esperar / volver a por alguien» del motor es D-13** (`helpBack*`), y solo hacia
   un `shed` (no hacia un `mov` retrasado), solo por el jefe del plan, con guardarraíles.
6. **Nadie sabe dónde está el corte de tiempo mientras corre**: `applyTimeCut` (D-51) se resuelve en meta;
   el único guardarraíl en carretera es el de la regla 8 (D-49), que mide contra `group.tS` (tiempo YA
   corrido), límite anotado desde v17 («casi nunca ata»).
7. **Los bancos casi no llevan clima**: `smallTours`, `realQueens`, `timeTrials`, `calendarQueens`,
   `climbs` y los canónicos corren **sin `lugar`** (mapa-bancos §7.14), o sea con `CLIMA_REFERENCIA`.
   Cualquier banda de esta lente exige antes un banco con sitio y fecha.

Convención de estado: **CUBIERTO** (existe y hace lo que dice) · **PARCIAL** (existe a medias o solo por un
lado) · **AUSENTE** (no existe) · **CONTRARIO** (el motor hace lo opuesto a lo que pasa en carretera).

---

## A. LA CAÍDA

### [INCIDENTE-01] Se cae el líder de la general lejos de meta: la tregua no escrita

- **Cuándo**: vuelta por etapas, terreno de transición o llano, a más de ~25-30 km de meta, carrera
  agrupada (un solo pelotón), sin viento y sin sector técnico inmediato. El maillot (o un top-3) se va al
  suelo o queda cortado tras un montón.
- **Quién decide**: los equipos de los rivales directos, **como colectivo**; en la práctica lo lidera el
  equipo que en ese momento lleva el frente, y lo secundan (o no) los demás con hombre arriba. También
  decide el jurado/organización en la realidad, pero la decisión que importa es la del pelotón.
- **Lo que pasa en carretera**: el frente afloja o pasa a tempo neutro («no se ataca sobre una caída»);
  la caravana devuelve al grupo; el pelotón rueda a 35-40 km/h hasta que el maillot vuelve. Variantes:
  (a) **general apretada + terreno neutro** ⇒ tregua casi segura; (b) **caída dentro del final o de un
  tramo decisivo** ⇒ no hay tregua (ver INCIDENTE-02); (c) **equipo del líder impopular o carrera con
  cuentas pendientes** ⇒ tregua a medias, se rueda «rápido pero sin atacar»; (d) **hay una fuga del día
  arriba** ⇒ la tregua es solo entre favoritos: la fuga sigue ganando tiempo, y eso puede regalar la
  etapa (no la general); (e) **el que se cae es el 2.º o el 3.º, no el maillot** ⇒ tregua mucho más
  floja: se espera si el líder virtual quiere «ganar limpio», no si le conviene.
- **Lo que hace hoy el motor**: **AUSENTE**. `crashCheck` (simulate l. 5360-5429) marca `hurt`,
  `mishapKm` y llama a `dropOut(m, group, perdidaS)`; nadie más se entera. El controlador del pelotón
  (D-14…D-20) no recibe ninguna señal de caída: `freeRunTarget` sigue en `pelotonTempoCommit` 0,55 o en el
  suelo que toque, y si había caza de sprinters (D-16) el lazo sigue cerrando igual. La tabla de
  visibilidad confirma que ninguna decisión del pelotón lee `hurt`/`mishapKm` salvo D-13 (drop-back) y el
  colapso. En una etapa con `finalDrive` la caída del maillot a 16 km de meta no cambia un dígito.
- **Lo que dijo el dueño**: sobre el rescate, v36 (L.7159-7162): «oye, pero ¿está implementado que si el
  **líder del equipo se cae**, se descuelgue parte de su equipo para ayudarle? porque igual no es solo un
  tema de etiquetas sino de **construir algo que no existe en el motor**». Sobre la tregua del PELOTÓN, no
  hay cita: «—». (E3 deja anotado como no tocado «la emboscada y **el día en que el líder se rompe**».)
- **Información necesaria para decidirlo**: quién se ha caído y su `gcRank`/`gcDeficitSeconds` (el motor lo
  tiene), cuánto queda (lo tiene), si el terreno es decisivo (`raceThisClimb`, `isFinal`, `onRough`: lo
  tiene), si hay fuga del día por delante y a cuánto (lo tiene), y —lo que NO tiene— una noción de
  «etiqueta»: cuántos favoritos están implicados en el montón, si la caída es reciente (hoy `mishapKm`
  existe pero solo lo lee D-13) y una decisión de equipo por equipo («¿espero yo?»). Falta también la
  memoria de un bloque a otro: la tregua dura kilómetros, no un bloque.
- **Cómo se mediría**: sobre `sim/grandTour.ts` (21 etapas × 8 semillas), «**tiempo que pierde el maillot
  cuando se cae en llano a > 30 km de meta**»: hoy sale la pérdida bruta de `perdidaS` + la física del
  regreso. Banda propuesta: **el 70-90 % de esas caídas terminan con el líder de vuelta en el grupo
  principal antes de meta y con ≤ 15 s de pérdida en la general**, y el 10-30 % restante no (para que la
  tregua no sea automática). Justificación: en la carretera real la tregua es la norma en terreno neutro y
  la excepción cuando la caída pilla el final o hay carrera rota; un 100 % convertiría la caída en un
  suceso sin consecuencias, que es peor que no tenerla.

### [INCIDENTE-02] Se cae el líder DENTRO del desenlace: no hay tregua

- **Cuándo**: la caída ocurre en el último puerto, en el sector de adoquín, con abanico abierto o en los
  últimos 15-20 km de una etapa que se está decidiendo.
- **Quién decide**: cada equipo por su cuenta; en particular los equipos de los rivales de la general y el
  equipo que lleva el tren.
- **Lo que pasa en carretera**: nadie espera. El grupo sigue a su ritmo y el caído pierde lo que pierde;
  como mucho su propio equipo se detiene con él. Es la contrapartida de INCIDENTE-01 y hace que la tregua
  signifique algo: existe **porque** hay sitios donde no existe.
- **Lo que hace hoy el motor**: **CUBIERTO POR ACCIDENTE**. Como nadie espera nunca (INCIDENTE-01), este
  caso «sale bien» por la razón equivocada. Lo que sí existe es la puerta de D-13:
  `kmRestantes ≥ helpBackMinKmToGo (5)`, o sea que dentro de los últimos 5 km ya no baja nadie.
- **Lo que dijo el dueño**: «—» (implícito en v37: la ayuda por la etapa exige percance **y** que «la
  distancia sea pequeña»).
- **Información necesaria**: la misma señal de «estamos en el desenlace» que ya usa el motor
  (`raceThisClimb`, `isFinal`, `finalDriveKm`, `onRough`), más la caída como evento visible para el
  controlador. El motor tiene todo salvo el evento.
- **Cómo se mediría**: mismo banco que INCIDENTE-01, partiendo la muestra por km a meta: **caídas del
  maillot a < 15 km ⇒ 0 % de tregua** (invariante duro, no banda), contra el 70-90 % de INCIDENTE-01. Es
  la medida que impide que el mecanismo nuevo se coma el final de las etapas.

### [INCIDENTE-03] Quién baja a por el líder caído y quién se queda delante

- **Cuándo**: el líder ha quedado cortado (22 s ≤ hueco ≤ 5 min) y quedan ≥ 5 km. Vuelta por etapas.
- **Quién decide**: el director deportivo (aquí: el plan de equipo). En un equipo humano, el mánager.
- **Lo que pasa en carretera**: el director elige a dedo y por radio. Variantes reales: (a) **gran vuelta,
  general viva** ⇒ bajan casi todos, se deja 1 arriba «por si acaso»; (b) **el equipo tiene además la carta
  del día** ⇒ el rematador se queda arriba y bajan los demás; (c) **quedan pocos km o el hueco es enorme**
  ⇒ baja uno solo, «para que no vuelva solo»; (d) los que bajan son los **frescos y los que ruedan**
  (LLA/RES), no el escalador que hará falta luego; (e) el gregario que ya iba cortado en tierra de nadie es
  el primero en esperar, porque le cuesta cero.
- **Lo que hace hoy el motor**: **CUBIERTO (con forma propia)**. D-13 (`domestiques_drop_back`,
  l. 2052-2319): por la general bajan `disponibles − helpBackGcKeepInBunch (1)`; se filtran heridos,
  rendidos, el maillot (`esElMaillot`, nunca baja), la carta de etapa, los rebeldes, y se exige
  `role === 'gregario'` con target nulo o el jefe (`tieneElEncargo`) y frescura ≥ 0,35; van «los más
  enteros, primero los que ya van a medio camino». Lo que NO hace: no elige por perfil de rodador
  (LLA/RES), no baja hacia un `mov` retrasado (solo `shed`), y no lo decide un humano.
- **Lo que dijo el dueño**: v36 (L.7164-7167): «depende del caso… si es el favorito para una gran vuelta o
  carrera por etapas, puede justificar **descolgar a todo el equipo menos 1**; si es una carrera de 1 día
  no, salvo que la diferencia sea pequeña (y en ese caso que **el líder no pase a tirar, él se reserva**)».
  Y v58: «si un ciclista tiene a su líder atrás, es normal que se deje caer para ayudarle… pero eso aplica
  a los bots y a los humanos que en sus instrucciones hayan indicado que ayudan a su líder X. **Si yo como
  humano digo que voy por libre, entonces no debería ocurrir eso**».
- **Información necesaria**: quién es el jefe y su hueco (tiene), quién de los míos va dónde (tiene),
  frescura (tiene), **perfil de rodador para el arrastre** (tiene `eff0.LLA/RES`, no lo usa), y la causa
  del corte —caída, pinchazo o piernas— porque cambia si vale la pena (hoy solo `mishapKm` de caída).
- **Cómo se mediría**: `sim/grandTour.ts`, avisos `domestiques_drop_back` por etapa y **cuántos bajan por
  aviso**. Banda: **1-4 hombres por rescate cuando el motivo es `general`** (hoy la regla dice «todos menos
  uno», que con escuadras de 8 puede dar 6) y **≤ 0,3 rescates por etapa** (la v37 dejó 0,01 avisos/etapa
  por la rama de la etapa; la de la general no tiene banda). Justificación: en una gran vuelta real un
  rescate completo se ve una o dos veces en tres semanas.

### [INCIDENTE-04] El líder vuelve: el tren de rescate y la factura del día siguiente

- **Cuándo**: después de INCIDENTE-03, con 20-120 km por delante.
- **Quién decide**: el grupo de rescate como unidad (ritmo), y el jefe (si entra al relevo o no).
- **Lo que pasa en carretera**: cuatro hombres se turnan a tope, el jefe va a rueda y no toca el viento;
  el regreso cuesta 20-40 minutos de umbral a los gregarios, que al día siguiente están fundidos. Si el
  pelotón va tranquilo vuelven casi siempre; si el pelotón aprieta, no vuelven y se acabó la general.
- **Lo que hace hoy el motor**: **PARCIAL**. Los que bajan se meten en el `shed` del jefe y el ritmo lo fija
  `droppedCommit` (D-41) con la frescura media del grupo; el reenganche lo decide la puerta D-42
  (`rejoinGapSeconds` 22 s, `shutFor`, `chaseBackShutFloor` 0,15). El jefe **sí** sale del turno vía
  `jefeEnApuros` (D-05) y `sittingOn` (D-04). Anotado como probado y **NO hecho**: «se probó que el grupeto
  de rescate rodara **al ritmo del jefe**» (simulate l. 3022-3040): con tope volvía el 66 % contra el 70 %
  del que se queda solo; sin tope 81 % contra 63 %. La factura del día siguiente sí existe (el trabajo va a
  `work` → TSS → Banister), pero **nada distingue** «me gasté rescatando» de «me gasté tirando».
- **Lo que dijo el dueño**: v36: «que **el líder no pase a tirar, él se reserva**» (implementado);
  v35 (L.7143-7151): «si fue **un líder del equipo que se cayó** y los otros 4 son compañeros suyos que se
  descuelgan para ayudarle, ahí lo normal es que **si el pelotón va sin prisa, casi siempre lo consigan**».
- **Información necesaria**: el compromiso real del pelotón (el grupeto solo mide contra `peloton.tS`, id
  fijo, no contra `mainId` — límite anotado en D-41), la frescura de los que arrastran, y cuánto queda.
- **Cómo se mediría**: banco propio de rescate (variante de `sim/grandTour.ts`): **% de rescates que
  terminan con el jefe de vuelta en el grupo principal, partido por el compromiso del pelotón**. Banda del
  dueño derivada de v35: **≥ 80 % con el pelotón sin prisa (compromiso ≤ 0,6)** y **≤ 25 % con el pelotón
  cazando (≥ 0,8)**. Justificación: es literalmente lo que dijo, y hoy no se mide en ningún sitio
  (mapa-bancos §7.20).

### [INCIDENTE-05] Se cae un gregario clave: el plan se queda sin manos

- **Cuándo**: cualquier momento. Cae (o pierde 3 minutos) el primer o segundo gregario del jefe: el que
  arropa, el que iba a tirar en el valle, el lanzador del sprinter.
- **Quién decide**: el equipo (redistribución de tareas) y el jefe (¿me expongo yo ahora?).
- **Lo que pasa en carretera**: el equipo recalcula: alguien asciende a arropo, el que iba a guardarse
  gasta antes, y si era el lanzador, el sprinter se busca una rueda ajena. Si perdió a dos, el equipo deja
  de reclamar el frente y pasa a esconderse.
- **Lo que hace hoy el motor**: **PARCIAL / por accidente**. `teamPlans` se construye **una vez por etapa**
  (`buildTeamPlans`, l. 1577-1599): `leaderId`, `stageCandidateId`, `budget = 9 × leales` y `memberIds` no
  se recalculan cuando alguien se cae o abandona. Lo que sí se actualiza cada 10 bloques es
  `menInPeloton(plan)` (D-10) y el `spentFraction`, así que un equipo diezmado pierde derecho al frente por
  la vía del gasto, no por la de la baja. El arropo (`protectedByTeam`, `domestiquesFor`) sí es dinámico:
  se mira si el gregario va **en este grupo**. El tren de meta (`trenDe`, `lanzaPara`) también. O sea: la
  consecuencia física existe, **la decisión de reorganizarse no**.
- **Lo que dijo el dueño**: «—» directamente; el marco es v15 §V.1 («no es solo saber qué equipo participa…
  también POR QUÉ») y v38-2 («rehaz ese bloque entero, wey» sobre quién tira de cada grupo).
- **Información necesaria**: quién queda vivo y dónde de cada equipo (lo tiene: `membersOf`, `teamOf`),
  quién era el arropo/lanzador (lo tiene por órdenes), y una regla de ascenso de rol en carrera (no
  existe: el rol es fijo desde la salida).
- **Cómo se mediría**: `sim/tactics.ts::analyzeTeamVoice` ampliado: **% de etapas en las que un equipo que
  pierde ≥ 2 hombres antes del km 100 sigue reclamando el frente** (`frontTeamId`). Banda propuesta:
  **≤ 20 %**. Justificación: con seis hombres se puede tirar; con cinco y dos de ellos fundidos, un equipo
  real cede el frente al siguiente.

### [INCIDENTE-06] Se cae el favorito DE LA ETAPA (y la general no está en juego)

- **Cuándo**: clásica o etapa suelta; el rematador del día se va al suelo a 40-80 km de meta.
- **Quién decide**: su equipo (¿bajamos a por él o jugamos con el segundo?) y el propio corredor.
- **Lo que pasa en carretera**: en una clásica **no baja nadie** salvo que el hueco sea pequeño y el
  favorito sea muy favorito; lo normal es que el equipo pase a jugar con el que sigue arriba. Si el
  favorito era el 90 % del equipo, sí bajan dos y se intenta el regreso; si vuelve fundido, el equipo ya
  ha gastado y pierde dos veces.
- **Lo que hace hoy el motor**: **CUBIERTO**, y es la regla más fina que hay en esta lente. Rama de la
  etapa de D-13: exige `stageCandidateId === leaderId`, `mishapKm` dentro de los últimos
  `helpBackMishapKm` 5 km, estar entre los `helpBackStageFavouriteTeams` 3 equipos de mayor `quality`,
  `gap ≤ helpBackStageGapSeconds` 60 s, y manda `helpBackStageHelpers` 2. Medido: 6,59 → 0,01
  avisos/etapa. Lo que **no** hace: el equipo no cambia de carta cuando el favorito se cae
  (`stageCandidateId` está congelado desde la salida).
- **Lo que dijo el dueño**: v37 (L.7305-7307), textual: «A ver, **por la etapa yo creo que nadie debería
  bajarse… no? A ver, salvo que sea un pinchazo/caída y la distancia sea pequeña, y sea gran favorito para
  ganar la etapa, según el tipo de etapa. Otra cosa es la general.**»
- **Información necesaria**: percance reciente (tiene, pero solo de caída), el hueco (tiene), si soy gran
  favorito (tiene vía `quality`), **y quién es mi segunda carta** (lo puede calcular: `finishScore` de los
  leales; hoy no lo recalcula).
- **Cómo se mediría**: `sim/smallTours.ts` (10 carreras reales enteras): **avisos de rescate por la etapa
  por etapa** — banda ya fijada de facto en v37: **≤ 0,05 por etapa**. Y una segunda: **% de etapas en que
  el equipo cuya carta se cae termina con otro hombre suyo en el top-10** — banda propuesta **10-35 %**,
  para que «cambiar de plan» exista sin regalar resultados.

### [INCIDENTE-07] Caída masiva: el montón que parte el pelotón

- **Cuándo**: llano nervioso, últimos 30 km, entrada a sector, día de lluvia. Se van al suelo 8-30
  corredores y el pelotón queda partido en dos por el tapón, no por el ritmo.
- **Quién decide**: los equipos que quedaron DELANTE (¿aprovechamos o levantamos el pie?) y los de detrás
  (¿organizamos la persecución?).
- **Lo que pasa en carretera**: los de delante, si tienen a su hombre y el rival no, aprietan a muerte:
  es una de las jugadas más rentables del ciclismo (y a la vez la más criticada). Los que quedan detrás
  forman un grupo grande que se organiza en 2-3 minutos; el retorno depende de cuánto queda y de si el
  frente colabora. Variante: si el montón pilla a media parrilla, el frente afloja porque no le sale la
  cuenta (nadie tiene mayoría).
- **Lo que hace hoy el motor**: **PARCIAL**. El montón EXISTE desde v38: `crashPile` se lleva de 0 a
  `crashPileSeriousMax` corredores de una **tirada contigua** de la lista, todos con la MISMA pérdida de
  tiempo, y con `crashPileHurtChance` 0,06 de lesionarse los arrastrados. Pero (a) el grupo que se forma
  detrás es un `shed` como cualquier otro (D-40/D-41), sin noción de «esto ha sido una caída»; (b) el
  pelotón de delante **no lee** el suceso: ni acelera ni afloja; (c) el motor **no tiene posiciones dentro
  del grupo**, anotado como límite (l. 5390-5391): «una TIRADA CONTIGUA de la lista, que es lo más parecido
  a “los que iban a su alrededor”».
- **Lo que dijo el dueño**: v38 (comentario de `crashPile`, simulate l. 5385-5386): «**normalmente cuando
  se cae alguien en el pelotón casi siempre se caen varios… y depende de la gravedad puede haber uno o
  varios que se vayan de la carrera, otros que se queden muy cortados, pero normalmente VARIOS, con lo cual
  podrían tirar**».
- **Información necesaria**: cuántos y quiénes han caído (lo tiene), qué equipos quedaron enteros delante
  (lo puede saber: `teamOf` sobre los dos grupos), cuánto queda (lo tiene) y una decisión de equipo
  «aprovechar» que hoy no está en el vocabulario de intents (`perseguir|lanzar|controlar|proteger|fuga|nada`).
- **Cómo se mediría**: banco de llano con lluvia (hoy no existe: `llana-180` corre sin `lugar`): **% de
  etapas llanas con ≥ 1 corte por caída de ≥ 8 corredores** y **% de esos cortes que se cierran antes de
  meta**. Bandas propuestas: cortes por caída **3-10 % de las llanas** (en la carretera es un puñado de
  días al año, más en primavera y con lluvia) y cierre **60-85 %** (la mayoría vuelve, pero no todos, que
  es justo lo que hoy no pasa: hoy vuelven por física neutra).

### [INCIDENTE-08] La emboscada sobre la caída: el rival ataca cuando el otro está en el suelo

- **Cuándo**: inmediatamente después de INCIDENTE-01/07, en terreno donde se puede hacer daño (viento,
  cuesta, últimos 40 km).
- **Quién decide**: el equipo del rival de la general con hombre delante. Es una decisión moral además de
  táctica: en el juego debería tener un coste de reputación, no solo deportivo.
- **Lo que pasa en carretera**: el equipo pone a tres hombres al frente y estira la carrera antes de que la
  caravana devuelva a nadie. Se ganan minutos que no se ganan de otra forma. Variantes: (a) si el caído es
  el maillot y quedan tres semanas, el resto del pelotón se niega a colaborar y el ataque muere solo;
  (b) si es un rival menor, colaboran todos.
- **Lo que hace hoy el motor**: **AUSENTE**. Es literalmente la deuda de E3 («**la emboscada y el día en
  que el líder se rompe**» no tocado). La táctica (D-22) no ve `frontTeamId`, ni `jefeEnApuros`, ni si su
  jefe va en el grupo, ni ningún suceso; el plan de equipo (D-10) solo ve `manUpTheRoad`,
  `frontThreatDeficit`, `kmToGo` y `gapSeconds`. No existe la intención «aprovechar».
- **Lo que dijo el dueño**: «—» (E3 lo anota como no tocado; la cita general que lo cubre es v52: «los que
  van segundo, tercero o cuarto… ellos quieren luchar por la carrera… y **curiosamente no veo que lo
  hagan**»).
- **Información necesaria**: que ha habido un suceso y a quién (no existe como señal), la general de mi
  hombre contra la del caído (tiene `gcDeficitSeconds` de ambos), cuántos míos hay delante (`teamOf` sobre
  el grupo: lo puede saber; hoy la táctica NO lo mira) y el terreno.
- **Cómo se mediría**: `sim/grandTour.ts`: **segundos que gana el 2.º de la general sobre el maillot en las
  etapas en que el maillot sufre un percance**, contra el mismo número en etapas sin percance. Banda
  propuesta: **diferencia de +20 a +90 s de media**, con **≤ 25 % de esas etapas** derivando en emboscada
  efectiva (para que sea una jugada, no una regla).

### [INCIDENTE-09] Caída dentro de la fuga

- **Cuándo**: fuga del día de 4-10 hombres, descenso o pavé; cae uno de los fugados.
- **Quién decide**: los otros fugados, en bloque.
- **Lo que pasa en carretera**: en una fuga **sí se espera casi siempre**, porque a todos les conviene: sin
  ese hombre la fuga tiene menos relevos y muere. Se afloja un kilómetro, vuelve, y se sigue. Excepción: en
  los últimos 20-30 km, o si el caído era precisamente el que iba a ganar, **no se espera**.
- **Lo que hace hoy el motor**: **CONTRARIO**. `crashCheck` corre sobre los `moves` igual que sobre el
  pelotón, y `dropOut` saca al caído del grupo con `tS = group.tS + delayS`. La fuga sigue a su compromiso;
  nadie afloja. Y como `relayRotation` escala con los que quedan, la fuga se vuelve más lenta pero no
  espera. Además el caído, con `hurt`, **no coge autobús** (D-40, v20) y se queda solo → candidato directo
  al colapso.
- **Lo que dijo el dueño**: «—». Lo más cercano es v39 §1 sobre cooperación en la fuga («si en la fuga van
  con un súper escalador y tú eres mal escalador, lo normal es que no cooperes»), que es el mismo tipo de
  cálculo egoísta.
- **Información necesaria**: cuántos quedan en la fuga (tiene), cuánto queda a meta (tiene), el hueco al
  pelotón (tiene: `gapSeconds`), y quién era el caído para el remate (`finishScore` relativo, ya calculado
  en `interésPropio`, D-07).
- **Cómo se mediría**: banco de clásicas/`realQueens` con lluvia: **% de caídas dentro de una fuga en las
  que el caído vuelve a ella**. Banda propuesta: **50-80 % si quedan > 30 km, ≤ 10 % si quedan < 20 km**.
  Justificación: es la asimetría que da sentido al gesto.

### [INCIDENTE-10] Caída en la cola de la carrera (el que ya no pinta nada)

- **Cuándo**: grupeto, tercera semana, descenso; se cae uno del autobús.
- **Quién decide**: el grupeto (¿esperamos?) y el caído (¿sigo?).
- **Lo que pasa en carretera**: el grupeto **espera a un compañero de fatigas** si el corte lo permite,
  porque solo no llega; si el margen está justo, no espera y el caído se juega el fuera de control él solo.
- **Lo que hace hoy el motor**: **PARCIAL**. Existe `grupetoWait` (D-41): si el grupeto es de menos de
  `grupetoWaitSize` 4, quedan ≥ 10 km y hay un `shed` detrás a ≤ 90 s, baja el compromiso a
  `grupetoWaitCommit` 0,3. Pero espera **por tamaño y proximidad**, no porque alguien se haya caído, y el
  herido `hurt` **no puede unirse a ningún autobús** por la regla de v20 (D-40), o sea que justo el caso que
  más lo pide es el que está vetado.
- **Lo que dijo el dueño**: v20 (L.4003-4005): «Sospecho que el defecto de fondo no está en el porcentaje
  del corte, sino en que **no existe el corredor en apuros**… todo el mundo acaba en un autobús, y un
  autobús organizado entra siempre dentro del corte.»
- **Información necesaria**: quién viene detrás y a cuánto (lo tiene), si es de los míos (no lo mira: D-41
  no ve equipo), si va tocado (lo tiene) y **cuánto margen queda al corte** (no lo tiene: ver INCIDENTE-43).
- **Cómo se mediría**: `sim/grandTour.ts`, causas de abandono (banda del dueño ya existente:
  `outOfTimePct` **1-15 %**, `crashPct` **30-67 %**). Métrica nueva: **% de caídos en el grupeto que
  terminan fuera de control** — banda propuesta **≤ 30 %**, porque hoy la regla del herido sin autobús los
  empuja a todos hacia el colapso.

### [INCIDENTE-11] El tocado decide si sigue: la cuneta

- **Cuándo**: tras una caída `minor`/`major`, con el corredor solo y a más de 30 km de meta.
- **Quién decide**: el corredor y su director (en el juego: el motor, y para el humano una orden previa).
- **Lo que pasa en carretera**: se sube al coche si va roto y la carrera es larga; sigue si es la última
  etapa, si defiende algo, o si es un tipo duro. La decisión tarda kilómetros.
- **Lo que hace hoy el motor**: **CUBIERTO**. `shouldCollapse` + `isInTrouble` (abandon.ts):
  `hurt ∧ groupSize ≤ collapseHurtMaxGroup`, con `kmToGo ≥ collapseMinKmToGo`, `lostFraction ≥
collapseMinLostFraction`, `!inFrontGroup`; la intensidad es `lambdaCollapseHurt` (0,010), «no es un
  interruptor: abandonar es una decisión que se toma en algún momento del calvario». Tope
  `abandonStageCapFraction` 4 %/etapa. Lo que no ve: si defiende algo (general, maillot de la montaña), si
  es la última etapa, ni el rol.
- **Lo que dijo el dueño**: v14 (L.2039-2040): «**Claro!! Quiero que si un ciclista no puede más pues que
  abandone automáticamente…** e incluso dejarle a un humano entre una etapa y otra decidir abandonar.»
- **Información necesaria**: severidad (tiene), soledad (tiene), km (tiene), **qué se juega** (no lo mira:
  ni `gcRank`, ni maillots secundarios, ni «es mi objetivo del año»).
- **Cómo se mediría**: bandas ya existentes de `abandonCauses` sobre `sim/grandTour.ts` (`crashPct` 30-67,
  medido 62 % — «es el techo que se va a rozar primero»). Métrica nueva: **% de abandonos por caída que
  ocurren en el top-20 de la general** — banda propuesta **≤ 15 %**: un líder tocado se levanta y sigue
  mucho más que un gregario en la misma situación.

### [INCIDENTE-12] Caída en el último kilómetro: la regla de los 3 km

- **Cuándo**: sprint masivo, últimos 3 km, montón en el embudo.
- **Quién decide**: el jurado (regla), no el pelotón.
- **Lo que pasa en carretera**: el implicado en una caída dentro de los últimos 3 km recibe **el tiempo de
  su grupo**, no el suyo; pierde el sprint pero no la general. Es la regla que hace que la general no se
  decida por un montón a 800 m.
- **Lo que hace hoy el motor**: **PARCIAL / por accidente**. `crashLambda` ya sube en el embudo
  (`crashLambdaFinal`) y `finishStage` da a cada grupo de llegada un tiempo, con `lossOf = markLossS +
driftS` como desempate; pero el caído sale del grupo por `dropOut` con `perdidaS`, y su tiempo será el de
  su nuevo grupo (más tarde). O sea que hoy **una caída a 800 m sí cuesta la general**, que es lo contrario
  de la regla real. `applyStageTimeCut` tampoco tiene excepción.
- **Lo que dijo el dueño**: «—».
- **Información necesaria**: km a meta en el momento de la caída (tiene), y una excepción de tiempo en
  `buildResults`. Es una regla de reglamento, barata de implementar y con efecto grande sobre la general.
- **Cómo se mediría**: `sim/grandTour.ts`: **cuántas generales cambian de líder por una caída en los
  últimos 3 km**. Banda propuesta: **0** (invariante duro). Justificación: en la carretera real esto no
  puede pasar por reglamento; hoy no está medido en ningún sitio.

### [INCIDENTE-13] Caída en la contrarreloj

- **Cuándo**: CRI, curva mojada, rotonda, rampa técnica.
- **Quién decide**: nadie; es puro suceso. Pero cambia la crono del jugador y activa el corte.
- **Lo que pasa en carretera**: el crono se cae, pierde 40-90 s, a veces cambia de bici, a veces abandona.
  Y es lo que hace que el corte de la crono exista.
- **Lo que hace hoy el motor**: **AUSENTE, con la consecuencia anotada**. `simulateTimeTrial` devuelve
  `incidents: []`. La bitácora lo dice con todas las letras (v20 §6, corpus §14.10): «en producción este
  corte **no va a saltar** hasta que el motor modele el pinchazo y la caída dentro de una contrarreloj» y
  «o se modela el incidente en la crono, o el **0,25 es una salvaguarda dormida**».
- **Lo que dijo el dueño**: v18 (L.3337-3341) pidió modelar bien la crono («la contrarreloj hay que
  modelarla bien… con lo que eso implica»); sobre el incidente en crono, «—» (es deuda del encargo).
- **Información necesaria**: bloques con curva/descenso en el perfil de la crono (el motor los tiene:
  `block.tipo`), DES del corredor (tiene), lluvia (tiene).
- **Cómo se mediría**: `sim/timeTrials.ts` (5 cronos reales): **% de participantes con incidente** — banda
  propuesta **0,5-3 %** (en cronos reales de 40 km se caen uno o dos de 150, más si llueve), y comprobar
  que `timeCutItt` 0,25 deja de ser letra muerta: **0-1 fuera de control por crono**.

### [INCIDENTE-14] Los nervios de la aproximación: por qué se cae la gente donde se cae

- **Cuándo**: 5-15 km antes de un sector de adoquín, del tramo expuesto al viento o del pie del puerto
  decisivo. Toda la carrera pelea por la misma posición.
- **Quién decide**: cada equipo (llevar al jefe delante) y cada corredor (arriesgar por la rueda).
- **Lo que pasa en carretera**: la velocidad sube sin que nadie ataque, el pelotón se estira en fila india,
  y **ahí** es donde se cae la gente y donde se pierden las carreras antes de que empiecen.
- **Lo que hace hoy el motor**: **PARCIAL**. El SUELO de compromiso existe: `pavesRaceCommit` 0,8 se aplica
  también en la aproximación (`pavesApproachKm` 2 km) y `windRaceCommit` 0,82 con viento (D-19). Pero
  (a) la aproximación son solo 2 km, no 10-15; (b) `crashLambda` **no sube en la aproximación** (solo en
  pavés, descenso y embudo final); (c) no hay pelea de posición: la colocación solo existe dentro del corte
  del abanico (D-48) y en el sprint (`placementSd`).
- **Lo que dijo el dueño**: v41 (L.8270), al delegar el viento: «aunque eso implicará también **definir las
  colocaciones**».
- **Información necesaria**: distancia al próximo sector/tramo expuesto (la tiene: `kmToNextPaves` ya
  existe), quién tiene jefe que colocar (tiene: `domestiquesFor`), TAC y frescura (tiene).
- **Cómo se mediría**: `sim/smallTours.ts` sobre las carreras con adoquín: **reparto de las caídas por
  terreno**. Banda propuesta: **20-35 % de las caídas de una clásica de adoquín ocurren en los 10 km
  previos a un sector**, contra el ~0 % de hoy. Justificación: es donde se cae la gente en carretera, y hoy
  el motor las concentra dentro del sector.

### [INCIDENTE-15] El compañero que se para con el caído

- **Cuándo**: cae el jefe; un gregario que iba a su lado se para, le espera parado, le da su rueda o su
  bici y lo lanza de vuelta.
- **Quién decide**: el gregario (o el director por radio).
- **Lo que pasa en carretera**: uno se para y pierde el mismo tiempo aunque no se haya caído; a veces le da
  la bici y se queda esperando a su coche. Es la conducta que hace creíble el «equipo».
- **Lo que hace hoy el motor**: **AUSENTE**. `crashCheck` no mira a los compañeros del caído; los
  arrastrados del montón son una **tirada contigua aleatoria**, no los suyos. El único acercamiento es D-13,
  que actúa **una vez por decisión del pelotón** (cada 10 bloques = 1 km) y solo si el hueco ya es ≥ 22 s;
  un gregario nunca «se para en el sitio».
- **Lo que dijo el dueño**: v36 §7, anotado como límite: «**El jefe no pide la ayuda: se la mandan**… No hay
  “espera a mi compañero” ni un director que decida distinto según el día.» Y N1, órdenes condicionales:
  «**si mi jefe se descuelga en el primer puerto, espérale**».
- **Información necesaria**: quiénes de los míos iban en el mismo grupo en ese bloque (lo tiene), quién es
  mi jefe (lo tiene), y una orden del jugador «espera a X» (no existe en `StageOrders`).
- **Cómo se mediría**: banco de gran vuelta: **% de caídas de un jefe de filas en las que al menos un
  compañero pierde el mismo tiempo en el mismo kilómetro**. Banda propuesta: **50-80 %** cuando el jefe es
  la carta de la general del equipo; **≤ 10 %** cuando el caído no es carta de nadie.

---

## B. PINCHAZO Y AVERÍA (hoy no existen: qué cambiarían)

### [INCIDENTE-16] Pinchazo del favorito en el último puerto

- **Cuándo**: etapa reina, dentro del puerto decisivo, con el grupo de favoritos a tope.
- **Quién decide**: sus compañeros presentes (¿quién le da la rueda?), sus rivales (¿se espera o no?), y él
  (¿me vacío para volver?).
- **Lo que pasa en carretera**: es el escenario más caro del ciclismo. Si le queda un gregario, le da la
  rueda y le lanza; si va solo, espera al coche 20-30 s y pierde 1-2 minutos que no recupera. Los rivales
  **no esperan** casi nunca en un puerto (la tregua de la caída no se aplica igual al pinchazo, y menos en
  el terreno decisivo). El coste real es doble: el tiempo y el vaciado del regreso.
- **Lo que hace hoy el motor**: **AUSENTE**. No hay pinchazo (verificado por Grep). Además, la regla que lo
  espera ya está escrita: `constants.ts:3873` y `simulate.ts:2081` dicen que «cuando exista el pinchazo,
  marca ahí [`mishapKm`] y la regla del favorito lo cuenta». Es decir, **el enchufe está puesto y falta el
  suceso**.
- **Lo que dijo el dueño**: v37 (L.7305-7307): «salvo que sea **un pinchazo/caída** y la distancia sea
  pequeña, y sea gran favorito para ganar la etapa». Y la deuda anotada (corpus §14.10, v37 §4): «**El
  PINCHAZO y la avería mecánica no existen todavía en el motor**».
- **Información necesaria**: terreno del bloque (tiene), gregarios presentes en el grupo (tiene:
  `domestiquesFor` + `idSet`), si el coche puede llegar (no existe: ver INCIDENTE-21), y el tiempo de
  parada según haya o no ayuda.
- **Cómo se mediría**: `sim/realQueens.ts` (9 reinas): **% de reinas en que un top-5 de la general pierde
  > 60 s por un percance mecánico**. Banda propuesta: **2-8 %** de las etapas de montaña. Justificación:
  > en una gran vuelta real se ve una o dos veces en tres semanas; por encima del 10 % el juego se vuelve una
  > lotería y el dueño ya rechazó eso en otra forma («no persigas el 45 % a ciegas»).

### [INCIDENTE-17] Pinchazo en llano con el pelotón agrupado: el regreso rutinario

- **Cuándo**: primeros 150 km de una llana, pelotón a tempo.
- **Quién decide**: el corredor y los dos compañeros que le esperan.
- **Lo que pasa en carretera**: no es noticia. Cambio de rueda en 15 s, dos compañeros le arrastran
  detrás de la caravana y vuelve en 3-5 km. **Sí es noticia** si pasa con el pelotón a 55 km/h en el
  tirón final o en el viento (INCIDENTE-22).
- **Lo que hace hoy el motor**: **AUSENTE**. Y hay un efecto colateral: como no existe el suceso, tampoco
  existe la conducta de «dos hombres se dejan caer un minuto y vuelven», que es el uso más frecuente de un
  gregario en una etapa aburrida y una de las cosas que el dueño echa de menos en la Race Radio.
- **Lo que dijo el dueño**: «—» (más allá de la cita de v37 ya recogida).
- **Información necesaria**: compromiso del pelotón en ese momento (tiene), compañeros disponibles (tiene),
  km restantes (tiene).
- **Cómo se mediría**: `sim/smallTours.ts`: **percances mecánicos por etapa** y **% que se resuelven sin
  pérdida en meta**. Banda propuesta: **1,5-4 pinchazos/averías por etapa y 85-97 % sin consecuencia**.
  Justificación: en una etapa real hay unos cuantos y casi ninguno decide nada; el valor está en el 3-15 %
  que sí decide.

### [INCIDENTE-18] Pinchazo dentro de la fuga

- **Cuándo**: fuga del día consolidada, cualquier terreno.
- **Quién decide**: los otros fugados (esperar o no) y el equipo del fugado detrás.
- **Lo que pasa en carretera**: la fuga **espera** en la primera mitad (necesita relevos) y **no espera**
  en la segunda. El fugado que se queda casi nunca vuelve: entre el pelotón y la fuga hay tierra de nadie.
- **Lo que hace hoy el motor**: **AUSENTE** el suceso; el mecanismo de «volver a la fuga» tampoco existe
  como decisión (la fusión por alcance D-44 lo resolvería físicamente si cerrara, cosa improbable solo).
- **Lo que dijo el dueño**: «—».
- **Información necesaria**: los mismos datos de INCIDENTE-09.
- **Cómo se mediría**: junto con INCIDENTE-09, sobre `smallTours`: **% de fugas del día que pierden un
  hombre por percance**, banda **3-8 %**; y **% de esos que vuelven**: **30-60 % antes del 50 % del
  recorrido, ≤ 10 % después**.

### [INCIDENTE-19] Avería mecánica y cambio de bici

- **Cuándo**: cualquier momento; cadena, cambio, rotura de radio, salto de cadena en un ataque.
- **Quién decide**: el corredor (¿cambio o sigo?) y el coche.
- **Lo que pasa en carretera**: una avería es más cara que un pinchazo (30-60 s parado, bici que no es la
  suya, ajuste de sillín) y **puede ocurrir en el peor momento posible: durante un ataque**. Es la forma de
  incidente que castiga al que estaba haciendo algo, no al que iba escondido.
- **Lo que hace hoy el motor**: **AUSENTE**. Además, `Incident.tipo` solo contempla `'caida'` en la
  práctica (`crashCheck` es su único emisor).
- **Lo que dijo el dueño**: v37: «El PINCHAZO **y la avería mecánica** no existen todavía en el motor»
  (recogido como límite en el corpus §14.10).
- **Información necesaria**: si estaba atacando/tirando en ese bloque (tiene: `pulling`, `matchBoostS`),
  la severidad como distribución propia (más larga que el pinchazo), y si hay coche cerca.
- **Cómo se mediría**: reparto de tipos de incidente sobre `sim/grandTour.ts`. Banda propuesta:
  **pinchazo 70-85 %, avería 15-30 %** del total de percances mecánicos, y **el tiempo mediano de una
  avería ≥ 2× el de un pinchazo**. Justificación: es el reparto de la carretera y hace que el suceso tenga
  dos sabores en la crónica.

### [INCIDENTE-20] La rueda del gregario: el sacrificio material

- **Cuándo**: el jefe pincha y su gregario está a su lado; el coche está a 40 s.
- **Quién decide**: el gregario (y sobre todo el director).
- **Lo que pasa en carretera**: el gregario se para, le da su rueda y **se queda él**. Pierde 60-90 s y
  media etapa persiguiendo; a cambio el jefe pierde 15. Es el gesto que define al gregario, y hoy el motor
  no puede contarlo.
- **Lo que hace hoy el motor**: **AUSENTE** por partida doble (no hay pinchazo y no hay conducta de
  «parar con»).
- **Lo que dijo el dueño**: «—» directamente; encaja bajo v36 §7 («El jefe no pide la ayuda: se la
  mandan») y bajo G2.15 «Ser mandado».
- **Información necesaria**: quién de los míos va en el mismo grupo y en el mismo bloque (tiene), su rol
  (`gregario` con target = jefe: tiene), y el coste de tiempo de ceder rueda vs esperar al coche.
- **Cómo se mediría**: métrica de crónica sobre `sim/coherence.ts`/Race Radio: **% de pinchazos de una
  carta de equipo en los que un compañero paga tiempo por él**. Banda propuesta: **40-70 %** cuando hay un
  gregario del jefe en el grupo, **0 %** cuando no lo hay (invariante).

### [INCIDENTE-21] El coche de equipo: dónde está cuando pasa

- **Cuándo**: siempre; determina el coste de todos los casos anteriores.
- **Quién decide**: el director (orden de coches por general/reglamento) y la carrera (si está partida, el
  coche puede no estar donde está tu hombre).
- **Lo que pasa en carretera**: si vas en el pelotón, tu coche llega en 20-40 s. Si vas en la fuga, hay
  un coche por equipo representado. **Si vas en un grupo cortado, en un puerto estrecho, o la carrera está
  rota en cuatro, puedes esperar minutos** — y ahí está la diferencia entre perder 20 s y perder la
  carrera. Es también la razón por la que el orden de coches (por general) importa.
- **Lo que hace hoy el motor**: **AUSENTE**. No hay caravana en ningún concepto. Nota: tampoco hay rebufo
  de vehículos, que es la otra mitad («volver detrás de los coches») y que en carretera vale 10-15 s/km.
- **Lo que dijo el dueño**: «—».
- **Información necesaria**: dónde está cada grupo y qué equipos lleva (tiene todo), el terreno (tiene) y
  una regla de «el coche llega en T segundos» dependiente de esas dos cosas. Es barato: no hace falta
  simular vehículos, basta un tiempo de asistencia por situación.
- **Cómo se mediría**: distribución del **tiempo de asistencia** por situación en `sim/grandTour.ts`.
  Banda propuesta: **pelotón 15-40 s · fuga 10-30 s · grupo cortado en puerto 60-180 s · descolgado solo
  en un puerto 90-300 s**. Justificación: son los órdenes de magnitud reales y hacen que el mismo pinchazo
  cueste cosas distintas según dónde te pille, que es lo que lo convierte en táctica.

### [INCIDENTE-22] Pinchazo en el peor sitio: adoquín, abanico, tirón final

- **Cuándo**: dentro de un sector de pavé, con el abanico abierto, o en los últimos 10 km a 55 km/h.
- **Quién decide**: el corredor (rueda de repuesto en moto/coche, cambio de bici) y su equipo.
- **Lo que pasa en carretera**: es donde el pinchazo mata: no hay regreso posible porque el pelotón va más
  rápido de lo que tú puedes ir solo. En Flandes o Roubaix, un pinchazo en el sector equivocado es el
  final; con abanico abierto, igual. Por eso los equipos ponen ruedas en motos y llevan al jefe delante.
- **Lo que hace hoy el motor**: **AUSENTE** el suceso; pero el motor **ya tiene** las dos condiciones que
  lo hacen letal: `onRough` (pavé o llano con viento) **impide el reenganche** (D-42: `caught` exige
  `!onRough`) y el abanico abierto mantiene `roughFrac = 1`. Es decir: si mañana existe el pinchazo, este
  caso sale casi solo.
- **Lo que dijo el dueño**: v42 §1 sobre el marco: «**lluvia sobre adoquín… es lo que justifica de verdad
  las caídas y los abandonos**».
- **Información necesaria**: terreno del bloque (tiene), `abanicoAbierto` (tiene), compromiso del pelotón
  (tiene).
- **Cómo se mediría**: banco del pavé (`race-flanders`/`race-roubaix` en `smallTours`): **% de percances
  dentro de sector que terminan en pérdida > 2 min**. Banda propuesta: **60-90 %** (dentro del sector no
  se vuelve), contra **≤ 20 %** en el mismo día fuera de sector.

### [INCIDENTE-23] Pinchazo en la contrarreloj: la bici de repuesto

- **Cuándo**: CRI individual, con tu coche detrás.
- **Quién decide**: nadie: el reglamento y la mecánica del equipo.
- **Lo que pasa en carretera**: pierdes 30-60 s en cambiar de bici, y con la bici de repuesto vas peor.
  Es el suceso que hace que una crono tenga cola y que el corte de la crono exista.
- **Lo que hace hoy el motor**: **AUSENTE** (`incidents: []`), con la consecuencia ya citada: `timeCutItt`
  0,25 es «una salvaguarda dormida» (v20 §6).
- **Lo que dijo el dueño**: v18 pidió la crono «bien modelada… **con lo que eso implica**»; sobre el
  incidente, «—».
- **Información necesaria**: bloques técnicos del perfil (tiene), lluvia (tiene), DES (tiene).
- **Cómo se mediría**: `sim/timeTrials.ts`: **`tailPct`** (banda del dueño **8-15 %**) debe quedarse dentro
  de banda al añadir incidentes, y **% de participantes con cambio de bici**: banda propuesta **0,5-2 %**.

---

## C. VIENTO

### [INCIDENTE-24] El equipo fuerte decide romper: el abanico como DECISIÓN

- **Cuándo**: llano expuesto, viento de costado, carretera que gira, con un equipo que tiene ocho hombres
  y un rival que tiene a su jefe mal colocado.
- **Quién decide**: **un equipo**, deliberadamente. Es la decisión táctica más pura del ciclismo llano.
- **Lo que pasa en carretera**: el equipo se pone en fila en la cuneta, sube el ritmo justo antes del giro
  y el pelotón se parte porque la carretera ya no da para más. Variantes: (a) **equipo fuerte con jefe
  colocado** ⇒ rompe; (b) **equipo fuerte con el jefe mal colocado** ⇒ no rompe, primero le sube; (c) **dos
  equipos fuertes de acuerdo tácito** ⇒ rompen a la vez y la carrera vuela; (d) **nadie interesado** ⇒ hay
  viento y no pasa nada, que es la mayoría de los días.
- **Lo que hace hoy el motor**: **CONTRARIO en la causa, correcto en la forma**. D-48: el corte es un
  `rollHazard(rngViento, windBreakPerKm 0,015 · vientoLateral)`, o sea **el azar decide si se rompe**, y el
  equipo solo entra en **quién queda dentro** (`windPlacementTeam` +25 al equipo que ya lleva el frente,
  `windPlacementLeader` +12 al jefe con gregarios presentes). El motor no pregunta a nadie si le conviene
  romper. Y `windRaceCommit` 0,82 es un **suelo** que se aplica a todos igual.
- **Lo que dijo el dueño**: v41 (L.8215, 8270): «**el viento y los abanicos… aquí te delegaré el 100 % de
  que hagas esto**» / «aunque eso implicará también definir **las colocaciones**».
- **Información necesaria para decidirlo**: viento y anchura efectiva (tiene: `vientoLateral`,
  `cabenEnFila`), **cuántos míos van bien colocados y cuántos de mi rival van mal** (no lo mira nadie: la
  colocación se calcula solo DENTRO del corte y se tira), la general/carta del rival (tiene), y presupuesto
  propio (tiene: `spentFraction`).
- **Cómo se mediría**: banco de viento (extensión de `llana-180` con `vientoLateral` forzado): **% de
  llanas con viento en las que el pelotón se parte** — hoy 4 % del total de llanas (6 % con viento). Banda
  propuesta condicionada: **con un equipo fuerte y su rival mal colocado, 40-70 %; sin interesados,
  ≤ 10 %**. Justificación: hoy los dos casos dan el mismo número porque el dado no distingue.

### [INCIDENTE-25] Colocarse antes del tramo expuesto: la pelea que decide el abanico

- **Cuándo**: 3-10 km antes del giro al viento.
- **Quién decide**: cada equipo, y dentro de cada equipo, los gregarios que suben al jefe.
- **Lo que pasa en carretera**: 15 equipos quieren las primeras 20 plazas. Los que ganan la pelea son los
  que tienen hombres y los que la vieron venir (el que estudió el recorrido). El que la pierde ya ha
  perdido la etapa aunque no lo sepa.
- **Lo que hace hoy el motor**: **PARCIAL**. La colocación existe **solo en el instante del corte** (D-48)
  y como puntos de perfil, no como estado del corredor: nadie «va colocado» un kilómetro antes ni ha
  pagado por estarlo. `windPlacementTeam` premia al equipo que ya llevaba el frente, que es una
  aproximación razonable, pero **gratis**: colocarse no cuesta energía.
- **Lo que dijo el dueño**: v41: «aunque eso implicará también **definir las colocaciones**» (hecha la
  mitad: se define en el corte, no en la aproximación).
- **Información necesaria**: distancia al tramo expuesto (**no existe**: el viento es un número de etapa
  sin tramos, límite anotado en motor.md §19.5 «sin previsión de viento ni tramos expuestos»), hombres
  disponibles (tiene), energía (tiene).
- **Cómo se mediría**: mismo banco de viento: **coste medio (unidades de trabajo) de los 10 km previos a
  un corte** contra los 10 km anteriores. Banda propuesta: **+15 a +40 %**. Justificación: colocarse cuesta,
  y ese coste es el que hace que un equipo no pueda pelear todos los tramos.

### [INCIDENTE-26] El jefe se queda en el segundo abanico: ¿perseguir o resignarse?

- **Cuándo**: abierto el corte, el jefe queda en la segunda fila con 2-3 de los suyos, a 15-40 s.
- **Quién decide**: su equipo (poner a todos a tirar) y él (gastar hoy o guardar).
- **Lo que pasa en carretera**: 10 minutos de persecución a muerte. O vuelve (si el frente afloja o si hay
  otros interesados detrás) o el día está perdido y entonces se levanta el pie y se administra. La decisión
  se toma en 2-3 km y depende de **quién más ha quedado atrás**: si son cuatro equipos, se organiza; si es
  solo él, se rinde.
- **Lo que hace hoy el motor**: **PARCIAL**. La física está: el segundo abanico es un `shed` con
  `droppedCommit`, `onRough` impide el reenganche por puerta y `shedFightCommit`/`shedFightFreshness`
  regulan la pelea. Lo que falta es la DECISIÓN colectiva: D-41 no ve equipos ni generales, así que «cuatro
  equipos con intereses ahí atrás» rueda igual que «un tipo solo con tres compañeros». Y `jefeEnApuros`
  (D-05) saca del turno a los de delante, pero no organiza a los de atrás.
- **Lo que dijo el dueño**: v41 §7 (medido): «**en un abanico el jefe TAMPOCO tira**: el equipo lo mete en
  la fila y sus hombres dan los relevos» (hecho). Sobre organizar la persecución del grupo cortado, «—».
- **Información necesaria**: composición por equipos del grupo cortado (`teamOf` sobre `membersOf`: lo
  puede saber, no lo mira), quién de ellos tiene una carta delante y quién no, y el hueco (tiene).
- **Cómo se mediría**: banco de viento: **% de segundos abanicos que se cierran**, partido por «nº de
  equipos con carta en el grupo cortado». Banda propuesta: **≥ 3 equipos interesados ⇒ 40-70 % de cierre;
  ≤ 1 ⇒ ≤ 15 %**.

### [INCIDENTE-27] El abanico que se cierra: el viento gira, la carretera cambia

- **Cuándo**: 20-40 km después del corte; la carretera gira y el viento pasa a ser de cara o de cola.
- **Quién decide**: nadie; es el recorrido. Pero cambia toda la carrera: los cortados vuelven.
- **Lo que pasa en carretera**: los abanicos duran lo que dura el tramo expuesto. En cuanto la carretera
  cambia de orientación, un grupo de 40 organizado vuelve a un grupo de 25 que ya no se puede escapar.
- **Lo que hace hoy el motor**: **CONTRARIO**. `abanicoAbierto` se pone a `true` y **no se pone nunca a
  false**: el mapa lo dice literalmente («El límite: el abanico no se cierra nunca (el viento sopla todo el
  día)»). Consecuencia: `onRough` permanente ⇒ **no hay reenganche en el resto de la etapa** (D-42), la
  rotación pasa a ser la fila entera (D-02) y el suelo de compromiso se queda puesto (D-19).
- **Lo que dijo el dueño**: «—» (es límite anotado por el ingeniero, no queja del dueño).
- **Información necesaria**: orientación del tramo respecto al viento a lo largo del recorrido (**no
  existe**: el viento es un escalar de etapa), o al menos una duración del episodio.
- **Cómo se mediría**: banco de viento: **km medios que dura un abanico abierto**. Banda propuesta:
  **15-60 km**, contra el «hasta la meta» de hoy. Justificación: los abanicos de la carretera real duran un
  tramo, y de esa duración depende que la etapa se decida o se deshaga.

### [INCIDENTE-28] Viento de cara y viento de cola: el que no se ve

- **Cuándo**: todo el día.
- **Quién decide**: los equipos, al calcular si una fuga es viable y a qué velocidad se va.
- **Lo que pasa en carretera**: con viento de cola la fuga no se va y las medias suben a 48 km/h; con
  viento de cara el pelotón se agrupa, la fuga sufre y la caza es más fácil (el rebufo vale más). Cambia el
  cálculo de la persecución («¿en cuántos km lo cierro?»), no solo la foto.
- **Lo que hace hoy el motor**: **AUSENTE**. Solo existe `vientoLateral`. La ley de velocidad no tiene
  término de viento; el rebufo (`draftFlat`) es fijo.
- **Lo que dijo el dueño**: «—» (delegó el EPIC del viento al 100 % y se implementó el lateral).
- **Información necesaria**: un segundo escalar por etapa (o por tramo) y su entrada en `costFlatBase` y
  en `chaseFeasibleSecondsPerKm`.
- **Cómo se mediría**: `sim/smallTours.ts`: **correlación entre el viento del día y (a) la velocidad media
  del ganador, (b) el margen máximo de la fuga**. Banda propuesta: **±2,5 km/h de media entre día de cola
  y día de cara**, y **la caza necesita 20-40 % más de km con viento de cola**. Justificación: es el orden
  de magnitud real y da variedad de etapa sin tocar la ley.

### [INCIDENTE-29] La previsión de viento como orden del día

- **Cuándo**: antes de la etapa, en la pantalla de órdenes.
- **Quién decide**: el jugador humano (y el mánager, G2).
- **Lo que pasa en carretera**: el director avisa en el autobús: «km 78, giro a la izquierda, todos
  delante». La orden del día es de POSICIÓN, no de ataque.
- **Lo que hace hoy el motor**: **PARCIAL**. La previsión existe y se pinta en la pantalla de ÓRDENES
  (`weatherForecast`, con `fiabilidad`, «desenfocada hacia la climatología»), pero **de viento no hay
  previsión** (motor.md §19.5: «sin previsión de viento ni tramos expuestos») y **ninguna orden del jugador
  puede decir «colócame»**: `StageOrders` solo tiene `role`, `targetRiderId`, `mentality`, `effort`,
  `triggerKm`, `contestSprints/Climbs`.
- **Lo que dijo el dueño**: v42 §2-bis: «estaría bien también que pueda existir para los ciclistas y
  managers una **PREVISIÓN del clima… que además puede cambiar, y con eso tomar diferentes decisiones**». Y
  N1: «lo que hay que hacer si acaso es **mejorar la granularidad de las instrucciones, con más escenarios
  hipotéticos** quizás».
- **Información necesaria**: previsión de viento por etapa con su fiabilidad (falta), y una orden nueva
  del tipo «posición» o una condicional N1 («si hay viento, no te separes de X»).
- **Cómo se mediría**: no es banda de carretera sino de producto: **% de etapas con viento en las que un
  jugador que pidió colocación acaba en el primer abanico** contra el que no lo pidió. Banda propuesta:
  **+20 a +40 puntos porcentuales**. Justificación: la orden tiene que valer algo medible, que es la queja
  del dueño en v58 («el resultado es casi lo mismo ponga lo que ponga ahí»).

---

## D. LLUVIA

### [INCIDENTE-30] Descenso mojado: quién arriesga y quién no

- **Cuándo**: bajada larga con lluvia, con la carrera hecha o por hacer.
- **Quién decide**: cada corredor (DES + carácter) y el jefe (¿me juego la general aquí?).
- **Lo que pasa en carretera**: el buen bajador ataca precisamente ahí porque es donde saca más por vatio;
  el líder de la general baja detrás de un gregario que le abre camino y no toca los límites; el que se
  descolgó arriba **vuelve en la bajada** si baja bien. Con lluvia todo eso se amplifica: se abren huecos de
  20-30 s sin que nadie ataque.
- **Lo que hace hoy el motor**: **PARCIAL**. `selectionFactor` en descenso escala con la lluvia
  (`dropDescentFactor × (1 + rainDescentScale 1 · lluvia)`, solo si `g ≤ dropDescentMaxGradient`) y solo
  actúa el primer km (`descentSelectKm` 1, v57). Las caídas suben (`rainCrashScale` 0,8). Pero, textual del
  mapa: «**Nada táctico se decide en el descenso** (no hay “bajar a tope para abrir hueco” ni marcaje
  específico)». No hay ataque de descenso: `ataque_final` no distingue bajada, y `DES` solo entra en
  `blockPerfil`, en el riesgo de caída y en el remate tipo `descenso`.
- **Lo que dijo el dueño**: v35 (L.7016-7017): «**en una bajada es normal que algunos de los que perdieron
  contacto al subir se reenganchen, pero no todos, wey**… no tiene que reducirse siempre» (hecho: la puerta
  no absorbe si el hueco crece). Sobre atacar en el descenso: «—».
- **Información necesaria**: pendiente y longitud de la bajada (tiene), DES propio y de los rivales del
  grupo (tiene), lluvia (tiene, no la lee la táctica), y si me interesa (finishScore relativo: tiene).
- **Cómo se mediría**: `sim/realQueens.ts` sobre las reinas con descenso final: **% de etapas decididas por
  un movimiento nacido en descenso**. Banda propuesta: **5-15 %** (con lluvia, el doble que en seco).
  Justificación: es una vía de victoria reconocible del ciclismo real que hoy vale 0 %.

### [INCIDENTE-31] Adoquín mojado: el sector que decide la clásica

- **Cuándo**: clásica de pavé con lluvia.
- **Quién decide**: los equipos, antes del sector (posición) y dentro (quién puede).
- **Lo que pasa en carretera**: con el adoquín mojado la selección es brutal y arbitraria: la rueda se va,
  el grupo se parte en cinco, se pincha el doble. El valor de ir delante se multiplica y por eso la
  aproximación es una guerra.
- **Lo que hace hoy el motor**: **PARCIAL**. La lluvia sube la selección del pavé (`rainPavesScale` 0,5) y
  las caídas (0,8); `pavesRaceCommit` 0,8 es suelo también en la aproximación de 2 km; `onRough` prohíbe el
  reenganche dentro del sector. Falta: la decisión (nadie decide ir delante por la lluvia), y falta el
  pinchazo, que es la mitad del carácter del pavé mojado (INCIDENTE-22).
- **Lo que dijo el dueño**: v42 §1: «**lluvia sobre adoquín… es lo que justifica de verdad las caídas y los
  abandonos**».
- **Información necesaria**: lluvia (tiene), estrellas del sector (tiene), PAV propio (tiene), km al sector
  (tiene: `kmToNextPaves`).
- **Cómo se mediría**: banco del pavé con `lugar` real (hoy `smallTours` corre sin clima): **PAV mediano
  del ganador ≥ 69** (listón del dueño, «pave 69 ok») debe mantenerse, y **nº de grupos en meta con lluvia
  vs sin lluvia**: banda propuesta **+1 a +3 grupos con lluvia**.

### [INCIDENTE-32] El día de lluvia cambia el plan del equipo del líder

- **Cuándo**: etapa de transición con lluvia y general viva.
- **Quién decide**: el equipo del maillot.
- **Lo que pasa en carretera**: el equipo del líder pone a **todos** sus hombres delante todo el día, no
  para cazar, sino para que su jefe no esté nunca a rueda de un desconocido. Gastan una barbaridad en una
  etapa que no decide nada, y esa es exactamente la decisión (y la factura del día siguiente).
- **Lo que hace hoy el motor**: **AUSENTE**. El intent del `maillot` es siempre `controlar` (teamPlan
  `intentFor`), sin mirar el clima; `teamDrive` no lee lluvia; el presupuesto (`teamBudgetPerRider` 9) es
  el mismo llueva o no.
- **Lo que dijo el dueño**: «—» directamente; el marco es v42 («el clima… con eso tomar diferentes
  decisiones») y E3 («**la defensa del maillot no existe como conducta propia**»).
- **Información necesaria**: lluvia (tiene), general (tiene), terreno (tiene) — solo hay que dejar que el
  plan de equipo lea el clima, que hoy no lo hace en ningún punto.
- **Cómo se mediría**: `sim/grandTour.ts`: **trabajo (unidades) del equipo del maillot en etapas llanas,
  con lluvia vs sin lluvia**. Banda propuesta: **+20 a +50 % con lluvia**, y que eso se note al día
  siguiente (**−5 a −15 % de trabajo disponible**), que es lo que convierte el clima en decisión y no en
  decorado.

### [INCIDENTE-33] La tormenta que llega a mitad de etapa

- **Cuándo**: la lluvia empieza en el km 90 de 190, justo antes del tramo decisivo.
- **Quién decide**: los equipos (adelantar la jugada antes de que llegue el agua) y el jurado.
- **Lo que pasa en carretera**: en cuanto se ve el frente de tormenta, alguien mueve la carrera antes de
  que el pelotón se vuelva prudente. Y una tormenta que llega es lo que produce las decisiones de
  neutralización (INCIDENTE-50) y de recorte (INCIDENTE-51).
- **Lo que hace hoy el motor**: **AUSENTE, con límite anotado**: `simulate.ts:1037-1039` dice que la lluvia
  es «para todo el día; que **la lluvia vaya y venga durante la etapa queda anotado en §20**».
- **Lo que dijo el dueño**: «—» (v42 pidió la previsión que cambia, que es otra cosa).
- **Información necesaria**: un perfil de lluvia por km (hoy es un escalar), y que la táctica lo lea.
- **Cómo se mediría**: sobre el mismo banco de clima: **% de etapas lluviosas en que la lluvia empieza
  después del km 0**. Banda propuesta: **40-70 %** de los días de lluvia (en la carretera lo raro es que
  llueva exactamente las cinco horas). Es una banda de plausibilidad, no de conducta.

---

## E. CALOR Y FRÍO

### [INCIDENTE-34] Calor extremo: el día en que nadie quiere tirar

- **Cuándo**: 35-40°, llano, mitad de temporada, sur.
- **Quién decide**: el pelotón como colectivo (dejar ir la fuga) y cada equipo (no gastar).
- **Lo que pasa en carretera**: con calor de verdad se sale despacio, la fuga se va sin oposición y el
  pelotón la deja a 12 minutos; nadie quiere pagar viento. El cálculo de la caza cambia: cerrar cuesta más
  y todo el mundo lo sabe.
- **Lo que hace hoy el motor**: **PARCIAL / solo física**. El calor multiplica el coste por bloque
  (`heatCostScale` 0,08 máx, es decir hasta un 8 %), pero **ninguna decisión lo lee**: el humor del pelotón
  (`pelotonMoodSpread` 0,14) es un dado independiente del clima; `chaseGear`, `freeRunTarget` y
  `teamDrive` no ven `calor`. Es decir: hace más calor, se gasta más, pero **nadie se comporta distinto**,
  que es justo lo contrario de lo que pasa en carretera.
- **Lo que dijo el dueño**: v38 (L.7542-7545): «**También la probabilidad de que el pelotón eche la hueva y
  vaya lento**» (implementado como dado ciego, `pelotonMoodSpread`); v42: «ojo, **el clima debería depender
  del país y del GD**» (implementado).
- **Información necesaria**: `calor` (existe), y su entrada en el humor y en `chaseFeasibleSecondsPerKm`.
- **Cómo se mediría**: banco de clima (`smallTours` con `lugar`): **margen máximo de la fuga en llano** con
  calor > 0,6 contra calor 0. Banda propuesta: **+60 a +240 s**, dentro del techo del dueño
  `flatMoveWorstMarginS` **0-900 s**. Justificación: el techo ya lo puso el dueño para el caso del pelotón
  despistado; el calor es una de las razones creíbles de que ocurra.

### [INCIDENTE-35] Calor: la pájara adelantada del que no bebe

- **Cuándo**: última hora de una etapa calurosa.
- **Quién decide**: el corredor (dosificar, comer) y su equipo (mandar a un gregario a por bidones, que es
  trabajo real).
- **Lo que pasa en carretera**: el desfallecimiento por calor llega antes y más brusco; los equipos gastan
  un hombre entero yendo al coche a por bidones. El grupeto se organiza alrededor de eso.
- **Lo que hace hoy el motor**: **PARCIAL**. La pájara existe con rampa (`bonkOnset` sobre el último 8 %
  del depósito, `bonkPenalty`) y el calor vacía antes por el coste, pero (a) no hay avituallamiento ni
  trabajo de bidones, (b) `erosion` no distingue calor, y (c) `RES` no interactúa con el clima.
- **Lo que dijo el dueño**: v38 §8: «**las pájaras igual hay que recalibrar cuándo se produce una
  pájara**».
- **Información necesaria**: `calor` (tiene) y un término de erosión/pájara sensible al calor; y para los
  bidones, un rol de trabajo que hoy no existe.
- **Cómo se mediría**: `sim/analyze.ts::analyzeErosion` con clima: **% de pájaras en etapa calurosa vs
  templada**. Banda propuesta: **×1,3 a ×2,0**, respetando el listón existente `SATURATION_BONK_PCT` 12 en
  Lombardía. Justificación: el calor es multiplicador, no categoría nueva.

### [INCIDENTE-36] Frío, lluvia y descenso largo: el que se congela

- **Cuándo**: etapa de montaña de primavera/otoño; se corona a 2.000 m con 4° y se bajan 20 km mojados.
- **Quién decide**: el corredor (parar a ponerse el chubasquero, que cuesta 20 s), el equipo (dárselo en la
  cima) y el jefe (bajar a tope o llegar entero).
- **Lo que pasa en carretera**: se pierden carreras enteras en una bajada fría; hay corredores que llegan
  hipotérmicos y se retiran al día siguiente; el que no se abriga en la cima llega temblando al valle.
- **Lo que hace hoy el motor**: **AUSENTE**. `calorDe(grados)` vale 0 por debajo de `heatFromC` 26: **el
  frío no cuesta nada**. No hay altitud, ni chubasquero, ni consecuencia al día siguiente. `world/climate.ts`
  sí sabe la temperatura del día y de la zona (nueve zonas, coseno anual, hemisferio sur invertido), o sea
  que **el dato está y no se usa**.
- **Lo que dijo el dueño**: v42 (L.8421): «ojo, **el clima debería depender del país y del GD**»
  (implementado para lluvia y calor; el frío se quedó fuera sin que nadie lo anote).
- **Información necesaria**: temperatura (tiene: `grados`), desnivel de la bajada y su duración (tiene),
  minutos por encima de cierta altitud (derivable del perfil).
- **Cómo se mediría**: banco de clima sobre `realQueens` con `lugar`: **% de abandonos y enfermedades el
  día siguiente a una etapa con < 8° y lluvia**. Banda propuesta: **×1,5 a ×2,5** respecto a un día
  templado, sin sacar `abandonPct` de su banda del dueño **12-20 %**.

---

## F. LA PÁJARA

### [INCIDENTE-37] Pájara del líder de la general: el día en que se rompe

- **Cuándo**: tercera semana, puerto decisivo, con el depósito ya al límite.
- **Quién decide**: sus rivales (¿cuándo se aprieta?), su equipo (¿lo arrastramos o lo escoltamos?) y él
  (dosificar para limitar pérdidas).
- **Lo que pasa en carretera**: el líder se descuelga a ritmo, sin ataque. Sus gregarios que iban delante
  se dejan caer, se ponen a rodar y el objetivo cambia de «ganar la etapa» a «perder lo menos posible».
  Los rivales, en cuanto lo huelen, aprietan y se relevan entre equipos que nunca colaboran.
- **Lo que hace hoy el motor**: **PARCIAL**. Lo que hay: `jefeEnApuros` (D-05, umbral 22 s) saca del turno
  a sus compañeros de delante; D-13 los manda para atrás si el jefe cayó a un `shed`; el maillot nunca baja
  a por nadie; y desde v46 el líder marca en vez de atacar (`gcDefendShare`) y sus rivales atacan más
  (`gcChallengeShare`). Lo que **no** hay: nadie percibe «el líder se ha roto» como suceso; la deuda está
  nombrada en E3 (**«la emboscada y el día en que el líder se rompe»** no tocado) y en el mapa-spec §5.3
  («la defensa del maillot no existe como conducta propia»).
- **Lo que dijo el dueño**: v57 §3 (L.9564-9568): «**El líder se queda atrás… ¿y nadie de su equipo tira
  para ayudarle?**»; v58 §4 (L.9466-9470): «**el líder se ha quedado atrás… y entonces delante están tirando
  sus 2 compañeros. ¿No se han enterado?**».
- **Información necesaria**: quién es el líder y cuánto pierde (tiene), quién de los míos va dónde (tiene),
  **y para los rivales**: que el líder ha empezado a ceder (derivable de `driftS`, hoy nadie lo lee salvo la
  criba).
- **Cómo se mediría**: `sim/grandTour.ts`: **distribución de la pérdida del maillot el día que se descuelga
  del grupo de favoritos**. Banda propuesta: **mediana 60-180 s, cola hasta 8 min**, y **≥ 60 % de esos
  días con al menos un compañero suyo pagando tiempo por él**. Justificación: hoy el arrastre existe
  (D-13), pero solo desde `shed` y sin que los rivales cambien nada.

### [INCIDENTE-38] Pájara del gregario a mitad de faena

- **Cuándo**: km 120, el hombre que iba a tirar hasta el pie del puerto se apaga 30 km antes.
- **Quién decide**: el equipo (quién asume el relevo) y él (se deja ir o se guarda para el corte).
- **Lo que pasa en carretera**: se aparta, y el trabajo cae sobre el siguiente, que llega peor al puerto.
  Es la mecánica por la que un equipo «se queda sin equipo» a 40 km de meta.
- **Lo que hace hoy el motor**: **CUBIERTO en la física, AUSENTE en la decisión**. `relayDuty` (D-01) lleva
  frescura (`relayFreshnessWeight` 0,5 sobre `min(frescura, 0,45)`) y `teamSpent`/`spentFraction` retiran al
  equipo del frente por presupuesto (D-11); pero es continuo y anónimo: no hay «este hombre está fundido,
  que pase el siguiente» como suceso, ni el equipo recalcula su plan.
- **Lo que dijo el dueño**: v15 (L.2221-2223): «**un equipo que lleva 80 km tirando no puede seguir a
  tope**» (implementado como presupuesto).
- **Información necesaria**: frescura por hombre (tiene), plan (tiene), km al punto donde hace falta
  (tiene).
- **Cómo se mediría**: `sim/tactics.ts::analyzeTeamVoice`: **cambios de dueño del frente por etapa**
  (`frontTeamsPerStage`, banda existente **1,8-4**) y una nueva: **% de bloques en que el equipo que lleva
  el frente lo lleva con < 2 hombres**. Banda propuesta: **≤ 15 %**.

### [INCIDENTE-39] Pájara del fugado: el que revienta delante

- **Cuándo**: fuga del día, km 150, después de cuatro horas relevando.
- **Quién decide**: los otros fugados (dejarlo o llevarlo) y él (aguantar a rueda o rendirse).
- **Lo que pasa en carretera**: se queda sin pasar y los demás lo dejan; a veces se queda a rueda 10 km y
  luego revienta del todo; el que se rinde en una fuga rara vez vuelve al pelotón: se queda en tierra de
  nadie y lo devuelve el propio pelotón al pasar.
- **Lo que hace hoy el motor**: **CUBIERTO**. La deriva/criba (`shatter`, D-36) corre también sobre cada
  `move`; el que se queda sale por `dropOut`; `interésPropio`/`noChanceToWin` (D-07/D-27) ya modelan al que
  deja de relevar; `giveUpLambda` (D-49) devuelve 0 si `inFrontGroup`, o sea que el fugado no se «deja ir»
  en el sentido de la regla 8 mientras siga delante — que es correcto. Añadido de v42: el cazado tras fuga
  larga arrastra `gastadoHastaKm` (D-29).
- **Lo que dijo el dueño**: v42 §2 (el defecto que lo motivó): «el wey que iba en la primera fuga solo y
  que **debería haberse desgastado mucho**, le pillaron… y más adelante **vuelve a escaparse como si
  nada**» (resuelto).
- **Información necesaria**: energía (tiene), ritmo de los que quedan (tiene), km (tiene).
- **Cómo se mediría**: ya vigilado indirectamente por `flat.breakawayWinPct` (**5-16 %**, banda del dueño) y
  por la secuela de v42 (**0 casos** de re-fuga inmediata). Métrica fina: **% de fugas del día que pierden
  hombres antes de ser cazadas** — banda propuesta **50-85 %**.

### [INCIDENTE-40] Huele la sangre: se aprieta cuando el otro flaquea

- **Cuándo**: cualquier grupo selecto; alguien empieza a hacer el acordeón.
- **Quién decide**: los rivales, individual y colectivamente.
- **Lo que pasa en carretera**: en cuanto uno pierde tres metros dos veces, el grupo sube medio punto de
  ritmo sin que nadie ataque. Es la conducta más universal del ciclismo y no requiere ningún dato exótico:
  se ve.
- **Lo que hace hoy el motor**: **AUSENTE**. El compromiso del grupo (`Group.compromiso`) no se ajusta por
  la debilidad de un rival concreto: en el pelotón lo fija el controlador (D-14…D-20) y en un `move` la
  cooperación (D-27, que solo mira `noChanceToWin` — «yo no puedo ganar», no «tú estás muerto»). La deriva
  (`driftS`) existe por corredor y **nadie la lee** salvo la propia criba.
- **Lo que dijo el dueño**: v26 (L.5611-5613): «una cosa que debería poder pasar y nunca pasa es que haya
  remontadas en una subida… uno que empieza mal y luego va remontando, **o uno que empieza muy bien, muy
  fuerte, y luego se hunde**» (la deriva se implementó; la REACCIÓN de los demás, no).
- **Información necesaria**: `driftS` de los rivales del grupo en los últimos bloques (existe, no se lee),
  quién es rival mío (finishScore/general: existe).
- **Cómo se mediría**: `sim/climbs.ts` (fotos pie/mitad/cima de las reinas reales, hoy informativo):
  **incremento de ritmo del grupo de cabeza en los 2 km posteriores a que un top-5 empiece a derivar**.
  Banda propuesta: **+2 a +6 % de compromiso**. Justificación: es un empujón, no un ataque; por encima del
  10 % se convierte en otra cosa y rompería la brecha 1.º-10.º.

---

## G. CORTE DE TIEMPO Y GRUPETO

### [INCIDENTE-41] El grupeto como pacto colectivo: quién lo organiza

- **Cuándo**: etapa reina, pie del primer puerto grande; 30-60 corredores deciden que hoy no compiten.
- **Quién decide**: **un colectivo entre equipos rivales**, normalmente liderado por un veterano; es el
  único momento del ciclismo en que la carrera se organiza en contra del reglamento.
- **Lo que pasa en carretera**: se juntan, calculan el corte a ojo, reparten relevos, esperan a los que
  llegan, y llegan todos juntos «al minuto que toca». Variantes: (a) **grupeto grande** (≥ 25) ⇒ entra
  seguro y hasta se permite ir despacio; (b) **grupeto pequeño y etapa dura** ⇒ tensión, alguien no pasa
  relevos y se le echa; (c) **día 19 con el corte al 18 %** ⇒ el grupeto se relaja; (d) **día 3 con corte
  al 8 %** ⇒ el grupeto va a tope y aun así alguno se queda.
- **Lo que hace hoy el motor**: **PARCIAL**. Existe el grupeto como grupo `shed` con ritmo
  `droppedCommit` (que ya es una física de «lo que puede dar un grupo de n con esta frescura»), con
  resignación (`shedResignGapSeconds` 300), con espera al de detrás (`grupetoWait`, solo si mem < 4 y ≥ 10
  km a meta) y con freno colectivo a la rendición (`giveUpGroupMaxFraction` 0,33). Lo que **no** existe: el
  cálculo del corte durante la etapa, la organización por equipos, y la conducta de «te echamos si no
  pasas». D-41 no ve equipo, ni general, ni corte.
- **Lo que dijo el dueño**: la regla la enuncia la bitácora (v20) como doctrina del dueño: «**El grupeto
  existe precisamente para entrar dentro del corte, y casi siempre lo consigue**» (el fuera de control es
  0-4 % en la realidad). Y v16 (L.2651-2656): «**Los rezagados pierden demasiado poco tiempo**» → «el último
  grupo de una etapa reina entra entre el 8 % y el 14 %».
- **Información necesaria**: el corte del día (¡calculable!: `timeCutFraction(elevationGainPerKm)` ya
  existe en `abandon.ts` y se usa solo en meta), el tiempo del líder de carrera estimado, el propio, y quién
  va en el grupo (tiene todo).
- **Cómo se mediría**: bandas del dueño ya vigentes sobre `sim/grandTour.ts`: **`queenLastGroupPct` 8-14 %**
  y **`outOfTimePct` 1-15 %**. Métrica nueva: **desviación entre el tiempo del último grupo y el corte del
  día**. Banda propuesta: **el grupeto principal termina entre el 60 % y el 95 % del corte** (o sea, dentro
  pero justo), que es exactamente lo que hace un autobús organizado.

### [INCIDENTE-42] El sprinter que se descuelga a propósito en el primer puerto

- **Cuándo**: etapa reina, km 40, primer puerto largo. El velocista sabe que su etapa es pasado mañana.
- **Quién decide**: el corredor, con la bendición de su director; y sus gregarios, que se descuelgan CON él.
- **Lo que pasa en carretera**: se deja ir antes de sufrir, para gastar lo mínimo. No es una derrota: es
  administración. Sus dos gregarios de llano se dejan caer con él y lo llevan hasta meta. Es la conducta que
  hace que un tren llegue vivo a la etapa siguiente.
- **Lo que hace hoy el motor**: **CONTRARIO en el momento**. `administerEffort` (regla 8, D-49) **solo actúa
  en los últimos `giveUpKm` 25 km**: nadie puede administrar en el km 40 de 190. Además `giveUpLambda`
  devuelve **0** para los roles `lider`, `sprinter` y `cazaetapas` y para la mentalidad `supercombativo`:
  precisamente el sprinter, que es quien más lo hace en la carretera, es el que el motor prohíbe. La
  compañía de gregarios tampoco existe: D-49 no ve equipo («un gregario puede sentarse aunque su jefe le
  necesite», dice el mapa; y al revés, no puede sentarse **porque** su jefe se sienta).
- **Lo que dijo el dueño**: regla 8 (v9): «Es normal que un corredor agotado se descuelgue en los últimos
  km… **Salvo motivación especial, se deja ir**, con el único cuidado del fuera de control». La regla está
  escrita para el final; el caso del sprinter en montaña **no está cubierto por ninguna cita**: «—».
- **Información necesaria**: mi remate en ESTA etapa (`finishScore`, lo tiene vía `interésPropio`), lo que
  viene mañana (**no lo tiene**: el motor no sabe que hay un mañana), mi rol (tiene), quién es mi jefe
  (tiene), el corte del día (calculable).
- **Cómo se mediría**: `sim/grandTour.ts`: **km en que se descuelga el mejor sprinter en las 7 etapas de
  montaña**. Banda propuesta: **el 50-80 % de las veces, antes del 40 % del recorrido**; y **≥ 1 compañero
  suyo en el mismo grupo en el 60-90 % de esos casos**. Justificación: hoy el sprinter aguanta hasta que la
  física lo escupe, siempre tarde y siempre solo.

### [INCIDENTE-43] El grupeto calcula el corte y aprieta al final

- **Cuándo**: últimos 30 km de una reina, con el grupeto a 25 minutos.
- **Quién decide**: el grupeto (colectivo).
- **Lo que pasa en carretera**: alguien hace la cuenta —«el ganador ha entrado, tenemos 12 minutos»— y el
  grupeto **acelera** en el último valle para entrar. O al revés: si el margen sobra, se levanta el pie.
  Es la única situación en que un grupo va más rápido cuanto peor le van las cosas.
- **Lo que hace hoy el motor**: **AUSENTE**, y es un límite anotado desde v17: el guardarraíl del «me dejo
  ir» «**mide contra el tiempo YA CORRIDO en vez de contra el corte de la etapa, y eso lo vuelve casi
  inerte en etapas largas**» (v17 §4/§11; se probó atarlo al corte y «no mueve nada donde importa»). El
  ritmo del grupeto (D-41) solo mira su propio tamaño, su frescura y lo que hace el `peloton`.
- **Lo que dijo el dueño**: v20 (L.3961-3964): «**No persigas el 45 % a ciegas**… Prefiero una
  especificación corregida a un motor calibrado hacia un objetivo equivocado» (doctrina de calibración del
  corte); y v16: «el último grupo de una etapa reina entra **entre el 8 % y el 14 %**».
- **Información necesaria**: `timeCutFraction` del recorrido (existe en el motor, solo se usa en meta), el
  tiempo estimado del ganador (estimable: el reloj del grupo de cabeza + lo que queda), el propio.
- **Cómo se mediría**: `sim/grandTour.ts`: **perfil de velocidad del último grupo en los últimos 30 km**.
  Banda propuesta: **el grupeto que va por encima del 85 % del corte acelera un 5-15 %; el que va por
  debajo del 60 % no acelera nada**. Hoy los dos hacen lo mismo, y por eso `outOfTimePct` (4 %) es un
  número que sale de la física y no de una decisión.

### [INCIDENTE-44] El grupeto se rompe y alguien queda fuera de control

- **Cuándo**: última hora de una reina; el autobús pierde a uno o a tres.
- **Quién decide**: el grupeto (¿esperamos?) y el que se queda.
- **Lo que pasa en carretera**: el autobús espera a los suyos mientras el margen lo permita, y a partir de
  cierto punto no. El que se queda fuera casi siempre es uno solo, y casi siempre es el que llevaba dos
  días tocado.
- **Lo que hace hoy el motor**: **PARCIAL**. `applyTimeCut` (D-51) es la parte buena y muy fiel: se aplica
  **contra el grupo** («o cae el grupo entero o no cae nadie»), con tope del 4 % y readmisión con
  penalización cuando no cabe. Lo que falla es lo de antes: el grupeto no se criba en el puerto (límite
  anotado de v49: «un grupeto que ya NO es la carrera sigue sin perder a nadie en el puerto, y en carretera
  sí los pierde»), así que el reparto de quién se queda fuera lo decide el azar previo, no el puerto.
- **Lo que dijo el dueño**: v49 (L.9884-9887): «esa etapa deberías revisarla a detalle porque es un
  despropósito… **y el que llega en el puesto 150 solo perdió 26 segundos**».
- **Información necesaria**: quién viene detrás (tiene), margen al corte (no tiene), y si es de los míos
  (no lo mira).
- **Cómo se mediría**: bandas ya existentes: `realQueens.worstStagePct` **0-18 %** (techo =
  `timeCutQueen`), `grandTour.queenLastGroupPct` **8-14 %**, `abandonCauses.outOfTimePct` **1-15 %**.
  Métrica nueva: **tamaño mediano del grupo eliminado por corte** — banda propuesta **1-4**: los cortes
  reales se llevan a puñados pequeños, no a autobuses enteros (y cuando se llevan un autobús, el jurado
  readmite, que es justo lo que `applyTimeCut` ya sabe hacer).

### [INCIDENTE-45] El corte de tiempo en la contrarreloj

- **Cuándo**: CRI larga dentro de una vuelta.
- **Quién decide**: nadie; es la consecuencia de INCIDENTE-13/23.
- **Lo que pasa en carretera**: en una crono se va fuera de control el que pincha dos veces o el que va
  enfermo; el resto entra siempre.
- **Lo que hace hoy el motor**: **PARCIAL / dormido**. `timeCutItt` 0,25 está activado desde v20, pero
  «**en producción este corte no va a saltar hasta que el motor modele el pinchazo y la caída dentro de una
  contrarreloj**» (`incidents: []`).
- **Lo que dijo el dueño**: v20, doctrina del corte («No persigas el 45 % a ciegas»); sobre la crono, «—».
- **Información necesaria**: incidentes en crono (no existen).
- **Cómo se mediría**: `sim/timeTrials.ts`: **fuera de control por crono** — banda propuesta **0-2
  corredores**, con `tailPct` **8-15 %** (banda del dueño) intacta.

---

## H. ABANDONO, ENFERMEDAD Y NEUTRALIZACIÓN

### [INCIDENTE-46] Abandona el líder a mitad de vuelta: el equipo cambia de plan

- **Cuándo**: día 9 de 21. El jefe de filas no toma la salida (lesión de la caída de ayer, enfermedad) o se
  baja en carrera.
- **Quién decide**: el mánager/director esa misma noche; y a partir de mañana, ocho corredores con otro
  contrato tácito.
- **Lo que pasa en carretera**: el equipo pasa de «controlar» a «cazar etapas» en un día. Los gregarios se
  liberan: el que llevaba nueve días trabajando se mete en la fuga; el joven recibe carta blanca; la
  clasificación de la montaña se convierte en objetivo. Es uno de los giros narrativos más reconocibles de
  una gran vuelta.
- **Lo que hace hoy el motor**: **PARCIAL, por una vía indirecta y muda**. `autoStageOrders` se recalcula
  **cada día** por atributos y `gcRank`, así que el equipo repartirá roles nuevos automáticamente (v42: los
  cinco primeros de la general son la carta antes que el terreno; v57: el cazaetapas que se pone líder
  cambia de rol, «ya lo hacía»). Pero: (a) no hay noción de cambio de objetivo (`TeamPurpose` solo tiene
  `etapa|maillot|general|ninguno`: **no existe «vamos a por la montaña» ni «vamos a por etapas»**);
  (b) `buildTeamPlans` no sabe nada de ayer; (c) no hay efecto de moral («la moral **no cambia por
  correr**», mapa-entrenamiento §8 y §Deuda 15); (d) nada se narra.
- **Lo que dijo el dueño**: v45 §1 (L.9173-9175) sobre la consecuencia visible: «un corredor ganó 3
  etapas… luego resulta que dice en noticias que **se enfermó**… y en las clasificaciones, incluso tras la
  etapa 1, pone DNF» (arreglado como bug de lectura). Sobre el cambio de plan del equipo: «—»; lo más
  cercano es tactica.md §7 y G2 («el mánager fija el plan del equipo»).
- **Información necesaria**: quién queda vivo del equipo (lo tiene `packages/db` vía `abandonedDay`), qué
  objetivos quedan alcanzables (clasificaciones secundarias: **no existen como motivo**), y la memoria de
  «llevamos nueve días sin nada» (no existe: «Nada se arrastra de un día a otro en lo táctico»).
- **Cómo se mediría**: `sim/grandTour.ts`: **ataques y presencia en fuga de los compañeros de un líder que
  abandona, antes y después**. Banda propuesta: **×1,5 a ×3 de presencia en la fuga del día en las etapas
  siguientes**. Justificación: es la señal observable del cambio de plan, y hoy vale ×1 exactamente.

### [INCIDENTE-47] Enfermedad entre etapas: el que no toma la salida

- **Cuándo**: por la mañana, día 12.
- **Quién decide**: el médico del equipo (en el juego: el dado), y el equipo (reorganizarse).
- **Lo que pasa en carretera**: el equipo sale con siete; el trabajo se reparte peor; a veces el enfermo era
  el arropo del jefe y la etapa cambia por completo.
- **Lo que hace hoy el motor**: **CUBIERTO como suceso, AUSENTE como decisión**. `raceIllnessProbability =
min(0,0035, 0,16 · illnessProbability)` con `ILLNESS_DAYS` 4, **solo en vueltas por etapas y no en la
  última etapa**, solo para sanos, y **enfermar = abandonar** (`stageRun.ts` l. 693-720). Recalibrado en
  v38 (`illnessRaceFactor` 0,16) y «NO SE SUBE MÁS» porque acopla con la cola de la reina. El equipo no
  reacciona (mismo problema que INCIDENTE-05/46).
- **Lo que dijo el dueño**: la doctrina del reparto es suya (v20, L.3961-3964): «No persigas el 45 % a
  ciegas. Ese número lo escribimos nosotros en §VI.3 y quiero que lo contrastes con el ciclismo real».
  Deuda anotada (v20 §5): «la enfermedad en carrera pesa la mitad de lo que pesa en la carretera».
- **Información necesaria**: fragilidad y TSB (tiene, aunque `StageRider.fragility` **no llega al motor**,
  límite anotado), y para la reacción: composición del equipo del día (tiene).
- **Cómo se mediría**: bandas existentes de `abandonCauses`: **`illnessPct` 20-67 %** (medido 34 %) contra
  **`crashPct` 30-67 %** (medido 62 %) — la deuda del dueño está en que §VI.3 pedía ~45 caída / ~50
  enfermedad y sale **invertido** (62/34). Objetivo: **acercarse a 45/50/5 sin sacar `queenLastGroupPct` de
  8-14 %**, que es justo lo que hizo fracasar el intento de v38-2.

### [INCIDENTE-48] El que corre enfermo: molestias que van a más

- **Cuándo**: días 14-18; el corredor sale «tocado» y se apaga a mitad de etapa.
- **Quién decide**: él y el director (seguir o parar), día a día.
- **Lo que pasa en carretera**: un corredor con anginas rinde un 10 % menos, se descuelga antes, y
  normalmente abandona dos días después, no el mismo día. Es una historia de tres días, no un dado.
- **Lo que hace hoy el motor**: **AUSENTE en la práctica**. El estado `molestias` existe (enum, `mHealth`
  0,96, se pinta en la UI) y —textual del mapa de entrenamiento— «**no lo produce ningún camino**». La
  enfermedad en carrera es binaria e inmediata (enfermar = abandonar). Dentro de la etapa no hay ninguna
  degradación progresiva por salud.
- **Lo que dijo el dueño**: v14 (L.2039-2040): «Quiero que si un ciclista no puede más pues que **abandone
  automáticamente**»; sobre la gradación, «—» (N3/G2.10 «lesiones con calendario» aceptada, pendiente).
- **Información necesaria**: un estado de salud que evolucione entre etapas (existe la columna, falta el
  camino), y su entrada en `eff0` (ya está: `mHealth`) y en el depósito (ya está).
- **Cómo se mediría**: `sim/world.ts` (25 temporadas) + `grandTour`: **% de abandonos por enfermedad
  precedidos por ≥ 1 día de `molestias`**. Banda propuesta: **50-80 %**. Justificación: da a la enfermedad
  una curva narrativa observable en vez de un dado, sin tocar la tasa total (que tiene banda del dueño).

### [INCIDENTE-49] El humano decide retirarse entre etapas

- **Cuándo**: entre dos etapas, con el corredor del jugador roto o sin objetivo.
- **Quién decide**: el jugador humano.
- **Lo que pasa en carretera**: se baja, y su equipo pierde un hombre; en un juego, además, tiene coste
  reputacional y de moral.
- **Lo que hace hoy el motor**: **CUBIERTO en producto, sin consecuencias**. `retireFromRace`
  (`db/riderSchedule.ts` l. 258) con botón en `My Rider → My races` y confirmación;
  `abandonedReason: 'voluntario'` en `race_rosters`. No hay coste: ni moral, ni `team_trust`, ni efecto en
  convocatorias.
- **Lo que dijo el dueño**: v14 §V.5 (L.2039-2040): «e incluso **dejarle a un humano entre una etapa y otra
  decidir abandonar**».
- **Información necesaria**: nada nuevo en el motor; es capa de mundo (G2.4 disciplina, G2.11 moral).
- **Cómo se mediría**: no es banda de carretera. Métrica de mundo sobre `sim/world.ts`: **% de retiradas
  voluntarias de bots** (hoy 0 por construcción) y, cuando existan consecuencias, **caída media de
  `teamTrust`**. Banda propuesta: retirada voluntaria **≤ 2 % de las participaciones**, para que no se
  convierta en la estrategia dominante de gestión de forma.

### [INCIDENTE-50] Neutralización: la carrera se para

- **Cuándo**: paso a nivel, manifestación, accidente en la carretera, tormenta de granizo, niebla en el
  puerto. Ocurre pocas veces por temporada, pero cuando ocurre define la carrera.
- **Quién decide**: la organización/jurado. Los equipos solo deciden **qué hacen con la ventaja**
  (protestar, aceptar, aprovechar el descanso).
- **Lo que pasa en carretera**: se congelan las diferencias en un punto y se vuelve a lanzar la carrera, o
  se anula la etapa, o se toman los tiempos en un punto intermedio. Efecto táctico: la fuga que iba a 3
  minutos se queda con 3 minutos garantizados; el que iba cortado, salvado.
- **Lo que hace hoy el motor**: **AUSENTE**. Grep de `neutraliz` solo devuelve la velocidad inicial tras la
  «salida neutralizada» (`initialSpeed` 35). No hay forma de congelar relojes ni de tomar tiempos en un
  punto intermedio.
- **Lo que dijo el dueño**: «—».
- **Información necesaria**: relojes de todos los grupos en un km dado (los tiene), y una regla de
  reasignación de tiempos. Es barato de implementar y muy rentable narrativamente; el riesgo es que
  invalide huellas selladas, así que tendría que ser un suceso raro y sembrado por su propio subflujo
  (`hazard`/`day`).
- **Cómo se mediría**: `sim/grandTour.ts`: **frecuencia de etapas neutralizadas**. Banda propuesta:
  **0,5-2 % de las etapas** (una cada dos o tres grandes vueltas). Justificación: por encima de eso deja de
  ser un suceso y empieza a ser una excusa para que la carrera no se decida.

### [INCIDENTE-51] Etapa acortada o recorrido cambiado (nieve, peligro)

- **Cuándo**: la víspera o la misma mañana; se quita el puerto de 2.700 m por nieve, se recorta a 100 km.
- **Quién decide**: la organización; los equipos rehacen el plan del día entero.
- **Lo que pasa en carretera**: una reina de 4.500 m se convierte en una media montaña y todos los planes
  cambian: el escalador pierde su día, el grupeto respira, el corte se mueve (el corte depende del
  desnivel: `timeCutFraction(elevationGainPerKm)`).
- **Lo que hace hoy el motor**: **AUSENTE**. El perfil de la etapa es fijo, y ni la previsión ni el clima
  del día lo tocan. Nótese que la maquinaria del corte ya es sensible al desnivel, o sea que un recorte
  entraría bien.
- **Lo que dijo el dueño**: «—»; el marco es v42 («el clima… con eso tomar diferentes decisiones») y G6
  («el generador es una basura»).
- **Información necesaria**: temperatura y altitud del perfil (tiene la primera; la altitud absoluta no,
  solo pendientes), y una regla de recorte anunciada con antelación para que el jugador reordene.
- **Cómo se mediría**: **≤ 1 % de las etapas de alta montaña** modificadas, y comprobación de que el corte
  recalculado sigue dando `queenLastGroupPct` dentro de **8-14 %**.

### [INCIDENTE-52] Salida neutralizada y kilómetro 0

- **Cuándo**: los primeros minutos, antes de la bandera.
- **Quién decide**: la organización (largo de neutralizado) y los equipos (colocarse para el km 0).
- **Lo que pasa en carretera**: la carrera empieza de verdad en el km 0 y los primeros 20 minutos son los
  más violentos del día: ahí se decide la fuga. Un neutralizado largo y un pelotón nervioso producen
  ataques desde el metro uno; una salida cuesta arriba produce fugas distintas.
- **Lo que hace hoy el motor**: **PARCIAL**. `initialSpeed` 35 km/h representa el arranque, y
  `tacticSettleKm` 5 (v33) hace que λ suba desde cero: «corridas que atacan antes del km 1: 69,5 % → 12 %».
  Pero (a) el neutralizado no existe como tramo, (b) no hay caídas ni percances antes del km 0 (que es
  cuando se producen los peores sustos reales), y (c) el prólogo de nervios no cambia con el terreno de
  salida.
- **Lo que dijo el dueño**: v33 (L.6631): «**siempre se intenta una fuga en el primer km, lo cual está
  mal**» (resuelto), con el matiz que él mismo puso: «Que las fugas salgan del disparo es verdad y no se
  toca».
- **Información necesaria**: terreno de los primeros km (tiene), nº de aspirantes a la fuga (tiene vía
  `breakAppeal` y apetitos).
- **Cómo se mediría**: ya vigilado por `analyzeVariety` (`sim/tactics.ts`): **% de etapas con ataque antes
  del km 1** — banda de facto **≤ 15 %** (v33 dejó 12 %). Métrica añadida: **% de percances en los
  primeros 10 km** — banda propuesta **10-20 % del total de la etapa**, que es donde se concentran de
  verdad.

---

## Cierre: los cinco enganches que faltan (resumen para el fundidor)

Las 52 situaciones de esta lente se apoyan en cinco piezas que hoy **no existen** y que, si se construyen,
resuelven bloques enteros de una vez:

1. **El SUCESO como entrada de decisión.** Hoy una caída solo mueve `tS`, `hurt` y `mishapKm`, y solo D-13
   lo lee. Hace falta que el pelotón, los equipos y la táctica **vean** que ha pasado algo y a quién
   (INCIDENTE-01, 02, 07, 08, 15, 37).
2. **El pinchazo y la avería**, con su **coche de equipo** (tiempo de asistencia por situación). El enchufe
   ya está escrito en el código (`mishapKm`, «cuando exista el pinchazo, marca ahí»), y desbloquea de golpe
   la crono, la regla del favorito de v37 y el carácter del pavé (INCIDENTE-16 a 23, 13, 45).
3. **El clima como entrada TÁCTICA**, no solo como coste. `lluvia` y `calor` existen y ninguna decisión los
   lee; el `frío` ni siquiera existe (INCIDENTE-30 a 36). Y `abanicoAbierto` que se cierre (INCIDENTE-27).
4. **El corte de tiempo conocido en carretera.** `timeCutFraction` ya está en `abandon.ts` y solo se usa en
   meta; ponerlo en manos del grupeto convierte una física en un pacto (INCIDENTE-41, 42, 43, 44).
5. **La memoria de un día para otro** (quién se cayó ayer, quién abandonó, qué objetivos quedan): sin ella
   no hay «el equipo cambia de plan» ni consecuencia de la enfermedad (INCIDENTE-46, 47, 48).
